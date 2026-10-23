# Recuperación propia BanuChat — AUTH-P3.1

BCH-D31 y su complemento autorizan este núcleo local ejecutable. Contrato REST
revisión **3.0.0**, prefijo `/api/v2`, quince operaciones; no se modifica el
listener v1. [Checkpoint y resultados](../../docs/transition/bch04-auth-p31-checkpoint.md).
No hay registro público, autenticación UNAB, Mobile nuevo ni entrega externa activa.

## Cuenta lógica y persistencia física

| Responsabilidad | Persistencia | Regla |
| --- | --- | --- |
| Identificador estable, UID, nombre propio, estado y versión | `accounts.id/synthetic_uid/synthetic_display_name/status/auth_version` | UID único y nombre ficticios; nombre de 1–80 puntos Unicode, no blanco ni controles |
| Credencial independiente | `password_credentials` | Solo PHC Argon2id v19 m19456/t2/p1, salt16/hash32; nunca contraseña institucional |
| Contacto privado consentido | `recovery_contacts` | Un contacto por principal; AES-256-GCM, nonce12/tag16, AAD principal/contacto/revisión; lookup HMAC único |
| Control del contacto | Estado/revisión/consent_reference/verification_reference/channel y fechas del contacto | Registrar formato válido deja pendiente; consumir reto `verify_contact` prueba solo el canal utilizado |
| Asociación académica | Bindings/grants previos | `profile.alias` es alias académico compartible; no es nombre de cuenta ni prueba de identidad |
| Recuperación | `recovery_challenges` | MAC contextual, finalidad, versión y canal; sin código plano |
| Abuso y entrega | `recovery_uid_limits`, `auth_rate_limits`, `recovery_mail_dispatches` | Presupuestos persistentes y metadatos opacos; sin mensajes o destinatarios en evidencia |

El nombre es una **columna de accounts** porque es un atributo único de esa
identidad, sin ciclo de vida ni multiplicidad propios. Una relación aparte no
aportaría separación de autorización. 008 permite NULL solo para compatibilidad
física con cuentas anteriores; no hay default SQL, backfill ni modificación de
sus sesiones/derechos por aplicar DDL. El aprovisionador actual siempre escribe
un nombre recibido o `Cuenta ficticia` más el sufijo del UID. Requiere 008 aplicada.
La operación interna `assignLegacyName` permite remediación explícita solo si
estaba NULL, sin ejecución automática ni sobrescritura de nombres existentes.
Hasta esa decisión, el legado puede conservar sus derechos previos, pero no puede
asociar contacto con el nuevo núcleo. No se han migrado cuentas de bases existentes.

`/auth/me` conserva exactamente `current_session`: **no añade nombre ni correo**.
Exponer el nombre propio necesitaría otro delta explícito de contrato y sus
consumidores; este incremento no lo aplica. `accounts.recovery_email` sigue siendo
histórico sintético y no es destinatario ni fallback. 001, 006 y 007 se conservan.

## Composición y estados

```text
HTTP v2 → RecoveryService → RecoveryLimiter / RecoveryCrypto
                        → PgTransactionRunner → PostgreSQL auth + ámbito 007
                        → MailDelivery (fuera de transacción)
AuthService y AuthenticatedResources previos conservan sesiones y ownership.
```

La composición `createAuthenticatedRuntimeServer({..., recovery})` recibe el núcleo
explícitamente. `RecoveryService.create` verifica rol limitado/base/scope/deployment
y 008 antes de servir. Sin esa dependencia las dos rutas fallan con 503; no montan
v1 ni fabrican éxito. No hay nuevo listener automático, .env global ni bypass.

Operaciones administrativas internas, sin HTTP/MCP: `registerContact`,
`requestContactVerification`, `verifyContact`, `suspendContact`, `assignLegacyName`.
Se usan desde composición confiable; no se permite elegir correo desde REST.
Registro/reemplazo exige consentimiento opaco y allowlist exacta, deja pendiente,
incrementa versión, revoca sesiones e invalida retos. Reemplazo conserva principal,
bindings y propietarios. Suspensión impide recuperación hasta nueva asociación y
verificación. Una dirección con sintaxis válida o dominio académico no acredita
control del buzón, identidad institucional ni proveedor Gmail.

Solicitud pública: validar UID → reservar cuotas → encolar UID sin lookup de cuenta
en el camino de respuesta → 202 genérico. Worker local: resolver cuenta/contacto,
determinar `initial_set` o `reset`, crear reto/despacho y liberar locks antes de
entrega. Cola RAM acotada a 128, un worker; no secreto en cola persistente ni retry.
Reinicio puede perder trabajo aceptado. Fallo después del 202 no se publica como
estado de cuenta; un código existente vence en 300 s. Despacho `created` puede
quedar sin resolución si el proceso/DB falla después de transporte; no significa
recepción. Rejected/unknown observados invalidan el reto.

Confirmación pública: solo `{synthetic_uid, verification_code, new_password}`;
código ASCII string de ocho dígitos, incluidos ceros. Reservar cuotas y calcular
Argon2 fuera de locks incluso para código/UID desconocidos. Luego cuenta → sesiones
por UUID ascendente → reto: revalidar propósito/contacto/revisión/versión/ámbito/
canal/vigencia. Consumir, escribir hash, activar pendiente, incrementar versión,
invalidar hermanos y revocar todas las sesiones en la misma transacción. Retornar
204, sin sesión nueva; aviso posterior de cambio es best effort, sin rollback de
credencial ni constancia de recepción. Fallo de escritura revierte todo. El error
de código se devuelve después de commit para conservar intentos fallidos.

HMAC-SHA-256 independiente ligado a todos esos identificadores y finalidad. CSPRNG
`randomInt(0,100000000)` y comparación `timingSafeEqual` de 32 bytes. Cinco errores
invalidan reto; presupuesto UID cinco confirmaciones/300 s, incluso ausentes y
entre instancias. Uno activo por cuenta para password; verificación de contacto
es grupo distinto. La expiración se comprueba en consumo; reemisión invalida el
anterior aunque ya venció. No se repiten los últimos 100 verificadores de 24 h:
cinco candidatos como máximo y fallo seguro, además de cuotas de emisión.
Origen solicitud10/900 s, UID solicitud3/h (supresión conserva202), confirmación
origen10/900 s, hash global20/min compartido con login y máximo dos hashes por
proceso. No hay medición estadística de canales temporales ni certificación de carga.

## Producto y adaptadores de pruebas

`RecoveryService`, cifrado, límites, SQL, endpoints y contrato son componentes de
producto. `MailDelivery` es la frontera reutilizable. Las claves v1 se inyectan
fuera de DB/repositorio: MAC, cifrado, lookup y cuotas independientes. Rechaza claves
coincidentes; IDs desconocidos fallan cerrados. La rotación de un anillo de claves,
custodia/backup y retención requieren operación autorizada; no se simulan resueltos.

`LocalCaptureMailDelivery` es exclusivamente un doble en memoria; acepta dominios
reservados y allowlist exacta. Sus códigos no se imprimen ni versionan. Marca
`local_test`; ese contacto verificado no habilita recuperación `external_email`.
`ResendHttpsMailDelivery` prepara POST HTTPS fijo, deadline10 s, sin redirects,
una dirección allowlisted, UUID de idempotencia y estados accepted/rejected/unknown.
No instala SDK nuevo ni tiene fetch por defecto, claves, remitente o cuenta real.
Resend sigue siendo candidato; pruebas usan HTTP inyectado falso sin Internet.
No hay SMTP abierto ni regla permanente gmail.com. Validador de correo ASCII
conservador; preserva local-part y normaliza solo dominio, sin inferir proveedor.

Para activar después: aprobación de proveedor/remitente/dominio y presupuesto;
claves y destinatario consentido mediante custodia privada fuera de Git; transporte
HTTPS real/TLS y política de errores del Pool; registro pendiente → código externo
→ control del buzón → initial_set/reset → login. La dirección académica voluntaria
no se ha leído ni configurado en esta tarea. No usar UID, claves institucionales o
datos académicos reales. No consultar buzones privados ni incorporar su dirección
a documentación, fixtures, migraciones o evidencia. El titular debe acreditar la
recepción; conservar referencias opacas y consumo, no códigos/mensajes/direcciones.
Distinguir aceptación del proveedor, recepción observada y consumo efectivo.

## Reproducción local autorizada

Desde raíz, PowerShell7:
`pwsh -NoProfile -File infra/auth-p31-test-environment.ps1 -Action Create`.
Solo crea contenedor/red/volumen de tarea, sin mounts del host,
imagen pgvector PG16 ya local y puerto127.0.0.1:55438. Configuración aleatoria privada
en `infra/local/auth-p31/environment.json`, ignorada. Nunca imprimirla ni usar una
connection string existente.

Desde `backend/api`: `npm run test:auth:p31:setup`,
`npm run test:auth:p31:integration`, `npm run test:auth:p31:evidence`.
Setup aplica 001/006/007/008 a DB nueva, dos releases **fixture-only**, sin Ollama ni
embeddings, y roles exclusivos del clúster desechable; no copia/publica el dataset
congelado real. Integration contiene parada/reinicio deliberados solo del container
ID cuya etiqueta se verifica, HTTP loopback y escrituras de fixtures. No repetir
integration sobre sus cuentas ya creadas: crear entorno nuevo. Typecheck/build y
`npm test` no requieren esa DB. Los scripts históricos P1/P2 son antecedentes con
sus propios entornos y no sustituyen el harness actualizado 008.

Al terminar, desde raíz ejecutar el mismo script con `-Action Remove`: verifica
IDs, etiquetas, red y único volumen antes de retirar exclusivamente sus recursos y
configuración generada. No limpia historiales ni datos de otros entornos. Es un
harness de pruebas, no un mecanismo de despliegue sobre las bases originales.

Referencias primarias revisadas: [Node crypto](https://nodejs.org/api/crypto.html),
[API de envío Resend](https://resend.com/docs/api-reference/emails/send-email) y
[su cabecera de idempotencia](https://resend.com/docs/dashboard/emails/idempotency-keys).
Esas interfaces no acreditan la entrega real de BanuChat ni aval institucional.
