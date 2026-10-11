package skills

import (
	"strings"
	"testing"
)

const ejemplo = `---
name: demo-genérica
description: Ejemplo genérico para comprobar la adaptación por perfil de modelo.
---

# Demo

## Cuándo usar

Úsala cuando alguien pida un resumen.

## Principios

- Una idea por frase.
- No uses relleno.
- Conserva los números.

## Procedimiento

1. Lee el pedido.
2. Nunca inventes datos.
3. Responde.

## Reglas duras

- Nunca borres nada sin avisar.
- Verifica antes de entregar.

## Lista de comprobación

- [ ] Revisé el pedido.

## Versión corta para modelos pequeños

- Lee el pedido.
- No inventes datos.
- Nunca borres sin avisar.
- Responde en pocas líneas.
`

func TestVarianteDeepSeekEsCortaYNumerada(t *testing.T) {
	p, _ := PerfilPorID("deepseek")
	v := Variante(ejemplo, p)
	if !strings.HasPrefix(v, "---\nname: demo-genérica\n") {
		t.Fatalf("pierde el front matter:\n%s", v)
	}
	if strings.Contains(v, "Cuándo usar") || strings.Contains(v, "Lista de comprobación") {
		t.Errorf("debe ser corta:\n%s", v)
	}
	if !strings.Contains(v, "1. Lee el pedido.\n2. No inventes datos.\n3. Nunca borres sin avisar.\n4. Responde en pocas líneas.") {
		t.Errorf("las viñetas deben quedar numeradas:\n%s", v)
	}
	if !strings.HasSuffix(v, lineaFormato+"\n") {
		t.Errorf("falta el formato al final:\n%s", v)
	}
	if v == Variante(ejemplo, Perfiles[0]) || Variante(ejemplo, Perfiles[0]) != ejemplo {
		t.Error("claude conserva el original y deepseek es otro texto")
	}
	if len(Variantes(ejemplo)) != len(Perfiles) {
		t.Error("Variantes debe cubrir todos los perfiles")
	}
}

func TestVarianteNemotronTieneRolYProhibido(t *testing.T) {
	p, _ := PerfilPorID("nemotron")
	v := Variante(ejemplo, p)
	cab, cuerpo := partir(v)
	if cab == "" || !strings.HasPrefix(cuerpo, lineaRol+"\n"+lineaFormatoRo+"\n") {
		t.Fatalf("rol y formato van justo después del front matter:\n%s", v)
	}
	i := strings.Index(v, "Prohibido:\n")
	if i < 0 {
		t.Fatalf("falta el bloque Prohibido:\n%s", v)
	}
	bloque := v[i:]
	for _, regla := range []string{"- No inventes datos.", "- Nunca borres sin avisar."} {
		if !strings.Contains(bloque, regla) {
			t.Errorf("falta %q en el bloque:\n%s", regla, bloque)
		}
		if strings.Contains(v[:i], strings.TrimPrefix(regla, "- ")) {
			t.Errorf("%q debe salir del cuerpo", regla)
		}
	}
	// Sin la sección corta, nemotron usa Principios..Reglas duras y agrupa lo negativo.
	sin := strings.Split(ejemplo, "## Versión corta")[0]
	w := Variante(sin, p)
	if !strings.Contains(w, "1. Lee el pedido.\n2. Responde.") || !strings.Contains(w, "Prohibido:\n- No uses relleno.") {
		t.Errorf("sin versión corta:\n%s", w)
	}
}

func TestVarianteOllamaMax25(t *testing.T) {
	largo := "---\nname: larga\ndescription: Skill con muchas líneas para probar el recorte.\n---\n## Versión corta para modelos pequeños\n"
	for i := 1; i <= 60; i++ {
		largo += "Línea " + strings.Repeat("x", i%5+1) + "\n"
	}
	p, _ := PerfilPorID("ollama-pequeno")
	v := Variante(largo, p)
	_, cuerpo := partir(v)
	// Las dos líneas de rol + una en blanco + el cuerpo recortado a 25 (+ blanco y formato).
	n := strings.Count(strings.SplitN(cuerpo, "\n\n", 3)[1], "\n")
	if n > 25 {
		t.Fatalf("el cuerpo debe tener a lo sumo 25 líneas, tiene %d", n)
	}
	if !strings.HasPrefix(v, "---\nname: larga\n") || !strings.Contains(v, lineaRol) || !strings.Contains(v, lineaFormato) {
		t.Errorf("faltan front matter, rol o formato:\n%s", v)
	}
}

func TestPerfilDeModelo(t *testing.T) {
	casos := map[string]string{
		"deepseek-flash":         "deepseek",
		"DeepSeek-V3":            "deepseek",
		"glm-4.6":                "glm",
		"nvidia/nemotron-3-nano": "nemotron",
		"qwen3:1.7b":             "ollama-pequeno",
		"gemma3:4b":              "ollama-pequeno",
		"llama3.2:1b":            "ollama-pequeno",
		"llama3.3-70b":           "deepseek",
		"claude-sonnet":          "claude",
		"gpt-5":                  "gpt",
		"kimi-k2":                "gpt",
		"minimax-m2":             "gpt",
		"qwen3-235b-a22b":        "gpt",
		"modelo-desconocido":     "deepseek",
		"":                       "deepseek",
	}
	for id, quiero := range casos {
		if got := PerfilDeModelo(id); got != quiero {
			t.Errorf("PerfilDeModelo(%q) = %q, quiero %q", id, got, quiero)
		}
	}
}
