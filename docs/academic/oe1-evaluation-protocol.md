# BanuChat - protocolo de evaluación OE1-D1

Fecha de preparación: **24 de octubre de 2026, America/Bogota**.

Estado: **propuesta metodológica, no aprobada y no ejecutada**. Este documento no
congela el banco, no instala RAGAS, no ejecuta consultas ni modifica RAG,
PostgreSQL, modelos, publicaciones, REST, Mobile, autenticación o Docker.

## 1. Corpus seleccionado

La evaluación propuesta se vincula exclusivamente a la publicación vigente observada
en el entorno canónico `banuchat-dev` mediante consultas PostgreSQL de solo lectura:

| Campo | Valor observado |
| --- | --- |
| Dataset | `banuchat-ccd-local` |
| Release | `3d6cedac-0e86-40c8-909b-d3ff6e8ab741` |
| Estado | `ready`, puntero `current_release_id` |
| Contrato | `ccd-1.2.0` |
| Documentos / chunks / embeddings | 12 / 12 / 12 |
| Modo de retrieval | Los 12 documentos son `chunked`; un chunk ordinal 0 por documento |
| Embedding | Ollama `qwen3-embedding:0.6b`, 1024 dimensiones, coseno |
| Manifest SHA-256 | `ed288f6e79bc099b55cdbb16cae3ea3daa970f67b3c8074cf382c52bdd64d61a` |
| Pipeline SHA-256 | `3d6d8c51357a6f325d66efebaf910457f998917b294292e3397e6ddf52402b1d` |
| Configuración embedding SHA-256 | `e1441a0aad0547d9db657f20708d585209a7d863c27f1b2b1e05aa42e6546771` |

El inventario reproducible sin contenido documental está en
`eval/rag-quality/ccd-corpus-snapshot-v1.json`. La identidad del gold será
`document_key + ordinal + locator + source_sha256`; los UUID físicos de chunk se
resolverán al ejecutar y no serán la identidad primaria.

### Autoridad y límites

- `ccd-m01` y `ccd-m12` son candidatos validados localmente por el equipo.
- M02/DOC-098-104, `ccd-tests-overview`, `ccd-u03` y `ccd-u04` son derivados
  cotejados localmente contra las fuentes seleccionadas.
- Ninguna de esas etiquetas equivale a aval formal del CCD, confirmación de oferta
  vigente o ratificación de reglas para un estudiante.
- M01, M12, TEST_ORIENTATION y U03 se limitan a material 202660. U04 se limita a
  transición 202560-202610. Los siete syllabus tienen edición entregada pero periodo
  no confirmado.
- No se admiten datos personales, expedientes, matrícula individual, tarifas,
  horarios, cupos, docentes, homologaciones automáticas, gratuidad, elegibilidad ni
  oferta vigente.

## 2. Suficiencia documental

### Cobertura adecuada

El corpus permite preguntas distintas sobre:

1. estructura de tres pilares de la ruta;
2. propósito, duración y estructura documental de la prueba diagnóstica 202660;
3. consecuencia histórica de un pilar no validado y responsabilidades descritas;
4. transición desde Informática, reconocimientos por comprobar y diferencias por
   programa/modalidad;
5. canal de contacto documentado, con vigencia pendiente;
6. propósito, competencias, temáticas y límites de siete syllabus: Analítica,
   Creación de Contenidos, Cuidado y bienestar digital, IA Generativa, Interacción
   Digital, Marca Personal Digital y Marco Legal Digital.

También admite comparaciones acotadas cuando ambos documentos respaldan la relación,
por ejemplo IA Generativa frente a Marco Legal Digital o Analítica frente a Creación
de Contenidos.

### Límite de suficiencia

Cada documento produce un único chunk. Por ello:

- `multi_context_same_document` es imposible en esta release;
- la diversidad de retrieval procede principalmente de doce identidades de chunk;
- 50 casos respondibles son posibles solo en el límite inferior prometido por el
  anteproyecto, distribuyendo hechos, límites, propósito y comparaciones legítimas;
- 60-80 casos tenderían a multiplicar paráfrasis y no se recomiendan con el corpus
  actual;
- el número de preguntas no debe presentarse como 50 unidades independientes de
  evidencia.

Se preparan **50 candidatas draft**: 43 `single_context` y 7
`multi_context_cross_document`. Hay además ocho pruebas complementarias de
abstención/aclaración, excluidas del denominador de MRR, Precision@k, Recall@k y de
las métricas RAGAS answerable. Si la revisión humana rechaza suficientes candidatas
para quedar por debajo de 50, las alternativas son obtener ampliación documental
expresamente autorizada o acordar académicamente una muestra menor; no crear
paráfrasis de relleno.

## 3. Unidad de evaluación y gold

Cada caso respondible debe contener antes de observar el sistema:

- ID estable;
- pregunta exacta en español;
- tipo de consulta y tipo de contexto;
- respuesta de referencia breve y completa;
- todos y solo los contextos necesarios;
- `document_key`, ordinal, locator y SHA-256 del derivado publicado;
- clase de evidencia, restricciones y notas de revisión;
- partición propuesta y estado de revisión.

`draft` significa que la candidata es revisable, no aprobada. Solo una persona puede
promoverla a `reviewed` o `approved` después de cotejar pregunta, respuesta y cada
afirmación contra el artefacto privado. Una herramienta puede proponer casos, nunca
aprobarlos.

## 4. Revisión humana

1. Dos revisores cuando estén disponibles; si solo participa uno, declararlo.
2. Calibrar con seis casos: tres de contexto único, dos comparativos y uno de límite.
3. Revisar independientemente sin mostrar rankings ni respuesta del RAG.
4. Marcar por afirmación: respaldada, parcialmente respaldada, no respaldada,
   contradicha o no verificable.
5. Rechazar duplicados semánticos, preguntas que dependan de datos personales,
   actualidad no confirmada o una inferencia no documentada.
6. Conciliar desacuerdos conservando los motivos. No inventar acuerdo o coeficiente.
7. Congelar preguntas, respuestas y contextos antes del baseline; una corrección
   posterior produce otra versión.

## 5. Desarrollo y reserva

El pool propone 35 candidatas de desarrollo y 15 `reserve_candidate`, equilibradas
por familias documentales. **No existe todavía una reserva oculta:** todas las
candidatas fueron preparadas en el mismo proceso y viven en almacenamiento local
privado. Antes de tuning o de una evaluación final, un revisor que no implemente la
corrección debe seleccionar o reescribir la reserva, moverla a custodia fuera del
alcance del proceso de tuning y registrar un compromiso SHA-256 no revelador.

Para el primer baseline sin tuning, las 50 aprobadas pueden evaluarse juntas y también
reportarse por partición. Después de usar desarrollo para ajustar el sistema, solo la
reserva que haya permanecido no vista puede alegarse como comprobación adicional de
generalización.

## 6. Retrieval y MRR

El runtime devuelve un ranking de cinco posiciones. La operacionalización propuesta es:

- `RR@5(q) = 1/r` si el primer contexto gold aparece en rango `r <= 5`; en otro caso 0;
- `MRR@5 = promedio(RR@5(q))` sobre casos answerable ejecutados válidamente;
- `Precision@5 = contextos recuperados que pertenecen al gold / 5`;
- `Recall@5 = contextos gold recuperados / total de contextos gold`;
- reportar Hit@5 y resultados por caso como diagnóstico.

La meta histórica `MRR >= 0,70` no especifica profundidad. Antes de congelar, la
dirección debe aceptar MRR@5 como operacionalización o exigir un runner de ranking
más profundo exclusivamente evaluativo. No cambiar `top_k` productivo para hacer
coincidir la métrica.

Precision@5 es conteo de IDs relevantes en cinco resultados. `context precision` de
RAGAS evalúa además si los contextos útiles están ordenados antes que los irrelevantes,
normalmente mediante juez y respuesta de referencia. No son intercambiables. No se
define umbral nuevo para Precision@5 o Recall@5.

## 7. RAGAS propuesto

Versión candidata: **RAGAS 0.4.3**, última versión publicada identificada durante esta
preparación. Debe fijarse por versión y hash al autorizar la instalación; no se instala
en OE1-D1/D2. Usar la API `metrics.collections`, recomendada por la documentación
actual, no la API legacy anunciada para deprecación.

Campos mínimos que el runner debe materializar por caso:

| Métrica | Entradas |
| --- | --- |
| Faithfulness | `user_input`, `response`, `retrieved_contexts`; LLM juez para extraer y verificar afirmaciones |
| Context precision | `user_input`, `reference`, `retrieved_contexts`; además IDs gold para el control determinista |
| Context recall | `user_input`, `reference`, `retrieved_contexts`; además `reference_contexts`/IDs para Recall@5 determinista |
| Answer relevancy | `user_input`, `response`; LLM y modelo de embeddings del evaluador |
| MRR@5 | ranking ordenado de IDs recuperados y conjunto de IDs gold; sin juez LLM |

Metas originales, comparadas sobre la media de casos válidos del conjunto acordado:

- faithfulness >= 0,80;
- context precision >= 0,80;
- context recall >= 0,75;
- answer relevancy >= 0,80;
- MRR >= 0,70, con la profundidad decidida antes de ejecutar.

Documentación consultada:

- `https://docs.ragas.io/en/latest/concepts/metrics/available_metrics/faithfulness/`
- `https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/context_precision/`
- `https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/context_recall/`
- `https://docs.ragas.io/en/latest/concepts/metrics/available_metrics/answer_relevance/`
- `https://docs.ragas.io/en/latest/references/evaluation_schema/`
- `https://pypi.org/project/ragas/`

## 8. Juez y confidencialidad

| Opción | Ventaja | Riesgo / condición |
| --- | --- | --- |
| `qwen3:4b-instruct` local existente | Sin egreso ni costo adicional; reproduce el entorno | Ser generador no lo valida como juez. Requiere sanity check ciego y comparación humana; puede no ser suficiente para español, inferencia o formato estructurado. |
| Modelo juez local separado | Evita egreso y reduce dependencia entre generador/juez | Requiere verificar memoria, latencia, licencia, digest, calidad en español y capacidad de salida estructurada antes de elegirlo. No se propone instalar uno todavía. |
| Servicio externo | Puede ofrecer mayor capacidad y estabilidad | Bloqueado hasta autorización de compartir derivados CCD, evaluación de privacidad, términos, región, retención y costo. No enviar contenido en esta fase. |

Antes de elegir juez: sanity check de 12-15 casos balanceados, incluyendo respuestas
respaldadas, incompletas, contradictorias y temporalmente indebidas. Dos pasadas por
métrica; una tercera solo si cambia la conclusión respecto al umbral. Registrar modelo,
revisión/digest, prompt, temperatura, parámetros, runtime y fallos. La decisión final
de suficiencia del juez corresponde a revisión humana documentada.

## 9. Casos no respondibles y errores

- Las preguntas no respondibles se mantienen en un conjunto complementario de
  abstención/aclaración y no entran en retrieval/RAGAS answerable.
- Una abstención apropiada se evalúa por decisión y utilidad, no como una respuesta
  factual con gold inventado.
- Un 503 o timeout es fallo operacional: el caso permanece planificado y se reporta
  como `NE` para métricas de contenido, sin eliminarlo ni convertirlo en cero.
- Una respuesta parcial solo se puntúa si existe; debe declarar el límite y sus
  afirmaciones se evalúan normalmente. Completitud se reporta aparte.
- No se reintenta automáticamente un POST. Un resultado incierto se reconcilia con
  lectura de historial/persistencia.
- La release CCD no contiene `full_document`. Si una release futura los incorpora,
  su acceso/integridad se evaluará separadamente y no se mezclará con MRR vectorial.

## 10. Congelación y artefactos

Antes de OE1-D3 deben quedar registrados: revisión Git, release y hashes anteriores,
versión/hash del banco, responsables y fechas reales de revisión, estado de cada caso,
versión RAGAS, juez/embedding evaluadores y política MRR. El banco privado actual está
en `data/ccd/local/oe1-evaluation/benchmark-candidates-v0.1.json`, ignorado por Git.
No contiene resultados observados.

## 11. Decisiones pendientes

1. Quién puede ratificar autoridad y vigencia de las fuentes.
2. Si MRR@5 satisface la meta histórica o se exige ranking evaluativo más profundo.
3. Quién revisa y quién custodia una reserva realmente no vista.
4. Qué juez local supera la calibración; si ninguno, si se autoriza un proveedor
   externo y bajo qué condiciones.
5. Si 50 casos aprobados son suficientes una vez documentada la baja granularidad
   del corpus.

## CHECKPOINT BANUCHAT - OE1-D1

Protocolo preparado y no aprobado. Corpus canónico identificado sin ingesta ni
mutación. Metas originales conservadas. MRR operacionalizado provisionalmente como
MRR@5. RAGAS y juez pendientes de decisión y calibración. Detenerse antes de OE1-D3.
