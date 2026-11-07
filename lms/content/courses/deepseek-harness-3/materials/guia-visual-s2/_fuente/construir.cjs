// Genera 01.webp … NN.webp (1600x900) desde plantilla.html + diapositivas.json con Chrome headless.
// Uso: node construir.cjs   (desde cualquier carpeta)
const path=require('path'),fs=require('fs'),cp=require('child_process'),os=require('os');
const {chromium}=require('/Users/david.roncal/Documents/jmd/lms/web/node_modules/playwright-core');
const AQUI=__dirname, SALIDA=path.resolve(AQUI,'..');
const slides=JSON.parse(fs.readFileSync(path.join(AQUI,'diapositivas.json'),'utf8'));
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'guia-s2-'));
(async()=>{
 const b=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 const p=await b.newPage({viewport:{width:1600,height:900}});
 await p.goto('file://'+path.join(AQUI,'plantilla.html'));
 for(let i=0;i<slides.length;i++){
  const s={...slides[i],n:i+1,total:slides.length};
  await p.evaluate(s=>window.render(s),s);
  await p.evaluate(()=>Promise.all([...document.images].map(im=>im.complete?1:new Promise(r=>{im.onload=im.onerror=r}))));
  await p.waitForTimeout(150);
  const nn=String(i+1).padStart(2,'0'), png=path.join(tmp,nn+'.png'), out=path.join(SALIDA,nn+'.webp');
  await p.screenshot({path:png});
  for(const q of [92,88,84,80,75,70,60]){
   cp.execFileSync('cwebp',['-quiet','-q',String(q),'-m','6',png,'-o',out]);
   if(fs.statSync(out).size<=180*1024) break;
  }
  console.log(nn,s.titulo,Math.round(fs.statSync(out).size/1024)+' KB');
 }
 await b.close(); fs.rmSync(tmp,{recursive:true});
})();
