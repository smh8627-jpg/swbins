extends Area3D

## **2026-09-13 추가 — 원거리 적(1절 "제외" 목록의 "원거리 적").**
## data-side.js RANGED_WEAPON.bow + side.js eshot(투사체) 포트. 이 포트는
## 잡졸이 추격을 안 해(story_enemy.gd 머리말) 원작의 "사거리 안이면
## 멈춰서 쏜다/다가온다"(holding) 갈래는 필요 없다 — 제자리에서 사거리
## 안이면 그냥 쏜다.
##
## story_enemy.gd가 set_script로 직접 만든다(story_enemy_spawner.gd가
## story_enemy.gd를 만드는 것과 같은 배선) — 별도 static 팩토리 없이
## 호출 쪽이 dir/speed/damage/life_left를 채운 뒤 add_child한다.

var dir := 1.0
var speed := 0.0
var damage := 0.0
var life_left := 2.4  # side.js eshot life:2.4 그대로(초 단위라 px 환산 불필요)


func _ready() -> void:
	_spawn_visual()
	body_entered.connect(_on_body_entered)


func _spawn_visual() -> void:
	var mi := MeshInstance3D.new()
	var mesh := SphereMesh.new()
	mesh.radius = 0.12
	mesh.height = 0.24
	mi.mesh = mesh
	var mat := StandardMaterial3D.new()
	mat.albedo_color = Color(0.85, 0.72, 0.3)
	mat.emission_enabled = true
	mat.emission = mat.albedo_color
	mat.emission_energy_multiplier = 1.2
	mi.material_override = mat
	add_child(mi)

	var cs := CollisionShape3D.new()
	var shape := SphereShape3D.new()
	shape.radius = 0.2
	cs.shape = shape
	add_child(cs)


func _physics_process(delta: float) -> void:
	life_left -= delta
	if life_left <= 0.0:
		queue_free()
		return
	global_position.x += dir * speed * delta


func _on_body_entered(body: Node3D) -> void:
	if body.is_in_group("player") and body.has_method("take_damage"):
		body.take_damage(damage)
		queue_free()
