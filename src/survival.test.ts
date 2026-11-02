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
    assert.equal(first.state.health, 80);
    assert.equal(biteCivilian(first.state, 1).state.health, 80);
    assert.equal(biteCivilian(first.state, 1.5).converted, false);
    assert.equal(biteCivilian(first.state, 2.2).state.health, 60);
});
test('five spaced bites convert a civilian once, conserving the living-plus-zombie population', () => {
    let state: CivilianState = { health: 100, hurtUntil: 0, infected: false };
    let civilians = INITIAL_CIVILIANS, zombies = INITIAL_ZOMBIES;
    for (let i = 0; i < 5; i++) {
        const hit = biteCivilian(state, i * 1.2);
        state = hit.state;
        if (hit.converted) {
            civilians--;
            zombies++;
        }
        assert.equal(hit.converted, i === 4);
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
import {spawnPoint} from './world.ts';
test('spawn fallback respects obstacles and safety radius and rejects impossible configurations',()=>{
 const p=spawnPoint({x:1230,y:900},300,()=>.5);
 assert.equal(blocked(p,26),false);assert.ok(Math.hypot(p.x-1230,p.y-900)>=300);
 assert.throws(()=>spawnPoint({x:1230,y:900},10000,()=>.5),/não há espaço livre/);
});
test('non-default configuration drives ammunition, stamina, damage, panic, populations and navigation',()=>{
 const script=`
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
 const result=spawnSync(process.execPath,['--experimental-strip-types','--input-type=module','-e',script],{encoding:'utf8'});
 assert.equal(result.status,0,result.stderr||result.stdout);
});
