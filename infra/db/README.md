# Base de datos

Migraciones versionadas para PostgreSQL 16 con la extensión pgvector.

## Migraciones

| Archivo | Propósito |
| --- | --- |
| `001_initial_schema.sql` | Crea el esquema relacional, el corpus documental, los embeddings, la trazabilidad de ingesta, las conversaciones, las citas y el registro de recuperaciones. |

Las migraciones se ejecutan en orden ascendente y una sola vez por entorno. No deben editarse después de aplicarse; cualquier cambio posterior se incorpora en un archivo nuevo.

## Decisiones del diseño inicial

- El esquema de aplicación es `banuchat`.
- Cada documento lógico conserva versiones inmutables identificadas por SHA-256.
- Los chunks almacenan sección, ruta de sección y páginas para producir citas verificables.
- Las guías de cátedra usan la política `full_document_link`; un trigger impide crear chunks para ellas.
- Los embeddings se almacenan con el tipo `vector` de pgvector.
- El modelo y su dimensionalidad se registran en `embedding_models`; un trigger rechaza vectores incompatibles.
- La búsqueda inicial usa distancia coseno exacta mediante `banuchat.search_chunks_cosine`.
- No se crea todavía un índice HNSW o IVFFlat porque el anteproyecto no fija modelo ni dimensión. Cuando esa decisión se apruebe, se añadirá una migración con una columna tipada o un índice parcial por modelo.
- Los perfiles estudiantiles son sintéticos o seudonimizados. Un registro no sintético exige una referencia a la base legal o al consentimiento aplicable.
- Ninguna tabla almacena credenciales, API keys ni tokens.

## Cobertura de OE1

El esquema permite:

- indexar un corpus institucional con PostgreSQL y pgvector;
- recuperar chunks por similitud coseno aunque la consulta no coincida literalmente con el documento;
- conservar documento, versión, sección y páginas para validar faithfulness;
- registrar el ranking y la distancia de cada recuperación;
- etiquetar relevancia para calcular context precision, context recall y MRR sobre el dataset de evaluación de 50 a 80 preguntas.

Los datasets y scripts de RAGAS permanecen en `eval/`; la base de datos solo conserva la evidencia necesaria para reproducir una recuperación.

## Aplicación prevista

La migración debe ejecutarse contra el servicio PostgreSQL que incluya pgvector. El `docker-compose.yml` actual define dos instancias separadas (`postgres` y `pgvector`); antes de implementar se debe decidir cuál será la instancia canónica para evitar dividir datos relacionales y vectoriales sin una necesidad sustentada.
