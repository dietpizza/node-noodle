import fs from 'fs';
import validFilename from 'valid-filename';
import validator from 'validator';

import { Options } from '../DownloadFile';
import { RequestMetadata } from '../fileMetadata';

function validateInputs(options: Options): Error {
  if (!isUrl(options.url)) {
    return new Error('Invalid URL provided');
  }

  if (!isValidNumberOfConnections(options.numOfConnections)) {
    return new Error('Invalid number of connections provided');
  }

  if (options.saveDirectory && !isDirectory(options.saveDirectory)) {
    return new Error('Invalid save directory provided');
  }

  if (options.fileName && !isValidFileName(options.fileName)) {
    return new Error('Invalid file name provided');
  }

  return null;
}

function validateMetadata(url: string, metadata: RequestMetadata): Error {
  if (isNaN(metadata.contentLength)) {
    return new Error(`Failed to query Content-Length of ${url}`);
  }

  return null;
}

function isUrl(url: string): boolean {
  return validator.isURL(url);
}

function isValidNumberOfConnections(numOfConnections: number): boolean {
  const isValid: boolean = numOfConnections > 0;

  return isValid;
}

function isDirectory(directory: string): boolean {
  let isDirectory: boolean;

  try {
    const stat: fs.Stats = fs.lstatSync(directory);
    isDirectory = stat.isDirectory();
  } catch (err) {
    isDirectory = false;
  }

  return isDirectory;
}

function isValidFileName(fileName: string): boolean {
  return validFilename(fileName);
}
