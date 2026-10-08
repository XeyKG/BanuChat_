# MCP Server

Contrato de una interfaz interna prevista sobre una misma instancia PostgreSQL
con pgvector. En la arquitectura objetivo, Agent/ReAct será cliente MCP; la app
consume únicamente REST. El fallback actual ejecuta Document RAG directo sin MCP.

## Contrato de interfaces 2.0.0-draft

- [Contrato funcional](tools-contract.md).
- [Contrato JSON](tools.contract.json).

Catálogo congelado por autorización expresa para la siguiente implementación:
search_knowledge, find_documents, get_courses, get_calendar_events,
get_announcements y get_profile_progress, en ese orden.

Las seis tools son de solo lectura sobre la release vigente del corpus sintético;
devuelven release_id y procedencia reproducible. El perfil de demostración procede
del contexto controlado del backend, no de un argumento del agente. No hay fuentes
externas, selección histórica ni escrituras de corpus. El calendario procede de
`/data/synthetic/calendars`. La API REST ya resuelve artefactos documentales para la app.

Solo existen los contratos: todavía no hay servidor MCP ejecutable ni implementación
de estas seis tools. Su transporte, autenticación interna e integración con
Agent/ReAct siguen pendientes; los servicios REST existentes no equivalen a tools MCP.
