import { component$ } from "@builder.io/qwik";
import type { Identidad } from "~/lib/api";
import { semilla } from "~/lib/marca";
import { iconoTrazos } from "~/components/icon";

// Portada de un curso dibujada en el navegador: un SVG por área con su motivo (red de agentes, curvas
// de diseño, barras de datos, panal de seguridad, escaneo de QA, notas de requerimientos, contenedores
// de infraestructura), el glifo del curso y la paleta de su color de identidad. Sin imágenes ni
// peticiones; la semilla (el nombre del curso) varía la composición entre cursos de la misma área.
// Si el curso trae imagen propia (identidad.portada_url), se usa esa con carga diferida.
//
// La portada es arte: se ve igual en claro y en oscuro. El texto que lleva (el número de la sesión)
// va en blanco sobre --idc-deep, con contraste de 4.5:1 o más en todos los colores.

const H = 180;

/** Generador determinista (mulberry32). */
function azar(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const r1 = (n: number) => Math.round(n * 10) / 10;
const BL = (op: number) => `rgba(255,255,255,${op})`;
const LUZ = "var(--idc-luz)";

function motivo(area: string, W: number, rnd: () => number, x0: number, x1: number): string {
  const out: string[] = [];
  const ancho = x1 - x0;
  switch (area) {
    case "agentica": {
      // Red de agentes: nodos unidos a sus dos vecinos más cercanos y un orquestador con anillo.
      const n = Math.max(7, Math.round(ancho / 46));
      const pts = Array.from({ length: n }, (_, i) => ({ x: x0 + (ancho * (i + 0.5 + (rnd() - 0.5) * 0.7)) / n, y: 22 + rnd() * (H - 44) }));
      for (const p of pts) {
        const cerca = pts.filter((q) => q !== p).sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y)).slice(0, 2);
        for (const q of cerca) out.push(`<line x1="${r1(p.x)}" y1="${r1(p.y)}" x2="${r1(q.x)}" y2="${r1(q.y)}" stroke="${BL(0.26)}" stroke-width="1.2"/>`);
      }
      pts.forEach((p, i) => out.push(`<circle cx="${r1(p.x)}" cy="${r1(p.y)}" r="${i % 3 === 0 ? 4.5 : 3}" fill="${i % 3 === 0 ? LUZ : BL(0.7)}"/>`));
      const hub = pts[Math.floor(rnd() * pts.length)];
      out.push(`<circle cx="${r1(hub.x)}" cy="${r1(hub.y)}" r="11" fill="none" stroke="${LUZ}" stroke-width="1.5" opacity=".8"/>`);
      break;
    }
    case "diseno": {
      // Círculos que se cruzan (como un diagrama de color) y un trazo libre de pluma.
      const cy = 60 + rnd() * 60;
      for (let i = 0; i < 3; i++) {
        const cx = x0 + ancho * (0.16 + i * 0.14 + rnd() * 0.04);
        out.push(`<circle cx="${r1(cx)}" cy="${r1(cy + (i === 1 ? -18 : 12))}" r="${r1(40 + rnd() * 14)}" fill="${i === 1 ? BL(0.06) : "none"}" stroke="${i === 1 ? LUZ : BL(0.32)}" stroke-width="1.6"/>`);
      }
      const y0 = 140 + rnd() * 20;
      out.push(`<path d="M${r1(x0)} ${r1(y0)} C ${r1(x0 + ancho * 0.3)} ${r1(y0 - 90)}, ${r1(x0 + ancho * 0.55)} ${r1(y0 + 40)}, ${r1(x1)} ${r1(30 + rnd() * 30)}" fill="none" stroke="${BL(0.42)}" stroke-width="2.2" stroke-linecap="round"/>`);
      for (let i = 0; i < 4; i++) out.push(`<rect x="${r1(x0 + ancho * (0.6 + i * 0.07))}" y="${r1(24 + i * 9)}" width="10" height="10" rx="2" fill="${i === 2 ? LUZ : BL(0.22)}"/>`);
      break;
    }
    case "datos": {
      // Barras sobre una línea base y una rejilla de puntos: datos que suben.
      const paso = 15;
      const n = Math.floor(ancho / paso);
      let h = 30 + rnd() * 20;
      for (let i = 0; i < n; i++) {
        h = Math.max(14, Math.min(120, h + (rnd() - 0.38) * 26));
        const x = x0 + i * paso;
        out.push(`<rect x="${r1(x)}" y="${r1(152 - h)}" width="8" height="${r1(h)}" rx="2" fill="${i >= n - 3 ? LUZ : BL(0.17)}"${i >= n - 3 ? ' opacity=".8"' : ""}/>`);
      }
      out.push(`<line x1="${r1(x0)}" y1="153" x2="${r1(x1)}" y2="153" stroke="${BL(0.35)}" stroke-width="1"/>`);
      for (let gx = x0; gx < x1; gx += 18) for (let gy = 16; gy < 52; gy += 12) out.push(`<circle cx="${r1(gx)}" cy="${gy}" r="1.1" fill="${BL(0.22)}"/>`);
      break;
    }
    case "seguridad": {
      // Panal de hexágonos; algunos llenos con la luz del color (lo que ya está protegido).
      const R = 15, dx = R * Math.sqrt(3), dy = R * 1.5;
      for (let fila = 0, y = 10; y < H + R; fila++, y += dy) {
        for (let x = x0 + (fila % 2 ? dx / 2 : 0); x < x1 + R; x += dx) {
          const pts = Array.from({ length: 6 }, (_, k) => {
            const a = (Math.PI / 3) * k + Math.PI / 6;
            return `${r1(x + (R - 1.5) * Math.cos(a))},${r1(y + (R - 1.5) * Math.sin(a))}`;
          }).join(" ");
          const lleno = rnd() < 0.12;
          out.push(`<polygon points="${pts}" fill="${lleno ? LUZ : "none"}" ${lleno ? 'opacity=".45"' : `stroke="${BL(0.17)}" stroke-width="1.1"`}/>`);
        }
      }
      break;
    }
    case "qa": {
      // Lista de comprobación con su línea de escaneo.
      for (let y = 12; y < H; y += 14) out.push(`<line x1="${r1(x0)}" y1="${y}" x2="${r1(x1)}" y2="${y}" stroke="${BL(0.07)}" stroke-width="1"/>`);
      const filas = 5;
      for (let i = 0; i < filas; i++) {
        const y = 32 + i * 26;
        const x = x0 + ancho * 0.04;
        const ok = rnd() < 0.7;
        out.push(`<rect x="${r1(x)}" y="${y - 7}" width="14" height="14" rx="3" fill="none" stroke="${ok ? LUZ : BL(0.4)}" stroke-width="1.5"/>`);
        if (ok) out.push(`<path d="M${r1(x + 3)} ${y} l3 3 5-6" fill="none" stroke="${LUZ}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`);
        out.push(`<rect x="${r1(x + 24)}" y="${y - 3}" width="${r1(ancho * (0.22 + rnd() * 0.3))}" height="6" rx="3" fill="${BL(0.2)}"/>`);
      }
      const ys = 40 + rnd() * 100;
      out.push(`<rect x="${r1(x0)}" y="${r1(ys)}" width="${r1(ancho)}" height="2" fill="${LUZ}" opacity=".7"/>`);
      out.push(`<rect x="${r1(x0)}" y="${r1(ys - 16)}" width="${r1(ancho)}" height="16" fill="${LUZ}" opacity=".08"/>`);
      break;
    }
    case "requerimientos": {
      // Notas de Event Storming en fila, con flechas de un evento al siguiente.
      const n = Math.max(4, Math.round(ancho / 62));
      for (let i = 0; i < n; i++) {
        const x = x0 + (ancho * (i + 0.15)) / n;
        const y = 40 + rnd() * 70;
        const rot = (rnd() - 0.5) * 10;
        const tono = i % 3 === 1 ? LUZ : BL(0.2 + rnd() * 0.12);
        out.push(`<g transform="rotate(${r1(rot)} ${r1(x + 19)} ${r1(y + 19)})"><rect x="${r1(x)}" y="${r1(y)}" width="38" height="38" rx="3" fill="${tono}"${i % 3 === 1 ? ' opacity=".75"' : ""}/><rect x="${r1(x + 6)}" y="${r1(y + 10)}" width="22" height="3" rx="1.5" fill="${BL(0.5)}"/><rect x="${r1(x + 6)}" y="${r1(y + 17)}" width="15" height="3" rx="1.5" fill="${BL(0.4)}"/></g>`);
        if (i < n - 1) out.push(`<path d="M${r1(x + 44)} ${r1(y + 19)} h${r1(ancho / n - 52)}" stroke="${BL(0.3)}" stroke-width="1.2" stroke-dasharray="3 3"/>`);
      }
      break;
    }
    case "infra": {
      // Contenedores apilados en isométrica.
      const cubo = (x: number, y: number, s: number, luz: boolean) => {
        const h = s * 0.58;
        out.push(`<path d="M${r1(x)} ${r1(y)} l${s} ${r1(-h)} l${s} ${r1(h)} l${-s} ${r1(h)} z" fill="${luz ? LUZ : BL(0.18)}"${luz ? ' opacity=".6"' : ""}/>`);
        out.push(`<path d="M${r1(x)} ${r1(y)} v${s} l${s} ${r1(h)} v${-s} M${r1(x + 2 * s)} ${r1(y)} v${s} l${-s} ${r1(h)}" fill="none" stroke="${BL(0.35)}" stroke-width="1.2"/>`);
      };
      const n = Math.max(3, Math.round(ancho / 70));
      for (let i = 0; i < n; i++) {
        const x = x0 + (ancho * i) / n;
        const pisos = 1 + Math.floor(rnd() * 3);
        for (let k = 0; k < pisos; k++) cubo(x, 120 - k * 30, 24, k === pisos - 1 && i % 2 === 0);
      }
      break;
    }
    default: {
      // Arcos concéntricos.
      const cx = x0 + ancho * 0.3;
      for (let i = 1; i <= 6; i++) out.push(`<circle cx="${r1(cx)}" cy="${H}" r="${i * 26}" fill="none" stroke="${i === 3 ? LUZ : BL(0.18)}" stroke-width="1.4"/>`);
    }
  }
  return out.join("");
}

/** El SVG completo de una portada (cadena), de ancho `aspecto` × 180. */
export function arteSVG(o: { area?: string; nombre: string; icono: string; aspecto?: number; n?: number; glifo?: boolean }): string {
  const W = Math.round(H * (o.aspecto ?? 2));
  const rnd = azar(semilla(o.nombre));
  const gx = W - 62;
  const partes: string[] = [];
  partes.push(`<rect width="${W}" height="${H}" fill="var(--idc-deep)"/>`);
  partes.push(`<circle cx="${r1(W * (0.75 + rnd() * 0.2))}" cy="${r1(-20 + rnd() * 50)}" r="${r1(H * 1.15)}" fill="var(--idc-deep2)"/>`);
  const glifo = o.glifo !== false;
  partes.push(`<g opacity="${o.n ? 0.55 : 1}">${motivo(o.area ?? "", W, rnd, 12, glifo ? W - 128 : W - 12)}</g>`);
  // Glifo del curso en una moneda clara a la derecha.
  if (glifo) {
    partes.push(`<circle cx="${gx}" cy="${H / 2}" r="40" fill="${BL(0.12)}" stroke="${BL(0.28)}" stroke-width="1.2"/>`);
    partes.push(`<g transform="translate(${gx - 24} ${H / 2 - 24}) scale(2)" fill="none" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${iconoTrazos(o.icono)}</g>`);
  }
  if (o.n) {
    // Número de la sesión, grande: se lee también en la miniatura de 100 px de ancho.
    partes.push(`<rect x="0" y="0" width="${Math.min(W - 120, 190)}" height="${H}" fill="var(--idc-deep)" opacity=".6"/>`);
    partes.push(`<text x="22" y="${H - 104}" fill="#fff" font-family="Inter, system-ui, sans-serif" font-size="26" font-weight="650" opacity=".92">Sesión</text>`);
    partes.push(`<text x="18" y="${H - 22}" fill="#fff" font-family="Inter, system-ui, sans-serif" font-size="92" font-weight="750" letter-spacing="-3">${o.n}</text>`);
  }
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMaxYMid slice" aria-hidden="true" focusable="false">${partes.join("")}</svg>`;
}

/**
 * Portada de un curso (o de una sesión, con `n`). El contenedor fija el tamaño por CSS; el arte llena
 * el recuadro y, si sobra ancho o alto, recorta por la izquierda para que el glifo siempre se vea.
 */
export const Portada = component$(
  (p: { nombre: string; area?: string; identidad: Identidad; aspecto?: number; n?: number; imagen?: string; class?: string; etiqueta?: string; glifo?: boolean }) => {
    const img = p.imagen || (p.n ? "" : p.identidad.portada_url);
    return (
      <span class={`portada ${p.class ?? ""}`} data-idc={p.identidad.color} role={p.etiqueta ? "img" : undefined} aria-label={p.etiqueta}>
        {img ? (
          <img src={img} alt="" loading="lazy" decoding="async" width={320} height={180} />
        ) : (
          <span class="portada-arte" dangerouslySetInnerHTML={arteSVG({ area: p.area, nombre: p.nombre, icono: p.identidad.icono, aspecto: p.aspecto, n: p.n, glifo: p.glifo })} />
        )}
      </span>
    );
  },
);
