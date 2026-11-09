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

def ring(cx, cy, cz, hw, hd, n=3.2):  # contorno superelipse (canto bem redondo); gl -> blender: (x, -z, y)
    pts = []
    for i in range(N_RING):
        a = i / N_RING * math.tau
        c, s = math.cos(a), math.sin(a)
        pts.append((cx + hw * math.copysign(abs(c) ** (2 / n), c), -(cz + hd * math.copysign(abs(s) ** (2 / n), s)), cy))
    return pts

def center(M, t):  # linha central do original (t = 0 boca, 1 fundo do original; passa de 1 no pente longo seguindo a tangente)
    t0, t1, t2 = M['top'], M['mid'], M['bot']
    if t <= 1:
        a, b, c = (1 - t) ** 2, 2 * t * (1 - t), t * t
        ctrl = [2 * t1[k] - 0.5 * (t0[k] + t2[k]) for k in range(3)]
        return [a * t0[k] + b * ctrl[k] + c * t2[k] for k in range(3)]
    d = [t2[k] - t1[k] for k in range(3)]
    return [t2[k] + d[k] * (t - 1) * 2 for k in range(3)]

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
        vs = [bm.verts.new(p) for p in ring(c[0], c[1], c[2], hw0 * kw, hd0 * kd, S['n'])]
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

n = 0
for body, M in DATA.items():
    for kd in STYLES: build(body, M, kd); n += 1
os.makedirs(os.path.dirname(OUT), exist_ok=True)
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', export_apply=True, export_yup=True)
print('PENTES', n, os.path.getsize(OUT))
