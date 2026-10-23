# CHECKPOINT BANUCHAT — BCH-04 / AUTH-P1

Fecha: 2026-10-22. Base inspeccionada: `afaa5fe0ed86642dee98afadeec1b0b74e4603e7`; árbol limpio al iniciar. Se mantiene OE1–OE6. Las cuentas son permanentemente sintéticas; no hay integración institucional UNAB implementada o autorizada.

## 1. Resultado

**Fase A superada en PostgreSQL real antes de implementar el núcleo.** 001 y 006 se aplicaron en instancia nueva exclusiva de AUTH-P1. 006 no necesitó cambios. Después se implementaron núcleo, repositorios, transacciones y cuatro handlers separados; no se montaron en el servicio compartido ni se conectó Mobile.

Se acreditan los casos internos y las pruebas indicadas abajo. **No se declara login operativo para usuarios finales**: faltan protección de recursos/conversaciones AUTH-P2, recuperación y buzón AUTH-P3, transporte HTTP integrado/TLS y Mobile AUTH-P4. No se inician esos incrementos, M02 o A01.

Evidencia depurada: [bch04-auth-p1.json](../../eval/auth/results/bch04-auth-p1.json). Composición y reproducción: [auth-core.md](../../backend/api/auth-core.md).

## 2. Entorno real y validación SQL

Preflight Docker: PostgreSQL sintético existente en 127.0.0.1:5432, CCD en 127.0.0.1:55433 y contenedor N8N detenido; ocho volúmenes preexistentes. No se conectó a esas bases ni se cambiaron sus contenedores, permisos o datos.

| Comprobación real | Resultado |
| --- | --- |
| Imagen local reutilizada, sin pull | `pgvector/pgvector:pg16`, ID completo en evidencia |
| Motor / extensión | PostgreSQL `16.15 (Debian 16.15-1.pgdg12+2)` / pgvector `0.8.6` |
| Destino exclusivo | Contenedor `banuchat-auth-p1-20261022`, base `banuchat_auth_p1_test`, puerto **127.0.0.1:55435** |
| Aislamiento de almacenamiento | tmpfs de 256 MiB; cero mounts/volúmenes de datos existentes |
| Red | Bridge dedicado sin masquerade y con un único miembro; solo loopback publicado. La opción `--internal` inicial no publicaba el puerto en Docker Desktop: se sustituyó **antes de ejecutar SQL**, retirando solo el recurso de esta tarea |
| Esquema inicial | 001 leído/aplicado sin edición; todos los triggers activos |
| Fixture nueva | Un perfil ficticio y una release sintética ready/current publicada por la función existente; configuración/run/item explícitamente de prueba. Cero documentos, chunks, embeddings o historiales copiados; sin Ollama/ingesta de corpus |
| Migración auth | 006 aplicada con target exacto en la misma conexión; once tablas y dieciséis FKs validadas, índices y dominios comprobados |
| Checks de fase A | **17 comprobaciones aprobadas**; rechazos reales P0001, 23514, 23505 y 23503, con savepoints/rollback y ausencia de objetos parciales en los targets rechazados |
| Mismo perfil / propiedad | Dos cuentas pueden compartir perfil; segunda relación de owner para el mismo chat rechazada por PK, consulta filtrada por principal no devuelve el chat ajeno. No se infiere ownership desde perfil |
| Borrado/rollback de fixture | RESTRICT impide borrar cuenta referenciada; DELETE del chat de prueba elimina solo su owner por cascada; rollback deja auth vacío al terminar fase A |
| Roles técnicos | `auth_p1_runtime` y `auth_p1_provisioner`, sin superusuario/DDL/membresías. Rechazos 42501 comprobados para DDL, acceso indebido a hashes/historial, TRUNCATE y escrituras no concedidas |

Los roles y las revocaciones PUBLIC se hicieron **solo en el clúster nuevo temporal**, nunca en el compartido. El runtime recibió UPDATE(updated_at) sobre cuentas porque PostgreSQL exige privilegio UPDATE para bloquearlas con SELECT FOR UPDATE; no recibió facultades de cambiar UID, estado, auth_version o credencial por adelantado. El aprovisionador no puede leer/escribir hashes y no tiene acceso a conversaciones.

No se modifica el DDL para hacer pasar fixtures. Las primeras pruebas de deshabilitación detectaron dos evaluaciones distintas de clock_timestamp que podían invertir el orden updated_at/disabled_at; se corrigió la fixture para capturar un único instante en CTE, conservando los CHECK de 006.

## 3. Casos implementados y límites

| Caso | Implementación / evidencia |
| --- | --- |
| Cuentas sintéticas y aprovisionamiento | UID/formato/correo reservados; cuenta pending_password, binding/aprobación y permiso/auditoría atómicos. Sin signup, contraseña común, activación pública ni token inicial enviado |
| Hash/verificación | Argon2id real: m19456 KiB/t2/p1, salt aleatoria de 16 bytes y salida de 32 bytes. Salts diferentes, password correcto/incorrecto y límites de coste/concurrencia probados |
| Compatibilidad PHC | node-argon2 0.45.0 emite `m,p,t`; adaptador normaliza representación a `m,t,p` y la biblioteca verifica el mismo hash. **006, v2 y sus restricciones permanecen intactos** |
| Login | UID ficticio y contraseña propia; dummy hash real para ausente/pendiente/deshabilitada; 401 genérico. Hash fuera de transacción, después revalidación bajo lock de cuenta de estado/hash/auth_version |
| Sesiones / principal | Access/refresh CSPRNG independientes, solo digests SHA-256 almacenados; principal interno inmutable derivado en servidor. Me proyecta solo DTO v2 propio, sin correo, hash o estado interno |
| Expiración y versión | Access 900 s, inactividad 86400 s, absoluto 604800 s; igualdad al vencimiento denegada. Cuenta disabled, versión modificada y deployment distinto invalidan acceso |
| Refresh | Cuenta→sesión→token, sucesor y rotación atómicos; access anterior inválido. Replay revoca familia y confirma esa revocación antes de devolver 401 |
| Logout | Revocación en servidor antes de éxito; access y refresh de esa sesión dejan de funcionar |
| Abuso | Contadores PostgreSQL persistentes, ventanas UTC/HMAC por dominio; cuotas iguales para UID conocidos/ausentes. Sobreviven a crear otra instancia del core; denegaciones no revierten contadores |
| Handlers | Login, refresh, me y logout con framing/JSON/errores/caché/DTO v2; invocación directa con core real y schemas. No hay listener, montaje de rutas o bypass v1 |

El aprovisionamiento operativo deja cuentas pendientes: establecimiento inicial/recuperación mediante token y buzón corresponde a AUTH-P3. Las cuentas activas de las pruebas se preparan exclusivamente mediante fixture administrativa en la instancia aislada, con hash real y transacción; esa fixture **no** es un endpoint o vía de activación del producto.

Las interfaces PasswordHasher, AuthClock, tokens/digests, PgAuthStore y PgTransactionRunner permiten añadir recuperación sin reemplazar identidad/sesiones. No se implementaron un transporte no-op que simule entrega, SMTP, proveedor externo, deep links ni lógica de reset completa.

La prueba SQL de ownership acredita claves/filtro y ausencia de adquisición implícita, no equivale a autorización REST de conversaciones implementada. Los roles P1 tampoco reciben permisos de escritura de historial/owners. Esos cambios esperan AUTH-P2.

## 4. Transacciones y concurrencia acreditadas

- Una conexión PostgreSQL reservada por transacción; commit/rollback y release garantizados, conexión descartada si rollback falla. Dobles prueban la secuencia; PostgreSQL comprueba atomicidad de filas reales.
- Carrera login/cambio de credencial: mientras el verificador está detenido, otra conexión obtiene FOR UPDATE NOWAIT, reemplaza hash e incrementa versión. Login previo termina 401 y no crea sesión; login con nueva contraseña sí funciona. No hay locks durante Argon2.
- Dos refresh concurrentes sobre el mismo secreto: exactamente uno emite pareja; el otro detecta consumo/replay y revoca la familia. La pareja ganadora queda inválida por esa revocación, conforme a la política sin período de gracia.
- Logout, replay y auth_version invalidan accesos ya emitidos. La denegación tras replay conserva su commit; no se pierde por un rollback de error de aplicación.
- Fallo real de permisos al insertar auditoría, después de intentar crear sesión/refresh, revierte la transacción completa y deja cero sesiones para esa cuenta. El permiso de la identidad temporal se restablece al finalizar el caso.
- Reloj controlado aplicado al core con filas PostgreSQL reales comprueba frontera de access, refresh, inactividad y absoluto. No cambia el reloj del servidor ni los datos originales.

No se han probado carreras con persistencia de mensajes protegidos o reset completo porque esas operaciones no se integran en AUTH-P1. Se mantiene la sentencia atómica y los gates de release/ordinal/citas existentes sin edición; AUTH-P2 deberá incorporar la revalidación de sesión/owner antes del commit.

## 5. Pruebas realmente ejecutadas

Desde `backend/api`:

| Comando / instrumento | Resultado final |
| --- | --- |
| `npm run test:auth:sql` | **17 checks SQL aprobados** en PostgreSQL aislado; 001/006 aplicados realmente |
| `npm run test:auth:roles` | Roles limitados y rechazos efectivos 42501 aprobados, solo instancia de prueba |
| `npm run test:auth:db` | **14/14 tests aprobados**, trece subcasos y el caso agrupador; SQL/transacciones/carreras/core real y handlers invocados directamente |
| `npm run test:auth` | **27/27 aprobados**: doce casos nuevos de unidad/handlers y quince de contratos/estructura AUTH-P0 conservados |
| Regresiones focalizadas descritas abajo | **177/177 aprobadas**, sin fallos/omitidas/canceladas; dependencias de datos/generación simuladas y HTTP loopback de prueba |
| `npm run typecheck` | Aprobado, incluyendo los nuevos tests `.mts` |
| `npm run build` | Aprobado; sin activar procesos del API |
| `git diff --check` / enlaces / scope | Revisados al cierre; archivos protegidos sin cambios |

Regresiones ejecutadas con `node --import tsx --test` sobre `pg-client`, `profiles-conversations`, `http-api`, `main`, `messages`, `conversation-detail`, `conversation-history`, `delete-conversation`, `runtime-config`, `openapi-contract` y `ccd-mode`, archivos `.test.ts` existentes. No son una evaluación nueva RAG/Ollama ni validan infraestructura universitaria.

La primera ejecución HTTP dentro del contexto restringido falló en loopback y quedó esperando; se detuvo exclusivamente su árbol de procesos, identificado por línea de comandos exacta. La repetición con acceso loopback permitido pasó completa. Los errores iniciales PHC y timestamps condujeron a las correcciones indicadas; el PASS corresponde a las ejecuciones finales, no a intentos fallidos o checks estáticos usados como reemplazo de SQL.

## 6. Archivos

Modificados:

- `backend/api/package.json` y `package-lock.json`: argon2 0.45.0 fijado y scripts explícitos auth/SQL/roles/DB; ninguna prueba DB se activa por `npm test` normal.
- `backend/api/tsconfig.json`: incluye los tests `.mts` para validación estricta; build sigue incluyendo únicamente src.

Añadidos:

- `backend/api/src/auth/{primitives,pg-auth-store,rate-limiter,auth-service,provision-account}.ts`.
- `backend/api/src/data/transaction.ts` y `backend/api/src/http/auth-handlers.ts`.
- `backend/api/test/auth-primitives.test.ts` y `auth-handlers.test.ts`.
- `backend/api/test/auth-p1-phase-a.mts`, `auth-p1-roles.mts`, `auth-p1-db.mts`, `auth-p1/environment.ts` y `auth-p1/fixture.sql`.
- `backend/api/auth-core.md` y `infra/auth-p1-test-environment.ps1`.
- `eval/auth/results/bch04-auth-p1.json` y este checkpoint.

Los archivos generados de conexión/secretos y reportes locales quedaron bajo `infra/local/auth-p1`, ignorado de antemano por Git. Solo se publica la evidencia depurada, sin contraseñas/tokens/hashes de credencial/correos o payloads privados. No se incorpora un framework agéntico, ORM, servicio cloud o proveedor de correo.

## 7. Integridad, limpieza y pendientes

**Sin cambios en REST v1/v2, MCP, SQL 001–006, migraciones CCD, backend conversacional/RAG, Mobile, datasets/corpus, releases, manifiestos o embeddings originales.** Se comprobó el diff de esas rutas contra HEAD. Nunca se abrió conexión SQL a las bases originales; no se afirma una auditoría runtime de sus filas o huellas. T11/U03/U04 conservan comportamiento y límites; no se les atribuye un PASS semántico nuevo.

Tras guardar evidencia, se verificaron IDs, labels, tmpfs, ausencia de mounts y único miembro de red y se retiraron **solo** el contenedor/red temporales y su archivo generado de credenciales. La fixture existía en tmpfs y se descartó con ese contenedor. Los tres contenedores originales y los ocho nombres de volumen preexistentes permanecen; no se usó prune ni se eliminó volumen alguno. Estado de limpieza e inventario final constan en el JSON de evidencia.

Preparación para AUTH-P2: núcleo y principal reutilizables, contrato/migración acreditados en fixture aislada. Pendientes autorización de recursos y ownership en aplicación, grants de historial estrictamente necesarios, revalidación antes de persistir mensajes, adaptador HTTP con lectura acotada/parser y despliegue sin v1 anónima. No activar una instancia parcial.

Preparación para AUTH-P3: tipos/estado/verificadores y transacciones reutilizables. Pendientes consumo único del reset/establecimiento con revocación total, cuotas de recuperación, puerto de notificación/transporte, buzón y custodia local, despacho acotado e integración de errores de entrega. Cuentas pendientes no se activan por sí solas.

Otros límites: coste/capacidad de hashing y cuotas requieren calibración del entorno final; lista local de contraseñas débiles debe revisarse en AUTH-P3; binario Argon2 de despliegue Linux, TLS, permisos efectivos del destino futuro, Mobile y usabilidad no acreditados aquí. El bloqueo M01.2 del clúster compartido sigue independiente, sin workaround mediante superusuario o cambio PUBLIC. Ninguna integración UNAB/CCD real o dependencia institucional se inventa.

Sin commit ni push. **Detención para revisión de Sala de Control; no iniciar AUTH-P2/P3/P4, M02 o A01 automáticamente.**
