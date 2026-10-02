# N0 — Preparación operacional local

## Alcance

Registro de la preparación operacional local ya ejecutada. El startup y la
composición del servicio de `backend/rag` existían antes de N0; N0 los validó
operacionalmente, sin cambiar código ni ejecutar una ingesta.

## Entorno observado

Runtime checkout principal en Windows, Docker Desktop y Compose vigente. El servicio
de ingesta escuchó en `127.0.0.1:3010`. N8N 2.40.5 corrió localmente en el contenedor
`banuchat-n8n`, expuesto en `127.0.0.1:5678`, con el volumen
`banuchat-schema-test_n8n_data`. Estos resultados no describen otro sistema operativo
ni otro despliegue.

## Preparación de fuente y Approval Registry

El source worktree separado quedó detached en
`af7ac711e1da3426e1f5fbe8b2892cec1344ce8b`, revisión aprobada. La primera
materialización Windows tuvo diferencias de bytes en
`data/synthetic/.gitattributes` y `.gitignore`, asociadas a `core.autocrlf=true`;
el verificador rechazó correctamente esa fuente con `SOURCE_REJECTED`. Se recreó el
worktree con `git -c core.autocrlf=false worktree add --detach ...`. La verificación
posterior confirmó HEAD coincidente, working tree limpio, 36 archivos tracked y cero
diferencias de bytes. Es una observación de esa materialización Windows, no una regla
universal.

El Approval Registry local ignorado por Git usó `approval_ref`
`banuchat-synthetic-v1-approved`, `dataset_key` `banuchat-synthetic` y el SHA
aprobado indicado arriba. El SHA-256 bruto aprobado del manifest fue
`39e8f2c94afbddca6cbc4f634b6bb9477eb479b44fc8f52b411fcd439fd5abda`; su referencia
de evidencia fue `git:af7ac711e1da3426e1f5fbe8b2892cec1344ce8b:data/synthetic/HUMAN_REVIEW.md`.
El archivo se verificó ignorado por Git, UTF-8 sin BOM, sin CR y terminado en LF.
`available_at=2026-09-26T14:04:09-05:00` fue una convención operacional ligada al
commit de aprobación del proyecto; no es aprobación institucional UNAB/CCD.

## PostgreSQL aislado

En el contenedor PostgreSQL actual `banuchat-postgres` se creó la base aislada
`banuchat_n8n_test` y se aplicó exactamente `infra/db/001_initial_schema.sql`.
Se verificaron PostgreSQL con pgvector 0.8.6, 16 tablas BanuChat y cero filas de
dataset iniciales. La base normal `banuchat_schema_test` permaneció separada y sin
reemplazo ni renombre. N0 dirigió el servicio a la base aislada con
`BANUCHAT_INGESTION_DATABASE_URL`; este registro no incluye credenciales.

## Startup del servicio de ingesta

`backend/rag/src/main.ts` compone Approval Registry, procedencia de runtime, pool
PostgreSQL, cliente Ollama, servicio de ingesta y servidor HTTP; también registra
shutdown para SIGINT/SIGTERM. Se prepararon localmente las variables operacionales
requeridas, incluido el service token, cuyo valor se omite. Para esta prueba se usó
`BANUCHAT_INGESTION_WORKFLOW_REF=N0_LOCAL_STATUS_ONLY`, únicamente para consultas
`/status`; no es un workflow N8N versionado ni evidencia de `/execute`.

`npm run build` terminó correctamente y `npm run start` informó:
`BanuChat ingestion service listening on http://127.0.0.1:3010`.

## Validación desde host Windows

El POST autenticado a `/internal/ingestion/status`, con el selector aprobado
(`approval_ref`, revisión, `pipeline_version=synthetic-v1-section-v1` y el workflow
de status), respondió HTTP 200, `application/json; charset=utf-8`, `Cache-Control:
no-store`, `X-Content-Type-Options: nosniff` y `outcome=not_started`. Los campos
`release_id`, `run_id`, `attempt_no` y otros campos de ejecución fueron null. Token
incorrecto respondió HTTP 401 con el body saneado
`{"error_code":"UNAUTHORIZED","retryable":false}`.

## Validación desde contenedor N8N

El log informó N8N 2.40.5 accesible localmente. La advertencia de Python task runner
no impidió el caso probado. Desde el contenedor, `host.docker.internal` resolvió,
TCP al puerto 3010 funcionó, HTTP sin token devolvió el 401 esperado y la solicitud
autenticada al mismo selector devolvió HTTP 200, `not_started`, `no-store` y
`nosniff`. Una única consulta `/status` por identidad tardó 10538 ms. Esta ruta hace
verificaciones de procedencia/source checkout; esa duración no es latencia de N8N ni
de ingesta y no es benchmark ni evaluación de métricas académicas. La prueba inicial
con timeout artificial de 5 segundos se abortó al tardar la respuesta alrededor de
10.5 s; DNS, TCP, 401 y 200 se validaron posteriormente.

## Incidencias encontradas

- Diferencias de bytes CRLF/checkout en la primera materialización Windows:
  resueltas recreando el worktree con `core.autocrlf=false`; no son un defecto actual
  acreditado del sistema.
- Timeout artificial de 5 s para `/status`: consulta abortada y luego validada con
  una espera suficiente; no es fallo del servicio ni medida de rendimiento.
- Advertencia de Python task runner de N8N: no afectó el caso probado y no constituyó
  fallo de N0.

## Resultados

Quedaron validados localmente el startup/composición existente, la carga de
configuración operacional, Approval Registry, separación runtime/source checkout,
conexión PostgreSQL durante startup, listener HTTP, autenticación Bearer y `/status`
desde Windows y desde el contenedor N8N local. El resultado fue `not_started`; N0 no
ejecutó ingesta.

## Límites de la evidencia

La evidencia acredita únicamente Windows local + Docker Desktop + Compose actual.
No acredita Linux, servidores futuros, infraestructura UNAB/CCD, producción ni
portabilidad de `host.docker.internal`. Tampoco acredita workflow N8N funcional,
`/execute`, ingesta N8N → HTTP → TypeScript → PostgreSQL/Ollama E2E, rendimiento
general, métricas académicas, ni aprobación institucional. HTTP 200 y `not_started`
no significan ingesta exitosa.

## Trabajo pendiente

- Crear y versionar un workflow N8N ejecutable y ligar `workflow_ref` a su export JSON
  y revisión.
- Validar llamada real `/execute`, ingesta N8N E2E y retry/recovery orquestados.
- Definir topología de despliegue futura y permisos/roles mínimos pendientes.
- Validar cualquier futuro despliegue; no hay despliegue institucional acreditado.
