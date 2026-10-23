# CHECKPOINT BANUCHAT — BCH-04/AUTH-P4-L0

Fecha local: 2026-10-23. Base aceptada e inicialmente limpia:
`074d6d49c3767d7b0d06d27ee0d78e53cbead72e`. Decisión BCH-D33.

**Implementados el aprovisionamiento administrativo sin correo y el login/sesión
Mobile con RESTv2. Validados localmente con dobles y PostgreSQL/HTTP reales. No se
declara Mobile autenticado completamente validado:** falta demostrar los flujos en
Android/iOS compatible, almacenamiento nativo y canal seguro reales. No se realizó
una prueba web en sustitución. Recuperación por correo: **SUSPENDIDA**, no acreditada.
Se conserva AUTH-P3.1 y todo su contrato/DDL. OE1–OE6 no cambian de alcance.

## 1. Preflight y diferencias exactas

Revisados AGENTS.md, README Mobile, Expo Router, SessionProvider, siete clientes
de recursos, configuración synthetic/CCD, AUTH-P1/P2, composición v2, provisioner,
008 y contrato v2 revisión3.0.0. No se modifica contrato alguno.

| Cliente anterior v1 | Adaptación autenticada v2 |
| --- | --- |
| Perfil elegido en memoria como sesión local | AuthSession/AuthProvider independientes; perfil únicamente de GET/auth/me |
| GET/profiles y pantalla de selección | Prohibidos en synthetic autenticado; solo se conservan en modo CCD histórico |
| Creación `{profile_key}` | POST/conversations con `{}` exacto y Bearer |
| Historial con query profile_key | Lista propia sin selector de perfil, filtrada por owner en servidor |
| Progreso por /profiles/{key}/progress | /me/progress; perfil derivado del binding |
| Recursos anónimos y citas /api/v1 | Transporte Bearer común, rutas/citas /api/v2 y descarga protegida por UUID |
| clearSession local | Limpieza inmediata, revocación backend y aviso si no puede confirmarse |
| Perfil sin autenticación/restauración | Login UID/password, me, refresh serializado y restauración revalidada |

Calendario/anuncios conservan filtros y payloads. Chat reutiliza mensajes, citas,
reconciliación de resultado incierto y409, sin repetir POST. El cliente deja que el
servidor autorice historial propio aunque difiera el perfil histórico; CCD mantiene
su comprobación de contexto y sus IDs de apertura. No se comparte ni incorpora su
contexto técnico como identidad autenticada.

expo-secure-store **57.0.4** instalado según bundledNativeModules del Expo57.0.26
local, tipos revisados y plugin añadido. Sin migrar Expo57/RN0.86.3 ni generar
proyectos android/ios. La página oficial latest corresponde hoy a otro SDK; no se
usó su versión para actualizar dependencias. Solo cambia esa dependencia/lockfile.

## 2. Aprovisionamiento real y seguro

Nuevo LocalPasswordAdministrator + consola `npm run admin:local-account`, sin
administración HTTP/MCP. [Procedimiento y variables](../operations/auth-p4l0-login-local.md).
Reutiliza SyntheticAccountProvisioner, Argon2id, PgTransactionRunner, reloj/auditoría
existentes. UID y nombre son ficticios; correo histórico generado banuchat.test,
sin destinatario o dependencia de recuperación.

Aprovisionador limitado crea cuenta pendiente/bindings/grants en una transacción;
runtime limitado de008 activa en otra. Fallo intermedio conserva pendiente, nunca
simula activación. Cuenta pendiente existente debe tener nombre; no hay backfill.
Reemplazo de activa exige --existing y --replace-active; deshabilitada se rechaza.

Contraseña dos veces, TTY sin eco, sin argumentos/archivos/env/registro de su valor.
Se restauran modo de terminal y referencias propias; buffers se sobrescriben. No
se promete borrado físico de copias de strings en JavaScript/GC. Prueba no-TTY
rechaza antes de conectar DB. **La interacción manual de operador con TTY sigue
pendiente**, distinta del caso de uso administrativo real ya probado con fixtures.

Hash Argon2id19456/t2/p1 fuera de locks; cuenta→sesiones ordenadas→retos, revalidando
versión observada/scope antes de confirmar. Activar/escribir hash/incrementar versión/
revocar sesiones/inutilizar retos/auditar se confirma junto. Prueba de hash inválido
acredita rollback de versión y revocaciones. Bindings, grants, owners e historial
se conservan. No se fabrican contactos verified ni códigos.

**No se necesitó migración ni ampliación de privilegios:**008 ya concede INSERT/
UPDATE de credenciales/estado al runtime confiable. Se rechazó superusuario,
deployment incorrecto y destino CCD/base incorrecta. El administrador usa runtime,
no migrador; el aprovisionador separado sigue sin hashes. El harness migrador solo
prepara la instancia nueva, no forma parte del procedimiento definitivo.

## 3. Sesión y navegación móvil

AuthSession conserva access exclusivamente en memoria. Solo refresh va a SecureStore,
clave separada por URL de API, servicio propio y WHEN_UNLOCKED_THIS_DEVICE_ONLY.
Carga nativa diferida: módulo ausente/error/Web → indisponible, sin fallback plano
ni sesión simulada; no se rompe CCD por importar un módulo nativo inexistente.
No hay credenciales hardcodeadas de aplicación, AsyncStorage o tokens en EXPO_PUBLIC.

Login valida UID/password y respuesta me antes de habilitar pantallas; errores
genéricos, carga y campo protegido. Onboarding permanece. Home identifica **UID de
cuenta** y etiqueta distinta de **perfil académico**; no usa alias como nombre de
persona. Nombre propio no se expone: /auth/me sigue intacto y no se solicita un
delta innecesario. Hay cierre de sesión y cambio de cuenta mediante logout/login.

Refresh es único para solicitudes concurrentes y retira su predecesor persistido
antes de llamar al backend. Resultado incierto/401 exige login y limpia estado;
no reproduce refresh. Reinicio del controlador rota token y consulta me. Logout
borra estado/vault y revoca mediante backend; si falla red o confirmación, comunica
solo cierre local. Error del almacén bloquea UI, sin suponer borrado nativo logrado.

Epoch por cambio de identidad, navegación remontada y descarte de JSON/texto tardíos
impiden mostrar datos previos. Resultado de refresh posterior a logout se descarta
y se intenta revocar el access nuevo una sola vez. Se evita usar access ya vencido
para logout si no queda refresh local. Expo Router protege todas las pantallas
académicas; perfiles solo CCD, login solo cuando no hay sesión. No signup/recuperación
en UI. El almacenamiento y la navegación reales aún requieren dispositivo.

## 4. Transporte y servidor

Nuevo `npm run start:authenticated`: listener independiente solo127.0.0.1, sin
importar servidor v1, sin elección de CCD o RecoveryService, con rol/base/deployment/
rateKey explícitos y estables. Errores de Pool saneados. Reutiliza router/fast paths,
Document RAG y recetas existentes; no cambia modelo, corpus o generación.
Entry point compilado; no se acredita un despliegue permanente ni un nuevo ensayo
Ollama. HTTP real de integración usa la misma composición con generador controlado.

Mobile rechaza /api/v1, hosts LAN/públicos, credenciales/query en URL y HTTP sin
canal local declarado. Solo loopback por ADB reverse autorizado o alias de emulador
aislado; HTTPS local confiable y HTTPS de despliegue son trabajos independientes.
No se abrió API a LAN/Internet ni se tocó CORS/firewall para hacer funcionar login.
No se iniciaron v1 ni CCD contra la base de prueba autenticada.

No se encontró adb en PATH o ubicación habitual del SDK, ni configuración Android
SDK en las variables consultadas. Esto **no prueba que no exista un teléfono**;
impide acreditar aquí el canal/dispositivo. Android físico, iOS y emulador operativo
quedan pendientes. No se presentó un viewport web como evidencia nativa.

## 5. Pruebas y aceptación

| Ejecución | Resultado |
| --- | --- |
| Mobile typecheck | PASS |
| Mobile lint --no-cache | PASS, sin errores/advertencias finales |
| Mobile test:local | **15/15**, nueve pruebas auth y seis históricas con expectativas synthetic actualizadas |
| API typecheck / build | PASS / PASS |
| API npm test | **556/556**, cero fallos u omisiones |
| PostgreSQL/HTTP AUTH-P4-L0 | **9 comprobaciones, 10/10 registros Node** incluyendo padre |
| Consola sin TTY | Rechazo seguro esperado, sin conexión DB |
| Export Android Hermes | PASS de compilación local, no ejecución en dispositivo |
| Lint API | No existe script configurado; no se atribuye PASS ni se añade framework |

La exportación Android inicial falló por permiso de escritura de Hermes en el
temporal sandbox. Repetida con temporal propio bajo .expo y ejecución local
autorizada, produjo bytecode Android. No se cambió SDK, compilador o comportamiento
de autenticación para resolverlo; no es APK instalado ni prueba de SecureStore.

Primera integración falló por fixture disabled sin fechas exigidas por006; los
errores siguientes dependían de ese caso. Se conservó
[reporte inicial](../../eval/auth/results/bch04-auth-p4l0-first.json), se corrigió
solo el fixture y se repitió en base nueva. Una prueba de refresh/logout detectó
dos intentos de revocación, uno con access vencido; se corrigió ese camino móvil.
Resultado final SQL/HTTP:
[reporte](../../eval/auth/results/bch04-auth-p4l0-final.json).

| Criterio de Sala | Evidencia alcanzada y límite |
| --- | --- |
| 1 Cuenta/procedimiento seguro | Aprovisionador y activación real con roles limitados; TTY manual pendiente |
| 2 Login correcto | HTTP+PostgreSQL y controlador móvil real; pantalla en dispositivo pendiente |
| 3 Password errónea | Rechazada genéricamente en HTTP real |
| 4 Deshabilitada | Rechazada; administrador tampoco reactiva |
| 5 Sesión/perfil asignado | me real validado; dos principales distintos con mismo perfil |
| 6 Chat propio | Crear y enviar turno201 real con ruta basic_social; no nueva prueba Ollama |
| 7 Historial aislado | Otra cuenta con mismo perfil recibe404 y lista vacía |
| 8 Bearer en recursos | Adaptadores con dobles y recursos HTTP reales,401 sin token |
| 9 Refresh/expiración | Rotación única concurrente real; vencimiento access real y limpieza; almacén nativo doble |
| 10 Logout/revocación | Revocación y limpieza acreditadas en HTTP/PG; dispositivo pendiente |
| 11 Cambio de cuenta | Cambio de principal real; epoch/cuerpos tardíos con dobles; vistas físicas pendientes |
| 12 Limpieza local | Memoria/vault doble limpios; navegación remonta; SecureStore físico pendiente |
| 13 Reinicio | Nuevo controlador con mismo vault doble, refresh/me reales; reinicio Android/iOS pendiente |
| 14 Sin recuperación/registro UI | Revisión de fuentes y compilación, sin enlaces; comprobación visual nativa pendiente |
| 15 Sin bypass v1 | Servidor v2 devuelve404, cliente rechaza v1; CCD separado explícito |
| 16 Regresiones | API556, Mobile15, tipos/lint/build; no equivalen a validación integral nativa |

No mezclar estas capas: SecureStore se sustituyó por un doble únicamente en las
pruebas Node; el producto usa el módulo nativo. La integración sí utiliza el código
AuthSession Mobile, PostgreSQL y HTTP reales. No se ejecutaron pruebas universitarias,
correo, scraping, ingestas, infraestructura institucional o E2E físico.

## 6. Integridad y archivos

[Evidencia depurada](../../eval/auth/results/bch04-auth-p4l0-evidence.json): hashes,
checks, alcance y retirada de recursos. Huella fixture antes/después idéntica:
`9331f977456041d1975afae77e56874199841d33a78afce3ee3c78e3da64be0b`.
No se conectaron bases originales. Nueva instancia banuchat_auth_p4l0_test,
loopback55439, red/volumen propios y sin mounts del host. 001/006/007/008 aplicadas
sin cambio allí; dos releases fixture-only y cero embeddings, no publicación o
modificación del corpus congelado. Retirada exclusiva verificada en evidencia.

Sin cambios en001–008, RESTv1/v2 revisión3, MCP, AUTH-P1/P2/RecoveryService, corpus,
releases reales, embeddings, RAG, agentes, n8n, T11/U03/U04 o historiales originales.
La cuenta/turno nuevos de laboratorio se conservaron durante validación de cambios
de contraseña y ownership; solo se retira después el entorno de pruebas exclusivo.

Añadidos:

- Backend: `src/admin-local-account.ts`, `src/authenticated-main.ts`,
  `src/auth/{local-password-administrator,private-password}.ts`.
- Pruebas: `test/auth-p4l0-{setup,integration}.mts`, `test/auth-p4l0/environment.ts`;
  `infra/auth-p4l0-test-environment.ps1`; resultados first/final/evidence en eval/auth.
- Mobile: `src/auth/{auth-session,auth-provider,native-store,runtime}`, login.tsx y
  test/auth-session.test.ts.
- Runbook y este checkpoint.

Modificados: package/README API; package/lockfile/app.json/.env.example/README Mobile;
los siete adaptadores API; configuración API, puente de sesión y navegación;
Home/onboarding/chat/historial/calendario/progreso, ChatSources y expectativas
sintéticas de ccd-local.test.ts. CCD conserva su semántica. No hay dependencia API
nueva ni proyecto nativo generado. El listado exacto se recoge en evidencia.

## 7. Riesgos, pendiente y detención

Pendientes para validación completa: dispositivo compatible, ADB o canal HTTPS local
confiable, operador para consola privada, pruebas visuales/teclado/navegación y
SecureStore persistente/reinicio/logout/cambio de cuenta nativos. Establecer destino
operativo persistente y custodia técnica de roles/rateKey por separado de los
fixtures; no usar sus passwords de test como cuentas del equipo. Validar los flujos
de RAG existentes bajo configuración real cuando se prepare ese destino; no cambiar
recetas para esta tarea. No usar LAN HTTP como solución a falta de canal USB.

Correo **SUSPENDIDO** por decisión de equipo; no se eliminó AUTH-P3.1 ni se declara
AUTH-P3 completo. Ningún contacto real se configuró o verificó. Sin servicios de
envío, secretos personales, registro público o autenticación universitaria.

**Entregado para revisión de Sala de Control, sin afirmar validación completa de
Mobile en Android/iOS.** Sin commit/push ni inicio de M01/M02/A01 o AUTH-P3.2.
