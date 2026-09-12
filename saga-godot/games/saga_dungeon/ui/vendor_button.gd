extends Button

## "제외" 목록 3번(행상/투전·감정·수리) — socket_button.gd와 같은 경계
## (HUD 버튼 하나가 ChoicePrompt로 여러 선택지를 연다). 원작의 행상이
## 하던 일 중 **재고 사고팔기(가방이 있어야 뜻이 생긴다)만 뺐다** —
## 감정서·물약 구매, 수리, 투전(무기/부적 한 점을 사서 바로 장착)은
## 전부 가방 없이도 되는 일이라 옮겼다.

const ChoicePrompt := preload("res://games/saga_go/ui/choice_prompt.gd")
const Toast := preload("res://saga_core/ui/toast.gd")


## vendor.js ilvl() — "내려가 본 깊이"를 따른다. 우리는 방 클리어 수로
## 근사한다(별도 깊이 추적 자체가 없다).
func _vendor_lv() -> int:
	return 1 + DungeonSaveState.rooms_cleared.count(true)


func _ready() -> void:
	pressed.connect(_on_pressed)


func _on_pressed() -> void:
	var lv := _vendor_lv()
	var choices: Array = []

	var scroll_cost := DungeonItems.scroll_price(lv)
	choices.append({
		"label": "📜 감정서 구매 (금 %d)" % scroll_cost,
		"cb": func() -> void: _buy_scroll(scroll_cost),
	})

	var potion_cost := DungeonPotionState.price(0, lv)
	choices.append({
		"label": "🍶 회복단(소) 구매 (금 %d)" % potion_cost,
		"cb": func() -> void: _buy_potion(potion_cost),
	})

	var repair_cost := DungeonEquipmentState.repair_all_cost()
	if repair_cost > 0:
		choices.append({
			"label": "🔧 장비 수리 (금 %d)" % repair_cost,
			"cb": func() -> void: _repair(repair_cost),
		})

	var gamble_weapon_cost := DungeonItems.gamble_price("weapon", lv)
	choices.append({
		"label": "🎲 투전: 무기 (금 %d)" % gamble_weapon_cost,
		"cb": func() -> void: _gamble("weapon", gamble_weapon_cost, lv),
	})

	var gamble_charm_cost := DungeonItems.gamble_price("charm", lv)
	choices.append({
		"label": "🎲 투전: 부적 (금 %d)" % gamble_charm_cost,
		"cb": func() -> void: _gamble("charm", gamble_charm_cost, lv),
	})

	## 감정 — 지금 걸친 것 중 미확인이 있고 감정서가 있을 때만 보여준다.
	## 무기부터 본다(socket_button.gd의 first_socketable_slot()과 같은 우선순위).
	if DungeonMaterialsState.scrolls > 0:
		var slot_name := ""
		if bool(DungeonEquipmentState.weapon.get("unid", false)):
			slot_name = "weapon"
		elif bool(DungeonEquipmentState.charm.get("unid", false)):
			slot_name = "charm"
		if slot_name != "":
			choices.append({
				"label": "🔎 감정하기 (감정서 1장)",
				"cb": func() -> void: _identify(slot_name),
			})

	ChoicePrompt.build(get_tree().current_scene, "🏪 행상", choices)


func _buy_scroll(cost: int) -> void:
	if not DungeonGoldState.spend(cost):
		Toast.show(self, "금이 모자라다.", 2.0)
		return
	DungeonMaterialsState.add_scroll(1)
	Toast.show(self, "📜 감정서를 샀다.", 2.0)


func _buy_potion(cost: int) -> void:
	if DungeonGoldState.gold < cost:
		Toast.show(self, "금이 모자라다.", 2.0)
		return
	var r := DungeonPotionState.add(0)
	if not bool(r.get("ok", false)):
		Toast.show(self, "벨트가 가득 찼다.", 2.0)
		return
	DungeonGoldState.spend(cost)
	Toast.show(self, "🍶 회복단(소)을 샀다.", 2.0)


func _repair(cost: int) -> void:
	if not DungeonGoldState.spend(cost):
		Toast.show(self, "금이 모자라다.", 2.0)
		return
	DungeonEquipmentState.repair_all()
	Toast.show(self, "🔧 장비를 수리했다.", 2.0)


## vendor.js gamble() — 부위만 정해져 있고 등급은 GAMBLE_W로 사고 나서
## 안다. 산 것은 즉시 장착(가방이 없어 loot_pickup.gd와 같은 경계) —
## 원작처럼 확인된 채로 온다.
func _gamble(slot_name: String, cost: int, lv: int) -> void:
	if not DungeonGoldState.spend(cost):
		Toast.show(self, "금이 모자라다.", 2.0)
		return
	var t := DungeonItems.roll_tier_gamble()
	var it := DungeonItems.roll(lv, slot_name, t, true)
	if slot_name == "charm":
		DungeonEquipmentState.equip_charm(it)
	else:
		DungeonEquipmentState.equip_weapon(it)
	var tier: Dictionary = DungeonItems.TIERS[it.tier]
	var lines := DungeonItems.item_lines(it)
	Toast.show(self, "🎲 %s · %s (%s)" % [tier.name, DungeonItems.item_name(it), " · ".join(lines)], 4.0)


func _identify(slot_name: String) -> void:
	if not DungeonMaterialsState.take_scroll():
		return
	DungeonEquipmentState.identify(slot_name)
	var it: Dictionary = DungeonEquipmentState.weapon if slot_name == "weapon" else DungeonEquipmentState.charm
	Toast.show(self, "🔎 감정 완료 — %s" % DungeonItems.item_name(it), 3.0)
