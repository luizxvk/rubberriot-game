# Contadores de abates (13/11, pedido dele): 15 modelos tematicos do Rubber Riot, presos no lado esquerdo da arma.
# Cada um tem uma peca 'screen' (plano/disco virado pra +Z, UV de 0 a 1) onde o jogo desenha a contagem (src/killcounter.js).
# Frente do modelo = +Z; altura total ~1. Cor de cada peca = material (o jogo troca por toon da mesma cor).
# E:\Blender\blender.exe -b --factory-startup --python tools/blender/killcounter.py [-- id ...]
import bpy, bmesh, sys, os, math
from mathutils import Vector

OUT = r'D:\Desktop\fokusstudios\tinta-louca\public\models\src'
ONLY = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []

MATS = {}
def mat(hexc):
    if hexc in MATS: return MATS[hexc]
    m = bpy.data.materials.new('c_' + hexc); m.use_nodes = True
    r, g, b = (int(hexc[i:i + 2], 16) / 255 for i in (0, 2, 4))
    lin = lambda c: c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    col = (lin(r), lin(g), lin(b), 1)
    m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = col; m.diffuse_color = col
    MATS[hexc] = m; return m

def put(o, hexc, bevel=0.0, smooth=False):
    o.data.materials.clear(); o.data.materials.append(mat(hexc))
    if bevel > 0:
        md = o.modifiers.new('bv', 'BEVEL'); md.width = bevel; md.segments = 2; md.limit_method = 'ANGLE'
    if smooth:
        for p in o.data.polygons: p.use_smooth = True
    return o

def cur(): return bpy.context.active_object
def box(sx, sy, sz, loc, hexc, bevel=0.02, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot); o = cur(); o.scale = (sx, sy, sz)
    bpy.ops.object.transform_apply(scale=True); return put(o, hexc, bevel)
def cyl(r, d, loc, hexc, rot=(0, 0, 0), v=24, bevel=0.0, smooth=True):
    bpy.ops.mesh.primitive_cylinder_add(vertices=v, radius=r, depth=d, location=loc, rotation=rot); return put(cur(), hexc, bevel, smooth)
def cone(r1, r2, d, loc, hexc, rot=(0, 0, 0), v=20):
    bpy.ops.mesh.primitive_cone_add(vertices=v, radius1=r1, radius2=r2, depth=d, location=loc, rotation=rot); return put(cur(), hexc, 0, True)
def sph(r, loc, hexc, scale=(1, 1, 1), seg=14):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=max(6, seg // 2), radius=r, location=loc); o = cur(); o.scale = scale
    bpy.ops.object.transform_apply(scale=True); return put(o, hexc, 0, True)
def tor(R, r, loc, hexc, rot=(0, 0, 0), maj=28, mino=8):
    bpy.ops.mesh.primitive_torus_add(major_radius=R, minor_radius=r, major_segments=maj, minor_segments=mino, location=loc, rotation=rot); return put(cur(), hexc, 0, True)
def cut_half(o, axis=1, keep_pos=True, at=0.0):
    # apaga a metade da malha (arco de ferradura, alca)
    bm = bmesh.new(); bm.from_mesh(o.data)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if ((v.co[axis] < at) if keep_pos else (v.co[axis] > at))], context='VERTS')
    bm.to_mesh(o.data); bm.free(); return o

def screen(w, h, loc, round_=False, rot=(0, 0, 0)):
    # tela: plano (ou disco) virado pra +Z, UV pela caixa
    if round_: bpy.ops.mesh.primitive_circle_add(vertices=40, radius=w / 2, fill_type='NGON', location=loc, rotation=rot)
    else: bpy.ops.mesh.primitive_plane_add(size=1, location=loc, rotation=rot); cur().scale = (w, h, 1); bpy.ops.object.transform_apply(scale=True)
    o = cur(); o.name = 'screen'; o.data.name = 'screen'
    me = o.data; uv = me.uv_layers[0] if me.uv_layers else me.uv_layers.new()
    xs = [v.co.x for v in me.vertices]; ys = [v.co.y for v in me.vertices]; x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
    for p in me.polygons:
        for li in p.loop_indices:
            co = me.vertices[me.loops[li].vertex_index].co; uv.data[li].uv = ((co.x - x0) / (x1 - x0), (co.y - y0) / (y1 - y0))
    o.data.materials.clear(); m = bpy.data.materials.new('screen'); m.use_nodes = True; o.data.materials.append(m)
    return o

def star_prism(n, R, r, depth, loc, hexc):
    bm = bmesh.new(); vs = []
    for i in range(n * 2):
        a = math.pi / 2 + i * math.pi / n; rad = R if i % 2 == 0 else r
        vs.append(bm.verts.new((math.cos(a) * rad, math.sin(a) * rad, 0)))
    f = bm.faces.new(vs); ext = bmesh.ops.extrude_face_region(bm, geom=[f])
    for v in [e for e in ext['geom'] if isinstance(e, bmesh.types.BMVert)]: v.co.z += depth
    bmesh.ops.translate(bm, verts=bm.verts, vec=(0, 0, -depth / 2)); bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new('star'); bm.to_mesh(me); bm.free(); o = bpy.data.objects.new('star', me); bpy.context.collection.objects.link(o)
    o.location = loc; bpy.context.view_layer.objects.active = o; return put(o, hexc, 0.012)

def gear(R, teeth, depth, loc, hexc):
    cyl(R * 0.86, depth, loc, hexc, rot=(0, 0, 0), v=40, smooth=False)
    for i in range(teeth):
        a = i * 2 * math.pi / teeth
        box(R * 0.22, R * 0.2, depth, (loc[0] + math.cos(a) * R * 0.92, loc[1] + math.sin(a) * R * 0.92, loc[2]), hexc, 0.008, rot=(0, 0, a))

INK = '141210'
# ---------- os 15 ----------
def m_despertador():
    cyl(0.42, 0.24, (0, 0, 0), 'c23a2c', rot=(0, 0, 0), v=36)                       # caixa vermelha (eixo Z = frente)
    tor(0.42, 0.04, (0, 0, 0.12), 'd9b24c')                                        # aro de latao
    for s in (-1, 1):
        sph(0.17, (s * 0.3, 0.42, 0), 'd9b24c', scale=(1, 0.7, 1))                 # sinos
        cyl(0.025, 0.14, (s * 0.2, 0.33, 0), INK, rot=(math.pi / 2, 0, s * 0.6))
        cyl(0.03, 0.16, (s * 0.26, -0.45, 0), INK, rot=(math.pi / 2, 0, -s * 0.4))           # pes
    cyl(0.03, 0.5, (0, 0.5, 0), INK, rot=(0, math.pi / 2, 0))                     # martelo
    sph(0.05, (0, 0.5, 0), 'd9b24c')
    screen(0.68, 0.68, (0, 0, 0.125), round_=True)

def m_radio():
    box(0.9, 0.62, 0.36, (0, -0.1, 0), '8a5a2b', 0.04)                              # gabinete de madeira
    cyl(0.45, 0.36, (0, 0.21, 0), '8a5a2b', rot=(0, 0, 0), v=32)
    o = cur(); cut_half(o, axis=1, keep_pos=True, at=0.21)                         # topo em arco
    for i in range(5): box(0.04, 0.24, 0.02, (-0.16 + i * 0.08, 0.26, 0.18), 'd9c8a0', 0.005)  # grade do alto-falante
    for s in (-1, 1): cyl(0.06, 0.06, (s * 0.32, -0.3, 0.19), 'd9b24c')  # botoes
    box(0.6, 0.26, 0.02, (0, -0.08, 0.18), 'd9b24c', 0.01)                         # moldura do dial
    screen(0.54, 0.2, (0, -0.08, 0.195))

def m_letreiro():
    box(1.0, 0.62, 0.16, (0, 0, 0), 'a83a2c', 0.03)
    box(0.86, 0.48, 0.02, (0, 0, 0.08), INK, 0.0)
    for i in range(10):
        for y in (0.28, -0.28): sph(0.03, (-0.45 + i * 0.1, y, 0.09), 'ffd23a', seg=8)
    for y in range(4):
        for x in (-0.48, 0.48): sph(0.03, (x, -0.17 + y * 0.115, 0.09), 'ffd23a', seg=8)
    box(0.36, 0.14, 0.12, (0, 0.38, 0), 'ece9e1', 0.02)                            # placa de cima
    screen(0.78, 0.42, (0, 0, 0.092))

def m_tv():
    box(0.95, 0.72, 0.5, (0, 0, -0.1), '6b4a2a', 0.06)
    box(0.62, 0.52, 0.04, (-0.1, 0, 0.15), '3a3631', 0.03)
    for i in range(3): cyl(0.045, 0.05, (0.33, 0.18 - i * 0.16, 0.16), 'd9b24c')
    for s in (-1, 1): cyl(0.012, 0.5, (s * 0.14, 0.55, -0.1), INK, rot=(math.pi / 2, 0, s * 0.45)); sph(0.03, (s * 0.25, 0.77, -0.1), INK)
    for s in (-1, 1): cyl(0.025, 0.14, (s * 0.35, -0.42, -0.1), INK, rot=(math.pi / 2, 0, 0))
    screen(0.54, 0.44, (-0.1, 0, 0.175))

def m_dinamite():
    for i, x in enumerate((-0.24, 0, 0.24)):
        cyl(0.13, 0.9, (x, 0, -0.12), 'c23a2c', rot=(math.pi / 2, 0, 0), v=18)
        tor(0.135, 0.018, (x, 0.28, -0.12), 'ece9e1', rot=(math.pi / 2, 0, 0), maj=18, mino=6)
        tor(0.135, 0.018, (x, -0.28, -0.12), 'ece9e1', rot=(math.pi / 2, 0, 0), maj=18, mino=6)
    cyl(0.012, 0.2, (0, 0.53, -0.12), INK, rot=(math.pi / 2 - 0.3, 0, 0))                        # pavio
    box(0.6, 0.34, 0.12, (0, 0.02, 0.06), '3a3631', 0.02)                          # cronometro
    for s, c in ((-1, 'e0301e'), (1, '2f5b8a')): cyl(0.012, 0.5, (s * 0.31, 0.16, 0.05), c, rot=(math.pi / 2, 0, s * 0.3))
    screen(0.5, 0.24, (0, 0.02, 0.122))

def m_caveira():
    for s in (-1, 1):
        cyl(0.04, 0.95, (0, 0.08, -0.08), 'ece9e1', rot=(math.pi / 2, 0, s * 0.8), v=10)       # ossos cruzados
        for e in (-1, 1): sph(0.06, (s * e * 0.33, 0.08 + e * 0.33, -0.08), 'ece9e1', seg=10)
    sph(0.3, (0, 0.18, 0), 'ece9e1', scale=(1, 0.95, 0.85))
    box(0.32, 0.14, 0.24, (0, -0.06, 0.02), 'ece9e1', 0.04)
    for s in (-1, 1): sph(0.08, (s * 0.11, 0.18, 0.21), INK, scale=(1, 1.1, 0.4))
    box(0.18, 0.16, 0.36, (0, 0.38, -0.02), INK, 0.03)                              # tricorne de cima (faixa)
    box(0.8, 0.3, 0.08, (0, -0.36, 0.05), '6b4a2a', 0.02)                          # placa
    screen(0.68, 0.22, (0, -0.36, 0.092))

def m_ferradura():
    o = tor(0.4, 0.09, (0, 0.06, 0), 'a39b8e', maj=36, mino=10); cut_half(o, axis=1, keep_pos=True, at=-0.15)
    for s in (-1, 1): cyl(0.09, 0.2, (s * 0.4, -0.18, 0), 'a39b8e', rot=(math.pi / 2, 0, 0), v=12)
    for a in (0.5, 1.0, 1.6, 2.1, 2.6):
        sph(0.025, (math.cos(a) * 0.4, 0.06 + math.sin(a) * 0.4, 0.085), INK, seg=8)
    box(0.5, 0.3, 0.06, (0, -0.02, 0.0), 'd9b24c', 0.02)                           # plaquinha dentro do U
    screen(0.42, 0.22, (0, -0.02, 0.032))

def m_tinta():
    cyl(0.36, 0.7, (0, 0, -0.1), 'c9cfd4', rot=(math.pi / 2, 0, 0), v=32)           # lata em pe
    tor(0.36, 0.03, (0, 0.35, -0.1), 'a39b8e', rot=(math.pi / 2, 0, 0))
    tor(0.36, 0.03, (0, -0.35, -0.1), 'a39b8e', rot=(math.pi / 2, 0, 0))
    o = tor(0.3, 0.018, (0, 0.35, -0.1), INK); cut_half(o, axis=1, keep_pos=True, at=0.35)  # alca
    for x, l in ((-0.2, 0.22), (0.05, 0.34), (0.22, 0.16)): cyl(0.05, l, (x, 0.35 - l / 2, 0.24), 'e0301e', rot=(math.pi / 2, 0, 0), v=10); sph(0.055, (x, 0.35 - l, 0.24), 'e0301e', seg=10)
    box(0.56, 0.4, 0.02, (0, -0.06, 0.255), 'faf8f2', 0.005)
    screen(0.5, 0.34, (0, -0.06, 0.268))

def m_trofeu():
    cone(0.16, 0.36, 0.42, (0, 0.24, 0), 'e0b13a', rot=(-math.pi / 2, 0, 0), v=28)  # taca (larga em cima)
    tor(0.36, 0.03, (0, 0.45, 0), 'e0b13a', rot=(math.pi / 2, 0, 0))
    for s in (-1, 1): o = tor(0.13, 0.03, (s * 0.38, 0.27, 0), 'e0b13a', maj=16, mino=6); cut_half(o, axis=0, keep_pos=(s > 0), at=s * 0.38)
    cyl(0.05, 0.2, (0, -0.06, 0), 'e0b13a', rot=(math.pi / 2, 0, 0), v=12)
    box(0.7, 0.36, 0.3, (0, -0.33, 0), INK, 0.03)                                  # base
    box(0.56, 0.24, 0.02, (0, -0.33, 0.15), 'd9b24c', 0.008)
    screen(0.5, 0.2, (0, -0.33, 0.162))

def m_bigorna():
    box(0.9, 0.26, 0.42, (0, 0.24, 0), '5f6468', 0.03)                              # face de bater
    cone(0.13, 0.0, 0.42, (-0.64, 0.27, 0), '5f6468', rot=(0, -math.pi / 2, 0), v=16)  # chifre
    box(0.4, 0.3, 0.32, (0, -0.02, 0), '4a4e52', 0.03)                              # cintura
    box(0.8, 0.22, 0.46, (0, -0.28, 0), '5f6468', 0.03)                             # pe
    screen(0.36, 0.22, (0, -0.02, 0.162))

def m_fliperama():
    box(0.72, 1.0, 0.5, (0, 0, -0.15), '2f5b8a', 0.03)
    box(0.74, 0.18, 0.56, (0, 0.5, -0.12), 'ffd23a', 0.02)                          # placa de cima
    box(0.74, 0.14, 0.34, (0, -0.16, 0.2), '3a3631', 0.02, rot=(-0.5, 0, 0))        # painel do controle
    cyl(0.015, 0.12, (-0.16, -0.08, 0.32), INK, rot=(math.pi / 2, 0, 0), v=8); sph(0.04, (-0.16, -0.02, 0.34), 'e0301e', seg=10)
    for i in range(3): cyl(0.035, 0.03, (0.04 + i * 0.1, -0.1, 0.33), ('e0301e', '47b04b', 'ffd23a')[i], rot=(-0.5, 0, 0), v=12)
    box(0.58, 0.44, 0.04, (0, 0.18, 0.11), INK, 0.01)
    screen(0.5, 0.36, (0, 0.18, 0.132))

def m_engrenagem():
    gear(0.5, 12, 0.14, (0, 0, -0.04), 'b5652b')
    tor(0.3, 0.035, (0, 0, 0.04), 'd9b24c')
    for a in range(4): cyl(0.03, 0.04, (math.cos(a * 1.57 + 0.78) * 0.38, math.sin(a * 1.57 + 0.78) * 0.38, 0.05), 'd9b24c', v=8)
    screen(0.54, 0.54, (0, 0, 0.042), round_=True)

def m_xerife():
    star_prism(5, 0.55, 0.25, 0.08, (0, 0, 0), 'e0b13a')
    for i in range(5):
        a = math.pi / 2 + i * 2 * math.pi / 5; sph(0.06, (math.cos(a) * 0.57, math.sin(a) * 0.57, 0), 'e0b13a', seg=10)
    cyl(0.25, 0.04, (0, 0, 0.04), 'c9a34a', v=32)
    screen(0.42, 0.42, (0, 0, 0.062), round_=True)

def m_taximetro():
    box(0.95, 0.44, 0.34, (0, -0.1, 0), INK, 0.04)
    box(0.84, 0.26, 0.02, (0, -0.08, 0.17), 'ece9e1', 0.01)
    box(0.06, 0.34, 0.06, (0.36, 0.27, 0), 'a39b8e', 0.01)                          # haste da bandeira
    box(0.38, 0.2, 0.05, (0.2, 0.47, 0), 'e0301e', 0.015)                           # bandeira LIVRE
    cyl(0.06, 0.08, (-0.52, -0.1, 0), 'a39b8e', rot=(0, math.pi / 2, 0), v=12)      # manivela
    box(0.04, 0.22, 0.04, (-0.58, -0.2, 0), 'a39b8e', 0.01)
    screen(0.78, 0.2, (0, -0.08, 0.182))

def m_cartola():
    cyl(0.34, 0.66, (0, 0.12, -0.1), INK, rot=(math.pi / 2, 0, 0), v=32)            # copa
    cyl(0.55, 0.05, (0, -0.22, -0.1), INK, rot=(math.pi / 2, 0, 0), v=36)           # aba
    cyl(0.345, 0.18, (0, -0.1, -0.1), '6b3fb3', rot=(math.pi / 2, 0, 0), v=32)      # faixa roxa
    box(0.18, 0.24, 0.02, (0.28, 0.3, 0.26), 'ece9e1', 0.005, rot=(0, 0, -0.4))     # carta de baralho
    screen(0.46, 0.15, (0, -0.1, 0.25))

MODELS = {'despertador': m_despertador, 'radio': m_radio, 'letreiro': m_letreiro, 'tv': m_tv, 'dinamite': m_dinamite, 'caveira': m_caveira,
          'ferradura': m_ferradura, 'tinta': m_tinta, 'trofeu': m_trofeu, 'bigorna': m_bigorna, 'fliperama': m_fliperama, 'engrenagem': m_engrenagem,
          'xerife': m_xerife, 'taximetro': m_taximetro, 'cartola': m_cartola}

for mid, fn in MODELS.items():
    if ONLY and mid not in ONLY: continue
    for o in list(bpy.data.objects): bpy.data.objects.remove(o, do_unlink=True)
    fn()
    for o in bpy.context.scene.objects:
        o.select_set(True); bpy.context.view_layer.objects.active = o
        for md in list(o.modifiers): bpy.ops.object.modifier_apply(modifier=md.name)
    bpy.ops.object.select_all(action='SELECT')
    out = os.path.join(OUT, 'kc_' + mid + '.glb')
    bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', use_selection=True, export_materials='EXPORT', export_apply=True)
    tris = sum(len(o.data.polygons) for o in bpy.context.scene.objects if o.type == 'MESH')
    print('KC', mid, tris, os.path.getsize(out))
