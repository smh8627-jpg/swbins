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

## FINAL RULE (이 문서에도 동일 적용)

PLAN.md의 그 규칙 그대로 — 한 번에 다 만들지 않는다. Legacy Audit →
Architecture(이미 공용) → 이 설계 → Phase 1(프로젝트 폴더 생성)까지만
먼저 하고, 그 뒤는 "현재 Step 확인 → 그 Step만 실행 → 검증 → 상태
기록 → 다음 Step"으로 이어간다.
