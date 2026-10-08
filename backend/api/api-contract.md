# Contrato REST v1

Versión: **1.0.0-draft**, contrato REST congelado con servidor y handlers implementados.
La fuente machine-readable es [openapi.yaml](openapi.yaml), OpenAPI 3.1.0 con
JSON Schema 2020-12. Está serializada en JSON, subconjunto válido de YAML 1.2,
para permitir validación sintáctica con las herramientas locales sin dependencias.
MCP 2.0 permanece congelado e independiente de este contrato REST.

## Frontera y alcance

Mobile → REST Backend API → Intent Router para mensajes: fast path determinista
o fallback Document RAG directo actualmente. Agent/ReAct como cliente del servidor
MCP interno forma parte de la arquitectura objetivo y sigue pendiente; la app
nunca consume MCP. Calendario, progreso y anuncios ya consultan servicios de
aplicación sin agente. Su reutilización por MCP sigue prevista. Esta nota de estado
no altera endpoints, schemas, semántica ni códigos HTTP del contrato.

Base relativa `/api/v1`; host y puerto no se fijan. Requests/responses son JSON
con campos `snake_case`, salvo descarga binaria y respuestas sin contenido.
Los nombres estándar de OpenAPI y las cabeceras HTTP conservan su sintaxis.
Todos los objetos de datos se cierran con `additionalProperties: false`.
Los parámetros query desconocidos, escalares repetidos, valores vacíos, fechas
inválidas y cuerpos en GET/DELETE producen 400. No hay paginación por cursor.
Los timestamps usan RFC 3339 con zona explícita; las fechas usan `YYYY-MM-DD`.

Solo hay perfiles de demostración y corpus 100% sintéticos. Seleccionar un
`profile_key` no autentica ni autoriza a una persona. Conocer un UUID tampoco
constituye control de acceso. Esta especificación sirve para demostración local
controlada: exposición remota y autenticación requieren diseño posterior.
No hay JWT, OAuth, autenticación institucional ni datos académicos reales.
UNAB no es fuente funcional. Google Sheets, push y servicios externos quedan fuera.

## Operaciones

| Método | Ruta relativa a `/api/v1` | Necesidad móvil |
| --- | --- | --- |
| GET | `/profiles` | Seleccionar perfil sintético vigente. |
| POST | `/conversations` | Abrir conversación para un perfil. |
| GET | `/conversations` | Listar historial del perfil seleccionado. |
| GET | `/conversations/{conversation_id}` | Leer conversación y mensajes visibles. |
| DELETE | `/conversations/{conversation_id}` | Borrar exclusivamente historial. |
| POST | `/conversations/{conversation_id}/messages` | Enviar consulta y recibir respuesta fundamentada. |
| GET | `/calendar/events` | Consultar calendario sintético. |
| GET | `/profiles/{profile_key}/progress` | Consultar avance sintético en cursos. |
| GET | `/announcements` | Consultar convocatorias y novedades sintéticas. |
| GET | `/documents/{document_version_id}/artifact` | Descargar documento sintético verificado. |

**No existe `/courses` en v1**: aunque MCP ofrece `get_courses`, no existe una
pantalla de catálogo aprobada. Es una exclusión deliberada, no un olvido.

### Códigos HTTP por operación

| operationId | Éxito | Errores documentados |
| --- | --- | --- |
| list_profiles | 200 | 400, 404, 500, 503 |
| create_conversation | 201 | 400, 404, 409, 500, 503 |
| list_conversations | 200 | 400, 500, 503 |
| get_conversation | 200 | 400, 404, 500, 503 |
| delete_conversation | 204 | 400, 409, 500, 503 |
| send_message | 201 | 400, 404, 409, 500, 503 |
| list_calendar_events | 200 | 400, 404, 500, 503 |
| get_profile_progress | 200 | 400, 404, 500, 503 |
| list_announcements | 200 | 400, 404, 500, 503 |
| get_document_artifact | 200 | 400, 404, 500, 503 |

Crear una conversación puede devolver 409 si cambia incompatiblemente el contexto
de publicación durante su validación. No debe guardar una relación de perfil
distinta de la validada. Los recursos individuales ausentes devuelven 404 salvo
la convención idempotente explícita de DELETE.

### Perfiles y conversaciones

GET profiles devuelve `release_id` y `profiles[]`, con `profile_key` y `alias`.
Orden por clave ascendente. Sin perfiles devuelve 200 con lista vacía; sin release
vigente publicada devuelve 404. Nunca devuelve correos, identificaciones o rutas.

POST conversations acepta solamente `profile_key`, existente en la release
vigente publicada. Devuelve 201 con `conversation_id`, `profile_key`,
`profile_alias` y `created_at`, más Location relativa, exclusivamente
`/api/v1/conversations/{uuid}` con UUID hexadecimal de forma 8-4-4-4-12. `created_at` es una
proyección de `conversations.started_at`, no una columna nueva. La relación
persistida conserva `release_id` y `profile_key` de apertura. El alias procede de
esa versión del perfil; no se sustituye por el alias de otra release.

GET conversations exige query `profile_key`; `limit` es 20 por defecto, 1–50.
Busca la misma clave estable en todas las releases históricas. Una clave válida
sin conversaciones devuelve 200 con `conversations: []`, aunque ya no exista en
la release actual. Orden: `started_at DESC, conversation_id DESC`. Cada elemento
contiene `conversation_id`, `profile_key`, `started_at`, `last_message_at`
nullable y `message_count`. Los dos últimos se derivan de mensajes visibles;
sin mensajes son null y 0. No se inventa un título persistido.

GET detalle devuelve `conversation_id`, `started_at`, `profile` (clave y alias
históricos) y `messages[]`. Orden por ordinal persistido y, dentro del assistant,
por índice de cita. El ordinal es interno. El historial completo no se trunca
silenciosamente; la ausencia de paginación limita esta versión a la demostración.
Solo se exponen roles `user` y `assistant`, ambos con ID, contenido y timestamp.
Solo assistant incluye `insufficient_evidence` y `citations`, incluso si es vacío.
Nunca se exponen system/tool messages, prompts, chain-of-thought, scratchpads,
argumentos de tools, SQL ni vectores.

DELETE devuelve 204 sin cuerpo tanto al borrar como si el UUID ya no existe.
Un UUID inválido produce 400; una conversación ocupada puede producir 409.
La cascada es exclusivamente conversations → messages → message_citations.
No borra perfiles, corpus, releases, documentos, chunks, cursos, eventos o anuncios.

### Enviar mensaje y consistencia

POST messages acepta únicamente `content`: string de 1–4000 caracteres Unicode,
no compuesto solo por espacios. No se recorta ni transforma silenciosamente.
Este límite controla el tamaño del turno sin depender del límite de la consulta
interna de retrieval. El cliente no elige perfil, release, tool, modelo, prompt
ni embedding. La conversación determina la clave de perfil del contexto.

Implementado actualmente:

1. Validar el request y la conversación, fijar la release vigente publicada,
   resolver allí el perfil de la conversación y obtener el ordinal esperado. Si el
   contexto ya no es válido, devolver el error correspondiente sin insertar.
2. Evaluar el Intent Router sobre el mensaje con contexto controlado y un instante
   de referencia capturado para el turno. La clasificación no usa LLM, embeddings
   ni N8N.
3. Si hay una intención segura, ejecutar el fast path y su renderer determinista.
   El fast path no llama al servidor MCP ni al generador.
4. De lo contrario ejecutar Document RAG directo sobre la release fijada, sin un
   ciclo Agent/ReAct ni llamadas MCP.
5. Validar la respuesta, sus citas y sus registros de persistencia; toda evidencia
   debe pertenecer a la release fijada. La insuficiencia de evidencia se declara
   explícitamente y no fabrica citas.
6. Ejecutar una única sentencia atómica que bloquea la fila de conversación durante
   la persistencia, vuelve a verificar la existencia de la conversación, la release
   vigente y el ordinal esperado, y aplica además las restricciones `UNIQUE`
   residuales.
7. En esa misma sentencia insertar el mensaje user, el mensaje assistant y todas
   las citas verificadas, con `answer_release_id` de ese turno.
8. Responder 201 con `conversation_id`, `user_message` y `assistant_message` solo
   después de confirmar la persistencia completa.

Si algo falla antes de esa sentencia de persistencia, no queda insertado el mensaje
user de ese turno. Si la persistencia falla, la sentencia completa no debe dejar un
turno parcial. Si el servidor confirma correctamente el commit pero la respuesta
HTTP no llega al cliente, el turno completo puede existir aunque el cliente no haya
visto 201.

Durante la ejecución del router, fast path o Document RAG, el backend no mantiene
una transacción ni un advisory lock de base de datos. El servidor HTTP implementa
un coordinador de actividad en memoria, por proceso y por `conversation_id`, para
evitar operaciones incompatibles sobre una misma conversación. Un
`POST /conversations/{conversation_id}/messages` activo hace que un `DELETE` sobre
esa conversación responda 409 sin borrar; un `DELETE` activo impide iniciar un nuevo
POST sobre la misma conversación, y dos POST concurrentes sobre la misma conversación
también se rechazan con 409. Los DELETE concurrentes permanecen permitidos e
idempotentes.

Esta exclusión es local al proceso Node que atiende las solicitudes: no es durable,
se pierde al reiniciar el proceso y no coordina múltiples instancias o réplicas.
Independientemente de esa protección HTTP, la persistencia atómica mantiene sus
comprobaciones de conversación, release y ordinal, junto con las restricciones
`UNIQUE` residuales.

Arquitectura objetivo pendiente: incorporar Agent/ReAct y el MCP interno al fallback.
La exclusión actualmente implementada no depende de esos componentes.

Este cambio es interno: véanse [ADR 0004](../../docs/adr/0004-enrutamiento-determinista-intenciones.md)
y la [especificación del router](../../docs/enrutamiento-intenciones.md). No modifica
rutas, payloads, códigos HTTP ni idempotencia. `answer_release_id` designa conceptualmente la
release de respuesta; la columna SQL vigente es `messages.answer_dataset_release_id`.

La release de respuesta puede diferir de la de apertura. Las citas históricas
conservan la release original. No se cambia la relación de perfil de apertura.
La release efectiva se conserva en `messages.answer_release_id` incluso cuando
no haya citas; no se añade un campo REST nuevo al assistant por ese motivo.
Ninguna nueva consulta admite seleccionar una release histórica. `reference_time`
solo clasifica anuncios de la release vigente, no selecciona una versión del corpus.
POST messages no es idempotente y no admite `Idempotency-Key`. Después de un timeout
o resultado de red incierto se debe consultar el historial antes de decidir si se
reenvía; no corresponde hacer retry ciego. Una lectura sin el turno todavía no
demuestra que el procesamiento anterior haya terminado.

### Consultas directas

Cada consulta resuelve una única release vigente publicada para todas sus filas.
Sin release disponible: 404; sin resultados: 200 con lista vacía. Se proyectan
campos de presentación, no objetos de procedencia internos. No necesitan agente.

Calendario exige `date_from` y `date_to`: días civiles en `America/Bogota`, zona
canónica técnica del prototipo, no una afirmación institucional sobre la UNAB.
El backend transforma las 00:00 del primer día y las 00:00 del día posterior al
último en esa zona a instantes con zona. Selecciona por `starts_at` desde el
primer límite incluido hasta el segundo excluido; la salida sigue siendo RFC 3339
con offset. REST y MCP comparten esta misma semántica civil en America/Bogota.
Una futura capa compartida recibirá los límites transformados a instantes;
no es una búsqueda por solapamiento. Rango inclusivo de como máximo 366 días,
con inicio no posterior al fin. `event_types` permite `course_session`,
`announcement_deadline`, `general`. Orden `starts_at`, `event_key`, ascendente.
Cada evento expone clave, título, descripción, tipo, inicio, fin nullable y claves
de curso/anuncio nullable. No existe campo freshness.

Progreso acepta `statuses`: `enrolled`, `in_progress`, `completed`. La app elige
el perfil explícitamente; esto no habilita al LLM a elegirlo. Perfil inexistente
en release vigente: 404. Sin cursos coincidentes: 200. Orden `course_key` ascendente.
Devuelve perfil y cursos con clave, nombre, estado, porcentaje 0–100 y timestamps
de inicio/finalización nullable. Las restricciones de consistencia y precisión
decimal de la persistencia siguen vigentes; no se reinterpretan estados.

Anuncios acepta `query` opcional de 2–500 caracteres no blancos, búsqueda literal
sin distinguir mayúsculas sobre título/descripción. `temporal_status` acepta
`active` (default), `upcoming`, `expired`, `all`. `reference_time` RFC 3339 se
captura una sola vez al inicio si se omite, y siempre se devuelve. Un anuncio es:

- upcoming si referencia < valid_from;
- active si referencia >= valid_from y valid_until es null o referencia <= valid_until;
- expired si valid_until no es null y referencia > valid_until.

`all` solo es filtro, nunca estado de una fila. Orden `valid_from`,
`announcement_key`, ascendente. No hay push implementado ni requerido.

Las tres consultas usan `limit` default 20, mínimo 1, máximo 50. Los arrays query
se codifican repitiendo el nombre: `statuses=enrolled&statuses=completed`.
Solo admiten valores únicos, entre 1 y 3. Omitir el filtro incluye todos; valores
vacíos o listas separadas por comas producen 400. MCP puede representar `[]` en
JSON como selección vacía; REST no ofrece esa representación query en v1. Es
una restricción de transporte explícita, no un cambio de los estados compartidos.

## Citas de presentación

Cada cita contiene `index` (entero desde 0, correspondiente a citation_index),
`source_kind`, `label`, `locator`, `release_id`, `document_version_id` nullable y
`artifact_url` nullable. Los índices pueden mostrarse como index + 1 en la UI;
no se exige que no tengan huecos. Kinds: document, course, calendar_event,
announcement, profile y profile_course.

El backend deriva label y locator legibles de metadatos verificados (documento y
sección, o título/alias y localizador estructurado). El LLM no inventa IDs ni rutas.
Estos textos también se sanitizan: no se copia un localizador interno que contenga
paths, hashes o URLs externas. La prohibición cubre valores de texto, no solo nombres
de propiedades; un schema string por sí solo no garantiza esa sanitización.
Toda cita document tiene document_version_id no nulo; las estructuradas tienen
ese campo y artifact_url nulos. En documentos, el enlace opcional es exactamente
`/api/v1/documents/{document_version_id}/artifact`, con el mismo UUID de la cita.
Se permite especialmente para full_document, cuyas guías no se fragmentan ni
vectorizan; también puede enlazarse el artefacto original de un documento chunked.
Si no hay artefacto disponible, el enlace es null. La disponibilidad puede cambiar
entre lectura y descarga: el cliente debe manejar 404.

No se devuelve `source_path`, rutas internas, hashes, `canonical_uri` ni URLs
externas. `release_id` identifica la evidencia, no es un selector enviado por la
app. Las filas de consultas directas no duplican el objeto interno source de MCP.

## Descarga segura

El único selector de entrada es document_version_id. El backend comprueba versión
ready y pertenencia a release publicada ready, también histórica. Resuelve
internamente source_path y la revisión sintética exacta, comprueba contención real
en `/data/synthetic` (incluidos enlaces simbólicos/junctions y traversal), y verifica
integridad antes de enviar bytes. No acepta paths del cliente ni redirige fuera.
Los hashes sirven para validación interna, nunca como campos de presentación.

Una referencia en PostgreSQL no garantiza que existan los bytes. Si la revisión
histórica exacta no está disponible, se devuelve 404; no se sustituye por el
archivo de la release actual. La futura resolución/preservación de revisiones
debe respetar la fuente versionada y no consultar fuentes institucionales.

200 descarga el archivo completo como `application/octet-stream`, con
Content-Disposition attachment y nombre seguro derivado del UUID,
X-Content-Type-Options nosniff y Cache-Control no-store. No se promete Range:
si se recibe, se ignora y se sirve el archivo completo. Los errores previos al
stream son JSON seguros; si falla un stream ya iniciado se interrumpe, no se le
añade un cuerpo JSON ni se finge una descarga completa. No hay URLs públicas externas.

## Errores y reintentos

Objeto común cerrado:

```json
{"error":{"code":"INVALID_ARGUMENT","message":"Mensaje seguro para el cliente.","request_id":"00000000-0000-4000-8000-000000000001"}}
```

| HTTP | code | Uso |
| --- | --- | --- |
| 400 | INVALID_ARGUMENT | Campo desconocido, tipo, tamaño, filtro o rango inválido. |
| 404 | NOT_FOUND | Recurso/release no disponible; no equivale a lista vacía. |
| 409 | CONFLICT | Conversación ocupada o contexto/release incompatible al procesar turno. |
| 503 | DEPENDENCY_UNAVAILABLE | Dependencia necesaria temporalmente no disponible. |
| 500 | INTERNAL_ERROR | Fallo no clasificable de manera segura. |

El código debe coincidir con HTTP: cada respuesta especializa mediante `allOf`
la estructura cerrada de `error_response` y restringe `error.code` con `const`.
Así, el schema de respuesta 404 admite NOT_FOUND y rechaza INTERNAL_ERROR.
request_id lo genera el backend y permite correlación local. El mensaje describe
la validación sin SQL, paths, credenciales, stack traces o argumentos internos.
No existen códigos de autenticación. El error MCP PROFILE_CONTEXT_REQUIRED no se
traslada como solicitud de autenticación: el backend debe entregar ese contexto.
Su omisión por un bug es interna; la desaparición del perfil actual es conflicto.

GET es seguro e idempotente, aunque cambien los datos o la hora entre peticiones.
Todas las respuestas usan Cache-Control no-store. DELETE es funcionalmente
idempotente y repite 204 cuando ya no existe. Un conflicto permite revisar/reintentar
una vez que termine la operación concurrente.

**No se incluye Idempotency-Key**: no hay almacenamiento durable de claves/resultados
en el modelo aprobado, y una caché de memoria no cubre reinicios. Esta cabecera no
está soportada; enviarla en POST messages produce 400, nunca una falsa garantía.
POST messages no debe reintentarse ciegamente. Tras fallo/timeout, consultar el
historial y solicitar decisión explícita antes de enviar otro mensaje; una lectura
sin respuesta todavía no prueba que el turno anterior haya terminado. Tampoco POST
conversations ofrece deduplicación. La exclusión concurrente no evita duplicados
secuenciales. Una garantía durable de idempotencia requiere aprobación posterior.

## Trazabilidad y límites de verificación

| Persistencia / MCP vigente | Proyección o regla REST |
| --- | --- |
| conversations(release_id, profile_key), profiles por release | Perfil histórico fijo; clave controlada desde la app demo. |
| messages.role, ordinal, answer_release_id | Roles user/assistant; orden estable; release por respuesta. |
| message_citations y sus validaciones | Citas derivadas, seis kinds, índice y versión verificables; sin procedencia privada. |
| Cascadas de historial | DELETE solo historial, sin dirección de cascada hacia corpus. |
| calendar_events / get_calendar_events | Mismos tipos, días civiles en America/Bogota y rango inclusivo máximo 366 días en REST y MCP. Límites transformados a instantes; filtro por starts_at, sin solapamiento; salida RFC 3339 con offset. |
| profile_courses / get_profile_progress | Mismos estados, porcentaje y perfil vigente. |
| announcements / get_announcements | Misma búsqueda literal y fronteras temporales inclusivas. |
| document_versions / find_documents | Artefacto por UUID publicado, sin paths públicos ni vectorización full_document. |
| MCP release_id / contexto SQL de retrieval | Release fijada y evidencia coherente por turno; sin selector móvil. |

No se modifica SQL, sus 16 entidades, contratos MCP 2.0, modelo de datos o datasets.
El texto histórico de otras fuentes no introduce dependencias en este contrato.
La validación estática no demuestra ejecución de rutas ni resultados de RAGAS/SUS:
la evidencia ejecutada se indexa en [eval](../../eval/README.md). RAGAS completa,
selección de tools por Agent/MCP y SUS formal siguen pendientes.
