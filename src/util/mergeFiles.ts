import fs from 'fs';
import { pipeline } from 'stream/promises';

export async function mergeFiles(partFiles: Array<string>, outpath: string): Promise<boolean> {
  if (fs.existsSync(outpath)) {
    outpath = outpath + '_';
  }
  if (partFiles.length === 1) {
    try {
      fs.renameSync(partFiles[0], outpath);
      return true;
    } catch (err) {
      return false;
    }
  } else {
    for (const path of partFiles) {
      try {
        await pipeline(fs.createReadStream(path), fs.createWriteStream(outpath, { flags: 'a+' }));
      } catch (err) {
        console.log(err.name);
        return false;
      }
    }
    return true;
  }
}
