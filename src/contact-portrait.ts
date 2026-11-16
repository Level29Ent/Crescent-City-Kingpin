import {portraitInitials} from './mission-presentation.ts';
/** Small locally drawn fictional contact portrait; never fetch remote art or avatars. */
export function contactPortrait(speaker:string){
 const canvas=document.createElement('canvas');canvas.width=112;canvas.height=128;canvas.setAttribute('aria-label',`${speaker} illustrated contact portrait`);
 const ctx=canvas.getContext('2d')!,seed=[...speaker].reduce((n,c)=>n+c.charCodeAt(0),0),colors=['#54768c','#695f86','#4a796c','#8c6850'];
 ctx.fillStyle=colors[seed%4]!;ctx.fillRect(0,0,112,128);ctx.fillStyle='#172c3b';ctx.beginPath();ctx.ellipse(56,112,41,39,0,0,Math.PI*2);ctx.fill();ctx.fillStyle=['#b88765','#d3a47b','#8d624b'][seed%3]!;ctx.fillRect(46,70,20,25);ctx.beginPath();ctx.ellipse(56,49,25,32,0,0,Math.PI*2);ctx.fill();ctx.fillStyle=seed%2?'#2e2428':'#d3c3a4';ctx.beginPath();ctx.ellipse(56,27,27,14,0,Math.PI,Math.PI*2);ctx.fill();ctx.fillStyle='#182631';ctx.fillRect(42,46,7,3);ctx.fillRect(64,46,7,3);ctx.strokeStyle='#674b3f';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(48,65);ctx.lineTo(64,65);ctx.stroke();ctx.fillStyle='#f6e9bd';ctx.font='bold 16px sans-serif';ctx.textAlign='center';ctx.fillText(portraitInitials(speaker),56,118);
 return canvas;
}
