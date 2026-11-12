import type {Campaign} from './campaign.ts';
import {STORIES,DISCOVERIES,startStory,storyObjective} from './city-stories.ts';
export function cityStoriesPanel(c:Campaign,root:HTMLElement,h:{changed():void;track(x:number,z:number,name:string):void;resume():void}){
 const text=(tag:string,value:string)=>{const el=document.createElement(tag);el.textContent=value;return el;};
 const card=(title:string,body:string)=>{const box=text('article','');box.className='empire-card';box.append(text('h3',title),text('p',body));root.append(box);return box;};
 const button=(parent:HTMLElement,title:string,action:()=>void,disabled=false)=>{const b=text('button',title) as HTMLButtonElement;b.disabled=disabled;b.onclick=()=>{action();h.changed();};parent.append(b);};
 root.append(text('h2','Stories & Exploration'),text('p','Three connected story chapters, with quiet or bold choices. Travel to the marked contact, press E to begin the encounter, defeat the named crew, then return to Mama Nola. Quiet choices improve loyalty; bold choices pay 35% extra but bring more heat. Complete onboarding or explicitly skip it in Legacy & Training first.'));
 const active=storyObjective(c);if(active){const box=card('Current story',active.text);button(box,'Track story objective',()=>{h.track(active.x,active.z,active.text);h.resume();});}
 STORIES.forEach((m,i)=>{
  const complete=c.cityStories.completed.includes(m.id),locked=i>0&&!c.cityStories.completed.includes(STORIES[i-1]!.id);
  const box=card(`${i+1}. ${m.title}${complete?' · COMPLETE':''}`,`${m.speaker}: “${m.dialogue}” Base $${m.pay.toLocaleString()} dirty. ${m.id==='crown'?'Finale unlocks the Crescent Revolver weapon variant.':''}`);
  for(const choice of ['quiet','bold'])button(box,choice==='quiet'?'Protect the neighborhood':'Take the high-risk payout',()=>{if(startStory(c,m.id,choice)){h.track(m.x,m.z,m.steps[0]);h.resume();}},complete||locked||!!c.cityStories.active||!!c.expansion.mission||!!(c.legacy.daily&&!c.legacy.daily.finished)||c.legacy.tutorial<3);
 });
 card('Street survival','C / COVER crouches. Within 2.4m of a sandbag station or waist-high cover, incoming damage is reduced 60%. Crouching slows movement and tightens gun spread. Rival crews alternate flanking bursts and firing windows. Traffic brakes near pedestrians; high heat activates pursuing police cruisers. Avoid collisions.');
 for(const d of DISCOVERIES){const found=c.cityStories.discovered.includes(d.id);const box=card(`${found?'DISCOVERED':'UNEXPLORED'} · ${d.name}`,`${d.area} · ${d.kind==='parts'?'+4 mechanical parts':`+$${d.reward} dirty`} once only. Enterable room nearby; visit the cyan marker and E. Hidden cache uses a gold beacon.`);button(box,'Mark landmark',()=>{h.track(d.x,d.z,d.name);h.resume();});}
 card('District field notes',`Discoveries ${c.cityStories.discovered.length}/${DISCOVERIES.length} · Story wins ${c.cityStories.bossWins} · Quiet resolutions ${c.cityStories.mercy}. These are new local landmarks within the existing city grid, not a larger streamed world.`);
}
