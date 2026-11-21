// 逐像素比较新旧两版的截图：打印每一张有多少像素不一样（颜色差超过一点点才算）。
// 用法：node diff-pixels.cjs <desktop|portrait|landscape> <bi|en>
const { chromium } = require('playwright'); const fs = require('fs');
const [device, lang] = process.argv.slice(2);
const dirA = `${__dirname}/out/old-${device}-${lang}`, dirB = `${__dirname}/out/new-${device}-${lang}`;
(async () => {
  const browser = await chromium.launch(); const page = await browser.newPage();
  const files = fs.readdirSync(dirA).filter(f => f.endsWith('.png')).sort();
  let worst = 0; const rows = [];
  for (const f of files) {
    if (!fs.existsSync(`${dirB}/${f}`)) { rows.push(`${f}: 新版没有这张图`); continue; }
    const [a, b] = [dirA, dirB].map(d => 'data:image/png;base64,' + fs.readFileSync(`${d}/${f}`).toString('base64'));
    const r = await page.evaluate(async ([a, b]) => {
      const load = src => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
      const [ia, ib] = await Promise.all([load(a), load(b)]);
      if (ia.width !== ib.width || ia.height !== ib.height) return { size: `${ia.width}x${ia.height} vs ${ib.width}x${ib.height}` };
      const data = img => { const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const g = c.getContext('2d'); g.drawImage(img, 0, 0); return g.getImageData(0, 0, img.width, img.height).data; };
      const da = data(ia), db = data(ib); let diff = 0, minX = 1e9, minY = 1e9, maxX = -1, maxY = -1;
      for (let i = 0; i < da.length; i += 4) if (Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) + Math.abs(da[i + 2] - db[i + 2]) > 24) { diff++; const p = i / 4, x = p % ia.width, y = (p / ia.width) | 0; if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
      return { diff, total: da.length / 4, box: diff ? [minX, minY, maxX, maxY] : null };
    }, [a, b]);
    const pct = r.size ? 100 : r.diff / r.total * 100; worst = Math.max(worst, pct);
    rows.push(`${f}: ${r.size ? '尺寸不同 ' + r.size : r.diff === 0 ? '完全相同' : `${r.diff} 个像素不同（${pct.toFixed(3)}%），范围 ${r.box}`}`);
  }
  console.log(rows.join('\n')); console.log(`${device} ${lang}: ${files.length} 张，最大差异 ${worst.toFixed(3)}%`);
  await browser.close();
})();
