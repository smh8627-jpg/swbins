class_name ForestWear
extends RefCounted

## VERTICAL_SLICE_FOREST.md 4절 "제외" 목록 6번 — 옷(침선방·針線房). 웹판
## js/wear.js + js/data-village.js의 WEAR_COATS/WEAR_HEADS/WEAR_DYES/
## WEAR_CAPES를 그대로 옮긴다(값 하나 안 바꿈) — 겉옷·머리·옷 빛·덧옷 넷.
##
## **재해석한 부분** — 웹판은 이 넷을 인물 그림(sprite.js의 look.armor/
## helm/cape, color)에 그대로 반영하지만, 이 플레이어는 단일 GLB
## (character-a.glb, 텍스처 한 장)라 겉옷·머리를 바꿔 그릴 자산이 없다.
## **옷 빛(dye)과 덧옷(cape)만 실제로 화면에 보이게** 했고(games/
## saga_forest/world/forest_wear_visual.gd 참고), 겉옷·머리는 사고팔고
## 갈아입는 로직은 실제로 동작하되(골드 차감·소유·착용까지 진짜다)
## 화면에는 아직 안 보인다 — 그림 자산이 생기면 나중에 연결한다.
##
## 이 파일은 **카탈로그(순수 데이터)만** 갖는다 — 실제 소유·착용·골드
## 트랜잭션은 forest_save_state.gd(owns_wear/buy_wear/set_wear)가 맡는다
## (ForestTurnip의 계산-상태 분리와 같은 경계).

const COATS: Array = [
	{"key": "leather", "name": "평상복", "price": 0},
	{"key": "robe", "name": "도포", "price": 2400},
	{"key": "coat", "name": "두루마기", "price": 3600},
	{"key": "plate", "name": "갑옷", "price": 6800},
]

const HEADS: Array = [
	{"key": "none", "name": "맨머리", "price": 0},
	{"key": "topknot", "name": "상투", "price": 0},
	{"key": "braid", "name": "댕기", "price": 900},
	{"key": "scholar", "name": "유건", "price": 1500},
	{"key": "gat", "name": "갓", "price": 1800},
	{"key": "hairpin", "name": "족두리", "price": 2600},
	{"key": "helmet", "name": "전립", "price": 3200},
]

const DYES: Array = [
	{"key": "none", "name": "그대로", "c": "", "price": 0},
	{"key": "white", "name": "소색", "c": "#e4ddcc", "price": 1200},
	{"key": "ink", "name": "먹빛", "c": "#3a3f48", "price": 1400},
	{"key": "forest", "name": "풀빛", "c": "#3f7f4a", "price": 1600},
	{"key": "indigo", "name": "쪽빛", "c": "#3a6a9a", "price": 1600},
	{"key": "crimson", "name": "다홍", "c": "#c0453a", "price": 1800},
	{"key": "gold", "name": "치자빛", "c": "#d8a63c", "price": 2200},
	{"key": "plum", "name": "자주", "c": "#7a4a8a", "price": 2400},
]

const CAPES: Array = [
	{"key": "off", "name": "없음", "price": 0},
	{"key": "on", "name": "덧옷", "price": 2000},
]

const PARTS: Array = [
	{"key": "coat", "name": "겉옷", "list": COATS},
	{"key": "head", "name": "머리", "list": HEADS},
	{"key": "dye", "name": "옷 빛", "list": DYES},
	{"key": "cape", "name": "덧옷", "list": CAPES},
]


static func part(key: String) -> Dictionary:
	for p: Dictionary in PARTS:
		if String(p.key) == key:
			return p
	return {}


static func item(part_key: String, item_key: String) -> Dictionary:
	var p := part(part_key)
	if p.is_empty():
		return {}
	for it: Dictionary in (p.list as Array):
		if String(it.key) == item_key:
			return it
	return (p.list as Array)[0]
