import { test } from 'node:test';
import assert from 'node:assert/strict';
import { missionSession, introShot, INTRO_SHOTS } from '../src/session.ts';
import { startMission, missionInteract, tickExpansion } from '../src/expansion.ts';
import { newCampaign } from '../src/campaign.ts';
test('mission handoff clears all pause/menu flags and permits the first mission to advance',()=>{
  const c=newCampaign();
  const paused={playing:false,managing:true,shopOpen:true,balcony:true};
  assert.ok(startMission(c,'parade'));
  const active={...paused,...missionSession()};
  assert.equal(active.playing,true);assert.equal(active.managing,false);assert.equal(active.shopOpen,false);assert.equal(active.balcony,false);
  if(active.playing&&!active.managing&&!active.shopOpen)tickExpansion(c,1,()=>0);
  assert.equal(c.expansion.mission.remaining,359);
  assert.match(missionInteract(c,0,-18),/advanced/);
  assert.equal(c.expansion.mission.step,1);
});
test('cinematic has three bounded four-second chapters',()=>{
  assert.equal(INTRO_SHOTS.length,3);assert.equal(introShot(0),0);assert.equal(introShot(3.99),0);assert.equal(introShot(4),1);assert.equal(introShot(8),2);assert.equal(introShot(99),2);
  for(const shot of INTRO_SHOTS){assert.equal(shot.from.length,3);assert.equal(shot.look.length,3);assert.ok(shot.title&&shot.text);}
});
