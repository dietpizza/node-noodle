import url = require('url');

export function getFilename(fileUrl: string): string {
  const parsedUrl: url.Url = url.parse(fileUrl);
  const filename: RegExpExecArray = new RegExp(/(?:\/.+)?\/(.+)/, '').exec(parsedUrl.path);

  return filename[1];
}
