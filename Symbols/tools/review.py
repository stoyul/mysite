from pathlib import Path
import json
P=Path(__file__).resolve().parents[1];ss=json.loads((P/'data/symbols.json').read_text());cs=json.loads((P/'data/intents.json').read_text())
# Human-reviewed thematic membership, based on the complete descriptions above.
review={
'lemuria':['1 2 3 4 8 10 38','34 39 40 48','6 7 31 35 41 42','35 37','4 13 22 26 33 34','20 21 10','19 20 22 24 29','22 23 24 37','7 15 34 36 39','19 23 26 29 34 39','19 24 44','26 29 30 39','16 17 21','5 8 12 13 15 17 41','8 24 33 39','20 21 26 30','7 19 23 30 33 39 47','12 13','35','20 21 22','1 4 6 26','39 40','10 22 29 39 43','8 10 11 26 34 42','13 21 26','1 2 6 8 11 36','1 2 4 8 9 10 34','22 24 44','13 17 24 25','38 39 40'],
'hyperborea':['21 34 39','9 19 35 36','10 26 42','1 2 13 21 25 36','21 22 35 37','21 23 24 34 39','19 24 25 35 36','13 21','21 22 26 34 44','18 26 35 40','9 13 19 25 39 41','21 36 39 40 42','21 22 24 37','1 5 13 21','20 21 23 24','12 13 17 30','19 21 24 26','12 21 22 25','1 2 10 22','21 22 25','16 18 26','10 11 36 37 46','4 5 19 30','1 2 23 31 34','20 21 23','13 19 21 42','1 2 5 11 36','23 26 28 30','34 39 40','11 36 39'],
'atlantis':['22 34 39','24 29 30','10 35','10 20 21','19 44','13 17','13 19 20 24','7 32 35','18 35','1 2','21','12 13 24','35','26','1 5 26','11 39','21 26','9 10 11 21 32 34','22 24 26 27','20 21 22 25','16 23 22','21 22','4 5 19 34','21 26','9 10 19 21 42','10 25 29 32','21 22','22 28 31','39 40 48','6 11 42'],
'sirius':['21 29 30 39','35','26 27','30 39','22 24 37','7 32 45','20','10 32','5 13 41','12 13','30 32 33','19 20','29 30','24','13 14 30','21','9 21 26 39','16 19 29','1','13 39','4 8 41 49','4 7','38','32 33','34 37','32 47','32 34 38 40','30 46 47','22 39 43','39 40'],
'galactic':['25 29 30','15 25 41','19 20 29 38','10 32','13 39','19 29 50','13 25 29 39','21 22','12 13','20 22 44','9 10 15 19 23','35 36']}
for s in ss:
 slug,n=s['id'].rsplit('-',1); wanted={f'intent-{int(i):02d}' for i in review[slug][int(n)-1].split()}; s['intentEvidence']={k:v for k,v in s['intentEvidence'].items() if k in wanted}
 s['subcategories']=list(s['intentEvidence']);s['categories']=list(dict.fromkeys(c['category'] for c in cs if c['id'] in s['intentEvidence']));s['features']=[c['label'] for c in cs if c['id'] in s['intentEvidence']];s['keywords']=s['features']
# Explicitly reviewed expressions whose transcript wording differs from the root vocabulary.
for sym in ss:
 overrides={'lemuria-27':{'intent-09':'индивидуаль'},'atlantis-18':{'intent-09':'индивидуаль'},'galactic-11':{'intent-09':'раскрытия себя','intent-10':'сомнения'},'sirius-19':{'intent-01':'денежный канал'}}.get(sym['id'],{})
 for intent,phrase in overrides.items():
  sentences=__import__('re').split(r'(?<=[.!?])\s+',sym['fullDescription'])
  evidence=next(x.strip() for x in sentences if phrase in x)
  sym['intentEvidence'][intent]=evidence
 sym['subcategories']=list(sym['intentEvidence']);sym['categories']=list(dict.fromkeys(c['category'] for c in cs if c['id'] in sym['intentEvidence']));sym['features']=[c['label'] for c in cs if c['id'] in sym['intentEvidence']];sym['keywords']=sym['features']
for s in ss:s['relatedSymbols']=[t['id'] for t in sorted(ss,key=lambda t:len(set(t['subcategories'])&set(s['subcategories'])),reverse=True) if t['id']!=s['id'] and len(set(t['subcategories'])&set(s['subcategories']))>=2][:4]
(P/'data/symbols.json').write_text(json.dumps(ss,ensure_ascii=False,separators=(',',':')))
# Search model does not require an external API or transmit personal intentions.
