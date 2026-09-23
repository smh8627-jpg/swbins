# 사가 엔진 — 코드 없이 3D 게임 만들기

`run-engine.bat` → <http://127.0.0.1:8801/> (로컬 전용, 게임 서버 아님). 도구 허브 `../run-tools.bat` 도 같이 켠다.

다섯 판(사가고 …)과 **코드를 나누지 않는** 별도 엔진이다. 게임 하나 = `projects/<id>/project.json` 하나.
편집기와 실행기가 같은 규칙(`runtime/sim.js` …)을 쓰고, 내보낸 판도 같은 파일로 돈다.

## 파일

| 파일 | 하는 일 |
|---|---|
| `runtime/sim.js` | 규칙 핵심 — 장면·개체·몸(충돌)·컴포넌트·이벤트·변수·이동 기술·공용 메뉴·세이브. three 없이 돈다(node 진단) |
| `runtime/combat.js` | 전투 스타일 넷 + 스킬 9갈래 + 적 옵션(원거리·원소 방패·기세·광폭·도망·노획물) |
| `runtime/systems.js` | saga-godot 범용 시스템(아래 표) — 컴포넌트·행동·이벤트를 표에 등록 |
| `runtime/view.js` | three.js 그리기 공용(환경·도형·모델 키 맞추기·몸짓·툰/외곽선) |
| `runtime/play.js` · `play-combat.js` · `play-systems.js` | 실행기 — 입력·시점·HUD·소리·터치 / 전투 화면 / 시스템 화면·저장 |
| `editor/` | 편집기(3D 화면·기즈모·개체 목록·속성 칸·에셋 서랍·설정·▶ 실행·📦 내보내기) |
| `server.js` | 저장(검사·실명 가드·md5 충돌) · 다섯 판 GLB 라이브러리 목록 · 모델 올리기 · 내보내기 |
| `templates/` | 예제 틀 여섯 — `make-templates.mjs` 로 짓는다(JSON 을 직접 고치지 말고 여기를 고쳐 다시 돌린다) |
| `test/run.mjs` · `test/dom.mjs` | 진단(아래) |

## 데이터 모양(project.json)

```
{ format:'saga-engine', version:1, id, title, desc, start:<장면 id>,
  vars:{ 이름: 처음 값 }, hud:[{var,label,style:'hearts'?}], goals:[3줄, {변수}],
  combat:{ style:'simple|genshin|zelda|ff', atk, hpMax, potionHeal, mpMax, mpRegen, skillCd, party:[…], skills:[…] },
  world:{ clock:'off|game|real', dayMin, start, seasonDays, weather:'auto|…', season:'auto|…' },
  graphics:{ toon, outline }, feel:false?, level:{ expVar, lvVar, base, atk, hpVar, hp }, quests:[…],
  scenes:[{ id, name, env:{sky,fog,light,gravity,ground:{size,color}}, camera:{mode:'first|follow|top|side|fixed', dist, height, yaw, switch},
            entities:[{ id, name, tag, pos, rot(도), scale, off, hidden, once,
                        look:{shape, color, glow, label, model:'lib:<판>/<assets 아래>'|'proj:<파일>', fit(키 m), yaw, anim},
                        body:{type:'none|solid|trigger|dynamic', size, off}, comps:{…}, events:[…] }],
            events:[{ when:{on,…}, if:[{var,op,value}], do:[{do,…}], once }] }] }
```

- 개체 `pos` 는 **발밑 가운데**, 1 = 1m. 몸(충돌)은 AABB — 개체 크기만 따르고 모델 겉모습(`look.fit`)과는 따로다.
- 컴포넌트·행동·이벤트 칸의 목록과 설명은 코드 표가 정본이다: `sim.js` `COMP`·`WHEN`·`DO`, `systems.js`·`combat.js` 의 `addComp`·`addDo`·`addWhen`. 편집기 칸도 거기서 만든다.
- 고르개(이벤트 대상): `player` · `self` · `other` · `#태그` · 개체 id · `any`.

## 전투 스타일

| 스타일 | 조작 | 규칙 |
|---|---|---|
| 간단 | J·클릭 3연타 · Z X C R 스킬 · H 포션 | 닿으면 아픔(`hurt`), 전투 적(`foe`) 예고 공격 |
| 원신식 | E 원소 스킬 · Q 원소 폭발(에너지 60) · Shift 대시(스태미나 20, 누르고 있으면 달리기) · 1~4 파티 교체 | 원소 반응 — 증발·녹음(2배) · 빙결 · 과부하(폭발) · 감전(지속) · 초전도(방어 깎기) · 확산(바람) · 원소 방패 |
| 젤다식 | Q·Tab 주목 · Shift 방패(막 내밀면 **저스트 가드** → 적 경직) · 주목 중 Space 회피(직전이면 **저스트 회피 러시**) · J 모았다 떼면 회전 베기 | 하트 체력 |
| 파판식 | 필드에서 전투 적에 닿으면 ATB 전투 · ↑↓ Enter · X 취소 | 기다림 방식 ATB · 공격/마법/방어/아이템/도망 · 약점(불↔얼음, 물↔번개) · 레벨 업 |

## 시점

장면 `camera.mode`: 1인칭(화면 누르면 마우스 잠금) · 3인칭(끌어서 돌리기, 주목 중엔 적과 함께) · 쿼터뷰 · 옆(2.5D) · 고정. `switch` 가 false 가 아니면 실행 중 **V** 로 1인칭 → 3인칭 → 쿼터뷰.

## saga-godot 시스템 → 엔진

| saga-godot | 엔진 |
|---|---|
| `go_player.gd`(달리기·활공·등반·넘어오르기·수영·코요테 0.1s·점프 버퍼 0.12s·스태미나) | 플레이어 컴포넌트 `sprint·glide·climb·stamina`, 물 컴포넌트 `water` |
| `combat_feel.gd`(히트스톱·흔들림·피격 플래시·숫자 팝) | 실행기(프로젝트 `feel` 로 끔) |
| `time_of_day.gd`·`weather.gd`(3시간 슬롯 결정적, 경험치 보정)·`season.gd`(날씨 가중) | `world` — 변수 `hour·day·night·weather·season`, 하늘·빛·안개·비/눈·계절 땅색, 이벤트 "시각이 되었을 때" |
| `treasure_chest.gd`(등급 넷 × 잠금 셋) | 컴포넌트 `chest`·`torch` |
| gatherable·fishing_spot·forest_planting·vendor/merchant | `gather`·`fishing`(타이밍 막대)·`plot`·`shop` |
| `perks.gd`(공·수·보 12종, 축마다 하나) · choice_prompt · duel_rules · persuade/quiz | 행동 `perk`·`choice`·`duel`·`quiz` |
| `quest_state.gd`·`codex_state.gd`·`goal_board.gd`·`session_card.gd`·`save_state.gd` | 프로젝트 `quests`·컴포넌트 `codex`(B 로 보기)·`goals`·끝 화면 요약·자동 저장/이어하기(localStorage) |
| `beacon_tower.gd`·companion_follow·관계 하트·`density_report.gd` | `waypoint`(M 으로 이동)·`follow`·`bond`·편집기 검사 탭 "발견 밀도" |
| field_spawner·horde(난입 파도)·world boss·기세 스태거·원소 쓰는 적·노획물 등급 | `spawner`(파도)·`foe` 의 `flee·enrage·poise·shield·ranged·drops` |
| DUNGEON·STORY 무예(bolt·nova·whirl·dash·heal·buff·chain·curse·summon)·MP·포션 벨트 | `combat.skills`(Z X C R)·`mpMax/mpRegen`·H 포션 |
| `cel_toon.gdshader`(툰+외곽선)·camera_near_fade·photo_mode | `graphics.toon/outline` · 가리는 것 반투명 · P 사진 모드 |

**안 옮긴 것**(장르 자체이거나 판 콘텐츠): 사가국지 경영·전쟁·외교·계승 · 사가블로 룬워드/소켓/세트 장비 체계·부적 던전 · 사가의숲 구면 투영·가구 배치 · 사가고 인물 설득 3라운드의 판 전용 수치 · 인물 105명 도감·VRoid 몸. 필요하면 컴포넌트·행동으로 하나씩 더한다(`addComp`·`addDo`).

## 내보내기

📦 → `dist/<id>/`(gitignore). `index.html` 에 프로젝트가 박혀 있고 쓴 모델만 복사된다(`CREDITS.txt` 에 출처 문서 위치).
모델이 든 판은 `file://` 로 바로 열면 브라우저가 모델 받기를 막는다 — 정적 서버·GitHub Pages 로 연다.

## 진단

```
node saga-web/tools/engine/test/run.mjs                     # 규칙·틀(검사·결정성)·서버 API·내보내기 → RESULT n/n
JSDOM_DIR=<jsdom 설치 폴더> node saga-web/tools/engine/test/dom.mjs   # 편집기·실행기(틀 여섯)·내보낸 판을 jsdom 에서 → RESULT n/n
```

`dom.mjs` 는 WebGL 을 가짜로 바꿔 스크립트 오류·HUD·입력만 본다. **실제 그림·손맛은 사람이 브라우저에서 확인한다.**
