# Base de datos

Una instancia PostgreSQL 16 con pgvector almacenará relaciones y embeddings.
Su contenido funcional se deriva exclusivamente de `/data/synthetic`, la fuente de
verdad versionada. El calendario procede de `/data/synthetic/calendars`.

## Borrador existente

`001_initial_schema.sql` se conserva íntegro y no se ejecuta en esta etapa.
Describe fuentes, documentos, versiones, chunks, modelos, embeddings, ingestas,
perfiles, conversaciones, citas y recuperaciones.

Requiere revisión en la siguiente etapa de diseño:

- Eliminar la admisión de datos no sintéticos y exigir marca y procedencia sintéticas.
- Sustituir supuestos de fuentes reales por referencias al dataset versionado.
- Diseñar calendario e historial de cursos sintéticos.
- Resolver vigencia e inmutabilidad de versiones y consistencia de citas.
- Alinear trazas y recuperación con los contratos MCP todavía abiertos.

La dimensionalidad y el proveedor/modelo de embeddings siguen pendientes.
La búsqueda coseno y los registros propuestos apoyarán OE1; no se han medido las
métricas RAGAS ni se ha validado la migración contra una base en ejecución.

Los cambios de esquema se versionan. Antes de revisar el archivo inicial debe
verificarse si fue aplicado en algún entorno; una migración aplicada no se reescribe.
