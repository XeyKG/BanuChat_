# CHECKPOINT BANUCHAT — OE1-CIERRE-02

Fecha: 29 de octubre de 2026, America/Bogota.
Estado: **OE1_TECHNICAL_EVALUATION_CLOSED_ACADEMIC_ACCEPTANCE_PENDING**.

## Alcance e integridad

Rama inicial `main`; HEAD `4a574a1225a93242892dd025d1bf45fa97bfc49a`; árbol inicial limpio. Se leyeron `AGENTS.md`, el protocolo CCD14, CIERRE-01, su resumen público y artefactos privados correspondientes. Se utilizó exclusivamente la evidencia ya capturada y el código congelado concordante; no se volvió a auditar el corpus.

Coincidieron los tres SHA-256 requeridos:

| Original | SHA-256 |
| --- | --- |
| Benchmark congelado | `44c7464b8f6a9ecdc34c436205beafb532c7a26bc4d44c1b99d4af98c93275c8` |
| Baseline real | `8528d8af371f74d47aa1e8ea92b1f63c8fb9b8e6984b9a7cdbc5e27bf43ae58f` |
| Manifest final CIERRE-01 | `62eb07cf5b6579ed07447ce7b715da4e703b4c34303ff175e55ea374e366c4c3` |

También se verificaron los 22 artefactos del manifest anterior, entradas protegidas y fuentes de código congeladas. El registro nuevo conserva 148 hashes de archivos de entrada; permanecieron intactos. Ningún original, gold, score, etiqueta anterior o código productivo se sobrescribió.

## Diagnóstico y backlog

Se priorizaron las **26 trazas** anteriores con abstención, desvío o parcialidad/especificidad: los cuatro casos de abstención, ocho de desvío y 14 parciales/de especificidad. Los 17 anteriormente alineados no se reexaminaron por rutina. Cada ficha nueva contiene ID, puntero JSON al baseline, hash del caso, scope, ranking completo y @5, selección, evidencia suministrada, soporte atribuido, citas, explicación probable, confianza, fuente de código y solución no implementada.

Resultado de la lectura diagnóstica: **16 hallazgos materiales**, una abstención por investigar, una ambigüedad por revisar, siete diferencias que no establecen fallo material y una especificidad por revisar. Estos conteos no son una nueva tasa de exactitud ni sustituyen la clasificación anterior. Las categorías A–F distinguen falta de recuperación, selección/representación, salida, scope/guardia, benchmark y juez; pueden solaparse.

Hallazgos centrales:

- Los ocho desvíos originales ocurrieron sin llamada al generador. La explicación no puede atribuirse automáticamente al LLM.
- En varios casos las claves del filtro excluyeron soporte; en otros se recuperó pero se descartó. La primera situación no demuestra cómo habría rankeado un embedding sin ese filtro.
- Una representación de contexto perdió una sección detallada ya recuperada antes de llamar al modelo.
- Se verificaron **62 registros de cita** por chunk, versión, release y checksum, coherentes con el soporte atribuido. No es validación de entailment ni de enlaces HTTP.
- Las siete respuestas con diferencias de granularidad pueden cubrir el núcleo sin repetir todo el gold. No se declararon incorrectas por falta de coincidencia literal.
- Dos abstenciones posteriores a suministro de contexto requieren investigación; una incluye ambigüedad entre relación temática y causal. No se inventó el razonamiento del modelo.
- Faithfulness=1 en los ocho desvíos ilustra el límite de la métrica respecto a la pertinencia de la pregunta. Algunas aparentes sobreaceptaciones de context recall requieren revisión independiente; no se alteró ninguna puntuación RAGAS.

El backlog contiene **cinco intervenciones**, en este orden: sujeto/entidad/periodo (seis casos), selección por aspectos y afirmaciones (siete), guardias documentales (dos), preservación de detalle (uno) e investigación acotada de respondibilidad (dos hipótesis). Las primeras cuatro agrupan los 16 hallazgos materiales; la quinta no se cuenta como dos bugs confirmados. Cada intervención indica impacto, esfuerzo, riesgo y tests sintéticos propuestos. No se implementó ninguna ni se ejecutaron esos tests futuros.

## Informe y sustentación

Se entregan informe académico público, versión privada detallada, diagnóstico privado estructurado y legible, backlog y resumen oral de dos a tres minutos. No se crearon diapositivas.

El informe mantiene los resultados originales: 43 intentados, 39 respuestas, cuatro abstenciones, cero errores/timeouts; Hit@5 0,860465, MRR@5 0,813953, Precision@5 0,306977 y Recall@5 0,764673. RAGAS sobre 39 respuestas: faithfulness 0,952991, context precision 0,709402, context recall 0,713675 y answer relevancy 0,618210. MRR y la media exploratoria de faithfulness superan referencias preliminares; las otras tres métricas no. No se cumplieron todas las metas.

Las conclusiones separan ejecución técnica, desempeño observado, referencias preliminares y aceptación académica. Se conservan la limitación de 43 frente a 50, dependencia entre casos/fuentes, ausencia de reserva ciega y revisión humana independiente, carácter exploratorio de RAGAS y antecedente 7/12 de AnswerRelevancy. No se atribuye aprobación al director o al CCD.

## Entregables y hashes

| Entregable nuevo | SHA-256 |
| --- | --- |
| `results/oe1-cierre02-technical-report.md` (público) | `d9a4837e067a202d6a2649f273bb8df7b2ade289cab27f25e841534c70afda21` |
| `results/oe1-cierre02-improvement-backlog.md` (público) | `31082c569d0825d92ef229bb7414aae56d2f1cf5b17f3df1b54a9c5f8193e040` |
| `results/oe1-cierre02-defense-summary.md` (público) | `9c68fa9b0ecac426f4feda5529243d7637fb0b80a1425ed0e742c065304c9d1b` |
| `results/oe1-cierre02-technical-report-private-v1.md` (privado) | `c2cc94d6bf8e58c508dfa11a777d8202e50051a1cc368913be2c08a788d94009` |
| `results/oe1-cierre02-error-diagnosis-v1.json` (privado) | `b64c2017a5c2fc90742333583994b7536a18f8949d57c92d3e2dbd9f7d9246e4` |
| `results/oe1-cierre02-error-diagnosis-v1.md` (privado) | `24a90e750286a952e717ec34652bfa4385d00d45d3aaf5c4ef2c7d0f69fed3f6` |

Las rutas públicas de la tabla son relativas a `eval/rag-quality/`; las privadas, a `data/ccd/local/oe1-evaluation/`, ignoradas por Git. El manifest nuevo `data/ccd/local/oe1-evaluation/oe1-cierre02-artifacts-manifest-v1.json` tiene SHA-256 **`cd17db6c2da54c05e2462d78c38f946b30bc9889b7e87f2b646884289ade5e66`**. Ancla los ocho artefactos nuevos anteriores al checkpoint, incluidos dos auxiliares privados. Este checkpoint ancla su hash para evitar circularidad.

## Verificaciones y dependencias

Se ejecutaron controles de sintaxis de los dos auxiliares, verificación independiente de hashes y punteros, partición de las 26 fichas, correspondencia de citas, cinco intervenciones y consistencia de cifras con los resultados originales. Se verificó exclusión de Git de los archivos privados y ausencia de preguntas/respuestas completas o secretos en los cuatro archivos públicos nuevos. `git diff --check` y control de whitespace de archivos nuevos: sin errores.

No se repitieron las 11 pruebas funcionales/sintéticas acreditadas en CIERRE-01: no cambió código evaluativo/productivo. No hubo baseline, retrieval, generación, RAGAS, entrenamiento, SQL ni invocación de servicios en este cierre. No se cambió PostgreSQL, Ollama, Docker, corpus, releases, benchmark, gold o producto; tampoco se creó un nuevo benchmark o dictamen humano. No hubo commit ni push.

La fase técnica de **esta evaluación** queda cerrada. Las dependencias realmente externas son la aceptación académica de muestra/criterios y una validación independiente suficiente para conclusiones fuertes; cualquier regla oficial o caso institucional requiere autoridad competente. Esas aceptaciones no se fabrican. Implementar y comprobar mejoras del backlog es trabajo técnico posterior, no una ejecución pendiente escondida dentro de este cierre.
