# Previa de lado de .glb baixados (06/11, piloto TastyTony): importa numa cena temporaria, deita no X, renderiza e conta triangulos.
# Pela ponte. FILES = lista de caminhos (a ponte manda na 1a linha). NUNCA SystemExit.
import bpy, os, math
from mathutils import Vector
FILES = globals().get('FILES', [])
OUT = r'D:\Desktop\fokusstudios\tinta-louca\tools\blender\out'
res = {}
prev = bpy.context.window.scene
for f in FILES:
    scn = bpy.data.scenes.new('tmp_prev'); bpy.context.window.scene = scn
    with bpy.context.temp_override(scene=scn):
        bpy.ops.import_scene.gltf(filepath=f)
    objs = [o for o in scn.objects if o.type == 'MESH']
    for o in scn.objects:
        if o.type in ('LIGHT', 'CAMERA'): o.hide_render = True
    deps = bpy.context.evaluated_depsgraph_get()
    pts = [o.matrix_world @ Vector(c) for o in objs for c in o.bound_box]
    mn = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts))); mx = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    size = mx - mn; c = (mn + mx) / 2
    tri = sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in objs)
    ax = max(range(3), key=lambda i: size[i])  # eixo comprido
    cd = bpy.data.cameras.new('pc'); cd.type = 'ORTHO'; cd.ortho_scale = max(size) * 1.15
    cam = bpy.data.objects.new('pc', cd); scn.collection.objects.link(cam); scn.camera = cam
    side = [i for i in range(3) if i != ax and i != 2][0] if ax != 2 else 0  # olha pelo eixo que nao e o comprido nem o de cima
    d = Vector((0, 0, 0)); d[side] = max(size) * 3
    cam.location = c + d; cam.rotation_euler = (c - cam.location).to_track_quat('-Z', 'Y').to_euler()
    scn.render.engine = 'BLENDER_WORKBENCH'; sh = scn.display.shading; sh.light = 'STUDIO'; sh.color_type = 'MATERIAL'; scn.display.shading.background_type = 'VIEWPORT'; sh.show_object_outline = True
    scn.render.resolution_x, scn.render.resolution_y = 900, 420
    name = os.path.splitext(os.path.basename(f))[0]
    scn.render.filepath = os.path.join(OUT, 'tt-' + name + '.png'); bpy.ops.render.render(write_still=True, scene=scn.name)
    res[name] = {'tri': tri, 'size': [round(v, 3) for v in size], 'eixo': 'xyz'[ax], 'malhas': len(objs), 'nomes': sorted({o.name for o in objs})[:40]}
    for o in list(scn.objects): bpy.data.objects.remove(o, do_unlink=True)
    bpy.context.window.scene = prev; bpy.data.scenes.remove(scn)
result = res
