import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { direction, staminaStep } from './survival.ts';
test('diagonal movement has the same speed as cardinal movement', () => { const d = direction(1, 1); assert.ok(Math.abs(Math.hypot(d.x, d.y) - 1) < 1e-10); assert.deepEqual(direction(0, 0), { x: 0, y: 0 }); });
test('sprint exhausts, then requires 30 stamina to unlock', () => { const empty = staminaStep(1, true, true, false, 1); assert.equal(empty.value, 0); assert.equal(empty.exhausted, true); const recovering = staminaStep(0, true, true, true, 1); assert.equal(recovering.running, false); assert.equal(recovering.exhausted, true); const ready = staminaStep(29, false, false, true, 1); assert.equal(ready.exhausted, false); });
test('holding shift while idle regenerates stamina', () => { assert.equal(staminaStep(50, false, true, false, 1).value, 68); assert.equal(staminaStep(99, false, false, false, 1).value, 100); });
import { WORLD_W, WORLD_H, blocked, visible, wallDistance, navigation, bulletHit } from './world.ts';
test('walls occlude sight and bullets; open alleys do not', () => {
    const from = { x: 90, y: 210 }, behind = { x: 270, y: 210 };
    assert.equal(visible(from, behind, 300), false);
    assert.equal(wallDistance(from, behind), 30);
    assert.equal(visible({ x: 270, y: 90 }, { x: 270, y: 390 }, 400), true);
    assert.equal(visible({ x: 270, y: 90 }, { x: 270, y: 390 }, 145), false);
});
test('bullet ray hits the near edge, misses off-axis and ignores targets behind', () => {
    assert.equal(bulletHit({ x: 0, y: 0 }, 0, { x: 100, y: 0 }), 87);
    assert.equal(bulletHit({ x: 0, y: 0 }, 0, { x: 100, y: 14 }), Infinity);
    assert.equal(bulletHit({ x: 0, y: 0 }, 0, { x: -100, y: 0 }), Infinity);
    assert.ok(bulletHit({ x: 90, y: 210 }, 0, { x: 270, y: 210 }) > wallDistance({ x: 90, y: 210 }, { x: 270, y: 210 }));
});
test('navigation routes around a building through free cells', () => {
    const target = { x: 270, y: 210 }, field = navigation(target);
    let p = { x: 90, y: 210 };
    for (let i = 0; i < 100 && Math.hypot(p.x - target.x, p.y - target.y) > 1; i++) {
        p = field(p);
        assert.equal(blocked(p), false);
    }
    assert.deepEqual(p, target);
});
test('spawn positions and map edges remain consistent with collision space', () => {
    assert.equal(blocked({ x: 1230, y: 900 }), false);
    assert.equal(blocked({ x: 1350, y: 900 }), false);
    assert.equal(blocked({ x: 180, y: 180 }), true);
    assert.equal(blocked({ x: WORLD_W, y: WORLD_H }), true);
});
import { Pistol, zombieHit, biteCivilian, ZOMBIE_HEALTH, CRITICAL_CHANCE, type CivilianState } from './combat.ts';
test('reload transfers only missing rounds and R-style repeated requests cannot restart its timer', () => {
    const pistol = new Pistol();
    pistol.reserve = 7;
    assert.equal(pistol.shoot(), true);
    assert.equal(pistol.reload(), true);
    pistol.step(.5);
    const remaining = pistol.remaining;
    assert.equal(pistol.reload(), false);
    assert.equal(pistol.remaining, remaining);
    assert.equal(pistol.shoot(), false);
    assert.equal(pistol.step(.7), true);
    assert.equal(pistol.magazine, 7);
    assert.equal(pistol.reserve, 6);
    assert.equal(pistol.remaining, 0);
    assert.equal(pistol.shoot(), true);
});
test('empty magazine and partial reserves reload without creating ammo', () => {
    const pistol = new Pistol();
    for (let i = 0; i < 7; i++)
        assert.equal(pistol.shoot(), true);
    assert.equal(pistol.shoot(), false);
    assert.equal(pistol.reload(), false);
    pistol.reserve = 2;
    assert.equal(pistol.reload(), true);
    pistol.step(2);
    assert.equal(pistol.magazine, 2);
    assert.equal(pistol.reserve, 0);
    assert.equal(pistol.step(2), false);
    assert.equal(pistol.magazine, 2);
});
test('a full magazine does not consume reserves or start a reload', () => {
    const pistol = new Pistol();
    pistol.reserve = 7;
    assert.equal(pistol.reload(), false);
    assert.equal(pistol.remaining, 0);
    assert.equal(pistol.reserve, 7);
});
test('zombies survive two normal hits and die on the third; rare critical kills immediately', () => {
    let hp = ZOMBIE_HEALTH;
    hp = zombieHit(hp, .8).health;
    assert.equal(hp, 2);
    hp = zombieHit(hp, .8).health;
    assert.equal(hp, 1);
    hp = zombieHit(hp, .8).health;
    assert.equal(hp, 0);
    assert.deepEqual(zombieHit(3, 0), { health: 0, critical: true });
    assert.equal(zombieHit(3, CRITICAL_CHANCE - .0001).critical, true);
    assert.deepEqual(zombieHit(3, CRITICAL_CHANCE), { health: 2, critical: false });
});
test('contact immunity prevents a horde from killing and converting one civilian repeatedly in a frame', () => {
    const first = biteCivilian({ health: 100, hurtUntil: 0, infected: false }, 1);
    assert.equal(first.state.health, 60);
    assert.equal(biteCivilian(first.state, 1).state.health, 60);
    assert.equal(biteCivilian(first.state, 1.5).converted, false);
    assert.equal(biteCivilian(first.state, 2.2).state.health, 20);
});
test('three spaced bites convert a civilian once, conserving the living-plus-zombie population', () => {
    let state: CivilianState = { health: 100, hurtUntil: 0, infected: false };
    let civilians = INITIAL_CIVILIANS, zombies = INITIAL_ZOMBIES;
    for (let i = 0; i < 3; i++) {
        const hit = biteCivilian(state, i * 1.2);
        state = hit.state;
        if (hit.converted) {
            civilians--;
            zombies++;
        }
        assert.equal(hit.converted, i === 2);
    }
    assert.equal(civilians, INITIAL_CIVILIANS - 1);
    assert.equal(zombies, INITIAL_ZOMBIES + 1);
    assert.equal(civilians + zombies, INITIAL_CIVILIANS + INITIAL_ZOMBIES);
    assert.equal(biteCivilian(state, 100).converted, false);
});
import { wanderAngle, calmState, panicStep, PANIC_CHANCE, HERD_CHANCE, INITIAL_ZOMBIES, INITIAL_CIVILIANS } from './behavior.ts';
test('idle zombies sometimes approach nearby groups and sometimes choose an independent heading', () => {
    const position = { x: 0, y: 0 }, neighbors = [{ x: 100, y: 0 }, { x: 110, y: 15 }];
    assert.ok(Math.abs(wanderAngle(position, neighbors, Math.PI / 2, 0)) < Math.PI / 2);
    assert.equal(wanderAngle(position, neighbors, Math.PI / 2, HERD_CHANCE), Math.PI / 2);
    assert.equal(wanderAngle(position, [], Math.PI / 2, 0), Math.PI / 2);
    assert.ok(Math.cos(wanderAngle(position, [{ x: 10, y: 0 }], 0, 0)) < 0);
});
test('panic is rare per new encounter, not a fresh roll every frame', () => {
    let rolls = 0;
    const safe = () => { rolls++; return PANIC_CHANCE; };
    let state = panicStep(calmState(), 0, true, safe);
    assert.equal(state.mode, 'calm');
    for (let i = 1; i <= 600; i++)
        state = panicStep(state, i / 60, true, safe);
    assert.equal(rolls, 1);
    state = panicStep(state, 11, false, safe);
    state = panicStep(state, 13, true, safe);
    assert.equal(rolls, 2);
    assert.equal(state.mode, 'calm');
});
test('panic freezes briefly, expires and respects cooldown even on another encounter', () => {
    const frozen = panicStep(calmState(), 0, true, () => 0);
    assert.equal(frozen.mode, 'freeze');
    assert.equal(frozen.until, 2);
    assert.equal(panicStep(frozen, 1, false, () => 0).mode, 'freeze');
    const recovered = panicStep(frozen, 3, false, () => 0);
    assert.equal(recovered.mode, 'calm');
    assert.equal(panicStep(recovered, 4, true, () => 0).mode, 'calm');
    assert.equal(panicStep(recovered, 15, true, () => 0).mode, 'freeze');
});
test('random running keeps its chosen direction until panic ends without requiring continued sight', () => {
    const values = [0, .9, .5, .25];
    let rolls = 0;
    const running = panicStep(calmState(), 0, true, () => values[rolls++]);
    assert.equal(running.mode, 'flee');
    assert.equal(running.until, 2.25);
    assert.equal(running.angle, Math.PI / 2);
    const ongoing = panicStep(running, 1, false, () => { throw new Error('must not reroll active panic'); });
    assert.equal(ongoing.mode, 'flee');
    assert.equal(ongoing.angle, running.angle);
    assert.equal(panicStep(ongoing, 3, false).mode, 'calm');
});
import { patrolDirection } from './behavior.ts';
test('horde patrol advances toward its destination even when the group is behind', () => {
    const d = patrolDirection({ x: 100, y: 100 }, { x: 300, y: 100 }, [{ x: 0, y: 100 }, { x: 20, y: 110 }]);
    assert.ok(d.x > .95);
    assert.ok(Math.abs(Math.hypot(d.x, d.y) - 1) < 1e-9);
    const solo = patrolDirection({ x: 100, y: 100 }, { x: 100, y: 300 }, []);
    assert.deepEqual(solo, { x: 0, y: 1 });
});
test('cohesion cannot cancel patrol progress in any neighbor direction', () => {
    for (let a = 0; a < Math.PI * 2; a += .1) {
        const d = patrolDirection({ x: 0, y: 0 }, { x: 200, y: 0 }, [{ x: Math.cos(a) * 150, y: Math.sin(a) * 150 }]);
        assert.ok(d.x > 0);
        assert.ok(Math.hypot(d.x, d.y) > .99);
    }
});
import { spawnSync } from 'node:child_process';
import { spawnPoint } from './world.ts';
test('spawn fallback respects obstacles and safety radius and rejects impossible configurations', () => {
    const p = spawnPoint({ x: 1230, y: 900 }, 300, () => .5);
    assert.equal(blocked(p, 26), false);
    assert.ok(Math.hypot(p.x - 1230, p.y - 900) >= 300);
    assert.throws(() => spawnPoint({ x: 1230, y: 900 }, 10000, () => .5), /não há espaço livre/);
});
test('non-default configuration drives ammunition, stamina, damage, panic, populations and navigation', () => {
    const script = `
  import {strict as assert} from 'node:assert';
  import {config as C} from './src/config.ts';
  C.population.zombies=3;C.population.civilians=8;
  C.pistol.magazineSize=4;C.pistol.initialReserve=2;C.pistol.reloadSeconds=.2;C.pistol.damage=2;C.pistol.criticalPercent=0;
  C.stamina.max=50;C.stamina.drainPerSecond=5;C.stamina.recoveryPerSecond=10;
  C.zombie.health=8;C.zombie.contactDamage=7;C.civilian.invulnerability=.3;
  C.panic.chancePercent=100;C.panic.freezePercent=100;C.panic.freezeMin=4;C.panic.freezeMax=4;
  C.world.navigationCell=30;
  const {Pistol,zombieHit,biteCivilian}=await import('./src/combat.ts');
  const {staminaStep}=await import('./src/survival.ts');
  const {panicStep,calmState,INITIAL_ZOMBIES,INITIAL_CIVILIANS}=await import('./src/behavior.ts');
  const {CELL,navigation}=await import('./src/world.ts');
  const pistol=new Pistol();assert.equal(pistol.magazine,4);assert.equal(pistol.reserve,2);
  pistol.shoot();pistol.reload();assert.equal(pistol.remaining,.2);pistol.step(.3);
  assert.equal(pistol.magazine,4);assert.equal(pistol.reserve,1);
  assert.equal(zombieHit(8,.01).health,6);
  assert.equal(staminaStep(40,true,true,false,1).value,35);
  assert.equal(staminaStep(40,false,false,false,2).value,50);
  const bite=biteCivilian({health:50,hurtUntil:0,infected:false},0);
  assert.equal(bite.state.health,43);assert.equal(bite.state.hurtUntil,.3);
  assert.equal(panicStep(calmState(),0,true,()=>.2).until,4);
  assert.equal(INITIAL_ZOMBIES,3);assert.equal(INITIAL_CIVILIANS,8);assert.equal(CELL,30);
  assert.ok(navigation({x:1230,y:900})({x:1230,y:870}));
 `;
    const result = spawnSync(process.execPath, ['--experimental-strip-types', '--input-type=module', '-e', script], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr || result.stdout);
});
import { config as C } from './config.ts';
test('zombies overtake walking humans while both player and civilians can outrun them by sprinting', () => {
    const fastestWalker = Math.max(C.player.walkSpeed, C.civilian.speedMax, C.civilian.firstSpeed);
    assert.ok(C.zombie.chaseSpeed > fastestWalker);
    assert.ok(C.zombie.wanderSpeed > fastestWalker);
    assert.ok(C.horde.patrolSpeed > fastestWalker);
    assert.ok(C.player.runSpeed > C.zombie.chaseSpeed);
    assert.ok(C.civilian.runSpeed > C.zombie.chaseSpeed);
    assert.ok(C.panic.runSpeed > C.zombie.chaseSpeed);
});
test('civilian sprint exhausts and stays unavailable until stamina recovers', () => {
    const settings = C.civilian.stamina;
    const sprint = staminaStep(1, true, true, false, 1, settings);
    assert.equal(sprint.running, true);
    assert.equal(sprint.value, 0);
    assert.equal(sprint.exhausted, true);
    const tired = staminaStep(0, true, true, true, .5, settings);
    assert.equal(tired.running, false);
    assert.equal(tired.exhausted, true);
    const recovered = staminaStep(settings.max, false, false, true, 1, settings);
    assert.equal(recovered.exhausted, false);
    assert.equal(staminaStep(recovered.value, true, true, false, .1, settings).running, true);
});
import { roamDestination } from './world.ts';
test('civilian autonomous destinations stay on free navigable ground and route around buildings', () => {
    const from = { x: 90, y: 210 };
    const { goal, route } = roamDestination(from, () => 0);
    assert.equal(blocked(goal, 26), false);
    assert.notDeepEqual(goal, from);
    let p = from;
    for (let i = 0; i < 100 && Math.hypot(p.x - goal.x, p.y - goal.y) > 1; i++) {
        p = route(p);
        assert.equal(blocked(p), false);
    }
    assert.deepEqual(p, goal);
});
test('civilian wandering near the map edge still chooses a free destination', () => {
    const { goal } = roamDestination({ x: 45, y: 45 }, () => .5);
    assert.equal(blocked(goal, 26), false);
    assert.ok(goal.x >= 26 && goal.x <= WORLD_W - 26 && goal.y >= 26 && goal.y <= WORLD_H - 26);
});
import { npcRoles, provideAid, donateAmmo } from './npc.ts';
test('roles preserve total population and clamp specialist counts for small populations', () => {
    const roles = npcRoles(C.population.civilians);
    assert.equal(roles.length, C.population.civilians);
    assert.equal(roles.filter(r => r === 'medic').length, C.npc.medics);
    assert.equal(roles.filter(r => r === 'soldier').length, C.npc.soldiers);
    assert.equal(roles.filter(r => r === 'civilian').length, C.population.civilians - C.npc.medics - C.npc.soldiers);
    assert.equal(npcRoles(1).length, 1);
    assert.deepEqual(npcRoles(0), []);
});
test('medical care respects maximum health, cooldown, supplies and cannot revive an infected victim', () => {
    const aid = { charges: 2, readyAt: 0 };
    const healed = provideAid(90, 100, aid, 0);
    assert.equal(healed.health, 100);
    assert.equal(healed.healed, 10);
    assert.equal(healed.aid.charges, 1);
    assert.equal(provideAid(40, 100, healed.aid, 1).healed, 0);
    assert.equal(provideAid(40, 100, healed.aid, C.npc.healCooldown).healed, C.npc.healAmount);
    assert.equal(provideAid(40, 100, { charges: 0, readyAt: 0 }, 100).healed, 0);
    assert.equal(provideAid(0, 100, aid, 100).healed, 0);
    assert.equal(provideAid(100, 100, aid, 100).aid.charges, 2);
});
test('soldier ammunition donation is finite, conserves rounds and cannot be farmed with F', () => {
    const original = { rounds: 21, magazine: 7, gifted: false };
    const gift = donateAmmo(original);
    assert.equal(gift.given, C.npc.ammoGift);
    assert.equal(gift.ammo.rounds + gift.given, original.rounds);
    assert.equal(donateAmmo(gift.ammo).given, 0);
    assert.equal(donateAmmo({ rounds: 0, magazine: 0, gifted: false }).given, 0);
    const last = donateAmmo({ rounds: C.npc.ammoGift, magazine: C.npc.ammoGift, gifted: false });
    assert.equal(last.ammo.rounds, 0);
    assert.equal(last.ammo.magazine, 0);
});

import { humanKill, shotAngle } from './combat.ts';
test('a mutant survives four normal shots or one critical, and dies on the fifth normal or second critical', () => {
    let health = C.mutant.health;
    for (let i=0;i<4;i++) { health=zombieHit(health,1,true).health; assert.ok(health>0); }
    assert.equal(zombieHit(health,1,true).health,0);
    const first=zombieHit(C.mutant.health,0,true);
    assert.equal(first.health,2.5);
    assert.equal(zombieHit(first.health,0,true).health,0);
});
test('evolution counts three human victims per zombie and never repeats for a mutant', () => {
    assert.deepEqual(humanKill(0,false),{kills:1,evolves:false});
    assert.deepEqual(humanKill(1,false),{kills:2,evolves:false});
    assert.deepEqual(humanKill(2,false),{kills:3,evolves:true});
    assert.equal(humanKill(3,true).evolves,false);
    assert.equal(humanKill(0,false).evolves,false);
});
test('weapon spread is centered, increases while moving and grows with bounded recoil', () => {
    assert.equal(shotAngle(1,0,false,.5),1);
    assert.ok(shotAngle(0,0,true,1)>shotAngle(0,0,false,1));
    assert.ok(shotAngle(0,.1,false,1)>shotAngle(0,0,false,1));
    assert.equal(shotAngle(0,999,false,1),shotAngle(0,C.pistol.maxRecoil,false,1));
    assert.equal(shotAngle(0,0,false,0),-shotAngle(0,0,false,1));
});

import { lightAt, humanSees, darknessSpread, streetLights, type StreetLight } from './lighting.ts';
test('street illumination falls off, broken lamps stay dark and buildings block light', () => {
    const lamp: StreetLight = {x:90,y:210,radius:300,strength:1,color:0xffffff,working:true};
    assert.equal(lightAt(lamp,[lamp]),1);
    assert.ok(lightAt({x:90,y:310},[lamp]) < 1);
    assert.equal(lightAt(lamp,[{...lamp,working:false}]),C.lighting.ambient);
    assert.equal(lightAt({x:270,y:210},[lamp]),C.lighting.ambient);
    assert.equal(lightAt({x:90,y:600},[lamp]),C.lighting.ambient);
    assert.ok(streetLights.some(l=>l.working) && streetLights.some(l=>!l.working));
});
test('darkness reduces human detection and accuracy without changing zombie sight or wall occlusion', () => {
    const dark={x:30,y:30}, target={x:130,y:30}, bright={x:510,y:480};
    assert.equal(visible(dark,target,C.zombie.sightRadius),true);
    assert.equal(humanSees(dark,target,C.zombie.sightRadius),false);
    assert.ok(darknessSpread(dark)>darknessSpread(bright));
    assert.ok(shotAngle(0,0,false,1,darknessSpread(dark))>shotAngle(0,0,false,1,darknessSpread(bright)));
    assert.equal(humanSees({x:90,y:210},{x:270,y:210},1000),false);
});

import { HordeSchedule, entryPoints, missingMutants } from './waves.ts';
test('three hordes arrive at 0, 120 and 240 seconds exactly once, independent of kills', () => {
    const schedule=new HordeSchedule();
    assert.deepEqual(schedule.due(0),[1]); assert.equal(schedule.nextAt(),120);
    assert.deepEqual(schedule.due(0),[]); assert.deepEqual(schedule.due(119.999),[]);
    assert.deepEqual(schedule.due(120),[2]); assert.deepEqual(schedule.due(239.9),[]);
    assert.deepEqual(schedule.due(240),[3]); assert.deepEqual(schedule.due(359.99),[]);
    assert.deepEqual(schedule.due(360),[]); assert.equal(schedule.nextAt(),undefined);
    assert.deepEqual(schedule.due(100000),[]);
    assert.equal(C.population.zombies+C.waves.reinforcements*C.waves.zombiesPerHorde,90);
});
test('wave scheduler catches up without duplicates and a new match starts from the first horde', () => {
    const schedule=new HordeSchedule(); assert.deepEqual(schedule.due(360),[1,2,3]);
    assert.deepEqual(schedule.due(360),[]);
    assert.deepEqual(new HordeSchedule().due(0),[1]);
    assert.throws(()=>new HordeSchedule(3,0));
});
test('the fixed entrance fits a horde plus mutant on free ground without overlapping bodies', () => {
    const points=entryPoints(C.population.zombies+C.population.mutants);
    assert.equal(points.length,31);
    for (let i=0;i<points.length;i++) {
        assert.equal(blocked(points[i],20),false);
        assert.ok(Math.hypot(points[i].x-C.waves.spawn.x,points[i].y-C.waves.spawn.y)<=C.waves.spawnRadius);
        for(let j=i+1;j<points.length;j++) assert.ok(Math.hypot(points[i].x-points[j].x,points[i].y-points[j].y)>=C.waves.spacing);
    }
    assert.throws(()=>entryPoints(9999));
    assert.throws(()=>entryPoints(31,{x:-500,y:-500}));
});
test('the minimum evolved population is replenished only before the final wave', () => {
    assert.equal(missingMutants(0,false),0); assert.equal(missingMutants(0),1); assert.equal(missingMutants(1),0); assert.equal(missingMutants(3),0);
});

import { interiors, doors, doorCenter, resetDoors, toggleDoor, hitDoor, insideBuilding, collisionRects } from './world.ts';
test('accessible buildings have a real doorway and walkable interior, while other buildings stay solid', () => {
    resetDoors();
    for(const room of interiors) {
        const door=doors.find(d=>d.id===room.id)!, center=doorCenter(door);
        const outside={x:center.x,y:room.y-30},inside={x:center.x,y:room.y+30};
        assert.equal(blocked(inside),false); assert.equal(insideBuilding(inside),room);
        assert.equal(visible(outside,inside,100),true);
        assert.equal(blocked({x:room.x+18,y:room.y+5},0),true);
        assert.ok(collisionRects.some(r=>r.x>room.x && r.y>room.y && r.w<room.w));
    }
    assert.equal(blocked({x:180,y:210}),true);
});
test('a closed door blocks bodies, vision and bullets, cannot crush occupants, and reopens from either side', () => {
    resetDoors(); const door=doors[0],center=doorCenter(door);
    const outside={x:center.x,y:door.y-30},inside={x:center.x,y:door.y+40};
    try {
        assert.equal(toggleDoor(door,[center]),false); assert.equal(door.open,true);
        assert.equal(toggleDoor(door,[inside,outside]),true); assert.equal(blocked(center,0),true);
        assert.equal(visible(outside,inside,100),false); assert.equal(wallDistance(outside,inside),30);
        assert.equal(visible(outside,inside,100,true),true);
        assert.equal(toggleDoor(door,[inside]),true); assert.equal(blocked(center,0),false);
        assert.equal(visible(outside,inside,100),true);
    } finally { resetDoors(); }
});
test('infected damage accumulates until a door breaks permanently; evolved hits do more damage; restart restores it', () => {
    resetDoors();const door=doors[0];
    try {
        toggleDoor(door,[]);
        assert.deepEqual(hitDoor(door),{hit:true,broken:false}); assert.equal(door.health,C.doors.health-C.doors.attackDamage);
        hitDoor(door,true); assert.equal(door.health,C.doors.health-C.doors.attackDamage-C.doors.mutantDamage);
        let breaks=0; for(let i=0;i<100;i++) if(hitDoor(door).broken)breaks++;
        assert.equal(breaks,1); assert.equal(door.open,true); assert.equal(door.health,0);
        assert.equal(toggleDoor(door,[]),false); assert.deepEqual(hitDoor(door),{hit:false,broken:false});
    } finally { resetDoors(); }
    assert.equal(door.health,C.doors.health); assert.equal(door.open,true);
});
test('navigation reaches interiors through the doorway and infected can approach a closed door to break it', () => {
    resetDoors();const door=doors.find(d=>d.id===25)??doors[0],center=doorCenter(door);
    const start={x:center.x,y:door.y-30},target={x:center.x,y:door.y+90};
    try {
        let p=start; const openRoute=navigation(target);
        for(let i=0;i<8;i++) p=openRoute(p);
        assert.ok(Math.hypot(p.x-target.x,p.y-target.y)<1);
        toggleDoor(door,[]);
        const humanRoute=navigation(target); p=start;
        for(let i=0;i<8;i++)p=humanRoute(p);
        assert.equal(insideBuilding(p),undefined);
        const infectedRoute=navigation(target,true),next=infectedRoute(start);
        assert.equal(next.x,center.x); assert.ok(next.y>door.y);
        assert.equal(visible(start,next,100),false);
        assert.equal(visible(start,next,100,true),true);
    } finally { resetDoors(); }
});

import { squadGroups, chooseShelter, canCloseFromInside } from './tactics.ts';
test('civilian panic is more likely than trained roles, without removing encounter/cooldown protection', () => {
    const state=calmState();
    const trained=panicStep(state,1,true,()=>.3,C.panic.chancePercent/100);
    const civilian=panicStep(state,1,true,()=>.3,C.panic.civilianChancePercent/100);
    assert.equal(trained.mode,'calm');assert.notEqual(civilian.mode,'calm');
    assert.equal(panicStep(civilian,1.1,true,()=>0,C.panic.civilianChancePercent/100).until,civilian.until);
});
test('soldier squads merge through local contacts and remove a dead or missing member', () => {
    assert.deepEqual([...squadGroups([1,3,5],[])],[[1,1],[3,3],[5,5]]);
    assert.deepEqual([...squadGroups([1,3,5],[[1,3],[3,5]])],[[1,1],[3,1],[5,1]]);
    assert.deepEqual([...squadGroups([3,5],[[1,3],[3,5]])],[[3,3],[5,3]]);
});
test('a frightened civilian chooses a nearby safe entrance, rejects occupied infected rooms and broken doors', () => {
    resetDoors();const door=doors.find(d=>d.id===25)!,center=doorCenter(door),from={x:center.x,y:door.y-40},threat={x:center.x-160,y:door.y-60};
    try {
        assert.equal(chooseShelter(from,threat,[])?.id,door.id);
        assert.notEqual(chooseShelter(from,center,[])?.id,door.id);
        assert.notEqual(chooseShelter(from,threat,[{x:center.x,y:door.y+70}])?.id,door.id);
        door.health=0;door.open=true;assert.notEqual(chooseShelter(from,threat,[])?.id,door.id);
    } finally { resetDoors(); }
});
test('civilians only close a refuge from inside, clear of the doorway and within reach of the handle', () => {
    resetDoors();const door=doors.find(d=>d.id===25)!,center=doorCenter(door);
    assert.equal(canCloseFromInside({x:center.x,y:door.y-35},door),false);
    assert.equal(canCloseFromInside(center,door),false);
    assert.equal(canCloseFromInside({x:center.x,y:door.y+42},door),true);
    assert.equal(canCloseFromInside({x:center.x,y:door.y+125},door),false);
});
test('existing cached human route adapts to door closing, reopening and breaking without replacing the handle', () => {
    resetDoors();const door=doors.find(d=>d.id===25)!,center=doorCenter(door);
    const from={x:center.x,y:door.y-30},target={x:center.x,y:door.y+90},route=navigation(target),infectedRoute=navigation(target,true);
    try {
        assert.ok(route(from).y>door.y);
        toggleDoor(door,[]);assert.ok(route(from).y<door.y);assert.ok(infectedRoute(from).y>door.y);
        toggleDoor(door,[]);assert.ok(route(from).y>door.y);
        toggleDoor(door,[]);while(door.health>0)hitDoor(door,true);assert.ok(route(from).y>door.y);
    } finally {resetDoors();}
});

import {mazeDistricts,mazeWalls} from './world.ts';
test('construction mazes block straight sight but both ends connect through narrow alternating passages', () => {
    resetDoors();assert.equal(mazeDistricts.length,2);assert.ok(mazeWalls.length>=10);
    for(const zone of mazeDistricts) {
        const left={x:zone.x+30,y:zone.y+90},right={x:zone.x+zone.w-30,y:zone.y+90};
        assert.equal(blocked(left),false);assert.equal(blocked(right),false);assert.equal(visible(left,right,1000),false);
        for(const [from,target] of [[left,right],[right,left]]) {
            const route=navigation(target);let point=from,length=0;const ys:number[]=[];
            for(let step=0;step<50&&Math.hypot(point.x-target.x,point.y-target.y)>1;step++) {
                const next=route(point),distance=Math.hypot(next.x-point.x,next.y-point.y);
                assert.ok(distance>0&&distance<=60.01);assert.equal(blocked(next),false);assert.equal(visible(point,next,61),true);
                assert.ok(next.x>=zone.x&&next.x<=zone.x+zone.w&&next.y>=zone.y&&next.y<=zone.y+zone.h);
                ys.push(next.y);length+=distance;point=next;
            }
            assert.ok(Math.hypot(point.x-target.x,point.y-target.y)<1);
            assert.ok(Math.max(...ys)-Math.min(...ys)>=120);assert.ok(length>Math.abs(target.x-from.x));
        }
    }
});
test('slower humans still outrun ordinary infected only when sprinting, while the evolved remains faster', () => {
    assert.ok(C.player.walkSpeed<C.zombie.chaseSpeed);
    assert.ok(C.civilian.speedMax<C.zombie.chaseSpeed);
    assert.ok(C.player.runSpeed>C.zombie.chaseSpeed&&C.civilian.runSpeed>C.zombie.chaseSpeed);
    assert.ok(C.mutant.speed>Math.max(C.player.runSpeed,C.civilian.runSpeed,C.panic.runSpeed));
});

import {GoreField} from './gore-model.ts';
test('bullet impacts shed blood that settles on the floor without crossing a solid wall', () => {
    const gore=new GoreField(()=>.5),point={x:90,y:210};gore.impact(point,0,3);
    assert.ok(gore.particles.length>0&&gore.stains.length>0);
    for(let i=0;i<140;i++) {gore.step(1/60);for(const p of gore.particles)assert.ok(p.x<120);}
    assert.equal(gore.particles.length,0);assert.ok(gore.stains.every(s=>s.x<120));
    assert.equal(blocked(point),false);
});
test('infected kills leave a torso and severed limbs, critical enemy deaths shed a head, without retaining actors', () => {
    const gore=new GoreField(()=>.5),point={x:1230,y:900,scene:{name:'must not be retained'}};
    gore.death(point,0,0x526d84,true);assert.equal(gore.corpses.length,1);assert.equal('scene' in gore.corpses[0],false);
    assert.ok(gore.particles.some(p=>!p.blood&&p.kind==='head'));
    for(let i=0;i<140;i++)gore.step(1/60);
    assert.equal(gore.remains.length,3);assert.equal(gore.particles.length,0);
    assert.ok(gore.stains.length>0);
    const enemy=new GoreField(()=>.5);enemy.death(point,0,0x59654b,false,true);
    assert.ok(enemy.particles.some(p=>!p.blood&&p.kind==='head'));
});
test('horde gore stays within all particle/decal/corpse budgets and can be disabled', () => {
    const gore=new GoreField(()=>.5);
    for(let i=0;i<300;i++)gore.death({x:1230,y:900},0,0x59654b,i%2===0,true);
    assert.ok(gore.particles.length<=C.gore.maxParticles);assert.ok(gore.corpses.length<=C.gore.maxCorpses);assert.ok(gore.stains.length<=C.gore.maxStains);
    for(let i=0;i<140;i++)gore.step(1/60);
    assert.ok(gore.remains.length<=C.gore.maxRemains&&gore.stains.length<=C.gore.maxStains);
    const enabled=C.gore.enabled;
    try {C.gore.enabled=false;const off=new GoreField();off.death({x:90,y:90},0,0,true);off.impact({x:90,y:90},0);assert.equal(off.stains.length+off.particles.length+off.corpses.length,0);}
    finally {C.gore.enabled=enabled;}
});

import {escortArrived,escortCoverPoint} from './tactics.ts';
test('a connected crowd of soldiers splits into squads capped at three without dropping members', () => {
    const ids=Array.from({length:12},(_,i)=>i+1),links:[number,number][]=[];
    for(const a of ids)for(const b of ids)if(a<b)links.push([a,b]);
    const groups=squadGroups(ids,links),sizes=new Map<number,number>();
    for(const leader of groups.values())sizes.set(leader,(sizes.get(leader)??0)+1);
    assert.equal(groups.size,12);assert.deepEqual([...sizes.values()],[3,3,3,3]);
    for(const [id,leader] of groups)assert.ok(leader<=id&&groups.get(leader)===leader);
    assert.throws(()=>squadGroups(ids,links,0));
});
test('an escorted door cannot be sealed while even one surviving civilian is outside or on its threshold', () => {
    resetDoors();const door=doors.find(d=>d.id===25)!,center=doorCenter(door);
    const inside={x:center.x,y:door.y+90},outside={x:center.x,y:door.y-35};
    assert.equal(escortArrived(door,[]),false);
    assert.equal(escortArrived(door,[inside,outside]),false);
    assert.equal(escortArrived(door,[inside,center]),false);
    assert.equal(escortArrived(door,[inside,{x:center.x,y:door.y+45}]),true);
});
test('five covering soldiers stand to the sides of the entry and peaceful civilians can select a refuge', () => {
    resetDoors();const door=doors.find(d=>d.id===25)!,center=doorCenter(door);
    for(let slot=0;slot<5;slot++) {
        const p=escortCoverPoint(door,slot);assert.equal(blocked(p,15),false);
        assert.ok(p.y<door.y-20);assert.ok(Math.abs(p.x-center.x)>door.w/2);
    }
    assert.equal(chooseShelter({x:center.x,y:door.y-40},undefined,[])?.id,door.id);
});

import {shouldLeaveShelter,rescueSearchGoal,canBecomeShelterResident} from './tactics.ts';
test('rescued civilians stay behind a secured door beyond the old fear timer, while temporary refugees may leave', () => {
    assert.equal(shouldLeaveShelter(true,10000,25,false),false);
    assert.equal(shouldLeaveShelter(false,26,25,false),true);
    assert.equal(shouldLeaveShelter(false,26,25,true),false);
    assert.equal(shouldLeaveShelter(false,20,25,false),false);
    assert.equal(canBecomeShelterResident('civilian'),true);
    assert.equal(canBecomeShelterResident('medic'),false);assert.equal(canBecomeShelterResident('soldier'),false);
});
test('a remembered base can receive another convoy through a closed door, but unknown or compromised shelters cannot', () => {
    resetDoors();const base=doors.find(d=>d.id===25)!,center=doorCenter(base),from={x:center.x,y:base.y-40};
    try {
        toggleDoor(base,[]);
        assert.notEqual(chooseShelter(from,undefined,[])?.id,base.id);
        assert.equal(chooseShelter(from,undefined,[],base)?.id,base.id);
        assert.notEqual(chooseShelter(from,undefined,[{x:center.x,y:base.y+70}],base)?.id,base.id);
        base.health=0;assert.notEqual(chooseShelter(from,undefined,[],base)?.id,base.id);
    } finally {resetDoors();}
});
test('rescue search picks distant walkable outdoor goals, including its deterministic fallback', () => {
    const start={x:1230,y:900};
    for(const random of [()=>.5,Math.random,Math.random]) {
        const goal=rescueSearchGoal(start,random);assert.equal(blocked(goal,26),false);assert.equal(insideBuilding(goal),undefined);
        assert.ok(Math.hypot(goal.x-start.x,goal.y-start.y)>=C.tactics.rescueSearchMinDistance);
        const next=navigation(goal)(start);assert.ok(Math.hypot(next.x-start.x,next.y-start.y)>0);
    }
});

import {shelterEntryPoint} from './tactics.ts';
test('entry arrival tolerance still clears the threshold and leaves the handle within reach', () => {
    resetDoors();
    for(const door of doors) {
        const target=shelterEntryPoint(door),early={x:target.x,y:target.y-15};
        assert.equal(canCloseFromInside(early,door),true);
        assert.equal(escortArrived(door,[early]),true);
        assert.equal(blocked(target,9),false);
    }
});

import {remainingShelterPlaces,observeFollowLeader} from './tactics.ts';
test('a shelter reserves only seven civilians and rejects a full preferred base for new arrivals', () => {
    assert.equal(C.tactics.shelterCapacity,7);
    assert.equal(remainingShelterPlaces(0),7);assert.equal(remainingShelterPlaces(6),1);
    assert.equal(remainingShelterPlaces(7),0);assert.equal(remainingShelterPlaces(8),0);
    resetDoors();const base=doors.find(d=>d.id===25)!,center=doorCenter(base),from={x:center.x,y:base.y-40};
    assert.notEqual(chooseShelter(from,undefined,[],base,d=>d!==base)?.id,base.id);
    assert.equal(chooseShelter(from,undefined,[],base,d=>remainingShelterPlaces(d===base?6:0)>0)?.id,base.id);
    assert.equal(chooseShelter({x:center.x,y:base.y+42},undefined,[],base,()=>false)?.id,base.id);
});
test('a follow order remembers a copied visible position and never refreshes it from an unseen player', () => {
    const player={x:1200,y:900};const first=observeFollowLeader(undefined,player,1)!;
    player.x=2000;assert.equal(first.point.x,1200);
    const unseen=observeFollowLeader(first,undefined,20)!;
    assert.equal(unseen.point.x,1200);assert.equal(unseen.until,1+C.tactics.playerFollowMemory);
    const seen=observeFollowLeader(unseen,player,21)!;
    assert.equal(seen.point.x,2000);assert.equal(seen.until,21+C.tactics.playerFollowMemory);
});

import {civilianSpawnPoints} from './population.ts';
import {assignCompanions,canJoinFollowers} from './tactics.ts';
test('population occupies all city sectors with safe minimum separation',()=>{
    let seed=42;const random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
    const points=civilianSpawnPoints(80,random),sectors=new Set<string>();
    assert.equal(points.length,80);
    for(const [i,p] of points.entries()) {
        assert.equal(blocked(p,26),false);
        sectors.add(`${Math.floor(p.x/600)},${Math.floor(p.y/450)}`);
        for(const q of points.slice(0,i))assert.ok(Math.hypot(p.x-q.x,p.y-q.y)>=C.npc.spawnSeparation);
    }
    assert.equal(sectors.size,16);
});
test('companion assignment caps groups and preserves reserved escort places',()=>{
    const candidates=Array.from({length:12},(_,id)=>({id,group:1,distance:id,preferred:false}));
    const assigned=assignCompanions(candidates,5,new Map([[20,1],[21,1]]));
    assert.equal(assigned.size,5);assert.equal(assigned.has(20),true);
    assert.equal(assignCompanions([...candidates,...candidates.map(a=>({...a,group:2}))],1).size,2);
    for(const [role,limit] of [['soldier',3],['civilian',5],['medic',1]] as const) {
        assert.equal(canJoinFollowers(role,limit-1),true);assert.equal(canJoinFollowers(role,limit),false);
    }
});

import {matchOutcome} from './objective.ts';
import {settings,validateSettings,readValue} from './settings-model.ts';
import {defaultConfig} from './config.ts';
test('victory waits for the final wave and requires a living civilian; losing civilians takes precedence',()=>{
    assert.equal(matchOutcome(1,0,false),undefined);
    assert.equal(matchOutcome(1,1,true),undefined);
    assert.equal(matchOutcome(1,0,true),'victory');
    assert.equal(matchOutcome(0,0,true),'civilians-lost');
    assert.equal(matchOutcome(0,4,false),'civilians-lost');
});
test('settings defaults round trip, limits reject invalid input and specialists leave a civilian',()=>{
    const values=validateSettings({},defaultConfig);
    for(const setting of settings)assert.equal(values[setting.path],readValue(defaultConfig,setting.path));
    assert.throws(()=>validateSettings({'pistol.damage':NaN},defaultConfig));
    assert.throws(()=>validateSettings({'pistol.magazineSize':2.5},defaultConfig));
    assert.throws(()=>validateSettings({'npc.soldiers':20,'population.civilians':20},defaultConfig));
    assert.throws(()=>validateSettings({'zombie.contactDamage':0},defaultConfig));
    assert.equal(validateSettings({'lighting.influencePercent':0,'pistol.damage':2},defaultConfig)['pistol.damage'],2);
});

test('zero light influence removes human penalties while preserving wall occlusion',()=>{
    const previous=C.lighting.influencePercent;
    try {
        C.lighting.influencePercent=0;
        assert.equal(darknessSpread({x:30,y:30}),0);
        assert.equal(humanSees({x:30,y:30},{x:130,y:30},145),true);
        assert.equal(humanSees({x:90,y:210},{x:270,y:210},1000),false);
    } finally {C.lighting.influencePercent=previous;}
});
test('the last wave can be cleared without endless evolved replacements',()=>{
    const schedule=new HordeSchedule();schedule.due(240);
    assert.equal(schedule.nextAt(),undefined);
    assert.equal(missingMutants(0,schedule.nextAt()!==undefined),0);
    assert.equal(matchOutcome(1,0,schedule.nextAt()===undefined),'victory');
    assert.equal(entryPoints(33).length,33);
});
