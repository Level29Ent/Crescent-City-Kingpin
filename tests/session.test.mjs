import { test } from 'node:test';
import assert from 'node:assert/strict';
import { missionSession, introShot, INTRO_SHOTS } from '../src/session.ts';
import { startMission, missionInteract, tickExpansion } from '../src/expansion.ts';
import { newCampaign, resetAfterDeath, restoreCampaign } from '../src/campaign.ts';
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

test('death completely resets low and maximum police heat without counting as an escape',()=>{
 for(const heat of [1,30,60,100]){
  const c=newCampaign();c.heat=heat;c.intervention='Patrol roadblock';c.policeClock=74;c.legacy.lastHeat=heat;
  c.lifestyle.work={id:'post',step:1,t:100};c.owned=['quarter'];const cash=c.clean;
  resetAfterDeath(c);
  assert.equal(c.heat,0);assert.equal(c.intervention,'');assert.equal(c.policeClock,0);assert.equal(c.legacy.lastHeat,0);assert.equal(c.legacy.copsOutrun,0);
  assert.equal(c.lifestyle.work,null);assert.equal(c.clean,cash);assert.deepEqual(c.owned,['quarter']);
  const restored=restoreCampaign(JSON.parse(JSON.stringify(c)));assert.equal(restored.heat,0);assert.equal(restored.intervention,'');
 }
});
