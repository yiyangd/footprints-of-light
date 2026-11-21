// 世界里的文字标签（河名、动物名）：文字是普通的 HTML，每一帧挪到 3D 位置在屏幕上对应的地方。
import * as THREE from 'three';
import { sfx } from '../core/audio';
import { $ } from '../core/env';
import { clamp } from '../core/math';
import { camera } from '../core/renderer';

interface Label {
  el: HTMLElement;
  /** 标签现在该在 3D 世界里的哪个位置；返回 null 就先不显示 */
  getPos: () => THREE.Vector3 | null;
  /** 现在该不该显示 */
  visible: () => boolean;
  /** 走到多近才看得见（米） */
  maxDist: number;
  /** 第一次出现时要不要“叮”一声 */
  chime: boolean;
  shown: boolean;
}

const labels: Label[] = [];

/**
 * 加一个标签。
 * @param cls  样式类名（style.css 里的 .wlabel.river、.wlabel.animal）
 * @param html 标签里的内容
 */
export function addLabel(
  cls: string, html: string, getPos: () => THREE.Vector3 | null, visible: () => boolean,
  options: { maxDist: number; chime?: boolean },
): void {
  const el = document.createElement('div');
  el.className = 'wlabel ' + cls;
  el.innerHTML = html;
  $('labels').appendChild(el);
  labels.push({ el, getPos, visible, maxDist: options.maxDist, chime: options.chime ?? false, shown: false });
}

const projected = new THREE.Vector3();

/** 每一帧：算出每个标签在屏幕上的位置；离得远的淡掉 */
export function updateLabels(): void {
  const w = innerWidth, h = innerHeight;
  for (const L of labels) {
    const p = L.visible() ? L.getPos() : null;
    if (!p) { L.el.style.opacity = '0'; continue; }
    const dist = p.distanceTo(camera.position);
    projected.copy(p).project(camera);
    // z 大于 1 说明在镜头后面
    if (projected.z > 1 || dist > L.maxDist) { L.el.style.opacity = '0'; continue; }
    L.el.style.opacity = String(clamp((L.maxDist - dist) / 5, 0, 1));
    L.el.style.transform = `translate(-50%, -100%) translate(${(projected.x * 0.5 + 0.5) * w}px, ${(-projected.y * 0.5 + 0.5) * h}px)`;
    if (!L.shown) {
      L.shown = true;
      if (L.chime) sfx.chime(3);
    }
  }
}
