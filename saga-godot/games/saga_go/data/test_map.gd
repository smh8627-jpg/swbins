extends RefCounted

## VERTICAL_SLICE.md 27절의 테스트 지역. saga-go 웹판 js/land.js의 글자 지도
## 방식을 그대로 따른다 — 좌표가 아니라 눈으로 읽는 그림으로 지형을 정의한다.
## 7×7칸(칸당 48m = 336m 사방), 웹판(21×21칸=1008m)의 1/3 축소판.
##
## ^ 산   T 숲   ~ 강   = 길   H 마을   F 논밭   . 들
## C 굴 입구   S 옛 사당   R 폐허   B 다리
const ROWS := [
	"^^^C^^^",
	"^TT=TT^",
	"T..=..T",
	"T.HH.RT",
	"T..=..T",
	"~~~B~~~",
	"^^^=^^^",
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
