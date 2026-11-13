# Pentes por modelo (08/11, pedido dele: "referentes a cada modelo de arma, sem nada quadrado").
# Roda em fundo: E:\Blender\blender.exe -b --factory-startup --python tools/blender/comic_mags.py
# Le tools/blender/mags-input.json (medidas do pente original de cada arma: largura, altura, profundidade e linha central) e
# cria 2 pentes por arma, curto e longo, seguindo a MESMA curva e a mesma boca do original (por isso nao avanca no gatilho).
# Uma malha fechada por pente, sem faces sobrepostas: frisos e base saem do proprio contorno.
# Saida: public/models/src/comic/mags.glb, objetos cmag_<corpo>_1 (curto) e cmag_<corpo>_2 (longo), nas coordenadas do corpo.
import bpy, bmesh, json, math, os, random
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
OUT = os.path.join(ROOT, 'public', 'models', 'src', 'comic', 'mags.glb')
DATA = json.load(open(os.path.join(HERE, 'mags-input.json'), encoding='utf-8'))
for o in list(bpy.data.objects): bpy.data.objects.remove(o, do_unlink=True)
MAT = bpy.data.materials.new('body')
N_RING = 18

def ring(cx, cy, cz, hw, hd, n=3.2, axis='y', ny=0.0, nz=1.0):  # contorno superelipse (canto bem redondo); gl -> blender: (x, -z, y). axis 'x' = pente de lado (09/11)
    pts = []
    for i in range(N_RING):
        a = i / N_RING * math.tau
        c, s = math.cos(a), math.sin(a)
        u, v = hw * math.copysign(abs(c) ** (2 / n), c), hd * math.copysign(abs(s) ** (2 / n), s)
        pts.append((cx, -(cz + v), cy + u) if axis == 'x' else (cx + u, -cz, cy + v) if axis == 'z' else (cx + u, -(cz + v * nz), cy + v * ny))  # 13/11: 'z' = tubo ao longo do cano (Caracol/Bizon)  # 09/11: anel de lado com a inclinacao do pente
    return pts

def center(M, t):  # linha central do original (t = 0 boca, 1 fundo do original; passa de 1 no pente longo seguindo a tangente)
    t0, t1, t2 = M['top'], M['mid'], M['bot']
    if t <= 1:
        a, b, c = (1 - t) ** 2, 2 * t * (1 - t), t * t
        ctrl = [2 * t1[k] - 0.5 * (t0[k] + t2[k]) for k in range(3)]
        return [a * t0[k] + b * ctrl[k] + c * t2[k] for k in range(3)]
    d = [3 * t2[k] - 4 * t1[k] + t0[k] for k in range(3)]  # 09/11: tangente real da curva em t=1 (a antiga fazia uma dobra na malha)
    return [t2[k] + d[k] * (t - 1) for k in range(3)]

# 6 modelos por arma, todos nascem da linha central e da boca do pente ORIGINAL daquela arma (mags-input.json):
# 1 curto, 2 estendido com frisos, 3 sapata (base larga e reforcada), 4 garrafa (barriga no meio), 5 costelado (frisos fundos), 6 cunha (afunila pra baixo, bem longo)
STYLES = {
    1: dict(span=0.72, n=3.2, ribs=1, rib=0.045, belly=0.0, flare=1.14, wedge=0.0),
    2: dict(span=1.3, n=3.2, ribs=2, rib=0.045, belly=0.0, flare=1.14, wedge=0.0),
    3: dict(span=1.0, n=2.5, ribs=0, rib=0.0, belly=0.0, flare=1.42, wedge=0.0, shoe=True),
    4: dict(span=1.0, n=4.0, ribs=0, rib=0.0, belly=0.2, flare=1.1, wedge=0.0),
    5: dict(span=1.12, n=2.3, ribs=6, rib=0.075, belly=0.0, flare=1.16, wedge=0.0),
    6: dict(span=1.5, n=3.6, ribs=1, rib=0.04, belly=0.0, flare=1.08, wedge=0.22),
}

def build(body, M, kind):
    S = STYLES[kind]
    rnd = random.Random(body + str(kind))
    span = S['span']
    if M.get('axis') == 'z': span = 0.72 + (span - 0.72) * 0.68  # 13/11: tubo embaixo do cano (Caracol) nao passa da boca
    taper = rnd.uniform(0.9, 0.97) - S['wedge']
    if S['ribs'] == 1: ribs = [rnd.uniform(0.42, 0.6)]
    elif S['ribs'] == 2: ribs = [rnd.uniform(0.3, 0.42), rnd.uniform(0.58, 0.72)]
    elif S['ribs'] == 0: ribs = []
    else: ribs = [0.12 + 0.12 * i + rnd.uniform(-0.01, 0.01) for i in range(S['ribs'])]
    stations = sorted(set([0, 0.04, 0.5, 0.86, 0.9, 0.96, 1.0] + [round(i / 14, 3) for i in range(1, 14)] + [r + e for r in ribs for e in (-0.018, 0.0, 0.018)]))
    flare = S['flare'] * rnd.uniform(0.98, 1.04)
    bm = bmesh.new(); prev = None; first = None
    hw0, hd0 = M['w'] / 2, M['d'] / 2
    for s in stations:
        c = center(M, s * span)
        k = 1 + (taper - 1) * s
        k *= 1 + S['belly'] * math.sin(math.pi * min(1, s / 0.86)) if s < 0.86 else 1
        for r in ribs:
            if abs(s - r) < 0.019: k *= 1 + S['rib'] * (1 - abs(s - r) / 0.019)
        if s >= 0.86: k *= flare if s < 1 else flare * 0.9
        if 0.86 <= s < 0.9: k = (1 + (taper - 1) * s)
        kw, kd = k, k
        if S.get('shoe') and s >= 0.86: kw, kd = k * 1.0, k * 1.08  # sapata: mais funda que larga, pra nao bater no cabo
        # 09/11 (print dele: precisa de pente angulado): o anel fica perpendicular a linha do pente, igual ao original
        a0, b0 = center(M, max(0, s * span - 0.02)), center(M, s * span + 0.02)
        ty, tz = b0[1] - a0[1], b0[2] - a0[2]; L = math.hypot(ty, tz) or 1.0
        ny, nz = -tz / L, ty / L
        if nz < 0: ny, nz = -ny, -nz
        if M.get('axis', 'y') in ('x', 'z'): ny, nz = 0.0, 1.0
        vs = [bm.verts.new(p) for p in ring(c[0], c[1], c[2], hw0 * kw, hd0 * kd * max(0.6, nz), S['n'], M.get('axis', 'y'), ny, nz)]
        if prev:
            for i in range(N_RING): bm.faces.new((prev[i], prev[(i + 1) % N_RING], vs[(i + 1) % N_RING], vs[i]))
        else: first = vs
        prev = vs
    bm.faces.new(list(reversed(first))); bm.faces.new(prev)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new('cmag_%s_%d' % (body, kind)); bm.to_mesh(me); bm.free()
    me.materials.append(MAT)
    for p in me.polygons: p.use_smooth = True
    o = bpy.data.objects.new(me.name, me); bpy.context.scene.collection.objects.link(o)
    return o

# tambor (09/11, pedido dele): gargalo que entra no poco + disco deitado com miolo, sulco e aba, uma malha so. lobes > 0 = ressaltos em volta (Pipoqueira)
def drum(name, neck, cx, cy, cz, r, half, nw, nd, lobes=0):
    bm = bmesh.new()
    prev = first = None
    for c in neck + [(cx, cy, cz)]:
        vs = [bm.verts.new(p) for p in ring(c[0], c[1], c[2], nw, nd, 3.0)]
        if prev:
            for i in range(N_RING): bm.faces.new((prev[i], prev[(i + 1) % N_RING], vs[(i + 1) % N_RING], vs[i]))
        else: first = vs
        prev = vs
    bm.faces.new(list(reversed(first))); bm.faces.new(prev)
    SEG = 56 if lobes else 32
    hub = half * 1.09
    prof = [(-hub, 0.13), (-hub, 0.2), (-half * 0.98, 0.22), (-half, 0.5), (-half * 0.84, 0.56), (-half * 0.84, 0.82), (-half, 0.88), (-half * 0.94, 1.0), (half * 0.94, 1.0), (half, 0.88), (half * 0.84, 0.82), (half * 0.84, 0.56), (half, 0.5), (half * 0.98, 0.22), (hub, 0.2), (hub, 0.13)]
    rings = []
    for x, k in prof:
        row = []
        for i in range(SEG):
            f = i / SEG * math.tau
            bump = 1.0 + (0.075 if lobes and k >= 0.82 and math.cos(lobes * f) > 0.25 else 0.0)
            row.append(bm.verts.new((cx + r * k * bump * math.sin(f), -(cz + x), cy + r * k * bump * math.cos(f))))  # 09/11 (pedido dele): de frente, o disco olha pra boca do cano
        rings.append(row)
    for p, q in zip(rings, rings[1:]):
        for i in range(SEG): bm.faces.new((p[i], p[(i + 1) % SEG], q[(i + 1) % SEG], q[i]))
    c0, c1 = bm.verts.new((cx, -(cz - hub), cy)), bm.verts.new((cx, -(cz + hub), cy))
    for i in range(SEG):
        bm.faces.new((c0, rings[0][(i + 1) % SEG], rings[0][i])); bm.faces.new((c1, rings[-1][i], rings[-1][(i + 1) % SEG]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free(); me.materials.append(MAT)
    for p in me.polygons: p.use_smooth = True
    bpy.context.scene.collection.objects.link(bpy.data.objects.new(name, me))

# pente curvo com grade (09/11, foto dele): arco de circulo igual ao pente original, nervuras na lateral e aneis. Medidas tiradas do pente de fabrica
CURVED = { 'fusil_13': dict(cx=-0.0447, w=0.0655, d=0.195, d2=0.155, y0=0.185, z0=0.07, R=0.733, th=0.827) }
CURVE_SPAN = { 1: 0.72, 5: 0.9, 3: 1.06, 2: 1.28, 4: 1.45, 6: 1.7 }  # o numero do modelo guarda o atributo (CMAG_STATS); o tamanho cresce junto com as balas
SIDE_V = [-0.9, -0.5, -0.44, -0.26, -0.2, 0.2, 0.26, 0.44, 0.5, 0.9]
def curved(body, C, kind):
    span = CURVE_SPAN[kind]; R = C['R'] * span; th = C['th']; L = R * th
    slim = {4: 0.84, 6: 0.78}.get(kind, 1.0)  # 09/11 (pedido dele): Extra e Gigante mais finos
    bands = max(3, int(round(L / 0.1)))
    ribs = [0.14 + j * (0.74 / (bands - 1)) for j in range(bands)]
    st = sorted(set([0.0, 0.06, 0.11, 0.9, 0.935, 0.95, 0.985, 1.0] + [round(r + e, 4) for r in ribs for e in (-0.02, -0.011, 0.011, 0.02)]))
    bm = bmesh.new(); prev = first = None
    def loop(rv):  # contorno: lateral, frente, lateral, tras. rv = nervura na lateral
        side = lambda v: 1.17 if rv and 0.25 < abs(v) < 0.45 else 1.0
        return [(side(v), v) for v in SIDE_V] + [(0.72, 1.0), (0.0, 1.04), (-0.72, 1.0)] + [(-side(v), v) for v in reversed(SIDE_V)] + [(-0.72, -1.0), (0.0, -1.04), (0.72, -1.0)]
    for s in st:
        a = th * s
        hd0 = C['d'] / 2 + (C['d2'] * slim / 2 - C['d'] / 2) * min(1.0, s / 0.2)
        k = 1.0
        for r in ribs:
            if abs(s - r) < 0.0115: k = 1.055
        if s >= 0.95: k = 1.12
        elif s >= 0.935: k = 1.03
        rv = 0.1 < s < 0.92
        vs = []
        for u, v in loop(rv):
            rr = R + v * hd0 * k
            x, y, z = C['cx'] + u * C['w'] / 2 * k * (slim + (1 - slim) * 0.4), C['y0'] - rr * math.sin(a), C['z0'] - R + rr * math.cos(a)
            vs.append(bm.verts.new((x, -z, y)))
        if prev:
            n = len(vs)
            for i in range(n): bm.faces.new((prev[i], prev[(i + 1) % n], vs[(i + 1) % n], vs[i]))
        else: first = vs
        prev = vs
    bm.faces.new(list(reversed(first))); bm.faces.new(prev)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new('cmag_%s_%d' % (body, kind)); bm.to_mesh(me); bm.free(); me.materials.append(MAT)
    for p in me.polygons: p.use_smooth = True
    bpy.context.scene.collection.objects.link(bpy.data.objects.new(me.name, me))

n = 0
for body, M in DATA.items():
    for kd in STYLES:
        if body in CURVED: curved(body, CURVED[body], kd)
        else: build(body, M, kd)
        n += 1
if 'pistol_2' in DATA:  # Pipoqueira: encostado no fundo do cabo (y -0,414) e centrado no pente, sem entrar nele
    M = DATA['pistol_2']; r = M['w'] * 1.9; bx, by, bz = M['bot']
    drum('pdrum', [tuple(M['top']), (bx, -0.3, (M['top'][2] + bz) / 2)], bx, -0.414 - r + 0.006, bz, r, M['w'] * 0.85, M['w'] * 0.46, M['d'] * 0.46, lobes=8)
if 'pistol_14' in DATA:  # 13/11 (pedido dele): Matraquinha (Tec-9) com tambor de 40, estilo da Pipoqueira: gargalo no poco e tambor embaixo
    M = DATA['pistol_14']; r = M['w'] * 1.75; x, ty, tz = M['top']; under = M['mid'][1] - M['h'] * 0.08
    drum('cdrum_pistol_14_1', [(x, ty, tz), (x, under, tz)], x, under - r + 0.01, tz, r, M['w'] * 0.8, M['w'] * 0.46, M['d'] * 0.46, lobes=8)
for body, under in (('subfusil_13', -0.14), ('subfusil_8', -0.12)):  # tambor redondo chato (foto dele), 2 tamanhos. under = fundo do poco
    if body not in DATA: continue
    M = DATA[body]; x, ty, tz = M['top']
    for kd, r, half in ((1, 0.24, 0.075), (2, 0.31, 0.095)):
        drum('cdrum_%s_%d' % (body, kd), [(x, ty, tz), (x, under, tz)], x, under - r + 0.02, tz, r, half, M['w'] * 0.46, M['d'] * 0.46)
os.makedirs(os.path.dirname(OUT), exist_ok=True)
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', export_apply=True, export_yup=True)
print('PENTES', n, os.path.getsize(OUT))
