class_name ForestHome
extends RefCounted

## FOREST 콘텐츠 확장 1호 — 집 꾸미기(가구). 웹판 home.js "제외" 목록
## 중 "벽지/장판 그 자체만" 옮기고 남겨 뒀던 나머지(가구 사기·놓기·
## 집 평가)를 이어서 옮긴다. `js/data-village.js` FURNITURE(14종)·
## HOME_GRADES(6단) 그대로 — 값 하나 안 바꿈.
##
## **재해석** — 증축(HOME_TIERS, 방 크기+빚)은 이번에도 범위 밖으로
## 남긴다. 방 하나(FOREST 집의 고정 8×8m 내부)에 담을 수 있는 만큼만
## 놓는 것으로 좁혔다 — 실제 방 리빌드(벽·바닥 치수 변경)는 그 자체로
## 또 하나의 손질이라 다음에 이어 볼 것.
##
## 가구는 어울리는 CC0 GLB가 없어(한국 전통 가구 — 이 저장소가 받아 둔
## 킷엔 없다) primitive로 짓는다(`form` 필드에 맞춰 상자/원기둥 굵기·
## 높이만 다르게 — gatherable_builder.gd의 꽃과 같은 예외).

const FURNITURE: Array = [
	{"key": "bangseok", "name": "방석", "price": 400, "set": "anbang", "form": "cushion"},
	{"key": "hwabun", "name": "화분", "price": 700, "set": "ddeul", "form": "plant"},
	{"key": "deungjan", "name": "등잔", "price": 800, "set": "anbang", "form": "lamp"},
	{"key": "soban", "name": "소반", "price": 900, "set": "anbang", "form": "table"},
	{"key": "mulhang", "name": "물항아리", "price": 1100, "set": "buok", "form": "vase"},
	{"key": "jokja", "name": "족자", "price": 1200, "set": "sarang", "form": "scroll"},
	{"key": "seoan", "name": "서안", "price": 1400, "set": "sarang", "form": "table"},
	{"key": "hwaro", "name": "화로", "price": 1500, "set": "buok", "form": "brazier"},
	{"key": "mungab", "name": "문갑", "price": 1800, "set": "sarang", "form": "chest"},
	{"key": "bandaji", "name": "반닫이", "price": 2200, "set": "anbang", "form": "chest"},
	{"key": "dokja", "name": "도자기", "price": 2600, "set": "anbang", "form": "vase"},
	{"key": "badukpan", "name": "바둑판", "price": 3000, "set": "sarang", "form": "table"},
	{"key": "byeongpung", "name": "병풍", "price": 3600, "set": "sarang", "form": "screen"},
	{"key": "geomungo", "name": "거문고", "price": 5200, "set": "sarang", "form": "gayageum"},
]

const HOME_GRADES: Array = [
	{"at": 0, "name": "휑한 방"},
	{"at": 30, "name": "살림이 든 방"},
	{"at": 80, "name": "정갈한 집"},
	{"at": 160, "name": "아취 있는 집"},
	{"at": 280, "name": "이름난 집"},
	{"at": 450, "name": "명가(名家)"},
]

const SHOP_N := 4  # 전방에 날마다 들어오는 가구 수(웹판 SHOP_N 그대로)


static func furn(key: String) -> Dictionary:
	for f: Dictionary in FURNITURE:
		if String(f.key) == key:
			return f
	return {}


## 웹판 shopToday() — 날짜 해시로 오늘 넉 점을 고른다(같은 날이면 늘 같다).
static func daily_shop(day_key: int) -> Array:
	var out: Array = []
	var used: Dictionary = {}
	var i := 0
	while out.size() < SHOP_N and i < SHOP_N * 4:
		var idx: int = int(floor(_hash2(day_key * 31 + i * 97, day_key % 617 + 7) * FURNITURE.size())) % FURNITURE.size()
		if not used.has(idx):
			used[idx] = true
			out.append(FURNITURE[idx])
		i += 1
	return out


## 웹판 home.js score() 그대로 — 값·수·계열(set)을 본다. items는
## {"key":..} 형태의 배열(forest_save_state.gd의 home_items). tier
## 보너스(HOME_TIERS)는 이번 슬라이스에 증축이 없어 항상 0.
## fin_bonus는 forest_house.gd가 wall_key/floor_key를 보고 넘겨준다.
static func score(items: Array, fin_bonus: int) -> Dictionary:
	var sets: Dictionary = {}
	var sum := 0.0
	for it: Dictionary in items:
		var f := furn(String(it.key))
		if f.is_empty():
			continue
		sum += float(f.price) / 50.0
		sets[f.set] = int(sets.get(f.set, 0)) + 1
	sum += items.size() * 2.0
	var bonus := 0
	for k in sets:
		var n: int = int(sets[k])
		if n >= 5:
			bonus += 45
		elif n >= 3:
			bonus += 25
	sum += bonus
	sum += fin_bonus
	return {"total": roundi(sum), "sets": sets, "bonus": bonus, "n": items.size()}


static func grade(total: int) -> String:
	var g: Dictionary = HOME_GRADES[0]
	for e: Dictionary in HOME_GRADES:
		if total >= int(e.at):
			g = e
	return String(g.name)


static func _hash2(x: int, y: int) -> float:
	var h: int = (x * 374761393 + y * 668265263) & 0xFFFFFFFF
	h = ((h ^ (h >> 13)) * 1274126177) & 0xFFFFFFFF
	h = h ^ (h >> 16)
	return float(h & 0x7fffffff) / float(0x7fffffff)
