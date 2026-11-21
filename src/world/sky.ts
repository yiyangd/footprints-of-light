// 天空：渐变的天穹、太阳、月亮、星星、云，还有照亮世界的灯光。
// 颜色完全由世界状态 W 决定：黑暗 → 珍珠色的光 → 蓝天 → 有太阳的天 → 安息的暖色。
import * as THREE from 'three';
import { lerp, rng } from '../core/math';
import { camera, fog, scene } from '../core/renderer';
import { W } from '../core/state';
import { glowSprite, TEX } from '../core/textures';
import { T_CX } from './heightmap';

/** 四种颜色一组：[天顶, 中间, 地平线, 雾] */
type Palette = [THREE.Color, THREE.Color, THREE.Color, THREE.Color];
const palette = (...hex: [string, string, string, string]): Palette =>
  hex.map((c) => new THREE.Color(c)) as Palette;

/** 每种状态下天空的颜色 */
const PAL = {
  dark: palette('#020309', '#05070d', '#020205', '#04050a'),
  pearl: palette('#cfc7b3', '#efe6d1', '#e8dfca', '#e3d9c2'),
  blue: palette('#3d7fd0', '#94c3ec', '#d2e7f3', '#c2dbe8'),
  sun: palette('#327ad0', '#8cc0ec', '#ecdfc0', '#c6dbe6'),
  night: palette('#0a1330', '#1a2a50', '#2c3658', '#1b2541'),
  rest: palette('#5a8bcc', '#f0c48f', '#f6d7a4', '#ecd0a6'),
};

const skyUniforms = {
  uTop: { value: new THREE.Color() },
  uMid: { value: new THREE.Color() },
  uBot: { value: new THREE.Color() },
  uSunDir: { value: new THREE.Vector3(0.5, 0.3, -0.62).normalize() },
  uSunCol: { value: new THREE.Color('#fff1d0') },
  uSun: { value: 0 },
  uGlow: { value: 0 },
};

/** 太阳在天上的方向（第四日镜头转过去看它） */
export const sunDirection: THREE.Vector3 = skyUniforms.uSunDir.value;

// —— 天穹：一个很大的球，从里面看 ——
const sky = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 16), new THREE.ShaderMaterial({
  uniforms: skyUniforms, side: THREE.BackSide, depthWrite: false, fog: false,
  vertexShader: 'varying vec3 vDir; void main(){ vDir = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position = p.xyww; }',
  fragmentShader: `uniform vec3 uTop; uniform vec3 uMid; uniform vec3 uBot; uniform vec3 uSunDir; uniform vec3 uSunCol; uniform float uSun; uniform float uGlow; varying vec3 vDir;
    void main(){ vec3 d = normalize(vDir); float h = d.y;
      vec3 col = mix(uBot, uMid, smoothstep(-0.2, 0.06, h)); col = mix(col, uTop, smoothstep(0.06, 0.7, h));
      float s = max(dot(d, normalize(uSunDir)), 0.0);
      col += uSunCol * (pow(s, 900.0) * 6.0 * uSun + pow(s, 14.0) * 0.32 * uGlow);
      gl_FragColor = vec4(col, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
}));
sky.renderOrder = -10;
scene.add(sky);

// —— 月亮和太阳的光晕 ——
const moon = glowSprite('#dfe8ff', 26, 0);
scene.add(moon);
const moonDir = new THREE.Vector3(-0.55, 0.3, 0.62).normalize();
const sunHalo = glowSprite('#ffe6b0', 70, 0);
scene.add(sunHalo);

// —— 星星：1400 个小点，撒在半个天球上 ——
function buildStars(): THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial> {
  const R = rng(11), n = 1400, p = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const u = R() * 2 - 1, a = R() * Math.PI * 2, y = Math.abs(u) * 0.95 + 0.05, r = Math.sqrt(1 - y * y);
    p[i * 3] = Math.cos(a) * r * 800;
    p[i * 3 + 1] = y * 800;
    p[i * 3 + 2] = Math.sin(a) * r * 800;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  const m = new THREE.PointsMaterial({ size: 2.2, sizeAttenuation: false, color: '#ffffff', transparent: true, opacity: 0, depthWrite: false, fog: false });
  const pts = new THREE.Points(g, m);
  pts.renderOrder = -9;
  scene.add(pts);
  return pts;
}
const stars = buildStars();

// —— 云：16 朵，慢慢往东飘 ——
interface Cloud { sprite: THREE.Sprite; speed: number }
function buildClouds(): Cloud[] {
  const R = rng(21), list: Cloud[] = [];
  for (let i = 0; i < 16; i++) {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.cloud, color: '#ffffff', transparent: true, opacity: 0, depthWrite: false, fog: false }));
    const a = R() * Math.PI * 2, rad = 160 + R() * 240;
    sprite.position.set(T_CX + Math.cos(a) * rad, 60 + R() * 70, Math.sin(a) * rad);
    sprite.scale.set(90 + R() * 80, 34 + R() * 26, 1);
    const speed = 0.6 + R() * 0.8;
    scene.add(sprite);
    list.push({ sprite, speed });
  }
  return list;
}
const clouds = buildClouds();

// —— 灯光 ——
const hemi = new THREE.HemisphereLight('#ffffff', '#5a4a38', 0.05);
scene.add(hemi);
const sunLight = new THREE.DirectionalLight('#fff2dc', 0);
sunLight.position.set(0, 100, 0);
scene.add(sunLight);
const ambient = new THREE.AmbientLight('#ffffff', 0.04);
scene.add(ambient);

// —— “有晚上，有早晨”：夜色涨上来又退下去，一共 5.5 秒 ——
let nightPulse = 1; // 0 = 刚开始，1 = 已经结束

/** 开始一次“有晚上，有早晨” */
export function startEvening(): void {
  nightPulse = 0;
}

function updateNight(dt: number): void {
  if (nightPulse < 1) {
    nightPulse = Math.min(1, nightPulse + dt / 5.5);
    W.night = Math.pow(Math.sin(nightPulse * Math.PI), 1.4) * 0.88;
  } else {
    W.night = 0;
  }
}

// 每一帧都要用到的临时变量，先建好，免得每帧新建一堆
const WHITE = new THREE.Color('#ffffff');
const GROUND_LIT = new THREE.Color('#5a4a38'), GROUND_DARK = new THREE.Color('#1a1712');
const SUN_WHITE = new THREE.Color('#fff2dc'), SUN_WARM = new THREE.Color('#ffc98a');
const now: Palette = palette('#000000', '#000000', '#000000', '#000000');

/** 把现在的颜色朝 target 这一组颜色混过去 k 那么多 */
function blendToward(target: Palette, k: number): void {
  for (let i = 0; i < 4; i++) now[i].lerp(target[i], k);
}

/** 按世界状态一层层混出现在天空的颜色 */
function computeSkyColors(): void {
  for (let i = 0; i < 4; i++) now[i].copy(PAL.dark[i]);
  blendToward(PAL.pearl, W.light);
  blendToward(PAL.blue, W.sky);
  blendToward(PAL.sun, W.lights);
  blendToward(PAL.rest, W.rest * 0.75);
  blendToward(PAL.night, W.night * W.light);
  const shade = 1 - W.shadow * 0.18;
  for (const c of now) c.multiplyScalar(shade);
}

/** 每一帧：更新天空、雾、日月星云和灯光 */
export function updateSky(dt: number): void {
  updateNight(dt);
  computeSkyColors();
  const [top, mid, bottom, fogColor] = now;
  skyUniforms.uTop.value.copy(top);
  skyUniforms.uMid.value.copy(mid);
  skyUniforms.uBot.value.copy(bottom);
  fog.color.copy(fogColor);
  // 天越亮，雾越远
  fog.near = lerp(5, 55, W.light);
  fog.far = lerp(48, 330, W.light);

  const day = W.light * (1 - W.night * 0.75);
  skyUniforms.uSun.value = W.lights * (1 - W.night);
  skyUniforms.uGlow.value = W.lights * (1 - W.night) + W.rest * 0.6;
  // 天穹和星星跟着镜头走，这样永远走不到天边
  sky.position.copy(camera.position);
  stars.position.copy(camera.position);
  stars.material.opacity = W.lights * (0.12 + 0.88 * W.night);
  moon.position.copy(camera.position).addScaledVector(moonDir, 600);
  moon.material.opacity = W.lights * (0.25 + 0.75 * W.night);
  sunHalo.position.copy(camera.position).addScaledVector(sunDirection, 600);
  sunHalo.material.opacity = W.lights * (1 - W.night) * 0.55;
  for (const c of clouds) {
    c.sprite.material.opacity = W.sky * 0.75 * (1 - W.night * 0.6);
    c.sprite.material.color.copy(mid).lerp(WHITE, 0.6);
    c.sprite.position.x += dt * c.speed;
    if (c.sprite.position.x > 420) c.sprite.position.x = -380;
  }

  // —— 灯光 ——
  hemi.color.copy(mid).lerp(WHITE, 0.45);
  hemi.groundColor.copy(GROUND_LIT).lerp(GROUND_DARK, 1 - W.light);
  hemi.intensity = 0.06 + day * 1.15;
  sunLight.intensity = day * (0.45 + W.lights * 1.35) * (1 - W.shadow * 0.3);
  if (W.lights > 0.01) sunLight.position.copy(sunDirection).multiplyScalar(100);
  else sunLight.position.set(10, 100, 20);
  sunLight.color.copy(SUN_WHITE).lerp(SUN_WARM, W.rest * 0.6);
}
