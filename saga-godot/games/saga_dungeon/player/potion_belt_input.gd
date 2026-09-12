extends Node

## "제외" 목록 3번(단약/요대) — 원작처럼 1·2·3·4가 벨트 네 칸이다
## (potion.js 헤더 "손가락이 가장 자주 가는 자리"). melee_attack.gd와
## 같은 경계(Player 자식 컴포넌트, 입력 하나를 받는 자리).

const Toast := preload("res://saga_core/ui/toast.gd")


func _process(_delta: float) -> void:
	for i in range(DungeonPotionState.SLOTS):
		if Input.is_action_just_pressed("potion_%d" % (i + 1)):
			_use(i)


func _use(slot: int) -> void:
	var r := DungeonPotionState.use(slot)
	if not bool(r.get("ok", false)):
		return
	var g := DungeonPotionState.grade_of(int(r.g))
	Toast.show(self, "🍶 %s 회복단을 마셨다." % g.name, 2.0)
