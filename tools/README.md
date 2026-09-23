# 도구 목록 — 저장소 전체(웹 다섯 판 · saga-godot · saga-unity)

도구마다 자세한 사용법은 그 폴더 README·파일 머리 주석이 정본이다. 여기는 **어디에 무엇이 있나**만 적는다.
게임 서버가 아닌 로컬 도구들이다. 커밋·푸시는 하지 않는다(precheck 만 커밋 훅이 부른다).

## 게임 만들기

| 도구 | 하는 일 | 여는 법 |
|---|---|---|
| `saga-web/tools/content-editor/` | 도감(`data.js` HEROES·PETS·BIOS)을 다섯 판에 함께 반영 · 판별 `data-*.js` 표 88개 항목 편집 · 3D 자산 재할당·업로드 · 실명 가드 · sw.js 자동 올림 | `run-editor.bat` → :8799 |
| `saga-web/tools/map-editor/` | `land.js` 글자 지도 칠하기·명소 옮기기, 게임 `validate()` 로 실시간 검사 | `run-map-editor.bat` → :8800 |
| `saga-web/tools/new-game/` | 여섯 번째 웹 판 뼈대(바로 도는 최소 놀이·세이브·sw.js·진단 8항목·문서 3층) | `node new-game.mjs --folder saga-xxx --title .. --port ..` |
| `tools/scene-layout/` | 글자 지도 → 배치표(JSON) → Godot `.tscn` / Unity `.unity` 조립(트랙별 스크립트) | README 의 두 단계 명령 |

## 에셋 만들기·다듬기

| 도구 | 하는 일 |
|---|---|
| `tools/asset-forge/` | 파이썬 절차 생성 — `palette`(팔레트 스냅) · `kitbash`(부품 조립) · `procgen`(바위·나무·소품) · `tilegen`(시임리스 타일) · `spritegen`(아이콘) · `sfxgen`(효과음) · `vroid_face_bake_project`(VRoid 얼굴 재베이크) |
| `tools/glb-compress/` | `compress.mjs` Meshopt+WebP 압축(처리 기록 manifest) · `vrm-slim.mjs` VRM 모프 떼기 · `seam-simplify.mjs` 사진측량 UV 조각 모델 줄이기 |
| `tools/obj-split/` | OBJ 쪼개기 |
| `tools/mixamo_automation/` | Mixamo 모션 받기(`fetch.mjs --dest`) — 원본은 로컬 전용(.gitignore) |
| `saga-web/tools/bake-portraits/` | 도감·카드 초상을 webp 로 미리 굽기 |
| `saga-web/saga-go/tools/bake-icons/` | 짐승·건물 2D 지도 아이콘 굽기 |
| `saga-godot/tools/mixamo_retarget.gd` | Mixamo 모션 → VRM 뼈대 리타겟 |

## 점검·검증

| 도구 | 하는 일 |
|---|---|
| `tools/precheck.sh` | 커밋 전 점검(커밋 훅이 자동 실행) — js 구문 · 도감 md5 · sw.js 버전 · **바뀐 에셋 🔴** · 문서 크기 |
| `tools/asset-audit/` | 세 트랙 에셋 점검 — 공개 유출 · 압축 디코더 누락 · 용량 · .meta/.import 짝 · 폰 예산 · 출처 문서 · 미참조 · 사본. `--quick` 은 바뀐 것만 |
| `tools/hooks/` | `gate.js` 훅 게이트(세션 절차·커밋 전 precheck·PLAN 날짜 기록 막기) · `syntax-check.js` js 구문 한꺼번에 |
| `saga-godot/tools/godot_regress.sh` | 다섯 대표 씬 헤드리스 3회 회귀(로그 md5·error/warn 0) |
| `saga-unity/tools/unity-batch.sh` | Unity 배치 실행 + 설치 버전 부작용 4파일 원복 — **다른 세션이 saga-unity 를 고치는 중이면 쓰지 않는다**(Packages 파일을 되돌린다) |
| 각 판 `_test.html` · `_admin.html` · `_demo.html` | 진단(RESULT n/n) · 세이브·균형 손잡이 · 장면 데모 |
