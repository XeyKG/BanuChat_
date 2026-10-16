# BanuChat — Inventario y matriz de información del CCD v0.1

## 1. Objetivo del levantamiento

Validar con el CCD qué preguntas debería responder BanuChat, para qué usuarios,
con qué fuente autoritativa, bajo qué vigencia y permisos, y mediante qué mecanismo
conceptual. Es un instrumento de reunión y registro de requisitos candidatos;
no es un catálogo de funcionalidades prometidas ni una especificación de integración.

Versión: **0.1**, fecha **2026-10-15**. Base técnica inspeccionada:
`d82fff84d94ca8121cd5c66bcea3b56efd0127fd`, más el
[re-baseline académico y técnico](../academic/banuchat-rebaseline-2026-10.md)
presente en el árbol de trabajo. También se leyeron [AGENTS.md](../../AGENTS.md),
[README](../../README.md) y [arquitectura](../arquitectura.md).
El prototipo funcional continúa siendo exclusivamente sintético. Este documento
no modifica implementación, SQL, contratos, corpus ni decisiones congeladas.

**Una fuente pública informa una hipótesis. No sustituye automáticamente la fuente
institucional autoritativa.** La autorización de esta tarea permite documentar el
contexto suministrado; no habilita recopilar datos reales, consultar sitios/APIs,
hacer scraping ni incorporar contenido institucional al corpus funcional.

### Procedencia del contexto preliminar

Los identificadores CP siguientes apuntan exclusivamente al resumen aportado por
el equipo en la solicitud «Inventario y matriz de información real del CCD v0.1».
No son fuentes independientes ni documentos oficiales obtenidos. No se suministraron
URLs, copias originales, fechas de publicación, periodos de aplicación ni evidencia
de vigencia; esos campos permanecen pendientes. No se navegó ni se contactó al CCD.

| Referencia | Información reportada por el equipo | Límite de la referencia |
| --- | --- | --- |
| CP-01 | Tres rutas y cursos identificados públicamente, transcritos debajo. | No acredita catálogo completo, orden obligatorio, equivalencias, población aplicable ni vigencia actual. |
| CP-02 | Publicaciones de oferta con NRC, curso, modalidad, horario, periodo, inicio/final e inscripción/pago. | No se aportó una publicación concreta ni se confirmó fuente maestra, cupos o actualización. |
| CP-03 | Uso público reportado de Cosmos para inscripción/pago, MiPortalU para servicios estudiantiles/cumplimiento, Banner por personal administrativo para determinadas consultas y Canvas para cursos. | No confirma APIs, exportaciones, SSO, autoridad por dato, permisos ni acceso técnico de BanuChat. |
| CP-04 | Publicaciones/reglas sobre homologaciones desde planes anteriores, diagnósticos, convocatorias, vacacionales/intensivos, cumplimiento de rutas e insignia digital. | No se dispone de textos, excepciones, versiones, resoluciones ni procedimiento interno completo. |

| Ruta reportada en CP-01 | Cursos identificados en el resumen, sin afirmar exhaustividad |
| --- | --- |
| Ruta 1 — Competencias Digitales Básicas | Interacción Digital. |
| Ruta 2 — Analítica y Contenido Digital | Habilidades de Analítica Digital; Marca Personal Digital; Creación de Contenidos Digitales. |
| Ruta 3 — Tecnología Transformativa | IA Generativa; Marco Legal Digital; Cuidado y Bienestar Digital. |

Puede considerarse **reportado como público** ese contexto de rutas, nombres,
campos de oferta, canales y temas de reglas. No puede considerarse aún evidencia
pública verificable en este artefacto ni información vigente lista para responder
consultas reales. La fuente maestra de cursos, APIs, progreso/historial individual,
modelo de cupos, procedimiento de insignia, syllabus/guías, rúbricas, resoluciones,
responsables y frecuencia de actualización siguen sin confirmarse.

## 2. Convenciones de estado

| Estado | Significado y condición de uso |
| --- | --- |
| PUBLIC_EVIDENCE | Existe una referencia pública identificable y examinada, con localizador, procedencia y fecha/versión registradas. Prueba solo lo observado, no autoridad interna ni permiso de integración. Ninguna fila alcanza este estado en v0.1. |
| PUBLIC_PRELIMINARY | El contexto del equipo reporta información pública, pero falta la evidencia original o su comprobación y vigencia. Se usa para CP-01–CP-04. |
| CCD_CONFIRMATION_REQUIRED | El CCD debe confirmar significado, alcance, población, reglas, vigencia o fuente competente. No asigna de antemano un responsable. |
| INTERNAL_SOURCE_REQUIRED | La respuesta requiere identificar u obtener por un canal autorizado una fuente interna o maestra aún no disponible. No presupone que exista un documento con el nombre sugerido. |
| ACCESS_AUTHORIZATION_REQUIRED | Falta autorización explícita para consultar, usar, conservar o exponer el dato. Autenticarse en un portal no equivale a autorizar a BanuChat a usarlo. |
| OUT_OF_SCOPE_CANDIDATE | La petición podría exceder el alcance viable, especialmente si implica transacciones o cambios institucionales. Es una propuesta de exclusión a discutir, no un descarte aprobado. |

Los estados son acumulables, separados con `;`: evidencia, confirmación, acceso y
alcance son dimensiones distintas. Obtener evidencia pública no elimina las demás
dependencias. Las frecuencias y formatos de la matriz son **hipótesis de trabajo**,
no hechos institucionales ni acuerdos de actualización. «Sin fuente confirmada»
significa ausencia de evidencia disponible, no inexistencia demostrada.

La sensibilidad es una clasificación preliminar para diseñar preguntas de acceso,
no una clasificación legal. Los tipos de usuario son roles candidatos por validar.
«No, si público» condiciona la respuesta a que el CCD confirme que puede divulgarse;
«Sí + autorización» es un requisito propuesto para datos personales, no una afirmación
de que exista autenticación integrada. No se solicitan credenciales en la reunión.

| Mecanismo candidato permitido | Interpretación conceptual |
| --- | --- |
| STRUCTURED_QUERY | Selección, filtrado o cálculo sobre datos y reglas explícitas autorizadas; no presupone SQL, API ni una tecnología de persistencia. |
| DOCUMENT_RAG | Explicación sustentada en pasajes de documentos autorizados, identificando versión y límites. No decide por sí sola derechos, elegibilidad o estados personales. |
| DOCUMENT_LOOKUP | Localizar o entregar el documento correcto y su versión, respetando acceso; no requiere generar una respuesta. |
| STATIC_GUIDANCE | Orientación validada hacia un procedimiento o canal. «Static» describe el mecanismo, no una regla eterna: requiere revisión de vigencia. |
| UNRESOLVED | Faltan datos para elegir mecanismo o la petición implica una acción no cubierta por los mecanismos de consulta. |

Las combinaciones con `+` separan funciones complementarias, no fijan una cadena de
ejecución. Todos los mecanismos permanecen candidatos hasta resolver dependencias.

## 3. Matriz de preguntas

Las preguntas CCD-Q son candidatos de levantamiento, no preguntas nuevas de M9 ni
un benchmark con respuestas de referencia. La columna «fuente pública conocida»
usa las referencias CP de la sección 1; ninguna equivale a una URL verificada.

| ID | dominio | pregunta que BanuChat debería poder responder | tipo de usuario | respuesta/dato necesario | fuente pública conocida | fuente autoritativa a confirmar | formato probable | frecuencia de cambio | sensibilidad | requiere autenticación | mecanismo candidato | estado | pregunta para el CCD |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CCD-Q01 | Estructura de rutas | ¿Qué rutas existen y qué finalidad tiene cada una? | Interesado/estudiante | Nombre, descripción, versión y población aplicable | CP-01; original no aportado | Catálogo o definición de rutas validada por autoridad por identificar | Catálogo y descripción; no confirmado | Por revisión curricular; por confirmar | General, publicación por confirmar | No, si público | STRUCTURED_QUERY + STATIC_GUIDANCE | PUBLIC_PRELIMINARY; CCD_CONFIRMATION_REQUIRED | ¿Son estas tres rutas la estructura vigente y para quién aplica? |
| CCD-Q02 | Cursos por ruta | ¿Qué cursos pertenecen a cada ruta? | Estudiante/orientador | Catálogo completo y relación curso–ruta con vigencia | CP-01; lista posiblemente parcial | Fuente maestra de cursos y rutas por identificar | Listado estructurado; no confirmado | Por revisión; por confirmar | General, publicación por confirmar | No, si público | STRUCTURED_QUERY | PUBLIC_PRELIMINARY; CCD_CONFIRMATION_REQUIRED; INTERNAL_SOURCE_REQUIRED | ¿Cuál es el catálogo maestro y qué nombres o asociaciones han cambiado? |
| CCD-Q03 | Secuencia de rutas | ¿Hay orden, opciones o prerrequisitos entre cursos y rutas? | Estudiante | Reglas, alternativas, población, excepciones y vigencia | CP-04: cumplimiento, sin detalle | Reglamento/definición curricular competente por identificar | Documento de reglas; no confirmado | Por revisión y población; por confirmar | General normativa | No, si público | DOCUMENT_RAG + DOCUMENT_LOOKUP | PUBLIC_PRELIMINARY; CCD_CONFIRMATION_REQUIRED | ¿El orden es obligatorio y existen diferencias por plan o cohorte? |
| CCD-Q04 | Contenidos | ¿Qué temas y resultados de aprendizaje cubre un curso? | Interesado/estudiante | Syllabus, versión, objetivos y temario | Sin syllabus confirmado; CP-01 solo nombres | Syllabus aprobado y custodio por identificar | Documento; formato desconocido | Por versión del curso; por confirmar | Académica; acceso por confirmar | Por confirmar | DOCUMENT_RAG + DOCUMENT_LOOKUP | CCD_CONFIRMATION_REQUIRED; INTERNAL_SOURCE_REQUIRED | ¿Qué syllabus puede consultarse y cuál es su versión vigente? |
| CCD-Q05 | Evaluación del curso | ¿Cómo se evalúa el curso y qué rúbrica aplica? | Estudiante | Criterios, ponderaciones, rúbricas y alcance | Sin rúbricas confirmadas | Rúbrica/guía de evaluación competente por identificar | Documento o recurso de curso; desconocido | Por curso/edición; por confirmar | Académica potencialmente restringida | Por confirmar | DOCUMENT_RAG + DOCUMENT_LOOKUP | INTERNAL_SOURCE_REQUIRED; ACCESS_AUTHORIZATION_REQUIRED | ¿Las rúbricas son divulgables y cambian entre ofertas? |
| CCD-Q06 | Guías y materiales | ¿Dónde encuentro la guía o material oficial de un curso? | Estudiante | Documento o ubicación autorizada, versión y acceso | CP-03: Canvas; guías no confirmadas | Repositorio autorizado y custodio por identificar | Documento/recurso; desconocido | Por edición; por confirmar | Académica potencialmente restringida | Por confirmar | DOCUMENT_LOOKUP + STATIC_GUIDANCE | PUBLIC_PRELIMINARY; INTERNAL_SOURCE_REQUIRED; ACCESS_AUTHORIZATION_REQUIRED | ¿Qué materiales puede localizar BanuChat y cuáles solo deben consultarse en el curso? |
| CCD-Q07 | Oferta vigente | ¿Qué cursos se ofrecen en el periodo consultado? | Estudiante/interesado | Ofertas activas por periodo, curso, fechas, estado y corte | CP-02; publicación no aportada | Fuente oficial de oferta por periodo por identificar | Listado o publicación; desconocido | Por periodo y cambios; por confirmar | General, publicación por confirmar | No, si público | STRUCTURED_QUERY | PUBLIC_PRELIMINARY; CCD_CONFIRMATION_REQUIRED; INTERNAL_SOURCE_REQUIRED | ¿Qué fuente prevalece y cómo se distingue oferta vigente de catálogo general? |
| CCD-Q08 | NRC | ¿Cuál es el NRC de esta oferta y para qué periodo sirve? | Estudiante | NRC, curso, oferta, periodo y significado del identificador | CP-02 | Registro competente de ofertas/NRC por identificar | Dato estructurado; no confirmado | Por oferta/periodo; por confirmar | General, publicación por confirmar | No, si público | STRUCTURED_QUERY | PUBLIC_PRELIMINARY; CCD_CONFIRMATION_REQUIRED | ¿Un NRC se reutiliza y qué contexto evita confundir ofertas distintas? |
| CCD-Q09 | Horarios | ¿Qué días y horas tiene esta oferta? | Estudiante | Días, horas, zona horaria, excepciones y última actualización | CP-02 | Horario oficial por oferta por identificar | Listado/calendario; desconocido | Por programación y ajustes; por confirmar | General, publicación por confirmar | No, si público | STRUCTURED_QUERY | PUBLIC_PRELIMINARY; CCD_CONFIRMATION_REQUIRED | ¿Dónde se reflejan cambios, cancelaciones y diferencias entre publicación y operación? |
| CCD-Q10 | Modalidad | ¿La oferta es presencial, virtual u otra modalidad? | Interesado/estudiante | Modalidad y condiciones de participación definidas por fuente | CP-02 | Oferta oficial y definición de modalidades por identificar | Campo y guía; no confirmado | Por oferta y cambios; por confirmar | General, publicación por confirmar | No, si público | STRUCTURED_QUERY + STATIC_GUIDANCE | PUBLIC_PRELIMINARY; CCD_CONFIRMATION_REQUIRED | ¿Qué modalidades existen realmente y qué condiciones deben comunicarse? |
| CCD-Q11 | Inicio y final | ¿Cuándo empieza y termina esta oferta? | Estudiante | Fechas por oferta/periodo y cambios vigentes | CP-02 | Programación oficial por identificar | Fechas estructuradas; no confirmado | Por oferta y ajustes; por confirmar | General, publicación por confirmar | No, si público | STRUCTURED_QUERY | PUBLIC_PRELIMINARY; CCD_CONFIRMATION_REQUIRED | ¿Cómo se notifican cambios y qué fecha prevalece? |
| CCD-Q12 | Inscripción: orientación | ¿Dónde y cómo puedo inscribirme? | Estudiante/interesado | Pasos y canal oficial, condiciones generales y vigencia | CP-02; CP-03: Cosmos | Procedimiento de inscripción validado por autoridad por identificar | Guía y canal; desconocido | Por cambio de procedimiento; por confirmar | General | No para guía pública; operación por confirmar | STATIC_GUIDANCE + DOCUMENT_LOOKUP | PUBLIC_PRELIMINARY; CCD_CONFIRMATION_REQUIRED | ¿BanuChat debe orientar al canal o hay otro alcance autorizado? |
| CCD-Q13 | Ventanas de inscripción | ¿Hasta cuándo puedo inscribirme en esta oferta? | Estudiante | Apertura/cierre, zona horaria, oferta y excepciones | CP-02; fechas concretas no aportadas | Calendario de inscripción competente por identificar | Fechas/publicación; desconocido | Por oferta y prórrogas; por confirmar | General, publicación por confirmar | No, si público | STRUCTURED_QUERY | PUBLIC_PRELIMINARY; CCD_CONFIRMATION_REQUIRED | ¿Cómo se publican prórrogas y cierres anticipados? |
| CCD-Q14 | Requisitos de inscripción | ¿Qué requisitos generales tiene la inscripción? | Interesado/estudiante | Requisitos por oferta/población, excepciones y norma | CP-02/CP-04; detalle no aportado | Reglas oficiales de inscripción por identificar | Documento de reglas; desconocido | Por normativa/oferta; por confirmar | General normativa | No, si público | DOCUMENT_RAG + DOCUMENT_LOOKUP | PUBLIC_PRELIMINARY; CCD_CONFIRMATION_REQUIRED | ¿Qué reglas son generales y cuáles exigen verificar el caso personal? |
| CCD-Q15 | Pago: orientación | ¿Qué pasos y canal oficial debo usar para pagar? | Estudiante/interesado | Guía vigente, canal y orientación ante incidencias | CP-03: Cosmos para pago | Procedimiento competente de pago por identificar | Guía; desconocido | Por cambio de procedimiento; por confirmar | General; sin datos de pago personales | No para guía pública | STATIC_GUIDANCE + DOCUMENT_LOOKUP | PUBLIC_PRELIMINARY; CCD_CONFIRMATION_REQUIRED | ¿Qué orientación puede darse sin iniciar ni confirmar un pago? |
| CCD-Q16 | Valores y plazos de pago | ¿Qué valor y plazo aplican a esta oferta? | Estudiante/interesado | Valor publicado, condiciones, vigencia y plazo | CP-02: pago; valores no aportados | Publicación o regla competente de valores por identificar | Dato publicado y condiciones; desconocido | Por periodo/oferta; por confirmar | General o condicionada; por confirmar | Por confirmar; depende de personalización | STRUCTURED_QUERY + DOCUMENT_LOOKUP | PUBLIC_PRELIMINARY; CCD_CONFIRMATION_REQUIRED; INTERNAL_SOURCE_REQUIRED | ¿El valor es público y uniforme o depende de condiciones individuales? |
| CCD-Q17 | Estado personal de pago | ¿Mi pago quedó aplicado a esta inscripción? | Estudiante titular | Estado personal confirmado, referencia y momento de corte | Ninguna fuente personal; CP-03 solo canal | Registro autoritativo de pago e inscripción por identificar | Registro personal; desconocido | Por operación; cadencia desconocida | Personal financiera | Sí + autorización | UNRESOLVED | INTERNAL_SOURCE_REQUIRED; ACCESS_AUTHORIZATION_REQUIRED; OUT_OF_SCOPE_CANDIDATE | ¿Se autorizaría esa consulta o debe remitirse al canal institucional? |
| CCD-Q18 | Transacción de inscripción | ¿Puedes inscribirme, retirarme o cambiar mi inscripción? | Estudiante titular | Acción, permisos, confirmación y manejo de errores | CP-03 no acredita acceso transaccional | Sistema y procedimiento autorizados por identificar | Operación; contrato desconocido | Por transacción | Personal y transaccional | Sí + autorización | UNRESOLVED | ACCESS_AUTHORIZATION_REQUIRED; OUT_OF_SCOPE_CANDIDATE | ¿Se excluyen explícitamente las transacciones del alcance de BanuChat? |
| CCD-Q19 | Diagnóstico: finalidad | ¿Para qué sirve la prueba diagnóstica? | Estudiante/interesado | Propósito, destinatarios y efectos definidos por norma | CP-04 | Documento vigente de diagnóstico por identificar | Documento/guía; desconocido | Por revisión; por confirmar | General normativa | No, si público | DOCUMENT_RAG + DOCUMENT_LOOKUP | PUBLIC_PRELIMINARY; CCD_CONFIRMATION_REQUIRED | ¿Qué efectos tiene y cuáles no se deben inferir de presentarla? |
| CCD-Q20 | Fechas diagnósticas | ¿Cuándo es el próximo diagnóstico y cuándo se cierra la inscripción? | Estudiante | Convocatoria, fechas, población, vigencia y modificaciones | CP-04; fechas no aportadas | Convocatoria/calendario competente por identificar | Publicación y fechas; desconocido | Por convocatoria y ajustes; por confirmar | General, publicación por confirmar | No, si público | STRUCTURED_QUERY + DOCUMENT_LOOKUP | PUBLIC_PRELIMINARY; CCD_CONFIRMATION_REQUIRED | ¿Qué publicación fija fechas y cómo se detectan prórrogas o cancelaciones? |
| CCD-Q21 | Reglas diagnósticas | ¿Qué requisitos, intentos y criterios aplican al diagnóstico? | Estudiante | Reglas, efectos, excepciones y población aplicable | CP-04; reglas exactas no aportadas | Reglamento/convocatoria competente por identificar | Documento de reglas; desconocido | Por versión/convocatoria; por confirmar | General normativa | No, si público | DOCUMENT_RAG + DOCUMENT_LOOKUP | PUBLIC_PRELIMINARY; CCD_CONFIRMATION_REQUIRED; INTERNAL_SOURCE_REQUIRED | ¿Qué reglas varían por convocatoria, plan o cohorte? |
| CCD-Q22 | Resultado diagnóstico | ¿Cuál fue mi resultado y qué me reconoce? | Estudiante titular | Resultado personal y decisión aplicable, con procedencia | Sin fuente personal confirmada | Registro de resultado y decisión autorizada por identificar | Registro personal y soporte; desconocido | Por resultado/corrección; por confirmar | Personal académica | Sí + autorización | UNRESOLVED | INTERNAL_SOURCE_REQUIRED; ACCESS_AUTHORIZATION_REQUIRED | ¿Quién confirma el resultado y su efecto curricular, y se permite consultarlo? |
| CCD-Q23 | Homologación: reglas | ¿Qué cursos de planes anteriores pueden homologarse? | Estudiante/orientador | Equivalencias, condiciones, planes, fechas y excepciones | CP-04 | Norma y equivalencias aprobadas por autoridad por identificar | Documento/listado; desconocido | Por revisión o transición; por confirmar | General normativa | No, si público | STRUCTURED_QUERY + DOCUMENT_RAG + DOCUMENT_LOOKUP | PUBLIC_PRELIMINARY; CCD_CONFIRMATION_REQUIRED; INTERNAL_SOURCE_REQUIRED | ¿La equivalencia es automática o requiere una decisión individual? |
| CCD-Q24 | Homologación personal | ¿Mi curso anterior está homologado o soy elegible? | Estudiante titular | Historial y decisión individual bajo norma aplicable | Sin fuente personal; CP-04 solo tema general | Registro de homologación y autoridad decisora por identificar | Registro personal y soporte; desconocido | Por solicitud/decisión/corrección | Personal académica | Sí + autorización | UNRESOLVED | INTERNAL_SOURCE_REQUIRED; ACCESS_AUTHORIZATION_REQUIRED | ¿BanuChat podría consultar decisiones existentes o solo explicar el trámite? |
| CCD-Q25 | Progreso personal | ¿Qué cursos o rutas he completado y qué me falta? | Estudiante titular | Estado oficial por persona, corte y reglas aplicables | CP-03: MiPortalU/cumplimiento; sin datos personales | Fuente maestra de progreso por identificar; portal no asumido como maestro | Registro personal; desconocido | Por resultado/reconocimiento; cadencia desconocida | Personal académica | Sí + autorización | UNRESOLVED | PUBLIC_PRELIMINARY; INTERNAL_SOURCE_REQUIRED; ACCESS_AUTHORIZATION_REQUIRED | ¿Dónde se registra el progreso autoritativo y puede consultarlo BanuChat? |
| CCD-Q26 | Historial académico | ¿Qué cursos, diagnósticos y homologaciones constan en mi historial? | Estudiante titular | Eventos y decisiones históricos, correcciones y alcance temporal | Sin fuente personal; CP-03 solo sistemas mencionados | Registro histórico competente por identificar | Registro personal; desconocido | Por evento/corrección; por confirmar | Personal académica | Sí + autorización | UNRESOLVED | INTERNAL_SOURCE_REQUIRED; ACCESS_AUTHORIZATION_REQUIRED | ¿Qué historial existe, con qué acceso y retención, y cuál se puede mostrar? |
| CCD-Q27 | Cumplimiento: regla general | ¿Qué significa cumplir las rutas para mi plan o cohorte? | Estudiante/orientador | Reglas por plan/cohorte, versión y excepciones, sin expediente | CP-04 | Norma curricular y autoridad interpretativa por identificar | Documento/reglas; desconocido | Por revisión/transición; por confirmar | General normativa | No, si norma pública y consulta no personal | DOCUMENT_RAG + DOCUMENT_LOOKUP | PUBLIC_PRELIMINARY; CCD_CONFIRMATION_REQUIRED; INTERNAL_SOURCE_REQUIRED | ¿Qué variaciones por plan/cohorte deben distinguirse y quién resuelve ambigüedades? |
| CCD-Q28 | Cumplimiento individual | ¿Ya cumplí el requisito curricular y puedo solicitar el reconocimiento? | Estudiante titular | Dictamen/estado oficial y evidencia personal aplicable | CP-03/CP-04; sin estado individual | Autoridad y registro de cumplimiento por identificar | Registro personal y soporte; desconocido | Por actualización/decisión | Personal académica | Sí + autorización | UNRESOLVED | INTERNAL_SOURCE_REQUIRED; ACCESS_AUTHORIZATION_REQUIRED | ¿Existe un dictamen consultable o requeriría una evaluación humana que no puede delegarse? |
| CCD-Q29 | Convocatorias | ¿Qué convocatorias están abiertas y a quiénes se dirigen? | Interesado/estudiante | Objeto, población, condiciones, fechas y estado | CP-04 | Publicación oficial de cada convocatoria por identificar | Documento y fechas; desconocido | Por convocatoria/modificación | General, publicación por confirmar | No, si público | STRUCTURED_QUERY + DOCUMENT_RAG + DOCUMENT_LOOKUP | PUBLIC_PRELIMINARY; CCD_CONFIRMATION_REQUIRED | ¿Cuál es la fuente completa y cómo se distinguen versiones vencidas o reemplazadas? |
| CCD-Q30 | Vacacionales/intensivos | ¿Qué oferta vacacional o intensiva existe y qué condiciones tiene? | Estudiante | Oferta, periodo, horarios, requisitos y reglas particulares | CP-04; CP-02 | Programación y condiciones competentes por identificar | Listado y documento; desconocido | Por periodo/oferta y ajustes | General, publicación por confirmar | No, si público | STRUCTURED_QUERY + DOCUMENT_RAG | PUBLIC_PRELIMINARY; CCD_CONFIRMATION_REQUIRED | ¿Qué cambia respecto de la oferta ordinaria y dónde se publica? |
| CCD-Q31 | Calendario | ¿Qué fechas relevantes siguen en el periodo consultado? | Estudiante/orientador | Eventos con tipo, fecha, alcance, vigencia y origen | CP-02/CP-04; sin calendario maestro | Fuente o jerarquía oficial de calendarios por identificar | Agenda/publicaciones; desconocido | Por evento y ajustes; por confirmar | General, publicación por confirmar | No, si público | STRUCTURED_QUERY + DOCUMENT_LOOKUP | PUBLIC_PRELIMINARY; CCD_CONFIRMATION_REQUIRED; INTERNAL_SOURCE_REQUIRED | ¿Hay calendario único o se consolidan fuentes, y cuál prevalece ante conflictos? |
| CCD-Q32 | Insignia: procedimiento | ¿Qué es la insignia y cómo se obtiene o solicita? | Estudiante/interesado | Requisitos, pasos, autoridad emisora, plazos y vigencia | CP-04; procedimiento interno no confirmado | Procedimiento oficial de insignia por identificar | Documento/guía; desconocido | Por revisión; por confirmar | General y eventualmente interna | Por confirmar para detalle interno | DOCUMENT_RAG + DOCUMENT_LOOKUP + STATIC_GUIDANCE | PUBLIC_PRELIMINARY; CCD_CONFIRMATION_REQUIRED; INTERNAL_SOURCE_REQUIRED | ¿La entrega es automática o solicitada y qué información puede divulgarse? |
| CCD-Q33 | Insignia personal | ¿Mi insignia fue emitida o por qué está pendiente? | Estudiante titular | Estado de emisión y motivo autorizado | Sin fuente personal confirmada | Registro y autoridad emisora por identificar | Registro personal; desconocido | Por emisión/corrección | Personal académica | Sí + autorización | UNRESOLVED | INTERNAL_SOURCE_REQUIRED; ACCESS_AUTHORIZATION_REQUIRED | ¿Existe estado consultable y se permite comunicar motivos individuales? |
| CCD-Q34 | Soporte | ¿A qué canal oficial acudo para una duda o inconsistencia? | Estudiante/interesado | Canal por tipo de caso, horario y alcance de atención | Sin directorio confirmado; no se inventan contactos | Directorio/protocolo de soporte por identificar | Directorio/guía; desconocido | Por cambio de canal/horario | General si canal institucional público | No para orientación pública | STATIC_GUIDANCE + DOCUMENT_LOOKUP | CCD_CONFIRMATION_REQUIRED | ¿Qué canales y escalamiento deben usarse sin recibir expedientes personales? |
| CCD-Q35 | Documentos oficiales | ¿Dónde está la norma, guía o resolución vigente sobre este tema? | Estudiante/orientador | Documento exacto, versión, emisor, vigencia y permiso de acceso | CP-04 menciona reglas; resoluciones no obtenidas | Repositorio documental y autoridad por identificar | Documento; formato desconocido | Por publicación/reemplazo | Mixta; por documento | Por confirmar por documento | DOCUMENT_LOOKUP | CCD_CONFIRMATION_REQUIRED; INTERNAL_SOURCE_REQUIRED; ACCESS_AUTHORIZATION_REQUIRED | ¿Qué documentos son oficiales, públicos o internos y cuál es su versión aplicable? |
| CCD-Q36 | Requisitos y reglas temporales | ¿Qué regla aplica a este periodo, plan o cohorte? | Estudiante/orientador | Norma, ámbito temporal/poblacional, excepciones y reemplazos | CP-04 | Norma competente e interpretación validada por identificar | Documento y metadatos; desconocido | Por revisión/transición | General normativa; casos individuales separados | No, si público y sin expediente | DOCUMENT_RAG + DOCUMENT_LOOKUP | PUBLIC_PRELIMINARY; CCD_CONFIRMATION_REQUIRED; INTERNAL_SOURCE_REQUIRED | ¿Cómo se determina vigencia y qué hacer si dos documentos se contradicen? |
| CCD-Q37 | Cupos | ¿Cuántos cupos quedan ahora en este NRC? | Estudiante | Disponibilidad autorizada, significado, reservas y momento de corte | Ninguna: no hay fuente ni modelo de cupos confirmados | Fuente operacional de cupos por identificar, si existe y es accesible | Desconocido | Desconocida; no prometer tiempo real | Operacional; visibilidad por confirmar | Por confirmar | UNRESOLVED | CCD_CONFIRMATION_REQUIRED; INTERNAL_SOURCE_REQUIRED; ACCESS_AUTHORIZATION_REQUIRED; OUT_OF_SCOPE_CANDIDATE | ¿Existe dato de cupos consultable, qué significa y qué frescura puede garantizarse? |
| CCD-Q38 | Acceso a cursos | ¿Dónde accedo al curso y qué hago si no aparece? | Estudiante | Guía de acceso y canal para incidentes, sin diagnosticar cuenta | CP-03: Canvas; procedimiento no aportado | Guía y soporte competente por identificar | Guía; desconocido | Por cambio de procedimiento | General; estado de cuenta sería personal | No para guía pública; cuenta por confirmar | STATIC_GUIDANCE + DOCUMENT_LOOKUP | PUBLIC_PRELIMINARY; CCD_CONFIRMATION_REQUIRED | ¿Qué orientación se puede dar sin acceder a Canvas ni inferir matrícula? |
| CCD-Q39 | Modificaciones institucionales | ¿Puedes corregir mi progreso, calificación, homologación o insignia? | Estudiante titular/personal autorizado | Decisión y escritura institucional con responsabilidades | Ninguna autorización; CP-03 no acredita escritura | Procedimiento y autoridad competente por identificar | Operación; contrato desconocido | Por decisión/transacción | Personal y transaccional | Sí + autorización | UNRESOLVED | ACCESS_AUTHORIZATION_REQUIRED; OUT_OF_SCOPE_CANDIDATE | ¿Se limita BanuChat a orientar y se excluyen todas las escrituras institucionales? |
| CCD-Q40 | Procedencia y conflictos | ¿De dónde sale esta respuesta y qué pasa si hay información distinta? | Todos los roles candidatos | Fuente, versión, fecha, alcance y política de conflicto | CP-01–CP-04 sin originales ni fechas | Jerarquía de fuentes y autoridad de resolución por identificar | Metadatos y regla documental; desconocido | Con cada cambio de fuente | Depende del dato/documento citado | Según acceso de la fuente; citas no deben eludirlo | DOCUMENT_LOOKUP + STATIC_GUIDANCE | CCD_CONFIRMATION_REQUIRED; INTERNAL_SOURCE_REQUIRED | ¿Quién valida la respuesta y qué fuente prevalece o exige abstención? |

## 4. Inventario de documentos requeridos

Los nombres siguientes son conceptuales; no se afirma que existan archivos o
datasets con esos títulos. «No obtenido» significa que no se recibió el original
ni acceso verificable para esta revisión. El resumen CP sí fue recibido, pero no
equivale a obtener sus fuentes. Público/interno, estabilidad y formatos son
clasificaciones por confirmar. Para datos personales se requiere primero definir
acceso y minimización; el inventario no solicita entregar expedientes en la reunión.

| ID | Nombre conceptual | Finalidad | Qué preguntas permite responder | Público/interno | Estable/dinámico | Autoridad requerida | Formato desconocido/conocido | Obtenido/no obtenido |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CCD-D01 | Catálogo maestro de rutas y cursos | Fijar nombres, relaciones, versiones y población | Q01–Q03, Q07 | Publicación reportada; maestro por confirmar | Relativamente estable por versión; por confirmar | Autoridad que valida catálogo/currículo, por identificar | Desconocido; no asumir exportación | No obtenido; CP-01 es resumen |
| CCD-D02 | Definición de secuencias y prerrequisitos | Distinguir obligatoriedad, alternativas y excepciones | Q03, Q14, Q27, Q36 | Público/interno por confirmar | Versionado por cambios normativos | Autoridad curricular competente, por identificar | Desconocido | No obtenido |
| CCD-D03 | Syllabus/temario aprobado por curso | Explicar contenidos y resultados de aprendizaje | Q04 | Público/interno por confirmar | Estable por versión; por confirmar | Aprobador/custodio académico por identificar | Desconocido | No obtenido |
| CCD-D04 | Rúbricas y reglas de evaluación | Explicar criterios aplicables a una edición | Q05 | Potencialmente interno; por confirmar | Por edición o revisión | Autoridad académica competente por identificar | Desconocido | No obtenido |
| CCD-D05 | Guías y materiales autorizados | Localizar recursos sin exponer contenido restringido | Q06, Q38 | Mixto; por confirmar | Por edición/revisión | Custodio y autorizador de distribución por identificar | Desconocido; Canvas reportado como canal, no formato | No obtenido |
| CCD-D06 | Oferta oficial por periodo/NRC | Identificar ofertas y diferenciarlas del catálogo | Q07–Q11, Q30, Q37 | Publicación reportada; fuente maestra por confirmar | Dinámico por oferta/ajustes | Publicador y autoridad de oferta por identificar | Desconocido; no asumir archivo tabular ni API | No obtenido; CP-02 es resumen |
| CCD-D07 | Programación, horarios y cambios | Dar fechas/horas vigentes y registrar cancelaciones | Q09–Q11, Q31 | Público/interno por confirmar | Dinámico | Autoridad que valida programación por identificar | Desconocido | No obtenido |
| CCD-D08 | Procedimiento y ventanas de inscripción | Orientar sin ejecutar transacciones | Q12–Q14, Q18 | Guía pública candidata; reglas internas por confirmar | Por procedimiento/oferta/prórroga | Autoridad del proceso por identificar | Desconocido; Cosmos no demuestra contrato técnico | No obtenido |
| CCD-D09 | Guía de pago y valores/plazos aplicables | Separar orientación, valor publicado y estado personal | Q15–Q17 | Guía/publicación candidata; estado personal interno | Por procedimiento/oferta/operación | Autoridades de valor y pago por identificar | Desconocido | No obtenido |
| CCD-D10 | Norma/protocolo de pruebas diagnósticas | Fijar propósito, destinatarios, reglas y efectos | Q19, Q21–Q22 | Reglas reportadas; acceso completo por confirmar | Estable por versión/convocatoria | Autoridad del diagnóstico por identificar | Desconocido | No obtenido; CP-04 es resumen |
| CCD-D11 | Convocatoria y calendario diagnóstico | Determinar fechas y vigencia de cada convocatoria | Q20–Q21, Q29, Q31 | Publicación reportada | Dinámico por convocatoria y ajustes | Publicador autorizado por identificar | Desconocido | No obtenido |
| CCD-D12 | Normas y equivalencias de homologación | Explicar transiciones y distinguir regla de decisión | Q23–Q24, Q27 | Publicación reportada; anexos internos por confirmar | Por norma/plan/transición | Autoridad que aprueba equivalencias por identificar | Desconocido | No obtenido |
| CCD-D13 | Reglas de cumplimiento por plan/cohorte | Determinar requisitos generales aplicables | Q03, Q27–Q28, Q36 | Público/interno por confirmar | Versionado por plan/cohorte | Autoridad curricular e interpretativa por identificar | Desconocido | No obtenido |
| CCD-D14 | Registro autoritativo de progreso e historial | Consultar estados y antecedentes, solo si se autoriza | Q25–Q26, Q28 | Personal/interno; acceso no autorizado | Dinámico por evento y corrección | Custodio de datos y autorizador de acceso por identificar | Desconocido; no asumir que MiPortalU/Banner sean fuente maestra | No obtenido; ni acceso confirmado |
| CCD-D15 | Resultados diagnósticos y decisiones de homologación | Respaldar decisiones individuales existentes | Q22, Q24, Q28 | Personal/interno; acceso no autorizado | Por decisión/corrección | Autoridad decisora y custodio por identificar | Desconocido | No obtenido; ni acceso confirmado |
| CCD-D16 | Convocatorias y condiciones de vacacionales/intensivos | Separar ofertas especiales y sus reglas | Q29–Q30 | Publicaciones reportadas | Dinámico por convocatoria | Autoridad de cada convocatoria por identificar | Desconocido | No obtenido |
| CCD-D17 | Calendario oficial o inventario de fuentes de fechas | Consolidar fechas con prioridad y procedencia | Q13, Q20, Q29–Q31, Q40 | Público/interno por confirmar | Dinámico | Responsables de calendarios y resolución de conflictos por identificar | Desconocido; no asumir calendario único | No obtenido |
| CCD-D18 | Procedimiento y requisitos de insignia digital | Explicar solicitud/emisión y límites de información | Q32–Q33 | Tema público reportado; procedimiento interno no confirmado | Por revisión | Autoridad emisora y del procedimiento por identificar | Desconocido | No obtenido |
| CCD-D19 | Registro de emisión de insignias | Consultar estado personal si se autoriza | Q33 | Personal/interno; acceso no autorizado | Por emisión/corrección | Emisor/custodio y autorizador por identificar | Desconocido | No obtenido; ni acceso confirmado |
| CCD-D20 | Directorio y protocolo de soporte | Orientar y escalar incidencias | Q12, Q15, Q34, Q38–Q40 | Canales públicos candidatos; procedimiento interno por confirmar | Por cambio de canal/horario | Autoridad que valida canales por identificar | Desconocido | No obtenido |
| CCD-D21 | Índice de normas, resoluciones y documentos vigentes | Localizar originales y resolver aplicabilidad | Q03, Q14, Q21, Q23, Q27, Q32, Q35–Q36, Q40 | Mixto; por documento | Versionado por emisión/reemplazo | Emisor, custodio y autoridad interpretativa por identificar | Desconocido | No obtenido |
| CCD-D22 | Definición y fuente de disponibilidad/cupos | Determinar si la pregunta es viable y con qué frescura | Q37 | Desconocido; no hay fuente confirmada | Desconocido; potencialmente cambiante | Autoridad operacional, si existe, por identificar | Desconocido; existencia/acceso por confirmar | No obtenido |
| CCD-D23 | Guía oficial de acceso a plataformas | Orientar sobre Cosmos, MiPortalU, Banner y Canvas según rol | Q06, Q12, Q15, Q25–Q26, Q38 | Parte pública reportada; detalle por rol por confirmar | Por cambio de procedimiento | Autoridad de cada canal por identificar | Desconocido | No obtenido; CP-03 solo reporta usos |
| CCD-D24 | Contratos de acceso y autorización de uso | Definir lectura, copia, exposición, retención y límites | Q17–Q18, Q22, Q24–Q26, Q28, Q33, Q35, Q37, Q39 | Interno; acceso por acordar | Por acuerdo/cambio de alcance | Autoridades de sistemas y datos por identificar | Desconocido; ninguna API confirmada | No obtenido |
| CCD-D25 | Política de actualización y jerarquía de fuentes | Resolver vigencia, cortes, fallos y contradicciones | Q07–Q11, Q13, Q16, Q20, Q29–Q31, Q36–Q37, Q40 | Interno con información divulgable por definir | Por acuerdo y cambio operacional | Dueños de fuentes y responsables de actualización por identificar | Desconocido | No obtenido |

Para una recepción futura autorizada, registrar por artefacto: título exacto,
localizador permitido, emisor/custodio confirmado, versión, fecha de publicación,
fecha de consulta, vigencia inicial/final cuando exista, periodo/plan/cohorte de
aplicación, documento reemplazado, estado de acceso y preguntas CCD-Q respaldadas.
Si algún campo no existe o no se conoce, declararlo; no completar fechas por inferencia.
Una copia sin vigencia o autoridad identificada no cierra por sí sola la dependencia.

## 5. Preguntas que NO deben prometerse todavía

Ninguna fila de la matriz es una funcionalidad comprometida. Estas requieren especial
restricción por implicar datos personales, decisiones o acciones institucionales:

| Promesa que debe evitarse | Motivo | Límite de una respuesta futura que podría validarse |
| --- | --- | --- |
| «Te digo los cupos disponibles en tiempo real» (Q37) | Sin fuente, semántica de cupo, reservas, acceso ni frescura confirmados. Oferta publicada no equivale a cupos. | Explicar el canal de consulta confirmado; solo informar disponibilidad si se autoriza una fuente y se declara su corte, sin garantizar reserva. |
| «Conozco tu progreso y lo que te falta» (Q25) | Sin fuente personal autorizada ni reglas curriculares completas. Un perfil sintético no autentica al estudiante. | Orientación general sobre rutas y canal institucional, cuando su guía se valide. |
| «Puedo mostrar todo tu historial» (Q26) | No se conocen cobertura, acceso, correcciones ni retención. Historial académico e historial de chat son conceptos distintos. | Remisión al canal validado; no construir un expediente a partir de lo escrito en chat. |
| «Eres elegible / ya cumpliste / tu curso se homologa» (Q24, Q28) | Requiere regla aplicable, datos personales y posiblemente una decisión humana competente. | Explicar reglas generales con versión y límites; no convertir una inferencia del modelo en dictamen. |
| «Te inscribo, retiro o cambio de grupo» (Q18) | Implica escritura, permisos y confirmaciones fuera de los mecanismos candidatos de consulta. | Orientar hacia el trámite oficial validado; proponer excluir transacciones del alcance. |
| «Tu pago está aprobado» (Q17) | El canal de pago reportado no acredita acceso al estado de una operación. | Explicar dónde verificarlo; no aceptar comprobantes como prueba autoritativa ni ejecutar pagos. |
| «Corrijo tu nota, progreso, homologación o insignia» (Q39) | Requiere autoridad y escritura institucional no autorizadas. | Indicar el procedimiento de corrección y soporte si el CCD lo valida. |
| «Tu insignia se emitirá automáticamente en una fecha» (Q33) | Sin procedimiento interno, registro de emisión ni plazo confirmado. | Explicar el procedimiento general vigente una vez obtenido y validado. |

La recomendación provisional para discutir con el CCD es empezar por información
general y orientación verificable, y decidir por separado si alguna consulta personal
es necesaria y viable. No se da esa priorización por aprobada ni se promete una fecha.

## 6. Preguntas para reunión con el CCD

P0 bloquea decisiones de alcance, fuentes, acceso o mecanismo. P1 afecta cobertura y
calidad una vez resuelto lo anterior. P2 mejora la experiencia sin sustituir los
prerrequisitos. La clasificación prioriza decisiones, no presupone respuestas.

### P0 — bloqueante

| ID | Pregunta para la reunión | Evidencia/acuerdo que debe quedar | Qué decisión cambia |
| --- | --- | --- | --- |
| CCD-P0-01 | ¿Qué usuarios y preguntas son prioritarios, y se limita el primer alcance a informar/orientar? ¿Se excluyen transacciones y decisiones personales? | Lista de CCD-Q incluidas, diferidas y excluidas, validación y límites explícitos | Alcance de lectura frente a acciones; necesidad de datos personales y viabilidad del plazo. |
| CCD-P0-02 | ¿Cuál es la estructura vigente de rutas/cursos y cómo se distinguen curso, oferta, periodo y NRC? | Glosario y catálogo maestro con versiones, relaciones y autoridad identificada | Información necesaria para consultas estructuradas; evita copiar el modelo sintético. |
| CCD-P0-03 | ¿Cuál es la fuente autoritativa de cada dominio y quién puede validarla? ¿Los portales muestran datos de otro sistema? | Mapa fuente–dato–autoridad y criterio de prevalencia; sin asignar responsables supuestos | Consulta de datos, explicación documental o simple orientación; no elegir un portal como maestro por su nombre. |
| CCD-P0-04 | ¿Qué canales de acceso existen realmente para BanuChat: documentos entregados, exportaciones autorizadas, consulta manual o interfaz documentada? | Capacidad confirmada, restricciones y contrato si existe; registrar también ausencia de acceso | Viabilidad de integración y actualización; no asumir API de Cosmos, Banner, MiPortalU o Canvas ni recurrir a scraping automáticamente. |
| CCD-P0-05 | ¿Qué información puede consultarse, copiarse, conservarse y mostrarse? ¿Quién autoriza cada uso? | Autorización por fuente y operación, límites de exposición/retención y autoridad competente | Posibilidad de integrar cada fuente; ubicación y tratamiento del contenido por decidir después. |
| CCD-P0-06 | ¿Se necesita progreso/historial personal? Si sí, ¿qué identidad, permisos por rol y fuente individual permiten esa consulta? | Necesidad validada, mecanismo de identidad confirmado y autorización por dato; ningún expediente ni credencial en esta acta | Autenticación/autorización y separación entre consultas generales y personales; si falta, estas últimas siguen bloqueadas. |
| CCD-P0-07 | ¿Qué reglas cambian por plan, cohorte, periodo o transición, y cuáles requieren decisión humana? | Normas aplicables, excepciones y autoridad interpretativa, con versiones | Límites del cálculo determinista y de RAG; evita dictámenes de elegibilidad generados sin autoridad. |
| CCD-P0-08 | ¿Con qué frecuencia cambia cada fuente, qué antigüedad es aceptable y qué hacer ante caída o contradicción? | Política de corte, actualización, corrección, abstención y responsable identificado | Necesidad de consulta actual, publicación periódica u orientación; no fijar scheduler ni latencia sin acuerdo. |
| CCD-P0-09 | ¿Qué documentos oficiales y anexos pueden utilizarse, en qué formatos y con qué permisos? | Inventario CCD-D, versiones y acceso autorizado; diferenciar publicados e internos | Necesidad y alcance de DOCUMENT_RAG frente a DOCUMENT_LOOKUP; bloquea decisiones de extracción y corpus. |
| CCD-P0-10 | ¿Existe una fuente de cupos, qué significa su saldo y es consultable con un corte verificable? | Existencia, semántica, autorización y frescura, o decisión de excluir Q37 | Viabilidad de disponibilidad; evita prometer tiempo real o inferir cupos desde oferta. |
| CCD-P0-11 | ¿Quién revisará la exactitud de las respuestas y qué evidencia permite aceptar el alcance? | Revisor/autoridad por confirmar, criterios por pregunta y ejemplos permitidos acordados | Validación del dominio y futuro benchmark; los 63 borradores M9 no prueban cobertura real. |

### P1 — importante

| ID | Pregunta para la reunión | Resultado esperado |
| --- | --- | --- |
| CCD-P1-01 | ¿Cuál es el procedimiento completo de insignia, incluidos requisitos, excepciones y canal de reclamación? | Delimitar Q32/Q33 y distinguir guía pública de estado personal. |
| CCD-P1-02 | ¿Dónde están syllabus, guías y rúbricas, y qué parte puede divulgarse fuera del curso? | Completar D03–D05 y permisos por documento; si son indispensables para el alcance elegido, elevar a P0. |
| CCD-P1-03 | ¿Cómo cambian inscripción, pago y convocatorias entre oferta ordinaria, vacacional e intensiva? | Completar excepciones, pasos y reglas sin habilitar transacciones. |
| CCD-P1-04 | ¿Qué canal atiende cada tipo de inconsistencia y qué información mínima puede pedirse al usuario? | Guía de soporte y escalamiento sin recoger expedientes innecesarios. |
| CCD-P1-05 | ¿Cómo se comunica que una publicación quedó reemplazada, corregida o cancelada? | Completar trazabilidad y tratamiento de publicaciones históricas; elevar a P0 si impide determinar vigencia. |

### P2 — conveniente

| ID | Pregunta para la reunión | Resultado esperado |
| --- | --- | --- |
| CCD-P2-01 | ¿Qué nombres alternativos, siglas y formulaciones usan los usuarios para estas consultas? | Vocabulario validado para revisar posteriormente cobertura conversacional, sin añadir reglas ahora. |
| CCD-P2-02 | ¿Qué formato de respuesta, nivel de detalle y presentación de fuentes facilita la comprensión? | Criterios de contenido y usabilidad, pendientes de validación posterior. |
| CCD-P2-03 | ¿Qué consultas frecuentes o ejemplos no personales pueden compartirse por un canal autorizado? | Material de descubrimiento con procedencia; separado del gold de evaluación y de cualquier expediente. |

Registrar cada respuesta contra sus IDs, fecha, fuente/acta autorizada, autoridad
que la valida, decisiones y pendientes. Si no hay respuesta, conservar el bloqueo.
Una reunión o una opinión informal no sustituyen una autorización de uso ni un
contrato técnico. No se contactó ni envió este documento al CCD en esta tarea.

## 7. Evidencia mínima antes de integración real

Cada dominio que se pretenda integrar debe satisfacer estas condiciones; completar
una fuente pública no habilita automáticamente todas las demás. La integración
sigue bloqueada hasta registrar evidencia y autorización del cambio concreto.

| Condición | Evidencia mínima revisable | Qué mantiene el bloqueo |
| --- | --- | --- |
| Alcance validado | Preguntas y roles incluidos/excluidos, finalidad y criterios de aceptación | Lista de deseos sin prioridad, o transacciones implícitas. |
| Dominio entendido | Glosario, relaciones, reglas y población/periodo aplicables, revisados por autoridad confirmada | Equiparar sin validación el modelo sintético con el institucional. |
| Fuente autoritativa identificada | Localizador, responsable confirmado, cobertura y precedencia ante conflictos | Portal mencionado sin conocer origen del dato, o solo resumen CP. |
| Evidencia pública trazable | Original autorizado/localizador, fecha observada, publicación/versión y límites conocidos | URL o captura sin contexto suficiente; datos públicos no autorizan por sí solos reutilización. |
| Acceso y uso autorizados | Permisos explícitos para leer, copiar, conservar y exponer según el uso previsto | Ausencia de permiso o asumirlo por acceso humano al portal. |
| Canal técnico confirmado | Mecanismo realmente disponible, documentación, límites y ambiente autorizado cuando corresponda | Endpoint inventado, credenciales prestadas o scraping como solución implícita. Una entrega documental acordada también debe tener contrato de uso. |
| Datos personales delimitados | Necesidad, identidad, autorización por rol/operación, minimización, retención y eliminación definidas | Perfil sintético, datos escritos por el usuario o sesión de portal tratados como acceso institucional de BanuChat. |
| Temporalidad resuelta | Fecha/corte, vigencia, ámbito, actualizaciones, cancelaciones y conducta ante desactualización | Prometer «vigente» o «tiempo real» sin fuente y umbral acordados. |
| Corpus documental permitido | Documentos y formatos obtenidos con permiso, versiones, autoridad y clasificación de acceso | Syllabus, rúbricas, resoluciones o procedimiento interno de insignia solo supuestos. |
| Validación acordada | Revisión por conocedores del dominio y casos permitidos con respuesta/evidencia verificable; separar desarrollo y evaluación | Usar M9 sintético como benchmark final o generar resultados antes de definir el dominio. |
| Reanudación autorizada | Decisión técnica y reconciliación académica correspondientes, análisis de impacto sobre contratos congelados y alcance viable | Considerar esta matriz o un ADR interno como aprobación institucional/académica. |

La evidencia y sus permisos se registrarán en el lugar autorizado que se acuerde;
este documento no decide almacenar datos internos o personales en Git. El dataset
sintético v1 permanece intacto y separado. Ningún contenido real se incorpora a
`/data/synthetic`. Si una condición no puede cumplirse, reducir explícitamente el
alcance o mantener la pregunta pendiente; no inventar la fuente faltante.

## 8. Implicaciones provisionales para BanuChat

Estas categorías pueden superponerse. Una norma es documental y temporal; el progreso
es personal, estructurado y temporal. La clasificación no diseña tablas ni prescribe
persistencia, endpoints, conectores o herramientas nuevas.

| Categoría conceptual | Elementos candidatos | Implicación provisional | Dependencia principal |
| --- | --- | --- | --- |
| Dato estructurado | Rutas, cursos, relación entre ambos, oferta por periodo/NRC, modalidad, horarios y fechas | STRUCTURED_QUERY parece apropiado para datos exactos y filtrables, una vez confirmadas semántica, autoridad y vigencia. | D01, D06–D08; no asumir correspondencia con entidades sintéticas. |
| Documento | Syllabus, guías, rúbricas, normas, resoluciones, convocatorias y procedimiento de insignia | DOCUMENT_LOOKUP para localizar originales; DOCUMENT_RAG si se necesita explicar contenido autorizado con evidencia. | Inventario real, formatos, permisos, versiones y reglas de aplicabilidad. |
| Dato personal | Progreso, historial académico, resultados, homologaciones, cumplimiento, pago e insignia individual | Mantener UNRESOLVED hasta confirmar necesidad, fuente, identidad y autorización. El estado oficial no puede sustituirse por una inferencia generada. | D14–D15, D19, D24 y decisiones P0 de acceso. |
| Dato temporal | Oferta, plazos, diagnósticos, convocatorias, horarios, precios, reglas por cohorte y eventual disponibilidad | Toda respuesta debe declarar el alcance temporal pertinente y el corte cuando importe; considerar abstención ante conflicto o vencimiento. | Política de vigencia y actualización; cupos siguen sin fuente confirmada. |
| Contenido de referencia | Explicación de rutas, orientación de inscripción/pago, uso de plataformas y soporte | STATIC_GUIDANCE puede bastar si el procedimiento está validado; revisar cuando cambie y acompañar de fuente. | Guías y canales confirmados; no inventar contactos ni pasos. |

La hipótesis híbrida sigue siendo razonable: distinguir consulta estructurada,
interpretación documental, localización de documentos y orientación. La matriz
no demuestra que todas las preguntas requieran RAG ni que haga falta un agente.
Las consultas compuestas y las dudas de clasificación quedan para evaluación
posterior con tareas confirmadas, sin cambiar ahora el Intent Router.

Cosmos, MiPortalU, Banner y Canvas son canales/sistemas mencionados en el contexto,
no integraciones disponibles. No se les atribuye ser fuente maestra ni se les
asignan APIs. Su relación con cada dato deberá establecerse mediante P0-03/P0-04.
La arquitectura actual Mobile → REST y su backend sintético no habilitan acceso
a ninguno de ellos. Agent/ReAct y MCP siguen pendientes y sujetos al re-baseline.

El progreso e historial de la demo no son expedientes reales. Si se solicita además
historial conversacional para usuarios reales, se requiere una decisión separada
sobre finalidad, identidad, acceso y retención; la matriz de historial académico
no resuelve ese requisito.

El trabajo siguiente es resolver las preguntas P0 y completar procedencia, autoridad,
vigencia y permisos por fila. Permanecen las pausas del re-baseline: expansión M9
P-064+, RAGAS final, tuning, cambio de embeddings/chunking, índices aproximados,
SQL adaptado al CCD e integración real. Las preguntas CCD-Q no amplían el benchmark,
no incorporan respuestas institucionales al runtime y no autorizan implementar nada.
