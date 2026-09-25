"""char-forge 검증 — 내보낸 파일(.glb/.fbx)을 다시 열어 원본 동작(UAL)과 맞대 본다. build.py 의 계산을 믿지 않고 파일을 본다.

    blender -b --factory-startup -P tools/char-forge/verify.py -- --glb <파일> [--map identity|vroid] [--clips out=UAL,...]

동작마다 아홉 프레임씩(파일 첫 프레임에 맞춰):
- 뼈 방향: 표준 뼈마다 "기준 자식 쪽 방향"(rigmaps.REF_CHILD)이 원본과 몇 도 다른가 — ≤ 5°
- 땅 닿음: 원본의 낮은 발이 땅(쉼 높이 ±1cm)에 있는 프레임에서, 파일 쪽 낮은 발 높이 차 — ≤ 1cm
- 멈춤 아님: 걷기 동작의 손목이 실제로 움직였는가(원본의 절반 이상)
"""
import bpy, json, math, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import rigmaps  # noqa: E402
import keyframes  # noqa: E402

UAL_FBX = os.path.join(HERE, '_src', 'Animation Library[Standard]', 'Unreal Engine', 'AL_Standard.fbx')


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


def main():
    path = arg('--glb')
    nm = rigmaps.MAPS[arg('--map') or 'identity']
    clips = dict(kv.split('=') for kv in arg('--clips').split(',')) if arg('--clips') else None
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.scene.render.fps = 30
    src, sacts = imp(UAL_FBX)
    sacts += keyframes.add(src, list(clips.values()) if clips else [])  # 자체 키프레임 동작(CF_*)도 원본으로 맞댄다
    tgt, tacts = imp(path)
    src.animation_data_create()
    tgt.animation_data_create()
    pairs = {s: t for s, t in nm.items() if t and s in src.data.bones and t in tgt.data.bones}

    MW = {}  # 동작 팩 FBX 는 뼈대 오브젝트 회전까지 키로 갖고 있어 frame_set 마다 되돌아간다 — 맞춘 뒤의 행렬을 붙들어 쓴다

    def head(arm, n, rest=False):
        return MW.get(arm.name, arm.matrix_world) @ (arm.data.bones[n].head_local if rest else arm.pose.bones[n].head)

    def fwd(arm, foot, ball):
        v = head(arm, ball, True) - head(arm, foot, True)
        v.z = 0
        return v.normalized()
    if fwd(src, 'foot_l', 'ball_l').dot(fwd(tgt, pairs['foot_l'], pairs['ball_l'])) < 0:
        src.rotation_euler.z += math.pi  # build.py 와 같이: 뒤돌아 있는 몸이면 원본을 돌려 맞댄다
        bpy.context.view_layer.update()
    MW[src.name], MW[tgt.name] = src.matrix_world.copy(), tgt.matrix_world.copy()
    sby = {a.name.split('|')[-1]: a for a in sacts}
    tby = {a.name.split('|')[-1]: a for a in tacts}
    jobs = clips or {n: n for n in sby if n != 'A_TPose'}
    dirs = [(s, c) for s, c in rigmaps.REF_CHILD.items() if s in pairs and c in pairs]
    feet = ('foot_l', 'foot_r')
    s_rest = {n: head(src, n, True).z for n in feet}
    t_rest = {n: head(tgt, pairs[n], True).z for n in feet}
    worst_ang = worst_ground = 0.0
    fails, rows = [], {}
    for out, ual in sorted(jobs.items()):
        sa = sby.get(ual)
        ta = tby.get(out) or next((a for n, a in tby.items() if n.startswith(out + '_')), None)
        if not sa or not ta:
            fails.append(f'{out}: 파일에 없음')
            continue
        f0, f1 = (int(round(x)) for x in sa.frame_range)
        # FBX 를 다시 열면 동작이 1 프레임부터 선다(glb·원본은 0) — 첫 프레임끼리 맞춰 댄다. 안 맞추면 한 프레임 밀린 채 재서
        # 빠른 동작일수록 오차가 커 보였다(옛 fbx 0.5° 는 대부분 이 밀림)
        dt = int(round(ta.frame_range[0])) - f0
        ang = gnd = 0.0
        wrist_s = wrist_t = 0.0
        prev = None
        for f in [f0 + (f1 - f0) * i // 8 for i in range(9)]:  # 아홉 프레임 — 다섯이면 열쇠 사이 튐을 놓친다(09-25)
            # 한 장면이라 frame_set 이 두 뼈대를 다 옮긴다 — 원본을 먼저 읽고 과녁 프레임으로 넘어간다
            play(src, sa, f)
            play(tgt, ta, f)
            sh = {n: head(src, n) for n in {x for d in dirs for x in d} | set(feet) | {'hand_l'}}
            play(tgt, ta, f + dt)
            for s, c in dirs:
                sd = (sh[c] - sh[s]).normalized()
                td = (head(tgt, pairs[c]) - head(tgt, pairs[s])).normalized()
                ang = max(ang, math.degrees(sd.angle(td)))
            s_low = min(sh[n].z - s_rest[n] for n in feet)
            t_low = min(head(tgt, pairs[n]).z - t_rest[n] for n in feet)
            if abs(s_low) < 0.01:
                gnd = max(gnd, abs(t_low - s_low))
            ws, wt = sh['hand_l'], head(tgt, pairs['hand_l'])
            if prev is not None:
                wrist_s += (ws - prev[0]).length
                wrist_t += (wt - prev[1]).length
            prev = (ws, wt)
        rows[out] = {'limb_deg': round(ang, 2), 'ground_m': round(gnd, 4)}
        worst_ang, worst_ground = max(worst_ang, ang), max(worst_ground, gnd)
        if ang > 5:
            fails.append(f'{out}: 뼈 방향 {ang:.1f}°')
        if gnd > 0.01:
            fails.append(f'{out}: 땅 닿음 {gnd * 100:.1f}cm')
        if ual.startswith('Walk') and wrist_s > 0.05 and wrist_t < wrist_s * 0.5:
            fails.append(f'{out}: 손목이 거의 안 움직임({wrist_t:.3f} / {wrist_s:.3f}m)')
    for n, r in sorted(rows.items(), key=lambda kv: -kv[1]['limb_deg'])[:5]:
        print('VERIFY', n, r)
    print('VERIFY_RESULT', json.dumps({'anims': len(rows), 'bone_pairs': len(dirs), 'limb_deg_max': round(worst_ang, 2),
                                       'ground_m_max': round(worst_ground, 4), 'fails': fails}, ensure_ascii=False))
    sys.exit(1 if fails else 0)


if __name__ == '__main__':
    main()
