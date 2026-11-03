import Phaser from 'phaser';
import { config as C } from './config';
import { GoreField, type Remain } from './gore-model';
import type { Point } from './world';

/** Dirty ground redraws at 10 Hz; airborne drops draw each frame below roofs and lighting. */
export class Gore {
    readonly field=new GoreField();
    private ground:Phaser.GameObjects.Graphics;
    private air:Phaser.GameObjects.Graphics;
    private elapsed=0;private groundAt=0;
    constructor(scene:Phaser.Scene,private seen:(p:Point)=>boolean) {
        this.ground=scene.add.graphics().setDepth(3.5);
        this.air=scene.add.graphics().setDepth(6.3);
    }
    step(dt:number) {
        this.elapsed+=dt;this.field.step(dt);
        if(this.elapsed>=this.groundAt) {
            this.groundAt=this.elapsed+C.gore.groundRefreshSeconds;
            this.ground.clear();
            for(const stain of this.field.stains)if(this.seen(stain)) {
                this.ground.fillStyle(0x230e15,.45).fillEllipse(stain.x+1,stain.y+1,stain.radius*2.3,stain.radius*1.4);
                this.ground.fillStyle(stain.color,.85).fillEllipse(stain.x,stain.y,stain.radius*2,stain.radius*stain.stretch*2);
                this.ground.fillStyle(0xba3b3e,.35).fillRect(stain.x-stain.radius*.3,stain.y-1,Math.max(2,stain.radius*.65),1);
            }
            for(const corpse of this.field.corpses)if(this.seen(corpse))this.drawRemain(this.ground,corpse);
            for(const remain of this.field.remains)if(this.seen(remain))this.drawRemain(this.ground,remain);
        }
        this.air.clear();
        for(const p of this.field.particles)if(this.seen(p)) {
            this.air.fillStyle(0x140c10,.3).fillEllipse(p.x,p.y,p.blood?2:7,p.blood?1:3);
            if(p.blood)this.air.fillStyle(p.color,.95).fillRect(Math.round(p.x),Math.round(p.y-p.height),p.size,p.size);
            else this.drawRemain(this.air,{...p,y:p.y-p.height});
        }
    }
    private shape(g:Phaser.GameObjects.Graphics,p:Remain,points:[number,number][],color:number) {
        const c=Math.cos(p.angle),s=Math.sin(p.angle);
        g.fillStyle(color).fillPoints(points.map(([x,y])=>new Phaser.Math.Vector2(p.x+x*c-y*s,p.y+x*s+y*c)),true);
    }
    private drawRemain(g:Phaser.GameObjects.Graphics,p:Remain) {
        if(p.kind==='torso') {
            this.shape(g,p,[[-9,-5],[7,-6],[11,-2],[6,2],[8,6],[-8,5]],p.color);
            this.shape(g,p,[[-8,-3],[6,-3],[8,0],[-7,1]],0x49272a);
            this.shape(g,p,[[5,-5],[10,-2],[5,1],[9,5],[2,4],[3,-1]],0x9a3439);
            this.shape(g,p,[[-6,-4],[-2,-4],[-1,5],[-4,5]],0x262c29);
        } else if(p.kind==='head') {
            g.fillStyle(p.human?0xb08b73:0x82866a).fillRect(p.x-3,p.y-3,6,6);
            g.fillStyle(0x33221f).fillRect(p.x-3,p.y-3,6,2);
            g.fillStyle(0xa0363b).fillRect(p.x-1,p.y+2,3,3);
        } else {
            this.shape(g,p,[[-5,-2],[3,-2],[6,0],[3,3],[-5,2]],p.color);
            this.shape(g,p,[[-6,-2],[-3,-1],[-3,2],[-6,2]],0xad363d);
            this.shape(g,p,[[3,-2],[7,-2],[7,1],[4,2]],p.kind==='leg'?0x202a26:p.human?0xb3927a:0x7e8269);
        }
    }
}
