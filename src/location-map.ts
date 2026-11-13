import {mapLocations,type MapLocation} from './navigation.ts';
export function locationMap(root:HTMLElement,player:{x:number;z:number},track:(p:MapLocation)=>void){
 const rows=mapLocations();
 const intro=document.createElement('p');intro.textContent='Every door, home, business, mission stage, work pickup/drop-off, heist target, turf and import destination. Select a pin or directory row to route there. Arrival instructions show what to do; selecting a location does not accept a mission or grant a reward.';root.append(intro);
 const filter=document.createElement('select');filter.setAttribute('aria-label','Map category');['All',...new Set(rows.map(r=>r.category))].forEach(v=>{const o=document.createElement('option');o.value=v;o.textContent=v;filter.append(o);});root.append(filter);
 const map=document.createElement('div');map.className='city-location-map';map.setAttribute('aria-label','City location map');root.append(map);
 const info=document.createElement('p');info.className='location-detail';info.setAttribute('aria-live','polite');root.append(info);
 const list=document.createElement('div');root.append(list);
 function render(){map.replaceChildren();list.replaceChildren();
 const you=document.createElement('span');you.className='map-player';you.textContent='YOU';you.style.left=`${(player.x+240)/4.8}%`;you.style.top=`${(player.z+240)/4.8}%`;map.append(you);
 const shown=rows.filter(r=>filter.value==='All'||r.category===filter.value);
 shown.forEach((r,i)=>{
  const pin=document.createElement('button');pin.className='location-pin';pin.textContent=String(i+1);pin.title=r.name;pin.setAttribute('aria-label',r.name);pin.style.left=`${(r.x+240)/4.8}%`;pin.style.top=`${(r.z+240)/4.8}%`;pin.onclick=()=>{info.replaceChildren();const detail=document.createElement('span');detail.textContent=`${r.name}: ${r.instruction} `;const go=document.createElement('button');go.textContent='Track selected pin';go.onclick=()=>track(r);info.append(detail,go);};map.append(pin);
  const row=document.createElement('article');row.className='empire-card';const title=document.createElement('h3');title.textContent=`${i+1}. ${r.name}`;const detail=document.createElement('p');detail.textContent=`${r.category} · ${Math.round(Math.hypot(player.x-r.x,player.z-r.z))} m · ${r.instruction}`;
  const route=document.createElement('button');route.textContent='Track this location';route.onclick=()=>track(r);row.append(title,detail,route);list.append(row);
 });}
 filter.onchange=render;render();
}
