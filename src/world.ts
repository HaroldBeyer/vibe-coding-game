import { config as C } from './config.ts';
export const WORLD_W = C.world.width, WORLD_H = C.world.height, CELL = C.world.navigationCell;
export type Point = {
    x: number;
    y: number;
};
export type Rect = Point & {w:number;h:number};
export type Building = Rect & {id:number;enterable:boolean};
export type Door = Rect & {id:number;health:number;open:boolean};
export type Furnishing = Rect & {kind:'shelf'|'counter'|'table'|'bed'};
export const buildings: Building[] = [];
for (let y = 120; y < WORLD_H - 200; y += C.world.blockSpacingY)
    for (let column=0,x = 120; x < WORLD_W - 200; x += C.world.blockSpacingX,column++) {
        buildings.push({ id:buildings.length,x,y,w:120,h:240,enterable:false });
        buildings.push({ id:buildings.length,x:x+180,y,w:180,h:240,enterable:column%C.interiors.everyBlocks===0 });
    }
export const interiors = buildings.filter(b=>b.enterable);
export function interiorKind(b: Building) { return b.id%10===1?'shop':b.id%10===5?'pub':'clinic'; }
export const doors: Door[] = interiors.map(b=>({id:b.id,x:b.x+b.w/2-C.interiors.doorwayWidth/2,y:b.y,w:C.interiors.doorwayWidth,h:C.interiors.wallThickness,health:C.doors.health,open:true}));
export function furniture(b: Building): Furnishing[] {
    return [
        {x:b.x+18,y:b.y+36,w:34,h:62,kind:'shelf'},
        {x:b.x+b.w-52,y:b.y+36,w:34,h:62,kind:'counter'},
        {x:b.x+22,y:b.y+157,w:40,h:35,kind:'table'},
        {x:b.x+b.w-62,y:b.y+157,w:40,h:35,kind:interiorKind(b)==='clinic'?'bed':'table'},
    ];
}
export const mazeDistricts: Rect[] = C.world.mazeDistrictsEnabled ? [
    {x:540,y:780,w:480,h:180}, {x:1500,y:1200,w:480,h:180},
].filter(r=>r.x+r.w<WORLD_W && r.y+r.h<WORLD_H) : [];
/** Alternating chicanes and a dead-end pocket, with a continuous route at each end. */
export const mazeWalls: Rect[] = mazeDistricts.flatMap(r=>[
    {x:r.x,y:r.y,w:r.w,h:10}, {x:r.x,y:r.y+r.h-10,w:r.w,h:10},
    {x:r.x+120,y:r.y+10,w:12,h:110}, {x:r.x+300,y:r.y+60,w:12,h:110},
    {x:r.x+300,y:r.y+120,w:120,h:12},
]);
export const structuralWalls: Rect[] = [...buildings.flatMap(b=>{
    if (!b.enterable) return [b];
    const t=C.interiors.wallThickness,d=doors.find(d=>d.id===b.id)!,side=(b.w-d.w)/2;
    return [ {x:b.x,y:b.y,w:side,h:t},{x:d.x+d.w,y:b.y,w:side,h:t},
        {x:b.x,y:b.y+t,w:t,h:b.h-t},{x:b.x+b.w-t,y:b.y+t,w:t,h:b.h-t},
        {x:b.x+t,y:b.y+b.h-t,w:b.w-t*2,h:t} ];
}),...mazeWalls];
export const collisionRects: Rect[] = [...structuralWalls,...interiors.flatMap(furniture)];
const closedDoors = () => doors.filter(d=>!d.open && d.health>0);
export function doorCenter(d: Door): Point { return {x:d.x+d.w/2,y:d.y+d.h/2}; }
export function insideBuilding(p: Point) { return interiors.find(b=>p.x>b.x && p.x<b.x+b.w && p.y>b.y && p.y<b.y+b.h); }
export function resetDoors() { for (const d of doors) {d.open=true;d.health=C.doors.health;} }
export function toggleDoor(d: Door, occupants: readonly Point[]) {
    if (d.health<=0) return false;
    if (d.open && occupants.some(p=>p.x>d.x-11&&p.x<d.x+d.w+11&&p.y>d.y-11&&p.y<d.y+d.h+11)) return false;
    d.open=!d.open; return true;
}
export function hitDoor(d: Door, mutant = false) {
    if (d.open || d.health<=0) return {hit:false,broken:false};
    d.health=Math.max(0,d.health-(mutant?C.doors.mutantDamage:C.doors.attackDamage));
    const broken=d.health===0; if(broken)d.open=true;
    return {hit:true,broken};
}
export function blocked(p: Point, margin = 14, ignoreDoors = false) {
    return p.x < margin || p.y < margin || p.x > WORLD_W - margin || p.y > WORLD_H - margin ||
        [...collisionRects,...(ignoreDoors?[]:closedDoors())].some(b=>p.x>b.x-margin&&p.x<b.x+b.w+margin&&p.y>b.y-margin&&p.y<b.y+b.h+margin);
}
for (const p of [C.player.spawn, ...(C.ammo.boxes > 0 ? [C.ammo.firstBox] : []), ...C.civilian.initialPositions.slice(0, C.population.civilians)]) {
    if (blocked(p)) throw new Error('config: um ponto inicial está fora do mapa ou dentro de um prédio. Ajuste player.spawn, ammo.firstBox ou civilian.initialPositions.');
}
export function spawnPoint(avoid?: Point, safeRadius = 0, random = Math.random): Point {
    const valid = (p: Point) => !blocked(p, 26) && (!avoid || Math.hypot(p.x - avoid.x, p.y - avoid.y) >= safeRadius);
    for (let i = 0; i < 500; i++) {
        const p = { x: 45 + random() * (WORLD_W - 90), y: 45 + random() * (WORLD_H - 90) };
        if (valid(p)) return p;
    }
    const candidates: Point[] = [];
    for (let y = CELL / 2; y < WORLD_H; y += CELL) for (let x = CELL / 2; x < WORLD_W; x += CELL) {
        if (valid({ x, y })) candidates.push({ x, y });
    }
    if (!candidates.length) throw new Error('config: não há espaço livre para spawn com o mapa e o raio de segurança definidos.');
    return candidates[Math.min(candidates.length - 1, Math.floor(random() * candidates.length))];
}
export function roamDestination(from: Point, random = Math.random) {
    for (let i = 0; i < 40; i++) {
        const angle = random() * Math.PI * 2;
        const radius = C.civilian.roamMinDistance + random() * (C.civilian.roamMaxDistance - C.civilian.roamMinDistance);
        const goal = {
            x: Math.floor((from.x + Math.cos(angle) * radius) / CELL) * CELL + CELL / 2,
            y: Math.floor((from.y + Math.sin(angle) * radius) / CELL) * CELL + CELL / 2,
        };
        if (!blocked(goal, 26)) return { goal, route: navigation(goal) };
    }
    const goal = spawnPoint(undefined, 0, random);
    return { goal, route: navigation(goal) };
}
function rayDistance(from: Point, to: Point, obstacles: readonly Rect[], margin = 0) {
    let nearest = 1;
    const dx = to.x - from.x, dy = to.y - from.y;
    for (const b of obstacles) {
        let lo = 0, hi = 1;
        for (const [v, d, min, max] of [[from.x, dx, b.x-margin, b.x + b.w+margin], [from.y, dy, b.y-margin, b.y + b.h+margin]]) {
            if (Math.abs(d) < .00001) {
                if (v < min || v > max) {
                    hi = -1;
                    break;
                }
            }
            else {
                const a = (min - v) / d, c = (max - v) / d;
                lo = Math.max(lo, Math.min(a, c));
                hi = Math.min(hi, Math.max(a, c));
            }
        }
        if (hi >= lo && hi >= 0)
            nearest = Math.min(nearest, lo);
    }
    return nearest * Math.hypot(dx, dy);
}
export function wallDistance(from: Point,to: Point,ignoreDoors = false) { return rayDistance(from,to,ignoreDoors?structuralWalls:[...structuralWalls,...closedDoors()]); }
export function visible(a: Point, b: Point, radius: number,ignoreDoors = false) { const d = Math.hypot(a.x - b.x, a.y - b.y); return d <= radius && wallDistance(a, b,ignoreDoors) >= d - .1; }
export function bulletHit(origin: Point, angle: number, target: Point, radius = C.pistol.hitRadius) {
    const dx = target.x - origin.x, dy = target.y - origin.y;
    const along = dx * Math.cos(angle) + dy * Math.sin(angle), across = Math.abs(-dx * Math.sin(angle) + dy * Math.cos(angle));
    if (along < 0 || across >= radius)
        return Infinity;
    return Math.max(0, along - Math.sqrt(radius * radius - across * across));
}
// Static wall/furniture crossings are computed once. Door updates only mask a few edges.
type NavGraph = { edges:Int32Array; fields:Map<number,Int16Array> };
const navCols=WORLD_W/CELL, navRows=WORLD_H/CELL, navCount=navCols*navRows;
const cellPoint=(id:number):Point=>({x:id%navCols*CELL+CELL/2,y:Math.floor(id/navCols)*CELL+CELL/2});
let baseGraph: NavGraph | undefined, currentGraph: NavGraph | undefined, currentDoorKey='';
const doorMasks = new Map<Door,{nodes:number[];edges:number[]}>();
function navigationGraph(ignoreDoors:boolean):NavGraph {
    if(!baseGraph) {
        const edges=new Int32Array(navCount*4).fill(-1), free=new Uint8Array(navCount);
        for(let id=0;id<navCount;id++)free[id]=Number(!blocked(cellPoint(id),14,true));
        for(let id=0;id<navCount;id++) {
            if(!free[id])continue;
            const x=id%navCols,y=Math.floor(id/navCols), neighbors=[x>0?id-1:-1,y>0?id-navCols:-1,x<navCols-1?id+1:-1,y<navRows-1?id+navCols:-1];
            neighbors.forEach((next,side)=>{if(next>=0&&free[next]&&rayDistance(cellPoint(id),cellPoint(next),collisionRects,9)>=CELL-.1) edges[id*4+side]=next;});
        }
        baseGraph={edges,fields:new Map()};
        for(const door of doors) {
            const mask={nodes:[] as number[],edges:[] as number[]};
            for(let id=0;id<navCount;id++) {
                const p=cellPoint(id);
                if(p.x>door.x-14&&p.x<door.x+door.w+14&&p.y>door.y-14&&p.y<door.y+door.h+14)mask.nodes.push(id);
                for(let side=0;side<4;side++) {const edge=id*4+side,next=edges[edge];if(next>=0&&rayDistance(p,cellPoint(next),[door],9)<CELL-.1)mask.edges.push(edge);}
            }
            doorMasks.set(door,mask);
        }
    }
    if(ignoreDoors)return baseGraph;
    const closed=closedDoors(),key=closed.map(d=>d.id).join(',');
    if(!key)return baseGraph;
    if(currentGraph&&currentDoorKey===key)return currentGraph;
    const edges=baseGraph.edges.slice(),disabled=new Set<number>();
    for(const door of closed) {
        const mask=doorMasks.get(door)!; for(const node of mask.nodes)disabled.add(node);
        for(const edge of mask.edges)edges[edge]=-1;
    }
    if(disabled.size) for(let edge=0;edge<edges.length;edge++)if(disabled.has(Math.floor(edge/4))||disabled.has(edges[edge]))edges[edge]=-1;
    currentDoorKey=key; currentGraph={edges,fields:new Map()};return currentGraph;
}
function distanceField(graph:NavGraph,start:number) {
    const cached=graph.fields.get(start);if(cached)return cached;
    const distances=new Int16Array(navCount).fill(-1),queue=new Int32Array(navCount);
    let head=0,tail=0;distances[start]=0;queue[tail++]=start;
    while(head<tail) {
        const id=queue[head++];
        for(let side=0;side<4;side++) {
            const next=graph.edges[id*4+side];if(next<0||distances[next]>=0)continue;
            distances[next]=distances[id]+1;queue[tail++]=next;
        }
    }
    if(graph.fields.size>=128)graph.fields.delete(graph.fields.keys().next().value!);
    graph.fields.set(start,distances);return distances;
}
/** Existing route handles see changed doors lazily; no crowd-wide invalidation or wall raycasts per BFS. */
export function navigation(target: Point, ignoreDoors = false) {
    const start=Math.floor(target.y/CELL)*navCols+Math.floor(target.x/CELL);
    let graph=navigationGraph(ignoreDoors),distances=distanceField(graph,start);
    return (from:Point):Point=>{
        const latest=navigationGraph(ignoreDoors);
        if(latest!==graph) {graph=latest;distances=distanceField(graph,start);}
        const id=Math.floor(from.y/CELL)*navCols+Math.floor(from.x/CELL);
        if(id<0||id>=navCount)return from;
        let best=distances[id],result=cellPoint(id);
        for(let side=0;side<4;side++) {
            const next=graph.edges[id*4+side];if(next<0)continue;
            const distance=distances[next];
            if(distance>=0&&(best<0||distance<best)) {best=distance;result=cellPoint(next);}
        }
        return best===0?target:result;
    };
}
