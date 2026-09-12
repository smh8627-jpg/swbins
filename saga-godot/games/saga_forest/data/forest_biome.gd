class_name ForestBiome
extends RefCounted

## VERTICAL_SLICE_FOREST.md 4절 "제외" 목록 7번(마지막 항목) — 바이옴
## 지형 다양성. 웹판 data-village.js TILES(grass_meadow·grass_dark·
## grass_mush·grass_rocky)·village.js biomeAt()를 옮긴다(이름·색 하나
## 안 바꿈, 값은 4절 원문 그대로 아니라 이 슬라이스의 곡률 셰이더 톤에
## 맞춰 조금 밝혔다 — 곡률 정점색 셰이더가 원작 캔버스 색보다 어둡게
## 보이는 경향이 있어서다, terrain_builder.gd의 기존 grass 색과 비교해
## 판단).
##
## **재해석한 부분** — 웹판은 마을 훨씬 바깥(숲 고리, village.js의
## 별도 BIOME_CELL 격자)에 이 넷을 두지만, 이 슬라이스의 지도는 30×20
## 한 장뿐이라(숲 고리 자체가 없다) **마을 안 풀밭을 네 사분면으로
## 나눠** 옮긴다 — 흙길(row 10, village_map.gd ROWS[10])보다 북/남,
## 집(H, col 15)보다 서/동. 짐승·몬스터별 서식 바이옴(웹판 ANIMALS.
## biomes)은 "몬스터·퓨전 콘텐츠"(4절 5번, 별개 항목)에 속해 범위 밖.

const MEADOW := {"key": "meadow", "name": "꽃밭", "color": Color(0.62, 0.72, 0.36)}
const DARK := {"key": "dark", "name": "어둑숲", "color": Color(0.22, 0.34, 0.22)}
const MUSH := {"key": "mush", "name": "버섯숲", "color": Color(0.3, 0.46, 0.34)}
const ROCKY := {"key": "rocky", "name": "바위 지대", "color": Color(0.52, 0.53, 0.46)}

const ROAD_ROW := 10  # village_map.gd ROWS[10] — 흙길("=")
const MID_COL := 15   # 집(H)이 있는 세로 기준선


static func biome_at(grid_x: int, grid_y: int) -> Dictionary:
	var north: bool = grid_y < ROAD_ROW
	var west: bool = grid_x < MID_COL
	if north and west:
		return MEADOW
	if north and not west:
		return DARK
	if not north and west:
		return MUSH
	return ROCKY


static func color_at(grid_x: int, grid_y: int) -> Color:
	return biome_at(grid_x, grid_y).color
