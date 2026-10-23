# CHECKPOINT BANUCHAT — CCD-AUTH-I1B / diagnóstico HTTP Android

Fecha: 2026-10-23. Base limpia al inicio:
`37dfc1c0ac912673eb589803e5d7f01eed18abf8`. Alcance autorizado: observar rechazos
del POST de mensajes autenticado. Sin commit/push ni avance a I1C.

## Resultado y límite de evidencia

Se añadió observabilidad local de desarrollo que permite distinguir, entre otros,
`500 / INTERNAL_ERROR` y `503 / DEPENDENCY_UNAVAILABLE`, sin cambiar la semántica
del chat. **No se reprodujo ni se determinó la causa del fallo Android.** Las
observaciones de onboarding/login/fuentes, historial vacío y generación aislada
fueron aportadas por el operador; no son pruebas Android realizadas por el agente.
Que API/Ollama acepten conexiones o una generación aislada termine no identifica
el rechazo del POST afectado.

Se inspeccionaron `mobile/src/api/messages.ts`, `mobile/src/app/chat.tsx`, el
transporte/autenticación y el contrato REST v2 4.0.0. `sendMessage` conserva 201
como éxito, 409 como `conflict`, otros HTTP como `http` y excepciones de transporte
como timeout/red. Chat conserva reconciliación manual de resultados inciertos y
no repite POST automáticamente. Estos dos archivos no necesitaron modificaciones.

La observación se coloca en `AuthSession.resource`, después de recibir la respuesta
y verificar la época de sesión, **antes de consumir un 401**. Se limita a POST de
mensajes; login, refresh, logout, historial y documentos no se instrumentan.
El 401 sigue invalidando sesión/almacenamiento y lanzando el mismo error previo.
El diagnóstico permite observarlo aunque `sendMessage` siga clasificando esa
excepción del transporte autenticado como `network`; no se corrigió esa semántica.

## Activación exacta en PowerShell

Primero detener **solo Metro** con Ctrl+C en su terminal actual. Conservar API en
3003, PostgreSQL y Ollama. No iniciar un segundo Metro sobre 8084 ni terminar otros
procesos para liberar el puerto. En esa misma PowerShell ejecutar personalmente:

```powershell
Set-Location 'C:\Users\samue\OneDrive\Documentos\BanuProject\BanuChat_\mobile'
$env:EXPO_PUBLIC_BANUCHAT_DIAGNOSTIC_HTTP = '1'
$env:EXPO_PUBLIC_DEMO_MODE = 'ccd_authenticated'
$env:EXPO_PUBLIC_API_BASE_URL = 'http://127.0.0.1:3003/api/v2'
$env:EXPO_PUBLIC_AUTH_LOCAL_CHANNEL = 'adb_reverse'
$env:EXPO_NO_TELEMETRY = '1'
adb reverse tcp:3003 tcp:3003
adb reverse tcp:8084 tcp:8084
npx expo start --localhost --port 8084 --clear
```

Si hay varios dispositivos autorizados, añadir `-s <serial>` a los dos comandos
ADB; no incluir el serial en el informe. Abrir/recargar personalmente Expo Go en
`exp://127.0.0.1:8084` para obtener el bundle con el flag. Estos comandos se
documentan; **el agente no los ejecutó ni inició Metro o Android**. No modifican
`.env.local`, endpoints, tiempos de espera, configuración de servidor o bind LAN.

La salida es `console.info`, etiqueta **`[BanuChat message HTTP]`**. Buscarla en los
logs JavaScript de desarrollo. Si no se retransmite a la terminal Metro, con la app
conectada pulsar **j** en Metro para abrir React Native DevTools y revisar **Console**
con el nivel Info visible. El CLI instalado implementa esa tecla como apertura del
inspector; su conexión/visualización en este dispositivo sigue a cargo del operador.
No abrir Network ni copiar logs generales que puedan contener datos ajenos a este
diagnóstico. Ausencia de registro no demuestra éxito HTTP ni una causa de servidor.

Para desactivar tras la captura: Ctrl+C en Metro y luego, en la misma PowerShell:

```powershell
Remove-Item Env:\EXPO_PUBLIC_BANUCHAT_DIAGNOSTIC_HTTP -ErrorAction SilentlyContinue
npx expo start --localhost --port 8084 --clear
```

Recargar Expo Go. El flag no es un secreto; solo el valor exacto `1` habilita el
diagnóstico y además se exige `__DEV__ === true`. Por defecto, en producción, con
`0`, `true`, espacios o ausencia del flag no hay registro ni lectura adicional del
cuerpo. No se añadió persistencia del flag o de registros en la app.

## Registro permitido y ejemplo ilustrativo

Cada respuesta distinta de 201 produce inmediatamente un registro con:

- `http_status`: estado real recibido, sin inferirlo desde la UI.
- `duration_ms`: milisegundos aproximados entre la llamada de red autorizada y
  recibir su Response; excluye refresh previo y la lectura adicional de metadatos.

Después puede aparecer **un segundo registro del mismo rechazo**, con el mismo
HTTP/duración y `error_code` y/o `request_id`. No es otro POST. Se lee una copia de
la respuesta en segundo plano, sin await en el flujo funcional; un cuerpo inválido,
ausente, imposible de clonar o demorado no impide observar el HTTP ni retrasa el
error de la UI. Solo se acepta `error.code` perteneciente al enum vigente REST v2 y
`error.request_id` con longitud/formato UUID canónico. Valores desconocidos o
malformados se omiten; nunca se registran mensajes de error o excepciones de parseo.

Ejemplo **ficticio**, no resultado Android:

```text
[BanuChat message HTTP] { http_status: 503, duration_ms: 8123 }
[BanuChat message HTTP] { http_status: 503, duration_ms: 8123, error_code: "DEPENDENCY_UNAVAILABLE", request_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" }
```

La función de registro no recibe URL, UID, identificador de conversación, pregunta,
credenciales o cabeceras de la solicitud. Construye un objeto nuevo con solo los
cuatro campos permitidos; no imprime cuerpos completos, documentos, mensajes,
tokens, Authorization, cookies o stacks. `request_id` es correlación de error
expresamente autorizada, no un identificador de conversación. Una consola que lance
una excepción tampoco cambia el rechazo del POST.

## Qué conserva y qué no demuestra

409 mantiene el bloqueo/conflicto previo; otros estados mantienen error HTTP.
Timeout conserva **90 000 ms**, errores de red siguen como inciertos, y no se
inventan estados HTTP cuando no se recibió Response. Un 201 inválido conserva
`invalid_response`, sin log de rechazo HTTP. No se reenvía POST ni se consume el
cuerpo original; no se cambian UI, mensajes/citas, auth/refresh/logout, endpoints,
contrato, permisos, SQL, corpus, prompts, modelos o generación.

Con el flag activo hay coste adicional de clonar/interpretar el pequeño cuerpo de
error y escribir hasta dos registros de consola. La correlación es visible en la
consola de desarrollo; desactivar tras obtenerla. Si el cuerpo no termina o no es
JSON, puede faltar código/request_id, pero el HTTP ya queda registrado. La protección
descrita corresponde a este logger, no certifica todos los logs del entorno Expo.
El modo `ccd_local`/v1 histórico no pasa por este transporte autenticado y no se
instrumentó.

## Archivos modificados y pruebas reales

| Archivo | Cambio |
| --- | --- |
| `mobile/src/api/message-http-diagnostic.ts` | Nuevo logger condicionado por desarrollo + flag, campos permitidos y parseo aislado |
| `mobile/src/auth/auth-session.ts` | Cuatro líneas de instrumentación del POST de mensajes; mantiene guards y comportamiento de sesión |
| `mobile/test/message-http-diagnostic.test.ts` | Quince pruebas nuevas del cliente autenticado y logger con dobles de fetch |
| `docs/transition/bch05-ccd-auth-i1b-http-diagnostic-checkpoint.md` | Este checkpoint, comandos y procedimiento de captura |

Ejecutado desde `mobile`:

| Comando | Resultado |
| --- | --- |
| `npm run typecheck` | Aprobado, sin errores |
| `npm run lint` | Aprobado, sin errores/advertencias reportados |
| `npm run test:local` | **35/35**, veinte regresiones existentes + quince nuevas |

Cobertura nueva: 400, 429, 500, 503 y 409 con código/correlación y un único POST;
inactividad por defecto/producción/flags incorrectos; campos hostiles/sensibles,
HTML o JSON inválido y fallo de clone; metadatos opcionales independientes y cuerpo
original intacto; respuesta lenta de metadatos sin bloquear error; 401 con limpieza
de sesión; red y timeout sin estado inventado/retry; 201 válido/inválido, recursos
ajenos al diagnóstico y consola fallida. Duración comprobada con reloj controlado.

La primera ejecución tuvo una incompatibilidad de tipos entre los contextos del
hook `beforeEach`; se corrigió usando hooks de restauración independientes. Después
pasaron typecheck y la batería completa. No se declara aquel typecheck fallido como
aprobado. No se ejecutaron DB, Ollama, E2E, Android, ADB o cambios de infraestructura.
`git diff --check` y comprobación de alcance forman parte del cierre; sin cambios
backend, contratos, datos o archivos de configuración locales.

## Próxima reproducción: operador

Con el diagnóstico visible, enviar personalmente **una vez** la pregunta que falló.
Registrar únicamente HTTP, código, request_id y duración, más si el historial muestra
un turno confirmado o permanece vacío. Ante resultado incierto consultar historial,
sin reenvío automático. Capturar solo las líneas con la etiqueta del logger, sin
pantallazos de credenciales o paneles de solicitudes.

| Campo | Registro del operador |
| --- | --- |
| HTTP / error_code / request_id / duration_ms | Pendiente de reproducción personal |
| Historial tras reconciliación manual | Pendiente |

Un 500 y un 503 habilitan investigaciones distintas, pero ninguno identifica por sí
solo la causa raíz. Detenerse tras la captura y volver con esa evidencia; no ajustar
generación, corpus, permisos o tiempos para ocultar el fallo. **Android no validado
por el agente; causa todavía no demostrada.**
