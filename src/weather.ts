import * as THREE from 'three';
import { conditions } from './expansion.ts';
export function createWeather(scene:THREE.Scene) {
  const count=1000,positions=new Float32Array(count*6);
  for(let i=0;i<count;i++){const x=(i*17.371%70)-35,z=(i*23.813%70)-35,y=i*.37%30;positions.set([x,y,z,x+.12,y-1.1,z],i*6);}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(positions,3));
  const mat=new THREE.LineBasicMaterial({color:0xa9cbde,transparent:true,opacity:.35,depthWrite:false});
  const rain=new THREE.LineSegments(geo,mat);rain.frustumCulled=false;scene.add(rain);
  const hot=new THREE.Color(0xe7ba91);
  return {update(time:number,dt:number,x:number,z:number){
    const state=conditions(time);rain.visible=state.weather==='Rainstorm';rain.position.set(x,0,z);
    if(rain.visible){for(let i=0;i<count;i++){positions[i*6+1]!-=dt*22;if(positions[i*6+1]!<0)positions[i*6+1]=30;positions[i*6+4]=positions[i*6+1]!-1.1;}geo.attributes.position!.needsUpdate=true;}
    const fog=scene.fog as THREE.Fog;
    if(fog){fog.near=state.weather==='Fog'?12:state.weather==='Rainstorm'?40:120;fog.far=state.weather==='Fog'?115:state.weather==='Rainstorm'?320:700;if(state.weather==='Heatwave')fog.color.lerp(hot,.25);}
    return state;
  },dispose(){rain.removeFromParent();geo.dispose();mat.dispose();}};
}
