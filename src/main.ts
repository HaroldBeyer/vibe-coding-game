import Phaser from 'phaser';
import { config as C } from './config';
import { direction, staminaStep, WALK, RUN } from './survival';
import { WORLD_W, WORLD_H, CELL, buildings, blocked, visible, wallDistance, navigation, bulletHit, spawnPoint, type Point } from './world';
import './style.css';
import { Pistol, zombieHit, biteCivilian, ZOMBIE_HEALTH, type CivilianState } from './combat';
import { INITIAL_CIVILIANS, INITIAL_ZOMBIES, HERD_CHANCE, wanderAngle, patrolDirection, calmState, panicStep, type PanicState } from './behavior';
const WIDTH = 960, HEIGHT = 640, SIGHT = C.vision.radius;
type Actor = Phaser.Physics.Arcade.Image;
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
    private effects!: Phaser.GameObjects.Graphics;
    private healthBars!: Phaser.GameObjects.Graphics;
    private criticalText!: Phaser.GameObjects.Text;
    health = C.player.health;
    stamina = C.stamina.max;
    exhausted = false;
    elapsed = 0;
    dead = false;
    paused = false;
    pistol = new Pistol();
    kills = 0;
    infections = 0;
    notice = 'Encontre munição. O barulho atrai os mortos.';
    private hurtUntil = 0;
    private shotAt = -1;
    private noises: Noise[] = [];
    private playerField = navigation(C.player.spawn);
    private civilianFields = new Map<Actor, (p: Point) => Point>();
    private reloadRequested = false;
    private restartRequested = false;
    private pauseRequested = false;
    private fieldAt = 0;
    constructor() { super('district'); }
    create() {
        Object.assign(this, { health: C.player.health, stamina: C.stamina.max, exhausted: false, elapsed: 0, dead: false, paused: false, kills: 0, infections: 0, hurtUntil: 0, shotAt: -1, fieldAt: 0 });
        this.pistol = new Pistol();
        this.civilianFields.clear();
        this.reloadRequested = this.restartRequested = this.pauseRequested = false;
        this.noises = [];
        this.notice = 'Encontre munição. O barulho atrai os mortos.';
        this.physics.resume();
        this.physics.world.setBounds(18, 18, WORLD_W - 36, WORLD_H - 36);
        this.cameras.main.setBackgroundColor('#191e1c').setZoom(C.vision.zoom);
        const g = this.add.graphics();
        g.fillStyle(0x282d29);
        for (let x = 30; x < WORLD_W; x += C.world.blockSpacingX)
            g.fillRect(x, 0, 80, WORLD_H);
        for (let y = 390; y < WORLD_H; y += C.world.blockSpacingY)
            g.fillRect(0, y, WORLD_W, 140);
        const random = new Phaser.Math.RandomDataGenerator(['district-02']);
        for (let i = 0; i < C.world.rubbleCount; i++) {
            g.fillStyle(random.pick([0x404239, 0x111715, 0x555143]), .5);
            g.fillRect(random.between(20, WORLD_W - 20), random.between(20, WORLD_H - 20), random.between(2, 9), random.between(2, 5));
        }
        const walls = this.physics.add.staticGroup();
        for (const b of buildings) {
            walls.add(this.add.rectangle(b.x + b.w / 2, b.y + b.h / 2, b.w, b.h, 0x111715).setStrokeStyle(3, 0x45483d));
            g.fillStyle(0x43493d);
            g.fillRect(b.x + 12, b.y + 12, b.w - 24, 4);
            for (let y = b.y + 32; y < b.y + b.h - 20; y += 46) {
                g.fillStyle(0x303b32);
                g.fillRect(b.x + 10, y, 6, 16);
            }
        }
        this.add.text(1135, 825, 'ZONA MORTA / DISTRITO 04', { fontFamily: 'monospace', fontSize: '11px', color: '#707560' });
        this.makeTexture('survivor', 0xd1ccb3, 0x535e55);
        this.makeTexture('zombie', 0x829073, 0x3a483e);
        this.makeTexture('npc', 0x97bac0, 0x3d5964);
        this.player = this.physics.add.image(C.player.spawn.x, C.player.spawn.y, 'survivor').setCircle(9, 3, 3).setCollideWorldBounds(true).setDepth(5);
        this.gun = this.add.rectangle(0, 0, 17, 5, 0xc1b8a0).setOrigin(0, .5).setDepth(6);
        this.effects = this.add.graphics().setDepth(8);
        this.healthBars = this.add.graphics().setDepth(9);
        this.criticalText = this.add.text(0, 0, 'CRÍTICO!', { fontFamily: 'monospace', fontSize: '12px', color: '#f1b76b', backgroundColor: '#181009' }).setOrigin(.5).setDepth(10).setVisible(false);
        this.zombies = this.physics.add.group();
        this.civilians = this.physics.add.group();
        this.ammo = this.physics.add.staticGroup();
        this.physics.add.collider(this.player, walls);
        this.physics.add.collider(this.civilians, walls);
        this.physics.add.collider(this.civilians, this.civilians);
        this.physics.add.collider(this.zombies, walls);
        this.physics.add.collider(this.zombies, this.zombies);
        this.physics.add.overlap(this.player, this.zombies, () => this.damage());
        this.physics.add.overlap(this.civilians, this.zombies, (civilian) => this.infect(civilian as Actor));
        this.physics.add.overlap(this.player, this.ammo, (_p, box) => {
            if (this.dead || this.paused)
                return;
            box.destroy();
            this.pistol.reserve += C.ammo.roundsPerBox;
            this.notice = `+${C.ammo.roundsPerBox} balas · [R/E] recarregar`;
        });
        this.keys = this.input.keyboard!.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SHIFT') as Record<string, Phaser.Input.Keyboard.Key>;
        this.input.keyboard!.addCapture(['UP', 'DOWN', 'LEFT', 'RIGHT', 'SHIFT']);
        this.input.mouse?.disableContextMenu();
        // Queue discrete commands on keydown: very short taps must not disappear between frames.
        const command = (event: KeyboardEvent) => {
            if (event.repeat)
                return;
            if (event.code === 'KeyR' || event.code === 'KeyE')
                this.reloadRequested = !this.paused && !this.dead;
            if (event.code === 'Enter')
                this.restartRequested = true;
            if (event.code === 'KeyP')
                this.pauseRequested = true;
        };
        this.input.keyboard!.on('keydown', command);
        this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
            if (p.leftButtonDown())
                this.shoot();
        });
        this.events.once('shutdown', () => {
            this.input.removeAllListeners('pointerdown');
            this.input.keyboard!.off('keydown', command);
        });
        this.cameras.main.startFollow(this.player, true, 1, 1);
        // Keep the player centered in the visibility circle even at world edges.
        for (let i = 0; i < INITIAL_ZOMBIES; i++) this.spawn(spawnPoint(this.player, C.population.zombieSafeRadius));
        for (let i = 0; i < INITIAL_CIVILIANS; i++) {
            const p = C.civilian.initialPositions[i] ?? this.freePoint();
            const civilian = this.civilians.create(p.x, p.y, 'npc') as Actor;
            civilian.setCircle(9, 3, 3).setCollideWorldBounds(true).setDepth(5);
            civilian.setData('state', { health: C.civilian.health, hurtUntil: 0, infected: false } satisfies CivilianState);
            civilian.setData('speed', i === 0 ? C.civilian.firstSpeed : Phaser.Math.Between(C.civilian.speedMin, C.civilian.speedMax));
            civilian.setData('panic', calmState());
            const label = this.add.text(0, 0, 'PÂNICO', { fontFamily: 'monospace', fontSize: '10px', color: '#ffd397', backgroundColor: '#291c13', padding: { x: 3, y: 2 } }).setOrigin(.5, 1).setDepth(10).setVisible(false);
            civilian.setData('panicLabel', label);
        }
        for (let i = 0; i < C.ammo.boxes; i++) {
            const p = i === 0 ? C.ammo.firstBox : this.freePoint();
            const box = this.add.rectangle(p.x, p.y, 13, 9, 0xc4a65b).setStrokeStyle(2, 0x514529).setDepth(3);
            this.ammo.add(box);
        }
        this.scene.launch('overlay');
    }
    private freePoint(): Point { return spawnPoint(); }
    private makeTexture(name: string, color: number, dark: number) {
        if (this.textures.exists(name))
            return;
        const g = this.make.graphics({ x: 0, y: 0 });
        g.fillStyle(0x080d0b, .5);
        g.fillEllipse(13, 16, 22, 15);
        g.fillStyle(dark);
        g.fillRect(3, 5, 18, 14);
        g.fillStyle(color);
        g.fillRect(8, 4, 10, 12);
        g.fillStyle(0x252e28);
        g.fillRect(15, 6, 3, 8);
        g.generateTexture(name, 26, 26);
        g.destroy();
    }
    private spawn(p: Point) {
        const z = this.zombies.create(p.x, p.y, 'zombie') as Actor;
        z.setCircle(9, 3, 3).setDepth(4).setCollideWorldBounds(true);
        z.setData({ health: ZOMBIE_HEALTH, speed: C.zombie.chaseSpeed, memory: 0, goal: null, wander: Math.random() * Math.PI * 2, turnAt: 0 });
        return z;
    }
    private infect(civilian: Actor) {
        if (this.dead || this.paused)
            return;
        if (!civilian.active)
            return;
        const hit = biteCivilian(civilian.getData('state') as CivilianState, this.elapsed);
        civilian.setData('state', hit.state);
        if (hit.converted) {
            // Remove the living body before spawning: multiple overlaps cannot infect it twice.
            const position = { x: civilian.x, y: civilian.y };
            this.civilianFields.delete(civilian);
            (civilian.getData('panicLabel') as Phaser.GameObjects.Text).destroy();
            civilian.destroy();
            this.spawn(position);
            this.infections++;
            this.notice = 'Um civil morreu e se transformou!';
        }
    }
    private damage() {
        if (this.dead || this.paused)
            return;
        if (this.elapsed < this.hurtUntil)
            return;
        this.health = Math.max(0, this.health - C.zombie.contactDamage);
        this.hurtUntil = this.elapsed + C.player.invulnerability;
        this.cameras.main.shake(100, C.feedback.shakeOnDamage);
        if (!this.health) {
            this.dead = true;
            this.physics.pause();
        }
    }
    private shoot() {
        if (this.dead || this.paused || this.pistol.remaining > 0 || this.elapsed - this.shotAt < C.pistol.shotInterval)
            return;
        if (!this.pistol.shoot()) {
            this.notice = this.pistol.reserve ? 'Vazio · [R/E] recarregar' : 'Vazio · encontre caixas amarelas';
            return;
        }
        this.shotAt = this.elapsed;
        const pointer = this.input.activePointer, aim = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
        const angle = Math.atan2(aim.y - this.player.y, aim.x - this.player.x);
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
            const hit = zombieHit(victim.getData('health'), Math.random());
            victim.setData('health', hit.health);
            victim.setData('hitUntil', this.elapsed + C.feedback.hitFlashSeconds);
            if (hit.critical) {
                this.criticalText.setPosition(victim.x, victim.y - 24).setVisible(true);
                this.notice = 'CRÍTICO · abatido com um tiro!';
            }
            else
                this.notice = hit.health ? `Acerto · zumbi ${hit.health}/${ZOMBIE_HEALTH}` : 'Zumbi abatido.';
            if (!hit.health) {
                victim.destroy();
                this.kills++;
            }
        }
        this.effects.clear().lineStyle(2, 0xf2d591, .9).lineBetween(this.player.x, this.player.y, this.player.x + Math.cos(angle) * distance, this.player.y + Math.sin(angle) * distance);
        this.noises.push({ x: this.player.x, y: this.player.y, radius: C.pistol.noiseRadius, until: this.elapsed + C.pistol.noiseSeconds });
        this.cameras.main.shake(55, C.feedback.shakeOnShot);
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
        return { goal, route: navigation(goal), changeAt: this.elapsed + C.horde.destinationSeconds };
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
        if (!this.dead && this.pauseRequested) {
            this.paused = !this.paused;
            if (this.paused)
                this.physics.pause();
            else
                this.physics.resume();
        }
        this.pauseRequested = false;
        if (this.dead || this.paused)
            return;
        const dt = Math.min(delta / 1000, .05);
        this.elapsed += dt;
        if (this.elapsed - this.shotAt > C.feedback.shotTrailSeconds)
            this.effects.clear();
        if (this.elapsed - this.shotAt > C.feedback.criticalTextSeconds)
            this.criticalText.setVisible(false);
        if (this.reloadRequested) {
            this.reloadRequested = false;
            if (this.pistol.reload())
                this.notice = 'Recarregando…';
            else if (!this.pistol.remaining)
                this.notice = this.pistol.magazine === C.pistol.magazineSize ? 'Carregador cheio.' : 'Sem munição de reserva.';
        }
        if (this.pistol.step(dt))
            this.notice = 'Carregada.';
        const axis = direction(Number(this.keys.D.isDown || this.keys.RIGHT.isDown) - Number(this.keys.A.isDown || this.keys.LEFT.isDown), Number(this.keys.S.isDown || this.keys.DOWN.isDown) - Number(this.keys.W.isDown || this.keys.UP.isDown));
        const moving = !!(axis.x || axis.y), s = staminaStep(this.stamina, moving, this.keys.SHIFT.isDown, this.exhausted, dt);
        this.stamina = s.value;
        this.exhausted = s.exhausted;
        this.player.setVelocity(axis.x * (s.running ? RUN : WALK), axis.y * (s.running ? RUN : WALK));
        const pointer = this.input.activePointer, world = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
        this.player.rotation = Math.atan2(world.y - this.player.y, world.x - this.player.x);
        this.gun.setPosition(this.player.x + Math.cos(this.player.rotation) * 7, this.player.y + Math.sin(this.player.rotation) * 7).setRotation(this.player.rotation);
        this.player.setAlpha(this.elapsed < this.hurtUntil ? (Math.floor(this.elapsed * 12) % 2 ? .35 : 1) : 1);
        this.noises = this.noises.filter(n => n.until > this.elapsed);
        if (this.elapsed > this.fieldAt) {
            this.fieldAt = this.elapsed + C.world.navigationRefreshSeconds;
            this.playerField = navigation(this.player);
            this.civilianFields.clear();
        }
        for (const obj of this.civilians.getChildren()) {
            const civilian = obj as Actor;
            let nearest: Actor | undefined, range = Math.max(C.civilian.sightRadius, C.civilian.hearingRadius);
            for (const obj of this.zombies.getChildren()) {
                const z = obj as Actor, d = Phaser.Math.Distance.Between(civilian.x, civilian.y, z.x, z.y);
                if (d < range && (visible(civilian, z, C.civilian.sightRadius) || d < C.civilian.hearingRadius)) {
                    range = d;
                    nearest = z;
                }
            }
            const panic = panicStep(civilian.getData('panic') as PanicState, this.elapsed, !!nearest);
            civilian.setData('panic', panic);
            civilian.setTint(panic.mode === 'calm' ? 0xffffff : 0xffc178);
            if (panic.mode === 'freeze')
                civilian.setVelocity(0, 0);
            else if (panic.mode === 'flee') {
                // Panic ignores threat direction; solid walls still stop the civilian.
                const body = civilian.body as Phaser.Physics.Arcade.Body;
                if (body.blocked.left || body.blocked.right || body.blocked.up || body.blocked.down) {
                    if (this.elapsed >= (civilian.getData('panicTurnAt') ?? 0)) {
                        panic.angle += Math.PI / 2 + Math.random() * Math.PI;
                        civilian.setData('panicTurnAt', this.elapsed + C.panic.obstacleTurnSeconds);
                    }
                }
                civilian.setVelocity(Math.cos(panic.angle) * C.panic.runSpeed, Math.sin(panic.angle) * C.panic.runSpeed);
                civilian.rotation = panic.angle;
            }
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
                this.steer(civilian, goal, civilian.getData('speed'));
            }
            else
                civilian.setVelocity(0, 0);
            const state = civilian.getData('state') as CivilianState;
            civilian.setAlpha(this.elapsed < state.hurtUntil ? .4 : 1);
            civilian.setVisible(visible(this.player, civilian, SIGHT));
            (civilian.getData('panicLabel') as Phaser.GameObjects.Text).setPosition(civilian.x, civilian.y - 20).setVisible(C.panic.showLabel && civilian.visible && panic.mode !== 'calm');
        }
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
                        field = navigation(target);
                        this.civilianFields.set(target, field);
                    }
                }
                // Lost targets leave a position, not an omniscient live reference.
                let memoryField = z.getData('memoryField') as ((p: Point) => Point) | undefined;
                const key = `${Math.floor(goal.x / CELL)},${Math.floor(goal.y / CELL)}`;
                if (!field && key !== z.getData('memoryKey')) {
                    memoryField = navigation(goal);
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
                    z.setVelocity(Math.cos(a) * C.zombie.wanderSpeed, Math.sin(a) * C.zombie.wanderSpeed);
                    z.rotation = a;
                }
            }
            z.setVisible(visible(this.player, z, SIGHT));
            z.setTint(this.elapsed < (z.getData('hitUntil') ?? 0) ? 0xff8877 : 0xffffff);
            if (z.visible) {
                this.healthBars.fillStyle(0x170c0b).fillRect(z.x - 12, z.y - 19, 24, 4);
                this.healthBars.fillStyle(0xb85e4a).fillRect(z.x - 12, z.y - 19, 24 * z.getData('health') / ZOMBIE_HEALTH, 4);
            }
        }
        for (const obj of this.ammo.getChildren()) {
            const box = obj as Phaser.GameObjects.Rectangle;
            box.setVisible(visible(this.player, box, SIGHT));
        }
        // Population grows exclusively through civilians killed by zombies.
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
        const ctx = shade.context, gradient = ctx.createRadialGradient(WIDTH/2, HEIGHT/2, C.vision.clearScreenRadius, WIDTH/2, HEIGHT/2, C.vision.darkScreenRadius);
        gradient.addColorStop(0, 'rgba(2,6,5,0)');
        gradient.addColorStop(.7, 'rgba(2,6,5,.55)');
        gradient.addColorStop(1, 'rgba(2,6,5,1)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
        shade.refresh();
        this.add.image(0, 0, 'shade').setOrigin(0);
        this.hud = this.add.text(22, 20, '', { fontFamily: 'monospace', fontSize: '13px', color: '#d1ccb3', lineSpacing: 7, backgroundColor: '#080e0bd9', padding: { x: 10, y: 8 } });
        this.map = this.add.graphics();
        this.add.text(738, 177, 'EXPLORADO / VISÃO ATUAL', { fontFamily: 'monospace', fontSize: '10px', color: '#939b86' });
        this.message = this.add.text(480, 320, '', { fontFamily: 'monospace', fontSize: '22px', color: '#e1d8c1', align: 'center', backgroundColor: '#101716ee', padding: { x: 25, y: 20 } }).setOrigin(.5).setVisible(false);
        this.crosshair = this.add.graphics();
        this.add.text(22, 609, 'MOUSE mirar · CLIQUE atirar · R/E recarregar · ENTER reiniciar · civis em âmbar: pânico', { fontFamily: 'monospace', fontSize: '11px', color: '#a9ac97' });
    }
    update() {
        const d = this.district, p = d.player;
        if (!p)
            return;
        this.hud.setText(`DEAD DISTRICT / 05\nVIDA ${d.health}   FÔLEGO ${Math.ceil(d.stamina)}${d.exhausted ? ' · EXAUSTO' : ''}\nPISTOLA ${d.pistol.magazine}/${C.pistol.magazineSize}   RESERVA ${d.pistol.reserve}${d.pistol.remaining > 0 ? ` · RECARGA ${d.pistol.remaining.toFixed(1)}s` : ''}\nZUMBIS ${d.zombies.countActive()}   CIVIS ${d.civilians.countActive()}   ABATES ${d.kills}\n${Math.floor(d.elapsed)}s   INFECÇÕES ${d.infections}\n${d.notice}`);
        const cell = CELL, cols = WORLD_W / cell, scale = Math.min(192 / WORLD_W, 144 / WORLD_H), mx = 744, my = 27;
        for (let y = Math.max(0, Math.floor((p.y - SIGHT) / cell)); y < Math.min(WORLD_H / cell, (p.y + SIGHT) / cell); y++)
            for (let x = Math.max(0, Math.floor((p.x - SIGHT) / cell)); x < Math.min(cols, (p.x + SIGHT) / cell); x++) {
                const q = { x: x * cell + cell / 2, y: y * cell + cell / 2 }, dist = Phaser.Math.Distance.Between(p.x, p.y, q.x, q.y);
                if (dist < SIGHT && wallDistance(p, q) >= dist - 44)
                    this.explored.add(y * cols + x);
            }
        const g = this.map;
        g.clear().fillStyle(0x020605, .97).fillRect(mx - 5, my - 5, WORLD_W * scale + 10, WORLD_H * scale + 10);
        for (const id of this.explored) {
            const x = id % cols * cell, y = Math.floor(id / cols) * cell;
            g.fillStyle(blocked({ x: x + cell / 2, y: y + cell / 2 }, 0) ? 0x101713 : visible(p, { x: x + cell / 2, y: y + cell / 2 }, SIGHT) ? 0x505c4a : 0x252e28);
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
        g.fillStyle(0xf2e3af).fillCircle(mx + p.x * scale, my + p.y * scale, 2.5);
        g.lineStyle(1, 0x6b745f).strokeRect(mx - 5, my - 5, WORLD_W * scale + 10, WORLD_H * scale + 10);
        this.message.setVisible(d.paused || d.dead).setText(d.dead ? `VOCÊ NÃO SAIU DA CIDADE\n\n${d.kills} abates · ${Math.floor(d.elapsed)}s\n\n[ENTER] tentar novamente` : 'PAUSADO\n\n[P] continuar');
        const pointer = d.input.activePointer;
        const canvas = d.game.canvas.getBoundingClientRect();
        this.crosshair.setVisible(pointer.x >= 0 && pointer.x <= WIDTH && pointer.y >= 0 && pointer.y <= HEIGHT && d.input.manager.isOver && canvas.width > 0);
        this.crosshair.clear().lineStyle(1, 0xe3d8b6, .9).strokeCircle(pointer.x, pointer.y, 6).lineBetween(pointer.x - 10, pointer.y, pointer.x - 3, pointer.y).lineBetween(pointer.x + 3, pointer.y, pointer.x + 10, pointer.y).lineBetween(pointer.x, pointer.y - 10, pointer.x, pointer.y - 3).lineBetween(pointer.x, pointer.y + 3, pointer.x, pointer.y + 10);
    }
}
new Phaser.Game({ type: Phaser.AUTO, parent: 'app', width: WIDTH, height: HEIGHT, pixelArt: true, backgroundColor: '#101313', scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }, physics: { default: 'arcade', arcade: { debug: false } }, scene: [District, Overlay], callbacks: { postBoot(game) { game.canvas.tabIndex = 0; game.canvas.setAttribute('aria-label', 'Dead District — área do jogo'); } } });
