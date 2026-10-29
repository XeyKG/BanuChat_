# BanuChat — primer baseline OE1 CCD 1.4.0

Fecha: 29 de octubre de 2026. Estado: OE1_BASELINE_EXECUTED_REPORT_PREPARED.
Ejecución: 2026-10-29T16:50:41.288Z a 2026-10-29T16:51:25.202Z; congelación: 2026-10-29T16:50:17.151Z.

## Objeto y conjunto evaluado
Se evaluó recuperación y respuesta del componente documental CCD real de BanuChat mediante la composición autenticada de producción y su función CCD específica. La evaluación reutilizó metadatos, filtros, funciones SQL, embeddings, selección y generación existentes. No fue una evaluación del RAG genérico ni del sistema HTTP/Mobile/Intent Router completo. No se cambió el producto.

Corpus: CCD 1.4.0, 107 unidades publicadas; release 10af4ffd-effb-41fc-bbfe-4dc48cb3398f; manifest fde23cabe95c83f5bd632d129312ad68c90624e6ebd489e79e98c6a3d0d96852.
Benchmark: 43 casos incluidos de 45 originales, con 91 referencias gold contadas por caso y 46 unidades gold distintas; 39 remapeos históricos y cuatro casos nuevos. Dos exclusiones explícitas: 010 por procedencia/aclaración institucional pendiente y 044 por falta de soporte publicado que preserve su objetivo relacional. No se crearon preguntas de relleno.
La nueva versión contiene 11 referencias de respuesta ajustadas y 15 conjuntos de contextos modificados, sin cambiar preguntas. Las 18 observaciones restantes se resolvieron técnicamente por delegación expresa; las decisiones y diferencias completas están en el manifest privado. Las revisiones hechas por IA no se rotulan como aprobación humana.
Se preservaron benchmark v1, benchmark histórico, bancos y ledgers. Los 19 casos sin problemas en la auditoría previa se conservaron sin repetir su inspección general. La aceptación académica de una muestra menor que 50 sigue pendiente. Un caso de límite explícito de evidencia se mantuvo como respondible documental y se identifica separadamente; su abstención permanece en el denominador.

## Política y método
Se fijaron antes de observar respuestas el benchmark, las exclusiones, las etiquetas de relevancia, este procedimiento y hashes del código. Un smoke prefijado de dos casos precedió a una sola pasada del baseline completo, con preguntas exactas y sin conversación previa. No se ajustaron gold ni producto a los resultados.
Las unidades relevantes aportan soporte material parcial o equivalente con periodo/población compatibles. Suficiencia de una combinación y conjunto de relevantes para ranking se registran como conceptos distintos. En 049 se admitieron dos soportes parciales/alternativos adicionales: su conjunto tiene siete unidades y Recall@5 está limitado a 5/7 (0,7143).
Ranking primario: primeras cinco filas de la primera llamada SQL scoped real, sin reordenar ni usar después la selección de evidencia. El producto mantiene su solicitud de hasta 20 candidatos. Precision@5 divide entre cinco aunque se devuelvan menos. Sin retrieval observado se contribuye cero al agregado de 43; un ranking observado se puntúa aunque la respuesta termine en abstención.
Los prompts factuales se capturaron mediante observación pasiva del generador y coincidencia exacta con unidades SQL. Para extracción se registraron las unidades de presentación/párrafos atribuidos por el producto. La atribución de fuentes no demuestra atención causal ni entailment completo. Selección, soporte atribuido y ranking se reportan por separado.
El alcance de la relevancia sigue limitado por una adjudicación técnica sobre las fuentes auditadas. No se afirma completitud institucional del gold. Las anotaciones de afirmaciones miden presencia parcial de soporte, no corrección semántica de toda una respuesta.

Modelo productivo: qwen3:4b-instruct, digest 0edcdef34593eac1aa2be9c7d06c432dcf81945adca5eca2f27662c18f168ba0; Ollama 0.35.0; receta temperature=0, think=false, num_predict=256, sin cambios. Embeddings: qwen3-embedding:0.6b, 1024 dimensiones y coseno, digest ac6da0dfba84a81fdbfbaf330198c33cd77c4cdfc53e8bc50eb581914a15621d. Configuración SHA-256 e1441a0aad0547d9db657f20708d585209a7d863c27f1b2b1e05aa42e6546771. PostgreSQL Unified puerto 55463, volumen existente. Lecturas de auditoría y ejecución en transacciones READ ONLY; no se escribieron conversaciones ni datos.

## Resultados de recuperación
| Métrica del ranking observado @5 | Resultado, denominador 43 |
| --- | ---: |
| Hit@5 | 0.8605 (37/43) |
| MRR@5 | 0.8140 |
| Precision@5 macro | 0.3070 |
| Recall@5 macro | 0.7647 |

Se observaron rankings en 42/43 casos; en uno la guardia de disponibilidad se abstuvo antes de retrieval. Hubo 66 referencias relevantes recuperadas entre 91 etiquetas por caso (recall micro 0,7253). En 28 casos hubo menos de cinco posiciones. El máximo matemático de Precision@5 macro bajo estos gold es 0,4140; no corresponde compararla con el target 0,80 de context precision de RAGAS.
MRR@5 supera descriptivamente la referencia preliminar 0,70 en este conjunto. Esto no acredita por sí mismo respuestas correctas ni constituye aceptación académica de esa operacionalización. La sensibilidad sobre los 42 casos con retrieval observado da MRR@5=0,8333; el resultado primario se mantiene en 0,8140 sobre 43.

## Respuestas y evidencia
| Resultado operacional | Casos |
| --- | ---: |
| Planificados e intentados | 43 |
| Respuestas no abstentivas | 39 |
| Abstenciones | 4 |
| Errores | 0 |
| Timeouts | 0 |
| Extracción determinista sin generador | 22 |
| Síntesis con generador | 17 |

Hubo 19 llamadas al generador: 17 síntesis y dos llamadas previas a abstenciones. Las otras dos abstenciones ocurrieron sin generador. La captura fue verificable para las 39/39 respuestas (100 %), y también se trazaron las cuatro abstenciones sin inventar contextos utilizados. No significa que 43 casos tengan respuesta o contexto no vacío.
Cobertura media de unidades gold seleccionadas: 0.6152; de unidades atribuidas como soporte: 0.5415. De 89 afirmaciones anotadas, 80 tienen mapeo y 54 al menos un soporte material presente (54/80=0,6750). Nueve quedaron sin mapeo: no se imputó cobertura. Este indicador parcial no es un score de factualidad.
Latencia media por caso: 1017.7 ms. Las latencias son locales de una sola pasada, sin carga concurrente deliberada del juez; no representan rendimiento poblacional.

La inspección técnica posterior de Codex, sin cambiar el benchmark, clasificó 17 respuestas como alineadas con el núcleo de referencia, 13 como parciales, ocho con desvío de tema/alcance, una parcial con especificidad por revisar y cuatro abstenciones. Estas categorías son observaciones cualitativas exploratorias, no validación humana independiente ni tasa de exactitud calibrada.
Se observaron respuestas sobre un aspecto ajeno al preguntado aun con hit en el ranking; comparaciones resueltas como listas generales que omitían la relación central; y guardias que impedían responder material documental disponible. Las evidencias completas y ejemplos por ID permanecen privados. No se hizo tuning para corregir estos hallazgos durante la ejecución.

## RAGAS y comprobación del juez
Se instaló un entorno Python privado aislado con RAGAS 0.4.3 y los pins existentes del repositorio. Se reutilizó el adaptador sin modificarlo, con endpoint local, telemetry deshabilitada para la ejecución, timeout de 45 segundos por métrica y sin repetición del baseline. Se conservan instalación y dependencias efectivas.
La comprobación acotada usó CAL-01, CAL-05 y CAL-07 existentes (una respuesta respaldada, una contradictoria y una irrelevante), seleccionadas antes de ejecutar el juez. Coincidieron 12/12 expectativas técnicas a frontera 0,5; AnswerRelevancy coincidió 3/3 en ese subconjunto. Son etiquetas técnicas y una muestra pequeña, no validación humana; no sustituyen ni borran el antecedente 7/12 de AnswerRelevancy.
RAGAS se ejecutó una vez sobre las 39 respuestas no abstentivas con contextos realmente capturados. Las cuatro abstenciones carecen de sample válido según el contrato del adaptador; siguen incluidas en los 43 del informe operacional, con estado no puntuado por RAGAS. Cada métrica informa sus propios errores/timeouts. Las medias siguientes no se imputan a los 43 ni se interpretan como aprobación sólida del juez.

| Métrica RAGAS exploratoria | Media | Target preliminar | Completados / 39 | Errores | Timeouts | Comparación descriptiva |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| faithfulness | 0.9530 | 0.80 | 39/39 | 0 | 0 | Media sobre referencia preliminar |
| context_precision | 0.7094 | 0.80 | 39/39 | 0 | 0 | Media bajo referencia preliminar |
| context_recall | 0.7137 | 0.75 | 39/39 | 0 | 0 | Media bajo referencia preliminar |
| answer_relevancy | 0.6182 | 0.80 | 39/39 | 0 | 0 | Media bajo referencia preliminar |

La comprobación acotada no contiene controles negativos de context precision/context recall y no valida por sí sola esas métricas. Juez y generador comparten el mismo modelo, con posible sesgo correlacionado. Se mantienen todos los resultados como exploratorios.
La context precision de esta ejecución RAGAS describe la lista de evidencia suministrada para responder, no el ranking SQL bruto; no se equipara a Precision@5. Context recall evalúa afirmaciones de referencia según el juez y no sustituye Recall@5 de chunk IDs. Los intervalos bootstrap que conserva el adaptador son descriptivos, con casos que comparten fuentes; no acreditan independencia estadística.

## Conclusión y límites
Existe evidencia real, reproducible y trazable de una primera ejecución técnica del componente documental CCD 1.4.0 sobre 43 casos. El resultado permite separar calidad del ranking, selección de soporte y respuesta final; un MRR alto no elimina omisiones ni desvíos. Los resultados bajos y abstenciones se conservaron. No se declara OE1 aprobado académicamente ni todos los targets cumplidos.
Siguen pendientes aceptación académica de 43 frente al mínimo histórico de 50, pertinencia de MRR@5, revisión humana independiente, suficiencia/calibración del juez, falta de reserva ciega, ratificación institucional del corpus y delimitación del componente medido frente al producto completo. Los casos excluidos mantienen sus dependencias específicas. Los cambios de referencia, revisión por IA y dependencia entre casos limitan comparabilidad y generalización. Las 46 unidades gold no representan cobertura uniforme de las 107 unidades del corpus.
El siguiente paso es revisar con el autor/director la aceptación metodológica y los errores observados. Cualquier mejora del producto o gold deberá ser una tarea posterior y otra versión, preservando este baseline. No se ejecutó tuning automático, commit ni push.

## Artefactos y reproducción
Benchmark privado SHA-256: `44c7464b8f6a9ecdc34c436205beafb532c7a26bc4d44c1b99d4af98c93275c8`.
Baseline privado SHA-256: `8528d8af371f74d47aa1e8ea92b1f63c8fb9b8e6984b9a7cdbc5e27bf43ae58f`.
Manifest de decisiones SHA-256: `c94ea50b9e54e9f2c5fcc9a507478c1eb12bb85d7d3626772b3959c9bb792bec`.
Manifest final privado: `data/ccd/local/oe1-evaluation/oe1-cierre01-artifacts-manifest-v1.json`; SHA-256 `62eb07cf5b6579ed07447ce7b715da4e703b4c34303ff175e55ea374e366c4c3`.
Protocolo público: `eval/rag-quality/CCD14-EVALUATION-PROTOCOL.md`; runner: `eval/rag-quality/run-ccd14-baseline.mjs`. Informe detallado privado: `data/ccd/local/oe1-evaluation/results/oe1-cierre01-report-v1.md`.
Las rutas exactas y hashes de resultados por caso, RAGAS y evidencias incrementales están en el manifest privado. Los datos, preguntas y respuestas CCD permanecen ignorados por Git. Pruebas pertinentes ejecutadas: 11/11 sintéticas (ocho nuevas y tres de métricas compartidas), además de validación independiente de los 43 resultados, orden JSONL, cronología de congelación, hashes y recomputación de métricas.
El test sintético adicional de invariantes se añadió después de congelar y no forma parte del código ejecutado por el runner; no modificó ese código ni el gold. No se repitió el baseline.
