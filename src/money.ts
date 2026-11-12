import * as THREE from 'three';
// Original fictional game currency: engraved-looking linework, not a scanned real banknote.
let resources: { box: THREE.BoxGeometry; note: THREE.MeshStandardMaterial; paper: THREE.MeshStandardMaterial; band: THREE.MeshStandardMaterial; ink: THREE.MeshStandardMaterial; face: THREE.PlaneGeometry; texture?: THREE.CanvasTexture } | undefined;
export function banknoteCanvas(): HTMLCanvasElement {
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=432;
  const g=canvas.getContext('2d')!;
  g.fillStyle='#dddcc0';g.fillRect(0,0,1024,432);
  // Deterministic cotton-paper grain and interlocking guilloche lines.
  for(let i=0;i<6000;i++){g.fillStyle=i%2?'#62754c15':'#ffffff35';g.fillRect((i*137.71)%1024,(i*51.37)%432,1.7,1);}
  g.strokeStyle='#435d46';
  for(let k=0;k<8;k++){g.lineWidth=k%2?1:2;g.strokeRect(15+k*4,15+k*4,994-k*8,402-k*8);}
  g.strokeStyle='#62775b';g.lineWidth=.8;
  for(let r=0;r<16;r++){
    g.beginPath();
    for(let x=48;x<977;x+=2){const y=53+r*21+Math.sin(x*.095+r)*5+Math.cos(x*.033)*3;x===48?g.moveTo(x,y):g.lineTo(x,y);}g.stroke();
  }
  for(const x of [124,900])for(let r=24;r<67;r+=3){g.beginPath();for(let a=0;a<Math.PI*2+.1;a+=.03){const radius=r+Math.cos(a*14)*3;const px=x+Math.cos(a)*radius,py=216+Math.sin(a)*radius;a===0?g.moveTo(px,py):g.lineTo(px,py);}g.stroke();}
  g.fillStyle='#24432f';g.textAlign='center';g.font='bold 34px Georgia, serif';g.fillText('CRESCENT CITY RESERVE',512,77);
  g.font='16px Georgia, serif';g.fillText('NEW ORLEANS  •  LOUISIANA',512,105);
  g.save();g.translate(512,221);g.scale(1,.85);g.fillStyle='#ccd0ae';g.beginPath();g.ellipse(0,0,141,113,0,0,Math.PI*2);g.fill();
  for(let r=95;r<116;r+=3){g.beginPath();g.ellipse(0,0,r*1.22,r,0,0,Math.PI*2);g.stroke();}
  // Cathedral / fleur-de-lis vignette instead of a real currency portrait.
  g.fillStyle='#3c5d43';g.fillRect(-62,-21,124,79);g.beginPath();g.moveTo(-75,-21);g.lineTo(0,-70);g.lineTo(75,-21);g.closePath();g.fill();
  for(const x of [-51,0,51]){g.fillRect(x-10,-70,20,95);g.beginPath();g.moveTo(x-17,-70);g.lineTo(x,-112);g.lineTo(x+17,-70);g.closePath();g.fill();}
  g.fillStyle='#cbd0af';for(const x of [-40,0,40])g.fillRect(x-6,4,12,36);g.restore();
  g.fillStyle='#24432f';g.font='bold 65px Georgia, serif';g.fillText('20',124,235);g.fillText('20',900,235);
  g.font='bold 22px Georgia, serif';g.fillText('TWENTY CRESCENTS',512,365);
  g.font='14px monospace';g.fillText('CC 00290020 A',272,305);g.fillText('SERIES 2026',775,305);
  g.font='bold 13px sans-serif';g.fillText('GAME PROP • NOT LEGAL TENDER',512,394);
  g.font='italic 17px Georgia, serif';g.fillText('Crescent Reserve',790,336);
  return canvas;
}
function shared() {
  if(resources)return resources;
  const texture=typeof document==='undefined'?undefined:new THREE.CanvasTexture(banknoteCanvas());
  if(texture){texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;}
  resources={box:new THREE.BoxGeometry(1,1,1),face:new THREE.PlaneGeometry(1.44,.61),texture,
    note:new THREE.MeshStandardMaterial({map:texture??null,color:texture?0xffffff:0x9fac7d,roughness:.96}),
    paper:new THREE.MeshStandardMaterial({color:0xc9c8ab,roughness:1}),band:new THREE.MeshStandardMaterial({color:0xc9a0b3,roughness:.9}),ink:new THREE.MeshStandardMaterial({color:0x536448,roughness:1})};
  return resources;
}
export function createMoneyBundle(): THREE.Group {
  const r=shared(),root=new THREE.Group();root.name='Cash stash — four $20 game notes';
  // Four visibly separate notes in two offset stacks; denomination matches the $80 reward.
  for(let i=0;i<4;i++){
    const stack=new THREE.Group();stack.position.set((i%2)*.08-.04,.018+i*.022,0);stack.rotation.y=(i%2?1:-1)*.04;root.add(stack);
    const paper=new THREE.Mesh(r.box,r.paper);paper.scale.set(1.44,.018,.61);paper.castShadow=true;stack.add(paper);
    const face=new THREE.Mesh(r.face,r.note);face.rotation.x=-Math.PI/2;face.position.y=.0095;stack.add(face);
  }
  return root;
}
export function createMoneyStack(): THREE.Group {
  const r=shared(),root=new THREE.Group();root.name='Banded banknote display';
  for(let i=0;i<3;i++){
    const stack=new THREE.Group();stack.position.set((i-1)*.42,i*.13,(i%2)*.25);stack.rotation.y=(i-1)*.13;root.add(stack);
    const paper=new THREE.Mesh(r.box,r.paper);paper.scale.set(1.44,.18,.61);paper.position.y=.09;stack.add(paper);
    for(let j=0;j<7;j++){const edge=new THREE.Mesh(r.box,r.ink);edge.scale.set(1.442,.0015,.612);edge.position.y=.015+j*.022;stack.add(edge);}
    const note=new THREE.Mesh(r.face,r.note);note.rotation.x=-Math.PI/2;note.position.y=.181;stack.add(note);
    const band=new THREE.Mesh(r.box,r.band);band.scale.set(.19,.185,.62);band.position.set(.22,.092,0);stack.add(band);
  }
  return root;
}
