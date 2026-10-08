"""Lossless web variants for replacement cards; original bytes remain unchanged."""
import argparse,json,hashlib,shutil
from pathlib import Path
from PIL import Image,ImageOps
P=Path(__file__).resolve().parents[1]
def build(incoming=None,mapping=None):
 symbols=json.loads((P/'data/symbols.json').read_text());known={s['id']:s for s in symbols};path=P/'data/images.json';manifest=json.loads(path.read_text()) if path.exists() else {};replacements={}
 for id,s in known.items():
  current=P/s['imageCard'];sha=hashlib.sha256(current.read_bytes()).hexdigest()
  if id not in manifest:
   with Image.open(current) as im:w,h=ImageOps.exif_transpose(im).size
   manifest[id]={'original':s['imageCard'],'preview':s['imageCard'],'width':w,'height':h,'variants':[],'originalSHA256':sha}
  elif sha!=manifest[id]['originalSHA256']:replacements[id]=current.resolve()
 if incoming:
  source=Path(incoming).resolve();files=json.loads(Path(mapping).read_text()) if mapping else {p.stem:p.name for p in source.iterdir() if p.suffix.lower() in ['.jpg','.jpeg','.png','.webp','.avif']}
  if not files:raise ValueError('No replacement cards found')
  for id,name in files.items():
   if id not in known:raise ValueError('Unknown symbol ID: '+id)
   original=(source/name).resolve()
   if not original.is_relative_to(source):raise ValueError('File outside incoming directory')
   replacements[id]=original
 for id,original in replacements.items():
  blob=original.read_bytes();sha=hashlib.sha256(blob).hexdigest();dest=P/'assets/originals'/f'{id}-{sha[:12]}{original.suffix.lower()}';dest.parent.mkdir(parents=True,exist_ok=True)
  with Image.open(original) as raw:
   im=ImageOps.exif_transpose(raw).convert('RGBA' if 'A' in raw.getbands() or raw.info.get('transparency') is not None else 'RGB');w,h=im.size;icc=raw.info.get('icc_profile')
   if min(w,h)<1:raise ValueError('Invalid dimensions')
   if original!=dest.resolve():shutil.copyfile(original,dest)
   variants=[];sizes=sorted(set([n for n in [340,680,1020,1360] if n<w]+[min(w,1360)]))
   for n in sizes:
    out=im.resize((n,round(h*n/w)),Image.Resampling.LANCZOS) if n<w else im
    wp=P/'assets/web'/f'{id}-{sha[:12]}-{n}.webp';wp.parent.mkdir(parents=True,exist_ok=True);out.save(wp,'WEBP',lossless=True,method=6,**({'icc_profile':icc} if icc else {}));variants.append({'src':str(wp.relative_to(P)),'width':n,'height':out.height,'type':'image/webp'})
   manifest[id]={'original':str(dest.relative_to(P)),'preview':variants[0]['src'],'width':w,'height':h,'variants':variants,'originalSHA256':sha};known[id]['imageCard']=manifest[id]['original']
 path.write_text(json.dumps(manifest,ensure_ascii=False,separators=(',',':')))
 if replacements:(P/'data/symbols.json').write_text(json.dumps(symbols,ensure_ascii=False,indent=2))
 return manifest
if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--incoming');parser.add_argument('--mapping');a=parser.parse_args();result=build(a.incoming,a.mapping);print('Image records:',len(result))
