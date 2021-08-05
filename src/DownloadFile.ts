// import { DownloadPart } from './DownloadPart';

export interface Options {
  url: string;
  numOfConnections?: number;
  saveDirectory?: string;
  fileName?: string;
  headers?: object;
  throttleRate?: number;
}
