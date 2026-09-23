# asset-audit — 세 트랙 에셋 점검(읽기 전용)

웹 다섯 판 `saga-web/<판>/assets/` · `saga-godot/assets/` · `saga-unity/Assets/` 를 한 번에 훑는다.
파일은 하나도 고치지 않는다. 결과는 `out/report.html`(거르기·정렬 되는 표)과 `out/report.json` — `out/` 은 커밋 안 함.

```
py -3 tools/asset-audit/audit.py                  # 전부(약 1분, md5 포함)
py -3 tools/asset-audit/audit.py --game saga-realm # 웹 한 판
py -3 tools/asset-audit/audit.py --track godot --track unity
py -3 tools/asset-audit/audit.py --no-md5         # 사본 찾기 빼고 빠르게
py -3 tools/asset-audit/audit.py --strict         # 🔴 가 있으면 종료 코드 1
```
콘솔이 cp949 면 `PYTHONIOENCODING=utf-8` 을 앞에 붙인다.

| 종류 | 심각 | 무엇 |
|---|---|---|
| public | 🔴 | `.gitignore` 가 막는 경로·재배포 금지 폴더(Mixamo·CharactersRealistic 등)인데 git 에 올라감 |
| decoder | 🔴 | 웹 GLB 가 Meshopt/Draco/KTX2 압축인데 그 판 js(vendor 제외)가 `setMeshoptDecoder(`/`setDRACOLoader(`/`setKTX2Loader(` 를 안 부름 → 로드 실패 |
| gitsize | 🔴/🟡 | git 에 올라간 파일 100MB 초과(GitHub 거부) / 50MB 초과 |
| pair | 🟡 | Unity `.meta` 짝 없음·고아 `.meta`, Godot `.import` 짝 없음 |
| heavy | 🟡 | 웹 GLB 5MB·삼각형 5만·텍스처 2048px 초과(폰 기준, `BUDGET`) |
| license | 🟡 | 출처 문서(`ASSET_LICENSES.md`·`ASSET_CATALOG.md` / `docs/ASSET_GUIDE.md`)에 폴더·파일 이름이 안 나옴. `` `tile_*.png` `` 와일드카드, `texture-{a,b}.png` 묶음, `CommonTree_1~5` 범위, `Bark_X(_Normal)` 선택 표기도 인정. 걸리면 빠진 파일 이름을 여섯 개까지 보여 준다. `generated/`·`portraits/`(우리 도구 산출물)는 뺀다 |
| unref | ⚪ | 코드·씬·`.gltf`·GLB 외부 참조(`images[].uri`)·Unity GUID·저장소 `tools/`(킷배싱·굽기 원재료) 어디에도 흔적 없음. `portraits/hero/` 폴더 경로나 `eu_alexander`(+`_c`) 같은 id 접두어가 코드에 있으면 동적 참조(`dyn`)로 본다. 일부러 남기는 것은 `keep.txt` 에 `경로 접두어  # 이유` 로 적으면 `keep` 으로만 표시된다 |
| dup | ⚪ | md5 같은 사본. 웹 다섯 벌 복사는 방침이라 정상 — **트랙을 넘는 사본**이 공용 에셋 통합 후보 |

- GLB 는 JSON 청크만 풀어 센다(삼각형·내장 텍스처 크기·애니·스킨·`extensionsUsed`) — trimesh 불필요, 표준 라이브러리만.
- 규칙을 바꿀 땐 파일 머리의 `RESTRICTED`·`GENERIC`·`SELF_MADE`·`BUDGET` 만 고친다.
- 판정은 이름 대조라 **참고용**이다. 🔴 는 고치기 전에 해당 코드를 한 번 열어 확인한다.
