# Benchmark de generación G0

Benchmark reproducible, **generator-only**, para evaluar si `qwen3:4b` es un candidato viable como generador local del MVP de BanuChat. Usa diez contextos sintéticos congelados y llama directamente a la API local de Ollama; no ejecuta retrieval ni acredita OE6 end-to-end.

## Alcance congelado

- Prompts: `prompts-v1.json`, con diez casos `G0-01` a `G0-10` derivados de `data/synthetic/documents/artifacts/doc-001.md` a `doc-010.md`.
- Modelo: `qwen3:4b`.
- API: `POST /api/chat` mediante `fetch` nativo de Node.
- Parámetros: `think=false`, `stream=false`, `temperature=0`, `num_predict=128` y `keep_alive="5m"` para las mediciones warm.
- System prompt y construcción del user prompt idénticos para todos los casos.

Los contextos son estáticos: el runner no hace retrieval ni consulta otras fuentes para construirlos.

## Requisitos

- Node.js con `fetch` global.
- Git disponible para registrar `git rev-parse HEAD`.
- Ollama local en `http://127.0.0.1:11434` con `qwen3:4b` instalado.

Puede cambiarse el origen con `BANUCHAT_EVAL_OLLAMA_BASE_URL`, pero únicamente se aceptan URLs HTTP de loopback con host `127.0.0.1`, `localhost` o `[::1]`. No se permiten credenciales, rutas adicionales, query, fragmentos ni redirects. Cada petición tiene un timeout explícito de 180 segundos.

## Ejecución futura

Desde la raíz del repositorio:

```powershell
node eval/generation/run-benchmark.mjs
```

Antes de medir, el runner ejecuta este preflight secuencial:

1. `GET /api/version` para capturar la versión del runtime.
2. `GET /api/tags` para confirmar que `qwen3:4b` existe y capturar su digest exacto.
3. `POST /api/show` para capturar capabilities y metadata de thinking disponible.

Luego ejecuta, también en forma secuencial:

1. **Unload/control:** petición mínima con `keep_alive=0`; no cuenta como benchmark.
2. **Cold:** una ejecución separada de `G0-01`, etiquetada `initial_cold_observation`; no entra en agregados warm.
3. **Warmup:** una petición de estabilización; no entra en métricas.
4. **Warm:** diez ejecuciones medidas, `G0-01` a `G0-10`, sin `Promise.all`.

La petición real con `think=false` es la validación final del control de thinking. Cualquier `message.thinking` no vacío aborta el benchmark. También se exige un `message.content` no vacío y métricas Ollama numéricas válidas.

## Métricas y resultados

Cada ejecución medida registra wall clock, duraciones de Ollama convertidas de nanosegundos a milisegundos, conteos de tokens, tokens por segundo y la respuesta. La tasa se calcula sin redondeo interno como:

```text
eval_count / (eval_duration / 1e9)
```

Los agregados se calculan exclusivamente sobre los diez casos warm. Incluyen media, mediana, mínimo y máximo de wall clock; media y mediana de duración total de Ollama; media de tokens de salida; media y mediana de tokens por segundo; y conteos por debajo o en/por encima de 5000 ms.

Tras una ejecución completa, se crean:

```text
eval/generation/results/g0-qwen3-4b-AAAA-MM-DD.json
eval/generation/results/g0-qwen3-4b-AAAA-MM-DD.md
```

La fecha del nombre se calcula en `America/Bogota`. Los archivos se crean sin sobrescribir resultados existentes. El JSON registra commit, SHA-256 de los bytes exactos de `prompts-v1.json`, fecha de generación, versión de Ollama, modelo, digest, parámetros y preflight.

## Interpretación y límites

El reporte usa 5000 ms como referencia porque el proyecto conserva un objetivo histórico de respuesta promedio menor a 5 s. Si la media warm de generación ya supera esa referencia, el reporte puede indicar que el modelo resulta poco prometedor en el hardware probado.

Este benchmark mide únicamente generación aislada en Ollama. No demuestra cumplimiento ni incumplimiento definitivo de OE6 end-to-end y no mide retrieval, Agent/ReAct, MCP, persistencia, REST ni mobile. Usa corpus/contexto sintético, una muestra pequeña de diez prompts, una observación cold separada y un warmup excluido.

## G0 v2: comparación controlada de qwen3:4b-instruct

G0 v2 conserva exactamente, en el mismo orden, los diez IDs, contextos y preguntas de G0 v1. La variable experimental principal es el modelo: v1 usa `qwen3:4b` y v2 usa `qwen3:4b-instruct`. Se mantienen sin cambios el system prompt, la construcción del user prompt, `think=false`, `stream=false`, `temperature=0`, `num_predict=128` y `keep_alive="5m"`.

Los archivos de v2 son:

```text
eval/generation/prompts-v2.json
eval/generation/run-benchmark-v2.mjs
```

El runner carga también `prompts-v1.json` y, antes del preflight de Ollama, exige igualdad exacta de `id`, `context` y `question` en las diez posiciones. Además conserva las mismas fases secuenciales: unload/control, observación cold inicial, warmup y las diez ejecuciones warm; las tres primeras no forman parte de los agregados warm.

Para cada ejecución medida, v2 registra `done`, `done_reason`, `thinking_present` y `starts_with_known_reasoning_preamble`, además de las métricas de v1. Exige `done=true`. Si el runtime proporciona `done_reason`, debe ser un string no vacío. Solo clasifica `stop` como terminación natural y `length` como límite de longitud; cualquier otro valor se reporta por separado, sin inferir su significado. `eval_count == 128` no se usa como prueba de truncamiento.

`message.thinking` nunca se almacena: únicamente se registra el booleano `thinking_present`, y cualquier string no vacío aborta el benchmark. El diagnóstico de prefacio inspecciona, sin modificar ni rechazar la respuesta, el comienzo de sus primeros 200 caracteres para las frases documentadas en el runner. No usa un clasificador LLM ni altera las métricas de latencia.

La ejecución futura es:

```powershell
node eval/generation/run-benchmark-v2.mjs
```

Una ejecución completa creará, sin sobrescribir archivos existentes:

```text
eval/generation/results/g0-v2-qwen3-4b-instruct-AAAA-MM-DD.json
eval/generation/results/g0-v2-qwen3-4b-instruct-AAAA-MM-DD.md
```

El digest completo se obtiene de `GET /api/tags`; no se valida contra un digest o prefijo hardcodeado. El reporte Markdown añade `done_reason`, el diagnóstico de prefacio y los conteos de terminación natural, límite de longitud y prefacio conocido. Estas señales son diagnósticas y no afirman automáticamente la calidad académica de las respuestas.

G0 v2 aún no tiene resultados ejecutados en este cambio, por lo que no corresponde comparar resultados con v1.

## L1: perfil reproducible de latencia Document RAG

`run-rag-latency-profile.mjs` es un instrumento para diez solicitudes warm
secuenciales de `POST /api/v1/conversations/{id}/messages`. El workload formal
congelado está en `l1-rag-latency-cases.json` (`L1-01` a `L1-10`): el runner envía
solamente cada `question` y el contexto llega del retrieval real del corpus
sintético. G0 sigue siendo el benchmark de generación; L1 no reemplaza G0 ni
G2, y no mezcla sus resultados con J1. El runner verifica antes de medir que
las diez preguntas L1 caigan en
`agent_fallback` con el catálogo real `1.1.0-draft`. Durante cada solicitud
comprueba además una decisión de fallback y exactamente una invocación de
Document RAG, embedding y generación.

Durante la preparación, el caso histórico G0-04 terminó en Ollama con
`done=true`, `done_reason=length` y `eval_count=256`, bajo el límite productivo
`num_predict=256`; por ello no produjo HTTP 201. Se separó un workload L1
específico por esa incompatibilidad funcional, sin modificar modelo, parámetros
ni producción. Las preguntas L1 se eligieron por su pertinencia documental y
posibilidad de respuesta breve y natural, no por tiempos observados. Las
ejecuciones L1 abortadas con preguntas G0 no forman parte de ningún agregado
formal L1.

### Preparación y revisión sin consultas costosas

Desde la raíz del repositorio:

```powershell
cd backend/api
npm run build
cd ../..
node eval/generation/run-rag-latency-profile.mjs --dry-run
```

El build local actualiza `backend/api/dist`, que el runner importa mediante una
ruta relativa al repositorio. `--dry-run` valida Git, casos L1 y decisiones del
router; no abre PostgreSQL, Ollama ni el servidor HTTP y no crea resultados. Se
rechazan cambios Git ajenos a los archivos L1 autorizados. El informe final
registra el commit y los archivos L1 aún sin commit, además del SHA-256 del runner
y del workload L1.

La validación funcional, que se ejecutará después de revisar este cambio, usa
las dependencias reales y recorre los diez casos L1 secuencialmente:

```powershell
node --env-file=.env eval/generation/run-rag-latency-profile.mjs --validate-l1-cases
```

Cada caso crea y limpia su propia conversación. Se exige fallback, una llamada
Document RAG, una llamada de embedding y una de generación, HTTP 201, respuesta
válida con `insufficient_evidence=false` y al menos una cita `source_kind=document`;
todas las citas deben ser documentales. No registra ni imprime tiempos, no
reintenta solicitudes y no crea resultados L1. Si falla un caso, informa su ID
y la condición fallida, y aborta; cualquier sustitución requiere revisión del
conjunto congelado.

Para la ejecución real posterior se necesitan PostgreSQL/pgvector y Ollama locales,
la release sintética lista y las mismas variables de entorno que usa
`backend/api` (`POSTGRES_*`, `BANUCHAT_GENERATOR_*` y opcionalmente
`BANUCHAT_OLLAMA_BASE_URL`). Con `.env` local, el comando será:

```powershell
node --env-file=.env eval/generation/run-rag-latency-profile.mjs
```

No ejecutar la medición hasta revisar el instrumento. El runner hace preflight de
release, versiones de PostgreSQL/pgvector y Ollama, modelos, digests y recetas.
Luego levanta la API real en proceso en `127.0.0.1` con puerto efímero usando
`createRuntimeApiServer`, `PgSqlClient`, Intent Router, clientes Ollama y
`generateDocumentRagAnswer` reales. Ejecuta un warmup excluido y diez casos
medidos secuencialmente. Cada caso crea su conversación fuera del cronómetro,
mide el POST completo incluyendo lectura del JSON y confirma limpieza con
`DELETE 204` seguido de `GET 404`. Cualquier error aborta; no hay reintento del
POST. Los dos archivos de resultados se crean con `wx`, sin sobrescribir otros.
Una corrida abortada no crea resultados L1 oficiales, aunque casos anteriores
del mismo intento hayan respondido. Tras intentar la limpieza, el runner informa
solo el status HTTP, `error.code` y `request_id` públicos cuando estén disponibles,
la ruta, conteos y etapas observadas, y un identificador seguro del error capturado
por los wrappers de evaluación. Ese diagnóstico ayuda a ubicar la etapa o
dependencia observada; el body HTTP por sí solo no acredita la causa interna.

Para investigar históricamente un caso G0 aislado sin producir evidencia L1
oficial, el modo `--diagnose-case` acepta únicamente `G0-01` a `G0-10`:

```powershell
node --env-file=.env eval/generation/run-rag-latency-profile.mjs --diagnose-case G0-04
```

Ejecuta solo el caso elegido con dependencias reales, conversación nueva y
limpieza confirmada; no hace warmup, retries ni escribe archivos de resultados.
Solo en este modo, una copia de la respuesta de Ollama `/api/chat` permite
mostrar status, señales de terminación, conteos y duraciones numéricas, y la
presencia/longitud del contenido y presencia de thinking. No registra los textos
de `message.content` o `message.thinking`, prompts ni chunks. Clonar y analizar
esa respuesta puede añadir tiempo, por lo que esta instrumentación no se usa en
las diez corridas formales. Si se observa `done_reason=length`, describe esa
respuesta concreta y no decide por sí solo una optimización.

### Etapas y lectura de resultados

Los wrappers temporales de evaluación miden, en el mismo recorrido HTTP:

- `conversation_context_db_ms`: consulta de contexto/ordinal.
- `rag_embedding_config_db_ms`: configuración de embedding de la release.
- `query_embedding_ms`: llamada completa al cliente, con sus verificaciones de runtime.
- `rag_release_availability_db_ms`: comprobación de release lista anterior al vector.
- `vector_retrieval_db_ms`: consulta pgvector de chunks.
- `generation_ms`: llamada completa al cliente, con sus verificaciones de runtime.
- `persistence_db_ms`: sentencia atómica de mensajes y citas.

`generator_ollama_total_duration_ms` procede del resultado del generador y está
incluido dentro de `generation_ms`; no se suma otra vez. Como las siete etapas
observadas son secuenciales, `other_orchestration_ms` resta su suma del wall
clock. Ese residual incluye trabajo de router, validaciones, serialización y
transporte HTTP local; no separa ni atribuye esos componentes. Los agregados usan
solo las diez corridas warm: media, mediana, mínimo, máximo y p95 por etapa, y
conteos por debajo o en/por encima de 5000 ms para wall clock. p95 usa
**nearest rank**: el elemento ordenado en posición `ceil(0.95 × n)`; con diez
observaciones es el máximo y es una descripción inestable, no una estimación
poblacional robusta. L1 compara descriptivamente con la referencia histórica de
5000 ms, sin decidir el cumplimiento de OE6 ni cambiar su formulación.

Los resultados futuros tendrán fecha `America/Bogota` y quedarán en
`results/l1-rag-latency-AAAA-MM-DD.json` y `.md`. Los intentos L1 abortados
durante la preparación no produjeron resultados oficiales.

## OPT-1C: contexto de query y estabilidad del retrieval

`compare-query-context-retrieval.mjs` investiga el thrashing de GPU observado
cuando el embedding con `num_ctx=32768` y el generador compiten por residencia.
Compara únicamente el contexto de los embeddings de consulta: `32768` frente a
`4096`. La receta documental permanece en `32768` y ambos vectores se buscan
contra los mismos embeddings documentales de la release actual. No regenera
documentos, no escribe PostgreSQL, no llama al generador y no modifica la
configuración productiva. Esta exploración no mide latencia ni es L1-B.

Desde la raíz, la revisión local es:

```powershell
node --check eval/generation/compare-query-context-retrieval.mjs
node eval/generation/compare-query-context-retrieval.mjs --dry-run
```

El dry-run valida el workload L1 congelado, su SHA-256 frente al baseline L1,
los cambios Git permitidos y la URL loopback de Ollama. No abre PostgreSQL ni
Ollama. Para la ejecución real posterior, compilar `backend/api` con
`npm run build` y usar PostgreSQL/pgvector, Ollama y las variables `POSTGRES_*`
de `backend/api`; `BANUCHAT_OLLAMA_BASE_URL` solo acepta loopback:

```powershell
node --env-file=.env eval/generation/compare-query-context-retrieval.mjs
```

El preflight exige que la release actual esté lista y sea la registrada en L1,
con modelo, digest, runtime, dimensión 1024, coseno y recetas query/document
iguales a las del baseline. Confirma el modelo y digest con `/api/tags`, la
capability de embedding y contexto nativo de al menos 32768 con `/api/show`.
Después obtiene un vector y hace retrieval `top_k=5` por pregunta, primero
para los diez casos con `32768` y luego para los diez con `4096`; el orden no
aporta conclusiones de rendimiento. Cada petición `/api/embed` usa
`truncate=false`, `dimensions=1024` y texto sin prefijo (`input_prefix=null`).
La búsqueda reutiliza `retrieveDocumentChunks` y su SQL productivo: filtra la
misma release, versiones `ready`, documentos `chunked` y embeddings presentes;
ordena por distancia coseno, `document_version_id` y `ordinal`.

La identidad estable comparada es `document_version_id:ordinal`. El JSON
registra por caso similitud coseno entre vectores, diferencia absoluta máxima,
top-1, conjunto y orden del top-5, intersección, Jaccard, ranks, IDs, locators
y distancias. El Markdown resume qué casos conservan el top-5, cambian su
orden o incorporan/sacan chunks. Un coseno alto entre vectores no basta para
declarar equivalencia. Los resultados exploratorios se crean con `wx`, sin
sobrescribir, en `results/opt1c-query-context-retrieval-AAAA-MM-DD.json` y
`.md` (fecha `America/Bogota`). Esta primera entrega no ejecuta la comparación
real ni cambia producción.
