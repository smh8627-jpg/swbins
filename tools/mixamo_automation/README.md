# mixamo_automation

Mixamo(Adobe) 애니메이션 클립을 백그라운드로 받는 공용 도구. `saga-godot`·
`saga-unity` 등 Mixamo 원본을 쓰는 어느 프로젝트에서나 `--dest`만 바꿔
재사용한다(`tools/asset-forge`와 같은 "빌드 도구는 공유" 원칙 —
게임 코드 공유 금지와는 별개). `saga-web` 5판은 2D 캔버스라 해당 없음.

## 왜 이렇게 돼 있나

- Mixamo는 로그인해야 다운로드가 되고, 받은 원본은 라이선스상 **재배포
  금지**라 커밋하지 않는다(`saga-godot/.gitignore`의 `assets/_mixamo_src/`·
  `saga-unity/.gitignore`의 `Assets/Art/CharactersRealistic/` 참고). 그래서
  "완전 자동"은 애초에 불가능하고, **로그인만 사람 몫, 그 다음 검색·선택·
  다운로드는 자동화**가 현실적인 선이다.
- 화면 좌표 클릭(마우스 훔치기) 방식도 처음에 써봤지만 포그라운드를 뺏고
  다른 작업을 못 하게 만든다. 그래서 Playwright `connectOverCDP`로 붙어
  DOM 셀렉터로 클릭하는 방식으로 바꿨다 — 창이 최소화돼 있어도, 사용자가
  다른 일을 하는 동안에도 동작한다.
- Chrome은 **기본 프로필**에는 원격 디버깅(`--remote-debugging-port`)을
  거부한다("non-default data directory" 필요). 그래서 사용자의 평소 Chrome
  로그인 정보를 복사해 오지 않고(그건 자격증명을 프로그램으로 건드리는
  일이라 하지 않는다), **자동화 전용 새 프로필**을 만들어 거기서 별도로
  한 번만 로그인해 두는 방식으로 한다.

## 최초 설정(PC당 한 번)

```bash
mkdir -p "$LOCALAPPDATA/swbins-mixamo-automation-profile"   # 경로는 예시, 고정 아님
"/c/Program Files/Google/Chrome/Application/chrome.exe" \
  --remote-debugging-port=9222 --remote-allow-origins=* \
  --user-data-dir="$LOCALAPPDATA\swbins-mixamo-automation-profile" \
  "https://www.mixamo.com" &
```

뜬 창에서 mixamo.com에 **사람이 직접** 로그인한다(Adobe 계정). 이후 이
프로필은 디스크에 남아있으므로, 같은 PC의 다음 세션에서는 Chrome이 안 떠
있으면 위 명령으로 다시 띄우기만 하면 되고 로그인은 유지돼 있다(단, Chrome
프로필의 세션 만료 정책에 따라 가끔 재로그인이 필요할 수 있다).

`curl http://127.0.0.1:9222/json/version` 로 포트가 살아있는지 확인 가능.

## 설치

```bash
cd tools/mixamo_automation
npm install   # playwright-core만 받는다(플레이라이트 자체 브라우저 다운로드 없음 — CDP로 기존 Chrome에 붙기만 함)
```

## 사용

```bash
# 1) 후보를 먼저 본다(어떤 설명 문구가 자연스러운 클립인지는 사람 판단 1회 필요)
node fetch.mjs --query "Idle" --list

# 2) 확정되면 실제로 받는다
node fetch.mjs --query "Idle" --match "Standing Idle" --out idle \
  --dest "C:\swbins\saga-godot\assets\_mixamo_src"

# saga-unity(실사 PBR, 메시까지 그대로 필요하면 --skin "With Skin")
node fetch.mjs --query "Idle" --match "Standing Idle" --out idle \
  --dest "C:\swbins\saga-unity\Assets\Art\CharactersRealistic" --skin "With Skin"
```

`--match`는 Mixamo 카드의 "Description:" 뒤 문구와 **정확히** 일치해야
한다(같은 이름이 여러 개라 구분용). `--list`로 먼저 후보 인덱스·설명을
확인하고, 미리보기가 "자연스러운지"는 결국 사람(또는 스크린샷을 보는
Claude)이 한 번 판단해야 한다 — Mixamo 검색 결과 자체가 매번 같은 순서로
나오는 게 보장이라 한 번 확정한 `--match` 문구는 이후 재현 가능하다.

## 검증된 레시피 (query → match)

| 프로젝트 | 용도 | query | match | 확인일 |
|---|---|---|---|---|
| saga-godot | GO/FOREST/DUNGEON 플레이어 idle | `Idle` | `Standing Idle` | 2026-09-21 |

나머지(walk/run/attack/hit/dodge/death/pickup)는 아직 이 도구로 다시 고른
적 없음 — saga-unity `CharactersRealistic`에서 재사용해 온 기존 클립을
그대로 쓰고 있고(saga-godot `docs/ASSET_GUIDE.md` 2026-09-19), 품질
문제가 보고되면 그때 `--list`로 다시 골라 이 표에 추가한다.

## 알려진 함정

- Mixamo는 항상 같은 파일명(`Idle.fbx` 등)으로 내려주고, `Browser.setDownloadBehavior`로
  경로를 강제하면 동명 파일을 **그 자리에서 덮어쓸 때가 있다**(브라우저
  UI의 "(1)" 자동 리네임을 안 거침) — 그래서 `fetch.mjs`는 새 *파일명*이
  아니라 클릭 시각 이후로 **mtime이 갱신된 파일**을 찾는 방식으로 감지한다.
- 클릭 자체는 성공해도 Mixamo 서버가 FBX를 인코딩하는 데 몇 초~수십 초
  걸린다("Preparing download…") — 타임아웃을 너무 짧게 잡지 않는다(현재
  60초).
- SPA(해시 라우팅)라 이전 실행이 열어둔 다운로드 모달이 리액트 상태에
  남아있을 수 있다 — 그래서 매 실행마다 `page.reload()`로 완전히 새로
  시작한다.
