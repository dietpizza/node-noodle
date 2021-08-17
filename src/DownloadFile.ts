import { EventEmitter } from 'eventemitter3';
import { join } from 'path';
import throttle from 'throttleit';
import fs from 'fs';
import { randomBytes } from 'crypto';

import { DownloadPart, PartRange, PartOptions } from './DownloadPart';
import { getMetadata, RequestMetadata, getFilename } from './util/requestQuery';
import { getPartRanges } from './util/partRanges';
import { validateInputs } from './util/validation';
import { getAvgSpeed } from './util/averageSpeed';
import { mergeFiles, deleteFiles } from './util/mergeFiles';

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
    key?: string;
    threads?: number;
    dir: string;
    fileName?: string;
    headers?: object;
    throttleRate?: number;
}

export interface DownloadInfo {
    key: string;
    url: string;
    dir: string;
    filename: string;
    size: number;
    status: Status;
    progress: number;
    speed: number;
    threads: number;
    downloaded: number;
    tPositions: number[];
    partRanges: PartRange[];
    partFiles: string[];
}

export class DownloadFile extends EventEmitter {
    private connect: boolean = true;
    private readonly SINGLE_CONNECTION: number = 1;
    private THROTTLE_RATE: number = 100;
    private retryQueue: number[] = [];
    private filepath: string;
    private info: DownloadInfo;
    private options: Options;
    private parts: DownloadPart[];

    constructor(options: Options) {
        super();
        options.fileName = options.fileName || getFilename(options.url);
        options.key = options.key || randomBytes(6).toString('hex');

        this.options = options;
        this.THROTTLE_RATE = options.throttleRate || this.THROTTLE_RATE;
        this.filepath = join(options.dir, options.fileName);

        const metafile = this.filepath + '.json';
        if (fs.existsSync(metafile)) {
            options = JSON.parse(fs.readFileSync(metafile, { encoding: 'utf8' }));
        } else {
            fs.writeFileSync(metafile, JSON.stringify(options), { encoding: 'utf8' });
        }

        this.query(options);
    }

    private query(options: Options) {
        getMetadata(options.url, options.headers).then((metadata: RequestMetadata) => {
            if (!isNaN(metadata.contentLength)) {
                const valid: string = validateInputs(options);

                if (!metadata.acceptRanges) this.options.threads = this.SINGLE_CONNECTION;

                if (valid === 'OK') this.init(metadata, options);
                else setImmediate(() => this.emit('error', valid));
            } else {
                setImmediate(() => this.emit('error', 'Failed to get link'));
                this.connect = false;
            }
        });
    }

    private init(metadata: RequestMetadata, options: Options) {
        this.info = {
            key: options.key,
            url: options.url,
            dir: options.dir,
            progress: 0,
            filename: options.fileName,
            size: metadata.contentLength,
            status: Status.WAITING,
            speed: 0,
            threads: options.threads,
            downloaded: 0,
            tPositions: Array(options.threads).fill(0),
            partRanges: getPartRanges(metadata.contentLength, options.threads),
            partFiles: Array(options.threads)
                .fill(this.filepath)
                .map((f: string, i: number) => f + '.' + i),
        };
    }

    public start() {
        var checkExist = setInterval(() => {
            if (this.info !== undefined) {
                clearInterval(checkExist);
                this.begin();
            }
            if (!this.connect) clearInterval(checkExist);
        }, this.THROTTLE_RATE / 2);
    }

    private begin() {
        let done: number = 0;
        let removed: number = 0;

        this.info.status = Status.ACTIVE;
        const update = () => {
            this.info.downloaded = this.info.tPositions.reduce((sum, current) => sum + current);
            this.info.speed = getAvgSpeed(this.info.downloaded);
            this.info.progress = (this.info.downloaded / this.info.size) * 100;

            setImmediate(() => this.emit('data', this.info));
        };
        const update_t = throttle(update, this.THROTTLE_RATE);

        const onMergeDone = (flag: boolean) => {
            if (flag) {
                this.info.status = Status.DONE;
                update();
                setImmediate(() => this.emit('done'));
            } else setImmediate(() => this.emit('error', 'Could not merge part files'));

            const files: string[] = [...this.info.partFiles, this.filepath + '.json'];
            deleteFiles(files).then((gag: boolean) => {
                if (!gag) setImmediate(() => this.emit('error', 'Could not delete part files'));
            });
        };

        const onDone = () => {
            if (this.retryQueue.length > 0) {
                setTimeout(() => {
                    this.parts[this.retryQueue.shift()].resume();
                }, this.THROTTLE_RATE);
            }
            if (++done === this.info.threads) {
                this.info.status = Status.BUILDING;
                update();
                mergeFiles(this.info.partFiles, this.filepath).then(onMergeDone);
            }
        };

        const onRemove = () => {
            if (++removed === this.info.threads) {
                this.info.status = Status.REMOVED;
                update();
            }
        };

        const mapParts = (range: PartRange, index: number) => {
            const options: PartOptions = {
                url: this.options.url,
                path: this.info.partFiles[index],
                range,
                headers: this.options.headers,
            };
            return new DownloadPart(options)
                .on('error', (err) => setImmediate(() => this.emit('error', err)))

                .on('data', (length: number) => {
                    this.info.tPositions[index] = length;
                    update_t();
                })

                .on('retry', (size: number) => {
                    this.info.tPositions[index] = size;
                    this.retryQueue.push(index);
                })
                .on('removed', onRemove)
                .on('done', onDone);
        };

        this.parts = this.info.partRanges.map(mapParts);
    }

    public pause() {
        this.parts.forEach((part: DownloadPart) => {
            part.pause();
        });
        this.info.status = Status.PAUSED;
    }

    public resume() {
        this.parts.forEach((part: DownloadPart) => {
            part.resume();
        });
        this.info.status = Status.ACTIVE;
    }

    public remove() {
        this.parts.forEach((part: DownloadPart) => {
            part.remove();
        });
    }

    public getData() {
        return this.info;
    }
}
