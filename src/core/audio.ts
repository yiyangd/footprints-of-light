// 声音：全部用 WebAudio 现场合成，不需要音频文件。
// 浏览器规定：玩家点了按钮之后才能出声，所以 initAudio() 要在“开始旅程”被点击时才调用。
import { UI } from '../content';
import { $ } from './env';
import { bi } from './i18n';
import { W } from './state';

let actx: AudioContext | null = null;   // 浏览器的“调音台”
let master: GainNode | null = null;     // 总音量
let verb: ConvolverNode | null = null;  // 混响（让声音像在很空旷的地方）
let windGain: GainNode | null = null;   // 风声的音量
let muted = false;

/** 每个时刻的和弦（每个数是一个音的频率，单位赫兹） */
const CHORDS = {
  dark: [73.4, 110, 146.8],
  day1: [146.8, 185, 220, 293.7],
  day2: [196, 246.9, 293.7, 392],
  day3: [220, 277.2, 329.6, 440],
  day4: [246.9, 293.7, 370, 493.9],
  day5: [196, 293.7, 392, 493.9],
  day6: [146.8, 220, 293.7, 370],
  rest: [146.8, 220, 277.2, 329.6],
  eden: [146.8, 185, 220, 329.6],
  shadow: [138.6, 164.8, 207.7, 277.2],
};
export type ChordName = keyof typeof CHORDS;

interface Voice { o1: OscillatorNode; o2: OscillatorNode }
const voices: Voice[] = [];
let musicGain: GainNode | null = null;
let musicFilter: BiquadFilterNode | null = null;
let currentChord: ChordName | null = null;

/** 背景音乐：五个声部慢慢滑到新的和弦上 */
export const music = {
  /** 换一个和弦 */
  set(name: ChordName): void {
    if (!actx || !musicGain || !musicFilter || currentChord === name) return;
    currentChord = name;
    const f = CHORDS[name], t = actx.currentTime;
    voices.forEach((v, i) => {
      // 声部比和弦里的音多时，多出来的声部高八度（频率乘 2）
      const hz = f[i % f.length] * (i >= f.length ? 2 : 1);
      v.o1.frequency.setTargetAtTime(hz, t, 1.2);
      v.o2.frequency.setTargetAtTime(hz * 1.004, t, 1.2);
    });
    musicGain.gain.setTargetAtTime(name === 'dark' ? 0.05 : 0.11, t, 2);
    musicFilter.frequency.setTargetAtTime(name === 'dark' ? 380 : 1300, t, 2.5);
  },
  /** 全场安静几秒，再慢慢回来（“你在哪里？”） */
  hush(seconds: number): void {
    if (!actx || !musicGain) return;
    musicGain.gain.setTargetAtTime(0, actx.currentTime, 0.3);
    musicGain.gain.setTargetAtTime(0.11, actx.currentTime + seconds, 1.5);
  },
  /** 把音乐压低（安息时）或放回原来的音量 */
  duck(on: boolean): void {
    if (actx && musicGain) musicGain.gain.setTargetAtTime(on ? 0.04 : 0.11, actx.currentTime, 1.2);
  },
};

/** 做一个简单的混响 */
function makeReverb(ctx: AudioContext, out: AudioNode): ConvolverNode {
  const node = ctx.createConvolver();
  const len = ctx.sampleRate * 2.6;
  const ir = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = ir.getChannelData(c);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
  }
  node.buffer = ir;
  const vg = ctx.createGain();
  vg.gain.value = 0.55;
  node.connect(vg);
  vg.connect(out);
  return node;
}

/** 风声：一段循环播放的沙沙声，音调慢慢地起伏 */
function makeWind(ctx: AudioContext, out: AudioNode, reverb: AudioNode): GainNode {
  const nb = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const nd = nb.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  const ns = ctx.createBufferSource();
  ns.buffer = nb;
  ns.loop = true;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 420;
  bp.Q.value = 0.5;
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.07;
  const lg = ctx.createGain();
  lg.gain.value = 220;
  lfo.connect(lg);
  lg.connect(bp.frequency);
  lfo.start();
  const gain = ctx.createGain();
  gain.gain.value = 0.05;
  ns.connect(bp);
  bp.connect(gain);
  gain.connect(out);
  gain.connect(reverb);
  ns.start();
  return gain;
}

/** 和弦铺底：五个声部，每个声部是两个稍微错开一点的音 */
function makeMusic(ctx: AudioContext, out: AudioNode, reverb: AudioNode): void {
  musicFilter = ctx.createBiquadFilter();
  musicFilter.type = 'lowpass';
  musicFilter.frequency.value = 380;
  musicGain = ctx.createGain();
  musicGain.gain.value = 0;
  musicFilter.connect(musicGain);
  musicGain.connect(out);
  musicGain.connect(reverb);
  for (let i = 0; i < 5; i++) {
    const o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain();
    o1.type = 'triangle';
    o2.type = 'sine';
    g.gain.value = 0.16;
    o1.connect(g);
    o2.connect(g);
    g.connect(musicFilter);
    o1.frequency.value = 110;
    o2.frequency.value = 110;
    o1.start();
    o2.start();
    voices.push({ o1, o2 });
  }
}

/** 打开声音。只需要调用一次；浏览器不支持就安静地跳过 */
export function initAudio(): void {
  if (actx) return;
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    actx = new Ctx();
  } catch {
    return;
  }
  master = actx.createGain();
  master.gain.value = 0.8;
  master.connect(actx.destination);
  verb = makeReverb(actx, master);
  windGain = makeWind(actx, master, verb);
  makeMusic(actx, master, verb);
  music.set(W.light > 0.5 ? (W.rest > 0.5 ? 'rest' : 'day1') : 'dark');
}

/** 五声音阶：随便哪几个音一起响都好听 */
const PENTA = [587.3, 659.3, 740, 880, 987.8, 1174.7];

/** 音效 */
export const sfx = {
  /** 一个音：频率 f，从 t0 开始，持续 dur 秒，音量 vol */
  tone(f: number, t0: number, dur: number, vol: number, type: OscillatorType = 'sine'): void {
    if (!actx || !master || !verb || muted) return;
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = type;
    o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g);
    g.connect(master);
    g.connect(verb);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  },
  /** 叮：收集到东西时 */
  chime(i = 0): void {
    if (!actx) return;
    const t = actx.currentTime;
    this.tone(PENTA[i % PENTA.length], t, 1.6, 0.09);
    this.tone(PENTA[(i + 2) % PENTA.length] * 2, t + 0.09, 1.2, 0.04);
  },
  /** 一阵升起来的和声：“要有光” */
  swell(v = 1): void {
    if (!actx) return;
    const t = actx.currentTime;
    [293.7, 370, 440, 587.3, 740].forEach((f, i) => this.tone(f, t + i * 0.08, 3.4, 0.05 * v, 'triangle'));
  },
  /** 一阵风 */
  whoosh(): void {
    if (!actx || !windGain) return;
    windGain.gain.setTargetAtTime(0.16, actx.currentTime, 0.4);
    windGain.gain.setTargetAtTime(0.05, actx.currentTime + 3, 1.5);
  },
  /** 一个慢慢沉下去的音：光熄灭了 */
  sink(): void {
    if (!actx) return;
    const t = actx.currentTime;
    this.tone(220, t, 4, 0.05, 'triangle');
    this.tone(196, t + 1.2, 4, 0.05, 'triangle');
    this.tone(164.8, t + 2.4, 5, 0.05, 'triangle');
  },
  /** 一段旋律：一个音接一个音（第 4 章犹八弹琴吹箫） */
  melody(notes: number[], gap = 0.32): void {
    if (!actx) return;
    const t = actx.currentTime;
    notes.forEach((f, i) => this.tone(f, t + i * gap, 1.1, 0.06, 'triangle'));
  },
  /** 叮当：打铜铁的声音（第 4 章土八该隐） */
  clang(times = 3): void {
    if (!actx) return;
    const t = actx.currentTime;
    for (let i = 0; i < times; i++) {
      this.tone(1318.5, t + i * 0.45, 0.35, 0.03, 'square');
      this.tone(1975.5, t + i * 0.45, 0.25, 0.02, 'square');
    }
  },
  /** 低沉的隆隆声：旱地露出来 */
  rumble(): void {
    if (!actx) return;
    const t = actx.currentTime;
    this.tone(55, t, 5, 0.12, 'triangle');
    this.tone(82.4, t + 0.3, 4.5, 0.07, 'triangle');
  },
};

/** 右上角的“声音”按钮：点一下静音，再点一下恢复 */
export function bindSoundButton(): void {
  $('btn-sound').addEventListener('click', () => {
    muted = !muted;
    if (master && actx) master.gain.setTargetAtTime(muted ? 0 : 0.8, actx.currentTime, 0.2);
    $('snd-text').innerHTML = bi(muted ? UI.muted : UI.sound);
    $('snd-wave').style.display = muted ? 'none' : '';
  });
}
