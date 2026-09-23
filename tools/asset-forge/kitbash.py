#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
킷배싱 — SAGA-DESIGN.md §7.2 2번(kitbash.py). 부품 GLB(벽·지붕·굴뚝 등)를
좌표·회전으로 배치해 하나의 건물 GLB로 합친다.

이 판(saga-forest)의 첫 쓰임: Kenney "Fantasy Town Kit"(CC0, 모듈형 1x1
그리드) 벽·지붕 부품으로 집 세 채를 조립해, 사진측량(PBR) 실사 건물
(BLD_REAL — house_wooden 등)을 툰 셰이딩에 원래 어울리는 스타일라이즈드
저폴리로 갈아 끼운다. 부품의 좌표 규칙은 `벽`이 1x1 셀의 +X 변(두께
0.1~0.15, x∈[~0.4,0.5], z∈[-0.5,0.5], y∈[0,1])에 있고, Y축 회전
0/90/180/270°로 나머지 세 변을 채운다(같은 저자의 모듈 킷이 공통으로
쓰는 관례 — 회전 후에도 위치는 원점 그대로).

무엇을 안 하나: 부품이 어떤 건물에 들어갈지 고르는 것(레시피는 여기
하드코딩, 새 건물마다 사람/세션이 판단), 텍스처 팔레트 스냅(palette.py
snap-glb 몫, 이 스크립트 다음 단계).
"""

import argparse
import math
import os
import sys

import numpy as np
import trimesh

FORGE_DIR = os.path.dirname(os.path.abspath(__file__))


def _matrix(pos, rot_deg, scale):
    rot = trimesh.transformations.rotation_matrix(math.radians(rot_deg), [0, 1, 0])
    trans = trimesh.transformations.translation_matrix(pos)
    scale_m = trimesh.transformations.scale_matrix(scale)
    return trans.dot(rot).dot(scale_m)


def _load_part_geoms(path):
    """부품 GLB 하나의 지오메트리들을 씬 그래프 변환까지 구운 채로 뽑는다
    (도어 손잡이처럼 자식 노드가 따로 있는 부품도 그대로 딸려온다)."""
    scene = trimesh.load(path, force="scene")
    out = []
    for node in scene.graph.nodes_geometry:
        transform, geom_name = scene.graph[node]
        geom = scene.geometry[geom_name].copy()
        geom.apply_transform(transform)
        out.append(geom)
    return out


def assemble(recipe, parts_dir, out_path):
    scene = trimesh.Scene()
    idx = 0
    for part in recipe:
        src = os.path.join(parts_dir, part["file"])
        if not os.path.isfile(src):
            sys.exit("부품이 없습니다: %s" % src)
        geoms = _load_part_geoms(src)
        m = _matrix(part.get("pos", (0.0, 0.0, 0.0)), part.get("rot", 0.0), part.get("scale", 1.0))
        for g in geoms:
            gg = g.copy()
            gg.apply_transform(m)
            scene.add_geometry(gg, node_name="%s_%d" % (os.path.splitext(part["file"])[0], idx))
            idx += 1
    bounds = scene.bounds
    if bounds is None or not np.all(np.isfinite(bounds)):
        sys.exit("조립 결과 바운드가 비정상입니다(NaN/Inf) — 레시피 확인.")
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    scene.export(out_path)
    print("조립 %d조각 -> %s (bounds %s)" % (idx, out_path, bounds.tolist()))
    return bounds


# 이 판(saga-forest) §6.2 — BLD_REAL 사진측량 3채(house_wooden·house_cottage·
# house_stone)를 대체할 Kenney Fantasy Town Kit 조립 레시피. 벽 넷이 1x1 셀
# 둘레를 채우고(0/90/180/270), 지붕은 y=1(벽 꼭대기)에 얹는다.
RECIPES = {
    "house_wood_home": [
        {"file": "wall-wood-door.glb", "rot": 0},
        {"file": "wall-wood.glb", "rot": 90},
        {"file": "wall-wood.glb", "rot": 180},
        {"file": "wall-wood-window-round.glb", "rot": 270},
        {"file": "roof-gable.glb", "pos": (0, 1, 0)},
        {"file": "chimney.glb", "pos": (0, 1, 0)},
    ],
    "house_wood_cottage": [
        {"file": "wall-wood-door.glb", "rot": 0},
        {"file": "wall-wood-window-round.glb", "rot": 90},
        {"file": "wall-wood.glb", "rot": 180},
        {"file": "wall-wood.glb", "rot": 270},
        {"file": "roof-high-gable.glb", "pos": (0, 1, 0)},
    ],
    "house_stone_museum": [
        {"file": "wall-door.glb", "rot": 0},
        {"file": "wall.glb", "rot": 90},
        {"file": "wall.glb", "rot": 180},
        {"file": "wall-window-stone.glb", "rot": 270},
        {"file": "roof-flat.glb", "pos": (0, 1, 0)},
    ],

    # 2026-09-19 — §6.4 "주민 집 외형 3종(집 GLB + 지붕 색)". 첫 캠프
    # (hamletSpot)의 세 채(hamletHouse·hamletHut·hamletShed, 지금은
    # Quaternius medieval_village_pack House_1~3.glb)를 이 판의 킷배싱
    # 스타일로 갈아 끼운다 — 벽 배치는 house_wood_home과 완전히 같고,
    # 지붕만 tools/asset-forge/palette.py tint-glb로 미리 물들여 둔 것으로
    # 바꿔 세 채가 서로 다르게 보이게 한다(부품 낭비 없이 "3종" 확보).
    # 조립 뒤 palette.py snap-glb --exclude-node-prefix roof 로 벽만 forest_green
    # 팔레트에 맞추고, 이미 물들인 지붕은 그대로 둔다(README·HANDOFF 참고).
    "house_camp_a": [
        {"file": "wall-wood-door.glb", "rot": 0},
        {"file": "wall-wood.glb", "rot": 90},
        {"file": "wall-wood.glb", "rot": 180},
        {"file": "wall-wood-window-round.glb", "rot": 270},
        {"file": "roof-gable-stem.glb", "pos": (0, 1, 0)},
        {"file": "chimney.glb", "pos": (0, 1, 0)},
    ],
    "house_camp_b": [
        {"file": "wall-wood-door.glb", "rot": 0},
        {"file": "wall-wood.glb", "rot": 90},
        {"file": "wall-wood.glb", "rot": 180},
        {"file": "wall-wood-window-round.glb", "rot": 270},
        {"file": "roof-gable-stone.glb", "pos": (0, 1, 0)},
        {"file": "chimney.glb", "pos": (0, 1, 0)},
    ],
    "house_camp_c": [
        {"file": "wall-wood-door.glb", "rot": 0},
        {"file": "wall-wood.glb", "rot": 90},
        {"file": "wall-wood.glb", "rot": 180},
        {"file": "wall-wood-window-round.glb", "rot": 270},
        {"file": "roof-gable-accent.glb", "pos": (0, 1, 0)},
        {"file": "chimney.glb", "pos": (0, 1, 0)},
    ],

    # 2026-09-23 — saga-realm §6 "탑 킷배싱"(성채 2·3등급 동양풍). 1등급
    # `city:t1`(BellStructure.glb, 2026-09-10 채택)과 같은 CC0 저장소
    # (github.com/ToxSam/cc0-models-Polygonal-Mind)의 다른 프로젝트
    # "tomb-chaser-2"(일본풍 탑 팩)에서 기둥·지붕만 받아 왔다 — 그 팩의
    # 벽·기단 조각(TempleBaseCorner 등)은 회전만으로는 안 맞물려(직접
    # 조립해 오프라인 3뷰 실루엣으로 확인, 2026-09-23) 이번엔 기둥+지붕만
    # 쓴다. 지붕(TempleRoof01Corner)은 네 개를 0/90/180/270 으로 돌리면
    # 완결된 정사각 우진각 지붕(네 귀퉁이가 들린 처마)이 된다 — 이것도
    # 오프라인 실루엣으로 먼저 확인했다(부품끼리 상대 배치·비율 확인일
    # 뿐, 실제 화면·헤드리스 크롬과는 무관 — palette.py preview 와 같은
    # 성격). 2등급은 1층(기둥 4+지붕), 3등급은 2층(작은 2층을 얹어 전형적
    # 탑 실루엣의 좁아지는 모양) — 등급마다 다른 형태라야 하는 PLAN §6
    # 조건을 충족한다("등급 3 × 지역 스타일" 표의 동양풍 칸).
    "city_t2_asian": [
        {"file": "TempleColumn_Art.glb", "pos": (2.8, 0, 2.8)},
        {"file": "TempleColumn_Art.glb", "pos": (-2.8, 0, 2.8)},
        {"file": "TempleColumn_Art.glb", "pos": (2.8, 0, -2.8)},
        {"file": "TempleColumn_Art.glb", "pos": (-2.8, 0, -2.8)},
        {"file": "TempleRoof01Corner_Art.glb", "pos": (0, 7, 0), "rot": 0},
        {"file": "TempleRoof01Corner_Art.glb", "pos": (0, 7, 0), "rot": 90},
        {"file": "TempleRoof01Corner_Art.glb", "pos": (0, 7, 0), "rot": 180},
        {"file": "TempleRoof01Corner_Art.glb", "pos": (0, 7, 0), "rot": 270},
    ],
    "city_t3_asian": [
        {"file": "TempleColumn_Art.glb", "pos": (2.8, 0, 2.8)},
        {"file": "TempleColumn_Art.glb", "pos": (-2.8, 0, 2.8)},
        {"file": "TempleColumn_Art.glb", "pos": (2.8, 0, -2.8)},
        {"file": "TempleColumn_Art.glb", "pos": (-2.8, 0, -2.8)},
        {"file": "TempleRoof01Corner_Art.glb", "pos": (0, 7, 0), "rot": 0},
        {"file": "TempleRoof01Corner_Art.glb", "pos": (0, 7, 0), "rot": 90},
        {"file": "TempleRoof01Corner_Art.glb", "pos": (0, 7, 0), "rot": 180},
        {"file": "TempleRoof01Corner_Art.glb", "pos": (0, 7, 0), "rot": 270},
        {"file": "TempleColumn_Art.glb", "pos": (1.9, 9.0, 1.9), "scale": 0.65},
        {"file": "TempleColumn_Art.glb", "pos": (-1.9, 9.0, 1.9), "scale": 0.65},
        {"file": "TempleColumn_Art.glb", "pos": (1.9, 9.0, -1.9), "scale": 0.65},
        {"file": "TempleColumn_Art.glb", "pos": (-1.9, 9.0, -1.9), "scale": 0.65},
        {"file": "TempleRoof01Corner_Art.glb", "pos": (0, 13.55, 0), "rot": 0, "scale": 0.7},
        {"file": "TempleRoof01Corner_Art.glb", "pos": (0, 13.55, 0), "rot": 90, "scale": 0.7},
        {"file": "TempleRoof01Corner_Art.glb", "pos": (0, 13.55, 0), "rot": 180, "scale": 0.7},
        {"file": "TempleRoof01Corner_Art.glb", "pos": (0, 13.55, 0), "rot": 270, "scale": 0.7},
    ],
}


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)

    p_build = sub.add_parser("build", help="RECIPES 의 레시피 하나를 조립해 GLB 로 낸다")
    p_build.add_argument("name", choices=sorted(RECIPES.keys()))
    p_build.add_argument("--parts-dir", required=True)
    p_build.add_argument("--out", required=True)

    p_all = sub.add_parser("build-all", help="RECIPES 전부를 out-dir 아래 <name>.glb 로 조립")
    p_all.add_argument("--parts-dir", required=True)
    p_all.add_argument("--out-dir", required=True)

    args = ap.parse_args()
    if args.cmd == "build":
        assemble(RECIPES[args.name], args.parts_dir, args.out)
    elif args.cmd == "build-all":
        for name, recipe in RECIPES.items():
            assemble(recipe, args.parts_dir, os.path.join(args.out_dir, "%s.glb" % name))


if __name__ == "__main__":
    main()
