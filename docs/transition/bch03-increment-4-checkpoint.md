# CHECKPOINT BANUCHAT — BCH-03 incremento 4

Fecha: 2026-10-21. Base aceptada: `308df0fbe29666d12ff5ad1270df3e2c3f2f486e`.
Estado: ampliación publicada y consultada mediante REST real en desarrollo local.
Sin commit ni push, cambios en Mobile, memoria conversacional, Agent/ReAct o MCP.

## Conocimiento incorporado

| Grupo / unidades | Fuente y localizador | Admisión |
| --- | --- | --- |
| M01 / `ccd-m01` | DOC-110 §2/§3; cierre `02_Respuestas_6!D2`; C04/C07 | Contenido y hash originales conservados. |
| M12 / `ccd-m12` | DOC-110 §4; cierre `02_Respuestas_6!D7`; C44/C45 | Contenido y hash originales conservados. |
| M02 / `ccd-m02-doc-098` a `ccd-m02-doc-104` | Siete syllabus DOC-098–104, §2 descripción p.2, §3 competencias pp.2–3 y §4 contenidos p.3; cierre `02_Respuestas_6!E3`; C05 | Siete síntesis descriptivas con temáticas respaldadas; sin oferta vigente. |
| Orientación / `ccd-tests-overview` | DOC-110 §2; cierre `07_Bloqueos!A3:H3`; C11 | Solo propósito diagnóstico, duración aproximada y estructura para 202660. |

M02 cubre analítica, creación de contenidos, cuidado/bienestar, IA generativa,
interacción, marca personal y marco legal digital. DOC-100 tiene título de bienestar
pero desarrolla TIC en salud/telesalud: la síntesis conserva ese contenido y no
inventa otro programa. No se infiere periodo a partir del nombre del PDF; se registra
«Edición entregada; periodo no confirmado». No se incorporaron oferta, cupos,
docentes, horarios, programación interna, expedientes, tarifas ni actas.

La auditoría relaciona C11 con M04 y mantiene B02 sobre efectos contradictorios.
`TEST_ORIENTATION` identifica el recorte descriptivo permitido, sin reabrir M04
como regla de reconocimiento. Se excluyen gratuidad/repetición, elegibilidad general,
equivalencias, efectos del puntaje y autorizaciones individuales. Duración/estructura
de 202660 no se afirman vigentes hoy.

M01/M12 conservan «validación del equipo». Los nuevos derivados se identifican como
`source_checked_local_candidate`: cotejo técnico contra fuentes, sin atribuir una
nueva validación humana del equipo ni aval institucional. El corpus completo tiene
`institutional_approval: false`. Las 124 huellas del inventario de acceso se cotejaron
al terminar: cero cambios en la carpeta institucional externa.

## Contrato, snapshot y procedencia

Schema adicional `data/ccd/schemas/corpus-1.1.schema.json`, contrato `ccd-1.1.0`;
el schema original no cambia. Corpus `bch03-ccd-local-2`, snapshot privado en
`data/ccd/local/expanded-v2`. Nueve fuentes: DOC-110, cierre BCH-01 y siete syllabus.
Diez unidades admitidas por identidad/C/grupo, con población, periodo, límites,
estado editorial, fuentes/localizadores y SHA físico. M02 exige temáticas; los
otros grupos conservan sus validaciones específicas. Un Markdown/chunk por unidad;
no se vectorizan originales completos ni se crean documentos de metadatos.

- SHA físico `corpus.json`: `ce220d195fb1b63eb43101e460cde8e40e24bd7072d1cef1026a3b2d90728a55`.
- SHA schema: `8bacfb6854308629ba3f313488c67c53aaa17c9d075a5288ce2fe79eed687d14`.
- SHA manifiesto JSONB publicado: `93632fb12d6eecc05c28e6bfea7f3331480408e6b70e40f3e59fb2a8f7008f3e`.
- SHA pipeline JSONB: `cd037b66708e735763c7eb73721a4d54f616b4687db450c049dc6473991b2b35`.

Pipeline registra HEAD como base del código, huellas de archivos realmente ejecutados,
snapshot local y release predecesora; no atribuye revisión Git a documentos externos.
Fuente física, derivado Markdown, chunk y manifiesto JSONB conservan hashes distintos
y enlazados. Corpus, extracción, evidencia HTTP y vectores permanecen ignorados por
Git; el clon por sí solo no reconstruye contenido no público. Se requiere transferir
el snapshot admitido y disponer de los originales con las mismas huellas.

## Persistencia y publicación observadas

Destino comprobado: `banuchat_ccd_dev`, proyecto `banuchat-ccd-dev`, servicio
`postgres-ccd`, puerto loopback 55433, volumen `banuchat-ccd-dev_ccd_pgvector_data`.
Se verificó la release original antes de migrar; no se reaplicó 001/002/003 ni se
reinicializó PostgreSQL. `004_ccd_expanded_manifest.sql` añade la rama ampliada,
preservando los validadores original CCD y sintético. No se escribieron datos demo.

Procedimiento desde `backend/rag`, con configuración local existente:

```powershell
# Ejecutado una sola vez antes de ampliar; no repetir en la base ya migrada:
npm run ccd:local -- expand-migrate
# Ejecutado antes de la carga, validaciones con rollback y captura de historial:
node --env-file=../../infra/.env.ccd --import tsx ../../eval/integration/ccd-expansion.mts preflight
# Publicación manual con predecesora explícita:
npm run ccd:local -- ingest-expanded 5834fc47-57c5-498b-98fc-4190330155e4
```

Se reutilizaron lease, staging, control de intentos, embeddings y publicación atómica.
El finalizador bloquea el dataset, compara la predecesora e inserta el nuevo contexto
`ccd-local-demo` en la misma transacción que valida y publica. No elimina contexto,
release ni conversaciones anteriores. No hay retry/recovery automático.

| Estado final | Documentos / versiones / chunks / embeddings |
| --- | --- |
| Release actual `fb8538af-3280-4a1b-889c-a27564381996`, `ready/current` | 10 / 10 / 10 / 10 |
| Release anterior `5834fc47-57c5-498b-98fc-4190330155e4`, `ready`, histórica | 2 / 2 / 2 / 2 |
| Base completa, sin borrar historia | 10 identidades / 12 versiones / 12 chunks / 12 embeddings |

Diez embeddings generados en esta carga. Modelo efectivo `qwen3-embedding:0.6b`,
digest `ac6da0dfba84a81fdbfbaf330198c33cd77c4cdfc53e8bc50eb581914a15621d`,
1024 dimensiones, coseno, vectores no nulos. SHA de configuración:
`e1441a0aad0547d9db657f20708d585209a7d863c27f1b2b1e05aa42e6546771`.
La repetición explícita del mismo comando devolvió `already_current`, cero embeddings.
Se compararon manifiesto, pipeline, estado y hashes de vectores de la release previa
contra el baseline: intactos; M01/M12 mantienen también sus hashes de artefactos.

## REST real y persistencia de citas

API compilada arrancada por el runner, modo `ccd_local`, listener loopback 3001.
No son handlers simulados ni Document RAG directo. Generación con Ollama local y
la configuración existente `qwen3:4b-instruct`. Para repetir desde `backend/rag`:

```powershell
node --env-file=../../infra/.env.ccd --import tsx ../../eval/integration/ccd-expansion.mts http
```

Requiere build API, puertos 3001/3302 libres, snapshot y evidencia baseline locales.
Crea un nuevo chat CCD; cierra únicamente sus listeners al terminar.
Evidencia aprobada: `data/ccd/evidence/increment-4/http-1792626853020.json`.
Conversación: `faab6404-da1f-480b-aaba-119d60d14f49`, 28 mensajes y 50 citas persistidas.
Comprobación final de solo lectura: `data/ccd/evidence/increment-4/final-state.json`;
la base conserva tres conversaciones, 60 mensajes y 62 citas en total, incluidas las
dos conversaciones anteriores con sus 32 mensajes y 12 citas intactos.

| Consultas HTTP observadas | Resultado |
| --- | --- |
| GET perfiles y POST conversación | 200 / 201; contexto técnico de la release nueva, sin identidad institucional. |
| Tres pilares 202660 / correo documentado | 201; evidencia suficiente, localizadores `unit:M01` / `unit:M12`. |
| «Según el syllabus entregado de [título], ¿de qué trata el curso y qué temas aborda?» para cada uno de los siete cursos | Siete respuestas 201, descriptivas y acordes al derivado; cita específica `unit:M02:DOC-098` hasta `unit:M02:DOC-104`, respectivamente. |
| Propósito, duración y estructura de prueba según 202660 | 201, propósito diagnóstico, duración aproximada y tres instrumentos; `unit:TEST_ORIENTATION`. |
| Repetición gratuita de todas las pruebas perdidas | 201, evidencia insuficiente, sin citas ni autorización. |
| Homologación automática de todos los cursos con 70 puntos | 201, evidencia insuficiente, sin citas ni autorización. |
| Elegibilidad actual de todos los estudiantes continuos | 201, evidencia insuficiente, sin citas ni autorización. |
| Horarios/cupos actuales de IA Generativa | 201, evidencia insuficiente, sin citas ni oferta inventada. |
| GET conversación nueva e historial | 200; los 28 mensajes reconstruyen exactamente las respuestas persistidas. |
| GET de los dos chats previos y sus artefactos | 200; 32 mensajes y 12 citas anteriores sin cambios. |
| POST mensaje en conversación de release anterior | 409; sin añadir turnos ni mezclar conocimiento entre releases. |

Cada cita persistida se cotejó con versión/chunk: SHA y localizador coinciden;
los artefactos descargados por HTTP coinciden byte a byte con el SHA de la versión.
Se revisó además el texto observado frente al contenido depurado. El backend conserva
su comportamiento de citar todo el top-5 recuperado, incluso documentos secundarios:
las 50 citas son diez respuestas con cinco fuentes de contexto, no 50 afirmaciones
independientes. No constituyen una validación institucional automática.

## Pruebas y fallos observados

- RAG: typecheck y build aprobados; `npm test`: 207 aprobadas, 0 fallidas/omitidas.
- API: typecheck y build aprobados; suite final `npm test`: 477 aprobadas, 0 fallidas/omitidas.
- Runner ampliado: compilación TS estricta aprobada.
- SQL real: diez controles con rollback aprobados (tres manifiestos válidos y siete
  rechazos de fuente, periodo, temáticas, identidad, aval editorial o límites).
- Preparación original M01/M12 aprobada sin escribir snapshot; conserva SHA original.
- Dataset sintético validado: 76 items, 12 documentos, 60 chunks. GET reales de
  perfiles, progreso e historial en la API sintética: 200. Sin POST ni carga sintética
  operacional en esta ejecución; cobertura conversacional sintética por la suite API.
- Idempotencia real aprobada. `git diff --check` aprobado; sin cambios en
  `data/synthetic`, schemas REST ni SQL 001/002/003. Originales externos: 124/124 intactos.

La preparación inicial rechazó CRLF en el schema nuevo y una definición Ajv
`strictRequired` incompleta; se corrigieron sin relajar validación. El primer preflight
SQL detectó alias `s` ambiguo (42702); se corrigió la función adicional antes de
cargar y se repitieron los diez controles con éxito. No se reejecutó toda la migración
ni se alteraron filas de corpus para corregirlo. El primer runner HTTP componía dos
veces `/api/v1` al abrir artefactos antiguos; se corrigió el runner y la ejecución
completa pasó. Se conservan localmente los reportes fallidos y aprobados.

## Archivos y límites

Implementación: `backend/rag/src/ccd/{prepare,ingest,load-local}.ts`,
`backend/rag/src/db/{recipe,finalize}.ts`, `infra/db/004_ccd_expanded_manifest.sql`,
`data/ccd/schemas/corpus-1.1.schema.json`; exclusiones `.gitignore` raíz y CCD.
Consulta: `backend/api/src/{ccd-runtime,main}.ts`, `chat/{chat-dispatcher,document-rag}.ts`,
`application/document-artifact.ts`. Pruebas: `backend/rag/test/ccd-expanded.test.ts`,
`backend/api/test/{ccd-mode,document-artifact}.test.ts`,
`eval/integration/ccd-expansion.mts`. Documentación: AGENTS, README CCD/API,
`infra/db/ccd-local-development.md` y este checkpoint. Derivados/evidencia privados
en `data/ccd/local/expanded-v2` y `data/ccd/evidence/increment-4`, no versionables.

Las conversaciones anteriores permiten lectura y descarga histórica, pero no nuevas
preguntas contra su release: abrir otra conversación. Conservar ambas carpetas de
artefactos; una versión no admitida se rechaza, sin fallback de archivos. La lista
explícita de raíces deberá ampliarse si se autoriza otra versión. La consulta M12
observada menciona 202660 pero no verbalizó la advertencia adicional de vigencia
actual no ratificada pedida por el prompt; el artefacto sí la conserva. No se acredita
uniformidad de esas advertencias en todas las generaciones.

No se probaron Mobile, LAN, oferta actual, reglas bloqueadas ni autenticación real.
No se declara despliegue institucional ni integración de todas las fuentes CCD.
Incremento 4 terminado; detenerse aquí, sin nueva ampliación ni commit/push.
