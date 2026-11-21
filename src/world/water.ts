// 水：低多边形的海面。浅滩是青绿色，深海是蓝色。
// 陆地升起之前，海面只有一种深蓝；升起之后才分出浅滩的颜色。
import * as THREE from 'three';
import { smooth } from '../core/math';
import { scene } from '../core/renderer';
import { U, W } from '../core/state';
import { baseHeight, T_CX, T_CZ } from './heightmap';

const waterUniforms = { uLand: { value: 0 } };

function buildWater(): void {
  const geo = new THREE.PlaneGeometry(700, 700, 140, 140);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position, n = pos.count;
  const dark = new Float32Array(n * 3), tinted = new Float32Array(n * 3);
  const deep = new THREE.Color('#1d5f8c'), mid = new THREE.Color('#2f8fb0'), shallow = new THREE.Color('#5ed0c4');
  const tmp = new THREE.Color();
  for (let i = 0; i < n; i++) {
    const x = pos.getX(i) + T_CX, z = pos.getZ(i) + T_CZ, depth = -baseHeight(x, z);
    deep.toArray(dark, i * 3);
    // 水越深颜色越蓝
    tmp.copy(shallow).lerp(mid, smooth(0.3, 2.5, depth)).lerp(deep, smooth(2.5, 7, depth));
    tmp.toArray(tinted, i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(dark, 3));
  geo.setAttribute('color2', new THREE.BufferAttribute(tinted, 3));

  const mat = new THREE.MeshPhongMaterial({
    vertexColors: true, flatShading: true, transparent: true, opacity: 0.86, shininess: 70, specular: new THREE.Color('#8fb3c9'),
  });
  // 在着色器里加两件事：水面的小波浪，以及按 uLand 混合两套颜色
  mat.onBeforeCompile = (s) => {
    s.uniforms.uTime = U.time;
    s.uniforms.uLand = waterUniforms.uLand;
    s.vertexShader = 'attribute vec3 color2;\nuniform float uLand;\nuniform float uTime;\n' + s.vertexShader
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n transformed.y += sin(transformed.x*0.35+uTime*1.1)*0.07 + sin(transformed.z*0.42+uTime*0.8)*0.06 + sin((transformed.x+transformed.z)*0.9+uTime*1.7)*0.025;')
      .replace('#include <color_vertex>', '#include <color_vertex>\n vColor.rgb = mix(vColor.rgb, color2, uLand);');
  };
  mat.customProgramCacheKey = () => 'water';
  const water = new THREE.Mesh(geo, mat);
  water.position.set(T_CX, 0, T_CZ);
  water.renderOrder = 2;
  scene.add(water);
}
buildWater();

/** 每一帧：陆地升起多少，浅滩的颜色就显出多少 */
export function updateWater(): void {
  waterUniforms.uLand.value = W.land;
}
