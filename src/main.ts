import Phaser from 'phaser';
import { direction, staminaStep, WALK, RUN } from './survival';
import './style.css';

const WIDTH = 960, HEIGHT = 640;
class District extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Image;
  private zombies!: Phaser.Physics.Arcade.Group;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private hud!: Phaser.GameObjects.Text;
  private message!: Phaser.GameObjects.Text;
  private health = 100;
  private stamina = 100;
  private exhausted = false;
  private hurtUntil = 0;
  private elapsed = 0;
  private dead = false;
  private paused = false;
  private lastSpawn = 0;
  constructor() { super('district'); }
  create() {
    this.health = 100; this.stamina = 100; this.exhausted = false; this.hurtUntil = 0;
    this.elapsed = 0; this.dead = false; this.paused = false; this.lastSpawn = 0;
    this.physics.world.setBounds(18, 18, WIDTH - 36, HEIGHT - 36);
    this.cameras.main.setBackgroundColor('#181d1c');
    const g = this.add.graphics();
    g.fillStyle(0x242928); g.fillRect(290, 0, 380, HEIGHT); g.fillRect(0, 235, WIDTH, 170);
    // Deterministic rubble keeps the layout stable between attempts.
    const random = new Phaser.Math.RandomDataGenerator(['dead-district']);
    for (let i = 0; i < 190; i++) {
      g.fillStyle(random.pick([0x303633, 0x383b34, 0x111817]), 0.6);
      g.fillRect(random.between(25, 935), random.between(25, 615), random.between(2, 8), random.between(2, 5));
    }
    g.fillStyle(0x72705b, 0.35);
    for (let y = 20; y < HEIGHT; y += 70) g.fillRect(477, y, 5, 30);
    const walls = this.physics.add.staticGroup();
    const buildings = [[40,55,210,140],[710,45,210,145],[45,450,200,140],[720,455,195,135]];
    for (const [x,y,w,h] of buildings) {
      const wall = this.add.rectangle(x+w/2,y+h/2,w,h,0x101716).setStrokeStyle(3,0x41463c);
      walls.add(wall);
      g.fillStyle(0x41463c); g.fillRect(x+15,y+15,w-30,4);
      for (let wx=x+25; wx<x+w-15; wx+=40) { g.fillStyle(0x303b37); g.fillRect(wx,y+h-18,17,5); }
      g.fillStyle(0x555447); g.fillRect(x+w-27,y+h-30,18,24);
    }
    g.lineStyle(2,0x50594a,0.4); g.strokeRect(17,17,WIDTH-34,HEIGHT-34);
    this.add.text(65,212,'EVACUAÇÃO CANCELADA', {fontFamily:'monospace',fontSize:'10px',color:'#777d68'});
    this.add.text(742,417,'SEM SINAL', {fontFamily:'monospace',fontSize:'10px',color:'#777d68'});
    this.makeTexture('survivor',0xd1ccb3,0x535e55);
    this.makeTexture('zombie',0x829073,0x3a483e);
    this.player = this.physics.add.image(480,320,'survivor').setCircle(9,3,3).setCollideWorldBounds(true).setDepth(5);
    this.zombies = this.physics.add.group();
    this.physics.add.collider(this.player,walls);
    this.physics.add.collider(this.zombies,walls);
    this.physics.add.collider(this.zombies,this.zombies);
    this.physics.add.overlap(this.player,this.zombies,()=>this.damage());
    this.keys = this.input.keyboard!.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SHIFT,R,P') as Record<string,Phaser.Input.Keyboard.Key>;
    this.input.keyboard!.addCapture(['UP','DOWN','LEFT','RIGHT','SHIFT']);
    this.hud = this.add.text(27,25,'',{fontFamily:'monospace',fontSize:'13px',color:'#d1ccb3',lineSpacing:7}).setDepth(10);
    this.message = this.add.text(WIDTH/2,HEIGHT/2,'',{fontFamily:'monospace',fontSize:'23px',color:'#e1d8c1',align:'center',backgroundColor:'#101716ee',padding:{x:28,y:22}}).setOrigin(.5).setDepth(20).setVisible(false);
    for (let i=0;i<5;i++) this.spawn();
  }
  private makeTexture(name:string, color:number, dark:number) {
    if(this.textures.exists(name))return;
    const g=this.make.graphics({x:0,y:0});
    g.fillStyle(0x080d0b,.5);g.fillEllipse(13,16,22,15);
    g.fillStyle(dark);g.fillRect(3,5,18,14);
    g.fillStyle(color);g.fillRect(8,4,10,12);
    g.fillStyle(0x252e28);g.fillRect(15,6,3,8);
    g.generateTexture(name,26,26);g.destroy();
  }
  private spawn() {
    const spots=[[320,30],[640,610],[25,280],[935,370]];
    const [x,y]=spots[Phaser.Math.Between(0,3)];
    const z=this.zombies.create(x+Phaser.Math.Between(-7,7),y,'zombie') as Phaser.Physics.Arcade.Image;
    z.setCircle(9,3,3).setDepth(4).setCollideWorldBounds(true);
    z.setData('speed',Phaser.Math.Between(33,43));
  }
  private damage() {
    if(this.dead||this.paused||this.time.now<this.hurtUntil)return;
    this.health=Math.max(0,this.health-20);this.hurtUntil=this.time.now+1100;
    this.cameras.main.shake(110,.004);
    if(this.health===0){this.dead=true;this.physics.pause();this.message.setText(`VOCÊ NÃO SAIU DA CIDADE\n\n${Math.floor(this.elapsed)}s de sobrevivência\n\n[R] tentar novamente`).setVisible(true);}
  }
  update(_now:number,delta:number) {
    if(Phaser.Input.Keyboard.JustDown(this.keys.R)){this.scene.restart();return;}
    if(!this.dead&&Phaser.Input.Keyboard.JustDown(this.keys.P)){
      this.paused=!this.paused;
      if(this.paused)this.physics.pause();else this.physics.resume();
      this.message.setText('PAUSADO\n\n[P] continuar').setVisible(this.paused);
    }
    if(this.dead||this.paused)return;
    const dt=Math.min(delta/1000,.05);this.elapsed+=dt;
    const axis=direction(Number(this.keys.D.isDown||this.keys.RIGHT.isDown)-Number(this.keys.A.isDown||this.keys.LEFT.isDown),Number(this.keys.S.isDown||this.keys.DOWN.isDown)-Number(this.keys.W.isDown||this.keys.UP.isDown));
    const moving=axis.x!==0||axis.y!==0;
    const s=staminaStep(this.stamina,moving,this.keys.SHIFT.isDown,this.exhausted,dt);
    this.stamina=s.value;this.exhausted=s.exhausted;
    this.player.setVelocity(axis.x*(s.running?RUN:WALK),axis.y*(s.running?RUN:WALK));
    if(moving)this.player.rotation=Math.atan2(axis.y,axis.x);
    this.player.setAlpha(this.time.now<this.hurtUntil?(Math.floor(this.time.now/90)%2?.35:1):1);
    for(const obj of this.zombies.getChildren()){
      const z=obj as Phaser.Physics.Arcade.Image;
      const d=direction(this.player.x-z.x,this.player.y-z.y);
      const speed=z.getData('speed') as number;
      z.setVelocity(d.x*speed,d.y*speed);z.rotation=Math.atan2(d.y,d.x);
    }
    if(this.elapsed-this.lastSpawn>5&&this.zombies.countActive()<30){this.spawn();this.lastSpawn=this.elapsed;}
    this.hud.setText(`DEAD DISTRICT / PROTÓTIPO 01\nVIDA ${this.health}     FÔLEGO ${Math.ceil(this.stamina)}${this.exhausted?' · EXAUSTO':''}\n${Math.floor(this.elapsed)}s     ${this.zombies.countActive()} ZUMBIS`);
  }
}
new Phaser.Game({type:Phaser.AUTO,parent:'app',width:WIDTH,height:HEIGHT,pixelArt:true,backgroundColor:'#101313',scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},physics:{default:'arcade',arcade:{debug:false}},scene:District});
