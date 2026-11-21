// 新旧两版逐帧同步对比：同样的操作、同样的假时间、同样的随机数，记录状态并截图。
// 用法：node run-one.cjs <old|new> <desktop|portrait|landscape> <bi|en>（一般不用单独跑，见 run-all.sh）
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const [which, device, lang] = process.argv.slice(2);
// “旧的一版”默认是小样；设了 OLD_URL 就改用那个地址（拿正式工程改动前后的两个版本互相比，见 README）
const URLS = { old: process.env.OLD_URL || 'file://' + path.resolve(__dirname, '../../prototype/dist/index.html'), new: 'http://localhost:4173/' };
const DEVICES = {
  desktop: { viewport: { width: 1280, height: 720 } },
  portrait: { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true },
  landscape: { viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true },
};
const out = `${__dirname}/out/${which}-${device}-${lang}`;
fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ ...DEVICES[device], deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !/ReadPixels|ERR_FAILED/.test(m.text())) errors.push(m.type() + ': ' + m.text()); });
  await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await page.addInitScript(fs.readFileSync(__dirname + '/harness.js', 'utf8'));
  // 界面上的淡入淡出按真实时间走，而游戏时间是假的；把它们都关掉，截图才能逐像素比较
  const open = async (url) => { await page.goto('about:blank'); await page.goto(url); await page.addStyleTag({ content: '*,*::before,*::after{transition:none!important;animation:none!important}' }); await sleep(400); };
  const report = { which, device, lang, steps: {} };
  let n = 0;
  const step = (k) => page.evaluate(k => window.__step(k), k);
  const state = () => page.evaluate(() => {
    const g = window.__gzy, r = v => Math.round(v * 1e5) / 1e5, v3 = v => [r(v.x), r(v.y), r(v.z)];
    const W = {}; for (const k in g.W) if (typeof g.W[k] === 'number') W[k] = r(g.W[k]); else if (typeof g.W[k] === 'boolean') W[k] = g.W[k];
    for (const k of ['_landDrawn', 'riverLabels', 'naming', 'toldBarrier']) delete W[k]; // 新版把这几个挪到了各自的模块里
    const vis = id => { const el = document.getElementById(id); return !!el && !el.hidden && getComputedStyle(el).display !== 'none'; };
    const save = JSON.parse(JSON.stringify(g.save)); delete save.pos;
    return {
      W, save, pos: v3(g.player.pos), vel: v3(g.player.vel), facing: r(g.player.facing), energy: r(g.player.energy), onGround: g.player.onGround, gliding: g.player.gliding, gesture: g.player.gesture,
      cam: [r(g.cam.yaw), r(g.cam.pitch), r(g.cam.dist)], camPos: v3(g.camera.position), camQuat: g.camera.quaternion.toArray().map(r),
      guide: v3(g.guide.pos), storyBeat: g.story.beat ? g.story.beat.id : null, storyIdx: g.story.idx,
      calls: (document.getElementById('fps').textContent.match(/(\d+) calls/) || [])[1],
      sceneChildren: g.scene.children.length, visibleMeshes: (() => { let c = 0; g.scene.traverseVisible(() => c++); return c; })(),
      stored: (() => { try { const s = JSON.parse(localStorage.getItem('guangzhiyue-proto-v1')); if (s && s.pos) s.pos = s.pos.map(r); return s ? JSON.stringify(Object.keys(s).sort().map(k => [k, s[k]])) : null; } catch (e) { return 'ERR'; } })(),
      hud: ['tl-book', 'tl-label', 'tl-sub', 'counts', 'lang-text', 'hint', 'story-tag', 'story-text', 'snd-text'].map(id => document.getElementById(id).innerHTML),
      hintShown: document.getElementById('hint').classList.contains('show'), storyTextClass: document.getElementById('story-text').className, storyTagK: document.getElementById('story-tag').dataset.k,
      days: [...document.querySelectorAll('#tl-days i')].map(i => i.className + '|' + i.title).join(','), daysShown: document.getElementById('tl-days').style.display,
      title: document.title, htmlClass: document.documentElement.className, bodyClass: document.body.className,
      visible: ['title-screen', 'hud', 'touch', 'story', 'card-modal', 'book', 'end-screen', 't-rest', 't-name', 'btn-map', 'title-map', 'end-map', 'btn-continue', 'fps'].filter(vis),
      startBtn: document.getElementById('btn-start').innerHTML,
      toasts: [...document.querySelectorAll('.toast')].map(e => e.innerHTML),
      labels: [...document.querySelectorAll('.wlabel')].map(e => e.innerHTML + '@' + e.style.opacity + '@' + e.style.transform.replace(/-?\d+\.\d+/g, m => (+m).toFixed(1))),
      fade: document.getElementById('fade').className + '|' + document.getElementById('fade').style.opacity,
    };
  });
  const snap = async (name) => {
    n++;
    report.steps[name] = await state();
    await sleep(250);
    await page.screenshot({ path: `${out}/${String(n).padStart(2, '0')}-${name}.png` });
  };
  const html = async (name, sel) => { report.steps[name + ':html'] = await page.evaluate(s => document.querySelector(s).innerHTML, sel); };
  const key = (type, code) => page.evaluate(([type, code]) => window.dispatchEvent(new KeyboardEvent(type, { code, bubbles: true })), [type, code]);
  const press = async (code, frames = 2) => { await key('keydown', code); await step(frames); await key('keyup', code); };
  const click = (id) => page.evaluate(id => { if (id === 'btn-start' || id === 'btn-continue') window.__reseed(); document.getElementById(id).click(); }, id);
  const next = (k = 1) => page.evaluate(k => { const ids = []; for (let i = 0; i < k; i++) ids.push(window.__gzy.completeNext()); return ids; }, k);
  const tp = (x, z, yaw) => page.evaluate(([x, z, yaw]) => window.__gzy.teleport(x, z, yaw), [x, z, yaw]);
  const advanceAll = async () => { for (let i = 0; i < 12; i++) { if (!(await page.evaluate(() => !!window.__gzy.story.beat))) break; await step(10); await press('Space', 1); } };

  // 1. 开始页
  await open(URLS[which] + '#debug');
  if (lang === 'en') { await page.evaluate(() => localStorage.setItem('guangzhiyue-lang', 'en')); await open(URLS[which] + '#debug'); }
  await html('title', '#title-screen');
  report.steps['title-state'] = await page.evaluate(() => ({ title: document.title, htmlClass: document.documentElement.className, note: document.getElementById('lang-note').textContent, checked: [...document.querySelectorAll('[data-lang]')].map(b => b.getAttribute('aria-checked')).join() }));
  await page.screenshot({ path: `${out}/00-title.png` });
  // 2. 开始：开场的剧情自己开始；一行一行按空格看完
  await click('btn-start'); await step(12); await snap('begin-line1');
  await press('Space', 1); await step(12); await snap('begin-line2-wind');
  await advanceAll(); await step(50); await snap('begin-done-hint');
  // 3. 按住 W 往前走，走到第一日
  await key('keydown', 'KeyW'); await step(30); await snap('walking');
  await step(60); await key('keyup', 'KeyW'); await snap('day1-line1-light');
  await advanceAll(); await step(30); await snap('day1-done-toasts');
  await step(140); await snap('day1-after-evening');
  // 4. 跑、跳、滑翔；按 L 换语言；拖动视角、滚轮
  await key('keydown', 'ShiftLeft'); await key('keydown', 'KeyW'); await key('keydown', 'KeyD'); await step(12);
  await key('keydown', 'Space'); await step(6); await snap('jump-rising'); await step(18); await snap('gliding');
  await key('keyup', 'Space'); await key('keyup', 'KeyD'); await key('keyup', 'ShiftLeft'); await step(30); await key('keyup', 'KeyW'); await snap('after-run');
  await press('KeyL', 2); await snap('lang-toggled-by-L'); await press('KeyL', 2);
  await page.mouse.move(200, 300); await page.mouse.down(); await page.mouse.move(260, 270, { steps: 3 }); await page.mouse.up(); await page.mouse.wheel(0, 120);
  await step(20); await snap('look-and-zoom');
  // 触屏：左手推摇杆，右手按跳跃（两根手指同时）
  if (DEVICES[device].hasTouch) {
    const cdp = await ctx.newCDPSession(page);
    const center = id => page.evaluate(id => { const r = document.getElementById(id).getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }; }, id);
    const joy = await center('joy'), jump = await center('t-jump');
    // 浏览器把触屏的移动攒到下一帧才送出，所以每次都等两个真的帧，保证事件已经送到
    const touch = async (type, pts) => { await cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts }); await page.evaluate(() => new Promise(r => window.__realRaf(() => window.__realRaf(() => r())))); };
    await touch('touchStart', [{ ...joy, id: 1 }]);
    await touch('touchMove', [{ x: joy.x + 15, y: joy.y - 40, id: 1 }]); await step(25); await snap('touch-joystick-walk');
    await touch('touchMove', [{ x: joy.x + 5, y: joy.y - 70, id: 1 }]); await step(10); await snap('touch-joystick-run');
    await touch('touchStart', [{ x: joy.x + 5, y: joy.y - 70, id: 1 }, { ...jump, id: 2 }]); await step(20); await snap('touch-jump-glide');
    await touch('touchEnd', [{ x: joy.x + 5, y: joy.y - 70, id: 1 }]); await step(15);
    await touch('touchEnd', []); await step(15); await snap('touch-released');
    report.steps.touchKnob = await page.evaluate(() => document.getElementById('joy-knob').style.transform);
  }
  // 5. 第二日用“跳过这一段”，然后直接完成到第七日
  await tp(6, 30.5, 0); await step(4); await snap('day2-line1'); await click('story-skip'); await step(40); await snap('day2-skipped');
  report.steps.ids3 = await next(1); await tp(-4, 16.5, 0.6); await step(40); await snap('day3-land');
  report.steps.ids4 = await next(1); await tp(5, 4.5, -2.2); await step(40); await snap('day4-lights');
  report.steps.ids5 = await next(2); await tp(3, -16.5, 2.4); await step(60); await snap('day6-animals');
  await tp(30, -18, -1.57); await key('keydown', 'KeyW'); await step(50); await key('keyup', 'KeyW'); await snap('eden-gate-closed');
  // 6. 捡一块陶片（走到它旁边）
  await tp(13, -13.2, 0); await step(3); await snap('card-picked'); await html('card', '#card-modal .sheet'); await press('Enter', 2); await snap('card-closed');
  // 7. 第七日真的走一遍（学到“安息”），然后做姿态
  await tp(-3.5, -26.5, 0); await step(4); await advanceAll(); await step(120); await snap('day7-done');
  await press('KeyR', 2); await step(20); await snap('gesture-rest');
  if (DEVICES[device].hasTouch) await click('t-rest'); else await press('KeyR', 2);
  await step(10); await snap('gesture-rest-ended');
  // 8. 图鉴的五页
  await press('KeyB', 2);
  for (const tab of ['windows', 'relics', 'cards', 'verses', 'gestures']) { await page.evaluate(t => window.__gzy.openBook(t), tab); await html('book-' + tab, '#book .sheet'); await snap('book-' + tab); }
  await click('book-close'); await step(2);
  // 9. 伊甸
  await tp(40, -15.5, 1.57); await step(4); await snap('e1-line1'); await advanceAll(); await step(100); await snap('eden-entered');
  report.steps.ids7 = await next(1); await tp(58, -12, 2.6); await step(60); await snap('eden-rivers');
  await tp(74.2, -27.7, 0); await step(30); await snap('onyx-picked');
  report.steps.ids8 = await next(1); await tp(49.5, -18.5, 0.9); await step(4); await snap('e4-naming-line1'); await advanceAll(); await step(160); await snap('eden-naming-labels');
  await press('KeyF', 2); await step(12); await snap('gesture-name');
  report.steps.ids9 = await next(1); await tp(67, -17, 2.2); await step(4); await snap('e6-line1'); await advanceAll(); await step(40); await snap('serpent-end-screen');
  await html('end', '#end-screen .sheet'); await click('end-book'); await step(2); await snap('end-to-book'); await click('book-close'); await step(30); await snap('after-end');
  await click('btn-sound'); await step(2); await snap('muted'); await click('btn-lang'); await step(2); await snap('lang-button');
  // 10. 重新打开页面，点“继续”
  await open(URLS[which] + '#debug');
  await html('title-with-save', '#title-screen .actions'); await page.screenshot({ path: `${out}/90-title-with-save.png` });
  await click('btn-continue'); await step(60); await snap('continued');
  // 11. 从主页进来的样子
  await open(URLS[which] + '?from=map#debug');
  report.steps['from-map'] = await page.evaluate(() => ({ cls: document.getElementById('title-screen').className, hidden: ['btn-map', 'title-map', 'end-map'].map(id => document.getElementById(id).hidden).join() }));
  await page.screenshot({ path: `${out}/91-from-map.png` });
  report.errors = errors;
  fs.writeFileSync(`${out}/report.json`, JSON.stringify(report, null, 1));
  console.log(which, device, lang, 'steps:', Object.keys(report.steps).length, 'errors:', errors.length, errors.slice(0, 6));
  await browser.close();
})().catch(e => { console.error('FAILED', which, device, lang, e); process.exit(1); });
