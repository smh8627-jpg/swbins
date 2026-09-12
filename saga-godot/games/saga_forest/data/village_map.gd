extends RefCounted

## VERTICAL_SLICE_FOREST.md 2·4절 — GO의 test_map.gd와 같은 "글자 지도"
## 방식. 2절이 정한 TILE_SIZE=3.0m(30×20 마을=90m×60m)을 쓴다. 4절의
## 첫 콘텐츠 루프 범위대로 바이옴 다양성은 없다 — 사방 테두리를 숲(T)으로
## 둘러싼 풀밭(.) 한 장 + 가로 흙길(=) 하나 + 집 자리(H) 하나뿐이다.
##
## ^ 산 같은 지형은 이번 슬라이스에 없다(높낮이·강 등은 4절 "제외" 목록의
## 바이옴 다양성에 해당) — 전부 평지(height=0)다.

const ROWS := [
	"TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
	"TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
	"TT..........................TT",
	"TT..........................TT",
	"TT..........................TT",
	"TT..........................TT",
	"TT..........................TT",
	"TT..........................TT",
	"TT..........................TT",
	"TT.............H............TT",
	"TT==========================TT",
	"TT..........................TT",
	"TT..........................TT",
	"TT..........................TT",
	"TT..........................TT",
	"TT..........................TT",
	"TT..........................TT",
	"TT..........................TT",
	"TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
	"TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
]

const TILE_SIZE := 3.0

static func size() -> Vector2i:
	return Vector2i(ROWS[0].length(), ROWS.size())

static func tile_at(grid_x: int, grid_y: int) -> String:
	if grid_y < 0 or grid_y >= ROWS.size():
		return "T"
	var row: String = ROWS[grid_y]
	if grid_x < 0 or grid_x >= row.length():
		return "T"
	return row[grid_x]

## 격자 좌표 → 월드 좌표(중심이 원점). test_map.gd의 world_pos()와 같은 규칙.
static func world_pos(grid_x: float, grid_y: float) -> Vector3:
	var s := size()
	var half_w := s.x * 0.5
	var half_h := s.y * 0.5
	return Vector3((grid_x - half_w) * TILE_SIZE, 0.0, (grid_y - half_h) * TILE_SIZE)
