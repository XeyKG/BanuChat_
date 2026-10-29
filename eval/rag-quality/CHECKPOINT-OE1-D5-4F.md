# CHECKPOINT BANUCHAT — OE1-D5.4F

Fecha: 28 de octubre de 2026, America/Bogota.  
Estado: **BENCHMARK_SCOPE_DECISION_READY**.

## Identidad y control de aprobaciones

- Rama `main`; HEAD inicial `4fb5d50bcf564feed9ed75df76a2fb7c0190b35e`; estado Git inicial limpio.
- Se leyeron `AGENTS.md`, los checkpoints D5.3 a D5.4E y la sección de suficiencia del protocolo OE1.
- La CLI principal confirmó 29 aprobadas, 0 pendientes y 0 rechazadas. Se comprobaron cinco bancos y cinco ledgers privados: principal 29, D5.4B 4, D5.4C 4, D5.4D 3 y D5.4E 1. Hay **41 eventos favorables para 41 IDs distintos**, todos con motivo, responsable y fecha válidos. Las cabeceras enlazan los SHA-256 exactos de sus bancos; los archivos están ignorados por Git. El evento D5.4E corresponde al caso histórico 046.
- Los hashes de los cinco bancos siguen siendo, en ese orden: `0f7c22993956c3e6ec1ea11c50071eb41c86e6141a45dc43787467d878fba3bf`, `96658a679e582fad88f0968213647eeb298911be705650c77c8b48fa44b552e7`, `093f895f10e2e6bfe498b491796359a765b617e34a03c1688d713f91d7fa071e`, `dff70bef2c687d6b5665ad00f944f628f43014e329a581ef1e75687f9037319e` y `40a3bc7d623209b6a83d90919022af4295d232ef25ef46287363d8767b0f03ab`. El benchmark histórico CCD 1.2.0 conserva SHA-256 `1e007142c2a573d9f2e4403e28b8eaae7dfe03cd31d1a514ee97423a7617609e`.
- El identificador del revisor coincide en los cinco ledgers; esto no verifica identidad civil ni aporta revisión humana independiente. No se creó ninguna decisión.

## Cierre del remapeo histórico

Se recomienda **cerrar el remapeo de CCD 1.2.0 a 1.4.0 en 41 casos aprobados** y registrar los otros nueve como no evaluables con la evidencia actual. Reabrirlos solo ante una fuente nueva, versionada y autorizada que resuelva el impedimento indicado. Ninguno justifica una pregunta de relleno.

| Histórico | Motivo de no reconstrucción | Evidencia necesaria para reconsiderar |
| --- | --- | --- |
| 009 | Opciones diagnósticas actuales incompletas y respaldo solo de dominio para parte de ellas. | Lista documental autorizada por pilar, periodo y población, incluido el Pilar 1. |
| 014 | Falta distinción documental entre prueba no validada y curso reprobado. | Regla específica por periodo para cada consecuencia. |
| 016 | Traslado temporal inseguro y duplicación con un caso actual aprobado. | Orientación documentada para otro periodo y valor evaluativo distinto. |
| 018 | Procedimiento de reconocimiento sintetizado con inferencia y confirmación de dominio. | Procedimiento autorizado por programa/cohorte con instancias y registros verificables. |
| 019 | No se recuperó respaldo exacto del plazo histórico. | Fuente fechada que vincule el plazo a 2025-2 y a su población. |
| 020 | Contradicción de conjunción/disyunción en transición; ya existe pregunta sobre la divergencia literal. | Aclaración autorizada de requisitos y equivalencias, más comprobación de no duplicación. |
| 021 | Aplicación por programa y modalidad insuficientemente documentada. | Reglas separadas por programa, modalidad y cohorte. |
| 022 | No hay mapeo documental de prueba antigua pendiente a prueba nueva ni autorización individual. | Tabla y convocatoria autorizadas para ese antecedente, con periodo y población. |
| 045 | Mezcla de periodos y duplicación de finalidad y consecuencia ya evaluadas por separado. | Fuente histórica que vincule ambos extremos en 202660 y aporte información evaluativa nueva. |

La matriz privada registra estas decisiones de alcance y el tipo de impedimento de cada caso. La condición “no evaluable” es relativa a la evidencia disponible para CCD 1.4.0; no afirma que el hecho histórico sea falso.

## Cobertura del corpus vigente

Auditoría privada: `data/ccd/local/oe1-evaluation/coverage-audit-ccd-1.4.0-d5-4f-v1.json`, SHA-256 `ca2d6f56ea138238d4c2e433bce52b20c1e3acaba06fe0d20371f8764547fc56`, ignorada por Git. Registra metadatos de las 107 unidades, su uso como gold, procedencia y los nueve dictámenes. Se verificaron los hashes locales de las 107 unidades y de todas las referencias gold.

Las **41 candidatas preparadas y aprobadas** citan **35 de 107 unidades**; 72 no aparecen como gold. Esta proporción describe el banco, no mide representatividad estadística ni exige una pregunta por unidad. Por familia documental, los siete syllabus tienen 20/21 unidades referenciadas; herramientas básicas 0/21, evaluación de experiencia 0/4, horas y créditos 0/7, detalle adicional de cursos 1/10, reglas operativas 3/10 y orientación canónica 10/26. Veinticinco preguntas contienen contenido de syllabus, una concentración que puede sesgar la evaluación hacia ese tipo de consulta.

La procedencia de las 107 unidades no es exclusiva: 100 incluyen `DOCUMENT_SOURCE`, 39 `DOMAIN_CONFIRMATION` y 2 `INFERENCE`; entre las 35 unidades gold, los conteos respectivos son 35, 10 y 1. Una confirmación de dominio o inferencia no equivale a una norma institucional ratificada. La matriz marca posibles solapamientos entre preguntas de contacto y entre varias preguntas de un mismo syllabus; requieren revisión semántica antes de congelar el banco, sin tratar similitud léxica como prueba de duplicación.

## Opciones y recomendación académica

| Opción | Validez, cobertura y riesgo | Esfuerzo y cronograma | Compatibilidad con la evaluación futura |
| --- | --- | --- | --- |
| **A. Cerrar en 41** | Conserva 41 decisiones trazables y evita relleno; mantiene concentración en syllabus y deja familias actuales sin prueba. Requiere acuerdo académico explícito sobre muestra menor. | Menor trabajo de redacción y revisión; facilita una congelación más próxima. | Aún exige consolidar cinco bancos/ledgers, comprobar gold y adecuar evaluador al camino documental vigente. |
| **B. Mantener 41 y diseñar hasta nueve nuevas** | Puede reducir sesgo si se eligen hechos documentados de familias ausentes. Las preguntas nuevas son CCD 1.4.0, no recuperación de los nueve históricos. No hay garantía de obtener nueve legítimas. | Más cotejo de fuentes y revisión individual del autor; viable solo con un bloque acotado y tiempo reservado. | También exige consolidación y revisión de gold; ofrece una muestra más diversa para interpretar métricas, sin corregir por sí sola el evaluador. |

**Recomendación:** cerrar ahora el remapeo histórico en 41 y preferir **B como bloque complementario acotado**, priorizando herramientas básicas, evaluación de experiencia, horas/créditos y modalidades o procedimientos actuales con fuente documental suficiente. Revisar duplicaciones y procedencia antes de proponer cada caso; detener la preparación si no aparecen hechos nuevos defendibles. Si el cronograma no permite revisión genuina, usar A solo tras acordar académicamente la muestra de 41 y declarar su sesgo. El protocolo OE1 contempla acordar una muestra menor cuando faltan casos aprobados; no se encontró una exigencia institucional verificable de llegar a 50.

El benchmark **no está listo para evaluación**: falta consolidar versiones y decisiones sin perder trazabilidad, comprobar completitud del gold frente al corpus vigente, resolver la aceptación de MRR@5 y la limitación conocida de `AnswerRelevancy` (7/12 coincidencias técnicas), y alinear el evaluador con el camino documental real. Tampoco hay ratificación institucional del corpus ni revisión humana independiente. La siguiente tarea propuesta es decidir el alcance A/B y, si se adopta B, preparar únicamente candidatos nuevos por cobertura con revisión del autor; la consolidación y la evaluación vendrían después.

No se generaron preguntas ni se modificaron bancos, ledgers, CLI, evaluador, PostgreSQL, releases, producto, Docker, modelos o embeddings. No se ejecutaron retrieval, generación, RAGAS ni baseline. `git diff --check` se ejecutó sin errores. No hubo commit ni push.
