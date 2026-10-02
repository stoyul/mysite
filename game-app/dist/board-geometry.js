let cellVisuals={};
/* Одни геометрические данные управляют сектором, подсветкой и фишкой. */
const point=(r,a)=>[500+r*Math.cos(a),500+r*Math.sin(a)];
function sectorPath(start,end){const a=point(484,start),b=point(484,end),c=point(318,end),d=point(318,start);return `M ${a} A 484 484 0 0 1 ${b} L ${c} A 318 318 0 0 0 ${d} Z`}
const boardGeometry=levelRoutes.map((route,level)=>({width:1000,height:1000,cells:route.map((cell,i)=>{const angle=-Math.PI/2+i*2*Math.PI/route.length,half=Math.PI/route.length-.008,[x,y]=point(400,angle);Object.assign(cell,{x:x/10,y:y/10,width:14,height:17,shape:'sector',path:sectorPath(angle-half,angle+half),level,index:i,nextId:route[(i+1)%route.length].id,reward:cell.type==='energy'?{energy:1}:null});return [x,y,140,170]})}));
function cellArt(cell,count){
 const visual=cellVisuals[cell.type];if(!visual)return '';
 const x=cell.x*10,y=cell.y*10,base=visual.base||cell.type,size=visual.displaySize||92;
 const periodic=['portal','ocean','energy','insight','archetype','key'].includes(base);
 return `<g class="cell-art-mask" clip-path="url(#clip-${cell.id})"><g class="cell-art-motion ${periodic?'periodic':''}" data-art-type="${base}" style="transform-origin:${x}px ${y}px;--cell-period:${count*3}s;--cell-delay:${cell.index*3}s;--cell-accent:${visual.accent||'#cda258'}"><image class="cell-illustration" href="${escapeHtml(visual.file)}" x="${x-size/2}" y="${y-size/2}" width="${size}" height="${size}" preserveAspectRatio="xMidYMid meet"/></g></g>`;
}
makeBoard=function(){
 boardLevelRendered=game.level;
 const route=routeCells(),board=ge('board');board.style.aspectRatio='1';board.dataset.world=game.level+1;
 ge('board-cells').innerHTML=`<svg class="circle-cells" viewBox="0 0 1000 1000" aria-label="Путь уровня ${game.level+1}"><defs>${route.map(c=>`<clipPath id="clip-${c.id}"><path d="${c.path}"/></clipPath>`).join('')}</defs>${route.map(c=>`<g class="cell-hit" data-id="${c.id}" data-position="${c.index}" data-type="${c.type}" role="button" tabindex="0" aria-label="${escapeHtml(c.name)}"><title>${escapeHtml(c.name)}</title><path class="cell-surface" d="${c.path}"/>${cellArt(c,route.length)}<path class="cell-outline" d="${c.path}"/></g>`).join('')}</svg>`;
 ge('board-cells').querySelectorAll('[role=button]').forEach(b=>{b.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();b.dispatchEvent(new MouseEvent('click',{bubbles:true}))}}});
};
boardLevelRendered=-1;

fetch('./cell-visuals.json').then(r=>r.json()).then(data=>{cellVisuals=data.types;boardLevelRendered=-1;renderGame()}).catch(()=>{});
