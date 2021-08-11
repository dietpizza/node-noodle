import fs from 'fs';
import { pipeline } from 'stream/promises';

export async function mergeFiles(partFiles: Array<string>, filepath: string): Promise<boolean> {
    const safepath = getSafePath(filepath, Infinity);
    if (partFiles.length === 1) {
        try {
            fs.renameSync(partFiles[0], safepath);
            return true;
        } catch (err) {
            return false;
        }
    } else {
        for (const path of partFiles) {
            try {
                await pipeline(
                    fs.createReadStream(path),
                    fs.createWriteStream(safepath, { flags: 'a+' })
                );
            } catch (err) {
                return false;
            }
        }
        return true;
    }
}

export async function deleteFiles(partFiles: Array<string>): Promise<boolean> {
    try {
        for (const file of partFiles) {
            fs.unlinkSync(file);
        }
        return true;
    } catch (err) {
        return false;
    }
}

function getSafePath(path: string, maxTry: number): string {
    let tPath: string = path;

    for (let i = 0; i < maxTry; i++) {
        if (!fs.existsSync(tPath)) return tPath;
        tPath = path + '_' + (i === 0 ? '' : i - 1);
    }
    return path;
}
