// Forja · proceso hijo con el modelo de embeddings (multilingual-e5-small, ONNX, CPU). Vive aparte del servidor para
// que, al matarlo por inactividad, el sistema recupere TODA su memoria (unos 600 MB). El servidor lo crea cuando hace falta.
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
try {
  const { pipeline, env } = await import('@huggingface/transformers');
  env.cacheDir = process.env.FORJA_MODELOS || path.join(AQUI, 'modelos');
  env.allowRemoteModels = process.env.FORJA_DESCARGAR === '1'; // en producción el modelo ya está en disco
  const ex = await pipeline('feature-extraction', 'Xenova/multilingual-e5-small', { dtype: 'q8', session_options: { intraOpNumThreads: 1, interOpNumThreads: 1 } });
  process.on('message', async (m) => {
    try { process.send({ id: m.id, vectores: (await ex(m.textos, { pooling: 'mean', normalize: true })).tolist() }); }
    catch (e) { process.send({ id: m.id, error: String(e && e.message || e) }); }
  });
  process.send({ listo: true });
} catch (e) { process.send({ fallo: String(e && e.message || e) }); process.exit(1); }
