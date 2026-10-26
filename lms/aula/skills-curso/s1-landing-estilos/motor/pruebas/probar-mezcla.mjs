// Prueba la mezcla reglas + modelo con un gateway FALSO en localhost (sin red, sin IA real).
// Cubre los caminos: modelo que responde JSON útil, modelo que devuelve basura, modelo que tarda
// de más, gateway que falla con 500, modelo que intenta inventar un precio, y modo --modelo no.
//
//   bun motor/pruebas/probar-mezcla.mjs
import http from 'node:http';
import { extraer, extraerConModelo, mezclar } from '../extraer.mjs';

const TEXTO = `hola, soy Ana y tengo una barbería en Lima, se llama Barbería Don Lucho
estamos en Av. Larco 1234, Miraflores. wsp 987 654 321
ofrecemos Corte clásico (con máquina y tijera); Perfilado de barba (toalla caliente); Corte para niños
precios: Corte clásico S/ 25, Perfilado de barba S/ 15
lema: trato de familia`;

// Lo que diría el modelo: redacción buena, pero con datos cambiados a propósito para comprobar que NO se le hace caso.
const RESPUESTA_BUENA = {
  negocio: { nombre: 'Don Lucho Barber', rubro: 'barbershop', whatsapp: '51999999999', lema: 'Trato de familia, corte de campeón' },
  hero: { antetitulo: 'Barbería en Miraflores', titulo: 'Un corte que se *nota* desde la puerta.', subtitulo: 'Corte clásico y perfilado de barba en Miraflores. Trato de familia.' },
  secciones: [
    { tipo: 'caracteristicas', items: [{ titulo: 'Corte clásico', texto: 'Texto del modelo que NO debe entrar: el cliente ya dio el suyo' }, { titulo: 'Corte para niños', texto: 'Con paciencia y sin apuros.' }] },
    { tipo: 'precios', planes: [{ nombre: 'Corte clásico', precio: 'S/ 10' }] },
  ],
};
const RESPUESTA_CON_CIFRA = { hero: { titulo: 'Más de *20 años* cortando en Lima.', subtitulo: 'Cortes desde S/ 10.' } };

let modo = 'buena';
const servidor = http.createServer((req, res) => {
  let cuerpo = '';
  req.on('data', (c) => { cuerpo += c; });
  req.on('end', () => {
    const pedido = JSON.parse(cuerpo);
    if (req.url !== '/v1/chat/completions' || req.headers.authorization !== 'Bearer clave-de-prueba' || pedido.model !== 'qwen-landing') {
      res.writeHead(400); res.end('{"error":"pedido mal formado"}'); return;
    }
    const responder = (contenido) => { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ choices: [{ message: { role: 'assistant', content: contenido } }] })); };
    if (modo === 'buena') responder('```json\n' + JSON.stringify(RESPUESTA_BUENA) + '\n```');
    else if (modo === 'basura') responder('Claro, aquí tienes tu landing: <html><body>hola</body></html> {esto no es json');
    else if (modo === 'cifra') responder(JSON.stringify(RESPUESTA_CON_CIFRA));
    else if (modo === 'lento') setTimeout(() => responder(JSON.stringify(RESPUESTA_BUENA)), 1500);
    else if (modo === 'error') { res.writeHead(500); res.end('kaput'); }
  });
});
await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
const url = `http://127.0.0.1:${servidor.address().port}`;
const base = { modo: 'qwen-landing', url, clave: 'clave-de-prueba', tiempoMs: 800 };

let fallos = 0;
const prueba = (nombre, cond, extra = '') => { console.log(`${cond ? 'OK ' : 'FALLA'} ${nombre}${extra ? ' · ' + extra : ''}`); if (!cond) fallos++; };
const reglas = extraer(TEXTO).negocio;

// 1) Modelo útil: toma redacción, conserva hechos
modo = 'buena';
let r = await extraerConModelo(TEXTO, base);
prueba('modelo bueno: se usó el modelo', r.modelo === 'qwen-landing', r.avisos.join(' | '));
prueba('modelo bueno: título del modelo', r.negocio.hero.titulo === 'Un corte que se *nota* desde la puerta.');
prueba('modelo bueno: subtítulo y antetítulo del modelo', r.negocio.hero.subtitulo.startsWith('Corte clásico y perfilado') && r.negocio.hero.antetitulo === 'Barbería en Miraflores');
prueba('modelo bueno: lema del modelo (el cliente dio lema)', r.negocio.negocio.lema === 'Trato de familia, corte de campeón');
prueba('hechos: nombre de las reglas, no del modelo', r.negocio.negocio.nombre === 'Barbería Don Lucho', r.negocio.negocio.nombre);
prueba('hechos: rubro canónico de las reglas', r.negocio.negocio.rubro === 'barbería', r.negocio.negocio.rubro);
prueba('hechos: WhatsApp de las reglas', r.negocio.negocio.whatsapp === '51987654321', r.negocio.negocio.whatsapp);
prueba('hechos: dirección y ciudad de las reglas', r.negocio.negocio.direccion === 'Av. Larco 1234, Miraflores' && r.negocio.negocio.ciudad === 'Lima', `${r.negocio.negocio.direccion} / ${r.negocio.negocio.ciudad}`);
const planes = r.negocio.secciones.find((s) => s.tipo === 'precios').planes;
prueba('hechos: precios de las reglas (S/ 25 y S/ 15, no S/ 10)', planes.length === 2 && planes[0].precio === 'S/ 25' && planes[1].precio === 'S/ 15', JSON.stringify(planes));
const items = r.negocio.secciones[0].items;
prueba('items: el texto del cliente se respeta', items[0].texto === 'Con máquina y tijera', items[0].texto);
prueba('items: el modelo solo rellena el item sin descripción', items[2].titulo === 'Corte para niños' && items[2].texto === 'Con paciencia y sin apuros.', items[2].texto);
prueba('items: la lista de servicios no cambia', items.length === 3 && items.map((i) => i.titulo).join(',') === 'Corte clásico,Perfilado de barba,Corte para niños');

// 2) Basura: sigue con reglas y avisa
modo = 'basura';
r = await extraerConModelo(TEXTO, base);
prueba('basura: se queda con reglas', r.modelo === 'no' && JSON.stringify(r.negocio) === JSON.stringify(reglas));
prueba('basura: avisa en avisos', r.avisos.some((a) => /no respondió|JSON/i.test(a)), r.avisos.at(-1));

// 3) Cifra inventada: se descarta solo ese campo
modo = 'cifra';
r = await extraerConModelo(TEXTO, base);
prueba('cifra inventada: título y subtítulo con números ajenos se descartan', r.negocio.hero.titulo === reglas.hero.titulo && r.negocio.hero.subtitulo === reglas.hero.subtitulo, `${r.negocio.hero.titulo} · descartados: ${r.descartados.join(', ')}`);

// 4) Lento: corta a los 800 ms y sigue con reglas
modo = 'lento';
const t0 = Date.now();
r = await extraerConModelo(TEXTO, base);
prueba('lento: corta por tiempo y sigue con reglas', r.modelo === 'no' && Date.now() - t0 < 1400 && r.avisos.some((a) => /tardó/.test(a)), r.avisos.at(-1));

// 5) Error HTTP
modo = 'error';
r = await extraerConModelo(TEXTO, base);
prueba('error 500: sigue con reglas y lo dice', r.modelo === 'no' && r.avisos.some((a) => /HTTP 500/.test(a)), r.avisos.at(-1));

// 6) Modo no / sin credenciales
r = await extraerConModelo(TEXTO, { ...base, modo: 'no' });
prueba('--modelo no: no toca la red', r.modelo === 'no' && JSON.stringify(r.negocio) === JSON.stringify(reglas));
r = await extraerConModelo(TEXTO, { modo: 'auto', url: '', clave: '' });
prueba('auto sin JMD_URL/JMD_API_KEY: reglas sin aviso', r.modelo === 'no' && !r.avisos.some((a) => /JMD/.test(a)));
r = await extraerConModelo(TEXTO, { modo: 'qwen-landing', url: '', clave: '' });
prueba('qwen-landing sin credenciales: reglas con aviso', r.modelo === 'no' && r.avisos.some((a) => /JMD_URL/.test(a)));

// 7) mezclar() con respuesta no-objeto
prueba('mezclar(null) devuelve las reglas', JSON.stringify(mezclar(reglas, null, TEXTO).negocio) === JSON.stringify(reglas));

servidor.close();
console.log(fallos ? `\n${fallos} prueba(s) fallaron` : '\nTodo OK');
process.exit(fallos ? 1 : 0);
