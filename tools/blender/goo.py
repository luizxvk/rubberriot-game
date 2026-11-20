# Grudenta (19/11, pedido dele: letal nova de BORRACHA DERRETIDA; quem pisa na poca fica lentissimo). Roda em fundo:
#   E:\Blender\blender.exe -b --factory-startup --python tools/blender/goo.py
# Gera public/models/goo.glb (Draco) com 2 objetos: goo_nade (a granada na mao/voando, ~0,25 m) e goo_pool (a poca, raio 1:
# o jogo escala pro raio da regra). Cada material vira toon no jogo (world.js). Anti-pisca: nenhuma face no plano de outra.
import bpy, bmesh, math, os, random
from mathutils import Vector, Matrix

OUT = r'D:\Desktop\fokusstudios\tinta-louca\public\models\goo.glb'
for o in list(bpy.data.objects): bpy.data.objects.remove(o, do_unlink=True)

def srgb(h): return tuple(((int(h[i:i + 2], 16) / 255) ** 2.2) for i in (0, 2, 4))
def mat(name, hexcol):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True; c = (*srgb(hexcol), 1); m.diffuse_color = c
    b = m.node_tree.nodes.get('Principled BSDF'); b.inputs['Base Color'].default_value = c; b.inputs['Roughness'].default_value = 0.5
    return m
PINK, PINKD, CAP, RING, BUB = mat('goo_pink', 'e0507f'), mat('goo_pink_d', 'a32a55'), mat('goo_cap', 'f2c14e'), mat('goo_ring', '3a3632'), mat('goo_bubble', 'f59ab8')

def obj(name, bm, mats):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    for m in mats: me.materials.append(m)
    o = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(o)
    for p in me.polygons: p.use_smooth = False
    return o
def sphere(bm, c, r, sx=1, sy=1, sz=1, seg=12, rings=8, mi=0, squash=None):
    g = bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=rings, radius=r)
    for v in g['verts']:
        v.co.x *= sx; v.co.y *= sy; v.co.z *= sz
        if squash: squash(v)
        v.co += Vector(c)
    for f in {f for v in g['verts'] for f in v.link_faces}: f.material_index = mi
    return g

# ---------- granada: bola de borracha amolecendo, pingos embaixo, tampa amarela e argola ----------
bm = bmesh.new(); rnd = random.Random(5)
def melt(v):  # metade de baixo escorre (achatada e larga), em cima fica redonda
    if v.co.z < 0: v.co.z *= 1.15; k = 1 + (-v.co.z / 0.1) * 0.18; v.co.x *= k; v.co.y *= k
sphere(bm, (0, 0, 0.1), 0.1, 1, 1, 0.95, 14, 10, 0, melt)
for a, l in ((0.3, 0.07), (2.4, 0.05), (4.3, 0.085)):  # pingos (cone de ponta pra baixo), saindo da barriga
    x, y = math.cos(a) * 0.075, math.sin(a) * 0.075
    g = bmesh.ops.create_cone(bm, cap_ends=True, segments=8, radius1=0.014, radius2=0.03, depth=l)
    for v in g['verts']: v.co += Vector((x, y, 0.035 - l / 2 + 0.01))
    for f in {f for v in g['verts'] for f in v.link_faces}: f.material_index = 1
    sphere(bm, (x, y, 0.045 - l), 0.022, 1, 1, 1.2, 8, 6, 1)  # gota na ponta (pingo de borracha, nao espinho)
g = bmesh.ops.create_cone(bm, cap_ends=True, segments=10, radius1=0.035, radius2=0.03, depth=0.045)  # tampa (sai 2 cm da bola)
for v in g['verts']: v.co += Vector((0, 0, 0.205))
for f in {f for v in g['verts'] for f in v.link_faces}: f.material_index = 2
# argola: anel de 10 gomos em pe, ao lado da tampa
R0, r0, N, M = 0.035, 0.008, 12, 6
ring = []
for i in range(N):
    a = i / N * 2 * math.pi; cx, cz = math.cos(a) * R0, math.sin(a) * R0
    ring.append([bm.verts.new(Vector((0.05 + cx + math.cos(a) * r0 * math.cos(b), math.sin(b) * r0, 0.235 + cz + math.sin(a) * r0 * math.cos(b)))) for b in (j / M * 2 * math.pi for j in range(M))])
for i in range(N):
    for j in range(M):
        f = bm.faces.new((ring[i][j], ring[(i + 1) % N][j], ring[(i + 1) % N][(j + 1) % M], ring[i][(j + 1) % M])); f.material_index = 3
nade = obj('goo_nade', bm, [PINK, PINKD, CAP, RING])

# ---------- poca: disco de borda ondulada (raio ~1), borda escura por baixo, bolhas em cima ----------
bm = bmesh.new(); SEG = 28
def edge(a): return 1.0 + 0.12 * math.sin(a * 3 + 0.4) + 0.07 * math.sin(a * 7 + 1.3)
top, bot, rim = [], [], []
cT = bm.verts.new((0, 0, 0.05)); cB = bm.verts.new((0, 0, 0.004))
for i in range(SEG):
    a = i / SEG * 2 * math.pi; r = edge(a)
    top.append(bm.verts.new((math.cos(a) * r * 0.92, math.sin(a) * r * 0.92, 0.05)))
    rim.append(bm.verts.new((math.cos(a) * r, math.sin(a) * r, 0.022)))
    bot.append(bm.verts.new((math.cos(a) * r * 0.98, math.sin(a) * r * 0.98, 0.004)))
for i in range(SEG):
    j = (i + 1) % SEG
    bm.faces.new((cT, top[i], top[j])).material_index = 0
    bm.faces.new((top[i], rim[i], rim[j], top[j])).material_index = 0
    bm.faces.new((rim[i], bot[i], bot[j], rim[j])).material_index = 1
    bm.faces.new((cB, bot[j], bot[i])).material_index = 1
rnd = random.Random(11)
for k in range(6):  # bolhas (meia esfera saindo da superficie, cada uma num tamanho)
    a = rnd.uniform(0, 2 * math.pi); d = rnd.uniform(0.15, 0.7); r = rnd.uniform(0.06, 0.13)
    g = bmesh.ops.create_uvsphere(bm, u_segments=10, v_segments=6, radius=r)
    for v in g['verts']: v.co.z = max(v.co.z, -r * 0.2) * 0.8; v.co += Vector((math.cos(a) * d, math.sin(a) * d, 0.05))
    for f in {f for v in g['verts'] for f in v.link_faces}: f.material_index = 2
bmesh.ops.remove_doubles(bm, verts=bm.verts[:], dist=1e-5)
pool = obj('goo_pool', bm, [PINK, PINKD, BUB])
pool.location.x = 3  # so pra previa (o jogo le a malha)

tri = sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in (nade, pool))
for o in bpy.context.scene.objects: o.select_set(o in (nade, pool))
pool.location.x = 0
os.makedirs(os.path.dirname(OUT), exist_ok=True)
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', use_selection=True, export_apply=True, export_yup=True, export_materials='EXPORT',
                          export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=7)
# previa
sc = bpy.context.scene; sc.render.engine = 'BLENDER_WORKBENCH'; sh = sc.display.shading; sh.light = 'STUDIO'; sh.color_type = 'MATERIAL'; sh.show_object_outline = True
pool.location.x = 0.9; nade.location = (-0.35, 0, 0); nade.scale = (3, 3, 3)
cd = bpy.data.cameras.new('c'); cd.lens = 50; cam = bpy.data.objects.new('c', cd); sc.collection.objects.link(cam); sc.camera = cam
cam.location = Vector((0.3, -3.2, 2.0)); cam.rotation_euler = (Vector((0.3, 0, 0.25)) - cam.location).to_track_quat('-Z', 'Y').to_euler()
sc.render.resolution_x, sc.render.resolution_y = 900, 560; sc.render.filepath = r'D:\Desktop\fokusstudios\tinta-louca\tools\blender\out\goo.png'
bpy.ops.render.render(write_still=True)
print('GOO', {'tri': tri, 'kb': round(os.path.getsize(OUT) / 1024, 1)})
