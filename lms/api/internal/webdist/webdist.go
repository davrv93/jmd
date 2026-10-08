// Package webdist incrusta el build estático del front (lms/web → dist/) en el binario.
//
// `go:embed` no puede salir del módulo, así que el build copia ../web/dist aquí
// (scripts/build.sh y el Dockerfile). En desarrollo la carpeta solo trae un index.html
// que explica cómo compilar el front.
package webdist

import (
	"embed"
	"io/fs"
)

//go:embed all:dist
var files embed.FS

// FS devuelve el sistema de archivos del front, con dist/ como raíz.
func FS() fs.FS {
	sub, err := fs.Sub(files, "dist")
	if err != nil {
		panic(err)
	}
	return sub
}
