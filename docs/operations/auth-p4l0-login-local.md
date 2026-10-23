# BanuChat — login local AUTH-P4-L0

BCH-D33 suspende la recuperación por correo y prioriza login propio con cuentas
permanentemente sintéticas. No hay registro público, autenticación UNAB o validación
de contraseñas institucionales. [Checkpoint](../transition/bch04-auth-p4l0-checkpoint.md).

## Aprovisionamiento administrativo

`backend/api/src/admin-local-account.ts` es una consola administrativa **local**,
sin endpoint HTTP/MCP. Desde `backend/api`: `npm run admin:local-account`.
Exige terminal interactivo con entrada/salida TTY; una tubería/archivo no sustituye
el prompt. Pide UID BCH-DEMO- más cuatro dígitos, nombre ficticio, perfil sintético
autorizado y contraseña propia dos veces, sin eco. No pasar contraseñas por args,
archivos, Git, variables de entorno o herramientas que transcriban la entrada.

El operador inyecta privadamente las credenciales **técnicas** y metadatos del
destino en el proceso, desde su custodia, sin escribir sus valores en historial:

| Variables | Uso |
| --- | --- |
| BANUCHAT_ADMIN_DATABASE / DEPLOYMENT / PORT | Nombre, ámbito007 y puerto PostgreSQL expresamente autorizados |
| BANUCHAT_ADMIN_RUNTIME_USER / RUNTIME_PASSWORD | Rol limitado existente con ACL008; nunca migrador/superusuario |
| BANUCHAT_ADMIN_PROVISION_USER / PROVISION_PASSWORD | Aprovisionador separado sin acceso a hashes, solo para cuenta nueva |

Esos sufijos llevan el prefijo completo BANUCHAT_ADMIN_. Host fijo127.0.0.1;
sin destino por defecto, sin cargar .env implícitamente; rechaza CCD y puertos5432/
55433 de bases históricas. Además verifica DB real, rol sin poderes/DDL/membresías,
sin escrituras de corpus, sin conexión a otras bases, current sintética y scope007.
El perfil debe existir en current y el nombre ser ficticio/no blanco. La sintaxis
no acredita que el operador tenga consentimiento para una identidad real: no usarla.

Cuenta nueva: el aprovisionador crea pending_password/binding/grants en su propia
transacción, usando correo **histórico reservado** generado desde UID. Después,
LocalPasswordAdministrator calcula Argon2id fuera de locks y activa mediante una
segunda transacción. Si falla, puede quedar pendiente, sin credencial activa ni
login; no se concede al aprovisionador permiso de hashes para unificar estos pasos.
No hay correo real requerido ni contactos marcados verificados.

Cuenta pendiente existente, con nombre ya asignado:
`npm run admin:local-account -- --existing`. Para reemplazo de una activa se exige
además `--replace-active`. No se reactivan deshabilitadas. Legado con nombre NULL
se rechaza y requiere remediación administrativa expresamente autorizada; no hay
backfill automático ni modificación de nombres existentes por este procedimiento.

Activación/reemplazo bloquea cuenta → sesiones por UUID ascendente → retos,
revalida versión observada antes del hash y scope, revoca sesiones, invalida retos,
escribe Argon2id, incrementa auth_version y registra password_set/password_reset
en una transacción. Mantiene bindings/grants/owners y conversaciones. Error de
credencial/auditoría revierte todo. No usa UPDATE indiscriminado ni rol privilegiado.
Los permisos de008 ya bastan: **ninguna migración o ampliación de ACL nueva**.

La contraseña solo vive temporalmente en memoria: buffers de entrada se sobrescriben
y referencias propias se limpian al salir; JavaScript y Argon2 pueden mantener
copias internas hasta GC. No se promete borrado criptográfico de strings inmutables.
Restaurar modo de terminal también ante cancelación. No usar transcripts, grabación
de terminal, depuración de parámetros o introducción de secretos mediante este chat.
El rechazo sin TTY se verificó; interacción manual con contraseña propia sigue
pendiente de sesión de operador, separada de las pruebas automáticas ficticias.

## Servidor v2 ejecutable

Desde backend/api: `npm run start:authenticated`. Proceso nuevo independiente de
main.ts/v1, bind fijo127.0.0.1, API por defecto3002; nunca0.0.0.0 o Internet.
No ejecutar v1 contra la misma base protegida. Variables de configuración privada:

- BANUCHAT_AUTH_DATABASE, BANUCHAT_AUTH_DEPLOYMENT, BANUCHAT_AUTH_DB_PORT.
- BANUCHAT_AUTH_RUNTIME_USER, BANUCHAT_AUTH_RUNTIME_PASSWORD.
- BANUCHAT_AUTH_RATE_KEY: mismos32 bytes hex privados entre reinicios; no se genera
  ni rota al arrancar. No usar las credenciales/clave de pruebas como operativas.
- BANUCHAT_AUTH_API_PORT opcional; BANUCHAT_AUTH_ARTIFACT_ROOT opcional de operador,
  por defecto data/synthetic, con contención de ruta y hash originales. Para el
  fixture aislado usar su raíz de artefactos, no CCD ni un fallback por current.

Se requiere metadata/configuración real del generador local existente que valida
loadGeneratorRuntimeConfig, incluidos modelo/revisión/runtime; no inventar esos
valores para arrancar. Reutiliza Document RAG, embedding y servicios actuales,
evidence_mode synthetic, sin cambiar recetas/corpus. No requiere correo ni que
Ollama conteste para login; una consulta RAG sí necesita sus dependencias existentes.
El entrypoint se compiló; no se acredita aquí un despliegue operativo permanente
ni una nueva evaluación de Ollama. La integración ejercita la misma composición
v2 con generador controlado y HTTP real.

RecoveryService no se compone. Las dos rutas declaradas permanecen en contrato y
devuelven503 por dependencia ausente; no emiten códigos/envíos. No se modifican
AUTH-P3.1, 001–008 ni schemas REST/MCP. Correo **SUSPENDIDO**, no acreditado.

## Mobile y canal autorizado

Modo synthetic ahora requiere login v2; ya no admite selección de perfil/v1. Modo
ccd_local conserva su demostración histórica, aviso, scopes de apertura y v1
loopback3001/8083. No es acceso autenticado ni fallback del login.

Configurar únicamente metadatos públicos, nunca tokens/passwords en EXPO_PUBLIC:

```dotenv
EXPO_PUBLIC_DEMO_MODE=synthetic
EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:3002/api/v2
EXPO_PUBLIC_AUTH_LOCAL_CHANNEL=adb_reverse
```

Para Android físico, solo con dispositivo autorizado visible y ADB operativo:

```powershell
adb devices -l
adb reverse tcp:3002 tcp:3002
adb reverse tcp:8081 tcp:8081
```

Desde mobile: `npx expo start --localhost --port 8081`; abrir Expo Go compatible
SDK57 por el canal USB/loopback autorizado. No sustituir la URL por una IP LAN
HTTP para hacer funcionar login. Para emulador Android aislado, usar10.0.2.2 con
canal android_emulator y backend siempre en loopback. HTTPS local con certificado
confiable es otra posibilidad; no se configuró ni acreditó en este incremento.
El cliente rechaza hosts LAN/públicos, credenciales en URL, v1 y HTTP sin canal
declarado. La declaración no acredita que ADB exista: verificarlo antes de probar.
HTTPS de despliegue es requisito independiente; no se abre un host público aquí.

expo-secure-store57.0.4 coincide con bundledNativeModules del Expo57.0.26 instalado;
se añade su plugin sin generar android/ios ni cambiar Expo/RN. iOS y Android usan
SecureStore; clave por URL de API, servicio propio y WHEN_UNLOCKED_THIS_DEVICE_ONLY.
Solo refresh se persiste. Access vive en el controlador en memoria; contraseña
solo durante login. No AsyncStorage, archivos planos o fallback web. Si el módulo
nativo no está disponible, la UI queda bloqueada. Web no acredita login nativo.
Referencia: [SecureStore oficial](https://docs.expo.dev/versions/latest/sdk/securestore/);
esa página hoy corresponde a otro SDK, la versión57 se resolvió con el manifiesto
y tipos instalados, sin actualizar el proyecto.

AuthSession es distinto de la sesión histórica por perfiles. GET/auth/me valida
principal/UID/perfil/capacidades y expiración; la UI muestra UID de cuenta y etiqueta
separada de perfil académico. No muestra nombre propio: no está en el contrato.
Las pantallas reutilizadas se protegen mediante Expo Router; la selección de perfil
solo queda en CCD. Onboarding se conserva antes del login.

Refresh proactivo serializado antes de enviar recursos cuando vence access; se
retira el refresh anterior de SecureStore **antes** del POST y se guarda el nuevo
solo tras resultado válido. Fallo/resultado incierto exige login, sin replay. Al
reiniciar se rota refresh y consulta me antes de habilitar pantallas.401 invalida
memoria/almacenamiento. No se repiten POST/mensajes ante errores, timeout o409.
Logout limpia inmediatamente estado/vault y solicita revocación backend; si no se
confirma, avisa sin afirmar revocación remota. Fallo de borrado nativo bloquea UI;
su comportamiento efectivo requiere dispositivo, no se supone borrado exitoso.

Cada cambio de cuenta incrementa epoch, remonta navegación y rechaza cuerpos JSON/
texto tardíos. Refresh tardío no restaura identidad y se intenta revocar su access
emitido, sin retry. Historial autorizado se conserva aunque difiera el perfil
histórico; el servidor determina propiedad y conflictos de envío. CCD mantiene
su comprobación de contexto. Artefactos se abren por UUID vía Bearer, nunca por v1
o URL externa de una cita.

## Reproducción y límites de las pruebas

Crear entorno nuevo exclusivo con
`pwsh -NoProfile -File infra/auth-p4l0-test-environment.ps1 -Action Create`.
Desde backend/api: `npm run test:auth:p4l0:setup` y
`npm run test:auth:p4l0:integration`. Solo puerto55439, base
banuchat_auth_p4l0_test, red/volumen propios, sin mounts del host; aplica las
migraciones sin modificarlas y dos releases fixture-only, sin Ollama/embeddings.
Repetir integración exige entorno vacío, no reutilizar sus UIDs.

Al cerrar, retirar únicamente ese entorno con `-Action Remove`: comprueba
IDs/etiquetas/mounts antes de quitar sus objetos y credenciales generadas. No es un
procedimiento de despliegue/migración de demo o CCD. No retirar una base operativa
por copiar este procedimiento de laboratorio.

Tests Mobile: `npm run typecheck`, `npm run lint -- --no-cache`,
`npm run test:local`. API: typecheck/build/npm test, más integración anterior.
API no tiene lint configurado; no se añade un framework para simular ese check.
El bundle Android Hermes es compilación local, **no APK instalado ni prueba física**.
Quedan pendientes Android/iOS: UI/teclado/navegación, persistencia SecureStore real,
reinicio/refresh/logout, limpieza de vistas y todas las pruebas de aceptación de
Sala en un dispositivo compatible por canal seguro. No se declara Mobile
autenticado completamente validado hasta acreditarlas.
