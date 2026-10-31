# OE2-PIPELINE-02 — publicación auxiliar de demostración

Recorrido probado: scheduler N8N → adquisición OE2 existente → tres snapshots
validados → candidato tipado → aprobación explícita por hash → transacción
PostgreSQL → consultas de servicios BanuChat. Solo fixtures; no acredita fuentes,
plazos ni aprobación institucionales. Resultado y evidencia depurada:
[checkpoint único](CHECKPOINT-OE2-PIPELINE-02.md) y
[resumen de ejecución](results/2026-10-30-summary.json).

## Semántica y publicación

- Oferta: programación de grupos con código, periodo, modalidad y fechas civiles.
  Se publica en una tabla específica; no se crean cursos del catálogo.
- Convocatorias: apertura y cierre gobiernan `valid_from`/`valid_until`. Se conserva
  población en la descripción y el registro original completo en procedencia.
  No se infiere elegibilidad. Campos adicionales no representables se rechazan.
- Novedades: publicación gobierna `valid_from`; `valid_until` es nulo. Se conservan
  resumen, versión e identidad. `active` significa publicada sin vencimiento
  documentado; no significa convocatoria abierta.
- Cada respuesta lleva títulos identificados como ficticios. La consulta de
  programación añade `evidence_mode: fictional_auxiliary`.

La proyección acepta únicamente las tres fuentes del registry fixture y valida
los campos exactos y la normalización existente. Guarda bytes JSON de snapshot,
hash del archivo fixture, hash del snapshot, versión, hash de registro, localizador
e identidad. Revalida íntegramente el candidato antes de escribir. El hash de
contenido incluye política, fuentes, hashes fixture y registros completos; excluye
solo la hora de observación para evitar versiones causadas por el reloj.

La aprobación es una entrada explícita `DemoApproval` con política, alcance
`fictional_auxiliary_only`, hash exacto y referencia `OE2-PIPELINE-02/...`.
N8N no concede aprobaciones. El evaluador prepara un plan fixture conocido; la
segunda aprobación se instala después de observar el candidato pendiente y
comprobar que `current` no avanzó. Planificar una identidad no constituye evidencia
de adquisición: esta proviene de las ejecuciones y snapshots reales.

Se reutilizan el extractor/validador OE2, WriterLease, transacción, servicios de
anuncios, resolución de release y servidor REST existentes. El publicador documental
exige documentos/embeddings y un manifiesto que estos datos auxiliares no satisfacen.
Se usa por ello una capa de release fixture limitada, con FK, hashes, inmutabilidad
de versiones listas y puntero a una versión lista. Todos los registros de las tres
categorías y el cambio de puntero se confirman juntos. Una baja significa ausencia
en la nueva versión completa; la versión histórica conserva el registro anterior.
Mismo contenido: sin nueva release; base obsoleta: rechazo; fallo SQL: rollback.

## Composición aislada y consultas

Se reutiliza la base `postgres`, antes sin tablas públicas, del contenedor existente
`banuchat-oe6-local-postgres-synthetic-1`. No se crea otra base ni schema. Solo se
añaden siete tablas `public.oe2_pipeline_*`, funciones de integridad y dos roles
nuevos limitados, escritor y lector. No se cambian credenciales o privilegios de
roles anteriores. La base sintética `banuchat_schema_test` no recibe escrituras.
Solo se conserva su UUID de configuración de embeddings vigente para compatibilidad
del lector de releases; no se copian vectores ni se ejecutan modelos.

Un contenedor Node temporal usa la imagen N8N ya disponible y monta exclusivamente
bundles, copias fixture y aprobaciones en lectura, y resultados en escritura.
Durante la prueba, en la red host Linux de Docker:

| Puerto | Uso |
| --- | --- |
| 3031 | Adquisición OE2 autenticada existente |
| 3032 | Solo `GET /api/v1/announcements`, servidor REST existente |
| 3033 | Control privado autenticado de publicación/inspección del evaluador |

Ejemplos REST de la composición temporal:
`/api/v1/announcements?query=NOVEDAD%20FICTICIA&temporal_status=all&reference_time=2026-10-06T12%3A00%3A00Z`
y la misma ruta con `query=CONVOCATORIA%20FICTICIA`. Las pruebas consultan estados
`upcoming`, `active` y `expired` con fechas antes, durante y después de apertura.
Un adaptador cerrado sustituye únicamente nombres de tablas en las consultas SQL
de lectura existentes y ejecuta PostgreSQL real; no sustituye resultados.
El contrato REST no expone procedencia, que se comprueba mediante el servicio
`getAnnouncements` y los registros SQL de origen.

Programación se consulta con el servicio tipado `getDemoProgramming`. El REST
congelado no tiene recurso de programación. Exponerlo en la app requeriría un
contrato autorizado, conexión explícita al dataset y política de presentación;
no se añadió un endpoint público ni se conectó el entorno habitual a estos datos.

## Reproducción y cierre

Desde `backend/rag`, con dependencias instaladas y Docker local disponible:

```powershell
npm run typecheck
npm test
node --import tsx test/oe2-pipeline/run-demo.ts
npm run build
```

El evaluador exige los contenedores y volúmenes existentes indicados en su código,
la configuración local Unified en `infra/local/unified/application.json` y un
N8N Unified saludable en `127.0.0.1:15679`. No es un comando de despliegue portable.
Comprueba identidad del destino y corpus sintético antes de utilizarlo; ante
incompatibilidad se detiene. Conserva claves nuevas en la ruta privada ignorada.

El evaluador clona las tres plantillas OE2 sin modificarlas, configura intervalos de
10 segundos, importa una credencial propia y publica únicamente esos IDs. Reinicia
N8N para registrar y retirar los triggers; hay una interrupción breve del proceso
N8N compartido, sin cambio de definición del workflow conversacional. Observa
ejecuciones `trigger`, cambia una copia de novedades y acredita aprobación y
consulta posterior. Despublica los clones, espera 12 segundos sin nuevas
ejecuciones, comprueba SQL, detiene su runtime y restaura PostgreSQL a detenido
si inicialmente estaba así. Conserva clones inactivos, releases y evidencia.
No se activan horarios permanentes ni reintentos de ejecuciones fallidas.

Las credenciales, exportaciones completas y logs crudos permanecen ignorados bajo
`infra/local/oe2-pipeline-02/`; no deben incorporarse a Git. La repetición crea
otra identidad fixture y retiene versiones anteriores. Consultar el resultado
privado y el estado de recursos antes de repetir una operación incierta.
