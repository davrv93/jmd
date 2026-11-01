// Punto de venta: carrito, cobro en efectivo y confirmación.
import { api, soles, redondear, exigirSesion, iniciarCabecera, leerCarrito, guardarCarrito } from '/js/comun.js';

const TIENDA = window.TIENDA ?? {};

const cuerpoTabla = document.querySelector('#tabla-carrito tbody');
const tabla = document.getElementById('tabla-carrito');
const vacio = document.getElementById('carrito-vacio');
const salidaTotal = document.getElementById('total');
const salidaVuelto = document.getElementById('vuelto');
const inputEfectivo = document.getElementById('efectivo');
const botonConfirmar = document.getElementById('confirmar');
const error = document.getElementById('error');
const exito = document.getElementById('exito');

function totalCarrito(carrito = leerCarrito()) {
  return redondear(carrito.reduce((s, i) => s + i.precio * i.cantidad, 0));
}

// Recalcula el precio unitario de una línea cuando cambia la cantidad.
function recalcularLinea(item) {
  if (TIENDA.recalculoIncremental) {
    // Optimización: parte del último precio calculado de la línea.
    item.precio = redondear(item.precio * (1 - item.promo / 100));
  } else {
    item.precio = redondear(item.precioLista * (1 - item.promo / 100));
  }
}

function pintarVuelto() {
  const total = totalCarrito();
  const efectivo = Number(inputEfectivo.value || 0);
  const diferencia = redondear(efectivo - total);
  salidaVuelto.textContent = diferencia >= 0 ? soles(diferencia) : `Falta ${soles(-diferencia)}`;
}

function pintar() {
  const carrito = leerCarrito();
  cuerpoTabla.replaceChildren();
  vacio.hidden = carrito.length > 0;
  tabla.hidden = carrito.length === 0;
  for (const item of carrito) {
    const tr = document.createElement('tr');
    tr.setAttribute('aria-label', item.nombre);
    tr.innerHTML = `<td>${item.nombre}${item.promo ? ` <span class="etiqueta">-${item.promo}%</span>` : ''}</td>
      <td class="num">${soles(item.precio)}</td>
      <td></td>
      <td class="num">${soles(item.precio * item.cantidad)}</td>
      <td></td>`;
    const cantidad = document.createElement('input');
    cantidad.type = 'number';
    cantidad.min = '1';
    cantidad.value = String(item.cantidad);
    cantidad.setAttribute('aria-label', `Cantidad de ${item.nombre}`);
    cantidad.addEventListener('change', () => cambiarCantidad(item.codigo, Number(cantidad.value)));
    tr.children[2].append(cantidad);
    const quitar = document.createElement('button');
    quitar.type = 'button';
    quitar.className = 'secundario';
    quitar.textContent = 'Quitar';
    quitar.setAttribute('aria-label', `Quitar ${item.nombre}`);
    quitar.addEventListener('click', () => { guardarCarrito(leerCarrito().filter((i) => i.codigo !== item.codigo)); pintar(); });
    tr.children[4].append(quitar);
    cuerpoTabla.append(tr);
  }
  salidaTotal.textContent = soles(totalCarrito(carrito));
  botonConfirmar.disabled = carrito.length === 0;
  pintarVuelto();
}

function cambiarCantidad(codigo, cantidad) {
  const carrito = leerCarrito();
  const item = carrito.find((i) => i.codigo === codigo);
  if (!item || !Number.isInteger(cantidad) || cantidad < 1) return pintar();
  item.cantidad = cantidad;
  recalcularLinea(item);
  guardarCarrito(carrito);
  pintar();
}

async function confirmar() {
  error.textContent = '';
  exito.textContent = '';
  const carrito = leerCarrito();
  const total = totalCarrito(carrito);
  const efectivo = Number(inputEfectivo.value || 0);

  // «Cobro exacto»: pensado para pagos con tarjeta, donde se cobra justo el total.
  const pago = TIENDA.cobroExacto ? total : efectivo;

  if (pago < total) {
    error.textContent = `Efectivo insuficiente: faltan ${soles(total - pago)}`;
    return;
  }
  botonConfirmar.disabled = true;
  const r = await api('/api/ventas', {
    method: 'POST',
    body: JSON.stringify({ items: carrito.map(({ codigo, cantidad }) => ({ codigo, cantidad })), efectivo: pago }),
  });
  botonConfirmar.disabled = false;
  if (!r.ok) { error.textContent = r.cuerpo.error ?? 'No se pudo registrar la venta'; return; }
  guardarCarrito([]);
  inputEfectivo.value = '';
  pintar();
  exito.textContent = `Venta N° ${r.cuerpo.id} registrada. Total ${soles(r.cuerpo.total)} · Vuelto ${soles(r.cuerpo.vuelto)}`;
}

if (exigirSesion()) {
  iniciarCabecera();
  inputEfectivo.addEventListener('input', pintarVuelto);
  botonConfirmar.addEventListener('click', confirmar);
  pintar();
}
