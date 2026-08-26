# 확장 모듈 (분리 보관)

2026-08-24, 본편을 **포켓몬GO / 몬스터헌터 NOW 형태**(지도 산책 + 조우 수집 + 서당 문답)로
줄이면서 아래 축들을 여기로 빼 두었다. **따로 개발할 예정** — 삭제 아님.

| 축 | 파일 |
|---|---|
| 방치 전투 (관문·파·전리) | battle.js · battle-view.js |
| 환생 (재봉·도장) | prestige.js |
| 방치 강화 · 자동화 | idle.js |

**2026-08-24 복귀** — 던전(`dungeon.js` · `dungeon-view.js` · `data-dungeon.js`)과
장비(`item.js` · `data-item.js`), 던전 적(`data-enemy.js`)은 **본편(`js/`)으로 되살렸다**.
그때 손본 것:

- `dungeon.js` 의 `partyPower()` 가 `battle.power()` 를 부르던 것을 `hero.partyPower()` 로.
  던전이 방치 전투 모듈에 매달릴 이유가 없다 — 힘은 `hero.js` 한 곳에서만 나온다
- `item.js` `bestOwner()` 의 태수(경영) 참조 제거 — 경영은 삭제됐다
- 본편의 자동화는 `idle.js` 가 아니라 `js/auto.js`(자동 순행)가 맡는다.
  여기 남은 `idle.js` 의 자동화 플래그는 환생 도장 해금과 묶여 있어 그대로 둔다

되살린 모듈이 여기 있는 것들을 부를 때는 전부 `if (global.DG.prestige)` 처럼 **가드**가
걸려 있다. 없으면 조용히 넘어간다 — 그 가드를 지우지 말 것.

**경영은 되살리지 않는다** — 2026-08-24 사용자 지시로 영지·특산·태수·교역·자동 건설을
게임에서 **완전히 뺐다**(`territory.js` · `build.js` · `data-build.js` 삭제).
코드가 필요하면 커밋 `94850f8` 에서 꺼내되, 본편에 다시 붙이지는 말 것.
구역 이름(옛 지명 30종)은 `world.js` 가 자체 보유하게 옮겼고, `core.effect()` 에서
건설 효과·영지 보너스 합산과 `core.regionCount()` · `hero.awardGovernors()` 도 제거됐다.

분리 직전 전체가 동작하던 상태는 커밋 **`94850f8`** (v1.0-full WIP).
되살릴 때는 그 커밋의 index.html 스크립트 순서·ui.js(시트)·game.js(루프)·
_test.html(진단 102+18항목)을 기준으로 삼으면 된다.

주의: 본편 core.effect() 는 이 모듈들이 없어도 돌도록 가드돼 있고,
세이브의 옛 필드(gear·battle·dungeon…)는 mergeDeep 이 보존하므로
다시 붙일 때 세이브 마이그레이션은 필요 없다.
