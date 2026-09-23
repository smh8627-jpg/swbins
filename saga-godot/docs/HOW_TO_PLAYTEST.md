# saga-godot 실기 테스트 방법

이 문서는 **사람이 직접 Godot 에디터를 켜서 손으로 조작해 보는 법**이다.
지금까지 세션들이 해 온 "헤드리스 검증"은 project.godot 파싱·스크립트
문법·수치 계산이 안 깨졌는지만 확인하는 것이고, **화면이 실제로 어떻게
보이는지·조작 손맛이 어떤지는 여전히 사람이 직접 봐야 한다.** 그게 이
문서가 다루는 "실기 테스트"다.

---

## 1. Godot 에디터 준비

이 프로젝트는 `project.godot`의 `config/features`에 `"4.7"`이 적혀 있다 —
**Godot 4.7.x**를 받는다. 설치 프로그램이 아니라 압축 파일 하나면 된다
(관리자 권한 불필요).

1. <https://godotengine.org/download/windows/> 접속
2. **Standard**(Mono 아님 — 이 프로젝트는 C# 안 씀) 64-bit 항목을 받는다
   (`Godot_v4.7.x-stable_win64.exe.zip` 같은 이름)
3. 아무 폴더에나 압축을 푼다 (바탕화면·다운로드 폴더 등 편한 곳)
4. 압축을 풀면 실행 파일이 하나 나온다(`Godot_v4.7.x-stable_win64.exe`) —
   그게 에디터다. 더블클릭하면 바로 뜬다.

**참고 — Claude가 검증용으로 받아 둔 파일이 있을 수도 있다.**
`%TEMP%\godot_editor\` (탐색기 주소창에 `%TEMP%\godot_editor` 입력) 안에
이미 `Godot_v4.7.x-stable_win64.exe`가 있으면 그걸 그냥 써도 된다 — 단,
그 폴더는 임시 폴더라 시스템 정리 시 없어질 수 있다. 없으면 위 1~3번대로
새로 받는다.

---

## 2. 프로젝트 열기

1. 에디터를 실행하면 **프로젝트 관리자(Project Manager)** 창이 뜬다
2. **가져오기(Import)** 버튼 클릭
3. `C:\swbins\saga-godot\project.godot` 파일을 선택
4. 목록에 "SAGA"가 추가되면 더블클릭(또는 **편집** 버튼)해서 연다
5. 처음 열 때는 애셋을 가져오느라(import) 살짝 시간이 걸린다 — 진행바가
   끝날 때까지 기다린다

---

## 3. 실행하기

에디터 좌측 **파일시스템(FileSystem)** 탭에서 원하는 `.tscn` 파일을
더블클릭하면 3D 뷰포트에 그 씬이 열린다. 이 상태에서:

- **F6** (또는 우측 상단의 "현재 씬 실행" 버튼) — **지금 연 씬만** 실행한다.
  게임을 한 판만 골라서 켜고 싶을 때는 이걸 쓴다.
- **F5** (또는 재생▶ 버튼) — `project.godot`에 지정된 **기본 씬**을 실행한다.
  지금 기본 씬은 `games/saga_go/world/TestVillage.tscn`(사가고)이다.

**F6를 쓴다** — 아래 표에서 게임별로 열어야 할 씬을 골라 열고 F6를 누르면 된다.

게임 창을 닫으려면 그 창의 X 버튼을 누르거나, 에디터 쪽 정지(■) 버튼을 누른다.

---

## 4. 게임별로 열 씬

| 게임 | 열 씬 (더블클릭 후 F6) | 비고 |
|---|---|---|
| 사가고 (GO) | `games/saga_go/world/TestVillage.tscn` | |
| 사가블로 (DUNGEON) | `games/saga_dungeon/world/TestRoom.tscn` | |
| 사가의숲 (FOREST) | `games/saga_forest/world/TestVillageForest.tscn` | |
| 사가스토리 (STORY) | `games/saga_story/world/SinyaField.tscn` | 세계 첫 자리(신야성)부터 — 아홉 사냥터를 문으로 이어서 볼 때 |
| 사가스토리 (STORY) | `games/saga_story/world/HeodoField.tscn` | **전직·SP 투자·승급**만 바로 보고 싶을 때 — 전직 트레이너가 이 마을에 있다 |
| 사가스토리 (STORY) | `games/saga_story/world/TestField.tscn` | 최초 슬라이스 자리(허창 들판) — 전투·채집이 다 갖춰져 있고, 이제(2026-09-13) 문으로 허도·강릉진과도 이어진다(단독 테스트방이라는 옛 설명은 정정) |
| 사가국지 (REALM) | `games/saga_realm/world/TestCity.tscn` | |

---

## 5. 공통 조작 (다섯 판 대부분 같다)

| 키 | 동작 |
|---|---|
| W A S D / 방향키 | 이동 |
| Shift | 달리기(`run`) |
| Space | 점프 |
| 마우스 | 화면의 UI 버튼(저장 등) 클릭 |

---

## 6. 게임별 조작

### 사가고 (GO)
| 키 | 동작 |
|---|---|
| J | 들판: 기본 공격 3타(연타) · 사건 결투 중: 빠른 전투(`combat_quick`) |
| K | 들판: 원소 스킬(둘레 4m, 인물마다 쿨 6초) · 결투 중: 필살기(`combat_ult`) |
| Q | 들판: 원소 폭발(기력 100 모이면, 둘레 7m) |
| 1~4 | 인물 교체(나 + 등용한 동료 앞 셋, 인물마다 원소 화·수·뇌 고정) |
| L | 들판: 회피(무적 0.3초, 스태미나 15) · 결투 중: 회피 · 등반 중엔 손 놓기 |
| Space | 점프 · **공중에서 한 번 더 = 활공 펼치기/접기**(발밑 2m 이상일 때) · 등반 중엔 위로 도약(스태미나 15) · 뒤(S)를 누른 채 = 벽 차고 뒤로 |
| Shift | 달리기(스태미나) · 물속에선 빠른 헤엄 |
| 벽으로 계속 밀기 | 절벽·건물 벽에 붙어 **등반**(W=위, A/D=옆). 꼭대기·낮은 턱은 저절로 넘어오른다 |
| 물에 들어가기 | 저절로 **수영**. 스태미나가 다 떨어지면 마지막으로 딛은 땅으로 돌아온다 |

- 캐릭터 옆 초록 고리가 스태미나다(쓰는 중·덜 찼을 때만 보인다, 다 쓰면 빨강 → 30까지 찰 때까지 못 달린다).
- 산은 10~30m 절벽 고원, 강은 깊이 2.5m 로 바뀌었다(2026-09-23). 지도 끝엔 보이지 않는 벽.
- 모바일은 오른쪽 아래 "점프" 버튼(터치 화면에서만 보인다).
- 자동 점검: `SAGA_TRAVERSAL_PROBE=1` 로 TestVillage 를 헤드리스 실행 → `TRAVERSAL_PROBE_DONE fails=0`.
- **들판 전투**(2026-09-23): 마을 서쪽 숲(늑대 3)·동쪽 숲(도적 2)·강 건너 논밭(늑대 2+도적 1)·포구 모래밭·폐허에 적 무리. 가까이 가면 쫓아오고, 덤비기 전에 머리 위 "!" 가 뜬다(그때 L 로 피하기). 적 머리 위 색 점 = 붙은 원소 — 다른 원소 스킬로 치면 반응(화+수 증발 ×1.5, 화+뇌 과부하 광역, 수+뇌 감전 지속). 화면 아래 가운데 초록 = 체력, 노랑 = 폭발 기력, 오른쪽 = 인물 명단. 쓰러져도 잃는 것 없이 안전한 곳에서 일어난다. 적은 90초 뒤 다시 선다.
- 자동 점검: `SAGA_COMBAT_PROBE=1` → `COMBAT_PROBE_DONE fails=0`.
- **보물 상자**(2026-09-23): 세 지역에 16개. 다가가면 저절로 열리고 경험치(평범 5·정교 15·진귀 30·화려 60). 정교한 상자는 산 턱 위(올라가야 닿음). 보라 고리 = 둘레 적 무리를 한꺼번에 다 잡으면 풀림, 주황 고리 = 둘레 석등에 적힌 원소(화·수·뇌)로 원소 스킬 K·폭발 Q 를 써 20초 안에 다 밝히면 풀림. 연 상자는 저장하면 다시 안 생긴다. 자동 점검: `SAGA_TREASURE_PROBE=1` → `TREASURE_PROBE_DONE fails=0`.
- **지역 잇기**(2026-09-23): 포구는 마을 동쪽, 폐허는 마을 남쪽에 붙었다. 마을 동쪽 끝 숲(가운데보다 한 칸 남쪽)에서 동쪽으로 걸으면 포구 모래밭, 마을 남쪽 길을 따라 산 사이 고개를 넘으면 폐허. 역참 순간이동도 그대로 된다.

### 사가블로 (DUNGEON)
| 키 | 동작 |
|---|---|
| F | 공격(`dungeon_attack`) |
| 1~4 | 물약(`potion_1~4`) |

### 사가의숲 (FOREST)
| 키 | 동작 |
|---|---|
| G | 채집(`forest_gather`) |
| H | 심기(`forest_plant`) |

### 사가스토리 (STORY) — 조작이 가장 많다(전직 트리 4단 전부 옮겨져 있다)

**기본**
| 키 | 동작 |
|---|---|
| J | 평타 연참(`combat_quick`) |
| U | 횡소(`story_skill_sweep`, aoe) |
| I | 기탄(`story_skill_bolt`, 관통) |
| O | 기합(`story_skill_brace`, 버프) |
| K | NPC 상호작용/상태 확인(`story_interact`) — 트레이너·상인 앞에서 누른다. 허도의 비경 문(`LabyrinthGate`, x=24, 방랑객 NPC와 들판 문 사이) 앞에서도 같은 키로 "입장한다/기억을 새긴다" 선택지가 뜬다 |
| Shift | 대시(`story_dash`, 순간이동 재해석·쿨 0.9s·무적 0.12s) — 공통 조작 표의 "달리기(`run`)"는 이 판이 안 써서 물리 키만 같다. **길게 누르면**(0.35s+) 전직한 갈래별 고유 조작(PLAN 101-2 STORY ③, 무사=받아치기·협객=그림자 걷기·방사=원소 전환은 즉시 발동, 궁수=당기기는 계속 눌러 차징 후 떼면 발동) — 쿨 6s·기력 12 공통 |

**비경(101-2 ⑤)** — 허도 문으로 입장하면 5층 발판 노드 지도(`StoryLabyrinth.tscn`)가 열린다. 1~4층은 발판(전투·정예·보물·휴식·사건 중 2~3개) 위에 올라서 K로 확정, 5층은 곧바로 보스. 진입 직후·정예 처치 후 축복 3택 카드가 뜬다. 죽거나 클리어하면 기억 조각을 챙겨 허도로 돌아온다 — 문에서 조각으로 영구 강화(최대 HP)를 새길 수 있다.

**전직 전 (허도 트레이너 앞, `job`이 "무명"일 때)**
| 키 | 동작 |
|---|---|
| 1 / 2 / 3 / 4 | 무사 / 궁수 / 협객 / 방사로 전직 (Lv.10부터, 되돌릴 수 없다) |

**전직 후 — 같은 숫자 키가 "SP 투자"로 바뀐다** (레벨업마다 SP 3점, 트레이너 앞에서 누른다)
| 키 | 동작 |
|---|---|
| 1~4 (tier1일 때) / 1~5 (tier2) / 1~6 (tier3·tier4) | 그 직업 무예 순서대로 1점 투자 |
| P | 다음 자리로 승급(`story_job_advance`) — 조건 갖추면(레벨+무예 레벨) |

**실제 스킬 캐스팅** — 배운(SP를 투자한) 무예만 나간다. 안 배웠으면 아무 반응 없음(정상):

| 티어 | 입력 액션 | 물리 키(1~6번째 무예) |
|---|---|---|
| 1차(무사·궁수·협객·방사) | `story_job_skill_1~6` | Z · X · C · V · R · T |
| 2차(장군·신궁·자객·도사, 갈래마다 3~5개) | `story_job_skill2_1~5` | B · N · M · Y · Q |
| 3차(원수·비장·귀영·진인, 갈래마다 6개) | `story_job_skill3_1~6` | E · , · . · / · ; · ' |
| 4차(전신·궁성·명왕·천존, 갈래마다 6개) | `story_job_skill4_1~6` | 7 · 8 · 9 · 0 · - · = |

전직해도 **아래 tier 무예를 잃지 않는다** — 예를 들어 장군(tier2)으로
전직한 뒤에도 Z·X·C·V(무사 무예)는 계속 나간다. 위 표의 모든 줄이 동시에
살아 있다.

### 사가국지 (REALM)
아직 전용 입력 액션이 따로 없다 — 공통 조작(이동)만 확인.

---

## 7. STORY 전직을 빨리 보고 싶을 때 — 세이브 파일 직접 편집

전직 4단(1차 Lv.10 → 2차 Lv.25 → 3차 Lv.45 → 4차 Lv.70)을 **일반 플레이로
그대로 올리려면 시간이 오래 걸린다.** 이 프로젝트엔 아직 사용자가 만든
JS 판들의 `_admin.html` 같은 치트/디버그 도구가 없다 — 대신 세이브 파일이
평범한 JSON이라 **직접 편집해서 건너뛸 수 있다**:

1. 게임을 한 번 실행해서 화면의 **"저장"** 버튼을 눌러 세이브 파일을 만든다
2. 게임 창을 닫는다
3. 세이브 파일 위치를 연다:
   `%APPDATA%\Godot\app_userdata\SAGA\save_story.json`
   (탐색기 주소창에 그대로 붙여넣으면 된다 — `project.godot`의
   `config/name="SAGA"`가 폴더 이름이 된다)
4. 메모장으로 열어서 원하는 값을 고친다. 예를 들어:
   ```json
   "level": 70, "job": "general",
   "skills": {"w_cut": 10, "w_whirl": 10, "w_rush": 10, "w_iron": 10,
              "g_smash": 10, "g_roar": 10, "g_wall": 10}
   ```
   처럼 레벨과 job·skills를 손으로 채우면 다음 실행부터 그 상태로
   이어진다(전직 승급은 `job` 필드에 원하는 최종 직업 키를 바로 적어도
   되고, 트레이너 앞에서 P키로 실제로 눌러 승급시켜도 된다).
5. **`"version": 7`은 반드시 그대로 둔다** — 다르면 세이브 전체를
   무시하고 새로 시작한다(`story_save_state.gd` `try_load()`가 버전이
   안 맞으면 마이그레이션 없이 그냥 포기한다).
6. job 키·무예 key 철자는 `games/saga_story/data/story_combat.gd`의
   `JOBS_TIER1~4`·`JOB_SKILL_KEYS` 주석에서 그대로 확인할 수 있다
   (예: `general`·`marshal`·`warlord`, `w_cut`·`g_smash`·`n_heaven`·`o_ruin`).

---

## 8. 에디터 없이 그냥 실행할 파일 만들기 (PC 빌드)

에디터를 켜지 않고 더블클릭 한 번으로 켜지는 `.exe`가 필요하면(2026-09-13,
"실행 파일 만들어 줄 수 있어?" 요청으로 처음 만듦):

1. **내보내기 템플릿**이 있어야 한다(에디터 자체와 별개, ~1.3GB) — 없으면
   `%APPDATA%/Godot/export_templates/4.7.2.stable/`가 비어 있다. 받는 법:
   ```
   curl -sSL -o export_templates.tpz \
     "https://github.com/godotengine/godot/releases/download/4.7.2-stable/Godot_v4.7.2-stable_export_templates.tpz"
   # .tpz는 사실 zip이다. 풀면 templates/ 폴더가 나온다.
   unzip -o -q export_templates.tpz -d extracted
   # version.txt가 "4.7.2.stable"인지 확인한 뒤, 그 내용물을 아래 폴더로 복사
   cp -r extracted/templates/. "$APPDATA/Godot/export_templates/4.7.2.stable/"
   ```
   받은 `.tpz`·풀어 둔 `extracted/`는 스크래치패드에서 지워도 된다(설치
   폴더에 복사만 되면 끝).
2. **`export_presets.cfg`**(저장소 루트에 있음, `.gitignore` 대상이라
   커밋 안 됨)에 다섯 판 각각의 프리셋("saga-go"·"saga-dungeon"·
   "saga-forest"·"saga-story"·"saga-realm", 전부 Windows Desktop
   x86_64·`embed_pck=true`로 파일 하나에 다 담음)이 이미 정의돼 있다.
   **주의 — export_presets.cfg에는 게임마다 다른 main_scene을 지정하는
   자리가 없다**(그건 `project.godot`의 프로젝트 전역 설정이다). 그래서
   내보내기 직전에 `project.godot`의 `run/main_scene` 한 줄을 그 게임의
   씬으로 잠깐 바꾸고, 내보낸 뒤 바로 되돌린다:
   ```bash
   GODOT=<콘솔 실행 파일 경로>
   # project.godot의 run/main_scene을 그 게임 씬으로 바꾼 뒤(Edit 툴 등으로)
   "$GODOT" --headless --path . --export-release "saga-dungeon" \
     "builds/saga-dungeon/saga-dungeon.exe"
   # 그 직후 run/main_scene을 원래 값(saga_go TestVillage)으로 되돌린다
   ```
   **`python`으로 이 치환을 자동화하려 하지 말 것** — 이 PC의 `python`은
   Microsoft Store 스텁이라(2026-09-13 발견) 아무것도 안 하고 조용히
   성공한 것처럼 종료해, 다섯 판을 다 saga_go 씬으로 잘못 내보낸 적이
   있다(파일 크기·exit code만으로는 안 걸린다 — 반드시 아래 3번처럼
   실제로 확인해야 한다). **Edit 툴로 직접 바꾸고 git status로 확인**
   하는 쪽이 안전하다.
3. **내보낸 뒤 반드시 실제로 확인** — 헤드리스로 몇 초 돌려 로그에서
   그 게임의 씬이 실제로 로드됐는지 본다(2번의 사고를 여기서 잡았다):
   ```bash
   "builds/saga-dungeon/saga-dungeon.exe" --headless --quit-after 2 --verbose \
     2>&1 | grep -i "Completed load for.*Test"
   # → res://games/saga_dungeon/world/TestRoom.tscn 이 나와야 한다
   ```
4. 다섯 판을 다 내보낸 뒤 `git status`로 `project.godot`이 원래 값(saga_go)
   그대로인지, `*.import`에 무관한 잡음만 있는지 확인하고 되돌린다.
   `export_presets.cfg`·`builds/`는 둘 다 `.gitignore` 대상이라 커밋되지
   않는다 — 결과물(`.exe`, 각 147MB 안팎)은 로컬에만 남는다.

## 9. 확인 끝나면

- 게임 창·에디터를 닫는다(작업관리자에 `Godot_v4.7...exe`가 남아 있으면
  그것도 종료 — 여러 인스턴스를 띄운 채로 두면 다음에 헷갈린다)
- 무엇을 봤는지(어느 씬, 어떤 조작, 뭐가 이상했는지) 다음 Claude 세션에게
  한 줄이라도 남겨 주면, 세션이 바뀌어도 그대로 이어서 봐줄 수 있다 —
  이 저장소는 "saga-godot 이어해"라고만 말해도 `docs/PROJECT_STATE.md`
  맨 아래(최신 항목)를 보고 다음에 뭘 할지 스스로 판단한다.
