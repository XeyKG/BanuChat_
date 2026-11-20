# Guía para encender y presentar BanuChat

Preparada para el responsable del proyecto. **Revisión: 20 de noviembre de 2026.** Cliente publicado 1.0.4; backend RAG registrado desde `a30088f`. Referencia documental inicial `2e31128`.

[Abrir la versión PDF con capturas y diagrama](GUIA-PRESENTACION-BANUCHAT.pdf).

Esta guía permite preparar la sustentación sin recordar comandos de desarrollo. Presenta la aplicación y el n8n publicados en AWS. El laboratorio Unified local se conserva como antecedente opcional y no es necesario para esa demostración. Las contraseñas y la configuración privada no forman parte de este documento.

## 1 Qué debes abrir y encender

| Lo que quieres mostrar | Qué necesitas encendido | Qué debes abrir |
| --- | --- | --- |
| Web y Android publicados | Internet, Learner Lab activo, EC2 existente y Supabase disponible | `https://banuchat.duckdns.org/login` y APK BanuChat |
| Arquitectura y código | Navegador y acceso al repositorio privado | README, diagrama y documentación en GitHub |
| Persistencia en Supabase | Sesión personal del panel de Supabase | Proyecto `banuchat`, esquemas propios y metadatos |
| n8n y MCP publicados | La misma EC2 y Supabase; servicio `banuchat-n8n` activo | `https://n8n.banuchat.duckdns.org` y el chat público |
| Laboratorio Unified histórico, opcional | PC y servicios locales preparados | Solo si necesitas explicar las pruebas locales anteriores |
| Evidencias de contingencia | Archivos descargados previamente | Capturas y paquete académico; indicar su fecha |

**Para la aplicación publicada no debes abrir PowerShell, Metro, Expo Go, Docker Desktop ni una API en tu PC.** Esto incluye la integración publicada de n8n y MCP; el PC solo es necesario si eliges mostrar el laboratorio local histórico. DuckDNS ofrece un nombre estable; no enciende AWS.

**Para n8n usa el subdominio de AWS, no un contenedor viejo de Docker.** Los dos temporizadores de pruebas encontrados en el n8n local se conservan sin activar; no se importaron al servidor. No necesitas encenderlos para la presentación.

## 2 Preparación el día anterior

1. Comprueba que puedes iniciar sesión personalmente en Canvas/AWS Academy, GitHub y Supabase. Resuelve MFA antes de presentar; nunca proyectes contraseñas, tokens ni archivos de configuración.
2. En GitHub abre la [Release 1.0.4](https://github.com/XeyKG/BanuChat_/releases/tag/demo-1.0.4). Descarga la APK y el paquete académico. El repositorio es privado: el profesor necesitará acceso si descarga directamente.
3. Conserva dos cuentas de demostración autorizadas y sus contraseñas en tu medio privado habitual. No las pongas en diapositivas o en el repositorio. Las cuentas del laboratorio local pueden ser diferentes de las de Supabase.
4. Enciende el laboratorio y comprueba el recorrido web del apartado 4 y el móvil del apartado 5. Guarda una conversación propia con una respuesta documental y sus fuentes para contingencia mediante Historial.
5. Carga el Huawei y comprueba su conexión a internet. La APK publicada no necesita cable USB, Metro ni el computador encendido.
6. Abre el n8n de AWS siguiendo el apartado 7 y comprueba que el workflow conversacional aparece Published. Guarda el acceso privado sin proyectarlo; no hace falta Docker.
7. Descarga esta guía, las capturas y el paquete académico para poder consultarlos sin depender del sitio. Las capturas son evidencia fechada; no sustituyen una prueba en vivo.

Descargas existentes:

- [APK Android ARM64 1.0.4](https://github.com/XeyKG/BanuChat_/releases/download/demo-1.0.4/BanuChat-demo-1.0.4-arm64.apk).
- [Paquete académico 1.0.4](https://github.com/XeyKG/BanuChat_/releases/download/demo-1.0.4/BanuChat-entrega-academica-1.0.4.zip).

En Windows puedes verificar la APK descargada:

```powershell
Get-FileHash "$env:USERPROFILE\Downloads\BanuChat-demo-1.0.4-arm64.apk" -Algorithm SHA256
```

SHA-256 esperado de esa APK: `daddd2a9eae5b5036ffb80215e0e9b716696b8240bcbf054fb7e7ed4c862ce36`. Es un archivo publicado previamente; no se reconstruyó ni se volvió a descargar para esta guía. Conserva 1.0.4 y las versiones anteriores. No desinstales la aplicación para actualizarla: debe conservar paquete y firma.

## 3 Encender la demostración publicada

Haz esto con margen, por ejemplo 30 minutos antes. Es un margen de organización, no un tiempo de arranque garantizado.

### Paso 1 Activar AWS Academy

1. Abre Canvas/AWS Academy e ingresa al curso que contiene **Learner Lab**.
2. Abre el laboratorio y pulsa **Start Lab** si está detenido. Espera a que el indicador permita entrar a AWS.
3. Entra a **AWS Console** desde el propio laboratorio. No uses otra cuenta ni crees un proyecto nuevo.
4. Mira el tiempo de sesión y el crédito mostrado. El presupuesto autorizado originalmente fue US$50; esta guía no certifica cuánto queda. El tiempo efectivo lo indica el laboratorio.

### Paso 2 Revisar la instancia existente

1. En AWS selecciona **N. Virginia / us-east-1** y entra en **EC2 → Instances**.
2. Busca **`i-0a726734ca6c6f10d`**. Es la instancia de BanuChat, tipo **m6i.large**, dos vCPU y 8 GiB.
3. Si está `Stopped`, selecciónala y usa **Instance state → Start instance**. Si está `Running`, no la reinicies.
4. Espera a que los controles de estado disponibles pasen. Revisa que conserve la IP elástica **34.239.198.159**. No asignes otra IP ni crees otra instancia.

El servidor instalado es **Amazon Linux 2023**, no Ubuntu. No hace falta cambiarlo para presentar el proyecto. La IP elástica conserva la dirección mientras siga asociada, incluso si la EC2 se detiene; no garantiza gratuidad ni disponibilidad continua.

### Paso 3 Comprobar los cinco servicios

En la instancia selecciona **Connect → Session Manager → Connect**. Esta terminal está dentro de la EC2. **No ejecutes estos comandos Linux en PowerShell ni en CloudShell:** CloudShell y Session Manager son lugares distintos.

```sh
systemctl is-active ollama banuchat-api banuchat-web-duckdns banuchat-https banuchat-n8n
systemctl is-enabled ollama banuchat-api banuchat-web-duckdns banuchat-https banuchat-n8n
```

Debes observar un resultado por servicio. Lo esperado es `active` para ejecución y `enabled` para arranque automático. Si no coincide, no supongas que el sitio está listo.

| Servicio | Para qué sirve |
| --- | --- |
| `ollama` | Ejecuta los modelos en la EC2 |
| `banuchat-api` | Autenticación, progreso, conversaciones y RAG |
| `banuchat-web-duckdns` | Sirve el cliente y su proxy del origen principal |
| `banuchat-https` | Caddy y HTTPS público |
| `banuchat-n8n` | Editor protegido y admisión interna de consultas multifuente |

Si **uno** está detenido, consulta su estado y arranca solo ese servicio, sustituyendo el nombre cuando corresponda:

```sh
systemctl status banuchat-api --no-pager
sudo systemctl start banuchat-api
```

Si vuelve a fallar, revisa el registro en privado, sin proyectarlo ni compartirlo completo:

```sh
journalctl -u banuchat-api -n 60 --no-pager
```

No reinicies todos los servicios por rutina, no imprimas archivos `.env` y no modifiques contraseñas, puertos o TLS durante la presentación. Si aparece `disabled`, la persistencia del arranque debe revisarse antes de afirmar recuperación automática.

### Paso 4 Revisar los modelos

```sh
journalctl -u banuchat-ollama-warmup -b --no-pager
bash /opt/banuchat/infra/scripts/ollama-demo-warmup.sh --check
```

Si la comprobación indica que falta la precarga, puedes usar el servicio existente:

```sh
sudo systemctl start banuchat-ollama-warmup
```

La precarga solo ayuda con la residencia de los modelos; no acredita que una pregunta haya sido respondida. No descargues modelos, cambies versiones ni aumentes timeouts para la sustentación.

### Paso 5 Verificar desde fuera de AWS

1. En un navegador normal abre **https://banuchat.duckdns.org/login**.
2. Comprueba que el navegador no muestra advertencias de certificado y que la dirección sigue siendo DuckDNS.
3. Inicia sesión y abre Mi progreso. Después envía una pregunta documental y abre una fuente. Esto comprueba más que una pantalla de login.
4. Repite desde el teléfono usando internet. El origen `https://34-239-198-159.sslip.io/login` es una transición, no el enlace principal ni un reemplazo automático de la APK.

Si Session Manager no conecta, revisa que el laboratorio y la instancia estén activos. No abras SSH ni expongas PostgreSQL/Ollama para resolverlo. Si cambió la asociación de la IP o DuckDNS no resuelve correctamente, detén el ensayo y revisa esa asociación; no recompiles la APK por reflejo.

## 4 Recorrido visual completo en la web

Abre una ventana normal para la primera cuenta y una ventana privada para la segunda. Evita compartir una misma sesión entre ambas. No introduzcas usuarios inventados que no hayan sido aprovisionados.

| Orden | Qué abres y haces | Qué muestra y qué debes comprobar |
| --- | --- | --- |
| 1 | Login. Primero intenta con campos vacíos; luego usa tu cuenta autorizada | Advertencia visible; después Inicio autenticado. No mostrar la contraseña |
| 2 | Inicio | Accesos disponibles y navegación del producto |
| 3 | Mi progreso | Expediente de la cuenta, cursos, estado e intentos. En una cuenta preparada, mostrar un recursamiento; no todas tienen historial |
| 4 | Chat | Enviar una pregunta documental del corpus. Leer respuesta y distinguir una respuesta completa, parcial o falta de evidencia |
| 5 | Fuentes del mensaje | Expandir las citas, abrir el documento y descargar el artefacto. Mostrar título, contenido y correspondencia con la respuesta |
| 6 | Historial | Salir del chat, reabrir la conversación propia y volver a abrir una fuente. Es persistencia, no una generación nueva |
| 7 | Chat sobre tu progreso | Pedir ver tu progreso; cuando la respuesta incluya el acceso, abrir Mi progreso desde allí |
| 8 | Calendario | Mostrar cuadrícula mensual, cambiar de mes, elegir un día marcado y leer su agenda. Un mes sin eventos puede quedar vacío |
| 9 | Banu al Día | Buscar, filtrar y abrir el texto de una noticia o convocatoria. Es el nombre del espacio de noticias |
| 10 | Publicaciones OE2 | Abrir Programación, Convocatorias y Novedades; revisar procedencia y versión. Son consultas, no matrícula ni pagos |
| 11 | Cambios de publicaciones | Abrir la comparación de versiones de OE2 y un registro Antes/Ahora. El conteo previo fue una modificación y cinco sin cambios; no forzar esos números si cambia la publicación |
| 12 | Segunda cuenta | Revisar su progreso y su Historial. La conversación privada de la primera no debe aparecer. Esta observación visual no reemplaza una prueba técnica de autorización |
| 13 | Logout y nueva autenticación | Cerrar sesión, comprobar pantalla de acceso y volver a ingresar cuando corresponda |

Pregunta documental sugerida para ensayar: **«¿Cuáles pruebas debo hacer?»**. Para comparar costos puedes ensayar **«¿Cuánto cuestan los cursos vacacionales?»**. Las respuestas dependen de la evidencia y vigencia disponibles: no prometas un precio actual ni exactamente cinco fuentes para cualquier pregunta. Escoge antes una consulta cuya respuesta y documentos hayas revisado.

Una consulta puede tardar bastante en dos vCPU. Los límites existentes son **API 150 s, cliente 175 s y proxy 180 s**. Envía una vez y espera el resultado; no abras varias generaciones paralelas. Si queda incierto, consulta Historial antes de repetir.

## 5 Recorrido visual en el Huawei

1. Conecta el teléfono a internet y abre la **APK publicada BanuChat**, no Expo Go ni una versión de desarrollo que solicite Metro.
2. Si necesitas instalarla, descarga la APK del apartado 2. Actualiza la existente manteniendo la firma. Los avisos y permisos de Android se revisan personalmente en el dispositivo; no cambies políticas de seguridad globales para la demo.
3. Repite Login → Inicio → Mi progreso → curso con intentos/recursamiento, si la cuenta lo tiene.
4. En Chat envía una consulta documental nueva. Desplázate hasta la respuesta, expande y contrae Fuentes, abre una cita y prueba la descarga. Revisa que el teclado no impida llegar al compositor ni a los mensajes.
5. Abre Historial y reabre la conversación. Luego muestra Calendario, Banu al Día y las tres categorías de Publicaciones OE2. Abre Cambios de publicaciones desde OE2.
6. Abre **Recordatorios** si aparece en Android. Su propósito es configurar avisos **locales del teléfono** sobre la información de demostración. Revisa permiso y estado antes de habilitar nada. No hay push remoto acreditado, ni un recordatorio inmediato garantizado, ni sincronización del permiso con la web. La versión 1.0.4 no incluye el antiguo botón de prueba a cinco segundos.
7. Cierra sesión y vuelve a autenticarte. Si activaste recordatorios de prueba, revísalos y desactiva solo los tuyos cuando corresponda; no canceles notificaciones de otras aplicaciones.

**Comprobación sin el PC:** con AWS activo, abre primero la web o la APK desde otro dispositivo con internet. Cierra únicamente Metro/API locales que tú hayas iniciado y repite una consulta autenticada. Para la comprobación más clara, apaga el PC después de guardar esta guía en el teléfono y repite allí el recorrido. El editor n8n de AWS también funciona sin ese PC; su laboratorio local opcional sí necesita el equipo. El resultado debe anotarse el día del ensayo; no se volvió a acreditar al elaborar el documento.

## 6 Qué mostrar en Supabase y GitHub

En Supabase inicia sesión personalmente y abre el proyecto **banuchat** (`swtywnndzehgisyidnyu`). Muestra el panel de base de datos y la existencia de los esquemas propios `banuchat`, `banuchat_auth` y `banuchat_academic` según permita el panel. Para enseñar datos elige únicamente registros sintéticos autorizados. Evita proyectar correos personales, hashes de credenciales, sesiones o tokens; no abras Connection string, API keys o Secrets.

Explica que Supabase conserva PostgreSQL/pgvector, conversaciones, citas y datos estructurados; **el login de BanuChat lo implementa la API propia**, no la pestaña Auth de Supabase. Los conteos de la restauración sintética acreditada fueron dos releases, 32 estudiantes, 62 intentos, ocho recursamientos y 120 vectores de 1024 dimensiones. El suplemento CCD tiene procedencia separada; no lo sumes como si fuera la misma release sintética.

En GitHub muestra [README](https://github.com/XeyKG/BanuChat_), documentación, Releases y pruebas de Actions con fecha. La arquitectura publicada que puedes explicar es:

**Web o Android → DuckDNS y HTTPS → API en AWS → Supabase y Ollama en la EC2.**

El modelo generador es `qwen3:4b-instruct`; los embeddings son `qwen3-embedding:0.6b`, 1024 dimensiones. Las consultas multifuente estructuradas pueden usar n8n, un agente determinista acotado y MCP en AWS. Las preguntas documentales mantienen su RAG y las consultas simples sus fast paths: no todos los mensajes pasan por MCP.

## 7 Mostrar n8n y MCP en AWS

### Abrir el editor correcto

1. Comprueba los cinco servicios del apartado 3. El servidor sigue siendo la EC2 existente; no crees otro n8n, volumen ni cuenta cloud.
2. Abre **https://n8n.banuchat.duckdns.org**. La primera ventana es la protección HTTPS del servidor. Su acceso está en el archivo privado `%APPDATA%\BanuChatManagedMcp\acceso-n8n-privado.txt`; ábrelo antes de proyectar y no lo compartas.
3. Si aparece una segunda pantalla con correo y contraseña, usa la cuenta propietaria que configuraste dentro de n8n. Es distinta de la primera protección y de las cuentas de BanuChat. No crees otro propietario si olvidaste el acceso.
4. En Overview → Workflows abre **BanuChat OE4 - Conversational orchestration v1**. Debe aparecer **Published**. Se observó realmente este lienzo en Brave el 20/11.
5. Muestra los cinco nodos: recepción autenticada, validación, decisión, devolución de directiva y rechazo. No abras Credentials ni headers privados y no pulses Execute para simular un mensaje.

### Provocar el recorrido desde el chat

1. Abre **https://banuchat.duckdns.org/login** y usa una cuenta sintética autorizada.
2. En un chat nuevo pregunta: **«Según mis cursos completados, ¿qué convocatorias activas podrían interesarme?»**.
3. Revisa la respuesta y las fuentes, y reabre la conversación desde Historial. La prueba pública comprobó cuatro citas y conservación de sus campos; la cantidad depende de la evidencia disponible.
4. Explica el recorrido: la API comprueba sesión y propietario, pide admisión a n8n por loopback, el agente inicia MCP mediante stdio y combina como máximo dos herramientas de lectura. En esta prueba fueron `get_profile_progress` y `get_announcements`.
5. El editor puede mostrar **cero ejecuciones guardadas**: el workflow no conserva payloads exitosos, fallidos ni manuales. Eso evita guardar headers con credenciales. No cambies la retención para llenar el panel. La prueba de uso son las trazas correlacionadas de la API, no el contador del editor.

Si necesitas mostrar las trazas, en **Session Manager de la EC2**, sin abrir archivos privados:

```sh
journalctl -u banuchat-api --since '-10 min' --no-pager -o cat | grep '"event":"managed_'
```

Busca `managed_n8n` y `managed_agent` con el mismo `operation_id`, dos herramientas y `terminal_reason: answered`. Estos eventos no contienen contraseñas, preguntas ni identificadores de cuenta. Una respuesta documental directa no acredita una llamada MCP.

### Qué está desplegado y qué sigue siendo local

n8n 2.40.5 funciona como servicio Linux separado, **sin Docker**, en `127.0.0.1:15679`, con datos persistentes en `/var/lib/banuchat-n8n/.n8n`. Caddy protege el editor y bloquea los webhooks públicos. El proceso MCP no tiene una pantalla ni un puerto que debas abrir: la API lo inicia y cierra cuando corresponde, mediante `backend/mcp-server/src/managed-main.ts`.

El lector MCP tiene su propio rol restringido en Supabase; no recibe sesiones de la aplicación ni acceso a cuentas, contraseñas o tablas académicas completas. El contexto confiable fija principal, perfil, release y despliegue. No hay un selector arbitrario de estudiantes.

Este agente es **determinista y acotado**, no ReAct dirigido por un LLM. Las preguntas documentales CCD conservan su camino RAG anterior. n8n no ejecuta el modelo ni contiene las reglas académicas. No hay Drive/Sheets institucionales, matrícula, ingesta cloud automática ni sincronización de OE2 acreditados.

El Docker local `banuchat-unified-n8n` es otro laboratorio: el 19/11 tenía nueve workflows, incluidos dos timers OE2 de diez segundos activos aunque el contenedor estaba detenido. **No lo arranques para esta presentación.** Si decides usarlo en otro ensayo, primero requiere respaldo y desactivación controlada de esos timers. No se alteró ese volumen durante la integración en AWS. `banuchat-n8n` es un contenedor local aún más antiguo; tampoco es el servicio de AWS.

## 8 Laboratorio local histórico opcional

Este circuito no es necesario para la presentación del n8n/MCP publicado. Es adicional a la demo publicada. Usa otro origen y datos locales. Necesita el PC encendido. **No se ensayó nuevamente su ejecución integral para elaborar esta guía**; sus instrucciones se apoyan en el runbook local y están condicionadas a resolver el n8n anterior.

En PowerShell, desde la raíz conocida:

```powershell
Set-Location 'C:\Users\samue\OneDrive\Documentos\BanuProject\BanuChat_'
git status --short
node scripts/demo-preflight.mjs --report
```

El preflight inspecciona dependencias y escribe un informe privado en `infra/local/oe6-demo-readiness-01/`; no inicia servicios. Lee los estados `READY`, `NOT_READY`, `OPTIONAL_UNAVAILABLE` y `NOT_TESTED`. Un informe sin ejecución no acredita login ni herramientas MCP.

Orden de preparación:

1. **PostgreSQL Unified:** en Docker Desktop confirma el contenedor `banuchat-unified-postgres`, puerto `127.0.0.1:55463`, volumen `banuchat-unified-data`. Ya estaba activo en el inventario. Si estuviera detenido y coincide la identidad, usa Start solo en él. No crees otra base.
2. **Ollama local:** abre la instalación existente. En una terminal comprueba `ollama --version` y `ollama list`. Se espera runtime 0.35.0 y los modelos fijados del laboratorio. Si está detenido y 11434 libre, `ollama serve` en su propia terminal. No hagas `pull` ni actualices versiones para resolver una discrepancia.
3. **n8n local, opcional:** solo después de respaldar y desactivar de forma validada los temporizadores de pruebas, inicia `banuchat-unified-n8n` en Docker Desktop y abre `http://127.0.0.1:15679` con su cuenta local. Si falta esa preparación, no lo arranques. No es el n8n de AWS del apartado 7.
4. **API local:** necesita los archivos privados existentes `infra/local/unified/application.json` y `infra/local/oe6/n8n-conversation.env`. Si faltan, no copies el ejemplo con valores inventados ni muestres secretos en pantalla. En una terminal propia:

```powershell
Set-Location 'C:\Users\samue\OneDrive\Documentos\BanuProject\BanuChat_\backend\api'
npm start
```

5. **Web local:** en otra terminal abre la exportación existente. Primero verifica que existe el HTML exportado:

```powershell
Set-Location 'C:\Users\samue\OneDrive\Documentos\BanuProject\BanuChat_\mobile'
Test-Path .expo/unified-web/login.html
```

Si existe y está acreditado que es una exportación **local** del cliente preparado, ejecuta `npm run web:serve`. No reutilices a ciegas una exportación hecha para DuckDNS: puede seguir enviando consultas a AWS. Si falta o no conoces su destino, prepara una exportación local la víspera en esa terminal:

```powershell
$env:EXPO_PUBLIC_WEB_ORIGIN = $null
$env:BANUCHAT_WEB_ORIGIN = $null
$env:EXPO_PUBLIC_DEMO_MODE = 'ccd_authenticated'
npm run web:export
npm run web:serve
```

Estos cambios afectan solo a esa terminal; no editan credenciales ni la APK publicada. Abre **http://127.0.0.1:8085/login**. El proxy apunta a la API local 3004. No uses DuckDNS para demostrar este circuito local. No hace falta recompilar de nuevo si conservas esa exportación local validada.

6. En una terminal situada en la raíz, comprueba servicios con `node scripts/demo-preflight.mjs --running --report`.
7. Autentícate con una **cuenta local autorizada**, que puede ser distinta de la cuenta cloud. Pregunta: **«Según mis cursos completados, ¿qué convocatorias activas podrían interesarme?»**. Comprueba respuesta y trazas correlacionadas de n8n/API antes de afirmar que se ejecutaron las dos herramientas. Una respuesta documental directa no prueba el recorrido MCP.
8. Puedes revisar **Executions**, pero el workflow de conversación no guarda sus ejecuciones por la configuración observada. Para acreditar el recorrido, usa la evidencia correlacionada de API del ensayo local; sin esa correlación, deja la ejecución MCP como no comprobada. No proyectes payloads con tokens. La elegibilidad académica real no se deduce de los fixtures. El procedimiento técnico opcional de una sola pasada está en el apartado 5 del runbook Unified enlazado al final; no es necesario correrlo para explicar el lienzo.

La API inicia el proceso MCP cuando corresponde: **no ejecutes manualmente `unified-main.ts` para simular la integración**. No hace falta Metro para esta demostración web local. La APK publicada seguirá usando DuckDNS; `adb reverse` no la convierte en cliente de Unified.

La base opcional OE2 `banuchat-oe6-local-postgres-synthetic-1` se requiere si se muestran las lecturas locales de publicaciones; su configuración de lector es privada y distinta. No publiques puertos ni cambies su red para facilitar la presentación. Para el producto cloud esas publicaciones usan su copia aprobada de solo lectura.

## 9 Inventario de Docker para saber cuál es cuál

Fotografía real del 19/11/2026: **27 contenedores; tres activos y 24 detenidos**. El estado cambiará con los usos posteriores. Los nombres históricos orientan sobre su propósito; no se inspeccionaron las filas de cada base para certificar su contenido. Ninguno de estos contenedores es la EC2 ni la base Supabase.

| Contenedor | Estado observado | Qué hacer para presentar |
| --- | --- | --- |
| `banuchat-unified-postgres` | Activo, puerto 55463 | Conservar; base del laboratorio Unified |
| `banuchat-unified-n8n` | Detenido, puerto 15679 | Editor Unified; resolver temporizadores antes de arrancar |
| `banuchat-oe6-local-postgres-synthetic-1` | Activo, healthy | Conservar; fuente OE2 local opcional |
| `banuchat-cloud01b2-pg17-restore` | Activo, puerto 55480 | Laboratorio de restauración PG17; no necesario para la demo pública |
| `banuchat-cloud01b2-pg17-source` | Detenido, puerto 55479 | Dejar; ensayo de migración |
| `banuchat-cloud01b2-restore` | Detenido, puerto 55478 | Dejar; ensayo de migración |
| `banuchat-cloud01b2-source` | Detenido, puerto 55477 | Dejar; ensayo de migración |
| `banuchat-cloud01b0-replay` | Detenido | Dejar; replay histórico |
| `banuchat-cloud01a3-reuse` | Detenido | Dejar; ensayo histórico |
| `banuchat-cloud01a3-restore` | Detenido | Dejar; restauración histórica |
| `banuchat-cloud01a3` | Detenido | Dejar; ensayo histórico |
| `banuchat-oe2-pipeline-demo-mvv2hih9` | Detenido | Dejar; prueba OE2 anterior |
| `banuchat-oe2-pipeline-demo-mvumu57l` | Detenido, salida 1 | Dejar; intento OE2 fallido histórico |
| `banuchat-oe2-pipeline-demo-mvump1sp` | Detenido, salida 1 | Dejar; intento OE2 fallido histórico |
| `banuchat-p1-product-staging` | Detenido | Dejar; staging histórico |
| `banuchat-p0-operational-pilot` | Detenido | Dejar; piloto histórico |
| `banuchat-oe6-local-ollama-1` | Detenido | Dejar; no sustituir la instalación local habitual |
| `banuchat-oe6-local-n8n-1` | Detenido | Dejar; n8n de otro laboratorio |
| `banuchat-dev-postgres-ccd-auth-1` | Detenido | Dejar; prueba CCD/auth |
| `banuchat-auth-i1b-uid-test` | Detenido | Dejar; prueba de identidad |
| `banuchat-ccd-auth-i1b-test` | Detenido | Dejar; prueba CCD/auth |
| `banuchat-auth-i1a-test` | Detenido | Dejar; prueba auth |
| `banuchat-auth-r0-replay` | Detenido | Dejar; replay auth |
| `banuchat-auth-p4l1-demo` | Detenido | Dejar; prueba auth |
| `banuchat-ccd-dev-postgres-ccd-1` | Detenido | Dejar; laboratorio CCD anterior |
| `banuchat-n8n` | Detenido | n8n inicial; no confundir con Unified |
| `banuchat-postgres` | Detenido | PostgreSQL inicial; no es Supabase |

Para volver a consultar el inventario sin cambiar nada:

```powershell
docker ps -a --format '{{.Names}} | {{.Status}} | {{.Ports}}'
```

No pulses **Start all**, **Delete**, **Clean/Purge data**, ni ejecutes `docker compose down -v`, `docker system prune` o migraciones para preparar una exposición. Un contenedor detenido no es basura: puede conservar evidencia o datos necesarios.

## 10 Guion de presentación y contingencias

Propuesta de orden; ajusta los minutos al tiempo concedido por el profesor:

1. **Contexto y arquitectura:** explicar Web/Android → API AWS → Supabase + Ollama. Separar datos académicos ficticios y documentos seleccionados. La validación del equipo no es aval institucional.
2. **Producto web:** login, expediente con recursamiento, pregunta documental, citas, descarga e Historial.
3. **Producto móvil:** demostrar la misma cuenta desde el Huawei y abrir una fuente; mostrar calendario, noticias y publicaciones. Explicar recordatorios locales sin prometer push.
4. **Persistencia y aislamiento:** reabrir una conversación, cambiar a la segunda cuenta y mostrar su historial propio; vincular con las pruebas técnicas documentadas.
5. **Implementación técnica:** panel de Supabase sin secretos y, solo si fue preparado, editor n8n y prueba multifuente local con MCP. Explicar expresamente que no es el camino del chat publicado.
6. **Cierre académico:** mostrar evidencia por objetivo y reconocer los pendientes. No presentar una animación, una captura o un HTTP 201 como aprobación de calidad semántica.

| Problema | Qué haces | Qué debes explicar |
| --- | --- | --- |
| La URL no abre | Revisar Lab, EC2, IP y servicios según apartado 3 | No atribuirlo a Supabase sin diagnóstico |
| La web abre pero login falla | Revisar campos, internet y estado de API; no repetir contraseñas en público | El formulario visible no prueba acceso a la base |
| La generación tarda o falla | Esperar una sola solicitud; consultar Historial antes de reintentar | Dos vCPU limitan inferencia; no se declara RAG estable |
| Falta evidencia o la respuesta es parcial | Abrir las fuentes disponibles y explicar el alcance documental | No inventar tarifas, reglas o requisitos para cubrir el vacío |
| La APK pide Metro | Abrir la APK publicada 1.0.4, no el cliente de desarrollo | No hace falta iniciar Metro para el producto publicado |
| n8n no abre | Revisar el subdominio HTTPS, sus dos accesos y `banuchat-n8n` en AWS; no encender Docker por deducción | El editor y los contenedores locales son instalaciones diferentes |
| Se acaba el Learner Lab | Volver a activar por el procedimiento autorizado si aún hay crédito/tiempo | No hay disponibilidad permanente acreditada |
| No hay internet o no se recupera AWS | Abrir capturas y paquete descargados; mostrar código y registros fechados | Declarar que es contingencia con evidencia anterior, no una consulta en vivo |

La serie remota del 18/11 registró 24 turnos HTTP completados, con seis respuestas parciales y cuatro abstenciones; hubo tiempos de 1,30 a 110,28 s. Esto no equivale a 24 preguntas semánticamente aprobadas ni a garantía de estabilidad. No corras evaluaciones masivas o pruebas de carga durante la sustentación.

## 11 Cierre de la jornada

1. Cierra las sesiones de BanuChat y las pestañas administrativas antes de compartir el equipo.
2. Si el profesor debe abrir la URL después, acuerda una ventana con el laboratorio activo y crédito disponible; la IP/DuckDNS no mantienen la EC2 encendida.
3. Si terminaste el uso del laboratorio y nadie depende de la demostración, finaliza la sesión según las reglas de Academy. No uses **Terminate instance** ni elimines la IP o la base.
4. En local, detén con Ctrl+C únicamente las terminales API/Ollama/web que tú abriste para esa sesión, si ya no las necesita nadie. No pares procesos desconocidos ni los contenedores que estaban activos antes.
5. Conserva conversaciones, logs privados y capturas fechadas. No limpies bases ni elimines publicaciones para dejar una apariencia de reinicio.

## 12 Evidencia y alcance de esta guía

El 19/11 se inspeccionaron Git, inventario Docker y SQLite local de n8n sin arrancar sus temporizadores. El 20/11 se comprobó el arranque hecho por el propietario: EC2 existente, misma IP, cinco servicios activos y habilitados, web pública y editor con HTTPS verificado.

Se respaldó n8n en AWS, se publicó solo el workflow conversacional y se observaron sus cinco nodos en el navegador real. La admisión aceptó dos fuentes, solicitó aclaración con tres y rechazó una llamada sin token. Hubo pruebas reales de la API aislada y después del origen público: identidad, progreso, expediente, consulta MCP con citas, Historial y aislamiento. En el navegador real se envió una consulta nueva, se abrieron sus cuatro fuentes y se reabrió la conversación desde Historial. La reversión de la composición de API se ensayó sin cambiar datos; la nueva composición se reactivó después.

La integración no cambió la APK ni el frontend. No se repitió todavía en Android físico este cambio de backend ni se reinició toda la EC2 para acreditar el arranque de la nueva composición. Los servicios habilitados y el ensayo de reversión no sustituyen esa prueba. La consulta documental nueva por DuckDNS tardó 100,029 s, con tres fuentes, tres artefactos verificados por SHA-256 y cierre/revocación de las dos sesiones. Los resultados y límites están en el checkpoint enlazado; no se declara RAG estable.

En el panel Academy se observaron estado Ready y US$13,40 usados de US$50, aproximadamente US$36,60 indicados disponibles. El dato puede actualizarse con retraso; vuelve a mirarlo el día de la presentación. La lectura no acredita disponibilidad permanente ni un costo futuro fijo.


Referencias de detalle:

[Integración MCP/n8n AWS, 20/11](../transition/CHECKPOINT-MCP-AWS-2026-11-20.md) · [Operación cloud](cloud-demo.md) · [Estado vigente](../estado-vigente.md) · [Arquitectura](../arquitectura.md) · [Checkpoint consolidado](../transition/CHECKPOINT-PUBLICACION-BANUCHAT.md).

[Entrega académica](../transition/ENTREGA-FINAL-BANUCHAT.md) · [RAG del 18/11](../transition/CHECKPOINT-RAG-PERTINENCIA-2026-11-18.md) · [Matriz de objetivos](../academic/oe1-oe6-current-status.md) · [MCP](../../backend/mcp-server/README.md) · [n8n](../../n8n/README.md).

El [runbook Unified del 31/10](final-integrated-demonstration.md) conserva el laboratorio histórico; sus etiquetas de UI no corresponden enteramente a 1.0.4. Para la presentación normal usa los apartados cloud de esta guía.

La versión imprimible acompaña esta guía. Las imágenes reutilizadas en ella corresponden a la publicación 1.0.4 y están rotuladas como evidencia anterior; no son capturas de un ensayo nuevo.
