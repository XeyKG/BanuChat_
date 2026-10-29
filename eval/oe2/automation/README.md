# Automatización OE2/OE4 con fixtures

Esta prueba usa el scheduler real de N8N Unified y las tres plantillas existentes.
No ejecuta scraping, APIs UNAB/CCD, modelos, migraciones ni publicación PostgreSQL.
La [evidencia pública](results/2026-10-29-summary.json) contiene IDs, `mode=trigger`,
estados, tiempos, nodos y correlación. El
[checkpoint final](CHECKPOINT-OE2-OE4-AUTOMATION-01.md) describe resultados y límites.

Desde `backend/rag`, con dependencias locales ya instaladas:

```powershell
npm run typecheck
npm test
npm run build
npm run evaluate:oe2
node --import tsx test/oe2-automation/run-scheduler.ts
```

Se requieren N8N Unified y PostgreSQL Unified existentes en sus puertos loopback
15679 y 55463, la configuración privada `infra/local/unified/application.json`,
CCD 1.4.0 vigente y puertos 3011/3014 libres. El operador debe prever dos reinicios
breves del proceso N8N para aplicar publicaciones/desactivaciones por CLI. No se
recrean contenedores o volúmenes; no se reinician API, PostgreSQL u Ollama. El script
verifica etiqueta, volumen y puerto antes de actuar. La composición del servicio
OE2 y su proxy de fallos de prueba escuchan exclusivamente en loopback.

El evaluador crea una carpeta nueva bajo `infra/local/oe2-oe4-automation-01/`,
excluida de Git. Copia allí los fixtures autorizados de `eval/oe2/fixtures`; cambia
únicamente esas copias. Usa snapshots y journal separados, una credencial nueva
solo para OE2 y tres IDs de workflow nuevos. Guarda el export previo de workflows,
sin sobrescribir los existentes. Las plantillas conservan sus seis horas y quedan
inactivas; los clones de evaluación se publican con 10 segundos.

Las 11 fases cubren adquisición, repetición sin cambios, altas/modificaciones/bajas,
duplicados, vacío, fecha imposible, fuente ausente, status no disponible, respuesta
perdida tras un guardado válido, recuperación consultando estado y escritor ocupado.
El host solo prepara las fuentes y observa; las llamadas productoras nacen del
Schedule Trigger, no de un timer que envía POST ni de ejecución manual por CLI.
Cada request lleva el ID de ejecución N8N. Se lee SQLite de N8N en modo read-only
solo para los tres IDs del ensayo; los payloads completos se guardan privados.

Ante fallo de run se verifica una consulta posterior de status, sin una segunda
llamada run. Ante fallo de status o escritor ocupado no se invoca run. Los errores
quedan como ejecuciones N8N fallidas, no como éxitos silenciosos. La pérdida de
respuesta se inyecta en un proxy autenticado de prueba, después de recibir un 200
del servicio real: el backend guarda el nuevo snapshot válido, N8N reconcilia y la
siguiente activación obtiene `unchanged` sin reescribirlo.

El `finally` despublica exclusivamente esos tres clones, reinicia N8N y verifica
inactividad durante más de un intervalo de prueba. Cierra ambos servicios OE2.
Puede haber ejecuciones adicionales durante la desactivación por CLI; se registran
separadas de las fases y no se ocultan. Un cierre forzado del evaluador no garantiza
ejecutar `finally`: consultar los IDs en el manifiesto privado y despublicarlos
antes de volver a iniciar un ensayo. No borrar un lease sin comprobar que no haya
un escritor y que el estado sea coherente.

Los fingerprints usan únicamente SELECT read-only sobre tablas accesibles al rol
runtime existente, incluidos release/puntero y datos auxiliares/de cuenta legibles.
No se amplían permisos ni se extraen registros privados al resumen público. La
verificación excluye tablas sin permisos directos, como fragmentos documentales.

`npm run evaluate:oe2` sigue siendo la evaluación directa contra la referencia
independiente: informa cero ejecuciones N8N **en esa corrida**. Las observaciones
del scheduler pertenecen a este ensayo separado. No sumar ambos como una sola
prueba ni interpretar 10 segundos como frecuencia institucional acreditada.

La salida OE2 es un snapshot y un registro de ejecuciones. Los servicios de BanuChat
leen publicaciones PostgreSQL; todavía no existe un adaptador OE2 que construya y
publique un candidato completo aprobado. La sincronización OE4 existente solo
adapta calendario. No reutilizarla para insertar oferta, convocatorias o novedades
en CCD: faltan mapeos, procedencia, política de admisión y publicación por release.
