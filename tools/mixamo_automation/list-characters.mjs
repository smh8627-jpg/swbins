// Mixamo 캐릭터(몸) 카드 이름 찾기 — `fetch.mjs --character "<카드 이름>"` 에 넣을 정확한 이름을 얻는다.
//   node list-characters.mjs goblin mutant ghost    # 검색어마다 한 줄: [검색어] 이름 | 이름 ...
// 자동화 전용 크롬(README "최초 설정")이 9222 에 떠 있어야 한다. 모습은 mixamo.com 카드로 사람이(또는 Claude 가 카드 스크린샷으로) 본다.
import { chromium } from 'playwright-core';
const qs = process.argv.slice(2);
const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
const ctx = browser.contexts()[0];
const page = ctx.pages().find(p => p.url().includes('mixamo')) || await ctx.newPage();
for (const q of qs) {
  await page.goto(`https://www.mixamo.com/#/?page=1&query=${encodeURIComponent(q)}&type=Character`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  const names = await page.$$eval('.product.product-character', els => els.map(e => e.innerText.trim()));
  console.log(`[${q}] ${names.join(' | ')}`);
}
await browser.close();
