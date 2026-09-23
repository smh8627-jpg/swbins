#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
장면 미리보기 — SAGA-DESIGN.md §7.2 보조 도구(2026-09-23, saga-realm 탑 킷배싱
사전 확인에서 신설). `kitbash.py`로 조립하기 전에 부품 배치(좌표·회전·배율)가
말이 되는지, 조립한 결과물의 실루엣이 의도한 모양인지 **정면·측면·평면 3뷰
실루엣**으로 matplotlib 에 그려 확인한다.

이건 `palette.py`의 `preview`(스냅 전/후 텍스처 비교 PNG)와 같은 성격이다 —
**평면 이미지 비교일 뿐**, 게임 화면을 헤드리스 크롬으로 찍는 것과는 무관하다
(그 쪽은 CLAUDE.md 규칙대로 사용자가 명시적으로 요청할 때만). 여기 그림은
텍스처·조명·카메라 없이 삼각형을 반투명 회색으로 겹쳐 채운 실루엣이라, "부품이
서로 어느 스케일로 어떻게 맞물리는지"만 본다 — 실제로 예쁘게 보이는지는 여전히
사람이 실기·헤드리스로 봐야 한다.

무엇을 안 하나: 어떤 부품을 어떻게 배치할지 고르는 것(레시피는 호출하는 쪽
책임, kitbash.py와 같은 원칙), 재질·텍스처 확인(palette.py preview 몫).
"""

import json
import math
import sys

import matplotlib
import numpy as np
import trimesh

matplotlib.use("Agg")
import matplotlib.pyplot as plt


def load_geoms(path):
    """부품 GLB 하나의 지오메트리들을 씬 그래프 변환까지 구운 채로 뽑는다(kitbash.py와 같은 방식)."""
    scene = trimesh.load(path, force="scene")
    out = []
    for node in scene.graph.nodes_geometry:
        transform, geom_name = scene.graph[node]
        g = scene.geometry[geom_name].copy()
        g.apply_transform(transform)
        out.append(g)
    return out


def matrix(pos, rot_deg, scale):
    rot = trimesh.transformations.rotation_matrix(math.radians(rot_deg), [0, 1, 0])
    trans = trimesh.transformations.translation_matrix(pos)
    scale_m = trimesh.transformations.scale_matrix(scale)
    return trans.dot(rot).dot(scale_m)


def assemble(parts_dir, recipe):
    """kitbash.py 의 RECIPES 항목과 같은 스키마({file, pos, rot, scale})를 그대로 받는다."""
    combined = []
    for part in recipe:
        geoms = load_geoms(parts_dir + "/" + part["file"])
        m = matrix(part.get("pos", (0.0, 0.0, 0.0)), part.get("rot", 0.0), part.get("scale", 1.0))
        for g in geoms:
            gg = g.copy()
            gg.apply_transform(m)
            combined.append(gg)
    return combined


def preview(geoms, out_png, title=""):
    """정면(XY)·측면(ZY)·평면(XZ) 3뷰 실루엣 하나의 PNG로."""
    fig = plt.figure(figsize=(12, 4))
    all_v = np.vstack([g.vertices for g in geoms])
    lo = all_v.min(axis=0)
    hi = all_v.max(axis=0)
    span = (hi - lo).max() * 0.6 + 0.01
    ctr = (hi + lo) / 2
    views = [("front (XY)", 0, 1), ("side (ZY)", 2, 1), ("top (XZ)", 0, 2)]
    for i, (name, ax1, ax2) in enumerate(views):
        ax = fig.add_subplot(1, 3, i + 1)
        for g in geoms:
            v = g.vertices
            for tri in g.faces:
                pts = v[tri][:, [ax1, ax2]]
                ax.fill(pts[:, 0], pts[:, 1], color="#4a4a4a", alpha=0.35, edgecolor="none")
        ax.set_xlim(ctr[ax1] - span, ctr[ax1] + span)
        ax.set_ylim(ctr[ax2] - span, ctr[ax2] + span)
        ax.set_aspect("equal")
        ax.set_title(name)
    fig.suptitle(title)
    fig.tight_layout()
    fig.savefig(out_png, dpi=110)
    plt.close(fig)
    print("saved", out_png, "bounds", lo.tolist(), hi.tolist())


def main():
    if len(sys.argv) < 4:
        sys.exit(
            "usage: preview_scene.py <parts-dir> <recipe-json> <out.png> [title]\n"
            "  recipe-json 는 kitbash.py RECIPES 항목 하나와 같은 배열 리터럴"
        )
    parts_dir, recipe_json, out_png = sys.argv[1:4]
    title = sys.argv[4] if len(sys.argv) > 4 else ""
    recipe = json.loads(recipe_json)
    geoms = assemble(parts_dir, recipe)
    preview(geoms, out_png, title)


if __name__ == "__main__":
    main()
