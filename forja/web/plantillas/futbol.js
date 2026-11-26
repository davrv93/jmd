// FÚTBOL · mini cancha: tú y tu arquero contra un defensa y su arquero. Gana quien meta 3 goles o vaya arriba al acabar el tiempo.
// Plantilla de Forja (JMD Learning) para Phaser 4. Algoritmos: máquina de estados, perseguir un punto, rebotes y gol.
const CAMPO = { x1: 60, x2: 900, y1: 90, y2: 500, arcoY1: 225, arcoY2: 365 };
const TAM = 96; // en la cancha los jugadores se ven más pequeños
const RED = 26;  // fondo de cada arco (px detrás de la línea)
const ZONA = 320; // el defensa presiona desde aquí (un poco más allá de la mitad, x = 480)

class Futbol extends Phaser.Scene {
  preload() { Forja.precargar(this); }

  create() {
    Forja.animaciones(this); Forja.efectos(this);
    this.cancha();
    this.capaX = this.add.graphics().setDepth(940);
    this.etiquetas = [];
    // Los jugadores no salen de la cancha; el balón sí puede entrar en la red (unos px detrás de la línea de fondo).
    const cancha = new Phaser.Geom.Rectangle(CAMPO.x1, CAMPO.y1, CAMPO.x2 - CAMPO.x1, CAMPO.y2 - CAMPO.y1);
    const jugador = (clave, x, y) => { const s = Forja.cuerpo(this.physics.add.sprite(x, y, clave, 'quieto_0'), D[clave], TAM, true); s.setCollideWorldBounds(true); s.body.setBoundsRectangle(cancha); return s; };
    this.physics.world.setBounds(CAMPO.x1 - RED, CAMPO.y1, CAMPO.x2 - CAMPO.x1 + 2 * RED, CAMPO.y2 - CAMPO.y1);
    this.heroe = jugador('heroe', 250, 295);
    this.defensa = jugador('enemigo', 640, 295).setData({ estado: 'volver', casa: { x: 640, y: 295 } });
    this.arquero = jugador('enemigo', CAMPO.x2 - 30, 295).setData({ estado: 'cubrir' });
    this.miArquero = jugador('heroe', CAMPO.x1 + 30, 295).setTint(0xbfd4ff); // tu arquero: mismo personaje, teñido para distinguirlo
    this.balon = this.physics.add.sprite(480, 295, 'objetos', 'balon_0').setScale(0.55).play('balon');
    for (const j of [this.heroe, this.defensa, this.arquero]) j.setTint(Forja.luzPersonaje(this));   // tu arquero conserva su color de equipo
    for (const j of [this.heroe, this.defensa, this.arquero, this.miArquero]) this.sombrear(j, j.body.width * 1.9);
    this.sombrear(this.balon, 26, true);
    Forja.vigilar(this);
    // >>> rebote
    // El balón es un círculo que rebota en los bordes (bounce) y se va frenando solo (damping + drag): eso imita el roce con el pasto.
    this.balon.body.setCircle(22, 10, 10); this.balon.setBounce(Forja.regla('balon.rebote', 0.75)).setCollideWorldBounds(true).setDamping(true).setDrag(Forja.regla('balon.frenado', 0.45));   // reglas: cuánto rebota y cuánto frena el balón
    // <<<
    // >>> bordes
    // La línea de fondo es una pared, menos entre los dos postes: por ahí el balón entra en la red. La red tiene techo,
    // piso y fondo: el balón que entra se queda adentro. Gol = el balón entero pasó la línea entre los postes.
    const muros = this.physics.add.staticGroup(), muro = (x, y, w, h) => { const z = this.add.zone(x + w / 2, y + h / 2, w, h); muros.add(z); return z; };
    for (const [x, lado] of [[CAMPO.x1, -1], [CAMPO.x2, 1]]) {
      const fuera = lado < 0 ? x - RED - 20 : x;                                   // del lado de afuera de la línea
      muro(fuera, CAMPO.y1 - 20, RED + 20, CAMPO.arcoY1 - CAMPO.y1 + 20); muro(fuera, CAMPO.arcoY2, RED + 20, CAMPO.y2 - CAMPO.arcoY2 + 20);
    }
    this.physics.add.collider(this.balon, muros);
    // <<<
    const todos = [this.heroe, this.defensa, this.arquero, this.miArquero];
    for (const j of todos) { this.physics.add.overlap(j, this.balon, () => this.toque(j)); j.setData('patada', 0); }
    this.physics.add.collider(todos, todos);                                       // los jugadores no se atraviesan: se empujan
    this.tPatada = { heroe: Forja.dura('heroe', 'golpe'), enemigo: Forja.dura('enemigo', 'golpe') };
    this.leer = Forja.controles(this); this.goles = [0, 0]; this.tiempo = Forja.regla('partido.tiempo', 90); this.fin = false; this.pausa = 0;
    this.texto = Forja.marcador(this);
  }

  // CANCHA: se dibuja con código en lienzos 2D (ningún archivo de imagen): pasto cortado en franjas con textura, líneas
  // pintadas, tribuna con hinchada, carteles, arcos con red y la luz de la hora (sol, tarde dorada o reflectores de noche).
  // Los arcos van en dos capas: lo de atrás (red del fondo, palo lejano) debajo de todo, y lo de adelante (travesaño,
  // techo de la red, palo cercano) encima de quien esté detrás de él. Así parecen de verdad tener alto y fondo.
  cancha() {
    const P = Forja.paleta(this), c = CAMPO, hora = P.hora, noche = P.noche, r = azar(D.semilla * 3 + 1), css = P.css;
    const H = 54;                                                                    // alto de los palos en pantalla
    const luzHora = noche ? [0.92, 0.97, 1.05] : hora === 'tarde' ? [1.08, 0.95, 0.78] : hora === 'amanecer' ? [1.02, 0.92, 0.95] : [1, 1, 1];
    const tono = (col, k = 1) => col.map((v, i) => Math.max(0, Math.min(255, v * luzHora[i] * k)));
    // arco: esquinas de la red (lado = -1 izquierda, 1 derecha). Frente = sobre la línea; fondo = RED px detrás.
    const arco = (lado) => {
      // lo alto se inclina un poco hacia afuera (como si la cámara estuviera sobre el centro): así se ve la boca del arco
      const gx = lado < 0 ? c.x1 : c.x2, bx = gx + lado * RED, y1 = c.arcoY1, y2 = c.arcoY2, ia = lado * H * 0.4, ib = lado * (H * 0.72 * 0.4 - 4);
      return { A: [gx, y1], B: [gx, y2], A2: [gx + ia, y1 - H], B2: [gx + ia, y2 - H], C: [bx, y1], Dd: [bx, y2], C2: [bx + ib, y1 - H * 0.72], D2: [bx + ib, y2 - H * 0.72] };
    };
    const malla = (x, q, n = 7, m = 5, alfa = 0.4) => {                            // red: rejilla dentro de un cuadrilátero
      const [p0, p1, p2, p3] = q, en = (u, v) => [0, 1].map((i) => (p0[i] * (1 - u) + p1[i] * u) * (1 - v) + (p3[i] * (1 - u) + p2[i] * u) * v);
      x.fillStyle = 'rgba(235,240,250,.06)'; x.beginPath(); x.moveTo(...p0); x.lineTo(...p1); x.lineTo(...p2); x.lineTo(...p3); x.fill();
      x.strokeStyle = `rgba(240,244,252,${alfa})`; x.lineWidth = 1; x.beginPath();
      for (let i = 0; i <= n; i++) { x.moveTo(...en(i / n, 0)); x.lineTo(...en(i / n, 1)); }
      for (let j = 0; j <= m; j++) { x.moveTo(...en(0, j / m)); x.lineTo(...en(1, j / m)); }
      x.stroke();
    };
    const palo = (x, a, b) => {                                                     // tubo blanco con borde y brillo
      for (const [w, col] of [[7, 'rgba(10,14,20,.45)'], [4.5, '#f4f6fa'], [1.4, 'rgba(255,255,255,1)']]) { x.strokeStyle = col; x.lineWidth = w; x.lineCap = 'round'; x.beginPath(); x.moveTo(a[0] - (w === 1.4 ? 1 : 0), a[1]); x.lineTo(b[0] - (w === 1.4 ? 1 : 0), b[1]); x.stroke(); }
    };
    Forja.lienzo(this, 'cancha', 960, 540, (x) => {
      // 1) pasto: franjas de corte (verticales) y un brillo cruzado muy suave, como una cancha recién cortada
      const verdes = noche ? [[44, 112, 66], [32, 92, 56], [24, 70, 44]] : hora === 'tarde' ? [[96, 156, 60], [76, 132, 50], [62, 110, 44]] : hora === 'amanecer' ? [[84, 152, 90], [66, 130, 76], [54, 110, 66]] : [[76, 160, 68], [58, 136, 56], [48, 114, 50]];
      const [claro, oscuro, borde] = verdes;
      x.fillStyle = css(borde); x.fillRect(0, 0, 960, 540);
      const fw = (c.x2 - c.x1) / 12;
      for (let i = -2; i < 14; i++) { x.fillStyle = css(i % 2 ? claro : oscuro); x.fillRect(c.x1 + i * fw, 84, fw + 0.5, 456); }
      for (let j = 0; j < 10; j++) { x.fillStyle = j % 2 ? 'rgba(255,255,255,.035)' : 'rgba(0,0,0,.035)'; x.fillRect(0, c.y1 + j * (c.y2 - c.y1) / 10, 960, (c.y2 - c.y1) / 10); }
      x.fillStyle = 'rgba(10,30,10,.22)'; x.fillRect(0, 84, 960, c.y1 - 84); x.fillRect(0, c.y2, 960, 40); x.fillRect(0, 84, c.x1 - 6, 456); x.fillRect(c.x2 + 6, 84, 60, 456);   // afuera de las líneas, el pasto está más gastado
      // 2) zonas gastadas: la boca de cada arco y el centro (tierra que asoma)
      for (const [px, py, rx, ry, a] of [[c.x1 + 26, 295, 46, 70, 0.3], [c.x2 - 26, 295, 46, 70, 0.3], [480, 295, 70, 50, 0.12], [c.x1 + 86, 295, 14, 14, 0.25], [c.x2 - 86, 295, 14, 14, 0.25]]) {
        x.save(); x.translate(px, py); x.scale(1, ry / rx); const g = x.createRadialGradient(0, 0, 0, 0, 0, rx); g.addColorStop(0, `rgba(150,128,80,${a})`); g.addColorStop(1, 'rgba(150,128,80,0)'); x.fillStyle = g; x.fillRect(-rx, -rx, rx * 2, rx * 2); x.restore();
      }
      // 3) líneas pintadas
      x.strokeStyle = 'rgba(250,252,255,.9)'; x.lineWidth = 3; x.lineCap = 'butt';
      x.strokeRect(c.x1, c.y1, c.x2 - c.x1, c.y2 - c.y1); x.beginPath(); x.moveTo(480, c.y1); x.lineTo(480, c.y2); x.stroke();
      x.beginPath(); x.arc(480, 295, 62, 0, 6.283); x.stroke();
      for (const lado of [-1, 1]) {
        const gx = lado < 0 ? c.x1 : c.x2, pen = gx - lado * 86;
        x.strokeRect(Math.min(gx, gx - lado * 120), 165, 120, 260); x.strokeRect(Math.min(gx, gx - lado * 44), 215, 44, 160);
        x.beginPath(); x.arc(pen, 295, 62, lado < 0 ? -0.93 : Math.PI - 0.93, lado < 0 ? 0.93 : Math.PI + 0.93); x.stroke();
        for (const cy of [c.y1, c.y2]) { x.beginPath(); x.arc(gx, cy, 12, lado < 0 ? (cy === c.y1 ? 0 : -Math.PI / 2) : (cy === c.y1 ? Math.PI / 2 : Math.PI), lado < 0 ? (cy === c.y1 ? Math.PI / 2 : 0) : (cy === c.y1 ? Math.PI : Math.PI * 1.5)); x.stroke(); }
        x.fillStyle = 'rgba(250,252,255,.9)'; x.beginPath(); x.arc(pen, 295, 3, 0, 6.283); x.fill();
      }
      x.fillStyle = 'rgba(250,252,255,.9)'; x.beginPath(); x.arc(480, 295, 4, 0, 6.283); x.fill();
      // 4) textura: grumos y briznas (ruido por píxel). La pintura de las líneas también queda gastada.
      const img = x.getImageData(0, 84, 960, 456), d = img.data, grumo = new Float32Array(Math.ceil(960 / 4) * Math.ceil(456 / 4)).map(() => (r() - 0.5) * 12);
      for (let y = 0; y < 456; y++) for (let px = 0; px < 960; px++) {
        const i = (y * 960 + px) * 4, n = (r() - 0.5) * 16 + grumo[(y >> 2) * 240 + (px >> 2)] + ((px * 7 + (y >> 2) * 13) % 9 === 0 ? 7 : 0);
        d[i] += n * 0.8; d[i + 1] += n; d[i + 2] += n * 0.6;
      }
      x.putImageData(img, 0, 84);
      // 5) arcos: la parte de atrás (debajo de los jugadores) y la sombra de la red sobre el pasto
      for (const lado of [-1, 1]) {
        const q = arco(lado);
        x.fillStyle = 'rgba(0,10,0,.28)'; x.beginPath(); x.moveTo(...q.A); x.lineTo(...q.B); x.lineTo(...q.Dd); x.lineTo(...q.C); x.fill();
        malla(x, [q.C2, q.D2, q.Dd, q.C], 9, 4, 0.45); malla(x, [q.A2, q.C2, q.C, q.A], 3, 4, 0.4);
        palo(x, q.C2, q.D2); palo(x, q.C, q.C2); palo(x, q.Dd, q.D2); palo(x, q.A, q.A2);
        x.fillStyle = 'rgba(0,0,0,.25)'; x.beginPath(); x.ellipse(q.A[0] + 4, q.A[1] + 2, 6, 2.5, 0, 0, 6.283); x.fill();
      }
      // 6) luz de la hora: sombra de la tribuna sobre el pasto, tarde dorada, reflectores de noche
      x.globalCompositeOperation = 'multiply';
      const sombraTribuna = hora === 'tarde' ? 150 : noche ? 40 : 70;
      const gs = x.createLinearGradient(0, 84, 0, 84 + sombraTribuna); gs.addColorStop(0, 'rgba(40,50,70,.55)'); gs.addColorStop(0.7, 'rgba(60,70,90,.3)'); gs.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = gs; x.fillRect(0, 84, 960, sombraTribuna);
      const vi = x.createRadialGradient(480, 300, 260, 480, 300, 640); vi.addColorStop(0, 'rgba(255,255,255,1)'); vi.addColorStop(1, noche ? 'rgba(52,56,96,1)' : 'rgba(170,170,180,1)');
      x.fillStyle = vi; x.fillRect(0, 0, 960, 540);
      x.globalCompositeOperation = 'screen';
      if (noche) for (const [lx, ly] of [[c.x1 + 10, 30], [c.x2 - 10, 30], [c.x1 + 10, 560], [c.x2 - 10, 560], [480, 295]]) {
        const g = x.createRadialGradient(lx, ly, 10, lx, ly, ly === 295 ? 420 : 520); g.addColorStop(0, 'rgba(255,250,230,.4)'); g.addColorStop(0.5, 'rgba(255,250,230,.12)'); g.addColorStop(1, 'rgba(255,250,230,0)'); x.fillStyle = g; x.fillRect(0, 84, 960, 456);
      } else {
        const g = x.createRadialGradient(hora === 'tarde' ? 60 : 200, 60, 30, hora === 'tarde' ? 60 : 200, 60, 900); g.addColorStop(0, hora === 'tarde' ? 'rgba(255,190,110,.3)' : 'rgba(255,248,225,.16)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 84, 960, 456);
        if (hora === 'amanecer') { const m = x.createLinearGradient(0, 84, 0, 300); m.addColorStop(0, 'rgba(255,235,240,.22)'); m.addColorStop(1, 'rgba(255,235,240,0)'); x.fillStyle = m; x.fillRect(0, 84, 960, 216); }
      }
      x.globalCompositeOperation = 'source-over';
      // 7) tribuna (fondo: muro y gradas; la gente va en otra capa para que pueda saltar en los goles)
      const muro = tono(noche ? [26, 28, 44] : [74, 78, 96]);
      const gm = x.createLinearGradient(0, 0, 0, 66); gm.addColorStop(0, css(P.mezcla(muro, [0, 0, 0], 0.45))); gm.addColorStop(1, css(muro)); x.fillStyle = gm; x.fillRect(0, 0, 960, 66);
      for (let k = 0; k < 7; k++) { const y = 10 + k * 8; x.fillStyle = css(P.mezcla(muro, [255, 255, 255], 0.12 + k * 0.02)); x.fillRect(0, y + 6, 960, 1.5); }
      // carteles: paneles con brillo arriba y la sombra que dejan sobre el pasto
      const lemas = ['FORJA', 'JUEGA LIMPIO', 'JMD', '¡A JUGAR!', 'FORJA', 'EQUIPO', 'JMD', '¡GOL!'], colores = [[24, 120, 150], [200, 70, 110], [230, 160, 40], [70, 70, 190]];
      for (let i = 0; i < 8; i++) {
        const px = i * 120, col = tono(colores[i % 4], noche ? 1.25 : 1);
        const g = x.createLinearGradient(0, 66, 0, 84); g.addColorStop(0, css(P.mezcla(col, [255, 255, 255], 0.25))); g.addColorStop(1, css(P.mezcla(col, [0, 0, 0], 0.25)));
        x.fillStyle = g; x.fillRect(px + 1, 66, 118, 18); x.fillStyle = 'rgba(255,255,255,.35)'; x.fillRect(px + 1, 66, 118, 1.5);
        x.fillStyle = 'rgba(255,255,255,.92)'; x.font = 'bold 11px system-ui, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(lemas[i], px + 60, 75.5);
      }
      const gb = x.createLinearGradient(0, 84, 0, 96); gb.addColorStop(0, 'rgba(0,0,0,.35)'); gb.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gb; x.fillRect(0, 84, 960, 12);
      // muro bajo de abajo (lo vemos desde atrás) y vallas a los costados
      const ga = x.createLinearGradient(0, 522, 0, 540); ga.addColorStop(0, css(P.mezcla(muro, [255, 255, 255], 0.25))); ga.addColorStop(0.15, css(muro)); ga.addColorStop(1, css(P.mezcla(muro, [0, 0, 0], 0.4))); x.fillStyle = ga; x.fillRect(0, 522, 960, 18);
      for (const vx of [0, 950]) { const g = x.createLinearGradient(vx, 0, vx + 10, 0); g.addColorStop(0, css(P.mezcla(muro, [0, 0, 0], vx ? 0 : 0.3))); g.addColorStop(1, css(P.mezcla(muro, [0, 0, 0], vx ? 0.3 : 0))); x.fillStyle = g; x.fillRect(vx, 84, 10, 438); }
      // torres de luz en las esquinas de la tribuna
      for (const tx of [c.x1 - 20, c.x2 - 20]) {
        x.fillStyle = css(P.mezcla(muro, [0, 0, 0], 0.3)); x.fillRect(tx, 2, 40, 14);
        for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) { x.fillStyle = noche ? '#fffbe8' : 'rgba(230,236,245,.9)'; x.fillRect(tx + 3 + i * 9, 4 + j * 6, 7, 4); }
        if (noche) { const g = x.createRadialGradient(tx + 20, 9, 2, tx + 20, 9, 70); g.addColorStop(0, 'rgba(255,252,230,.85)'); g.addColorStop(1, 'rgba(255,252,230,0)'); x.globalCompositeOperation = 'screen'; x.fillStyle = g; x.fillRect(tx - 60, 0, 160, 90); x.globalCompositeOperation = 'source-over'; }
      }
    });
    this.add.image(0, 0, 'cancha').setOrigin(0).setDepth(-5);
    // hinchada: dos cuadros (brazos arriba o abajo) que se alternan; en los goles salta
    const caras = [[255, 214, 180], [222, 170, 130], [160, 110, 80], [120, 80, 60]], camis = [[240, 120, 40], [240, 120, 40], [250, 200, 60], [70, 110, 230], [120, 80, 220], [235, 235, 240], [40, 170, 140]];
    const gente = [];
    for (let k = 0; k < 7; k++) for (let px = 6 + (k % 2) * 5; px < 956; px += 9 + r() * 4) if (r() < 0.86) gente.push({ px, y: 14 + k * 8, k: 0.72 + k * 0.05, cara: caras[Math.floor(r() * 4)], cami: camis[Math.floor(r() * camis.length)], brazo: r(), bufanda: r() < 0.12 });
    const t = Forja.lienzo(this, 'hinchada', 960, 132, (x) => {
      for (const f of [0, 1]) for (const g of gente) {
        const oy = f * 66, cuerpo = tono(g.cami, noche ? 0.55 : 1), cara = tono(g.cara, noche ? 0.55 : 1), s = g.k, y = g.y + oy, arriba = f ? g.brazo < 0.55 : g.brazo < 0.12;
        x.fillStyle = css(cuerpo); x.beginPath(); x.roundRect(g.px - 4 * s, y - 1 * s, 8 * s, 7 * s, 2.5 * s); x.fill();
        if (arriba) { x.strokeStyle = css(cuerpo); x.lineWidth = 1.8 * s; x.beginPath(); x.moveTo(g.px - 3.5 * s, y); x.lineTo(g.px - 5 * s, y - 7 * s); x.moveTo(g.px + 3.5 * s, y); x.lineTo(g.px + 5 * s, y - 7 * s); x.stroke(); }
        if (g.bufanda) { x.fillStyle = css(tono([240, 120, 40], noche ? 0.6 : 1)); x.fillRect(g.px - 7 * s, y - (arriba ? 8 : 1) * s, 14 * s, 2 * s); }
        x.fillStyle = css(cara); x.beginPath(); x.arc(g.px, y - 3.2 * s, 2.6 * s, 0, 6.283); x.fill();
      }
    });
    t.add('h0', 0, 0, 0, 960, 66); t.add('h1', 0, 0, 66, 960, 66);
    this.hinchada = this.add.image(0, 0, 'hinchada', 'h0').setOrigin(0).setDepth(-4);
    this.time.addEvent({ delay: 520, loop: true, callback: () => { if (this.hinchada.active) this.hinchada.setFrame(this.hinchada.frame.name === 'h0' ? 'h1' : 'h0'); } });
    // la parte de adelante de cada arco: encima de los jugadores que están más arriba que el palo cercano (y < arcoY2)
    Forja.lienzo(this, 'arcos', 960, 540, (x) => {
      for (const lado of [-1, 1]) {
        const q = arco(lado);
        malla(x, [q.A2, q.B2, q.D2, q.C2], 9, 3, 0.4); malla(x, [q.B2, q.D2, q.Dd, q.B], 3, 4, 0.45);
        palo(x, q.A2, q.B2); palo(x, q.B, q.B2);
        x.fillStyle = 'rgba(0,0,0,.25)'; x.beginPath(); x.ellipse(q.B[0] + 4, q.B[1] + 2, 6, 2.5, 0, 0, 6.283); x.fill();
      }
    });
    this.add.image(0, 0, 'arcos').setOrigin(0).setDepth(c.arcoY2 + 1);
    // ambiente: flashes de cámaras en la tribuna de noche y papel picado para los goles
    Forja.texturas(this);
    if (noche) Forja.lujo(this, this.add.particles(0, 0, 'mota', { emitZone: { type: 'random', source: new Phaser.Geom.Rectangle(0, 6, 960, 56) }, lifespan: 140, scale: { start: 0.35, end: 0.1 }, alpha: { start: 1, end: 0 }, blendMode: 'ADD', frequency: 260, tint: 0xffffff }).setDepth(-3));
    if (!this.textures.exists('papel')) Forja.lienzo(this, 'papel', 6, 4, (x) => { x.fillStyle = '#fff'; x.fillRect(0, 0, 6, 4); });
    this.papel = this.add.particles(0, 0, 'papel', { emitZone: { type: 'random', source: new Phaser.Geom.Rectangle(0, 0, 960, 70) }, speedY: { min: 30, max: 120 }, speedX: { min: -40, max: 40 }, gravityY: 40, rotate: { start: 0, end: 720 }, lifespan: 2600, alpha: { start: 1, end: 0 }, tint: [0xff7a2a, 0xffd23a, 0x5aa0ff, 0xffffff, 0x3ad6a0], emitting: false }).setDepth(-3);
    this.sombras = { noche, hora };
  }

  // Sombras de cada jugador según la luz: de día una, corrida hacia el lado contrario del sol; en la tarde, larga;
  // de noche, cuatro suaves (una por cada torre de luz) más la de contacto bajo los pies.
  sombrear(s, ancho, balon = false) {
    const { noche, hora } = this.sombras, k = balon ? 0.45 : 1;
    if (noche) for (const [dx, dy] of [[-9, -3], [9, -3], [-9, 3], [9, 3]]) Forja.sombra(this, s, { prof: 1, ancho, alfa: 0.16, dx: dx * k, dy: dy * k, pie: balon ? (b) => b.y + 9 : undefined });
    Forja.sombra(this, s, { prof: 1, ancho: hora === 'tarde' && !noche ? ancho * 1.7 : ancho * (noche ? 0.8 : 1.15), alfa: noche ? 0.4 : 0.5, dx: (noche ? 0 : hora === 'tarde' ? 22 : 7) * k, dy: noche ? 0 : 2, pie: balon ? (b) => b.y + 9 : undefined });
  }

  // >>> perseguir
  // Perseguir un punto: se resta «a dónde quiero ir» menos «dónde estoy», y ese vector se ajusta a la velocidad deseada.
  // Sirve igual para ir al balón, volver a casa o cubrir el arco.
  irA(j, x, y, velocidad) {
    const dx = x - j.x, dy = y - j.y, d = Math.hypot(dx, dy);
    if (d < 6) { j.setVelocity(0, 0); return d; }
    j.setVelocity(dx / d * velocidad, dy / d * velocidad);
    if (Math.abs(dx) > 4) j.setFlipX(dx < 0);
    return d;
  }
  // <<<

  toque(j) { // quien toca el balón lo empuja en la dirección en que venía; si patea, sale más fuerte
    // Recién pateado, el balón no se deja empujar por los que lo rodean (0,18 s): la patada sale aunque haya un montón de
    // jugadores encima. Y nadie patea de nuevo hasta terminar su patada (su animación entera).
    if (this.balon.getData('libre') > 0 && !j.getData('patea')) return;
    if (j.getData('patea') && j !== this.heroe && j.getData('patada') > 0) return;
    const b = this.balon, dx = b.x - j.x, dy = b.y - (j.y - 18), d = Math.hypot(dx, dy) || 1;
    const fuerza = j.getData('patea') ? (j === this.heroe ? Forja.regla('patada.fuerza', 540) : 400 * Forja.regla('rival.fuerza', 1)) : 150 + Math.hypot(j.body.velocity.x, j.body.velocity.y) * 0.9;
    let vx = dx / d, vy = dy / d;
    if (j.getData('patea')) {
      const meta = j === this.heroe || j === this.miArquero ? CAMPO.x2 + RED : CAMPO.x1 - RED, mx = meta - b.x, my = 295 + (j.getData('apunta') || 0) * 60 - b.y, m = Math.hypot(mx, my); vx = mx / m; vy = my / m;
      Forja.sonar(this, 'golpe'); this.polvo.explode(5, b.x, b.y); j.setData('patea', false); b.setData('libre', 0.18);
      j.setFlipX(vx < 0); if (j.getData('patada') <= 0) j.setData('patada', this.tPatada[j.texture.key]);   // la patada se ve entera, mirando hacia donde sale el balón
    }
    b.setVelocity(vx * fuerza, vy * fuerza);
  }

  // >>> estados
  // Máquina de estados del defensa. En cada cuadro está en UN estado y solo ahí decide si cambia a otro:
  //   volver    → regresa a su posición        (cambia a «perseguir» si el balón entra en su zona: x > ZONA)
  //   perseguir → corre hacia el balón         (cambia a «despejar» si lo alcanza, o a «volver» si el balón se aleja)
  //   despejar  → patea hacia el arco contrario (y vuelve a «perseguir»)
  pensar(dt) {
    const d = this.defensa, b = this.balon, casa = d.getData('casa');
    const enSuMitad = b.x > ZONA, cerca = Phaser.Math.Distance.Between(d.x, d.y - 18, b.x, b.y);
    switch (d.getData('estado')) {
      case 'volver': this.irA(d, casa.x, casa.y, 150 * Forja.regla('rival.velocidad', 1)); if (enSuMitad) d.setData('estado', 'perseguir'); break;
      case 'perseguir': this.irA(d, b.x + 26, b.y + 18, 185 * Forja.regla('rival.velocidad', 1)); if (cerca < 46 && d.getData('patada') <= 0) d.setData('estado', 'despejar'); else if (!enSuMitad) d.setData('estado', 'volver'); break;
      case 'despejar': d.setData({ patea: true, apunta: Math.sin(this.time.now / 300), estado: 'perseguir' }); break;
    }
    // El arquero solo tiene un estado: ponerse a la altura del balón sin salir de su arco. Si el balón viene hacia su arco,
    // no mira dónde está sino dónde VA a cruzar su línea (y + vy · t, con t = distancia ÷ vx): así ataja los tiros cruzados.
    for (const [a, x] of [[this.arquero, CAMPO.x2 - 34], [this.miArquero, CAMPO.x1 + 34]]) {
      const t = (x - b.x) / (b.body.velocity.x || 1e-6), cruza = t > 0 && t < 1.2 ? b.y + b.body.velocity.y * t : b.y;
      this.irA(a, x, Phaser.Math.Clamp(cruza + 18, CAMPO.arcoY1 + 10, CAMPO.arcoY2 + 30), 150 * (a === this.arquero ? Forja.regla('arquero.rival', 1) : Forja.regla('arquero.tuyo', 1)));
      if (Phaser.Math.Distance.Between(a.x, a.y - 18, b.x, b.y) < 50 && a.getData('patada') <= 0) a.setData({ patea: true, apunta: b.y < 295 ? -1 : 1 });
    }
  }
  // <<<

  gol(quien) {
    this.goles[quien]++; this.pausa = 1.4; this.anoto = quien; Forja.sonar(this, quien === 0 ? 'celebrar' : 'dano', 0.6);
    this.chispas.explode(30, this.balon.x, this.balon.y);
    this.papel.explode(quien === 0 ? 90 : 40);                                                                   // papel picado desde la tribuna
    this.tweens.add({ targets: this.hinchada, y: -4, duration: 140, yoyo: true, repeat: 5, ease: 'Sine.easeOut' });   // la hinchada salta
    const t = Forja.aviso(this, quien === 0 ? '¡GOOOL!' : 'Gol del rival'); this.time.delayedCall(1300, () => t.destroy());
    this.balon.setPosition(480, 295).setVelocity(0, 0); this.heroe.setPosition(250, 295); this.defensa.setPosition(640, 295); this.arquero.setPosition(CAMPO.x2 - 30, 295); this.miArquero.setPosition(CAMPO.x1 + 30, 295);
    const meta = Forja.regla('partido.goles', 3);   // regla: goles para ganar (0 = solo cuenta el tiempo)
    if ((meta && this.goles[quien] >= meta) || (this.oro && this.goles[0] !== this.goles[1])) this.terminar();
  }
  terminar() {
    if (!this.oro && this.goles[0] === this.goles[1] && Forja.regla('partido.empate', 'empate') === 'oro') { this.oro = true; this.tiempo = 9999; const t = Forja.aviso(this, 'Empate: ¡gol de oro!'); this.time.delayedCall(1500, () => t.destroy()); return; }   // regla: qué pasa si empatan
    this.fin = true; const [a, b] = this.goles; Forja.aviso(this, (a > b ? '¡Ganaste ' : a < b ? 'Perdiste ' : 'Empate ') + a + ' - ' + b + '\nR para repetir'); }

  update(t, ms) {
    const dt = ms / 1000, h = this.heroe, b = this.balon, c = this.leer();
    if (c.repetir) { this.scene.restart(); return; }
    if (c.rayosX && !Forja.rayosX(this)) this.etiquetas.forEach((e) => e.setVisible(false));
    this.texto.setText('Tú ' + this.goles[0] + ' - ' + this.goles[1] + ' Rival   ' + Math.ceil(this.tiempo) + ' s');
    const todos = [h, this.defensa, this.arquero, this.miArquero];
    // tras un gol (y al final) todos se detienen: celebra el equipo que anotó (o el que ganó), el otro se queda quieto
    const festejo = (equipo) => todos.forEach((j) => { j.setVelocity(0, 0); Forja.pose(j, equipo !== null && (j.texture.key === 'heroe') === (equipo === 0) ? 'celebrar' : 'quieto'); });
    if (this.fin) { festejo(this.goles[0] > this.goles[1] ? 0 : this.goles[0] < this.goles[1] ? 1 : null); return; }
    if (this.pausa > 0) { this.pausa -= dt; festejo(this.anoto); return; }
    this.tiempo -= dt; if (this.tiempo <= 0) return this.terminar();
    b.setData('libre', Math.max(0, (b.getData('libre') || 0) - dt));
    // tú: ocho direcciones. La diagonal se normaliza para no correr más rápido en diagonal.
    const m = Math.hypot(c.x, c.y) || 1, vel = Math.min(Forja.regla('jugador.velocidadMax', 260), D.fisica.velocidad);
    h.setVelocity(c.x / m * vel, c.y / m * vel); if (c.x) h.setFlipX(c.x < 0);
    if (c.golpeYa && h.getData('patada') <= 0) { h.setData({ patea: true, apunta: c.y, patada: this.tPatada.heroe }); this.time.delayedCall(220, () => h.setData('patea', false)); }
    this.pensar(dt);
    // >>> gol
    // Gol: el balón toca la línea de fondo Y su altura está entre los dos postes. Es una prueba de rectángulo.
    const r = b.body.halfWidth;
    if (b.x - r > CAMPO.x2) this.gol(0);
    else if (b.x + r < CAMPO.x1) this.gol(1);
    // <<<
    for (const j of todos) { // animación y orden de dibujo: quien está más abajo se dibuja encima
      j.setData('patada', Math.max(0, j.getData('patada') - dt));
      Forja.pose(j, j.getData('patada') > 0 ? 'golpe' : 'andar', { v: Forja.rapidez(j), max: 260, reinicia: j.getData('patada') > this.tPatada[j.texture.key] - dt * 1.5 });   // pasos al ritmo de lo que avanza
      j.setDepth(j.y);
    }
    b.setDepth(b.y + 12);
    if (this.verX) this.dibujarX();
  }

  dibujarX() { // rayos X: el estado de cada rival y hacia dónde va
    const g = this.capaX.clear(), d = this.defensa, a = this.arquero, b = this.balon;
    g.lineStyle(3, 0xc6ff4a, 0.9).lineBetween(d.x, d.y - 20, d.x + d.body.velocity.x * 0.5, d.y - 20 + d.body.velocity.y * 0.5);
    g.lineStyle(2, 0xff7a66, 0.9).strokeRect(CAMPO.x2, CAMPO.arcoY1, RED, CAMPO.arcoY2 - CAMPO.arcoY1).strokeRect(CAMPO.x1 - RED, CAMPO.arcoY1, RED, CAMPO.arcoY2 - CAMPO.arcoY1);   // la zona de gol: detrás de la línea
    g.lineStyle(1, 0xffffff, 0.5).lineBetween(ZONA, CAMPO.y1, ZONA, CAMPO.y2).strokeCircle(b.x, b.y, 46);
    [[d, 'defensa: ' + d.getData('estado')], [a, 'arquero: cubrir']].forEach(([j, txt], i) => {
      const e = (this.etiquetas[i] ??= this.add.text(0, 0, '', { fontFamily: 'ui-monospace, monospace', fontSize: '14px', color: '#14111c', backgroundColor: '#c6ff4a', padding: { x: 5, y: 2 } }).setDepth(960).setOrigin(0.5, 1));
      e.setVisible(true).setText(txt).setPosition(j.x, j.y - TAM * 0.86);
    });
  }
}
Forja.iniciar(Futbol);
