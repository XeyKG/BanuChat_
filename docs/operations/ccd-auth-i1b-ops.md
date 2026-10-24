# BCH-05 / CCD-AUTH-I1B-OPS — Reproducibilidad y aislamiento

Preflight de diagnóstico local, sin arranque/reinicio de servicios, bootstrap,
migraciones, ingesta, cambios de puertos o configuración de dispositivos.
Reutiliza el entorno privado I1B y el launcher Mobile existentes. No reemplaza
el runbook histórico ni acredita una validación física Android.

## Comando reproducible

En PowerShell del usuario Windows que custodia la configuración del laboratorio:

```powershell
Set-Location 'C:\Users\samue\OneDrive\Documentos\BanuProject\BanuChat_'
npm --prefix .\backend\api run ops:ccd -- --adb --report
```

`--adb` autoriza solo `devices` y `adb -s <destino> reverse --list`. Omítelo para
no consultar dispositivos. Si el servidor ADB no está disponible en loopback
5037, el script no ejecuta `start-server` ni invoca el cliente. Busca ADB en PATH
y, si falta, en `%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe`.
No muestra ni guarda seriales; `adb_device_1` es un índice temporal de esa corrida,
no una identidad estable ni una afirmación de cuál de los dos teléfonos es.

`--report` escribe un JSON nuevo con timestamp en `eval/auth/results/`; omitirlo
deja solo stdout. La lectura de servicios es de diagnóstico; escribir el informe
es su única escritura de archivo intencional. No imprime configuraciones privadas,
tokens, passwords, cuerpos HTTP, documentos o variables de entorno completas.
Los destinos de red están fijados a loopback; no consulta una API institucional.

Salida del proceso Node: 0 sin FAIL/NOT_EVALUABLE; 2 si hay FAIL; 3 si algo no puede
evaluarse y no hay FAIL. `NOT_EXECUTED` se declara separadamente: incluso un 0 no
acredita Android. npm puede presentar genéricamente el fallo del comando; para
consultar el código directamente:

```powershell
node --import .\backend\api\node_modules\tsx\dist\loader.mjs .\backend\api\test\auth-i1b-ops-preflight.mts --adb --report
$LASTEXITCODE
```

El comando registra HEAD y árbol sucio. Un árbol sucio devuelve FAIL de preparación
para revisión; no borra ni restaura archivos. Durante desarrollo es esperado que
los cambios nuevos pendientes provoquen ese resultado. El informe registra el
estado anterior a su propia escritura.

## Interpretación y acciones del operador

| Comprobación | Alcance del resultado |
| --- | --- |
| Git/raíz/dependencias/Expo | Raíz resuelta desde el script, HEAD, modificaciones, paquetes locales y Expo declarado/instalado 57 |
| API 3003 | Challenge 401 del contrato v2 y bind exclusivamente loopback; no acredita revisión ni modo cargados |
| PostgreSQL 55443 | Contenedor, ID, label, volumen/red exclusivos, bind, rol runtime, deployment y scope CCD; conexión en solo lectura |
| Release/Ollama | Configuración de embedding ready/1024/coseno, versión Ollama, digest/capacidad de ambos modelos |
| Mobile/Metro | Launcher existente y `/status` en 8084; variables de esta shell separadas de la configuración efectiva del Metro ya iniciado |
| ADB | Ambas rutas por cada destino autorizado, sin tocar reglas |
| Android | NOT_EXECUTED: no observa login, SecureStore, UI o aislamiento físico |

Si el contenedor esperado está detenido, el preflight devuelve
`FAIL / EXPECTED_LAB_CONTAINER_STOPPED` antes de intentar PostgreSQL. Esto no
lo arranca ni acredita la integridad actual de la base: esa comprobación queda
pendiente hasta que el operador prepare el laboratorio existente.

No interpretar un 401 como prueba de que la API cargó el último código. Si el
operador necesita acreditar el arranque actual, detener **solo su propia terminal
API** con Ctrl+C y usar el entrypoint existente; no matar procesos por puerto:

```powershell
Set-Location 'C:\Users\samue\OneDrive\Documentos\BanuProject\BanuChat_\backend\api'
node --import tsx test/auth-i1b-operator.mts api
```

Esta entrega no cambió el runtime del chat; no exige reiniciarlo para aplicar OPS.
Metro puede mantenerse. Si se necesita arrancarlo, usar el launcher existente desde
la raíz, que conserva SDK 57 y la configuración pública de CCD:

```powershell
.\mobile\scripts\start-ccd-auth.ps1
```

No ejecutar setups I1B/F1: algunos no son idempotentes. No arrancar una API v1 ni
apuntar a 55433/5432/55444 para resolver un FAIL de este preflight.

### Rutas del teléfono escogido personalmente

La consulta durante el desarrollo encontró un destino autorizado sin las dos rutas necesarias.
No se identificó físicamente como primer o segundo teléfono y no se alteró.
En el cierre reanudado ADB no estaba iniciado: no hubo una nueva consulta de
dispositivos ni de rutas. La observación anterior no acredita su estado actual.
El operador debe identificar el destino propio en una terminal privada, sin copiar
seriales al informe. Si el dispositivo exige autorización/desbloqueo, resolverlo
personalmente; el script no intenta superar esa interacción.

```powershell
$adbCcd = Join-Path $env:LOCALAPPDATA 'Android\Sdk\platform-tools\adb.exe'
& $adbCcd devices
$ccdDevice = Read-Host 'Serial del teléfono propio elegido (solo en esta terminal privada)'
& $adbCcd -s $ccdDevice reverse tcp:3003 tcp:3003
& $adbCcd -s $ccdDevice reverse tcp:8084 tcp:8084
```

No usar `--remove-all`, LAN, túneles ni cambios en otro teléfono. Abrir personalmente
Expo Go en `exp://127.0.0.1:8084`. No instalar/actualizar Expo Go ni limpiar datos.

## Prueba física pendiente de propiedad y restauración

El operador ya informó login A, chat/cita DOC-101, historial, referencias,
correcciones de tema y logout correctos en su primer Android. Son observaciones
del operador, no nuevas ejecuciones del agente. **Aislamiento físico A/B pendiente.**

1. Tras logout A, entrar con B usando las credenciales privadas ya custodiadas.
   Comprobar que Historial no muestra el chat personal creado por A.
2. Crear un chat de ensayo propio de B; abrir fuente y volver. Cerrar/reabrir la
   app sin borrar datos: comprobar que la sesión restaurada y el historial son B.
3. Logout B; comprobar pantalla de login. Volver con A y comprobar que no aparece
   el chat nuevo de B y que persiste el chat personal de A.
4. En el segundo teléfono propio, repetir solo si está disponible y autorizado.
   Registrar modelo/plataforma sin serial. No confundir dos sesiones legítimas
   de la misma cuenta con cuentas diferentes.
5. Ante resultado incierto, consultar historial antes de cualquier nuevo envío;
   no repetir POST automáticamente. Guardar solo evidencia depurada.

Una prueba con vault/HTTP dobles no valida SecureStore nativo. Una comprobación
REST de artefactos protegidos no demuestra que el visor se limpie físicamente al
cerrar sesión; esa observación queda en el guion del operador.

## Herramientas de ensayo, separadas del preflight

`test/auth-i1b-ops-isolation.mts` es una **prueba con escrituras**, no parte de
`ops:ccd`. Reutiliza exclusivamente las fixtures F1 ya existentes (sin provisionar),
crea dos conversaciones vacías nuevas y prueba GET/POST/DELETE ajenos, refresh,
logout y artefactos. Sus sesiones se cierran; los chats de ensayo se conservan.
No opera cuentas/chats del operador, no genera ni envía un mensaje propio.
No repetirlo para diagnosticar un entorno incorrecto; revisar primero su último
informe y las precondiciones. Una solicitud incierta detiene el ensayo sin retry.

Evidencia y matriz completa: [checkpoint de la misión](../transition/bch05-ccd-auth-i1b-mission-checkpoint.md).
