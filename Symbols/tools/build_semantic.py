import json,re,math
from pathlib import Path
import numpy as np
P=Path(__file__).resolve().parents[1]
from prepare_images import build as build_images
incoming=P/'incoming/cards'
build_images(str(incoming) if incoming.exists() and any(x.suffix.lower() in ['.jpg','.jpeg','.png','.webp','.avif'] for x in incoming.iterdir()) else None)
ss=json.loads((P/'data/symbols.json').read_text());cs=json.loads((P/'data/intents.json').read_text())
def tokens(t):
 return [re.sub(r'(иями|ами|ями|ого|его|ому|ему|ость|ости|ение|ения|аться|иться|ать|ять|ить|ются|ется|ами|ям|ах|ях|ов|ев|ый|ий|ой|ая|яя|ое|ее|ые|ие|ом|ем|ам|у|ю|а|я|ы|и|е|о|ь)$','',w) for w in re.findall('[а-яё]+',t.lower().replace('ё','е')) if len(w)>3]
docs=[]
for s in ss:docs.append(tokens(s['fullDescription']+' '+s.get('fullEditedDescription','')+' '+s['name']+' '+ ' '.join(c['queryText']*3 for c in cs if c['id'] in s['subcategories'])))
vocab=sorted(set(w for d in docs for w in d if len(w)>2));vi={w:i for i,w in enumerate(vocab)};A=np.zeros((len(docs),len(vocab)))
for i,doc in enumerate(docs):
 for w in doc:
  if w in vi:A[i,vi[w]]+=1
idf=np.log((1+len(docs))/(1+(A>0).sum(0)))+1
A=np.log1p(A)*idf;A/=np.maximum(np.linalg.norm(A,axis=1,keepdims=True),1e-9)
u,s,v=np.linalg.svd(A,full_matrices=False); k=48;vectors=A@v[:k].T;vectors/=np.linalg.norm(vectors,axis=1,keepdims=True)
model={'version':1,'method':'TF-IDF + latent semantic analysis + evidence-grounded intent ontology','vocabulary':vocab,'idf':np.round(idf,4).tolist(),'projection':np.round(v[:k].T,5).tolist(),'vectors':np.round(vectors,5).tolist(),'ids':[x['id'] for x in ss]}
(P/'data/semantic.json').write_text(json.dumps(model,ensure_ascii=False,separators=(',',':')))
# Browser initially downloads only a compact index; full texts loaded on demand.
index=[]
for s in ss:
 detail={k:s[k] for k in ['fullDescription','purposes','usageMethods','applicationPlaces','limitations','importantNotes','relatedSymbols','source','groupIntroduction','originalFullDescription','fullEditedDescription','editedSections','reviewFlags']}
 (P/'data/details').mkdir(exist_ok=True);(P/f'data/details/{s["id"]}.json').write_text(json.dumps(detail,ensure_ascii=False,separators=(',',':')))
 row={k:v for k,v in s.items() if k not in detail and k!='editedEvidence'}
 paragraphs=list(dict.fromkeys(s['editedEvidence'].values()));row['editorialEvidenceParagraphs']=paragraphs;row['editedEvidenceIndex']={key:paragraphs.index(value) for key,value in s['editedEvidence'].items()}
 index.append(row)
(P/'data/index.json').write_text(json.dumps(index,ensure_ascii=False,separators=(',',':')))
print('LSA model',len(vocab),'terms;',k,'dimensions')
