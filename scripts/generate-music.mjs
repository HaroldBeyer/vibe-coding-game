// Original procedural score, no samples or quotations from existing songs.
// Run: node scripts/generate-music.mjs, then encode the WAV in tmp/audio with ffmpeg.
import fs from 'node:fs';
const rate=44100,bpm=180,bars=32,beat=60/bpm,step=beat/4,duration=bars*4*beat;
const size=Math.round(duration*rate),left=new Float32Array(size),right=new Float32Array(size);
let seed=0x4e455553;
const noise=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return (seed>>>0)/2147483648-1;};
const hz=midi=>440*2**((midi-69)/12);
function put(index,value,pan=0){const n=index%size;left[n]+=value*Math.sqrt((1-pan)/2);right[n]+=value*Math.sqrt((1+pan)/2);}
function guitar(time,midi,length,pan,lead=false){
 const start=Math.round(time*rate),count=Math.ceil(length*rate),frequency=hz(midi)*(pan<0?.998:1.002);
 let low=0,dc=0;
 for(let n=0;n<count;n++){
  const t=n/rate,phase=frequency*t;
  const saw=f=>2*((phase*f+.13)%1)-1;
  const raw=lead?saw(1)+.22*saw(2):saw(1)+.56*saw(1.4983)+.25*saw(2);
  const pick=Math.min(1,t/.0015)*Math.exp(-t/(lead?.23:.16))*(1-Math.min(1,Math.max(0,(t-length+.012)/.012)));
  const fuzz=Math.tanh(raw*5.8+noise()*.035);
  low+=(fuzz-low)*.34;dc+=(low-dc)*.018;
  put(start+n,(low-dc)*pick*(lead?.105:.14),pan);
 }
}
function bass(time,midi,length){
 const start=Math.round(time*rate),f=hz(midi-12);
 for(let n=0;n<length*rate;n++){const t=n/rate;put(start+n,Math.tanh((Math.sin(t*f*2*Math.PI)+.22*Math.sin(t*f*4*Math.PI))*1.8)*.11*Math.min(1,t/.006)*Math.exp(-t/.32),0);}
}
function drum(time,kind,accent=1){
 const start=Math.round(time*rate),length=kind==='crash'?.85:kind==='snare'?.19:kind==='kick'?.2:.055;
 let previous=0,low=0;
 for(let n=0;n<length*rate;n++){
  const t=n/rate,r=noise();let value=0,pan=0;
  if(kind==='kick')value=(Math.sin(2*Math.PI*(44*t+115*.018*(1-Math.exp(-t/.018))))*.75*Math.exp(-t/ .055)+r*.12*Math.exp(-t/.004))*.38;
  if(kind==='snare'){low+=(r-low)*.25;value=((r-low)*.75+Math.sin(2*Math.PI*183*t)*.23)*Math.exp(-t/.047)*.25;pan=.07;}
  if(kind==='hat'||kind==='crash'){const high=r-previous;previous=r;low+=(high-low)*.72;value=low*Math.exp(-t/(kind==='crash'?.2:.014))*(kind==='crash'?.085:.035);pan=kind==='crash'?-.3:.32;}
  put(start+n,value*accent,pan);
 }
}
const chords=[40,40,41,38,40,43,41,38];
const phrases=[[24,31,27,26,24,31,27,23],[24,27,31,27,26,29,27,23],[24,24,27,31,29,27,26,23],[24,27,26,23,24,19,23,26]];
for(let bar=0;bar<bars;bar++){
 const root=chords[bar%8],phrase=phrases[Math.floor(bar/8)];
 for(let tick=0;tick<16;tick++){
  const time=(bar*16+tick)*step;
  guitar(time,root,step*1.2,-.78);guitar(time+.003,root,step*1.19,.78);
  const melody=40+phrase[Math.floor(tick/2)%8];
  guitar(time,melody,step*1.15,bar<16?-.34:.34,true);
  if(tick%2===0)bass(time,root,step*2.1);
  // Blast sections alternate with a half-time passage and rolling fills.
  const half=bar>=16&&bar<24;
  if(half){if(tick%2===0)drum(time,'kick',tick%4===0?1:.72);if(tick===4||tick===12)drum(time,'snare');}
  else{drum(time,tick%2===0?'kick':'snare',tick%4===0?1:.78);}
  drum(time,'hat',tick%4===0?1:.6);
  if(tick===0)drum(time,'crash',bar%4===0?1:.48);
  if(bar%8===7&&tick>=12)drum(time+.035,'snare',.42);
 }
}
let peak=0,sum=0;
for(let i=0;i<size;i++){
 const fade=Math.min(1,i/(rate*.006),(size-1-i)/(rate*.006));
 left[i]=Math.tanh(left[i]*1.8)*.8*fade;right[i]=Math.tanh(right[i]*1.8)*.8*fade;
 peak=Math.max(peak,Math.abs(left[i]),Math.abs(right[i]));sum+=left[i]**2+right[i]**2;
}
const wav=Buffer.alloc(44+size*4);wav.write('RIFF',0);wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(2,22);wav.writeUInt32LE(rate,24);wav.writeUInt32LE(rate*4,28);wav.writeUInt16LE(4,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(size*4,40);
for(let i=0;i<size;i++){wav.writeInt16LE(Math.round(left[i]*32767),44+i*4);wav.writeInt16LE(Math.round(right[i]*32767),46+i*4);}
fs.mkdirSync('tmp/audio',{recursive:true});fs.writeFileSync('tmp/audio/neustadt-winter.wav',wav);
console.log(JSON.stringify({duration,bpm,bars,peak,rms:Math.sqrt(sum/(2*size)),bytes:wav.length}));
