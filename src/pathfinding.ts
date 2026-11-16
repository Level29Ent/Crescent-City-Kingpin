export type Point={x:number;z:number};
export class MinHeap<T>{
 private heap:{value:T;score:number}[]=[];
 get size(){return this.heap.length;}
 push(value:T,score:number){const h=this.heap;h.push({value,score});let i=h.length-1;while(i>0){const p=(i-1)>>1;if(h[p]!.score<=score)break;[h[i],h[p]]=[h[p]!,h[i]!];i=p;}}
 pop(){const h=this.heap,first=h[0];if(!first)return undefined;const end=h.pop()!;if(h.length){h[0]=end;let i=0;while(true){let c=i*2+1;if(c>=h.length)break;if(c+1<h.length&&h[c+1]!.score<h[c]!.score)c++;if(h[i]!.score<=h[c]!.score)break;[h[i],h[c]]=[h[c]!,h[i]!];i=c;}}return first.value;}
}
export function clearSegment(a:Point,b:Point,clear:(x:number,z:number)=>boolean,spacing=.25){const n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/spacing));for(let i=0;i<=n;i++)if(!clear(a.x+(b.x-a.x)*i/n,a.z+(b.z-a.z)*i/n))return false;return true;}
/** Bounded A*, sampled edges prevent diagonal corner-cutting and thin-wall tunnelling. */
export function createNavigator(clear:(x:number,z:number)=>boolean,step=2,min=-238,max=238){
 const width=Math.floor((max-min)/step)+1,key=(x:number,z:number)=>z*width+x;
 const point=(k:number):Point=>({x:min+(k%width)*step,z:min+Math.floor(k/width)*step});
 const nearest=(p:Point)=>{
  const cx=Math.round((p.x-min)/step),cz=Math.round((p.z-min)/step);let best=-1,distance=Infinity;
  for(let r=0;r<=3;r++)for(let dz=-r;dz<=r;dz++)for(let dx=-r;dx<=r;dx++){
   if(r&&Math.abs(dx)!==r&&Math.abs(dz)!==r)continue;const x=cx+dx,z=cz+dz;if(x<0||z<0||x>=width||z>=width)continue;
   const k=key(x,z),q=point(k),d=Math.hypot(p.x-q.x,p.z-q.z);if(d<distance&&clearSegment(p,q,clear)){best=k;distance=d;}
  }return best;
 };
 return {route(from:Point,to:Point,limit=3500):Point[]{
  if(!clear(from.x,from.z)||!clear(to.x,to.z))return [];
  if(clearSegment(from,to,clear))return [{...to}];
  const start=nearest(from),goal=nearest(to);if(start<0||goal<0)return [];
  const open=new MinHeap<number>(),cost=new Map<number,number>([[start,0]]),parent=new Map<number,number>(),closed=new Set<number>();open.push(start,0);
  let visited=0;
  while(open.size&&visited++<limit){const k=open.pop()!;if(closed.has(k))continue;if(k===goal){const path:Point[]=[{...to}];let n=k;while(n!==start){path.push(point(n));n=parent.get(n)!;}path.push(point(start));path.reverse();return path;}
   closed.add(k);const p=point(k),x=k%width,z=Math.floor(k/width);
   for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){
    const nx=x+dx!,nz=z+dz!;if(nx<0||nz<0||nx>=width||nz>=width)continue;const next=key(nx,nz);if(closed.has(next))continue;
    const q=point(next);if(!clearSegment(p,q,clear))continue;
    const score=cost.get(k)!+Math.hypot(dx!,dz!);if(score>=(cost.get(next)??Infinity))continue;
    cost.set(next,score);parent.set(next,k);open.push(next,score+Math.hypot(q.x-to.x,q.z-to.z)/step);
   }
  }return [];
 }};
}
