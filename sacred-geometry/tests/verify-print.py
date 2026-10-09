from pypdf import PdfReader
from pypdf.generic import ContentStream
import json,zipfile,io
from pathlib import Path
import sys
path=Path(sys.argv[1] if len(sys.argv)>1 else '/private/tmp/atlas-all.pdf')
r=PdfReader(path);assert len(r.pages)==154
for page in r.pages:
 mm=lambda x:float(x)*25.4/72
 assert abs(mm(page.mediabox.width)-76)<1e-5 and abs(mm(page.mediabox.height)-106)<1e-5
 assert abs(mm(page.trimbox.width)-70)<1e-5 and abs(mm(page.trimbox.height)-100)<1e-5
 assert page.get('/Rotate',0)==0
 fonts=page['/Resources']['/Font']
 for obj in fonts.values():
  f=obj.get_object();desc=f['/DescendantFonts'][0].get_object()['/FontDescriptor'].get_object()
  assert any(k in desc for k in ['/FontFile','/FontFile2','/FontFile3'])
 for _,obj in page['/Resources'].get('/XObject',{}).items():assert obj.get_object().get('/Subtype')!='/Image'
 matrix=[1,0,0,1];stack=[]
 for args,op in ContentStream(page.get_contents(),r).operations:
  if op==b'q':stack.append(matrix.copy())
  elif op==b'Q':matrix=stack.pop()
  elif op==b'cm':
   a,b,c,d=map(float,args[:4]);x,y,z,w=matrix
   matrix=[x*a+z*b,y*a+w*b,x*c+z*d,y*c+w*d]
  elif op==b'Tf':
   size=float(args[1])*(matrix[2]**2+matrix[3]**2)**.5
   assert size>=8.99999,(size,matrix)
 assert page.extract_text().strip()
layouts=json.loads(Path('/private/tmp/atlas-layouts.json').read_text())
assert len(layouts)==154
for layout in layouts:
 for text in layout['items']:
  assert text['size']>=9
  assert text['y']+(len(text['lines'])-1)*text['lineHeight']<=99.2
z=zipfile.ZipFile('/private/tmp/atlas-two-cards.zip')
assert len([n for n in z.namelist() if n.endswith('.svg')])==4
for n in z.namelist():
 if n.endswith('.pdf'):
  q=PdfReader(io.BytesIO(z.read(n)));assert len(q.pages)==(4 if n=='atlas-deck.pdf' else 2)
print('PASS: 154 pages, 76x106 MediaBox, 70x100 TrimBox, embedded fonts, minimum font 9pt, no raster images, safe fields, individual two-sided PDFs/SVGs and ZIP.')
