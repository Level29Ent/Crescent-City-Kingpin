export type EnemyMind={state:'calm'|'fight'|'investigate'|'retreat'|'surrender';timer:number;backup:number;called:boolean};
export function newEnemyMind():EnemyMind{return {state:'calm',timer:0,backup:0,called:false};}
export type EnemyStimulus={hp:number;kind:string;seen:boolean;aimedAt:boolean;playerClose:boolean;nearAllies:number;heard:boolean;mission:boolean};
/** Decisions are explicit and bounded; surrender persists until hurt, not random per-frame rolls. */
export function updateEnemyMind(m:EnemyMind,dt:number,s:EnemyStimulus){
 m.timer=Math.max(0,m.timer-dt);
 if(s.hp<=0)return {callBackup:false};
 if(m.state==='surrender')return {callBackup:false};
 if(s.kind==='gangster'&&s.hp<=20&&s.aimedAt&&s.playerClose&&s.nearAllies===0){m.state='surrender';m.backup=0;return {callBackup:false};}
 if(s.kind==='gangster'&&s.hp<=30&&s.nearAllies===0&&s.seen){m.state='retreat';m.timer=5;m.backup=0;return {callBackup:false};}
 if(m.state==='retreat'&&m.timer>0)return {callBackup:false};
 if(s.seen){m.state='fight';if(!m.called&&!s.mission){m.backup+=dt;if(m.backup>=3){m.called=true;m.backup=0;return {callBackup:true};}}}
 else if(s.heard){m.state='investigate';m.timer=6;m.backup=0;}
 else if(m.state==='fight'){m.state='investigate';m.timer=6;m.backup=0;}
 else if(m.state==='investigate'&&m.timer===0)m.state='calm';
 else if(m.state==='retreat')m.state='investigate';
 return {callBackup:false};
}
export function hurtEnemyMind(m:EnemyMind){m.state='fight';m.backup=0;m.timer=0;}
export function acceptSurrender(m:EnemyMind,distance:number,weaponHolstered:boolean){return m.state==='surrender'&&distance<=3&&weaponHolstered;}
