# Base de datos de BanuChat

Estado: migración inicial ejecutada en PostgreSQL local desechable; suite de integración
A–K disponible en [tests](tests/README.md). No implica validación de aplicaciones ni de roles runtime.
Destino: base vacía PostgreSQL 16 + extensión pgvector en el esquema public.
Una sola instancia almacena relaciones y vectores; corpus exclusivamente sintético.

## Alcance y decisiones

- Fuente de verdad: archivos y manifiesto versionados bajo /data/synthetic.
- 16 tablas; releases completas inmutables, activación atómica y conservación histórica.
- Embeddings: Ollama local, qwen3-embedding:0.6b, 1024 dimensiones, coseno.
  ADR 0003 dejó abierto el generador en su contexto histórico; actualmente
  Document RAG usa `qwen3:4b-instruct` mediante Ollama en `backend/api`.
  Véase [ADR 0003](../../docs/adr/0003-embedding-local-qwen3.md).
- Columna document_chunks.embedding: vector(1024), un vector por chunk.
  Sin índices aproximados ni varias dimensiones operacionales.
- PostgreSQL 16 incorpora gen_random_uuid() y sha256(bytea): no se requiere pgcrypto.
  Referencias: [UUID](https://www.postgresql.org/docs/16/functions-uuid.html),
  [SHA-256](https://www.postgresql.org/docs/16/functions-binarystring.html),
  [vector y coseno](https://github.com/pgvector/pgvector#reference).
- La migración crea estructura, funciones y restricciones, no datasets, perfiles ni
  registros de configuración ficticios. No se crea un seed de embeddings.
- La ingesta implementada registra la configuración real: revisión/digest local, versión
  de Ollama, parámetros e instrucciones/preprocesamiento efectivos. Los DEFAULT conservan
  Ollama/Qwen como opción inicial; proveedor, modelo y revisión solo deben ser no vacíos.
  Los CHECK mantienen dimensión 1024 y métrica cosine. Otra identidad de modelo compatible
  no exige migración; requiere una configuración nueva y otra release.
  PostgreSQL deriva config_sha256 al insertar: la ingesta no calcula ni suministra el hash.

Al aprobar la reescritura del esquema, el proyecto confirmó que no existía base
productiva ni datos que migrar. No debe aplicarse sobre una instalación previa:
actualmente sí hay evidencia de bases locales con releases sintéticas publicadas.
El schema se crea
sin IF NOT EXISTS para fallar frente a una instalación previa en lugar de mezclar diseños.
El Compose declara PostgreSQL/pgvector y N8N, y no aplica SQL automáticamente.
Las validaciones SQL aquí descritas corresponden a PostgreSQL desechable.

## Inventario físico

| Área | Tablas |
| --- | --- |
| Publicación | datasets, dataset_releases, embedding_configs |
| Documentos | documents, document_versions, document_chunks |
| Ingesta | ingestion_runs, ingestion_items |
| Catálogo sintético | courses, announcements, calendar_events |
| Perfil/progreso | synthetic_profiles, profile_courses |
| Historial visible | conversations, messages, message_citations |

Los dominios nonblank, stable_key, sha256_hex, source_path, source_kind y finite_time
concentran validaciones de valores; no añaden entidades. Las claves fuente son estables,
minúsculas ASCII con números, guion y guion bajo (1–128 caracteres). Las rutas son relativas,
con separador /, bajo las cinco categorías aprobadas; se rechazan rutas absolutas,
traversal, separadores alternativos, escapes y esquemas de red. El lector de archivos
también debe comprobar resolución real/symlinks dentro de la raíz: SQL no lee el disco.

### Funciones

| Función | Responsabilidad |
| --- | --- |
| text_sha256, jsonb_sha256 | Hashes reproducibles de texto UTF-8 y JSONB canónico |
| validate_manifest | Forma, marca sintética, claves únicas y hashes coherentes por archivo |
| release_records | Unión interna de procedencia de las seis clases de registros |
| guard_corpus_write | Bloqueo de release y escritura exclusivamente en staging |
| reject_mutation | Rechazo de cambios/borrados de documentos y configuraciones |
| validate_embedding_config | Cálculo automático del hash de receta y validación estructural de parameters |
| validate_chunk | Modo chunked y procedencia temporal de generación |
| validate_ingestion | Ciclo de intentos/items y correspondencia con manifiesto |
| assert_release_complete | Correspondencia exacta manifiesto/corpus, cobertura y éxito |
| guard_release | Transiciones, identidad/receta fija y validación antes de ready |
| guard_dataset_pointer | Release lista y perteneciente al dataset del puntero |
| publish_release | Validar y activar conjuntamente; también activar una release histórica lista |
| validate_session_release | Sesiones/respuestas referencian publicaciones listas |
| validate_citation | Ruta, localizador y checksum exactos del registro histórico |
| current_retrieval_context | Obtener configuración de la release vigente antes de vectorizar consulta |
| search_chunks_cosine | Búsqueda exacta limitada a la release vigente |

Son 17 funciones. release_records es un helper interno de validación, no una API pública
que permita elegir una release histórica para retrieval.

### Triggers

Son 20 instancias de triggers, reutilizando funciones y nombres por tabla:

- a_guard_corpus: las nueve tablas dependientes de una release
  (ingestion_runs, ingestion_items, document_versions, document_chunks, courses,
  announcements, calendar_events, synthetic_profiles y profile_courses).
- immutable_row: documents y embedding_configs.
- config_insert: embedding_configs.
- b_chunk_content: document_chunks.
- b_ingestion_state: ingestion_runs e ingestion_items.
- release_state: dataset_releases.
- dataset_pointer: datasets.
- session_release: conversations y messages.
- citation_source: message_citations.

No hay triggers no_truncate. La protección contra TRUNCATE corresponde a los permisos
futuros de runtime/ingesta, que no recibirán ese privilegio ni propiedad del schema/tablas.

Las identidades documentales y configuraciones se conservan inmutables desde su inserción;
es una guarda más sencilla y fuerte que permitir cambios hasta su primera referencia.
El historial conversacional no pertenece al corpus inmutable. Borrar una conversación
elimina sus mensajes; borrar un mensaje elimina sus citas mediante ON DELETE CASCADE.
Esas son las únicas dos cascadas de borrado. No hay cascadas desde historial hacia corpus:
releases, documentos, chunks y registros fuente permanecen intactos.

Las guardas de sesión/cita siguen siendo BEFORE INSERT. Sin los triggers immutable_row,
un usuario con UPDATE podría modificar localizadores o referencias sin repetir esas
validaciones. No se amplían funciones/triggers en esta simplificación: el futuro escritor
de sesiones tendrá INSERT/DELETE y lectura necesaria, no UPDATE por defecto. Habilitar
ediciones de historial requeriría revisar esas validaciones expresamente.

## Ingesta y publicación: contrato físico

1. Registrar el dataset único (id=1) y la configuración efectiva de embeddings.
2. Crear release en staging con revisión Git, versión del esquema de datos, manifiesto y
   receta de procesamiento. La receta/manifiesto no cambian después de crear la candidata.
3. Abrir ingestion_run con attempt_no positivo, único por release y creciente según los
   reintentos. Es un orden explícito; no se deduce el último intento a partir de fechas.
4. Cargar registros y versiones; generar chunks solo para documents.retrieval_mode=chunked.
   En staging un chunk puede esperar embedding, pero vector/fecha/ejecución se completan
   juntos. Las guías se clasifican full_document en la fuente revisada.
5. Registrar cada item del manifiesto, cerrar sus resultados y luego el intento.
   Items terminales e intentos terminados no se sobrescriben: usar un nuevo intento.
   skipped requiere una representación existente; la publicación vuelve a verificarla.
6. Invocar publish_release dentro de una transacción corta; READ COMMITTED es el default
   esperado, no una condición impuesta por el DDL. La operación
   bloquea dataset/release, valida completitud, marca ready y cambia el único puntero.
   Si falla, la publicación anterior queda vigente y se revierte toda la operación.
7. Una release ready no admite altas, cambios, bajas ni alteraciones de receta.
   Si una candidata está failed, se reabre como staging para reintentar la misma receta;
   cambiar fuente/configuración exige otra candidata.

La guarda de ready también valida una actualización directa del estado, y la guarda del
puntero impide activaciones incorrectas aunque no se use publish_release. Una release puede
quedar lista pero no vigente; no entra en búsqueda hasta activar el puntero.

El bloqueo de la fila de release se comparte por toda escritura y publicación y se conserva
sin cambios. No se rechazan niveles de aislamiento: PostgreSQL gestiona sus snapshots y
conflictos. El llamador debe manejar deadlocks y fallos de serialización reintentando la
transacción completa. READ COMMITTED es el comportamiento esperado/default.

Riesgo identificado, no corregido mediante cambios semánticos fuera de alcance: en
REPEATABLE READ, una publicación puede conservar un snapshot anterior a cambios de hijos.
Si la ingesta solo bloqueó la fila padre, sin actualizarla, esperar ese bloqueo no obliga
por sí solo a refrescar el snapshot ni a provocar un error de serialización. Por tanto,
no se acredita completitud bajo toda concurrencia en ese nivel; debe probarse y revisarse
antes de adoptarlo. Referencia: [aislamiento en PostgreSQL 16](https://www.postgresql.org/docs/16/transaction-iso.html).
Esta es una observación estática, no un resultado de pruebas ejecutadas.

### Manifiesto y completitud sin otra tabla

dataset_releases.manifest guarda una copia JSONB de la especificación fuente aprobada,
no un dataset generado por la BD. Contiene synthetic=true y un array items no vacío.

Cada item declara strings kind, key, path, locator y sha256; un documento además declara
retrieval_mode. Los kinds son document, course, calendar_event, announcement, profile
y profile_course. Las claves coinciden con las claves de entidad; para profile_course
se usa profile_key/course_key (ninguna clave individual admite /). Un mismo path debe
tener el mismo checksum en todos sus registros. El manifiesto debe estar versionado.

La publicación compara en ambos sentidos esas unidades contra los registros cargados:
rechaza faltantes, extras, cambios de ruta/localizador/hash/modo y resultados no procesados.
El último item por clave, ordenado por attempt_no, debe pertenecer a un intento succeeded.
Todo documento debe estar ready, todo documento chunked debe tener chunks y todos sus
chunks deben tener vector y ejecución válida. Las ejecuciones referenciadas deben haber
terminado con éxito, con marcas temporales consistentes.

Los hashes de manifest/pipeline se calculan sobre JSONB::text convertido a UTF-8 en
PostgreSQL 16. No equivalen al hash de los bytes del archivo original ni garantizan el
mismo serializado en otro motor. source_sha256 sí corresponde a los bytes del archivo
fuente. El trigger BEFORE INSERT deriva config_sha256 usando jsonb_sha256 del objeto
canónico de claves provider, model, revision, dimension, metric y parameters. El llamador
omite la columna; un hash explícito válido también se reemplaza por el derivado. Se mantienen
NOT NULL y UNIQUE. La configuración queda inmutable tras insertar; el hash de chunk
continúa calculándose en la BD.

parameters debe contener query y document (objetos) y runtime_version (string no vacío).
La ingesta debe explicitar opciones efectivas, truncamiento y preprocesamiento, incluso
cuando sean los valores por defecto; no guardar tokens, contraseñas o endpoints.

La BD no puede demostrar que los bytes existen en Git, que el contenido es ficticio,
que el hash suministrado refleja el archivo o que un vector fue generado realmente por
ese modelo. La ingesta controlada debe verificar esas condiciones, las guías y los
localizadores contra archivos antes de publicar. El hash de contenido documental
corresponde al texto extraído; para un archivo completo sin extracción se usa el del archivo.
Esta frontera está documentada, no sustituida por un booleano de perfil.

## Integridad de referencias y evidencia

- FK compuestas conservan dataset/release/documento y release/ejecución, y evitan cruces
  en eventos, perfiles, progreso y citas.
- Unicidad de documento por release y ordinal por versión; no unicidad de hash textual,
  pues distintas posiciones pueden repetir texto.
- Modo documental único en documents; full_document nunca admite chunks.
- Los registros fuente se retiran omitiéndolos de otra release, no con is_active.
- Calendar y anuncios tienen ventanas temporales; progreso combina estado/porcentaje/fechas.
- Mensajes solo user/assistant. La combinación de CHECK y FK compuesta permite citas
  únicamente de assistant y de la release exacta de la respuesta.
- source_kind controla referencias concretas, no una supertabla ni un source_id genérico.
  Una cita de chunk también referencia su versión; su localizador es el del chunk.
  Las restantes citas usan el localizador del registro completo. No se redirige historia.
- Los roles, tipos y campos no permiten mensajes internos del agente. El contenido libre
  aún necesita minimización y controles de entrada; SQL no clasifica semánticamente texto.

## Retrieval exacto

Firma declarada: search_chunks_cosine(query vector(1024), top_k integer,
expected_release_id uuid). Devuelve como máximo 50 resultados; top_k admite 1–50,
rechaza NULL y vectores nulos, cero o de otra dimensión. PostgreSQL no conserva typmods
de parámetros de función, por eso también se comprueba vector_dims explícitamente.

Flujo: obtener current_retrieval_context, generar consulta con esa receta local y llamar
a búsqueda con el ID observado. Si la release cambia antes de la búsqueda, se rechaza:
refrescar contexto y regenerar consulta. expected_release_id es una precondición, no
un selector histórico. No puede verificarse por SQL qué modelo generó el vector recibido.

La función es STABLE y usa el snapshot visible; fija la release vigente en ese snapshot
sin cambiar su lógica. En el default READ COMMITTED corresponde a la sentencia; en niveles
superiores puede ser el de la transacción. No se rechaza el nivel elegido. Un snapshot
antiguo puede ver un puntero anterior: no se garantiza frescura de reloj real en ese caso.

Resultado: ID y clave reproducible del chunk, ordinal, texto, distancia/similitud coseno,
release/configuración, documento/versión/título, origen/hash/localizador/páginas y hashes
de receta/manifiesto. La clave estable se deriva de revisión Git, hashes de manifest,
pipeline/configuración, clave documental y ordinal; no de un UUID regenerado. Desempate
por clave documental/ordinal. Sin índice aproximado: búsqueda exacta sobre el corpus vigente.

## Roles y permisos diferidos a infraestructura

La migración no crea roles de cluster ni credenciales. Revoca permisos de PUBLIC sobre
schema/tablas/funciones y EXECUTE por defecto para futuras funciones del propietario.

- **Consulta:** USAGE en schema y EXECUTE únicamente en current_retrieval_context y
  search_chunks_cosine. Ambas son SECURITY DEFINER de solo lectura, con search_path
  fijo, sin SQL dinámico. No conceder SELECT general sobre tablas de corpus histórico,
  DML, TRUNCATE, propiedad del schema, CREATE ni ejecución de helpers.
- **Ingesta:** permisos explícitos de lectura/escritura sobre candidatas, uso de dominios,
  helpers y publish_release. No conceder TRUNCATE, propiedad ni capacidad de deshabilitar
  triggers; no usar GRANT ALL como atajo. La protección contra TRUNCATE depende de estos permisos.
  No se usa para sesiones de la app.
- **Escritor de sesiones:** futuro rol restringido a INSERT/DELETE y lectura necesaria de
  conversaciones, mensajes y citas; sin UPDATE por defecto ni escritura de corpus.
  El borrado usa las dos cascadas de historial, no TRUNCATE.
- **Evaluación/archivo:** acceso histórico explícito y separado; no concederlo al rol normal.

Los accesos estructurados y de historial ya existen en el backend con SQL explícito;
su endurecimiento mediante roles/superficies de lectura controladas sigue pendiente.
Esta migración no crea endpoints ni contratos. El propietario de migración es
una cuenta administrativa confiable, no runtime. No se pretende proteger de un superusuario
que elimine tablas o deshabilite las reglas.

## Índices no implícitos

| Índice | Caso de uso |
| --- | --- |
| document_versions_document_idx | Historia por identidad documental entre releases |
| document_versions_run_idx | Rastrear versiones producidas por un intento |
| document_chunks_generation_idx | Rastrear fragmentos por ejecución de generación |
| ingestion_items_release_idx | Resolver el último resultado por unidad al publicar |
| calendar_events_release_start_idx | Agenda de la release por inicio/intervalo |
| conversations_profile_started_idx | Historial de un personaje entre releases, por fecha e ID |
| message_citations_version_idx | Consultar evidencia asociada a una versión histórica |
| message_citations_chunk_idx | Localizar citas de un fragmento; parcial para no nulos |

PK/UNIQUE ya cubren catálogo por release/clave, versiones por release/documento, chunks
por versión/ordinal y mensajes por conversación/ordinal. No se duplican con índices
individuales de cada FK. Planes, selectividad y latencia se medirán después.

## Validación y límites

Además de la revisión estática, se ejecutaron la migración y pruebas SQL A–K en PostgreSQL
16.15 + pgvector 0.8.6. El catálogo confirmó 16 tablas, 17 funciones, 20 triggers propios,
vector(1024), ausencia de pgcrypto y de índices ANN. La primera aplicación reprodujo
un delimitador inválido en text_sha256 (`$` en lugar de `$$`); se corrigió únicamente
esa sintaxis. Véanse [reproducción, evidencia y límites](tests/README.md).

Resultado de la comprobación estructural local: 16 tablas, 31 FK con destinos/columnas
y claves únicas compatibles, 17 funciones, 20 triggers con destinos existentes y 8
índices explícitos. Se comprobó cobertura de guardas y delimitadores; esto no reemplaza
un parser PostgreSQL ni las pruebas de ejecución/concurrencia.

La suite cubre aplicación sobre base nueva, rollback ante errores, cruces de release,
citas incompatibles/user, guía con chunks, mutación de corpus publicado, cascada de historial
sin afectar corpus, hash automático, parámetros NULL/dimensión/cero/top-k, completitud y
cambio de release. Usa READ COMMITTED y revierte todos sus fixtures sintéticos al terminar.
Siguen pendientes reintentos avanzados, concurrencia entre sesiones y permisos con roles
no propietarios (incluido TRUNCATE). No se acreditan métricas OE1/OE2/OE4/OE6.

Las ejecuciones de ingesta ya registraron revisión/digest y receta efectivos de
Ollama; véase [N3](../../eval/ingestion/results/n3-n8n-e2e-2026-10-02.md). Esto no
supone que una base nueva venga configurada. Siguen pendientes fijar versión/digest
de la imagen pgvector para futuras ejecuciones (digest observado registrado en
tests), aprovisionar roles mínimos y definir retención/privacidad de sesiones.
Autenticación de usuario final y push siguen pendientes; el generador ya está
implementado en la API. No se modifica SQL en esta actualización documental.
