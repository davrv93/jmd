import assert from 'node:assert/strict';
const host=process.env.WEB_HOST??'http://127.0.0.1:18620';
const crear=async()=>{const r=await fetch(host+'/tienda-sol/',{redirect:'manual'});assert.equal(r.status,302);return host+r.headers.get('location')};const a=await crear(),b=await crear();assert.notEqual(a,b);
const post=(base,r,data={})=>fetch(base+r,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(data)});
await post(a,'api/semilla',{bugs:true});await post(b,'api/semilla',{bugs:false});
const login=async(base)=>(await (await post(base,'api/login',{usuario:'cajero',clave:'cajero123'})).json()).token;
const ta=await login(a),tb=await login(b);
assert.equal((await fetch(b+'api/productos',{headers:{authorization:'Bearer '+ta}})).status,401);
await post(a,'api/caos',{caida:true,latenciaMs:30});assert.equal((await fetch(a+'salud')).status,503);assert.equal((await fetch(b+'salud')).status,200);
await post(a,'api/semilla');assert.equal((await fetch(b+'api/productos',{headers:{authorization:'Bearer '+tb}})).status,200);
assert.equal((await fetch(a+'js/config.js')).status,200);assert.match(await(await fetch(b+'js/config.js')).text(),/"cobroExacto":false/);
await post(a,'api/caos',{caida:false});
const vb=await fetch(b+'api/ventas',{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+tb},body:JSON.stringify({items:[{codigo:'P001',cantidad:1}],efectivo:5})});assert.equal(vb.status,201);
const reporte=async base=>(await(await fetch(base+'api/reporte',{headers:{authorization:'Bearer '+(base===a?await login(a):tb)}})).json());assert.equal((await reporte(b)).numeroVentas,1);await post(a,'api/semilla');assert.equal((await reporte(b)).numeroVentas,1);
assert.equal((await fetch(host+'/tienda-sol/'+ '0'.repeat(32)+'/salud')).status,410);
assert.equal((await post(b,'api/caos',{latenciaMs:999999})).status,200);await post(b,'api/caos',{latenciaMs:0});

console.log('OK: tiendas distintas, tokens aislados, caída y semilla propias, ventas independientes, modo por tienda, código desconocido rechazado.');console.log('BASE_URL de pruebas',b);
