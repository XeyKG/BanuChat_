# CHECKPOINT BANUCHAT — BCH-05/CCD-AUTH-R0

Fecha: 2026-10-23, America/Bogota. Base revisada:
`9800df525a4c6d2fe18692826384ca2667130b9f`; árbol limpio al comenzar.

**Causa confirmada: REST v2 se compuso exclusivamente para conocimiento sintético,
no para CCD. Además, su recuperación documental tiene una incompatibilidad real
con los permisos aprobados: el servicio consulta directamente `document_chunks`,
pero el rol runtime solo tiene EXECUTE de las funciones de búsqueda.**

La copia del entorno autenticado reprodujo HTTP 500/SQLSTATE 42501 antes de
generación. La comprobación de solo lectura en el origen confirmó el mismo fallo.
No se corrigieron permisos, SQL, contratos ni guardas. La integración queda
propuesta para decisión de Sala, no implementada ni aceptada.

## 1. Evidencia y comparación reproducible

Se reutilizó la batería **BCH-03/5.3**, no los resultados anteriores a sus
correcciones de T07 y ambigüedad. Archivo privado:
`data/ccd/evidence/increment-5/http-1792693227245.json`, SHA-256
`f1845ff6c4e2a88c95f6073de076b61679fb760750601b2371ff44031955823a`.
Su ejecución histórica fue el 22 de octubre, 13:18:48–13:20:27 de Bogotá:
43/43 turnos completados/persistidos y 329/329 controles técnicos. Se relee esa
evidencia; **no se declara una nueva batería HTTP CCD**.

Las comprobaciones R0 nuevas son:

- Inventario CCD dentro de `BEGIN READ ONLY`, sin consultar originales externos:
  tres releases; current `3d6cedac-0e86-40c8-909b-d3ff6e8ab741`, 12 documentos,
  12 chunks, 12 embeddings. Se verificaron contra SQL las 41 citas de 5.3 y los
  bytes/SHA-256 de las 24 versiones de artefactos depurados actuales e históricos.
- Snapshot desechable del entorno AUTH-P4-L1, preservando el corpus y el esquema
  ya instalado, sin ejecutar 001–008. Se excluyeron **todos** los datos auth y
  conversaciones/mensajes/citas del dump. Se restauraron ACL y propietarios de
  las dos funciones SECURITY DEFINER; se creó un deployment nuevo y dos cuentas
  de prueba con contraseñas aleatorias independientes, sin contactos reales.
- HTTP v2 real con AuthService, gates SQL y Document RAG de producto, sin doble de
  generador. Se intentó cada POST una sola vez y se consultó después el historial.
  No se envió un seguimiento después del fallo de su antecedente.
- Lectura directa del servicio de retrieval y de la función SQL ya autorizada,
  dentro de `BEGIN READ ONLY`, tanto en origen como en copia. Se usó un vector
  artificial no nulo de 1024 dimensiones: prueba de permisos, **no de relevancia**.

Evidencia técnica versionable:
[comparación](../../eval/integration/results/bch05-ccd-auth-r0-comparison.json),
[permisos reales](../../eval/integration/results/bch05-ccd-auth-r0-read-probe.json),
[inventario CCD](../../eval/integration/results/bch05-ccd-auth-r0-ccd-inventory.json).

La [matriz completa privada](../../data/ccd/evidence/auth-r0/matrix.md) y su
[JSON](../../data/ccd/evidence/auth-r0/matrix.json) incluyen **cada pregunta, corpus,
release, ruta, HTTP, respuesta completa, citas, tipo de evidencia y criterio
semántico explícito**. Permanecen ignorados porque contienen respuestas CCD.
El reporte bruto nuevo es `data/ccd/evidence/auth-r0/comparison.json`.

### Casos seleccionados y resultado

| Caso | Preguntas/objetivo conservados de 5.3 | CCD v1 histórico | v2 nuevo, conocimiento sintético |
| --- | --- | --- | --- |
| REG/1–6 | Catálogo; IA Generativa; «¿Y qué temas tiene?»; corrección a Marca Personal; duración de pruebas 202660; contacto CCD | 6 HTTP 201; siete syllabus; DOC-101, DOC-103, TEST_ORIENTATION y M12 según el turno; A | REG/1: router agent_fallback → RAG → HTTP 500 antes de generación; REG/2–6 NE |
| AMB/1–2 | Catálogo seguido de temas sin curso individual | 2 HTTP 201; segundo turno aclara cuál curso, sin citas/embedding/generación; A | AMB/1 HTTP 500; AMB/2 NE |
| AMB_FRESH | «¿Y qué temas tiene?» sin antecedente | HTTP 201, aclaración sin citas/embedding/generación; A | HTTP 201, misma clase de aclaración segura, persistencia verificada; no prueba acceso CCD |
| T02/1–3 | Prueba nueva no aprobada; pilar 202660; repetición gratis | 3 HTTP 201; U03 con límite histórico; B | T02/1 HTTP 500; T02/2–3 NE |
| T07/1–3 | Inasistencia; admisión posterior a primera fecha; intento gratis | 3 HTTP 201; insuficiencia sin citas U03/U04 ajenas; B | T07/1 HTTP 500; T07/2–3 NE |
| T11/1–3 | Dos solicitudes relatadas; posible derecho universal; reprobación posterior | 3 HTTP 201; dos abstenciones genéricas y U03 pertinente en tercero; C/parcialmente no demostrado | T11/1 HTTP 500; T11/2–3 NE |

A = orientación respaldada dentro del alcance; B = orientación parcial segura,
con regla pendiente; C = explicación incorrecta o no suficientemente demostrada.
Estas clases son revisión semántica histórica por escenario, no un indicador
derivado de presencia de citas. NE significa que falta respuesta/antecedente
evaluable; no se convierte en A, B ni PASS. La matriz conserva los textos para
revisión, incluida la limitación de T11.

V2: **18 turnos previstos, 6 intentados, 1 completado, 5 fallidos, 12 NE**.
Cinco llamadas de embedding de consulta y **cero llamadas de generación**.
Los cinco HTTP 500 son fallos operacionales, no una medición de mala respuesta del
modelo. La única aclaración correcta tampoco acredita cobertura documental.
El router inicial histórico no estaba registrado en todos los casos: su ruta en
la matriz se reconstruye con la traza/contadores y el código; no se presenta como
telemetría nueva. La ruta v2 sí se observó en esta ejecución.

El diagnóstico inicial detuvo conservadoramente todo escenario tras el primer
fallo: también dejó sin enviar REG/5 y REG/6, que son cambios independientes de
tema en 5.3. Son **no ejecutados por detención del escenario**, no dependencias
semánticas fallidas. Se corrigió el evaluador futuro para respetar las dependencias
explícitas de 5.3; no se repitió la batería ni se atribuye respuesta a esos dos casos.

### Repetición delimitada

Desde `backend/api`, con dependencias locales existentes:

```powershell
# Solo prepara un destino nuevo que no exista; restaura snapshot, no migraciones.
node --import tsx ../../eval/integration/ccd-auth-r0.mts
# Lecturas independientes; no hacen login, POST o generación.
node --import tsx ../../eval/integration/ccd-auth-r0-read-probe.mts
node --import tsx ../../eval/integration/ccd-auth-r0-ccd-inventory.mts
# Solo relee reportes y regenera la matriz privada/resumen público.
node --import tsx ../../eval/integration/ccd-auth-r0-report.mts
```

El primer comando rechaza destinos preexistentes; **no ejecutarlo otra vez contra
esta copia**. Su preparación inicial se detuvo antes de HTTP por ausencia de
configuración del generador. Una inspección acreditó cero sesiones/chats; se
continuó manualmente con `--resume-prepared`, que exige ese estado y valida ID y
etiqueta del contenedor. La receta del generador quedó fijada a la de 5.3; sus
clientes conservan comprobación de runtime/modelo. La continuación establece
contraseñas nuevas únicamente en las dos cuentas de la copia.

Hubo una sola batería HTTP. Se conserva `failure.json` del intento de preparación
y todos los errores de la batería. Su primer evaluador devolvió exit 0 aun estando
incompleto: se corrigió el código de salida para futuras ejecuciones, **sin repetir
la batería**, y no se acredita PASS por ese exit 0. El total real se obtiene de
estados/persistencia, no del código de salida.

Entorno nuevo: `banuchat-auth-r0-replay`, PostgreSQL
`127.0.0.1:55441`, base `banuchat_auth_r0_replay`, red propia sin masquerade,
volumen propio y deployment distinto. Imagen local `pgvector/pgvector:pg16`, sin
descarga. API temporal en loopback/puerto efímero, ya cerrada. Ollama local para
cinco embeddings de consulta; ningún embedding almacenado cambió. Configuración
técnica ignorada bajo `infra/local/ccd-auth-r0`, con ACL al operador; no se guardan
las contraseñas de las dos cuentas ni tokens en reportes.

Origen AUTH-P4-L1: base `banuchat_auth_p4l1_demo`, puerto 55440; current sintética
`6a770ce7-13b7-4b0b-95ae-0c193fa0d655`. Huellas separadas de corpus, auth e historial
coinciden antes/después; corpus de la copia idéntico. El probe posterior comparó
todas las tablas de cada base y tampoco produjo cambios. Los hashes se conservan
en los JSON técnicos. No se detuvieron servicios originales. El contenedor de la
copia quedó detenido tras verificar ID/etiqueta/volumen; sus datos quedan retenidos
para revisión. No se borraron contenedores, redes ni volúmenes.

## 2. Por qué cambiar solo el modo no funciona

| Componente | CCD anterior v1 | Autenticado actual v2 y bloqueo exacto |
| --- | --- | --- |
| Composición | main.ts selecciona demo_mode y evidencia ccd_local | authenticated-main.ts fija evidence_mode synthetic, raíz data/synthetic y rechaza nombres CCD y puertos 5432/55433 |
| Guardia de DB | assertCcdChatDatabase exige banuchat_ccd_dev, contexto CCD current y cero perfiles sintéticos | PgAuthStore.assertRuntime exige current banuchat-synthetic/synthetic=true y rechaza nombres CCD; además valida mínimos de rol/aislamiento |
| 006 | No instalada en CCD | Rechaza nombre/contexto/validador CCD, releases no sintéticas, más de un dataset y FK distinta de synthetic_profiles |
| 007/ámbito | No existe auth en CCD histórico | Rechaza CCD; runtime_scope fija base/deployment; resource_context exige grant synthetic, binding y release sintética |
| 008 | No instalada en CCD | También rechaza CCD; añade nombre sintético y contactos/retos privados; el administrador local depende de recovery_challenges aunque la entrega esté suspendida |
| Cuenta/perfil | ccd-local-demo es contexto técnico compartido | profile_bindings/versiones de 006 apuntan al dataset 1 y a synthetic_profiles; currentSession/provisioner hacen los mismos JOIN sintéticos |
| Conversaciones | 003 reemplazó la FK de apertura por ccd_demo_contexts | Conservan FK original synthetic_profiles; no puede insertarse ccd-local-demo en la base sintética sin cambiar esa relación |
| Propietario | No hay control por persona; UUID/contexto no autentican | conversation_owners + token, gate antes de generar y persist_turn al confirmar; compartir perfil no comparte historial |
| Dispatcher | Catálogo CCD → RAG; contacto antes fuera de alcance → RAG; progreso/calendario/anuncios quedan acotados | AuthenticatedResources.send fija demo_mode synthetic; create omite el tercer argumento y usa synthetic; fast paths leen tablas sintéticas |
| Recuperación | top_k 12; selección CCD, reglas U03/U04 y protección de ambigüedad | top_k 5 y política sintética; además SELECT directo de document_chunks sin SELECT concedido |
| Generación/citas | Prompt CCD, fuentes declaradas, caveats por fuente, catálogo por metadatos | Prompt sintético; sin selección/caveats CCD; proyecta URL a v2, pero artifact exige manifest synthetic=true |
| Release | Dataset 1 llamado banuchat-ccd-local, current propio | Dataset 1 llamado banuchat-synthetic, current propio; el mismo número no identifica el mismo corpus entre bases |
| Persistencia | Dos mensajes/citas atómicos; 409 si cambia current/ordinal | 007 conserva CTE, locks y validación de procedencia, añadiendo sesión/owner. Las FKs de cita/document_version/chunk son locales a esa base |
| Artefactos | Tres raíces por version_label, Markdown depurado, SHA-256 | Raíz sintética por defecto y filtro synthetic=true. Cambiar solo el pool deja rutas o permisos incompatibles |
| Mobile | EXPO_PUBLIC_DEMO_MODE=ccd_local, v1 local sin auth; IDs de la apertura en memoria, no autorización | synthetic usa v2, SecureStore/refresh y login; isCcdLocal activa el bypass histórico de auth, así que no sirve para el modo CCD autenticado |

Referencias: `backend/api/src/{main,authenticated-main,authenticated-runtime,ccd-runtime}.ts`,
`src/auth/{pg-auth-store,auth-service,resources,provision-account,local-password-administrator}.ts`,
`src/application/{conversations,messages,document-retrieval,document-query-retrieval,document-artifact}.ts`,
`src/chat/{chat-dispatcher,document-rag,document-evidence,conversation-context}.ts`,
`infra/db/001–008`, `mobile/src/{auth/runtime,config/api,config/demo-mode,app/_layout}.tsx/ts`.

AUTH-P2 ya había demostrado el error 42501 de locks; **ese problema se resolvió
en P2.1 mediante 007**, con executor separado. No corresponde quitar locks ni
otorgar UPDATE al runtime. El fallo R0 es otro: SELECT documental directo, en
`document-retrieval.ts`, que no usa las funciones de retrieval autorizadas.
La prueba real distingue ambos: `search_chunks_cosine` funciona y el servicio
falla en origen y copia. AUTH-P4-L1 declaró expresamente que no ejecutó benchmark
RAG ni capturó una generación individual; sus saludos, citas y apertura de documento
no acreditaban que este camino funcionara.

## 3. Componentes reutilizables y límites

| Reutilizar | Condición concreta |
| --- | --- |
| Releases CCD ya publicadas y configuración Qwen3, 1024/coseno/exacta | Conservar UUID, manifests/hashes, versiones y vectores en un snapshot autorizado; no volver a ingerir ni publicar |
| ccd_demo_contexts y FK CCD de 003 | Contexto técnico, no estudiante ni dueño; aprobar binding de cada cuenta a ese contexto y release |
| Document RAG y resolutor de conversación de 5.3 | Mismo motor, prompt, selección/correcciones, fuentes y caveats; reparar la superficie SQL de lectura mediante delta aprobado |
| Dispatcher CCD y catálogo de intenciones | Pasar modo CCD desde configuración confiable; no desde request/modelo; conservar abstención de datos personales |
| createConversation, sendMessage, detalle, listado, borrado | Parámetro de modo y gates adecuados; listado por owner antes de LIMIT; no reapropiar historial histórico |
| CTE de persistencia, triggers de cita, hashes y URLs | Misma base para corpus/chat/auth y misma release; proyección v2 y artefactos exactos, sin URL v1 anónima |
| AuthService, Argon2id, sesiones, refresh, cuotas, SecureStore | Adaptar selección de conocimiento/guardas, conservando las garantías de identidad y revocación; no confundir binding con persona |
| Evaluadores 5.3, casos T01–T12/REG/AMB y pruebas P2.1/P4 | Extender cobertura CCD autenticada y confirmar persistencia, sin perder fallos/NE ni atribuir resultados antiguos al entorno nuevo |

Inventario CCD verificado: M01/M12; siete syllabus DOC-098–104; TEST_ORIENTATION;
U03/U04. Current 12/12/12, previas 2/2/2 y 10/10/10: 24 versiones/chunks/vectores.
Solo se leen los derivados ya autorizados. No se usa CCD_DOCUMENTACION externo.

Permanecen sin resolver: gratuidad universal/repetición gratuita; elegibilidad de
continuos; homologaciones individuales y AND/OR contradictorios; tarifas, cupos,
matrícula automática, resultados personales, publicación/inmediatez de notas y
umbral de 70. Syllabus no acreditan oferta/periodo actual; contacto y lineamientos
202660 no tienen actualidad ratificada. T11 sigue con dos abstenciones genéricas.
No localizar una norma no prueba que el procedimiento relatado nunca existió.
La reparación de auth/lectura no amplía esa cobertura ni mejora por sí misma T11.

## 4. Diseño mínimo recomendado

**Un despliegue local autenticado CCD nuevo, aislado, con auth, conversaciones y
snapshot del conocimiento CCD en la misma base.** Un único corpus por despliegue;
sin selector enviado por el cliente y sin mezclar el current sintético con el CCD.
La propuesta exige autorización nueva para copiar el estado seleccionado; **R0 no
copia CCD**. El origen CCD y las cuentas/historiales sintéticos existentes se
conservan. El detalle SQL/REST está en
[deltas exactos propuestos](bch05-ccd-auth-r0-deltas.md).

```text
Mobile autenticado (Expo 57; access en memoria, refresh en SecureStore)
 → REST v2 local, modo fijo del despliegue
 → sesión + grant CCD + binding a contexto técnico + owner
 → servicios actuales → dispatcher ccd_local → Document RAG actual
 → retrieval SQL acotado → PostgreSQL/pgvector + Ollama local
 → nueva transacción: sesión/grant/binding/owner + release/ordinal/citas → commit
```

No intervienen N8N ni MCP en el camino conversacional; Agent/ReAct sigue pendiente.
N8N conserva únicamente su función asíncrona de ingesta ya existente.

Las cuentas siguen siendo demostraciones BanuChat con nombres sintéticos, sin
federación ni credenciales UNAB. El login no afirma matrícula/identidad universitaria.
El conocimiento CCD no convierte las cuentas ni sus datos en institucionales.
En esta primera integración CCD no se habilitan progreso/calendario/anuncios:
no existen expedientes en ese corpus; el despliegue sintético conserva esos datos
ficticios por separado. No se consulta la demo como fallback de una pregunta CCD.

Cada cuenta recibe grant de lectura y binding explícito al contexto CCD current;
dos cuentas pueden compartir ese contexto, **nunca el owner**. Crear chat y owner
es una transacción; token determina principal. Revalidar al entrar y al confirmar
el turno, conservando cuenta → sesión → conversación y los locks actuales de
release/ordinal. El modelo no recibe tokens. Revocación que gane antes de commit
impide escribir; cambio de release devuelve 409 sin reenvío. Chat ajeno/ausente
devuelve 404; sin sesión 401; sin grant/binding 403. No backfill de owners sobre
chats CCD históricos. Leer historia propia antigua no sustituye sus fuentes por
current y no permite continuar una release antigua.

### Opciones evaluadas

| Opción | Coste/riesgo | Decisión |
| --- | --- | --- |
| Cambiar evidence_mode o apuntar v2 a CCD | Bajo coste aparente; 006/007/008, guardas, FK, artefactos y Mobile siguen incompatibles | Descartada |
| Mantener v1 CCD detrás de un login de UI | No hay owner ni revalidación SQL por persona; UUID/contexto compartido sigue expuesto | Descartada |
| Incorporar CCD a la base sintética actual | Choca con un único dataset/current, FK y manifests sintéticos; mezclaría releases y procedencia; mayor delta de negocio | Descartada para este objetivo |
| Auth/historial sintético y CCD remoto con dos pools | Evitaría copiar CCD, pero FKs de citas/versiones no cruzan bases; requeriría nuevo almacén/contratos o coordinación de revocación/commit entre bases | Mayor coste y riesgo que un despliegue separado |
| Modificar la base CCD original para instalar auth | Menos almacenamiento; afecta el entorno/historial validado, exige rama DDL nueva y rollback operacional | No elegida para la primera integración |
| Snapshot CCD autorizado en instancia nueva + bootstrap auth compatible | Mantiene FKs locales, SQL explícito, motor RAG y aislamientos; coste de DDL/ACL nuevo y copia controlada comprobada por hash | Recomendada; requiere autorización, no realizada |

No hace falta adoptar ORM, vector DB adicional, proxy de identidad, MCP o N8N para
eludir guardas. Estas guardas protegían correctamente una política sintética;
deben reemplazarse por una política CCD explícita revisada, no eliminarse.

## 5. Cuenta, UID, correo y contraseñas

Se propone explícitamente `U` seguido de **ocho dígitos ASCII** para cuentas nuevas.
Las cuentas `BCH-DEMO-[0-9]{4}` existentes conservan UID, UUID, credenciales,
sesiones, bindings y propietarios. No se incorpora ningún UID real aportado en
privado. La nueva convención es de BanuChat y puede coincidir en forma con otros
identificadores; **no acredita identidad ni vinculación universitaria**.

La migración propuesta `009_demo_uid_convention.sql`, posterior a 008 en entornos
AUTH existentes, cambia exclusivamente el CHECK de formato. Sin backfill, rename
ni reasignación. Login/lectura aceptan ambos formatos; aprovisionamiento nuevo
emite solo U+8. Contrato, primitivas, consola y Mobile deben actualizarse juntos.
No se crea todavía ese archivo ejecutable: su SQL candidato está en el delta.

Contraseñas individuales: conservar Argon2id v19, salt aleatorio, coste actual,
política de establecimiento 15–128 puntos de código y denylist. El login conserva
su sintaxis actual 1–128 para no alterar la verificación. No contraseña compartida,
sin excepción de longitud, sin password en Git/argv/logs o AsyncStorage.

| Representación | Tratamiento propuesto |
| --- | --- |
| Correo académico ficticio mostrado | Primera integración usa dominio reservado bajo banuchat.test, calculado de UID sintético y marcado «simulado, sin verificación ni envío»; sin mailto, no contacto de recuperación |
| Contacto real de recuperación | Solo recovery_contacts de 008, privado/cifrado, consentimiento y verificación por su canal cuando otra tarea lo autorice; recuperación permanece suspendida en esta integración |
| accounts.recovery_email de 006 | Histórico reservado @banuchat.test; conservar valores existentes; no reutilizar como correo mostrado ni destinatario/fallback de recuperación |

No se elige un alias bajo `@unab.edu.co` para esta integración. Inventar la parte
local no demuestra inexistencia de un buzón real. Si Sala exige ese aspecto en una
tarea posterior, debe ser representación separada, etiquetada permanentemente
como simulada/no verificada/no enviable, sin mailto/registro en contactos/despachos;
las pruebas deben demostrar cero llamadas de entrega y ningún estado verified
desde ese dato. No bastaría un aviso temporal ni suspender hoy el proveedor.
El envío actual consume contactos verificados privados, no una representación
UI; cualquier cambio deberá mantener esa separación. No se emite ni verifica
ningún correo en R0.

## 6. Primera tarea implementable y esfuerzo

Propuesta para autorización: **BCH-05/CCD-AUTH-I1 — lectura documental protegida y
primer flujo CCD autenticado en copia aislada**. El orden de trabajo y criterios
de aceptación están en el delta. El primer bloque resuelve la incompatibilidad
SELECT/EXECUTE por una función acotada que conserve exactamente la consulta actual;
no se concede SELECT directo para hacer pasar la prueba. Luego bootstrap CCD nuevo,
sesión/grant/contexto/owner, citas/artefactos v2 y Mobile autenticado explícito.

No empezar copiando corpus ni aplicando 006–008 a CCD: esas migraciones abortan
correctamente. Revisar/autorizar primero las propuestas 009–011 y la revisión
contractual. Detener la integración si las condiciones o el resultado semántico
exigen ampliar corpus/reglas. UID y lectura pueden revisarse por separado, sin
exigir correo externo para recuperar CCD.

Estimación de ingeniería, **no medición ni compromiso de fecha**, un desarrollador
con snapshots/modelos locales disponibles:

| Trabajo | Esfuerzo |
| --- | --- |
| Conciliar lectura SQL/ACL y equivalencia del adaptador, pruebas aisladas | 1–1,5 días |
| UID compatible, contrato y validadores/consola | 0,5–1 día |
| Bootstrap CCD aislado, guardas, grants/bindings y persistencia por owner | 1,5–2,5 días |
| Mobile autenticado CCD, capacidades, avisos y fuentes | 0,5–1 día |
| Batería HTTP semántica/citas/propiedad y validación Android focal | 1–2 días |
| Total secuencial estimado | **5–8 días hábiles** |

Desplaza nuevos incrementos funcionales al menos ese bloque; agregar el tiempo de
revisión de Sala y disponibilidad de dispositivo/recursos. No hay cronograma con
fechas aprobado en esta tarea del que deducir una fecha final. T11/reglas pendientes,
correo externo, iOS completo, Agent/ReAct/MCP y despliegue institucional no están
incluidos. Esos pendientes no deben venderse como resueltos por la integración.

## 7. Validación ejecutada y límites de cierre

| Ejecución R0 | Resultado real |
| --- | --- |
| HTTP v2, seis escenarios seleccionados | 1/18 completado; 5 fallos, 12 NE; sin PASS semántico integral |
| A/B mismo perfil; GET/POST chat ajeno; GET anónimo | 404 / 404 / 401, reales en la copia |
| Servicio de retrieval frente a función autorizada, origen y copia, READ ONLY | Servicio 42501 en ambos; función existente devuelve una fila en ambos |
| Inventario/citas/bytes CCD READ ONLY | 3 releases; 41 citas y 24 versiones de artefacto comprobadas |
| Tests focales API: ccd-mode, conversation-context, document-evidence, document-rag, auth-primitives, auth-schema, auth-v2-contract | **85/85**; dobles donde corresponde, sin demostrar acceso documental runtime |
| conversation-evaluation.test.mts | **5/5**, contabilidad de fallos/NE/persistencia |
| TypeScript de los diagnósticos con opciones estrictas de API | Comprobado en cierre, sin relajar opciones |
| git diff --check y alcance | Comprobados en cierre |

Se compararon además las huellas de los **60 archivos protegidos** registrados
en AUTH-P4-L1: ninguna diferencia. La revisión de alcance encontró únicamente
los nueve archivos nuevos enumerados abajo. Los archivos nuevos también se
comprobaron con `git diff --no-index --check`, porque el diff normal no incluye
archivos sin seguimiento.

No se repitieron suite completa, DB-tests históricos, ingesta, generación CCD,
Mobile/Android/Expo Web, SMTP, N8N, MCP o pruebas costosas ya acreditadas. No se
midió latencia/calidad de generación; no hubo generación. No se cambiaron modelo,
timeouts o contexto para explicar el fallo de permisos ni se atribuye a cargas
del equipo. No hay nueva aceptación institucional o del equipo.

Archivos añadidos: este checkpoint, el documento de deltas, cuatro diagnósticos
`eval/integration/ccd-auth-r0*.mts` y tres JSON técnicos en
`eval/integration/results/bch05-ccd-auth-r0-*.json`. Evidencia con respuestas y
helpers/configuración privados permanece ignorada. No se modificaron archivos
preexistentes, contratos REST/MCP, SQL 001–008, corpus, manifiestos, releases,
embeddings almacenados ni historiales originales. Sin commit ni push.

**CHECKPOINT BANUCHAT — BCH-05/CCD-AUTH-R0: diagnóstico confirmado, comparación
documentada con fallos y NE, delta concreto propuesto. Implementación detenida
para revisión de Sala de Control. No avanzar automáticamente a otra etapa.**
