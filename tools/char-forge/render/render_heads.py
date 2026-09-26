"""머리 가까이 — 모델 여러 개를 한 줄로, 각 머리를 같은 크기 칸에. glb/fbx 둘 다.
blender -b -P render_heads.py -- out.png model1 model2 ...
"""
import bpy, sys, os, math, glob
from mathutils import Vector

a = sys.argv[sys.argv.index('--') + 1:]
out, models = a[0], a[1:]
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
exec(open(os.path.join(os.path.dirname(__file__), 'render_common.py'), encoding='utf-8').read())

x = 0.0
for p in models:
    objs = load_any(p)
    sc.frame_set(12)
    lo, hi = bbox(objs)
    k = 1.7 / (hi.z - lo.z)
    roots = [o for o in objs if o.parent is None]
    for r in roots:
        r.scale = r.scale * k
    bpy.context.view_layer.update()
    lo, hi = bbox(objs)
    for r in roots:
        r.location.x += x - (lo.x + hi.x) / 2
        r.location.y -= (lo.y + hi.y) / 2
        r.location.z -= lo.z
    x += 0.5
setup_light()
n = len(models)
cam_d = bpy.data.cameras.new('cam'); cam = bpy.data.objects.new('cam', cam_d); sc.collection.objects.link(cam); sc.camera = cam
cam_d.type = 'ORTHO'
cam_d.ortho_scale = 0.5 * n
cam.location = ((n - 1) * 0.25, -6, 1.56)
cam.rotation_euler = (math.radians(90), 0, 0)
sc.render.resolution_x, sc.render.resolution_y = 480 * n, 520
set_engine()
fix_materials() if 'fix_materials' in dir() else None
sc.render.filepath = out
bpy.ops.render.render(write_still=True)
print('RENDERED', out)
