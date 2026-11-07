# Chaveiro de ouro de mestre (07/11, pedido dele): miniatura da arma, malha reduzida (~400 tri), cor de ouro.
# E:\Blender\blender.exe -b --factory-startup --python tools/blender/charm_mst.py -- <id> [<id> ...]
import bpy, sys, os
IDS = sys.argv[sys.argv.index('--') + 1:]
SRC = r'D:\Desktop\fokusstudios\tinta-louca\public\models\src\tt_ready'
OUT = r'D:\Desktop\fokusstudios\tinta-louca\public\models\src'
gold = bpy.data.materials.new('gold'); gold.use_nodes = True
gold.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0.86, 0.6, 0.12, 1); gold.diffuse_color = (0.86, 0.6, 0.12, 1)
for ID in IDS:
    for o in list(bpy.data.objects): bpy.data.objects.remove(o, do_unlink=True)
    bpy.ops.import_scene.gltf(filepath=os.path.join(SRC, ID + '.glb'))
    ms = [o for o in bpy.context.scene.objects if o.type == 'MESH' and not o.name.split('_')[-1].startswith(('cut', 'del'))]
    for o in list(bpy.context.scene.objects):
        if o not in ms: bpy.data.objects.remove(o, do_unlink=True)
    if not ms: print('SEM', ID); continue
    bpy.ops.object.select_all(action='DESELECT')
    for o in ms: o.select_set(True)
    bpy.context.view_layer.objects.active = ms[0]; bpy.ops.object.join()
    ob = bpy.context.view_layer.objects.active
    ob.data.materials.clear(); ob.data.materials.append(gold)
    n = len(ob.data.polygons); d = ob.modifiers.new('dec', 'DECIMATE'); d.ratio = min(1, 450 / max(n, 1))
    bpy.ops.object.modifier_apply(modifier='dec')
    out = os.path.join(OUT, 'charm_mst_' + ID + '.glb')
    bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', use_selection=True, export_materials='EXPORT')
    print('CHARM', ID, n, '->', len(ob.data.polygons), os.path.getsize(out))
