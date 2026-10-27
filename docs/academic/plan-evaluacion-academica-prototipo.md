# BanuChat — Diseño de evaluación académica del prototipo

> Nota de precedencia, 27 de octubre de 2026: este documento conserva la propuesta
> histórica del 22 de octubre y sus límites técnicos de ese momento. Las menciones
> a backend sin autenticación, participación futura no instrumentada y tareas
> candidatas no describen el producto actual. Para usabilidad/SUS rige el
> [protocolo OE5-H0 propuesto](../../eval/mobile/oe5-student-validation-protocol.md),
> `READY_FOR_ACADEMIC_REVIEW`, con CCD autenticado y auxiliares ficticios.
> Sus instrumentos no acreditan ejecución humana, revisión documental ni OE1 RAGAS.
> **PENDIENTE DE CONFIRMACIÓN POR EL RESPONSABLE ACADÉMICO: procedimiento/revisión aplicable antes del reclutamiento.**

Fecha de preparación: 22 de octubre de 2026, America/Bogota. Versión propuesta 0.1, pendiente de revisión de Sala de Control y del equipo académico. Base comprobada: `711eacbc5255e0383e2b9fd37cf5a6ff9c16bf0f`; árbol limpio al iniciar. Este informe es el único archivo añadido en la tarea.

El prototipo puede evaluarse como artefacto de Ingeniería de Sistemas para consulta documental conversacional local. El resultado técnico BCH-03/5.3 de **329/329 controles y 43/43 turnos completos** no es una medición de calidad académica, usabilidad estudiantil ni eficacia institucional. T11 sigue siendo no satisfactorio por utilidad conversacional, aunque no concede un derecho universal falso.

Se propone primero una evaluación controlada por el equipo, con un operador, preguntas simuladas y revisión humana de respuestas. No se inicia su ejecución, no se reclutan participantes y no se aprueba la metodología mediante este documento. No se propone incorporar agentes, servicios, herramientas de evaluación nuevas ni cambios del prototipo.

## 1. Preguntas de evaluación y relación académica

Las preguntas de evaluación propuestas son: ¿responde al problema planteado?, ¿sus afirmaciones y citas tienen respaldo pertinente?, ¿conserva y corrige el contexto?, ¿reconoce los límites de las fuentes sin dejar de orientar?, y ¿completa el recorrido local de forma observable y recuperable? No se pretende demostrar reducción de carga administrativa, mejora de resultados académicos o sustitución del CCD: faltan diseño comparativo, línea base y acceso institucional para ello.

La [matriz de reconciliación académica](anteproyecto-reconciliation-matrix.md), §7 y §12–13, conserva los objetivos originales y las brechas. Se utiliza como trazabilidad académica existente, sin modificar el anteproyecto ni reproducir su nombre histórico. No se releyó el PDF original en esta tarea ni se afirma una nueva verificación primaria de sus compromisos.

| Objetivo específico, resumido desde la matriz | Aporte de este plan | Límite que permanece |
| --- | --- | --- |
| OE1: búsqueda semántica PostgreSQL/pgvector y fundamentación en documentos CCD | Evaluación de respaldo, citas, alcance temporal y cobertura del subconjunto admitido | Los derivados seleccionados no acreditan información institucional completa, vigente o avalada; no se promete exactitud absoluta. |
| OE2: extracción y actualización automática mediante RPA/scraping | Registrar explícitamente que este protocolo no lo evalúa | La ingesta local controlada no acredita scraping periódico ni actualización institucional. Cualquier sustitución requiere decisión académica. |
| OE3: núcleo agéntico, RAG y MCP | Evidencia parcial del RAG directo y sus controles conversacionales | El router determinista no acredita un agente ni integración MCP. Este plan no autoriza implementarlos o eliminar ese compromiso. |
| OE4: BPM/N8N en interacción y flujos conversacionales | Trazar límites y procedencia de reglas usadas en el chat | El flujo actual no pasa por N8N; la orquestación manual de ingesta no satisface por sí sola el objetivo original. |
| OE5: interfaz móvil React Native y experiencia de consulta | Recorridos controlados, comprensión de citas/advertencias y revisión de interacción | Una demostración Android por el equipo no es un estudio de usabilidad con estudiantes ni certificación de accesibilidad. |
| OE6: despliegue universitario y evaluación integral con usuarios reales | Integración y operación locales, más un diseño condicionado de evaluación humana futura | No acredita infraestructura universitaria, disponibilidad institucional ni usuarios reales; requiere aprobación cualquier reencuadre. |

El horizonte aproximado de 16 semanas es una restricción de planificación, no evidencia de semanas disponibles. Antes de fijar calendario deben confirmarse el tiempo restante y el alcance aprobado con la dirección. Las metas originales recopiladas en la matriz —incluidos tiempos, RAGAS o estudios con estudiantes— no se sustituyen silenciosamente por estas métricas locales.

## 2. Inventario de capacidades y evidencia existente

Se revisaron checkpoints y reportes locales existentes; no se ejecutó nuevamente el sistema. Las cifras siguientes son resultados históricos de ensayos concretos, no nuevas mediciones ni una suma acumulada de pruebas independientes.

| Evidencia | Capacidad implementada o prueba ejecutada | Resultado observado | Lo que no permite afirmar |
| --- | --- | --- | --- |
| E01: [BCH-02/1](../transition/bch02-increment-1-checkpoint.md), secciones Contexto y recuperación / pruebas | Historial acotado por conversación y release; seguimientos, correcciones y cambios de tema; HTTP con PostgreSQL CCD/Ollama | Se conserva el antecedente conversacional y se pide aclaración sin contexto en los casos probados | Comprensión semántica universal, memoria ilimitada o aislamiento por persona. |
| E02: [BCH-02/2](../transition/bch02-increment-2-checkpoint.md), citas / naturalidad / límites | Selección de fuentes, referencias explícitas validadas y advertencias pertinentes; 500 tests API y E2E de 55 controles en ese incremento | IA → DOC-101, Marca → DOC-103, duración → TEST_ORIENTATION, contacto → M12; persistencia de citas verificada | Identificador válido o similitud vectorial no demuestran respaldo semántico. El límite de 80 palabras solo se revisó en ejemplos acotados. |
| E03: [BCH-02/3](../transition/bch02-increment-3-checkpoint.md), flujo / historial / 409 | Modo local CCD en Mobile; Expo Web con backend real, 10 preguntas, 20 mensajes y 13 citas; tests móviles simulados y lecturas sintéticas separados | Chat, fuentes expandibles, visor, advertencias y lista de IDs de la apertura; 409 de UI simulado y 409 real comprobado aparte por backend | Expo Web no es Android. La lista de la apertura no es autorización ni propiedad del historial. El fixture 409 de UI no es un conflicto nativo real. |
| E04: [BCH-02 preflight Android](../transition/bch02-increment-4-checkpoint.md) y [reanudación física](../transition/bch02-android-resumption-checkpoint.md), Casos nativos / defecto / límites | Android físico TECNO CL7s, Android 14/API 34, Expo Go 57.0.9; USB/ADB reverse para API 3001 y Metro 8081 | Cursos, IA/temas, Marca, duración, contacto, citas/visor, historial, teclado, Atrás y desplazamiento. Defecto de lista obsoleta reproducido y corregido con recarga al recuperar foco | Un dispositivo y un operador no cubren todos los Android. La recuperación de red probó interrupción antes del procesamiento, no respuesta perdida tras un POST ya procesado. |
| E05: [BCH-03/1](../transition/bch03-increment-1-checkpoint.md), [2](../transition/bch03-increment-2-checkpoint.md), [3](../transition/bch03-increment-3-checkpoint.md), [4](../transition/bch03-increment-4-checkpoint.md) | Preparación y procedencia CCD; base local aislada; RAG y chat REST; ampliación a siete syllabus y orientación de pruebas | M01/M12, siete M02 y TEST_ORIENTATION admitidos para demostración local, con límites documentados | El incremento 1 no ejecutó servicios reales; los incrementos REST no validaron por sí solos Mobile. Los syllabus no prueban oferta actual. |
| E06: [BCH-03/5](../transition/bch03-increment-5-checkpoint.md), Admisión documental | U03: consecuencia histórica de pilar no validado en 202660. U04: transición y comprobación de reconocimientos | Doce unidades actuales; `source_checked_local_candidate`, `institutional_approval: false`. Procedencia y periodos trazados | Recuperación de cursos, homologaciones personales, equivalencias AND/OR, gratuidad, elegibilidad y tarifas siguen limitadas o bloqueadas. |
| E07: [Cierre de 5](../transition/bch03-increment-5-closure-checkpoint.md), T07 real | 252/252 controles automáticos, con fallo semántico real | Inasistencia y admisión tardía recibían U04 y advertencia ajenas al escenario | El PASS automático no acredita pertinencia ni utilidad. Se conserva este contraejemplo en la evaluación. |
| E08: [5.1](../transition/bch03-increment-5-1-checkpoint.md), batería / T07 | Corrección de pertinencia T07 y 514 tests API; integral 244/249 controles | T07 ya sin U03/U04 ajenos; tres 503 en T11/3 y REG/2–3 | Dos fallos derivados de historial no son dos averías nuevas del generador. La batería no quedó aprobada entonces. |
| E09: [5.2](../transition/bch03-increment-5-2-checkpoint.md), diagnóstico individual / ensayos | Reproducciones controladas con trazas del proveedor | Timeout de generación y exceso de contexto confirmados en reproducciones distintas; 16 POST, 12 respuestas 201 y cuatro 503; cuatro turnos no evaluables | La causa precisa del REG/2 histórico no quedó demostrada. No todo 400 significa contexto excesivo; aquí hubo cuerpo diagnóstico explícito en una reproducción. |
| E10: [5.3](../transition/bch03-increment-5-3-checkpoint.md), pruebas / matriz / recursos | 519 tests API, cinco de contabilidad del evaluador; HTTP focal 119/119 e integral 329/329, 43 turnos, 41 citas persistidas | AMB aclara sin embedding/generación; REG usa fuentes pertinentes; T07 seguro; todos los guiones técnicos completos en esa corrida | No acredita estabilidad longitudinal, calidad de todos los escenarios ni aval de reglas. T11 sigue C. La prueba HTTP no revalida Android tras U03/U04. |

Localizadores privados comprobados por lectura, sin sobrescribirlos:

- `data/ccd/evidence/bch02-android-resume/audit-summary.json`: auditoría nativa y referencias a capturas/jerarquías. El checkpoint E04 identifica, entre otras, `15-ia-topics`, `17-document-open`, `23-contact`, `25-network-failure` y `67-fixed-history-count`. Las capturas no se reinterpretan aquí como un estudio con participantes.
- `data/ccd/evidence/increment-5/http-1792686507869.json`: integral con tres 503.
- `data/ccd/evidence/increment-5/diagnostics-52-1792689934827.json`: reproducción fallida; el segundo ensayo favorable no la reemplaza.
- `data/ccd/evidence/increment-5/http-1792693227245.json`: última integral, comprobada por lectura: `planned=attempted=completed=43`, cero fallidos/no evaluables, 329 controles correctos, release `3d6cedac-0e86-40c8-909b-d3ff6e8ab741`.
- `data/ccd/evidence/increment-5/53-resources-1792693088832.jsonl`: condiciones de CPU/RAM/GPU/VRAM del ensayo 5.3, según E10.

Las cifras no se agregan para estimar una tasa de fiabilidad: las versiones, controles, consultas y condiciones difieren. Los originales externos y expedientes no forman parte de este informe.

### Fronteras del inventario

Implementado no significa validado en toda circunstancia. Se conserva chat contextual, persistencia por release, citas/visor y modo local. Permanecen sin acreditar: publicación institucional, autenticación, autorización por usuario, acceso multiusuario, vigencia actual del corpus, estudio de usabilidad estudiantil, impacto en el CCD, disponibilidad sostenida y generalización a dispositivos o paráfrasis no probados. Agent/ReAct y MCP no están integrados al fallback actual; notificaciones y automatización institucional no se acreditan con BCH-02/03.

Son límites documentales las condiciones actuales de solicitud, elegibilidad, gratuidad, recuperación y reconocimientos personales. Son límites del artefacto una respuesta impertinente o inútil pese a disponer de contexto suficiente. Son fallos operacionales un timeout, rechazo del proveedor o interrupción de red. Deben contabilizarse por separado.

La competencia histórica por videojuegos es una hipótesis, no causa probada. El ensayo 5.3 se realizó con declaración del operador de ausencia de cargas intensivas y telemetría; su éxito no elimina la intermitencia pasada. También quedan los dos errores menores preexistentes del observador al comprobar `exactOptionalPropertyTypes`, documentados en E10; no se corrigen aquí.

## 3. Unidades de análisis y referencia de evaluación

Se utilizarán cuatro unidades relacionadas: **turno** (pregunta y respuesta con historial realmente persistido), **afirmación verificable** (proposición factual independiente de la respuesta final), **vínculo afirmación–fuente** (incluye el pasaje y su alcance) y **conversación/tarea** (secuencia con dependencias). La respuesta final incluye advertencias deterministas y cualquier respaldo documental; no basta evaluar la salida cruda del modelo.

Antes de ejecutar una versión del banco, el equipo debe fijar por caso: tipo de evidencia esperable, respuesta o aclaración permitida, hechos mínimos útiles, afirmaciones prohibidas, fuentes/localizadores admitidos, periodo/población, antecedentes requeridos y dependencias. La referencia es un conjunto de criterios y pasajes, no una única redacción que el modelo deba imitar. La ausencia de norma se registra como «no admitida/no demostrada en el subconjunto», nunca como prueba de inexistencia.

La etiqueta de referencia por turno será **R** (respondible), **P** (parcialmente respondible), **N** (regla no respaldada) o **Q** (requiere aclaración). Se separa del estado operacional y de la calificación de la respuesta. Un caso P/N puede ser satisfactorio si explica lo conocido, delimita lo desconocido y propone un siguiente paso proporcionado sin inventar reglas. Un caso R puede fallar por abstención excesiva.

## 4. Matriz de métricas propuestas

Ningún porcentaje de esta sección es un resultado obtenido. Se propone informar distribuciones y conteos por estrato, junto con cada denominador, en vez de un único índice que oculte fallos. No se fija un umbral general de aprobación; debe acordarlo el equipo académico antes de evaluar el conjunto reservado.

| ID / dimensión | Definición y unidad | Procedimiento y datos necesarios | Cálculo a presentar | Limitaciones |
| --- | --- | --- | --- | --- |
| M1 Pertinencia | Grado en que la respuesta aborda la intención actual y no un tema vecino; turno respondido | Revisión humana con pregunta, antecedentes reales, referencia R/P/N/Q y texto final; rubricar 0–3 | Media y distribución 0/1/2/3; proporción con puntuación ≥2, indicando que ≥2 es solo corte descriptivo propuesto; desglosar por estrato | Léxico coincidente no demuestra pertinencia; la segmentación de intenciones requiere criterio humano. Ausencias operacionales son NE, no cero semántico. |
| M2 Fundamentación | Proporción de afirmaciones documentales respaldadas por pasajes admitidos y con ámbito correcto; afirmación | Dos revisores, si están disponibles, separan afirmaciones factuales de preguntas, testimonios e inferencias; contrastan cada una con texto, localizador, periodo y población | Afirmaciones respaldadas / afirmaciones que requieren respaldo documental. Registrar también conteo de contradicciones y afirmaciones sin respaldo | No equiparar similitud vectorial o existencia del documento con respaldo. Si no hay afirmaciones documentales, el cociente es NA; no obtiene puntuación perfecta. |
| M3 Citas pertinentes y suficientes | Pertinencia de cada vínculo citado y cobertura de lo que exige cita; vínculo y afirmación | Revisar citas finales y persistidas, pasajes y proposiciones a las que realmente apoyan; separar revisión semántica de comprobación automática de IDs/hash/release | Precisión: vínculos pertinentes / vínculos citados. Cobertura: afirmaciones que requieren cita y tienen al menos una pertinente / total de afirmaciones que requieren cita. Integridad: registros coincidentes / registros comprobados | Una cita válida puede ser ajena, como T07 histórico. Una respuesta sin citas ante una regla desconocida no es fallo de cobertura si no afirma hechos documentales. Denominador cero → NA. |
| M4 Continuidad y corrección | Uso correcto de antecedentes y aceptación de correcciones, sin contaminación entre chats; oportunidad contextual | Revisor identifica el tema esperado a partir de mensajes persistidos; comprobar selección de fuentes, corrección prueba→curso, cambio de tema y aislamiento entre conversaciones de prueba | Oportunidades resueltas correctamente / oportunidades evaluables; informar separadamente seguimiento, corrección, cambio de tema y separación. Guiones completos / guiones planificados aparte | Solo puede valorarse un seguimiento si su antecedente existe. Contexto acotado no implica recuerdo ilimitado; no penalizar por no conocer datos nunca aportados. |
| M5 Abstención/aclaración apropiada | Decisión de responder, responder parcialmente, abstenerse o aclarar según R/P/N/Q; turno | Etiqueta esperada fijada antes; registrar decisión real y utilidad del límite. Matriz de confusión entre decisiones esperadas y observadas; el flag `insufficient_evidence` no sustituye leer el contenido | Decisiones apropiadas / decisiones evaluables; además abstenciones excesivas en R / R evaluables y afirmaciones indebidas en N/Q / N/Q evaluables; acompañar conteos por clase | La abstención sola no prueba utilidad. P permite distintas formulaciones seguras. Los errores 503 no se convierten en abstenciones académicas. |
| M6 Utilidad de orientación | Ayuda para comprender lo conocido, lo pendiente y un próximo paso viable sin autorización ficticia; turno y conversación | Revisión humana 0–3 con contexto y evidencia. Identificar hechos mínimos explicables, aclaración necesaria y remisión proporcionada; aplicar especialmente a T11 y P/N | Distribución y media; número de conversaciones con orientación suficiente según criterio aprobado; mostrar ejemplos y motivos, no solo promedio | El equipo no representa la satisfacción de estudiantes ni demuestra que el siguiente paso institucional siga vigente. Una derivación genérica puede ser segura pero poco útil. |
| M7 Alcance temporal y advertencias | Correcta correspondencia entre advertencia, afirmación y fuente usada; obligación de advertencia por turno | Referencia identifica advertencias exigibles; revisar texto completo, fuentes efectivamente citadas y si se atribuye vigencia actual | Advertencias pertinentes presentes / obligaciones; advertencias ajenas por respuesta y afirmaciones de vigencia indebida como conteos separados | Más advertencias no significa mejor calidad; no eliminar límites pertinentes para acortar. Un pie de advertencia no corrige una afirmación falsa en el cuerpo. |
| M8 Completitud y errores | Capacidad de completar turnos y guiones planificados con persistencia comprobada; ejecución y turno | Ledger del evaluador, HTTP, GET posterior y evidencia de error del proveedor saneada; registrar todos los ensayos | Planificados, intentados, completados, fallidos y NE. Completados / planificados y completados / intentados, ambos. Guiones completos / planificados. Errores por tipo/status con denominador de intentos | Un 201 sin persistencia no completa el turno. Dependientes no enviados son NE; un ensayo favorable no reemplaza otro fallido. No equivale a disponibilidad 24/7. |
| M9 Tiempos observados | Latencia extremo a extremo y por etapa, sin mezclar éxito con timeout; intento | Timestamp de envío/fin, tipo de ruta, estado frío/caliente declarado, etapas disponibles, modelo/receta, recursos y plataforma | Mediana, mínimo, máximo y, con n suficiente, p95 de completados, indicando método de percentil y n; tabla separada de duraciones de fallos/abortos y número censurado por timeout | Un timeout mide espera hasta abortar, no duración de generación terminada. No extrapolar un ensayo secuencial a carga concurrente, SLA o superioridad de versiones. No excluir errores silenciosamente del análisis. |
| M10 Experiencia de interacción | Comprensibilidad y ejecución de tareas en la interfaz; tarea de usuario/operador | Inicialmente recorrido del equipo con criterios predefinidos: aclarar curso, consultar fuente, distinguir vigencia, volver del visor y recuperar error sin envío duplicado; anotar ayudas, errores y observación | Tareas completadas sin ayuda / intentadas, con conteos y tiempo por tarea; fallos de comprensión y observaciones cualitativas. En fase inicial son resultados del operador, no de estudiantes | Solo una evaluación humana posterior aprobada permite describir experiencia de participantes. No inferir usabilidad de HTTP, tests simulados o viewport web. |

Para M2/M3 se anotarán «respaldo completo», «parcial», «no respaldado», «contradicho» o «no verificable». Solo completo entra en el numerador de respaldo; parcial se informa aparte. Una proposición se divide cuando contiene hechos independientes, evitando inflar el numerador con fragmentos triviales. Una fuente duplicada en el mismo vínculo no suma respaldo adicional. La pertinencia de cita se evalúa sobre su afirmación asociada, no sobre la pregunta en abstracto.

En todas las métricas: publicar numerador, denominador, NA/NE, versión del banco y razones de exclusión. Si falta respuesta, se mantiene el control planificado como NE y el fallo operacional correspondiente; no se suma cero a una rúbrica de contenido inexistente ni se oculta del total de cumplimiento. Los promedios de turnos pueden favorecer conversaciones largas: presentar también resumen por conversación y por estrato, sin asumir que los turnos son observaciones independientes.

### Tres niveles que no deben mezclarse

**Automático:** estado HTTP, persistencia, dependencias, conteos, integridad referencial de citas, patrones prohibidos concretos y tiempos. Sirve como guard de regresión; no decide por sí solo respaldo o utilidad. **Humano documental:** M1–M7, leyendo pasajes y alcance. **Experiencia de usuario:** M10, inicialmente recorrido controlado del equipo; una fase con participantes sería un estudio distinto, condicionado a autorización.

No se propone un juez LLM, RAGAS ejecutado ni una herramienta nueva. Si se desea adoptar después un instrumento estandarizado, como el SUS mencionado en el anteproyecto, debe acordarse su versión, aplicación, puntuación, muestra y permisos; este informe no acredita ese estudio ni sustituye sus compromisos por una lista de tareas.

## 5. Rúbricas y proceso de revisión humana

| Dimensión | 0 | 1 | 2 | 3 |
| --- | --- | --- | --- | --- |
| Pertinencia M1 | Responde otro problema o contradice la intención | Menciona el tema pero ignora la intención principal | Aborda la intención con una omisión secundaria | Responde o aclara precisamente lo necesario en ese turno |
| Continuidad, anotación auxiliar M4 | Arrastra contexto ajeno o ignora una corrección explícita | Conserva un antecedente inadecuado o ambiguo | Conserva el tema correcto con pérdida secundaria | Usa el antecedente válido, acepta correcciones y separa el cambio de tema |
| Abstención/aclaración, anotación auxiliar M5 | Inventa una autorización o responde sin poder desambiguar | Abstención innecesaria en R o límite vago en P/N | Decisión segura y límite comprensible, con alguna carencia | Respuesta parcial, límite o aclaración proporcionados a la evidencia y al contexto |
| Utilidad M6 | Desorienta o invita a actuar sobre una regla falsa | Respuesta vacía o remisión genérica, sin explicar lo conocido | Explica lo conocido y el límite, pero falta una condición o paso útil | Explica lo disponible, diferencia lo incierto y propone la aclaración o siguiente paso pertinente sin pedir datos personales |

Un cero crítico —derecho gratuito no respaldado, equivalencia personal inventada, vigencia falsa, atribución de un testimonio a una norma o contaminación entre conversaciones— se señala individualmente; no puede compensarse con promedios altos. Se propone exigir ausencia de estos errores en el banco de aceptación, como criterio provisional que el equipo debe aprobar, no como resultado ni garantía universal.

Procedimiento propuesto:

1. Dos revisores del equipo, si hay disponibilidad, calibran con cuatro turnos de desarrollo: un R, un P/N, un Q y T11. Definen qué cuenta como afirmación y desacuerdo sin cambiar los resultados históricos.
2. Puntúan independientemente los turnos del banco, ocultando el indicador de PASS automático y, cuando sea viable, la etiqueta de versión. Se conserva la relación con el historial para no perder el contexto.
3. Registran puntaje, pasaje/localizador y motivo. Comparan acuerdo exacto por dimensión: coincidencias / unidades doblemente revisadas. Si se informa una medida ajustada por azar, debe fijarse su método antes y advertir el tamaño pequeño; no es indispensable para este prototipo.
4. Concilian diferencias con un responsable académico o tercer revisor disponible; se guardan las dos notas originales y la decisión motivada. Si queda controversia, se marca no demostrado, sin forzar consenso.
5. Entregan matriz A/B/C y perfil de métricas. A: orientación suficiente respaldada para el objetivo del caso; B: orientación parcial correcta con regla pendiente; C: comportamiento incorrecto o utilidad requerida no demostrada. Un N puede ser A si su objetivo es manejar correctamente un límite; A no valida una regla ausente. Un fallo de ejecución se informa NE operacional, separado de A/B/C.

Si solo puede revisar una persona, se declara revisión única y sesgo potencial; no se inventa acuerdo interevaluador. Las decisiones de suficiencia deben quedar aprobadas antes de puntuar el conjunto reservado. Las respuestas parcialmente correctas se describen por componente; no se marca todo resuelto por una buena cita de contacto.

## 6. Banco inicial y ampliación propuesta

El banco inicial corresponde exactamente a los 16 guiones y 43 turnos de E10: T10 se divide en dos conversaciones; REG tiene seis turnos, AMB dos y AMB_FRESH uno. Es un **conjunto de desarrollo y regresión**, ya conocido por el sistema y por quien implementó los controles. No puede ser la única evidencia de generalización.

En esta tabla las etiquetas se asignan por turno o componente, no necesariamente a toda la conversación. La referencia se debe cotejar con los pasajes admitidos antes de una futura ejecución.

| Caso / turnos | Clase de pregunta y recorrido | Referencia permitida y criterio observable | No debe inferirse |
| --- | --- | --- | --- |
| T01 / 3 | P/N: solicitud → primer ingreso virtual 202660 → lugar/fecha | Separar descripción de prueba de procedimiento no admitido; aclarar condiciones faltantes sin solicitar expediente | Que la estructura de la prueba establece cuándo o cómo inscribirse |
| T02 / 3 | P/R/N: prueba nueva reprobada → pilar 202660 → repetición gratis | U03 permite consecuencia histórica al precisar alcance; repetición es otro asunto, no admitido | Derecho a repetir, matrícula automática o regla vigente actual |
| T03 / 3 | P/N: pruebas antiguas pendientes → cohorte 202410 → primera nueva gratuita actual | U04 orienta comprobación de plan/reconocimientos; procedimiento y beneficio no demostrados | Prueba pendiente = curso aprobado; elegibilidad o gratuidad universal |
| T04 / 2 | N/P: cohorte 202510 → supuesto derecho de antiguos | Delimitar falta de elegibilidad acreditada, sin convertirla en negación histórica del procedimiento | Que pertenecer a una cohorte otorga o elimina el beneficio |
| T05 / 3 | P/N: Word aprobado → PowerPoint no → pilar 2/costo | U04 y verificación de códigos/registro; separar reconocimiento y beneficio económico | Equivalencias AND/OR o exención de pago |
| T06 / 3 | P/N: Excel antiguo aprobado → IA aprobada → pendientes | U04 limita equivalencias personales; explicar qué debe comprobarse | Calcular expediente o reconocer un curso por relato |
| T07 / 3 | N: ausencia → admisión posterior a fecha → intento gratis | Límite útil sin U03/U04 ajenos, sin advertencia histórica improcedente | Ausencia = reprobación o autorización de otro intento |
| T08 / 3 | R/P/N: prueba 202660 → corrección a curso → nuevas pruebas | Aceptar corrección; U03 solo para explicar su límite; recuperación de curso requiere confirmación | Aplicar al curso la consecuencia de una prueba o eximirlo de presentar pruebas nuevas |
| T09 / 2 | P/N: UNAB Tec y materia previa → comparación con profesional presencial | U04 exige verificar programa, modalidad, cohorte y plan | Mismo reconocimiento en todas las poblaciones |
| T10a / 1 y T10b / 1 | Q en chats distintos: repetir gratis / duración sin antecedente | Pedir contexto sin reutilizar otra conversación ni citar fuentes ajenas | Objeto de la referencia o identidad de estudiante |
| T11 / 3 | P/N: dos solicitudes relatadas → derecho universal → reprobación posterior | Reconocer origen testimonial, inferencia limitada y falta de norma; separar primera presentación de repetición. U03 solo como orientación histórica condicionada | Testimonio = norma, ausencia de norma = procedimiento inexistente o gratuidad universal |
| T12 / 4 | N/P/R: nota ausente → inmediatez → 70 puntos → contacto | No inventar publicación/umbral; contacto M12 con advertencia 202660/vigencia no ratificada | Resultado personal o plazo vigente de publicación |
| REG / 6 | R y cambios de tema: catálogo → IA → temas → Marca → duración → contacto | Siete syllabus; DOC-101 para IA/temas, DOC-103 para Marca, TEST_ORIENTATION para duración histórica, M12 para contacto | Oferta vigente o arrastre de advertencias de fuentes no utilizadas |
| AMB / 2 | R→Q: catálogo → singular «¿Y qué temas tiene?» | Preguntar cuál curso, sin embedding/generación ni citas en el seguimiento | Que el listado seleccionó un curso individual |
| AMB_FRESH / 1 | Q: mismos temas sin antecedentes | Aclaración sin embedding/generación ni citas | Antecedente de otro chat |

La clasificación histórica de E10 se conserva: T10, REG y AMB/AMB_FRESH tienen comportamiento comprobado dentro de su alcance; T01–T09 y T12 conservan componentes pendientes; T11 es C. Esta es una lectura de la evidencia existente, no el resultado de aplicar ahora toda la rúbrica nueva ni de puntuar un conjunto reservado.

### Conjunto reservado propuesto: diez conversaciones, veinte turnos

Se propone que un revisor distinto de quien implemente mejoras redacte la versión final, fije la referencia y selle el banco antes de ejecutar. Las siguientes son familias públicas de diseño, **no preguntas reservadas ya selladas**. No se utilizarán para afirmar una validación ciega ni independencia frente al desarrollo.

| Familia | Guion de dos turnos a preparar | Estrato y propósito |
| --- | --- | --- |
| H01 | Otro curso admitido distinto de IA/Marca → seguimiento de contenidos | R/contexto: comprobar generalización dentro de los siete syllabus |
| H02 | Propósito de pruebas → duración con paráfrasis no literal | R histórico/contexto: conservar prueba y advertencia |
| H03 | Catálogo expresado de otra forma → referencia singular sin curso | Q: comprobar el límite léxico sin exigir una respuesta documental |
| H04 | Curso concreto → corrección a otro curso admitido | R/corrección: cambiar fuente, sin mezclar temas |
| H05 | Consulta de regla vigente de otro periodo → aclaración del periodo | P/N: no trasladar automáticamente 202660 |
| H06 | Curso antiguo aprobado → mención de prueba antigua pendiente | P/corrección: distinguir dos objetos sin homologación personal |
| H07 | Relato de solicitud aceptada → pregunta por repetición posterior | P/N: separar testimonio, primera presentación y repetición |
| H08 | Pregunta mixta de contenido admitido y costo no admitido → precisión del costo | P/N: responder lo conocido sin inventar el resto |
| H09 | Tema completamente ajeno al corpus → insistencia en obtener autorización | N: límite útil sin fuente vecina ni regla inventada |
| H10 | Referencia sin antecedente en chat nuevo → aclaración que identifica un curso | Q→R: pedir contexto y luego aprovecharlo |

Diseño inicial propuesto: 43 turnos de desarrollo más 20 reservados = 63 turnos, no 63 preguntas independientes. Su número es una decisión de viabilidad pendiente, no un tamaño muestral estadísticamente validado. Se publicará el desglose R/P/N/Q al congelar las redacciones; no se promete equilibrio a partir de estas familias. La amplitud del banco no compensa que solo cubra doce unidades documentales locales.

No ajustar controles o redacciones después de ver resultados para mejorar artificialmente la puntuación. Si se detecta un defecto y se autoriza corregirlo en otra tarea, conservar la versión evaluada y el resultado adverso; abrir otro ensayo y separar desarrollo de evaluación final. Si se usan estas familias en desarrollo, deben sustituirse por otras preguntas reservadas antes de alegar generalización.

### Banco operacional separado

OP01 conserva el T11/3 con timeout; OP02 el REG/2 histórico de causa exacta no demostrada; OP03 la reproducción REG/3 con catálogo y error explícito de contexto; OP04 el fallo de red nativo previo al procesamiento; OP05 el 409 de release antigua real por backend y la UI simulada identificada. Son expedientes históricos, no solicitudes que deban reproducirse ahora.

En una ejecución futura autorizada se verificarán dependencias y resultados inciertos con GET, sin reintentar automáticamente POST. Un seguimiento cuyo antecedente falló se marcará NE. Si se quiere probar el seguimiento por separado, se abrirá otra conversación con antecedentes válidos y se registrará como ensayo nuevo. Las tasas de fallo de estos expedientes seleccionados no estiman frecuencia poblacional.

## 7. T11: decisión de evaluación y posible trabajo posterior

E10 registra dos respuestas genéricas de insuficiencia y, en el tercer turno, consecuencia histórica U03 con advertencia. La protección frente a derechos inventados funciona en lo observado; la orientación no explica el valor ni el límite de los dos casos relatados. **La rúbrica debe revelar esa carencia, no redefinirla como éxito.**

| Tipo de información | Tratamiento exigible en una respuesta útil | Tratamiento prohibido |
| --- | --- | --- |
| Aporte del estudiante: él y otro estudiante solicitaron, y en su relato hubo primera presentación sin costo | Reconocerlo como información relatada, sin pedir nombres, UID, notas o comprobantes personales | Presentarlo como documento institucional verificado o registro consultado por BanuChat |
| Inferencia: pudo existir un procedimiento aplicado a más de un caso | Formularlo como hipótesis razonable limitada; admitir que faltan condiciones, periodo y población | Afirmar política universal o negar que hubiera procedimiento por no encontrar norma |
| Regla documentada: U03/U04 y sus límites | Explicar solo el contenido que corresponda al contexto; condicionar 202660 y distinguir prueba nueva de curso | Forzar U04 si no se mencionó transición/Informática/reconocimiento; tratar un pasaje histórico como autorización actual |
| Pregunta por derecho universal o repetición | Separar primera presentación de otro intento y señalar qué condiciones económicas/procedimentales necesitan confirmación | Concluir que primera prueba gratuita garantiza repetición gratuita |

Criterios mínimos propuestos para una futura aceptación de T11: reconocimiento del origen testimonial; separación explícita entre relato, hipótesis y norma; límite sobre universalidad; distinción primera presentación/repetición; y una aclaración o consulta institucional concreta que no solicite datos personales. No hace falta repetir los cinco puntos en cada turno: deben aparecer donde sean pertinentes, con continuidad y lenguaje natural. Una cita solo se exige si hay una afirmación documental que realmente la necesita.

Decisión propuesta: **evaluar T11 mediante M1, M5 y especialmente M6, y registrar una necesidad de corrección funcional posterior si se desea aceptarlo**. La evidencia actual ya justifica presentar esa necesidad a Sala; este informe no autoriza ni ejecuta el cambio. Una modificación posterior debería generalizar el tratamiento de aportes del estudiante y límites de evidencia, comprobándolo con variantes como H07 y situaciones diferentes. No debe ser una respuesta estática, una excepción por ID T11 ni una expansión indiscriminada de recuperación.

No se produce aquí una respuesta canónica para copiar al generador. Tampoco se reetiqueta el antecedente relatado como evidencia institucional ni se incorporan documentos adicionales.

## 8. Protocolo de ejecución propuesto, sin ejecución en esta tarea

1. **Acordar alcance:** director/equipo revisan objetivos, preguntas de evaluación, condiciones de aceptación y semanas disponibles. Registrar qué queda sin acreditar, especialmente OE2/OE3/OE4/OE6.
2. **Congelar referencia:** versión de banco, corpus/release, criterios R/P/N/Q, pasajes y prohibiciones. Separar desarrollo y reservado; guardar una copia con hash usando medios existentes, sin alterar corpus o releases.
3. **Calibrar revisión:** aplicar el procedimiento de §5 a evidencia de desarrollo, documentar desacuerdos y aprobar criterios antes del reservado.
4. **Preparar condiciones:** un operador; servicios loopback; en caso de Android, USB y compatibilidad real comprobadas. Registrar dispositivo/plataforma, versión de código, release, modelo/receta, recursos disponibles y ausencia declarada de cargas intensivas. No ajustar parámetros para favorecer el ensayo.
5. **Ejecutar solo al recibir autorización posterior:** conversaciones nuevas, sin POST automático repetido; conservar todos los resultados. Utilizar el evaluador existente para lo que cubre y un registro documental para revisión humana, sin construir componentes nuevos. Si las nuevas preguntas requieren cambios del evaluador, solicitar alcance aparte antes de implementarlos.
6. **Revisar respuesta final y persistencia:** cotejar mensajes/citas mediante los mecanismos existentes; anotar error, fallo dependiente y NA/NE. Separar evidencia Android, HTTP y simulada. No reclamar una validación móvil de U03/U04 basada en la UI anterior.
7. **Analizar y entregar:** métricas con denominadores, matriz A/B/C, ejemplos adversos y límites. No sustituir un fallo por su retest ni promover falta de norma a fallo del modelo.

Ficha mínima de registro propuesta, en documentación/tablas existentes: ID de ensayo/caso/turno, partición, etiqueta esperada, antecedentes/dependencias, revisión del código, release, plataforma, fechas/tiempos con zona, estado operacional, pregunta simulada, respuesta final o causa de ausencia, localizadores/citas persistidas, advertencias, pasajes de referencia, puntuaciones y motivos por revisor, conciliación, incidentes y enlace a evidencia privada. No almacenar secretos, expedientes ni identificadores de participantes en esa ficha.

## 9. Viabilidad, privacidad y eventual participación humana

La primera fase usa un solo operador del equipo, preguntas simuladas y corpus seleccionado local. La API permanece en `127.0.0.1`, sin LAN ni túnel público; PostgreSQL CCD permanece separado de la demo sintética. El contexto técnico compartido carece de autenticación: la lista volátil de chats de la apertura solo limita la interfaz. Otro proceso con acceso local puede consultar el backend. No hay sesión privada por estudiante ni aislamiento multiusuario.

Los revisores pueden leer resultados depurados sin operar simultáneamente el servicio. No se les asignan perfiles ficticios como si fueran autenticación. Las capturas deben excluir notificaciones, nombres y documentos personales; los originales restringidos y trazas privadas no se adjuntan a entregables públicos. Proponer custodia por el equipo en ubicación local ya controlada, acceso limitado a responsables y plazo de conservación acordado antes de recolectar datos; no se borra evidencia histórica para cumplir un plazo nuevo no aprobado.

Una eventual fase con personas requiere, antes de organizarla: aprobación académica y revisión ética/institucional que corresponda según el proceso aplicable, permiso sobre materiales y dispositivos, protocolo de privacidad y custodia, consentimiento comprensible y voluntario, derecho a interrumpir, tareas sin datos personales reales, responsable de incidentes y mecanismo de anonimización de notas. Estos son requisitos propuestos de preparación, no una certificación de cumplimiento legal o autorización ya obtenida.

No se propone poner el backend actual a disposición multiusuario. Antes de una sesión posterior supervisada con participantes, el equipo debe resolver explícitamente cómo impedir exposición de conversaciones de otros operadores en este backend sin autenticación. Si eso exige cambios de seguridad, se requiere decisión y tarea aparte; la lista de IDs del cliente no basta. No iniciar reclutamiento ni prometer número de estudiantes. Las exigencias de población/muestra del anteproyecto deben conciliarse con la dirección; una revisión del equipo no las reemplaza.

Las tareas candidatas de interfaz son cinco: precisar el curso tras un catálogo; continuar IA y corregir a Marca; localizar y abrir la fuente correspondiente; interpretar la limitación temporal del contacto; y recuperar un error controlado sin envío duplicado. Primero pueden prepararse y revisarse por el equipo. No se provoca un error operacional ni se ejecuta un ensayo ahora. Si después se evalúan con participantes, deben separarse ayudas del moderador, comprensión del contenido y éxito mecánico de navegación.

## 10. Cronograma relativo y entregables

Propuesta modular de **seis semanas de evaluación después de su aprobación**, si realmente están disponibles dentro del horizonte aproximado de 16 semanas del proyecto. R1 no es una semana académica ya transcurrida ni una fecha de entrega. El director debe ubicar R1–R6 en el calendario real. La corrección eventual de T11 y una fase con participantes no están incluidas como trabajo ya autorizado ni como dependencias de plazo garantizadas.

| Ventana relativa / actividad | Entregable | Responsable por rol | Criterio de terminación | Relación con OE |
| --- | --- | --- | --- | --- |
| R1: acordar alcance y evidencia | Protocolo aprobado o lista explícita de objeciones; mapa de compromisos y registro de fuentes | Dirección académica decide; equipo de desarrollo prepara; Sala revisa | Tiempo restante, alcance, criterios y restricciones documentados; sin afirmar aprobación tácita | OE1, OE5, OE6; brechas OE2/OE3/OE4 visibles |
| R2: banco y referencias | Banco versionado de desarrollo/reservado; R/P/N/Q, pasajes y dependencias; ficha de registro | Responsable documental y revisor académico | Cada turno tiene criterio verificable; reservado separado del ajuste del sistema; tamaño y denominadores aprobados | OE1; parte documental de OE3 |
| R3: calibración y preparación controlada | Rúbrica calibrada, desacuerdos y condiciones de ejecución; guiones de cinco tareas de interfaz | Revisores del equipo; operador técnico | Criterios interpretables, responsables disponibles y evidencia privada preparada; decisión explícita sobre T11 | OE1, OE5, OE6 parcial |
| R4: ejecución local autorizada | Reportes completos y fallidos de un ensayo predefinido; registros por turno y plataforma | Un operador técnico; observador del equipo si disponible | Se contabilizan todos los turnos planificados; dependientes NE; persistencia comprobada; sin reintentos automáticos | Integración parcial OE3/OE6; OE5 solo en recorridos de interfaz efectivamente realizados |
| R5: revisión y análisis | Métricas, conciliación, matriz A/B/C y riesgos; contraste desarrollo/reservado | Revisores; responsable de evaluación | Numeradores/denominadores/NA/NE trazables; resultados adversos retenidos; no se confunde utilidad y HTTP | OE1, OE5 y evaluación parcial OE6 |
| R6: informe y defensa del alcance | Informe final con anexos depurados, limitaciones, decisiones pendientes y material de demostración | Equipo de proyecto; dirección revisa | Cada conclusión enlaza evidencia; alcances no probados declarados; aceptación o devolución registrada | Síntesis transversal, sin declarar cumplidos OE no evaluados |
| Condicional, fuera del camino comprometido | Protocolo de participación humana y decisión de viabilidad; eventualmente informe separado | Dirección y responsables institucionales/éticos competentes | Solo tras autorizaciones, condiciones de privacidad y seguridad resueltas; no se presupone fecha ni muestra | OE5/OE6 originales, si se mantiene y autoriza ese estudio |

Si quedan menos de seis semanas, propuesta a decidir: combinar R1–R2 y R5–R6, conservar revisión documental, errores y separación reservado/desarrollo, reducir explícitamente el banco antes de ejecutarlo y diferir participación humana. Si ni eso es viable, entregar una evaluación retrospectiva con evidencia existente, declarando que no hay evaluación reservada nueva. No acortar eliminando resultados fallidos ni transformar documentación en validación ejecutada. No se afirma que cuatro, seis o dieciséis semanas estén disponibles hoy.

Si se autoriza una corrección de T11, se estima y planifica aparte antes de fijar la versión de evaluación final. No consumir la ventana de análisis repitiendo inferencias indefinidamente ni ampliar el proyecto para implementar los objetivos pendientes sin decisión académica.

## 11. Riesgos y decisiones para revisión

| Riesgo | Consecuencia sobre las conclusiones | Tratamiento propuesto / decisión |
| --- | --- | --- |
| Evaluar solo casos usados para ajustar reglas | Sobreestimación de calidad y generalización | Banco reservado independiente y variantes fuera del patrón; declarar contaminación si ocurre |
| Corpus reducido e histórico | Respuestas limitadas por evidencia, no necesariamente por modelo | Etiquetar R/P/N/Q y evaluar utilidad del límite; conservar periodos y población |
| PASS técnico confundido con aceptación académica | T07 histórico o T11 quedarían ocultos | Rúbricas humanas y matriz A/B/C separadas; errores críticos visibles |
| Un solo operador y dispositivo | No representa estudiantes ni diversidad móvil | Alcance controlado explícito; participación posterior solo condicionada |
| Variabilidad Ollama o cargas simultáneas | Guiones interrumpidos y comparación inválida de tiempos | Registrar recursos/condiciones, fallos y NE; no cambiar parámetros o descartar fallos para pasar |
| Cambios de versión entre ensayos | Comparaciones no atribuibles a una intervención | Fijar revisión, release, banco y receta; separar ensayos por versión |
| Revisores del mismo equipo o referencia incompleta | Sesgo de confirmación, desacuerdo sobre respaldo | Revisión independiente cuando sea posible, calibración, pasajes y motivos; declarar revisión única |
| Sesgo por longitud de conversación o falta de respuesta | Promedios engañosos y denominadores variables | Reportar por turno, conversación y estrato; separar completitud y contenido |
| Historial compartido sin autenticación | Exposición de información ajena | Solo operador local; sin datos reales; no habilitar participantes hasta decisión de seguridad |
| Compromisos originales exceden el prototipo/plazo | Informe afirma cumplimiento que no demuestra | Dirección decide alcance y sustituciones; no reescribir objetivos por cuenta propia |
| T11 mejora solo mediante plantilla puntual | Sobreajuste sin capacidad conversacional | Mantener C actual; eventual cambio general y pruebas reservadas bajo autorización aparte |

Decisiones solicitadas para una fase posterior: alcance académico aceptable y tiempo disponible; referencia y rúbricas; responsables/revisores; tamaño y separación del banco; criterios provisionales de aceptación; necesidad de corrección funcional de T11; y viabilidad o diferimiento formal del estudio con personas. La preparación de este informe no resuelve ninguna por aprobación implícita.

## CHECKPOINT BANUCHAT

Informe de diseño preparado con inventario trazable, diez métricas, rúbricas, banco inicial de 43 turnos, propuesta reservada de 20 turnos, expedientes operacionales, tratamiento de T11, plan relativo y riesgos. No se presentan puntuaciones humanas nuevas, umbrales aprobados ni resultados de participantes.

Comprobaciones de esta tarea: HEAD y limpieza inicial; lectura de checkpoints académicos/BCH-02/BCH-03 y reportes privados seleccionados; cotejo por lectura de 329/329, 43/43 y 41 citas; revisión documental de enlaces y alcance; `git diff --check` al cierre. No se ejecutaron tests de código, cargas, ingestas, solicitudes de chat, Docker/Ollama, pruebas móviles ni sesiones con participantes: el único cambio es documental.

Backend, Mobile, corpus, SQL, releases, embeddings, contratos, datos sintéticos y evidencia histórica se conservan. Sin nuevas dependencias, componentes, commit ni push. T11 y los errores menores del observador no se corrigen. **Detenerse para revisión de Sala de Control; no iniciar la evaluación ni dar por aprobada la metodología.**
