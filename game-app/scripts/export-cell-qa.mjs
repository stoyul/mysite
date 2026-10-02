// Export the actual game SVG, not an invented board mockup.
import fs from 'node:fs';import path from 'node:path';import vm from 'node:vm';import {execFileSync} from 'node:child_process';import {JSDOM} from 'jsdom';
const out=process.argv[2];if(!out||!path.isAbsolute(out))throw new Error('Provide absolute QA output directory');fs.mkdirSync(out,{recursive:true});
const root=path.resolve('dist'),html=fs.readFileSync(root+'/index.html','utf8');
execFileSync('python',['-c',`import sys,os
from pathlib import Path
from PIL import Image
source,out=Path(sys.argv[1]),Path(sys.argv[2]);out.mkdir(exist_ok=True)
for p in source.glob('*.webp'):
 im=Image.open(p);im.load();target=out/(p.stem+'.png');tmp=out/(p.stem+'.tmp.png');im.save(tmp,'PNG');os.replace(tmp,target)
`,root+'/assets/cells',out+'/assets']);
const dom=new JSDOM(html,{url:'https://game.test/',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window;
w.matchMedia=()=>({matches:true});w.fetch=async p=>({ok:true,json:async()=>p==='/api/me'?{signedIn:false,profile:null}:JSON.parse(fs.readFileSync(root+'/'+p.slice(2),'utf8'))});
const ctx=dom.getInternalVMContext(),run=s=>vm.runInContext(s,ctx);
for(const script of w.document.querySelectorAll('script[src]'))run(fs.readFileSync(root+'/'+script.getAttribute('src').slice(2),'utf8'));
await new Promise(r=>setTimeout(r,70));
const css=fs.readFileSync(root+'/circle-board.css','utf8');
const exports=[];
for(let level=0;level<5;level++){
 run(`game.originalRequest='Мой запрос';game.request=game.originalRequest;game.stage='board';game.level=${level};game.position=0;boardLevelRendered=-1;renderGame()`);
 const svg=w.document.querySelector('.circle-cells').cloneNode(true);svg.setAttribute('xmlns','http://www.w3.org/2000/svg');svg.setAttribute('width','1000');svg.setAttribute('height','1000');
 for(const image of svg.querySelectorAll('image'))image.setAttribute('href','assets/'+path.basename(image.getAttribute('href')).replace('.webp','.png'));
 const content=svg.innerHTML;svg.innerHTML=`<rect width="1000" height="1000" fill="#120e19"/><style>${css}</style><g class="board" id="board" data-world="${level+1}">${content}</g>`;
 const name=`world-${level+1}.svg`;fs.writeFileSync(path.join(out,name),svg.outerHTML);
 exports.push({level:level+1,file:name,cells:JSON.parse(run('JSON.stringify(routeCells().map(c=>({id:c.id,type:c.type,x:c.x,y:c.y})))'))});
}
fs.writeFileSync(path.join(out,'cells.json'),JSON.stringify(exports,null,2));dom.window.close();console.log(out);
