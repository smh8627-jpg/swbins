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

## 5. MP 게이지 HUD (2026-09-12)

**사용자 지시 "saga-godot 이어해"** — 4절이 남긴 두 후보(MP HUD·"제외"
목록 다음 항목) 중 작고 바로 앞 작업의 손맛을 눈에 보이게 하는 쪽을
먼저 골랐다. quest_label.gd와 같은 폴링 패턴(플레이어→HUD로 신호를
새로 안 뚫는다)의 `ProgressBar` 하나.

**구현**:
- `ui/mp_bar.gd`(신규) — `_ready()`에서 `max_value`를 `StoryCombat.
  MP_MAX`로 고정, `_process()`가 매 프레임 `player.mp`를 읽어
  `value`에 반영.
- `StoryHUD.tscn` — `MpLabel`(텍스트 "MP") + `MpBar`(`ProgressBar`,
  `mp_bar.gd` 부착)를 QuestLabel 바로 아래(offset_top 148~172)에 추가.

**검증(헤드리스, 값 자체까지)** — import 확인(texture-a.png.import만
재발생, 되돌림) → 다섯 씬 세 번 연속 exit 0·로그 무결. **임시 디버그로
실제 값 확인**(`story_field.gd`에 프레임 카운터 기반 디버그를 잠깐
추가 — `await get_tree().process_frame`은 이 헤드리스 `--quit-after`
조합에서 재개되지 않아 못 썼다, 대신 `_process()` 프레임 카운트로
바꿔 확인): 3프레임째 `player.mp`를 37.0으로 강제 설정 → 6프레임째
`MpBar.value`가 37.0(설정 직후 값, `player.mp`는 그새 회복으로
37.13까지 오름 — 폴링이 매 프레임 갱신되고 있다는 뜻)으로 확인.
디버그 원상복구(`story_field.gd` git diff 0줄).

**GUI 실기 확인은 아직 안 함** — 게이지 위치가 화면을 안 가리는지,
줄어들고 차는 게 눈으로 보기 편한지는 눈으로 볼 것. 계속 몰아서 받을 것.

**다음 이어질 것** — STORY "제외" 목록 다음 항목(사다리+Z축 깊이·나머지
사냥터·전직 트리 등), 또는 다른 판 작업 — 승인 후.

## 6. 사다리 — 허창 들판 나머지 줄 넷 (2026-09-12)

**사용자 지시 "saga-godot 이어해"** — 1절 "제외" 목록의 "사다리(로프만
먼저)"를 마저 채웠다. **재확인한 것** — "field"는 이미 발판 다섯 전부가
지어져 있었다(1절이 좁힌 건 줄만, 발판은 처음부터 다섯 다 지었다). 다만
줄은 하나뿐이라 나머지 네 발판(760·1180·1620·1900px)이 사실상 오르기
어려운 채로 남아 있었다 — data-side.js 원문을 보니 각 줄의 top이 바로
옆 발판의 y와 정확히 같다(발판마다 전용 오름길이 하나씩 있는 구조,
새로 지어낸 배치 아님). 이번에 그 네 줄(rope 셋+ladder 하나)을 마저
옮겨 다섯 발판 전부가 실제로 오를 수 있게 됐다.

**kind는 시각만 가른다** — `side.js`도 `kind: r[3] || 'rope'`를
렌더링에만 쓰고(줄 336번대) 등반 판정(오르내리기)은 rope·ladder를
안 가른다. 그래서 `story_player.gd`는 **한 글자도 안 바꿨다** — 이미
Area3D의 메타(`rope_top`/`rope_bottom`/`rope_x`)만 읽는 일반 코드였다.

**구현**:
- `field_map.gd`: `ROPE_TOP_PX`/`ROPE_BOTTOM_PX`/`ROPE_X_PX`(하나)를
  `ROPES_PX`(다섯, `[x, top_px, bottom_px, kind]`)로 교체. `rope_m()`
  →`ropes_m()`(배열 반환)로 이름도 갱신.
- `story_terrain_builder.gd`: `_build_rope()`(하나)를 `_build_climb(r)`
  (kind로 시각 분기)로 교체 — `_build_rope_visual()`(기존 원통 그대로)
  과 `_build_ladder_visual()`(신규 — 세로 기둥 둘+0.4m 간격 가로대,
  더 짙은 목재색)로 나눴다. Area3D 생성·메타·신호 배선은 공용(kind
  안 가림).

**검증(헤드리스, 값 자체까지)** — import 확인(texture-a.png.import만
재발생, 되돌림) → 다섯 씬 세 번 연속 exit 0·로그 무결. **임시 디버그로
실제 값 확인**: `ropes_m()` 다섯 개 x·top·bottom·kind가 원문 픽셀값을
SCALE(0.02)로 정확히 옮긴 값과 일치(예: x=38.6m=1930px×0.02, kind
="ladder" 다섯째만). Terrain 아래 Area3D 다섯 개 전부 생성 확인
(`find_children("*", "Area3D")`.size()=5). 사다리 전용 시각 노드
(`Ladder`) 존재 확인. **사다리 Area3D를 story_player.gd의
`set_rope_area()`에 직접 물려 `_rope_area`가 정확히 그 노드로
설정됨**(rope든 ladder든 코드 분기 없이 똑같이 동작) 확인. 디버그
원상복구(`story_field.gd` git diff 0줄).

**GUI 실기 확인은 아직 안 함** — 사다리가 줄과 다르게 보이는지, 다섯
발판을 실제로 오르내리는 느낌이 자연스러운지는 눈으로 볼 것. 계속
몰아서 받을 것.

**다음 이어질 것** — ~~1절 "제외" 목록의 나머지~~(7절에서 채집 완료),
남은 것: Gameplay Depth 실제 Z축 이동·나머지 사냥터 8곳·전직 트리·
장비/노획 등, 또는 다른 판 작업 — 승인 후.

## 7. 필드 채집(gathers) — 들꽃 셋 (2026-09-13)

**사용자 지시 "saga-godot 이어 해"**. field_map.gd 머리말이 "문(portal)·
채집(gathers)·보스는 이번 슬라이스에 안 옮긴다"고 적어 뒀던 셋 중
채집을 채웠다 — data-side.js `field.gathers` 셋(전부 herb/들꽃) 그대로,
side.js `GATHER_R=50px`·`GATHER_RESPAWN=45초` 그대로(§136-137, SCALE로
미터 환산: 반경 1.0m). 원작은 `s.mats[kind]` 누적 카운터(칸 제한
없음) — 그대로 옮겼다.

- `field_map.gd`: `GATHERS_PX`(신규) + `gather_positions_m()`.
- `story_combat.gd`: `GATHER_RADIUS_M`·`GATHER_RESPAWN_SEC`·`GATHER_INFO`
  (herb만, 다른 사냥터가 늘면 berry/ore/cinder 추가) 신규.
- `story_save_state.gd`: `mats: Dictionary`(신규) + `add_mat()`. 세이브에
  포함, SAVE_VERSION 1→2(마이그레이션 체인 없이 그냥 재시작 — 기존
  규칙 그대로).
- `story_gather.gd`(신규) — Area3D 트리거(loot_pickup.gd와 같은 뼈대),
  밟으면 사라지고 Toast로 알림 + `GATHER_RESPAWN_SEC` 뒤 같은 자리에
  다시 돋는다. `story_gather_spawner.gd`(신규) — story_enemy_spawner.gd와
  같은 패턴으로 `gather_positions_m()`의 고정 자리 셋에 하나씩 세운다.
  `TestField.tscn`에 `GatherSpawner` 노드 추가.
- **검증(헤드리스, 값 자체까지)** — import 확인(texture-a.png.import
  재발생, 되돌림 — 나머지 project.godot/*.import 변경 없음) → 다섯 씬
  세 번 연속 exit 0·로그 무결(GO/DUNGEON/FOREST 회귀 확인 포함). 임시
  디버그(`GATHER_RESPAWN_SEC`를 3.0으로 잠깐 낮춤)로: 세 자리 좌표가
  480/1050/1750px×0.02=9.6/21.0/35.0m와 정확히 일치, 첫 접촉 시
  `mats.herb`가 1로 늘고 시각·판정이 꺼짐, 안 살아있는 동안 다시
  밟아도 안 늘어남(같은 자리 반복 접촉해도 1 유지), respawn 뒤
  다시 밟으면 2로 늘어남(재획득 가능) 확인. 디버그 원상복구
  (`GATHER_RESPAWN_SEC` 45.0로, diff 0).
- **GUI 실기 확인은 아직 안 함** — 들꽃이 실제로 눈에 띄는 크기·색인지,
  줍는 손맛(사라짐+토스트)이 자연스러운지는 눈으로 볼 것. 계속 몰아서
  받을 것.
- **다음 이어질 것** — ~~1절 "제외" 목록의 나머지~~(8절에서 보스 완료),
  남은 것: Gameplay Depth 실제 Z축 이동·나머지 사냥터 8곳·전직 트리·
  장비/노획 등, 또는 다른 판 작업 — 승인 후.

## 8. 보스 — 황건 두목 (2026-09-13)

**사용자 지시 "saga-godot 이어 해"**. field_map.gd 머리말의 세 미완성
(문·채집·보스) 중 둘째(채집은 7절에서 먼저 끝냈다) — 문(portal)은
아직 남아 있다(아래 "다음 이어질 것" 참고). data-side.js `field.boss`
(`{name:'황건 두목', cool:15, hpMul:12, dmgMul:2.0}`) 그대로 — 원작에
자리(x) 데이터가 없어(사냥터 오른쪽 끝을 지킨다는 설명뿐) 마지막
발판(1900px)과 문(2130px, 아직 안 옮김) 사이 2050px로 새로 정했다.
잡으면 `BOSS_COOL_SEC`(15분) 뒤 같은 자리에 다시 선다 — story_gather.gd
respawn과 같은 결이지만 대상이 하나뿐이라 `died` 시그널로 다음 스폰을
잇는 방식(DUNGEON처럼 한 번 잡으면 끝나는 게 아니라, 필드형 사냥터의
"계속 도는" 보스 — 원작 cool 필드 자체가 그 뜻이다).

- `field_map.gd`: `BOSS_NAME`·`BOSS_X_PX`+`boss_position_m()` 신규.
- `story_combat.gd`: `BOSS_HP_MUL`(12.0)·`BOSS_DMG_MUL`(2.0, ENEMY_DMG와
  같은 이유로 미사용)·`BOSS_COOL_SEC`(900초) 신규.
- `story_enemy.gd`: `is_boss`(신규, story_gather.gd의 `kind`와 같은
  배선 — add_child 전에 세팅) — HP×12, 시각 몸집×1.6(원작에 없는 값,
  DUNGEON dungeon_enemy.gd의 `r=boss?22:13`≈1.7배와 같은 결로 새로
  정함, 색은 그대로). `story_boss` 그룹 추가.
- `story_boss_spawner.gd`(신규) — 스폰 → `died` 연결 → 죽으면
  `BOSS_COOL_SEC` 타이머 뒤 재스폰. `TestField.tscn`에 `BossSpawner`
  노드 추가.
- **검증(헤드리스, 값 자체까지)** — import 확인(texture-a.png.import
  재발생, 되돌림 — 나머지 project.godot/*.import 변경 없음) → 다섯 씬
  세 번 연속 exit 0·로그 무결(GO/DUNGEON/FOREST 회귀 확인 포함). 임시
  디버그(`BOSS_COOL_SEC`를 3.0으로 잠깐 낮춤)로: 위치 41.0m(2050px×
  0.02) 정확, HP 216(18×12) 정확, `story_boss` 그룹 소속 확인,
  `take_damage(9999)`로 죽이면 `StorySaveState.kills`가 +1(잡졸과 같은
  카운트, "첫 사냥" 사명에 기여), 스포너 자식이 0개로 줄었다가 대기
  뒤 다시 1개(같은 위치·HP·is_boss)로 재생성 확인. 디버그 원상복구
  (`BOSS_COOL_SEC` 900.0로, diff 0).
- **GUI 실기 확인은 아직 안 함** — 몸집이 눈에 띄게 커 보이는지, 15분
  대기가 실제 플레이 리듬에 맞는지는 눈으로 볼 것. 계속 몰아서 받을 것.
- **다음 이어질 것** — field_map.gd의 채집·보스는 채웠고, 문(portal)은
  아직이다(다른 사냥터로 나가는 통로라 혼자 못 만들고 "나머지 사냥터
  8곳"과 함께 묶여 있다). 남은 후보: Gameplay Depth 실제 Z축 이동·
  나머지 사냥터 8곳(강릉진·오림숲 등, 문 포함)·전직 트리·
  장비/노획 등, 또는 다른 판 작업 — 승인 후.

## 9. Background 레이어 — 나무·산 실루엣 (2026-09-13)

**사용자 지시 "saga-godot 이어 해"**. 2절이 설계해 둔 세 겹(Background/
Midground/Foreground) 중 지금까지 **Midground(바닥·발판, Z=0)만**
지어져 있었다 — "카메라는 깊이감을 보여만 준다"(1절 "제외" 목록의
괄호 설명)는 원래 포함 범위였는데 실제로는 빠져 있던 부분을 채웠다
(Foreground는 여전히 생략 — 2절 "있으면 좋고 없어도 완료 조건에 안
걸린다").

새 GLB를 받지 않고(PLAN.md 44장) 이미 있는 GO/FOREST 에셋(tree_oak.glb·
rock_largeA.glb)을 재활용 — 원래 텍스처 대신 짙은 단색(UNSHADED)으로
덮어 "실루엣"으로만 쓴다. 나무 레이어(Z=-30)·산 레이어(Z=-45, 대기
원근으로 더 파르스름) 둘, 사냥터 너비에 고르게 퍼뜨리고 인덱스 홀짝
으로 크기만 살짝 변주(`randf()` 안 씀 — vegetation_builder.gd의 "매번
같은 자리" 원칙과 같은 정신, 다만 격자가 없어 인덱스 기반으로 단순화).
MultiMeshInstance3D라 충돌은 원래 없다(따로 안 막음).

- `story_background.gd`(신규) — `_build_layer()` 하나가 나무·산 둘 다
  만든다(GLBUtils.extract_mesh() 재사용, games/saga_go/world/의 것을
  그대로 preload — 이미 GO 소품 다른 파일도 STORY가 preload하고 있던
  전례와 같다, environment_profile.gd). `TestField.tscn`에 `Background`
  노드 추가(Terrain보다 먼저 — 그리기 순서는 상관없지만 "배경이 먼저"
  가 읽기 순서상 자연스럽다).
- **검증(헤드리스)** — import 확인(texture-a.png.import 재발생, 되돌림)
  → 다섯 씬 세 번 연속 exit 0·로그 무결(GO/DUNGEON/FOREST 회귀 확인
  포함). 임시 디버그로 `Background` 자식 2개(BackgroundTrees·
  BackgroundHills), MultiMesh instance_count가 각각 14·5(상수와 일치),
  mesh가 둘 다 null 아님(GLB 로드 성공) 확인.
  **한계** — MultiMesh 개별 인스턴스의 실제 좌표(x·scale)는 `--headless`
  더미 렌더러에서 `get_instance_transform()`이 항등행렬만 돌려줘 엔진
  쪽에서 값 자체를 재확인하지 못했다(루트 CLAUDE.md가 이미 적어 둔
  "헤드리스는 디스플레이 서버 없이 더미 렌더러로 돈다"는 한계가
  MultiMesh 트랜스폼 버퍼에도 적용되는 걸 이번에 처음 확인). 좌표
  공식 자체는 단순 산술(등간격+인덱스 홀짝 배율)이라 코드 리뷰로
  갈음 — 실제로 자리가 맞는지는 GUI 실기 확인 몫으로 넘긴다.
- **GUI 실기 확인은 아직 안 함** — 나무·산 실루엣이 실제로 "먼 배경"
  으로 읽히는지(크기·색·거리감), 미드그라운드와 안 겹치는지는 눈으로
  볼 것. 계속 몰아서 받을 것.
- **다음 이어질 것** — 2절 설계(Background/Midground/Foreground) 중
  Foreground만 남았지만 완료 조건에 안 걸린다(선택 사항). 남은 굵직한
  후보: Gameplay Depth 실제 Z축 이동·나머지 사냥터 8곳(이제 문까지
  필요)·전직 트리·장비/노획 등, 또는 다른 판 작업 — 승인 후.

## 10. 장비 — 무기 한 자리(목검) (2026-09-13)

**사용자 지시 "saga-godot 이어 해"**. 1절 "제외" 목록의 "장비/노획"
(data-gear.js·data-unique.js) 중 **첫 컷**만 — data-gear.js sword1
(무기 슬롯 tier1, need:1·atk:4) 하나만 옮겼다. 이 슬라이스는 `field`
(lv1) 하나뿐이라 need>1인 물건은 애초에 못 낀다(다른 아홉 슬롯·
tier2~4·주문서·고유(unique)·상점은 자연히 범위 밖) — DUNGEON 첫
슬라이스("이름만 있는 장비")보다도 더 좁힌, field_map.gd 머리말이
이미 정해 둔 경계 그대로.

`gear.js` `rollDrop()`의 드롭률(잡졸 0.035·보스 0.9)도 그대로 옮겼다.
가방이 없어 DUNGEON `loot_pickup.gd`와 같이 **줍는 즉시 장착** — 다만
이 슬라이스는 물건이 하나뿐이라 이미 꼈으면 다시 안 굴린다(원작은
가방+판매가 있어 중복을 허용하지만, 단일 bool 슬롯에선 의미가 없어
새로 정한 규칙). 무기 공격력은 `side.js power()`의 `atk = base + gear.
atk` 그대로 `_effective_atk()`에 얹었다 — 기합(brace) 배율은 그 합계
전체에 곱한다(원문이 pw.atk 자체를 buff로 올리는 것과 같은 결).

- `story_combat.gd`: `WEAPON_NAME`·`WEAPON_ATK`(4.0)·
  `GEAR_DROP_CHANCE_GRUNT`(0.035)·`GEAR_DROP_CHANCE_BOSS`(0.9) 신규.
- `story_save_state.gd`: `has_weapon: bool`(신규)+`equip_weapon()`,
  세이브 포함, SAVE_VERSION 2→3.
- `story_player.gd`: `_effective_atk()`가 `has_weapon`이면 WEAPON_ATK를
  더한 뒤 기합 배율을 곱하도록 수정(이전엔 START_ATK만 배율 대상).
- `story_weapon_pickup.gd`(신규) — loot_pickup.gd와 같은 Area3D 뼈대,
  물건이 하나뿐이라 등급·부위 분기 없음. `story_enemy.gd`: `_die()`에
  `_maybe_drop_weapon()` 추가(이미 꼈으면 스킵 → 잡졸/보스 확률로
  굴림 → 맞으면 `get_parent()`에 픽업 스폰, queue_free() 전에 호출해
  parent가 아직 유효할 때 처리).
- **검증(헤드리스, 값 자체까지)** — import 확인(texture-a.png.import
  재발생, 되돌림) → 다섯 씬 세 번 연속 exit 0·로그 무결(GO/DUNGEON/
  FOREST 회귀 확인 포함). 임시 디버그(`GEAR_DROP_CHANCE_BOSS`를 1.0으로
  잠깐 올림 — 결정적 확인을 위해)로: 무기 없을 때 atk=21.0·있을 때
  atk=25.0(21+4) 정확, 그룬트 드롭률 2만 회 표본 3.39~3.57%(기대
  3.5%와 합치), 보스 킬 시 `WeaponPickup` 실제 스폰·접촉 시
  `has_weapon=true`+atk 갱신 확인, 이미 낀 채로 그룬트를 죽여도
  새 픽업이 안 뜨는 중복 방지 확인, `save()`→`has_weapon` 리셋→
  `try_load()` 왕복으로 세이브 영속 확인. 디버그 원상복구
  (`GEAR_DROP_CHANCE_BOSS` 0.9로, diff 0) — 디버그가 실제로 써 버린
  테스트용 `user://save_story.json`도 삭제해 다음 실기 확인이 깨끗한
  상태에서 시작하도록 정리했다.
- **GUI 실기 확인은 아직 안 함** — 목검을 주웠을 때 손맛(타격감 차이가
  체감되는지)은 눈으로 볼 것. 계속 몰아서 받을 것.
- **다음 이어질 것** — 1절 "제외" 목록의 남은 굵직한 후보: Gameplay
  Depth 실제 Z축 이동·나머지 사냥터 8곳(문 포함)·전직 트리·장비 나머지
  (방어구·장신구·주문서·고유·상점), 또는 다른 판 작업 — 승인 후.

## 11. 잡졸 반격 — 플레이어 체력 (2026-09-13)

**사용자 지시 "saga-godot 이어 해"**. story_enemy.gd 머리말이 "추격·
원거리 반격이 없다"고 적어 뒀던 것 중 **반격만** 채웠다(추격은 여전히
없음 — 잡졸은 제자리에 서 있고, 플레이어가 닿으면 맞는다). side.js
`overlap(p, e) && e.cd<=0` → `hurtMe(e.dmg)` 그대로: 겹침 쿨다운
`e.cd=1.0`(1초) 원문 그대로, 판정 반경은 `P_W`(26px)/2 + 잡졸 `w`
(34px)/2 = 30px×0.02=0.6m로 역산(원문은 AABB, 이 포트는 X축 거리
하나로 충분 — story_player.gd `_melee_hit()`와 같은 방식). 피해량은
`ENEMY_DMG`(6.0)·보스는 `BOSS_DMG_MUL`(2.0) — 둘 다 이미 있었지만
지금까지 아무도 안 읽던 값이라 이번에 처음 실제로 쓰인다.

플레이어 체력은 DUNGEON `player_health.gd`와 같은 원칙 — **죽음은
이번에도 범위 밖**(완료 조건에 없음), hp가 0 밑으로 안 내려가고 그냥
멈춘다(부활·게임오버 없음). `START_HP`(162.0, story_combat.gd에 이미
있던 값)를 그대로 최대체력으로 쓴다. side.js의 전역 피격무적
(`p.invuln`/`HIT_COOL`)은 옮기지 않았다 — 이 슬라이스는 잡졸 셋+보스
하나뿐이라 여러 적이 동시에 겹쳐 때리는 경우가 드물다고 보고 좁혔다
(DUNGEON도 아직 안 가진 것과 같은 결의 의도적 축소).

- `story_player.gd`: `hp`·`max_hp`(신규)+`take_damage()` — mp와 같이
  플레이어 스크립트에 직접 얹었다(DUNGEON처럼 별도 컴포넌트 노드로
  안 뺐다 — 이 판은 mp도 이미 플레이어 스크립트에 직접 있다, 기존
  결과 맞춘 선택).
- `story_enemy.gd`: `OVERLAP_RANGE`(0.6m)·`ATTACK_COOLDOWN`(1.0초)
  신규, `_attack_cd_left` + `_physics_process()`(신규 — 지금까지 이
  스크립트엔 매 프레임 로직이 전혀 없었다) 추가. 보스는 `BOSS_
  VISUAL_SCALE`만큼 겹침 반경도 같이 커진다(몸집이 큰 만큼 더 멀리서도
  닿는다는 뜻 — DUNGEON dungeon_enemy.gd의 ATTACK_RANGE*scale_mul과
  같은 방식).
- `story_combat.gd`: `BOSS_DMG_MUL` 주석을 "안 쓰인다"에서 "실제로
  쓰인다"로 정정.
- `hp_bar.gd`(신규, mp_bar.gd와 같은 폴링 패턴) + `StoryHUD.tscn`에
  `HpLabel`+`HpBar`(MP 위, 붉은 톤) 추가 — MP 행은 28px 아래로 밀림.
- **검증(헤드리스, 값 자체까지)** — import 확인(texture-a.png.import
  재발생, 되돌림) → 다섯 씬 세 번 연속 exit 0·로그 무결(GO/DUNGEON/
  FOREST 회귀 확인 포함). 임시 디버그로: 다른 그룬트·보스와 안 겹치는
  자리에서 hp 불변(162 유지), 그룬트에 닿으면 6 감소(162→156), 1초
  안에 다시 접촉해도 쿨다운 중이라 안 깎임, 1.2초 뒤 다시 접촉하면
  또 6 감소(156→150), `take_damage(99999)`로도 0 밑으로 안 내려감
  (플로어 확인), 보스와 겹치면 12(6×2.0) 감소까지 전부 확인. 첫
  시도에서 "멀리 있는데도 맞는다"는 결과가 나와 조사했더니 테스트가
  고른 좌표가 실은 **다른 그룬트**(고정 스폰 셋 중 하나)와 우연히
  겹쳐 있었던 테스트 자체의 오류였다(게임 로직 버그 아님) — 안 겹치는
  좌표로 다시 골라 재확인. 디버그 코드는 원래 파일에 남기지 않고
  스크래치패드 스크립트로만 실행했다(diff 0).
- **GUI 실기 확인은 아직 안 함** — HP 바가 실제로 줄어드는 게 보이는지,
  6/12 데미지 감각이 적절한지는 눈으로 볼 것. 계속 몰아서 받을 것.
- **다음 이어질 것** — ~~1절 "제외" 목록의 남은 굵직한 후보~~(장비는
  12절에서 10부위로 마무리), 남은 것: Gameplay Depth 실제 Z축 이동·
  나머지 사냥터 8곳(문 포함)·전직 트리·장비 나머지(tier2~4·주문서·
  고유·상점), 또는 다른 판 작업 — 승인 후.

## 12. 장비 — 10부위 tier1 전부로 확장 (2026-09-13)

**사용자 지시 "saga-godot 이어 해"**. 10절이 무기 한 자리만 좁혔던
것을 같은 날 이어서 **10부위 tier1 전부**로 넓혔다 — data-gear.js
RAW에서 need:1인 물건 정확히 열 개(부위마다 하나씩): 목검(무기)·
가죽 두건(투구)·무명 저고리(갑옷)·무명 바지(하의)·짚신(신)·무명
팔찌(수갑)·베 망토(망토)·무명 지환(반지)·나무 목걸이(목걸이)·나무
귀걸이(귀걸이). tier2~4·주문서·고유(unique)·상점은 여전히 범위 밖 —
`field`(lv1) 하나뿐이라 need>1 물건은 애초에 못 낀다.

**리팩터링 방향** — 처음 무기만 있을 때 `WEAPON_NAME`/`WEAPON_ATK`
같은 개별 상수로 하드코딩했던 것을, PLAN.md 7절("콘텐츠 추가를 위해
핵심 코드를 수정하지 않아도 되도록 한다")에 맞춰 `GEAR_ITEMS`
Dictionary 표 하나로 바꿨다 — 다음에 tier2를 추가할 때도 표에 줄만
더하면 되고 드롭·장착·스탯 계산 코드는 안 건드려도 된다. `equipped:
Dictionary`(slot→key)로 부위마다 하나씩 낀다(원작과 같음). 가방이
없어 여전히 **줍는 즉시 장착**하고, 이미 그 부위를 꼈으면 드롭 풀에서
빠진다(전부 꼈으면 드롭 자체가 없음).

**방어력이 이번에 처음 의미가 생겼다** — side.js `gear.cut(def)` =
`min(0.6, def/(def+40))` 그대로 옮겨 `take_damage()`에 적용(11절이
반격을 넣기 전까진 방어 스탯이 있어도 쓰일 데가 없었다). 체력도
`max_hp = START_HP + gear.hp`로 늘어난다(`power()`의 hp 공식과 같은
자리, jobGrow는 이 슬라이스에 없어 제외) — `max_hp`를 저장 필드가
아니라 **계산 프로퍼티(get)** 로 바꿔 장비가 바뀔 때마다 자동으로
맞다.

- `story_combat.gd`: `WEAPON_NAME`/`WEAPON_ATK` 제거 →
  `GEAR_ITEMS`(10개) + `damage_cut(def)` + `gear_totals(keys)` 신규.
- `story_save_state.gd`: `has_weapon` 제거 → `equipped: Dictionary` +
  `equip_gear(key)`·`has_slot(slot)`·`gear_totals()` 신규.
  SAVE_VERSION 3→4. `try_load()`가 로드 직후 `player.hp = player.
  max_hp`로 채워 준다(mp와 달리 equipped는 세이브에 남아 있어서,
  안 그러면 이전 세션 장비 보너스가 반영되기 전 기본치로 잠깐
  어긋난다).
- `story_player.gd`: `max_hp`를 계산 프로퍼티로, `take_damage()`에
  `damage_cut()` 적용, `_effective_atk()`가 `gear_totals().atk` 사용.
- `story_enemy.gd`: `_maybe_drop_weapon()` → `_maybe_drop_gear()`
  (아직 안 낀 부위만 드롭 풀에 넣고 그중 하나를 무작위로 고른다).
- `story_weapon_pickup.gd` 삭제 → `story_gear_pickup.gd`(신규, 물건
  키 하나만 받아 어떤 부위든 처리 — 상자 색을 무기/방어구/장신구
  셋으로만 가볍게 구분, 원작에 없는 장식용 값).
- **검증(헤드리스, 값 자체까지)** — import 확인(texture-a.png.import
  재발생, 되돌림) → 다섯 씬 세 번 연속 exit 0·로그 무결(GO/DUNGEON/
  FOREST 회귀 확인 포함). 임시 디버그(GEAR_DROP_CHANCE_GRUNT를 1.0으로
  올림)로: GEAR_ITEMS 10개, 기본 atk 21·max_hp 162, sword1+top1
  장착 후 atk 25·max_hp 172·totals{atk4,def3,hp10} 전부 정확, 방어
  컷 데미지(10 피해 → 162.70, `10×(1-3/43)` 손계산과 일치), 그룬트
  킬 시 드롭 스폰, 나머지 8부위까지 전부 채운 뒤엔 드롭이 안 나옴,
  세이브→리셋→로드 왕복으로 10부위 전부 복원+hp가 새 max(211=162+
  49)로 채워짐까지 확인. 디버그 원상복구(diff 0) + 테스트 세이브
  파일 삭제.
- **GUI 실기 확인은 아직 안 함** — 열 가지 물건이 실제로 눈에 띄게
  다른지(상자 색 세 갈래로만 구분돼 혼동될 수 있음), 방어력 체감이
  있는지는 눈으로 볼 것. 계속 몰아서 받을 것.
- **다음 이어질 것** — 남은 굵직한 후보: Gameplay Depth 실제 Z축
  이동·나머지 사냥터 8곳(문 포함)·전직 트리·장비 나머지(tier2~4·
  주문서·고유·상점), 또는 다른 판 작업 — 승인 후.

## 13. 사명 확장 — 약초 캐기 (2026-09-13)

**사용자 지시 "1,2,3,4 순서대로 다 진행해"**(굵직한 후보 넷 중 순서를
직접 골라 달라는 물음에 대한 답 — 사명 확장→상점→나머지 사냥터 8곳
(문 포함)→전직 트리 순). 넷 중 가장 작은 것부터: data-quest.js
`q_gather1`("약초 캐기", `goal.type:'gather', n:15`)을 `q_first`(첫
사냥) 옆에 나란히 추가했다. 원작은 `need:2`(레벨2 필요)가 걸려 있지만
이 슬라이스엔 레벨링 자체가 없어(항상 레벨1 고정, `story_combat.gd`
`START_HP` 주석) need를 가릴 방법이 없다 — `q_first`처럼 처음부터
진행되는 것으로 재해석했다. 채집물이 herb 하나뿐이라 `mats` 전체
합(`gathered_total()`)으로 뽑아, 나중에 다른 채집물이 늘어도 이 사명이
그대로 맞게 했다.

- `story_save_state.gd`: `gathered_total()`·`gather_quest_done()`
  신규(저장 스키마 변경 없음 — 이미 있는 `mats`를 그대로 읽는다).
- `quest_label.gd`: 두 줄(🗡️ 첫 사냥·🌼 약초 캐기)로 확장.
  `StoryHUD.tscn`: `QuestLabel` 높이를 두 줄만큼 늘리고 HP/MP 행을
  28px씩 아래로 밀었다.
- **검증(헤드리스, 값 자체까지)** — import 확인(texture-a.png.import
  재발생, 되돌림) → 다섯 씬 세 번 연속 exit 0·로그 무결(GO/DUNGEON/
  FOREST 회귀 확인 포함). 임시 디버그로 `mats.herb`를 14→15로 올려
  `gather_quest_done()`이 false→true로 정확히 바뀌는 것 확인. 디버그
  원상복구(diff 0).
- **GUI 실기 확인은 아직 안 함** — 두 줄 사명 표시가 화면에서 겹치거나
  잘리지 않는지는 눈으로 볼 것. 계속 몰아서 받을 것.
- **다음 이어질 것** — 14절(상점) 이어서 바로 진행.

## 14. 상점 — 필드 상인 (2026-09-13)

**사용자 지시(위 13절과 같은 승인 묶음)** — 넷 중 둘째, "장비 나머지"의
첫 걸음. 원작(`js/ui.js` 'talk-shop')은 마을(허도) NPC 'merchant'와
대화해 여는 물목 화면(가방에 담고 따로 장착)이지만, 이 슬라이스는
아직 마을이 없다(허도·나머지 사냥터 8곳·문(portal)은 15절에서 다룰
셋째 항목과 함께 묶여 있다) — 그래서 **상인을 이 사냥터 안에 하나
세우는 것으로 재해석**했다. 가방도 없어(줍는 즉시 장착하는 이 포트의
기존 규칙) 물목을 고르는 화면 대신, 다가가 `K`를 누르면 **아직 안
낀 부위 중 가장 싼 것을 즉시 사서 장착**한다. "이동 상인"(할인 버프)은
이번에도 안 옮겼다 — 상점 자체가 없던 채였으니 기본 매매부터
검증한다.

**금(gold) 도입** — `side.js` `kill()`의 계산 그대로: `gold =
round((6+lv*3)*(0.8~1.4)*mul*GAIN_GOLD)`, `lv`는 이 슬라이스가 늘
1(`ENEMY_HP`/`ENEMY_DMG`와 같은 전제), `mul`은 보스 12·그 외 1,
`GAIN_GOLD`는 손잡이를 아직 안 옮겨 1.0 그대로. 잡졸/보스가 죽을 때
DUNGEON `loot_pickup.gd`의 `_spawn_gold()`와 같은 뼈대(물리 픽업,
닿으면 즉시 지갑에)로 떨어뜨린다. **가격표는 data-gear.js RAW의
price 칸을 그대로 `GEAR_ITEMS`에 얹었다**(새 숫자를 안 만든다,
PLAN.md 7장) — 목검240·가죽 두건180·무명 저고리220·무명 바지160·
짚신120·무명 팔찌200·베 망토150·무명 지환160·나무 목걸이150·나무
귀걸이150.

- `story_combat.gd`: `GEAR_ITEMS` 각 항목에 `price` 필드 추가.
  `ENEMY_GOLD_BASE`(6)·`ENEMY_GOLD_PER_LV`(3)·`ENEMY_LV`(1)·
  `BOSS_GOLD_MUL`(12)·`GAIN_GOLD`(1) + `roll_gold(is_boss)` 신규.
- `story_save_state.gd`: `gold: int` + `add_gold()`/`spend_gold()`
  신규(DUNGEON `DungeonGoldState`와 같은 계약 — 모자라면 아무것도
  안 하고 false), 세이브 포함, SAVE_VERSION 4→5.
- `story_gold_pickup.gd`(신규, DUNGEON `loot_pickup.gd`의 `_spawn_
  gold()`와 같은 뼈대를 이 판 전용 파일로 — 다섯 판 공용 파일을
  하나로 합치지 않는다는 저장소 규칙). `story_enemy.gd`: `_die()`에
  금 드롭 추가.
- `story_merchant.gd`(신규) — Area3D 두 겹(몸통 충돌+상호작용 범위).
  범위 안에서 `story_interact`(K) 누르면 `GEAR_ITEMS` 중 안 낀 부위의
  최저가를 사서 장착. `TestField.tscn`에 `Merchant` 노드(x=3.6m, 발판·
  적·채집물과 안 겹치는 빈자리) 추가. `project.godot`: `story_interact`
  입력 액션(K) 신규.
- `ui/gold_label.gd`(신규, 폴링 패턴) + `StoryHUD.tscn`에 `GoldLabel`
  추가(MP 아래, 28px).
- **검증(헤드리스, 값 자체까지)** — import 확인(texture-a.png.import
  재발생, 되돌림) → 다섯 씬 세 번 연속 exit 0·로그 무결(GO/DUNGEON/
  FOREST 회귀 확인 포함). 임시 디버그로: `roll_gold(false)`/`roll_
  gold(true)` 500회 표본이 각각 7~13·86~151 안(기대 범위와 합치),
  가격표 네 값(목검240·가죽두건180·짚신120·베망토150) 정확, 금 0일 때
  구매 시도 시 아무 일도 안 일어남(장비·금 그대로), 금 1000일 때
  첫 구매가 최저가(짚신120) → 장착+금 880 정확, 둘째 구매가 그다음
  최저가(베망토150, 동가 중 표 순서상 먼저 오는 것) → 장착+금 730까지
  전부 예측과 일치. 디버그 원상복구(`story_field.gd` diff 0).
- **GUI 실기 확인은 아직 안 함** — 필드 한복판에 서 있는 상인이 자연
  스러운지, K 상호작용 안내가 잘 보이는지는 눈으로 볼 것. 계속 몰아서
  받을 것.
- **다음 이어질 것** — 사용자가 고른 순서의 셋째: 나머지 사냥터 8곳
  (허도 마을+문(portal) 포함, 큰 항목이라 별도 세션에서 이어간다),
  넷째: 전직 트리 — 승인된 순서이니 "이어 해"로 계속.

## 15. 나머지 사냥터 8곳(문 포함) — 첫 걸음: 허도+문 (2026-09-13)

**사용자 지시(13·14절과 같은 승인 묶음)** — 넷 중 셋째. 원작은 사냥터가
아홉 곳(마을 둘: 신야성·허도 + 실제 사냥터 일곱)이지만, **이 전부를
한 세션에 짓는 건 PLAN.md 79·80장("한 Step은 하나의 명확한 결과물",
"실패한 상태에서 계속 쌓지 않는다")에 어긋난다** — 그래서 이 절은
"나머지 사냥터 8곳"의 **첫 걸음**만 자른다: `field`(허창 들판)의
문(portal)이 실제로 여는 곳인 **허도(heodo, 마을)** 하나만 짓고, 문
자체를 처음으로 동작하게 만든다. 강릉진 등 나머지 일곱 사냥터·신야성은
여전히 범위 밖(막다른 경계벽으로 남는다).

**문(portal) 재해석** — 원작(`js/side.js`)은 "문 앞에서 ↑를 누르면
건너간다"이지만, 이 포트는 새 입력 액션을 늘리지 않고 14절 상점과
같은 상호작용 키(K, `story_interact`)로 통일했다. 벽(경계벽)은 문이
있는 쪽도 그대로 남아 있다 — 그냥 걸어서는 못 나가고 반드시 K를
눌러야 넘어간다(잘못 걸어가다 세계 밖으로 떨어지는 사고를 막는다).

**공용화** — `story_terrain_builder.gd`가 지금까지 `FieldMap`을 상수로
preload해 이 사냥터 전용이었던 것을, `map_path`(export) + `ground_color`
(export)로 바꿨다 — 새 사냥터/마을을 추가할 때 이 파일을 복제하지
않고 같은 모양(`width_m`/`plats_m`/`ropes_m`)의 데이터 파일만 새로
만들면 된다(PLAN.md 76장). 반대로 `EnemySpawner`/`GatherSpawner`/
`BossSpawner`는 그대로 뒀다 — 허도는 `town:true`(spawn:0, 적 없음)라
씬에 그 세 노드를 아예 안 넣는 것만으로 충분했다(공용화가 불필요).

**상점 위치 정정** — 14절이 "마을이 없어" `field` 안에 임시로 세웠던
상인(`story_merchant.gd`)을 원래 자리인 **허도**로 옮겼다(원작
`data-side.js` heodo.npcs의 'merchant', x=220px). field의 `Merchant`
노드는 지우고 그 자리에 문(`PortalToHeodo`)을 놨다.

- `heodo_map.gd`(신규) — `field_map.gd`와 같은 모양의 데이터 파일.
  허도 발판 둘(300/900px)·줄 둘(사다리+로프)·동쪽 문(1330px→field)·
  상인 자리(220px). 서쪽 문(70px→신야성)은 신야성이 범위 밖이라 안
  옮긴다(문 없이 경계벽만).
- `field_map.gd`: `PORTAL_WEST_X_PX`(70)·`ARRIVAL_FROM_HEODO_X_PX`(150)
  + `portal_west_m()`·`arrival_from_heodo_m()` 신규. 동쪽 문(2130px→
  gangneungjin)은 그 사냥터가 없어 안 옮긴다.
- `story_terrain_builder.gd`: `const FieldMap`을 `@export map_path`+
  `@export ground_color`로 일반화(위 "공용화" 참고).
- `story_portal.gd`(신규) — Area3D 범위+K 상호작용으로 `target_scene`에
  `arrival_x_m` 자리로 건너간다(`get_tree().change_scene_to_file()`).
- `story_save_state.gd`: `pending_spawn_x`/`has_pending_spawn`+
  `set_pending_spawn()`/`consume_pending_spawn()` 신규 — 문으로 건너온
  씬은 세이브를 안 불러오고(불러오면 문 도착 자리를 덮어쓴다) 이 값만
  한 번 읽는다. 세이브 파일에는 안 담는다(씬 진입 한 번만을 위한 신호).
- `story_field.gd`/`story_town.gd`(신규) — 위 규칙을 각 씬 루트에
  적용. **알려진 한계** — 세이브는 여전히 위치 하나만 기록해 "어느
  씬인지"를 모른다. 허도에서 저장한 뒤 field를 직접 열면(지금은
  main_scene이 아니라 편집기에서 씬을 직접 여는 방식이라 실제로는
  항상 field로 재접속한다) x값이 field 좌표계로 잘못 해석된다 —
  여러 사냥터를 아우르는 세이브 스키마는 나머지 일곱 사냥터를 더 지을
  때 같이 볼 자리.
- `story_merchant.gd`: 몸통 `StaticBody3D`(원래 있었다)를 제거 — 이
  판의 다른 모든 상호작용 오브젝트(채집·픽업·잡졸)처럼 순수 Area3D+
  시각만 남겼다(물리 차단은 이 판의 관례가 아니다). `_unhandled_input`
  이벤트 콜백 대신 `story_player.gd`와 같은 폴링(`_process`에서
  `Input.is_action_just_pressed`)으로 바꿨다(`story_portal.gd`도 같은
  방식) — 이 판의 기존 관례에 맞춘 것.
- `HeodoField.tscn`(신규) — WorldEnvironment/Sun(field와 동일)·Terrain
  (`map_path=heodo_map.gd`)·FieldCamera·Player·StoryHUD·Merchant(4.4m)·
  PortalToField(26.6m). `TestField.tscn`은 `Merchant` 노드를 지우고
  `PortalToHeodo`(1.4m, 도착 자리 25.0m)로 바꿨다.
- **검증(헤드리스, 값 자체까지)** — import 확인(texture-a.png.import
  재발생, 되돌림) → **여섯 씬**(GO/DUNGEON/FOREST/field/**HeodoField
  (신규)**/REALM) 세 번 연속 exit 0·로그 무결. 임시 디버그로: HeodoMap
  각 함수(width 28.0·plats [6.0/2.6/2.4, 18.0/3.6/2.6]·ropes[사다리·
  로프]·portal_east 26.6·arrival_from_field 25.0·merchant 4.4) 전부
  손계산과 일치, Terrain 자식 수 9(바닥1+발판2+(줄+영역)×2+경계벽2)
  정확, Merchant/Portal 노드 실제 global_position.x 정확, `set_pending_
  spawn`/`consume_pending_spawn` 왕복 정확. **문 동작 자체를 실제로
  실행**(`get_tree().change_scene_to_file()`를 디버그로 직접 호출) —
  호출 자체가 에러 없이 성공(err=0), 120프레임 뒤 확인한 `current_
  scene.name`이 실제로 `HeodoField`로 바뀌어 있었고 플레이어가 정확히
  x=25.0(요청한 도착 자리)에 서 있음까지 확인. 이 과정에서 `--quit-
  after`가 **초가 아니라 프레임 수**라는 점을 새로 확인했다(짧은
  프레임 수로는 0.3초짜리 타이머가 못 fire, 120프레임으로 늘려 확인
  — 지금까지의 "세 번 연속 exit 0" 검증은 애초에 프레임 몇 개짜리라
  대부분 즉시 종료였던 셈, 결과 자체는 바뀌지 않는다). 디버그 원상복구
  (`story_field.gd`/`story_town.gd`/`story_save_state.gd` 전부 diff 0).
- **GUI 실기 확인은 아직 안 함** — 문 앞에서 K를 눌러 실제로 화면이
  넘어가는지, 허도의 갈색 땅·상인 위치가 자연스러운지는 눈으로 볼 것.
  계속 몰아서 받을 것.
- **다음 이어질 것** — 나머지 일곱 사냥터(강릉진·오림숲·남정성·
  한중굴혈·기산채·호로곡 등, tier2~4)와 신야성은 여전히 남아 있다 —
  각각 이 절과 같은 패턴(맵 데이터 파일 + 문 + 필요시 스폰류)으로
  하나씩 이어갈 수 있다. 승인된 순서의 넷째(전직 트리)로 계속.

## 16. 전직 트리 — 첫 걸음: 레벨/경험치 + 1차 전직 넷 (2026-09-13)

**사용자 지시(13·14·15절과 같은 승인 묶음)** — 넷 중 마지막. 원작
전직(`data-job.js`)은 갈래 넷×단 넷(1~4차, Lv.10/25/45/70)에 각 자리마다
새 무예 넷씩(총 48개)이 열리는 큰 트리다. **이걸 한 번에 옮기는 건
불가능에 가깝고 PLAN.md 79·80장에도 어긋난다** — 그래서 이 절은 진짜
첫 걸음만 자른다: **1차 전직(Lv.10, 갈래 넷 중 하나를 고른다) + 그
직업의 grow(hp/atk/mp) 스탯만.** 그 자리에서 새로 열리는 무예 넷씩
(총 16개, `w_cut`/`w_whirl`/`w_rush`/`w_iron` 등)은 범위 밖 — 다음 걸음.

**레벨/경험치가 먼저 필요했다** — 전직은 레벨 문턱에 걸려 있는데, 이
슬라이스는 지금까지 레벨이 늘 1로 고정이었다(`story_save_state.gd`의
`level`/`exp` 필드는 세이브 스키마에만 있고 아무도 안 채웠다). `core.js`
`gainExp()`/`expNeed()` 그대로 옮겼다: `expNeed(level) = round(50 ×
1.28^(level-1))`, 경험치는 금(gold)과 달리 **랜덤 없이 결정적**이다.
잡졸 킬 exp = `(6+lv×4)×GAIN_EXP` = 10(lv=1 고정), 보스는 ×15 = 150.

**1차 전직 선택** — 원작은 상시 열린 "무예" 탭에서 고르지만(가방·상점과
같은 이유로 이 슬라이스엔 탭 UI가 없다), 상점(14절)처럼 자동으로 대신
골라 주지는 않았다 — **전직은 "되돌릴 수 없다"는 영구적 결정**이라
자동 선택은 그 의미를 지워 버린다. 그래서 **허도(마을)에 전직 담당
자리를 새로 하나 두고**, 범위 안에서 숫자 1~4(무사·궁수·협객·방사,
`data-job.js` JOBS tier:1 순서 그대로)로 직접 고르게 했다 — 새 입력
액션 넷(`story_job_1~4`)을 추가했다(potion_1~4와 물리 키는 같지만
다른 액션 이름이라 겹치지 않는다).

- `story_combat.gd`: `EXP_BASE`(50)·`EXP_GROWTH`(1.28)·`ENEMY_EXP_BASE`
  (6)·`ENEMY_EXP_PER_LV`(4)·`BOSS_EXP_MUL`(15)·`GAIN_EXP`(1) +
  `exp_need(level)`·`enemy_exp(is_boss)` 신규. `JOBS_TIER1`(넷, data-
  job.js grow만) + `JOB_CHANGE_LEVEL`(10) 신규.
- `story_save_state.gd`: `job: String`("none" 기본) 신규, 세이브 포함
  (SAVE_VERSION 5→6). `add_exp(amount)`(while 루프로 한 번에 여러
  레벨도 오른다, 원문과 같다) + `can_change_job()`/`choose_job(key)`
  (이미 정했으면 무시 — "되돌릴 수 없다")/`job_grow()` 신규.
- `story_enemy.gd`: `_die()`에 `StorySaveState.add_exp(StoryCombat.
  enemy_exp(is_boss))` 추가.
- `story_player.gd`: `max_hp`·`_effective_atk()`에 `job_grow().hp`/
  `.atk` 추가(머리말이 전에 "jobGrow는 없어 뺌"이라 적어 뒀던 자리를
  이번에 채웠다). `max_mp`(신규, 계산 프로퍼티 — 방사의 jb.mp+40 반영)
  + mp 회복 클램프가 `MP_MAX` 대신 이 값을 쓰도록 수정.
- `mp_bar.gd`: `max_value`를 상수 대신 `player.max_mp`를 매프레임
  따라가도록(`hp_bar.gd`가 `max_hp`를 따라가는 것과 같은 결).
- `story_job_trainer.gd`(신규) — Area3D 범위+K로 상태 안내(전직 가능
  여부/이미 정한 직업), 범위 안에서 1~4로 확정. `level_label.gd`(신규,
  폴링) + `StoryHUD.tscn`에 `LevelLabel` 추가(⭐ Lv.n (exp/need)).
  `HeodoField.tscn`에 `JobTrainer` 노드(10.0m, 상인·문과 안 겹치는
  빈자리).
- **검증(헤드리스, 값 자체까지)** — import 확인(texture-a.png.import
  재발생, 되돌림) → 여섯 씬 세 번 연속 exit 0·로그 무결. 임시 디버그로:
  `exp_need(1)`=50·`exp_need(2)`=64(손계산과 일치), `enemy_exp`
  10/150, `add_exp()`로 9(안 오름)→+50(레벨2, exp9)→+1000(한 번에
  레벨8까지, exp232 — 여섯 단계 while 루프를 손으로 합산해 정확히
  일치 확인), `can_change_job()`이 Lv5 false·Lv10 true, `choose_job
  ("mage")`가 성공하며 atk 21→24(+3)·max_hp 162→174(+12)·max_mp
  100→140(+40) 정확 반영, 그 뒤 `choose_job("warrior")` 재시도는
  차단되고 job이 그대로 mage(되돌릴 수 없다 확인)까지 전부 예측과
  일치. 디버그 원상복구(`story_town.gd` diff 0, 새 파일이라 git status로
  DBG 잔재 없음 확인).
- **GUI 실기 확인은 아직 안 함** — 허도에서 전직 담당과 상인이 한눈에
  구분되는지(파란 톤 vs 붉은 톤), 전직 후 스탯이 체감되는지는 눈으로
  볼 것. 계속 몰아서 받을 것.
- **다음 이어질 것** — 사용자가 지정한 순서(1~4) 전부 이번 세션에서
  최소 한 걸음씩은 진행했다. 남은 큰 덩어리: 1차 전직 갈래별 무예
  16개, 2~4차 전직(레벨 25/45/70), 나머지 일곱 사냥터+신야성 — 다음
  "saga-godot 이어 해"에서 이어간다.

## 17. 전직 무예 첫 걸음 — 무사(warrior) 넷 (2026-09-13)

**사용자 지시 "커밋하고 saga-godot 이어 해"** — 16절이 남긴 "1차 전직
갈래별 무예 16개(4갈래×4개)"의 첫 갈래만 잘랐다: **무사(warrior)** 넷
(참격·선풍·돌진·철갑). 궁수·협객·방사 셋은 같은 패턴으로 이어갈 수
있게 남겨 뒀다.

**SP(무예 점수) 투자 시스템은 아직 없다** — 원작은 레벨마다 3점을 찍어
무예를 0~10으로 올리는데(`data-job.js` 머리말), 그 배분 UI 없이 무예
자체를 먼저 검증하려고 **`FIXED_SKILL_LEVEL`(5, 임의의 중간값)로 mul을
고정**했다 — DUNGEON이 "이름만 있는 장비"로 먼저 좁혔던 것과 같은 결의
의도적 축소(다음에 SP UI를 볼 때 이 상수를 실제 투자값으로 바꾼다).

**넷 다 원문 그대로**(cost·cd·mul·r·dist·buff 안 바꿈, `data-job.js`
SKILLS job:'warrior'):
- **참격(w_cut)** — melee. 연참과 같은 정면 판정·사거리, mul만 다르다
  (레벨5에서 1.6).
- **선풍(w_whirl)** — aoe. 횡소(4절)와 같은 360도 판정 구조, r:128px를
  REACH(78px)비로 옮겨 사거리 결정(mul 2.3).
- **돌진(w_rush)** — dash. **재해석** — 부드러운 이동 애니메이션 대신
  "이동 경로 위 적을 먼저 때린 뒤 그 자리로 순간이동"으로 단순화(다치는
  적 판정이 이동 전/후로 갈리는 걸 피했다). dist:210px를 SCALE(0.02)로
  4.2m 환산. 벽·구덩이 충돌은 확인 안 함(다음에 볼 자리).
- **철갑(w_iron)** — buff, sec9·atk×1.2·guard0.35 그대로. 기합(brace,
  tier0)과 **별도 타이머**로 둔다(둘 다 걸릴 수 있다, 원작이 안 막는다) —
  `_effective_atk()`가 둘의 배율을 곱하고, `take_damage()`가 guard를
  방어구 컷과 별개로 한 번 더 곱한다.

**job=='warrior'일 때만** 실제로 쓰인다 — 입력 배선 자체가 그 조건
안에 있어(story_player.gd `_physics_process()`), 다른 직업(또는 무명)은
새 입력 액션 넷(Z/X/C/V, `story_job_skill_1~4`)을 눌러도 아무 일도
안 일어난다.

- `story_combat.gd`: `FIXED_SKILL_LEVEL`(5) + `WARRIOR_CUT_*`/
  `WARRIOR_WHIRL_*`/`WARRIOR_RUSH_*`/`WARRIOR_IRON_*` 상수 + `warrior_
  rush_dist_m()` 신규.
- `story_player.gd`: 쿨다운 넷(`_cd_warrior_cut/whirl/rush/iron`) +
  `_job_buff_time_left`(철갑 전용) 신규. `_cast_warrior_cut/whirl/
  rush/iron()` 신규. `_effective_atk()`가 철갑 배율도 곱하도록, `take_
  damage()`가 guard도 반영하도록 수정.
- `project.godot`: `story_job_skill_1~4`(Z/X/C/V) 입력 액션 신규.
- **검증(헤드리스, 값 자체까지)** — import 확인(재발생 노이즈, 되돌림)
  → 여섯 씬 세 번 연속 exit 0·로그 무결. 임시 디버그로: 세 mul(1.6·
  2.3·2.6) 정확, `roll_damage` 500회 표본이 손계산 범위(무크리 29.58~
  크리 60.21) 안, 참격 실제 시전으로 mp 100→94(−6)·쿨다운 0→0.5·적
  hp 실제로 깎임 확인, 돌진으로 플레이어가 정확히 4.2m 이동, 철갑으로
  `_effective_atk()`가 정확히 ×1.2, `take_damage(100)`이 철갑 있을 때
  65(=100×0.65)·없을 때 100으로 정확히 갈림(guard 0.35 확인)까지 전부
  예측과 일치. 디버그 원상복구(`story_field.gd` diff 0).
- **GUI 실기 확인은 아직 안 함** — 네 무예의 타격감·돌진의 순간이동이
  어색하지 않은지는 눈으로 볼 것. 계속 몰아서 받을 것.
- **다음 이어질 것** — 궁수·협객·방사 무예 넷씩(같은 패턴), SP 투자
  UI, 2~4차 전직, 나머지 일곱 사냥터+신야성 — 다음 "saga-godot 이어
  해"에서 이어간다.

## 18. 전직 무예 다음 걸음 — 궁수(archer) 넷 (2026-09-13)

**사용자 지시 "saga-godot 이어 해"** — 17절이 남긴 "궁수·협객·방사 무예
넷씩" 중 둘째 갈래(archer) 넷(사격·연사·관통시·응안)을 채웠다. 협객·
방사 둘은 같은 패턴으로 이어갈 수 있게 남겨 뒀다.

**FIXED_SKILL_LEVEL(5)** 그대로 재사용(17절과 같은 의도적 축소, SP UI는
여전히 범위 밖).

넷 다 원문 그대로(`data-job.js` SKILLS job:'archer', cost·cd·mul 안 바꿈):
- **사격(a_shot)** — 원문 effect:'arrow'(이 포트에 처음 등장, 무사 갈래엔
  없던 이름). 참격(w_cut)과 같은 정면 판정·ATTACK_RANGE로 좁혔다 —
  원문에 별도 사거리가 없어 활이라고 사거리를 늘리는 새 숫자는 상상하지
  않았다(mul 1.85).
- **연사(a_double)** — 원문 effect:'volley', shots:3("화살 셋을 잇달아").
  투사체가 없어 **정면 판정을 세 번 잇달아 적용**으로 재해석(mul 1.5×3회).
- **관통시(a_pierce)** — 원문 effect가 이미 'bolt'라 기탄(4절)·파공검과
  같은 재해석을 그대로 재사용 — 사거리 2배(ARCHER_PIERCE_RANGE_MUL,
  BOLT_RANGE_MUL과 같은 값 2.0을 archer 몫으로 따로 둠), mul 2.9.
- **응안(a_eye)** — buff, sec9·atk×1.4 원문 그대로. guard 성분은 원문에
  없다(철갑만의 것) — `_job_buff_time_left`를 철갑과 **공유**한다(job이
  한 번 정해지면 안 바뀌어 두 직업 버프가 동시에 걸릴 일이 없다는 점을
  이용, 새 변수를 안 늘렸다). `_effective_atk()`/`take_damage()`가 job을
  보고 어느 배율(철갑 1.2+guard 0.35 vs 응안 1.4, guard 없음)을 적용할지
  고른다.

`job=='archer'`일 때만 실제로 쓰인다 — 같은 입력 액션 넷(`story_job_
skill_1~4`)을 job에 따라 다른 무예로 배선했다(warrior 분기 옆에 archer
분기를 추가, 새 입력 액션은 안 늘렸다).

- `story_combat.gd`: `ARCHER_SHOT_*`/`ARCHER_DOUBLE_*`/`ARCHER_PIERCE_*`/
  `ARCHER_EYE_*` 상수 신규.
- `story_player.gd`: 쿨다운 넷(`_cd_archer_shot/double/pierce/eye`) 신규.
  `_cast_archer_shot/double/pierce/eye()` 신규. `_effective_atk()`가
  job별로 철갑/응안 배율을 고르도록, `take_damage()`의 guard가 `job==
  "warrior"`일 때만 적용되도록 수정(응안엔 guard가 없으므로 archer가
  철갑의 방어 보너스를 새지 않는지 확인 대상).
- **검증(헤드리스, 값 자체까지)** — import 확인(texture-a.png.import
  재발생 노이즈, 되돌림) → 여섯 씬 세 번 연속 exit 0·로그 무결(GO/
  DUNGEON/FOREST/REALM/STORY 둘 다 회귀 확인 포함). 임시 디버그
  (`story_field.gd`에 더미 적+강제 job=archer)로: 네 mul(1.85·1.5·2.9·
  1.4) 정확, `roll_damage` 500회 표본이 손계산 범위(atk21·mul1.85 기준
  34.20~69.56) 안, 사격 실제 시전으로 mp 100→92(−8)·쿨다운 0.6·데미지가
  손계산 범위(atk26 job보너스 포함·noncrit 42.3~53.9·crit 67.7~86.2) 안
  49.9, 연사로 mp −22·쿨다운 3.4·3발 합산 117.6(단발 평균 ×3 근사),
  평타(2.2m)는 3.5m 밖 표적을 못 맞히는데 관통시(4.4m)는 맞힘(mp −26·
  쿨다운 6.0·데미지 68.95, 손계산 noncrit 66.35~84.45 안), 응안으로
  `_effective_atk()`가 26.0→36.4(×1.4 정확)·`_job_buff_time_left`=9.0,
  마지막으로 `take_damage(100)`이 172→72(정확히 −100, 철갑 guard가
  archer에 안 새는 것 확인)까지 전부 예측과 일치. 디버그 원상복구
  (`story_field.gd` diff 0, `git checkout`으로 확인).
- **GUI 실기 확인은 아직 안 함** — 계속 몰아서 받을 것.
- **다음 이어질 것** — 협객·방사 무예 넷씩(같은 패턴), SP 투자 UI,
  2~4차 전직, 나머지 일곱 사냥터+신야성 — 다음 "saga-godot 이어 해"에서
  이어간다.

## 19. 전직 무예 마지막 걸음 — 협객(rogue)·방사(mage) 넷씩 (2026-09-13)

**사용자 지시 "saga-godot 이어 하고 묻지말고 최대한 다해줘"** — 17·18절이
남긴 "궁수·협객·방사 무예 넷씩" 중 나머지 둘(협객·방사)을 한 번에
끝냈다. 이걸로 1차 전직 4갈래(무사·궁수·협객·방사) 무예 넷씩(총 16개)이
전부 채워졌다. FIXED_SKILL_LEVEL(5) 그대로 재사용.

**협객(rogue) 넷** (`data-job.js` SKILLS job:'rogue', cost·cd·mul·dist
안 바꿈):
- **쌍참(r_twin)** — 원문 effect가 이미 'melee'에 hits:2. 연사(18절)와
  같은 재해석(정면 판정을 그 횟수만큼 잇달아 적용), mul 1.02.
- **비도(r_knife)** — volley(shots:2), 같은 재해석, mul 1.45.
- **은신보(r_step)** — dash, dist:260px(5.2m로 환산) + **invuln:0.7
  (이 포트에 처음 등장하는 필드)**. 돌진(w_rush)과 같은 순서(경로
  판정 → 순간이동)에 무적 시간만 더했다 — side.js `p.invuln`을
  `_invuln_time_left`(공용, story_player.gd 신규)로 옮기고,
  `take_damage()` 맨 앞에서 이 값이 0보다 크면 방어 컷 계산 전에
  피해 자체를 무시하도록 했다(원문 hurtMe()의 `if (p.invuln>0) return`
  그대로).
- **급소(r_vital)** — buff, sec8·atk×1.55 원문 그대로. 철갑·응안과 같은
  `_job_buff_time_left`를 공유.

**방사(mage) 넷**:
- **화구(m_fire)** — 원문 effect가 이미 'bolt'. 기탄·관통시와 같은
  재해석(사거리 2배), mul 2.15.
- **뇌전(m_bolt)** — aoe(r:165px). 선풍·횡소와 같은 360도 판정 구조,
  REACH(78px)비로 사거리 환산(165/78), mul 2.75.
- **치유(m_heal)** — **이 포트에 처음 등장하는 effect:'heal'.** side.js
  heal 처리(`pct = heal[0]+heal[1]*max(0,lv-1); hp = min(hpMax, hp +
  round(hpMax*pct))`)를 옮기되, FIXED_SKILL_LEVEL을 mul과 같은 결로
  직접 곱한다(이 포트의 mul 공식 자체가 이미 (lv-1)이 아니라 lv를
  그대로 곱하는 재해석이라 — 17절 머리말 — heal도 그 관례를 따랐다,
  0.18+0.022×5=0.29). 적 판정 없이 `max_hp * MAGE_HEAL_PCT`만큼 채운다.
- **부적(m_talis)** — buff, sec10·atk×1.25·**regen:2.6(이 포트에 처음
  등장 — MP 회복 속도 배율)** 원문 그대로. atk 배율은 다른 job 버프와
  같은 `_job_buff_time_left`를 공유하지만, regen 배율은 `_physics_
  process()`의 mp 회복 줄이 `job=='mage'`일 때만 따로 곱한다(다른
  job 버프엔 regen 성분이 없다).

`job=='rogue'`/`'mage'`일 때만 실제로 쓰인다 — 같은 입력 액션 넷
(`story_job_skill_1~4`)에 두 분기를 더 얹었다(warrior/archer 옆에
elif로, 새 입력 액션은 안 늘렸다).

- `story_combat.gd`: `ROGUE_TWIN_*`/`ROGUE_KNIFE_*`/`ROGUE_STEP_*`
  (+`rogue_step_dist_m()`)/`ROGUE_VITAL_*`/`MAGE_FIRE_*`/`MAGE_BOLT_*`/
  `MAGE_HEAL_*`/`MAGE_TALIS_*` 상수 신규.
- `story_player.gd`: 쿨다운 여덟(`_cd_rogue_*`·`_cd_mage_*`) +
  `_invuln_time_left` 신규. `_cast_rogue_twin/knife/step/vital()`·
  `_cast_mage_fire/bolt/heal/talis()` 신규. `take_damage()`가 맨 앞에서
  invuln을 확인하도록, `_effective_atk()`가 rogue/mage 배율도 고르도록,
  `_physics_process()`의 mp 회복 줄이 부적 regen 배율을 곱하도록 수정.
- **검증(헤드리스, 값 자체까지)** — import 확인(texture-a.png.import
  재발생 노이즈, 되돌림) → 여섯 씬 세 번 연속 exit 0·로그 무결(다섯 판
  전부 회귀 확인 포함). 임시 디버그(`story_field.gd`에 더미 적+강제
  job 전환)로: 여덟 mul(1.02·1.45·1.7·1.55·2.15·2.75·0.29·1.25) 정확,
  쌍참/비도/은신보/화구/뇌전 실제 시전으로 mp·쿨다운·데미지 전부
  손계산 범위와 일치, 은신보 이동거리 정확히 5.2m, 무적 확인(invuln
  걸린 동안 `take_damage(50)` 완전 무시 → 0 만든 뒤 재시도하면 정확히
  −50), 급소 atk×1.55·부적 atk×1.25 정확, 치유가 hp를 정확히
  `max_hp*0.29`만큼 채움(87→137.46, max_hp 174), 부적 regen으로 1초당
  mp 회복이 정확히 MP_REGEN(8)×2.6=20.8 늘어남까지 전부 예측과 일치.
  디버그 원상복구(`story_field.gd` diff 0).
- **GUI 실기 확인은 아직 안 함** — 계속 몰아서 받을 것.
- **다음 이어질 것** — 1차 전직 무예 16개가 다 채워졌다. 다음 굵직한
  후보: SP(무예 점수) 투자 시스템(지금은 FIXED_SKILL_LEVEL로 고정) UI,
  2~4차 전직, 나머지 일곱 사냥터+신야성(15절이 첫 걸음만 뗀 것) — 다음
  "saga-godot 이어 해"에서 이어간다.

## 20. SP(무예 점수) 투자 시스템 (2026-09-13)

**사용자 지시 "계속 이어해 묻지말고"** — 19절이 남긴 굵직한 후보 중
SP 투자 시스템을 먼저 잡았다. 17~19절이 1차 전직 무예 16개를 전부
`FIXED_SKILL_LEVEL`(5, 임의 고정값)로 mul을 미리 계산해 둔 것을,
**실제 투자한 레벨(0~10)로 대체**했다 — `data-job.js` 머리말 "레벨마다
3점을 찍어 무예를 0~10으로 올린다"와 `job.js`의 spTotal/spSpent/spLeft/
canRaise/raise를 그대로 옮긴다.

**세이브** — `StorySaveState.skills`(key→레벨 Dictionary) 신규, SAVE_
VERSION 6→7. SP 자체는 담지 않는다(원문과 같은 이유 — `sp_total()-
sp_spent()`의 파생값이라 레벨이 오르면 저절로 는다).

**mul 공식** — `job.js mulOf()`는 `mul[0]+mul[1]*max(0,lv-1)`이지만,
이 포트는 17절부터 이미 `FIXED_SKILL_LEVEL`을 (lv-1)이 아니라 lv에
그대로 곱해 왔다(그 상수 계산 주석들이 그렇게 적혀 있고, 검증도 그
공식으로 확인됐다) — 새 `StoryCombat.skill_mul(base, per, level)`도
그 관례를 그대로 잇는다(`base + per*level`), 지금 와서 (lv-1)로 바로
잡지 않는다(이미 커밋된 17~19절 검증 수치와 어긋나게 되는 걸 피했다 —
"재해석"이 아니라 "이 포트의 mul 공식 관례"로 남긴다).

**미투자 무예는 아예 못 쓴다** — `job.js bar()`가 "찍은 것만" 조작
띠에 놓는 것과 같은 자리. 16개 `_cast_*` 함수 전부 맨 앞에서 `Story
SaveState.skill_level(key) <= 0`이면 조용히 무시하도록 고쳤다(버프
넷은 mul 스케일이 없어 "배웠는지"만 확인, 나머지 열둘은 `skill_mul()`로
매번 다시 계산).

**SP를 어디서 찍나** — 탭 UI가 없어(가방·상점과 같은 이유) 허도의 전직
담당(`story_job_trainer.gd`) 자리를 **재사용**했다: 전직 전엔 숫자
1~4가 갈래를 고르고, **전직 후엔 같은 숫자 1~4가 그 직업 무예 넷
(`StoryCombat.JOB_SKILL_KEYS` 순서 — 전투 입력 순서와 같다) 중 하나에
SP 1점**을 찍는다. 새 입력 액션을 안 늘렸다. 근처에 서 있으면 상태
토스트에 SP 잔여·각 무예 레벨이 뜬다.

- `story_combat.gd`: `SKILL_MAX_LEVEL`(10)·`SP_PER_LEVEL`(3)·
  `SKILL_JOB`(key→job)·`JOB_SKILL_KEYS`(job→key 넷)·`skill_mul()` 신규.
  16개 `*_MUL` 상수를 `*_BASE`/`*_PER` 쌍으로 쪼갬(버프 넷의 atk_mul·
  guard·sec 등은 그대로 — 원문에 레벨 항이 없다). `FIXED_SKILL_LEVEL`
  제거(더 안 쓴다).
- `story_save_state.gd`: `skills` 신규(SAVE_VERSION 7). `sp_total()`/
  `sp_spent()`/`sp_left()`/`skill_level()`/`can_raise_skill()`/
  `raise_skill()` 신규. save()/try_load()가 skills를 담고 복원.
- `story_player.gd`: 16개 `_cast_*`가 전부 `skill_level(key)<=0`이면
  조용히 반환하도록, mul을 상수 대신 `StoryCombat.skill_mul(BASE, PER,
  skill_level(key))`로 매번 계산하도록 수정.
- `story_job_trainer.gd`: `_status_text()`가 전직 후 SP 잔여·무예별
  레벨을 보여주도록, `_process()`/`_raise()` 신규(전직 후 숫자 1~4가
  SP 투자로 전환).
- **검증(헤드리스, 값 자체까지)** — import 확인(재발생 노이즈, 되돌림)
  → 여섯 씬 세 번 연속 exit 0·로그 무결(다섯 판 전부 회귀 포함). 임시
  디버그(`story_field.gd`)로: `sp_total(레벨10)`=27(=(10-1)×3) 정확,
  **미투자 무예(레벨0) 시전이 mp·적 hp 둘 다 그대로 두고 완전히 무시됨
  확인**, `can_raise_skill`이 다른 직업 무예엔 false·자기 직업 무예엔
  true, 1점 투자 후 레벨1·spent1·left26 정확, 레벨1로 실제 시전하니
  mul이 정확히 1.24(=1.15+0.09×1)로 명중, 반복 투자해도 **레벨이
  SKILL_MAX_LEVEL(10)에서 멈추고 sp_left가 17(=27-10)로 정확히 남음**
  (SP 총량 27로는 열 곳을 못 채우고 한 무예만 만렙 가능한 것도 확인),
  세이브/로드 왕복으로 skills(레벨10)이 그대로 복원됨까지 전부 예측과
  일치. 디버그 원상복구(`story_field.gd` diff 0, 디버그가 만든 세이브
  파일도 스스로 지움).
- **GUI 실기 확인은 아직 안 함** — 특히 허도에서 숫자 키로 SP를 찍는
  손맛(토스트 문구가 붐비지 않는지)은 눈으로 볼 것. 계속 몰아서 받을 것.
- **다음 이어질 것** — 2~4차 전직(더 위 갈래 자체가 아직 없다), 나머지
  일곱 사냥터+신야성(15절이 첫 걸음만 뗀 것). SP 시스템이 생겼으니
  레벨업 시 "몇 점 남았다"는 알림(현재는 허도에 가야만 보인다)도 다음에
  볼 만하다.

## 21. 나머지 사냥터 — 둘째: 강릉진(중계 마을) (2026-09-13)

**사용자 지시 "계속 이어해 묻지말고"** — 15절이 첫걸음을 뗀 "나머지
사냥터 8곳(문 포함)" 중 둘째로 **강릉진(江陵鎭)**을 지었다. `data-side.
js` STAGES 'gangneungjin' 항목 그대로 — heodo_map.gd와 같은 패턴
(town:true, 발판 둘·줄 둘만 있는 중계 마을).

**재해석** — 원작 npcs(guard/elder/merchant)는 옮기지 않는다. 상점·
전직 기능은 14·15절 결정대로 허도 하나에만 몰아 뒀다(마을이 늘어도
기능까지 늘리지 않는다) — 강릉진은 field↔forest 사이 순수 중계지다.
원작 동쪽 문([1230,'forest'])도 오림 숲이 아직 없어 heodo_map.gd가
신야성 문을 미룬 것과 같은 이유로 안 옮긴다.

**field의 동쪽 문을 마저 열었다** — 15절이 "그 사냥터가 아직 없어
안 옮긴다"고 미뤄 뒀던 `field.portals[1]`([2130,'gangneungjin'])을
이번에 채운다. **주의할 점 하나 발견** — 서쪽 문과 같은 "한 걸음
안쪽(+80px)" 관례를 그대로 따르면 도착 자리가 2050px인데, 그 값이
`BOSS_X_PX`(원작에 없어 이 포트가 새로 정한 보스 자리)와 정확히
겹친다. `story_enemy.gd`의 보스 접촉 판정 반경(OVERLAP_RANGE 0.6m ×
BOSS_VISUAL_SCALE 1.6 = 0.96m)보다 확실히 먼 간격을 두려고 문 쪽으로
20px 더 붙여 **2110px**로 잡았다(보스와 1.2m 차이 — 도착하자마자
겹쳐 맞는 사고를 피한다).

- `games/saga_story/data/gangneungjin_map.gd` 신규(heodo_map.gd와
  같은 모양 — width_m/plats_m/ropes_m/portal_west_m/arrival_from_field_m).
- `field_map.gd`: `PORTAL_EAST_X_PX`(2130)·`ARRIVAL_FROM_GANGNEUNGJIN_
  X_PX`(2110, 위 보스 회피 설명 참고)·`portal_east_m()`/`arrival_from_
  gangneungjin_m()` 신규.
- `games/saga_story/world/GangneungjinField.tscn` 신규(story_town.gd
  재사용, Terrain의 `map_path`만 gangneungjin_map.gd로 — story_terrain_
  builder.gd 공용화(15절) 덕에 이 파일 하나 추가로 끝났다). 서쪽 문
  (PortalToField)만 배선 — 동쪽 문은 위 "재해석" 참고.
- `TestField.tscn`: `PortalToGangneungjin` 노드 신규(x=42.6m, arrival
  3.0m — heodo 방향 문과 같은 패턴).
- **검증(헤드리스, 값 자체까지)** — import 확인(재발생 노이즈, 되돌림)
  → 이제 **일곱 씬**(신규 GangneungjinField 포함) 세 번 연속 exit 0·
  로그 무결(다섯 판 전부 회귀 포함). 임시 디버그로 field portal_east_m
  =42.6·arrival_from_gangneungjin_m=42.2·보스와의 간격 1.2(>0.96,
  안전 확인)·gangneungjin width_m=26.0·arrival_from_field_m=3.0·발판
  둘/줄 둘 좌표 전부 손계산과 일치, **문을 실제로 실행**(`change_scene_
  to_file()` 직접 호출, 15절과 같은 방식)해 130프레임 뒤 GangneungjinField로
  실제 전환되고 플레이어가 정확히 x=3.0에 도착함까지 확인. 디버그
  원상복구(`story_field.gd`·`story_town.gd` diff 0).
- **GUI 실기 확인은 아직 안 함** — 계속 몰아서 받을 것.
- **다음 이어질 것** — 오림 숲(forest, 첫 진짜 사냥터 — 잡졸·채집·보스가
  다시 나오는 자리, field 이후 둘째 전투 사냥터)·남정성·한중 굴혈·
  기산채·호로곡·신야성(나머지 여섯), 그리고 2~4차 전직(이쪽은 `job`
  필드를 덮어쓰는 원작 방식이 이 포트의 여러 `job=="warrior"` 분기와
  부딪혀 — job 체인 전체를 다시 설계해야 하는 더 큰 작업, 다음 세션에서
  신중히 볼 자리).

## 22. 나머지 사냥터 — 셋째: 오림 숲(진짜 전투 사냥터) (2026-09-13)

**사용자 지시 "계속 이어해 묻지말고"** — 21절(강릉진)에 이어 **오림
숲(forest)**을 지었다. field 이후 **첫 진짜 전투 사냥터**(잡졸·채집·
보스가 다 있다, 마을이 아니다)라 field_map.gd와 같은 결로 옮긴다.

**재해석 셋**(field_map.gd 머리말과 같은 결):
- 잡졸 스폰(원작 spawn:9, 무작위 보충) → **고정 자리 셋**(field와 같은
  단순화 — day/파도 시스템 자체가 범위 밖이라 원작 스폰 수를 그대로
  옮기는 의미가 없다).
- 몬스터 종류(`data-enemy.js` tierOf(6)의 "변방" 풀)는 **아직 안
  옮긴다** — 이 슬라이스는 여전히 잡졸(황건적) 하나뿐이다. 사냥터마다
  다른 몬스터를 넣는 것은 몬스터 도감이라는 더 큰 별도 작업(다음에
  볼 자리) — 지금은 "새 사냥터가 있다"까지만 검증한다.
- 보스(오랑캐 족장)도 **이름만** 원문 그대로 옮기고 hpMul·dmgMul·cool은
  story_combat.gd의 field용 상수(BOSS_HP_MUL 등)를 그대로 재사용 —
  사냥터별 보스 배율 도입도 몬스터 도감과 같은 결의 확장이라 안 벌렸다.

**사냥터 스포너 공용화** — story_enemy_spawner.gd·story_gather_
spawner.gd·story_boss_spawner.gd 셋이 지금까지 `FieldMap`을 상수로
preload해 field 전용이었다(15절이 story_terrain_builder.gd만 `map_
path` export로 공용화하고 이 셋은 안 건드렸었다 — 마을엔 적·채집·
보스가 없어 필요가 없었다). 오림 숲이 처음으로 이 셋이 필요한 새
전투 사냥터라 이번에 마저 같은 방식(`map_path` export, 기본값
field_map.gd — TestField.tscn은 손 안 대도 그대로 돈다)으로 공용화
했다.

**채집물 확장** — `story_combat.gd` GATHER_INFO에 `"berry": {"산딸기",
🍓}` 추가(머리말이 예고해 뒀던 "다른 채집물이 늘어나면"의 첫 사례).

**문** — 서쪽(70px, 강릉진)은 이번에 실제로 연다(강릉진의 동쪽 문도
같이 개통 — 원작 portals[1] [1230,'forest']). 동쪽(2530px,
'namjeongseong')은 그 사냥터가 아직 없어 안 옮긴다(heodo/field가
써 온 것과 같은 유예). 보스 자리(2450px)는 이 문이 아직 안 열려 있어
21절처럼 도착지-보스 간격을 걱정할 필요가 없었다(문을 놓을 때 60px+
간격을 두면 된다는 메모만 남겨 둠).

- `games/saga_story/data/forest_map.gd` 신규(field_map.gd와 같은 모양
  + enemy/gather/boss 포함, heodo/gangneungjin류 마을 데이터보다 큼).
- `gangneungjin_map.gd`: `PORTAL_EAST_X_PX`(1230)·`ARRIVAL_FROM_FOREST_
  X_PX`(1150)·`portal_east_m()`/`arrival_from_forest_m()` 신규.
- `story_combat.gd`: GATHER_INFO에 berry 추가.
- `story_enemy_spawner.gd`/`story_gather_spawner.gd`/`story_boss_
  spawner.gd`: `map_path` export로 공용화(기존 FieldMap 상수 preload
  제거, 기본값은 그대로 field_map.gd).
- `games/saga_story/world/ForestHuntGround.tscn` 신규(TestField.tscn과
  같은 구성 — Terrain/EnemySpawner/GatherSpawner/BossSpawner 넷 다
  map_path="forest_map.gd", 서쪽 PortalToGangneungjin만 배선).
- `GangneungjinField.tscn`: `PortalToForest` 노드 신규(x=24.6m, arrival
  3.0m).
- **검증(헤드리스, 값 자체까지)** — import 확인(재발생 노이즈, 되돌림)
  → 이제 **여덟 씬**(신규 ForestHuntGround 포함) 세 번 연속 exit 0·
  로그 무결(다섯 판 전부 회귀 포함). 임시 디버그로 gangneungjin
  portal_east_m=24.6·arrival_from_forest_m=23.0, forest width_m=52.0·
  portal_west_m=1.4·arrival_from_gangneungjin_m=3.0·boss_position_m=
  49.0·잡졸 셋([10.0,24.0,38.0])·채집 넷(전부 berry)·발판 여섯/줄
  여섯 좌표 전부 손계산과 일치. **문 체인을 실제로 두 번 실행**
  (`change_scene_to_file()`을 field→gangneungjin→forest 순으로 연쇄,
  15·21절과 같은 방식) — 각 도착 지점이 쓰인 arrival 상수와 정확히
  일치함을 확인(gangneungjin 도착 x=3.0=arrival_from_field_m, forest
  도착 x=3.0=arrival_from_gangneungjin_m). 디버그 원상복구(`story_
  field.gd`·`story_town.gd` diff 0).
- **GUI 실기 확인은 아직 안 함** — 계속 몰아서 받을 것.
- **다음 이어질 것** — 남정성·한중 굴혈·기산채·호로곡·신야성(나머지
  다섯), 몬스터 도감(사냥터별 다른 적), 2~4차 전직(job 체인 재설계
  필요 — 별도로 신중히).

## 23. 나머지 사냥터 — 남은 다섯 전부 + 세계 완주 (2026-09-13)

**사용자 지시 "계속 이어해 묻지말고"** — 21·22절이 하나씩 잇던 "나머지
사냥터 8곳"을 이번엔 **한 번에 마저 끝냈다**: 신야성·남정성·한중 굴혈·
기산채·호로곡 다섯 + 허도↔신야성·오림숲↔남정성 두 문. 이걸로 웹판
`data-side.js` STAGES 아홉 자리(신야성→허도→허창들판→강릉진→오림숲→
남정성→한중굴혈→기산채→호로곡)가 **전부** 이어졌다.

**작은 발견 하나(먼저 바로잡음)** — 21절에서 GATHER_INFO에 berry를
추가할 때 원문 `data-side.js GATHERS` 표를 안 보고 emoji/이름을
새로 지어냈다("산딸기"🍓) — 이번에 원문(`덤불 열매`🍇)을 확인하고
바로잡았다. ore(`이끼 광물`⛏️)·cinder(`그은 돌`🪨)는 처음부터 원문대로 넣었다.

**패턴은 21·22절과 완전히 같다** — town 셋(신야성·남정성·기산채)은
heodo_map.gd 모양(발판·줄만), 전투 사냥터 둘(한중 굴혈·호로곡)은
forest_map.gd 모양(+잡졸 고정 셋·채집·보스, 몬스터 종류는 여전히
잡졸 하나·보스 배율은 field 상수 재사용 — "몬스터 도감은 범위 밖"
재해석을 그대로 유지). 호로곡은 원작에서 "갈래의 끝"이라 동쪽 문 자체가
없다(문이 없어도 경계벽은 그대로).

**사냥터 스포너 공용화가 하나 더 필요했다** — story_background.gd
(배경 나무·언덕)가 `FieldMap.width_m()`을 상수로 preload해 여전히
field 전용이었다(22절이 놓친 넷째 스포너) — 오림 숲·한중 굴혈이 field
보다 넓은데 배경 폭이 field 만큼만 깔려 뒷부분이 비는 걸 발견해 같이
공용화했다(`map_path` export, 나머지 셋과 같은 방식).

**보스-도착지 안전 거리** — field/forest에 이어 이번엔 문제가 안
생겼다(cave·gorge 둘 다 표준 -80px 관례로 잡아도 발명한 보스 자리와
충분히 멀었다) — field가 처음 밟았던 함정을 이후로는 설계 단계에서
미리 피해 가게 됐다.

- `games/saga_story/data/{sinya,namjeongseong,cave,gisanchae,gorge}_map.gd`
  신규(다섯).
- `heodo_map.gd`: 서쪽 문(sinya) 개통. `forest_map.gd`: 동쪽 문
  (namjeongseong) 개통(보스와 1.2m 간격, 21절과 같은 회피).
- `story_combat.gd`: GATHER_INFO berry 정정 + ore/cinder 추가.
- `story_background.gd`: `map_path` export로 공용화(넷째 스포너).
- `games/saga_story/world/{SinyaField,NamjeongseongField,GisanchaeField}.
  tscn`(town, 문 각 하나~둘) + `{CaveHuntGround,GorgeHuntGround}.tscn`
  (전투 사냥터, 스포너 넷) 신규. `HeodoField.tscn`에 PortalToSinya,
  `ForestHuntGround.tscn`에 PortalToNamjeongseong·Background map_path
  수정.
- **검증(헤드리스, 값 자체까지)** — import 확인(재발생 노이즈, 되돌림)
  → **열세 씬**(신규 다섯 포함) 세 번 연속 exit 0·로그 무결(다섯 판
  전부 회귀 포함). 임시 디버그로 새 지도 다섯의 문·도착·지형·잡졸·채집·
  보스 좌표 전부 손계산과 일치 확인 + **`SinyaField.tscn`을 시작 씬으로
  줘서 신야성→허도→허창들판→강릉진→오림숲→남정성→한중굴혈→기산채→
  호로곡까지 문 여덟 개를 실제로 연쇄 실행**(`change_scene_to_file()`을
  각 씬 `_ready()`에서 이어 부르는 방식, 15·21·22절과 같은 도구) —
  아홉 자리 전부 정확한 도착 x(전부 3.0m, +80px 관례가 일관되게 같은
  값으로 떨어진다)에 도착함을 확인. 디버그 원상복구(`story_field.gd`·
  `story_town.gd` diff 0).
- **GUI 실기 확인은 아직 안 함** — 아홉 자리를 실제로 걸어서 이어 보는
  느낌(문마다 로딩 체감, 각 사냥터 분위기 차이)은 눈으로 볼 것. 계속
  몰아서 받을 것.
- **다음 이어질 것** — 몬스터 도감(사냥터마다 다른 적), 사냥터별 보스
  배율, 마을 배경(mood별 하늘 색), 2~4차 전직(job 체인 재설계 필요).
  나머지 사냥터라는 "굵직한 후보"는 이걸로 완료 — PLAN.md 79·80장이
  가리키던 항목이 다 채워졌다.

## 24. 사냥터별 보스 배율 (2026-09-13)

**사용자 지시 "saga-godot 이어해"** — 23절이 남긴 "다음 이어질 것" 중
하나(사냥터별 보스 배율)를 채웠다. 지금까지 field/forest/cave/gorge
네 보스가 전부 `story_combat.gd`의 전역 상수(`BOSS_HP_MUL` 12·
`BOSS_DMG_MUL` 2.0·`BOSS_COOL_SEC` 900) 하나를 같이 썼다 — field
전용이던 값이 forest 이후 세 사냥터에도 그대로 새 나갔던 것(forest_
map.gd 머리말이 "story_combat.gd가 이미 갖고 있는 field용 상수를
그대로 재사용한다"고 스스로 적어 뒀었다). `data-side.js` 원문은 넷이
다 다르다(field 12/2.0/15분, forest 14/2.2/20분, cave 17/2.5/30분,
gorge 20/2.8/40분) — 이번에 그 차이를 실제로 살렸다.

- `{field,forest,cave,gorge}_map.gd`: 각자 `BOSS_HP_MUL`/`BOSS_DMG_MUL`/
  `BOSS_COOL_SEC` 상수 + `boss_hp_mul()`/`boss_dmg_mul()`/
  `boss_cool_sec()` 신규(`boss_position_m()`과 같은 자리·모양).
- `story_boss_spawner.gd`: `_spawn_boss()`가 `is_boss`와 같은 순서로
  `boss.boss_hp_mul`/`boss.boss_dmg_mul`을 add_child 전에 세팅(이제
  맵에서 읽음). `_on_boss_died()`의 재스폰 타이머도 `StoryCombat.
  BOSS_COOL_SEC` 대신 `_map.boss_cool_sec()`. 안 쓰게 된 `StoryCombat`
  preload 제거.
- `story_enemy.gd`: `is_boss` 옆에 `boss_hp_mul`/`boss_dmg_mul` export성
  변수 신규(기본값은 story_combat.gd 상수 — map_path를 안 거치는
  맨몸 인스턴스용 안전값). `_ready()`의 hp 계산과 `_physics_process()`의
  반격 데미지가 이 두 변수를 읽는다(전역 상수 직접 참조 제거).
- `story_combat.gd`의 `BOSS_HP_MUL`/`BOSS_DMG_MUL`/`BOSS_COOL_SEC`는
  안 지웠다 — field 값과 같고, 위 안전값 용도로 여전히 쓰인다.

**검증(헤드리스, 값 자체까지)** — import 확인(texture-a.png.import만
재발생, 되돌림) → `project.godot`/`*.import` diff 없음 확인 → 열세 씬
전부 `--quit-after 5` 세 번 연속 exit 0·로그 완전 동일(다섯 판 회귀
포함). **임시 디버그**(`story_boss_spawner.gd` `_spawn_boss()`에 print
두 줄 추가)로 네 보스 씬(TestField·ForestHuntGround·CaveHuntGround·
GorgeHuntGround)을 각각 실행해 실제 적용값 확인: hp_mul/dmg_mul/
cool_sec이 map_path별로 정확히 12·2.0·900(field) / 14·2.2·1200(forest) /
17·2.5·1800(cave) / 20·2.8·2400(gorge)로 갈리고, 스폰된 보스의 실제
hp가 `ENEMY_HP(18) × hp_mul` = 216/252/306/360으로 넷 다 손계산과
정확히 일치. 디버그 원상복구(`story_boss_spawner.gd` diff — print
두 줄만 제거, 실제 로직 변경분은 유지), 재검증(3회 반복, exit 0·로그
동일·project.godot/.import diff 없음)까지 마쳤다.

**GUI 실기 확인은 아직 안 함** — 강한 보스(gorge, 적국 대장군)가 실제로
더 세게 느껴지는지는 눈으로 볼 것. 계속 몰아서 받을 것.

**다음 이어질 것** — 몬스터 도감(사냥터마다 다른 적), 마을 배경(mood별
하늘 색), 2~4차 전직(job 체인 재설계 필요).

## 25. 마을 배경 — 사냥터별 하늘 색 (2026-09-13)

**사용자 지시 "saga-godot 이어해 묻지말고"** — 24절이 남긴 "다음 이어질
것" 중 하나(마을 배경, mood별 하늘 색)를 채웠다. 지금까지 아홉 사냥터가
전부 `env_pc.tres`/`env_mobile.tres`의 하늘색 하나(파란 하늘, field
기준)를 그대로 썼다 — `data-side.js` STAGES는 자리마다 다른
`sky: [top, horizon]`을 갖고 있는데(신야성 노을빛 베이지부터 호로곡의
불타는 붉은빛까지) 그 차이가 3D 포트엔 하나도 안 넘어와 있었다.

**설계 — 공용 리소스는 안 건드린다.** `env_pc.tres`/`env_mobile.tres`는
GO/DUNGEON/FOREST/STORY/REALM 다섯 판이 전부 같이 쓰는 파일이라(66-1장
원칙, `season_weather_visual.gd` 머리말과 같은 이유) 값을 직접 못
고친다. 그 대신 새 `story_sky.gd`가 `WorldEnvironment.environment`를
`duplicate(true)`로 이 씬 전용 사본으로 갈아 끼운 뒤 그 사본의
`ProceduralSkyMaterial.sky_top_color`/`sky_horizon_color`만 덮어쓴다 —
원본 `.tres`는 메모리에서도 손 안 대므로 다른 네 판에 절대 안 물든다
(`season_weather_visual.gd`는 공용 인스턴스를 직접 고쳐 이론상 같은
프로세스 안에서 다른 판에 새어 나갈 수 있는데, 그건 이미 있던 패턴이라
이번 범위 밖으로 남겨 뒀다 — 이 절이 그 문제를 새로 만들진 않는다).

- `world/story_sky.gd`(신규) — `sky_top_color`/`sky_horizon_color` export
  (기본값 field), `world_environment_path` export(`../WorldEnvironment`,
  `season_weather_visual.gd`와 같은 형제-순서 규칙). `story_terrain_
  builder.gd`의 `ground_color` export와 같은 패턴 — 씬마다 값만 다르게
  얹는다. 원본 hex 아홉 자리는 이 스크립트 머리말 주석에 모아 뒀다.
- 아홉 씬(`TestField`·`SinyaField`·`HeodoField`·`GangneungjinField`·
  `ForestHuntGround`·`NamjeongseongField`·`CaveHuntGround`·
  `GisanchaeField`·`GorgeHuntGround`) 전부에 `StorySky` 노드를
  `WorldEnvironment` 바로 다음 자리에 추가. `TestField`는 기본값(field)
  그대로라 export 값을 안 얹었다(`ground_color`가 field에서 생략된 것과
  같은 관례).

**검증(헤드리스, 값 자체까지)** — import 확인(texture-a.png.import만
재발생, 되돌림, `story_sky.gd.uid` 정상 생성) → `project.godot`/`*.import`
diff 없음 → 열세 씬 전부 `--quit-after 5` 세 번 연속 exit 0·로그 완전
동일(다섯 판 회귀 포함). **임시 디버그**(`story_sky.gd` `_ready()` 끝에
print 한 줄)로 아홉 씬 각각 실제 적용된 `sky_top_color`/`sky_horizon_
color`를 확인 — 전부 hex 원문을 손으로 환산한 값과 정확히 일치(예:
gorge (0.2275,0.0784,0.0627)/(0.5608,0.2275,0.1098) = `#3a1410`/`#8f3a1c`).
디버그 원상복구(print 한 줄만 제거) 후 재검증(3회 반복, exit 0·로그
동일·project.godot/.import diff 없음)까지 마쳤다. `env_pc.tres`/
`env_mobile.tres` 자체는 git diff 없음(디스크상 원본 불변) 확인.

**GUI 실기 확인은 아직 안 함** — 사냥터를 걸어 넘나들 때 하늘색이 실제로
바뀌는 느낌(신야성의 노을빛 → 허도의 금빛 → 허창들판의 파란 하늘 →
강릉진의 짙은 청록 → 오림숲의 초록빛 → 남정성의 잿빛 → 한중굴혈의 어두운
동굴 → 기산채의 붉은 노을 → 호로곡의 불타는 하늘)은 눈으로 볼 것. 계속
몰아서 받을 것.

**다음 이어질 것** — 몬스터 도감(사냥터마다 다른 적), 2~4차 전직(job 체인
재설계 필요). 배경의 나무·언덕 실루엣(story_background.gd)이 마을
전용 장식(성벽·깃발 등)까지 mood별로 갈리길 원하면 그건 이 절의 범위
밖(색만 다룸)이라 별도로 볼 자리.

## 26. 몬스터 도감 — 사냥터별 잡졸·보스 수치·색 (2026-09-13)

**사용자 지시 "saga-godot 이어해 묻지말고"** — 25절이 남긴 "다음 이어질
것" 중 마지막 남은 큰 후보(몬스터 도감)를 채웠다. 지금까지 field/
forest/cave/gorge 넷이 잡졸(황건적, hp18·dmg6)과 보스 색(모두 황건
두목의 `#c9a83a`)을 그대로 같이 썼다 — `data-side.js`의 `enemyLv`
(field1·forest6·cave14·gorge26)가 `story_enemy.gd`까지 한 번도 안
넘어와 있었다.

**웹판 공식을 되살렸다.** `side.js spawnEnemy()`/`spawnBoss()`가 실제로
쓰는 lv 기반 공식 — `hp=round(18*1.22^(lv-1))`·`dmg=round(4+lv*1.6)`
(E_HP/E_DMG=1 기본값 그대로) — 를 `story_combat.gd`에 `enemy_base_hp(lv)`
/`enemy_base_dmg(lv)`로 들였다. lv=1을 넣으면 이 슬라이스가 처음 옮겼던
고정값(18/6)과 정확히 같다(그 고정값의 출처가 이 공식의 lv=1 케이스).
`roll_gold`/`enemy_exp`도 지금까지 field(lv1) 고정이던 것을 lv 인자로
바꿔, forest/cave/gorge 킬이 이제 그 사냥터 lv 기준 보상을 준다.

**잡졸 종류 — data-enemy.js에서 그대로 골랐다(새로 안 지어냄).**
field=황건적(#c9a83a, 이미 있던 값과 우연히 같아 무변화), forest=오랑캐
궁수(#7a6a4a, 보스 오랑캐 족장과 같은 세력), cave=위군 창병(#3a4a6a,
보스 위군 도독과 같은 위나라 계열), gorge=철갑 중장병(#6a6a7a, 보스
적국 대장군이 특정 세력이 아니라 tier4 첫 항목을 그대로 씀).

**작은 발견 하나(같이 바로잡음)** — 보스도 지금까지 `story_enemy.gd`의
하드코딩된 색 하나(황건 두목 `#c9a83a`)를 넷 다 뒤집어쓰고 있었다.
`data-enemy.js BOSSES`의 실제 색은 잡졸과 다른데(field만 우연히 같다),
그 차이가 하나도 안 살아 있었다 — 이번에 `boss_color()`를 새로 추가해
바로잡았다: forest 오랑캐 족장 `#7a5a2a`, cave 위군 도독 `#31609f`,
gorge 적국 대장군 `#7a2a3a`.

- `story_combat.gd`: `ENEMY_HP`/`ENEMY_DMG`(죽은 lv=1 고정값) 제거 →
  `enemy_base_hp(lv)`/`enemy_base_dmg(lv)` 신규. `roll_gold`/`enemy_exp`가
  `lv` 인자를 받게 바뀜(죽은 `ENEMY_LV` 상수 제거).
- `{field,forest,cave,gorge}_map.gd`: `ENEMY_LV`/`ENEMY_NAME`/
  `ENEMY_COLOR`/`BOSS_COLOR` 상수 + `enemy_lv()`/`enemy_color()`/
  `boss_color()` 신규(`boss_position_m()`과 같은 자리).
- `story_enemy.gd`: `enemy_lv`/`enemy_color` export성 변수 신규(기본값은
  field). hp·dmg가 이제 lv 공식을 쓰고, 몸 색도 맵이 넘긴 값. `_die()`가
  `roll_gold`/`enemy_exp`에 `enemy_lv`를 넘긴다.
- `story_enemy_spawner.gd`/`story_boss_spawner.gd`: 스폰 직전 `enemy_lv`
  (둘 다)·`enemy_color`(전자는 `map.enemy_color()`, 후자는 `_map.
  boss_color()`)를 얹는다.

**검증(헤드리스, 값 자체까지)** — import 확인(texture-a.png.import만
재발생, 되돌림) → `project.godot`/`*.import` diff 없음 → 열세 씬 세 번
연속 exit 0·로그 완전 동일(다섯 판 회귀 포함). **임시 디버그**(스폰
직후 print 한 줄씩, `story_field.gd` `_ready()`에 보상 공식 확인용
루프)로 네 사냥터 각각 실제 적용값 확인 — 잡졸 hp(18/49/239/2596)·보스
hp(216/686/4063/51920)가 `enemy_base_hp(lv)*hp_mul`과 정확히 일치, 잡졸·
보스 색이 맵별로 서로 다르고(field만 같음) hex 원문과 일치, exp
(그런트 10/30/62/110·보스 150/450/930/1650)가 lv 공식과 정확히 일치,
금은 기대 범위 안(±변동)까지 확인. 디버그 원상복구 — `story_field.gd`는
git diff 0(추가·제거가 정확히 상쇄), 나머지 넷은 print 한 줄만 제거.
재검증(3회 반복, exit 0·로그 동일·project.godot/.import diff 없음)까지
마쳤다.

**GUI 실기 확인은 아직 안 함** — 사냥터를 걸어 넘나들 때 잡졸이 실제로
다른 색으로 보이는지, 호로곡의 철갑 중장병이 훨씬 세게(hp 2596!) 느껴
지는지는 눈으로 볼 것. 계속 몰아서 받을 것.

**다음 이어질 것** — 2~4차 전직(job 체인 재설계 필요, 24절부터 계속
미뤄 둔 항목). 몬스터 종류를 tier당 하나 이상(원작처럼 풀에서 무작위
고르기)으로 늘리는 건 이 절의 범위 밖(사냥터당 하나로 좁혔다) — 원하면
별도로 볼 자리.

## 27. 2~4차 전직 — job 체인 재설계 (2026-09-13)

**사용자 지시 "saga-godot 이어해 묻지말고"** — 21절부터 "2~4차 전직(job
체인 재설계 필요)"으로 계속 미뤄 둔 마지막 큰 후보를 채웠다. 21절이
남긴 경고 그대로였다: `job`이 "한 번 정하면 안 바뀐다"는 전제로 tier1
넷뿐이었고, `story_player.gd`에 `StorySaveState.job == "warrior"` 식
정확 일치 분기가 열 곳(guard_mul·regen_mul·입력 배선 넷×4·`_effective_
atk()` 넷)이나 있어, 그대로 두고 `job`을 `"general"`처럼 새 문자열로
덮어썼다면 그 열 곳이 전부 조용히 안 걸려 무사 무예 넷(입력까지)이
통째로 죽었을 것이다.

**설계 — data-job.js의 실제 구조를 그대로 옮겼다.** JOBS는 갈래마다
(무사→장군→원수→전신 등) `from`으로 이어지는 사슬 넷(서로 안 섞인다)
이다. `job` 자체는 여전히 문자열 하나뿐(원작 `job.js join()`도 그냥
덮어쓴다, 재설계는 저장 방식이 아니라 **읽는 쪽**이다) — 대신
`story_combat.gd`에 `JOB_FROM`(사슬)·`JOB_TIER`·`JOB_LEVEL_NEED`·
`JOBS_TIER2/3/4`(data-job.js grow 그대로)·`JOB_SKILL_LEVEL_GATE`(tier
2/3/4 진급에 필요한 하위 무예 레벨 5/8/10)를 데이터로 들이고,
`job_chain(key)`(사슬 훑기)·`job_grow_chain(key)`(사슬 전체 grow 합,
data-job.js `grow()`의 chain-sum 그대로)·`job_next(key)`(다음 자리,
갈래가 안 갈리므로 항상 최대 하나) 함수를 추가했다.

**`story_player.gd`의 열 곳을 전부 사슬 소속 검사로 바꿨다** —
`StorySaveState.job == "warrior"` → `StoryCombat.job_chain(StorySaveState.
job).has("warrior")`. 이러면 장군으로 전직해도 사슬에 "warrior"가
그대로 남아 있어(`["general","warrior"]`) 무사 무예 넷·철갑 버프·
`_effective_atk()` 배율이 전부 그대로 유지된다 — data-job.js
`skillsOf()`의 "전직해도 하위 무예를 잃지 않는다"는 누적 정신 그대로.

**`story_save_state.gd`**: `job_grow()`가 이제 `job_grow_chain()`을
호출(사슬 합산 — tier1만 있던 캐릭터는 사슬이 자기 하나뿐이라 값이
안 바뀐다, 회귀 안전). `can_raise_skill()`도 `job == 그 무예의 job`
정확 일치 대신 `job_chain(job).has(그 무예의 job)`으로 바꿔, 전직 후에도
하위 무예에 계속 SP를 투자할 수 있다. 신규 `can_advance_job(key)`/
`advance_job(key)` — job.js `canJoin()`/`join()` 그대로(사슬상 바로
아래 자리인지·레벨 문턱·하위 무예 레벨 게이트 셋 다 확인).

**tier2까지만 실제로 열린다 — 정직한 제약.** `JOB_SKILL_KEYS`에 아직
tier2+ 무예가 없어(6개씩×3단×4갈래=72개는 이번 걸음 밖), tier3 진급
조건("하위(tier2) 무예 하나가 Lv.8 이상")을 채울 무예 자체가 없다 —
거짓으로 막은 게 아니라 데이터가 없어 자연히 안 열린다. tier2 무예가
생기기 전까지는 정확히 이 상태로 남는다.

**`story_job_trainer.gd`**: 새 입력 액션 `story_job_advance`(P) 신규 —
SP 투자(숫자 1~4)와 겹치지 않는 별도 키(진급은 "되돌릴 수 없다"는
무거운 결정이라 자동 선택 없이 직접 누르게). 갈래가 안 갈리므로
`job_next()`가 항상 최대 하나만 준다 — "어느 걸 고를지" UI가 필요
없다. 상태 문구에 다음 자리 이름·진급 가능 여부(레벨/무예 레벨 부족
안내 포함)를 추가.

- `project.godot`: `story_job_advance` 입력 액션(P, physical_keycode 80)
  신규 — 프로젝트 전체에서 안 쓰던 키 확인 후 골랐다.
- `story_combat.gd`: `JOB_FROM`/`JOB_TIER`/`JOB_LEVEL_NEED`/
  `JOBS_TIER2`/`JOBS_TIER3`/`JOBS_TIER4`/`JOB_SKILL_LEVEL_GATE` 신규,
  `job_tier`/`job_info`/`job_chain`/`job_grow_chain`/`job_prereq`/
  `job_level_need`/`job_advance_skill_gate`/`job_next` 신규.
- `story_save_state.gd`: `job_grow()` 재구현(chain-sum), `can_raise_skill()`
  사슬 검사로 변경, `can_advance_job()`/`advance_job()` 신규.
- `story_player.gd`: `job ==` 정확 일치 열 곳을 `job_chain(...).has(...)`
  로 교체(guard_mul·regen_mul·입력 배선·`_effective_atk()`).
- `story_job_trainer.gd`: `job_info()` 사용으로 이름 조회 일반화, 진급
  입력·`_advance()` 신규, 상태 문구에 다음 자리 안내 추가.

**검증(헤드리스, 값 자체까지)** — import 확인(texture-a.png.import만
재발생, 되돌림) → `project.godot` diff가 의도한 입력 액션 한 줄만인지
확인(에디터가 값을 안 지웠다) → 열세 씬 세 번 연속 exit 0·로그 완전
동일(다섯 판 회귀 포함). **임시 디버그**(`story_field.gd` `_ready()`에
잠깐 추가)로 실제 진급 흐름 확인: 무사(job="warrior")·Lv25·w_cut
Lv5 상태에서 `job_chain("warrior")=["warrior"]`·`job_grow()`=hp40/
atk2/mp0 확인 → `can_advance_job("general")`=true → `advance_job`
성공 → `job_chain("general")=["general","warrior"]`(사슬 유지 확인)
→ `job_grow()`=hp150(110+40)/atk9(7+2)/mp0(사슬 합산 정확) →
`can_raise_skill("w_cut")`=true(전직 후에도 하위 무예 투자 가능
확인) → `can_advance_job("marshal")`=false(Lv25<45, 레벨 게이트 확인)
→ Lv50으로 올려도 general 무예가 아직 없어 여전히 false(tier3가
정직하게 막혀 있음 확인) — 전부 예측과 정확히 일치. 디버그
원상복구(`story_field.gd` diff 0). 재검증(3회 반복, exit 0·로그
동일·import diff 없음)까지 마쳤다.

**GUI 실기 확인은 아직 안 함** — 허도에서 P키로 실제 승급하는 손맛,
승급 후에도 무사 무예 넷이 여전히 눌리는지는 눈으로 볼 것. 계속
몰아서 받을 것.

**다음 이어질 것** — tier2 무예(6개씩×4갈래=24개, 장군·신궁·자객·도사)를
채우면 tier3 진급 문이 자연히 열린다. STORY 판의 "굵직한 후보"는
21절부터 이어 온 순서(사명 확장→상점→나머지 사냥터→전직 트리→몬스터
도감→마을 배경→2~4차 전직)가 이걸로 전부 최소 한 걸음씩 완료됐다 —
다음은 tier2 무예 확장이거나 STORY 밖(다른 판, GO/DUNGEON/FOREST/
REALM)으로 옮겨 갈 자리.

## FINAL RULE (이 문서에도 동일 적용)

PLAN.md의 그 규칙 그대로 — 한 번에 다 만들지 않는다. Legacy Audit →
Architecture(이미 공용) → 이 설계 → Phase 1(프로젝트 폴더 생성)까지만
먼저 하고, 그 뒤는 "현재 Step 확인 → 그 Step만 실행 → 검증 → 상태
기록 → 다음 Step"으로 이어간다.
