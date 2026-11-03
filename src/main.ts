import Phaser from 'phaser';
import { showStartMenu } from './start-menu';
import { matchOutcome, type Outcome } from './objective';
import { config as C } from './config';
import { direction, staminaStep, WALK, RUN } from './survival';
import { WORLD_W, WORLD_H, CELL, collisionRects, interiors, doors, resetDoors, toggleDoor, hitDoor, doorCenter, insideBuilding, type Door, type Building, blocked, visible, wallDistance, navigation, bulletHit, spawnPoint, roamDestination, type Point } from './world';
import './style.css';
import { civilianSpawnPoints } from './population';
import { paintDistrict, paintInteriors, paintLighting, makeCharacterTextures, type InteriorArt } from './art';
import { soundscape } from './audio';
import { Gore } from './gore';
import { HordeSchedule, entryPoints, missingMutants } from './waves';
import { assignCompanions, canJoinFollowers, type CompanionCandidate, squadGroups, chooseShelter, canCloseFromInside, escortArrived, escortCoverPoint, shouldLeaveShelter, rescueSearchGoal, canBecomeShelterResident, shelterEntryPoint, remainingShelterPlaces, observeFollowLeader, type FollowMemory } from './tactics';
import { lightAt, humanSight, humanSees, darknessSpread } from './lighting';
import { npcRoles, provideAid, donateAmmo, type NpcRole, type AidState, type SoldierAmmo } from './npc';
import { Pistol, shotAngle, humanKill, zombieHit, biteCivilian, ZOMBIE_HEALTH, type CivilianState } from './combat';
import { INITIAL_CIVILIANS, HERD_CHANCE, wanderAngle, patrolDirection, calmState, panicStep, type PanicState } from './behavior';
const START = C.player.spawn, FIRST_AMMO = C.ammo.firstBox;
const CIVILIAN_TEXTURES = ['civilian-blue', 'civilian-red', 'civilian-yellow'];
const WIDTH = 960, HEIGHT = 640, SIGHT = C.vision.radius;
type Actor = Phaser.Physics.Arcade.Image;
type AllyTrack = {actor:Actor;point:Point;until:number};
type Refuge = {door:Door;phase:'enter'|'hide'|'leave';deadline:number;holdUntil:number;escortId?:number;settled?:boolean};
type EscortMission = {id:number;door:Door;civilians:Actor[];phase:'boarding'|'seal';deadline:number;allowReopen:boolean};
type Noise = Point & {
    radius: number;
    until: number;
};
type Patrol = {
    goal: Point;
    route: (p: Point) => Point;
    changeAt: number;
    expires: number;
};
class District extends Phaser.Scene {
    player!: Actor;
    civilians!: Phaser.Physics.Arcade.Group;
    zombies!: Phaser.Physics.Arcade.Group;
    ammo!: Phaser.Physics.Arcade.StaticGroup;
    private keys!: Record<string, Phaser.Input.Keyboard.Key>;
    private gun!: Phaser.GameObjects.Rectangle;
    private gore!: Gore;
    private effects!: Phaser.GameObjects.Graphics;
    private humanActors: Actor[] = [];
    private tacticsAt=0;
    private escortMissions=new Map<number,EscortMission>();
    private squadLinks=new Map<string,number>();
    private interiorArt: InteriorArt[] = [];
    private doorBodies = new Map<Door, Phaser.GameObjects.Rectangle>();
    private doorGraphics!: Phaser.GameObjects.Graphics;
    private doorLabel!: Phaser.GameObjects.Text;
    private healthBars!: Phaser.GameObjects.Graphics;
    private criticalText!: Phaser.GameObjects.Text;
    health = C.player.health;
    stamina = C.stamina.max;
    exhausted = false;
    elapsed = 0;
    outcome:Outcome;
    dead = false;
    paused = false;
    pistol = new Pistol();
    kills = 0;
    infections = 0;
    notice = 'Encontre munição. O barulho atrai os mortos.';
    private hurtUntil = 0;
    private shotAt = -1;
    private noises: Noise[] = [];
    private playerField = navigation(START);
    private civilianFields = new Map<Actor, (p: Point) => Point>();
    private reloadRequested = false;
    private restartRequested = false;
    private pauseRequested = false;
    private fieldAt = 0;
    private stepAt = 0;
    private growlAt = 0;
    private lastPlayerPosition = { ...START };
    private recoil = 0;
    private menu?: HTMLDivElement;
    private menuNpc?: Actor;
    private interactRequested = false;
    private npcEffects!: Phaser.GameObjects.Graphics;
    private npcShots: {
        from: Point;
        to: Point;
        until: number;
    }[] = [];
    npcKills = 0;
    interactionHint = '';
    waves = new HordeSchedule();
    constructor() { super('district'); }
    preload() { this.load.image('npc-roles-atlas', `${import.meta.env.BASE_URL}assets/npc-roles-atlas.png`); this.load.image('characters-atlas', `${import.meta.env.BASE_URL}assets/characters-atlas.png`); }
    create() {
        Object.assign(this, { health: C.player.health, stamina: C.stamina.max, exhausted: false, elapsed: 0, dead: false, paused: false, kills: 0, infections: 0, hurtUntil: 0, shotAt: -1, fieldAt: 0 });
        this.outcome=undefined;
        this.tacticsAt=0; this.squadLinks.clear(); this.escortMissions.clear(); this.humanActors=[];
        resetDoors();
        this.doorBodies.clear();
        this.pistol = new Pistol();
        this.recoil = 0;
        this.waves = new HordeSchedule();
        this.closeMenu();
        this.civilianFields.clear();
        this.reloadRequested = this.restartRequested = this.pauseRequested = false;
        this.noises = [];
        this.interactRequested = false;
        this.npcKills = 0;
        this.interactionHint = '';
        this.npcShots = [];
        this.stepAt = this.growlAt = 0;
        this.lastPlayerPosition = { ...START };
        soundscape.setPaused(false);
        this.notice = 'Encontre munição. O barulho atrai os mortos.';
        this.physics.resume();
        this.physics.world.setBounds(18, 18, WORLD_W - 36, WORLD_H - 36);
        this.cameras.main.setBackgroundColor('#30393a').setZoom(C.vision.zoom);
        paintDistrict(this);
        this.interiorArt = paintInteriors(this);
        this.doorGraphics = this.add.graphics().setDepth(6.6);
        this.doorLabel = this.add.text(0,0,'',{fontFamily:'monospace',fontSize:'10px',color:'#e0d4ad',backgroundColor:'#17221e',padding:{x:4,y:3}}).setOrigin(.5,1).setDepth(10);
        this.add.rectangle(C.waves.spawn.x,C.waves.spawn.y,90,110,0x632c28,.14).setDepth(1).setStrokeStyle(2,0x9c5646,.6);
        this.add.text(C.waves.spawn.x-48,C.waves.spawn.y-66,'ENTRADA OESTE', {fontFamily:'monospace',fontSize:'9px',color:'#cc8e70',backgroundColor:'#231619'}).setDepth(3);
        makeCharacterTextures(this);
        paintLighting(this);
        if (!this.textures.exists('mutant')) {
            const g = this.make.graphics({ x: 0, y: 0 });
            g.lineStyle(5, 0x622c35).lineBetween(18, 22, 4, 6).lineBetween(18, 30, 3, 48).lineBetween(32, 21, 44, 4).lineBetween(32, 31, 45, 47);
            g.fillStyle(0x9e5056).fillEllipse(25, 26, 29, 19).fillEllipse(39, 26, 16, 13);
            g.lineStyle(2, 0xd58c83).lineBetween(16, 23, 32, 23).lineBetween(16, 28, 32, 28);
            g.lineStyle(2, 0xbe6872).lineBetween(44, 27, 51, 32);
            g.fillStyle(0xe0c7a0).fillRect(43, 25, 5, 3);
            g.generateTexture('mutant', 54, 54); g.destroy();
        }
        const walls = this.physics.add.staticGroup();
        for (const b of collisionRects)
            walls.add(this.add.rectangle(b.x + b.w / 2, b.y + b.h / 2, b.w, b.h, 0x000000, 0));
        this.player = this.setupActor(this.physics.add.image(START.x, START.y, 'survivor'));
        this.gore=new Gore(this,p=>this.canRender(p));
        this.gun = this.add.rectangle(0, 0, 10, 3, 0x8e9690).setOrigin(0, .5).setDepth(6);
        this.effects = this.add.graphics().setDepth(8);
        this.npcEffects = this.add.graphics().setDepth(8);
        this.healthBars = this.add.graphics().setDepth(9);
        this.criticalText = this.add.text(0, 0, 'CRÍTICO!', { fontFamily: 'monospace', fontSize: '12px', color: '#f1b76b', backgroundColor: '#181009' }).setOrigin(.5).setDepth(10).setVisible(false);
        this.zombies = this.physics.add.group();
        this.civilians = this.physics.add.group();
        this.ammo = this.physics.add.staticGroup();
        const doorGroup = this.physics.add.staticGroup();
        for (const door of doors) {
            const body = this.add.rectangle(door.x+door.w/2,door.y+door.h/2,door.w,door.h,0,0);
            doorGroup.add(body); this.doorBodies.set(door,body);
            (body.body as Phaser.Physics.Arcade.StaticBody).enable = !door.open && door.health>0;
        }
        this.physics.add.collider(this.player,doorGroup);
        this.physics.add.collider(this.civilians,doorGroup);
        this.physics.add.collider(this.zombies,doorGroup);
        this.physics.add.collider(this.player, walls);
        this.physics.add.collider(this.civilians, walls);
        this.physics.add.collider(this.civilians, this.civilians);
        this.physics.add.collider(this.zombies, walls);
        this.physics.add.collider(this.zombies, this.zombies);
        this.physics.add.overlap(this.player, this.zombies, (_player, zombie) => this.damage(zombie as Actor));
        this.physics.add.overlap(this.civilians, this.zombies, (civilian, zombie) => this.infect(civilian as Actor, zombie as Actor));
        this.physics.add.overlap(this.player, this.ammo, (_p, box) => {
            if (this.dead || this.paused || this.outcome)
                return;
            box.destroy();
            this.pistol.reserve += C.ammo.roundsPerBox;
            soundscape.play('pickup');
            this.notice = `+${C.ammo.roundsPerBox} balas · [R/E] recarregar`;
        });
        this.keys = this.input.keyboard!.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SHIFT') as Record<string, Phaser.Input.Keyboard.Key>;
        this.input.keyboard!.addCapture(['UP', 'DOWN', 'LEFT', 'RIGHT', 'SHIFT']);
        this.input.mouse?.disableContextMenu();
        // Queue discrete commands on keydown: very short taps must not disappear between frames.
        const command = (event: KeyboardEvent) => {
            if ((event.target as HTMLElement | null)?.closest?.('button, input, select'))
                return;
            if (event.repeat)
                return;
            if (event.code === 'KeyM') {
                soundscape.toggle();
                return;
            }
            soundscape.unlock();
            if (event.code === 'KeyR' || event.code === 'KeyE')
                this.reloadRequested = !this.paused && !this.dead && !this.outcome;
            if (event.code === 'Enter')
                this.restartRequested = true;
            if (event.code === 'KeyP')
                this.pauseRequested = true;
            if (event.code === 'KeyF' && !this.paused && !this.dead && !this.outcome)
                this.interactRequested = true;
        };
        this.input.keyboard!.on('keydown', command);
        this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
            this.game.canvas.focus({ preventScroll: true });
            soundscape.unlock();
            if (this.dead || this.paused || this.outcome) return;
            const point = this.cameras.main.getWorldPoint(p.x, p.y);
            const door = doors.find(d=>d.health>0 && Math.abs(point.x-doorCenter(d).x)<d.w/2+6 && Math.abs(point.y-doorCenter(d).y)<14 && Math.hypot(this.player.x-doorCenter(d).x,this.player.y-doorCenter(d).y)<=C.doors.interactionRadius);
            if (p.leftButtonDown() && door) { this.useDoor(door); return; }
            const npc = (this.civilians.getChildren() as Actor[]).find(n => n.visible && Math.hypot(n.x-point.x, n.y-point.y) < 20);
            if (p.leftButtonDown() && npc) { this.openMenu(npc); return; }
            if (this.menu) { this.closeMenu(); return; }
            if (p.rightButtonDown()) this.melee(this.player);
            else if (p.leftButtonDown()) this.shoot();
        });
        this.input.mouse?.disableContextMenu();
        this.events.once('shutdown', () => {
            this.closeMenu();
            this.input.removeAllListeners('pointerdown');
            this.input.keyboard!.off('keydown', command);
        });
        this.cameras.main.startFollow(this.player, true, 1, 1);
        // Keep the player centered in the visibility circle even at world edges.
        for (const wave of this.waves.due(0)) this.spawnHorde(wave);
        const roles = npcRoles(INITIAL_CIVILIANS), positions=civilianSpawnPoints(INITIAL_CIVILIANS);
        for (let i = 0; i < INITIAL_CIVILIANS; i++) {
            const p = positions[i];
            const role = roles[i];
            const texture = role === 'civilian' ? Phaser.Utils.Array.GetRandom(CIVILIAN_TEXTURES) : `${role}-${Phaser.Math.Between(0, 1)}`;
            const civilian = this.civilians.create(p.x, p.y, texture) as Actor;
            this.setupActor(civilian);
            civilian.setData('state', { health: C.civilian.health, hurtUntil: 0, infected: false } satisfies CivilianState);
            civilian.setData('speed', i === 0 ? C.civilian.firstSpeed : Phaser.Math.Between(C.civilian.speedMin, C.civilian.speedMax));
            civilian.setData('panic', calmState());
            civilian.setData({ stamina: C.civilian.stamina.max, exhausted: false });
            const label = this.add.text(0, 0, 'PÂNICO', { fontFamily: 'monospace', fontSize: '10px', color: '#ffd397', backgroundColor: '#291c13', padding: { x: 3, y: 2 } }).setOrigin(.5, 1).setDepth(10).setVisible(false);
            civilian.setData('panicLabel', label);
            civilian.setData({ npcId:i, role, aid: { charges: C.npc.medicalCharges, readyAt: 0 } satisfies AidState,
                ammo: { rounds: C.npc.soldierRounds, magazine: Math.min(C.npc.soldierRounds, C.npc.soldierClip), gifted: false } satisfies SoldierAmmo,
                walkAt: i < 2 ? C.npc.initialGreetingSeconds : 0, nextShot: 0, reloadUntil: 0, socialAt: this.elapsed + 4 + Math.random() * C.npc.socialInterval });
            const roleLabel = this.add.text(0, 0, role === 'medic' ? '+ MÉDICO' : role === 'soldier' ? 'SOLDADO' : '', { fontFamily: 'monospace', fontSize: '9px', color: role === 'medic' ? '#a2d9bd' : '#d5c39a', backgroundColor: '#16251f', padding: { x: 3, y: 1 } }).setOrigin(.5, 1).setDepth(10);
            const bubble = this.add.text(0, 0, '', { fontFamily: 'monospace', fontSize: '10px', color: '#e5dbbf', backgroundColor: '#10221e', wordWrap: { width: 190 }, align: 'center', padding: { x: 6, y: 4 } }).setOrigin(.5, 1).setDepth(12).setVisible(false);
            civilian.setData({ roleLabel, bubble, bubbleUntil: 0 });
        }
        for (let i = 0; i < C.ammo.boxes; i++) {
            const p = i === 0 ? FIRST_AMMO : this.freePoint();
            const box = this.add.image(p.x, p.y, 'ammo-crate').setDepth(3);
            this.ammo.add(box);
        }
        this.scene.launch('overlay');
    }
    private freePoint(): Point { return spawnPoint(); }
    private setupActor(actor: Actor) {
        // Larger artwork, same nine-pixel collision radius in world coordinates.
        actor.setDisplaySize(38, 38);
        const radius = 9 / actor.scaleX;
        return actor.setCircle(radius, actor.width / 2 - radius, actor.height / 2 - radius).setCollideWorldBounds(true).setDepth(5);
    }
    private spawn(p: Point, mutant = false) {
        const z = this.zombies.create(p.x, p.y, mutant ? 'mutant' : Phaser.Utils.Array.GetRandom(['zombie-olive', 'zombie-suit'])) as Actor;
        this.setupActor(z).setDepth(4);
        z.setData({ mutant, humanKills: 0, health: mutant ? C.mutant.health : ZOMBIE_HEALTH, maxHealth: mutant ? C.mutant.health : ZOMBIE_HEALTH, speed: mutant ? C.mutant.speed : C.zombie.chaseSpeed, memory: 0, goal: null, wander: Math.random() * Math.PI * 2, turnAt: 0 });
        return z;
    }
    private orderFollowing(npc:Actor,follow:boolean) {
        const role=npc.getData('role') as NpcRole;
        const followers=this.humanActors.filter(a=>a!==npc&&a.getData('followPlayer')&&a.getData('role')===role).length;
        if(follow&&!canJoinFollowers(role,followers)) {
            this.say(npc,'Seu grupo já está cheio.',2);this.notice='Limite do grupo: 3 soldados, 5 civis e 1 médico.';return;
        }
        npc.setData({followPlayer:follow,playerTrack:follow?observeFollowLeader(undefined,this.player,this.elapsed):undefined,tacticalKey:undefined,walkGoal:undefined});
        if(follow) {
            for(const mission of [...this.escortMissions.values()]) {
                mission.civilians=mission.civilians.filter(a=>a!==npc);
                if(!mission.civilians.some(a=>a.active))this.endEscort(mission);
            }
            npc.setData({refuge:undefined,escortMission:undefined,escortPoint:undefined,leaderTrack:undefined,medicTrack:undefined});
        }
        this.tacticsAt=0;
        this.say(npc,follow?'Vou com você.':'Certo. Vou continuar por aqui.',2);
        this.notice=follow?'Companheiro seguindo você.':'Ordem de seguir encerrada.';
    }
    private followPlayerAct(npc:Actor,speed:number) {
        if(!npc.getData('followPlayer'))return false;
        if(this.elapsed<(npc.getData('busyUntil')??0)) {npc.setVelocity(0,0);return true;}
        const track=npc.getData('playerTrack') as FollowMemory|undefined;
        if(!track||this.elapsed>track.until) {npc.setData('intent','ESPERANDO VOCÊ');npc.setVelocity(0,0);return true;}
        npc.setData('intent','SEGUINDO VOCÊ');
        const current=insideBuilding(npc),target=insideBuilding(track.point);
        const exit=current&&current!==target?doors.find(d=>d.id===current.id&&!d.open&&d.health>0):undefined;
        const entrance=target&&target!==current?doors.find(d=>d.id===target.id&&!d.open&&d.health>0):undefined;
        const door=exit??entrance;
        if(door) {
            const handle={x:doorCenter(door).x,y:door.y+(exit?35:-35)};
            if(visible(npc,doorCenter(door),C.doors.interactionRadius,true))this.npcDoor(npc,door);
            this.tacticalMove(npc,handle,speed);
            return true;
        }
        const goal=this.formationPoint(track.point,npc.getData('npcId'),C.tactics.playerFollowDistance);
        this.tacticalMove(npc,goal,speed);return true;
    }
    private trackAlly(npc:Actor,candidates:Actor[],key:string,range:number) {
        const seen=candidates.filter(a=>a!==npc&&a.active&&humanSees(npc,a,range)).sort((a,b)=>Math.hypot(a.x-npc.x,a.y-npc.y)-Math.hypot(b.x-npc.x,b.y-npc.y));
        const old=npc.getData(key) as AllyTrack|undefined,ally=seen.find(a=>a===old?.actor)??seen[0];
        if(ally)npc.setData(key,{actor:ally,point:{x:ally.x,y:ally.y},until:this.elapsed+C.tactics.allyMemory} satisfies AllyTrack);
        else if(!old?.actor.active||old.until<this.elapsed)npc.setData(key,undefined);
    }
    private planTactics() {
        if(this.elapsed<this.tacticsAt)return;this.tacticsAt=this.elapsed+C.tactics.thinkInterval;
        const soldiers=this.humanActors.filter(a=>a.getData('role')==='soldier'&&!a.getData('followPlayer')),medics=this.humanActors.filter(a=>a.getData('role')==='medic');
        const links: [number,number][]=[];
        for(const [key,until] of this.squadLinks)if(until<this.elapsed)this.squadLinks.delete(key);
        for(let i=0;i<soldiers.length;i++)for(let j=i+1;j<soldiers.length;j++) {
            const a=soldiers[i],b=soldiers[j],key=[a.getData('npcId'),b.getData('npcId')].sort((x,y)=>x-y).join(':');
            if(humanSees(a,b,C.tactics.squadRange))this.squadLinks.set(key,this.elapsed+C.tactics.allyMemory);
            if(this.squadLinks.has(key))links.push([a.getData('npcId'),b.getData('npcId')]);
        }
        const groups=squadGroups(soldiers.map(a=>a.getData('npcId')),links);
        for(const soldier of soldiers) {
            const group=groups.get(soldier.getData('npcId'))!,members=soldiers.filter(a=>groups.get(a.getData('npcId'))===group),leader=members.find(a=>a.getData('npcId')===group)!;
            soldier.setData({squad:group,squadSize:members.length});
            this.trackAlly(soldier,[leader],'leaderTrack',C.tactics.squadRange);
        }
        this.planEscorts(soldiers,groups);
        const crews=new Map<number,Actor[]>();
        for(const soldier of this.humanActors.filter(a=>a.getData('role')==='soldier')) {
            const group=soldier.getData('followPlayer')?-1:groups.get(soldier.getData('npcId'))!;
            crews.set(group,[...(crews.get(group)??[]),soldier]);
        }
        for(const role of ['medic','civilian'] as const) {
            const companions=this.humanActors.filter(a=>a.getData('role')===role),reserved=new Map<number,number>();
            for(const npc of companions)if(npc.getData('followPlayer'))reserved.set(npc.getData('npcId'),-1);
            if(role==='civilian')for(const mission of this.escortMissions.values())for(const npc of mission.civilians)
                if(npc.active)reserved.set(npc.getData('npcId'),mission.id);
            const candidates:CompanionCandidate[]=[];
            for(const npc of companions) {
                if(npc.getData('followPlayer')||npc.getData('refuge'))continue;
                const old=npc.getData('guardTrack') as AllyTrack|undefined;
                for(const [group,members] of crews) {
                    const seen=members.filter(a=>(a.getData('panic') as PanicState).mode==='calm'&&humanSees(npc,a,C.tactics.civilianGuardRange));
                    const remembered=old&&old.actor.active&&old.until>=this.elapsed&&members.includes(old.actor);
                    if(seen.length||remembered)candidates.push({id:npc.getData('npcId'),group,distance:Math.min(...(seen.length?seen:[old!.actor]).map(a=>Math.hypot(a.x-npc.x,a.y-npc.y))),preferred:npc.getData('companionGroup')===group});
                }
            }
            const assigned=assignCompanions(candidates,role==='medic'?C.tactics.medicsPerGroup:C.tactics.escortCivilianLimit,reserved);
            for(const npc of companions) {
                const group=assigned.get(npc.getData('npcId'));npc.setData('companionGroup',group);
                if(group!==undefined&&!npc.getData('followPlayer'))this.trackAlly(npc,crews.get(group)??[],'guardTrack',C.tactics.civilianGuardRange);
                else npc.setData('guardTrack',undefined);
            }
            if(role==='medic')for(const soldier of soldiers) {
                const group=groups.get(soldier.getData('npcId'))!,members=crews.get(group)??[];
                const medic=medics.find(m=>assigned.get(m.getData('npcId'))===group);
                const old=soldier.getData('medicTrack') as AllyTrack|undefined;
                if(medic&&members.some(a=>humanSees(a,medic,C.tactics.escortRange)))soldier.setData('medicTrack',{actor:medic,point:{x:medic.x,y:medic.y},until:this.elapsed+C.tactics.allyMemory} satisfies AllyTrack);
                else if(!medic||old?.actor!==medic||old.until<this.elapsed)soldier.setData('medicTrack',undefined);
            }
        }
    }
    private endEscort(mission:EscortMission) {
        for(const civilian of mission.civilians)if(civilian.active) {
            const plan=civilian.getData('refuge') as Refuge|undefined;
            if(plan?.escortId===mission.id) {if(plan.phase==='enter')civilian.setData('refuge',undefined);else plan.escortId=undefined;}
            civilian.setData('evacuationUntil',this.elapsed+C.tactics.evacuationCooldown);
        }
        for(const soldier of this.humanActors)if(soldier.getData('escortMission')===mission)soldier.setData({escortMission:undefined,escortPoint:undefined});
        this.escortMissions.delete(mission.id);
    }
    private secureEscort(mission:EscortMission) {
        for(const civilian of mission.civilians)if(civilian.active) {
            const plan=civilian.getData('refuge') as Refuge|undefined;
            if(plan?.escortId===mission.id) {plan.settled=true;plan.holdUntil=this.elapsed+C.tactics.shelterHoldSeconds;}
        }
        for(const soldier of this.humanActors)if(soldier.getData('escortMission')===mission)
            soldier.setData({rescueBase:mission.door,rescueSearchUntil:this.elapsed+C.tactics.rescueSearchSeconds,searchGoal:undefined});
        this.endEscort(mission);
    }
    private shelterOccupancy(door:Door) {
        const people=new Set<Actor>();
        for(const npc of this.humanActors) {const plan=npc.getData('refuge') as Refuge|undefined;if(npc.getData('role')==='civilian'&&(insideBuilding(npc)?.id===door.id||(plan?.door===door&&plan.phase!=='leave')))people.add(npc);}
        for(const mission of this.escortMissions.values())if(mission.door===door)for(const npc of mission.civilians)if(npc.active)people.add(npc);
        return people.size;
    }
    private planEscorts(soldiers:Actor[],groups:Map<number,number>) {
        const groupIds=new Set(groups.values());
        for(const mission of [...this.escortMissions.values()])if(!groupIds.has(mission.id)) {
            const successor=soldiers.find(a=>a.getData('escortMission')===mission),newId=successor?groups.get(successor.getData('npcId')):undefined;
            if(newId!==undefined&&!this.escortMissions.has(newId)) {
                const oldId=mission.id;this.escortMissions.delete(oldId);mission.id=newId;this.escortMissions.set(newId,mission);
                for(const civilian of mission.civilians) {const plan=civilian.getData('refuge') as Refuge|undefined;if(plan?.escortId===oldId)plan.escortId=newId;}
            } else this.endEscort(mission);
        }
        for(const id of groupIds) {
            const members=soldiers.filter(a=>groups.get(a.getData('npcId'))===id).sort((a,b)=>a.getData('npcId')-b.getData('npcId'));
            let mission=this.escortMissions.get(id);
            const known=(this.zombies.getChildren() as Actor[]).filter(z=>members.some(a=>humanSees(a,z,C.npc.soldierRange)));
            if(mission) {
                const living=mission.civilians.filter(a=>a.active),room=interiors.find(b=>b.id===mission!.door.id)!;
                const ready=escortArrived(mission.door,living);
                if(!living.length||mission.door.health<=0||known.some(z=>insideBuilding(z)===room)||
                    this.elapsed>mission.deadline||(!mission.door.open&&!ready&&!mission.allowReopen)) {this.endEscort(mission);mission=undefined;}
                else {
                    if(ready&&mission.phase==='boarding')mission.phase='seal';
                    if(!mission.door.open&&ready&&mission.phase==='seal') {this.secureEscort(mission);mission=undefined;}
                }
            }
            if(!mission&&members.every(a=>this.elapsed>=(a.getData('rescueSearchUntil')??0))&&members.some(a=>(a.getData('panic') as PanicState).mode==='calm')) {
                const knownBase=members.map(a=>a.getData('rescueBase') as Door|undefined).find(d=>d&&d.health>0&&remainingShelterPlaces(this.shelterOccupancy(d))>0);
                const candidates=this.humanActors.filter(a=>canBecomeShelterResident(a.getData('role'))&&!a.getData('followPlayer')&&!a.getData('refuge')&&this.elapsed>=(a.getData('evacuationUntil')??0)&&members.some(s=>humanSees(s,a,C.tactics.escortRange)));
                candidates.sort((a,b)=>Number(!!insideBuilding(a))-Number(!!insideBuilding(b))||Math.hypot(a.x-members[0].x,a.y-members[0].y)-Math.hypot(b.x-members[0].x,b.y-members[0].y));
                for(const seed of candidates) {
                    const perceived=known.concat((this.zombies.getChildren() as Actor[]).filter(z=>humanSees(seed,z,C.civilian.sightRadius)));
                    const threat=perceived.slice().sort((a,b)=>Math.hypot(a.x-seed.x,a.y-seed.y)-Math.hypot(b.x-seed.x,b.y-seed.y))[0];
                    const door=chooseShelter(seed,threat,perceived,knownBase,d=>remainingShelterPlaces(this.shelterOccupancy(d))>0);if(!door)continue;
                    const available=remainingShelterPlaces(this.shelterOccupancy(door));if(available<=0)continue;
                    const people=candidates.filter(a=>Math.hypot(a.x-seed.x,a.y-seed.y)<C.npc.socialRadius*2.2).slice(0,Math.min(C.tactics.escortCivilianLimit,available));
                    mission={id,door,civilians:people,phase:'boarding',deadline:this.elapsed+C.tactics.evacuationTimeout,allowReopen:door===knownBase};
                    this.escortMissions.set(id,mission);
                    for(const civilian of people) {
                        civilian.setData('refuge',{door,phase:'enter',deadline:mission.deadline,holdUntil:0,escortId:id} satisfies Refuge);
                        if(civilian===people[0])this.say(civilian,'Vou com vocês para o abrigo.',2);
                    }
                    this.say(members[0],'Sigam para dentro! Eu dou cobertura.',3);break;
                }
            }
            for(const member of members) {
                member.setData('escortMission',mission);
                if(mission) {
                    const visible=mission.civilians.filter(a=>a.active&&humanSees(member,a,C.tactics.escortRange));
                    const outside=visible.find(a=>insideBuilding(a)?.id!==mission!.door.id);
                    member.setData('escortPoint',outside?{x:outside.x,y:outside.y}:doorCenter(mission.door));
                } else member.setData('escortPoint',undefined);
            }
        }
    }
    private soldierEscortAct(npc:Actor) {
        const mission=npc.getData('escortMission') as EscortMission|undefined;
        if(!mission||mission.door.health<=0)return false;
        const members=this.humanActors.filter(a=>a.getData('role')==='soldier'&&a.getData('escortMission')===mission).sort((a,b)=>a.getData('npcId')-b.getData('npcId'));
        const slot=members.indexOf(npc),center=doorCenter(mission.door);
        if(mission.phase==='seal'&&slot===0) {
            npc.setData('intent','FECHANDO ABRIGO');
            if(mission.door.open) {
                const handle={x:center.x,y:mission.door.y-30};
                this.tacticalMove(npc,handle,npc.getData('speed'));
                if(visible(npc,center,C.doors.interactionRadius,true)&&this.elapsed>=(npc.getData('doorTryAt')??0)) {
                    npc.setData('doorTryAt',this.elapsed+.4);
                    const living=mission.civilians.filter(a=>a.active);
                    if(escortArrived(mission.door,living))this.npcDoor(npc,mission.door);
                }
            }
            if(!mission.door.open) {this.secureEscort(mission);this.say(npc,'Abrigo fechado. Vamos buscar outros civis.',3);}
            return true;
        }
        if(mission.phase==='boarding'&&slot===0) {
            const pending=mission.civilians.filter(a=>a.active&&insideBuilding(a)?.id!==mission.door.id&&humanSees(npc,a,C.tactics.escortRange));
            pending.sort((a,b)=>Math.hypot(b.x-center.x,b.y-center.y)-Math.hypot(a.x-center.x,a.y-center.y));
            if(!mission.door.open&&mission.allowReopen&&pending.some(a=>Math.hypot(a.x-center.x,a.y-center.y)<140)) {
                npc.setData('intent','RECEBENDO CIVIS');this.tacticalMove(npc,{x:center.x+mission.door.w/2-10,y:mission.door.y-20},npc.getData('speed'));
                if(visible(npc,center,C.doors.interactionRadius,true))this.npcDoor(npc,mission.door);
                return true;
            }
            const tail=pending[0];
            if(tail&&Math.hypot(tail.x-center.x,tail.y-center.y)>120) {
                const forward=direction(center.x-tail.x,center.y-tail.y),guide={x:tail.x+forward.x*38,y:tail.y+forward.y*38};
                npc.setData('intent','GUIANDO CIVIS');this.tacticalMove(npc,blocked(guide,15)?tail:guide,npc.getData('speed'));return true;
            }
        }
        let goal=escortCoverPoint(mission.door,Math.max(0,slot));
        if(blocked(goal,15))goal={x:center.x,y:mission.door.y-48};
        npc.setData('intent','COBRINDO CIVIS');
        this.tacticalMove(npc,goal,npc.getData('speed'));return true;
    }
    private tacticalMove(npc:Actor,goal:Point,speed:number) {
        if(Math.hypot(npc.x-goal.x,npc.y-goal.y)<15) {npc.setVelocity(0,0);return;}
        const key=`${Math.floor(goal.x/CELL)},${Math.floor(goal.y/CELL)}`;
        if(npc.getData('tacticalKey')!==key)npc.setData({tacticalKey:key,tacticalRoute:navigation(goal)});
        this.steer(npc,goal,speed,npc.getData('tacticalRoute'));
    }
    private formationPoint(origin:Point,slot:number,radius:number) {
        for(let n=0;n<8;n++) { const angle=slot*2.399+n*Math.PI/4,p={x:origin.x+Math.cos(angle)*radius,y:origin.y+Math.sin(angle)*radius};if(!blocked(p,15)&&visible(origin,p,radius+1))return p; }
        return origin;
    }
    private allyFollowAct(npc:Actor,threat:Point|undefined,speed:number) {
        const track=npc.getData('guardTrack') as AllyTrack|undefined;
        if(!track?.actor.active||track.until<this.elapsed)return false;
        if(threat&&Math.hypot(track.point.x-threat.x,track.point.y-threat.y)<C.tactics.shelterDangerRadius)return false;
        const medical=npc.getData('role')==='medic';
        const room=medical?insideBuilding(npc):undefined,exit=room?doors.find(d=>d.id===room.id):undefined;
        if(exit&&!exit.open&&exit.health>0&&insideBuilding(track.point)!==room) {
            npc.setData('intent','ACOMPANHANDO ESQUADRÃO');
            if(visible(npc,doorCenter(exit),C.doors.interactionRadius,true))this.npcDoor(npc,exit);
            else this.tacticalMove(npc,{x:doorCenter(exit).x,y:exit.y+35},speed);
            return true;
        }
        const goal=this.formationPoint(track.point,npc.getData('npcId'),medical?C.tactics.medicFollowDistance:C.tactics.civilianGuardDistance);
        if(threat&&Math.hypot(goal.x-threat.x,goal.y-threat.y)<Math.hypot(npc.x-threat.x,npc.y-threat.y)*.8)return false;
        npc.setData('intent',medical?'ACOMPANHANDO ESQUADRÃO':'COM SOLDADO');this.tacticalMove(npc,goal,speed);return true;
    }
    private soldierFormationAct(npc:Actor,threat:Point|undefined) {
        if(this.soldierEscortAct(npc))return true;
        const medic=npc.getData('medicTrack') as AllyTrack|undefined,leader=npc.getData('leaderTrack') as AllyTrack|undefined;
        const track=medic?.actor.active&&medic.until>=this.elapsed&&threat?medic:leader?.actor.active&&leader.until>=this.elapsed?leader:undefined;
        if(!track)return false;
        let anchor=track.point;
        const room=insideBuilding(anchor),door=room?doors.find(d=>d.id===room.id):undefined;
        if(door&&!door.open&&insideBuilding(npc)!==room)anchor={x:doorCenter(door).x,y:door.y-40};
        let goal=this.formationPoint(anchor,npc.getData('npcId'),medic===track?C.tactics.escortDistance:C.tactics.squadSpacing);
        if(medic===track&&threat&&!door) {
            const d=direction(threat.x-anchor.x,threat.y-anchor.y),cover={x:anchor.x+d.x*42,y:anchor.y+d.y*42};
            if(!blocked(cover,15))goal=cover;
        }
        npc.setData('intent',medic===track?'ESCOLTA':'ESQUADRÃO');
        this.tacticalMove(npc,goal,npc.getData('speed'));return true;
    }
    private soldierExploreAct(npc:Actor,threat:Point|undefined) {
        if(threat)return false;
        let goal=npc.getData('searchGoal') as Point|undefined;
        if(this.elapsed>=(npc.getData('searchCheckAt')??0)) {
            const previous=npc.getData('searchPosition') as Point|undefined;
            if(previous&&Math.hypot(npc.x-previous.x,npc.y-previous.y)<5)goal=undefined;
            npc.setData({searchPosition:{x:npc.x,y:npc.y},searchCheckAt:this.elapsed+C.civilian.roamStuckSeconds});
        }
        if(!goal||this.elapsed>=(npc.getData('searchUntil')??0)||Math.hypot(npc.x-goal.x,npc.y-goal.y)<35) {
            goal=rescueSearchGoal(npc);npc.setData({searchGoal:goal,searchUntil:this.elapsed+C.tactics.rescueSearchLifetime});
        }
        npc.setData('intent','PROCURANDO CIVIS');this.tacticalMove(npc,goal,npc.getData('speed'));return true;
    }
    private npcDoor(npc:Actor,door:Door) {
        if(!visible(npc,doorCenter(door),C.doors.interactionRadius,true))return false;
        if(!toggleDoor(door,[this.player,...this.humanActors.filter(a=>a.active),...this.zombies.getChildren() as Actor[]]))return false;
        this.doorChanged(door);this.localSound('door',doorCenter(door),.5);return true;
    }
    private planShelter(npc:Actor,threat:Point|undefined) {
        if(!threat||npc.getData('followPlayer')||npc.getData('refuge')||this.elapsed<(npc.getData('safetyPlanAt')??0))return;
        npc.setData('safetyPlanAt',this.elapsed+C.tactics.shelterPlanInterval);
        if(Math.random()*100>=C.tactics.shelterChancePercent)return;
        const known=(this.zombies.getChildren() as Actor[]).filter(z=>humanSees(npc,z,C.civilian.sightRadius));
        const door=chooseShelter(npc,threat,known,undefined,d=>remainingShelterPlaces(this.shelterOccupancy(d))>0);
        if(door) {npc.setData('refuge',{door,phase:'enter',deadline:this.elapsed+C.tactics.shelterEntryTimeout,holdUntil:0} satisfies Refuge);this.say(npc,'Vou me trancar!',2);}
    }
    private shelterAct(npc:Actor,threat:Point|undefined,speed:number) {
        const plan=npc.getData('refuge') as Refuge|undefined;if(!plan)return false;
        const door=plan.door,room=interiors.find(b=>b.id===door.id)!;
        const contained=insideBuilding(npc)===room,center=doorCenter(door);
        const escort=plan.escortId!==undefined?this.escortMissions.get(plan.escortId):undefined;
        const waiting=!!escort||[...this.escortMissions.values()].some(m=>m.door===door);
        if(door.health<=0||(threat&&insideBuilding(threat)===room)||(plan.phase==='enter'&&this.elapsed>plan.deadline)||(!contained&&!door.open&&plan.phase==='enter'&&!escort)) {
            npc.setData('refuge',undefined);npc.setData('safetyPlanAt',this.elapsed+2);if(door.health<=0)npc.setData('evacuationUntil',0);return false;
        }
        if(plan.phase==='enter') {
            npc.setData('intent',escort?'ESCOLTADO':'BUSCANDO ABRIGO');
            if(contained&&canCloseFromInside(npc,door)) {
                if(waiting||!door.open||this.npcDoor(npc,door)) {
                    plan.phase='hide';plan.holdUntil=this.elapsed+C.tactics.shelterHoldSeconds;this.say(npc,'Vou ficar aqui. Estou com medo.',3);
                    for(const soldier of this.humanActors) {const track=soldier.getData('medicTrack') as AllyTrack|undefined;if(track?.actor===npc)track.until=plan.holdUntil;}
                }
            }
            this.tacticalMove(npc,!door.open&&escort?{x:center.x,y:door.y-38}:shelterEntryPoint(door),speed);return true;
        }
        if(plan.phase==='hide') {
            npc.setData('intent',plan.settled?'CIVIL RESGATADO':escort?'ABRIGADO · ESCOLTA':'ABRIGADO · MEDO');
            if(waiting)plan.holdUntil=Math.max(plan.holdUntil,this.elapsed+3);
            if(threat)plan.holdUntil=Math.max(plan.holdUntil,this.elapsed+5);
            if(!waiting&&door.open&&(plan.settled||this.elapsed<plan.holdUntil)) {
                if(!canCloseFromInside(npc,door)) {this.tacticalMove(npc,{x:center.x,y:door.y+35},speed);return true;}
                if(this.elapsed>=(npc.getData('doorTryAt')??0)) {npc.setData('doorTryAt',this.elapsed+.5);this.npcDoor(npc,door);}
            }
            if(shouldLeaveShelter(!!plan.settled,this.elapsed,plan.holdUntil,!!threat)) {
                // Walk back to the handle before opening; no remote operation.
                const handle={x:center.x,y:door.y+35};
                if(Math.hypot(npc.x-handle.x,npc.y-handle.y)>14) {this.tacticalMove(npc,handle,speed);return true;}
                if(!door.open)this.npcDoor(npc,door);
                if(door.open)plan.phase='leave';
            } else {this.tacticalMove(npc,this.formationPoint({x:center.x,y:room.y+122},npc.getData('npcId'),escort||plan.settled?36:15),speed);return true;}
        }
        npc.setData('intent','SAINDO DO ABRIGO');this.tacticalMove(npc,{x:center.x,y:door.y-42},speed);
        if(!contained&&npc.y<door.y-30) {npc.setData('refuge',undefined);npc.setData('safetyPlanAt',this.elapsed+C.tactics.shelterPlanInterval);}
        return true;
    }
    private nearestDoor() {
        return doors.filter(d=>d.health>0 && visible(this.player,doorCenter(d),C.doors.interactionRadius,true))
            .sort((a,b)=>Math.hypot(this.player.x-doorCenter(a).x,this.player.y-doorCenter(a).y)-Math.hypot(this.player.x-doorCenter(b).x,this.player.y-doorCenter(b).y))[0];
    }
    private doorChanged(door: Door) {
        (this.doorBodies.get(door)!.body as Phaser.Physics.Arcade.StaticBody).enable=!door.open && door.health>0;
        // Navigation handles adapt to door masks lazily; infected routes ignore leaves already.
    }
    private useDoor(door: Door) {
        if (!visible(this.player,doorCenter(door),C.doors.interactionRadius,true)) return;
        if(!toggleDoor(door,[this.player,...this.civilians.getChildren() as Actor[],...this.zombies.getChildren() as Actor[]])) {
            this.notice=door.health<=0?'Esta porta foi destruída.':'Passagem ocupada: afaste-se para fechar.'; return;
        }
        this.closeMenu(); this.doorChanged(door);
        this.localSound('door',doorCenter(door),.65);
        this.notice=door.open?'Porta aberta.':'Porta fechada. Os infectados podem quebrá-la!';
    }
    private roomExposed(room: Building) {
        const door=doors.find(d=>d.id===room.id)!;
        return insideBuilding(this.player)===room || (door.open && visible(this.player,doorCenter(door),C.interiors.revealDistance,true));
    }
    private canRender(point: Point) {
        const room=insideBuilding(point);
        return (!room || this.roomExposed(room)) && humanSees(this.player,point,SIGHT);
    }
    private drawDoors() {
        for(const art of this.interiorArt) { const exposed=this.roomExposed(art.building); art.roof.setVisible(!exposed); art.sign.setVisible(!exposed); }
        const g=this.doorGraphics; g.clear();
        const nearest=this.nearestDoor(); this.doorLabel.setVisible(!!nearest);
        if(nearest) this.doorLabel.setPosition(doorCenter(nearest).x,nearest.y-9).setText(`[F] ${nearest.open?'FECHAR':'ABRIR'} · ${nearest.health}`);
        for(const door of doors) {
            const center=doorCenter(door);
            if(!visible(this.player,center,SIGHT,true)) continue;
            if(door.health<=0) {
                g.lineStyle(4,0x6c513b).lineBetween(door.x+8,door.y+2,door.x+27,door.y+17).lineBetween(door.x+44,door.y+13,door.x+65,door.y-2); continue;
            }
            g.fillStyle(door.open?0x797e62:0x815d40).fillRect(door.x,door.y,door.open?6:door.w,door.open?door.w:door.h);
            g.lineStyle(1,0xd3b780,.65).strokeRect(door.x,door.y,door.open?6:door.w,door.open?door.w:door.h);
            if(!door.open) {
                g.fillStyle(0x1a201c).fillRect(door.x,door.y-5,door.w,3);
                g.fillStyle(door.health<C.doors.health*.4?0xc36d51:0xaba477).fillRect(door.x,door.y-5,door.w*door.health/C.doors.health,3);
                g.fillStyle(0xcebd83).fillCircle(door.x+door.w-8,door.y+door.h/2,2);
            }
        }
    }
    private bashDoor(z: Actor) {
        const door=doors.find(d=>!d.open && d.health>0 && visible(z,doorCenter(d),C.doors.attackRange,true));
        if(!door) return;
        const center=doorCenter(door); z.setVelocity(0,0); z.rotation=Math.atan2(center.y-z.y,center.x-z.x);
        if(this.elapsed<(z.getData('doorHitAt')??0)) return;
        z.setData('doorHitAt',this.elapsed+C.doors.attackInterval);
        const result=hitDoor(door,z.getData('mutant'));
        this.localSound(result.broken?'door-break':'door-hit',center,.75);
        this.noises.push({...center,radius:160,until:this.elapsed+.3});
        if(result.broken) {
            this.doorChanged(door);
            if(visible(this.player,center,SIGHT,true)) this.notice='A porta cedeu! Os infectados podem entrar.';
        }
    }
    private spawnHorde(wave: number) {
        const normals = wave === 1 ? C.population.zombies : C.waves.zombiesPerHorde;
        const mutants = Math.max(wave === 1 ? C.population.mutants : C.waves.mutantsPerHorde,C.waves.minimumMutants);
        const patrol: Patrol = { ...this.newPatrolGoal(C.waves.spawn), expires:this.elapsed+C.horde.lifetimeMax };
        const points = entryPoints(normals+mutants);
        points.forEach((point,index)=>this.spawn(point,index>=normals).setData('patrol',patrol));
        this.notice = `HORDA ${wave}/${C.waves.reinforcements+1} · ENTRADA OESTE`;
    }
    private maintainMutants() {
        const living = (this.zombies.getChildren() as Actor[]).filter(z=>z.active && z.getData('mutant')).length;
        const count = missingMutants(living,this.waves.nextAt()!==undefined);
        if (count) {
            for (const point of entryPoints(count)) this.spawn(point,true);
            this.notice = 'Outro rastejante entrou pela entrada oeste!';
        }
    }
    private infect(civilian: Actor, attacker: Actor) {
        if (this.dead || this.paused || this.outcome)
            return;
        if (!civilian.active)
            return;
        const previous=civilian.getData('state') as CivilianState;
        const hit = biteCivilian(previous, this.elapsed);
        if(hit.state.health<previous.health)this.bloodHit(civilian,attacker,true,hit.converted);
        civilian.setData('state', hit.state);
        if (hit.state.health < (civilian.getData('lastVoiceHealth') ?? C.civilian.health) && !hit.converted && this.elapsed >= (civilian.getData('helpAt') ?? 0)) {
            this.voice(civilian, 'help'); this.say(civilian, 'Socorro! Me ajudem!', 2); civilian.setData('helpAt', this.elapsed+C.audio.helpInterval);
        }
        civilian.setData('lastVoiceHealth',hit.state.health);
        if (hit.converted) {
            this.localSound('npc-death',civilian,.9);
            if (visible(this.player, civilian, C.audio.growlRadius))
                soundscape.play('infection', .8, (civilian.x - this.player.x) / C.audio.growlRadius);
            // Remove the living body before spawning: multiple overlaps cannot infect it twice.
            const position = { x: civilian.x, y: civilian.y };
            this.civilianFields.delete(civilian);
            (civilian.getData('panicLabel') as Phaser.GameObjects.Text).destroy();
            (civilian.getData('roleLabel') as Phaser.GameObjects.Text).destroy();
            (civilian.getData('bubble') as Phaser.GameObjects.Text).destroy();
            civilian.destroy();
            this.spawn(position);
            this.infections++;
            this.recordKill(attacker);
            this.notice = 'Um civil morreu e se transformou!';
        }
    }
    private damage(attacker: Actor) {
        if (this.dead || this.paused || this.outcome)
            return;
        if (this.elapsed < this.hurtUntil)
            return;
        this.health = Math.max(0, this.health - C.zombie.contactDamage);
        this.bloodHit(this.player,attacker,true,this.health===0);
        soundscape.play(this.health > 0 ? 'hurt' : 'death');
        this.hurtUntil = this.elapsed + C.player.invulnerability;
        this.cameras.main.shake(100, C.feedback.shakeOnDamage);
        if (!this.health) {
            this.recordKill(attacker);
            this.closeMenu();
            this.dead = true;
            if(C.gore.enabled) {this.player.setVisible(false);this.gun.setVisible(false);}
            this.physics.pause();
            soundscape.gameOver();
        }
    }
    private shoot() {
        if (this.dead || this.paused || this.outcome || this.pistol.remaining > 0 || this.elapsed - this.shotAt < C.pistol.shotInterval)
            return;
        if (!this.pistol.shoot()) {
            soundscape.play('empty');
            this.notice = this.pistol.reserve ? 'Vazio · [R/E] recarregar' : 'Vazio · encontre caixas amarelas';
            return;
        }
        this.shotAt = this.elapsed;
        soundscape.play('shot');
        const pointer = this.input.activePointer, aim = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
        const angle = shotAngle(Math.atan2(aim.y - this.player.y, aim.x - this.player.x), this.recoil, this.player.body!.velocity.length() > 5, Math.random(), darknessSpread(this.player));
        this.recoil = Math.min(C.pistol.maxRecoil, this.recoil + C.pistol.recoilPerShot);
        this.push(this.player, angle + Math.PI, C.pistol.kickSpeed, .09);
        this.player.rotation = angle;
        const end = { x: this.player.x + Math.cos(angle) * C.pistol.range, y: this.player.y + Math.sin(angle) * C.pistol.range };
        let distance = wallDistance(this.player, end), victim: Actor | undefined;
        for (const obj of this.zombies.getChildren()) {
            const z = obj as Actor, hit = bulletHit(this.player, angle, z);
            if (hit < distance) {
                distance = hit;
                victim = z;
            }
        }
        if (victim) {
            soundscape.play('hit', .7, (victim.x - this.player.x) / SIGHT);
            const hit = zombieHit(victim.getData('health'), Math.random(), victim.getData('mutant'));
            this.bloodHit(victim,this.player,false,hit.health===0,hit.critical);
            victim.setData('health', hit.health);
            victim.setData('hitUntil', this.elapsed + C.feedback.hitFlashSeconds);
            if (hit.critical) {
                this.criticalText.setPosition(victim.x, victim.y - 24).setVisible(true);
                this.notice = hit.health ? 'CRÍTICO · criatura ferida!' : 'CRÍTICO · abatido!';
            }
            else
                this.notice = hit.health ? `Acerto · zumbi ${hit.health}/${victim.getData('maxHealth')}` : 'Zumbi abatido.';
            if (!hit.health) {
                this.localSound(victim.getData('mutant') ? 'mutant-death' : 'zombie-death',victim,.85);
                victim.destroy();
                this.kills++;
            }
        }
        this.effects.clear().fillStyle(0xffd38a,.12).fillCircle(this.player.x,this.player.y,32).fillStyle(0xffe7ad,.25).fillCircle(this.player.x,this.player.y,10).lineStyle(2, 0xf2d591, .9).lineBetween(this.player.x, this.player.y, this.player.x + Math.cos(angle) * distance, this.player.y + Math.sin(angle) * distance);
        this.noises.push({ x: this.player.x, y: this.player.y, radius: C.pistol.noiseRadius, until: this.elapsed + C.pistol.noiseSeconds });
        this.cameras.main.shake(55, C.feedback.shakeOnShot);
    }
    private bloodHit(victim:Actor,source:Point,human:boolean,lethal:boolean,critical=false,strength=1) {
        if(!C.gore.enabled)return;
        const angle=Math.atan2(victim.y-source.y,victim.x-source.x),key=victim.texture.key;
        if(lethal) {
            const role=victim.getData('role') as NpcRole|undefined;
            const color=victim===this.player?0x80715a:role==='medic'?0x759e91:role==='soldier'?0x697251:key.includes('red')?0x94564b:key.includes('yellow')?0xa39050:key.includes('blue')?0x526d84:victim.getData('mutant')?0x995259:key.includes('suit')?0x4e575c:0x59654b;
            this.gore.field.death(victim,angle,color,human,critical);
        } else this.gore.field.impact(victim,angle,strength*(critical?1.8:1),human);
        this.localSound('splat',victim,lethal?.65:.3);
    }
    private localSound(effect: Parameters<typeof soundscape.play>[0], source: Point, volume = 1) {
        const distance = Math.hypot(source.x-this.player.x,source.y-this.player.y);
        if (distance >= C.audio.effectRadius) return;
        soundscape.play(effect,volume*(1-distance/C.audio.effectRadius),(source.x-this.player.x)/C.audio.effectRadius);
    }
    private voice(npc: Actor, effect: 'panic' | 'help') {
        const distance = Math.hypot(npc.x-this.player.x,npc.y-this.player.y);
        if (distance >= C.audio.voiceRadius) return;
        soundscape.play(effect,.85*(1-distance/C.audio.voiceRadius),(npc.x-this.player.x)/C.audio.voiceRadius);
    }
    private closeMenu() {
        if (this.menuNpc?.active) this.menuNpc.setData('busyUntil', this.elapsed + .3);
        this.menu?.remove(); this.menu = undefined; this.menuNpc = undefined;
    }
    private openMenu(npc: Actor) {
        this.closeMenu();
        if (!visible(this.player, npc, C.npc.interactionRadius)) { this.notice = 'Aproxime-se para conversar.'; return; }
        this.menuNpc = npc;
        npc.setData('busyUntil', this.elapsed + 30);
        const menu = document.createElement('div'); this.menu = menu;
        menu.className = 'npc-menu'; menu.setAttribute('role','dialog'); menu.setAttribute('aria-label','Interagir com NPC');
        const role = npc.getData('role') as NpcRole;
        const title = document.createElement('strong'); title.textContent = role === 'soldier' ? 'SOLDADO' : role === 'medic' ? 'MÉDICO' : 'SOBREVIVENTE'; menu.append(title);
        const options = [['Conversar','talk'], ['Perguntar sobre perigo','danger'], [npc.getData('followPlayer')?'Pare de me seguir':'Siga-me',npc.getData('followPlayer')?'unfollow':'follow']];
        if (role !== 'civilian') options.push([role === 'medic' ? 'Pedir atendimento' : 'Pedir munição','help']);
        options.push(['Fechar','close']);
        for (const [label, action] of options) {
            const button = document.createElement('button'); button.textContent = label;
            button.onclick = () => { if (action !== 'close' && !this.paused && !this.dead && !this.outcome && npc.active && visible(this.player,npc,C.npc.interactionRadius)) this.interact(npc,action); this.closeMenu(); }; menu.append(button);
        }
        menu.onpointerdown = e => e.stopPropagation();
        document.getElementById('app')!.append(menu);
    }
    private recordKill(z: Actor) {
        if (!z.active) return;
        const result = humanKill(z.getData('humanKills') ?? 0, z.getData('mutant'));
        z.setData('humanKills', result.kills);
        if (result.evolves) {
            z.setTexture('mutant'); this.setupActor(z);
            z.setData({ mutant:true, health:C.mutant.health, maxHealth:C.mutant.health, speed:C.mutant.speed });
            this.notice = 'Três vítimas! Um zumbi evoluiu para RASTEJANTE.';
            if (visible(this.player,z,SIGHT)) { soundscape.play('infection'); this.cameras.main.shake(180,.004); }
        }
    }
    private push(actor: Actor, angle: number, speed: number, seconds: number) {
        actor.setData({ pushUntil:this.elapsed+seconds, pushX:Math.cos(angle)*speed, pushY:Math.sin(angle)*speed }); this.pushed(actor);
    }
    private pushed(actor: Actor) {
        if (this.elapsed >= (actor.getData('pushUntil') ?? 0)) return false;
        actor.setVelocity(actor.getData('pushX'),actor.getData('pushY')); return true;
    }
    private melee(actor: Actor) {
        if (this.elapsed < (actor.getData('meleeAt') ?? 0)) return false;
        let target: Actor | undefined, range = C.melee.range;
        for (const z of this.zombies.getChildren() as Actor[]) {
            const d = Math.hypot(actor.x-z.x,actor.y-z.y);
            const facing = Math.atan2(z.y-actor.y,z.x-actor.x);
            if (d < range && visible(actor,z,C.melee.range) && (actor !== this.player || Math.abs(Phaser.Math.Angle.Wrap(facing-actor.rotation)) < 1.2)) { target=z; range=d; }
        }
        if (!target) return false;
        const untrained = actor !== this.player && actor.getData('role') !== 'soldier';
        actor.setData('meleeAt',this.elapsed+(untrained?C.melee.civilianCooldown:C.melee.cooldown));
        const angle = Math.atan2(target.y-actor.y,target.x-actor.x);
        this.push(target,angle,untrained?C.melee.civilianKnockbackSpeed:C.melee.knockbackSpeed,untrained?C.melee.civilianKnockbackSeconds:C.melee.knockbackSeconds);
        target.setData({ health:Math.max(0,target.getData('health')-(untrained?C.melee.civilianDamage:C.melee.damage)),hitUntil:this.elapsed+.15 });
        this.bloodHit(target,actor,false,target.getData('health')===0,false,.6);
        this.npcShots.push({ from:{x:actor.x,y:actor.y}, to:{x:target.x,y:target.y}, until:this.elapsed+.14 });
        if (visible(this.player,target,SIGHT)) soundscape.play('hit',.5);
        if (!target.getData('health')) { this.localSound(target.getData('mutant') ? 'mutant-death' : 'zombie-death',target,.8); target.destroy(); if (actor === this.player) this.kills++; else this.npcKills++; }
        return true;
    }
    private say(npc: Actor, text: string, seconds = 2.5) {
        (npc.getData('bubble') as Phaser.GameObjects.Text).setText(text);
        npc.setData('bubbleUntil', this.elapsed + seconds);
    }
    private nearestNpc() {
        let result: Actor | undefined, distance = C.npc.interactionRadius;
        for (const obj of this.civilians.getChildren()) {
            const npc = obj as Actor, d = Phaser.Math.Distance.Between(this.player.x, this.player.y, npc.x, npc.y);
            if (d < distance && visible(this.player, npc, C.npc.interactionRadius)) {
                result = npc;
                distance = d;
            }
        }
        return result;
    }
    private interact(npc: Actor, action = 'help') {
        const role = npc.getData('role') as NpcRole;
        if(action==='follow'||action==='unfollow') {
            this.orderFollowing(npc,action==='follow');
        }
        else if (action === 'talk' || action === 'danger') {
            this.say(npc, action === 'danger' ? (npc.getData('alertUntil') > this.elapsed ? 'Tem mortos perto! Não fique aqui!' : 'Não vi nada agora. Escute antes de cruzar.') : 'Estamos tentando sobreviver. Fique perto e atento.');
        }
        else if (role === 'medic') {
            const result = provideAid(this.health, C.player.health, npc.getData('aid'), this.elapsed);
            if (result.healed) {
                this.health = result.health;
                npc.setData('aid', result.aid);
                this.say(npc, `Pronto. Recuperei ${result.healed} de vida.`);
                soundscape.play('pickup', .5);
                this.notice = `Médico: +${result.healed} de vida.`;
            }
            else {
                const aid = npc.getData('aid') as AidState;
                const text = this.health >= C.player.health ? 'Você está bem. Vá com cuidado.' : aid.charges <= 0 ? 'Acabaram os meus curativos.' : 'Estou atendendo. Espere um pouco.';
                this.say(npc, text);
                this.notice = text;
            }
        }
        else if (role === 'soldier') {
            const result = donateAmmo(npc.getData('ammo'));
            npc.setData('ammo', result.ammo);
            if (result.given) {
                this.pistol.reserve += result.given;
                this.say(npc, `Pegue ${result.given} balas. Eu cubro a rua.`);
                soundscape.play('pickup', .5);
                this.notice = `Soldado: +${result.given} balas.`;
            }
            else {
                const text = result.ammo.rounds ? 'Fique atento. Não tenho mais munição para dividir.' : 'Estou sem munição. Precisamos sair daqui.';
                this.say(npc, text);
                this.notice = text;
            }
        }
        else {
            const text = npc.getData('alertUntil') > this.elapsed ? 'Tem mortos por perto! Procure os soldados.' : 'Estou procurando uma saída. Cuidado nas vielas.';
            this.say(npc, text);
            this.notice = text;
        }
        npc.setData('busyUntil', this.elapsed + 1.2);
    }
    private soldierAct(npc: Actor) {
        const ammo = npc.getData('ammo') as SoldierAmmo;
        if (!ammo.rounds)
            return false;
        let target: Actor | undefined, distance = C.npc.soldierRange, bestScore=Infinity;
        const medical=npc.getData('medicTrack') as AllyTrack|undefined;
        const escortPoint=npc.getData('escortPoint') as Point|undefined;
        const protection=escortPoint?{point:escortPoint}:medical;
        for (const obj of this.zombies.getChildren()) {
            const z = obj as Actor, d = Phaser.Math.Distance.Between(npc.x, npc.y, z.x, z.y);
            const score=d+(protection?Math.hypot(z.x-protection.point.x,z.y-protection.point.y)*.9:0);
            if (d < C.npc.soldierRange && score<bestScore && humanSees(npc, z, C.npc.soldierRange)) {
                target = z; bestScore=score;
                distance = d;
            }
        }
        if (!target)
            return false;
        if (!ammo.magazine) {
            if (!npc.getData('reloadUntil'))
                npc.setData('reloadUntil', this.elapsed + C.npc.soldierReloadSeconds);
            if (this.elapsed >= npc.getData('reloadUntil')) {
                ammo.magazine = Math.min(C.npc.soldierClip, ammo.rounds);
                npc.setData('reloadUntil', 0);
            }
            return false;
        }
        if (this.elapsed >= npc.getData('nextShot')) {
            npc.setData('nextShot', this.elapsed + C.npc.soldierShotInterval);
            ammo.rounds--;
            ammo.magazine--;
            const angle = shotAngle(Math.atan2(target.y-npc.y,target.x-npc.x), .04, npc.body!.velocity.length() > 5, Math.random(), darknessSpread(npc));
            this.push(npc, angle + Math.PI, C.pistol.kickSpeed, .09);
            let ray = wallDistance(npc, { x:npc.x+Math.cos(angle)*C.npc.soldierRange, y:npc.y+Math.sin(angle)*C.npc.soldierRange });
            let victim: Actor | undefined;
            for (const z of this.zombies.getChildren() as Actor[]) { const d = bulletHit(npc, angle, z); if (d < ray) { ray=d; victim=z; } }
            const position = { x:npc.x+Math.cos(angle)*ray, y:npc.y+Math.sin(angle)*ray };
            const hit = victim ? zombieHit(victim.getData('health'), Math.random(), victim.getData('mutant')) : {health:1,critical:false};
            if(victim)this.bloodHit(victim,npc,false,hit.health===0,hit.critical);
            victim?.setData({ health: hit.health, hitUntil: this.elapsed + C.feedback.hitFlashSeconds });
            if (!hit.health) {
                if (victim) this.localSound(victim.getData('mutant') ? 'mutant-death' : 'zombie-death',victim,.8);
                victim?.destroy();
                this.npcKills++;
            }
            this.npcShots.push({ from: { x: npc.x, y: npc.y }, to: position, until: this.elapsed + .08 });
            this.noises.push({ x: npc.x, y: npc.y, radius: C.pistol.noiseRadius, until: this.elapsed + C.pistol.noiseSeconds });
            const playerDistance = Phaser.Math.Distance.Between(this.player.x, this.player.y, npc.x, npc.y);
            if (playerDistance < 400)
                soundscape.play('rifle', .65 * (1 - playerDistance / 400), (npc.x - this.player.x) / 400);
        }
        npc.rotation = Math.atan2(target.y - npc.y, target.x - npc.x);
        return !npc.getData('escortMission') && distance > C.npc.soldierRetreatRange && (!protection||Math.hypot(npc.x-protection.point.x,npc.y-protection.point.y)<C.tactics.escortDistance*1.8);
    }
    private medicAct(npc: Actor) {
        const aid = npc.getData('aid') as AidState;
        if (!aid.charges || this.elapsed < aid.readyAt)
            return false;
        let patient: Actor | undefined, distance = C.npc.healSeekRange;
        for (const obj of this.civilians.getChildren()) {
            const other = obj as Actor, state = other.getData('state') as CivilianState;
            if (other === npc || state.infected || state.health >= C.civilian.health)
                continue;
            const d = Phaser.Math.Distance.Between(npc.x, npc.y, other.x, other.y);
            if (d < distance && humanSees(npc, other, C.npc.healSeekRange)) {
                patient = other;
                distance = d;
            }
        }
        if (!patient)
            return false;
        if (distance <= C.npc.healRange) {
            const state = patient.getData('state') as CivilianState, result = provideAid(state.health, C.civilian.health, aid, this.elapsed);
            if (result.healed) {
                state.health = result.health;
                npc.setData('aid', result.aid);
                this.say(npc, 'Segure firme. Vou cuidar disso.', 2);
                this.say(patient, 'Obrigado!', 1.5);
                npc.setData('busyUntil', this.elapsed + .8);
            }
            npc.setVelocity(0, 0);
        }
        else
            this.steer(npc, patient, npc.getData('speed'));
        return true;
    }
    private socialize(npc: Actor) {
        if (this.elapsed < (npc.getData('socialAt') ?? 0))
            return;
        npc.setData('socialAt', this.elapsed + C.npc.socialInterval + Math.random() * 4);
        if (Math.random() * 100 >= C.npc.socialTalkPercent)
            return;
        for (const obj of this.civilians.getChildren()) {
            const other = obj as Actor;
            if (other === npc || other.getData('bubbleUntil') > this.elapsed || !visible(npc, other, C.npc.socialRadius))
                continue;
            if ((other.getData('panic') as PanicState).mode !== 'calm')
                continue;
            this.say(npc, npc.getData('role') === 'soldier' ? 'Fique atento. Vou cobrir esta rua.' : npc.getData('role') === 'medic' ? 'Se estiver ferido, me avise.' : 'Você viu uma saída?', 2);
            this.say(other, 'Cuidado. Vamos nos manter vivos.', 2);
            npc.setData('busyUntil', this.elapsed + .6);
            break;
        }
    }
    private steer(actor: Actor, target: Point, speed: number, field?: (p: Point) => Point) {
        const goal = visible(actor, target, 4000) ? target : field?.(actor) ?? target;
        const d = direction(goal.x - actor.x, goal.y - actor.y);
        actor.setVelocity(d.x * speed, d.y * speed);
        if (d.x || d.y)
            actor.rotation = Math.atan2(d.y, d.x);
    }
    private newPatrolGoal(from: Point) {
        let goal = this.freePoint();
        for (let i = 0; i < 40 && Phaser.Math.Distance.Between(from.x, from.y, goal.x, goal.y) < C.horde.destinationMinDistance; i++)
            goal = this.freePoint();
        return { goal, route: navigation(goal,true), changeAt: this.elapsed + C.horde.destinationSeconds };
    }
    private roam(civilian: Actor) {
        if (this.elapsed < (civilian.getData('walkAt') ?? 0)) {
            civilian.setVelocity(0, 0);
            return;
        }
        let goal = civilian.getData('walkGoal') as Point | undefined;
        if (goal && this.elapsed >= (civilian.getData('walkCheckAt') ?? 0)) {
            const previous = civilian.getData('walkPosition') as Point;
            if (Phaser.Math.Distance.Between(previous.x, previous.y, civilian.x, civilian.y) < 8)
                goal = undefined;
            civilian.setData({ walkPosition: { x: civilian.x, y: civilian.y }, walkCheckAt: this.elapsed + C.civilian.roamStuckSeconds });
        }
        if (!goal || this.elapsed >= civilian.getData('walkUntil')) {
            const destination = roamDestination(civilian);
            goal = destination.goal;
            civilian.setData({ walkGoal: goal, walkRoute: destination.route, walkUntil: this.elapsed + C.civilian.roamDestinationSeconds,
                walkPosition: { x: civilian.x, y: civilian.y }, walkCheckAt: this.elapsed + C.civilian.roamStuckSeconds });
        }
        if (Phaser.Math.Distance.Between(civilian.x, civilian.y, goal.x, goal.y) <= C.civilian.roamArrivalRadius) {
            const pause = Math.random() * 100 < C.civilian.roamPausePercent ? C.civilian.roamPauseMin + Math.random() * (C.civilian.roamPauseMax - C.civilian.roamPauseMin) : 0;
            civilian.setData({ walkGoal: undefined, walkAt: this.elapsed + pause });
            civilian.setVelocity(0, 0);
            return;
        }
        this.steer(civilian, goal, civilian.getData('speed'), civilian.getData('walkRoute'));
    }
    private patrol(z: Actor, neighbors: Actor[]) {
        let patrol = z.getData('patrol') as Patrol | undefined;
        if (patrol && patrol.expires <= this.elapsed)
            patrol = undefined;
        const idle = neighbors.filter(other => (other.getData('memory') ?? 0) <= this.elapsed);
        if (!patrol && idle.length && this.elapsed >= (z.getData('herdAt') ?? 0)) {
            z.setData('herdAt', this.elapsed + C.horde.joinIntervalMin + Math.random() * (C.horde.joinIntervalMax - C.horde.joinIntervalMin));
            if (Math.random() < HERD_CHANCE) {
                patrol = idle.map(other => other.getData('patrol') as Patrol | undefined).find(p => p && p.expires > this.elapsed);
                if (!patrol) {
                    patrol = { ...this.newPatrolGoal(z), expires: this.elapsed + C.horde.lifetimeMin + Math.random() * (C.horde.lifetimeMax - C.horde.lifetimeMin) };
                    idle[0].setData('patrol', patrol);
                }
            }
        }
        z.setData('patrol', patrol);
        if (!patrol)
            return false;
        if (this.elapsed >= patrol.changeAt || Phaser.Math.Distance.Between(z.x, z.y, patrol.goal.x, patrol.goal.y) < C.horde.arrivalRadius)
            Object.assign(patrol, this.newPatrolGoal(z));
        const waypoint = visible(z, patrol.goal, 4000) ? patrol.goal : patrol.route(z);
        const group = neighbors.filter(other => other.getData('patrol') === patrol);
        const d = patrolDirection(z, waypoint, group);
        z.setVelocity(d.x * C.horde.patrolSpeed, d.y * C.horde.patrolSpeed);
        z.rotation = Math.atan2(d.y, d.x);
        return true;
    }
    update(_now: number, delta: number) {
        if (this.restartRequested) {
            this.scene.stop('overlay');
            this.scene.restart();
            return;
        }
        if (!this.dead && !this.outcome && this.pauseRequested) {
            this.paused = !this.paused;
            if (this.paused)
                this.physics.pause();
            else
                this.physics.resume();
        }
        this.pauseRequested = false;
        if (!this.dead&&!this.outcome)
            soundscape.setPaused(this.paused);
        if (this.dead || this.paused || this.outcome) {
            if(this.dead&&!this.paused)this.gore.step(Math.min(delta/1000,.05));
            return;
        }
        const dt = Math.min(delta / 1000, .05);
        this.elapsed += dt;
        for (const wave of this.waves.due(this.elapsed)) this.spawnHorde(wave);
        this.outcome=matchOutcome((this.civilians.getChildren() as Actor[]).filter(a=>a.active&&a.getData('role')==='civilian').length,this.zombies.countActive(),this.waves.nextAt()===undefined);
        if(this.outcome) {this.physics.pause();this.closeMenu();soundscape.setPaused(true);return;}
        this.maintainMutants();
        this.recoil = Math.max(0, this.recoil - C.pistol.recoilRecovery * dt);
        if (this.menuNpc && (!this.menuNpc.active || !visible(this.player, this.menuNpc, C.npc.interactionRadius))) this.closeMenu();
        if (this.interactRequested) {
            this.interactRequested = false;
            const door = this.nearestDoor();
            const npc = this.nearestNpc();
            if (door) this.useDoor(door);
            else if (npc)
                this.openMenu(npc);
            else
                this.notice = 'Aproxime-se de alguém e pressione F.';
        }
        if (this.elapsed - this.shotAt > C.feedback.shotTrailSeconds)
            this.effects.clear();
        if (this.elapsed - this.shotAt > C.feedback.criticalTextSeconds)
            this.criticalText.setVisible(false);
        if (this.reloadRequested) {
            this.reloadRequested = false;
            if (this.pistol.reload()) {
                this.notice = 'Recarregando…';
                soundscape.play('reload');
            }
            else if (!this.pistol.remaining)
                this.notice = this.pistol.magazine === C.pistol.magazineSize ? 'Carregador cheio.' : 'Sem munição de reserva.';
        }
        if (this.pistol.step(dt)) {
            this.notice = 'Carregada.';
            soundscape.play('ready');
        }
        const axis = direction(Number(this.keys.D.isDown || this.keys.RIGHT.isDown) - Number(this.keys.A.isDown || this.keys.LEFT.isDown), Number(this.keys.S.isDown || this.keys.DOWN.isDown) - Number(this.keys.W.isDown || this.keys.UP.isDown));
        const moving = !!(axis.x || axis.y), s = staminaStep(this.stamina, moving, this.keys.SHIFT.isDown, this.exhausted, dt);
        this.stamina = s.value;
        this.exhausted = s.exhausted;
        if (!this.pushed(this.player)) this.player.setVelocity(axis.x * (s.running ? RUN : WALK), axis.y * (s.running ? RUN : WALK));
        const travelled = Math.hypot(this.player.x - this.lastPlayerPosition.x, this.player.y - this.lastPlayerPosition.y);
        this.lastPlayerPosition = { x: this.player.x, y: this.player.y };
        if (moving && travelled > .05 && this.elapsed >= this.stepAt) {
            soundscape.play('step', s.running ? .8 : .45, Math.sin(this.elapsed * 17) * .2);
            this.stepAt = this.elapsed + (s.running ? .28 : .44);
        }
        const pointer = this.input.activePointer, world = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
        this.player.rotation = Math.atan2(world.y - this.player.y, world.x - this.player.x);
        this.gun.setPosition(this.player.x + Math.cos(this.player.rotation) * 7, this.player.y + Math.sin(this.player.rotation) * 7).setRotation(this.player.rotation);
        this.player.setAlpha(this.elapsed < this.hurtUntil ? (Math.floor(this.elapsed * 12) % 2 ? .35 : 1) : 1);
        this.noises = this.noises.filter(n => n.until > this.elapsed);
        if (this.elapsed > this.fieldAt) {
            this.fieldAt = this.elapsed + C.world.navigationRefreshSeconds;
            this.playerField = navigation(this.player,true);
            this.civilianFields.clear();
        }
        this.humanActors=this.civilians.getChildren() as Actor[];
        this.planTactics();
        for (const obj of this.civilians.getChildren()) {
            const civilian = obj as Actor;
            civilian.setData('intent','');
            const role=civilian.getData('role') as NpcRole;
            let nearest: Point | undefined, range = Math.max(C.civilian.sightRadius, C.civilian.hearingRadius);
            for (const obj of this.zombies.getChildren()) {
                const z = obj as Actor, d = Phaser.Math.Distance.Between(civilian.x, civilian.y, z.x, z.y);
                if (d < range && (humanSees(civilian, z, C.civilian.sightRadius) || d < C.civilian.hearingRadius)) {
                    range = d;
                    nearest = z;
                }
            }
            if (nearest) {
                const fresh = (civilian.getData('alertUntil') ?? 0) <= this.elapsed;
                civilian.setData({ alertPoint: { x: nearest.x, y: nearest.y }, alertUntil: this.elapsed + C.npc.alertSeconds });
                if (fresh && Math.random() < .25)
                    this.say(civilian, 'Mortos! Cuidado!', 1.5);
            }
            else {
                // Information travels locally and keeps its original expiry, avoiding endless relays.
                for (const obj of this.civilians.getChildren()) {
                    const friend = obj as Actor;
                    if (friend === civilian || (friend.getData('alertUntil') ?? 0) <= this.elapsed || !visible(civilian, friend, C.npc.socialRadius))
                        continue;
                    const point = friend.getData('alertPoint') as Point;
                    civilian.setData({ alertPoint: { ...point }, alertUntil: friend.getData('alertUntil') });
                    break;
                }
                if ((civilian.getData('alertUntil') ?? 0) > this.elapsed) {
                    nearest = civilian.getData('alertPoint') as Point;
                    range = Phaser.Math.Distance.Between(civilian.x, civilian.y, nearest.x, nearest.y);
                }
            }
            const beforePanic = civilian.getData('panic') as PanicState;
            const panic = panicStep(beforePanic, this.elapsed, !!nearest, Math.random, role==='civilian'?C.panic.civilianChancePercent/100:C.panic.chancePercent/100);
            if(role!=='soldier')this.planShelter(civilian,nearest);
            if (beforePanic.mode === 'calm' && panic.mode !== 'calm') {
                this.voice(civilian,'panic'); this.say(civilian,'SOCORRO!',2);
                civilian.setData('helpAt',this.elapsed+C.audio.voiceCooldown+.15);
            } else if (nearest && panic.mode !== 'calm' && this.elapsed >= (civilian.getData('helpAt') ?? 0)) {
                this.voice(civilian,'help'); this.say(civilian,'Me ajudem!',2); civilian.setData('helpAt',this.elapsed+C.audio.helpInterval);
            }
            civilian.setData('panic', panic);
            if(civilian.getData('followPlayer'))civilian.setData('playerTrack',observeFollowLeader(civilian.getData('playerTrack'),humanSees(civilian,this.player,C.tactics.playerFollowSight)?this.player:undefined,this.elapsed));
            const following=!!civilian.getData('followPlayer'),followTrack=civilian.getData('playerTrack') as FollowMemory|undefined;
            const catchingUp=following&&!!followTrack&&followTrack.until>=this.elapsed&&Math.hypot(civilian.x-followTrack.point.x,civilian.y-followTrack.point.y)>C.tactics.playerFollowSprintDistance;
            const isMoving = panic.mode !== 'freeze';
            const wantsSprint = catchingUp || panic.mode === 'flee' || (!!nearest && range <= C.civilian.sprintDistance);
            const effort = staminaStep(civilian.getData('stamina'), isMoving, wantsSprint, civilian.getData('exhausted'), dt, C.civilian.stamina);
            civilian.setData({ stamina: effort.value, exhausted: effort.exhausted });
            civilian.setTint(panic.mode === 'calm' ? 0xffffff : 0xffc178);
            if (nearest || panic.mode !== 'calm')
                civilian.setData({ walkGoal: undefined, walkAt: 0 });
            const striking = panic.mode === 'calm' && this.melee(civilian);
            const defending = !striking && role === 'soldier' && panic.mode === 'calm' && this.soldierAct(civilian);
            if (this.pushed(civilian)) { /* preserve physical weapon recoil */ }
            else if (panic.mode === 'freeze')
                civilian.setVelocity(0, 0);
            else if (!following&&role!=='soldier'&&this.shelterAct(civilian,nearest,effort.running?C.civilian.runSpeed:civilian.getData('speed'))) { /* run to a known refuge */ }
            else if (panic.mode === 'flee') {
                // Panic ignores threat direction; solid walls still stop the civilian.
                const body = civilian.body as Phaser.Physics.Arcade.Body;
                if (body.blocked.left || body.blocked.right || body.blocked.up || body.blocked.down) {
                    if (this.elapsed >= (civilian.getData('panicTurnAt') ?? 0)) {
                        panic.angle += Math.PI / 2 + Math.random() * Math.PI;
                        civilian.setData('panicTurnAt', this.elapsed + C.panic.obstacleTurnSeconds);
                    }
                }
                const speed = effort.running ? C.panic.runSpeed : civilian.getData('speed');
                civilian.setVelocity(Math.cos(panic.angle) * speed, Math.sin(panic.angle) * speed);
                civilian.rotation = panic.angle;
            }
            else if (this.followPlayerAct(civilian,effort.running?C.civilian.runSpeed:civilian.getData('speed'))) { /* explicit player order */ }
            else if (defending)
                civilian.setVelocity(0, 0);
            else if (!nearest && this.elapsed < (civilian.getData('busyUntil') ?? 0))
                civilian.setVelocity(0, 0);
            else if (role==='soldier'&&this.soldierFormationAct(civilian,nearest)) { /* escort or regroup */ }
            else if (role==='soldier'&&this.soldierExploreAct(civilian,nearest)) { /* active search patrol */ }
            else if (role==='medic'&&nearest&&this.allyFollowAct(civilian,nearest,effort.running?C.civilian.runSpeed:civilian.getData('speed'))) { /* seek cover with the squad */ }
            else if (role==='civilian'&&this.allyFollowAct(civilian,nearest,effort.running?C.civilian.runSpeed:civilian.getData('speed'))) { /* seek local protection */ }
            else if (nearest) {
                let goal: Point = civilian, best = -Infinity;
                for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
                    const p = { x: civilian.x + Math.cos(a) * C.civilian.escapeLookahead, y: civilian.y + Math.sin(a) * C.civilian.escapeLookahead };
                    if (blocked(p, 22) || !visible(civilian, p, C.civilian.escapeLookahead + 5))
                        continue;
                    const score = Math.hypot(p.x - nearest.x, p.y - nearest.y);
                    if (score > best) {
                        best = score;
                        goal = p;
                    }
                }
                this.steer(civilian, goal, effort.running ? C.civilian.runSpeed : civilian.getData('speed'));
            }
            else if (this.elapsed < (civilian.getData('busyUntil') ?? 0))
                civilian.setVelocity(0, 0);
            else if (role === 'medic' && this.medicAct(civilian)) { /* treatment takes priority over following */ }
            else if(role==='medic'&&this.allyFollowAct(civilian,undefined,civilian.getData('speed'))) { /* accompany the squad */ }
            else {
                this.roam(civilian);
                this.socialize(civilian);
            }
            const state = civilian.getData('state') as CivilianState;
            civilian.setAlpha(this.elapsed < state.hurtUntil ? .4 : 1);
            civilian.setVisible(this.canRender(civilian));
            (civilian.getData('panicLabel') as Phaser.GameObjects.Text).setPosition(civilian.x, civilian.y - 20).setVisible(C.panic.showLabel && civilian.visible && panic.mode !== 'calm');
            const squadSize=civilian.getData('squadSize')??1, intent=civilian.getData('intent') as string;
            const caption=role==='soldier'?`SOLDADO${!following&&squadSize>1?` · E${civilian.getData('squad')+1}`:''}${following?' · COM VOCÊ':civilian.getData('escortMission')?' · ESCOLTA CIVIS':intent==='PROCURANDO CIVIS'?' · BUSCA':civilian.getData('medicTrack')?' · PROTEÇÃO':''}`:role==='medic'?`+ MÉDICO${intent?' · '+intent:''}`:intent;
            (civilian.getData('roleLabel') as Phaser.GameObjects.Text).setText(caption);
            (civilian.getData('roleLabel') as Phaser.GameObjects.Text).setPosition(civilian.x, civilian.y - (panic.mode === 'calm' ? 24 : 40)).setVisible(civilian.visible && !!caption);
            (civilian.getData('bubble') as Phaser.GameObjects.Text).setPosition(civilian.x, civilian.y - 58).setVisible(civilian.visible && this.elapsed < civilian.getData('bubbleUntil'));
        }
        const close = this.nearestNpc();
        const closeDoor=this.nearestDoor();
        this.interactionHint = closeDoor ? `[F / CLIQUE] ${closeDoor.open?'fechar':'abrir'} porta · ${closeDoor.health}/${C.doors.health}` : close ? '[CLIQUE / F] opções de interação' : 'F / clique: portas e NPCs próximos';
        this.drawDoors();
        this.npcEffects.clear();
        this.npcShots = this.npcShots.filter(shot => shot.until > this.elapsed);
        for (const shot of this.npcShots)
            if (visible(this.player, shot.from, SIGHT))
                this.npcEffects.fillStyle(0xffd38a,.08).fillCircle(shot.from.x,shot.from.y,24).lineStyle(1, 0xe2c493, .85).lineBetween(shot.from.x, shot.from.y, shot.to.x, shot.to.y);
        this.healthBars.clear();
        for (const obj of this.zombies.getChildren()) {
            const z = obj as Actor;
            let target: Actor | undefined;
            for (const actor of [this.player, ...this.civilians.getChildren() as Actor[]]) {
                const audible = actor === this.player ? (moving ? (s.running ? C.zombie.runHearing : C.zombie.walkHearing) : 0) : (actor.body!.velocity.length() > 0 ? C.zombie.civilianHearing : 0);
                if (visible(z, actor, C.zombie.sightRadius) || Phaser.Math.Distance.Between(z.x, z.y, actor.x, actor.y) < audible) {
                    if (!target || Phaser.Math.Distance.Between(z.x, z.y, actor.x, actor.y) < Phaser.Math.Distance.Between(z.x, z.y, target.x, target.y))
                        target = actor;
                }
            }
            if (target) {
                z.setData('goal', { x: target.x, y: target.y });
                z.setData('memory', this.elapsed + C.zombie.memorySeconds);
            }
            else {
                const noise = this.noises.find(n => Phaser.Math.Distance.Between(z.x, z.y, n.x, n.y) < n.radius);
                if (noise) {
                    z.setData('goal', { x: noise.x, y: noise.y });
                    z.setData('memory', this.elapsed + C.zombie.memorySeconds);
                }
            }
            const goal = z.getData('goal') as Point | null;
            if (goal && this.elapsed < z.getData('memory')) {
                let field = target === this.player ? this.playerField : undefined;
                if (target && target !== this.player) {
                    field = this.civilianFields.get(target);
                    if (!field) {
                        field = navigation(target,true);
                        this.civilianFields.set(target, field);
                    }
                }
                // Lost targets leave a position, not an omniscient live reference.
                let memoryField = z.getData('memoryField') as ((p: Point) => Point) | undefined;
                const key = `${Math.floor(goal.x / CELL)},${Math.floor(goal.y / CELL)}`;
                if (!field && key !== z.getData('memoryKey')) {
                    memoryField = navigation(goal,true);
                    z.setData('memoryField', memoryField);
                    z.setData('memoryKey', key);
                }
                this.steer(z, goal, z.getData('speed'), field ?? memoryField);
                if (Phaser.Math.Distance.Between(z.x, z.y, goal.x, goal.y) < C.zombie.arrivalRadius) {
                    z.setVelocity(0, 0);
                    z.setData('memory', 0);
                }
            }
            else {
                const neighbors = (this.zombies.getChildren() as Actor[]).filter(other => other !== z && visible(z, other, C.horde.neighborRadius));
                if (!this.patrol(z, neighbors)) {
                    const body = z.body as Phaser.Physics.Arcade.Body;
                    const stuck = body.blocked.left || body.blocked.right || body.blocked.up || body.blocked.down;
                    if (this.elapsed > z.getData('turnAt') || (stuck && this.elapsed > (z.getData('avoidAt') ?? 0))) {
                        let angle = wanderAngle(z, neighbors, Math.random() * Math.PI * 2, Math.random());
                        // Select a free local heading instead of continually pushing into a wall.
                        for (let attempt = 0; attempt < 8; attempt++) {
                            const ahead = { x: z.x + Math.cos(angle) * 45, y: z.y + Math.sin(angle) * 45 };
                            if (!blocked(ahead, 20) && visible(z, ahead, 50))
                                break;
                            angle += Math.PI / 4;
                        }
                        z.setData('wander', angle);
                        z.setData('turnAt', this.elapsed + C.zombie.wanderTurnMin + Math.random() * (C.zombie.wanderTurnMax - C.zombie.wanderTurnMin));
                        z.setData('avoidAt', this.elapsed + C.zombie.obstacleTurnSeconds);
                    }
                    const a = z.getData('wander');
                    z.setVelocity(Math.cos(a) * (z.getData('mutant') ? C.mutant.speed : C.zombie.wanderSpeed), Math.sin(a) * (z.getData('mutant') ? C.mutant.speed : C.zombie.wanderSpeed));
                    z.rotation = a;
                }
            }
            this.bashDoor(z);
            this.pushed(z);
            z.setVisible(this.canRender(z));
            z.setTint(this.elapsed < (z.getData('hitUntil') ?? 0) ? 0xff8877 : 0xffffff);
            if (z.visible) {
                this.healthBars.fillStyle(0x170c0b).fillRect(z.x - 12, z.y - 19, 24, 4);
                this.healthBars.fillStyle(0xb85e4a).fillRect(z.x - 12, z.y - 19, 24 * z.getData('health') / z.getData('maxHealth'), 4);
            }
        }
        for (const obj of this.ammo.getChildren()) {
            const box = obj as Phaser.GameObjects.Rectangle;
            box.setVisible(this.canRender(box));
        }
        // New infections coexist with the three scheduled hordes.
        if (this.elapsed >= this.growlAt) {
            const nearby = (this.zombies.getChildren() as Actor[]).filter(z => visible(this.player, z, C.audio.growlRadius));
            if (nearby.length) {
                const z = Phaser.Utils.Array.GetRandom(nearby);
                const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, z.x, z.y);
                soundscape.play('growl', 1 - distance / (C.audio.growlRadius + 1), (z.x - this.player.x) / (C.audio.growlRadius + 1));
            }
            this.growlAt = this.elapsed + 2 + Math.random() * 2;
        }
        this.gore.step(dt);
    }
}
class Overlay extends Phaser.Scene {
    private district!: District;
    private hud!: Phaser.GameObjects.Text;
    private message!: Phaser.GameObjects.Text;
    private map!: Phaser.GameObjects.Graphics;
    private crosshair!: Phaser.GameObjects.Graphics;
    private explored = new Set<number>();
    constructor() { super('overlay'); }
    create() {
        this.district = this.scene.get('district') as District;
        this.explored = new Set();
        if (this.textures.exists('shade'))
            this.textures.remove('shade');
        const shade = this.textures.createCanvas('shade', WIDTH, HEIGHT)!;
        const ctx = shade.context, gradient = ctx.createRadialGradient(WIDTH / 2, HEIGHT / 2, C.vision.clearScreenRadius, WIDTH / 2, HEIGHT / 2, C.vision.darkScreenRadius);
        gradient.addColorStop(0, 'rgba(2,6,5,0)');
        gradient.addColorStop(.7, 'rgba(2,6,5,.55)');
        gradient.addColorStop(1, 'rgba(2,6,5,1)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
        shade.refresh();
        this.add.image(0, 0, 'shade').setOrigin(0);
        this.hud = this.add.text(22, 20, '', { fontFamily: 'monospace', fontSize: '14px', fontStyle: 'bold', resolution: 2, color: '#d1ccb3', lineSpacing: 7, backgroundColor: '#080e0bd9', padding: { x: 10, y: 8 } });
        this.map = this.add.graphics();
        this.add.text(738, 177, 'EXPLORADO / VISÃO ATUAL', { fontFamily: 'monospace', fontSize: '10px', color: '#939b86' });
        this.message = this.add.text(480, 320, '', { fontFamily: 'monospace', fontSize: '22px', color: '#e1d8c1', align: 'center', backgroundColor: '#101716ee', padding: { x: 25, y: 20 } }).setOrigin(.5).setVisible(false);
        this.crosshair = this.add.graphics();
        this.add.text(22, 609, 'MOUSE mirar · CLIQUE atirar · F porta/NPC · DIREITO corpo a corpo · R/E recarregar · ENTER reiniciar', { fontFamily: 'monospace', fontSize: '11px', color: '#a9ac97' });
    }
    update() {
        const d = this.district, p = d.player;
        if (!p)
            return;
        this.hud.setText(`DEAD DISTRICT · NEUSTADT\nVIDA ${d.health}   FÔLEGO ${Math.ceil(d.stamina)}${d.exhausted ? ' · EXAUSTO' : ''}\nPISTOLA ${d.pistol.magazine}/${C.pistol.magazineSize}   RESERVA ${d.pistol.reserve}${d.pistol.remaining > 0 ? ` · RECARGA ${d.pistol.remaining.toFixed(1)}s` : ''}\nZUMBIS ${d.zombies.countActive()}   CIVIS ${(d.civilians.getChildren() as Actor[]).filter(a=>a.getData('role')==='civilian').length}   ABATES ${d.kills} / NPC ${d.npcKills}\n${Math.floor(d.elapsed)}s   INFECÇÕES ${d.infections}\n${d.notice}\n${d.interactionHint}\nHORDA ${d.waves.delivered}/${C.waves.reinforcements+1}${d.waves.nextAt() !== undefined ? ` · PRÓXIMA ${Math.ceil(d.waves.nextAt()!-d.elapsed)}s` : ' · ÚLTIMA LANÇADA'}\nLUZ ${Math.round(lightAt(p)*100)}%${darknessSpread(p)>.06 ? ' · MIRA PREJUDICADA' : ''}`);
        const cell = CELL, cols = WORLD_W / cell, scale = Math.min(192 / WORLD_W, 144 / WORLD_H), mx = 744, my = 27;
        for (let y = Math.max(0, Math.floor((p.y - SIGHT) / cell)); y < Math.min(WORLD_H / cell, (p.y + SIGHT) / cell); y++)
            for (let x = Math.max(0, Math.floor((p.x - SIGHT) / cell)); x < Math.min(cols, (p.x + SIGHT) / cell); x++) {
                const q = { x: x * cell + cell / 2, y: y * cell + cell / 2 }, dist = Phaser.Math.Distance.Between(p.x, p.y, q.x, q.y);
                if (dist < humanSight(p,q,SIGHT) && wallDistance(p, q) >= dist - 44)
                    this.explored.add(y * cols + x);
            }
        const g = this.map;
        g.clear().fillStyle(0x020605, .97).fillRect(mx - 5, my - 5, WORLD_W * scale + 10, WORLD_H * scale + 10);
        for (const id of this.explored) {
            const x = id % cols * cell, y = Math.floor(id / cols) * cell;
            g.fillStyle(blocked({ x: x + cell / 2, y: y + cell / 2 }, 0) ? 0x101713 : humanSees(p, { x: x + cell / 2, y: y + cell / 2 }, SIGHT) ? 0x505c4a : 0x252e28);
            g.fillRect(mx + x * scale, my + y * scale, cell * scale, cell * scale);
        }
        for (const obj of d.zombies.getChildren()) {
            const z = obj as Actor;
            if (z.visible)
                g.fillStyle(0xb16854).fillCircle(mx + z.x * scale, my + z.y * scale, 1.5);
        }
        for (const obj of d.civilians.getChildren()) {
            const civilian = obj as Actor;
            if (civilian.visible)
                g.fillStyle(0x86c6d2).fillCircle(mx + civilian.x * scale, my + civilian.y * scale, 2);
        }
        g.lineStyle(1,0xea9473).strokeRect(mx+C.waves.spawn.x*scale-3,my+C.waves.spawn.y*scale-3,6,6);
        g.fillStyle(0xf2e3af).fillCircle(mx + p.x * scale, my + p.y * scale, 2.5);
        g.lineStyle(1, 0x6b745f).strokeRect(mx - 5, my - 5, WORLD_W * scale + 10, WORLD_H * scale + 10);
        this.message.setPosition(480,d.dead?500:320).setVisible(d.paused || d.dead || !!d.outcome).setText(d.outcome ? `${d.outcome==='victory'?'CIDADE LIMPA · VITÓRIA':'TODOS OS CIVIS FORAM PERDIDOS'}\n\n${d.kills+d.npcKills} abates · ${Math.floor(d.elapsed)}s\n\n[ENTER] jogar novamente` : d.dead ? `VOCÊ NÃO SAIU DA CIDADE\n\n${d.kills} abates · ${Math.floor(d.elapsed)}s\n\n[ENTER] tentar novamente` : 'PAUSADO\n\n[P] continuar');
        const pointer = d.input.activePointer;
        const canvas = d.game.canvas.getBoundingClientRect();
        this.crosshair.setVisible(pointer.x >= 0 && pointer.x <= WIDTH && pointer.y >= 0 && pointer.y <= HEIGHT && d.input.manager.isOver && canvas.width > 0);
        const aimRadius = 6 + darknessSpread(p) * 90;
        this.crosshair.clear().lineStyle(1, 0xe3d8b6, .9).strokeCircle(pointer.x, pointer.y, aimRadius).lineBetween(pointer.x - 10, pointer.y, pointer.x - 3, pointer.y).lineBetween(pointer.x + 3, pointer.y, pointer.x + 10, pointer.y).lineBetween(pointer.x, pointer.y - 10, pointer.x, pointer.y - 3).lineBetween(pointer.x, pointer.y + 3, pointer.x, pointer.y + 10);
    }
}
showStartMenu(()=>new Phaser.Game({ type: Phaser.AUTO, parent: 'app', width: WIDTH, height: HEIGHT, pixelArt: true, backgroundColor: '#101313', scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }, physics: { default: 'arcade', arcade: { debug: false } }, scene: [District, Overlay], callbacks: { postBoot(game) { game.canvas.tabIndex = 0; game.canvas.setAttribute('aria-label', 'Dead District — área do jogo'); } } }));
