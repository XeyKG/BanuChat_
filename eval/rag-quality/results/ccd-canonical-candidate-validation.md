# BanuChat — candidata documental canónica: construcción y validación

Fecha: 2026-10-27. Validación técnica y semántica del agente; `independent_human_review: false`. Aceptación humana y promoción pendientes.

## 1. Baseline

HEAD inicial/final: `aaa031da5a65ae655d684c2863fe159e6b1dbdae`. Repositorio inicialmente limpio. Se aplicó P4-A aprobada, sin reinterpretar sus decisiones. Current antes/después: `f01c1c37-2d3f-4bc7-8940-fe724eb71c9a`, ready, `ccd-1.3.0`, manifest `9bde9ff3c1bd9cd29906751de86d7ed31bece30077b9639042b79d221104da4e`, con 87 claims/documentos/chunks/embeddings. Sus filas, derivados, fuentes y contratos históricos permanecen idénticos.

## 2. Decisión de versión

El preflight SQL encontró 1.0, 1.1, 1.2 y 1.3, sin uso previo de 1.4 por otro trabajo. Se usa `ccd-1.4.0`, conforme a NEW_DATASET_SCHEMA_VERSION. Los dos staging 1.4 creados durante esta tarea son iteraciones del mismo trabajo; ninguno fue publicado.

## 3. Contrato v2

Nuevo contrato aditivo `data/ccd/schemas/knowledge-adoption-v2.schema.json`: `ccd-knowledge-adoption-2`, bundle `bch-ccd-knowledge-2`, manifest interno `ccd-knowledge-2`. El contrato 1.3 y migración 013 no se editaron. Claims/artifacts no vacíos, identidades únicas, correspondencia uno-a-uno, SHA y fuentes verificados, al menos una base no pendiente por claim. La cantidad deriva de la adopción; no se fija a 107 en código funcional.

Se mantienen los cuatro kinds existentes: DOCUMENT_SOURCE, DOMAIN_CONFIRMATION, INFERENCE y PENDING_CLARIFICATION. AUTHENTICATED_INSTITUTIONAL vive en metadata de acceso. La preparación v2 vincula registro, revisión y decisiones por SHA y verifica que el texto de las unidades de presentación figure en el derivado citado; se conserva la sustitución acotada de nombre de pilar en la plantilla existente. La proyección runtime es discriminada: 1.3 conserva sus campos previos; 1.4 añade población, condiciones, excepciones y solo campos de dominio necesarios.

## 4. Inventario final

| Elemento | Final |
|---|---:|
| Claims / derivados / chunks / embeddings | 107 / 107 / 107 / 107 |
| IDs anteriores conservados | 81 |
| IDs nuevos | 26 |
| Claims antiguos divididos | 5 |
| Claim sustituido | OP-011 |
| Claims de clasificación HISTORICAL en candidata | 28 |
| Derivados idénticos en bytes al predecesor | 54 |

Las nuevas afirmaciones separan entidad, regla, procedencia o periodo; no se fragmentó cada frase ni se forzó conservar 87. Todos los embeddings de la candidata final se generaron por el pipeline normal, sin copiar vectores 1.3. Dimensión 1024, coseno, norma mínima 0.999999409. Se generaron 214 embeddings documentales durante la tarea: 107 para cada iteración staging; 107 pertenecen a la candidata final.

## 5. Migración de claims

Se aplicaron las 87 decisiones P4-A: KEEP 33; KEEP_BUT_CLARIFY 22; CORRECT 2; SUPERSEDE 1; SPLIT 5; HISTORICAL_ONLY 24. Se conservaron los IDs de 81 claims. OP-001, OP-005, OP-006, OP-009 y OP-010 se separaron con IDs nuevos y `derived_from_claim_ids`. OP-011 no se incorporó como negación vigente; su relación histórica confirmada está en CAN-TRANSITION-ASSESSMENT, con procedencia de dominio. OP-008 corrige el precio y OP-012 incorpora canales institucionales autorizados. La candidata mantiene trazabilidad y SUPERSEDED_DOMAIN_DECISION; CCD 1.3 conserva íntegramente los antecedentes.

## 6. Ruta/pilar/diagnóstico/curso

Una Ruta de Formación Transversal contiene tres pilares. Una opción diagnóstica evalúa competencias del pilar; un curso es una alternativa formativa; una oferta añade periodo, población, NRC y programación. Se usan claims y metadata del almacenamiento existente, sin motor de ontologías, tablas de grafo ni otra base de conocimiento. Los pilares siguen siendo Competencias Digitales Básicas; Analítica y Contenido Digital; Tecnologías Transformativas.

## 7. Diagnósticos

P2: Narrativas Digitales y Comunicación Estratégica; Visualización y Analítica de Datos; Gestión de la Identidad Digital y Marca Personal. P3: Inteligencia Artificial y Creatividad Generativa; Legislación y Ética Digital; Cuidado y Bienestar Digital. Son opciones diagnósticas por confirmación de dominio; se puede escoger una disponible, sin disponibilidad universal. P1 conserva UNRESOLVED y responde sin inventar nombres.

>=70 % valida independientemente el pilar; exactamente 70 sí valida. El soporte documental previo se conserva. La primera oportunidad gratuita mantiene DOMAIN_CONFIRMATION. Las dos horas de los lineamientos se describen como antecedente 202660 del conjunto, sin afirmar duración actual de cada nueva opción.

## 8. Cursos

P1: Interacción Digital. P2: Habilidades en Analítica Digital; Productividad y Marca Personal Digital; Creación de Contenidos Digitales. P3: IA Generativa; Marco Legal Digital; Cuidado y Bienestar Digital. Los literales Marca Personal Digital y Habilidad/Habilidades de Analítica Digital se conservan según fuente como LIKELY_ALIAS. No se confirma identidad por similitud ni correspondencia diagnóstica-curso uno-a-uno, incluso si el nombre coincide.

Un pilar no validado se completa con una opción formativa aplicable; no hay matrícula automática, curso forzoso por asociación semántica, cupo ni profesor garantizado. Un curso aprobado completa el pendiente sin exigir otro diagnóstico; no se repiten pilares completos.

## 9. Retry y tarifas especiales

El diagnóstico actual corresponde a una presentación; no hay segunda presentación pagada equivalente. El selector prioriza esa regla ante repetición, segunda oportunidad o pago para volver a presentar, sin convertir tarifas especiales en alternativa. La ausencia inicial se distingue de un intento presentado y las jornadas siguen programadas.

Se conservan por separado extemporánea: $245.900 en FAQ 2026, con población/plan exactos no establecidos y aplicación actual sin confirmar; extraordinaria: $385.000 para planes antiguos que requieran trámites, sin año fijado. Ambas tienen servicio/esquema/población explícitos y no acreditan repetir el diagnóstico actual.

## 10. Precio 2026

Precio candidato: **$362.550 COP por curso en 2026**, `amount_cop=362550`. La noticia AUTH-CCD-INTENSIVOS-2026-05-15, página 2, documenta el monto; la adopción anual fuera de la oferta concreta se apoya además en confirmación de dominio. El valor que CCD 1.3 respondió, $362.500, queda como valor posteriormente corregido para la candidata. No se modificaron informes o logs históricos ni se hizo reemplazo global. Para 2027 se declara falta de tarifa confirmada; un seguimiento conserva su antecedente de curso y no hereda el precio.

## 11. Intensidad/modalidad/metodología

AUTH-CCD-GENERAL-2026-10-27, página 4: 32 horas por curso; modalidades posibles presencial, virtual o remoto; aprendizaje basado en retos y resolución de problemas reales. Los syllabus conservan su desglose por edición: 32 directas/teórico-prácticas + 64 independientes = 96 totales. No se mezclan esas medidas con duración diagnóstica ni se garantiza simultáneamente toda modalidad.

No se inventan ABP/PBL/frameworks, versión DigComp o certificación europea. La ausencia de créditos académicos queda limitada a programas profesionales; no se extiende a tecnológicos o posgrados. «Evaluación: Aprobado / No aprobado» se conserva como literal general; su exclusividad diagnóstica es interpretación de dominio y no sobrescribe las evaluaciones de syllabus.

## 12. Insignia

Se conserva el literal de tres cursos como vía documental. El modelo confirmado completa la ruta y su reconocimiento al cumplir los tres pilares por mecanismos válidos, incluidos diagnóstico, cursos o transición aplicable. La presentación candidata no exige tres cursos a quien ya validó por otra vía. No se confirma fecha exacta, entrega inmediata ni plataforma de emisión. La revisión vincula el literal general y la confirmación de mecanismos, sin atribuir toda la interpretación al PDF.

## 13. Cosmos

Uso general confirmado por dominio; pasos documentados en la noticia de intensivos: Alumnos → Inscripción → Seleccionar periodo → Agregar/Eliminar Cursos → registrar NRC. Pago: Cupón de pago → Cupones de pagos → Consultar Matrícula → generar cupón o Pago PSE. El derivado ahora incluye los pasos que respaldan las respuestas visibles.

GENERAL_COSMOS_PROCEDURE se separa de 2026_1_INTENSIVE_PARAMETERS. El periodo y NRC de la noticia no son valores por defecto. Una pregunta por el periodo actual reconoce falta de información aplicable. MD-035 conserva acceso a Cosmos en contexto de evaluación, sin convertirlo en prueba independiente de toda la guía general de matrícula. Las guías vigentes mantienen la decisión posterior aprobada; no reaparece «interfaz actual no verificada».

## 14. Intensivos

Oferta fechada 15/05/2026, pregrado profesional, periodo 2026- 1er SEM CUR INTENSIVOS. P1: Interacción Digital NRC 1251/1252, Virtual Canvas, 12 junio–4 julio. P2: Marca Personal Digital 1253 y Habilidad en Analítica Digital 1256, Teleclase (presencial remoto), 18:00–21:59, 12–23 junio. P3: IA Generativa 1254/1255, misma teleclase/franja, 24 junio–3 julio. Todos los datos corresponden a 2026-1, no disponibilidad actual.

La apertura está sujeta a mínimo de inscritos no cuantificado y pago en plazo; puede haber reubicación de NRC, reasignación de profesores y ajustes de programación. No se eliminan del catálogo las opciones ausentes de esta noticia ni se redefine «Teleclase (presencial remoto)».

## 15. Información dinámica

Próximas inscripciones, cupos, grupos, profesores, horarios y apertura futura no se deducen de una oferta pasada. Los NRC quedan fechados al describirlos. No se presentan fechas de junio 2026 como próximas. El selector evita afirmar caducidad exacta no documentada y declara falta de información vigente cuando corresponde.

## 16. Transición

Correspondencia histórica confirmada de evaluaciones: Cultura Digital y Vida en Línea → P1; Word **Y** PowerPoint → P2; Excel → P3. Se mantiene por separado la tabla documental de cursos y su divergencia prosa/tabla. No se convierte esa tabla en fuente literal de equivalencias de pruebas ni se reconocen casos individuales. Plan, cohorte, programa/modalidad, códigos y registro deben revisarse con CCD/programa. Los nombres históricos no pasan a ser cursos actuales.

## 17. Contacto

Correo: ccdigital@unab.edu.co. Punto físico: bloque L, piso 2. Teléfono: 607 643 6111 ext. 1644, con DOMAIN_CONFIRMATION para el número completo. El artefacto de contacto contiene los tres canales visibles y la metadata distingue procedencia por campo. El typo de la noticia y la referencia a Hangouts permanecen como observaciones privadas no promovibles, sin aparecer como contactos vigentes.

## 18. Cambios de código

| Superficie | Cambio |
|---|---|
| API knowledge/parser | Soporte explícito 1.3/1.4; scope proyectado v2; selección de entidades/aspectos, retry, temporalidad y referencias conversacionales. |
| Runtime/allowlist | Reconoce 1.4 para compatibilidad futura; ready/current y autorización siguen obligatorios. |
| Preparación RAG | Adopción v2, SHA de fuentes locales/originales, correspondencias, detalle de unidades en derivados y receta dinámica. |
| Finalización | Acepta receta v2 y cierra run succeeded manteniendo staging. |
| Migración 014 | Validador 1.4 aditivo, dispatcher preservando 1.3 y RPC con keys limitadas al manifest; propietario/ACL anteriores conservados. |
| Tests | Casos v2 permanentes de integridad, múltiples cardinalidades, scope, selección y contexto; no se reescriben resultados anteriores. |
| Ignore | Excepción precisa para versionar el nuevo schema; corpus/evidencia/PDF siguen privados. |

No cambian arquitectura general, REST/OpenAPI, Mobile, MCP, N8N ni demo. No se incorporan tecnologías, endpoints públicos o rutas de autorización alternativas.

Archivos versionables modificados o nuevos (15):

- `backend/api/src/auth/pg-auth-store.ts`
- `backend/api/src/auth/unified-product.ts`
- `backend/api/src/authenticated-runtime.ts`
- `backend/api/src/chat/ccd-knowledge-manifest.ts`
- `backend/api/src/chat/ccd-knowledge.ts`
- `backend/rag/src/ccd/ingest.ts`
- `backend/rag/src/ccd/knowledge.ts`
- `backend/rag/src/db/finalize.ts`
- `backend/rag/src/db/recipe.ts`
- `backend/api/test/ccd-knowledge-v2.test.ts`
- `backend/rag/test/ccd-knowledge-v2.test.ts`
- `data/ccd/schemas/knowledge-adoption-v2.schema.json`
- `infra/db/014_ccd_knowledge_v2.sql`
- `data/ccd/.gitignore`
- `eval/rag-quality/results/ccd-canonical-candidate-validation.md`

## 19. Compatibilidad CCD 1.3

Pasaron los tests relacionados previos y el smoke real autenticado tras los cambios: login200, `/auth/me`200 sobre el current 1.3, consulta de tres pilares con cita, historial idéntico, borrado propio204, logout204 y token rechazado401 después. GET de artefacto staging devolvió404. Las pruebas de candidata no se presentan como HTTP positivo de 1.4.

API typecheck y typecheck:unified pasaron; API 688/688 tests, RAG 237/237 en serial. Siete pruebas SQL de manifest/migración y ocho de seguridad RPC pasaron; 1.3 continúa aceptado, staging es rechazado, y keys vacías/nulas/duplicadas/ajenas y top inválido se rechazan.

La primera suite RAG paralela registró SOURCE_REJECTED en lecturas estrictas; la suite completa serial pasó sin relajar SafeReader. La preparación usó una copia estable con bytes y SHA iguales para el bundle; no se copiaron originales institucionales. La causa exacta de las lecturas intermitentes no está probada. No hay script lint en los paquetes afectados.

## 20. Candidata staging

**Candidata final: `768cded3-0093-4c47-942d-0bead66612c2`**, schema ccd-1.4.0, status staging. Run `a7b6310a-1538-4222-a70d-386a2a27bd57`: succeeded. 107 documentos/chunks/embeddings; finalización normal, assert_release_complete y comprobación de puntero. Sin publicación.

La primera iteración `2be94dbf-f3cf-49ad-85b9-55bb6cea01c8` se conserva staging, con su run y derivados exactos archivados por SHA. Se reemplazó como candidata recomendada porque los pasos Cosmos y canales de contacto estaban completos en unidades del manifest pero incompletos en el cuerpo descargable; también se precisó población de servicios especiales. La candidata final incorpora ese detalle y comprueba cobertura de sus 107 derivados. No se reescribió el primer resultado ni se alteró su estado histórico.

La evaluación usa el responder normal y retrieval exacto candidato-scoped por release ID, mediante adaptador interno privado READ ONLY. Solo ese evaluador consulta staging; no se creó endpoint, sesión o binding para acceder a ella. La evidencia diferencia código de ingesta de cada iteración y hashes del código ejecutado en la evaluación final.

## 21. Banco 249

Nueva ejecución completa sobre la candidata final, sin tocar el banco ni el 249/249 histórico de CCD 1.3. Resultado técnico-semántico del agente: **249/249 correctos**, con verdict individual: 201 EXPECTED_SAME, 24 EXPECTED_SEMANTIC_CHANGE y 24 HISTORICAL_CASE_REQUIRES_SCOPE. Se mantienen originales y nuevas rúbricas separadas. La taxonomía de oferta desconocida acepta la negativa específica de programación, conservando la intención del caso MT-02-T3.

La revisión verifica unidades completas contra el manifest, bytes/identidad de citas, condiciones, periodo/población y adecuación a la pregunta. Las síntesis académicas libres llevan 63 revisiones nuevas ligadas al hash de respuesta, historial y fuentes; no se importó un PASS anterior ni se decidió por HTTP200 o mera cita.

## 22. Nuevos controles

**27/27 correctos**, en archivo separado del denominador 249. Cubren entidades, opciones P2/P3 y abstención P1, no mapeo, >=70, no repetición/pago, ausencia inicial, tarifas, precio2026/2027, horas/modalidades/metodología, mecanismos de insignia, Cosmos/periodos/NRC, apertura, inscripción dinámica, contacto, evaluación, DigComp y población. Otros **11/11 críticos** incluyen los diez escenarios solicitados y la consulta autónoma por fecha de insignia. No quedan casos pendientes sin verdict.

## 23. Source-bound review

Se registran pregunta, respuesta, supporting claims, bases con alias/SHA/localizador, periodo, población, condiciones y verdict. Los alias nuevos permanecen AUTH-CCD-GENERAL-2026-10-27 y AUTH-CCD-INTENSIVOS-2026-05-15. Los literales marcados USER_TRANSCRIPTION_OF_AUTHENTICATED_SOURCE conservan esa marca en fuentes saneadas; no se finge extracción automática. La clasificación diagnóstica de nombres y gratuidad/teléfono mantienen confirmación de dominio.

Se comprobó además que el cuerpo de cada derivado final contiene las proposiciones de presentación no parametrizadas. La plantilla de nombre de pilar conserva sustitución acotada y regla general en el documento. Este control motivó corregir el primer bundle; la igualdad de citas/manifest por sí sola no se tomó como prueba suficiente de cobertura documental.

## 24. Privacidad

Los PDF originales no se copiaron al bundle ni a Git. Las nuevas fuentes operativas son notas JSON saneadas privadas, con SHA original, alias, página/método y flags de transcripción. No se copiaron encabezados personales, identificadores, URLs autenticadas, cookies ni tokens. El escaneo de derivados, evidencia y archivos versionables se registra aparte; las rutas personales de stacks de herramientas se sanean mediante alias, conservando errores y resultados.

Incidente de evidencia registrado: el harness reutilizó la etiqueta de una primera corrida crítica y sobrescribió aquel JSONL. La respuesta inicial fallida de seguimiento de precio se conserva como observación del tool, identificada como tal; no se reconstruyó un log completo fingido. La primera corrida principal de 276 permanece íntegra y las corridas críticas finales tienen archivos distintos. Un smoke inmediato al reinicio falló antes de registrar respuesta de login; se conserva su evidencia, sin atribuir una causa no probada. Tras comprobar readiness, el smoke normal pasó sin modificar autenticación.

## 25. No publicación

**0 publicaciones, 0 cambios de current, 0 bindings de las dos staging, 0 cambios de grants de perfiles.** Current/manifest/filas 1.3, cuentas, permisos de lectura y conversaciones/mensajes/citas previos se preservan. Se inspeccionaron entrypoints, SQL, logs capturados y estado final; no hubo llamada de publicación ni cambio temporal de puntero. La función compartida de finalización conserva su rama histórica de activación, pero esta tarea invoca finalizeCandidate con activate=false.

Cambios SQL permitidos: migración aditiva, dos iteraciones staging con sus runs/versions/chunks/vectores/contexto técnico. Los tres smokes normales añadieron sesiones/refresh revocados y auditoría/rate-limits; no se borran esos registros para aparentar cero escrituras. Las conversaciones de ensayo se eliminaron y sus tablas recuperan exactamente los fingerprints iniciales. El servicio habitual queda activo con current 1.3. Sin rollback, commit o push.

## 26. Pendientes

No hay caso de evaluación pendiente. Persisten los límites de dominio aprobados: nombres diagnósticos P1, identidad definitiva de alias, mapeos diagnósticos-curso, duración actual de cada nueva opción, emisión exacta de insignia, aplicación actual de servicios especiales y documentación independiente de todos los pasos generales Cosmos. La candidata responde con límites en esos puntos.

Siguiente etapa recomendada: revisión humana del paquete final y autorización explícita de preparación/promoción. Antes de publicar deben prepararse y verificarse las vinculaciones de perfiles para esta release en una tarea separada, conservando current 1.3 y rollback previsto. Después corresponderán promoción normal y validación autenticada sobre el nuevo current. OE5/SUS sigue pausado; no se reclutó ni evaluó a personas, ni se declara producción o aval institucional.

## ESTADO DE ENTREGA BANUCHAT

**CANDIDATA DOCUMENTAL CANÓNICA CONSTRUIDA Y VALIDADA EN STAGING; CCD 1.3 PRESERVADO COMO CURRENT; PROMOCIÓN PENDIENTE.**

HEAD inicial/final `aaa031da5a65ae655d684c2863fe159e6b1dbdae`. Dataset schema ccd-1.4.0; knowledge ccd-knowledge-2; adoption ccd-knowledge-adoption-2. 107 claims, 81 IDs conservados, 26 nuevos; cinco claims divididos y OP-011 sustituido como afirmación vigente. 107 artifacts/chunks/embeddings en la candidata final `768cded3-0093-4c47-942d-0bead66612c2`, staging, run succeeded. Primera iteración conservada como antecedente.

Current 1.3 idéntico antes/después, compatibilidad HTTP comprobada. API 688/688; RAG 237/237 serial; banco 249/249; controles 27/27; críticos 11/11; cero pendientes de evaluación. No publicación, bindings ni grants nuevos. Evidencia privada en `data/ccd/local/p4b-canonical-candidate/`; bundle reproducible en `data/ccd/local/product-knowledge-v2/`. Archivos versionables: implementación API/RAG delimitada, dos tests nuevos, schema v2, migración 014, excepción precisa de ignore y este informe. Aceptación humana y promoción pendientes.
