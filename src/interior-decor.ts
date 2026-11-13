import * as THREE from 'three';
export type Surface='wood'|'tile'|'brick'|'metal';
/** Small local textures: no image downloads, random flicker or external asset dependencies. */
export function surfaceTexture(kind:Surface){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
 const c=canvas.getContext('2d')!;
 c.fillStyle={wood:'#816044',tile:'#a6b2a4',brick:'#947362',metal:'#72828a'}[kind];c.fillRect(0,0,128,128);
 c.strokeStyle=kind==='tile'?'#5e706b':'#413e38';c.lineWidth=2;
 if(kind==='wood'){for(let y=0;y<128;y+=16){c.strokeRect(0,y,128,16);for(let i=0;i<8;i++){c.globalAlpha=.22;c.beginPath();c.moveTo(0,y+i*2);c.lineTo(128,y+i*2+1);c.stroke();}c.globalAlpha=1;c.strokeRect(y%32?64:20,y,44,16);}}
 if(kind==='tile'){for(let x=0;x<128;x+=32)for(let y=0;y<128;y+=32){c.strokeRect(x,y,32,32);if((x+y)%64===0){c.fillStyle='#91a299';c.fillRect(x+3,y+3,26,26);}}}
 if(kind==='brick'){for(let y=0;y<128;y+=16)for(let x=-32;x<128;x+=64)c.strokeRect(x+(y%32?32:0),y,64,16);}
 if(kind==='metal'){for(let x=4;x<128;x+=16)for(let y=4;y<128;y+=16){c.fillStyle='#b2bec1';c.fillRect(x,y,3,3);}c.strokeRect(0,0,128,128);}
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(4,4);return texture;
}
type Box=(x:number,y:number,z:number,w:number,h:number,d:number,color:number,solid?:boolean)=>THREE.Mesh;
/** Perimeter decor leaves a continuous, clear central route between exit, supplies and desk. */
export function furnishDetails(theme:string,box:Box){
 for(const x of [-6.85,6.85]){
  box(x,.2,0,.12,.4,15.5,0x392f28);box(x,3.7,0,.16,.16,15.5,0xd3b47c);
  for(const z of [-3,2]){
   box(x,2.3,z,.15,1.9,2.2,0xd2bd8c);box(x-Math.sign(x)*.1,2.3,z,.08,1.6,1.9,0x386370);
   box(x-Math.sign(x)*.15,2.3,z,.06,1.7,.07,0xcdbb94);box(x-Math.sign(x)*.15,2.3,z,.06,.07,2,0xcdbb94);
   box(x-Math.sign(x)*.28,2.3,z-1.2,.25,2.2,.4,theme==='club'?0x673b64:0x82654e);
  }
 }
 for(const x of [-5.9,5.9]){
  box(x,.35,-6.5,.65,.7,.65,0x9f7250,true);
  for(const dx of [-.22,0,.22]){box(x+dx,1.1,-6.5,.12,1.2,.12,0x405b37);box(x+dx,1.5,-6.5,.45,.5,.4,0x538854);}
  box(x,2.7,-7.84,1.4,1.6,.12,0xd9b777);box(x,2.7,-7.74,1.15,1.3,.06,0x3a6664);
  box(x-.2,2.6,-7.69,.22,.9,.02,0xcda47d);box(x+.25,2.4,-7.69,.45,.4,.02,0x7f9a62);
 }
 // Reception equipment: ledger, monitor, paperwork, task lamp.
 box(-1.25,1.45,-5.4,.7,.05,.45,0xebe0b9);box(-1.25,1.49,-5.4,.5,.02,.3,0x617174);
 box(.7,1.7,-5.55,.75,.48,.07,0x283b40);box(.7,1.7,-5.5,.62,.34,.02,0x72a39c);box(.7,1.45,-5.3,.7,.04,.3,0x36484a);
 box(1.6,1.7,-5.4,.06,.6,.06,0xb29a62);box(1.6,2,-5.4,.45,.16,.4,0xe2bd77);
 // Floor inspection placard is non-solid so the interaction point stays reachable.
 box(0,.025,1,1.1,.04,1.1,0x2d786d);box(0,.05,1,.75,.02,.75,0xd9cc9b);
 if(theme==='warehouse'||theme==='garage'){
  for(const x of [-4,4])for(let i=0;i<3;i++){
   box(x-.6+i*.55,1.85,-2,.4,.45,.6,[0xb99b6b,0x61796d,0xa07856][i]!);
   box(x,1.65,2,1.5,.06,.12,0x3a3027);
  }
  for(let i=0;i<6;i++)box(6.7,1.6,-3+i*.45,.12,.7,.18,0xa6b2ad);
 }else if(theme==='antique'){
  for(const x of [-5,5])for(let z=-3;z<4;z+=2)for(let i=0;i<4;i++)box(x-.45+i*.28,1.3,z,.18,.6,.45,[0x6f3440,0xb6a47b,0x3c6169,0x92744a][i]!);
 }else if(theme==='club'){
  for(let i=0;i<7;i++){box(4,1.55,-.5+i*.4,.22,.3,.2,[0x3f8b73,0xbc9966,0x724b81][i%3]!);}
  for(const x of [-5.7,5.7]){box(x,2.8,-5,.9,1.2,.5,0x22272d);box(x,2.8,-4.72,.6,.7,.02,0x4a4b52);}
 }else if(theme==='casino'){
  for(const x of [-4,4])for(const z of [-1,3])for(let i=0;i<3;i++){box(x-.6+i*.5,1.5,z,.18,.08,.18,0xd8b863);box(x,1.48,z+.35,.6,.02,.25,0xe5ddba);}
 }else{
  for(const x of [-4,4])for(const z of [-1,3]){box(x,1.34,z,.9,.03,.65,0xcdbb8d);box(x-.2,1.47,z,.15,.22,.15,0xf1dfb7);box(x+.25,1.47,z,.15,.22,.15,0xf1dfb7);}
  box(-5,1,-6.6,2.5,2,1,0x3b514d,true);box(-5,1,-6.02,2.2,1.7,.06,0x8da49a);
 }
}
