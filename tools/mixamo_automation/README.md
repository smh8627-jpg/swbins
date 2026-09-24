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

### 캐릭터 바꾸기·몸체 받기·제자리 클립 (2026-09-24 추가)

```bash
# 현재 캐릭터를 바꾸고(카드 이름 정확히) T-pose 몸체를 받는다 — 리깅용 원본(saga-unity 는 이것을 몸체로 쓴다)
node fetch.mjs --character "Paladin W/Prop J Nordstrom" --tpose --out Paladin --dest <경로>
# 같은 캐릭터로 클립(스킨 없이). 걷기·달리기는 --inplace 로 Mixamo "In Place" 를 켠다
node fetch.mjs --character "Paladin W/Prop J Nordstrom" --query "Sword And Shield Walk" \
  --match "Sword And Shield Walk" --out "Paladin@Walking" --dest <경로> --inplace
```

- 카드 이름을 모르면 `node list-characters.mjs goblin mutant` — 검색어마다 카드 이름을 한 줄로 찍는다(FOREST 짐승 몸을 이렇게 골랐다).
- `--character` 는 Mixamo 계정의 "현재 캐릭터"를 바꾼다(다음 실행에도 남는다). 이미 그 캐릭터면 건너뛰니 **클립마다 붙여 부르는 게 안전**하다.
- `--tpose` 는 오른쪽 패널 DOWNLOAD → 모달 기본값(FBX Binary · T-pose). 파일은 캐릭터 이름으로 내려온다(`Paladin WProp J Nordstrom.fbx`).
- `--inplace` 는 "In Place" 설정이 없는 클립(제자리 동작)에 주면 실패로 끝난다.
- `--nth N`(0부터)은 같은 설명 문구 카드가 여럿일 때 고른다. **검색어에 따라 순서가 바뀐다** — `Sword And Shield Unblocked Impact` 는 검색어 `Sword And Shield Unblocked Impact` 로는 첫째가 쭈그린 판(파일 Crouching)이었고, `Shield Impact` 로는 첫째가 선 판(파일 Sword And Shield Impact)이었다. 받은 뒤 클립 길이·`RootT.y`(선 자세 ≈0.86)로 확인한다.

`--match`는 Mixamo 카드의 "Description:" 뒤 문구와 **정확히** 일치해야
한다(같은 이름이 여러 개라 구분용). `--list`로 먼저 후보 인덱스·설명을
확인하고, 미리보기가 "자연스러운지"는 결국 사람(또는 스크린샷을 보는
Claude)이 한 번 판단해야 한다 — Mixamo 검색 결과 자체가 매번 같은 순서로
나오는 게 보장이라 한 번 확정한 `--match` 문구는 이후 재현 가능하다.

## 검증된 레시피 (query → match)

| 프로젝트 | 용도 | query | match | 확인일 |
|---|---|---|---|---|
| saga-godot | GO/FOREST/DUNGEON 플레이어 idle | `Idle` | `Standing Idle` | 2026-09-21 |
| saga-unity | 능묘 파수꾼(`Skeletonzombie T Avelange`) idle·walk(inplace)·attack·hit·death | `Zombie Idle`·`Zombie Walking`·`Zombie Attack`·`Zombie Reaction Hit`·`Zombie Death` | `Zombie Standing Idle`·`Zombie Walking`·`Zombie Swipe Attack`·`Zombie Reaction Hit Flinches`·`Zombie Getting Hit And Falling Onto Back` | 2026-09-24 |
| saga-unity | 동행 무사(`Paladin W/Prop J Nordstrom`) idle·walk/run(inplace)·attack | 각 match 와 같은 문구 | `Sword And Shield Idle`·`Sword And Shield Walk`·`Sword And Shield Run`·`Sword And Shield High Attack`(query `Sword And Shield Slash`) | 2026-09-24 |
| saga-unity | 마을 사람 idle(`Peasant Girl`·`Peasant Man`) | `Idle` | `Happy Idle Variation 1` · `Weight Shift Idle` | 2026-09-24 |
| saga-unity | Maria(`Maria W/Prop J J Ong`) 등반·활공·수영·물 위 대기·점프(GO 107-2) | `Climbing`(--inplace)·`Falling Idle`·`Swimming`·`Floating`·`Jump` | `Climbing Up A Wall`·`Mid-Air Falling Idle`·`Swimming Underwater`·`Floating`(파일은 Treading Water)·`Jump Up` | 2026-09-24 |
| saga-unity | 동행 무사 전용(106-6, `Paladin W/Prop J Nordstrom`) 도발·피격·도발 중 피격·쓰러짐 | `Sword And Shield Idle To Block`·`Shield Impact`·`Shield Impact`·`Sword And Shield Falling Back Death` | `Sword And Shield Idle To Block`·`Sword And Shield Unblocked Impact`(**--nth 0**, 파일 Sword And Shield Impact)·`Sword And Shield Blocked Impact`(**--nth 0**)·`Sword And Shield Falling Back Death` | 2026-09-24 |
| saga-unity | 동행 술사 전용(106-6, `Peasant Girl`) 걷기·달리기(--inplace)·빛살 시전·치유 시전 | `Female Walk`·`Female Run`·`Spell`·`Spell` | `Female Normal Walk`·`Female Run Forward`·`One Handed Casting Spell Fowards`·`Casting A Ressurection Or Summon Spell` | 2026-09-24 |
| saga-unity | FOREST 짐승 몸(108 후속) — 숲도깨비 `Goblin D Shareyko`·바위도깨비 `Pumpkinhulk L Shaw`·무쇠도깨비 `Warrok W Kurniawan` idle·walk/run(inplace) | `Standing Idle`·`Sneak`·`Mutant Run` / `Mutant Idle`·`Mutant Walking`·`Mutant Run` | Goblin: `Standing Idle Looking Around`·`Male Ninja Sneak Walk`·`Mutant Running` · Hulk: `Mutant Breathing Idle`·`Mutant Brutal Walk`·`Mutant Running` · Warrok: `Mutant Stretching Idle`·`Mutant Brutal Walk`·`Mutant Running` | 2026-09-24 |
| saga-unity | FOREST 짐승 몸 — 포자괴물 `Parasite L Starkie` idle·walk/run(inplace)·포효 · 안개유령 `Nightshade J Friedrich` 떠 있기 · 정령 셋 `Jolleen` idle·walk/run(inplace) | `Zombie Idle`·`Zombie Walking`·`Zombie Running`·`Mutant Roaring` / `Flying` / `Idle`·`Female Walk`·`Female Run` | `Zombie Standing Idle`·`Zombie Walking`·`Zombie Run`·`Mutant Roaring` / `Flying Idle` / `Happy Idle Variation 1`·`Female Normal Walk`·`Female Run Forward` | 2026-09-24 |
| saga-unity | STORY 소환 우레뿔 거수(106-10, `Warrok W Kurniawan`) 내려찍기 | `Mutant Attack` | `Mutant Jump Attack To Idle`(파일 Mutant Jump Attack) | 2026-09-24 |
| saga-unity | STORY 유격(106-10, `Erika Archer With Bow/Arrow`) idle·walk/run(inplace)·쏘기 | `Bow Idle`·`Bow Walk`·`Bow Run`·`Arrow` | `Standing Idle With Bow`·`Walking Forward With Bow`(**--nth 1**, 첫째는 쭈그린 판 Crouch Walk)·`Running Forward With Bow`·`Standing Aim Fire Arrow`(파일 Standing Aim Recoil) | 2026-09-24 |

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
- "In Place" 체크박스는 겉모양 라벨이 덮고 있어 Playwright `check()` 가 30초 타임아웃으로 막힌다 — DOM `click()` 으로 켠다.
- **같은 작업트리의 다른 세션이 `git pull --rebase --autostash` 를 돌리면** 이 폴더의 미커밋 수정이 잠깐 사라졌다 돌아온다 — 그 틈에 돌린 실행은 옛 코드로 돈다(2026-09-24 `--tpose` 가 "사용법" 오류로 끝난 원인). 고쳤으면 바로 커밋한다.
- SPA(해시 라우팅)라 이전 실행이 열어둔 다운로드 모달이 리액트 상태에
  남아있을 수 있다 — 그래서 매 실행마다 `page.reload()`로 완전히 새로
  시작한다.
