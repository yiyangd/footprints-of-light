// 页面文字占位符的测试。运行：npm test
import { describe, expect, it } from 'vitest';
import uiJson from '../../content/ui.json';
import { fillPageText } from './page-text';
import type { UiFile } from './types';

const ui = uiJson as unknown as UiFile;

describe('fillPageText', () => {
  it('双语占位符变成英文、中文两个 span', () => {
    expect(fillPageText('<button><!--ui:page.cover.begin--></button>', ui))
      .toBe('<button><span class="en">Begin the Journey</span><span class="zh" lang="zh-CN">开始旅程</span></button>');
  });

  it(':blk 让中文另起一行', () => {
    expect(fillPageText('<!--ui:page.cover.title:blk-->', ui)).toContain('<span class="zh blk" lang="zh-CN">光之踪迹</span>');
  });

  it(':rich 把 [[按键]] 显示成键盘按键的样子', () => {
    const html = fillPageText('<!--ui:page.cover.helpDesk:blk:rich-->', ui);
    expect(html).toContain('<kbd>W A S D</kbd>');
    expect(html).toContain('<kbd>空格</kbd>');
    expect(html).not.toContain('[[');
  });

  it('单语占位符原样放进去（放进属性里也安全）', () => {
    expect(fillPageText('<canvas aria-label="{{ui:page.aria.game}}"></canvas>', ui)).toBe('<canvas aria-label="Game view"></canvas>');
    expect(fillPageText('<title>{{ui:text.title.bi}}</title>', ui)).toBe('<title>Footprints of Light 光之踪迹 · Prologue 序章</title>');
  });

  it('经文：一字不改，并拼上引号、出处和译本（AGENTS.md 第 1、2 条）', () => {
    const verse = (ui.page.cover as { verse: { text: { en: string; zh: string } } }).verse;
    const html = fillPageText('<!--ui:page.cover.verse:blk-->', ui);
    expect(html).toBe(
      `<span class="en">“${verse.text.en}” (Psalm 77:19, ESV)</span><span class="zh blk" lang="zh-CN">“${verse.text.zh}”（诗篇 77:19）</span>`,
    );
  });

  it('找不到的名字、类型不对的名字都报错，打包会停下来', () => {
    expect(() => fillPageText('<!--ui:page.nope-->', ui)).toThrow(/page\.nope/);
    expect(() => fillPageText('<!--ui:page.aria.game-->', ui)).toThrow(/不是一段双语文字/);
    expect(() => fillPageText('{{ui:page.cover.title}}', ui)).toThrow(/应该是一句文字/);
  });

  it('真正的 index.html 里每个占位符都找得到文字', async () => {
    const { readFileSync } = await import('node:fs');
    const html = fillPageText(readFileSync(new URL('../../index.html', import.meta.url), 'utf8'), ui);
    expect(html).not.toMatch(/<!--ui:|\{\{ui:/);
    expect(html).toContain('www.esv.org');
  });
});
