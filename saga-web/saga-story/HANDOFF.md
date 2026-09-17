# 사가스토리 HANDOFF — 세션 이력 (append-only)

이 판의 날짜 달린 세션 기록만 여기 쌓는다. 설계 정본은 `PLAN.md`, 지금 상태는 `README.md`, 저장소 전체는 `../../SAGA-HANDOFF.md`.
**통째로 읽지 않는다** — `grep -n "^## \|^### "` 로 목차를 뽑고 날짜·키워드로 grep 해 그 절만 `sed -n` 으로 읽는다.
2026-09-16 이전의 세션별 이력은 `README.md` 하단(2026-08-25 ~ 2026-09-11 절들)과 `../../SAGA-HANDOFF.md` 의 사가스토리 항목에 있다.

## PLAN.md 에서 옮겨 온 기록 (2026-09-16, 한 글자도 바꾸지 않았다)

# 6-1. 오버월드 — 마을에서 나가 다른 마을로 + 전체지도 (2026-09-01, 사용자 요청)

사가블로(`../saga-dungeon/PLAN.md` 28-1절)에 적은 것과 같은 방향이다: "던전을
통해 가는 게 아니라 마을 통해서 입구를 나가서 가는 거임, 다른 마을도 가고
다른 지역이라는 개념." 이 판(메이플스토리식)은 원작부터가 **마을↔필드↔마을을
포탈로 잇는 구조**라 이 개념이 가장 자연스럽게 들어맞는 판이다.

- 5절이 이미 "시작 마을 + 초원 + 숲 + 폐허 + 동굴"을 구역으로 나눠 뒀다 — 이걸
  각자 독립된 마을이 아니라 **하나의 사냥터 지역**으로 볼지, 마을을 여럿 두고
  그 사이를 필드로 연결할지는 아직 정하지 않았다.
- 디아블로 M키처럼 **미니맵을 펼쳐 보는 전체 지도**도 같이 필요하다 — 지금까지
  밟은 사냥터/마을이 오버월드의 어디에 있는지 한눈에 보여주는 것.

**착수함(2026-09-02).** 사용자가 "마을을 여러 개로 늘려 각 구역 초입에 배치"를
골랐다. 삼국지 실제 지명으로 마을 다섯을 새로 넣고 기존 사냥터 넷 사이에
끼워 넣었다(`js/data-side.js` STAGES) —

```
신야성(시작) → 허도 → 허창 들판 → 강릉진 → 오림 숲
             → 남정성 → 한중 굴혈 → 기산채 → 호로곡
```

- 마을은 `town:true` 만 붙은 사냥터 항목이다 — 옆으로 걷기·문(포탈)·발판 엔진은
  그대로 쓰고 `spawn:0`·보스 없음으로 전투만 뺐다(따로 엔진을 새로 만들지 않았다).
  각 마을의 `need` 는 그 마을이 지키는 사냥터와 같아 레벨 문턱이 그대로 이어진다.
- 새 세이브 기본 위치를 `field` 에서 `sinya`(신야성)로 바꿨다(`js/side.js`).
  기존 세이브는 이미 있던 스테이지 키(field/forest/cave/gorge)를 그대로 쓰므로
  깨지지 않는다.
- `js/ui.js`에 **M키(데스크톱) + 상단 도구줄 🗺️ 버튼(모바일) + 사냥터 시트 안
  "🗺️ 전체 지도" 단추**로 여는 오버월드 전체 지도(`#owmap`, `openOverworldMap`)를
  새로 넣었다. 9칸(마을 5 + 사냥터 4)을 사슬로 그리고 지금 있는 곳을 금빛으로,
  잠긴 곳은 흐리게 보여 준다 — 읽기 전용(이동 버튼 없음).
  `viewField()`의 던전-게임 `viewWorldMap()`류와 겹치는 이름은 없다(이 판엔
  애초에 그 개념이 없었다).
- 자가진단(`_test.html`)도 새 구조에 맞춰 고쳤다: 문 하나짜리 이동 검증은
  '들판→강릉진'으로, 넷째 계단 검사는 `town:true` 를 뺀 사냥터 넷만 보게,
  기존 '굴혈→호로곡' 단발 사슬 검사는 '신야성→…→호로곡' 전체 9칸 사슬을
  한 칸씩 걸어보는 항목으로 넓혔다. 헤드리스 3회 106/106 동일.


## 2026-09-17 — SAGA-DESIGN §8-3 세이브 마이그레이션 지뢰 제거 (다섯 판 공통, saga-go 세션에서 발견)

`js/core.js`의 `load()`가 `parsed.v !== 1`이면 무조건 세이브를 버리는 하드 체크였다 — 사가고
그래픽 작업 중 이 판이 다섯 벌 복사본이라는 걸 확인차 훑다가 다섯 판 전부 같은 코드임을 발견했다.
`SAVE_VERSION`·`MIGRATIONS`·`migrate()`(순수 함수)를 추가해 버전이 안 맞아도 지우지 않고
`mergeDeep(freshSave(), ...)`로 넘기게 고쳤다(자세한 설계 이유는 `saga-web/saga-go/HANDOFF.md`
2026-09-17 절 참고 — 다섯 벌이 동일 로직이라 설명을 안 되풀이한다). `sw.js` VERSION 도 같이 올렸다.

## 2026-09-17 — SAGA-DESIGN §6.1 툰 재질(외곽선 제외) + §8-6 후처리 자동 끔

사가고→사가블로에 이어 "이어해줘 묻지말고"로 이 판까지. 세이브 마이그레이션 지뢰(core.js
`parsed.v !== 1` 하드 체크)는 다섯 판 공통이라 이미 별도 커밋으로 먼저 고쳤다(자세한 설계는
`saga-go/HANDOFF.md` 2026-09-17 절).

**새 파일 `js/toon3d.js`** — 3단 램프 `MeshToonMaterial`(다른 판과 같은 규격). 이 판은
`side-view3d.js`가 하늘·바닥·소품·배우 재질을 **곳곳에서 낱개로** `new Tc.MeshLambertMaterial({...})`
로 만든다(공용 캐시 함수가 없다) — 그래서 사가고식 outline 시스템 대신, `side-view3d.js`
맨 위에 `LM(opts)`(같은 옵션 객체를 받아 손잡이 보고 Toon/Lambert 를 고르는 대역 함수)를
추가하고 파일 안 19곳의 `new Tc.MeshLambertMaterial(` 를 전부 `LM(` 로 기계적으로 치환했다
(옵션 객체 리터럴은 손 안 댐 — 생성자 이름만 대역). **외곽선은 뺐다** — choke point 가
없는 파일 구조라 소품마다 잘못 붙을 위험을 무릅쓰지 않았다.

**`js/asset3d.js`** — `delam()`이 손잡이 보고 `toon3d.toonify()`로 벗긴다(다른 판과 동일).

**`js/post3d.js`** — 사가고·사가블로와 동일한 처방: `draw()`→`drawInner`+try/catch, 실패
시 `ready=false`·`failed=true`로 후처리 영구 끔 + (`DG.errlog` 있으면) 기록.

**`index.html`·`_demo.html`** — `toon3d.js`를 `asset3d.js` 앞에 얹었다. **`sw.js`는 안
건드렸다** — 확인해보니 이 판의 `SHELL`(오프라인 캐시 목록)엔 애초에 `asset3d.js`·
`side-view3d.js`·`post3d.js`가 없었다(3D 레이어는 SW 프리캐시 대상이 아닌 게 이 판의
기존 방침으로 보인다) — 없는 목록에 새 파일만 끼워 넣는 건 일관성이 안 맞아 그대로 뒀다.

**검증** — `node -c` 전 파일 통과, 두 HTML 인라인 스크립트 `new Function()` 파싱 확인,
`bash tools/precheck.sh saga-web/saga-story` → PRECHECK OK. `_test.html`은 애초에
`side-view3d.js`/`asset3d.js`를 안 실어(순수 함수만 별도로 검증하는 구조) 이번 손질과
무관 — 헤드리스 3회 확인도 이번엔 안 돌렸다(사용자 실기 확인 몫, 다른 판과 같은 이유).

**남은 것** — 외곽선, mood 별 24색 팔레트 스냅(`sky`/`forest`/`cave`/`fire` 넷), 변형 배가,
오류 링버퍼 — 전부 PLAN §6·§7 에 남겨 뒀다.

## 2026-09-17 — SAGA-DESIGN §8-2 오류 링버퍼 (다섯 판 공통, saga-go 규격 그대로)

넷째. 새 `js/errlog.js`(storageKey `yeoksa-side/errlog`, `index.html`/`_admin.html`/
`_test.html` 맨 첫 스크립트). `_admin.html`에 "오류" 탭(QA 프리셋과 점검·백업 사이) —
`js/admin.js`의 `renderAll()`에 `renderErr()` 추가, `bind()`에 다시 읽기·복사·비우기 버튼
배선. `_test.html`에 순수 함수 `push()` 상한 진단 1항목. `sw.js` `SHELL`에 `errlog.js`
추가, `VERSION` `side-v0.46.8` → `side-v0.47.0`.

**검증** — `node -c` 통과, `bash tools/precheck.sh saga-web/saga-story` → PRECHECK OK.

## 2026-09-17 — asset3d.js를 _test.html에 얹고 mapClips 진단 추가

사가국지 3D 진단 공백을 메꾸다가 이 판도 `_test.html`이 `asset3d.js`(GLB 클립 이름
매칭 `mapClips()` 등)를 아예 안 실어 진단 0항목이던 것을 발견해 메꿨다. `index.html`과
같은 순서로 `side-view.js` 뒤·`gear.js` 앞에 `vendor/three.iife.js`·`toon3d.js`·
`asset3d.js`만 추가했다(`portrait3d.js`·`ssao3d.js`·`post3d.js`·`side-view3d.js`는
`mapClips` 진단에 필요 없어 안 얹음 — `game.js`의 `global.DG.sideView3d` 참조는 전부
`if (global.DG.sideView3d)`로 존재 확인 뒤 부르므로 안 얹어도 안전).

새 진단 1항목: `mapClips` — 사가고·사가의숲과 같은 표로 검증(뒤섞인 클립 이름 4개가
제자리를 찾는지, 빈 목록이 빈 표인지).

**검증** — `node -c` 대상 없음(html 자체 편집), `bash tools/precheck.sh
saga-web/saga-story` → PRECHECK OK. `sw.js` 버전 안 건드림(`_test.html`은 SHELL 목록
밖). 헤드리스 3회 확인은 이번에도 안 돌렸다(사용자 실기 확인 몫) — 대신 `asset3d.js`
모듈 최상위에 THREE·DOM 의존 부작용이 없는지(전부 함수 안에서만 `three()`를 늦게
부른다) 코드로 확인했다.
