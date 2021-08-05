import { DownloadPart, PartRange, PartOptions } from './DownloadPart';
import { EventEmitter } from 'eventemitter3';

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
  numOfConnections?: number;
  saveDirectory?: string;
  fileName?: string;
  headers?: object;
  throttleRate?: string;
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
  segmentsRange: PartRange[];
  partFiles: string[];
}

export class DownloadFile extends EventEmitter {
  private static readonly SINGLE_CONNECTION: number = 1;
  private THROTTLE_RATE: number = 100;

  private options: Options;

  constructor(options: Options) {
    super();
    this.options = options;
  }
}
