"""char-forge 해골 몸(build_real.py kitbash `skeleton`) — MPFB 몸의 뼈대 자리·살 단면을 재서 뼈를 코드로 짓는다.

    팔다리 긴뼈(양 끝이 굵은 관, 아래팔·종아리는 두 가닥) · 손목·손바닥·손가락뼈 · 발목·발등·발가락뼈 ·
    척추(몸통 단면 뒤쪽 ⅓ 자리, 가시돌기·가로돌기) · 갈비 열둘 짝(몸통 단면을 줄인 타원, 앞으로 내려가며 복장뼈에 닿는다) ·
    골반(엉덩뼈 날개 판·엉치뼈·두덩 고리·넙다리뼈 머리) · 어깨뼈 판 · 두개골(머리 살을 떼어 목 구멍을 메우고
    눈구멍·코구멍을 파고 입술을 이 뒤로 민다 — 판 곳은 어두운 칸).

모든 조각은 한 뼈에 무게 1(굳은 뼈라 살 늘어남이 없다). 좌표: 앞 = -Y, 위 = +Z, 단위 m. 난수 없음(같은 몸이면 같은 해골).
길이 값은 키 1.75m 기준이고 `s = 키 / 1.75` 로 늘린다.
"""
import math
import bmesh
from mathutils import Vector

UP = Vector((0, 0, 1))


def _ring(bm, c, a, b, ra, rb, n):
    return [bm.verts.new(c + a * (ra * math.cos(2 * math.pi * k / n)) + b * (rb * math.sin(2 * math.pi * k / n))) for k in range(n)]


def _bridge(bm, r0, r1):
    n = len(r0)
    for k in range(n):
        bm.faces.new((r0[k], r0[(k + 1) % n], r1[(k + 1) % n], r1[k]))


class Parts:
    """조각 모음 — 정점마다 뼈 하나, 면마다 어두운 칸 여부."""

    def __init__(self):
        self.bm = bmesh.new()
        self.names = []     # 뼈 이름 — 정점 층 'bone' 에 번호로 적는다(BMVert 는 사전 키로 못 쓴다)
        self.vl = self.bm.verts.layers.int.new('bone')
        self.fl = self.bm.faces.layers.int.new('dark')  # 1 = 어두운 칸(눈구멍·코구멍·입)

    def _own(self, verts, bone):
        if bone not in self.names:
            self.names.append(bone)
        i = self.names.index(bone) + 1  # 0 = 주인 없음
        for v in verts:
            v[self.vl] = i

    def bone_of(self, v):
        if v[self.vl] == 0:
            raise RuntimeError(f'skeleton: 뼈가 안 정해진 정점 {v.index} {tuple(v.co)}')
        return self.names[v[self.vl] - 1]

    def loft(self, pts, rads, bone, n=10, axes=None, caps=True):
        """점 줄을 따라 고리를 잇는 관. rads = r 또는 (ra, rb). axes 가 없으면 비틀림 없는 틀(평행 이동)."""
        bm, rings, prev = self.bm, [], None
        m = len(pts) - 1
        for i, c in enumerate(pts):
            if axes:
                a, b = axes[i]
            else:
                tan = (pts[min(i + 1, m)] - pts[max(i - 1, 0)]).normalized()
                if prev is None:
                    ref = Vector((0, 1, 0)) if abs(tan.y) < 0.9 else Vector((1, 0, 0))
                    a = tan.cross(ref).normalized()
                else:
                    a = (prev - tan * prev.dot(tan)).normalized()
                b = tan.cross(a).normalized()
                prev = a
            r = rads[i]
            ra, rb = (r, r) if isinstance(r, (int, float)) else r
            rings.append(_ring(bm, c, a, b, ra, rb, n))
        for i in range(m):
            _bridge(bm, rings[i], rings[i + 1])
        if caps:
            bm.faces.new(list(reversed(rings[0])))
            bm.faces.new(rings[-1])
        self._own([v for r in rings for v in r], bone)

    def long_bone(self, h, t, knob, shaft, bone, seg=12, n=10, flat=1.0):
        """양 끝이 굵고 가운데가 가는 긴뼈. flat < 1 이면 한 축을 눌러 납작하게(갈비·빗장뼈)."""
        pts = [h.lerp(t, i / seg) for i in range(seg + 1)]
        rads = []
        for i in range(seg + 1):
            u = i / seg
            e = max(math.exp(-(u / 0.14) ** 2), math.exp(-((1 - u) / 0.14) ** 2))
            r = shaft + (knob - shaft) * e
            if i in (0, seg):
                r *= 0.5  # 끝을 둥글게 닫는다
            rads.append((r, r * flat))
        self.loft(pts, rads, bone, n)

    def blob(self, c, radii, bone, axes=(Vector((1, 0, 0)), Vector((0, 1, 0)), UP), sub=2):
        """축마다 반지름이 다른 둥근 덩이(관절 머리·무릎뼈·손목뼈)."""
        g = bmesh.ops.create_icosphere(self.bm, subdivisions=sub, radius=1.0)
        ax, ay, az = axes
        for v in g['verts']:
            p = v.co.copy()
            v.co = c + ax * (p.x * radii[0]) + ay * (p.y * radii[1]) + az * (p.z * radii[2])
        self._own(g['verts'], bone)

    def plate(self, pts_lo, pts_hi, thick, bone):
        """두 점 줄(아래·위 가장자리) 사이의 두께 있는 판 — 엉덩뼈 날개·어깨뼈. 단면은 긴 타원(가장자리 방향 × 두께)."""
        m = len(pts_lo) - 1
        pts, axes, rads = [], [], []
        for i in range(m + 1):
            lo, hi = pts_lo[i], pts_hi[i]
            c = (lo + hi) / 2
            along = (pts_lo[min(i + 1, m)] - pts_lo[max(i - 1, 0)]).normalized()
            a = (hi - lo)
            half = a.length / 2
            a.normalize()
            b = along.cross(a).normalized()
            pts.append(c)
            axes.append((a, b))
            rads.append((half, thick))
        self.loft(pts, rads, bone, n=12, axes=axes)


def _slice(verts, z, tol=0.012):
    sl = [v for v in verts if abs(v.z - z) < tol]
    if not sl:
        return None
    return (min(v.x for v in sl), max(v.x for v in sl), min(v.y for v in sl), max(v.y for v in sl))


def build(arm, skin, others, p):
    """→ Parts. skin = 모프를 굳힌 MPFB 몸(월드 좌표), others = 이·눈 등 다른 몸 조각."""
    MW = arm.matrix_world
    B = arm.data.bones
    H = lambda n: MW @ B[n].head_local  # noqa: E731
    T = lambda n: MW @ B[n].tail_local  # noqa: E731
    sw = skin.matrix_world
    gi = {g.name: g.index for g in skin.vertex_groups}

    def verts_of(names, minw=0.5):
        idx = {gi[n] for n in names if n in gi}
        return [sw @ v.co for v in skin.data.vertices if sum(g.weight for g in v.groups if g.group in idx) >= minw]

    zs = [(sw @ v.co).z for v in skin.data.vertices]
    s = (max(zs) - min(zs)) / 1.75
    P = Parts()
    cx = H('pelvis').x
    body = verts_of(('pelvis', 'spine_01', 'spine_02', 'spine_03', 'clavicle_l', 'clavicle_r', 'thigh_l', 'thigh_r'))
    prof = {}

    def into(q, margin):
        """점을 그 높이 몸 단면(각도 36칸마다 가장 먼 살) 안쪽 margin 까지 끌어들인다 — 마른 몸에서 골반 날개·어깨뼈가 살 밖으로 나오지 않게."""
        key = round(q.z / 0.01)
        if key not in prof:
            sl = [v for v in body if abs(v.z - key * 0.01) < 0.012]
            if not sl:
                prof[key] = None
            else:
                # 좌우를 접어(|dx|) 18 칸 — 몸이 좌우 같으니 끌어들인 자리도 좌우 같다
                c = Vector((cx, sum(v.y for v in sl) / len(sl), 0))
                rad = [0.0] * 18
                for v in sl:
                    k = min(17, int(math.atan2(abs(v.x - cx), v.y - c.y) / math.pi * 18))
                    rad[k] = max(rad[k], math.hypot(v.x - cx, v.y - c.y))
                for k in range(18):  # 빈 칸은 이웃 값
                    if rad[k] == 0:
                        rad[k] = max(rad[max(k - 1, 0)], rad[min(k + 1, 17)])
                prof[key] = (c, rad)
        if prof[key] is None:
            return q
        c, rad = prof[key]
        d = Vector((q.x - c.x, q.y - c.y, 0))
        k = min(17, int(math.atan2(abs(d.x), d.y) / math.pi * 18))
        lim = min(rad[k], rad[max(k - 1, 0)], rad[min(k + 1, 17)]) - margin
        if d.length > lim > 0:
            d = d.normalized() * lim
            return Vector((c.x + d.x, c.y + d.y, q.z))
        return q

    # ── 팔다리 ────────────────────────────────────────────────────────────
    for sd in ('l', 'r'):
        sx = 1.0 if H(f'thigh_{sd}').x > cx else -1.0
        out = Vector((sx, 0, 0))
        # 빗장뼈(가슴 위 → 어깨), 위팔뼈, 아래팔 두 가닥
        P.long_bone(H(f'clavicle_{sd}'), H(f'upperarm_{sd}'), 0.010 * s, 0.006 * s, f'clavicle_{sd}', flat=0.75)
        sh, el, wr = H(f'upperarm_{sd}'), H(f'lowerarm_{sd}'), H(f'hand_{sd}')
        P.blob(sh, (0.021 * s,) * 3, f'upperarm_{sd}')
        P.long_bone(sh, el, 0.020 * s, 0.0095 * s, f'upperarm_{sd}')
        fa = (wr - el).normalized()
        side = fa.cross(UP).normalized()
        if side.dot(out) < 0:
            side = -side
        for off, kn, sh_ in ((-0.009, 0.010, 0.0055), (0.010, 0.012, 0.0060)):  # 노뼈(엄지 쪽)·자뼈
            o = side * (off * s)
            P.long_bone(el + o + fa * 0.004 * s, wr + o * 0.8, kn * s, sh_ * s, f'lowerarm_{sd}')
        # 손: 손목뼈 한 줄 · 손바닥뼈 · 손가락뼈 셋(엄지 둘)
        fing = ('index', 'middle', 'ring', 'pinky')
        base = [H(f'{f}_01_{sd}') for f in fing]
        across = (base[0] - base[3]).normalized()
        mid = sum(base, Vector()) / 4
        carp = wr.lerp(mid, 0.38)
        for k in range(4):
            P.blob(carp + across * ((k - 1.5) * 0.0085 * s), (0.0055 * s, 0.0055 * s, 0.0045 * s), f'hand_{sd}', sub=1)
        for f, b0 in zip(fing, base):
            P.long_bone(wr.lerp(b0, 0.42), b0, 0.0058 * s, 0.0034 * s, f'hand_{sd}', seg=8, n=8)
            chain = [H(f'{f}_01_{sd}'), H(f'{f}_02_{sd}'), H(f'{f}_03_{sd}')]
            chain.append(chain[2].lerp(T(f'{f}_03_{sd}'), 0.8))  # 끝마디는 손끝 살 안에서 멈춘다
            for i in range(3):
                kn = (0.0054, 0.0047, 0.0040)[i] * s
                P.long_bone(chain[i], chain[i + 1], kn, kn * 0.62, f'{f}_0{i + 1}_{sd}', seg=6, n=8)
        th = [H(f'thumb_01_{sd}'), H(f'thumb_02_{sd}'), H(f'thumb_03_{sd}'), T(f'thumb_03_{sd}')]
        for i in range(3):
            kn = (0.0062, 0.0056, 0.0046)[i] * s
            P.long_bone(th[i], th[i + 1], kn, kn * 0.6, f'thumb_0{i + 1}_{sd}', seg=6, n=8)

        # 다리: 넙다리뼈(머리·큰돌기) · 무릎뼈 · 정강뼈·종아리뼈
        hip, kn_, an = H(f'thigh_{sd}'), H(f'calf_{sd}'), H(f'foot_{sd}')
        P.blob(hip, (0.023 * s,) * 3, f'thigh_{sd}')
        P.blob(into(hip + out * 0.03 * s + Vector((0, 0.005, -0.03)) * s, 0.02 * s), (0.015 * s, 0.015 * s, 0.019 * s), f'thigh_{sd}')
        neck_end = hip + out * 0.03 * s + Vector((0, 0, -0.035)) * s
        P.long_bone(hip, neck_end, 0.017 * s, 0.013 * s, f'thigh_{sd}', seg=4)
        P.long_bone(neck_end, kn_ + Vector((0, 0, 0.012)) * s, 0.027 * s, 0.0135 * s, f'thigh_{sd}')
        P.blob(kn_ + Vector((0, -0.036, 0.01)) * s, (0.02 * s, 0.009 * s, 0.023 * s), f'calf_{sd}')
        P.long_bone(kn_ - Vector((0, 0, 0.004)) * s, an + Vector((0, 0, 0.012)) * s, 0.026 * s, 0.0115 * s, f'calf_{sd}')
        P.long_bone(kn_ + out * 0.024 * s + Vector((0, 0.008, -0.03)) * s, an + out * 0.02 * s + Vector((0, 0.006, 0.0)) * s,
                    0.009 * s, 0.0052 * s, f'calf_{sd}')
        # 발: 목말뼈·발꿈치뼈·발목뼈 덩이 · 발허리뼈 다섯 · 발가락뼈
        ball, toe = H(f'ball_{sd}'), T(f'ball_{sd}')
        P.blob(an + Vector((0, 0, -0.014)) * s, (0.017 * s, 0.021 * s, 0.013 * s), f'foot_{sd}')
        heel = Vector((an.x, an.y + 0.048 * s, 0.013 * s))
        P.long_bone(an + Vector((0, 0.004, -0.024)) * s, heel, 0.02 * s, 0.015 * s, f'foot_{sd}', seg=6)
        P.blob(an.lerp(ball, 0.36) + Vector((0, 0, -0.012)) * s, (0.024 * s, 0.028 * s, 0.012 * s), f'foot_{sd}')
        fwd = (toe - ball)
        fwd.z = 0
        fwd.normalize()
        med = -out  # 엄지발가락이 안쪽
        for i, off in enumerate((0.030, 0.015, 0.002, -0.011, -0.023)):
            q = ball + med * (off * s) + Vector((0, 0, 0.013 * s - ball.z * 0.3))
            b0 = an.lerp(ball, 0.44) + med * (off * 0.55 * s) + Vector((0, 0, -0.004)) * s
            big = i == 0
            P.long_bone(b0, q, (0.009 if big else 0.0065) * s, (0.0058 if big else 0.0038) * s, f'foot_{sd}', seg=8, n=8)
            L = (0.042 if big else 0.032 - 0.003 * i) * s
            segs = 2 if big else 3
            prev = q
            for j in range(segs):
                nxt = prev + fwd * (L / segs) + Vector((0, 0, -0.002 * s))
                kn2 = (0.0078 if big else 0.0046 - 0.0003 * j) * s
                P.long_bone(prev, nxt, kn2, kn2 * 0.65, f'ball_{sd}', seg=4, n=8)
                prev = nxt

    # ── 척추 ──────────────────────────────────────────────────────────────
    # 가운데 줄 살(뼈 무리 무관 — 가슴 앞 살은 몸통 무리 무게가 0.5 가 안 돼 빠졌다). 목 높이는 턱이 앞에 걸리니 머리 무리는 뺀다
    torso = verts_of(('pelvis', 'spine_01', 'spine_02', 'spine_03'))
    headv = {gi['head']} if 'head' in gi else set()
    mid = [sw @ v.co for v in skin.data.vertices if abs((sw @ v.co).x - cx) < 0.05
           and sum(g.weight for g in v.groups if g.group in headv) < 0.5]
    z_neck, z_head = H('neck_01').z, H('head').z
    hipz = H('thigh_l').z

    def vert_y(z):
        """척추뼈 몸통 자리 = 등 살에서 안으로(허리 6.5·가슴 5.8·목 4.8cm, 키에 비례), 앞 살보다는 2cm 뒤.
        가운데 줄 정점이 성긴 높이가 있어(가슴 1.28m 는 가운데 3cm 안에 등 정점이 없었다 → 앞 살을 등으로 알아
        척추뼈가 가슴 앞에 섰다) 창을 넓히고, 앞뒤가 다 잡힐 때까지 높이 창을 키운다."""
        for tol in (0.015, 0.025, 0.04, 0.06):
            sl = [v for v in mid if abs(v.z - z) < tol]
            if sl and max(v.y for v in sl) - min(v.y for v in sl) > 0.06 * s:
                break
        back, front = max(v.y for v in sl), min(v.y for v in sl)
        d = (0.048 if z >= z_neck - 0.01 else 0.058 if z > H('spine_02').z else 0.065) * s
        return max(back - d, min(front + 0.02 * s, back - 0.02 * s)), back

    def spine_bone(z):
        for nm in ('head', 'neck_01', 'spine_03', 'spine_02', 'spine_01'):
            if z >= H(nm).z:
                return nm
        return 'pelvis'

    z0, z1 = hipz + 0.085 * s, z_head - 0.012 * s
    step = 0.026 * s
    nv = max(2, int((z1 - z0) / step))
    for i in range(nv + 1):
        z = z0 + (z1 - z0) * i / nv
        vy, back = vert_y(z)
        c = Vector((cx, vy, z))
        cerv = z >= z_neck - 0.01
        r = (0.011 if cerv else 0.014 if z > H('spine_02').z else 0.018) * s
        hgt = (0.012 if cerv else 0.016) * s
        bn = spine_bone(z)
        P.loft([c - UP * hgt / 2, c, c + UP * hgt / 2], [(r * 0.8, r * 0.7), (r, r * 0.85), (r * 0.8, r * 0.7)], bn,
               n=10, axes=[(Vector((1, 0, 0)), Vector((0, 1, 0)))] * 3)
        tip = Vector((cx, back - 0.013 * s, z - (0.006 if cerv else 0.016) * s))
        P.long_bone(c + Vector((0, r * 0.7, 0)), tip, 0.0045 * s, 0.0032 * s, bn, seg=5, n=6)
        tw = (0.020 if cerv else 0.026 if z > H('spine_02').z else 0.032) * s
        for sx in (-1, 1):
            P.long_bone(c + Vector((sx * r * 0.7, r * 0.3, 0)), c + Vector((sx * tw, r * 0.9, 0.002 * s)),
                        0.0042 * s, 0.003 * s, bn, seg=4, n=6)

    # ── 갈비·복장뼈 ─────────────────────────────────────────────────────────
    cage = verts_of(('spine_02', 'spine_03'))
    # 첫 갈비 등 끝 = 빗장뼈 안쪽 끝보다 조금 위(이 뼈대의 neck_01 은 목 가운데라 거기서 재면 목·턱 단면이 잡혔다)
    z_top = H('clavicle_l').z + 0.02 * s
    z_bot = z_top - 0.27 * s
    fronts = []
    for k in range(12):
        zk = z_top + (z_bot - z_top) * k / 11
        sl = _slice(cage, zk - 0.02 * s) or _slice(cage, zk)
        x0, x1, y0, y1 = sl
        hx = max(abs(x0 - cx), abs(x1 - cx))
        fk = (0.62, 0.76, 0.86, 0.9)[min(k, 3)]
        a = hx * fk - 0.012 * s
        yf, yb = y0 + 0.016 * s, y1 - 0.024 * s
        cy, b = (yf + yb) / 2, (yb - yf) / 2
        vy, _ = vert_y(zk)
        drop = (0.03 + 0.055 * min(1.0, k / 4)) * s
        psi_end = math.pi * (0.93 if k < 7 else 0.86 if k < 10 else 0.62)
        bn = 'spine_03' if zk >= H('spine_03').z else 'spine_02'
        for sx in (-1, 1):
            pts = [Vector((cx + sx * 0.013 * s, vy + 0.004 * s, zk))]
            N = 16
            for j in range(N + 1):
                psi = 0.28 + (psi_end - 0.28) * j / N
                u = (psi - 0.28) / (math.pi - 0.28)
                pts.append(Vector((cx + sx * a * math.sin(psi), cy + b * math.cos(psi), zk - drop * u + 0.006 * s * math.sin(u * math.pi))))
            if k < 7:
                end = Vector((cx + sx * 0.014 * s, yf - 0.002 * s, pts[-1].z - 0.004 * s))
                pts.append(pts[-1].lerp(end, 0.5))
                pts.append(end)
                if sx == 1:
                    fronts.append(end)
            rr = (0.0048 if k < 10 else 0.0038) * s
            P.loft(pts, [(rr * 0.55 if j in (0, len(pts) - 1) else rr, rr * 0.6) for j in range(len(pts))], bn, n=8)
    top = fronts[0] + Vector((0, 0, 0.022 * s))
    bot = fronts[-1] + Vector((0, 0, -0.03 * s))
    stern = [top.lerp(bot, i / 8) for i in range(9)]
    fz = sorted(fronts, key=lambda f: f.z)
    for q in stern:  # 높이마다 갈비 앞끝 깊이를 따라간다(위 가슴은 얕다)
        q.x = cx
        lo_ = max([f for f in fz if f.z <= q.z] or fz[:1], key=lambda f: f.z)
        hi_ = min([f for f in fz if f.z >= q.z] or fz[-1:], key=lambda f: f.z)
        t = 0.0 if hi_.z == lo_.z else (q.z - lo_.z) / (hi_.z - lo_.z)
        q.y = lo_.y + (hi_.y - lo_.y) * t + 0.002 * s
    P.loft(stern, [(0.016 * s * (0.6 if i in (0, 8) else 1.0), 0.0055 * s) for i in range(9)], 'spine_03', n=10,
           axes=[(Vector((1, 0, 0)), Vector((0, 1, 0)))] * 9)

    # ── 어깨뼈 ──────────────────────────────────────────────────────────────
    for sd in ('l', 'r'):
        sx = 1.0 if H(f'upperarm_{sd}').x > cx else -1.0
        sh = H(f'upperarm_{sd}')
        zt, zb = sh.z + 0.005 * s, sh.z - 0.15 * s
        lo, hi = [], []
        for i in range(7):
            z = zt + (zb - zt) * i / 6
            sl = _slice(cage + verts_of((f'clavicle_{sd}',)), z)
            back = sl[3] if sl else sh.y + 0.08 * s
            w = 0.075 * s * (1 - 0.75 * (i / 6) ** 1.4)
            xm = cx + sx * (0.075 * s + 0.01 * s * i / 6)
            lo.append(Vector((xm, back - 0.013 * s, z)))
            hi.append(Vector((xm + sx * w, back - 0.017 * s - 0.01 * s * (1 - i / 6), z)))
        lo, hi = [into(q, 0.01 * s) for q in lo], [into(q, 0.01 * s) for q in hi]
        P.plate(lo, hi, 0.0045 * s, f'clavicle_{sd}')
        P.long_bone(lo[1] + Vector((0, 0.004, 0)) * s, into(sh + Vector((0, 0.022, 0.012)) * s, 0.012 * s), 0.008 * s, 0.005 * s, f'clavicle_{sd}',
                    flat=0.6)

    # ── 골반 ──────────────────────────────────────────────────────────────
    jl, jr = H('thigh_l'), H('thigh_r')
    jx = abs(jl.x - cx)
    cyp = (jl.y + jr.y) / 2 + 0.012 * s
    zc = hipz + 0.09 * s
    _, back_c = vert_y(zc)
    for sx in (-1, 1):
        lo, hi = [], []
        for i in range(10):
            psi = 0.22 * math.pi + 0.6 * math.pi * i / 9
            rb = 0.062 * s
            lo.append(Vector((cx + sx * (jx + 0.004 * s) * (0.55 + 0.45 * math.sin(psi)), cyp + rb * 0.7 * math.cos(psi), hipz + 0.022 * s)))
            hi.append(Vector((cx + sx * (jx + 0.03 * s) * (0.5 + 0.5 * math.sin(psi)), cyp + rb * math.cos(psi),
                              zc - 0.02 * s * abs(math.cos(psi)))))
        P.plate([into(q, 0.012 * s) for q in lo], [into(q, 0.012 * s) for q in hi], 0.0065 * s, 'pelvis')
        # 두덩·궁둥 고리(엉덩 관절 → 궁둥뼈 결절 → 두덩 결합 → 엉덩 관절)
        j = jl if sx * (jl.x - cx) > 0 else jr
        loop = [j + Vector((-sx * 0.012, -0.01, -0.012)) * s, j + Vector((-sx * 0.012, 0.02, -0.06)) * s,
                Vector((cx + sx * 0.03 * s, j.y + 0.0 * s, j.z - 0.085 * s)), Vector((cx + sx * 0.006 * s, j.y - 0.045 * s, j.z - 0.05 * s)),
                Vector((cx + sx * 0.03 * s, j.y - 0.05 * s, j.z - 0.02 * s)), j + Vector((-sx * 0.014, -0.028, -0.004)) * s]
        pts = []
        for i in range(len(loop) - 1):
            for t in range(4):
                pts.append(loop[i].lerp(loop[i + 1], t / 4))
        pts.append(loop[-1])
        P.loft(pts, [0.0085 * s] * len(pts), 'pelvis', n=8)
        P.blob(j + Vector((-sx * 0.006, 0, 0.004)) * s, (0.027 * s, 0.027 * s, 0.027 * s), 'pelvis', sub=2)  # 볼기뼈 절구
    sac = [into(Vector((cx, back_c - 0.04 * s + 0.01 * s * i / 6, zc + 0.01 * s - (0.18 * s) * i / 6)), 0.02 * s) for i in range(7)]
    P.loft(sac, [(0.048 * s * (1 - 0.7 * i / 6), 0.012 * s * (1 - 0.3 * i / 6)) for i in range(7)], 'pelvis', n=10,
           axes=[(Vector((1, 0, 0)), Vector((0, 1, 0)))] * 7)
    return P, s


def skull(P, arm, skin, eyes, teeth, s):
    """머리 살을 떼어 두개골로 — 목 구멍 메우기 · 귀 눌러 붙이기 · 눈구멍 · 코구멍 · 입술을 이 뒤로(입 틈은 어두운 칸)."""
    sw = skin.matrix_world
    gi = {g.name: g.index for g in skin.vertex_groups}
    bm = bmesh.new()
    bm.from_mesh(skin.data)
    dl = bm.verts.layers.deform.active
    hi_ = gi['head']
    drop = [f for f in bm.faces if not all(v[dl].get(hi_, 0) >= 0.5 for v in f.verts)]
    bmesh.ops.delete(bm, geom=drop, context='FACES_ONLY')
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
    for v in bm.verts:
        v.co = sw @ v.co
    bmesh.ops.holes_fill(bm, edges=[e for e in bm.edges if e.is_boundary], sides=0)
    bm.normal_update()
    ev = [eyes.matrix_world @ v.co for v in eyes.data.vertices]
    cx = sum(v.x for v in ev) / len(ev)
    E = []
    for sx in (-1, 1):
        sv = [v for v in ev if (v.x - cx) * sx > 0]
        E.append(Vector([sum(v[i] for v in sv) / len(sv) for i in range(3)]))
    re = (max(v.x for v in ev) - min(v.x for v in ev)) / 4  # 눈알 반지름쯤
    eye_front = min(v.y for v in ev)
    # 귀: 옆 평면(같은 높이 귀 아닌 머리 살의 가장 바깥)까지 눌러 붙인다
    ear = gi.get('ears')
    if ear is not None:
        others = [v.co for v in bm.verts if v[dl].get(ear, 0) < 0.3]
        for v in bm.verts:
            if v[dl].get(ear, 0) >= 0.3:
                sl = [o for o in others if abs(o.z - v.co.z) < 0.01 and (o.x - cx) * (v.co.x - cx) > 0]
                side = max((abs(o.x - cx) for o in sl), default=abs(v.co.x - cx))
                if abs(v.co.x - cx) > side:
                    v.co.x = cx + math.copysign(side, v.co.x - cx)
    # 입술을 이 앞면 조금 뒤로 민다 → 이가 드러나고, 입술 자리는 어두운 틈
    lips = gi.get('lips')
    tv = [teeth.matrix_world @ v.co for v in teeth.data.vertices] if teeth else []
    tfront = min(v.y for v in tv) if tv else None
    dk = bm.verts.layers.int.new('dk')  # 1 = 어두운 칸 정점
    if lips is not None and tfront is not None:
        for v in bm.verts:
            if v[dl].get(lips, 0) >= 0.5:
                if v.co.y < tfront + 0.004 * s:
                    v.co.y = tfront + 0.004 * s
                v[dk] = 1
    # 눈구멍: 눈 둘레를 뒤로 판다(가운데일수록 깊게)
    R, depth = 1.6 * re, 1.9 * re
    for v in bm.verts:
        for e in E:
            d = math.hypot(v.co.x - e.x, (v.co.z - e.z) * 1.1)
            if d < R and v.co.y < e.y + 0.012 * s:
                v.co.y += depth * (1 - (d / R) ** 2)
                if d < 0.82 * R:
                    v[dk] = 1
    # 코: 눈 앞면보다 튀어나온 코를 눌러 평평하게, 가운데 좁은 곳은 어두운 코구멍
    ez = (E[0].z + E[1].z) / 2
    for v in bm.verts:
        dx, dz = abs(v.co.x - cx), ez - v.co.z
        if dx < 1.5 * re and 0.5 * re < dz < 3.3 * re and v.co.y < eye_front:
            v.co.y = max(v.co.y, eye_front + 0.002 * s)
            if dx < 0.8 * re and 1.3 * re < dz < 3.1 * re:
                v[dk] = 1
    # 살 두께만큼 안으로 조금
    bm.normal_update()
    for v in bm.verts:
        v.co -= v.normal * 0.003 * s
    # P.bm 으로 옮긴다
    remap = {}
    for v in bm.verts:
        nv = P.bm.verts.new(v.co)
        remap[v] = nv
    P._own(list(remap.values()), 'head')
    for f in bm.faces:
        try:
            nf = P.bm.faces.new([remap[v] for v in f.verts])
        except ValueError:
            continue
        if all(v[dk] for v in f.verts):
            nf[P.fl] = 1
    bm.free()
