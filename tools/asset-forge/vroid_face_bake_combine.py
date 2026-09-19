#!/usr/bin/env python3
"""vroid_face_bake_masks.py(Blender)가 만든 서피스 소유권 마스크와,
GLB 원본 텍스처(알파 포함, trimesh로 직접 읽음)를 합쳐 얼굴 텍스처
한 장을 만드는 2단계. 1단계 스크립트의 머리말(왜 Blender EMIT 베이크
결과를 그대로 못 쓰는지)을 먼저 읽을 것.

사용:
    py -3 tools/asset-forge/vroid_face_bake_combine.py \
        <glb 경로> <mask 폴더> <출력 png>

<mask 폴더>는 vroid_face_bake_masks.py의 출력(mask_N.png + mask_order.txt).

2026-09-19④ 기준 상태: 이 스크립트로 만든 텍스처 자체는 맞게 나온다
(saga-godot/assets/characters_vroid/generated/AvatarSample_A_Face_Baked.png
로 이미 한 번 구워 커밋해 둠) — 그런데 이걸 Godot Player의 Face
서피스에 실제로 물렸을 때 GO 실기 씬에서 여전히 하얗게 빈다(원인
미해결, saga-godot/saga_core/shaders/cel_shader_apply.gd 헤더 주석과
HISTORY.md 2026-09-19④ 참고 — cull_mode 쪽이 다음 후보).
"""
import sys
from pathlib import Path

import numpy as np
import trimesh
from PIL import Image

# 뒤(0)에서 앞(큰 수)으로 그릴 순서 — 안 맞으면 뒤 레이어가 앞 레이어를 덮는다.
ORDER = ["SKIN", "EyeWhite", "EyeIris", "EyeHighlight", "Brow", "Eyeline", "Mouth"]


def main() -> int:
    if len(sys.argv) != 4:
        print(__doc__)
        return 1
    glb_path, masks_dir, out_png = sys.argv[1], sys.argv[2], sys.argv[3]

    scene = trimesh.load(glb_path, process=False)
    face_geoms = {n: g for n, g in scene.geometry.items() if "Face" in n}
    names = list(face_geoms.keys())

    mask_order_file = Path(masks_dir) / "mask_order.txt"
    idx_to_name = {}
    for line in mask_order_file.read_text(encoding="utf-8").splitlines():
        idx, name = line.split("\t")
        idx_to_name[int(idx)] = name

    def mat_name(g):
        return getattr(g.visual.material, "name", "")

    # trimesh 지오메트리 이름 -> blender 재질 인덱스(재질 리소스 이름으로 매칭).
    geom_to_idx = {}
    for n, g in face_geoms.items():
        mn = mat_name(g)
        for idx, bname in idx_to_name.items():
            if bname == mn:
                geom_to_idx[n] = idx
                break
    print("geom -> mask idx:", geom_to_idx)

    def priority_of(name: str) -> int:
        mn = mat_name(face_geoms[name]).lower()
        for i, key in enumerate(ORDER):
            if key.lower() in mn:
                return i
        return -1

    ordered_names = sorted(names, key=priority_of)

    size = None
    canvas = None
    for n in ordered_names:
        idx = geom_to_idx[n]
        mask = Image.open(Path(masks_dir) / ("mask_%d.png" % idx)).convert("L")
        tex = face_geoms[n].visual.material.baseColorTexture.convert("RGBA")

        if size is None:
            size = mask.size
            canvas = np.zeros((size[1], size[0], 4), dtype=np.float64)

        if mask.size != size:
            mask = mask.resize(size, Image.NEAREST)
        if tex.size != size:
            tex = tex.resize(size, Image.LANCZOS)

        mask_arr = np.array(mask, dtype=np.float64) / 255.0
        tex_arr = np.array(tex, dtype=np.float64)
        # 이 서피스가 실제로 차지하는 자리(mask)에서만 그 자리의 진짜
        # 텍스처 알파를 살린다 — 소유 아닌 곳은 텍스처가 뭘 그렸든 무시.
        alpha = (tex_arr[..., 3] / 255.0) * mask_arr

        for c in range(3):
            canvas[..., c] = canvas[..., c] * (1 - alpha) + tex_arr[..., c] * alpha
        canvas[..., 3] = canvas[..., 3] * (1 - alpha) + 255.0 * alpha
        print("composited", n, "priority", priority_of(n), "mask idx", idx)

    out_img = Image.fromarray(np.clip(canvas, 0, 255).astype(np.uint8), mode="RGBA")
    out_img.save(out_png)
    print("SAVED", out_png)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
