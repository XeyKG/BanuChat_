# BanuChat — operación local AUTH-P4-L1

Base: `1f208162418e6e73e0c498d356a873bdb78366ba`, BCH-D34. Este procedimiento
valida la implementación aceptada, sin cambiar contratos. Correo SUSPENDIDO.

## Destino y custodia

- Contenedor `banuchat-auth-p4l1-demo`, PostgreSQL16/pgvector, puerto
  `127.0.0.1:55440`, base `banuchat_auth_p4l1_demo`.
- Red `banuchat-auth-p4l1-demo-isolated`, masquerade desactivado, volumen
  `banuchat-auth-p4l1-demo-data`; sin montajes de directorios del host.
- Copia del schema/corpus `banuchat` de la demo, excluyendo los datos de
  conversaciones, mensajes y citas. No incluye autenticación previa ni CCD.
  Conserva IDs, manifiestos, current, publicaciones y embeddings. No hay ingesta.
- 006–008 aplicadas sin edición únicamente al destino nuevo. Roles separados
  `auth_p4l1_migrator`, `auth_p4l1_runtime`, `auth_p4l1_provisioner`;
  executor NOLOGIN creado por007. El migrador no ejecuta la API ni activa cuentas.
- ACL limitadas reutilizadas de la preparación aceptada P4-L0. El guard real de
  PgAuthStore verifica ausencia de DDL, propiedad, membresías, acceso a otras bases
  y escritura de corpus para runtime. Provisioner no tiene acceso a credenciales.
- Configuración técnica nueva en `infra/local/auth-p4l1/deployment.json`, ignorada
  por Git y ACL Windows limitada al principal local que la creó. Incluye secretos
  independientes y rateKey estable. No son claves recicladas del harness P4-L0.
  Es un archivo privado con control de acceso, **no una bóveda cifrada**. No copiar,
  sincronizar, publicar ni adjuntar su contenido. La custodia operativa definitiva
  y el respaldo seguro requieren decisión del equipo.
- Los helpers bajo `infra/local/auth-p4l1` son artefactos locales ignorados de esta
  ejecución, no un instalador de producto. No repetir `prepare.mjs` o `resume.mjs`:
  el destino ya existe. No ejecutar el cleanup P4-L0 sobre estos recursos.

La instancia es un entorno de validación, no el destino definitivo del producto.
Solo contiene dos nuevas cuentas ficticias; no reutilizar automáticamente sus
credenciales como cuentas operativas. Conservar el volumen para revisión; retirarlo
requiere comprobar identidad, autorización y ausencia de información a preservar.
No modificar ni retirar las bases históricas en5432/55433.

## Arranque y canal comprobado

SDK instalado fuera de PATH: usar el ejecutable absoluto de platform-tools del
Android SDK del usuario. No modificar PATH global. `adb devices -l` debe mostrar
un dispositivo físico autorizado; nunca persistir su serial.

```powershell
adb reverse tcp:3002 tcp:3002
adb reverse tcp:8081 tcp:8081
```

En esta ejecución el ADB37.0.0 necesitó permiso para iniciar su daemon local5037.
La primera imposibilidad de iniciar el daemon en sandbox no probaba falta de SDK
o teléfono. Se comprobó Android14/API34 y Expo Go57.0.9 instalado. No se instaló
otra aplicación ni se generaron proyectos nativos.

La API se inicia mediante el entrypoint autenticado de P4-L0, con configuración
privada explícita del destino y listener fijo `127.0.0.1:3002`. Usa metadata real
consultada a Ollama local, sin cambiar modelos/recetas. RecoveryService no se
compone. No ejecutar main.ts/v1 ni CCD contra esta base.

Metro usa únicamente estas variables públicas de proceso:

```dotenv
EXPO_NO_DOTENV=1
EXPO_PUBLIC_DEMO_MODE=synthetic
EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:3002/api/v2
EXPO_PUBLIC_AUTH_LOCAL_CHANNEL=adb_reverse
```

Desde mobile, arranque equivalente:

```powershell
node --dns-result-order=ipv4first node_modules/expo/bin/cli start --localhost --port 8081
```

El flag DNS resuelve un problema observado: localhost se enlazaba únicamente a
`::1`, mientras la prueba requería IPv4 loopback. No se editó node_modules ni código
de producto. Verificar los listeners y el manifiesto Android: launchAsset/hostUri
deben apuntar a `127.0.0.1:8081`. Abrir `exp://127.0.0.1:8081` en Expo Go por USB.
No utilizar LAN HTTP, túneles públicos, Expo Web o bypass TLS.

## Cuentas y procedimiento privado

Contrato actual: UID `BCH-DEMO-` seguido de cuatro dígitos; un solo UID por prompt.
Contraseña nueva de15–128 caracteres Unicode, no una repetición de un único carácter
ni un valor prohibido por la política vigente. Confirmar exactamente dos veces.
UID, nombre y alias académico son conceptos distintos.

Procedimiento definitivo: desde backend/api, `npm run admin:local-account`, con
las variables BANUCHAT_ADMIN_ del runbook P4-L0 y entrada TTY sin eco. No introducir
contraseñas por este chat, args, archivos o herramientas con transcripción.

En L1 se observaron rechazos de UID inválido y otro rechazo genérico después de
confirmación; no inferir la causa de este último. Las lecturas posteriores
confirmaron cero cuentas, credenciales o eventos de aprovisionamiento.

El operador autorizó después creación automatizada de las dos cuentas de prueba.
Un helper local con TTY reutilizó SyntheticAccountProvisioner y
LocalPasswordAdministrator, con roles separados y contraseñas aleatorias distintas
de24 caracteres generadas en memoria. Mostró sus valores **solo en una ventana
privada no capturada por Codex**. No los guardó ni los transmitió como argumentos.
Este camino demuestra los servicios administrativos reales, pero no sustituye una
activación exitosa mediante el prompt definitivo de admin:local-account.

Cuentas: BCH-DEMO-9101 / Alba Ficticia y BCH-DEMO-9102 / Bruno Ficticio; ambas
vinculadas a profile-001. Correo histórico reservado banuchat.test, sin contactos
reales, verificación o envío. El helper no reemplaza cuentas existentes al repetirlo.
Cerrar la ventana privada tras usarla; no copiar su salida al chat o evidencia.
No se promete borrado físico de strings, scrollback o memoria de la plataforma.

## Registro manual sin secretos

Registrar resultado y capa de evidencia por separado:

1. Login/perfil; crear chat y turno; historial, progreso, calendario y anuncios.
2. Cita documental y apertura protegida. Un saludo por fast path no prueba Ollama.
3. Cerrar completamente Expo Go y reabrir: restauración sin contraseña y evento
   refresh real, con validación me antes de mostrar recursos.
4. Logout: pantalla login y revocación SQL; reabrir sin restaurar la cuenta cerrada.
5. Login de la segunda cuenta, historial vacío y ausencia de vistas de la primera.
6. Intento de abrir por UUID una conversación ajena: debe quedar inaccesible.
7. Password incorrecta/sesión revocada; ausencia de registro/recuperación en UI.
8. Renovación/expiración y errores reales del almacén nativo. Las pruebas con dobles
   no acreditan estos fallos en Android; no añadir bypass o alterar TTL para probar.

Solo el refresh se persiste mediante SecureStore; access en memoria. La revisión de
código acredita la intención de almacenamiento, no una inspección forense del
teléfono. No volcar SecureStore, memoria, logcat general ni capturas con secretos.
Los observadores SQL de esta ejecución consultan estados, conteos y eventos; no
extraen tokens, hashes completos, contactos ni contraseñas. iOS se evalúa aparte.

## Cambio solicitado durante la sesión

El operador solicitó UID de estilo `U`+ocho dígitos, una contraseña corta compartida
y correo ficticio bajo el dominio universitario real. No se copiaron sus ejemplos
privados. Son cambios del contrato congelado, no defectos de ejecución de L1.
El delta y la decisión pendiente se consignan en el checkpoint. Hasta autorización
expresa, conservar el contrato actual y no intentar eludir sus validaciones.
