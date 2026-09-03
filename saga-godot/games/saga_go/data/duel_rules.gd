class_name DuelRules
extends RefCounted

## VERTICAL_SLICE.md 34절 — "duel.js를 그대로 재구현한다, 새로 설계하지 않는다".
## saga-go/js/duel.js의 판정 층(create/step/act)을 상수 하나 안 바꾸고 그대로
## 옮긴 것이다. 화면만 다르다 — 카드 무대가 아니라 실제 3D 인물이 맞붙는다
## (games/saga_go/world/bandit_encounter.gd).

const TIME_SEC := 60.0
const QUICK_CD := 0.35
const QUICK_MUL := 0.10
const QUICK_KI := 9.0
const ULT_MUL := 0.62
const KI_MAX := 100.0

const FOE_GAP := 2.6
const FOE_HEAVY := 3
const TELL_SEC := 1.1
const HEAVY_MUL := 2.4
const DODGE_CUT := 0.15
const MORALE_MUL := 3.0

var foe_hp := 0.0
var hp := 0.0
var foe_atk := 0.0
var my_atk := 0.0
var morale := 0.0
var morale_max := 0.0
var left := 0.0
var ki := 0.0
var cd := 0.0
var foe_t := 0.0
var foe_n := 0
var tell := 0.0
var dodged := false

var dealt := 0.0
var hits := 0
var ults := 0
var dodge_try := 0
var dodge_ok := 0
var taken := 0.0

var over := false
var cleared := false
var fled := false

static func create(foe_hp_in: float, my_atk_in: float, my_def_in: float, time_sec: float = TIME_SEC) -> DuelRules:
	var s := DuelRules.new()
	s.foe_hp = maxf(1.0, roundf(foe_hp_in))
	s.hp = s.foe_hp
	s.foe_atk = maxf(1.0, roundf(s.foe_hp * 0.010))
	s.my_atk = maxf(1.0, roundf(my_atk_in))
	s.morale = maxf(200.0, roundf(my_def_in * MORALE_MUL))
	s.morale_max = s.morale
	s.left = time_sec
	s.foe_t = FOE_GAP
	return s

## 웹판 winChance(foeId, mine) 그대로 — 0.12~0.88 사이로 눌러 둔다.
## 이 판(3D 실시간)에서는 승패를 주사위가 아니라 실제로 기세를 다 깎았는지로
## 가르므로 전투 중에는 안 쓰인다 — 사건에 맞설지 고를 때 참고용으로만 남긴다.
static func win_chance(mine: float, foe_power: float) -> float:
	return clampf(mine / (mine + foe_power), 0.12, 0.88)

## 한 수 둔다. kind: "quick" | "ult" | "dodge"
func act(kind: String) -> Dictionary:
	if over:
		return {"ok": false, "reason": "over"}

	if kind == "dodge":
		dodge_try += 1
		if tell > 0.0:
			dodged = true
			dodge_ok += 1
			return {"ok": true, "kind": "dodge"}
		return {"ok": false, "kind": "dodge", "reason": "notell"}

	if kind == "ult":
		if ki < KI_MAX:
			return {"ok": false, "kind": "ult", "reason": "noki"}
		var big := roundf(my_atk * ULT_MUL)
		ki = 0.0
		hp -= big
		dealt += big
		ults += 1
		_finish_if_done()
		return {"ok": true, "kind": "ult", "dmg": big}

	if kind != "quick":
		return {"ok": false, "reason": "what"}
	if cd > 0.0:
		return {"ok": false, "kind": "quick", "reason": "cd"}
	var dmg := roundf(my_atk * QUICK_MUL * (0.9 + randf() * 0.2))
	cd = QUICK_CD
	ki = minf(KI_MAX, ki + QUICK_KI)
	hp -= dmg
	dealt += dmg
	hits += 1
	_finish_if_done()
	return {"ok": true, "kind": "quick", "dmg": dmg}

func _finish_if_done() -> void:
	if hp <= 0.0:
		over = true
		cleared = true

## 시간을 흘린다. 적의 차례(강타 예고 포함)도 여기서 온다 — 이게 "적 AI"다.
func step(dt: float) -> Array:
	var ev: Array = []
	if over:
		return ev

	if cd > 0.0:
		cd = maxf(0.0, cd - dt)
	left -= dt

	if tell > 0.0:
		tell -= dt
		if tell <= 0.0:
			tell = 0.0
			var heavy := roundf(foe_atk * HEAVY_MUL)
			if dodged:
				heavy = roundf(heavy * DODGE_CUT)
			morale -= heavy
			taken += heavy
			ev.append({"t": "heavy", "dmg": heavy, "dodged": dodged})
			dodged = false
			foe_t = FOE_GAP
	else:
		foe_t -= dt
		if foe_t <= 0.0:
			foe_n += 1
			if foe_n % FOE_HEAVY == 0:
				tell = TELL_SEC
				dodged = false
				ev.append({"t": "tell"})
			else:
				var d := roundf(foe_atk * (0.85 + randf() * 0.3))
				morale -= d
				taken += d
				ev.append({"t": "hit", "dmg": d})
				foe_t = FOE_GAP

	if morale <= 0.0:
		morale = 0.0
		over = true
		cleared = false
		ev.append({"t": "rout"})
	elif left <= 0.0:
		left = 0.0
		over = true
		cleared = hp <= 0.0
		ev.append({"t": "time"})
	return ev

## 물러난다 — 그때까지 낸 만큼만 인정된다(한 대도 못 때렸으면 패배로 안 친다).
func flee() -> void:
	over = true
	fled = true
	cleared = false
