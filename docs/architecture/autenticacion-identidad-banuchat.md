# BanuChat — X01-AUTH.1: identidad sintética, autenticación y autorización

Fecha de revisión: 2026-10-22. Estado: **propuesta de análisis y diseño para Sala de Control; implementación no autorizada**.

Base inspeccionada: `28f65bf9cc6f83d9579048844608b881233b28ae`; árbol limpio al iniciar. Esta actualización incorpora las diez decisiones de Sala de Control sobre cuentas permanentemente sintéticas. Sustituye para X01-AUTH.1 la premisa anterior de utilizar identidades universitarias como acceso funcional de la demo. El título de la solicitud inicial no acredita una integración universitaria.

## 1. Decisiones y límites vigentes

1. Las cuentas, UID, correos asociados y perfiles académicos de demostración serán **permanentemente sintéticos**. No se prevé sustituirlos por estudiantes o expedientes reales.
2. BanuChat verificará su propia contraseña mediante UID sintético. Es una autenticación funcional del producto, sin validar contraseñas ni matrícula UNAB.
3. Cada cuenta tendrá un correo sintético único bajo un dominio reservado de pruebas y un destino en un buzón local controlado. Ejemplo inventado para este documento: `BCH-DEMO-0001` y `demo-0001@banuchat.test`. No representan formatos oficiales ni datos de una persona.
4. No habrá registro público. El aprovisionamiento será una operación administrativa controlada, separada de REST público y del modelo conversacional.
5. Los ejemplos privados de UID/correo del integrante del equipo no son insumos de implementación. No copiarlos a código, documentación, fixtures, seeds, logs ni pruebas. Tampoco usar destinatarios reales bajo `@unab.edu.co`.
6. La recuperación tendrá tokens aleatorios, de un solo uso y con vencimiento, verificadores almacenados de forma segura, límites de solicitudes, respuesta genérica e invalidación de sesiones.
7. El envío de correo tendrá una interfaz de aplicación estable, un adaptador local de pruebas y la posibilidad de incorporar posteriormente un proveedor autorizado. No se configura ahora ningún proveedor.
8. La persistencia de autenticación será adicional y separada del corpus. Las relaciones de autorización serán explícitas; `profile_key` y los UUID no serán credenciales.
9. Se conservan el dataset sintético v1, los datos/releases CCD, las reglas de publicación, recuperación y citas. La autenticación no concede vigencia institucional a una fuente.
10. Una eventual federación oficial requerirá otra decisión, permisos e integración independiente. No implica transformar las cuentas sintéticas en personas reales.

Este incremento produce únicamente este diseño. No aplica SQL ni modifica contratos REST/MCP, backend, Mobile, configuración, permisos PostgreSQL o datos. No inicia M02/A01 ni integra MCP al chat. Se mantiene el alcance completo OE1–OE6 del [plan integral](../academic/plan-ejecucion-alcance-original.md).

## 2. Auditoría del estado actual

Inspección estática de código y documentos; no se intentaron accesos cruzados ni se ejecutaron ataques, consultas PostgreSQL, llamadas Ollama o pruebas de autenticación. Los riesgos siguientes se deducen de las comprobaciones presentes y ausentes, no son resultados de un ensayo de explotación.

### 2.1 Evidencia y brechas

| Superficie revisada | Estado observado | Brecha para el acceso funcional |
| --- | --- | --- |
| [REST](../../backend/api/api-contract.md), [OpenAPI](../../backend/api/openapi.yaml), [servidor HTTP](../../backend/api/src/http/api-server.ts) | REST `1.0.0-draft`; OpenAPI declara `security: []`. No se obtiene un principal autenticado antes de despachar operaciones | No hay login, sesión, autorización por cuenta ni códigos 401/403/429 en el contrato actual |
| [Creación](../../backend/api/src/application/conversations.ts) e [historial](../../backend/api/src/application/conversation-history.ts) | Creación valida perfil/release. Listado filtra por `profile_key`, incluso entre releases históricas | La selección de perfil permite agrupar datos, no demostrar propiedad |
| [Detalle](../../backend/api/src/application/conversation-detail.ts) y [mensajes](../../backend/api/src/application/messages.ts) | Contexto obtenido por UUID; se conservan release, ordinales y citas. La persistencia del turno ya tiene controles de concurrencia | Quien conoce un UUID no necesita demostrar ser su propietario; el contexto puede alimentar respuestas sin esa comprobación |
| [Borrado](../../backend/api/src/application/delete-conversation.ts) | `DELETE` por UUID; la cascada alcanza mensajes y citas; ausencia devuelve éxito idempotente | No incluye principal/propietario. La limitación en Mobile no autoriza al backend |
| [Schema inicial](../../infra/db/001_initial_schema.sql) | `conversations` relaciona release y perfil; mensajes y citas dependen de la conversación. No hay cuentas, credenciales o propietarios de autenticación | La FK de perfil no puede sustituir una relación de autorización |
| [Migración CCD 003](../../infra/db/003_ccd_chat_demo.sql), [guardia CCD](../../backend/api/src/ccd-runtime.ts) | `ccd-local-demo` es un contexto técnico compartido, sin estudiante; cero perfiles sintéticos en esa base | No identifica al operador ni separa conversaciones por persona. No poblarlo con cuentas o expedientes |
| [SessionProvider](../../mobile/src/session/session-context.tsx) y [control local de conversaciones](../../mobile/src/session/operator-conversations.ts) | Perfil en memoria; en CCD se recuerda un conjunto volátil de UUID abiertos en esa ejecución | No son sesiones verificadas. Reiniciar la app no revoca derechos en servidor; la lista local no es una frontera de seguridad |
| [Cliente de conversaciones](../../mobile/src/api/conversations.ts), otros clientes y [navegación](../../mobile/src/app/_layout.tsx) | Fetch sin credencial de sesión; pantallas restringidas por modo de demo | Faltan login, recuperación, almacenamiento seguro, guardias por sesión y limpieza completa al cambiar de cuenta |
| [Configuración Mobile](../../mobile/src/config/api.ts), [runtime API](../../backend/api/src/runtime-config.ts) | HTTP/HTTPS local; CCD limitado a loopback. El modo sintético admite bind LAN opcional | No abrir el servidor actual a un piloto multiusuario. TLS y perímetro del entorno autenticado requieren diseño y validación propios |
| [Dependencias API](../../backend/api/package.json), [Mobile](../../mobile/package.json), [adaptador PostgreSQL](../../backend/api/src/data/pg-client.ts) | API usa `pg` sin framework de autenticación. Mobile Expo 57 sin dependencia de almacenamiento seguro. `SqlQueryClient` expone consultas, sin unidad de transacción fijada a una conexión | Harán falta un verificador de contraseñas, un adaptador seguro Mobile y transacciones explícitas; no es suficiente añadir middleware superficial |

La nomenclatura SQL `session_release` de los triggers corresponde a consistencia de publicaciones/conversaciones, **no a sesiones de autenticación**.

### 2.2 Inventario de operaciones y autorización requerida

Todas las rutas de esta tabla son actuales, relativas a `/api/v1`; la última columna describe la política futura, sin aplicarla.

| Operación actual | Asociación/exposición actual | Regla futura |
| --- | --- | --- |
| `GET /profiles` | Enumera perfiles seleccionables o contexto compartido CCD | Sustituir selección libre por perfil asignado en `auth/me`; no directorio de otras cuentas |
| `POST /conversations` | El cliente elige `profile_key` | Cuenta activa y perfil asignado por servidor; crear conversación y propietario en una transacción |
| `GET /conversations?profile_key=…` | Agrupa historial por clave, sin dueño | Listar exclusivamente conversaciones del principal, antes de ordenar/limitar |
| `GET /conversations/{id}` | Devuelve mensajes y citas por UUID | Propiedad verificada antes de recuperar o serializar contenido |
| `POST /conversations/{id}/messages` | Usa perfil e historial de ese UUID | Propiedad, sesión y contexto autorizados antes de router/RAG y otra vez antes de persistir |
| `DELETE /conversations/{id}` | Borra historial por UUID | Solo propietario; no cambiar corpus ni otros historiales |
| `GET /profiles/{key}/progress` | La clave del cliente determina el avance sintético | Perfil del principal resuelto por servidor; sin consultas de otro perfil |
| `GET /calendar/events` | Calendario sintético compartido | Sesión y permiso de corpus; conservar calendario común. No inventar agenda personal |
| `GET /announcements` | Anuncios sintéticos compartidos | Sesión y permiso de corpus; no simular elegibilidad individual |
| `GET /documents/{version}/artifact` | Artefacto accesible por UUID válido y reglas documentales | Sesión y permiso explícito de corpus/release; verificar bytes/hashes como hoy. Un documento común no requiere ser dueño de una conversación |

Ejemplo de riesgo por inspección: filtrar el listado por perfil A no protege el detalle, POST o DELETE de un UUID del perfil B. Ocultar botones o usar identificadores difíciles de adivinar no corrige esa ausencia. No se requieren identidades reales para probar la corrección futura.

## 3. Identidad y arquitectura objetivo

### 3.1 Identificadores y autoridades

| Concepto | Significado propuesto | No demuestra |
| --- | --- | --- |
| `principal_id` | UUID interno estable de una cuenta BanuChat; no se recicla | Identidad civil, inscripción o elegibilidad institucional |
| `synthetic_uid` | Identificador visible de acceso, único en el entorno; formato propio propuesto `BCH-DEMO-` más cuatro dígitos | Correspondencia con el formato o UID oficial UNAB |
| `recovery_email` | Dirección sintética aprovisionada y asociada a un buzón controlado; única por cuenta | Identidad institucional por el dominio o propiedad de un correo personal |
| `profile_key` | Referencia al perfil académico sintético existente, autorizada para una cuenta | Contraseña, sesión o persona real |
| `session_id` | Identificador no secreto para administración de una sesión; el token aleatorio prueba su posesión | Autenticación por conocer solamente ese ID |
| `deployment_id` / modo | Frontera fijada por configuración del servidor; base y corpus permitidos | Un modo elegible por petición, prompt o parámetro Mobile |
| Contexto CCD | Referencia técnica a una demo documental local | Estudiante, cuenta institucional o perfil académico sintético |

Normalización propuesta: UID ASCII canónico en mayúsculas, sin espacios adicionales; correo ASCII bajo el dominio de pruebas configurado, en minúsculas por ser una convención controlada de BanuChat. Rechazar ambigüedades, no normalizar silenciosamente contraseñas. No inferir longitudes o reglas oficiales a partir del ejemplo privado. Cambio de correo/UID solo por procedimiento administrativo auditado, con revocación de sesiones y tokens pendientes; no endpoint de edición pública en este alcance.

### 3.2 Flujo interno

```text
Mobile
  → REST protegida: login, sesión, recuperación, recursos
  → autenticación: token → sesión activa → principal
  → autorización: principal → perfil permitido / propietario / corpus
  → servicios de aplicación existentes
  → Intent Router → fast path o Document RAG directo
  → PostgreSQL y Ollama existentes

Casos de uso de autenticación
  → repositorio banuchat_auth (cuentas, verificadores, sesiones, permisos)
  → PasswordHasher / generador criptográfico / reloj / limitador
  → PasswordRecoveryNotifier → MailDelivery
                                → buzón local controlado
                                → proveedor futuro autorizado
```

Se reutilizan servicios, validación de releases, recuperación, citas y almacenamiento de artefactos. El principal es un contexto interno inmutable producido por autenticación, nunca un `principal_id`, correo, perfil o rol aceptado del modelo o del cuerpo de una solicitud.

No se incorpora un framework agéntico ni un proveedor de identidad para resolver este incremento. MCP permanece interno, sintético e independiente del login; su perfil controlado por servidor no representa una sesión Mobile. Su adaptación futura al contexto autorizado necesita diseño y autorización de M02/A01, sin aceptar perfiles arbitrarios del modelo ni transferir contraseñas/tokens al LLM.

### 3.3 Separación de persistencia y entornos

Decisión propuesta para el primer despliegue autenticado **sintético**: schema adicional `banuchat_auth` en la misma base sintética autorizada. Separar tablas, permisos, migraciones y backups lógicos del corpus; aprovechar transacciones y FKs locales para propiedad y creación de conversaciones. No alterar tablas del dataset, manifiestos, triggers de publicación o contenido v1. Esta separación es lógica, no una afirmación de aislamiento físico de secretos frente al administrador de esa base; backups/discos requieren protección.

El runtime debe verificar destino, `deployment_id`, modo y corpus admitido antes de servir. No crea schemas automáticamente al arrancar. Roles técnicos separados para migración, aprovisionamiento y runtime; runtime sin superusuario, administración de roles, DDL ni escritura del corpus. El administrador de cuentas no recibe lectura de chats por defecto. Auditoría mínima y protección de copias deben revisarse antes de un piloto.

CCD conserva su base, servicio, puerto, volumen, manifiestos y modo local existentes. **No aplicar este schema en CCD ni habilitar ahí acceso multiusuario en la primera implementación.** Si Sala autoriza después proteger también esa demo, reutilizar las mismas reglas con tablas adicionales de autenticación/propiedad en su base aislada y un ámbito de sesión independiente; el contexto documental CCD sigue sin convertirse en perfil académico. No replicar contraseñas automáticamente ni aceptar tokens de la demo sintética en CCD. Las FKs propuestas son locales a cada base; no se inventan FKs ni transacciones entre bases. Compartir una identidad entre despliegues sería una decisión posterior, no un requisito para la demo sintética.

La ausencia de autenticación en la demo CCD actual sigue siendo una limitación conocida: mantener loopback, controles locales y prohibición de exposición/piloto compartido hasta una autorización específica. La autenticación sintética no valida seguridad multiusuario CCD por extrapolación.

## 4. Aprovisionamiento, contraseñas y recuperación

### 4.1 Aprovisionamiento controlado

Caso de uso administrativo propuesto `ProvisionSyntheticAccount`, invocable posteriormente desde una herramienta local restringida, sin registro REST ni tool MCP. Recibe solo UID/correo inventados, perfil sintético existente y permisos de corpus explícitos. Valida unicidad, dominio permitido, destino sintético y relación de perfil; no modifica el perfil original.

Crear cuenta `pending_password`, sin credencial utilizable ni sesión. Emitir un token de establecimiento inicial con propósito `initial_set`, entregado al buzón local mediante la misma interfaz de recuperación. El consumo establece la contraseña y activa una cuenta previamente aprovisionada; **nunca crea una cuenta desde una solicitud pública**. Tokens de recuperación ordinaria usan propósito `reset`; ambos se verifican contra el estado permitido en servidor. No distribuir una contraseña común ni guardar contraseñas iniciales en seeds, argumentos de shell, consola o repositorio.

Cada cuenta tiene un perfil asignado en el entorno. Varias cuentas pueden consultar el mismo perfil académico ficticio de solo lectura: ello reutiliza v1 y permite preparar más cuentas que perfiles sin crear expedientes o alterar el corpus. **No comparten conversaciones ni sesiones**; el propietario sigue siendo el principal, no el perfil. La vinculación no implica que el alias ficticio sea el nombre del participante. Deshabilitar la cuenta revoca todas sus sesiones y tokens; no borra conversaciones ni transfiere su propiedad a otra cuenta.

### 4.2 Verificación y almacenamiento seguro

Usar Argon2id con salt aleatoria por contraseña y formato autocontenido versionado. Mínimo de referencia: memoria 19 MiB, dos iteraciones y paralelismo uno; calibrar coste y concurrencia en el equipo objetivo antes de fijar la configuración. SHA-256 simple no es un verificador de contraseña adecuado. Referencia: [OWASP Password Storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html).

Política propuesta sin MFA: 15–128 caracteres Unicode, permitir espacios, pegado y gestores, sin truncamiento, composición obligatoria ni cambios periódicos arbitrarios. Rechazar contraseñas comunes con una lista local revisada, sin enviar la contraseña a terceros. Reutilizar la misma política en establecimiento y reset. Ver [OWASP Authentication](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html). Los valores son una propuesta técnica, no una norma UNAB ratificada.

Login: mismo 401 y mensaje para UID inexistente, contraseña incorrecta, cuenta deshabilitada o pendiente; verificación equivalente con hash ficticio de coste vigente cuando no exista credencial. Calcular el hash fuera de locks largos y, antes de crear la sesión, bloquear la cuenta y comprobar que estado, credencial y versión siguen siendo los que se verificaron; un reset concurrente no debe permitir emitir una sesión con la contraseña anterior. Límite por UID normalizado y origen, presupuesto de trabajo criptográfico y rechazo antes de agotar memoria. No guardar contraseñas en Mobile, JWT, logs, prompts, eventos de auditoría, analítica o payloads de error. Elegir una implementación Argon2id mantenida y compatible con Node/imagen objetivo en el incremento autorizado; no se instala una dependencia en esta tarea.

### 4.3 Solicitud y consumo del token

1. Mobile pide recuperación enviando solo `synthetic_uid`. El servidor obtiene el correo aprovisionado; no acepta un destinatario, URL base o cuenta de reemplazo del solicitante.
2. Para una petición sintácticamente válida, devolver siempre 202 con el mismo mensaje: «Si la cuenta puede recuperar el acceso, recibirás instrucciones en su buzón asociado». No devolver email parcial, existencia, estado, token o confirmación de entrega.
3. Aplicar límites a UID conocidos y desconocidos por igual. Separar el presupuesto público por origen del límite de envío por identidad; este último suprime el envío manteniendo el 202. No bloquear la cuenta ni revocar sesiones por solicitar un reset.
4. Para una cuenta habilitada/pending aprovisionada, generar 32 bytes mediante CSPRNG, codificados base64url; 256 bits aleatorios, sin UID, timestamp o UUID como secreto. Persistir solo SHA-256 del token, propósito, cuenta, versión de credencial y vencimiento. El token completo solo atraviesa memoria y el canal de entrega controlado.
5. Enviar instrucciones al buzón local, con token para introducir/pegar en la pantalla de restablecimiento. Primera propuesta: no incluirlo en URL, para evitar historial, referrers y logs de rutas. El token solo se remite a la API en el body del POST de confirmación, protegido y excluido de logs. Un futuro enlace exige URI preconfigurada/permitida y tratamiento seguro específico, nunca construirlo desde Host o una URL recibida del cliente.
6. Mobile solicita nueva contraseña y confirmación local, borra esos campos al salir y no crea sesión automáticamente. La API valida token, propósito, estado de cuenta, versión y política de contraseña; tokens inexistentes, usados o vencidos reciben el mismo error genérico.
7. En una transacción, bloquear la cuenta y el token en orden consistente; comprobar nuevamente todas las condiciones y consumo único, escribir el hash, incrementar `auth_version`, marcar el token consumido, invalidar los demás tokens de establecimiento/reset y revocar todas las sesiones/refresh de esa cuenta. Solo una confirmación concurrente puede ganar. Fallo intermedio revierte la transacción completa.
8. Tras éxito, pedir login normal y enviar aviso de cambio sin contraseña ni token. Un fallo del aviso no deshace el cambio de contraseña; se audita sin filtrar contenido. La solicitud genérica no equivale a correo entregado. Sin transporte operativo no se declara completada la prueba de recuperación.

Comportamiento uniforme y ausencia de filtraciones temporales requieren pruebas: recorrido comparable para UID inexistentes, despacho desacoplado del tiempo de respuesta y presupuesto acotado, sin atar el HTTP a la latencia del SMTP. No añadir una cola externa ni retry automático; el incremento de implementación debe concretar el despacho local acotado y su fallo seguro. Ante fallo de envío, una nueva solicitud manual puede emitir otro token; no se registra el secreto para reenviarlo después. Se permiten pocos tokens pendientes hasta su expiración; solicitar uno nuevo no invalida por sí mismo los anteriores, y consumir cualquiera invalida todos.

El patrón se apoya en [OWASP Forgot Password](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html); sus recomendaciones no acreditan una implementación ni aprobación institucional.

### 4.4 Parámetros iniciales propuestos, pendientes de aprobación y ensayo

| Control | Valor de diseño inicial | Validación necesaria |
| --- | --- | --- |
| Token de establecimiento/reset | 32 bytes CSPRNG; 20 minutos; máximo tres pendientes por cuenta | Fronteras temporales, entropía por generador, concurrencia y limitación sin enumeración |
| Solicitud de recuperación | Máximo tres envíos por UID por hora; diez solicitudes por origen por quince minutos | Los UID desconocidos tienen el mismo presupuesto; límite por identidad conserva 202; el límite de origen puede devolver 429 uniforme |
| Login | Cinco fallos por UID por quince minutos y treinta intentos por origen por quince minutos | Pausa temporal, sin bloqueo permanente ni penalización distinta de cuentas ausentes; calibrar redes compartidas |
| Confirmación/reset | Diez intentos por origen por quince minutos y presupuesto global | No usar el estado válido de un token como oráculo; no consumirlo en GET ni en intentos con contraseña inválida |
| Sesión | Access 15 minutos; refresh rotatorio; inactividad máxima 24 horas; duración absoluta siete días | Expiración/revocación verificadas en servidor; refresh no extiende duración absoluta |
| Conservación | Limpiado de tokens expirados/consumidos tras su ventana de seguridad; eventos mínimos por treinta días como propuesta | Aprobar custodia/retención y ejecución de mantenimiento; no borrar conversaciones por esta política |

Estos números no son valores ya configurados ni medidas de rendimiento. Persistir contadores en PostgreSQL para no perder los límites al reiniciar ni multiplicarlos por worker. Claves derivadas mediante HMAC de UID/origen, con secreto fuera de Git y del corpus; retención corta, sin IP/correo/payload privados en logs. El origen solo se deriva de conexión o proxy explícitamente confiable, nunca de una cabecera libre del cliente. Fallo del limitador o almacén de sesión cierra la operación con 503 saneado, sin permitir acceso anónimo.

## 5. Sesiones, autorización y concurrencia

### 5.1 Sesión BanuChat

Propuesta: tokens opacos independientes de access y refresh, cada uno de 32 bytes aleatorios; verificadores SHA-256 en servidor, sin JWT ni secretos incrustados en Mobile. No incluir UID, correo o perfil dentro de un token legible. Cada sesión pertenece a un principal y un `deployment_id`; access solo en `Authorization: Bearer`, refresh solo en el endpoint específico. Ningún token se acepta como query o identidad del modelo. Referencia sobre verificadores aleatorios y revocación: [OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html).

En cada acceso: verificar digest, expiraciones, cuenta activa, sesión no revocada, `auth_version` y ámbito esperado. La versión sirve para invalidar accesos ya emitidos tras un cambio de contraseña, deshabilitación o cambio de permisos. No basta esperar al vencimiento de access. La sesión nueva no hereda un ID/token elegido por el cliente.

Refresh consume atómicamente el token anterior y emite una nueva pareja, manteniendo el registro consumido para detectar reutilización hasta expirar la familia. Un refresh ya consumido revoca su familia; no restaura sesión por fallback. Mobile serializa la renovación y no repite automáticamente un refresh cuyo resultado se perdió: solicita login para evitar carreras/replay. La rotación invalida el access previo de esa sesión en la propuesta inicial.

Logout revoca la sesión actual en servidor y elimina las credenciales locales; no solo cambia de pantalla. Una revocación por reset, deshabilitación o cambio de correo alcanza todas las sesiones. Offline, Mobile borra sus secretos y bloquea el acceso local, pero no afirma haber revocado el servidor; un token copiado conserva el riesgo hasta revocación/expiración. No guardar un token oculto para reintentar logout después de borrar sesión.

Las operaciones iniciadas antes de logout/reset pueden estar en vuelo. Antes de persistir un turno o borrar, volver a comprobar versión/sesión y propietario dentro de la transacción y con un orden de locks documentado. Si una revocación gana antes del commit, no se persiste ese turno. Una operación que ya se confirmó antes no se borra retroactivamente. Mobile descarta respuestas de la generación de sesión anterior, aunque llegue tarde una lectura o respuesta LLM.

### 5.2 Propiedad y permisos

- Propiedad de conversación mediante relación explícita `(conversation_id, principal_id)`; nunca inferida del perfil, UID visible o conocimiento del UUID. Crear la conversación y esa relación en la misma transacción. Mensajes y citas heredan la propiedad de la conversación, sin añadir columnas de identidad al corpus.
- Listados filtran por propietario antes de agregación, orden y límite. Detalle, borrado, contexto de mensajes y persistencia verifican la misma política en servicios de aplicación, además de la frontera HTTP. No cargar primero contenido ajeno para filtrarlo después.
- Progreso se obtiene del binding asignado al principal y de la release permitida. El servidor valida que ese perfil exista en la release vigente; si no, falla de forma explícita, sin escoger otro perfil. La nueva release no reasigna cuentas automáticamente.
- Permisos de corpus explícitos, limitados al dataset y modo del despliegue; un permiso `synthetic` no habilita CCD. Los documentos comunes autorizados pueden compartirse entre cuentas; las citas de otro chat no conceden propiedad de ese chat. Conservar la semántica de acceso a versiones históricas autorizadas, hashes y `full_document`.
- El router recibe solo el perfil sintético derivado del binding, o ausencia de perfil cuando corresponda. Un prompt que pida «usar otro perfil» no altera el principal ni sus permisos. No enviar UID, correo, password o tokens al generador.
- Recursos ajenos y ausentes reciben una respuesta indistinguible, sin alias, extractos, conteos o citas. En REST protegida propuesta: 404 para detalle, envío y borrado por UUID ajeno/ausente. Un DELETE propio devuelve 204; repetirlo devuelve 404 en esa nueva versión.

### 5.3 Historial anterior

No asignar automáticamente conversaciones existentes a cuentas nuevas por perfil, contexto CCD, orden de creación o conocimiento de su UUID. **Sin propietario explícito, quedan fuera del acceso funcional autenticado.** Conservarlas intactas para el entorno legado local bajo sus restricciones actuales. No hay borrado, backfill o adopción silenciosa.

Una importación excepcional de historial requeriría tarea y autorización propias, evidencia de titularidad y auditoría; esa evidencia no existe hoy para historiales compartidos. Vincular una cuenta a un perfil le permite nuevas consultas sintéticas y acceso a sus conversaciones nuevas, no leer todo el historial de ese perfil.

## 6. Migraciones propuestas: diseño, sin archivos SQL ni aplicación

No editar `001_initial_schema.sql` ni las migraciones CCD 002–005. Preparar posteriormente una migración adicional con nombre/numeración acordados; no reservar ahora un número que pueda colisionar. La primera variante se limita a la base sintética explícitamente autorizada y aborta en CCD/destino incorrecto.

| Tabla propuesta en `banuchat_auth` | Campos/relaciones esenciales | Invariantes y uso |
| --- | --- | --- |
| `accounts` | `id` UUID PK, UID canónico UNIQUE, correo de recuperación UNIQUE, estado, `auth_version`, timestamps | Solo identidades sintéticas; dominio de prueba permitido, no reactivar por una petición pública; no password en esta tabla |
| `password_credentials` | `principal_id` PK/FK, hash Argon2id con salt/coste/versionado, fecha de cambio | Cuenta pendiente sin credencial; hash nunca serializado a REST |
| `sessions` | ID PK, principal FK, ámbito, versión, digest access UNIQUE, expiración access, creación/última actividad/límite absoluto/revocación | Sin token plano; comprobación de estado por request, no solo en login |
| `refresh_tokens` | Digest UNIQUE, sesión FK, creación/expiración, consumo y reemplazo | Rotación y detección de reutilización; no aceptar token consumido; conservación acotada para detectar replay |
| `password_reset_tokens` | Digest UNIQUE, principal FK, propósito `initial_set`/`reset`, versión esperada, creación/expiración/consumo/invalidación | Estado/propósito controlados en servidor; consumo único y transaccional |
| `profile_bindings` | ID PK, principal FK UNIQUE, dataset FK, perfil estable; UNIQUE `(id, dataset_id, profile_key)` | Un perfil por principal. Varias cuentas pueden usar el mismo perfil ficticio de lectura sin compartir historial |
| `profile_binding_versions` | Binding, dataset, release y perfil; PK `(binding_id, dataset_release_id)` | FK compuesta hacia binding/dataset/perfil; FK `(dataset_id, dataset_release_id)` hacia releases y FK `(dataset_release_id, profile_key)` hacia perfiles. Extensión de binding a otra release explícita y validada |
| `corpus_grants` | Principal FK, dataset FK, ámbito/modo y permiso de lectura | Solo dataset sintético del despliegue inicial; ningún permiso CCD implícito. La selección de release sigue perteneciendo a los servicios actuales |
| `conversation_owners` | Conversation UUID PK/FK a `banuchat.conversations`, principal FK, creación | Un propietario; índice `(principal_id, conversation_id)`; cascada al borrar conversación propia, sin borrado de cuenta en cascada a historiales |
| `auth_rate_limits` | Clave derivada, acción, ventana, contador/expiración | Incremento atómico; budgets para claves existentes/inexistentes y origen; limpieza acotada |
| `security_events` | ID/timestamp, tipo de evento, resultado, ID interno permitido, correlación | Sin contraseñas, tokens, destinatarios, mensajes o SQL; acceso operativo restringido y retención aprobada |

La tabla padre de binding y sus versiones impiden que una cuenta cambie de perfil silenciosamente entre releases. Las claves referenciadas propuestas existen en el schema inicial: release tiene UNIQUE `(dataset_id, id)` y el perfil PK `(dataset_release_id, profile_key)`. No usar una FK de `profile_key` sola. Una modificación administrativa de asignación requiere revisión y revocación de sesiones/tokens; no otorga conversaciones ajenas ni altera el perfil histórico de las propias. Las asignaciones anteriores y su cambio se auditan, sin reescribir el corpus.

Para CCD, una futura variante de binding sería un permiso/contexto documental local, sin FK a perfiles sintéticos ni filas académicas inventadas; no se prepara/aplica en este incremento. No hay FK entre bases distintas ni sincronización de contraseñas propuesta.

Además del DDL: permisos mínimos por objeto, índice para lookup de digest y propietarios, restricciones de estado/fechas, migración sin backfill de historiales, verificación de destino y revisión de backup/custodia. El rollback no debe consistir en borrar cuentas o conversaciones; ante fallo, desactivar la nueva ruta protegida y preservar el estado para revisión.

El adaptador actual `PgSqlClient` usa `Pool.query`. Ejecutar `BEGIN` y varias consultas por ese método **no asegura una conexión común**. La implementación necesitará una unidad de trabajo con `pool.connect()` y commit/rollback/liberación garantizados; pasar el cliente transaccional a los servicios existentes cuando haga falta. Conservar los gates actuales de release/ordinal. La llamada lenta a Ollama ocurre fuera de la transacción; autorización/revocación se revalidan antes de confirmar. No duplicar el SQL de negocio en un controlador de autenticación ni sostener locks durante generación.

Bloqueo conocido independiente: [BCH-04/M01.2](../transition/bch04-m01-2-checkpoint.md) encontró privilegios efectivos PUBLIC incompatibles con el rol MCP restringido. Este diseño no corrige ese clúster, no reutiliza un superusuario para el runtime autenticado y no declara solucionado M01. La matriz de privilegios efectiva del futuro entorno auth debe aprobarse por separado antes de provisionar.

## 7. Delta REST propuesto, sin modificar el contrato congelado

**Recomendación para revisión: `/api/v2` protegida**, con documento y OpenAPI propios autorizados en el siguiente incremento. Exigir credenciales y añadir 401/403/429 modifica la semántica de v1 aunque un JSON de respuesta se conserve. No presentarlo como un cambio transparente del contrato congelado.

En el futuro despliegue autenticado solo se monta la versión protegida para recursos funcionales. v1 puede conservarse en el entorno legado local aislado; no debe quedar como ruta/puerto alternativo accesible para eludir autorización. No ejecutar una instancia legado anónima contra la misma base durante el piloto autenticado. El proxy no es la única defensa: el proceso autenticado no monta handlers v1 anónimos. No habilitar un flag de demo que omita comprobaciones en esa instancia.

### 7.1 Operaciones de identidad propuestas

Rutas relativas a `/api/v2`; son especificaciones de diseño, no endpoints creados. Objetos cerrados, límites de longitud/body, parámetros desconocidos rechazados y respuestas `Cache-Control: no-store`. Los tokens en respuestas de sesión son secretos solo para el cliente destinatario y quedan fuera de observabilidad.

| Método/ruta propuesta | Entrada | Éxito | Errores/condiciones |
| --- | --- | --- | --- |
| `POST /auth/login` | `{synthetic_uid, password}` | 200: `{access_token, refresh_token, token_type: "Bearer", expires_in, session_expires_at}` | 400 schema; 401 genérico para credencial/estado inválido; 429 límite; 503 dependencia. No acepta email como contraseña ni perfil/rol |
| `POST /auth/refresh` | `{refresh_token}` | 200 con nueva pareja y expiraciones; rotación atómica | 401 inválido, vencido, revocado o reutilizado; 400/429/503. No exige access vigente |
| `GET /auth/me` | Bearer access, sin body/query | 200: principal/UID sintético, perfil asignado y capacidades del modo; sin correo o datos de terceros | 401/503; no enumera cuentas ni retorna verificadores |
| `POST /auth/logout` | Bearer access, body vacío | 204 tras revocar la sesión actual | 401 si credencial no válida; cliente puede usar refresh válido para obtener access antes de logout, sin replay de peticiones de negocio; 503 no equivale a revocación |
| `POST /auth/password/reset-requests` | `{synthetic_uid}` | 202 genérico para todo UID sintácticamente válido, incluso ausente/deshabilitado/suprimido por cuota de envío | 400 estructura; 429 presupuesto público de origen; 503 fallo general del servicio. No revela errores de entrega específicos de una cuenta |
| `POST /auth/password/reset` | `{token, new_password}` | 204, sin tokens de sesión; establece inicialmente o cambia contraseña según propósito/estado persistidos | 400 genérico `INVALID_RESET` para token inválido/usado/vencido; política inválida descrita sin revelar cuenta; 429/503. No acepta UID/correo de destino |

No existe signup ni operación administrativa pública. `auth/me` no requiere mostrar el email; evita introducir un nuevo dato visible sin necesidad funcional. La pantalla de recuperación explica que se usa el buzón sintético asociado durante el aprovisionamiento.

### 7.2 Recursos protegidos propuestos

| Ruta v2 propuesta | Cambio necesario frente a v1 | Respuesta funcional reutilizada |
| --- | --- | --- |
| `POST /conversations` | Body `{}`; perfil derivado de binding del principal; creación con propietario atómica | 201 con identificador, perfil/alias y fecha actuales |
| `GET /conversations?limit=…` | Eliminar selector de perfil; solo propietario; conservar límite/orden | Resumen actual, sin campos de otras cuentas |
| `GET /conversations/{id}` | Propiedad previa; 404 ajeno/ausente | Detalle/mensajes/citas actuales |
| `POST /conversations/{id}/messages` | Body `content` actual; autorización previa y al commit; credenciales fuera del prompt | 201 y citas actuales; 409 conserva significado de release/concurrencia |
| `DELETE /conversations/{id}` | Solo propietario; 404 ajeno/ausente, incluido segundo borrado; 204 propio | Sin contenido y misma cascada limitada al historial |
| `GET /me/progress` | Eliminar clave de perfil elegida por cliente; resolver binding | Estructura de progreso sintético actual |
| `GET /calendar/events`, `GET /announcements` | Sesión y permiso de corpus | Campos, filtros, defaults, temporalidad y procedencia actuales |
| `GET /documents/{version}/artifact` | Sesión y autorización de corpus/release antes de leer artefacto | Bytes verificados, límites/hashes y semántica `full_document` actuales |

`GET /profiles` no se publica como selector en v2; `auth/me` proporciona el perfil asignado. No crear `/courses` REST para este trabajo. Todos los recursos v2 exigen Bearer; 401 para ausencia/vencimiento/revocación, 403 para falta de capacidad general sin revelar recursos concretos, 404 uniforme para objetos ajenos/ausentes, 429 para abuso y 503 para dependencias. Agregar estos códigos al futuro envelope/OpenAPI sin exponer SQL, stacks o secretos. La forma exacta de `me`, errores, límites y security schemes debe congelarse después de revisión; esta tabla no autoriza editar v1.

## 8. Correo reutilizable y componentes definitivos

| Componente | Naturaleza | Responsabilidad y límite |
| --- | --- | --- |
| Cuentas sintéticas, binding y autorización | Definitivos del producto de demostración | Permanecen sintéticos; no son un fixture temporal que luego recibirá expedientes reales |
| Casos de uso login, establecimiento/reset, revocación y ownership | Definitivos | Política y transacciones independientes del transporte de correo y de Mobile |
| Puertos `PasswordHasher`, repositorios, reloj y generador seguro | Definitivos | Implementación criptográfica real en runtime; dobles deterministas exclusivos de pruebas, prohibidos en composición funcional |
| `PasswordRecoveryNotifier` | Definitivo | Construye mensajes de establecimiento/reset/aviso con plantillas controladas; ninguna contraseña en el mensaje |
| `MailDelivery` | Interfaz definitiva | Recibe destinatario validado y mensaje tipado, entrega con timeout y resultado técnico interno; el resultado no revela cuentas al HTTP |
| Adaptador de buzón local | Específico del entorno de pruebas | Entrega realmente al buzón local controlado; destino loopback sin relay externo; allowlist exacta de dominio/buzones sintéticos, acceso restringido |
| Outbox en memoria/transport fake | Doble de pruebas unitarias | Permite afirmar contenido/número de envíos; no acredita recepción real ni reemplaza el buzón de la demostración funcional |
| Proveedor SMTP/API autorizado futuro | Adaptador posterior, no implementado | Reutiliza la lógica y las plantillas; exige autorización de proveedor, secretos, remitente, destinatarios y entorno. No habilita correos reales automáticamente |
| Sesión backend, política de secretos y principal interno | Definitivos | Protegen recursos independientemente del transporte o del usuario del dispositivo |
| Almacenamiento seguro nativo / transporte web | Adaptadores por plataforma | Respetan expiración/revocación y política común sin compartir secretos mediante almacenamiento inseguro |

El dominio `.test` está reservado para pruebas privadas según [RFC 6761 §6.2](https://www.rfc-editor.org/rfc/rfc6761.html#section-6.2). Eso **no crea un buzón ni garantiza entrega**: el adaptador debe dirigirlo explícitamente al servicio local, sin DNS/MX o relay hacia Internet. No redirigir un email sintético a una dirección personal o institucional. La lista de destinos de pruebas es configuración del servidor, nunca proporcionada por Mobile.

La lectura del buzón confiere capacidad de reset. Restringir su UI/API al operador autorizado, no compartir acceso de todos los participantes a todos los mensajes. Durante ensayos, el moderador controla la entrega al participante de su cuenta asignada; un futuro buzón individual requiere ACL demostradas. Proteger/purgar mensajes con tokens y excluirlos de logs, Git y artefactos de resultados. Aunque PostgreSQL almacene solo digests, el email contiene el secreto de recuperación: su custodia forma parte de la seguridad, no una excepción para publicarlo. No se selecciona/instala ahora un nuevo servicio de correo, ni se paga/configura un proveedor externo.

## 9. Cambios Mobile necesarios, todavía sin aplicar

| Área actual | Cambio propuesto | Aceptación pendiente |
| --- | --- | --- |
| `src/app/index.tsx`, `profiles.tsx`, `_layout.tsx` | Tras onboarding: login con «UID de demostración» y «Contraseña BanuChat»; enlace de recuperación, sin registro; reemplazar selector libre por perfil asignado | No induce a escribir contraseña UNAB; navegación protegida también ante enlace profundo/reapertura |
| Nuevas pantallas de recuperación | Solicitud genérica por UID y confirmación con token + nueva contraseña; ayuda sobre buzón local | No revela existencia/correo, no almacena inputs, no inicia sesión automáticamente |
| `src/session/session-context.tsx` | Máquina de estados sin sesión/restaurando/autenticada/expirada; principal y generación de sesión; logout backend | Restauración comprueba sesión; cerrar/cambiar cuenta cancela o invalida operaciones pendientes |
| `src/api/` y `src/config/api.ts` | Cliente común con Bearer, renovación serializada, errores 401/403/429; versión/base protegida fijada | No mandar tokens al host equivocado; no seguir redirecciones de credenciales a otro origen; no reenviar POST de mensajes tras fallo de red o refresh incierto |
| Persistencia de credenciales | Access en memoria; refresh en almacenamiento seguro del sistema mediante adaptador, por ejemplo SecureStore compatible con Expo 57, sujeto a autorización/verificación | Nada en AsyncStorage, localStorage, archivos planos, constantes `EXPO_PUBLIC_*`, logs o analítica. Password y token de reset no se persisten |
| Chat/historial/progreso/documentos | Consumir rutas v2 y perfil derivado; limpieza de datos/caches/UUID al logout o cambio de cuenta | Respuesta tardía de A no aparece al abrir B; no adoptar UUID ni citas de la sesión anterior |
| Calendario/anuncios y modo CCD | Mantener semántica del corpus y guardias de modo | Login no habilita oferta/progreso CCD; conservar restricciones locales de ese entorno |

Se conservan Expo SDK 57 y React Native actuales. Verificar almacenamiento seguro en Android/iOS con builds/dispositivos autorizados; no generar proyectos nativos aquí. Tratar fallos de almacenamiento restaurado como cierre de sesión, no como selección libre de perfil. Secure storage mejora custodia en dispositivo; no autentica al backend por sí solo.

Para web, proponer inicialmente sesión solo en memoria y login tras recarga; no persistir refresh en Web Storage para simular SecureStore. Una sesión web persistente con cookies HttpOnly/Secure/SameSite necesitaría contrato/transporte y defensa CSRF propios antes de implementarse. No atribuir cobertura web/nativa sin pruebas de cada plataforma.

TLS es obligatorio para enviar contraseñas/tokens fuera de un canal local de desarrollo explícitamente aislado. El HTTP local actual solo sirve como antecedente técnico; no cumple por sí solo el transporte del despliegue autenticado. El primer incremento de lógica puede ensayarse con dobles sin red; el ensayo funcional necesita un canal local seguro aprobado. No introducir excepciones HTTP generales ni abrir CCD/LAN para probar login. Certificados, trust del dispositivo, reverse proxy y red deben confirmarse antes de evaluar con participantes.

## 10. Integración universitaria: alternativa independiente condicionada

No se ha consultado ni consumido un portal/API de UNAB o CCD. No hay evidencia aquí de un IdP, issuer, endpoint o client registration institucional disponibles. No asumir Microsoft, Google, LDAP ni una URL de login basándose en el dominio de correo.

Si se solicita explícitamente federación después: TI debe confirmar servicio oficial y permiso de uso, protocolo, responsables, entorno de pruebas, registro del cliente, redirects, scopes mínimos, identificador estable y validación de issuer/audience/firma/expiración, política de sesión/logout y tratamiento de datos. El vínculo sería por `(issuer, subject)` verificado, nunca por UID escrito o correo coincidente. No crear ahora tablas de identidades federadas ni vincular automáticamente una identidad real a un perfil académico sintético.

Para un OIDC autorizado en Mobile, proponer Authorization Code + PKCE mediante navegador externo y cliente público sin secreto incrustado; véase [RFC 8252](https://www.rfc-editor.org/rfc/rfc8252). OAuth2 sin una capa de identidad confirmada no basta para afirmar quién inició sesión; SAML requeriría un servicio backend y metadata oficiales, no validación ad hoc de XML en Mobile. No elegir ni implementar ninguno sin información oficial.

La recuperación de credenciales institucionales correspondería al proveedor oficial y a su canal de soporte; BanuChat no captura ni cambia esa contraseña. La propia recuperación sintética permanece como función distinta. La falta de IdP autorizado bloquea únicamente esa alternativa institucional; **no bloquea el diseño ni el futuro desarrollo autorizado de login propio con cuentas sintéticas**.

## 11. Banco y criterios de aceptación pendientes

Todos los casos de esta sección están **por implementar/ejecutar**. No representan PASS, cobertura actual ni pruebas realizadas en X01-AUTH.1. Usar exclusivamente identidades inventadas y aisladas de v1/CCD; el UID y correo privados no participan en pruebas negativas, fixtures o escaneos.

| ID | Criterio verificable | Instrumento / entorno futuro |
| --- | --- | --- |
| AUTH-01 | No hay registro público; aprovisionamiento rechaza cuenta duplicada, destinatario real/no permitido y perfil no autorizado; pendiente no inicia sesión | Unitarias del caso administrativo y contrato, sin crear usuarios reales |
| AUTH-02 | Login válido por UID/contraseña propia; incorrecta, ausente, pendiente y deshabilitada producen el mismo 401, sin secretos; política común de contraseña | Unitarias/contrato con cuentas inventadas; medir rutas temporales sin afirmar tiempo constante de la red |
| AUTH-03 | Sin sesión, access vencido/revocado, token alterado o de otro ámbito no permiten ninguna ruta funcional | Matriz HTTP por cada operación protegida, incluidas descarga y progreso |
| AUTH-04 | A crea/lista/lee/escribe/borra solo sus chats; B no accede con UUID o perfil de A, incluso si ambas cuentas usan el mismo perfil ficticio; ajeno/ausente indistinguibles; sin propietario no aparece | Contrato + servicios; después PostgreSQL de pruebas aislado y autorizado |
| AUTH-05 | Perfil enviado como campo extra, principal falso, cambio de query/ruta o instrucción en prompt no cambia autorización; progreso corresponde al binding | Schemas cerrados + pruebas de aplicación, sin credenciales en LLM |
| AUTH-06 | Logout, deshabilitación y reset revocan según política; access anterior falla inmediatamente en servidor; refresh rota y replay revoca familia; login concurrente no crea sesión con una credencial reemplazada | Tests con reloj controlado y concurrencia; verificación de transacciones reales posterior |
| AUTH-07 | Solicitud de reset da idéntico 202/cuerpo para cuenta conocida, ausente, deshabilitada y cuota de envío agotada; origen abusivo recibe 429 uniforme | Banco de enumeración funcional, cuotas persistentes, reinicio y varias instancias; comparación de tiempos como evidencia, no garantía absoluta |
| AUTH-08 | Token aleatorio solo se entrega por canal local permitido; DB contiene digest; vencido, usado, propósito incompatible y alterado fallan sin revelar cuenta | Unitarias criptográficas/contrato + inspección autorizada del almacén aislado; comprobar que logs y respuestas no contienen el secreto |
| AUTH-09 | Dos consumos concurrentes dejan un único éxito; cambio de password/versión, consumo e invalidación total son atómicos; un rollback no deja estado parcial | Integración PostgreSQL aislada con sincronización de carreras, no solo dobles de SQL |
| AUTH-10 | Buzón local recibe instrucciones para dirección inventada; no hay relay externo ni destinatarios libres; aviso de cambio no contiene contraseña; fallo de correo no filtra cuenta | Prueba de adaptador con buzón real local controlado. Outbox fake acredita solo unidad, no entrega |
| AUTH-11 | Cambio A→B, logout offline, expiración y respuesta tardía no muestran historial/citas/secretos anteriores; reabrir respeta política de sesión | Tests Mobile de estado y pruebas manuales Android/iOS autorizadas; web separada |
| AUTH-12 | Recursos corpus conservan release vigente, procedencia, hashes, límites y `full_document`; no hay mezcla demo/CCD ni fallback entre bases | Regresiones seleccionadas de servicios/RAG y pruebas de modo, solo en entorno autorizado y sin reingesta |
| AUTH-13 | v1/MCP congelados no cambian accidentalmente; despliegue protegido no ofrece un bypass v1; errores saneados y cachés sin información de otra cuenta | Comparación de contratos, inventario de rutas/proxy y logs redactados; MCP no se declara agente |
| AUTH-14 | Locks/revocación durante generación impiden commits posteriores a la revocación ganadora; concurrencia/release siguen dando 409 propio | Integración de carreras con generador controlado; no reenviar mensajes automáticamente |
| AUTH-15 | Corpus/manifiestos/releases/embeddings permanecen intactos; auth escribe solo nuevas tablas y el historial propio autorizado | Diff y comprobaciones de integridad antes/después con permiso explícito; ninguna escritura de denegación en corpus |
| AUTH-16 | Transporte seguro y secreto Mobile verificados; limitación resiste ráfagas sin agotar hash/memoria; roles efectivos mínimos | Revisión de despliegue local autorizado, medición de coste y pruebas de permisos en instancia aislada; sin infraestructura universitaria en este incremento |

No repetir automáticamente suites costosas. En cada implementación autorizada seleccionar typecheck/unitarias/contrato pertinentes; tests DB, correo, dispositivos y rendimiento solo donde sean necesarios y con el entorno expresamente permitido. Un doble de IdP, correo o SQL no valida una conexión oficial, una recepción real o un rollback PostgreSQL.

## 12. Plan incremental, dependencias y esfuerzo

Estimaciones de trabajo pendiente, no fechas ni disponibilidad confirmadas. Una jornada-persona (JP) equivale a seis horas productivas, como en el plan integral. Incluyen implementación acotada, revisión, documentación y pruebas de cada paquete; excluyen esperas TI, incorporación de personal, federación y adaptación multiusuario CCD. No son horas consumidas en esta revisión.

| Paquete futuro | Archivos/componentes candidatos | Dependencias / entregable y aceptación | Roles | JP |
| --- | --- | --- | --- | --- |
| AUTH-P0 — aprobar deltas | Esta propuesta; futuros contrato/OpenAPI v2 y diseño SQL adicional | Sala decide versión, ámbitos, parámetros, custodia, canal seguro y matriz de permisos. Ningún contrato/migración se aplica antes de autorización específica | Arquitectura, backend, Sala | 1–2 |
| AUTH-P1 — persistencia y casos de uso | Futuro `backend/api/src/auth/`, unidad transaccional en `src/data/`, migración adicional y pruebas aisladas | P0; cuentas/pending, binding, hash, sesiones, tokens y revocación reales. AUTH-01/02/06/08/09; se valida atómicamente sin tocar dataset | Backend + revisión SQL/seguridad | 4–6 |
| AUTH-P2 — recursos protegidos | `src/http/`, servicios de conversaciones/mensajes/progreso/artefactos, composición en `main.ts` | P1 y REST autorizada; ownership transaccional y aislamiento, sin ruta v1 de bypass. AUTH-03/04/05/13/14; reutilización RAG/citas | Backend + QA | 3–5 |
| AUTH-P3 — recuperación y entrega | Casos de uso auth, puertos/adaptador correo local, herramienta administrativa local, rate limits | P1; buzón/custodia confirmados. Recuperación completa y aprovisionamiento sin signup; AUTH-07/08/09/10 | Backend + operaciones + QA | 3–5 |
| AUTH-P4 — Mobile funcional | SessionProvider, cliente API, pantallas/navegación, adaptador secure storage | Contrato aprobado; puede empezar con dobles tras P0, integra P2/P3. AUTH-11, rutas de login/reset/logout y plataforma verificada | Mobile + QA | 3–5 |
| AUTH-P5 — integración y evidencia | Banco auth, documentación operativa y seguridad de despliegue | P2–P4, TLS/dispositivos/roles; AUTH-12/15/16 y regresiones pertinentes. Reportar límites, sin certificar seguridad institucional | QA + backend/Mobile + operaciones | 2–3 |

**Total estimado: 16–26 JP (96–156 horas productivas).** Con un único desarrollador a cinco JP/semana son 3,2–5,2 semanas de esfuerzo, antes de esperas/revisión. Con backend y Mobile disponibles en paralelo, QA/operaciones parciales y dependencias resueltas al inicio, una ventana de planificación de 3–5 semanas es una hipótesis razonable que debe nivelarse; no es un compromiso. La disponibilidad real y las semanas restantes no están confirmadas.

Ruta crítica propuesta: aprobación de deltas/entorno → persistencia y transacciones → protección de recursos + recuperación → integración Mobile → evidencia de aislamiento/transporte → piloto autorizado. P2 y P3 pueden avanzar en paralelo con personal distinto sobre interfaces estables; P4 puede preparar UI/cliente con dobles tras aprobar contrato, sin fingir integración. Preparación de TLS, buzón y permisos puede hacerse por operaciones en paralelo, sin ejecutar cambios no autorizados.

### 12.1 Impacto OE5/OE6 y cronograma

El plan integral estimó X01 completo en 4–7 JP, dentro de 125–202 JP y 18 semanas relativas más reserva. Los requisitos ahora detallados de contraseña propia, recuperación, correo y sesiones hacen insuficiente reutilizar ese rango sin reestimar. Como **escenario contable provisional**, sustituir 4–7 por 16–26 produce 137–221 JP para el plan: incremento de 12–19 JP respecto a sus extremos. No es un total rebaselined: X01 también incluye entorno del piloto y puede conservar trabajo adicional; el diseño actual no reemplaza el análisis de todas sus subtareas ni elimina posibles solapamientos Mobile/QA. Sala debe reconciliar ese WBS antes de fijar presupuesto.

OE5 mantiene sus módulos y validación de experiencia. Login y recuperación añaden preparación y pruebas; no sustituyen historial académico, calendario, notificaciones o pruebas Android/iOS. OE6 mantiene despliegue universitario, integración, rendimiento y usabilidad comprometidos. Autenticación y protección del historial son prerrequisitos del piloto compartido, sin convertir el ensayo local en despliegue universitario. La medición de latencia natural del sistema autenticado debe incluir la comprobación de sesión/autorización en el recorrido Mobile→respuesta; el coste de login/reset se mide aparte y no se declara cumplido el umbral original de consulta por una prueba sin autenticación.

Los participantes reales del estudio pueden evaluar tareas con cuentas permanentemente sintéticas asignadas, sin usar sus UID, correos, contraseñas ni expedientes institucionales. Consentimiento, contacto y resultados del estudio pertenecen a una custodia académica independiente; no ingresan al dataset ni se convierten en identidades de la aplicación. Conservar los instrumentos/umbrales originales de SUS, muestra y tareas del plan; no contar una prueba técnica de login como usabilidad acreditada.

No asumir disponibles las 16 semanas originales. Si la ventana restante no cubre la ruta crítica y tareas OE1–OE6 pendientes, solicitar más capacidad backend/Mobile/QA, acceso temprano al entorno y reprogramación por hitos. No eliminar objetivos ni prometer una compresión sin recursos confirmados. T11 conserva su resultado semántico no satisfactorio y su mejora en R02; los controles U03/U04 y su falta de ratificación no se alteran por autenticar una cuenta.

## 13. Riesgos, decisiones externas y primer incremento recomendado

| Riesgo/bloqueo | Efecto | Resolución antes del incremento dependiente |
| --- | --- | --- |
| Contratos/SQL congelados | No se puede introducir autenticación real editando v1 o aplicando DDL por conveniencia | Autorizar específicamente REST v2, migración adicional y semántica de ownership; conservar v1 como legado aislado |
| Permisos PostgreSQL no mínimos | Runtime con derechos de corpus/administración invalida el aislamiento operativo | Aprobar destino y roles efectivos, contemplando PUBLIC; no arreglar el clúster compartido ni usar superusuario como workaround |
| Buzón/custodia no definidos | Quien lea todos los resets podría tomar cualquier cuenta; entrega no demostrada | Operador, destinos, permisos y limpieza confirmados; no reenviar a correos reales |
| TLS/dispositivos/certificados pendientes | No hay ensayo funcional seguro de credenciales ni evidencia de plataforma | Plan local aprobado y prueba de confianza de dispositivo; no abrir LAN/CCD para resolverlo |
| Historial previo sin propietarios | Riesgo de entregar conversaciones compartidas a nuevas cuentas | Exclusión por defecto, sin backfill/auto-claim; preservar datos |
| Concurrencia de reset, refresh y mensajes | Sesión revocada podría persistir un turno o token reutilizado ganar dos veces | Unidad de trabajo real, locks/versionado y carreras de integración |
| Cuenta sintética usada por varias personas | Login no distingue a quienes comparten el mismo secreto | Una cuenta por participante simultáneo; custodia y rotación controladas, sin convertirlos en identidades institucionales |
| Coste de Argon2id y cuotas en red compartida | Saturación o bloqueo de participantes legítimos | Calibración y budgets acotados en el entorno objetivo; no declarar latencias sin medición |
| Integración IdP/proveedor externo no aprobada | No puede acreditarse federación o correo externo | Mantenerla fuera del incremento sintético; decisión formal posterior con TI/proveedor |
| Plazo/capacidad desconocidos | 16–26 JP no caben por afirmación en el rango X01 anterior | Reestimar WBS y calendarizar con capacidad/fechas reales antes de comprometer el piloto |

Primer incremento técnico recomendado para **autorización posterior**: AUTH-P0 y una porción cerrada de AUTH-P1, centrada en cuentas sintéticas, credenciales y repositorio transaccional, con pruebas unitarias/contrato y PostgreSQL de pruebas aislado solo si se autoriza expresamente. Presentar antes el delta SQL y REST exactos; no montar login parcialmente protegido ni exponer recursos mientras falte ownership. Recuperación funcional completa, Mobile y apertura al piloto son hitos posteriores verificables, no autorizaciones implícitas.

No ejecutar ese incremento desde X01-AUTH.1. Sala debe resolver el delta revisable y asignar el siguiente alcance. M01 conserva sus limitaciones acreditadas; M02/A01 no empiezan automáticamente.

## 14. CHECKPOINT BANUCHAT — BCH-04 / X01-AUTH.1

**Resultado:** análisis y diseño actualizados para cuentas permanentemente sintéticas con UID/contraseña propios, recuperación por correo controlado, sesiones revocables y autorización explícita de recursos. Integración institucional separada y condicionada, sin atribuirle disponibilidad ni aprobación.

- Archivo añadido: `docs/architecture/autenticacion-identidad-banuchat.md`. No existía un documento dedicado X01-AUTH.1 en la documentación revisada; no se reescriben antecedentes o contratos para simular una aprobación nueva.
- Revisión efectuada: solicitud inicial y actualización de Sala; AGENTS; contrato/servidor REST y servicios afectados; persistencia y migración CCD de contexto; sesión, clientes, navegación, configuración y dependencias Mobile; límites ADR y plan integral; bloqueo M01.2; referencias técnicas oficiales enlazadas.
- Verificación de esta entrega: inspección estática, revisión de enlaces locales, whitespace y alcance de archivos; `git diff --check`. No se ejecutan pruebas funcionales, DB, correo, RAG, Mobile, Ollama o infraestructura y no se declara PASS para los criterios AUTH pendientes.
- Sin cambios a backend, Mobile, contratos REST/MCP, SQL, permisos, servicios, secretos, corpus, releases, manifiestos o embeddings. Sin incorporación de identidades reales, envío de correo, llamadas institucionales, ingestas, commit o push.
- Pendientes para revisión: aprobación específica de contratos/migración y parámetros; entorno/roles; custodia de buzón/canal seguro; disponibilidad de roles/plazo; autorización del siguiente incremento acotado.

**Detención para revisión de Sala de Control. No se inicia implementación ni otro incremento.**
