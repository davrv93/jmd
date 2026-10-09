package content

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"io/fs"
	"log/slog"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync/atomic"
	"time"

	"github.com/yuin/goldmark"
	"github.com/yuin/goldmark/extension"
	"github.com/yuin/goldmark/parser"
	"github.com/yuin/goldmark/renderer/html"
	"gopkg.in/yaml.v3"
)

// Catalog es todo el contenido cargado, inmutable una vez construido.
type Catalog struct {
	courses     []*Course
	courseByID  map[string]*Course
	lessons     map[string]*Lesson
	assignments map[string]*Assignment
	// assignmentsByCourse conserva el orden de los archivos.
	assignmentsByCourse map[string][]*Assignment
	examples            map[string]*Example
	// examplesByCourse va ordenado por order y luego por título.
	examplesByCourse map[string][]*Example
	fingerprint      string
}

var md = goldmark.New(
	goldmark.WithExtensions(extension.GFM),
	goldmark.WithParserOptions(parser.WithAutoHeadingID()),
	// El contenido lo escribe el instructor (está en el repo): se permite HTML en el Markdown.
	goldmark.WithRendererOptions(html.WithUnsafe()),
)

// Load lee dir/courses/<slug>/{course.yaml,lessons/*.md,assignments/*.md,examples/*.md}.
func Load(dir string) (*Catalog, error) {
	c := &Catalog{
		courseByID:          map[string]*Course{},
		lessons:             map[string]*Lesson{},
		assignments:         map[string]*Assignment{},
		assignmentsByCourse: map[string][]*Assignment{},
		examples:            map[string]*Example{},
		examplesByCourse:    map[string][]*Example{},
	}
	coursesDir := filepath.Join(dir, "courses")
	entries, err := os.ReadDir(coursesDir)
	if err != nil {
		return nil, fmt.Errorf("leer %s: %w", coursesDir, err)
	}
	for _, e := range entries {
		if !e.IsDir() {
			continue
		}
		course, err := loadCourse(filepath.Join(coursesDir, e.Name()), c)
		if err != nil {
			return nil, fmt.Errorf("curso %s: %w", e.Name(), err)
		}
		if _, dup := c.courseByID[course.ID]; dup {
			return nil, fmt.Errorf("curso %s: id repetido", course.ID)
		}
		c.courses = append(c.courses, course)
		c.courseByID[course.ID] = course
	}
	sort.Slice(c.courses, func(i, j int) bool { return c.courses[i].Title < c.courses[j].Title })
	fp, err := Fingerprint(dir)
	if err != nil {
		return nil, err
	}
	c.fingerprint = fp
	return c, nil
}

func loadCourse(dir string, c *Catalog) (*Course, error) {
	raw, err := os.ReadFile(filepath.Join(dir, "course.yaml"))
	if err != nil {
		return nil, err
	}
	var course Course
	if err := yaml.Unmarshal(raw, &course); err != nil {
		return nil, fmt.Errorf("course.yaml: %w", err)
	}
	if course.ID == "" {
		course.ID = filepath.Base(dir)
	}
	if course.Slug == "" {
		course.Slug = course.ID
	}
	if course.Title == "" {
		return nil, errors.New("course.yaml: falta title")
	}

	lessons := map[string]*Lesson{}
	files, _ := filepath.Glob(filepath.Join(dir, "lessons", "*.md"))
	sort.Strings(files)
	for _, f := range files {
		l, err := loadLesson(f)
		if err != nil {
			return nil, fmt.Errorf("%s: %w", filepath.Base(f), err)
		}
		if _, dup := c.lessons[l.ID]; dup {
			return nil, fmt.Errorf("%s: id de sesión repetido: %s", filepath.Base(f), l.ID)
		}
		l.CourseID = course.ID
		l.SourceRel, _ = filepath.Rel(dir, f)
		for i := range l.Materials {
			m := &l.Materials[i]
			if m.File != "" && m.URL == "" {
				m.URL = "/files/" + course.ID + "/" + m.File
			}
			for _, f := range m.SlideFiles {
				m.Slides = append(m.Slides, "/files/"+course.ID+"/"+f)
			}
		}
		lessons[l.ID] = l
	}
	placed := map[string]bool{}
	for mi := range course.Modules {
		m := &course.Modules[mi]
		if m.ID == "" {
			m.ID = fmt.Sprintf("m%d", mi+1)
		}
		for _, id := range m.LessonIDs {
			l, ok := lessons[id]
			if !ok {
				return nil, fmt.Errorf("módulo %s: la sesión %q no existe en lessons/", m.ID, id)
			}
			l.ModuleID = m.ID
			m.Lessons = append(m.Lessons, l)
			placed[id] = true
			c.lessons[id] = l
		}
		if m.Lessons == nil {
			m.Lessons = []*Lesson{}
		}
	}
	for id, l := range lessons {
		if !placed[id] {
			slog.Warn("sesión sin módulo (no se publica)", "lesson", id, "file", l.SourceRel)
		}
	}

	files, _ = filepath.Glob(filepath.Join(dir, "assignments", "*.md"))
	sort.Strings(files)
	for _, f := range files {
		a, err := loadAssignment(f)
		if err != nil {
			return nil, fmt.Errorf("%s: %w", filepath.Base(f), err)
		}
		if _, dup := c.assignments[a.ID]; dup {
			return nil, fmt.Errorf("%s: id de tarea repetido: %s", filepath.Base(f), a.ID)
		}
		if a.LessonID != "" {
			if _, ok := c.lessons[a.LessonID]; !ok {
				return nil, fmt.Errorf("%s: la sesión %q no existe", filepath.Base(f), a.LessonID)
			}
		}
		a.CourseID = course.ID
		c.assignments[a.ID] = a
		c.assignmentsByCourse[course.ID] = append(c.assignmentsByCourse[course.ID], a)
	}
	files, _ = filepath.Glob(filepath.Join(dir, "examples", "*.md"))
	sort.Strings(files)
	var examples []*Example
	for _, f := range files {
		e, err := loadExample(f)
		if err != nil {
			return nil, fmt.Errorf("%s: %w", filepath.Base(f), err)
		}
		if _, dup := c.examples[e.ID]; dup {
			return nil, fmt.Errorf("%s: id de ejemplo repetido: %s", filepath.Base(f), e.ID)
		}
		if e.LessonID != "" {
			if l, ok := c.lessons[e.LessonID]; !ok || l.CourseID != course.ID {
				return nil, fmt.Errorf("%s: la sesión %q no existe en este curso", filepath.Base(f), e.LessonID)
			}
		}
		e.CourseID = course.ID
		c.examples[e.ID] = e
		examples = append(examples, e)
	}
	// Primero los que llevan order (de menor a mayor); luego el resto, por título.
	sort.SliceStable(examples, func(i, j int) bool {
		a, b := examples[i], examples[j]
		if (a.Order > 0) != (b.Order > 0) {
			return a.Order > 0
		}
		if a.Order != b.Order {
			return a.Order < b.Order
		}
		return a.Title < b.Title
	})
	if examples != nil {
		c.examplesByCourse[course.ID] = examples
	}
	if course.Cohorts == nil {
		course.Cohorts = []string{}
	}
	return &course, nil
}

func loadLesson(path string) (*Lesson, error) {
	fm, body, err := readFrontMatter(path)
	if err != nil {
		return nil, err
	}
	var l Lesson
	if err := yaml.Unmarshal(fm, &l); err != nil {
		return nil, fmt.Errorf("front matter: %w", err)
	}
	if l.ID == "" || l.Title == "" {
		return nil, errors.New("front matter: faltan id o title")
	}
	if l.Recording != nil && l.Recording.URL == "" {
		l.Recording = nil
	}
	if l.Repo != nil && l.Repo.URL == "" {
		l.Repo = nil
	}
	for i := range l.Materials {
		if l.Materials[i].ID == "" {
			l.Materials[i].ID = fmt.Sprintf("%s-m%d", l.ID, i+1)
		}
		if l.Materials[i].Kind == "" {
			l.Materials[i].Kind = "link"
		}
		if l.Materials[i].ObjectiveIDs == nil {
			l.Materials[i].ObjectiveIDs = []string{}
		}
		if d := l.Materials[i].SlidesDir; d != "" {
			if !safeRel(d) {
				return nil, fmt.Errorf("material %s: slides_dir %q debe ser una ruta relativa dentro del curso", l.Materials[i].ID, d)
			}
			courseDir := filepath.Dir(filepath.Dir(path))
			var imgs []string
			for _, ext := range []string{"*.webp", "*.png", "*.jpg", "*.jpeg"} {
				m, _ := filepath.Glob(filepath.Join(courseDir, filepath.FromSlash(d), ext))
				imgs = append(imgs, m...)
			}
			if len(imgs) == 0 {
				return nil, fmt.Errorf("material %s: slides_dir %q no tiene imágenes", l.Materials[i].ID, d)
			}
			sort.Strings(imgs)
			for _, f := range imgs {
				rel, _ := filepath.Rel(courseDir, f)
				l.Materials[i].SlideFiles = append(l.Materials[i].SlideFiles, filepath.ToSlash(rel))
			}
		}
		if f := l.Materials[i].File; f != "" {
			if !safeRel(f) {
				return nil, fmt.Errorf("material %s: file %q debe ser una ruta relativa dentro del curso", l.Materials[i].ID, f)
			}
			if _, err := os.Stat(filepath.Join(filepath.Dir(filepath.Dir(path)), filepath.FromSlash(f))); err != nil {
				return nil, fmt.Errorf("material %s: el archivo %q no existe", l.Materials[i].ID, f)
			}
		}
	}
	for i := range l.Cycle {
		if l.Cycle[i].ID == "" {
			l.Cycle[i].ID = fmt.Sprintf("paso-%d", i+1)
		}
	}
	for _, s := range []*[]Objective{&l.Objectives} {
		if *s == nil {
			*s = []Objective{}
		}
	}
	if l.Materials == nil {
		l.Materials = []Material{}
	}
	if l.Cycle == nil {
		l.Cycle = []CycleStep{}
	}
	l.BodyMD = string(body)
	l.BodyHTML, err = render(body)
	if err != nil {
		return nil, err
	}
	return &l, nil
}

func loadAssignment(path string) (*Assignment, error) {
	fm, body, err := readFrontMatter(path)
	if err != nil {
		return nil, err
	}
	var a Assignment
	if err := yaml.Unmarshal(fm, &a); err != nil {
		return nil, fmt.Errorf("front matter: %w", err)
	}
	if a.ID == "" || a.Title == "" {
		return nil, errors.New("front matter: faltan id o title")
	}
	if a.Rubric == nil {
		a.Rubric = []RubricCriterion{}
	}
	if a.ObjectiveIDs == nil {
		a.ObjectiveIDs = []string{}
	}
	a.DescriptionMD = string(body)
	a.DescriptionHTML, err = render(body)
	if err != nil {
		return nil, err
	}
	return &a, nil
}

func loadExample(path string) (*Example, error) {
	fm, body, err := readFrontMatter(path)
	if err != nil {
		return nil, err
	}
	// yaml.v3 solo pisa las claves presentes: sin «published», queda publicado.
	e := Example{Published: true}
	if err := yaml.Unmarshal(fm, &e); err != nil {
		return nil, fmt.Errorf("front matter: %w", err)
	}
	if e.ID == "" || e.Title == "" {
		return nil, errors.New("front matter: faltan id o title")
	}
	if e.Level == "" {
		e.Level = "básico"
	}
	if !exampleLevels[e.Level] {
		return nil, fmt.Errorf("front matter: level %q no válido (básico · intermedio · avanzado)", e.Level)
	}
	if e.Repo != nil && e.Repo.URL == "" {
		e.Repo = nil
	}
	if e.Tags == nil {
		e.Tags = []string{}
	}
	e.BodyMD = string(body)
	e.BodyHTML, err = render(body)
	if err != nil {
		return nil, err
	}
	return &e, nil
}

// readFrontMatter separa el bloque YAML inicial (entre líneas "---") del cuerpo.
func readFrontMatter(path string) (fm, body []byte, err error) {
	raw, err := os.ReadFile(path)
	if err != nil {
		return nil, nil, err
	}
	raw = bytes.ReplaceAll(raw, []byte("\r\n"), []byte("\n"))
	if !bytes.HasPrefix(raw, []byte("---\n")) {
		return nil, raw, nil
	}
	rest := raw[4:]
	end := bytes.Index(rest, []byte("\n---\n"))
	if end < 0 {
		if bytes.HasSuffix(rest, []byte("\n---")) {
			return rest[:len(rest)-4], nil, nil
		}
		return nil, nil, errors.New("front matter sin cerrar (falta la línea ---)")
	}
	return rest[:end], rest[end+5:], nil
}

func render(src []byte) (string, error) {
	var buf bytes.Buffer
	if err := md.Convert(src, &buf); err != nil {
		return "", fmt.Errorf("markdown: %w", err)
	}
	return buf.String(), nil
}

// Fingerprint resume rutas, tamaños y fechas de todos los archivos del contenido.
func Fingerprint(dir string) (string, error) {
	h := sha256.New()
	err := filepath.WalkDir(dir, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if d.IsDir() {
			return nil
		}
		info, err := d.Info()
		if err != nil {
			return err
		}
		fmt.Fprintf(h, "%s|%d|%d\n", path, info.Size(), info.ModTime().UnixNano())
		return nil
	})
	if err != nil {
		return "", err
	}
	return hex.EncodeToString(h.Sum(nil)), nil
}

// --- consultas -----------------------------------------------------------------------------

// Courses devuelve los cursos ordenados por título.
func (c *Catalog) Courses() []*Course { return c.courses }

// Course busca por id o slug.
func (c *Catalog) Course(idOrSlug string) *Course {
	if co, ok := c.courseByID[idOrSlug]; ok {
		return co
	}
	for _, co := range c.courses {
		if co.Slug == idOrSlug {
			return co
		}
	}
	return nil
}

// Lesson busca una sesión por id (solo las que están en algún módulo).
func (c *Catalog) Lesson(id string) *Lesson { return c.lessons[id] }

// Assignment busca una tarea por id.
func (c *Catalog) Assignment(id string) *Assignment { return c.assignments[id] }

// Assignments devuelve las tareas de un curso en el orden de los archivos.
func (c *Catalog) Assignments(courseID string) []*Assignment {
	out := c.assignmentsByCourse[courseID]
	if out == nil {
		return []*Assignment{}
	}
	return out
}

// Example busca un ejemplo por id.
func (c *Catalog) Example(id string) *Example { return c.examples[id] }

// Examples devuelve los ejemplos de un curso: por order y luego por título.
func (c *Catalog) Examples(courseID string) []*Example {
	out := c.examplesByCourse[courseID]
	if out == nil {
		return []*Example{}
	}
	return out
}

// Material busca un material en cualquier sesión y devuelve también su sesión.
func (c *Catalog) Material(id string) (*Material, *Lesson) {
	for _, l := range c.lessons {
		for i := range l.Materials {
			if l.Materials[i].ID == id {
				return &l.Materials[i], l
			}
		}
	}
	return nil, nil
}

// Fingerprint identifica la versión del contenido cargada.
func (c *Catalog) Fingerprint() string { return c.fingerprint }

// --- recarga -------------------------------------------------------------------------------

// Store guarda el catálogo vigente y lo recarga cuando cambian los archivos.
type Store struct {
	dir string
	cur atomic.Pointer[Catalog]
}

// NewStore carga el contenido de dir.
func NewStore(dir string) (*Store, error) {
	cat, err := Load(dir)
	if err != nil {
		return nil, err
	}
	s := &Store{dir: dir}
	s.cur.Store(cat)
	return s, nil
}

// Get devuelve el catálogo vigente.
func (s *Store) Get() *Catalog { return s.cur.Load() }

// Dir es la carpeta del contenido.
func (s *Store) Dir() string { return s.dir }

// Reload vuelve a leer los archivos. Si hay un error, conserva el catálogo anterior.
func (s *Store) Reload() error {
	cat, err := Load(s.dir)
	if err != nil {
		return err
	}
	s.cur.Store(cat)
	return nil
}

// Watch recarga cada interval si cambió algún archivo, hasta que ctx termine.
func (s *Store) Watch(ctx context.Context, interval time.Duration) {
	t := time.NewTicker(interval)
	defer t.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-t.C:
			fp, err := Fingerprint(s.dir)
			if err != nil || fp == s.Get().Fingerprint() {
				continue
			}
			if err := s.Reload(); err != nil {
				slog.Error("contenido: error al recargar; se conserva el anterior", "err", err)
				continue
			}
			slog.Info("contenido recargado", "dir", s.dir)
		}
	}
}

// safeRel acepta solo rutas relativas sin ".." ni raíz (para servir archivos del curso).
func safeRel(p string) bool {
	if p == "" || strings.HasPrefix(p, "/") || strings.Contains(p, "\\") {
		return false
	}
	for _, seg := range strings.Split(p, "/") {
		if seg == "" || seg == "." || seg == ".." {
			return false
		}
	}
	return true
}

// SafeRel es safeRel para otros paquetes.
func SafeRel(p string) bool { return safeRel(p) }

// CourseDir es la carpeta de un curso en disco.
func CourseDir(contentDir, courseID string) string {
	return filepath.Join(contentDir, "courses", courseID)
}

// TrimCohort normaliza un grupo de Keycloak ("/cohorte-2026-1" → "cohorte-2026-1").
func TrimCohort(g string) string { return strings.TrimPrefix(g, "/") }
