// 《光之踪迹》Footprints of Light —— 游戏的入口。
// 名字出自诗 77:19：“你的脚踪无人知道”——游戏把神在历史中看不见的脚踪变成光。
//
// 这个文件只做“组装”：把各个模块接在一起，处理开始页，然后开始每一帧的循环。
// 具体的事情都在各自的文件夹里：
//   core/     渲染、输入、声音、语言这些底层的东西
//   world/    地形、水、天空、植物、动物
//   player/   角色、镜头、引路之光
//   story/    剧情节点、字幕、世界效果
//   collect/  收集、存档、图鉴
//   episodes/ 每一章专属的场景和效果
//   content/  从 content/ 下的 JSON 读内容
import { bindJournalUi, closeModals, openBook } from './collect/journal';
import { updatePickups } from './collect/pickups';
import { refreshCounts } from './collect/rewards';
import { clearSave, isDone, loadSave, persist, saveForChapter } from './collect/save';
import { DRAFT_FIRST_BEAT, DRAFT_ID, EPISODES, GESTURES, UI } from './content';
import type { Lang } from './content/types';
import { bindSoundButton, initAudio, music } from './core/audio';
import { $, DEBUG, IS_TOUCH } from './core/env';
import { flash } from './core/flash';
import { bi, fill, initLang, onLangChange, setLang, toggleLang } from './core/i18n';
import { initInput } from './core/input';
import { camera, renderer, scene } from './core/renderer';
import { hideUnseen, restoreUnseen } from './core/skip-unseen';
import { game, U, W } from './core/state';
import { updateTweens } from './core/tween';
import { initDebug, updateFps } from './debug';
import { EPISODE_MODULES, loadDraftModule } from './episodes';
import { cam, updateCamera } from './player/camera';
import { doGesture, labelGestureButtons, updateGestureButtons } from './player/gestures';
import { startGuideNear, updateGuide } from './player/guide';
import { player, updatePlayer } from './player/player';
import { bindStoryUi, story, tryStartBeat } from './story/beats';
import { registerEffects } from './story/effects';
import { setDays } from './story/hud';
import { restoreFromSave, saveJustBefore } from './story/restore';
import { updateAnimals } from './world/animals';
import { updateBirds } from './world/birds';
import { updateFish } from './world/fish';
import { updateLabels } from './world/labels';
import { updatePath } from './world/path';
import { updateSky } from './world/sky';
import { updateTerrain } from './world/terrain';
import { updateWater } from './world/water';
import { updateWind } from './world/wind';

/* ---------- 主循环：每一帧做一遍 ---------- */
let lastNow = performance.now();

function frame(): void {
  requestAnimationFrame(frame);
  const now = performance.now();
  const dt = Math.min((now - lastNow) / 1000, 0.05); // 这一帧过了多少秒（卡顿时最多算 0.05 秒，免得角色“瞬移”）
  lastNow = now;
  U.time.value += dt;
  const t = U.time.value;

  const moving = updatePlayer(dt, cam.yaw);
  updateWorld(dt, t);
  updateCamera(dt, moving);
  updateLabels();
  hideUnseen(scene); // 透明度是 0 或缩没了的东西这一帧不画（画面不变，绘制次数少一些）
  renderer.render(scene, camera);
  restoreUnseen();
  if (DEBUG) updateFps(dt);
}

function updateWorld(dt: number, t: number): void {
  updateTweens(dt);
  updateSky(dt);
  updateTerrain();
  updateWater();
  updatePath();
  updateWind(dt, t, player.pos.x, player.pos.z);
  updateBirds(dt, t);
  updateFish(dt);
  updateAnimals(dt, t);
  for (const episode of EPISODE_MODULES) episode.update(dt, t);
  updateGuide(dt, t);
  updatePickups(t);
  tryStartBeat();
}

/* ---------- 开始游戏 ---------- */
/** 离开开始页，进入游戏。fromSave = true 是“继续上次的旅程” */
function startGame(fromSave: boolean): void {
  initAudio();
  $('title-screen').hidden = true;
  $('hud').hidden = false;
  if (IS_TOUCH) { $('touch').hidden = false; document.body.classList.add('touch'); }
  if (fromSave) {
    const loaded = loadSave();
    if (loaded) restoreFromSave(loaded);
  } else if (DRAFT_FIRST_BEAT) {
    // 开发时预览草稿：前面的章节都算走过了，直接从草稿那一章开始
    restoreFromSave(saveJustBefore(DRAFT_FIRST_BEAT));
  }
  updateGestureButtons();
  refreshCounts();
  setDays();
  game.state = 'play';
  startGuideNear(player.pos);
  // 镜头放在玩家身后
  cam.yaw = player.facing + Math.PI;
  cam.pos.set(player.pos.x + Math.sin(cam.yaw) * 7, player.pos.y + 3, player.pos.z + Math.cos(cam.yaw) * 7);
  if (W.light > 0.5) music.set(W.fade > 0.5 ? 'dark' : W.rest > 0.5 ? 'rest' : (isDone('e1') ? 'eden' : 'day1'));
  if (!fromSave) flash('black', 1, 0.6);
}

/* ---------- 开始页和界面上的按钮 ---------- */

/** 从主页的某一章点进来（网址带 chapter=第几章）：那一章的信息；没有就是 null */
function chapterFromUrl(): { n: number; title: { en: string; zh: string } } | null {
  const n = Number(new URLSearchParams(location.search).get('chapter'));
  return Object.values(EPISODES).find((e) => e.n === n) ?? null;
}

function bindTitleScreen(): void {
  const chapter = chapterFromUrl();
  $('btn-start').addEventListener('click', () => {
    if (chapter) {
      // 从这一章开始：前面各章算走过，收集到的东西都留着
      saveForChapter(chapter.n);
      startGame(true);
    } else {
      clearSave();
      startGame(false);
    }
  });
  $('btn-continue').addEventListener('click', () => startGame(true));
  // 有存档：多出一个“继续”按钮，原来的按钮变成“从头开始”
  if (loadSave()) {
    $('btn-continue').hidden = false;
    $('btn-start').innerHTML = bi(UI.startOver);
  }
  if (chapter) $('btn-start').innerHTML = bi(fill(UI.chapterBegin, { n: chapter.n, t: chapter.title }));
}

/** 语言：开始页的两个选项 + 游戏里右上角的地球按钮（L 键在 core/input.ts 里） */
function bindLanguageButtons(): void {
  for (const b of document.querySelectorAll<HTMLElement>('[data-lang]')) {
    b.addEventListener('click', () => setLang(b.dataset.lang as Lang));
  }
  $('btn-lang').addEventListener('click', toggleLang);
  // 七个小圆点上的提示文字不是用 bi() 生成的，换语言时要重画
  onLangChange(() => { if (!$('hud').hidden) setDays(); });
}

/**
 * 从主页“光之地图”进来的（网址带 ?from=map）才显示“回到地图”的按钮；单独打开时没有主页可回。
 * 回去之前先存档（还在开始页就不存，免得把旧存档盖掉）。
 * 回去的网址带 #map，主页就直接显示地图，不再过一遍封面。
 */
function bindMapButtons(): void {
  if (new URLSearchParams(location.search).get('from') !== 'map') return;
  $('title-screen').classList.add('from-map');
  for (const id of ['btn-map', 'title-map', 'end-map']) {
    $(id).hidden = false;
    $(id).addEventListener('click', () => {
      if ($('title-screen').hidden) persist();
      location.href = '../#map';
    });
  }
}

// 姿态的按键来自内容数据：例如“安息”的 key 是 R，对应键盘上的 KeyR
const gestureKeys = Object.fromEntries(Object.values(GESTURES).map((g) => ['Key' + g.key, g.id]));

/** 把所有东西接起来，开始每一帧的循环 */
function boot(): void {
  // 把每一章的世界效果登记起来，剧情里写的 fx 名字才找得到对应的函数
  for (const episode of EPISODE_MODULES) registerEffects(episode.effects);
  initInput({
    toggleLang,
    advanceStory: () => story.advance(),
    closeModals,
    openJournal: () => openBook(),
    gesture: doGesture,
    gestureKeys,
  });
  labelGestureButtons();
  bindStoryUi();
  bindJournalUi();
  bindSoundButton();
  bindTitleScreen();
  bindLanguageButtons();
  initLang();
  bindMapButtons();
  if (DEBUG) initDebug(startGame);
  frame();
}

// 开发时预览草稿（网址带 ?draft=...）：先把那一章的代码加载进来再开始。
// 打包发布的版本里 import.meta.env.DEV 是 false，这一段连同草稿章节的代码都不会被打包进去。
if (import.meta.env.DEV && DRAFT_ID) void loadDraftModule(DRAFT_ID).then(boot);
else boot();
