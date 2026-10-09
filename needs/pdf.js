/* Standalone PDF export with embedded Unicode TrueType font. No remote service. */
async function motivationPDF(state,data){
 const [fr,mr]=await Promise.all([fetch('assets/reading.ttf'),fetch('assets/font-metrics.json')]);if(!fr.ok||!mr.ok)throw Error('font');
 const font=new Uint8Array(await fr.arrayBuffer()),metrics=await mr.json(),enc=new TextEncoder();
 const used=new Set(),hex=t=>Array.from(t).map(ch=>{let c=ch.codePointAt(0);if(c>65535||!metrics[c])c=63;used.add(c);return c.toString(16).padStart(4,'0');}).join('');
 const width=(t,size)=>Array.from(t).reduce((a,c)=>a+(metrics[c.codePointAt(0)]?.[1]||600)*size/1000,0);
 const pages=[];let content='',y=785;
 function newPage(){if(content)pages.push(content);content='';y=785;}
 function line(t,size=13,color='0.20 0.26 0.21'){if(y<60)newPage();content+=`BT /F1 ${size} Tf ${color} rg 1 0 0 1 48 ${y} Tm <${hex(t)}> Tj ET\n`;y-=size*1.65;}
 function para(t,size=13){for(const paragraph of String(t||'').split('\n')){let row='';for(const word of paragraph.split(/\s+/)){if(width(row+(row?' ':'')+word,size)>495&&row){line(row,size);row='';}if(width(word,size)>495){if(row){line(row,size);row='';}for(const ch of word){if(width(row+ch,size)>495){line(row,size);row='';}row+=ch;}}else row+=(row?' ':'')+word;}if(row)line(row,size);else y-=10;}y-=10;}
 line('Код твоей мотивации',23);line(state.research?'Мое исследование потребности':'Мой план '+(state.period==='week'?'на неделю':'на день'),18);line('Юлия Стоянова · '+new Date().toLocaleDateString('ru-RU'),11);y-=14;
 if(state.research){const r=state.research;para('Возможные направления для саморефлексии. Это не психологический диагноз.',11);line('Что я чувствую',17);para(r.emotion);line('Как это проявляется',17);para(r.manifestations.length?r.manifestations.join(', '):'Проявления не выбраны.');line('Какие потребности могут за этим стоять',17);r.needs.forEach(n=>para(n));if(r.context){line('Мой контекст',17);para(r.context);}if(r.note){line('Мои наблюдения',17);para(r.note);}}
 else para(state.plan||'Личный план пока не заполнен.');
 const selected=data.needs.flatMap(n=>n.ways.filter(w=>state.ways[w.id]?.selected).map(w=>({n,w})));
 if(selected.length){line('Выбранные способы',18);y-=10;for(const {n,w}of selected){if(y<150)newPage();para(n.name,16);para((state.ways[w.id].done?'Выполнено. ':'Запланировано. ')+w.text);if(state.ways[w.id].note)para('Моя заметка: '+state.ways[w.id].note);y-=12;}}
 newPage();
 const objects=[null];const add=o=>(objects.push(o),objects.length-1);const str=s=>enc.encode(s);const concat=arrays=>{const out=new Uint8Array(arrays.reduce((a,b)=>a+b.length,0));let pos=0;for(const a of arrays){out.set(a,pos);pos+=a.length;}return out;};
 const stream=(bytes,extra='')=>concat([str(`<< /Length ${bytes.length} ${extra} >>\nstream\n`),bytes,str('\nendstream')]);
 const catalog=add(''),pageTree=add('');const fontFile=add(stream(font,`/Length1 ${font.length}`));
 const descriptor=add(`<< /Type /FontDescriptor /FontName /DejaVuSans /Flags 32 /FontBBox [-1021 -463 1794 1233] /ItalicAngle 0 /Ascent 928 /Descent -236 /CapHeight 729 /StemV 80 /FontFile2 ${fontFile} 0 R >>`);
 pages.forEach((_,i)=>hex('Страница '+(i+1)));const max=Math.max(...used);const glyphMap=new Uint8Array((max+1)*2);let widths='';for(const c of used){const [g,w]=metrics[c]||metrics[63];glyphMap[c*2]=g>>8;glyphMap[c*2+1]=g&255;widths+=`${c} [${w}] `;}
 const mapId=add(stream(glyphMap));const cid=add(`<< /Type /Font /Subtype /CIDFontType2 /BaseFont /DejaVuSans /CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> /FontDescriptor ${descriptor} 0 R /DW 600 /W [${widths}] /CIDToGIDMap ${mapId} 0 R >>`);
 const codes=[...used];let cmap='/CIDInit /ProcSet findresource begin\n12 dict begin\nbegincmap\n/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def\n/CMapName /Unicode def\n/CMapType 2 def\n1 begincodespacerange\n<0000> <FFFF>\nendcodespacerange\n';
 for(let i=0;i<codes.length;i+=100){const batch=codes.slice(i,i+100);cmap+=`${batch.length} beginbfchar\n`+batch.map(c=>{const h=c.toString(16).padStart(4,'0');return `<${h}> <${h}>`;}).join('\n')+'\nendbfchar\n';}cmap+='endcmap\nCMapName currentdict /CMap defineresource pop\nend\nend';
 const unicode=add(stream(str(cmap)));const fontId=add(`<< /Type /Font /Subtype /Type0 /BaseFont /DejaVuSans /Encoding /Identity-H /DescendantFonts [${cid} 0 R] /ToUnicode ${unicode} 0 R >>`);
 const ids=[];pages.forEach((c,i)=>{c+=`BT /F1 10 Tf 0.4 0.4 0.4 rg 1 0 0 1 48 30 Tm <${hex('Страница '+(i+1))}> Tj ET\n`;const cont=add(stream(str(c)));ids.push(add(`<< /Type /Page /Parent ${pageTree} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${cont} 0 R >>`));});
 objects[catalog]=`<< /Type /Catalog /Pages ${pageTree} 0 R >>`;objects[pageTree]=`<< /Type /Pages /Count ${ids.length} /Kids [${ids.map(id=>id+' 0 R').join(' ')}] >>`;
 const chunks=[str('%PDF-1.7\n')],offsets=[0];let offset=chunks[0].length;for(let i=1;i<objects.length;i++){offsets[i]=offset;const obj=concat([str(`${i} 0 obj\n`),typeof objects[i]==='string'?str(objects[i]):objects[i],str('\nendobj\n')]);chunks.push(obj);offset+=obj.length;}
 let xref=`xref\n0 ${objects.length}\n0000000000 65535 f \n`;for(let i=1;i<objects.length;i++)xref+=offsets[i].toString().padStart(10,'0')+' 00000 n \n';xref+=`trailer\n<< /Size ${objects.length} /Root ${catalog} 0 R >>\nstartxref\n${offset}\n%%EOF`;chunks.push(str(xref));return new Blob(chunks,{type:'application/pdf'});
}
