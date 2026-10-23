# Contrato REST v2 — BanuChat sintético

Versión **2.0.0**, candidato de implementación final AUTH-P0. Base relativa `/api/v2`. Fuente de schemas, parámetros y respuestas: [openapi-v2.yaml](openapi-v2.yaml), OpenAPI 3.1.0 serializado como JSON y JSON Schema 2020-12. Este documento fija las reglas semánticas que un schema no puede expresar. No hay endpoints v2 activos en AUTH-P0.

Derivado del [diseño aceptado X01-AUTH.1](../../docs/architecture/autenticacion-identidad-banuchat.md), commit `705fb555b6ee050df4c5d07b68724251963a83f9`. Se conserva REST v1/MCP sin modificaciones. Cambios de este contrato requieren revisión explícita; AUTH-P1 no queda autorizado por publicarlo.

## 1. Autoridad, transporte y validación común

- Autenticación propia BanuChat: **UID, contraseña, cuentas y perfiles permanentemente sintéticos**. No verifica identidad, contraseña, matrícula o expediente UNAB. No hay signup, federación, administración pública ni selección libre de perfil. No usar valores privados del equipo.
- Único formato UID: `BCH-DEMO-` y cuatro dígitos ASCII, 13 caracteres. Se recibe canónico; minúsculas, espacios, Unicode parecido y longitud distinta son 400. Es una convención BanuChat, no una regla institucional.
- JSON UTF-8 `application/json` con charset UTF-8 opcional; no aceptar compresión del cuerpo. Cada POST con JSON exige ese media type. Malformed JSON, miembros repetidos, propiedades desconocidas, null donde no se permite, content-type/encoding inválidos y parámetros inválidos: 400 `INVALID_ARGUMENT`. No coercionar tipos, recortar cadenas o completar objetos a partir del cliente.
- Máximo de body **16384 bytes** recibidos, incluidos whitespace y escapes; request-target **8192 bytes**; cabeceras totales **16384 bytes**. Exceso: 413 `PAYLOAD_TOO_LARGE`, JSON saneado antes de iniciar respuesta. Estos límites de transporte también rigen cuerpos prohibidos; debajo del límite, un body no vacío en GET/DELETE/logout es 400. El futuro servidor debe configurar el parser HTTP para responder según estas reglas, sin filtrar errores nativos.
- Todos los objetos JSON se cierran con `additionalProperties: false`. Longitudes de texto en puntos de código Unicode bien formados, no bytes ni unidades UTF-16. Los límites de body se comprueban por separado. Fechas/UUID válidos, fechas civiles reales y timestamps RFC 3339 con zona explícita. UUID recibidos pueden tener letras mayúsculas; el servidor los canonicaliza a minúsculas al consultar/devolver.
- Query desconocida, escalar repetido, vacío no admitido o filtro array duplicado/comma-separated: 400. Sin query en login, refresh, me, logout, recuperación, creación, detalle, envío y borrado. Los filtros repetidos permitidos se especifican abajo. El servidor no acepta selectores de release, modelo, tool, identidad o ruta de archivo.
- Toda respuesta, incluidos 204 y errores: `Cache-Control: no-store` y `Vary: Authorization`. JSON usa `application/json; charset=utf-8`; 204 sin body ni media type de contenido. Nada de contraseñas/tokens en logs, URLs, citas, métricas, analítica o errores. No redirigir solicitudes con secretos a otro origen. TLS obligatorio fuera de un canal local aislado expresamente autorizado; HTTP local existente no acredita ese requisito.
- El proceso protegido publica solamente las operaciones v2 declaradas. Ruta desconocida: 404; método no declarado sobre ruta conocida: 405 y `Allow` con los métodos declarados en orden GET, POST, DELETE cuando correspondan, separados por coma y espacio. No montar rutas v1 anónimas, alias a v1, endpoints administrativos ni un flag que omita autenticación. Tampoco ejecutar una instancia v1 contra esa misma base durante el piloto.

Orden de fallo: límites/parser HTTP → resolución de ruta/método → autenticación en operaciones protegidas → validación específica → capacidad/corpus → propietario si corresponde → operación. Validación de perfil/UUID no debe preceder a autenticación de un recurso protegido, salvo los límites/parser comunes. Un token ausente/vencido/revocado no se transforma en acceso por perfil.

## 2. Sesiones y secretos

Access, refresh y token manual de recuperación se generan **independientemente**, con 32 bytes CSPRNG cada uno. Representación externa: base64url sin padding, exactamente 43 caracteres, regex `^[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$`. La restricción del último carácter exige codificación canónica. No se usan UID, fechas, UUID o texto elegido por el cliente como secreto.

Persistir solo SHA-256 de los **32 bytes decodificados**, como hexadecimal minúsculo de 64 caracteres; misma representación en emisión/lookup. Rechazar forma no canónica antes de decodificar. No aplicar Argon2 a estos secretos aleatorios ni guardar el token completo al lado del digest. `session_id` y `principal_id` no son secretos y no autentican.

Access se recibe únicamente en una cabecera `Authorization: Bearer <token>`, sin cabeceras Authorization repetidas. Scheme HTTP case-insensitive; un espacio ASCII entre scheme y token y sin texto adicional. Cookies, query, body o `profile_key` no sustituyen esa cabecera. Las cuatro operaciones públicas login/refresh/solicitud/confirmación no usan Authorization para derivar identidad; su presencia no concede derechos ni cambia su respuesta genérica. No se acepta un access como refresh ni un token de recuperación como sesión.

Cada request protegido verifica digest, cuenta `active`, ámbito `deployment_id` de configuración confiable, sesión sin revocar, `auth_version` vigente y todos los vencimientos. Instante de referencia: reloj de PostgreSQL en UTC, capturado una vez por fase transaccional. Expiración exclusiva: `now >= expires_at` ya no es válido. No cachear una sesión válida de forma que sobreviva a su revocación.

Access dura como máximo **900 segundos**. La sesión vence a las **604800 segundos** desde creación y tras **86400 segundos** sin actividad autenticada aceptada; refresh aceptado cuenta como actividad. Cada request aceptado actualiza `last_seen_at` sin extender el límite absoluto. La comprobación de inactividad se hace antes de actualizarlo. La rotación reemplaza el digest access, invalida el access anterior y consume un refresh para emitir otro. El refresh vence en el límite absoluto de su familia/sesión, sin extenderlo. `expires_in` es el entero inferior de segundos de vida del access recién emitido, de 1 a 900, acotado al límite absoluto; no emitir una pareja si queda menos de un segundo utilizable.

Mantener el digest de refresh consumido hasta vencer la familia para detectar replay. Reutilizarlo revoca esa familia y devuelve el mismo 401; un token desconocido no revoca sesiones elegidas por el cliente. No hay gracia/replay de refresh ni reintento automático ante resultado incierto. Mobile serializa refresh y pide login si perdió la respuesta. Login válido crea una sesión nueva, sin reutilizar tokens del cliente. Revalidar bajo lock la credencial/versión verificada si hubo un reset concurrente.

## 3. Operaciones de identidad

Todos los campos indicados en los objetos siguientes son obligatorios; no se aceptan otros. No hay token de ejemplo operativo en este documento.

| Método y ruta | Entrada | Éxito | Errores específicos además de 400/405/413/429/500/503 |
| --- | --- | --- | --- |
| `POST /auth/login` | `{synthetic_uid, password}`; password 1–128 puntos de código como sintaxis de login | 200 `token_response` | 401 idéntico para UID ausente, contraseña incorrecta, pendiente o deshabilitada |
| `POST /auth/refresh` | `{refresh_token}` | 200 `token_response` con pareja nueva | 401 idéntico para token ausente del almacén, vencido, consumido, familia revocada, cuenta/versión/ámbito inválidos |
| `GET /auth/me` | Bearer; body/query vacíos | 200 `current_session` | 401; 403 sin permiso/binding aprobado; 404 sin release publicada disponible |
| `POST /auth/logout` | Bearer; body/query vacíos | 204 tras revocar sesión actual | 401 si no válida. Si access venció y refresh sigue válido, renovar explícitamente antes del logout; no aceptar session_id como sustituto |
| `POST /auth/password/reset-requests` | `{synthetic_uid}` | 202 `reset_accepted` para todo UID sintácticamente válido | Ningún 404/401 por existencia o estado; ver fallos de entrega/cuotas más abajo |
| `POST /auth/password/reset` | `{token, new_password}` | 204 tras establecer/cambiar contraseña y revocar sesiones; no crea sesión | 400 `INVALID_RESET` genérico para token no utilizable; 400 `INVALID_ARGUMENT` para schema/política inválida, validados **antes** de consultar la validez del token |

`token_response`: `{access_token, refresh_token, token_type, expires_in, session_expires_at}`; `token_type` es exactamente `Bearer`, expiración absoluta RFC 3339. Los dos secretos solo se entregan en el éxito login/refresh al cliente destinatario.

`current_session`: `{principal_id, synthetic_uid, session_id, session_expires_at, release_id, profile, capabilities}`. `profile` conserva `{profile_key, alias}` del perfil asignado en la release vigente aprobada. `capabilities` contiene exactamente, en ese orden, `chat`, `history`, `progress`, `calendar`, `announcements`, `documents`; se devuelve únicamente con binding y permiso de lectura válidos, sin roles administrativos o permisos académicos. Ni correo, hash, auth_version ni información de terceros se exponen.

`reset_accepted`: objeto con único campo `message`, cuyo valor es exactamente «Si la cuenta puede recuperar el acceso, recibirás instrucciones en su buzón asociado.». No retorna token, email parcial, request-id de cuenta, existencia, envío realizado ni motivo de supresión. El request_id de un error es solo correlación aleatoria.

Logout confirmado revoca la sesión antes del 204. Ante pérdida de red, Mobile borra secretos/caches y bloquea acceso local; no afirma revocación remota. El token copiado podría seguir válido hasta revocación/expiración. No persistir una credencial para reintentar logout ocultamente.

## 4. Recursos protegidos y respuestas

Los payloads funcionales y defaults existentes se conservan como schemas **locales a v2**, sin `$ref` hacia v1. La excepción necesaria es `citation.artifact_url`: ruta derivada `/api/v2/documents/{document_version_id}/artifact`; nunca enlaza al v1 anónimo. El UUID del enlace coincide con el de la cita. No cambiar el renderizador v1 para implementar esta proyección futura.

| Método y ruta v2 | Entrada y autorización | Éxito |
| --- | --- | --- |
| `POST /conversations` | Bearer; body JSON **`{}`**. Principal→binding aprobado para la release vigente; no aceptar UID, perfil, release o propietario | 201 `created_conversation` + Location exacta `/api/v2/conversations/{uuid}` |
| `GET /conversations` | Bearer; solo `limit` opcional. Filtrar propietario antes de agregación/orden/límite, entre sus releases históricas | 200 `conversations_response`; orden `started_at DESC, conversation_id DESC` |
| `GET /conversations/{conversation_id}` | Bearer; UUID y propiedad; sin query/body | 200 `conversation_detail`; mensajes visibles por ordinal y citas por índice, sin truncamiento silencioso |
| `POST /conversations/{conversation_id}/messages` | Bearer; `{content}` de 1–4000 puntos de código, al menos un carácter no whitespace; propiedad y perfil histórico autorizado para responder en current | 201 `send_message_response` después del commit del turno completo |
| `DELETE /conversations/{conversation_id}` | Bearer; propiedad; sin query/body | 204 para conversación propia borrada; **404 para ajena/ausente**, incluido segundo borrado |
| `GET /me/progress` | Bearer; perfil derivado del binding en current; filtros `statuses` y `limit` | 200 `progress_response`; orden `course_key ASC` |
| `GET /calendar/events` | Bearer y corpus; `date_from`, `date_to` obligatorios; `event_types`, `limit` opcionales | 200 `calendar_response`; orden `starts_at, event_key ASC` |
| `GET /announcements` | Bearer y corpus; `query`, `temporal_status`, `reference_time`, `limit` opcionales | 200 `announcements_response`; orden `valid_from, announcement_key ASC` |
| `GET /documents/{document_version_id}/artifact` | Bearer y permiso de dataset/release; UUID; sin query/body ni path del cliente | 200 binario completo verificado; versión ready en release ready, también histórica autorizada |

Todas requieren 401/403, además de 400/405/413/429/500/503; 404 para objeto/publicación no disponible y ajeno/ausente, según OpenAPI. Crear/enviar/borrar admiten 409 por conflicto de actividad, release u ordinal; no usar 409 para credenciales inválidas. Listado puede devolver lista vacía y nunca necesita revelar la existencia de chats ajenos. Listar historial propio no requiere que su perfil histórico siga en la release actual; sí exige permiso de corpus vigente. Detalle conserva alias, perfil y citas históricos. Crear/progreso/me requieren binding aprobado en current; enviar requiere además que el perfil de la conversación coincida con la asignación vigente. Un cambio administrativo de perfil no reescribe chats; si impide responder en uno antiguo, devolver 409 sin inventar otra identidad.

`limit` es entero decimal 1–50, default 20. Rechazar signo, ceros iniciales, decimal, espacios o notación exponencial. `event_types` y `statuses` se repiten por valor, únicos, de uno a tres; omitir incluye todos, no hay representación de array vacío. Los enums se conservan en OpenAPI.

Calendario: fechas reales `YYYY-MM-DD`, rango inclusivo de 1–366 días, inicio ≤ fin. Días civiles de `America/Bogota`; seleccionar `starts_at` en `[00:00 inicio, 00:00 día posterior al fin)`, no por solapamiento. Salida RFC 3339. No suponer agenda individual ni autorización académica de eventos.

Anuncios: `query` literal no blanca de 2–500 caracteres, sin distinguir mayúsculas en título/descripción. `temporal_status` default `active`; filtro `active/upcoming/expired/all`, siendo `all` solo valor de entrada. `reference_time` default instante capturado en servidor con zona; no elige una release histórica. Sin filas coincidentes: 200 con array vacío. Sin publicación usable: 404. Mantener las reglas existentes de derivación temporal y precisión del progreso.

Cada cita conserva todos los campos `index`, `source_kind`, `label`, `locator`, `release_id`, `document_version_id`, `artifact_url`. Solo documento tiene UUID de versión no nulo; kinds estructurados tienen ambos campos documentales nulos. El backend deriva/sanea texto y URLs desde metadatos verificados, sin copiar paths, hashes, SQL, canonical_uri o URLs externas a presentación. El schema valida forma; no acredita procedencia ni sanitización semántica.

Descarga: permiso de corpus común, sin exigir propietario de un chat. Verificar dataset/release antes de leer bytes, contención real de ruta y hash de la revisión exacta como hoy. No servir el archivo de current como sustituto histórico ni buscarlo en CCD. Se conservan documentos `full_document` sin fragmentación/vectorización. 200: `application/octet-stream`, Content-Length exacto, Content-Disposition `attachment; filename="{uuid}.bin"`, `X-Content-Type-Options: nosniff`, no-store/Vary. Range se ignora, archivo completo; no hay redirección/URL pública. Si falla un stream iniciado, interrumpirlo, sin agregar error JSON o fingir éxito completo.

## 5. Recuperación, política de contraseña y entrega

No hay enlaces profundos de recuperación: **entrada manual del token** recibido en el buzón local. La API obtiene el correo exclusivamente desde la cuenta aprovisionada; ningún endpoint acepta destinatario, URL base, dominio o nuevo correo. Destinos permitidos: local-part ASCII de 1–64 caracteres, comienza/termina alfanumérico, interiores alfanuméricos/punto/guion/guion bajo, sin dos puntos consecutivos, dominio exacto `banuchat.test`, todo en minúsculas. El transporte valida además la lista de buzones aprovisionados; no resuelve/relaya hacia destinatarios reales. Dominio reservado no equivale a un correo entregable sin adaptador local.

Contraseñas nuevas: **15–128 puntos de código Unicode bien formados**, incluidos espacios; sin trim, normalización silenciosa, composición obligatoria o cambio periódico. Rechazar una lista local revisada de contraseñas comunes, sin consultar servicios externos con el secreto. Login admite 1–128 como sintaxis para poder responder 401 a una contraseña errónea corta; toda credencial creada cumple la política de 15. Hash Argon2id v=19, salt CSPRNG de 16 bytes y salida de 32 bytes, PHC sin padding; configuración inicial `m=19456 KiB,t=2,p=1`. El DDL admite incrementos calibrados hasta 262144 KiB y diez iteraciones, p=1, sin bajar esos mínimos. No se ha medido su coste ni elegido/instalado runtime criptográfico aquí.

Establecimiento inicial y reset comparten confirmación, pero no crean cuentas. Aprovisionamiento local crea `pending_password`, binding y permisos explícitos y emite token `initial_set`; confirmación válida escribe credencial y activa solo esa cuenta preexistente. Para cuenta activa, propósito `reset`; una deshabilitada no puede reactivarse por este canal. Una solicitud de recuperación a una pendiente preaprovisionada puede emitir otro `initial_set`, bajo las mismas cuotas. Versiones/estado de cuenta determinan el propósito en servidor, nunca un argumento del cliente.

Token válido durante **1200 segundos**, máximo tres pendientes no vencidos por cuenta, comprobados bajo lock de cuenta. Petición nueva no revoca sesiones ni tokens anteriores, no bloquea cuenta y no reemplaza destinatario. Al consumir cualquiera: actualización de credencial/estado, incremento de auth_version, consumo único, invalidación de los otros tokens y revocación de todas sus sesiones en **una transacción**; se conservan los registros consumidos/revocados para auditoría y replay durante su ventana. Volver a login normal; no crear sesión automáticamente.

Orden de locks para estos casos: cuenta → sesión si corresponde → conversación si corresponde → token concreto. Reset, que revoca varias sesiones, las bloquea por ID en orden antes de consumir/inutilizar tokens; refresh debe descubrir el ID mediante lookup del digest, bloquear cuenta/sesión, luego releer/verificar token. No sostener locks durante Argon2, entrega de correo, router o Ollama; revalidar versión/estado al commit. La [matriz de autorización](../../infra/db/auth-permissions.md) fija la revalidación del turno y las responsabilidades que no puede sustituir un CHECK.

Envío detrás de `PasswordRecoveryNotifier → MailDelivery`: adaptador local permitido y fake en unitarias; proveedor externo no configurado/autorizado. No guardar el token para retry en DB, log o cola persistente. Despacho asíncrono local sin reintento automático: máximo 128 solicitudes en memoria por proceso y un trabajo de entrega concurrente. Tras reservar cuotas, encolar el UID sintácticamente válido sin consultar existencia/estado de cuenta en el camino HTTP; el trabajo decide después si puede emitir/enviar bajo lock y cuotas. No encolar destinatarios/tokens elegidos por cliente. Si la cuota de UID suprime trabajo, conservar el mismo camino de aceptación/respuesta sin envío.

Antes de aceptar solicitud comprobar disponibilidad general del almacén/limitador/despachador; si el servicio global no está disponible o la cola general está llena, 503 uniforme, independiente de existencia de cuenta. Admitida la solicitud, 202 tiene igual código/cuerpo y recorrido de respuesta para UID conocido/ausente/deshabilitado y envío suprimido. No esperar la entrega a una cuenta para decidir esa respuesta. Un reinicio puede perder trabajos en memoria: el 202 no promete entrega ni hay recovery/retry automático. Un fallo específico de entrega invalida ese token cuando sea posible, registra evento tipado sin destinatario/secreto y no cambia el 202 ya aceptado. Sin certeza de invalidación se confía en vencimiento/consumo único, nunca se registra el secreto para recuperarlo.

El usuario puede solicitar otro token manualmente, sujeto a cuotas y máximo pendiente; que la respuesta sea 202 no promete emisión ni entrega. Tras cambio exitoso enviar aviso sin contraseña/token; si falla ese aviso no revertir la contraseña. Proteger acceso al buzón local, tokens en sus mensajes y su limpieza; no dar acceso de todos los participantes al buzón completo. La prueba fake no acredita entrega ni recuperación funcional.

## 6. Abuso, respuestas y autorización

Ventanas fijas alineadas por epoch UTC; incrementos atómicos persistidos en PostgreSQL, también para UID desconocidos. UID/origen no se guardan en claro en buckets: HMAC-SHA-256 con clave protegida del entorno y dominio de acción. El origen se obtiene de la conexión/proxy permitido, no de X-Forwarded-For arbitrario. Cambiar una clave de limitación exige procedimiento operativo, no puede reiniciar cuotas durante una ráfaga.

| Acción | Ventana / máximo | Comportamiento |
| --- | --- | --- |
| Login por UID, conocido o ausente | 900 s / 5 intentos | 429 al superar cuota; mismo algoritmo para cualquier UID; sin bloqueo permanente |
| Login por origen | 900 s / 30 solicitudes | 429; protege también intentos a UID distintos |
| Recuperación por UID | 3600 s / 3 solicitudes admisibles de envío | Cuenta solicitudes de UID ausentes igualmente; superación suprime trabajo/envío y conserva 202; no revelar esta cuota en headers |
| Solicitud de recuperación por origen | 900 s / 10 solicitudes | 429 uniforme al superar presupuesto público |
| Confirmación por origen | 900 s / 10 solicitudes | 429, independiente de validez del token |
| Refresh por origen | 900 s / 60 solicitudes | 429, independiente de validez de la credencial |
| Trabajo Argon2 global del despliegue | 60 s / 20 operaciones | Se reserva antes del trabajo real o ficticio, para login y confirmación con política válida; 429 al superar cuota |

Reservar primero las cuotas públicas/origen y, cuando aplique, las de UID/trabajo global en una transacción. El intento por encima del límite no ejecuta hash/correo. El 429 de confirmación no confirma validez de token; las cuotas públicas se evalúan antes del lookup. El limitador es parte del servicio; fallo no permite acceso. Acotar además a dos trabajos Argon2 concurrentes por proceso, sin cola ilimitada; saturación temporal 503, misma política para UID conocidos/ausentes. No declarar capacidad para múltiples réplicas sin nivelar presupuesto y hardware; los contadores globales sí son compartidos.

Operaciones protegidas no tienen una cuota de identidad nueva en AUTH-P0; pueden recibir un 429 de un limitador público del perímetro **solo con la misma forma contractual**, sin inventar un presupuesto fijo no configurado ni contabilizar ese 429 como garantía ya implementada. La política de despliegue deberá documentarlo antes de exposición. No hacer retry automático de POST ante 429/503, timeout o refresh incierto.

Envelope de error exacto: `{error:{code,message,request_id}}`. UUID de correlación generado por servidor; jamás incluir detalles de validación con valores secretos, cuenta/correo, SQL, stacks, paths o payloads. OpenAPI restringe cada código a su mensaje fijo:

| HTTP / code | message |
| --- | --- |
| 400 / `INVALID_ARGUMENT` | La solicitud no cumple el contrato esperado. |
| 400 / `INVALID_RESET` | No se pudo restablecer la contraseña. |
| 401 / `UNAUTHENTICATED` | No se pudo autenticar la solicitud. |
| 403 / `FORBIDDEN` | La operación no está permitida. |
| 404 / `NOT_FOUND` | El recurso solicitado no está disponible. |
| 405 / `METHOD_NOT_ALLOWED` | El método no está permitido. |
| 409 / `CONFLICT` | El contexto cambió durante la operación. |
| 413 / `PAYLOAD_TOO_LARGE` | La solicitud excede el tamaño permitido. |
| 429 / `RATE_LIMITED` | Se alcanzó el límite temporal de solicitudes. |
| 500 / `INTERNAL_ERROR` | Ocurrió un error interno. |
| 503 / `DEPENDENCY_UNAVAILABLE` | Una dependencia temporalmente no está disponible. |

401 incluye `WWW-Authenticate: Bearer realm="banuchat-synthetic"`, sin causas particulares. 429 incluye `Retry-After` como entero decimal positivo en segundos hasta el fin de la ventana **pública** limitante; no divulga el contador/estado privado de una cuenta. Para login agotado solo por UID, devolver un Retry-After público fijo de 900 segundos, idéntico para UID existente/ausente; el cliente puede intentar después de esa espera sin garantía de capacidad. Varias cuotas públicas agotadas: máximo tiempo restante. 503 no promete reintento o fecha de recuperación.

## 7. Invariantes de autorización y persistencia

El principal deriva del digest access válido y del estado actual en servidor. Nunca de UID/profile_key/principal_id recibido en una operación de recurso, de una cabecera de rol, de un prompt ni de seleccionar un alias. Esos campos extra se rechazan por schema/query; manipular el UUID de un recurso conduce al mismo 404 que un objeto ausente si no es propio.

Crear conversación y `conversation_owners` en una sola conexión/transacción; comprobar binding y corpus contra la release fijada. Listar/leer/enviar/borrar por principal y propietario, aunque dos cuentas compartan perfil. Las conversaciones anteriores sin owner permanecen intactas e invisibles al acceso autenticado; no hay auto-claim/backfill. Los artefactos/calendario/anuncios son recursos comunes sujetos a permiso de corpus; los chats y mensajes no se convierten en comunes por citar ese corpus. El progreso es académico ficticio asignado; no expone datos reales o una lista de otras cuentas.

Conservar los gates actuales de conversación, release vigente/lista, ordinal, roles visibles, validación de citas, índices y restricciones SQL. Router/RAG/generación fuera de transacción; antes de persistir, nueva transacción sobre una conexión reservada que bloquea cuenta/sesión, revalida revocación/versión, corpus y owner, y ejecuta la sentencia atómica existente del turno dentro de ese contexto. Revocación que gana antes del commit impide insertar cualquier parte del turno; una respuesta tardía se descarta también en Mobile. No se borra retroactivamente un turno confirmado antes de la revocación.

Estas reglas requieren cambios posteriores autorizados en servicios/adaptador; un wrapper que invoque el servicio por UUID después de una comprobación sin locks no cumple la carrera de revocación. `Pool.query` con BEGIN en conexiones distintas tampoco cumple. No añadir agente, MCP, N8N o modificaciones del corpus para resolver ownership.

## 8. Validación AUTH-P0 y límites de esta entrega

Pruebas nuevas de contrato y DDL: `test/auth-v2-contract.test.ts` y `test/auth-schema.test.ts`. Ejecución desde `backend/api`: `node --import tsx --test test/auth-v2-contract.test.ts test/auth-schema.test.ts test/openapi-contract.test.ts`. Reutilizan para JSON Schema el Ajv 8.17.1/ajv-formats 3.0.1 ya declarados/instalados en `backend/mcp-server`, exclusivamente como dependencia de pruebas; no importan su runtime MCP ni añaden dependencias al producto. Si falta esa instalación, la prueba falla y requiere preparar las dependencias locales del repositorio, no omite validación silenciosamente.

Los tests compilan schemas, validan casos de entrada/salida y referencias, política de seguridad/códigos, proyección de payloads v1 y relaciones/checks/índices declarados. **No prueban login, correo, revocación, ownership operativo, permisos efectivos o sintaxis/ejecución completa de PostgreSQL.** El procedimiento de integración aislada que aún requiere autorización está en [auth-permissions.md](../../infra/db/auth-permissions.md). No se aplica SQL ni se levanta una base en AUTH-P0.

Referencias técnicas: [OpenAPI 3.1.0](https://spec.openapis.org/oas/v3.1.0) y [restricciones PostgreSQL 16](https://www.postgresql.org/docs/16/ddl-constraints.html). Las decisiones de política pertenecen a BanuChat/Sala, sin atribuir ratificación institucional a estas referencias.
