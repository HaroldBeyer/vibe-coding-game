import { config as C } from './config.ts';
export const WORLD_W = C.world.width, WORLD_H = C.world.height, CELL = C.world.navigationCell;
export type Point = {
    x: number;
    y: number;
};
export const buildings: {
    x: number;
    y: number;
    w: number;
    h: number;
}[] = [];
for (let y = 120; y < WORLD_H - 200; y += C.world.blockSpacingY)
    for (let x = 120; x < WORLD_W - 200; x += C.world.blockSpacingX)
        buildings.push({ x, y, w: 120, h: 240 }, { x: x + 180, y, w: 180, h: 240 });
export function blocked(p: Point, margin = 14) { return p.x < margin || p.y < margin || p.x > WORLD_W - margin || p.y > WORLD_H - margin || buildings.some(b => p.x > b.x - margin && p.x < b.x + b.w + margin && p.y > b.y - margin && p.y < b.y + b.h + margin); }
for (const p of [C.player.spawn, ...(C.ammo.boxes > 0 ? [C.ammo.firstBox] : []), ...C.civilian.initialPositions.slice(0, C.population.civilians)]) {
    if (blocked(p)) throw new Error('config: um ponto inicial está fora do mapa ou dentro de um prédio. Ajuste player.spawn, ammo.firstBox ou civilian.initialPositions.');
}
export function spawnPoint(avoid?: Point, safeRadius = 0, random = Math.random): Point {
    const valid = (p: Point) => !blocked(p, 26) && (!avoid || Math.hypot(p.x - avoid.x, p.y - avoid.y) >= safeRadius);
    for (let i = 0; i < 500; i++) {
        const p = { x: 45 + random() * (WORLD_W - 90), y: 45 + random() * (WORLD_H - 90) };
        if (valid(p)) return p;
    }
    const candidates: Point[] = [];
    for (let y = CELL / 2; y < WORLD_H; y += CELL) for (let x = CELL / 2; x < WORLD_W; x += CELL) {
        if (valid({ x, y })) candidates.push({ x, y });
    }
    if (!candidates.length) throw new Error('config: não há espaço livre para spawn com o mapa e o raio de segurança definidos.');
    return candidates[Math.min(candidates.length - 1, Math.floor(random() * candidates.length))];
}
export function wallDistance(from: Point, to: Point) {
    let nearest = 1;
    const dx = to.x - from.x, dy = to.y - from.y;
    for (const b of buildings) {
        let lo = 0, hi = 1;
        for (const [v, d, min, max] of [[from.x, dx, b.x, b.x + b.w], [from.y, dy, b.y, b.y + b.h]]) {
            if (Math.abs(d) < .00001) {
                if (v < min || v > max) {
                    hi = -1;
                    break;
                }
            }
            else {
                const a = (min - v) / d, c = (max - v) / d;
                lo = Math.max(lo, Math.min(a, c));
                hi = Math.min(hi, Math.max(a, c));
            }
        }
        if (hi >= lo && hi >= 0)
            nearest = Math.min(nearest, lo);
    }
    return nearest * Math.hypot(dx, dy);
}
export function visible(a: Point, b: Point, radius: number) { const d = Math.hypot(a.x - b.x, a.y - b.y); return d <= radius && wallDistance(a, b) >= d - .1; }
export function bulletHit(origin: Point, angle: number, target: Point, radius = C.pistol.hitRadius) {
    const dx = target.x - origin.x, dy = target.y - origin.y;
    const along = dx * Math.cos(angle) + dy * Math.sin(angle), across = Math.abs(-dx * Math.sin(angle) + dy * Math.cos(angle));
    if (along < 0 || across >= radius)
        return Infinity;
    return Math.max(0, along - Math.sqrt(radius * radius - across * across));
}
// Reverse breadth-first field shared by actors with the same destination.
export function navigation(target: Point) {
    const cols = WORLD_W / CELL, rows = WORLD_H / CELL, distances = new Int16Array(cols * rows).fill(-1);
    const start = Math.floor(target.y / CELL) * cols + Math.floor(target.x / CELL), queue = [start];
    distances[start] = 0;
    for (let head = 0; head < queue.length; head++) {
        const id = queue[head], x = id % cols, y = Math.floor(id / cols);
        for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
            const next = ny * cols + nx;
            if (nx < 0 || ny < 0 || nx >= cols || ny >= rows || distances[next] >= 0 || blocked({ x: nx * CELL + CELL / 2, y: ny * CELL + CELL / 2 }))
                continue;
            distances[next] = distances[id] + 1;
            queue.push(next);
        }
    }
    return (from: Point): Point => {
        const x = Math.floor(from.x / CELL), y = Math.floor(from.y / CELL);
        let best = distances[y * cols + x], result = { x: x * CELL + CELL / 2, y: y * CELL + CELL / 2 };
        for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
            if (nx < 0 || ny < 0 || nx >= cols || ny >= rows)
                continue;
            const d = distances[ny * cols + nx];
            if (d >= 0 && (best < 0 || d < best)) {
                best = d;
                result = { x: nx * CELL + CELL / 2, y: ny * CELL + CELL / 2 };
            }
        }
        return best === 0 ? target : result;
    };
}
