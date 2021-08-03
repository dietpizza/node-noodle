import { Response } from 'node-fetch';
import { EventEmitter } from 'events';
import fs from 'fs';

import { adorableFetch, AdorableFetch } from './util/adorableFetch';
import { logger } from './util/logger';

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
let request: AdorableFetch;
let writeStream: fs.WriteStream;
let startOptions: PartOptions;

const log: Function = logger(__filename);

const event: EventEmitter = new EventEmitter();

function download(options: PartOptions): void {
  const { start, end } = options.range;

  // Handle response stream  events
  function onStreamError(err: Error) {
    // if (err.name !== 'AbortError') event.emit('error', err);
    log(err.name);
  }
  function onStreamData(data: Buffer) {
    fileSize += data.length;
    event.emit('data', fileSize);
    log(data.length);
  }
  function onStreamEnd() {
    event.emit('done');
    log('Stream ended.');
  }

  // Handle fetch request
  function fetchSuccess(res: Response) {
    res.body.on('error', onStreamError);
    res.body.on('data', onStreamData);
    res.body.on('end', onStreamEnd);

    if (res.status === 200 || res.status === 206) res.body.pipe(writeStream);
  }
  function fetchError(err: Error) {
    if (err.name !== 'AbortError') {
      writeStream.close();
      event.emit('error', err);
    }
  }

  writeStream = fs.createWriteStream(options.path, {
    flags: 'a+',
  });
  request = adorableFetch(options.url, {
    headers: {
      ...options.headers,
      Range: `bytes=${start}-${end}`,
    },
  });

  request.ready.then(fetchSuccess).catch(fetchError);
}

export function downloadPart(options: PartOptions): Part {
  const { start, end } = options.range;
  startOptions = options;

  if (fs.existsSync(options.path)) {
    fileSize = fs.statSync(options.path).size;
    const begin = start + fileSize;

    if (begin === end + 1) event.emit('done');
    else if (begin > end + 1) fs.truncateSync(options.path);
    else options.range.start = begin;
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
