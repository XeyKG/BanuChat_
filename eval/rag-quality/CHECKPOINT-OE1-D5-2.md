# CHECKPOINT BANUCHAT — OE1-D5.2

Fecha: 28 de octubre de 2026, America/Bogota.
Rama: `main`.
HEAD base: `1b9b5d18f5cb98e36dc24c2f47a9f8f46dde0ba7`.
Estado Git inicial: limpio.
Estado: **COMPATIBILITY_ASSESSED**.

**Conclusión:** el benchmark aprobado no es transferible directamente a CCD
1.4.0. Ninguna de sus 12 identidades documentales gold existe en esa release y
no se encontraron copias exactas bajo otras claves. Las 57 referencias de las
50 preguntas requieren remapeo. La adaptación puede plantearse como un nuevo
benchmark, con revisión de suficiencia, temporalidad y procedencia y ratificación
del autor. Esta auditoría no aprueba ese remapeo ni acredita compatibilidad
semántica de preguntas individuales.

## 1. Identidad y acceso

Se leyeron `AGENTS.md`, el runbook Docker vigente, `infra/README.md`, D5.1 y las
secciones pertinentes del protocolo OE1. Se inspeccionaron el runner, el esquema
documental y las dependencias directas de la ruta documental autenticada.
El runbook Unified prevalece sobre las instrucciones históricas de 55453 del
README de infraestructura.

Benchmark privado: `data/ccd/local/oe1-evaluation/approved-benchmark-v1.json`.
SHA-256 comprobado antes de consultar:
`1e007142c2a573d9f2e4403e28b8eaae7dfe03cd31d1a514ee97423a7617609e`.
El archivo está ignorado por Git.

PostgreSQL observado:

- Contenedor: `banuchat-unified-postgres`.
- ID: `874662fc76ea6bd972b7631d7f9e245fa06af2f8331c4af12130cdc7acf2d63e`.
- Scope: `unified-isolated`; base: `banuchat_unified`.
- Puerto: `127.0.0.1:55463` hacia `5432/tcp`.
- Volumen: `banuchat-unified-data`, driver local, mismo scope; montaje en
  `/var/lib/postgresql/data`.
- Estado inicial: `running`. No se ejecutaron operaciones de arranque o parada.

Se reutilizó el acceso PostgreSQL privado documentado en D5.1, cargándolo solo en
memoria. Antes de comparar se comprobó SELECT sobre las seis tablas requeridas.
No se otorgaron privilegios. Las consultas usaron
`default_transaction_read_only=on` y transacciones
`REPEATABLE READ READ ONLY`; `SHOW transaction_read_only` devolvió `on`.
Las transacciones terminaron con `ROLLBACK`.

## 2. Releases y configuración

Ambas publicaciones pertenecen a `banuchat-ccd-local` y están `ready`.

| Campo | Histórica | Current |
| --- | --- | --- |
| Release | `3d6cedac-0e86-40c8-909b-d3ff6e8ab741` | `10af4ffd-effb-41fc-bbfe-4dc48cb3398f` |
| Contrato | `ccd-1.2.0` | `ccd-1.4.0` |
| Documentos / chunks / embeddings | 12 / 12 / 12 | 107 / 107 / 107 |
| Es el puntero current | No | Sí |
| Manifest SHA-256 | `ed288f6e79bc099b55cdbb16cae3ea3daa970f67b3c8074cf382c52bdd64d61a` | `fde23cabe95c83f5bd632d129312ad68c90624e6ebd489e79e98c6a3d0d96852` |
| Pipeline SHA-256 | `3d6d8c51357a6f325d66efebaf910457f998917b294292e3397e6ddf52402b1d` | `bd4cad46d7927c6aa6847fe9a2dc1b80b89f9badfb06f3e461558913ee556a6b` |

La configuración de embeddings es la misma: ID
`d7fb7a32-bf06-418b-b411-d0c7b33d5663`, proveedor Ollama,
`qwen3-embedding:0.6b`, revisión
`ac6da0dfba84a81fdbfbaf330198c33cd77c4cdfc53e8bc50eb581914a15621d`,
1024 dimensiones y coseno. Coinciden también los parámetros completos y el hash
`e1441a0aad0547d9db657f20708d585209a7d863c27f1b2b1e05aa42e6546771`.
Esto permite comparar la receta, pero no establece equivalencia entre documentos
o rankings. No se generaron embeddings ni se consultó Ollama.

## 3. Comparación documental y referencias gold

Se comparó cada tupla `document_key + ordinal + locator + source_sha256` del
benchmark con las dos releases. Se inspeccionaron además los UUID de versión y
chunk, hashes de contenido, texto exacto del chunk en memoria, estado de
procesamiento, modo `chunked` y presencia del embedding. Solo se imprimieron
metadatos y conteos; no se exportaron textos, preguntas o respuestas.

| Identidad histórica | Referencias en preguntas | Resolubles en 1.2.0 | Resolubles en 1.4.0 |
| --- | ---: | ---: | ---: |
| `ccd-m01` | 4 | 4 | 0 |
| `ccd-m12` | 3 | 3 | 0 |
| `ccd-tests-overview` | 7 | 7 | 0 |
| `ccd-u03` | 7 | 7 | 0 |
| `ccd-u04` | 7 | 7 | 0 |
| `ccd-m02-doc-098` | 4 | 4 | 0 |
| `ccd-m02-doc-099` | 4 | 4 | 0 |
| `ccd-m02-doc-100` | 4 | 4 | 0 |
| `ccd-m02-doc-101` | 4 | 4 | 0 |
| `ccd-m02-doc-102` | 4 | 4 | 0 |
| `ccd-m02-doc-103` | 4 | 4 | 0 |
| `ccd-m02-doc-104` | 5 | 5 | 0 |
| **Total** | **57** | **57** | **0** |

Las 57 referencias corresponden a 12 tuplas únicas y 50 preguntas (43 de un
contexto y 7 de dos contextos). Las preguntas afectadas son
`OE1-CCD-C-001` a `OE1-CCD-C-050`.

- Documentos históricos idénticos presentes en current: **0**.
- Documentos modificados bajo la misma clave: **0 pares comparables**, porque
  las 12 claves están ausentes; no significa ausencia de cambios semánticos.
- Documentos históricos ausentes por identidad en current: **12/12**.
- Claves current sin correspondencia con las históricas: **107/107**. El cambio
  no consiste en conservar 12 y añadir 95; es una reorganización de unidades.
- Comparación cruzada contra los 107 documentos, sin exigir la misma clave:
  cero coincidencias de `source_sha256`, hash de contenido de versión,
  localizador, UUID de versión o texto completo de chunk. Normalizar Unicode NFC
  y espacios tampoco produjo igualdad de texto completo.
- Las identidades de versión/chunk históricas no son utilizables en current.
  Todos los chunks actuales tienen ordinal 0; ese número solo no identifica una
  equivalencia. No hay un par gold actual que permita afirmar igualdad vectorial.
- Los 107 chunks actuales cumplen las condiciones estructurales del retriever
  general: procesamiento `ready`, documento `chunked` y embedding presente.
  Esto no demuestra que el filtro temático de la aplicación los admita para cada
  consulta; no se ejecutó recuperación vectorial.

La ausencia de un derivado completo no demuestra que sus hechos desaparecieron.
La equivalencia parcial, división en varias afirmaciones o cambio de alcance
requieren cotejo semántico. No se convirtió similitud temática en equivalencia.

## 4. Clasificación de las preguntas

| Criterio explícito | Compatibles | Incompatibles | Indeterminadas |
| --- | ---: | ---: | ---: |
| Reutilización directa del caso con sus referencias actuales en CCD 1.4.0 | 0 | 50 | 0 |
| Posibilidad de reutilizar pregunta/respuesta tras remapeo y nueva revisión | 0 confirmadas | 0 descartadas semánticamente | 50 |

Son dos criterios distintos sobre las mismas 50 preguntas, no 100 casos. La
incompatibilidad directa es demostrada por identidad; no significa que las 50
preguntas sean falsas o irrecuperables. No se realizó una nueva revisión humana
ni un cotejo semántico exhaustivo por afirmación contra las 107 unidades.

## 5. Efecto sobre validez y métricas

El manifiesto current contiene 107 claims `ccd-knowledge-2`: 100 tienen base
`DOCUMENT_SOURCE`, 39 incluyen `DOMAIN_CONFIRMATION` y 2 incluyen `INFERENCE`
(conteos no excluyentes). Hay 97 con condiciones y 107 con excepciones. La etiqueta
local `adopted` no equivale a ratificación institucional ni a aprobación del gold.

1. **Contextos relevantes:** hay que reconstruir para cada pregunta todos y solo
   los soportes necesarios, distinguiendo soportes alternativos y complementarios.
   Una unidad histórica podría corresponder a varias actuales. Incluso si las
   doce fuentes hubieran sido idénticas, ello no probaría completitud del gold
   frente a otros documentos relevantes; aquí ni siquiera hay igualdad exacta.
2. **Referencias de respuesta:** conservarlas requiere verificar cada afirmación,
   omisión, condición y procedencia. Las confirmaciones de dominio e inferencias
   no deben convertirse en evidencia documental institucional por estar en el
   corpus. Una restricción histórica por falta de información podría necesitar
   revisión ante evidencia adicional, sin suponer que toda novedad es válida.
3. **Temporalidad:** el manifiesto clasifica 28 claims `HISTORICAL`, 29
   `CURRENT_GENERAL`, 43 `TIMELESS_WITHIN_SCOPE`, 2 `TERM_SCOPED`, 2 `YEAR_SCOPED`,
   2 `DYNAMIC` y 1 `UNKNOWN_TEMPORAL_SCOPE`. Deben cotejarse periodo y población
   por afirmación; no convertir material histórico en oferta o regla vigente.
4. **MRR@5 / Precision@5 / Recall@5:** el universo y la unidad relevante cambian.
   El gold antiguo no resoluble invalida la evaluación; no corresponde reportar
   ceros como fallos del producto. Con gold nuevo, omitir soportes alternativos
   puede penalizar aciertos; omitir soportes necesarios puede inflar Recall.
   Dividir una fuente en varios chunks cambia denominadores y el primer rango
   relevante. Si un caso requiere más de cinco chunks, Recall@5 no puede llegar
   a 1. Hay que fijar relevancia y suficiencia antes del baseline, sin cambiar el
   top-k productivo. Las métricas de ambas releases no son comparables como una
   mejora causal con solo sustituir IDs.
5. **Representatividad:** las 50 preguntas fueron diseñadas para doce derivados.
   Su número no acredita cobertura de los 107 claims, ámbitos y límites actuales.
   Un subconjunto reutilizado debe etiquetarse como cobertura acotada y revisar
   sesgos, duplicación y familias nuevas; no rellenar hasta 50 artificialmente.
6. **Camino evaluado:** existe otra divergencia independiente del corpus, descrita
   a continuación. El cambio de metadatos del banco no basta para evaluar el
   comportamiento documental actual de la aplicación.

## 6. Correspondencia del evaluador con la aplicación

Inspección estática de código, sin ejecutar consultas del sistema:

- [Runner OE1](run-oe1-evaluation.mjs): importa `backend/api/dist/index.js`,
  calcula el ranking general con `retrieveDocumentChunksForQuery` y el `top_k`
  del banco (5); su captura llama directamente a `generateDocumentRagAnswer` con
  `retrieveDocumentChunks` general y `evidence_mode=ccd_local`.
- [Composición autenticada](../../backend/api/src/authenticated-runtime.ts):
  reconoce CCD 1.3/1.4 mediante el manifiesto y llama a
  `generateCcdKnowledgeAnswer`, con `retrieveCcdKnowledgeChunks` y metadatos
  de conocimiento. La ruta está enlazada desde el arranque Unified vigente.
- [Ruta CCD actual](../../backend/api/src/chat/ccd-knowledge.ts): delimita claves
  por tema/curso/historia y procedencia, recupera hasta 20 candidatos y selecciona
  evidencia con presupuestos y ramas de extracción/síntesis. Usa acceso SQL
  protegido. El ranking general @5 del runner no representa esa selección.
- La función genérica usada por el runner solicita 12 candidatos en modo CCD;
  esa rama también se observó en el `dist` existente. Compartir el cliente de
  embeddings no hace equivalentes las dos rutas de respuesta.

El runner puede medir un componente de recuperación general si se declara ese
alcance. Su captura actual no acredita el camino documental CCD 1.4.0 de la app.
Una futura evaluación del producto requiere autorizar la alineación del evaluador
con la composición vigente y verificar captura de contexto/citas efectiva,
manteniendo la guardia de current. Esta tarea no modifica ni ejecuta ese código.

## 7. Alternativas y recomendación

| Alternativa | Esfuerzo y riesgo | Validez y alcance |
| --- | --- | --- |
| A. Nuevo benchmark versionado para CCD 1.4.0 | Remapeo/revisión de las 50 candidatas, revisión de cobertura y alineación del evaluador; menor riesgo operacional al evitar restauraciones o cambios de current | Opción preferida para evidencia del producto vigente. Reutilizar solo lo comprobado y ratificado por el autor; conservar el banco anterior intacto |
| B. CCD 1.2.0 en copia aislada | Puede ahorrar nueva revisión del gold histórico; exige autorización, aislamiento, snapshot/reconstrucción legítima, credenciales y validación de entorno/runtime | Válida para alcance histórico acotado. Una copia de Unified mantendría current 1.4.0: copiarla por sí solo no resuelve la identidad. Corpus antiguo con código nuevo no reproduce automáticamente el producto histórico |
| C. Ambos como evaluaciones distintas | Mayor esfuerzo: suma dos entornos/bancos y sus validaciones | Conserva mejor la trazabilidad histórica y actual; separar denominadores, código, corpus y conclusiones. No sumar scores ni atribuir diferencias al corpus sin diseño comparativo |

**Recomendación:** A para evaluar el producto actual, conservando el benchmark
1.2.0 y su aprobación histórica. Es el mejor balance de riesgo operacional y
validez pertinente, aunque requiere trabajo humano nuevo. B podría requerir menos
edición del gold si la pregunta académica se limita al corpus histórico; no
satisface la evaluación del producto vigente. C minimiza pérdida de información
histórica, pero aumenta trabajo; elegirla solo si se necesita y autoriza la doble
evaluación. No se implementó ninguna alternativa ni se estimaron jornadas sin
evidencia.

## 8. Pendientes y cierre

Se requiere una tarea explícita para elegir e implementar una alternativa,
ratificar el nuevo gold, definir el alcance del evaluador y aprobar la cobertura
académica. Persisten: un único revisor autor, ausencia de revisión independiente
y de ratificación institucional CCD, 15 `reserve_candidate` no ciegas,
`AnswerRelevancy` con 7/12 coincidencias técnicas y MRR@5 pendiente de aceptación
académica. Esta auditoría no genera aprobaciones humanas ni declara OE1 cumplido.

Operaciones realizadas: inspección Docker, lectura de archivos, SELECT de
catálogos/releases/documentos y comparación en memoria, con transacciones de solo
lectura. No se invocaron el runner, funciones de retrieval, API, generación,
Ollama, RAGAS ni scripts de aprovisionamiento. Cero modificaciones productivas,
cero cambios Docker, cero cambios de banco/ledger y cero resultados del baseline.

Validación final ejecutada:

- `git diff --check`: sin errores de whitespace.
- `git diff --no-index --check -- NUL eval/rag-quality/CHECKPOINT-OE1-D5-2.md`:
  sin errores de whitespace en el archivo nuevo.
- `git status --short`: únicamente este checkpoint como archivo nuevo sin
  seguimiento; `git ls-files -- data/ccd/local` no devolvió archivos.
- SHA-256 del benchmark y del ledger: sin cambios durante la auditoría.
- Docker al cierre: mismo ID, estado `running`, puerto y volumen verificados;
  ninguna intervención sobre su estado.

No se ejecutaron suites de producto para este cambio documental. No commit ni
push. El estado `COMPATIBILITY_ASSESSED` cierra el diagnóstico; no autoriza el
baseline y no cambia el resultado `BLOCKED` del preflight D5.1.
