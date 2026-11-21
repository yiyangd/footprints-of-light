// 贴图：全部用画布现画，不需要图片文件。
import * as THREE from 'three';
import { rng } from './math';

type Draw = (g: CanvasRenderingContext2D, w: number, h: number) => void;

/** 开一张小画布，画点东西，变成 three.js 能用的贴图 */
function canvasTex(w: number, h: number, draw: Draw): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  if (!g) throw new Error('浏览器不支持 2D 画布');
  draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export const TEX = {
  /** 一团柔和的光：灯火、太阳的光晕、引路之光都用它 */
  glow: canvasTex(128, 128, (g, w) => {
    const r = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    r.addColorStop(0, 'rgba(255,255,255,1)');
    r.addColorStop(0.25, 'rgba(255,255,255,.55)');
    r.addColorStop(0.6, 'rgba(255,255,255,.12)');
    r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r;
    g.fillRect(0, 0, w, w);
  }),
  /** 脚下的圆形影子（不用实时阴影，省性能） */
  shadow: canvasTex(64, 64, (g, w) => {
    const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    r.addColorStop(0, 'rgba(0,0,0,.55)');
    r.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = r;
    g.fillRect(0, 0, w, w);
  }),
  /** 一个圆圈：鱼落水时的涟漪 */
  ring: canvasTex(64, 64, (g) => {
    g.strokeStyle = 'rgba(255,255,255,.9)';
    g.lineWidth = 4;
    g.beginPath();
    g.arc(32, 32, 26, 0, Math.PI * 2);
    g.stroke();
  }),
  /** 一朵云 */
  cloud: canvasTex(256, 128, (g) => {
    const R = rng(7);
    for (let i = 0; i < 14; i++) {
      const x = 40 + R() * 176, y = 50 + R() * 40, rr = 22 + R() * 34;
      const r = g.createRadialGradient(x, y, 0, x, y, rr);
      r.addColorStop(0, 'rgba(255,255,255,.85)');
      r.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = r;
      g.beginPath();
      g.arc(x, y, rr, 0, Math.PI * 2);
      g.fill();
    }
  }),
  /** 知识陶片：一块刻着字的碎陶片，背后有一圈暖光 */
  shard: canvasTex(128, 128, (g) => {
    const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    r.addColorStop(0, 'rgba(255,214,150,.75)');
    r.addColorStop(1, 'rgba(255,214,150,0)');
    g.fillStyle = r;
    g.fillRect(0, 0, 128, 128);
    g.beginPath();
    g.moveTo(40, 38); g.lineTo(78, 32); g.lineTo(94, 50); g.lineTo(88, 86); g.lineTo(54, 96); g.lineTo(34, 72);
    g.closePath();
    g.fillStyle = '#b9764c';
    g.fill();
    g.strokeStyle = '#7a4529';
    g.lineWidth = 3;
    g.stroke();
    g.strokeStyle = '#3b1d0c';
    g.lineWidth = 2.5;
    for (let i = 0; i < 4; i++) {
      g.beginPath();
      g.moveTo(46, 50 + i * 10);
      g.lineTo(82 - i * 3, 47 + i * 10);
      g.stroke();
    }
  }),
  /** 红玛瑙：一颗六边形的红宝石 */
  gem: canvasTex(128, 128, (g) => {
    const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    r.addColorStop(0, 'rgba(255,120,110,.8)');
    r.addColorStop(1, 'rgba(255,90,80,0)');
    g.fillStyle = r;
    g.fillRect(0, 0, 128, 128);
    g.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = Math.PI / 6 + i * Math.PI / 3;
      g.lineTo(64 + Math.cos(a) * 26, 64 + Math.sin(a) * 26);
    }
    g.closePath();
    g.fillStyle = '#b3242c';
    g.fill();
    g.fillStyle = 'rgba(255,255,255,.55)';
    g.beginPath();
    g.moveTo(52, 50); g.lineTo(66, 44); g.lineTo(60, 60);
    g.fill();
  }),
};

/** 做一个发光的小光团（永远正对镜头的贴图） */
export function glowSprite(color: THREE.ColorRepresentation, scale: number, opacity = 1): THREE.Sprite {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({
    map: TEX.glow, color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
  }));
  s.scale.setScalar(scale);
  return s;
}
