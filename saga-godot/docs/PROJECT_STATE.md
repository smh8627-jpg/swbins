# PROJECT_STATE — saga-godot 현재 상태 (2026-09-16 재편)

**이 파일은 현재 상태만 담고 세션이 끝나면 덮어쓴다. 상한 15KB.** 세션 기록·경위·판단 이유는 `docs/HISTORY.md` 에 날짜 항목으로 append 한다(항목당 15줄 이내). 규칙: `PLAN.md` 33장 규칙 10(재정의)·104장, `../SAGA-DESIGN.md` §9.
2026-09-16 이전에 이 파일에 쌓였던 6882행은 `docs/HISTORY.md` 첫 절에 그대로 있다.

## 완료 요약 — 다섯 게임 × 진척

| 게임 | 대표 씬 | VS 승인(100단계) | 51장 확장 진척(끝난 것) |
|---|---|---|---|
| GO | `games/saga_go/world/TestVillage.tscn` | **승인** 2026-09-11(사용자 실기 "재미도 있음") | 사건 7+밤 2+굴·여울·폭포 · 역사 인물 조우 3(마을 2·폐허 1, 설득 3라운드) · 도감 5갈래+pet(신수 11 배치) · 동물 6 · 날씨·계절·TimeOfDay · 역참·사진 모드·소문 · 지역 3(마을 11×11·포구 9×9·폐허 7×7, REGIONS 레지스트리) · 저장/버전 · **101-4 ①일과판+마무리 카드**(목표판 3줄·저장 시 세션 요약 카드) · **101-2 ②승급 3택**(부대 레벨업마다 공/수/보 3택+거절) |
| DUNGEON | `games/saga_dungeon/world/TestRoom.tscn` | **승인** 2026-09-12(⑯~⑱ 실기 확인) | 방 6(보스 2)·방 종류 5(상자·우물·정예 소굴·미니보스·채광)·엘리트 8 · 은사·장비 등급+접사·소켓·룬워드·세트·내구·행상·투전·연단·원소 6·인물 등용·결사·보스층 · 직업 5·무예 9모양×6갈래×3단 완주·갑주 등 부위 6 |
| FOREST | `games/saga_forest/world/TestVillageForest.tscn` | **승인** 2026-09-12 | 채집·낚시·주민 5+부탁·곤충/화석/조개+박물관·순무 시세·벽지/장판·꽃 교배(깊이+경제)·계절행사 8·옷·바이옴 지형 · 가구·집 증축 · 퓨전 몬스터 4(숲도깨비·바위도깨비·버섯정령·꽃정령)+바이옴별 2~4종째. 구면 투영 유지 |
| STORY | `games/saga_story/world/SinyaField.tscn`(세계 첫 자리)·`HeodoField.tscn`(전직)·`TestField.tscn` | 게이트 **미기록**(실기 몰아서) | 사냥터 9 완주 · 무예·MP·사다리·채집·보스·배경 · 장비 10부위 tier1~4·고유·주문서 · 원거리 적 · 업적·상점·사명 20/20+반복/일일 6 · 전직 4단(tier1~4 무예 완주)·SP 투자·칭호 라벨 · NPC_TALK 밀도 |
| REALM | `games/saga_realm/world/TestCity.tscn` | 게이트 **미기록** | 성 107 전부 · 명령 7·전임 · 월드맵(드래그 궤도, 좌표 수정) · 전쟁·외교(조공·화친)·정복 편입·충성·계략·이간·매수 · 문답 260·서고 · 인구·재해·성벽·승진 5단·정복 후 관리 · 타 세력 AI(creed)·멸망 판정·경제 AI · 시나리오 3(기본·200 관도·208 적벽)+새 게임 UI · 3D 몬스터 실루엣 |

**공통(saga_core)**: `data/characters.gd`(인물 105, id 불변)·`data/pets.gd`(신수 11) · `ui/toast.gd`·`ui/virtual_joystick.gd`·`ui/goal_board.gd`+`ui/session_card.gd`(101-4, 목표판 3줄·마무리 카드, 지금은 GO 만 붙임) · `world/world_curve_material.gd`+`shaders/curved_*`(FOREST 구면) · `world/density_report.gd`(104-5, 발견 밀도) · `shaders/cel_toon.gdshader`+`cel_shader_apply.gd`(66-2, 잠정 적용). 렌더러 Forward+/Mobile 이중(66-1, `env_pc.tres`·`env_mobile.tres`). PC 실행 파일 다섯 판 1회 빌드(2026-09-13). 스크립트 318·씬 23.

## 현재 작업

- **2026-09-16, 같은 세션 이어서("사가고돗 이어해줘 묻지말고") — PLAN 101-2 GO ②후보 "승급 3택"**: `games/saga_go/data/perks.gd`(특성 풀 12, 공/수/보 축 4개씩, `roll_three()`가 축 중복 없이 3장 뽑음) 신설. 웹판(§5-⑦, 아직 웹에도 없음)은 인물별 rank up에 붙지만 이 판엔 인물별 랭크가 없어 **부대 레벨업**을 그 자리로 썼다. `party_state.gd`에 `level_up` 신호(실제 성장에만 emit, `restore()` 로드는 emit 안 함)·`perks` 배열·`add_perk()`·특성 배율이 반영된 `_recompute()` 추가, 거절 보상은 웹의 재화("단사" 10) 대신 경험치 +20(이 판엔 재화가 없음). `test_village.gd`가 `level_up`을 받아 `ChoicePrompt`(3장+거절)를 띄우고(`npc_builder.gd`와 같은 `layer_box` 관용구), `save_state.gd`가 `party_perks` 저장(추가 필드, 버전 안 올림). 자가진단 스크립트로 실제 레벨업→버튼 클릭→`add_perk()`/거절 두 경로 모두 확인 후 지움. 헤드리스 3회 회귀 통과(레벨업은 경기 중 이벤트라 짧은 회귀엔 안 걸림, md5 불변).
- **2026-09-16, 같은 세션 — PLAN 101-4 GO ①후보 "일과판+마무리 카드"**: `saga_core/ui/goal_board.gd`(Label, 그룹 "goal_board"로 찾아 `set_goals(now, session, week)`)·`ui/session_card.gd`(choice_prompt.gd 와 같은 자급자족 팝업, 선택지 없이 닫기만) 신설. GO `test_village.gd`가 QuestState·CodexState·PartyState 신호를 모아 목표판 3줄을 채우고("이번 주"는 아직 없는 축이라 정직하게 "—"), `party_state.gd`/`codex_state.gd`에 `begin_session()`/세션 델타 헬퍼 추가, `save_button.gd`가 저장 성공 시 마무리 카드(경험치·발견·부대원 수)를 띄운다.
- **2026-09-16, 같은 세션 앞부분 — PLAN 104장 Phase 0 안정화 1~5단계 완료**: ① `tools/godot_regress.sh` 신설(5대표씬×3회 md5+error/warn 0) ② STORY·REALM 세이브에 `_migrate`/`_migrate_step` 보강 ③ `.import`/`project.godot` 되돌림은 회귀 스크립트에 포함 ④ `ChoicePrompt` 클로저 패턴 30곳 재검사(안전 확인) ⑤ `saga_core/world/density_report.gd` 신설 + 발견 밀도 실측: GO 마을 62.5%·포구 61.2%·폐허 80.0% 빈 격자(10% 기준 초과) · FOREST 마을 0.0%(60m 반경이 무의미, PLAN 105 Q-f).
- 그 앞(이전 세션, 2026-09-16): GO 폐허에 3번째 역사 인물 조우, 포구 콘텐츠 5호(고래뼈), 96·97 재감사(고칠 것 없음).

## 다음 작업 (우선순위 — 상세는 PLAN 해당 장)

1. **실기 확인 몰아서**(아래 "실기 확인 대기") — 사용자 몫. 결과는 HISTORY 에 날짜 항목으로. 이번 세션의 목표판·마무리 카드·승급 3택 화면도 여기 추가됨.
2. **PLAN 101-2 GO ③패배 비용**: 표준 F, 토벌·사건 패배 시 경험치 일부를 그 자리에 "떨어진 짐"으로 남기고 회수하는 루프 — 101-4 순서대로 다음.
3. **PLAN 102장 그래픽 1차**: WorldEnvironment 재설정(AgX·SSAO·Glow·Adjustments·Fog) → 툰 톤 사람 승인 → 아웃라인.
4. **PLAN 105장 열린 질문** 답 받기(완성판 트랙·캐릭터 스타일·후보 폴더 삭제·SDFGI/LightmapGI·FOREST 발견 밀도 기준).

## 알려진 오류

- 코드 오류: 없음(헤드리스 회귀 오류 0). `ChoicePrompt` 클로저 null 크래시는 2026-09-16 고침.
- 그래픽 결함(오류 아님): 셀셰이더에서 흰 알베도 + rim + `env_pc.tres` glow 가 겹쳐 하얗게 날아감 — 톤 미확정(102장).
- 문서: `saga-unity/`와 그래픽 목표가 갈라섰다(이쪽 카툰, 그쪽 사실적) — 개념 공유 안 함.

## 테스트 상태

- 헤드리스: `--headless --editor --quit` 임포트 오류 0 · 다섯 대표 씬 `--quit-after 3~8 --verbose` 오류·경고 0 · GO 3회 로그 md5 동일(2026-09-16).
- GUI: 2026-09-15 다섯 대표 씬 스크린샷 정상 렌더(포구는 세이브 위치 복원 때문에 못 봄). 2026-09-12 이전 실기 목록은 전부 해소.
- PC 빌드: 2026-09-13 다섯 판 1회 성공.

## 실기 확인 대기 (항목명만 — 상세는 `docs/HISTORY.md` 해당 날짜)

- **GO**: 포구 전체(늙은 어부·갈매기·게·표류물·조각배·고래뼈) · 폐허(지형·갈림길·옛 유물·"결사" 설득 3라운드) · 신수 11 조우 · 역참·사진 모드·소문 · 목표판 3줄(화면 위치·겹침 여부) · 저장 시 마무리 카드(문구·닫기) · 레벨업 승급 3택 카드(문구·손맛, 실제로 여러 번 레벨업해 카드 다양성 체감)
- **DUNGEON**: 방 종류 5 · 엘리트 8 · 방 6/보스 2 동선 · 갑주 등 부위 6 슬롯 UI · 활성 무예 45종 손맛
- **FOREST**: 바이옴별 2~4종째 몬스터 · 집 증축 · 꽃 교배 경제 · 벽지·장판 신규
- **STORY**: NPC_TALK 밀도 · 칭호 라벨 · 장비 tier2~4·고유·주문서 · 원거리 적 · 업적·상점·사명 화면
- **REALM**: 문답 260 · 시나리오 선택 UI · 월드맵 좌표(수정 후) · 3D 몬스터 실루엣 · AI 되받아침·멸망 판정
- **공통**: 셀셰이더 톤(rim/glow) 최종 승인 · Forward+ 실제 화질 · Mobile 프로파일 실기기
