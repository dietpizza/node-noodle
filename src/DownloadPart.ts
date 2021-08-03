import fs from 'fs';
import { Response } from 'node-fetch';
import { EventEmitter } from 'eventemitter3';

import { neofetch, Neofetch } from './util/neofetch';
import { logger } from './util/logger';

export interface PartRange {
  start: number;
  end: number;
}

export interface PartOptions {
  url: string;
  path: string;
  range: PartRange;
  headers?: object;
}

const log: Function = logger(__filename);

export class DownloadPart extends EventEmitter {
  private fileSize: number = 0;
  private request: Neofetch;
  private writeStream: fs.WriteStream;
  private startOptions: PartOptions;

  constructor(options: PartOptions) {
    super();
    const { start, end } = options.range;
    let flag: boolean = true;

    this.startOptions = options;
    if (fs.existsSync(options.path)) {
      this.fileSize = fs.statSync(options.path).size;
      const begin: number = start + this.fileSize;
      if (begin === end + 1) {
        flag = false;
      } else if (begin > end + 1) {
        fs.truncateSync(options.path);
      } else {
        options.range.start = begin;
      }
    }

    if (flag) {
      this.download(options);
    } else {
      setImmediate(() => {
        this.emit('end');
        log('File already complete');
      });
    }
  }

  private download(options: PartOptions): void {
    const { start, end } = options.range;

    // Handle response stream  events
    const onStreamError = (err: Error) => {
      log(err.name);
    };
    const onStreamData = (data: Buffer) => {
      this.fileSize += data.length;
      this.emit('data', this.fileSize);
      log(this.fileSize);
    };
    const onStreamEnd = () => {
      this.emit('done');
      log('Stream ended.');
    };

    // Handle fetch request
    const fetchSuccess = (res: Response) => {
      res.body.on('error', onStreamError);
      res.body.on('data', onStreamData);
      res.body.on('end', onStreamEnd);
      if (res.status === 200 || res.status === 206) res.body.pipe(this.writeStream);
    };
    const fetchError = (err: Error) => {
      if (err.name !== 'AbortError') {
        this.emit('error', err);
      }
      this.writeStream.close();
    };

    this.writeStream = fs.createWriteStream(options.path, {
      flags: 'a+',
    });
    this.request = neofetch(options.url, {
      headers: {
        ...options.headers,
        Range: `bytes=${start}-${end}`,
      },
    });

    this.request.ready.then(fetchSuccess).catch(fetchError);
  }

  public pause() {
    this.request.abort();
  }
  public resume() {
    this.startOptions.range = {
      start: this.fileSize,
      end: this.startOptions.range.end,
    };
    this.download(this.startOptions);
  }
}
