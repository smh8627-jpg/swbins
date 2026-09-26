"""char-forge 옷 짓기 — 공방이 옷 메시를 지어 MakeHuman 옷(.mhclo)으로 내보낸다(README §8-1 09-26: CC0 옷장에 동양 역사 옷이 없다).

    export BLENDER_USER_RESOURCES="$PWD/tools/char-forge/_blender"
    "$B" -b --factory-startup -P tools/char-forge/garments.py -- <옷 id> [<옷 id> …]      # GARMENTS 의 열쇠, all = 전부

껍데기(shell)와 다른 점: 살을 복제해 띄우지 않고 **옷의 모양을 따로 짓는다** — 몸통~단 통(치마 도우미에 붙어 다리 사이가 갈라지지 않음),
아래로 처지는 넓은 소매, 허리띠, 두께(안쪽 면). 그다음 MPFB MakeClothes 와 같은 순서(`mesh_is_valid_as_clothes` →
`create_mhclo_from_clothes_matching` → `write_mhclo`)로 기본 몸에 맞춘 .mhclo 를 쓰므로, 어느 체형(키·체격·성별 모프)에도 MakeHuman 이 맞춰 입힌다.
레시피에서는 받은 CC0 옷과 똑같이 `"clothes": ["cf_dopo/cf_dopo.mhclo"]`.

만든 옷은 MPFB 사용자 데이터 `clothes/cf_<id>/`(gitignore 된 _blender 안)에 쓴다 — 생성기가 정본이라 다른 PC 는 이 스크립트를 다시 돌린다.
그림(천 결·깃·단·소매 끝동·띠)도 여기서 굽는다(`_paint`). 좌표: 미터, Z 위, 앞 = -Y.
"""
import bpy, bmesh, math, os, sys, uuid, random
import numpy as np
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_real  # noqa: E402

# ---- 옷 틀 ----
# body: 몸통~단 통 · top: 목둘레 여유 · ease: 몸통 여유(m) · hem: 발목 위 높이(m) · flare: 단 넓힘(몫) · split: 치마 도우미로 넘기는 높이(가랑이 위 m)
# sleeve: 소매 여유·끝 처짐(drop m)·끝동 넘김(m) · belt: 허리띠 높이(허리뼈 위 m)·폭 · paint: 바탕·깃·단·끝동·띠 색, 깃 모양
GARMENTS = {
    'dopo': dict(name='CF Dopo', tags=['robe', 'historical', 'east'],
                 desc='교령 넓은 소매 긴 옷(도포·심의·한푸 계열) — char-forge 가 지음',
                 ease=0.022, hem=0.06, flare=0.55, sleeve_ease=0.028, drop=0.13, cuff=0.035,
                 belt=(0.02, 0.05), collar='cross',
                 paint=dict(base='#e9e4d6', trim='#1f2a44', hem='#1f2a44', cuff='#1f2a44', belt='#3a2e28', weave=0.05)),
}

SEG = 48       # 몸통 둘레 칸
SSEG = 24      # 소매 둘레 칸
TEX = 2048


def hexrgb(h):
    h = h.lstrip('#')
    return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], dtype=np.float32)


def human(svc):
    """기본 몸(모프 0.5) + game_engine 뼈 — 뼈 무게로 살을 몸통·팔·다리로 나누려고. 도우미는 켠 채(치마 도우미에 맞춘다)."""
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bm = svc['HumanService'].create_human(mask_helpers=False, detailed_helpers=True, extra_vertex_groups=True,
                                          feet_on_ground=True, scale=0.1)
    svc['HumanService'].add_builtin_rig(bm, 'game_engine', import_weights=True)
    return bm, bm.parent


def weights(bm):
    names = [g.name for g in bm.vertex_groups]
    W = [dict() for _ in bm.data.vertices]
    for v in bm.data.vertices:
        for g in v.groups:
            W[v.index][names[g.group]] = g.weight
    return W


def part_sum(w, pats):
    return sum(x for n, x in w.items() if any(n == p or (p.endswith('*') and n.startswith(p[:-1])) for p in pats))


def bone(arm, n, tail=False):
    b = arm.data.bones[n]
    return arm.matrix_world @ (b.tail_local if tail else b.head_local)


def ring_radii(pts, cx, cy, seg, ease):
    """점들의 둘레 반지름(칸마다 가장 먼 점) → 빈 칸은 이웃으로 메우고 둥글게 편다."""
    r = np.zeros(seg)
    for x, y in pts:
        a = math.atan2(y - cy, x - cx) % (2 * math.pi)
        k = int(a / (2 * math.pi) * seg) % seg
        r[k] = max(r[k], math.hypot(x - cx, y - cy))
    if not r.any():
        return None
    for _ in range(seg):
        z = np.where(r == 0)[0]
        if not len(z):
            break
        for k in z:
            r[k] = max(r[(k - 1) % seg], r[(k + 1) % seg])
    for _ in range(6):  # 오목한 곳(다리 사이·겨드랑이)을 볼록하게 — 이웃 평균보다 작으면 올린다
        r = np.maximum(r, (np.roll(r, 1) + np.roll(r, -1)) / 2)
    ker = np.array([1, 2, 3, 2, 1], np.float64) / 9  # 칸 최댓값의 계단을 둥글게
    for _ in range(3):
        r = sum(ker[j] * np.roll(r, j - 2) for j in range(5))
    return r + ease


def build_mesh(g, bm, arm):
    mw = bm.matrix_world
    W = weights(bm)
    co = [mw @ v.co for v in bm.data.vertices]
    body_idx = {v.index for v in bm.data.vertices if 'body' in W[v.index]}
    torso = [i for i in body_idx if part_sum(W[i], ['pelvis', 'spine_0*', 'clavicle_*', 'neck_01']) >= 0.5]
    legs = [i for i in body_idx if part_sum(W[i], ['thigh_*', 'calf_*', 'pelvis']) >= 0.5]
    # 맞춤 무리 — 옷 정점을 이 살에만 붙인다(A 자세 손이 허리 옆이라 'body' 전체면 띠·옷자락이 손에 붙어 튄다).
    # .mhclo 에는 몸 면 번호만 남으므로 게임 몸엔 이 무리가 없어도 된다
    for gname, pats, thr in (('cf_torso', ['pelvis', 'spine_0*', 'clavicle_*', 'neck_01', 'thigh_*'], 0.6),
                             ('cf_arm_l', ['upperarm_l', 'lowerarm_l', 'clavicle_l'], 0.6),
                             ('cf_arm_r', ['upperarm_r', 'lowerarm_r', 'clavicle_r'], 0.6)):
        if gname not in bm.vertex_groups:
            vg_ = bm.vertex_groups.new(name=gname)
            vg_.add([i for i in body_idx if part_sum(W[i], pats) >= thr], 1.0, 'REPLACE')
    z_sh = bone(arm, 'upperarm_l').z + 0.03
    z_neck = bone(arm, 'neck_01').z + 0.01
    z_crotch = bone(arm, 'thigh_l').z - 0.06
    z_hem = bone(arm, 'foot_l').z + g['hem']
    z_belt = bone(arm, 'spine_01').z + g['belt'][0]
    cx, cy = 0.0, float(np.mean([co[i].y for i in torso]))

    out = bmesh.new()
    uvl = out.loops.layers.uv.new('UVMap')
    grp = {}  # 정점 → 무리 이름
    faces = []  # (face, 부위)

    # -- 몸통~단 통 --
    NR = 44
    zs = [z_hem + (z_sh - z_hem) * k / (NR - 1) for k in range(NR)]
    # 위(어깨)에서 아래(단)로 반지름을 정한다 — 가랑이 아래는 위 고리보다 좁아지지 않고, 단까지 flare 몫만큼 고르게 넓어진다
    RR = [None] * NR
    prev = None
    k_cr = None
    for k in reversed(range(NR)):
        z = zs[k]
        src = torso if z > z_crotch + 0.04 else torso + legs
        band = [(co[i].x, co[i].y) for i in src if abs(co[i].z - z) < 0.025]
        r = ring_radii(band, cx, cy, SEG, g['ease']) if band else None
        if r is None:
            r = prev
        if z < z_crotch and prev is not None:
            if k_cr is None:
                k_cr = k + 1
            steps = max(k_cr, 1)  # 가랑이 → 단 고리 수
            r = np.maximum(r, prev) * (1 + g['flare']) ** (1 / steps)
        RR[k] = prev = r
    for _ in range(2):  # 위아래 고리끼리도 편다(띠 높이마다 뽑힌 살이 달라 층이 진다)
        RR = [RR[0]] + [(RR[k - 1] + 2 * RR[k] + RR[k + 1]) / 4 for k in range(1, NR - 1)] + [RR[-1]]
    rings = []
    for k, z in enumerate(zs):
        r = RR[k]
        ring = []
        for s in range(SEG):
            a = 2 * math.pi * s / SEG
            fold = 1 + g.get('folds', 0.02) * max(0.0, (z_crotch - z) / max(z_crotch - z_hem, 1e-3)) * math.sin(a * 9 + 0.7)
            v = out.verts.new((cx + r[s] * fold * math.cos(a), cy + r[s] * fold * math.sin(a), z))
            grp[v] = 'helper-skirt' if z < z_crotch - 0.02 else 'cf_torso'
            ring.append(v)
        rings.append((z, ring))
    # 어깨 → 목둘레(목 살 둘레 + 여유)
    neck_pts = [(c.x, c.y) for i, c in enumerate(co) if i in body_idx and abs(c.z - z_neck) < 0.02 and W[i].get('neck_01', 0) > 0.3]
    rn = ring_radii(neck_pts, cx, float(np.mean([p[1] for p in neck_pts])), SEG, 0.018)
    ncy = float(np.mean([p[1] for p in neck_pts]))
    for k in range(1, 4):
        f = k / 3
        z = z_sh + (z_neck - z_sh) * f
        r_sh = RR[-1]
        ring = []
        for s in range(SEG):
            a = 2 * math.pi * s / SEG
            rr = r_sh[s] * (1 - f) + rn[s] * f
            yy = cy * (1 - f) + ncy * f
            v = out.verts.new((cx + rr * math.cos(a), yy + rr * math.sin(a), z))
            grp[v] = 'cf_torso'
            ring.append(v)
        rings.append((z, ring))
    vmin, vmax = rings[0][0], rings[-1][0]
    for (za, ra), (zb, rb) in zip(rings, rings[1:]):
        for s in range(SEG):
            s2 = (s + 1) % SEG
            f = out.faces.new((ra[s], ra[s2], rb[s2], rb[s]))
            faces.append((f, 'robe'))
            for lp in f.loops:
                p = lp.vert.co
                a = (math.atan2(p.y - cy, p.x - cx) % (2 * math.pi)) / (2 * math.pi)
                if lp.vert in (ra[s2], rb[s2]) and s2 == 0:
                    a = 1.0
                lp[uvl].uv = (a * 0.62, 0.06 + 0.94 * (p.z - vmin) / (vmax - vmin))

    # -- 소매(좌우) --
    for side, u0 in (('l', 0.64), ('r', 0.83)):
        S = bone(arm, f'upperarm_{side}')
        E = bone(arm, f'lowerarm_{side}')
        Wr = bone(arm, f'hand_{side}')
        armv = [co[i] for i in body_idx if part_sum(W[i], [f'upperarm_{side}', f'lowerarm_{side}']) >= 0.5]
        L1, L2 = (E - S).length, (Wr - E).length
        L = L1 + L2
        down = Vector((0, 0, -1))
        NT = 16
        srings = []
        for k in range(NT + 1):
            t = 0.02 + (1.0 + g['cuff'] / L - 0.02) * k / NT
            d = t * L
            if d <= L1:
                P, dirv = S + (E - S) * (d / L1), (E - S).normalized()
            else:
                P, dirv = E + (Wr - E) * min((d - L1) / L2, 1.0) + (Wr - E).normalized() * max(d - L, 0), (Wr - E).normalized()
            v_ = (down - dirv * down.dot(dirv))
            v_ = v_.normalized() if v_.length > 1e-4 else Vector((0, -1, 0))
            w_ = dirv.cross(v_)
            near = [p for p in armv if abs((p - P).dot(dirv)) < 0.025]
            r = max(((p - P) - dirv * (p - P).dot(dirv)).length for p in near) if near else 0.045
            r = min(r, 0.052 + 0.015 * min(1.0, t * 2)) + g['sleeve_ease'] * min(1.0, 0.35 + t)  # 어깨 쪽은 가슴 살이 섞여 커진다 — 막고 여유도 줄인다
            # 두루마기 소매: 팔꿈치 아래로 주머니가 처지다가 끝(손 나오는 곳)에서 반쯤 오므린다
            tt = max(0.0, min(1.0, (t - 0.3) / 0.55))
            drop = g['drop'] * (3 * tt * tt - 2 * tt * tt * tt)
            if t > 0.85:
                drop *= 1 - 0.5 * min(1.0, (t - 0.85) / 0.2)
            ring = []
            for s in range(SSEG):
                ph = 2 * math.pi * s / SSEG
                sv = math.sin(ph)
                off = w_ * (r * 1.1 * math.cos(ph)) + v_ * (r * sv + drop * ((1 + sv) / 2) ** 2)  # 아래로 둥글게 처지는 주머니
                vv = out.verts.new(P + off)
                grp[vv] = f'cf_arm_{side}'
                ring.append(vv)
            srings.append((t, ring))
        for (ta, ra), (tb, rb) in zip(srings, srings[1:]):
            for s in range(SSEG):
                s2 = (s + 1) % SSEG
                f = out.faces.new((ra[s], rb[s], rb[s2], ra[s2]))
                faces.append((f, 'sleeve'))
                for lp, (tv, sv) in zip(f.loops, ((ta, s), (tb, s), (tb, s2 if s2 else SSEG), (ta, s2 if s2 else SSEG))):
                    lp[uvl].uv = (u0 + 0.17 * sv / SSEG, 0.06 + 0.94 * (tv - 0.02) / (1.0 + g['cuff'] / L - 0.02))

    # -- 허리띠(통 바깥 둘레 + 6mm) --
    bw = g['belt'][1]
    k0 = min(range(len(rings)), key=lambda k: abs(rings[k][0] - z_belt))
    base = rings[k0][1]
    z_belt = rings[k0][0]  # 고리 높이에 맞춘다(사이 높이면 통 반지름이 달라 띠 윗선이 뚫린다)
    bring = []
    for dz in (-bw / 2, bw / 2):
        ring = []
        for s in range(SEG):
            p = base[s].co
            d = Vector((p.x - cx, p.y - cy, 0))
            d = d.normalized() if d.length > 1e-4 else Vector((1, 0, 0))
            vv = out.verts.new(Vector((p.x, p.y, z_belt + dz)) + d * 0.012)
            grp[vv] = 'cf_torso'
            ring.append(vv)
        bring.append(ring)
    for s in range(SEG):
        s2 = (s + 1) % SEG
        f = out.faces.new((bring[0][s], bring[0][s2], bring[1][s2], bring[1][s]))
        faces.append((f, 'belt'))
        for lp, (sv, vv) in zip(f.loops, ((s, 0), (s2 if s2 else SEG, 0), (s2 if s2 else SEG, 1), (s, 1))):
            lp[uvl].uv = (0.62 * sv / SEG, 0.005 + 0.04 * vv)

    for f in out.faces:
        f.smooth = True
    out.normal_update()
    for f, _ in faces:  # 바깥을 보게
        c = f.calc_center_median()
        if f.normal.dot(Vector((c.x - cx, c.y - cy, 0))) < 0 and _ != 'sleeve':
            f.normal_flip()
    me = bpy.data.meshes.new('cf_garment')
    out.to_mesh(me)
    ob = bpy.data.objects.new('cf_garment', me)
    bpy.context.scene.collection.objects.link(ob)
    order = list(grp.keys())
    names = sorted(set(grp.values()))
    vg = {n: ob.vertex_groups.new(name=n) for n in names}
    for v in order:
        vg[grp[v]].add([v.index], 1.0, 'REPLACE')
    out.free()
    # 두께(안쪽 면) — 소매 속·단 속이 비어 보이지 않게. 사각형만 남는다
    md = ob.modifiers.new('solid', 'SOLIDIFY')
    md.thickness, md.offset, md.use_rim = 0.004, -1.0, True
    with build_real.build.ctx(ob, [ob]):
        bpy.ops.object.modifier_apply(modifier=md.name)
    return ob, torso, legs, body_idx, W, co, z_hem


def delete_group(bm, W, co, z_hem, arm):
    """옷에 덮이는 살(몸통·팔 손목 5cm 전까지·다리 발목 위까지) — 빌드가 지워 뚫림을 막는다."""
    g = bm.vertex_groups.new(name='cf_delete')
    wz = {s: bone(arm, f'hand_{s}') for s in 'lr'}
    idx = []
    for v in bm.data.vertices:
        w = W[v.index]
        if 'body' not in w:
            continue
        if part_sum(w, ['pelvis', 'spine_0*', 'clavicle_*', 'thigh_*', 'calf_*', 'upperarm_*']) >= 0.5 and co[v.index].z > z_hem + 0.03:
            idx.append(v.index)
        elif part_sum(w, ['lowerarm_*']) >= 0.5:
            s = 'l' if co[v.index].x > 0 else 'r'
            if (co[v.index] - wz[s]).length > 0.07:
                idx.append(v.index)
    g.add(idx, 1.0, 'REPLACE')
    return g.name


def _paint(g, path):
    """천 그림 — 바탕 + 결(가로세로 실) + 앞 교령 깃 + 목 뒤 깃 + 단 + 끝동 + 띠. UV 칸은 build_mesh 와 같다."""
    P = g['paint']
    rng = np.random.default_rng(20260926)
    H = W = TEX
    img = np.tile(hexrgb(P['base']), (H, W, 1))
    yy, xx = np.mgrid[0:H, 0:W]
    weave = (np.sin(xx * 0.9) * np.sin(yy * 0.9)) * 0.5 + rng.normal(0, 0.5, (H, W))
    img *= (1 + P['weave'] * weave)[..., None]
    u = xx / W
    v = 1 - yy / H  # 그림 위 = v 1

    def band(mask, col):
        img[mask] = hexrgb(col) * (1 + P['weave'] * 0.6 * weave[mask])[..., None]

    band((u < 0.62) & (v > 0.06) & (v < 0.10), P['hem'])                  # 단
    band((u < 0.62) & (v > 0.988), P['trim'])                             # 목둘레 깃(뒤)
    uc = 0.75 * 0.62                                                      # 앞 가운데(-Y = 270°)
    if g.get('collar') == 'cross':  # 왼깃이 오른쪽으로 내려와 덮는다(교령 우임)
        for (ua, va), (ub, vb), wdt in (((uc - 0.05, 1.0), (uc + 0.07, 0.70), 0.018), ((uc + 0.05, 1.0), (uc + 0.005, 0.86), 0.014)):
            t = np.clip(((u - ua) * (ub - ua) + (v - va) * (vb - va)) / ((ub - ua) ** 2 + (vb - va) ** 2), 0, 1)
            dist = np.hypot(u - (ua + t * (ub - ua)), (v - (va + t * (vb - va))) * 0.62)
            band((dist < wdt) & (u < 0.62), P['trim'])
    band((u >= 0.64) & (v > 0.06 + 0.94 * 0.95), P['cuff'])                # 소매 끝동
    band((u < 0.62) & (v < 0.05), P['belt'])                              # 띠
    # Blender 이미지는 아래 줄부터 — 위(v 1)가 첫 줄인 배열을 뒤집어 넣는다
    rgba = np.concatenate([np.clip(img, 0, 255) / 255.0, np.ones((H, W, 1), np.float32)], axis=2)[::-1]
    im = bpy.data.images.new(os.path.basename(path), W, H, alpha=False)
    im.pixels.foreach_set(rgba.astype(np.float32).ravel())
    im.filepath_raw = path
    im.file_format = 'PNG'
    im.save()


def make(gid, svc):
    g = GARMENTS[gid]
    bm, arm = human(svc)
    from bl_ext.user_default.mpfb.services import ClothesService, LocationService
    from bl_ext.user_default.mpfb.entities.meshcrossref import MeshCrossRef
    cache = LocationService.get_user_cache('basemesh_xref')
    if not os.path.exists(cache):
        os.makedirs(cache)
        MeshCrossRef(bm, after_modifiers=False, build_faces_by_group_reference=True, cache_dir=cache, write_cache=True, read_cache=False)
    ob, torso, legs, body_idx, W, co, z_hem = build_mesh(g, bm, arm)
    chk = ClothesService.mesh_is_valid_as_clothes(ob, bm)
    if not chk['all_checks_ok']:
        sys.exit(f'{gid}: 옷 검사 실패 {chk}')
    dg = delete_group(bm, W, co, z_hem, arm)
    name = 'cf_' + gid
    out = os.path.join(LocationService.get_user_data('clothes'), name)
    os.makedirs(out, exist_ok=True)
    tex = name + '_diffuse.png'
    _paint(g, os.path.join(out, tex))
    mhmat = f"""# char-forge garments.py material (CC0)
name {g['name']}
license CC0
author char-forge
diffuseColor 1.0 1.0 1.0
diffuseIntensity 1.0
diffuseTexture {tex}
metallic 0.0
roughness 0.9
opacity 1.0
"""
    open(os.path.join(out, name + '.mhmat'), 'w', encoding='utf-8', newline='\n').write(mhmat)
    props = dict(author='char-forge', name='cf_' + gid, license='CC0', description=g['desc'], homepage='',
                 uuid=str(uuid.UUID(int=random.Random(name).getrandbits(128))))
    mh = ClothesService.create_mhclo_from_clothes_matching(bm, ob, properties_dict=props, delete_group=dg)
    mh.material = name + '.mhmat'
    mh.tags = ','.join(g['tags'])
    mh.write_mhclo(os.path.join(out, name + '.mhclo'), reference_scale=ClothesService.get_reference_scale(bm), also_export_mhmat=True)
    open(os.path.join(out, name + '.mhmat'), 'w', encoding='utf-8', newline='\n').write(mhmat)  # material 줄만 쓰고 내용은 우리 것
    nf = len(ob.data.polygons)
    print('GARMENT', gid, 'verts', len(ob.data.vertices), 'faces', nf, 'delete', len([1 for v in bm.data.vertices for x in v.groups if bm.vertex_groups[x.group].name == dg]), '->', out)


def main():
    ids = sys.argv[sys.argv.index('--') + 1:]
    if ids == ['all']:
        ids = list(GARMENTS)
    svc = build_real.mpfb()
    for gid in ids:
        make(gid, svc)


main()
