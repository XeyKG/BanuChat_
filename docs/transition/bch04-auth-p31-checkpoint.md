# CHECKPOINT BANUCHAT — BCH-04/AUTH-P3.1

Fecha local: inicio 2026-10-22; cierre 2026-10-23. Base confirmada:
`e161a4fc6619226bc7a2352d34acc40998c8f70c`, árbol inicialmente limpio.
Autorización: BCH-D31 y complemento de nombre propio/contacto académico de prueba.

**Núcleo definitivo de recuperación implementado y validado localmente con
PostgreSQL nuevo y HTTP loopback. AUTH-P3 permanece abierto:** no hay proveedor ni
remitente configurados, envío externo, recepción Gmail/académica comprobada o
consumo de un código externo. El capturador no sustituye esa acreditación.
Se detiene para revisión de Sala de Control. Sin commit/push ni inicio de AUTH-P4.

## 1. Delta contractual aplicado

[Contrato v2](../../backend/api/api-contract-v2.md) y
[OpenAPI](../../backend/api/openapi-v2.yaml): revisión mayor **3.0.0**, manteniendo
OpenAPI3.1 y prefijo `/api/v2`. Únicamente cambia la recuperación:

- Solicitud: `{synthetic_uid}` → 202 con mensaje genérico fijo, sin estado de cuenta,
  destinatario ni indicación de envío/supresión.
- Confirmación: exactamente `{synthetic_uid,verification_code,new_password}` →204
  sin sesión automática. Ocho dígitos ASCII string, incluidos ceros iniciales.
- Formato viejo `{token,new_password}` y variante mixta se rechazan; errores fijos
  `INVALID_ARGUMENT`/`INVALID_RESET`, cuotas429, dependencia503.

La comparación estructural contra HEAD acredita las **otras trece operaciones
idénticas**, todos sus schemas, cabeceras, seguridad y parámetros sin delta. El
schema opaco solo cambia su descripción de uso; tokens access/refresh de43
caracteres conservan forma y semántica. `/auth/me` no incorpora nombre ni correo.
Exponer nombre de cuenta necesitará delta contractual adicional, no autorizado aquí.
El documento de propuesta anterior queda como antecedente con referencia al estado
vigente; ya no limita permanentemente los contactos a Gmail.

## 2. Cuenta, nombre propio y compatibilidad

Estructura lógica/física detallada en
[recovery-core.md](../../backend/api/recovery-core.md):

| Elemento | Persistencia y separación |
| --- | --- |
| Identificador interno estable / UID único sintético / estado / versión | `accounts` existente |
| Nombre visible ficticio propio | Nueva `accounts.synthetic_display_name`; no es `profile.alias` |
| Contraseña independiente | `password_credentials.password_hash`, solo Argon2id seguro; ninguna credencial institucional |
| Correo privado consentido y controlado | `recovery_contacts` cifrado, separado del perfil/datos académicos ficticios |
| Recursos autorizados | Bindings/grants y `conversation_owners` anteriores, sin transferir propietarios |

Columna de accounts porque el nombre pertenece a la identidad única, sin historial
ni multiplicidad independientes que justifiquen otra relación. 008 permite NULL
para legado; no reescribe 006 ni hace backfill. Aprovisionamiento nuevo siempre
recibe un nombre ficticio o construye uno desde el UID sintético, y exige 008.
Las cuentas pendientes son etapas de aprovisionamiento, todavía sin credencial o
contacto completo. Solo el consumo de initial_set con contacto verificado activa
una cuenta nueva por este núcleo. El contacto real sería dato personal privado,
aunque identidad visible y expediente académico sigan siendo ficticios.

En la instancia final: **17 cuentas fixture**, 16 con nombre propio y una heredada
con NULL conservado. La asignación de nombre legado es operación interna explícita,
no ejecutada automáticamente. El legado conserva sus derechos REST anteriores;
requiere esa remediación antes de asociar contacto nuevo. No se migraron cuentas
de las bases existentes. La prueba distingue nombres propios de cuentas que usan
el mismo alias/perfil académico, y verifica asociación UID/contacto/hash.

## 3. Migración 008 y permisos reales

[008](../../infra/db/008_verified_recovery_email.sql), aditiva y transaccional:
columna nullable y cuatro tablas (`recovery_contacts`, `recovery_challenges`,
`recovery_uid_limits`, `recovery_mail_dispatches`), sin seeds/backfill.
Guard de base expresamente seleccionada, current ready sintética, scope007 y rol
limitado; rechazo de CCD y reaplicación. Campo histórico accounts.recovery_email y
tabla password_reset_tokens quedan intactos, sin fallback de entrega ni consumo.

Aplicación real 001→006→007→008 exclusivamente en
`banuchat_auth_p31_test`, loopback55438. Nuevas tablas: 35 CHECK validados, cinco FK,
cuatro PK, tres UNIQUE y nueve índices, incluido único parcial de reto activo.
El nombre tiene además su CHECK en accounts. Se prueban abortos por target erróneo,
nombre blanco, nonce inválido, verified sin prueba, vigencia301s, contacto de otra
cuenta, seis intentos y duplicación de reto activo.

ACL efectivas en [evidencia](../../eval/auth/results/bch04-auth-p31-evidence.json)
y [matriz](../../infra/db/auth-permissions.md): runtime tiene lecturas/inserciones
necesarias y UPDATE por columnas de estados/credencial; sin DELETE/TRUNCATE de auth,
DDL, poderes administrativos, UPDATE de corpus/conversaciones o transferencia de
owner. Aprovisionador separado no accede a hashes ni contactos. Operaciones de
contacto se ejecutan desde composición confiable con runtime; no se crea otro rol
SQL administrativo ni ruta HTTP/MCP. No se pretende aislar esas tablas frente a
compromiso del propio rol confiable. 008 no añade SECURITY DEFINER.

## 4. Arquitectura y casos de uso implementados

HTTP v2 → RecoveryService → límites/criptografía → PostgreSQL auth; entrega por
MailDelivery fuera de transacción. Se reutilizan PgTransactionRunner, Argon2id,
reloj PostgreSQL, auditoría y scope/auth de AUTH-P1/P2. Las dos rutas completan las
quince operaciones ejecutables de la composición v2; sin recovery inyectado fallan
cerradas503. No se crea otro listener ni se monta v1 en esa composición.

CSPRNG uniforme00000000–99999999, 300s, cinco errores por reto, presupuesto UID
persistente cinco confirmaciones/300s. Verificador HMAC-SHA-256 con clave externa
independiente y contexto cuenta/reto/propósito/contacto/revisión/auth_version/
deployment/canal; comparación constante de bytes. MAC/cifrado/lookup/cuotas usan
claves separadas. Correo AES-256-GCM con AAD y nonce aleatorio; no correo plano en
DB ni código plano/simpleSHA256 de ocho dígitos. No se persisten mensajes ni códigos
en cola. Verificadores recientes impiden repetición acotada de valores.

Administración interna: registrar consentimiento/contacto pendiente, emitir y
consumir verify_contact, suspender/reemplazar, asignar nombre legado. Sintaxis o
dominio no prueban control. Verificación almacena canal **local_test** o
**external_email**; local_test no habilita external_email. Reemplazar/suspender
revoca sesiones/invalida retos, conserva UID, credencial y propietarios.

Pendiente+contacto verificado →initial_set; activa→reset. Hash fuera de locks;
consumo bajo cuenta→sesiones ordenadas→reto. Una transacción consume, escribe hash,
activa/incrementa versión, invalida hermanos y revoca todas las sesiones. Un único
ganador concurrente. Errores de código se devuelven después de confirmar el contador;
fallo de escritura revierte consumo y revocaciones. Aviso de cambio posterior best
effort no revierte la credencial. No hay login ni retry automáticos.

Solicitud reserva cuotas públicas/UID antes de encolar; respuesta genérica sin
lookup de destinatario. Cola RAM128, un worker, sin reintento ni recuperación
automática después de caída. UID3/h suprime sin cambiar202; origen10/900s; confirmación
origen10/900s; hash20/min compartido con login y dos hashes concurrentes/proceso.
Reinicio puede perder trabajo aceptado; metadato created no prueba aceptación ni
recepción. Rejected/unknown observados invalidan el reto. No hay locks durante
Argon2, correo o generación.

## 5. Pruebas realmente ejecutadas

| Ejecución | Resultado y alcance |
| --- | --- |
| `npm run typecheck` y `npm run build` desde backend/api | Ambos exit0 |
| `npm test` | **549/549**, sin fallos, cancelaciones u omisiones; unitarias/contrato/HTTP controlado previas más criptografía/entrega nuevas |
| `npm run test:auth:p31:setup` | DDL real y fixtures propios; sin Ollama ni embeddings |
| `npm run test:auth:p31:integration` | **15 comprobaciones, 16/16 registros Node** incluyendo prueba padre, sin omisiones |
| `npm run test:auth:p31:evidence` | Catálogo/ACL reales, igualdad estructural de13 operaciones y hashes protegidos |

Integración: establecimiento/login real con ceros iniciales, reset, rechazo de
contraseña antigua, revocación de todas las sesiones, replay, expiración,
cinco errores persistidos entre instancias de servicio, dos confirmaciones
simultáneas, códigos ajenos/de otro propósito, no verificado/suspendido/reemplazado,
cuotas UID/origen, 202 igual para existente/ausente, datos extra/formato viejo,
rejected/unknown, servicio indisponible, local_test→external_email denegado,
locks NOWAIT durante hash/correo, rollback por privilegio retirado temporalmente,
parada/reinicio del contenedor exclusivo y503 de ambas rutas durante caída.

Regresiones P1/P2 dentro del harness nuevo: login/refresh/logout y replay de refresh,
sesiones, permisos de corpus, trece operaciones HTTP, historial/progreso/calendario/
anuncios/artefacto full_document, aislamiento de dos cuentas con mismo perfil y
snapshot idéntico de conversación/mensajes/citas/owner antes/después de reset.
Sin REST v1 anónima ni administración pública en el servidor v2. Las suites .mts
históricas P1/P2 no se reejecutaron sobre sus entornos retirados; no se les atribuye
un PASS nuevo. Su expectativa GET reset se actualiza a405 por la ruta POST añadida.
La ejecución RAG/generación se controla en esta prueba; no se mide Ollama ni T11.

Primera ejecución: una comprobación falló con SQLSTATE42804 en CASE de invalidación
de intento fallido. Corrección explícita `$2::timestamptz`; se mantuvo el
[reporte inicial](../../eval/auth/results/bch04-auth-p31-first.json) y se repitió
desde instancia vacía. Resultado final:
[15 comprobaciones PASS](../../eval/auth/results/bch04-auth-p31-final.json).
La evidencia conserva esta diferencia; no presenta el fallo inicial como PASS.
No hay evaluación estadística de tiempos anti-enumeración ni prueba de carga.

## 6. Entrega y pendientes externos

MailDelivery reutilizable. Capturador local en memoria con dominios reservados y
allowlist exacta; reception/consumo solo del doble. Resend HTTPS preparado con
transporte inyectado, deadline, sin redirects, referencia opaca/idempotencia y
accepted/rejected/unknown; pruebas usan HTTP falso. **Resend es candidato**; no se
crearon cuentas, contrataron dominios ni configuraron remitente, claves o envíos.
No hay SDK nuevo, SMTP abierto ni dependencia exclusiva Gmail.

La dirección académica voluntaria no fue leída ni incorporada. Configurar después
mediante mecanismo privado fuera de Git, tras aprobar proveedor/remitente y
consentimiento/allowlist exacta. No usar credenciales Gmail personales, UID real ni
contraseñas institucionales. No inferir proveedor o identidad UNAB del dominio.

Para cierre externo: seleccionar y autorizar proveedor/remitente/dominio, custodiar
claves/configuración y política de backup/rotación/retención, TLS y manejo de errores
idle del Pool en el proceso anfitrión; emitir prueba externa de control de buzón y
verificar el contacto en external_email; ejecutar initial_set/reset y nuevo login.
Diferenciar aceptación del envío, recepción confirmada por titular y consumo del
código. No registrar dirección/código/mensaje ni acceder a buzones privados. La
rotación operativa de anillo de claves no está implementada; IDs distintos fallan
cerrados. No hay scheduler de limpieza ni garantías multirréplica/carga.

## 7. Integridad y recursos

Huella del corpus fixture antes/después idéntica:
`2df9f7b2dea0602b343a9b8faf990800a929bf1efde6c5aa184d9d53a499259c`.
Incluye releases/current/configuración/documentos/chunks/perfiles/progreso/eventos/
anuncios/ingesta de la instancia de pruebas, no una lectura de las bases originales.
Dos releases fixture-only construidas por el harness; no se cargó/reingestó ni
publicó el corpus congelado real, no se generaron embeddings ni se consultó Ollama.

Hashes y diff acreditan 001/006/007, contratos v1/MCP, data/synthetic, data/ccd,
Mobile, backend/rag y servicios de aplicación intactos. No se conectó el clúster
original ni CCD, ni se modificaron conversaciones existentes. U03/U04/T11 permanecen
intactos. Recursos exclusivos verificados por etiquetas/IDs, puerto55438, volumen
independiente sin mounts del host y red propia sin masquerade; fuera de red
institucional. Retirada exclusiva y comprobación final constan en evidencia.

## 8. Archivos

Añadidos:

- `infra/db/008_verified_recovery_email.sql`, `infra/auth-p31-test-environment.ps1`.
- `backend/api/src/auth/{recovery-crypto,recovery-limiter,recovery-service,mail-delivery}.ts`.
- `backend/api/test/auth-p31-{setup,integration,evidence}.mts`,
  `backend/api/test/auth-p31/environment.ts`, `backend/api/test/recovery-crypto.test.ts`.
- `backend/api/recovery-core.md`, este checkpoint y
  `eval/auth/results/bch04-auth-p31-{first,final,evidence}.json`.

Modificados:

- `backend/api/{README.md,api-contract-v2.md,openapi-v2.yaml,package.json}`.
- `backend/api/src/auth/{pg-auth-store,primitives,provision-account}.ts`,
  `backend/api/src/authenticated-runtime.ts`, `backend/api/src/http/api-v2-server.ts`.
- `backend/api/test/{auth-v2-contract.test.ts,auth-p21-http.mts}`.
- `infra/db/auth-permissions.md`, `docs/architecture/auth-p3-delta-correo-gmail.md`.

No cambian dependencias/lockfiles, SQL anteriores ni archivos ajenos a este alcance.
`git diff --check` y revisión de archivos nuevos forman parte del cierre local.
Sala de Control debe revisar este resultado antes de cualquier fase siguiente.
