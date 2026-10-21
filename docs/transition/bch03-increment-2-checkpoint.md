# CHECKPOINT BANUCHAT — BCH-03 incremento 2

Fecha: 2026-10-21. Incremento terminado: primera ingesta CCD real publicada y
Document RAG directo validado. Base del código: `298b833a5fd319106b1aa27dca793afef2d51d9a`.
Los cambios ejecutados están sin commit; sus hashes se registraron en la release.
No se afirma que el commit base contenga estos cambios ni que sea una revisión de
los documentos institucionales externos.

## Destino y migraciones

Se inspeccionaron Docker, la base y las variables locales sin exponer credenciales.
Antes del arranque no existía servicio ni volumen CCD. El servicio creado usa:

| Identidad | Valor observado |
| --- | --- |
| Proyecto / servicio | `banuchat-ccd-dev` / `postgres-ccd` |
| Contenedor | `3492ad8d2a3c4432b3589751dd7b4966153244c238273411fa220c025b30a069` |
| Base | `banuchat_ccd_dev` |
| Volumen | `banuchat-ccd-dev_ccd_pgvector_data` |
| Puerto | `127.0.0.1:55433` |

Se comprobó ausencia de esquema BanuChat y de tablas/esquemas de aplicación antes
de migrar. Se aplicaron `infra/db/001_initial_schema.sql` intacta y la adicional
`infra/db/002_ccd_local_manifest.sql`. La adicional conserva el validador sintético,
introduce la rama CCD explícita y se niega a ejecutarse fuera de la base CCD o con
corpus previo. Se mantienen las guardas originales y la publicación atómica.
No se creó soporte multidataset ni tablas nuevas respecto del esquema inicial.

`infra/.env.ccd` se creó localmente con credenciales nuevas, sin mostrarlas. Permanece
ignorado. No se ejecutaron reset, borrados, `down -v`, commit ni push.

## Carga y trazabilidad observadas

Solo `ccd-m01` (M01, C04/C07) y `ccd-m12` (M12, C44/C45), contrato `ccd-1.0.0`,
versión editorial `bch03-m01-m12-local-1`. Se revalidaron fuentes y snapshot antes
y después del procesamiento; los originales externos siguieron siendo de lectura.
La validación sigue siendo del equipo, sin aval institucional y con actualidad no
ratificada. No se incorporaron reglas bloqueadas ni información personal.

| Comprobación | Resultado real |
| --- | --- |
| Release | `5834fc47-57c5-498b-98fc-4190330155e4` |
| Estado / puntero | `ready` / `current=true` |
| Documentos / versiones | 2 / 2 |
| Chunks / embeddings | 2 / 2, vectores no nulos y no cero de 1024 dimensiones |
| Run | Un intento manual exitoso, sin retry/recovery |
| Reejecución explícita idéntica | `already_current`, misma release, 0 embeddings nuevos |
| Corpus físico SHA-256 | `3c237faf48b1b924b580c6301c3b67b321ddc2d8c0dd8d30000ea2845e88b5d8` |
| Manifiesto JSONB SHA-256 | `27391f96ab9fd830c34e4aeed4c45699ccd20bd2d5a03d2c0fb1de54ee0b02be` |
| Pipeline JSONB SHA-256 | `6fc5eeefe186802a84d355221d92c5f92a158ac509a290617459bbf65a76afc4` |

`pipeline_config.source_revision_kind=local_snapshot_sha256`; se conserva la revisión
base del código y un mapa de SHA físicos de sus fuentes ejecutadas, configuración y
migraciones. `manifest.ccd_provenance` enlaza artefactos con unidad C/M, DOC-110,
cierre BCH-01, localizadores y sus SHA. No se atribuye Git a los originales.

Se cotejaron bytes del Markdown servido por `getDocumentArtifact` con los derivados,
hashes y contenido almacenados en PostgreSQL:

- M01: `dd9e65c9c8ce691b12b6e41ee430231a1df9629371b2c5c2cbaa9c849efdbb9a`.
- M12: `b23e52d819072ff5baaa5ed2bd8a77be51c32d8b3eaec9c394747072e3037e8e`.

Se comprobó el rechazo de modificación de una versión publicada dentro de una
transacción revertida. Las comprobaciones negativas no alteraron el corpus.

## Modelos efectivos

- Ollama `0.35.0`.
- Embeddings `qwen3-embedding:0.6b`, digest
  `ac6da0dfba84a81fdbfbaf330198c33cd77c4cdfc53e8bc50eb581914a15621d`;
  1024 dimensiones, coseno, contexto documental 32768, consulta 4096, sin truncamiento.
- Configuración de embeddings SHA JSONB:
  `e1441a0aad0547d9db657f20708d585209a7d863c27f1b2b1e05aa42e6546771`.
- Generador `qwen3:4b-instruct`, digest
  `0edcdef34593eac1aa2be9c7d06c432dcf81945adca5eca2f27662c18f168ba0`;
  receta existente: think=false, temperatura 0, num_predict=256, sin streaming.

Los clientes existentes inspeccionaron identidad de runtime/modelos; no se usaron
vectores ni respuestas simuladas para estas consultas.

## Consultas y citas

Se invocó `generateDocumentRagAnswer` con conexión CCD, clientes Ollama reales y
`evidence_mode=ccd_local`. La raíz de artefactos se pasó explícitamente al resolver.
No hubo REST, Mobile, perfil de estudiante, conversación ni persistencia de turnos.

| Caso solicitado | Resultado cotejado | Citas devueltas |
| --- | --- | --- |
| Tres pilares documentados en 202660 | Respuesta coincide con los tres nombres del contenido admitido; M01 aparece primero en recuperación. | `unit:M01`, `unit:M12` |
| Correo documentado en 202660 | Devuelve el correo del contenido admitido; M12 aparece primero en recuperación. | `unit:M12`, `unit:M01` |
| Repetición gratuita de todas las pruebas perdidas | Generador indica evidencia insuficiente; servicio devuelve su mensaje de abstención. No concede permiso académico. | Ninguna |

Los dos positivos recuperan ambos chunks porque el top-k histórico es 5 y el corpus
solo tiene dos. Las citas del servicio enumeran contexto recuperado; no son una
atribución individual por afirmación. Los records conservan release, versión,
chunk y hash del artefacto, con cadena a originales en el manifiesto.

Respuestas textuales, métricas observadas, ranking/distancias, UUID de citas,
hashes y configuraciones completas permanecen solo en archivos locales ignorados:

- `data/ccd/evidence/increment-2/ingestion-1792623410744.json` (primera carga).
- `data/ccd/evidence/increment-2/checks-1792623349976.json` (validadores SQL).
- `data/ccd/evidence/increment-2/checks-1792623450859.json` (tres consultas).
- `data/ccd/evidence/increment-2/ingestion-1792623472854.json` registra el no-op `already_current`.
- `rag-unit.log` y `api-unit.log` conservan las salidas unitarias.

No se incluyen respuestas institucionales completas ni originales en este checkpoint
versionable. Los positivos tardaron aproximadamente 10.16 s y 4.09 s; el negativo
1.86 s en esta ejecución secuencial. No son benchmark ni evidencia de cumplimiento
de metas de latencia, calidad, usabilidad o generalización.

## Pruebas y regresión

| Prueba ejecutada | Resultado |
| --- | --- |
| Typecheck `backend/rag` | Código 0. |
| Typecheck `backend/api` | Código 0. |
| Typecheck estricto del runner `.mts` | Código 0. |
| Build RAG / API | Ambos código 0. |
| Unitarias RAG | 198 aprobadas, 0 fallos, 0 omitidas. |
| Unitarias API | 470 aprobadas, 0 fallos, 0 omitidas. |
| Validación SQL CCD | 12 casos aprobados; repetidos con el mismo resultado en la verificación de consultas. |
| Persistencia y artefactos reales | 2 documentos/chunks/vectores; hashes, versiones, estado y bytes verificados. |
| Consultas reales | 3 de 3 con el comportamiento esperado, cotejo humano de positivos y abstención negativa. |
| `validate:dataset` sintético | 18 archivos, 76 items, 12 documentos, 60 chunks. |
| Integridad de carpeta externa | 124 archivos cotejados por SHA-256 contra el inventario del diagnóstico; 0 diferencias. |
| `git diff --check` y revisión final de archivos | Código 0; sin cambios fuera del alcance. Credenciales, corpus y evidencia local ignorados. |

Hubo dos fallos iniciales del mismo verificador de evidencia: TypeScript detectó
`import.meta` en un `.ts` interpretado como CommonJS y tsx rechazó top-level await.
Se corrigió a `.mts`; luego typecheck y ejecución pasaron. No se repitieron migraciones,
no hubo ingesta fallida y no se modificó un contrato para superar el fallo.
El acceso Docker inicial dentro del sandbox fue denegado; las operaciones autorizadas
se ejecutaron con el permiso necesario. No se relajaron controles del destino.

La demo se leyó antes/después, sin escribir: mismo contenedor `a2903193f220`, base
`banuchat_schema_test`, 2 releases, 120 chunks históricos y puntero
`6a770ce7-13b7-4b0b-95ae-0c193fa0d655` sin cambios. Estos son conteos de la base
histórica, distintos de los 60 chunks de una release v1. SQL inicial y archivos del
dataset congelado no tienen diff. No se detectaron regresiones en lo comprobado;
no se ejecutó nuevamente el E2E completo de la demo ni `npm run test:db` histórico
porque requiere otra base y no es necesario modificarla para esta carga CCD.

## Archivos de implementación y límites

Nuevos: `infra/db/002_ccd_local_manifest.sql`, `backend/rag/src/db/recipe.ts`,
`backend/rag/src/ccd/ingest.ts`, `load-local.ts`, `local-runtime.ts`,
`backend/rag/test/ccd-storage.test.ts`, `eval/integration/ccd-local-check.mts`
y este checkpoint.

Modificados: `backend/rag/src/db/{documents,embeddings,finalize,runs}.ts`,
`backend/rag/package.json`, `backend/api/src/chat/document-rag.ts`,
`backend/api/test/document-rag.test.ts`, `AGENTS.md`, `data/ccd/README.md`,
`backend/rag/README.md`, `infra/db/README.md`, `infra/db/ccd-local-development.md`,
`docs/arquitectura.md`, ADR 0006 y la nota de estado del plan de transición.
La implementación parcial encontrada al inicio se revisó y reutilizó.

La evidencia, credenciales y contenido CCD local siguen ignorados. No se incorporó
otro grupo, dataset, syllabus, programación, multimedia, estudiante ni regla bloqueada.
El modo sintético conserva su etiqueta y defaults; la etiqueta CCD solo se selecciona
en el runner directo, no se habilita institucionalmente el chat completo. La selección
de perfiles sintéticos sigue sin equivaler a autenticación real. Sin MCP, Agent/ReAct,
mejoras conversacionales, despliegue institucional ni compromisos académicos resueltos.

La vigencia actual de las fuentes no está ratificada; las consultas positivas se
limitaron explícitamente a 202660. Corpus pequeño, sin benchmark final. La ruta
directa no prueba integración REST/Mobile ni persistencia de `message_citations`.
La configuración local emplea privilegios de desarrollo, no un despliegue institucional.
El incremento termina aquí, sin commit ni push.
