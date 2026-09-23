# scene-layout — 글자 지도 → Godot/Unity 씬 조립

웹 판 `land.js` 글자 지도(맵 편집기 `saga-web/tools/map-editor/` 로 고치는 그것)를 3D 두 트랙의 씬으로 조립한다.
**두 트랙은 코드를 나누지 않는다** — 여기 공용 생성기는 데이터(배치표 JSON)만 만들고, 조립은 트랙마다 제 스크립트가 한다.

```
# 1) 배치표 — 트랙별 "지형 → 에셋" 표(kinds.json)를 먹여 씨앗 고정 JSON 을 만든다
node tools/scene-layout/layout.mjs --kinds saga-godot/tools/layout/kinds.json --out saga-godot/tools/layout/out/hebei.json
node tools/scene-layout/layout.mjs --kinds saga-unity/tools/layout/kinds.json --out saga-unity/tools/layout/out/hebei.json
#    [--land saga-web/saga-go/js/land.js] [--region hebei] [--seed 20260824]

# 2a) Godot — 헤드리스로 .tscn 하나를 새로 쓴다
"$GODOT" --headless --path saga-godot --script res://tools/build_from_layout.gd -- \
    res://tools/layout/out/hebei.json res://games/_generated/hebei_layout.tscn

# 2b) Unity — 메뉴 Saga > Layout > Build Scene From Layout JSON…  또는 배치 모드
#     Unity.exe -batchmode -nographics -quit -projectPath saga-unity -executeMethod BuildFromLayout.BuildFromArgs \
#       -layout tools/layout/out/hebei.json -out Assets/Scenes/Generated/HebeiLayout.unity
```

- **배치표(saga-layout/1)**: `ground[]`(칸마다 지형) · `items[]`(에셋 경로·x/y/z·rotY·scale) · `places[]`(명소) · `groundColors`.
  격자 (0,0) 가운데가 원점, 한 칸 = `cell` 미터(기본 4), +z 남쪽. 같은 입력·씨앗이면 바이트까지 같다.
  지도가 `validate()` 를 못 넘으면 만들지 않는다. 명소 칸(`mark`)엔 명소 물건만 두고 지형 물건은 겹쳐 깔지 않는다.
- **kinds.json**(`saga-godot/tools/layout/`·`saga-unity/tools/layout/`): 지형·명소마다 `assets`·`per`(한 칸 개수, 소수는 확률)·
  `jitter`·`scale`. 경로는 그 트랙에 **실제 있는 파일만** — 없는 경로는 조립 때 건너뛰고 이름을 찍는다.
- 조립 스크립트는 **새 씬 하나만** 쓴다(Unity 는 바닥 재질 `Assets/Art/Generated/Layout/Ground_*.mat` 도). 기존 씬·임포트 설정은 안 건드린다.
  Unity 는 z 를 뒤집는다(+z 북쪽).
- 조립 씬 자체엔 게임 판정·NPC 배선을 넣지 않는다 — 보기용 조명·카메라와 명소 표식까지만(다시 조립하면 덮이니까). 배선은 트랙마다 **그 씬을 인스턴스로 품는 래퍼**가 한다.
  바닥 판엔 메타 `kind`, 루트엔 `layout_cell` 이 남아 래퍼가 읽는다. Godot 은 다시 조립할 때마다 노드 `unique_id` 가 새로 뽑혀 씬 파일 diff 가 크게 난다(내용은 같다, Unity 도 `PrefabInstance` 수정 목록의 fileID 가 매번 새로 뽑혀 마찬가지).
  Unity 쪽 메타는 MonoBehaviour(`Saga.Core.LayoutRoot`/`LayoutGroundTile`/`LayoutPlace`, `saga-unity/Assets/SagaCore/`) — **한 파일에 여러 클래스를 몰아넣지 않는다**(파일명과 클래스명이 다르면 같은 배치 세션에서 GUID 참조 대신 씬에 통째로 박히는 임시 참조로 저장돼 다른 프로세스에서 "referenced script is missing"로 깨진다, 2026-09-23 실측).

## Godot — 걸어 다니는 래퍼 `games/saga_go/layout/LayoutWalk.tscn`

```
"$GODOT" --path saga-godot res://games/saga_go/layout/LayoutWalk.tscn                                   # 걸어 보기
SAGA_LAYOUT_PROBE=1 "$GODOT" --headless --path saga-godot res://games/saga_go/layout/LayoutWalk.tscn   # 자동 걷기 점검
```

- `hebei_layout.tscn` + GO 의 `Player.tscn`(걷기·카메라) + `MobileHUD.tscn`(조이스틱·토스트). `layout_walk.gd` 가 실행 시점에
  바닥 충돌·가장자리 벽·**물 칸 막기**(다리 놓인 칸만 열림, 산은 걷는다)·명소마다 발견 판정(Area3D)·이름표(Label3D, 숨은 명소는 찾은 뒤)를 붙인다.
- 발견은 이 씬 안에서만 센다(`📍 명소 n/13`) — GO 도감(`CodexState`)·세이브엔 안 넣고 HUD 저장 버튼도 뗀다. 나무·바위는 부딪히지 않는다.
- 점검(`tools/probe_layout_walk.gd`)은 바닥에 서기 · 강가에서 막힘 · 다리로 건넘 · 데려가기 전엔 다 안 찾아짐 · 명소 13/13 · 숨은 이름표 여섯 가지를 보고 `LAYOUT_PROBE_DONE fails=0 …` 을 찍는다.

## Unity — 걸어 다니는 래퍼 `Assets/Scenes/LayoutWalk.unity`

```
Saga > Layout > Build Layout Walk Scene                     # 메뉴, 또는 -executeMethod Saga.EditorTools.BuildLayoutWalkScene.Build
Saga > Playtest Layout Walk (Headless)                      # 자동 걷기 점검, -executeMethod Saga.EditorTools.PlaytestLayoutWalkHeadless.Run(-quit 안 씀)
```

- `HebeiLayout.unity` 를 실행 시점에 `LayoutWalk.cs`(`Saga.Go.Layout`, `Assets/Games/SagaGo/Layout/`)가 `EditorSceneManager.LoadSceneInPlayMode` 로 additive
  로드해(생성 씬이 Build Settings 에 없어 일반 `SceneManager.LoadScene` 은 못 찾는다) 읽는다. Player(GO `PlayerController` 재사용, 캡슐 폴백)·
  `MobileHUD`(조이스틱)·명소 개수 UI·토스트(`DialogueLabel`)만 자기 씬에 두고, 바닥 충돌·물 칸 막기(BoxCollider)·명소 발견(SphereCollider 트리거)·
  이름표(TextMesh+빌보드)는 Godot 판과 같은 규칙으로 런타임에 붙인다.
- **배치 모드는 렌더링이 없어 `Update` 마다 누적하는 자동 물리 스텝이 실제 시간 기준으로 거의 안 돈다** — 트리거가 씬 시작 때 겹친 것 딱 한 번만 잡히고
  그 뒤로 아무리 순간이동해도 다시는 안 잡히는 걸로 나타난다(2026-09-23 실측). `PlaytestLayoutWalkHeadless.Run()`이 Play 모드 진입 때
  `Physics.simulationMode = SimulationMode.Script`로 바꾸고 텔레포트마다 `Physics.SyncTransforms()`+`Physics.Simulate()`를 직접 불러야 한다.
- 점검(`PlaytestLayoutWalkHeadless.cs`)은 물 칸이 막히고 다리 칸만 열렸는지(씨앗 20260824 고정 좌표) · 명소 열셋 전부 발견 13/13 ·
  숨은 이름표가 찾은 뒤에만 보이는지를 확인하고 `LAYOUT_WALK_PROBE_DONE fails=0 …`을 찍는다.
