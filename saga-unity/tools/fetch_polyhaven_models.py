#!/usr/bin/python3
# -*- coding: utf-8 -*-
"""PLAN.md 108 ① "지역 전용 소품" — Poly Haven(CC0) 모델 원본을 glTF 1k 로 받아
Assets/Art/Props/PolyHaven/<id>/ 에 둔다. 받은 파일은 커밋한다(Unity .meta GUID 가
씬 참조를 물고 있어 다시 받지 않는다 — 103-1 과 같은 이유). 이 스크립트는 출처 기록·
다른 PC 에서 같은 파일을 다시 받는 용도.

    py tools/fetch_polyhaven_models.py            # 목록 전부
    py tools/fetch_polyhaven_models.py stone_01   # 하나만
"""
import json
import os
import sys
import urllib.request

IDS = [
    "dead_quiver_trunk", "dead_tree_trunk", "stone_fire_pit", "wine_barrel_01",
    "wooden_crate_01", "wooden_lantern_01", "kite_shield", "rock_moss_set_02",
    "wicker_basket_01", "wooden_bucket_01",
    # PLAN.md 109-1b 세 시대 — 현대 조각(땅) · 미래 "시간 틈 잔해"(청록 재질로 떠서 돈다)
    "barrel_03", "old_tyre", "utility_box_01", "covered_car", "concrete_road_barrier_02",
    "vintage_spacecraft_instrument", "security_camera_02", "portable_searchlight", "power_box_01", "portable_generator",
]
RES = "1k"
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "Art", "Props", "PolyHaven")


def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": "saga-unity-fetch"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()


def fetch(asset_id):
    files = json.loads(get(f"https://api.polyhaven.com/files/{asset_id}"))
    entry = files["gltf"][RES]["gltf"]
    dest = os.path.join(OUT, asset_id)
    os.makedirs(dest, exist_ok=True)
    items = [(os.path.basename(entry["url"]), entry["url"])] + [(k, v["url"]) for k, v in entry.get("include", {}).items()]
    for rel, url in items:
        path = os.path.join(dest, rel)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "wb") as f:
            f.write(get(url))
    print(f"{asset_id}: {len(items)} files")


if __name__ == "__main__":
    for i in (sys.argv[1:] or IDS):
        fetch(i)
