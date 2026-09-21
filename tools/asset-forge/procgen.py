#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
프록시젠 — SAGA-DESIGN.md §7.2 3번(procgen.py). 좌표·씨앗만으로 소품 GLB를
찍어낸다(원본 에셋 없이 코드가 그린다는 원칙 그대로, PLAN.md 103-1/103-3).

지금 찍는 다섯: rock(노이즈 구체 바위) · stele(비석) · fence(울타리 한 칸) ·
wall(돌담 한 칸) · tree(나무, 몸통+수관). 전부 저폴리·flat shaded — 트라이앵글
몇십 개로 128px 실루엣에서 구별되면 충분하다(103-5 판정 절차, 3단계).

씨앗(seed)이 같으면 결과가 완전히 같다(재생성 가능해야 한다는 103-1 규칙).
파일명 관례 `<kind>_s<seed>_<nn>.glb`의 `<nn>`은 `batch` 명령이 매기는
일련번호일 뿐, 모양에는 영향을 주지 않는다(seed만 모양을 결정한다).

무엇을 안 하나: 팔레트 스냅(palette.py snap-glb 몫, 이 스크립트 다음
단계), 씬에 배치하는 것(그 판의 `*_builder.gd`/`density_report.gd`
빈 칸 목록을 보고 사람/세션이 어디에 몇 개 놓을지 판단).
"""

import argparse
import os

import numpy as np
import trimesh

FORGE_DIR = os.path.dirname(os.path.abspath(__file__))


def _rng(seed):
    return np.random.default_rng(seed)


def _export(mesh, out_path):
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    mesh.export(out_path)
    print("생성 verts=%d faces=%d -> %s" % (len(mesh.vertices), len(mesh.faces), out_path))
    return mesh


def _concat_colored(mesh_color_pairs):
    """trimesh.util.concatenate는 서로 다른 vertex_colors를 안정적으로 안 섞어
    준다 — 파트별 RGBA를 직접 펼쳐 붙인다(UV는 안 만든다, saga-unity의
    트라이플레이너 재질이 위치·법선만 본다). process=False로 정점을 안
    합쳐 각진 저폴리 실루엣을 그대로 남긴다."""
    verts, faces, colors = [], [], []
    offset = 0
    for mesh, rgba in mesh_color_pairs:
        v = mesh.vertices
        verts.append(v)
        faces.append(mesh.faces + offset)
        colors.append(np.tile(np.array(rgba, dtype=np.uint8), (len(v), 1)))
        offset += len(v)
    merged = trimesh.Trimesh(
        vertices=np.concatenate(verts, axis=0),
        faces=np.concatenate(faces, axis=0),
        vertex_colors=np.concatenate(colors, axis=0),
        process=False,
    )
    merged.fix_normals()
    return merged


def make_rock(seed, radius=0.5, subdivisions=1, noise=0.3):
    """이코사구를 뒤틀어 노이즈 바위를 만든다 — 정점을 법선 방향으로
    씨앗 난수만큼 밀어낸다(스무딩 없음, 각진 저폴리 그대로 남긴다).
    회색 정점색을 입힌다(saga-unity Saga/VertexColorTriplanarLit의
    바탕색 — 트라이플레이너 디테일 텍스처가 그 위에 곱혀진다)."""
    mesh = trimesh.creation.icosphere(subdivisions=subdivisions, radius=radius)
    rng = _rng(seed)
    jitter = 1.0 + rng.uniform(-noise, noise, size=len(mesh.vertices))
    mesh.vertices = mesh.vertices * jitter[:, None]
    # 위아래로도 살짝 눌러 완전한 구 티를 없앤다(바위는 보통 한쪽이 낮다).
    mesh.vertices[:, 1] *= 0.75 + rng.uniform(0.0, 0.2)
    gray = 0.42 + rng.uniform(-0.05, 0.05)
    return _concat_colored([(mesh, (int(gray * 255), int(gray * 255), int(gray * 255), 255))])


def make_stele(seed, height=1.6, width=0.4, depth=0.18):
    """비석 — 사각 기둥 몸통 + 네모뿔 지붕(옛 유물·묘비류 실루엣)."""
    rng = _rng(seed)
    w = width * rng.uniform(0.85, 1.15)
    d = depth * rng.uniform(0.85, 1.15)
    h = height * rng.uniform(0.85, 1.15)
    cap_h = h * 0.18
    body = trimesh.creation.box(extents=(w, h - cap_h, d))
    body.apply_translation((0, (h - cap_h) / 2.0, 0))
    cap = trimesh.creation.cone(radius=max(w, d) * 0.62, height=cap_h, sections=4)
    cap.apply_translation((0, h - cap_h, 0))
    mesh = trimesh.util.concatenate([body, cap])
    mesh.fix_normals()
    return mesh


def make_fence(seed, length=2.0, height=0.9, posts=2):
    """울타리 한 칸 — 기둥 posts개 + 가로대 2단. 반복 배치는 씬 쪽 몫."""
    rng = _rng(seed)
    post_w = 0.08 * rng.uniform(0.9, 1.1)
    parts = []
    for i in range(posts):
        x = -length / 2.0 + i * (length / max(1, posts - 1)) if posts > 1 else 0.0
        p = trimesh.creation.box(extents=(post_w, height, post_w))
        p.apply_translation((x, height / 2.0, 0))
        parts.append(p)
    for frac in (0.55, 0.9):
        rail = trimesh.creation.box(extents=(length, 0.06, 0.04))
        rail.apply_translation((0, height * frac, 0))
        parts.append(rail)
    mesh = trimesh.util.concatenate(parts)
    mesh.fix_normals()
    return mesh


def make_wall(seed, length=2.0, height=1.0, thickness=0.3, rows=3, cols=4):
    """돌담 한 칸 — 블록을 벽돌쌓기(줄마다 반 칸 어긋남)로 놓고 씨앗
    난수로 크기·위치를 살짝 흔든다(완전한 규칙 격자는 인공적으로 보인다)."""
    rng = _rng(seed)
    block_w = length / cols
    block_h = height / rows
    parts = []
    for r in range(rows):
        offset = block_w / 2.0 if r % 2 == 1 else 0.0
        n = cols if r % 2 == 0 else cols + 1
        for c in range(n):
            x = -length / 2.0 + offset + c * block_w - (block_w / 2.0 if r % 2 == 1 else 0.0)
            if x < -length / 2.0 - block_w * 0.4 or x > length / 2.0 + block_w * 0.4:
                continue
            jw = block_w * rng.uniform(0.82, 0.98)
            jh = block_h * rng.uniform(0.85, 1.05)
            jd = thickness * rng.uniform(0.9, 1.05)
            block = trimesh.creation.box(extents=(jw, jh, jd))
            y = r * block_h + block_h / 2.0
            block.apply_translation((x, y, rng.uniform(-0.01, 0.01)))
            parts.append(block)
    mesh = trimesh.util.concatenate(parts)
    mesh.fix_normals()
    return mesh


def make_tree(seed, trunk_height=3.0, trunk_radius=0.35, canopy_radius=1.6):
    """나무 — 저폴리 몸통(육각 기둥) + 수관. 씨앗으로 세 형태 중 하나를
    고른다(0=둥근 다발 활엽수, 1=원뿔형 침엽수, 2=성긴 다발 — 버드나무류).
    UV는 안 만든다 — 몸통은 갈색, 수관은 초록 정점색을 입혀 두고
    saga-unity의 Saga/VertexColorTriplanarLit이 트라이플레이너 바크
    디테일 텍스처를 그 위에 곱한다(PLAN.md 102-4, 03-1)."""
    rng = _rng(seed)
    th = trunk_height * rng.uniform(0.8, 1.3)
    tr = trunk_radius * rng.uniform(0.8, 1.2)
    trunk = trimesh.creation.cylinder(radius=tr, height=th, sections=6)
    trunk.apply_translation((0, th / 2.0, 0))
    trunk_rgba = (
        int((0.32 + rng.uniform(-0.04, 0.04)) * 255),
        int((0.21 + rng.uniform(-0.03, 0.03)) * 255),
        int((0.12 + rng.uniform(-0.02, 0.02)) * 255),
        255,
    )
    canopy_rgba = (
        int((0.12 + rng.uniform(-0.03, 0.05)) * 255),
        int((0.30 + rng.uniform(-0.05, 0.08)) * 255),
        int((0.11 + rng.uniform(-0.03, 0.03)) * 255),
        255,
    )
    parts = [(trunk, trunk_rgba)]

    form = int(rng.integers(0, 3))
    cr = canopy_radius * rng.uniform(0.85, 1.25)
    if form == 0:
        n = int(rng.integers(3, 6))
        for _ in range(n):
            ang = rng.uniform(0, 2 * np.pi)
            rad = rng.uniform(0, cr * 0.45)
            c = trimesh.creation.icosphere(subdivisions=0, radius=cr * rng.uniform(0.55, 0.85))
            c.apply_translation((np.cos(ang) * rad, th * 0.92 + th * 0.15 * rng.uniform(-1, 1), np.sin(ang) * rad))
            parts.append((c, canopy_rgba))
    elif form == 1:
        levels = int(rng.integers(2, 4))
        for i in range(levels):
            frac = i / max(1, levels - 1)
            y = th * (0.55 + frac * 0.55)
            r = cr * (1.0 - frac * 0.65) * rng.uniform(0.9, 1.1)
            cone = trimesh.creation.cone(radius=r, height=th * 0.32, sections=6)
            cone.apply_translation((0, y, 0))
            parts.append((cone, canopy_rgba))
    else:
        n = int(rng.integers(2, 4))
        for _ in range(n):
            ang = rng.uniform(0, 2 * np.pi)
            rad = rng.uniform(cr * 0.2, cr * 0.6)
            y = th * rng.uniform(0.75, 1.05)
            c = trimesh.creation.icosphere(subdivisions=0, radius=cr * rng.uniform(0.4, 0.65))
            c.apply_translation((np.cos(ang) * rad, y, np.sin(ang) * rad))
            parts.append((c, canopy_rgba))

    return _concat_colored(parts)


KINDS = {
    "rock": make_rock,
    "stele": make_stele,
    "fence": make_fence,
    "wall": make_wall,
    "tree": make_tree,
}


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)

    for kind in KINDS:
        p = sub.add_parser(kind, help="%s GLB 1개 생성" % kind)
        p.add_argument("--seed", type=int, required=True)
        p.add_argument("--out", required=True)

    p_batch = sub.add_parser("batch", help="같은 kind로 씨앗 연속 생성, <kind>_s<seed>_<nn>.glb 이름 규칙")
    p_batch.add_argument("kind", choices=sorted(KINDS.keys()))
    p_batch.add_argument("--count", type=int, required=True)
    p_batch.add_argument("--seed-start", type=int, default=1)
    p_batch.add_argument("--out-dir", required=True)

    args = ap.parse_args()
    if args.cmd in KINDS:
        mesh = KINDS[args.cmd](args.seed)
        _export(mesh, args.out)
    elif args.cmd == "batch":
        fn = KINDS[args.kind]
        for nn in range(1, args.count + 1):
            seed = args.seed_start + nn - 1
            mesh = fn(seed)
            out_path = os.path.join(args.out_dir, "%s_s%d_%02d.glb" % (args.kind, seed, nn))
            _export(mesh, out_path)


if __name__ == "__main__":
    main()
