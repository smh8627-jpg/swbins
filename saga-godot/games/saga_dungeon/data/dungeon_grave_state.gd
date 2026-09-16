extends Node

## PLAN 101-2 DUNGEON ②(유품, 2026-09-17) — saga-web/saga-dungeon/PLAN.md
## §5.2 "유품(遺品) — 죽음 비용과 회수, 죽어도 남는 것"을 옮긴다.
##
## 웹 원안은 "사망 시 안 가져온 노획물(금·장비·재료)이 그 층에 남는다"인데,
## 이 슬라이스엔 그 전제(노획물이 '가방'에 있다가 마을에 가야 정산되는
## 위험 구간)가 없다 — 줍는 즉시 금은 지갑에, 장비는 몸에 영구히 들어간다
## (loot_pickup.gd 헤더 "노획물 정산을 안 탄다" 그대로). 그래서 "위험에
## 걸 것"을 **이미 갖고 있던 지갑 일부 + 지금 장착 중인 무기·부적**으로
## 다시 정했다 — player_health.gd::_die_and_respawn()이 실제로 떼어 낸다.
## 결사(하드코어)는 그대로 dungeon_hardcore_state.gd 몫이라 이 상태는
## 안 건드린다(비결사 사망에만 적용).
##
## 웹 5.2 "장비는 3점까지 선택 회수"는 이 슬라이스가 부위 2개(무기·부적)만
## 잃으므로 선택 UI 없이 통째로 돌려준다(claim() 참고). "회수 전에 다시
## 죽으면 옛 유품 소멸(1개만 유지)"은 grave를 그냥 덮어쓰는 것으로 —
## loot_pickup.gd::spawn_grave_at()이 새 마커를 세우기 전에 옛 마커를
## 지운다.
##
## project.godot [autoload]에 DungeonGraveState로 등록.

signal grave_changed

## {} 면 유품 없음. 있으면 {pos:[x,y,z], gold:int, weapon:Dictionary, charm:Dictionary}.
var grave: Dictionary = {}


func has_grave() -> bool:
	return not grave.is_empty()


func set_grave(pos: Vector3, gold: int, weapon: Dictionary, charm: Dictionary) -> void:
	grave = {
		"pos": [pos.x, pos.y, pos.z],
		"gold": gold,
		"weapon": weapon,
		"charm": charm,
	}
	grave_changed.emit()


func grave_position() -> Vector3:
	var p: Array = grave.get("pos", [0.0, 0.0, 0.0])
	return Vector3(float(p[0]), float(p[1]), float(p[2]))


## loot_pickup.gd::spawn_grave_at()의 마커가 밟혔을 때만 부른다 — 지갑·
## 장비를 실제로 돌려주고 자리를 비운다. 되찾은 무기/부적이 비어 있으면
## (죽었을 때 맨손이었으면) 지금 장착 중인 것을 안 건드린다.
func claim() -> void:
	if grave.is_empty():
		return
	DungeonGoldState.add(int(grave.get("gold", 0)))
	var weapon: Dictionary = grave.get("weapon", {})
	var charm: Dictionary = grave.get("charm", {})
	if not weapon.is_empty():
		DungeonEquipmentState.equip("weapon", weapon)
	if not charm.is_empty():
		DungeonEquipmentState.equip("charm", charm)
	grave = {}
	grave_changed.emit()


func restore(saved: Dictionary) -> void:
	grave = saved.duplicate(true)
	grave_changed.emit()
