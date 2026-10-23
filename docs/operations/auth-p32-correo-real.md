# BanuChat — operación de correo AUTH-P3.2

Estado 2026-10-23: preparación local, **envío externo bloqueado**. El equipo confirmó
que todavía no dispone de proveedor aprobado, remitente verificado ni credencial.
No iniciar el procedimiento externo con el manifiesto incompleto.

## Configuración preparada y alcance efectivo

La [plantilla sin secretos](../../infra/auth-p32-config.example.json) describe la
configuración explícita. Se copió desactivada a `infra/local/auth-p32/config.json`,
ignorada por Git. No contiene direcciones, claves, contraseñas, códigos, destinatario
por defecto, base seleccionada o deployment inventado. **No es una conexión de
correo implementada/activada.** No se configura un proveedor por inferencia.

Desde `backend/api`, `npm run auth:p32:preflight` solo lee ese manifiesto y muestra
códigos fijos. Ejecución directa equivalente:
`node --import tsx test/auth-p32-preflight.mts`. Exit nativo2: bloqueo; exit3:
metadatos completos pero revisión privada obligatoria. npm puede normalizar el
exit no cero. Nunca interpreta metadatos como evidencia de dominio verificado,
credencial válida, claves restauradas, conexión DB o permiso de enviar. No accede
a un almacén secreto, PostgreSQL, proveedor ni buzón, y no tiene función de envío.
Rechaza estructura inesperada y sanea errores sin imprimir input/paths/stack.

| Grupo | Campos y condición antes de operación |
| --- | --- |
| Aprobación | provider/approval_reference; Resend es solo candidato soportado por el adaptador existente, no seleccionado |
| Remitente | Dirección real propia autorizada; dominio verificado en proveedor, evidencia opaca y control DNS consentido |
| Único destinatario | Dirección académica voluntaria exacta, consentimiento opaco y titular presente; no deducir proveedor/identidad del dominio |
| Material privado | Almacén cifrado externo a Git, logs y carpetas sincronizadas, protección de usuario y clave de custodia; referencia estable de keyset y prueba de restauración |
| Base/ámbito | Nombre y deployment exactos autorizados, sintéticos, runtime limitado y 001/006/007/008 compatibles; ninguna conexión implícita a demo/CCD |
| Cotas | Propuesta de seis mensajes por sesión controlada, mínimo1000ms entre envíos, deadline10000ms; cuotas reales del proveedor confirmadas |

Las cotas del manifiesto son **propuestas operativas, aún sin wrapper de transporte
conectado**. El adaptador actual sí conserva deadline10s y ausencia de retry; el
núcleo mantiene cuotas3 solicitudes/UID/hora, origen e intentos de AUTH-P3.1. Antes
del envío real debe componerse su control de cotas y su cargador privado con el
proveedor elegido. No se presenta el manifiesto como enforcement ya instalado.

La estructura describe datos privados en memoria; no llenar/guardar direcciones o
secretos reales en la plantilla versionada ni en el manifiesto de estado actual.
Antes de configurar, preparar almacenamiento cifrado con permisos del operador,
fuera de OneDrive/Git. En Windows se propone DPAPI CurrentUser; su cargador y
custodia operativa están pendientes, **no implementados por este manifiesto**.
DPAPI sin clave explícita está documentado por
[Microsoft](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.security/convertto-securestring).
No se generaron claves operativas ni se leyó una dirección real.

## Requisitos actuales del candidato

Revisados en documentación oficial el 2026-10-23:

- Resend requiere dominio propio verificado para el envío previsto. El equipo
  necesita dominio/remitente autorizado y evidencia de verificación; no basta la
  existencia de un destinatario académico. [Dominios](https://resend.com/docs/dashboard/domains/introduction).
- La API usa credencial privada. Preferir permiso de envío restringido al dominio
  autorizado, sin clave administrativa amplia ni credenciales Gmail personales.
  [Permisos](https://resend.com/changelog/new-api-key-permissions).
- Documenta límite por defecto10 solicitudes/s por equipo, compartido entre sus
  claves; la cuota efectiva depende de la cuenta. Consultar sus límites reales y
  tratar429 sin retry automático. No asumir plan, saldo o presupuesto aprobado.
  [Límites y cuotas](https://resend.com/docs/api-reference/rate-limit).
- POST de envío e idempotencia ya están preparados en el adaptador aceptado; una
  respuesta aceptada no confirma recepción. [API](https://resend.com/docs/api-reference/emails/send-email).
- `Delivered` informa aceptación por el servidor de destino; puede no llegar a la
  bandeja visible. Se requiere observación del titular por separado.
  [Explicación de entrega](https://resend.com/docs/knowledge-base/what-if-an-email-says-delivered-but-the-recipient-has-not-received-it).

La política de almacenamiento del proveedor también requiere revisión del equipo:
su opción para desactivar contenido tiene condiciones comerciales y operativas.
No asumir que el proveedor carece de logs/contenido, ni contratar esa opción. Si la
política del proyecto exige cero almacenamiento allí, resolver esa compatibilidad
antes de elegirlo. [Condiciones publicadas](https://resend.com/docs/knowledge-base/how-do-i-ensure-sensitive-data-isnt-stored-on-resend).
Esta observación no modifica el adaptador ni autoriza gasto. La política local
sigue prohibiendo direcciones/códigos/mensajes/credenciales reales en logs/evidencia.

## Custodia y reinicio

Conservar los mismos32 bytes independientes para MAC, AES-GCM, lookup y cuotas,
keyId actualv1 y deployment existente de la base autorizada. No generar claves al
arrancar ni reutilizar claves de funciones distintas. Separar credencial de envío,
credenciales runtime/aprovisionador y material criptográfico. No ponerlos en args,
URLs, historial de shell, .env compartido o salida de herramientas. Inyectar en
memoria desde custodia aprobada; no activar logs de parámetros SQL/HTTP ni traces
del cuerpo de correo. El cifrado de contacto de 008 no protege su clave externa.

Para acreditar reinicio operativo: preservar un contacto cifrado y reto pendiente;
detener limpiamente antes de aceptar trabajo nuevo, reiniciar con el mismo almacén
y ámbito, descifrar/verificar mediante el núcleo, y consumir dentro de300s. No
rotar accidentalmente ni regenerar deployment. UID/origen e intentos persisten en
PostgreSQL; cola RAM no es durable. No reenviar POST/correo de resultado incierto.
No cambiar identificadores de clave ni crear anillo de rotación en este incremento.

Solo se probó restauración con archivos **ficticios temporales** y dos procesos
nuevos; no acredita DPAPI/backup ni reinicio de una composición operativa real.

## Procedimiento externo pendiente

Reanudar únicamente al disponer de los requisitos y composición privada verificados.
No crear cuentas de proveedor, comprar dominio o cambiar DNS institucional sin
aprobación específica. Seleccionar base sintética nueva/separada y deployment
expresamente autorizados; preservar corpus y conversaciones existentes. No aplicar
migraciones ni cambiar roles en demo/CCD por conveniencia. No borrar automáticamente
una base que vaya a contener contacto real; definir su custodia/retención.

1. Preparar el cargador privado, control de cotas y entrada interactiva local
   fuera de chat, herramientas con transcripción y logs. Usar entrada oculta para
   códigos/contraseñas y canal anónimo de proceso en memoria, sin args/env con sus
   valores. No se ha creado esa consola operativa en esta entrega bloqueada.
2. Componer `ResendHttpsMailDelivery` solo si es el proveedor aprobado, con fetch
   HTTPS fijo/sin redirects, clave de envío, remitente y allowlist de una dirección.
   Mantener el Pool limitado, scope007 y manejador de errores idle sin secretos.
   Reutilizar RecoveryService y createAuthenticatedRuntimeServer; no montar v1.
3. Aprovisionar UID y nombre **ficticios** con el aprovisionador restringido.
   `accounts.recovery_email` permanece histórico sintético. Registrar por operación
   interna el contacto real consentido, inicialmente pendiente, sin API pública.
4. Emitir verify_contact. El titular consulta personalmente su bandeja y introduce
   el código por entrada privada. Consumir mediante verifyContact; solo entonces
   permitir verified con canal external_email. No actualizar verified por SQL ni
   copiar una verificación local_test al canal externo.
5. Solicitar por UID, recibir initial_set y confirmar la primera contraseña
   Argon2id; iniciar sesión normal. Crear dos sesiones y conservar sus secretos
   únicamente en memoria para la comprobación de revocación.
6. Solicitar recuperación por UID; observar la recepción nueva y confirmar código
   y contraseña nueva mediante las rutas v2 existentes. Probar204, rechazo de la
   contraseña anterior, aceptación de la nueva y revocación de ambas sesiones.
   Reusar el código consumido debe producir INVALID_RESET sin cambio adicional.
7. Para expiración externa emitir otro reset en la **siguiente ventana admisible**
   de UID; esperar al menos300s según reloj PostgreSQL y comprobar rechazo. Las tres
   emisiones verify_contact/initial_set/reset ya agotan3/UID/h. No desactivar cuotas
   para forzar una cuarta emisión. Los avisos de cambio suman dos correos: cinco en
   flujo normal, más uno de expiración. Validar esta cuenta contra cuotas reales.

No enviar a dominios de prueba del proveedor, otras direcciones, CC/BCC o buzones
no autorizados. No consultar bandeja por API/automatización; no inferir Gmail.
El operador solo conserva hechos/ref opacas sin destinatario, payload o código.

| Evidencia independiente por verify_contact/initial_set/reset | Acreditación necesaria |
| --- | --- |
| Aceptación | Estado accepted y referencia opaca del proveedor; no prueba bandeja |
| Entrega informada | Estado de proveedor observado por operador autorizado; no exportar sus logs/capturas con contenido privado |
| Recepción | Declaración del titular, momento y referencia de escenario sin dirección/código/mensaje |
| Consumo | Resultado del caso de uso y marca transaccional; no exportar verificador/hash |

No añadir webhooks, lectura de buzón o una ruta nueva para esa evidencia. Si alguna
corrección de seguridad del adaptador resulta necesaria, presentar impacto y
pruebas a Sala **antes de aplicarla**. Este incremento no modifica ese adaptador.
