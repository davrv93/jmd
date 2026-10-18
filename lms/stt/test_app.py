"""Pruebas del servicio de voz a texto (sin modelo real: Whisper se sustituye por uno falso).

    docker run --rm --entrypoint python jmd/stt:latest -m unittest -v test_app

Comprueban la decodificación con PyAV (WAV y WebM/Opus, el formato que graba Chrome), el recorte a 30 s,
los topes de tamaño y de cola, la autorización de la clase y la de la nube (con el gateway simulado) y
que el modelo se suelta tras el reposo.
"""

import io
import math
import os
import struct
import threading
import unittest
import wave
from unittest import mock

os.environ["STT_TOKEN"] = "clase-prueba"  # pisa el del contenedor: las pruebas no usan el real

import numpy as np  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

import app  # noqa: E402
import nube  # noqa: E402


def wav(segundos: float, tasa: int = 16000) -> bytes:
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(tasa)
        n = int(segundos * tasa)
        w.writeframes(b"".join(struct.pack("<h", int(8000 * math.sin(2 * math.pi * 440 * i / tasa))) for i in range(n)))
    return buf.getvalue()


def webm(segundos: float) -> bytes:
    import av

    buf = io.BytesIO()
    with av.open(buf, "w", format="webm") as out:
        st = out.add_stream("libopus", rate=48000)
        st.layout = "mono"
        muestras = (np.sin(2 * np.pi * 440 * np.arange(int(48000 * segundos)) / 48000) * 8000).astype(np.int16)
        for i in range(0, len(muestras), 960):
            fr = av.AudioFrame.from_ndarray(muestras[i:i + 960].reshape(1, -1), format="s16", layout="mono")
            fr.sample_rate = 48000
            for p in st.encode(fr):
                out.mux(p)
        for p in st.encode(None):
            out.mux(p)
    return buf.getvalue()


class Segmento:
    def __init__(self, texto):
        self.text = texto


class ModeloFalso:
    def transcribe(self, muestras, **kw):
        assert muestras.dtype == np.float32 and muestras.ndim == 1
        return iter([Segmento(f" {len(muestras) / 16000:.1f} segundos ")]), type("Info", (), {"language": "es"})()


class Pruebas(unittest.TestCase):
    def setUp(self):
        self.c = TestClient(app.app)
        app._modelo = ModeloFalso()
        nube._cache.clear()
        nube._uso.clear()
        self.clase = {"Authorization": "Bearer clase-prueba"}

    def test_salud(self):
        d = self.c.get("/salud").json()
        self.assertTrue(d["ok"] and d["stt"])
        self.assertEqual(d["max_segundos"], 30.0)

    def test_wav(self):
        r = self.c.post("/stt", content=wav(2.0), headers={**self.clase, "Content-Type": "audio/wav"})
        self.assertEqual(r.status_code, 200, r.text)
        d = r.json()
        self.assertEqual(d["texto"], "2.0 segundos")
        self.assertFalse(d["recortado"])

    def test_webm_opus_multipart(self):
        r = self.c.post("/stt", files={"audio": ("dictado.webm", webm(1.5), "audio/webm")}, headers=self.clase)
        self.assertEqual(r.status_code, 200, r.text)
        self.assertAlmostEqual(r.json()["segundos_audio"], 1.5, delta=0.1)

    def test_recorta_a_30_segundos(self):
        r = self.c.post("/stt", content=wav(33.0), headers={**self.clase, "Content-Type": "audio/wav"})
        d = r.json()
        self.assertTrue(d["recortado"], d)
        self.assertLessEqual(d["segundos_audio"], 30.0)

    def test_audio_roto(self):
        r = self.c.post("/stt", content=b"esto no es audio" * 10, headers={**self.clase, "Content-Type": "audio/webm"})
        self.assertEqual(r.status_code, 400)
        self.assertEqual(r.json()["detail"]["codigo"], "audio_invalido")

    def test_audio_grande(self):
        with mock.patch.object(app, "MAX_BYTES", 1000):
            r = self.c.post("/stt", content=wav(1.0), headers={**self.clase, "Content-Type": "audio/wav"})
        self.assertEqual(r.status_code, 413)

    def test_token_de_la_clase(self):
        r = self.c.post("/stt", content=wav(0.5), headers={"Authorization": "Bearer otro", "Content-Type": "audio/wav"})
        self.assertEqual(r.status_code, 401)

    def test_cola_llena(self):
        with mock.patch.object(app, "_en_cola", app.COLA_MAX):
            r = self.c.post("/stt", content=wav(0.5), headers={**self.clase, "Content-Type": "audio/wav"})
        self.assertEqual(r.status_code, 429)
        self.assertEqual(r.json()["detail"]["codigo"], "cola_llena")

    def _gateway(self, estado, cuerpo):
        resp = mock.Mock(status_code=estado)
        resp.json.return_value = cuerpo
        return mock.patch.object(nube.httpx, "get", return_value=resp)

    def test_nube_alumno_valido_y_tope(self):
        nube_h = {"Authorization": "Bearer jg_alumno", "X-Aula-Nube": "1", "Content-Type": "audio/wav"}
        with self._gateway(200, {"sub": "alumno-1"}) as g, mock.patch.object(app, "POR_ALUMNO", 2):
            self.assertEqual(self.c.post("/stt", content=wav(0.5), headers=nube_h).status_code, 200)
            self.assertEqual(self.c.post("/stt", content=wav(0.5), headers=nube_h).status_code, 200)
            r = self.c.post("/stt", content=wav(0.5), headers=nube_h)
            self.assertEqual(r.status_code, 429)
            self.assertEqual(r.json()["detail"]["codigo"], "cupo_alumno")
            self.assertEqual(g.call_count, 1)  # caché: el gateway se consulta una vez

    def test_nube_no_acepta_el_token_de_la_clase_sin_cuenta(self):
        h = {**self.clase, "X-Aula-Nube": "1", "Content-Type": "audio/wav"}
        with self._gateway(200, {"sub": None, "anonymous": True}):
            r = self.c.post("/stt", content=wav(0.5), headers=h)
        self.assertEqual(r.status_code, 403)

    def test_nube_token_vencido(self):
        h = {"Authorization": "Bearer jg_viejo", "X-Aula-Nube": "1", "Content-Type": "audio/wav"}
        with self._gateway(401, {}):
            r = self.c.post("/stt", content=wav(0.5), headers=h)
        self.assertEqual(r.status_code, 401)
        self.assertEqual(r.json()["detail"]["codigo"], "token_invalido")

    def test_suelta_el_modelo_en_reposo(self):
        app._ultimo = 0
        with mock.patch.object(app, "REPOSO", 0):
            with app._modelo_lock:
                app._soltar()
        self.assertIsNone(app._modelo)

    def test_un_solo_trabajo_a_la_vez(self):
        dentro, maximo = [0], [0]
        candado = threading.Lock()

        class Lento(ModeloFalso):
            def transcribe(self, muestras, **kw):
                with candado:
                    dentro[0] += 1
                    maximo[0] = max(maximo[0], dentro[0])
                import time

                time.sleep(0.2)
                with candado:
                    dentro[0] -= 1
                return super().transcribe(muestras, **kw)

        app._modelo = Lento()
        hilos = [threading.Thread(target=lambda: self.c.post("/stt", content=wav(0.3), headers={**self.clase, "Content-Type": "audio/wav"})) for _ in range(3)]
        [h.start() for h in hilos]
        [h.join() for h in hilos]
        self.assertEqual(maximo[0], 1)

    def test_nube_igual_en_los_dos_servicios(self):
        otro = os.path.join(os.path.dirname(__file__), "..", "imagen", "nube.py")
        if os.path.exists(otro):  # solo en el repo; dentro de la imagen no está
            self.assertEqual(open(otro).read(), open(nube.__file__).read())


if __name__ == "__main__":
    unittest.main()
