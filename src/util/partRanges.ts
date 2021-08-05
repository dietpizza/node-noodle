import { PartRange } from '../DownloadPart';

export function getPartRanges(fileSize: number, threads: number): PartRange[] {
  const partSizes: number[] = getPartSizes(fileSize, threads);
  const partRanges: PartRange[] = [];

  let pEnd: number = -1;
  for (const size of partSizes) {
    const end: number = pEnd + size;
    partRanges.push({
      start: pEnd + 1,
      end,
    });
    pEnd = end;
  }

  return partRanges;
}

function getPartSizes(fileSize: number, threads: number): number[] {
  const size: number = Math.floor(fileSize / threads);
  const rem: number = fileSize % threads;

  const partSizes: number[] = new Array(threads).fill(size);
  partSizes[partSizes.length - 1] += rem;

  return partSizes;
}
