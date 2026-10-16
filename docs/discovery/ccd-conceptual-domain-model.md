# Modelo conceptual preliminar del dominio CCD para BanuChat

## 1. Propósito y alcance

Discovery D3, versión preliminar 0.1, **2026-10-15**. Este modelo conceptual
identifica conceptos, relaciones, temporalidad y fronteras de acceso que conviene
validar con el CCD antes de implementar. **No es un modelo físico ni lógico, no
define SQL y no constituye un contrato institucional.** Su propósito es impedir
que el software se adelante al levantamiento del dominio.

La base técnica inspeccionada es
`d82fff84d94ca8121cd5c66bcea3b56efd0127fd`. Los documentos de re-baseline y matriz
están presentes en el árbol de trabajo, todavía sin commit al iniciar esta tarea;
se preservan sin cambios. Todas las lecturas solicitadas estaban disponibles.
No existe `docs/discovery/README.md` y no se crea un índice adicional.

| Referencia | Fuente consultada | Qué puede respaldar |
| --- | --- | --- |
| R1 | [AGENTS.md](../../AGENTS.md), [README](../../README.md), [arquitectura](../arquitectura.md) y [ADR 0001](../adr/0001-alcance-sintetico-y-despliegue-local.md) | Alcance sintético local, estado implementado y diferencia respecto del objetivo Agent/MCP. No prueban realidad institucional. |
| R2 | [Re-baseline](../academic/banuchat-rebaseline-2026-10.md) | Dependencias, pausas y límites de la evidencia académica/técnica. |
| R3 | [Matriz de información v0.1](ccd-information-matrix.md) | Cuarenta preguntas CCD-Q, inventario CCD-D y preguntas P0/P1/P2. Sus CP-01–CP-04 son resúmenes del contexto público aportado, sin originales, URLs ni vigencia verificada. |
| R4 | [README API](../../backend/api/README.md), [contrato REST](../../backend/api/api-contract.md), [contrato MCP](../../backend/mcp-server/tools-contract.md) | Semántica de interfaces del prototipo. REST existe; el contrato MCP no acredita un servidor ejecutable. |
| R5 | Schemas sintéticos de [cursos](../../data/synthetic/schemas/courses.schema.json), [eventos](../../data/synthetic/schemas/calendar-events.schema.json), [anuncios](../../data/synthetic/schemas/announcements.schema.json), [perfiles](../../data/synthetic/schemas/profiles.schema.json), [progreso](../../data/synthetic/schemas/profile-progress.schema.json) y [documentos](../../data/synthetic/schemas/documents.schema.json) | Forma y restricciones del fixture v1, leídas exclusivamente para comparar conceptos. No definen el modelo real del CCD. |

Los contratos y esos schemas aportaron la información necesaria del modelo
sintético; no fue necesario recorrer el SQL ni leer registros individuales del
dataset. No se consultaron sistemas, APIs ni sitios reales, ni se recopilaron
documentos institucionales o datos personales. Este documento no habilita su uso.

### Fuente, inferencia y dependencia

| Etiqueta | Uso preciso en D3 |
| --- | --- |
| CONFIRMED_FROM_REPO | Afirmación comprobable sobre el prototipo o sus documentos. Nunca implica aprobación o confirmación del CCD. |
| PUBLIC_PRELIMINARY | Información pública reportada por el equipo y recogida en CP-01–CP-04 de R3; no verificada independientemente aquí. |
| INFERRED_CONCEPT | Distinción o relación propuesta por análisis conceptual. Es una hipótesis, aunque parezca razonable. |
| CCD_CONFIRMATION_REQUIRED | Dependencia de validación de significado, autoridad, relación, vigencia o alcance por el CCD. No es una clase de evidencia. |
| ACCESS_AUTHORIZATION_REQUIRED | Dependencia de autorización para acceder, usar o exponer información. No se satisface solo con confirmar que un concepto existe. |

Se registran por separado **origen de evidencia**, **decisión de modelado** y
**dependencias**. Las etiquetas no son intercambiables: una inferencia no se convierte
en hecho institucional porque aparezca en un documento del repositorio. Las
cardinalidades y clasificaciones propuestas siguen sujetas a confirmación.

## 2. Principios de modelado

1. Separar el concepto relativamente estable de su ocurrencia temporal: un curso
   puede conservar identidad conceptual mientras cambian sus ofertas y contenidos.
2. Separar Curso de Oferta concreta. Curso, sección, oferta y NRC no se declaran
   sinónimos; NRC se considera un identificador candidato cuyo alcance se desconoce.
3. Separar información pública, institucional no pública y personal. Una norma
   pública no hace públicos los registros de cumplimiento de un estudiante.
4. Separar contenido documental de estado transaccional. Una guía de inscripción
   no prueba que alguien esté inscrito; una publicación de oferta no prueba cupos.
5. Conservar procedencia y distinguir publicador, canal de consulta y autoridad
   del dato. Una publicación pública no se convierte automáticamente en fuente maestra.
6. Representar la vigencia de reglas temporales y su población aplicable. Fecha de
   observación, vigencia, periodo académico y fecha de una decisión son distintos.
7. Distinguir regla general de aplicación individual: homologación, diagnóstico,
   cumplimiento e insignia pueden requerir decisiones competentes, no inferencias del LLM.
8. No transformar cada término en entidad persistida. Modalidad, horario, ventana,
   requisito o historial podrían ser una clasificación, relación, vista o documento.
9. Reutilizar principios técnicos sin trasladar automáticamente nombres, estados,
   porcentajes, cardinalidades ni restricciones del dataset sintético.
10. No completar ausencia con valores asumidos: fin de vigencia desconocido no
    significa vigencia eterna; falta de historial no significa falta de cumplimiento.

Estos principios son **INFERRED_CONCEPT** como propuesta de modelado. Su afinidad
con controles existentes es **CONFIRMED_FROM_REPO**, no prueba de adopción institucional.

## 3. Inventario conceptual

En «Estado de evidencia» se indica el origen del concepto: PUBLIC_PRELIMINARY o
INFERRED_CONCEPT. La columna de validación registra dependencias por separado.
Fuentes, estabilidad y clasificación de acceso son candidatas, no asignaciones
institucionales. Los mecanismos se definen en la sección 8; los personales son
condicionales. Ninguna fila ordena persistir una entidad.

| Concepto | Descripción | Estado de evidencia | Estable o temporal | Público / institucional / personal | Fuente probable | Mecanismo BanuChat probable | Necesita validación CCD | Observaciones |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C01 — Ruta de Competencias Digitales | Organización formativa que agruparía cursos y requisitos. | PUBLIC_PRELIMINARY: CP-01 | Relativamente estable por versión | Pública candidata; definición institucional | Catálogo y definición curricular por identificar; D01 | STRUCTURED_QUERY | CCD_CONFIRMATION_REQUIRED | Se reportan tres rutas, no una cantidad inmutable ni un orden obligatorio. |
| C02 — Curso | Concepto académico con propósito y contenidos relativamente estables. | PUBLIC_PRELIMINARY: CP-01 | Estable con revisiones | Público candidato; materiales pueden ser internos | Catálogo maestro y syllabus por identificar; D01/D03 | STRUCTURED_QUERY + DOCUMENT_RAG | CCD_CONFIRMATION_REQUIRED | No equivale a oferta disponible, inscripción o sección. |
| C03 — Oferta de curso / sección | Ocurrencia concreta de un curso en un contexto temporal; equivalencia con sección por validar. | PUBLIC_PRELIMINARY: CP-02 | Temporal | Pública candidata; detalle operacional por confirmar | Oferta oficial por identificar; D06 | STRUCTURED_QUERY | CCD_CONFIRMATION_REQUIRED | Intensivo/vacacional podría calificar una oferta, no crear otro curso por sí solo. |
| C04 — Periodo académico | Marco temporal que contextualizaría ofertas y reglas. | PUBLIC_PRELIMINARY: CP-02 | Temporal, con identidad contextual | Público/institucional por confirmar | Definición de periodos y programación; D06/D17 | STRUCTURED_QUERY | CCD_CONFIRMATION_REQUIRED | No fijar semestres, códigos ni que toda oferta pertenezca a un único periodo. |
| C05 — Modalidad | Clasificación de cómo se desarrolla una oferta o actividad. | PUBLIC_PRELIMINARY: CP-02 | Clasificación relativamente estable; asignación temporal | Pública candidata | Oferta y definición de modalidades; D06 | STRUCTURED_QUERY | CCD_CONFIRMATION_REQUIRED | No se fija enum ni se decide que sea entidad independiente. |
| C06 — Horario | Programación de encuentros o actividades con posibles excepciones. | PUBLIC_PRELIMINARY: CP-02 | Temporal y revisable | Público/institucional por confirmar | Programación y cambios; D07 | STRUCTURED_QUERY | CCD_CONFIRMATION_REQUIRED | No reducir de antemano a un único intervalo ni confundir con todo el calendario. |
| C07 — Ventana de inscripción | Intervalo durante el cual se permite una acción de inscripción. | INFERRED_CONCEPT: CP-02 y Q13 motivan la separación | Temporal | Pública candidata; excepciones por confirmar | Procedimiento y calendario; D08/D17 | STRUCTURED_QUERY | CCD_CONFIRMATION_REQUIRED | Puede depender de oferta, convocatoria o población; no es la inscripción personal. |
| C08 — Evento | Hecho programado o plazo localizable en un calendario. | INFERRED_CONCEPT: Q31 y abstracción sintética R5 | Temporal | Público, interno o personal según evento | Fuentes de programación por identificar; D07/D17 | STRUCTURED_QUERY | CCD_CONFIRMATION_REQUIRED | Podría ser una proyección de otras fuentes; no asumir calendario maestro único. |
| C09 — Convocatoria | Llamado con objeto, destinatarios, condiciones y ventanas. | PUBLIC_PRELIMINARY: CP-04 | Temporal y versionable | Pública candidata; anexos por confirmar | Publicación oficial por identificar; D11/D16 | STRUCTURED_QUERY + DOCUMENT_RAG + DOCUMENT_LOOKUP | CCD_CONFIRMATION_REQUIRED | Un anuncio puede difundirla, sin ser la convocatoria ni su fuente maestra. |
| C10 — Prueba diagnóstica | Actividad de evaluación con propósito y efectos por confirmar. | PUBLIC_PRELIMINARY: CP-04 | Tipo relativamente estable; aplicación temporal | Descripción general; resultado personal | Protocolo y convocatoria por identificar; D10/D11 | DOCUMENT_RAG + STRUCTURED_QUERY | CCD_CONFIRMATION_REQUIRED | Distinguir prueba, aplicación, resultado y regla; no se modela todavía el resultado individual. |
| C11 — Regla/política diagnóstica | Condiciones, intentos y efectos de presentar una prueba. | PUBLIC_PRELIMINARY: CP-04 | Vigente por versión y ámbito | Pública/institucional por confirmar | Norma/protocolo competente; D10 | DOCUMENT_RAG + DOCUMENT_LOOKUP | CCD_CONFIRMATION_REQUIRED | No inventar umbrales, número de intentos ni equivalencias. |
| C12 — Homologación | Reconocimiento aplicado a un antecedente académico; distinto de la regla general. | INFERRED_CONCEPT: distinción derivada de CP-04 | Decisión temporal con posible corrección | Personal/institucional para el caso individual | Registro y decisión competente; D15 | UNRESOLVED | CCD_CONFIRMATION_REQUIRED; ACCESS_AUTHORIZATION_REQUIRED | No asumir trámite, automatismo ni acto individual persistido con un formato conocido. |
| C13 — Regla de homologación | Criterio o equivalencia aplicable a antecedentes y requisitos. | PUBLIC_PRELIMINARY: CP-04 | Vigente por plan, transición o versión | Pública/institucional por confirmar | Norma y equivalencias; D12 | DOCUMENT_RAG + DOCUMENT_LOOKUP; STRUCTURED_QUERY si es explícita | CCD_CONFIRMATION_REQUIRED | Puede reconocer curso, ruta o requisito; destino por validar. |
| C14 — Documento institucional | Pieza documental identificable, cuya oficialidad debe acreditarse. | INFERRED_CONCEPT: CP-04 y necesidad de evidencia de R3 | Identidad relativamente estable | Público, interno o personal por documento | Repositorio/emisor por identificar; D21 | DOCUMENT_LOOKUP + DOCUMENT_RAG | CCD_CONFIRMATION_REQUIRED; ACCESS_AUTHORIZATION_REQUIRED si restringido | El patrón documental existe en R1/R4; no prueba que se haya obtenido un documento institucional. |
| C15 — Versión de documento | Estado identificable del contenido de un documento. | INFERRED_CONCEPT: extensión del patrón versionado R1/R4 | Temporal e históricamente distinguible | Hereda restricciones; verificar por versión | Original y metadatos autorizados; D21 | DOCUMENT_LOOKUP + DOCUMENT_RAG | CCD_CONFIRMATION_REQUIRED | Versión técnica del corpus y versión normativa no son automáticamente equivalentes. |
| C16 — Fuente/procedencia | Origen y cadena de evidencia de una afirmación o dato. | INFERRED_CONCEPT: principio reutilizado de R1/R4 | Contexto que cambia; observaciones históricas | Clasificación según origen y dato | Fuente original, canal y autoridad por identificar; D25 | DOCUMENT_LOOKUP + STATIC_GUIDANCE | CCD_CONFIRMATION_REQUIRED | Hash demuestra identidad de bytes, no autoridad, permiso ni vigencia. |
| C17 — Insignia | Reconocimiento digital descrito públicamente; separar definición de emisión individual. | PUBLIC_PRELIMINARY: CP-04 | Definición versionable; emisión temporal | Definición pública candidata; emisión personal | Procedimiento y autoridad emisora por identificar; D18/D19 | DOCUMENT_RAG + STATIC_GUIDANCE; UNRESOLVED para emisión personal | CCD_CONFIRMATION_REQUIRED; ACCESS_AUTHORIZATION_REQUIRED para caso personal | No asumir emisión automática, plataforma ni verificador público. |
| C18 — Regla/requisito de insignia | Condiciones para obtener o solicitar el reconocimiento. | INFERRED_CONCEPT: CP-04 reporta insignia sin procedimiento completo | Vigente por versión y población | Pública/institucional por confirmar | Procedimiento y norma; D18 | DOCUMENT_RAG + DOCUMENT_LOOKUP | CCD_CONFIRMATION_REQUIRED | No inferir que completar rutas sea condición suficiente. |
| C19 — Estudiante | Persona titular de un eventual estado académico consultable. | INFERRED_CONCEPT: Q22–Q28 y CP-03 | Persona continua; vínculos académicos temporales | Personal | Identidad y registro autorizados por identificar; D24 | UNRESOLVED | CCD_CONFIRMATION_REQUIRED; ACCESS_AUTHORIZATION_REQUIRED | Rol de frontera, no sustitución del perfil ficticio ni definición de credenciales. |
| C20 — Cumplimiento de ruta | Evaluación del cumplimiento según reglas aplicables a una persona. | PUBLIC_PRELIMINARY: CP-03/CP-04 | Personal y dependiente de regla/corte | Personal; regla general separada | Registro/decisión competente por identificar; D13/D14 | AUTHENTICATED_STRUCTURED_QUERY, solo si se habilita | CCD_CONFIRMATION_REQUIRED; ACCESS_AUTHORIZATION_REQUIRED | Puede ser dictamen o dato derivado; no igualar a porcentaje de cursos. |
| C21 — Progreso | Estado de avance cuya unidad y significado están por definir. | INFERRED_CONCEPT: preguntas Q25 y fixture R5 | Temporal | Personal | Fuente de progreso por identificar; D14 | AUTHENTICATED_STRUCTURED_QUERY, solo si se habilita | CCD_CONFIRMATION_REQUIRED; ACCESS_AUTHORIZATION_REQUIRED | Puede referir a aprendizaje, aprobación o requisito; no fijar escala 0–100 real. |
| C22 — Historial | Secuencia o vista de antecedentes académicos de una persona. | INFERRED_CONCEPT: Q26 | Histórico con correcciones | Personal | Registro histórico competente; D14/D15 | AUTHENTICATED_STRUCTURED_QUERY, solo si se habilita | CCD_CONFIRMATION_REQUIRED; ACCESS_AUTHORIZATION_REQUIRED | No equivale a historial de chat ni implica un expediente local en BanuChat. |
| C23 — Inscripción del estudiante | Vinculación individual a una oferta y su posible estado. | INFERRED_CONCEPT: CP-02/CP-03 reportan inscripción, no modelo interno | Temporal/transaccional | Personal | Registro/procedimiento competente; D08/D24 | UNRESOLVED | CCD_CONFIRMATION_REQUIRED; ACCESS_AUTHORIZATION_REQUIRED | Distinguir orientación, solicitud, pago y confirmación; no diseñar sus estados. |
| C24 — Soporte/canal institucional | Medio validado para orientar o escalar una consulta. | INFERRED_CONCEPT: Q34 | Referencia revisable | Público o interno por canal | Directorio/protocolo por identificar; D20 | STATIC_GUIDANCE + DOCUMENT_LOOKUP | CCD_CONFIRMATION_REQUIRED | No inventar contactos, horarios ni responsables. |
| C25 — NRC | Identificador publicado junto a una oferta; semántica y ámbito pendientes. | PUBLIC_PRELIMINARY: CP-02 | Contextual y potencialmente reutilizable | Público candidato | Oferta oficial; D06 | STRUCTURED_QUERY | CCD_CONFIRMATION_REQUIRED | No tratarlo como entidad académica ni clave universal o sinónimo de curso. |
| C26 — Plan/cohorte/antecedente académico | Contextos distintos que podrían condicionar reglas. | INFERRED_CONCEPT: CP-04 y Q23/Q27/Q36 | Históricos, con vigencias | Regla general o dato personal según uso | Normas y registros competentes; D12–D15 | DOCUMENT_RAG; UNRESOLVED para caso personal | CCD_CONFIRMATION_REQUIRED; ACCESS_AUTHORIZATION_REQUIRED si personal | Se agrupan para descubrimiento; no se declaran una sola entidad ni códigos internos. |
| C27 — Cupos/disponibilidad | Estado operacional potencial de una oferta. | INFERRED_CONCEPT: Q37, sin fuente confirmada | Desconocido; potencialmente muy cambiante | Visibilidad desconocida | Ninguna fuente confirmada; D22 | UNRESOLVED | CCD_CONFIRMATION_REQUIRED; ACCESS_AUTHORIZATION_REQUIRED | No se afirma que exista saldo consultable, reserva ni disponibilidad en tiempo real. |

## 4. Entidades conceptuales recomendadas

Se recomienda conservar un núcleo pequeño para discutir identidad, relaciones y
evidencia. «Entidad conceptual» no significa tabla, registro local, endpoint ni
recurso institucional existente. Los estados evalúan utilidad del concepto, no
su confirmación por el CCD:

- **KEEP_CONCEPT:** abstracción reutilizable respaldada en el prototipo; sus
  instancias y semántica institucional aún requieren validación.
- **PROVISIONAL_CONCEPT:** candidato razonable pero no comprobado; mantenerlo
  como hipótesis explícita, sin fijar implementación.
- **NEEDS_DISCOVERY:** faltan definiciones para decidir si es entidad independiente,
  relación, clasificación, documento o vista.
- **DO_NOT_MODEL_YET:** reconocer la frontera, pero no desarrollar estructura interna,
  estados ni persistencia mientras falten alcance, evidencia o autorización.

| Conceptos | Estado | Decisión conceptual y justificación |
| --- | --- | --- |
| C14 Documento, C15 Versión, C16 Fuente/procedencia | KEEP_CONCEPT | Conservar las distinciones identidad–contenido versionado–origen ya útiles en R1/R4. No se confirma el repositorio documental institucional ni se decide una entidad persistida por distinción. |
| C01 Ruta, C02 Curso | PROVISIONAL_CONCEPT | CP-01 justifica discutirlos como conceptos distintos. Validar identidad, relaciones y revisiones; no fijar tres rutas como constante ni todos los cursos como exclusivos de una ruta. |
| C03 Oferta, C04 Periodo | PROVISIONAL_CONCEPT | CP-02 justifica separar el curso de su ocurrencia. Oferta y sección podrían diferir; la pertenencia a periodos requiere confirmación. |
| C09 Convocatoria, C10 Prueba diagnóstica | PROVISIONAL_CONCEPT | CP-04 distingue temas con propósito propio. No crear todavía entidades para cada fase, intento o publicación. |
| C11 Regla diagnóstica, C13 Regla de homologación, C18 Requisito de insignia | PROVISIONAL_CONCEPT | Conservar la noción de regla versionada y aplicable a un ámbito. Sus variantes podrían vivir en documentos, no en tres entidades independientes. |
| C17 Insignia como definición | PROVISIONAL_CONCEPT | El reconocimiento reportado merece distinguirse de una emisión personal. Procedimiento y relación con cumplimiento siguen abiertos. |
| C05 Modalidad, C06 Horario, C07 Ventana, C25 NRC | PROVISIONAL_CONCEPT | Conservar como cualidades, identificador o componentes temporales candidatos de oferta/convocatoria; no promover automáticamente a entidades autónomas. |
| C08 Evento, C24 Canal de soporte | NEEDS_DISCOVERY | Podrían ser proyecciones de programación y referencias en guías. Falta demostrar necesidad de identidad propia y fuente de mantenimiento. |
| C20 Cumplimiento, C21 Progreso | NEEDS_DISCOVERY | Separar ambos términos, pero decidir después si son estados oficiales, cálculos autorizados o dictámenes humanos. No derivarlos de porcentajes sintéticos. |
| C26 Plan/cohorte/antecedente | NEEDS_DISCOVERY | Hace falta vocabulario y reglas de aplicabilidad. No diseñar tres entidades ni fusionarlas solo porque aparezcan en una misma pregunta. |
| C19 Estudiante, C22 Historial, C23 Inscripción individual, C12 Homologación individual | DO_NOT_MODEL_YET | Se reconocen únicamente como fronteras personales y preguntas de alcance. No definir expediente, identidad técnica, estados transaccionales ni duplicación local. |
| Emisión personal de C17, C27 Cupos, resultados individuales de C10 | DO_NOT_MODEL_YET | Sin fuentes, autoridad o acceso confirmados. No inventar estados de emisión, reservas, intentos ni resultados. |

También se dejan fuera del modelado interno pagos, elegibilidad personalizada,
tablas de sistemas externos y transacciones de modificación. Conservar una pregunta
o un nodo de frontera para ellos no equivale a recomendar su implementación.

## 5. Relaciones conceptuales

`0..N` significa cero o varios; `1..N`, uno o varios. Los límites son **hipótesis
conceptuales**, no restricciones verificadas ni cardinalidades de un futuro schema.
La certeza «media conceptual» indica utilidad de la distinción, no una probabilidad
medida ni confirmación institucional. Toda relación aplicada al CCD mantiene
CCD_CONFIRMATION_REQUIRED; las personales añaden ACCESS_AUTHORIZATION_REQUIRED.

| ID | Relación | Cardinalidad conceptual probable | Evidencia | Grado de certeza | Preguntas pendientes |
| --- | --- | --- | --- | --- | --- |
| REL-01 | Ruta → Curso | Una ruta podría agrupar 1..N cursos; un curso podría participar en 1..N rutas según versión. Exclusividad y mínimos no cerrados. | PUBLIC_PRELIMINARY CP-01 para asociación; INFERRED_CONCEPT para multiplicidad | Media conceptual; cardinalidad no confirmada | ¿Hay cursos compartidos, optativos, rutas sin cursos publicados o cambios por plan? |
| REL-02 | Curso → Oferta | Un curso podría tener 0..N ofertas; cada oferta remitiría normalmente a un curso, pero equivalencias/secciones compartidas están abiertas. | PUBLIC_PRELIMINARY CP-02; separación INFERRED_CONCEPT | Media conceptual | ¿Oferta y sección son equivalentes? ¿Una oferta puede corresponder a varios cursos? |
| REL-03 | Oferta → Periodo | Varias ofertas podrían compartir un periodo; una oferta podría asociarse a uno o varios ámbitos temporales. No fijar 1 obligatorio. | PUBLIC_PRELIMINARY CP-02 | Media para vínculo; baja para multiplicidad | ¿Intensivos/vacacionales pertenecen a un periodo único? ¿Hay ofertas que lo atraviesan? |
| REL-04 | Oferta → NRC | Candidato: un NRC contextual por oferta/sección publicada; cantidad, ausencia y reutilización desconocidas. | PUBLIC_PRELIMINARY CP-02 | Baja para identidad/unicidad | ¿Qué identifica exactamente y en qué combinación de contexto resulta inequívoco? |
| REL-05 | Oferta → Horario | 0..N componentes o revisiones de horario por oferta; relación inversa no fijada. | PUBLIC_PRELIMINARY CP-02; multiplicidad INFERRED_CONCEPT | Media conceptual | ¿Hay asincronía, encuentros múltiples, grupos o excepciones compartidas? |
| REL-06 | Oferta → Modalidad | Una o varias modalidades por oferta o componente, sin fijar obligatoriedad. | PUBLIC_PRELIMINARY CP-02 | Baja para multiplicidad | ¿La modalidad es única, combinada o distinta por actividad? |
| REL-07 | Oferta/Convocatoria → Ventana de inscripción | 0..N ventanas candidatas por objeto; una ventana podría cubrir varias ofertas o poblaciones. | INFERRED_CONCEPT desde CP-02/CP-04 y Q13/Q20 | Baja | ¿Hay ventanas compartidas, fases, excepciones o cierre anticipado? |
| REL-08 | Regla → Vigencia | Una regla identificable podría tener 1..N versiones/aplicabilidades; intervalos múltiples o solapados requieren criterio. | INFERRED_CONCEPT desde la advertencia temporal de R3 | Media como necesidad; baja para forma | ¿Qué fecha y población determinan aplicación? ¿Cómo se resuelven excepciones y reemplazos? |
| REL-09 | Regla de homologación → Antecedente / Ruta / Curso / Requisito | Una regla podría relacionar 1..N antecedentes con 1..N reconocimientos; el destino no está confirmado como Ruta. | PUBLIC_PRELIMINARY CP-04 para reglas; INFERRED_CONCEPT para destinos | Baja | ¿Reconoce curso, componente, ruta o requisito? ¿Hay combinaciones y decisión individual? |
| REL-10 | Convocatoria → Ventana temporal | 1..N intervalos relevantes candidatos; publicación, inscripción, ejecución y resultados pueden diferir. | PUBLIC_PRELIMINARY CP-04; separación INFERRED_CONCEPT | Media conceptual | ¿Cuáles intervalos existen, qué versiones los corrigen y qué fuente prevalece? |
| REL-11 | Documento → Versión | Como convención candidata, un documento tiene 1..N versiones conocidas y una versión pertenece a una identidad documental. Familias/anexos por validar. | CONFIRMED_FROM_REPO R1/R4 para patrón; INFERRED_CONCEPT para CCD | Alta utilidad de la distinción; realización institucional desconocida | ¿Se mantiene identidad al actualizar? ¿Cómo se identifican anexos, reemplazos y copias? |
| REL-12 | Dato/afirmación → Fuente/procedencia | Toda afirmación publicable debería tener 1..N evidencias; una fuente puede respaldar varias afirmaciones. Es criterio de calidad, no restricción real observada. | CONFIRMED_FROM_REPO R4 para trazabilidad; INFERRED_CONCEPT como requisito futuro | Alta utilidad; fuentes reales desconocidas | ¿Qué evidencia respalda cada parte y qué autoridad resuelve contradicciones? |
| REL-13 | Documento/Versión → Regla | Una versión podría contener 0..N reglas; una regla podría depender de varios documentos y modificaciones. | INFERRED_CONCEPT | Media conceptual | ¿La fuente normativa es completa y cómo se distinguen texto, interpretación y decisión? |
| REL-14 | Prueba diagnóstica → Regla / Convocatoria | Un tipo de prueba podría tener varias aplicaciones y reglas por vigencia; no se fija relación uno a uno. | PUBLIC_PRELIMINARY CP-04; multiplicidad INFERRED_CONCEPT | Baja | ¿Una convocatoria incluye varias pruebas? ¿La política cambia por aplicación? |
| REL-15 | Estudiante → Cumplimiento | Hipótesis de frontera: una persona podría tener 0..N estados/decisiones por ruta, ámbito y corte. No se fija historial ni estructura interna. | PUBLIC_PRELIMINARY CP-03/CP-04 para tema; INFERRED_CONCEPT para relación | Baja; acceso no autorizado | ¿Cumplimiento es registro oficial, cálculo o dictamen? ¿Quién puede consultarlo? |
| REL-16 | Estudiante → Historial | 0..N antecedentes candidatos consultables; «un historial por estudiante» podría ser solo una vista, no una entidad. | INFERRED_CONCEPT Q26; no fuente real | Baja; acceso no autorizado | ¿Qué conserva cada sistema, con qué cobertura, correcciones y permisos? |
| REL-17 | Estudiante → Inscripción → Oferta | Hipótesis: una persona puede tener varias vinculaciones y una oferta varias personas; reintentos, retiros y unicidad no se modelan. | PUBLIC_PRELIMINARY CP-02/CP-03 para inscripción; INFERRED_CONCEPT para vínculo | Baja; acceso no autorizado | ¿Hay solicitud y confirmación separadas? ¿Se consulta únicamente o se excluye por alcance? |
| REL-18 | Insignia → Requisito / Cumplimiento | Una definición podría exigir 1..N condiciones; completar una ruta no se declara suficiente ni implica emisión. | PUBLIC_PRELIMINARY CP-04 para insignia; INFERRED_CONCEPT para vínculo | Baja | ¿Qué autoridad verifica requisitos? ¿Se solicita, decide o emite automáticamente? |

Las relaciones personales se registran para delimitar preguntas de acceso, no
para proponer entidades persistidas. No se afirma una relación de sincronización
entre Cosmos, MiPortalU, Banner y Canvas ni se dibuja una integración disponible.

## 6. Distinción crítica: Curso vs Oferta

### Curso: concepto académico relativamente estable

**INFERRED_CONCEPT:** Curso representa el objeto académico que puede describirse
por propósito y contenidos, incluso cuando no esté ofertado. Su identidad y sus
revisiones deben validarse: cambiar un nombre o syllabus no demuestra por sí solo
que se trate de otro curso. CP-01 respalda preliminarmente nombres y asociaciones,
no reglas internas de identidad.

### Oferta: ocurrencia concreta en un contexto temporal

**INFERRED_CONCEPT:** Oferta representa la posibilidad concreta de cursar ese objeto
en un periodo/contexto. CP-02 reporta información compatible con esa distinción.
Sección podría ser la misma unidad o una subdivisión; NRC podría identificar una
de ellas. Ninguna equivalencia se cierra en D3.

| Información | Ubicación conceptual candidata | Límite o alternativa por validar |
| --- | --- | --- |
| Propósito, nombre y contenidos académicos | Curso y su versión/descripción | Una oferta podría usar una versión determinada del contenido. |
| NRC | Identificación contextual de oferta/sección, no del curso estable | Falta alcance de unicidad, reutilización y relación exacta con sección. |
| Periodo y fechas de inicio/finalización | Oferta y programación | No suponer que todas las fechas coincidan con las del periodo. |
| Horario | Oferta o sus actividades programadas | Pueden existir varios encuentros, excepciones o componentes sin horario fijo. |
| Modalidad | Oferta o componente | Un curso podría permitir modalidades diferentes; no fijar modalidad única en el catálogo. |
| Ventana/procedimiento de inscripción | Oferta, convocatoria o proceso compartido | La guía general puede ser documental y compartida, sin pertenecer exclusivamente a una oferta. |
| Inscripción de una persona | Vínculo personal con oferta, solo si se autoriza | No es un atributo público del curso ni equivale a pago confirmado. |
| Cupos | Posible disponibilidad operacional de oferta/sección | Sin fuente ni semántica confirmadas. No modelar saldo, reserva o tiempo real. |
| Intensivo/vacacional | Posible clasificación o contexto de oferta | Confirmar si modifica contenidos, duración, reglas o identidad del curso. |

Estas son asignaciones semánticas, no columnas SQL. **CONFIRMED_FROM_REPO:** el
schema `courses` actual tiene clave, nombre, descripción y estados
`available/closed/archived`; no distingue oferta, periodo o NRC. Esos estados no
pueden trasladarse sin revisión al catálogo real ni interpretarse como cupos.
El contrato MCP usa «oferta o catálogo» para `get_courses` dentro del dominio
sintético; esa redacción no prueba que ambos conceptos sean equivalentes en el CCD.

## 7. Temporalidad y versionado

**INFERRED_CONCEPT:** conviene poder expresar estas ideas semánticas, sin imponer
nombres de campos, tipos, tablas ni un esquema físico:

| Idea | Significado | Qué no significa |
| --- | --- | --- |
| `valid_from` | Momento o ámbito a partir del cual una regla/dato aplica según su autoridad. | No es necesariamente publicación, ingesta ni primera observación. |
| `valid_until` | Límite de aplicación conocido, con significado de frontera por confirmar. | Ausencia de límite conocido no permite afirmar vigencia eterna ni elegir inclusividad arbitraria. |
| `source` | Evidencia de origen, versión y autoridad que sustenta la afirmación. | No es necesariamente el portal donde se vio ni una URL que autorice acceso. |
| `observed_at` | Momento en que se observó/obtuvo la evidencia en un acceso autorizado. | No certifica cuándo cambió el dato ni que continúe vigente después. |

Vigencia puede depender además de plan, cohorte, periodo o población; un intervalo
de fechas por sí solo podría resultar insuficiente. También deben distinguirse
la fecha de decisión personal, la fecha de registro y una corrección posterior.
No se propone implementar bitemporalidad ni retención indefinida.

| Concepto | Historia que sería necesario interpretar | Dependencia |
| --- | --- | --- |
| Reglas diagnósticas | Versión, convocatoria, destinatarios, intentos/efectos y excepciones aplicables | Norma y autoridad interpretativa; no usar siempre la regla más reciente. |
| Homologaciones | Regla/equivalencia aplicable al antecedente; por separado decisión individual y correcciones | Planes/transiciones y autorización para el caso personal. |
| Oferta | Periodo, apertura/cierre, inicio/final y cambios de estado documentados | Fuente oficial, corte y semántica de los estados. |
| Horarios | Programación original, cambios, cancelaciones y excepciones | Procedencia del cambio y comunicación vigente. |
| Convocatorias | Publicación, ventanas, prórrogas, ejecución y reemplazos | Versión competente y ámbito de cada fecha. |
| Procedimientos | Pasos/canales válidos para cada periodo y su reemplazo | Autoridad y mantenimiento de la guía. |
| Documentos | Identidad, contenido por versión, anexos, reemplazos y aplicabilidad | Versión oficial frente a copia observada; acceso por documento. |
| Requisitos, incluidas insignia y rutas | Regla aplicable por población, plan o cohorte y sus transiciones | No suponer que la regla actual invalida automáticamente decisiones previas. |

Una regla observada públicamente en **2025 o 2026** puede pertenecer a una edición,
cohorte o convocatoria específica, haber sido corregida o estar incompleta. Los
años son un ejemplo semántico, no afirmación de que aquí se haya inspeccionado una
publicación de esos años. Registrar la observación no convierte la regla en
constante eterna. Si falta aplicabilidad, la respuesta debe señalar el límite o
derivar a confirmación; no resolverlo por la fecha más reciente encontrada.

**CONFIRMED_FROM_REPO:** el prototipo conserva releases y versiones, y sus anuncios
tienen vigencia. Esa trazabilidad no equivale a conocer vigencia académica real;
una release técnica puede contener reglas con ámbitos de aplicación diferentes.

## 8. Clasificación por mecanismo BanuChat

Los mecanismos son candidatos conceptuales. `STRUCTURED_QUERY` no presupone SQL
ni una API; `DOCUMENT_RAG` explica contenido con evidencia; `DOCUMENT_LOOKUP`
localiza el original; `STATIC_GUIDANCE` orienta con una guía revisable.
`AUTHENTICATED_STRUCTURED_QUERY` expresa **consulta personal condicionada a identidad
y autorización**, no tecnología de autenticación ni capacidad implementada.
`UNRESOLVED` mantiene abierta la decisión por falta de evidencia o acceso.

D3 añade la categoría personal condicional para explicitar la dependencia. Esto
no cambia la matriz v0.1, donde esas preguntas permanecen sin resolver, ni levanta
sus bloqueos. Una combinación de mecanismos no define un workflow de ejecución.

| Concepto/pregunta | Mecanismo probable | Razón | Dependencia |
| --- | --- | --- | --- |
| Ruta/Curso: «¿Qué cursos tiene Ruta 2?» (Q01/Q02) | STRUCTURED_QUERY | Seleccionar una relación de catálogo es una consulta exacta. | Catálogo maestro completo, asociación vigente y divulgación confirmada. |
| Oferta/NRC/Periodo: «¿Qué se ofrece en este periodo?» (Q07/Q08) | STRUCTURED_QUERY | Distinguir ocurrencias y su contexto. | Fuente oficial de ofertas y semántica de NRC; no inferir desde nombres. |
| Horario/Modalidad/Fechas (Q09–Q11/Q13) | STRUCTURED_QUERY | Recuperar programación y plazos aplicables. | Corte, cambios y excepciones; modalidad/horario pueden requerir guía complementaria. |
| Contenido de curso: «¿Qué aprenderé?» (Q04) | DOCUMENT_RAG + DOCUMENT_LOOKUP | Explicar syllabus y permitir verificar el original. | Syllabus autorizado y versión aplicable; el nombre del curso no basta. |
| Reglas diagnósticas (Q19/Q21) | DOCUMENT_RAG + DOCUMENT_LOOKUP | Explicar condiciones con alcance y evidencia. | Texto competente, destinatarios, convocatoria y vigencia. |
| Fechas de diagnóstico/Convocatorias/Calendario (Q20/Q29/Q31) | STRUCTURED_QUERY + DOCUMENT_LOOKUP | Consultar fechas y localizar la publicación que las respalda. | Fuente completa, autoridad y correcciones. |
| «¿Cómo funciona una regla de homologación?» (Q23) | DOCUMENT_RAG + DOCUMENT_LOOKUP; STRUCTURED_QUERY si la fuente contiene equivalencias explícitas | La explicación textual y la consulta exacta pueden tener fuentes distintas. | Norma/equivalencias validadas; no producir una decisión personal. |
| Requisitos generales de ruta/insignia (Q27/Q32/Q36) | DOCUMENT_RAG + DOCUMENT_LOOKUP | Interpretar una regla general dentro de su ámbito. | Plan/cohorte, excepciones, autoridad interpretativa y procedimiento obtenido. |
| «¿Dónde está el documento vigente?» (Q35) | DOCUMENT_LOOKUP | Localizar identidad y versión sin generar contenido innecesario. | Documento, permisos y criterio de vigencia. |
| Orientación de inscripción, pago, acceso o soporte (Q12/Q15/Q34/Q38) | STATIC_GUIDANCE + DOCUMENT_LOOKUP | Pasos/canales confirmados bastan; no hay operación institucional. | Procedimiento y contacto validados; revisar cambios. |
| «¿Qué me falta a mí?» / progreso y cumplimiento (Q25/Q28) | AUTHENTICATED_STRUCTURED_QUERY, solo si se habilita; hoy UNRESOLVED | Requiere estado personal oficial y reglas/decisiones aplicables. | Identidad, permisos, fuente autoritativa y semántica de cumplimiento; no calcular con RAG. |
| Historial académico (Q26) | AUTHENTICATED_STRUCTURED_QUERY, solo si se habilita; hoy UNRESOLVED | Consultar antecedentes autorizados, sin inventar un expediente local. | Cobertura, correcciones, retención y acceso por titular/rol. |
| Resultado diagnóstico, homologación e insignia individuales (Q22/Q24/Q33) | UNRESOLVED | No se conoce si existe estado consultable o decisión humana accesible. | Registro, autoridad, permisos y necesidad de incluirlos; una futura consulta podría ser autenticada. |
| Inscripción transaccional y modificaciones (Q18/Q39) | UNRESOLVED | Los mecanismos de consulta no autorizan escritura, inscripción ni corrección institucional. | Decisión de alcance; propuesta de exclusión conservada de R3. |
| Cupos «ahora» (Q37) | UNRESOLVED | No hay fuente, modelo ni frescura confirmados. | Existencia, significado, permiso y corte; no ofrecer tiempo real. |

**INFERRED_CONCEPT:** una consulta mixta puede requerir datos y documentos con
ámbitos compatibles. No combinar una oferta de un periodo con una regla de otra
población como si fueran evidencia coherente. No se decide aquí un agente para
resolverlo ni un fallback que eluda la falta de autorización.

## 9. Información personal y fronteras de autorización

| Frontera | Ejemplos candidatos | Regla conceptual de disponibilidad |
| --- | --- | --- |
| Información pública | Descripciones de rutas, catálogo divulgado, oferta publicada y guías generales | Confirmar publicación, aplicabilidad y permiso de reutilización/exposición; público no equivale a maestro interno. |
| Información institucional no pública | Procedimientos internos, anexos, rúbricas restringidas, fuentes operacionales | ACCESS_AUTHORIZATION_REQUIRED según fuente y uso, aunque no incluya personas. No hacer público el contenido mediante una cita o respuesta generada. |
| Información personal del estudiante | Progreso, historial, decisiones, inscripción, pago, resultado diagnóstico e insignia individual | Exigir identidad y autorización pertinente antes de consultar o revelar; no basta conocer una clave, nombre o documento. |

Las categorías se aplican al dato o documento concreto, no a un portal completo.
Una misma convocatoria puede ser pública mientras las solicitudes sean personales.

| Concepto personal | Qué se protege o debe delimitarse | Qué podría explicarse sin expediente, si se valida como público |
| --- | --- | --- |
| Progreso | Estado de una persona, unidad de avance y momento de corte | Qué significa el programa/ruta y dónde consultar el estado oficial. |
| Historial | Antecedentes, resultados, decisiones y correcciones; alcance de conservación | Procedimiento para consultar o solicitar corrección, sin revelar registros. |
| Cumplimiento curricular | Dictamen o cálculo aplicable a la persona, plan/cohorte y excepciones | Reglas generales con su ámbito; no afirmar que alguien ya cumple. |
| Inscripción | Vinculación, solicitud, confirmación, retiro y relación con pago, si existen | Pasos y ventanas oficiales; no confirmar matrícula ni ejecutar cambios. |
| Elegibilidad | Decisión que puede combinar antecedentes, reglas y valoración competente | Criterios generales; no inferir aceptación o derecho individual desde documentos. |

**INFERRED_CONCEPT:** autenticación y autorización resuelven preguntas diferentes:
quién consulta y qué puede consultar/hacer. No se diseña ninguno de esos mecanismos
ni se presupone SSO, API o delegación institucional. El personal administrativo
reportado como usuario de Banner no confiere acceso equivalente a BanuChat.

**CONFIRMED_FROM_REPO:** `profile_key` selecciona una ficción del prototipo y REST
no autentica personas. El contexto controlado del perfil MCP tampoco es identidad
institucional. El historial implementado es conversacional; no acredita historial
académico ni permisos para mostrarlo. Mantener ambas nociones separadas.

## 10. Procedencia y autoridad

**INFERRED_CONCEPT:** toda afirmación susceptible de cambiar debería responder las
preguntas siguientes antes de presentarse como vigente. Se propone una obligación
de trazabilidad, no una tabla ni campos obligatorios de interfaz.

| Pregunta | Evidencia conceptual necesaria | Precaución |
| --- | --- | --- |
| ¿De dónde salió? | Original o registro permitido, ubicación/localizador y cadena de derivación | Un portal puede ser canal de presentación de datos originados en otro lugar. |
| ¿Qué versión es? | Edición, revisión, copia o corte identificable y relación con reemplazos | Si no hay versión oficial conocida, registrar la limitación; no inventarla. |
| ¿Desde cuándo aplica? | Vigencia y ámbito de periodo, plan, cohorte o población cuando corresponda | Fecha de publicación no prueba por sí sola inicio de aplicación. |
| ¿Cuándo fue obtenida? | Momento y contexto de observación autorizada | Observación reciente no demuestra que el contenido esté actualizado. |
| ¿Cuál es la fuente autoritativa? | Autoridad confirmada por dato/regla y criterio de prevalencia | Publicador, custodio, sistema de consulta y decisor pueden ser distintos. |

Ante conflicto, conservar las procedencias y pedir resolución a la autoridad
competente, o limitar/abstener la respuesta. No elegir automáticamente la fuente
con fecha más reciente, el portal más conocido o el resultado mejor posicionado
por retrieval. Para información personal también debe mantenerse el permiso del
contenido citado; trazabilidad no implica revelar rutas internas o datos restringidos.

**CONFIRMED_FROM_REPO:** source, hashes, release y versión/chunk ya permiten rastrear
evidencia sintética. **INFERRED_CONCEPT:** esa experiencia es reutilizable, pero
la autoridad institucional, vigencia normativa y permiso de uso requieren evidencia
adicional. No se modifica el objeto `source` de REST/MCP ni se propone un contrato nuevo.

## 11. Mapeo contra el dominio sintético actual

La primera columna se fundamenta en R4/R5 (**CONFIRMED_FROM_REPO**); los destinos
son candidatos de R3 o **INFERRED_CONCEPT**, no equivalencias institucionales.
Estados: `REUSABLE_CONCEPT` conserva una abstracción; `RENAME_OR_REMODEL` identifica
una diferencia semántica; `PARTIAL_MATCH` permite reutilizar solo parte;
`SYNTHETIC_ONLY` conserva un fixture exclusivo de demostración; `UNKNOWN` reconoce
que falta evidencia. Ningún estado autoriza modificar código o contratos.

| Concepto sintético actual | Concepto real candidato | Estado |
| --- | --- | --- |
| `courses`: clave, nombre, descripción y available/closed/archived | Curso y Oferta separados. Los estados actuales mezclan semántica que debe reinterpretarse según la fuente real; no hay periodo/NRC/ruta en ese schema. | RENAME_OR_REMODEL |
| `calendar/events`: course_session, announcement_deadline, general; enlace a curso/anuncio | Eventos, sesiones de oferta y ventanas de convocatoria. El vínculo sintético directo a curso no prueba el vínculo real. | PARTIAL_MATCH |
| `announcements`: título, descripción y vigencia | Publicaciones informativas o difusión de convocatorias. Una convocatoria puede necesitar condiciones y varios hitos que no caben en «anuncio». | PARTIAL_MATCH |
| `profiles`: profile_key y alias ficticios | Perfiles de demostración. No son estudiantes ni identidades institucionales reutilizables. | SYNTHETIC_ONLY |
| `progress` / `profile_courses`: asociación perfil–curso, tres estados, porcentaje y fechas | Avance académico y posible cumplimiento, que requieren separar aprendizaje, aprobación y decisión curricular. No se heredan estados ni escala. | RENAME_OR_REMODEL |
| `documents`: identidad, título, modo y artefacto Markdown | Documento identificable, condicionado a oficialidad, formato y permisos. El concepto se conserva, no la limitación institucional a Markdown. | REUSABLE_CONCEPT |
| Versiones documentales y `version_label` | Contenido/edición distinguible. La versión normativa puede no coincidir con versión técnica de release. | REUSABLE_CONCEPT |
| `document chunks` y embeddings de documentos chunked | Derivados técnicos de recuperación, no entidades académicas del CCD. Su forma futura depende de documentos y evaluación. | PARTIAL_MATCH |
| `full_document` sin fragmentación/vectorización | Artefactos completos localizables; asignar documentos reales a ese modo requiere revisión. | PARTIAL_MATCH |
| `provenance` / source, localizador, hashes y release | Procedencia verificable; conservar el principio y confirmar autoridad, vigencia y uso permitido. | REUSABLE_CONCEPT |
| Historial de conversaciones/mensajes | Historial de interacción con BanuChat; no historial académico del estudiante. | PARTIAL_MATCH |
| Sin equivalente explícito en los schemas de catálogo leídos | Ruta, Oferta, Periodo y NRC en el dominio real | UNKNOWN |
| Sin equivalente institucional confirmado | Homologación individual, dictamen de cumplimiento, emisión de insignia y disponibilidad/cupos | UNKNOWN |

El mapeo no concluye que falten funcionalidades obligatorias en el prototipo: su
alcance fue sintético. Detecta diferencias para discovery. Antes de cualquier
remodelado deben resolverse autoridad, cardinalidades y contratos; no se modifica
un contrato congelado para acomodar una hipótesis.

## 12. Diagrama conceptual Mermaid

Vista de alto nivel con cuatro ámbitos diferenciados por etiquetas y color. El
ámbito público es **candidato**, no declaración de que cada dato ya sea divulgable.
Documento puede ser público, interno o personal; su agrupación indica naturaleza
documental, no permiso. El ámbito personal muestra fronteras de consulta sin
proponer expediente local ni acceso disponible.

Todas las flechas discontinuas son **relaciones propuestas**: INFERRED_CONCEPT y
CCD_CONFIRMATION_REQUIRED. Las asociadas a personas añaden
ACCESS_AUTHORIZATION_REQUIRED. Las flechas de procedencia representan un criterio
de calidad propuesto. No hay relaciones institucionales confirmadas dibujadas.
Las cardinalidades y alternativas se explican en la sección 5, no se imponen aquí.

```mermaid
flowchart TB
    subgraph publicDomain ["Dominio público candidato: por confirmar"]
        route["Ruta"]
        course["Curso"]
        offering["Oferta o sección"]
        period["Periodo"]
        schedule["Horario y modalidad"]
        call["Convocatoria"]
    end

    subgraph documentDomain ["Dominio documental: acceso por documento"]
        document["Documento"]
        version["Versión documental"]
        rule["Regla o requisito"]
        validity["Vigencia y ámbito"]
    end

    subgraph personalDomain ["Dominio personal: acceso no autorizado"]
        student["Estudiante: frontera"]
        compliance["Cumplimiento por aclarar"]
        history["Historial por aclarar"]
    end

    subgraph provenanceDomain ["Procedencia: autoridad por confirmar"]
        evidence["Evidencia de origen"]
        authority["Autoridad del dato"]
        observation["Observación y corte"]
    end

    route -. "agruparía" .-> course
    course -. "tendría ocurrencias" .-> offering
    offering -. "se contextualizaría en" .-> period
    offering -. "se programaría con" .-> schedule
    call -. "tendría ventanas" .-> validity
    document -. "se distinguiría por" .-> version
    version -. "podría expresar" .-> rule
    rule -. "aplicaría según" .-> validity
    rule -. "podría condicionar" .-> route
    student -. "podría tener" .-> compliance
    student -. "podría consultar" .-> history
    compliance -. "dependería de" .-> rule
    offering -. "requiere respaldo" .-> evidence
    version -. "requiere respaldo" .-> evidence
    compliance -. "requiere respaldo autorizado" .-> evidence
    evidence -. "requiere autoridad" .-> authority
    evidence -. "requiere contexto" .-> observation

    style publicDomain fill:#C2E5FF,stroke:#3DADFF
    style documentDomain fill:#DCCCFF,stroke:#874FFF
    style personalDomain fill:#FFE0C2,stroke:#FF9E42
    style provenanceDomain fill:#CDF4D3,stroke:#66D575
```

El diagrama omite NRC como entidad autónoma, cupos y transacciones. No representa
servicios, tablas, llaves técnicas ni flujos de integración. Las relaciones de
progreso, homologación e insignia permanecen en el inventario y las preguntas;
no se completa el dibujo con detalles que todavía se desconocen.

## 13. Qué NO sabemos todavía

Esta lista representa **CCD_CONFIRMATION_REQUIRED**. Acceso a sistemas, contenido
restringido y datos personales añaden **ACCESS_AUTHORIZATION_REQUIRED**. Las
referencias CCD-D/CCD-Q corresponden a la matriz R3, no a documentos ya obtenidos.

| Incertidumbre | Por qué no puede cerrarse con lo disponible | Dependencia de discovery |
| --- | --- | --- |
| Sistema maestro de cursos y rutas | CP-01 solo reporta nombres/asociaciones; catálogo y autoridad no obtenidos. | D01; Q01/Q02. |
| Estructura real de ofertas | No se conoce equivalencia oferta–sección, alcance de NRC ni relación con periodos. | D06; Q07/Q08. |
| Origen real de calendario | No se ha confirmado fuente única, agregación ni criterio de precedencia. | D07/D17; Q31. |
| Origen real de convocatorias | No hay inventario completo de publicaciones, autoridad ni versiones. | D11/D16; Q29. |
| APIs disponibles | Ninguna interfaz técnica ni contrato de acceso institucional fue aportado. | D24; no inventar endpoints o asumir exportaciones. |
| Acceso a Cosmos | Su uso para inscripción/pago está reportado; acceso de BanuChat no confirmado. | D08/D09/D24; permisos distintos para orientar, leer y operar. |
| Acceso a Banner | Uso por personal administrativo no revela tablas, roles ni acceso delegado. | D24; modelos internos desconocidos. |
| Acceso a MiPortalU | Canal reportado no prueba fuente maestra ni acceso a cumplimiento personal. | D14/D24; Q25/Q28. |
| Acceso a Canvas | Uso para cursos no prueba acceso a contenidos, resultados o API. | D05/D23/D24; Q06/Q38. |
| Progreso | Unidad, estados, corte, correcciones y fuente oficial desconocidos. | D14; Q25. |
| Historial académico | Cobertura, relación entre sistemas, retención y autorización desconocidas. | D14/D15; Q26. |
| Cupos | No se confirmó existencia de dato consultable, semántica, reservas ni frescura. | D22; Q37. |
| Inscripción transaccional | No hay autorización, estados, contrato, confirmaciones ni alcance aprobado. | D08/D24; Q18/Q39. |
| Procedimiento exacto de insignia | Se reporta el tema, no sus reglas completas, autoridad, tiempos o emisión individual. | D18/D19; Q32/Q33. |
| Modelos internos | Los nombres visibles no identifican entidades técnicas de Cosmos, Banner, MiPortalU o Canvas. | Glosario y capacidades que el CCD autorice revelar; no reconstruir esquemas por conjetura. |
| Reglas diagnósticas, homologaciones y cumplimiento | Faltan versiones, ámbito poblacional, excepciones y decisiones competentes. | D10/D12/D13/D15; Q21/Q23/Q27. |
| Corpus documental real | No se obtuvieron syllabus, rúbricas, resoluciones ni anexos oficiales. | D03–D05/D21 y permisos por documento. |
| Actualización y operación | Frecuencia, responsables y conducta ante fallos no acordadas. | D25; no derivar sincronización del uso actual de N8N. |

La ausencia de una fuente no demuestra que no exista; significa que no puede
usarse como premisa. Tampoco permite reemplazarla por información sintética ni
presentar el resultado de RAG como registro institucional.

## 14. Preguntas bloqueantes para el CCD

Se conservan las prioridades de R3 y se enfocan aquí sus consecuencias conceptuales.
P0 cambia alcance, identidad de conceptos, mecanismo, fuente o autorización; P1
completa definición y cobertura; P2 ayuda a presentar y evaluar. Una P1 pasa a P0
si resulta indispensable para el alcance elegido.

| Prioridad / ID | Pregunta | Decisión que puede cambiar / evidencia necesaria |
| --- | --- | --- |
| P0 / D3-P01 | ¿Qué preguntas y usuarios se incluyen, y se excluyen transacciones/escrituras institucionales? | Límite informativo frente a operativo; lista de Q incluidas/diferidas, alineada con R3 P0-01. |
| P0 / D3-P02 | ¿Cuál es el catálogo maestro y cómo se distinguen Ruta, Curso, Oferta, Sección, Periodo y NRC? | Núcleo conceptual, identidad y cardinalidades; glosario y ejemplos autorizados. R3 P0-02. |
| P0 / D3-P03 | ¿Un curso pertenece a varias rutas y una oferta a varios cursos/periodos? ¿Qué identifica un NRC? | REL-01–REL-04; evitar restricciones uno a uno inventadas. R3 P0-02/P0-03. |
| P0 / D3-P04 | ¿Cuál es la fuente autoritativa de cada dato y qué canales de acceso existen realmente? | Consulta estructurada, documental o solo orientación; distinguir canal y fuente maestra. R3 P0-03/P0-04. |
| P0 / D3-P05 | ¿Quién autoriza lectura, copia, conservación y exposición de cada fuente? | Viabilidad de cualquier integración; autorización registrable, sin asignar responsables supuestos. R3 P0-05. |
| P0 / D3-P06 | ¿Se requiere información personal y qué fuente, identidad y permisos hacen viable su consulta? | Frontera personal y eventual autenticación; si falta, progreso/historial siguen bloqueados. R3 P0-06. |
| P0 / D3-P07 | ¿Cumplimiento, homologación y elegibilidad son estados oficiales, cálculos reglados o decisiones humanas? | Separar progreso, regla y dictamen; no delegar decisión al generador. R3 P0-07. |
| P0 / D3-P08 | ¿Cómo se determina vigencia por plan/cohorte/periodo y qué prevalece ante cambios o contradicciones? | Temporalidad, versionado, corte y comportamiento ante evidencia insuficiente. R3 P0-07/P0-08. |
| P0 / D3-P09 | ¿Qué documentos pueden utilizarse, con qué versiones, formatos y permisos? | Necesidad y límites de RAG/lookup; inventario documental recibido por canal autorizado. R3 P0-09. |
| P0 / D3-P10 | ¿Hay disponibilidad de cupos consultable y qué significado, corte y permiso tiene? | Incluir o excluir C27; no prometer datos actuales sin contrato. R3 P0-10. |
| P0 / D3-P11 | ¿Quién valida el modelo conceptual y las respuestas, y con qué criterios se aceptan? | Cierre verificable de discovery y evaluación posterior; sin confundir revisión técnica con aprobación institucional. R3 P0-11. |
| P1 / D3-P12 | ¿Cómo funcionan requisitos, solicitud y emisión de insignia, y qué excepciones existen? | Distinguir definición y procedimiento de estado personal; elevar a P0 si entra en el núcleo del alcance. |
| P1 / D3-P13 | ¿Qué particularidades tienen diagnósticos, intensivos/vacacionales y transiciones de planes? | Evitar multiplicar entidades o aplicar reglas ordinarias a casos distintos. |
| P1 / D3-P14 | ¿Dónde están syllabus, guías y rúbricas, y quién mantiene sus versiones y canales de soporte? | Completar clasificación documental y orientación permitida; elevar lo imprescindible a P0. |
| P2 / D3-P15 | ¿Qué vocabulario y nombres alternativos usan estudiantes y personal para estas preguntas? | Revisar después lenguaje del router y presentación sin cambiar identidad de los conceptos. |
| P2 / D3-P16 | ¿Qué presentación de fechas, fuentes y límites de respuesta es más comprensible? | Criterios de usabilidad y ejemplos permitidos, sin generar ahora benchmark ni casos M9. |

Registrar la respuesta, autoridad que la valida, referencia autorizada, fecha,
alcance y asuntos abiertos. Una respuesta informal no demuestra acceso técnico;
una aprobación técnica no sustituye aprobación académica/institucional. No se
envió este documento ni se contactó al CCD como parte de D3.

## 15. Implicaciones para arquitectura

Evaluación provisional de reutilización, no decisión de implementación.
`LIKELY_REUSABLE` identifica una separación útil; `REVIEW_REQUIRED` exige revisar
su semántica/adecuación; `DEPENDENT_ON_DISCOVERY` requiere fuentes y tareas definidas;
`NOT_JUSTIFIED_YET` indica que aún no hay evidencia para añadir la capacidad.
Los hechos actuales de la segunda columna son **CONFIRMED_FROM_REPO**; los estados
y conclusiones futuras son propuestas, no aprobaciones institucionales.

| Elemento | Estado actual | Evaluación provisional | Justificación y dependencia |
| --- | --- | --- | --- |
| Mobile → REST | Frontera implementada; perfiles sintéticos sin autenticación institucional | LIKELY_REUSABLE | Separar interfaz y backend no depende de confundir Curso con Oferta. Identidad, permisos y necesidades nuevas pueden exigir revisar contratos, solo después de autorización. |
| Intent Router | Determinista, con rutas sobre el dominio sintético | REVIEW_REQUIRED | La separación de mecanismos es útil, pero vocabulario, intenciones y parámetros no acreditan dominio real. Validar consultas prioritarias antes de ampliar el catálogo. |
| Fast paths | Consultas estructuradas y renderers sobre datos sintéticos | LIKELY_REUSABLE | El patrón es apropiado para datos exactos si existen fuentes autorizadas. No se heredan servicios, estados ni cardinalidades como contrato institucional. |
| Document RAG | Fallback directo con Ollama y retrieval exacto; sin Agent/MCP | DEPENDENT_ON_DISCOVERY | Adecuación depende de corpus autorizado, formatos, reglas de acceso y preguntas. No resuelve estados personales ni reemplaza una fuente operacional ausente. |
| Document Lookup | Localización exacta y entrega de artefacto por REST | LIKELY_REUSABLE | Separar entrega de documento de interpretación sigue siendo útil. Identidad, búsqueda, formatos, versiones y permisos reales requieren revisión. |
| PostgreSQL | Persistencia del prototipo y representación procesada de `/data/synthetic` | REVIEW_REQUIRED | Es un activo técnico, pero discovery no determina si los datos reales se replican, consultan externamente o solo se referencian. No decidir modelo físico ni nueva persistencia. |
| pgvector | Vectores sintéticos; búsqueda exacta por coseno | DEPENDENT_ON_DISCOVERY | Su necesidad futura depende de que haya recuperación semántica autorizada y evaluable. No implica cambiar embeddings, fragmentación o índices ahora. |
| N8N | Orquesta manualmente ingesta asíncrona; fuera del chat síncrono | REVIEW_REQUIRED | La separación de orquestación y lógica puede conservarse. Fuentes, cambios, acceso y operación reales definirán si hace falta otro flujo y con qué frecuencia. |
| Nuevos conectores/sincronizaciones institucionales | Sin acceso institucional confirmado | NOT_JUSTIFIED_YET | No se deducen APIs, webhooks, exportaciones ni horarios de sincronización de las menciones a plataformas. |
| Agent/ReAct y MCP aplicados al dominio real | Objetivo pendiente; MCP solo contratado, sin ejecutable | DEPENDENT_ON_DISCOVERY | La necesidad de selección de herramientas debe justificarse con tareas y fuentes; la pausa no equivale a descarte. |

No hay una incompatibilidad código–contrato que esta tarea pretenda corregir.
La diferencia entre modelo sintético y candidato real es una dependencia de
discovery. Cualquier conflicto futuro con SQL, REST o MCP congelados debe reportarse
antes de implementar, sin alterar contratos para hacer encajar la hipótesis.

## 16. Criterio de salida de discovery

La salida se evalúa **por alcance y dominio**, no por haber completado todas las
celdas con supuestos. Los P0 pertinentes deben resolverse con evidencia revisable,
o excluir explícitamente del alcance la capacidad bloqueada. Fuentes, autoridad,
conceptos, relaciones, vigencia, permisos y criterios de respuesta deben quedar
validados; las incertidumbres restantes se conservan como tales.

| Antes de autorizar… | Qué debe conocerse y quedar registrado | Qué no basta |
| --- | --- | --- |
| Modelo lógico | Preguntas priorizadas, glosario validado, identidad y relaciones/cardinalidades pertinentes, reglas temporales, fuentes y fronteras de acceso; revisión conceptual con autoridad identificada. | Este D3, diagramas plausibles o copiar el modelo sintético. |
| SQL | Modelo lógico previamente autorizado, decisiones de acceso/persistencia, análisis de impacto sobre contratos y aprobación específica para modificar el SQL congelado. | Considerar que usar PostgreSQL en la demo obliga a copiar datos institucionales a sus tablas. |
| Dataset v2 | Decidir primero si v2 sería sintético de desarrollo o un corpus real separado; propósito, procedencia, alcance, versión y permisos correspondientes. Preservar v1. | Renombrar datos reales como sintéticos, reescribir v1 o inventar contenido para cubrir vacíos. Ningún dato real entra en `/data/synthetic`. |
| RAG real | Corpus documental obtenido con autorización, formatos y versiones identificados, acceso por documento, preguntas que requieren interpretación, gold/protocolo y criterios de evaluación acordados. | Los 63 drafts M9, nombres de cursos o publicaciones sin originales ni autoridad. |
| Integración | Fuente y canal técnico confirmados, contrato de uso, permisos, vigencia/corte, responsabilidades y conducta ante error/conflicto; cambio explícito del alcance que hoy prohíbe integración real. | Mención pública de Cosmos/Banner/MiPortalU/Canvas, acceso humano a un portal o supuesto de API. |
| Autenticación | Necesidad de usuarios reales confirmada, identidad disponible, roles y autorización por dato/operación, responsabilidades, tratamiento y retención de datos definidos; alcance y diseño posterior expresamente autorizados. | Selección de perfil sintético, conocer una clave o proponer una tecnología sin contrato institucional. |

La validación del dominio por el CCD, la reconciliación con el director del proyecto
y la autorización técnica de implementación son decisiones distintas. Deben tener
evidencia y responsables confirmados, sin atribuir aprobaciones a este documento.
Si no hay acceso a información personal, es posible discutir un alcance de
orientación general, sin presentarlo como decisión ya aprobada.

D3 termina en este modelo conceptual. Permanecen las pausas del re-baseline sobre
expansión M9 P-064+, RAGAS final, tuning, embeddings/chunking, índices aproximados,
SQL adaptado, integración real y Agent/MCP dependiente del dominio desconocido.
No se avanza al modelo lógico, dataset v2, autenticación, SQL ni implementación.
