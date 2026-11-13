# Lasers novos (13/11, pedido dele): roxo "Prisma" e amarelo "Duplo". So a carcaca: o olho e o feixe na cor vem do jogo
# (arsenal.js addLaser). Comprimento no +Y do Blender (vira a frente da arma no jogo), altura no Z. Cor de cada peca pela
# luminancia vira a paleta da arma no jogo (clara / escura / preta).
# E:\Blender\blender.exe -b --factory-startup --python tools/blender/lasers.py
import bpy, os, math
OUT = r'D:\Desktop\fokusstudios\tinta-louca\public\models\src'
MATS = {}
def mat(h):
    if h in MATS: return MATS[h]
    m = bpy.data.materials.new('c_' + h); m.use_nodes = True
    lin = lambda c: c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    col = tuple(lin(int(h[i:i + 2], 16) / 255) for i in (0, 2, 4)) + (1,)
    m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = col; m.diffuse_color = col; MATS[h] = m; return m
def put(o, h, bev=0.0):
    o.data.materials.clear(); o.data.materials.append(mat(h))
    if bev: md = o.modifiers.new('bv', 'BEVEL'); md.width = bev; md.segments = 2; md.limit_method = 'ANGLE'
    return o
cur = lambda: bpy.context.active_object
def box(sx, sy, sz, loc, h, bev=0.004, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot); o = cur(); o.scale = (sx, sy, sz); bpy.ops.object.transform_apply(scale=True); return put(o, h, bev)
def cyl(r, d, loc, h, v=16, rot=(-math.pi / 2, 0, 0)):  # eixo no Y (comprimento)
    bpy.ops.mesh.primitive_cylinder_add(vertices=v, radius=r, depth=d, location=loc, rotation=rot); o = cur()
    for p in o.data.polygons: p.use_smooth = v > 8
    return put(o, h)
def tor(R, r, loc, h):
    bpy.ops.mesh.primitive_torus_add(major_radius=R, minor_radius=r, major_segments=20, minor_segments=6, location=loc, rotation=(-math.pi / 2, 0, 0)); return put(cur(), h)
DARK, LIGHT, BLACK = '5a5650', 'c8c2b4', '1e1e1e'

def prisma():  # roxo: corpo sextavado comprido, aletas em cima, aro na frente
    cyl(0.018, 0.1, (0, 0, 0), DARK, v=6)
    tor(0.018, 0.004, (0, 0.05, 0), LIGHT)
    cyl(0.012, 0.012, (0, 0.056, 0), BLACK, v=16)
    for i in range(3): box(0.003, 0.022, 0.012, (0, -0.02 + i * 0.022, 0.02), LIGHT, 0.001)
    cyl(0.02, 0.012, (0, -0.052, 0), BLACK, v=6)
    box(0.012, 0.05, 0.008, (0, 0, -0.019), BLACK, 0.002)  # presilha

def duplo():  # amarelo: caixa com dois canos de lente lado a lado e a chavinha
    box(0.042, 0.09, 0.03, (0, 0, 0), DARK, 0.006)
    for x in (-0.011, 0.011): cyl(0.009, 0.02, (x, 0.052, 0.002), LIGHT, v=14); cyl(0.006, 0.004, (x, 0.063, 0.002), BLACK, v=14)
    box(0.008, 0.016, 0.008, (0.024, -0.01, 0.006), LIGHT, 0.002)  # chave lateral
    box(0.03, 0.07, 0.006, (0, -0.004, -0.018), BLACK, 0.002)      # presilha
    for i in range(4): box(0.044, 0.004, 0.032, (0, -0.03 + i * 0.012, 0), BLACK, 0.0)  # frisos de pegada

for nm, fn in (('laser_prisma', prisma), ('laser_duplo', duplo)):
    for o in list(bpy.data.objects): bpy.data.objects.remove(o, do_unlink=True)
    fn()
    for o in bpy.context.scene.objects:
        bpy.context.view_layer.objects.active = o
        for md in list(o.modifiers): bpy.ops.object.modifier_apply(modifier=md.name)
    bpy.ops.object.select_all(action='SELECT')
    out = os.path.join(OUT, nm + '.glb')
    bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', use_selection=True, export_materials='EXPORT', export_apply=True)
    print('LASER', nm, sum(len(o.data.polygons) for o in bpy.context.scene.objects if o.type == 'MESH'), os.path.getsize(out))
