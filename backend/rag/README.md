# RAG — implementaciones 1–3 (Implementación 3 validada E2E)

Paquete privado `@banuchat/rag`, ESM y TypeScript estricto (ES2022).
Implementa foundation, lectura segura, preflight de contenido, siete schemas locales,
SHA-256 físico, identidades/relaciones, verificador Git local separado y extracción/
chunking determinista en memoria. Usa `node:test`, sin frameworks ni servicios.
Fuente de verdad: `/data/synthetic`, solo lectura. Contratos congelados sin cambios.

## Ejecutar

Requiere Node >=22 y npm; validado con Node 24.19.0 y npm 12.1.0 en Windows.
Git solo es necesario para el adaptador Git y sus pruebas. Desde este directorio:

```bash
npm ci
npm run typecheck
npm run build
npm test
npm run validate:dataset
```

El build emite JS y declaraciones en `dist/` (ignorado por Git); no escribe en la
fuente. `validate:dataset` lee el dataset actual del monorepo, valida contenido y
genera derivados en memoria; no exige que HEAD sea el commit de fuente aprobado.
Imprime solo contadores o un error seguro. No persiste chunks ni genera embeddings.
No hay workspace npm raíz. `package-lock.json` fija las dependencias reproducibles.

## API interna

Exportada por `src/index.ts` (build `dist/index.js`):

| Función | Frontera |
| --- | --- |
| `validateSyntheticContent({ syntheticRoot, profile? })` | Lectura local, sin Git/DB; devuelve catálogos y snapshot de bytes |
| `verifySourceCheckout({ sourceCheckoutRoot, expectedSourceRevision, requiredRelativePaths })` | Git local y comparación física; raíz/paths internos, no entrada HTTP |
| `extractMarkdownDocument(bytes, expectedSections=6)` | Receta Markdown v1; extracción y estructura verificadas |
| `chunkMarkdownDocument(extracted)` | Una sección H2 por chunk, sobre extracción ya validada |
| `deriveDocument(document, bytes)` | Rama chunked o full_document; hashes documentales |
| `buildDocumentDerivatives(validated)` | Usa únicamente los bytes del preflight, sin releer archivos |

También se exportan tipos, `PreflightError`, `safeError`, `SafeReader`, SHA-256,
parser/decoder, JSON Pointer y validadores temporales para pruebas y composición.
No mutar los catálogos, buffers ni derivados devueltos; el snapshot es de uso interno.
`SYNTHETIC_V1_PROFILE` se pasa explícitamente para exigir 18 files / 76 items,
distribución 12 documentos, 12 cursos, 22 eventos, 8 anuncios, 4 perfiles y 18
asociaciones; 10 chunked y 2 full_document. Sin ese perfil no se imponen esos
conteos. El dialecto/shape local sigue siendo el contrato v1, no un migrador de schemas.

## Controles implementados

- Rutas relativas con `/`: sin absolutos, traversal, separadores Windows, ADS ni
  alias de dispositivos. `lstat` en la cadena, comprobación de `realpath`, archivos
  regulares, detección de symlinks/junctions expuestos por Node y comprobaciones
  de identidad/cambio al leer. No se escribe en la fuente.
- UTF-8 fatal, sin BOM ni CR/CRLF y con LF final; SHA sobre bytes originales.
- JSON estricto con árbol `jsonc-parser`: sin claves duplicadas (incluidas escapadas),
  comentarios ni trailing commas. No se pierden duplicados con `JSON.parse`.
- Ajv 8 Draft 2020-12 + formatos, siete `$id` esperados, compilación de todos los
  schemas, referencias locales únicamente; no descargas ni coerción/defaults.
  `strictTypes` y `strictRequired` de Ajv se desactivan como reglas de lint porque
  los schemas congelados heredan tipos/propiedades de subschemas exteriores;
  la validación JSON Schema permanece habilitada. La precisión decimal se comprueba
  además sin corregir/redondear el porcentaje fuente.
- Inventario físico exacto contra manifest, incluyendo extras ocultos/ignorados.
  Solo se excluyen ubicaciones conocidas de README, HUMAN_REVIEW, manifest, siete
  schemas, `.gitattributes` y `.gitignore`. Un archivo nuevo no se ignora por tener
  extensión Markdown o por llamarse README en otra ubicación.
- `item.sha256 == file.sha256 == SHA256(bytes)`, sin reserializar JSON ni confundir
  hashes físicos con los futuros hashes canónicos JSONB de PostgreSQL.
- Identidad bidireccional `(kind,key)`, JSON Pointer RFC6901 con `~0`/`~1`, índices
  canónicos y propiedades propias; pares de progreso únicos, FK de eventos/progreso.
  El catálogo es autoridad de título/MIME/version_label; el manifest repite solo
  clave/path/modo. Se verifica H1 contra título, sin inventar metadata ausente.
- Fechas reales, RFC3339 con offset consistente con `America/Bogota`, intervalos
  ordenados incluyendo fracciones submilisegundo, null y estados según schemas.
  No se usa el reloj actual como regla funcional ni se añaden reglas editoriales.

Los errores tipados distinguen `SOURCE_REJECTED`, `VALIDATION_FAILED` e
`INTERNAL_ERROR`, con categoría y archivo lógico permitido. `toJSON()`/`safeError`
no serializan stack, stderr, paths arbitrarios, contenido fuente ni secretos.
No hay envelope HTTP ni logger productivo.

## Verificación Git separada

SHA completo (40/64 hex minúsculos) suministrado por el operador, nunca constante
universal ni HEAD del runtime asumido como fuente. Se exige raíz del checkout,
HEAD exacto, limpieza staged/unstaged/untracked/ignored en `data/synthetic` y
comparación binaria con blobs de toda esa carpeta más `requiredRelativePaths`
(incluir los atributos Git relevantes externos a ella). Se rechazan symlinks/
gitlinks. La comparación detecta divergencias ocultas por `assume-unchanged` o
conversiones, aunque Git status esté limpio. HEAD/status se revisan también al final.

Git se invoca con argumentos separados, sin shell, locks opcionales ni variables
`GIT_*` heredadas que redirijan repositorio/índice. No checkout/pull/fetch/branch/red.
Las pruebas crean commits exclusivamente en repositorios temporales aislados,
que se eliminan al finalizar; no crean un worktree persistente del proyecto.
No se implementan approval registry ni verificación de `implementation_revision`.

## Receta Markdown v1

Se retira solo el prefijo literal aprobado (línea de ficción, LF vacío,
`synthetic: true`, LF vacío). Se conserva íntegro el resto para `content_sha256`.
Un H1 inicial, ningún preámbulo sustantivo, seis H2 no vacíos y sin fenced code.
Estructura distinta falla: no se aplican heurísticas de recuperación.

Cada chunk = H1 exacto + dos LF + sección H2 completa, quitando únicamente los
LF finales de sección y añadiendo exactamente uno. Sin overlap de cuerpo, HTML,
descargas, normalización Unicode, cambios de espacios interiores o minúsculas.
Ordinal 0–5; locator `section:<ordinal>:<texto H2>`; páginas null; SHA-256 UTF-8
del contenido. El hash documental no es el hash de concatenar los chunks.

`full_document` evita extracción/chunking: cero chunks, cero embeddings y
`content_sha256 = source_sha256`. Preflight puede leerlo para verificar bytes,
UTF-8 y título; nunca se pasa al extractor. El artefacto histórico se resolverá
posteriormente por REST interno aprobado, no por URL externa.

El corpus actual produce **18 archivos, 76 items, 12 documentos y 60 chunks** en
memoria. La suite cubre positivos, fallos con copias temporales, primitivas, receta
y Git; si el SO impide crear enlaces, solo ese caso se marca SKIP con causa técnica.

## PostgreSQL: staging parcial (implementación 2)

Adaptador `pg` sin ORM; `@types/pg` solo para desarrollo. El core recibe un `Pool`
configurado por el caller y no lee `.env` ni resuelve secretos. SQL explícito,
parametrizado y con identificadores fijos; no modifica la migración ni el dataset.

API interna adicional:

- `withWriterLease(pool, callback)` / `WriterLease.acquire(pool)`: conexión dedicada.
  El wrapper libera en `finally`; quien use acquire debe hacer lo mismo.
- `resolveRelease(lease, input)`: dentro de una transacción corta del lease, resuelve
  dataset/configuración/identidad; devuelve staging, failed_requires_retry,
  already_current o already_ready_not_current. No reabre ni publica.
- `stageCandidate(lease, input)`: recibe contenido validado, derivados, datasetId=1,
  sourceGitRevision, pipelineConfig con implementation_revision, embeddingConfigId
  previamente autorizado y workflowRef explícito. No crea configuración Ollama.
  Devuelve release/run del staging o un resultado terminal sin DML adicional.

El namespace del advisory lock es ASCII `BANU`, big-endian `0x42414e55`
(`1111576149`, int32); segunda clave dataset_id=1. Se usa
`pg_try_advisory_lock(namespace, dataset_id)` de sesión, antes de resolver releases
o abrir intentos. Segundo escritor: DATABASE_CONFLICT. Unlock explícito al salir;
la conexión dedicada se descarta. Pérdida de conexión invalida el lease, sin
reconexión transparente ni cambio a otra conexión para continuar escrituras.

El lock no implica una transacción global: setup de release/run/items en una
transacción corta READ COMMITTED; después una transacción por registro estructurado
o documento con sus chunks. El caller futuro debe conservar el lease durante
`stage → embeddings → finalize`, siempre liberándolo en finally. Esta fase NO es
una ingesta standalone. Un run previo en la candidata o un run running existente
bloquea una nueva ejecución; no se toma control de intentos huérfanos ni se hace retry.

Dataset único: se inserta id=1/name=dataset_key solo si falta; si existe se comprueba
el nombre, sin UPDATE. La configuración recibida debe existir con dimensión 1024
y métrica cosine. PostgreSQL calcula los hashes JSONB de manifest/pipeline;
el código no los sustituye por SHA de JSON.stringify. El caller entrega una receta
JSON canónica v1 sin secretos; esta capa no implementa approval registry ni acredita
que implementation_revision corresponda al runtime ejecutado.

Estado esperado de v1 después de staging:

| Entidad/estado | Cantidad |
| --- | ---: |
| Cursos / anuncios / perfiles / eventos / progreso | 12 / 8 / 4 / 22 / 18 |
| Documentos / versiones / chunks | 12 / 12 / 60 |
| Items processed / pending / failed / skipped | 66 / 10 / 0 / 0 |
| Versiones ready / pending | 2 / 10 |
| Embeddings no nulos | 0 |

Release staging, run running y current_release_id intacto. Los dos full_document
no tienen chunks; los diez chunked siguen pending. Los 60 hashes generados por SQL
se comparan con los derivados TypeScript. No se mutan inputs ni buffers. Filas
inesperadas/duplicadas son invariantes fallidas, no upserts o skipped silenciosos.

Errores separados de preflight: DATABASE_UNAVAILABLE (conexión/dependencia),
DATABASE_CONFLICT (lease/contención/aislamiento), DATABASE_INVARIANT (contrato,
constraint o identidad incompatible). `toJSON()` solo expone el código; cause
queda interno, sin SQL, contraseña, connection string ni stack contractual.
No hay retry automático. Si falla tras algún commit parcial, se detiene y conserva
evidencia: la recuperación/finalización del intento queda pendiente. Un error de
COMMIT puede tener resultado incierto; no reenviar ciegamente.

### Pruebas PostgreSQL separadas

`npm test` conserva las 53 pruebas anteriores y añade unitarias DB sin servidor.
`npm run test:db` exige `BANUCHAT_TEST_DATABASE_URL`; si falta, falla explícitamente.
La base debe tener un nombre identificado como `banuchat_rag_test`, estar sin tablas
de usuario y sin schema banuchat. Solo entonces aplica el SQL original completo.
No DROP SCHEMA, DROP DATABASE ni TRUNCATE. No ejecutar sobre una base existente.

```powershell
# Únicamente contra una base desechable vacía preparada por el operador:
$env:BANUCHAT_TEST_DATABASE_URL = 'postgresql://banuchat_test:TEST_ONLY_LOCAL@127.0.0.1:PUERTO/banuchat_rag_test_impl2'
npm run test:db
```

La suite contiene fixtures de embedding_config claramente TEST_ONLY y una receta
pipeline canónica con SHA de implementación ficticio, sin digest/runtime real.
Los vectores TEST_ONLY prueban persistencia y publicación, no son salida de Qwen.
Usa el corpus v1 solo como input,
comprueba conteos/procedencia/hashes/inmutabilidad de inputs, conflicto y pérdida
de lease, identidad repetida, failed sin reopen, modo documental incompatible y
publicación incompleta rechazada mediante SAVEPOINT. Además verifica batching 4/2,
rollback de la transacción final mediante fallo inyectado, publicación con fixtures
y already_current sin nuevas generaciones. No acredita publicación con Ollama real.

Validada en PostgreSQL 16.15 / pgvector 0.8.6, imagen local `pgvector/pgvector:pg16`,
contenedor exclusivo con `--pull never`, puerto loopback dinámico y PGDATA tmpfs,
sin volúmenes persistentes. Cada ejecución necesita una base nueva. El operador
retira exclusivamente su contenedor desechable al terminar, sin limpieza global.

## Ollama y publicación (implementación 3)

**Implementación 3: validada E2E dentro del alcance aprobado el 2026-09-29.**
Ollama 0.34.4 con `qwen3-embedding:0.6b`, context length 32768 y embedding length
1024. Digest completo del artefacto local observado en esa ejecución, no una
constante universal:

```text
ac6da0dfba84a81fdbfbaf330198c33cd77c4cdfc53e8bc50eb581914a15621d
```

Se generaron 60 embeddings reales en 10 llamadas `/api/embed`, diez batches de seis.
PostgreSQL confirmó 76 ingestion_items processed, 12 document_versions ready,
60 chunks y 60 embeddings non-null; run succeeded y release ready/current.
`assert_release_complete` pasó. La segunda ejecución devolvió `already_current`,
sin nueva release, run ni embeddings. Distancia coseno propia del smoke test: 0.

Resultados observados: 81 unit tests PASS, 21 PostgreSQL integration PASS y 5 E2E
PASS; total del runner (incluidos tests contenedores): **107 PASS / 0 FAIL / 0 SKIP**.
Duración E2E aproximada: 81 segundos, observación de esa ejecución, no garantía ni
SLA. Estas cifras no son RAGAS, MRR ni evaluación de rendimiento del sistema.
Véase el [registro de evidencia E2E](../../eval/ingestion/results/implementation-3-e2e-2026-09-29.md).

- `buildPipelineConfigV1(implementationRevision)` construye diez campos cerrados:
  pipeline_version, implementation_revision, markdown_extraction, synthetic_banner,
  chunking, locator, full_document, encoding, normalization y schema_validation.
  Solo varía el SHA 40/64 lowercase; registra versiones instaladas de validadores.
  `validatePipelineConfigV1` rechaza faltantes, extras y semánticas incompatibles,
  también anidadas. PostgreSQL calcula pipeline_sha256, no JavaScript.
- `OllamaClient` recibe URL controlada HTTP loopback, usa fetch nativo, timeout y
  rechaza redirects. Inspecciona `/api/version`, `/api/tags` y `/api/show`.
  Exige modelo exacto, digest completo y capacidad embedding; cambios de runtime/
  digest/receta interrumpen la operación. No lee .env ni acepta configuración de chat.
- `/api/embed` recibe explícitamente modelo, input, dimensions=1024, truncate=false
  y options.num_ctx obtenido del contexto informado por `/api/show`. No añade
  prefijos ni normaliza texto. Esa opción efectiva queda en document/query junto
  con runtime_version; su compatibilidad se validó en la E2E real del 2026-09-29.
  Referencia: [API embed](https://docs.ollama.com/api/embed) y
  [API tags](https://docs.ollama.com/api/tags).
- `resolveEmbeddingConfig` reutiliza igualdad de campos/JSONB; inserta sin hash JS,
  relee tras conflicto UNIQUE concurrente y nunca actualiza configuración inmutable.
- `generateEmbeddings` limita el batch interno a 1–10 (default 10), por documento.
  V1 tiene seis chunks/documento: default implica diez llamadas de seis inputs.
  Comprueba cantidad, orden posicional, dimensión 1024, finitud y norma no nula
  también tras conversión float32; valida el batch entero antes de persistir.
  Vectores parametrizados con cast fijo `::public.vector(1024)`, timestamp SQL y run
  actual. Solo después de verificar seis vectores marca versión ready/item processed.
- `ingestApprovedCandidate` conserva un único WriterLease desde configuración hasta
  publicación. Las llamadas HTTP ocurren fuera de transacciones SQL; already_current
  no crea release/run ni llama a embed. No acredita aprobación ni procedencia runtime.
- `finalizeAndPublish` bloquea dataset→release y comprueba 76 processed, 12 ready,
  60 vectores del run. En una única transacción READ COMMITTED: run succeeded con
  finished_at → assert_release_complete → publish_release → COMMIT. Fallo: ROLLBACK.
  Un fallo anterior puede dejar staging/running parcial; no hay retry ni recovery.

### E2E real separada

`npm test` usa únicamente fixtures HTTP locales, sin PostgreSQL ni Ollama real.
`test:db` usa PostgreSQL desechable y fixtures explícitos, sin descargar modelos.
La E2E real exige otra base desechable vacía y el modelo aprobado instalado por el
operador. Falla explícitamente si falta; nunca transforma ese bloqueo en PASS/SKIP.

```powershell
$env:BANUCHAT_TEST_DATABASE_URL = 'postgresql://banuchat_test:TEST_ONLY_LOCAL@127.0.0.1:PUERTO/banuchat_rag_test_e2e'
$env:OLLAMA_BASE_URL = 'http://127.0.0.1:11434'
npm run test:e2e:ingestion
```

La precondición de modelo se comprueba antes de migrar. La ejecución del 2026-09-29
validó 60 embeddings reales, publicación, identidad repetida sin nuevas generaciones
y distancia coseno propia 0. Usó una `implementation_revision` sintética de prueba:
no acredita procedencia operacional automática del runtime. No mide calidad RAG
ni rendimiento.

## Límites y siguiente implementación

Todavía NO implementado: recovery, retry, reapertura de failed, recuperación de runs
huérfanos, approval registry operativo, verificación automática de
`implementation_revision`, HTTP interno, N8N, retrieval productivo, Intent Router
ni Agent/RAG. RAGAS/MRR no implementados ni validados.
Embeddings implementados y validados en E2E real: Ollama local,
`qwen3-embedding:0.6b`, 1024 dimensiones, coseno,
búsqueda exacta sin HNSW/IVFFlat; proveedor/modelo generador todavía abierto.
La publicación E2E de ingesta está validada dentro de este alcance; no se han
demostrado métricas OE1/OE2/OE4, calidad RAGAS/MRR ni rendimiento del sistema.

La raíz debe ser controlada, estable y montada read-only en el despliegue futuro.
Las comprobaciones portables de Node no equivalen a un sandbox del SO ni garantizan
ausencia de carreras contra un host que cambie enlaces/ancestros concurrentemente;
Node tampoco expone todos los tipos de reparse point de Windows. Revalidar fuente
antes de publicar y conservar por separado fuente histórica/runtime, según
[ADR 0005](../../docs/adr/0005-ingesta-reproducible-n8n.md) y
[diseño de ingesta](../../docs/ingesta-reproducible.md).

Antes de la siguiente fase quedan registro de aprobación, procedencia runtime,
montajes read-only, permisos mínimos y retry pendientes.
N8N solo orquestará; no posee reglas de negocio ni genera contenido funcional.
