"""Pruebas de las reglas de la nube del kit robo-local-nube en el servicio de imagen (sin torch ni Cloudflare).

    IMAGEN_LOCAL=0 python -m unittest -v test_app        (dentro de la imagen o con fastapi, httpx y pillow)

Comprueban: desde fuera (X-Aula-Nube) solo «maxima» y la voz; «baja»/«media» dan 422 claro; tope por alumno;
cupo diario de Cloudflare (429); /salud dice qué calidades hay; /calentar no carga modelos para la nube; las
aulas (sin la cabecera) siguen con el token de la clase.
"""

import base64
import io
import os
import unittest
from unittest import mock

# Pisan los del contenedor: las pruebas nunca usan el token real ni llaman a Cloudflare (httpx va simulado).
os.environ.update(IMAGEN_TOKEN="clase-prueba", IMAGEN_LOCAL="0", CF_ACCOUNT_ID="cuenta", CF_API_TOKEN="token-cf",
                  CF_API_BASE="http://cloudflare.invalid/client/v4")

from fastapi.testclient import TestClient  # noqa: E402
from PIL import Image  # noqa: E402

import app  # noqa: E402
import nube  # noqa: E402


def jpeg_b64(lado=64):
    buf = io.BytesIO()
    Image.new("RGB", (lado, lado), (30, 90, 200)).save(buf, "JPEG")
    return base64.b64encode(buf.getvalue()).decode()


class Respuesta:
    def __init__(self, estado, cuerpo=None, texto=""):
        self.status_code = estado
        self._cuerpo = cuerpo or {}
        self.text = texto
        self.headers = {"content-type": "application/json"}
        self.content = b""

    def json(self):
        return self._cuerpo


class Pruebas(unittest.TestCase):
    def setUp(self):
        self.c = TestClient(app.app)
        nube._cache.clear()
        nube._uso.clear()
        app._cf_uso.update(dia="", neurons=0.0)
        self.fuera = {"Authorization": "Bearer jg_alumno", "X-Aula-Nube": "1"}
        self.gateway = mock.patch.object(nube.httpx, "get", return_value=Respuesta(200, {"sub": "alumno-1"}))
        self.gateway.start()

    def tearDown(self):
        mock.patch.stopall()

    def test_salud_desde_fuera_solo_maxima(self):
        d = self.c.get("/salud", headers={"X-Aula-Nube": "1"}).json()
        self.assertEqual(d["calidades"], {"baja": False, "media": False, "maxima": True})

    def test_baja_y_media_no_disponibles_desde_fuera(self):
        for calidad in ("baja", "media"):
            r = self.c.post("/generar", json={"prompt": "a robot", "calidad": calidad}, headers=self.fuera)
            self.assertEqual(r.status_code, 422, r.text)
            self.assertEqual(r.json()["detail"]["codigo"], "calidad_no_disponible")
            self.assertIn("no está disponible", r.json()["detail"]["mensaje"])

    def test_maxima_desde_fuera(self):
        import httpx

        with mock.patch.object(httpx, "post", return_value=Respuesta(200, {"result": {"image": jpeg_b64(), "usage": {"neurons": 48}}})) as cf:
            r = self.c.post("/generar", json={"prompt": "a robot", "calidad": "maxima", "orientacion": "vertical"}, headers=self.fuera)
        self.assertEqual(r.status_code, 200, r.text)
        self.assertEqual(r.headers["content-type"], "image/jpeg")
        self.assertTrue(cf.call_args.args[0].startswith(app.CF_API))
        self.assertEqual(round(app._cf_gastado()), 48)

    def test_tope_por_alumno(self):
        import httpx

        with mock.patch.object(httpx, "post", return_value=Respuesta(200, {"result": {"image": jpeg_b64()}})), \
                mock.patch.object(app, "MAXIMA_POR_ALUMNO", 2):
            codigos = [self.c.post("/generar", json={"prompt": "x", "calidad": "maxima"}, headers=self.fuera).status_code for _ in range(3)]
        self.assertEqual(codigos, [200, 200, 429])

    def test_cupo_diario_de_cloudflare(self):
        app._cf_uso.update(dia=app.time.strftime("%Y-%m-%d", app.time.gmtime()), neurons=app.CF_TOPE)
        r = self.c.post("/generar", json={"prompt": "x", "calidad": "maxima"}, headers=self.fuera)
        self.assertEqual(r.status_code, 429)
        self.assertIn("cupo diario", r.json()["detail"])
        self.assertFalse(self.c.get("/salud").json()["maxima"])

    def test_sin_token_desde_fuera(self):
        mock.patch.stopall()
        with mock.patch.object(nube.httpx, "get", return_value=Respuesta(401)):
            r = self.c.post("/generar", json={"prompt": "x", "calidad": "maxima"}, headers={"X-Aula-Nube": "1", "Authorization": "Bearer jg_malo"})
        self.assertEqual(r.status_code, 401)

    def test_calentar_desde_fuera_no_carga(self):
        with mock.patch.object(app, "_cargar") as cargar:
            d = self.c.post("/calentar", headers=self.fuera).json()
        self.assertEqual(d["cargado"], [])
        cargar.assert_not_called()

    def test_aula_sigue_con_el_token_de_la_clase(self):
        r = self.c.post("/generar", json={"prompt": "x", "calidad": "baja"}, headers={"Authorization": "Bearer otro"})
        self.assertEqual(r.status_code, 401)
        r = self.c.post("/generar", json={"prompt": "x", "calidad": "baja"}, headers={"Authorization": "Bearer clase-prueba"})
        self.assertEqual(r.status_code, 422)  # IMAGEN_LOCAL=0: sin sd-turbo, baja no existe tampoco para el aula

    def test_nube_igual_en_los_dos_servicios(self):
        otro = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "stt", "nube.py")
        if os.path.exists(otro):
            self.assertEqual(open(otro).read(), open(nube.__file__).read())


if __name__ == "__main__":
    unittest.main()
