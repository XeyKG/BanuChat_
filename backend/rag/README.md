# RAG

Estado: diseño, sin código ni ingesta ejecutada. Este directorio contendrá la lógica
TypeScript de ingesta, chunking, embeddings y retrieval sobre `/data/synthetic`,
fuente de verdad versionada. PostgreSQL + pgvector conserva derivados por release.

N8N orquesta; no implementa esa lógica. Según el
[ADR 0005](../../docs/adr/0005-ingesta-reproducible-n8n.md), un adaptador HTTP privado
previsto invocará el componente controlado: preflight de revisión aprobada, schemas,
hashes/relaciones, configuración efectiva, intentos/items, procesamiento y publicación.
No es una ruta REST pública, tool MCP, webhook público ni Execute Command.
El [diseño completo](../../docs/ingesta-reproducible.md) fija controles y retries;
el [plan](../../eval/ingestion/plan.md) describe pruebas todavía no ejecutadas.

Embeddings del MVP: Ollama local, `qwen3-embedding:0.6b`, 1024 dimensiones,
`cosine`, búsqueda exacta sin HNSW/IVFFlat. Registrar digest/runtime y parámetros
efectivos; PostgreSQL deriva config_sha256. El LLM generador sigue abierto.

Documentos `full_document`: cero chunks y embeddings; artefacto completo verificado
resuelto posteriormente por la ruta REST interna aprobada, nunca una URL externa.
Propuesta chunked v1: una sección H2 por chunk, sin overlap, ordinal desde cero;
auditoría estima 60 chunks para los diez documentos actuales, sin generarlos aquí.

Las respuestas citan evidencia verificable documental o estructurada. Ante evidencia
insuficiente se declara la limitación. No se ingiere historial conversacional ni se
modifican fuentes desde el componente. No hay librerías, handlers o servicios creados.
