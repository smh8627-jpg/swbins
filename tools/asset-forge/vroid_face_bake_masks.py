"""VRoid/VRM 얼굴(Face 메시)의 겹친 알파컷아웃 데칼 7장(눈썹·눈꺼풀선·
홍채·하이라이트·입 등)을 하나로 미리 구우려는 파이프라인의 1단계.

배경: saga-godot HISTORY.md 2026-09-19④ 참고. VRM Face 메시는 여러
서피스(재질)가 전부 같은 정점/UV를 공유하고 원래 Unity MToon 렌더큐
순서에만 기대는 방식이라, Godot에 그대로 들여오면 카메라 거리에 따라
겹치는 순서가 흔들려 하얗게 빈다. 각 서피스가 UV 공간에서 실제로 어느
삼각형을 차지하는지 알아야 2D로 올바르게 합성할 수 있는데, 순수 파이썬
(trimesh + PIL) 삼각형 래스터라이즈는 오차가 컸다(이 폴더에서 지워진
vroid_face_bake.py 실패 경위 참고) — 대신 **Blender의 실제 베이크
엔진으로 "이 서피스가 어디를 차지하는지" 흑백 마스크를 서피스마다
구워서** 정확한 소유권을 얻는다.

이 스크립트는 Blender 안에서(--background --python으로) 실행한다.
사람이 짤 필요 없이 아래처럼 명령 하나로 끝난다:

    <blender.exe> --background --python tools/asset-forge/vroid_face_bake_masks.py \
        -- <glb 경로> <출력 폴더> [해상도(기본 1024)]

출력: <출력 폴더>/mask_0.png ~ mask_N.png(서피스 소유권 흑백 마스크,
255=이 서피스 소유) + mask_order.txt(인덱스→재질 이름).
다음 단계는 vroid_face_bake_combine.py — 이 마스크들과 GLB의 실제
텍스처(알파 포함)를 합쳐 최종 얼굴 텍스처 한 장을 만든다.

주의 — 재질이 KHR_materials_unlit이면 Blender는 Emission 셰이더로
들여온다. 원래 색을 구우려면(이 스크립트가 아니라 combine 단계에서)
'EMIT' 베이크가 아니라 이 스크립트처럼 **오버라이드 Emission 색으로
소유권만** 굽는 방식이 안전하다 — 원본 재질의 실제 색을 Blender에서
바로 EMIT 베이크하면 Mix Shader(Transparent/Emission)의 알파 블렌드가
무시되어 알파가 낮은 곳까지 원색이 그대로 나온다(2026-09-19④에서
확인). 그래서 색은 Python 쪽에서 원본 PNG를 직접 읽어 알파와 함께
합성한다(vroid_face_bake_combine.py).
"""
import bpy
import sys
import os

argv = sys.argv
argv = argv[argv.index("--") + 1:]
glb_path, out_dir = argv[0], argv[1]
size = int(argv[2]) if len(argv) > 2 else 1024

os.makedirs(out_dir, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=glb_path)

face_obj = next(o for o in bpy.data.objects if o.type == "MESH" and "Face" in o.name)
names = [s.material.name for s in face_obj.material_slots]
print("MATERIALS:", names)

mask_img = bpy.data.images.new("Mask", width=size, height=size, alpha=False)

bpy.context.scene.render.engine = "CYCLES"
bpy.context.scene.cycles.samples = 1

for idx in range(len(face_obj.material_slots)):
    for j, slot in enumerate(face_obj.material_slots):
        mat = slot.material
        if not mat.use_nodes:
            mat.use_nodes = True
        nt = mat.node_tree
        old = nt.nodes.get("BAKE_OVERRIDE_EMIT")
        if old:
            nt.nodes.remove(old)
        old_img = nt.nodes.get("BAKE_TARGET")
        if old_img:
            nt.nodes.remove(old_img)
        out_node = next(n for n in nt.nodes if n.type == "OUTPUT_MATERIAL")
        emit = nt.nodes.new("ShaderNodeEmission")
        emit.name = "BAKE_OVERRIDE_EMIT"
        emit.inputs["Color"].default_value = (1, 1, 1, 1) if j == idx else (0, 0, 0, 1)
        nt.links.new(emit.outputs["Emission"], out_node.inputs["Surface"])
        img_node = nt.nodes.new("ShaderNodeTexImage")
        img_node.name = "BAKE_TARGET"
        img_node.image = mask_img
        for n in nt.nodes:
            n.select = False
        img_node.select = True
        nt.nodes.active = img_node

    for o in bpy.data.objects:
        o.select_set(False)
    bpy.context.view_layer.objects.active = face_obj
    face_obj.select_set(True)
    bpy.ops.object.bake(type="EMIT", margin=0)

    out_path = os.path.join(out_dir, "mask_%d.png" % idx)
    mask_img.filepath_raw = out_path
    mask_img.file_format = "PNG"
    mask_img.save()
    print("SAVED MASK", idx, names[idx], "->", out_path)

with open(os.path.join(out_dir, "mask_order.txt"), "w", encoding="utf-8") as f:
    for i, n in enumerate(names):
        f.write("%d\t%s\n" % (i, n))
print("ALL MASKS DONE")
