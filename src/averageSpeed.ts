let speedArray: Array<number> = [];
let prevSize: number;
let prevTime: number;
let sampleCount: number = 8;

export function getAvgSpeed(completed: number) {
  const time: number = Date.now();
  let speed: number = 0;

  if (prevTime !== 0 && prevSize !== 0) {
    const deltaT = (time - prevTime) / 1000;
    const deltaC = completed - prevSize;
    speed = deltaC / deltaT;
  }

  if (speed !== Infinity && speed >= 0) {
    speedArray.push(speed);
  }

  if (speedArray.length > 1) {
    speed = speedArray.reduce((s, a) => s + a) / speedArray.length;
  }

  prevTime = time;
  prevSize = completed;

  if (speedArray.length > sampleCount) {
    speedArray.shift();
  }
  return speed;
}
