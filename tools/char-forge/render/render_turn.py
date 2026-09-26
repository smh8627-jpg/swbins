"""돌려 보기 — 모델마다 앞·비스듬·옆·뒤 네 방향을 한 줄로(옷 뒤 매듭·어깨판·날개처럼 앞에서 안 보이는 것 확인용). glb/fbx.
blender -b --factory-startup -P render_turn.py -- out.png model1 [model2 ...]      # 모델 하나 = 한 줄
"""
import bpy, sys, os, math, glob
from mathutils import Vector

a = sys.argv[sys.argv.index('--') + 1:]
out, models = a[0], a[1:]
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
exec(open(os.path.join(os.path.dirname(__file__), 'render_common.py'), encoding='utf-8').read())

ANGLES = (0, 40, 90, 180)       # 앞(-Y 를 봄)에서 Z 축으로 돌린 각
STEP, ROW = 1.0, 2.1
for j, p in enumerate(models):
    for i, ang in enumerate(ANGLES):
        objs = load_any(p)
        sc.frame_set(12)
        roots = [o for o in objs if o.parent is None]
        lo, hi = bbox(objs)
        k = 1.7 / (hi.z - lo.z)
        for r in roots:
            r.scale = r.scale * k
        bpy.context.view_layer.update()
        lo, hi = bbox(objs)
        for r in roots:
            r.location.x -= (lo.x + hi.x) / 2
            r.location.y -= (lo.y + hi.y) / 2
            r.location.z -= lo.z
        bpy.context.view_layer.update()
        piv = bpy.data.objects.new('piv', None); sc.collection.objects.link(piv)
        for r in roots:
            r.parent = piv
        piv.rotation_euler = (0, 0, math.radians(ang))
        piv.location = (i * STEP, 0, -j * ROW)
setup_light()
cam_d = bpy.data.cameras.new('cam'); cam = bpy.data.objects.new('cam', cam_d); sc.collection.objects.link(cam); sc.camera = cam
cam_d.type = 'ORTHO'
n, m = len(ANGLES), len(models)
W, H = n * STEP, m * ROW
cam.location = ((n - 1) * STEP / 2, -8, 0.9 - (m - 1) * ROW / 2)
cam.rotation_euler = (math.radians(90), 0, 0)
sc.render.resolution_x = 360 * n
sc.render.resolution_y = int(360 * n * H / W) if H < W else 360 * n
cam_d.ortho_scale = max(W, H) * 1.02
cam_d.sensor_fit = 'AUTO'
set_engine()
fix_materials() if 'fix_materials' in dir() else None
sc.render.filepath = out
bpy.ops.render.render(write_still=True)
print('RENDERED', out)
