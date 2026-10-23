# CHECKPOINT BANUCHAT — BCH-05 / CCD-AUTH-I1B — diagnóstico 503

Fecha: 2026-10-23. HEAD confirmado:
`69dfe7076978d51723a2c24cb8b755801b9ff038`. Árbol limpio al comenzar.
Trabajo exclusivamente diagnóstico: **cero cambios de producto o corrección
funcional**, sin commit/push, Android o I1C.

## Conclusión y alcance

**CAUSA CONFIRMADA en el fallo reproducido:** la forma desarrollada del nombre
de IA no coincide con el título canónico reconocido por `selectCcdEvidence`.
El fallback selecciona diez fragmentos en lugar del syllabus individual. El
prompt resultante requiere **6411 tokens frente a 4096 disponibles** en el
generador cargado. Ollama devuelve **400 por capacidad de contexto**; el cliente
lo clasifica como `invalid_generator_response`; `sendMessage` lo transforma en
`rag_dependency_unavailable` y la API devuelve **503 DEPENDENCY_UNAVAILABLE**.
No se alcanza persistencia: cero mensajes del turno fallido.

Se confirmó mediante HTTP autenticado real con una cuenta/conversaciones nuevas,
y una confirmación RAG adicional con PostgreSQL en **solo lectura**. Esa segunda
observación tiene el mismo hash de prompt y de error del proveedor que el POST
fallido. No se alteraron prompts, parámetros, timeout, top-k, corpus o permisos
para obtener el resultado.

**Límite:** esto no atribuye retrospectivamente una razón interna a cada uno de
los cuatro POST Android. Sus request_id no tienen trazas internas correlacionadas
en la implementación actual. La formulación reportada por el operador sí produce
la misma selección excesiva en una comprobación pura del selector, sin reenviarla
por HTTP. No se ejecutó Android ni se inspeccionaron sus conversaciones.

## Evidencia aportada por el operador

| Request_id | HTTP / código | Duración Mobile |
| --- | --- | --- |
| `86bca0ca-c960-49e0-8732-00effdbd7588` | 503 / DEPENDENCY_UNAVAILABLE | 8767 ms |
| `3fa0e25b-84c7-4616-b956-85f4281545b9` | 503 / DEPENDENCY_UNAVAILABLE | 2790 ms |
| `6757497e-ba6a-4cd3-8d6e-9c3a8c2147b9` | 503 / DEPENDENCY_UNAVAILABLE | 562 ms |
| `49c7b03c-1682-40c0-8ef0-164d82a8b46c` | 503 / DEPENDENCY_UNAVAILABLE | 459 ms |

El catálogo inicial, login y fuentes funcionaron; se observó un chat fallido vacío.
Una generación aislada terminó con stop en 7,78 s. Son observaciones personales
del operador, no verificaciones físicas del agente. Las duraciones y los 43/43
turnos del I1B anterior no identifican por sí solos la causa de estos cuatro POST.

## Preflight: destino y configuración comprobados

Se leyeron AGENTS y checkpoints I1A/I1B antes de las comprobaciones. No se ejecutaron
sus setups/migraciones/auditorías históricas: algunas accederían a fuentes que esta
tarea prohíbe. **No se abrió conexión a `banuchat_ccd_dev`, demo sintética, AUTH
histórico o CCD_DOCUMENTACION.**

Proceso API observado: `node.exe`, PID 41140, listener **127.0.0.1:3003**,
entrypoint identificado como `auth-i1b-operator.mts api`; inició 11:09:59 Bogotá.
No se imprimió su command line ni entorno privado. Configuración local, entrypoint,
registro generador I1A y authenticated-main preceden su inicio por timestamps.
El entrypoint fija modo, base, puerto y pins desde esos archivos; no se realizó un
dump de memoria/variables del proceso. En una muestra posterior no había conexión
TCP establecida observable de ese proceso a PG/Ollama: no se infiere indisponibilidad
de una conexión que el pool puede cerrar cuando está ocioso.

El laboratorio verificado es exclusivamente **`banuchat_ccd_auth_i1b_test` en
127.0.0.1:55443**, contenedor/red/volumen I1B validados por identidad/labels/mount/bind.
`runtime_scope` declara `ccd_local` / `banuchat-ccd-local`; guard del rol runtime
aprobado, EXECUTE retrieval=true y SELECT directo de chunks=false. No se cambiaron
ACL o roles. Muestra PG: dos conexiones de diagnóstico, cero idle-in-transaction y
cero esperas de locks; no es un historial completo de carga.

| Comprobación real | Resultado |
| --- | --- |
| Current CCD | `3d6cedac-0e86-40c8-909b-d3ff6e8ab741`, ready, 12 versiones/chunks/vectores |
| Históricas | `5834fc47-57c5-498b-98fc-4190330155e4` (2), `fb8538af-3280-4a1b-889c-a27564381996` (10), ready |
| Vectores almacenados | 24/24 de dimensión 1024; no se imprimieron vectores |
| Embedding guardado en las tres releases | Ollama, `qwen3-embedding:0.6b`, coseno, 1024, runtime 0.35.0 |
| Revisión embedding guardada/observada | `ac6da0dfba84a81fdbfbaf330198c33cd77c4cdfc53e8bc50eb581914a15621d`, coincide |
| Receta de consulta | dimensions=1024, truncate=false, input_prefix=null, normalization=none, num_ctx=4096 |
| Receta documental histórica | num_ctx=32768, demás campos equivalentes; no se reembebió |
| Embedding nativo / contexto nativo | 1024 / 32768; capability embedding presente |
| Generador | `qwen3:4b-instruct`, digest `0edcdef34593eac1aa2be9c7d06c432dcf81945adca5eca2f27662c18f168ba0`, runtime 0.35.0, capability completion presente |
| Receta real de generación | think=false, stream=false, temperature=0, num_predict=256, keep_alive=5m; sin num_ctx explícito en `/api/chat` |
| Contexto nativo del generador | 262144; es capacidad del modelo, **no** el contexto cargado |
| Contexto cargado `/api/ps` | **4096** para el generador; coincide con el límite reportado al rechazar |
| Timeout mantenido | embedding 120000 ms, generador 30000 ms; no se cambiaron |

Los defaults del Modelfile (`top_k=20`, `top_p=0.8`, etc.) no se sobrescribieron.
La receta API solo envía sus opciones existentes. No se midió ni cambió la fuente
exacta del default efectivo 4096 (entorno/scheduler de Ollama); se observó el runner
cargado y el límite en el rechazo. No es necesario asumir un cambio de digest o
modelo para explicar que un prompt exceda ese contexto.

Evidencia saneada: [preflight](../../eval/auth/results/bch05-ccd-auth-i1b-503-preflight.json).

## Ruta exacta de ejecución y error

Referencias relativas a este checkpoint; los números corresponden al HEAD revisado.

| Fase | Función / ubicación | Comportamiento |
| --- | --- | --- |
| HTTP | [api-v2-server.ts](../../backend/api/src/http/api-v2-server.ts), `handle`, líneas 73/92 | Bearer → verifyAccess → validación de UUID/body → resources.send; sin v1 |
| Identidad | [auth-service.ts](../../backend/api/src/auth/auth-service.ts), `verifyAccess`/`access`, líneas 89/104 | Digest, cuenta/sesión/versión/deployment/vencimientos bajo transacción; no acepta UID como secreto |
| Autorización | [resources.ts](../../backend/api/src/auth/resources.ts), `send`/`unit`, líneas 31/49 | resource_context con owner/grant/binding/turn; gate de actividad; luego read_context vuelve a autorizar |
| Contexto | [messages.ts](../../backend/api/src/application/messages.ts), `sendMessage`, línea 449 | Lee release/ordinal/últimos mensajes de esa conversación y release; no memoria por contexto compartido |
| Router | [chat-dispatcher.ts](../../backend/api/src/chat/chat-dispatcher.ts), `dispatchChatQuery` | Modo CCD; catálogos/reglas pertinentes pasan a RAG; aclaraciones pueden terminar antes de embedding |
| RAG | [document-rag.ts](../../backend/api/src/chat/document-rag.ts), `generateDocumentRagAnswer`, líneas 144/162 | Resuelve consulta, recupera 12 en CCD y selecciona evidencia; catálogo amplio evita generación |
| Embedding | [document-query-retrieval.ts](../../backend/api/src/application/document-query-retrieval.ts), líneas 103/132 | Configuración desde release → validateQueryEmbeddingConfig → embedQuery |
| Ollama embedding | [ollama-query-embedding-client.ts](../../backend/api/src/retrieval/ollama-query-embedding-client.ts), `verifyRuntime`/`embedQuery`, líneas 124/177 | version/tags/show antes y después; `/api/embed`; valida modelo, dimensión, finitud, norma, receta y truncación |
| Retrieval | [authenticated-document-retrieval.ts](../../backend/api/src/application/authenticated-document-retrieval.ts), `retrieveAuthenticatedDocumentChunks` | Función SQL limitada, parámetros enlazados y normalizador compartido; sin SELECT general chunks |
| Selección | [document-evidence.ts](../../backend/api/src/chat/document-evidence.ts), `selectCcdEvidence`, líneas 37/52/62 | Coincidencia por título/forma corta; si no reconoce tema autónomo, conserva todo menos U03/U04 |
| Generación | [ollama-generator-client.ts](../../backend/api/src/generation/ollama-generator-client.ts), `generate`/`request`, líneas 171/95 | Valida receta y runtime → `/api/chat` → respuesta completa/stop/contenido/métricas → vuelve a validar runtime |
| Grounding | [document-rag.ts](../../backend/api/src/chat/document-rag.ts), líneas 235/288 | Protocolo FUENTES/citas/límites; rechazo de grounding suele producir insuficiencia 201, no un 503 |
| Persistencia | [messages.ts](../../backend/api/src/application/messages.ts), líneas 559/562; [resources.ts](../../backend/api/src/auth/resources.ts), líneas 53/56 | validateAnswer → commit_turn → persist_turn revalida sesión/owner y persiste ambos mensajes/citas atómicamente |
| Mapeo público | [messages.ts](../../backend/api/src/application/messages.ts), líneas 534/546; [http-errors.ts](../../backend/api/src/http/http-errors.ts), línea 153; [resources.ts](../../backend/api/src/auth/resources.ts), línea 18 | GeneratorClientError → rag_dependency_unavailable → DEPENDENCY_UNAVAILABLE |
| Envelope | [api-v2-server.ts](../../backend/api/src/http/api-v2-server.ts), `failure`, línea 18 | Genera request_id nuevo y respuesta fija saneada; no guarda razón original ni la correlaciona con una traza |

## Qué puede producir 503 según el código

Esta tabla es un **mapa confirmado de código**, no una lista de causas observadas
en Android. Los rechazos semánticos normales de identidad/owner no son 503.

| Origen concreto | Errores que terminan como 503 |
| --- | --- |
| Embeddings, cliente `request` | Transporte/abort/redirect/HTTP 5xx → `embedding_unavailable`; 4xx o JSON inválido → `invalid_embedding_response` |
| Embeddings, `verifyRuntime` | Runtime, modelo/digest, capability, arquitectura/dimensión o contexto nativo incompatibles → `embedding_runtime_mismatch` |
| Embeddings, resultado | Forma incorrecta, error/truncated/modelo inesperado, cantidad/dimensión inválida, NaN/Inf/overflow float32 o vector cero → `invalid_embedding_response` |
| `retrieveDocumentChunksForQuery` | Propaga las tres razones anteriores; excepción no tipada de embedQuery se convierte en `embedding_unavailable` |
| Generador, `request` | Transporte/abort/redirect/5xx → `generator_unavailable`; **4xx del proveedor** o JSON inválido → `invalid_generator_response` |
| Generador, configuración/runtime | Receta/modelo/revisión/version/capability incompatibles, incluidos cambios detectados después de generar → `generator_runtime_mismatch` |
| Generador, resultado | Mensaje vacío o inválido, thinking visible/tipo inválido, métricas inválidas → `invalid_generator_response`; done distinto de true o done_reason distinto de stop → `generator_response_incomplete` |
| `sendMessage` | Cualquiera de las cuatro razones `GeneratorClientError` y las tres razones runtime/unavailable/invalid de embedding se unifican en `rag_dependency_unavailable` |
| PostgreSQL vía `PgSqlClient` | `ECONNREFUSED`, `ECONNRESET`, `ETIMEDOUT`, `EHOSTUNREACH`, `ENETUNREACH`, clase SQLSTATE 08 o 57P01/02/03 → DatabaseDependencyError → 503 |
| Auth/transacción/recurso, `safeError` | Códigos que coinciden con `^(08|57P)`, `^ECONN`, `^ETIMEDOUT$`, `^ENET`, `^EHOST` → AuthError DEPENDENCY_UNAVAILABLE; puede ocurrir antes del RAG o al persistir |

Distinciones relevantes: configuración de embedding mal formada
`embedding_config_invalid` → **500**; release no disponible/cambiada → **409**;
resultados/invariantes inválidos → **500**. P0400/01/03/04/09 → 400/401/403/404/409;
P0500 → **500**. Un 42501 de permisos no es automáticamente 503. Las funciones
011 enmascaran errores internos no previstos como P0500. SQLSTATE 57014 por
cancelación tampoco entra en el patrón 57P de `safeError`.

Guards de arranque y presupuesto de Argon2 pueden producir dependencia no
disponible al componer/login, pero no se ejecutan como hash de contraseña durante
el POST autenticado de mensajes. Recuperación suspendida también puede devolver
503 en sus endpoints propios; no pertenece a la ruta investigada.

## Reproducción controlada y confirmación

Se justificó instrumentación **solo en un harness**, porque el catch de messages
elimina la razón antes de la respuesta y el envelope crea la correlación al final.
Se reutilizaron factories/interfaces del evaluador I1B: mismas clases, SQL, modo,
recetas y timeouts. Observadores de router, query y proveedor registran categorías,
conteos, métricas y hashes; no SQL completo, valores de parámetros, textos, vectores,
credenciales, errores crudos o documentos. El proveedor devuelve al producto su
Response original; la observación usa clone. No se añadió instrumentación al
servidor 3003 ni se reinició ese proceso.

Una cuenta ficticia exclusiva nueva y dos conversaciones vacías nuevas; login/me
HTTP normal, sin bypass o cambio de cuentas del operador. API del harness solo en
loopback con puerto efímero, cerrada al finalizar. Dos POST planificados, uno por
conversación; cada resultado se reconcilió mediante GET antes de avanzar. No fueron
reenvíos de solicitudes Android ni repeticiones de resultado incierto.

| Fase observada | Título corto, control | Nombre desarrollado, reproducción |
| --- | --- | --- |
| Auth/owner/contexto PG | Correctos | Correctos |
| Router | agent_fallback | agent_fallback |
| `/api/embed` y verificación antes/después | 200, un vector 1024 | 200, un vector 1024 |
| Retrieval autenticado | 12 filas, correcto | 12 filas, correcto |
| Fragmentos enviados al generador | **1** | **10** |
| Bytes UTF-8 system+user prompt, sin serialización HTTP/template | 6974 | 20661 |
| Validación previa del generador | Correcta | Correcta |
| `/api/chat` | **200**, stop, 78 tokens generados, 1883 prompt_eval_count | **400**, rechazo previo a contenido generado |
| Validación posterior/grounding | Correctos, una cita | No alcanzados |
| persist_turn | Invocado, correcto | **No invocado** |
| POST mensajes | **201** | **503 DEPENDENCY_UNAVAILABLE** |
| Historial posterior | Dos mensajes | **Cero mensajes** |
| Tiempo aproximado del ensayo POST + GET de reconciliación | 13088 ms | 3052 ms |

La segunda respuesta tiene request_id de ensayo
`9dbcd7b1-c6bf-4e0f-b764-76ce3f3d1425`. La confirmación siguiente no creó otro
POST de mensajes, sesión o conversación: invocó RAG con conexión runtime
`default_transaction_read_only=on`, la misma consulta sintética de ensayo y receta.

Resultado: `/api/embed` 200, retrieval permitido y `/api/chat` **400**; señales
controladas `context=true, capacity=true, exceeded=true`, conteos **6411 y 4096
tokens**. `/api/ps` confirmó contexto cargado 4096. La clasificación final es
`context_capacity_exceeded`, no una inferencia basada solo en longitud en bytes.

- Hash del prompt en ambos fallos:
  `707b3db8ff6178f49d2374ccfe40abbe35f0c4b4bc7541be4d8982db9f75014d`.
- Hash del error del proveedor en ambos:
  `ecf812b4843bf3dd8ff7f3ca035b8f601d25ac558f96f18b010d4c51a1f722e5`.
- Clase interna recibida por RAG: `invalid_generator_response`.

El harness inicial no reconocía esa redacción de capacidad en su clasificador de
proveedor y la dejó `unclassified_provider_error`; se conservó así. La confirmación
clasificó las señales en memoria y comparó hashes, sin reescribir la primera
evidencia. Una lectura acotada del log local detectó una línea de capacidad de
contexto, pero no logró correlacionarla por hash; **no se usó como prueba decisiva**.
No se imprimieron líneas crudas de ese log.

Comprobación pura adicional, solo con títulos/localizadores actuales y sin llamadas
de modelo: título corto → un syllabus; nombre desarrollado → diez; formulación
reportada en Android → diez. Esto confirma el hueco de reconocimiento por nombre.
No demuestra el contexto histórico exacto ni la causa individual de los otros tres
textos Android, que no se capturaron en este diagnóstico.

Evidencias:
[reproducción HTTP](../../eval/auth/results/bch05-ccd-auth-i1b-503-reproduction.json),
[confirmación read-only](../../eval/auth/results/bch05-ccd-auth-i1b-503-confirmation.json),
[selector e integridad](../../eval/auth/results/bch05-ccd-auth-i1b-503-selector-audit.json).

## Hipótesis descartadas o pendientes

**Descartadas para el fallo reproducido:** credencial/owner inválidos, lectura de
contexto fallida, configuración/revisión/dimensión de embeddings incompatible,
fallo de `/api/embed`, permisos/retrieval SQL, generador no disponible, digest o
runtime incorrectos, timeout, agotamiento de 256 tokens, thinking visible, fallo
de grounding/citas o persistencia. Todas las fases previas llegaron a la petición
de chat, que respondió 400 por contexto en 79 ms en el ensayo HTTP; no se llegó a
generar ni persistir. La suma de latencias del turno no es un timeout del generador.

**Pendientes:** atribución de cada request_id Android; posibles fallos intermitentes
distintos fuera de esta reproducción; origen exacto de la política efectiva de
contexto de Ollama; comportamiento de otras paráfrasis/cursos y de historiales más
largos. No se observaron OOM o rechazos de thinking en las comprobaciones, pero no
se declara que nunca puedan ocurrir. 43/43 y 216/216 siguen siendo evidencia de su
guion anterior, que no cubría esta equivalencia de nombres.

## Propuesta mínima de corrección — NO implementada

Para revisión de Sala: reconocer la forma desarrollada de IA como alias del título
canónico ya admitido **en el reconocimiento CCD**, de modo que seleccione el mismo
syllabus existente, sin editar corpus, embeddings, top-k, modelo, prompt o timeout.
Añadir regresión de equivalencia nombre corto/desarrollado y de selección individual,
continuidad/corrección/ambigüedad. El cambio solo de alias no acredita cobertura de
todas las consultas autónomas desconocidas o prompts largos.

El fallback genérico de diez fragmentos y la ausencia de un presupuesto de contexto
efectivo merecen una decisión separada; no sustituirlos ahora por top-k menor,
truncación silenciosa o mayor num_ctx para ocultar el fallo. La política de limitar,
aclarar o abstenerse ante evidencia excesiva puede afectar preguntas generales y
requiere sus propios criterios/regresiones. Tampoco cambiar automáticamente el
503 público a 400 del usuario: el 400 original es del proveedor, no del contrato
de entrada Mobile.

**Traza mínima propuesta para una futura reproducción en 3003:** capturar categoría
de etapa/razón antes del catch de `sendMessage`; para distinguir capacidad de otros
`invalid_generator_response`, capturar también el estado/categoría controlada en
`OllamaGeneratorClient.request` antes de descartar el error del proveedor. Reutilizar
una correlación de request creada dentro de `handle` y devuelta por `failure`,
propagada solo como contexto interno por solicitud, sin variables globales compartidas
entre usuarios, sin cambiar schemas públicos. Flag de desarrollo apagado por defecto,
sin mensajes crudos, prompts, tokens, SQL o cuerpos. **Solo propuesta: no se modificó
ninguno de esos puntos de producto.** Las trazas antiguas inexistentes no se pueden
reconstruir retroactivamente.

## Integridad, sesiones, pruebas y archivos

El corpus del laboratorio conserva SHA-256
`db29ad53062ee400a367fb4a16b4c5cc2f9c178cb1333e29dab29fe12a449963` antes/después
y en auditoría final: releases/manifiestos/configuraciones/contextos/filas/vectores
sin cambios. La huella de las conversaciones/mensajes/citas **ya existentes antes
del ensayo** también coincide. No se alteraron conversaciones del operador.

Solo se añadieron fixtures autorizados al laboratorio: una cuenta ficticia de
diagnóstico, su credencial independiente Argon2id, una sesión y dos conversaciones;
dos mensajes/una cita en el control positivo, cero mensajes en la negativa. Logout
204; auditoría: **cero sesiones no revocadas de esa cuenta**. Contraseña/token no
se imprimieron ni exportaron. Cuenta y conversaciones se conservan para custodia;
IDs de esos fixtures, sin credenciales, solo en `infra/local/auth-i1b/diagnosis/fixtures.json`,
ignorado por Git. No se borró historia ni se aplicó limpieza/desactivación de cuentas
del operador. El login de ensayo usa las cuotas normales; no se resetearon límites.

Riesgos: la propuesta de alias deberá mantener el aislamiento sintético/CCD y las
reglas actuales de ambigüedad, corrección y fuentes. Revalidar I1A/I1B pertinente
cuando se autorice una implementación; no reabrir SELECT de chunks o migraciones
para resolver un rechazo del generador. T01/2 y T11 conservan sus límites académicos
previos; este diagnóstico no los corrige ni convierte en PASS.

Pruebas/comprobaciones ejecutadas:

- Preflight real de solo lectura del laboratorio y metadatos `/api/version`, tags,
  show y ps de Ollama; ningún endpoint institucional.
- Dos POST nuevos por HTTP/PG/Ollama y reconciliación; una confirmación RAG read-only;
  selector puro con tres formulaciones. Ningún retry automático o POST incierto.
- `npm run typecheck` desde backend/api: aprobado.
- `node --import tsx --test test/ollama-generator-client.test.ts test/ollama-query-embedding-client.test.ts test/document-query-retrieval.test.ts test/document-evidence.test.ts`:
  **84/84** contando subpruebas; dobles de proveedor, no 84 inferencias reales.
- No se repitió la batería generativa de 43 turnos ni Mobile/Android; no cambió código
  de producto que justifique repetirla en esta tarea de diagnóstico.
- `git diff --check`, revisión de alcance y comparación con HEAD de fuentes de
  producto, SQL y corpus versionables al cierre.

Archivos nuevos: cuatro harnesses `backend/api/test/auth-i1b-503-{diagnostic,reproduce,confirmation,selector-audit}.mts`,
cuatro evidencias `eval/auth/results/bch05-ccd-auth-i1b-503-{preflight,reproduction,confirmation,selector-audit}.json`
y este checkpoint. Sin modificar archivos existentes, secretos versionables,
contratos, Mobile, SQL, permisos o configuración efectiva.

**CAUSA CONFIRMADA — selección excesiva por nombre no reconocido y rechazo de
contexto 6411 > 4096, para la reproducción controlada. La atribución individual
de los cuatro POST Android requiere una nueva traza interna correlacionada; no
se declara demostrada retrospectivamente. Sin corrección funcional implementada.**
