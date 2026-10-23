# CHECKPOINT BANUCHAT — BCH-05/CCD-AUTH-I1A

Fecha: 2026-10-23, America/Bogota. Base:
`5e0c3b730fbe999ecf1f1ee6c6f758acc7ceba53`; árbol limpio al comenzar.
Autorización: BCH-D36, exclusivamente lectura documental del runtime autenticado.

**El fallo 42501 quedó corregido en código permanente y validado con PostgreSQL,
HTTP v2 y Ollama reales en una instancia sintética nueva. CCD no está integrado.**
No se aplicó 010 a los entornos históricos. La integración queda para revisión de
Sala de Control; no se inicia I1B ni se realizan pruebas manuales Android.

## 1. Cambio permanente y causa corregida

El servicio histórico `retrieveDocumentChunks` hace SELECT de document_chunks,
document_versions y documents. AUTH-P2.1 concede al runtime SELECT de las dos
últimas, pero de chunks permite solo acceso mediante funciones. Que
`search_chunks_cosine` admita EXECUTE no autoriza ese SELECT. La preparación I1A
reprodujo **42501** con el rol runtime nuevo, antes de aplicar 010.

La migración aditiva
[010_authenticated_document_reads.sql](../../infra/db/010_authenticated_document_reads.sql)
añade `banuchat_auth.retrieve_document_chunks(uuid,public.vector,integer)`.
El [adaptador](../../backend/api/src/application/authenticated-document-retrieval.ts)
la invoca con parámetros enlazados y usa los mismos validadores de entrada y
normalizador de filas del retrieval histórico. El RAG acepta una dependencia
interna opcional de recuperación; v1 conserva el valor por defecto y su consulta.

`createAuthenticatedDocumentRag`, en authenticated-runtime.ts, compone el RAG
existente con el adaptador y evidencia **synthetic**. authenticated-main.ts usa
esa composición y rechaza el arranque si falta la función 010 o no cumple las
condiciones mínimas de owner/STABLE/EXECUTE y ausencia de SELECT chunks. La
configuración es interna; Mobile y el request no eligen corpus ni SQL.

No se duplicaron motor, router, prompts o criterios U03/U04/T07/T11. Las únicas
líneas nuevas en document-rag.ts son la dependencia tipada y su propagación.
Los validadores compartidos se exportan desde su módulo, sin cambiar sus reglas.
No hay retry, nueva tecnología, Agent/ReAct, MCP o N8N conversacional.

## 2. Migración, ámbito y privilegios efectivos

**No se cambió runtime_scope.** Sus columnas y la fila de base/deployment de 007
son suficientes para este incremento sintético; no se añadió un flag CCD.
010 exige target/base/deployment exactos, 006–008 instaladas, ausencia de CCD y
función nueva aún inexistente. Rechaza roles incompatibles, SELECT chunks directo,
UPDATE de corpus/conversación y membresías. No crea roles de clúster nuevos;
reutiliza el executor NOLOGIN de 007. Se verificó el rechazo y rollback de target
ausente, target distinto y deployment incorrecto.

La función exige dataset 1 con nombre banuchat-synthetic, current ready y
synthetic=true; no admite otras releases/datasets no sintéticos en esa base.
Comprueba vector de 1024 dimensiones, no nulo/norma positiva y top_k 1–20. pgvector
rechaza NaN e infinitos al convertir a vector. La función es STABLE: scope y
consulta comparten snapshot de sentencia. Una release distinta de current devuelve
P0409; el adaptador lo traduce a release_not_available y al 409 existente de mensajes.

| Privilegio/atributo comprobado en PostgreSQL real | Resultado |
| --- | --- |
| Runtime SELECT de chunks, incluido por columna | false; SELECT histórico sigue rechazado con 42501 |
| Runtime UPDATE de conversations, datasets y dataset_releases | false |
| UPDATE efectivo intentado sobre datasets/releases/chunks/versions/configs | 42501 en los cinco casos |
| Runtime miembro del executor / SET ROLE | false / 42501 |
| Runtime CREATE schema auth / UPDATE runtime_scope | false / false |
| Owner de la nueva función | banuchat_auth_executor, NOLOGIN, sin poderes administrativos, sin CREATE residual |
| Función | SECURITY DEFINER, STABLE; search_path=pg_catalog,banuchat_auth,pg_temp |
| PUBLIC EXECUTE | false, revocado en la transacción de creación |
| Rol outsider, con USAGE del schema pero sin EXECUTE | 42501 real |
| ACL de EXECUTE de la función | Solo runtime revisado y propietario |

Se conservaron los permisos previos del executor de 007 necesarios para sus
otras funciones, incluidos los UPDATE por columna que permiten locks. 010 no
los amplía y no concede esos UPDATE al runtime. Las referencias son calificadas,
incluido `OPERATOR(public.<=>)`; no hay SQL dinámico en el cuerpo. El único DDL
dinámico identifica de forma segura el rol revisado al conceder EXECUTE.

Se comprobó que runtime solo ejecuta estas cinco funciones de aplicación:
current_retrieval_context, search_chunks_cosine, resource_context, persist_turn
y retrieve_document_chunks. No recibe publicación, ingesta ni SQL arbitrario.
La frontera sigue confiando en el rol técnico API y en el administrador; no se
afirma protección frente a compromiso de esas credenciales.

## 3. Equivalencia y demás lecturas

La proyección conserva las **15 columnas**, con casts de dominios a text, y los
JOIN por versión/release/dataset. Mantiene ready, chunked, embedding no NULL y el
orden **distancia → document_version_id → ordinal**, aplicado antes de LIMIT.
full_document permanece excluido; no se fragmenta ni vectoriza.

La consulta anterior con el administrador autorizado y la función con el runtime
devolvieron objetos normalizados exactamente iguales para top_k 1, 5 y 20:
identificadores, contenido, hashes, localizadores y distancias incluidos.

Una fixture transaccional separada creó dos versiones de documentos con claves
en orden contrario a sus UUID, tres chunks por versión y vectores de control
idénticos. En top_k=5 ambas lecturas devolvieron versión menor/ordinales 0–2 y
versión mayor/ordinales 0–1. Se comprobó el corte entre empates, no solo ordenar
después de LIMIT. Incluyó versión full_document sin chunks y rechazo de una
release ready ya histórica. Un dataset 2 fue rechazado por el CHECK congelado de
001. No se quitaron constraints ni triggers para construir la fixture.

Esos vectores son **datos de prueba controlados, no embeddings Ollama**. Toda la
fixture, incluida su publicación temporal visible solo en la transacción, se
revirtió. El corpus y vectores publicados copiados quedaron idénticos por hash.

Las otras lecturas se inspeccionaron y ejercitaron: configuración de embeddings
en dataset_releases/embedding_configs; contexto y mensajes propios; dispatcher;
versiones documentales; reconstrucción de citas e historial; descarga del artefacto.
Sus SELECT ya estaban concedidos. `buildDocumentCitations` valida en memoria;
la persistencia sigue usando el executor de 007 y sus validadores de procedencia.
No apareció otro 42501 ni hizo falta ampliar los SELECT del runtime.

## 4. HTTP, PostgreSQL y Ollama reales

Ensayo único, sin reenvío de POST: **09:26:28–09:26:46, Bogotá**
(`14:26:28–14:26:46 UTC`). Se aprovisionaron dos cuentas totalmente ficticias,
mismo perfil sintético y contraseñas aleatorias independientes de 40 caracteres,
establecidas con el administrador local existente y Argon2id. No se persistieron
contraseñas de cuenta, tokens o hashes PHC en reportes. UID/nombres/correos mantienen
la convención vigente de 006; ningún dato personal real.

Pregunta: **«¿Qué información debe incluir una descripción útil de una incidencia
técnica?»** Router agent_fallback → Document RAG existente → función 010.

| Observación real del turno positivo | Resultado |
| --- | --- |
| Login / creación de conversación propia | 200 / 201 |
| Embedding de consulta | 1 llamada real /api/embed HTTP 200, qwen3-embedding:0.6b, 1024 |
| Nueva función SQL | 1 llamada observada, 5 filas recuperadas |
| Generación | 1 llamada real /api/chat HTTP 200; qwen3:4b-instruct; done_reason stop |
| Respuesta de mensajes | HTTP 201, insufficient_evidence=false, Cache-Control no-store |
| Respuesta semántica | Describe qué se intentaba hacer, qué ocurrió y qué se esperaba; distingue observación de interpretación y excluye datos personales/sensibles. Respaldada por DOC-008 sintético |
| Citas | 5 citas al documento «Soporte y reporte de incidencias», con locators de secciones recuperadas |
| Release | 6a770ce7-13b7-4b0b-95ae-0c193fa0d655, sintética |
| Persistencia / reapertura | GET 200; ambos mensajes coinciden exactamente con la respuesta POST |
| Hash/localizador/release en PostgreSQL | Las 5 citas concuerdan con sus chunks/versiones reales |
| Artefacto v2 | 5 descargas por URL de cita, misma versión documental; SHA-256 de bytes correcto. No son cinco documentos distintos |

Generador: Ollama 0.35.0, qwen3:4b-instruct, digest
`0edcdef34593eac1aa2be9c7d06c432dcf81945adca5eca2f27662c18f168ba0`.
Se conservaron temperatura 0, think=false, num_predict=256, stream=false y timeout
de generación 30 s. Turno positivo: prompt_eval_count 1617, eval_count 80,
duración interna Ollama 7918,264 ms; no es benchmark de latencia HTTP.

No se eligió un saludo, FAQ estática ni aclaración sin retrieval. El texto y las
citas del turno completo están en la evidencia depurada. Esta prueba demuestra el
camino sintético reparado; no mide cobertura general ni demuestra calidad CCD.

### Propietarios, revocación y rollback

La segunda cuenta no vio el chat en su listado; GET y POST con el UUID de la
primera devolvieron 404. GET anónimo devolvió 401. Compartir perfil no compartió
memoria ni propiedad. No se cambió el gate de 007.

En otro chat nuevo se realizó un **segundo turno planificado exclusivamente para
la carrera**. Hubo embedding, retrieval y generación Ollama reales; se pausó la
entrega de la generación al servicio antes del commit. El administrador adquirió
lock NOWAIT sobre la cuenta, revocó la sesión y confirmó la transacción; al liberar
la pausa, persist_turn revalidó y devolvió **HTTP 401**, con cero mensajes parciales.
El lock NOWAIT acredita que no había lock de cuenta durante esa fase externa.
La segunda generación terminó con stop, 1617/80 tokens y 2690,7002 ms internos.
Son dos consultas explícitas de prueba, no reintentos de un fallo.

En una conversación adicional se envió una cita interna con hash deliberadamente
incorrecto a persist_turn: P0500, sin mensajes parciales. También se provocó un
fallo SELECT interno revocando temporalmente un permiso del executor dentro de
una transacción SQL: devolvió mensaje fijo «Document read rejected», sin detalle
privado, y el rollback restauró el ACL. HTTP conserva su envelope saneado existente.

## 5. Evidencia, pruebas y defectos de pruebas encontrados

Reportes versionables bajo `eval/auth/results/`:

- [setup](../../eval/auth/results/bch05-ccd-auth-i1a-setup.json): identidad del destino, 42501 anterior/lectura posterior, migraciones y huellas del origen/copia.
- [SQL inicial](../../eval/auth/results/bch05-ccd-auth-i1a-sql-first.json) y [SQL final](../../eval/auth/results/bch05-ccd-auth-i1a-sql.json): fallo de fixture conservado y comprobaciones finales.
- [HTTP](../../eval/auth/results/bch05-ccd-auth-i1a-http.json): pregunta/respuesta sintéticas, llamadas observadas, citas, aislamiento y revocación.
- [Auditoría](../../eval/auth/results/bch05-ccd-auth-i1a-audit.json): ACL efectivos, funciones ejecutables, archivos protegidos e integridad final.

| Prueba realmente ejecutada | Resultado |
| --- | --- |
| npm run typecheck, final | Correcto, sin relajar strict/noUncheckedIndexedAccess/exactOptionalPropertyTypes |
| npm run build | Correcto |
| Adaptador nuevo + document-retrieval/document-query-retrieval/document-rag | 92/92 tests, incluidos subtests |
| Regresión focal de mensajes, citas, artefactos, contexto/evidencia, clientes Ollama, auth, contratos, cliente PG y main | 161/161 tests, incluidos subtests |
| SQL real, batería final | 11/11 comprobaciones; 12/12 tests contando el padre |
| HTTP v2 + PG + Ollama real | Correcto en turno documental y carrera de revocación, con los límites descritos |
| Auditoría de integridad/privilegios, solo lectura | Correcta; corpus/origen/contratos conservados |
| git diff --check / archivos nuevos / alcance | Verificados al cierre |

Los dos grupos focales son archivos distintos: 253 tests en total; no se presenta
como suite API completa. No se ejecutaron Mobile/Android/iOS, nuevos ensayos CCD,
ingesta, backend/rag, MCP, N8N, correo o pruebas costosas no afectadas.

Comandos de integración ejecutados desde backend/api:

```powershell
node --import tsx test/auth-i1a-setup.mts
node --import tsx --test test/auth-i1a-sql.mts
node --import tsx test/auth-i1a-http.mts
node --import tsx test/auth-i1a-audit.mts
```

Setup rechaza recursos preexistentes y HTTP exige cero cuentas: no reejecutarlos
sobre la copia retenida para producir otro PASS. Una reproducción desde cero
necesita otro destino limpio autorizado o el retiro explícito de estos recursos;
ninguno de los scripts borra/recrea recursos automáticamente. La batería SQL usa
fixtures con rollback; la auditoría solo lee. No contienen credenciales de prueba
en argumentos ni toman configuraciones de CCD.

El primer SQL run falló solo en la fixture de empates por inferencia text/integer
del parámetro $3 (42P08), antes de probar esos empates; las demás nueve
comprobaciones ejecutadas aprobaron. Se añadió cast integer al parámetro y se
repitió la batería pequeña, conservando el resultado inicial. No se cambió SQL de
producto para hacerla pasar. Los primeros typechecks de pruebas señalaron tipos
implícitos y Promise.withResolvers fuera de ES2022; se corrigieron las pruebas,
manteniendo el target y las opciones estrictas. Una auditoría inicial detectó una
ruta relativa de git ls-files al ejecutarse desde backend/api; se corrigió con
--full-name y se repitió únicamente la lectura de auditoría. Ninguno de esos
resultados iniciales se presenta como PASS.

## 6. Integridad, entorno y custodia

Destino exclusivo: contenedor `banuchat-auth-i1a-test`, base
`banuchat_auth_i1a_test`, loopback **55442**, red
`banuchat-auth-i1a-test-isolated` sin masquerade y volumen
`banuchat-auth-i1a-test-data`. Imagen local pgvector/pgvector:pg16, sin descarga.
Identidad/ID del contenedor, etiqueta de tarea, montaje, red, nombre de base y rol
administrador se verificaron antes de aplicar migraciones; environment.ts vuelve
a verificar la identidad antes de cada batería real.

Se restauró únicamente el schema de negocio 001 instalado y corpus sintético
publicado desde una lectura del origen, excluyendo sus conversaciones/mensajes/
citas. No se ejecutó ingesta ni se fabricó una nueva release de runtime. Los ACL
de PUBLIC se retiraron explícitamente en el clúster nuevo antes de crear el runtime.
006/007/008/010 se aplicaron solo al destino nuevo. 001–008 del repositorio siguen
idénticas y no se crearon 009 ni 011.

SHA-256 de corpus/relaciones/vectores, con algoritmo idéntico sobre 13 tablas:
`c6659b9546c42012d49af565fec32f6cd2ea39b521aa2531d2b154b4085b991e`, igual en
origen antes/después y en copia tras SQL y HTTP. Huella de historial original
también idéntica. No hay nuevos datos de corpus ni embeddings almacenados; las
dos llamadas /api/embed generan solo vectores de consulta en memoria.

La auditoría compara los 59 archivos protegidos de AUTH-P4-L1 excluyendo únicamente
auth-permissions.md, cuya actualización sí está autorizada aquí: todos intactos.
Incluye 001–008, REST/OpenAPI v1/v2, MCP y archivos sintéticos congelados. No se
accedió a CCD original/derivados o a sus bases para realizar esta tarea; los tests
unitarios CCD usan dobles y conservan las reglas existentes.

La API temporal terminó cerrada. El contenedor nuevo se detuvo al cerrar, tras
verificar su ID/etiqueta/volumen; se conservan volumen y configuración para revisión,
sin eliminar recursos. Los originales de demo/CCD/AUTH-P4-L1/R0 no fueron destinos
de escritura ni se reiniciaron. Configuración técnica en infra/local/auth-i1a,
ignorada y con ACL al operador; no es un almacén cifrado. Las contraseñas de cuenta
fueron solo de prueba en memoria. Correo/contactos continúan deshabilitados/vacíos.

## 7. Archivos y estado para I1B

Nuevos de producto: migración 010 y
`backend/api/src/application/authenticated-document-retrieval.ts`.
Modificados: document-retrieval.ts (exportar validación/normalización),
document-query-retrieval.ts y chat/document-rag.ts (dependencia opcional),
authenticated-runtime.ts y authenticated-main.ts (composición confiable).

Pruebas nuevas: authenticated-document-retrieval.test.ts,
auth-i1a/{environment.ts}, auth-i1a-setup.mts, auth-i1a-sql.mts,
auth-i1a-http.mts y auth-i1a-audit.mts. Documentación: API README,
auth-permissions y este checkpoint; cinco reportes JSON depurados indicados arriba.
Helpers/configuración local y dist del build están ignorados.

**I1A tiene corregida y acreditada la lectura documental sintética autenticada.**
La composición permanente ahora requiere 010: los despliegues históricos no
actualizados no deben reiniciarse con este entrypoint hasta autorizar su migración
y validar su entorno. Que la prueba nueva funcione no autoriza aplicar SQL a ellos.

Para I1B quedan sin implementar: destino CCD autenticado y su bootstrap compatible,
grants/bindings al contexto técnico CCD, adaptación contractual de capacidades/
semántica de me, composición y raíces CCD autenticadas, Mobile correspondiente y
batería semántica CCD con citas/propietarios. 010 sigue siendo **solo sintética**;
no es una autorización implícita de 009/011, UID nuevo, correo o CCD. T11 y las
reglas documentales pendientes conservan exactamente su estado previo.

**CHECKPOINT BANUCHAT — BCH-05/CCD-AUTH-I1A. Detenido para revisión de Sala de
Control. Sin commit ni push; no avanzar automáticamente a CCD-AUTH-I1B.**
