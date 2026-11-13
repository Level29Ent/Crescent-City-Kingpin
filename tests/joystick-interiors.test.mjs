import {approach} from '../src/navigation.ts';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { joystickVector } from '../src/joystick.ts';
import { INTERIORS, indoorMove, nearestEntrance } from '../src/interiors.ts';

test('analog joystick has a deadzone, proportional speed and a circular travel limit',()=>{
  assert.deepEqual(joystickVector(0,0,40),{x:0,y:0,knobX:0,knobY:0});
  assert.equal(joystickVector(2,2,40).x,0);
  const half=joystickVector(20,0,40);assert.ok(half.x>0&&half.x<.5);assert.equal(half.y,0);
  const full=joystickVector(100,-100,40);assert.ok(Math.abs(Math.hypot(full.x,full.y)-1)<1e-10);
  assert.ok(Math.abs(Math.hypot(full.knobX,full.knobY)-40)<1e-10);assert.ok(full.y>0);
  assert.equal(joystickVector(NaN,0,40).x,0);assert.equal(joystickVector(10,0,0).x,0);
});
test('forty-one facade entrances are distinct, selectable on-site and unavailable remotely',()=>{
  assert.equal(INTERIORS.length,41);assert.equal(new Set(INTERIORS.map(b=>b.id)).size,41);
  for(const b of INTERIORS)assert.equal(nearestEntrance(approach(b).x,approach(b).z).id,b.id);
  assert.equal(nearestEntrance(230,-230),undefined);
  const hq=approach(INTERIORS.find(b=>b.id==='hq'));assert.equal(nearestEntrance(hq.x+5,hq.z,3),undefined);assert.equal(nearestEntrance(hq.x,hq.z,3).id,'hq');
});
test('indoor movement stops at walls and furniture but slides on an unobstructed axis',()=>{
  assert.deepEqual(indoorMove(0,5,1,-1,[]),{x:1,z:4});
  assert.deepEqual(indoorMove(6.3,0,.5,0,[]),{x:6.3,z:0});
  const desk=[{x:0,z:-5.4,w:4,d:1}];
  const stopped=indoorMove(0,-4.4,0,-.2,desk);assert.equal(stopped.z,-4.4);
  const slide=indoorMove(0,-4.4,.3,-.2,desk);assert.equal(slide.x,.3);assert.equal(slide.z,-4.4);
  assert.equal(indoorMove(0,7.3,0,.3,[]).z,7.3);
});
