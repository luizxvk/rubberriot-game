# Compacta os mapas com Draco (06/11, pedido dele: PC e celular). Pela ponte: python tools/blender/bl.py tools/blender/draco.py
# Le tools/blender/glb-raw/<mapa>.glb (sem compressao, saida do mapa.py) e grava public/models/maps/<mapa>.glb com Draco.
# Numa cena temporaria: nao mexe nas cenas dos mapas. NUNCA SystemExit (fecha o Blender dele).
import bpy, os
RAW = r'D:\Desktop\fokusstudios\tinta-louca\tools\blender\glb-raw'
OUT = r'D:\Desktop\fokusstudios\tinta-louca\public\models\maps'
ONLY = globals().get('ONLY')  # opcional: lista de mapas
res = {}
prev = bpy.context.window.scene
for f in sorted(os.listdir(RAW)):
    if not f.endswith('.glb') or (ONLY and f[:-4] not in ONLY): continue
    scn = bpy.data.scenes.new('tmp_draco'); bpy.context.window.scene = scn
    with bpy.context.temp_override(scene=scn):
        bpy.ops.import_scene.gltf(filepath=os.path.join(RAW, f))
        objs = list(scn.objects)
        for o in objs: o.select_set(True)
        bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, f), export_format='GLB', use_selection=True, use_active_scene=True, export_yup=True,
                                  export_materials='EXPORT', export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=7,
                                  export_draco_position_quantization=14, export_draco_normal_quantization=10, export_draco_texcoord_quantization=12)
    meshes = {o.data for o in objs if o.type == 'MESH'}
    for o in objs: bpy.data.objects.remove(o, do_unlink=True)
    for m in meshes:
        if m.users == 0: bpy.data.meshes.remove(m)
    bpy.context.window.scene = prev; bpy.data.scenes.remove(scn)
    res[f] = [round(os.path.getsize(os.path.join(RAW, f)) / 1e6, 2), round(os.path.getsize(os.path.join(OUT, f)) / 1e6, 2)]
result = res
