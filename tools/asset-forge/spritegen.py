#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
스프라이트젠 — SAGA-DESIGN.md §7.2 5번(spritegen.py). "아이콘·UI 9-slice·
상태 아이콘"을 찍는다. PLAN.md 102-7 "허접해 보이는 10가지" 표의
"UI 폰트·패널 불일치"(9-slice 패널 1종 없음) 구멍을 채우는 게 첫 쓰임.

**SVG 단계는 생략한다**: 원안은 "SVG→PNG"지만 들여올 SVG 소스가 아직
하나도 없다(외부 아이콘 팩을 안 쓴다는 원칙 그대로 — 103-1). 대신
procgen.py/tilegen.py와 같은 방식으로 PIL `ImageDraw`가 직접 벡터 도형을
그려 그 자리에서 래스터화한다 — 결과 PNG는 SVG를 거친 것과 동일하고,
좌표는 씨앗이 아니라 크기·비율 인자로 결정적이다.

지금 찍는 것: `panel_9slice`(둥근 모서리 프레임, `NinePatchRect` patch_margin
용) · `icon_heart_filled`/`icon_heart_empty`(FOREST 관계 하트 ♥ 대체용)
· `icon_star`(평가·즐겨찾기용).

무엇을 안 하나: 어떤 씬의 어떤 Label/TextureRect를 이 결과로 바꿀지
(사람/세션이 씬별로 판단, §8-1 — 실기 확인 전엔 보류).
"""

import argparse
import math
import os

import numpy as np
from PIL import Image, ImageDraw

FORGE_DIR = os.path.dirname(os.path.abspath(__file__))


def _rounded_rect_mask(size, radius):
    img = Image.new("L", (size, size), 0)
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=255)
    return img


def make_panel_9slice(size=96, border=18, radius=14,
                       fill_rgba=(0.14, 0.11, 0.09, 0.92),
                       edge_rgba=(0.55, 0.42, 0.22, 1.0)):
    """9-slice 패널 — 바깥 테두리(edge)와 안쪽 살(fill)을 둥근 모서리로 겹친다.
    Godot `NinePatchRect.patch_margin_*`는 이 함수의 `border` 값을 그대로 쓰면 된다."""
    def _u8(rgba):
        return tuple(int(round(c * 255)) for c in rgba)

    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    outer_mask = _rounded_rect_mask(size, radius)
    edge_layer = Image.new("RGBA", (size, size), _u8(edge_rgba))
    canvas.paste(edge_layer, (0, 0), outer_mask)

    inner_size = size - border * 2
    inner_radius = max(2, radius - border // 2)
    inner_mask_small = _rounded_rect_mask(inner_size, inner_radius)
    inner_mask = Image.new("L", (size, size), 0)
    inner_mask.paste(inner_mask_small, (border, border))
    fill_layer = Image.new("RGBA", (size, size), _u8(fill_rgba))
    canvas.paste(fill_layer, (0, 0), inner_mask)

    # 위쪽 안쪽 모서리에 옅은 하이라이트 한 줄(베벨 느낌, 102-7 "패널 불일치" 처방).
    hi = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    hd = ImageDraw.Draw(hi)
    hd.line([(border + 2, border + 1), (size - border - 2, border + 1)],
            fill=(255, 255, 255, 40), width=1)
    canvas = Image.alpha_composite(canvas, hi)
    return canvas


def _heart_polygon(size, scale=0.42):
    cx, cy = size / 2.0, size * 0.40
    r = size * scale * 0.5
    pts = []
    for i in range(64):
        t = i / 63.0 * 2 * math.pi
        x = 16 * math.sin(t) ** 3
        y = 13 * math.cos(t) - 5 * math.cos(2 * t) - 2 * math.cos(3 * t) - math.cos(4 * t)
        pts.append((cx + x * (r / 16.0), cy - y * (r / 16.0) + size * 0.06))
    return pts


def make_icon_heart(size=64, filled=True, rgba=(0.86, 0.24, 0.32, 1.0)):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    pts = _heart_polygon(size)
    color_u8 = tuple(int(round(c * 255)) for c in rgba)
    if filled:
        d.polygon(pts, fill=color_u8)
    else:
        d.line(pts + [pts[0]], fill=color_u8, width=max(2, size // 24))
    return img


def make_icon_star(size=64, points=5, rgba=(0.95, 0.78, 0.20, 1.0)):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    cx, cy = size / 2.0, size / 2.0
    r_out, r_in = size * 0.46, size * 0.19
    pts = []
    for i in range(points * 2):
        r = r_out if i % 2 == 0 else r_in
        a = math.pi / points * i - math.pi / 2
        pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    d.polygon(pts, fill=tuple(int(round(c * 255)) for c in rgba))
    return img


KINDS = {
    "panel_9slice": lambda: make_panel_9slice(),
    "icon_heart_filled": lambda: make_icon_heart(filled=True),
    "icon_heart_empty": lambda: make_icon_heart(filled=False),
    "icon_star": lambda: make_icon_star(),
}


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)

    p_one = sub.add_parser("one", help="KINDS 중 하나를 생성")
    p_one.add_argument("kind", choices=sorted(KINDS.keys()))
    p_one.add_argument("--out", required=True)

    p_all = sub.add_parser("batch-all", help="KINDS 전부를 out-dir 아래 <kind>.png 로 생성")
    p_all.add_argument("--out-dir", required=True)

    args = ap.parse_args()
    if args.cmd == "one":
        img = KINDS[args.kind]()
        os.makedirs(os.path.dirname(args.out), exist_ok=True)
        img.save(args.out)
        print("스프라이트 %s -> %s" % (args.kind, args.out))
    elif args.cmd == "batch-all":
        os.makedirs(args.out_dir, exist_ok=True)
        for kind, fn in KINDS.items():
            out_path = os.path.join(args.out_dir, "%s.png" % kind)
            fn().save(out_path)
            print("스프라이트 %s -> %s" % (kind, out_path))


if __name__ == "__main__":
    main()
