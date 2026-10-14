# M9 — Protocolo de evaluación formal de calidad RAG para OE1

Estado: **pool de candidatas en revisión**. [benchmark-v1.json](benchmark-v1.json)
contiene 40 candidatas `draft`; el benchmark aún no está completo ni congelado, RAGAS
no se ha ejecutado y no existen resultados M9.

## A. Propósito

M9 evaluará la calidad del Document RAG de BanuChat sobre el corpus sintético
versionado. El protocolo separa el gold definido por revisión humana de las salidas
observadas del sistema y busca evidencia reproducible para OE1. Los targets históricos
del proyecto se registran como criterios propios, no como umbrales universales de RAGAS.

## B. Alcance

La evaluación principal cubrirá preguntas respondibles mediante retrieval vectorial y
generación documental. No evaluará UX móvil, Intent Router, fast paths estructurados,
latencia, Agent/ReAct, MCP ni datos reales. K2 es evidencia histórica y de desarrollo;
no constituye el benchmark final M9.

Durante el baseline permanecerán congelados:

- embedding `qwen3-embedding:0.6b`, dimensión 1024;
- distancia coseno y búsqueda exacta, sin HNSW/IVFFlat;
- `top_k=5`;
- chunking por secciones H2 sin overlap;
- generador `qwen3:4b-instruct`;
- prompt productivo.

## C. Corpus evaluable

El corpus funcional es 100 % sintético. La evaluación vectorial principal usa solamente
los 10 documentos `chunked`, `doc-001` a `doc-010`, que producen 60 chunks. Todos los
10 documentos deben estar representados en el benchmark principal.

`doc-011` y `doc-012` usan `full_document`: no tienen chunks ni embeddings y quedan
fuera de las métricas vectoriales principales. Sus rutas completas podrán evaluarse en
otro protocolo, sin mezclarlas con MRR@5 o Recall@5.

Las identidades conceptuales del gold son `document_key`, `ordinal`, `locator` y
`source_sha256`. Este último es el SHA-256 del artefacto fuente aprobado en el manifest.
Un runner futuro podrá resolver los UUID de una release concreta, pero deberá comprobar
que las referencias siguen apuntando al mismo contenido versionado.

## D. Benchmark principal

El objetivo es congelar **60 preguntas answerable**. Entre 10 y 15 deberán requerir
legítimamente múltiples contextos. Los tipos previstos son:

- `single_context`;
- `multi_context_same_document`;
- `multi_context_cross_document`.

Antes de la selección se preparará un pool aproximado de 100–120 candidatas. El balance
final por documento y tipo se registrará al congelar el benchmark; no se inventa en esta
fase. La selección debe evitar que un único documento o formulación domine la muestra.

## E. Conjunto de reserva y compromiso

Se prepararán 20–30 preguntas revisadas fuera del repositorio de desarrollo. `Oculto`
significa que el contenido no está disponible para el tuning; poner casos etiquetados
como `reserve` dentro del mismo JSON no cumple esa propiedad. El benchmark versionado
contiene únicamente el split `primary`.

Antes del tuning solo se puede versionar el compromiso no revelador de
[reserve-commitment-template.json](reserve-commitment-template.json), validado por
[reserve-commitment.schema.json](reserve-commitment.schema.json). No se inventan todavía
ubicación externa, responsable, fecha ni hash. Al iniciar la primera evaluación de
reserva se debe presentar el archivo controlado, validarlo primero contra
[reserve.schema.json](reserve.schema.json), serializar el objeto congelado como UTF-8 sin
BOM, JSON con indentación de 2 espacios, saltos LF y exactamente un LF final, y calcular
`content_sha256` sobre esos bytes canónicos. Solo después se debe verificar que coincide
exactamente con el compromiso y ejecutar el reserve sobre el sistema ajustado. El archivo
con contenido no se versionará antes de terminar tuning.

El proceso o agente usado para tuning no recibe el contenido reserve. El proceso de
curación puede prepararlo y revisarlo; durante tuning solo se expone el commitment. El
reserve real debe quedar creado, congelado y con su SHA-256 comprometido en Git antes de
ejecutar el baseline principal. Así, ni ese baseline ni un tuning posterior pueden
influir en su contenido. La ubicación externa, responsable, fecha, número exacto y hash
final quedan pendientes hasta la preparación controlada.

## F. Construcción y revisión humana

Las candidatas pueden apoyarse en generación automática, pero ninguna entra al
benchmark congelado sin revisión humana. La revisión seguirá
[annotation-guidelines.md](annotation-guidelines.md) y registrará notas cuando exista
ambigüedad o una decisión editorial relevante.

Se intentará una revisión adicional por una persona que no haya participado en la
creación del corpus. Si no se consigue, se documentará como limitación. No se inventarán
revisores, fechas ni acuerdos. La revisión de cordura del juez descrita más adelante no
sustituye la revisión del gold.

## G. Ground truth

Cada caso debe fijar antes de observar retrieval o generación:

- pregunta exacta;
- respuesta de referencia verificable y suficientemente completa;
- uno o más contextos relevantes identificados por documento, ordinal, locator y
  `source_sha256`;
- tipo de pregunta y, cuando aplique al benchmark principal, split;
- estado y notas de revisión.

El benchmark debe congelarse antes de ejecutar el sistema contra él. Los resultados del
baseline nunca se usarán para modificar retroactivamente preguntas, respuestas de
referencia o contextos gold. Una corrección objetiva posterior exige una nueva versión,
trazabilidad del cambio y una nueva interpretación de comparabilidad.

## H. Métricas deterministas

El runtime devuelve `top_k=5`; por tanto se reportará **MRR@5**, no MRR de un ranking
completo. También se calcularán:

- `Hit@5`: al menos un contexto gold recuperado;
- ID-based/context `Recall@5`: proporción de contextos gold presentes en el top-5;
- resultados por caso y agregados por tipo y documento cuando sean interpretables.

La identidad primaria se resolverá desde `document_key + ordinal + locator + source_sha256`; los UUID
de release se registrarán como procedencia observada, no como única identidad del gold.

## I. Métricas RAGAS

Una fase futura calculará faithfulness, context precision, context recall y answer
relevancy con una versión y configuración de RAGAS registradas. Todavía no se ha
seleccionado ni instalado RAGAS.

Targets académicos históricos del proyecto:

| Métrica | Target del proyecto |
| --- | ---: |
| Faithfulness | ≥ 0.80 |
| Context precision | ≥ 0.80 |
| Context recall | ≥ 0.75 |
| Answer relevancy | ≥ 0.80 |
| MRR@5 | ≥ 0.70 |

Estos valores no se presentan como estándares universales establecidos por RAGAS. La
comparación primaria con cada target usará la media observada del benchmark principal.

## J. Juez LLM

No se selecciona un modelo juez en esta tarea. Antes de la evaluación se hará un
**sanity check** de 10–15 casos para comprobar, como mínimo:

- comprensión adecuada del español;
- detección de afirmaciones no respaldadas;
- diferenciación entre respuestas respaldadas y no respaldadas.

Este ejercicio es una revisión de cordura, no una validación estadística ni un estudio
de acuerdo. Para cada métrica dependiente de juez se prevén dos pasadas independientes.
Si producen conclusiones distintas respecto del target, se hará una tercera pasada. Se
registrarán modelo, revisión cuando exista, proveedor/runtime, temperatura, parámetros y
seed solo si el runtime realmente la soporta. No se afirmará determinismo sin garantía.

## K. Análisis de incertidumbre

Por métrica se reportarán media, distribución o resultados por caso cuando aplique, e
intervalo bootstrap descriptivo del 95 % sobre casos. La unidad de remuestreo será el
caso completo; el método, número de remuestras y tratamiento de casos inválidos se
versionarán antes de ejecutar.

El intervalo no sustituye el criterio de aceptación predefinido: la comparación primaria
contra el target usa la media observada. Esta incertidumbre de muestreo se reportará por
separado de la variabilidad entre pasadas del juez LLM.

## L. Regla de tuning

El baseline se ejecutará una vez con el RAG congelado y se conservará sin alteraciones.
Si motiva tuning:

1. se registra el baseline original;
2. se documentan la hipótesis y el cambio exacto;
3. el conjunto principal puede reutilizarse para comparación pre/post, declarando que
   deja de ser un holdout limpio;
4. el conjunto `reserve` no visto se usa como evidencia adicional de generalización.

No se ajustarán embedding, dimensión, métrica, búsqueda, `top_k`, chunking, generador o
prompt mientras se construye y ejecuta el baseline.

## M. Benchmark de abstención futuro

M9 principal contiene preguntas answerable. Un benchmark posterior y separado podrá
medir abstención con preguntas sin evidencia suficiente, casos parcialmente respondibles
y formulaciones fuera de alcance. No se mezclarán esos casos con las 60 preguntas
answerable ni se definen todavía sus preguntas, métricas o umbrales.

## N. Reproducibilidad

El artefacto congelado deberá registrar y verificarse mediante hash. La ejecución futura
registrará como mínimo:

- revisión Git de implementación y versión/hash del benchmark;
- release concreta y resolución de cada contexto gold a UUIDs observados;
- modelos, digests/revisiones, runtime y recetas efectivas;
- configuración de retrieval y generación;
- versiones de RAGAS y demás herramientas;
- configuración y pasadas del juez;
- outputs por caso, agregados e intervalos con método explícito.

El contrato está en [benchmark.schema.json](benchmark.schema.json) y la plantilla aún
vacía en [benchmark-template.json](benchmark-template.json). El schema prohíbe almacenar
salidas observadas, scores o PASS/FAIL dentro del gold. La cardinalidad de contextos por
tipo se valida estructuralmente; la validez de locators, hashes y diversidad semántica
queda para el validador de congelación.

## O. Invariantes del validador de congelación futuro

Antes de marcar el benchmark como `frozen`, un validador deberá comprobar: IDs únicos;
exactamente 60 casos `primary`, todos `approved`; representación de los 10 documentos
elegibles; 10–15 preguntas multi-contexto; `single_context` con exactamente un contexto;
`multi_context_same_document` con dos o más contextos del mismo `document_key`;
`multi_context_cross_document` con dos o más `document_key` distintos; claves en `doc-001`
a `doc-010`; ordinal y locator reales; `source_sha256` igual al artefacto del manifest;
y ausencia de resultados observados en el gold.

El schema no intenta expresar esas relaciones entre elementos ni verificar el contenido
del corpus. Esa responsabilidad pertenece al validador de congelación y a la revisión
humana.

## P. Limitaciones

- El corpus es pequeño, sintético y específico de BanuChat.
- Sesenta casos no demuestran rendimiento universal ni uso institucional.
- La revisión humana puede conservar sesgos de quienes construyeron el corpus.
- Si no hay revisor adicional independiente, se declarará expresamente.
- Las métricas con juez dependen del modelo y runtime registrados y pueden variar.
- Los intervalos bootstrap serán descriptivos y sensibles a la composición del benchmark.
- Reutilizar el split principal después del baseline reduce su valor como holdout.
- K2 y otras evidencias históricas no se combinan estadísticamente con M9.

