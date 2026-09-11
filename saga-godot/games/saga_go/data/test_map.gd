extends RefCounted

## VERTICAL_SLICE.md 27절의 테스트 지역. saga-go 웹판 js/land.js의 글자 지도
## 방식을 그대로 따른다 — 좌표가 아니라 눈으로 읽는 그림으로 지형을 정의한다.
##
## 2026-09-11㉒ — 사용자 지시로 7×7(336m 사방, 웹판 21×21=1008m의 1/3)에서
## 11×11(528m 사방, 웹판의 절반쯤)로 넓혔다. VERTICAL_SLICE.md 27절 자체가
## "축소해 시작해 검증 후 넓힌다"고 이미 적어 뒀던 다음 단계다(가볍게 결정할
## 일은 아니라고 미뤄 뒀었는데, 사용자가 지금 하기로 결정).
##
## **기존 마을·사건 배치는 그대로 두고 사방에 2칸씩 테를 둘렀다** — 새
## 좌표는 옛 좌표 + (2,2)다. 이렇게 대칭으로 넓히면 마을의 월드 좌표(원점
## 기준)는 하나도 안 바뀐다(world_pos()가 칸 수 절반을 원점으로 잡는 공식이라,
## 안쪽 내용물과 칸 수를 함께 +2 밀면 상대 위치가 정확히 그대로 남는다) —
## 그래서 Player.tscn 스폰 위치 등 월드 좌표를 쓰는 자리는 하나도 안 고쳤다.
## 격자 좌표를 쓰는 자리(TestVillage.tscn의 사건 노드 grid, npc_builder.gd의
## VILLAGERS grid, landmarks_builder.gd의 굴/마을/폐허/다리 좌표)는 전부
## +2,+2로 옮겼다.
##
## 새로 두른 테에 §27이 원래 요구했지만 옛 7×7엔 없었던 것도 채웠다 — "논밭
## 약간"(F, 남쪽 (8,9)(9,9))과 도감에 있었지만 안 쓰던 S(옛 사당, 북서쪽
## 숲 모퉁이 (2,1)). 새 지형 글자를 추가한 게 아니라 원래 LEGEND에 있었는데
## 안 쓰던 걸 처음 쓴 것이다(terrain_builder.gd 참고).
##
## ^ 산   T 숲   ~ 강   = 길   H 마을   F 논밭   . 들
## C 굴 입구   S 옛 사당   R 폐허   B 다리
const ROWS := [
	"^^^^^=^^^^^",
	"^TS^^=^^TT^",
	"TT^^^C^^^TT",
	"TT^TT=TT^TT",
	"TTT..=..TTT",
	"TTT.HH.RTTT",
	"TTT..=..TTT",
	"~~~~~B~~~~~",
	"^^^^^=^^^^^",
	"^TT^^=^^FF^",
	"^^^^^=^^^^^",
]

const TILE_SIZE := 48.0

static func size() -> Vector2i:
	return Vector2i(ROWS[0].length(), ROWS.size())

static func tile_at(grid_x: int, grid_y: int) -> String:
	if grid_y < 0 or grid_y >= ROWS.size():
		return "^"
	var row: String = ROWS[grid_y]
	if grid_x < 0 or grid_x >= row.length():
		return "^"
	return row[grid_x]

## 격자 좌표 → 월드 좌표(중심이 원점). land.js와 같은 규칙 — 지도의 그림과
## 걷는 자리가 같은 칸 크기를 쓴다.
static func world_pos(grid_x: float, grid_y: float) -> Vector3:
	var s := size()
	var half_w := s.x * 0.5
	var half_h := s.y * 0.5
	return Vector3((grid_x - half_w) * TILE_SIZE, 0.0, (grid_y - half_h) * TILE_SIZE)
