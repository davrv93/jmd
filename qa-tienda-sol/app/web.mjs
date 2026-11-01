// Servidor web multialumno: el código aleatorio es una capacidad privada.
// Un solo proceso; límite de tiendas, sesiones, ventas, cuerpo y latencia.
import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { crearTienda } from './servidor.mjs';
const tiendas = new Map();
const TTL = Number(process.env.TTL_MS ?? 30 * 60_000);
const LIMITE = Number(process.env.MAX_TIENDAS ?? 120);
const raiz = '/tienda-sol';
const json = (res, status, body) => { res.writeHead(status, {'content-type':'application/json; charset=utf-8','cache-control':'no-store'}); res.end(JSON.stringify(body)); };
function limpiar() { for (const [id,t] of tiendas) if (Date.now()-t.uso > TTL && !t.activas) tiendas.delete(id); }
setInterval(limpiar, Math.min(TTL,60_000)).unref();
createServer(async (req,res) => {
 res.setHeader('Referrer-Policy','no-referrer');
 res.setHeader('X-Content-Type-Options','nosniff');
 res.setHeader('Cache-Control','no-store');
 const url = new URL(req.url,'http://localhost');
 if (url.pathname === '/salud') return json(res,200,{estado:'ok',tiendas:tiendas.size});
 if (!['GET','HEAD'].includes(req.method) && req.headers.origin && req.headers.origin !== `https://${req.headers.host}` && req.headers.origin !== `http://${req.headers.host}`) return json(res,403,{error:'Origen no permitido'});
 limpiar();
 if ([raiz,raiz+'/'].includes(url.pathname)) {
  if (req.method !== 'GET') return json(res,405,{error:'Método no permitido'});
  let codigo = /(?:^|; )sol=([a-f0-9]{32})(?:;|$)/.exec(req.headers.cookie ?? '')?.[1];
  if (!codigo || !tiendas.has(codigo)) {
   if (tiendas.size >= LIMITE) return json(res,503,{error:'Taller lleno. Intenta nuevamente en unos minutos.'});
   codigo = randomBytes(16).toString('hex');
   tiendas.set(codigo,{uso:Date.now(),activas:0,handler:crearTienda({modo:'prueba'})});
  }
  res.writeHead(302,{'location':`${raiz}/${codigo}/`,'set-cookie':`sol=${codigo}; Path=${raiz}/; HttpOnly; SameSite=Lax${process.env.SECURE_COOKIE === '1' ? '; Secure' : ''}; Max-Age=${Math.floor(TTL/1000)}`});return res.end();
 }
 const m = /^\/tienda-sol\/([a-f0-9]{32})(\/.*)?$/.exec(url.pathname);
 if (!m || !tiendas.has(m[1])) {
   // Un navegador recibe una tienda nueva en vez de un JSON de error; la API sigue viendo el 410.
   if ((req.headers.accept||'').includes('text/html')) { res.writeHead(302,{'location':`${raiz}/?vencida=1`}); return res.end(); }
   return json(res,410,{error:'Tienda vencida o inexistente. Abre /tienda-sol/ para crear la tuya.'});
 }
 const t=tiendas.get(m[1]);
 if (!m[2]) {res.writeHead(302,{location:url.pathname+'/'});return res.end();}
 t.uso=Date.now();t.activas++;
 res.once('close',()=>{t.activas--;});
 const prefijo=`${raiz}/${m[1]}`;
 req.url=m[2]+url.search;
 const end=res.end.bind(res);
 res.end=(body,...args)=>{
  const tipo=String(res.getHeader('content-type') ?? '');
  if (body && /text\/(html|javascript)/.test(tipo)) {
   body=body.toString().replace(/(["'])\/(?!\/)/g,(_,q)=>q+prefijo+'/');
   if (tipo.includes('html')) body=body.replace('</body>',`<aside aria-label="Controles de mi tienda" id="sol-controles" style="position:fixed;bottom:8px;right:12px;background:#171b28;color:white;padding:10px;border-radius:8px;font:13px system-ui;z-index:100"><label><input id="sol-bugs" type="checkbox" checked> Con bugs</label> · <button id="sol-reiniciar">Reiniciar mi tienda</button><span id="sol-estado" role="status"></span></aside><script>const base=${JSON.stringify(prefijo)};const control=document.getElementById('sol-bugs');fetch(base+'/js/config.js').then(r=>r.text()).then(s=>{control.checked=s.includes('"cobroExacto":true')});control.onchange=async()=>{await fetch(base+'/api/caos',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({bugs:control.checked})});location.reload()};document.getElementById('sol-reiniciar').onclick=async()=>{await fetch(base+'/api/semilla',{method:'POST'});sessionStorage.clear();location.assign(base+'/')};</script></body>`);
  }
  return end(body,...args);
 };
 await t.handler(req,res);
}).listen(Number(process.env.PORT ?? 18620),process.env.HOST ?? '127.0.0.1',()=>console.log('Tienda Sol multialumno lista'));
