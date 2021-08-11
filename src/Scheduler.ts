import { DownloadFile, Options, Status } from './DownloadFile';

interface Entry {
    key: string;
    status: string;
}

export class Scheduler {
    private queue: Entry[];

    public queueDownload(key: string, options: Options) {}
}
