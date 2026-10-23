# CHECKPOINT BANUCHAT — BCH-04/AUTH-P3.2

Fecha local: 2026-10-23. Base confirmada y árbol inicialmente limpio:
`aa3d44dbc9fb8ccfe7104c1356b8aaee396b580b`.
AUTH-P3.1 está aceptado/cerrado como implementación local. **AUTH-P3 completo no
se propone cerrar: AUTH-P3.2 está bloqueado por requisitos externos no disponibles.**

El equipo confirmó durante este trabajo: todavía no dispone de proveedor aprobado,
dominio/remitente verificado y credencial de envío. Se detuvo la prueba externa.
No se crearon cuentas externas, contrataron servicios, compraron dominios,
configuraron remitentes o enviaron correos. No se accedió a ningún buzón privado.

## 1. Preflight y estado real

| Requisito | Resultado |
| --- | --- |
| RecoveryService / MailDelivery | Revisados; se conserva el núcleo, máquina de estados, HMAC, cuotas y adaptador accepted/rejected/unknown de AUTH-P3.1 |
| Proveedor aprobado | No disponible, confirmado por el equipo; Resend sigue siendo candidato |
| Cuenta, dominio y remitente verificados | No disponibles/acreditados; ninguna cuenta consultada o creada |
| Credencial de envío | No disponible; no se solicitaron valores por chat ni buscaron credenciales ajenas |
| Contacto académico autorizado | Autorización voluntaria previa se conserva; dirección concreta no leída ni configurada |
| Entrada privada del titular | No se ha celebrado sesión ni instalado consola operativa de captura |
| Configuración anterior local | No había config/secrets AUTH-P3.2 ni variables BANUCHAT_RECOVERY_CONFIG/RESEND_API_KEY/BANUCHAT_MAIL_PROVIDER/BANUCHAT_MAIL_SENDER en este proceso |
| Base/deployment operativos | No seleccionados ni conectados; no se inventó un destino o aplicó SQL |
| Material de recuperación operativo | Sin almacén configurado o restauración acreditada; claves de pruebas anteriores no se reutilizan como operativas |

Se revisaron requisitos oficiales actuales del candidato: dominio propio verificado,
credencial restringida de envío, límites de equipo/cuotas de cuenta y diferencia
entre aceptación/entrega/bandeja. Fuentes y condiciones de almacenamiento del
proveedor en el [runbook](../operations/auth-p32-correo-real.md). No se presupone
Gmail por dominio académico ni identidad UNAB. Revisión documental no confirma
propiedad del dominio, estado de una cuenta o presupuesto.

## 2. Configuración preparada, sin activación

[Plantilla](../../infra/auth-p32-config.example.json), con campos vacíos y envío
deshabilitado, copiada a `infra/local/auth-p32/config.json`, ignorada por Git. No
contiene dirección, clave, contraseña, código o mensaje reales. Se propone almacén
cifrado de usuario fuera de Git/OneDrive para configuración real y material estable;
**no se implementó ni acreditó su cargador/DPAPI operativo** en esta fase bloqueada.

Se añadió un preflight ejecutable de metadatos, sin red/DB/envío:
`npm run auth:p32:preflight` desde backend/api. Devuelve BLOCKED y nueve causas
fijas, sin detalles privados; exit nativo2 esperado. Incluso con metadatos completos
devuelve PRIVATE_REVIEW_REQUIRED, nunca autoriza envío o supone verificación real.
Solo comprueba estructura/condiciones declaradas; no autentica ante proveedor.

Campos: proveedor y aprobación opaca; remitente/evidencia de dominio; destinatario
único/consentimiento; disponibilidad de titular; referencia de almacén/keyset y
restauración; base/deployment autorizados; cotas propuestas seis mensajes por sesión,
intervalo1000ms y timeout10000ms, pendientes de adopción y enforcement operativo.
No se conectó una configuración real a fetch, al servidor v2 o a PostgreSQL.

Composición de envío, cargador privado, limitación saliente y entrada oculta de
titular **siguen pendientes**, no se presentan como funcionalidades terminadas.
El plazo10s y ausencia de retry del adaptador existente sí se comprobaron localmente.
No se modificó el adaptador ni fue necesaria una corrección de seguridad para estas
pruebas; cualquier corrección posterior exige presentar impacto/pruebas antes.

## 3. Contacto real y recuperación externa

| Escenario | Aceptación proveedor | Entrega informada | Recepción titular | Consumo externo |
| --- | --- | --- | --- | --- |
| verify_contact | NO EJECUTADO | NO ACREDITADA | NO OBSERVADA | NO EJECUTADO |
| initial_set | NO EJECUTADO | NO ACREDITADA | NO OBSERVADA | NO EJECUTADO |
| reset / nueva contraseña | NO EJECUTADO | NO ACREDITADA | NO OBSERVADA | NO EJECUTADO |

No se aprovisionó una cuenta operativa, registró contacto real o marcó verified.
Login/nueva contraseña/rechazo de anterior/revocación/uso único/expiración externa
están **pendientes**, aunque sus casos locales sigan acreditados en AUTH-P3.1.
No se usó captura local como sustituto de bandeja externa.

El runbook establece el recorrido completo con UID/nombre ficticios y contraseña
propia. El titular deberá introducir códigos fuera de Git/chat/logs; no se le pide
que los envíe aquí. Prueba adicional de expiración requiere siguiente ventana
admisible: verify_contact+initial_set+reset ya consumen tres solicitudes UID/h.
No se deben cambiar cuotas, relojes, 008 o contratos para acelerar esa prueba.

## 4. Seguridad y pruebas ejecutadas

| Comprobación | Resultado real |
| --- | --- |
| `npm run typecheck` | PASS, exit0 |
| `npm run build` | PASS, exit0 |
| `npm test` | **556/556**, cero fallos, cancelaciones u omisiones |
| Foco inicial correo/crypto/contrato | 18/18; la suite completa posterior incluye las siete pruebas nuevas y su aserción final de aborto |
| Preflight directo | BLOCKED esperado, exit2; sin envío, lectura de secretos, PostgreSQL o proveedor |
| Configuración ignorada | `git check-ignore` confirma infra/local/auth-p32/config.json |

Las siete pruebas nuevas acreditan: plantilla bloqueada, errores saneados sin input,
metadatos completos insuficientes, estados de respuestas200/401/403/429/500/503,
fallos de red/JSON→unknown sin detalles, un intento sin retry, allowlist exacta de
un destinatario, sin CC/BCC/redirects/datos académicos, deadline real10s que aborta
una operación **inyectada sin red**, y restauración de material ficticio persistido
en **dos procesos nuevos** con el mismo archivo y verificación/descifrado correctos.
El archivo temporal ficticio se retira; no se imprimen claves/MAC/códigos/contenido.

Restauración probada solo para el formato/fábrica criptográfica existente y material
ficticio. No prueba reinicio del servidor con contacto real, custodia DPAPI, backup
o rotación operativa. Timeouts/fallos son dobles controlados, no errores obtenidos
de una cuenta real Resend. Ningún HTTP de estas pruebas nuevas sale a Internet.

Regresiones unitarias/contrato y HTTP controlado existentes pasan. No se reejecutaron
integraciones PostgreSQL históricas ni Ollama/Docker: no hay cambios en sus rutas,
SQL o permisos y no hay destino operativo autorizado. Compatibilidad AUTH-P2 se
revisa por integridad de sus fuentes/contrato y esas regresiones; no se atribuye
una nueva validación SQL/HTTP con cuenta externa. No hay un listener nuevo o RESTv1
anónima añadido a la composición v2.

## 5. Integridad, evidencia y archivos

[Evidencia depurada](../../eval/auth/results/bch04-auth-p32-evidence.json): estados
externos no ejecutados, pruebas locales, hash/diff de superficies protegidas y
causas de bloqueo, sin direcciones, payloads, códigos, tokens, PHC o claves reales.
Revisión de archivos nuevos y reporte de prueba sin destinatarios reales/secretos.
No se inspeccionó el contenido de .env antiguos ni configuraciones de otros sistemas.

Añadidos: `infra/auth-p32-config.example.json`,
`backend/api/src/auth/recovery-preflight.ts`,
`backend/api/test/{auth-p32-preflight.mts,auth-p32-mail.test.ts}`,
`docs/operations/auth-p32-correo-real.md`, este checkpoint y la evidencia JSON.
Modificado únicamente `backend/api/package.json` para el comando de preflight.
Copia local ignorada del manifiesto y log local de tests; sin secretos operativos.

Sin cambios en RecoveryService, RecoveryCrypto, MailDelivery, composición v2,
AUTH-P2, contratos REST/MCP, migraciones001–008, corpus/releases/embeddings,
Mobile/RAG/N8N/T11/U03/U04 o historiales. Sin conexiones a las bases originales ni
modificación de roles, PUBLIC o contenedores. Sin dependencias nuevas/lockfiles.
`git diff --check` y revisión de archivos nuevos completan el cierre local.

## 6. Requisitos para reanudar y decisión propuesta

1. Sala selecciona proveedor y autoriza condiciones de envío/retención/gasto si
   corresponde; equipo aporta cuenta existente y remitente/dominio verificado.
2. Disponer de credencial restringida, único destinatario consentido y titular,
   configurados privadamente; sin enviarlos por chat ni incorporar UID institucional.
3. Autorizar base sintética/deployment/roles exactos y custodia estable cifrada con
   prueba de restauración; no reutilizar bases actuales para experimentos destructivos.
4. Completar cargador/composición/entrada privada/cotas y revisar sus controles
   antes del primer envío; ejecutar verify_contact externo y flujo completo, con
   evidencia separada de aceptación, entrega informada, recepción y consumo.

**Decisión propuesta: conservar AUTH-P3.1 cerrado localmente y AUTH-P3 completo
pendiente. AUTH-P3.2 bloqueado externamente; no afirmar correo funcional.**
Detención para revisión de Sala de Control, sin commit/push ni inicio de AUTH-P4,
M02 o A01. No se solicita ni interpreta esta entrega como autorización de compras,
cuentas, nuevas credenciales o envíos a otros destinatarios.
