import {FIELD_NOTES} from './field-notes.ts';
import type {Campaign} from './campaign.ts';
import {BINDINGS,rebind,newAccessibility,keyLabel,NEIGHBORHOODS,type ActionKey} from './polish.ts';
import {replayChoices} from './mission-replay.ts';
export function polishPanel(c:Campaign,root:HTMLElement,h:{changed():void;notice(s:string):void;replay(key:string,challenge:'finish'|'quiet'|'speed'):void;stopReplay():void;replaying():boolean;track(x:number,z:number,name:string):void}){
 const el=(tag:string,text:string)=>{const e=document.createElement(tag);e.textContent=text;return e;};
 const card=(title:string,text:string)=>{const box=el('article','');box.className='empire-card';box.append(el('h3',title),el('p',text));root.append(box);return box;};
 const button=(box:HTMLElement,text:string,fn:()=>void)=>{const b=el('button',text);b.onclick=fn;box.append(b);return b;};
 const a=c.accessibility,settings=card('Accessibility & clarity','Preferences save with your campaign. Rebinding swaps conflicting assignments. Escape, arrow keys and weapon number keys remain fixed. Touch labels show keyboard bindings but touch actions keep their original function.');
 for(const [key,label,min,max,step]of [['textScale','HUD / menu text size',1,1.5,.05],['shake','Camera shake strength',0,1,.1]] as const){const l=el('label',label);l.className='field';const input=document.createElement('input');input.type='range';input.min=String(min);input.max=String(max);input.step=String(step);input.value=String(a[key]);input.setAttribute('aria-label',label);input.oninput=()=>{a[key]=Number(input.value);h.changed();};l.append(input);settings.append(l);}
 const color=el('label','High-distinction map colors');color.className='field';const check=document.createElement('input');check.type='checkbox';check.checked=a.palette==='accessible';check.onchange=()=>{a.palette=check.checked?'accessible':'standard';h.changed();};color.append(check);settings.append(color);
 const look=el('label','Aim / look sensitivity');look.className='field';const sensitivity=document.createElement('input');sensitivity.type='range';sensitivity.min='.4';sensitivity.max='2';sensitivity.step='.1';sensitivity.value=String(c.lifestyle.lookSensitivity);sensitivity.oninput=()=>{c.lifestyle.lookSensitivity=Number(sensitivity.value);h.changed();};look.append(sensitivity);settings.append(look);
 for(const [action,label]of Object.entries(BINDINGS)){
  const line=el('div','');line.className='binding-row';line.append(el('span',label));
  const b=button(line,keyLabel(a.bindings[action as ActionKey]),()=>{b.textContent='Press a key…';b.focus();});
  b.onkeydown=e=>{e.stopPropagation();e.preventDefault();if(e.code==='Escape'){b.textContent=keyLabel(a.bindings[action as ActionKey]);return;}if(!rebind(a,action as ActionKey,e.code)){h.notice('Choose a letter, Space or modifier key; Escape and number keys are reserved.');return;}h.changed();root.replaceChildren();polishPanel(c,root,h);};settings.append(line);
 }
 button(settings,'Reset accessibility / bindings',()=>{c.accessibility=newAccessibility();h.changed();root.replaceChildren();polishPanel(c,root,h);});
 const replay=card('Mission replay & optional challenges','Replay completed stories, operations and side missions in a disposable copy of your campaign, using the actual mission logic. ALL rewards, costs, heat, injuries, choices and property changes from practice are discarded. Saving, exporting, importing, resetting and retirement are disabled while practicing. Return to campaign reloads the saved pre-replay run. Replays do not create persistent scores or award unlocks. Normal bounded offline business earnings may accrue while your saved campaign is away; those are not replay rewards.');
 if(h.replaying())button(replay,'Stop replay / return to saved campaign',h.stopReplay);
 else for(const m of replayChoices(c)){
  const row=el('div',m.name);const challenge=document.createElement('select');challenge.setAttribute('aria-label',`${m.name} replay challenge`);for(const [value,label]of [['finish','Finish the mission'],['quiet','No player gunshots'],['speed','Finish within 180s']]){const o=el('option',label!) as HTMLOptionElement;o.value=value!;challenge.append(o);}row.append(challenge);button(row,'Replay mission',()=>h.replay(m.key,challenge.value as 'finish'|'quiet'|'speed'));replay.append(row);
 }
 const areas=card('Neighborhood field guide','Five signed local landmarks and district introductions highlight the existing city. These signs are decorative and do not block streets. Activities use the existing mission/job boards; visiting does not grant cash or property.');
 for(const [index,area]of NEIGHBORHOODS.entries()){const row=el('p',`${c.districtVisits.includes(area.id)?'RECORDED · ':'UNRECORDED · '}${area.name}: ${area.tag}. ${area.activity} ${c.districtVisits.includes(area.id)?FIELD_NOTES[index]:'Press Interact at the landmark to collect its field note.'}`);areas.append(row);button(areas,`Track ${area.name} landmark`,()=>h.track(area.x,area.z,`${area.name} landmark`));}
}
