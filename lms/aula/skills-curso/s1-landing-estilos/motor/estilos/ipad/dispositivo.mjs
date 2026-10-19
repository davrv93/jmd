// Dispositivo genérico en CSS 3D: una tableta apaisada con su teclado-funda, sin logos ni marcas.
// Reutilizable: lo usa el hero del estilo «ipad», y cualquier plantilla puede importarlo.
//
//   import { dispositivo } from './dispositivo.mjs';
//   dispositivo({ pantalla: '<img …>' })            → HTML del dispositivo (pantalla = lo que se ve en ella)
//   dispositivo({ pantalla, clase: 'mi-clase', ancho: '520px' })
//   dispositivo({ pantalla, flotante: true })      → la tableta flota sobre el teclado, sostenida por su panel
//
// Se estiliza con recursos/dispositivo.css y se gobierna con variables CSS en el .disp:
//   --abre  0 (teclado cerrado sobre la pantalla) … 1 (abierto)      por defecto 1
//   --luz   0 (teclas apagadas) … 1 (todas retroiluminadas)          por defecto 1
//   --gira  giro horizontal del conjunto (deg) · --escala · --disp-ancho · --disp-camara · --disp-angulo
// El efecto «despliegue» de estilo.js anima --abre y --luz con el scroll.

// Distribución QWERTY en español, sin marcas: [rótulo, ancho en unidades de tecla]. Cada fila suma 14,5.
const FILAS = [
  [['º', 1], ['1', 1], ['2', 1], ['3', 1], ['4', 1], ['5', 1], ['6', 1], ['7', 1], ['8', 1], ['9', 1], ['0', 1], ["'", 1], ['¡', 1], ['⌫', 1.5]],
  [['⇥', 1.5], ['Q', 1], ['W', 1], ['E', 1], ['R', 1], ['T', 1], ['Y', 1], ['U', 1], ['I', 1], ['O', 1], ['P', 1], ['`', 1], ['+', 1], ['Ç', 1]],
  [['⇪', 1.75], ['A', 1], ['S', 1], ['D', 1], ['F', 1], ['G', 1], ['H', 1], ['J', 1], ['K', 1], ['L', 1], ['Ñ', 1], ['´', 1], ['↵', 1.75]],
  [['⇧', 2.25], ['Z', 1], ['X', 1], ['C', 1], ['V', 1], ['B', 1], ['N', 1], ['M', 1], [',', 1], ['.', 1], ['-', 1], ['⇧', 2.25]],
  [['fn', 1], ['ctrl', 1], ['alt', 1], ['', 1.25], ['', 5], ['', 1.25], ['alt', 1], ['◂', 1], ['flechas', 1], ['▸', 1]],
];
const TOTAL = 14.5;
// La luz nace en la barra espaciadora y se extiende hacia los bordes (orden de encendido --d).
const ORIGEN = { x: (1 + 1 + 1 + 1.25 + 2.5) / TOTAL, y: 1 };
const azar = (i) => { const s = Math.sin(i * 12.9898) * 43758.5453; return s - Math.floor(s); };

function tecla(rotulo, u, d, extra = '') {
  const corto = rotulo.length > 1 && rotulo !== 'flechas' ? ' disp-k-mod' : '';
  return `<i class="disp-k${corto}${extra}" style="--u:${u};--d:${d}"${rotulo ? ` data-k="${rotulo}"` : ''}></i>`;
}

function teclas() {
  let n = 0;
  return FILAS.map((fila, r) => {
    let x = 0;
    const piezas = fila.map(([rotulo, u]) => {
      const cx = (x + u / 2) / TOTAL;
      x += u;
      const dist = Math.hypot(cx - ORIGEN.x, ((r / (FILAS.length - 1)) - ORIGEN.y) * 0.55);
      const d = Math.min(0.8, 0.02 + dist * 1.05 + (azar(++n) - 0.5) * 0.06).toFixed(3);
      if (rotulo === 'flechas') {
        return `<span class="disp-flechas" style="--u:${u}">${tecla('▴', 1, d)}${tecla('▾', 1, (+d + 0.02).toFixed(3))}</span>`;
      }
      return tecla(rotulo, u, d);
    });
    return `<span class="disp-fila">${piezas.join('')}</span>`;
  }).join('');
}
const TECLAS = teclas();

export function dispositivo({ pantalla = '', clase = '', ancho = '', flotante = false } = {}) {
  const estilo = ancho ? ` style="--disp-ancho:${ancho}"` : '';
  const clases = ['disp', flotante ? 'disp-flotante' : '', clase].filter(Boolean).join(' ');
  return `<div class="${clases}"${estilo}>
  <div class="disp-cuerpo">
    <div class="disp-soporte" aria-hidden="true"></div>
    <div class="disp-tableta"><div class="disp-pantalla">${pantalla}<span class="disp-reflejo" aria-hidden="true"></span></div><span class="disp-camara" aria-hidden="true"></span></div>
    <div class="disp-teclado" aria-hidden="true">
      <div class="disp-dorso"></div>
      <div class="disp-cara"><span class="disp-teclas">${TECLAS}</span><span class="disp-trackpad"></span></div>
      <div class="disp-canto"></div>
    </div>
  </div>
  <div class="disp-suelo" aria-hidden="true"></div>
</div>`;
}
