// 地形网格：把高度函数算出来的高度做成一大块看得见的地面。
// 每个顶点有两套颜色：光秃的 / 长满青草的，第三日慢慢从第一套过渡到第二套。
import * as THREE from 'three';
import { fbm, smooth } from '../core/math';
import { scene } from '../core/renderer';
import { W } from '../core/state';
import { baseHeight, EDEN, landOffset, T_CX, T_CZ, T_D, T_W } from './heightmap';

/** 地形和长在地上的东西（草、树、石头）都放在这一组里，陆地升起时整组一起往上抬 */
export const terrainGroup = new THREE.Group();
scene.add(terrainGroup);

const terrainUniforms = { uGreen: { value: 0 } };

function buildTerrain(): void {
  const geo = new THREE.PlaneGeometry(T_W, T_D, 210, 176);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position, n = pos.count;
  for (let i = 0; i < n; i++) {
    const x = pos.getX(i) + T_CX, z = pos.getZ(i) + T_CZ;
    pos.setY(i, baseHeight(x, z));
  }
  geo.computeVertexNormals();

  const nor = geo.attributes.normal;
  const bare = new Float32Array(n * 3), green = new Float32Array(n * 3);
  const C = (hex: string): THREE.Color => new THREE.Color(hex);
  // 光秃的颜色
  const sandB = C('#cdb88c'), dirtB = C('#9a8263'), rockB = C('#8d8478'), wetB = C('#a88f6a');
  // 长草之后的颜色
  const sand = C('#e2d1a2'), grassA = C('#86c062'), grassB = C('#6fae55'), grassHi = C('#a9c46c');
  const rock = C('#9b958c'), edenG = C('#5fb85a'), tmp = new THREE.Color();
  for (let i = 0; i < n; i++) {
    const x = pos.getX(i) + T_CX, z = pos.getZ(i) + T_CZ, h = pos.getY(i), ny = nor.getY(i);
    const v = fbm(x * 0.15, z * 0.15), steep = ny < 0.78;
    // —— 光秃 ——
    if (h < -0.2) tmp.copy(wetB);
    else if (h < 0.55) tmp.copy(sandB);
    else tmp.copy(dirtB).lerp(rockB, v * 0.6);
    if (steep) tmp.copy(rockB);
    tmp.multiplyScalar(0.92 + v * 0.16);
    tmp.toArray(bare, i * 3);
    // —— 青草 ——
    const er = Math.hypot(x - EDEN.x, z - EDEN.z);
    if (h < -0.2) tmp.copy(wetB);
    else if (h < 0.45) tmp.copy(sand);
    else {
      tmp.copy(grassA).lerp(grassB, v);
      if (h > 3.8) tmp.lerp(grassHi, smooth(3.8, 6, h));
      if (er < 24) tmp.lerp(edenG, 1 - smooth(16, 24, er)); // 伊甸的草更绿
    }
    if (steep && h > 0.5) tmp.copy(rock);
    tmp.multiplyScalar(0.94 + v * 0.12);
    tmp.toArray(green, i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(bare, 3));
  geo.setAttribute('color2', new THREE.BufferAttribute(green, 3));

  const mat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  // 在 three.js 自带的着色器里加一行：按 uGreen 把两套颜色混在一起
  mat.onBeforeCompile = (s) => {
    s.uniforms.uGreen = terrainUniforms.uGreen;
    s.vertexShader = 'attribute vec3 color2;\nuniform float uGreen;\n'
      + s.vertexShader.replace('#include <color_vertex>', '#include <color_vertex>\n vColor.rgb = mix(vColor.rgb, color2, uGreen);');
  };
  mat.customProgramCacheKey = () => 'terrain';
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(T_CX, 0, T_CZ);
  terrainGroup.add(mesh);
}
buildTerrain();

/** 每一帧：让陆地升到该在的高度，草色变到该有的绿 */
export function updateTerrain(): void {
  terrainGroup.position.y = landOffset();
  terrainUniforms.uGreen.value = W.green;
}
