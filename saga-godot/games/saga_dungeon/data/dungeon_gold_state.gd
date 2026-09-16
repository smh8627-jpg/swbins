extends Node

## "제외" 목록 3번(행상/투전/연단·단약/요대·감정·창고) — 지갑 하나.
## dungeon.js `core.save.player.gold`와 같은 자리, 우리는 DUNGEON 전용
## 세이브(dungeon_save_state.gd)에 같이 담는다.
##
## project.godot [autoload]에 DungeonGoldState로 등록.

signal gold_changed

var gold: int = 0

## 표준 A/B(목표판·세션 카드, PLAN.md 101-1·101-4) — GO party_state.gd
## begin_session()/session_exp_gained()과 같은 계약: 로드가 끝난 뒤(세이브
## 값을 이미 반영한 뒤) 한 번 불러 기준점을 잡고, 그 뒤로 늘어난 만큼만
## "이번 세션" 값으로 보여준다. 세이브엔 안 남는다(세션 경계는 씬을 새로
## 여는 순간이라서 — 저장 파일에 남길 값이 아니다).
var _session_start_gold: int = 0


func begin_session() -> void:
	_session_start_gold = gold


func session_gold_gained() -> int:
	return gold - _session_start_gold


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
