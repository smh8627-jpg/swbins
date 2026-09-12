extends Node3D

## VERTICAL_SLICE_DUNGEON.md 1·5절 — DUNGEON 첫 방(고분 테마). CC0 Kenney
## Modular Cave Kit(assets/dungeon/, GO의 동굴 입구 gate-rock.glb와 같은
## 킷 — 이미 받아 둔 것을 재사용, 새 킷 다운로드 없음)의 room-small.glb
## (실측 12x4.4x12, 바닥 중앙 피벗 — 측정 스크립트로 직접 확인)를 쓴다.
## 이 GLB엔 충돌이 없어(단순 장식 메시라 Godot이 자동 생성 안 함) 벽·
## 바닥은 직접 만든다(GO의 terrain_builder.gd와 같은 방식) — 한쪽 벽에는
## 출구(gate.glb, 실측 폭 4.4) 폭만큼 틈을 낸다.
##
## "제외" 목록 2번(층 전체 — 여러 방 연결) 최소 착수 — §28-8 "진짜 이어진
## 세계" A안(웹판, 완전한 오픈월드)은 여전히 더 큰 다음 슬라이스 몫이다.
## 이번엔 그 정신(로딩 없이 걸어서 이어진다)만 가장 작게 증명한다: 방을
## `ROOM_COUNT`개 한 씬 안에 나란히 세우고 같은 킷의 `corridor.glb`
## (실측 4.0x4.05x4.0, 바닥 중앙 피벗 — 측정 스크립트로 확인)로 잇는다.
## 방 사이를 오갈 때 씬 전환이 전혀 없다 — 문을 지나면 그냥 다음 방이다.

const GLBUtils := preload("res://games/saga_go/world/glb_utils.gd")
const DungeonEnemy := preload("res://games/saga_dungeon/world/dungeon_enemy.gd")
const DungeonHeroEncounter := preload("res://games/saga_dungeon/world/dungeon_hero_encounter.gd")
const Toast := preload("res://saga_core/ui/toast.gd")
## GO의 사건 선택지 패널을 그대로 재사용한다(GLBUtils·Toast와 같은 cross-game
## 재사용 경계 — GO 전용 로직이 아니라 순수 UI 빌더라 옮길 필요가 없다).
const ChoicePrompt := preload("res://games/saga_go/ui/choice_prompt.gd")
const Characters := preload("res://saga_core/data/characters.gd")

const ROOM_GLB := "res://assets/dungeon/room-small.glb"
const GATE_GLB := "res://assets/dungeon/gate.glb"
const CORRIDOR_GLB := "res://assets/dungeon/corridor.glb"

## "제외" 목록 7번(보스층) — 방 하나 늘려 3개로. data-dungeon.js
## `isBossFloor(floor) = floor % 3 === 0`을 그대로 옮기면 이 슬라이스에서
## 방=층 취급(각 방의 floor_num은 i+1)이라 마지막 방(floor_num=3)이 정확히
## 보스 층이다 — 그 방의 잡졸 자리를 보스로 바꾼다(새 방 구조를 안 만든다).
const ROOM_COUNT := 3

## "제외" 목록 5번(인물 등용) — 방마다 실제 역사 인물 하나씩(saga_core
## 105명 중 새로 골랐다 — GO가 이미 kr_yisunsin을 쓰고 있어 안 겹치게).
## 둘 다 삼국지·rarity 5(기질이 처음엔 가려진다, GO의 "기질 불명 ❓"과
## 같은 경로도 같이 검증된다) — 하나는 virtue(은창), 하나는 wisdom(현책).
const ROOM_HERO_IDS: Array[String] = ["sg_zhaoyun", "sg_zhugeliang"]

## "제외" 목록 5번(출사표) — 웹판 starter.js의 문턱(희귀도 낮은 인물만
## 시작에 고른다)을 그대로 옮겼다. 원작은 정해진 셋을 주지만, 이 판은
## "누구를 등용했는가"가 핵심이라(root CLAUDE.md 첫 줄) 후보 중 직접
## 고르게 했다 — 새 UI가 아니라 기존 ChoicePrompt를 그대로 재사용.
const STARTER_PICK_COUNT := 3
const STARTER_POOL_SIZE := 5
const STARTER_RARITY_CAP := 3

const ROOM_HALF := Vector3(6.0, 0.0, 6.0)
const WALL_HEIGHT := 4.4
const WALL_THICK := 1.0
const GATE_HALF_WIDTH := 2.2 # gate.glb 실측 폭(4.4)의 절반

const CORRIDOR_TILE_LEN := 4.0 # corridor.glb 실측 깊이(측정 스크립트로 확인)
const CORRIDOR_TILES_PER_GAP := 2 # 방 사이 복도 길이 = 4.0 * 2 = 8.0
const CORRIDOR_HALF_WIDTH := 2.0 # corridor.glb 실측 폭의 절반
const CORRIDOR_GAP := CORRIDOR_TILE_LEN * CORRIDOR_TILES_PER_GAP
const ROOM_SPACING := ROOM_HALF.z * 2.0 + CORRIDOR_GAP # 방 원점 사이 거리(z)

var _exit_used: Array[bool] = []
var _room_origin_z: Array[float] = []


func _ready() -> void:
	for i in range(ROOM_COUNT):
		var origin_z := -float(i) * ROOM_SPACING
		_room_origin_z.append(origin_z)
		_spawn_room_mesh(origin_z)
		_spawn_walls(origin_z, i > 0)
		_spawn_gate(origin_z, true) # 북쪽(출구) 문은 방마다
		if i > 0:
			_spawn_gate(origin_z, false) # 남쪽(입구) 문 — 복도 쪽에서 보이는 면
			_spawn_corridor(origin_z + ROOM_SPACING, origin_z)
		_spawn_exit_trigger(origin_z, i)
		_exit_used.append(false)

	## GO의 test_village.gd::_ready()와 같은 순서 규칙(자식이 부모보다
	## 먼저 ready되므로 Player는 이미 트리에 있다) — 이미 클리어한 방이면
	## 잡졸을 다시 세우지 않는다(EventState의 "이미 끝난 사건은 되살아나지
	## 않는다"와 같은 경계, 이제 방마다 따로 확인한다).
	var loaded: bool = DungeonSaveState.try_load()
	for i in range(ROOM_COUNT):
		var cleared: bool = loaded and DungeonSaveState.is_room_cleared(i)
		if not cleared:
			_spawn_enemy(_room_origin_z[i], i + 1, i == ROOM_COUNT - 1)
		else:
			## 클리어한 방을 불러오면 저장된 위치가 그 방의 출구 트리거
			## 안일 수 있다(마지막으로 나간 자리 그대로 복원하니까) —
			## _exit_used를 미리 true로 앉혀 두지 않으면 로드 직후 트리거가
			## 다시 걸려 매번 재저장(위치가 벽 depenetration으로 조금씩
			## 밀림)이 반복된다. 실제로 두 번째 프로세스 실행에서 이
			## 재발화를 헤드리스로 잡아냄(아래 검증 참고) — 추측이 아니라
			## 실측으로 찾은 문제다.
			_exit_used[i] = true
		## "제외" 목록 5번(인물 등용) — 이미 등용했거나(성공) 떠나보낸
		## (실패) 인물은 다시 세우지 않는다(위 잡졸의 rooms_cleared와 같은
		## 경계, hero_resolved).
		var hero_done: bool = loaded and DungeonSaveState.is_hero_resolved(i)
		if not hero_done and i < ROOM_HERO_IDS.size():
			_spawn_hero_encounter(_room_origin_z[i], i, ROOM_HERO_IDS[i])
	if loaded:
		var player: Node3D = get_tree().get_first_node_in_group("player")
		if player:
			player.global_position = DungeonSaveState.player_pos
	else:
		_maybe_show_starter_pick()

	## "제외" 목록 6번(결사) — 지난 회차가 결사로 스러진 채 저장됐으면
	## (dungeon_hardcore_state.gd::fallen) 이번에 불러오자마자 바로 그
	## 자리에서 멈춘다 — player_health.gd::_fall()과 같은 얼림
	## (get_tree().paused = true), 다시 내려갈 수 없다는 웹판 enter()의
	## fallen() 가드와 같은 뜻이다.
	if not DungeonHardcoreState.fallen.is_empty():
		Toast.show(self, "☠️ 결사로 스러진 판입니다(제%d층) — 이어서 내려갈 수 없다." %
			int(DungeonHardcoreState.fallen.get("floor", 0)), 8.0)
		get_tree().paused = true


func _spawn_room_mesh(origin_z: float) -> void:
	var mesh := GLBUtils.extract_mesh(ROOM_GLB)
	if mesh == null:
		return
	var mi := MeshInstance3D.new()
	mi.name = "RoomMesh"
	mi.mesh = mesh
	mi.position = Vector3(0, 0, origin_z)
	add_child(mi)

	var floor_body := StaticBody3D.new()
	floor_body.name = "FloorCollision"
	var floor_cs := CollisionShape3D.new()
	var floor_box := BoxShape3D.new()
	floor_box.size = Vector3(ROOM_HALF.x * 2, 0.4, ROOM_HALF.z * 2)
	floor_cs.shape = floor_box
	floor_body.position = Vector3(0, -0.2, origin_z)
	floor_body.add_child(floor_cs)
	add_child(floor_body)


## 벽 넷 중 북쪽(-z, 출구)은 항상 틈을 남긴다. 남쪽(+z)은 첫 방(입구가
## 필요 없다)만 온전히 막고, 나머지 방은 복도로 이어지는 틈을 같은
## 자리에 남긴다(`has_south_gap`).
func _spawn_walls(origin_z: float, has_south_gap: bool) -> void:
	if has_south_gap:
		var side_len_s: float = ROOM_HALF.x - GATE_HALF_WIDTH
		if side_len_s > 0.0:
			var side_center_x_s: float = GATE_HALF_WIDTH + side_len_s * 0.5
			_wall(Vector3(side_len_s, WALL_HEIGHT, WALL_THICK),
				Vector3(side_center_x_s, WALL_HEIGHT * 0.5, origin_z + ROOM_HALF.z + WALL_THICK * 0.5))
			_wall(Vector3(side_len_s, WALL_HEIGHT, WALL_THICK),
				Vector3(-side_center_x_s, WALL_HEIGHT * 0.5, origin_z + ROOM_HALF.z + WALL_THICK * 0.5))
	else:
		_wall(Vector3(ROOM_HALF.x * 2, WALL_HEIGHT, WALL_THICK),
			Vector3(0, WALL_HEIGHT * 0.5, origin_z + ROOM_HALF.z + WALL_THICK * 0.5))

	_wall(Vector3(WALL_THICK, WALL_HEIGHT, ROOM_HALF.z * 2),
		Vector3(ROOM_HALF.x + WALL_THICK * 0.5, WALL_HEIGHT * 0.5, origin_z))
	_wall(Vector3(WALL_THICK, WALL_HEIGHT, ROOM_HALF.z * 2),
		Vector3(-ROOM_HALF.x - WALL_THICK * 0.5, WALL_HEIGHT * 0.5, origin_z))

	var side_len: float = ROOM_HALF.x - GATE_HALF_WIDTH
	if side_len > 0.0:
		var side_center_x: float = GATE_HALF_WIDTH + side_len * 0.5
		_wall(Vector3(side_len, WALL_HEIGHT, WALL_THICK),
			Vector3(side_center_x, WALL_HEIGHT * 0.5, origin_z - ROOM_HALF.z - WALL_THICK * 0.5))
		_wall(Vector3(side_len, WALL_HEIGHT, WALL_THICK),
			Vector3(-side_center_x, WALL_HEIGHT * 0.5, origin_z - ROOM_HALF.z - WALL_THICK * 0.5))


func _wall(size: Vector3, pos: Vector3) -> void:
	var body := StaticBody3D.new()
	body.position = pos
	var cs := CollisionShape3D.new()
	var box := BoxShape3D.new()
	box.size = size
	cs.shape = box
	body.add_child(cs)
	add_child(body)


## at_north=true면 그 방의 출구(북쪽, -z), false면 입구(남쪽, +z) — 같은
## gate.glb를 방향만 반대로 놓는다(아치는 앞뒤가 대칭이라 뒤집을 필요 없음).
func _spawn_gate(origin_z: float, at_north: bool) -> void:
	var mesh := GLBUtils.extract_mesh(GATE_GLB)
	if mesh == null:
		return
	var mi := MeshInstance3D.new()
	mi.name = "ExitGate" if at_north else "EntranceGate"
	var z_off: float = -ROOM_HALF.z if at_north else ROOM_HALF.z
	mi.position = Vector3(0, 0, origin_z + z_off)
	add_child(mi)


## from_z(앞 방의 출구 쪽, 더 큰 z)에서 to_z(다음 방의 입구, 더 작은 z)
## 까지 corridor.glb 타일을 이어 붙인다 + 옆벽·바닥 충돌(GLB 자체엔 충돌이
## 없다 — room-small.glb·gate.glb와 같은 이유).
func _spawn_corridor(from_z: float, to_z: float) -> void:
	var start_z: float = from_z - ROOM_HALF.z # 앞 방 북쪽 벽
	var mesh := GLBUtils.extract_mesh(CORRIDOR_GLB)
	for i in range(CORRIDOR_TILES_PER_GAP):
		var tile_center_z: float = start_z - CORRIDOR_TILE_LEN * (i + 0.5)
		if mesh != null:
			var mi := MeshInstance3D.new()
			mi.name = "CorridorTile%d" % i
			mi.mesh = mesh
			mi.position = Vector3(0, 0, tile_center_z)
			add_child(mi)

	var corridor_len: float = start_z - (to_z + ROOM_HALF.z) # 항상 CORRIDOR_GAP과 같음
	var corridor_center_z: float = (start_z + (to_z + ROOM_HALF.z)) * 0.5
	var floor_body := StaticBody3D.new()
	floor_body.name = "CorridorFloor"
	var floor_cs := CollisionShape3D.new()
	var floor_box := BoxShape3D.new()
	floor_box.size = Vector3(CORRIDOR_HALF_WIDTH * 2, 0.4, corridor_len)
	floor_cs.shape = floor_box
	floor_body.position = Vector3(0, -0.2, corridor_center_z)
	floor_body.add_child(floor_cs)
	add_child(floor_body)

	_wall(Vector3(WALL_THICK, WALL_HEIGHT, corridor_len),
		Vector3(CORRIDOR_HALF_WIDTH + WALL_THICK * 0.5, WALL_HEIGHT * 0.5, corridor_center_z))
	_wall(Vector3(WALL_THICK, WALL_HEIGHT, corridor_len),
		Vector3(-CORRIDOR_HALF_WIDTH - WALL_THICK * 0.5, WALL_HEIGHT * 0.5, corridor_center_z))


func _spawn_exit_trigger(origin_z: float, room_index: int) -> void:
	var area := Area3D.new()
	area.name = "ExitTrigger%d" % room_index
	area.position = Vector3(0, 1.0, origin_z - ROOM_HALF.z - 1.0)
	var cs := CollisionShape3D.new()
	var shape := BoxShape3D.new()
	shape.size = Vector3(GATE_HALF_WIDTH * 2, 3.0, 2.0)
	cs.shape = shape
	area.add_child(cs)
	add_child(area)
	## .bind()는 인자를 그 자리에서 바로 값으로 굳힌다 — 아래 은사 콜백
	## 람다에서 실제로 밟은 "생성 시점 값 캡처" 문제와 달리 여기 room_index는
	## 지역 변수가 아니라 함수 매개변수라 안전하다.
	area.body_entered.connect(_on_exit_entered.bind(room_index))


## "제외" 목록 1번(은사) — 웹판 dungeon.js의 descend()가 층을 내려가기 전에
## 은사 셋 중 하나를 고르게 하는 것과 같은 자리. 방마다(각 방의 출구에서)
## 한 번씩 고른다(웹판이 "층 클리어마다" 은사를 주는 것과 같은 리듬) —
## 마지막 방만 완주 저장을 겸한다.
func _on_exit_entered(body: Node3D, room_index: int) -> void:
	if _exit_used[room_index] or not body.is_in_group("player"):
		return
	_exit_used[room_index] = true
	var is_final: bool = room_index == ROOM_COUNT - 1
	var choice := DungeonRunState.roll_choice()
	if choice.is_empty():
		## 모든 은사가 상한까지 찬 드문 경우 — 고를 게 없으니 그냥 나간다.
		_finish_exit(body, room_index, is_final)
		return
	## GDScript 람다는 바깥 지역 변수를 "생성 시점 값"으로 캡처한다 —
	## `layer`를 ChoicePrompt.build() 호출 **전에** 만든 콜백에서 그대로
	## 참조하면 항상 null을 캡처한다(실측으로 확인: "Cannot call method
	## 'queue_free' on a null value"). Dictionary는 참조 타입이라 그 안에
	## 나중에 채워 넣으면 콜백도 같은 내용을 보게 된다 — 그 우회로 고쳤다.
	var layer_box := {}
	var choices: Array = []
	for key in choice:
		var b := DungeonBoons.by_key(key)
		choices.append({
			"label": "%s %s — %s" % [b.emoji, b.name, b.desc],
			"cb": func() -> void: _on_boon_picked(key, body, layer_box, room_index, is_final),
		})
	layer_box["layer"] = ChoicePrompt.build(self, "🎴 은사를 고르세요", choices)


func _on_boon_picked(key: String, body: Node3D, layer_box: Dictionary, room_index: int, is_final: bool) -> void:
	(layer_box["layer"] as CanvasLayer).queue_free()
	DungeonRunState.apply_boon(key)
	_finish_exit(body, room_index, is_final)


## 방마다 진행 상황을 저장한다(중간에 그만둬도 이미 클리어한 방은 안
## 되풀이된다) — 마지막 방만 "이번 슬라이스는 여기까지" 토스트를 겸한다
## (VERTICAL_SLICE_DUNGEON.md 완료 조건 8단계의 마지막 자리).
##
## "제외" 목록 2번(내구) — item.js::wearAll(), "층을 내려갈 때마다 1
## 닳는다"를 그대로 여기(방 출구 = descend)에서 부른다. **수리(修理)는
## 이번 세션에 안 붙인다** — repairCost()가 price()(물건 값어치)를 필요로
## 하는데 이 슬라이스엔 아직 골드 시스템이 없다("제외" 목록 3번 몫). 부서진
## 장비는 그냥 다음 노획으로 갈아 들 때까지 능력치를 못 낸다(원작처럼
## 사라지지는 않는다).
func _finish_exit(body: Node3D, room_index: int, is_final: bool) -> void:
	var broke := DungeonEquipmentState.wear_all(1.0)
	for slot_name in broke:
		var it: Dictionary = DungeonEquipmentState.weapon if slot_name == "weapon" else DungeonEquipmentState.charm
		Toast.show(self, "🔧 %s 이(가) 부서졌다 — 새로 주울 때까지 능력치를 못 낸다." % DungeonItems.item_name(it), 4.0)
	DungeonSaveState.mark_room_cleared(room_index)
	DungeonSaveState.save(body)
	if is_final:
		Toast.show(self, "이번 슬라이스는 여기까지 — 저장했다.", 5.0)
	else:
		Toast.show(self, "다음 방으로 향한다 — 진행 상황을 저장했다.", 3.0)


func _spawn_enemy(origin_z: float, floor_num: int, is_boss: bool = false) -> void:
	var enemy: CharacterBody3D = DungeonEnemy.new(floor_num, is_boss)
	enemy.position = Vector3(0, 0, origin_z - 1.5)
	add_child(enemy)
	if is_boss:
		## LEGACY_FEATURE_AUDIT.md KEEP "인물은 던전에서 등용(출사표3+보스층
		## 합류)" 의 후반부 — 2026-09-12㉔가 "7번이 생긴 뒤로 미룬다"고
		## 남겨 둔 그 경로. game.js bossReward()를 그대로 옮긴다: 보스가
		## 죽는 순간(문을 나가는 시점이 아니라) 인물 하나가 자동으로 합류.
		enemy.died.connect(_on_boss_defeated.bind(floor_num - 1))


## room_index별 hero_resolved를 재사용한다 — 뜻은 다르지만("설득 성공/실패"
## 대신 "보스 격파로 자동 합류") "이 방의 인물 관련 사건이 끝났다"는 같은
## 경계라 새 저장 필드를 안 만든다. rooms_cleared[room_index]가 이미
## enemy 재생성을 막고(§ _ready 위쪽), 저장은 그 방을 나갈 때(`_finish_exit`)
## 이 값과 함께 한 번에 기록되므로 이중 지급 경로가 없다.
func _on_boss_defeated(room_index: int) -> void:
	if DungeonSaveState.is_hero_resolved(room_index):
		return
	DungeonSaveState.mark_hero_resolved(room_index)
	var floor_num: int = room_index + 1
	## game.js bossReward()의 등급 상한 그대로: floor>=21→5·>=12→4·>=6→3·그외 2.
	var max_rarity: int = 5 if floor_num >= 21 else (4 if floor_num >= 12 else (3 if floor_num >= 6 else 2))
	var pool: Array[Dictionary] = []
	for h: Dictionary in Characters.HEROES:
		if int(h.rarity) <= max_rarity and not DungeonPartyState.members.has(str(h.id)):
			pool.append(h)
	## game.js pickNewHero()가 다 모았으면(pool 없음) 중복으로라도 준다.
	var hero: Dictionary = (pool[randi() % pool.size()] if not pool.is_empty()
		else Characters.HEROES[randi() % Characters.HEROES.size()])
	DungeonPartyState.recruit(str(hero.id))
	Toast.show(self, "🤝 %s(%s) 합류! (제%d층 보스 격파)" % [str(hero.name), str(hero.hanja), floor_num], 4.0)


## "제외" 목록 5번(인물 등용) — 잡졸은 방 중심에서 북쪽(출구 쪽, -z)으로
## 살짝 치우쳐 있고 출구 트리거는 더 북쪽이라(_spawn_exit_trigger), 인물은
## 반대로 남쪽(입구 쪽, +z)에 옆으로 비켜(x=±3.5) 세운다 — 걸어 들어오자마자
## 잡졸과 겹치지 않게, 복도 폭(±2.0) 밖이라 지나가는 길도 안 막는다.
func _spawn_hero_encounter(origin_z: float, room_index: int, hero_id: String) -> void:
	var encounter: Node3D = DungeonHeroEncounter.new(hero_id, room_index)
	var side: float = 3.5 if room_index % 2 == 0 else -3.5
	encounter.position = Vector3(side, 0, origin_z + 2.0)
	add_child(encounter)


## "제외" 목록 5번(출사표) — 새 저장(불러온 게 없을 때)에만 딱 한 번,
## 함께할 인물 셋을 순서대로 고른다. 웹판 starter.js의 희귀도 문턱
## (rarity ≤ STARTER_RARITY_CAP)을 그대로 쓰되, 원작처럼 정해진 셋을
## 주는 대신 후보 다섯 중 직접 고르게 했다(위 상수 주석 참고).
func _maybe_show_starter_pick() -> void:
	var pool: Array[Dictionary] = []
	for h: Dictionary in Characters.HEROES:
		if int(h.rarity) <= STARTER_RARITY_CAP:
			pool.append(h)
	pool.shuffle()
	var candidates: Array[Dictionary] = pool.slice(0, mini(STARTER_POOL_SIZE, pool.size()))
	_show_starter_round(candidates, 1)


func _show_starter_round(candidates: Array[Dictionary], round_num: int) -> void:
	if candidates.is_empty() or round_num > STARTER_PICK_COUNT:
		Toast.show(self, "출사표를 마쳤다 — 부대 %d명." % DungeonPartyState.members.size(), 3.0)
		return
	## test_room.gd의 은사 선택지와 같은 "생성 시점 값 캡처" 우회(위
	## _on_exit_entered 주석 참고) — layer_box에 나중에 채워 넣는다.
	var layer_box := {}
	var choices: Array = []
	for h: Dictionary in candidates:
		choices.append({
			"label": "%s %s(%s) · %s·%s" % [h.emoji, h.name, h.hanja, h.era, h.faction],
			"cb": func() -> void: _on_starter_picked(h, candidates, round_num, layer_box),
		})
	layer_box["layer"] = ChoicePrompt.build(
		self, "📜 출사표 — 함께할 인물을 고르세요 (%d/%d)" % [round_num, STARTER_PICK_COUNT], choices)


func _on_starter_picked(hero: Dictionary, candidates: Array[Dictionary], round_num: int, layer_box: Dictionary) -> void:
	(layer_box["layer"] as CanvasLayer).queue_free()
	DungeonPartyState.recruit(str(hero.id))
	candidates.erase(hero)
	_show_starter_round(candidates, round_num + 1)
