# bake-icons — 짐승·건물 2D 지도 아이콘 오프라인 굽기

`sprite.js`가 캔버스로 절차적으로 그리던 지도 위 짐승(펫)·건물(성채·역참)
마커를, 이미 저장소에 있는 CC0 GLB(`assets/models/animals/*`,
`assets/models/buildings/*` — `asset3d.js`의 `DEFAULTS` 표와 같은 파일)에서
실제로 한 번 스냅샷을 구워 PNG로 바꾸는 일회성 배치 툴이다.

**게임이 이 폴더를 로드하지 않는다.** 결과물(`assets/sprites2d/beast_*.png`·
`building_*.png`)만 `sprite.js`가 쓴다. `bake.html`은 다시 돌릴 때만 연다.

## 돌리는 법

1. saga-go 루트에서 정적 서버를 띄운다(`python -m http.server 8791`, 혹은
   `run.bat`). `file://` 단독으로 열면 GLB fetch가 막힌다.
2. 브라우저(또는 헤드리스 크롬)로 `http://.../tools/bake-icons/bake.html`을
   연다. 진행 로그가 화면에 쌓이고, 다 구우면 `<title>`이
   `BAKE_DONE n/33`으로 바뀐다.
3. 결과는 `<pre id="manifest">`에 JSON(각 항목 `{key, group, ok, dataURL}`)
   으로 그대로 있다 — 개발 세션에서는 `--dump-dom`으로 이 DOM을 통째로
   받아 그 안의 JSON을 파싱해 `assets/sprites2d/<group>_<key>.png`로 흩는다
   (그 세션이 그렇게 했다 — 별도 스크립트를 안 남겨 뒀으니 필요하면
   `bake-dump.html`을 받아 `<pre id="manifest">`를 잘라 `JSON.parse` 후
   각 `dataURL`의 base64 부분을 파일로 저장하면 된다).

## 알려진 흠 (2026-09-11)

헤드리스 크롬(`--use-angle=swiftshader`)에서는 아래 **다섯 개**가 로더
콜백이 영영 안 와 구워지지 않는다(fetch는 100% 받아지는데 파싱 단계에서
멎는다 — 큰 임베디드 base64 텍스처를 이 소프트웨어 렌더 조합이 못 견디는
것으로 보이나 확증은 못 했다):

- `Orc.gltf`·`Demon.gltf`·`BlueDemon.gltf` (ogre 형태 펫 넷 — 도깨비·
  그늘귀·만권·의조가 아직 절차적 그림 그대로)
- `tower_round.glb`(성채 3등급/웅진), `tower_ruin.glb`(역참) — 둘 다
  `assets/models/buildings/realistic/`의 실사 스캔이라 텍스처가 크다

**실제 GPU가 있는 보통 브라우저 창(헤드리스 아님)으로 열면 될 가능성이
있다** — 아직 시도 안 해 봤다. 되면 이 다섯 개도 같은 방식으로
`assets/sprites2d/`에 추가하고, `js/sprite.js`의 `BEAST_FORM_FILES`에
`ogre` 줄을 채우고 `js/world.js`의 `drawFort`(tier 3)·`drawStation`에
이미지를 넘기게 한 줄씩 보태면 된다(패턴은 이미 있는 t1/t2 자리 그대로
따라 하면 된다).
