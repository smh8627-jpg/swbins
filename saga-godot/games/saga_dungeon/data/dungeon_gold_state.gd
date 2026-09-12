extends Node

## "제외" 목록 3번(행상/투전/연단·단약/요대·감정·창고) — 지갑 하나.
## dungeon.js `core.save.player.gold`와 같은 자리, 우리는 DUNGEON 전용
## 세이브(dungeon_save_state.gd)에 같이 담는다.
##
## project.godot [autoload]에 DungeonGoldState로 등록.

signal gold_changed

var gold: int = 0


func add(n: int) -> void:
	if n == 0:
		return
	gold = maxi(0, gold + n)
	gold_changed.emit()


## 모자라면 아무것도 안 하고 false — 호출 쪽이 먼저 gold를 확인할 필요 없이
## 이 하나로 "낼 수 있으면 내고 성공"까지 끝낸다.
func spend(n: int) -> bool:
	if n <= 0 or gold < n:
		return false
	gold -= n
	gold_changed.emit()
	return true


func restore(saved: int) -> void:
	gold = maxi(0, saved)
	gold_changed.emit()
