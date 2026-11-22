import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearCronometro, formatearTiempo } from '../web/static/cronometro.js';

function relojFalso() {
  const estado = { t: 0, intervalos: new Map(), siguienteId: 1, cancelados: 0 };
  const deps = {
    ahora: () => estado.t,
    setInterval: (fn) => { const id = estado.siguienteId++; estado.intervalos.set(id, fn); return id; },
    clearInterval: (id) => { if (estado.intervalos.delete(id)) estado.cancelados++; },
  };
  const tick = () => { for (const fn of estado.intervalos.values()) fn(); };
  return { estado, deps, tick };
}

test('iniciar/pausar/reanudar/detener acumulan solo el tiempo en marcha', () => {
  const { estado, deps } = relojFalso();
  const ticks = [];
  const c = crearCronometro((ms) => ticks.push(ms), 100, deps);

  assert.equal(c.corriendo(), false);
  assert.equal(c.transcurrido(), 0);

  c.iniciar();
  assert.equal(c.corriendo(), true);
  estado.t = 1000;
  assert.equal(c.transcurrido(), 1000);

  c.pausar();
  assert.equal(c.corriendo(), false);
  estado.t = 5000; // el tiempo en pausa no cuenta
  assert.equal(c.transcurrido(), 1000);

  c.reanudar();
  assert.equal(c.corriendo(), true);
  estado.t = 5500;
  assert.equal(c.transcurrido(), 1500);

  const final = c.detener();
  assert.equal(final, 1500);
  assert.equal(c.corriendo(), false);
  estado.t = 9000;
  assert.equal(c.transcurrido(), 1500);

  // onTick se llamó en cada cambio de estado con el valor correcto
  assert.deepEqual(ticks, [0, 1000, 1000, 1500]);
  // el temporizador se cancela al pausar y detener y no quedan intervalos activos
  assert.equal(estado.intervalos.size, 0);
  assert.equal(estado.cancelados, 2);
});

test('iniciar(desdeMs) parte de un tiempo previo y pausar/reanudar repetidos son inocuos', () => {
  const { estado, deps } = relojFalso();
  const c = crearCronometro(null, 100, deps);
  estado.t = 100;
  c.iniciar(2000);
  estado.t = 500;
  assert.equal(c.transcurrido(), 2400);
  c.pausar();
  c.pausar();
  estado.t = 900;
  assert.equal(c.transcurrido(), 2400);
  c.reanudar();
  c.reanudar();
  estado.t = 1000;
  assert.equal(c.transcurrido(), 2500);
  // iniciar reinicia el acumulado
  c.iniciar();
  assert.equal(c.transcurrido(), 0);
  assert.equal(c.corriendo(), true);
});

test('los ticks reportan el tiempo real aunque el intervalo llegue tarde (sin deriva)', () => {
  const { estado, deps, tick } = relojFalso();
  const ticks = [];
  const c = crearCronometro((ms) => ticks.push(ms), 100, deps);
  c.iniciar();
  estado.t = 130; tick();   // llegó 30 ms tarde
  estado.t = 290; tick();   // llegó 90 ms tarde
  estado.t = 1000; tick();  // se saltó varios ticks
  assert.deepEqual(ticks, [0, 130, 290, 1000]);
  assert.equal(estado.intervalos.size, 1);
  c.detener();
  assert.equal(estado.intervalos.size, 0);
});

test('usa performance.now/Date.now por defecto sin fallar', () => {
  const c = crearCronometro(null, 1000);
  c.iniciar();
  assert.equal(c.corriendo(), true);
  const t = c.detener();
  assert.ok(t >= 0 && t < 1000);
});

test('formatearTiempo', () => {
  assert.equal(formatearTiempo(0), '00:00.0');
  assert.equal(formatearTiempo(65300), '01:05.3');
  assert.equal(formatearTiempo(3661000), '1:01:01.0');
  assert.equal(formatearTiempo(59999), '00:59.9');
  assert.equal(formatearTiempo(3599999), '59:59.9');
  assert.equal(formatearTiempo(36000000), '10:00:00.0');
  assert.equal(formatearTiempo(-5), '00:00.0');
  assert.equal(formatearTiempo(NaN), '00:00.0');
  assert.equal(formatearTiempo(undefined), '00:00.0');
});
