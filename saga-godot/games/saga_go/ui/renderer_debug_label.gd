extends Label

## PLAN.md 46장·66-1장 — 디버그 빌드에서만 현재 렌더러 프로파일을 표시한다.
## 릴리즈 빌드에서는 자동으로 숨는다(46장 "릴리즈 빌드에서는 제거하거나
## 숨길 수 있도록 한다").


func _ready() -> void:
	if not OS.is_debug_build():
		visible = false
		return
	var method: String = ProjectSettings.get_setting("rendering/renderer/rendering_method", "?")
	text = "renderer: %s" % method
