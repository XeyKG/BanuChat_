# Fuente de verdad sintética de BanuChat — contrato v1

Contrato de datos `1.0.0`, adaptado al SQL vigente por aprobación expresa.
Estado del contenido: **BanuChat Synthetic Dataset v1 — approved / frozen for ingestion**.
Aprobación humana explícita registrada para el proyecto BanuChat el 2026-09-26.
El contenido v1 fue revisado y aprobado para la ingesta del prototipo; sigue siendo
100 % sintético. Esta aprobación del proyecto no es una validación institucional
de UNAB/CCD. No significa que se haya ingerido a PostgreSQL ni demuestra métricas
RAG, RAGAS, rendimiento o usabilidad. No se ejecuta ingesta en este cierre.
Universo único: **Programa Demo de Aprendizaje Digital**.

Nota posterior: las frases de este README sobre no ejecutar ingesta/backend
describen el cierre de aprobación/congelación de v1, no el runtime actual.
Después se ingirió y validó v1 en
[Implementación 3](../../eval/ingestion/results/implementation-3-e2e-2026-09-29.md)
y en [N3](../../eval/ingestion/results/n3-n8n-e2e-2026-10-02.md), que publicó una
release `ready/current` con 76 items, 12 versiones documentales y 60 embeddings.
La segunda ejecución manual N8N fue `already_current`. Se conservan intactos el
contenido funcional, manifest, hashes, schemas y HUMAN_REVIEW de v1.

Los **18 archivos funcionales y 76 items lógicos** identificados por manifest.json
constituyen el contenido funcional de v1 congelado para ingesta. Cualquier cambio
posterior de contenido debe producir una nueva revisión candidata, con validación
y aprobación propias; no puede alterar silenciosamente la versión congelada.
README.md y HUMAN_REVIEW.md no pertenecen al inventario funcional: este cierre
documental no modifica manifest.json ni ninguno de sus hashes.

## Propósito y ficción

Esta carpeta es la fuente de verdad versionada de todos los datos funcionales.
PostgreSQL conserva su representación procesada; no es un editor de estos archivos.
Todo contenido es 100% inventado, incluidas fechas, personajes, cursos y actividades.
Nunca se usan datos, nombres de personas, cursos, sitios, APIs, fechas ni hechos reales
de UNAB/CCD, ni como inspiración factual. Tampoco URLs externas o credenciales.
La marca `synthetic: true` no prueba por sí sola el carácter ficticio del texto.

La asistencia de IA para redactar es admisible, pero no sustituye la revisión humana.
La aprobación explícita de v1 se registra en HUMAN_REVIEW.md, fuera de los datos
funcionales, sin inventar aprobadores, firmas ni cargos. Las revisiones futuras
requieren su propia aprobación; este cierre no hace commit ni crea una release SQL.

Este README y HUMAN_REVIEW.md establecen el estado vigente. Las menciones previas
de candidatura en README de subdirectorios, la etiqueta documental v1-candidate y
la referencia a la candidata en doc-006 quedan como antecedentes de preparación,
no como estado de aprobación actual. Se conservan sin cambios por el alcance
exclusivamente documental de este cierre y la congelación del contenido funcional.

## Estructura

```text
data/synthetic/
  .gitattributes
  .gitignore
  README.md
  HUMAN_REVIEW.md
  manifest.json
  schemas/
    README.md
    manifest.schema.json
    documents.schema.json
    courses.schema.json
    calendar-events.schema.json
    announcements.schema.json
    profiles.schema.json
    profile-progress.schema.json
  documents/
    README.md
    documents.json
    artifacts/doc-001.md … doc-012.md
  courses/
    README.md
    courses.json
  calendars/
    README.md
    events.json
  announcements/
    README.md
    announcements.json
  profiles/
    README.md
    profiles.json
    progress.json
```

La versión v1 aprobada contiene 12 documentos (10 chunked y 2 full_document), 12 cursos,
22 eventos, 8 anuncios, 4 perfiles y 18 asociaciones: 76 items en 18 archivos
funcionales (seis catálogos JSON y doce artefactos Markdown). La matriz de
[revisión humana](HUMAN_REVIEW.md) registra la aceptación editorial y para futura ingesta.

Se reemplaza el fixture mínimo no publicado, incluida su antigua guía doc-001,
por el conjunto solicitado. No es una actualización sobre una identidad SQL ya
publicada: no se ha ejecutado ingesta de este dataset. La inmutabilidad de
identidades publicadas sigue vigente; no reutilizar esta sustitución para alterar
un corpus que ya exista en PostgreSQL.
Las colecciones permiten estar vacías, pero el manifest requiere al menos un item,
como `validate_manifest`; un esqueleto totalmente vacío no es una candidata SQL.

## Formatos y campos

JSON UTF-8 sin BOM para datos; Markdown UTF-8 sin BOM para artefactos v1.
Se usan LF y salto final de línea. `.gitattributes` fija LF dentro de esta carpeta
para evitar divergencias por `core.autocrlf`. No hay CSV, Excel ni PDF en v1.
La excepción local de `.gitignore` permite versionar documents/artifacts/*.md,
que de otro modo quedaría oculto por la regla global artifacts/ para derivados.

Cada catálogo tiene `schema_version: "1.0.0"`, `synthetic: true` y una colección:
`documents`, `courses`, `events`, `announcements`, `profiles` o `progress`.
Calendario, anuncios y progreso incluyen además `timezone: "America/Bogota"`.
Todos los campos definidos son requeridos; nullable significa presente con null,
no omitido. No hay metadata genérica. Los schemas están en Draft 2020-12;
sus IDs URN son identificadores locales estables, no recursos a descargar.
El URI estándar de `$schema` identifica el dialecto, no una fuente funcional externa.

| Colección | Campos de cada registro |
| --- | --- |
| documents | document_key, title, retrieval_mode, mime_type, version_label nullable, artifact_path |
| courses | course_key, name, description, status |
| events | event_key, title, description, event_type, starts_at, ends_at nullable, course_key nullable, announcement_key nullable |
| announcements | announcement_key, title, description, valid_from, valid_until nullable |
| profiles | profile_key, alias |
| progress | profile_key, course_key, status, progress_percent, started_at nullable, completed_at nullable |

`retrieval_mode` es chunked o full_document, nunca un formato de archivo.
`mime_type` es siempre text/markdown. Toda guía se clasifica full_document y no
produce chunks ni embeddings. El modo de una identidad documental existente es
inmutable en SQL: no cambiarlo ni crear otra clave para eludir esa protección.
UUID, vectores, estados de procesamiento, recetas y hashes de texto extraído son
derivados técnicos y no se incluyen en estos catálogos.

Cursos: available / closed / archived. Eventos: course_session /
announcement_deadline / general. Progreso: enrolled / in_progress / completed.
No se almacena is_active ni temporal_status: la vigencia de anuncios se deriva
respecto al instante de consulta. Progreso es una instantánea, no un historial de
transiciones. Alias como “Perfil Demo Alfa” no representan usuarios
autenticados y nunca incluyen contacto, identificación o datos académicos reales.

### Claves y tiempos

Claves funcionales: `^[a-z0-9][a-z0-9_-]{0,127}$` (1–128 caracteres).
No se usan UUID de base de datos ni nombres reales como identidad fuente.
Las claves se conservan entre revisiones y no se reutilizan para otra entidad.
La asociación se identifica exclusivamente por `profile_key/course_key`;
no hay campo item_key. Para logs puede derivarse `kind:key`, sin persistirlo.

La zona canónica de autoría es America/Bogota, decisión técnica del prototipo.
Los timestamps son RFC 3339 con zona; al redactar se usa el offset correspondiente
a America/Bogota para ese instante. El schema valida date-time con formatos
habilitados; la correspondencia del offset con la zona IANA requiere validación
cruzada. No se confunde el nombre de zona con un timestamp sin offset.
La programación inventada abarca del 2026-10-01 al 2026-11-30; todos los timestamps
funcionales se serializan con offset -05:00. No representa una programación real.
Hay un inicio a 00:00 y otro a 23:45 para revisar límites civiles; no recurrencias.

Los intervalos se comparan como instantes, no como strings. ends_at >= starts_at;
valid_until >= valid_from; completed_at >= started_at cuando ambos existan.
Un valor null no se completa por inferencia. SQL permite started_at null incluso
en completed; no se impone una restricción adicional contraria al modelo.

America/Bogota es la semántica civil canónica de REST, MCP y autoría del dataset.
Ambas fronteras de consulta filtran starts_at, sin solapamiento, y transforman los
límites civiles a instantes con zona. El dataset almacena timestamps RFC 3339 con
zona/offset. La alineación MCP es una corrección preimplementación de 2.0.0-draft.

## Manifest: dos inventarios

`manifest.json` declara manifest_version, dataset_key, schema_version, synthetic,
timezone, files e items. dataset_key = banuchat-synthetic identifica el corpus único,
no una release ni una clave primaria nueva de PostgreSQL.

### files: inventario físico

Cada archivo funcional tiene path relativo, kind y sha256. Los seis catálogos
incluyen schema relativo a esta raíz; los artefactos Markdown omiten schema.
Kinds físicos: documents, courses, calendar_events, announcements, profiles,
profile_progress y document_artifact. Son categorías de archivo, no source_kind SQL.

El inventario siempre incluye los seis catálogos y todos los artefactos referidos.
No incluye manifest.json (evita autorreferencia), README, schemas ni archivos .git*:
estos son contrato/documentación, no contenido funcional, y quedan fijados por Git.
No se ingieren archivos solo por encontrarlos al recorrer la carpeta.
No debe haber artefactos funcionales huérfanos ni archivos extra ocultos al inventario.

### items: inventario lógico SQL

Cada item usa exactamente kind, key, path, locator y sha256. Solo document añade
retrieval_mode obligatorio; para los otros kinds esa propiedad está prohibida,
incluso con null. Identidad autoritativa: (kind, key). Kinds lógicos:
document, course, calendar_event, announcement, profile y profile_course.

Cada item documental apunta a su artefacto, nunca al catálogo documents.json.
El catálogo también está en files: sus bytes fijan título, modo, MIME y etiqueta.
Su metadata se une por document_key y artifact_path; no se crea un segundo item
para el catálogo ni se añade un checksum duplicado a cada fila documental.

Localizadores v1:

- Documentos: `document`, que designa el artefacto completo, no un ancla inventada.
- JSON: JSON Pointer al registro, por ejemplo `/courses/0`, `/events/0`,
  `/announcements/0`, `/profiles/0` y `/progress/0`, con índice desde cero.
- Reordenar una colección obliga a actualizar los pointers del manifest.
  Son reproducibles dentro de su revisión, no identificadores entre revisiones.
- Los localizadores de chunks serán derivados por la receta de procesamiento;
  no se precalculan chunks en la fuente. Citas full_document usan el localizador
  completo, las estructuradas el pointer exacto y las de chunk el del derivado.

### manifest field → destino PostgreSQL

| Campo manifest | Destino o uso |
| --- | --- |
| documento completo | dataset_releases.manifest, copia JSONB aprobada |
| schema_version | dataset_releases.dataset_schema_version |
| dataset_key | Verificación del corpus único; mapeo controlado a datasets.id = 1, sin columna dataset_key |
| manifest_version, synthetic, timezone | Metadatos conservados en manifest JSONB; validación del importador |
| files[].path/kind/schema/sha256 | Validación física previa; sin tabla adicional |
| items[].kind | ingestion_items.source_kind; discriminador de release_records y citas |
| items[].key | ingestion_items.record_key; clave de entidad; para progreso profile_key/course_key |
| items[].path | source_path del registro/versión documental y del item de ingesta |
| items[].locator | source_locator del registro/versión documental y del item de ingesta |
| items[].sha256 | source_sha256 del registro/versión documental y del item de ingesta |
| items[].retrieval_mode | documents.retrieval_mode; solo documental |

El importador mapea esas columnas; no añade source_path/source_locator al manifest.
No persiste un ID de release en la fuente. La futura ingesta aporta la revisión Git
inmutable y la receta/configuración efectiva; PostgreSQL genera sus UUID y hashes
de configuración. La identidad de dataset_releases usa dataset, revisión, hash
del manifest, hash del pipeline y embedding_config_id.

### Hashes sin circularidad

`item.sha256 == file.sha256 == SHA256(bytes reales)` para el mismo path.
Repetir el hash por item es una desnormalización deliberada exigida por SQL,
no un hash del registro JSON individual. Modificar un archivo con varias filas
obliga a actualizar todos sus items, aunque solo haya cambiado una fila.

Se calcula SHA-256 de los bytes exactos versionados, sin parsear/reserializar JSON,
normalizar Unicode ni cambiar saltos de línea antes del cálculo.
El propio manifest no está en files: editarlo no invalida hashes de sus miembros.
PostgreSQL calcula dataset_releases.manifest_sha256 sobre JSONB::text UTF-8,
**no sobre los bytes del manifest.json**. No sustituir un hash por otro.
content_sha256 y config_sha256 tampoco equivalen a source_sha256.

## Añadir o actualizar contenido

1. Redactar contenido exclusivamente ficticio y asignar/conservar claves estables.
   Para un documento, crear documents/artifacts/<nombre-seguro>.md y añadir metadata
   al catálogo. El nombre v1 admite minúsculas, números, guion y guion bajo, seguido
   de .md; no se obliga a que sea igual a document_key.
2. Mantener las seis envolventes; completar relaciones por claves y null explícitos.
   Elegir full_document para cualquier guía; no agregar derivados técnicos o golds.
3. Validar cada archivo con su schema local, formatos activos y rechazo de claves
   JSON duplicadas. Validar además las invariantes cruzadas enumeradas abajo.
4. Guardar UTF-8 sin BOM, LF, y calcular los SHA-256 reales de cada catálogo/artefacto.
   Actualizar files y todos los items afectados con los mismos hashes y pointers.
   No incluir el manifest en su propio inventario.
5. Revisar diff, claves, hechos ficticios, rutas, integridad y cobertura completa.
   Comprobar que los bytes del checkout coincidan con los bytes que Git versionará;
   rechazar filtros de Git o cambios de fin de línea que alteren esa equivalencia.
6. Someter el cambio a revisión humana del equipo. Solo una revisión Git aprobada,
   con schemas y artefactos conservados, puede ser seleccionada posteriormente.
   V1 ya tiene aprobación humana explícita; cualquier revisión candidata posterior
   requiere una nueva aprobación. Este cierre documental no hace commit.
7. N8N/importador leerá esa revisión, validará y producirá derivados técnicos.
   No reescribirá fuentes ni “arreglará” silenciosamente datos en runtime.
   Un cambio fuente/receta/configuración crea otra candidata; una release publicada
   permanece inmutable. Retirar una entidad implica omitirla de la siguiente
   instantánea completa y ajustar todas sus referencias.

Para reproducir citas se conserva la revisión y el artefacto exactos. Una descarga
histórica no se sustituye por bytes actuales; si no están disponibles, REST retorna
404. La app no recibe paths del filesystem: el backend presenta enlaces REST locales.

## Invariantes: schema, importador y revisión humana

| Invariante | JSON Schema | Importador / revisión |
| --- | --- | --- |
| Objetos cerrados, required, marcas/versiones y enums | Sí | No eliminar propiedades inválidas silenciosamente |
| Claves estables y progreso compuesto con / | Sí, forma | Unicidad por clase/par, ausencia de UUID usados como claves y estabilidad entre revisiones |
| Rutas de archivos y schemas | Sí, categorías/rutas exactas o patrón Markdown acotado | Existencia, resolución real y contención bajo data/synthetic; rechazar symlinks/junctions/escapes |
| Manifest no vacío; seis catálogos presentes una vez | Sí | Cobertura bidireccional items/filas/artefactos, sin faltantes ni extras |
| retrieval_mode solo en documento | Sí | Coincidencia con catálogo e identidad SQL; guías full_document por revisión semántica |
| course_session solo curso; deadline solo anuncio; general ambos null | Sí | FK en la misma revisión |
| Progreso enrolled=0, in_progress entre 0 y 100, completed=100 y fin | Sí | Relaciones, comparación temporal y representación decimal exacta |
| Precisión de porcentaje: múltiplo de 0.01 | Sí | Usar decimales, no redondear silenciosamente |
| date-time con zona | Sí, activar formatos | Confirmar fecha civil real con parser estricto, orden de fechas y offset coherente con America/Bogota |
| sha256 hexadecimal de 64 caracteres | Sí, forma | Igualdad item/file/bytes de revisión; hashes sin canonicalizar |
| Arrays sin objetos idénticos | Sí, uniqueItems | Unicidad de claves/path aunque el resto del objeto difiera |
| locator documental o pointer con índice válido sintácticamente | Sí | Resolver pointer, comprobar clave y fila; metadata ↔ artefacto |
| Ficción, ausencia de datos reales/URLs/secretos en texto libre | No | Revisión humana y controles de contenido, también Markdown |

La validación de formato no hace I/O ni demuestra hechos del texto. El importador
debe rechazar también fechas inexistentes con un parser estricto: el validador
local JsonSchema.Net 7.0.0 acepta 2032-02-30 pese a activar formatos. Esta limitación
de la herramienta no convierte esa fecha en válida para el contrato.
El importador
no debe descargar nada a partir del contenido o de un identificador de schema.
Debe mapear las siete URN a schemas locales de la revisión aprobada.
Los campos de procedencia permiten construir message_citations posteriormente;
el dataset no incluye mensajes, conversaciones ni citas prefabricadas.

## Cobertura de v1 aprobado y autoridad por dominio

| Fuente | Cantidad / distribución | Autoridad |
| --- | --- | --- |
| documents/documents.json + artifacts | 10 chunked, 2 full_document | Metadata documental; reglas/procedimientos y guías completas |
| courses/courses.json | 12: 6 available, 4 closed, 2 archived | Nombre, descripción y disponibilidad |
| calendars/events.json | 22: 12 course_session, 5 announcement_deadline, 5 general | Fechas de eventos y relaciones |
| announcements/announcements.json | 8; uno sin final | Texto y vigencia de comunicaciones |
| profiles/profiles.json | 4 alias Perfil Demo Alfa/Beta/Gamma/Delta | Identidad ficticia |
| profiles/progress.json | 18: 5 enrolled, 5 in_progress, 8 completed | Instantánea de avance, no historial |

Cada perfil tiene los tres estados representados; los pares perfil/curso son únicos.
Las asociaciones previas pueden permanecer en cursos closed; archived conserva
referencias de actividades completadas. Ningún curso archived tiene course_session
en v1. Las sesiones de
refuerzo pueden repetir cursos available o closed; no se exige una sesión por curso.
Las fechas de progreso son anteriores al 2026-09-26, variadas entre julio y septiembre
de 2026 e independientes de los eventos futuros del calendario.
Los cinco hitos announcement_deadline coinciden con valid_until de su anuncio.
La vigencia se calcula al consultar: hay ventanas distintas y no se persiste temporal_status.

Los documentos no duplican fechas de eventos/anuncios ni porcentajes individuales.
Las dos guías conservan full_document y no deben fragmentarse/vectorizarse.
El catálogo no contiene contenido documental extenso. Las referencias cruzadas
orientan hacia la autoridad de cada tema, sin sustituirla ni crear otra fuente paralela.

## Ausencias deliberadas

No se incluyen calificaciones, costos, matrículas reales, profesores, certificados
reales, emails, teléfonos, ubicaciones reales, códigos institucionales, cuentas,
credenciales, información personal ni procedimientos administrativos reales.
Estas categorías ausentes permiten demostrar evidencia insuficiente sin fabricar
respuestas. Tampoco hay asistencia individual, tickets de soporte o historiales de
transición: los documentos explican esos límites, no afirman que existan módulos
para gestionarlos. Ninguna descripción de una práctica implementa acciones de escritura.

No generar aquí preguntas de evaluación, gold answers, relevance labels, resultados
RAGAS, expected tool calls o SUS. Todo ello pertenece a /eval, que no se modifica.
Registros de participantes humanos requieren su propio diseño ético y nunca se
incorporan al corpus ni se versionan como datos sintéticos.

## Comparación con fuentes vigentes

Prevalecen el SQL validado, MCP 2.0 y REST v1. La adaptación autorizada del manifest
elimina la incompatibilidad previa sin cambiar PostgreSQL. No quedan referencias
activas a la carpeta calls en esta estructura.

Observaciones históricas, sin modificar contratos:

- El modelo lógico aún menciona item_key y JSON/CSV: el SQL identifica
  (source_kind, record_key), y este contrato v1 usa únicamente JSON/Markdown.
- El modelo/ADR 0001 conservan estados de borrador o ejecución pendiente que ya
  fueron superados por el README de base de datos y la aprobación del proyecto.
- ADR 0003 dice DEFAULT/CHECK para el nombre del modelo; SQL conserva defaults,
  pero solo exige proveedor/modelo/revisión no vacíos, dimensión 1024 y cosine.
  Este dataset no fija ni inventa revisiones/configuraciones de embeddings.
- La documentación REST utiliza answer_release_id como nombre abreviado interno;
  la columna física vigente es messages.answer_dataset_release_id. No afecta a
  la fuente, que no contiene historial, ni exige modificar el contrato REST aquí.

No se implementan N8N, ingesta o backend. Este contrato respalda trazabilidad para
OE1/OE2/OE4, pero no acredita sus métricas ni una publicación SQL ejecutada.

## Ajuste editorial aceptado en la revisión final

Se conservan claves, contratos y conteos. Los documentos doc-001 a doc-009 se
centran en procedimientos y orientaciones del programa ficticio, reduciendo
explicaciones de arquitectura. doc-010 es una FAQ más breve: duda, respuesta
acotada y fuente autoritativa, sin añadir reglas. Las guías completas no se reescriben.
La menor longitud de la FAQ es deliberada para evitar duplicación y relleno.

El banner inicial de ficción y la línea `synthetic: true` permanecen en cada
artefacto Markdown. La futura ingesta deberá poder excluir únicamente ese banner
repetitivo del contenido enviado a chunking/embeddings, preservándolo intacto en el
artefacto fuente. Esa extracción deberá ser explícita y reproducible; los SHA-256
de procedencia siguen correspondiendo a los bytes completos del archivo fuente.
No se implementa extracción ni se modifica el tratamiento full_document aquí.
