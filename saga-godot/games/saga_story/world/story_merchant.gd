extends Node3D

## VERTICAL_SLICE_STORY.md 1절 "제외" 목록 "장비/노획"의 상점 걸음.
##
## **재해석** — 원작(`js/ui.js` 'talk-shop')은 마을(허도) NPC 'merchant'와
## 대화해 여는 물목 화면(가방에 담고 따로 장착)이다. 이 슬라이스는 아직
## 마을이 없고(나머지 사냥터 8곳·문(portal)과 함께 묶인 별도 항목,
## docs/PROJECT_STATE.md 참고) 가방도 없다(줍는 즉시 장착하는 이 포트의
## 기존 규칙, story_gear_pickup.gd). 그래서 상인을 **이 사냥터 안에 하나
## 세워**, 다가가 상호작용하면 **아직 안 낀 부위 중 가장 싼 것을 즉시
## 사서 장착**하는 것으로 좁힌다 — 물목을 고르는 화면은 이번엔 안 만든다
## (다음에 볼 자리). "이동 상인"(side.js MERCHANT_DUR 할인 버프)도 이번엔
## 안 옮긴다 — 상점 자체가 없던 채였으니 기본 매매부터 검증한다.
##
## 가격(price)·상품 목록은 story_combat.gd GEAR_ITEMS를 그대로 읽는다 —
## 데이터를 새로 안 만든다(PLAN.md 7장).

const Toast := preload("res://saga_core/ui/toast.gd")
const StoryCombat := preload("res://games/saga_story/data/story_combat.gd")

const BODY_COLOR := Color(0.72, 0.18, 0.2)  # 상인 — 다른 NPC 도입 전까지 이 판 유일의 붉은 톤
const RANGE_RADIUS := 1.8

var _player_in_range := false
var _area: Area3D


func _ready() -> void:
	_spawn_visual()
	_spawn_area()


func _spawn_visual() -> void:
	var mi := MeshInstance3D.new()
	var mesh := CapsuleMesh.new()
	mesh.radius = 0.5
	mesh.height = 1.7
	mi.mesh = mesh
	mi.position = Vector3(0, 0.85, 0)
	var mat := StandardMaterial3D.new()
	mat.albedo_color = BODY_COLOR
	mi.material_override = mat
	add_child(mi)


func _spawn_area() -> void:
	_area = Area3D.new()
	_area.name = "MerchantRange"
	var cs := CollisionShape3D.new()
	var shape := SphereShape3D.new()
	shape.radius = RANGE_RADIUS
	cs.shape = shape
	_area.add_child(cs)
	_area.position = Vector3(0, 0.85, 0)
	_area.body_entered.connect(_on_range_entered)
	_area.body_exited.connect(_on_range_exited)
	add_child(_area)


func _on_range_entered(body: Node3D) -> void:
	if not body.is_in_group("player"):
		return
	_player_in_range = true
	Toast.show(self, "🏪 상인 — K: 물건을 산다", 2.0)


func _on_range_exited(body: Node3D) -> void:
	if not body.is_in_group("player"):
		return
	_player_in_range = false


## story_player.gd `_physics_process()`와 같은 폴링 방식(Input.is_action_
## just_pressed) — 이 판은 `_unhandled_input` 이벤트 콜백을 안 쓴다.
func _process(_delta: float) -> void:
	if _player_in_range and Input.is_action_just_pressed("story_interact"):
		_buy_cheapest_missing()


## 안 낀 부위 중 price가 가장 싼 것부터 산다 — 원작의 "고르는" 화면이
## 없으니 "가장 도움이 되는 것"을 매번 결정적으로 골라 준다.
func _buy_cheapest_missing() -> void:
	var cheapest_key := ""
	var cheapest_price := -1
	for key: String in StoryCombat.GEAR_ITEMS:
		var it: Dictionary = StoryCombat.GEAR_ITEMS[key]
		if StorySaveState.has_slot(String(it.slot)):
			continue
		var price := int(it.price)
		if cheapest_key.is_empty() or price < cheapest_price:
			cheapest_key = key
			cheapest_price = price

	if cheapest_key.is_empty():
		Toast.show(self, "🏪 이미 다 갖췄다", 2.0)
		return

	if not StorySaveState.spend_gold(cheapest_price):
		Toast.show(self, "🪙 금이 모자라다 (%d / 보유 %d)" % [cheapest_price, StorySaveState.gold], 2.5)
		return

	StorySaveState.equip_gear(cheapest_key)
	var it: Dictionary = StoryCombat.GEAR_ITEMS[cheapest_key]
	Toast.show(self, "🏪 %s 구매 · 🪙 -%d" % [String(it.name), cheapest_price], 2.5)
