import { EventEmitter } from 'eventemitter3';
import { join } from 'path';
import throttle from 'throttleit';

import { DownloadPart, PartRange, PartOptions } from './DownloadPart';
import { getMetadata, RequestMetadata } from './util/requestQuery';
import { getPartRanges } from './util/partRanges';
import { getFilename } from './util/urlParser';
import { validateInputs } from './util/validation';
import { getAvgSpeed } from './util/averageSpeed';
import { mergeFiles, deleteFiles } from './util/mergeFiles';

export enum Status {
  REMOVED = 'REMOVED',
  PAUSED = 'PAUSED',
  WAITING = 'WAITING',
  ACTIVE = 'ACTIVE',
  BUILDING = 'BUILDING',
  DONE = 'DONE',
}

export interface Options {
  url: string;
  threads?: number;
  dir: string;
  fileName?: string;
  headers?: object;
  throttleRate?: number;
}

export interface DownloadInfo {
  url: string;
  dir: string;
  filename: string;
  size: number;
  status: string;
  progress: number;
  speed: number;
  threads: number;
  downloaded: number;
  tPositions: number[];
  partRanges: PartRange[];
  partFiles: string[];
}

export class DownloadFile extends EventEmitter {
  private connect: boolean = true;
  private readonly SINGLE_CONNECTION: number = 1;
  private THROTTLE_RATE: number = 100;
  private retryQueue: number[] = [];
  // private metafile: string;
  private filepath: string;
  private info: DownloadInfo;
  private options: Options;
  private parts: DownloadPart[];

  constructor(options: Options) {
    super();
    this.options = options;
    this.THROTTLE_RATE = options.throttleRate || this.THROTTLE_RATE;
    this.ping(options);
  }

  private ping(options: Options) {
    options.fileName = options.fileName ? options.fileName : getFilename(options.url);
    getMetadata(options.url, options.headers).then((metadata: RequestMetadata) => {
      if (!isNaN(metadata.contentLength)) {
        const valid: string = validateInputs(options);

        if (!metadata.acceptRanges) this.options.threads = this.SINGLE_CONNECTION;

        if (valid === 'OK') {
          this.init(metadata, options);
        } else setImmediate(() => this.emit('error', valid));
      } else {
        setImmediate(() => this.emit('error', 'Failed to get link'));
        this.connect = false;
      }
    });
  }

  private init(metadata: RequestMetadata, options: Options) {
    this.filepath = join(options.dir, options.fileName);
    // this.metafile = this.filepath + '.json';

    this.info = {
      url: options.url,
      dir: options.dir,
      progress: 0,
      filename: options.fileName,
      size: metadata.contentLength,
      status: Status.WAITING,
      speed: 0,
      threads: options.threads,
      downloaded: 0,
      tPositions: Array(options.threads).fill(0),
      partRanges: getPartRanges(metadata.contentLength, options.threads),
      partFiles: Array(options.threads)
        .fill(this.filepath)
        .map((f: string, i: number) => f + '.' + i),
    };
  }

  public start() {
    var checkExist = setInterval(() => {
      if (this.info !== undefined) {
        clearInterval(checkExist);
        this.start_t();
      }
      if (!this.connect) clearInterval(checkExist);
    }, 50);
    return this;
  }

  private start_t() {
    let done: number = 0;
    // let removed: number = 0;

    this.info.status = Status.ACTIVE;
    const update = () => {
      this.info.downloaded = this.info.tPositions.reduce((s, a) => s + a);
      this.info.speed = getAvgSpeed(this.info.downloaded);
      this.info.progress = (this.info.downloaded / this.info.size) * 100;

      setImmediate(() => this.emit('data', this.info));
    };
    const update_t = throttle(update, this.THROTTLE_RATE);

    const onMerge = (flag: boolean) => {
      if (flag) {
        this.info.status = Status.DONE;
        update();
        setImmediate(() => this.emit('done'));
      } else setImmediate(() => this.emit('error', 'Could not merge part files'));

      deleteFiles(this.info.partFiles).then((gag: boolean) => {
        if (!gag) setImmediate(() => this.emit('error', 'Could not delete part files'));
      });
    };

    const onDone = () => {
      if (this.retryQueue.length > 0)
        setTimeout(() => {
          this.parts[this.retryQueue.shift()].resume();
        }, this.THROTTLE_RATE);

      if (++done === this.info.threads) {
        this.info.status = Status.BUILDING;
        update();
        mergeFiles(this.info.partFiles, this.filepath).then(onMerge);
      }
    };

    const mapParts = (range: PartRange, index: number) => {
      const options: PartOptions = {
        url: this.options.url,
        path: this.info.partFiles[index],
        range,
        headers: this.options.headers,
      };
      return new DownloadPart(options)
        .on('error', (err) => setImmediate(() => this.emit('error', err)))

        .on('data', (length: number) => {
          this.info.tPositions[index] = length;
          update_t();
        })

        .on('retry', (size: number) => {
          console.log(size);
          this.info.tPositions[index] = size;
          this.retryQueue.push(index);
        })

        .on('done', onDone);
    };

    this.parts = this.info.partRanges.map(mapParts);
  }
}
