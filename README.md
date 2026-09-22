# BanuChat

Estructura base del monorepo para la plataforma BanuChat.

## Arquitectura

- Backend: API REST, orquestación del agente y servicios de RAG.
- MCP Server: exposición de herramientas sobre PostgreSQL, pgvector y Google Sheets.
- N8N: automatización del scraping, sincronización del calendario y BPM.
- Mobile: aplicación React Native.
- Infra: contenedores y base de datos on-premise.
- Docs: documentación y ADRs.
- Eval: evaluaciones y datasets.
