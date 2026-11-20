# Chaveiros feitos no Blender (19/11: o Tripo ficou sem credito). Sem textura: uma cor por peca (o jogo junta tudo numa malha
# so com a cor no vertice, src/charms.js). Roda em fundo:
#   E:\Blender\blender.exe -b --factory-startup --python tools/blender/charms.py
# Gera public/models/src/charm_<id>.glb e a previa .png do lado. Escala livre (o jogo normaliza pro tamanho do chaveiro;
# pendura pelo ponto mais alto, entao a argola fica no topo).
import bpy, bmesh, math, os
from mathutils import Vector, Matrix

OUTD = r'D:\Desktop\fokusstudios\tinta-louca\public\models\src'
def srgb(h): return tuple(((int(h[i:i + 2], 16) / 255) ** 2.2) for i in (0, 2, 4))
def mat(name, hexcol):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True; c = (*srgb(hexcol), 1); m.diffuse_color = c
    b = m.node_tree.nodes.get('Principled BSDF'); b.inputs['Base Color'].default_value = c; b.inputs['Roughness'].default_value = 0.6
    return m
def clear():
    for o in list(bpy.data.objects): bpy.data.objects.remove(o, do_unlink=True)
    for me in list(bpy.data.meshes): bpy.data.meshes.remove(me)
def part(name, m, build):
    bm = bmesh.new(); build(bm)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free(); me.materials.append(m)
    o = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(o); return o
def cyl(bm, r, d, seg, at, axis='Z', r2=None):
    g = bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, radius1=r, radius2=r if r2 is None else r2, depth=d)
    R = {'Z': Matrix.Identity(3), 'X': Matrix.Rotation(math.pi / 2, 3, 'Y'), 'Y': Matrix.Rotation(math.pi / 2, 3, 'X')}[axis]
    for v in g['verts']: v.co = R @ v.co + Vector(at)
def cube(bm, size, at):
    g = bmesh.ops.create_cube(bm, size=1)
    for v in g['verts']: v.co = Vector((v.co.x * size[0], v.co.y * size[1], v.co.z * size[2])) + Vector(at)
def torus(bm, R0, r0, at, N=14, M=6, axis='Y'):
    ring = []
    for i in range(N):
        a = i / N * 2 * math.pi
        row = []
        for j in range(M):
            b = j / M * 2 * math.pi; x, z = math.cos(a) * (R0 + math.cos(b) * r0), math.sin(a) * (R0 + math.cos(b) * r0); y = math.sin(b) * r0
            p = Vector((x, y, z)) if axis == 'Y' else Vector((y, x, z))
            row.append(bm.verts.new(p + Vector(at)))
        ring.append(row)
    for i in range(N):
        for j in range(M): bm.faces.new((ring[i][j], ring[(i + 1) % N][j], ring[(i + 1) % N][(j + 1) % M], ring[i][(j + 1) % M]))
def export(id_, cam_loc, cam_tgt):
    out = os.path.join(OUTD, 'charm_' + id_ + '.glb')
    for o in bpy.context.scene.objects: o.select_set(o.type == 'MESH')
    bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', use_selection=True, export_apply=True, export_yup=True, export_materials='EXPORT')
    tri = sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in bpy.context.scene.objects if o.type == 'MESH')
    sc = bpy.context.scene; sc.render.engine = 'BLENDER_WORKBENCH'; sh = sc.display.shading; sh.light = 'STUDIO'; sh.color_type = 'MATERIAL'; sh.show_object_outline = True
    cd = bpy.data.cameras.new('c'); cd.lens = 60; cam = bpy.data.objects.new('c', cd); sc.collection.objects.link(cam); sc.camera = cam
    cam.location = Vector(cam_loc); cam.rotation_euler = (Vector(cam_tgt) - cam.location).to_track_quat('-Z', 'Y').to_euler()
    sc.render.resolution_x, sc.render.resolution_y = 512, 512; sc.render.film_transparent = True
    sc.render.filepath = out.replace('.glb', '.png'); bpy.ops.render.render(write_still=True)
    print('CHARM', id_, {'tri': tri, 'kb': round(os.path.getsize(out) / 1024, 1)})

# ---------- Maria-Fumaca: locomotiva gordinha de desenho (caldeira, cabine, chamine de funil, rodas vermelhas) ----------
clear()
BLK, RED, GOLD, CRM, GRY = mat('ch_black', '2a2724'), mat('ch_red', 'c8382c'), mat('ch_gold', 'e0b040'), mat('ch_cream', 'f2ead8'), mat('ch_gray', '6e6a64')
part('caldeira', BLK, lambda bm: cyl(bm, 0.55, 1.7, 16, (0.35, 0, 0.95), 'X'))
part('frente', GRY, lambda bm: cyl(bm, 0.5, 0.12, 16, (1.24, 0, 0.95), 'X'))
part('cintas', GOLD, lambda bm: [cyl(bm, 0.57, 0.08, 16, (x, 0, 0.95), 'X') for x in (-0.2, 0.35, 0.9)])
part('cabine', RED, lambda bm: cube(bm, (0.8, 1.15, 1.0), (-0.85, 0, 1.15)))
part('teto', BLK, lambda bm: cube(bm, (0.98, 1.3, 0.14), (-0.85, 0, 1.72)))
part('janelas', CRM, lambda bm: [cube(bm, (0.42, 0.04, 0.32), (-0.85, s * 0.585, 1.3)) for s in (-1, 1)])
part('chamine', BLK, lambda bm: (cyl(bm, 0.16, 0.5, 12, (0.95, 0, 1.68)), cyl(bm, 0.32, 0.28, 12, (0.95, 0, 2.05), 'Z', 0.18)))
part('domo', GOLD, lambda bm: cyl(bm, 0.2, 0.26, 12, (0.35, 0, 1.58), 'Z', 0.12))
part('chassi', GRY, lambda bm: cube(bm, (2.5, 0.9, 0.22), (0.15, 0, 0.42)))
part('rodas', RED, lambda bm: [cyl(bm, r, 0.14, 14, (x, s * 0.52, r), 'Y') for x, r in ((-0.85, 0.42), (0.15, 0.32), (0.85, 0.32)) for s in (-1, 1)])
part('cubos', GOLD, lambda bm: [cyl(bm, 0.09, 0.18, 8, (x, s * 0.52, r), 'Y') for x, r in ((-0.85, 0.42), (0.15, 0.32), (0.85, 0.32)) for s in (-1, 1)])
part('limpa', RED, lambda bm: cube(bm, (0.3, 0.8, 0.3), (1.45, 0, 0.3)))
part('argola', GOLD, lambda bm: torus(bm, 0.2, 0.05, (-0.85, 0, 2.02), 14, 6, 'Y'))
export('locomotiva', (3.2, -4.0, 2.6), (0.1, 0, 1.0))

# ---------- Relogio de Bolso: caixa dourada, mostrador creme com marcas e ponteiros, coroa e argola em cima ----------
clear()
GOLD, GOLDD, CRM, BLK = mat('ch_gold', 'e0b040'), mat('ch_gold_d', 'a87a22'), mat('ch_cream', 'f2ead8'), mat('ch_black', '2a2724')
part('caixa', GOLD, lambda bm: cyl(bm, 1.0, 0.36, 28, (0, 0, 0), 'Y'))
part('aro', GOLDD, lambda bm: torus(bm, 0.98, 0.08, (0, -0.19, 0), 28, 6, 'Y'))
part('mostrador', CRM, lambda bm: cyl(bm, 0.86, 0.04, 28, (0, -0.2, 0), 'Y'))
def marks(bm):
    for k in range(12):
        a = k / 12 * 2 * math.pi; L = 0.16 if k % 3 == 0 else 0.08
        g = bmesh.ops.create_cube(bm, size=1)
        R = Matrix.Rotation(-a, 3, 'Y')
        for v in g['verts']: v.co = R @ Vector((v.co.x * 0.05, v.co.y * 0.03, v.co.z * L + 0.72)) + Vector((0, -0.235, 0))
def hands(bm):
    for a, L, w in ((math.radians(-60), 0.45, 0.07), (math.radians(40), 0.65, 0.05)):
        g = bmesh.ops.create_cube(bm, size=1); R = Matrix.Rotation(a, 3, 'Y')
        for v in g['verts']: v.co = R @ Vector((v.co.x * w, v.co.y * 0.03, (v.co.z + 0.5) * L)) + Vector((0, -0.255, 0))
part('marcas', BLK, marks)
part('ponteiros', BLK, hands)
part('pino', GOLDD, lambda bm: cyl(bm, 0.07, 0.06, 10, (0, -0.28, 0), 'Y'))
part('coroa', GOLDD, lambda bm: (cyl(bm, 0.12, 0.2, 10, (0, 0, 1.08)), cyl(bm, 0.17, 0.14, 12, (0, 0, 1.24))))
part('argola', GOLD, lambda bm: torus(bm, 0.24, 0.06, (0, 0, 1.55), 16, 6, 'Y'))
export('relogio', (0.9, -4.2, 0.9), (0, 0, 0.3))
