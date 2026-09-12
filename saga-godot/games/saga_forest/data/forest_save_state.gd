extends Node

## VERTICAL_SLICE_FOREST.md 4절 "저장/불러오기(위치+채집한 과일 개수
## 정도, GO/DUNGEON과 같은 최소 범위)". GO save_state.gd·DUNGEON
## dungeon_save_state.gd와 같은 정신(로컬 파일 하나, 버전 필드)이지만
## 파일·스키마는 완전히 분리한다 — DUNGEON이 이미 세운 "게임별 분리"
## 선례(dungeon_save_state.gd 상단 주석 참고) 그대로.
##
## project.godot [autoload]에 ForestSaveState로 등록.
##
## 2번째 확장(제외 목록 1번 — 나무 이외 채집 대상 + 진짜 하루 1회 리셋) —
## 나무 하나짜리 fruit_count(int)를 여러 채집물을 담는 items(Dictionary)로
## 바꿨다. **필드 모양 자체가 바뀌는 진짜 스키마 변경**이라(GO
## save_state.gd·DUNGEON dungeon_save_state.gd가 세운 기준과 같음 — 추가만
## 이면 버전을 안 올리지만 이건 바꿔치기다) SAVE_VERSION을 1→2로 올리고
## _migrate_step()에 옛 fruit_count 하나를 items["과일"]로 옮기는 경로를
## 처음으로 채웠다.

const SAVE_PATH := "user://save_forest.json"
const SAVE_VERSION := 2

var items: Dictionary = {}  # item_label(String) -> count(int)

## prop_id(String) -> day_key(int, ForestDay.today_key()). 웹판
## village.js의 st().used와 같은 뜻 — "이 채집 대상을 마지막으로 쓴 날".
var used: Dictionary = {}

## 3번째 확장(제외 목록 3번 — 주민 5명 전체 + 부탁·선물) — 전부 순수
## 추가 필드다(모양이 바뀌는 게 아니라 새 키가 느는 것뿐, GO save_state.gd
## 기준으로 버전을 안 올려도 되는 경우). 없으면 빈 값으로 안전하게 채워짐.
var gold := 0
var met: Dictionary = {}          # npc_id(String) -> true(만난 적 있음)
var quests_done: Dictionary = {}  # npc_id(String) -> true(부탁을 마침)
var gifted: Dictionary = {}       # npc_id(String) -> day_key(마지막으로 선물한 날)
var affinity: Dictionary = {}     # npc_id(String) -> int(친밀도)

## 4번째 확장(제외 목록 4번 — 곤충/화석/조개 + 박물관) — 역시 순수 추가.
var tools: Dictionary = {}  # tool_key(String) -> true(예: "spade")
var museum_donated := 0     # 사고에 기증한 누적 개수(종 수가 아니라 총합 —
                             # 이 슬라이스엔 종 카탈로그가 없어 단순화, 근거는
                             # museum.gd 상단 주석)

## 5번째 확장(제외 목록 5번 — 순무 시세) — 역시 순수 추가. 가진 것만
## 남긴다는 웹판 turnip.js 원칙 그대로: {n, buy, week} 셋뿐, 시세는
## ForestTurnip이 주 번호에서 다시 계산한다(저장 안 함).
var turnip: Dictionary = {}  # {"n": int, "buy": int, "week": int} 또는 빈 딕셔너리(없음)


func can_gather(prop_id: String) -> bool:
	return int(used.get(prop_id, -1)) != ForestDay.today_key()


func mark_gathered(prop_id: String) -> void:
	used[prop_id] = ForestDay.today_key()


func add_item(item_label: String, amount: int) -> void:
	items[item_label] = int(items.get(item_label, 0)) + amount


func item_count(item_label: String) -> int:
	return int(items.get(item_label, 0))


func total_items() -> int:
	var total := 0
	for v in items.values():
		total += int(v)
	return total


func mark_met(npc_id: String) -> void:
	met[npc_id] = true


func met_count() -> int:
	return met.size()


func is_quest_done(npc_id: String) -> bool:
	return bool(quests_done.get(npc_id, false))


func mark_quest_done(npc_id: String) -> void:
	quests_done[npc_id] = true


func add_gold(amount: int) -> void:
	gold += amount


func gifted_today(npc_id: String) -> bool:
	return int(gifted.get(npc_id, -1)) == ForestDay.today_key()


func mark_gifted(npc_id: String) -> void:
	gifted[npc_id] = ForestDay.today_key()


func add_affinity(npc_id: String, amount: int) -> void:
	affinity[npc_id] = int(affinity.get(npc_id, 0)) + amount


func has_tool(tool_key: String) -> bool:
	return bool(tools.get(tool_key, false))


## gold가 모자라거나 이미 갖고 있으면 아무것도 안 하고 false.
func buy_tool(tool_key: String, price: int) -> bool:
	if has_tool(tool_key) or gold < price:
		return false
	gold -= price
	tools[tool_key] = true
	return true


func donate_to_museum(item_label: String) -> bool:
	if item_count(item_label) <= 0:
		return false
	items[item_label] = item_count(item_label) - 1
	museum_donated += 1
	return true


func has_turnip() -> bool:
	return int(turnip.get("n", 0)) > 0


## 산 주가 지나면 썩는다(웹판 rotten()) — 다음 일요일이 오면 값이
## ROT_PRICE(10)로 뚝 떨어진다.
func turnip_rotten() -> bool:
	return has_turnip() and int(turnip.get("week", -1)) != ForestTurnip.week()


func turnip_now_price() -> int:
	return ForestTurnip.ROT_PRICE if turnip_rotten() else ForestTurnip.sell_price()


## 웹판 turnip.js::buy()를 그대로 옮김 — 실패 이유를 문자열로 돌려주고
## (성공하면 빈 문자열), 실제 거래(골드 차감·turnip 갱신)는 여기서 한다.
## n은 열 개 단위로 내림한다(웹판 UNIT).
func buy_turnip(n: int) -> String:
	if not ForestTurnip.market_open():
		return "순무 장은 일요일 오전에만 섭니다"
	var buy_n: int = int(floor(float(n) / ForestTurnip.UNIT)) * ForestTurnip.UNIT
	if buy_n <= 0:
		return "열 개 단위로만 살 수 있다"
	if turnip_rotten():
		return "썩은 순무가 남아 있다 — 먼저 처분하게"
	var already: int = int(turnip.get("n", 0))
	if already + buy_n > ForestTurnip.MAX_BUY:
		return "한 주에 %d개까지다(지금 %d)" % [ForestTurnip.MAX_BUY, already]
	var price: int = ForestTurnip.buy_price()
	var cost: int = price * buy_n
	if gold < cost:
		return "골드가 모자란다 (🪙%d 필요)" % cost
	gold -= cost
	var total_cost: int = int(turnip.get("buy", 0)) * already + cost
	var total_n: int = already + buy_n
	turnip = {"n": total_n, "buy": int(round(float(total_cost) / float(total_n))), "week": ForestTurnip.week()}
	return ""


## 가진 것을 다 판다(웹판 sellAll()). 실패 이유 또는 결과 설명을 그대로
## 돌려준다(다르게 성공/실패를 나누는 대신, 호출부가 has_turnip()으로
## 성공 여부를 먼저 확인하고 이 문자열을 토스트로 보여준다).
func sell_turnip() -> String:
	if not has_turnip():
		return "가진 순무가 없다"
	if ForestTurnip.dow() == 0 and not turnip_rotten():
		return "일요일에는 전방이 순무를 받지 않는다"
	var price: int = turnip_now_price()
	var n: int = int(turnip.get("n", 0))
	var revenue: int = price * n
	var cost: int = int(turnip.get("buy", 0)) * n
	var profit: int = revenue - cost
	gold += revenue
	turnip = {}
	return "🥬 순무 %d개를 팔았다 (개당 🪙%d) — %s%d" % \
		[n, price, "이문 🪙+" if profit >= 0 else "밑진 것 🪙", absi(profit)]


func save() -> bool:
	var player := _find_player()
	if player == null:
		return false
	var data := {
		"version": SAVE_VERSION,
		"player_pos": [player.global_position.x, player.global_position.y, player.global_position.z],
		"items": items,
		"used": used,
		"gold": gold,
		"met": met,
		"quests_done": quests_done,
		"gifted": gifted,
		"affinity": affinity,
		"tools": tools,
		"museum_donated": museum_donated,
		"turnip": turnip,
	}
	var f := FileAccess.open(SAVE_PATH, FileAccess.WRITE)
	if f == null:
		return false
	f.store_string(JSON.stringify(data))
	return true


func try_load() -> bool:
	if not FileAccess.file_exists(SAVE_PATH):
		return false
	var f := FileAccess.open(SAVE_PATH, FileAccess.READ)
	if f == null:
		return false
	var parsed: Variant = JSON.parse_string(f.get_as_text())
	if typeof(parsed) != TYPE_DICTIONARY:
		return false
	var migrated: Variant = _migrate(parsed)
	if migrated == null:
		return false
	var data: Dictionary = migrated

	var loaded_items: Variant = data.get("items", {})
	items = loaded_items if typeof(loaded_items) == TYPE_DICTIONARY else {}
	var loaded_used: Variant = data.get("used", {})
	used = loaded_used if typeof(loaded_used) == TYPE_DICTIONARY else {}

	gold = int(data.get("gold", 0))
	var loaded_met: Variant = data.get("met", {})
	met = loaded_met if typeof(loaded_met) == TYPE_DICTIONARY else {}
	var loaded_quests_done: Variant = data.get("quests_done", {})
	quests_done = loaded_quests_done if typeof(loaded_quests_done) == TYPE_DICTIONARY else {}
	var loaded_gifted: Variant = data.get("gifted", {})
	gifted = loaded_gifted if typeof(loaded_gifted) == TYPE_DICTIONARY else {}
	var loaded_affinity: Variant = data.get("affinity", {})
	affinity = loaded_affinity if typeof(loaded_affinity) == TYPE_DICTIONARY else {}
	var loaded_tools: Variant = data.get("tools", {})
	tools = loaded_tools if typeof(loaded_tools) == TYPE_DICTIONARY else {}
	museum_donated = int(data.get("museum_donated", 0))
	var loaded_turnip: Variant = data.get("turnip", {})
	turnip = loaded_turnip if typeof(loaded_turnip) == TYPE_DICTIONARY else {}

	var pos: Array = data.get("player_pos", [])
	if pos.size() != 3:
		return false
	var player := _find_player()
	if player != null:
		player.global_position = Vector3(float(pos[0]), float(pos[1]), float(pos[2]))
	return true


## GO save_state.gd·DUNGEON dungeon_save_state.gd와 완전히 같은 계약 —
## 버전이 낮으면 _migrate_step()을 한 단계씩 적용, 경로가 없거나(null)
## 이 빌드보다 나중 버전(다운그레이드)이면 null.
func _migrate(data: Dictionary) -> Variant:
	var version := int(data.get("version", 0))
	while version < SAVE_VERSION:
		var stepped: Variant = _migrate_step(version, data)
		if stepped == null:
			return null
		data = stepped
		version = int(data.get("version", version + 1))
	if version > SAVE_VERSION:
		return null
	return data


func _migrate_step(from_version: int, data: Dictionary) -> Variant:
	match from_version:
		1:
			## 나무 하나뿐이던 시절의 fruit_count를 items["과일"]로.
			data["items"] = {"과일": int(data.get("fruit_count", 0))}
			data["used"] = {}
			data.erase("fruit_count")
			data["version"] = 2
			return data
		_:
			return null


func _find_player() -> Node3D:
	var found := get_tree().get_nodes_in_group("player")
	return found[0] if found.size() > 0 else null
