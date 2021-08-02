import { PartRange } from './downloadPart';

export interface Options {
  numOfConnections?: number;
  saveDirectory?: string;
  fileName?: string;
  headers?: Object;
  throttleRate?: number;
}

export interface SchedulerOptions {
  maxActiveDownloads?: number;
  autoStart?: boolean;
  numOfConnections?: number;
}

export interface DownloadMetadata {
  url: string;
  saveDirectory: string;
  filename: string;
  filesize: number;
  status: string;
  progress: number;
  speed: number;
  threads: number;
  complete: number;
  positions: number[];
  partRanges: PartRange[];
  partFiles: string[];
}
