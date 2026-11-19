import {test} from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,BLOCKS,SPECIALISTS,hire} from '../src/campaign.ts';
import {INTERIORS} from '../src/interiors.ts';
import {atPoint,approach} from '../src/navigation.ts';
import {WORK,workInteract} from '../src/lifestyle.ts';
import {MISSIONS,PROPERTIES} from '../src/expansion.ts';
import {STORIES} from '../src/city-stories.ts';
import {OPERATIONS} from '../src/living-city.ts';
import {CHAPTERS} from '../src/kingpin.ts';
import {RACES,FARES,BOUNTIES} from '../src/pursuits.ts';
import {worldActivities,atContact,startContact,canStartContact,contactMapLocations,propertyRoom,activeMapLocation} from '../src/world-activities.ts';
import {siteTabs} from '../src/site-services.ts';
import {openingAdvice} from '../src/depth.ts';
const ready=()=>{const c=newCampaign();c.legacy.tutorial=3;c.clean=100000;return c;};
const position=a=>({x:a.x,z:a.z,room:a.room,atDesk:!!a.room,driving:false,blocked:false});
const contact=(c,id)=>{const a=worldActivities(c).find(a=>a.id===id);assert.ok(a,`missing ${id}`);return a;};

test('every existing work order, side mission, story, operation and city pursuit has a physical host',()=>{
 const c=ready(),all=worldActivities(c),ids=new Set(all.map(a=>a.id));assert.equal(ids.size,all.length);
 for(const [prefix,rows] of [['work',WORK],['mission',MISSIONS],['story',STORIES],['operation',OPERATIONS],['chapter',CHAPTERS],['race',RACES],['taxi',FARES],['bounty',BOUNTIES]])for(const m of rows)assert.ok(ids.has(`${prefix}:${m.id}`));
 for(const a of all){assert.ok(Number.isFinite(a.x)&&Number.isFinite(a.z));assert.ok(atPoint(a.x,a.z,a,0.1));if(a.room)assert.ok(INTERIORS.some(r=>r.id===a.room));}
 for(const w of WORK)assert.ok(contact(c,`work:${w.id}`).room,`${w.id} should have an indoor dispatcher`);
 for(const p of PROPERTIES)assert.ok(INTERIORS.some(r=>r.id===propertyRoom(p.id)),`${p.id} needs a real room`);
});

test('indoor jobs cannot start from GPS, the street, the doorway, a different building or while driving',()=>{
 const c=ready(),a=contact(c,'work:medical'),before=structuredClone(c);
 for(const patch of [{room:null,atDesk:false},{x:a.x+50},{room:'hq'},{atDesk:false},{driving:true},{blocked:true}]){
  assert.equal(startContact(c,a.id,{...position(a),...patch},'accept'),false);assert.deepEqual(c,before);
 }
 assert.ok(startContact(c,a.id,position(a),'accept'));assert.equal(c.lifestyle.work.id,'medical');assert.equal(c.clean,before.clean);
 assert.equal(startContact(c,'work:post',position(contact(c,'work:post')),'accept'),false,'one active activity');
});

test('street contacts require their actual ring on foot and preserve fee/cooldown gates',()=>{
 const c=ready(),a=contact(c,'race:canal'),before=c.clean;
 assert.equal(startContact(c,a.id,{...position(a),x:a.x+20},'accept'),false);
 assert.equal(startContact(c,a.id,{...position(a),room:'hq',atDesk:true},'accept'),false);
 assert.equal(startContact(c,a.id,{...position(a),driving:true},'accept'),false);
 c.clean=10;assert.equal(startContact(c,a.id,position(a),'accept'),false);assert.equal(c.clean,10);
 c.clean=before;assert.ok(startContact(c,a.id,position(a),'accept'));assert.equal(c.clean,before-RACES[0].fee);
 assert.equal(startContact(c,a.id,position(a),'accept'),false);assert.equal(c.clean,before-RACES[0].fee);
});

test('map browsing and eligibility probing never spend money or start/advance activities',()=>{
 const c=ready(),before=structuredClone(c);
 for(let i=0;i<3;i++){const map=contactMapLocations(c);assert.ok(map.some(a=>a.id==='contact:work:medical'));for(const a of worldActivities(c))canStartContact(c,a);}
 assert.deepEqual(c,before);
 c.living.active={id:'recovery',step:0,remaining:100,choice:'loud',spawned:false,vehicleCondition:100,passenger:{}};
 assert.equal(contactMapLocations(c).length,0,'no competing offers while an activity is active');
});

test('clinic work starts at its desk, picks up once and pays once at the diner',()=>{
 const c=ready(),a=contact(c,'work:medical'),before=c.clean;
 assert.ok(startContact(c,a.id,position(a),'accept'));
 assert.match(workInteract(c,a.x,a.z),/Cargo collected/);assert.equal(c.lifestyle.work.step,1);assert.equal(c.clean,before);
 assert.equal(workInteract(c,a.x,a.z),null);
 const diner=approach(INTERIORS.find(r=>r.id==='diner'));
 assert.ok(workInteract(c,diner.x,diner.z));assert.ok(c.clean>before);const paid=c.clean;
 assert.equal(workInteract(c,diner.x,diner.z),null);assert.equal(c.clean,paid);
});

test('existing story unlocks and explicit moral/approach choices survive location-based acceptance',()=>{
 const c=ready(),next=contact(c,'story:levee');assert.equal(startContact(c,next.id,position(next),'quiet'),false);
 const first=contact(c,'story:brass');assert.equal(startContact(c,first.id,position(first),'invalid'),false);
 assert.ok(startContact(c,first.id,position(first),'bold'));assert.equal(c.cityStories.active.choice,'bold');
 c.cityStories.active=null;c.cityStories.completed=['brass','levee','crown'];
 const chapter=contact(c,'chapter:union');assert.ok(startContact(c,chapter.id,position(chapter),'protect','lockpick'));
 assert.equal(c.kingpin.active.choice,'protect');assert.equal(c.kingpin.active.method,'lockpick');
});

test('owned-business, personal, rivalry and final takeover offers remain on-site and gated',()=>{
 const c=ready();c.cityStories.completed=['brass','levee','crown'];c.kingpin.chapters={union:'protect',betrayal:'protect',reckoning:'protect'};
 c.expansion.properties=['jazz','courier','cafe'];for(const id of ['muscle','mechanic'])hire(c,id);
 c.pursuits.rivalry.jazz=30;
 for(const id of ['business:jazz:club','business:courier:shipment','rival:jazz','personal:muscle','takeover:city'])assert.ok(contact(c,id));
 const takeover=contact(c,'takeover:city');assert.equal(canStartContact(c,takeover),false);
 c.owned=BLOCKS.map(b=>b.id);assert.ok(canStartContact(c,takeover));
 assert.equal(startContact(c,takeover.id,{...position(takeover),room:null},'accept'),false);
 assert.ok(startContact(c,takeover.id,position(takeover),'accept'));
});

test('pause has no remote storefronts; local desks expose only relevant services',()=>{
 assert.deepEqual(siteTabs(null),[]);
 assert.ok(siteTabs('garage').includes('Garage'));assert.ok(!siteTabs('clinic').includes('Garage'));
 assert.ok(siteTabs('tailor').includes('Character'));assert.ok(!siteTabs('clinic').includes('Character'));
 assert.ok(siteTabs('bank').includes('Heists'));assert.ok(!siteTabs('hq').includes('Heists'));
 assert.ok(siteTabs('hq').includes('Safehouse'));assert.ok(!siteTabs('clinic').includes('Safehouse'));
});

test('an already accepted parade is not contradicted by a suggested clinic job',()=>{
 const c=ready();const parade=contact(c,'mission:parade');assert.ok(startContact(c,parade.id,position(parade),'accept'));
 assert.doesNotMatch(openingAdvice(c),/Clinic Supply Run/);assert.match(openingAdvice(c),/current|marker/i);
});

test('the map exposes only the live stage and city time never assigns a street event remotely',async()=>{
 const {tickAtmosphere}=await import('../src/city-atmosphere.ts');
 const c=ready();tickAtmosphere(c,151,0);assert.equal(c.kingpin.active,null);
 const event=contact(c,'event:witness');assert.ok(canStartContact(c,event));
 assert.equal(startContact(c,event.id,{...position(event),x:event.x+20},'accept'),false);
 assert.ok(startContact(c,event.id,position(event),'accept'));assert.equal(c.kingpin.active.id,'witness');assert.equal(c.kingpin.eventClock,0);
 const marker=activeMapLocation(c);assert.ok(marker);assert.equal(marker.id,'active:objective');
 const d=ready(),a=contact(d,'mission:parade');startContact(d,a.id,position(a),'accept');
 assert.match(activeMapLocation(d).name,/marshal/);d.expansion.mission.step=1;assert.match(activeMapLocation(d).name,/south barricade/);
});

test('contacts stay visible when an alternative approach is available, and street hosts do not block doors',()=>{
 const c=ready();c.living.completed=['recovery','rescue','stealth'];c.heat=40;
 const heist=contact(c,'operation:heist');assert.equal(canStartContact(c,heist,'quiet'),false);assert.ok(canStartContact(c,heist,'loud'));
 assert.ok(contactMapLocations(c).some(r=>r.id==='contact:operation:heist'));
 for(const a of worldActivities(c).filter(a=>!a.room))for(const room of INTERIORS){const p=approach(room);assert.ok(Math.hypot(a.x-p.x,a.z-p.z)>3,`${a.id} blocks ${room.id}`);}
});
