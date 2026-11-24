# Diseño (3 direcciones)

Objetivo: que `/cursos/` se vea realmente bonito sin perder comportamiento (filtro por fecha, “Marcar”, modal de código, enlaces).

## Dirección A — **Tinta & Papel (Editorial)**

**Mood:** elegante, editorial, alto contraste; “revista” + tarjetas con profundidad.

**Tokens (light/dark):**

```css
:root{
  --bg: #0b0c10;
  --surface: rgba(255,255,255,.06);
  --surface2: rgba(255,255,255,.09);
  --line: rgba(255,255,255,.14);
  --text: #f6f3ee;
  --muted: rgba(246,243,238,.72);
  --shadow: 0 18px 60px rgba(0,0,0,.55);
  --radius: 18px;
}
@media (prefers-color-scheme: light){
  :root{
    --bg:#fbfaf7;
    --surface: rgba(16,14,10,.06);
    --surface2: rgba(16,14,10,.09);
    --line: rgba(16,14,10,.14);
    --text:#120f0b;
    --muted: rgba(18,15,11,.68);
    --shadow: 0 18px 60px rgba(0,0,0,.10);
  }
}
```

**Tipografía:**

- Display: `ui-serif, Iowan Old Style, Georgia, Times, serif`
- Texto: `ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif`

**Escala:** 12 / 14 / 16 / 18 / 22 / 28 / 36 / 48.

**Motion:** entradas cortas, easing suave, micro-interacciones (hover/focus) y reordenamiento tipo Flip en filtros.

---

## Dirección B — **Neón sobrio (Tech nocturno)**

**Mood:** moderno, oscuro, acentos por área con glow sutil; “panel premium”.

**Tokens:** fondos casi negros, bordes con gradientes, sombras internas ligeras.

**Motion:** highlights en hover, borde que “respira”, scroll-reveal con stagger.

---

## Dirección C — **Claro táctil (Producto accesible)**

**Mood:** luminoso, aireado, tarjetas grandes con micro-sombras, chip/etiquetas muy claras.

**Tokens:** fondos blancos cálidos, líneas suaves, acentos por área, poco ruido.

**Motion:** transiciones discretas, foco muy visible, nada de efectos agresivos.

---

## Elección

**Elegimos Dirección A (Tinta & Papel)** porque:

- funciona igual de bien en oscuro y claro sin perder contraste AA;
- permite jerarquía tipográfica fuerte sin depender de fuentes externas;
- se siente “premium” sin parecer plantilla.
