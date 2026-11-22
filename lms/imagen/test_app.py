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


class Traduccion(unittest.TestCase):
    """traducir(): sin red, con httpx.post simulado según la URL y el modelo pedidos."""

    def setUp(self):
        self.c = TestClient(app.app)
        app._trad_cache.clear()
        app._trad_or_pausa["hasta"] = 0.0
        app._cf_uso.update(dia="", neurons=0.0)
        self.llamadas = []
        mock.patch.object(app, "OR_KEY", "or-prueba").start()
        mock.patch.object(app, "TRAD_MODELOS", ["libre/uno:free", "libre/dos:free"]).start()
        mock.patch.object(app, "TRAD_RESPALDO", "deepseek/barato").start()

    def tearDown(self):
        mock.patch.stopall()

    def simular(self, respuestas):
        """respuestas: modelo -> str (traducción) | Exception | int (código HTTP de error)."""
        import httpx

        def post(url, **kw):
            j = kw.get("json") or {}
            modelo = j.get("model") or url.rsplit("/run/", 1)[-1]
            self.llamadas.append(modelo)
            r = respuestas.get(modelo, 500)
            if isinstance(r, Exception):
                raise r
            if isinstance(r, int):
                return Respuesta(r, {"error": "x"})
            if "/ai/run/" in url:
                return Respuesta(200, {"result": {"response": r, "usage": {"neurons": 1.2}}})
            return Respuesta(200, {"choices": [{"message": {"content": r}}]})

        return mock.patch.object(httpx, "post", side_effect=post)

    def test_espanol_a_ingles(self):
        with self.simular({"libre/uno:free": "A golden perfume bottle on marble, soft light"}):
            en, modelo, _ = app.traducir("una botella de perfume dorada sobre mármol, luz suave")
        self.assertEqual(en, "A golden perfume bottle on marble, soft light")
        self.assertEqual(modelo, "libre/uno:free")

    def test_ya_en_ingles_no_se_toca(self):
        with self.simular({}):
            en, modelo, _ = app.traducir('a golden perfume bottle on marble with the text "Aroma de Lima"')
        self.assertEqual(en, 'a golden perfume bottle on marble with the text "Aroma de Lima"')
        self.assertEqual(modelo, "ya-en-ingles")
        self.assertEqual(self.llamadas, [])

    def test_texto_entre_comillas_no_se_traduce(self):
        with self.simular({"libre/uno:free": 'Perfume poster with the title "QTXT1"'}):
            en, _, _ = app.traducir("afiche de perfume con el título «Esencia del Sol»")
        self.assertEqual(en, 'Perfume poster with the title "Esencia del Sol"')
        # Si el modelo se come el marcador, el texto igual llega a FLUX.
        app._trad_cache.clear()
        with self.simular({"libre/uno:free": "Perfume poster"}):
            en, _, _ = app.traducir("afiche de perfume con el título «Esencia del Sol»")
        self.assertIn('"Esencia del Sol"', en)

    def test_timeout_pasa_al_siguiente_modelo(self):
        import httpx

        with self.simular({"libre/uno:free": httpx.ReadTimeout("lento"), "libre/dos:free": "A red apple on a table"}):
            en, modelo, _ = app.traducir("una manzana roja sobre la mesa")
        self.assertEqual((en, modelo), ("A red apple on a table", "libre/dos:free"))
        self.assertEqual(self.llamadas, ["libre/uno:free", "libre/dos:free"])

    def test_respaldo_deepseek_y_luego_cloudflare(self):
        with self.simular({"libre/uno:free": 429, "libre/dos:free": 429, "deepseek/barato": "A burger"}):
            self.assertEqual(app.traducir("una hamburguesa")[1], "deepseek/barato")
        app._trad_cache.clear()
        self.llamadas.clear()
        with self.simular({app.TRAD_CF: "A burger with fries"}):
            en, modelo, _ = app.traducir("una hamburguesa con papas")
        self.assertEqual((en, modelo), ("A burger with fries", app.TRAD_CF))
        self.assertGreater(app._cf_gastado(), 1)

    def test_llave_vencida_salta_openrouter(self):
        with self.simular({"libre/uno:free": 401, app.TRAD_CF: "A cat"}):
            self.assertEqual(app.traducir("un gato")[1], app.TRAD_CF)
        self.assertEqual(self.llamadas, ["libre/uno:free", app.TRAD_CF])  # tras el 401 no prueba los demás de OpenRouter

    def test_todo_falla_devuelve_original_con_glosario(self):
        import httpx

        with self.simular({"libre/uno:free": httpx.ConnectError("x"), "libre/dos:free": 500, "deepseek/barato": "",
                           app.TRAD_CF: 503}):
            en, modelo, _ = app.traducir("una botella de perfume dorada sobre mármol")
        self.assertEqual(modelo, "glosario")
        self.assertEqual(en, "a bottle of perfume golden on marble")

    def test_cache(self):
        with self.simular({"libre/uno:free": "A blue cup of coffee"}):
            app.traducir("una taza azul de café")
            en, modelo, _ = app.traducir("una taza azul de café")
        self.assertEqual(en, "A blue cup of coffee")
        self.assertTrue(modelo.startswith("cache:"))
        self.assertEqual(self.llamadas, ["libre/uno:free"])

    def test_ruta_traducir_y_generar_en_ingles(self):
        aula = {"Authorization": "Bearer clase-prueba"}
        self.assertEqual(self.c.post("/traducir", json={"texto": "un perro"}, headers={"Authorization": "Bearer otro"}).status_code, 401)
        with self.simular({"libre/uno:free": "A dog"}):
            d = self.c.post("/traducir", json={"texto": "un perro"}, headers=aula).json()
        self.assertEqual((d["en"], d["modelo"]), ("A dog", "libre/uno:free"))
        enviados = []
        imagen = Respuesta(200, {"result": {"image": jpeg_b64(), "usage": {"neurons": 48}}})

        def post(url, **kw):
            j = kw.get("json") or {}
            if "messages" in j:
                return Respuesta(200, {"choices": [{"message": {"content": "A dog in the park"}}]})
            enviados.append(j.get("prompt"))
            return imagen

        import httpx

        with mock.patch.object(httpx, "post", side_effect=post):
            r = self.c.post("/generar", json={"prompt": "un perro en el parque", "calidad": "maxima"}, headers=aula)
        self.assertEqual(r.status_code, 200, r.text)
        self.assertEqual(enviados, ["A dog in the park"])
        self.assertEqual(r.headers["x-traduccion-modelo"], "libre/uno:free")


if __name__ == "__main__":
    unittest.main()
