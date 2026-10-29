# CHECKPOINT BANUCHAT — OE1-CIERRE-01

Fecha: 29 de octubre de 2026, America/Bogota.
Estado: **OE1_BASELINE_EXECUTED_REPORT_PREPARED**.

Rama inicial `main`; HEAD `da272e6cac54146fdd1aa33a1958f0d099a92750`; árbol inicial limpio. Se leyeron `AGENTS.md`, D5.5D, D5.6B, D5.6C-RESUMED, los insumos privados correspondientes y el camino CCD implementado. Este es el único checkpoint de la macrotarea; el protocolo y los informes son entregables evaluativos.

## Consolidación y congelación

- Verificados benchmark v1 SHA-256 `810794a83b40eb95a064532283cb9f7f59a6137b984f730952ed60f662ee2324`, propuestas D5.6C `6b50dceb0a0a806e142a13aca700c5b245f341aab1db0f9004b61621b4f663b0` y ledger D5.6B `0e76b531d9bbf7f02dc0bbfad4adbef8b8b42c91e1346c48abf3b4d6e4ff0773`.
- Nueva versión privada: **43 casos incluidos, dos excluidos (010 y 044)**. Se conservan los 45 IDs y motivos individuales de exclusión; no se inventaron sustitutos. El 017 conserva el gold. Las 18 observaciones restantes tienen decisión técnica explícita, evidencia y estado de inclusión.
- Cambios aplicados solo en la nueva versión: **11 referencias de respuesta y 15 conjuntos de contextos; cero preguntas modificadas**. No se aplicó la reformulación de 044. Las correcciones de 030/039 conservan documentada su pérdida de detalle. La adjudicación previa de 049 incluye los dos soportes alternativos/parciales bajo una política material de relevancia, sin confundirlos con un conjunto mínimo suficiente.
- 91 referencias por caso, 46 unidades gold distintas; 39 remapeos históricos y cuatro casos nuevos. En 049 hay siete relevantes y techo Recall@5=5/7. Un caso de límite explícito de evidencia permanece respondible documental, identificado como subgrupo.
- Cambios y conservación se registraron como **revisión técnica de Codex por delegación**, sin nuevas firmas, aprobación humana ni aceptación institucional/académica. El benchmark v1, histórico 1.2.0, bancos, ledgers y evidencias anteriores permanecen intactos.
- La congelación de benchmark, protocolo y hashes del código ocurrió antes del smoke y del baseline. Ninguna respuesta del baseline se utilizó para seleccionar o corregir preguntas. La versión se escribió sin sobrescritura y se verificó su hash antes y después de ejecutar.

## Publicación y flujo medido

PostgreSQL Unified existente, puerto 55463 y volumen `banuchat-unified-data`, verificados sin iniciar ni modificar servicios. Release current `10af4ffd-effb-41fc-bbfe-4dc48cb3398f`, contrato CCD 1.4.0, manifest `fde23cabe95c83f5bd632d129312ad68c90624e6ebd489e79e98c6a3d0d96852`. Las 107 unidades y embeddings se comprobaron por identidad y contenido local; todas las referencias nuevas resolvieron exactamente. La comprobación posterior volvió a pasar. SQL exclusivamente READ ONLY, con rollback y sin escrituras de conversaciones.

Se implementaron `run-ccd14-baseline.mjs` y `ccd14-evaluation.mjs`, preservando el runner/validador históricos. El evaluador invoca la composición real `createAuthenticatedDocumentRag → generateCcdKnowledgeAnswer`, con manifiesto y funciones SQL autenticadas existentes. Captura pasivamente ranking, scores, claves del scope, selección, prompts/extractos, soporte atribuido, citas, respuesta, llamadas al generador y latencia. No usa la captura genérica anterior ni modifica el RAG.

El ranking puntuado son las primeras cinco filas de la primera llamada SQL scoped real, en orden recibido, antes de selección. El producto mantiene hasta 20 candidatos. Se distingue el componente documental medido del flujo HTTP, Intent Router y producto completo.

## Ejecuciones y resultados reales

Smoke prefijado: dos primeros casos incluidos, completado una vez. Baseline: **una pasada por 43 casos**, 39 respuestas, cuatro abstenciones, cero errores y cero timeouts. Rankings observados: 42. Las cuatro abstenciones siguen en el denominador primario. No hubo reintentos ni tuning.

| Métrica determinista | Resultado sobre 43 |
| --- | ---: |
| Hit@5 | 0,860465 (37/43) |
| MRR@5 | 0,813953 |
| Precision@5 macro | 0,306977 |
| Recall@5 macro | 0,764673 |

Se recuperaron 66 de las 91 referencias etiquetadas por caso. Precision@5 divide entre cinco aun con ranking corto; su techo teórico por tamaño del gold es 0,413953. No se compara con el target de context precision RAGAS. Los resultados y sus denominadores se recomputaron independientemente desde las filas capturadas.

Hay 22 extracciones deterministas sin generador y 17 síntesis. Otras dos llamadas al generador terminaron en abstención: 19 llamadas en total. Captura verificable de las **39/39 respuestas** y trazabilidad de las cuatro abstenciones, sin inventar contextos vacíos como evidencia. Cobertura media de gold seleccionados 0,615172 y atribuidos 0,541528. Presencia parcial de soporte en 54/80 afirmaciones mapeadas; nueve de 89 no mapeadas se reportan. Ese indicador no acredita corrección semántica completa.

La inspección técnica posterior clasificó 17 respuestas alineadas con el núcleo, 13 parciales, ocho con desvío de tema/alcance, una parcial con especificidad por revisar y cuatro abstenciones. Son observaciones de Codex, no evaluación humana independiente ni tasa de exactitud validada. Se conservan ejemplos y evidencias privados; no se modificó el sistema para mejorar estos resultados.

## RAGAS y juez

Se instaló RAGAS 0.4.3 con los pins existentes en un entorno privado aislado; no se modificó el adaptador. Juez y embeddings locales existentes, telemetry deshabilitada y timeout por métrica de 45 segundos. No se descargaron modelos ni se usaron servicios de pago.

Comprobación acotada prefijada: CAL-01, CAL-05 y CAL-07 existentes, 12/12 coincidencias con expectativas técnicas. No son etiquetas humanas ni una calibración suficiente; no reemplazan la limitación previa 7/12 de AnswerRelevancy. El subconjunto no valida controles negativos de todas las métricas y el juez comparte modelo con el generador.

Se puntuaron una vez las **39 respuestas con contexto verificable**: 39/39 completadas para cada métrica, cero errores/timeouts. Las cuatro abstenciones se reportan separadamente como no puntuadas por el contrato RAGAS, sin desaparecer de los 43 operacionales.

| Métrica RAGAS exploratoria | Media | Target preliminar | Comparación descriptiva |
| --- | ---: | ---: | --- |
| Faithfulness | 0,952991 | 0,80 | Sobre referencia |
| Context precision | 0,709402 | 0,80 | Bajo referencia |
| Context recall | 0,713675 | 0,75 | Bajo referencia |
| Answer relevancy | 0,618210 | 0,80 | Bajo referencia |

MRR supera descriptivamente 0,70, pero no demuestra suficiencia de respuesta ni aprobación de OE1. Las métricas del juez son exploratorias, conditional a respuestas no abstentivas y a su lista de contextos suministrados, no al ranking bruto. No se fabricó un PASS ni se ocultaron resultados bajo target.

## Artefactos, validación y límites

Todos los artefactos detallados están bajo `data/ccd/local/oe1-evaluation/`, ignorados por Git:

| Artefacto | SHA-256 |
| --- | --- |
| `evaluable-benchmark-ccd-1.4.0-cierre01-v2.json` | `44c7464b8f6a9ecdc34c436205beafb532c7a26bc4d44c1b99d4af98c93275c8` |
| `technical-decisions-oe1-cierre01-v1.json` | `c94ea50b9e54e9f2c5fcc9a507478c1eb12bb85d7d3626772b3959c9bb792bec` |
| `freeze-oe1-cierre01-v1.json` | `118c30ab5764a22cbd321448d72b33e0e5a358489958b2c5c117df2ca83bbf0e` |
| `results/oe1-cierre01-baseline-v1.json` | `8528d8af371f74d47aa1e8ea92b1f63c8fb9b8e6984b9a7cdbc5e27bf43ae58f` |
| `results/oe1-cierre01-report-v1.md` | `264c5df4683eb904399514da68982e615bd91f6bfaf5e317e4195f28b155dbd9` |
| `oe1-cierre01-artifacts-manifest-v1.json` | `62eb07cf5b6579ed07447ce7b715da4e703b4c34303ff175e55ea374e366c4c3` |

El manifest final registra hashes/tamaños de benchmark, decisiones, congelación, capturas JSON/JSONL, comprobaciones de publicación, RAGAS, diagnóstico de respuestas, dependencias efectivas, auxiliares e informe privado. El resumen público `results/oe1-cierre01-ccd14-summary.md` tiene SHA-256 `c98e5d3bfcaf883c1442f33e6a02d1b7cdb369461247f68acd4e28bcb7dc30d4`; no contiene preguntas completas, respuestas CCD, datos personales ni secretos.

Pruebas pertinentes: **11/11** sintéticas (ocho nuevas y tres compartidas de métricas); incluyen invocación de la función CCD real, observación sin sustitución, captura de prompts, rankings cortos, techo, denominadores y partición/exclusiones del benchmark. El test adicional de invariantes se añadió después de congelar; no cambió el código del runner ejecutado ni el gold. Verificación independiente real: 43 IDs únicos, JSONL igual al resultado final, congelación anterior a smoke y baseline, hashes de originales/código intactos y métricas recalculadas. `git diff --check` y whitespace de los archivos nuevos: sin errores. Solo hay archivos públicos nuevos dentro de `eval/rag-quality/`; no se modificaron componentes productivos.

Se entregan protocolo, runner probado, conjunto evaluable, decisiones, baseline real e informes. Siguen pendientes aceptación académica de 43 frente al mínimo histórico de 50 y de MRR@5, suficiencia/calibración del juez, revisión independiente, reserva ciega y ratificación institucional. La evaluación cubre un componente documental y una muestra técnica, no toda la aplicación ni uniformemente las 107 unidades. El trabajo demuestra ejecución técnica y hallazgos reales; **no declara OE1 aprobado académicamente**.

No se modificaron corpus, bases, releases, benchmarks previos, bancos, ledgers, contratos REST/MCP, modelos, prompts, embeddings, chunking, `top_k` ni arquitectura móvil. No hubo nuevas reglas institucionales, aprobaciones humanas fabricadas, commit o push. Se detuvo la macrotarea sin tuning ni funciones nuevas del producto.
