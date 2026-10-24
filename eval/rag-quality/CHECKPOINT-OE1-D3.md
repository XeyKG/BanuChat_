# CHECKPOINT BANUCHAT — OE1-D3

Fecha: 24 de octubre de 2026, America/Bogota.

Estado: **evaluador funcional y validado técnicamente; baseline CCD no ejecutado**.
OE1 no se declara cumplido.

## A. Herramienta de revisión humana

`review-bank.mjs` permite resumir, inspeccionar, decidir y exportar. La inspección
muestra pregunta, respuesta, restricciones, periodo, aplicabilidad y artefacto privado;
verifica el SHA-256 antes de mostrar evidencia. Las decisiones admiten `approved`,
`corrected` y `rejected` y registran responsable, fecha y motivo. Las señales de
duplicación son solo ayudas léxicas; nunca aprueban casos.

Estado observado:

- 50 candidatas respondibles pendientes y 8 complementarias pendientes;
- 35 `development` y 15 `reserve_candidate` visibles durante preparación;
- 43 `single_context` y 7 `multi_context_cross_document`;
- 0 señales de duplicación por normalización/Jaccard con umbral 0,68;
- export privado `incomplete`: 0 aprobadas, brecha 50.

## B. Evaluador OE1-D3

El runner carga únicamente un banco `approved` de 50 casos y verifica estructura,
IDs, hash del banco, release actual, estado `ready`, contrato `ccd-1.2.0`, manifest,
conteos, configuración de embeddings y la resolución exacta del gold. Reutiliza
`retrieveDocumentChunksForQuery` y las métricas K2 existentes. Los outputs CCD solo
pueden escribirse en rutas ignoradas por Git.

Registra por separado casos planificados, intentados, completados, errores, timeouts,
no evaluables y abstenciones. Los fallos operacionales no se convierten en cero ni se
eliminan. No hay reintentos automáticos.

## C. Pruebas técnicas

- 10/10 pruebas Node PASS.
- Cubiertos: perfecto, parcial, miss, denominadores, ausencia total de evaluables,
  duplicados, brecha de revisión, preparación de campos RAGAS, timeout, preflight
  correcto y rechazo de sustitución de release.
- `node --check` PASS para ambos CLI.
- `py_compile` PASS para el adaptador.
- `pip check` PASS en el entorno aislado.
- El runner rechaza correctamente el export actual `incomplete`; no creó resultado CCD.

Estos resultados validan el evaluador, no el desempeño de BanuChat.

## D. Compatibilidad con RAGAS 0.4.3

Compatibilidad comprobada contra el paquete instalado:

- API: `ragas.metrics.collections`;
- clases: `Faithfulness`, `ContextPrecision`, `ContextRecall`, `AnswerRelevancy`;
- RAGAS `0.4.3`;
- OpenAI SDK `1.109.1`, Instructor `1.3.2`, langchain-community `0.3.31`;
- Ollama `0.35.0`, solo loopback;
- juez `qwen3:4b-instruct`, digest
  `0edcdef34593eac1aa2be9c7d06c432dcf81945adca5eca2f27662c18f168ba0`;
- embeddings `qwen3-embedding:0.6b`, digest
  `ac6da0dfba84a81fdbfbaf330198c33cd77c4cdfc53e8bc50eb581914a15621d`.

Se fijó `langchain-community==0.3.31` porque la rama 0.4.x ya no contiene el módulo
Vertex AI que RAGAS 0.4.3 todavía importa. `AnswerRelevancy` requirió cliente de
embeddings asíncrono, conforme a la interfaz realmente invocada por esa versión.

## E. Calibración local del juez

Se ejecutaron dos pasadas independientes sobre 12 fixtures sintéticos: fundamentados,
parciales, contradictorios, irrelevantes, temporales, ruidosos e incompletos. Cada
pasada completó 48/48 juicios, sin errores ni timeouts. Ambas produjeron los mismos
scores por caso, salvo diferencias de coma flotante despreciables.

Coincidencia frente a expectativas técnicas predefinidas (frontera diagnóstica 0,5,
que no es target OE1):

| Métrica | Coincidencias | Lectura técnica |
| --- | ---: | --- |
| Faithfulness | 11/12 (91,7 %) | Buena señal; falló un caso temporal parcialmente respaldado. |
| Context precision | 10/12 (83,3 %) | Aceptable como señal inicial; falló en dos casos parciales/incompletos. |
| Context recall | 12/12 (100 %) | Consistente en estos fixtures controlados. |
| Answer relevancy | 7/12 (58,3 %) | Insuficiente para aceptar este juez sin revisión adicional. |
| Total | 40/48 (83,3 %) | No compensa la debilidad específica de Answer Relevancy. |

Las etiquetas son expectativas técnicas preparadas, **no etiquetas humanas
ratificadas**. Por tanto la comparación humana solicitada sigue pendiente. No se
ajustaron scores ni umbrales para favorecer al modelo. No se instaló otro juez: de los
modelos disponibles, `qwen3:4b` no aporta evidencia previa de una mejora frente a la
variante instruct ya probada. Un juez local de mayor capacidad solo debe incorporarse
tras revisar memoria, licencia, latencia y calidad en español; servicios externos
permanecen bloqueados.

Evidencia: `results/judge-calibration-v1-2026-10-24.json` y
`results/judge-calibration-v1-2026-10-24-run2.json`.

## F. Banco y reserva

- Banco CCD: no revisado; 0/50 aprobadas.
- Export: privado, ignorado por Git y marcado `incomplete` con brecha 50.
- Casos complementarios: 8, fuera de métricas answerable, pendientes de revisión.
- Holdout: **no existe uno válido**. Las 15 `reserve_candidate` fueron visibles al
  proceso de preparación y no son una reserva verdaderamente no vista.
- No se consultó ninguna pregunta reservada ni se ejecutó baseline CCD.

## G. Pendientes antes del primer baseline CCD

1. Revisión humana real de pregunta, respuesta, evidencia y límite temporal; corregir
   o rechazar sin rellenar artificialmente la brecha.
2. Ratificar humanamente las etiquetas de calibración y decidir el tratamiento de
   Answer Relevancy: otro juez local probado o limitación metodológica explícita.
3. Resolver académicamente si MRR@5 operacionaliza la meta histórica y si una muestra
   final menor de 50 sería admisible en caso de rechazos.
4. Crear y comprometer una reserva realmente no vista bajo custodia ajena al proceso
   de tuning; hasta entonces no alegar generalización.
5. Congelar el banco aprobado y capturar las respuestas del RAG sin modificar
   producción; ejecutar una sola vez el baseline y conservar errores/denominadores.

## H. CHECKPOINT

OE1-D3 queda técnicamente preparado. La siguiente acción autorizable es la revisión
humana y la decisión sobre el juez; no OE2 ni una evaluación final CCD. No se modificó
RAG productivo, PostgreSQL/pgvector, publicaciones, embeddings, chunking, generador,
REST, Mobile, autenticación, Docker o N8N.
