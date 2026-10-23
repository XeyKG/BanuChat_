# AUTH-P1 — Núcleo interno de autenticación

Actualización AUTH-P2.1: el núcleo se reutiliza en una composición exclusiva v2
con nueve operaciones protegidas. Véase [resources](src/auth/resources.ts),
[composición](src/authenticated-runtime.ts) y [checkpoint AUTH-P2.1](../../docs/transition/bch04-auth-p21-checkpoint.md).
Los apartados AUTH-P1 siguientes conservan el alcance histórico de ese incremento.

Implementación para cuentas **permanentemente sintéticas**, UID ficticio y contraseña propia BanuChat. Contrato: [REST v2](api-contract-v2.md) y [OpenAPI](openapi-v2.yaml), sin modificaciones. No valida contraseñas/identidades UNAB. AUTH-P1 no monta rutas, modifica `main.ts`, conecta Mobile ni activa recursos protegidos/parcialmente protegidos.

## Composición y comportamiento

- [AuthService](src/auth/auth-service.ts): factory explícita, login, access→principal interno, refresh rotatorio/replay, logout y sesión actual. Requiere Pool runtime limitado, nombre de base esperado, deployment UUID estable y clave HMAC ≥32 bytes por entorno. No carga `.env` por su cuenta, no elige perfil desde un argumento del cliente y no abre un listener.
- [PgAuthStore](src/auth/pg-auth-store.ts): consultas/repositorio de autenticación. Al crear el core comprueba destino sintético/current ready, ausencia de privilegios administrativos, membresías/propiedad/DDL, escritura de corpus, TEMP y CONNECT adicionales. Un fallo cierra la composición; no usa otro corpus/base ni un superusuario como alternativa.
- [SyntheticAccountProvisioner](src/auth/provision-account.ts): operación administrativa local con otro Pool no privilegiado y sin acceso a hashes. Valida UID/correo bajo `banuchat.test` y perfil ficticio existente; inserta cuenta pendiente, binding/aprobación de release, permiso y auditoría en una transacción. No establece contraseña, emite token inicial, registra usuarios por HTTP ni activa la cuenta. Una nueva publicación concurrente no reasigna el binding: conserva la release leída y requiere aprobación explícita para la siguiente.
- [Primitivas](src/auth/primitives.ts): Argon2id real, salts CSPRNG de 16 bytes, memoria 19456 KiB, t2/p1, salida 32 bytes; tokens independientes de 32 bytes, base64url canónico y SHA-256 de bytes decodificados. No se almacenan tokens/contraseñas en claro. Límite global de dos trabajos Argon2 concurrentes por proceso, sin cola ilimitada.
- [Limitador persistente](src/auth/rate-limiter.ts): ventanas UTC, contadores atómicos PostgreSQL y claves HMAC por acción/origen/UID, incluidos UID desconocidos. Login: 5/900 s por UID y 30/900 s por origen; trabajo hash global 20/60 s. Refresh: 60/900 s por origen. Los contadores de intentos rechazados se confirman, no se pierden por lanzar 429. Restablecimiento/entrega y sus cuotas pertenecen a AUTH-P3.
- [Unidad transaccional](src/data/transaction.ts): una conexión reservada para BEGIN/operación/COMMIT; rollback y release garantizados. Descarta una conexión cuyo rollback falla. No cambia el PgSqlClient ni los servicios v1 existentes.
- [Handlers separados](src/http/auth-handlers.ts): método/target/headers/body→status/headers/body para login, refresh, me y logout. JSON UTF-8 con miembros duplicados/escapados rechazados, objetos cerrados en el core, límites, errores fijos y no-store. Sin servidor, registro de rutas, alias v1, recovery, endpoints de administración o acceso a recursos conversacionales.

El origen y requestId del core son contexto de un adaptador confiable; el adaptador HTTP preparado genera su propia correlación y recibe origen desde conexión, sin interpretar X-Forwarded-For. No aceptar ese contexto desde JSON, el modelo o un parámetro Mobile. El principal retornado es inmutable y no contiene correo/hash/token. No debe serializarse como autoridad controlable por cliente; la futura API lo deriva en cada request.

Me obtiene perfil/capacidades del binding aprobado en current y permiso de lectura. Dos cuentas pueden compartir perfil académico ficticio, pero su principal/sesiones son distintos. El core no publica conversaciones, historial o artefactos. La autorización de esos recursos y su revalidación antes del commit de mensajes siguen siendo AUTH-P2; seleccionar un perfil o tener login no implementa esas garantías.

## Transacciones y criptografía

Login lee credencial/versionado sin locks, realiza Argon2 fuera de transacción y después bloquea la cuenta y revalida estado/hash/versión antes de insertar sesión/refresh/auditoría. El test de carrera mantiene el verificador detenido y consigue `FOR UPDATE NOWAIT` desde otra conexión: demuestra ausencia de lock durante hashing. Un cambio de credencial/versionado que gana impide crear la sesión con la contraseña anterior.

Access/refresh toman cuenta→sesión→token; expiración exclusiva, inactividad 86400 s, access 900 s y absoluto 604800 s. Rotación inserta sucesor antes de consumir predecesor y cambiar access. Dos refresh simultáneos del mismo secreto producen un éxito y un replay; el replay revoca la familia, incluso la pareja recién emitida. La revocación se confirma **antes** de devolver 401. Logout y cambios de auth_version invalidan accesos sin esperar el vencimiento.

Argon2 `0.45.0` serializa PHC en orden `m,p,t`; el adaptador conserva salt/hash y parámetros y ordena su representación a `m,t,p`, como exige 006. La biblioteca verifica esa representación correctamente. No se relaja el CHECK ni se modifica SQL/contrato para acomodarla. La única dependencia runtime añadida es [node-argon2](https://github.com/ranisalt/node-argon2), fijada con lockfile y comprobada con hashing real; evita exigir el Argon2 experimental de Node 24.7+ cuando el API declara Node 22+. Ver [documentación Node](https://nodejs.org/download/release/v24.21.0/docs/api/crypto.html).

La lista local inicial de contraseñas débiles se concentra en `newPassword`; no consulta servicios externos. Debe revisarse junto con el establecimiento/recuperación de AUTH-P3 antes del piloto. Las pruebas no sustituyen calibración de coste/capacidad, revisión de secretos/TLS o verificación de los binarios Argon2 de la imagen Linux de despliegue; la ejecución de este incremento fue Node 24.19.0 sobre Windows.

## Preparación reproducible exclusivamente para pruebas

La instancia actual de demo, CCD y N8N **no son destinos de estos comandos**. El adaptador de pruebas usa nombre fijo `banuchat-auth-p1-20261022`, base `banuchat_auth_p1_test`, red dedicada, puerto **127.0.0.1:55435** y tmpfs de 256 MiB, sin volúmenes host/existentes. La red es un bridge exclusivo sin masquerade, no una declaración de firewall de salida. Solo PostgreSQL en loopback está publicado; ningún endpoint auth HTTP.

Desde raíz, con PowerShell 7 y Docker local autorizado:

```powershell
./infra/auth-p1-test-environment.ps1 -Action Create
./infra/auth-p1-test-environment.ps1 -Action Inspect
```

El script exige imagen local `pgvector/pgvector:pg16` sin pull, nombres/puerto libres, genera secretos nuevos y los guarda solo en `infra/local/auth-p1/environment.json`, ya ignorado por Git. Registra IDs exactos y no reutiliza recursos homónimos. Verificar `pg_isready` en ese contenedor antes de los comandos siguientes. Un fallo no dispara limpieza de recursos ajenos.

Desde `backend/api`, en ese entorno nuevo:

```text
npm run test:auth:sql
npm run test:auth:roles
npm run test:auth:db
npm run test:auth
npm run typecheck
npm run build
```

Fase A solo en base vacía: aplica 001 sin modificar, construye [fixture mínima](test/auth-p1/fixture.sql), valida major PostgreSQL 16 y aplica 006 con target en la misma conexión. Un perfil inventado, configuración explícitamente ficticia y un run/item SQL de prueba; se publica mediante función existente y triggers activos. Cero documentos/chunks/embeddings y ningún historial copiado. No hay fuente/ingesta/modelo reales detrás de esa fixture; no se altera `/data/synthetic`.

La fase de roles crea únicamente identidades técnicas de ese clúster temporal y revoca sus defaults PUBLIC para cumplir aislamiento; **no modifica PUBLIC o roles del clúster compartido**. Runtime solo auth, SELECT mínimo de corpus y UPDATE(updated_at) de cuentas para permitir `SELECT FOR UPDATE`; sin mutación de identidad/credencial/corpus. Aprovisionador INSERT de cuentas/bindings/grants y auditoría, sin SELECT/escritura de password_credentials o lectura de chats. No se conceden por anticipado escrituras de historial AUTH-P2 o cambio de contraseña AUTH-P3.

La suite DB activa cuentas **solo como fixture administrativa aislada**, insertando el hash real y estado en una transacción. No es una API o procedimiento operativo de establecimiento de contraseña. Limpia contadores auth entre casos para aislar cuotas, sin un método de producción que restablezca el limitador. Los tests `.mts` SQL/DB son explícitos y no se ejecutan mediante `npm test` normal.

Evidencia depurada regenerable: `infra/local/auth-p1/phase-a.json`, `roles.json`, `phase-b.json`; sin tokens, contraseñas, hashes de credencial, correos o payloads SQL privados. Tras revisar resultados, desde raíz:

```powershell
./infra/auth-p1-test-environment.ps1 -Action Remove
```

Remove comprueba IDs/labels, ausencia de mounts y miembros exclusivos de red antes de eliminar **solo** esos recursos y su archivo de credenciales. No ejecuta prune, borra volúmenes, toca las bases originales o elimina reportes. tmpfs no conserva las fixtures al retirar el contenedor. Cualquier ejecución futura necesita otra autorización si excede la validación AUTH-P1 concedida; el script no amplía permisos del proyecto.

## Límite de integración

Pruebas de unidad/contrato, SQL real e invocación directa de handlers son evidencias diferentes. Falta el adaptador HTTP con lectura acotada del stream y manejo de errores del parser/transporte, TLS, propiedad de recursos, integración Mobile y recuperación con buzón local. No activar una instancia v2 parcial ni montar v1 anónima como alternativa. AUTH-P2/P3/P4 requieren tareas autorizadas independientes; AUTH-P1 no declara login listo para usuarios finales.

## AUTH-P2.1 — Composición protegida y reproducción local

`createAuthenticatedRuntimeServer` recibe Pool limitado, base esperada, deployment
UUID fijo, clave HMAC y el responder Document RAG existente. Valida privilegios
efectivos, incluidos UPDATE por columna, y la coincidencia con runtime_scope de
007. Carga el mismo Intent Router y crea exclusivamente el servidor v2. No escucha
por su cuenta, cambia main.ts, carga .env ni admite modo CCD o bypass de auth.

`AuthenticatedResources` deriva el principal del token validado en SQL. Las
transacciones cortas abarcan los gates y servicios de lectura/escritura; crear
incluye owner en el mismo commit. El listado usa owners antes de límite/orden,
y detalle/borrado no leen contenido ajeno. Los servicios de progreso, calendario,
anuncios y artefactos conservan sus reglas. Solo la proyección artifact_url cambia
a v2; no se reescribe texto del usuario o la respuesta. La descarga verifica
dataset/release antes de leer y reutiliza contención real y hash histórico.

En mensajes se reutiliza sendMessage: callbacks internos para lectura/commit y
un adaptador de persistencia a la función SQL. El contexto se libera antes de
router/RAG. La función revalida acceso, versión, grant, binding y owner antes de
ejecutar la CTE existente. No se reintenta un POST tras resultado incierto. La
actividad HTTP por proceso conserva 409 y no sustituye los locks SQL entre procesos.

La excepción de privilegios está en [auth-permissions §5.1](../../infra/db/auth-permissions.md).
Los tokens solo atraviesan autenticación y parámetros SQL enlazados, no el router,
RAG, citas o logs de aplicación. No habilitar logs de parámetros en PostgreSQL.
La amenaza de credenciales técnicas/administrador comprometidas queda fuera del
aislamiento HTTP entre cuentas. No se expone una pasarela SQL.

Reproducción **exclusivamente con autorización para otra instancia desechable**:

```powershell
# raíz: recursos propios, nunca bases existentes
./infra/auth-p21-test-environment.ps1 -Action Create
./infra/auth-p21-test-environment.ps1 -Action Inspect
# backend/api: una base vacía; ejecutar secuencialmente, detenerse ante fallo
npm run test:auth:p21:setup
npm run test:auth:p21:sql
# solo después de PASS de fase C para ese deployment/base/release
npm run test:auth:p21:http
# raíz: elimina solo IDs/etiquetas/montajes verificados
./infra/auth-p21-test-environment.ps1 -Action Remove
```

El fixture crea dos releases ficticias con seis clases de fuente y un documento
full_document, sin chunks/embeddings/Ollama y sin tocar data/synthetic. Los artefactos
y secretos locales quedan en infra/local/auth-p21, ignorado. HTTP escucha solamente
en puerto efímero 127.0.0.1 durante las pruebas y cierra al terminar. Los reportes
phase-c/phase-e se depuran antes de conservar evidencia versionada.

AUTH-P2.1 implementa y prueba localmente las nueve operaciones de recursos y los
cuatro handlers AUTH-P1; recuperación AUTH-P3 permanece sin montar. No hay Mobile,
TLS de piloto, usuarios reales, infraestructura institucional o exposición LAN.
No equivale a un despliegue aprobado ni a login listo para estudiantes.
