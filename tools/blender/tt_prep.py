# Preparo de arma do TastyTony pro Rubber Riot (06/11, pedido dele). Pela ponte, com GUN = dict da arma na 1a linha
# (ou CFG = caminho do tools/blender/tt_guns.json + ID = id do jogo). NUNCA SystemExit (fecha o Blender dele).
#
# O que sai em public/models/src/tt_ready/<id>.glb (espaco do JOGO: cano no -Z, cima no +Y, metros reais):
#   p<n>_<zona> : uma peca por ilha de mesma zona: paint (metal: pintura/camo), accent (madeira: destaque),
#                 del (mira de ferro: some no jogo), mag (pente; sem pente = interno). Zona muda no tt_guns.json (zones)
#   m_grip, m_fore, m_muzzle, m_rail0, m_rail1, m_well : vazios (Empty) com a posicao de cada encaixe
# Mira de ferro: ilha pequena que sobe acima do topo do receptor vira peca 'del' (lista em 'ferro_del'); keepIrons desliga.
import bpy, bmesh, json, math, os
from mathutils import Vector, Matrix

HERE = r'D:\Desktop\fokusstudios\tinta-louca\tools\blender'
SRC = r'D:\Desktop\fokusstudios\tinta-louca\public\models\src\tt'
OUT = r'D:\Desktop\fokusstudios\tinta-louca\public\models\src\tt_ready'
os.makedirs(OUT, exist_ok=True)
G = globals().get('GUN')
if G is None:
    allg = json.load(open(globals().get('CFG', 'D:/Desktop/fokusstudios/tinta-louca/src/tt_guns.json'), encoding='utf-8'))
    G = next(g for g in allg if g['id'] == globals()['ID'])
ID = G['id']

# ---------- importa numa cena propria ----------
SCN = 'TTP_' + ID
old = bpy.data.scenes.get(SCN)
if old:
    for o in list(old.objects): bpy.data.objects.remove(o, do_unlink=True)
    bpy.data.scenes.remove(old)
scn = bpy.data.scenes.new(SCN); bpy.context.window.scene = scn
with bpy.context.temp_override(scene=scn):
    bpy.ops.import_scene.gltf(filepath=os.path.join(SRC, G['file']))
for o in list(scn.objects):
    if o.type in ('LIGHT', 'CAMERA'): bpy.data.objects.remove(o, do_unlink=True)
deps = bpy.context.evaluated_depsgraph_get()

def base_color(m):
    if m and m.use_nodes:
        n = m.node_tree.nodes.get('Principled BSDF')
        if n: return tuple(n.inputs['Base Color'].default_value[:3])
    return tuple(m.diffuse_color[:3]) if m else (0.05, 0.05, 0.05)
def is_wood(c):  # madeira / claro -> destaque
    r, g, b = c  # cor linear (escuro fica minusculo): a madeira se ve pela PROPORCAO vermelho/azul
    return (r > 0.035 and r / max(b, 1e-3) > 1.3) or (0.3 * r + 0.59 * g + 0.11 * b) > 0.35

# ---------- junta tudo (com o esqueleto aplicado) em bmesh, separando o pente ----------
body = bmesh.new(); mag = bmesh.new()
MAG_BONES = set(G.get('magBones', [])); MAG_OBJS = set(G.get('magObjs', [])); DROP = set(G.get('drop', [])) | {'Icosphere'}  # 07/11: varios arquivos do TT trazem uma esfera solta na origem (bola gigante no jogo)
# 07/11: sem pente informado, acha sozinho pelo nome (objeto ou osso com mag/clip/drum); o editor corrige com o pincel Pente
if not MAG_BONES and not MAG_OBJS and not G.get('noMagAuto'):
    import re
    _rx = re.compile(r'mag(?!num|release|_?rel|_?catch|_?retain)|clip|drum|charger|^bullets?_', re.I)
    MAG_OBJS = {o.name for o in scn.objects if o.type == 'MESH' and _rx.search(o.name)}
    for _a in [o for o in scn.objects if o.type == 'ARMATURE']: MAG_BONES |= {b.name for b in _a.data.bones if _rx.search(b.name)}
for o in [o for o in scn.objects if o.type == 'MESH']:
    if o.name in DROP or any(o.name.startswith(d) for d in DROP): continue
    ev = o.evaluated_get(deps); me = bpy.data.meshes.new_from_object(ev, depsgraph=deps)
    me.transform(o.matrix_world)
    vg = {g.index: g.name for g in o.vertex_groups}
    tmp = bmesh.new(); tmp.from_mesh(me)
    deform = tmp.verts.layers.deform.active
    mats = [base_color(m) for m in me.materials] or [(0.05, 0.05, 0.05)]
    to_mag = o.name in MAG_OBJS
    for f in tmp.faces:
        col = mats[f.material_index] if f.material_index < len(mats) else mats[0]
        in_mag = to_mag
        if not in_mag and MAG_BONES and deform:
            w = sum(sum(v[deform].get(gi, 0) for gi, gn in vg.items() if gn in MAG_BONES) for v in f.verts) / len(f.verts)
            in_mag = w > 0.5
        dst = mag if in_mag else body
        vs = [dst.verts.new(v.co) for v in f.verts]
        try:
            nf = dst.faces.new(vs); nf.material_index = 1 if is_wood(col) else 0
        except ValueError: pass
    tmp.free(); bpy.data.meshes.remove(me)
for bm in (body, mag): bmesh.ops.remove_doubles(bm, verts=bm.verts[:], dist=1e-6)

# ---------- orienta: eixo comprido -> Z do jogo, cano no -Z, cima no +Y; metros reais ----------
def bbox(bm):
    xs = [v.co.x for v in bm.verts]; ys = [v.co.y for v in bm.verts]; zs = [v.co.z for v in bm.verts]
    return Vector((min(xs), min(ys), min(zs))), Vector((max(xs), max(ys), max(zs)))
mn, mx = bbox(body); size = mx - mn
long_ax = max(range(3), key=lambda i: size[i])
up_ax = G.get('up', 2 if long_ax != 2 else 1)  # Blender: Z pra cima
side_ax = [i for i in range(3) if i not in (long_ax, up_ax)][0]
def thick(lo, hi):
    a, b = math.inf, -math.inf
    for v in body.verts:
        t = v.co[long_ax]
        if lo <= t <= hi: a = min(a, v.co[up_ax]); b = max(b, v.co[up_ax])
    return b - a if b > a else 0
L0 = size[long_ax]
muzzle_min = thick(mn[long_ax], mn[long_ax] + L0 * 0.06) <= thick(mx[long_ax] - L0 * 0.06, mx[long_ax])
if 'muzzleMin' in G: muzzle_min = G['muzzleMin']
if G.get('flip'): muzzle_min = not muzzle_min  # 07/11: as duas pontas com grossura parecida (Desert Eagle): o cano saiu atras
k = G['len'] / L0
# matriz: (long, up, side) -> jogo (z, y, x); cano no -z
# 07/11 (bug "arma amassada"): a troca de eixos nao pode ESPELHAR. Espelhada, a malha fica do avesso (faces viradas pra
# dentro) e o jogo mostra o lado de dentro das pecas. O sinal da largura e escolhido pra matriz ter determinante +1
_perm = (side_ax, up_ax, long_ax)
_psign = 1 if _perm in ((0, 1, 2), (1, 2, 0), (2, 0, 1)) else -1
_s2 = 1 if muzzle_min else -1
_s1 = _psign * _s2  # det = s1 * 1 * s2 * psign = +1
def to_game(co):
    c = co - (mn + mx) / 2
    zl = c[long_ax] * _s2  # cano (ponta fina) no -z
    return Vector((c[side_ax] * _s1, c[up_ax], zl)) * k
for bm in (body, mag):
    for v in bm.verts: v.co = to_game(v.co)
    bm.normal_update()
# ---------- grossura padrao (07/11, pedido dele: "todas com a grossura da Garoa") ----------
# largura tipica do corpo = mediana da largura (x) por fatia ao longo do cano; armas longas vao pra mesma fracao da Garoa
def core_width(bm):
    zs = [v.co.z for v in bm.verts]; za, zb = min(zs), max(zs); n = 40; lo = [math.inf] * n; hi = [-math.inf] * n
    for v in bm.verts:
        i = min(n - 1, int((v.co.z - za) / max(zb - za, 1e-9) * n)); lo[i] = min(lo[i], v.co.x); hi[i] = max(hi[i], v.co.x)
    w = sorted(hi[i] - lo[i] for i in range(n) if hi[i] > lo[i]); return w[len(w) // 2] if w else 0
CORE_W = core_width(body)
CORE_FRAC = 0.031  # largura tipica / comprimento da Garoa (Fedorov), medida em 07/11: a grossura que ele aprovou
# 07/11 (depois, pedido dele): a grossura forcada ACHATAVA as armas (tambor da Sanfona amassado, Bico de Pena fina demais).
# Desligado: cada arma fica na proporcao REAL do modelo (escala igual nos 3 eixos). Religar = WIDTH_NORM = True
WIDTH_NORM = False
if WIDTH_NORM and not ID.startswith('pistol') and not G.get('keepWidth') and CORE_W > 0 and not G.get('_measure'):
    sx = max(0.7, min(2.2, CORE_FRAC * G['len'] / CORE_W))
    for bm in (body, mag):
        for v in bm.verts: v.co.x *= sx
        bm.normal_update()
    CORE_W *= sx

# ---------- forma por arma (07/11, pedido dele: "achatada" / "alongada") ----------
# shape = {x: largura, y: altura, z: comprimento} (multiplica em volta do centro). Os encaixes saem do perfil depois daqui
SH = G.get('shape') or {}
if SH:
    for bm in (body, mag):
        for v in bm.verts: v.co.x *= SH.get('x', 1); v.co.y *= SH.get('y', 1); v.co.z *= SH.get('z', 1)
        bm.normal_update()

# ---------- perfil (topo/fundo por fatia ao longo do Z) ----------
bmn, bmx = bbox(body); L = bmx.z - bmn.z; H = bmx.y - bmn.y; N = 60
from mathutils.bvhtree import BVHTree
DEL = set()  # indices de face que saem (mira de ferro): viram peca 'del', o editor pode devolver
def prof(bm, skip=()):
    # topo e fundo de cada fatia por RAIO (vertice e esparso numa coronha comprida: media errada)
    bm.verts.ensure_lookup_table(); bm.faces.ensure_lookup_table()
    T = BVHTree.FromPolygons([v.co for v in bm.verts], [[v.index for v in f.verts] for f in bm.faces if f.index not in skip])
    a, b = bbox(bm); W = b.x - a.x
    lo = [math.inf] * N; hi = [-math.inf] * N
    for s0 in range(N):
        z = bmn.z + (s0 + 0.5) * L / N
        for x in (a.x + W * 0.3, (a.x + b.x) / 2, b.x - W * 0.3):
            h = T.ray_cast(Vector((x, b.y + 1, z)), Vector((0, -1, 0)))
            if h[0]: hi[s0] = max(hi[s0], h[0].y)
            h = T.ray_cast(Vector((x, a.y - 1, z)), Vector((0, 1, 0)))
            if h[0]: lo[s0] = min(lo[s0], h[0].y)
    return lo, hi
zf = lambda f: bmn.z + L * f  # fracao a partir da boca

def islands(bm, same=None):
    # ilhas por aresta; com same(f,g) so atravessa se as duas faces forem da mesma zona
    bm.faces.ensure_lookup_table(); seen = set(); out = []
    for f0 in bm.faces:
        if f0.index in seen: continue
        isl = []; stack = [f0]; seen.add(f0.index)
        while stack:
            f = stack.pop(); isl.append(f)
            for e in f.edges:
                for g in e.link_faces:
                    if g.index not in seen and (same is None or same(f, g)): seen.add(g.index); stack.append(g)
        out.append(isl)
    return out

# ---------- mira de ferro: marca 'del' (nao apaga; o editor devolve se quiser) ----------
ferro = []
if not G.get('keepIrons'):
    lo, hi = prof(body)
    mid = sorted(h for h in hi[int(N * 0.2):int(N * 0.8)] if h > -math.inf) or sorted(h for h in hi if h > -math.inf) or [0.0]  # 07/11: perfil vazio no meio nao derruba o preparo
    top = mid[len(mid) // 2]
    for isl in islands(body):
        vs = {v for f in isl for v in f.verts}
        z0 = min(v.co.z for v in vs); z1 = max(v.co.z for v in vs); y0 = min(v.co.y for v in vs); y1 = max(v.co.y for v in vs)
        fr = round(((z0 + z1) / 2 - bmn.z) / L, 2)
        if fr in [round(x, 2) for x in G.get('keepIsl', [])]: continue
        if (z1 - z0) < L * G.get('ironLen', 0.12) and y1 > top + H * 0.03 and y0 > top - H * 0.12:
            DEL.update(f.index for f in isl); ferro.append(fr)

# ---------- luneta de fabrica (07/11, pedido dele): sniper que ja vem com luneta perde ela (entram as nossas) ----------
# Ilha comprida em cima do corpo, no meio da arma = tubo da luneta; o que fica em cima do corpo embaixo dela (anel, base) vai junto.
# Zona 'cut' = some SEMPRE (diferente do ferro, que volta sem mira acoplada)
CUT = set(); luneta = []
if (ID.startswith('sniper') or G.get('scopeCut')) and not G.get('keepScope'):
    lo0, hi0 = prof(body, DEL)
    mid0 = sorted(h for h in hi0[int(N * 0.2):int(N * 0.8)] if h > -math.inf) or [0.0]
    top0 = mid0[len(mid0) // 4]  # topo do receptor (quartil de baixo: a luneta levanta a mediana)
    isls = islands(body); box = lambda isl: (min(v.co.z for f in isl for v in f.verts), max(v.co.z for f in isl for v in f.verts), min(v.co.y for f in isl for v in f.verts), max(v.co.y for f in isl for v in f.verts))
    # pedacos acima do corpo, agrupados pelo Z (a luneta pode vir em varios tubos curtos); grupo comprido no meio = luneta
    cand = sorted([(box(isl), isl) for isl in isls if box(isl)[2] > top0 + H * 0.06 and (box(isl)[1] - box(isl)[0]) < L * 0.55], key=lambda c: c[0][0])
    groups = []
    for bx, isl in cand:
        if groups and bx[0] <= groups[-1][1] + L * 0.02: g = groups[-1]; g[1] = max(g[1], bx[1]); g[2].append(isl)
        else: groups.append([bx[0], bx[1], [isl]])
    tubes = []
    if G.get('scopeZ'):  # faixa manual (luneta colada no trilho, ex. Barrett): fracoes a partir da boca + altura do trilho (fracao de H)
        a, b = G['scopeZ']; top0 = bmn.y + H * G.get('scopeY', 0.6); tubes.append((zf(a), zf(b))); luneta.append(round((a + b) / 2, 2)); groups = []
        for isl in isls:
            z0, z1, y0, y1 = box(isl)
            if z0 >= zf(a) - L * 0.01 and z1 <= zf(b) + L * 0.01 and y0 > top0 + H * 0.02: CUT.update(f.index for f in isl)
    for z0, z1, gi in groups:
        cz = ((z0 + z1) / 2 - bmn.z) / L
        if L * 0.12 < (z1 - z0) < L * 0.6 and 0.15 < cz < 0.85:
            tubes.append((z0, z1)); luneta.append(round(cz, 2))
            for isl in gi: CUT.update(f.index for f in isl)
    for isl in isls:
        z0, z1, y0, y1 = box(isl)
        if any(z0 >= a - L * 0.02 and z1 <= b + L * 0.02 for a, b in tubes) and y0 > top0 - H * 0.03 and (z1 - z0) < L * 0.2: CUT.update(f.index for f in isl)
    DEL -= CUT

# ---------- marcas padrao (fracao a partir da boca; perfil SEM o ferro). O editor sobrescreve ----------
lo, hi = prof(body, DEL | CUT)
sl = lambda f: min(N - 1, max(0, int(f * N)))
def near(arr, f, fn):
    for d in range(N):
        for s in (sl(f) - d, sl(f) + d):
            if 0 <= s < N and abs(arr[s]) != math.inf: return arr[s]
    return 0
marks = {}
gf = G['grip']; marks['m_grip'] = Vector((0, near(lo, gf, min) + H * 0.12, zf(gf)))
ff = G.get('fore');
if ff is not None: marks['m_fore'] = Vector((0, near(lo, ff, min), zf(ff)))
r0, r1 = G['rail']
ry = max(near(hi, f, max) for f in [r0 + (r1 - r0) * t / 8 for t in range(9)])
marks['m_rail0'] = Vector((0, ry, zf(r0))); marks['m_rail1'] = Vector((0, ry, zf(r1)))
fr = [v.co for v in body.verts if v.co.z < bmn.z + L * 0.015]
marks['m_muzzle'] = Vector((sum(c.x for c in fr) / len(fr), sum(c.y for c in fr) / len(fr), bmn.z))
if mag.verts:
    a, b = bbox(mag); marks['m_well'] = Vector(((a.x + b.x) / 2, b.y, (a.z + b.z) / 2))

# ---------- pecas: uma por ilha de mesma zona, da boca pra coronha. Nome p<n>_<zona> (paint|accent|del|mag) ----------
def zone(f): return 'cut' if f.index in CUT else 'del' if f.index in DEL else ('accent' if f.material_index == 1 else 'paint')
pieces = []  # (zona, bmesh)
def take(faces, zn):
    dst = bmesh.new(); vm = {}
    for f in faces:
        vs = []
        for v in f.verts:
            if v not in vm: vm[v] = dst.verts.new(v.co)
            vs.append(vm[v])
        try: dst.faces.new(vs)
        except ValueError: pass
    pieces.append((zn, dst))
for isl in sorted(islands(body, lambda f, g: zone(f) == zone(g)), key=lambda i: min(v.co.z for f in i for v in f.verts)):
    take(isl, zone(isl[0]))
if mag.verts:
    mag.faces.ensure_lookup_table(); take(list(mag.faces), 'mag')
body.free(); mag.free()

# ---------- objetos e exportacao ----------
for o in list(scn.objects): bpy.data.objects.remove(o, do_unlink=True)
def mat(name, rgb):
    m = bpy.data.materials.get('tt_' + name) or bpy.data.materials.new('tt_' + name)
    m.use_nodes = True; m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (*rgb, 1); m.diffuse_color = (*rgb, 1); m.name = 'tt_' + name
    return m
MAT = {'paint': mat('paint', (0.06, 0.06, 0.06)), 'accent': mat('accent', (0.35, 0.2, 0.1)), 'mag': mat('dark', (0.03, 0.03, 0.03)), 'del': mat('del', (1, 0.05, 0.05)), 'cut': mat('cut', (1, 0, 1))}
B = lambda v: Vector((v.x, -v.z, v.y))  # jogo -> Blender (Y-up na exportacao volta pro jogo)
objs = []; cont = {}
for n, (zn, bm) in enumerate(pieces):
    for v in bm.verts: v.co = B(v.co)
    bm.normal_update()
    nm = 'p%d_%s' % (n, zn); cont[zn] = cont.get(zn, 0) + 1
    if bpy.data.meshes.get(nm): bpy.data.meshes.remove(bpy.data.meshes[nm])  # sobra de rodada anterior
    me =bpy.data.meshes.new(nm); bm.to_mesh(me); bm.free(); me.materials.append(MAT[zn])
    o = bpy.data.objects.new(nm, me); scn.collection.objects.link(o); objs.append(o)
for nm, p in marks.items():
    e = bpy.data.objects.new(nm, None); e.location = B(p); e.empty_display_size = 0.02; scn.collection.objects.link(e); objs.append(e)
vl = scn.view_layers[0]
for o in scn.objects: o.select_set(True, view_layer=vl)
glb = os.path.join(OUT, ID + '.glb')
with bpy.context.temp_override(scene=scn, view_layer=vl):
    bpy.ops.export_scene.gltf(filepath=glb, export_format='GLB', use_selection=True, use_active_scene=True, export_yup=True, export_materials='EXPORT', export_extras=False)
# previa de lado com as marcas (bolinhas); ferro sai vermelho
for nm, p in marks.items():
    bpy.ops.mesh.primitive_uv_sphere_add(radius=L * 0.012, location=B(p)); s = bpy.context.active_object; s.name = 'dot_' + nm
    s.data.materials.append(mat('dot_' + nm, {'m_grip': (0, 0.3, 1), 'm_fore': (1, 0, 0), 'm_muzzle': (1, 0.6, 0), 'm_rail0': (0, 1, 0.2), 'm_rail1': (0, 1, 0.2), 'm_well': (1, 0, 1)}[nm]))
cd = bpy.data.cameras.new('tpc'); cd.type = 'ORTHO'; cd.ortho_scale = L * 1.1
cam = bpy.data.objects.new('tpc', cd); scn.collection.objects.link(cam); scn.camera = cam
cam.location = Vector((L * 3, 0, 0)); cam.rotation_euler = (Vector((0, 0, 0)) - cam.location).to_track_quat('-Z', 'Y').to_euler()
scn.render.engine = 'BLENDER_WORKBENCH'; sh = scn.display.shading; sh.light = 'STUDIO'; sh.color_type = 'MATERIAL'; sh.show_object_outline = True
scn.render.resolution_x, scn.render.resolution_y = 900, 420
scn.render.filepath = os.path.join(HERE, 'out', 'ttp-' + ID + '.png'); bpy.ops.render.render(write_still=True, scene=scn.name)
result = {'core_w': round(CORE_W / G['len'], 3), 'id': ID, 'len_m': round(L, 3), 'alt_m': round(H, 3), 'ferro_del': ferro, 'luneta_cut': luneta, 'pecas': cont, 'tri': sum(len(o.data.polygons) for o in objs if o.type == 'MESH'), 'glb': glb}
