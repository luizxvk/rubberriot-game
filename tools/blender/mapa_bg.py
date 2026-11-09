# roda o mapa.py em segundo plano (sem encostar no Blender aberto dele). Uso: blender -b --factory-startup --python mapa_bg.py -- <mapa>
import sys, re, json, traceback
MAP = sys.argv[sys.argv.index('--') + 1]
HERE = r'D:\Desktop\fokusstudios\tinta-louca\tools\blender'
src = open(HERE + r'\mapa.py', encoding='utf-8').read()
safe = lambda t: re.sub(r'bpy\.context\.window\.scene = (\w+)', r'(setattr(bpy.context.window, "scene", \1) if bpy.context.window else None)', t).replace('prev = bpy.context.window.scene', 'prev = bpy.context.window.scene if bpy.context.window else None')
src = safe(src)
# o draco.py e lido e executado no fim do mapa.py: mesma troca
src = src.replace("exec(open(os.path.join(HERE, 'draco.py'), encoding='utf-8').read(), _g)", "exec(SAFE(open(os.path.join(HERE, 'draco.py'), encoding='utf-8').read()), _g)")
g = {'MAP': MAP, '__name__': 'mapa', 'SAFE': safe}
try:
    exec(compile(src, 'mapa.py', 'exec'), g)
    print('RESULTADO', json.dumps(g.get('result'), default=str)[:1500])
except Exception:
    print('FALHOU', traceback.format_exc()[-2500:])
