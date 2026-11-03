import { config as C } from './config.ts';
export type NpcRole = 'civilian' | 'soldier' | 'medic';
export function npcRoles(total: number): NpcRole[] {
    const roles: NpcRole[] = Array(total).fill('civilian');
    let medics = Math.min(total, C.npc.medics), soldiers = Math.min(total - medics, C.npc.soldiers), i = 0;
    while (i < total && (medics > 0 || soldiers > 0)) {
        if (medics > 0) {
            roles[i++] = 'medic';
            medics--;
        }
        if (i < total && soldiers > 0) {
            roles[i++] = 'soldier';
            soldiers--;
        }
    }
    return roles;
}
export type AidState = {
    charges: number;
    readyAt: number;
};
export function provideAid(health: number, maxHealth: number, aid: AidState, now: number) {
    if (health <= 0 || health >= maxHealth || aid.charges <= 0 || now < aid.readyAt)
        return { health, aid, healed: 0 };
    const next = Math.min(maxHealth, health + C.npc.healAmount);
    return { health: next, aid: { charges: aid.charges - 1, readyAt: now + C.npc.healCooldown }, healed: next - health };
}
export type SoldierAmmo = {
    rounds: number;
    magazine: number;
    gifted: boolean;
};
export function donateAmmo(ammo: SoldierAmmo) {
    if (ammo.gifted || ammo.rounds < C.npc.ammoGift || C.npc.ammoGift <= 0)
        return { ammo, given: 0 };
    const rounds = ammo.rounds - C.npc.ammoGift;
    return { ammo: { rounds, magazine: Math.min(rounds, ammo.magazine), gifted: true }, given: C.npc.ammoGift };
}
