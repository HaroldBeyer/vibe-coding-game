import { config as C } from './config.ts';
import { doorCenter, insideBuilding, visible, interiors, doors, spawnPoint, blocked, WORLD_W, WORLD_H, CELL, type Point, type Door } from './world.ts';
import { humanSees } from './lighting.ts';
import type { NpcRole } from './npc.ts';

export function squadGroups(ids: readonly number[], links: readonly (readonly [number,number])[], maximum = C.tactics.squadMaxMembers) {
    if(!Number.isInteger(maximum)||maximum<1)throw new Error('config: esquadrão deve ter ao menos um membro.');
    const parent=new Map(ids.map(id=>[id,id]));
    const sizes=new Map(ids.map(id=>[id,1]));
    const root=(id:number):number=>parent.get(id)===id?id:root(parent.get(id)!);
    for(const [a,b] of links) if(parent.has(a)&&parent.has(b)) {
        const ra=root(a),rb=root(b);
        if(ra===rb||sizes.get(ra)!+sizes.get(rb)!>maximum)continue;
        const leader=Math.min(ra,rb);parent.set(Math.max(ra,rb),leader);sizes.set(leader,sizes.get(ra)!+sizes.get(rb)!);
    }
    return new Map(ids.map(id=>[id,root(id)]));
}
/** Considers nearby entrances the human can perceive, not unknown zombies behind walls. */
export function chooseShelter(from:Point, threat:Point|undefined, knownInfected: readonly Point[], knownBase?:Door,hasSpace:(door:Door)=>boolean=()=>true):Door | undefined {
    const current=insideBuilding(from);
    return doors.filter(door=>{
        const room=interiors.find(b=>b.id===door.id)!;
        if(door.health<=0 || (!door.open && current!==room && door!==knownBase))return false;
        if(current!==room&&!hasSpace(door))return false;
        if(knownInfected.some(z=>insideBuilding(z)===room))return false;
        if(current===room)return true;
        const entrance=doorCenter(door);
        if(door===knownBase)return !threat||Math.hypot(threat.x-entrance.x,threat.y-entrance.y)>C.tactics.shelterDangerRadius;
        return Math.hypot(from.x-entrance.x,from.y-entrance.y)<=C.tactics.shelterSearchRadius &&
            humanSees(from,entrance,C.tactics.shelterSearchRadius) &&
            (!threat||Math.hypot(threat.x-entrance.x,threat.y-entrance.y)>C.tactics.shelterDangerRadius);
    }).sort((a,b)=>{
        const score=(d:Door)=>insideBuilding(from)?.id===d.id?-10000:d===knownBase?-5000:Math.hypot(from.x-doorCenter(d).x,from.y-doorCenter(d).y)-(threat?Math.min(200,Math.hypot(threat.x-doorCenter(d).x,threat.y-doorCenter(d).y))*.25:0);
        return score(a)-score(b);
    })[0];
}
export function shelterIntact(door:Door) {return door.health>0;}
export function canCloseFromInside(position:Point,door:Door) {
    return insideBuilding(position)?.id===door.id && position.y>=door.y+door.h+22 && visible(position,doorCenter(door),C.doors.interactionRadius,true);
}
export function shelterEntryPoint(door:Door):Point {return {x:doorCenter(door).x,y:door.y+door.h+42};}
export function escortArrived(door:Door,people:readonly Point[]) {
    return people.length>0&&people.every(p=>insideBuilding(p)?.id===door.id&&p.y>=door.y+door.h+22);
}
/** Cover either side of the entrance without standing in its central aisle. */
export function escortCoverPoint(door:Door,slot:number):Point {
    const side=slot%2===0?-1:1,row=Math.floor(slot/2),center=doorCenter(door);
    return {x:center.x+side*(door.w/2+24+row*20),y:door.y-35-row*20};
}
export function shouldLeaveShelter(settled:boolean,now:number,holdUntil:number,threat:boolean) {
    return !settled&&now>holdUntil&&!threat;
}
export function canBecomeShelterResident(role:NpcRole) {return role==='civilian';}
export function followerLimit(role:NpcRole) {return role==='soldier'?C.tactics.squadMaxMembers:role==='medic'?C.tactics.medicsPerGroup:C.tactics.escortCivilianLimit;}
export function canJoinFollowers(role:NpcRole,current:number) {return current<followerLimit(role);}
export type CompanionCandidate = {id:number;group:number;distance:number;preferred:boolean};
/** One owner per companion and fixed slots per group, including existing convoy/player reservations. */
export function assignCompanions(candidates:readonly CompanionCandidate[],limit:number,reserved:ReadonlyMap<number,number>=new Map()) {
    const assigned=new Map(reserved),counts=new Map<number,number>();
    for(const group of reserved.values())counts.set(group,(counts.get(group)??0)+1);
    for(const candidate of [...candidates].sort((a,b)=>Number(b.preferred)-Number(a.preferred)||a.distance-b.distance||a.id-b.id||a.group-b.group)) {
        if(assigned.has(candidate.id)||(counts.get(candidate.group)??0)>=limit)continue;
        assigned.set(candidate.id,candidate.group);counts.set(candidate.group,(counts.get(candidate.group)??0)+1);
    }
    return assigned;
}
export function remainingShelterPlaces(occupancy:number) {return Math.max(0,C.tactics.shelterCapacity-occupancy);}
export type FollowMemory = {point:Point;until:number};
export function observeFollowLeader(previous:FollowMemory|undefined,observed:Point|undefined,now:number):FollowMemory|undefined {
    return observed?{point:{x:observed.x,y:observed.y},until:now+C.tactics.playerFollowMemory}:previous;
}
export function rescueSearchGoal(from:Point,random:()=>number=Math.random):Point {
    const suitable=(p:Point)=>!insideBuilding(p)&&Math.hypot(p.x-from.x,p.y-from.y)>=C.tactics.rescueSearchMinDistance;
    for(let i=0;i<40;i++) {const p=spawnPoint(undefined,0,random);if(suitable(p))return p;}
    const candidates:Point[]=[];
    for(let y=CELL/2;y<WORLD_H;y+=CELL)for(let x=CELL/2;x<WORLD_W;x+=CELL) {const p={x,y};if(!blocked(p,26)&&suitable(p))candidates.push(p);}
    return candidates.length?candidates[Math.min(candidates.length-1,Math.floor(random()*candidates.length))]:from;
}
