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

/**
 * 这块陶片现在能不能捡：
 * - 写了 after 的：等那个剧情节点完成才出现（例如伊甸的陶片要走进园子以后）；
 * - 放在光之路上的：一开始就在；
 * - 其余的：要等陆地升起来。
 */
function cardAvailable(c: Card): boolean {
  if (c.after) return isDone(c.after);
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
