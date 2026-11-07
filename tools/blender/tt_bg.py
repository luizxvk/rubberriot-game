# Roda o tt_prep.py sem a ponte (07/11): Blender em segundo plano, uma arma por chamada.
# E:\Blender\blender.exe -b --factory-startup --python tools/blender/tt_bg.py -- <id>
import bpy, sys
ID = sys.argv[sys.argv.index('--') + 1]
for o in list(bpy.data.objects): bpy.data.objects.remove(o, do_unlink=True)
src = open(r'D:\Desktop\fokusstudios\tinta-louca\tools\blender\tt_prep.py', encoding='utf-8').read()
src = src.replace("scn = bpy.data.scenes.new(SCN); bpy.context.window.scene = scn", "scn = bpy.context.scene")  # sem janela: usa a cena vazia
g = {'ID': ID, '__name__': '__ttprep__'}
exec(compile(src, 'tt_prep.py', 'exec'), g)
print('TTRESULT', g.get('result'))
