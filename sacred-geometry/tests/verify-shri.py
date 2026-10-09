import numpy as np,json
from scipy.optimize import least_squares
from shapely.geometry import LineString
from shapely.ops import unary_union,polygonize
from pathlib import Path
import os
os.chdir(Path(__file__).resolve().parents[2])
# Conditions (i)-(iii) from Chiodo 2021, p.383, triangles numbered by base.
triples=[(1,2,7),(2,3,7),(1,3,8),(1,4,6),(1,5,9),(4,6,9),(2,7,9),(3,7,8),(3,8,9),(4,4,8),(5,5,6),(2,6,6)]
pairs=[(8,1),(6,2),(9,3),(1,6),(5,7),(4,8),(2,9)]
fixed={2:-1+2*.324,5:-1+2*.517,6:-1+2*.592,8:-1+2*.864}
b=np.array([-.75,-.5,fixed[2],-.1667,-.0417,fixed[5],fixed[6],.5,fixed[8]])
a=np.array([b[5],b[8],1,b[7],b[6],b[1],-1,b[0],b[2]])
w=np.array([.35,.6,np.sqrt(1-b[2]**2),.7,.2,.5,np.sqrt(1-b[6]**2),.7,.5])
def residual(x):
 b,a,w=x[:9],x[9:18],x[18:];r=[]
 for i,j in pairs:r.append(a[i-1]-b[j-1])
 for i,j,k in triples:
  y=b[j-1];i-=1;k-=1;r.append(w[i]*(y-a[i])/(b[i]-a[i])-w[k]*(y-a[k])/(b[k]-a[k]))
 r.extend([a[2]-1,a[6]+1,w[2]**2+b[2]**2-1,w[6]**2+b[6]**2-1])
 r.extend(b[i]-v for i,v in fixed.items());return r
r=least_squares(residual,np.r_[b,a,w],max_nfev=5000,xtol=1e-14,ftol=1e-14,gtol=1e-14)
b,a,w=r.x[:9],r.x[9:18],r.x[18:]
assert max(abs(np.array(residual(r.x))))<1e-9
assert all(np.diff(b)>0) and all(w>0)
triangles=[[[0,float(a[i])],[-float(w[i]),float(b[i])],[float(w[i]),float(b[i])]] for i in range(9)]
segments=[LineString([t[i],t[(i+1)%3]]) for t in triangles for i in range(3)]
# Snap intersection nodes only for topological polygonization, never for rendering.
from shapely import set_precision
edges=[(np.array(t[i]),np.array(t[(i+1)%3])) for t in triangles for i in range(3)]
split=[[(0,a),(1,b)] for a,b in edges]
cross=lambda a,b:a[0]*b[1]-a[1]*b[0]
for i,(a,b) in enumerate(edges):
 for j,(c,d) in enumerate(edges):
  if j<=i:continue
  u=b-a;v=d-c;den=cross(u,v)
  if abs(den)<1e-12:
   for p in [c,d]:
    t=np.dot(p-a,u)/np.dot(u,u)
    if abs(cross(p-a,u))<1e-10 and -1e-9<=t<=1+1e-9:split[i].append((t,p))
   for p in [a,b]:
    t=np.dot(p-c,v)/np.dot(v,v)
    if abs(cross(p-c,v))<1e-10 and -1e-9<=t<=1+1e-9:split[j].append((t,p))
   continue
  ti=cross(c-a,v)/den;tj=cross(c-a,u)/den
  if -1e-9<=ti<=1+1e-9 and -1e-9<=tj<=1+1e-9:
   p=a+ti*u;split[i].append((ti,p));split[j].append((tj,p))
unique={}
for vertices in split:
 vertices.sort(key=lambda x:x[0]);ps=[]
 for _,p in vertices:
  q=tuple(np.round(p,8))
  if not ps or q!=ps[-1]:ps.append(q)
 for a,b in zip(ps,ps[1:]):unique[tuple(sorted([a,b]))]=LineString([a,b])
faces=list(polygonize(list(unique.values())))
tri_faces=[]
for face in faces:
 if face.area<1e-6:continue
 pts=list(face.exterior.coords)[:-1];corners=[]
 for i,p in enumerate(pts):
  u=np.array(p)-np.array(pts[i-1]);v=np.array(pts[(i+1)%len(pts)])-np.array(p)
  if abs(u[0]*v[1]-u[1]*v[0])>1e-6:corners.append(p)
 if len(corners)==3:tri_faces.append(face)
print('residual',max(abs(np.array(residual(r.x)))),'faces',len(faces),'triangular faces',len(tri_faces))
from shapely.geometry import Polygon
from collections import Counter
print('coverage',Counter(sum(Polygon(t).contains(face.representative_point()) for t in triangles) for face in tri_faces))
regions=[face for face in tri_faces if sum(Polygon(t).contains(face.representative_point()) for t in triangles)%2]
assert len(regions)==43
Path('sacred-geometry/shri.js').write_text('export const shriTriangles='+json.dumps(triangles)+';\nexport const shriVerification='+json.dumps({'residual':max(abs(np.array(residual(r.x)))),'regions':43,'source':'https://www.numdam.org/articles/10.5802/crmath.163/'})+';\n')
Path('sacred-geometry/shri-model.json').write_text(json.dumps({'triangles':triangles,'bases':r.x[:9].tolist(),'apices':r.x[9:18].tolist(),'halfWidths':r.x[18:].tolist(),'residual':max(abs(np.array(residual(r.x)))),'triangularFaces':len(tri_faces),'source':'https://www.numdam.org/articles/10.5802/crmath.163/','parameters':fixed},indent=2))
