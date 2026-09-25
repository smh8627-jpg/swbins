"""char-forge 사실 몸 빌더(단계 3, saga-unity) — 레시피 하나 → MakeHuman(MPFB) 몸·피부·눈·머리·옷 + CC0 동작 → .fbx(Humanoid) + .glb.

    set BLENDER_USER_RESOURCES=<저장소>/tools/char-forge/_blender        (MPFB 를 사용자 Blender 와 따로 둔다)
    blender -b --factory-startup -P tools/char-forge/build_real.py -- \
        --recipe tools/char-forge/recipes/_cmp_real_hero_f_01.json --out tools/char-forge/_out/_cmp_real_hero_f_01.glb \
        [--fbx tools/char-forge/_out/_cmp_real_hero_f_01.fbx] [--check]

입력(sources.json): MPFB 2.0.17 확장(코드 GPL — 만든 모델은 CC0) · MakeHuman system assets(CC0) · UAL(CC0).
뼈는 MPFB 내장 "game_engine"(UE 마네킹 이름 — 표준 뼈와 root·Head 대소문자만 다르다, rigmaps.MPFB).
동작 굽기·내보내기는 build.py 의 것을 그대로 쓴다(쉼 방향 맞춤·다리 길이 비·땅 붙이기).
"""
import bpy, bmesh, addon_utils, json, math, os, sys
import numpy as np
from mathutils import Vector

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
         ('HumanService', 'AssetService', 'ExportService', 'ObjectService', 'LocationService', 'TargetService')}
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


def load_targets(svc, basemesh, targets):
    """레시피 targets {모프 이름: 값} — 뼈를 달기 전에 건다(관절 맞춤·옷 맞춤이 바뀐 몸을 보게, MPFB characterbuilder 와 같은 자리).
    좌우 짝 모프는 l-/r- 를 떼고 쓰면 둘 다 건다(예: "ear-shape-pointed"). animal01 팩 모프도 이름으로(예: "elvs_piggy_nose1")."""
    TS = svc['TargetService']
    stack = []
    for n, v in targets.items():
        names = [n] if TS.target_full_path(n) else [f'l-{n}', f'r-{n}']
        for nm in names:
            if not TS.target_full_path(nm):
                sys.exit(f'모르는 모프 {n}')
            stack.append({'target': nm, 'value': float(v)})
    TS.bulk_load_targets(basemesh, stack)
    bpy.context.view_layer.update()


def make_human(svc, r):
    HS = svc['HumanService']
    macro = {'gender': 0.5, 'age': 0.5, 'muscle': 0.5, 'weight': 0.5, 'proportions': 0.5, 'height': 0.5,
             'cupsize': 0.5, 'firmness': 0.5, 'race': {'asian': 0.34, 'caucasian': 0.33, 'african': 0.33}}
    macro.update({k: v for k, v in r.get('macro', {}).items() if k != 'race'})
    macro['race'].update(r.get('macro', {}).get('race', {}))
    # 살 아래 도우미(옷 맞춤용)는 가린 채로 만들고 내보내기 전에 지운다. 세분화(subdiv)는 안 건다 — 폰 예산
    basemesh = HS.create_human(mask_helpers=True, detailed_helpers=True, extra_vertex_groups=True,
                               feet_on_ground=True, scale=0.1, macro_detail_dict=macro)
    if r.get('targets'):
        load_targets(svc, basemesh, r['targets'])
        # 다리 길이 모프(upperlegs-height-decr 등)는 발을 띄운다 — create_human 의 땅 맞춤은 macro 만 봐서 다시 맞춘다
        # (MPFB deserialize 도 모프 뒤에 한 번 더 한다. 그쪽은 abs(최저점)이라 뜬 발은 더 올리므로 부호를 지켜 내린다)
        low = svc['ObjectService'].get_lowest_point(basemesh)
        if abs(low) > 1e-4:
            basemesh.location.z -= low
            with build.ctx(basemesh, [basemesh]):
                bpy.ops.object.transform_apply(location=True, rotation=False, scale=False)
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


def tint(arm, slot, hexcol, outdir):
    """재질 칸의 바탕 그림에 색을 곱해 새 그림으로 굽는다(괴물 피부 초록·잿빛 등). 노드로 곱하면 FBX 가 그림을 못 옮겨서 픽셀로 굽는다.
    그림 픽셀은 sRGB 값 그대로라 색도 sRGB(헥스 그대로)로 곱한다."""
    mat = next((m for o in arm.children if o.type == 'MESH' for m in o.data.materials if m and m.name == slot), None)
    if mat is None:
        sys.exit(f'tints: 재질 칸 {slot} 이 없다')
    bsdf = next(n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    node = bsdf.inputs['Base Color'].links[0].from_node if bsdf.inputs['Base Color'].links else None
    if node is None or node.type != 'TEX_IMAGE':
        sys.exit(f'tints: {slot} 바탕색에 그림이 없다')
    src = node.image
    w, h = src.size
    px = np.empty(w * h * 4, np.float32)
    src.pixels.foreach_get(px)
    px = px.reshape(-1, 4)
    hx = hexcol.lstrip('#')
    px[:, :3] *= np.array([int(hx[i:i + 2], 16) / 255 for i in (0, 2, 4)], np.float32)
    os.makedirs(outdir, exist_ok=True)
    path = os.path.join(outdir, f'{arm.name}_{slot}.png')
    img = bpy.data.images.new(f'{arm.name}_{slot}', w, h, alpha=True)
    img.pixels.foreach_set(px.ravel())
    img.filepath_raw, img.file_format = path, 'PNG'
    img.save()
    # MPFB GAMEENGINE 재질은 같은 그림을 두 노드(바탕색·알파)가 읽는다 — 한쪽만 바꾸면 원본도 FBX 에 딸려 간다(09-25 겪음)
    for n in mat.node_tree.nodes:
        if n.type == 'TEX_IMAGE' and n.image == src:
            n.image = img


def _verts_world(o, group=None, min_w=0.5):
    gi = o.vertex_groups[group].index if group else None
    out = []
    for v in o.data.vertices:
        if gi is None or any(g.group == gi and g.weight >= min_w for g in v.groups):
            out.append(o.matrix_world @ v.co)
    return out


def _new_part(arm, name, bm, weights, color, rough, smooth=True):
    """bmesh → 뼈대 자식 스킨 메시(가중치 {정점 번호: {뼈: 무게}}) + 원리 재질 하나(이름 = 칸)."""
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    for p in me.polygons:
        p.use_smooth = smooth  # 바위 판은 모난 면 그대로
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    ob.parent = arm
    for vi, ws in weights.items():
        for bone, w in ws.items():
            vg = ob.vertex_groups.get(bone) or ob.vertex_groups.new(name=bone)
            vg.add([vi], w, 'REPLACE')
    md = ob.modifiers.new('Armature', 'ARMATURE')
    md.object = arm
    slot = name.split('_kitbash_')[-1]
    mat = bpy.data.materials.new(slot)
    mat.use_nodes = True
    bsdf = next(n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    bsdf.inputs['Base Color'].default_value = build.hex_rgba(color)
    bsdf.inputs['Roughness'].default_value = rough
    me.materials.append(mat)
    return ob


def _ring(bm, center, a, b, rx, ry, n):
    return [bm.verts.new(center + a * (rx * math.cos(2 * math.pi * k / n)) + b * (ry * math.sin(2 * math.pi * k / n)))
            for k in range(n)]


def _bridge(bm, r0, r1):
    n = len(r0)
    for k in range(n):
        bm.faces.new((r0[k], r0[(k + 1) % n], r1[(k + 1) % n], r1[k]))


def _cone(bm, pts, r0, n=10):
    """점 줄(뿌리 → 끝)을 따라 가늘어지는 원뿔 관 — 뿔·엄니."""
    seg = len(pts) - 1
    rings = []
    for i, c in enumerate(pts):
        tan = (pts[min(i + 1, seg)] - pts[max(i - 1, 0)]).normalized()
        a = tan.cross(Vector((0, 1, 0)) if abs(tan.y) < 0.9 else Vector((1, 0, 0))).normalized()
        b = tan.cross(a).normalized()
        rad = r0 * (1 - i / seg) ** 0.85 + 0.0015
        rings.append(_ring(bm, c, a, b, rad, rad, n))
    for i in range(seg):
        _bridge(bm, rings[i], rings[i + 1])
    bm.faces.new(list(reversed(rings[0])))
    bm.faces.new(rings[-1])


def _groups_of(skin, names):
    return {skin.vertex_groups[g].index for g in names if g in skin.vertex_groups}


def _skin_weights(skin, v, top=4):
    """살 정점 하나의 뼈 무게(큰 넷, 합 1) — 살에 박히는 부품이 그 자리 살과 같이 움직이게."""
    ws = sorted(((skin.vertex_groups[g.group].name, g.weight) for g in v.groups
                 if g.weight > 0 and skin.vertex_groups[g.group].name in BONE_NAMES), key=lambda t: -t[1])[:top]
    s = sum(w for _, w in ws) or 1.0
    return {b: w / s for b, w in ws} or {'pelvis': 1.0}


BONE_NAMES = set()  # kitbash() 가 뼈대에서 채운다(살 정점 무리 중 뼈 이름인 것만 무게로 옮긴다)


def kitbash(arm, parts):
    """괴물 부품 — README §5 D(kitbash). 몸을 다 지은 뒤 실제 살 모양을 재서 자리를 잡는다. 앞 = -Y(Blender), 위 = +Z.
    horns: 머리 뼈에 붙는 굽은 원뿔 둘(`count: 1` 이면 정수리 외뿔) · tusks: 아랫입술 두 끝에서 솟는 엄니 ·
    loincloth: 허리에서 허벅지 중간까지 치마 천(위는 골반, 아래로 갈수록 허벅지 무게) ·
    spores: 등·어깨 살에 반쯤 묻힌 혹 무리(자리·크기는 인물 id 씨앗) · rocks: 어깨·팔·등·정강이에 박힌 모난 바위 판 ·
    robe: 쇄골 아래부터 발목(`length` 면 골반→발목 몫)까지 드리운 옷자락(끝단은 해진 톱니, `teeth` 개)."""
    skin = next(o for o in arm.children if o.type == 'MESH' and o.name.endswith('_basemesh'))
    BONE_NAMES.clear()
    BONE_NAMES.update(b.name for b in arm.data.bones)
    for p in parts:
        kind_ = p['part']
        if kind_ == 'horns':
            hv = _verts_world(skin, 'head')
            lo, hi = Vector([min(v[i] for v in hv) for i in range(3)]), Vector([max(v[i] for v in hv) for i in range(3)])
            size = hi - lo
            L, r0, seg = p.get('length', 0.15), p.get('radius', 0.022), 10
            up, back = Vector((0, 0, 1)), Vector((0, 1, 0))
            curl = p.get('curl', 0.5)
            bm, weights = bmesh.new(), {}
            if p.get('count', 2) == 1:
                # 정수리 외뿔 — 뿌리는 머리 가운데 줄에서 실제로 가장 높은 살(머리 모프마다 정수리 높이가 다르다)
                cx, yt = (lo.x + hi.x) / 2, lo.y + p.get('at', 0.40) * size.y
                crown = [v for v in hv if abs(v.x - cx) < 0.012 and abs(v.y - yt) < 0.02] or hv
                base = max(crown, key=lambda v: v.z).copy() - up * (0.6 * r0)
                pts = [base + up * (L * (0.9 * t - 0.2 * curl * t * t)) + back * (L * 0.5 * curl * t * t)
                       for t in (i / seg for i in range(seg + 1))]
                _cone(bm, pts, r0)
            else:
                for sx in (-1, 1):
                    out = Vector((sx, 0, 0))
                    base = Vector(((lo.x + hi.x) / 2 + sx * 0.27 * size.x, lo.y + 0.42 * size.y, hi.z - 0.14 * size.z))
                    base -= (out * 0.4 + up * 0.6) * r0  # 뿌리를 살 속에 조금 묻는다
                    pts = [base + out * (L * 0.5 * t) + up * (L * (0.8 * t - 0.25 * curl * t * t)) + back * (L * 0.45 * curl * t * t)
                           for t in (i / seg for i in range(seg + 1))]
                    _cone(bm, pts, r0)
            bm.verts.index_update()
            for v in bm.verts:
                weights[v.index] = {'head': 1.0}
            _new_part(arm, f'{arm.name}_kitbash_horn', bm, weights, p.get('color', '#d8cdb0'), 0.55)
        elif kind_ == 'tusks':
            # 입술 살(MPFB 'lips' 무리)의 좌우 끝 = 입꼬리. 아랫입술 쪽으로 내려 살 속에 묻고 위·앞·바깥으로 솟게
            lv = _verts_world(skin, 'lips')
            if not lv:
                sys.exit('kitbash tusks: 살에 lips 무리가 없다')
            cx = sum(v.x for v in lv) / len(lv)
            zlow = min(v.z for v in lv)
            L, r0, seg = p.get('length', 0.035), p.get('radius', 0.008), 6
            bm, weights = bmesh.new(), {}
            for sx in (-1, 1):
                corner = max(lv, key=lambda v: (v.x - cx) * sx)
                out = Vector((sx, 0, 0))
                base = Vector((cx + (corner.x - cx) * 0.8, corner.y + 0.004, zlow + 0.002))
                pts = [base + Vector((0, 0, 1)) * (L * t) + Vector((0, -1, 0)) * (L * 0.25 * t) + out * (L * 0.2 * t * t)
                       for t in (i / seg for i in range(seg + 1))]
                _cone(bm, pts, r0, 8)
            bm.verts.index_update()
            for v in bm.verts:
                weights[v.index] = {'head': 1.0}
            _new_part(arm, f'{arm.name}_kitbash_tusk', bm, weights, p.get('color', '#e8dfc4'), 0.45)
        elif kind_ in ('spores', 'rocks'):
            # spores: 등·어깨 뒤쪽 살에 65% 묻힌 둥근 혹 · rocks: 어깨·팔·등·정강이 바깥 살에 반쯤 묻힌 납작하고 모난 바위 판
            # (면을 안 쪼갠 이십면체를 살 법선 쪽으로 눌러 판처럼, 법선 둘레로 아무렇게나 돌린다). 자리·크기는 인물 id 씨앗
            import random, zlib
            rock = kind_ == 'rocks'
            rng = random.Random(zlib.crc32(f"{arm.name}/{kind_}".encode()))
            dflt = (('spine_02', 'spine_03', 'clavicle_l', 'clavicle_r', 'upperarm_l', 'upperarm_r', 'lowerarm_l', 'lowerarm_r',
                     'calf_l', 'calf_r') if rock else ('spine_02', 'spine_03', 'clavicle_l', 'clavicle_r', 'neck_01'))
            back = _groups_of(skin, p.get('groups', dflt))
            rot = skin.matrix_world.to_3x3()
            cand = [v for v in skin.data.vertices
                    if sum(g.weight for g in v.groups if g.group in back) >= 0.5
                    and (rot @ v.normal).y > (p.get('facing', -0.2) if rock else 0.35)]
            if not cand:
                sys.exit(f'kitbash {kind_}: 붙일 살을 못 찾았다')
            rmin, rmax = p.get('radius', (0.03, 0.08) if rock else (0.018, 0.05))
            picked = []
            for _ in range(4000):
                if len(picked) >= p.get('count', 14):
                    break
                v = cand[rng.randrange(len(cand))]
                r = rmin + (rmax - rmin) * rng.random() ** 1.6  # 작은 혹이 많고 큰 혹은 드물게
                co = skin.matrix_world @ v.co
                if all((co - c).length > (r + rc) * 0.85 for c, rc, _ in picked):
                    picked.append((co, r, v))
            bm, weights = bmesh.new(), {}
            for co, r, v in picked:
                nrm = (rot @ v.normal).normalized()
                ws = _skin_weights(skin, v)
                geom = bmesh.ops.create_icosphere(bm, subdivisions=1 if rock else 2, radius=r)
                if rock:
                    t1 = nrm.cross(Vector((0, 0, 1)) if abs(nrm.z) < 0.9 else Vector((1, 0, 0))).normalized()
                    ang = rng.random() * 2 * math.pi
                    t1 = t1 * math.cos(ang) + nrm.cross(t1) * math.sin(ang)
                    t2 = nrm.cross(t1).normalized()
                    k1, k2, kn = 1 + 0.35 * (rng.random() - 0.5), 1 + 0.35 * (rng.random() - 0.5), p.get('flat', 0.45)
                    ctr = co + nrm * (r * kn * 0.1)  # 판 두께의 절반 조금 넘게 살 속에
                    for bv in geom['verts']:
                        c0 = bv.co.copy()
                        bv.co = ctr + t1 * (c0.x * k1) + t2 * (c0.y * k2) + nrm * (c0.z * kn)
                else:
                    sq = Vector((1 + 0.25 * (rng.random() - 0.5), 1 + 0.25 * (rng.random() - 0.5), 1 + 0.25 * (rng.random() - 0.5)))
                    ctr = co + nrm * (r * 0.35)  # 65% 는 살 속에
                    for bv in geom['verts']:
                        bv.co = ctr + Vector((bv.co.x * sq.x, bv.co.y * sq.y, bv.co.z * sq.z))
                bm.verts.index_update()
                for bv in geom['verts']:
                    weights[bv.index] = ws
            _new_part(arm, f'{arm.name}_kitbash_{"rock" if rock else "spore"}', bm, weights,
                      p.get('color', '#8a8378' if rock else '#b8a24a'), 0.95 if rock else 0.7, smooth=not rock)
        elif kind_ == 'loincloth':
            bones = arm.data.bones
            z_top = (arm.matrix_world @ bones['pelvis'].head_local).z + p.get('top', 0.04)
            th = arm.matrix_world @ bones['thigh_l'].head_local
            kn = arm.matrix_world @ bones['calf_l'].head_local
            z_bot = th.z + (kn.z - th.z) * p.get('length', 0.55)
            # 단면은 몸통·다리 살만 — A 자세에서 손이 엉덩이 높이에 걸려 손까지 두르던 것(고블린 폭 ±0.48m, 09-25 측정)
            hip = {skin.vertex_groups[g].index for g in ('pelvis', 'spine_01', 'thigh_l', 'thigh_r') if g in skin.vertex_groups}
            allv = [skin.matrix_world @ v.co for v in skin.data.vertices
                    if sum(g.weight for g in v.groups if g.group in hip) >= 0.5]
            rows, n = 7, 28
            bm, weights, rings = bmesh.new(), {}, []
            for i in range(rows):
                t = i / (rows - 1)
                z = z_top + (z_bot - z_top) * t
                sl = [v for v in allv if abs(v.z - z) < 0.012] or allv
                lo = Vector((min(v.x for v in sl), min(v.y for v in sl), z))
                hi = Vector((max(v.x for v in sl), max(v.y for v in sl), z))
                flare = 1.10 + 0.12 * t  # 아래로 조금 벌어진다(허벅지가 움직일 틈)
                c = (lo + hi) / 2
                rings.append(_ring(bm, c, Vector((1, 0, 0)), Vector((0, 1, 0)),
                                   (hi.x - lo.x) / 2 * flare + 0.006, (hi.y - lo.y) / 2 * flare + 0.006, n))
            for i in range(rows - 1):
                _bridge(bm, rings[i], rings[i + 1])
            bm.verts.index_update()
            cx = (arm.matrix_world @ bones['pelvis'].head_local).x
            lsign = 1.0 if th.x > cx else -1.0  # thigh_l 이 어느 쪽인지 뼈대에서 읽는다
            for i, ring in enumerate(rings):
                t = i / (rows - 1)
                for v in ring:
                    side = 'thigh_l' if (v.co.x - cx) * lsign > 0 else 'thigh_r'
                    wt = 0.75 * t * min(1.0, abs(v.co.x - cx) / 0.05)
                    weights[v.index] = {'pelvis': 1.0 - wt, side: wt} if wt > 0 else {'pelvis': 1.0}
            _new_part(arm, f'{arm.name}_kitbash_cloth', bm, weights, p.get('color', '#5a4632'), 0.9)
        elif kind_ == 'robe':
            # 떠 있는 괴물(안개 유령)의 긴 옷자락 — 단면은 몸통·다리 살만(팔·손·목은 뺀다), 아래로 갈수록 벌어지고 끝단은 톱니.
            # 무게: 골반 위는 높이에 맞는 등뼈 하나, 아래는 골반 → 허벅지 → 종아리로 옮겨 가되 가운데(두 다리 사이)는 골반에 남긴다
            bones = arm.data.bones
            W = lambda b: arm.matrix_world @ bones[b].head_local  # noqa: E731
            pel, kn, an = W('pelvis'), W('calf_l'), W('foot_l')
            z_top = W('clavicle_l').z - p.get('top', 0.06)
            z_bot = pel.z - (pel.z - an.z) * p['length'] if 'length' in p else an.z + p.get('hem', 0.06)  # length: 골반→발목 몫(짧은 옷)
            body = _groups_of(skin, ('pelvis', 'spine_01', 'spine_02', 'spine_03', 'thigh_l', 'thigh_r', 'calf_l', 'calf_r'))
            allv = [skin.matrix_world @ v.co for v in skin.data.vertices
                    if sum(g.weight for g in v.groups if g.group in body) >= 0.6]
            rows, n, flare = 14, 36, p.get('flare', 0.5)
            bm, weights, rings, prev = bmesh.new(), {}, [], None
            for i in range(rows):
                t = i / (rows - 1)
                z = z_top + (z_bot - z_top) * t
                sl = [v for v in allv if abs(v.z - z) < 0.012]
                if sl:
                    # 단면 점을 모두 품는 타원 — 테두리 네모의 내접 타원은 두 다리 단면의 모서리(허벅지 바깥 앞뒤)를 놓친다(09-25 측정 37%)
                    cx0, cy0 = (min(v.x for v in sl) + max(v.x for v in sl)) / 2, (min(v.y for v in sl) + max(v.y for v in sl)) / 2
                    hx = max(max(v.x for v in sl) - cx0, 1e-3)
                    hy = max(max(v.y for v in sl) - cy0, 1e-3)
                    s = max(math.hypot((v.x - cx0) / hx, (v.y - cy0) / hy) for v in sl)
                    prev = (cx0, cy0, hx, hy, s)
                cx0, cy0, hx, hy, s = prev if prev else (0.0, 0.0, 0.15, 0.1, 1.0)
                c = Vector((cx0, cy0, z))
                # 위(가슴)는 살에 붙고, 골반 아래부터 치마처럼 벌어진다 — 아래 단면이 두 다리를 다 품도록 앞뒤도 넓힌다
                below = max(0.0, (pel.z - z) / max(pel.z - z_bot, 1e-6))
                sx = hx * s * (1.04 + flare * below) + 0.008
                sy = max(hy * s, sx * 0.62 * below) * (1.04 + flare * 0.6 * below) + 0.008
                ring = _ring(bm, c, Vector((1, 0, 0)), Vector((0, 1, 0)), sx, sy, n)
                if i == rows - 1:
                    for k, v in enumerate(ring):  # 해진 끝단
                        v.co.z += p.get('jag', 0.05) * (0.5 + 0.5 * math.cos(k * 2 * math.pi * p.get('teeth', 3) / n) * (1 if k % 2 else -0.6))
                rings.append(ring)
            for i in range(rows - 1):
                _bridge(bm, rings[i], rings[i + 1])
            bm.verts.index_update()
            cx = pel.x
            lsign = 1.0 if W('thigh_l').x > cx else -1.0
            spine = sorted(((W(b).z, b) for b in ('spine_01', 'spine_02', 'spine_03')), reverse=True)
            kd = None
            if p.get('weights') == 'skin':
                # 다리가 남는 옷(요정 잎 옷): 골반 아래 정점은 가장 가까운 다리·골반 살의 뼈 무게를 그대로 받는다 — 허벅지를 70% 만
                # 따라가게 하면 서기에 허벅지가 28% 뚫고 나왔다(09-25). 두 다리 사이 가운데 줄만 골반 쪽으로 반쯤 되돌려 찢어지지 않게
                from mathutils import kdtree
                src = [v for v in skin.data.vertices if sum(g.weight for g in v.groups if g.group in body) >= 0.6]
                kd = kdtree.KDTree(len(src))
                for i, v in enumerate(src):
                    kd.insert(skin.matrix_world @ v.co, i)
                kd.balance()
            for ring in rings:
                for v in ring:
                    z = v.co.z
                    if z >= pel.z:
                        b = next((nm for hz, nm in spine if z >= hz), 'pelvis')
                        weights[v.index] = {b: 1.0}
                        continue
                    if kd is not None:
                        ws = _skin_weights(skin, src[kd.find(v.co)[1]])
                        c = p.get('center', 0.5) * max(0.0, 1 - abs(v.co.x - cx) / 0.05)
                        ws = {b: w * (1 - c) for b, w in ws.items()}
                        ws['pelvis'] = ws.get('pelvis', 0.0) + c
                        weights[v.index] = ws
                        continue
                    side = 'l' if (v.co.x - cx) * lsign > 0 else 'r'
                    t_leg = min(1.0, (pel.z - z) / max(pel.z - kn.z, 1e-6))
                    t_calf = min(1.0, max(0.0, (kn.z - z) / max(kn.z - an.z, 1e-6)))
                    leg = 0.7 * t_leg * min(1.0, abs(v.co.x - cx) / 0.06)
                    ws = {'pelvis': 1.0 - leg}
                    if leg > 0:
                        ws[f'thigh_{side}'] = leg * (1 - 0.5 * t_calf)
                        if t_calf > 0:
                            ws[f'calf_{side}'] = leg * 0.5 * t_calf
                    weights[v.index] = ws
            if p.get('hide_legs'):
                # 다리 살을 지우면 발 뼈에 묶인 정점이 0 이 된다 — Unity Humanoid 는 스킨에 묶인 뼈로 아바타를 지어
                # "Required human bone 'LeftFoot' not found" 로 멈춘다(09-25). 끝단에 발·발끝 뼈 무게를 1% 씩 걸어 둔다(움직임엔 안 보인다)
                for v in rings[-1]:
                    side = 'l' if (v.co.x - cx) * lsign > 0 else 'r'
                    ws = {b: w * 0.98 for b, w in weights[v.index].items()}
                    ws[f'foot_{side}'] = ws[f'ball_{side}'] = 0.01  # 발끝(ball)도 — 발 방향 검사가 LeftToes 를 쓴다
                    weights[v.index] = ws
            _new_part(arm, f'{arm.name}_kitbash_robe', bm, weights, p.get('color', '#3c4a5c'), 0.85)
            if p.get('hide_legs'):
                # 떠 있는 유령은 옷자락 속에 다리가 없다 — 옷자락은 허벅지를 70% 까지만 따라가서, 서기·걷기에 다리가 벌어지면
                # 허벅지가 뚫고 나왔다(09-25 광선 측정 서기 29%·걷기 38%). 옷자락 크기를 잰 뒤에 지운다(단면이 다리를 품어야 한다)
                leg = _groups_of(skin, ('thigh_l', 'thigh_r', 'calf_l', 'calf_r', 'foot_l', 'foot_r', 'ball_l', 'ball_r'))
                zc = pel.z - 0.03
                kill = [v.index for v in skin.data.vertices
                        if sum(g.weight for g in v.groups if g.group in leg) >= 0.5 and (skin.matrix_world @ v.co).z < zc]
                sbm = bmesh.new()
                sbm.from_mesh(skin.data)
                sbm.verts.ensure_lookup_table()
                bmesh.ops.delete(sbm, geom=[sbm.verts[i] for i in kill], context='VERTS')
                sbm.to_mesh(skin.data)
                sbm.free()
                skin.data.update()
                print('KITBASH robe hide_legs: 살 정점', len(kill), '지움')
        else:
            sys.exit(f'kitbash: 모르는 부품 {kind_}')


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
    for slot, col in r.get('tints', {}).items():
        tint(arm, slot, col, os.path.join(os.path.dirname(os.path.abspath(out)), r['id'] + '_tex'))
    if r.get('kitbash'):
        kitbash(arm, r['kitbash'])
    build.cap_textures()
    rep = build.retarget(arm, r.get('anims', 'all'), bool(build.arg('--check')), rigmaps.MPFB)
    build.export(arm, out, build.arg('--fbx'))
    lic = {
        'id': r['id'], 'generator': 'tools/char-forge/build_real.py', 'blender': bpy.app.version_string,
        'license': 'CC0-1.0 (입력 전부 CC0 — MPFB 코드는 GPL 이지만 만든 모델에는 걸리지 않는다)',
        'inputs': ['mpfb 2.0.17: base.obj · targets · rig.game_engine', 'ual1_standard: Unreal Engine/AL_Standard.fbx']
        + [f'makehuman_system_assets: {r[p]}' for p in ('skin', 'eyes', 'eyebrows', 'eyelashes', 'teeth', 'hair') if r.get(p)]
        + [f'makehuman_system_assets: {c}' for c in r.get('clothes', [])]
        + [f'mh_animal01: targets/animal/{t}.target' for t in r.get('targets', {}) if t.split('_')[0] in ('elvs', 'culturalibre', 'jaldmic', 'titleknown')]
        + ([f"char-forge build_real.py kitbash(자체 생성): {', '.join(p['part'] for p in r['kitbash'])}"] if r.get('kitbash') else []),
    }
    json.dump(lic, open(os.path.splitext(out)[0] + '.license.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    meshes = [m for m in arm.children if m.type == 'MESH']
    tris = sum(sum(len(p.vertices) - 2 for p in m.data.polygons) for m in meshes)
    lo = min((m.matrix_world @ v.co).z for m in meshes for v in m.data.vertices) if meshes else 0
    hi = max((m.matrix_world @ v.co).z for m in meshes for v in m.data.vertices) if meshes else 0
    meta = rep.pop('_meta')
    worst = max((v['ground_err_m'] or 0 for v in rep.values()), default=0)
    print('CHARFORGE', json.dumps({'id': r['id'], 'bones': len(arm.data.bones), 'meshes': len(meshes), 'tris': tris,
                                   'height_m': round(hi - lo, 3), 'sole_z_m': round(lo, 4), 'anims': len(rep), 'ground_err_max_m': worst,
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
