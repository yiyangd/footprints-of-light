// 逐条比较新旧两版的样式规则（用浏览器自己解析后的结果比，所以写法不同但意思相同的不算差异）。
const { chromium } = require('playwright');
const path = require('path');
const URLS = { old: process.env.OLD_URL || 'file://' + path.resolve(__dirname, '../../prototype/dist/index.html'), new: 'http://localhost:4173/' };
async function rules(which) {
  const browser = await chromium.launch(); const page = await browser.newPage();
  await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await page.goto(URLS[which]); await page.waitForTimeout(500);
  const out = await page.evaluate(() => {
    const map = {};
    const splitSel = s => { const parts = []; let depth = 0, cur = ''; for (const ch of s) { if (ch === '(' || ch === '[') depth++; if (ch === ')' || ch === ']') depth--; if (ch === ',' && depth === 0) { parts.push(cur.trim()); cur = ''; } else cur += ch; } parts.push(cur.trim()); return parts; };
    const walk = (list, ctx) => {
      for (const rule of list) {
        if (rule instanceof CSSStyleRule || rule instanceof CSSKeyframeRule) {
          const sels = rule instanceof CSSKeyframeRule ? [rule.keyText] : splitSel(rule.selectorText);
          for (const sel of sels) { const key = ctx + ' | ' + sel; map[key] = map[key] || {}; for (const name of rule.style) map[key][name] = rule.style.getPropertyValue(name) + (rule.style.getPropertyPriority(name) ? ' !important' : ''); }
        } else if (rule instanceof CSSMediaRule) walk(rule.cssRules, ctx + ' @media ' + rule.conditionText);
        else if (rule instanceof CSSKeyframesRule) walk(rule.cssRules, ctx + ' @keyframes ' + rule.name);
        else if (rule.cssRules) walk(rule.cssRules, ctx + ' @' + rule.constructor.name);
      }
    };
    for (const sheet of document.styleSheets) { try { walk(sheet.cssRules, ''); } catch (e) { /* 别的网站的样式表读不了，跳过 */ } }
    return map;
  });
  await browser.close(); return out;
}
(async () => {
  const [a, b] = await Promise.all([rules('old'), rules('new')]);
  let same = 0, diff = 0;
  for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const A = a[key] || {}, B = b[key] || {};
    for (const prop of new Set([...Object.keys(A), ...Object.keys(B)])) {
      if (A[prop] === B[prop]) { same++; continue; }
      diff++; console.log(`≠ ${key.trim()} { ${prop} }\n   旧: ${A[prop]}\n   新: ${B[prop]}`);
    }
  }
  console.log(`规则 ${Object.keys(a).length} / ${Object.keys(b).length} 条；属性相同 ${same} 项，不同 ${diff} 项`);
})();
