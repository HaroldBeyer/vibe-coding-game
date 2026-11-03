import { config as C } from './config.ts';
import { WORLD_W, WORLD_H, visible, interiors, type Point } from './world.ts';

export type StreetLight = Point & { radius: number; strength: number; color: number; working: boolean; shop?: boolean; indoor?: boolean };
/** Fixed positions: decoration, shadows and human perception all share these lamps. */
export const streetLights: StreetLight[] = [];
for (let column = 0, x = 14; x < WORLD_W; x += C.world.blockSpacingX, column++)
    for (let row = 0, y = 70; y < WORLD_H; y += 210, row++) {
        const working = (column * 3 + row) % 5 !== 2;
        streetLights.push({ x:x+7, y, radius:C.lighting.lampRadius, strength:.95, color:0xffce88, working });
    }
for (let row = 0, y = 527; y < WORLD_H; y += C.world.blockSpacingY, row++)
    for (let column = 0, x = 180; x < WORLD_W; x += 240, column++) {
        const working = (column + row * 2) % 4 !== 1;
        streetLights.push({ x, y:y-5, radius:C.lighting.lampRadius, strength:.9, color:(row+column) % 3 === 1 ? 0xb4d7e6 : 0xffcf91, working });
    }
// Cool shop windows on selected junctions; not every block has power.
for (let row = 0, y = 363; y < WORLD_H; y += C.world.blockSpacingY, row++)
    for (let column = 0, x = 430; x < WORLD_W; x += C.world.blockSpacingX, column++)
        if ((column + row) % 3 === 0) streetLights.push({ x, y, radius:C.lighting.shopRadius, strength:.72, color:0x81d7cf, working:true, shop:true });

for (const b of interiors) for (const y of [b.y+64,b.y+165])
    streetLights.push({x:b.x+b.w/2,y,radius:130,strength:.65,color:0xf1d5a2,working:true,indoor:true});
const cache = new Map<string,number>();
export function lightAt(point: Point, sources: readonly StreetLight[] = streetLights) {
    const cell = C.lighting.textureCell;
    const key = `${Math.floor(point.x/cell)},${Math.floor(point.y/cell)}`;
    if (sources === streetLights) {
        const previous = cache.get(key);
        if (previous !== undefined) return previous;
        point = {x:(Math.floor(point.x/cell)+.5)*cell,y:(Math.floor(point.y/cell)+.5)*cell};
    }
    let level = C.lighting.ambient;
    for (const lamp of sources) {
        if (!lamp.working) continue;
        const distance = Math.hypot(point.x-lamp.x,point.y-lamp.y);
        // Static light bake ignores door leaves; walls still cast shadows. Ceiling lights stay stable.
        if (distance >= lamp.radius || !visible(lamp,point,lamp.radius,true)) continue;
        const falloff = 1-distance/lamp.radius;
        level += lamp.strength * falloff * falloff;
    }
    level = Math.min(1,level);
    if (sources === streetLights) cache.set(key,level);
    return level;
}
export function humanSight(from: Point, target: Point, range: number) {
    const illumination = Math.max(lightAt(from) * .5,lightAt(target));
    return range * (1-(1-C.lighting.minimumSight)*(1-illumination)*C.lighting.influencePercent/100);
}
export function humanSees(from: Point, target: Point, range: number) {
    return visible(from,target,range) && Math.hypot(from.x-target.x,from.y-target.y) <= humanSight(from,target,range);
}
export function darknessSpread(point: Point) { return (1-lightAt(point))*C.lighting.darkSpread*C.lighting.influencePercent/100; }
