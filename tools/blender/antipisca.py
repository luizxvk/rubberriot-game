# Checagem anti-pisca GENERICA (regra dele 06/11: nenhuma face no mesmo plano/sentido de outra). Serve pra qualquer
# builder (mapa ou arma), inclusive faces inclinadas. Uso dentro do Blender (pela ponte bl.py):
#   import sys; sys.path.insert(0, r'D:\Desktopokusstudios	inta-louca	oolslender'); from antipisca import coplanar_report
#   PIECES = [(grupo, material, bmesh), ...]  -> cada peca um solido FECHADO; face enterrada em outra peca do mesmo grupo nao conta
#   bad = coplanar_report(PIECES); if bad: raise RuntimeError(...)
# Tolerancia: planos a menos de 1,2 mm (tol) com area sobreposta = pisca.
import bmesh, math
from mathutils import Vector
from mathutils.bvhtree import BVHTree

def coplanar_report(PIECES, tol=0.0012):
    trees, faces = [], []
    for idx, (g, m, bm) in enumerate(PIECES):
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:]); bm.normal_update(); bm.faces.ensure_lookup_table(); bm.verts.ensure_lookup_table()
        trees.append(BVHTree.FromBMesh(bm))
    def inside(t, p):
        d, o, n = Vector((0.5773, 0.5774, 0.5775)), p.copy(), 0
        for _ in range(64):
            hit = t.ray_cast(o, d)
            if hit[0] is None: break
            n += 1; o = hit[0] + d * 1e-6
        return n % 2 == 1
    for idx, (g, m, bm) in enumerate(PIECES):
        for f in bm.faces:
            nrm = f.normal.copy()
            if nrm.length < 0.5: continue
            ctr = f.calc_center_median()
            if any(j != idx and g == PIECES[j][0] and inside(trees[j], ctr + nrm * 0.0015) for j in range(len(PIECES))): continue  # enterrada
            faces.append((idx, nrm, nrm.dot(ctr), [v.co.copy() for v in f.verts], m))
    bad = []
    for i in range(len(faces)):
        a = faces[i]
        for j in range(i + 1, len(faces)):
            b = faces[j]
            if a[0] == b[0] or a[1].dot(b[1]) < 0.999 or abs(a[2] - b[2]) > tol: continue
            ax = max(range(3), key=lambda k: abs(a[1][k])); o = [k for k in range(3) if k != ax]  # projeta tirando o eixo dominante
            ra = [(p[o[0]], p[o[1]]) for p in a[3]]; rb = [(p[o[0]], p[o[1]]) for p in b[3]]
            if overlap2d(ra, rb): bad.append((a[4], b[4], tuple(round(x, 3) for x in a[1]), round(a[2], 4), tuple(round(x, 3) for x in a[3][0])))
    return bad
def overlap2d(A, B):
    """eixo separador (poligonos convexos): True se as areas se sobrepoem mais que 0,1 mm"""
    for P in (A, B):
        for k in range(len(P)):
            x0, y0 = P[k]; x1, y1 = P[(k + 1) % len(P)]; nx, ny = y0 - y1, x1 - x0; L = math.hypot(nx, ny)
            if L < 1e-9: continue
            pa = [(x * nx + y * ny) / L for x, y in A]; pb = [(x * nx + y * ny) / L for x, y in B]
            if min(max(pa), max(pb)) - max(min(pa), min(pb)) < 1e-4: return False
    return True
