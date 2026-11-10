# Pecas comicas (07/11): um tema de desenho dos anos 30 por acessorio, nada imitando peca real. Lido pelo comic_attach.py
# (exec no mesmo escopo: usa lathe, rbox, ball, torus, frame, disc, plane, piece, knob, obj_from_bm, MATS).
# Nome do vazio = id do jogo (c_<id>; bocal = c_m_<id>). Tudo na unidade do jogo, sem escala no encaixe.

def pipe(name, pts, r, mat, parent):
    """cano curvo (curva com espessura, pontas fechadas) -> malha"""
    cu = bpy.data.curves.new(name, 'CURVE'); cu.dimensions = '3D'; cu.bevel_depth = r; cu.bevel_resolution = 2; cu.use_fill_caps = True; cu.resolution_u = 6
    sp = cu.splines.new('BEZIER'); sp.bezier_points.add(len(pts) - 1)
    for bp, co in zip(sp.bezier_points, pts): bp.co = co; bp.handle_left_type = bp.handle_right_type = 'AUTO'
    tmp = bpy.data.objects.new(name + '_cu', cu); bpy.context.scene.collection.objects.link(tmp)
    dg = bpy.context.evaluated_depsgraph_get(); bm = bmesh.new(); bm.from_mesh(tmp.evaluated_get(dg).to_mesh())
    bmesh.ops.remove_doubles(bm, verts=bm.verts[:], dist=1e-5); bpy.data.objects.remove(tmp, do_unlink=True)
    return obj_from_bm(name, bm, mat, parent)

def place(o, loc=(0, 0, 0), rot=(0, 0, 0), sc=(1, 1, 1)):
    o.location = loc; o.rotation_euler = rot; o.scale = sc; return o

def band(name, R, r, y, zc, parent, mat='accent', stretch=3.0):
    """cinta em volta de um cano no eixo Y (toro achatado no comprido)"""
    return place(torus(name, R, r, (0, 0, 0), mat, parent), (0, y, zc), (0, 0, 0), (1, stretch, 1))

def saddle(name, y, zc, R, parent, mat='body'):
    """berco em U por baixo de um cano deitado: o cano assenta nele, o U pisa no trilho"""
    pipe(name, [(-R * 0.95, y, zc - R * 0.25), (-R * 0.55, y, R * 0.18), (0, y, 0.012), (R * 0.55, y, R * 0.18), (R * 0.95, y, zc - R * 0.25)], 0.011, mat, parent)

def ringplate(name, outer_fn, r_in, zc, depth, y, mat, parent, n=40):
    """chapa em pe (plano XZ) com furo redondo no zc; outer_fn(theta) -> (x, z) da borda de fora no mesmo angulo"""
    bm = bmesh.new(); V = {}
    for side, yy in (('f', depth / 2), ('b', -depth / 2)):
        V[side + 'o'] = [bm.verts.new((*(lambda p: (p[0], yy, p[1]))(outer_fn(2 * math.pi * i / n)),)) for i in range(n)]
        V[side + 'i'] = [bm.verts.new((r_in * math.cos(2 * math.pi * i / n), yy, zc + r_in * math.sin(2 * math.pi * i / n))) for i in range(n)]
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new((V['fo'][i], V['fo'][j], V['fi'][j], V['fi'][i])); bm.faces.new((V['bo'][j], V['bo'][i], V['bi'][i], V['bi'][j]))
        bm.faces.new((V['fo'][j], V['fo'][i], V['bo'][i], V['bo'][j])); bm.faces.new((V['fi'][i], V['fi'][j], V['bi'][j], V['bi'][i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:]); bmesh.ops.translate(bm, verts=bm.verts[:], vec=Vector((0, y, 0)))
    return obj_from_bm(name, bm, mat, parent, bevel=min(depth * 0.3, 0.01), seg=3)

def knobY(name, r, h, loc, parent):
    o = lathe(name, [(r * 0.75, 0), (r, h * 0.12), (r, h * 0.85), (r * 0.7, h), (0.0005, h * 1.05)], 'accent', parent, axis='Z', segs=18, cap=False)
    return place(o, loc, (math.pi / 2, 0, 0))

def hollow(name, outer, wall, mat, parent, loc=(0, 0, 0), segs=28):
    """tubo OCO no eixo Y (07/11: a mira de tubo fechada mostrava fundo branco atras da reticula). outer = [(raio, y)] da frente pra tras"""
    inner = [(max(0.002, r - wall), y) for r, y in outer]
    prof = outer + list(reversed(inner)); bm = bmesh.new(); rings = []
    for r, y in prof:
        rings.append([bm.verts.new((r * math.cos(2 * math.pi * i / segs), y, r * math.sin(2 * math.pi * i / segs))) for i in range(segs)])
    n = len(rings)
    for k in range(n):
        a, b = rings[k], rings[(k + 1) % n]
        for i in range(segs):
            j = (i + 1) % segs; bm.faces.new((a[i], a[j], b[j], b[i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:]); bmesh.ops.translate(bm, verts=bm.verts[:], vec=Vector(loc))
    return obj_from_bm(name, bm, mat, parent)

# =============================== MIRAS ===============================
# sniper_scope_1: LUNETA GORDA (tubo que afina no meio, sino exagerado, aneis de rebite, botoes de radio)
P = piece('sniper_scope_1'); zc = 0.135
hollow('s1_tube', [(0.088, 0.585), (0.094, 0.56), (0.092, 0.47), (0.06, 0.36), (0.047, 0.30), (0.051, 0.0), (0.047, -0.28), (0.058, -0.38), (0.068, -0.47), (0.071, -0.55), (0.066, -0.585)], 0.008, 'body', P, loc=(0, 0, zc))
for y in (0.24, -0.22):
    torus('s1_ring%d' % (y > 0), 0.056, 0.016, (0, y, zc), 'accent', P)
    rbox('s1_foot%d' % (y > 0), (0.075, 0.065, zc - 0.03), (0, y, (zc - 0.03) / 2 + 0.001), 'body', P, bevel=0.02)
    for sx in (-1, 1): ball('s1_rivet%d%d' % (y > 0, sx > 0), 0.012, (sx * 0.066, y, zc), 'body', P)
knob('s1_top', 0.032, 0.05, (0, 0.02, zc + 0.046), P)
knob('s1_side', 0.027, 0.045, (0.048, 0.02, zc), P, axis='X')
disc('s1_glass_eye', 0.057, (0, -0.588, zc), P); disc('s1_glass_obj', 0.08, (0, 0.588, zc), P)

# sniper_scope_2: LUNETA DE MARINHEIRO (gomos que encaixam, couro no meio)
P = piece('sniper_scope_2'); zc = 0.09
hollow('s2_tube', [(0.068, 0.387), (0.072, 0.37), (0.068, 0.35), (0.068, 0.2), (0.06, 0.19), (0.06, -0.05), (0.052, -0.06), (0.052, -0.25), (0.045, -0.26), (0.045, -0.37), (0.05, -0.387)], 0.006, 'accent', P, loc=(0, 0, zc))
band('s2_leather', 0.061, 0.006, 0.07, zc, P, mat='body', stretch=9)
for i, y in enumerate((0.36, 0.195, -0.055, -0.255)): torus('s2_lip%d' % i, (0.07, 0.062, 0.054, 0.047)[i], 0.007, (0, y, zc), 'body', P)
saddle('s2_sad0', 0.25, zc, 0.068, P); saddle('s2_sad1', -0.15, zc, 0.052, P)
disc('s2_glass_eye', 0.04, (0, -0.39, zc), P); disc('s2_glass_obj', 0.06, (0, 0.39, zc), P)

# pistol_scope_5: CANUDO DE DIPLOMA (papel enrolado com laco de fita)
P = piece('pistol_scope_5'); zc = 0.078
hollow('p5_roll', [(0.052, 0.33), (0.056, 0.32), (0.056, -0.32), (0.052, -0.33)], 0.005, 'accent', P, loc=(0, 0, zc))
for y in (0.315, -0.315): torus('p5_lip%d' % (y > 0), 0.054, 0.008, (0, y, zc), 'accent', P)
band('p5_ribbon', 0.057, 0.007, 0.0, zc, P, mat='body', stretch=2.5)
for sx in (-1, 1): ball('p5_bow%d' % (sx > 0), 0.024, (0.026 * sx, 0.0, zc + 0.062), 'body', P, sc=(1.3, 0.6, 0.8))
ball('p5_knot', 0.013, (0, 0, zc + 0.06), 'body', P)
saddle('p5_sad0', 0.2, zc, 0.056, P); saddle('p5_sad1', -0.2, zc, 0.056, P)
disc('p5_glass_eye', 0.047, (0, -0.335, zc), P); disc('p5_glass_obj', 0.047, (0, 0.335, zc), P)

# subfusil_scope_1: PERISCOPIO (cano reto pro olho + chamine de submarino em cima)
P = piece('subfusil_scope_1'); zc = 0.1
hollow('sp1_tube', [(0.06, 0.185), (0.066, 0.17), (0.066, -0.15), (0.072, -0.17), (0.07, -0.185)], 0.006, 'body', P, loc=(0, 0, zc))
lathe('sp1_mast', [(0.03, 0.0), (0.03, 0.09)], 'accent', P, loc=(0, 0.08, zc + 0.05), axis='Z', segs=16)
ball('sp1_elbow', 0.036, (0, 0.08, zc + 0.14), 'accent', P)
place(lathe('sp1_head', [(0.034, 0.0), (0.036, 0.05), (0.03, 0.075)], 'accent', P, axis='Z', segs=16), (0, 0.08, zc + 0.14), (math.radians(-90), 0, 0))
for i, y in enumerate((0.1, -0.1)): torus('sp1_band%d' % i, 0.067, 0.008, (0, y, zc), 'accent', P)
saddle('sp1_sad0', 0.06, zc, 0.066, P); saddle('sp1_sad1', -0.1, zc, 0.066, P)
disc('sp1_glass_eye', 0.06, (0, -0.188, zc), P); disc('sp1_glass_obj', 0.056, (0, 0.188, zc), P)

# subfusil_scope_2: ESCOTILHA de navio num banquinho de 4 pernas
P = piece('subfusil_scope_2'); zc = 0.118; wy = -0.03
torus('sp2_ring', 0.064, 0.022, (0, wy, zc), 'accent', P)
lathe('sp2_rim', [(0.07, 0.016), (0.074, 0.0), (0.07, -0.016)], 'body', P, loc=(0, wy + 0.034, zc), cap=False)
for i in range(8):
    a = 2 * math.pi * (i + 0.5) / 8; ball('sp2_bolt%d' % i, 0.011, (math.cos(a) * 0.072, wy + 0.05, zc + math.sin(a) * 0.072), 'body', P)
lathe('sp2_hinge', [(0.013, -0.025), (0.013, 0.025)], 'body', P, loc=(0.092, wy, zc), axis='Z', segs=12)
for sx in (-1, 1):
    for sy in (-1, 1):
        x0, y0 = 0.022 * sx, wy + 0.012 * sy; fx, fy = 0.06 * sx, wy + 0.1 * sy
        pipe('sp2_leg%d%d' % (sx > 0, sy > 0), [(x0, y0, zc - 0.07), ((x0 + fx) / 2 + 0.012 * sx, (y0 + fy) / 2, 0.05), (fx, fy, 0.022)], 0.009, 'body', P)
        ball('sp2_foot%d%d' % (sx > 0, sy > 0), 0.016, (fx, fy, 0.016), 'accent', P)
disc('sp2_glass', 0.05, (0, wy - 0.005, zc), P)

# subfusil_scope_5: MONOCULO numa mola, corrente ate o prendedor
P = piece('subfusil_scope_5'); zc = 0.086; my = 0.08
torus('sp5_ring', 0.04, 0.009, (0, my, zc), 'accent', P)
pipe('sp5_spring', [(0.012 * math.cos(t * 1.3), my + 0.012 * math.sin(t * 1.3), 0.008 + t * 0.0042) for t in range(10)], 0.0045, 'body', P)
lathe('sp5_stem', [(0.006, 0.0), (0.006, 0.012)], 'body', P, loc=(0, my, zc - 0.05), axis='Z', segs=10)
pts = [(0.03, my - 0.03, zc - 0.03), (0.035, my - 0.1, 0.02), (0.03, my - 0.2, 0.03), (0.0, my - 0.27, 0.025)]
pipe('sp5_chain', pts, 0.004, 'accent', P)
for i in range(6):
    t = (i + 0.5) / 6; p = Vector(pts[0]).lerp(Vector(pts[-1]), t); ball('sp5_link%d' % i, 0.007, (p.x, p.y, min(p.z, 0.03) + 0.0), 'accent', P, sc=(1, 1.6, 1))
rbox('sp5_clip', (0.04, 0.05, 0.022), (0, my - 0.28, 0.012), 'body', P, bevel=0.008)
disc('sp5_glass', 0.032, (0, my, zc), P)

# subfusil_scope_6: LATA com ABA de chapeu
P = piece('subfusil_scope_6'); zc = 0.082
hollow('sp6_can', [(0.05, 0.10), (0.058, 0.085), (0.062, 0.0), (0.058, -0.085), (0.052, -0.105)], 0.005, 'body', P, loc=(0, 0, zc))
lathe('sp6_brim', [(0.06, 0.098), (0.088, 0.13), (0.093, 0.138), (0.062, 0.122)], 'accent', P, loc=(0, 0, zc), cap=False)
saddle('sp6_sad', 0.0, zc, 0.062, P)
knob('sp6_side', 0.024, 0.04, (0.055, -0.01, zc), P, axis='X')
disc('sp6_glass_eye', 0.046, (0, -0.108, zc), P); disc('sp6_glass_obj', 0.05, (0, 0.104, zc), P)

# subfusil_scope_7: GARRAFA deitada (olha pelo fundo; rolha na frente)
P = piece('subfusil_scope_7'); zc = 0.068
hollow('sp7_bottle', [(0.052, -0.21), (0.058, -0.2), (0.062, 0.04), (0.056, 0.1), (0.05, 0.13), (0.05, 0.16), (0.055, 0.165), (0.055, 0.178)], 0.006, 'body', P, loc=(0, 0, zc))  # garrafa de LEITE: boca larga (a lente passa por ela)
torus('sp7_cap', 0.052, 0.006, (0, 0.18, zc), 'accent', P)  # aro da tampinha
band('sp7_label', 0.0605, 0.006, -0.07, zc, P, stretch=7)
saddle('sp7_sad0', -0.12, zc, 0.06, P); saddle('sp7_sad1', 0.0, zc, 0.06, P)
disc('sp7_glass_eye', 0.043, (0, -0.213, zc), P); disc('sp7_glass_obj', 0.02, (0, 0.217, zc), P)

# subfusil_scope_8: LUPA (aro + cabo de madeira que dobra e encosta no trilho)
P = piece('subfusil_scope_8'); zc = 0.088; ly = 0.06
torus('sp8_ring', 0.05, 0.012, (0, ly, zc), 'body', P)
lathe('sp8_neck', [(0.012, 0.0), (0.016, 0.02), (0.012, 0.03)], 'body', P, loc=(0, ly, zc - 0.066), axis='Z', segs=14)
pipe('sp8_handle', [(0, ly, zc - 0.058), (0, ly - 0.03, 0.03), (0, ly - 0.12, 0.02), (0, ly - 0.24, 0.024)], 0.017, 'accent', P)
ball('sp8_knob', 0.022, (0, ly - 0.25, 0.024), 'accent', P)
torus('sp8_band', 0.019, 0.006, (0, ly - 0.15, 0.02), 'body', P)
disc('sp8_glass', 0.042, (0, ly, zc), P)

# subfusil_scope_9: FERRADURA em pe, com cravos
P = piece('subfusil_scope_9'); zc = 0.08; R = 0.054
arc = [(R * math.cos(math.radians(a)), 0, zc + R * math.sin(math.radians(a))) for a in range(-50, 231, 28)]
place(pipe('sp9_shoe', arc, 0.017, 'body', P), (0, 0, 0), (0, 0, 0), (1, 1.6, 1))
for i, a in enumerate((20, 55, 125, 160)): ball('sp9_nail%d' % i, 0.006, (R * math.cos(math.radians(a)), -0.027, zc + R * math.sin(math.radians(a))), 'accent', P)
for sx in (-1, 1): ball('sp9_toe%d' % (sx > 0), 0.02, (sx * R * math.cos(math.radians(50)), 0, zc - R * math.sin(math.radians(50)) - 0.004), 'body', P, sc=(1, 1.4, 1))
pipe('sp9_tail', [(0, -0.02, 0.012), (0, -0.09, 0.012), (0.0, -0.13, 0.03)], 0.008, 'accent', P)  # rabinho de laco atras
disc('sp9_glass', 0.034, (0, -0.03, zc), P)

# subfusil_scope_10: CHARUTO com cinta, ponta acesa e fumacinha
P = piece('subfusil_scope_10'); zc = 0.058
hollow('sp10_cigar', [(0.034, -0.265), (0.04, -0.25), (0.043, 0.0), (0.04, 0.2), (0.036, 0.235)], 0.004, 'accent', P, loc=(0, 0, zc))
hollow('sp10_ash', [(0.0365, 0.236), (0.0365, 0.255), (0.035, 0.265)], 0.004, 'body', P, loc=(0, 0, zc))
band('sp10_band', 0.044, 0.005, -0.17, zc, P, mat='body', stretch=5)
for i, (y, z, r) in enumerate(((0.27, 0.035, 0.016), (0.285, 0.058, 0.02), (0.275, 0.085, 0.017))): ball('sp10_puff%d' % i, r, (0, y, zc + z - 0.02), 'body', P)
saddle('sp10_sad0', -0.15, zc, 0.043, P); saddle('sp10_sad1', 0.1, zc, 0.043, P)
disc('sp10_glass_eye', 0.034, (0, -0.268, zc), P); disc('sp10_glass_obj', 0.03, (0, 0.268, zc), P)

# fusil_scope_1: LATA DE FEIJAO com tampa aberta pra cima
P = piece('fusil_scope_1'); zc = 0.098
prof = [(0.075, 0.15)]
for k in range(7): prof.append((0.077 if k % 2 == 0 else 0.073, 0.12 - k * 0.04))
prof.append((0.075, -0.15))
hollow('f1_can', prof, 0.006, 'body', P, loc=(0, 0, zc))
for y in (0.152, -0.152): torus('f1_rim%d' % (y > 0), 0.075, 0.006, (0, y, zc), 'body', P)
band('f1_label', 0.078, 0.004, 0.0, zc, P, stretch=12)
lid = lathe('f1_lid', [(0.072, 0.0), (0.072, 0.006)], 'accent', P, loc=(0, 0, -0.072)); place(lid, (0, 0.158, zc + 0.072), (math.radians(-110), 0, 0))
saddle('f1_sad0', 0.08, zc, 0.076, P); saddle('f1_sad1', -0.08, zc, 0.076, P)
disc('f1_glass_eye', 0.062, (0, -0.16, zc), P); disc('f1_glass_obj', 0.062, (0, 0.16, zc), P)

# fusil_scope_2: BOIA SALVA-VIDAS listrada presa numa ancora
P = piece('fusil_scope_2'); zc = 0.112; R = 0.07
torus('f2_buoy', R, 0.024, (0, 0, zc), 'body', P)
for i in range(4):
    a = math.pi / 4 + i * math.pi / 2; place(torus('f2_stripe%d' % i, 0.026, 0.006, (0, 0, 0), 'accent', P, axis='Z'), (R * math.cos(a), 0, zc + R * math.sin(a)), (0, -a, 0))
pipe('f2_post', [(0, 0, zc - R - 0.01), (0, 0, 0.015)], 0.009, 'accent', P)
pipe('f2_fluke', [(-0.045, 0, 0.04), (-0.03, 0, 0.012), (0, 0, 0.008), (0.03, 0, 0.012), (0.045, 0, 0.04)], 0.008, 'accent', P)
for sx in (-1, 1): ball('f2_tip%d' % (sx > 0), 0.011, (0.046 * sx, 0, 0.045), 'accent', P)
pipe('f2_rope', [(0.06, 0, zc + 0.05), (0.09, -0.08, zc - 0.02), (0.05, -0.18, 0.02)], 0.006, 'accent', P)
disc('f2_glass', 0.048, (0, -0.005, zc), P)

# fusil_scope_4: RADIO CAPELA (janela redonda no alto-falante) com fio e tomada atras
P = piece('fusil_scope_4'); zc = 0.172; W = 0.2; z0 = 0.005
def arch(t):
    c, s = math.cos(t), math.sin(t)
    if s >= 0: return (W / 2 * c, zc + W / 2 * s)
    ts = [x for x in ((W / 2) / abs(c) if abs(c) > 1e-6 else 1e9, (zc - z0) / -s) if x > 0]; tt = min(ts); return (tt * c, zc + tt * s)
ringplate('f4_radio', arch, 0.06, zc, 0.13, 0.0, 'accent', P)
torus('f4_grille', 0.064, 0.007, (0, -0.067, zc), 'body', P)
for i, x in enumerate((-0.05, 0.05)): knobY('f4_dial%d' % i, 0.015, 0.02, (x, -0.066, 0.045), P)
pipe('f4_cord', [(0, 0.065, 0.03), (0.03, 0.15, 0.012), (-0.02, 0.24, 0.012), (0.0, 0.29, 0.014)], 0.007, 'body', P)
rbox('f4_plug', (0.03, 0.04, 0.026), (0, 0.305, 0.016), 'accent', P, bevel=0.008)
disc('f4_glass', 0.055, (0, -0.068, zc), P)

# fusil_scope_5: PIRULITO (aro listrado num palito, chiclete no pe)
P = piece('fusil_scope_5'); zc = 0.112; R = 0.05  # 07/11 (pedido dele): bem mais baixa
torus('f5_ring', R, 0.012, (0, 0, zc), 'accent', P)  # aro fino: o furo (r ~0,043) fica maior que a lente
for i in range(8):  # bolinhas de doce SO do lado de fora (07/11: as listras abracando o aro fechavam o furo)
    a = i * math.pi / 4 + 0.2; ball('f5_dot%d' % i, 0.009, (math.cos(a) * (R + 0.012), 0, zc + math.sin(a) * (R + 0.012)), 'body', P)
pipe('f5_stick', [(0, 0, zc - R - 0.008), (0, 0, 0.03)], 0.01, 'body', P)
ball('f5_gum', 0.03, (0, 0, 0.022), 'accent', P, sc=(1.3, 1.3, 0.75))
disc('f5_glass', 0.036, (0, -0.005, zc), P)

# fusil_scope_6: CANETA-TINTEIRO (pena dourada na frente, clipe em cima, pingo de tinta)
P = piece('fusil_scope_6'); zc = 0.066
hollow('f6_pen', [(0.034, -0.34), (0.042, -0.32), (0.044, 0.12), (0.04, 0.16), (0.038, 0.25)], 0.004, 'body', P, loc=(0, 0, zc))
place(lathe('f6_nib', [(0.012, 0.0), (0.009, 0.04), (0.003, 0.08), (0.0008, 0.095)], 'accent', P, segs=12), (0, 0.25, zc + 0.03), (0, 0, 0))  # pena em cima da boca (a boca fica livre)
band('f6_gold', 0.0445, 0.005, -0.1, zc, P, stretch=4)
pipe('f6_clip', [(0, -0.3, zc + 0.046), (0, -0.2, zc + 0.054), (0, -0.13, zc + 0.05)], 0.006, 'accent', P)
ball('f6_clipball', 0.01, (0, -0.13, zc + 0.05), 'accent', P)
ball('f6_drop', 0.011, (0, 0.338, zc - 0.012), 'body', P, sc=(1, 1, 1.4))
saddle('f6_sad0', -0.2, zc, 0.044, P); saddle('f6_sad1', 0.06, zc, 0.044, P)
disc('f6_glass_eye', 0.035, (0, -0.343, zc), P)

# fusil_scope_7: FECHADURA em pe com a chave pendurada do lado
P = piece('fusil_scope_7'); zc = 0.115; Wp, Hp = 0.13, 0.2
def plate(t):
    c, s = math.cos(t), math.sin(t); hw, hh = Wp / 2, Hp / 2; cz = 0.1
    tt = min(hw / abs(c) if abs(c) > 1e-6 else 1e9, hh / abs(s) if abs(s) > 1e-6 else 1e9)
    x, z = tt * c, cz + tt * s - (zc - 0.1) * 0
    k = 0.75; return (x * k + (hw * c) * (1 - k), z * k + (cz + hh * s) * (1 - k))  # canto arredondado
ringplate('f7_plate', lambda t: (lambda p: (p[0], p[1] + 0.005))(plate(t)), 0.05, zc, 0.03, 0.0, 'accent', P)
for sx in (-1, 1):
    for sz in (-1, 1): ball('f7_screw%d%d' % (sx > 0, sz > 0), 0.009, (0.045 * sx, -0.017, 0.105 + 0.075 * sz), 'body', P)
place(lathe('f7_peg2', [(0.008, 0.0), (0.008, 0.03)], 'body', P, axis='Z', segs=10), (Wp / 2 - 0.004, 0, 0.17), (0, math.pi / 2, 0))
torus('f7_bow', 0.02, 0.006, (Wp / 2 + 0.026, 0, 0.17), 'body', P)
pipe('f7_shaft', [(Wp / 2 + 0.026, 0, 0.15), (Wp / 2 + 0.026, 0, 0.06)], 0.006, 'body', P)
rbox('f7_bit', (0.012, 0.012, 0.026), (Wp / 2 + 0.034, 0, 0.068), 'body', P, bevel=0.004)
disc('f7_glass', 0.048, (0, -0.016, zc), P)

# =============================== EMPUNHADURAS (topo no z = 0) ===============================
# subfusil_handle_2: SALSICHA com dedos e bola
P = piece('subfusil_handle_2')
lathe('h2_body', [(0.035, -0.0), (0.05, -0.03), (0.052, -0.06), (0.044, -0.08), (0.054, -0.11), (0.044, -0.135), (0.054, -0.165), (0.044, -0.19), (0.054, -0.22), (0.05, -0.245)], 'accent', P, axis='Z', segs=22)
ball('h2_ball', 0.064, (0, 0, -0.262), 'accent', P)
rbox('h2_clamp', (0.075, 0.15, 0.035), (0, 0, 0.012), 'body', P, bevel=0.012)

# subfusil_handle_3: BOTA (cano de bota inclinado, bico pra frente, sola escura)
P = piece('subfusil_handle_3')
place(lathe('h3_leg', [(0.036, 0.0), (0.042, -0.05), (0.04, -0.2)], 'accent', P, axis='Z', segs=18), (0, 0, 0.005), (math.radians(12), 0, 0))  # cano inclinado pra frente ate o pe
rbox('h3_foot', (0.085, 0.15, 0.07), (0, 0.075, -0.19), 'accent', P, bevel=0.03)
rbox('h3_sole', (0.09, 0.16, 0.022), (0, 0.077, -0.227), 'body', P, bevel=0.009)
for i in range(3): ball('h3_lace%d' % i, 0.008, (0, 0.045 + i * 0.008, -0.06 - i * 0.04), 'body', P)
rbox('h3_clamp', (0.07, 0.12, 0.03), (0, 0, 0.01), 'body', P, bevel=0.01)

# subfusil_handle_6: CABO DE GUARDA-CHUVA (gancho em J)
P = piece('subfusil_handle_6')
pipe('h6_hook', [(0, 0, 0.0), (0, 0, -0.2), (0, 0.035, -0.29), (0, 0.11, -0.285), (0, 0.13, -0.21)], 0.027, 'accent', P)
ball('h6_end', 0.03, (0, 0.13, -0.205), 'accent', P)
torus('h6_ferrule', 0.03, 0.009, (0, 0, -0.03), 'body', P, axis='Z')
rbox('h6_clamp', (0.075, 0.13, 0.03), (0, 0, 0.01), 'body', P, bevel=0.01)

# fusil_handle_2: PINO DE BOLICHE de cabeca pra baixo (pesado)
P = piece('fusil_handle_2')
lathe('fh2_pin', [(0.045, 0.0), (0.07, -0.08), (0.074, -0.13), (0.055, -0.2), (0.034, -0.26), (0.036, -0.29), (0.05, -0.34), (0.045, -0.39), (0.0005, -0.405)], 'accent', P, axis='Z', segs=24)
for i, z in enumerate((-0.268, -0.284)): torus('fh2_stripe%d' % i, 0.0335, 0.006, (0, 0, z), 'body', P, axis='Z')
rbox('fh2_clamp', (0.085, 0.16, 0.035), (0, 0, 0.014), 'body', P, bevel=0.012)

# =============================== SNIPERS: empunhaduras e bipes (09/11, pedido dele) ===============================
# sniper_handle_1: COLHER DE PAU em pe (cabo fino, concha embaixo)
P = piece('sniper_handle_1')
lathe('sh1_stick', [(0.03, 0.0), (0.032, -0.05), (0.024, -0.14), (0.022, -0.22), (0.026, -0.26)], 'accent', P, axis='Z', segs=16)
ball('sh1_bowl', 0.05, (0, 0, -0.3), 'accent', P, sc=(0.95, 0.42, 1.25))
torus('sh1_ring', 0.03, 0.007, (0, 0, -0.072), 'body', P, axis='Z')
rbox('sh1_clamp', (0.08, 0.15, 0.034), (0, 0, 0.014), 'body', P, bevel=0.012)

# sniper_handle_2: MOLA gorda com bola de borracha na ponta
P = piece('sniper_handle_2')
lathe('sh2_core', [(0.02, 0.0), (0.02, -0.27)], 'body', P, axis='Z', segs=12)
for i in range(6): torus('sh2_coil%d' % i, 0.038 - i * 0.002, 0.011, (0, 0, -0.04 - i * 0.04), 'accent', P, axis='Z')
ball('sh2_ball', 0.05, (0, 0, -0.32), 'accent', P)
rbox('sh2_clamp', (0.08, 0.13, 0.034), (0, 0, 0.014), 'body', P, bevel=0.012)

def bipod_leg(pre, sx, parent, foot):
    """perna aberta pro lado: dobradica em cima, joelho e pe de desenho"""
    pipe(pre + '_leg', [(sx * 0.03, 0.0, -0.02), (sx * 0.1, 0.0, -0.17), (sx * 0.15, 0.0, -0.34)], 0.015, 'accent', parent)
    torus(pre + '_knee', 0.02, 0.007, (sx * 0.1, 0.0, -0.17), 'body', parent, axis='Z')
    foot(pre, sx, parent)

# sniper_bipod_1: PERNAS DE PAU com sapatinho
P = piece('sniper_bipod_1')
def shoe(pre, sx, parent): ball(pre + '_shoe', 0.04, (sx * 0.155, 0.022, -0.37), 'body', parent, sc=(0.9, 1.5, 0.62))
bipod_leg('bp1l', -1, P, shoe); bipod_leg('bp1r', 1, P, shoe)
rbox('bp1_hinge', (0.1, 0.12, 0.05), (0, 0, 0.004), 'body', P, bevel=0.012)

# sniper_bipod_2: PE DE GALINHA pesado, tres dedos em cada perna
P = piece('sniper_bipod_2')
def claw(pre, sx, parent):
    for i, a in enumerate((-0.7, 0.0, 0.7)):
        pipe('%s_toe%d' % (pre, i), [(sx * 0.15, 0.0, -0.34), (sx * 0.15 + math.sin(a) * 0.04, math.cos(a) * 0.05, -0.375), (sx * 0.15 + math.sin(a) * 0.075, math.cos(a) * 0.095, -0.382)], 0.009, 'body', parent)
bipod_leg('bp2l', -1, P, claw); bipod_leg('bp2r', 1, P, claw)
ball('bp2_joint', 0.046, (0, 0, -0.006), 'body', P, sc=(1.25, 1, 0.8))
rbox('bp2_clamp', (0.085, 0.14, 0.03), (0, 0, 0.026), 'accent', P, bevel=0.01)

# =============================== LASERS (pe no z = 0, frente +Y) ===============================
# laser_1: RAIO DE FICCAO (capsula com aletas que crescem e bulbo na ponta)
P = piece('laser_1'); zc = 0.045
lathe('l1_body', [(0.02, -0.1), (0.03, -0.08), (0.03, 0.06), (0.022, 0.09)], 'body', P, loc=(0, 0, zc))
for i, (y, R) in enumerate(((0.0, 0.034), (0.03, 0.04), (0.06, 0.047))): torus('l1_fin%d' % i, R, 0.006, (0, y, zc), 'accent', P)
ball('l1_bulb', 0.022, (0, 0.105, zc), 'glass', P)
rbox('l1_clamp', (0.05, 0.1, 0.03), (0, -0.01, 0.012), 'body', P, bevel=0.01)

# laser_2: LAMPADA de rosca deitada
P = piece('laser_2'); zc = 0.045
lathe('l2_socket', [(0.022, -0.09), (0.028, -0.07), (0.028, 0.02)], 'body', P, loc=(0, 0, zc))
for i, y in enumerate((-0.04, -0.02, 0.0)): torus('l2_thread%d' % i, 0.028, 0.004, (0, y, zc), 'accent', P)
ball('l2_bulb', 0.04, (0, 0.06, zc), 'glass', P, sc=(1, 1.2, 1))
rbox('l2_clamp', (0.05, 0.08, 0.03), (0, -0.04, 0.012), 'body', P, bevel=0.01)

# light_1: LANTERNA de desenho (caixa fofa, bocal e bulbo)
P = piece('light_1')
rbox('lt_body', (0.08, 0.2, 0.075), (0, 0, 0.04), 'body', P, bevel=0.03)
lathe('lt_cup', [(0.02, 0.095), (0.04, 0.11), (0.046, 0.14), (0.043, 0.145)], 'accent', P, loc=(0, 0, 0.04), cap=False)
ball('lt_bulb', 0.036, (0, 0.14, 0.04), 'glass', P, sc=(1, 0.6, 1))
knob('lt_btn', 0.016, 0.02, (0, -0.06, 0.076), P)

# =============================== BOCAIS (cano no eixo Y, encaixe no y = 0, furo r ~0,035) ===============================
# comp: BARRILZINHO com furos e boca de trompete
P = piece('m_comp')
lathe('mc_body', [(0.03, 0.0), (0.052, 0.02), (0.058, 0.08), (0.052, 0.15), (0.06, 0.18), (0.075, 0.21), (0.07, 0.215), (0.04, 0.2)], 'body', P)
for i, y in enumerate((0.06, 0.1, 0.14)): ball('mc_hole%d' % i, 0.015, (0, y, 0.051), 'accent', P, sc=(1, 1, 0.45))

# flash: CORNETA (bacamarte)
P = piece('m_flash')
lathe('mf_horn', [(0.04, 0.0), (0.045, 0.06), (0.05, 0.12), (0.07, 0.18), (0.1, 0.217), (0.06, 0.2), (0.035, 0.12)], 'accent', P)
torus('mf_lip', 0.104, 0.01, (0, 0.224, 0), 'body', P)
torus('mf_band', 0.047, 0.007, (0, 0.04, 0), 'body', P)

# brake: PIMENTEIRO (vidrinho com tampa furada)
P = piece('m_brake')
lathe('mb_jar', [(0.04, 0.0), (0.06, 0.03), (0.064, 0.12), (0.05, 0.15)], 'accent', P)
lathe('mb_cap', [(0.05, 0.145), (0.054, 0.15), (0.054, 0.19), (0.045, 0.215), (0.02, 0.225)], 'body', P)
for i in range(6):
    a = i * math.pi / 3; ball('mb_hole%d' % i, 0.007, (0.03 * math.cos(a), 0.214, 0.03 * math.sin(a)), 'accent', P)

# silencer: LATA DE SOPA (canelada, rotulo)
P = piece('m_silencer')
prof = [(0.04, 0.0), (0.066, 0.012)]
for k in range(8): prof.append((0.068 if k % 2 == 0 else 0.064, 0.04 + k * 0.035))
prof += [(0.066, 0.31), (0.04, 0.32)]
lathe('ms_can', prof, 'body', P)
band('ms_label', 0.069, 0.005, 0.17, 0, P, stretch=14)

# silencer2: SALAME amarrado com barbante
P = piece('m_silencer2')
lathe('ms2_salami', [(0.04, 0.0), (0.066, 0.03), (0.076, 0.12), (0.078, 0.25), (0.07, 0.36), (0.045, 0.41), (0.02, 0.42)], 'accent', P)
for i, y in enumerate((0.08, 0.17, 0.26, 0.34)): torus('ms2_string%d' % i, (0.073, 0.078, 0.077, 0.068)[i], 0.0045, (0, y, 0), 'body', P)
pipe('ms2_tail', [(0, 0.415, 0.0), (0.0, 0.44, 0.02), (0.02, 0.45, 0.05)], 0.004, 'body', P)
