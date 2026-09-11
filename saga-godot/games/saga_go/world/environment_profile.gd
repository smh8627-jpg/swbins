extends WorldEnvironment

## PLAN.md 66-1장 — PC(forward_plus)와 Mobile/Web 프로파일이 각기 다른
## Environment 리소스를 쓰도록 실행 시점에 고른다. 씬 안에는 이 스크립트만
## 두고, 실제 값은 assets/environment/env_pc.tres · env_mobile.tres 둘로만
## 관리한다 — 씬 파일 안에서 렌더러를 분기하지 않는다는 66-1장 원칙.

const ENV_PC: Environment = preload("res://assets/environment/env_pc.tres")
const ENV_MOBILE: Environment = preload("res://assets/environment/env_mobile.tres")


func _ready() -> void:
	if OS.has_feature("mobile") or OS.has_feature("web"):
		environment = ENV_MOBILE
	else:
		environment = ENV_PC
