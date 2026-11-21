// 渲染器、场景、相机：three.js 画 3D 画面要用的三样东西。
import * as THREE from 'three';
import { $, IS_TOUCH } from './env';

/** 画布：index.html 里的 <canvas id="scene"> */
export const canvas = $('scene') as HTMLCanvasElement;

/** 渲染器：负责把场景画到画布上 */
export const renderer = new THREE.WebGLRenderer({ canvas, antialias: !IS_TOUCH, powerPreference: 'high-performance' });
// 手机屏幕的像素很密，全画出来会卡，所以限制一下清晰度
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, IS_TOUCH ? 1.4 : 1.75));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

/** 场景：所有要画的东西都加进这里 */
export const scene = new THREE.Scene();

/** 相机：玩家的眼睛 */
export const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 1500);

/** 雾：远处的东西慢慢淡进天色里。一开始很浓，因为世界还是黑的 */
export const fog = new THREE.Fog(0x05060b, 6, 55);
scene.fog = fog;

// 窗口大小变了（例如手机转了个方向），画面跟着变
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
