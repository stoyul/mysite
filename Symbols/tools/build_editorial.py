import json,re,hashlib
from pathlib import Path
P=Path(__file__).resolve().parents[1]
symbols=json.loads((P/'data/symbols.json').read_text());intents=json.loads((P/'data/intents.json').read_text())
drafts={}
for file in (P/'content').glob('edited-*.txt'):
 text=file.read_text(); starts=list(re.finditer(r'^([a-z]+-\d{2})\|',text,re.M))
 for n,m in enumerate(starts):drafts[m[1]]=text[m.end():starts[n+1].start() if n+1<len(starts) else len(text)].strip()
assert set(drafts)=={s['id'] for s in symbols}
# Complete paragraphs are assigned once. No paragraph is repeated in the detail UI.
usage={'lemuria-02':[2],'lemuria-05':[2],'lemuria-06':[3],'lemuria-30':[3],'hyperborea-17':[2],'atlantis-01':[1],'atlantis-06':[2],'atlantis-29':[1,2],'atlantis-30':[3],'sirius-03':[2],'sirius-22':[2],'sirius-25':[2],'sirius-30':[3],'galactic-01':[3],'galactic-03':[2]}
notes={'lemuria-06':[2],'lemuria-13':[3],'lemuria-30':[1],'hyperborea-15':[2],'hyperborea-21':[3],'hyperborea-28':[3],'atlantis-20':[2],'atlantis-21':[3],'atlantis-28':[2],'sirius-16':[2],'sirius-19':[1],'sirius-22':[3],'sirius-26':[3],'sirius-30':[1],'galactic-05':[3],'galactic-06':[3]}
when={'sirius-07':[1],'sirius-08':[1],'sirius-12':[1],'sirius-29':[1],'atlantis-26':[1]}
flags=[('lemuria-03','порвать стиль','Неясный фрагмент не получил новой трактовки; смысл патологических связей сохранён.'),('hyperborea-05','уравновешиванию разобчённости','Сверено с карточкой: разобщённость.'),('hyperborea-20','надуманные из-за других мм какие-то упрямства','Не конкретизирована причина упрямства.'),('hyperborea-22','устранению жалости и бессердечности','Сохранены оба значения; требуется уточнение трактовки жалости.'),('hyperborea-27','устранение желания, разврата','Не определён объект отдельного слова «желания».'),('hyperborea-29','когда на себя стягивают энергию','Направление энергетической связи не уточнялось.'),('atlantis-01','ускоренность эмоций','Неясный термин вынесен на проверку.'),('sirius-15','реградная Венера','Контекст времени записи не представлен как текущее условие применения.')]
flagmap={}
for id,phrase,note in flags:flagmap.setdefault(id,[]).append({'fragment':phrase,'note':note})
def words(t):return {re.sub(r'(иями|ами|ого|ение|ения|ости|ать|ять|ить|ый|ий|ой|ая|ое|ые|ие|ов|ам|ах|у|ю|а|я|ы|и|е|о|ь)$','',w) for w in re.findall(r'[а-яё]{4,}',t.lower())}
audit=[]
for s in symbols:
 id=s['id']; original=s['fullDescription'];text=drafts[id];pars=[p.strip() for p in text.split('\n') if p.strip()];assert pars and len(pars)==len(set(pars)),id
 groups={'purpose':[pars[0]],'features':[],'when':[],'usage':[],'notes':[]}
 for n,p in enumerate(pars[1:],1):
  key='usage' if n in usage.get(id,[]) else 'notes' if n in notes.get(id,[]) else 'when' if n in when.get(id,[]) else 'features';groups[key].append(p)
 titles={'purpose':'Назначение','features':'Особенности','when':'Когда можно использовать','usage':'Способ применения','notes':'Важные нюансы'}
 s['originalFullDescription']=original;s['fullEditedDescription']='\n\n'.join(pars);s['editedSections']=[{'key':k,'title':titles[k],'paragraphs':v} for k,v in groups.items() if v];s['shortDescription']=pars[0];s['reviewFlags']=flagmap.get(id,[])
 s['editedEvidence']={}
 for key,e in s['intentEvidence'].items():
  ts=words(e);scored=[(len(ts&words(p)),len(ts&words(p))/max(1,len(words(p))),p) for p in pars];s['editedEvidence'][key]=max(scored,key=lambda x:(x[0],x[1]))[2]
 # Original wording retains all rare terms; edited wording adds clear phrases for semantic retrieval.
 s['searchSemanticText']=original+'\n'+s['fullEditedDescription']+'\n'+' '.join(s['features'])
 audit.append({'id':id,'originalSHA256':hashlib.sha256(original.encode()).hexdigest(),'editedSHA256':hashlib.sha256(s['fullEditedDescription'].encode()).hexdigest(),'sourceCharacters':len(original),'editedCharacters':len(text),'paragraphs':len(pars),'reviewFlags':s['reviewFlags']})
(P/'data/symbols.json').write_text(json.dumps(symbols,ensure_ascii=False,indent=2));(P/'data/editorial-audit.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2))
print('Edited',len(symbols),'descriptions;',len(flags),'review items')
