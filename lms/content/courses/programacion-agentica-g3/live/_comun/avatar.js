// Ayudante para las escenas del LIVE y para Robo: monta el osito o el robot sobre un <canvas> con un solo
// llamado y devuelve {soportado, tipo, color, avatar, setAnimo, saludar, detener}. Sin WebGL devuelve
// {soportado:false} y la página debe seguir funcionando sin avatar. Los módulos y Three.js viven en esta
// misma carpeta; la página declara el importmap (ver live/_plantilla/avatar-ejemplo.html).
//
// Dos formas de llamarlo (las dos valen):
//   montarAvatar(canvas, "robot", "feliz")                                   // la de siempre
//   montarAvatar(canvas, { tipo: "osito", color: "#e26d5a", animo: "feliz" })
// - tipo: "robot" u "osito" (otro valor = el de por defecto, "osito", con un aviso en la consola).
// - color: hexadecimal #rrggbb. En el robot tiñe los acentos (azules de fábrica); en el osito, el pelaje.
//   Un color inválido se ignora con un aviso en la consola y el avatar queda con su color de fábrica.
// Este archivo, robot.js y osito.js NO se copian ni se reescriben: el avatar se elige y se tiñe con estos
// parámetros.
import { crearEscena, crearOsito, ANIMOS } from "./osito.js";
import { crearRobot } from "./robot.js";

export { ANIMOS };
export const TIPOS = ["robot", "osito"];
// Color de fábrica de la pieza que se tiñe (COLOR_AZUL de robot.js y COLOR_PELO de osito.js).
const TENIBLE = { robot: 0x2f6bff, osito: 0xc99a6b };

/** "#2F6bff" -> "#2f6bff"; cualquier otra cosa -> null. */
export function colorValido(c) {
  return typeof c === "string" && /^#[0-9a-fA-F]{6}$/.test(c.trim()) ? c.trim().toLowerCase() : null;
}

function tenir(grupo, tipo, hex) {
  const de = TENIBLE[tipo];
  const a = parseInt(hex.slice(1), 16);
  const vistos = new Set();
  grupo.traverse((o) => {
    for (const m of [].concat(o.material || [])) {
      if (vistos.has(m)) continue;
      vistos.add(m);
      if (m.color && m.color.getHex() === de) m.color.setHex(a);
      if (m.emissive && m.emissive.getHex() === de) m.emissive.setHex(a);
    }
  });
}

export function montarAvatar(canvas, tipoUOpciones = "osito", animoInicial = "neutral") {
  const op = tipoUOpciones && typeof tipoUOpciones === "object" ? tipoUOpciones : { tipo: tipoUOpciones, animo: animoInicial };
  const tipo = TIPOS.includes(op.tipo) ? op.tipo : "osito";
  if (op.tipo !== undefined && op.tipo !== tipo) console.warn(`avatar: tipo «${op.tipo}» desconocido; uso «${tipo}» (vale robot u osito)`);
  const color = op.color ? colorValido(op.color) : null;
  if (op.color && !color) console.warn(`avatar: color «${op.color}» inválido (usa #rrggbb); queda el de fábrica`);
  const animo = op.animo || "neutral";
  let escena;
  try {
    escena = crearEscena(canvas);
  } catch (e) {
    return { soportado: false, tipo, color, setAnimo() {}, saludar() {}, detener() {} };
  }
  const av = tipo === "robot" ? crearRobot(escena.scene) : crearOsito(escena.scene);
  if (color && av.grupo) tenir(av.grupo, tipo, color);
  let vivo = true;
  let previo = performance.now();
  const cuadro = (ahora) => {
    if (!vivo) return;
    const dt = Math.min(0.05, (ahora - previo) / 1000);
    previo = ahora;
    av.update(dt);
    escena.render(dt);
    requestAnimationFrame(cuadro);
  };
  const alRedimensionar = () => escena.resize && escena.resize();
  addEventListener("resize", alRedimensionar);
  requestAnimationFrame(cuadro);
  if (animo && animo !== "neutral") av.setAnimo(animo);
  return {
    soportado: true,
    tipo,
    color,
    avatar: av,
    setAnimo: (a) => av.setAnimo(a),
    saludar: () => av.saludar && av.saludar(),
    detener() {
      vivo = false;
      removeEventListener("resize", alRedimensionar);
    },
  };
}
