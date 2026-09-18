#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
팔레트 스냅 — SAGA-DESIGN.md §7.2 1번(palette.py), §6.0 "바이옴당 24색
(기본 8 + 명·암 2단), 모든 에셋은 임포트 시 팔레트에 스냅". tools/obj-split·
tools/glb-compress 처럼 다섯 판·두 트랙이 공유하는 빌드 도구라 tools/ 에 둔다
(게임 코드 공유 금지 원칙은 빌드 도구엔 안 걸린다, SAGA-DESIGN 105-Q 확인됨).

무엇을 하나:
1. `build` — PALETTES(아래, 판별 base8 하드코딩)에서 명(light)·암(dark) 2단을
   자동 계산해(흰/검과 섞기) 24색 JSON(assets/generated/palettes/<name>.json)을
   씨앗 없이 결정적으로 만든다.
2. `snap-glb` — GLB 하나를 읽어 텍스처(PBRMaterial.baseColorTexture)와
   정점색(ColorVisuals)을 팔레트 24색 중 최근접 색으로 전부 바꿔 새 GLB로
   내보낸다. 알파 채널은 그대로 둔다.
3. `preview` — 스냅 전/후 텍스처를 나란히 붙인 비교 PNG 하나(GUI를 띄우지
   않고 결과를 눈으로 확인하는 자리 — 3D 스크린샷 금지 규칙과 별개, 평면
   이미지 비교일 뿐).

무엇을 안 하나: 어떤 GLB를 스냅할지 고르는 것(자산마다 사람/세션이 판단),
스냅한 GLB를 실제 씬에 물리는 것(103-5 절차의 다음 단계, 여기선 안 한다).

색 거리는 단순 RGB 유클리드다(Lab 변환 없음) — "가장 싸고 즉시 가능"이
목표라 트리·바위 몇 종 팔레트 스왑엔 이 정도로 충분하다(SAGA-DESIGN §7.2).
"""

import argparse
import json
import os
import sys

import numpy as np
from PIL import Image

FORGE_DIR = os.path.dirname(os.path.abspath(__file__))

## 판별 base 8색 — 이미 실기 승인난 세계의 실제 지형색에서 그대로 뽑았다
## (새로 지어내지 않는다 — 팔레트가 지금 화면과 어긋나면 "통일"이 아니라
## "또 다른 스타일"이 된다). GO는 saga-godot/games/saga_go/world/
## terrain_builder.gd LEGEND 색 8종(2026-09-19 확인).
PALETTES = {
	"go_village": {
		"grass": (0.38, 0.55, 0.24),
		"forest": (0.16, 0.32, 0.14),
		"path": (0.62, 0.50, 0.32),
		"village_wall": (0.78, 0.68, 0.42),
		"mountain_stone": (0.55, 0.53, 0.50),
		"water": (0.25, 0.45, 0.62),
		"sand": (0.76, 0.68, 0.50),
		"shrine_wood": (0.50, 0.42, 0.30),
	},
}

LIGHT_MIX = 0.35  # 흰색 쪽으로 섞는 비율
DARK_MIX = 0.35   # 검은색 쪽으로 섞는 비율


def _mix(rgb, target, t):
	return tuple(c * (1.0 - t) + target * t for c in rgb)


def _to_hex(rgb01):
	return "#%02x%02x%02x" % tuple(round(max(0.0, min(1.0, c)) * 255) for c in rgb01)


def build_palette(name):
	if name not in PALETTES:
		sys.exit("모르는 팔레트 이름 '%s' — palette.py 의 PALETTES 에 base8 을 먼저 추가하세요." % name)
	base = PALETTES[name]
	swatches = []
	for role, rgb in base.items():
		swatches.append({"role": role, "band": "base", "hex": _to_hex(rgb)})
		swatches.append({"role": role, "band": "light", "hex": _to_hex(_mix(rgb, 1.0, LIGHT_MIX))})
		swatches.append({"role": role, "band": "dark", "hex": _to_hex(_mix(rgb, 0.0, DARK_MIX))})
	data = {"name": name, "roles": len(base), "colors": swatches}
	assert len(swatches) == len(base) * 3
	return data


def save_palette(name, out_dir):
	data = build_palette(name)
	os.makedirs(out_dir, exist_ok=True)
	out_path = os.path.join(out_dir, "%s.json" % name)
	with open(out_path, "w", encoding="utf-8") as f:
		json.dump(data, f, ensure_ascii=False, indent=2)
	print("팔레트 %d색 -> %s" % (len(data["colors"]), out_path))
	return out_path


def load_palette_rgb(path):
	with open(path, "r", encoding="utf-8") as f:
		data = json.load(f)
	out = []
	for c in data["colors"]:
		h = c["hex"].lstrip("#")
		out.append(tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)))
	return np.array(out, dtype=np.float32)  # (24, 3) 0~255


def snap_rgb_array(rgb_u8, palette_rgb):
	"""rgb_u8: (...,3) uint8 배열. 각 픽셀/정점을 palette_rgb(24,3) 중
	유클리드 최근접 색으로 바꾼다. 24색뿐이라 KD-tree 없이 브로드캐스트로
	충분히 빠르다."""
	shape = rgb_u8.shape
	flat = rgb_u8.reshape(-1, 3).astype(np.float32)
	# (N,1,3) - (1,24,3) -> (N,24) 거리
	dist = np.sum((flat[:, None, :] - palette_rgb[None, :, :]) ** 2, axis=2)
	nearest = palette_rgb[np.argmin(dist, axis=1)]
	return nearest.reshape(shape).astype(np.uint8)


def snap_image(img: Image.Image, palette_rgb) -> Image.Image:
	img = img.convert("RGBA")
	arr = np.array(img)
	rgb = arr[:, :, :3]
	alpha = arr[:, :, 3:4]
	snapped_rgb = snap_rgb_array(rgb, palette_rgb)
	out = np.concatenate([snapped_rgb, alpha], axis=2)
	return Image.fromarray(out, mode="RGBA")


def snap_glb(in_path, palette_path, out_path):
	import trimesh

	palette_rgb = load_palette_rgb(palette_path)
	scene = trimesh.load(in_path, force="scene")
	touched = []
	for name, geom in scene.geometry.items():
		visual = geom.visual
		mat = getattr(visual, "material", None)
		tex = getattr(mat, "baseColorTexture", None) if mat is not None else None
		if tex is not None:
			visual.material.baseColorTexture = snap_image(tex, palette_rgb)
			touched.append("%s(texture)" % name)
		vc = getattr(visual, "vertex_colors", None)
		if vc is not None and len(vc) > 0:
			vc_arr = np.asarray(vc)
			rgb = vc_arr[:, :3]
			alpha = vc_arr[:, 3:4] if vc_arr.shape[1] > 3 else None
			snapped = snap_rgb_array(rgb.astype(np.uint8), palette_rgb)
			new_vc = snapped if alpha is None else np.concatenate([snapped, alpha.astype(np.uint8)], axis=1)
			geom.visual.vertex_colors = new_vc
			touched.append("%s(vertex_colors)" % name)
	if not touched:
		print("경고 — 텍스처도 정점색도 못 찾았습니다(%s). 그대로 내보냅니다." % in_path)
	os.makedirs(os.path.dirname(out_path), exist_ok=True)
	scene.export(out_path)
	print("스냅 %s -> %s (%s)" % (in_path, out_path, ", ".join(touched) or "변경 없음"))
	return touched


def preview_texture(in_path, palette_path, out_path):
	import trimesh

	palette_rgb = load_palette_rgb(palette_path)
	scene = trimesh.load(in_path, force="scene")
	tex = None
	for geom in scene.geometry.values():
		mat = getattr(geom.visual, "material", None)
		tex = getattr(mat, "baseColorTexture", None) if mat is not None else None
		if tex is not None:
			break
	if tex is None:
		sys.exit("텍스처가 없는 GLB라 preview 를 못 만듭니다: %s" % in_path)
	snapped = snap_image(tex, palette_rgb)
	before = tex.convert("RGBA")
	after = snapped.resize(before.size) if snapped.size != before.size else snapped
	combo = Image.new("RGBA", (before.width * 2 + 8, before.height), (0, 0, 0, 0))
	combo.paste(before, (0, 0))
	combo.paste(after, (before.width + 8, 0))
	os.makedirs(os.path.dirname(out_path), exist_ok=True)
	combo.save(out_path)
	print("비교 PNG(좌 원본/우 스냅) -> %s" % out_path)


def main():
	ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
	sub = ap.add_subparsers(dest="cmd", required=True)

	p_build = sub.add_parser("build", help="PALETTES 의 base8 로 24색 JSON 생성")
	p_build.add_argument("name", choices=sorted(PALETTES.keys()))
	p_build.add_argument("--out-dir", required=True)

	p_snap = sub.add_parser("snap-glb", help="GLB 텍스처/정점색을 팔레트로 스냅")
	p_snap.add_argument("glb_path")
	p_snap.add_argument("palette_path")
	p_snap.add_argument("out_path")

	p_prev = sub.add_parser("preview", help="스냅 전/후 텍스처 비교 PNG")
	p_prev.add_argument("glb_path")
	p_prev.add_argument("palette_path")
	p_prev.add_argument("out_path")

	args = ap.parse_args()
	if args.cmd == "build":
		save_palette(args.name, args.out_dir)
	elif args.cmd == "snap-glb":
		snap_glb(args.glb_path, args.palette_path, args.out_path)
	elif args.cmd == "preview":
		preview_texture(args.glb_path, args.palette_path, args.out_path)


if __name__ == "__main__":
	main()
