import {cp,mkdir,readdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const source=fileURLToPath(new URL('./dist/',import.meta.url));
const target=fileURLToPath(new URL('../',import.meta.url));
await mkdir(target,{recursive:true});
for(const entry of await readdir(source)){if(entry==='.vite')continue;await cp(source+entry,target+entry,{recursive:true,force:true})}
console.log('Production files copied into put-k-sebe; existing unrelated files retained.');
