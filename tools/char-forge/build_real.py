"""char-forge 사실 몸 빌더(단계 3, saga-unity) — 레시피 하나 → MakeHuman(MPFB) 몸·피부·눈·머리·옷 + CC0 동작 → .fbx(Humanoid) + .glb.

    set BLENDER_USER_RESOURCES=<저장소>/tools/char-forge/_blender        (MPFB 를 사용자 Blender 와 따로 둔다)
    blender -b --factory-startup -P tools/char-forge/build_real.py -- \
        --recipe tools/char-forge/recipes/_cmp_real_hero_f_01.json --out tools/char-forge/_out/_cmp_real_hero_f_01.glb \
        [--fbx tools/char-forge/_out/_cmp_real_hero_f_01.fbx] [--check]

입력(sources.json): MPFB 2.0.17 확장(코드 GPL — 만든 모델은 CC0) · MakeHuman system assets(CC0) · UAL(CC0).
뼈는 MPFB 내장 "game_engine"(UE 마네킹 이름 — 표준 뼈와 root·Head 대소문자만 다르다, rigmaps.MPFB).
동작 굽기·내보내기는 build.py 의 것을 그대로 쓴다(쉼 방향 맞춤·다리 길이 비·땅 붙이기).
"""
import bpy, addon_utils, json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import build  # noqa: E402
import rigmaps  # noqa: E402

MPFB_MOD = 'bl_ext.user_default.mpfb'
# 재질 칸(엔진 CharacterVisual 이 이름 앞머리로 받는다) — MPFB 물체 종류 → 칸
SLOT = {'basemesh': 'skin', 'eyes': 'eye', 'eyebrows': 'hair_brow', 'eyelashes': 'hair_lash', 'hair': 'hair',
        'teeth': 'teeth', 'tongue': 'teeth', 'clothes': 'cloth'}


def mpfb():
    """MPFB 를 켜고 서비스 모듈을 돌려준다. 시스템 에셋 팩이 없으면 멈춘다(fetch_sources.py 가 푼다)."""
    if not os.environ.get('BLENDER_USER_RESOURCES'):
        sys.exit('BLENDER_USER_RESOURCES 를 tools/char-forge/_blender 로 줄 것(MPFB 는 거기 설치된다)')
    addon_utils.enable(MPFB_MOD, default_set=True)
    import importlib
    m = {n: importlib.import_module(f'{MPFB_MOD}.services.{n.lower()}') for n in
         ('HumanService', 'AssetService', 'ExportService', 'ObjectService', 'LocationService')}
    svc = {n: getattr(mod, n) for n, mod in m.items()}
    if not svc['AssetService'].system_assets_pack_is_installed():
        sys.exit('MakeHuman system assets 가 없다 — py tools/char-forge/fetch_sources.py')
    return svc


def asset(svc, fragment, subdir):
    p = svc['AssetService'].find_asset_absolute_path(fragment, subdir)
    if not p:
        sys.exit(f'{subdir}: 없는 에셋 {fragment}')
    return p


def kind(svc, obj):
    return str(svc['ObjectService'].get_object_type(obj) or '').lower()


def make_human(svc, r):
    HS = svc['HumanService']
    macro = {'gender': 0.5, 'age': 0.5, 'muscle': 0.5, 'weight': 0.5, 'proportions': 0.5, 'height': 0.5,
             'cupsize': 0.5, 'firmness': 0.5, 'race': {'asian': 0.34, 'caucasian': 0.33, 'african': 0.33}}
    macro.update({k: v for k, v in r.get('macro', {}).items() if k != 'race'})
    macro['race'].update(r.get('macro', {}).get('race', {}))
    # 살 아래 도우미(옷 맞춤용)는 가린 채로 만들고 내보내기 전에 지운다. 세분화(subdiv)는 안 건다 — 폰 예산
    basemesh = HS.create_human(mask_helpers=True, detailed_helpers=True, extra_vertex_groups=True,
                               feet_on_ground=True, scale=0.1, macro_detail_dict=macro)
    # 뼈를 부위보다 먼저 — add_mhclo_asset 이 붙이는 순간 가중치를 옮긴다(MPFB characterbuilder 와 같은 순서)
    HS.add_builtin_rig(basemesh, 'game_engine', import_weights=True)
    HS.set_character_skin(asset(svc, r['skin'], 'skins'), basemesh, bodyproxy=None,
                          skin_type='GAMEENGINE', material_instances=False)
    for part in ('eyes', 'eyebrows', 'eyelashes', 'teeth', 'hair'):
        if r.get(part):
            HS.add_mhclo_asset(asset(svc, r[part], part), basemesh, asset_type=part, subdiv_levels=0,
                               material_type='GAMEENGINE')
    for c in r.get('clothes', []):
        HS.add_mhclo_asset(asset(svc, c, 'clothes'), basemesh, asset_type='Clothes', subdiv_levels=0,
                           material_type='GAMEENGINE')
    return basemesh


def bake_for_export(svc, basemesh):
    """모프(키·체격)를 바탕에 굳히고, 옷 아래 가린 살·도우미를 실제로 지운다 → 엔진이 받는 평범한 스킨 메시."""
    svc['ExportService'].bake_modifiers_remove_helpers(basemesh, bake_masks=True, bake_subdiv=False,
                                                        remove_helpers=True, also_proxy=True)
    arm = basemesh.parent
    for o in [c for c in arm.children if c.type == 'MESH']:
        if o.data.shape_keys:
            with build.ctx(o, [o]):
                bpy.ops.object.shape_key_remove(all=True, apply_mix=True)
        for md in [md for md in o.modifiers if md.type != 'ARMATURE']:
            with build.ctx(o, [o]):
                bpy.ops.object.modifier_apply(modifier=md.name)
    return arm


def name_materials(svc, arm):
    """재질 이름을 표준 칸으로(skin·eye·hair·hair_brow·hair_lash·cloth_a·cloth_b …). 같은 칸이 또 나오면 번호."""
    used = {}
    for o in sorted([c for c in arm.children if c.type == 'MESH'], key=lambda c: c.name):
        k = kind(svc, o)
        base = SLOT.get(k, 'cloth')
        for i, mat in enumerate(o.data.materials):
            if not mat:
                continue
            used[base] = used.get(base, 0) + 1
            if base == 'cloth':
                nm = 'cloth_' + 'abcdefghij'[used[base] - 1]
            else:
                nm = base if used[base] == 1 else f'{base}_{used[base]}'
            mat.name = nm
        o.name = f'{arm.name}_{k or "mesh"}' + (f'_{used.get(base, 1)}' if base == 'cloth' else '')


def main():
    recipe_path, out = build.arg('--recipe'), build.arg('--out')
    if not recipe_path or not out:
        sys.exit('--recipe · --out 가 필요하다')
    r = json.load(open(recipe_path, encoding='utf-8'))
    bpy.ops.wm.read_factory_settings(use_empty=True)
    svc = mpfb()
    basemesh = make_human(svc, r)
    arm = bake_for_export(svc, basemesh)
    arm.name = arm.data.name = r['id']
    name_materials(svc, arm)
    build.cap_textures()
    rep = build.retarget(arm, r.get('anims', 'all'), bool(build.arg('--check')), rigmaps.MPFB)
    build.export(arm, out, build.arg('--fbx'))
    lic = {
        'id': r['id'], 'generator': 'tools/char-forge/build_real.py', 'blender': bpy.app.version_string,
        'license': 'CC0-1.0 (입력 전부 CC0 — MPFB 코드는 GPL 이지만 만든 모델에는 걸리지 않는다)',
        'inputs': ['mpfb 2.0.17: base.obj · targets · rig.game_engine', 'ual1_standard: Unreal Engine/AL_Standard.fbx']
        + [f'makehuman_system_assets: {r[p]}' for p in ('skin', 'eyes', 'eyebrows', 'eyelashes', 'teeth', 'hair') if r.get(p)]
        + [f'makehuman_system_assets: {c}' for c in r.get('clothes', [])],
    }
    json.dump(lic, open(os.path.splitext(out)[0] + '.license.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    meshes = [m for m in arm.children if m.type == 'MESH']
    tris = sum(sum(len(p.vertices) - 2 for p in m.data.polygons) for m in meshes)
    lo = min((arm.matrix_world @ m.matrix_world @ v.co).z for m in meshes for v in m.data.vertices) if meshes else 0
    hi = max((m.matrix_world @ v.co).z for m in meshes for v in m.data.vertices) if meshes else 0
    meta = rep.pop('_meta')
    worst = max((v['ground_err_m'] or 0 for v in rep.values()), default=0)
    print('CHARFORGE', json.dumps({'id': r['id'], 'bones': len(arm.data.bones), 'meshes': len(meshes), 'tris': tris,
                                   'height_m': round(hi - min(0, lo), 3), 'anims': len(rep), 'ground_err_max_m': worst,
                                   'leg_ratio': meta['leg_ratio'], 'flipped': meta['flipped'],
                                   'mats': sorted({s.material.name for m in meshes for s in m.material_slots if s.material}),
                                   'textures': sorted({f'{im.size[0]}x{im.size[1]}' for im in bpy.data.images if im.size[0]})},
                                  ensure_ascii=False))
    if build.arg('--check'):
        for n, v in sorted(rep.items(), key=lambda kv: -(kv[1]['ground_err_m'] or 0))[:6]:
            print('CHECK', n, v)
        if worst > 0.01:
            print('CHECK FAIL ground_err > 1cm')
            sys.exit(2)


if __name__ == '__main__':
    main()
