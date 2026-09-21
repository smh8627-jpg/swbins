class_name BlobShadow
extends RefCounted

## PLAN.md 102-4 "조명·GI·프로브" — 캐릭터 발밑 접지 그림자(blob decal).
## "소프트 섀도가 꺼진 폰에서도 붙어 보이게" 하는 용도라 실제 그림자
## 대신 텍스처 하나를 발밑에 투영한다. 새 이미지 파일을 안 받고(103장
## 파이프라인 밖) 런타임에 한 번만 만들어 캐시한다 — 중심이 어둡고
## 가장자리로 갈수록 옅어지는 단순 원형(별도 판단 없이 셀셰이더 스타일과
## 무관, 순수 그림자용).

const TEX_SIZE := 64
const MAX_ALPHA := 0.55

static var _cached_texture: ImageTexture = null


static func texture() -> ImageTexture:
	if _cached_texture != null:
		return _cached_texture
	var img := Image.create(TEX_SIZE, TEX_SIZE, false, Image.FORMAT_RGBA8)
	var center := Vector2(TEX_SIZE * 0.5, TEX_SIZE * 0.5)
	var radius := TEX_SIZE * 0.5
	for y in TEX_SIZE:
		for x in TEX_SIZE:
			var d := Vector2(x + 0.5, y + 0.5).distance_to(center) / radius
			var a := clampf(1.0 - d, 0.0, 1.0)
			a *= a # 가장자리가 급하게 안 끊기게 제곱으로 감쇠
			img.set_pixel(x, y, Color(0.0, 0.0, 0.0, a * MAX_ALPHA))
	_cached_texture = ImageTexture.create_from_image(img)
	return _cached_texture


## radius_m: 그림자 반지름(미터). 호출부가 캡슐 반지름 등에 맞춰 정한다.
## 기본 0.55 는 102-1 표준 캡슐(반지름 0.45)보다 살짝 크게 — 발이 그림자
## 밖으로 나가지 않게.
static func make_decal(radius_m: float = 0.55) -> Decal:
	var d := Decal.new()
	d.texture_albedo = texture()
	d.size = Vector3(radius_m * 2.0, 0.4, radius_m * 2.0)
	d.upper_fade = 0.05
	d.lower_fade = 0.3
	## 다리(수직에 가까운 면)엔 안 붙고 바닥(위를 보는 면)에만 붙게 —
	## 안 그러면 캐릭터 다리에도 그림자가 칠해진다.
	d.normal_fade = 0.4
	d.name = "BlobShadow"
	return d
