# Mapa remodelado no Blender (06/11, pedido dele; nasceu da Vila). Generico: MAP = 'vila' | 'fronteira' | ... (a ponte
# manda `MAP = "x"` na 1a linha; sem isso, Vila). Le tools/blender/<MAP>-layout.json (de shared/map.js, scripts/map-layout.mjs),
# desenha cada peca na MEDIDA EXATA da caixa de colisao; detalhe (moldura, quina, faixa, cinta) sempre alguns cm pra fora e
# nunca no mesmo plano de outra face (checagem anti-pisca recusa exportar). Uma malha por material (map_<mat>). Exporta
# public/models/maps/<MAP>.glb e renderiza previas em tools/blender/out/. Coordenadas: jogo (x, y, z) -> Blender (x, -z, y).
import bpy, bmesh, json, math, os, random
from mathutils import Vector, Matrix

MAP = globals().get('MAP', 'vila')
HERE = r'D:\Desktop\fokusstudios\tinta-louca\tools\blender'
GLB = os.path.join(r'D:\Desktop\fokusstudios\tinta-louca\tools\blender\glb-raw', MAP + '.glb')  # cru; no fim o draco.py grava public/models/maps/<MAP>.glb comprimido
L = json.load(open(os.path.join(HERE, MAP + '-layout.json'), encoding='utf-8'))
# paleta por mapa: Vila = vilarejo de reboco colorido; Fronteira = forte de fronteira, adobe e madeira queimada de sol
TH = {
  'vila': {'walls': ['e8dcc4', 'e3c3a6', 'c9cdb4', 'bfc8cc', 'e8d69a'], 'wood': 'a0794f', 'woodd': '6b4a2c', 'woodl': 'c9a77a', 'stone': 'b9b2a4', 'stoned': '8f897e', 'slate': '4a4540', 'rock': '8a857c', 'sky': 'd8d2c4'},
  'estaleiro': {'walls': ['e8dcc4'], 'wood': '9a7a52', 'woodd': '5e4630', 'woodl': 'c4a57a', 'stone': 'c9c4b8', 'stoned': '8e8a80', 'slate': '4a4744', 'rock': '8a857c', 'sky': 'cfd3d2'},
  'fabrica': {'walls': ['e8dcc4'], 'wood': '9a7a52', 'woodd': '5e4630', 'woodl': 'c4a57a', 'stone': 'c9c4b8', 'stoned': '8e8a80', 'slate': '3e3a36', 'rock': '8a857c', 'sky': 'c9c4ba'},
  'refinaria': {'walls': ['e3d3b4', 'd9c39c', 'e8dcc0'], 'wood': '9a7a52', 'woodd': '5e4630', 'woodl': 'c4a57a', 'stone': 'cfc6b2', 'stoned': '9a917e', 'slate': '6e4a34', 'rock': 'b08a5e', 'sky': 'e6d9bf'},
  'ferradura': {'walls': ['e6dcc8', 'd9c7a8', 'e8d6b8', 'cfd2c8', 'e3cbb0'], 'wood': '8a6a4a', 'woodd': '5d4a3a', 'woodl': 'b89a74', 'stone': 'cfc9bd', 'stoned': '9d9584', 'slate': '3a3632', 'rock': '8a857c', 'sky': 'd9d6cc'},
  'docas': {'walls': ['e9c9a4', 'd9a98a', 'e8b98f', 'dcae86'], 'wood': '9d8263', 'woodd': '5e4630', 'woodl': 'c4a57a', 'stone': 'b9b2a4', 'stoned': '8b8478', 'slate': '5f4a3e', 'rock': '8a857c', 'sky': 'f0d2b0'},
  'tinteiro': {'walls': ['3b342f'], 'wood': '4a3d33', 'woodd': '241c16', 'woodl': '5b4a3c', 'stone': '4a443e', 'stoned': '2f2a26', 'slate': '1d1712', 'rock': '4a4540', 'sky': '14110f'},
  'moeda': {'walls': ['dcd6c8', 'c9cdb4', 'd9c7a8', 'bfc8cc', 'e3cbb0'], 'wood': '8a6a4a', 'woodd': '5d4a3a', 'woodl': 'b89a74', 'stone': 'b9bcb2', 'stoned': '7e847a', 'slate': '3a3d3a', 'rock': '8a857c', 'sky': 'd2d6d0'},
  'bonde': {'walls': ['e8dcc4', 'e3c3a6', 'c9cdb4', 'bfc8cc', 'e8d69a', 'd9b9a0'], 'wood': '9a7a52', 'woodd': '5e4630', 'woodl': 'c4a57a', 'stone': 'c2bcb0', 'stoned': '8a847a', 'slate': '4a4540', 'rock': '8a857c', 'sky': 'd6d2c6'},
  'apito': {'walls': ['e3d3b4', 'd9c39c', 'cfc9bd'], 'wood': '9a7a52', 'woodd': '5e4630', 'woodl': 'c4a57a', 'stone': 'c9c4b8', 'stoned': '8e8a80', 'slate': '5a4a40', 'rock': '8a857c', 'sky': 'd6d4c8'},
  'ilha': {'walls': ['e8dcc4', 'e3c3a6', 'c9cdb4', 'bfc8cc', 'e8d69a'], 'wood': 'a0794f', 'woodd': '6b4a2c', 'woodl': 'c9a77a', 'stone': 'b9b2a4', 'stoned': '8f897e', 'slate': '4a4540', 'rock': '8a857c', 'sky': 'd9d6c8'},
  'deserto': {'walls': ['e0b98a'], 'wood': '8a5f3a', 'woodd': '5a3d24', 'woodl': 'b08a5e', 'stone': 'c9a46e', 'stoned': '8e6a44', 'slate': '6e4a34', 'rock': 'b08a5e', 'sky': 'eed7ae'},
  'becos': {'walls': ['d9c9ac', 'cbb99a', 'c4c0ae', 'd8bda0'], 'wood': '8a6a4a', 'woodd': '54402c', 'woodl': 'b4946c', 'stone': 'aaa698', 'stoned': '7e7a6e', 'slate': '3e3a36', 'rock': '8a857c', 'sky': 'cfc8ba'},
  'feira': {'walls': ['e9c9a4', 'e3d3a8', 'd2c6a6', 'e0b890'], 'wood': 'a0794f', 'woodd': '6b4a2c', 'woodl': 'c9a77a', 'stone': 'cfc6b2', 'stoned': '9a917e', 'slate': '7a4a34', 'rock': '9a8b74', 'sky': 'e4dac0'},
  'largo': {'walls': ['dcd6c8', 'c9cdb4', 'bfc8cc', 'd9c7a8'], 'wood': '8a6a4a', 'woodd': '5d4a3a', 'woodl': 'b89a74', 'stone': 'b9bcb2', 'stoned': '7e847a', 'slate': '3a3d3a', 'rock': '8a857c', 'sky': 'd2d6d0'},
  'cortejo': {'walls': ['e9d3a8', 'e3c3a6', 'c9d0bc', 'bfc8cc', 'e8d69a', 'd9b9a0'], 'wood': '9a7a52', 'woodd': '5e4630', 'woodl': 'c4a57a', 'stone': 'c2bcb0', 'stoned': '8a847a', 'slate': '4a4540', 'rock': '8a857c', 'sky': 'dcd6c6'},
  'xilindro': {'walls': ['e6dfcc'], 'wood': '8a6a4a', 'woodd': '5d4a3a', 'woodl': 'b89a74', 'stone': 'b9b6ae', 'stoned': '8a877e', 'slate': '3a3836', 'rock': '8a857c', 'sky': 'c4c6c2'},
  'trapiche': {'walls': ['e9c9a4', 'd9a98a', 'e8b98f', 'dcae86'], 'wood': '9d8263', 'woodd': '5e4630', 'woodl': 'c4a57a', 'stone': 'b9b2a4', 'stoned': '8b8478', 'slate': '5f4a3e', 'rock': '8a857c', 'sky': 'f0d2b0'},
  'fronteira': {'walls': ['e3cfae', 'd9b48f', 'e8dcc0', 'cfa98a', 'ddc59a'], 'wood': '94704a', 'woodd': '5e4128', 'woodl': 'bf9c70', 'stone': 'c2b49a', 'stoned': '948670', 'slate': '7a4a34', 'rock': '9a8b74', 'sky': 'dcd8cc'},
}[MAP]
EAVE = 0.35
os.makedirs(os.path.dirname(GLB), exist_ok=True); os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)

SCN = 'RR_' + MAP.capitalize()
scn = bpy.data.scenes.get(SCN) or bpy.data.scenes.new(SCN)
bpy.context.window.scene = scn
for o in list(scn.collection.all_objects): bpy.data.objects.remove(o, do_unlink=True)

def srgb(h): return tuple(((int(h[i:i + 2], 16) / 255) ** 2.2) for i in (0, 2, 4))
MATS = {}
def mat(name, hexcol):
    if name in MATS: return name
    m = bpy.data.materials.get(MAP + '_' + name) or bpy.data.materials.new(MAP + '_' + name)
    m.use_nodes = True; c = (*srgb(hexcol), 1); m.diffuse_color = c
    b = m.node_tree.nodes.get('Principled BSDF'); b.inputs['Base Color'].default_value = c; b.inputs['Roughness'].default_value = 0.9
    MATS[name] = {'m': m, 'bm': bmesh.new()}
    return name
WOOD, WOODD, WOODL = mat('wood', TH['wood']), mat('wood_dark', TH['woodd']), mat('wood_light', TH['woodl'])
STONE, STONED, SLATE = mat('stone', TH['stone']), mat('stone_dark', TH['stoned']), mat('roof_slate', TH['slate'])
ROCK, ROCKD = mat('rock', TH['rock']), mat('rock_dark', '6f6556')
RRED, RBLUE, TRIM = mat('roof_red', 'a83a2c'), mat('roof_blue', '2f5b8a'), mat('trim', 'f0ebe0')
GLASS, METAL, PAPER = mat('glass', '2b3440'), mat('metal', '3d3a36'), mat('paper', 'ece9e1')
WALLS = [mat('wall_%d' % i, c) for i, c in enumerate(TH['walls'])]

def B(x, y, z): return Vector((x, -z, y))  # jogo -> Blender
VOL = []  # volume (Blender) de cada caixa alinhada: a checagem ignora face enterrada dentro de outra peca
def box(mname, mn, mx):
    """caixa alinhada, em coordenadas do jogo"""
    bm = MATS[mname]['bm']
    a, c = B(*mn), B(*mx); VOL.append((min(a.x, c.x), max(a.x, c.x), min(a.y, c.y), max(a.y, c.y), min(a.z, c.z), max(a.z, c.z)))
    x0, y0, z0 = mn; x1, y1, z1 = mx
    vs = [bm.verts.new(B(x, y, z)) for x in (x0, x1) for y in (y0, y1) for z in (z0, z1)]
    i = lambda a, b, c: vs[a * 4 + b * 2 + c]
    for f in ((i(0,0,0), i(0,0,1), i(0,1,1), i(0,1,0)), (i(1,0,0), i(1,1,0), i(1,1,1), i(1,0,1)),
              (i(0,0,0), i(1,0,0), i(1,0,1), i(0,0,1)), (i(0,1,0), i(0,1,1), i(1,1,1), i(1,1,0)),
              (i(0,0,0), i(0,1,0), i(1,1,0), i(1,0,0)), (i(0,0,1), i(1,0,1), i(1,1,1), i(0,1,1))):
        bm.faces.new(f)
def obox(mname, c, size, ry=0.0, rz=0.0, rx=0.0):
    """caixa orientada: centro c (jogo), tamanho (sx, sy, sz), rotacoes em graus no espaco do jogo (y = vertical)"""
    bm = MATS[mname]['bm']; sx, sy, sz = (s / 2 for s in size)
    R = Matrix.Rotation(math.radians(ry), 3, 'Y') @ Matrix.Rotation(math.radians(rz), 3, 'Z') @ Matrix.Rotation(math.radians(rx), 3, 'X')
    pts = [R @ Vector((x * sx, y * sy, z * sz)) for x in (-1, 1) for y in (-1, 1) for z in (-1, 1)]
    vs = [bm.verts.new(B(c[0] + p.x, c[1] + p.y, c[2] + p.z)) for p in pts]
    i = lambda a, b, cc: vs[a * 4 + b * 2 + cc]
    for f in ((i(0,0,0), i(0,0,1), i(0,1,1), i(0,1,0)), (i(1,0,0), i(1,1,0), i(1,1,1), i(1,0,1)),
              (i(0,0,0), i(1,0,0), i(1,0,1), i(0,0,1)), (i(0,1,0), i(0,1,1), i(1,1,1), i(1,1,0)),
              (i(0,0,0), i(0,1,0), i(1,1,0), i(1,0,0)), (i(0,0,1), i(1,0,1), i(1,1,1), i(0,1,1))):
        bm.faces.new(f)
def prism(mname, poly, a0, a1, alongX):
    """poligono (u, y) no corte transversal, extrudado de a0 a a1 no eixo comprido (x se alongX, senao z)"""
    bm = MATS[mname]['bm']
    P = lambda u, y, a: B(a, y, u) if alongX else B(u, y, a)
    s0 = [bm.verts.new(P(u, y, a0)) for u, y in poly]; s1 = [bm.verts.new(P(u, y, a1)) for u, y in poly]
    n = len(poly)
    bm.faces.new(list(reversed(s0))); bm.faces.new(s1)
    for k in range(n):
        bm.faces.new((s0[k], s0[(k + 1) % n], s1[(k + 1) % n], s1[k]))
def cyl(mname, c, r, y0, y1, seg=20, r2=None):
    bm = MATS[mname]['bm']; r2 = r if r2 is None else r2
    b0 = [bm.verts.new(B(c[0] + math.cos(t) * r, y0, c[1] + math.sin(t) * r)) for t in (k / seg * 2 * math.pi for k in range(seg))]
    if r2 > 0.001:
        b1 = [bm.verts.new(B(c[0] + math.cos(t) * r2, y1, c[1] + math.sin(t) * r2)) for t in (k / seg * 2 * math.pi for k in range(seg))]
        bm.faces.new(list(reversed(b1)) if False else b1[::-1]); bm.faces.new(b0)
        for k in range(seg): bm.faces.new((b0[k], b0[(k + 1) % seg], b1[(k + 1) % seg], b1[k]))
    else:
        tip = bm.verts.new(B(c[0], y1, c[1])); bm.faces.new(b0)
        for k in range(seg): bm.faces.new((b0[(k + 1) % seg], b0[k], tip))

def dims(b): return [b['max'][i] - b['min'][i] for i in range(3)], [(b['max'][i] + b['min'][i]) / 2 for i in range(3)]
rng = random.Random(7)

# ---------- janela e porta numa face ----------
def window(face, cx, cy, cz, w=1.0, h=1.2):
    """face: '+x','-x','+z','-z'; (cx,cy,cz) = centro na superficie"""
    n = {'+x': (1, 0, 0), '-x': (-1, 0, 0), '+z': (0, 0, 1), '-z': (0, 0, -1)}[face]; ax = face[1] == 'x'
    def slab(off, du, dv, dt, m):  # retangulo paralelo a face, afastado off
        x, z = cx + n[0] * off, cz + n[2] * off
        mn = [x - (dt if ax else du) / 2, cy - dv / 2, z - (du if ax else dt) / 2]; mx = [x + (dt if ax else du) / 2, cy + dv / 2, z + (du if ax else dt) / 2]
        box(m, mn, mx)
    slab(0.015, w, h, 0.03, GLASS)                     # vidro: 0..0,03 pra fora
    for s in (-1, 1):                                   # moldura: 0..0,07 pra fora
        x, z = (cx + n[0] * 0.035, cz + n[2] * 0.035)
        if ax: box(TRIM, [x - 0.035, cy - h / 2 - 0.08, z + s * w / 2 - 0.06], [x + 0.035, cy + h / 2 + 0.08, z + s * w / 2 + 0.06])
        else: box(TRIM, [x + s * w / 2 - 0.06, cy - h / 2 - 0.08, z - 0.035], [x + s * w / 2 + 0.06, cy + h / 2 + 0.08, z + 0.035])
    for s in (-1, 1):
        x, z = (cx + n[0] * 0.036, cz + n[2] * 0.036)
        if ax: box(TRIM, [x - 0.036, cy + s * h / 2 - 0.06, z - w / 2 - 0.05], [x + 0.036, cy + s * h / 2 + 0.06, z + w / 2 + 0.05])
        else: box(TRIM, [x - w / 2 - 0.05, cy + s * h / 2 - 0.06, z - 0.036], [x + w / 2 + 0.05, cy + s * h / 2 + 0.06, z + 0.036])
    x, z = (cx + n[0] * 0.03, cz + n[2] * 0.03)          # cruz da janela
    if ax: box(TRIM, [x - 0.03, cy - h / 2, z - 0.03], [x + 0.03, cy + h / 2, z + 0.03]); box(TRIM, [x - 0.031, cy - 0.03, z - w / 2], [x + 0.031, cy + 0.03, z + w / 2])
    else: box(TRIM, [x - 0.03, cy - h / 2, z - 0.03], [x + 0.03, cy + h / 2, z + 0.03]); box(TRIM, [x - w / 2, cy - 0.03, z - 0.031], [x + w / 2, cy + 0.03, z + 0.031])
def door(face, cx, cz, y0, w=1.2, h=2.2):
    n = {'+x': (1, 0, 0), '-x': (-1, 0, 0), '+z': (0, 0, 1), '-z': (0, 0, -1)}[face]; ax = face[1] == 'x'
    x, z = cx + n[0] * 0.025, cz + n[2] * 0.025
    if ax: box(WOODD, [x - 0.025, y0, z - w / 2], [x + 0.025, y0 + h, z + w / 2])
    else: box(WOODD, [x - w / 2, y0, z - 0.025], [x + w / 2, y0 + h, z + 0.025])
    x, z = cx + n[0] * 0.045, cz + n[2] * 0.045
    for s in (-1, 1):
        if ax: box(TRIM, [x - 0.045, y0, z + s * w / 2 - 0.07], [x + 0.045, y0 + h + 0.1, z + s * w / 2 + 0.07])
        else: box(TRIM, [x + s * w / 2 - 0.07, y0, z - 0.045], [x + s * w / 2 + 0.07, y0 + h + 0.1, z + 0.045])
    if ax: box(TRIM, [x - 0.046, y0 + h, z - w / 2 - 0.065], [x + 0.046, y0 + h + 0.14, z + w / 2 + 0.065])
    else: box(TRIM, [x - w / 2 - 0.065, y0 + h, z - 0.046], [x + w / 2 + 0.065, y0 + h + 0.14, z + 0.046])
    x, z = cx + n[0] * 0.07, cz + n[2] * 0.07          # macaneta
    obox(METAL, (x + (0 if ax else w * 0.3), y0 + 1.05, z + (w * 0.3 if ax else 0)), (0.09, 0.09, 0.09))

# ---------- casa ----------
def house(b):
    (w, h, d), (cx, cy, cz) = dims(b); y0 = b['min'][1]
    wall = WALLS[(b.get('seed') or 0) % len(WALLS)]
    roofm = RRED if b.get('team') == 'red' else RBLUE if b.get('team') == 'blue' else SLATE
    box(wall, b['min'], b['max'])
    # rodape de pedra e quinas de madeira (pra fora da parede)
    box(STONE, [b['min'][0] - 0.04, y0, b['min'][2] - 0.04], [b['max'][0] + 0.04, y0 + 0.55, b['max'][2] + 0.04])  # 4 cm: a porta sai 5 (planos diferentes)
    for sx in (b['min'][0], b['max'][0]):
        for sz in (b['min'][2], b['max'][2]):
            box(WOODL, [sx - 0.16, y0 + 0.55, sz - 0.16], [sx + 0.16, y0 + h - 0.02, sz + 0.16])
    # porta na face virada pro centro do mapa; janelas por andar nas 4 faces
    dface = ('-x' if cx > 0 else '+x') if abs(cx) > abs(cz) else ('-z' if cz > 0 else '+z')
    floors = max(1, int(h // 3.2))
    for face in ('+x', '-x', '+z', '-z'):
        ax = face[1] == 'x'; length = d if ax else w
        fx = b['max'][0] if face == '+x' else b['min'][0] if face == '-x' else cx
        fz = b['max'][2] if face == '+z' else b['min'][2] if face == '-z' else cz
        nwin = max(1, int((length - 1.2) // 2.8))
        for fl in range(floors):
            yy = y0 + 1.75 + fl * 3.1
            if yy + 0.8 > y0 + h - 0.3: break
            for k in range(nwin):
                off = (k - (nwin - 1) / 2) * (length / nwin)
                if face == dface and fl == 0 and abs(off) < 1.6: continue
                window(face, fx if ax else cx + off, yy, cz + off if ax else fz)
        if face == dface: door(face, fx if face[1] == 'x' else cx, fz if face[1] == 'z' else cz, y0 + 0.02)
    top = y0 + h
    if b.get('roof') == 'peak':
        alongX = w >= d; W, Lg = (d, w) if alongX else (w, d); rh = h * 0.4
        cu = cz if alongX else cx; ca = cx if alongX else cz
        hw = W / 2 + EAVE; th = 0.2
        # telhado: chapa em V (superficie de cima = a do calculo da colisao), beiral em volta
        poly = [(-hw, top - th), (-hw, top), (0, top + rh), (hw, top), (hw, top - th), (0, top + rh - th * 1.6)]
        prism(roofm, [(cu + u, y) for u, y in poly], ca - Lg / 2 - EAVE, ca + Lg / 2 + EAVE, alongX)
        # oitao (triangulo da parede embaixo do telhado), alinhado com a parede
        prism(wall, [(cu - W / 2, top), (cu + W / 2, top), (cu, top + rh - th * 1.7)], ca - Lg / 2, ca + Lg / 2, alongX)
        # cumeeira e chamine
        if alongX: box(WOODD, [ca - Lg / 2 - EAVE - 0.04, top + rh - 0.05, cu - 0.14], [ca + Lg / 2 + EAVE + 0.04, top + rh + 0.12, cu + 0.14])  # cumeeira passa 4 cm da ponta do telhado
        else: box(WOODD, [cu - 0.14, top + rh - 0.05, ca - Lg / 2 - EAVE - 0.04], [cu + 0.14, top + rh + 0.12, ca + Lg / 2 + EAVE + 0.04])
        chx, chz = (ca + Lg * 0.22, cu + W * 0.2) if alongX else (cu + W * 0.2, ca + Lg * 0.22)
        box(STONED, [chx - 0.35, top + rh * 0.3, chz - 0.35], [chx + 0.35, top + rh + 0.7, chz + 0.35])
        box(STONE, [chx - 0.42, top + rh + 0.7, chz - 0.42], [chx + 0.42, top + rh + 0.85, chz + 0.42])
    else:
        # telhado reto: platibanda (aba em volta), caixa d'agua pequena e chamine
        box(roofm, [b['min'][0] - 0.2, top, b['min'][2] - 0.2], [b['max'][0] + 0.2, top + 0.35, b['max'][2] + 0.2])
        box(STONED, [cx + w * 0.25 - 0.35, top + 0.35, cz - 0.35], [cx + w * 0.25 + 0.35, top + 1.5, cz + 0.35])

# ---------- pecas soltas ----------
def crate(b):
    (w, h, d), _ = dims(b); mn, mx = b['min'], b['max']
    box(WOOD, mn, mx)
    e1, e2 = 0.03, 0.04  # vigas: horizontais 3 cm pra fora, verticais 4 cm (planos diferentes = sem piscar)
    for y in (mn[1], mx[1]):
        for z in (mn[2], mx[2]): box(WOODD, [mn[0] - e1, y - 0.07, z - 0.07], [mx[0] + e1, y + 0.07, z + 0.07])
        for x in (mn[0], mx[0]): box(WOODD, [x - 0.06, y - 0.06, mn[2] - e1 + 0.005], [x + 0.06, y + 0.06, mx[2] + e1 - 0.005])
    for x in (mn[0], mx[0]):
        for z in (mn[2], mx[2]): box(WOODD, [x - 0.085, mn[1] - 0.001, z - 0.085], [x + 0.085, mx[1] + e2, z + 0.085])
    # travessa em X nas faces do lado comprido
    c = [(mn[i] + mx[i]) / 2 for i in range(3)]
    if w >= d:
        for z in (mn[2] - 0.02, mx[2] + 0.02): obox(WOODD, (c[0], c[1], z), (math.hypot(w, h) * 0.92, 0.1, 0.04), rz=math.degrees(math.atan2(h, w)))
    else:
        for x in (mn[0] - 0.02, mx[0] + 0.02): obox(WOODD, (x, c[1], c[2]), (0.04, 0.1, math.hypot(d, h) * 0.92), rx=-math.degrees(math.atan2(h, d)))
def post(b, m=WOOD):
    box(m, b['min'], b['max']); mn, mx = b['min'], b['max']
    box(STONED, [mn[0] - 0.06, mn[1], mn[2] - 0.06], [mx[0] + 0.06, mn[1] + 0.25, mx[2] + 0.06])
def deck(b):
    mn, mx = b['min'], b['max']; (w, h, d), c = dims(b)
    if mn[1] < 0.1:   # praca do meio: bloco de pedra com borda
        box(STONE, mn, mx); box(STONED, [mn[0] - 0.05, mx[1] - 0.18, mn[2] - 0.05], [mx[0] + 0.05, mx[1] + 0.02, mx[2] + 0.05]); return
    box(WOOD, mn, mx)  # deck de tabuas no alto: frisos de tabua em cima e viga embaixo
    along = w >= d; n = int((d if along else w) / 0.5)
    for k in range(1, n):
        if along: box(WOODD, [mn[0], mx[1], mn[2] + k * d / n - 0.02], [mx[0], mx[1] + 0.012, mn[2] + k * d / n + 0.02])
        else: box(WOODD, [mn[0] + k * w / n - 0.02, mx[1], mn[2]], [mn[0] + k * w / n + 0.02, mx[1] + 0.012, mx[2]])
    for s in (mn[2], mx[2]) if along else (mn[0], mx[0]):
        if along: box(WOODD, [mn[0] - 0.02, mn[1] - 0.25, s - 0.09], [mx[0] + 0.02, mn[1] + 0.001, s + 0.09])
        else: box(WOODD, [s - 0.09, mn[1] - 0.25, mn[2] - 0.02], [s + 0.09, mn[1] + 0.001, mx[2] + 0.02])
INDUSTRIAL = ('fabrica', 'refinaria', 'estaleiro', 'docas', 'xilindro')  # trapiche saiu (13/11 b): virou vila
def step(b):
    mx, mn = b['max'], b['min']
    body, nose = ('steel', 'crane_yellow') if MAP in INDUSTRIAL else (WOODL, WOODD)  # industrial: degrau de aco com quina amarela (mat criado no topo, antes do desenho)
    box(body, [mn[0] + 0.003, mn[1], mn[2] + 0.003], [mx[0] - 0.003, mx[1], mx[2] - 0.003]); box(nose, [mn[0] - 0.015, mx[1] - 0.06, mn[2] - 0.015], [mx[0] + 0.015, mx[1] + 0.018, mx[2] + 0.015])  # 1,8 cm: plataforma de torre/sacada fica em +1,2 (planos diferentes)
def tank(b):
    (w, h, d), c = dims(b); r = w / 2; y0, y1 = b['min'][1], b['max'][1]
    cyl(WOOD, (c[0], c[2]), r, y0, y1, 28)
    for yy in (y0 + 0.4, (y0 + y1) / 2, y1 - 0.4): cyl(METAL, (c[0], c[2]), r + 0.04, yy - 0.09, yy + 0.09, 28)
    cyl(SLATE, (c[0], c[2]), r + 0.35, y1, y1 + 2.4, 28, r2=0)
    cyl(WOODD, (c[0], c[2]), r + 0.38, y1 - 0.02, y1 + 0.06, 28)
def border(b):
    mn, mx = b['min'], b['max']; (w, h, d), c = dims(b)
    box(WOODD, mn, mx)
    along = w > d; n = int((w if along else d) / 4)
    for k in range(n + 1):
        t = -0.5 + k / max(1, n)
        if along: box(WOOD, [c[0] + t * w - 0.22, mn[1], mn[2] - 0.08], [c[0] + t * w + 0.22, mx[1] + 0.3, mx[2] + 0.08])
        else: box(WOOD, [mn[0] - 0.08, mn[1], c[2] + t * d - 0.22], [mx[0] + 0.08, mx[1] + 0.3, c[2] + t * d + 0.22])
    box(WOODL, [mn[0] - 0.05, mx[1], mn[2] - 0.05], [mx[0] + 0.05, mx[1] + 0.18, mx[2] + 0.05])
def hwall(b):
    col = b.get('col'); key = 'hw_%06x' % (col or 0xe8dcc4)
    mat(key, '%06x' % (col or 0xe8dcc4)); box(key, b['min'], b['max'])
def table(b):
    mn, mx = b['min'], b['max']
    box(WOOD, [mn[0], mx[1] - 0.1, mn[2]], mx)
    for x in (mn[0] + 0.06, mx[0] - 0.14):
        for z in (mn[2] + 0.06, mx[2] - 0.14): box(WOODD, [x, mn[1], z], [x + 0.08, mx[1] - 0.1, z + 0.08])

# ---------- Fronteira (06/11): pedra, torre de vigia, palicada e mureta ----------
def rock(b):
    """pedra facetada: casco convexo que CONTEM a caixa de colisao (SHAPE_TIERS.rock = 0,56 da base x 0,9 da altura) e cabe no desenho"""
    (w, h, d), c = dims(b); y0 = b['min'][1]; r = random.Random(int(c[0] * 7 + c[2] * 13))
    pts = [B(c[0] + sx * w * 0.29, y0 + (h * 0.92 if sy else 0), c[2] + sz * d * 0.29) for sx in (-1, 1) for sy in (0, 1) for sz in (-1, 1)]
    for k in range(22):
        a = r.uniform(0, 2 * math.pi); e = r.uniform(0.05, 1.0); rr = math.sqrt(max(0.0, 1 - e * e)) * r.uniform(0.82, 1.0)
        pts.append(B(c[0] + math.cos(a) * rr * w * 0.5, y0 + e * h * r.uniform(0.9, 1.0), c[2] + math.sin(a) * rr * d * 0.5))
    for k in range(8):
        a = k / 8 * 2 * math.pi + r.uniform(-0.2, 0.2)
        pts.append(B(c[0] + math.cos(a) * w * 0.5 * r.uniform(0.85, 1.0), y0, c[2] + math.sin(a) * d * 0.5 * r.uniform(0.85, 1.0)))
    tmp = bmesh.new(); vs = [tmp.verts.new(p) for p in pts]
    bmesh.ops.convex_hull(tmp, input=vs); me = bpy.data.meshes.new('tmp_rock'); tmp.to_mesh(me); tmp.free()
    MATS[ROCK]['bm'].from_mesh(me); bpy.data.meshes.remove(me)
def tower(b):
    """torre de vigia: base de pedra, corpo de tabua em pe, mastros nas quinas, plataforma de cima e bandeira do time"""
    (w, h, d), c = dims(b); mn, mx = b['min'], b['max']; y0 = mn[1]
    box(WOOD, mn, mx)
    box(STONED, [mn[0] - 0.08, y0, mn[2] - 0.08], [mx[0] + 0.08, y0 + 1.1, mx[2] + 0.08])
    for x in (mn[0], mx[0]):
        for z in (mn[2], mx[2]): box(WOODD, [x - 0.2, y0 + 1.1, z - 0.2], [x + 0.2, mx[1] - 0.05, z + 0.2])
    n = int(w / 0.62)
    for k in range(1, n):  # frestas das tabuas (faixa escura 2 cm pra fora)
        t = mn[0] + k * w / n
        for z in (mn[2] - 0.02, mx[2] + 0.02): box(WOODD, [t - 0.035, y0 + 1.1, z - 0.02], [t + 0.035, mx[1] - 0.3, z + 0.02])
        t = mn[2] + k * d / n
        for x in (mn[0] - 0.02, mx[0] + 0.02): box(WOODD, [x - 0.02, y0 + 1.1, t - 0.035], [x + 0.02, mx[1] - 0.3, t + 0.035])
    for yy in (y0 + 2.6, mx[1] - 1.2):  # cintas de viga em volta
        box(WOODD, [mn[0] - 0.07, yy, mn[2] - 0.07], [mx[0] + 0.07, yy + 0.22, mx[2] + 0.07])
    box(WOODL, [mn[0] - 0.25, mx[1] - 0.32, mn[2] - 0.25], [mx[0] + 0.25, mx[1] + 0.012, mx[2] + 0.25])  # plataforma (pisa em h)
    for x in (mn[0] - 0.12, mx[0] + 0.12):
        for z in (mn[2] - 0.12, mx[2] + 0.12): box(WOODD, [x - 0.09, mx[1] + 0.012, z - 0.09], [x + 0.09, mx[1] + 0.75, z + 0.09])
    if b.get('team'):
        px, pz = mx[0] - 0.12, mx[2] - 0.12
        cyl(METAL, (px, pz), 0.05, mx[1] + 0.75, mx[1] + 3.4, 8)
        tm = RRED if b['team'] == 'red' else RBLUE
        box(tm, [px - 1.45, mx[1] + 2.45, pz - 0.03], [px - 0.06, mx[1] + 3.3, pz + 0.03])
def palisade(b):
    """muro do forte: troncos em pe com ponta, encostados nos dois lados de um nucleo na medida da colisao"""
    mn, mx = b['min'], b['max']; (w, h, d), c = dims(b)
    box(WOODD, mn, mx)
    along = w > d; Lg = w if along else d; n = int(Lg / 0.62); r = random.Random(int(c[0] + c[2] * 3))
    for k in range(n):
        t = (mn[0] if along else mn[2]) + (k + 0.5) * Lg / n
        inner = -1 if (c[2] if along else c[0]) > 0 else 1   # so o lado de DENTRO do mapa (o de fora ninguem ve: metade dos triangulos)
        if along: px, pz = t, (mn[2] if inner < 0 else mx[2])
        else: px, pz = (mn[0] if inner < 0 else mx[0]), t
        top = mx[1] + r.uniform(-0.25, 0.2)
        cyl(WOOD, (px, pz), 0.3, mn[1], top, 6)
        cyl(WOODL, (px, pz), 0.3, top - 0.03, top + 0.55, 6, r2=0)
    for yy in (mn[1] + 1.4, mx[1] - 1.6):  # travessas de amarra
        if along: box(WOODL, [mn[0], yy, mn[2] - 0.36], [mx[0], yy + 0.2, mx[2] + 0.36])
        else: box(WOODL, [mn[0] - 0.36, yy, mn[2]], [mx[0] + 0.36, yy + 0.2, mx[2]])
def mureta(b):
    """mureta de adobe com fiada de sacos de areia no topo (os sacos fecham exatamente na altura da colisao)"""
    mn, mx = b['min'], b['max']; (w, h, d), c = dims(b); top = mx[1]
    box(STONE, mn, [mx[0], top - 0.3, mx[2]])
    box(STONED, [mn[0] - 0.05, mn[1], mn[2] - 0.05], [mx[0] + 0.05, mn[1] + 0.3, mx[2] + 0.05])
    along = w > d; Lg = w if along else d; n = max(1, int(Lg / 0.7)); r = random.Random(int(c[0] * 5 + c[2]))
    for row, dw in ((0, 0.0), (1, 0.5)):
        for k in range(n - row):
            t = (mn[0] if along else mn[2]) + (k + 0.5 + dw) * Lg / n
            yy = top - 0.3 + row * 0.15 + 0.075
            sz = (Lg / n * 0.96, 0.17, (d if along else w) + 0.08 - row * 0.12)
            if along: obox(SAND, (t, yy, c[2]), sz, ry=r.uniform(-3, 3))
            else: obox(SAND, (c[0], yy, t), (sz[2], sz[1], sz[0]), ry=r.uniform(-3, 3))
SAND = mat('sandbag', 'b7a37c')
# ---------- porto (Estaleiro, Docas, Refinaria, Ilha): conteiner, guindaste, muro do cais ----------
CONT_COLS = ['9c4a36', '3f6a8a', '5f7f3e', 'b08a3a', '7a4f7a', '4f7f7a', 'a8653a', '5a5f8f']  # mesmas do world.js
def dk(h, k=0.78): return ''.join('%02x' % int(int(h[i:i + 2], 16) * k) for i in (0, 2, 4))
def contmat(seed): i = (seed or 0) % len(CONT_COLS); return mat('cont_%d' % i, CONT_COLS[i]), mat('cont_%d_d' % i, dk(CONT_COLS[i]))
YEL, YELD, HAZ = mat('crane_yellow', 'd9a63a'), mat('crane_yellow_d', 'a87a22'), mat('hazard_black', '26231f')
DOORM, BUOY, BUOYW = mat('cont_door', '3a3632'), mat('buoy_orange', 'd9682c'), mat('buoy_white', 'f0ebe0')
CONC, CONCD = mat('concrete', 'cfc9bd'), mat('concrete_d', '9c978c')
def ribs(m, mn, mx, alongX, faces, out=0.035, y0=None, y1=None):
    """frisos verticais da chapa ondulada nas faces compridas (faces: -1/+1 = lado de baixo/de cima do eixo curto)"""
    L = (mx[0] - mn[0]) if alongX else (mx[2] - mn[2]); n = max(2, int(L / 0.5)); y0 = mn[1] + 0.16 if y0 is None else y0; y1 = mx[1] - 0.16 if y1 is None else y1
    for k in range(1, n):
        t = (mn[0] if alongX else mn[2]) + k * L / n
        for f in faces:
            if alongX: z = mn[2] if f < 0 else mx[2]; box(m, [t - 0.05, y0, z - out], [t + 0.05, y1, z + out])
            else: x = mn[0] if f < 0 else mx[0]; box(m, [x - out, y0, t - 0.05], [x + out, y1, t + 0.05])
def container(b):
    mn, mx = b['min'], b['max']; (w, h, d), c = dims(b); alongX = w > d; col, cold = contmat(b.get('seed'))
    box(col, mn, mx)
    ribs(cold, mn, mx, alongX, (-1, 1))
    for yy in (mn[1] + 0.015, mx[1] - 0.175):  # longarinas de baixo e de cima (5 cm pra fora; 1,5 cm longe do topo/fundo: planos diferentes)
        box(cold, [mn[0] - (0 if alongX else 0.05), yy, mn[2] - (0.05 if alongX else 0)], [mx[0] + (0 if alongX else 0.05), yy + 0.16, mx[2] + (0.05 if alongX else 0)])
    for x in (mn[0], mx[0]):  # quinas: coluna 6 cm pra fora, peca de canto em cima e embaixo (8 cm)
        for z in (mn[2], mx[2]):
            box(DOORM, [x - 0.12, mn[1] + 0.22, z - 0.12], [x + 0.12, mx[1] - 0.22, z + 0.12])
            for y0, y1 in ((mn[1] - 0.012, mn[1] + 0.22), (mx[1] - 0.22, mx[1] + 0.015)): box(METAL, [x - 0.14, y0, z - 0.14], [x + 0.14, y1, z + 0.14])  # a de cima passa 1,5 cm do teto
    for e in (-1, 1):  # portas nas pontas: chapa escura 3 cm pra fora + 4 trancas
        if alongX:
            x = mn[0] if e < 0 else mx[0]; box(DOORM, [x - 0.03, mn[1] + 0.12, mn[2] + 0.16], [x + 0.03, mx[1] - 0.12, mx[2] - 0.16])
            for k in (-0.75, -0.3, 0.3, 0.75): cyl(METAL, (x + e * 0.07, c[2] + k * d / 2 * 0.8), 0.03, mn[1] + 0.25, mx[1] - 0.25, 6)
        else:
            z = mn[2] if e < 0 else mx[2]; box(DOORM, [mn[0] + 0.16, mn[1] + 0.12, z - 0.03], [mx[0] - 0.16, mx[1] - 0.12, z + 0.03])
            for k in (-0.75, -0.3, 0.3, 0.75): cyl(METAL, (c[0] + k * w / 2 * 0.8, z + e * 0.07), 0.03, mn[1] + 0.25, mx[1] - 0.25, 6)
def contshell(b):
    """conteiner aberto (parede fina ou teto). Parede para 12 cm antes do topo: o teto cobre (sem face no mesmo plano)"""
    mn, mx = b['min'], b['max']; (w, h, d), c = dims(b); col, cold = contmat(b.get('seed'))
    if b.get('roof'):
        box(col, mn, mx); alongX = w > d; L = w if alongX else d; n = max(2, int(L / 0.5))
        for k in range(1, n):
            t = (mn[0] if alongX else mn[2]) + k * L / n
            if alongX: box(cold, [t - 0.05, mx[1], mn[2] + 0.1], [t + 0.05, mx[1] + 0.03, mx[2] - 0.1])
            else: box(cold, [mn[0] + 0.1, mx[1], t - 0.05], [mx[0] - 0.1, mx[1] + 0.03, t + 0.05])
        return
    top = mx[1] - 0.121; alongX = w > d
    box(col, mn, [mx[0], top, mx[2]])
    ribs(cold, mn, [mx[0], top, mx[2]], alongX, (-1, 1), y1=top - 0.1)
    box(cold, [mn[0] - (-0.015 if alongX else 0.05), mn[1] + 0.015, mn[2] - (0.05 if alongX else -0.015)], [mx[0] + (-0.015 if alongX else 0.05), mn[1] + 0.175, mx[2] + (0.05 if alongX else -0.015)])  # 1,5 cm curta nas pontas
def contdoor(b):
    mn, mx = b['min'], b['max']; (w, h, d), c = dims(b); alongX = w > d
    box(DOORM, mn, mx)
    for k in (-0.25, 0.25):
        for side in (-1, 1):
            if alongX: cyl(METAL, (c[0] + k * w, (mn[2] if side < 0 else mx[2]) + side * 0.035), 0.028, mn[1] + 0.15, mx[1] - 0.15, 6)
            else: cyl(METAL, ((mn[0] if side < 0 else mx[0]) + side * 0.035, c[2] + k * d), 0.028, mn[1] + 0.15, mx[1] - 0.15, 6)
def gantry_leg(b, YEL=None, YELD=None):
    """perna do portico: coluna amarela na medida, cintas a cada 1,5 m e diagonais (trelica) pra fora nas 4 faces
    (YEL/YELD: outra cor, ex. a torre de petroleo enferrujada da Ilha)"""
    YEL = YEL or globals()['YEL']; YELD = YELD or globals()['YELD']
    mn, mx = b['min'], b['max']; (w, h, d), c = dims(b)
    box(YEL, mn, mx)
    box(CONCD, [mn[0] - 0.3, mn[1], mn[2] - 0.3], [mx[0] + 0.3, mn[1] + 0.35, mx[2] + 0.3])  # sapata
    ys = [mn[1] + 0.35 + k * 1.45 for k in range(int((h - 0.6) / 1.45) + 1)]
    for yy in ys: box(YELD, [mn[0] - 0.05, yy, mn[2] - 0.05], [mx[0] + 0.05, yy + 0.14, mx[2] + 0.05])
    for i in range(len(ys) - 1):
        ya, yb = ys[i] + 0.14, ys[i + 1]; ln = math.hypot(yb - ya, w); ang = math.degrees(math.atan2(yb - ya, w)) * (1 if i % 2 else -1); cy = (ya + yb) / 2
        obox(YELD, (mx[0] + 0.03, cy, c[2]), (0.03, ln * 0.92, 0.1), rx=90 - abs(ang) if ang > 0 else -(90 - abs(ang)))
        obox(YELD, (mn[0] - 0.03, cy, c[2]), (0.03, ln * 0.92, 0.1), rx=-(90 - abs(ang)) if ang > 0 else 90 - abs(ang))
        obox(YELD, (c[0], cy, mx[2] + 0.03), (0.1, ln * 0.92, 0.03), rz=90 - abs(ang) if ang > 0 else -(90 - abs(ang)))
        obox(YELD, (c[0], cy, mn[2] - 0.03), (0.1, ln * 0.92, 0.03), rz=-(90 - abs(ang)) if ang > 0 else 90 - abs(ang))
    box(METAL, [mn[0] - 0.12, mx[1] - 0.3, mn[2] - 0.12], [mx[0] + 0.12, mx[1] + 0.015, mx[2] + 0.12])  # cabeca da perna (segura a viga; 1,5 cm acima do topo)
def gantry(b):
    """viga do guindaste: caixa amarela com listras de seguranca, trilho em cima, carrinho com cabo e gancho no meio (bem acima de todo mundo)"""
    mn, mx = b['min'], b['max']; (w, h, d), c = dims(b); alongX = w > d
    box(YEL, mn, mx)
    L = w if alongX else d; n = int(L / 0.8)
    for k in range(n):
        if k % 2: continue
        t = (mn[0] if alongX else mn[2]) + (k + 0.5) * L / n
        for side in (-1, 1):  # listra preta inclinada (paralelogramo cortado na faixa do meio)
            if alongX: obox(HAZ, (t, c[1], (mn[2] if side < 0 else mx[2]) + side * 0.02), (0.32, h * 0.5, 0.04), rz=35)
            else: obox(HAZ, ((mn[0] if side < 0 else mx[0]) + side * 0.02, c[1], t), (0.04, h * 0.5, 0.32), rx=35)
    for side in (-1, 1):  # trilhos em cima
        if alongX: box(METAL, [mn[0] + 0.3, mx[1], c[2] + side * 0.45 - 0.07], [mx[0] - 0.3, mx[1] + 0.12, c[2] + side * 0.45 + 0.07])
        else: box(METAL, [c[0] + side * 0.45 - 0.07, mx[1], mn[2] + 0.3], [c[0] + side * 0.45 + 0.07, mx[1] + 0.12, mx[2] - 0.3])
    tx = c[0] + (L * 0.12 if alongX else 0); tz = c[2] + (0 if alongX else L * 0.12)
    box(YELD, [tx - 0.9, mn[1] - 0.55, tz - 0.9], [tx + 0.9, mn[1] - 0.04, tz + 0.9])  # carrinho embaixo da viga
    for k in (-0.25, 0.25): cyl(METAL, (tx + (k if alongX else 0), tz + (0 if alongX else k)), 0.03, mn[1] - 2.6, mn[1] - 0.55, 6)
    box(HAZ, [tx - 0.35, mn[1] - 2.95, tz - 0.25], [tx + 0.35, mn[1] - 2.6, tz + 0.25])  # moitao
    cyl(METAL, (tx, tz), 0.06, mn[1] - 3.25, mn[1] - 2.95, 8)
    obox(METAL, (tx + 0.12, mn[1] - 3.35, tz), (0.34, 0.08, 0.08), rz=-30)  # gancho
def seawall(b):
    """muro do cais: concreto na medida, pilastras e faixa de seguranca do lado de dentro, capa em cima, boias e holofotes"""
    mn, mx = b['min'], b['max']; (w, h, d), c = dims(b); along = w > d; Lg = w if along else d
    inner = -1 if (c[2] if along else c[0]) > 0 else 1
    box(CONC, mn, [mx[0], mx[1] - 0.25, mx[2]])
    box(CONCD, [mn[0] - 0.1, mx[1] - 0.25, mn[2] - 0.1], [mx[0] + 0.1, mx[1], mx[2] + 0.1])
    face = (mn[2] if inner < 0 else mx[2]) if along else (mn[0] if inner < 0 else mx[0])
    def slab(t0, t1, y0, y1, out, m):
        if along: box(m, [t0, y0, face - (out if inner < 0 else 0)], [t1, y1, face + (out if inner > 0 else 0)])
        else: box(m, [face - (out if inner < 0 else 0), y0, t0], [face + (out if inner > 0 else 0), y1, t1])
    a0 = mn[0] if along else mn[2]; n = max(1, int(Lg / 4))
    for k in range(n + 1): t = a0 + k * Lg / n; slab(t - 0.3, t + 0.3, mn[1], mx[1] - 0.25, 0.22, CONCD)
    m = int(Lg / 0.7)
    for k in range(m): slab(a0 + k * Lg / m, a0 + (k + 1) * Lg / m, mn[1] + 0.25, mn[1] + 0.7, 0.05, YEL if k % 2 else HAZ)
    for k in range(n):
        t = a0 + (k + 0.5) * Lg / n
        if k % 2 == 0:  # boia salva-vidas: anel de 12 gomos, laranja e branco
            for j in range(12):
                a = j / 12 * 2 * math.pi; r = 0.32; u = t + math.cos(a) * r; y = mn[1] + 2.4 + math.sin(a) * r
                o = face + inner * 0.08
                tk = 0.12 if j % 3 else 0.15  # gomo branco 3 cm mais grosso: frente fora do plano do laranja
                if along: obox(BUOY if j % 3 else BUOYW, (u, y, o), (0.2, 0.13, tk), rz=math.degrees(a) + 90)
                else: obox(BUOY if j % 3 else BUOYW, (o, y, u), (tk, 0.13, 0.2), rx=-(math.degrees(a) + 90))
        else:  # holofote na capa
            px, pz = (t, face - inner * 0.6) if along else (face - inner * 0.6, t)
            cyl(METAL, (px, pz), 0.07, mx[1], mx[1] + 2.4, 8)
            hx, hz = (px, pz + inner * 0.25) if along else (px + inner * 0.25, pz)
            box(DOORM, [hx - 0.3, mx[1] + 2.25, hz - 0.3], [hx + 0.3, mx[1] + 2.7, hz + 0.3])

# ---------- fabrica (e o resto do industrial): tonel, maquina, passarela, cano, muro de tijolo ----------
STEEL, STEELD, STEELL = mat('steel', '5a5650'), mat('steel_d', '34312d'), mat('steel_l', '8a857c')
BRICK, BRICKD, PAINTR = mat('brick', '9a4e3a'), mat('brick_d', '6e3628'), mat('paint_red', 'b8352a')
def tube(m, axis, c, r, a0, a1, seg=12):
    """cilindro deitado: axis 'x' ou 'z', c = (y, outra coordenada) no jogo, de a0 a a1"""
    bm = MATS[m]['bm']; P = (lambda a, u, v: B(a, v, u)) if axis == 'x' else (lambda a, u, v: B(u, v, a))
    ring = lambda a: [bm.verts.new(P(a, c[1] + math.cos(t) * r, c[0] + math.sin(t) * r)) for t in (k / seg * 2 * math.pi + math.pi / seg for k in range(seg))]
    s0, s1 = ring(a0), ring(a1)
    bm.faces.new(s0[::-1]); bm.faces.new(s1)
    for k in range(seg): bm.faces.new((s0[k], s0[(k + 1) % seg], s1[(k + 1) % seg], s1[k]))
def vat(b):
    """tina de tinta QUADRADA (a colisao e a caixa toda): chapa rebitada, cintas, borda e a tinta vermelha no topo (onde se pisa)"""
    mn, mx = b['min'], b['max']; (w, h, d), c = dims(b); top = mx[1]
    box(STEEL, mn, [mx[0], top - 0.02, mx[2]])
    box(PAINTR, [mn[0] + 0.3, top - 0.1, mn[2] + 0.3], [mx[0] - 0.3, top, mx[2] - 0.3])  # tinta (topo = altura da colisao)
    for x0, x1, z0, z1 in ((mn[0] - 0.06, mx[0] + 0.06, mn[2] - 0.06, mn[2] + 0.3), (mn[0] - 0.06, mx[0] + 0.06, mx[2] - 0.3, mx[2] + 0.06),
                           (mn[0] - 0.06, mn[0] + 0.3, mn[2] + 0.3, mx[2] - 0.3), (mx[0] - 0.3, mx[0] + 0.06, mn[2] + 0.3, mx[2] - 0.3)):
        box(STEELD, [x0, top - 0.25, z0], [x1, top + 0.08, z1])  # borda (8 cm acima: degrau de nada)
    for yy in (mn[1] + 0.25, (mn[1] + top) / 2 - 0.1):
        box(STEELD, [mn[0] - 0.04, yy, mn[2] - 0.04], [mx[0] + 0.04, yy + 0.2, mx[2] + 0.04])
    for x in (mn[0], mx[0]):
        for z in (mn[2], mx[2]): box(STEELD, [x - 0.15, mn[1], z - 0.15], [x + 0.15, top - 0.26, z + 0.15])
    r = random.Random(int(c[0] * 3 + c[2]))  # escorrido de tinta descendo pela chapa
    for k in range(10):
        f = r.choice((0, 1, 2, 3)); t = r.uniform(0.12, 0.88); ln = r.uniform(0.4, 1.6); wd = r.uniform(0.12, 0.3)
        if f < 2:
            z = mn[2] if f == 0 else mx[2]; x = mn[0] + t * w; box(PAINTR, [x - wd / 2, top - 0.25 - ln, z - 0.02], [x + wd / 2, top - 0.25, z + 0.02])
        else:
            x = mn[0] if f == 2 else mx[0]; z = mn[2] + t * d; box(PAINTR, [x - 0.02, top - 0.25 - ln, z - wd / 2], [x + 0.02, top - 0.25, z + wd / 2])
def machine(b):
    """maquina: corpo escuro na medida, faixa de seguranca, painel com mostradores e alavanca, cor do time nas das bases"""
    mn, mx = b['min'], b['max']; (w, h, d), c = dims(b)
    box(STEELD, mn, mx)
    box(STEEL, [mn[0] - 0.05, mn[1], mn[2] - 0.05], [mx[0] + 0.05, mn[1] + 0.3, mx[2] + 0.05])
    n = int((w + d) * 2 / 0.6)
    for side, L0, L1, fixed, ax in ((-1, mn[0], mx[0], mn[2], 'x'), (1, mn[0], mx[0], mx[2], 'x'), (-1, mn[2], mx[2], mn[0], 'z'), (1, mn[2], mx[2], mx[0], 'z')):
        L = L1 - L0; m = max(2, int(L / 0.6))
        for k in range(m):  # faixa de seguranca: blocos amarelo/preto alternados, 3 cm pra fora
            a, e = L0 + k * L / m, L0 + (k + 1) * L / m
            if ax == 'x': a, e = a - (0.02 if k == 0 else 0), e + (0.02 if k == m - 1 else 0)  # ponta entra na faixa do lado curto
            if ax == 'x': box(YEL if k % 2 else HAZ, [a, mn[1] + h * 0.55, fixed - 0.03], [e, mn[1] + h * 0.55 + 0.4, fixed + 0.03])
            else: box(YEL if k % 2 else HAZ, [fixed - 0.03, mn[1] + h * 0.55 + 0.01, a], [fixed + 0.03, mn[1] + h * 0.55 + 0.39, e])  # 1 cm mais fina: nas quinas cruza a outra sem plano comum
    team = b.get('team'); tm = RRED if team == 'red' else RBLUE if team == 'blue' else STEEL
    box(tm, [mn[0] - 0.04, mx[1] - 0.3, mn[2] - 0.04], [mx[0] + 0.04, mx[1] - 0.05, mx[2] + 0.04])  # friso de cima (cor do time)
    # painel no lado comprido virado pro centro, com 3 mostradores e alavanca
    alongX = w >= d; face = (mn[2] if c[2] > 0 else mx[2]) if alongX else (mn[0] if c[0] > 0 else mx[0]); nrm = (-1 if (c[2] if alongX else c[0]) > 0 else 1)
    pc = c[0] if alongX else c[2]; pw = min(2.4, (w if alongX else d) * 0.5); py0, py1 = mn[1] + 0.6, mn[1] + h * 0.5
    if alongX: box(STEEL, [pc - pw / 2, py0, face - 0.06 if nrm < 0 else face], [pc + pw / 2, py1, face if nrm < 0 else face + 0.06])
    else: box(STEEL, [face - 0.06 if nrm < 0 else face, py0, pc - pw / 2], [face if nrm < 0 else face + 0.06, py1, pc + pw / 2])
    for k in (-1, 0, 1):
        u = pc + k * pw * 0.3; yy = (py0 + py1) / 2 + 0.15
        for rr, mm, dz in ((0.2, STEELD, 0.09), (0.15, PAPER, 0.11)):
            o = face + nrm * dz
            tube(mm, 'z' if alongX else 'x', (yy, u), rr, min(o, o - nrm * 0.03), max(o, o - nrm * 0.03), 14)
    lx = pc + pw * 0.42
    if alongX: obox(RRED, (lx, py0 + 0.35, face + nrm * 0.2), (0.07, 0.6, 0.07), rx=nrm * 25)
    else: obox(RRED, (face + nrm * 0.2, py0 + 0.35, lx), (0.07, 0.6, 0.07), rz=-nrm * 25)
def catwalk(b):
    """passarela de aco: chapa na medida, borda amarela, vigas em baixo (abaixo do piso: ninguem bate)"""
    mn, mx = b['min'], b['max']; (w, h, d), c = dims(b); alongX = w > d
    box(STEEL, mn, mx)
    for side in (-1, 1):
        if alongX: box(YEL, [mn[0] + 0.02, mx[1] - 0.12, (mn[2] if side < 0 else mx[2] - 0.12) - 0.02 * (side < 0)], [mx[0] - 0.02, mx[1] + 0.015, (mn[2] + 0.12 if side < 0 else mx[2]) + 0.02 * (side > 0)])
        else: box(YEL, [(mn[0] if side < 0 else mx[0] - 0.12) - 0.02 * (side < 0), mx[1] - 0.12, mn[2] + 0.02], [(mn[0] + 0.12 if side < 0 else mx[0]) + 0.02 * (side > 0), mx[1] + 0.015, mx[2] - 0.02])
    L = w if alongX else d; n = max(1, int(L / 2))
    for k in range(n + 1):
        t = (mn[0] if alongX else mn[2]) + k * L / n
        t = min(max(t, (mn[0] if alongX else mn[2]) + 0.1), (mx[0] if alongX else mx[2]) - 0.1)
        if alongX: box(STEELD, [t - 0.08, mn[1] - 0.3, mn[2] + 0.05], [t + 0.08, mn[1] + 0.001, mx[2] - 0.05])
        else: box(STEELD, [mn[0] + 0.05, mn[1] - 0.3, t - 0.08], [mx[0] - 0.05, mn[1] + 0.001, t + 0.08])
def ibeam(b):
    """pilar em perfil I: alma na medida, abas e sapata"""
    mn, mx = b['min'], b['max']; (w, h, d), c = dims(b)
    box(STEELD, mn, mx)
    box(STEEL, [mn[0] - 0.04, mn[1] + 0.2, mn[2] + 0.12], [mx[0] + 0.04, mx[1] - 0.02, mx[2] - 0.12])
    box(STEELL, [mn[0] - 0.2, mn[1], mn[2] - 0.2], [mx[0] + 0.2, mn[1] + 0.2, mx[2] + 0.2])
def pipe(b):
    """cano deitado inscrito na caixa, flanges a cada 6 m e maos-francesas pro muro mais perto"""
    mn, mx = b['min'], b['max']; (w, h, d), c = dims(b); alongX = w > d; r = min(w, d, h) / 2 * 0.98
    a0, a1 = (mn[0], mx[0]) if alongX else (mn[2], mx[2]); u = c[2] if alongX else c[0]; ax = 'x' if alongX else 'z'
    tube(STEELL, ax, (c[1], u), r, a0, a1, 16)
    n = int((a1 - a0) / 6)
    for k in range(1, n + 1):
        t = a0 + k * (a1 - a0) / (n + 1)
        tube(STEELD, ax, (c[1], u), r * 1.18, t - 0.12, t + 0.12, 16)
        wall = (L['arena'] + 0.0) * (1 if u > 0 else -1)
        if abs(abs(u) - L['arena']) < 6:  # cano perto do muro: braco ate ele
            lo, hi = sorted((u + (r * 0.6 if wall > u else -r * 0.6), wall))
            if alongX: box(STEELD, [t - 0.07, mn[1] - 0.25, lo], [t + 0.07, mn[1] - 0.1, hi])
            else: box(STEELD, [lo, mn[1] - 0.25, t - 0.07], [hi, mn[1] - 0.1, t + 0.07])
def brickwall(b):
    """muro de fabrica: tijolo na medida, pilastras do lado de dentro, janeloes altos com caixilho, cornija; chamine atras nas quinas"""
    mn, mx = b['min'], b['max']; (w, h, d), c = dims(b); along = w > d; Lg = w if along else d
    inner = -1 if (c[2] if along else c[0]) > 0 else 1
    face = (mn[2] if inner < 0 else mx[2]) if along else (mn[0] if inner < 0 else mx[0])
    box(BRICK, mn, [mx[0], mx[1] - 0.4, mx[2]])
    box(BRICKD, [mn[0] - 0.12, mx[1] - 0.4, mn[2] - 0.12], [mx[0] + 0.12, mx[1], mx[2] + 0.12])
    def slab(t0, t1, y0, y1, out, m, back=0.0):
        a, e = (face - out, face - back) if inner < 0 else (face + back, face + out)
        if along: box(m, [t0, y0, a], [t1, y1, e])
        else: box(m, [a, y0, t0], [e, y1, t1])
    a0 = mn[0] if along else mn[2]; n = max(1, int(Lg / 6))
    box(STONED, [mn[0] - 0.08, mn[1], mn[2] - 0.08], [mx[0] + 0.08, mn[1] + 0.6, mx[2] + 0.08])  # embasamento
    for k in range(n + 1): t = a0 + k * Lg / n; slab(t - 0.4, t + 0.4, mn[1] + 0.6, mx[1] - 0.4, 0.25, BRICKD)
    for k in range(n):
        t = a0 + (k + 0.5) * Lg / n; ww = Lg / n - 2.2; y0, y1 = mn[1] + 4.6, mx[1] - 1.2
        if y1 - y0 < 1.5 or ww < 1: continue
        slab(t - ww / 2, t + ww / 2, y0, y1, 0.03, GLASS)
        slab(t - ww / 2 - 0.14, t + ww / 2 + 0.14, y0 - 0.25, y0, 0.12, STONE)  # peitoril
        cols = max(2, int(ww / 0.8)); rows = max(2, int((y1 - y0) / 0.8))
        for i in range(1, cols): u = t - ww / 2 + i * ww / cols; slab(u - 0.04, u + 0.04, y0, y1, 0.07, STEELD)
        for j in range(1, rows): v = y0 + j * (y1 - y0) / rows; slab(t - ww / 2, t + ww / 2, v - 0.04, v + 0.04, 0.065, STEELD)
        for u in (t - ww / 2 - 0.07, t + ww / 2 + 0.07): slab(u - 0.07, u + 0.07, y0, y1 + 0.1, 0.09, STEELD)
        slab(t - ww / 2 - 0.14, t + ww / 2 + 0.14, y1, y1 + 0.18, 0.09, STEELD)
    if along and inner > 0 and MAP == 'fabrica':  # chamines de tijolo FORA do mapa, atras das duas quinas do muro de baixo (cenario)
        for sx in (-1, 1):
            x, z = sx * (L['arena'] - 4), mn[2] - 3.5
            box(BRICK, [x - 1.4, 0, z - 1.4], [x + 1.4, 22, z + 1.4])
            for yy in (6, 12, 18): box(BRICKD, [x - 1.5, yy, z - 1.5], [x + 1.5, yy + 0.4, z + 1.5])
            box(BRICKD, [x - 1.65, 22, z - 1.65], [x + 1.65, 23.2, z + 1.65])

# ---------- refinaria: concreto, silo, torre de petroleo, cerca de chapa ----------
RUST, RUSTD, OILW = mat('rust', '8e5a3c'), mat('rust_d', '5e3a26'), mat('silo_white', 'e6e0d2')
def concrete(b):
    """bloco de concreto na medida: linhas de forma (2 cm pra fora) e quina chanfrada em cima"""
    mn, mx = b['min'], b['max']; (w, h, d), c = dims(b)
    box(CONC, mn, mx)
    for yy in [mn[1] + k * 0.75 for k in range(1, int(h / 0.75))]:
        if yy > mx[1] - 0.3: break
        box(CONCD, [mn[0] - 0.02, yy - 0.03, mn[2] - 0.02], [mx[0] + 0.02, yy + 0.03, mx[2] + 0.02])
    box(CONCD, [mn[0] - 0.05, mx[1] - 0.2, mn[2] - 0.05], [mx[0] + 0.05, mx[1] + 0.015, mx[2] + 0.05])  # capa (1,5 cm acima: pisa nela)
def silo(b):
    """silo de oleo: cilindro do tamanho do desenho (a colisao em degraus fica dentro), faixas vermelhas, escadinha e tampa conica"""
    (w, h, d), c = dims(b); r = min(w, d) / 2; y0, y1 = b['min'][1], b['max'][1]
    cyl(OILW, (c[0], c[2]), r, y0, y1, 28)
    for yy in (y0 + h * 0.3, y0 + h * 0.7): cyl(RRED, (c[0], c[2]), r + 0.04, yy - 0.18, yy + 0.18, 28)
    cyl(CONCD, (c[0], c[2]), r + 0.12, y0, y0 + 0.3, 28)
    cyl(STEELL, (c[0], c[2]), r + 0.06, y1 - 0.02, y1 + h * 0.15, 28, r2=r * 0.25)
    cyl(STEELD, (c[0], c[2]), r * 0.27, y1 + h * 0.15 - 0.05, y1 + h * 0.15 + 0.25, 12)
    a = math.atan2(-c[2], -c[0])  # escadinha virada pro centro do mapa
    for side in (-0.28, 0.28):
        px, pz = c[0] + math.cos(a) * (r + 0.18) - math.sin(a) * side, c[2] + math.sin(a) * (r + 0.18) + math.cos(a) * side
        cyl(STEELD, (px, pz), 0.035, y0 + 0.3, y1 + 0.4, 6)
    for k in range(int((h - 0.6) / 0.35)):
        yy = y0 + 0.5 + k * 0.35; px, pz = c[0] + math.cos(a) * (r + 0.18), c[2] + math.sin(a) * (r + 0.18)
        obox(STEELD, (px, yy, pz), (0.62, 0.04, 0.04), ry=-math.degrees(a) + 90)
def derrick_leg(b):
    """perna da torre de petroleo: perfil de aco na medida + X entre as pernas SO acima de 8,5 m (em cima da cabine ninguem bate)"""
    mn, mx = b['min'], b['max']; (w, h, d), c = dims(b)
    box(RUSTD, mn, mx)
    box(STEELD, [mn[0] - 0.1, mn[1], mn[2] - 0.1], [mx[0] + 0.1, mn[1] + 0.2, mx[2] + 0.1])
    legs = [o for o in L['boxes'] if o['k'] == 'pillar']; me = min(range(len(legs)), key=lambda i: abs(legs[i]['min'][0] - mn[0]) + abs(legs[i]['min'][2] - mn[2]))
    for o in legs:  # liga com a vizinha (mesmo x ou mesmo z), so uma vez por par
        oc = dims(o)[1]
        if o is legs[me] or not (abs(oc[0] - c[0]) < 0.01 or abs(oc[2] - c[2]) < 0.01) or (oc[0] + oc[2] < c[0] + c[2]): continue
        alongX = abs(oc[2] - c[2]) < 0.01; L0 = abs((oc[0] - c[0]) if alongX else (oc[2] - c[2])); mid = ((c[0] + oc[0]) / 2, (c[2] + oc[2]) / 2)
        ya, yb = max(mn[1], 8.5), mx[1] - 0.3; nseg = 2; hs = (yb - ya) / nseg
        for k in range(nseg):
            cy = ya + (k + 0.5) * hs; ln = math.hypot(L0, hs); ang = math.degrees(math.atan2(hs, L0))
            for sg in (-1, 1):
                if alongX: obox(RUST, (mid[0], cy, mid[1] + sg * 0.02), (ln, 0.08, 0.05), rz=sg * ang)
                else: obox(RUST, (mid[0] + sg * 0.02, cy, mid[1]), (0.05, 0.08, ln), rx=-sg * ang)
            if alongX: box(RUSTD, [min(c[0], oc[0]) + w / 2, ya + k * hs - 0.06, mid[1] - 0.06], [max(c[0], oc[0]) - w / 2, ya + k * hs + 0.06, mid[1] + 0.06])
            else: box(RUSTD, [mid[0] - 0.06, ya + k * hs - 0.06, min(c[2], oc[2]) + w / 2], [mid[0] + 0.06, ya + k * hs + 0.06, max(c[2], oc[2]) - w / 2])
def derrick(b):
    """cabeca da torre: plataforma de chapa, guarda-corpo, polia no meio e faixa de seguranca"""
    mn, mx = b['min'], b['max']; (w, h, d), c = dims(b)
    box(RUSTD, mn, mx)
    for side in range(4):
        n = 8
        for k in range(n):
            if k % 2: continue
            a, e = (mn[0] if side < 2 else mn[2]) + k * (w if side < 2 else d) / n, (mn[0] if side < 2 else mn[2]) + (k + 1) * (w if side < 2 else d) / n
            if side == 0: box(YEL, [a, mn[1] + 0.1, mn[2] - 0.03], [e, mx[1] - 0.1, mn[2]])
            elif side == 1: box(YEL, [a, mn[1] + 0.1, mx[2]], [e, mx[1] - 0.1, mx[2] + 0.03])
            elif side == 2: box(YEL, [mn[0] - 0.03, mn[1] + 0.1, a], [mn[0], mx[1] - 0.1, e])
            else: box(YEL, [mx[0], mn[1] + 0.1, a], [mx[0] + 0.03, mx[1] - 0.1, e])
    for x in (mn[0] + 0.1, mx[0] - 0.1):
        for z in (mn[2] + 0.1, mx[2] - 0.1): cyl(STEELD, (x, z), 0.04, mx[1], mx[1] + 1.0, 6)
    for side in (-1, 1):
        box(STEELD, [mn[0] + 0.05, mx[1] + 0.95, (mn[2] if side < 0 else mx[2]) - 0.14 * (side > 0) + 0.04 * (side < 0)], [mx[0] - 0.05, mx[1] + 1.03, (mn[2] if side < 0 else mx[2]) + 0.14 * (side < 0) - 0.04 * (side > 0)])
    box(RUST, [c[0] - 0.7, mx[1], c[2] - 0.5], [c[0] + 0.7, mx[1] + 1.4, c[2] + 0.5])  # bloco da polia
    tube(STEELD, 'z', (mx[1] + 1.4, c[0]), 0.55, c[2] - 0.25, c[2] + 0.25, 16)
def lowpipe(b):
    """cano no chao (cobertura na cintura): o cano inscrito na caixa e bercos de concreto embaixo, flanges"""
    mn, mx = b['min'], b['max']; (w, h, d), c = dims(b); alongX = w > d; r = min(w, d, h) / 2 * 0.98
    a0, a1 = (mn[0], mx[0]) if alongX else (mn[2], mx[2]); u = c[2] if alongX else c[0]; ax = 'x' if alongX else 'z'
    tube(RUST, ax, (c[1], u), r, a0, a1, 14)
    n = max(1, int((a1 - a0) / 3))
    for k in range(n + 1):
        t = a0 + 0.4 + k * (a1 - a0 - 0.8) / n
        tube(RUSTD, ax, (c[1], u), r * 1.15, t - 0.09, t + 0.09, 14)
        if alongX: box(CONCD, [t - 0.25, mn[1], mn[2] + 0.05], [t + 0.25, c[1] - r * 0.6, mx[2] - 0.05])
        else: box(CONCD, [mn[0] + 0.05, mn[1], t - 0.25], [mx[0] - 0.05, c[1] - r * 0.6, t + 0.25])
def tinfence(b):
    """cerca da refinaria: chapa ondulada enferrujada na medida, postes do lado de dentro e arame farpado em cima"""
    mn, mx = b['min'], b['max']; (w, h, d), c = dims(b); along = w > d; Lg = w if along else d
    inner = -1 if (c[2] if along else c[0]) > 0 else 1
    box(RUST, mn, mx)
    ribs(RUSTD, mn, mx, along, (inner,), out=0.04, y0=mn[1] + 0.05, y1=mx[1] - 0.05)
    face = (mn[2] if inner < 0 else mx[2]) if along else (mn[0] if inner < 0 else mx[0])
    a0 = mn[0] if along else mn[2]; n = max(1, int(Lg / 3.2))
    for k in range(n + 1):
        t = min(max(a0 + k * Lg / n, a0 + 0.2), a0 + Lg - 0.2)
        px, pz = (t, face + inner * 0.16) if along else (face + inner * 0.16, t)
        cyl(STEELD, (px, pz), 0.09, mn[1], mx[1] + 0.9, 8)
    for yy in (mx[1] + 0.35, mx[1] + 0.6, mx[1] + 0.85):
        if along: tube(STEELD, 'x', (yy, face + inner * 0.16), 0.018, mn[0], mx[0], 5)
        else: tube(STEELD, 'z', (yy, face + inner * 0.16), 0.018, mn[2], mx[2], 5)
    box(STEELD, [mn[0] - 0.03, mn[1], mn[2] - 0.03], [mx[0] + 0.03, mn[1] + 0.25, mx[2] + 0.03])
    if along and inner > 0:  # cavalos de pau FORA da cerca (cenario, nao entra no jogo)
        for x in (-L['arena'] * 0.45, L['arena'] * 0.3):
            pumpjack(x, mn[2] - 6.5, 1 if x < 0 else -1)
def pumpjack(x, z, sg):
    """cavalo de pau: base, cavalete em A, balancim inclinado, cabeca de cavalo na ponta e contrapeso"""
    box(CONCD, [x - 3.2, 0, z - 1.1], [x + 3.2, 0.5, z + 1.1])
    for e in (-0.6, 0.6): obox(RUSTD, (x, 2.2, z + e * 1.25), (0.22, 3.6, 0.22), rx=-e * 22)
    obox(RUST, (x, 4.0, z), (6.4, 0.45, 0.45), rz=sg * 9)
    hx = x + sg * 3.1; obox(RUSTD, (hx, 3.35 + sg * sg * 0.5, z), (0.6, 1.5, 0.5), rz=sg * 9)
    cyl(STEELD, (hx + sg * 0.25, z), 0.03, 0.5, 3.0, 6)
    cx_ = x - sg * 2.4; obox(STEELD, (cx_, 2.6, z), (1.0, 1.4, 0.7))
    box(STEELD, [x - sg * 1.4 - 0.5, 0.5, z - 0.6], [x - sg * 1.4 + 0.5, 1.4, z + 0.6])

# ---------- Banco Ferradura (e Casa da Moeda): marmore, coluna, balaustrada, balcao, duto, coreto, praca ----------
MARB, MARBJ, MARBD = mat('marble', 'ece6d8'), mat('marble_joint', 'cfc6b4'), mat('marble_d', 'b8ae9a')
BRASS, HEDGE, HEDGED, IRON = mat('brass', 'b8902e'), mat('hedge', '7d8a5a'), mat('hedge_d', '5d6849'), mat('iron', '1f1d1a')
DUMP, CWOOD = mat('dumpster', '4f6a52'), mat('counter_wood', '5d4a3a')
def marble(b):
    """marmore. Baixo (salao, ate 3,5 m): caixa LISA na medida (o piso de lajota e a parede de cofrinhos do jogo encostam a 1-2 cm).
    Alto (parede do banco): rodape, juntas de bloco em fiadas, cornija em cima"""
    if b.get('sign'): return  # frontao com placa: fica o do jogo (MAP_KEEP)
    mn, mx = b['min'], b['max']; (w, h, d), c = dims(b)
    box(MARB, mn, mx)
    if h <= 3.5: return
    y0 = mn[1]
    if y0 < 0.1: box(MARBD, [mn[0] - 0.06, y0, mn[2] - 0.06], [mx[0] + 0.06, y0 + 0.7, mx[2] + 0.06])
    box(MARBD, [mn[0] - 0.12, mx[1] - 0.45, mn[2] - 0.12], [mx[0] + 0.12, mx[1] - 0.2, mx[2] + 0.12])
    box(MARBJ, [mn[0] - 0.07, mx[1] - 0.2, mn[2] - 0.07], [mx[0] + 0.07, mx[1] + 0.015, mx[2] + 0.07])  # 1,5 cm acima: nao divide plano com o topo da parede vizinha
    for yy in [y0 + 0.7 + k * 1.1 for k in range(1, int((h - 1.2) / 1.1) + 1)]:  # junta de fiada (1 cm pra fora)
        if yy > mx[1] - 0.6: break
        box(MARBJ, [mn[0] - 0.01, yy - 0.025, mn[2] - 0.01], [mx[0] + 0.01, yy + 0.025, mx[2] + 0.01])
def column(b):
    """coluna: fuste com caneluras (8 frisos), base e capitel quadrados da largura da caixa"""
    mn, mx = b['min'], b['max']; (w, h, d), c = dims(b); r = min(w, d) / 2
    box(MARBD, [mn[0], mn[1], mn[2]], [mx[0], mn[1] + 0.35, mx[2]])
    box(MARBD, [mn[0], mx[1] - 0.35, mn[2]], [mx[0], mx[1], mx[2]])
    cyl(MARB, (c[0], c[2]), r * 0.82, mn[1] + 0.35, mx[1] - 0.35, 16)
    for yy in (mn[1] + 0.35, mx[1] - 0.55): cyl(MARBJ, (c[0], c[2]), r * 0.9, yy, yy + 0.2, 16)
    for k in range(8):
        a = k / 8 * 2 * math.pi + math.pi / 16
        box(MARBJ, [c[0] + math.cos(a) * r * 0.8 - 0.03, mn[1] + 0.6, c[2] + math.sin(a) * r * 0.8 - 0.03], [c[0] + math.cos(a) * r * 0.8 + 0.03, mx[1] - 0.6, c[2] + math.sin(a) * r * 0.8 + 0.03])
def rail(b):
    """balaustrada: corrimao escuro, rodape e balaustres torneados (bojo no meio)"""
    mn, mx = b['min'], b['max']; (w, h, d), c = dims(b); along = w > d; Lg = w if along else d; n = max(2, round(Lg / 0.45))
    box(MARBD, [mn[0], mx[1] - 0.16, mn[2]], mx)
    box(MARBD, mn, [mx[0], mn[1] + 0.12, mx[2]])
    for k in range(n):
        t = (mn[0] if along else mn[2]) + (k + 0.5) * Lg / n; px, pz = (t, c[2]) if along else (c[0], t)
        rr = min(w, d) / 2 * 0.9; yh = mx[1] - 0.16
        cyl(MARB, (px, pz), rr * 0.55, mn[1] + 0.12, mn[1] + 0.12 + (yh - mn[1] - 0.12) * 0.45, 8, r2=rr)
        cyl(MARB, (px, pz), rr, mn[1] + 0.12 + (yh - mn[1] - 0.12) * 0.45, yh, 8, r2=rr * 0.5)
def counter(b):
    """balcao: madeira escura com almofadas, tampo claro, grade de latao nos guiches do balcao comprido"""
    mn, mx = b['min'], b['max']; (w, h, d), c = dims(b); along = w > d; Lg = w if along else d
    box(CWOOD, mn, [mx[0], mx[1] - 0.08, mx[2]])
    box(MARB, [mn[0] - 0.08, mx[1] - 0.08, mn[2] - 0.08], [mx[0] + 0.08, mx[1], mx[2] + 0.08])
    n = max(1, int(Lg / 1.2))
    for k in range(n):
        a, e = (mn[0] if along else mn[2]) + k * Lg / n + 0.12, (mn[0] if along else mn[2]) + (k + 1) * Lg / n - 0.12
        for side in (-1, 1):
            if along: z = mn[2] if side < 0 else mx[2]; box(WOODD, [a, mn[1] + 0.18, z - 0.025], [e, mx[1] - 0.25, z + 0.025])
            else: x = mn[0] if side < 0 else mx[0]; box(WOODD, [x - 0.025, mn[1] + 0.18, a], [x + 0.025, mx[1] - 0.25, e])
    if Lg >= 8:  # guiche: grade de latao em cima do tampo (fina: tiro e mao passam, como no balcao de verdade)
        for k in range(n + 1):
            t = (mn[0] if along else mn[2]) + k * Lg / n
            t = min(max(t, (mn[0] if along else mn[2]) + 0.1), (mx[0] if along else mx[2]) - 0.1)
            box(BRASS, [t - 0.05, mx[1], c[2] - 0.05] if along else [c[0] - 0.05, mx[1], t - 0.05], [t + 0.05, mx[1] + 0.9, c[2] + 0.05] if along else [c[0] + 0.05, mx[1] + 0.9, t + 0.05])
        box(BRASS, [mn[0], mx[1] + 0.9, c[2] - 0.06] if along else [c[0] - 0.06, mx[1] + 0.9, mn[2]], [mx[0], mx[1] + 1.0, c[2] + 0.06] if along else [c[0] + 0.06, mx[1] + 1.0, mx[2]])
def bankroof(b):
    mn, mx = b['min'], b['max']
    box(SLATE, mn, mx)
    box(MARBD, [mn[0] - 0.1, mn[1] - 0.15, mn[2] - 0.1], [mx[0] + 0.1, mn[1] + 0.2, mx[2] + 0.1])  # cornija
def duct(b):
    """duto de ventilacao: chapa galvanizada na medida, emendas e rebites"""
    mn, mx = b['min'], b['max']; (w, h, d), c = dims(b); along = w > d; Lg = w if along else d
    box(STEELL, mn, mx)
    n = max(1, int(Lg / 1.2))
    for k in range(1, n):
        t = (mn[0] if along else mn[2]) + k * Lg / n
        if along: box(STEEL, [t - 0.04, mn[1] + 0.01, mn[2] - 0.015], [t + 0.04, mx[1] + 0.015, mx[2] + 0.015])
        else: box(STEEL, [mn[0] - 0.015, mn[1] + 0.01, t - 0.04], [mx[0] + 0.015, mx[1] + 0.015, t + 0.04])
def coreto(b):
    """coreto: base octogonal de pedra (cabe na caixa) e piso de tabua no topo exato"""
    (w, h, d), c = dims(b); r = min(w, d) / 2; y0, y1 = b['min'][1], b['max'][1]
    cyl(STONE, (c[0], c[2]), r / math.cos(math.pi / 8) * 0.999, y0, y1 - 0.06, 8)
    cyl(WOODL, (c[0], c[2]), r * 0.97, y1 - 0.06, y1, 8)
    cyl(STONED, (c[0], c[2]), r / math.cos(math.pi / 8) + 0.06, y0, y0 + 0.15, 8)
def coretoroof(b):
    """telhado do coreto: aba na medida da caixa e cone listrado vermelho e branco com mastro e bandeirinha.
    Caixa comprida (ponto do bonde): toldo reto listrado na medida, as estacas ficam embaixo dele"""
    (w, h, d), c = dims(b); r = min(w, d) / 2; y0, y1 = b['min'][1], b['max'][1]
    if max(w, d) > min(w, d) * 1.5:
        mn, mx = b['min'], b['max']; along = w > d; L = w if along else d; n = max(2, int(L / 0.6))
        box(IRON, mn, [mx[0], y0 + 0.12, mx[2]])
        for k in range(n):
            a0, a1 = (mn[0] if along else mn[2]) + k * L / n, (mn[0] if along else mn[2]) + (k + 1) * L / n
            m = RRED if k % 2 else TRIM
            if along: prism(m, [(mn[2] - 0.05, y0 + 0.12), (mx[2] + 0.05, y0 + 0.12), (c[2], y1 + 0.25)], a0, a1, True)
            else: prism(m, [(mn[0] - 0.05, y0 + 0.12), (mx[0] + 0.05, y0 + 0.12), (c[0], y1 + 0.25)], a0, a1, False)
        return
    cyl(IRON, (c[0], c[2]), r, y0, y1, 16)
    bm_r, bm_w = MATS[RRED]['bm'], MATS[TRIM]['bm']; seg = 16; top = (c[0], y1 + 2.6, c[2])
    for k in range(seg):
        a0, a1 = k / seg * 2 * math.pi, (k + 1) / seg * 2 * math.pi
        bm = bm_r if k % 2 else bm_w
        v = [bm.verts.new(B(c[0] + math.cos(a) * r * 1.02, y1, c[2] + math.sin(a) * r * 1.02)) for a in (a0, a1)] + [bm.verts.new(B(*top))]
        bm.faces.new(v)  # sem fundo: a aba do telhado tampa por baixo
    cyl(IRON, (c[0], c[2]), 0.04, y1 + 2.5, y1 + 3.6, 6)
    box(RRED, [c[0] + 0.04, y1 + 3.1, c[2] - 0.03], [c[0] + 0.9, y1 + 3.55, c[2] + 0.03])
def slimpost(b):
    """pilarete de ferro do coreto: fuste fino, base e mao-francesa em cima"""
    mn, mx = b['min'], b['max']; (w, h, d), c = dims(b); r = min(w, d) / 2
    cyl(PAPER, (c[0], c[2]), r * 0.6, mn[1] + 0.1, mx[1] - 0.15, 8)  # fuste termina dentro da base e do capitel (sem plano comum)
    cyl(IRON, (c[0], c[2]), r, mn[1], mn[1] + 0.35, 8)
    cyl(IRON, (c[0], c[2]), r * 0.95, mx[1] - 0.3, mx[1], 8)
def bench(b):
    """banco de praca: ripas de madeira, encosto do lado de fora, pes de ferro"""
    mn, mx = b['min'], b['max']; (w, h, d), c = dims(b); along = w > d
    out = 1 if (c[0] if not along else c[2]) > 0 else -1
    for k in range(3):
        o = -0.3 + k * 0.3
        if along: box(WOOD, [mn[0], mn[1] + h * 0.5, c[2] + o * d - 0.12], [mx[0], mn[1] + h * 0.5 + 0.06, c[2] + o * d + 0.12])
        else: box(WOOD, [c[0] + o * w - 0.12, mn[1] + h * 0.5, mn[2]], [c[0] + o * w + 0.12, mn[1] + h * 0.5 + 0.06, mx[2]])
    if along: box(WOOD, [mn[0], mn[1] + h * 0.62, (mx[2] - 0.08) if out > 0 else mn[2]], [mx[0], mx[1], mx[2] if out > 0 else mn[2] + 0.08])
    else: box(WOOD, [(mx[0] - 0.08) if out > 0 else mn[0], mn[1] + h * 0.62, mn[2]], [mx[0] if out > 0 else mn[0] + 0.08, mx[1], mx[2]])
    for e in (0.1, 0.9):
        if along: box(IRON, [mn[0] + e * w - 0.04, mn[1], mn[2] + 0.05], [mn[0] + e * w + 0.04, mn[1] + h * 0.5, mx[2] - 0.05])
        else: box(IRON, [mn[0] + 0.05, mn[1], mn[2] + e * d - 0.04], [mx[0] - 0.05, mn[1] + h * 0.5, mn[2] + e * d + 0.04])
def hedge(b):
    """cerca viva: caixa verde na medida com tufos (blocos tortos 4-8 cm pra fora) e vaso de pedra embaixo"""
    mn, mx = b['min'], b['max']; (w, h, d), c = dims(b); r = random.Random(int(c[0] * 7 + c[2] * 3))
    box(HEDGE, [mn[0], mn[1] + 0.25, mn[2]], mx)
    box(STONED, [mn[0] - 0.05, mn[1], mn[2] - 0.05], [mx[0] + 0.05, mn[1] + 0.3, mx[2] + 0.05])
    along = w > d; Lg = w if along else d
    for k in range(int(Lg / 0.6)):
        t = (mn[0] if along else mn[2]) + (k + 0.5) * Lg / int(Lg / 0.6); yy = r.uniform(mn[1] + 0.5, mx[1] - 0.25)
        sz = (r.uniform(0.35, 0.55), r.uniform(0.3, 0.45), (d if along else w) + r.uniform(0.08, 0.16))
        if along: obox(HEDGED, (t, yy, c[2]), sz, ry=r.uniform(-8, 8))
        else: obox(HEDGED, (c[0], yy, t), (sz[2], sz[1], sz[0]), ry=r.uniform(-8, 8))
def lamp(b):
    """poste de 1930: haste preta, lanterna clara e chapeu"""
    mn, mx = b['min'], b['max']; (w, h, d), c = dims(b)
    cyl(IRON, (c[0], c[2]), 0.14, mn[1], mn[1] + 0.5, 8); cyl(IRON, (c[0], c[2]), 0.08, mn[1] + 0.5, mx[1], 8)
    cyl(PAPER, (c[0], c[2]), 0.22, mx[1] - 0.05, mx[1] + 0.5, 6, r2=0.3)
    cyl(IRON, (c[0], c[2]), 0.38, mx[1] + 0.48, mx[1] + 0.8, 6, r2=0)
def dumpster(b):
    """cacamba: caixa verde na medida, tampa escura (1,5 cm acima), frisos e rodinhas"""
    mn, mx = b['min'], b['max']; (w, h, d), c = dims(b); along = w > d
    box(DUMP, [mn[0], mn[1] + 0.15, mn[2]], [mx[0], mx[1], mx[2]])
    box(IRON, [mn[0] - 0.05, mx[1] - 0.04, mn[2] - 0.05], [mx[0] + 0.05, mx[1] + 0.015, mx[2] + 0.05])
    ribs(mat('dumpster_d', '3d5440'), [mn[0], mn[1] + 0.15, mn[2]], mx, along, (-1, 1), out=0.03, y0=mn[1] + 0.3, y1=mx[1] - 0.15)
    for x in (mn[0] + 0.25, mx[0] - 0.25):
        for z in (mn[2] + 0.25, mx[2] - 0.25): cyl(IRON, (x, z), 0.1, mn[1], mn[1] + 0.16, 8)

# ---------- Cais do Sol Poente (docas): barco, armazem de tabua, empilhadeira, barril, guindaste, vagao, cabeco ----------
HULL, HULLD, CABW, CABR = mat('hull', '8a3a2c'), mat('hull_d', '5e261d'), mat('cabin_white', 'ece6d8'), mat('cabin_roof', '3f5a6a')
SHEDW, SHEDD, SHEDR, SHEDRD = mat('shed', 'a28866'), mat('shed_d', '6e5640'), mat('shed_roof', '5f4a3e'), mat('shed_roof_d', '4a3a30')
FORK, ROPE = mat('fork_yellow', 'd1a02f'), mat('rope', 'c9a46a')
def wedge(m, b, y0, y1, grow=0.0, xo=0.0):
    """proa em cunha no +x da caixa b"""
    mn, mx = b['min'], b['max']; (w, h, d), c = dims(b); bl = d * 0.55
    pts = [(mx[0] + xo, mn[2] - grow), (mx[0] + bl + grow * 1.6 + xo, c[2]), (mx[0] + xo, mx[2] + grow)]
    bm = MATS[m]['bm']; lo = [bm.verts.new(B(x, y0, z)) for x, z in pts]; hi = [bm.verts.new(B(x, y1, z)) for x, z in pts]
    bm.faces.new(lo); bm.faces.new(hi[::-1])
    for k in range(3): bm.faces.new((lo[k], hi[k], hi[(k + 1) % 3], lo[(k + 1) % 3]))
def boat(b):
    """barco de carga: casco vermelho afundado na agua (ate -1), proa em cunha, linha d'agua preta, tabuado no topo exato
    da colisao, amurada branca baixa, vigias redondas, cunhos de amarra e ancora"""
    mn, mx = b['min'], b['max']; (w, h, d), c = dims(b); top = mx[1]; yb = -1.0
    box(HULL, [mn[0], yb, mn[2]], [mx[0], top - 0.3, mx[2]])
    wedge(HULL, b, yb, top - 0.3)
    wedge(WOOD, b, top - 0.3, top, -0.25, -0.001)
    box(WOOD, [mn[0] + 0.25, top - 0.3, mn[2] + 0.25], [mx[0], top, mx[2] - 0.25])
    for k in range(1, int((d - 0.5) / 1.4)):                     # poucas frestas largas (06/11: a cada 45 cm o contorno de tinta deixava o conves preto)
        z = mn[2] + 0.25 + k * 1.4; box(WOODD, [mn[0] + 0.25, top, z - 0.04], [mx[0] - 0.1, top + 0.004, z + 0.04])
    box(CABW, [mn[0] - 0.03, top - 0.3, mn[2] - 0.03], [mx[0] + 0.001, top + 0.12, mn[2] + 0.25])
    box(CABW, [mn[0] - 0.03, top - 0.3, mx[2] - 0.25], [mx[0] + 0.001, top + 0.12, mx[2] + 0.03])
    box(CABW, [mn[0] - 0.03, top - 0.3, mn[2] + 0.25], [mn[0] + 0.25, top + 0.12, mx[2] - 0.25])
    box(HAZ, [mn[0] - 0.03, -0.75, mn[2] - 0.03], [mx[0] + 0.002, -0.45, mx[2] + 0.03])    # linha d'agua
    box(HULLD, [mn[0] - 0.02, top - 0.9, mn[2] - 0.02], [mx[0] + 0.003, top - 0.75, mx[2] + 0.02])
    box(HULLD, [mn[0] - 0.05, yb, mn[2] + 0.4], [mn[0], top - 0.35, mx[2] - 0.4])  # espelho de popa
    for k in range(6):
        x = mn[0] + 2 + k * (w - 4) / 5
        for side in (-1, 1):
            zf = mn[2] if side < 0 else mx[2]
            tube(METAL, 'z', (0.25, x), 0.24, min(zf, zf + side * 0.05), max(zf, zf + side * 0.05), 12)
            tube(GLASS, 'z', (0.25, x), 0.17, min(zf, zf + side * 0.07), max(zf, zf + side * 0.07), 12)
    for x in (mn[0] + 1.2, mx[0] - 1.2):
        for z in (mn[2] + 0.6, mx[2] - 0.6):
            cyl(IRON, (x, z), 0.12, top, top + 0.35, 8); box(IRON, [x - 0.3, top + 0.3, z - 0.08], [x + 0.3, top + 0.42, z + 0.08])
    ax_ = mx[0] + 0.6; cyl(IRON, (ax_, mn[2] - 0.12), 0.06, -0.2, top - 0.5, 6)
    obox(IRON, (ax_, -0.3, mn[2] - 0.12), (0.9, 0.12, 0.1))
def boatcabin(b):
    """casa do leme: branca, teto azul com aba, vigias, janelao pra proa, porta, corrimao no teto e boia"""
    mn, mx = b['min'], b['max']; (w, h, d), c = dims(b)
    box(CABW, mn, mx)
    box(CABR, [mn[0] - 0.25, mx[1], mn[2] - 0.25], [mx[0] + 0.25, mx[1] + 0.3, mx[2] + 0.25])
    box(HULLD, [mn[0] - 0.04, mn[1], mn[2] - 0.04], [mx[0] + 0.04, mn[1] + 0.35, mx[2] + 0.04])
    for side in (-1, 1):
        zf = mn[2] if side < 0 else mx[2]
        for k in (-0.25, 0.25):
            tube(METAL, 'z', (mn[1] + h * 0.62, c[0] + k * w), 0.38, min(zf, zf + side * 0.05), max(zf, zf + side * 0.05), 14)
            tube(GLASS, 'z', (mn[1] + h * 0.62, c[0] + k * w), 0.28, min(zf, zf + side * 0.07), max(zf, zf + side * 0.07), 14)
    window('+x', mx[0], mn[1] + h * 0.62, c[2], w=d * 0.6, h=0.9)
    door('-x', mn[0], c[2], mn[1] + 0.36, w=0.9, h=min(2.1, h - 0.75))
    box(HULLD, [mn[0] - 0.11, mn[1] + 0.3, c[2] - 0.6], [mn[0], mn[1] + 0.37, c[2] + 0.6])  # soleira (fecha o pe da porta e da moldura)
    for x in (mn[0] - 0.1, mx[0] + 0.1):
        for z in (mn[2] - 0.1, mx[2] + 0.1): cyl(IRON, (x, z), 0.035, mx[1] + 0.3, mx[1] + 1.1, 6)
    for z in (mn[2] - 0.1, mx[2] + 0.1): tube(IRON, 'x', (mx[1] + 1.1, z), 0.035, mn[0] - 0.14, mx[0] + 0.14, 6)
    for x in (mn[0] - 0.1, mx[0] + 0.1): tube(IRON, 'z', (mx[1] + 1.04, x), 0.03, mn[2] - 0.14, mx[2] + 0.14, 6)
    for j in range(12):
        a = j / 12 * 2 * math.pi; u = c[0] - w * 0.1 + math.cos(a) * 0.32; y = mn[1] + h * 0.3 + math.sin(a) * 0.32
        obox(BUOY if j % 3 else BUOYW, (u, y, mx[2] + 0.08), (0.2, 0.13, 0.12 if j % 3 else 0.15), rz=math.degrees(a) + 90)
def boatstack(b):
    """chamine: cilindro preto, faixa vermelha, boca clara e apito de latao"""
    (w, h, d), c = dims(b); r = w / 2; y0, y1 = b['min'][1], b['max'][1]
    cyl(HAZ, (c[0], c[2]), r, y0, y1, 18)
    cyl(PAINTR, (c[0], c[2]), r + 0.04, y1 - 1.0, y1 - 0.45, 18)
    cyl(CABW, (c[0], c[2]), r + 0.06, y1 - 0.2, y1 + 0.05, 18)
    cyl(HULLD, (c[0], c[2]), r + 0.1, y0, y0 + 0.3, 18)
    cyl(BRASS, (c[0] - r - 0.15, c[2]), 0.09, y1 - 1.6, y1 - 0.9, 8); cyl(BRASS, (c[0] - r - 0.15, c[2]), 0.13, y1 - 0.9, y1 - 0.75, 8, r2=0.05)
def plank(b):
    """degrau da prancha: tabua com sarrafo antiderrapante na quina"""
    mn, mx = b['min'], b['max']
    box(WOOD, mn, mx); box(WOODD, [mn[0] - 0.015, mx[1] - 0.05, mn[2] - 0.015], [mx[0] + 0.015, mx[1] + 0.018, mn[2] + 0.12])
def shed(b):
    """parede do armazem: tabua em pe desbotada, mata-juntas dos dois lados, rodape e cinta escuros; verga do portao com trilho"""
    mn, mx = b['min'], b['max']; (w, h, d), c = dims(b); along = w > d; Lg = w if along else d
    box(SHEDW, mn, mx)
    n = max(2, int(Lg / 0.7)); ylo = mn[1] + (0.7 if mn[1] < 0.1 else 0.3)
    for k in range(1, n):
        t = (mn[0] if along else mn[2]) + k * Lg / n
        for side in (-1, 1):
            if along: z = mn[2] if side < 0 else mx[2]; box(SHEDD, [t - 0.05, ylo, z - 0.03], [t + 0.05, mx[1] - 0.05, z + 0.03])
            else: x = mn[0] if side < 0 else mx[0]; box(SHEDD, [x - 0.03, ylo, t - 0.05], [x + 0.03, mx[1] - 0.05, t + 0.05])
    if mn[1] < 0.1:
        box(WOODD, [mn[0] - 0.05, mn[1], mn[2] - 0.05], [mx[0] + 0.05, mn[1] + 0.7, mx[2] + 0.05])
        yy = mn[1] + 3.2
        if yy + 0.25 < mx[1]: box(WOODD, [mn[0] - 0.06, yy, mn[2] - 0.06], [mx[0] + 0.06, yy + 0.22, mx[2] + 0.06])
    else:
        box(WOODD, [mn[0] - 0.06, mn[1] - 0.015, mn[2] - 0.06], [mx[0] + 0.06, mn[1] + 0.3, mx[2] + 0.06])  # 1,5 cm abaixo da verga: nao divide o plano de baixo
        for side in (-1, 1):
            if along: z = mn[2] if side < 0 else mx[2]; box(METAL, [mn[0] + 0.3, mn[1] + 0.35, z + side * 0.07 - 0.04], [mx[0] - 0.3, mn[1] + 0.5, z + side * 0.07 + 0.04])
            else: x = mn[0] if side < 0 else mx[0]; box(METAL, [x + side * 0.07 - 0.04, mn[1] + 0.35, mn[2] + 0.3], [x + side * 0.07 + 0.04, mn[1] + 0.5, mx[2] - 0.3])
def shedroof(b):
    """telhado do armazem: chapa ondulada escura (frisos 3 cm em cima), testeira e lanternim no meio"""
    mn, mx = b['min'], b['max']; (w, h, d), c = dims(b); along = w > d
    box(SHEDR, mn, mx)
    box(WOODD, [mn[0] - 0.05, mn[1] - 0.25, mn[2] - 0.05], [mx[0] + 0.05, mn[1] + 0.2, mx[2] + 0.05])
    Lg = w if along else d; n = int(Lg / 0.5)
    for k in range(1, n):
        t = (mn[0] if along else mn[2]) + k * Lg / n
        if abs(t - (c[0] if along else c[2])) < 1.7: continue
        if along: box(SHEDRD, [t - 0.06, mx[1], mn[2] + 0.1], [t + 0.06, mx[1] + 0.03, mx[2] - 0.1])
        else: box(SHEDRD, [mn[0] + 0.1, mx[1], t - 0.06], [mx[0] - 0.1, mx[1] + 0.03, t + 0.06])
    if along: box(SHEDR, [c[0] - 1.4, mx[1], mn[2] + 1.5], [c[0] + 1.4, mx[1] + 0.9, mx[2] - 1.5]); box(WOODD, [c[0] - 1.6, mx[1] + 0.9, mn[2] + 1.3], [c[0] + 1.6, mx[1] + 1.05, mx[2] - 1.3])
    else: box(SHEDR, [mn[0] + 1.5, mx[1], c[2] - 1.4], [mx[0] - 1.5, mx[1] + 0.9, c[2] + 1.4]); box(WOODD, [mn[0] + 1.3, mx[1] + 0.9, c[2] - 1.6], [mx[0] - 1.3, mx[1] + 1.05, c[2] + 1.6])
def cratepile(b):
    """estrado da pilha: pallets empilhados; os caixotes soltos vem do jogo (HeistView)"""
    mn, mx = b['min'], b['max']; (w, h, d), c = dims(b); top = mx[1]
    box(WOODD, [mn[0] + 0.15, mn[1], mn[2] + 0.15], [mx[0] - 0.15, top - 0.12, mx[2] - 0.15])
    n = int(w / 0.45)
    for k in range(n):
        x0 = mn[0] + k * w / n + 0.03; box(WOOD, [x0, top - 0.12, mn[2]], [x0 + w / n - 0.06, top, mx[2]])
    for yy in (mn[1] + 0.35, mn[1] + 0.75): box(WOODL, [mn[0], yy, mn[2] + 0.05], [mx[0], yy + 0.1, mx[2] - 0.05])
def forklift(b):
    """empilhadeira: corpo amarelo, contrapeso, banco, gaiola, torre preta com garfo (no -z) e 4 rodas"""
    mn, mx = b['min'], b['max']; (w, h, d), c = dims(b)
    z0, z1 = mn[2] + 0.55, mx[2]
    box(FORK, [mn[0] + 0.1, mn[1] + 0.35, z0 + 0.2], [mx[0] - 0.1, mn[1] + h * 0.55, z1 - 0.2])
    box(STEELD, [mn[0] + 0.12, mn[1] + 0.3, z1 - 0.55], [mx[0] - 0.12, mn[1] + h * 0.72, z1 - 0.05])
    box(HAZ, [c[0] - 0.3, mn[1] + h * 0.55, c[2] + 0.2], [c[0] + 0.3, mn[1] + h * 0.62, c[2] + 0.75])
    box(HAZ, [c[0] - 0.3, mn[1] + h * 0.62, c[2] + 0.75], [c[0] + 0.3, mn[1] + h * 0.95, c[2] + 0.83])
    for x in (mn[0] + 0.2, mx[0] - 0.2):
        for z in (z0 + 0.4, z1 - 0.45): cyl(HAZ, (x, z), 0.05, mn[1] + h * 0.55, mx[1] + 0.6, 6)
    box(HAZ, [mn[0] + 0.13, mx[1] + 0.6, z0 + 0.33], [mx[0] - 0.13, mx[1] + 0.66, z1 - 0.38])
    for x in (mn[0] + 0.35, mx[0] - 0.35): box(HAZ, [x - 0.08, mn[1] + 0.1, z0 - 0.05], [x + 0.08, mx[1] + 0.9, z0 + 0.1])
    box(HAZ, [mn[0] + 0.25, mx[1] + 0.75, z0 - 0.07], [mx[0] - 0.25, mx[1] + 0.87, z0 + 0.12])
    for x in (mn[0] + 0.5, mx[0] - 0.5):
        box(STEELL, [x - 0.07, mn[1] + 0.08, mn[2]], [x + 0.07, mn[1] + 0.16, z0 - 0.05])
        box(STEELL, [x - 0.07, mn[1] + 0.09, z0 - 0.17], [x + 0.07, mn[1] + 0.75, z0 - 0.08])
    for z in (z0 + 0.55, z1 - 0.6):
        for side in (-1, 1): tube(HAZ, 'x', (0.36, z), 0.36, (mn[0] - 0.02) if side < 0 else mx[0] - 0.24, (mn[0] + 0.24) if side < 0 else mx[0] + 0.02, 12)
def barrel(b):
    """barril de madeira: bojo, aros de ferro e tampa"""
    (w, h, d), c = dims(b); r = w / 2 * 0.92; y0, y1 = b['min'][1], b['max'][1]; ym = (y0 + y1) / 2
    cyl(WOOD, (c[0], c[2]), r, y0, ym, 14, r2=w / 2); cyl(WOOD, (c[0], c[2]), w / 2, ym, y1, 14, r2=r)
    for yy, rr in ((y0 + 0.12, r + 0.02), (y0 + h * 0.32, w / 2 * 0.98), (y1 - h * 0.32, w / 2 * 0.98), (y1 - 0.12, r + 0.02)):
        cyl(IRON, (c[0], c[2]), rr + 0.015, yy - 0.04, yy + 0.04, 14)
    cyl(WOODD, (c[0], c[2]), r * 0.85, y1, y1 + 0.012, 14)
def bollard(b):
    """cabeco de amarra: ferro preto em cogumelo com volta de corda"""
    (w, h, d), c = dims(b); y0, y1 = b['min'][1], b['max'][1]
    cyl(IRON, (c[0], c[2]), w * 0.5, y0, y0 + 0.1, 12)
    cyl(IRON, (c[0], c[2]), w * 0.36, y0 + 0.1, y1 - 0.14, 12, r2=w * 0.3)
    cyl(IRON, (c[0], c[2]), w * 0.48, y1 - 0.14, y1, 12)
    cyl(ROPE, (c[0], c[2]), w * 0.38, y1 - 0.5, y1 - 0.3, 12)
def railcar(b):
    """vagao de carga: tabua vermelha, teto curvo, porta de correr, chassi, truques e rodas; trilho comprido embaixo"""
    mn, mx = b['min'], b['max']; (w, h, d), c = dims(b)
    y0 = mn[1] + 0.85
    box(HULL, [mn[0], y0, mn[2]], [mx[0], mx[1] - 0.2, mx[2]])
    prism(SHEDR, [(mn[0] - 0.12, mx[1] - 0.2), (mx[0] + 0.12, mx[1] - 0.2), (mx[0] + 0.12, mx[1] - 0.12), (c[0], mx[1]), (mn[0] - 0.12, mx[1] - 0.12)], mn[2] - 0.12, mx[2] + 0.12, False)
    n = int(d / 0.5)
    for k in range(1, n):
        t = mn[2] + k * d / n
        if abs(t - c[2]) < 1.4: continue
        for x in (mn[0] - 0.025, mx[0] + 0.025): box(HULLD, [x - 0.025, y0 + 0.1, t - 0.04], [x + 0.025, mx[1] - 0.3, t + 0.04])
    for x, sg in ((mn[0], -1), (mx[0], 1)):
        xo = x + sg * 0.05
        box(HULLD, [xo - 0.04, y0 + 0.05, c[2] - 1.2], [xo + 0.04, mx[1] - 0.32, c[2] + 1.2])
        xr = x + sg * 0.1
        box(METAL, [xr - 0.03, mx[1] - 0.45, c[2] - 1.6], [xr + 0.03, mx[1] - 0.35, c[2] + 1.6])
        box(METAL, [xr - 0.03, y0 + 1.0, c[2] - 0.15], [xr + 0.03, y0 + 1.2, c[2] + 0.15])
    box(HAZ, [mn[0] + 0.15, mn[1] + 0.55, mn[2] - 0.3], [mx[0] - 0.15, y0 - 0.001, mx[2] + 0.3])
    for e in (-1, 1):
        cyl(HAZ, (c[0], c[2] + e * (d / 2 + 0.45)), 0.12, mn[1] + 0.6, mn[1] + 0.9, 8)
        zc = c[2] + e * d * 0.33
        box(STEELD, [mn[0] + 0.3, mn[1] + 0.3, zc - 1.1], [mx[0] - 0.3, mn[1] + 0.55, zc + 1.1])
        for dz in (-0.7, 0.7):
            for x0, x1 in ((c[0] - 0.85, c[0] - 0.7), (c[0] + 0.7, c[0] + 0.85)): tube(HAZ, 'x', (0.42, zc + dz), 0.4, x0, x1, 14)
    for z in [k * 0.9 for k in range(-44, 33)]: box(WOODD, [c[0] - 1.25, 0, z - 0.12], [c[0] + 1.25, 0.08, z + 0.12])
    for x in (c[0] - 0.75, c[0] + 0.75): box(STEELL, [x - 0.05, 0.08, -39.8], [x + 0.05, 0.2, 29.3])
def crane_leg(b):
    """perna do guindaste do cais (a mesma trelica do Estaleiro) e o trilho dela no chao"""
    gantry_leg(b)
    (w, h, d), c = dims(b)
    for z in [k * 1.2 for k in range(-30, 24)]: box(WOODD, [c[0] - 0.9, 0, z - 0.15], [c[0] + 0.9, 0.07, z + 0.15])
    for x in (c[0] - 0.55, c[0] + 0.55): box(STEELL, [x - 0.06, 0.07, -36], [x + 0.06, 0.22, 27.6])

# ---------- Estudio Tinteiro (Noite dos Borroes): estudio de animacao abandonado de noite ----------
# Os cartazes e a tinta escorrendo (tinteiroDecor do jogo) ficam a 8-10 cm das paredes do salao: a parede fica LISA
# entre o rodape (0,95 m) e a sanca (6,75 m). Floresta (arvore, pedra, tronco) fica a do jogo (MAP_KEEP).
SWALL, SWALLD, SWOOD, SWOODD = mat('st_wall', '3b342f'), mat('st_wall_d', '2a2420'), mat('st_wood', '4a3d33'), mat('st_wood_d', '241c16')
SBRICK, SBRICKD, SPAPER, SINK = mat('st_brick', '4a3a33'), mat('st_brick_d', '2a201b'), mat('st_paper', 'b8b0a0'), mat('st_ink', '0b0a09')
SCAN, SCANG, SRED = mat('st_can', '4b4f52'), mat('st_can_g', '6e5a2e'), mat('st_red', '7a1f17')
def studiowall(b):
    """parede do salao: papel de parede escuro liso, lambri de madeira com almofadas embaixo, friso e sanca em cima"""
    mn, mx = b['min'], b['max']; (w, h, d), c = dims(b)
    box(SWALL, mn, mx)
    if h < 6:  # verga em cima da porta: guarnicao escura embaixo
        box(SWOODD, [mn[0] - 0.05, mn[1] - 0.015, mn[2] - 0.05], [mx[0] + 0.05, mn[1] + 0.25, mx[2] + 0.05]); return
    box(SWOODD, [mn[0] - 0.04, mn[1], mn[2] - 0.04], [mx[0] + 0.04, mn[1] + 0.9, mx[2] + 0.04])
    box(SWOOD, [mn[0] - 0.06, mn[1] + 0.9, mn[2] - 0.06], [mx[0] + 0.06, mn[1] + 1.02, mx[2] + 0.06])
    box(SWOOD, [mn[0] - 0.07, mx[1] - 0.25, mn[2] - 0.07], [mx[0] + 0.07, mx[1] + 0.015, mx[2] + 0.07])  # sanca (1,5 cm acima do topo)
    along = w > d
    for side in (-1, 1):  # almofadas do lambri (2 cm pra fora do rodape)
        L = w if along else d; n = max(1, int(L / 1.4))
        for k in range(n):
            a = (mn[0] if along else mn[2]) + k * L / n + 0.15; e = a + L / n - 0.3
            if e - a < 0.3: continue
            if along: z = mn[2] if side < 0 else mx[2]; box(SWOOD, [a, mn[1] + 0.18, z - 0.06 if side < 0 else z + 0.02], [e, mn[1] + 0.72, z - 0.02 if side < 0 else z + 0.06])
            else: x = mn[0] if side < 0 else mx[0]; box(SWOOD, [x - 0.06 if side < 0 else x + 0.02, mn[1] + 0.18, a], [x - 0.02 if side < 0 else x + 0.06, mn[1] + 0.72, e])
def studioext(b):
    """parede de fora: tijolo escuro, embasamento, pilastras dos dois lados, janelas altas tapadas com tabua (lado da mata), cimalha"""
    mn, mx = b['min'], b['max']; (w, h, d), c = dims(b); along = w > d; Lg = w if along else d
    box(SBRICK, mn, mx)
    if h < 9:  # pedaco em cima da porta: verga de pedra
        box(STONED, [mn[0] - 0.06, mn[1] - 0.015, mn[2] - 0.06], [mx[0] + 0.06, mn[1] + 0.4, mx[2] + 0.06]); return
    box(SBRICKD, [mn[0] - 0.06, mn[1], mn[2] - 0.06], [mx[0] + 0.06, mn[1] + 0.8, mx[2] + 0.06])
    box(SBRICKD, [mn[0] - 0.12, mx[1] - 0.5, mn[2] - 0.12], [mx[0] + 0.12, mx[1] - 0.2, mx[2] + 0.12])
    box(SWOODD, [mn[0] - 0.2, mx[1] - 0.2, mn[2] - 0.2], [mx[0] + 0.2, mx[1] + 0.35, mx[2] + 0.2])
    for yy in [mn[1] + 0.8 + k * 0.9 for k in range(1, int((h - 1.6) / 0.9))]:  # juntas de fiada (1 cm pra fora)
        box(SBRICKD, [mn[0] - 0.01, yy - 0.02, mn[2] - 0.01], [mx[0] + 0.01, yy + 0.02, mx[2] + 0.01])
    a0 = mn[0] if along else mn[2]; n = max(1, int(Lg / 6))
    out = 1 if (c[2] if along else c[0]) > 0 else -1  # lado de fora (mata)
    for k in range(n + 1):
        t = min(max(a0 + k * Lg / n, a0 + 0.45), a0 + Lg - 0.45)
        for side in (-1, 1):
            if along: z = mn[2] if side < 0 else mx[2]; box(SBRICKD, [t - 0.4, mn[1] + 0.8, z - 0.18 if side < 0 else z], [t + 0.4, mx[1] - 0.5, z if side < 0 else z + 0.18])
            else: x = mn[0] if side < 0 else mx[0]; box(SBRICKD, [x - 0.18 if side < 0 else x, mn[1] + 0.8, t - 0.4], [x if side < 0 else x + 0.18, mx[1] - 0.5, t + 0.4])
    for k in range(n):  # janela alta tapada com tabua, do lado da mata
        t = a0 + (k + 0.5) * Lg / n; ww = min(2.4, Lg / n - 1.6); y0, y1 = mn[1] + 5.2, mx[1] - 1.6
        if ww < 1 or y1 - y0 < 1.5: continue
        fz = (mx[2] if out > 0 else mn[2]) if along else (mx[0] if out > 0 else mn[0])
        def slab(t0, t1, ya, yb, o0, o1, m):
            lo, hi = sorted((fz + out * o0, fz + out * o1))
            if along: box(m, [t0, ya, lo], [t1, yb, hi])
            else: box(m, [lo, ya, t0], [hi, yb, t1])
        slab(t - ww / 2, t + ww / 2, y0, y1, 0.0, 0.03, SINK)
        slab(t - ww / 2 - 0.15, t + ww / 2 + 0.15, y0 - 0.2, y0, 0.0, 0.12, STONED)
        r = random.Random(int(t * 7 + fz))
        for j in range(4):  # tabuas tortas pregadas
            yy = y0 + 0.3 + j * (y1 - y0 - 0.6) / 3; tilt = r.uniform(-9, 9)
            if along: obox(SWOOD, (t, yy, fz + out * (0.06 + j * 0.012)), (ww + 0.4, 0.22, 0.05), rz=tilt)
            else: obox(SWOOD, (fz + out * (0.06 + j * 0.012), yy, t), (0.05, 0.22, ww + 0.4), rx=tilt)
def desk(b):
    """prancheta de animador: pes, tampo inclinado com papel e borrao de tinta, luminaria de braco apagada"""
    mn, mx = b['min'], b['max']; (w, h, d), c = dims(b); flat = b.get('light')
    for sx in (-1, 1):
        for sz in (-1, 1): box(SWOODD, [c[0] + sx * (w / 2 - 0.15) - 0.06, mn[1], c[2] + sz * (d / 2 - 0.15) - 0.06], [c[0] + sx * (w / 2 - 0.15) + 0.06, mx[1] - 0.12, c[2] + sz * (d / 2 - 0.15) + 0.06])
    box(SWOODD, [mn[0] + 0.12, mn[1] + 0.25, c[2] - 0.04], [mx[0] - 0.12, mn[1] + 0.33, c[2] + 0.04])  # travessa
    tilt = 0 if flat else -10
    obox(SWOOD, (c[0], mx[1] - 0.06, c[2]), (w, 0.1, d), rx=tilt)
    obox(SPAPER, (c[0] - w * 0.08, mx[1] + 0.005, c[2]), (w * 0.55, 0.012, d * 0.6), rx=tilt, ry=8)
    obox(SINK, (c[0] + w * 0.05, mx[1] + 0.02, c[2] + 0.05), (0.4, 0.012, 0.3), rx=tilt, ry=30)
    lx, lz = mx[0] - 0.2, mn[2] + 0.2   # luminaria
    cyl(IRON, (lx, lz), 0.1, mx[1] - 0.02, mx[1] + 0.05, 8)
    obox(IRON, (lx - 0.18, mx[1] + 0.45, lz), (0.04, 0.85, 0.04), rz=25)
    cyl(IRON, (lx - 0.45, lz), 0.2, mx[1] + 0.62, mx[1] + 0.92, 10, r2=0.06)
def easel(b):
    """cavalete: tres pernas, tela com rabisco e a mancha preta do borrao"""
    mn, mx = b['min'], b['max']; (w, h, d), c = dims(b)
    for s in (-1, 1): obox(SWOODD, (c[0], mn[1] + h / 2, c[2] + s * d * 0.3), (0.08, h, 0.08), rx=s * 7)
    obox(SWOODD, (c[0] + w * 0.35, mn[1] + h * 0.45, c[2]), (0.08, h * 0.9, 0.08), rz=-14)
    box(SWOODD, [c[0] - 0.12, mn[1] + h * 0.36, c[2] - d * 0.42], [c[0] + 0.06, mn[1] + h * 0.4, c[2] + d * 0.42])  # aparador
    box(SPAPER, [c[0] - 0.07, mn[1] + h * 0.4, c[2] - d * 0.4], [c[0] - 0.01, mn[1] + h * 0.85, c[2] + d * 0.4])
    obox(SINK, (c[0] - 0.085, mn[1] + h * 0.62, c[2] + d * 0.08), (0.02, h * 0.22, d * 0.2), rx=35)
    obox(SINK, (c[0] - 0.08, mn[1] + h * 0.7, c[2] - d * 0.15), (0.02, 0.05, d * 0.3), rx=-12)
def shelf(b):
    """estante do arquivo: montantes, prateleiras e latas de filme deitadas (algumas faltando)"""
    mn, mx = b['min'], b['max']; (w, h, d), c = dims(b); along = w > d; L = w if along else d; dep = d if along else w
    n = max(2, int(L / 3))
    for k in range(n + 1):
        t = min(max((mn[0] if along else mn[2]) + k * L / n, (mn[0] if along else mn[2]) + 0.05), (mx[0] if along else mx[2]) - 0.05)
        if along: box(SWOODD, [t - 0.05, mn[1], mn[2]], [t + 0.05, mx[1], mx[2]])
        else: box(SWOODD, [mn[0], mn[1], t - 0.05], [mx[0], mx[1], t + 0.05])
    if along: box(SWALLD, [mn[0] + 0.05, mn[1], c[2] - 0.03], [mx[0] - 0.05, mx[1] - 0.06, c[2] + 0.03])  # fundo no meio (dois lados)
    else: box(SWALLD, [c[0] - 0.03, mn[1], mn[2] + 0.05], [c[0] + 0.03, mx[1] - 0.06, mx[2] - 0.05])
    for j in range(4):
        y = mn[1] + 0.15 + j * (h - 0.2) / 3.4
        if along: box(SWOOD, [mn[0] + 0.051, y, mn[2] + 0.02], [mx[0] - 0.051, y + 0.06, mx[2] - 0.02])
        else: box(SWOOD, [mn[0] + 0.02, y, mn[2] + 0.051], [mx[0] - 0.02, y + 0.06, mx[2] - 0.051])
        if j == 3: continue
        m = int(L / 0.62)
        for i in range(m):
            if (i * 7 + j * 3) % 5 == 0: continue
            t = (mn[0] if along else mn[2]) + 0.35 + i * (L - 0.7) / max(1, m - 1)
            hh = 0.09 + (i % 3) * 0.05
            for side in (-1, 1):
                u = c[2 if along else 0] + side * dep * 0.25
                cyl(SCANG if (i + j + (side > 0)) % 4 == 0 else SCAN, (t, u) if along else (u, t), 0.24, y + 0.061, y + 0.061 + hh, 12)
def booth(b):
    """cabine de projecao: madeira escura com tabuas, rodape, janelinhas de projecao viradas pro salao e aba em cima"""
    mn, mx = b['min'], b['max']; (w, h, d), c = dims(b)
    box(SWOOD, mn, mx)
    box(SWOODD, [mn[0] - 0.04, mn[1], mn[2] - 0.04], [mx[0] + 0.04, mn[1] + 0.35, mx[2] + 0.04])
    box(SWOODD, [mn[0] - 0.1, mx[1] - 0.18, mn[2] - 0.1], [mx[0] + 0.1, mx[1] + 0.015, mx[2] + 0.1])
    along = w > d; L = w if along else d; n = max(2, int(L / 0.6))
    for k in range(1, n):
        t = (mn[0] if along else mn[2]) + k * L / n
        for side in (-1, 1):
            if along: z = mn[2] if side < 0 else mx[2]; box(SWOODD, [t - 0.03, mn[1] + 0.35, z - 0.02], [t + 0.03, mx[1] - 0.18, z + 0.02])
            else: x = mn[0] if side < 0 else mx[0]; box(SWOODD, [x - 0.02, mn[1] + 0.35, t - 0.03], [x + 0.02, mx[1] - 0.18, t + 0.03])
    if w >= 10:  # cabine grande: 3 vigias de projecao na face sul (pro salao)
        for k in (-1, 0, 1):
            x = c[0] + k * w * 0.28
            box(IRON, [x - 0.42, mn[1] + 1.6, mn[2] - 0.05], [x + 0.42, mn[1] + 2.4, mn[2]])
            box(GLASS, [x - 0.3, mn[1] + 1.7, mn[2] - 0.07], [x + 0.3, mn[1] + 2.3, mn[2] - 0.05])
            tube(IRON, 'z', (mn[1] + 2.0, x), 0.13, mn[2] - 0.32, mn[2] - 0.07, 10)  # lente do projetor
def roofdeck(b):
    """terraco: bloco de tijolo escuro com o deck de tabua em cima (topo exato) e frisos de tabua"""
    mn, mx = b['min'], b['max']; (w, h, d), c = dims(b)
    box(SBRICK, mn, [mx[0], mx[1] - 0.25, mx[2]])
    box(SWOOD, [mn[0] - 0.08, mx[1] - 0.25, mn[2] - 0.08], [mx[0] + 0.08, mx[1], mx[2] + 0.08])
    box(SBRICKD, [mn[0] - 0.05, mn[1], mn[2] - 0.05], [mx[0] + 0.05, mn[1] + 0.6, mx[2] + 0.05])
    n = int(d / 0.5)
    for k in range(1, n): z = mn[2] + k * d / n; box(SWOODD, [mn[0] - 0.08, mx[1], z - 0.02], [mx[0] + 0.08, mx[1] + 0.006, z + 0.02])
def chimney(b):
    """chamine de tijolo escuro com juntas e chapeu"""
    mn, mx = b['min'], b['max']; (w, h, d), c = dims(b)
    box(SBRICK, mn, mx)
    for yy in [mn[1] + k * 0.5 for k in range(1, int(h / 0.5))]: box(SBRICKD, [mn[0] - 0.01, yy - 0.02, mn[2] - 0.01], [mx[0] + 0.01, yy + 0.02, mx[2] + 0.01])
    box(SWOODD, [mn[0] - 0.12, mx[1], mn[2] - 0.12], [mx[0] + 0.12, mx[1] + 0.2, mx[2] + 0.12])
    box(SBRICKD, [c[0] - w * 0.3, mx[1] + 0.2, c[2] - d * 0.3], [c[0] + w * 0.3, mx[1] + 0.5, c[2] + d * 0.3])
def paintcan(b):
    """lata de tinta gigante (tonel redondo): chapa, aros, rotulo, alca, tinta vermelha no topo e escorrido"""
    (w, h, d), c = dims(b); r = min(w, d) / 2; y0, y1 = b['min'][1], b['max'][1]
    cyl(SCAN, (c[0], c[2]), r, y0, y1 - 0.02, 28)
    for yy in (y0 + 0.12, y1 - 0.14): cyl(IRON, (c[0], c[2]), r + 0.04, yy - 0.08, yy + 0.08, 28)
    cyl(SPAPER, (c[0], c[2]), r + 0.02, y0 + h * 0.3, y0 + h * 0.66, 28)
    cyl(SRED, (c[0], c[2]), r + 0.03, y0 + h * 0.4, y0 + h * 0.48, 28)
    cyl(SRED, (c[0], c[2]), r * 0.9, y1 - 0.05, y1, 28)
    a = math.atan2(-c[2], -c[0])
    for k in range(3):  # escorrido vermelho pelo lado virado pro meio
        aa = a + (k - 1) * 0.35; ln = 0.4 + k * 0.25
        px, pz = c[0] + math.cos(aa) * (r + 0.035), c[2] + math.sin(aa) * (r + 0.035)
        obox(SRED, (px, y1 - 0.2 - ln / 2, pz), (0.14, ln, 0.03), ry=-math.degrees(aa) + 90)

# ---------- Casa da Moeda: granito, telhado de cobre, friso dourado ----------
GRAN, GRANJ, GRAND, COPPER, COPPERD = mat('granite', 'a8aea4'), mat('granite_j', '8a9088'), mat('granite_d', '6e756c'), mat('copper', '5e8f7c'), mat('copper_d', '467062')
def granite(b):
    """granito: pilar (peca quase quadrada e fina) = fuste com base, capitel e caneluras; parede = blocos em fiada,
    embasamento e juntas (1 cm pra fora)"""
    mn, mx = b['min'], b['max']; (w, h, d), c = dims(b)
    if max(w, d) <= 1.6 and min(w, d) >= 1.0:
        box(GRAND, [mn[0] - 0.12, mn[1], mn[2] - 0.12], [mx[0] + 0.12, mn[1] + 0.6, mx[2] + 0.12])
        box(GRAN, [mn[0], mn[1] + 0.6, mn[2]], [mx[0], mx[1] - 0.7, mx[2]])
        box(GRAND, [mn[0] - 0.1, mx[1] - 0.7, mn[2] - 0.1], [mx[0] + 0.1, mx[1] - 0.45, mx[2] + 0.1])
        box(GRANJ, [mn[0] - 0.16, mx[1] - 0.45, mn[2] - 0.16], [mx[0] + 0.16, mx[1], mx[2] + 0.16])
        for k in range(3):  # caneluras: 3 frisos fundos por face (faixa escura 1 cm pra fora)
            u = -0.3 + k * 0.3
            for sx, sz in ((0, -1), (0, 1), (-1, 0), (1, 0)):
                if sz: z = mn[2] if sz < 0 else mx[2]; box(GRANJ, [c[0] + u * w - 0.04, mn[1] + 0.8, z - 0.012], [c[0] + u * w + 0.04, mx[1] - 0.9, z + 0.012])
                else: x = mn[0] if sx < 0 else mx[0]; box(GRANJ, [x - 0.012, mn[1] + 0.8, c[2] + u * d - 0.04], [x + 0.012, mx[1] - 0.9, c[2] + u * d + 0.04])
        return
    box(GRAN, mn, mx)
    if mn[1] < 0.1: box(GRAND, [mn[0] - 0.08, mn[1], mn[2] - 0.08], [mx[0] + 0.08, mn[1] + 0.9, mx[2] + 0.08])
    else: box(GRAND, [mn[0] - 0.06, mn[1] - 0.015, mn[2] - 0.06], [mx[0] + 0.06, mn[1] + 0.35, mx[2] + 0.06])
    y0 = mn[1] + (0.9 if mn[1] < 0.1 else 0.35)
    for yy in [y0 + k * 1.2 for k in range(1, int((mx[1] - y0) / 1.2) + 1)]:
        if yy > mx[1] - 0.4: break
        box(GRANJ, [mn[0] - 0.01, yy - 0.025, mn[2] - 0.01], [mx[0] + 0.01, yy + 0.025, mx[2] + 0.01])
def copperroof(b):
    """telhado de cobre esverdeado: chapa na medida com juntas em pe (3 cm), calha escura em volta e lanternim"""
    mn, mx = b['min'], b['max']; (w, h, d), c = dims(b); along = w > d
    box(COPPER, mn, mx)
    box(COPPERD, [mn[0] - 0.08, mn[1] - 0.015, mn[2] - 0.08], [mx[0] + 0.08, mn[1] + 0.25, mx[2] + 0.08])
    L = w if along else d; n = int(L / 0.9)
    for k in range(1, n):
        t = (mn[0] if along else mn[2]) + k * L / n
        if abs(t - (c[0] if along else c[2])) < 2.4: continue
        if along: box(COPPERD, [t - 0.04, mx[1], mn[2] + 0.2], [t + 0.04, mx[1] + 0.03, mx[2] - 0.2])
        else: box(COPPERD, [mn[0] + 0.2, mx[1], t - 0.04], [mx[0] - 0.2, mx[1] + 0.03, t + 0.04])
    box(COPPER, [c[0] - 2, mx[1], c[2] - 2], [c[0] + 2, mx[1] + 1.2, c[2] + 2])            # lanternim do salao
    box(COPPERD, [c[0] - 2.2, mx[1] + 1.2, c[2] - 2.2], [c[0] + 2.2, mx[1] + 1.4, c[2] + 2.2])
    cyl(BRASS, (c[0], c[2]), 0.06, mx[1] + 1.4, mx[1] + 3.0, 6)
    for sx, sz in ((1, 0), (-1, 0), (0, 1), (0, -1)):  # relogio nas 4 faces do lanternim (06/11, enfeite)
        if sx: x = c[0] + sx * 2; tube(PAPER, 'x', (mx[1] + 0.6, c[2]), 0.5, min(x, x + sx * 0.05), max(x, x + sx * 0.05), 20); tube(IRON, 'x', (mx[1] + 0.6, c[2]), 0.56, min(x, x + sx * 0.03), max(x, x + sx * 0.03), 20)
        else: z = c[2] + sz * 2; tube(PAPER, 'z', (mx[1] + 0.6, c[0]), 0.5, min(z, z + sz * 0.05), max(z, z + sz * 0.05), 20); tube(IRON, 'z', (mx[1] + 0.6, c[0]), 0.56, min(z, z + sz * 0.03), max(z, z + sz * 0.03), 20)
        o = 2.07
        if sx: obox(IRON, (c[0] + sx * o, mx[1] + 0.75, c[2]), (0.02, 0.32, 0.05)); obox(IRON, (c[0] + sx * o, mx[1] + 0.6, c[2] + 0.12), (0.02, 0.04, 0.26))
        else: obox(IRON, (c[0], mx[1] + 0.75, c[2] + sz * o), (0.05, 0.32, 0.02)); obox(IRON, (c[0] + 0.12, mx[1] + 0.6, c[2] + sz * o), (0.26, 0.04, 0.02))
    for sx in (-1, 1):  # bandeiras nas quinas do telhado
        for sz in (-1, 1):
            px, pz = (mx[0] - 0.8) if sx > 0 else (mn[0] + 0.8), (mx[2] - 0.8) if sz > 0 else (mn[2] + 0.8)
            cyl(IRON, (px, pz), 0.05, mx[1] + 0.03, mx[1] + 3.2, 6)
            box(mat('flag_green', '2f6a4a'), [px + 0.06, mx[1] + 2.4, pz - 0.025], [px + 1.3, mx[1] + 3.1, pz + 0.025])
            box(BRASS, [px + 0.075, mx[1] + 2.68, pz - 0.035], [px + 1.32, mx[1] + 2.82, pz + 0.035])
    for k in range(10):  # moeda dourada no mastro (disco em pe, de gomos)
        a = k / 10 * 2 * math.pi
        obox(BRASS, (c[0] + math.cos(a) * 0.3, mx[1] + 3.35 + math.sin(a) * 0.3, c[2]), (0.22, 0.2, 0.1), rz=math.degrees(a) + 90)
def goldtrim(b):
    """friso dourado da fachada: faixa de latao com rosetas"""
    mn, mx = b['min'], b['max']; (w, h, d), c = dims(b); along = w > d; L = w if along else d
    box(BRASS, mn, mx)
    n = int(L / 2.4)
    for k in range(n):
        t = (mn[0] if along else mn[2]) + (k + 0.5) * L / n
        out = 1 if (c[2] if along else c[0]) > 0 else -1
        if along: z = mx[2] if out > 0 else mn[2]; box(mat('brass_d', '8e6c1e'), [t - 0.12, mn[1] + 0.08, z - 0.025], [t + 0.12, mx[1] - 0.08, z + 0.025])
        else: x = mx[0] if out > 0 else mn[0]; box(mat('brass_d', '8e6c1e'), [x - 0.025, mn[1] + 0.08, t - 0.12], [x + 0.025, mx[1] - 0.08, t + 0.12])

# ---------- enfeites por mapa (06/11, pedido dele: "props essenciais"). So desenho, sem colisao: ficam presos em peca que ja
# existe, no alto ou fora do alcance (mar, atras do muro), pra colisao continuar igual ao desenho ----------
def seg(m, a, b, t=0.04):
    """barra fina de a ate b (pontos do jogo)"""
    dx, dy, dz = b[0] - a[0], b[1] - a[1], b[2] - a[2]; L = math.sqrt(dx * dx + dy * dy + dz * dz)
    if L < 1e-4: return
    ry = math.degrees(math.atan2(-dz, dx)); rz = math.degrees(math.atan2(dy, math.hypot(dx, dz)))
    obox(m, ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2), (L, t, t), ry=ry, rz=rz)
def catenary(H=4.6):
    """fiacao aerea do bonde: fio sobre o trilho (altura do chao do trilho + H) e braco saindo de cada poste perto dele"""
    T = L.get('trackS') or []
    for i in range(1, len(T)):
        a, b = T[i - 1], T[i]; seg(IRON, (a[0], a[1] + H, a[2]), (b[0], b[1] + H, b[2]), 0.035)
    for o in L['boxes']:
        if o['k'] != 'post': continue
        (w, h, d), c = dims(o)
        if h < 4 or w > 0.6 or not T: continue
        p = min(T, key=lambda q: (q[0] - c[0]) ** 2 + (q[2] - c[2]) ** 2)
        if math.hypot(p[0] - c[0], p[2] - c[2]) > 6: continue
        top = o['max'][1]; y = p[1] + H
        seg(IRON, (c[0], top - 0.3, c[2]), (p[0], y + 0.25, p[2]), 0.06)                  # braco
        seg(IRON, (c[0], top - 0.9, c[2]), (c[0] + (p[0] - c[0]) * 0.45, top - 0.32, c[2] + (p[2] - c[2]) * 0.45), 0.04)  # mao-francesa
        cyl(PAPER, (p[0], p[2]), 0.07, y, y + 0.25, 8)                                       # isolador
def signal(x, z, y0, face):
    """sinal de ferrovia (semaforo): poste, placa vermelha com faixa branca e lanterna"""
    cyl(IRON, (x, z), 0.07, y0, y0 + 5.5, 8)
    ox = 0.35 if face in ('+x', '-x') else 0.0
    box(RRED, [x - 0.06, y0 + 4.6, z - 0.08], [x + 0.06, y0 + 4.9, z + 1.4]) if face[1] == 'x' else box(RRED, [x - 0.08, y0 + 4.6, z - 0.06], [x + 1.4, y0 + 4.9, z + 0.06])
    box(TRIM, [x - 0.08, y0 + 4.7, z + 1.0], [x + 0.08, y0 + 4.8, z + 1.2]) if face[1] == 'x' else box(TRIM, [x + 1.0, y0 + 4.7, z - 0.08], [x + 1.2, y0 + 4.8, z + 0.08])
    box(HAZ, [x - 0.2, y0 + 3.8, z - 0.2], [x + 0.2, y0 + 4.3, z + 0.2])
    cyl(mat('lamp_red', 'c8402e'), (x, z), 0.12, y0 + 4.3, y0 + 4.36, 8)
def watertower(x, z, y0=0.0):
    """caixa d'agua de locomotiva: quatro pernas, tanque de madeira com cintas, tampa conica e a tromba de encher"""
    for sx in (-1, 1):
        for sz in (-1, 1): seg(WOODD, (x + sx * 2.2, y0, z + sz * 2.2), (x + sx * 1.6, y0 + 7, z + sz * 1.6), 0.3)
    for yy in (2.5, 5): box(WOODD, [x - 2.1, y0 + yy, z - 2.1], [x + 2.1, y0 + yy + 0.15, z + 2.1])
    box(WOODD, [x - 2.3, y0 + 7, z - 2.3], [x + 2.3, y0 + 7.3, z + 2.3])
    cyl(WOOD, (x, z), 2.2, y0 + 7.3, y0 + 11, 20)
    for yy in (7.8, 9.1, 10.4): cyl(IRON, (x, z), 2.24, y0 + yy, y0 + yy + 0.12, 20)
    cyl(SLATE, (x, z), 2.5, y0 + 11, y0 + 12.4, 20, r2=0.1)
    seg(IRON, (x + 2.2, y0 + 8, z), (x + 4.2, y0 + 6.6, z), 0.35)
def lighthouse(x, z):
    """farol no mar: pedras na agua, torre listrada branca e vermelha, galeria, lanterna e cupula"""
    r = random.Random(5)
    for k in range(9):
        a = k / 9 * 2 * math.pi; obox(ROCK, (x + math.cos(a) * 3.2, -0.4, z + math.sin(a) * 3.2), (r.uniform(1.6, 2.6), r.uniform(1.2, 2.0), r.uniform(1.6, 2.4)), ry=r.uniform(0, 90))
    cyl(STONED, (x, z), 3.2, -1, 1.2, 16)
    for k in range(5):
        cyl(TRIM if k % 2 == 0 else RRED, (x, z), 2.2 - k * 0.18, 1.2 + k * 2.6, 1.2 + (k + 1) * 2.6, 16, r2=2.2 - (k + 1) * 0.18)
    top = 1.2 + 13
    cyl(IRON, (x, z), 1.9, top, top + 0.25, 16)
    for k in range(12): a = k / 12 * 2 * math.pi; cyl(IRON, (x + math.cos(a) * 1.8, z + math.sin(a) * 1.8), 0.04, top + 0.25, top + 1.1, 4)
    cyl(mat('lamp_glow', 'f3d27a'), (x, z), 1.0, top + 0.25, top + 1.9, 12)
    cyl(RRED, (x, z), 1.25, top + 1.9, top + 2.9, 12, r2=0.15)
def rowboat(x, z, ang):
    """barquinho a remo boiando (agua do jogo em -0,9): casco, bancos e um remo"""
    R = math.radians(ang)
    def P(u, v): return (x + math.cos(R) * u - math.sin(R) * v, z + math.sin(R) * u + math.cos(R) * v)
    for u0, u1, hw in ((-1.6, 1.0, 0.7), (1.0, 1.9, 0.35)):
        cx_, cz_ = P((u0 + u1) / 2, 0); obox(WOOD, (cx_, -0.65, cz_), (u1 - u0, 0.5, hw * 2), ry=-ang)
    cx_, cz_ = P(-0.2, 0); obox(WOODD, (cx_, -0.39, cz_), (2.4, 0.03, 1.1), ry=-ang)
    for u in (-0.8, 0.4): cx_, cz_ = P(u, 0); obox(WOODL, (cx_, -0.3, cz_), (0.25, 0.06, 1.42), ry=-ang)
    a, b = P(-0.5, 0.6), P(1.2, 1.3); seg(WOODL, (a[0], -0.3, a[1]), (b[0], -0.8, b[1]), 0.07)
def filmreel(x, y, z):
    """rolo de filme gigante na fachada (lado da mata, x negativo): disco com 5 furos, cubo e o filme saindo"""
    for k in range(20):
        a = k / 20 * 2 * math.pi; obox(SCAN, (x, y + math.sin(a) * 1.75, z + math.cos(a) * 1.75), (0.18, 0.2, 0.62), rx=-math.degrees(a))
    tube(SCAN, 'x', (y, z), 1.6, x - 0.06, x + 0.06, 24)
    for k in range(5):
        a = k / 5 * 2 * math.pi + 0.3; tube(SINK, 'x', (y + math.sin(a) * 0.95, z + math.cos(a) * 0.95), 0.42, x - 0.08, x + 0.08, 12)
    tube(IRON, 'x', (y, z), 0.3, x - 0.2, x + 0.2, 12)
    for k in range(6): obox(SINK, (x + 0.02, y - 1.9 - k * 0.55, z + 1.2 + math.sin(k) * 0.3), (0.04, 0.56, 0.7), rx=10 * math.sin(k * 1.3))
def marquee(x, z, y0, w=2.8):
    """letreiro de cinema em cima da porta: placa escura com moldura de lampadas"""
    box(SWOODD, [x - 0.22, y0, z - w / 2], [x - 0.02, y0 + 1.5, z + w / 2])
    box(SRED, [x - 0.25, y0 + 0.2, z - w / 2 + 0.2], [x - 0.22, y0 + 1.3, z + w / 2 - 0.2])
    for k in range(int(w / 0.3) + 1):
        zz = z - w / 2 + 0.1 + k * (w - 0.2) / int(w / 0.3)
        for yy in (y0 + 0.08, y0 + 1.42): tube(mat('lamp_glow', 'f3d27a'), 'x', (yy, zz), 0.06, x - 0.3, x - 0.22, 6)

def snag(b):
    """Ilha, brejo: tronco morto em pe (casca escura, ponta quebrada em bisel, dois galhos secos)"""
    (w, h, d), c = dims(b); r = min(w, d) / 2; y0, y1 = b['min'][1], b['max'][1]; R = random.Random(int(c[0] * 7 + c[2] * 3))
    cyl(WOODD, (c[0], c[2]), r * 1.15, y0, y0 + 0.5, 9, r2=r)
    cyl(WOODD, (c[0], c[2]), r, y0 + 0.5, y1 - 0.6, 9, r2=r * 0.8)
    cyl(WOODL, (c[0], c[2]), r * 0.8, y1 - 0.6, y1, 9, r2=r * 0.15)
    for k in range(2):
        a = R.uniform(0, 2 * math.pi); yy = y0 + h * R.uniform(0.45, 0.75)
        seg(WOODD, (c[0] + math.cos(a) * r * 0.7, yy, c[2] + math.sin(a) * r * 0.7), (c[0] + math.cos(a) * (r + 1.2), yy + 0.9, c[2] + math.sin(a) * (r + 1.2)), 0.16)

# ---------- Canyon Poeira: paredao em camadas, mesa, duna, cacto, adobe (a colisao em degraus fica DENTRO do desenho) ----------
CL = [mat('cliff_0', 'b4774a'), mat('cliff_1', 'c98e5c'), mat('cliff_2', 'a86a40')]
ME = [mat('mesa_0', 'a9643c'), mat('mesa_1', 'bd7c4c'), mat('mesa_2', 'cf9562')]
CLD, SANDD = mat('cliff_d', '7e4f30'), mat('sand', 'e0bf86')
SANDR, CACT, CACTD = mat('sand_r', 'c9a46e'), mat('cactus', '5d8a4a'), mat('cactus_d', '466b37')
ADOBE = {'red': mat('adobe_red', 'd9a48c'), 'blue': mat('adobe_blue', 'b9c4cc'), None: mat('adobe', 'e0b98a')}
ADOBED, ADOBEL = mat('adobe_d', 'b88c62'), mat('adobe_l', 'ead0a8')
def lump(m, c, sz, seed, n=14):
    """pedra solta (casco convexo) de centro c e tamanho sz, no espaco do jogo"""
    r = random.Random(seed); pts = []
    for k in range(n):
        a = r.uniform(0, 2 * math.pi); e = r.uniform(-0.2, 1.0); rr = math.sqrt(max(0.05, 1 - e * e))
        pts.append(B(c[0] + math.cos(a) * rr * sz[0] / 2, c[1] + e * sz[1], c[2] + math.sin(a) * rr * sz[2] / 2))
    tmp = bmesh.new(); vs = [tmp.verts.new(p) for p in pts]
    bmesh.ops.convex_hull(tmp, input=vs); me = bpy.data.meshes.new('tmp_lump'); tmp.to_mesh(me); tmp.free()
    MATS[m]['bm'].from_mesh(me); bpy.data.meshes.remove(me)
def strata(b, mats, ks, thin):
    """bloco em 3 camadas na medida dos degraus de colisao (ks = encolhe de cada camada); as pontas de cada camada
    passam 2 cm a mais que a de baixo (planos diferentes)"""
    mn, mx = b['min'], b['max']; (w, h, d), c = dims(b); y0 = mn[1]
    for i, k in enumerate(ks):
        kx = 1 if thin and w > d else k; kz = 1 if thin and d >= w else k
        ex = 0.02 * i if kx == 1 else 0.0; ez = 0.02 * i if kz == 1 else 0.0
        box(mats[i], [c[0] - w / 2 * kx - ex, y0 + h * i / 3, c[2] - d / 2 * kz - ez], [c[0] + w / 2 * kx + ex, y0 + h * (i + 1) / 3, c[2] + d / 2 * kz + ez])
    return c
def cliff(b):
    """paredao do canyon: 3 camadas de cor, sulcos de erosao na face e pedras no topo"""
    mn, mx = b['min'], b['max']; (w, h, d), c = dims(b); along = w > d; L = w if along else d
    strata(b, CL, (1, 0.92, 0.84), True)
    R = random.Random(int(c[0] * 3 + c[2] * 11))
    for side in (-1, 1):  # sulcos (risco escuro 2 cm pra fora da camada de baixo)
        for k in range(int(L / 3)):
            t = (mn[0] if along else mn[2]) + 1.5 + k * 3 + R.uniform(-0.8, 0.8); hh = R.uniform(0.6, 1.5)
            if along: z = c[2] + side * d / 2; box(CLD, [t - 0.08, mn[1] + 0.2, z - 0.02 if side < 0 else z], [t + 0.08, mn[1] + 0.2 + hh, z if side < 0 else z + 0.02])
            else: x = c[0] + side * w / 2; box(CLD, [x - 0.02 if side < 0 else x, mn[1] + 0.2, t - 0.08], [x if side < 0 else x + 0.02, mn[1] + 0.2 + hh, t + 0.08])
    for k in range(int(L / 6)):
        o = (mn[0] if along else mn[2]) + 3 + k * 6; s0 = 1 + R.uniform(0, 1.2)
        lump(CL[0], (o if along else c[0], mx[1] - 0.25, c[2] if along else o), (s0 * 1.8, s0 * 0.7, min(d if along else w, 2.4) * 0.9), int(o * 7 + c[2]))
def mesa(b):
    """mesa de pedra: 3 camadas, sulcos, topo liso (posicao de sniper) e pedras roladas no pe"""
    mn, mx = b['min'], b['max']; (w, h, d), c = dims(b)
    strata(b, ME, (1, 0.93, 0.86), False)
    R = random.Random(int(c[0] + c[2] * 5))
    for i, k in enumerate((1, 0.93, 0.86)):
        y0 = mn[1] + h * i / 3
        for side in (-1, 1):
            for j in range(int(w * k / 2.2)):
                x = c[0] - w * k / 2 + 1 + j * 2.2 + R.uniform(-0.4, 0.4); z = c[2] + side * d * k / 2; hh = R.uniform(0.5, h / 3 - 0.3)
                box(CLD, [x - 0.07, y0 + 0.1, z - 0.02 if side < 0 else z], [x + 0.07, y0 + 0.1 + hh, z if side < 0 else z + 0.02])
            for j in range(int(d * k / 2.2)):
                z = c[2] - d * k / 2 + 1 + j * 2.2 + R.uniform(-0.4, 0.4); x = c[0] + side * w * k / 2; hh = R.uniform(0.5, h / 3 - 0.3)
                box(CLD, [x - 0.02 if side < 0 else x, y0 + 0.1, z - 0.07], [x if side < 0 else x + 0.02, y0 + 0.1 + hh, z + 0.07])
    box(ME[2], [c[0] - w * 0.86 / 2 - 0.1, mx[1] - 0.2, c[2] - d * 0.86 / 2 - 0.1], [c[0] + w * 0.86 / 2 + 0.1, mx[1] + 0.012, c[2] + d * 0.86 / 2 + 0.1])  # borda do topo (pisa nela)
    for k in range(7):  # pedras roladas no pe (baixas)
        a = R.uniform(0, 2 * math.pi); px, pz = c[0] + math.cos(a) * (w / 2 + 0.6), c[2] + math.sin(a) * (d / 2 + 0.6)
        lump(ME[0], (px, 0, pz), (R.uniform(0.6, 1.2), R.uniform(0.3, 0.5), R.uniform(0.6, 1.2)), k * 13 + int(c[0]))
def rockstep(b):
    mn, mx = b['min'], b['max']
    box(ME[1], [mn[0] + 0.003, mn[1], mn[2] + 0.003], [mx[0] - 0.003, mx[1], mx[2] - 0.003])
    box(CLD, [mn[0] - 0.015, mx[1] - 0.08, mn[2] - 0.015], [mx[0] + 0.015, mx[1] + 0.018, mx[2] + 0.015])
def dune(b):
    """duna: meio elipsoide de raios 0,62 da largura e 1,05 da altura (contem os 3 degraus de colisao), com marcas de vento"""
    (w, h, d), c = dims(b); y0 = b['min'][1]; bm = MATS[SANDD]['bm']; seg_, ring = 20, 7
    rows = []
    for j in range(ring + 1):
        t = j / ring * math.pi / 2; cr, sr = math.cos(t), math.sin(t)
        if j == ring: rows.append([bm.verts.new(B(c[0], y0 + h * 1.05, c[2]))]); continue
        rows.append([bm.verts.new(B(c[0] + math.cos(a) * cr * w * 0.62, y0 + sr * h * 1.05, c[2] + math.sin(a) * cr * d * 0.62)) for a in (k / seg_ * 2 * math.pi for k in range(seg_))])
    bm.faces.new(rows[0][::-1])
    for j in range(ring - 1):
        for k in range(seg_): bm.faces.new((rows[j][k], rows[j][(k + 1) % seg_], rows[j + 1][(k + 1) % seg_], rows[j + 1][k]))
    for k in range(seg_): bm.faces.new((rows[ring - 1][k], rows[ring - 1][(k + 1) % seg_], rows[ring][0]))
    R = random.Random(int(c[0] * 3 + c[2]))
    for k in range(3):  # marcas de vento: faixas finas um tico acima da areia
        t = 0.25 + k * 0.2; cr, sr = math.cos(t * math.pi / 2), math.sin(t * math.pi / 2)
        a0 = R.uniform(0, 2 * math.pi)
        for j in range(5):
            a = a0 + j * 0.18
            obox(SANDR, (c[0] + math.cos(a) * cr * w * 0.625, y0 + sr * h * 1.05 + 0.01, c[2] + math.sin(a) * cr * d * 0.625), (0.9, 0.03, 0.12), ry=-math.degrees(a) + 90, rz=0)
def cactus(b):
    """cacto de desenho: tronco com gomos, dois bracos em L e florzinha no topo"""
    (w, h, d), c = dims(b); y0 = b['min'][1]
    cyl(CACT, (c[0], c[2]), 0.32, y0, y0 + h - 0.3, 10)
    cyl(CACT, (c[0], c[2]), 0.32, y0 + h - 0.3, y0 + h, 10, r2=0.12)
    for k in range(5): a = k / 5 * 2 * math.pi; box(CACTD, [c[0] + math.cos(a) * 0.31 - 0.03, y0 + 0.2, c[2] + math.sin(a) * 0.31 - 0.03], [c[0] + math.cos(a) * 0.31 + 0.03, y0 + h - 0.35, c[2] + math.sin(a) * 0.31 + 0.03])
    for s, yy, hh in ((1, 0.42, 0.8), (-1, 0.58, 0.6)):
        y = y0 + h * yy
        a0, a1 = (c[0] + 0.25, c[0] + 0.7) if s > 0 else (c[0] - 0.7, c[0] - 0.25); tube(CACT, 'x', (y, c[2]), 0.17, a0, a1, 8)
        cyl(CACT, (c[0] + s * 0.62, c[2]), 0.17, y - 0.1, y + hh, 8, r2=0.13)
    cyl(mat('flower', 'd9682c'), (c[0], c[2]), 0.1, y0 + h - 0.02, y0 + h + 0.12, 6)
def adobe(b):
    """casa de adobe: barro na cor do time, vigas saindo embaixo do topo, porta e janelas fundas, platibanda;
    ruina = topo mordido (pedacos caidos no chao) e sem platibanda; posto de gasolina = placa vermelha e bomba"""
    mn, mx = b['min'], b['max']; (w, h, d), c = dims(b); m = ADOBE[b.get('team')]
    box(m, mn, mx)
    box(ADOBED, [mn[0] - 0.04, mn[1], mn[2] - 0.04], [mx[0] + 0.04, mn[1] + 0.45, mx[2] + 0.04])
    if not b.get('ruin'): box(ADOBEL, [mn[0] - 0.15, mx[1], mn[2] - 0.15], [mx[0] + 0.15, mx[1] + 0.35, mx[2] + 0.15])
    else:
        R = random.Random(int(c[0] + c[2]))
        for k in range(4): lump(ADOBED, (c[0] + R.uniform(-w, w) * 0.6, 0, mn[2] - 0.9 if k % 2 else mx[2] + 0.9), (R.uniform(0.5, 0.9), 0.35, R.uniform(0.4, 0.8)), k + int(c[0] * 3))
    for face in ('+x', '-x', '+z', '-z'):  # vigas (madeira) saindo 45 cm, 60 cm abaixo do topo
        ax = face[1] == 'x'; Lg = d if ax else w; n = max(2, int(Lg / 2.2))
        for k in range(n):
            t = (mn[2] if ax else mn[0]) + (k + 0.5) * Lg / n
            if ax: x = mx[0] if face[0] == '+' else mn[0]; tube(WOODD, 'x', (mx[1] - 0.6, t), 0.12, min(x, x + (0.45 if face[0] == '+' else -0.45)), max(x, x + (0.45 if face[0] == '+' else -0.45)), 6)
            else: z = mx[2] if face[0] == '+' else mn[2]; tube(WOODD, 'z', (mx[1] - 0.6, t), 0.12, min(z, z + (0.45 if face[0] == '+' else -0.45)), max(z, z + (0.45 if face[0] == '+' else -0.45)), 6)
    dface = ('-z' if c[2] > 0 else '+z') if abs(c[2]) > abs(c[0]) * 0.5 else ('-x' if c[0] > 0 else '+x')
    def recess(face, u, y0_, ww, hh, m2):
        ax = face[1] == 'x'; sgn = 1 if face[0] == '+' else -1
        f = (mx[0] if sgn > 0 else mn[0]) if ax else (mx[2] if sgn > 0 else mn[2])
        lo, hi = sorted((f, f + sgn * 0.03))
        if ax: box(m2, [lo, y0_, u - ww / 2], [hi, y0_ + hh, u + ww / 2])
        else: box(m2, [u - ww / 2, y0_, lo], [u + ww / 2, y0_ + hh, hi])
        lo, hi = sorted((f, f + sgn * 0.06))  # moldura de madeira em cima
        if ax: box(WOODD, [lo, y0_ + hh, u - ww / 2 - 0.15], [hi, y0_ + hh + 0.15, u + ww / 2 + 0.15])
        else: box(WOODD, [u - ww / 2 - 0.15, y0_ + hh, lo], [u + ww / 2 + 0.15, y0_ + hh + 0.15, hi])
    if h >= 3.5:
        recess(dface, c[2] if dface[1] == 'x' else c[0], mn[1] + 0.46, 1.3, min(2.3, h - 1.4), mat('adobe_hole', '3a2a20'))
        for face in ('+x', '-x', '+z', '-z'):
            Lg = d if face[1] == 'x' else w
            for k in (-0.3, 0.3):
                u = (c[2] if face[1] == 'x' else c[0]) + k * Lg
                if face == dface and abs(k * Lg) < 1.4: continue
                recess(face, u, mn[1] + min(1.5, h - 2.2), 0.9, 0.8, mat('adobe_hole', '3a2a20'))
    if b.get('sign') == 'gas':  # placa do posto e bomba de gasolina na frente
        box(RRED, [c[0] - 2.5, mx[1] + 0.35, mx[2] - 0.35], [c[0] + 2.5, mx[1] + 1.55, mx[2] - 0.05])
        box(TRIM, [c[0] - 2.2, mx[1] + 0.75, mx[2] - 0.38], [c[0] + 2.2, mx[1] + 1.15, mx[2] - 0.34])
def adobewall(b):
    """mureta de adobe: barro com capa arredondada (meio cilindro) e tijolos aparecendo onde o reboco caiu"""
    mn, mx = b['min'], b['max']; (w, h, d), c = dims(b); along = w > d
    box(ADOBE[None], mn, [mx[0], mx[1] - 0.12, mx[2]])
    box(ADOBEL, [mn[0] - 0.04, mx[1] - 0.12, mn[2] - 0.04], [mx[0] + 0.04, mx[1], mx[2] + 0.04])
    R = random.Random(int(c[0] * 5 + c[2]))
    for k in range(4):
        t = (mn[0] if along else mn[2]) + R.uniform(0.3, 0.8) * (w if along else d); yy = mn[1] + R.uniform(0.3, h - 0.6)
        for side in (-1, 1):
            if along: z = mn[2] if side < 0 else mx[2]; box(ADOBED, [t - 0.2, yy, z - 0.02 if side < 0 else z], [t + 0.2, yy + 0.12, z if side < 0 else z + 0.02])
            else: x = mn[0] if side < 0 else mx[0]; box(ADOBED, [x - 0.02 if side < 0 else x, yy, t - 0.2], [x if side < 0 else x + 0.02, yy + 0.12, t + 0.2])
def canyonwall(b):
    """borda do mapa no deserto: paredao alto de arenito em faixas"""
    mn, mx = b['min'], b['max']; (w, h, d), c = dims(b)
    box(CL[1], mn, mx)
    for i, yy in enumerate([mn[1] + k * h / 5 for k in range(1, 5)]): box(CL[i % 2 * 2], [mn[0] - 0.03, yy - 0.3, mn[2] - 0.03], [mx[0] + 0.03, yy + 0.3, mx[2] + 0.03])
    box(CLD, [mn[0] - 0.1, mx[1] - 0.25, mn[2] - 0.1], [mx[0] + 0.1, mx[1] + 0.015, mx[2] + 0.1])

SAND = mat('sandbag', 'b7a37c')
wallfn = border if MAP in ('vila', 'becos', 'feira', 'largo', 'cortejo') else seawall if MAP == 'estaleiro' else brickwall if MAP in ('fabrica', 'ferradura', 'moeda', 'bonde') else (lambda b: concrete(b) if min(b['max'][0] - b['min'][0], b['max'][2] - b['min'][2]) < 0.7 else brickwall(b)) if MAP == 'apito' else tinfence if MAP == 'refinaria' else (lambda b: palisade(b) if b['max'][1] - b['min'][1] >= 5 else mureta(b))
pillarfn = gantry_leg if MAP == 'estaleiro' else ibeam if MAP == 'fabrica' else derrick_leg if MAP == 'refinaria' else concrete if MAP == 'apito' else post

# ---------- Xilindro (13/11, pedido dele): presidio de concreto pintado, grades, beliches, armarios, balcao e alambrado ----------
PGREEN, PCREAM, PSTRIPE, PMATT, PLOCK, PLOCKD = mat('prison_green', '7d8a78'), mat('prison_cream', 'e6dfcc'), mat('prison_stripe', '2a2724'), mat('prison_matt', 'ece6d6'), mat('prison_locker', '8fa0a6'), mat('prison_locker_d', '5f6c72')
PIRON = mat('prison_iron', '2c2a27')
def pwall(b):
    """parede de presidio: barra de baixo verde-cinza (ate 1,2 m), cima creme, faixa preta entre as duas (2 cm pra fora)"""
    mn, mx = b['min'], b['max']; h = mx[1] - mn[1]
    if mn[1] < 0.5 and h > 1.8:
        sp = mn[1] + 1.2
        box(PGREEN, mn, [mx[0], sp, mx[2]]); box(PCREAM, [mn[0], sp, mn[2]], mx)
        box(PSTRIPE, [mn[0] - 0.02, sp - 0.05, mn[2] - 0.02], [mx[0] + 0.02, sp + 0.05, mx[2] + 0.02])
    else: box(PCREAM if mn[1] > 0.5 else PGREEN, mn, mx)
def cellbars(b):
    """grade de cela: barras redondas a cada 13 cm e 3 travessas (a colisao e a caixa; a bala passa)"""
    mn, mx = b['min'], b['max']; (w, h, d), c = dims(b); along = w > d; Lg = w if along else d; a0 = mn[0] if along else mn[2]
    n = max(1, int(Lg / 0.13))
    for k in range(n + 1):
        t = a0 + 0.04 + k * (Lg - 0.08) / n
        cyl(PIRON, (t, c[2]) if along else (c[0], t), 0.022, mn[1] + 0.001, mx[1] - 0.001, 6)
    for yy in (mn[1] + 0.06, (mn[1] + mx[1]) / 2, mx[1] - 0.06):
        if along: box(PIRON, [mn[0], yy - 0.04, c[2] - 0.045], [mx[0], yy + 0.04, c[2] + 0.045])
        else: box(PIRON, [c[0] - 0.045, yy - 0.04, mn[2]], [c[0] + 0.045, yy + 0.04, mx[2]])
def bunk(b):
    """beliche de ferro: 4 pes de cano, 2 estrados com colchao listrado"""
    mn, mx = b['min'], b['max']
    for x in (mn[0] + 0.05, mx[0] - 0.05):
        for z in (mn[2] + 0.05, mx[2] - 0.05): cyl(PIRON, (x, z), 0.035, mn[1], mx[1], 6)
    for y0 in (mn[1] + 0.35, mn[1] + 1.2):
        box(PIRON, [mn[0] + 0.01, y0, mn[2] + 0.01], [mx[0] - 0.01, y0 + 0.06, mx[2] - 0.01])
        box(PMATT, [mn[0] + 0.07, y0 + 0.06, mn[2] + 0.12], [mx[0] - 0.07, y0 + 0.2, mx[2] - 0.12])
        for k in range(1, 6):
            z = mn[2] + 0.12 + k * (mx[2] - mn[2] - 0.24) / 6
            box(PSTRIPE, [mn[0] + 0.07, y0 + 0.2, z - 0.035], [mx[0] - 0.07, y0 + 0.21, z + 0.035])
def locker(b):
    """fileira de armarios de aco: frestas entre as portas, respiros em cima e tampa"""
    mn, mx = b['min'], b['max']; (w, h, d), c = dims(b); along = w > d; Lg = w if along else d; a0 = mn[0] if along else mn[2]
    box(PLOCK, mn, mx)
    n = max(1, int(Lg / 0.55))
    for k in range(n + 1):
        t = a0 + k * Lg / n; t = min(max(t, a0 + 0.03), a0 + Lg - 0.03)
        if along: box(PLOCKD, [t - 0.012, mn[1] + 0.06, mn[2] - 0.02], [t + 0.012, mx[1] - 0.06, mx[2] + 0.02])
        else: box(PLOCKD, [mn[0] - 0.02, mn[1] + 0.06, t - 0.012], [mx[0] + 0.02, mx[1] - 0.06, t + 0.012])
    for k in range(n):
        t = a0 + (k + 0.5) * Lg / n
        for j in range(3):
            yy = mx[1] - 0.3 - j * 0.07
            if along: box(PSTRIPE, [t - 0.14, yy - 0.015, mn[2] - 0.015], [t + 0.14, yy + 0.015, mx[2] + 0.015])
            else: box(PSTRIPE, [mn[0] - 0.015, yy - 0.015, t - 0.14], [mx[0] + 0.015, yy + 0.015, t + 0.14])
    box(PLOCKD, [mn[0] - 0.035, mx[1], mn[2] - 0.035], [mx[0] + 0.035, mx[1] + 0.05, mx[2] + 0.035])
def gallery(b):
    """balcao de cima das celas: laje de concreto, beira de aco escuro do lado da galeria e chapas em baixo"""
    mn, mx = b['min'], b['max']; (w, h, d), c = dims(b)
    box(CONC, mn, mx)
    ex = mn[0] if c[0] > 0 else mx[0]; sg = -1 if c[0] > 0 else 1
    box(STEELD, [min(ex, ex + sg * 0.05), mn[1] - 0.03, mn[2] + 0.01], [max(ex, ex + sg * 0.05), mx[1] + 0.02, mx[2] - 0.01])
def prail(b):
    """parapeito do balcao: corrimao, travessa do meio e montantes a cada 1,2 m (montante mais fino: sem face no mesmo plano)"""
    mn, mx = b['min'], b['max']; (w, h, d), c = dims(b); along = w > d; Lg = w if along else d; a0 = mn[0] if along else mn[2]
    box(STEEL, [mn[0], mx[1] - 0.06, mn[2]], mx)
    if along: box(STEEL, [mn[0], mn[1] + 0.48, mn[2] + 0.02], [mx[0], mn[1] + 0.53, mx[2] - 0.02])
    else: box(STEEL, [mn[0] + 0.02, mn[1] + 0.48, mn[2]], [mx[0] - 0.02, mn[1] + 0.53, mx[2]])
    n = max(1, int(Lg / 1.2))
    for k in range(n + 1):
        t = min(max(a0 + k * Lg / n, a0 + 0.04), a0 + Lg - 0.04)
        if along: box(STEELD, [t - 0.03, mn[1], mn[2] + 0.025], [t + 0.03, mx[1] - 0.06, mx[2] - 0.025])
        else: box(STEELD, [mn[0] + 0.025, mn[1], t - 0.03], [mx[0] - 0.025, mx[1] - 0.06, t + 0.03])
def chainfence(b):
    """alambrado: postes a cada 2,5 m, cano em cima, trama de arame (vertical e horizontal em planos diferentes) e arame farpado"""
    mn, mx = b['min'], b['max']; (w, h, d), c = dims(b); along = w > d; Lg = w if along else d; a0 = mn[0] if along else mn[2]
    P = lambda t, y0, y1, th: box(PIRON, [t - th, y0, c[2] - th], [t + th, y1, c[2] + th]) if along else box(PIRON, [c[0] - th, y0, t - th], [c[0] + th, y1, t + th])
    for k in range(int(Lg / 2.5) + 1):
        t = min(max(a0 + k * Lg / max(1, int(Lg / 2.5)), a0 + 0.05), a0 + Lg - 0.05); cyl(PIRON, (t, c[2]) if along else (c[0], t), 0.05, mn[1], mx[1] + 0.35, 8)
    for k in range(int(Lg / 0.22) + 1): P(a0 + 0.02 + k * (Lg - 0.04) / int(Lg / 0.22), mn[1] + 0.05, mx[1] - 0.05, 0.006)
    for j in range(int(h / 0.22) + 1):
        yy = mn[1] + 0.05 + j * (h - 0.1) / int(h / 0.22)
        if along: box(PIRON, [mn[0], yy - 0.006, c[2] - 0.01], [mx[0], yy + 0.006, c[2] + 0.01])
        else: box(PIRON, [c[0] - 0.01, yy - 0.006, mn[2]], [c[0] + 0.01, yy + 0.006, mx[2]])
    tube(STEELD, 'x' if along else 'z', (mx[1] + 0.02, c[2] if along else c[0]), 0.035, a0, a0 + Lg, 8)
    for k in range(int(Lg / 0.3)):
        t = a0 + (k + 0.5) * Lg / int(Lg / 0.3)
        if along: obox(PIRON, (t, mx[1] + 0.22, c[2]), (0.32, 0.02, 0.02), rz=40 if k % 2 else -40)
        else: obox(PIRON, (c[0], mx[1] + 0.22, t), (0.02, 0.02, 0.32), rx=40 if k % 2 else -40)
def proof(b):
    """teto do pavilhao: laje escura com luminarias penduradas em fileiras (2 cm abaixo da laje)"""
    mn, mx = b['min'], b['max']
    box(CONCD, mn, mx)
    for x in (-13.8, 0.0, 13.8):
        z = mn[2] + 3
        while z < mx[2] - 2:
            box(PAPER, [x - 0.5, mn[1] - 0.12, z - 0.18], [x + 0.5, mn[1] - 0.02, z + 0.18]); z += 6

DRAW = {'house': house, 'rock': rock, 'tower': tower, 'roof': lambda b: None, 'crate': crate, 'post': slimpost if MAP in ('ferradura', 'moeda') else post, 'pillar': pillarfn, 'vat': vat, 'machine': machine, 'pipe': lowpipe if MAP == 'refinaria' else pipe, 'concrete': concrete, 'silo': silo, 'derrick': derrick, 'marble': marble, 'column': column, 'rail': rail, 'counter': counter, 'bankroof': bankroof, 'duct': duct, 'coreto': coreto, 'coretoroof': coretoroof, 'bench': bench, 'hedge': hedge, 'lamp': lamp, 'dumpster': dumpster, 'car': lambda b: None, 'container': container, 'contshell': contshell, 'contdoor': contdoor, 'gantry': gantry, 'platform': deck, 'bridge': catwalk if MAP == 'fabrica' else concrete if MAP == 'apito' else deck, 'step': step, 'tank': tank,
        'wall': wallfn, 'hwall': hwall, 'hfloor': lambda b: box(WOODL, [b['min'][0] + 0.02, b['min'][1] + 0.005, b['min'][2] + 0.02], [b['max'][0] - 0.02, b['max'][1] - 0.005, b['max'][2] - 0.02]), 'hroof': lambda b: box(STONE, b['min'], b['max']), 'table': table,
        'quayedge': lambda b: None, 'boat': boat, 'boatcabin': boatcabin, 'boatstack': boatstack, 'plank': plank, 'shed': shed, 'shedroof': shedroof, 'cratepile': cratepile, 'forklift': forklift, 'barrel': barrel, 'bollard': bollard, 'railcar': railcar, 'crane': crane_leg, 'cranebeam': gantry,
        'studiowall': studiowall, 'studioext': studioext, 'desk': desk, 'easel': easel, 'shelf': shelf, 'booth': booth, 'roofdeck': roofdeck, 'chimney': chimney, 'forestedge': lambda b: None, 'granite': granite, 'copperroof': copperroof, 'goldtrim': goldtrim, 'mintsign': lambda b: None, 'tree': lambda b: None, 'log': lambda b: None}
if MAP == 'deserto': DRAW.update({'cliff': cliff, 'mesa': mesa, 'rockstep': rockstep, 'dune': dune, 'cactus': cactus, 'adobe': adobe, 'adobewall': adobewall, 'truck': lambda b: None, 'wall': canyonwall})  # caminhao = modelo do Tripo no jogo (MAP_KEEP)
if MAP == 'ilha': DRAW.update({'gantry': gantry_leg, 'derrick': lambda b: gantry_leg(b, RUST, RUSTD), 'pillar': snag, 'ringfloor': lambda b: None, 'rope': lambda b: None, 'post': lambda b: None, 'pipe': pipe, 'wall': border})  # ringue fica o do jogo (MAP_KEEP)
if MAP == 'tinteiro': DRAW.update({'vat': paintcan, 'rock': lambda b: None})  # floresta (pedra, tronco, arvore) fica a do jogo

# ---------- moveis e props novos (08/11, pedido dele): tudo na medida da caixa de colisao; detalhe sempre em plano proprio ----------
AWN_R, AWN_W, KIOSKG, WATER = mat('awning_r', 'b8352a'), mat('awning_w', 'ece4d2'), mat('kiosk', '4f6a52'), mat('water', '7d9aa6')
FRUIT = [mat('fruit_r', 'c0452f'), mat('fruit_y', 'd9a93a'), mat('fruit_g', '7f9a4a')]
CLOTH = [mat('cloth_a', 'e9e2d2'), mat('cloth_b', 'b8c7d0'), mat('cloth_c', 'd6a58a')]
def awning(mn, mx, along, n=6):
    L = (mx[0] - mn[0]) if along else (mx[2] - mn[2])
    for k in range(n):
        a, e = k / n * L, (k + 1) / n * L; m = AWN_R if k % 2 == 0 else AWN_W
        if along: box(m, [mn[0] + a, mn[1], mn[2]], [mn[0] + e, mx[1], mx[2]])
        else: box(m, [mn[0], mn[1], mn[2] + a], [mx[0], mx[1], mn[2] + e])
def stall(b):
    "barraca de feira: balcao, quatro postes, toldo listrado e mercadoria em cima"
    mn, mx = b['min'], b['max']; (w, h, d), c = dims(b); along = w >= d; top = mx[1]; y9 = mn[1] + 0.9; R = random.Random(int(c[0] * 11 + c[2] * 5))
    box(WOOD, mn, [mx[0], y9, mx[2]]); box(WOODD, [mn[0] - 0.025, y9 - 0.1, mn[2] - 0.025], [mx[0] + 0.025, y9 + 0.02, mx[2] + 0.025])
    for x in (mn[0] + 0.12, mx[0] - 0.12):
        for z in (mn[2] + 0.12, mx[2] - 0.12): box(WOODD, [x - 0.05, y9 + 0.02, z - 0.05], [x + 0.05, top - 0.22, z + 0.05])
    awning([mn[0] - 0.2, top - 0.22, mn[2] - 0.2], [mx[0] + 0.2, top, mx[2] + 0.2], along)
    n = 5; L = w if along else d
    for k in range(n):
        u = (k + 0.5) / n * L - L / 2; s = 0.16 + R.random() * 0.08; px, pz = (c[0] + u, c[2]) if along else (c[0], c[2] + u)
        box(FRUIT[k % 3], [px - s, y9 + 0.02, pz - s], [px + s, y9 + 0.02 + s * 1.6, pz + s])
def kiosk(b):
    "banca de jornal: caixa verde, telhado com beiral, revistas nas duas faces compridas e placa"
    mn, mx = b['min'], b['max']; (w, h, d), c = dims(b); along = w >= d; top = mx[1]; R = random.Random(int(c[0] * 7 + c[2] * 13))
    box(KIOSKG, mn, [mx[0], top - 0.3, mx[2]]); box(SLATE, [mn[0] - 0.24, top - 0.3, mn[2] - 0.24], [mx[0] + 0.24, top, mx[2] + 0.24])
    L = w if along else d
    for sgn in (-1, 1):
        for k in range(5):
            u = (k + 0.5) / 5 * L - L / 2; hw = L / 5 * 0.38; y0 = mn[1] + 0.85 + R.random() * 0.1; m = PAPER if k % 2 else TRIM
            if along: z = (mx[2] if sgn > 0 else mn[2]); box(m, [c[0] + u - hw, y0, min(z, z + sgn * 0.02)], [c[0] + u + hw, y0 + 0.75, max(z, z + sgn * 0.02)])
            else: x = (mx[0] if sgn > 0 else mn[0]); box(m, [min(x, x + sgn * 0.02), y0, c[2] + u - hw], [max(x, x + sgn * 0.02), y0 + 0.75, c[2] + u + hw])
def cart(b):
    "carrinho de pipoca: caixa vermelha sobre rodas, vidro claro e toldo listrado"
    mn, mx = b['min'], b['max']; (w, h, d), c = dims(b); along = w >= d; top = mx[1]; y0 = mn[1] + 0.42
    box(PAINTR, [mn[0], y0, mn[2]], [mx[0], y0 + 0.62, mx[2]])
    box(PAPER, [mn[0] + 0.12, y0 + 0.62, mn[2] + 0.12], [mx[0] - 0.12, top - 0.2, mx[2] - 0.12])
    awning([mn[0] - 0.12, top - 0.2, mn[2] - 0.12], [mx[0] + 0.12, top, mx[2] + 0.12], along, 4)
    L = w if along else d
    for k in (-1, 1):
        u = k * L * 0.27
        if along:
            for z0, z1 in ((mn[2] - 0.06, mn[2] + 0.02), (mx[2] - 0.02, mx[2] + 0.06)): tube(IRON, 'z', (mn[1] + 0.42, c[0] + u), 0.4, z0, z1, 12)
        else:
            for x0, x1 in ((mn[0] - 0.06, mn[0] + 0.02), (mx[0] - 0.02, mx[0] + 0.06)): tube(IRON, 'x', (mn[1] + 0.42, c[2] + u), 0.4, x0, x1, 12)
def fountain(b):
    "chafariz redondo: bacia, borda, agua, coluna e prato"
    (w, h, d), c = dims(b); r = w / 2; y0, y1 = b['min'][1], b['max'][1]; p = (c[0], c[2])
    cyl(STONE, p, r, y0, y1 - 0.12, 26); cyl(STONED, p, r + 0.04, y1 - 0.12, y1, 26); cyl(WATER, p, r - 0.2, y1, y1 + 0.012, 26)
    cyl(STONED, p, 0.36, y1 + 0.012, y1 + 1.05, 12, r2=0.22); cyl(STONE, p, 0.28, y1 + 1.05, y1 + 1.3, 14, r2=0.85); cyl(WATER, p, 0.72, y1 + 1.3, y1 + 1.312, 14); cyl(STONED, p, 0.12, y1 + 1.312, y1 + 1.85, 8, r2=0.05)
def poster(b):
    "coluna de cartazes: tubo verde, faixa de papel e chapeu"
    (w, h, d), c = dims(b); r = w / 2; y0, y1 = b['min'][1], b['max'][1]; p = (c[0], c[2])
    cyl(KIOSKG, p, r * 0.88, y0, y1 - 0.34, 16); cyl(PAPER, p, r * 0.92, y0 + 0.55, y1 - 0.75, 16); cyl(IRON, p, r, y1 - 0.34, y1, 16, r2=0.08)
def hydrant(b):
    (w, h, d), c = dims(b); y0, y1 = b['min'][1], b['max'][1]; p = (c[0], c[2])
    cyl(PAINTR, p, 0.17, y0, y1 - 0.2, 10); cyl(IRON, p, 0.22, y0, y0 + 0.07, 10); cyl(PAINTR, p, 0.17, y1 - 0.2, y1, 10, r2=0.05); tube(IRON, 'x', (y1 - 0.42, c[2]), 0.07, c[0] - 0.25, c[0] + 0.25, 8)
def mailbox(b):
    mn, mx = b['min'], b['max']; (w, h, d), c = dims(b); m = mat('mail', '2f5b8a')
    box(m, [c[0] - 0.3, mn[1] + 0.4, c[2] - 0.25], [c[0] + 0.3, mx[1], c[2] + 0.25]); box(IRON, [c[0] - 0.07, mn[1], c[2] - 0.07], [c[0] + 0.07, mn[1] + 0.4, c[2] + 0.07]); box(IRON, [c[0] - 0.2, mx[1] - 0.28, c[2] + 0.25], [c[0] + 0.2, mx[1] - 0.2, c[2] + 0.265])
def trashcan(b):
    (w, h, d), c = dims(b); r = w / 2 * 0.9; y0, y1 = b['min'][1], b['max'][1]; p = (c[0], c[2])
    cyl(IRON, p, r * 0.92, y0, y1 - 0.06, 12, r2=r); cyl(STONED, p, r + 0.03, y1 - 0.06, y1, 12)
    for yy in (y0 + h * 0.32, y0 + h * 0.64): cyl(STONED, p, r * 0.98, yy - 0.025, yy + 0.025, 12)
def streetclock(b):
    "relogio de rua: haste de ferro, caixa dourada e mostrador nas duas faces"
    (w, h, d), c = dims(b); y0, y1 = b['min'][1], b['max'][1]; p = (c[0], c[2])
    cyl(IRON, p, 0.14, y0, y0 + 0.5, 8); cyl(IRON, p, 0.07, y0 + 0.5, y1 - 0.72, 8); box(BRASS, [c[0] - 0.34, y1 - 0.72, c[2] - 0.13], [c[0] + 0.34, y1, c[2] + 0.13])
    for sgn in (-1, 1):
        z = c[2] + sgn * 0.13; box(PAPER, [c[0] - 0.25, y1 - 0.61, min(z, z + sgn * 0.015)], [c[0] + 0.25, y1 - 0.11, max(z, z + sgn * 0.015)])
        z2 = z + sgn * 0.015; box(IRON, [c[0] - 0.012, y1 - 0.36, min(z2, z2 + sgn * 0.01)], [c[0] + 0.012, y1 - 0.16, max(z2, z2 + sgn * 0.01)]); box(IRON, [c[0], y1 - 0.372, min(z2, z2 + sgn * 0.01)], [c[0] + 0.14, y1 - 0.348, max(z2, z2 + sgn * 0.01)])
DRAW.update({'stall': stall, 'kiosk': kiosk, 'cart': cart, 'fountain': fountain, 'poster': poster, 'hydrant': hydrant, 'mailbox': mailbox, 'trashcan': trashcan, 'streetclock': streetclock, 'truck': lambda b: None})
def clothesline(x0, y, z0, x1, y1, z1, seed):
    "varal atravessando o beco (so desenho): fio e roupa pendurada"
    alongx = abs(x1 - x0) > abs(z1 - z0); R = random.Random(seed); L = abs(x1 - x0) if alongx else abs(z1 - z0)
    if alongx: box(IRON, [min(x0, x1), y - 0.012, z0 - 0.012], [max(x0, x1), y + 0.012, z0 + 0.012])
    else: box(IRON, [x0 - 0.012, y - 0.012, min(z0, z1)], [x0 + 0.012, y + 0.012, max(z0, z1)])
    n = max(2, int(L / 0.9)); step = L / n
    for k in range(n):
        u = (k + 0.5) * step + (min(x0, x1) if alongx else min(z0, z1)); hw = step * 0.34 * (0.8 + R.random() * 0.4); hh = 0.45 + R.random() * 0.4; m = CLOTH[R.randrange(3)]; t = 0.012 + k * 0.0007
        if alongx: box(m, [u - hw, y - hh, z0 - t], [u + hw, y - 0.012, z0 + t])
        else: box(m, [x0 - t, y - hh, u - hw], [x0 + t, y - 0.012, u + hw])
skipped = {}
DRAW.update({'pwall': pwall, 'cellbars': cellbars, 'bunk': bunk, 'locker': locker, 'gallery': gallery, 'prail': prail, 'chainfence': chainfence, 'proof': proof})  # Xilindro (13/11)
for b in L['boxes']:
    fn = DRAW.get(b['k'])
    if fn: fn(b)
    else: skipped[b['k']] = skipped.get(b['k'], 0) + 1

for i, ln in enumerate((L.get('deco') or {}).get('lines') or []): clothesline(*ln, 40 + i)
if MAP in ('bonde', 'apito'): catenary()
if MAP == 'apito':
    watertower(-70, -90); watertower(92, 40)
    T = L.get('trackS') or []
    if T:
        for p, q in ((T[2], T[0]), (T[-3], T[-1])):
            nx, nz = q[2] - p[2], -(q[0] - p[0]); n = math.hypot(nx, nz) or 1
            signal(p[0] + nx / n * 3.2, p[2] + nz / n * 3.2, p[1], '+x')
if MAP == 'bonde':
    T = L.get('trackS') or []
    if T:
        for p, q in ((T[2], T[0]), (T[-3], T[-1])):
            nx, nz = q[2] - p[2], -(q[0] - p[0]); n = math.hypot(nx, nz) or 1
            signal(p[0] + nx / n * 3.0, p[2] + nz / n * 3.0, p[1], '+z')
if MAP == 'docas':
    lighthouse(-34, -96); rowboat(22, -53, 15); rowboat(-21, -52, -160); rowboat(30, -57, 80)
if MAP == 'tinteiro':
    S = L.get('studio') or 34
    filmreel(-S - 1.3, 14.4, 3); marquee(-S - 1.0, 3, 5.0)


# ---------- checagem anti-pisca (regra dele 06/11): duas faces no MESMO plano, MESMO sentido, se sobrepondo = flick ----------
def coplanar_report():
    from collections import defaultdict
    buckets = defaultdict(list)
    for name, M in MATS.items():
        bm = M['bm']; bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:]); bm.normal_update(); bm.faces.ensure_lookup_table()
        for f in bm.faces:
            n = f.normal.copy()
            if n.length < 0.5: continue
            ax = max(range(3), key=lambda i: abs(n[i]))
            if abs(n[ax]) < 0.999: continue                       # so faces alinhadas (as caixas); inclinadas nao entram
            d = round(f.verts[0].co[ax], 3); sgn = 1 if n[ax] > 0 else -1
            if ax == 2 and sgn < 0 and d <= 0.001: continue      # fundo encostado no chao: nunca aparece
            ctr = f.calc_center_median() + n * 0.004   # um tico pra fora da face: se cair dentro de outra caixa, ela esta enterrada
            if any(v[0] < ctr.x < v[1] and v[2] < ctr.y < v[3] and v[4] < ctr.z < v[5] for v in VOL): continue
            if ax == 2 and sgn < 0 and d <= 0.06: continue       # fundo rente ao chao (pe de porta, etc.)
            o = [i for i in range(3) if i != ax]
            xs = [v.co[o[0]] for v in f.verts]; ys = [v.co[o[1]] for v in f.verts]
            buckets[(ax, sgn, d)].append((min(xs), max(xs), min(ys), max(ys), name))
    # face encostada numa face OPOSTA (costas do vidro na parede, fundo de uma peca em cima de outra): nunca aparece
    def covered(ax, sgn, d, r):
        for o in buckets.get((ax, -sgn, d), []):
            if o[0] <= r[0] + 1e-3 and o[1] >= r[1] - 1e-3 and o[2] <= r[2] + 1e-3 and o[3] >= r[3] - 1e-3: return True
        return False
    for key in list(buckets):
        ax, sgn, d = key; buckets[key] = [r for r in buckets[key] if not covered(ax, sgn, d, r)]
    bad = []
    for key, fs in buckets.items():
        fs.sort()
        for i in range(len(fs)):
            a = fs[i]
            for j in range(i + 1, len(fs)):
                b = fs[j]
                if b[0] >= a[1] - 1e-4: break
                if min(a[3], b[3]) - max(a[2], b[2]) > 1e-3 and min(a[1], b[1]) - max(a[0], b[0]) > 1e-3 and (a[4] != b[4]):
                    bad.append((key, a[4], b[4], round((a[0] + a[1]) / 2, 2), round((a[2] + a[3]) / 2, 2)))
    return bad
BAD = coplanar_report()
if BAD:
    from collections import Counter
    raise RuntimeError('%d faces piscando (mesmo plano, mesmo sentido): nao exporto. Pares: %s. Exemplos: %s' % (len(BAD), Counter(tuple(sorted((x[1], x[2]))) for x in BAD).most_common(12), BAD[:6]))  # regra dele 06/11

# ---------- uma malha por material ----------
objs = []
for name, M in MATS.items():
    bm = M['bm']
    if not bm.faces: bm.free(); continue
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    me = bpy.data.meshes.new('map_' + name); bm.to_mesh(me); bm.free(); me.materials.append(M['m'])
    o = bpy.data.objects.new('map_' + name, me); scn.collection.objects.link(o); objs.append(o)
tri = sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in objs)

# ---------- exporta e renderiza ----------
vl = scn.view_layers[0]  # exporta SO a cena deste mapa (o arquivo aberto pode ter outras cenas com coisa selecionada)
for o in scn.objects: o.select_set(o in objs, view_layer=vl)
with bpy.context.temp_override(scene=scn, view_layer=vl):
    bpy.ops.export_scene.gltf(filepath=GLB, export_format='GLB', use_selection=True, use_active_scene=True, export_apply=True, export_yup=True, export_materials='EXPORT')
scn.render.engine = 'BLENDER_WORKBENCH'
sh = scn.display.shading; sh.light = 'STUDIO'; sh.color_type = 'MATERIAL'; sh.show_cavity = True; sh.cavity_type = 'WORLD'; sh.show_object_outline = True
scn.world = scn.world or bpy.data.worlds.new('rr_' + MAP); scn.world.color = srgb(TH['sky'])
scn.render.resolution_x, scn.render.resolution_y = 1400, 900
cd = bpy.data.cameras.new(MAP + '_cam'); cd.lens = 35; cam = bpy.data.objects.new(MAP + '_cam', cd); scn.collection.objects.link(cam); scn.camera = cam
renders = []
CAMS = {'vila': (('alto', (52, -52, 48), (0, 0, 0)), ('rua', (0, -30, 2.2), (0, 10, 3)), ('casas', (-34, 6, 5), (-22, 20, 4))),
        'estaleiro': (('alto', (30, -30, 26), (0, 0, 2)), ('chao', (3, 19, 1.7), (0, 0, 2.5)), ('meio', (-17, -2, 1.7), (6, 4, 2.5))),
        'fabrica': (('alto', (44, -44, 34), (0, 0, 2)), ('chao', (-6, 26, 1.7), (2, 0, 3)), ('passarela', (-24, -13, 5.8), (10, -6, 3.5))),
        'refinaria': (('alto', (46, -46, 36), (0, 0, 3)), ('chao', (-6, 22, 1.7), (2, 0, 5)), ('silos', (12, 12, 1.7), (-24, 24, 3))),
        'ferradura': (('alto', (52, -52, 40), (0, 0, 3)), ('frente', (8, -40, 2.2), (0, -16, 6)), ('salao', (-14, 6, 4.8), (6, -6, 2))),
        'docas': (('alto', (58, -58, 44), (0, 0, 2)), ('barco', (6, 34, 1.7), (0, 52, 2.5)), ('armazem', (-2, -18, 1.7), (0, -40, 3)), ('guindaste', (28, 0, 1.7), (44, -10, 7))),
        'tinteiro': (('alto', (40, -40, 34), (0, 0, 0)), ('salao', (-9, 9, 1.7), (6, -6, 2.5)), ('telhado', (0, 8, 4.7), (0, 26, 3)), ('fora', (-50, -3, 3), (-34, -3, 5))),
        'moeda': (('alto', (52, -52, 40), (0, 0, 3)), ('frente', (6, 34, 2.2), (0, 14, 6)), ('salao', (-10, -16, 2), (6, -26, 2)), ('beco', (30, 26, 2), (30, -10, 3))),
        'bonde': (('alto', (60, -60, 50), (0, 0, 0)), ('rua', (-36, 40, 1.7), (-12, 24, 3)), ('viaduto', (-24, 20, 2), (-28, 30, 4))),
        'apito': (('alto', (72, -72, 60), (0, 0, 0)), ('vale', (-10, 14, 1.7), (10, 5, 3)), ('casas', (-20, 40, 1.7), (-42, 40, 3))),
        'ilha': (('alto', (120, -120, 110), (0, 0, 0)), ('porto', (-40, 40, 2), (-66, 66, 4)), ('soluco', (40, -40, 2), (64, -70, 5)), ('brejo', (-70, 0, 2), (-88, 0, 3))),
        'deserto': (('alto', (130, -130, 110), (0, 0, 0)), ('ponte', (-20, -30, 2), (0, 0, 3)), ('base', (20, 90, 2), (0, 112, 4)), ('mesa', (-70, 30, 2), (-96, 52, 4))),
        'becos': (('alto', (72, -72, 60), (0, 0, 0)), ('beco', (-9, -30, 2.0), (-9, 0, 3))), 'feira': (('alto', (80, -80, 64), (0, 0, 0)), ('mercado', (-20, -14, 2.2), (0, 0, 3))), 'largo': (('alto', (84, -84, 68), (0, 0, 0)), ('largo', (0, -28, 2.2), (0, 0, 3))), 'cortejo': (('alto', (84, -84, 68), (0, 0, 0)), ('avenida', (-12, 8, 2.2), (30, 8, 3))),
        'xilindro': (('alto', (46, -62, 52), (0, 0, 0)), ('galeria', (0, -20, 1.7), (0, 10, 2.5)), ('celas', (-3, -6, 4.3), (-8, 6, 1.5)), ('patio', (10, -38, 2), (-4, -26, 2.5)), ('armarios', (-13.7, -22, 1.7), (-13.7, 4, 1.5))),
        'trapiche': (('alto', (40, -40, 34), (0, 0, 0)), ('rua', (0, -24, 1.7), (0, 10, 2)), ('casarao', (0, 8, 1.7), (0, 24, 3)), ('quintal', (-28, -26, 1.7), (-24, 10, 2))),
        'fronteira': (('alto', (72, -72, 62), (0, 0, 0)), ('forte', (14, 50, 2.2), (0, 70, 5)), ('meio', (-30, 12, 2.2), (30, -4, 3)), ('casas', (-44, -6, 6), (-58, -22, 3)))}[MAP]
for nm, loc, tgt in CAMS:
    cam.location = Vector(loc); cam.rotation_euler = (Vector(tgt) - cam.location).to_track_quat('-Z', 'Y').to_euler()
    scn.render.filepath = os.path.join(HERE, 'out', MAP + '-' + nm + '.png'); bpy.ops.render.render(write_still=True, scene=scn.name); renders.append(scn.render.filepath)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(HERE, MAP + '.blend'), copy=True)
_g = dict(globals()); _g['ONLY'] = [MAP]; exec(open(os.path.join(HERE, 'draco.py'), encoding='utf-8').read(), _g); bpy.context.window.scene = scn  # Draco (pedido dele 06/11): grava o comprimido em public/models/maps
result = {'draco_mb': _g.get('result'), 'pisca': len(BAD), 'pisca_ex': BAD[:12], 'objetos': len(objs), 'triangulos': tri, 'sem_desenho': skipped, 'glb': GLB, 'renders': renders}
