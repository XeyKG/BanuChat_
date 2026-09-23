# ADR 0002 Publicaciones sintéticas inmutables

Fecha: 2026-09-22.
Estado: aceptado por revisión arquitectónica del proyecto.

## Contexto

BanuChat necesita consultar un corpus sintético coherente, reproducir evaluaciones y
recuperar las fuentes exactas de respuestas anteriores. `/data/synthetic` es la fuente
de verdad versionada; PostgreSQL + pgvector conserva su representación procesada en
una sola instancia. Modificar contenido publicado puede invalidar citas o mezclar
documentos y registros estructurados de momentos distintos.

## Decisión

- La unidad de publicación es una release completa del dataset, denominada
  `dataset_releases`: archivos de una revisión identificada, manifiesto, receta de
  procesamiento y una configuración reproducible de embeddings.
- Una release se valida completa antes de activarse. Incluye documentos, cursos,
  calendario, convocatorias, perfiles y relaciones del escenario sintético.
- La activación es atómica mediante un único puntero a la release vigente. Un fallo
  de preparación no reemplaza la publicación anterior.
- El contenido y la configuración de una release publicada son inmutables. Cualquier
  modificación produce otra release, incluso si solo cambia el procesamiento o el modelo.
- Retrieval normal consulta exclusivamente la release vigente y su única configuración;
  cada petición mantiene una selección coherente durante su ejecución.
- Las releases históricas y sus fuentes exactas se conservan para citas, trazabilidad
  y evaluación explícita, nunca como fallback automático del retrieval normal.
- Cada chunk tiene un único embedding de la configuración de su release. Conservar
  historia no requiere servir múltiples espacios vectoriales simultáneamente.

## Consecuencias

Se acepta duplicar contenido y derivados entre releases, así como el coste de validación
y reprocesamiento, para simplificar consistencia y reproducibilidad en el corpus pequeño
del MVP. Retirar un documento consiste en omitirlo de la siguiente publicación completa,
sin editar la anterior. Las citas mantienen su release y localizador históricos.

La revisión fuente y la configuración deben conservarse; la reproducción exacta de
vectores puede requerir artefactos si un proveedor no ofrece revisiones estables.
Un eventual retorno a una release anterior exige que pueda operarse con su configuración
compatible. No se decide aquí cómo almacenar dimensiones vectoriales diferentes.

El modelo y dimensión concretos de embeddings, y después el DDL físico, siguen pendientes.
Este ADR no define SQL, índices, migraciones ni contratos MCP, ni autoriza su implementación.
El [modelo lógico candidato](../modelo-datos.md) desarrolla las entidades y restricciones.

## Alternativas descartadas para el MVP

- **Actualización en sitio:** altera evidencia ya citada y dificulta reproducir resultados.
- **Publicación independiente por documento:** permite mezclar revisiones documentales con
  cursos, calendario y relaciones de otra publicación; complica definir un estado coherente.
- **Delta-sync:** reduce duplicación, pero introduce dependencias entre publicaciones,
  reconciliación de cambios y mayor complejidad de reconstrucción sin necesidad demostrada.

Revisitar esas alternativas requiere evidencia de costes o volumen y una nueva decisión;
no se incorporan anticipadamente al MVP.
