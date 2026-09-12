extends RefCounted

## VERTICAL_SLICE_DUNGEON.md 5절 — "노획". dungeon_enemy.gd가 죽을 때 이
## 정적 헬퍼로 하나 세운다(toast.gd·choice_prompt.gd와 같은 "여러 곳이
## 필요로 하면 공용 헬퍼로 뽑는다" 경계).
##
## "제외" 목록 3번(장비 등급+접사) 이후 — DungeonItems.roll()로 등급+접사가
## 있는 물건을 굴려 즉시 장착한다(가방이 없어 줍는 즉시 갈아 든다).
##
## "제외" 목록 2번(소켓+부문어·투장·내구) — roll()이 이제 무기·부적을
## 안 가리고 굴리므로(웹판 dropItem()과 같은 방식) **어느 부위가 나왔는지
## 보고** 장착한다. 또 dungeon.js::dropMat()의 부문(룬) 갈래를 옮겨,
## 같은 킬에 독립된 확률로 부문 하나가 따로 떨어질 수 있다(재료는 즉시
## 주머니로 — 웹판과 같은 규칙, "노획물 정산"을 안 탄다).
##
## "제외" 목록 3번(행상/투전/연단·단약/요대·감정·창고) — dungeon.js의
## 잡졸 킬 드롭 표(2481~2498줄)를 그대로 옮겨 **금·단약·감정서**를
## 더했다. 이때 발견한 오차 하나 — **"부문(룬)" 확률을 이전에 잘못
## 옮겼었다.** 원작은 이중 구조다: 먼저 dropMat() 자체가 불릴 확률
## (잡졸 12%)이 있고, dropMat() 안에서야 주옥(floor<4는 없음)·룬(22%)·
## 보석(나머지) 셋으로 갈린다 — 즉 실제 룬 드롭률은 0.12×0.22≈2.6%인데
## 이전 세션은 안쪽 22%만 보고 그걸 바깥 확률로 썼다(실제로는 8배 더
## 자주 나오고 있었다). 우리는 보석·주옥이 아예 없으니 "재료 드롭이
## 일어나면(12%) 늘 룬"으로 단순화해 고쳤다 — 안쪽 22%를 licensing 버리지
## 않고 "우리가 가진 유일한 재료로 수렴시킨다"는 뜻.
##
## 잡졸(정예·보스 아님) 기준 확률 그대로: 금은 확정, 룬 12%, 단약 16%,
## 감정서 7%. 장비 드롭은 이전 세션에서 이미 "매번 확정"으로 잡아 뒀던
## 것을 그대로 둔다(원작의 0.2~0.35 확률보다 후하지만, 이미 검증·커밋된
## 동작을 이번 범위 밖에서 바꾸지 않는다).

const Toast := preload("res://saga_core/ui/toast.gd")
const TOAST_SEC := 4.0
const TRIGGER_RADIUS := 1.4
const RUNE_DROP_CHANCE := 0.12 # dungeon.js "e.boss?0.9:0.12"(dropMat 호출 확률) 그대로
const POTION_DROP_CHANCE := 0.16 # dungeon.js "e.boss?1:(elK?0.34:0.16)" 그대로
const SCROLL_DROP_CHANCE := 0.07 # dungeon.js "e.boss?0.8:0.07" 그대로
const RUNE_COLOR := Color(0.94, 0.65, 0.22) # dungeon.js take()의 룬 색('#f0a53a') 그대로
const GOLD_COLOR := Color(1.0, 0.84, 0.2)
const POTION_COLOR := Color(0.75, 0.22, 0.17) # potion.js KINDS.heal.color '#c0392b' 그대로
const SCROLL_COLOR := Color(0.56, 0.78, 1.0)


static func spawn_at(parent: Node, pos: Vector3, ilvl: int) -> void:
	var it := DungeonItems.roll(ilvl)
	var tier: Dictionary = DungeonItems.TIERS[it.tier]
	var b := DungeonItems.base_by_key(str(it.base))
	var slot_name := str(b.get("slot", "weapon"))

	var area := Area3D.new()
	area.name = "LootPickup"
	area.position = pos

	var mi := MeshInstance3D.new()
	var mesh := BoxMesh.new()
	mesh.size = Vector3(0.5, 0.5, 0.5)
	mi.mesh = mesh
	mi.position = Vector3(0, 0.4, 0)
	var mat := StandardMaterial3D.new()
	## 등급색 그대로(data-item.js 원작 색) — "색만 보고 줍는다"는 반사신경을
	## 이 슬라이스에서도 살린다.
	mat.albedo_color = Color(String(tier.color))
	mat.metallic = 0.4
	mi.material_override = mat
	area.add_child(mi)

	var cs := CollisionShape3D.new()
	var shape := SphereShape3D.new()
	shape.radius = TRIGGER_RADIUS
	cs.shape = shape
	area.add_child(cs)

	parent.add_child(area)
	area.body_entered.connect(func(body: Node3D) -> void:
		if body.is_in_group("player"):
			if slot_name == "charm":
				DungeonEquipmentState.equip_charm(it)
			else:
				DungeonEquipmentState.equip_weapon(it)
			var lines := DungeonItems.item_lines(it)
			Toast.show(area, "🎁 %s · %s (%s)" % [tier.name, DungeonItems.item_name(it), " · ".join(lines)], TOAST_SEC)
			area.queue_free()
	)

	_spawn_gold(parent, pos + Vector3(-0.6, 0, -0.6), ilvl)
	if randf() < RUNE_DROP_CHANCE:
		_spawn_rune(parent, pos + Vector3(0.6, 0, 0.6), ilvl)
	if randf() < POTION_DROP_CHANCE:
		_spawn_potion(parent, pos + Vector3(0.6, 0, -0.6), ilvl)
	if randf() < SCROLL_DROP_CHANCE:
		_spawn_scroll(parent, pos + Vector3(-0.6, 0, 0.6))


## dungeon.js dropGold()의 잡졸(mul=1) 갈래 그대로 — 은사+장비 goldPct까지
## DungeonRunState.gold_mult()가 이미 합산해 준다.
static func _spawn_gold(parent: Node, pos: Vector3, floor_num: int) -> void:
	var amount := int(roundf(5.0 * pow(1.19, float(floor_num) - 1.0) * DungeonRunState.gold_mult()))
	if amount <= 0:
		return

	var area := _pickup_area("GoldPickup", pos, GOLD_COLOR, BoxMesh.new())
	(area.get_node("Mesh").mesh as BoxMesh).size = Vector3(0.35, 0.35, 0.35)
	parent.add_child(area)
	area.body_entered.connect(func(body: Node3D) -> void:
		if body.is_in_group("player"):
			DungeonGoldState.add(amount)
			Toast.show(area, "💰 금 +%d" % amount, 2.0)
			area.queue_free()
	)


static func _spawn_rune(parent: Node, pos: Vector3, floor_num: int) -> void:
	var key := DungeonItems.roll_rune_drop(floor_num)
	if key == "":
		return
	var r := DungeonItems.rune_by_key(key)

	var mesh := SphereMesh.new()
	mesh.radius = 0.28
	mesh.height = 0.56
	var area := _pickup_area("RunePickup", pos, RUNE_COLOR, mesh)
	parent.add_child(area)
	area.body_entered.connect(func(body: Node3D) -> void:
		if body.is_in_group("player"):
			DungeonMaterialsState.add_rune(key)
			Toast.show(area, "🪨 부문 획득 · %s(%s)" % [r.glyph, r.name], TOAST_SEC)
			area.queue_free()
	)


## potion.js rollDrop(floor)의 등급 갈래만(종류는 회복단 고정 — DungeonPotionState
## 헤더 참고). 벨트가 차 있으면 못 줍는다(원작과 같다, 바닥에 그대로 남는다
## — 이 슬라이스는 안 사라지고 그대로 있는 것으로 충분히 지킨다).
static func _spawn_potion(parent: Node, pos: Vector3, floor_num: int) -> void:
	var g := DungeonPotionState.roll_drop_grade(floor_num)
	var gd := DungeonPotionState.grade_of(g)

	var mesh := SphereMesh.new()
	mesh.radius = 0.26
	mesh.height = 0.52
	var area := _pickup_area("PotionPickup", pos, POTION_COLOR, mesh)
	parent.add_child(area)
	area.body_entered.connect(func(body: Node3D) -> void:
		if body.is_in_group("player"):
			var r := DungeonPotionState.add(g)
			if bool(r.get("ok", false)):
				Toast.show(area, "🍶 %s 회복단 획득" % gd.name, TOAST_SEC)
				area.queue_free()
			## 벨트가 차 있으면 못 줍는다 — area는 그대로 남아 다시 시도할 수 있다.
	)


static func _spawn_scroll(parent: Node, pos: Vector3) -> void:
	var mesh := BoxMesh.new()
	mesh.size = Vector3(0.3, 0.42, 0.06)
	var area := _pickup_area("ScrollPickup", pos, SCROLL_COLOR, mesh)
	parent.add_child(area)
	area.body_entered.connect(func(body: Node3D) -> void:
		if body.is_in_group("player"):
			DungeonMaterialsState.add_scroll(1)
			Toast.show(area, "📜 감정서 획득", TOAST_SEC)
			area.queue_free()
	)


## 네 가지 픽업(무기/부적·금·룬·단약·감정서)이 공유하는 뼈대 — Area3D +
## 색 있는 메시 + 트리거 반경. body_entered 연결은 호출 쪽이 각자 잇는다.
static func _pickup_area(node_name: String, pos: Vector3, color: Color, mesh: Mesh) -> Area3D:
	var area := Area3D.new()
	area.name = node_name
	area.position = pos

	var mi := MeshInstance3D.new()
	mi.name = "Mesh"
	mi.mesh = mesh
	mi.position = Vector3(0, 0.35, 0)
	var mat := StandardMaterial3D.new()
	mat.albedo_color = color
	mat.metallic = 0.5
	mi.material_override = mat
	area.add_child(mi)

	var cs := CollisionShape3D.new()
	var shape := SphereShape3D.new()
	shape.radius = TRIGGER_RADIUS
	cs.shape = shape
	area.add_child(cs)
	return area
