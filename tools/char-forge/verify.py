"""char-forge 검증 — 내보낸 .glb 를 다시 열어 원본 동작(UAL)과 맞대 본다. build.py 의 계산을 믿지 않고 파일을 본다.

    blender -b --factory-startup -P tools/char-forge/verify.py -- --glb tools/char-forge/_out/_test_toon_01.glb

동작마다 다섯 프레임씩:
- 팔다리 방향: 위팔·아래팔·허벅지·정강이·척추·머리 뼈의 월드 방향이 원본과 몇 도 다른가 — ≤ 5°
- 땅 닿음: 원본의 낮은 발이 땅(쉼 높이 ±1cm)에 있는 프레임에서, 파일 쪽 낮은 발 높이 차 — ≤ 1cm
- 멈춤 아님: 걷기 동작의 손목이 실제로 움직였는가(원본의 절반 이상)
"""
import bpy, json, math, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
UAL_FBX = os.path.join(HERE, '_src', 'Animation Library[Standard]', 'Unreal Engine', 'AL_Standard.fbx')
LIMBS = ('upperarm_l', 'lowerarm_l', 'upperarm_r', 'lowerarm_r', 'thigh_l', 'calf_l', 'thigh_r', 'calf_r',
         'spine_03', 'Head')
FEET = ('foot_l', 'foot_r')


def arg(name):
    a = sys.argv[sys.argv.index('--') + 1:]
    return a[a.index(name) + 1] if name in a else None


def imp(path):
    before = set(bpy.data.objects)
    acts0 = set(bpy.data.actions)
    (bpy.ops.import_scene.fbx if path.endswith('.fbx') else bpy.ops.import_scene.gltf)(filepath=path)
    arm = next(o for o in bpy.data.objects if o not in before and o.type == 'ARMATURE')
    return arm, [a for a in bpy.data.actions if a not in acts0]


def play(arm, act, f):
    arm.animation_data.action = act
    if act.slots:
        arm.animation_data.action_slot = act.slots[0]
    bpy.context.scene.frame_set(f)


def world_dir(arm, n):
    pb = arm.pose.bones[n]
    return ((arm.matrix_world @ pb.tail) - (arm.matrix_world @ pb.head)).normalized()


def rest_dir(arm, n):
    b = arm.data.bones[n]
    return ((arm.matrix_world @ b.tail_local) - (arm.matrix_world @ b.head_local)).normalized()


def main():
    glb = arg('--glb')
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.scene.render.fps = 30
    src, sacts = imp(UAL_FBX)
    tgt, tacts = imp(glb)
    src.animation_data_create()
    tgt.animation_data_create()
    sby = {a.name.split('|')[-1]: a for a in sacts}
    # glTF 가져오기는 동작 이름 뒤에 몸 이름을 붙이기도 한다 — 앞부분으로 맞춘다
    tby = {}
    for a in tacts:
        base = a.name.split('|')[-1]
        for sn in sby:
            if base == sn or base.startswith(sn + '_') and sn not in tby:
                tby[sn] = a
    s_rest = {n: (src.matrix_world @ src.data.bones[n].head_local).z for n in FEET}
    t_rest = {n: (tgt.matrix_world @ tgt.data.bones[n].head_local).z for n in FEET}
    worst_ang = worst_ground = 0.0
    fails = []
    rows = {}
    for name, sa in sorted(sby.items()):
        if name == 'A_TPose':
            continue
        ta = tby.get(name)
        if not ta:
            fails.append(f'{name}: 파일에 없음')
            continue
        f0, f1 = (int(round(x)) for x in sa.frame_range)
        ang = gnd = 0.0
        wrist_s = wrist_t = 0.0
        prev_s = prev_t = None
        for f in [f0 + (f1 - f0) * i // 4 for i in range(5)]:
            play(src, sa, f)
            play(tgt, ta, f)
            for n in LIMBS:
                # 뼈 방향이 원본과 같은 쪽을 보는가(몸 비율이 달라도 자세는 같아야 한다)
                ang = max(ang, math.degrees(world_dir(src, n).angle(world_dir(tgt, n))))
            s_low = min((src.matrix_world @ src.pose.bones[n].head).z - s_rest[n] for n in FEET)
            t_low = min((tgt.matrix_world @ tgt.pose.bones[n].head).z - t_rest[n] for n in FEET)
            if abs(s_low) < 0.01:
                gnd = max(gnd, abs(t_low - s_low))
            ws = src.matrix_world @ src.pose.bones['hand_l'].head
            wt = tgt.matrix_world @ tgt.pose.bones['hand_l'].head
            if prev_s is not None:
                wrist_s += (ws - prev_s).length
                wrist_t += (wt - prev_t).length
            prev_s, prev_t = ws, wt
        rows[name] = {'limb_deg': round(ang, 2), 'ground_m': round(gnd, 4)}
        worst_ang, worst_ground = max(worst_ang, ang), max(worst_ground, gnd)
        if ang > 5:
            fails.append(f'{name}: 팔다리 방향 {ang:.1f}°')
        if gnd > 0.01:
            fails.append(f'{name}: 땅 닿음 {gnd * 100:.1f}cm')
        if name.startswith('Walk') and wrist_s > 0.05 and wrist_t < wrist_s * 0.5:
            fails.append(f'{name}: 손목이 거의 안 움직임({wrist_t:.3f} / {wrist_s:.3f}m)')
    for n, r in sorted(rows.items(), key=lambda kv: -kv[1]['limb_deg'])[:5]:
        print('VERIFY', n, r)
    print('VERIFY_RESULT', json.dumps({'anims': len(rows), 'limb_deg_max': round(worst_ang, 2),
                                       'ground_m_max': round(worst_ground, 4), 'fails': fails}, ensure_ascii=False))
    sys.exit(1 if fails else 0)


if __name__ == '__main__':
    main()
