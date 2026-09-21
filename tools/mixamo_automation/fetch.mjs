#!/usr/bin/env node
// 저장소 공용 도구(saga-godot·saga-unity 등 Mixamo를 쓰는 어느 프로젝트에서나
// --dest 만 바꿔 재사용, PLAN 103-1의 asset-forge와 같은 "빌드 도구는 공유"
// 원칙 — saga-web 5판은 2D라 Mixamo 자체를 안 씀, 해당 없음).
//
// Mixamo 애니메이션 클립을 CDP로 이미 로그인된 Chrome에서 완전 백그라운드로
// 검색→선택→다운로드해 지정 폴더에 <out>.fbx 로 저장한다.
// 마우스/키보드/창 포커스를 전혀 건드리지 않는다(Playwright.connectOverCDP +
// DOM 셀렉터 클릭, 화면 좌표 없음) — 창을 최소화해 둬도 동작한다.
//
// 사전 조건: 자동화 전용 Chrome 프로필이 --remote-debugging-port=9222 로
// 떠 있고, 그 프로필에서 mixamo.com 에 로그인돼 있어야 한다(사람 몫,
// tools/mixamo_automation/README.md 참고). 사용자 평소 Chrome 프로필과는
// 완전히 분리돼 있어 그쪽 로그인·쿠키는 전혀 건드리지 않는다.
//
// 사용법:
//   node fetch.mjs --query "Idle" --list          # 검색 결과 설명 목록만 출력(다음에 --match 로 쓸 값 찾기용)
//   node fetch.mjs --query "Idle" --match "Standing Idle" --out idle \
//     --dest <프로젝트 애셋 경로> [--skin "With Skin"]   # 기본 Without Skin(뼈대만, 리타겟용)
//
// --match 는 Mixamo 카드의 "Description:" 뒤 문구와 정확히 일치해야 한다(중복 방지).
// 한 번 검증된 (query, match) 조합은 이 폴더 README.md 표에 기록해 다른 PC/세션에서 그대로 재사용한다.

import { chromium } from 'playwright-core';
import { existsSync, mkdirSync, readdirSync, statSync, renameSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';

function arg(name, def = undefined) {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return def;
  return process.argv[i + 1];
}
const hasFlag = (name) => process.argv.includes(`--${name}`);

const CDP_URL = arg('cdp', 'http://127.0.0.1:9222');
const query = arg('query');
const match = arg('match');
const outName = arg('out');
const destDir = arg('dest');
const skinOption = arg('skin', 'Without Skin'); // saga-godot(리타겟용)는 뼈대만, saga-unity(실사 PBR)처럼 메시가 그대로 필요하면 "With Skin"
const listOnly = hasFlag('list');

if (!query) {
  console.error('사용법: node fetch.mjs --query "Idle" [--match "Standing Idle" --out idle --dest <경로>] [--list]');
  process.exit(1);
}

const downloadsDir = path.join(os.homedir(), 'Downloads');

// Mixamo는 항상 같은 이름(예: "Idle.fbx")으로 내려주기 때문에, Downloads에
// 동명 파일이 이미 있으면 브라우저가 "(1)"을 안 붙이고 **그 자리에서 덮어쓸
// 때가 있다(CDP Browser.setDownloadBehavior로 강제한 경로일 때 특히) —
// 그래서 "새 파일명이 나타났는가"가 아니라 "mtime이 클릭 이후로 갱신됐는가"
// 로 판정한다(파일명이 같아도 잡아낸다).
async function waitForNewFbx(sinceMs, timeoutMs = 60000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const cur = existsSync(downloadsDir)
      ? readdirSync(downloadsDir).filter((f) => f.toLowerCase().endsWith('.fbx'))
      : [];
    const fresh = cur.filter((f) => statSync(path.join(downloadsDir, f)).mtimeMs >= sinceMs);
    if (fresh.length > 0) {
      fresh.sort((a, b) => statSync(path.join(downloadsDir, b)).mtimeMs - statSync(path.join(downloadsDir, a)).mtimeMs);
      return fresh[0];
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  return null;
}

const browser = await chromium.connectOverCDP(CDP_URL);
const ctx = browser.contexts()[0];
const page = ctx.pages()[0] ?? (await ctx.newPage());

// connectOverCDP로 붙은 외부 Chrome은 Playwright가 다운로드 동작을 대신
// 관리해주지 않는다 — 새 프로필의 기본값(저장 위치 매번 묻기)에 걸리면
// 클릭은 되는데 실제 파일이 안 나타나는 채로 조용히 멈춘다. CDP로 직접
// "무조건 downloadsDir 로 바로 저장"을 강제한다.
const cdpSession = await browser.newBrowserCDPSession();
await cdpSession.send('Browser.setDownloadBehavior', {
  behavior: 'allow',
  downloadPath: downloadsDir,
  eventsEnabled: false,
});

// SPA(리액트, 해시 라우팅)라 같은 탭에 대고 hash만 바꾸는 goto()는 실제
// 리로드가 아니라서, 이전 실행이 열어둔 모달의 React 상태(isOpen)가 그대로
// 남아있을 수 있다 — 매번 진짜 새로고침으로 시작해 항상 깨끗한 상태에서
// 검색한다(비용은 ~1~2초, 안정성이 우선).
const url = `https://www.mixamo.com/#/?page=1&query=${encodeURIComponent(query)}&type=Motion,MotionPack`;
await page.goto(url, { waitUntil: 'networkidle' });
await page.reload({ waitUntil: 'networkidle' });
await page.waitForSelector('.product.product-animation', { timeout: 15000 });
await page.waitForTimeout(500);

if (listOnly) {
  const items = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.product.product-animation')).map((el) => {
      const t = el.textContent.trim();
      const m = t.match(/Description:\s*(.+)$/);
      return m ? m[1].trim() : t;
    });
  });
  // 중복 제거하되 순서 유지, 몇 번째(0-index)인지도 같이 보여줌
  items.forEach((label, i) => console.log(`${i}\t${label}`));
  await browser.close();
  process.exit(0);
}

if (!match || !outName || !destDir) {
  console.error('다운로드하려면 --match --out --dest 가 모두 필요함(먼저 --list 로 후보를 본다)');
  await browser.close();
  process.exit(1);
}

const escaped = match.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const target = page.locator('.product.product-animation').filter({ hasText: new RegExp(`Description:\\s*${escaped}$`) }).first();
const count = await target.count();
if (count === 0) {
  console.error(`--match "${match}" 에 해당하는 결과를 못 찾음. --list 로 정확한 문구를 다시 확인할 것`);
  await browser.close();
  process.exit(1);
}
await target.click();
await page.waitForTimeout(1200); // 3D 프리뷰 로드

await page.locator('button:has-text("Download")').first().click();
await page.waitForTimeout(600);

// Skin select: --skin 값(기본 Without Skin)을 가진 옵션을 찾아서 선택
const skinSelect = page.locator('select').filter({ has: page.locator('option:has-text("Without Skin")') }).first();
await skinSelect.selectOption({ label: skinOption });
await page.waitForTimeout(200);

// 모달 안 최종 Download 버튼(모달 푸터로 범위를 좁혀서 뒤의 큰 오렌지
// DOWNLOAD 버튼과 안 헷갈리게 함)
const clickTime = Date.now() - 1000; // 시계 오차 여유
const modalDownloadBtn = page.locator('.modal-footer button:has-text("Download")').first();
await modalDownloadBtn.click();

const fname = await waitForNewFbx(clickTime);
await browser.close();

if (!fname) {
  console.error('다운로드된 새 .fbx 를 못 찾음(60초 대기 초과) — Downloads 폴더/모달 상태 확인 필요');
  process.exit(1);
}

mkdirSync(destDir, { recursive: true });
const dest = path.join(destDir, `${outName}.fbx`);
renameSync(path.join(downloadsDir, fname), dest);
console.log(`OK: ${fname} -> ${dest}`);
