# Dirigivel BOMBARDEIRO (sequencia), refeito no Blender em 14/11 a pedido dele (skill blender-director: vehicle-artist +
# cartoon-style + asset-optimization + export-pipeline). Substitui o dirigivel.glb do Tripo.
# Rodar sem encostar no Blender aberto:  E:\Blender\blender.exe -b --factory-startup --python tools/blender/bombardeiro.py
# Sai em public/models/src/bombardeiro.glb (Draco). Nariz em +Y no Blender (vira -Z no jogo), origem no centro do envelope,
# ja na medida do jogo (13,8 de ponta a ponta antes do x6): o jogo NAO reescala nem gira (o morph target nao acompanharia).
# Regra da malha (sem flick): cor, gomos, costuras e janelas sao FACES da propria malha, nada colado por cima.
# Cores: 'team' e 'team2' viram a cor do time no jogo (gomo claro/escuro); o resto e cor fixa.
# Shape key 'murcho' (morph target do glTF): envelope amassado e enrugado, gondola sobe junto, aletas acompanham o casco.
import bpy, bmesh, math, os
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.normpath(os.path.join(HERE, '..', '..', 'public', 'models', 'src', 'bombardeiro.glb'))
PAL = {'team': 'c8402e', 'team2': '9c2c20', 'dark': '2a2622', 'brass': 'c9a34a', 'cream': 'ece3cf', 'wood': '8a5a2b', 'glass': 'f0c674', 'bomb': '1c1a18'}
MATS = list(PAL)


def material(name):
    m = bpy.data.materials.new('bb_' + name)
    m.use_nodes = True
    h = PAL[name]
    srgb = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    lin = [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in srgb]
    m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (*lin, 1)
    m.diffuse_color = (*lin, 1)
    return m


class Mesh:
    def __init__(self): self.v, self.f, self.part = [], [], []

    def add(self, pts, part):
        n = len(self.v)
        for p in pts: self.v.append(tuple(p)); self.part.append(part)
        return n

    def face(self, idx, mat, smooth=False): self.f.append((tuple(idx), MATS.index(mat), smooth))

    def cyl(self, a, b, r1, r2, n, mat, part, smooth=False):
        a, b = Vector(a), Vector(b)
        d = (b - a).normalized()
        u = d.cross(Vector((0, 0, 1)) if abs(d.z) < 0.9 else Vector((1, 0, 0))).normalized()
        w = d.cross(u)
        ring = lambda c, r: [c + (u * math.cos(i / n * math.tau) + w * math.sin(i / n * math.tau)) * r for i in range(n)]
        s = self.add(ring(a, r1) + ring(b, r2), part)
        for i in range(n):
            j = (i + 1) % n
            self.face((s + i, s + j, s + n + j, s + n + i), mat, smooth)
        self.face([s + i for i in reversed(range(n))], mat)
        self.face([s + n + i for i in range(n)], mat)

    def sphere(self, c, r, nu, nv, mat, part, sz=1.0):
        c = Vector(c)
        top = self.add([c + Vector((0, 0, r * sz))], part)
        rings = []
        for i in range(1, nv):
            ph = math.pi * i / nv
            rings.append(self.add([c + Vector((r * math.sin(ph) * math.cos(j / nu * math.tau), r * math.sin(ph) * math.sin(j / nu * math.tau), r * sz * math.cos(ph))) for j in range(nu)], part))
        bot = self.add([c - Vector((0, 0, r * sz))], part)
        for j in range(nu):
            k = (j + 1) % nu
            self.face((top, rings[0] + k, rings[0] + j), mat, True)
            self.face((bot, rings[-1] + j, rings[-1] + k), mat, True)
        for a, b in zip(rings, rings[1:]):
            for j in range(nu):
                k = (j + 1) % nu
                self.face((a + j, a + k, b + k, b + j), mat, True)

    def plate(self, poly, axis_u, axis_n, thick, mat, part):
        pts = [Vector((0, a, 0)) + axis_u * b for a, b in poly]
        n = len(pts)
        s = self.add([p + axis_n * thick / 2 for p in pts] + [p - axis_n * thick / 2 for p in pts], part)
        self.face([s + i for i in range(n)], mat)
        self.face([s + n + i for i in reversed(range(n))], mat)
        for i in range(n):
            j = (i + 1) % n
            self.face((s + j, s + i, s + n + i, s + n + j), mat)


for o in list(bpy.data.objects): bpy.data.objects.remove(o)
BMATS = [material(n) for n in MATS]
M = Mesh()

# ---------- envelope: charuto GORDO, gomos claro/escuro do time, 3 cintas de costura, nariz de latao, rabo escuro ----------
L, R, SEG, ROWS = 6.3, 2.75, 32, 28          # meio comprimento e raio (bem mais gordo que o dirigivel de 7 abates)
def prof(t):  # t: -1 rabo, +1 nariz. Nariz cheio e redondo, rabo afinando (cara de balao de borracha)
    return math.sqrt(max(0, 1 - t * t)) ** 0.85 * (1 + 0.08 * t) / 1.02
ts = [-math.cos((i + 1) / (ROWS + 2) * math.pi) for i in range(ROWS + 1)]
rings = []
for t in ts:
    r = R * prof(t)
    rings.append(M.add([(r * math.cos(j / SEG * math.tau), L * t, r * 0.94 * math.sin(j / SEG * math.tau)) for j in range(SEG)], ('env', t)))
BANDS = [(-0.5, -0.45), (0.0, 0.05), (0.5, 0.55)]   # costuras (faixas escuras): faces do proprio casco
def hull_mat(t, j):
    if t > 0.9: return 'brass'
    if t < -0.9: return 'dark'
    if any(a <= t <= b for a, b in BANDS): return 'dark'
    return 'team' if (j // 2) % 2 == 0 else 'team2'
for i in range(ROWS):
    t = (ts[i] + ts[i + 1]) / 2
    a, b = rings[i], rings[i + 1]
    for j in range(SEG):
        k = (j + 1) % SEG
        M.face((a + j, a + k, b + k, b + j), hull_mat(t, j), True)
tips = M.add([(0, L * ts[-1] + 0.12, 0), (0, L * ts[0] - 0.12, 0)], ('env', 0))
for j in range(SEG):
    k = (j + 1) % SEG
    M.face((rings[-1] + j, rings[-1] + k, tips), 'brass', True)
    M.face((rings[0] + k, rings[0] + j, tips + 1), 'dark', True)

# ---------- 4 aletas em X (45 graus), raiz enterrada no casco, ponta ate 6,9 (13,8 no total) ----------
def surf(t): return R * prof(t) * 0.97
for th in (45, 135, 225, 315):
    a = math.radians(th)
    u, n = Vector((math.cos(a), 0, math.sin(a))), Vector((-math.sin(a), 0, math.cos(a)))
    NOSE = L * ts[-1] + 0.12; YT = -(13.8 - NOSE)      # ponta da aleta: fecha 13,8 de ponta a ponta
    y0, y1 = -3.2, -5.9
    r0, r1 = surf(y0 / L) - 0.3, max(0.2, surf(y1 / L) - 0.3)
    tipR = surf(y0 / L) + 1.25
    M.plate([(y0, r0), (y1, r1), (YT, tipR - 0.15), (YT + 0.4, tipR), (-4.6, tipR)], u, n, 0.16, 'team2', ('fin', -4.5 / L))

# ---------- gondola de madeira: casco octogonal, janelas, quilha escura, friso de latao ----------
OCT = [(0.8, 0.16), (0.8, -0.18), (0.45, -0.5), (-0.45, -0.5), (-0.8, -0.18), (-0.8, 0.16), (-0.45, 0.48), (0.45, 0.48)]
GZ, GN, GL = -3.35, 18, 2.2
gy = [-GL + 2 * GL * i / (GN - 1) for i in range(GN)]
def gs(y): return max(0.14, (1 - (abs(y) / (GL + 0.02)) ** 3.0) ** 0.5)
grs = [M.add([(x * gs(y), y, GZ + z * gs(y)) for x, z in OCT], ('gon', 0)) for y in gy]
for i in range(GN - 1):
    for j in range(8):
        k = (j + 1) % 8
        janela = j in (0, 4) and 2 <= i <= GN - 4 and i % 2 == 1
        m = 'dark' if j == 2 else 'brass' if j in (1, 3) else 'glass' if janela else 'wood'
        M.face((grs[i] + j, grs[i] + k, grs[i + 1] + k, grs[i + 1] + j), m)
M.face([grs[0] + j for j in range(8)], 'dark')
M.face([grs[-1] + j for j in reversed(range(8))], 'glass')

# escoras gondola -> casco (entram nos dois; a ponta de cima acompanha o casco quando murcha)
for sx, sy in ((-0.6, -1.4), (0.6, -1.4), (-0.6, 1.4), (0.6, 1.4)):
    M.cyl((sx, sy, GZ + 0.25), (sx * 1.25, sy, -2.15), 0.06, 0.06, 6, 'dark', ('strut', 0))

# ---------- trilho de bombas embaixo da gondola + 6 bombas redondas com pavio de latao ----------
M.cyl((0, -1.55, GZ - 0.44), (0, 1.55, GZ - 0.44), 0.09, 0.09, 6, 'dark', ('gon', 0))
for k in range(6):
    y = -1.25 + k * 0.5
    sx = -0.34 if k % 2 == 0 else 0.34
    c = (sx, y, GZ - 0.98)
    M.cyl((sx * 0.4, y, GZ - 0.48), (sx, y, GZ - 0.72), 0.03, 0.03, 5, 'dark', ('gon', 0))       # gancho
    M.sphere(c, 0.3, 10, 7, 'bomb', ('gon', 0), sz=1.08)
    M.cyl((sx, y, GZ - 0.66), (sx, y, GZ - 0.6), 0.1, 0.08, 8, 'brass', ('gon', 0))              # tampa do pavio

# ---------- objeto + shape key 'murcho' ----------
me = bpy.data.meshes.new('bombardeiro')
me.from_pydata(M.v, [], [f[0] for f in M.f])
for m in BMATS: me.materials.append(m)
for i, f in enumerate(M.f):
    me.polygons[i].material_index = f[1]
    me.polygons[i].use_smooth = f[2]
bm = bmesh.new(); bm.from_mesh(me); bmesh.ops.recalc_face_normals(bm, faces=bm.faces); bm.to_mesh(me); bm.free()
me.update()
ob = bpy.data.objects.new('bombardeiro', me)
bpy.context.collection.objects.link(ob)

ob.shape_key_add(name='Basis', from_mix=False)
sk = ob.shape_key_add(name='murcho', from_mix=False)
BOT = R * 0.94 * prof(0)           # fundo do casco no meio (onde a gondola pendura)
def squash(t, ang):
    # quanto o casco encolhe: amassado irregular (rugas) e o de cima cede mais que o de baixo
    s = 0.5 + 0.1 * math.sin(5 * ang + 3.1 * t) + 0.07 * math.sin(11 * t + 1.3) + 0.05 * math.cos(3 * ang - 7 * t)
    if math.sin(ang) > 0: s *= 0.86
    return max(0.3, min(0.85, s))
lift = BOT * (1 - squash(0, -math.pi / 2)) * 0.75   # gondola sobe acompanhando o fundo do casco
for i, (p, part) in enumerate(zip(M.v, M.part)):
    x, y, z = p
    kind, t = part
    if kind == 'env':
        ang = math.atan2(z, x); s = squash(t, ang)
        sk.data[i].co = (x * s, y * 0.9 - 0.25 * (1 - abs(t)), z * s - 0.35 * (1 - abs(t)))
    elif kind == 'fin':
        s = 0.62                       # aleta encolhe com o casco (raiz continua enterrada) e entorta
        rad = math.hypot(x, z); ang = math.atan2(z, x)
        sk.data[i].co = (math.cos(ang + 0.18) * rad * s, y * 0.9, math.sin(ang + 0.18) * rad * s)
    elif kind == 'strut' and z > GZ + 0.6:
        s = squash(y / L, math.atan2(z, x))
        sk.data[i].co = (x * s, y * 0.95, z * s)
    else:                              # gondola, trilho, bombas e pe das escoras: sobem juntos
        sk.data[i].co = (x, y * 0.95, z + lift)

# ---------- checagens: medida e pisca ----------
xs = [v[0] for v in M.v]; ys = [v[1] for v in M.v]; zs = [v[2] for v in M.v]
length = max(ys) - min(ys)
tris = sum(len(p.vertices) - 2 for p in me.polygons)
print('[bombardeiro] comprimento', round(length, 3), 'largura', round(max(xs) - min(xs), 3), 'altura', round(max(zs) - min(zs), 3), 'triangulos', tris)
if abs(length - 13.8) > 0.05: raise RuntimeError('comprimento errado: %.3f' % length)

bpy.ops.object.select_all(action='DESELECT'); ob.select_set(True); bpy.context.view_layer.objects.active = ob
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', export_yup=True, use_selection=True, export_apply=False, export_animations=False,
                          export_morph=True, export_morph_normal=True, export_cameras=False, export_lights=False, export_materials='EXPORT',
                          export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=7)
print('[bombardeiro] arquivo', OUT, os.path.getsize(OUT))
