package main

// Banco de preguntas de los chips IA. Temas que pidió el curso para la
// apertura de la clase 3 del Grupo 5: IA, API de WhatsApp, tipos de IA,
// modelos, proveedores, tokens, audio, texto y FLUX. En el código la opción
// correcta es SIEMPRE la primera; el servidor baraja el orden al entregarla y
// nunca manda cuál es la buena hasta que la persona responde.
type Pregunta struct {
	ID          int
	Tema        string
	Texto       string
	Opciones    [3]string
	Explicacion string
}

var banco = []Pregunta{
	// --- IA ---
	{1, "IA", "¿Qué es un prompt?",
		[3]string{"Lo que le escribes al modelo para pedirle algo", "El precio de cada respuesta", "Un tipo de tarjeta de video"},
		"El prompt es tu pedido: mientras más claro, mejor la respuesta."},
	{2, "IA", "¿Qué es una «alucinación» de la IA?",
		[3]string{"Una respuesta inventada que suena segura", "Cuando el modelo se apaga solo", "Una imagen generada a propósito"},
		"El modelo puede inventar con mucha seguridad: por eso se revisa lo que responde."},
	{3, "IA", "¿Qué hace un agente de IA?",
		[3]string{"Pone un modelo en un bucle: decide, usa una herramienta, mira el resultado y repite", "Responde una sola vez y se apaga", "Entrena un modelo nuevo desde cero"},
		"El agente es el bucle: decidir, usar una herramienta, mirar y repetir."},
	{4, "IA", "¿Qué conviene hacer con lo que responde la IA?",
		[3]string{"Revisarlo antes de usarlo", "Copiarlo sin leer", "Borrarlo siempre"},
		"La IA ayuda, pero la revisión es tuya."},
	{5, "IA", "Un buen prompt para tu agente incluye…",
		[3]string{"Qué quieres, con qué datos y cómo sabrás que quedó bien", "Solo la palabra «hazlo»", "Comandos de terminal para copiar"},
		"Pedido, contexto y comprobación: así el agente sabe cuándo terminó."},
	{6, "IA", "¿Qué es el contexto de un modelo?",
		[3]string{"Todo lo que el modelo tiene delante en una petición", "El historial de tu navegador", "La marca de tu laptop"},
		"El contexto es la mesa de trabajo: lo que no cabe, no se ve."},

	// --- Tipos de IA ---
	{10, "Tipos de IA", "Un modelo que recibe texto y devuelve texto es…",
		[3]string{"Un modelo de lenguaje (LLM)", "Un modelo de difusión", "Un sintetizador de voz"},
		"El LLM predice el texto token a token."},
	{11, "Tipos de IA", "Un modelo que crea imágenes a partir de ruido, paso a paso, es…",
		[3]string{"Un modelo de difusión", "Un modelo de lenguaje", "Un reconocedor de voz"},
		"La difusión parte de ruido y lo va limpiando hasta que aparece la imagen."},
	{12, "Tipos de IA", "Un modelo «multimodal»…",
		[3]string{"Entiende más de un tipo de dato, por ejemplo texto e imagen", "Solo funciona en varios idiomas", "Corre en varias laptops a la vez"},
		"Multimodal = varias formas de entrada: texto, imagen, audio."},
	{13, "Tipos de IA", "Pasar de voz a texto se llama…",
		[3]string{"STT (speech to text)", "TTS (text to speech)", "OCR"},
		"STT escucha y escribe; TTS lee en voz alta."},
	{14, "Tipos de IA", "Pasar de texto a voz se llama…",
		[3]string{"TTS (text to speech)", "STT (speech to text)", "RAG"},
		"TTS convierte lo escrito en audio, como Piper en el aula."},
	{15, "Tipos de IA", "Un modelo de embeddings sirve para…",
		[3]string{"Convertir texto en números y comparar qué tan parecidos son", "Dibujar logotipos", "Comprimir videos"},
		"Con embeddings se busca por significado, no por palabra exacta."},
	{16, "Tipos de IA", "La IA generativa…",
		[3]string{"Crea contenido nuevo: texto, imagen, audio o código", "Solo clasifica fotos en carpetas", "Solo funciona con internet de fibra"},
		"Generativa = produce algo que antes no existía."},

	// --- Modelos ---
	{20, "Modelos", "¿Qué controla «temperature»?",
		[3]string{"Cuánto improvisa el modelo", "La temperatura de la laptop", "Cuántos archivos puede abrir"},
		"Temperatura alta = más creativo; baja = más predecible."},
	{21, "Modelos", "Un modelo «de razonamiento» (thinking)…",
		[3]string{"Piensa en pasos antes de contestar: suele ser más lento y gasta más tokens", "Nunca se equivoca", "No necesita prompt"},
		"Pensar más cuesta tiempo y tokens; úsalo cuando la tarea lo pide."},
	{22, "Modelos", "¿Qué significa que un modelo tenga «pesos abiertos»?",
		[3]string{"Puedes descargarlo y correrlo en tu propia máquina", "Es gratis en cualquier nube", "No tiene límite de tokens"},
		"Pesos abiertos: el archivo del modelo es tuyo para correrlo local."},
	{23, "Modelos", "Un modelo pequeño corriendo en tu laptop sirve sobre todo para…",
		[3]string{"Tareas cortas, privadas y sin depender de internet", "Entrenar otros modelos", "Generar video en 4K"},
		"Edge AI: rápido, privado y sin cuota, a cambio de menos capacidad."},
	{24, "Modelos", "«Gemini Flash» frente a «Gemini Pro», en general…",
		[3]string{"Flash es más rápido y barato; Pro razona más", "Flash solo hace imágenes", "Pro solo funciona sin internet"},
		"Las versiones rápidas sirven para el día a día; las grandes, para lo difícil."},
	{25, "Modelos", "La ventana de contexto de un modelo es…",
		[3]string{"Cuántos tokens puede tener delante a la vez", "La ventana del navegador donde lo usas", "El horario en que responde"},
		"Si la conversación pasa la ventana, lo más viejo se pierde."},

	// --- Proveedores ---
	{30, "Proveedores", "¿Qué es un proveedor de IA?",
		[3]string{"Quien aloja el modelo y lo sirve por una API con clave y cuota", "El cable de red del aula", "La carpeta de las skills"},
		"El proveedor te alquila el modelo por una API."},
	{31, "Proveedores", "OpenRouter es…",
		[3]string{"Un intermediario que da muchos modelos de varios proveedores con una sola clave", "Un modelo de imagen", "Un router wifi"},
		"Una clave, muchos modelos: por eso el curso lo usa."},
	{32, "Proveedores", "El proveedor responde «429». ¿Qué pasó?",
		[3]string{"Te pasaste de la cuota o del ritmo de pedidos", "La clave es correcta y todo salió bien", "El modelo no existe"},
		"429 = demasiadas peticiones: espera o cambia de modelo."},
	{33, "Proveedores", "El proveedor responde «401». ¿Qué pasa?",
		[3]string{"La clave falta o no es válida", "Se acabó la memoria de la laptop", "El prompt es muy corto"},
		"401 = no autorizado: revisa la clave."},
	{34, "Proveedores", "¿Para qué el gateway de la clase tiene una cadena de varios modelos?",
		[3]string{"Si uno falla por cuota, pasa al siguiente sin que lo notes", "Para cobrar más", "Para que respondan todos a la vez"},
		"Respaldo en cadena: un modelo caído no tumba la clase."},
	{35, "Proveedores", "¿Dónde va la clave de la API de un proveedor?",
		[3]string{"En una variable de entorno o un archivo .env que no se sube a git", "Dentro del HTML de la página", "En el mensaje de WhatsApp"},
		"La clave nunca va en el código ni en el navegador del cliente."},

	// --- Tokens ---
	{40, "Tokens", "¿Qué es un token?",
		[3]string{"Un pedacito de texto que el modelo lee y cobra", "Una contraseña del gateway", "Una carpeta de skills"},
		"Los modelos leen y cobran en tokens: pedacitos de palabras."},
	{41, "Tokens", "Los proveedores suelen cobrar…",
		[3]string{"Por separado los tokens de entrada y los de salida", "Una tarifa fija por día", "Solo por las imágenes"},
		"Entrada (lo que mandas) y salida (lo que escribe) tienen precio distinto."},
	{42, "Tokens", "«max_tokens» controla…",
		[3]string{"Cuánto puede escribir el modelo en la respuesta", "Cuántos alumnos entran al aula", "El tamaño de la pantalla"},
		"max_tokens pone un tope al largo de la respuesta."},
	{43, "Tokens", "¿Qué ahorra más tokens en un agente?",
		[3]string{"Darle solo el contexto que necesita la tarea", "Pegar todo el proyecto en cada mensaje", "Repetir el prompt tres veces"},
		"Menos contexto inútil = menos tokens y respuestas más enfocadas."},
	{44, "Tokens", "En español, una palabra suele ser…",
		[3]string{"Uno o varios tokens", "Siempre exactamente un token", "Medio token"},
		"Las palabras largas o raras se parten en varios tokens."},

	// --- Texto ---
	{50, "Texto", "Para que el bot responda en JSON, conviene…",
		[3]string{"Pedir el formato exacto y validar la respuesta antes de usarla", "Confiar en que siempre sale bien", "Pedirlo en mayúsculas"},
		"El modelo puede romper el formato: el código siempre valida."},
	{51, "Texto", "El mensaje de sistema (system prompt) sirve para…",
		[3]string{"Darle al modelo su personalidad y sus reglas", "Apagar el modelo", "Guardar la clave"},
		"El sistema es el guion fijo; el usuario trae la pregunta."},
	{52, "Texto", "Tu robot no encuentra la respuesta en las preguntas frecuentes. Lo correcto es…",
		[3]string{"Decir que no está seguro y ofrecer a una persona", "Inventar algo creíble", "No responder nada"},
		"Mejor un «no sé» honesto que una alucinación."},
	{53, "Texto", "RAG significa que el modelo…",
		[3]string{"Busca primero en tus documentos y responde con lo que encontró", "Responde más rápido", "Genera imágenes"},
		"Recuperar y luego generar: responde con tus datos, no de memoria."},

	// --- Audio ---
	{60, "Audio", "¿Qué hace Whisper?",
		[3]string{"Transcribe voz a texto", "Genera imágenes", "Envía mensajes de WhatsApp"},
		"Whisper es un modelo STT: escucha y escribe."},
	{61, "Audio", "En el modo LIVE, el botón del micrófono…",
		[3]string{"Convierte lo que dices en texto para tu prompt", "Graba un video", "Llama por teléfono al instructor"},
		"Dictar es STT: tu voz se vuelve texto que luego puedes corregir."},
	{62, "Audio", "Piper, en el servidor de la clase, sirve para…",
		[3]string{"Leer un texto en voz alta (TTS)", "Transcribir audios", "Dibujar con FLUX"},
		"Piper es TTS: le das texto y devuelve un audio WAV."},
	{63, "Audio", "Un audio de WhatsApp llega a tu webhook. Para que el bot lo entienda…",
		[3]string{"Hay que transcribirlo a texto primero", "El modelo de texto lo lee tal cual", "No se puede hacer nada nunca"},
		"Audio → STT → texto → modelo: cada paso tiene su IA."},
	{64, "Audio", "¿Por qué la página pide permiso para usar el micrófono?",
		[3]string{"Porque el navegador protege tu privacidad", "Porque el micrófono cuesta tokens", "Porque falta instalar Docker"},
		"Sin tu permiso, ninguna página puede escucharte."},

	// --- FLUX ---
	{70, "FLUX", "¿Qué es FLUX?",
		[3]string{"Un modelo que genera imágenes a partir de un texto", "Un modelo de voz", "Una base de datos"},
		"FLUX convierte tu prompt en imagen."},
	{71, "FLUX", "¿Por qué no se le pide a FLUX que escriba el precio en la imagen?",
		[3]string{"Los modelos de imagen suelen deformar las letras y los números", "Porque cobra por cada letra", "Porque FLUX no sabe español"},
		"El texto exacto se pone encima con código, no lo dibuja el modelo."},
	{72, "FLUX", "Un buen prompt de imagen dice…",
		[3]string{"Estilo, ambiente, encuadre y colores", "Solo «haz algo bonito»", "El precio en soles"},
		"Mientras más concreto el estilo y el encuadre, mejor sale."},
	{73, "FLUX", "La «semilla» (seed) de una imagen sirve para…",
		[3]string{"Repetir la misma imagen con el mismo prompt", "Que la imagen pese menos", "Plantar un árbol en la imagen"},
		"Misma semilla y mismo prompt = misma imagen."},
	{74, "FLUX", "¿Qué conviene evitar al generar imágenes para un negocio?",
		[3]string{"Marcas y personajes de otros", "Colores cálidos", "Fondos simples"},
		"Lo que no es tuyo no va en tu publicidad."},

	// --- API de WhatsApp ---
	{80, "API de WhatsApp", "¿Qué es un webhook?",
		[3]string{"Una dirección tuya a la que otro sistema avisa cuando pasa algo", "Un tipo de virus", "Un modelo de lenguaje"},
		"WhatsApp no espera a que preguntes: te avisa a tu webhook."},
	{81, "API de WhatsApp", "¿Cómo se vincula un número a Evolution Go?",
		[3]string{"Escaneando un QR desde WhatsApp → Dispositivos vinculados", "Mandando un SMS al proveedor", "Instalando Evolution en el celular"},
		"El QR vincula el número como si fuera WhatsApp Web."},
	{82, "API de WhatsApp", "¿Qué indica \"LoggedIn\": true en /instance/status?",
		[3]string{"Que el número ya está vinculado", "Que el bot ya respondió", "Que la clave es incorrecta"},
		"LoggedIn = sesión de WhatsApp lista para enviar y recibir."},
	{83, "API de WhatsApp", "Para enviar un texto con Evolution Go usas…",
		[3]string{"POST /send/text con el número y el texto", "GET /instance/qr", "DELETE /instance"},
		"/send/text manda; /instance/qr es solo para vincular."},
	{84, "API de WhatsApp", "¿Por qué el webhook responde 200 enseguida y atiende después?",
		[3]string{"Si tarda, Evolution reintenta y el cliente recibe la respuesta doble", "Para gastar menos luz", "Porque WhatsApp lo exige por ley"},
		"Responder rápido y trabajar en segundo plano evita reintentos."},
	{85, "API de WhatsApp", "El bot se responde a sí mismo sin parar. ¿Qué falta?",
		[3]string{"Ignorar los mensajes IsFromMe (los que manda el propio número)", "Un modelo más grande", "Más memoria RAM"},
		"Sin ese filtro, el bot lee su propia respuesta y vuelve a contestar."},
	{86, "API de WhatsApp", "La API oficial de WhatsApp (Cloud API de Meta)…",
		[3]string{"Pide plantillas aprobadas para escribir fuera de la ventana de 24 horas", "Deja mandar lo que quieras a cualquiera", "Solo funciona en iPhone"},
		"Pasadas 24 h sin mensaje del cliente, solo se puede escribir con plantilla."},
	{87, "API de WhatsApp", "¿Para qué sirve el ID único de cada mensaje que llega?",
		[3]string{"Para no atender dos veces el mismo mensaje si llega repetido", "Para saber la edad del cliente", "Para cobrar el mensaje"},
		"Evolution puede reintentar: el ID evita respuestas dobles."},
	{88, "API de WhatsApp", "El primer mensaje de tu bot debe…",
		[3]string{"Decir que es un asistente virtual (bot) del negocio", "Hacerse pasar por una persona", "Pedir la contraseña del banco"},
		"Ser honesto desde el primer mensaje genera confianza."},
	{89, "API de WhatsApp", "Un chat que termina en «@g.us» es…",
		[3]string{"Un grupo", "Un estado", "Un número de otro país"},
		"El bot de la clase no contesta en grupos."},
}

func preguntaPorID(id int) *Pregunta {
	for i := range banco {
		if banco[i].ID == id {
			return &banco[i]
		}
	}
	return nil
}
