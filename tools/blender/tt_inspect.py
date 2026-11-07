# Raio-x de um .glb do TastyTony (06/11): importa numa cena propria (fica aberta pra olhar), aplica o esqueleto (se tiver),
# e lista cada malha com material, cor e caixa (em metros depois de normalizar o comprimento pra REAL_LEN).
# Pela ponte com FILE = caminho e REAL_LEN = comprimento real em metros. NUNCA SystemExit.
import bpy, os
from mathutils import Vector
FILE = globals()['FILE']; REAL = globals().get('REAL_LEN', 1.0)
name = os.path.splitext(os.path.basename(FILE))[0]
old = bpy.data.scenes.get('TT_' + name)
if old:
    for o in list(old.objects): bpy.data.objects.remove(o, do_unlink=True)
    bpy.data.scenes.remove(old)
scn = bpy.data.scenes.new('TT_' + name); bpy.context.window.scene = scn
with bpy.context.temp_override(scene=scn):
    bpy.ops.import_scene.gltf(filepath=FILE)
for o in list(scn.objects):
    if o.type in ('LIGHT', 'CAMERA'): bpy.data.objects.remove(o, do_unlink=True)
meshes = [o for o in scn.objects if o.type == 'MESH']
pts = [o.matrix_world @ Vector(c) for o in meshes for c in o.bound_box]
mn = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts))); mx = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
size = mx - mn; L = max(size); k = REAL / L
rows = []
for o in meshes:
    bb = [o.matrix_world @ Vector(c) for c in o.bound_box]
    a = Vector((min(p.x for p in bb), min(p.y for p in bb), min(p.z for p in bb))); b = Vector((max(p.x for p in bb), max(p.y for p in bb), max(p.z for p in bb)))
    m = o.active_material; col = tuple(round(v, 2) for v in m.diffuse_color[:3]) if m else None
    bc = None
    if m and m.use_nodes:
        n = m.node_tree.nodes.get('Principled BSDF')
        if n: bc = tuple(round(v, 2) for v in n.inputs['Base Color'].default_value[:3]); tex = any(l.from_node.type == 'TEX_IMAGE' for l in n.inputs['Base Color'].links)
    rows.append({'o': o.name, 'mat': m.name if m else None, 'cor': bc, 'parent': o.parent.name if o.parent else None, 'skin': any(md.type == 'ARMATURE' for md in o.modifiers),
                 'min': [round((a[i] - mn[i]) * k, 3) for i in range(3)], 'max': [round((b[i] - mn[i]) * k, 3) for i in range(3)], 'tri': sum(len(p.vertices) - 2 for p in o.data.polygons)})
result = {'nome': name, 'tamanho_m': [round(v * k, 3) for v in size], 'eixo_comprido': 'xyz'[max(range(3), key=lambda i: size[i])], 'malhas': rows}
