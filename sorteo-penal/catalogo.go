package main

import (
	"archive/zip"
	"bytes"
	"encoding/csv"
	"encoding/json"
	"encoding/xml"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
)

// Gestión del catálogo: plantilla, vista previa e importación.
// Mantiene la arquitectura embed: cursos.json embebido es el fallback,
// pero si existe datos/cursos.json (o GACHAPON_DATOS/cursos.json) manda ese.

var cabeceraCSV = []string{"slug", "titulo", "categoria", "bajada", "aprenderas", "formato", "fechas", "precio_texto", "soles", "antes", "brochure"}

func cursosFisicos(s *Sorteo) string { return filepath.Join(filepath.Dir(s.archivo), "cursos.json") }

func guardarCursos(s *Sorteo, cs []Curso) error {
	b, err := json.MarshalIndent(cs, "", " ")
	if err != nil {
		return err
	}
	tmp := cursosFisicos(s) + ".tmp"
	if err := os.WriteFile(tmp, append(b, '\n'), 0o600); err != nil {
		return err
	}
	return os.Rename(tmp, cursosFisicos(s))
}

func cargarCursosExternos(ruta string) ([]Curso, error) {
	b, err := os.ReadFile(ruta)
	if err != nil {
		return nil, err
	}
	// validación mínima sin comprobar brochures al cargar externo
	var cs []Curso
	if err := json.Unmarshal(b, &cs); err != nil {
		return nil, err
	}
	return cs, nil
}

// --- plantilla CSV/XLSX ---

func plantillaEjemplo() [][]string {
	return [][]string{
		cabeceraCSV,
		{"orquestacion-qwen-coder", "Orquestación con Qwen Coder", "IA agéntica", "Nuestro curso más avanzado: orquesta varios agentes con Qwen Coder que se reparten un proyecto real.", "Planificador, ejecutores y verificador con Qwen Coder | Memoria y contexto acotado: agentes que no se pisan | Un proyecto real orquestado y medido", "3 sesiones en vivo de 1 h 15 min", "dom 15 nov · 8:00 a. m. | dom 22 nov · 8:00 a. m. | dom 29 nov · 8:00 a. m.", "S/ 50", "50", "", "orquestacion-qwen-coder"},
		{"ready-set-go-2", "Videojuegos con IA · Grupo 2", "Videojuegos", "Haz tu propio videojuego con IA: física, rivales que piensan, arte y música, publicado en internet.", "Motor, física y controles | Rivales que piensan, arte y música con IA | Tu juego publicado", "3 sesiones en vivo de 1 h 15 min", "dom 20 dic · 6:45 p. m. | lun 21 dic · 9:15 p. m. | mar 22 dic · 9:15 p. m.", "S/ 50", "50", "", "ready-set-go-2"},
		{"python-api-1", "Python: de cero a tu API", "Programación", "De cero a publicar tu primera API con Python y FastAPI.", "Sintaxis y tipos | Tu primera API | Despliegue", "3 clases en vivo", "jue 19 nov · 7:30 p. m. | jue 26 nov · 7:30 p. m.", "S/ 25", "25", "50", "python-api"},
	}
}

func csvPlantilla() []byte {
	var buf bytes.Buffer
	w := csv.NewWriter(&buf)
	for _, r := range plantillaEjemplo() {
		_ = w.Write(r)
	}
	w.Flush()
	return buf.Bytes()
}

// XLSX mínimo: un zip con 3 xml (workbook, sheet, strings). Sin dependencias externas.
func xlsxPlantilla() []byte {
	rows := plantillaEjemplo()
	// shared strings
	var ss []string
	idx := map[string]int{}
	shared := func(s string) int {
		if i, ok := idx[s]; ok {
			return i
		}
		idx[s] = len(ss)
		ss = append(ss, s)
		return idx[s]
	}
	for _, r := range rows {
		for _, c := range r {
			shared(c)
		}
	}
	// sheet xml
	var sh bytes.Buffer
	sh.WriteString(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>`)
	for ri, r := range rows {
		sh.WriteString(fmt.Sprintf(`<row r="%d">`, ri+1))
		for ci, c := range r {
			cell := string(rune('A' + ci)) + strconv.Itoa(ri+1)
			sh.WriteString(fmt.Sprintf(`<c r="%s" t="s"><v>%d</v></c>`, cell, shared(c)))
		}
		sh.WriteString(`</row>`)
	}
	sh.WriteString(`</sheetData></worksheet>`)
	var sst bytes.Buffer
	sst.WriteString(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="` + strconv.Itoa(len(ss)) + `" uniqueCount="` + strconv.Itoa(len(ss)) + `">`)
	for _, s := range ss {
		// escape xml
		esc := strings.ReplaceAll(s, "&", "&amp;")
		esc = strings.ReplaceAll(esc, "<", "&lt;")
		esc = strings.ReplaceAll(esc, ">", "&gt;")
		sst.WriteString(`<si><t>` + esc + `</t></si>`)
	}
	sst.WriteString(`</sst>`)
	parts := map[string][]byte{
		"[Content_Types].xml":                       []byte(`<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/></Types>`),
		"_rels/.rels":                                []byte(`<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`),
		"xl/workbook.xml":                            []byte(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="cursos" sheetId="1" r:id="rId1"/></sheets></workbook>`),
		"xl/_rels/workbook.xml.rels":                 []byte(`<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/></Relationships>`),
		"xl/worksheets/sheet1.xml":                   sh.Bytes(),
		"xl/sharedStrings.xml":                       sst.Bytes(),
	}
	var out bytes.Buffer
	zw := zip.NewWriter(&out)
	for name, b := range parts {
		w, _ := zw.Create(name)
		_, _ = w.Write(b)
	}
	_ = zw.Close()
	return out.Bytes()
}

// --- parseo ---

func parseCSV(r io.Reader) ([][]string, error) {
	cr := csv.NewReader(r)
	cr.FieldsPerRecord = -1
	cr.TrimLeadingSpace = true
	return cr.ReadAll()
}

func parseXLSX(r io.ReaderAt, size int64) ([][]string, error) {
	zr, err := zip.NewReader(r, size)
	if err != nil {
		return nil, err
	}
	var sst []string
	var sheet []byte
	for _, f := range zr.File {
		switch f.Name {
		case "xl/sharedStrings.xml":
			rc, _ := f.Open()
			b, _ := io.ReadAll(rc)
			rc.Close()
			type si struct {
				T string `xml:"t"`
			}
			type sstXML struct {
				SI []si `xml:"si"`
			}
			var x sstXML
			_ = xml.Unmarshal(b, &x)
			for _, s := range x.SI {
				sst = append(sst, s.T)
			}
		case "xl/worksheets/sheet1.xml":
			rc, _ := f.Open()
			b, _ := io.ReadAll(rc)
			rc.Close()
			sheet = b
		}
	}
	if sheet == nil {
		return nil, fmt.Errorf("xlsx sin hoja")
	}
	type c struct {
		T string `xml:"t,attr"`
		V string `xml:"v"`
	}
	type row struct {
		C []c `xml:"c"`
	}
	type sheetXML struct {
		Data []row `xml:"sheetData>row"`
	}
	var sh sheetXML
	if err := xml.Unmarshal(sheet, &sh); err != nil {
		return nil, err
	}
	var out [][]string
	for _, r := range sh.Data {
		var rr []string
		for _, cc := range r.C {
			v := cc.V
			if cc.T == "s" {
				i, _ := strconv.Atoi(v)
				if i >= 0 && i < len(sst) {
					v = sst[i]
				}
			}
			rr = append(rr, v)
		}
		out = append(out, rr)
	}
	return out, nil
}

func filasACursos(filas [][]string) ([]Curso, []string) {
	if len(filas) == 0 {
		return nil, []string{"archivo vacío"}
	}
	// normaliza cabecera
	cab := make([]string, len(filas[0]))
	for i, h := range filas[0] {
		cab[i] = strings.ToLower(strings.TrimSpace(h))
	}
	idx := map[string]int{}
	for i, h := range cab {
		idx[h] = i
	}
	var faltantes []string
	for _, need := range []string{"slug", "titulo"} {
		if _, ok := idx[need]; !ok {
			faltantes = append(faltantes, need)
		}
	}
	if len(faltantes) > 0 {
		return nil, []string{"faltan columnas: " + strings.Join(faltantes, ", ")}
	}
	col := func(row []string, name string) string {
		if i, ok := idx[name]; ok && i < len(row) {
			return strings.TrimSpace(row[i])
		}
		return ""
	}
	var cursos []Curso
	var avisos []string
	for ri := 1; ri < len(filas); ri++ {
		row := filas[ri]
		// fila vacía
		allEmpty := true
		for _, c := range row {
			if strings.TrimSpace(c) != "" {
				allEmpty = false
				break
			}
		}
		if allEmpty {
			continue
		}
		slug := col(row, "slug")
		titulo := col(row, "titulo")
		if slug == "" && titulo == "" {
			continue
		}
		c := Curso{
			Slug:        slug,
			Titulo:      titulo,
			Categoria:   col(row, "categoria"),
			Bajada:      col(row, "bajada"),
			Formato:     col(row, "formato"),
			PrecioTexto: col(row, "precio_texto"),
			Brochure:    col(row, "brochure"),
		}
		if c.Brochure == "" {
			c.Brochure = c.Slug
		}
		if s := col(row, "aprenderas"); s != "" {
			parts := strings.Split(s, "|")
			for i := range parts {
				parts[i] = strings.TrimSpace(parts[i])
			}
			c.Aprenderas = parts
		}
		if s := col(row, "fechas"); s != "" {
			parts := strings.Split(s, "|")
			for i := range parts {
				parts[i] = strings.TrimSpace(parts[i])
			}
			c.Fechas = parts
		}
		if s := col(row, "soles"); s != "" {
			if v, err := strconv.ParseFloat(strings.ReplaceAll(s, ",", "."), 64); err == nil {
				c.Soles = &v
			} else {
				avisos = append(avisos, fmt.Sprintf("fila %d: soles inválido %q", ri+1, s))
			}
		}
		if s := col(row, "antes"); s != "" {
			if v, err := strconv.ParseFloat(strings.ReplaceAll(s, ",", "."), 64); err == nil {
				c.Antes = &v
			}
		}
		if c.PrecioTexto == "" && c.Soles != nil {
			c.PrecioTexto = fmt.Sprintf("S/ %g", *c.Soles)
		}
		cursos = append(cursos, c)
	}
	return cursos, avisos
}

func validarCursos(cs []Curso) []string {
	var errs []string
	for i, c := range cs {
		if !nombreArchivo.MatchString(c.Slug) {
			errs = append(errs, fmt.Sprintf("fila %d: slug %q inválido (solo a-z 0-9 y guiones)", i+2, c.Slug))
		}
		if c.Titulo == "" {
			errs = append(errs, fmt.Sprintf("fila %d: falta título", i+2))
		}
		if c.Brochure != "" && !nombreArchivo.MatchString(c.Brochure) {
			errs = append(errs, fmt.Sprintf("fila %d: brochure %q inválido", i+2, c.Brochure))
		}
	}
	vistos := map[string]int{}
	for i, c := range cs {
		if j, ok := vistos[c.Slug]; ok {
			errs = append(errs, fmt.Sprintf("slug repetido %q en filas %d y %d", c.Slug, j+1, i+2))
		} else {
			vistos[c.Slug] = i + 1
		}
	}
	return errs
}



// parseArchivo detecta csv/xlsx/json
func parseArchivo(filename string, data []byte) ([][]string, error) {
	lower := strings.ToLower(filename)
	switch {
	case strings.HasSuffix(lower, ".csv"):
		return parseCSV(bytes.NewReader(data))
	case strings.HasSuffix(lower, ".xlsx"):
		return parseXLSX(bytes.NewReader(data), int64(len(data)))
	case strings.HasSuffix(lower, ".json"):
		var cs []Curso
		if err := json.Unmarshal(data, &cs); err != nil {
			return nil, err
		}
		// convierte a filas para reutilizar validación
		rows := [][]string{cabeceraCSV}
		for _, c := range cs {
			soles := ""
			if c.Soles != nil {
				soles = strconv.FormatFloat(*c.Soles, 'f', -1, 64)
			}
			antes := ""
			if c.Antes != nil {
				antes = strconv.FormatFloat(*c.Antes, 'f', -1, 64)
			}
			rows = append(rows, []string{c.Slug, c.Titulo, c.Categoria, c.Bajada, strings.Join(c.Aprenderas, " | "), c.Formato, strings.Join(c.Fechas, " | "), c.PrecioTexto, soles, antes, c.Brochure})
		}
		return rows, nil
	default:
		// intenta csv
		return parseCSV(bytes.NewReader(data))
	}
}

func leerMultipartArchivo(r *http.Request) (string, []byte, error) {
	if err := r.ParseMultipartForm(8 << 20); err != nil {
		return "", nil, err
	}
	f, hdr, err := r.FormFile("archivo")
	if err != nil {
		// también acepta "file"
		f, hdr, err = r.FormFile("file")
		if err != nil {
			return "", nil, fmt.Errorf("sube un archivo en el campo 'archivo'")
		}
	}
	defer f.Close()
	b, err := io.ReadAll(io.LimitReader(f, 8<<20))
	if err != nil {
		return "", nil, err
	}
	return hdr.Filename, b, nil
}

func (s *Sorteo) rutasCatalogo(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/cursos", func(w http.ResponseWriter, r *http.Request) {
		s.mu.Lock()
		defer s.mu.Unlock()
		responder(w, 200, map[string]any{"cursos": s.cursos})
	})
	mux.HandleFunc("GET /api/admin/cursos/plantilla.csv", func(w http.ResponseWriter, r *http.Request) {
		if !s.esAdmin(r) {
			fallo(w, 401, "clave", "Clave incorrecta.")
			return
		}
		w.Header().Set("Content-Type", "text/csv; charset=utf-8")
		w.Header().Set("Content-Disposition", "attachment; filename=plantilla-cursos.csv")
		w.Header().Set("Cache-Control", "no-store")
		_, _ = w.Write([]byte("\xef\xbb\xbf"))
		_, _ = w.Write(csvPlantilla())
	})
	mux.HandleFunc("GET /api/admin/cursos/plantilla.xlsx", func(w http.ResponseWriter, r *http.Request) {
		if !s.esAdmin(r) {
			fallo(w, 401, "clave", "Clave incorrecta.")
			return
		}
		w.Header().Set("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
		w.Header().Set("Content-Disposition", "attachment; filename=plantilla-cursos.xlsx")
		w.Header().Set("Cache-Control", "no-store")
		_, _ = w.Write(xlsxPlantilla())
	})

	preview := func(w http.ResponseWriter, r *http.Request, guardar bool) {
		if !s.esAdmin(r) {
			fallo(w, 401, "clave", "Clave incorrecta.")
			return
		}
		filename, data, err := leerMultipartArchivo(r)
		if err != nil {
			// fallback: si mandan JSON directo
			if r.Header.Get("Content-Type") == "application/json" || strings.Contains(r.Header.Get("Content-Type"), "json") {
				b, _ := io.ReadAll(io.LimitReader(r.Body, 8<<20))
				var cs []Curso
				if err2 := json.Unmarshal(b, &cs); err2 == nil {
					errs := validarCursos(cs)
					if len(errs) > 0 {
						responder(w, 422, map[string]any{"ok": false, "errores": errs, "cursos": cs})
						return
					}
					if guardar {
						s.mu.Lock()
						s.cursos = cs
						_ = guardarCursos(s, cs)
						s.mu.Unlock()
						responder(w, 200, map[string]any{"ok": true, "importados": len(cs), "cursos": cs})
						return
					}
					responder(w, 200, map[string]any{"ok": true, "cursos": cs, "avisos": []string{}})
					return
				}
			}
			fallo(w, 400, "archivo", err.Error())
			return
		}
		filas, err := parseArchivo(filename, data)
		if err != nil {
			fallo(w, 400, "archivo", "No pudimos leer el archivo: "+err.Error())
			return
		}
		cursos, avisos := filasACursos(filas)
		if len(cursos) == 0 {
			fallo(w, 422, "archivo", "El archivo no trae cursos válidos.")
			return
		}
		errs := validarCursos(cursos)
		if len(errs) > 0 && !guardar {
			responder(w, 422, map[string]any{"ok": false, "errores": errs, "cursos": cursos, "avisos": avisos})
			return
		}
		if len(errs) > 0 && guardar {
			responder(w, 422, map[string]any{"ok": false, "errores": errs})
			return
		}
		if guardar {
			s.mu.Lock()
			s.cursos = cursos
			err = guardarCursos(s, cursos)
			s.mu.Unlock()
			if err != nil {
				fallo(w, 500, "guardar", "No se pudo guardar: "+err.Error())
				return
			}
			responder(w, 200, map[string]any{"ok": true, "importados": len(cursos), "cursos": cursos, "avisos": avisos})
			return
		}
		responder(w, 200, map[string]any{"ok": true, "cursos": cursos, "avisos": avisos, "total": len(cursos)})
	}

	mux.HandleFunc("POST /api/admin/cursos/vista-previa", func(w http.ResponseWriter, r *http.Request) {
		preview(w, r, false)
	})
	mux.HandleFunc("POST /api/admin/cursos/importar", func(w http.ResponseWriter, r *http.Request) {
		// acepta tanto multipart como JSON {cursos:[...]}
		if strings.Contains(r.Header.Get("Content-Type"), "multipart") {
			preview(w, r, true)
			return
		}
		if !s.esAdmin(r) {
			fallo(w, 401, "clave", "Clave incorrecta.")
			return
		}
		r.Body = http.MaxBytesReader(w, r.Body, 8<<20)
		var q struct {
			Cursos []Curso `json:"cursos"`
		}
		// intenta leer como array directo también
		b, _ := io.ReadAll(r.Body)
		if err := json.Unmarshal(b, &q); err != nil {
			var arr []Curso
			if err2 := json.Unmarshal(b, &arr); err2 == nil {
				q.Cursos = arr
			} else {
				fallo(w, 400, "formulario", "Envía {cursos:[...]} o un archivo.")
				return
			}
		}
		if len(q.Cursos) == 0 {
			fallo(w, 400, "archivo", "No hay cursos para importar.")
			return
		}
		if errs := validarCursos(q.Cursos); len(errs) > 0 {
			responder(w, 422, map[string]any{"ok": false, "errores": errs})
			return
		}
		s.mu.Lock()
		s.cursos = q.Cursos
		err := guardarCursos(s, q.Cursos)
		s.mu.Unlock()
		if err != nil {
			fallo(w, 500, "guardar", "No se pudo guardar.")
			return
		}
		responder(w, 200, map[string]any{"ok": true, "importados": len(q.Cursos)})
	})
}

// util para interfaz multipart.File
var _ multipart.File
