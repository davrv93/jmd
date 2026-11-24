# Sitio público de cursos (Astro)

Este proyecto genera el sitio estático que se publica en `https://jmd-learn.online/cursos/`.

## Flujo (local)

```bash
~/Downloads/OpenMontage/.venv/bin/python armar.py --json datos/sitio.json
cd sitio
npm ci
npm run build
../publicar-local.sh
```

Notas:

- `armar.py --json` escribe `datos/sitio.json` y copia assets (si existen) desde `web/<slug>/` hacia `sitio/public/<slug>/`.
- `publicar-local.sh` copia `sitio/dist/` a `web/` preservando `web/taller/`.
