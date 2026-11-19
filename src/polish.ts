export const BINDINGS={KeyW:'Move forward / accelerate',KeyS:'Move back / reverse',KeyA:'Move left / steer left',KeyD:'Move right / steer right',ShiftLeft:'Sprint / nitro',Space:'Jump on foot / brake driving',KeyB:'Handbrake',KeyE:'Interact / vehicle',KeyR:'Reload',KeyC:'Crouch / cover',KeyH:'Medkit',KeyT:'Nonlethal takedown',KeyG:'Distraction',KeyL:'Hold lockpick',KeyM:'Empire menu',KeyV:'Driver camera',KeyQ:'Weapon wheel',KeyZ:'Dodge',KeyX:'Swap aiming shoulder',KeyF:'Enter / exit nearest vehicle'} as const;
export type ActionKey=keyof typeof BINDINGS;
export type Accessibility={textScale:number;shake:number;palette:'standard'|'accessible';bindings:Record<ActionKey,string>};
export function newAccessibility():Accessibility{return {textScale:1,shake:1,palette:'standard',bindings:Object.fromEntries(Object.keys(BINDINGS).map(k=>[k,k])) as Record<ActionKey,string>};}
const allowedKey=(v:unknown):v is string=>typeof v==='string'&&/^(Key[A-Z]|Space|ShiftLeft|ShiftRight|ControlLeft|ControlRight|AltLeft|AltRight)$/.test(v);
export function restoreAccessibility(v:any):Accessibility{
 const a=newAccessibility();if(!v||typeof v!=='object')return a;
 if(Number.isFinite(v.textScale))a.textScale=Math.max(1,Math.min(1.5,v.textScale));if(Number.isFinite(v.shake))a.shake=Math.max(0,Math.min(1,v.shake));a.palette=v.palette==='accessible'?'accessible':'standard';
 const proposed=Object.fromEntries(Object.keys(BINDINGS).map(k=>[k,allowedKey(v.bindings?.[k])?v.bindings[k]:k]));
 // Preserve old custom bindings while allocating newly introduced actions a free physical key.
 const used=new Set<string>();for(const action of Object.keys(BINDINGS)){if(v.bindings?.[action])used.add(proposed[action]!);}
 for(const action of Object.keys(BINDINGS))if(!v.bindings?.[action]){let key=action;if(used.has(key))key=[...Object.keys(BINDINGS),...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(c=>`Key${c}`)].find(k=>!used.has(k))??action;proposed[action]=key;used.add(key);}
 if(new Set(Object.values(proposed)).size===Object.keys(BINDINGS).length)a.bindings=proposed as Record<ActionKey,string>;return a;
}
/** Swap existing assignments rather than silently breaking another action. */
export function rebind(a:Accessibility,action:ActionKey,key:string){if(!(action in BINDINGS)||!allowedKey(key))return false;const other=(Object.keys(BINDINGS) as ActionKey[]).find(k=>a.bindings[k]===key),previous=a.bindings[action];a.bindings[action]=key;if(other&&other!==action)a.bindings[other]=previous;return true;}
export function canonicalKey(a:Accessibility,physical:string){const action=(Object.keys(BINDINGS) as ActionKey[]).find(k=>a.bindings[k]===physical);return action??(physical in BINDINGS?null:physical);}
export function keyLabel(code:string){return code.replace(/^Key/,'').replace('Left',' L').replace('Right',' R');}
export function palette(mode:Accessibility['palette']){return mode==='accessible'?{police:'#55bfff',enemy:'#ffac36',route:'#ffffff',crew:'#e69bff',business:'#fff17c',door:'#60e0cf'}:{police:'#4a8aff',enemy:'#ff6565',route:'#ffffff',crew:'#9af19b',business:'#ffd23a',door:'#82e6d1'};}
export function damageAngle(player:{x:number;z:number},source:{x:number;z:number},cameraYaw:number){return Math.atan2(source.x-player.x,source.z-player.z)-cameraYaw;}
export function missionDelta(before:{clean:number;dirty:number;heat:number;loyalty:number},after:typeof before){return {clean:Math.round(after.clean-before.clean),dirty:Math.round(after.dirty-before.dirty),heat:Math.round(after.heat-before.heat),loyalty:Math.round(after.loyalty-before.loyalty)};}
export const NEIGHBORHOODS=[
 {id:'quarter',name:'French Quarter',tag:'Brass, balconies and midnight deals',color:0xcda455,x:30,z:30,activity:'Follow the gold Quarter walk signs to the jazz district.'},
 {id:'treme',name:'Tremé',tag:'Rhythm, rail history and resilient streets',color:0x499ab8,x:-150,z:-150,activity:'Visit the reading room and old station; look for relief work.'},
 {id:'garden',name:'Garden District',tag:'Magnolia shade and old-money secrets',color:0xab6d92,x:-150,z:60,activity:'Explore the florist and gallery, or accept a flower delivery.'},
 {id:'docks',name:'The Docks',tag:'Cargo cranes, floodlights and river trade',color:0xd48954,x:60,z:155,activity:'Visit the cargo office and dispatch; shipments start with owned businesses.'},
 {id:'bayou',name:'The Bayou',tag:'Cypress water and quiet back routes',color:0x74a771,x:150,z:-150,activity:'Visit the tour office and watch for discoveries near the water.'},
] as const;
