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

La evidencia E2E real de ingesta registró 76 items procesados, 12 versiones
documentales ready, 60 chunks y 60 embeddings con Ollama y
`qwen3-embedding:0.6b`; una segunda ejecución devolvió `already_current`. Esta
evidencia no evalúa calidad RAG ni acredita procedencia operacional automática del
runtime, porque utilizó una `implementation_revision` sintética de prueba. Véanse
[la evidencia E2E](eval/ingestion/results/implementation-3-e2e-2026-09-29.md) y
[la validación separada de recovery/retry](eval/ingestion/results/implementation-4-recovery-retry-2026-09-29.md).

Todavía faltan la composición/startup operacional del HTTP interno, la decisión
final de topología/bind Docker-host y la integración funcional de N8N. También
siguen pendientes el Intent Router, Application Services, REST, retrieval y
Agent/MCP productivos, el generador LLM, la app móvil y las evaluaciones
RAGAS/MRR/con usuarios. El MVP completo no está terminado.

## Arquitectura vigente

- Mobile (React Native + TypeScript) → REST Backend API → Intent Router → fast path / Agent-RAG.
- Fast path usa servicios compartidos; el fallback usa Agent/RAG + MCP interno.
  La app nunca consume MCP ni N8N directamente.
- Una sola instancia PostgreSQL con pgvector almacena representaciones procesadas.
- `data/synthetic/` es la fuente de verdad versionada de todos los datos funcionales.
- N8N orquestará de forma asíncrona la ingesta; su workflow operacional sigue pendiente.
- Desarrollo y demostraciones iniciales mediante Docker Compose local.

Google Sheets queda fuera del MVP. El LLM generador sigue pendiente; embeddings del
MVP usa Ollama local + `qwen3-embedding:0.6b`, 1024 dimensiones y `cosine`.
La autenticación de usuarios finales y las notificaciones push reales siguen
pendientes; el Bearer token del HTTP interno es una credencial entre servicios y
no equivale a autenticación de usuarios de la app.

Consulta [AGENTS.md](AGENTS.md), [arquitectura](docs/arquitectura.md) y
[ADR de alcance](docs/adr/0001-alcance-sintetico-y-despliegue-local.md).
La configuración local se describe en [infra](infra/README.md); `.env.example` no
contiene credenciales utilizables.
