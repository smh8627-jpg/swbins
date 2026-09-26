"""char-forge 키 보정 — 레시피의 `height_target_m`(맨몸 키, 머리카락·옷 뺀 살 메시 기준)에 맞는 `macro.height` 를 찾아 레시피에 적는다.

    export BLENDER_USER_RESOURCES="$PWD/tools/char-forge/_blender"
    "$B" -b --factory-startup -P tools/char-forge/calib_height.py -- tools/char-forge/recipes/hero/*.json

MakeHuman 키 값은 가파르고 성별·나이·근육·몸무게에 따라 달라(README §3 "키는 macro.height 로 맞춘다") 감으로 넣으면 20~30% 빗나간다.
몸만 만들어(뼈·옷·동작 없이, 한 번 1초 남짓) 이분 탐색 여덟 번 — 오차 ≤ 0.5%. 모프(`targets`)도 건다(머리 크기 모프가 키를 바꾼다).
이미 맞는 레시피(±0.5%)는 건드리지 않는다. 한 줄씩 `CALIB <id> <목표> <찾은 값> <잰 키>` 를 찍는다.
"""
import bpy, sys, os, json, glob
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_real  # noqa: E402  (mpfb·load_targets 를 같이 쓴다)


def body_height(svc, r, h):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    macro = {'gender': 0.5, 'age': 0.5, 'muscle': 0.5, 'weight': 0.5, 'proportions': 0.5, 'height': 0.5,
             'cupsize': 0.5, 'firmness': 0.5, 'race': {'asian': 0.34, 'caucasian': 0.33, 'african': 0.33}}
    macro.update({k: v for k, v in r.get('macro', {}).items() if k != 'race'})
    macro['race'].update(r.get('macro', {}).get('race', {}))
    macro['height'] = h
    bm = svc['HumanService'].create_human(mask_helpers=True, detailed_helpers=False, extra_vertex_groups=False,
                                          feet_on_ground=True, scale=0.1, macro_detail_dict=macro)
    if r.get('targets'):
        build_real.load_targets(svc, bm, r['targets'])
    dg = bpy.context.evaluated_depsgraph_get()
    e = bm.evaluated_get(dg)
    m = e.to_mesh()
    # 살 도우미(옷 맞춤용, mask 로 가림)는 빼고 잰다 — 몸 정점만(MakeHuman 기본 몸은 앞 13380 개)
    zs = [(bm.matrix_world @ v.co).z for v in m.vertices[:13380]]
    e.to_mesh_clear()
    return max(zs) - min(zs)


def main():
    paths = []
    for a in sys.argv[sys.argv.index('--') + 1:]:
        paths += sorted(glob.glob(a))
    bpy.ops.wm.read_factory_settings(use_empty=True)
    svc = build_real.mpfb()
    for p in paths:
        r = json.load(open(p, encoding='utf-8'))
        want = r.get('height_target_m')
        if not want:
            continue
        cur = r.get('macro', {}).get('height', 0.5)
        got = body_height(svc, r, cur)
        if abs(got - want) / want > 0.005:
            lo, hi = 0.0, 1.0
            for _ in range(8):
                mid = (lo + hi) / 2
                if body_height(svc, r, mid) < want:
                    lo = mid
                else:
                    hi = mid
            cur = round((lo + hi) / 2, 4)
            got = body_height(svc, r, cur)
            r.setdefault('macro', {})['height'] = cur
            txt = json.dumps(r, ensure_ascii=False, indent=1) + '\n'
            with open(p, 'w', encoding='utf-8', newline='\n') as f:  # 읽기를 끝낸 뒤 쓴다
                f.write(txt)
        print('CALIB', r['id'], want, cur, round(got, 3), flush=True)


main()
