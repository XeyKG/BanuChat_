# CHECKPOINT BANUCHAT — OE1-D5.3

Fecha: 28 de octubre de 2026, America/Bogota.  
Estado: **PARTIAL_REVIEW_PREPARATION**.

## Identidad y alcance

- Rama: `main`; HEAD inicial: `c861837561fd0c617b744483946698c0dfe46f2a`.
- Estado Git inicial: limpio. Al cierre, el único cambio visible en Git es este checkpoint sin seguimiento; los artefactos privados están ignorados.
- Benchmark histórico CCD 1.2.0: 50 casos; SHA-256 verificado `1e007142c2a573d9f2e4403e28b8eaae7dfe03cd31d1a514ee97423a7617609e`.
- Release current `10af4ffd-effb-41fc-bbfe-4dc48cb3398f`, contrato `ccd-1.4.0`, manifest SHA-256 `fde23cabe95c83f5bd632d129312ad68c90624e6ebd489e79e98c6a3d0d96852`. Se verificó el puntero current y el estado `ready` en PostgreSQL Unified. No se cambió Docker ni PostgreSQL.
- Se leyeron `AGENTS.md`, el protocolo OE1, D5.2, el benchmark histórico, la adopción privada, el registro de hashes y los artefactos actuales pertinentes. El cotejo se hizo con consultas PostgreSQL de solo lectura.

## Reconstrucción propuesta

| Clasificación de los 50 casos históricos | Casos |
| --- | ---: |
| `REUTILIZABLE_CON_REVISION` | 27 |
| `REQUIERE_REFORMULACION` | 11 |
| `AMBIGUA` | 10 |
| `SIN_EVIDENCIA_SUFICIENTE` | 2 |

Se prepararon **29 candidatas**: 27 reutilizables sujetas a revisión y 2 reformuladas. La brecha hasta 50 es **21**. Las otras 9 reformulables no se incluyeron porque su respuesta o delimitación aún exige trabajo; las 10 ambiguas y las 2 sin evidencia tampoco. La clasificación no es aprobación humana. La matriz privada registra el diagnóstico individual de los 50 IDs.

Las 29 candidatas apuntan a **24 unidades actuales distintas**: 14 requieren un contexto, 14 requieren dos y una requiere tres. Ninguna excede `top_k=5`; esto solo verifica el número de referencias, no su recuperabilidad efectiva ni la completitud del gold. La cobertura se concentra en los siete syllabus académicos (25 candidatas con tema académico); tres incluyen estructura o diagnóstico de la ruta. Los temas nuevos de la release 1.4.0 —temarios de herramientas básicas, evaluación de experiencia, oferta intensiva, tarifas, inscripciones y horas/créditos— no están representados por preguntas históricas suficientes. No se añadieron preguntas de relleno.

La procedencia por candidata incluye `DOCUMENT_SOURCE` en las 29; tres incluyen además `DOMAIN_CONFIRMATION`. No se contaron confirmaciones de dominio como aval institucional. Las candidatas y el paquete de revisión conservan la procedencia por referencia, periodo, población, condiciones y excepciones. No se presentó `INFERENCE` ni `PENDING_CLARIFICATION` como fuente documental. La suficiencia de los soportes alternativos o complementarios y de las respuestas negativas requiere juicio del autor frente a las 107 unidades.

## Artefactos privados y verificaciones

Todos están en `data/ccd/local/oe1-evaluation/`, bajo la regla de exclusión `data/ccd/.gitignore`; ninguno se añadió a Git:

| Artefacto | SHA-256 |
| --- | --- |
| `candidate-bank-ccd-1.4.0-v1.json` | `0f7c22993956c3e6ec1ea11c50071eb41c86e6141a45dc43787467d878fba3bf` |
| `remap-matrix-ccd-1.4.0-v1.json` | `9073b2b1b9e3d10a378aa78d1f4630df2fd3e477191965135758a1936a31412c` |
| `author-review-packet-ccd-1.4.0-v1.json` | `99833cc1f22f0e9928a9ec701b3ca3eacc40f616ee3f3163e9950e3be4812328` |
| `coverage-report-ccd-1.4.0-v1.json` | `afa0d6fbe7580aec46051aeba307dfa5b1d1304d9c1cf65504500613f0cd5538` |

Se comprobaron las 107 identidades del manifest contra la publicación: `document_key`, ruta y SHA-256. Cada archivo local coincidió con su hash registrado y con `source_sha256`; su texto coincidió con el chunk publicado. Las 107 versiones están `ready`, con ordinal 0 y embedding presente. Las 29 candidatas tienen pregunta y respuesta no vacías, IDs únicos y referencias resolubles con versión, chunk, localizador y hash exactos. Todas conservan `draft_pending_author_review` y decisión humana nula. La inspección de los artefactos candidatos no encontró correos ni asignaciones con formato de secreto. No se copiaron textos CCD al checkpoint.

## Trabajo del autor y límites

El autor debe revisar cada una de las 29 candidatas contra el documento original autorizado y el artefacto actual, ratificar la respuesta y **todos** los contextos relevantes, buscar soportes alternativos en la release completa y comprobar periodo, población, condiciones, excepciones y procedencia. Debe registrar manualmente `approved`, `corrected` o `rejected`, con motivo, identidad y fecha. Las 21 restantes requieren resolución individual en la matriz; cualquier corrección o nueva pregunta exige nueva versión y verificación. No hay decisiones ni fechas de revisión fabricadas.

La revisión histórica de 50 casos fue realizada solo por el autor; no existe revisor humano independiente. El corpus CCD no tiene ratificación institucional formal. Las 15 `reserve_candidate` históricas no constituyen una reserva ciega. El juez `AnswerRelevancy` mantiene el antecedente de 7/12 coincidencias técnicas y MRR@5 sigue pendiente de aceptación académica como operacionalización. El evaluador actual todavía no representa íntegramente el camino `ccd-knowledge`; este banco no habilita por sí solo un baseline del producto vigente.

No se ejecutaron retrieval, generación, RAGAS ni baseline. No se modificaron código productivo, configuración, modelos, releases, bases, benchmark histórico o ledger. No hubo commit ni push. Siguiente paso recomendado: revisión y ratificación manual del paquete parcial por el autor, incluyendo decisión explícita sobre las 21 preguntas sin candidata, antes de cualquier exportación aprobada o evaluación.
