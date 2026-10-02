# Ingesta reproducible del dataset sintético

Estado: diseño vigente; core de ingesta, transporte HTTP interno y
composición/startup operacional implementados. El startup y `/status` se validaron
localmente; no se ejecutó ingesta. Workflow N8N, `/execute` desde N8N y E2E orquestada
siguen pendientes. Fecha del diseño original: 2026-09-26.
Véanse [ADR 0005](adr/0005-ingesta-reproducible-n8n.md),
[contrato físico](../infra/db/README.md) y [plan de pruebas](../eval/ingestion/plan.md).

### Estado de implementación

Están implementados preflight, carga de 64 registros estructurados del dataset v1
(12 cursos, 8 anuncios, 4 perfiles sintéticos, 22 eventos y 18 asociaciones),
documentos/chunking, embeddings, publicación atómica, recovery/retry, Approval
Registry y loader local seguro, verificaciones approval↔source y procedencia del
runtime checkout, servicio `execute`/`retry`/`recover`/`status`, observación del
WriterLease, transporte HTTP interno, Bearer service token y parser de configuración
operacional. `backend/rag/src/main.ts` compone estos elementos y el servicio se validó
localmente mediante build/start y consultas `/status`; véase el [registro N0](../eval/ingestion/results/n0-local-operational-preparation-2026-10-02.md).
No existe todavía workflow N8N ejecutable/versionado ni consumo de `/execute` por N8N.

Las evidencias no se deben mezclar como una sola ejecución: la E2E real de
Implementación 3 usó PostgreSQL 16.15, pgvector 0.8.6, Ollama 0.34.4 y
`qwen3-embedding:0.6b`; procesó 76 items y publicó 12 versiones ready, 60 chunks y
60 embeddings reales, seguida de `already_current`. Su `implementation_revision`
era TEST/sintética y no acreditó procedencia operacional automática. Recovery/retry
se validó después con PostgreSQL real y embeddings TEST_ONLY. Además existen pruebas
unitarias y pruebas PostgreSQL con fixtures; cada resultado conserva su alcance.

## 1. Base inspeccionada y alcance

Se contrastaron AGENTS, arquitectura, modelo lógico, ADR 0002/0003, SQL completo,
README de base y de tests, README/manifest sintéticos, README RAG/N8N y Compose.
La auditoría documental corresponde a la revisión
`4882806e657783f5e0dd5eed1a194074023823eb`; no declara ese SHA como aprobación operativa
de una ingesta futura. El estado inicial de trabajo estaba limpio. Esa es la revisión
de la auditoría original, no la fuente congelada: para v1, `source_git_revision` es
`af7ac711e1da3426e1f5fbe8b2892cec1344ce8b`, según la aprobación del proyecto.

V1: 18 archivos funcionales, 76 items: 12 documentos (10 chunked, 2 full_document),
12 cursos, 22 eventos, 8 anuncios, 4 perfiles y 18 asociaciones de progreso.
Solo `/data/synthetic` es fuente de verdad; PostgreSQL almacena derivados.
No fuentes institucionales, scraping, Google Sheets ni generación de hechos por N8N.
Calendario es parte de la release completa, no un flujo de sincronización separado.

## 2. Fronteras e invocación interna: diseño aceptado para implementación

| Responsable | Qué hace | Qué no hace |
| --- | --- | --- |
| Equipo | Revisa, aprueba y deja checkout local identificable | No presenta aprobación como publicación SQL o calidad medida |
| N8N | Trigger, entrada de control, llamada, consulta de resultado, retry explícito, resumen | No parser, chunking, relaciones, embeddings, SQL ni publicación |
| TypeScript en backend/rag | Preflight, receta, adaptadores Ollama/PostgreSQL, estados, consistencia y errores | No modifica fuentes ni inventa hechos |
| PostgreSQL | Identidad, hashes canónicos, FK, estados, inmutabilidad y completitud/publicación | No comprueba Git, filesystem, ficción ni autoría real del vector |

El diseño aceptado define un adaptador HTTP **privado**, separado del REST público
y MCP. Cada request es un objeto cerrado: los campos no documentados se rechazan.
La frontera refleja las operaciones explícitas del core y no reimplementa en HTTP
su lógica de negocio.

### `POST /internal/ingestion/execute`

Inicia exclusivamente una ingesta nueva y delega en
`ingestApprovedCandidate(...)`. Su entrada conceptual mínima contiene:

- `approval_ref`;
- `source_git_revision` completo;
- `pipeline_version`;
- `workflow_ref`.

No acepta `trigger_type` ni `retry_run_id`.

### `POST /internal/ingestion/retry`

Solicita el retry explícito de una release fallida y delega en
`retryFailedCandidate(...)`; la capa HTTP no implementa el retry. Su entrada
conceptual mínima contiene:

- `approval_ref`;
- `release_id`;
- `source_git_revision` completo;
- `pipeline_version`;
- `workflow_ref`.

La release y los selectores deben corresponder a la misma identidad reproducible.
Una identidad incompatible o un estado que no admite retry se rechaza con HTTP
`409`; no se crea una identidad nueva para acomodar la solicitud.

### `POST /internal/ingestion/recover`

Recupera explícitamente un intento abandonado y delega en
`recoverOrphanedAttempt(...)`. Su entrada contiene:

- `release_id`;
- `run_id`;
- `workflow_ref`.

No acepta timeout, edad, `started_before` ni criterios automáticos para decidir
qué intento recuperar. Recovery cierra de forma explícita el intento abandonado;
no inicia ni implica retry.

### `POST /internal/ingestion/status`

Es una operación de solo lectura para reconciliar el estado, especialmente después
de una respuesta HTTP perdida. Admite únicamente IDs o selectores cerrados: un
`run_id`, un `release_id` o el **selector de identidad de control** formado por
`approval_ref`, `source_git_revision` y `pipeline_version`; `workflow_ref` puede acompañar la
consulta como correlación cuando corresponda. No activa ingesta, recovery ni retry,
y no necesita Ollama para leer estado ya guardado. `not_started` solo es válido
después de resolver la identidad reproducible; no puede inferirse únicamente de
`approval_ref`.

El selector de identidad de control puede resolver cero releases (`not_started`),
una release (se informa su estado) o más de una (`ambiguous_identity`). Nunca se
elige una release arbitrariamente. `recovery_required` solo se informa para un run
`running` cuando se observa la ausencia de su WriterLease en la base actual; no usa
edad ni timeout y no ejecuta recovery automáticamente.

El servidor resuelve desde configuración controlada las raíces separadas del
runtime/código y del checkout fuente, `implementation_revision`, PostgreSQL,
Ollama y la receta efectiva del pipeline. Antes de leer el manifest verifica que
la revisión inmutable resuelta del checkout coincida exactamente con
`source_git_revision`. `workflow_ref` debe coincidir con la definición desplegada,
no aceptarse como afirmación libre.

Ninguno de los cuatro endpoints acepta desde N8N paths, URLs, manifest, SQL,
comandos, modelos arbitrarios ni connection strings.

Las operaciones exitosas y las consultas de estado responden HTTP `200`. El cuerpo
incluye `outcome` y, cuando existan, `release_id`, `run_id`, `attempt_no`,
`workflow_ref`, revisiones, hashes/configuración efectiva y conteos derivados por
estado. `/status` distingue como mínimo:

- `not_started`;
- `running`;
- `failed`;
- `succeeded`;
- `already_current`;
- `already_ready_not_current`.

Además informa `recovery_required` cuando un intento requiere recuperación
explícita. La respuesta de `/recover` refleja el estado operacional cerrado por
recovery; no lo presenta como nueva ejecución ni como retry.

Los rechazos usan HTTP `400` para entrada inválida, `409` para conflicto de
identidad o estado, `503` para dependencia no disponible y `500` para un error
inesperado. El cuerpo técnico saneado expone únicamente `error_code`, `retryable`,
`release_id` nullable, `run_id` nullable y la correlación o `workflow_ref` cuando
corresponda; nunca stack, SQL, secretos, payloads privados ni paths. No se extiende
el schema de errores del REST público.

El POST de ejecución sigue siendo síncrono para este corpus pequeño. No se
introducen `202`, polling automático, cola, scheduler, retry automático ni timeout
para declarar intentos huérfanos. Una desconexión HTTP no cancela una ingesta en
curso. Ante una respuesta perdida, el consumidor consulta `/status` antes de
considerar `/retry`; nunca hace retry ciego.

Despliegue futuro: listener solo en red local privada entre N8N y componente, sin
puerto público ni proxy hacia mobile. Los cuatro endpoints requieren
`Authorization: Bearer <service-token>`. El token se configura fuera de Git, exige
al menos 32 caracteres y ningún whitespace, no se loguea y se compara mediante
SHA-256 + `timingSafeEqual`. La configuración está conectada al startup. Se validó
`/status` autenticado desde Windows y desde el contenedor N8N local; esto no valida
un workflow ni `/execute`. Esta credencial entre servicios no autentica usuarios de la app.
Solo el componente
posee credencial de ingesta y acceso
Ollama. Sin privilegios DDL/TRUNCATE/superusuario ni acceso a historial conversacional.
El runtime ejecuta su propio código/build identificado; lee un source checkout
separado, preparado por el operador como worktree Git o checkout equivalente y
montado/configurado read-only. Ambas raíces son configuración controlada del servidor,
no parámetros HTTP. `/data/synthetic` se resuelve dentro de la raíz fuente, nunca
por defecto dentro del checkout del backend. El listener HTTP, la credencial Bearer y la composición/startup están implementados.
La preparación de source checkout separado y Approval Registry local también se
validaron operacionalmente (registro N0). Siguen pendientes los roles y permisos
mínimos, la solución de montaje read-only para despliegues futuros y la integración
funcional con N8N.

## 3. Aprobación y revisiones Git independientes

| Identidad | Significado | Persistencia |
| --- | --- | --- |
| source_git_revision | Commit exacto del dataset aprobado leído desde la raíz fuente | dataset_releases.git_revision, sin renombrar SQL |
| implementation_revision | Revisión/build real del código TypeScript que ejecuta validación, extracción, chunking, integración Ollama y persistencia/publicación | pipeline_config.implementation_revision |

Para v1, la fuente congelada es `af7ac711e1da3426e1f5fbe8b2892cec1344ce8b`.
El futuro runtime estará en una revisión propia, normalmente posterior: no se exige
igualdad entre las dos identidades ni que un working tree esté en ambas revisiones.
La revisión concreta de v1 no es un default universal para futuros datasets.

La aprobación humana de v1 ya existe; no se vuelve a inferir ni a inventar una firma.
Antes de la primera ejecución, el operador deberá vincularla a un SHA completo
en un registro operativo local de aprobaciones, de solo lectura para el componente,
fuera de `/data/synthetic`. `approval_ref` identifica esa entrada, no una ruta.
Contendrá source_git_revision, dataset_key, SHA-256 de bytes de manifest aprobado,
referencia a la evidencia humana e instante real de disponibilidad.
No vincula automáticamente implementation_revision ni aprueba código o receta.
La autorización de runtime/pipeline y configuración efectiva se mantiene por separado.
No se crea ese registro ahora. Evita incluir en el propio commit su SHA autorreferente.
Los valores se suministran por el operador; N8N no puede escribir la aprobación.
Para otro contenido se exige nueva aprobación. Un SHA distinto no hereda aprobación
solo porque un README conserve la palabra «approved».

Una nueva implementación puede ingerir la misma fuente aprobada sin una nueva
aprobación de contenido. Si cambia solo implementación/pipeline, cambia pipeline_sha256
y puede resultar otra release con el mismo source_git_revision. Si cambia
`/data/synthetic`, se requiere otra aprobación. Un retry de una candidata existente
sigue exigiendo la misma receta efectiva, incluida implementation_revision.

El equipo deja localmente un checkout fuente separado de la raíz runtime. El componente
obtiene HEAD completo **de ese source checkout**, verifica que sea commit identificable
(40 o 64 hex minúsculos) y que HEAD = source_git_revision declarada y aprobada.
Exige checkout fuente limpio: sin cambios staged, unstaged ni archivos untracked;
también detecta cambios funcionales o extras ocultos/ignorados. Compara
bytes con blobs de esa revisión, incluidos manifest, siete schemas y atributos Git.
Por separado verifica que el código ejecutado corresponda a implementation_revision
y que la receta versionada sea la de ese runtime/build. Un checkout de código debe
estar intacto; un build debe tener procedencia verificable a su revisión real.
La limpieza del runtime no demuestra aprobación del dataset ni sustituye los controles
del source checkout. Rechazar filtros o conversiones que hagan
diferir bytes versionados y leídos. No confiar solo en el resultado vacío de Git status.

Sin git checkout, git pull, git fetch, comandos de red Git ni credenciales GitHub en N8N. No se cambia de branch
desde una petición. Se verifica el checkout preseleccionado, no se gestiona colaboración.
Revisión no resoluble, mismatch o manifest postcommit modificado: rechazo antes de DML.

## 4. Preflight, antes de crear/reabrir candidata

TypeScript lee una instantánea verificada en memoria de este pequeño corpus y usa
esos mismos bytes durante el procesamiento; el **source checkout separado** se monta
read-only. Todo el preflight del dataset opera sobre esa raíz, no sobre el checkout
donde corre el backend. La verificación de runtime/receta es independiente. Verifica
nuevamente identidad/bytes antes de publicar; no acepta cambios concurrentes del host.
Esto evita validar un archivo y procesar después otro. Se conservará source_git_revision
con sus artefactos, manifest y schemas para resolver citas históricas, nunca sustituidos
por archivos del runtime o del checkout fuente actual. Conservar por separado el
código/build de implementation_revision y su receta para reproducir los derivados;
actualizar runtime no mueve ni reescribe la fuente histórica.

1. Resolver approval_ref y comprobar HEAD fuente = source_git_revision aprobada,
   limpieza y bytes fuente; verificar runtime/implementation_revision por separado.
   Rechazar discrepancias antes de DML; mapear `banuchat-synthetic` a `datasets.id=1`.
2. Decodificar UTF-8 estricta, sin BOM, LF y salto final; rechazar JSON con claves
   duplicadas, no reserializar antes de calcular SHA-256 de fuente.
3. Validar manifest con `manifest.schema.json` y seis catálogos con sus schemas:
   documents, courses, calendar-events, announcements, profiles, profile-progress.
   Dialecto 2020-12, formatos habilitados; URN resueltas solo localmente, sin descargas.
4. Comprobar exactamente 18 files y 76 items para este v1, sin extras funcionales,
   faltantes ni duplicados; estos conteos no son límites universales de futuras releases.
5. Para cada path: `item.sha256 == file.sha256 == SHA256(bytes reales)` y bytes Git.
   El catálogo documental aparece en files aunque sus items apunten a artefactos.
6. Rechazar rutas absolutas, traversal, separadores alternativos y cualquier
   symlink/junction/reparse point en la cadena de resolución; contención real bajo
   la raíz configurada `/data/synthetic`, incluida la raíz y los schemas.
7. Resolver cada JSON Pointer; comprobar tipo, clave y correspondencia bidireccional
   filas/items. Identidad `(kind,key)`; progreso usa `profile_key/course_key`.
8. FK de eventos y progreso en la misma revisión; enums, decimales sin redondeo,
   porcentajes/estados, null explícitos y unicidad. Orden de carga: cursos, anuncios,
   perfiles, eventos, progreso; luego documentos por clave.
9. Parsear fechas civiles reales e instantes finitos RFC 3339; comparar intervalos,
   offset con zona IANA `America/Bogota`. No basta validación de formato: el README
   registra un validador que aceptó una fecha imposible. No se alteran fechas fuente.
10. Unir metadata documental por clave/path, verificar título, MIME, etiqueta y modo
    idénticos al manifest; comprobar banner sintético y estructura Markdown admitida.
    Contrastar modo con `documents` ya existentes antes de escribir; nunca cambiarlo.

La ficción la acredita la revisión humana, no un booleano o JSON Schema. N8N valida
solo el envelope/control y resultados; no arregla archivos. TypeScript tampoco
completa datos, cambia pointers o repara hashes. PostgreSQL vuelve a validar su parte.

## 5. Configuración de embeddings y receta

Tras preflight, antes de crear la release, el adaptador local obtiene la versión real
de Ollama y digest real del modelo instalado `qwen3-embedding:0.6b`. Sin descargas
automáticas ni un digest ficticio. El primer uso vincula esos valores observados a la
configuración operativa autorizada; un retry exige la misma configuración exacta.
Un tag mutable que ahora resuelve otro digest no continúa la candidata anterior.
Verificar digest/runtime al comenzar y antes de publicación; impedir reemplazos del
modelo durante un intento. Si no se puede comprobar la revisión efectiva, fallar.

`embedding_configs`: provider `ollama`, modelo aprobado, `model_revision` digest real,
dimension `1024`, distance_metric `cosine`. `parameters` incluye:

- `runtime_version`: string real no vacío;
- `document`: objeto con receta de entrada `chunk.content` UTF-8 sin prefijo,
  sin normalización Unicode ni truncamiento silencioso, opciones efectivas del
  adaptador y versión de preprocesamiento;
- `query`: objeto con preprocesamiento versionado de consulta, texto UTF-8 íntegro
  sin prefijo para esta receta inicial, sin truncamiento silencioso y opciones efectivas.

La receta sin prefijo es el diseño inicial aceptado para implementación, no una afirmación sobre el
formato óptimo de Qwen. Su calidad deberá evaluarse durante la implementación, sin cambiar
silenciosamente la receta aceptada. El futuro
retrieval debe aplicar exactamente la receta query almacenada, no defaults divergentes.
Resolver y registrar las opciones efectivas de runtime/contexto en ambos objetos;
si no se conocen, no registrar una configuración como reproducible. No se inventan
valores de contexto, rendimiento, digest ni versión. Una opción/prefijo diferente
produce configuración y release nuevas. No incluir endpoints, secretos o timestamps.

Buscar coincidencia exacta de campos canónicos; insertar solo si no existe, omitiendo
`config_sha256`. PostgreSQL deriva el hash y UNIQUE resuelve duplicados (releer tras
conflicto de inserción, nunca UPDATE de configuración). Una resolución no-op no genera
embeddings. La comparación de identidad utiliza configuración fijada, no «último modelo».

Validar cada respuesta Ollama: cantidad de vectores igual a entradas, orden conocido,
1024 componentes numéricos finitos y norma positiva. Persistir vector, fecha real de
generación y run conjuntamente. Rechazar tamaño/contexto excedido: no cortar en silencio.
Un único vector por chunk, cosine exacto, sin HNSW/IVFFlat. La reproducibilidad de
receta no promete igualdad bit a bit entre hardware/runtimes; conservar vectores
publicados y artefactos efectivos si se requiere repetición exacta.

### pipeline_config: diseño aceptado para implementación

Objeto JSONB estable, resuelto desde código versionado, con estos campos:

| Campo | Valor/semántica del diseño aceptado |
| --- | --- |
| pipeline_version | `synthetic-v1-section-v1`; implementación fijará además build/revisión real |
| implementation_revision | Revisión/build verificable del código realmente ejecutado, independiente de source_git_revision; nunca placeholder ni HEAD tomado de la raíz fuente |
| markdown_extraction | Versión 1, texto Markdown conservado; un H1 seguido de H2, sin ejecutar HTML/enlaces |
| synthetic_banner | Retirar únicamente el prefijo inicial exacto descrito en sección 6 |
| chunking | `h2_sections`, versión 1, ordinal base 0, overlap 0, título H1 como contexto |
| locator | `section:<ordinal>:<texto exacto del H2 sin los tres caracteres iniciales>` |
| full_document | `artifact_only`, sin extracción/chunks/embeddings |
| encoding | `UTF-8`, sin BOM, LF |
| normalization | Ninguna normalización Unicode, espacios interiores o minúsculas; límites de LF según sección 6 |
| schema_validation | Siete schemas locales de la revisión fuente y versión real del validador al implementar |

No guardar claves, tokens, endpoints privados, tiempos variables ni execution IDs.
Misma fuente y receta efectiva producen mismo `pipeline_sha256`. Es calculado por
PostgreSQL sobre `jsonb::text` UTF-8, igual que `manifest_sha256`: **no** usar el SHA
del archivo bruto o `JSON.stringify` como sustituto. El hash bruto de manifest del
registro de aprobación sirve para verificar bytes, no para la identidad SQL.
La implementación efectiva forma parte de la receta canónica: cambiarla cambia
pipeline_sha256 aunque no cambie el dataset aprobado. No rellenar
implementation_revision con source_git_revision por conveniencia.

## 6. Auditoría documental y chunking v1 aceptado para implementación

Se leyeron los diez artefactos congelados chunked. Cada uno tiene un H1 y seis H2,
sin contenido sustantivo entre H1 y primer H2, secciones vacías ni bloques de código
que confundan encabezados. Una sección corresponde a una unidad temática manejable.
No hace falta dividir por longitud ni introducir overlap para este corpus.

Medición estática de secciones, incluido H2, excluido H1/banner: palabras aproximadas
por secuencias no blancas; bytes UTF-8 quitando LF finales de cada sección. No son
tokens del modelo ni chunks persistidos. El H1 añadido como contexto aumenta un poco
el tamaño de la futura entrada, sin cambiar el número de secciones.

| Documento | Secciones / chunks previstos | Palabras mín.–máx. | Bytes mín.–máx. |
| --- | --- | --- | --- |
| doc-001 | 6 | 136–146 | 945–1032 |
| doc-002 | 6 | 138–146 | 944–992 |
| doc-003 | 6 | 140–152 | 946–1039 |
| doc-004 | 6 | 138–151 | 968–1026 |
| doc-005 | 6 | 137–151 | 905–1047 |
| doc-006 | 6 | 144–153 | 903–985 |
| doc-007 | 6 | 139–153 | 943–1080 |
| doc-008 | 6 | 131–149 | 877–1011 |
| doc-009 | 6 | 97–147 | 676–1017 |
| doc-010 | 6 | 72–94 | 464–686 |
| Total | **60** | 72–153 por sección | 464–1080 por sección |

Algoritmo aceptado para implementación, sin ejecutarlo como pipeline:

1. Conservar bytes completos para `source_sha256`. Eliminar solo este prefijo exacto
   del texto procesado: línea `Contenido sintético de demostración; no representa
   información institucional real.` (una sola línea en la fuente), línea vacía,
   `synthetic: true`, línea vacía. No eliminar menciones de ficción dentro del cuerpo.
   Si el prefijo difiere, fallar; no aplicar un regex que borre párrafos similares.
2. Texto extraído = resto íntegro, incluido H1 y LF final. Su SHA-256 UTF-8 corresponde
   a `document_versions.content_sha256`; no es el hash de concatenar chunks.
3. Fronteras H2 en orden de fuente. Admitir solo la estructura Markdown auditada;
   futuros encabezados en código/preambulos sustantivos exigen revisión de receta,
   no un fallback silencioso. No convertir Markdown a HTML ni descargar enlaces.
4. Para cada sección, `content` será línea H1 exacta + dos LF + sección desde H2
   hasta antes del siguiente H2, quitando solo sus LF finales y añadiendo uno.
   Mantener párrafos, listas y énfasis. Repetir título es contexto, no overlap de cuerpo.
5. Ordinal 0–5, locator por ejemplo `section:0:1. Alcance del programa demo`.
   El ordinal evita colisiones por títulos repetidos; no es ancla URL ni pointer JSON.
   Páginas null para Markdown. SQL calcula el hash de cada `content`.

La receta del dataset v1 produce **60 chunks**; se validaron 60 en PostgreSQL y la
E2E real de Implementación 3 generó **60 embeddings**, no 76 embeddings.
Los 64 items estructurados no se vectorizan. Los 12 documentales son items de ingesta,
no uno por chunk. doc-011/doc-012 `full_document`: cero chunks y cero embeddings,
versión documental ready con procedencia; `content_sha256=source_sha256` por no extraer.
Artefactos completos verificados se resuelven después por REST interno aprobado,
con versión histórica exacta; nunca URL externa ni sustitución por bytes actuales.

Riesgos de recuperación observados: doc-010 secciones 2–5 agrupan preguntas/dominios
y remiten a fuentes autoritativas; una coincidencia FAQ no sustituye esas reglas.
doc-009 sección 6 es más breve, sin necesitar relleno. Títulos genéricos como «cierre»
y prosa parecida entre documentos pueden competir; H1 aporta contexto. Referencias
cruzadas requieren recuperar evidencia adicional y no inventarla. No se detectó
una sección que obligue a dividir v1, pero falta evaluar ranking/calidad y capacidad
real del modelo. No se ajusta corpus ni se crean golds en esta tarea.

## 7. Identidad y ciclo de release

Identidad exacta: `dataset_id + git_revision + manifest_sha256 + pipeline_sha256 +
embedding_config_id`. No se sustituye por dataset_key, fecha o etiqueta v1.
Aquí `git_revision` es la columna SQL que registra source_git_revision;
implementation_revision interviene mediante pipeline_config/pipeline_sha256.
Config resuelta tras preflight; dataset único creado si falta; luego candidata/run.

| Caso | Estado encontrado | Acción normal |
| --- | --- | --- |
| A | No existe combinación | Crear staging con manifest/receta completos |
| B | staging | Si hay dueño activo, devolver ocupado; si no, reconciliar y abrir intento controlado |
| C | failed | Reabrir staging solo con identidad/receta/configuración idénticas y fuente nuevamente validada |
| D | ready y current | `already_current`, no-op: ni release/run nuevo ni embeddings |
| E | ready histórica | `already_ready_not_current`, no activar; rollback administrativo explícito fuera del flujo |

El SQL permite publicar una histórica ready: **la política E debe imponerla el
componente**, no atribuirla al DDL. Releer estado bajo lock antes de actuar. No crear
endpoint público de rollback. Cambiar fuente/receta/modelo exige otra candidata.

Un solo escritor cooperativo por dataset: bloqueo advisory de sesión con clave fija
del componente/dataset, conexión dedicada conservada hasta terminar, sin transacción
larga. Otro trigger recibe ocupado; no abre otro run. Si se pierde esa conexión,
detener el procesamiento y no escribir por otra conexión sin recuperación explícita.
Todas las escrituras usan esa conexión; el lock complementa, no reemplaza las guardas SQL.
Transacciones cortas READ COMMITTED; cuando se requieren ambos locks, dataset antes
de release, como `publish_release`. Cálculo `max(attempt_no)+1` bajo lock de release.
SQL conserva UNIQUE y control monotónico. No asumir completitud concurrente en
REPEATABLE READ: el README físico documenta un riesgo pendiente.

## 8. Intentos, items y retry honesto

Abrir run `running` con attempt_no creciente, workflow_ref reproducible
(`ruta de export JSON@SHA completo de su revisión`, cuando exista), trigger_type
manual/retry; scheduled admitido por SQL pero activación posterior. Execution ID
N8N queda solo en logs de correlación, nunca sustituye workflow_ref.
Insertar los 76 items pending del manifest; no crear items para catálogos físicos.
Procesar por orden de dependencias y registrar resultado por `(source_kind,record_key)`.

Cada intento exitoso termina con **76 resultados terminales propios**:

- `processed`: representación completada/reprocesada en este intento;
- `skipped`: representación exacta verificada, `result_code=EXACT_REPRESENTATION_VERIFIED`;
- `failed`: error seguro, no habilita éxito; pendientes se cierran como failed con
  `NOT_PROCESSED_AFTER_FAILURE` al abortar. Nunca dejarlos pendientes al cerrar run.

Verificar antes de skipped: identidad, release, path, locator, SHA, todos los campos
de dominio contra los bytes aprobados y receta; documentos ready, hash de extracción,
conjunto exacto de ordinales/textos/localizadores, configuración heredada, vectores
completos válidos y procedencia temporal. «Existe fila» no basta. SQL compara el
último item por unidad/attempt_no y exige run succeeded: registros del intento
fallido no acreditan un retry. El diseño exige cobertura nueva total aunque SQL
no exija literalmente que todas las unidades provengan de un solo intento.

### Condición física importante: derivados de un intento fallido

`assert_release_complete` exige además que `document_versions.ingestion_run_id` y
`document_chunks.generation_run_id` apunten a runs **succeeded**, con tiempos dentro
del intento. Por ello un documento/vector generado por un run failed no se puede
marcar skipped sin más, aunque sus bytes parezcan correctos.

En retry se reutilizan identidades/filas parciales compatibles, pero se vuelve a
extraer/verificar el documento y a generar vectores cuyo origen fue un run fallido;
se actualizan la versión y esos chunks **solo en staging**, con run y tiempos reales
del trabajo nuevo, item processed. No relabelar un vector viejo como recién generado.
Vectores de un run previamente succeeded pueden conservarse si pasan todas las
verificaciones; documentos totalmente válidos con procedencia exitosa pueden skipped.
Registros estructurados exactos del intento fallido sí pueden skipped, pues no
tienen FK de generación al run anterior. No se cambia ningún resultado terminal viejo.

Ante incompatibilidad no reparable respetando identidad/ordinal/receta: fallar y
pedir diagnóstico. No borrar parciales ni históricos para limpiar automáticamente.
No cambiar dueño/ordinal de chunk ni identidad/mode de documents; triggers lo prohíben.

## 9. Publicación, fallos y recuperación

Procesamiento por item en transacciones cortas; Ollama fuera de ellas. Solo marcar
item processed al persistir representación válida. Al final, comprobar cobertura
exacta de los 76 y contenido esperado (el SQL no conoce nuestros 60 chunks previstos).

**Transacción final única:** lock dataset y release, confirmar fuente/identidad y
ausencia de otro intento, cerrar run succeeded con finished_at posterior a todos
los tiempos de items/versiones/embeddings, invocar `assert_release_complete`, luego
`publish_release`, commit. Esta última vuelve a validar mediante guard_release.
No se hace commit intermedio de succeeded: un fallo de completitud/publicación
revierte ese cierre y permite registrar failed sin mutar un run terminal.
Solo `publish_release` promueve normalmente; no escribir current desde N8N o DML propio.

Tras rollback, cerrar todos los pending como failed y luego run failed mientras la
candidata aún está staging; después marcar candidata failed en la misma transacción
de cierre. Las filas procesadas permanecen para retry. Current anterior intacto.

| Clase | Código seguro del diseño aceptado | Tratamiento |
| --- | --- | --- |
| Fuente/revisión/aprobación | SOURCE_REJECTED | Corregir selección fuera del proceso, sin modificar archivos |
| Schema/relaciones/contenido | VALIDATION_FAILED | No retry automático del mismo defecto |
| PostgreSQL | DATABASE_UNAVAILABLE / DATABASE_CONFLICT | Reconciliar estado; retry controlado tras disponibilidad |
| Ollama inaccesible | OLLAMA_UNAVAILABLE | Fallar intento abierto; retry con misma config al recuperarse |
| Vector/config efectiva inválida | INVALID_EMBEDDING | No publicar; comprobar modelo, parámetros y entradas |
| Completitud/publicación | PUBLICATION_FAILED | Rollback y cierre fallido si no hubo commit |
| Inesperado | INTERNAL_ERROR | Detener, diagnóstico técnico saneado |

No guardar mensajes SQL, stacks, claves, URLs privadas ni payloads completos en
error_code/result_code. Los códigos no se incorporan a contratos REST/MCP.

Si preflight falla antes de crear run no se inventa un run SQL: N8N conserva el
rechazo técnico correlacionado. Si PostgreSQL está caído, no prometer que se persistió
failed: registrar incertidumbre y reconciliar al volver. Si hay crash con run running,
adquirir primero exclusión (probar que no hay dueño activo), inspeccionar estado,
cerrar pending/run fallidos y luego abrir otro attempt; jamás «robar» un trabajo por
haber agotado un timeout HTTP. No se retoma la identidad de un intento muerto.

Si se pierde respuesta al COMMIT, consultar estado por identidad: ready/current o
ready histórica con run succeeded prueba publicación completada, no un fallo parcial.
Nunca intentar cambiar a failed una release ready. Si no puede determinarse resultado,
mantener estado desconocido y detener retry hasta reconciliar. Deadlock/serialización:
rollback y reintento acotado de la transacción, solo tras conocer que no confirmó;
no repetir generación o publicación ciegamente.

## 10. Workflow lógico y métricas

| Paso | Dueño |
| --- | --- |
| Trigger manual/retry y validación de entrada de control | N8N |
| Resolver revisión aprobada y preflight completo | TypeScript |
| Resolver configuración efectiva; resolver/crear staging | TypeScript + validación PostgreSQL |
| Abrir ingestion_run y 76 pending | TypeScript + PostgreSQL |
| Registros estructurados y sus relaciones | TypeScript + PostgreSQL |
| Documentos: full_document → versión; chunked → secciones → embeddings | TypeScript + Ollama + PostgreSQL |
| Cerrar los 76 resultados | TypeScript + PostgreSQL |
| Cerrar succeeded, completitud y publish_release en una transacción | TypeScript + PostgreSQL |
| Resumen / estado incierto / decisión controlada de retry | N8N, consultando al componente |
| Failure: cerrar pending/run, preservar current, candidata failed | TypeScript; N8N registra resumen |

OE2 conserva >90% de ingesta correcta y <24h desde disponibilidad de revisión
aprobada, como objetivos no medidos. Registrar por separado: tiempo humano previo
a aprobación/disponibilidad (fuera del procesamiento), espera disponibilidad→trigger,
trigger→publicación (workflow), y total disponibilidad→publicación (incluye espera
y retries). Las fechas son observadas, no extraídas de eventos sintéticos ni
incluidas en pipeline_config. Tasa documental: documentos válidos procesados o
reutilizados verificadamente / 12; cobertura lógica por intento: terminales exitosos
/ 76. Un no-op se reporta aparte, no infla tasas de procesamiento. Publicar requiere
100% de completitud, aunque el objetivo experimental de tasa sea >90%.

OE4 técnico descarta la antigua sincronización de calendario de 30 minutos: no existe
fuente externa independiente. Evalúa E2E publicación atómica, trazabilidad, ausencia
de pérdida/mezcla de items y preservación de current ante fallos. Todos los escenarios
críticos del plan deben cumplir lo esperado. Duración del workflow es una métrica
observada, sin nuevo umbral inventado. La redacción académica de OE4 se actualizará
posteriormente; no se modifica el anteproyecto ni se afirman resultados ahora.

## 11. Riesgos y verificaciones pendientes

- El listener, la configuración local y el startup fueron validados operacionalmente
  en Windows + Docker Desktop. Sigue pendiente decidir topología/bind para despliegues
  futuros, implementar/versionar el workflow, llamar `/execute` desde N8N y definir
  permisos/montajes finales. `host.docker.internal` solo fue observado en Docker
  Desktop; no define una topología Linux. Compose no implementa el workflow.
- La E2E real verificó digest/runtime/opciones efectivos de Ollama y 60 embeddings;
  todavía falta evaluar calidad de retrieval/RAG y no se acreditan RAGAS/MRR.
- Auditar roles no propietarios, concurrencia y procedencia en retries con el plan;
  las pruebas SQL existentes no acreditan esos escenarios avanzados.
- Conservar checkout/artefactos fuente históricos, código/build y receta del runtime
  por sus respectivas revisiones, y respaldo del registro de aprobación de contenido;
  sin ellos no se puede prometer reproducción ni descarga histórica disponible.
- Modelo lógico conserva `item_key` e indicaciones antiguas; ADR 0003 dice DEFAULT/CHECK
  del nombre, pero SQL solo fija dimensión/cosine y defaults de proveedor/modelo.
  Prevalece SQL. No se corrigen esos documentos fuera del alcance autorizado.
- La arquitectura refleja SQL y suite A–K, además del core de ingesta validado por
  etapas; esas evidencias no acreditan N8N operacional ni el sistema conversacional.

Estas evidencias validan diseño, trazabilidad y publicación dentro de sus alcances
separados; no acreditan métricas OE1/OE2/OE4, calidad RAG, rendimiento del sistema,
N8N operacional ni capacidad general del hardware.
