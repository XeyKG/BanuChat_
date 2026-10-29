# CHECKPOINT BANUCHAT — OE1-D5.4D

Fecha: 28 de octubre de 2026, America/Bogota.  
Estado: **AMBIGUITY_BLOCK_ASSESSED**.

## Identidad y aprobaciones existentes

- Rama `main`; HEAD inicial `18de40a8dbf577f046bd0e4d01d3897ee6fbeda5`; estado Git inicial limpio.
- Se leyeron `AGENTS.md` y los checkpoints D5.3, D5.4A, D5.4B y D5.4C.
- La CLI principal informó 29/29 `approved`, 0 pendientes, 0 rechazadas y 0 solicitudes de corrección. El ledger principal contiene 29 eventos válidos, vinculados al SHA-256 del banco `0f7c22993956c3e6ec1ea11c50071eb41c86e6141a45dc43787467d878fba3bf`.
- Cada ledger auxiliar D5.4B y D5.4C contiene cabecera válida y exactamente cuatro eventos `approved`, con IDs presentes en su suplemento, responsable, motivo y fecha UTC válida. Sus cabeceras coinciden con los SHA-256 de sus suplementos: D5.4B `96658a679e582fad88f0968213647eeb298911be705650c77c8b48fa44b552e7`; D5.4C `093f895f10e2e6bfe498b491796359a765b617e34a03c1688d713f91d7fa071e`.
- En conjunto hay **37 IDs distintos con aprobación registrada** y sin duplicados entre bancos. El identificador del revisor coincide en los tres ledgers. Esa coincidencia no verifica independientemente su identidad civil ni constituye revisión humana independiente.

## Primer bloque de ambigüedad

La matriz privada contiene diez casos `AMBIGUA`. Se analizaron solo los primeros cinco por ID ascendente, ninguno incorporado previamente:

| Histórico | Causa de la ambigüedad | Clasificación | Resultado |
| --- | --- | --- | --- |
| `OE1-CCD-C-005` | Se mezclaban consulta al CCD y trámites de inscripción/pago; la exclusividad de un canal no estaba demostrada. | `RESOLUBLE_CON_REFORMULACION` | Propuesta comparativa acotada a funciones documentadas. |
| `OE1-CCD-C-011` | La negación histórica sobre umbrales quedó obsoleta frente a una regla actual. | `RESOLUBLE_CON_REFORMULACION` | Propuesta sobre el límite exacto del umbral diagnóstico, distinto de la orientación general para pilares pendientes. |
| `OE1-CCD-C-016` | Regla histórica y orientación actual se solapan parcialmente con periodos distintos. | `REQUIERE_ACLARACION_DOCUMENTAL` | Sin propuesta: las reformulaciones disponibles repetirían casos aprobados o trasladarían una regla entre periodos. |
| `OE1-CCD-C-017` | Tabla y prosa históricas de transición difieren; no autorizan reconocimiento individual. | `RESOLUBLE_CON_REFORMULACION` | Propuesta limitada a identificar la divergencia documental. |
| `OE1-CCD-C-018` | La pauta de comprobación combina inferencia y confirmación de dominio; faltan reglas documentales por programa y cohorte. | `REQUIERE_ACLARACION_DOCUMENTAL` | Sin propuesta: falta soporte independiente para un procedimiento individual inequívoco. |

Se prepararon **3 candidatas nuevas** y **2 casos sin resolver** en este bloque. No se analizaron los otros cinco `AMBIGUA`. El caso histórico 009 sigue sin resolver desde D5.4B.

## Suplemento privado y controles

Archivo nuevo: `data/ccd/local/oe1-evaluation/supplement-ccd-1.4.0-d5-4d-v1.json`, SHA-256 `dff70bef2c687d6b5665ad00f944f628f43014e329a581ef1e75687f9037319e`, ignorado por Git. Conserva el análisis individual de los cinco casos y tres propuestas con ID histórico y nuevo, pregunta, respuesta, cuatro contextos gold sobre cuatro unidades, identidades de versión/chunk, localizador, hashes, procedencia, periodo, población, condiciones, excepciones y motivo. Todas las propuestas siguen `draft_pending_author_review` y tienen decisión humana nula.

Una consulta PostgreSQL `READ ONLY` confirmó que los contextos pertenecen a la release CCD 1.4.0 current y al manifest esperado; sus versiones están `ready`, con ordinal y localizador exactos y embedding presente. Los archivos locales coinciden con `source_sha256` y con el texto del chunk publicado. Los tres IDs nuevos son únicos y no colisionan con los 37 aprobados. Se revisó la diferencia semántica frente a las preguntas existentes: las nuevas se centran en funciones de canales, el valor limítrofe del umbral y una contradicción histórica, respectivamente.

Los tres bancos anteriores y sus tres ledgers conservan sus hashes; el benchmark histórico CCD 1.2.0 sigue con SHA-256 `1e007142c2a573d9f2e4403e28b8eaae7dfe03cd31d1a514ee97423a7617609e`. Las fuentes de contacto y umbral incluyen `DOMAIN_CONFIRMATION`; la unidad de transición incluye `INFERENCE`. Esas procedencias se mantienen separadas del respaldo documental y no equivalen a ratificación institucional. El autor debe cotejar las tres propuestas con las fuentes originales y resolver explícitamente las dos aclaraciones pendientes. Persisten la falta de revisión humana independiente y los límites metodológicos documentados en D5.3.

No se modificaron producto, CLI, evaluador, PostgreSQL, releases, modelos, embeddings, prompts, top-k, RAG, bancos ni ledgers previos. No se ejecutaron retrieval, generación, baseline ni RAGAS. `git diff --check` se ejecutó sin errores. No hubo commit ni push.
