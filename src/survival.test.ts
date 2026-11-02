import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { direction, staminaStep } from './survival.ts';
test('diagonal movement has the same speed as cardinal movement',()=>{const d=direction(1,1);assert.ok(Math.abs(Math.hypot(d.x,d.y)-1)<1e-10);assert.deepEqual(direction(0,0),{x:0,y:0});});
test('sprint exhausts, then requires 30 stamina to unlock',()=>{const empty=staminaStep(1,true,true,false,1);assert.equal(empty.value,0);assert.equal(empty.exhausted,true);const recovering=staminaStep(0,true,true,true,1);assert.equal(recovering.running,false);assert.equal(recovering.exhausted,true);const ready=staminaStep(29,false,false,true,1);assert.equal(ready.exhausted,false);});
test('holding shift while idle regenerates stamina',()=>{assert.equal(staminaStep(50,false,true,false,1).value,68);assert.equal(staminaStep(99,false,false,false,1).value,100);});
