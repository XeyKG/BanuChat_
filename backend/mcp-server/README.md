# MCP Server

Servidor MCP que expone herramientas para:

- PostgreSQL
- pgvector
- Google Sheets

## Responsabilidades

- invocación de herramientas estructuradas
- acceso seguro a datos externos
- conexión con motores semánticos y de consulta
- normalización de resultados para el agente

## Especificación previa a implementación

- [`tools-contract.md`](tools-contract.md): comportamiento, reglas de selección, seguridad, errores y criterios de aceptación.
- [`tools.contract.json`](tools.contract.json): nombres, anotaciones y JSON Schemas de entradas y salidas.

El contrato inicial define cuatro tools de solo lectura:

- `search_institutional_knowledge`
- `find_official_documents`
- `get_academic_calendar`
- `get_student_course_history`

No se implementan herramientas de SQL arbitrario, lectura libre de hojas de cálculo ni mutaciones administrativas.
