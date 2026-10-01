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

La evidencia E2E real de ingesta registró 76 items procesados, 12 versiones
documentales ready, 60 chunks y 60 embeddings con Ollama y
`qwen3-embedding:0.6b`; una segunda ejecución devolvió `already_current`. Esta
evidencia no evalúa calidad RAG ni acredita procedencia operacional automática del
runtime, porque utilizó una `implementation_revision` sintética de prueba. Véanse
[la evidencia E2E](eval/ingestion/results/implementation-3-e2e-2026-09-29.md) y
[la validación separada de recovery/retry](eval/ingestion/results/implementation-4-recovery-retry-2026-09-29.md).

Una muestra warm exploratoria versionada de cinco solicitudes HTTP exitosas observó
media de 12195.50 ms, mediana de 12353.39 ms, mínimo de 10820.68 ms y máximo de
13511.09 ms; 0/5 estuvieron por debajo de la referencia histórica de 5000 ms. Es una
muestra acotada, no un benchmark exhaustivo ni evidencia de cumplimiento de OE6.
Véase [la evidencia warm](eval/generation/results/g2-rag-e2e-smoke-2026-10-01.md).

Todavía faltan la composición/startup operacional del HTTP interno de ingesta, la
decisión final de topología/bind Docker-host y la integración funcional de N8N. En
consulta siguen pendientes el Agent/ReAct real y la integración productiva del MCP
interno al fallback: forman parte de la arquitectura objetivo, pero el vertical
slice actual no los ejecuta ni los necesita para demostrar su recorrido directo.
También faltan los endpoints REST de historial `GET /conversations`,
`GET /conversations/{id}` y `DELETE /conversations/{id}`, el endpoint de artefactos
documentales, la exposición HTTP directa de calendario/progreso/anuncios, la app
móvil terminada, autenticación de usuario final, notificaciones push reales y las
evaluaciones RAGAS completas y con usuarios. El MVP completo no está terminado.

## Arquitectura vigente

- Mobile (React Native + TypeScript) → REST Backend API → Intent Router → fast path / Agent-RAG.
- Fast path usa servicios compartidos; el fallback usa Agent/RAG + MCP interno.
  La app nunca consume MCP ni N8N directamente.
- El vertical slice implementado actualmente se detiene en fast path o Document RAG
  directo; Agent/ReAct y MCP siguen pendientes como arquitectura objetivo.
- Una sola instancia PostgreSQL con pgvector almacena representaciones procesadas.
- `data/synthetic/` es la fuente de verdad versionada de todos los datos funcionales.
- N8N orquestará de forma asíncrona la ingesta; su workflow operacional sigue pendiente.
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
