import fs from 'fs';
import { Response } from 'node-fetch';
import { EventEmitter } from 'eventemitter3';

import { neofetch, Neofetch } from './util/neofetch';

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

export class DownloadPart extends EventEmitter {
  private fileSize: number = 0;
  private totalSize: number = 0;
  private request: Neofetch;
  private writeStream: fs.WriteStream;
  private options: PartOptions;

  constructor(options: PartOptions) {
    super();
    const { start, end } = options.range;
    let flag: boolean = true;

    this.options = options;
    this.totalSize = end + 1 - start;
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

    if (flag) this.download(options);
    else setImmediate(() => this.emit('done'));
  }

  private download(options: PartOptions): void {
    const { start, end } = options.range;
    let downloaded = 0;
    // Handle response stream  events
    const onStreamData = (data: Buffer) => {
      downloaded += data.length;
      setImmediate(() => this.emit('data', this.fileSize + downloaded));
    };
    const onStreamEnd = () => {
      setTimeout(() => {
        if (this.fileSize + downloaded === this.totalSize) this.emit('done');
        else this.emit('retry', this.fileSize);
      }, 100);
    };
    const onError = (err: Error) => {
      if (err.name !== 'AbortError') {
        setImmediate(() => {
          this.emit('error', err);
        });
      }
      this.writeStream.close();
    };

    // Handle fetch request
    const fetchSuccess = (res: Response) => {
      res.body.on('error', onError);
      res.body.on('data', onStreamData);
      res.body.on('end', onStreamEnd);
      if (res.status === 200 || res.status === 206) res.body.pipe(this.writeStream);
      else if (res.status === 503) {
        setImmediate(() => this.emit('retry', this.fileSize));
      }
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

    this.request.ready.then(fetchSuccess).catch(onError);
  }

  public pause() {
    this.request.abort();
  }
  public resume() {
    this.options.range.start += this.fileSize;
    this.download(this.options);
  }
}
