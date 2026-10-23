# BanuChat — AUTH-P3: delta de recuperación con correo real y código

Estado: **propuesta para aprobación de Sala de Control; no aplicada**.
Base inspeccionada: `28fbc68d1e8715ebc8ba0d645469af445989f586`.

La corrección expresa de Sala de Control sustituye, para AUTH-P3, el destino
exclusivo banuchat.test y la captura local como demostración final. Se propone
entrega real a Gmail con destinatarios consentidos y verificados. UID, cuentas de
demostración, perfiles y datos académicos conservan su carácter sintético; la
dirección real pasa a ser **dato privado de contacto de autenticación**. El sistema
completo ya no debe describirse como carente de datos personales: la asociación
privada contacto→cuenta es identificable aunque el corpus siga siendo ficticio.

Esta entrega solo contiene diseño. No aprueba todavía el proveedor, el delta REST,
DDL, envío a Internet ni el uso de una dirección concreta. No se ha enviado correo
ni comprobado una bandeja. No se modifica AGENTS.md ni los documentos históricos:
las restricciones previas de destinatarios siguen en el código hasta aprobar y
aplicar explícitamente este delta.

## 1. Brechas confirmadas

| Fuente vigente | Restricción o estado | Delta necesario |
| --- | --- | --- |
| api-contract-v2.md §5 | Destinatario banuchat.test y buzón local sin relay | Canal externo autorizado, contacto privado verificado, Gmail como destino de aceptación |
| openapi-v2.yaml, reset_request | Solo synthetic_uid | Conservar sin cambios |
| openapi-v2.yaml, reset_confirmation | token de 43 caracteres + new_password | UID + verification_code de ocho dígitos + new_password; incompatibilidad explícita |
| opaque_token, login/refresh | Tokens CSPRNG de 32 bytes, 43 caracteres | **Conservar para sesiones**; no cambiar su schema para introducir códigos |
| 006, accounts.recovery_email | NOT NULL/UNIQUE y CHECK exacto banuchat.test | Tabla privada adicional para contactos reales; conservar el campo histórico sintético |
| 006, password_reset_tokens | SHA-256 de secreto aleatorio, propósito y máximo 1200 s | Nueva tabla de retos con HMAC, expiración 300 s e intentos; no reutilizar SHA-256 simple para ocho dígitos |
| 006, auth_rate_limits | Acciones y ventanas cerradas | Contador adicional privado de verificación por UID a través de una tabla nueva |
| 007 y servicios AUTH-P2 | Ownership y revalidación de sesión al commit | Reutilizar; reset incrementa versión y revoca sesiones con el mismo orden de locks |
| provision-account.ts | Solo crea pendiente y dirección sintética | Conservar aprovisionamiento; añadir verificación/asociación administrativa del contacto antes de habilitar recuperación |
| auth/rate-limiter.ts | Implementa login/refresh, no recuperación | Implementar cuotas de solicitud/confirmación y presupuesto global ya contratados, más intentos del código |
| Composición HTTP actual | Trece operaciones; recuperación sin montar | Montar las dos rutas solo tras aprobar el contrato actualizado |

Las referencias de estado AUTH-P0/P1/X01 son antecedentes, no una prueba de
recuperación funcional. La nueva decisión no convierte Gmail en identidad UNAB.

## 2. Delta REST propuesto, pendiente de aprobación

Se conserva la base `/api/v2`, las quince rutas planificadas y las trece operaciones
implementadas. Hay un cambio incompatible en la confirmación aún no implementada.
Propuesta de revisión del documento de contrato: `info.version: 3.0.0`, manteniendo
OpenAPI **3.1.0** y el prefijo HTTP `/api/v2`. Es la revisión mayor del contrato,
no la creación de rutas REST v3. Debe aprobarse expresamente junto con el schema;
no presentarlo como parche compatible del contrato 2.0.0.

| Operación | Entrada exacta propuesta | Resultado |
| --- | --- | --- |
| POST /auth/password/reset-requests | `{synthetic_uid}`; schema actual cerrado | 202 y reset_accepted actual, también para UID ausente/deshabilitado/contacto no habilitado/cuota de envío suprimida |
| POST /auth/password/reset | `{synthetic_uid, verification_code, new_password}`; cerrado, los tres obligatorios | 204 sin sesión ni body, después del commit completo |

Schema candidato de confirmación, solo especificación en este documento:

```json
{
  "type": "object",
  "additionalProperties": false,
  "required": ["synthetic_uid", "verification_code", "new_password"],
  "properties": {
    "synthetic_uid": {"$ref": "#/components/schemas/synthetic_uid"},
    "verification_code": {"$ref": "#/components/schemas/recovery_code"},
    "new_password": {"$ref": "#/components/schemas/new_password"}
  }
}
```

Nuevo schema recovery_code: string, minLength=maxLength=8, pattern
`^[0-9]{8}$`, writeOnly=true. Admite ceros iniciales. No convertir a número,
recortar espacios ni aceptar dígitos Unicode parecidos. El cliente conserva el
UID de la solicitud y lo envía en la confirmación: un código corto no es un
identificador global y puede coincidir entre cuentas. El UID **no autentica**;
sirve para localizar el reto cuyo secreto se verifica. El propósito no viene del
cliente. Sin email, destinatario, principal_id, profile_key, session_id, challenge_id
o selector de proveedor en estas entradas o en query.

Se retira `token` de reset_confirmation tras aprobación; enviar token viejo o
mezclar ambos formatos devuelve 400 INVALID_ARGUMENT. No se añade una aceptación
silenciosa de ambos. Se conserva opaque_token para access/refresh y sus clientes.

La respuesta 202 conserva exactamente:
«Si la cuenta puede recuperar el acceso, recibirás instrucciones en su buzón asociado.»
No confirma dirección, emisión o recepción ni devuelve un reto o código.
Errores existentes: 400 INVALID_ARGUMENT para schema/política antes de lookup;
400 INVALID_RESET genérico para código desconocido, incorrecto, expirado,
consumido, invalidado, agotado, finalidad/versión/contacto no válido o UID sin reto.
429 con Retry-After solo por límites públicos; 503 por indisponibilidad general.
Se conservan los mensajes fijos, límites HTTP, no-store, Vary y ausencia de login
automático. No usar 401/404 para revelar la existencia de la cuenta de recuperación.

## 3. Evaluación de ocho dígitos y política candidata

Ocho dígitos uniformes ofrecen 100 millones de valores, aproximadamente **26,6
bits**, frente a los 256 bits del token anterior. No son equivalentes. Se propone
aceptarlos para recuperación solo junto con estos controles, sujetos a revisión:

| Control | Valor propuesto | Diferencia con el contrato actual |
| --- | --- | --- |
| Generación | CSPRNG uniforme, randomInt(0, 100000000), representar con ocho dígitos | Sustituye el token solo de recuperación |
| Vencimiento | 300 s desde emisión en PostgreSQL; now >= expires_at inválido | Antes 1200 s |
| Retos activos de recuperación | Uno por principal; nueva emisión invalida el anterior, también si venció | Antes hasta tres pendientes |
| Intentos incorrectos | Cinco por reto; quinto invalida ese reto | Nuevo; confirmar no bloquea la cuenta ni revoca sesiones por error |
| Confirmaciones privadas por UID | Cinco/300 s, HMAC del UID, incluso inexistente; persistir entre reemisiones | Nuevo; superar devuelve el mismo INVALID_RESET, sin contador/Retry-After privado |
| Solicitudes por UID | Tres/hora, incluidas inexistentes; exceso suprime envío con 202 | Conservar |
| Solicitud por origen | Diez/900 s; origen de conexión confiable | Conservar, 429 público |
| Confirmación por origen | Diez/900 s | Conservar, 429 público |
| Argon2 global/concurrencia | Veinte/60 s; dos trabajos concurrentes por proceso | Conservar y compartir con login |

Cinco conjeturas independientes contra un único reto uniforme tienen probabilidad
máxima 5/100000000. No es una medición de seguridad ni incluye compromiso del correo,
del backend o ataques distribuidos a muchas cuentas. El presupuesto por UID impide
reiniciar intentos al pedir otro código o cambiar IP; el del reto cubre bordes de
ventana. La solicitud nueva puede dejar inservible un correo retrasado, incluso
si falla el nuevo envío: se asume este coste de UX y se debe probar. Ninguna
solicitud de recuperación por sí sola cambia contraseña, estado activo o sesiones.

Verificador: **HMAC-SHA-256 con clave independiente fuera de PostgreSQL**, ligado
a deployment, principal, contacto/revisión, reto, propósito, auth_version y los
ocho dígitos mediante codificación inequívoca. Comparación de 32 bytes en tiempo
constante; comparación ficticia para ausencia. No guardar código ni SHA-256 simple:
un volcado permitiría enumerar offline el espacio pequeño sin una clave externa.
Clave HMAC de códigos separada de claves de cuotas y cifrado; key_id versionado.

Uso único es por reto/principal/propósito, no unicidad global del número. Para
evitar reutilizar un valor reciente de la misma cuenta, la emisión candidata debe
compararse con los verificadores retenidos de las últimas 24 h y regenerarse si
coincide, con número de candidatos acotado y fallo seguro. No guardar códigos
viejos para esta comprobación. Claves previas deben permanecer protegidas durante
esa ventana. No prometer que un espacio finito nunca repetirá un valor histórico.

Estos números son decisiones propuestas de BanuChat. Las recomendaciones de
[OWASP para recuperación](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html)
respaldan aleatoriedad, límites y consumo único; no ratifican nuestros cinco
minutos/cinco intentos ni convierten correo en verificación institucional o MFA.

## 4. Persistencia adicional propuesta — 008, no creada

Se propone `008_verified_recovery_email.sql`, aplicada solo después de aprobación
en una instancia nueva desechable. No editar 001/006/007 ni quitar sus constraints.
Guardias: destino explícito y sintético sin CCD, 006/007 compatibles, rol limitado
revisado y ausencia de objetos 008 previos; transacción única, sin carga de contactos,
seeds, backfill ni modificación de corpus/historiales en la migración.

| Tabla candidata, privada en banuchat_auth | Campos y restricciones esenciales |
| --- | --- |
| recovery_contacts | id UUID PK; principal_id FK accounts UNIQUE; email_ciphertext bytea, nonce 12 bytes, tag 16 bytes, encryption_key_id; email_lookup_hmac hexadecimal de 32 bytes UNIQUE y lookup_key_id; revision bigint >0; status pending_verification/verified/suspended; consented_at, verified_at, created_at, updated_at finite; verification_reference opaca. Solo verified con consentimiento y verified_at habilita recuperación |
| recovery_challenges | id UUID PK; principal_id FK; contact_id FK y contact_revision; deployment_id, auth_version; purpose verify_contact/initial_set/reset; code_mac SHA-256 hex, mac_key_id; created_at/expires_at (0 < vida <=300 s), failed_attempts 0..5, consumed_at, invalidated_at y motivo cerrado; terminales excluyentes. Nunca campo code/token en claro |
| recovery_uid_limits | uid_bucket HMAC, window_started_at alineado a epoch/300 s, attempts>0, expires_at=start+300 s; PK(bucket, window). UID inexistentes usan el mismo algoritmo; sin FK de existencia |
| recovery_mail_dispatches | challenge_id FK UNIQUE, contact_id/revision, purpose, estado created/accepted/failed/unknown, provider enum autorizado, referencia privada del proveedor, created_at/accepted_at/failed_at; sin asunto/cuerpo/destinatario duplicados ni código |

Cifrado propuesto de email: AES-256-GCM en aplicación con AAD de principal,
contact_id y revisión; claves externas al DB/repo y nonces nuevos. El HMAC de
búsqueda protege el índice de unicidad frente a hashes reversibles por diccionario;
no es un hash público del correo. El administrador registra la dirección exacta
verificada. Rotar la clave de lookup exige recalcular los índices con un
procedimiento controlado que preserve unicidad, no admitir un segundo contacto
porque su HMAC usa otra clave. El administrador conserva la dirección exacta
verificada; no fusionar silenciosamente puntos/alias de Gmail ni atribuir identidad
personal a una normalización. La política inicial rechaza alias de prueba ambiguos
y usa dos buzones independientes para demostrar A/B, no dos direcciones del mismo buzón.

Índices: uno activo por principal para initial_set/reset conjuntamente y otro para
verify_contact, usando predicado solo consumed_at/invalidated_at nulos, sin now().
Al emitir, bajo lock de cuenta se invalidan también filas vencidas que aún ocupen
el índice. Comprobar las correspondencias principal/contacto mediante FK compuesta
real UNIQUE(principal_id,id) en contacts; la revisión y estado vigentes se revalidan
en la transacción, sin FK a una revisión mutable que impida suspender el contacto.
El quinto fallo exige invalidación en la misma transacción.

accounts.recovery_email conserva su valor sintético histórico requerido por 006;
queda documentado como legado y **no** se usa como fallback ni destino Internet.
Los reales viven solo en recovery_contacts, nunca en perfiles/corpus/citas/chat.
password_reset_tokens se conserva sin reinterpretar sus digests como códigos;
la nueva ruta no acepta sus tokens. Antes de cualquier corte se debe censar, con
autorización y sin revelar valores, si existen retos legacy vivos: no asumir tablas
vacías por inspección del código. Su invalidación/retiro requiere un procedimiento
de corte aprobado, no un DELETE o transformación silenciosa.

Se reutilizan auth_rate_limits y security_events existentes para sus acciones ya
definidas. No extender sus CHECK por conveniencia: el presupuesto UID nuevo tiene
tabla propia. Se registran reset_requested/reset_delivery_failed/password_set/
password_reset; **no** escribir reset_delivered para afirmar recepción Gmail.
La aceptación del transporte se registra en dispatches y la recepción se acredita
en el ensayo controlado. La política de retención propuesta es 24 h para retos y
metadatos de envío, treinta días para auditoría mínima; no incluye una limpieza
automática nueva. Debe aprobarse custodia/borrado de contactos y evidencias externas.

Privilegios candidatos: runtime SELECT de contactos cifrados y SELECT/INSERT de
retos/dispatches/contador nuevo; UPDATE de terminales/intentos/estado de envío
únicamente; password_credentials INSERT/UPDATE(hash, changed_at), accounts
UPDATE(status, auth_version, updated_at), sessions UPDATE(revoked_at), como máximo
ya descrito para recuperación. Aprovisionador de contactos separado, sin hashes
de contraseña ni chats. No ampliar poderes del executor 007 ni dar UPDATE de
corpus, conversaciones, owner o DDL al runtime. Si la unidad transaccional no puede
cumplir estos permisos en PostgreSQL real, detener esa parte para revisión.

## 5. Contactos previamente verificados y establecimiento inicial

No habrá alta pública, introducción de email en reset ni cambio público de destino.
Antes de habilitar el canal, el operador autorizado crea la cuenta sintética
pendiente y registra en privado el consentimiento y un contacto de prueba aprobado.
Un estado pending_verification no permite initial_set/reset.

Verificación propuesta: operación **administrativa interna**, no nueva ruta REST,
que emite un reto de propósito verify_contact al buzón consentido pendiente. El
destinatario lo lee por sí mismo y lo confirma por el procedimiento privado de
aprovisionamiento, sin entregarlo a Codex, Git, logs o un canal público. Esa prueba
marca el contacto verified; no activa cuenta, no escribe contraseña ni crea sesión.
Es la única excepción de envío a contacto aún pendiente: exclusivamente para probar
su control y con consentimiento previo. Los correos de recuperación requieren
verificación ya completada. Debe aprobarse esta operación administrativa junto al delta.

Si existe una prueba de control externa previamente aprobada, se conserva su
referencia opaca y el responsable verifica su vigencia; marcar un booleano sin
evidencia, tener dominio gmail.com o ver una respuesta del proveedor no demuestra
control. No se accede por API/IMAP a buzones privados de estudiantes.

Tras verificación, cuenta pendiente → emisión initial_set por el mismo servicio
de recuperación → Gmail → confirmación con UID/código/contraseña → credential
Argon2id + active + auth_version incrementada, en una transacción. Cuenta activa
usa reset; deshabilitada nunca se reactiva por este canal. Cambios de contacto
son gestión administrativa: lock de cuenta, invalidación de retos anteriores,
incremento de versión y revocación de sesiones; nuevo contacto vuelve a verificarse.

## 6. Transacciones y exposición mínima

Solicitud: validar UID → reservar cuotas públicas y de envío persistentes →
comprobar capacidad general → encolar UID sin lookup de existencia en HTTP → 202
uniforme. Worker acotado (128 trabajos en memoria, uno concurrente) determina
cuenta/estado/contacto/purpose; crea reto bajo lock de cuenta, sin cambiar sesiones.
Descifra contacto solo para MailDelivery. DB/limitador/dispatcher global caídos:
503 uniforme antes de aceptar. Una avería específica de entrega después del 202
no altera la respuesta ya emitida ni permite enumerar cuentas.
La disponibilidad general del adaptador se evalúa sin lookup por UID; configuración
incompleta o un fallo global conocido impiden aceptar por igual para todas las
cuentas. No hacer un envío de sondeo a un destinatario para decidir el HTTP 202/503.

Confirmación: schema/política de contraseña antes de consultar retos; reservar
origen/UID/presupuesto Argon2 y confirmar esos contadores. Trabajo Argon2 fuera
de locks, mismo recorrido real/ficticio para entradas admisibles sin revelar
existencia. Cuenta → sesiones por UUID ascendente → reto; contacto/revisión se
relee bajo la misma cuenta, orden que también cumplen emisión y administración.
Revalidar estado, propósito, versión, contacto verificado, ámbito, HMAC y reloj PG.

Un error de código incrementa intento e invalida si corresponde; **commit del fallo
antes de devolver INVALID_RESET**, no lanzar dentro del callback y deshacer el
contador. El éxito cambia hash, activa solo si estaba pendiente, incrementa versión,
consume el reto, invalida hermanos y revoca todas las sesiones en un único commit.
Exactamente un ganador entre confirmaciones concurrentes. No borrar conversaciones,
transferir owner ni iniciar sesión. El aviso de cambio no incluye código/contraseña;
un fallo del aviso no revierte el restablecimiento confirmado.

El código solo existe temporalmente en memoria y en el mensaje de correo. No
persistirlo en cola ni guardar un payload para reintento. Fallo definitivo de
envío: invalidar si el reto sigue vigente/no consumido y registrar el fallo.
Timeout tras envío: estado unknown, invalidación cuando sea posible, sin afirmar
que no llegó ni reenviar automáticamente. Si ya se consumió, no revertir el reset.
Si no puede confirmarse invalidación, queda acotado por vencimiento y uso único.
El usuario puede pedir otro bajo cuotas; un reinicio puede perder trabajos en
memoria y 202 no promete entrega. El proveedor puede tener sus propios reintentos
SMTP: distinguirlos de un nuevo POST automático de BanuChat.

## 7. Tecnología de correo propuesta

**Candidato recomendado para aprobación: Resend mediante API HTTPS**, detrás de
MailDelivery. Mantener el adaptador local/fake para pruebas automáticas; no satisface
la aceptación final Gmail. Resend necesita un dominio propio verificado; ni
banuchat.test, gmail.com, unab.edu.co ni un dominio supuesto pueden usarse como
remitente del proyecto. No hay dominio/cuenta/proveedor autorizado confirmado hoy.
Véase [dominios verificados](https://resend.com/docs/dashboard/domains/introduction).

| Opción | Evaluación para este incremento |
| --- | --- |
| API transaccional Resend con remitente de proyecto | Candidata: HTTPS con fetch del runtime, sin SDK obligatorio; clave de envío custodiada, un destinatario y sin cc/bcc. Requiere cuenta aprobada, DNS/dominio y revisión de privacidad/coste |
| Otro proveedor transaccional autorizado | Puede sustituir el adaptador; debe demostrar mismos resultados, protección de claves, dominio, cuotas y retención. Selección concreta requiere revisión |
| Gmail API/SMTP con cuenta de proyecto | Posible alternativa, pero añade OAuth/scopes o credencial específica y operación Google; no se propone como camino inicial ni se toman credenciales personales |
| Captura SMTP local/fake | Útil para errores, cuotas y carreras; insuficiente para probar llegada a Gmail |

Remitente/configuración y destinatario se resuelven en backend. Clave API por
entorno en secreto externo/archivo local ignorado, con mínimo permiso de envío y
dominio limitado si el proveedor lo permite; nunca claves Gmail del destinatario.
HTTP timeout acotado, sin redirecciones ni retry automático; idempotency-key opaca
por dispatch si se usa la capacidad del proveedor, sin asumir que eso confirma
recepción o permite persistir el código. [API de envío](https://resend.com/docs/api-reference/emails/send-email).

Interfaz candidata: MailDelivery.sendRecoveryMessage recibe referencia de contacto
autorizada, destinatario resuelto, código, propósito, vencimiento y correlation_id
opaco; retorna accepted con referencia del proveedor, rejected o unknown. No se
exporta a REST/MCP ni acepta valores del modelo. El adaptador vuelve a comprobar
allowlist/consentimiento, estado de verificación (o verify_contact), dominio Gmail
permitido y ausencia de encabezados inyectados. Configuración inicial de recepción:
solo buzones de prueba autorizados gmail.com, no cualquier dirección del dominio.

Desactivar tracking de aperturas/clics, sin URL con código, píxeles ni datos de
cursos. Asunto genérico, cuerpo mínimo BanuChat/código/vencimiento/finalidad. El
proveedor y Gmail procesan y pueden conservar dirección y mensaje: revisar acceso
al dashboard, región, retención y borrado antes de autorizar; no afirmar que el
código nunca sale del backend ni que el proveedor guarda solo un HMAC.

Configurar SPF, DKIM y DMARC y comprobar alineación, además de TLS del transporte.
Es una política candidata de BanuChat más estricta que el mínimo general: Google
distingue requisitos generales de los de remitentes masivos. No atribuir todos los
requisitos de volumen a esta demo. [Guía oficial de remitentes Gmail](https://support.google.com/a/answer/81126).
TLS de la API de BanuChat fuera de loopback sigue siendo un gate separado.

No se contrata un plan, registra dominio, configura DNS ni envía un mensaje en esta
tarea. Cuotas, coste y condiciones de cuenta deben confirmarse para la selección
aprobada; no se asume cupo gratuito suficiente ni disponibilidad de una cuenta.

## 8. Evidencia: estados que no se deben confundir

| Estado | Qué permite afirmar | Evidencia privada/mínima |
| --- | --- | --- |
| Reto emitido | Se creó un verificador válido y propósito | Registro DB, sin código/dirección en el reporte |
| Envío aceptado | El proveedor aceptó el mensaje | Resultado API y referencia privada del proveedor |
| Entregado al servidor de destino, si se observa | El servidor de correo aceptó el envío | Evento del proveedor; no demuestra bandeja visible |
| Recepción Gmail comprobada | El destinatario vio ese mensaje en su Gmail de prueba autorizado | Verificación manual del titular, referencia de ensayo, timestamps y evidencia depurada |
| Código consumido | Confirmación válida y cambio transaccional confirmado | 204 + estado DB + login nuevo/rechazo viejo + sesiones revocadas |

En Resend, email.sent representa aceptación del intento y email.delivered llegada
al servidor del destinatario; email.received corresponde a recepción **en Resend**,
no a la bandeja Gmail. No usar apertura rastreada como prueba. [Eventos oficiales](https://resend.com/docs/webhooks/event-types).
Este delta no requiere un nuevo webhook público ni permiso Gmail de lectura:
para el ensayo, el operador consulta el proveedor y el titular su propio buzón.

El criterio final es recepción visible en bandeja Gmail dentro de los 300 s y
consumo antes del vencimiento, tanto para initial_set como para reset. Llegada
solo a Spam se documenta y no se declara éxito de bandeja hasta corregir/revisar
ese criterio. Una entrega tardía es fallo de la prueba de recuperación breve aunque
el proveedor declare aceptación. No ocultar fallos ni prolongar expiración sin delta.

## 9. Banco e instrumentos pendientes

Instancia PostgreSQL nueva aislada; sin bases originales. HTTP loopback de prueba,
dos cuentas con el mismo perfil ficticio, **dos buzones Gmail de prueba distintos**
consentidos, dominio remitente aprobado y acceso mínimo al proveedor. Identificar
buzones solo como GMAIL_TEST_A/B en Git; las direcciones y autorizaciones se custodian
en privado. No usar ejemplos privados previos del equipo ni expedientes reales.

Pruebas que deberá acreditar la implementación, aún **no ejecutadas**:

1. Contacto sin evidencia/consentimiento no habilita recuperación; verify_contact
   no establece contraseña ni sirve como initial_set/reset.
2. Cuenta pendiente → initial_set recibido en Gmail → contraseña conforme → active,
   sin sesión automática → login real; sin fixture que active la cuenta por SQL.
3. Activa → reset recibido en Gmail → 204 → contraseña vieja rechazada/nueva válida,
   auth_version incrementada y todas las sesiones anteriores rechazadas.
4. Código consumido, expirado en el borde, alterado, propósito/UID/contacto/ámbito
   distinto o cinco errores: mismo INVALID_RESET; ceros iniciales conservados;
   números JSON, espacios y Unicode parecido rechazados como argumentos.
5. Dos consumos concurrentes, replay y reemisión: un ganador, sin filas parciales;
   errores conservan sus contadores; no reutilización del valor reciente de la cuenta.
6. Cuotas persistentes por UID/origen/Argon2, cambio de IP, nueva instancia de
   servicio y UID ausente: sin reinicio de presupuesto, enumeración o envío arbitrario.
7. Rechazo antes de aceptación, timeout incierto, caída DB/cola/proveedor, mensaje
   retrasado y caída del aviso: estados correctos y ninguna afirmación de recepción.
8. Captura local y dobles para errores deterministas; **prueba externa separada** de
   aceptación del proveedor, recepción Gmail observada y consumo, sin exponer secretos.
9. Trece operaciones previas, JSON schemas actualizados, código de sesión de 43
   caracteres, ownership A/B y revocación durante generación conservados; sin v1 anónima.
10. Huellas de corpus/conversaciones originales intactas; permisos efectivos de
    008 mínimos; direcciones/códigos/claves ausentes en Git, logs y reportes.

Instrumento de recepción: ficha privada de ensayo con pseudónimo de buzón,
propósito, referencia opaca de dispatch, tiempos de solicitud/aceptación/observación/
consumo, ubicación Inbox/Spam/ausente y resultado. El titular introduce código
por entrada oculta del harness autorizado, nunca argumento CLI/historial o chat.
No exportar mensajes completos ni screenshots con código/email, incluso después
de vencido; reporte público solo agrega resultados depurados. Una misma recepción
no cuenta como prueba de dos buzones ni como prueba de las dos finalidades.

## 10. Impacto, dependencias y aprobación

Estimación para implementación **posterior**, todas las filas condicionadas a
aprobación; no fechas confirmadas. Un responsable backend con seis horas efectivas
por jornada, soporte QA/operación disponible en las ventanas indicadas, reutilizando
AUTH-P1/P2 y sin trabajo Mobile:

| Tarea | Rol principal | Esfuerzo estimado | Dependencia/entregable |
| --- | --- | --- | --- |
| Conciliar contrato, matriz y diseño aprobado | Backend + Sala | 4–6 h | Decisión explícita sobre schema y política de códigos |
| 008, contacto cifrado y aprovisionamiento/verificación | Backend + operador autorizado | 10–16 h | Esquema/ACL y banco ficticio, claves y consentimiento privados |
| Servicio de códigos, cuotas, consumo y carreras | Backend | 16–24 h | PG real, propósito, HMAC, invalidación y sesiones |
| MailDelivery y proveedor/DNS | Backend + administrador de dominio | 6–10 h | Dominio/cuenta autorizados, credencial y envío de prueba |
| Rutas y validación REST | Backend | 6–10 h | Delta OpenAPI aprobado y núcleo funcional |
| SQL/HTTP, Gmail real, adversas y regresiones | QA + backend + titulares de buzones | 10–16 h | Los dos buzones y proveedor disponibles |
| Depurar evidencia y cerrar checkpoint | Backend + QA | 4–6 h | Resultados reales y revisión de custodia |
| **Total** | Trabajo combinado | **56–88 h** | Aproximadamente **10–15 jornadas** a seis horas/jornada |

Esperas de autorización, disponibilidad de titulares, habilitación de cuenta,
dominio/DNS, reputación y entrega se suman al esfuerzo: no tienen fecha confirmada.
Con dominio/cuenta inexistentes, no hay plazo defendible de llegada Gmail hoy.
Configuración del proveedor puede paralelizarse con SQL una vez aprobada; la
recepción real bloquea el cierre final aunque código y pruebas locales pasen.
No se asumen dieciséis semanas restantes ni se recortan objetivos OE1–OE6.

Archivos previstos para un incremento autorizado: api-contract-v2.md/openapi-v2.yaml,
auth-permissions.md y diseño X01 con nota de supersesión; nueva 008; servicios de
recuperación/contactos/códigos/correo, limitador, auditoría y composición HTTP;
adaptador del proveedor y harness/test de Gmail depurado. No cambiar 001/006/007,
MCP, RAG, corpus o Mobile; sesiones conservan sus tokens actuales. Se debe actualizar
la dependencia semántica de pruebas AUTH-P0 de reset sin reescribir sus otros contratos.

Sala debe resolver antes de ejecutar: revisión de contrato y tratamiento del formato
anterior; política 8 dígitos/300 s/cinco intentos/un activo; 008 y ACL/custodia/retención;
verificación administrativa del contacto; proveedor/remitente/dominio/presupuesto;
dos buzones consentidos, responsables y evidencia privada. Las direcciones o claves
no deben suministrarse en esta revisión pública. Ninguna aprobación documental
equivale todavía a recepción Gmail o a autorización universitaria.
