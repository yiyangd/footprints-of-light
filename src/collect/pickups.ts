// 世界里的知识陶片：一块块发光的碎陶片浮在地图上，走过去就捡起来。
import * as THREE from 'three';
import { CARDS } from '../content';
import type { Card } from '../content/types';
import { sfx } from '../core/audio';
import { scene } from '../core/renderer';
import { game, W } from '../core/state';
import { TEX } from '../core/textures';
import { player } from '../player/player';
import { groundAt } from '../world/path';
import { openCard } from './journal';
import { refreshCounts } from './rewards';
import { isDone, persist, save } from './save';

/** 每块陶片在世界里的样子：一张永远正对镜头的贴图 */
const pickups = CARDS.map((card) => {
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.shard, transparent: true, depthWrite: false, fog: false }));
  sprite.scale.setScalar(1.1);
  scene.add(sprite);
  return { card, sprite };
});

/** 这一章的陶片，要等哪个剧情节点完成以后才出现：章的代号 → 节点的 id */
const CARD_GATE: Record<string, string> = {
  eden: 'e1',    // 走进园子之后
  promise: 'e6', // 第 3 章（草稿）：第 2 章走完之后
};

/**
 * 这块陶片现在能不能捡：
 * - 伊甸和它之后的章节：等 CARD_GATE 里写的那个节点完成才出现；
 * - 放在光之路上的：一开始就在；
 * - 其余的：要等陆地升起来。
 */
function cardAvailable(c: Card): boolean {
  const gate = CARD_GATE[c.ep];
  if (gate) return isDone(gate);
  return c.onPath ? true : W.land > 0.97;
}

/** 每一帧：让陶片上下浮动；玩家走到跟前就捡起来并打开 */
export function updatePickups(t: number): void {
  for (const { card, sprite } of pickups) {
    const [x, z] = card.at;
    sprite.visible = !save.cards.includes(card.id) && cardAvailable(card);
    if (!sprite.visible) continue;
    const gy = groundAt(x, z) ?? 0.2;
    sprite.position.set(x, gy + 0.9 + Math.sin(t * 2 + x) * 0.12, z);
    const near = Math.hypot(player.pos.x - x, player.pos.z - z) < 1.6 && Math.abs(player.pos.y - gy) < 3;
    if (game.state === 'play' && near) {
      save.cards.push(card.id);
      persist();
      refreshCounts();
      sfx.chime(5);
      openCard(card);
    }
  }
}
