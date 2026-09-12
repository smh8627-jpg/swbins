extends Node

## "제외" 목록 6번(결사) — 웹판 `dungeon.js`의 결사(決死)/hardcore(). **켜는
## 것은 되돌릴 수 없다** — 되돌릴 수 있으면 그건 하드코어가 아니다(원작
## 주석 그대로). 켜진 채로 쓰러지면(플레이어 hp 0) 그 판이 통째로 끝난다.
##
## 웹판은 "이 프로필은 못 내려간다 — 새 이름으로 시작하세요"다(여러 이름의
## 세이브 프로필이 있어서). 우리는 세이브가 하나뿐이라(user://save_dungeon.
## json) 그 문구를 그대로 못 옮긴다 — 대신 스러진 순간 화면을 통째로
## 멈춘다(`get_tree().paused = true`, player_health.gd 참고). 저장 파일은
## 안 지운다 — "새로 시작"하려면 사용자가 직접 지워야 한다(원작의 "새
## 이름"에 해당하는 유일한 길).
##
## project.godot [autoload]에 DungeonHardcoreState로 등록.

signal hardcore_changed
signal fallen_changed

var hardcore: bool = false
var fallen: Dictionary = {} # {} 면 안 스러짐, 아니면 {"floor": n, "at": unix_time}


## 웹판 setHardcore() — 이미 켜져 있으면 아무 일도 안 한다(그래서 bool을
## 돌려준다 — 호출 쪽이 "이미 결사입니다" 안내를 가릴지 정할 수 있게).
func enable() -> bool:
	if hardcore:
		return false
	hardcore = true
	hardcore_changed.emit()
	return true


## player_health.gd가 hp 0에 처음 닿았을 때만 부른다 — 이미 스러졌으면
## 아무 일도 안 한다(원작도 fallen은 한 번 정해지면 안 바뀐다).
func mark_fallen(floor_num: int) -> void:
	if not fallen.is_empty():
		return
	fallen = {"floor": floor_num, "at": Time.get_unix_time_from_system()}
	fallen_changed.emit()


func restore(saved_hardcore: bool, saved_fallen: Dictionary) -> void:
	hardcore = saved_hardcore
	fallen = saved_fallen.duplicate()
	hardcore_changed.emit()
	fallen_changed.emit()
