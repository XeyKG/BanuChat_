# Integración MCP agente y n8n en AWS

**Cerrado el 20/11/2026:** la rama estructurada administrada quedó activada y validada en AWS. El [checkpoint final](CHECKPOINT-MCP-AWS-2026-11-20.md) sustituye el estado pendiente de este registro histórico. No repetir la instalación, importación, creación de roles ni stage original.

## Punto de partida y autorización

Rama `main`, HEAD `2e311284bc95f90fbe106712ad44d56fbba1cf9c`. Había cambios documentales pendientes de la guía de presentación: README, índice documental, runbook Unified, README n8n y guía Markdown/PDF. Se conservaron. No se hizo commit ni push.

El propietario autorizó integrar el MCP, el agente y n8n en la EC2 existente, conservando RAG/autenticación y usando el crédito ya autorizado. No se creó otra EC2, base, volumen ni servicio de pago. No se cambió la APK, la identidad visual, los modelos o el corpus CCD.

## Estado remoto observado

- EC2 `i-0a726734ca6c6f10d`, `m6i.large`, Amazon Linux 2023, `us-east-1`, encendida y con IP `34.239.198.159`.
- Los cuatro servicios originales estaban activos: `ollama`, `banuchat-api`, `banuchat-web-duckdns`, `banuchat-https`.
- Memoria observada antes de n8n: 7779 MiB totales, 3124 MiB disponibles. Disco raíz: 24 GiB, unos 13 GiB libres. No se verificó el saldo restante del Learner Lab.
- Node real: `/usr/local/bin/node`, versión 24.19.0. API original: `/opt/banuchat/backend/api`, usuario `banuchat`, archivo de entorno `/etc/banuchat/api.env`.
- Última comprobación externa: `https://banuchat.duckdns.org/login` HTTP 200, certificado verificado por curl; `https://n8n.banuchat.duckdns.org` HTTP 401 sin credenciales, certificado verificado. Son resultados de esta ventana, no garantía de disponibilidad al reanudar.

## Cambios remotos efectivos

1. Rol Supabase `cloud_mcp_reader`, creado inicialmente NOLOGIN y posteriormente habilitado con contraseña aleatoria privada. No es superusuario, no crea roles/bases ni omite RLS; no tiene membresías. Se concedieron lecturas explícitas sobre once tablas sintéticas, tres tablas de asociación/despliegue y ejecución de dos funciones de recuperación existentes. No se modificaron los permisos de `cloud_runtime`, los esquemas administrados ni permisos globales.
2. Lector probado realmente contra Supabase con TLS 1.3, CA y hostname verificados. No puede leer cuentas, sesiones ni estudiantes académicos completos. Guard de principal/perfil/release/despliegue pasó y rechazó cuatro identificadores ajenos.
3. n8n **2.40.5** instalado mediante npm, con usuario Linux separado `banuchat-n8n`, bajo `/opt/banuchat/operations/n8n`. No se instaló Docker en AWS ni se copiaron los contenedores viejos del PC.
4. Servicio nuevo `banuchat-n8n`, habilitado al arranque, puerto **127.0.0.1:15679**, datos en `/var/lib/banuchat-n8n/.n8n`. Límites configurados: heap Node 512 MiB, MemoryHigh 650 MiB, MemoryMax 900 MiB, CPUQuota 50%.
5. Panel `https://n8n.banuchat.duckdns.org`, mismo servidor y puertos HTTPS existentes, con protección Basic Auth delante de n8n. El subdominio ya resolvía a la IP elástica; no se cambió DuckDNS. Los webhooks y rutas MCP del host administrativo se bloquean en Caddy. La API llamará al webhook por loopback.
6. Configuración nueva privada en `/etc/banuchat/managed-mcp.env`, permisos 0600. Contiene la contraseña del lector y el token compartido con n8n. **No contiene todavía la activación del agente.** No mostrar ni versionar su contenido.
7. Archivos de importación de credencial y workflow preparados en el directorio privado de n8n. **No se ejecutó la importación ni la publicación.** Solo se preparó el workflow conversacional existente, sin timers de pruebas.
8. Se copiaron fuentes preparados a AWS con verificación de hashes y respaldo. **No se reinició la API original** y no se activó `BANUCHAT_AUTH_AGENT=managed_mcp`.

## Fuentes y discrepancias pendientes

Archivos locales de implementación:

- `backend/mcp-server/src/managed-runtime.ts`: configuración administrada, destino fijado, TLS y guard de privilegios/asociación.
- `backend/mcp-server/src/managed-main.ts`: stdio real, lecturas sintéticas acotadas, snapshot de solo lectura por herramienta.
- `backend/mcp-server/test/managed-runtime.test.ts`.
- `backend/api/src/agent/managed-mcp-agent.ts`: rama multifuente estructurada; mantiene el RAG documental aprobado para las otras consultas.
- `backend/api/test/managed-mcp-agent.test.ts`.
- `backend/api/src/auth/resources.ts`, `authenticated-main.ts`, `authenticated-runtime.ts`: composición optativa, desactivada por defecto.
- `backend/api/src/agent/bounded-mcp-agent.ts`: se exportó `planningSubject` para reutilizar la política de antecedentes sin duplicarla.
- `infra/db/managed-mcp/preflight.sql`, `reader.proposed.sql`. **El SQL del lector sí fue aplicado en esta ventana**; su guard rechaza un rol ya existente. No volver a aplicarlo a ciegas.
- `infra/scripts/install-managed-n8n.sh`, `banuchat-n8n.service`, `banuchat-api-mcp-check.service`.

**AWS todavía no tiene los últimos ajustes locales siguientes:** la corrección de antecedentes en `managed-mcp-agent.ts`, la exportación `planningSubject` en `bounded-mcp-agent.ts`, `NODE_ENV=production` añadido al unit de n8n y el unit de comprobación `banuchat-api-mcp-check.service`. Verificar hashes antes de transferirlos. La API de comprobación en 3005 **no fue creada ni arrancada**.

La rama propuesta usa MCP para combinar fuentes estructuradas sintéticas. Las referencias CCD aprobadas siguen por su RAG actual; no se debe afirmar que todas las preguntas pasan por MCP. El agente reutilizado es determinista y acotado, no ReAct dirigido por un LLM. No se habilitaron ingestas, Drive ni conectores institucionales.

## Evidencia ejecutada

- Typecheck MCP y API correctos en los últimos cortes locales.
- Suite MCP completa: **44/44** en el corte que incluía las primeras 16 pruebas nuevas; después se añadió y pasó la prueba de arranque seguro: focal **17/17**. No sumar esos conteos como suites independientes sin solapamiento.
- Pruebas API de agente/MCP/n8n: **35/35**, incluyendo las doce de la nueva política administrada, después de corregir antecedentes.
- Regresiones de mensajes, autenticación, REST v2 y referencias: **42/42**.
- SDK MCP + entrypoint stdio real desde el PC contra Supabase: `get_courses` cinco filas, `get_profile_progress` cinco, `get_announcements` tres y `get_calendar_events` cinco; release coincidente en todos. Selector arbitrario de estudiante rechazado. Esto **no acredita todavía ejecución del agente desde AWS** ni de las dos herramientas documentales en ese entorno.
- Baseline real de la API pública con dos cuentas sintéticas: ocho lecturas protegidas HTTP 200 (identidad, progreso, expediente, historial); conversación ajena 404 y selector de perfil 400. Se creó una conversación vacía propia de prueba y se intentó cerrar ambas sesiones en `finally`.
- HTTPS externo: BanuChat 200 y panel n8n 401 sin credenciales; `TLS_verify=0` en ambos, sin desactivar validación.
- `git diff --check` correcto en el último corte. Volver a ejecutarlo al cerrar la implementación.

No ejecutado: importación/publicación n8n, prueba integrada n8n → agente → MCP desde la API de AWS, standby HTTP, consultas documentales de regresión con generación nueva, activación pública, ensayo de reversión y comprobación tras reinicio. No declarar la integración completada.

## Errores resueltos y precauciones de reanudación

- `pg_stat_ssl` del backend del pooler devolvió false, aunque el cliente verificó TLS 1.3 y el certificado. El guard no confunde ese salto interno con la verificación del cliente; `rejectUnauthorized=true`, CA y `servername` siguen obligatorios.
- `SET LOCAL ROLE cloud_mcp_reader` desde el administrador fue rechazado. No se concedieron membresías para sortearlo; la auditoría se hizo con el login real del lector.
- El primer bootstrap habilitó el login, pero falló al inspeccionar una tabla académica por nombre en un esquema al que el lector no tiene USAGE. La revisión automática rechazó repetir el bootstrap mutable con estado incierto. Se sustituyó por auditoría exclusivamente de lectura y comprobaciones por OID: guard, login, TLS y denegación de permisos confirmados, sin ampliar privilegios. **No volver a ejecutar el bootstrap mutable.**
- El primer stage se detuvo tras copiar código porque el unit asumía `/usr/bin/node`. Se verificó `/usr/local/bin/node` y se corrigió únicamente el servicio, comprobando fuentes y respaldo. No repetir el stage completo sobre ese respaldo existente.
- Una alternativa de transporte en memoria no negoció el protocolo moderno fijado del SDK. Se retiró por completo esa prueba; se conservó stdio. Sus fallos exploratorios no son pruebas de la integración desplegada.
- Computer Use informa el foco de Brave de forma inconsistente. `set_value` sobre el control exacto CloudShell funcionó; verificar visualmente el comando pendiente antes de Enter. No repetir una mutación tras un resultado incierto.

## Archivos privados y respaldo para retomar

Sin contraseñas en este documento:

- Respaldo remoto: `/opt/banuchat/backups/managed-mcp-20261119-01`. Contiene fuentes originales, manifiesto y `caddy-before-n8n`. El manifiesto registra la corrección de ruta de Node. No sobrescribirlo.
- Clave de transferencia temporal: `/run/banuchat-mcp-bootstrap/transfer.key`, privada de root; desaparecerá con reinicio. La configuración ya fue descifrada y guardada, por lo que no hace falta repetir la transferencia.
- Configuración privada del operador en Windows: `%APPDATA%\BanuChatManagedMcp`, ACL limitada al usuario. El archivo `acceso-n8n-privado.txt` sirve para la primera protección HTTPS. No compartirlo ni incorporarlo al paquete académico.
- Scripts, archivos cifrados y resultados de trabajo: `infra/local/managed-mcp*`, `audit-managed-mcp-reader.mjs`, `prepare-managed-mcp*`, `resume-managed-n8n-stage.py`, `configure-managed-mcp-private.py`, `verify-managed-mcp-baseline.ps1`. Son archivos ignorados; inspeccionar su propósito antes de ejecutar.
- Las credenciales sintéticas existentes se reutilizaron por su procedimiento privado; no restablecerlas ni aprovisionar cuentas nuevas para retomar.

Comandos SSM relevantes para consultar resultados, no para reenviar:

| Operación | CommandId |
| --- | --- |
| Preflight servicios y capacidad | `a1aa00e3-fe4f-4ebf-830e-ded585de602e` |
| Instalación n8n | `743ff5e4-9259-451b-8c2c-c57be90f9abc` |
| Descubrimiento Node e importación CLI | `c5ca2f84-047d-4656-8d78-ac7dfd086a5c` |
| Stage con guard de Node fallido | `15ccf058-73a1-456d-8a9c-51619b7adfba` |
| Corrección del servicio y arranque n8n | `a316367a-b57f-4c37-913e-c9765e5191cd` |
| Configuración cifrada y proxy HTTPS | `c5ad99dd-0953-4234-8585-1cf2c12b0c37` |

## Continuación únicamente cuando el usuario avise

1. Revisar Git y este checkpoint; no recrear laboratorios, roles ni instalación n8n.
2. Comprobar Lab, crédito, EC2 y servicios. No asumir disponibilidad porque la URL respondió en esta ventana.
3. Verificar el acceso y la cuenta propietaria de n8n. El usuario indicó que dejó n8n abierto y Brave mostró el panel de workflows vacío; **no se confirmó mediante metadatos que el propietario haya completado todos los pasos**. Puede seguir pendiente el setup.
4. Verificar hashes remotos y aplicar solo los últimos ajustes locales pendientes, con respaldo adicional del archivo del agente existente.
5. Respaldar SQLite y su configuración cifrada; importar la credencial preparada y el único workflow conversacional, publicarlo y comprobar admisión autenticada/denegación sin token. No importar los timers antiguos.
6. Arrancar la API de comprobación 3005 con configuración administrada, sin sustituir 3004. Probar login, progreso, expediente, agente multifuente, citas/historial, revocación y aislamiento. Contrastar una consulta documental con el RAG aprobado.
7. Solo después, activar la composición en la API original con configuración revisada y reversión preparada. No deshabilitar las guardias de Unified ni dar acceso de tablas académicas al lector.
8. Capturar el workflow real y las trazas correlacionadas saneadas, comprobar rendimiento/recursos y actualizar la guía de presentación para distinguir lo efectivamente publicado de lo local.

Al pausar no se apagó, terminó ni recreó la EC2, ni se detuvieron los servicios existentes. El apagado del PC no apaga automáticamente AWS; Academy y la EC2 pueden seguir consumiendo crédito mientras permanezcan activos. No se asume autorización para cambiar el estado del laboratorio en nombre del usuario.

## Avance efectivo al reanudar el 20/11/2026

- El arranque realizado por el propietario dejó EC2 running con la misma IP y los cinco servicios activos/habilitados. HTTPS externo: BanuChat 200, n8n 401 sin Basic Auth y certificado verificado en ambos.
- Se confirmó un propietario n8n configurado. Se respaldaron SQLite y su configuración cifrada en `backups/managed-mcp-20261119-01/n8n-before-import`, con permisos privados.
- Se importaron una credencial y exclusivamente `BanuChatOe4Conversation1`; se publicó el workflow y se comprobó su diagrama de cinco nodos en Brave. No se importaron temporizadores. El staging de credencial se sustituyó por una constancia sin secreto después de importarlo.
- Pruebas reales del webhook por loopback: dos fuentes autorizadas, tres requieren aclaración y petición sin token rechazada con 403. Caddy mantiene bloqueado el acceso público a los webhooks.
- Los cuatro ajustes de fuentes/units pendientes se aplicaron con hashes previos y respaldo adicional `resume-20261120`. El primer intento se detuvo antes de escribir por una diferencia de saltos de línea; el segundo terminó correctamente.
- La API de ensayo en 3005 necesitaba también el archivo privado original `/etc/banuchat/api.secret`. Se corrigió únicamente su unit, sin copiar ni mostrar secretos. Arrancó y devolvió 401 sin sesión.
- Ensayo integrado real en 3005: login de dos cuentas; ocho lecturas protegidas 200; consulta multifuente en **1418 ms**, cuatro citas persistidas en historial; conversación ajena 404; selector arbitrario 400; logout y comprobación de revocación 401. CommandId `0c28ee2d-9ea5-412e-9390-918800ae5602`, estado Success. Las credenciales sintéticas se transportaron cifradas con una clave de transferencia temporal; no en texto plano en comandos.
- Typechecks API/MCP repetidos correctamente y focales 12/12 API y 17/17 MCP, sin acceso de escritura a datos para estas suites.
- La regresión documental de una pregunta nueva falló una aserción del ensayo; se está contrastando el resultado antes de activar el servicio público. No se acredita todavía esta regresión ni la activación.
- Dos interrupciones de Computer Use por no poder verificar la URL no modificaron el servicio público. El usuario volvió a abrir n8n y autorizó continuar. El resultado integrado anterior se recuperó de CloudShell, no se supuso por el checkpoint.

Al momento de este corte, la API original 3004 conserva su configuración anterior y no se ha añadido el drop-in de activación. No declarar MCP público ni integración completada hasta validar y actualizar este estado. Los resultados privados del ensayo están en `/run/banuchat-mcp-validation`; esa ubicación desaparece al reiniciar. Conservar evidencia saneada persistente al finalizar.

## Cierre posterior al corte de reanudación

Se resolvió la aserción documental y se corrigió una diferencia real de etiquetas entre respuesta MCP e Historial. Se activó la composición, se ensayó su reversión y se reactivó con éxito. Prueba pública final: dos cuentas, agente con cuatro citas preservadas, generación documental nueva con tres fuentes y tres hashes, aislamiento y revocación. n8n persistió tras reinicio. Consultar el checkpoint final para tiempos, límites y resultados actuales; los párrafos anteriores describen sus cortes históricos.
