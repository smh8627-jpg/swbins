# saga-story (사가스토리)

정본은 이 폴더 `PLAN.md`(≈30KB, SAGA-DESIGN §9.3 틀), 현재 상태는 `README.md`(78KB), 이 판 세션 이력은 `HANDOFF.md`(append-only), 저장소 전체 규칙은 루트 `../../SAGA-HANDOFF.md`, 공통 개편 설계는 `../../SAGA-DESIGN.md`.

- **`README.md`·`HANDOFF.md`·`../../SAGA-HANDOFF.md` 는 통째로 읽지 않는다.** `grep -n "^## \|^### "` 로 목차만 뽑고 필요한 절·날짜만 `sed -n` 으로 읽는다. `PLAN.md` 도 목차 먼저.
- 세션 기록은 `HANDOFF.md` 에만 append 한다. `PLAN.md` 는 결정이 바뀔 때만 고친다.
- `../../saga-godot/`·`../../saga-unity/` 는 별개 프로젝트다. 여기서는 안 본다.
