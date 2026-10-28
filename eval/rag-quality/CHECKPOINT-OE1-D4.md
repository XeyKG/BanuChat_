# CHECKPOINT BANUCHAT — OE1-D4

Fecha: 28 de octubre de 2026, America/Bogota.
HEAD base: `fca0741b56289f5a399eceffa084733df129b501`.
Estado: **READY_FOR_AUTHOR_REVIEW**.

Este checkpoint registra únicamente preparación y verificación estructural. No
aprueba candidatas, no ejecuta retrieval o RAGAS, no captura respuestas del
sistema y no modifica la configuración productiva del RAG.

## Inventario privado verificado

- Banco candidato: 50 preguntas respondibles y 8 casos complementarios.
- Distribución propuesta: 35 `development` y 15 `reserve_candidate`.
- Tipos: 43 `single_context` y 7 `multi_context_cross_document`.
- Corpus privado requerido: inventario local y 12 artefactos documentales.
- Paquete preparado: `data/ccd/local/oe1-evaluation/review-packet-v1.md`.
- Banco, ledger, corpus y paquete están bajo `data/ccd/local` y son ignorados por
  Git. No se copió contenido documental a este checkpoint.

Estado observado en el ledger privado:

| Estado | Cantidad |
| --- | ---: |
| Pendientes | 49 |
| Aprobadas | 1 |
| Corregidas | 0 |
| Rechazadas | 0 |

La aprobación existente era previa a OE1-D4. Este trabajo no la creó ni la
ratifica. El autor debe confirmar que el responsable, la fecha y el motivo del
registro son auténticos y vigentes antes de conservarla como revisión válida.
Los 8 casos complementarios permanecen pendientes y fuera del denominador de las
50 candidatas respondibles.

## Verificaciones ejecutadas

1. `node eval/rag-quality/review-bank.mjs summary`: cargó y validó el banco y el
   ledger; no reportó señales léxicas de duplicación con el umbral implementado.
2. `node eval/rag-quality/review-bank.mjs packet --corpus-root
   data/ccd/local/guidance-v3`: preparó el paquete privado sin decisiones
   automáticas.
3. Verificación agregada independiente, sin imprimir contenido:
   - 50/50 candidatas con pregunta no vacía;
   - 50/50 con respuesta de referencia no vacía;
   - 50/50 con al menos un contexto estructuralmente válido;
   - 50/50 con restricciones revisables no vacías;
   - 12/12 artefactos con SHA-256 coincidente;
   - 50 entradas detectadas en el paquete privado;
   - cero problemas estructurales detectados.
4. `git check-ignore -v` confirmó que banco, ledger, inventario y paquete privado
   quedan excluidos de Git.

Estas comprobaciones acreditan integridad y disponibilidad para revisión, no la
corrección semántica de las preguntas ni la autoridad institucional del corpus.

## Instrucciones para el autor

Revisar las candidatas una por una, sin observar rankings ni respuestas de
BanuChat:

1. Abrir el paquete privado y seguir el orden agrupado por documento primario.
2. Para cada ID, ejecutar:

   ```powershell
   node eval/rag-quality/review-bank.mjs show `
     --case <ID> `
     --corpus-root data/ccd/local/guidance-v3
   ```

3. Cotejar directamente contra cada artefacto indicado:
   - que la pregunta sea contestable únicamente con los contextos asociados;
   - que todas las afirmaciones de la respuesta de referencia estén respaldadas;
   - que localizador, periodo, aplicabilidad y límites coincidan;
   - que no se infiera vigencia, autorización institucional, datos personales ni
     reglas no documentadas;
   - que no sea un duplicado semántico o una paráfrasis de relleno.
4. Registrar exactamente una decisión manual y un motivo específico:

   ```powershell
   node eval/rag-quality/review-bank.mjs decide `
     --case <ID> `
     --decision approved `
     --reviewer "<nombre real del autor>" `
     --reason "<motivo del cotejo documental>"
   ```

5. Usar `rejected` cuando la candidata no sea corregible sin inventar evidencia.
   Para `corrected`, crear un JSON privado ignorado por Git y pasar
   `--correction <ruta-privada>`. Solo se admiten `question`,
   `reference_answer`, `relevant_contexts`, `restrictions` y `review_notes`.
6. Volver a ejecutar `summary` después de cada bloque. No usar aprobación por
   lote. No ejecutar `export` como autorización del baseline hasta terminar las
   50 decisiones y resolver las limitaciones metodológicas pendientes.

## Problemas y limitaciones pendientes

- No existe autorización institucional formal del corpus CCD; la revisión del
  autor no la sustituye.
- El autor es el único revisor disponible. No hay revisión independiente,
  conciliación entre revisores ni medición válida de acuerdo interevaluador.
- `AnswerRelevancy` obtuvo 7/12 coincidencias frente a expectativas técnicas en
  la calibración sintética de OE1-D3. Esas etiquetas no están ratificadas
  humanamente y el juez no debe tratarse como validado para esa métrica.
- No existe una reserva verdaderamente no vista. Las 15 `reserve_candidate`
  fueron visibles durante preparación y revisión; no deben presentarse como
  holdout ciego ni como evidencia independiente de generalización.
- La aprobación previa del ledger requiere confirmación de procedencia por el
  autor. No impide revisar el paquete, pero no se ratificó en OE1-D4.

## Límite de avance

OE1-D4 termina con el paquete **READY_FOR_AUTHOR_REVIEW**. No se ejecutó baseline
RAGAS, retrieval, captura de respuestas, OE2, ingesta, publicación ni cambio de
PostgreSQL, embeddings, chunking, `top_k`, prompts, generador o modelos.
