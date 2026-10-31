# BanuChat — demostración local reproducible en Android

Procedimiento vigente para el computador de desarrollo ya preparado, 29/10/2026.
Sustituye la secuencia de dos carriles descrita en versiones anteriores de este
archivo. No aprovisiona un computador nuevo ni publica servicios institucionales.
La [validación física acreditada](../../eval/mobile/results/android-mvp-ccd14-validation.md)
se reutiliza: seguir este guion en una sustentación es una demostración, no otra
medición OE1, SUS o evaluación ciega.

## 1. Preparación e inventario

Usar la misma cuenta Windows del operador, sus configuraciones privadas y el
Android previamente autorizado. Tener dependencias locales instaladas, Docker
Desktop, Ollama, Android platform-tools y el development build existente. No
instalar otro Expo Go: el instalado 58 no sustituye al build compatible con SDK 57.

Desde la raíz del repositorio, en PowerShell:

```powershell
git rev-parse HEAD
git status --short
node scripts/demo-preflight.mjs --report
```

El preflight utiliza el runtime local existente de API; no instala dependencias.
Reutiliza validadores de API, Expo, modelos y configuración de embeddings. Verifica
Unified, current/manifest por SQL READ ONLY y versiones/digests en Ollama mediante
metadatos, sin embeddings ni generación. Antes de iniciar, acepta puertos libres;
si están ocupados exige la respuesta esperada y enlace loopback. No inicia Docker,
Ollama, API, Metro ni el daemon ADB. Solo `--report` escribe un informe nuevo en
`data/ccd/local/delivery/entrega-01/`, ignorado por Git.

Prerrequisitos privados: `infra/local/unified/application.json`,
`infra/local/oe6/n8n-conversation.env` y custodia DPAPI de las cuentas ficticias en
`infra/local/auth-i1b/operator-accounts.dpapi`. No imprimir esos archivos ni copiarlos
al paquete público. Un checkout público sin ellos no reproduce la demo CCD.

## 2. Servicios existentes

Destino único de esta demostración:

| Dependencia | Identidad esperada |
| --- | --- |
| PostgreSQL | `banuchat-unified-postgres`, base `banuchat_unified`, loopback 55463 |
| Volumen | `banuchat-unified-data`; preservar datos y mount existentes |
| Current CCD | `10af4ffd-effb-41fc-bbfe-4dc48cb3398f`, schema `ccd-1.4.0`, `ready` |
| Manifest | `fde23cabe95c83f5bd632d129312ad68c90624e6ebd489e79e98c6a3d0d96852` |
| Ollama | Loopback 11434; versión/digests coincidentes con configuración privada y release |
| Modelos | `qwen3-embedding:0.6b` (1024D/coseno) y `qwen3:4b-instruct` |
| API / Metro | `127.0.0.1:3004` / `127.0.0.1:8084` |

Si PostgreSQL está detenido, inspeccionar únicamente campos no secretos:

```powershell
docker inspect --format '{{.Name}} {{.State.Status}}' banuchat-unified-postgres
docker inspect --format '{{range .Mounts}}{{println .Type .Name .Destination}}{{end}}' banuchat-unified-postgres
docker volume inspect --format '{{.Name}}' banuchat-unified-data
```

Solo si coinciden contenedor y volumen existentes y se decide iniciar la demo:
`docker start banuchat-unified-postgres`. Si no existen, detenerse; no crear,
restaurar o sustituir bases/volúmenes. No usar Compose `up` como reparación,
migraciones, aprovisionadores, `down -v` o `prune`.

Si Ollama está detenido, abrir la instalación local existente; `ollama serve`
solo en una terminal dedicada cuando 11434 esté libre. No ejecutar `pull` ni
cambiar modelos para hacer pasar el preflight. Si una versión o digest difiere,
registrarlo y conservar el entorno, sin descargar ni ajustar durante la demo.

N8N 15679 es necesario para las solicitudes multifuente que lo utilizan, no para
el recorrido documental acotado de este guion. El chequeo TCP es informativo y no
acredita un webhook publicado. En ENTREGA-01 ese puerto no estaba disponible;
se reutiliza la evidencia anterior para explicar esa rama. No se inicia N8N ni se
republican workflows automáticamente. No presentar una consulta multifuente como
operativa si no se ha comprobado su servicio, credencial y workflow existentes.

## 3. API actual y puertos

Si 3004 está libre, desde otra terminal:

```powershell
Set-Location backend/api
npm start
```

Este comando reutiliza `scripts/start-unified.mts` y la configuración privada.
El mensaje esperado indica REST v2 exclusivamente en loopback. Si la API ya está
activa y se conoce la terminal/versión que la inició, reutilizarla. Un 401 correcto
no prueba por sí solo el commit cargado ni el corpus de una cuenta. Ante puerto
ocupado por proceso desconocido o respuesta incorrecta, detenerse y registrar el
conflicto; no terminar procesos ajenos ni abrir otra API/laboratorio para ocultarlo.
El comando histórico `npm run ops:ccd` apunta a otro entorno y no es este preflight.

## 4. Android y Metro

El teléfono debe estar desbloqueado, autorizado previamente y conectado por USB.
Usar `adb` del PATH o el ejecutable existente
`$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe`. En una terminal privada:

```powershell
adb devices -l
adb reverse tcp:3004 tcp:3004
adb reverse tcp:8084 tcp:8084
```

Debe haber exactamente un dispositivo autorizado (`device`); no publicar su serial.
Si hay varios, seleccionar explícitamente el autorizado con `-s` y no continuar
con una selección automática. Si aparece `unauthorized`, `offline` o ninguno,
no declarar validación física. El preflight `--adb` no inicia el daemon si falta;
el inventario anterior es una acción explícita del operador.

Si 8084 está libre, desde otra terminal:

```powershell
Set-Location mobile
./scripts/start-ccd-auth.ps1
```

El script configura únicamente su proceso: `ccd_authenticated`, API v2 local,
canal `adb_reverse`, Expo SDK 57 y telemetría desactivada. Usa el build existente
y localhost IPv4. No cambiar a `--lan`, `--tunnel` ni generar `android/` o `ios/`.
Si Metro ya escucha, confirmar que pertenece a este proyecto/configuración;
`/status` no acredita por sí solo su entorno efectivo. El script rechaza otro
listener en 8084 y no lo mata.

Abrir en el build instalado el proyecto
`exp+banuchat://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8084`, o usar
su pantalla de proyectos locales. No reinstalar APKs ni sustituirlo por Web.
Desde la raíz, comprobar el conjunto:

```powershell
node scripts/demo-preflight.mjs --running --adb --report
```

Resultado esperado: `DEPENDENCY_CHECKS_PASSED`; código de salida 0. Un fallo produce
`NOT_READY` y salida 1. Revisar también el estado informativo de N8N y el número de
archivos Git modificados: no certifica versión cargada, identidad civil del dueño,
login válido ni corrección semántica. No repite el recorrido físico acreditado.

## 5. Cuenta ficticia y recorrido

PRODUCT-OE2-MOBILE-04: con la configuración privada opcional y el contenedor
fixture existente ya verificados, Home → Publicaciones OE2 permite consultar
programación de grupos, convocatorias y novedades ficticias. Revisar sus filtros,
fechas civiles, release y origen, sin confundirlos con catálogo, anuncios habituales
o documentos CCD. Si la fuente no está disponible, usar reintento manual cuando
se restablezca; no publicar otras releases ni ejecutar el scheduler para reparar
una lectura. La API conserva sus demás funciones. La sección usa el mismo build
SDK 57, Metro y reverses descritos arriba; no necesita otra instalación Android.

Usar una cuenta técnica ya existente por el procedimiento privado del operador,
sin cuentas UNAB, registro público ni creación/reset de contraseñas. Si el operador
necesita consultar la custodia DPAPI, exclusivamente en su terminal privada desde
`backend/api`: `node --import tsx test/auth-i1b-operator.mts accounts`. Ese comando
muestra secretos deliberadamente: no grabar ni adjuntar su salida; el preflight
nunca lo ejecuta. DPAPI depende del usuario/equipo que preparó la custodia.

Seguir el [guion breve](../academic/entrega-01-demonstration-script.md): login →
Home → chat → consulta documental → cita → documento → seguimiento → historial →
logout. Usar la documentación seleccionada, conservar periodo/población y distinguir
auxiliares ficticios de expedientes reales. Una respuesta con cita no demuestra
por sí sola suficiencia o corrección; mostrar también una abstención legítima.

Si un POST termina de forma incierta, no reenviarlo automáticamente: comprobar
historial antes de otra acción. Un 409 requiere atender el conflicto y abrir otro
chat solo por acción explícita, sin trasladar mensajes. No cambiar current para
probarlo. Un error de servicio no se resuelve modificando corpus, modelos o guardias.

## 6. Cierre y diagnóstico

Cerrar sesión y verificar que el historial protegido vuelve al acceso. Conservar
solo evidencia depurada en rutas privadas ignoradas. Borrar únicamente chats propios
si se decide limpiar la demostración; no cuentas ni historiales ajenos.

Si se desea terminar la ventana, cerrar con Ctrl+C solo las terminales API/Metro
iniciadas para ella. Retirar únicamente los reverses agregados en esa ventana:
`adb reverse --remove tcp:3004` y `adb reverse --remove tcp:8084`; no `--remove-all`.
No detener servicios compartidos ni borrar datos. En ENTREGA-01 los listeners ya
existían y se preservaron; no se repitió Android.

| Diagnóstico | Acción dentro del alcance |
| --- | --- |
| Archivo privado o dependencia ausente | Usar el entorno preparado del operador; no inventar secretos ni sustituir CCD por la demo |
| SQL sin privilegio de lectura | Registrar bloqueo; no otorgar permisos ni usar un rol superior para forzar el chequeo |
| Release/manifest distintos | Detener demo CCD 1.4.0; no cambiar current ni publicar otra release |
| Modelo/versión incorrectos | Conservar configuración y registrar divergencia; sin tuning o descargas automáticas |
| Puerto ocupado no reconocido | Preservar proceso y resolver su identidad antes de continuar |
| Android no disponible/build ausente | Mantener evidencia histórica con fecha; no simular otra validación física |
| N8N no disponible | Limitar demo a documentos/servicios directos; no afirmar rama multifuente comprobada hoy |
