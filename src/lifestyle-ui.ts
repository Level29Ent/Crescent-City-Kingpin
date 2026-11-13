import {mountShowroom} from './showroom.ts';
import {VEHICLES} from './expansion.ts';
import type {Campaign} from './campaign.ts';
import {WORK,startWork,workObjective,buyDecor,styleCar} from './lifestyle.ts';
export function lifestylePanel(c:Campaign,root:HTMLElement,h:{changed():void;track(x:number,z:number,name:string):void;resume():void}){
 const text=(tag:string,value:string)=>{const el=document.createElement(tag);el.textContent=value;return el;};
 const card=(title:string,body:string)=>{const box=text('article','');box.className='empire-card';box.append(text('h3',title),text('p',body));root.append(box);return box;};
 const refresh=()=>{root.replaceChildren();lifestylePanel(c,root,h);};
 const button=(parent:HTMLElement,label:string,action:()=>void,disabled=false)=>{const b=text('button',label) as HTMLButtonElement;b.disabled=disabled;b.onclick=()=>{action();h.changed();refresh();};parent.append(b);};
 const select=(parent:HTMLElement,label:string,options:string[],value:number,action:(i:number)=>void)=>{const wrap=text('label',label);wrap.className='field';const input=document.createElement('select');options.forEach((name,i)=>{const o=text('option',name) as HTMLOptionElement;o.value=String(i);input.append(o);});input.value=String(value);input.onchange=()=>{action(Number(input.value));h.changed();};wrap.append(input);parent.append(wrap);};
 root.append(text('h2','Jobs & Style'));
 const active=workObjective(c);if(active){const box=card('Active work order',active.text);button(box,'Track pickup / drop-off',()=>{h.track(active.x,active.z,active.text);h.resume();});button(box,'Abandon work order',()=>{c.lifestyle.work=null;c.lifestyle.workCooldown=30;});}
 card('Earn by playing',`Completed work orders: ${c.lifestyle.workCompleted}. Legal courier jobs pay clean money; art recovery pays dirty. Reach the pickup and E, then deliver and E. No idle payouts. Repeat jobs have a 45-second cooldown; ${Math.ceil(c.lifestyle.workCooldown)}s remaining.`);
 WORK.forEach(work=>{const box=card(work.name,`${work.description} $${work.pay} · ${work.duration}s.`);button(box,'Accept work order',()=>{if(startWork(c,work.id)){h.track(work.x,work.z,work.name);h.resume();}},!!c.lifestyle.work||!!c.cityStories.active||!!c.expansion.mission||!!(c.legacy.daily&&!c.legacy.daily.finished)||c.legacy.tutorial<3||c.lifestyle.workCooldown>0);});
 const home=card('Safehouse design studio','Choose a palette and light color for Mama Nola’s walkable room. Purchased decor and placed tactical furniture are visible when you next enter. Themes/lights are free; rug and framed art cost $100 each. No statistical or income bonus.');
 select(home,'Room palette',['Golden walnut','Midnight teal','Carnival plum'],c.lifestyle.safehouseTheme,i=>c.lifestyle.safehouseTheme=i);
 select(home,'Room lighting',['Warm amber','Cool mint','Violet lounge'],c.lifestyle.lightColor,i=>c.lifestyle.lightColor=i);
 button(home,c.lifestyle.rug?'Rug owned':'Buy patterned rug · $100',()=>{buyDecor(c,'rug');},c.lifestyle.rug||c.clean<100);
 button(home,c.lifestyle.art?'Wall art owned':'Buy framed city art · $100',()=>{buyDecor(c,'art');},c.lifestyle.art||c.clean<100);
 const controls=card('Control tuning','Mouse and touch-look sensitivity apply immediately. Movement joystick sensitivity remains in Legacy & Training. UI inputs do not trigger movement or firing; controls clear on focus loss.');
 const look=document.createElement('input');look.type='range';look.min='.4';look.max='2';look.step='.1';look.value=String(c.lifestyle.lookSensitivity);look.setAttribute('aria-label','Look sensitivity');look.oninput=()=>c.lifestyle.lookSensitivity=Number(look.value);look.onchange=h.changed;controls.append(look);
 select(controls,'Look Y axis',['Normal','Inverted'],c.lifestyle.invertLook?1:0,i=>c.lifestyle.invertLook=i===1);
 const cars=card('Garage body shop','Buy cosmetic spoiler/stripes for $200 each. Choose underglow and rim accents; existing underglow/rim upgrades are required to show those colors. Apply on the next garage deployment. No hidden performance boost.');
 if(!c.expansion.cars.length)cars.append(text('p','Buy a vehicle in Garage first.'));
 c.expansion.cars.forEach((car,i)=>{const style=c.lifestyle.carStyle[i]??={spoiler:false,stripe:false,glowColor:0,rimColor:0};cars.append(text('h3',`Bay ${i+1} · ${car.id}`));const preview=document.createElement('div');cars.append(preview);mountShowroom(preview,VEHICLES.find(v=>v.id===car.id)!.style,car.color,undefined,undefined,style);button(cars,style.spoiler?'Spoiler owned':'Fit spoiler · $200',()=>{styleCar(c,i,'spoiler');},style.spoiler||c.clean<200);button(cars,style.stripe?'Stripes owned':'Racing stripe · $200',()=>{styleCar(c,i,'stripe');},style.stripe||c.clean<200);select(cars,`Bay ${i+1} underglow`,['Violet','Cyan','Amber'],style.glowColor,n=>style.glowColor=n);select(cars,`Bay ${i+1} rims`,['Gold','Chrome','Black'],style.rimColor,n=>style.rimColor=n);});
}
