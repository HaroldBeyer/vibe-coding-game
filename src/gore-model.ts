import { config as C } from './config.ts';
import { wallDistance, type Point } from './world.ts';

export type Stain = Point & {radius:number;color:number;stretch:number};
export type Remain = Point & {angle:number;color:number;kind:'torso'|'arm'|'leg'|'head';human:boolean};
export type Droplet = Remain & {vx:number;vy:number;height:number;vz:number;life:number;size:number;blood:boolean};
export function cappedPush<T>(list:T[],item:T,limit:number) {if(limit<=0)return;list.push(item);if(list.length>limit)list.splice(0,list.length-limit);}
/** Particles have no Arcade bodies: bounded cosmetic data, never gameplay obstacles. */
export class GoreField {
    stains:Stain[]=[];corpses:Remain[]=[];remains:Remain[]=[];particles:Droplet[]=[];
    dirty=true;
    constructor(privateRandom:()=>number=Math.random) {this.random=privateRandom;}
    private random:()=>number;
    private range(min:number,max:number) {return min+this.random()*(max-min);}
    private addStain(origin:Point,angle:number,distance:number,radius:number,human:boolean) {
        const target={x:origin.x+Math.cos(angle)*distance,y:origin.y+Math.sin(angle)*distance};
        const reach=Math.min(distance,Math.max(0,wallDistance(origin,target)-1));
        cappedPush(this.stains,{x:origin.x+Math.cos(angle)*reach,y:origin.y+Math.sin(angle)*reach,radius,color:human?0x8b2028:0x64232a,stretch:this.range(.45,.85)},C.gore.maxStains);this.dirty=true;
    }
    impact(point:Point,angle:number,strength=1,human=false) {
        if(!C.gore.enabled)return;
        for(let i=0;i<Math.ceil(2*strength);i++)this.addStain(point,angle+this.range(-1.2,1.2),this.range(0,18*strength),this.range(2,4+strength),human);
        for(let i=0;i<Math.ceil(C.gore.particlesPerHit*strength);i++) {
            const a=angle+this.range(-1.05,1.05),speed=this.range(28,110)*Math.sqrt(strength);
            cappedPush(this.particles,{x:point.x,y:point.y,angle:a,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,height:this.range(3,10),vz:this.range(35,90),life:this.range(.35,.8),size:this.range(1,2.7),color:human?0xd23d3d:0x982d37,kind:'arm',human,blood:true},C.gore.maxParticles);
        }
    }
    death(point:Point,angle:number,color:number,human:boolean,critical=false) {
        if(!C.gore.enabled)return;
        this.impact(point,angle,human?2.8:critical?2.4:1.8,human);
        this.addStain(point,angle,0,human?15:12,human);
        cappedPush(this.corpses,{x:point.x,y:point.y,angle,color,kind:'torso',human},C.gore.maxCorpses);
        const kinds:Remain['kind'][]=human?['arm','leg','head']:critical?['head','arm']:['leg'];
        kinds.forEach((kind,index)=>{
            const a=angle+(index-1)*1.35+this.range(-.5,.5),speed=this.range(55,115);
            cappedPush(this.particles,{x:point.x,y:point.y,angle:a,color,kind,human,blood:false,size:3,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,height:6,vz:this.range(65,115),life:1.7},C.gore.maxParticles);
        });
        this.dirty=true;
    }
    step(dt:number) {
        const keep:Droplet[]=[];
        for(const p of this.particles) {
            const to={x:p.x+p.vx*dt,y:p.y+p.vy*dt},distance=Math.hypot(to.x-p.x,to.y-p.y);
            if(distance>0&&wallDistance(p,to)<distance-.1) {p.vx=0;p.vy=0;}
            p.x+=p.vx*dt;p.y+=p.vy*dt;p.height+=p.vz*dt;p.vz-=C.gore.gravity*dt;
            p.angle+=p.blood?0:dt*5;p.life-=dt;
            if(p.height<=0||p.life<=0) {
                if(p.blood)this.addStain(p,p.angle,0,Math.max(1,p.size),p.human);
                else {cappedPush(this.remains,{x:p.x,y:p.y,angle:p.angle,color:p.color,kind:p.kind,human:p.human},C.gore.maxRemains);this.dirty=true;}
            } else keep.push(p);
        }
        this.particles=keep;
    }
}
