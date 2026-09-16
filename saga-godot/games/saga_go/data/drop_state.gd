extends Node

## PLAN.md 101-2 GO ③"패배 비용과 회수"(표준 F) — 웹판 PLAN.md §5-⑧을
## 이 판 경제(재화 없음, 경험치뿐 — party_state.gd 헤더 참고)에 맞춰
## 옮긴다. 웹은 "패배한 그 자리로 돌아와 이기면 회수"인데, 이 판 사건
## 노드는 패배해도 안 지워지고 같은 자리에 그대로 남는다(bandit_
## encounter.gd `_enter_cooldown()`) — 그래서 "그 사건을 다시 이겨서
## 회수"로 좁혀도 웹의 의도(같은 자리로 돌아와 되찾는다)와 같다.
## `Time.get_unix_time_from_system()`(실시간)을 쓴다 — 엔진 가동시간
## 기준(`get_ticks_msec()`)은 저장·재시작을 거치면 기준선이 바뀌어
## "10분 지났나" 판정이 깨진다.
##
## project.godot [autoload]에 DropState로 등록된 싱글턴.

signal drops_changed

const DROP_PCT := 0.15
const DROP_CAP := 15.0
const RECOVER_SEC := 600.0
const MAX_DROPS := 3

## key: 사건 노드 name(EventState.mark_resolved()과 같은 식별자) →
## {"exp": float, "at": float(유닉스 시각)}.
var drops: Dictionary = {}


## 사건 패배 시 부른다. 이미 그 사건에 짐이 있으면 시각만 새로 찍는다
## (중복으로 안 쌓는다). 동시 3개(웹과 같은 수치) — 넘으면 가장 오래된
## 짐이 밀려난다(소멸, 회수 못 함).
func drop_at(event_name: String, party_exp: float) -> float:
	var amount := minf(party_exp * DROP_PCT, DROP_CAP)
	if amount <= 0.0:
		return 0.0
	if drops.size() >= MAX_DROPS and not drops.has(event_name):
		_evict_oldest()
	drops[event_name] = {"exp": amount, "at": Time.get_unix_time_from_system()}
	drops_changed.emit()
	return amount


## 그 사건을 다시 이겼을 때 회수를 시도한다. 있고 아직 안 만료됐으면
## 경험치를 돌려주고 지운다(회수), 없거나 10분이 지났으면 0을 주고
## 만료된 건 지운다(소멸).
func try_recover(event_name: String) -> float:
	if not drops.has(event_name):
		return 0.0
	var d: Dictionary = drops[event_name]
	drops.erase(event_name)
	drops_changed.emit()
	var age: float = Time.get_unix_time_from_system() - float(d.at)
	return float(d.exp) if age <= RECOVER_SEC else 0.0


func _evict_oldest() -> void:
	var oldest_key := ""
	var oldest_at := INF
	for k in drops:
		var at: float = drops[k].at
		if at < oldest_at:
			oldest_at = at
			oldest_key = k
	if oldest_key != "":
		drops.erase(oldest_key)


## save_state.gd가 저장 파일을 불러온 뒤 여기로 넘긴다(다른 *_state.gd의
## restore()와 같은 경계).
func restore(saved: Dictionary) -> void:
	drops = saved.duplicate(true)
