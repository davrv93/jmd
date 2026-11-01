// Semillas de datos de «Tienda Sol».
//
// Uso:
//   node semilla.mjs                      -> reescribe datos/semilla.json (determinista)
//   node semilla.mjs --aleatoria          -> datos aleatorios con semilla nueva (la imprime)
//   node semilla.mjs --aleatoria --semilla=1234   -> repite exactamente los mismos datos
//
// Una semilla determinista hace que cada prueba arranque con los MISMOS datos:
// mismo stock, mismos precios, mismos usuarios. Si los datos cambian entre
// corridas, una prueba puede pasar hoy y fallar mañana sin que el código cambie
// (prueba «inestable» o flaky).

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const aqui = dirname(fileURLToPath(import.meta.url));
export const RUTA_SEMILLA = join(aqui, 'datos', 'semilla.json');

// Datos base: nombres peruanos, precios en soles (S/).
const USUARIOS = [
  { usuario: 'admin', clave: 'admin123', nombre: 'Rosa Quispe', rol: 'administrador' },
  { usuario: 'cajero', clave: 'cajero123', nombre: 'Luis Huamán', rol: 'cajero' },
];

const PRODUCTOS = [
  // codigo, nombre, categoria, precio, stock, vencimiento, promo (% descuento)
  ['P001', 'Inca Kola 500 ml', 'Bebidas', 2.5, 48, '2027-06-30', 0],
  ['P002', 'Chicha morada Gloria 1 L', 'Bebidas', 4.9, 20, '2027-02-15', 0],
  ['P003', 'Agua San Luis 625 ml', 'Bebidas', 1.8, 60, '2027-12-31', 0],
  ['P004', 'Café Altomayo 200 g', 'Abarrotes', 18.9, 12, '2027-09-01', 10],
  ['P005', 'Arroz Costeño 5 kg', 'Abarrotes', 24.5, 15, '2027-11-30', 0],
  ['P006', 'Azúcar rubia Dulfina 1 kg', 'Abarrotes', 4.2, 30, '2027-10-10', 0],
  ['P007', 'Aceite Primor 1 L', 'Abarrotes', 11.9, 18, '2027-08-20', 0],
  ['P008', 'Leche Gloria azul 400 g', 'Lácteos', 4.1, 40, '2027-05-05', 0],
  ['P009', 'Yogurt Laive fresa 1 L', 'Lácteos', 7.5, 10, '2026-12-20', 0],
  ['P010', 'Queso fresco de Cajamarca 500 g', 'Lácteos', 16.0, 6, '2026-11-25', 0],
  ['P011', 'Galletas Soda Field', 'Snacks', 1.2, 80, '2027-04-01', 0],
  ['P012', 'Papas Lay\'s clásicas 42 g', 'Snacks', 2.0, 35, '2027-03-15', 0],
  ['P013', 'Chocolate Sublime 30 g', 'Snacks', 1.5, 50, '2027-07-07', 0],
  ['P014', 'Cancha serrana 200 g', 'Snacks', 3.5, 22, '2027-01-31', 0],
  ['P015', 'Panetón D\'Onofrio 900 g', 'Temporada', 32.9, 8, '2027-01-15', 10],
  ['P016', 'Ají amarillo molido Tarí 400 g', 'Abarrotes', 6.8, 14, '2027-06-01', 0],
  ['P017', 'Jabón Bolívar 190 g', 'Limpieza', 3.9, 25, '2028-01-01', 0],
  ['P018', 'Detergente Opal 900 g', 'Limpieza', 9.5, 0, '2028-01-01', 0], // sin stock
  ['P019', 'Papel higiénico Suave x4', 'Limpieza', 6.5, 30, '2028-06-01', 0],
  ['P020', 'Mazamorra morada Negrita 150 g', 'Postres', 3.2, 9, '2025-01-31', 0], // vencido
];

export function semillaDeterminista() {
  return {
    descripcion: 'Semilla determinista de Tienda Sol (no editar a mano sin avisar al equipo de QA)',
    usuarios: USUARIOS,
    productos: PRODUCTOS.map(([codigo, nombre, categoria, precio, stock, vencimiento, promo]) => ({
      codigo, nombre, categoria, precio, stock, vencimiento, promo,
    })),
  };
}

// PRNG con semilla (mulberry32): la misma semilla produce la misma secuencia.
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function semillaAleatoria(semilla = Math.floor(Math.random() * 1e9)) {
  const azar = mulberry32(semilla);
  const base = semillaDeterminista();
  base.descripcion = `Semilla aleatoria reproducible (semilla=${semilla})`;
  base.semilla = semilla;
  base.productos = base.productos.map((p) => ({
    ...p,
    // precio +-20 % redondeado a 10 céntimos; stock entre 0 y 50
    precio: Math.round(p.precio * (0.8 + azar() * 0.4) * 10) / 10,
    stock: Math.floor(azar() * 51),
  }));
  return base;
}

export function leerSemilla() {
  return JSON.parse(readFileSync(RUTA_SEMILLA, 'utf8'));
}

// --- uso por consola ---
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const args = process.argv.slice(2);
  if (args.includes('--aleatoria')) {
    const arg = args.find((a) => a.startsWith('--semilla='));
    const semilla = arg ? Number(arg.split('=')[1]) : Math.floor(Math.random() * 1e9);
    const datos = semillaAleatoria(semilla);
    console.log(`Semilla usada: ${semilla}   (repite con: node semilla.mjs --aleatoria --semilla=${semilla})`);
    console.table(datos.productos.slice(0, 5).map(({ codigo, nombre, precio, stock }) => ({ codigo, nombre, precio, stock })));
    console.log('… (solo se muestran 5 de', datos.productos.length, 'productos; no se escribe ningún archivo)');
  } else {
    writeFileSync(RUTA_SEMILLA, JSON.stringify(semillaDeterminista(), null, 2) + '\n');
    console.log('Escrito', RUTA_SEMILLA);
  }
}
