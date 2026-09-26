# API REST — especificación

Contrato REST v1 propuesto para la futura app React Native, con base `/api/v1`.
Este directorio no implementa servidor, handlers ni agente.

- [OpenAPI 3.1.0](openapi.yaml): contrato `1.0.0-draft`, serializado en JSON
  (subconjunto de YAML 1.2) para facilitar validación local sin dependencias.
- [Contrato humano](api-contract.md): endpoints, citas, consistencia, errores,
  reintentos y trazabilidad con PostgreSQL y MCP 2.0.

Los mensajes pasarán por Intent Router: servicio compartido + renderer determinista
si hay una intención segura, o Agent/RAG como fallback. La clasificación no usa LLM,
embeddings ni N8N; el fast path no llama a MCP. Las consultas directas podrán usar
los mismos servicios compartidos con MCP sin pasar por el agente. La app consume únicamente REST,
nunca MCP ni N8N. Solo se emplean perfiles y datos sintéticos de demostración.
No se incluye autenticación institucional ni catálogo REST de cursos en v1.

- [Especificación del router](../../docs/enrutamiento-intenciones.md) y
  [ADR 0004](../../docs/adr/0004-enrutamiento-determinista-intenciones.md).
- [Catálogo declarativo](intent-routing.catalog.json) y
  [JSON Schema Draft 2020-12](intent-routing.schema.json), que valida catálogo y casos.
- [Casos de diseño](../../eval/intent-routing/cases.json): expectativas de clasificación,
  no resultados ejecutados ni preguntas RAGAS. No se implementa código productivo.
