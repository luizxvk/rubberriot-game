# Acessorios COMICOS (07/11, pedido dele: "ao inves de realista, pecas comicas"; tamanho padrao da escala do jogo).
# Roda sem a ponte (fundo): E:\Blender\blender.exe -b --factory-startup --python tools/blender/comic_attach.py
# Unidade = unidade do jogo (1 = 0,32 m; medidas tiradas de tools/part-sizes.html). Frente = +Y (vira -Z no glTF), topo = +Z,
# pe no z = 0. Cada peca = um vazio 'c_<nome>' com as malhas dentro; material 'body' / 'accent' / 'glass' (glass = so a
# medida da lente: o jogo tira e poe a lente dele). Retícula NENHUMA (a do jogo vai na lente).
# Saida: public/models/src/comic/attach.glb + previas em tools/blender/out/comic_*.png. Checa pisca (antipisca.py) antes.
import bpy, bmesh, math, os, sys
from mathutils import Vector, Matrix
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
from antipisca import coplanar_report
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
OUT_GLB = os.path.join(ROOT, 'public', 'models', 'src', 'comic', 'attach.glb'); OUT_PNG = os.path.join(HERE, 'out')
os.makedirs(os.path.dirname(OUT_GLB), exist_ok=True); os.makedirs(OUT_PNG, exist_ok=True)

for o in list(bpy.data.objects): bpy.data.objects.remove(o, do_unlink=True)
MATS = {}
for n, c in (('body', (0.16, 0.15, 0.14, 1)), ('accent', (0.72, 0.5, 0.3, 1)), ('glass', (0.5, 0.8, 1.0, 1))):
    m = bpy.data.materials.new(n); m.diffuse_color = c; MATS[n] = m

def obj_from_bm(name, bm, mat, parent, bevel=0.0, seg=3, smooth=True):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(o); o.parent = parent
    me.materials.append(MATS[mat])
    if smooth:
        for p in me.polygons: p.use_smooth = True
    if bevel > 0:
        b = o.modifiers.new('bev', 'BEVEL'); b.width = bevel; b.segments = seg; b.limit_method = 'ANGLE'; b.angle_limit = math.radians(35)
    return o

def lathe(name, prof, mat, parent, loc=(0, 0, 0), axis='Y', segs=28, cap=True):
    """prof = [(raio, y)] da frente pra tras; gira em volta do eixo Y (ou Z)."""
    bm = bmesh.new(); rings = []
    for r, y in prof:
        ring = []
        for i in range(segs):
            a = 2 * math.pi * i / segs
            co = (r * math.cos(a), y, r * math.sin(a)) if axis == 'Y' else (r * math.cos(a), r * math.sin(a), y)
            ring.append(bm.verts.new(co))
        rings.append(ring)
    for k in range(len(rings) - 1):
        for i in range(segs):
            j = (i + 1) % segs; bm.faces.new((rings[k][i], rings[k][j], rings[k + 1][j], rings[k + 1][i]))
    if cap:
        bm.faces.new(list(reversed(rings[0]))); bm.faces.new(rings[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    bmesh.ops.translate(bm, verts=bm.verts[:], vec=Vector(loc))
    return obj_from_bm(name, bm, mat, parent)

def rbox(name, size, loc, mat, parent, bevel=None, rot=None):
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=Vector(size), verts=bm.verts[:])
    if rot: bmesh.ops.rotate(bm, verts=bm.verts[:], cent=(0, 0, 0), matrix=Matrix.Rotation(rot[1], 3, rot[0]))
    bmesh.ops.translate(bm, verts=bm.verts[:], vec=Vector(loc))
    return obj_from_bm(name, bm, mat, parent, bevel=bevel if bevel is not None else min(size) * 0.38, seg=4, smooth=True)

def ball(name, r, loc, mat, parent, sc=(1, 1, 1)):
    bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=16, v_segments=10, radius=r)
    bmesh.ops.scale(bm, vec=Vector(sc), verts=bm.verts[:]); bmesh.ops.translate(bm, verts=bm.verts[:], vec=Vector(loc))
    return obj_from_bm(name, bm, mat, parent)

def torus(name, R, r, loc, mat, parent, axis='Y'):
    bm = bmesh.new(); segs, ss = 28, 10; grid = []
    for i in range(segs):
        a = 2 * math.pi * i / segs; row = []
        for j in range(ss):
            b = 2 * math.pi * j / ss; rr = R + r * math.cos(b); h = r * math.sin(b)
            co = (rr * math.cos(a), h, rr * math.sin(a)) if axis == 'Y' else (rr * math.cos(a), rr * math.sin(a), h)
            row.append(bm.verts.new(co))
        grid.append(row)
    for i in range(segs):
        for j in range(ss):
            bm.faces.new((grid[i][j], grid[(i + 1) % segs][j], grid[(i + 1) % segs][(j + 1) % ss], grid[i][(j + 1) % ss]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:]); bmesh.ops.translate(bm, verts=bm.verts[:], vec=Vector(loc))
    return obj_from_bm(name, bm, mat, parent)

def frame(name, w, h, t, d, loc, mat, parent, tilt=0.0):
    """moldura arredondada (janela de TV) com furo; plano XZ, profundidade no Y."""
    bm = bmesh.new(); n = 8
    def rr(W, H, R):
        pts = []
        for cx, cz, a0 in ((W / 2 - R, H / 2 - R, 0), (-W / 2 + R, H / 2 - R, 90), (-W / 2 + R, -H / 2 + R, 180), (W / 2 - R, -H / 2 + R, 270)):
            for i in range(n + 1):
                a = math.radians(a0 + 90 * i / n); pts.append((cx + R * math.cos(a), cz + R * math.sin(a)))
        return pts
    out, inn = rr(w, h, min(w, h) * 0.32), rr(w - 2 * t, h - 2 * t, min(w, h) * 0.32 - t * 0.6)
    vs = {}
    for side, y in (('f', d / 2), ('b', -d / 2)):
        vs[side + 'o'] = [bm.verts.new((x, y, z)) for x, z in out]; vs[side + 'i'] = [bm.verts.new((x, y, z)) for x, z in inn]
    N = len(out)
    for i in range(N):
        j = (i + 1) % N
        bm.faces.new((vs['fo'][i], vs['fo'][j], vs['fi'][j], vs['fi'][i])); bm.faces.new((vs['bo'][j], vs['bo'][i], vs['bi'][i], vs['bi'][j]))
        bm.faces.new((vs['fo'][j], vs['fo'][i], vs['bo'][i], vs['bo'][j])); bm.faces.new((vs['fi'][i], vs['fi'][j], vs['bi'][j], vs['bi'][i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    if tilt: bmesh.ops.rotate(bm, verts=bm.verts[:], cent=(0, 0, 0), matrix=Matrix.Rotation(tilt, 3, 'X'))
    bmesh.ops.translate(bm, verts=bm.verts[:], vec=Vector(loc))
    return obj_from_bm(name, bm, mat, parent, bevel=t * 0.3, seg=3)

def disc(name, r, loc, parent, axis='Y'):
    bm = bmesh.new(); vs = []
    for i in range(24):
        a = 2 * math.pi * i / 24; vs.append(bm.verts.new((r * math.cos(a), 0, r * math.sin(a)) if axis == 'Y' else (r * math.cos(a), r * math.sin(a), 0)))
    bm.faces.new(vs); bmesh.ops.translate(bm, verts=bm.verts[:], vec=Vector(loc))
    return obj_from_bm(name, bm, 'glass', parent, smooth=False)

def plane(name, w, h, loc, parent, tilt=0.0):
    bm = bmesh.new(); vs = [bm.verts.new((x, 0, z)) for x, z in ((-w / 2, -h / 2), (w / 2, -h / 2), (w / 2, h / 2), (-w / 2, h / 2))]; bm.faces.new(vs)
    if tilt: bmesh.ops.rotate(bm, verts=bm.verts[:], cent=(0, 0, 0), matrix=Matrix.Rotation(tilt, 3, 'X'))
    bmesh.ops.translate(bm, verts=bm.verts[:], vec=Vector(loc)); return obj_from_bm(name, bm, 'glass', parent, smooth=False)

def piece(name):
    e = bpy.data.objects.new('c_' + name, None); bpy.context.scene.collection.objects.link(e); return e

def knob(pre, r, h, loc, parent, axis='Z'):
    """botao de radio antigo: cilindro com estrias e cupula"""
    x, y, z = loc
    if axis == 'Z':
        lathe(pre + '_k', [(r * 0.75, 0), (r, h * 0.12), (r, h * 0.85), (r * 0.7, h), (0.0005, h * 1.05)], 'accent', parent, loc=(x, y, z), axis='Z', segs=20, cap=False)
    else:
        o = lathe(pre + '_k', [(r * 0.75, 0), (r, h * 0.12), (r, h * 0.85), (r * 0.7, h), (0.0005, h * 1.05)], 'accent', parent, loc=(0, 0, 0), axis='Z', segs=20, cap=False)
        o.rotation_euler = (0, math.pi / 2, 0); o.location = (x, y, z)

exec(open(os.path.join(HERE, 'comic_pieces.py'), encoding='utf8').read())  # as pecas (um tema por acessorio)
bpy.context.view_layer.update()

# ---------------- checagem anti-pisca + exportacao ----------------
deps = bpy.context.evaluated_depsgraph_get(); PIECES = []
for o in bpy.data.objects:
    if o.type != 'MESH' or o.active_material.name == 'glass': continue
    ev = o.evaluated_get(deps); me = ev.to_mesh(); bm = bmesh.new(); bm.from_mesh(me); bm.transform(o.matrix_world); ev.to_mesh_clear()
    PIECES.append((o.parent.name, o.active_material.name, bm))
bad = []
for g in sorted(set(x[0] for x in PIECES)):  # cada acessorio e um asset separado: checa sozinho
    b = coplanar_report([x for x in PIECES if x[0] == g]); bad += [(g,) + tuple(t) for t in b]
print('PISCA', len(bad), sorted(set((t[0], t[1], t[2], round(t[-1][2], 3)) for t in bad)))
tri = {}
for o in bpy.data.objects:
    if o.type == 'MESH':
        me = o.evaluated_get(deps).to_mesh(); tri[o.parent.name] = tri.get(o.parent.name, 0) + sum(len(p.vertices) - 2 for p in me.polygons); o.evaluated_get(deps).to_mesh_clear()
print('TRIS', tri)
bpy.ops.export_scene.gltf(filepath=OUT_GLB, export_format='GLB', export_apply=True, export_yup=True, export_materials='EXPORT')
print('GLB', OUT_GLB)

# ---------------- previa: grade de lado e grade 3/4 (contorno do workbench) ----------------
EMS = sorted([o for o in bpy.data.objects if o.type == 'EMPTY'], key=lambda e: e.name)
def bb(e):
    pts = [c.matrix_world @ Vector(v) for c in e.children_recursive if c.type == 'MESH' for v in c.bound_box]
    return Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts))), Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
scn = bpy.context.scene; scn.render.engine = 'BLENDER_WORKBENCH'; sh = scn.display.shading
sh.light = 'STUDIO'; sh.color_type = 'MATERIAL'; sh.show_object_outline = True; sh.object_outline_color = (0, 0, 0); sh.show_cavity = True
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); scn.collection.objects.link(cam); scn.camera = cam; cam.data.type = 'ORTHO'
COLS = 6; CW, RH = 1.35, 0.6
def grid(side):
    for i, e in enumerate(EMS):
        e.location = (0, 0, 0); bpy.context.view_layer.update(); mn, mx = bb(e); c = (mn + mx) / 2
        col, row = i % COLS, i // COLS
        if side: e.location = (-c.x, -(col * CW) - c.y, -(row * RH) - c.z)  # camera olha do +X: -Y fica a direita
        else: e.location = (col * CW - c.x, row * 0.9 - c.y, -c.z)
    bpy.context.view_layer.update()
rows = (len(EMS) + COLS - 1) // COLS
grid(True); scn.render.resolution_x, scn.render.resolution_y = 2000, int(2000 * rows * RH / (COLS * CW))
cam.location = (3.0, -(COLS - 1) * CW / 2, -(rows - 1) * RH / 2); cam.rotation_euler = (math.radians(90), 0, math.radians(90)); cam.data.ortho_scale = COLS * CW
scn.render.filepath = os.path.join(OUT_PNG, 'comic_lado.png'); bpy.ops.render.render(write_still=True)
grid(True); scn.render.resolution_x, scn.render.resolution_y = 2000, 1250  # 3/4: a mesma grade, camera girada 35 graus e de cima
d = Vector((math.cos(math.radians(-35)), math.sin(math.radians(-35)), 0.45)).normalized()
tgt = Vector((0, -(COLS - 1) * CW / 2, -(rows - 1) * RH / 2)); cam.location = tgt + d * 4; cam.rotation_euler = (tgt - cam.location).to_track_quat('-Z', 'Y').to_euler(); cam.data.ortho_scale = COLS * CW * 0.86
scn.render.filepath = os.path.join(OUT_PNG, 'comic_34.png'); bpy.ops.render.render(write_still=True)
# nomes na ordem da grade (pra legenda)
print('ORDEM', [e.name for e in EMS])
print('PRONTO')
