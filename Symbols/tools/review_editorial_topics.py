"""Separate universal love and business partnership from couple/marriage claims."""
import json,re
from pathlib import Path
P=Path(__file__).resolve().parents[1];ss=json.loads((P/'data/symbols.json').read_text());ts=json.loads((P/'data/intents.json').read_text())
t={'id':'intent-75','category':'Любовь и отношения','label':'Безусловная любовь','sourceRoots':['безусловн','ко всему','милосерд','сострадан'],'sourcePhrases':'безусловн ко всему милосерд сострадан','queryText':'Безусловная любовь любовь ко всему живому миру доброта милосердие','synonyms':'любовь ко всему миру','queryPattern':'безусловн|любов.{0,20}(жив|мир|всем|источ|всему)'}
if not any(x['id']==t['id'] for x in ts):ts.append(t)
by={x['id']:x for x in ts};general={'lemuria-11','lemuria-15','lemuria-25','hyperborea-04','hyperborea-11','hyperborea-14','hyperborea-26','atlantis-07','sirius-20','galactic-05','galactic-07'}
for s in ss:
 if s['id'] in {'hyperborea-14','galactic-05','galactic-07'}:
  s['subcategories']=[x for x in s['subcategories'] if x!='intent-13'];s['intentEvidence'].pop('intent-13',None)
 # A mention of a business partner alone is not evidence of marriage.
 if not re.search('супруг|супруж|брак',s['fullDescription'].lower()):
  s['subcategories']=[x for x in s['subcategories'] if x!='intent-72'];s['intentEvidence'].pop('intent-72',None)
 if s['id'] in general:
  ev=next((p.strip() for p in re.split(r'(?<=[.!?])\s+',s['fullDescription']) if re.search('любов|любв|доброт|милосерд|сострадан',p,re.I)),None);assert ev,s['id'];s['intentEvidence'][t['id']]=ev
  if t['id'] not in s['subcategories']:s['subcategories'].append(t['id'])
 s['features']=list(dict.fromkeys(by[id]['label'] for id in s['subcategories']));s['categories']=list(dict.fromkeys(by[id]['category'] for id in s['subcategories']))
(P/'data/symbols.json').write_text(json.dumps(ss,ensure_ascii=False,indent=2));(P/'data/intents.json').write_text(json.dumps(ts,ensure_ascii=False,indent=2))
