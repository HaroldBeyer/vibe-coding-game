import { config as C } from './config.ts';
import { blocked, type Point } from './world.ts';

/** Uses scene time, so pause/death never advances a wave and restart resets it. */
export class HordeSchedule {
    delivered = 0;
    readonly reinforcements: number;
    readonly interval: number;
    constructor(reinforcements = C.waves.reinforcements, interval = C.waves.intervalSeconds) {
        if (!Number.isInteger(reinforcements) || reinforcements < 0 || interval <= 0) throw new Error('config: ondas ou intervalo inválidos.');
        this.reinforcements = reinforcements;
        this.interval = interval;
    }
    due(elapsed: number) {
        const waves: number[] = [];
        while (this.delivered <= this.reinforcements && elapsed >= this.delivered*this.interval) waves.push(++this.delivered);
        return waves;
    }
    nextAt() { return this.delivered <= this.reinforcements ? this.delivered*this.interval : undefined; }
}

/** A compact entry formation instead of stacking thirty physics bodies at one pixel. */
export function entryPoints(count: number, center: Point = C.waves.spawn) {
    const points: Point[] = [], radius = C.waves.spawnRadius, spacing = C.waves.spacing;
    if (radius < 0 || spacing <= 0 || !Number.isInteger(count) || count < 0) throw new Error('config: formação de spawn inválida.');
    for (let y=-radius; y<=radius; y+=spacing)
        for (let x=-radius; x<=radius; x+=spacing) {
            const p={x:center.x+x,y:center.y+y};
            if (Math.hypot(x,y) <= radius && !blocked(p,20)) points.push(p);
        }
    points.sort((a,b)=>Math.hypot(a.x-center.x,a.y-center.y)-Math.hypot(b.x-center.x,b.y-center.y));
    if (points.length < count) throw new Error('config: aumente waves.spawnRadius ou mova waves.spawn para acomodar a horda.');
    return points.slice(0,count);
}
export function missingMutants(living: number, moreWaves=true) { return moreWaves?Math.max(0,C.waves.minimumMutants-living):0; }
