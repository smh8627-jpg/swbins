"""char-forge 모양 점검(스크린샷 대신 수치) — 내보낸 .glb 를 다시 열어 옷 껍데기가 제자리를 덮는지 잰다.

    blender -b --factory-startup -P tools/char-forge/measure_shape.py -- tools/char-forge/_out/<id>.glb

1) 얼굴 띠 안에 남은 앞 살 정점(복면 mask: 눈 -15~-2.8cm · 바이저 visor: -2.2~+1.8cm) — 띠 가장자리 수십 점이면 정상
2) 띠·모자·배낭 껍데기(slot 에 band·visor·mask·lens·cap·pack)가 머리 둘레를 몇 도 감나(10° 칸, 빈 곳 목록)
3) robe 가 있으면 서기·걷기·달리기(가진 몸은 무릎 꿇기·치유 시전도)마다 6 프레임, 끝단 위 다리 살 중 옷자락 밖 몫(그 방향 끝단 아래 다리는 안 센다).
   다리 살이 온몸 옷 껍데기에 덮여 지워진 몸은 그 껍데기(_kitbash_cloth)를 다리로 잰다
4) 모자·두건 높이의 머리카락 중 껍데기 밖 몫.
glTF 가져오기는 동작마다 NLA 트랙을 켜 둬서 겹쳐 돈다 — 트랙을 떼고 동작 하나씩, 쉼 자세는 pose 를 비우고 잰다(09-25).
"""
import bpy, sys, math
from mathutils import Vector
from mathutils.bvhtree import BVHTree

a = sys.argv[sys.argv.index('--') + 1:]
path = a[0]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=path)
arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
meshes = {o.name: o for o in bpy.data.objects if o.type == 'MESH'}
skin = next((o for n, o in meshes.items() if n.endswith('_basemesh')), None)  # 온몸 쇠 인형은 살 메시가 없다
eyes = next((o for n, o in meshes.items() if n.endswith('_eyes')), None)
dg = bpy.context.evaluated_depsgraph_get()


def world_verts(o):
    e = o.evaluated_get(dg)
    m = e.to_mesh()
    out = [o.matrix_world @ v.co for v in m.vertices]
    e.to_mesh_clear()
    return out


# glTF 가져오기는 동작마다 NLA 트랙을 켜 둔다(겹쳐 돈다) — 트랙에서 동작을 모아 두고 떼어 쉼 자세에서 잰다
ACTS = {}
if arm.animation_data:
    for t in arm.animation_data.nla_tracks:
        for s in t.strips:
            ACTS[t.name] = s.action
arm.animation_data_clear() if arm.animation_data else None
from mathutils import Matrix
for pb in arm.pose.bones:
    pb.matrix_basis = Matrix.Identity(4)
bpy.context.view_layer.update()
dg = bpy.context.evaluated_depsgraph_get()
if eyes and skin:
    ev = world_verts(eyes)
    ez = sum(v.z for v in ev) / len(ev)
    ecx = sum(v.x for v in ev) / len(ev)
    ecy = sum(v.y for v in ev) / len(ev)
    sv = world_verts(skin)
    # glTF 는 +Y 위 → Blender 로 가져오면 Z 위, 앞 = -Y
    for lo, hi, name in ((-0.15, -0.028, 'mask'), (-0.022, 0.018, 'visor')):
        band = [v for v in sv if ez + lo <= v.z <= ez + hi and v.y < ecy + 0.02 and abs(v.x - ecx) < 0.07]
        print(f'MEASURE face_band {name} 남은 앞 살 정점 {len(band)}' + (f' z {min(v.z for v in band) - ez:+.3f}..{max(v.z for v in band) - ez:+.3f}' if band else ''))
    for n, o in meshes.items():
        if '_kitbash_' in n and any(k in n.split('_kitbash_')[-1] for k in ('band', 'visor', 'mask', 'lens', 'cap', 'pack')):
            pv = world_verts(o)
            bins = {int((math.degrees(math.atan2(v.y - ecy - 0.08, v.x - ecx)) + 180) // 10) for v in pv}
            zs = [v.z - ez for v in pv]
            print(f'MEASURE ring {n.split("_kitbash_")[-1]} 둘레 {len(bins) * 10}° 빈 곳 {sorted(b * 10 - 180 for b in set(range(36)) - bins)} z {min(zs):+.3f}..{max(zs):+.3f}')

robe = next((o for n, o in meshes.items() if n.endswith('_robe')), None)
if robe and skin:
    def leg_verts(o):
        legs = {g.index for g in o.vertex_groups if g.name.startswith(('thigh_', 'calf_'))}
        return [v.index for v in o.data.vertices if sum(g.weight for g in v.groups if g.group in legs) >= 0.5]
    # 옷 껍데기(온몸 옷·바지)가 다리 살을 덮어 지웠으면 그 껍데기(살과 같은 뼈 무게)를 다리로 잰다 —
    # 발목 몇 점만 살로 남는 몸이 있어(바지 + 코트 자락) 다리 정점이 가장 많은 쪽을 고른다
    cands = [skin] + [o for n, o in meshes.items() if '_kitbash_cloth' in n]
    skin = max(cands, key=lambda o: len(leg_verts(o)))
    leg_idx = leg_verts(skin)
    if skin.name.find('_kitbash_') >= 0:
        print('MEASURE robe 다리 = 옷 껍데기', skin.name.split('_kitbash_')[-1], len(leg_idx))
    for nm in [n for n in ('idle', 'walk', 'run', 'kneel', 'heal') if n in ACTS]:  # 무릎 꿇기·시전은 가진 몸만
        act = ACTS[nm]
        ad = arm.animation_data_create()
        ad.action = act
        if getattr(act, 'slots', None) and hasattr(ad, 'action_slot'):
            ad.action_slot = act.slots[0]
        f0, f1 = act.frame_range
        outs = tot = 0
        for k in range(6):
            bpy.context.scene.frame_set(int(f0 + (f1 - f0) * k / 6))
            dg = bpy.context.evaluated_depsgraph_get()
            re = robe.evaluated_get(dg)
            rm = re.to_mesh()
            rv = [robe.matrix_world @ v.co for v in rm.vertices]
            tree = BVHTree.FromPolygons(rv, [p.vertices[:] for p in rm.polygons])
            hem = min(v.z for v in rv)
            re.to_mesh_clear()
            se = skin.evaluated_get(dg)
            sm = se.to_mesh()
            pel = arm.matrix_world @ arm.pose.bones['pelvis'].head
            for i in leg_idx:
                p = skin.matrix_world @ sm.vertices[i].co
                if p.z < hem + 0.02 or p.z > pel.z:
                    continue
                c = Vector((pel.x, pel.y, p.z))
                d = p - c
                if d.length < 1e-4:
                    continue
                hit = tree.ray_cast(c, d.normalized(), 2.0)
                if hit[0] is None:
                    continue  # 그 방향 끝단 아래 — 원래 보이는 다리
                tot += 1
                if (hit[0] - c).length < d.length:
                    outs += 1
            se.to_mesh_clear()
        print(f'MEASURE robe {nm} 뚫림 {100 * outs / max(tot, 1):.1f}% ({outs}/{tot})')

# 모자·두건이 머리카락을 품는가 — 머리 가운데에서 머리카락 정점 쪽으로 쏜 광선이 껍데기에 먼저 닿으면 속(안 보임)
hair = next((o for n, o in meshes.items() if n.endswith('_hair')), None)
caps = [o for n, o in meshes.items() if n.endswith(('_cloth_cap', '_cloth_hood'))]
if hair and caps and eyes and skin:
    hv = world_verts(hair)
    for cap in caps:
        cv = world_verts(cap)
        e = cap.evaluated_get(dg); cm = e.to_mesh()
        tree = BVHTree.FromPolygons([cap.matrix_world @ v.co for v in cm.vertices], [p.vertices[:] for p in cm.polygons])
        e.to_mesh_clear()
        zlo = min(v.z for v in cv)
        c = Vector((ecx, ecy + 0.09, ez + 0.03))
        zone = [v for v in hv if v.z > zlo + 0.01]
        out = 0
        for v in zone:
            d = v - c
            hit = tree.ray_cast(c, d.normalized(), 1.0)
            if hit[0] is None or (hit[0] - c).length < d.length - 0.001:
                out += 1
        print(f'MEASURE hair_vs_{cap.name.split("_kitbash_")[-1]} 모자 높이 머리카락 {len(zone)} 중 밖 {out} ({100 * out / max(len(zone), 1):.0f}%)')
