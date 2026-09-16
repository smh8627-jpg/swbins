# saga-dungeon (사가블로)

정본은 이 폴더 `PLAN.md`(≈46KB, SAGA-DESIGN §9.3 틀), 현재 상태는 `README.md`(266KB), 이 판 세션 이력은 `HANDOFF.md`(222KB, append-only), 저장소 전체 규칙은 루트 `../../SAGA-HANDOFF.md`, 공통 개편 설계는 `../../SAGA-DESIGN.md`.

- **`README.md`·`HANDOFF.md`·`../../SAGA-HANDOFF.md` 는 통째로 읽지 않는다.** `grep -n "^## \|^### "` 로 목차만 뽑고 필요한 절·날짜만 `sed -n` 으로 읽는다. `PLAN.md` 도 목차 먼저.
- 세션 기록은 `HANDOFF.md` 에만 append 한다. `PLAN.md` 는 결정이 바뀔 때만 고친다.
- 코드 주석의 "PLAN §28-8"·"§60" 류 옛 절 번호는 `HANDOFF.md` 의 같은 번호 절을 가리킨다(2026-09-16 재편으로 PLAN 절 번호가 바뀌었다).
- 퓨전(과거×현대×미래) 선행 판이다 — 다른 네 판보다 먼저 실험한다(`PLAN.md` §1·§5.7).
- `../../saga-godot/`·`../../saga-unity/` 는 별개 프로젝트다. 여기서는 안 본다.
