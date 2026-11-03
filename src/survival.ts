import { config as C } from './config.ts';
export const WALK = C.player.walkSpeed;
export const RUN = C.player.runSpeed;
export function staminaStep(stamina: number, moving: boolean, sprint: boolean, exhausted: boolean, dt: number, settings = C.stamina) {
    const running = moving && sprint && !exhausted && stamina > 0;
    const value = Math.max(0, Math.min(settings.max, stamina + (running ? -settings.drainPerSecond : settings.recoveryPerSecond) * dt));
    return { value, running, exhausted: value <= 0 || (exhausted && value < settings.max * settings.unlockPercent / 100) };
}
export function direction(x: number, y: number) {
    const length = Math.hypot(x, y);
    return length ? { x: x / length, y: y / length } : { x: 0, y: 0 };
}
