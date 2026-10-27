# BanuChat — Auditoría documental canónica CCD posterior a CCD 1.3

Fecha: 2026-10-27. Auditoría técnica y de dominio del agente; no equivale a aceptación humana independiente ni aval institucional CCD.

## 1. Motivo

Las nuevas fuentes privadas y decisiones explícitas del responsable introducen una corrección de precio y precisiones sobre entidades, diagnóstico, transición, matrícula y reconocimiento antes del estudio humano OE5. Esta entrega establece el delta y el plan de candidata. OE5 permanece pendiente de resolver ese delta; no se ejecutaron participantes ni SUS.

La regresión técnica histórica 249/249 conserva su valor para el contenido y criterios entonces adoptados. La nueva evidencia abre revisión semántica posterior; no convierte retrospectivamente aquel resultado en una prueba de estas decisiones nuevas.

## 2. Estado congelado de CCD 1.3

HEAD inicial y final: `7397def5d3385416726166ec30f73bfc5936d2f5`.
Current: `f01c1c37-2d3f-4bc7-8940-fe724eb71c9a`, `ready`, `ccd-1.3.0`.
87 claims adoptados, 87 derivados, 87 versiones documentales, 87 chunks y 87 embeddings documentales.
SHA del manifest: `9bde9ff3c1bd9cd29906751de86d7ed31bece30077b9639042b79d221104da4e`.

El snapshot SQL inicial en transacción READ ONLY coincide exactamente con los claims de la adopción local. Se verificaron los SHA de los 87 derivados, 22 fuentes originales referidas por la adopción y los tres vínculos de registro/revisión/decisión. La adopción vincula `revised-claims.jsonl`, `run-manifest.json` y `domain-decision.json` del incremento autenticado; no se presupone un registro con otro nombre. Los informes de integración/promoción se leen como una secuencia: su primer intento detenido y posterior promoción permanecen como antecedentes distintos. El snapshot v1 de 12 documentos es histórico y no representa el current de 87.

## 3. Fuentes nuevas y privacidad

| Alias | Páginas | SHA-256 | Verificación |
|---|---:|---|---|
| AUTH-CCD-GENERAL-2026-10-27 |5| `697a41572b12b6f91696a988106294039504ac07f3031b7e84a05911f342d052` | Recortes pertinentes del cuerpo; fecha del alias es de captura, no publicación demostrada. |
| AUTH-CCD-INTENSIVOS-2026-05-15 |3| `16109a1143318703ba0a5dd6423f61de75f6ad7e35981864b810380f460946c5` | Publicación visible 15/05/2026 13:43:45; texto, precio y tabla inspeccionados visualmente. |

Son PDF image-only: extracción textual 0 caracteres en sus ocho páginas. No se ejecutó OCR masivo ni navegación al portal. Se conservaron únicamente recortes relevantes y notas saneadas en almacenamiento ignorado; se excluyen encabezados personales y pies de sitio ajenos al dominio. No se copia ningún PDF al informe o a Git.

`DOCUMENT_SOURCE` significa un literal/cuerpo documental observado; `DOMAIN_CONFIRMATION`, una decisión explícita del responsable; `INFERENCE`, una síntesis identificada; `PENDING_CLARIFICATION`, un límite abierto. El acceso autenticado no crea por sí solo mayor autoridad, permiso de integración ni vigencia universal. Para dos nombres completos P2 parcialmente cortados en los recortes, y el literal «Información próximamente disponible», se conserva `USER_TRANSCRIPTION_OF_AUTHENTICATED_SOURCE`; no se atribuye una lectura visual completa que no ocurrió. Su clasificación diagnóstica procede de confirmación explícita. Estos hechos requerirán transcripción revisada antes de admisión documental futura.

## 4. Modelo conceptual canónico

Una **Ruta de Formación Transversal en Competencias Digitales** contiene tres pilares. Cada pilar admite opciones diagnósticas disponibles y opciones formativas; diagnóstico y curso son mecanismos diferentes. Una presentación diagnóstica puede validar un pilar con resultado suficiente; si no, se completa aprobando un curso correspondiente. Una oferta concreta añade periodo, población, NRC, modalidad y calendario a una opción formativa.

El modelo privado contiene ROUTE, PILLAR, DIAGNOSTIC_OPTION, DIAGNOSTIC_ATTEMPT, PILLAR_VALIDATION, COURSE_OPTION, COURSE_OFFERING, HISTORICAL_ASSESSMENT, TRANSITION_EQUIVALENCE, BADGE_OR_RECOGNITION, FEE, ENROLLMENT_PROCEDURE y CONTACT_CHANNEL. Es un modelo de auditoría, no un schema implementado. No hay correspondencia uno-a-uno diagnóstico ↔ curso establecida.

| Tema | Estado CCD 1.3 | Nueva evidencia | Decisión de auditoría | Acción futura |
|---|---|---|---|---|
| Estructura ruta | Conocimiento disperso OP-001/KC-022 | Página general y confirmación | Una Ruta de Formación Transversal | Separar niveles |
| Tres pilares | Tres nombres adoptados | Infografía general p2 | Conservar nombres e independencia | Añadir fuente sin perder 202660 |
| Opciones diagnósticas | Tres instrumentos, sin seis opciones | Clasificación explícita del responsable | Entidades DIAGNOSTIC_OPTION por pilar | Añadir opciones disponibles; P1 pendiente |
| Cursos | Siete opciones distribuidas entre pilares | Infografía de cursos | Conservar catálogo, distinguir oferta | Actualizar literal de variante de marca |
| Alias | Marca Personal/Habilidades en | Productividad y Marca; Habilidad en | LIKELY_ALIAS; identidad no confirmada | No fusión ni mapeo 1:1 silencioso |
| >=70 % | OP-002 inclusivo | Lineamientos ya adoptados + confirmación | KEEP | Preservar exactamente 70 y por pilar |
| Primera oportunidad | OP-016 DOMAIN_CONFIRMATION | Confirmación reiterada | Gratuita; misma procedencia | No simular respaldo en PDF nuevo |
| Repetibilidad | OP-006 deja consulta abierta | Por única vez en fuente previa; no pago para repetir confirmado | SUPERSEDED_DOMAIN_DECISION | Cerrar posibilidad de segunda pagada actual |
| Curso tras no validación | OP-003 completa pendiente | Confirmación y catálogo | Conservar; una opción correspondiente | No inscripción automática ni repetir completos |
| Precio | OP-008:362500 COP/curso | Noticia:362550; adopción 2026 confirmada | CORRECT candidato anual | Texto + amount_cop, no precio diagnóstico |
| Duración 32 h | Syllabus 32 + 64=96 | Página general 32 por curso | Distinguir medida y edición | No reemplazar 96 ni duración diagnóstica |
| Modalidad | Syllabus/plataformas por edición | Presencial, virtual o remoto | Posibilidades generales | Oferta concreta determina modalidad |
| Metodología | Contenidos por syllabus | Retos y problemas reales | Nueva afirmación documental delimitada | No inventar ABP/PBL |
| Badge | OP-004:completar pilares | Literal tres cursos + confirmación mecanismos válidos | Conservar resultado, aclarar vías | Sin tres cursos forzosos ni fecha exacta |
| Inscripción | Matrícula ordinaria general | Página dinámica/noticia fechada | Separar general y periodo | Nunca próximas fechas desde noticia pasada |
| Cosmos | MD-035 acceso a evaluación | Pasos de intensivos + utilidad general confirmada | GENERAL/TERM separados | Periodo y NRC aplicables como parámetros |
| Intensivos | No oferta permanente | Noticia 15 de mayo de 2026; seis NRC | TERM_SCOPED 2026-1 | No disponibilidad actual ni borrar otros cursos |
| Transición | Tabla cursos, sin mapeo universal de pruebas | Correspondencia histórica confirmada | Cursos y evaluaciones con bases separadas | Word Y PowerPoint; revisión individual |
| Contacto | Solo correo; veto general a teléfonos | Correo/lugar/teléfono institucional confirmado | CORRECT curación anterior | Sin typo, Hangouts vigente ni datos personales |

## 5. Ruta vs pilar vs diagnóstico vs curso

P1 es **Competencias Digitales Básicas**; P2, **Analítica y Contenido Digital**; P3, **Tecnologías Transformativas**. Son partes de una ruta y no tres rutas. Una opción diagnóstica es una alternativa de evaluación dentro del pilar; no sustituye el nombre de un curso. Un curso es formación para completar un pilar pendiente, y una oferta es su programación concreta.

La página general dice «sin asignación de créditos en los programas profesionales» y alineación con DigComp. Se conserva esa población: no hay afirmación equivalente para tecnológicos, posgrados u otros programas. No se atribuye versión 2.1/2.2, certificación europea, áreas o niveles no documentados.

## 6. Catálogo y alias

| Pilar | Cursos en la infografía general |
|---|---|
|P1| Interacción Digital |
|P2| Habilidades en Analítica Digital; Productividad y Marca Personal Digital; Creación de Contenidos Digitales |
|P3| IA Generativa; Marco Legal Digital; Cuidado y Bienestar Digital |

Los syllabus adoptados usan Marca Personal Digital; la noticia usa ese nombre y Habilidad en Analítica Digital; discovery preliminar usaba Habilidades de Analítica Digital. Se registran como **LIKELY_ALIAS**, conservando literal, fuente, periodo, población y contexto. No se confirmó SAME_ENTITY_CONFIRMED por parecido textual. Los temarios actuales se mantienen por su edición mientras se confirma identidad del alias.

«Cuidado y Bienestar Digital» puede ser literalmente igual en diagnóstico y curso y seguir siendo dos entidades distintas. Gestión de la Identidad Digital y Marca Personal no se transforma automáticamente en Productividad y Marca Personal Digital. La ausencia de Creación de Contenidos, Marco Legal o Bienestar en una noticia de oferta no elimina esas opciones del catálogo.

## 7. Diagnósticos

| Pilar | Opciones diagnósticas confirmadas por dominio |
|---|---|
|P1| Nombres actuales no establecidos; no inventar. |
|P2| Narrativas Digitales y Comunicación Estratégica; Visualización y Analítica de Datos; Gestión de la Identidad Digital y Marca Personal. |
|P3| Inteligencia Artificial y Creatividad Generativa; Legislación y Ética Digital; Cuidado y Bienestar Digital. |

El estudiante puede escoger una opción disponible del pilar correspondiente. No se asegura que toda población tenga todas las opciones en todo periodo. OP-001 necesita separar la descripción documental de tres instrumentos y duración aproximada de dos horas de 202660 de las opciones actuales; no convertir dos horas en duración de cada opción o pilar sin respaldo.

La primera oportunidad gratuita conserva **DOMAIN_CONFIRMATION**, como en OP-016. Ninguno de los dos nuevos PDF se usa falsamente como prueba de esa gratuidad.

## 8. Umbral 70 %

OP-002 se conserva: **>=70 % valida el pilar; exactamente 70 % sí alcanza**. Hay soporte documental previamente adoptado en lineamientos, párrafos 12–13, y confirmación de dominio. Cada pilar se evalúa independientemente. No se solicita otra fuente ni se extrapola el umbral a cualquier prueba o servicio CCD.

## 9. Repetibilidad

La regla para el diagnóstico actual es una sola presentación, sin pagar para repetir y sin segunda oportunidad pagada equivalente. El párrafo 6 de lineamientos ya dice «por única vez al ingreso»; la prohibición expresa de pago para repetir está confirmada por el responsable. La primera oportunidad gratuita no debe presentarse solo como «no garantizamos repeticiones gratuitas», dejando implícita una alternativa pagada.

Se registra **SUPERSEDED_DOMAIN_DECISION** para la curación anterior que mantenía abierta la consulta por otro intento. No se alteran sus archivos históricos. Una ausencia antes de presentar no equivale a un intento consumido: las jornadas siguen programadas y se consulta una disponible; no se promete nueva convocatoria.

| Claim/aspect | Fuente y población | Periodo/esquema | Diagnóstico actual | Acción futura |
|---|---|---|---|---|
|OP-006 retry_limits| Lineamientos párrafo 6 + decisiones anteriores | Diagnóstico de ingreso | Texto abierto necesita sustitución | SUPERSEDE |
|OP-006 schedule| FAQ bloque 5 + confirmación de ausencia | Calendario dinámico | Sí, primera presentación programada | KEEP_CURRENT |
|OP-006 eligibility| Lineamientos párrafo 84; continuos ingresados antes 2025-1 sin presentar | Convocatoria 202660 | No derecho permanente | KEEP_HISTORICAL_ONLY |
|OP-009 additional_fee/fee_limits| Mezcla de servicios/poblaciones |2026/desconocido| No opción de repetir | REMOVE_FROM_CURRENT_PRESENTATION / RESCOPE |
|OP-009 extemporaneous_fee| FAQ bloques 13/15; servicio fuera de fechas ordinarias |2026; aplicación actual no establecida| No demuestra segundo intento | RESCOPE |
|OP-009 extraordinary_fee| Tarifas fila 4; planes antiguos para trámites | Año no fijado | No | KEEP_HISTORICAL_ONLY |
|OP-016 first_attempt/transition_first| Confirmación del responsable | Primera presentación aplicable | Sí, gratuidad condicional al concepto | KEEP_CURRENT / RESCOPE |

$245.900 extemporánea y $385.000 extraordinaria son antecedentes de conceptos distintos. Su existencia documental no prueba repetición diagnóstica actual ni elegibilidad individual. El banco futuro debe comprobar que el selector financiero no los ofrezca ante «pagar para repetir».

## 10. Formación posterior a no validación

Se completa cada pilar pendiente aprobando una opción formativa correspondiente. Si hay alternativas habilitadas del pilar, no se fuerza un curso por una supuesta asociación uno-a-uno con la opción diagnóstica elegida. Un pilar ya validado no requiere curso ni repetición; aprobar el curso correspondiente completa el pendiente sin volver a presentar el diagnóstico. No se realiza matrícula automática ni se garantizan cupos.

## 11. Transición histórica

| Antecedente histórico confirmado | Pilar relacionado |
|---|---|
| Cultura Digital y Vida en Línea | P1 |
| Word **Y** PowerPoint | P2 |
| Excel | P3 |

La confirmación nueva permite registrar relaciones de evaluaciones históricas por **DOMAIN_CONFIRMATION**. OP-010 conserva separadamente la tabla literal documental de cursos y su divergencia con la prosa sobre Cultura Digital. Esa tabla no se reetiqueta como fuente literal de equivalencias de pruebas. OP-011 debe sustituir la prohibición absoluta de toda correspondencia histórica de evaluaciones, conservando el límite de no inferir reconocimiento individual.

Se requieren plan, cohorte, programa/modalidad, códigos y registro institucional para un caso concreto. No se cambia «y» por «o», no se resuelve Word solo como P2 y no se presentan Word/Excel/PowerPoint como cursos de la oferta actual.

## 12. Precio

La corrección futura es **$362.550 COP por curso para 2026**. La noticia, página 2, da el monto en números y palabras en una oferta intensiva concreta. Su adopción como referencia de cursos 2026 está expresamente confirmada por dominio. No es un precio del diagnóstico y no confirma 2027.

OP-008 conserva hoy 362500 en su statement, unidad visible y `amount_cop`. Deben revisarse conjuntamente en una candidata; aquí no se modifican. Se registra **SUPERSEDED_DOMAIN_DECISION** respecto de la adopción previa del precio 362500, preservando FAQ, Tarifas y confirmación anterior como antecedentes.

El inventario encontró **227 archivos de texto y 1633 ocurrencias** del monto anterior, sobre 4226 archivos legibles, incluidos artefactos y evidencia histórica ignorados. Exporta rutas relativas, líneas, lexemas y SHA, sin copiar líneas potencialmente privadas. Excluye dependencias, entornos, credenciales de infra/local, binarios/archivos comprimidos y esta propia auditoría. La tabla original DOCX se incorpora aparte por localizador; el manifest SQL vigente también conserva el monto anterior.

En el bundle vigente los archivos afectados son `data/ccd/local/product-knowledge-v1/adoption.json` y `documents/artifacts/ccd-knowledge-op-008-1.md` dentro de ese bundle. La única referencia versionada previa con el monto literal encontrada es `eval/mobile/results/ccd-current-mobile-validation.md`: debe permanecer como evidencia de la validación entonces realizada. Los logs, snapshots, rúbricas y resultados privados anteriores no se reescriben. No hay un literal monetario 362500 en los tests funcionales actuales; el banco privado sí lo exige en expectativas de precio.

## 13. Intensidad/modalidad/metodología

La página general, página 4, anuncia **32 horas por curso**, modalidades **presencial, virtual o remoto**, y aprendizaje basado en retos y resolución de problemas reales. Son características generales delimitadas por su fuente; no se inventan siglas ABP/PBL ni oferta simultánea en todas las modalidades.

Los siete HOURS adoptados registran 32 horas teóricas —teórico-prácticas en Interacción—,64 independientes y96 totales en sus syllabus. La nueva tarjeta no desglosa carga independiente: no demuestra contradicción aritmética ni autoriza reemplazar 96 por 32. Los créditos operativos del sistema no son créditos académicos añadidos al plan profesional. La duración del diagnóstico es otra medida.

**EVALUATION_APPROVED_NOT_APPROVED_SCOPE:** el literal documental es «Evaluación: Aprobado / No aprobado», ubicado entre características generales. La interpretación del responsable lo refiere al diagnóstico. La exclusividad diagnóstica no queda demostrada por el PDF; se etiqueta DOMAIN_CONFIRMATION, con confianza alta en el literal y alcance documental exclusivo no establecido. Se mantienen las evaluaciones particulares de MD-022–027 por edición y el umbral diagnóstico independiente. No se cambia una rúbrica de curso basándose solo en esa tarjeta.

## 14. Insignia

Literal general: «Al completar los tres cursos recibes la Insignia de Competencias Digitales UNAB». Se conserva como descripción del itinerario de cursos. La confirmación de dominio reconoce el cierre de los tres pilares mediante mecanismos válidos, incluidos diagnóstico, cursos y transición aplicable. No se convierte una vía suficiente en tres cursos obligatorios para quien ya validó pilares.

Redacción candidata: al completar los tres pilares mediante mecanismos válidos corresponde el reconocimiento mediante insignia. Se conserva el límite de no precisar fecha o momento exacto de emisión; las nuevas fuentes no lo resuelven. OP-004 necesita aclaración de procedencia y vías, sin retirar el reconocimiento ni prometer entrega inmediata.

## 15. Cosmos

El responsable confirma su utilidad general. La secuencia documental nueva pertenece a intensivos: **Alumnos → Inscripción → Seleccionar periodo → Agregar/Eliminar Cursos → registrar NRC**. Para pago: **Cupón de pago → Cupones de pagos → Consultar Matrícula → generar cupón o Pago PSE**.

Se separan GENERAL_COSMOS_PROCEDURE y2026_1_INTENSIVE_PARAMETERS. La generalización del uso está confirmada por dominio; la nueva evidencia de pasos es del periodo concreto. MD-035 ya documenta acceso por portal/Cosmos/«Soy Estudiante» para evaluación, pero no acredita independientemente toda la secuencia general de matrícula. Una candidata debe declarar esa procedencia mixta o aportar/revisar una guía general apropiada; no fingir que ya se verificó.

No fijar siempre el periodo intensivo ni los NRC de la noticia. Las guías vigentes MD-032–035 y OP-015 mantienen la decisión anterior de vigencia confirmada: no reaparece «interfaz actual no verificada». Se conservan recuperación de contraseña solo si se olvidó y la rama de menú pendiente de aclaración. BanuChat orienta; no entra en Cosmos ni matricula.

## 16. Oferta intensiva 2026-1

La noticia del 15/05/2026 se dirige a **pregrado profesional**, periodo literal **2026- 1er SEM CUR INTENSIVOS**, dos subciclos de ocho días hábiles. Inscripción/pago 22 mayo–5junio; primer subciclo 12–23junio y segundo 24junio–3julio. Se conserva la excepción de Interacción Digital 12junio–4julio. El paso de historia académica del primer subciclo está anunciado para 7julio. Todos son datos de 2026, no calendario permanente.

| Pilar | NRC | Curso literal | Modalidad literal | Franja / fechas 2026 |
|---|---|---|---|---|
|P1|1251,1252| INTERACCIÓN DIGITAL | Virtual Canvas | VIRTUAL;12 jun–4 jul |
|P2|1253| MARCA PERSONAL DIGITAL | Teleclase (presencial remoto) |18:00/21:59;12–23 jun |
|P2|1256| HABILIDAD EN ANALÍTICA DIGITAL | Teleclase (presencial remoto) |18:00/21:59;12–23 jun |
|P3|1254,1255| IA GENERATIVA | Teleclase (presencial remoto) |18:00/21:59;24 jun–3 jul |

Se conserva «Teleclase (presencial remoto)» sin redefinición técnica inventada. Apertura sujeta a mínimo de inscritos —sin número indicado— y pago dentro de fechas. La noticia admite reubicación de NRC, reasignación docente y ajustes con conservación de intensidad y comunicación. No son cupos/profesores garantizados ni oferta actual; no se deduce que las opciones ausentes de esta tabla hayan desaparecido del catálogo.

## 17. Información dinámica

Inscripciones próximas, calendario, apertura, cupos, NRC y asignación de profesores se separan de reglas generales. La página general invita a consultar próximas fechas; la frase de disponibilidad próxima aportada por el usuario se conserva como transcripción no verificada completamente en los recortes. Ninguna de ellas convierte mayo/junio 2026 en una próxima fecha vigente.

La clasificación temporal privada usa TIMELESS_WITHIN_SCOPE para contenidos por edición, CURRENT_GENERAL para reglas aceptadas dentro de su alcance, YEAR_SCOPED para precio 2026, TERM_SCOPED para intensivos, HISTORICAL para transición/temarios anteriores, DYNAMIC para convocatorias y UNKNOWN_TEMPORAL_SCOPE para datos sin año fijado. Un claim mixto se separa por aspecto; su etiqueta global no debe dar vigencia a todos los componentes.

## 18. Contacto

Canal correcto: **ccdigital@unab.edu.co**. Punto físico: **bloque L, piso 2**, corroborado por noticia y dominio. Teléfono institucional confirmado: **6076436111 ext.1644**; el número completo permanece DOMAIN_CONFIRMATION, sin atribuirlo al PDF nuevo. La extensión 1644 aparece también en una referencia previa, pero eso no documenta por sí solo el número completo ni autoriza otras extensiones.

La noticia incluye un correo con error tipográfico: su literal está registrado únicamente en las notas privadas como no promovible. No se propone como contacto alternativo. La mención de Hangouts tampoco acredita vigencia actual. No se confunde el teléfono institucional autorizado con teléfonos personales; no se inventa horario de atención.

## 19. Conflictos reales

Se registran 13 conflictos/diferencias: siete resueltos por decisión de dominio, separación de entidades o medidas; cinco abiertos; uno con soporte parcial. Son deltas de auditoría, no fallos runtime ejecutados.

Abiertos: identidad de alias de cursos/mapeo diagnóstico-curso; alcance documental exclusivo de Aprobado/No aprobado; momento de emisión de insignia; aplicación actual de servicios especiales y año de extraordinaria; nombres diagnósticos P1/duración actual de nuevas opciones. Soporte parcial: guía independiente de todos los pasos generales Cosmos. No se rellenan esos vacíos con inferencias.

Las resoluciones principales son precio 2026, no repetición pagada, separación diagnóstico/curso, vías válidas para reconocimiento, contacto institucional y correspondencias históricas confirmadas. No se aplica una regla de «más nuevo siempre gana»: se compara concepto, población, periodo, esquema, fuente, literal, condición y excepción. No se modifican silenciosamente antecedentes históricos.

## 20. Claims afectados

Se auditó 87/87, con statement, topics/aspects, periodo, población, curso, condiciones/excepciones, bases, SHA/localizadores, unidades visibles, uso actual, relevancia nueva, entidad, temporalidad, decisión, propuesta de redacción/procedencia e impactos. La matriz completa está en evidencia privada. Cada ID tiene una decisión primaria; los claims mixtos llevan acciones adicionales por aspecto en auditorías específicas.

- **KEEP: 33.** `KC-001`, `KC-002`, `KC-003`, `KC-004`, `KC-005`, `KC-006`, `KC-007`, `KC-008`, `KC-009`, `KC-010`, `KC-011`, `KC-012`, `KC-013`, `KC-014`, `KC-015`, `KC-019`, `KC-020`, `KC-021`, `KC-023`, `KC-024`, `KC-025`, `KC-026`, `MD-028`, `MD-029`, `MD-030`, `MD-031`, `MD-032`, `MD-033`, `MD-034`, `MD-035`, `OP-002`, `OP-014`, `OP-015`
- **KEEP_BUT_CLARIFY: 22.** `KC-016`, `KC-017`, `KC-018`, `KC-022`, `MD-022`, `MD-023`, `MD-024`, `MD-025`, `MD-026`, `MD-027`, `OP-003`, `OP-004`, `OP-007`, `OP-013`, `HOURS-analytics`, `HOURS-content`, `HOURS-wellbeing`, `HOURS-ai`, `HOURS-interaction`, `HOURS-brand`, `HOURS-legal`, `OP-016`
- **RESCOPE: 0.** Ningún claim con esta decisión primaria.
- **CORRECT: 2.** `OP-008`, `OP-012`
- **SUPERSEDE: 1.** `OP-011`
- **SPLIT: 5.** `OP-001`, `OP-005`, `OP-006`, `OP-009`, `OP-010`
- **MERGE_CANDIDATE: 0.** Ningún claim con esta decisión primaria.
- **HISTORICAL_ONLY: 24.** `MD-001`, `MD-002`, `MD-003`, `MD-004`, `MD-005`, `MD-006`, `MD-007`, `MD-008`, `MD-009`, `MD-010`, `MD-011`, `MD-012`, `MD-013`, `MD-014`, `MD-015`, `MD-016`, `MD-017`, `MD-018`, `MD-019`, `MD-020`, `MD-021`, `MD-036`, `MD-037`, `MD-038`
- **PENDING_CLARIFICATION: 0.** Ningún claim con esta decisión primaria.

Los 24 HISTORICAL_ONLY ya contienen fechas/antecedentes históricos; conservarlos no implica borrar ni corregir 24 textos. Hay 30 claims con propuesta de aclaración/corrección/separación/sustitución,33 conservados y24 históricos. Los pendientes de hechos nuevos no se asignan artificialmente a un claim existente para inflar PENDING. OP-008 corrige precio y OP-012 corrige la exclusión general de teléfonos; OP-011 sustituye solo la negación absoluta de correspondencias históricas confirmadas.

## 21. Banco 249 afectado

Inspección estática completa; **cero casos ejecutados** y cero expectativas/resultados editados. Se preserva 249/249 como resultado histórico. La revisión distingue expected aspects actuales de anotaciones heredadas de fases preliminares: existen textos antiguos sobre reglas bloqueadas, AND/OR sin resolver y precio de primera prueba desconocido que no deben importarse como autoridad actual a la candidata. No se borra su contexto ni se inventa un fallo retrospectivo.

Clasificación: **201 EXPECTED_SAME; 24 EXPECTED_SEMANTIC_CHANGE; 24 HISTORICAL_CASE_REQUIRES_SCOPE**. Son 48 casos existentes para revisión futura, más **27 controles propuestos REQUIRES_NEW_CASE**, separados del denominador 249.

Cambio semántico: `F-06`, `F-11`, `F-13`, `F-15`, `X-17`, `X-23`, `Q-004212`, `Q-004220`, `N-0002`, `N-0010`, `P0-R07`, `OP-MT-01-T2`, `OP-MT-01-T3`, `CP-MT-01-T3`, `CP-03`, `CP-04`, `CP-11`, `SP-08`, `RC-07`, `RC-09`, `RC-11`, `IT-01-T3`, `IT-02-T3`, `IT-03-T3`.

Revisión de alcance histórico: `F-20`, `X-19`, `Q-004211`, `Q-004213`, `Q-004214`, `Q-004215`, `Q-004216`, `Q-004217`, `Q-004219`, `Q-004223`, `Q-004224`, `Q-004225`, `Q-004226`, `Q-004227`, `Q-004228`, `P0-R06`, `OP-MT-02-T1`, `CP-08`, `SP-09`, `SP-10`, `SP-11`, `SP-12`, `RC-08`, `RC-10`.

Los 27 nuevos controles cubren opciones diagnósticas y nombres P1 desconocidos, no mapeo 1:1, pago para repetir, ausencia inicial, servicios especiales, precio 2026/2027, transición AND, horas, modalidades, metodología, insignia por vías mixtas, pasos Cosmos y parámetros, oferta/NRC, apertura, inscripción dinámica, contacto, evaluación, DigComp y población. Son preguntas/rúbricas de preparación; no resultados aprobados.

## 22. Impacto en código

La evidencia privada contiene `code-impact.md` y `code-impact.json`, con archivo, localizador y REQUIRED/OPTIONAL/NO_CHANGE. Es revisión estática sin modificaciones funcionales.

| Archivo/superficie | Clase para una futura tarea | Motivo |
|---|---|---|
|`backend/api/src/chat/ccd-knowledge.ts`| REQUIRED | Topics/aspects, alias/course lookup, elección diagnóstica vs catálogo, límites de retry/financial intent, scope de pagos, Cosmos, contacto y presentación. El selector actual puede elegir additional_fee/especiales para «otro intento». |
|`backend/api/src/chat/ccd-knowledge-manifest.ts`| REQUIRED | Schema exacto 1.3 y 87; proyección actual omite población/condiciones/domain_metadata para filtrar por alcance. |
|`backend/rag/src/ccd/knowledge.ts`| REQUIRED | Preparación/stage/manifest/embeddings asumen 87 y schema 1.3; no basta cambiar contenido con un nuevo número de claims. |
|`data/ccd/schemas/knowledge-adoption.schema.json`| REQUIRED, en contrato futuro | min=max 87 en claims y artefactos. Basis existente suficiente; topics/aspects libres y domain_metadata ya permiten metadatos de dominio. |
|`infra/db/013_ccd_knowledge_candidate.sql`| NO_CHANGE al archivo histórico | Futura migración adicional necesaria para nueva versión/cardinalidad: validación 87, guard schema/RPC y límite de claves. No editar 013. |
|`backend/api/src/auth/unified-product.ts`| OPTIONAL | Usa constante compartida para routing documental; verificar compatibilidad de versiones preservando autorización. |
|`backend/api/test/ccd-knowledge.test.ts` y `ccd-knowledge-routing.test.ts`| REQUIRED en futura implementación | Versiones, cardinalidad, opciones, retry/pagos, cambios de tema, alcance y precedencia documental. |
|`backend/rag/test/ccd-knowledge.test.ts`| REQUIRED en futura implementación | Preparación/procedencia/cuentas esperadas por versión, sin sustituir evidencia 1.3. |
|Bundle adoptado y preparación privada anterior| NO_CHANGE | Conservar reproducción de 87 y construir otro bundle separado cuando se autorice. |
|REST/OpenAPI, Mobile, autenticación, permisos, bindings, MCP, N8N, demo| NO_CHANGE | La auditoría no justifica cambiar esas superficies ni crear un endpoint o framework. |

No se diseñó una segunda arquitectura, no se movió lógica a N8N y no se implementó fallback institucional desde la demo. Las citas y la autorización actual se preservan.

## 23. Impacto en schema/release

Recomendación: **NEW_DATASET_SCHEMA_VERSION**, sin asignar nombre ni asumir automáticamente `ccd-1.4.0`.

| Pregunta | Decisión |
|---|---|
|A. ¿Solo contenido?| No para el delta completo: cambian entidades/reglas y se separan afirmaciones. |
|B. ¿Número de claims?| Se recomienda ampliar/separar; cantidad final pendiente de diseño y revisión, sin forzar 87. |
|C. ¿Estructura del manifest?| No necesariamente nueva forma externa: hay campos suficientes para parte del modelo; sí contrato de versión/cardinalidad y proyección de scope explícitos. |
|D. ¿Nueva propiedad/kind de procedencia?| No es necesaria por acceso autenticado. DOCUMENT_SOURCE/DOMAIN_CONFIRMATION existentes bastan; conservar alias/SHA/localizador/decisión y revisar transcripciones antes de adopción. |
|E. ¿Semántica del modelo?| Sí: diagnóstico, opción formativa, oferta y reglas históricas deben separarse. |
|F. ¿Runtime actual suficiente?| Parcial: admite strings de topic/aspect y domain_metadata en adopción, pero no usa todas sus dimensiones y exige 87/schema 1.3 en API, RAG y SQL. |

NEW_CONTENT_RELEASE_SAME_SCHEMA sería posible para una corrección estrictamente textual con 87 y semántica compatible. No cubre por sí sola este delta completo sin empaquetar indebidamente afirmaciones distintas o perder cobertura. La recomendación no autoriza cambios de schema, migraciones ni preparación de candidata ahora.

## 24. Qué NO debe cambiar todavía

Preservados current/manifest/release 1.3, adopción y 87 derivados, fuentes originales, schemas, código funcional, Mobile, contratos REST/MCP, N8N, demo, SQL, embeddings, cuentas, grants, vinculaciones e historial. No hubo login, chat HTTP, creación/borrado de conversaciones, ingesta, embeddings, publicación, rollback, commit ni push.

Validación ejecutada: hashes de fuentes/derivados y procedencia; integridad de 87 filas y 249 IDs del banco; lectura visual acotada; inventario textual de precio; comparación de snapshots SQL READ ONLY; comprobaciones de privacidad y alcance de archivos; `git diff --check`. No se ejecutaron typechecks, tests unitarios, E2E, banco RAG, Docker u Ollama; no se declara PASS funcional nuevo.

El snapshot final conserva exactamente las 43 tablas de los tres schemas auditados mediante conteos/fingerprints, incluyendo cuentas, corpus_grants, bindings/versiones, sesiones, conversaciones, mensajes y citas. Manifest, current, estado y 87/87/87 permanecen idénticos. Son comprobaciones de no mutación de esta auditoría, no una certificación general del producto. Se verifican nuevamente los 87 SHA y las 22 fuentes originales al cerrar.

## 25. Recomendación para siguiente tarea

**P4-B — diseñar y preparar una candidata documental canónica separada, sin publicación**, tomando esta matriz como entrada: acordar versión y cardinalidad; registrar decisiones que sustituyen curaciones anteriores; revisar transcripciones/alias y pendientes; redactar derivados depurados con bases por afirmación; separar reglas actuales, historia y oferta 2026-1; implementar únicamente el soporte de schema/selector autorizado y sus controles. Preservar CCD 1.3 y sus evidencias; validar la candidata en staging mediante mecanismos normales y revisión humana antes de una tarea de promoción distinta. No habilitar OE5 sobre contenido candidato no revisado ni declarar el delta integrado.

La tarea futura debe conservar preguntas de control negativas y los límites no resueltos. No requiere nueva interpretación del dominio confirmado ni volver a preguntar por la gratuidad, no repetición, precio 2026, contactos o distinción de entidades.

## ESTADO DE ENTREGA BANUCHAT

**AUDITORÍA DOCUMENTAL COMPLETADA; CCD 1.3 PRESERVADO; CANDIDATA DE ACTUALIZACIÓN PENDIENTE.**

HEAD inicial/final `7397def5d3385416726166ec30f73bfc5936d2f5`; current `f01c1c37-2d3f-4bc7-8940-fe724eb71c9a`, ready. Auditados 87: KEEP 33, KEEP_BUT_CLARIFY 22, RESCOPE 0, CORRECT 2, SUPERSEDE 1, SPLIT 5, HISTORICAL_ONLY 24, MERGE_CANDIDATE 0, PENDING_CLARIFICATION 0 como decisiones primarias; pendientes nuevos y acciones por aspecto se registran aparte. Conflictos 13, cinco abiertos y uno con soporte parcial.

Precio candidato 362550 COP/curso/2026. Ruta/pilar/opción diagnóstica/curso separados. Diagnóstico actual de una sola presentación, sin segunda pagada. Banco: 201 expectativas conservadas, 24 cambios semánticos, 24 de alcance histórico; 27 controles nuevos preparados y no ejecutados. Se recomienda nueva versión de schema de dataset, aún sin nombre ni implementación.

Único archivo versionable nuevo: `eval/rag-quality/results/ccd-documentary-audit-2026-10-27.md`. Evidencia completa ignorada: `data/ccd/local/p4-ccd-documentary-audit/`, incluidos matriz 87, modelo, alias, temporalidad, tarifas/repetición, insignia, Cosmos, conflictos, banco, code-impact, decisión de schema, fuentes saneadas, snapshots, no-mutation y run-manifest con hashes. Los PDF originales privados permanecen exclusivamente en su subcarpeta sources ignorada.

Cero mutación del producto comprobada; sin commit ni push. Siguiente tarea exacta recomendada: P4-B, candidata canónica separada y sin publicación, con revisión de dominio y validación antes de promoción.
