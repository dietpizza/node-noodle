import fs from 'fs';
import { Response } from 'node-fetch';
import { EventEmitter } from 'eventemitter3';

import { neofetch, Neofetch } from './util/neofetch';

export interface PartRange {
  readonly start: number;
  readonly end: number;
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
    this.download(options);
  }

  private getRange(options: PartOptions): PartRange {
    this.options = options;
    this.totalSize = options.range.end + 1 - options.range.start;
    if (fs.existsSync(options.path)) {
      const { start, end } = options.range;

      this.fileSize = fs.statSync(options.path).size;
      if (this.fileSize === this.totalSize) {
        return undefined;
      } else if (this.fileSize > this.totalSize) {
        fs.truncateSync(options.path);
        this.fileSize = 0;
      } else {
        const range: PartRange = { start: this.fileSize + start, end };
        return range;
      }
    }
    return options.range;
  }

  private download(options: PartOptions, flag?: boolean): void {
    const onStreamData = (length: number) => {
      downloaded += length;
      setImmediate(() => this.emit('data', this.fileSize + downloaded));
    };
    const onStreamEnd = () => {
      setTimeout(() => {
        if (this.fileSize + downloaded === this.totalSize) this.emit('done');
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
    const successCodes = [200, 206];
    const fetchSuccess = (res: Response) => {
      res.body.on('error', onError);
      res.body.on('data', (data: Buffer) => {
        if (successCodes.includes(res.status)) onStreamData(data.length);
      });
      res.body.on('end', onStreamEnd);
      if (successCodes.includes(res.status)) res.body.pipe(this.writeStream);
      else if (res.status === 503) {
        console.log(this.fileSize);
        setImmediate(() => this.emit('retry', this.fileSize));
      }
    };

    let downloaded = 0;
    const range: PartRange = this.getRange(options);

    if (range !== undefined) {
      const { start, end } = range;
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
    } else {
      if (flag === undefined) {
        setImmediate(() => {
          this.emit('done');
        });
      }
    }
  }

  public pause() {
    this.abort();
    this.emit('paused');
  }
  public resume() {
    this.download(this.options, true);
  }
  public remove() {
    this.abort();
    fs.unlinkSync(this.options.path);
    this.emit('removed');
  }

  public abort() {
    if (this.request) {
      this.request.abort();
    }
  }
}
