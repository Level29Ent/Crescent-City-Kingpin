export type Quality='auto'|'performance'|'balanced'|'cinematic';
export type FrameBudget={scale:number;slow:number;fast:number;sample:number;seconds:number;fps:number};
export function newFrameBudget():FrameBudget{return {scale:1,slow:0,fast:0,sample:0,seconds:0,fps:60};}
/** Hysteresis prevents oscillation. Paused/loading frames never lower quality. */
export function sampleFrame(b:FrameBudget,dt:number,active:boolean){
 if(!active||dt<=0||dt>.25){b.slow=b.fast=b.sample=b.seconds=0;return false;}
 b.sample++;b.seconds+=dt;if(b.seconds<2)return false;
 b.fps=b.sample/b.seconds;const span=b.seconds;b.sample=0;b.seconds=0;
 b.slow=b.fps<34?b.slow+span:0;b.fast=b.fps>54?b.fast+span:0;
 if(b.slow>=4&&b.scale>.6){b.scale=Math.max(.6,Math.round((b.scale-.1)*10)/10);b.slow=0;b.fast=0;return true;}
 if(b.fast>=12&&b.scale<1){b.scale=Math.min(1,Math.round((b.scale+.1)*10)/10);b.fast=0;b.slow=0;return true;}return false;
}
export function renderBudget(quality:Quality,b:FrameBudget,dpr:number){
 const low=quality==='performance'||quality==='auto'&&b.scale<=.8;
 return {pixelRatio:Math.min(dpr,quality==='cinematic'?1.5:quality==='performance'?.8:quality==='auto'?b.scale:1),shadows:!low,bloom:!low,contactShadows:quality==='cinematic',weatherParticles:low?300:1000,waterInterval:low?.1:0,pathBudget:low?1:2,actorRange:low?110:180};
}
