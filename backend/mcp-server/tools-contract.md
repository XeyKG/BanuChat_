# Contrato de herramientas MCP de BanuChat

## Revisión 2.1.0 — composición autenticada unificada

El catálogo de seis tools y sus schemas de entrada/salida se conservan. En el proceso
`src/unified-main.ts`, `search_knowledge` y `find_documents` leen exclusivamente CCD;
las otras cuatro tools leen `banuchat_aux`, con release independiente. Cada salida
`release_id` identifica su fuente, no una publicación global compartida.

`get_profile_progress` deriva su perfil de la identidad autenticada transmitida por
el proceso API; no acepta principal/perfil por argumentos MCP. El agente fija ambas
releases al abrir la sesión y rechaza cambios entre pasos. El usuario no controla
variables de entorno, credenciales, SQL, tools adicionales o rutas de sistema.

El rol lector no posee DML/DDL y el proceso usa transacciones read-only. No publica
listeners HTTP ni consume Internet. El agente sigue siendo determinista y acotado.
El proceso sintético anterior se conserva para regresión; la app final usa solo el
proceso unificado. Las secciones históricas siguientes describen ese antecedente.

## Estado y alcance

Versión: `2.0.0-draft`. Catálogo, nombres y schemas congelados para la siguiente
implementación por autorización expresa del proyecto; el sufijo solicitado no implica
que exista un servidor. Sustituye de forma incompatible el borrador 1.x.
Solo especificación: no contiene handlers, transporte, conexiones ni código productivo.

El modelo físico validado de [PostgreSQL](../../infra/db/001_initial_schema.sql) y
[su documentación](../../infra/db/README.md) prevalecen sobre campos heredados.
Se conservan las fronteras de [AGENTS.md](../../AGENTS.md),
[arquitectura](../../docs/arquitectura.md) y [modelo lógico](../../docs/modelo-datos.md):
La ruta fallback relevante para MCP es:
Mobile → REST Backend API → Intent Router → Agent/RAG → MCP interno → Application Services / PostgreSQL + pgvector.
El fast path no consume MCP; MCP corresponde al fallback Agent/RAG, cuyo agente es
cliente MCP. La app no consume MCP. N8N sigue fuera del camino síncrono.

Todo contenido funcional es sintético, originado en `/data/synthetic`, fuente
versionada; PostgreSQL contiene sus derivados. No hay consultas a infraestructura
institucional ni a fuentes externas. El contexto de perfil representa un personaje
ficticio, no una persona real.

[tools.contract.json](tools.contract.json) y este documento son equivalentes y deben
actualizarse juntos. El archivo JSON es un contenedor de especificación: únicamente
su array `tools` se publica en `tools/list`, en el orden indicado. Sus metadatos y
`executionErrorSchema` no son tools ni campos nuevos del protocolo.

## Perfil de protocolo

- Revisión MCP objetivo: `2026-07-28`, conservada por decisión del proyecto.
- Cada `inputSchema`, `outputSchema` y `executionErrorSchema` declara JSON Schema
  Draft 2020-12 y tiene raíz `type: object`.
- Todos los objetos de datos, incluidos objetos anidados y `source`, son cerrados:
  `additionalProperties: false`. No se descartan silenciosamente propiedades extra.
- Éxito: `isError: false`, objeto validado en `structuredContent` y el mismo objeto
  serializado como JSON en un único bloque `content` de `type: text`.
  No hay un segundo resumen con datos diferentes.
- Error operacional: `isError: true`; un único bloque de texto contiene el JSON
  conforme a `executionErrorSchema`. Se omite `structuredContent`, pues el
  `outputSchema` describe exclusivamente resultados exitosos.
- Errores de protocolo, tool desconocida y entradas que no cumplen JSON Schema:
  mecanismo MCP/JSON-RPC correspondiente, no un éxito vacío.
- Las seis tools llevan exactamente estas anotaciones:

```json
{
  "readOnlyHint": true,
  "destructiveHint": false,
  "idempotentHint": true,
  "openWorldHint": false
}
```

Las anotaciones no sustituyen validación ni autorización. Idempotencia significa
ausencia de efectos de escritura; no promete resultados iguales si cambia la
release o el instante de referencia entre llamadas.

## Convenciones comunes

### Tipos, límites y campos obligatorios

- UUID: string con `format: uuid`.
- Clave estable: string de 1–128 caracteres, patrón
  `^[a-z0-9][a-z0-9_-]{0,127}$`.
- SHA-256: string de exactamente 64 caracteres hexadecimales minúsculos.
- Texto no vacío: string con `minLength: 1` y `pattern: "\\S"`.
  Las consultas tienen además sus límites específicos y rechazan solo espacios.
- Fecha: `format: date`. Instante: `format: date-time`, con zona horaria.
  Los validadores futuros deben activar la comprobación de formatos y fechas reales.
- Los campos marcados nullable siempre están presentes en la salida, con valor o
  `null`; no se omiten. Todos los campos de salida enumerados son requeridos,
  también dentro de cada elemento y dentro de `source`.
- Los inputs opcionales no admiten `null`. Solo su omisión activa los defaults.
  JSON Schema anota defaults, no los aplica: el servidor deberá materializarlos.
- Arrays de filtros: valores únicos, máximo 3 elementos. Omitido significa todos
  los estados/tipos; `[]` significa ninguno y produce una lista vacía. No se
  añaden defaults de filtro que reduzcan el catálogo sin pedirlo.
- Filtros distintos se combinan con AND; miembros de un mismo filtro, con OR.
- Las listas de resultados admiten cero elementos y respetan tanto su máximo
  del schema como el `limit`/`top_k` efectivo de la llamada.
- Sin paginación ni continuación. Los límites no representan el total del corpus.

### Release vigente y consistencia

Todo éxito contiene `release_id` (UUID), igual a la publicación usada para
producir todos sus datos. No existe input para elegir una publicación.
La selección se hace por `datasets.current_release_id`, perteneciente al dataset
y en estado `ready`; no se deduce por fecha ni buscando cualquier release lista.

Una consulta estructurada debe resolver puntero y registros en un mismo snapshot
coherente READ COMMITTED, usando joins con pertenencia a esa release. También las
listas vacías conservan el UUID seleccionado. Sin publicación vigente se devuelve
`NOT_FOUND`, nunca un UUID ficticio ni un fallback histórico.

En búsqueda vectorial se obtiene internamente `current_retrieval_context`, se
genera el embedding con la configuración de esa release y se invoca
`search_chunks_cosine` con la release esperada interna. Si cambió durante la
generación, se descarta ese intento y se permite un reintento completo: nuevo
contexto y nuevo embedding. Si vuelve a cambiar, `DEPENDENCY_UNAVAILABLE`.
No se exige al agente suministrar la precondición interna ni se reutiliza a ciegas
el vector anterior. No se modifica SQL ni su estrategia de bloqueo.

En consultas compuestas, el backend/agente debe comprobar que los resultados que
combina tienen la misma release; si difieren, volver a consultar con un límite de
reintentos o declarar indisponibilidad. No presentar una mezcla como una sola
instantánea. La política ReAct no se implementa aquí.

### Procedencia reproducible

Cada evidencia citable incluye `source`, objeto cerrado con cuatro campos requeridos:

| Campo | Tipo y regla |
| --- | --- |
| `source_kind` | String constante según el contexto: document, course, calendar_event, announcement, profile o profile_course. |
| `source_path` | Ruta relativa lógica, no vacía, dentro de la categoría sintética correspondiente. |
| `source_locator` | Texto no vacío; localizador exacto del registro o fragmento citado. |
| `source_sha256` | SHA-256 hexadecimal minúsculo de 64 caracteres del archivo fuente. |

Categorías permitidas por cada schema:
document → `documents/`; course → `courses/`; calendar_event → `calendars/`;
announcement → `announcements/`; profile y profile_course → `profiles/`.
Después del prefijo solo se admiten letras ASCII, números, `_`, `.`, `-` y `/`.
Se rechazan segmentos `.`/`..`, separadores repetidos o finales y saltos de línea.
La ruta no empieza por `/data/synthetic`: es relativa a esa raíz.

No son rutas absolutas del host, enlaces web, esquemas de archivo ni identificadores
de red libres. MCP no construye ni acepta un sistema de enlaces; la API REST
resuelve el artefacto usando `document_version_id`, con controles de acceso y ruta.

La tupla release + claves de entidad + source fija la evidencia:
para documentos, `document_version_id` y, si aplica, `chunk_id`;
para progreso, `profile.profile_key` junto a `courses[].course_key`.
`source_sha256` identifica el archivo; `content_sha256` de un match identifica
exactamente su texto UTF-8. No son hashes intercambiables.

En `search_knowledge`, `source.source_locator = locator` del chunk, conforme a
`validate_citation`, no el localizador del documento completo. En `find_documents`
se usa `document_versions.source_locator`; en registros estructurados, el suyo.
No se inventan localizadores ni se redirigen evidencias a una versión distinta.

## Catálogo definitivo e intenciones

| Orden | Intención | Tool | Fuente física |
| --- | --- | --- | --- |
| 1 | Pregunta que requiere evidencia textual documental | `search_knowledge` | document_chunks y versiones/documentos vigentes, pgvector |
| 2 | Solicitud de documento, guía o archivo | `find_documents` | documents + document_versions |
| 3 | Oferta o catálogo de cursos | `get_courses` | courses |
| 4 | Fecha, evento o plazo | `get_calendar_events` | calendar_events |
| 5 | Convocatoria o anuncio | `get_announcements` | announcements |
| 6 | Progreso o cursos del perfil | `get_profile_progress` | synthetic_profiles + profile_courses + courses |

Una pregunta compuesta puede usar varias tools. Por ejemplo, “Según los cursos que
ya completé, ¿qué convocatorias activas podrían interesarme?” puede requerir
`get_profile_progress` con `statuses: ["completed"]` y `get_announcements`.
No usar RAG para sustituir campos ya representados estructuralmente.

## 1. search_knowledge

Recupera exclusivamente fragmentos de documentos `chunked` de la release vigente.
Las guías `full_document` no se fragmentan ni participan en la búsqueda vectorial.
El embedding de consulta es interno; el LLM/agente no envía ni recibe vectores.

| Input | Requerido | Tipo y límites | Default |
| --- | --- | --- | --- |
| `query` | Sí | string, 3–2000 caracteres, no solo espacios | — |
| `top_k` | No | integer, 1–10 | 5 |

No hay filtros adicionales ni umbral libre del agente. Cualquier futuro umbral
será política explícita del servidor/evaluación, no un nuevo argumento implícito.

Salida raíz requerida: `release_id`, `evidence`, `matches`.
`evidence` contiene `status: found | not_found` y `match_count` integer 0–10.
`matches` tiene máximo 10 elementos. `match_count = matches.length`;
`not_found` equivale a lista vacía y conteo 0; `found` exige al menos un match.
El schema impone vacío/no vacío según status; la igualdad exacta del conteo se
valida en servidor. `found` no afirma suficiencia para responder.

Cada match contiene, todos requeridos:

| Campo | Tipo |
| --- | --- |
| `rank` | integer 1–10, consecutivo desde 1 |
| `chunk_id` | UUID |
| `document_key` | clave estable |
| `document_version_id` | UUID |
| `document_title` | texto no vacío |
| `content` | texto no vacío, exacto y sin normalización |
| `content_sha256` | SHA-256 del texto UTF-8 |
| `cosine_distance` | number finito, 0–2 |
| `locator` | texto no vacío |
| `page_start`, `page_end` | integer >= 1 o null |
| `source` | procedencia con source_kind constante document |

Orden: distancia ascendente, desempate por clave documental y ordinal, igual al SQL.
`rank` es posición, no el ordinal almacenado. Fin de página exige inicio no nulo y
`page_end >= page_start`; esta comparación se valida en servidor.

Adaptación sin cambiar SQL: `search_chunks_cosine` ya devuelve texto, identidad,
distancia y origen, pero no devuelve el hash del contenido. El servidor calculará
SHA-256 sobre los bytes UTF-8 exactos de `content`, equivalente a la columna
generada `document_chunks.content_sha256`, sin una lectura histórica adicional.
No expone metadata de la configuración ni información de ejecución interna.

## 2. find_documents

Busca identidad/título y devuelve metadata básica, especialmente para documentos
`full_document`. No devuelve el contenido del archivo ni realiza embedding.

| Input | Requerido | Tipo y límites | Default |
| --- | --- | --- | --- |
| `query` | Sí | string, 2–500 caracteres, no solo espacios | — |
| `retrieval_mode` | No | chunked o full_document | Sin filtro |
| `limit` | No | integer, 1–20 | 10 |

Salida requerida: `release_id`, `documents` (array, máximo 20).
Cada documento requiere `document_key` (clave), `document_version_id` (UUID),
`title` (texto no vacío), `retrieval_mode` (chunked o full_document),
`mime_type` (texto no vacío), `version_label` (texto no vacío o null) y
`source` (source_kind document). Solo versiones ready de la release vigente.
Orden por `document_key` ascendente.

## 3. get_courses

Consulta el catálogo relacional sintético; no usa búsqueda vectorial.

| Input | Requerido | Tipo y límites | Default |
| --- | --- | --- | --- |
| `query` | No | string, 2–300 caracteres, no solo espacios | Sin filtro |
| `statuses` | No | array único, máximo 3: available, closed, archived | Sin filtro |
| `limit` | No | integer, 1–50 | 20 |

Salida requerida: `release_id`, `courses` (array, máximo 50).
Cada curso requiere `course_key` (clave), `name`, `description` (textos no
vacíos), `status` (available, closed o archived) y `source` (source_kind course).
`query` busca nombre/descripción. Orden por `course_key` ascendente.

## 4. get_calendar_events

Consulta eventos estructurados de la release vigente.

| Input | Requerido | Tipo y límites | Default |
| --- | --- | --- | --- |
| `date_from` | Sí | string, format date | — |
| `date_to` | Sí | string, format date | — |
| `event_types` | No | array único, máximo 3: course_session, announcement_deadline, general | Sin filtro |
| `limit` | No | integer, 1–50 | 20 |

Regla semántica de servidor: `date_to >= date_from` y número de días inclusivos
`(date_to - date_from) + 1 <= 366`. Las fechas delimitan días civiles en
`America/Bogota`, zona canónica técnica del MVP, no afirmación institucional.
Transformar las 00:00 de date_from y las 00:00 del día posterior a date_to en esa
zona a instantes con zona. Se incluyen eventos cuyo `starts_at` sea mayor o igual
al primer límite y menor que el segundo. No se filtra por fecha de finalización ni
por solapamiento de eventos iniciados antes. Orden: starts_at, event_key ascendentes.

Corrección preimplementación del draft: se conserva `2.0.0-draft`, sin nueva
funcionalidad, nombres o formatos. La interpretación anterior por días UTC queda
como antecedente histórico sustituido por America/Bogota, compartida con REST y
la autoría del dataset. Los timestamps de salida siguen siendo RFC 3339 con zona/offset.

Salida requerida: `release_id`, `events` (array, máximo 50).
Cada evento requiere `event_key` (clave), `title`, `description` (textos no vacíos),
`event_type` (course_session, announcement_deadline o general),
`starts_at` (date-time), `ends_at` (date-time o null),
`course_key`, `announcement_key` (clave o null) y `source`
(source_kind calendar_event).

Preservar las reglas físicas: course_session lleva solo course_key;
announcement_deadline solo announcement_key; general ambas nulas.
Fin no nulo debe ser >= inicio; pertenencia de las claves siempre a la misma release.
Son verificaciones semánticas adicionales del servidor, no nuevas tablas.

## 5. get_announcements

Consulta anuncios estructurados. La vigencia temporal no altera la publicación
seleccionada: consultar otra fecha no permite consultar otra release.

| Input | Requerido | Tipo y límites | Default |
| --- | --- | --- | --- |
| `query` | No | string, 2–500 caracteres, no solo espacios | Sin filtro |
| `temporal_status` | No | active, upcoming, expired, all | active |
| `reference_time` | No | string, format date-time | Instante actual del servidor |
| `limit` | No | integer, 1–50 | 20 |

El instante efectivo se captura una sola vez por llamada y se devuelve siempre,
también cuando el array está vacío o el filtro es all. Si se proporciona, se conserva
ese instante (puede serializarse con una zona equivalente). Permite pruebas deterministas.
`query` busca título/descripción. Orden por valid_from, announcement_key ascendentes.

- active: valid_from <= reference_time y (valid_until es null o >= reference_time).
- upcoming: valid_from > reference_time.
- expired: valid_until < reference_time.
- all: no aplica filtro temporal; cada resultado conserva su estado derivado individual.

Salida requerida: `release_id`, `reference_time` (date-time),
`announcements` (array, máximo 50). Cada anuncio requiere `announcement_key`
(clave), `title`, `description` (textos no vacíos), `valid_from` (date-time),
`valid_until` (date-time o null), `temporal_status` (active, upcoming o expired,
nunca all) y `source` (source_kind announcement). Fin no nulo >= inicio.
El estado se deriva, no se persiste.

## 6. get_profile_progress

Consulta el perfil sintético seleccionado por el contexto controlado del backend.
`profile_key` no es argumento de tools/call ni decisión libre del LLM; llega por
el contexto confiable de la aplicación. No se extrae del texto de una pregunta ni
de metadatos arbitrarios del modelo. Su transporte/autenticación local se diseñarán
antes de implementar, sin introducir autenticación institucional.

| Input | Requerido | Tipo y límites | Default |
| --- | --- | --- | --- |
| `statuses` | No | array único, máximo 3: enrolled, in_progress, completed | Sin filtro |
| `limit` | No | integer, 1–50 | 20 |

Salida requerida: `release_id`, `profile`, `courses` (array, máximo 50).
`profile` requiere `profile_key` (clave), `alias` (texto no vacío) y `source`
(source_kind profile). Cada elemento de courses requiere:

| Campo | Tipo |
| --- | --- |
| `course_key` | clave estable |
| `course_name` | texto no vacío; join con courses en la misma release |
| `status` | enrolled, in_progress o completed |
| `progress_percent` | number, 0–100 |
| `started_at`, `completed_at` | date-time o null |
| `source` | procedencia con source_kind profile_course |

Orden por course_key ascendente. Conservar las invariantes físicas de progreso:
enrolled implica 0 y completed_at null; in_progress implica 0 < porcentaje < 100 y
completed_at null; completed implica 100 y completed_at no nulo. Fechas ordenadas
si ambas existen. La salida numérica corresponde al numeric(5,2) físico, no a texto.

Perfil seleccionado pero ausente en la release vigente: `NOT_FOUND`, sin recuperar
una versión histórica. Perfil existente sin cursos que cumplan: éxito con profile
y courses vacío. Sin selección contextual: `PROFILE_CONTEXT_REQUIRED`.

La fuente de cada asociación corresponde a profile_courses; course_name es una
proyección mediante join. Para citar afirmaciones propias del catálogo, como el
nombre/descripción del curso, usar además `get_courses` y su fuente course; no
atribuir contenido del catálogo al archivo de progreso.

## Reglas de búsqueda no vectorial

En find_documents, get_courses y get_announcements, el handler deberá usar
coincidencia literal de la consulta completa, sin distinguir mayúsculas, sobre los
campos descritos. No interpreta la consulta como SQL, expresión regular ni patrón
de comodines. No usa LLM para filtrar ni ordenar. La implementación deberá fijar
normalización/collation y probar caracteres con acentos; no se instala aquí ninguna
extensión ni se altera el esquema. Los órdenes por clave resuelven desempates
de forma estable.

## Errores operacionales

El JSON del bloque de texto de error requiere exactamente:
`code` (uno de los cinco valores), `message` (texto no vacío y seguro),
`retryable` (boolean) y `request_id` (UUID técnico de correlación).
No incluye datos de salida exitosa ni necesita release_id, pues puede fallar antes
de seleccionar una release. No se serializa directamente una excepción.

| Código | Uso | retryable |
| --- | --- | --- |
| INVALID_ARGUMENT | Argumentos válidos por schema pero combinación semántica inválida, como rango de fechas invertido o >366 días inclusivos. | false; corregir entrada |
| NOT_FOUND | Falta release vigente o perfil contextual no presente en ella. Nunca por una lista de búsqueda vacía. | false; requiere cambio de contexto/dataset |
| PROFILE_CONTEXT_REQUIRED | Exclusivo de get_profile_progress sin perfil sintético seleccionado. | false |
| DEPENDENCY_UNAVAILABLE | PostgreSQL/pgvector o embedding local indisponible; no se logra fijar contexto coherente tras reintento limitado. | true |
| INTERNAL_ERROR | Error inesperado o salida que viola el contrato. | false; diagnóstico técnico |

Un error de dimensión/receta generado internamente no culpa a un input de vectores
inexistente del agente: se clasifica como fallo interno/de dependencia, no se copia
el SQLSTATE bruto. Los mensajes no exponen SQL, sentencias, stack traces, secretos,
rutas del host ni configuración privada. Los reintentos no son indefinidos.

Ausencia normal de resultados: éxito con array vacío. La evidencia vacía o
insuficiente debe comunicarse explícitamente; nunca completarse con hechos
inventados ni con conocimiento del LLM como sustituto de una tool fallida.

## Seguridad y dependencias antes de implementar

- Ninguna tool acepta SQL, nombres de tabla/columna, operadores, enlaces externos,
  selección de release histórica ni selección arbitraria de otro perfil.
- Texto libre es un término literal, nunca código ni instrucción de acceso; aunque
  contenga una dirección, no provoca una conexión ni se interpreta como recurso.
- Ninguna tool escribe corpus, publica releases o persiste historial conversacional.
- Consultas parametrizadas; cliente MCP con permisos de solo lectura mínimos.
  Nunca reutilizar el propietario de migración o la identidad de ingesta.
- Los resultados documentales son datos no confiables, no instrucciones para ampliar
  privilegios, cambiar herramientas o ejecutar acciones.
- Logs mínimos: tool, duración, resultado y correlación; no vectores, secretos ni
  contenido sensible. Esto no crea una tabla ni implementa observabilidad.
- El DDL ya ofrece las dos funciones de retrieval. Los accesos estructurados aún
  requieren diseñar superficies de lectura y permisos restringidos antes de
  implementar; citar una tabla como fuente no autoriza SELECT general al histórico.
- El modelo local de embeddings ya está aprobado; no se vuelve a elegir aquí.
  Su configuración se resuelve internamente por release → embedding_config.
- Transporte MCP y entrega segura del contexto de demostración quedan pendientes
  de implementación/diseño específico, sin modificar las seis interfaces congeladas.

## Cambios incompatibles desde 1.0.0-draft (solo referencia histórica)

Esta sección no define aliases ni herramientas adicionales.

- search_institutional_knowledge → search_knowledge.
- find_official_documents → find_documents.
- get_academic_calendar → get_calendar_events.
- get_student_course_history → get_profile_progress.
- Se incorporan get_courses y get_announcements; pasan de cuatro a seis tools.
- Se eliminan filtros website/google_sheet y referencias funcionales a Google Sheets.
- Se eliminan canonical_uri, retrieval_run_id, student_ref, academic_program_code,
  source_authority, datos de scraping/extracción, metadata del modelo y similitud duplicada.
- Se elimina cursor/next_cursor y su política de firma/expiración.
- Se retira planned y se adopta enrolled; desaparecen fechas de finalización como filtros.
- Se retiran STALE_DATA, UNAUTHENTICATED y FORBIDDEN del catálogo operacional.
- Cambian límites, campos requeridos, procedencia source y release_id obligatorio.
  Los esquemas y enums antiguos no deben enviarse al servidor nuevo.

Con objetos cerrados, incluso añadir campos de salida puede romper consumidores
antiguos. Cualquier cambio posterior requiere revisión de compatibilidad y
actualización coordinada de JSON, Markdown y pruebas; no asumir compatibilidad
solo porque un campo nuevo sea opcional.

## Aceptación y validación

Antes de implementar: JSON válido, schemas Draft 2020-12 verificables localmente,
seis nombres/orden/anotaciones exactos, entradas y salidas cerradas, equivalencia
de required/enums/límites/defaults entre este documento y JSON. Validar además
las invariantes entre campos no expresables por los schemas declarados.

Validación estática realizada en esta revisión, sin instalar paquetes: JSON válido;
los 12 schemas de tools y el schema de errores aceptados por el metaschema Draft
2020-12 mediante JsonSchema.Net 7.0.0 disponible en PowerShell 7.6.5. Pasaron 376
comprobaciones de instancias positivas/negativas con validación de formatos activada:
campos requeridos, propiedades extra anidadas, límites, enums, UUID, fechas, rutas,
resultados vacíos, estados de evidencia y errores operacionales. Se contrastaron
manualmente las tablas Markdown con los campos, required, enums, máximos y defaults
del JSON. Las referencias antiguas quedan únicamente en la sección histórica.

Después de autorizar implementación: probar selección/combinar tools para OE3,
snapshot coherente, faltantes, errores seguros, contexto de perfil confiable,
procedencia exacta y ausencia de escrituras. Esta entrega estática no demuestra
comportamiento de handlers, transporte MCP ni cumplimiento experimental de OE3.
