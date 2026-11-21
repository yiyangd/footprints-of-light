// 输入：键盘、鼠标、触屏。
// 这个文件只负责“听”玩家按了什么。按键要触发的事（翻剧情、开图鉴、做姿态……）
// 由 main.ts 通过 initInput(actions) 交进来，这样输入模块不用认识游戏的其他部分。
import { $ } from './env';
import { canvas } from './renderer';
import { game } from './state';

/** 现在按着的键（例如 'KeyW'、'ShiftLeft'） */
export const keys = new Set<string>();

/** 这一帧的输入 */
export const input = {
  joyX: 0, joyY: 0,          // 虚拟摇杆：-1 到 1
  jumpHeld: false,           // 跳跃键是不是一直按着（滑翔用）
  jumpPressed: false,        // 跳跃键刚刚按下
  look: { dx: 0, dy: 0 },    // 拖动视角的距离（像素）
  zoom: 0,                   // 滚轮滚了几格
  lastLook: 0,               // 上一次拖动视角的时间
};

/** 按键要触发的事，由 main.ts 提供 */
export interface InputActions {
  toggleLang(): void;
  advanceStory(): void;
  closeModals(): void;
  openJournal(): void;
  gesture(id: string): void;
  /** 姿态的按键，例如 { KeyR: 'rest', KeyF: 'name' } */
  gestureKeys: Record<string, string>;
}

function bindKeyboard(actions: InputActions): void {
  addEventListener('keydown', (e) => {
    if (e.repeat && (e.code === 'Space' || e.code === 'Enter')) return;
    keys.add(e.code);
    if (e.code === 'KeyL' && (game.state === 'play' || game.state === 'story')) { actions.toggleLang(); return; }
    if (game.state === 'story' && (e.code === 'Space' || e.code === 'Enter' || e.code === 'KeyE')) {
      e.preventDefault();
      actions.advanceStory();
      return;
    }
    if (game.state === 'modal') {
      if (e.code === 'Escape' || e.code === 'KeyB' || e.code === 'Enter') { e.preventDefault(); actions.closeModals(); }
      return;
    }
    if (game.state !== 'play') return;
    if (e.code === 'Space') { e.preventDefault(); input.jumpHeld = true; input.jumpPressed = true; }
    if (e.code === 'KeyB') actions.openJournal();
    const gesture = actions.gestureKeys[e.code];
    if (gesture) actions.gesture(gesture);
  });
  addEventListener('keyup', (e) => {
    keys.delete(e.code);
    if (e.code === 'Space') input.jumpHeld = false;
  });
  // 切到别的窗口时，把所有键都当作松开，免得角色一直往前走
  addEventListener('blur', () => { keys.clear(); input.jumpHeld = false; });
}

/** 鼠标拖动看四周 + 滚轮缩放（触屏：在画面上拖动） */
function bindLook(): void {
  const pointers = new Map<number, { x: number; y: number }>();
  canvas.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    const p = pointers.get(e.pointerId);
    if (!p) return;
    input.look.dx += e.clientX - p.x;
    input.look.dy += e.clientY - p.y;
    p.x = e.clientX;
    p.y = e.clientY;
    input.lastLook = performance.now();
  });
  const endPtr = (e: PointerEvent): void => { pointers.delete(e.pointerId); };
  canvas.addEventListener('pointerup', endPtr);
  canvas.addEventListener('pointercancel', endPtr);
  canvas.addEventListener('wheel', (e) => { e.preventDefault(); input.zoom += Math.sign(e.deltaY); }, { passive: false });
}

/** 左下角的虚拟摇杆 */
function bindJoystick(): void {
  const joy = $('joy'), knob = $('joy-knob');
  let id: number | null = null, cx = 0, cy = 0;
  const move = (e: PointerEvent): void => {
    if (e.pointerId !== id) return;
    let dx = e.clientX - cx, dy = e.clientY - cy;
    const d = Math.hypot(dx, dy), max = 52;
    if (d > max) { dx *= max / d; dy *= max / d; }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    input.joyX = dx / max;
    input.joyY = -dy / max;
  };
  joy.addEventListener('pointerdown', (e) => {
    id = e.pointerId;
    const r = joy.getBoundingClientRect();
    cx = r.left + r.width / 2;
    cy = r.top + r.height / 2;
    joy.setPointerCapture(id);
    move(e);
  });
  joy.addEventListener('pointermove', move);
  const end = (e: PointerEvent): void => {
    if (e.pointerId !== id) return;
    id = null;
    input.joyX = input.joyY = 0;
    knob.style.transform = '';
  };
  joy.addEventListener('pointerup', end);
  joy.addEventListener('pointercancel', end);
}

/** 右下角的触屏按钮：跳跃（剧情里是“继续”）和姿态 */
function bindTouchButtons(actions: InputActions): void {
  const jb = $('t-jump');
  jb.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if (game.state === 'story') { actions.advanceStory(); return; }
    input.jumpHeld = true;
    input.jumpPressed = true;
  });
  const jend = (): void => { input.jumpHeld = false; };
  jb.addEventListener('pointerup', jend);
  jb.addEventListener('pointercancel', jend);
  jb.addEventListener('pointerleave', jend);
  // 姿态按钮的 id 是 t-姿态名，例如 t-rest、t-name
  for (const gesture of Object.values(actions.gestureKeys)) {
    document.getElementById(`t-${gesture}`)?.addEventListener('click', () => actions.gesture(gesture));
  }
}

/** 开始监听所有输入。游戏打开时调用一次 */
export function initInput(actions: InputActions): void {
  bindKeyboard(actions);
  bindLook();
  bindJoystick();
  bindTouchButtons(actions);
}

/** 把键盘和摇杆合成一个“想往哪走”：x 左右，y 前后，mag 用了多大的力，run 是不是在跑 */
export function moveInput(): { x: number; y: number; mag: number; run: boolean } {
  let x = input.joyX, y = input.joyY;
  if (keys.has('KeyW') || keys.has('ArrowUp')) y += 1;
  if (keys.has('KeyS') || keys.has('ArrowDown')) y -= 1;
  if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1;
  if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;
  const mag = Math.hypot(x, y);
  if (mag > 1) { x /= mag; y /= mag; }
  // 按住 Shift，或者把摇杆推到底，就是跑
  const run = keys.has('ShiftLeft') || keys.has('ShiftRight') || Math.hypot(input.joyX, input.joyY) > 0.92;
  return { x, y, mag: Math.min(1, mag), run };
}
