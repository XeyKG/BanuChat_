# CHECKPOINT BANUCHAT — OE1-D5.4E

Fecha: 28 de octubre de 2026, America/Bogota.  
Estado: **AMBIGUITY_REVIEW_COMPLETED**.

## Identidad y aprobaciones

- Rama `main`; HEAD inicial `8590ef0c4d95dcb53cb57ef6e15012258d4de3ee`; estado Git inicial limpio.
- Se leyeron `AGENTS.md` y los checkpoints D5.3, D5.4A, D5.4B, D5.4C y D5.4D.
- La CLI principal informó 29 aprobadas, 0 pendientes, 0 rechazadas y 29 eventos. Se verificaron además 4 aprobaciones en D5.4B, 4 en D5.4C y 3 en D5.4D. Las cuatro cabeceras enlazan el SHA-256 exacto de su respectivo banco, los eventos tienen ID existente, motivo, responsable y fecha válidos, y los cuatro ledgers están ignorados por Git.
- **40 aprobaciones registradas, 40 IDs distintos, sin colisiones**. El identificador del revisor coincide en los cuatro ledgers; no se infiere de ello una verificación independiente de identidad civil ni revisión humana independiente. No se reconstruyó ni añadió ninguna decisión.
- SHA-256 de los bancos previos intactos: principal `0f7c22993956c3e6ec1ea11c50071eb41c86e6141a45dc43787467d878fba3bf`; D5.4B `96658a679e582fad88f0968213647eeb298911be705650c77c8b48fa44b552e7`; D5.4C `093f895f10e2e6bfe498b491796359a765b617e34a03c1688d713f91d7fa071e`; D5.4D `dff70bef2c687d6b5665ad00f944f628f43014e329a581ef1e75687f9037319e`. También se comprobaron sin cambios sus cuatro ledgers. El benchmark histórico CCD 1.2.0 conserva SHA-256 `1e007142c2a573d9f2e4403e28b8eaae7dfe03cd31d1a514ee97423a7617609e`.

## Últimos cinco casos `AMBIGUA`

La matriz original registra diez casos ambiguos. Tras excluir los cinco analizados en D5.4D, se examinaron exclusivamente `OE1-CCD-C-020`, `OE1-CCD-C-021`, `OE1-CCD-C-022`, `OE1-CCD-C-045` y `OE1-CCD-C-046`.

| Histórico | Causa y límite | Clasificación | Resultado |
| --- | --- | --- | --- |
| 020 | Divergencia interna en la tabla de transición sobre requisitos conjuntos o alternativos; el caso aprobado 017 ya examina la discrepancia literal. Falta aclaración autorizada para decidir equivalencias. | `REQUIERE_ACLARACION_DOCUMENTAL` | Sin candidata. |
| 021 | La tabla histórica no establece una regla universal por programa, modalidad y cohorte; una síntesis alternativa procede solo de confirmación de dominio. | `REQUIERE_ACLARACION_DOCUMENTAL` | Sin candidata. |
| 022 | Se mezclan prueba antigua pendiente, prueba nueva y cursos aprobados. No existe mapeo documental ni autorización individual inequívoca; la síntesis de evaluaciones procede solo de confirmación de dominio. | `REQUIERE_ACLARACION_DOCUMENTAL` | Sin candidata. |
| 045 | Combina finalidad histórica y consecuencia por pilar de periodos distintos. Los casos aprobados 007 y 012 cubren los componentes por separado; falta vínculo histórico específico sin trasladar una regla general. | `REQUIERE_ACLARACION_DOCUMENTAL` | Sin candidata. |
| 046 | Se confundían el resultado de un diagnóstico y los antecedentes de cursos antiguos; la tabla de transición mantiene una divergencia interna. | `RESOLUBLE_CON_REFORMULACION` | Una candidata comparativa acotada, sin decidir reconocimiento individual. |

Ninguno de los cinco se clasificó `SIN_EVIDENCIA_SUFICIENTE`: hay unidades pertinentes, pero cuatro requieren aclaración o producirían duplicación conceptual. No se trasladaron inferencias o confirmaciones de dominio a reglas institucionales.

## Suplemento nuevo y cobertura global

Archivo privado nuevo: `data/ccd/local/oe1-evaluation/supplement-ccd-1.4.0-d5-4e-v1.json`, SHA-256 `40a3bc7d623209b6a83d90919022af4295d232ef25ef46287363d8767b0f03ab`, ignorado por Git. Conserva el análisis individual de los cinco casos y **una candidata** con ID histórico y nuevo, respuesta propuesta, dos contextos gold, identidad de versión/chunk, localizador, hashes, periodo, población, procedencia, restricciones y justificación. Su estado es `draft_pending_author_review`; la decisión humana es nula. No colisiona con los 40 IDs aprobados.

| Medida distinta | Cantidad |
| --- | ---: |
| Casos históricos CCD 1.2.0 | 50 |
| Candidatas CCD 1.4.0 técnicamente preparadas | 41 |
| Candidatas con aprobación registrada del autor | 40 |
| Candidatas nuevas pendientes de revisión | 1 |
| Casos históricos todavía sin candidata | 9 |

Los nueve sin candidata son 009, 014, 016, 018, 019, 020, 021, 022 y 045. Entre los faltantes figuran opciones diagnósticas sin respaldo documental suficiente, distinción entre reprobar curso y diagnóstico, un plazo histórico no recuperado, reglas de transición por programa/modalidad/cohorte y contradicciones de la tabla histórica. Las 41 candidatas usan 35 de las 107 unidades actuales; 23 tienen un contexto, 17 dos y una tres. Los temas no son categorías exclusivas: 25 de las 41 candidatas incluyen syllabus académico. Temarios básicos, evaluación de experiencia, modalidades, créditos y otras familias añadidas en CCD 1.4.0 siguen con cobertura escasa o nula. Hay riesgo de sesgo hacia los syllabus históricos; algunas preguntas operativas y de transición comparten conceptos y necesitan revisión de duplicación durante la consolidación.

## Controles y siguiente decisión

Mediante transacción PostgreSQL `READ ONLY` se confirmó la release current CCD 1.4.0, el manifest esperado y las identidades exactas de los dos contextos nuevos; ambos están `ready`, con embedding, y sus archivos locales coinciden por SHA-256 y texto con los chunks publicados. Se comprobaron la integridad estructural y los hashes de los cuatro bancos y ledgers anteriores. No se imprimió contenido documental en este checkpoint.

El autor debe revisar la nueva candidata y decidirla manualmente, resolver o descartar de forma explícita los nueve casos restantes y valorar si la cobertura de las 107 unidades exige preguntas nuevas legítimas. Para cerrar la construcción del benchmark hace falta una versión consolidada trazable, revisión de completitud del gold y aceptación metodológica; **40 aprobaciones no prueban que el benchmark esté terminado**. Permanecen la falta de ratificación institucional y revisión humana independiente, la limitación del juez `AnswerRelevancy` (7/12 coincidencias técnicas), MRR@5 pendiente de aceptación y la divergencia entre evaluador y camino documental actual. No se inició consolidación ni evaluación.

No se modificaron PostgreSQL, releases, producto, CLI, evaluador, RAG, modelos, embeddings, prompts ni `top_k`. No se ejecutaron retrieval, generación, baseline ni RAGAS. `git diff --check` se ejecutó sin errores. No hubo commit ni push.
