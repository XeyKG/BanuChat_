# CHECKPOINT BANUCHAT — BCH-02 / Reanudación Android

Base aceptada: `449fb0a18244f24b1a2b3a2f71c8d8ae65419ba0`.
Validación local del 21 de octubre de 2026 (America/Bogota; 22 de octubre UTC).

## Resultado y plataforma

Validación funcional ejecutada en **Android físico**, TECNO CL7s, Android 14,
API 34, pantalla 1080 × 2436, un operador. La primera comprobación fue
`adb devices -l`: un teléfono autorizado en estado `device`. No se incluye su
serial en este documento. Expo Go instalado: 57.0.9, versionCode 445. Proyecto:
Expo 57.0.26, CLI 57.0.27, React Native 0.86.3. Compatibilidad acreditada por
apertura nativa, bundle Android y consultas reales; no solo por comparar versiones.

Se usaron la API CCD real, PostgreSQL CCD y Ollama locales. No se ejecutó Expo
Web, emulador ni relay web en esta reanudación. Las seis pruebas automatizadas
locales usan respuestas simuladas; sus resultados no se cuentan como UI Android.

## Conexión USB efectiva

ADB utilizado: `%LOCALAPPDATA%/Android/Sdk/platform-tools/adb.exe`.
Seleccionar explícitamente el único serial autorizado en estos comandos:

```powershell
adb devices -l
adb -s <serial-autorizado> reverse tcp:3001 tcp:3001
adb -s <serial-autorizado> reverse tcp:8081 tcp:8081
adb -s <serial-autorizado> reverse --list
# Terminal API, desde backend/api, con los servicios CCD locales ya disponibles:
node --env-file=../../infra/.env.ccd dist/main.js
# Terminal Metro, desde mobile:
$env:EXPO_PUBLIC_DEMO_MODE='ccd_local'
$env:EXPO_PUBLIC_API_BASE_URL='http://127.0.0.1:3001/api/v1'
$env:EXPO_NO_TELEMETRY='1'
$env:CI='1'
$env:NODE_OPTIONS=($env:NODE_OPTIONS+' --dns-result-order=ipv4first').Trim()
node ./node_modules/expo/bin/cli start --localhost --port 8081
# Abrir el proyecto en Expo Go:
adb -s <serial-autorizado> shell am start -a android.intent.action.VIEW -d exp://127.0.0.1:8081 -p host.exp.exponent
```

El primer arranque falló: Expo Go mostró `Failed to download remote update`.
Metro escuchaba solo en `[::1]:8081`, mientras la redirección necesitaba IPv4.
Reiniciar Metro con `--dns-result-order=ipv4first` resolvió la descarga. Verificado
en Windows: **API 127.0.0.1:3001 y Metro 127.0.0.1:8081**. No se cambió el host
del backend, firewall, Expo, dependencias ni acceso LAN; no se usaron túneles.

En CI no hay watch de archivos. Para probar la corrección fue necesario reiniciar
Metro y reabrir Expo Go. Una recarga dejó temporalmente el launcher o una pantalla
de carga; cerrar solo Expo Go y abrir nuevamente la URI recuperó el proyecto.
No se borraron sus datos. `bundle-proof.json` confirma que el bundle Android
servido tras reiniciar contiene la carga al recuperar foco. Los intentos 49–53
con bundle anterior no se acreditan como validación de la corrección.

## Casos nativos y persistencia

Capturas y jerarquías UI reales: `data/ccd/evidence/bch02-android-resume/` (local,
ignorado por Git). Las consultas se introdujeron mediante sugerencias de UI o
ADB input; salvo las sugerencias, el texto de prueba usa ASCII. Cada envío fue
una acción explícita sobre el botón nativo, sin scripts HTTP que sustituyeran UI.

| Caso ejecutado | Resultado observado | Evidencia PNG/XML |
| --- | --- | --- |
| Inicio CCD y apertura | Aviso de un operador, sin identidad institucional; Home prioriza chat | 07-startup, 08-home, 09-chat-empty |
| Cursos → IA Generativa → temas | Siete syllabus en listado; los dos turnos específicos de IA citan únicamente DOC-101 | 11-courses-sending, 14-ia-result, 15-ia-topics |
| Corrección hacia Marca Personal | Cambia los temas y persiste únicamente DOC-103 | 19-marca-answer |
| Pruebas 202660 → duración | Aproximadamente dos horas; fuente TEST_ORIENTATION y advertencia de vigencia | 20-diagnostics, 21-duration |
| No aprobar | Evidencia insuficiente, sin reglas académicas inventadas ni citas | 22-no-evidence |
| Contacto CCD | Correo documentado, periodo 202660 y vigencia actual no ratificada; una cita M12 | 23-contact, 24-contact-source |
| Fuentes expandibles y visor | Expande IA, abre el artefacto de IA en visor interno, desplaza el texto y vuelve con Atrás | 16-source-expanded, 17-document-open, 18-document-scroll |
| Historial y reapertura | Chat de 18 mensajes disponible; desplazamiento hasta el último turno; no enumera los 27 chats previos | 31-history, 32-history-reopened, 36-history-scroll, 37-history-last-turn |
| Teclado y área visible | Campo multilínea y botón accesibles por encima del teclado; Atrás lo oculta y después vuelve a Historial | 10-keyboard, 33-keyboard-reopened, 34-back-dismiss-keyboard, 35-native-back |
| Conversación nueva y referencia ambigua | Pide identificar curso/prueba/tema; no hereda contexto del otro chat | 38-new-chat, 39-ambiguous |
| Repetición gratuita sin evidencia | Abstención con indicador de evidencia insuficiente y sin citas | 40-free-repeat |
| Error de red y recuperación | Bloquea reenvío; comprobación GET y continuación manual; un solo turno finalmente persistido | 25-network-failure a 29-network-recovered |
| Historial corregido | Volver con Atrás incorpora el nuevo chat y actualiza su contador de 2 a 4 mensajes | 61-fixed-list-one, 63-fixed-history-one, 65-fixed-history-two, 67-fixed-history-count |

La interrupción se provocó retirando **solo** `reverse tcp:3001`; se conservó Metro
y se restauró esa misma redirección. Antes del fallo había 16 mensajes. Tras
restaurar conexión, comprobar el estado y aceptar “Continuar de todos modos”
seguían siendo 16. Esa aceptación habilitó el campo y conservó el borrador sin
enviarlo. Solo al pulsar Enviar se añadieron los dos mensajes del turno. La pregunta
de Interacción Digital aparece una vez en PostgreSQL y el chat termina con 18
mensajes. Esto verifica el fallo de conexión antes de procesar; no acredita el
caso distinto de respuesta perdida después de un POST ya procesado.

Las instantáneas de solo lectura `before.json` y `state-*.json` comparan releases,
manifiestos, versiones, chunks y hashes de embeddings; todo permanece igual.
También comparan todos los mensajes y citas de las **27 conversaciones previas**,
sin diferencias. Se añadieron seis chats de prueba, 30 mensajes y 17 citas entre
los recorridos iniciales, reaperturas para cargar el bundle y retest final; un chat
de retest quedó vacío. No se borraron chats. Cada cita nueva coincide en hash,
locator y release con su fragmento almacenado. `audit.mjs` comprobó además las
citas por respuesta y la ausencia de duplicado; `audit-summary.json` registra los
resultados y SHA-256 de 128 capturas/jerarquías disponibles al cerrar la auditoría.

Ejemplos reales comprobados: temas de IA → `unit:M02:DOC-101`; corrección hacia
Marca → `unit:M02:DOC-103`; duración → `unit:TEST_ORIENTATION`; contacto →
`unit:M12`; reprobación y gratuidad → ninguna cita. Contacto no arrastra advertencia
de syllabus; IA no arrastra la advertencia del contacto.

## Defecto reproducido antes de corregir

En un TECNO CL7s físico, Android 14 / API 34, Expo Go 57.0.9:
Historial → Nueva conversación → enviar dos consultas → Atrás de Android.
La pantalla siguió mostrando solamente el chat anterior de 18 mensajes. Una
segunda observación confirmó la lista obsoleta, mientras PostgreSQL contenía los
dos chats de esta apertura (18 y 4 mensajes). Evidencias locales `41-history-two`
y `42-history-settled` en `data/ccd/evidence/bch02-android-resume/`.

La carga de `mobile/src/app/history.tsx` se ejecutaba solo al montar la pantalla;
Expo Router conserva esa pantalla al navegar al chat. Corrección delimitada:
recargar los GET del historial al recuperar el foco y descartar resultados de
la carga anterior al perderlo. No repetir POST ni enumerar chats de otras aperturas.

Después: nueva apertura con el bundle actualizado, Historial vacío → crear un chat
vacío → Atrás lo incorpora → crear otro y consultar contacto → Atrás muestra ambos
(2 mensajes y sin mensajes) → reabrir, preguntar periodo → Atrás actualiza a 4.
Capturas `63`, `65` y `67` acreditan el cambio en Android. Al recargar, los chats de
la apertura anterior desaparecieron únicamente de la lista volátil y continuaron
persistidos. No se añadió autenticación ni aislamiento por usuario.

## Archivos y comprobaciones

- `mobile/src/app/history.tsx`: `useFocusEffect` para refrescar la lista y cleanup
  para ignorar respuestas de una carga que perdió foco. Conserva el cliente CCD
  limitado a IDs de la apertura y la consulta previa de perfiles sintéticos.
- `docs/transition/bch02-android-resumption-checkpoint.md`: este checkpoint.
- Evidencia y auxiliares de operación en la carpeta local ignorada indicada arriba;
  no forman parte del código Mobile ni introducen dependencias.

Ejecutados desde `mobile`: `npm run typecheck` (PASS),
`npm run lint -- --no-cache` (PASS), `npm run test:local` (6/6 PASS).
Las pruebas locales comprueban URLs locales, alcance volátil CCD, creación validada,
un POST ante 409/red, separación de perfiles CCD/sintéticos y consulta histórica
sintética. Son pruebas automatizadas con fetch simulado, sin render nativo.
El comportamiento del foco se verificó en el teléfono, no mediante un test que
replicara la implementación. No se repitió Expo Web ni la auditoría general.

## Límites y estado final

El cambio quedó validado en este teléfono y esta versión de Expo Go. No acredita
AVD, otras versiones Android, iOS, APK de producción, rotación ni accesibilidad
exhaustiva. Las seis pruebas locales incluyen regresiones del cliente sintético;
su UI nativa no se recorrió en esta sesión. No se provocó 409 real de release antigua
ni se alteraron releases para conseguirlo; la prueba simulada no equivale a esa
validación nativa. Tampoco se inyectaron HTTP 500/404.

Al reabrir el chat largo, la posición inicial quedó en un tramo anterior y fue
necesario desplazar hasta el final; el contenido completo siguió disponible. Se
registra como limitación de comodidad, sin rediseñar el chat en este incremento.
Los controles flotantes de Expo Go y del teléfono aparecen en capturas y pueden
cubrir una pequeña parte del texto; no pertenecen a BanuChat.

El historial sigue compartido en el backend sin autenticación; la lista temporal
solo limita lo que muestra esta apertura. No hay garantía de privacidad por usuario
ni idempotencia durable. Mantener un único operador y servicios locales.

Sin cambios a backend, corpus, releases, embeddings, SQL, datos sintéticos,
contratos o versiones. Sin ingestas, migraciones, operaciones destructivas de
Docker, commit ni push. Al cerrar se detuvieron únicamente API y Metro iniciados
para esta ejecución. No quedaron listeners en 3001/8081. **La retirada de las dos
redirecciones USB no quedó confirmada**: `reverse --remove tcp:3001` y una nueva
consulta `devices -l` quedaron sin respuesta del daemon. Se detuvieron solo esos
clientes ADB y sus shells de esta ejecución. Se conservó el daemon ADB previo,
PostgreSQL, Ollama y todos los chats. El XML temporal propio del teléfono tampoco
se pudo retirar. Cuando ADB vuelva a responder, el operador puede ejecutar
`adb -s <serial-autorizado> reverse --remove tcp:3001` y el equivalente para 8081;
comprobar con `reverse --list`. No usar `reverse --remove-all`. Si continúa bloqueado,
revisar USB/autorización antes de decidir reiniciar el daemon de su entorno.
`listeners-before-stop.json` y `cleanup.json` registran el cierre. `git diff --check`
sin errores; archivos cambiados limitados a los dos indicados. Detenido para revisión
de Sala de Control.
