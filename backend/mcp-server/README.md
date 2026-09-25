# MCP Server

Interfaz interna de herramientas controladas sobre una misma instancia PostgreSQL
con pgvector. El agente actúa como cliente MCP; la app consume únicamente REST.

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
`/data/synthetic/calendars`. La futura REST resolverá los archivos para la app.

No se han implementado herramientas ni seleccionado el transporte o la autenticación local.
