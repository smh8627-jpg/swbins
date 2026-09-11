extends Node

## 2026-09-11㉑ 발견 — bandit_encounter.gd·simple_event.gd·hero_encounter.gd는
## 전부 "한 번뿐"이라고 주석에 적어 두고 승리/선택 직후 `queue_free()`로
## 사라졌지만, 그 "이미 끝냈다"는 사실 자체는 어디에도 저장되지 않았다.
## TestVillage.tscn은 씬을 다시 열 때마다 모든 자식 노드를 새로 만들기
## 때문에, 저장 → 재실행을 하면 이미 물리친 도적·이미 등용한 인물·이미
## 읽은 비문이 전부 되살아난다 — 단순히 "다시 볼 수 있다"는 수준이 아니라
## `PartyState.recruit()`가 dedup을 안 해서 **같은 인물이 부대에 두 번
## 들어가 전투력이 부풀 수 있는 실제 버그**였다.
##
## 각 사건 노드는 씬 안에서 이름이 이미 고유하므로(TestVillage.tscn의
## `[node name=...]`), 새 id 체계를 만들지 않고 그 이름을 그대로 키로
## 쓴다. `_ready()`에서 `is_resolved(name)`이면 아무것도 안 만들고
## 바로 사라지고, 사건이 끝나는 시점(`queue_free()` 직전)에 `mark_resolved
## (name)`을 부른다. project.godot [autoload]에 EventState로 등록된 싱글턴.

var resolved: Array[String] = []


func is_resolved(id: String) -> bool:
	return resolved.has(id)


func mark_resolved(id: String) -> void:
	if not resolved.has(id):
		resolved.append(id)


## save_state.gd가 저장 파일을 불러온 뒤 여기로 넘긴다.
func restore(saved_resolved: Array[String]) -> void:
	resolved = saved_resolved.duplicate()
