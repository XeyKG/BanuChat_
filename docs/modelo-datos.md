# Modelo de datos conceptual y lógico del MVP

Nota de contexto: este documento conserva el diseño lógico aprobado y las
revisiones históricas de Fase 1; sus referencias a aplicaciones, ingesta o modelos
pendientes describen esa fase. La implementación posterior de ingesta, REST,
router, Document RAG y mobile se documenta en [arquitectura](arquitectura.md),
[backend](../backend/README.md) y [eval](../eval/README.md). La concreción física
vigente está en [infra/db](../infra/db/README.md). Esta nota no altera decisiones
del modelo ni acredita nuevamente pruebas históricas.

Estado: modelo lógico aprobado, Fase 1. Su traducción al esquema físico inicial fue
realizada; la migración inicial y la suite A–K fueron ejecutadas en PostgreSQL local
desechable. Esto no valida todavía ingesta, backend, roles runtime ni concurrencia
avanzada, ni autoriza implementar aplicaciones.
La decisión de publicaciones se registra en el [ADR 0002](adr/0002-publicaciones-sinteticas-inmutables.md).
Base de contraste original: el borrador anterior de `infra/db/001_initial_schema.sql`,
reglas de `AGENTS.md` y arquitectura documentada. La sección 7 conserva ese análisis
histórico; el SQL actual ya fue reescrito. Véanse el [esquema físico](../infra/db/README.md)
y el [ADR 0003](adr/0003-embedding-local-qwen3.md). Los contratos MCP siguen sin cambios.

## 1. Alcance

Una sola instancia PostgreSQL + pgvector conserva la representación procesada del corpus
100% sintético, cursos, calendario, convocatorias, perfiles de demostración y su progreso.
También conserva conversaciones visibles y citas, separadas conceptualmente del corpus.
No se prevén campos, conectores ni excepciones legales para incorporar datos reales.

`/data/synthetic` es la fuente de verdad versionada. Una publicación completa y validada
del dataset se activa de forma atómica. Las publicaciones anteriores se conservan para
citas y evaluaciones, pero no participan en consultas normales. Esta estrategia evita
combinar cursos, eventos y documentos de distintas publicaciones.

Se distinguen tres clases de persistencia:

- **Fuente funcional:** archivos sintéticos y manifiesto versionados; reconstruibles.
- **Derivados:** extracción, chunks, embeddings y resultados de ingesta; regenerables con
  la misma configuración. Regenerar embeddings no garantiza igualdad bit a bit si el
  proveedor cambia el modelo; para una repetición exacta se necesita conservar el artefacto.
- **Estado de demostración:** conversaciones, mensajes, citas y tiempos de ejecución.
  No se reconstruye desde el corpus ni se incorpora automáticamente al dataset. Una
  reconstrucción limpia recupera la base funcional, no las conversaciones de sesiones previas.

Fuera del modelo: autenticación institucional, credenciales, datos personales reales,
integraciones institucionales, entrega de notificaciones push, razonamiento interno,
mensajes internos del agente y registros identificables de participantes de usabilidad.
La app consume REST; el agente usa MCP interno; N8N ejecuta ingestas asíncronas aprobadas.
Ninguna de esas fronteras exige una base adicional.

## 2. Entidades

### Convenciones comunes

Los nombres siguientes son propuestas lógicas, no contratos congelados. Los identificadores
de documentos y registros estructurados son claves estables suministradas por el dataset,
no nombres de personas ni claves institucionales. Los IDs internos pueden resolverse a partir
de esas claves durante una reconstrucción; las evaluaciones no deben depender de UUID aleatorios.

Una **referencia de origen** contiene `dataset_release_id`, ruta relativa bajo
`/data/synthetic`, localizador de sección/registro y checksum del archivo en el manifiesto.
No contiene una URL externa. Las rutas deben normalizarse, impedir escapes y resolver dentro
de la raíz aprobada. Un registro JSON/CSV se cita como archivo + sección/clave de registro;
un documento como título + sección/página + versión. El backend resuelve enlaces locales
al artefacto completo de la revisión correspondiente.

Las entidades de dominio de una publicación son inmutables después de validarla. Sus
relaciones usan claves compuestas con `dataset_release_id` para impedir cruces de versiones.
No se añaden bolsas JSON genéricas, correos, identificaciones, programas académicos reales,
preferencias ni datos de contacto sin un caso de uso aprobado.

### 2.1 `datasets` — ámbito sintético y selección vigente

- **Responsabilidad:** identificar el único corpus funcional del MVP y su publicación vigente.
- **Campos/ID:** `id` estable, nombre y `current_release_id` opcional mientras no haya publicación.
- **Relaciones:** tiene muchas `dataset_releases`; apunta a una de sus propias releases.
- **Restricciones:** un único dataset funcional; FK compuesta de pertenencia del puntero;
  solo puede apuntar a una publicación validada. No existe opción de origen real.
- **Justificación:** un único punto de activación permite consultas coherentes y rollback.
  No se persisten `synthetic_only` ni la raíz física: son invariantes de arquitectura y
  proceso, no propiedades configurables del corpus. El manifiesto marcado sintético,
  su revisión y la ingesta controlada aportan procedencia; un booleano no prueba ficción.

### 2.2 `dataset_releases` — publicación procesada reproducible

- **Responsabilidad:** fijar una instantánea completa del dataset y su receta de procesamiento.
- **Campos/ID:** `id`; `dataset_id`; revisión Git inmutable; hash del manifiesto; versión de
  esquema del dataset; configuración versionada y hash del pipeline de extracción/chunking;
  `embedding_config_id` obligatorio; estado `staging/ready/failed`; instante de importación y validación.
- **Relaciones:** pertenece a un dataset; agrupa documentos versionados y datos estructurados;
  referencia una única configuración exacta de embeddings y sus ejecuciones de ingesta.
- **Restricciones:** combinación única de dataset, revisión, manifiesto, pipeline y configuración de embeddings.
  Una publicación `ready` no admite cambios de contenido/configuración. Un cambio de receta
  o modelo produce otra publicación, aunque los archivos fuente no hayan cambiado.
- **Justificación:** trazabilidad de corpus y pipeline para OE1/OE2/OE4, sin tablas separadas
  para cada etapa del procesamiento. Es una versión de la representación procesada; la
  revisión Git identifica por separado la versión del material fuente.

No se infiere vigencia por fecha máxima ni por estado `ready`: únicamente por el puntero
del dataset. Varias publicaciones pueden estar listas y solo una ser vigente.

### 2.3 `documents` — identidad documental y única regla de recuperación

- **Responsabilidad:** reconocer un mismo documento y definir su modo estable de recuperación.
- **Campos/ID:** `id`, `dataset_id`, `document_key` estable,
  `retrieval_mode = chunked | full_document`.
- **Relaciones:** dataset y muchas `document_versions`.
- **Restricciones:** clave única dentro del dataset; modo inmutable una vez referenciado.
  Toda guía de cátedra se registra como `full_document`, validado contra el manifiesto.
  No se admite cambiar el modo para vectorizarla ni crear otra identidad para sortear la regla.
- **Justificación:** identidad estable aunque cambien título, contenido o ruta; una sola
  regla decide fragmentación/vectorización frente a enlace completo. No se conserva
  `class`, una política por versión ni otro tipo documental que decida comportamiento.
  El MIME de versión es únicamente descriptivo del formato, no una segunda política.

Una corrección de modo tras publicar exige revisión explícita del diseño y del material
afectado; no existe un cambio operacional de modo dentro del MVP.

### 2.4 `document_versions` — contenido y estado en una publicación

- **Responsabilidad:** representar la versión exacta publicable de un documento.
- **Campos/ID:** `id`, `document_id`, `dataset_release_id`, etiqueta de versión opcional,
  título, referencia de origen, hash del contenido extraído, formato/MIME,
  estado `pending/ready/failed`,
  fecha de ingesta y `ingestion_run_id` que produjo el registro.
- **Relaciones:** un documento, una publicación, una ejecución y cero o más chunks.
- **Restricciones:** único `(dataset_release_id, document_id)`; documento y publicación
  del mismo dataset; ejecución de la misma publicación; recuperación según documents.retrieval_mode.
  Inmutabilidad al publicar; no hay borrado si existen citas.
- **Justificación:** contenido, título y origen exactos deben poder reconstruirse.
  Se elimina `is_active`: pertenecer a la release vigente determina inclusión; retirar
  el documento requiere una nueva release que lo omita. No hay desactivación en sitio.

Una versión es la presencia del documento en una publicación concreta. Un archivo sin
cambios puede tener versiones procesadas distintas en dos publicaciones, compartiendo hash.
Se acepta esa duplicación acotada por simplicidad del MVP; no se introduce deduplicación
entre publicaciones. No se conserva el UNIQUE global `(document_id, content_sha256)` actual.

### 2.5 `document_chunks` — contexto, localizador y embedding único

- **Responsabilidad:** conservar cada fragmento recuperable y su única representación vectorial.
- **Campos/ID:** `id`, `document_version_id`, ordinal, texto, hash, sección/localizador,
  páginas inicial/final opcionales, `embedding`, `embedding_generated_at`,
  `generation_run_id`.
- **Relaciones:** una versión, una ejecución de generación de su misma release y citas.
  La configuración se obtiene exclusivamente mediante
  chunk → document_version → dataset_release → embedding_config.
- **Restricciones:** ordinal único por versión; texto/localizador no vacíos; páginas positivas
  y ordenadas (fin requiere inicio); documento con `retrieval_mode=chunked`.
  Cada chunk publicado tiene exactamente un embedding finito, de norma no cero, compatible
  con `dimension` de su configuración. En staging puede estar pendiente; embedding, fecha
  y ejecución se completan conjuntamente antes de publicar. Todo queda inmutable al publicar.
  Texto idéntico en distintas posiciones es válido: hash no UNIQUE por versión.
- **Justificación:** contexto y evidencia con un solo vector; no necesita tabla de asociación
  ni FK de configuración duplicada. Se conserva fecha de generación para diagnóstico de
  latencias y ejecución para distinguir reintentos, ambos vinculados a la misma release.
  No se persiste token_count sin consumidor; el tokenizador pertenece a la receta si aplica.

Se elimina `chunk_embeddings` como entidad; su contenido útil se integra aquí. No existen
varios embeddings por chunk ni selección entre espacios vectoriales durante retrieval.
Una regeneración distinta de material publicado requiere otra release.

### 2.6 `embedding_configs` — configuración reproducible

- **Responsabilidad:** describir la configuración única utilizada por cada release.
- **Campos/ID:** `id`, proveedor, modelo, revisión cuando aplique, `dimension` positiva,
  métrica coseno, parámetros/preprocesamiento necesarios y hash de configuración canónica.
- **Relaciones:** una configuración puede ser referenciada por varias releases; cada release
  referencia exactamente una. Los chunks heredan esa configuración a través de su versión.
- **Restricciones:** configuración única por su contenido canónico/hash; definición inmutable
  cuando esté referenciada. Sin secretos, endpoints ni banderas de activación independientes.
  Si el proveedor no expone revisión estable, registrar esa limitación de reproducibilidad,
  no inventar una revisión; conservar artefactos si se necesita repetición exacta.
- **Justificación:** igual dimensión no implica compatibilidad semántica; modelo,
  revisión disponible, parámetros y preprocesamiento deben corresponder en consulta y corpus.

Decisión posterior aprobada: Ollama local con `qwen3-embedding:0.6b`, 1024 dimensiones
y coseno. El esquema físico usa `vector(1024)` y búsqueda exacta, sin HNSW/IVFFlat ni
dimensiones simultáneas. La ingesta registrará revisión/digest y receta efectivos; no
se crea un seed ficticio. Véase el [ADR 0003](adr/0003-embedding-local-qwen3.md).

Cambiar configuración/modelo produce otra release completa. Se valida antes de activar
atómicamente el puntero, y cada consulta utiliza solo la configuración de su release.
La conservación histórica no implica servir varios espacios vectoriales a la vez.
Si cambia la dimensión, habrá que aprobar la adaptación física y la estrategia de
conservación/reproducción de vectores históricos antes de ese cambio; el MVP no resuelve
por anticipado ese soporte. Fuentes, versiones y citas históricas deben seguir disponibles.

### 2.7 `ingestion_runs` — intento de procesamiento

- **Responsabilidad:** medir y diagnosticar importaciones, incluidos reintentos.
- **Campos/ID:** `id`, `dataset_release_id`, referencia a receta/workflow versionado,
  disparador `manual/scheduled/retry`, inicio/fin, estado `running/succeeded/failed`,
  código de error técnico saneado opcional.
- **Relaciones:** una publicación; muchos items; versiones y embeddings producidos.
- **Restricciones:** fin posterior al inicio; estado terminal requiere fin; referencias
  conservadas. Un intento puede fallar sin reemplazar la publicación vigente.
- **Justificación:** OE2/OE4 requieren tiempos y éxito de ingesta. Los contadores se derivan
  de items, no se mantienen tres acumuladores independientes potencialmente contradictorios.

### 2.8 `ingestion_items` — resultado por unidad del manifiesto

- **Responsabilidad:** detectar omisiones y calcular denominadores de éxito/reintentos.
- **Campos/ID:** `(ingestion_run_id, item_key)`, ruta/localizador de origen, tipo de unidad,
  estado `pending/processed/skipped/failed`, motivo de omisión/error y fin de procesamiento.
- **Relaciones:** ejecución; versión documental opcional cuando el item corresponde a ella.
- **Restricciones:** item único por intento; origen en el manifiesto; si tiene versión,
  esta pertenece a la publicación del intento. Se registran también fallos previos a crear
  registros de dominio. `skipped` solo se acepta con derivado existente y validado.
- **Justificación:** auditoría pequeña pero necesaria; incluye registros estructurados,
  no solo documentos. No se diseña un motor genérico de ejecución de tareas.

### 2.9 `courses` — catálogo consultable

- **Responsabilidad:** responder consultas de cursos ficticios.
- **Campos/ID:** `(dataset_release_id, course_key)`, nombre, descripción, estado
  `available/closed/archived`, referencia de origen bajo `courses`.
- **Relaciones:** publicación, eventos y asociaciones de perfiles.
- **Restricciones:** claves únicas por publicación, textos requeridos no vacíos;
  no se añaden docente, precio, cupos, certificación o requisitos sin escenario aprobado.
- **Justificación:** el catálogo no debe depender de inferencia sobre texto vectorizado.

### 2.10 `announcements` — información temporal consultable

- **Responsabilidad:** representar convocatorias/anuncios sintéticos con vigencia.
- **Campos/ID:** `(dataset_release_id, announcement_key)`, título, descripción,
  `valid_from`, `valid_until` opcional, origen bajo `announcements`.
- **Relaciones:** publicación y eventos asociados opcionales.
- **Restricciones:** fin no anterior al inicio; vigencia calculada con el instante consultado,
  nunca mediante un booleano que quede desactualizado por el paso del tiempo.
  No hay `is_active`: un retiro anticipado se representa en una nueva release que omita
  el anuncio o cierre su ventana de vigencia, sin alterar la publicación anterior.
- **Justificación:** consultas temporales y base futura para notificaciones; no incluye
  suscripciones, dispositivos, colas ni historial de entregas push.

### 2.11 `calendar_events` — agenda sintética

- **Responsabilidad:** consultas por intervalo y vínculo con el catálogo.
- **Campos/ID:** `(dataset_release_id, event_key)`, título, tipo
  `course_session/announcement_deadline/general`, inicio con zona horaria, fin opcional,
  descripción, `course_key` opcional, `announcement_key` opcional, origen.
- **Relaciones:** publicación y, opcionalmente, curso o convocatoria de esa publicación.
- **Restricciones:** origen exclusivamente bajo `calendars`; fin no anterior al inicio;
  como máximo uno de los dos vínculos; tipo de sesión requiere curso, plazo requiere
  convocatoria y evento general no requiere vínculo. FK compuestas para evitar mezclas.
- **Justificación:** agenda reproducible. No recurrencias ni asistentes en el MVP.
  Se elimina `is_active`: inclusión por release e intervalo cubren el caso; un evento
  retirado se omite en la siguiente release. No se añade un estado de cancelación sin
  caso de uso que exija mostrarlo. Las releases históricas conservan su agenda exacta.

### 2.12 `synthetic_profiles` — personaje de demostración

- **Responsabilidad:** representar un perfil explícitamente ficticio.
- **Campos/ID:** `(dataset_release_id, profile_key)`, alias ficticio, origen bajo `profiles`.
- **Relaciones:** publicación, cursos asociados y conversaciones.
- **Restricciones:** solo ingesta de dataset validado; no campos de consentimiento que
  habiliten datos reales, correo, identificación o credenciales; alias no vacío.
- **Justificación:** personalizar una demostración sin modelar estudiantes reales.

### 2.13 `profile_courses` — progreso/historial académico sintético

- **Responsabilidad:** mostrar cursos asociados y terminados del personaje.
- **Campos/ID:** `(dataset_release_id, profile_key, course_key)`, estado
  `enrolled/in_progress/completed`, porcentaje de avance, inicio y terminación opcionales,
  referencia de origen bajo `profiles`.
- **Relaciones:** perfil y curso de la misma publicación mediante FK compuestas.
- **Restricciones:** avance 0–100; inscrito implica 0, en progreso mayor que 0 y menor que
  100, completado implica 100 y fecha de terminación; fechas ordenadas cuando existan.
- **Justificación:** conserva el caso de progreso/historial solicitado como instantánea
  sintética de solo lectura. No añade eventos por lección, calificaciones ni matrícula real.
  Una publicación nueva cambia la instantánea; no se promete historial de cada transición.

### 2.14 `conversations` — sesión visible de demostración

- **Responsabilidad:** agrupar mensajes para el historial de la app.
- **Campos/ID:** `id`, `dataset_release_id`, `profile_key`, inicio.
- **Relaciones:** perfil sintético de la publicación seleccionada al iniciar y mensajes.
- **Restricciones:** perfil obligatorio y FK compuesta; esa asociación no cambia al activar
  otro dataset. El selector de perfil es de demostración, no autorización ni autenticación.
- **Justificación:** historial recuperable por personaje. No hace falta título persistido,
  fin de sesión o metadata genérica para el escenario mínimo.

### 2.15 `messages` — intercambio visible

- **Responsabilidad:** persistir solo lo que ve el usuario.
- **Campos/ID:** `id`, conversación, ordinal, rol `user/assistant`, texto visible,
  instante, `answer_dataset_release_id` para asistente, `insufficient_evidence`.
- **Relaciones:** conversación, publicación utilizada para la respuesta y citas.
- **Restricciones:** ordinal único por conversación; texto no vacío; solo asistente lleva
  publicación de respuesta y bandera de insuficiencia. No roles `system/tool`, prompts,
  pensamientos, scratchpads ni payloads internos.
- **Justificación:** historial visible y contexto de procedencia, no memoria interna ReAct.
  Se conserva `insufficient_evidence`: describe el resultado concreto de una respuesta,
  no actividad o vigencia del corpus, y permite mostrar esa limitación en el historial.

La conversación conserva la identidad del perfil de apertura, pero cada nueva consulta
resuelve la publicación vigente al comenzar. El perfil se busca por su clave estable en
ella; si ya no existe, se informa y se requiere elegir otro, sin recuperar el antiguo
por defecto. `answer_dataset_release_id` registra la publicación efectiva de cada respuesta.

### 2.16 `message_citations` — evidencia visible y durable

- **Responsabilidad:** permitir abrir y comprobar la fuente histórica exacta de una respuesta.
- **Campos/ID:** `(message_id, citation_index)`, `dataset_release_id`,
  `source_kind = document | course | calendar_event | announcement | profile | profile_course`,
  ruta/localizador; referencias opcionales `document_version_id`, `chunk_id`,
  `course_key`, `event_key`, `announcement_key`, `profile_key`.
- **Relaciones:** mensaje asistente y release de respuesta; fuente concreta en esa release.
- **Restricciones:** localizador obligatorio, pertenencia a la release de respuesta y
  correspondencia entre source_kind y las únicas referencias permitidas según la tabla.
  Cita documental con chunk exige que pertenezca a la versión indicada. No se borran
  evidencias en cascada desde el corpus.
- **Justificación:** evidencia verificable sin URL libre mutable ni jerarquía polimórfica.
  Se añaden profile/profile_course para citar también las consultas de perfil/progreso ya
  incluidas en el MVP; no son tablas nuevas.

| source_kind | Referencia obligatoria | Referencias restantes |
| --- | --- | --- |
| document | document_version_id | chunk_id opcional; claves estructuradas nulas |
| course | course_key | Las demás nulas |
| calendar_event | event_key | Las demás nulas |
| announcement | announcement_key | Las demás nulas |
| profile | profile_key | Las demás nulas |
| profile_course | profile_key + course_key | Las demás nulas |

Cada referencia estructurada se valida contra su tabla mediante la clave compuesta
release/clave; profile_course usa release/perfil/curso. Se evita un genérico
source_id sin integridad referencial. El discriminador solo determina qué referencias
son válidas; no existe una supertabla de fuentes ni subtipos.

Una guía usa versión documental y localizador de documento completo, nunca chunk.
Una cita estructurada usa archivo/registro del dataset, sin inventar un PDF de respaldo.
Ruta/localizador deben coincidir con el origen del registro referenciado y manifiesto
de esa release, no con un archivo del checkout actual. Conservar la revisión fuente
y sus artefactos es necesario para resolver enlaces históricos.

### Trazabilidad que no se convierte en tablas del MVP

Se eliminan del modelo funcional `retrieval_runs` y `retrieval_results`. Para OE1, el
evaluador de `/eval` debe exportar por caso sintético: revisión/hash de corpus, pipeline,
modelo y revisión, consulta o ID del caso, top-k, filtros, ranking de claves estables de
chunks, distancias, tiempos, respuesta, citas y etiquetas de relevancia de referencia.
La relevancia no la determina el propio recuperador. Estos artefactos de evaluación
no son otra fuente del corpus ni contienen datos reales de participantes.

No se añade `tool_executions`: para OE3 basta inicialmente una traza de prueba con ID
del caso, nombre de tool, éxito/error y duración, sin razonamiento ni argumentos completos
por defecto. Si aparece una necesidad operativa de depuración persistente, se revisarán
retención, minimización y esquema; no se anticipa aquí una plataforma de observabilidad.

## 3. Diagrama ER

Se divide por responsabilidad para mantener legibilidad. Los mismos nombres en ambos
diagramas representan las mismas entidades, no bases separadas. Los atributos mostrados
son claves principales, no un DDL exhaustivo; la sección anterior define las FK compuestas.
La ejecución de generación es opcional solo mientras el chunk está en staging; en toda
release publicada es obligatoria. Los vínculos alternativos de citas se restringen por
source_kind como indica la tabla anterior, no son fuentes simultáneas de una misma cita.

```mermaid
erDiagram
    datasets ||--o{ datasetReleases : contiene
    datasets o|..o| datasetReleases : seleccionaVigente
    datasets ||--o{ documents : identifica
    embeddingConfigs ||--o{ datasetReleases : configura
    datasetReleases ||--o{ documentVersions : publica
    documents ||--o{ documentVersions : versiona
    documentVersions ||--o{ documentChunks : contiene
    datasetReleases ||--o{ ingestionRuns : procesa
    ingestionRuns ||--o{ ingestionItems : registra
    ingestionRuns ||--o{ documentVersions : produce
    ingestionRuns o|..o{ documentChunks : generaEmbedding
    documentVersions o|..o{ ingestionItems : identificaResultado
    datasets {
        string id PK
        string currentReleaseId FK
    }
    datasetReleases {
        string id PK
        string datasetId FK
        string embeddingConfigId FK
        string gitRevision
        string pipelineHash
    }
    documents {
        string id PK
        string datasetId FK
        string documentKey
        string retrievalMode
    }
    documentVersions {
        string id PK
        string documentId FK
        string datasetReleaseId FK
    }
    documentChunks {
        string id PK
        string documentVersionId FK
        int ordinal
        vector embedding
        datetime embeddingGeneratedAt
        string generationRunId FK
    }
    embeddingConfigs {
        string id PK
        string revision
        int dimension
    }
    ingestionRuns {
        string id PK
        string datasetReleaseId FK
    }
    ingestionItems {
        string ingestionRunId PK, FK
        string itemKey PK
    }
```

```mermaid
erDiagram
    datasetReleases ||--o{ courses : publica
    datasetReleases ||--o{ announcements : publica
    datasetReleases ||--o{ calendarEvents : publica
    datasetReleases ||--o{ syntheticProfiles : publica
    courses o|..o{ calendarEvents : contextualiza
    announcements o|..o{ calendarEvents : contextualiza
    syntheticProfiles ||--o{ profileCourses : cursa
    courses ||--o{ profileCourses : asocia
    syntheticProfiles ||--o{ conversations : inicia
    conversations ||--o{ messages : contiene
    datasetReleases o|..o{ messages : sustentaRespuesta
    messages ||--o{ messageCitations : cita
    datasetReleases ||--o{ messageCitations : fijaOrigen
    documentVersions o|..o{ messageCitations : documenta
    documentChunks o|..o{ messageCitations : localiza
    courses o|..o{ messageCitations : sustentaCurso
    calendarEvents o|..o{ messageCitations : sustentaEvento
    announcements o|..o{ messageCitations : sustentaAnuncio
    syntheticProfiles o|..o{ messageCitations : sustentaPerfil
    profileCourses o|..o{ messageCitations : sustentaProgreso
    courses {
        string datasetReleaseId PK, FK
        string courseKey PK
    }
    announcements {
        string datasetReleaseId PK, FK
        string announcementKey PK
    }
    calendarEvents {
        string datasetReleaseId PK, FK
        string eventKey PK
    }
    syntheticProfiles {
        string datasetReleaseId PK, FK
        string profileKey PK
    }
    profileCourses {
        string datasetReleaseId PK, FK
        string profileKey PK, FK
        string courseKey PK, FK
    }
    conversations {
        string id PK
        string datasetReleaseId FK
        string profileKey FK
    }
    messages {
        string id PK
        string conversationId FK
        string answerDatasetReleaseId FK
    }
    messageCitations {
        string messageId PK, FK
        int citationIndex PK
        string sourceKind
        string datasetReleaseId FK
    }
```

## 4. Reglas de integridad y versionado

1. **Pertenencia sintética:** cada registro fuente depende obligatoriamente de una
   publicación del único dataset sintético. La ingesta es la única vía de escritura de
   corpus; el rol de consulta no puede insertar ni modificarlo. No hay `is_synthetic=false`
   ni `lawful_basis_reference`. Esto evita mezclas estructurales, pero ninguna constraint
   puede determinar si un texto es realmente ficticio: revisión del material, manifiesto
   marcado sintético y validación previa son controles humanos y de proceso indispensables.
2. **Identidad:** `document_key` es estable; `document_version_id` identifica una versión
   procesada exacta. UNIQUE por publicación/documento impide dos versiones competidoras.
3. **Vigencia:** versión normal = versión del documento perteneciente a
   `datasets.current_release_id`, lista. Si falta en la publicación nueva, queda
   retirado de consultas normales; no hay booleano `is_active` ni desactivación en sitio.
   Así V1 y V2 son históricas al activar la publicación que contiene V3. No hay banderas
   `is_current` independientes que puedan contradecirse.
4. **Publicación atómica:** cargar en staging, validar manifiesto completo, relaciones,
   cobertura de un embedding por chunk de documentos `chunked` y documentos completos sin chunks; después
   marcar lista y cambiar el puntero en una transacción que bloquee la fila del dataset.
   La operación de publicación comprueba completitud en la base. FK y CHECK cubren identidad
   y valores; triggers/operaciones restringidas cubren reglas entre tablas y transiciones.
   Evitar una comprobación previa en aplicación seguida de escrituras concurrentes libres.
5. **Inmutabilidad:** impedir UPDATE/DELETE de contenido de publicaciones listas mediante
   permisos y guardas de base de datos, incluidos hijos. Ingesta y publicación deben compartir
   disciplina de bloqueo sobre la publicación para evitar carreras. Reintentos sobre staging
   son idempotentes por claves naturales; una publicación lista no se sobrescribe.
6. **Guías:** única regla estable `documents.retrieval_mode`; `full_document` no admite
   chunks ni embeddings. La validación del manifiesto exige ese modo para toda guía;
   no existe clase/política adicional que pueda contradecirlo.
7. **Aislamiento de consultas:** futura vista/función normal selecciona publicación y modelo
   vigentes, no todas las versiones `ready`. El rol de consulta accede a esa superficie,
   no a tablas históricas sin filtro. Se fija la publicación al iniciar cada petición:
   un cambio concurrente no mezcla embeddings ni resultados. Las lecturas históricas para
   evaluación o apertura de citas son explícitas y separadas de retrieval normal.
8. **Citas:** pertenecen a mensajes asistente y a su publicación de respuesta; chunk y versión
   deben coincidir. Fuente/sección obligatorias; las referencias históricas no se redirigen
   al documento más nuevo. El historial muestra la versión original, sin reutilizarla como
   evidencia vigente para nuevas respuestas.
9. **Relaciones estructuradas:** FK compuestas publicación/clave para cursos, convocatorias,
   eventos, perfiles y asociaciones; no basta validar que exista una clave en cualquier época.
10. **Embeddings:** configuración inmutable y única por release; un vector por chunk,
    igualdad de configuración, dimensión y proceso sin modelo duplicado en el fragmento;
    consultas no nulas, dimensión correcta y norma no cero. Parámetros top-k obligatorios,
    positivos y acotados; distancia opcional finita en rango permitido para coseno.
11. **Borrados:** publicaciones y evidencias citadas se conservan. No se propone un borrado
    automático en cascada que destruya reproducibilidad. La limpieza de staging fallido
    requiere distinguirlo de material publicado o referenciado.
12. **Texto de sesión:** no existe entidad para datos personales ni CoT. El texto libre puede
    contener accidentalmente datos reales; avisos de demostración y validación/minimización
    de entrada deben impedir persistirlos y enviarlos al corpus. El filtro no es garantía
    semántica perfecta; pruebas con personas necesitan su diseño de privacidad independiente.

## 5. Flujo de ingesta

1. El equipo versiona archivos sintéticos y un manifiesto bajo `/data/synthetic`. El
   manifiesto enumera archivos/checksums, claves, categorías, marca sintética y esquema.
   No se generan datos ni manifiestos en esta tarea.
2. N8N o un importador autorizado selecciona una revisión inmutable aprobada. Valida
   esquema, claves, rutas, checksums, marca sintética y ausencia de dependencias externas;
   registra publicación candidata y ejecución. No modifica la fuente de verdad.
3. Importa catálogo, agenda, anuncios y perfiles con referencias de origen. Resuelve todas
   las relaciones dentro de la misma publicación. Registra cada unidad esperada como item.
4. Resuelve identidad documental estable y crea versión por publicación. Extrae contenido
   y localizadores con receta fijada. Las guías se conservan únicamente como archivos completos.
5. Fragmenta solo documentos permitidos; genera embeddings con la configuración elegida
   para esa publicación; registra fecha y ejecución de generación con la configuración
   local aprobada en el ADR 0003.
6. Valida cobertura completa y restricciones. Fallos dejan staging sin reemplazar la versión
   vigente. Reintentos conservan sus resultados separados y no duplican entidades de dominio.
7. Publica atómicamente. Una reconstrucción repite la selección de revisión y receta; los
   IDs de evaluación se resuelven por claves fuente/publicación/ordinal, no por timestamps.

Una publicación completa incrementa almacenamiento y coste de reprocesamiento. Es una
concesión explícita a consistencia y simplicidad del corpus pequeño; delta-sync, reutilización
de chunks y publicación independiente por documento quedan fuera hasta demostrar necesidad.

## 6. Flujos de consulta

- **RAG:** REST → agente → herramienta interna; fijar publicación vigente, generar vector
  de consulta con su configuración, recuperar solo chunks de versiones listas de
  esa release y documentos `chunked`, usando el embedding del propio chunk. Devolver texto y origen exacto para citar. Sin evidencia suficiente,
  registrar respuesta de insuficiencia, no completar con hechos supuestos. Las guías se buscan
  por catálogo/metadatos y se enlazan completas, sin búsqueda vectorial sobre su contenido.
- **Calendario:** filtrar eventos presentes en la publicación vigente por intervalo solicitado;
  resolver curso/convocatoria mediante sus FK de publicación. Eventos pasados pueden
  consultarse si se pide ese intervalo; pasado no equivale a versión documental obsoleta.
- **Cursos y anuncios:** consultar campos estructurados de la publicación vigente; aplicar
  estado y, para anuncios, ventana temporal. Devolver referencia de archivo/registro para cita.
- **Perfil/progreso:** resolver clave del personaje en publicación vigente y consultar
  `profile_courses`; los completados forman el historial académico simulado. No mutarlo desde
  la app ni inferir registros institucionales. Una nueva instantánea procede del dataset.
- **Historial conversacional:** listar conversaciones y mensajes ordenados por ordinal;
  conservar procedencia de cada respuesta y permitir abrir fuentes históricas citadas.
  No devolver prompts internos ni trazas de herramientas como mensajes de usuario.
- **Evaluación:** seleccionar explícitamente una publicación/modelo, exportar ranking y
  evidencias al ejecutor de evaluación. La autorización de evaluación no habilita que la
  ruta normal consulte versiones históricas.

## 7. Comparación histórica con el borrador SQL anterior

Esta sección preserva la revisión que motivó la reescritura, no describe el SQL actual.
El borrador inspeccionado tenía 14 tablas, 6 funciones, 8 triggers y 13 índices explícitos.
Las recomendaciones sobre DDL pendiente se resolvieron posteriormente según el ADR 0003
y la documentación física; no se deben interpretar como decisiones aún abiertas.

### 7.1 Tablas

| Tabla actual | Acción | Motivo y destino |
| --- | --- | --- |
| `sources` | Fusionar | Sustituir catálogo de fuentes externas por dataset/publicación y referencias de archivo en versiones/registros. `website`, `google_sheet`, URI libre y autoridad UNAB predeterminada no pertenecen al nuevo modelo. No se necesita una entidad extra por archivo. |
| `documents` | Modificar | Conservar identidad; sustituir source/external_key por dataset/clave estable. Mover título/formato a versión; usar únicamente retrieval_mode estable en documents, sin class ni política por versión; eliminar is_active, URI libre y metadata abierta. |
| `document_versions` | Modificar | Añadir publicación, origen, ejecución y contenido versionado completo. Unicidad por publicación/documento, no por hash global. No añadir is_active ni política a la versión, descartados de la propuesta previa; inclusión por release. Inmutabilidad real: el comentario actual no la impone. |
| `document_chunks` | Modificar | Mantener propiedad por versión y ordinal; incorporar embedding único, fecha y ejecución de generación; exigir localizador; quitar UNIQUE de hash, metadata y token_count sin consumidor; reforzar páginas e inmutabilidad. |
| `embedding_models` | Modificar | Renombrar a embedding_configs: proveedor/modelo, revisión cuando aplique, dimension, parámetros/preprocesamiento y hash inmutables. Activación por release, sin is_active. UNIQUE proveedor/nombre no distingue configuraciones. |
| `chunk_embeddings` | Fusionar y eliminar como entidad | Integrar embedding, fecha y ejecución en document_chunks. Cada chunk hereda una única configuración de su release; no necesita relación muchos-a-muchos ni embedding_model_id propio. |
| `ingestion_runs` | Modificar | Publicación obligatoria en lugar de source nullable; receta reproducible, errores saneados, estados/fechas consistentes. Derivar contadores, no mantener acumulados independientes. Sin webhook como integración supuesta. |
| `ingestion_items` | Modificar | Identificar unidades documentales y estructuradas del manifiesto; incluir tiempos/motivos; mantener trazabilidad sin SET NULL que borre procedencia. |
| `student_profiles` | Modificar | Renombrar a synthetic_profiles, anclar a publicación y eliminar ruta real: is_synthetic=false, lawful_basis_reference, programa y preferencias sin caso aprobado. Seudonimizado no significa sintético. |
| `conversations` | Modificar | Perfil/publicación obligatorios para demo; sin SET NULL, metadata abierta ni ended_at sin necesidad. |
| `messages` | Modificar | Solo user/assistant, orden estable y publicación efectiva; conservar insufficient_evidence. Eliminar system/tool y metadata que puedan guardar estado interno. |
| `message_citations` | Modificar | Conservar entidad por evidencia visible; añadir release, source_kind y referencias concretas con origen estructurado; validar asistente. Chunk exige versión coincidente, en lugar del XOR que impide almacenar ambos. |
| `retrieval_runs` | Eliminar del MVP funcional | Consulta/vector/top-k persistidos por cada interacción no son necesarios para historial; evaluación controlada exporta artefactos suficientes. |
| `retrieval_results` | Eliminar del MVP funcional | Ranking y etiquetas van al conjunto de evaluación, no a la base conversacional. No perder ese registro al diseñar el evaluador. |

Nuevas entidades justificadas: datasets, dataset_releases, courses, calendar_events,
announcements y profile_courses. Resultado: 16 entidades lógicas, no una implementación.

### 7.2 Funciones

| Función actual | Acción | Evaluación |
| --- | --- | --- |
| `set_updated_at` | Eliminar del modelo propuesto | Los contenidos son inmutables; ejecuciones poseen tiempos explícitos. Un updated_at general no sustituye versionado ni auditoría. |
| `enforce_chunk_vectorization_policy` | Modificar | Comprobar versión, documents.retrieval_mode y estado publicable/inmutable; coordinar bloqueo con publicación. El control actual no protege de escrituras concurrentes sobre la política. |
| `enforce_document_vectorization_policy_change` | Fusionar | Integrar en guarda de retrieval_mode estable e inmutabilidad. No existe política por versión; impedir cambios de modo una vez referenciado el documento. |
| `validate_embedding_dimensions` | Modificar | Trasladar comprobación al embedding de document_chunks contra embedding_configs a través de versión/release; añadir procedencia y norma válida, sin decidir aún DDL físico. |
| `validate_query_embedding_dimensions` | Fusionar | Llevar validación a la operación de búsqueda: no queda tabla de vectores de consulta ni trigger asociado. |
| `search_chunks_cosine` | Modificar | Seleccionar release vigente y su configuración, versión lista, modo chunked y embedding del chunk con origen completo; validar nulos, top-k acotado y vector no cero. La función actual incluye cualquier versión ready y no filtra sources.is_active. `p_match_count=NULL` evita la comprobación <=0 y deja LIMIT sin límite. |

La búsqueda exacta inicial puede conservarse como estrategia, no como implementación aprobada.
Faltan operaciones/guardas de publicación e inmutabilidad, con acceso histórico separado.

### 7.3 Triggers

| Trigger actual | Acción | Evaluación |
| --- | --- | --- |
| `document_chunks_enforce_vectorization_policy` | Modificar | Aplicar reglas de versión, retrieval_mode e inmutabilidad; proteger también cambios/borrados de contenido publicado. |
| `documents_enforce_vectorization_policy_change` | Fusionar | Sustituir por guarda del modo estable documents.retrieval_mode; no introducir política por versión. |
| `chunk_embeddings_validate_dimensions` | Fusionar | Eliminar trigger sobre la tabla retirada; trasladar su responsabilidad a document_chunks, incluyendo generación y configuración heredada. DDL concreto posterior. |
| `retrieval_runs_validate_dimensions` | Eliminar | Se elimina tabla; consulta se valida en frontera de búsqueda. |
| `sources_set_updated_at` | Eliminar | sources se fusiona; no destino mutable equivalente. |
| `documents_set_updated_at` | Eliminar | Identidad estable, metadatos publicados en versiones, sin updated_at genérico. |
| `document_versions_set_updated_at` | Eliminar | Guardas de inmutabilidad y tiempos explícitos de ingesta/publicación reemplazan sello mutable. |
| `student_profiles_set_updated_at` | Eliminar | Perfil pertenece a una instantánea inmutable; cambios generan nueva publicación. |

### 7.4 Índices explícitos

| Índice actual | Acción | Evaluación |
| --- | --- | --- |
| `documents_source_id_idx` | Eliminar | Redundante con prefijo de UNIQUE(source_id, external_key) actual; source desaparece. |
| `document_versions_document_id_idx` | Modificar | Hoy redundante con UNIQUE(document_id, content_sha256). Al cambiar unicidad a publicación/documento, conservar acceso por document_id para historial, revisando orden de columnas. |
| `document_versions_status_idx` | Eliminar inicialmente | Estado aislado no responde al filtro principal por publicación vigente; reconsiderar solo con planes/volumen. |
| `document_chunks_version_id_idx` | Eliminar | Cubierto por UNIQUE(document_version_id, chunk_index). |
| `chunk_embeddings_model_id_idx` | Eliminar | Desaparece tabla y FK por chunk; configuración se resuelve por release. No se sustituye por un índice multiespacio. |
| `ingestion_runs_source_started_idx` | Modificar | Cambiar source por publicación manteniendo acceso a intentos por fecha. |
| `ingestion_items_version_id_idx` | Conservar | Seguimiento documental y comprobación de referencias; no cubierto por clave del item. |
| `conversations_student_started_idx` | Modificar | Ajustar a publicación/perfil sintético/inicio para historial de demo. |
| `messages_conversation_created_idx` | Modificar | Usar UNIQUE(conversation_id, ordinal) para orden determinista; no mantener ambos sin evidencia. |
| `message_citations_chunk_id_idx` | Conservar | Comprobación y navegación de evidencias; no cubierto por PK(message_id, índice). |
| `message_citations_version_id_idx` | Conservar | Evidencias de documento completo y protección del historial. |
| `retrieval_runs_message_id_idx` | Eliminar | Desaparece tabla. |
| `retrieval_results_chunk_id_idx` | Eliminar | Desaparece tabla. |

Las PK y UNIQUE siguen necesarias para identidad; las unicidades que cambian se detallan
en entidades: documents(dataset, clave), document_versions(publicación, documento),
embedding_configs(configuración exacta), registros estructurados(publicación, clave),
messages(conversación, ordinal). Se elimina UNIQUE de contenido por chunk y se conserva
el de posición. La futura migración deberá cubrir FK nuevas y el acceso de calendario por
publicación/inicio; no crear índices para cada columna por anticipación. No hay índice ANN
actual que conservar: HNSW/IVFFlat no son requisitos de este diseño.

### 7.5 Tipos, extensiones y otros objetos

- No existen ENUM ni tipos propios. Los vocabularios actuales son TEXT + CHECK; modificar
  sus listas según las entidades propuestas. No se añade un ENUM global prematuramente.
- `vector`: conservar como extensión en la misma instancia y schema lógico. El tipo físico
  y su dimensión se decidirán tras seleccionar modelo; no se prescribe dimensión variable.
- `pgcrypto`: decisión pendiente de necesidad técnica al redactar SQL. El borrador solo
  lo declara y usa generación de UUID; validar versión objetivo de PostgreSQL y funciones
  efectivamente necesarias antes de conservar una extensión por inercia.
- Schema `banuchat`: conservar, corrigiendo en la futura migración el comentario que lo
  presenta como corpus institucional real. BEGIN/COMMIT se conservan como atomicidad de DDL.
- URI canónica libre, autoridad institucional por defecto, formatos de fuente remota,
  metadata ilimitada y lawful_basis_reference son riesgos de alcance. Formato de archivo
  no debe confundirse con autorización para descargarlo de un sitio.
- `source_updated_at`, idioma fijo, tamaño de archivo y detalles de error duplicados en
  versión no aportan al mínimo: checksums/manifiesto y items cubren el caso. Solo incorporar
  bytes/idioma después si una validación o interfaz concreta los necesita.
- Faltan integridad de publicación vigente, inmutabilidad efectiva, localizadores obligatorios,
  citas solo de asistente, relación entre ejecución y derivado, integridad temporal de estados,
  y protección del catálogo de modelos. ON DELETE CASCADE/SET NULL actuales pueden destruir
  trazabilidad; revisar cada FK conforme a las reglas de conservación propuestas.

## 8. Decisiones pendientes y concreción física

Ya están aprobados: publicaciones completas, inmutabilidad, activación atómica por puntero
único, conservación histórica, una configuración por release, embedding integrado al chunk,
regla documental única y trazas de evaluación fuera del modelo operacional. No se reabren
esas decisiones. Véase [ADR 0002](adr/0002-publicaciones-sinteticas-inmutables.md).

El SQL autorizado concreta PostgreSQL 16, embeddings locales de 1024 dimensiones,
FK compuestas, publicación protegida e inmutabilidad. El manifiesto procesado se copia
como JSONB dentro de la release para comprobar completitud sin una entidad adicional.
La receta/hash efectivo del modelo se registra en ingesta. El contrato de manifiesto,
hashes y orden de reintentos se documenta en [infra/db](../infra/db/README.md).

La migración inicial y la suite A–K ya fueron ejecutadas en PostgreSQL local desechable;
véanse [evidencia y límites](../infra/db/tests/README.md). Esto no demuestra permisos
runtime, concurrencia avanzada, ingesta, backend ni aplicación implementados o validados.

1. Registrar revisión/digest y parámetros efectivos del modelo cuando se autorice la ingesta.
2. Definir retención/eliminación del historial de demo y protección del texto libre antes
   de persistir sesiones de participantes. Sus datos de usabilidad no pertenecen al corpus.
3. Fijar versión/digest reproducible de la imagen pgvector y aprovisionar roles/credenciales
   para las siguientes ejecuciones. PostgreSQL 16 proporciona UUID/SHA-256 sin pgcrypto.
4. Implementar y probar roles mínimos, permisos runtime, concurrencia avanzada y
   reintentos de ingesta en tareas posteriores autorizadas; la migración y A–K ya fueron ejecutadas.

Modelo de generación, autenticación local y notificaciones siguen abiertos según AGENTS.md,
pero no exigen nuevas entidades en este esquema. Ninguno se implementa en esta tarea.

## 9. Validación de diseño y límites de esta entrega

| Criterio | Resultado de revisión documental |
| --- | --- |
| Sin recursos reales institucionales | Todas las fuentes propuestas son archivos sintéticos locales versionados; no conectores externos. |
| Sin fuente de hojas remotas ni scraping | No existen en entidades/flujo propuestos; menciones anteriores solo identifican defectos del SQL heredado. |
| Una sola base | Relacional y vectorial comparten PostgreSQL + pgvector. |
| Entidades justificadas | Las 16 entidades tienen escenario y restricciones en sección 2. |
| Embedding único | Un embedding vector(1024) por chunk y una configuración Ollama/Qwen3 aprobada por release. |
| Política documental | Únicamente documents.retrieval_mode; sin is_active documental ni política contradictoria por versión. |
| Retrieval vigente | Puntero único + unicidad documento/publicación + superficie de consulta restringida; histórico explícito. |
| Sin CoT | Solo mensajes visibles user/assistant; sin tabla de razonamiento ni payloads internos. |
| Reproducibilidad | Revisión, manifiesto, claves, receta, configuración de embeddings y procedencia; límites bit a bit declarados. |
| SQL y ejecución | Migración inicial y suite A–K ejecutadas en PostgreSQL local desechable; no acreditan todavía permisos runtime, concurrencia avanzada, ingesta, backend ni aplicación. |

OE1 queda respaldado por origen/citas y propuesta de artefactos de evaluación; no se afirma
alcanzar sus umbrales sin ejecutar evaluaciones futuras. OE2/OE4 disponen de tiempos e items;
sus latencias/tasas tampoco se han medido. Los diagramas se revisan textualmente: no se instala
un renderizador ni se afirma validación visual automática. El modelo incorpora decisiones aprobadas;
siguen pendientes roles mínimos, concurrencia avanzada e implementación funcional, sin
presentar nuevamente la migración y la suite A–K como pruebas no ejecutadas.
