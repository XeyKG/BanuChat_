# BanuChat — curación de release piloto y cierre de casos residuales

Fecha local: 2026-10-25, America/Bogota.

HEAD inicial/final: `89c4559aaf2b75d0a9bbceb8ae4f8592d804647a`.

El worktree comenzó limpio. Se refinó la propuesta documental y se corrigieron los dos casos residuales de chat. La release documental vigente permaneció intacta. Los conteos de aprobación siguen en cero: una candidatura es una propuesta de revisión, no una autorización de mostrar evidencia.

## Reclasificación de los 547 candidatos

| Clase nueva | Unidades |
|---|---:|
| RELEASE_CORE_CANDIDATE | 139 |
| OPERATIONAL_CONTEXT_CANDIDATE | 28 |
| EDITORIAL_INTERNAL | 106 |
| PROMOTIONAL_LOW_VALUE | 17 |
| TEMPORAL_CONTEXT_REQUIRED | 24 |
| HISTORICAL_CONTEXT_ONLY | 15 |
| CONFLICT_REVIEW | 109 |
| PRIVACY_EXCLUDE | 20 |
| REJECT_LOW_INFORMATION | 89 |
| **Total** | **547** |

Las 547 unidades y los 29 claims tienen `approval_status=NOT_APPROVED` y `evidence_visible_allowed=false`. Solo las dos primeras clases son elegibles para una aprobación posterior de visibilidad. El overlay v2 sustituye los indicadores de visibilidad del conjunto anterior, que se conserva como evidencia histórica sin sobrescribirlo.

Los 95 candidatos procedentes del documento de revisión de correos quedaron excluidos: 91 como EDITORIAL_INTERNAL y cuatro como PROMOTIONAL_LOW_VALUE. Se excluyeron asimismo instrucciones de plantilla y diseño presentes en otras fuentes. La detección no equipara automáticamente palabras como “publicación” o “ajustar” con edición: se distingue el contexto de una instrucción editorial del contenido académico de un curso.

Los registros separan FACTUAL_ACADEMIC, FACTUAL_OPERATIONAL, PROMOTIONAL_CLAIM y material que no constituye un hecho. Los bloques mixtos solo pueden aportar soporte a un claim normalizado y revisado; nunca se autoriza ingerir su texto bruto con slogans, metadatos, instrucciones o colas de evaluación. Las referencias bibliográficas aisladas no se convierten en conocimiento académico adicional.

## Claims consolidados y propuesta de piloto

Se formaron **29 knowledge_claims**, agrupados por curso y sección —descripción, competencias y contenidos—, estructura, propósito, pilares, contacto y procedimientos. Los repetidos se consolidan mediante una afirmación normalizada, con IDs de unidades de soporte y localizadores. No se propone una release de 547 chunks ni una relación automática de un claim por chunk.

- **26 claims** se proponen para revisión de piloto: descripciones de los siete cursos, estructura, propósito y descripción de pilares.
- **Tres claims retenidos**: contacto organizacional mínimo, por revisión abierta de vigencia; y dos procedimientos de interfaz, por revisión de aplicabilidad y pasos condicionales.

Algunos fragmentos fuente breves o complementarios fuera de los 547 completan el contexto de una sección. Se enumeran explícitamente en `source_unit_ids_outside_original_547`, no se cuentan como nuevos candidatos ni se consideran aprobados. Nunca proceden de los cinco libros GOVERNANCE_INTERNAL.

Cada claim registra statement, supporting_unit_ids, evidence_sources, locators, topic, scope, temporal_status, conflict_status, privacy_status, authority_status y admission_recommendation. Las comunicaciones solo quedan como posibles corroboraciones de un claim ya respaldado por A/B; no añaden por sí mismas hechos importantes al piloto.

La propuesta describe las ediciones entregadas y no declara vigencia institucional actual. Autoridad y actualidad permanecen sin confirmar. Antes de una publicación deberá revisarse esa atribución, el alcance permitido y cada oración normalizada.

## Jerarquía operativa de revisión

`source-tiering.json` clasifica los archivos y sus secciones candidatas:

- TIER_A: descripciones académicas o de lineamientos coherentes y delimitadas.
- TIER_B: procedimientos operativos con alcance revisable.
- TIER_C: comunicaciones que pueden corroborar A/B.
- TIER_D: marketing, editorial, borradores, diseños y gobernanza interna.
- TIER_E: conflicto, privacidad, historia o temporalidad pendiente.

El tier de unidad prevalece sobre el tier orientativo del documento. Un syllabus TIER_A no hace admisibles sus plantillas, evaluaciones, códigos, requisitos ni referencias. La jerarquía es prioridad de revisión y no prueba de autoridad institucional.

## Conflictos

Se conservaron sin resolver automáticamente los **11 grupos anteriores** y se añadieron cuatro: **15 en total**.

| Nuevo grupo | Tensión que requiere revisión |
|---|---|
| CF-012 | Créditos de catálogo, créditos del plan y campos de uso operativo no deben confundirse. |
| CF-013 | La descripción genérica/promocional de bienestar no sustituye el alcance del syllabus entregado centrado en salud digital y telesalud. |
| CF-014 | El porcentaje de inasistencia y el ejemplo numérico del mismo texto no identifican el mismo umbral. |
| CF-015 | Una nota de recuperación de contraseña incluye entre sus pasos condicionales un paso de menú principal de evaluación. |

Se conservan afirmaciones, unidades, fuentes y localizadores por grupo. Los claims propuestos para piloto no dependen de unidades de conflictos abiertos. La descripción específica de un syllabus no se usa para decidir una equivalencia, una regla de reconocimiento o la vigencia de una oferta.

Tarifas, homologaciones, reconocimiento, programación individual, cupos, personas, datos operativos temporales, promociones y notas editoriales siguen fuera del piloto. Los tres claims retenidos tampoco se consideran publicables.

## Diagnóstico de “correo ccd”

Se ejecutó el núcleo RAG real con retrieval PostgreSQL/pgvector y generación Ollama, instrumentando la entrada/salida del generador sin cambiar el protocolo público.

La evidencia M12 aparece en rank 1 y el selector la entrega correctamente. El generador completaba con solo `FUENTES: [1]`, sin cuerpo factual. La clasificación observada es **POSTVALIDATION_FAILURE**, originada por una salida incompleta del generador: el parser rechaza correctamente una línea de citas sin respuesta.

La corrección añade a la instrucción general de contacto la obligación de redactar una oración desde el canal documentado antes de la línea de fuentes. No contiene una respuesta por pregunta, no añade un correo hardcodeado y no cambia modelo ni parser. La prueba negativa confirma que una salida de solo fuentes continúa rechazándose.

Resultado final: **resuelto**, respuesta respaldada por M12 y advertencia de vigencia conservada.

## Diagnóstico de P0-R06

La evidencia seleccionada sí contiene quién orienta la selección a partir de los resultados y quién gestiona la matrícula. La generación omitía ese actor e incluía una negación no respaldada. La sustitución de seguridad anterior conservaba únicamente la primera oración del fragmento, perdiendo también el dato de orientación.

El extracto literal de U03 conserva ahora las dos primeras oraciones: consecuencia más actor/proceso. Sigue restringido a evidencia recuperada y al antecedente pertinente; la rama de curso reprobado conserva su tratamiento separado. No se hizo otro intento de generación ni se introdujo una respuesta por case_id.

Resultado final: **PASS**, frente a PARTIAL anterior.

## Regresión de seguridad encontrada y corregida

La primera corrida completa de esta iteración produjo una afirmación no respaldada en el tercer turno de MT-06: convirtió vigencia no confirmada en caducidad confirmada del contacto. Se conserva en `multiturn-after-pass1.jsonl` y se adjudica como **una alucinación intermedia**. No se oculta ni se cuenta esa corrida como resultado final aceptado.

Se añadió una comprobación específica de contacto que rechaza afirmaciones categóricas de vigencia o caducidad cuando M12 solo respalda un canal histórico. Las formulaciones que expresan incertidumbre permanecen permitidas. La corrección fortalece la postvalidación, sin relajar barreras globales. Se repitió después la regresión completa.

En la corrida final ese turno se abstiene correctamente ante la vigencia no demostrada. Las preguntas de canal siguen respondiéndose desde M12.

## Resultados finales

| Métrica | Base de esta iteración | Final |
|---|---:|---:|
| Primarios correctos, incluidas dos aclaraciones | 71/72 | **72/72** |
| Respuestas positivas respaldadas | 69/70 | **70/70** |
| Falsas abstenciones | 1/72 | **0/72** |
| Negativos seguros | 24/24 | **24/24** |
| Robustez lingüística | 34/35 | **35/35** |
| Regresiones P0 correctas | 9/10; una parcial | **10/10** |
| P0-R06 | PARTIAL | **PASS** |
| Secuencias multiturno | 9/9 | **9/9** |
| Alucinaciones confirmadas en corrida final | 0 | **0** |
| Citas monovuelta respaldadas | 81/81 | **82/82** |

Los 72 primarios se desglosan en 70 PASS y dos CLARIFY_CORRECT. Los 24 negativos: ocho CLARIFY_CORRECT y 16 ABSTAIN_CORRECT; cuatro rechazos son explicaciones acotadas con fuentes, no abstenciones literales. Las diez regresiones P0: ocho PASS y dos CLARIFY_CORRECT. Las 35 variantes son subconjunto de los 72, no otras 35 ejecuciones independientes.

Cada corrida HTTP comprende 106 conversaciones monovuelta y nueve secuencias con 22 turnos. Se completaron dos corridas y se eliminaron las **230 conversaciones de ensayo**. La instancia temporal 3005 usó la composición autenticada vigente y el código de trabajo; fue detenida al terminar. La API habitual 3004 no se reinició y necesitará su recarga normal para usar los cambios.

La adjudicación es técnica por el agente, comparando afirmaciones y citas con la evidencia admitida. No se declara revisión humana independiente, benchmark ciego ni garantía de generalización. Las métricas finales no borran la alucinación observada y corregida en la primera corrida.

## Código y validaciones

Archivos versionados modificados:

- `backend/api/src/chat/document-rag.ts`: instrucción de contacto, extracto literal con actor/proceso y guard de vigencia del contacto.
- `backend/api/test/document-rag.test.ts`: tres pruebas nuevas de cuerpo factual, conservación del actor y rechazo de vigencia/caducidad no demostradas.

Validaciones finales:

- Tests focalizados de RAG, selector, evidencia y contexto: **74/74 PASS**.
- `npm run typecheck`: **PASS**.
- `npm run typecheck:unified`: **PASS**.
- `npm test` de backend/api: **628/628 PASS**, cero fallos y cero omitidos.
- Regresión HTTP completa repetida después del guard de seguridad: completada.
- `git diff --check`: **PASS**.
- Integridad de fuentes y artefactos de entrada: comprobada en el manifiesto de cierre.

Una prueba nueva detectó inicialmente que el guard rechazaba una formulación válida de incertidumbre con verbo pronominal. Se corrigió el reconocimiento de esa construcción y se repitieron las pruebas; no se trató como fallo preexistente ni se omitió.

## Estado de entrega y límites

Estado Git inicial: limpio. Final: los dos archivos anteriores modificados y este informe nuevo sin rastrear. HEAD permanece `89c4559aaf2b75d0a9bbceb8ae4f8592d804647a`.

No se publicó release, no se ejecutó ingesta, no se cambiaron current ni embeddings documentales, no se modificaron originales, contratos, N8N, MCP, Mobile o Docker. Se calcularon embeddings de consultas para evaluar retrieval. Las únicas escrituras de base corresponden a autenticación y conversaciones de prueba; las conversaciones creadas quedaron eliminadas.

Los 26 claims de piloto requieren revisión y aprobación humanas. Se mantiene separada la evidencia SOURCE de la gobernanza interna. El informe sanitizado no incluye textos internos extensos, datos personales ni programación sensible. Los artefactos completos viven en `data/ccd/local/p0-release-curation-2026-10-25/`, ignorado por Git.

No se realizó commit ni push. La publicación documental queda detenida conforme al alcance solicitado.
