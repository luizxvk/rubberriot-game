# Dirigivel (sequencia de 7 abates), refeito no Blender em 08/11 a pedido dele: azul e vermelho, mais bonito e funcional.
# Rodar sem encostar no Blender aberto:  E:\Blender\blender.exe -b --factory-startup --python tools/blender/dirigivel.py
# Sai em public/models/src/dirigivel2.glb. Nariz em +Y no Blender (vira -Z no jogo), origem no centro do envelope.
# Envelope na medida do tiro: 3 x 2,4 x 6,9 (traceBlimp em src/player.js).
# Regra da malha (sem flick): cor, gomos e janelas sao FACES da propria malha, nada colado por cima.
# Pecas que se mexem saem soltas, com o pivo na origem do objeto: prop_L, prop_R, rudder, gun.
import bpy, bmesh, math, os
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.normpath(os.path.join(HERE, '..', '..', 'public', 'models', 'src', 'dirigivel2.glb'))
PAL = {'team': 'c8402e', 'cream': 'ece3cf', 'dark': '2a2622', 'brass': 'c9a34a', 'glass': 'f0c674', 'wood': '8a5a2b'}
MATS = list(PAL)


def material(name):
    m = bpy.data.materials.new('dg_' + name)
    m.use_nodes = True
    h = PAL[name]
    srgb = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    lin = [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in srgb]
    m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (*lin, 1)
    return m


class Mesh:
    def __init__(self): self.v, self.f = [], []

    def add(self, pts):
        n = len(self.v)
        self.v.extend(tuple(p) for p in pts)
        return n

    def face(self, idx, mat, smooth=False): self.f.append((tuple(idx), MATS.index(mat), smooth))

    def cyl(self, a, b, r1, r2, n, mat, smooth=False):
        a, b = Vector(a), Vector(b)
        d = (b - a).normalized()
        u = d.cross(Vector((0, 0, 1)) if abs(d.z) < 0.9 else Vector((1, 0, 0))).normalized()
        w = d.cross(u)
        ring = lambda c, r: [c + (u * math.cos(i / n * math.tau) + w * math.sin(i / n * math.tau)) * r for i in range(n)]
        s = self.add(ring(a, r1) + ring(b, r2))
        for i in range(n):
            j = (i + 1) % n
            self.face((s + i, s + j, s + n + j, s + n + i), mat, smooth)
        self.face([s + i for i in reversed(range(n))], mat)
        self.face([s + n + i for i in range(n)], mat)

    def box(self, c, size, mat):
        x, y, z = c
        a, b, h = size[0] / 2, size[1] / 2, size[2] / 2
        s = self.add([(x + i * a, y + j * b, z + k * h) for k in (-1, 1) for j in (-1, 1) for i in (-1, 1)])
        for q in ((0, 2, 3, 1), (4, 5, 7, 6), (0, 1, 5, 4), (2, 6, 7, 3), (0, 4, 6, 2), (1, 3, 7, 5)):
            self.face([s + i for i in q], mat)

    def plate(self, poly, axis_u, axis_n, thick, mat):
        # poligono (a, b): a ao longo de Y, b ao longo de axis_u; espessura em axis_n
        pts = [Vector((0, a, 0)) + axis_u * b for a, b in poly]
        n = len(pts)
        s = self.add([p + axis_n * thick / 2 for p in pts] + [p - axis_n * thick / 2 for p in pts])
        self.face([s + i for i in range(n)], mat)
        self.face([s + n + i for i in reversed(range(n))], mat)
        for i in range(n):
            j = (i + 1) % n
            self.face((s + j, s + i, s + n + i, s + n + j), mat)

    def obj(self, name, origin=(0, 0, 0)):
        me = bpy.data.meshes.new(name)
        o = Vector(origin)
        me.from_pydata([tuple(Vector(p) - o) for p in self.v], [], [f[0] for f in self.f])
        for m in BMATS: me.materials.append(m)
        for i, f in enumerate(self.f):
            me.polygons[i].material_index = f[1]
            me.polygons[i].use_smooth = f[2]
        bm = bmesh.new(); bm.from_mesh(me); bmesh.ops.recalc_face_normals(bm, faces=bm.faces); bm.to_mesh(me); bm.free()  # todas as faces pra fora (o contorno usa casco invertido)
        me.update()
        ob = bpy.data.objects.new(name, me)
        ob.location = o
        bpy.context.collection.objects.link(ob)
        return ob


for o in list(bpy.data.objects): bpy.data.objects.remove(o)
BMATS = [material(n) for n in MATS]
body = Mesh()

# ---------- envelope: gomos alternados na cor do time, faixas escuras, nariz de latao ----------
L, RX, RZ, SEG, ROWS = 6.9, 3.0, 2.4, 24, 30
def prof(t):  # t: -1 rabo, +1 nariz; nariz cheio e rabo afinado
    return math.sqrt(max(0, 1 - t * t)) * (1 + 0.1 * t) / 1.02
ts = [-math.cos((i + 1) / (ROWS + 2) * math.pi) for i in range(ROWS + 1)]
rings = []
for t in ts:
    r = prof(t)
    rings.append(body.add([(RX * r * math.cos(j / SEG * math.tau), L * t, RZ * r * math.sin(j / SEG * math.tau)) for j in range(SEG)]))
BANDS = [(-0.56, -0.5), (0.04, 0.1), (0.62, 0.68)]
def hull_mat(t, j):
    if t > 0.93: return 'brass'
    if t < -0.93: return 'dark'
    if any(a <= t <= b for a, b in BANDS): return 'dark'
    return 'team' if (j // 3) % 2 == 0 else 'cream'
for i in range(ROWS):
    t = (ts[i] + ts[i + 1]) / 2
    a, b = rings[i], rings[i + 1]
    for j in range(SEG):
        k = (j + 1) % SEG
        body.face((a + j, a + k, b + k, b + j), hull_mat(t, j), True)
tip = body.add([(0, L * ts[-1] + 0.14, 0), (0, L * ts[0] - 0.14, 0)])
for j in range(SEG):
    k = (j + 1) % SEG
    body.face((rings[-1] + j, rings[-1] + k, tip), 'brass', True)
    body.face((rings[0] + k, rings[0] + j, tip + 1), 'dark', True)

# ---------- aletas em cruz: raiz enterrada no casco, ponta na cor do time ----------
def surf(t, big): return (RX if big else RZ) * prof(t)
for th, big in ((0, True), (90, False), (180, True), (270, False)):
    a = math.radians(th)
    u, n = Vector((math.cos(a), 0, math.sin(a))), Vector((-math.sin(a), 0, math.cos(a)))
    r0, r1 = surf(-3.1 / L, big) - 0.25, surf(-5.95 / L, big) - 0.25
    tipR = r0 + 1.5
    body.plate([(-3.1, r0), (-5.95, r1), (-6.3, tipR), (-5.05, tipR)], u, n, 0.14, 'cream')
    body.plate([(-5.0, tipR - 0.05), (-6.28, tipR - 0.05), (-6.38, tipR + 0.34), (-5.4, tipR + 0.34)], u, n, 0.18, 'team')

# ---------- gondola: casco octogonal com janelas e friso do time ----------
OCT = [(0.77, 0.16), (0.77, -0.16), (0.42, -0.45), (-0.42, -0.45), (-0.77, -0.16), (-0.77, 0.16), (-0.42, 0.45), (0.42, 0.45)]
GZ, GN, GL = -3.1, 22, 2.35
gy = [-GL + 2 * GL * i / (GN - 1) for i in range(GN)]
def gs(y): return max(0.12, (1 - (abs(y) / (GL + 0.02)) ** 3.2) ** 0.5)
grs = [body.add([(x * gs(y), y, GZ + z * gs(y)) for x, z in OCT]) for y in gy]
for i in range(GN - 1):
    for j in range(8):
        k = (j + 1) % 8
        janela = j in (0, 4) and 2 <= i <= GN - 4 and i % 2 == 0   # janelas nos dois lados: fileira sim, fileira nao
        m = 'dark' if j == 2 else 'team' if j in (1, 3) else 'glass' if janela else 'cream'
        body.face((grs[i] + j, grs[i] + k, grs[i + 1] + k, grs[i + 1] + j), m)
body.face([grs[0] + j for j in range(8)], 'dark')
body.face([grs[-1] + j for j in reversed(range(8))], 'glass')  # parabrisa no nariz da gondola

# escoras gondola -> casco (entram nos dois)
for sx, sy in ((-0.55, -1.5), (0.55, -1.5), (-0.55, 1.5), (0.55, 1.5)):
    body.cyl((sx, sy, GZ + 0.3), (sx * 1.2, sy, -2.0), 0.05, 0.05, 6, 'dark')

# ---------- motores: braco, nacela de latao e escuro ----------
POD_X, POD_Y, POD_Z = 2.15, -0.85, -2.95
for sx in (-1, 1):
    body.cyl((sx * 0.55, POD_Y, GZ + 0.02), (sx * (POD_X - 0.1), POD_Y, POD_Z), 0.07, 0.07, 6, 'dark')
    body.cyl((sx * 0.5, POD_Y + 0.42, GZ + 0.12), (sx * (POD_X - 0.1), POD_Y + 0.2, POD_Z), 0.035, 0.035, 5, 'dark')
    nn, N = 12, 10
    prev = None
    ys = [POD_Y + 0.95 - 1.75 * i / N for i in range(N + 1)]
    for i, y in enumerate(ys):
        k = i / N
        r = 0.38 * math.sin(math.pi * min(1, 0.14 + k * 0.92)) ** 0.55
        s = body.add([(sx * POD_X + r * math.cos(a / nn * math.tau), y, POD_Z + r * math.sin(a / nn * math.tau)) for a in range(nn)])
        if prev is not None:
            for a in range(nn):
                b = (a + 1) % nn
                body.face((prev + a, s + a, s + b, prev + b), 'brass' if i <= 3 else 'dark', True)
        prev = s

# aro fixo da metralhadora embaixo do nariz da gondola
GUN = (0, 1.25, GZ - 0.62)
body.cyl((GUN[0], GUN[1], GZ - 0.34), (GUN[0], GUN[1], GZ - 0.53), 0.33, 0.27, 12, 'brass')

# ---------- pecas moveis (pivo na origem de cada uma) ----------
def propeller(name, x):
    m = Mesh()
    c = Vector((x, POD_Y - 0.86, POD_Z))
    m.cyl(c + Vector((0, 0.16, 0)), c - Vector((0, 0.13, 0)), 0.1, 0.05, 10, 'brass')
    for b in range(3):
        a = b / 3 * math.tau
        u, w = Vector((math.cos(a), 0, math.sin(a))), Vector((-math.sin(a), 0, math.cos(a)))
        pts = [(0.07, 0.09), (0.3, 0.12), (0.8, 0.1), (0.92, 0.0), (0.8, -0.08), (0.07, -0.07)]
        q = [c + u * r + w * h + Vector((0, 0.05 * (h / 0.12), 0)) for r, h in pts]
        q2 = [p + Vector((0, -0.05, 0)) for p in q]
        s = m.add(q + q2)
        n = len(q)
        m.face([s + i for i in range(n)], 'wood')
        m.face([s + n + i for i in reversed(range(n))], 'wood')
        for i in range(n):
            j = (i + 1) % n
            m.face((s + j, s + i, s + n + i, s + n + j), 'wood')
    return m.obj(name, c)

propeller('prop_L', -POD_X)
propeller('prop_R', POD_X)

rud = Mesh()
HY = -6.42
for sgn in (-1, 1):
    r0, r1 = surf(HY / L, False) + 0.2, 2.8
    z0, z1 = sgn * r0, sgn * r1
    pts = [(HY - 0.02, z0), (HY - 0.02, z1), (HY - 0.72, z1 - sgn * 0.2), (HY - 0.8, z0 + sgn * 0.1)]
    if sgn < 0: pts.reverse()
    rud.plate(pts, Vector((0, 0, 1)), Vector((1, 0, 0)), 0.1, 'team')
rud.cyl((0, HY, -2.75), (0, HY, 2.75), 0.05, 0.05, 6, 'dark')
rud.obj('rudder', (0, HY, 0))

gun = Mesh()
g = Vector(GUN)
gun.box(g, (0.5, 0.5, 0.3), 'dark')
for sx in (-0.13, 0.13):
    gun.cyl(g + Vector((sx, 0.2, 0)), g + Vector((sx, 1.3, 0)), 0.06, 0.05, 8, 'dark')
    gun.cyl(g + Vector((sx, 1.3, 0)), g + Vector((sx, 1.42, 0)), 0.08, 0.08, 8, 'brass')
gun.obj('gun', g)
body.obj('dg_body')

# ---------- saida ----------
bpy.ops.object.select_all(action='DESELECT')
tris = sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in bpy.data.objects if o.type == 'MESH')
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', export_yup=True, export_apply=False, export_animations=False, export_cameras=False, export_lights=False, export_materials='EXPORT')
print('[dirigivel] triangulos', tris, 'arquivo', OUT, os.path.getsize(OUT))
