extends Node

## "제외" 목록 2번(소켓+부문어) — 부문(符文/룬) 주머니. item.js의 addMat()/
## matCount()와 같은 경계(개수만 세는 재료, 주옥처럼 낱개 id를 안 쓴다) —
## 우리는 보석·주옥을 이 슬라이스에서 안 옮겨서 rune 한 종류만 있다.
##
## project.godot [autoload]에 DungeonMaterialsState로 등록.

signal materials_changed

var rune_counts: Dictionary = {} # key(String) -> count(int)


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


func restore(saved: Dictionary) -> void:
	rune_counts.clear()
	for k in saved:
		rune_counts[str(k)] = int(saved[k])
	materials_changed.emit()
