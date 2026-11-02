import { config as C } from './config.ts';
export const MAGAZINE_SIZE = C.pistol.magazineSize;
export const RELOAD_SECONDS = C.pistol.reloadSeconds;
export const CRITICAL_CHANCE = C.pistol.criticalPercent / 100;
export const ZOMBIE_HEALTH = C.zombie.health;
export class Pistol {
    magazine = MAGAZINE_SIZE;
    reserve = C.pistol.initialReserve;
    remaining = 0;
    shoot() {
        if (this.remaining > 0 || this.magazine <= 0)
            return false;
        this.magazine--;
        return true;
    }
    reload() {
        if (this.remaining > 0 || this.magazine >= MAGAZINE_SIZE || this.reserve <= 0)
            return false;
        this.remaining = RELOAD_SECONDS;
        return true;
    }
    step(dt: number) {
        if (this.remaining <= 0)
            return false;
        this.remaining = Math.max(0, this.remaining - dt);
        if (this.remaining > 0)
            return false;
        const rounds = Math.min(MAGAZINE_SIZE - this.magazine, this.reserve);
        this.magazine += rounds;
        this.reserve -= rounds;
        return true;
    }
}
export function zombieHit(health: number, roll: number) {
    const critical = roll < CRITICAL_CHANCE;
    return { health: Math.max(0, health - (critical ? Math.max(health, ZOMBIE_HEALTH) : C.pistol.damage)), critical };
}
export type CivilianState = {
    health: number;
    hurtUntil: number;
    infected: boolean;
};
export function biteCivilian(state: CivilianState, now: number) {
    if (state.infected || now < state.hurtUntil)
        return { state, converted: false };
    const health = Math.max(0, state.health - C.zombie.contactDamage);
    return {
        state: { health, hurtUntil: now + C.civilian.invulnerability, infected: health === 0 },
        converted: health === 0,
    };
}
