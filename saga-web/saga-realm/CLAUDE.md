# saga-realm (사가국지)

정본은 이 폴더 `PLAN.md`(≈39KB, SAGA-DESIGN §9.3 틀), 현재 상태는 `README.md`(72KB), 이 판 세션 이력은 `HANDOFF.md`(77KB, append-only), 저장소 전체 규칙은 루트 `../../SAGA-HANDOFF.md`, 공통 개편 설계는 `../../SAGA-DESIGN.md`.

- **`README.md`·`HANDOFF.md`·`../../SAGA-HANDOFF.md` 는 통째로 읽지 않는다.** `grep -n "^## \|^### "` 로 목차만 뽑고 필요한 절·날짜만 `sed -n` 으로 읽는다. `PLAN.md` 도 목차 먼저.
- 세션 기록은 `HANDOFF.md` 에만 append 한다. `PLAN.md` 는 결정이 바뀔 때만 고친다.
- 경영·문답은 이 판 밖으로 퍼뜨리지 않는다(루트 CLAUDE.md). `data-quiz.js` 는 이름 정책 예외(실명 유지, 손대지 않는다).
- 코드 주석·README 의 "PLAN 16절"·"27절"·"40절"·"26-2" 류 옛 절 번호는 2026-09-16 재편 이전 PLAN 것이다 — 날짜 절(26-x, 2026-09-xx)은 `HANDOFF.md`, 작업지시서 절(1~46)은 `git log -p -- saga-web/saga-realm/PLAN.md` 로 본다.
- `../../saga-godot/`·`../../saga-unity/` 는 별개 프로젝트다. 여기서는 안 본다.
