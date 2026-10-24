# CHECKPOINT BANUCHAT — PREPARACIÓN OE1

Fecha: 24 de octubre de 2026, America/Bogota.

Estado: **dependencias técnicas de preparación cerradas; dependencias humanas
pendientes**. El baseline CCD no se ejecutó y OE1 no se declara cumplido.

## A. Estado real de revisión de las 50 candidatas

No existe todavía un revisor disponible ni un ledger con decisiones reales:

- 50/50 candidatas respondibles permanecen `pending`;
- 8/8 casos complementarios permanecen `pending`;
- 0 aprobadas, 0 corregidas y 0 rechazadas;
- el export privado continúa `incomplete`, con brecha 50;
- no existe holdout válido: las 15 `reserve_candidate` fueron visibles al proceso de
  preparación.

Se generó el paquete privado ignorado por Git
`data/ccd/local/oe1-evaluation/review-packet-v1.md`. Contiene exactamente 50 entradas,
agrupadas por 12 documentos primarios y por `query_type`. Verifica el SHA-256 de los
12 artefactos y presenta pregunta, respuesta, restricciones, periodo, aplicabilidad,
contextos y espacio de decisión. No registra aprobaciones automáticas.

Procedimiento mínimo:

1. El revisor abre el paquete sin consultar resultados de BanuChat.
2. Contrasta cada afirmación con todos los contextos indicados, no solo el documento
   primario del grupo.
3. Comprueba límite temporal, suficiencia, duplicación semántica y restricciones.
4. Ejecuta `review-bank.mjs decide` con identidad, decisión y motivo reales; para una
   corrección usa un JSON privado ignorado por Git.
5. Ejecuta `summary` y `export`. Si quedan menos de 50 aceptadas, conserva la brecha.

## B. Diagnóstico de Answer Relevancy

Los cinco desacuerdos fueron CAL-02, CAL-03, CAL-06, CAL-10 y CAL-11. La pasada
diagnóstica conservó las tres salidas internas que el `AnswerRelevancy` real de RAGAS
genera por caso, sin cambiar prompt, métrica ni umbral.

| Caso | Observación comprobada | Diagnóstico |
| --- | --- | --- |
| CAL-02 | Generó en inglés `What does ... mean?` y marcó 1/1/1 `noncommittal`. | Error claro del juez: la respuesta española era sustantiva. |
| CAL-03 | Repitió el patrón `What does ... mean?` y 1/1/1. | Error del juez, más una expectativa técnica discutible: la respuesta atiende el tema pero es incompleta. La etiqueta humana debe decidirlo. |
| CAL-06 | Generó una pregunta pertinente sobre el color, pero marcó 1/1/1. | Error del juez: una respuesta contradictoria puede ser relevante aunque sea incorrecta. |
| CAL-10 | Preguntó por vigencia actual y marcó 1/1/1 a una cautela temporal. | Conflicto entre la penalización RAGAS de respuestas no concluyentes y la abstención/cautela correcta requerida por BanuChat. Requiere criterio humano. |
| CAL-11 | Produjo la salida degradada `What does USA español mean?` y 1/1/1. | Error de interpretación lingüística del juez. |

Hallazgos transversales:

- las preguntas sintéticas se generaron en inglés en 12/12 casos aunque input y
  respuesta estaban en español;
- los cinco ceros proceden del multiplicador `all_noncommittal`, no de similitud cero
  del embedding;
- `qwen3-embedding:0.6b` sí produjo similitudes no nulas en los siete casos sin esa
  bandera, por lo que no hay evidencia para atribuir los cinco fallos al embedding;
- CAL-03 y CAL-10 exigen ratificación conceptual humana; los otros tres son fallos
  claros del juez/salida estructurada;
- la estabilidad entre pasadas no implica validez: el mismo error fue reproducible.

Conclusión: `qwen3:4b-instruct` **no es todavía suficientemente fiable para aceptar
Answer Relevancy como evidencia académica sin revisión humana**. No se cambió el
umbral, no se modificó RAGAS y no se instaló otro modelo. Antes de justificar otro juez
local debe completarse la revisión humana; solo entonces se sabrá qué desacuerdos son
errores reales y cuáles son etiquetas mal planteadas.

Se añadió una plantilla sintética versionada para revisión ciega. El adaptador acepta
`--human-labels` únicamente si el archivo está `reviewed`, contiene responsable/fecha
reales y coincide con el SHA-256 del fixture.

## C. Correspondencia respuesta-contextos

La versión anterior no la garantizaba: importaba una respuesta y volvía a ejecutar
top-5 retrieval; esos fragmentos podían no ser los entregados al generador.

El runner ahora separa y registra:

| Capa | Evidencia |
| --- | --- |
| Retrieval académico independiente | `cases[].retrieved`, top-5 usado solo para MRR@5, Precision@5, Recall@5 y Hit@5. |
| Retrieval productivo de la respuesta | `cases[].response_evidence.production_retrieval`. |
| Contextos efectivamente entregados | `cases[].response_evidence.generation_contexts`, observados en el prompt productivo o en el renderer determinista. |
| Contextos citados | `cases[].response_evidence.cited_context_ids`, derivados de `citation_records`. |
| Contextos de RAGAS | Copia exacta de `generation_contexts`, con los mismos contenidos y `chunk_id`. |

Con `--capture-responses`, el evaluador llama al `generateDocumentRagAnswer` existente,
envuelve solo sus dependencias para observar retrieval/prompt y delega al generador
real. Verifica que cada cita pertenezca al retrieval productivo y a los contextos usados,
además de registrar SHA-256 de contenido y prompts. No modifica el RAG productivo.

Una captura importada con `--responses` se valida estructuralmente, pero no recibe la
garantía fuerte. El baseline debe usar `--capture-responses`.

## D. Ajustes indispensables realizados

1. Comando `packet` en la herramienta existente; no se creó otro sistema de revisión.
2. Trazabilidad interna de las salidas de Answer Relevancy, conservando la métrica real.
3. Plantilla y validación opcional de etiquetas humanas.
4. Observador evaluativo en proceso para separar retrieval, generación y citas.
5. RAGAS toma contextos de generación, no el retrieval top-5 repetido.

No se modificaron RAG, PostgreSQL/pgvector, publicaciones, embeddings, chunking,
generador, REST, Mobile, autenticación, Docker o N8N.

## E. Pruebas

- Pruebas unitarias Node: 11/11 PASS antes del cierre final de esta tarea.
- Captura sintética: separa dos chunks recuperados, un chunk entregado al generador y
  un chunk citado; RAGAS recibe solamente el entregado.
- Paquete privado: 50 encabezados de caso, 12 grupos documentales, hashes verificados,
  archivo confirmado como ignorado por Git.
- Diagnóstico RAGAS: 12 casos completados, sin errores/timeouts, scores originales
  reproducidos y tres salidas internas registradas por caso.

## F. Condiciones faltantes para ejecutar el baseline

1. Revisión humana real y export `approved`; hoy la brecha es 50.
2. Etiquetas humanas ciegas para los 12 casos y decisión explícita sobre la suficiencia
   del juez para Answer Relevancy.
3. Si el juez se rechaza, justificar y calibrar otro modelo local antes del baseline;
   no sustituirlo durante o después para mejorar resultados.
4. Aceptación académica de MRR@5 como operacionalización de la meta histórica.
5. Creación de un holdout genuino bajo custodia independiente antes de cualquier tuning.
6. Ejecutar el baseline una vez con `--capture-responses` y conservar artefactos,
   denominadores, errores y hashes privados.

## G. CHECKPOINT

La preparación técnica queda lista para revisión humana. No hay autorización para el
baseline, tuning, reserva, OE2, commit o push dentro de esta tarea.
