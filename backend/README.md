# Backend

Frontera síncrona: Mobile → REST Backend API → Agent/RAG.

- `api/`: única API pública que consume la aplicación móvil.
- `rag/`: procesamiento y recuperación del corpus sintético.
- `mcp-server/`: servidor interno de herramientas controladas; el agente es su cliente.

PostgreSQL contiene representaciones procesadas de `/data/synthetic`.
N8N participa en automatizaciones asíncronas. Esta fase define el diseño;
no hay implementación ni proveedor/modelo LLM seleccionado.
