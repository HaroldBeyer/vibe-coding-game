import { config as C } from './config';
type Effect = 'splat' | 'door' | 'door-hit' | 'door-break' | 'rifle' | 'zombie-death' | 'mutant-death' | 'npc-death' | 'panic' | 'help' | 'shot' | 'empty' | 'reload' | 'ready' | 'pickup' | 'step' | 'hit' | 'hurt' | 'growl' | 'infection' | 'death';
/** One audio session across scene restarts. No sound before a deliberate user gesture. */
class Soundscape {
    private context?: AudioContext;
    private effects?: GainNode;
    private noiseBuffer?: AudioBuffer;
    private helpBuffers: AudioBuffer[] = [];
    private voiceAt = -Infinity;
    private music?: HTMLAudioElement;
    private enabled = false;
    private muted = false;
    private paused = false;
    private hidden = document.hidden;
    private failed = false;
    private last = new Map<Effect, number>();
    private musicLevel = C.audio.musicPercent;
    private effectsLevel = C.audio.effectsPercent;
    private button?: HTMLButtonElement;
    constructor() {
        this.button = document.querySelector<HTMLButtonElement>('#audio-toggle') ?? undefined;
        this.button?.addEventListener('click', () => this.toggle());
        for (const [id, channel] of [['music-volume', 'music'], ['effects-volume', 'effects']] as const) {
            const slider = document.querySelector<HTMLInputElement>(`#${id}`);
            if (!slider)
                continue;
            slider.value = String(channel === 'music' ? this.musicLevel : this.effectsLevel);
            slider.addEventListener('keydown', event => event.stopPropagation());
            slider.addEventListener('input', () => {
                if (channel === 'music')
                    this.musicLevel = Number(slider.value);
                else
                    this.effectsLevel = Number(slider.value);
                this.applyLevels();
            });
        }
        document.addEventListener('visibilitychange', () => { this.hidden = document.hidden; this.sync(); });
        this.updateButton();
    }
    unlock() {
        if (this.enabled || this.failed)
            return;
        try {
            this.context = new AudioContext();
            this.effects = this.context.createGain();
            this.effects.connect(this.context.destination);
            this.noiseBuffer = this.context.createBuffer(1, this.context.sampleRate, this.context.sampleRate);
            const data = this.noiseBuffer.getChannelData(0);
            for (let i = 0; i < data.length; i++)
                data[i] = Math.random() * 2 - 1;
            this.music = new Audio();
            this.music.id = 'soundtrack';
            this.music.hidden = true;
            document.body.append(this.music);
            this.music.src = `${import.meta.env.BASE_URL}audio/neustadt-winter.${this.music.canPlayType('audio/ogg; codecs="vorbis"') ? 'ogg' : 'mp3'}`;
            this.music.loop = true;
            this.music.preload = 'auto';
            this.music.addEventListener('error', () => { this.failed = true; this.updateButton(); });
            this.enabled = true;
            // Native offline voice renders are bundled; all playback stays in this audio graph.
            for (const name of ['zira','hazel']) {
                void fetch(`${import.meta.env.BASE_URL}audio/help-${name}.wav`)
                    .then(response => { if (!response.ok) throw new Error('voice'); return response.arrayBuffer(); })
                    .then(bytes => this.context!.decodeAudioData(bytes))
                    .then(buffer => this.helpBuffers.push(buffer)).catch(() => {});
            }
            this.applyLevels();
            this.sync();
        }
        catch {
            this.failed = true;
            this.updateButton();
        }
    }
    toggle() {
        if (!this.enabled)
            this.unlock();
        else {
            this.muted = !this.muted;
            this.sync();
        }
    }
    setPaused(paused: boolean) {
        if (paused === this.paused)
            return;
        this.paused = paused;
        this.sync();
    }
    gameOver() {
        // Let the death effect finish while stopping the music immediately.
        this.paused = true;
        this.music?.pause();
    }
    private sync() {
        const running = this.enabled && !this.muted && !this.paused && !this.hidden;
        if (running) {
            void this.context?.resume().catch(() => { });
            const play = this.music?.play();
            void play?.catch((error: DOMException) => {
                // Pausing/restarting can cancel an in-flight play() without breaking audio.
                if (error.name === 'AbortError' || error.name === 'NotAllowedError') return;
                this.failed = true; this.updateButton();
            });
        }
        else {
            void this.context?.suspend().catch(() => { });
            this.music?.pause();
        }
        this.updateButton();
    }
    private updateButton() {
        if (!this.button)
            return;
        this.button.textContent = this.failed ? 'ÁUDIO INDISPONÍVEL' : !this.enabled ? 'ATIVAR ÁUDIO [M]' : this.muted ? 'SOM DESLIGADO [M]' : 'SOM LIGADO [M]';
        this.button.setAttribute('aria-pressed', String(this.enabled && !this.muted));
    }
    private applyLevels() {
        const master = C.audio.masterPercent / 100;
        if (this.music)
            this.music.volume = master * this.musicLevel / 100;
        if (this.effects && this.context)
            this.effects.gain.setTargetAtTime(master * this.effectsLevel / 100, this.context.currentTime, .02);
    }
    private envelope(level: number, duration: number, delay: number, pan: number) {
        const ctx = this.context!, t = ctx.currentTime + delay;
        const gain = ctx.createGain(), panner = ctx.createStereoPanner();
        gain.gain.setValueAtTime(.0001, t);
        gain.gain.linearRampToValueAtTime(Math.max(.0001, level), t + .003);
        gain.gain.exponentialRampToValueAtTime(.0001, t + duration);
        panner.pan.value = Math.max(-1, Math.min(1, pan));
        gain.connect(panner);
        panner.connect(this.effects!);
        return { gain, panner, t };
    }
    private tone(frequency: number, end: number, duration: number, level: number, pan = 0, delay = 0, type: OscillatorType = 'sine') {
        const ctx = this.context!, { gain, panner, t } = this.envelope(level, duration, delay, pan);
        const source = ctx.createOscillator();
        source.type = type;
        source.frequency.setValueAtTime(frequency, t);
        source.frequency.exponentialRampToValueAtTime(Math.max(1, end), t + duration);
        source.connect(gain);
        source.start(t);
        source.stop(t + duration + .01);
        source.onended = () => { source.disconnect(); gain.disconnect(); panner.disconnect(); };
    }
    private noise(duration: number, level: number, frequency: number, pan = 0, delay = 0, type: BiquadFilterType = 'lowpass') {
        const ctx = this.context!, { gain, panner, t } = this.envelope(level, duration, delay, pan);
        const source = ctx.createBufferSource(), filter = ctx.createBiquadFilter();
        source.buffer = this.noiseBuffer!;
        filter.type = type;
        filter.frequency.value = frequency;
        filter.Q.value = .8;
        source.connect(filter);
        filter.connect(gain);
        source.start(t, Math.random() * .25, duration);
        source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); panner.disconnect(); };
    }
    /** Breath and moving formants produce a rough vocal cry instead of a UI beep. */
    private cry(level: number, pan: number, dying = false) {
        const ctx = this.context!, duration = dying ? .85 : .7;
        const pitch = (dying ? 155 : 270) + Math.random()*100;
        for (const [frequency,weight] of [[850,.65],[1450,.3],[2900,.12]]) {
            const {gain,panner,t} = this.envelope(level*weight,duration,0,pan);
            const source = ctx.createOscillator(), formant=ctx.createBiquadFilter();
            source.type='sawtooth'; source.frequency.setValueAtTime(pitch,t);
            source.frequency.linearRampToValueAtTime(pitch*1.2,t+.12);
            source.frequency.exponentialRampToValueAtTime(dying ? 65 : pitch*.62,t+duration);
            formant.type='bandpass'; formant.frequency.setValueAtTime(frequency,t);
            formant.frequency.linearRampToValueAtTime(frequency*.7,t+duration); formant.Q.value=5;
            source.connect(formant); formant.connect(gain); source.start(t); source.stop(t+duration);
            source.onended=()=>{source.disconnect();formant.disconnect();gain.disconnect();panner.disconnect();};
        }
        this.noise(duration,.13*level,1800,pan,0,'bandpass');
    }
    private help(level: number, pan: number) {
        if (!this.helpBuffers.length) { this.cry(level,pan); return; }
        const ctx = this.context!, source=ctx.createBufferSource(), gain=ctx.createGain(), panner=ctx.createStereoPanner();
        source.buffer=this.helpBuffers[Math.floor(Math.random()*this.helpBuffers.length)];
        source.playbackRate.value=.94+Math.random()*.14;
        gain.gain.value=level*.7; panner.pan.value=Math.max(-1,Math.min(1,pan));
        source.connect(gain); gain.connect(panner); panner.connect(this.effects!); source.start();
        source.onended=()=>{source.disconnect();gain.disconnect();panner.disconnect();};
    }
    play(effect: Effect, volume = 1, pan = 0) {
        if (!this.enabled || this.muted || this.paused || this.hidden || this.context?.state !== 'running')
            return;
        const now = this.context.currentTime;
        if (effect === 'panic' || effect === 'help') {
            if (now - this.voiceAt < C.audio.voiceCooldown) return;
            this.voiceAt = now;
        }
        if (now - (this.last.get(effect) ?? -Infinity) < .055)
            return;
        this.last.set(effect, now);
        const v = Math.min(1, Math.max(0, volume));
        switch (effect) {
            case 'shot':
            case 'rifle': {
                const rifle = effect === 'rifle';
                this.noise(.032,.75*v,7800,pan,0,'highpass');
                this.noise(rifle ? .27 : .18,.48*v,rifle ? 3200 : 4600,pan);
                this.tone(rifle ? 120 : 175,38,rifle ? .24 : .16,.55*v,pan);
                this.noise(.055,.14*v,2600,pan,.07,'bandpass');
                this.noise(.24,.1*v,1500,-pan*.6,.1);
                break;
            }
            case 'zombie-death':
            case 'mutant-death':
                this.tone(effect === 'mutant-death' ? 230 : 110,27,.85,.22*v,pan,0,'sawtooth');
                this.noise(.55,.3*v,740,pan);
                this.noise(.16,.22*v,480,pan,.26);
                break;
            case 'npc-death':
                this.cry(.42*v,pan,true);
                this.noise(.22,.24*v,500,pan,.5);
                break;
            case 'panic':
                this.cry(.45*v,pan);
                break;
            case 'help':
                this.help(v,pan);
                break;
            case 'splat':
                this.noise(.12,.3*v,1700,pan,0,'bandpass'); this.tone(115,37,.11,.16*v,pan); break;
            case 'door':
                this.noise(.16,.28*v,650,pan); this.tone(140,60,.18,.2*v,pan);
                this.noise(.08,.1*v,2300,pan,.12,'bandpass'); break;
            case 'door-hit':
                this.noise(.13,.42*v,700,pan); this.tone(95,35,.2,.32*v,pan); break;
            case 'door-break':
                for(let i=0;i<4;i++) this.noise(.18,.3*v,1100+i*650,pan,i*.065);
                this.tone(120,25,.45,.3*v,pan); break;
            case 'empty':
                this.noise(.035, .13 * v, 2600, pan, 0, 'bandpass');
                break;
            case 'reload':
                this.noise(.08, .2 * v, 2200);
                this.noise(.06, .17 * v, 3600, 0, .18);
                break;
            case 'ready':
                this.noise(.035, .25 * v, 3000);
                this.tone(520, 220, .07, .07 * v, 0, .04, 'triangle');
                break;
            case 'pickup':
                this.tone(680, 900, .09, .12 * v);
                this.tone(1000, 1300, .12, .09 * v, 0, .09, 'triangle');
                break;
            case 'step':
                this.noise(.085, .22 * v, 650, pan);
                this.tone(92, 48, .065, .07 * v, pan);
                break;
            case 'hit':
                this.noise(.12, .23 * v, 1100, pan);
                this.tone(85, 40, .14, .18 * v, pan);
                break;
            case 'hurt':
                this.noise(.15, .28 * v, 850, pan);
                this.tone(120, 55, .22, .17 * v, pan, 0, 'triangle');
                break;
            case 'growl':
                this.tone(78 + Math.random() * 18, 38, .65, .065 * v, pan, 0, 'sawtooth');
                this.noise(.55, .055 * v, 400, pan);
                break;
            case 'infection':
                this.tone(125, 39, .5, .12 * v, pan, 0, 'triangle');
                this.noise(.35, .12 * v, 600, pan);
                break;
            case 'death':
                this.cry(.35*v,pan,true);
                this.tone(150, 24, .7, .24 * v, 0, 0, 'triangle');
                break;
        }
    }
}
export const soundscape = new Soundscape();
