export function getFilename(url: string): string {
  return url.split('/').pop().split('#').shift().split('?').shift();
}
