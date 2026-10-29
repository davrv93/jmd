// Ejecutar mediante TestRepasoNavegadorReal. Usa cookies, CSP y API Go reales
// sobre un fixture temporal. Nunca consulta producción ni imprime credenciales.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {chromium,CHROME} from './_pw.mjs';
const input=[];for await(const chunk of process.stdin)input.push(chunk);
const config=JSON.parse(Buffer.concat(input).toString());fs.mkdirSync(config.out,{recursive:true});
const report={api:'Go real; sin page.route ni puntuación simulada',iframe:true,acciones:[],errores:[],checks:{}};
const browser=await chromium.launch({executablePath:CHROME,headless:true,args:['--disable-gpu']});
async function client(role,credentials,mobile=false){
 const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:810},hasTouch:mobile,isMobile:mobile,reducedMotion:'reduce'});
 const login=await context.request.post(config.base+'/api/v1/auth/login',{data:credentials});assert.equal(login.status(),200,'No inició la sesión temporal de '+role);
 const page=await context.newPage();page.on('pageerror',e=>report.errores.push(String(e)));
 page.on('response',response=>{if(response.url().endsWith('/repaso')&&response.request().method()==='POST'){const data=response.request().postDataJSON();report.acciones.push({rol:role,accion:data.accion,status:response.status()});}});
 await page.goto(config.base+'/__qa/frame');const frame=page.frameLocator('iframe');await frame.locator('#conexion').filter({hasText:'EN LÍNEA'}).waitFor();await frame.locator('#lienzo canvas').waitFor();
 return {context,page,frame,role,mobile};
}
async function state(client){return client.frame.locator('body').evaluate(async()=>{const r=await fetch('/api/v1/live/de-02/repaso',{credentials:'same-origin'});if(!r.ok)throw Error('Estado no disponible');return r.json();});}
async function waitScore(c,score){await c.frame.locator('body').evaluate((el,score)=>window.__scoreEsperado=score,score);await c.frame.locator('body').evaluate(()=>new Promise((resolve,reject)=>{const until=Date.now()+8000;const t=setInterval(()=>{if(document.querySelector('#puntos').textContent===String(window.__scoreEsperado)){clearInterval(t);resolve()}else if(Date.now()>until){clearInterval(t);reject(Error('El marcador no se actualizó: '+document.querySelector('#puntos').textContent+' / '+document.querySelector('#estado').textContent))}},40)}));}
async function phase(fase,ronda){const r=await teacher.context.request.post(config.base+'/__qa/reloj',{data:{fase,ronda}});assert.equal(r.status(),200);}
async function waitText(c,text){await c.frame.locator('#fase').filter({hasText:text}).waitFor({timeout:8000});}
async function screenshot(c,name){await c.page.screenshot({path:path.join(config.out,name+'.png')});}
async function hit(c,kind,score){
 const wanted=kind==='hongos'?[255,101,122]:[96,222,235];
 for(let attempt=0;attempt<4;attempt++){
  const canvas=c.frame.locator('#lienzo canvas');
  const spot=await canvas.evaluate((el,wanted)=>{const data=el.getContext('2d').getImageData(0,0,el.width,el.height).data;let minX=el.width,maxX=-1,minY=el.height,maxY=-1;for(let y=0;y<el.height;y++)for(let x=0;x<el.width;x++){const i=(y*el.width+x)*4;if(data[i]===wanted[0]&&data[i+1]===wanted[1]&&data[i+2]===wanted[2]){minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y)}}return maxX<0?null:{x:(minX+maxX)/2,y:(minY+maxY)/2,w:el.width,h:el.height};},wanted);
  if(!spot){await c.page.waitForTimeout(200);continue;}
  const box=await canvas.boundingBox(),scale=Math.min(box.width/spot.w,box.height/spot.h),x=box.x+(box.width-spot.w*scale)/2+spot.x*scale,y=box.y+(box.height-spot.h*scale)/2+spot.y*scale;
  if(c.mobile)await c.page.touchscreen.tap(x,y);else await c.page.mouse.click(x,y);
  await c.page.waitForTimeout(300);if((await state(c)).yo.puntos===score){await waitScore(c,score);return;}
 }
 throw Error('No sumó al tocar el '+kind+' dibujado: '+JSON.stringify({role:c.role,estado:(await state(c)).fase,mensaje:await c.frame.locator('#estado').textContent()}));
}
let teacher,student;
try{
 teacher=await client('instructor',config.teacher);await teacher.frame.locator('#iniciar').click();await waitText(teacher,'Piensa');let s=await state(teacher);assert(s.yo,'El instructor sigue siendo espectador');assert.equal(s.instructores,1);assert.equal(s.inscritos,0);
 await teacher.frame.locator('.respuesta').nth(1).click();await waitScore(teacher,100);report.checks.instructorResponde=true;
 student=await client('alumno',config.student,true);await student.frame.locator('.respuesta').nth(1).click();await waitScore(student,100);s=await state(student);assert(s.yo&&!s.yo.instructor);assert.equal(s.inscritos,1);report.checks.alumnoEntraAlResponder=true;
 await screenshot(teacher,'01-instructor-respuesta-real');await screenshot(student,'02-alumno-respuesta-real');
 await phase('destreza',0);await waitText(teacher,'hongo');await waitText(student,'hongo');await hit(teacher,'hongos',105);await hit(student,'hongos',105);report.checks.hongosInstructorYAlumno=true;
 await screenshot(teacher,'03-instructor-hongo-real');await screenshot(student,'04-alumno-hongo-real');
 await phase('pregunta',1);await waitText(teacher,'Piensa');await teacher.frame.locator('.respuesta').nth(2).click();await waitScore(teacher,205);
 const replay=await teacher.frame.locator('body').evaluate(async()=>{const s=await(await fetch('/api/v1/live/de-02/repaso',{credentials:'same-origin'})).json();return(await fetch('/api/v1/live/de-02/repaso',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({accion:'responder',partida:s.partida,ronda:s.ronda,respuesta:2})})).status});assert.equal(replay,409);report.checks.duplicadoNoSuma=true;
 await phase('destreza',1);await waitText(teacher,'globo');await waitText(student,'globo');await hit(teacher,'globos',210);await hit(student,'globos',110);report.checks.globosInstructorYAlumno=true;
 await screenshot(teacher,'05-instructor-globo-real');await screenshot(student,'06-alumno-globo-real');
 const before=(await state(student)).yo.puntos;const c=student.frame.locator('#lienzo canvas'),box=await c.boundingBox(),scale=Math.min(box.width/1000,box.height/500);await student.page.touchscreen.tap(box.x+(box.width-1000*scale)/2+20*scale,box.y+(box.height-500*scale)/2+10*scale);await student.page.waitForTimeout(400);assert.equal((await state(student)).yo.puntos,before);report.checks.clicFueraNoSuma=true;
 assert(await teacher.frame.locator('#staff').isVisible());await teacher.frame.locator('#terminar').click();await waitText(teacher,'Cierre');report.checks.instructorMantieneControles=true;
 assert.equal(report.errores.length,0);report.marcadores={instructor:(await state(teacher)).yo.puntos,alumno:(await state(student)).yo.puntos};report.ok=true;
}finally{fs.writeFileSync(path.join(config.out,'informe-real.json'),JSON.stringify(report,null,2)+'\n');await browser.close();}
console.log(JSON.stringify({ok:report.ok,checks:report.checks,marcadores:report.marcadores,errores:report.errores}));
