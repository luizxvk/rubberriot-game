# Telefone-banana (13/11, pedido dele): a chamada de sequencia vira uma banana no ouvido. Uma malha so; o jogo pinta a
# casca na cor de cada sequencia (material 'peel') e mantem a ponta e o cabo escuros (material 'tip').
# Comprimento no Z do Blender (vira o Y do jogo: banana em pe), curva pro +Y (vira o -Z: a barriga pra frente).
# E:\Blender\blender.exe -b --factory-startup --python tools/blender/banana.py
import bpy, bmesh, os, math
OUT = r'D:\Desktop\fokusstudios\tinta-louca\public\models\src\banana.glb'
for o in list(bpy.data.objects): bpy.data.objects.remove(o, do_unlink=True)
def mat(name, rgb):
    m = bpy.data.materials.new(name); m.use_nodes = True; c = rgb + (1,)
    m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = c; m.diffuse_color = c; return m
peel, tip = mat('peel', (0.95, 0.78, 0.12)), mat('tip', (0.12, 0.08, 0.04))
L, R, RINGS, SIDES = 0.2, 0.024, 18, 5  # 5 gomos: a quina da banana
bm = bmesh.new(); rings = []
for i in range(RINGS + 1):
    t = i / RINGS
    r = R * (math.sin(t * math.pi) ** 0.55) * (0.55 + 0.45 * math.sin(t * math.pi)) + 0.0015  # fina nas pontas, gorda no meio
    a = (t - 0.5) * 1.05  # arco total ~60 graus
    cz, cy = math.sin(a) * L / 1.05, (1 - math.cos(a)) * L / 1.05 * 0.9  # centro da secao no arco
    ring = []
    for k in range(SIDES):
        ang = k / SIDES * 2 * math.pi
        ring.append(bm.verts.new((math.cos(ang) * r, cy + math.sin(ang) * r * math.cos(a), cz - math.sin(ang) * r * math.sin(a))))
    rings.append(ring)
for i in range(RINGS):
    for k in range(SIDES):
        bm.faces.new((rings[i][k], rings[i][(k + 1) % SIDES], rings[i + 1][(k + 1) % SIDES], rings[i + 1][k]))
bm.faces.new(list(reversed(rings[0]))); bm.faces.new(rings[-1])
bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
me = bpy.data.meshes.new('banana'); bm.to_mesh(me); bm.free()
ob = bpy.data.objects.new('banana', me); bpy.context.collection.objects.link(ob); ob.data.materials.append(peel)
for p in me.polygons: p.use_smooth = False
# ponta escura em baixo e o cabinho em cima (onde vai a orelha)
a0 = -0.525; z0, y0 = math.sin(a0) * L / 1.05, (1 - math.cos(a0)) * L / 1.05 * 0.9
bpy.ops.mesh.primitive_uv_sphere_add(segments=8, ring_count=5, radius=0.006, location=(0, y0, z0)); t1 = bpy.context.active_object; t1.data.materials.append(tip)
a1 = 0.525; z1, y1 = math.sin(a1) * L / 1.05, (1 - math.cos(a1)) * L / 1.05 * 0.9
bpy.ops.mesh.primitive_cylinder_add(vertices=6, radius=0.0055, depth=0.026, location=(0, y1 + 0.004, z1 + 0.012), rotation=(-0.45, 0, 0)); t2 = bpy.context.active_object; t2.data.materials.append(tip)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', use_selection=True, export_materials='EXPORT')
print('BANANA', sum(len(o.data.polygons) for o in bpy.context.scene.objects if o.type == 'MESH'), os.path.getsize(OUT))
