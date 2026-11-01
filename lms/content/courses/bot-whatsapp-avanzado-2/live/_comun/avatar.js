// Ayudante para las escenas del LIVE: monta el osito o el robot sobre un <canvas> con un solo
// llamado y devuelve {setAnimo, detener, soportado}. Sin WebGL devuelve {soportado:false} y la
// escena debe mostrar su imagen de respaldo. Los módulos y Three.js viven en esta misma carpeta;
// la escena declara el importmap (ver live/_plantilla/avatar-ejemplo.html).
import { crearEscena, crearOsito, ANIMOS } from "./osito.js";
import { crearRobot } from "./robot.js";

export { ANIMOS };

export function montarAvatar(canvas, tipo = "osito", animoInicial = "neutral") {
  let escena;
  try {
    escena = crearEscena(canvas);
  } catch (e) {
    return { soportado: false, setAnimo() {}, detener() {} };
  }
  const av = tipo === "robot" ? crearRobot(escena.scene) : crearOsito(escena.scene);
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
  if (animoInicial && animoInicial !== "neutral") av.setAnimo(animoInicial);
  return {
    soportado: true,
    avatar: av,
    setAnimo: (a) => av.setAnimo(a),
    saludar: () => av.saludar && av.saludar(),
    detener() {
      vivo = false;
      removeEventListener("resize", alRedimensionar);
    },
  };
}
