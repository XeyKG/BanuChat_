# CHECKPOINT BANUCHAT — BCH-04/AUTH-P4-L1

Fecha de ejecución: 2026-10-23; zona local America/Bogota. Base aceptada y limpia:
`1f208162418e6e73e0c498d356a873bdb78366ba`. Decisión BCH-D34.

**El flujo principal se ejecutó en Android físico:** login, recursos, historial,
restauración después de cierre forzado de Expo Go, logout y cambio de cuenta.
El titular confirmó las pantallas; PostgreSQL corrobora cuentas, sesiones, mensajes,
revocación y refresh. No equivale a validación completa de AUTH-P4: quedan pruebas
nativas negativas, expiración, consola administrativa definitiva e iOS.
Correo continúa **SUSPENDIDO**. Sin cambios de contratos o código de producto.

## 1. Preflight y entorno realmente utilizado

Se revisaron AGENTS.md, checkpoint/runbook P4-L0, composición autenticada, consola,
contrato RESTv2, guard de PostgreSQL, configuración Mobile y adaptador SecureStore.
HEAD coincidió con la base aceptada; no había cambios iniciales.

ADB no estaba en PATH, pero sí en Android/Sdk/platform-tools del perfil del usuario.
Se buscó también en ubicaciones habituales de Android, Program Files y gestores de
paquetes; no se modificó PATH global. Platform-tools37.0.0, ADB1.0.41.
El primer intento en sandbox no pudo arrancar el daemon. Con ejecución local
autorizada arrancó y `adb devices -l` encontró un teléfono físico autorizado.
No se dedujo ausencia de teléfono del fallo inicial.

Android14/API34; Expo Go57.0.9 instalado, compatible para la ejecución observada.
Expo del proyecto57.0.26, React Native0.86.3 y SecureStore57.0.4 se conservaron.
No se incluyen serial, identificadores del titular ni capturas de credenciales.
La actividad de Expo Go se comprobó en primer plano. No se usó Expo Web, emulador,
APK generado o exportación de bundle como sustituto de la prueba física.

[Runbook de esta ejecución](../operations/auth-p4l1-validacion-android.md).
Nueva instancia `banuchat-auth-p4l1-demo`, base `banuchat_auth_p4l1_demo`, loopback55440,
red y volumen propios, sin host mounts, masquerade desactivado. Copia en lectura
del schema/corpus sintético original, excluyendo datos de conversaciones/mensajes/
citas. Se preservaron dos releases, current, perfiles, hashes y120 chunks/embeddings.
No hubo reingesta, publicación, cambio de modelo o conexión a CCD.

006–008 se aplicaron sin editar únicamente al destino nuevo. La primera preparación
falló durante el arranque inicial del contenedor, antes de crear el schema de negocio;
la reanudación sobre el contenedor identificado terminó correctamente. No se borró
ni recreó una base existente para ocultar el fallo. Se comparó corpus origen/copia
antes de preparar auth y al finalizar.

Roles migrador/runtime/aprovisionador separados; executor NOLOGIN de007. PgAuthStore
real aceptó runtime y rechazó rol privilegiado, base esperada incorrecta y deployment
incorrecto. El migrador no atendió HTTP ni estableció contraseñas.

Configuración privada ignorada y con ACL Windows para el principal local. Deployment
explícito y rateKey nueva, estable tras reiniciar el servidor; secretos técnicos
independientes de los harnesses. Archivo privado con ACL, no cifrado ni gestor de
secretos definitivo. Ver custodia y límites en el runbook; no copiar su contenido.

APIv2 en127.0.0.1:3002, Metro en127.0.0.1:8081 y túneles USB3002/8081 comprobados.
Metro inicialmente enlazó localhost a::1; se reinició el proceso con resolución
DNS IPv4 prioritaria. No se modificó el producto/node_modules, no se abrió LAN.
Manifiesto Android200 con launchAsset/hostUri127.0.0.1. Se deshabilitó la carga
automática de .env para Metro; .env.local no cambió. Un aviso de instalación de
DevTools no impidió finalmente abrir BanuChat. No se actualizaron dependencias.

## 2. Aprovisionamiento y consola privada

El operador introdujo entradas rechazadas por el UID congelado, incluida una entrada
con dos UIDs unidos por una barra. Otro intento llegó a confirmación de contraseña
y devolvió INVALID_ARGUMENT; no se afirma si la causa fue política o discrepancia
de confirmación. Lecturas posteriores confirmaron cero cuentas, credenciales y
eventos: no se simuló una activación exitosa. No se conserva el ejemplo privado de
UID ni la contraseña corta que el operador propuso por chat.

Tras autorización expresa del operador para automatizar las credenciales ficticias,
un helper local con TTY reutilizó SyntheticAccountProvisioner y
LocalPasswordAdministrator. Generó dos contraseñas aleatorias independientes en
memoria y las mostró únicamente en ventana privada sin captura de Codex. Sin
contraseñas en args, archivos, logs, evidencia o respuesta. No se usó el valor
compartido por chat ni credenciales de un harness.

- BCH-DEMO-9101 / Alba Ficticia.
- BCH-DEMO-9102 / Bruno Ficticio.

Ambas activas, nombre propio separado de alias académico, profile-001 compartido,
auth_version2 y credencial Argon2id. Dos account_provisioned y dos password_set.
Correo histórico reservado banuchat.test; cero contactos/retos de recuperación.
No representan usuarios definitivos del producto ni identidades UNAB.

Se rechazó además reemplazar una activa sin autorización explícita de reemplazo;
no se alteró su credencial. **La activación exitosa con entrada/confirmación sin eco
en admin:local-account sigue pendiente**: el helper automatizado no demuestra ese
prompt. La consola definitiva sí se ejecutó manualmente y rechazó entradas inválidas.
No se repitió con una tercera cuenta la prueba de deshabilitada acreditada en P4-L0.

## 3. Resultado por capa

| Comprobación L1 | Evidencia y resultado |
| --- | --- |
| Abrir BanuChat/login en Android | Confirmación del titular; Expo Go y actividad Android comprobados |
| Login UID/password propios | Titular confirma; dos login_succeeded SQL y dos principales distintos |
| Perfil, chat, historial, progreso/calendario/anuncios | Titular confirma todos; conversaciones/mensajes propios persistidos |
| Documento protegido desde cita | Titular confirma apertura;15 citas persistidas al corte, sin exponer contenido |
| Historial separado con perfil compartido | Titular confirma que segunda cuenta no mostraba el chat de la primera |
| Conocimiento de UUID ajeno | Deep link USB al chat de la primera bajo segunda cuenta; titular confirma que impide verlo |
| Logout/revocación | Un logout_succeeded SQL y sesión de primera cuenta revocada; titular confirma pantalla login y no restauración tras logout |
| Cambio de cuenta/vistas | Titular confirma ausencia del chat anterior; SQL corrobora segundo principal y conversaciones propias |
| Reinicio/SecureStore | Cierre forzado real de Expo Go sin borrar datos, reapertura y titular confirma segunda cuenta sin contraseña; posteriormente refresh_succeeded SQL |
| Contraseña incorrecta | Rechazo informado por titular; no se conserva la entrada. Al corte no había login_denied SQL: comprobación visual sin corroboración HTTP individual |
| Sin signup/recuperación UI | Titular confirma; revisión de fuentes vigente; /auth/register404 |
| Recursos anónimos/v1 | GET me/conversations/progress/calendar/announcements401; v1/profiles404; no-store en las siete respuestas examinadas |
| Servidor/configuración estable | Reinicio real del proceso v2: mismo deployment, misma huella de rateKey y guard runtime aceptado |
| Rechazo sesión revocada por replay | No se extrajo token para reproducirlo; no acreditado nuevamente en Android; P4-L0 conserva su evidencia independiente |

Los reportes iniciales de reapertura no coincidían aún con un evento de refresh.
Se evitó marcarlos suficientes: se forzó cierre de proceso y se volvió a consultar
tras la carga de la app. La observación posterior sí registró refresh_succeeded.
La secuencia del cliente vigente exige refresh y me válido antes de habilitar UI;
no se capturaron cabeceras/cuerpos privados para demostrarlo.

SecureStore se utilizó realmente en esta ejecución Android: login y restauración
posterior a pérdida de proceso, módulo nativo cargado y refresh real. Solo refresh
persistido según código, access en memoria; no AsyncStorage/fallback plano. No se
inspeccionaron archivos privados ni se hizo análisis forense de almacenamiento.
No se afirma borrado físico. Fallos inducidos de lectura/escritura/borrado y
expiración completa en dispositivo **pendientes**, distintos de dobles unitarios.

Al corte: primera cuenta1 conversación/4 mensajes y segunda3 conversaciones/8
mensajes; primera sesión revocada, segunda activa;1 refresh exitoso. Son conteos
de la instancia nueva, no del historial original. El usuario puede seguir usando
la demo: no extrapolar estos conteos a actividad posterior al reporte.

Ollama local confirmó versión0.35.0 y modelo qwen3:4b-instruct con el digest
preexistente. Se reutilizó el entrypoint auténtico con Document RAG real, sin doble
de generador en el servidor. El usuario consultó chat y documento; no se capturó
una traza individual de generate/embedding ni se ejecutó un benchmark RAG. No se
declara por las citas o el saludo una generación Ollama nueva acreditada, ni mejora
de T11, ni integración agéntica/MCP.

## 4. Regresiones e integridad

| Prueba ejecutada en L1 | Resultado |
| --- | --- |
| API npm run typecheck | PASS |
| API npm run test:auth |27/27 PASS |
| Mobile npm run typecheck | PASS |
| Mobile npm run lint -- --no-cache | PASS, cero errores/advertencias finales |
| Mobile npm run test:local |15/15 PASS; incluye controlador auth y separación CCD |
| Guards administrativos reales sobre PostgreSQL nuevo |4/4 rechazos esperados |
| HTTP anónimo/rutas excluidas |7/7 estados esperados y no-store |
| git diff --check | Verificación final registrada en evidencia |

No se repitieron las556 pruebas API, la integración desechable P4-L0, build/export,
ingesta, Docker universitario ni evaluaciones RAG costosas: no hubo cambio de
código capaz de afectarlas. Sus resultados previos no se presentan como ejecuciones
L1. API no tiene script lint; no se atribuye un PASS inexistente.

Huella SHA-256 del corpus relacional, mismo algoritmo sobre13 tablas y filas
ordenadas, idéntica en origen antes/después y en copia:
`c6659b9546c42012d49af565fec32f6cd2ea39b521aa2531d2b154b4085b991e`.
La huella incluye perfiles, publicaciones, chunks y embeddings; excluye tablas de
auth/conversación donde esta prueba debe crear actividad.

Sin modificaciones a código API/Mobile/RAG/MCP, contratos RESTv1/v2/MCP, SQL001–008,
data/synthetic, CCD, releases/embeddings originales, T11/U03/U04 o conversaciones
históricas. Se conservó la instancia original sin escrituras; no se conectó CCD.
Comparación contra HEAD y huellas de60 archivos protegidos registradas. Escaneo
de logs de tarea sin valores de las cuatro claves/contraseñas técnicas privadas,
PHC, Bearer ni direcciones bajo dominio académico; no es una prueba universal de
ausencia de todo posible secreto. No se capturó la ventana de contraseñas ni se
publicaron logs completos.

## 5. Delta solicitado por el operador — SIN APLICAR

Durante la validación se solicitó un UID de estilo `U`+ocho dígitos, contraseña
corta compartida y correo ficticio bajo @unab.edu.co. La solicitud contradice
reglas congeladas actuales. No se copian sus ejemplos privados a esta evidencia.
AUTH-P4-L1 exige detener esa modificación y presentar el delta antes de aplicarlo.

| Área | Delta que requiere decisión de Sala |
| --- | --- |
| UID | Definir si U+8 dígitos es formato ficticio BanuChat. Propuesta compatible: aceptar `^(?:BCH-DEMO-[0-9]{4}|U[0-9]{8})$` para conservar cuentas anteriores, sin backfill; nuevos UIDs solo de un rango ficticio acordado. No acredita formato o identidad institucional |
| REST/cliente | Revisión contractual de synthetic_uid (longitud, patrón, ejemplos), api-contract-v2/openapi-v2, validadores de backend, consola, login, current/me y sus pruebas. No modificar solo la UI para eludir SQL |
| Persistencia | Migración ADITIVA posterior a008 para reemplazar únicamente el CHECK de UID de006, sin editar006, renombrar cuentas o cambiar IDs/FKs/grants/historial; preflight de valores existentes y pruebas de ambos formatos. No se crea/aplica esta migración en L1 |
| Contraseña corta | Requiere cambiar política congelada de15–128 en contrato, primitivas, aprovisionamiento/recuperación y pruebas. No recomendado: conservar mínimo15 y contraseñas independientes. No hardcodear un password compartido ni introducir excepción de demo |
| Correo ficticio | Recomendación: conservar dominio reservado banuchat.test. Un dominio universitario real puede coincidir con buzones existentes; inventar su parte local no demuestra que sea sintético |
| Si se exige aspecto académico | Preferir alias inequívocamente ficticio bajo dominio reservado. Si Sala exige literalmente el dominio real, definir primero semántica y separación de un atributo académico ficticio respecto de recovery_contacts/entrega, junto con migración aditiva y ausencia de verificación/envío. No reemplazar silenciosamente recovery_email ni marcar contactos verificados |

No se aplica un formato real a un UID privado del equipo ni se incorporan direcciones
reales. Correo histórico y contacto real de recuperación siguen siendo distintos;
la suspensión del envío no constituye autorización para utilizar destinatarios reales
ficticios. Este delta no crea endpoints, federación, registro, contacto o correo.

## 6. Archivos, estado pendiente y detención

Añadidos versionables: este checkpoint,
[runbook](../operations/auth-p4l1-validacion-android.md) y
[evidencia depurada](../../eval/auth/results/bch04-auth-p4l1-evidence.json).
Helpers, estado, configuración y logs locales bajo infra/local/auth-p4l1 permanecen
ignorados. No contienen contraseñas de las cuentas; sí existe configuración técnica
privada protegida por ACL que no debe adjuntarse. No hay cambios de producto.

Pendientes: prompt administrativo definitivo exitoso; deshabilitada no repetida en
L1; fallos nativos de lectura/escritura/borrado; expiración total y replay de sesión
revocada desde Android; iOS completo; custodia definitiva del entorno; decisión del
delta solicitado. No declarar AUTH-P4 completamente validado o listo para despliegue.
Las pruebas positivas del núcleo Android quedan acreditadas con los límites de cada
capa anteriores. Las nuevas cuentas pertenecen a validación y no a un registro real.

API/Metro y PostgreSQL aislado quedan locales para revisión, sin listeners públicos.
Conservar datos/volumen y secretos técnicos para continuidad controlada, no hacer
cleanup automático de esta demo. El titular debe cerrar la ventana privada con las
contraseñas; no se promete borrado de su scrollback. No se han contratado servicios
ni retomado correo, AUTH-P3.2, M01/M02/A01 u otra etapa. Sin commit/push.

**Detención para revisión de Sala de Control.**
