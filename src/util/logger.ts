import { basename } from 'path';

export function logger(filename: string): Function {
  function log(message: any) {
    console.log(`[${basename(filename)}]`, message);
  }
  return log;
}
