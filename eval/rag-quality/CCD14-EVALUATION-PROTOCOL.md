# Protocolo operativo OE1 — CCD 1.4.0

La primera evaluación mide el componente documental CCD que compone el producto mediante `createAuthenticatedDocumentRag` y `generateCcdKnowledgeAnswer`. Se reutilizan el manifiesto, filtros, selección, funciones SQL autenticadas, clientes de embeddings y generador reales. No mide autenticación HTTP, el Intent Router completo, Mobile ni orquestación. No sustituye el runner histórico CCD 1.2.0.

## Congelación previa

Antes del smoke y del baseline se fijan en artefactos privados nuevos: los 45 IDs originales, inclusiones/exclusiones, decisiones técnicas por delegación, diferencias por campo, referencias completas y anotaciones de afirmaciones. Se excluyen 010 y 044 de la evaluación principal: procedencia/aclaración institucional y pérdida del objetivo relacional, respectivamente. No se generan sustitutos para llegar a 50. La aceptación académica de una muestra menor sigue pendiente.

Las correcciones revisadas por IA no llevan aprobación humana. Los registros históricos se preservan como antecedentes. La congelación técnica de esta ejecución no equivale a aceptación institucional o académica. Los casos de límite explícito de evidencia pueden incluirse como `documented_evidence_boundary`, porque se espera explicar un límite publicado, no probar inexistencia de oferta. Se informa también su subgrupo.

El benchmark, este protocolo y el código de evaluación/producto se anclan por SHA-256 antes de observar respuestas reales. Smoke: los dos primeros IDs incluidos en orden del banco. Se ejecuta una vez; no se usan sus respuestas para cambiar gold, preguntas o producto. Baseline: una pasada por todos los incluidos, incluso los dos del smoke, con conversación vacía y pregunta exacta. No hay tuning ni reintentos de casos fallidos.

## Relevancia y evidencia

Una unidad es relevante si su contenido publicado aporta respaldo material a alguna afirmación solicitada, con periodo, población y entidad compatibles. Se admiten aportes parciales y soportes equivalentes; compartir palabras, curso o tema genérico no basta. No se elimina una unidad solo por redundancia ni se incluye para mejorar scores. Los localizadores originales y metadatos de procedencia no son chunks adicionales.

Suficiencia significa sustentar la respuesta completa y puede requerir una combinación de unidades. Un conjunto mínimo suficiente no representa automáticamente todas las unidades relevantes. Se conserva una anotación de función documental por cada adición y una explicación de alternativas descartadas o condicionadas. La completitud de las etiquetas es un juicio técnico limitado por la auditoría previa y no una verdad institucional ni una garantía universal.

Para 049, los dos soportes publicados de identidad en Interacción son relevantes aunque se solapen. El soporte publicado de propuesta de valor también lo es. MD-031 aporta propuesta de valor, posicionamiento y articulación de presencia profesional; KC-017 aporta huella, posicionamiento y organización del ecosistema. Se incluyen ambos como relevantes parciales/alternativos al contraste, conservando los anteriores: R tiene siete unidades. Esa decisión es previa a resultados. Recall@5 tiene techo 5/7 para ese caso, aunque una combinación menor pueda sustentar una respuesta. No se cambia `top_k` del producto.

## Métricas y denominadores

1. Ranking primario: primeras cinco filas de la **primera llamada SQL real de retrieval con scope**, en el orden recibido, antes de selección o extracción. Se registran función, claves del filtro, `top_k`, IDs, contenido y distancias/similitudes disponibles. Si hubiera más llamadas, se preservan separadas; no se fusionan ni reordenan para puntuar. El producto puede solicitar hasta 20 candidatos.
2. Hit@5, MRR@5, Precision@5 y Recall@5 se calculan sobre chunk IDs exactos. Precision divide entre cinco, incluso con menos filas; Recall entre |R|. Se informa el techo min(5,|R|)/|R|. No se inventan posiciones ausentes. Sin retrieval observado se asigna cero para el agregado sobre todos los planificados; se reporta el motivo. Un ranking observado conserva sus métricas aunque falle la respuesta.
3. Selección y soporte: se registran los IDs seleccionados y atribuidos por el protocolo del producto. Se mide cobertura de unidades gold en ambos conjuntos. Para síntesis se capturan los bloques exactos del prompt factual; para extracción, el texto de la unidad de presentación o el párrafo efectivamente extraído. La selección no se usa como ranking de MRR.
4. Correspondencia de afirmaciones: las anotaciones previas identifican soportes materiales de las afirmaciones auditadas. La presencia de al menos un soporte mide cobertura **parcial**, no corrección de la respuesta ni entailment completo. Se reportan afirmaciones totales, mapeadas y cubiertas; las no mapeadas no desaparecen. Ni citas ni coincidencia de palabras prueban fidelidad semántica.
5. Respuestas: se conservan texto final, citas, clasificación/scope, estrategia, llamadas al generador y latencia. Se distingue extracción determinista sin generador, extracción tras clasificación/fallback y síntesis. Abstenciones, errores y timeouts permanecen en el denominador principal y se reportan aparte. El porcentaje de captura verificable se informa sobre todos los casos y sobre respuestas no abstentivas.

## Juez RAGAS

Si el entorno existente ofrece RAGAS 0.4.3 y un juez local viable, se reutiliza `ragas-adapter.py` con contextos realmente observados, sin usar la captura genérica de Document RAG. Se comprueba primero un subconjunto prefijado de ejemplos sintéticos existentes. Las etiquetas son expectativas técnicas, no revisión humana independiente. Persiste la limitación anterior de AnswerRelevancy de 7/12 coincidencias. Los scores del juez son exploratorios mientras no exista calibración suficiente.

Si falta el paquete o falla el juez, se registra esa limitación y se conserva el baseline real y sus métricas deterministas. No se simulan scores ni se realizan intentos indefinidos. Sin RAGAS ejecutado, faithfulness/context precision/context recall/answer relevancy se reportan como no ejecutadas, nunca como PASS. Una comprobación directa del modelo sobre fixtures no se rotula como RAGAS.

Referencias preliminares del proyecto: faithfulness ≥0.80, context precision ≥0.80, context recall ≥0.75, answer relevancy ≥0.80 y MRR@5 ≥0.70. No son estándares universales ni umbrales institucionalmente ratificados. Precision@5 binaria y context precision de RAGAS no son la misma métrica.

## Reproducción y privacidad

Desde la raíz, `node eval/rag-quality/run-ccd14-baseline.mjs --benchmark RUTA_PRIVADA --freeze MANIFEST_PRIVADO --output RESULTADO_PRIVADO`. Añadir `--smoke` para la prueba técnica; `--preflight-only` solo comprueba publicación y escribe un snapshot privado. El runtime usa la configuración local existente sin imprimir secretos; todas las conexiones SQL son READ ONLY. No modifica conversaciones ni tablas.

Los destinos deben estar ignorados por Git y se escriben sin sobrescritura. La captura incremental JSONL conserva evidencia si ocurre un fallo. El manifiesto de congelación identifica versiones, código y hashes. Todos los datos CCD, preguntas, respuestas y resultados por caso permanecen privados. Solo el informe agregado y código/fixtures sintéticos se versionan. No se hace commit ni push automático.
