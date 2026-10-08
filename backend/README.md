# Backend de BanuChat

El backend implementa la frontera síncrona **Mobile → REST Backend API → Intent
Router determinista → servicios/renderers o Document RAG directo**. La app consume
solo REST. N8N queda fuera de esta ruta y ya orquesta la ingesta manual asíncrona.

- [api/](api/README.md): servidor REST, Intent Router `1.2.0-draft`, servicios de
  progreso/calendario/anuncios, renderers estructurados y estáticos, retrieval,
  generación Document RAG, historial y artefactos documentales.
- [rag/](rag/README.md): core de ingesta TypeScript, preflight, chunking, embeddings,
  publicación, recovery/retry explícitos, controles de aprobación/procedencia y
  servicio HTTP interno con startup. Su recorrido manual N8N fue validado en N3.
  El flujo conversacional Document RAG está implementado en `api/`.
- [mcp-server/](mcp-server/README.md): contrato congelado de seis tools; todavía no
  existe servidor MCP ejecutable ni tools integradas al fallback.

PostgreSQL + pgvector contiene la representación procesada de `/data/synthetic`.
Ollama es el runtime local: `qwen3-embedding:0.6b` genera embeddings de 1024
dimensiones; PostgreSQL/pgvector realiza búsqueda exacta por coseno;
`qwen3:4b-instruct` genera las respuestas Document RAG.

La [arquitectura objetivo](../docs/arquitectura.md) conserva Agent/ReAct como cliente
MCP y la reutilización de servicios de aplicación por sus tools. Su implementación
e integración siguen pendientes. No existe integración institucional.
