# BanuChat — demostración integral local vigente

**Advertencia operativa del 19/11/2026:** este es el runbook del laboratorio del 31/10, no la demo cloud. Antes de seguir su instrucción de iniciar n8n, leer la [guía de presentación actual](GUIA-PRESENTACION-BANUCHAT.md): la inspección del contenedor detenido encontró dos temporizadores OE2 de pruebas todavía activos. No arrancarlo hasta resolverlos de forma controlada. Las etiquetas de noticias/recordatorios de este documento también son históricas.

Revisión OE6-DEMO-READINESS-01, 31/10/2026, America/Bogota. Procedimiento para
el computador habitual ya preparado. No instala un entorno nuevo ni acredita
portabilidad, despliegue UNAB o cumplimiento completo de OE6.

## 1. Topología y límites

El producto habitual usa **Mobile SDK 57 → REST v2 Unified, loopback 3004**.
Document RAG consulta el corpus CCD seleccionado; las operaciones estructuradas
usan auxiliares ficticios independientes. La rama multifuente solicita admisión
N8N y ejecuta en la API el Agent adaptativo determinista, limitado a dos tools MCP
stdio. No es un ReAct LLM. OE2 y Banu al día son lecturas separadas: no son fuentes
del RAG, del MCP ni del chat actual.

| Dependencia | Identidad vigente | Necesaria para |
| --- | --- | --- |
| PostgreSQL Unified | 16.15, `banuchat-unified-postgres`, `banuchat_unified`, `127.0.0.1:55463`, volumen `banuchat-unified-data` | Auth, historial, CCD y auxiliares |
| CCD | schema 1.4.0, current `10af4ffd-effb-41fc-bbfe-4dc48cb3398f`, manifest `fde23cabe95c83f5bd632d129312ad68c90624e6ebd489e79e98c6a3d0d96852` | Evidencia documental seleccionada; no aval CCD |
| Auxiliares | current `af157a78-4c51-49c0-b8cc-509257d89f1e` | Progreso, calendario, catálogo y anuncios ficticios |
| Ollama | Loopback 11434, runtime 0.35.0; revisiones fijadas privadamente | `qwen3-embedding:0.6b`, 1024D/coseno, y `qwen3:4b-instruct` |
| N8N | 2.40.5, `banuchat-unified-n8n`, loopback 15679, volumen `banuchat-unified-n8n-data`, workflow publicado `BanuChatOe4Conversation1` | Rama multifuente; no la consulta documental directa |
| MCP | Proceso stdio efímero `backend/mcp-server/src/unified-main.ts`, rol lector existente, seis tools | Se inicia desde el Agent, sin puerto MCP público |
| OE2 opcional | `banuchat-oe6-local-postgres-synthetic-1`, base `postgres`, volumen `banuchat-schema-test_pgvector_data` | Programación, convocatorias, novedades y radar |
| Mobile | Metro 127.0.0.1:8084, Expo 57.0.31 / React Native 0.86.3, build `com.anonymous.banuchat` | Demostración Android mediante USB reverse |

OE2 conserva su red host Linux y el lector Docker/psql local protegido. No se
sustituye por TCP Windows ni se abre un puerto. Current conocido:
`8ed084d9-2d5e-4f90-8011-99912278b27c`; seis ready/18 snapshots. El radar compara
la predecesora por publicación, sin convertir una prueba acelerada en actualización
institucional. Sus contadores actuales pueden verificarse, nunca forzarse publicando.
Node observado: 24.19.0; el launcher exige al menos 22. Versiones observadas en
esta ventana, no una autorización para actualizar las instalaciones existentes.

## 2. Inventario antes de arrancar

Desde la raíz, guardar HEAD, cambios, listeners, procesos/contenedores y reverses
iniciales en una carpeta privada ignorada. No copiar secretos al informe público.

```powershell
git rev-parse HEAD
git status --short
node scripts/demo-preflight.mjs --report
```

Configuración necesaria: `infra/local/unified/application.json`,
`infra/local/oe6/n8n-conversation.env`, custodia Windows DPAPI de cuentas ficticias
y artefactos CCD autorizados existentes. OE2 requiere además el archivo opcional
`infra/local/unified/oe2-reader.json`. Nunca imprimir sus contenidos, contraseñas,
refresh/access tokens o seriales del teléfono en grabaciones o entregables.
La [matriz de reproducibilidad](demo-dependencies.md) distingue Git de estos recursos.

## 3. Arranque seguro, solo cuando un componente está detenido

Orden: PostgreSQL/Ollama → N8N para multifuente → API habitual → Metro → Android.
La fuente OE2 es opcional para el core; el recorrido completo necesita que esté disponible.

1. Inspeccionar nombre, estado, bindings y volumen de cada contenedor existente.
   El preflight no inicia nada. Ante identidad distinta, registrar bloqueo.
2. Si coincide la identidad y estaba detenido, iniciar únicamente ese contenedor:
   `docker start banuchat-unified-postgres`, `docker start banuchat-unified-n8n`
   o, si se requiere OE2, `docker start banuchat-oe6-local-postgres-synthetic-1`.
   Registrar qué inició esta ventana. No usar Compose up/down, migraciones,
   aprovisionadores, publicación, recreación, prune ni borrado de volúmenes.
3. Reutilizar Ollama existente. Si está detenido y 11434 está libre, abrir su
   instalación o `ollama serve` en terminal propia. No hacer pull, unload, tuning
   o warm-up automático. Un digest distinto bloquea la demo; no se reemplaza.
4. Si 3004 está libre, desde `backend/api`, ejecutar `npm start`. Reutiliza
   `scripts/start-unified.mts` y la configuración privada. Para evidencias, redirigir
   stdout/stderr a archivos privados y registrar PID. No matar un listener desconocido.
5. Si 8084 está libre, desde `mobile`, ejecutar `./scripts/start-ccd-auth.ps1`.
   Conserva `ccd_authenticated`, API v2 3004, localhost IPv4 y SDK 57. No LAN/tunnel,
   Expo Go de otra versión, instalación de APK ni generación android/ios.

Si los procesos ya existen, verificar su procedencia. Un 401 o `/status` correcto
no identifica por sí solo el commit ni el entorno efectivo. La ventana validada
reutilizó la API y Metro iniciados en OE5, con PID/entrypoint/logs comprobados;
no se recargaron ni detuvieron los componentes compartidos.

## 4. Android y preflight de ejecución

Comprobar de nuevo ADB; no asumir que el dispositivo sigue presente. Si el daemon
no está iniciado, `adb devices` es una acción explícita del operador: el preflight
no lo inicia. Debe haber un dispositivo previamente autorizado; con varios, elegir
explícitamente el YAL-L21 autorizado y usar `-s`. No publicar su serial.

```powershell
adb devices -l
adb reverse --list
adb reverse tcp:3004 tcp:3004
adb reverse tcp:8084 tcp:8084
node scripts/demo-preflight.mjs --running --adb --report
```

Abrir el build existente con
`exp+banuchat://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8084`.
Esperar a que la introducción/login/Home sean visibles antes de introducir datos;
un tap durante una transición no acredita login. No usar coordenadas históricas
sin consultar la pantalla. No cambiar hora, fuente, permisos globales o batería.

El reporte actualizado usa estados por componente:

| Estado | Interpretación |
| --- | --- |
| READY | Pasó la comprobación descrita; no garantiza automáticamente E2E |
| NOT_READY | Falló una dependencia necesaria o una guardia de seguridad |
| OPTIONAL_UNAVAILABLE | Rama opcional ausente; puede continuar una demo acotada, declarando la omisión |
| NOT_TESTED | No se ejecutó esa frontera: por ejemplo login, stdio E2E o recepción física |

`--running` exige la API habitual. Sin él, el agregado queda NOT_TESTED como chequeo
previo de arranque. Un exit 0 no equivale a todo el guion validado: revisar estados
y alcance. N8N se comprueba por identidad/volumen, health, workflow activo/publicado,
webhook registrado y configuración privada válida, sin invocarlo. MCP comprueba
contrato/dependencias y rol lector, sin ejecutar tools. La recepción física y el
producto autenticado permanecen NOT_TESTED hasta su comprobación separada.
`--report` escribe ahora en `infra/local/oe6-demo-readiness-01/`, no en el directorio
histórico ENTREGA-01. `NOT_READY` devuelve exit 1; no instala ni repara dependencias.

## 5. Recorrido coherente con una cuenta ficticia

Usar exclusivamente una cuenta técnica existente por el procedimiento privado;
seleccionar un perfil no sustituye autenticación. Mantener visibles estas fronteras:
**documentos CCD**, **auxiliares ficticios habituales** y **publicaciones OE2 aisladas**.

1. Login → Home. Confirmar capacidades y aviso de demostración, sin inferir expediente real.
2. Chat documental: una consulta de contenido admitido, respuesta con cita, abrir su
   fuente autenticada. Conservar edición/población; no prometer oferta de grupos.
3. Chat multifuente: «Según mis cursos completados, ¿qué convocatorias activas podrían
   interesarme?». Verificar N8N/Agent correlacionados y `get_profile_progress` seguido
   de `get_announcements`, hasta dos tools, sin afirmar elegibilidad. Si la rama no
   está operativa, marcarla omitida; no fingir que una consulta directa la sustituyó.
4. Home → Progreso y Calendario. Mostrar su aviso ficticio y release auxiliar,
   independiente de las citas CCD; una lectura no actualiza notas ni matrículas.
5. Publicaciones OE2 → Programación / Convocatorias / Novedades. Mostrar identidad y
   versión de origen y distinguir una novedad sin vencimiento de una convocatoria abierta.
6. Banu al día → fechas de ambas publicaciones, resumen y Antes/Ahora. Un filtro vacío
   puede ser correcto. No son novedades personales no leídas ni un feed dentro del chat.
7. Notificaciones → permiso/estado → «Enviar prueba local en 5 segundos». Esperar
   recepción visible en Android y tocar la tarjeta. No llamar recepción a la promesa
   de Expo. Es local, ficticia y no push remoto; no alterar la hora para probar 24 h.
8. Historial → reabrir la conversación propia y sus citas. No consultar ni borrar las
   conversaciones de otro usuario. Las fuentes requieren la sesión vigente.
9. Si se activaron recordatorios, desactivar/cancelar; luego logout. Consultar el estado
   antes de repetir: la cancelación por cambio de cuenta es asíncrona. Confirmar cero
   pendientes propios y login visible. No borrar preferencias o avisos de otras cuentas/apps.

Muestra HTTP reproducible opcional, desde `backend/api`:

```powershell
node --import tsx scripts/evaluate-unified-demo-readiness.mts --run-once
```

Usa la API existente y DPAPI internamente; crea una conversación propia, conserva
la evidencia e historial y cierra su sesión. Una sola pasada, sin reset de cuotas,
retry, servidor nuevo, scheduler o perturbación de dependencias. Para acreditar la
correlación del proceso existente, definir `BANUCHAT_DEMO_API_LOG` con la ruta del
stdout privado de esa API; sin ella la correlación queda NOT_TESTED. El informe
completo es privado. Si un POST queda incierto, consultar historial antes de decidir
otra acción; no relanzar la pasada automáticamente. Un 429 exige respetar la ventana,
un 409 atender el conflicto y un 503 registrar la dependencia, sin modificar corpus.

## 6. Cierre seguro

Registrar estado final y comparar con el inicial. Cerrar sesión, esperar la
cancelación y confirmar pendientes propios; no borrar chats ni datos para simular
un entorno limpio. No cancelar todas las notificaciones del teléfono.

Solo para terminales/procesos que inició esta ventana, Ctrl+C o cierre controlado
con PID registrado. No terminar por número de puerto ni detener recursos compartidos.
Los contenedores que ya estaban activos permanecen activos. Si uno se inició aquí,
su apagado requiere confirmar que sigue siendo exclusivo de esta ventana; nunca
usar down -v, borrar modelos, cuentas, datos, publicaciones o logs históricos.

Retirar únicamente reverses añadidos, usando el mismo dispositivo seleccionado:
`adb reverse --remove tcp:3004` / `adb reverse --remove tcp:8084`; no remove-all.
Eliminar solo el volcado UI temporal propio, no archivos de otras apps. En esta
validación no se iniciaron servicios: la API, Metro, PostgreSQL, Ollama y N8N existentes
se preservaron. Sin Android disponible, completar REST, registrar la muestra física
como pendiente y reutilizar la evidencia anterior con fecha, sin atribuir otra ejecución.

## 7. Historial, métricas y límites

Los checkpoints OE6 del 25/10 describen la demo v1 sintética y CCD separados, Docker
RAG, concurrencia 1/2/5 y backup/restore sintético de 16 tablas. Son evidencia histórica,
no rendimiento, restauración o portabilidad de Unified actual. El contraste y las
contradicciones documentales están en la [matriz de dependencias](demo-dependencies.md).
Las caídas N8N y OE2 ya acreditadas se reutilizan; no detener servicios compartidos
para repetirlas. No correr automáticamente `eval/oe6/run-stability.mjs`, RAGAS, las
43 preguntas, scheduler acelerado, stress ni backup/restore como parte de esta demo.

Esta ventana mide HTTP hasta parsear la respuesta, secuencialmente, con denominador
explícito y sin retries. No controla temperatura/residencia de modelos ni prueba SLA,
soak, recuperación ante pérdida del host o servidor UNAB. Las fuentes institucionales,
TLS/DNS, otro computador, iOS, push remoto y SUS requieren validaciones/autorizaciones
separadas; este procedimiento no las sustituye.
