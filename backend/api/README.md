# API REST — especificación

Contrato REST v1 propuesto para la futura app React Native, con base `/api/v1`.
Este directorio no implementa servidor, handlers ni agente.

- [OpenAPI 3.1.0](openapi.yaml): contrato `1.0.0-draft`, serializado en JSON
  (subconjunto de YAML 1.2) para facilitar validación local sin dependencias.
- [Contrato humano](api-contract.md): endpoints, citas, consistencia, errores,
  reintentos y trazabilidad con PostgreSQL y MCP 2.0.

Los mensajes usarán Agent/RAG; las consultas directas podrán usar servicios
compartidos con MCP sin pasar por el agente. La app consume únicamente REST,
nunca MCP ni N8N. Solo se emplean perfiles y datos sintéticos de demostración.
No se incluye autenticación institucional ni catálogo REST de cursos en v1.
