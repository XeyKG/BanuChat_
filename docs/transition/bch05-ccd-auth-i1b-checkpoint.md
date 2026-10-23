# CHECKPOINT BANUCHAT — BCH-05 / CCD-AUTH-I1B

Fecha: 2026-10-23. Autorización BCH-D37. Base verificada al inicio, limpia:
`8a85ff25291ca1a3b82ce4584de966f4fc802d14`. Sin commit ni push.

La integración CCD autenticada funciona en el laboratorio nuevo: **43/43 turnos
HTTP/PG/Ollama respondidos y persistidos, 216/216 controles automáticos**, después
del focal operativo de **18/18 y 91/91**. No constituye aprobación semántica completa:
se conservó una **regresión T01/2** frente a BCH-03/5.3 y **T11 sigue C, pendiente
académico**. Mobile está preparado; **Android no fue ejecutado por el agente**.
Se devuelve este checkpoint a Sala, sin iniciar I1C.

## Preflight y destinos reales

Se revisaron AGENTS, R0/deltas, I1A, BCH-03/5.3/evaluador, SQL 001–008/010,
composición v2/007, raíces de artefactos y Mobile autenticado. **010 es lectura
controlada sintética, con guardas que rechazan CCD; no se aplicó directamente a
CCD.** Su rechazo se comprobó transaccionalmente en la copia I1B, sin relajarla.

| Destino nuevo | Puerto exclusivamente loopback | Preparación |
| --- | --- | --- |
| `banuchat_ccd_auth_i1b_test` / contenedor `banuchat-ccd-auth-i1b-test` | 55443 | Snapshot CCD depurado; solo bootstrap 011 |
| `banuchat_auth_i1b_uid_test` / contenedor `banuchat-auth-i1b-uid-test` | 55444 | Copia sintética; 006/007/008, fixture legado, 009/010 |

Ambos tienen red y volumen Docker exclusivos, sin mounts históricos. El setup
rechaza nombres/redes/volúmenes existentes y comprueba identidad, labels, bind y
snapshot antes de migrar. No es un script de arranque idempotente: **no repetirlo
sobre los laboratorios preparados**. No se copió ningún historial, principal,
credencial o sesión de los despliegues fuente. No hubo ingesta, publicación,
reembedding, cambio de vectores o acceso a sitios institucionales.

Fuentes leídas: CCD `banuchat_ccd_dev` en 55433 y demo original en 5432. Las
huellas completas de corpus e historiales antes/después coinciden; la auditoría
final volvió a leerlas con `default_transaction_read_only=on`. No se accedió ni
migró AUTH-P4-L1, R0 o I1A. No se usó `CCD_DOCUMENTACION`.

## 011 y estado de 009

[011](../../infra/db/011_ccd_authenticated_bootstrap.sql) es una rama explícita
sobre el negocio CCD 001–005, no una ejecución secuencial de 006–010. Conserva
identidad, credenciales, sesiones/refresh, cuotas, owners, revocación y recuperación
estructural compatibles. Se compararon en PostgreSQL columnas, tipos, defaults y
constraints de doce tablas comunes contra la nueva copia sintética; el oráculo
`test/auth-i1b/bootstrap-source.ts` comprueba el archivo completo y la CTE de
persistencia es literalmente la de 007.

Diferencias semánticas justificadas y comprobadas:

- UID legado o U+8 ASCII, sin renombrar cuentas/UUID.
- Bindings limitados al contexto `ccd-local-demo`; la FK de versiones apunta a
  `ccd_demo_contexts`, sin cambiar la FK de negocio existente.
- Grants exclusivamente `ccd_local`; scope incluye modo y nombre del dataset CCD.
- `resource_context` y recuperación limitada verifican dataset CCD, manifiesto
  `synthetic=false` y release current ready. Retrieval conserva columnas, orden,
  distancia coseno, dimensión 1024 y top-k 1–20; excluye `full_document`.
- Se añade lectura del contexto técnico al executor; provisioner recibe lectura
  limitada de contexto/scope y conserva prohibición de acceso a verificadores.

Las tres funciones privilegiadas tienen propietario executor NOLOGIN,
SECURITY DEFINER, `search_path=pg_catalog,banuchat_auth,pg_temp`, referencias
calificadas y EXECUTE sin PUBLIC. Runtime no tiene SELECT general ni por columna
de `document_chunks`, UPDATE de corpus/conversations, DDL o membresía executor.
Outsider y SET ROLE se rechazan; release histórica/desconocida, dimensión y top-k
inválidos fallan según el contrato. Bootstrap repetido rechaza sin mutación.
Estas fronteras no protegen frente a compromiso del administrador/rol técnico API.

[009](../../infra/db/009_demo_uid_convention.sql) **se aplicó realmente solo a la
copia sintética nueva**. Destino/deployment, constraint previo y datos existentes
se verifican antes de ampliar el CHECK. No hace UPDATE/backfill. El fixture legado
conservó principal/UID; login legado y U+8 se verificaron por HTTP en esa copia.
No aplicarla a AUTH-P4-L1. 001–008/010 conservan sus bytes y guardas.

## REST v2 y Mobile

[OpenAPI v2](../../backend/api/openapi-v2.yaml) y
[contrato semántico](../../backend/api/api-contract-v2.md) pasan a **4.0.0**, con el
mismo prefijo `/api/v2` y quince operaciones. `GET /auth/me.evidence_mode` es
obligatorio: `synthetic` conserva seis capacidades; `ccd_local` declara exactamente
`chat,history,documents`, contexto técnico y alias sin identidad institucional.
Mensajes/citas mantienen sus schemas y URLs v2. UID admite U+8 y legado canónicos,
incluido rechazo de Unicode parecido, espacios y saltos finales.

El backend elige modo/release desde configuración confiable/scope. HTTP no admite
selectores de corpus/perfil/owner. Crear, enviar y leer detalle reciben ese modo;
se reutilizan servicios de aplicación, router, selector CCD, generador, citador,
transacciones y adaptador I1A. Progreso/calendario/anuncios CCD dan 403 tras
autenticar. No hay rutas v1, registro público o fallback de corpus sintético.
El rechazo de modo incompatible se comprobó contra el scope CCD real.

Mobile añade `ccd_authenticated`, separado de `ccd_local`/v1 y `synthetic`.
Usa Bearer v2, owner histories, refresh/logout y SecureStore con namespace CCD por
URL. Solo persiste refresh; access queda en memoria. Valida modo/contexto/capacidades
de `me` y rechaza incompatibilidades sin fallback. Se conserva onboarding/diseño,
adaptando textos y sugerencias; aviso visible de cuenta ficticia y material local
sin aval/actualidad ratificada. Funciones personales ocultas y protegidas en router.
No se migró Expo 57/React Native ni se generó Android/iOS nativo.

## Cuentas, sesiones y propiedad

Dos cuentas CCD **activas**: `U08000001` Alba Ficticia CCD y `U08000002` Bruno
Ficticio CCD. Contraseñas aleatorias independientes de 40 caracteres, Argon2id
con coste aprobado; contexto técnico compartido y owners individuales. No se usó
UID real. Campo técnico histórico exclusivamente `@banuchat.test`; cero contactos
verificados, envíos o activación de recuperación.

Custodia local: configuración técnica ignorada por Git y ACL del operador;
credenciales cifradas DPAPI CurrentUser en
`infra/local/auth-i1b/operator-accounts.dpapi`. No se imprimieron contraseñas en
herramientas/chat ni se incorporaron a archivos versionables. El operador puede
consultarlas personalmente con el comando explícito del runbook. No hay contraseña
compartida o entrega pública.

HTTP real verificó login/me/refresh/logout; access anterior a refresh y posterior
a logout: 401. B→A y A→B: GET/POST/DELETE ajenos 404, listas excluyen terceros;
borrado propio 204 y posterior detalle 404. Chat histórico insertado como fixture
sin owner: 404, sin apropiación por contexto. Creación con selectores: 400.
Anónimo protegido: 401; v1: 404; recursos personales CCD: 403.

Revocación focal: se completó una generación real reteniendo su retorno antes de
persistir; el administrador obtuvo lock de cuenta NOWAIT y revocó la sesión;
el POST terminó 401 con **cero mensajes parciales**. No se mantuvo lock de cuenta
durante Ollama. El caso no simula aprobación Android ni tolerancia a todos los
posibles fallos de infraestructura.

## Evidencia real y comparación con BCH-03/5.3

| Ejecución final | Turnos | Controles automáticos | Evidencia |
| --- | --- | --- | --- |
| Focal T02/T07/T11/REG/AMB/AMB_FRESH | 18/18 completos | 91/91 | [focal](../../eval/auth/results/bch05-ccd-auth-i1b-focal.json) |
| Integral, mismo guion de 5.3 | 43/43 completos | 216/216 | [full](../../eval/auth/results/bch05-ccd-auth-i1b-full.json) |
| Equivalencia/permisos/UID/cuentas SQL | 7 subpruebas, 8 contando padre | 0 fallos | [SQL](../../eval/auth/results/bch05-ccd-auth-i1b-sql.json) |
| Compatibilidad sintética HTTP, ambos UID | login/me/chat vacío/progreso/refresh/logout | aprobada; sin RAG sintético adicional | [regresión](../../eval/auth/results/bch05-ccd-auth-i1b-synthetic-regression.json) |
| Fronteras HTTP adicionales | propiedad A→B, borrado y artefactos | aprobadas | [boundaries](../../eval/auth/results/bch05-ccd-auth-i1b-boundaries.json) |

Integral: **39 embeddings de consulta, 39 llamadas a retrieval y 31 generaciones
reales**, cero 503. Catálogo/abstenciones/aclaraciones conservan sus vías CCD;
AMB y AMB_FRESH aclaran sin embedding/SQL documental/generación. No hubo retry
automático de POST. Los controles de esta adaptación tienen contabilidad distinta
a los **329/329 de 5.3**; no son 329 controles reejecutados.

Mismo `qwen3:4b-instruct`, digest
`0edcdef34593eac1aa2be9c7d06c432dcf81945adca5eca2f27662c18f168ba0`, Ollama
0.35.0, temperatura 0, 256 tokens, think/stream false y keep_alive 5m. Embeddings
`qwen3-embedding:0.6b`, 1024 dimensiones. No se cambiaron prompts, selector,
modelos, top-k o parámetros para mejorar resultados. No se afirma igualdad de
todos los inputs temporales/runtime ni determinismo de la generación.

La comparación inspeccionó las **43 respuestas**: texto idéntico en 34/43,
localizadores citados e insuficiencia iguales en 42/43. Selección observada al
entrar al generador: 31/31 igual; doce turnos sin generación no tienen observación
equivalente a la instrumentación histórica. Se verificaron **40 citas** integrales
contra release/localizador/hash de chunks/versiones; 5.3 tuvo 41.

| Escenarios | Clase observada frente a 5.3 | Límite |
| --- | --- | --- |
| T01 | **B → C** | T01/2 perdió explicación parcial de TEST_ORIENTATION y cita; los tres turnos son abstenciones genéricas. Regresión de utilidad, causa no establecida. |
| T02–T06 | B → B | U03/U04 pertinentes; no gratuidad, equivalencia o expediente automático. T02/3 inicia con «No, no se acredita»; conservar para revisión de su alcance, sin inferir imposibilidad universal. |
| T07–T09 | B → B | Abstención por inasistencia, distinción prueba/curso y límites por modalidad/cohorte; procedimientos concretos pendientes. |
| T10a/T10b | A → A | Aclaraciones aisladas; sin memoria ajena. |
| T11 | **C → C, pendiente académico** | Primeros dos turnos genéricos no explican los casos ni distinguen hipótesis/derecho universal; U03 del tercero no resuelve ese límite. |
| T12 | B → B | Contacto M12 histórico acotado; notas, inmediatez y umbral 70 sin respaldo suficiente. |
| REG, AMB, AMB_FRESH | A → A | Fuentes pertinentes, corrección a Marca Personal y advertencias; ambigüedad sin atribución arbitraria. |

Esta es revisión cualitativa del agente, **no aval académico/CCD**. No se alteró la
rúbrica de T11 ni se repitió el integral para esconder T01/2. Comparación saneada:
[comparison](../../eval/auth/results/bch05-ccd-auth-i1b-comparison.json). Textos
completos y cotejo permanecen privados/ignorados en `data/ccd/evidence/auth-i1b/`;
integral `full-1792769823958.json`, SHA-256
`73dcbae6ba92aec7fb0fb412d8f0bb29c3934b71bcbc7dc784c77afb06bfbdd2`.
Baseline 5.3 `http-1792693227245.json`, SHA-256
`f1845ff6c4e2a88c95f6073de076b61679fb760750601b2371ff44031955823a`.

## Defectos reales y conservación de intentos

1. Primera construcción de 011 falló con SQLSTATE 42601: un reemplazo JavaScript
   interpretó `$'` del patrón SQL como texto especial e insertó DDL duplicado.
   La transacción revirtió completa. Se corrigió con callback, se comprobó ausencia
   de auth/historias y snapshot íntegro antes de reanudar solo el destino nuevo.
   Fallo conservado en `infra/local/auth-i1b/setup-failure-1792768352978.json`.
2. Primer focal no pudo leer detalle CCD porque `AuthenticatedResources.detail`
   omitía el modo y tomaba relación sintética por defecto. Se corrigió pasando
   el modo al servicio existente. Ningún turno del guion llegó a enviarse en ese
   intento; reporte [focal-first](../../eval/auth/results/bch05-ccd-auth-i1b-focal-first.json).
3. Segundo focal completó los 18 turnos pero su fixture de revocación usó una
   referencia ambigua sin antecedente: hubo aclaración, no generación. Se conservó
   [focal-race-fixture](../../eval/auth/results/bch05-ccd-auth-i1b-focal-race-fixture.json)
   y se usó la primera pregunta exacta T02 para alcanzar generación en el focal
   final. No es un fallo de revocación demostrado ni un retry de POST incierto.
4. La revisión final añadió longitud exacta de UID en validadores/schema para
   conservar rechazo de saltos finales al ampliar a dos formatos; regresiones
   canónicas ejecutadas. Los errores de invocación del harness (cwd Git, primera
   asignación frente a cuenta activa) se corrigieron antes de acreditar auditoría
   y regresión sintética; no cambiaron reglas de producto.
5. **T01/2** es una diferencia de calidad real conservada; **T11** sigue sin
   orientación académica suficiente. Ninguna recibió ajuste de contenido.

## Integridad, artefactos y pruebas locales

Current sigue `3d6cedac-0e86-40c8-909b-d3ff6e8ab741`, 12 versiones/chunks/vectores.
Históricas `5834fc47-57c5-498b-98fc-4190330155e4` (2) y
`fb8538af-3280-4a1b-889c-a27564381996` (10). Total **24/24/24**, tres releases,
manifiestos/pipeline/configuración, filas/vectores y contextos íntegros. Corpus CCD
SHA-256 antes/después `db29ad53062ee400a367fb4a16b4c5cc2f9c178cb1333e29dab29fe12a449963`.

Se descargaron y comprobaron por SHA-256 los 24 artefactos current/históricos
en cada batería final, desde las tres raíces depuradas por `version_label`.
Anónimo 401, versión desconocida 404, query de ruta externa 400 y v1 404. No se
sirven originales externos, rutas arbitrarias o current sustituyendo historia.
El runtime CCD tiene cero perfiles sintéticos; corpus, scope y función acotan la
fuente. SQL de retrieval se comparó realmente con la consulta original.

Comandos ejecutados desde `backend/api`:

- `npm run typecheck` y `npm run build`: aprobados.
- `npm run test:auth`: **27/27**.
- `node --import tsx --test test/authenticated-document-retrieval.test.ts test/conversation-detail.test.ts`: **26/26**.
- `node --import tsx --test test/auth-i1b-sql.mts`: **8/8 contando padre**; ejecución
  inicial única que aprovisiona fixtures. Su título sobre UID nuevo era más amplio
  que esa aserción de login; ambos logins quedaron acreditados separadamente en
  `auth-i1b-regression.mts` por HTTP real.
- Setup, regresión sintética, boundaries y auditoría I1B: ejecutados realmente.
- Evaluador focal/integral y revisión comparativa desde la raíz, con el loader tsx
  local; no `test:db` genérico ni reinicio de entornos históricos.

Desde `mobile`: `npm run typecheck`, `npm run test:local` (**20/20**) y
`npm run lint`: aprobados. No se acredita render/gestos/SecureStore de dispositivo
con estos tests. No se ejecutaron pruebas Android, ADB o Expo Go.

Auditoría final: [audit](../../eval/auth/results/bch05-ccd-auth-i1b-audit.json),
**161 archivos protegidos sin cambios**, incluyendo 001–008/010, corpus sintético,
schemas CCD, RAG, prompts/generación/retrieval, v1 y MCP. Escaneo de archivos
versionables sin credenciales técnicas ni las dos contraseñas CCD. `git diff --check`
y revisión de alcance forman parte del cierre; no cambios fuera de I1B.

## Archivos y operación posterior

| Área modificada/añadida | Archivos |
| --- | --- |
| SQL | `infra/db/009_demo_uid_convention.sql`, `011_ccd_authenticated_bootstrap.sql`, `auth-permissions.md` |
| API/contrato | `backend/api/{README.md,api-contract-v2.md,openapi-v2.yaml}`; `src/auth/{knowledge-mode,auth-service,pg-auth-store,primitives,provision-account,local-password-administrator,resources}.ts`; `src/{admin-local-account,authenticated-main,authenticated-runtime}.ts` |
| Pruebas/evidencias | `backend/api/test/auth-i1b*.mts`, `test/auth-i1b/`; ajustes en `auth-{handlers,primitives,v2-contract}.test.ts`; `eval/integration/ccd-auth-i1b*.mts`; `eval/auth/results/bch05-ccd-auth-i1b-*.json` |
| Mobile | `README.md`; `src/config/demo-mode.ts`; `src/auth/{auth-session,native-store}.ts`; pantallas `_layout,home,index,login,chat,history,document`; `test/{auth-session,ccd-authenticated}.test.ts`; `scripts/start-ccd-auth.ps1` |
| Entrega | Este checkpoint y `docs/operations/ccd-auth-i1b-android.md` |

[Runbook Android](../operations/ccd-auth-i1b-android.md): arranque de API loopback
3003 y Metro localhost 8084 mediante configuración pública de proceso, consulta
personal de credenciales DPAPI, ADB reverse realizado por el usuario, guion exacto
de 18 turnos y formato de respuesta/cita/defecto. No modifica `.env.local`, no abre
LAN/Internet ni sustituye SecureStore por preview web. APIs temporales de las
baterías quedaron cerradas; no se arrancó Metro para una supuesta prueba Android.
Se conservan contenedores/volúmenes I1B; no se eliminó ningún recurso histórico.

Sala debe revisar T01/2 y T11, recibir la validación personal Android y decidir
custodia/retención de credenciales y evidencias, actualización explícita de clientes
al contrato 4.0.0, TLS/distribución y reglas académicas pendientes. Material local
no ratifica actualidad, beneficios o derechos institucionales. I1C, unificación con
progreso/calendario sintético, Agent/ReAct, MCP conversacional y N8N síncrono no se
iniciaron. **Detenerse para revisión de Sala de Control.**
