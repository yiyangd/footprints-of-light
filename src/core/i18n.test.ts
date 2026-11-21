// 双语小工具的测试。运行：npm test
import { describe, expect, it } from 'vitest';
import { bi, esc, fill, join } from './i18n';

describe('bi（把双语文字变成 HTML）', () => {
  it('英文和中文各放进一个 span', () => {
    expect(bi({ en: 'Light', zh: '光' }))
      .toBe('<span class="en">Light</span><span class="zh" lang="zh-CN">光</span>');
  });

  it("cls = 'blk' 时中文另起一行", () => {
    expect(bi({ en: 'Light', zh: '光' }, 'blk')).toContain('<span class="zh blk" lang="zh-CN">光</span>');
  });

  it('文字里的 < > & " 不会被当成 HTML 标签', () => {
    const html = bi({ en: '<b>a & "b"</b>', zh: '<i>甲</i>' });
    expect(html).toContain('&lt;b&gt;a &amp; &quot;b&quot;&lt;/b&gt;');
    expect(html).toContain('&lt;i&gt;甲&lt;/i&gt;');
  });

  it('LORD 用小型大写字母显示（只包一层样式，不改经文本身）', () => {
    const html = bi({ en: 'the LORD God', zh: '耶和华神' });
    expect(html).toContain('the <span class="sc">Lord</span> God');
    // 其他单词里的 LORD 不受影响
    expect(bi({ en: 'LORDS', zh: '' })).toContain('LORDS');
  });

  it('空值变成空字符串，单独的字符串和数字原样输出', () => {
    expect(bi(null)).toBe('');
    expect(bi(undefined)).toBe('');
    expect(bi('a<b')).toBe('a&lt;b');
    expect(bi(7)).toBe('7');
  });
});

describe('fill（把 {名字} 换成值）', () => {
  it('两种语言都替换', () => {
    expect(fill({ en: '{n} collected', zh: '已收集 {n}' }, { n: '3/7' }))
      .toEqual({ en: '3/7 collected', zh: '已收集 3/7' });
  });

  it('值本身是双语文字时，各用各的语言', () => {
    expect(fill({ en: 'Chapter {n} · {t}', zh: '第 {n} 章 {t}' }, { n: 2, t: { en: 'Eden', zh: '伊甸园' } }))
      .toEqual({ en: 'Chapter 2 · Eden', zh: '第 2 章 伊甸园' });
  });
});

describe('join（把几段文字连起来）', () => {
  it('双语文字各连各的，单独的字符串两边都用', () => {
    expect(join({ en: 'Scripture', zh: '经文' }, ' · ', { en: 'Genesis 1:3', zh: '创 1:3' }))
      .toEqual({ en: 'Scripture · Genesis 1:3', zh: '经文 · 创 1:3' });
  });
});

describe('esc', () => {
  it('数字也能处理', () => {
    expect(esc(3)).toBe('3');
  });
});
