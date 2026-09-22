# MCP Server

Interfaz interna de herramientas controladas sobre una misma instancia PostgreSQL
con pgvector. El agente actúa como cliente MCP; la app consume únicamente REST.

## Borradores pendientes de revisión

- [Contrato funcional](tools-contract.md).
- [Contrato JSON](tools.contract.json).

Estos archivos se conservan sin cambios y no están congelados. Sus referencias a
Google Sheets, fuentes institucionales, identidad de usuario y trazabilidad deben
revisarse frente a `AGENTS.md`. Google Sheets queda fuera del MVP; el calendario
procede de `/data/synthetic/calendars` y los perfiles son sintéticos.

No se han implementado herramientas ni seleccionado el transporte o la autenticación local.
