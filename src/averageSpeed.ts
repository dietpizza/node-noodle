let samples: Array<number> = [];
let pSize: number;
let pTime: number;
let sampleSize: number = 8;

export function getAvgSpeed(completed: number) {
  const time: number = Date.now();
  let speed: number = 0;

  if (pTime !== 0 && pSize !== 0) {
    const deltaT = (time - pTime) / 1000;
    const deltaC = completed - pSize;
    speed = deltaC / deltaT;
  }

  if (speed !== Infinity && speed >= 0) samples.push(speed);

  if (samples.length > 1) speed = samples.reduce((s, a) => s + a) / samples.length;

  pTime = time;
  pSize = completed;

  if (samples.length > sampleSize) samples.shift();

  return speed;
}
