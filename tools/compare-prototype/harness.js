// 在页面自己的脚本之前运行：把“时间”换成假的，这样新旧两版可以一帧一帧同步地走，结果能精确比较。
(() => {
  let now = 1000, seq = 0;
  const frames = [], timers = [];
  window.__realRaf = window.requestAnimationFrame.bind(window); // 留一个真的，用来等浏览器把触屏事件送到
  performance.now = () => now;
  window.requestAnimationFrame = (cb) => { frames.push(cb); return ++seq; };
  window.setTimeout = (cb, ms = 0) => { const id = ++seq; timers.push({ id, at: now + ms, cb }); return id; };
  window.clearTimeout = (id) => { const i = timers.findIndex(t => t.id === id); if (i >= 0) timers.splice(i, 1); };
  // 往前走 n 帧，每帧 dtMs 毫秒：先触发到点的定时器，再跑这一帧
  // 为了跑得快：一次走很多帧时，只有最后一帧真的画出来，前面的帧只算不画
  let skipDraw = false;
  const getContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
    const gl = getContext.call(this, type, ...rest);
    if (gl && /webgl/.test(type) && !gl.__wrapped) {
      gl.__wrapped = true;
      for (const name of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced', 'clear']) {
        const real = gl[name].bind(gl);
        gl[name] = (...args) => { if (!skipDraw) real(...args); };
      }
    }
    return gl;
  };
  window.__step = (n, dtMs = 50) => {
    for (let i = 0; i < n; i++) {
      skipDraw = i < n - 1;
      now += dtMs;
      timers.sort((a, b) => a.at - b.at || a.id - b.id);
      while (timers.length && timers[0].at <= now) timers.shift().cb();
      for (const cb of frames.splice(0)) cb(now);
    }
  };
  // 随机数也换成有种子的，两版每次得到同一串数
  let s = 20261121;
  // three.js 给物体起编号时也用随机数，两版加载时用掉的个数不一样；所以在“开始游戏”那一刻重新播种
  window.__reseed = () => { s = 20261121; };
  Math.random = () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
})();
