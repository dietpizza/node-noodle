let samples: Array<number> = [];
let pSize: number;
let pTime: number;
let sampleSize: number = 8;

export function getAvgSpeed(size: number) {
    const time: number = Date.now();
    let speed: number = 0;

    if (pTime !== 0 && pSize !== 0) {
        const deltaT: number = (time - pTime) / 1000;
        const deltaC: number = size - pSize;
        speed = deltaC / deltaT;
    }

    if (speed !== Infinity && speed >= 0) samples.push(speed);

    if (samples.length > 1) speed = samples.reduce((s, a) => s + a) / samples.length;

    pTime = time;
    pSize = size;

    if (samples.length > sampleSize) samples.shift();

    return speed;
}
