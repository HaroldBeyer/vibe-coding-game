import Phaser from 'phaser';
import { config as C } from './config';
import { WORLD_W, WORLD_H, buildings, interiors, doors, furniture, structuralWalls, mazeWalls, mazeDistricts, interiorKind, type Building } from './world';
import { lightAt, streetLights } from './lighting';
/** Visual layers only: the city's collision geometry remains in world.ts. */
export function paintDistrict(scene: Phaser.Scene) {
    const ground = scene.add.graphics().setDepth(-5);
    const details = scene.add.graphics().setDepth(-3);
    const roofs = scene.add.graphics().setDepth(0);
    const random = new Phaser.Math.RandomDataGenerator(['neustadt-art-01']);
    ground.fillStyle(0x30393a).fillRect(0, 0, WORLD_W, WORLD_H);
    // Broad streets, stone sidewalks, tram rails and crossing markings.
    for (let x = 0; x < WORLD_W; x += C.world.blockSpacingX) {
        ground.fillStyle(0x555951).fillRect(x, 0, 120, WORLD_H);
        ground.fillStyle(0x292f32).fillRect(x + 18, 0, 84, WORLD_H);
        ground.lineStyle(1, 0x77796a, .6).lineBetween(x + 16, 0, x + 16, WORLD_H).lineBetween(x + 104, 0, x + 104, WORLD_H);
        for (let y = 0; y < WORLD_H; y += 16) {
            ground.lineStyle(1, 0x343e3a, .65).lineBetween(x, y, x + 16, y).lineBetween(x + 104, y, x + 120, y);
        }
        for (let y = 20; y < WORLD_H; y += 64)
            ground.fillStyle(0xada993, .4).fillRect(x + 59, y, 2, 22);
    }
    for (let y = 360; y < WORLD_H; y += C.world.blockSpacingY) {
        ground.fillStyle(0x555951).fillRect(0, y, WORLD_W, 180);
        ground.fillStyle(0x2d3436).fillRect(0, y + 22, WORLD_W, 136);
        for (let x = 0; x < WORLD_W; x += 24) {
            ground.lineStyle(1, 0x3c443f).lineBetween(x, y, x, y + 20).lineBetween(x, y + 159, x, y + 180);
            ground.fillStyle(0x454e4c).fillRect(x, y + 79, 3, 23);
        }
        ground.lineStyle(1, 0x999c8e, .45).lineBetween(0, y + 22, WORLD_W, y + 22).lineBetween(0, y + 158, WORLD_W, y + 158);
        ground.lineStyle(2, 0x7d837a, .6).lineBetween(0, y + 82, WORLD_W, y + 82).lineBetween(0, y + 99, WORLD_W, y + 99);
        for (let x = 0; x < WORLD_W; x += C.world.blockSpacingX) {
            for (let n = 0; n < 7; n++) {
                ground.fillStyle(0xb6b29a, .46).fillRect(x + 24 + n * 11, y + 30, 6, 19);
                ground.fillRect(x + 24 + n * 11, y + 132, 6, 19);
            }
            details.lineStyle(2, 0xb5ad88, .3).strokeRect(x + 31, y + 62, 54, 57);
        }
    }
    // Streets feel used: puddles, patched asphalt, cracks, glass and paper.
    for (let i = 0; i < C.world.rubbleCount; i++) {
        const x = random.between(18, WORLD_W - 18), y = random.between(18, WORLD_H - 18);
        details.fillStyle(random.pick([0x7f8171, 0x646757, 0x151f22, 0x555447]), random.realInRange(.2, .6));
        details.fillRect(x, y, random.between(1, 6), random.between(1, 4));
        if (i % 42 === 0) {
            details.fillStyle(0x121f26, .45).fillEllipse(x, y, 24, 9);
            details.lineStyle(1, 0x788887, .25).lineBetween(x - 6, y + 1, x + 7, y + 1);
        }
        if (i % 73 === 0)
            details.lineStyle(1, 0x131d1c, .75).lineBetween(x, y, x + 13, y + 5).lineBetween(x + 13, y + 5, x + 20, y - 2);
    }
    const shops = [
        ['BÄCKEREI', 0x8c6145], ['SPÄTI', 0x5b766d], ['APOTHEKE', 0x4a6657],
        ['BÜCHER', 0x73565a], ['METZGEREI', 0x704948], ['ECKKNEIPE', 0x646b4c],
        ['RADWERK', 0x4e6772], ['IMBISS', 0x8a7045], ['KAFFEE', 0x76644e], ['KIOSK', 0x59676a],
    ] as const;
    buildings.forEach((b, i) => {
        const roof = [0x514846, 0x394a4b, 0x615044, 0x4b4c43, 0x3e4246][i % 5];
        // Sidewalk surrounds the same solid building footprint; narrow alleys remain open.
        ground.fillStyle(0x64675b).fillRect(b.x - 13, b.y - 13, b.w + 26, b.h + 26);
        ground.lineStyle(1, 0x363f39).strokeRect(b.x - 13, b.y - 13, b.w + 26, b.h + 26);
        for (let y = b.y - 10; y < b.y + b.h + 13; y += 12) {
            ground.lineStyle(1, 0x454e44, .55).lineBetween(b.x - 12, y, b.x - 1, y).lineBetween(b.x + b.w, y, b.x + b.w + 12, y);
        }
        if (b.enterable) return; // Accessible buildings have independent roofs below.
        roofs.fillStyle(0x0c1415, .55).fillRect(b.x + 6, b.y + 9, b.w + 6, b.h + 6);
        roofs.fillStyle(0x252e2d).fillRect(b.x, b.y, b.w, b.h);
        roofs.fillStyle(roof).fillRect(b.x + 5, b.y + 5, b.w - 10, b.h - 30);
        // Raised perimeter, tiled roof slopes, ridge and patinated gutter.
        roofs.lineStyle(2, 0x8b8974, .6).strokeRect(b.x + 2, b.y + 2, b.w - 4, b.h - 4);
        for (let y = b.y + 9; y < b.y + b.h - 28; y += 7) {
            roofs.lineStyle(1, 0x1b2727, .3).lineBetween(b.x + 7, y, b.x + b.w - 7, y);
            for (let x = b.x + 10 + (y % 2) * 4; x < b.x + b.w - 9; x += 12)
                roofs.fillStyle(0x969079, .12).fillRect(x, y - 2, 5, 2);
        }
        roofs.fillStyle(0xa0977d, .3).fillRect(b.x + b.w / 2 - 2, b.y + 7, 4, b.h - 39);
        roofs.fillStyle(0x283839).fillRect(b.x + 4, b.y + b.h - 29, b.w - 8, 5);
        for (let y = b.y + 40; y < b.y + b.h - 45; y += 63) {
            roofs.fillStyle(0x151f24).fillRect(b.x + 18, y, 22, 30);
            roofs.fillStyle(0x647b7e).fillRect(b.x + 20, y + 2, 18, 25);
            roofs.lineStyle(2, 0x242e2e).lineBetween(b.x + 29, y + 1, b.x + 29, y + 27).lineBetween(b.x + 19, y + 15, b.x + 39, y + 15);
            if (i % 3 === 0)
                roofs.lineStyle(2, 0x1d2523).lineBetween(b.x + 18, y + 4, b.x + 39, y + 24);
        }
        roofs.fillStyle(0x242d2a, .6).fillRect(b.x + b.w - 34, b.y + 28, 19, 28);
        roofs.fillStyle(0x8a7961).fillRect(b.x + b.w - 38, b.y + 23, 16, 22);
        roofs.fillStyle(0x292b27).fillRect(b.x + b.w - 36, b.y + 24, 12, 7);
        if (i % 10 === 7) {
            // Rooftop parking deck stays inside the existing solid footprint.
            roofs.fillStyle(0x3b4241).fillRect(b.x + 7, b.y + 7, b.w - 14, b.h - 38);
            for (let row = 0; row < 3; row++)
                for (let col = 0; col < 2; col++) {
                    const x = b.x + 23 + col * 72, y = b.y + 20 + row * 60;
                    roofs.lineStyle(1, 0x9c9c86, .5).strokeRect(x, y, 38, 46);
                    if ((row + col + i) % 3 === 0)
                        continue;
                    roofs.fillStyle(0x152020, .6).fillRect(x + 12, y + 9, 18, 34);
                    roofs.fillStyle([0x737d79, 0x684b45, 0x525f6c][row]).fillRoundedRect(x + 9, y + 6, 17, 33, 3);
                    roofs.fillStyle(0x24363c).fillRect(x + 11, y + 11, 13, 6).fillRect(x + 11, y + 29, 13, 4);
                    roofs.fillStyle(0x9b9d8c).fillRect(x + 10, y + 8, 3, 2).fillRect(x + 22, y + 8, 3, 2);
                    roofs.fillStyle(0x8c4943).fillRect(x + 10, y + 36, 3, 2).fillRect(x + 22, y + 36, 3, 2);
                }
        }
        else if (i % 10 === 3) {
            roofs.fillStyle(0x18262c).fillRect(b.x + 55, b.y + 82, 83, 64);
            for (let row = 0; row < 4; row++)
                for (let col = 0; col < 5; col++) {
                    roofs.fillStyle((row + col) % 2 ? 0x344950 : 0x2b3e47).fillRect(b.x + 58 + col * 16, b.y + 85 + row * 15, 13, 12);
                    roofs.fillStyle(0x76918e, .25).fillRect(b.x + 59 + col * 16, b.y + 85 + row * 15, 1, 12);
                }
        }
        // Shop entrance, roller shutters, windows and striped awning.
        const [shopName, color] = shops[i % shops.length];
        const name = i % 10 === 7 ? 'PARKHAUS' : shopName;
        roofs.fillStyle(0xa0967c).fillRect(b.x + 6, b.y + b.h - 25, b.w - 12, 23);
        roofs.fillStyle(0x17292c).fillRect(b.x + 10, b.y + b.h - 20, b.w - 20, 18);
        for (let x = b.x + 12; x < b.x + b.w - 10; x += 22)
            roofs.fillStyle(0x7e806d).fillRect(x, b.y + b.h - 19, 2, 17);
        roofs.fillStyle(color).fillRect(b.x + 7, b.y + b.h - 31, b.w - 14, 12);
        for (let x = b.x + 8; x < b.x + b.w - 8; x += 14)
            roofs.fillStyle(0xc6b992, .35).fillRect(x, b.y + b.h - 31, 6, 12);
        scene.add.text(b.x + b.w / 2, b.y + b.h - 40, name, { fontFamily: 'monospace', fontSize: '9px', color: '#e3d7b7', backgroundColor: '#192725', padding: { x: 4, y: 2 } }).setOrigin(.5).setDepth(1);
        if (name === 'APOTHEKE')
            scene.add.text(b.x + 9, b.y + b.h - 61, '+', { fontFamily: 'monospace', fontSize: '20px', color: '#d18a75' }).setDepth(1);
        if (i % 4 === 1) {
            roofs.fillStyle(0x18201e).fillRect(b.x + 49, b.y + 54, b.w - 68, 48);
            for (let n = 0; n < 12; n++)
                roofs.fillStyle(0x827762, .6).fillRect(b.x + random.between(45, b.w - 17), b.y + random.between(52, 104), 5, 3);
        }
        // Courtyard debris, bins, bicycle and sparse foliage.
        details.fillStyle(0x25473c).fillRect(b.x - 9, b.y + b.h - 15, 7, 12);
        details.fillStyle(0x71836b).fillRect(b.x - 10, b.y + b.h - 16, 9, 3);
        if (i % 3 === 0) {
            details.lineStyle(1, 0x9b9780).strokeCircle(b.x + b.w + 7, b.y + 40, 5).strokeCircle(b.x + b.w + 7, b.y + 58, 5).lineBetween(b.x + b.w + 7, b.y + 40, b.x + b.w + 9, b.y + 58);
        }
    });
    const barriers=scene.add.graphics().setDepth(3);
    for(const zone of mazeDistricts) {
        details.fillStyle(0x202b28,.42).fillRect(zone.x,zone.y,zone.w,zone.h);
        for(let x=zone.x+24;x<zone.x+zone.w;x+=54) {
            details.fillStyle(0x9f9065,.18).fillRect(x,zone.y+26,18,3).fillRect(x+11,zone.y+145,13,3);
            details.fillStyle(0x101c1e,.45).fillEllipse(x+9,zone.y+102,27,8);
        }
        scene.add.text(zone.x+15,zone.y+20,'BAUSTELLE / UMLEITUNG',{fontFamily:'monospace',fontSize:'9px',color:'#cdb27a',backgroundColor:'#322d22',padding:{x:4,y:3}}).setDepth(3);
        scene.add.text(zone.x+zone.w-124,zone.y+zone.h-33,'SACKGASSE',{fontFamily:'monospace',fontSize:'8px',color:'#a48e72'}).setDepth(2);
    }
    for(const wall of mazeWalls) {
        barriers.fillStyle(0x0a1214,.6).fillRect(wall.x+5,wall.y+7,wall.w,wall.h);
        barriers.fillStyle(0x51584c).fillRect(wall.x,wall.y,wall.w,wall.h);
        barriers.lineStyle(1,0x92927b,.7).strokeRect(wall.x,wall.y,wall.w,wall.h);
        const vertical=wall.h>wall.w,length=vertical?wall.h:wall.w;
        for(let n=0;n<length-8;n+=20) {
            barriers.fillStyle(n%40===0?0xc6a55d:0x242b28,.9).fillRect(wall.x+(vertical?2:n+2),wall.y+(vertical?n+2:2),vertical?wall.w-4:10,vertical?10:wall.h-4);
        }
        barriers.fillStyle(0x7e5740).fillRect(wall.x+2,wall.y+2,5,5);
    }
    // Outages and light colours are shared with the perception model.
    const light = scene.add.graphics().setDepth(2).setBlendMode(Phaser.BlendModes.ADD);
    const poles = scene.add.graphics().setDepth(3);
    const bulbs = scene.add.graphics().setDepth(7.5).setBlendMode(Phaser.BlendModes.ADD);
    for (const lamp of streetLights) {
        if (lamp.indoor) continue;
        const {x,y} = lamp;
        if (lamp.shop) {
            poles.fillStyle(0x152628).fillRect(x-18,y-6,36,5);
            bulbs.fillStyle(lamp.color,.7).fillRect(x-15,y-5,30,2);
        } else {
            poles.fillStyle(0x080f17,.65).fillEllipse(x+14,y+12,32,9);
            poles.fillStyle(0x1b242c).fillRect(x-6,y,6,14);
            poles.lineStyle(3,0x7c8580).lineBetween(x-4,y+3,x+2,y-6);
            poles.fillStyle(lamp.working ? 0xbba785 : 0x3a4547).fillRect(x-2,y-8,10,5);
            if (lamp.working) bulbs.fillStyle(lamp.color,.85).fillRect(x,y-7,6,3);
        }
        if (lamp.working) {
            for (let r=140;r>4;r-=10) light.fillStyle(lamp.color,.012).fillCircle(x,y,r);
            // Reflected strips suggest damp cobbles without flattening the street.
            light.lineStyle(1,lamp.color,.09).lineBetween(x-15,y+18,x+18,y+18).lineBetween(x-9,y+22,x+11,y+22);
        }
    }
    for (let y = 386; y < WORLD_H; y += C.world.blockSpacingY) {
        for (let x = 170; x < WORLD_W; x += C.world.blockSpacingX) {
            scene.add.circle(x, y, 9, 0xd3c58a).setStrokeStyle(2, 0x456b4e).setDepth(2);
            scene.add.text(x, y, 'H', { fontFamily: 'monospace', fontSize: '12px', color: '#36593d' }).setOrigin(.5).setDepth(3);
            details.fillStyle(0x23302e).fillRect(x - 22, y + 12, 45, 15);
            details.lineStyle(2, 0x8a9b8c, .5).strokeRect(x - 22, y + 12, 45, 15);
            scene.add.text(x - 18, y + 16, 'TRAM', { fontFamily: 'monospace', fontSize: '7px', color: '#9fa892' }).setDepth(1);
            // Slatted bench and a route map beside the stop.
            poles.fillStyle(0x151f1e).fillRect(x + 27, y - 13, 32, 11);
            for (let slat = 0; slat < 3; slat++)
                poles.fillStyle(0x8d7857).fillRect(x + 28, y - 12 + slat * 3, 30, 2);
            poles.fillStyle(0x899482).fillRect(x - 35, y - 12, 9, 13);
            poles.fillStyle(0xc6c4a2).fillRect(x - 34, y - 11, 7, 10);
            poles.lineStyle(1, 0x617a6b).lineBetween(x - 33, y - 9, x - 29, y - 5).lineBetween(x - 29, y - 5, x - 32, y - 2);
        }
    }
    const streetNames = ['RINGSTRASSE', 'BAHNHOFSTRASSE', 'KANTSTRASSE', 'ALTE MARKTSTRASSE'];
    for (let row = 0, y = 366; y < WORLD_H; y += C.world.blockSpacingY, row++) {
        for (let x = 20; x < WORLD_W; x += C.world.blockSpacingX) {
            scene.add.text(x, y, streetNames[row % streetNames.length], { fontFamily: 'monospace', fontSize: '7px', color: '#dfddc9', backgroundColor: '#30474d', padding: { x: 3, y: 2 } }).setDepth(3);
        }
    }
    scene.add.text(1145, 813, 'NEUSTADT / SPERRGEBIET', { fontFamily: 'monospace', fontSize: '11px', color: '#b4ae8f' }).setAlpha(.6).setDepth(-2);
    scene.add.text(1537, 928, 'KEIN DURCHGANG', { fontFamily: 'monospace', fontSize: '9px', color: '#b48b72' }).setAlpha(.6).setDepth(-2);
}
export function makeCharacterTextures(scene: Phaser.Scene) {
    if (!scene.textures.exists('ammo-crate')) {
        const crate = scene.textures.createCanvas('ammo-crate', 16, 12)!;
        const c = crate.context;
        c.fillStyle = '#191f1b';
        c.fillRect(0, 1, 16, 11);
        c.fillStyle = '#897849';
        c.fillRect(1, 1, 14, 9);
        c.fillStyle = '#c7b076';
        c.fillRect(1, 1, 14, 2);
        c.fillStyle = '#3f4736';
        c.fillRect(3, 1, 2, 9);
        c.fillRect(11, 1, 2, 9);
        c.fillStyle = '#e4d4a5';
        c.fillRect(6, 4, 4, 3);
        crate.refresh();
    }
    if (scene.textures.exists('npc-roles-atlas')) {
        const atlas = scene.textures.get('npc-roles-atlas').getSourceImage() as HTMLImageElement;
        for (let i = 0; i < 4; i++) {
            const key = i < 2 ? 'soldier-' + i : 'medic-' + (i - 2);
            if (scene.textures.exists(key))
                continue;
            const t = scene.textures.createCanvas(key, 52, 52)!;
            t.context.imageSmoothingEnabled = false;
            t.context.drawImage(atlas, i % 2 * atlas.width / 2, Math.floor(i / 2) * atlas.height / 2, atlas.width / 2, atlas.height / 2, 0, 0, 52, 52);
            t.refresh();
        }
    }
    const source = scene.textures.get('characters-atlas').getSourceImage() as HTMLImageElement;
    const names = ['survivor', 'civilian-blue', 'civilian-red', 'zombie-olive', 'zombie-suit', 'civilian-yellow'];
    names.forEach((name, i) => {
        if (scene.textures.exists(name))
            return;
        const texture = scene.textures.createCanvas(name, 52, 52)!;
        texture.context.imageSmoothingEnabled = false;
        texture.context.drawImage(source, (i % 3) * source.width / 3, Math.floor(i / 3) * source.height / 2, source.width / 3, source.height / 2, 0, 0, 52, 52);
        texture.refresh();
    });
}

/** Bake the occluded ambient darkness once; no per-frame full-map light calculation. */
export function paintLighting(scene: Phaser.Scene) {
    const key = 'district-lighting';
    if (scene.textures.exists(key)) scene.textures.remove(key);
    const cell = C.lighting.textureCell, width = Math.ceil(WORLD_W/cell), height = Math.ceil(WORLD_H/cell);
    const texture = scene.textures.createCanvas(key,width,height)!;
    const pixels = texture.context.createImageData(width,height);
    for (let y=0;y<height;y++) for (let x=0;x<width;x++) {
        const level = lightAt({x:(x+.5)*cell,y:(y+.5)*cell}), i=(y*width+x)*4;
        pixels.data[i]=5; pixels.data[i+1]=12; pixels.data[i+2]=24;
        pixels.data[i+3]=Math.round(255*C.lighting.darknessOpacity*(1-level));
    }
    texture.context.putImageData(pixels,0,0); texture.refresh();
    scene.add.image(0,0,key).setOrigin(0).setDisplaySize(WORLD_W,WORLD_H).setDepth(7);
}

export type InteriorArt = { building: Building; roof: Phaser.GameObjects.Graphics; sign: Phaser.GameObjects.Text };
export function paintInteriors(scene: Phaser.Scene): InteriorArt[] {
    return interiors.map(b=>{
        const kind=interiorKind(b), door=doors.find(d=>d.id===b.id)!;
        const floor=scene.add.graphics().setDepth(0), fixtures=scene.add.graphics().setDepth(3);
        const wood=kind==='pub', clinic=kind==='clinic';
        floor.fillStyle(wood?0x594b39:clinic?0x59665a:0x615e4d).fillRect(b.x,b.y,b.w,b.h);
        for(let y=b.y+10;y<b.y+b.h-10;y+=wood?10:18) for(let x=b.x+10;x<b.x+b.w-10;x+=wood?32:18) {
            floor.fillStyle(wood ? ((x+y)%3?0x65533d:0x4c4031) : ((Math.floor(x/18)+Math.floor(y/18))%2?0x818675:0x647264),.65).fillRect(x,y,wood?30:16,wood?8:16);
        }
        floor.fillStyle(0x282824,.7).fillRect(door.x+4,b.y+14,door.w-8,16);
        floor.lineStyle(1,0x8b8e73,.5).strokeRect(door.x+4,b.y+14,door.w-8,16);
        floor.fillStyle(0x552f2a,.48).fillEllipse(b.x+75,b.y+114,28,13).fillCircle(b.x+92,b.y+124,4);
        for(let i=0;i<18;i++) floor.fillStyle(i%2?0xc4bea2:0x262e2b,.35).fillRect(b.x+22+(i*37)%135,b.y+34+(i*29)%177,3,2);
        for(const f of furniture(b)) {
            fixtures.fillStyle(0x111c1b,.6).fillRect(f.x+4,f.y+5,f.w,f.h);
            fixtures.fillStyle(f.kind==='bed'?0xa8b8ad:wood?0x725439:0x59655c).fillRect(f.x,f.y,f.w,f.h);
            fixtures.lineStyle(2,0x293b36).strokeRect(f.x,f.y,f.w,f.h);
            if(f.kind==='shelf') for(let y=f.y+8;y<f.y+f.h;y+=13) {
                fixtures.fillStyle(0x1d302a).fillRect(f.x+2,y,f.w-4,3);
                for(let x=f.x+5;x<f.x+f.w-4;x+=8) fixtures.fillStyle((x+y)%3?0xa19a61:0x7d5148).fillRect(x,y-6,5,6);
            }
            if(f.kind==='counter') {
                fixtures.fillStyle(0x9d9b7b).fillRect(f.x+3,f.y+3,f.w-6,6);
                fixtures.fillStyle(0x152b2d).fillRect(f.x+10,f.y+19,15,19);
                fixtures.fillStyle(0x9abb9c,.6).fillRect(f.x+12,f.y+21,11,8);
            }
            if(f.kind==='bed') {
                fixtures.fillStyle(0xc5c4a7).fillRect(f.x+4,f.y+4,9,f.h-8);
                fixtures.fillStyle(0x5f8f8c).fillRect(f.x+17,f.y+3,f.w-20,f.h-6);
                fixtures.fillStyle(0x683c32,.7).fillRect(f.x+24,f.y+12,7,6);
            }
            if(f.kind==='table') {
                fixtures.fillStyle(0xb2a385,.6).fillRect(f.x+8,f.y+9,10,7);
                fixtures.fillStyle(0x203a30).fillRect(f.x+26,f.y+7,4,10);
                fixtures.fillStyle(0x393b31).fillRect(f.x+10,f.y+f.h+3,17,7);
            }
        }
        for(const wall of structuralWalls.filter(w=>w.x>=b.x&&w.y>=b.y&&w.x+w.w<=b.x+b.w&&w.y+w.h<=b.y+b.h)) {
            fixtures.fillStyle(0x3a4541).fillRect(wall.x,wall.y,wall.w,wall.h);
            fixtures.lineStyle(1,0xa09d80,.65).strokeRect(wall.x,wall.y,wall.w,wall.h);
        }
        for(const y of [b.y+64,b.y+165]) fixtures.fillStyle(0xe4d6a5,.5).fillRect(b.x+b.w/2-6,y-2,12,4);
        const roof=scene.add.graphics().setDepth(6.7);
        roof.fillStyle(0x1b2527).fillRect(b.x+3,b.y+12,b.w-6,b.h-15);
        roof.fillStyle(wood?0x584946:clinic?0x425254:0x4e4e43).fillRect(b.x+8,b.y+17,b.w-16,b.h-25);
        for(let y=b.y+23;y<b.y+b.h-10;y+=8) {
            roof.lineStyle(1,0x16282a,.45).lineBetween(b.x+10,y,b.x+b.w-10,y);
            for(let x=b.x+14;x<b.x+b.w-12;x+=17) roof.fillStyle(0xb0a38a,.12).fillRect(x,y-3,7,2);
        }
        roof.lineStyle(2,0x8a907f,.6).strokeRect(b.x+6,b.y+15,b.w-12,b.h-21);
        roof.fillStyle(0x8c866b,.3).fillRect(b.x+b.w/2-2,b.y+17,4,b.h-25);
        roof.fillStyle(0x303c3b).fillRect(b.x+22,b.y+40,26,35);
        roof.fillStyle(0x71857f).fillRect(b.x+25,b.y+43,20,27);
        const title=clinic?'APOTHEKE':wood?'ECKKNEIPE':'SPÄTI';
        const sign=scene.add.text(b.x+b.w/2,b.y+34,title,{fontFamily:'monospace',fontSize:'10px',color:clinic?'#b7d6b5':'#d9c79b',backgroundColor:'#192724',padding:{x:5,y:3}}).setOrigin(.5).setDepth(6.8);
        return {building:b,roof,sign};
    });
}
