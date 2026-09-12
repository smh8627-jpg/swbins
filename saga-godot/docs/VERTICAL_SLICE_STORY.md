# VERTICAL_SLICE_STORY

PLAN.md 39장 순서(SAGA Core → Vertical Slice(GO) → DUNGEON → FOREST →
**STORY** → REALM)의 네 번째 칸. GO·DUNGEON·FOREST Vertical Slice가 전부
승인됐고(PROJECT_STATE.md의 세 "PLAN.md 100단계 — Vertical Slice 승인"
항목 참고), 사용자가 "1,2번 순서대로 진행해"(STORY 착수 → FOREST 콘텐츠
확장 순서)로 다음 칸 착수를 지시했다(2026-09-12).

LEGACY_FEATURE_AUDIT.md "SAGA STORY" 절의 KEEP/REWORK/MERGE/DROP 분류를
그대로 따른다 — 이 문서는 그중 **이번 슬라이스에 넣을 최소 범위**만
자른다. GO·DUNGEON·FOREST의 VERTICAL_SLICE*.md와 같은 방식("작게
시작해 재미부터 검증한다", master.md 3.1절)이다.

## STORY의 실제 핵심 감각

다섯 판 중 **유일하게 2D 사이드스크롤을 3D로 바꾸는 게 렌더링 이상의
문제**다(LEGACY_FEATURE_AUDIT.md) — 플랫포머 물리 자체가 좌우+상하 두
축에 묶여 있다. 웹판(`saga-story`) 자신도 이미 같은 문제를 겪고 있고,
자기 README에서 낸 답이 "Background/Midground/Foreground 레이어 +
Gameplay Depth"다 — **횡스크롤을 유지하되 깊이만 더하는 절충안**
(완전 자유 3D RPG로 안 바꾼다, 그러면 플랫포머 정체성 자체가 사라진다).
saga-godot도 이 절충을 그대로 KEEP한다.

물리 상수(중력 1900·점프 760·달리기 270, `js/side.js`)는 웹의 픽셀
단위라 Godot 미터 단위로 그대로 못 옮긴다 — 다만 **비율(정점까지
걸리는 시간·달리기/점프 속도비)은 감각의 정체성**이라 그 비율만 지켜
새로 잡는다(2절 참고, DUNGEON `camAim`을 각도로 다시 잡았을 때와 같은
방식 — 원문 그대로 이식하지 않는다).

**급소(急所)+경직(硬直)** — 크리티컬이 터지면 그 프레임에 `dt *= 0.12`를
0.055초 동안 걸어 손맛을 준다(`js/game.js` `freeze` 그대로, 원작 상수
안 바꿈). 다섯 판 중 이 판만 갖는 손맛의 절반이라 **첫 슬라이스부터
넣는다**(DUNGEON이 "때린다→맞는다→쓰러진다→줍는다" 네 동사부터
검증했듯, 이 판은 그 네 동사에 이 히트스톱까지 다섯째로 곁들여야
"이 판답다"는 확인이 된다).

## 1. Vertical Slice 범위 확정

포함:

```text
사냥터 하나(원작 9개 구간 중 tier1·need:1의 대표 격인 "허창 들판",
  data-side.js FIELDS['field'] 그대로 — 하늘색·mood:sky)
플레이어 이동(달리기+점프, 물리 상수는 비율만 유지해 새로 튜닝) +
  고정 축 카메라(2절)
줄(로프) 이동 하나만 — 원작은 로프/사다리 둘이지만 이번엔 하나로 좁힌다
직업 하나(무명無名, tier0 — 아직 전직 안 한 시작 상태 그대로)
무예 하나(연참連斬, cost 0·cd 0.36 — tier0의 넷 중 기본 평타 하나만,
  나머지 셋(횡소·기탄·기합)은 제외)
잡졸 하나(황건적, tier1, data-enemy.js 그대로 — weapon:club·color 값
  안 바꿈)
급소+경직(히트스톱 0.055초) — 위 "실제 핵심 감각" 그대로
사명 하나("첫 사냥", data-quest.js q_first 그대로 — kill 10마리 관찰형
  카운트)
저장/불러오기(위치+레벨/경험치 정도, GO/DUNGEON/FOREST와 같은 최소 범위)
```

제외(다음 슬라이스로 미룸 — LEGACY_FEATURE_AUDIT.md의 KEEP 목록 대부분이
여기로 간다):

```text
나머지 사냥터 8곳(강릉진·오림숲·남정성·한중굴혈·기산채·호로곡 등,
  tier2~4)
사다리(로프만 먼저) · Gameplay Depth의 실제 Z축 이동(카메라는 깊이감을
  "보여만" 주고, 플레이어는 이번 슬라이스에서 한 평면 위만 걷는다)
전직 트리 전체(1~4차, 직업 4갈래×4단 — 무명만)
무예 나머지(48-1개, 연참 하나 뺀 전부)
장비/노획/유니크(data-gear.js·data-unique.js) — 몬스터가 뭘 떨어뜨리지
  않는다(DUNGEON 첫 슬라이스가 "이름만 있는 장비" 정도로 좁혔던 것보다
  더 좁힌다 — 이 슬라이스는 전투·이동 감각 자체가 먼저다)
사명 나머지(kill 이외 goal.type: gear/gather/visit/talk/skill/gold/boss)
업적(data-achieve.js) · 상점/행상 · 원거리 적(활/조총 — 첫 몬스터는
  근접형만)
엘리트/보스
```

이유: FOREST VERTICAL_SLICE.md와 같은 논리 — "재미가 확인된 후 콘텐츠를
확장한다." STORY는 다섯 판 중 유일하게 물리 축 자체를 다시 설계해야
하는 판이라(위 "실제 핵심 감각"), 오히려 이동+전투 감각 검증을 다른
무엇보다 먼저 끝내야 한다.

## 2. 카메라·깊이 설계

**REWORK 대상 — GO/DUNGEON처럼 3인칭·고정각 추적 카메라를 그대로
가져오지 않는다.** 이 판은 플랫포머라 카메라가 **한 축(가로)에 묶여야
한다** — 웹판 자신의 절충안(Background/Midground/Foreground +
Gameplay Depth)을 그대로 Godot 좌표로 옮긴다:

```text
플레이어는 X(가로)·Y(높이) 평면 위에서만 움직인다 — Z(깊이)는 이번
  슬라이스에서 고정
카메라(Camera3D, 직교가 아니라 좁은 시야각 원근 — 완전 직교면 원작의
  "약간의 입체감"이 사라진다)는 플레이어를 X만 따라가고(Y는 완만하게
  보간), Z는 항상 같은 거리에서 옆을 본다 — 회전·줌 없음(DUNGEON의
  "화면 고정" 결정과 같은 정신, 다만 이쪽은 애초에 축 자체가 하나뿐)
Background(Z 매우 음수, 큰 실루엣 — 기존 GO/FOREST 에셋 재활용,
  충돌 없음) / Midground(Z=0, 실제 걷는 면 — 여기만 충돌·전투)
  / Foreground(Z 약간 양수, 작은 장식만 — 이번 슬라이스는 생략 가능,
  있으면 좋고 없어도 완료 조건에 안 걸린다)
```

물리 상수 재설계 — 웹 비율(정점까지 0.4초, 달리기/점프 속도비 0.355)만
지키고 실제 미터 값은 GO player.gd(WALK 6·RUN 10·GRAVITY 20, m/s
단위)와 같은 스케일 느낌으로 다시 잡는다(정확한 도출식이 아니라 손맛
튜닝 몫 — DUNGEON 카메라 각도를 다시 잡았을 때와 같은 방식):

```text
GRAVITY ≈ 36 m/s² · JUMP_SPEED ≈ 15 m/s(정점까지 약 0.4초, 웹과 같은
  타이밍) · RUN_SPEED ≈ 6 m/s(GO WALK_SPEED와 같은 스케일)
```

## 3. 전투 설계

웹판 `side.js`의 실시간 전투(턴형 선택지가 아니다 — GO의 duel_rules.gd와
다르고, DUNGEON의 실시간 근접과 같은 결)를 그대로 가져오되 스킬은
연참(무명 기본 평타) 하나만:

```text
연참 — cost 0·cd 0.36초, 공격 범위 안의 적 하나를 때린다
급소(crit) — critRate 0.15·critMul 1.6(core.tuned 원문 값 그대로)
경직 — 급소가 터지면 dt *= 0.12를 0.055초(freeze 상수 그대로)
잡졸(황건적) — 맞으면 넉백(kx), 기력 다하면 쓰러진다(DUNGEON 잡졸과
  같은 최소 상태 기계: 서 있다/맞는다/쓰러진다)
```

## 완료 조건

```text
게임 실행 → 3D 허창 들판(2.5D 고정 카메라) 진입 → 달리고 점프한다 →
줄을 타고 오른다/내려간다 → 황건적과 마주친다 → 연참으로 때린다(급소가
터지면 히트스톱을 눈으로 확인한다) → 쓰러뜨린다 → "첫 사냥" 진행
(N/10)이 오른다 → 저장한다 → 다시 켜서 이어진다
```

GO의 12단계·DUNGEON의 8단계·FOREST의 7단계와 같은 자리 — 이 아홉
단계가 "때리는 손맛이 이 판답게 다른가"(급소+경직이 다른 네 판과
구별되는 유일한 축)를 스스로 답할 수 있으면 성공이다.

## 4. 무예 나머지 셋 — 횡소·기탄·기합 (2026-09-12)

**사용자 지시 "1,2,3 다 진행해"**(REALM VERTICAL_SLICE_REALM.md 11·12절과
같은 승인 묶음의 세 번째, "REALM 밖 다른 판" 후보) — STORY가 GO/DUNGEON/
FOREST 중 진도가 가장 얕아 골랐다. 1절 "제외" 목록의 "무예 나머지
(48-1개)" 중, 무명이 처음부터 갖는 tier0 넷(`data-job.js` SKILLS
job:'none') 나머지 셋(횡소·기탄·기합)만 먼저 채운다 — DUNGEON/FOREST가
"제외" 목록을 하나씩 좁혀 채운 것과 같은 방식.

**MP 도입** — 연참(cost 0) 하나만 있을 땐 자원이 필요 없었다. 나머지
셋은 전부 cost>0이라 `side.js`의 MP_MAX=100·MP_REGEN=8(초당, core.tuned
기본값) 그대로 들였다. "앉아 쉬면 더 빨리 찬다"(resting 보너스)는 입력을
하나 더 얹는 일이라 이번엔 뺐다(다음에 볼 자리) — 세이브에도 안 넣는다
(재입장 시 가득 찬 채 시작, 원작 "쉬는 중은 mp 가득 참으로 시작"과
같은 결과).

**세 무예**(cost·cd·mul·buff 전부 원문 그대로, `data-job.js` SKILLS):
- **횡소(sweep)** — aoe, cost18·cd4·mul1.8. r:117px = REACH(78px)*1.5를
  ATTACK_RANGE(2.2m)*1.5=3.3m로 옮겼다(비율만 유지, 이 포트의 기존
  방식). **정면 판정이 없다** — 등 뒤도 맞는다(원작 aoe가 360도라 그대로).
- **기탄(bolt)** — 관통, cost24·cd6·mul2.1. **재해석** — 이 슬라이스는
  투사체 이동이 없어(적이 제자리에 서 있다, story_enemy.gd) "더 멀리
  뻗는 정면 공격"으로 바꿨다(사거리 ATTACK_RANGE*2=4.4m, 판정은 연참과
  같은 정면 판정 재사용).
- **기합(brace)** — buff, cost30·cd14, sec8·atk×1.35·speed×1.2 그대로.
  `_effective_atk()`(연참·횡소·기탄 공용)와 `_walk()`의 속도 배율이
  `_buff_time_left`를 읽어 적용한다.

**구현**:
- `story_combat.gd`: MP_MAX·MP_REGEN·SWEEP_*·BOLT_*·BRACE_* 상수 신규.
- `story_player.gd`: `mp`·쿨다운 셋(`_cd_sweep`/`_cd_bolt`/`_cd_brace`)·
  `_buff_time_left` 신규. `_melee_hit(range, mul)` 공용 헬퍼로 연참·기탄이
  같은 정면 판정을 공유(중복 제거). `_cast_sweep()`/`_cast_bolt()`/
  `_cast_brace()` 신규 — MP·쿨다운 부족하면 `side.js castSkill()`처럼
  조용히 무시(원문에 실패 메시지가 없다).
- `project.godot`: `story_skill_sweep`(U)·`story_skill_bolt`(I)·
  `story_skill_brace`(O) 입력 액션 신규(J=연참·Space=점프 옆자리).
  **모바일 스킬 버튼은 이번에 안 넣었다** — 이 슬라이스는 애초에
  키보드만 있고(가상 조이스틱도 없다) 이동 입력 자체가 아직 키보드
  전용이라, 스킬만 먼저 모바일 버튼을 얹으면 오히려 어색하다(다음에
  볼 자리, 모바일 입력 전체를 붙일 때 같이).

**검증(헤드리스, 값 자체까지)** — import 확인 → texture-a.png.import만
재발생(알려진 노이즈, 되돌림), `project.godot`엔 의도한 입력 액션
셋만 추가됨 확인(diff 검토). 다섯 씬 전부 `--quit-after 5` 세 번 연속
exit 0·로그 무결. **임시 디버그로 실제 값 확인**(`story_field.gd`
`_ready()`에 잠깐 추가, 서로 다른 적 둘을 써서 "한 방에 죽는 잡졸"이
다음 판정을 가리지 않게 함): MP 시작 100 → 기탄 시전(사거리 3.0m,
ATTACK_RANGE 2.2 밖·BOLT_RANGE 4.4 안) 명중 확인·MP 76(100-24) 정확
→ 쿨다운 중 재시전 MP 안 깎임(차단) 확인 → 횡소(적을 등 뒤 -1.5m에
둠, `_facing`은 오른쪽) 명중 확인(방향 안 가림)·MP 18 소모 정확 →
기합 시전 후 `_effective_atk()` 21→28.35(21×1.35) 정확·`_buff_time_
left`=8 정확·MP 30 소모 정확 → 남은 MP 28로 기합 재시전 시 MP 안
깎임(부족으로 차단) 확인. 디버그 원상복구(`story_field.gd` git diff
0줄, story_player.gd/story_combat.gd는 이 절의 정식 변경이라 유지).

**GUI 실기 확인은 아직 안 함** — 횡소·기탄·기합을 실제로 눌러 손맛·
MP 게이지 체감(전용 UI가 없어 지금은 눈에 안 보인다, 다음에 볼 자리)을
확인할 것. 계속 몰아서 받을 것.

**다음 이어질 것** — MP를 눈에 보이게 하는 HUD(게이지 하나), 또는 1절
"제외" 목록의 다음 항목(사다리+Z축 깊이, 나머지 사냥터, 전직 트리 등) —
승인 후.

## FINAL RULE (이 문서에도 동일 적용)

PLAN.md의 그 규칙 그대로 — 한 번에 다 만들지 않는다. Legacy Audit →
Architecture(이미 공용) → 이 설계 → Phase 1(프로젝트 폴더 생성)까지만
먼저 하고, 그 뒤는 "현재 Step 확인 → 그 Step만 실행 → 검증 → 상태
기록 → 다음 Step"으로 이어간다.
