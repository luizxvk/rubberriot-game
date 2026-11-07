# Previa do personagem do Rubber Riot (06/11, pedido dele): monta no Blender aberto, numa cena propria (RR_Personagem),
# e renderiza 3 angulos em tools/blender/out/. Medidas iguais as do jogo (cabeca 0,36 em 1,62 m, tronco 0,42 em 1,05 m),
# entao chapeu, oculos e enfeite continuam encaixando. Blender: Z pra cima, rosto pra +Y (no jogo vira -Z).
import bpy, bmesh, math, os
from mathutils import Vector

OUT_DIR = r'D:\Desktop\fokusstudios\tinta-louca\tools\blender\out'
os.makedirs(OUT_DIR, exist_ok=True)
scn = bpy.data.scenes.get('RR_Personagem') or bpy.data.scenes.new('RR_Personagem')
bpy.context.window.scene = scn
for o in list(scn.collection.all_objects): bpy.data.objects.remove(o, do_unlink=True)
col = scn.collection

def mat(name, rgb, cull=False):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.diffuse_color = (*rgb, 1); m.use_nodes = True
    b = m.node_tree.nodes.get('Principled BSDF')
    if b: b.inputs['Base Color'].default_value = (*rgb, 1); b.inputs['Roughness'].default_value = 0.85
    m.use_backface_culling = cull
    return m
def srgb(h): return tuple(((int(h[i:i + 2], 16) / 255) ** 2.2) for i in (0, 2, 4))
INK, PAPER, TEAM = mat('rr_ink', srgb('1c1915')), mat('rr_paper', srgb('f0ebe0')), mat('rr_team', srgb('b8402e'))
PINK, BRASS, WHITE = mat('rr_eraser', srgb('f08aa0')), mat('rr_brass', srgb('e0a92a')), mat('rr_white', srgb('fbf8f0'))
BOOT, OUTL = mat('rr_boot', srgb('3a332c')), mat('rr_outline', (0, 0, 0), cull=True)

def finish(o, m, th=0.022):
    o.data.materials.append(m)
    for p in o.data.polygons: p.use_smooth = True
    if th:
        md = o.modifiers.new('contorno', 'SOLIDIFY'); md.thickness = th; md.offset = 1; md.use_flip_normals = True; md.material_offset = 1
        o.data.materials.append(OUTL)
    return o
def from_bm(name, bm):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); col.objects.link(o); return o
def sphere(name, r, loc, scl, m, seg=24, ring=14, th=0.022, keep_below=None):
    bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=ring, radius=r)
    if keep_below is not None:
        bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=(0, 0, keep_below), plane_no=(0, 0, 1), clear_outer=True)
    o = from_bm(name, bm); o.location = loc; o.scale = scl; return finish(o, m, th)
def tube(name, pts, r, m, th=0.018):
    cu = bpy.data.curves.new(name, 'CURVE'); cu.dimensions = '3D'; cu.bevel_depth = r; cu.bevel_resolution = 4; cu.use_fill_caps = True
    sp = cu.splines.new('BEZIER'); sp.bezier_points.add(len(pts) - 1)
    for bp, p in zip(sp.bezier_points, pts): bp.co = p; bp.handle_left_type = bp.handle_right_type = 'AUTO'
    o = bpy.data.objects.new(name, cu); col.objects.link(o)
    bpy.context.view_layer.objects.active = o
    o.select_set(True); bpy.ops.object.convert(target='MESH'); o.select_set(False)
    return finish(o, m, th)
def rbox(name, size, loc, m, bevel=0.03, th=0.018, rot=(0, 0, 0)):
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1); o = from_bm(name, bm); o.scale = size; o.location = loc; o.rotation_euler = rot
    bv = o.modifiers.new('bv', 'BEVEL'); bv.width = bevel; bv.segments = 3; bv.limit_method = 'NONE'
    return finish(o, m, th)
def cyl(name, r, depth, loc, m, rot=(math.pi / 2, 0, 0), th=0.015, seg=20):
    bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, radius1=r, radius2=r, depth=depth)
    o = from_bm(name, bm); o.location = loc; o.rotation_euler = rot; return finish(o, m, th)

# ---- tronco de borracha + macacao na cor do time ----
sphere('tronco', 0.42, (0, 0, 1.05), (1, 0.9, 1.15), PAPER)
sphere('macacao', 0.445, (0, 0, 1.05), (1, 0.92, 1.15), TEAM, keep_below=0.02)
rbox('peitilho', (0.4, 0.07, 0.3), (0, 0.345, 1.22), TEAM, bevel=0.05)
for s in (-1, 1):
    # alca colada na casca do tronco: arco do peito, por cima do ombro, ate as costas
    k = math.sqrt(1 - (0.2 / 0.445) ** 2)
    arc = [Vector((s * 0.2, math.cos(math.radians(t)) * 0.445 * 0.92 * k * 1.03, 1.05 + math.sin(math.radians(t)) * 0.445 * 1.15 * k * 1.03)) for t in (35, 60, 90, 120, 150)]
    tube('alca', arc, 0.035, TEAM)
    sphere('botao', 0.045, (s * 0.15, 0.39, 1.33), (1, 0.6, 1), BRASS, seg=12, ring=8, th=0.01)
# carimbo de borracha no peito: disco cor de borracha com aro de tinta
cyl('carimbo', 0.085, 0.03, (0, 0.39, 1.2), PINK)
bm = bmesh.new(); bmesh.ops.create_circle(bm, segments=24, radius=0.065)
ring = from_bm('carimbo_aro', bm); ring.location = (0, 0.407, 1.2); ring.rotation_euler = (math.pi / 2, 0, 0)
sk = ring.modifiers.new('aro', 'SKIN')
for v in ring.data.skin_vertices[0].data: v.radius = (0.008, 0.008)
finish(ring, INK, th=0)
rbox('carimbo_R', (0.035, 0.01, 0.06), (0, 0.41, 1.2), INK, bevel=0.008, th=0)

# ---- cabeca: mascara de papel com dois lobos (olhos) e focinho ----
sphere('cabeca', 0.36, (0, 0, 1.62), (1, 1, 1), PAPER)
for s in (-1, 1):
    sphere('bochecha', 0.05, (s * 0.2, 0.29, 1.52), (1, 0.4, 0.8), PINK, seg=12, ring=8, th=0)
    sphere('olho', 0.07, (s * 0.09, 0.315, 1.68), (0.75, 0.4, 1.35), INK, seg=16, ring=10, th=0)
    sphere('brilho', 0.022, (s * 0.09 - 0.018, 0.345, 1.71), (0.9, 0.4, 1.2), WHITE, seg=8, ring=6, th=0)  # corte de torta
sphere('nariz', 0.07, (0, 0.38, 1.57), (1.3, 0.9, 1), PINK, seg=14, ring=10, th=0.01)
tube('boca', [Vector((-0.13, 0.32, 1.49)), Vector((-0.05, 0.36, 1.43)), Vector((0.05, 0.36, 1.43)), Vector((0.13, 0.32, 1.49))], 0.02, INK, th=0)
# topete de tinta pingando: espiral + gota caindo
pts = [Vector((math.cos(i * 0.6) * 0.11 * (1 - i / 13), math.sin(i * 0.6) * 0.11 * (1 - i / 13) - 0.04, 1.93 + i * 0.028)) for i in range(11)]
tube('topete', pts, 0.042, INK)
sphere('gota', 0.05, (0.13, 0.06, 1.98), (0.8, 0.8, 1.3), INK, seg=12, ring=8, th=0.01)

# ---- bracos e pernas de mangueira ----
for s in (-1, 1):
    tube('braco', [Vector((s * 0.38, 0.02, 1.32)), Vector((s * 0.56, 0.08, 1.12)), Vector((s * 0.6, 0.16, 0.86))], 0.072, INK)
    tube('perna', [Vector((s * 0.18, 0.0, 0.72)), Vector((s * 0.22, 0.03, 0.4)), Vector((s * 0.2, 0.04, 0.14))], 0.075, INK)
    # luva: palma, 3 dedos gordos, polegar e punho em sino cor de borracha
    sphere('palma', 0.085, (s * 0.62, 0.2, 0.78), (1.1, 0.9, 1), WHITE, seg=16, ring=10, th=0.012)
    for k in range(3):
        sphere('dedo', 0.034, (s * (0.585 + k * 0.035), 0.27, 0.72), (1, 1, 1.5), WHITE, seg=12, ring=8, th=0.01)
    sphere('polegar', 0.03, (s * 0.555, 0.24, 0.81), (1, 1, 1.4), WHITE, seg=12, ring=8, th=0.01)
    cyl('punho', 0.085, 0.07, (s * 0.61, 0.16, 0.88), PINK, rot=(0.5, 0, 0), th=0.012)
    # bota de solado de borracha
    sphere('bota', 0.17, (s * 0.21, 0.1, 0.12), (1, 1.6, 0.62), BOOT, seg=18, ring=10)
    rbox('sola', (0.32, 0.56, 0.06), (s * 0.21, 0.12, 0.03), PINK, bevel=0.025, th=0.012)

# ---- render: Workbench com luz de estudio, fundo de papel ----
scn.render.engine = 'BLENDER_WORKBENCH'
sh = scn.display.shading; sh.light = 'STUDIO'; sh.color_type = 'MATERIAL'; sh.show_cavity = False; sh.show_object_outline = False; sh.show_specular_highlight = False; sh.show_backface_culling = True

scn.render.film_transparent = False
scn.world = scn.world or bpy.data.worlds.new('rr_mundo'); scn.world.color = srgb('e9e4d8')
scn.render.resolution_x, scn.render.resolution_y = 600, 760
cam_data = bpy.data.cameras.new('rr_cam'); cam_data.lens = 70
cam = bpy.data.objects.new('rr_cam', cam_data); col.objects.link(cam); scn.camera = cam
outs = []
for nm, ang in (('frente', 25), ('lado', 90), ('costas', 200)):
    a = math.radians(ang); d = 5.2
    cam.location = (math.sin(a) * d, math.cos(a) * d, 1.35)
    cam.rotation_euler = (Vector((0, 0, 1.05)) - cam.location).to_track_quat('-Z', 'Y').to_euler()
    scn.render.filepath = os.path.join(OUT_DIR, 'personagem-' + nm + '.png')
    bpy.ops.render.render(write_still=True, scene=scn.name)
    outs.append(scn.render.filepath)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(os.path.dirname(OUT_DIR), 'personagem.blend'), copy=True)
result = {'renders': outs, 'objetos': len(scn.objects)}
