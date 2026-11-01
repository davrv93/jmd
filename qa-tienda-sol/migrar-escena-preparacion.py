# Ejecutar solo después de publicar el nuevo catálogo.
import sqlite3, sys
from pathlib import Path
p=Path(sys.argv[1] if len(sys.argv)>1 else '/var/lib/docker/volumes/jmd_lms_data/_data/lms.db')
c=sqlite3.connect(p,timeout=10)
old=['01-bienvenida','02-casos-de-uso','03-page-object-model','04-semillas-y-flaky','05-navegadores-sin-interfaz','06-portal-y-trace','07-monitoreo-alertas','08-ia-y-tarea']
row=c.execute('SELECT estado,escena FROM live_sessions WHERE lesson_id=?',('qa-01',)).fetchone()
if row and row[0]=='preparando' and row[1] in old:
 c.execute("UPDATE live_sessions SET escena=?,paso=? WHERE lesson_id=? AND estado=? AND escena=?",('01-descarga','ver','qa-01','preparando',row[1]));c.commit();print('qa-01 en preparación: referencia antigua sustituida por 01-descarga.')
else:print('qa-01: sin referencia antigua en preparación; no se modifica.')
c.close()
