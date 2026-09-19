"""VRoid/VRM 얼굴(Face 메시) 데칼 재베이크 — vroid_face_bake_masks.py/
vroid_face_bake_combine.py(2026-09-19④) 전체를 대체한다.

**1차 재작업(2026-09-19⑩)이 또 틀렸던 이유**: SKIN 메시를 베이크 대상
(active)으로 두고 데칼을 그 위에 Selected-to-Active로 투사했는데,
눈·입 자리는 SKIN 메시 자체에 진짜 지오메트리 구멍이 뚫려 있다(원본
텍스처에서 본 검은 눈구멍이 실제로 그 자리에 폴리곤이 없다는 뜻이었다).
그 결과 SKIN의 UV에는 눈 안쪽을 채울 자리 자체가 없어서, 구멍
가장자리(테두리 링)에만 데칼이 걸리고 안쪽은 못 채웠다 — 실기로
구운 눈이 "가느다란 테두리 아치"만 나온 이유.

**이번 방식** — SKIN 메시 대신 **평평한 사각 평면**을 새로 만들어
얼굴 앞에 놓고(전체 X-Z 바운딩박스를 덮는 크기, UV는 그 사각형에
선형으로 대응), 이 평면을 베이크 대상(active)으로 둔다. 평면은 구멍이
없는 연속 UV라 눈 안쪽이든 어디든 다 채울 자리가 있다. 뒤(SKIN)에서
앞(입) 순서로 **같은 이미지에 겹쳐서** 굽는다 — 처음 SKIN만 굽고
`use_clear=True`로 캔버스를 만든 다음, 데칼마다 `use_clear=False`로
같은 이미지에 이어 구우면 이번에 안 맞은 텍세ल은 이전 레이어 값을
그대로 두고 맞은 자리만 덮어써서, Python 쪽 알파 합성 없이 Blender
자체가 뒤→앞 페인터스 알고리즘을 해 준다.

사용:
    <blender.exe> --background --python tools/asset-forge/vroid_face_bake_project.py \
        -- <glb 경로> <출력 png> [해상도(기본 1024)]
"""
import bpy
import bmesh
import sys
import os

argv = sys.argv
argv = argv[argv.index("--") + 1:]
glb_path, out_png = argv[0], argv[1]
size = int(argv[2]) if len(argv) > 2 else 1024

os.makedirs(os.path.dirname(out_png) or ".", exist_ok=True)

# 뒤(SKIN, 베이스)에서 앞(입, 맨 위)으로 — 원래 Unity 렌더큐 순서.
ORDER = ["EyeWhite", "EyeIris", "EyeHighlight", "Brow", "Eyeline", "Mouth"]

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=glb_path)

face_obj = next(o for o in bpy.data.objects if o.type == "MESH" and "Face" in o.name)
mat_names = [s.material.name for s in face_obj.material_slots]
print("MATERIALS:", mat_names)

bpy.context.view_layer.objects.active = face_obj
face_obj.select_set(True)
bpy.ops.object.mode_set(mode="EDIT")
bpy.ops.mesh.select_all(action="SELECT")
bpy.ops.mesh.separate(type="MATERIAL")
bpy.ops.object.mode_set(mode="OBJECT")

face_parts = [o for o in bpy.data.objects if o.type == "MESH" and "Face" in o.name]
by_key = {}
for o in face_parts:
    mn = o.material_slots[0].material.name if o.material_slots else ""
    for key in ["SKIN"] + ORDER:
        if key.lower() in mn.lower():
            by_key[key] = o
            break
print("split objects:", {k: v.name for k, v in by_key.items()})

skin_obj = by_key["SKIN"]

# 얼굴 전체(SKIN+데칼)를 덮는 바운딩박스 — 축은 실측(2026-09-19⑩ 조사):
# X=좌우, Z=위아래, Y=앞뒤(더 음수일수록 앞/코 쪽).
all_parts = [skin_obj] + [by_key[k] for k in ORDER if k in by_key]
xs, ys, zs = [], [], []
for o in all_parts:
    for v in o.data.vertices:
        xs.append(v.co.x)
        ys.append(v.co.y)
        zs.append(v.co.z)
margin_xz = 0.01
plane_y = min(ys) - 0.03  # 가장 앞(코)보다 더 앞에, 평면이 얼굴을 완전히 가리도록.
x0, x1 = min(xs) - margin_xz, max(xs) + margin_xz
z0, z1 = min(zs) - margin_xz, max(zs) + margin_xz
print("bbox x[%.4f,%.4f] z[%.4f,%.4f] plane_y=%.4f" % (x0, x1, z0, z1, plane_y))

# 평면 신설 — bmesh로 직접 만들어 법선 방향을 확실히 잡는다(+Y, 즉 앞에서
# 뒤쪽 얼굴을 향해 레이가 나가는 방향). UV는 (x,z)를 (u,v)에 선형 대응
# (v=0이 z0=얼굴 아래쪽이 되게 — 이미지 좌표는 나중에 필요하면 뒤집는다).
mesh = bpy.data.meshes.new("BakeTargetMesh")
bm = bmesh.new()
v00 = bm.verts.new((x0, plane_y, z0))
v10 = bm.verts.new((x1, plane_y, z0))
v11 = bm.verts.new((x1, plane_y, z1))
v01 = bm.verts.new((x0, plane_y, z1))
bm.verts.ensure_lookup_table()
face = bm.faces.new((v00, v10, v11, v01))
# 법선이 +Y를 향하게 필요하면 뒤집는다.
if face.normal.y < 0:
    face.normal_flip()
uv_layer = bm.loops.layers.uv.new("UVMap")
for loop in face.loops:
    co = loop.vert.co
    u = (co.x - x0) / (x1 - x0)
    v = (co.z - z0) / (z1 - z0)
    loop[uv_layer].uv = (u, v)
bm.to_mesh(mesh)
bm.free()

plane_obj = bpy.data.objects.new("BakeTargetPlane", mesh)
bpy.context.collection.objects.link(plane_obj)

img = bpy.data.images.new("FaceComposite", width=size, height=size, alpha=True)
img.alpha_mode = "STRAIGHT"

plane_mat = bpy.data.materials.new("BakeTargetMat")
plane_mat.use_nodes = True
plane_obj.data.materials.append(plane_mat)
nt = plane_mat.node_tree
img_node = nt.nodes.new("ShaderNodeTexImage")
img_node.name = "BAKE_TARGET"
img_node.image = img
for n in nt.nodes:
    n.select = False
img_node.select = True
nt.nodes.active = img_node

bpy.context.scene.render.engine = "CYCLES"
bpy.context.scene.cycles.samples = 64
bpy.context.scene.render.film_transparent = True

depth = max(ys) - min(ys)
ray_dist = depth + 0.1
print("max_ray_distance =", ray_dist)

bake_order = ["SKIN"] + [k for k in ORDER if k in by_key]
for i, key in enumerate(bake_order):
    src_obj = by_key[key]
    for o in bpy.data.objects:
        o.select_set(False)
    src_obj.select_set(True)
    plane_obj.select_set(True)
    bpy.context.view_layer.objects.active = plane_obj

    bpy.ops.object.bake(
        type="COMBINED",
        use_selected_to_active=True,
        use_clear=(i == 0),
        cage_extrusion=0.0,
        max_ray_distance=ray_dist,
        margin=0,
    )
    print("BAKED", key, "(clear=%s)" % (i == 0))

img.filepath_raw = out_png
img.file_format = "PNG"
img.save()
print("SAVED COMPOSITE ->", out_png)
print("ALL DONE")
