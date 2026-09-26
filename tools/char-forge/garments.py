"""char-forge 옷 짓기 — 공방이 옷 메시를 지어 MakeHuman 옷(.mhclo)으로 내보낸다(README §8-1 09-26: CC0 옷장에 동양 역사 옷이 없다).

    export BLENDER_USER_RESOURCES="$PWD/tools/char-forge/_blender"
    "$B" -b --factory-startup -P tools/char-forge/garments.py -- <옷 id> [<옷 id> …]      # GARMENTS 의 열쇠, all = 전부

껍데기(shell)와 다른 점: 살을 복제해 띄우지 않고 **옷의 모양을 따로 짓는다**. 옷 하나 = 부품 여럿(`parts`):
  tube    몸통 통 — 위(목·가슴·허리)에서 아래(발목·무릎·엉덩이)까지. 가랑이 아래는 치마 도우미(helper-skirt)에 붙어 다리 사이가 안 갈라진다.
          `over` 만큼 밖에 겹쳐 입는다(저고리 위 치마 끝, 갑옷 위 비늘 치마). `mono` 면 아래로 좁아지지 않는다(가슴에서 시작하는 치마).
  sleeves 소매 — `length` 팔 몫(1 = 손목, 0.35 = 어깨 갑옷), `drop` 처짐, `flare` 끝 넓힘
  band    띠 — 그 높이 통 둘레 바깥
  mangeon·topknot·gat·helmet  머리 부품(망건·상투·갓·투구) — 머리 살에 붙는다
그다음 MPFB MakeClothes 와 같은 순서(`mesh_is_valid_as_clothes` → `create_mhclo_from_clothes_matching` → `write_mhclo`)로 기본 몸에 맞춘
.mhclo 를 쓰므로 어느 체형에나 MakeHuman 이 맞춰 입힌다. 레시피에서는 받은 CC0 옷과 똑같이 `"clothes": ["cf_dopo/cf_dopo.mhclo"]`.
옷 정점은 옷 지을 때만 만드는 맞춤 무리(cf_torso·cf_arm_l/r·cf_head)에만 붙인다 — 'body' 전체면 A 자세 손(허리 옆)에 띠가 붙어 튄다.

천 그림(바탕 무늬 weave·lamellar·quilt·brocade + 깃·단·끝동·고름)과 **노멀 그림**도 여기서 굽는다. 부품마다 UV 칸(`slot`)이 있다.
만든 옷은 MPFB 사용자 데이터 `clothes/cf_<id>/`(gitignore 된 _blender 안) — 생성기가 정본이라 다른 PC 는 이 스크립트를 다시 돌린다.
좌표: 미터, Z 위, 앞 = -Y(둘레 각 270° = UV s 0.75).
"""
import bpy, bmesh, math, os, sys, uuid, random
import numpy as np
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_real  # noqa: E402

TEX = 2048
SEG = 48       # 몸통 둘레 칸
SSEG = 24      # 소매 둘레 칸
HSEG = 32      # 머리 부품 둘레 칸
# UV 칸 (u0, v0, u1, v1)
SLOTS = [(0.00, 0.00, 0.36, 1.00), (0.36, 0.00, 0.60, 1.00), (0.60, 0.00, 0.78, 1.00),
         (0.78, 0.00, 1.00, 0.25), (0.78, 0.25, 1.00, 0.50), (0.78, 0.50, 1.00, 0.75), (0.78, 0.75, 1.00, 1.00)]

NAVY, IVORY, BROWN, BLACK = '#1f2a44', '#e9e4d6', '#3a2e28', '#141416'
STEEL, LACE = '#8d949b', '#4a2a1a'

# ---- 옷 틀 ----
GARMENTS = {
    # 도포·심의·한푸 계열 — 선비·책사·임금 평상
    'dopo': dict(desc='교령 넓은 소매 긴 옷(도포·심의·한푸 계열)', tags=['robe', 'historical', 'east'], parts=[
        dict(kind='tube', top=('neck', 0), bottom=('ankle', 0.06), ease=0.022, flare=0.55, folds=0.02, slot=0,
             paint=dict(base=IVORY, trims=[('bottom', 0.04, NAVY), ('top', 0.012, NAVY), ('cross', NAVY)])),
        dict(kind='sleeves', length=1.0, ease=0.028, drop=0.13, cuff=0.035, slot=2,
             paint=dict(base=IVORY, trims=[('top', 0.05, NAVY)])),
        dict(kind='band', at=('waist', 0.02), width=0.05, over=0.012, slot=3, paint=dict(base=BROWN)),
    ]),
    # 저고리 + 치마 — 여자(조선·고려·삼국 공통 틀, 색은 레시피 tints 로 바꾸지 않고 틀마다 굽는다)
    'hanbok_f': dict(desc='저고리(교령·고름·끝동)와 가슴에서 떨어지는 긴 치마', tags=['hanbok', 'historical', 'east', 'female'], parts=[
        dict(kind='tube', top=('chest', 0.03), bottom=('ankle', 0.005), ease=0.035, flare=1.4, mono=True, folds=0.04, slot=0,
             paint=dict(base='#a8323a', pattern='weave')),
        dict(kind='tube', top=('neck', 0), bottom=('chest', -0.035), ease=0.016, over=0.012, slot=1,
             paint=dict(base='#efd98c', trims=[('cross', '#f4f1e8', 0.6), ('top', 0.01, '#f4f1e8'), ('ribbon', '#a8323a')])),
        dict(kind='sleeves', length=1.0, ease=0.012, drop=0.0, cuff=0.012, slot=2,
             paint=dict(base='#efd98c', trims=[('top', 0.07, '#3c5aa8')])),
    ]),
    # 찰갑 무장 — 붉은 속옷(무릎) + 비늘 가슴갑옷 + 어깨 비늘 + 비늘 치마 + 띠
    'chalgap': dict(desc='찰갑 — 비늘 가슴갑옷·어깨·치마, 붉은 속옷', tags=['armor', 'historical', 'east'], parts=[
        dict(kind='tube', top=('neck', 0), bottom=('knee', -0.06), ease=0.02, flare=0.3, folds=0.015, slot=0,
             paint=dict(base='#7a2a24', trims=[('cross', BLACK), ('top', 0.012, BLACK), ('bottom', 0.03, BLACK)])),
        dict(kind='sleeves', length=1.0, ease=0.02, drop=0.03, cuff=0.01, slot=2,
             paint=dict(base='#7a2a24', trims=[('top', 0.06, BLACK)])),
        dict(kind='tube', top=('chest', 0.07), bottom=('hip', -0.03), ease=0.02, over=0.024, slot=1,
             paint=dict(base=STEEL, pattern='lamellar', lace=LACE, trims=[('top', 0.012, LACE), ('bottom', 0.01, LACE)])),
        dict(kind='tube', top=('waist', 0.0), bottom=('knee', 0.04), ease=0.02, over=0.034, flare=0.35, mono=True, slot=5,
             paint=dict(base=STEEL, pattern='lamellar', lace=LACE, trims=[('bottom', 0.015, LACE), ('split', 0.008, BLACK)])),
        dict(kind='sleeves', length=0.36, ease=0.03, over=0.02, flare=0.55, drop=0.0, cuff=0.0, slot=4,
             paint=dict(base=STEEL, pattern='lamellar', lace=LACE, trims=[('top', 0.03, LACE)])),
        dict(kind='band', at=('waist', 0.0), width=0.04, over=0.045, slot=3, paint=dict(base='#2a1c14')),
    ]),
    # 망건 + 상투 + 갓 — 조선 선비 머리(도포와 같이)
    'gat': dict(desc='망건·상투·흑립(갓)', tags=['hat', 'historical', 'east'], parts=[
        dict(kind='mangeon', slot=3, paint=dict(base=BLACK, pattern='mesh')),
        dict(kind='topknot', slot=4, paint=dict(base='#1b1512', pattern='hair')),
        dict(kind='gat', slot=6, paint=dict(base=BLACK, pattern='mesh')),
    ]),
    # 투구 — 둥근 투구 + 비늘 목가리개 + 꼭지
    'helmet_east': dict(desc='둥근 투구·비늘 목가리개·꼭지', tags=['helmet', 'historical', 'east'], parts=[
        dict(kind='helmet', slot=0, paint=dict(base=STEEL, pattern='plate')),
        dict(kind='neckguard', slot=1, paint=dict(base=STEEL, pattern='lamellar', lace=LACE, trims=[('bottom', 0.02, LACE)])),
    ]),
}


def hexrgb(h):
    h = h.lstrip('#')
    return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], dtype=np.float32)


def human(svc):
    """기본 몸(모프 0.5) + game_engine 뼈 — 뼈 무게로 살을 몸통·팔·다리·머리로 나누려고. 도우미는 켠 채(치마 도우미에 맞춘다)."""
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bm = svc['HumanService'].create_human(mask_helpers=False, detailed_helpers=True, extra_vertex_groups=True,
                                          feet_on_ground=True, scale=0.1)
    svc['HumanService'].add_builtin_rig(bm, 'game_engine', import_weights=True)
    return bm, bm.parent


def part_sum(w, pats):
    return sum(x for n, x in w.items() if any(n == p or (p.endswith('*') and n.startswith(p[:-1])) for p in pats))


def ring_radii(pts, cx, cy, seg, ease):
    """점들의 둘레 반지름(칸마다 가장 먼 점) → 빈 칸은 이웃으로 메우고, 오목한 곳을 볼록하게, 계단을 둥글게."""
    r = np.zeros(seg)
    for x, y in pts:
        k = int((math.atan2(y - cy, x - cx) % (2 * math.pi)) / (2 * math.pi) * seg) % seg
        r[k] = max(r[k], math.hypot(x - cx, y - cy))
    if not r.any():
        return None
    for _ in range(seg):
        z = np.where(r == 0)[0]
        if not len(z):
            break
        for k in z:
            r[k] = max(r[(k - 1) % seg], r[(k + 1) % seg])
    for _ in range(6):
        r = np.maximum(r, (np.roll(r, 1) + np.roll(r, -1)) / 2)
    ker = np.array([1, 2, 3, 2, 1], np.float64) / 9
    for _ in range(3):
        r = sum(ker[j] * np.roll(r, j - 2) for j in range(5))
    return r + ease


class Body:
    """기본 몸 측정 — 살 좌표·뼈 무게·높이 기준."""

    def __init__(self, bm, arm):
        self.bm, self.arm = bm, arm
        names = [g.name for g in bm.vertex_groups]
        self.W = [dict() for _ in bm.data.vertices]
        for v in bm.data.vertices:
            for g in v.groups:
                self.W[v.index][names[g.group]] = g.weight
        self.co = [bm.matrix_world @ v.co for v in bm.data.vertices]
        W = self.W
        self.body = [v.index for v in bm.data.vertices if 'body' in W[v.index]]
        self.torso = [i for i in self.body if part_sum(W[i], ['pelvis', 'spine_0*', 'clavicle_*', 'neck_01']) >= 0.5]
        self.legs = [i for i in self.body if part_sum(W[i], ['thigh_*', 'calf_*', 'pelvis']) >= 0.5]
        self.head = [i for i in self.body if W[i].get('head', 0) >= 0.6]
        for gname, idx in (('cf_torso', [i for i in self.body if part_sum(W[i], ['pelvis', 'spine_0*', 'clavicle_*', 'neck_01', 'thigh_*']) >= 0.6]),
                           ('cf_arm_l', [i for i in self.body if part_sum(W[i], ['upperarm_l', 'lowerarm_l', 'clavicle_l']) >= 0.6]),
                           ('cf_arm_r', [i for i in self.body if part_sum(W[i], ['upperarm_r', 'lowerarm_r', 'clavicle_r']) >= 0.6]),
                           ('cf_head', self.head)):
            if gname not in bm.vertex_groups:
                bm.vertex_groups.new(name=gname).add(idx, 1.0, 'REPLACE')
        b = lambda n: self.bone(n).z  # noqa: E731
        self.lv = {'shoulder': b('upperarm_l') + 0.03, 'neck': b('neck_01') + 0.01, 'chest': b('spine_03'), 'waist': b('spine_01'),
                   'hip': b('pelvis'), 'crotch': b('thigh_l') - 0.06, 'knee': b('calf_l'), 'ankle': b('foot_l')}
        self.cx, self.cy = 0.0, float(np.mean([self.co[i].y for i in self.torso]))
        hc = [self.co[i] for i in self.head]
        self.head_top = max(p.z for p in hc)
        self.head_cy = float(np.mean([p.y for p in hc]))
        eyes = [self.co[v.index] for v in bm.data.vertices if 'helper-l-eye' in W[v.index] or 'helper-r-eye' in W[v.index]]
        self.eye_z = float(np.mean([p.z for p in eyes])) if eyes else self.head_top - 0.11

    def bone(self, n, tail=False):
        b = self.arm.data.bones[n]
        return self.arm.matrix_world @ (b.tail_local if tail else b.head_local)

    def level(self, spec):
        return self.lv[spec[0]] + spec[1]

    def band_pts(self, idx, z, dz=0.025):
        return [(self.co[i].x, self.co[i].y) for i in idx if abs(self.co[i].z - z) < dz]


class Builder:
    """부품을 한 bmesh 에 쌓는다. 정점마다 맞춤 무리 하나, 면마다 (UV 칸, 기준점)."""

    def __init__(self, body):
        self.B = body
        self.bm = bmesh.new()
        self.uv = self.bm.loops.layers.uv.new('UVMap')
        self.grp = {}
        self.ref = {}       # 면 → 바깥 판정 기준점(이 점에서 멀어지는 쪽이 바깥)
        self.tubes = []     # (z 목록, 반지름 목록) — 띠가 그 높이 통 둘레를 찾는다
        self.cover = []     # 지울 살 판정용 (종류, 범위)

    def vert(self, p, g):
        v = self.bm.verts.new(p)
        self.grp[v] = g
        return v

    def grid(self, rows, slot, refs, closed=True, uvs=None):
        """rows[k][s] 정점 격자 → 사각형. closed 면 둘레를 잇는다. UV 는 칸 안에서 (s/n, k/(K-1)) 또는 uvs[k] 높이."""
        u0, v0, u1, v1 = SLOTS[slot]
        K, n = len(rows), len(rows[0])
        span = n if closed else n - 1
        for k in range(K - 1):
            for s in range(span):
                s2 = (s + 1) % n
                f = self.bm.faces.new((rows[k][s], rows[k][s2], rows[k + 1][s2], rows[k + 1][s]))
                self.ref[f] = refs[k] if isinstance(refs, list) else refs
                for lp, (kk, ss) in zip(f.loops, ((k, s), (k, s + 1), (k + 1, s + 1), (k + 1, s))):
                    tv = uvs[kk] if uvs else kk / (K - 1)
                    lp[self.uv].uv = (u0 + (u1 - u0) * ss / span, v0 + (v1 - v0) * (0.02 + 0.96 * tv))

    # -- 부품 --
    def tube(self, p):
        B = self.B
        zt, zb = B.level(p['top']), B.level(p['bottom'])
        neck_top = p['top'][0] == 'neck'
        if neck_top:
            zt = B.lv['shoulder']
        z_cr = B.lv['crotch']
        NR = max(6, int((zt - zb) / 0.035) + 1)
        zs = [zb + (zt - zb) * k / (NR - 1) for k in range(NR)]
        ease = p.get('ease', 0.02) + p.get('over', 0.0)
        RR, prev, k_cr = [None] * NR, None, None
        for k in reversed(range(NR)):
            z = zs[k]
            src = B.torso if z > z_cr + 0.04 else B.torso + B.legs
            pts = B.band_pts(src, z)
            r = ring_radii(pts, B.cx, B.cy, SEG, ease) if pts else None
            if r is None:
                r = prev
            if prev is not None and (p.get('mono') or z < z_cr):
                r = np.maximum(r, prev)
            if z < z_cr and prev is not None and p.get('flare'):
                if k_cr is None:
                    k_cr = k + 1
                r = r * (1 + p['flare']) ** (1 / max(k_cr, 1))
            elif p.get('mono') and p.get('flare') and z >= z_cr and prev is not None and zb >= z_cr - 0.02:
                r = r * (1 + p['flare']) ** (1 / NR)  # 가랑이 위에서 끝나는 치마(비늘 치마)도 아래로 넓힌다
            RR[k] = prev = r
        for _ in range(2):
            RR = [RR[0]] + [(RR[k - 1] + 2 * RR[k] + RR[k + 1]) / 4 for k in range(1, NR - 1)] + [RR[-1]]
        rows, refs, ringz = [], [], []
        for k, z in enumerate(zs):
            ring = []
            below = max(0.0, (z_cr - z) / max(z_cr - zb, 1e-3))
            for s in range(SEG):
                a = 2 * math.pi * s / SEG
                fold = 1 + p.get('folds', 0.0) * below * math.sin(a * 9 + 0.7)
                ring.append(self.vert((B.cx + RR[k][s] * fold * math.cos(a), B.cy + RR[k][s] * fold * math.sin(a), z),
                                      'helper-skirt' if z < z_cr - 0.02 else 'cf_torso'))
            rows.append(ring)
            refs.append(Vector((B.cx, B.cy, z)))
            ringz.append(z)
        if neck_top:  # 어깨 → 목둘레(목 살 둘레 + 여유)
            zn = B.lv['neck']
            npts = [(B.co[i].x, B.co[i].y) for i in B.body if abs(B.co[i].z - zn) < 0.02 and B.W[i].get('neck_01', 0) > 0.3]
            ncy = float(np.mean([q[1] for q in npts]))
            rn = ring_radii(npts, B.cx, ncy, SEG, 0.018 + p.get('over', 0.0) * 0.5)
            for k in range(1, 4):
                f = k / 3
                z = zt + (zn - zt) * f
                yy = B.cy * (1 - f) + ncy * f
                ring = []
                for s in range(SEG):
                    a = 2 * math.pi * s / SEG
                    rr = RR[-1][s] * (1 - f) + rn[s] * f
                    ring.append(self.vert((B.cx + rr * math.cos(a), yy + rr * math.sin(a), z), 'cf_torso'))
                rows.append(ring)
                refs.append(Vector((B.cx, yy, z)))
                ringz.append(z)
        z0, z1 = ringz[0], ringz[-1]
        self.grid(rows, p['slot'], refs, uvs=[(z - z0) / (z1 - z0) for z in ringz])
        self.tubes.append((zs, RR))
        self.cover.append(('tube', zb, ringz[-1], neck_top))

    def sleeves(self, p):
        B = self.B
        for side in 'lr':
            S, E, Wr = B.bone(f'upperarm_{side}'), B.bone(f'lowerarm_{side}'), B.bone(f'hand_{side}')
            armv = [B.co[i] for i in B.body if part_sum(B.W[i], [f'upperarm_{side}', f'lowerarm_{side}']) >= 0.5]
            L1, L2 = (E - S).length, (Wr - E).length
            L = L1 + L2
            tend = p.get('length', 1.0) + p.get('cuff', 0.0) / L
            NT = max(4, int(16 * tend))
            down = Vector((0, 0, -1))
            rows, refs = [], []
            for k in range(NT + 1):
                t = 0.02 + (tend - 0.02) * k / NT
                d = t * L
                if d <= L1:
                    P, dirv = S + (E - S) * (d / L1), (E - S).normalized()
                else:
                    P, dirv = E + (Wr - E) * min((d - L1) / L2, 1.0) + (Wr - E).normalized() * max(d - L, 0), (Wr - E).normalized()
                v_ = down - dirv * down.dot(dirv)
                v_ = v_.normalized() if v_.length > 1e-4 else Vector((0, -1, 0))
                w_ = dirv.cross(v_)
                near = [q for q in armv if abs((q - P).dot(dirv)) < 0.025]
                r = max(((q - P) - dirv * (q - P).dot(dirv)).length for q in near) if near else 0.045
                r = min(r, 0.052 + 0.015 * min(1.0, t * 2)) + p.get('ease', 0.02) * min(1.0, 0.35 + t) + p.get('over', 0.0)
                r *= 1 + p.get('flare', 0.0) * (k / NT)
                tt = max(0.0, min(1.0, (t - 0.3) / 0.55))
                drop = p.get('drop', 0.0) * (3 * tt * tt - 2 * tt * tt * tt)
                if t > 0.85:
                    drop *= 1 - 0.5 * min(1.0, (t - 0.85) / 0.2)
                ring = []
                for s in range(SSEG):
                    ph = 2 * math.pi * s / SSEG
                    sv = math.sin(ph)
                    off = w_ * (r * 1.1 * math.cos(ph)) + v_ * (r * sv + drop * ((1 + sv) / 2) ** 2)
                    ring.append(self.vert(P + off, f'cf_arm_{side}'))
                rows.append(ring)
                refs.append(P)
            # 소매 격자는 둘레 방향이 반대(안쪽을 보게 지어진다) — 기준점으로 뒤집는다
            self.grid(rows, p['slot'], refs)
        self.cover.append(('sleeves', p.get('length', 1.0)))

    def band(self, p):
        B = self.B
        z = B.level(p['at'])
        zs, RR = next(((zs, RR) for zs, RR in reversed(self.tubes) if zs[0] <= z <= zs[-1]), self.tubes[-1])
        k = min(range(len(zs)), key=lambda i: abs(zs[i] - z))
        z = zs[k]
        rows = []
        for dz in (-p['width'] / 2, p['width'] / 2):
            ring = []
            for s in range(SEG):
                a = 2 * math.pi * s / SEG
                r = RR[k][s] + p.get('over', 0.012)
                ring.append(self.vert((B.cx + r * math.cos(a), B.cy + r * math.sin(a), z + dz), 'cf_torso'))
            rows.append(ring)
        self.grid(rows, p['slot'], Vector((B.cx, B.cy, z)))

    def _head_ring(self, z, ease, cy=None):
        B = self.B
        pts = [(B.co[i].x, B.co[i].y) for i in B.head if abs(B.co[i].z - z) < 0.012]
        return ring_radii(pts, 0.0, B.head_cy if cy is None else cy, HSEG, ease)

    def _rings(self, specs, slot, cy, group='cf_head', closed_top=False):
        """specs = [(z, 반지름 배열 또는 수)] 아래→위 → 격자. closed_top 이면 꼭대기를 작은 고리로 오므린다(사각형만 — 가운데 1mm 구멍)."""
        rows, refs = [], []
        for z, r in specs:
            rr = r if isinstance(r, np.ndarray) else np.full(HSEG, r)
            rows.append([self.vert((rr[s] * math.cos(2 * math.pi * s / HSEG), cy + rr[s] * math.sin(2 * math.pi * s / HSEG), z), group)
                         for s in range(HSEG)])
            refs.append(Vector((0, cy, z - 0.05)))
        self.grid(rows, slot, refs)

    def mangeon(self, p):
        B = self.B
        z0, z1 = B.eye_z + 0.03, B.eye_z + 0.075
        self._rings([(z, self._head_ring(z, 0.004)) for z in np.linspace(z0, z1, 4)], p['slot'], B.head_cy)

    def topknot(self, p):
        B = self.B
        cy, zt, R = B.head_cy + 0.01, B.head_top - 0.012, 0.03
        specs = []
        for k in range(9):  # 아래는 머리에 묻히고 위로 둥근 혹
            ph = -0.2 + (math.pi / 2 + 0.2) * k / 8
            specs.append((zt + R * (0.7 + math.sin(ph)), max(0.002, R * math.cos(ph))))
        self._rings(specs, p['slot'], cy)

    def gat(self, p):
        B = self.B
        cy = B.head_cy
        zb = B.eye_z + 0.075                 # 갓 양태(챙) 높이 — 망건 위
        zc = B.head_top + 0.10               # 대우(모자 통) 꼭대기
        brim = [(zb - 0.012 * (k / 5) ** 2, 0.082 + (0.21 - 0.082) * k / 5) for k in range(6)]
        # 챙은 안쪽 → 바깥 고리(높이 거의 같음). _rings 는 z 로 기준점을 잡으니 아래에서 위로 볼 기준을 따로 준다
        rows = [[self.vert((r * math.cos(2 * math.pi * s / HSEG), cy + r * math.sin(2 * math.pi * s / HSEG), z), 'cf_head')
                 for s in range(HSEG)] for z, r in brim]
        self.grid(rows, p['slot'], Vector((0, cy, zb - 0.2)))
        crown = [(zb + (zc - zb) * k / 6, 0.078 - 0.006 * k / 6) for k in range(7)] + [(zc, 0.05), (zc, 0.02), (zc, 0.002)]
        self._rings(crown, p['slot'], cy)

    def helmet(self, p):
        B = self.B
        cy = B.head_cy
        z0 = B.eye_z + 0.04
        specs = [(z, self._head_ring(z, 0.02)) for z in np.linspace(z0, B.head_top - 0.02, 5)]
        rtop = specs[-1][1]
        for k in range(1, 6):  # 둥근 윗머리
            f = k / 5
            specs.append((B.head_top - 0.02 + 0.035 * math.sin(f * math.pi / 2), rtop * math.cos(f * math.pi / 2) + 0.003))
        specs += [(B.head_top + 0.02 + 0.04 * k / 3, 0.008 - 0.002 * k) for k in range(1, 4)]  # 꼭지
        self._rings(specs, p['slot'], cy)

    def neckguard(self, p):
        B = self.B
        cy = B.head_cy + 0.01
        z0 = B.eye_z + 0.045
        r0 = self._head_ring(z0, 0.026)
        # 얼굴 앞(-Y, 각 270°) ±75° 는 튼다 — 뒤·옆만 두르는 비늘 드림
        arc = [s for s in range(HSEG) if abs(((360 * s / HSEG) - 270 + 180) % 360 - 180) > 75]
        arc.sort(key=lambda s: ((360 * s / HSEG) - 345) % 360)  # 트인 곳 바로 뒤에서 시작해야 앞을 가로지르는 면이 안 생긴다
        rows, refs = [], []
        for k in range(6):
            z = z0 - 0.13 * k / 5
            rr = r0 * (1 + 0.35 * (k / 5) ** 1.3)
            rows.append([self.vert((rr[s] * math.cos(2 * math.pi * s / HSEG), cy + rr[s] * math.sin(2 * math.pi * s / HSEG), z), 'cf_head')
                         for s in arc])
            refs.append(Vector((0, cy, z)))
        self.grid(rows[::-1], p['slot'], refs[::-1], closed=False)
        self.cover.append(('neckguard',))

    # -- 마무리 --
    def finish(self):
        for f in self.bm.faces:
            f.smooth = True
        self.bm.normal_update()
        for f, c0 in self.ref.items():
            if f.normal.dot(f.calc_center_median() - c0) < 0:
                f.normal_flip()
        me = bpy.data.meshes.new('cf_garment')
        self.bm.to_mesh(me)
        ob = bpy.data.objects.new('cf_garment', me)
        bpy.context.scene.collection.objects.link(ob)
        vg = {n: ob.vertex_groups.new(name=n) for n in sorted(set(self.grp.values()))}
        for v, g in self.grp.items():
            vg[g].add([v.index], 1.0, 'REPLACE')
        self.bm.free()
        md = ob.modifiers.new('solid', 'SOLIDIFY')  # 두께(안쪽 면) — 소매 속·단 속이 비어 보이지 않게. 사각형만 남는다
        md.thickness, md.offset, md.use_rim = 0.004, -1.0, True
        with build_real.build.ctx(ob, [ob]):
            bpy.ops.object.modifier_apply(modifier=md.name)
        return ob

    def delete_group(self):
        """옷에 덮이는 살 — 빌드가 지워 뚫림을 막는다(목·손·발·머리는 남긴다)."""
        B = self.B
        idx = []
        tubes = [c for c in self.cover if c[0] == 'tube']
        full = any(c[0] == 'sleeves' and c[1] >= 0.95 for c in self.cover)
        wz = {s: B.bone(f'hand_{s}') for s in 'lr'}
        for i in B.body:
            w, z = B.W[i], B.co[i].z
            if part_sum(w, ['pelvis', 'spine_0*', 'clavicle_*', 'thigh_*', 'calf_*']) >= 0.5:
                top_ok = lambda c: z <= (B.lv['neck'] - 0.04 if c[3] else c[2] - 0.02)  # noqa: E731
                if any(c[1] + 0.03 <= z and top_ok(c) for c in tubes):
                    idx.append(i)
            elif full and part_sum(w, ['upperarm_*', 'lowerarm_*']) >= 0.5:
                if (B.co[i] - wz['l' if B.co[i].x > 0 else 'r']).length > 0.07:
                    idx.append(i)
        g = B.bm.vertex_groups.new(name='cf_delete')
        g.add(idx, 1.0, 'REPLACE')
        return g.name, len(idx)


# ---- 천 그림 ----
def paint(g, dpath, npath):
    rng = np.random.default_rng(20260926)
    H = W = TEX
    img = np.zeros((H, W, 3), np.float32) + 128
    hgt = np.zeros((H, W), np.float32)   # 노멀 그림용 높이
    yy, xx = np.mgrid[0:H, 0:W]
    U, V = xx / W, 1 - yy / H
    noise = rng.normal(0, 1, (H, W)).astype(np.float32)
    for p in g['parts']:
        P = p['paint']
        u0, v0, u1, v1 = SLOTS[p['slot']]
        m = (U >= u0) & (U < u1) & (V >= v0) & (V < v1)
        s = (U - u0) / (u1 - u0)
        t = ((V - v0) / (v1 - v0) - 0.02) / 0.96
        base = hexrgb(P['base'])
        pat = P.get('pattern', 'weave')
        shade = np.ones((H, W), np.float32)
        h = np.zeros((H, W), np.float32)
        if pat in ('weave', 'mesh', 'hair'):
            f = 0.9 if pat == 'weave' else 0.5
            wv = np.sin(xx * f) * np.sin(yy * f)
            shade = 1 + 0.05 * wv + 0.035 * noise
            h = 0.3 * wv
            if pat == 'hair':
                shade = 1 + 0.12 * np.sin(xx * 0.35 + noise * 0.8)
                h = np.sin(xx * 0.35)
        elif pat == 'quilt':
            ln = (np.abs(((t * 40) % 1) - 0.5) < 0.06)
            shade = 1 - 0.18 * ln + 0.03 * noise
            h = -ln.astype(np.float32)
        elif pat in ('lamellar', 'plate'):
            if pat == 'plate':
                shade = 1 + 0.06 * noise * 0.4 + 0.08 * np.sin(t * 6)
                h = 0.2 * np.sin(t * 40)
            else:
                rows_, cols_ = 26, 46
                tr = t * rows_
                row = np.floor(tr)
                sc = s * cols_ + 0.5 * (row % 2)
                fu, fv = sc % 1, tr % 1
                edge = np.minimum(np.minimum(fu, 1 - fu) * 1.6, np.minimum(fv, 1 - fv))   # 판 가장자리까지 거리
                plate = np.clip(edge / 0.12, 0, 1)
                shade = 0.55 + 0.45 * plate + 0.18 * (1 - fv) * plate + 0.03 * noise   # 판 위쪽이 밝다(겹친 비늘)
                h = plate * (1 - 0.6 * fv)
        col = base[None, None, :] * shade[..., None]
        img[m] = col[m]
        hgt[m] = h[m]
        if pat == 'lamellar':  # 비늘을 꿴 끈
            holes = m & (np.abs(fu - 0.5) < 0.06) & (np.abs(fv - 0.22) < 0.07)
            img[holes] = hexrgb(P.get('lace', LACE))

        def fill(mask, colr):
            mm = m & mask
            img[mm] = hexrgb(colr) * (1 + 0.04 * noise[mm])[:, None]
            hgt[mm] = 0.4

        for tr_ in P.get('trims', []):
            k = tr_[0]
            if k == 'bottom':
                fill(t < tr_[1] * 4, tr_[2])       # 칸 높이 몫(4 = 1m 쯤)
            elif k == 'top':
                fill(t > 1 - tr_[1] * 4, tr_[2])
            elif k == 'split':                      # 앞뒤 트임 줄(비늘 치마)
                fill((np.abs(s - 0.75) < tr_[1]) | (np.abs(s - 0.25) < tr_[1]), tr_[2])
            elif k == 'cross':                      # 왼깃이 오른쪽으로 내려와 덮는다(교령 우임) — 앞 가운데 s 0.75
                wk = tr_[2] if len(tr_) > 2 else 1.0   # 너비 몫(저고리 동정은 가늘게)
                for (sa, ta), (sb, tb), wdt in (((0.70, 1.0), (0.83, 0.62), 0.022 * wk), ((0.80, 1.0), (0.755, 0.80), 0.017 * wk)):
                    q = np.clip(((s - sa) * (sb - sa) + (t - ta) * (tb - ta)) / ((sb - sa) ** 2 + (tb - ta) ** 2), 0, 1)
                    dist = np.hypot(s - (sa + q * (sb - sa)), (t - (ta + q * (tb - ta))) * 0.6)
                    fill(dist < wdt, tr_[1])
            elif k == 'ribbon':                     # 고름 — 깃 끝에서 늘어진 두 가닥
                for ds, ln in ((0.0, 0.55), (0.018, 0.45)):
                    fill((np.abs(s - (0.835 + ds)) < 0.009) & (t < 0.62) & (t > 0.62 - ln), tr_[1])
    # 노멀 그림 — 높이 기울기
    gy, gx = np.gradient(hgt)
    k = 2.0
    nx, ny = -gx * k, gy * k
    nz = np.ones_like(nx)
    ln_ = np.sqrt(nx * nx + ny * ny + nz * nz)
    nrm = np.stack([nx / ln_, ny / ln_, nz / ln_], axis=2) * 0.5 + 0.5
    for arr, path in ((np.clip(img, 0, 255) / 255.0, dpath), (nrm, npath)):
        rgba = np.concatenate([arr, np.ones((H, W, 1), np.float32)], axis=2)[::-1]   # Blender 이미지는 아래 줄부터
        im = bpy.data.images.new(os.path.basename(path), W, H, alpha=False)
        if path == npath:
            im.colorspace_settings.name = 'Non-Color'
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
    body = Body(bm, arm)
    b = Builder(body)
    for p in g['parts']:
        getattr(b, p['kind'])(p)
    dg, ndel = b.delete_group()
    ob = b.finish()
    chk = ClothesService.mesh_is_valid_as_clothes(ob, bm)
    if not chk['all_checks_ok']:
        sys.exit(f'{gid}: 옷 검사 실패 {chk}')
    name = 'cf_' + gid
    out = os.path.join(LocationService.get_user_data('clothes'), name)
    os.makedirs(out, exist_ok=True)
    tex, nrm = name + '_diffuse.png', name + '_normal.png'
    paint(g, os.path.join(out, tex), os.path.join(out, nrm))
    metal = any(p['paint'].get('pattern') in ('lamellar', 'plate') for p in g['parts'])
    mhmat = f"""# char-forge garments.py material (CC0)
name {name}
license CC0
author char-forge
diffuseColor 1.0 1.0 1.0
diffuseIntensity 1.0
diffuseTexture {tex}
normalmapTexture {nrm}
normalmapIntensity 1.0
metallic {0.35 if metal else 0.0}
roughness {0.55 if metal else 0.9}
opacity 1.0
"""
    props = dict(author='char-forge', name=name, license='CC0', description=g['desc'], homepage='',
                 uuid=str(uuid.UUID(int=random.Random(name).getrandbits(128))))
    mh = ClothesService.create_mhclo_from_clothes_matching(bm, ob, properties_dict=props, delete_group=dg if ndel else None)
    mh.material = name + '.mhmat'
    mh.tags = ','.join(g['tags'])
    mh.write_mhclo(os.path.join(out, name + '.mhclo'), reference_scale=ClothesService.get_reference_scale(bm), also_export_mhmat=True)
    open(os.path.join(out, name + '.mhmat'), 'w', encoding='utf-8', newline='\n').write(mhmat)  # material 줄만 쓰게 하고 내용은 우리 것
    print('GARMENT', gid, 'verts', len(ob.data.vertices), 'faces', len(ob.data.polygons), 'delete', ndel, '->', out)


def main():
    ids = sys.argv[sys.argv.index('--') + 1:]
    if ids == ['all']:
        ids = list(GARMENTS)
    svc = build_real.mpfb()
    for gid in ids:
        make(gid, svc)


main()
