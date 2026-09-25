# PLAN.md 108 ① — Poly Haven 스캔의 먼 거리용 가벼운 메시(LOD1)를 만든다. 가까이선 원본(LOD0) 그대로 쓴다.
# 재질·텍스처는 안 넣는다(Unity `RegionPropsBuilder` 가 LOD0 재질을 그대로 씌운다 — UV 는 decimate 가 지킨다).
#   "C:/Program Files/Blender Foundation/Blender 5.2/blender.exe" -b -P tools/polyhaven_lod1.py [-- id ...]   (id 를 주면 그것만)
import os
import sys
import bpy

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, "..", "Assets", "Art", "Props", "PolyHaven")
# id → LOD1 비율(원본 삼각형 × 비율)
TARGETS = {
    "dead_tree_trunk": 0.12,
    "rock_moss_set_02": 0.25,
    "wicker_basket_01": 0.22,
    "dead_quiver_trunk": 0.33,
    "wine_barrel_01": 0.35,
    "kite_shield": 0.4,
    # PLAN.md 109-1b 세 시대 조각
    "covered_car": 0.35,
    "concrete_road_barrier_02": 0.2,
    "portable_generator": 0.25,
    "power_box_01": 0.25,
    "portable_searchlight": 0.25,
    "vintage_spacecraft_instrument": 0.3,
    "security_camera_02": 0.3,
    "utility_box_01": 0.4,
}
ONLY = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []

for asset_id, ratio in TARGETS.items():
    if ONLY and asset_id not in ONLY:
        continue
    bpy.ops.wm.read_factory_settings(use_empty=True)
    src = os.path.join(ROOT, asset_id, f"{asset_id}_1k.gltf")
    bpy.ops.import_scene.gltf(filepath=src)
    before = after = 0
    for ob in list(bpy.data.objects):
        if ob.type != "MESH":
            continue
        before += sum(len(p.vertices) - 2 for p in ob.data.polygons)
        mod = ob.modifiers.new("lod1", "DECIMATE")
        mod.decimate_type = "COLLAPSE"
        mod.ratio = ratio
        bpy.context.view_layer.objects.active = ob
        bpy.ops.object.modifier_apply(modifier=mod.name)
        after += sum(len(p.vertices) - 2 for p in ob.data.polygons)
    out = os.path.join(ROOT, asset_id, f"{asset_id}_lod1.glb")
    bpy.ops.export_scene.gltf(filepath=out, export_format="GLB", export_materials="NONE",
                              export_texcoords=True, export_normals=True, export_yup=True)
    print(f"[lod1] {asset_id}: {before} -> {after} tris, {os.path.getsize(out) // 1024}K")
