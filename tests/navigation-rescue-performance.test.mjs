import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createNavigator,clearSegment,MinHeap} from '../src/pathfinding.ts';
import {cityClear,createCityNavigator,routeAgent} from '../src/city-navigation.ts';
import {createRoadNetwork,trafficLight,approachSpeed,inFront} from '../src/road-network.ts';
import {createStreetLife} from '../src/street-life.ts';
import {newPursuit} from '../src/pursuit.ts';
import {createCoverPlanner,coverPhase} from '../src/tactics.ts';
import {newPassenger,restorePassenger,updateBoarding,damagePassenger,passengerTrafficImpact} from '../src/rescue.ts';
import {newFrameBudget,sampleFrame,renderBudget} from '../src/performance.ts';
import {createCar,createPerson} from '../src/actors.ts';
import {PARKED_CARS} from '../src/world.ts';
import {VEHICLES} from '../src/expansion.ts';
import {newCampaign,restoreCampaign} from '../src/campaign.ts';
import {startOperation,operationInteract,operationObjective,tickOperation} from '../src/living-city.ts';
import {approach} from '../src/navigation.ts';

test('A* routes around buildings and thin walls without diagonal corner cutting',()=>{
 const clear=(x,z)=>x>=-20&&x<=20&&z>=-20&&z<=20&&!(Math.abs(x)<4&&z<10&&z>-12);
 const nav=createNavigator(clear,2,-20,20),from={x:-10,z:0},to={x:10,z:0},route=nav.route(from,to);
 assert.ok(route.length>2);assert.ok(route.some(p=>Math.abs(p.z)>=10));let last=from;
 for(const p of route){assert.ok(clearSegment(last,p,clear));last=p;}assert.deepEqual(route.at(-1),to);
 assert.deepEqual(nav.route({x:0,z:0},to),[]);assert.deepEqual(nav.route(from,to,1),[]);
 const blocked=(x,z)=>!(x>-.25&&x<.25);assert.equal(clearSegment({x:-2,z:0},{x:2,z:0},blocked),false);
 const heap=new MinHeap();for(const n of [3,1,5,2,4])heap.push(n,n);assert.deepEqual(Array.from({length:5},()=>heap.pop()),[1,2,3,4,5]);
});
test('real city NPC paths route around world collision and respect frame planning budget',()=>{
 const nav=createCityNavigator(),a=routeAgent(-5,-30),goal={x:65,z:-30};
 // Select an actual blocked straight line with valid endpoints.
 const candidates=[];for(let x=-180;x<=120;x+=60)for(let z=-150;z<=150;z+=60){const p={x:x-4,z},q={x:x+64,z};if(cityClear(p.x,p.z)&&cityClear(q.x,q.z)&&!clearSegment(p,q,cityClear))candidates.push([p,q]);}
 assert.ok(candidates.length>0);const [from,to]=candidates[0],agent=routeAgent(from.x,from.z);
 nav.beginFrame(0);assert.equal(nav.next(agent,to,.1),null);assert.equal(agent.path.length,0);
 nav.beginFrame(1);const next=nav.next(agent,to,.1);assert.ok(next);assert.ok(agent.path.length>0);
 let previous=from;for(const point of agent.path){assert.ok(clearSegment(previous,point,nav.clear));previous=point;}
 void a;void goal;
});
test('directed lane graph has validated turns and connects every street node',()=>{
 const roads=createRoadNetwork();assert.ok(roads.nodes.length>100);let turns=0;
 for(const node of roads.nodes){const edges=roads.edges.get(node.id);assert.ok(edges.length>0,`node ${node.id} has exit`);
  for(const edge of edges){let last=node;for(const point of edge.points){assert.ok(clearSegment(last,point,(x,z)=>cityClear(x,z,1.4)));last=point;}assert.deepEqual(edge.points.at(-1),{x:roads.nodes[edge.to].x,z:roads.nodes[edge.to].z});if(roads.nodes[edge.to].dir!==node.dir)turns++;}
  if(node.id!==0)assert.ok(roads.route(0,node.id).length>0,`reachable ${node.id}`);
 }assert.ok(turns>50);
 const target=roads.nodes.length-1,route=roads.route(0,target);assert.ok(route.length>0);assert.equal(route.at(-1).to,target);
 const first=route[0].to;const detour=roads.route(0,target,(a,b)=>a.id===0&&b.id===first);assert.ok(detour.length>0);assert.notEqual(detour[0].to,first);
});
test('signals have all-red clearance and traffic slows for leaders',()=>{
 for(let t=0;t<20;t+=.1)assert.ok(!(trafficLight(t,true)&&trafficLight(t,false)));
 assert.equal(trafficLight(0,true),false);assert.equal(trafficLight(0,false),false);
 assert.ok(inFront({x:0,z:0},0,{x:0,z:5}));assert.equal(inFront({x:0,z:0},0,{x:0,z:-5}),false);
 assert.equal(approachSpeed(8,0,.5),2);assert.equal(approachSpeed(0,7,.5),2.5);
});
test('traffic follows connected routes for several minutes without leaving clear lanes or stacking',()=>{
 const scene=new THREE.Scene(),traffic=createStreetLife(scene),start=traffic.state();let travelled=0,last=start;
 const recent=Array(8).fill(0);
 for(let i=0;i<9600;i++){
  traffic.update(.05,i*.05,235,230,0,true,()=>{});
  const state=traffic.state();if(i%20===0){for(let k=0;k<state.length;k++){const c=state[k];assert.ok(cityClear(c.x,c.z,1.35));const move=Math.hypot(c.x-last[k].x,c.z-last[k].z);travelled+=move;if(i>8400)recent[k]+=move;for(let j=k+1;j<state.length;j++)assert.ok(Math.hypot(c.x-state[j].x,c.z-state[j].z)>=2.9);}last=state;}
 }
 assert.ok(recent.every(n=>n>30),`no late gridlock: ${recent}`);
 assert.ok(travelled>500,`distance ${travelled}`);assert.ok(traffic.state().some((p,i)=>Math.abs(p.x-start[i].x)>30&&Math.abs(p.z-start[i].z)>30));traffic.dispose();assert.equal(scene.children.length,0);
});
test('police routes follow last sighting regardless of hidden-player movement',()=>{
 const a=createStreetLife(new THREE.Scene()),b=createStreetLife(new THREE.Scene()),p={...newPursuit(),phase:'search',lastX:60,lastZ:0};
 for(let i=0;i<600;i++){a.update(.05,i*.05,-235,-235,80,true,()=>{},undefined,p);b.update(.05,i*.05,235,230,80,true,()=>{},undefined,p);}
 assert.deepEqual(a.observers(),b.observers());a.dispose();b.dispose();
});
test('cover claims are exclusive, expire, release and alternate hide/peek windows',()=>{
 const planner=createCoverPlanner([{x:0,z:0},{x:15,z:0}],()=>true),from={x:0,z:-5},threat={x:0,z:20};
 const a=planner.choose(1,from,threat,0),b=planner.choose(2,from,threat,0);assert.ok(a&&b);assert.notEqual(a.id,b.id);
 assert.equal(planner.choose(3,from,threat,0),null);planner.release(1);assert.ok(planner.choose(3,from,threat,1));assert.ok(planner.choose(4,from,threat,10));
 assert.equal(coverPhase(0,0),'hide');assert.equal(coverPhase(2.5,0),'peek');
});
test('boarding requires nearby stationary car and available passenger seat, never a moving motorcycle',()=>{
 const p=newPassenger(10,20),car={key:'car-1',distance:2,speed:0,hasSeat:true};
 updateBoarding(p,.5,car);assert.ok(p.boarding>0&&!p.boarded);updateBoarding(p,.7,car);assert.ok(p.boarded);
 updateBoarding(p,.1,{...car,key:'car-2',distance:8,speed:20});assert.equal(p.boarded,false);assert.equal(p.boarding,0);
 updateBoarding(p,5,{...car,hasSeat:false});assert.equal(p.boarded,false);
 updateBoarding(p,5,{...car,speed:8});assert.equal(p.boarded,false);
 updateBoarding(p,2,car);updateBoarding(p,.1,null);assert.equal(p.boarded,false);assert.equal(p.vehicleKey,'');
});
test('passenger injury is bounded, vehicle shields damage and reload preserves health not stale attachments',()=>{
 const p=newPassenger(10,20);assert.equal(damagePassenger(p,10),10);assert.equal(damagePassenger(p,10,true),4);assert.equal(damagePassenger(p,Infinity),0);assert.equal(damagePassenger(p,-10),0);
 p.boarded=true;p.boarding=1;p.vehicleKey='old';const restored=restorePassenger(p);assert.equal(restored.hp,86);assert.equal(restored.x,10);assert.equal(restored.boarded,false);
 damagePassenger(p,1000);assert.equal(p.hp,0);assert.equal(damagePassenger(p,10),0);assert.equal(restorePassenger({hp:-3,x:Infinity,z:999}).hp,0);
});
test('rescue cannot pay out without boarded living passenger and fails cleanly on injury',()=>{
 const c=newCampaign();c.legacy.tutorial=3;c.living.completed=['recovery'];startOperation(c,'rescue');
 const context=()=>({...approach(operationObjective(c)),driving:false,bike:false,recoveryCar:false,condition:100,guards:0,fired:false,searching:false});
 operationInteract(c,context());assert.match(operationInteract(c,{...context(),driving:true,passengerBoarded:false}),/board/);
 c.living.active.passenger.hp=0;assert.match(operationInteract(c,{...context(),driving:true,passengerBoarded:true}),/failed/);assert.equal(c.clean,300);assert.match(tickOperation(c,.1,false),/musician was lost/);assert.equal(c.living.active,null);
 startOperation(c,'rescue');operationInteract(c,context());c.living.active.passenger.hp=55;
 const restored=restoreCampaign(JSON.parse(JSON.stringify(c)));assert.equal(restored.living.active.passenger.hp,55);
 assert.match(operationInteract(c,{...context(),driving:true,passengerBoarded:true}),/complete/);assert.equal(c.clean,1250);
});
test('all car classes expose usable passenger seat except motorcycle and seated pose hides guns',()=>{
 for(const m of VEHICLES){const car=createCar(m.style,0x334455);assert.equal(car.passengerSeat===null,m.id==='bike');if(car.passengerSeat)assert.ok(car.passengerSeat.toArray().every(Number.isFinite));car.dispose();}
 const person=createPerson('player',5);person.pose('seated',0,0,0,.1);assert.equal(person.root.getObjectByName('weapon-0').visible,false);person.pose('walk',3,1,0,.1);assert.equal(person.root.getObjectByName('weapon-0').visible,true);person.dispose();
});
test('adaptive graphics downscale only sustained slow play, recover slowly, and preserve simulation budget limits',()=>{
 const b=newFrameBudget();for(let i=0;i<300;i++)sampleFrame(b,1/25,false);assert.equal(b.scale,1);
 for(let i=0;i<300;i++)sampleFrame(b,1/25,true);assert.ok(b.scale<1);assert.ok(b.scale>=.6);
 for(let i=0;i<3000;i++)sampleFrame(b,1/20,true);assert.equal(b.scale,.6);
 const low=renderBudget('auto',b,3);assert.equal(low.shadows,false);assert.equal(low.bloom,false);assert.equal(low.weatherParticles,300);assert.equal(low.pathBudget,1);
 for(let i=0;i<4800;i++)sampleFrame(b,1/60,true);assert.equal(b.scale,1);
 assert.equal(renderBudget('cinematic',b,3).pixelRatio,1.5);assert.equal(renderBudget('performance',b,3).pixelRatio,.8);assert.ok(renderBudget('balanced',b,1).bloom);
});


test('actual parked fleet leaves traffic moving through safe detours after eight minutes',()=>{
 const traffic=createStreetLife(new THREE.Scene()),parked=PARKED_CARS.map(([x,z])=>({x,z}));let previous=traffic.state(),recent=Array(8).fill(0);
 for(let i=0;i<9600;i++){traffic.update(.05,i*.05,235,230,0,true,()=>{},undefined,undefined,parked);const state=traffic.state();if(i>8400)state.forEach((c,k)=>recent[k]+=Math.hypot(c.x-previous[k].x,c.z-previous[k].z));previous=state;}
 assert.ok(recent.every(n=>n>30),`continued movement around parked cars: ${recent}`);traffic.dispose();
});
test('on-foot rescue traffic impacts have cooldown and a damage cap; boarded passengers use crash protection instead',()=>{
 const p=newPassenger(0,0),car={x:0,z:0,speed:50};assert.equal(passengerTrafficImpact(p,.1,[car]),45);assert.equal(p.hp,55);
 assert.equal(passengerTrafficImpact(p,.1,[car]),0);p.boarded=true;assert.equal(passengerTrafficImpact(p,2,[car]),0);assert.equal(p.hp,55);
 p.boarded=false;assert.equal(passengerTrafficImpact(p,.1,[{...car,speed:0}]),0);assert.equal(passengerTrafficImpact(p,.1,[{...car,x:10}]),0);
});

test('low graphics budget reduces actual rain draw count and disposes its resources',async()=>{
 const {createWeather}=await import('../src/weather.ts'),scene=new THREE.Scene();scene.fog=new THREE.Fog(0x112233,10,100);const weather=createWeather(scene),rain=scene.children[0];
 weather.update(160,.05,0,0,300);assert.equal(rain.visible,true);assert.equal(rain.geometry.drawRange.count,600);
 weather.update(160,.05,0,0,1000);assert.equal(rain.geometry.drawRange.count,2000);
 weather.update(0,.05,0,0,300);assert.equal(rain.visible,false);weather.dispose();assert.equal(scene.children.length,0);
});
