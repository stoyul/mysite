(() => {
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const unique = a => [...new Set(a)];
  const COLORS = {gold:'#dfc889', soft:'#bd9d5c', pink:'#be4d8b'};
  let symbols = [], learning = {}, selectedCategory = 'all', selected = null, construction = false, zoom = 1, rotation = 0, lightMode = 'strength', jitterStep = 0, jitterTimer = null;

  function svgShell(content, extra = '') {
    const rootTransform = `translate(150 150) rotate(${rotation}) scale(${zoom}) translate(-150 -150)`;
    const guide = construction ? `<g class="geo-soft"><circle cx="150" cy="150" r="92"/><path d="M150 24v252M24 150h252M61 61l178 178M239 61 61 239"/></g>` : '';
    return `<svg viewBox="0 0 300 300" role="img" aria-label="Геометрическая схема" ${extra}><g transform="${rootTransform}">${guide}<g class="geo-stroke">${content}</g><circle class="geo-dot geo-origin" cx="150" cy="150" r="2"/></g></svg>`;
  }
  const circ = (x=150,y=150,r=80) => `<circle cx="${x}" cy="${y}" r="${r}"/>`;
  const path = d => `<path d="${d}"/>`;
  const line = (x1,y1,x2,y2) => `<path d="M${x1} ${y1}L${x2} ${y2}"/>`;
  function points(n,r=88,cx=150,cy=150,start=-Math.PI/2){return Array.from({length:n},(_,i)=>[cx+r*Math.cos(start+2*Math.PI*i/n),cy+r*Math.sin(start+2*Math.PI*i/n)]);}
  function polygon(n,r=88){const p=points(n,r);return path('M'+p.map(q=>q.map(v=>v.toFixed(2)).join(' ')).join('L')+'Z');}
  function star(n,step=2,r=91){const p=points(n,r);let i=0,seq=[],seen=new Set();while(!seen.has(i)){seen.add(i);seq.push(p[i]);i=(i+step)%n;}return path('M'+seq.map(q=>q.map(v=>v.toFixed(2)).join(' ')).join('L')+'Z');}
  function rings(count=7){const r=count===7?56:38;let coords=[[0,0]];for(let q=-2;q<=2;q++)for(let t=-2;t<=2;t++){if(Math.max(Math.abs(q),Math.abs(t),Math.abs(q+t))>2||(!q&&!t))continue;const ring=Math.max(Math.abs(q),Math.abs(t),Math.abs(q+t));if(count===7&&ring>1)continue;if(count===13&&ring>1&&!(q===0||t===0||q+t===0))continue;coords.push([q,t]);}return coords.map(([q,t])=>circ(150+r*(q+t*.5),150+r*t*Math.sqrt(3)/2,r)).join('');}
  function fruitPoints(){const r=31,pts=[[0,0]];for(let q=-2;q<=2;q++)for(let t=-2;t<=2;t++){if(Math.max(Math.abs(q),Math.abs(t),Math.abs(q+t))===1||Math.max(Math.abs(q),Math.abs(t),Math.abs(q+t))===2&&(q===0||t===0||q+t===0))pts.push([q,t]);}return pts.map(([q,t])=>[150+r*(q+t*.5),150+r*t*Math.sqrt(3)/2]);}
  function projectedPoly(name){
    const phi=(1+Math.sqrt(5))/2, a=1/phi;
    let v=[];
    if(name.includes('КУБООКТАЭДР')||name.includes('ЭКВИЛИБРИУМ')){for(const i of [0,1,2])for(const s of [-1,1])for(const t of [-1,1]){const p=[0,0,0];p[(i+1)%3]=s;p[(i+2)%3]=t;v.push(p);}}
    else if(name.includes('ТЕТРАЭДР')||name==='ТЕТРАЭДР') v=[[-1,-1,-1],[-1,1,1],[1,-1,1],[1,1,-1]];
    else if(name.includes('ОКТАЭДР'))v=[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
    else if(name.includes('ИКОСАЭДР')){for(const s of [-1,1])for(const t of [-1,1]){v.push([0,s,t*phi],[s,t*phi,0],[t*phi,0,s]);}}
    else if(name.includes('ДОДЕКАЭДР')){for(const x of [-1,1])for(const y of [-1,1])for(const z of [-1,1])v.push([x,y,z]);for(const s of [-1,1])for(const t of [-1,1]){v.push([0,s*a,t*phi],[s*a,t*phi,0],[t*phi,0,s*a]);}}
    else {for(const x of [-1,1])for(const y of [-1,1])for(const z of [-1,1])v.push([x,y,z]);}
    const min=Math.min(...v.map((p,i)=>Math.min(...v.slice(i+1).map(q=>Math.hypot(p[0]-q[0],p[1]-q[1],p[2]-q[2])))).filter(Number.isFinite));
    const project=p=>[150+68*(p[0]*.82-p[1]*.48),150+68*(p[0]*.30+p[1]*.52-p[2]*.82)];
    let out='';v.forEach((p,i)=>v.slice(i+1).forEach((q,j)=>{const k=i+1+j;if(Math.abs(Math.hypot(p[0]-q[0],p[1]-q[1],p[2]-q[2])-min)<.02){const x=project(p),y=project(q);out+=line(...x,...y);}}));
    v.forEach(p=>{const [x,y]=project(p);out+=`<circle class="geo-dot" cx="${x}" cy="${y}" r="2.3"/>`;});return out;
  }
  function tesseract(penta=false){let vv=[];for(let n=0;n<(penta?32:16);n++){const bits=Array.from({length:penta?5:4},(_,i)=>((n>>i)&1)?1:-1);const x=bits[0]+bits[3]*.34+(bits[4]||0)*.19;const y=bits[1]+bits[3]*.18-(bits[2])*.38+(bits[4]||0)*.24;vv.push([150+x*42,150+y*42]);}let out='';for(let i=0;i<vv.length;i++)for(let b=0;b<(penta?5:4);b++){const j=i^(1<<b);if(j>i)out+=line(...vv[i],...vv[j]);}return out;}
  function goldenSpiral(){let d='',a=6,b=Math.log(1.618)/(Math.PI/2);for(let i=0;i<=240;i++){const t=i/240*Math.PI*3;const r=a*Math.exp(b*t);const x=150+r*Math.cos(t),y=150+r*Math.sin(t);d+=(i?'L':'M')+x.toFixed(2)+' '+y.toFixed(2);}return path(d);}
  function fibonacciCurve(){let out='',cx=150,cy=150,r=13,rot=0;for(let i=0;i<8;i++){out+=`<path d="M${cx} ${cy-r} A${r} ${r} 0 0 1 ${cx+r} ${cy}" transform="rotate(${rot} 150 150)"/>`;r*=1.618;rot+=90;}return out;}
  function treeOfLife(){const nodes=[[150,38],[92,77],[208,77],[92,143],[208,143],[150,157],[92,215],[208,215],[150,247],[150,282]];const edges=[[0,1],[0,2],[1,2],[1,3],[2,4],[1,5],[2,5],[3,4],[3,5],[4,5],[3,6],[4,7],[5,6],[5,7],[6,7],[6,8],[7,8],[6,9],[7,9],[8,9]];let o='';edges.forEach(([a,b])=>o+=line(...nodes[a],...nodes[b]));nodes.forEach(([x,y])=>o+=`<circle class="geo-dot" cx="${x}" cy="${y}" r="5"/>`);return o;}
  function contentFor(item){
    const n=item.name.toUpperCase(),cat=item.category;
    if(n==='ТОЧКА')return '<circle class="geo-dot" cx="150" cy="150" r="5"/>';
    if(n==='ЛИНИЯ')return line(45,150,255,150)+`<circle class="geo-dot" cx="45" cy="150" r="3"/><circle class="geo-dot" cx="255" cy="150" r="3"/>`;
    if(n==='КРУГ')return circ(150,150,88)+line(150,150,238,150);
    if(n==='КВАДРАТ'||n.includes('КУБ (ГЕКСАЭДР)'))return n==='КВАДРАТ'?polygon(4,88):projectedPoly(n);
    if(n==='ПРЯМОУГОЛЬНИК')return path('M72 104H228V196H72Z')+line(72,104,228,196);
    if(n==='ПЕНТАГОН')return polygon(5,88);
    if(n==='ГЕКСАГОН')return polygon(6,88);
    if(n==='ГЕПТАГОН')return polygon(7,88);
    if(n==='ОКТАГОН')return polygon(8,88);
    if(n==='ЭННЕАГОН')return polygon(9,88);
    if(n==='ДЕКАГОН')return polygon(10,88);
    if(n==='ПЕНТАГРАММА')return star(5,2,88);
    if(n==='ГЕКСАГРАММА'){const p=points(6,88);return path(`M${p[0][0]} ${p[0][1]}L${p[2][0]} ${p[2][1]}L${p[4][0]} ${p[4][1]}Z`)+path(`M${p[1][0]} ${p[1][1]}L${p[3][0]} ${p[3][1]}L${p[5][0]} ${p[5][1]}Z`);}
    if(n==='ТРИКВЕТР')return path('M150 64C210 53 250 105 221 151C198 187 155 189 128 158C103 130 117 93 150 82C182 72 205 99 195 124C185 148 155 151 141 132C131 118 139 103 151 101')+path('M150 64C90 53 50 105 79 151C102 187 145 189 172 158C197 130 183 93 150 82');
    if(n==='АРХЕТИП ЕДИНСТВА')return circ(150,150,88)+circ(150,150,48);
    if(n==='АРХЕТИП ПОЛЯРНОСТИ'||n==='ИНЬ-ЯН')return circ(150,150,87)+path('M150 63a43.5 43.5 0 0 1 0 87 43.5 43.5 0 0 0 0 87 87 87 0 0 0 0-174Z')+`<circle cx="150" cy="106.5" r="7"/><circle cx="150" cy="193.5" r="7"/>`;
    if(n==='АРХЕТИП БАЛАНСА')return line(82,184,218,116)+circ(150,150,6)+line(103,95,197,205);
    if(n==='АРХЕТИП ПОТОКА'||n==='АРХЕТИП ТРАНСФОРМАЦИИ')return goldenSpiral()+circ(150,150,5);
    if(n==='АРХЕТИП РЕЗОНАНСА')return [22,37,52,67,82].map(r=>circ(150,150,r)).join('');
    if(n==='АРХЕТИП БЕСКОНЕЧНОСТИ')return path('M150 150C115 90 62 97 62 150S115 210 150 150 238 90 238 150 185 210 150 150Z');
    if(n.includes('ВЕЗИКА'))return circ(108,150,76)+circ(192,150,76);
    if(n.includes('СЕМЯ ЖИЗНИ'))return rings(7);
    if(n.includes('ЯЙЦО ЖИЗНИ')){let o=circ(150,150,34);for(let i=0;i<7;i++){const a=i*Math.PI*2/7;o+=circ(150+46*Math.cos(a),150+46*Math.sin(a),34);}return o;}
    if(n.includes('ЦВЕТОК ЖИЗНИ'))return rings(19);
    if(n.includes('ПЛОД ЖИЗНИ'))return fruitPoints().map(([x,y])=>circ(x,y,31)).join('');
    if(n.includes('МЕТАТРОНА')){const p=fruitPoints();let o='';for(let i=0;i<p.length;i++)for(let j=i+1;j<p.length;j++)o+=line(...p[i],...p[j]);return o+p.map(([x,y])=>`<circle class="geo-dot" cx="${x}" cy="${y}" r="2.8"/>`).join('');}
    if(['ТЕТРАЭДР','КУБ (ГЕКСАЭДР)','ОКТАЭДР','ИКОСАЭДР','ДОДЕКАЭДР','КУБООКТАЭДР','ВЕКТОРНЫЙ ЭКВИЛИБРИУМ'].includes(n)||n.includes('ЗВЕЗДЧАТЫЙ ТЕТРАЭДР'))return projectedPoly(n);
    if(n.includes('ТЕССЕРАКТ'))return tesseract(false);
    if(n.includes('ПЕНТЕРАКТ'))return tesseract(true);
    if(n.includes('ГИПЕРСФЕРА'))return circ(150,150,85)+`<ellipse cx="150" cy="150" rx="87" ry="40"/><ellipse cx="150" cy="150" rx="40" ry="87"/>`;
    if(n.includes('СФЕРА'))return circ(150,150,88)+`<ellipse cx="150" cy="150" rx="87" ry="32"/><ellipse cx="150" cy="150" rx="32" ry="87"/>`;
    if(n.includes('ТОР'))return `<ellipse cx="150" cy="150" rx="91" ry="54"/><ellipse cx="150" cy="150" rx="55" ry="25"/><ellipse cx="150" cy="150" rx="73" ry="41"/><ellipse cx="150" cy="150" rx="38" ry="17"/>`;
    if(n.includes('СПИРАЛЬ ФИБОНАЧЧИ'))return fibonacciCurve();
    if(n.includes('ЗОЛОТАЯ СПИРАЛЬ')||n==='СПИРАЛЬ')return goldenSpiral()+circ(150,150,5);
    if(n.includes('ДВОЙНАЯ СПИРАЛЬ')){let a='',b='';for(let i=0;i<=240;i++){const t=i/240*Math.PI*8,r=4+i*.24;const x=150+r*Math.cos(t),y=150+r*Math.sin(t);a+=(i?'L':'M')+x.toFixed(2)+' '+y.toFixed(2);const x2=150+r*Math.cos(t+Math.PI),y2=150+r*Math.sin(t+Math.PI);b+=(i?'L':'M')+x2.toFixed(2)+' '+y2.toFixed(2);}return path(a)+path(b);}
    if(n.includes('НАУТИЛУС'))return circ(150,150,108)+goldenSpiral();
    if(n.includes('СНЕЖИНКА')){let o=circ(150,150,15);for(let i=0;i<6;i++){const a=i*Math.PI/3,x=150+86*Math.cos(a),y=150+86*Math.sin(a),bx=150+52*Math.cos(a),by=150+52*Math.sin(a);o+=line(150,150,x,y);for(const sign of [-1,1]){const aa=a+sign*.72;o+=line(bx,by,bx+26*Math.cos(aa),by+26*Math.sin(aa));}}return o;}
    if(n.includes('СОТЫ')){let o='';for(let y=-2;y<=2;y++)for(let x=-2;x<=2;x++){const cx=150+x*38+(y%2)*19,cy=150+y*33;if(cx>35&&cx<265&&cy>35&&cy<265)o+=path(`M${cx-19} ${cy-11}l19-11 19 11v22l-19 11-19-11z`);}return o;}
    if(n.includes('ФРАКТАЛ')){let o='';const tri=(x,y,s,d)=>{if(d===0){o+=path(`M${x} ${y-s/2}L${x-s*.5} ${y+s*.35}L${x+s*.5} ${y+s*.35}Z`);return;}const z=s/2;tri(x,y-z/2,z,d-1);tri(x-z/2,y+z/2,z,d-1);tri(x+z/2,y+z/2,z,d-1);};tri(150,154,190,4);return o;}
    if(n.includes('ДРЕВО ЖИЗНИ')||n.includes('СРЕДИННЫЙ СТОЛП'))return treeOfLife();
    if(n.includes('МОЛНИЯ ТВОРЕНИЯ')){const o=treeOfLife();return o;}
    if(n.includes('ИНДРЫ')){let o='';for(let i=0;i<6;i++){o+=line(45,65+i*34,255,65+i*34)+line(55+i*36,48,55+i*36,252);}for(let y=0;y<5;y++)for(let x=0;x<5;x++)o+=circ(55+x*36,65+y*34,3);return o;}
    if(n.includes('ИНЬ-ЯН'))return circ(150,150,87)+path('M150 63a43.5 43.5 0 0 1 0 87 43.5 43.5 0 0 0 0 87 87 87 0 0 0 0-174Z')+`<circle cx="150" cy="106.5" r="7"/><circle cx="150" cy="193.5" r="7"/>`;
    if(n.includes('ЦИРКУМПУНКТ'))return circ(150,150,88)+`<circle class="geo-dot" cx="150" cy="150" r="6"/>`;
    if(n.includes('МЕРКАБА'))return star(6,2,90)+path('M150 60 228 195 72 195Z')+path('M150 240 72 105 228 105Z');
    if(n==='СРЕДИННЫЙ СТОЛП'){let o=line(150,55,150,245);for(const y of [72,118,164,210,244])o+=circ(150,y,13);return o;}
    if(n==='МОЛНИЯ ТВОРЕНИЯ'){const p=[[150,40],[92,78],[208,78],[92,143],[208,143],[150,157],[92,215],[208,215],[150,247],[150,280]];let o=path('M150 40L92 78L208 78L92 143L208 143L150 157L92 215L208 215L150 247L150 280');p.forEach(([x,y])=>o+=`<circle class="geo-dot" cx="${x}" cy="${y}" r="4.5"/>`);return o;}
    if(n.includes('СПИРАЛ')||n.includes('ВИХР')){let d='';for(let i=0;i<320;i++){const t=i/320*Math.PI*6,r=4+i*.27;d+=(i?'L':'M')+(150+r*Math.cos(t)).toFixed(2)+' '+(150+r*Math.sin(t)).toFixed(2);}return path(d);}
    if(n.includes('ДЖИТТЕРБАГ'))return projectedPoly(jitterStep===0?'ИКОСАЭДР':jitterStep===1?'ВЕКТОРНЫЙ ЭКВИЛИБРИУМ':'ОКТАЭДР');
    if(n.includes('ЯНТРА'))return circ(150,150,90)+polygon(3,75)+polygon(3,53)+circ(150,150,31)+`<circle class="geo-dot" cx="150" cy="150" r="4"/>`;
    if(n.includes('СЕТЬ')||n.includes('РЕШЕТКА')||n.includes('МАТРИЦА')||n.includes('КРИСТАЛЛ')){let o='';for(let i=0;i<5;i++){o+=line(48,60+i*45,252,60+i*45)+line(60+i*45,48,60+i*45,252);}for(let y=0;y<5;y++)for(let x=0;x<5;x++)o+=circ(60+x*45,60+y*45,3);return o;}
    if(n.includes('РАКОВИНА')||n.includes('НАУТИЛУС'))return goldenSpiral()+circ(150,150,85);
    if(n.includes('ТОРОИД')||n.includes('КОКОН')||n.includes('ВОРОНКА')||n.includes('ПОТОК')||n.includes('ВОЛНА')||n.includes('ПОЛЕ')||n.includes('СТОЛБ')||n.includes('МНОГОМЕРНАЯ'))return circ(150,150,88)+`<ellipse cx="150" cy="150" rx="62" ry="88"/><ellipse cx="150" cy="150" rx="88" ry="58"/>`+path('M62 150C75 75 225 75 238 150S75 225 62 150Z');
    if(n.includes('КРИСТАЛЛ')||n.includes('АЛМАЗ'))return polygon(4,88)+polygon(4,48)+line(62,150,238,150)+line(150,62,150,238);
    // A neutral diagrammatic mark for author-created forms without a supplied construction reference.
    return circ(150,150,84)+polygon(6,72)+circ(150,150,34)+line(64,150,236,150)+line(150,64,150,236);
  }
  function symbolSvg(item, extra=''){return svgShell(contentFor(item),extra);}
  const needsReference = item => item.category==='Янтра'||['Энергетическая структура','Космический архетип','Каббалистическая структура'].includes(item.category)||['ЯЙЦО ЖИЗНИ','Тор','Тороид','Гиперсфера','Пентеракт','Многомерная решетка','Кристаллическая матрица','Фрактальная Вселенная','64-тетраэдрная решетка','Векторная матрица','ВИХРЬ','ДЖИТТЕРБАГ-ТРАНСФОРМАЦИЯ','МЕРКАБА','ЗВЕЗДЧАТЫЙ ТЕТРАЭДР','РАКОВИНА НАУТИЛУСА','ФИБОНАЧЧИ','СНЕЖИНКА','ТРИКВЕТР'].some(x=>item.name.toUpperCase().includes(x.toUpperCase()));
  const verified = item => ['ТОЧКА','ЛИНИЯ','КРУГ','КВАДРАТ','ПРЯМОУГОЛЬНИК','ПЕНТАГОН','ГЕКСАГОН','ГЕПТАГОН','ОКТАГОН','ЭННЕАГОН','ДЕКАГОН','ПЕНТАГРАММА','ГЕКСАГРАММА','ВЕЗИКА ПИСЦИС','СЕМЯ ЖИЗНИ','ЦВЕТОК ЖИЗНИ','ПЛОД ЖИЗНИ','КУБ МЕТАТРОНА','ТЕТРАЭДР','КУБ (ГЕКСАЭДР)','ОКТАЭДР','ИКОСАЭДР','ДОДЕКАЭДР','СФЕРА','ПЧЕЛИНЫЕ СОТЫ','ЗОЛОТАЯ СПИРАЛЬ','КУБООКТАЭДР','ВЕКТОРНЫЙ ЭКВИЛИБРИУМ','ТЕССЕРАКТ','ЦИРКУМПУНКТ'].includes(item.name.toUpperCase())&&!needsReference(item);
  const FORM_LINKS={
    'КРУГ':{parts:[],next:['ВЕЗИКА ПИСЦИС','СЕМЯ ЖИЗНИ'],note:'Две равные окружности могут быть размещены так, чтобы пересечься; повторение окружностей лежит в основе схемы семи кругов.'},
    'ВЕЗИКА ПИСЦИС':{parts:['КРУГ'],next:[],note:'В показанной схеме пересекаются две равные окружности.'},
    'СЕМЯ ЖИЗНИ':{parts:['КРУГ'],next:['ЦВЕТОК ЖИЗНИ'],note:'Фигура собирается повторением равных окружностей вокруг центральной.'},
    'ЦВЕТОК ЖИЗНИ':{parts:['СЕМЯ ЖИЗНИ'],next:['ПЛОД ЖИЗНИ'],note:'В этой версии узор из 19 окружностей включает схему из семи кругов; выделенные центры образуют набор для следующего построения.'},
    'ПЛОД ЖИЗНИ':{parts:['ЦВЕТОК ЖИЗНИ'],next:['КУБ МЕТАТРОНА'],note:'В этой схеме 13 окружностей задают точки, которые соединяются попарно для получения каркаса.'},
    'КУБ МЕТАТРОНА':{parts:['ПЛОД ЖИЗНИ'],next:[],note:'Показанный каркас строится соединением центров 13 окружностей из предыдущей схемы.'}
  };
  function linkedForms(item,kind){const data=FORM_LINKS[item.name.toUpperCase()]||{};return (data[kind]||[]).map(name=>symbols.find(s=>s.name.toUpperCase()===name)).filter(Boolean);}
  const readJournal=()=>{try{return JSON.parse(localStorage.getItem('sakura.notes.v1')||'{}')}catch{return{}}};
  const readHistory=()=>{try{return JSON.parse(localStorage.getItem('sakura.history.v1')||'[]')}catch{return[]}};
  const slugMap={'а':'a','б':'b','в':'v','г':'g','д':'d','е':'e','ё':'yo','ж':'zh','з':'z','и':'i','й':'y','к':'k','л':'l','м':'m','н':'n','о':'o','п':'p','р':'r','с':'s','т':'t','у':'u','ф':'f','х':'kh','ц':'ts','ч':'ch','ш':'sh','щ':'shch','ъ':'','ы':'y','ь':'','э':'e','ю':'yu','я':'ya'};
  const symbolSlug=item=>item.name.toLowerCase().replace(/[а-яё]/g,c=>slugMap[c]??c).replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  function routeToSymbol(item,replace=false){const url=new URL(location.href);url.searchParams.delete('category');url.searchParams.set('symbol',symbolSlug(item));window.history[replace?'replaceState':'pushState']({sakuraSymbol:symbolSlug(item)},'',url);}
  function setCategory(cat,replace=false){selectedCategory=symbols.some(s=>s.category===cat)?cat:'all';document.querySelectorAll('.category-chip').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.category===selectedCategory)));renderGrid();const url=new URL(location.href);url.searchParams.delete('symbol');if(selectedCategory==='all')url.searchParams.delete('category');else url.searchParams.set('category',selectedCategory);window.history[replace?'replaceState':'pushState']({sakuraCategory:selectedCategory},'',url);}
  const shapeInfo={
    'ТОЧКА':{what:'Идеализированное положение без длины, ширины и высоты.',how:'У точки нет измеримых сторон или углов; на схеме она отмечает положение или центр.'},
    'ЛИНИЯ':{what:'Одномерный след, соединяющий точки или задающий направление.',how:'На схеме линия задана двумя концами. Длина и направление зависят от этих точек.'},
    'КРУГ':{what:'Плоская область, ограниченная окружностью. Все точки окружности равноудалены от центра.',how:'В схеме отмечены центр и радиус. Диаметр проходит через центр и равен двум радиусам.'},
    'ВЕЗИКА ПИСЦИС':{what:'Линзообразная общая область двух пересекающихся равных окружностей.',how:'В этой схеме два центра отстоят на один радиус; окружности пересекаются в двух точках.'},
    'СЕМЯ ЖИЗНИ':{what:'Схема из центральной окружности и шести равных окружностей, поставленных вокруг неё.',how:'Всего 7 одинаковых окружностей. Шесть внешних центров расположены на одной окружности вокруг центрального.'},
    'ЦВЕТОК ЖИЗНИ':{what:'Повторяющийся узор из равных пересекающихся окружностей.',how:'В этой версии SVG нарисовано 19 окружностей одинакового радиуса, размещённых в повторяющейся сетке.'},
    'ПЛОД ЖИЗНИ':{what:'В этой схеме показаны центры 13 окружностей, расположенные узором вокруг центральной точки.',how:'13 отмеченных точек соединены отрезками; итоговый набор линий зависит от принятого правила соединения.'},
    'КУБ МЕТАТРОНА':{what:'Графический каркас, построенный на узоре из 13 отмеченных центров.',how:'Здесь все 13 точек соединены попарно. Это конкретная версия каркаса; в других схемах набор рёбер может отличаться.'},
    'ТЕТРАЭДР':{what:'Правильный многогранник с четырьмя треугольными гранями.',how:'4 вершины, 6 рёбер, 4 равносторонние треугольные грани.'},
    'КУБ (ГЕКСАЭДР)':{what:'Правильный многогранник с шестью квадратными гранями.',how:'8 вершин, 12 рёбер и 6 квадратных граней.'},
    'ОКТАЭДР':{what:'Правильный многогранник с восемью треугольными гранями.',how:'6 вершин, 12 рёбер и 8 равносторонних треугольных граней.'},
    'ИКОСАЭДР':{what:'Правильный многогранник с двадцатью треугольными гранями.',how:'12 вершин, 30 рёбер и 20 равносторонних треугольных граней.'},
    'ДОДЕКАЭДР':{what:'Правильный многогранник с двенадцатью пятиугольными гранями.',how:'20 вершин, 30 рёбер и 12 правильных пятиугольных граней.'},
    'КУБООКТАЭДР':{what:'Архимедово тело с треугольными и квадратными гранями.',how:'12 вершин, 24 ребра, 8 равносторонних треугольников и 6 квадратов.'},
    'ВЕКТОРНЫЙ ЭКВИЛИБРИУМ':{what:'Название модели, обычно связываемое с кубооктаэдром в определённой ориентации.',how:'В этом атласе показан каркас кубооктаэдра: 12 вершин и 24 ребра. Исторические и авторские трактовки термина требуют отдельного источника.'},
    'ГЕКСАГОН':{what:'Правильный шестиугольник: 6 равных сторон и 6 вершин.',how:'Внутренний угол равен 120°, осей симметрии — 6. Правильные шестиугольники могут замостить плоскость без зазоров.'},
    'ОКТАГОН':{what:'Правильный восьмиугольник: 8 равных сторон и 8 вершин.',how:'Внутренний угол равен 135°, осей симметрии — 8.'},
    'СФЕРА':{what:'Поверхность в пространстве, каждая точка которой равноудалена от центра.',how:'Схема — условная плоская проекция сферы с линиями широты и долготы; она не передаёт все свойства объёмной поверхности.'},
    'ЗОЛОТАЯ СПИРАЛЬ':{what:'Логарифмическая спираль, у которой радиус увеличивается в отношении золотого сечения за каждый четверть-оборот.',how:'Текущий рисунок — гладкая логарифмическая кривая. Она отличается от приближённой спирали, составленной дугами в квадратах последовательности Фибоначчи.'},
    'ТЕССЕРАКТ':{what:'Четырёхмерный аналог куба, изображённый на плоскости проекцией.',how:'У тессеракта 16 вершин, 32 ребра и 8 кубических ячеек. Плоская схема показывает связи, а не буквальную форму в трёхмерном пространстве.'}
  };
  function simpleWhat(item){const fact=shapeInfo[item.name.toUpperCase()];if(fact)return fact.what;const source=(item.geometry||'').trim().split(/[.!?]/)[0];return source?`В этой карточке ${esc(item.name)} описана так: ${esc(source)}. Название и символический смысл относятся к авторской системе исходного набора.`:`Авторская модель «${esc(item.name)}» из категории «${esc(item.category)}».`}
  function simpleHow(item){const fact=shapeInfo[item.name.toUpperCase()];if(fact)return fact.how;return `${esc(item.geometry||'В исходной карточке нет отдельного описания построения.')} <span class="learning-caveat">Если в карточке не указано точное число элементов, угол или эталон, эти параметры здесь не предполагаются.</span>`}
  function lifeReading(item){const e=learning[item.name.toUpperCase()]||{};if(e.life)return e.life;const words=(item.name+' '+item.principle+' '+item.geometry).toLowerCase();if(/центр|един|опор|собран/.test(words))return 'В личном исследовании эта форма может напомнить о внутренней опоре — точке, относительно которой ты выстраиваешь решения. Это возможная метафора, не универсальное правило.';if(/границ|структур|поряд|устойчив/.test(words))return 'В жизни этот принцип можно рассматривать через границы и договорённости: что помогает отношениям оставаться понятными и устойчивыми?';if(/связ|отнош|пересеч|взаим|сеть/.test(words))return 'В личном исследовании эта форма может напомнить о связи: как отдельные части влияют друг на друга и где сохраняют самостоятельность?';if(/баланс|поляр|против|равновес/.test(words))return 'Эту форму можно использовать как повод замечать напряжение между разными сторонами опыта и искать способ удерживать их в поле внимания.';if(/поток|движ|измен|трансформ|спирал|вихр/.test(words))return 'В личном исследовании форма может напомнить о процессе и перемене: что сейчас развивается, а что помогает тебе сохранять направление?';if(/повтор|матриц|узор|множ|гармон/.test(words))return 'Повторяющиеся элементы могут стать метафорой привычек и ритмов: какие небольшие действия формируют общую картину?';return `В личном исследовании можно оттолкнуться от принципа «${item.principle}» и проверить, где он отзывается именно тебе. Это приглашение к наблюдению, а не абсолютный закон.`}
  function focusMarkup(item){const n=item.name.toUpperCase();const known=['ТОЧКА','ЛИНИЯ','КРУГ','ГЕКСАГОН','ОКТАГОН','ПЕНТАГОН','КВАДРАТ','ВЕЗИКА ПИСЦИС','СЕМЯ ЖИЗНИ','ЦВЕТОК ЖИЗНИ','ПЛОД ЖИЗНИ','КУБ МЕТАТРОНА','ТЕТРАЭДР','КУБ (ГЕКСАЭДР)','ОКТАЭДР','ИКОСАЭДР','ДОДЕКАЭДР','КУБООКТАЭДР','ВЕКТОРНЫЙ ЭКВИЛИБРИУМ','ТЕССЕРАКТ'].includes(n);return `<div class="show-me"><p class="learning-label">ПОКАЖИ МНЕ НА СХЕМЕ</p><div class="show-me-buttons"><button type="button" data-focus-geometry="center">ЦЕНТР</button><button type="button" data-focus-geometry="lines">ЛИНИИ</button><button type="button" data-focus-geometry="points">КЛЮЧЕВЫЕ ТОЧКИ</button><button type="button" data-focus-geometry="all">ВСЯ ФОРМА</button></div><p>${known?'Подсветка помогает рассмотреть элементы, не изменяя их взаимное положение.':'Для этой модели показана общая схема; точные отдельные части требуют исходного чертежа.'}</p></div>`}
  function evidenceMarkup(item){const examples=learning[item.name.toUpperCase()]?.world||[];return examples.length?`<div class="world-gallery">${examples.map(x=>`<article class="world-card"><span class="world-kind">${esc(x.kind||'ПРИМЕР')}</span>${x.image?`<button class="world-image-button" type="button" data-image-view="${esc(x.image)}" data-image-title="${esc(x.title)}" data-image-credit="${esc(x.credit||'')}" aria-label="Увеличить изображение: ${esc(x.title)}"><img src="${esc(x.image)}" alt="${esc(x.alt||x.title)}" loading="lazy"></button>`:''}<h4>${esc(x.title)}</h4><p>${esc(x.text)}</p><a class="source-link" href="${esc(x.source)}" target="_blank" rel="noopener">ОТКРЫТЬ ИСТОЧНИК ↗</a></article>`).join('')}</div>`:'<p class="learning-caveat">Для этой формы пока не добавлены проверенные примеры из природы, архитектуры, искусства, науки или повседневной жизни.</p>'}
  function historyMarkup(item){const e=learning[item.name.toUpperCase()]||{},art=(e.world||[]).filter(x=>x.image);return `<p>${esc(e.history||'В этом выпуске атласа пока нет надёжно подтверждённого исторического свидетельства именно об этой форме. Происхождение не выводится из названия символа.')}</p>${art.length?`<div class="history-credits">${art.map(x=>`<p><b>${esc(x.credit||x.title)}</b><br><a href="${esc(x.source)}" target="_blank" rel="noopener">Запись музейной коллекции ↗</a></p>`).join('')}</div>`:''}`}
  function relationMarkup(item,kind){const forms=linkedForms(item,kind);return forms.length?`<div class="relationship-list">${forms.map(s=>`<button class="related-pill" type="button" data-related="${s.id}">${esc(s.name)} ↗</button>`).join('')}</div>`:'<p class="learning-caveat">В этой версии нет отдельной подтверждённой связи для этой формы.</p>'}
  function sourceMarkup(item){const rows=learning[item.name.toUpperCase()]?.sources||[];return `<details class="learning-fold sources-fold"><summary>ИСТОЧНИКИ И АТРИБУЦИЯ</summary>${rows.length?`<ul class="source-list">${rows.map(x=>`<li><a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.label)}</a><span>${esc(x.name)}</span></li>`).join('')}</ul>`:'<p>Для дополнительных исторических или научных утверждений в этой карточке источники пока не добавлены. Авторские поля сохранены из таблицы «Карточки геометрия.xlsx».</p>'}</details>`}
  function renderHistory(){const rows=readHistory();$('atlas-history').hidden=!rows.length;$('draw-history').innerHTML=rows.slice(0,12).map(r=>{const item=symbols.find(s=>s.id===r.id);if(!item)return'';const date=new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',year:'numeric'}).format(new Date(r.date));return `<button class="history-card" type="button" data-history-id="${item.id}" data-history-question="${esc(r.question||'')}"><span>${date} · ${esc(item.category)}</span><b>${esc(item.name)}</b><small>${esc(r.question||item.keyQuestion)}</small><i>ИССЛЕДОВАТЬ ↗</i></button>`;}).join('');document.querySelectorAll('[data-history-id]').forEach(b=>b.onclick=()=>openSymbol(symbols.find(s=>s.id===Number(b.dataset.historyId)),b.dataset.historyQuestion));}
  function renderCategories(){
    const cats=unique(symbols.map(s=>s.category));
    $('categories').innerHTML=[['all',`Все формы · ${symbols.length}`],...cats.map(c=>[c,c])].map(([v,t])=>`<button class="category-chip" type="button" data-category="${esc(v)}" aria-pressed="${v===selectedCategory}">${esc(t)}</button>`).join('');
    $('draw-category').insertAdjacentHTML('beforeend',cats.map(c=>`<option value="${esc(c)}">${esc(c)} · ${symbols.filter(s=>s.category===c).length} форм</option>`).join(''));
  }
  function filtered(){const q=$('search').value.trim().toLowerCase();return symbols.filter(s=>(selectedCategory==='all'||s.category===selectedCategory)&&(!q||`${s.name} ${s.category} ${s.principle}`.toLowerCase().includes(q)));}
  function renderGrid(){const list=filtered();$('result-count').textContent=`${list.length} / 84`;$('symbol-grid').innerHTML=list.map(s=>`<button class="symbol-card" type="button" data-id="${s.id}" aria-label="Исследовать ${esc(s.name)}"><span class="mini-figure">${symbolSvg(s)}</span><span class="card-category">${esc(s.category)}</span><h3>${esc(s.name)}</h3><span class="card-principle">${esc(s.principle)}</span><span class="card-open" aria-hidden="true">↗</span></button>`).join('');}
  function block(title,content){if(/^(06|07|08|09) \//.test(title))return `<details class="dialog-block learning-fold"><summary>${title}</summary><div class="fold-content">${content}</div></details>`;return `<section class="dialog-block"><h3>${title}</h3>${content}</section>`;}
  function openSymbol(item,question='',replaceRoute=false){
    if(!item)return;selected=item;construction=false;zoom=1;rotation=0;lightMode='strength';
    const uncertainty=needsReference(item),e=learning[item.name.toUpperCase()]||{};
    const lists=xs=>xs?.length?`<ul class="point-list">${xs.map(v=>`<li>${esc(v)}</li>`).join('')}</ul>`:'<p>В исходной карточке поле не заполнено.</p>';
    const components=FORM_LINKS[item.name.toUpperCase()]?.parts||[];
    $('dialog-content').innerHTML=`<div class="dialog-inner"><p class="detail-order">01 / СИМВОЛ</p><div class="dialog-hero"><div class="big-geometry is-live" id="big-geometry">${symbolSvg(item)}</div><div><span class="dialog-kicker">${esc(item.category)}</span><h2>${esc(item.name)}</h2><p>${uncertainty?'Схематическая визуализация · точный эталон требует уточнения':'Векторная схема · масштабируется без потери чёткости'}</p><span class="status-tag">${verified(item)?'МАТЕМАТИЧЕСКИ ОПРЕДЕЛИМАЯ ФОРМА':'СИМВОЛИЧЕСКАЯ / СХЕМАТИЧЕСКАЯ МОДЕЛЬ'}</span></div></div>
      <div class="viewer-tools"><button id="show-construction" type="button" aria-pressed="false">ПОСТРОЕНИЕ</button><button id="rotate-geometry" type="button">ПОВЕРНУТЬ ↻</button><button id="replay-geometry" type="button">ПОВТОРИТЬ ПОЯВЛЕНИЕ</button><span class="viewer-zoom"><button id="zoom-out" aria-label="Уменьшить">−</button><button id="zoom-reset">100%</button><button id="zoom-in" aria-label="Увеличить">＋</button></span></div>
      ${block('02 / ЧТО ЭТО?',`<p>${simpleWhat(item)}</p>`)}
      ${block('03 / КАК УСТРОЕНО?',`<p>${simpleHow(item)}</p><p class="geometry-source">ГЕОМЕТРИЯ В ИСХОДНОЙ КАРТОЧКЕ · ${esc(item.geometry)}</p>${uncertainty?'<p class="uncertain-note">В исходных данных нет эталона, достаточного для точной реконструкции. Показанная схема обозначена как условная.</p>':''}${focusMarkup(item)}`)}
      ${block('04 / ПРИНЦИП',`<p class="big-principle">${esc(item.principle)}</p>`)}
      ${block('05 / ЧТО ЭТО МОЖЕТ ОЗНАЧАТЬ ДЛЯ ЖИЗНИ?',`<p>${esc(lifeReading(item))}</p><p class="learning-caveat">Символическая трактовка — способ для самоисследования; это не научный закон, диагноз или предсказание.</p>`)}
      ${block('06 / УВИДЕТЬ В МИРЕ',`<p class="learning-intro">Только конкретные примеры, связь которых с формой можно проверить.</p>${evidenceMarkup(item)}`)}
      ${block('07 / СЛЕД В ИСТОРИИ',historyMarkup(item))}
      ${block('08 / ИЗ ЧЕГО СОЗДАНА ЭТА ФОРМА?',`${components.length?`<p>${esc(FORM_LINKS[item.name.toUpperCase()]?.note||'')}</p>${relationMarkup(item,'parts')}`:'<p>В исходной таблице нет подтверждённого разложения этой формы на другие фигуры.</p>'}`)}
      ${block('09 / ИЗ ЭТОЙ ФОРМЫ МОЖЕТ РОДИТЬСЯ…',`${FORM_LINKS[item.name.toUpperCase()]?.note?`<p>${esc(FORM_LINKS[item.name.toUpperCase()].note)}</p>`:''}${relationMarkup(item,'next')}`)}
      ${block('10 / СИЛА И ТЕНЬ',`<div class="light-shadow-tabs"><button type="button" data-tone="strength" aria-pressed="true">СИЛА</button><button type="button" data-tone="shadow" aria-pressed="false">ТЕНЬ</button></div><div id="tone-content">${lists(item.strengths)}</div>`)}
      ${block('11 / КЛЮЧЕВАЯ ЗАДАЧА',`<p>${esc(item.keyTask)}</p>`)}
      <div class="detail-columns">${block('12 / АРХЕТИП',`<p>${esc(item.archetype)}</p>`)}${block('13 / ЧТО ЭТА КАРТА МОЖЕТ ПОДСВЕТИТЬ?',`<p>${esc(item.diagnostic)}</p><p class="learning-caveat">Авторская интерпретация для самонаблюдения; это не диагноз и не предсказание.</p>`)}</div>
      ${block('14 / КЛЮЧЕВОЙ ВОПРОС',`<p class="big-principle">${esc(item.keyQuestion)}</p>`)}
      ${block('15 / МОЁ ОСОЗНАНИЕ',`<div class="save-reflection"><textarea id="reflection-note" maxlength="2000" placeholder="Запиши то, что заметила — заметка хранится только в этом браузере.">${esc(readJournal()[item.id]?.note||'')}</textarea><button type="button" id="save-reflection">СОХРАНИТЬ В ЭТОМ БРАУЗЕРЕ</button><span class="saved-message" id="saved-message">${readJournal()[item.id]?.note?'СОХРАНЕНО':''}</span></div>`)}
      ${block('ИСТОЧНИКИ',sourceMarkup(item))}</div>`;
    const dialog=$('symbol-dialog');if(!dialog.open)dialog.showModal();routeToSymbol(item,replaceRoute);
    const box=$('big-geometry');requestAnimationFrame(()=>{box.classList.add('replaying');setTimeout(()=>box?.classList.remove('replaying'),2300);});
    $('show-construction').onclick=e=>{construction=!construction;e.currentTarget.setAttribute('aria-pressed',String(construction));updateGeometry();};
    $('rotate-geometry').onclick=()=>{rotation=(rotation+45)%360;updateGeometry();};$('zoom-in').onclick=()=>{zoom=Math.min(zoom+.15,1.75);updateGeometry();};$('zoom-out').onclick=()=>{zoom=Math.max(zoom-.15,.7);updateGeometry();};$('zoom-reset').onclick=()=>{zoom=1;rotation=0;updateGeometry();};
    $('replay-geometry').onclick=()=>{const g=$('big-geometry');g.classList.remove('replaying');void g.offsetWidth;g.classList.add('replaying');setTimeout(()=>g.classList.remove('replaying'),2400);};
    document.querySelectorAll('[data-focus-geometry]').forEach(b=>b.onclick=()=>{$('big-geometry').classList.remove('focus-center','focus-lines','focus-points','focus-all');$('big-geometry').classList.add('focus-'+b.dataset.focusGeometry);});
    document.querySelectorAll('[data-tone]').forEach(b=>b.onclick=()=>{lightMode=b.dataset.tone;document.querySelectorAll('[data-tone]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));$('tone-content').innerHTML=lists(lightMode==='strength'?item.strengths:item.shadow);});
    document.querySelectorAll('[data-related]').forEach(b=>b.onclick=()=>openSymbol(symbols.find(x=>x.id===Number(b.dataset.related)),question));
    $('save-reflection').onclick=()=>{const j=readJournal();j[item.id]={id:item.id,name:item.name,category:item.category,question,note:$('reflection-note').value.trim(),updatedAt:new Date().toISOString()};localStorage.setItem('sakura.notes.v1',JSON.stringify(j));$('saved-message').textContent='СОХРАНЕНО';};
    document.querySelectorAll('[data-image-view]').forEach(b=>b.onclick=()=>{const v=$('artifact-viewer');$('artifact-image').src=b.dataset.imageView;$('artifact-image').alt=b.dataset.imageTitle;$('artifact-title').textContent=b.dataset.imageTitle;$('artifact-credit').textContent=b.dataset.imageCredit;v.showModal();});
  }
  function updateGeometry(){if(!selected)return;const g=$('big-geometry');if(g){g.innerHTML=symbolSvg(selected);if(construction)g.classList.add('has-construction');else g.classList.remove('has-construction');}}
  $('dialog-close').addEventListener('click',()=>$('symbol-dialog').close());$('symbol-dialog').addEventListener('close',()=>{if(jitterTimer){clearInterval(jitterTimer);jitterTimer=null;}const url=new URL(location.href);if(url.searchParams.has('symbol')){url.searchParams.delete('symbol');window.history.replaceState({},'',url);}});$('symbol-dialog').addEventListener('click',e=>{if(e.target===$('symbol-dialog'))$('symbol-dialog').close();});
  $('categories').addEventListener('click',e=>{const b=e.target.closest('[data-category]');if(!b)return;setCategory(b.dataset.category);});
  $('symbol-grid').addEventListener('click',e=>{const card=e.target.closest('[data-id]');if(card)openSymbol(symbols.find(s=>s.id===Number(card.dataset.id)));});$('search').addEventListener('input',renderGrid);
  document.querySelectorAll('[data-scroll="draw"]').forEach(b=>b.addEventListener('click',()=>document.getElementById('draw').scrollIntoView({behavior:'smooth'})));
  $('draw-symbol').addEventListener('click',()=>{const cat=$('draw-category').value;const pool=symbols.filter(s=>cat==='all'||s.category===cat);if(!pool.length)return;const chosen=pool[Math.floor(Math.random()*pool.length)];const question=$('draw-question').value.trim();const history=readHistory();history.unshift({id:chosen.id,date:new Date().toISOString(),question});localStorage.setItem('sakura.history.v1',JSON.stringify(history.slice(0,40)));const viz=$('draw-visual');viz.classList.remove('is-animating');void viz.offsetWidth;viz.classList.add('is-animating');$('draw-symbol').disabled=true;setTimeout(()=>{viz.classList.remove('is-animating');$('draw-symbol').disabled=false;$('draw-result').hidden=false;$('draw-result').innerHTML=`<div class="draw-result-figure">${symbolSvg(chosen)}</div><div><span class="dialog-kicker">ТВОЙ СИМВОЛ · ${esc(chosen.category)}</span><h3>${esc(chosen.name)}</h3><p><b>ЕГО ПРИНЦИП</b> · ${esc(chosen.principle)}</p><p><b>ЕСЛИ ЭТОТ СИМВОЛ ПРИШЁЛ СЕЙЧАС</b><br>${esc(chosen.diagnostic)}</p><p><b>ОБРАТИ ВНИМАНИЕ</b><br>${esc(chosen.keyQuestion)}</p><button type="button" class="gold-button" id="inspect-drawn">ИССЛЕДОВАТЬ СИМВОЛ <span>↗</span></button></div>`;$('inspect-drawn').onclick=()=>openSymbol(chosen,question);renderHistory();$('draw-result').scrollIntoView({behavior:'smooth',block:'center'});},950);});
  const primitives=[
    {title:'ТОЧКА',desc:'Положение без длины, ширины и высоты. В построениях она задаёт исходный центр или вершину.',terms:['точк','центр','вершин']},
    {title:'ЛИНИЯ',desc:'Связь между точками. Она задаёт направление, границу и отношения между элементами.',terms:['лини','отрез','ребр','ось','связ']},
    {title:'ОКРУЖНОСТЬ',desc:'Множество точек на равном расстоянии от центра. Круг включает внутреннюю область.',terms:['окружност','круг','радиус','сфера']},
    {title:'ТРЕУГОЛЬНИК',desc:'Многоугольник с тремя сторонами; повторение треугольников лежит в основе некоторых звёздчатых и янтрических схем.',terms:['треугольник','тетраэдр']},
    {title:'МНОГОУГОЛЬНИК',desc:'Замкнутая ломаная из прямых сторон. Регулярность задаётся равенством сторон и углов.',terms:['многоугольник','пятиугольник','шестиугольник','квадрат']},
    {title:'СПИРАЛЬ',desc:'Кривая, которая вращается вокруг центра и меняет расстояние до него. Разные спирали имеют разные математические законы.',terms:['спирал','виток']}
  ];
  function showPrimitive(p){const matches=symbols.filter(s=>p.terms.some(t=>(s.name+' '+s.geometry).toLowerCase().includes(t))).slice(0,12);$('primitive-detail').innerHTML=`<p class="eyebrow">БАЗОВЫЙ ЭЛЕМЕНТ</p><h3>${esc(p.title)}</h3><p>${esc(p.desc)}</p><p>Встречается в ${matches.length} формах коллекции:</p><div class="related-row">${matches.map(s=>`<button class="related-pill" data-primitive-id="${s.id}">${esc(s.name)} ↗</button>`).join('')||'<span>Связи по описанию не указаны.</span>'}</div>`;document.querySelectorAll('[data-primitive-id]').forEach(b=>b.onclick=()=>openSymbol(symbols.find(s=>s.id===Number(b.dataset.primitiveId))));}
  $('primitive-list').innerHTML=primitives.map((p,i)=>`<button class="primitive-button" type="button" data-primitive="${i}" aria-pressed="${i===0}"><span>${['·','—','○','△','⬡','↝'][i]}</span>${p.title}</button>`).join('');$('primitive-list').addEventListener('click',e=>{const b=e.target.closest('[data-primitive]');if(!b)return;document.querySelectorAll('.primitive-button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));showPrimitive(primitives[Number(b.dataset.primitive)]);});
  const journey=[
    {name:'Точка',symbol:'ТОЧКА',desc:'Исходное положение задаёт центр и точку отсчёта.'},
    {name:'Связь',symbol:'ЛИНИЯ',desc:'Две точки, соединённые линией, задают направление и расстояние.'},
    {name:'Окружность',symbol:'КРУГ',desc:'Равный радиус вокруг центра создаёт окружность.'},
    {name:'Многоугольник',symbol:'КВАДРАТ',desc:'Отрезки замыкаются в границу; симметрия зависит от числа сторон и углов.'},
    {name:'Пересечение',symbol:'ВЕЗИКА ПИСЦИС',desc:'Две равные окружности пересекаются и задают общую область.'},
    {name:'Повторение',symbol:'СЕМЯ ЖИЗНИ',desc:'Копии окружности размещаются относительно выбранного центра.'},
    {name:'Матрица',symbol:'ЦВЕТОК ЖИЗНИ',desc:'Повтор и перекрытие образуют регулярный узор окружностей.'},
    {name:'Пространство',symbol:'ТЕССЕРАКТ',desc:'Проекция показывает связи вершин четырёхмерного гиперкуба в плоскости.'}
  ];
  let journeyIndex=0;
  function renderJourney(){const step=journey[journeyIndex],item=symbols.find(s=>s.name===step.symbol)||{name:step.symbol,category:'Путь формы'};$('journey-figure').innerHTML=symbolSvg(item);$('journey-step').textContent=`${String(journeyIndex+1).padStart(2,'0')} / ${String(journey.length).padStart(2,'0')}`;$('journey-title').textContent=step.name;$('journey-description').textContent=step.desc;$('journey-progress').innerHTML=journey.map((_,i)=>`<button type="button" aria-label="Шаг ${i+1}" aria-current="${i===journeyIndex?'step':'false'}" data-step="${i}"></button>`).join('');}
  $('journey-prev').onclick=()=>{journeyIndex=(journeyIndex+journey.length-1)%journey.length;renderJourney();};$('journey-next').onclick=()=>{journeyIndex=(journeyIndex+1)%journey.length;renderJourney();};$('journey-progress').addEventListener('click',e=>{const b=e.target.closest('[data-step]');if(b){journeyIndex=Number(b.dataset.step);renderJourney();}});
  async function init(){try{const [res,edu]=await Promise.all([fetch('./symbols.json'),fetch('./education.json')]);symbols=await res.json();learning=await edu.json();if(symbols.length!==84)throw new Error('Ожидалось 84 символа');renderCategories();const params=new URLSearchParams(location.search);if(params.has('category'))selectedCategory=symbols.some(s=>s.category===params.get('category'))?params.get('category'):'all';document.querySelectorAll('.category-chip').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.category===selectedCategory)));renderGrid();showPrimitive(primitives[0]);renderJourney();renderHistory();$('hero-mark').innerHTML=symbolSvg(symbols.find(s=>s.name==='ЦВЕТОК ЖИЗНИ')||symbols[0]);const slug=params.get('symbol');if(slug){const item=symbols.find(s=>symbolSlug(s)===slug);if(item)openSymbol(item,'',true);}}catch(e){document.querySelector('.library').insertAdjacentHTML('beforeend','<p class="uncertain-note">Не удалось загрузить библиотеку. Обнови страницу позднее.</p>');}}
  window.addEventListener('popstate',()=>{const params=new URLSearchParams(location.search);const slug=params.get('symbol'),item=slug&&symbols.find(s=>symbolSlug(s)===slug);if(item){if(!$('symbol-dialog').open)openSymbol(item,'',true);else if(selected?.id!==item.id)openSymbol(item,'',true);}else if($('symbol-dialog').open)$('symbol-dialog').close();const cat=params.get('category');if(cat&&symbols.some(s=>s.category===cat))setCategory(cat,true);});
  $('artifact-close').addEventListener('click',()=>$('artifact-viewer').close());$('artifact-viewer').addEventListener('click',e=>{if(e.target===$('artifact-viewer'))$('artifact-viewer').close();});
  init();
})();
