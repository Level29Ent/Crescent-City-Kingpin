import * as THREE from 'three';
export function cabinProfile(style:number){const heavy=[4,8,9].includes(style),sport=[2,7,11].includes(style),utility=[5,12,13].includes(style);return {dash:heavy?0x465562:sport?0x3a2630:utility?0x554634:0x263d48,trim:heavy?0xa6b3ac:sport?0xd59755:0xc6ac78,wheel:sport?.25:.29,seats:heavy?0x3e4d57:utility?0x9c7651:0x5e4c53};}
/** Local low-poly cabin furniture, functional steering/gauge needles, and hinged door panels. */
export function addVehicleCabin(root:THREE.Group,style:number,w:number,cabZ:number,h0:number,ch:number,cabH:number){
 const group=new THREE.Group();group.name='vehicle-cabin';root.add(group);const p=cabinProfile(style),resources:{dispose():void}[]=[];
 const boxGeometry=new THREE.BoxGeometry(1,1,1);resources.push(boxGeometry);
 const material=(color:number)=>{const m=new THREE.MeshStandardMaterial({color,roughness:.65});resources.push(m);return m;};
 const dash=material(p.dash),trim=material(p.trim),seats=material(p.seats),dark=material(0x13212a),light=material(0xbde6dd);
 const box=(x:number,y:number,z:number,sx:number,sy:number,sz:number,mat:THREE.Material,parent:THREE.Object3D=group)=>{const m=new THREE.Mesh(boxGeometry,mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);parent.add(m);return m;};
 const floor=h0+ch,front=cabZ+(style===8?1.5:style===9?2.45:style===1||style===13?1.15:style===2||style===11?.95:style===5||style===12?1.5:1.15),dashY=floor+cabH*.28;
 box(0,dashY,front-.12,w-.3,.2,.25,dash).name='dashboard';box(0,floor+.12,cabZ+.2,.18,.22,.7,trim);
 for(const side of [-1,1]){box(side*.45,floor+.07,cabZ,.6,.12,.6,seats).name='seat-cushion';box(side*.45,floor+.33,cabZ-.31,.6,.55,.12,seats);box(side*.45,floor+.66,cabZ-.31,.32,.15,.12,seats);}
 const wheel=new THREE.Group();wheel.position.set(-.45,dashY+.08,front-.36);wheel.name='steering-wheel';group.add(wheel);
 const wheelGeo=new THREE.TorusGeometry(p.wheel,.035,5,16);resources.push(wheelGeo);const ring=new THREE.Mesh(wheelGeo,dark);wheel.add(ring);for(const angle of [0,Math.PI*.66,Math.PI*1.33]){const spoke=box(0,0,0,.035,p.wheel*1.8,.03,trim,wheel);spoke.rotation.z=angle;}
 const needle=new THREE.Group();needle.position.set(-.45,dashY+.18,front-.255);needle.name='speedometer-needle';group.add(needle);box(0,.06,0,.018,.13,.018,light,needle);
 for(const x of [-.12,.12])box(x,dashY+.08,front-.26,.13,.05,.015,dark);
 const doors:{hinge:THREE.Group;side:number;amount:number;hold:number}[]=[];
 for(const side of [-1,1]){const hinge=new THREE.Group();hinge.position.set(side*(w/2+.025),floor+.15,cabZ+.7);group.add(hinge);hinge.name=side<0?'driver-door':'passenger-door';
  box(0,0,-.55,.06,.32,1.1,dash,hinge);box(-side*.04,.1,-.5,.08,.05,.25,trim,hinge);doors.push({hinge,side,amount:0,hold:0});}
 return {detail(visible:boolean){group.visible=visible;},cockpit:new THREE.Vector3(-.45,floor+Math.min(cabH-.12,.72),cabZ+.18),openDoor(side:'driver'|'passenger'){doors[side==='driver'?0:1]!.hold=1.2;},update(speed:number,steer:number,dt:number){wheel.rotation.z=-steer*.85;needle.rotation.z=.9-Math.min(1,Math.abs(speed)/45)*2.2;for(const d of doors){d.hold=Math.max(0,d.hold-dt);d.amount+=(Number(d.hold>0)-d.amount)*(1-Math.exp(-8*dt));d.hinge.rotation.y=d.side*d.amount*1.1;}},dispose(){group.removeFromParent();resources.forEach(r=>r.dispose());}};
}
