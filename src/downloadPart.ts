import { Response } from 'node-fetch';
import { EventEmitter } from 'events';
import fs from 'fs';

// import { PartRange } from './interfaces';
import { abortableFetch, AbortableFetch } from './util/abortableFetch';

process.title = 'fetchloader';

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

export interface Part {
  event: EventEmitter;
  pause(): void;
  resume(): void;
}

let fileSize: number = 0;
let request: AbortableFetch;
let writeStream: fs.WriteStream;
let startOptions: PartOptions;

const event: EventEmitter = new EventEmitter();

function download(options: PartOptions): void {
  writeStream = fs.createWriteStream(options.path, {
    flags: 'a+',
  });

  function handleSuccess(res: Response) {
    res.body.on('data', (data: Buffer) => {
      fileSize += data.length;
      event.emit('data', fileSize);
    });
    if (res.status === 200 || res.status === 206) res.body.pipe(writeStream);
  }

  function handleError(error: Error) {
    if (error.name !== 'AbortError') {
      console.log(error.name);
      writeStream.close();
    }
  }

  request = abortableFetch(options.url, {
    headers: {
      ...options.headers,
      Range: `bytes=${options.range.start}-${options.range.end}`,
    },
  });
  request.ready.then(handleSuccess).catch(handleError);
}

export function downloadPart(options: PartOptions): Part {
  startOptions = options;
  if (fs.existsSync(options.path)) {
    fileSize = fs.statSync(options.path).size;
    const start = options.range.start + fileSize - 1;

    if (start === options.range.end) event.emit('done');
    else if (start > options.range.end) fs.truncateSync(options.path);
    else options.range.start = start;
  }

  download(options);

  return {
    event,
    pause,
    resume,
  };
}

function pause() {
  request.abort();
  writeStream.close();
}

function resume() {
  startOptions.range = {
    start: fileSize,
    end: startOptions.range.end,
  };
  download(startOptions);
}
