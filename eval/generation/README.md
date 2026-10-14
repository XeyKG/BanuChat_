# Generación y latencia — índice de experimentos

Estos experimentos ya tienen resultados versionados; las secciones de metodología
conservan sus recetas y contextos históricos, sin acreditar nuevas ejecuciones.
El runtime Document RAG vigente usa `qwen3:4b-instruct` y un router `1.2.0-draft`.

| Experimento | Evidencia | Alcance |
| --- | --- | --- |
| G0 v1 | [Resultado](results/g0-qwen3-4b-2026-10-01.md) | Generación aislada con qwen3:4b y diez contextos estáticos. |
| G0 v2 | [Resultado](results/g0-v2-qwen3-4b-instruct-2026-10-01.md) | Comparación con qwen3:4b-instruct; diez terminaciones naturales bajo la receta G0. |
| G1b | [Resultado](results/g1b-rag-output-limit-2026-10-01.md) | Límite de salida probado con un prompt/contexto RAG; 256 fue el menor límite ensayado con terminación natural. |
| G2 | [Resultado](results/g2-rag-e2e-smoke-2026-10-01.md) | Smoke RAG E2E histórico y cinco observaciones warm; no es la medición más reciente. |
| L1 | [Baseline](results/l1-rag-latency-2026-10-03.md) | Diez POST warm secuenciales y perfil por etapas; receta anterior. |
| OPT-1C | [Resultado](results/opt1c-query-context-retrieval-2026-10-03.md) | Query num_ctx 32768/4096: top-1 y conjunto top-5 iguales en 10/10; orden igual en 9/10. No mide latencia. |
| L1-B | [Medición posterior](results/l1-b-rag-latency-2026-10-03.md) | Mismo workload/metodología L1, release con query=4096/document=32768; media wall 4013.57 ms, mediana 3956.78 ms, mínimo 1883.42 ms, máximo/p95 6485.59 ms, 8/10 <5000 ms. Generación media 3622.38 ms; vector DB 3.03 ms. |
| M8.3-A | Diagnóstico de sensibilidad a paráfrasis | Compara dos formulaciones de una consulta sobre incidencias, tres veces cada una, observando embedding, retrieval y generación reales sin escribir en PostgreSQL. |
| M8.3-B | Diagnóstico de paridad E2E | Compara Document RAG interno, POST /messages y GET conversation con las dos preguntas congeladas de M8.3-A. |

Cada Markdown tiene JSON complementario con metadata y resultados. L1-B no
acredita formalmente OE6 ni SLA: n=10, p95 nearest rank igual al máximo, sin
inferencia poblacional. No se combinan G0, G2, J1, L1 y L1-B estadísticamente.
RAGAS completa y evaluación formal con usuarios siguen pendientes.

Limitación de reproducción en el HEAD actual: `run-rag-latency-profile.mjs`
todavía exige `router.catalog_version === "1.1.0-draft"` en su preflight, aunque
el catálogo vigente es `1.2.0-draft`. Las instrucciones L1/L1-B siguientes
describen el instrumento y entorno históricos; una nueva corrida con el router
actual requiere corregir ese runner en una tarea funcional separada. Esta
auditoría conserva tanto el runner como sus resultados.

## G0 v1: metodología histórica

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

## Comando del instrumento G0 v1

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

El comando del instrumento G0 v2 es:

```powershell
node eval/generation/run-benchmark-v2.mjs
```

Una ejecución completa creará, sin sobrescribir archivos existentes:

```text
eval/generation/results/g0-v2-qwen3-4b-instruct-AAAA-MM-DD.json
eval/generation/results/g0-v2-qwen3-4b-instruct-AAAA-MM-DD.md
```

El digest completo se obtiene de `GET /api/tags`; no se valida contra un digest o prefijo hardcodeado. El reporte Markdown añade `done_reason`, el diagnóstico de prefacio y los conteos de terminación natural, límite de longitud y prefacio conocido. Estas señales son diagnósticas y no afirman automáticamente la calidad académica de las respuestas.

G0 v2 ya tiene [resultados](results/g0-v2-qwen3-4b-instruct-2026-10-01.md).
La comparación con v1 se limita a generación aislada bajo sus recetas congeladas;
no se interpreta como latencia de POST /messages.

## L1: perfil reproducible de latencia Document RAG

`run-rag-latency-profile.mjs` es un instrumento para diez solicitudes warm
secuenciales de `POST /api/v1/conversations/{id}/messages`. El workload formal
congelado está en `l1-rag-latency-cases.json` (`L1-01` a `L1-10`): el runner envía
solamente cada `question` y el contexto llega del retrieval real del corpus
sintético. G0 sigue siendo el benchmark de generación; L1 no reemplaza G0 ni
G2, y no mezcla sus resultados con J1. El runner verifica antes de medir que
las diez preguntas L1 caigan en
`agent_fallback` con el catálogo histórico `1.1.0-draft` (el runner aún exige esa
versión; véase la limitación de reproducción al inicio). Durante cada solicitud
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

El modo de validación funcional del instrumento histórico usa
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

Para ejecutar el instrumento se necesitan PostgreSQL/pgvector y Ollama locales,
la release sintética lista y las mismas variables de entorno que usa
`backend/api` (`POSTGRES_*`, `BANUCHAT_GENERATOR_*` y opcionalmente
`BANUCHAT_OLLAMA_BASE_URL`). Con `.env` local, el comando será:

```powershell
node --env-file=.env eval/generation/run-rag-latency-profile.mjs
```

Una nueva medición requiere revisar primero la compatibilidad del instrumento.
El runner hace preflight de
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

El baseline L1 congelado está en
`results/l1-rag-latency-2026-10-03.json` y `.md`; no debe modificarse ni
sobrescribirse. Los intentos L1 abortados durante la preparación no produjeron
resultados oficiales.

### L1-B: medición formal posterior a la optimización

L1-B reutiliza este mismo runner, los diez casos congelados L1 en el mismo orden,
el warmup excluido, las diez corridas secuenciales, la instrumentación por etapas,
los agregados y el p95 nearest-rank. El runner sigue obteniendo de PostgreSQL la
release actual y su receta real de embedding durante el preflight; no exige un ID
de release hardcodeado.

L1-B ya tiene resultados; el comando de su instrumento histórico es:

```powershell
node --env-file=.env eval/generation/run-rag-latency-profile.mjs --l1-b
```

El modo registra `benchmark_id=banuchat-rag-latency-l1-b`, identifica en metadata
la medición como post-optimización comparable con L1 por workload y metodología,
y crea sin sobrescribir:

```text
eval/generation/results/l1-b-rag-latency-AAAA-MM-DD.json
eval/generation/results/l1-b-rag-latency-AAAA-MM-DD.md
```

La configuración del CLI valida que los prefijos formales L1 y L1-B sean
distintos. L1-B nunca apunta a `l1-rag-latency-AAAA-MM-DD.*`, por lo que no puede
sobrescribir el baseline congelado. La comparación L1-B frente a L1 es
descriptiva bajo el mismo workload y metodología; no constituye una prueba
general de SLA ni acredita por sí sola OE6.

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
Ollama. Para ejecutar el instrumento histórico, compilar `backend/api` con
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
`.md` (fecha `America/Bogota`). La comparación real ya fue ejecutada y su
[evidencia](results/opt1c-query-context-retrieval-2026-10-03.md) está congelada.
Repetirla exige la release/receta baseline y revisar sus precondiciones; el
instrumento exploratorio no cambia producción. La receta query=4096 se implementó
posteriormente y L1-B midió otra release; no se atribuye esa latencia a OPT-1C.

## M8.3-A: diagnóstico de sensibilidad a paráfrasis

`run-m8-3-paraphrase-diagnostic.mjs` ejecuta el Document RAG productivo con dos
preguntas congeladas en `m8-3-paraphrase-diagnostic-cases.json`: la formulación
que omite «de la práctica» y la que incluye esa aclaración. Cada pregunta se
evalúa tres veces en orden intercalado. No se define de antemano cuál debe pasar
o fallar; el objetivo es observar si una variación léxica pequeña cambia el
embedding, el top-5 recuperado o la respuesta del generador.

El instrumento importa `generateDocumentRagAnswer` y las implementaciones reales
compiladas de embedding, retrieval y generación. Los wrappers de evaluación
registran los vectores de consulta, las filas recuperadas, el prompt exacto y la
respuesta de Ollama. PostgreSQL se limita formalmente a sentencias `SELECT`; el
runner rechaza cualquier intento de escritura. También exige que Git esté en
`main`, que `HEAD` coincida con `origin/main`, y que los únicos cambios locales
sean los archivos autorizados de M8.3-A dentro de `eval/generation/`.

La revisión local no abre PostgreSQL ni Ollama y no crea resultados:

```powershell
node --check eval/generation/run-m8-3-paraphrase-diagnostic.mjs
node eval/generation/run-m8-3-paraphrase-diagnostic.mjs --dry-run
```

La ejecución formal requiere `backend/api/dist`, PostgreSQL/pgvector y Ollama
locales, la release sintética actual en estado `ready`, y las variables de
entorno usadas por `backend/api`:

```powershell
node --env-file=.env eval/generation/run-m8-3-paraphrase-diagnostic.mjs
```

El preflight registra la revisión del repositorio, release, configuración y
receta de embedding, versiones de PostgreSQL y pgvector, modelo y digest del
embedding, y modelo, digest y parámetros del generador. La ejecución conserva
`top_k=5`, `temperature=0` y `num_predict=256`. Por corrida se guardan hashes y
contenido de los chunks, posiciones de `doc-008`, prompts exactos, salida cruda,
marcador de evidencia insuficiente y métricas que expone el generador.

La comparación principal usa la primera repetición de cada pregunta y reporta
similitud coseno y diferencia máxima entre vectores, igualdad del top-1, conjunto
y orden del top-5, intersección, Jaccard y posiciones de `doc-008`. Las tres
repeticiones sirven para comprobar si el resultado observado es estable. La
clasificación de causa es conservadora: puede señalar dominancia de retrieval o
generación solamente cuando las observaciones la sostienen; en los demás casos
queda como mixta o inconclusa.

Una ejecución completa crea, sin sobrescribir, los archivos
`results/m8-3-paraphrase-diagnostic-AAAA-MM-DD.json` y `.md`, con fecha de
`America/Bogota`. Este diagnóstico usa dos preguntas y tres repeticiones, no es
RAGAS, no estima calidad general ni significancia estadística, y no acredita por
sí solo una corrección productiva.

## M8.3-B: paridad Document RAG, REST y persistencia

`run-m8-3-e2e-parity.mjs` reutiliza exactamente las dos preguntas congeladas de
M8.3-A y ejecuta tres repeticiones intercaladas por pregunta. Cada repetición
crea una conversación nueva para el perfil sintético `profile-001`, envía la
pregunta mediante `POST /messages` y reconstruye el turno con `GET conversation`.

El servidor se crea en proceso con `createRuntimeApiServer`, escucha solo en
loopback y usa PostgreSQL, Intent Router, Document RAG, embedding y generador
productivos desde `backend/api/dist`. Los wrappers observan la decisión del
router, el top-5, la salida interna del RAG, la respuesta HTTP y el mensaje
persistido sin cambiar inputs u outputs. El preflight exige igualdad exacta de
release, configuración de embedding, modelos, digests, runtimes, recetas y
`top_k=5` frente al resultado congelado de M8.3-A.

Después de cada repetición, el instrumento exige `DELETE 204` y confirma la
ausencia mediante `GET 404`. Si falla una dependencia o no puede confirmarse el
cleanup, aborta sin escribir resultados parciales y no reintenta el mensaje.

Desde la raíz del repositorio:

```powershell
cd backend/api
npm run build
cd ../..
node --check eval/generation/run-m8-3-e2e-parity.mjs
node eval/generation/run-m8-3-e2e-parity.mjs --dry-run
node --env-file=.env eval/generation/run-m8-3-e2e-parity.mjs
```

El `--dry-run` valida el fixture, el baseline, sus hashes, `dist`, el catálogo y
las rutas de ambas preguntas. No abre PostgreSQL, Ollama ni servidor HTTP y no
escribe resultados. Una ejecución formal completa crea sin sobrescribir:

```text
eval/generation/results/m8-3-e2e-parity-AAAA-MM-DD.json
eval/generation/results/m8-3-e2e-parity-AAAA-MM-DD.md
```

M8.3-B es un diagnóstico de paridad con seis conversaciones sintéticas
temporales. No es RAGAS, no demuestra calidad global o estabilidad general del
RAG y no cambia producción.
