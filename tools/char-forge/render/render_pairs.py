"""나란히 보기 렌더 — 왼쪽 지금 Mixamo 몸 · 오른쪽 공방 몸, 같은 빛. 대기 동작 첫 프레임 쯤.
blender -b --factory-startup -P render_pairs.py -- <out.png> <mode full|face> <mixamo_dir_or_-> <forge.glb> [<mixamo_dir> <forge.glb> ...]
"""
import bpy, sys, os, glob, math
from mathutils import Vector

a = sys.argv[sys.argv.index('--') + 1:]
out, mode, rest = a[0], a[1], a[2:]
pairs = [(rest[i], rest[i + 1]) for i in range(0, len(rest), 2)]
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
exec(open(os.path.join(os.path.dirname(__file__), 'render_common.py'), encoding='utf-8').read())


def new_objs(before):
    return [o for o in bpy.data.objects if o.name not in before]


def bbox(objs):
    pts = []
    dg = bpy.context.evaluated_depsgraph_get()
    for o in objs:
        if o.type != 'MESH':
            continue
        e = o.evaluated_get(dg)
        m = e.to_mesh()
        pts += [o.matrix_world @ v.co for v in m.vertices]
        e.to_mesh_clear()
    lo = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    return lo, hi


def fix_images(folder):
    for im in bpy.data.images:
        if im.source == 'FILE' and im.filepath and not os.path.exists(bpy.path.abspath(im.filepath)):
            base = os.path.basename(im.filepath.replace('\\', '/'))
            hit = glob.glob(os.path.join(folder, '**', base), recursive=True)
            if hit:
                im.filepath = hit[0]
                im.reload()


def pose_idle(arm, act):
    if arm.animation_data is None:
        arm.animation_data_create()
    for t in list(arm.animation_data.nla_tracks):
        arm.animation_data.nla_tracks.remove(t)
    if act is not None:
        arm.animation_data.action = act
        if hasattr(arm.animation_data, 'action_slot') and act.slots:
            arm.animation_data.action_slot = act.slots[0]


def load_mixamo(d):
    if d.endswith('.fbx'):
        name = os.path.splitext(os.path.basename(d))[0]; d = os.path.dirname(d)
    else:
        name = os.path.basename(d.rstrip('/\\'))
    before = set(bpy.data.objects.keys())
    bpy.ops.import_scene.fbx(filepath=os.path.join(d, name + '.fbx'))
    objs = new_objs(before)
    arm = next(o for o in objs if o.type == 'ARMATURE')
    idle = sorted(glob.glob(os.path.join(d, name + '@Idle*.fbx'))) or sorted(glob.glob(os.path.join(d, name + '@*Fight Idle*.fbx')))
    act = None
    if idle:
        b2 = set(bpy.data.objects.keys())
        acts = set(bpy.data.actions.keys())
        bpy.ops.import_scene.fbx(filepath=idle[0])
        extra = new_objs(b2)
        na = [x for x in bpy.data.actions if x.name not in acts]
        act = na[0] if na else None
        for o in extra:
            bpy.data.objects.remove(o, do_unlink=True)
    pose_idle(arm, act)
    fix_images(d)
    return objs, name


def load_forge(p):
    before = set(bpy.data.objects.keys())
    bpy.ops.import_scene.gltf(filepath=p)
    objs = new_objs(before)
    for o in [o for o in objs if o.type == 'MESH' and o.parent is None]:  # glTF 뼈 모양 Icosphere
        objs.remove(o); bpy.data.objects.remove(o, do_unlink=True)
    arm = next(o for o in objs if o.type == 'ARMATURE')
    act = None
    if arm.animation_data:
        for t in arm.animation_data.nla_tracks:
            for s in t.strips:
                if s.action and 'idle' in t.name.lower() and act is None:
                    act = s.action
    pose_idle(arm, act)
    return objs, os.path.splitext(os.path.basename(p))[0]


sc.frame_set(12)
x = 0.0
tops = []
for md, fg in pairs:
    group = []
    if md != '-':
        group.append(load_mixamo(md))
    group.append(load_forge(fg))
    for objs, name in group:
        roots = [o for o in objs if o.parent is None]
        sc.frame_set(12)
        lo, hi = bbox(objs)
        k = 1.7 / (hi.z - lo.z)  # 비교 장면처럼 같은 키 1.70m 로
        for r in roots:
            r.scale = r.scale * k
        bpy.context.view_layer.update()
        lo, hi = bbox(objs)
        for r in roots:
            r.location.x += x - (lo.x + hi.x) / 2
            r.location.y -= (lo.y + hi.y) / 2
            r.location.z -= lo.z
        tops.append(hi.z - lo.z)
        x += max(0.9, (hi.x - lo.x) + 0.25)
    x += 0.5

sc.frame_set(12)
H = max(tops)
W = x - 0.5
# 빛: 해 + 하늘 + 뒤 테두리
world = bpy.data.worlds.new('w'); sc.world = world
world.use_nodes = True
world.node_tree.nodes['Background'].inputs[0].default_value = (0.55, 0.6, 0.68, 1)
world.node_tree.nodes['Background'].inputs[1].default_value = 0.6
for rot, en, col in (((50, 0, -35), 3.5, (1, 0.96, 0.9)), ((60, 0, 160), 2.0, (0.8, 0.85, 1.0))):
    ld = bpy.data.lights.new('sun', 'SUN'); ld.energy = en; ld.color = col
    lo_ = bpy.data.objects.new('sun', ld); sc.collection.objects.link(lo_)
    lo_.rotation_euler = [math.radians(r) for r in rot]
# 바닥
bpy.ops.mesh.primitive_plane_add(size=60, location=(W / 2, 0, 0))
fl = bpy.context.object
m = bpy.data.materials.new('floor'); m.use_nodes = True
m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0.35, 0.34, 0.32, 1)
fl.data.materials.append(m)

cam_d = bpy.data.cameras.new('cam'); cam = bpy.data.objects.new('cam', cam_d); sc.collection.objects.link(cam); sc.camera = cam
cam_d.type = 'ORTHO'
if mode == 'face':
    cam_d.ortho_scale = max(W, 0.4) * 1.05
    tz = H * 0.93
    cam.location = (W / 2, -6, tz)
    sc.render.resolution_x, sc.render.resolution_y = 1920, max(300, int(1920 * 0.42 / (W * 1.05)))
else:
    cam_d.ortho_scale = max(W * 1.05, H * 1.15 * 16 / 9)
    cam.location = (W / 2, -8, H * 0.5)
    sc.render.resolution_x, sc.render.resolution_y = 1920, 1080
cam.rotation_euler = (math.radians(90), 0, math.radians(8))
for eng in ('BLENDER_EEVEE_NEXT', 'BLENDER_EEVEE'):
    try:
        sc.render.engine = eng
        break
    except TypeError:
        pass
sc.view_settings.view_transform = 'AgX' if 'AgX' in [i.identifier for i in sc.view_settings.bl_rna.properties['view_transform'].enum_items] else 'Filmic'
fix_materials() if 'fix_materials' in dir() else None
sc.render.filepath = out
bpy.ops.render.render(write_still=True)
print('RENDERED', out, sc.render.engine, [n for n in tops])
