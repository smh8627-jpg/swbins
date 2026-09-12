extends Node

## "제외" 목록 2번(소켓+부문어) — 부문(符文/룬) 주머니. item.js의 addMat()/
## matCount()와 같은 경계(개수만 세는 재료, 주옥처럼 낱개 id를 안 쓴다) —
## 우리는 보석·주옥을 이 슬라이스에서 안 옮겨서 rune 한 종류만 있다.
##
## "제외" 목록 3번(감정) — 감정서(item.js scrolls()/addScroll())도 같은
## "개수만 세는 재료" 경계라 여기 같이 둔다(rune과 자료구조가 똑같다).
##
## project.godot [autoload]에 DungeonMaterialsState로 등록.

signal materials_changed

var rune_counts: Dictionary = {} # key(String) -> count(int)
var scrolls: int = 0


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
## 글자 하나로. 보석 셋→한 등급 위·장비 셋→한 등급 위·접사 다시 굴리기
## (완 보석 둘)는 여전히 이 슬라이스 밖이다 — 셋 다 보석(GEMS)이 있거나
## "가방에 남는 여벌"이 있어야 하는데 우리는 둘 다 없다(보석은 원소
## 계층 몫, 가방은 애초에 없다 — 무기 한 자루뿐이니 "여벌 셋"이 생길
## 수가 없다). 부문만 우리 재료 구조(개수만 세는 주머니)에 자연스럽게
## 맞아 이것만 옮긴다.
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


func restore(saved_runes: Dictionary, saved_scrolls: int = 0) -> void:
	rune_counts.clear()
	for k in saved_runes:
		rune_counts[str(k)] = int(saved_runes[k])
	scrolls = maxi(0, saved_scrolls)
	materials_changed.emit()
