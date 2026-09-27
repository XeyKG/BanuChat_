# BanuChat

Prototipo académico en Fase 1 — Análisis y Diseño. Existen documentación, contratos
y un esquema físico inicial. La migración y la suite SQL A–K fueron ejecutadas en
PostgreSQL local desechable; esto no significa que las aplicaciones o la ingesta
estén implementadas. Véase [validación SQL](infra/db/tests/README.md).

## Arquitectura vigente

- Mobile (React Native + TypeScript) → REST Backend API → Intent Router → fast path / Agent-RAG.
- Fast path usa servicios compartidos; el fallback usa Agent/RAG + MCP interno.
  La app nunca consume MCP ni N8N directamente.
- Una sola instancia PostgreSQL con pgvector almacena representaciones procesadas.
- `data/synthetic/` es la fuente de verdad versionada de todos los datos funcionales.
- N8N orquesta la ingesta asíncrona de releases sintéticas completas.
- Desarrollo y demostraciones iniciales mediante Docker Compose local.

No se utilizan infraestructura, APIs, sitios ni datos reales de UNAB/CCD.
Google Sheets queda fuera del MVP. El LLM generador sigue pendiente; embeddings del
MVP usa Ollama local + `qwen3-embedding:0.6b`, 1024 dimensiones y `cosine`.
La autenticación local y las notificaciones push reales siguen pendientes de diseño.

Consulta [AGENTS.md](AGENTS.md), [arquitectura](docs/arquitectura.md) y
[ADR de alcance](docs/adr/0001-alcance-sintetico-y-despliegue-local.md).
La configuración local se describe en [infra](infra/README.md); `.env.example` no
contiene credenciales utilizables.
