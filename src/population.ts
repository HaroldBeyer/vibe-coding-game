import { config as C } from './config.ts';
import { WORLD_W,WORLD_H,CELL,blocked,type Point } from './world.ts';
/** Round-robin city sectors and minimum spacing avoid a crowd concentrated near the start. */
export function civilianSpawnPoints(total:number,random:()=>number=Math.random) {
    const columns=C.npc.spawnColumns,rows=C.npc.spawnRows;
    const sectors:Point[][]=Array.from({length:columns*rows},()=>[]);
    for(let y=CELL/2;y<WORLD_H;y+=CELL)for(let x=CELL/2;x<WORLD_W;x+=CELL) {
        if(blocked({x,y},26))continue;
        const column=Math.min(columns-1,Math.floor(x/WORLD_W*columns)),row=Math.min(rows-1,Math.floor(y/WORLD_H*rows));
        sectors[row*columns+column].push({x,y});
    }
    const order=sectors.map((_,i)=>i);
    for(let i=order.length-1;i>0;i--) {const j=Math.min(i,Math.floor(random()*(i+1)));[order[i],order[j]]=[order[j],order[i]];}
    const positions:Point[]=C.civilian.initialPositions.slice(0,total).map(p=>({...p}));
    const free=(p:Point)=>positions.every(other=>Math.hypot(p.x-other.x,p.y-other.y)>=C.npc.spawnSeparation);
    for(let i=positions.length;i<total;i++) {
        let candidates=sectors[order[i%order.length]].filter(free);
        if(!candidates.length)candidates=sectors.flat().filter(free);
        if(!candidates.length)throw new Error('config: não há espaço para distribuir os NPCs com npc.spawnSeparation.');
        positions.push(candidates[Math.min(candidates.length-1,Math.floor(random()*candidates.length))]);
    }
    return positions;
}
