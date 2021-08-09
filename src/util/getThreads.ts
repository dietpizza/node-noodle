import fs from 'fs';

export function getThreads(file: string) {
  let parts = 0;
  for (let i = 0; i < 32; i++) {
    if (fs.existsSync(file + '.' + i)) parts++;
  }
  return parts === 0 ? undefined : parts;
}
