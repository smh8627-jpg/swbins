extends Node

## "제외" 목록 2번(소켓+부문어) — 부문(符文/룬) 주머니. item.js의 addMat()/
## matCount()와 같은 경계(개수만 세는 재료).
##
## "제외" 목록 3번(감정) — 감정서(item.js scrolls()/addScroll())도 같은
## "개수만 세는 재료" 경계라 여기 같이 둔다(rune과 자료구조가 똑같다).
##
## "제외" 목록 4번(원소 6결+저항) — 보석(개수만 세는 재료, 룬과 같은 경계지만
## 등급이 있어 키에 등급을 같이 물린다)·주옥(낱개, item.js jewels()와 같은
## 경계) 두 주머니를 더했다.
##
## project.godot [autoload]에 DungeonMaterialsState로 등록.

signal materials_changed

var rune_counts: Dictionary = {} # key(String) -> count(int)
var scrolls: int = 0

## "제외" 목록 4번(원소 6결+저항) — 보석은 룬처럼 "개수만 세는 재료"지만
## 등급이 있어 키가 "마노:0"식(item.js matKeyOf() 그대로)이다. 주옥은 낱개라
## (같은 주옥이 둘 없다) 배열 + id로 가리킨다(item.js jewels()와 같은 경계).
var gem_counts: Dictionary = {} # "key:grade"(String) -> count(int)
var jewels: Array[Dictionary] = [] # [{id, aff}]
var _jewel_seq := 0


func add_rune(key: String, n: int = 1) -> void:
	rune_counts[key] = int(rune_counts.get(key, 0)) + n
	materials_changed.emit()


## 박을 때 하나 뺀다 — 없으면 아무 일도 안 한다(호출 쪽이 미리 count()로 있는지 본다).
func take_rune(key: String) -> bool:
	var n: int = int(rune_counts.get(key, 0))
	if n <= 0:
		return false
	if n <= 1:
		rune_counts.erase(key)
	else:
		rune_counts[key] = n - 1
	materials_changed.emit()
	return true


func count(key: String) -> int:
	return int(rune_counts.get(key, 0))


## "제외" 목록 3번(연단) — forge.js makeRune(): 같은 부문 3개를 태워 다음
## 글자 하나로. **장비 셋→한 등급 위·접사 다시 굴리기**는 여전히 이 슬라이스
## 밖이다 — 둘 다 "가방에 남는 여벌"이 있어야 하는데 우리는 가방 자체가
## 없다(무기 한 자루뿐이니 "여벌 셋"이 생길 수가 없다). **보석 셋→한 등급
## 위**는 "제외" 목록 4번에서 combine_gem()으로 따로 채웠다(아래).
func combine_rune(key: String) -> Dictionary:
	if count(key) < 3:
		return {"ok": false, "reason": "mat"}
	var next_key := DungeonItems.next_rune_key(key)
	if next_key == "":
		return {"ok": false, "reason": "top"}
	rune_counts[key] = int(rune_counts[key]) - 3
	if int(rune_counts[key]) <= 0:
		rune_counts.erase(key)
	rune_counts[next_key] = int(rune_counts.get(next_key, 0)) + 1
	materials_changed.emit()
	return {"ok": true, "next_key": next_key}


func add_scroll(n: int = 1) -> void:
	scrolls = maxi(0, scrolls + n)
	materials_changed.emit()


func take_scroll() -> bool:
	if scrolls <= 0:
		return false
	scrolls -= 1
	materials_changed.emit()
	return true


## item.js matKeyOf(kind, key, g) — 보석만 등급을 키에 물린다(부문은 등급이 없다).
static func _gem_key(key: String, grade_num: int) -> String:
	return "%s:%d" % [key, grade_num]


func add_gem(key: String, grade_num: int, n: int = 1) -> void:
	var k := _gem_key(key, grade_num)
	gem_counts[k] = int(gem_counts.get(k, 0)) + n
	materials_changed.emit()


func take_gem(key: String, grade_num: int) -> bool:
	var k := _gem_key(key, grade_num)
	var n: int = int(gem_counts.get(k, 0))
	if n <= 0:
		return false
	if n <= 1:
		gem_counts.erase(k)
	else:
		gem_counts[k] = n - 1
	materials_changed.emit()
	return true


func gem_count(key: String, grade_num: int) -> int:
	return int(gem_counts.get(_gem_key(key, grade_num), 0))


## item.js addJewel() — 주머니가 차 있으면(JEWEL_MAX) 바닥에 남는다(요대와
## 같은 규칙). id는 여기서 붙인다(일련번호는 한 곳에서만 나와야 한다).
func add_jewel(j: Dictionary) -> Dictionary:
	if j.is_empty() or not j.has("aff"):
		return {"ok": false, "reason": "bad"}
	if jewels.size() >= DungeonItems.JEWEL_MAX:
		return {"ok": false, "reason": "full"}
	_jewel_seq += 1
	var made := {"id": "j%d" % _jewel_seq, "aff": j.aff}
	jewels.append(made)
	materials_changed.emit()
	return {"ok": true, "jewel": made}


## 박거나 버릴 때 주머니에서 뺀다 — 없으면 {}.
func remove_jewel(id: String) -> Dictionary:
	for i in range(jewels.size()):
		if str(jewels[i].id) == id:
			var jw: Dictionary = jewels[i]
			jewels.remove_at(i)
			materials_changed.emit()
			return jw
	return {}


func jewel_by_id(id: String) -> Dictionary:
	for j: Dictionary in jewels:
		if str(j.id) == id:
			return j
	return {}


## forge.js makeGem() — 같은 보석·같은 등급 3개를 태워 한 등급 위 하나로.
## 완(完, GRADES 마지막)은 끝이라 더 못 올린다.
func combine_gem(key: String, grade_num: int) -> Dictionary:
	if gem_count(key, grade_num) < 3:
		return {"ok": false, "reason": "mat"}
	if grade_num >= DungeonItems.GRADES.size() - 1:
		return {"ok": false, "reason": "top"}
	var k := _gem_key(key, grade_num)
	gem_counts[k] = int(gem_counts[k]) - 3
	if int(gem_counts[k]) <= 0:
		gem_counts.erase(k)
	add_gem(key, grade_num + 1, 1)
	return {"ok": true, "next_grade": grade_num + 1}


func restore(saved_runes: Dictionary, saved_scrolls: int = 0,
		saved_gems: Dictionary = {}, saved_jewels: Array = []) -> void:
	rune_counts.clear()
	for k in saved_runes:
		rune_counts[str(k)] = int(saved_runes[k])
	scrolls = maxi(0, saved_scrolls)
	gem_counts.clear()
	for k in saved_gems:
		gem_counts[str(k)] = int(saved_gems[k])
	jewels.clear()
	_jewel_seq = 0
	for j in saved_jewels:
		if j is Dictionary and j.has("id") and j.has("aff"):
			jewels.append({"id": str(j.id), "aff": j.aff})
			var n := int(str(j.id).trim_prefix("j").to_int())
			_jewel_seq = maxi(_jewel_seq, n)
	materials_changed.emit()
