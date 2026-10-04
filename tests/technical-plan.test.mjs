import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const plan = await readFile(new URL('../docs/TECHNICAL_PLAN.md', import.meta.url), 'utf8');

test('技術方案涵蓋首版架構、表單流程與 Electron 評估', () => {
  for (const section of ['Astro + TypeScript', 'Cloudflare Pages', 'Cloudflare Pages Functions', 'Google Sheets', 'Electron 評估', '上線前需確認']) {
    assert.ok(plan.includes(section), `技術方案缺少：${section}`);
  }
});

test('技術方案保留人工確認，並排除首版非目標功能', () => {
  assert.match(plan, /人工確認/);
  assert.match(plan, /不建立即時庫存、線上付款、會員或複雜管理後台/);
  assert.match(plan, /可複選車種/);
  assert.match(plan, /團體預約另提供 LINE/);
});
