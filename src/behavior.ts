import { config as C } from './config.ts';
import { direction } from './survival.ts';
import type { Point } from './world.ts';
export const INITIAL_ZOMBIES = C.population.zombies;
export const INITIAL_CIVILIANS = C.population.civilians;
export const HERD_CHANCE = C.horde.joinPercent / 100;
export const PANIC_CHANCE = C.panic.chancePercent / 100;
// A patrol keeps a strong forward component even when cohesion pulls backward.
export function patrolDirection(position: Point, waypoint: Point, neighbors: Point[]) {
    const forward = direction(waypoint.x - position.x, waypoint.y - position.y);
    if (!neighbors.length)
        return forward;
    const center = neighbors.reduce((p, n) => ({ x: p.x + n.x, y: p.y + n.y }), { x: 0, y: 0 });
    const cohesion = direction(center.x / neighbors.length - position.x, center.y / neighbors.length - position.y);
    return direction(forward.x * (1 - C.horde.patrolCohesionPercent / 100) + cohesion.x * C.horde.patrolCohesionPercent / 100, forward.y * (1 - C.horde.patrolCohesionPercent / 100) + cohesion.y * C.horde.patrolCohesionPercent / 100);
}
// Called at decision intervals, never as a new probability roll every frame.
export function wanderAngle(position: Point, neighbors: Point[], randomAngle: number, roll: number) {
    if (!neighbors.length || roll >= HERD_CHANCE)
        return randomAngle;
    let x = 0, y = 0;
    for (const other of neighbors) {
        const dx = other.x - position.x, dy = other.y - position.y;
        const distance = Math.hypot(dx, dy);
        if (distance < .01)
            continue;
        // Stay near the group without piling all bodies into a single point.
        const weight = distance < C.horde.separationRadius ? -2 : distance > C.horde.cohesionRadius ? 1 : .1;
        x += dx / distance * weight;
        y += dy / distance * weight;
    }
    const group = direction(x, y);
    if (!group.x && !group.y)
        return randomAngle;
    return Math.atan2(Math.sin(randomAngle) * (1 - C.horde.wanderCohesionPercent / 100) + group.y * C.horde.wanderCohesionPercent / 100, Math.cos(randomAngle) * (1 - C.horde.wanderCohesionPercent / 100) + group.x * C.horde.wanderCohesionPercent / 100);
}
export type PanicState = {
    mode: 'calm' | 'freeze' | 'flee';
    until: number;
    cooldownUntil: number;
    lastThreatAt: number;
    angle: number;
};
export function calmState(): PanicState {
    return { mode: 'calm', until: 0, cooldownUntil: 0, lastThreatAt: -Infinity, angle: 0 };
}
export function panicStep(state: PanicState, now: number, detected: boolean, random = Math.random): PanicState {
    const freshThreat = detected && now - state.lastThreatAt > C.panic.newEncounterSeconds;
    const next = { ...state, lastThreatAt: detected ? now : state.lastThreatAt };
    if (state.mode !== 'calm' && now < state.until)
        return next;
    next.mode = 'calm';
    if (!freshThreat || now < state.cooldownUntil || random() >= PANIC_CHANCE)
        return next;
    next.mode = random() < C.panic.freezePercent / 100 ? 'freeze' : 'flee';
    const min = next.mode === 'freeze' ? C.panic.freezeMin : C.panic.fleeMin;
    const max = next.mode === 'freeze' ? C.panic.freezeMax : C.panic.fleeMax;
    next.until = now + min + random() * (max - min);
    next.cooldownUntil = now + C.panic.cooldownSeconds;
    next.angle = random() * Math.PI * 2;
    return next;
}
