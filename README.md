# BanuChat

BanuChat es un proyecto de grado de Ingeniería de Sistemas, actualmente en
implementación incremental de su MVP. Usa exclusivamente un corpus sintético
versionado en `data/synthetic/`; PostgreSQL + pgvector conserva su representación
procesada. No se utilizan infraestructura, APIs, sitios ni datos reales de UNAB/CCD.

## Estado actual

Ya están implementados y validados por etapas la migración PostgreSQL + pgvector,
el dataset sintético v1 y el core de ingesta: preflight, 64 registros estructurados,
documentos/chunking, embeddings, publicación atómica, recovery/retry, registro de
aprobaciones y verificaciones de procedencia. También existen el servicio interno
`execute`/`retry`/`recover`/`status`, su transporte HTTP, autenticación Bearer con
token de servicio y el parser de configuración operacional.

El vertical slice conversacional RAG real también está implementado: la API REST
expone `GET /api/v1/profiles`, `POST /api/v1/conversations` y
`POST /api/v1/conversations/{id}/messages`; el Intent Router determinista deriva a
los fast paths de progreso, calendario y anuncios o al fallback documental. Ese
fallback implementado es Document RAG directo sobre PostgreSQL + pgvector y Ollama,
con retrieval exacto, generación mediante `qwen3:4b-instruct`, citas documentales y
persistencia de mensajes y citas. Su E2E real obtuvo HTTP 201.

La E2E de ingesta de Implementación 3 registró 76 items, 12 versiones documentales,
60 chunks y 60 embeddings, pero usó una `implementation_revision` sintética de prueba.
Después, N0 validó localmente startup y `/status`; N2 versionó e importó el workflow
manual; N3 ejecutó ese workflow E2E local: `not_started` llevó a `/execute`, publicó
una release `ready/current` con 76 items, 12 `document_versions` y 60 embeddings.
La segunda ejecución devolvió `already_current` sin crear otra release ni run. Véase
[la evidencia N3](eval/ingestion/results/n3-n8n-e2e-2026-10-02.md), además de [la
E2E de Implementación 3](eval/ingestion/results/implementation-3-e2e-2026-09-29.md) y
[recovery/retry](eval/ingestion/results/implementation-4-recovery-retry-2026-09-29.md).

Una muestra warm exploratoria versionada de cinco solicitudes HTTP exitosas observó
media de 12195.50 ms, mediana de 12353.39 ms, mínimo de 10820.68 ms y máximo de
13511.09 ms; 0/5 estuvieron por debajo de la referencia histórica de 5000 ms. Es una
muestra acotada, no un benchmark exhaustivo ni evidencia de cumplimiento de OE6.
Véase [la evidencia warm](eval/generation/results/g2-rag-e2e-smoke-2026-10-01.md).

N0 validó startup y `/status`; N2 agregó e importó el workflow manual; N3 lo ejecutó
E2E localmente. La consulta `not_started` llevó a `/execute` y publicó una release
`ready/current`; la segunda ejecución devolvió `already_current` sin crear otra
release o run. Sigue pendiente una topología portable para futuros despliegues y
siguen fuera de alcance los flujos N8N de retry/recover/scheduled. Véase [evidencia
N3](eval/ingestion/results/n3-n8n-e2e-2026-10-02.md). En
consulta siguen pendientes el Agent/ReAct real y la integración productiva del MCP
interno al fallback: forman parte de la arquitectura objetivo, pero el vertical
slice actual no los ejecuta ni los necesita para demostrar su recorrido directo.
También están implementados en el servidor REST los endpoints de historial
`GET /conversations`, `GET /conversations/{id}` y `DELETE /conversations/{id}`, el
endpoint de artefactos documentales y la exposición HTTP directa de
calendario/progreso/anuncios. El MVP móvil de demostración con selección de perfiles
sintéticos, chat, citas, calendario y progreso está implementado y fue validado
manualmente en Android físico. Siguen pendientes la autenticación de usuario final,
las notificaciones push reales, las evaluaciones RAGAS completas y las pruebas
formales con usuarios. El MVP académico completo no está terminado. Véase el
[checkpoint M1–M5, J1 y J2](eval/integration/results/j3-checkpoint-2026-10-03.md).

## Arquitectura actual y objetivo

- Mobile (Expo + React Native + TypeScript) → REST Backend API → Intent Router
  determinista → fast path estructurado o Document RAG directo.
- El fast path usa servicios de aplicación y PostgreSQL; Document RAG usa
  PostgreSQL + pgvector y Ollama. La app consume solo REST.
- Agent/ReAct y MCP interno siguen pendientes dentro de la arquitectura objetivo.
- Una sola instancia PostgreSQL con pgvector almacena representaciones procesadas.
- `data/synthetic/` es la fuente de verdad versionada de todos los datos funcionales.
- N8N orquesta de forma asíncrona la ingesta; el workflow manual v1 fue validado E2E
  localmente. Retry/recover/scheduled permanecen pendientes.
- Desarrollo y demostraciones iniciales mediante Docker Compose local.

Google Sheets queda fuera del MVP. El generador implementado usa Ollama local con
`qwen3:4b-instruct`; embeddings usa `qwen3-embedding:0.6b`, 1024 dimensiones y
`cosine`.
La autenticación de usuarios finales y las notificaciones push reales siguen
pendientes; el Bearer token del HTTP interno es una credencial entre servicios y
no equivale a autenticación de usuarios de la app.

Consulta [AGENTS.md](AGENTS.md), [arquitectura](docs/arquitectura.md) y
[ADR de alcance](docs/adr/0001-alcance-sintetico-y-despliegue-local.md).
La configuración local se describe en [infra](infra/README.md); `.env.example` no
contiene credenciales utilizables.
