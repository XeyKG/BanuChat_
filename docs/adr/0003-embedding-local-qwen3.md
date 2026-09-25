# ADR 0003 Embeddings locales con Qwen3

Fecha: 2026-09-25.
Estado: aceptado por decisión explícita del proyecto para el MVP.

## Contexto

El modelo lógico aprobado usa una configuración de embeddings por release y un embedding
por chunk. Para concretar el esquema físico hace falta fijar dimensión y métrica sin
introducir múltiples espacios operacionales ni servicios de pago. El corpus sigue siendo
exclusivamente sintético y versionado en `/data/synthetic`.

## Decisión

- Ejecutar embeddings localmente mediante Ollama con `qwen3-embedding:0.6b`.
- Usar 1024 dimensiones y distancia/similitud coseno en PostgreSQL + pgvector.
- Persistir el embedding dentro de `document_chunks` como `vector(1024)`.
- Mantener búsqueda exacta; no crear HNSW ni IVFFlat en el MVP inicial.
- Registrar una configuración reproducible por release: revisión/digest local del modelo,
  versión de runtime, parámetros, preprocesamiento de documentos/consultas y hash.
- Crear el registro mediante la futura ingesta al conocer esos valores efectivos, sin seed
  con revisión o hash inventados. La migración fija mediante DEFAULT/CHECK el modelo aprobado.
- Cambiar la configuración exige una release nueva; otra dimensión exige además una decisión
  y migración física posteriores. No se prepara soporte multidimensional simultáneo.

La selección afecta solo al embedding. El proveedor/modelo del LLM generador sigue abierto.
No se instala Ollama, descarga el modelo, genera vectores ni modifica Compose en esta tarea.

## Razones y consecuencias

Una configuración local única reduce variables del experimento y permite concretar el
esquema sin servicios adicionales. Conservar revisión, receta y artefactos facilita
reproducibilidad: el nombre/tag por sí solo no garantiza el mismo modelo en el futuro.
La capacidad, latencia y calidad en el hardware del equipo deben medirse, no suponerse.

No se afirma superioridad objetiva frente a otros modelos. La elección podrá reevaluarse
con el conjunto sintético de `/eval` y las métricas OE1: faithfulness ≥ 0.80,
context precision ≥ 0.80, context recall ≥ 0.75, answer relevancy ≥ 0.80 y MRR ≥ 0.70.
También se medirá latencia; esta decisión no demuestra el cumplimiento de ningún umbral.

## Alternativas consideradas

- Otros modelos locales: reevaluables si el conjunto de pruebas o el hardware lo justifican.
- Proveedores remotos de embeddings: no necesarios para la configuración local aprobada;
  su uso requeriría una decisión explícita, no una dependencia introducida por el esquema.
- Dimensión variable o varias configuraciones en retrieval simultáneo: complejidad innecesaria
  para el MVP; historia no equivale a mezclar espacios vectoriales en una búsqueda.
- Índices aproximados: diferidos hasta medir volumen, latencia y efecto sobre recuperación.

## Referencias

- [Modelo publicado en Ollama](https://ollama.com/library/qwen3-embedding:0.6b).
- [Operadores y tipo vector de pgvector](https://github.com/pgvector/pgvector#reference).
- [ADR 0002: publicaciones inmutables](0002-publicaciones-sinteticas-inmutables.md).
- [Esquema y límites de validación](../../infra/db/README.md).
