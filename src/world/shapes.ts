// 拼形状的小工具：把几个简单的形状（球、圆柱……）合成一个带颜色的几何体。
// 这样每种动物只需要画一次（一次 draw call），手机上才流畅。
import * as THREE from 'three';

/** 一个零件：形状、摆在哪里（矩阵）、什么颜色 */
export interface Part { geo: THREE.BufferGeometry; m?: THREE.Matrix4; color: string }

/** 把一组零件合成一个几何体，每个顶点带着自己零件的颜色 */
export function mergeParts(parts: Part[]): THREE.BufferGeometry {
  const positions: number[] = [], normals: number[] = [], colors: number[] = [];
  for (const p of parts) {
    const g = p.geo.index ? p.geo.toNonIndexed() : p.geo.clone();
    g.applyMatrix4(p.m ?? new THREE.Matrix4());
    const pos = g.attributes.position, nor = g.attributes.normal, c = new THREE.Color(p.color);
    for (let i = 0; i < pos.count; i++) {
      positions.push(pos.getX(i), pos.getY(i), pos.getZ(i));
      normals.push(nor.getX(i), nor.getY(i), nor.getZ(i));
      colors.push(c.r, c.g, c.b);
    }
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  out.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  return out;
}

/** 做一个“摆放矩阵”：位置 (x, y, z)，缩放 (sx, sy, sz)，旋转 (rx, ry, rz) */
export function placeAt(x: number, y: number, z: number, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0): THREE.Matrix4 {
  return new THREE.Matrix4().compose(
    new THREE.Vector3(x, y, z),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)),
    new THREE.Vector3(sx, sy, sz),
  );
}

/** 一条腿：立在 (x, z)，高 h，粗 r */
export function leg(x: number, z: number, h: number, r: number, color: string): Part {
  return { geo: new THREE.CylinderGeometry(r, r * 0.8, h, 5), m: placeAt(x, h / 2, z), color };
}
