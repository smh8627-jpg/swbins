"""이미 있는 몸(예: saga-godot VRoid 셋)의 뼈대에 UAL 동작만 굽는다 — 몸은 안 바꾸고 동작만 CC0 로 바꾸는 단계 1 용.

    blender -b --factory-startup -P tools/char-forge/bake_for_rig.py -- \
        --target saga-godot/assets/characters_vroid/AvatarSample_A.glb --map vroid \
        --clips idle=Idle_Loop,walk=Walk_Loop,... --out tools/char-forge/_out/AvatarSample_A_anims.glb [--check]

내보내는 .glb 에는 뼈대와 동작만 든다(메시·재질 없음). 엔진이 쓰는 모양으로 바꾸는 건 엔진 쪽 도구가 한다
(saga-godot: tools/ual_lib_build.gd → *_lib.res).
"""
import bpy, json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import build  # noqa: E402
import rigmaps  # noqa: E402


def main():
    target, out = build.arg('--target'), build.arg('--out')
    nm = rigmaps.MAPS[build.arg('--map') or 'identity']
    clips = dict(kv.split('=') for kv in build.arg('--clips').split(','))
    bpy.ops.wm.read_factory_settings(use_empty=True)
    objs = build.import_new(target)
    arm = next(o for o in objs if o.type == 'ARMATURE')
    build.delete([o for o in objs if o is not arm])
    rep = build.retarget(arm, clips, bool(build.arg('--check')), nm)
    meta = rep.pop('_meta')
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    arm.animation_data.action = None
    bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_animation_mode='ACTIONS',
                              export_force_sampling=True, export_def_bones=False, export_cameras=False,
                              export_lights=False, export_extras=False, export_yup=True, export_skins=True)
    lic = {'target': os.path.basename(target), 'generator': 'tools/char-forge/bake_for_rig.py',
           'blender': bpy.app.version_string, 'license': 'CC0-1.0 (동작 = ual1_standard, 뼈대 구조는 대상 몸의 것)',
           'clips': clips}
    json.dump(lic, open(os.path.splitext(out)[0] + '.license.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    worst = max((v['ground_err_m'] or 0 for v in rep.values()), default=0)
    print('BAKE', json.dumps({**meta, 'clips': len(rep), 'ground_err_max_m': worst}, ensure_ascii=False))
    for n, v in rep.items():
        print('BAKE_CLIP', n, v)


if __name__ == '__main__':
    main()
