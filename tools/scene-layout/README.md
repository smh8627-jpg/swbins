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
- 게임 판정·NPC 배선은 하지 않는다 — 보기용 조명·카메라와 명소 표식까지만. 실제 게임 씬에 쓰려면 그 트랙 PLAN 규칙(§8-1)대로 따로 배선한다.
