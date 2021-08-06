import fs from 'fs';
import validFilename from 'valid-filename';

import { Options } from '../DownloadFile';

export function validateInputs(options: Options): string {
  if (!isURL(options.url)) return 'Invalid URL';
  if (options.numOfConnections > 0) return 'Invalid number of threads';
  if (!isDir(options.saveDirectory)) return 'Invalid directory path';
  if (validFilename(options.fileName)) return 'Invalid file name';

  return 'OK';
}

function isDir(directory: string): boolean {
  try {
    const stat: fs.Stats = fs.lstatSync(directory);
    return stat.isDirectory();
  } catch (err) {
    return false;
  }
}

function isURL(location: string) {
  try {
    const url = new URL(location);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (_) {
    return false;
  }
}
