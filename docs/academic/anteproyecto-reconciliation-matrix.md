# Matriz de reconciliación académica de BanuChat

## 1. Propósito

**A4.1 — cotejado contra el anteproyecto original, 2026-10-16.** Esta revisión
corrige A4 mediante lectura directa completa de las **27 páginas** del PDF, incluida
la inspección visual de las figuras 1 y 2 y de las tablas de cronograma y tecnologías.
La pregunta, el objetivo general y OE1–OE6 se transcriben desde la fuente primaria.
No se reescribe el anteproyecto ni se modifican sus objetivos fuera de esta matriz.

HEAD esperado y comprobado: `2bcdabb574315cb94d1827e43649c8e94ebec88d`.
Árbol limpio al iniciar A4.1. Los cuatro documentos académicos/discovery ya están
versionados; solo se modifica esta matriz. La comparación Git con el HEAD de A4
muestra únicamente la incorporación de esos cuatro documentos, sin cambios de
implementación. Se contrastaron además composición del runtime, estado MCP,
Mobile, Compose y workflow manual. Las pruebas históricas no se ejecutaron de nuevo.

### Fuentes, precedencia y método

| Clase | Referencia | Fuente y alcance |
| --- | --- | --- |
| SOURCE_A | A0 — Anteproyecto original completo | [PDF original](C:/Users/samue/Downloads/PGI_63765_AutomatizaciónCCD_RouteAI.pdf), 27 páginas, portada 2026. Fuente de lo que el documento promete; no acredita implementación, realidad institucional ni aprobación. |
| SOURCE_B | E1 | [AGENTS.md](../../AGENTS.md), [README](../../README.md), [arquitectura](../arquitectura.md): alcance técnico vigente y estado documentado. |
| SOURCE_B | E2 | [ADR 0001](../adr/0001-alcance-sintetico-y-despliegue-local.md): decisión interna sintética/local, no sustitución académica de A0. |
| SOURCE_B | E3 | [Runtime](../../backend/api/src/main.ts), [dispatcher](../../backend/api/src/chat/chat-dispatcher.ts), [MCP](../../backend/mcp-server/README.md), [Compose](../../infra/docker-compose.yml): REST/router/RAG directo, contrato MCP y contenedores declarados. |
| SOURCE_B | E4 | [Workflow manual](../../n8n/workflows/ingestion-manual-v1.json), [N3](../../eval/ingestion/results/n3-n8n-e2e-2026-10-02.md): orquestación manual local y evidencia histórica acotada. |
| SOURCE_B | E5 | [K2](../../eval/retrieval/results/k2-v1-2026-10-01.md): retrieval sintético, no calidad generativa o impacto CCD. |
| SOURCE_B | E6 | [L1-B](../../eval/generation/results/l1-b-rag-latency-2026-10-03.md): diez solicitudes warm secuenciales locales; no SLA ni cumplimiento integral de OE6. |
| SOURCE_B | E7 | [M9](../../eval/rag-quality/README.md), [benchmark](../../eval/rag-quality/benchmark-v1.json): 63 candidatas draft, sin evaluación RAGAS ejecutada. |
| SOURCE_B / SOURCE_D | E8 | [Re-baseline](banuchat-rebaseline-2026-10.md): hechos técnicos, límites y decisiones provisionales distinguidos en su texto. Su limitación histórica corresponde a aquella revisión y no se edita aquí. |
| SOURCE_C | C1 | [Matriz CCD](../discovery/ccd-information-matrix.md): CP-01–CP-04 reportados por el equipo, 40 preguntas y fuentes pendientes. No originales públicos verificados ni autorización. |
| SOURCE_C | C2 | [D3](../discovery/ccd-conceptual-domain-model.md): conceptos/relaciones candidatos, Curso frente a Oferta, vigencia y fronteras personales; no modelo institucional aprobado. |
| SOURCE_B | E9 | [Evaluaciones](../../eval/README.md), [Mobile](../../mobile/README.md): implementación y verificaciones por etapas; SUS, usuarios formales y push pendientes. |
| SOURCE_D | Esta auditoría | Inferencias de coherencia/viabilidad y recomendaciones para decisión. No atribuirlas a A0, al CCD o al director. |

Identidad de A0: SHA-256
`F1C97304C52415DFA348201C1265DAC47ED208ABA9E30F542498FD0D08B90E7A`.
El enlace es local y depende de conservar el archivo; hash, nombre, sección y
página permiten identificar la copia sin incorporarla al repositorio.

Las páginas citadas son posiciones PDF **1–27, contando portada**, coherentes con
el índice. Las citas literales normalizan únicamente espacios y saltos de línea;
se conserva vocabulario, puntuación y nombre histórico. Los resúmenes se identifican
como tales. Se leyó todo el texto extraíble y se revisaron visualmente las únicas
dos imágenes incrustadas, las tablas y los enunciados/umbrales centrales; no quedaron
páginas ilegibles o contenido inaccesible identificado.

A0 prueba el compromiso escrito, **no su aprobación o radicación formal**. Ese
estado administrativo continúa sin evidencia aportada. Un ADR técnico no equivale
a autorización del director/facultad. El PDF tampoco autoriza usar documentos CCD
o acceder a sistemas. No se realizó investigación web ni conexión institucional.

### Inventario de cotejo previo a la corrección

Los 40 puntos siguientes son resúmenes fieles de SOURCE_A, con localizador y
destino en esta matriz. Las contradicciones no se corrigen dentro de A0.

| Nº | Elemento | Hallazgo en A0 | Localizador A0 / análisis aquí |
| --- | --- | --- | --- |
| 01 | Título | Automatización inteligente de gestión de información CCD mediante RAG y orquestación; nombre histórico. | p. 1 / §3 |
| 02 | Introducción | Tres pilares, dispersión, sobrecarga, Agentic AI, RAG/N8N, Mobile y servidores UNAB. | p. 4, §1 / §4 y §9 |
| 03 | Problema | Desactualización, contradicciones, consultas repetitivas, ausencia de solución móvil unificada y consulta personal en tiempo real. | p. 4, §2.1 / §4 |
| 04 | Árbol | Causas directas/indirectas, problema central, consecuencias y efectos; incluye falta de base vectorial como causa. | p. 5, figura 1 / §4 |
| 05 | Pregunta | RAG y N8N forman parte del enunciado; centralización, optimización, reducción de carga y experiencia. | p. 5, §2.3 / §5 literal |
| 06 | Justificación | Garantías de exactitud, autonomía, acceso y soberanía; presupone servidores disponibles. | pp. 5–7, §3 / §4, §9 y §12 |
| 07 | Objetivo general | Artefacto, RAG/base vectorial, N8N y React Native para dominio CCD y beneficios. | p. 7, §4 / §6 literal |
| 08 | OE1 | Motor PostgreSQL + pgvector/RAG con documentos oficiales verificados. | p. 7, §5.1 / §7 |
| 09 | OE2 | RPA basada en scraping periódico de oferta, convocatorias y novedades. | p. 7, §5.2 / §7 |
| 10 | OE3 | Enfoque agéntico, RAG, embeddings/pgvector y MCP explícitos. | p. 7, §5.3 / §7 |
| 11 | OE4 | BPM/N8N para lógica y flujos conversacionales con agente y fuentes estructuradas/no estructuradas. | pp. 7–8, §5.4 / §7 |
| 12 | OE5 | React Native y UX intuitiva, accesible y optimizada para consulta académica. | p. 8, §5.5 / §7 |
| 13 | OE6 | On-Premise universitario/Docker, integración, precisión y usuarios reales UNAB. | p. 8, §5.6 / §7 |
| 14 | Marco de referencia | Tres pilares y contexto informativo institucional; no demuestra por sí mismo su vigencia. | p. 8, §6 / §4 y §8 |
| 15 | Corpus | Propuesta de Competencias Digitales, lineamientos diagnósticos, guías y resoluciones. | p. 8, §6 / §8 |
| 16 | Arquitectura | Figura agéntica; cuatro capas en §11.4; tres capas en anexo C. | pp. 10–11, 19, 24 / §9 |
| 17 | RAG | Recuperación documental y generación; garantías formuladas en términos absolutos. | pp. 6, 9, 19, 24–25 / §9 y §12 |
| 18 | PostgreSQL/pgvector | Almacenamiento relacional/vectorial, embeddings y similitud coseno. | pp. 7, 9, 11, 19, 24 / §9 |
| 19 | N8N | Orquesta consultas/BPM y, en paralelo, ingesta, scraping, calendarios y notificaciones. | pp. 6, 9–12, 18–21 / §9 |
| 20 | RPA/scraping | Captura periódica web; tabla tecnológica selecciona N8N HTTP + Cheerio. | pp. 7, 12, 20, 24 / §7 y §9 |
| 21 | Agentic AI | Obligación OE3; resultados precisan ReAct y selección dinámica. | pp. 7, 10–12, 20 / §7 |
| 22 | MCP | Obligación OE3; servidor y código/documentación de interfaces exigidos. | pp. 7, 11–12, 20–21 / §7 |
| 23 | BPM | Reglas académicas, ciclo de consulta y gobierno de flujos N8N. | pp. 7–8, 12, 18 / §7 y §9 |
| 24 | Google Sheets | Calendarios; integración y máximo de 30 minutos de sincronización. | pp. 6, 9, 11, 20–22 / §9 y §12 |
| 25 | React Native | Exigido en OE5; tabla de opciones seleccionadas también enumera Flutter. | pp. 8, 10, 18–19, 21, 23 / §9 |
| 26 | Docker | Despliegue de la solución en servidores locales universitarios. | pp. 4, 7–8, 18, 21–24 / §9 |
| 27 | On-Premise | Compromiso explícito, no mera posibilidad; viabilidad y costo se dan por garantizados. | pp. 7–8, 21, 24 / §7 y §12 |
| 28 | Metodología | Investigación aplicada, iterativa/incremental, enfoque mixto. | p. 17, §11.1 / §10 |
| 29 | DSR | Artefacto evaluado en condiciones de uso real; referencia Hevner. | p. 17 / §10 |
| 30 | Scrum/adaptación | Cuatro fases en 16 semanas; adaptación académica declarada. | pp. 17–18 / §10 y §13 |
| 31 | Entrevistas | Coordinador CCD y muestra de 10–15 estudiantes; cuestionario de caracterización. | p. 18, §11.3 / §10 |
| 32 | Usuarios | Muestra mínima de 10 usuarios reales de distintos programas para OE5; pilotos CCD en OE6. | pp. 8, 18, 21 / §10 y §12 |
| 33 | SUS | 10 ítems, promedio >70, ningún individuo <50, cinco tareas con completación >85 %. | pp. 18, 21, 25 / §12 |
| 34 | RAG/RAGAS | 50–80 preguntas generadas sintéticamente desde documentos institucionales, cinco métricas. | p. 20 / §11 y §12 |
| 35 | Resultados | Sistema integrado de nivel industrial, agentes/BPM/MCP y alta disponibilidad; documentación y caso de estudio. | pp. 19–22 / §12 |
| 36 | Métricas/umbrales | Metas por OE, con bases y criterios diferentes; algunas sin protocolo operacional completo. | pp. 20–21 / §12 |
| 37 | Cronograma | 16 semanas del semestre 2026-2, tabla y cinco hitos; diferencias frente a fases narradas. | pp. 17–18, 22–23 / §13 |
| 38 | Tecnologías | Selecciones y alternativas de DB, N8N, LLM externo/local, móvil, infraestructura y scraping. | pp. 23–24, tabla 4 / §9 |
| 39 | Ética | Abstención, fuentes, accesibilidad, consentimiento/minimización/anonimización, riesgo mínimo autodeclarado y consulta no vinculante. | pp. 15–17 / §10 |
| 40 | Referencias | Bibliografía en construcción; artículos, herramientas, normas y afirmaciones requieren verificación externa posterior. | pp. 13–16, 25–27 / §12 |

### Correcciones sustanciales respecto de A4

- Se sustituye H1 por A0 para la historia: pregunta, objetivo general y los seis OE
  están disponibles y cotejados. La pregunta P0 sobre conseguir el texto desaparece.
- OE3 exige Agentic AI/MCP y OE4 exige N8N en la conversación; no son solo menciones
  teóricas ni compromisos que deban suponerse. On-Premise universitario es explícito.
- A0 ya dispone perfiles estudiantiles **sintéticos** en el resultado OE4. La brecha
  de corpus institucional no se puede extender indiscriminadamente a esos perfiles.
- Las guías completas sin indexación vectorial ya estaban previstas en A0, pp. 8/24.
  El patrón actual es coherente en ese aspecto, aunque sus artefactos sean ficticios.
- RAGAS y los umbrales provienen de §12.2, no del texto literal de OE1. Las preguntas
  sintéticas prometidas se derivan de documentos institucionales; no equivalen a
  preguntas sobre documentos enteramente sintéticos.
- Se recuperan los compromisos omitidos o poco precisos: tres flujos automáticos
  de scraping, cinco tareas UX, mínimo diez usuarios, notificaciones push, latencia
  de calendario ≤30 min, cobertura del 100 % y respuesta promedio **≤5 s**.
- Se documentan tensiones propias de A0: capas/rutas, hitos/fases, Flutter en tabla
  de selección, perfiles ficticios frente a personalización/credenciales, absolutos
  de disponibilidad y soberanía frente a tolerancias/LLM externo.
- Las 16 semanas ya tienen ubicación histórica: semestre 2026-2. Sigue faltando
  confirmar cuánto tiempo queda y qué replanificación está aprobada.

## 2. Convenciones de clasificación

SOURCE_A/B/C identifican evidencia histórica, técnica y de discovery; SOURCE_D
identifica inferencias/recomendaciones. Las clasificaciones siguientes son juicios
académicos de esta auditoría, no estados de aprobación. Se combinan con `;`.

| Clasificación académica | Definición |
| --- | --- |
| CONSISTENT | Coherencia en el aspecto comparado, sin acreditar cumplimiento integral. |
| NEEDS_REWORDING | La formulación requiere precisión de alcance, mecanismo o resultado. |
| NEEDS_EVIDENCE | Falta respaldo para validar una afirmación o acreditar el compromiso. |
| NEEDS_DIRECTOR_APPROVAL | Cambiar el compromiso requiere decisión del director y confirmación del proceso académico aplicable. |
| TECHNICALLY_OBSOLETE | La descripción histórica no representa el runtime vigente; no elimina la obligación académica. |
| SCOPE_RISK | Amplitud o dependencias amenazan una entrega verificable en el plazo. |
| UNSUPPORTED | La afirmación no tiene respaldo suficiente en las fuentes leídas; no equivale a falsedad demostrada. |
| KEEP_PROVISIONAL | Elemento plausible sujeto a evidencia y decisiones pendientes. |

Etiquetas locales de métricas (§12): `PROJECT_DEFINED_TARGET` = criterio elegido
por el proyecto; `EXTERNAL_STANDARD` = estándar externo cuya autoridad/aplicación
debe acreditarse; `UNSUPPORTED_TARGET` = meta sin sustento de factibilidad o
demostración suficiente; `AMBIGUOUS_TARGET` = faltan definición, denominador,
condiciones o criterio operativo. Pueden coexistir. Ningún umbral numérico de A0
se certifica aquí como EXTERNAL_STANDARD. `REFERENCE_NEEDS_VERIFICATION` marca
fuentes/afirmaciones para revisión posterior, sin declararlas falsas.

§13 conserva MUST_HAVE/SHOULD_HAVE/FUTURE como prioridades propuestas; §18 usa
MVP_ACADEMIC_DEFENSIBLE, DESIRABLE, FUTURE y OUT_OF_SCOPE_CANDIDATE. No sustituyen
la clasificación académica ni autorizan exclusiones.

## 3. Cambio de nombre

Título histórico literal, A0 p. 1:

> Sistema de Automatización Inteligente para la Gestión de Información Académica del Centro de Competencias Digitales (CCD) mediante Arquitectura RAG y Orquestación de Flujos (Route AI)

**Nombre vigente: BanuChat**, SOURCE_B/E1. El nombre anterior aparece aquí solo
en citas o identificación de A0. En una futura versión académica deberán revisarse
portada, títulos, figuras, instrumentos, anexos y referencias internas conservando
la identidad del original. Clasificación: NEEDS_REWORDING;
NEEDS_DIRECTOR_APPROVAL respecto de su formalización académica.

El cambio de nombre por sí solo no cambia problema, objetivos, corpus,
arquitectura, metodología o alcance. No se modifica A0 ni se presume aprobación.

## 4. Planteamiento del problema

SOURCE_A, §1/§2.1/§6, pp. 4/8, afirma problemas institucionales; SOURCE_B prototipa
consulta estructurada/documental sobre ficción controlada. SOURCE_C reporta varios
canales y dominios, pero no acredita frecuencia, carga, desactualización o ausencia
de soluciones. Que A0 contenga la afirmación no demuestra que la institución la
haya confirmado ni que hoy siga vigente.

| Afirmación de A0 | Evidencia actual B/C y pendiente | Juicio SOURCE_D / clasificación | Dirección de corrección propuesta |
| --- | --- | --- | --- |
| Fragmentación y omnicanalidad sin unificación, p. 4 | C1 reporta canales distintos; falta mapa validado de fuentes, tareas y discontinuidades. | Pluralidad no prueba fragmentación problemática. NEEDS_EVIDENCE; NEEDS_REWORDING. | Describir brechas observables y su población/contexto. |
| Consultas repetitivas y alta carga administrativa, p. 4 | No hay registros institucionales o línea base de volumen/tiempos acreditados. | UNSUPPORTED; NEEDS_EVIDENCE. | Formular hipótesis a contrastar y acordar medición antes de prometer reducción. |
| Información desactualizada/contradictoria, p. 4 | C1/C2 reconocen temporalidad; no aportan casos comprobados contra fuente competente. | NEEDS_EVIDENCE; NEEDS_REWORDING. | Documentar ejemplos, fechas, fuentes y reglas de prevalencia. |
| Herramientas actuales estáticas/manuales, sin razonamiento semántico ni integración real, p. 4 | No se inspeccionaron sistemas institucionales. | UNSUPPORTED; NEEDS_EVIDENCE. | Levantar capacidades reales; no convertir ausencia de inspección en inexistencia. |
| Ningún sistema institucional unifica recuperación y automatización en una solución móvil, p. 4 | No hay inventario institucional completo ni comparación verificable. | UNSUPPORTED; NEEDS_REWORDING. | Delimitar la brecha frente a servicios existentes y verificar la exclusividad. |
| Cupos por pilares, perfil e historial personal en tiempo real, pp. 4/6 | C2 distingue Curso/Oferta, estado personal y cupos sin fuente confirmada. E9 solo perfiles ficticios. | SCOPE_RISK; NEEDS_EVIDENCE. | Acordar si se trata de orientación, demostración sintética o consulta autorizada; no prometer acceso vivo. |
| Mejora sustancial/total accesibilidad y exactitud garantizada, justificación pp. 6–7 | E5/E6/E9 son evidencia técnica parcial; sin estudio de mejora, accesibilidad formal o impacto. | UNSUPPORTED; NEEDS_REWORDING. | Sustituir absolutos por resultados acotados que puedan evaluarse con un protocolo aceptado. |

**Árbol del problema, A0 p. 5, figura 1 (lectura visual):** el centro es la dificultad
de acceso centralizado y eficiente a información académica/administrativa CCD.
Causas directas: fragmentación; inexistencia de canal automatizado 24/7; chats sin
contexto institucional real. Indirectas: carencia de una base vectorial unificada,
actualización manual y falta de integración calendario–datos estudiantiles.
Consecuencias: inscripción tardía por desconocimiento, respuestas imprecisas y
dificultad de escalar soporte. Efectos: deserción/falta de interés, sobrecarga de
canales y percepción de obsolescencia tecnológica.

SOURCE_D: el árbol incorpora una solución elegida (base vectorial) como causa de
un problema organizacional sin demostrar su necesidad. La cadena causal hasta
deserción no tiene medición aportada. Clasificación NEEDS_EVIDENCE; UNSUPPORTED;
NEEDS_REWORDING. Debe revisarse con evidencia, sin tratar sus flechas como causalidad
validada. No se redibuja ni se cambia el árbol original en esta tarea.

La justificación §3.5, p. 7, presupone servidores proporcionados y viabilidad
garantizada. Su presencia escrita no acredita acceso, capacidad, soporte o costos;
esas dependencias siguen abiertas en SOURCE_C.

## 5. Pregunta de investigación

**Transcripción literal de SOURCE_A, A0 §2.3, p. 5:**

> ¿De qué manera el diseño e implementación de un sistema de automatización inteligente basado en arquitectura RAG (Retrieval-Augmented Generation) y orquestación de flujos con N8N puede centralizar y optimizar el acceso a la información académica del Centro de Competencias Digitales (CCD) de la UNAB, reduciendo la carga administrativa y mejorando la experiencia de consulta de los estudiantes?

| Dimensión | Cotejo e inferencia SOURCE_D |
| --- | --- |
| Fenómeno | Acceso a información académica CCD y su relación con carga administrativa y experiencia de consulta. |
| Resultado planteado | Centralizar/optimizar, reducir carga y mejorar experiencia; son resultados a investigar, no efectos demostrados. |
| Tecnologías prescritas | RAG y N8N están dentro del enunciado, no solo en el diseño posterior. Son mecanismos y a la vez condiciones constitutivas de la solución investigada. |
| Coherencia con B | Existe artefacto móvil/RAG y orquestación de ingesta; no se ha medido reducción de carga, optimización institucional ni mejora comparativa de UX. |
| Coherencia con C | Necesidad, población, fuentes y tareas aún por validar; consulta documental y estructurada pueden requerir mecanismos distintos. |
| Riesgo de formulación | La pregunta preselecciona solución y beneficios sin explicitar comparación, línea base, instrumento o límites del corpus. No obliga literalmente a usar RAG en toda consulta, pero §11.4 sí generaliza el recorrido documental. |
| Dirección de corrección | Acordar resultado evaluable, corpus y población; justificar los mecanismos sin dar por logrado el efecto institucional. Cambiar el enunciado requiere aprobación. |

Clasificación: **KEEP_PROVISIONAL** para la necesidad investigable;
**NEEDS_REWORDING; NEEDS_EVIDENCE; NEEDS_DIRECTOR_APPROVAL; SCOPE_RISK** para alcance,
beneficios y prescripción tecnológica. Se conserva la pregunta histórica, sin
redactar ni aprobar su sustituta.

## 6. Objetivo general

**Transcripción literal de SOURCE_A, A0 §4, p. 7:**

> Diseñar e implementar un sistema de automatización inteligente para la gestión y consulta de información académica del Centro de Competencias Digitales (CCD) de la UNAB, mediante la integración de una arquitectura RAG sobre base de datos vectorial, flujos de orquestación automatizados en N8N y una aplicación móvil multiplataforma desarrollada en React Native, con el fin de centralizar el acceso a la información institucional, reducir la carga administrativa y mejorar la experiencia de los estudiantes en la adopción de la Ruta de Competencias Digitales.

| Fragmento/compromiso histórico | Estado B / contraste C | Clasificación y decisión propuesta D |
| --- | --- | --- |
| Diseñar e implementar un sistema para gestión y consulta | Hay prototipo implementado; C2 propone consulta informativa y separa transacciones. | CONSISTENT; NEEDS_REWORDING. Precisar qué significa gestión; §10.5 de A0 limita el asistente a consulta no vinculante. |
| RAG sobre base vectorial | PostgreSQL/pgvector y RAG directo presentes; falta corpus institucional y evaluación formal. | CONSISTENT; NEEDS_EVIDENCE. No equiparar implementación con validación integral. |
| Flujos automatizados N8N | Ingesta manual local; A0 OE4/figura 2 incluyen conversación y reglas. | TECHNICALLY_OBSOLETE; NEEDS_DIRECTOR_APPROVAL. Resolver función, automatismo y vínculo con OE2/OE4. |
| Aplicación React Native multiplataforma | Base Expo/React Native implementada y verificaciones Android reportadas; no garantía de toda plataforma/condición. | CONSISTENT; NEEDS_EVIDENCE. Validar cobertura y UX exigidas. |
| Información institucional CCD | Documentos y datos funcionales ficticios; C1/C2 no aportan corpus autorizado. | NEEDS_DIRECTOR_APPROVAL; SCOPE_RISK. Resolver alcance de documentos oficiales frente a baseline sintético. |
| Centralización, reducción de carga y mejora en adopción de la ruta | Sin línea base institucional, estudio comparativo ni evidencia de adopción. | UNSUPPORTED; NEEDS_REWORDING; NEEDS_EVIDENCE. Acordar indicadores/método o acotar formalmente los beneficios. |

Agentic AI, MCP, Docker y On-Premise **no están nombrados en el objetivo general**;
sí son compromisos expresos en OE3/OE6 y otras secciones. No deben añadirse a su
transcripción ni ignorarse al evaluar el alcance total. El objetivo general
prescribe RAG, base vectorial, N8N y React Native. La cadena problema → pregunta →
objetivo → artefacto → evaluación sigue requiriendo reconciliación académica.

## 7. Objetivos específicos

Cada cita es SOURCE_A, A0 §5; las filas de validación provienen de §12.2 cuando se
indica. Actividad implícita, brecha, necesidad/viabilidad y decisiones son SOURCE_D;
no se presentan como texto literal. Los seis objetivos se conservan con sus
entregables e impactos. Clasificar una parte CONSISTENT no acredita el OE completo.

### OE1 — Motor semántico, corpus institucional y evaluación

**Transcripción literal, A0 p. 7:**

> Construir un motor de búsqueda semántica mediante la implementación de una base de datos vectorial con PostgreSQL + pgvector y arquitectura RAG, que permita indexar documentos institucionales del CCD y garantizar que las respuestas del sistema se fundamenten exclusivamente en información oficial y verificada.

| Elemento | Cotejo y decisión |
| --- | --- |
| Texto/alcance histórico | Motor PostgreSQL + pgvector/RAG para indexar documentos CCD y fundamentar exclusivamente en información oficial verificada. RAGAS no aparece en la oración del OE; sí en su resultado §12.2, p. 20. |
| Actividad implícita | Obtener corpus autorizado, distinguir documentos vectorizables/completos, indexar, recuperar, generar y verificar respaldo. |
| Entregable | Motor y base vectorial con corpus institucional; §12.2 añade evaluación sobre 50–80 preguntas derivadas de esos documentos. |
| Validación prometida | RAGAS: faithfulness ≥0,80, context precision ≥0,80, context recall ≥0,75, answer relevancy ≥0,80; MRR ≥0,70. El PDF no fija k para MRR. Véase §12. |
| Estado repo | E3/E5/E7: RAG y pgvector sobre corpus sintético; K2 retrieval parcial; M9 draft sin ejecución RAGAS. |
| Discovery | C1/C2: fuentes, vigencia, permisos y tareas documentales pendientes. Las guías no deben asumirse corpus fragmentable. |
| Brecha | Corpus oficial y calidad generativa no acreditados. Preguntas generadas sintéticamente desde documentos reales no equivalen a preguntas sobre ficción. |
| Clasificación | CONSISTENT; NEEDS_EVIDENCE; NEEDS_REWORDING; NEEDS_DIRECTOR_APPROVAL; SCOPE_RISK |
| Decisión requerida | Mantener necesidad de respuesta sustentada; decidir corpus aceptable, alcance documental y protocolo, sin acreditar cumplimiento ahora. |
| Impacto de modificarlo | Cambian validez externa, gold, contribución y resultados. Es verificable con corpus/protocolo delimitados; acceso y revisión condicionan cabida en 16 semanas. No se elimina el OE. |

### OE2 — Extracción RPA/scraping y actualización automática

**Transcripción literal, A0 p. 7:**

> Desarrollar los módulos de extracción y actualización automática de datos mediante técnicas de RPA ( Robotic Process Automation ) basados en web scraping periódico, para consolidar e integrar la información dispersa de la oferta académica, convocatorias y novedades del CCD en una base de datos relacional y vectorial.

| Elemento | Cotejo y decisión |
| --- | --- |
| Texto/alcance histórico | Exige extracción y actualización automática mediante RPA basada en web scraping periódico para oferta académica, convocatorias y novedades CCD, en base relacional y vectorial. |
| Actividad implícita | Definir páginas objetivo y permisos, extraer, verificar datos, programar frecuencia, actualizar y medir errores/frescura respecto de la publicación original. |
| Entregable | Módulos de extracción; §12.2, p. 20, concreta pipelines N8N autónomos y frecuencia configurable, no una carga manual. |
| Validación prometida | Al menos tres flujos de scraping automáticos exitosos sin intervención manual durante las pruebas; latencia <24 h desde publicación en sitio CCD; extracción correcta >90 % de documentos sobre páginas objetivo. |
| Estado repo | E1/E2/E4: fuente de verdad sintética versionada; N8N manual delega procesamiento en backend/rag. No scraping real ni scheduling implementado en el workflow. |
| Discovery | Canales técnicos, páginas, permisos, cadencia y autoridad sin confirmar. No se presupone API ni se sustituye su ausencia por scraping. |
| Brecha | La ingesta actual no es RPA y no mide captura desde sitio institucional. E1 cambia el origen del reloj a disponibilidad para ingesta y la métrica a éxito: no son equivalentes al criterio A0. |
| Clasificación | TECHNICALLY_OBSOLETE; NEEDS_EVIDENCE; NEEDS_DIRECTOR_APPROVAL; SCOPE_RISK |
| Decisión requerida | Decidir si conservar técnicas expresas o aprobar sustitución por ingesta controlada con fuente/métrica revisadas. Actualización puede ser necesaria; RPA debe justificarse por la fuente. |
| Impacto de modificarlo | Afecta fuente, mecanismo, número de flujos, frecuencia y denominador. Verificable con acceso y protocolo, pero alto riesgo de tamaño/plazo; 16 semanas no garantizadas. Mantener trazabilidad del OE. |

### OE3 — Núcleo agéntico y MCP

**Transcripción literal, A0 p. 7:**

> Diseñar y construir el núcleo de procesamiento e inteligencia artificial bajo un enfoque agéntico ( Agentic AI ), implementando la arquitectura RAG mediante el almacenamiento de embeddings en pgvector y la estandarización de herramientas de consulta a través del protocolo MCP ( Model Context Protocol ).

| Elemento | Cotejo y decisión |
| --- | --- |
| Texto/alcance histórico | Enfoque Agentic AI, RAG, embeddings en pgvector y estandarización de herramientas mediante MCP son obligaciones explícitas del OE, no solo marco teórico. |
| Actividad implícita | Construir agente y servidor, integrar fuentes/herramientas, definir tareas de varios pasos y comprobar selección, límites y coherencia. |
| Entregable | §12.2, p. 20: LLM con ciclo ReAct, servidor MCP, código de endpoints y documentación de interfaces dinámicas. |
| Validación prometida | Demostración de evaluación autónoma de intención y selección de herramienta MCP adecuada para tareas de múltiples pasos; pruebas de coherencia conversacional. No fija tasa numérica de éxito. |
| Estado repo | E3: Intent Router determinista, servicios y RAG directo; MCP solo contrato de seis tools. No ejecutable ni ciclo ReAct integrado. |
| Discovery | C1/C2 no prueban necesidad de agente ni acceso a las herramientas/fuentes reales. Consultas estructuradas pueden resolverse sin selección generativa. |
| Brecha | RAG/embeddings cubren parte del mecanismo, pero router no es agente y REST no es servidor MCP. El contrato no satisface el entregable operativo. |
| Clasificación | NEEDS_EVIDENCE; NEEDS_DIRECTOR_APPROVAL; SCOPE_RISK; KEEP_PROVISIONAL |
| Decisión requerida | Confirmar mantenimiento, acotación o diferimiento explícito de la obligación ya identificada, con justificación y criterio de selección/control. |
| Impacto de modificarlo | Cambia contribución de autonomía, interfaces, arquitectura y evaluación. Es verificable si se operacionalizan tareas/éxito; construirlo junto a integración real eleva tamaño y riesgo en 16 semanas. No se borra por funcionar el RAG directo. |

### OE4 — BPM/N8N y conversación

**Transcripción literal, A0 pp. 7–8:**

> Orquestar la lógica de interacción, los flujos conversacionales y el cumplimiento de las directrices institucionales bajo principios de BPM ( Business Process Management ) mediante la plataforma N8N, integrando el agente inteligente con los canales de datos estructurados y no estructurados.

| Elemento | Cotejo y decisión |
| --- | --- |
| Texto/alcance histórico | N8N debe orquestar lógica de interacción, flujos conversacionales y cumplimiento de directrices institucionales bajo BPM, integrando agente y canales estructurados/no estructurados. |
| Actividad implícita | Identificar reglas/proceso de consulta, modelar flujos, integrar agente, calendario y perfiles; comprobar tránsito y sincronización. |
| Entregable | §12.2, pp. 20–21: flujos N8N documentados, Google Sheets para calendario y PostgreSQL para perfiles estudiantiles sintéticos. |
| Validación prometida | E2E N8N → pgvector → Backend API → App sin pérdida/corrupción; calendario con latencia máxima 30 min; 100 % de flujos de §11.4 cubiertos por casos documentados. |
| Estado repo | E4: N8N fuera del chat, ingesta manual local; calendario dentro de releases sintéticas, sin Sheets; perfiles ficticios coherentes con ese punto de A0. |
| Discovery | Directrices institucionales, fuente del calendario, procesos y condiciones de acceso pendientes. La mención de plataformas no demuestra interfaces disponibles. |
| Brecha | Cambio sustancial de responsabilidad síncrona a asíncrona, eliminación técnica de Sheets/30 min y validación distinta. Publicación atómica no sustituye automáticamente esos compromisos. |
| Clasificación | TECHNICALLY_OBSOLETE; NEEDS_REWORDING; NEEDS_DIRECTOR_APPROVAL; SCOPE_RISK |
| Decisión requerida | Precisar BPM como modelado de reglas/ciclo de consulta prometido y decidir si se sustituye por orquestación de ingesta. Resolver fuente, tiempo y cobertura, manteniendo visible la coherencia de perfiles sintéticos. |
| Impacto de modificarlo | Afecta arquitectura, reglas, entregables e integración; evitar duplicación con OE2. Flujo acotado es verificable; proceso institucional más agente/Sheets sin accesos es alto riesgo en 16 semanas. No reducirlo a 'usa N8N'. |

### OE5 — Aplicación móvil y UX

**Transcripción literal, A0 p. 8:**

> Desarrollar la interfaz móvil del sistema Route AI utilizando el framework React Native, garantizando una experiencia de usuario intuitiva, accesible y optimizada para la consulta de la ruta académica por parte de los estudiantes.

| Elemento | Cotejo y decisión |
| --- | --- |
| Texto/alcance histórico | React Native para consulta académica con UX intuitiva, accesible y optimizada; la garantía requiere evidencia. |
| Actividad implícita | Construir e integrar app, definir tareas de usuario, probar plataformas/accesibilidad y evaluar uso con instrumento y participantes. |
| Entregable | §12.2, p. 21: consulta en lenguaje natural, calendario, historial de cursos y notificaciones push, integración completa REST. |
| Validación prometida | SUS de 10 ítems, mínimo 10 usuarios reales UNAB de distintos programas; media >70/100, nadie <50/100, completación >85 % de cinco tareas. No enumera esas cinco tareas. |
| Estado repo | E9: Expo 57/React Native, chat/citas, calendario, progreso e historial conversacional sintéticos; push pendiente; verificaciones manuales Android no equivalen a SUS. |
| Discovery | Población, tareas, reclutamiento y cobertura de historial académico por confirmar. Historial conversacional no prueba historial de cursos. |
| Brecha | Base móvil reutilizable, pero faltan push y validación formal exigidos; no se acredita accesibilidad integral ni beneficio comparativo. |
| Clasificación | CONSISTENT; NEEDS_EVIDENCE; NEEDS_DIRECTOR_APPROVAL; SCOPE_RISK |
| Decisión requerida | Mantener canal y delimitar módulos, corpus del historial y protocolo. Diferir push o sustituir población/instrumento requiere aprobación, no reclasificación automática como deseable. |
| Impacto de modificarlo | Cambia cobertura funcional y evidencia UX. Entregable verificable; adaptación acotada es plausible, pero sesiones/reclutamiento y funcionalidades pendientes condicionan 16 semanas. No declarar OE5 cumplido. |

### OE6 — Despliegue universitario y evaluación integral

**Transcripción literal, A0 p. 8:**

> Desplegar la solución informática bajo un modelo On-Premise utilizando la infraestructura de servidores proporcionada por la universidad mediante contenedores Docker, y evaluar su desempeño integral mediante pruebas de integración, métricas de precisión en recuperación de información y pruebas de usabilidad con usuarios reales de la comunidad estudiantil UNAB.

| Elemento | Cotejo y decisión |
| --- | --- |
| Texto/alcance histórico | Despliegue On-Premise en servidores proporcionados por la universidad mediante Docker; integración, precisión y usabilidad con estudiantes reales UNAB. |
| Actividad implícita | Obtener entorno y accesos, desplegar componentes, instrumentar estabilidad/latencia y reunir resultados técnicos y de usuarios. |
| Entregable | §12.2, p. 21: sistema completamente desplegado, informes de evaluación, arquitectura lógica/física, MCP, nodos BPM/N8N, manual y repositorio replicable. |
| Validación prometida | Sin interrupciones no planificadas >5 min y respuesta promedio no mayor a 5 s (≤5); 100 % de objetivos de evaluación planificados, métricas agénticas/RAG, BPM/RPA y SUS con pilotos CCD. |
| Estado repo | E3: Compose local parcial PostgreSQL/N8N, sin despliegue UNAB. E6: 10 warm locales, media 4013.57 ms, 8/10 <5000 ms; no estabilidad longitudinal ni aceptación formal. |
| Discovery | Infraestructura, recursos, permisos y operación institucional sin confirmación. Usuarios del estudio distintos del corpus funcional. |
| Brecha | Local no equivale a institucional. La arquitectura del repo usa <5 s, mientras A0 usa ≤5 s. Tampoco prueba 'estabilidad absoluta' ni el total de cobertura. |
| Clasificación | TECHNICALLY_OBSOLETE; NEEDS_REWORDING; NEEDS_EVIDENCE; NEEDS_DIRECTOR_APPROVAL; SCOPE_RISK |
| Decisión requerida | Decidir si se mantiene el despliegue expreso o se aprueba sustitución local; definir ventana, carga, interrupción, componentes y criterios, coordinando UX con OE5. |
| Impacto de modificarlo | Afecta entorno, recursos, operación, informes y aceptación integral. Es verificable tras definir protocolo; depende de accesos y de OE1–OE5, por lo que concentra alto riesgo para 16 semanas. No eliminarlo silenciosamente. |

SOURCE_D: **OE2, OE3, OE4 y OE6 concentran el mayor riesgo**. OE1 dispone de base
técnica pero diverge en corpus y evaluación; OE5 conserva canal/tecnología, aunque
faltan funcionalidades y estudio. El costo de añadir agentes, fuentes vivas,
automatización, infraestructura y usuarios simultáneamente no se puede inferir
solo de cuánto código existe. No hay calendario restante ni capacidad confirmados.

## 8. Corpus y fuentes de información

**PROTOTIPO SINTÉTICO ≠ CORPUS INSTITUCIONAL PROMETIDO.** El primero es un baseline
técnico útil para desarrollo, regresión y reproducibilidad. No satisface por sí
solo la promesa de documentos oficiales de A0 ni demuestra representatividad CCD.

| Fuente/tipo | Qué dice SOURCE_A | Estado SOURCE_B / SOURCE_C | Reconciliación SOURCE_D |
| --- | --- | --- | --- |
| Propuesta de Competencias Digitales de la UNAB | Corpus inicial nombrado en §6, p. 8. | Corpus actual sintético; C1 necesita definición curricular/autoridad, sin original obtenido. | NEEDS_EVIDENCE; NEEDS_DIRECTOR_APPROVAL si se sustituye por ficción. |
| Lineamientos de evaluación diagnóstica | Corpus inicial, §6, p. 8. | C1 D10/D11 y C2 requieren reglas/convocatorias, vigencia y permisos. | No inventar umbrales diagnósticos ni confundir reglas y resultado individual. |
| Guías de cátedra | §6, p. 8: referencia directa, sin fragmentación vectorial; anexo C, p. 24: documento completo por enlace, no indexado en base vectorial. | E1/E7: full_document sin chunks/embeddings; entrega actual por REST de Markdown sintético. C1 D05 requiere guías autorizadas. | CONSISTENT en separación de modos; NEEDS_EVIDENCE en originales, formatos y acceso. No atribuir la exclusión vectorial solo a un cambio posterior del repo. |
| Resoluciones vigentes CCD | Corpus inicial, §6, p. 8. | C1 D21, autoridad y versiones pendientes. | Vigencia normativa no se deduce de una release técnica. |
| PDF, Excel, sitios web y canales informales | §6, p. 8, describe dispersión; §11.4, p. 19, procesa PDF/Excel/HTML; anexo C, p. 24, PDF/Excel/web. | El corpus documental funcional actual usa Markdown; no acredita extracción de esos originales. | Distinguir formato de fuente competente. Mencionar canales informales no los autoriza como conocimiento oficial. |
| Oferta, convocatorias y novedades/noticias | OE2 y resultado p. 20: extracción periódica del sitio CCD. | Datos estructurados ficticios; C1 D06/D16/D25 pendientes. | Necesita fuente, corte y contrato de actualización; no trasladar catálogo sintético a oferta/NRC. |
| Calendario Google Sheets | §§3.2/7.3/12.2, pp. 6/9/20–21. | Calendario versionado sintético, sin conector Sheets; C1 D17 no confirma fuente real. | TECHNICALLY_OBSOLETE; NEEDS_DIRECTOR_APPROVAL para sustituir el medio/criterio. |
| Perfiles estudiantiles | Resultado OE4 p. 20 dice expresamente **sintéticos**; otras secciones hablan de perfil/historial y credenciales universitarias. | Perfiles ficticios actuales coherentes con ese resultado; C2 separa eventual información personal y permisos. | CONSISTENT para el fixture; NEEDS_REWORDING ante la tensión interna. No afirmar que A0 exige todos los datos personales reales ni que todos sus datos podían ser ficticios. |
| Preguntas de evaluación | Resultado OE1 p. 20: generación sintética RAGAS desde documentos institucionales indexados. | M9: preguntas sobre corpus funcional sintético. | La técnica de generar preguntas no cambia la naturaleza de los documentos de origen. |

Clasificación global de la discrepancia documental: NEEDS_EVIDENCE;
NEEDS_DIRECTOR_APPROVAL; NEEDS_REWORDING; SCOPE_RISK. Debe decidirse si se mantiene
el corpus institucional o se acepta formalmente una evaluación del prototipo
sintético, con conclusiones delimitadas. Si se exige corpus real y no hay acceso,
corresponde revisar alcance; no suplirlo con datos ficticios presentados como reales.

La lectura de A0 no obtiene los documentos que este enumera ni los convierte en
disponibles. Tampoco modifica el congelamiento de dataset v1, SQL, REST o MCP.

## 9. Arquitectura

### Reconstrucción exclusivamente desde SOURCE_A

A0 §7.6/figura 2, pp. 10–11: estudiante → app React Native → petición HTTPS/JSON →
N8N como motor BPM → flujos conversacionales → agente LLM/ReAct → servidor MCP →
pgvector, PostgreSQL/perfiles y Google Sheets/calendarios. En paralelo, web CCD/
portales → bot de scraping/RPA → actualización de tablas/datos. La figura representa
almacenamientos separados lógicamente; **no prueba servidores físicos distintos**.

§11.4, p. 19, enumera cuatro capas: ingesta/vectorización, orquestación, generación
RAG y presentación. En la capa de generación describe backend → búsqueda coseno →
prompt → LLM ante cada consulta, sin detallar agente/MCP. Anexo C, p. 24, enumera
tres: ingesta/procesamiento, interacción del usuario y RAG, con Mobile → Backend API.
Estas descripciones no ofrecen un mapeo explícito entre sus capas y la figura 2.

**SOURCE_B:** Mobile → REST → Intent Router → servicios/renderers o Document RAG
directo; N8N orquesta manualmente ingesta asíncrona y delega procesamiento al core
TypeScript. Agent/ReAct y MCP ejecutable pendientes. SOURCE_D propone conservar
esa base para discutir alcance, sin llamarla implementación literal de A0.

| Componente histórico | Rol según PDF | Estado repo | Compatibilidad | Problema | Decisión |
| --- | --- | --- | --- | --- | --- |
| Mobile / React Native | OE5, pp. 8/21: NLP, calendario, historial y push. | Expo/React Native y REST; push pendiente. | CONSISTENT; NEEDS_EVIDENCE | Canal presente, cobertura y evaluación incompletas. | Mantener base; aprobar cualquier reducción de módulos. |
| REST / Backend API | Fase 3 p. 18 y anexo C p. 24 conectan app y backend por REST. | Frontera vigente. | CONSISTENT | Su relación con N8N directo en figura 2 no queda unificada. | Explicar topología única en futura revisión aprobada. |
| N8N | Gobierno conversacional/BPM e ingesta periódica, pp. 6/9–12/18–21. | Solo orquestación manual asíncrona, fuera del chat. | TECHNICALLY_OBSOLETE; NEEDS_DIRECTOR_APPROVAL | Cambia el rol de OE4 y el automatismo de OE2. | Decidir sustitución/acotación; no reintroducirlo en chat aquí. |
| RAG | OE1/OE3 y §11.4; respuesta documental generada. | RAG directo solo para fallback, junto a rutas deterministas. | CONSISTENT; NEEDS_REWORDING | A0 generaliza consulta vectorial; B distingue mecanismos. | Justificar rutas y corpus, sin afirmar agente implementado. |
| PostgreSQL | Datos relacionales/perfiles; figura 2 y OE4. | Instancia única relacional + pgvector, corpus sintético. | CONSISTENT; NEEDS_EVIDENCE | Modelo sintético no prueba el modelo CCD. | Reutilizar principio, mantener SQL congelado. |
| pgvector | Embeddings y similitud coseno, pp. 7/9/19/24. | Exacto, 1024 dimensiones, coseno; Ollama genera embeddings. | CONSISTENT; KEEP_PROVISIONAL | A0 no fija modelo/dimensión ni índices. | No atribuir parámetros actuales al PDF ni cambiar receta en A4.1. |
| Agent/ReAct | OE3 exige enfoque agéntico; resultado p. 20 concreta ReAct. | Pendiente; router determinista no equivale. | NEEDS_EVIDENCE; NEEDS_DIRECTOR_APPROVAL | Falta núcleo y selección dinámica evaluada. | Justificar mantenimiento o diferimiento formal. |
| MCP | OE3 exige protocolo; resultado exige servidor y endpoints. | Contrato de seis tools, sin ejecutable. | NEEDS_EVIDENCE; NEEDS_DIRECTOR_APPROVAL | Es obligación expresa, no solo marco teórico. | Acordar entregable y evaluación o aprobar sustitución. |
| BPM | §7.8/7.9 p. 12: reglas académicas/ciclo de consulta mediante workflows. | Flujo técnico de ingesta, sin BPM conversacional acreditado. | NEEDS_REWORDING; NEEDS_DIRECTOR_APPROVAL | La herramienta sola no valida reglas/proceso ni mejora institucional. | Delimitar qué modelado/control exige y su evidencia. |
| RPA | OE2/§7.8: captura autónoma mediante interfaces web. | Sin robot/scraping institucional. | TECHNICALLY_OBSOLETE; NEEDS_DIRECTOR_APPROVAL | No corresponde llamar RPA al core de ingesta actual. | Justificar técnica o sustitución según fuente autorizada. |
| Scraping | Sitio CCD periódico; tabla 4 elige N8N HTTP + Cheerio. | Excluido del alcance técnico vigente. | TECHNICALLY_OBSOLETE; NEEDS_DIRECTOR_APPROVAL | Obligación histórica frente a prohibición vigente y permisos desconocidos. | Resolver académicamente; no ejecutar scraping. |
| Google Sheets | Calendarios e integración OE4, ≤30 min. | Excluido; calendario en release sintética. | TECHNICALLY_OBSOLETE; NEEDS_DIRECTOR_APPROVAL | No basta cambiar el nombre de la fuente manteniendo la métrica. | Acordar fuente y evaluación revisadas. |
| Docker | Solución completa en servidores universitarios, OE6. | Compose solo PostgreSQL/N8N local. | CONSISTENT; NEEDS_EVIDENCE; NEEDS_DIRECTOR_APPROVAL | Herramienta presente no demuestra topología completa ni entorno prometido. | Distinguir reproducibilidad local de despliegue académico exigido. |
| On-Premise UNAB | OE6 y resultado p. 21 obligan servidores proporcionados por universidad. | No despliegue institucional acreditado. | TECHNICALLY_OBSOLETE; SCOPE_RISK; NEEDS_DIRECTOR_APPROVAL | No era solo aspiración; recursos y acceso no probados. | Mantener o sustituir expresamente, con impacto en OE6. |

### Tensiones internas del PDF y diferencias concretas

| ID | Evidencia SOURCE_A | Juicio SOURCE_D y decisión |
| --- | --- | --- |
| INT-01 | Cuatro capas en §11.4 p. 19 frente a tres en anexo C p. 24, ambas remiten a figura 2. | NEEDS_REWORDING. Podrían ser vistas distintas, pero falta correspondencia explícita; no elegir una silenciosamente. |
| INT-02 | Figura 2/§7.6 coloca N8N y agente/MCP en consulta; anexo C describe Backend API/RAG directo y §11.4 omite agente/MCP al describir generación. | NEEDS_REWORDING; NEEDS_DIRECTOR_APPROVAL si se cambia OE3/OE4. La omisión no anula la obligación expresa; aclarar recorrido y responsabilidades. |
| INT-03 | Figura 2 separa relacional/vectorial; §7.2/tabla 4 hablan de extensión pgvector e integración en PostgreSQL. | NEEDS_REWORDING. Ambigüedad de representación lógica/física, no prueba de obligación de dos servidores. |
| INT-04 | OE5, objetivo general y fases eligen React Native; tabla 4 p. 23 enumera “Flutter, React Native” en opción seleccionada. | NEEDS_REWORDING. Aclarar la selección; no autoriza incorporar Flutter. |
| INT-05 | Soberanía absoluta y costos eliminados, pp. 6–7/24, junto a APIs LLM externas opcionales, pp. 15/23. | UNSUPPORTED; NEEDS_REWORDING. On-Premise de parte de la solución no demuestra ausencia de transferencias o costos; falta modelo de operación elegido. |
| INT-06 | Perfiles sintéticos OE4, p. 20, frente a historial/perfil personal pp. 4/6 y credenciales universitarias §9.2 p. 15. | NEEDS_REWORDING; NEEDS_DIRECTOR_APPROVAL. Acordar qué es simulado y qué, si algo, requiere identidad/dato real. No inferir transacciones: §10.5 limita a consulta. |
| INT-07 | Arquitectura de ingesta general fragmenta textos; §6/anexo C exceptúan guías de cátedra. | CONSISTENT si se respeta la excepción; NEEDS_REWORDING para explicitarla en la vista general. No es obligación de vectorizar todas las guías. |

El PDF plantea alternativas de LLM externo o local, no obliga a OpenAI ni fija
los modelos Qwen actuales. La elección local tiene un antecedente compatible en
tabla 4, pero sus resultados, licencias y límites deben evaluarse por separado.
No se agregan tecnologías ni se modifica ningún contrato para reconciliar estas vistas.

## 10. Metodología

SOURCE_A §11, pp. 17–19, declara investigación aplicada, enfoque **mixto**:
cualitativo en requerimientos y cuantitativo en evaluación. Adopta DSR y Scrum
adaptado con cuatro fases. El inventario siguiente relaciona método y compromiso;
no acredita que las actividades hayan ocurrido.

| Método/instrumento prometido | Vínculo objetivo → actividad → entregable/validación | Estado B/C y brecha D |
| --- | --- | --- |
| Investigación aplicada/DSR, p. 17 | Artefacto que resuelve problema organizacional, evaluado en uso real; todos los OE. | Hay iteraciones y baseline sintético; necesidad institucional/uso real no acreditados. NEEDS_EVIDENCE; NEEDS_DIRECTOR_APPROVAL si cambia el entorno evaluable. |
| Scrum adaptado, cuatro fases, pp. 17–18 | Requerimientos/diseño, backend, móvil y evaluación. | A0 no detalla cadencia de sprints, ceremonias, roles o instrumentos para demostrar adaptación. Implementación incremental no acredita Scrum por sí sola. NEEDS_REWORDING; NEEDS_EVIDENCE. |
| Entrevistas semiestructuradas, p. 18 | Coordinador CCD y 10–15 estudiantes de distintos programas; alimentan requisitos del conjunto y UX de OE5. | C1/C2 preparan preguntas, no acreditan entrevistas. Se especifica muestra de levantamiento, distinta de los ≥10 de evaluación SUS. |
| Cuestionario de caracterización, p. 18 | Patrones, información demandada y canales; insumo para problema, alcance y diseño. | No se incluye instrumento completo ni respuesta/codificación en las fuentes. Actividad vinculada indirectamente, sin OE de levantamiento independiente. |
| Corpus y benchmark RAG, pp. 18/20 | OE1: documentos indexados, 50–80 preguntas; evaluación retrieval/RAGAS. | M9 es preparación sobre corpus sintético; no ejecución ni aceptación del corpus real. |
| Pruebas Agent/MCP, p. 20 | OE3: selección dinámica y coherencia conversacional, servidor/interfaces. | Sin protocolo cuantitativo o casos de éxito/fallo concretos en A0; componente pendiente en B. |
| Integración/sincronización, pp. 20–21 | OE2/OE4/OE6: automatismo, transmisión íntegra, tiempos y cobertura. | N3 cubre camino manual local; no mide tres flujos automáticos ni 30 min desde Sheets. |
| SUS y cinco tareas, p. 21 | OE5 y validación integral OE6; ≥10 usuarios UNAB de distintos programas, 10 ítems y umbrales. | No estudio formal acreditado; A0 no enumera las cinco tareas ni detalla reclutamiento, orden, registro de tiempos/errores o análisis completo. |
| Desempeño/estabilidad, p. 21 | OE6: contenedores, red institucional, promedio ≤5 s e interrupciones ≤5 min. | Faltan ventana/carga y definición de uso normal; L1-B es local y acotado. |
| Documentación y caso de estudio, p. 22 | Transferencia técnica, informe y posible ponencia. | Entregables documentales previstos; una ponencia es posibilidad, no publicación realizada ni aceptada. |

**Vacíos de trazabilidad detectados (SOURCE_D):**

- Método sin operacionalización suficiente: Scrum adaptado y DSR están nombrados,
  pero no definen en A0 todos sus registros/ciclos; no se afirma que carezcan de
  relación con objetivos, sino que falta evidencia de aplicación.
- Objetivo/compromiso sin actividad dedicada: ReAct/MCP se describen en fase 2,
  pero no tienen filas propias en el cronograma; no inferir que no existen en A0.
- Actividad sin entregable plenamente especificado: entrevistas/cuestionario tienen
  como salida global requisitos, pero faltan guion, corpus de respuestas y método
  de análisis; BPM no aporta un modelo concreto de reglas/proceso.
- Métrica sin instrumento completo: extracción >90 %, cobertura 100 %, estabilidad
  y tareas >85 % carecen de universo/ventana/protocolo detallados. SUS sí nombra
  instrumento; RAGAS sí nombra framework, pero falta configuración reproducible.
- Resultado sin método de validación de efecto: reducir carga, mejorar adopción y
  optimizar significativamente no tienen línea base/comparación definida. SUS mide
  percepción de usabilidad y no acredita por sí solo reducción de carga administrativa.
- OE6 vuelve a reunir evaluaciones de otros OE; debe mapear evidencia compartida
  sin contar dos veces una prueba como estudios independientes.

### Ética y alcance personal según A0

§§9–10, pp. 15–17, prevén consentimiento cuando se registran conversaciones,
minimización/anonimización, trazabilidad, abstención sin evidencia, accesibilidad,
políticas institucionales y autorizaciones de contenido. A0 declara riesgo mínimo
y ausencia de menores/datos sensibles/intervención vinculante. Son compromisos y
autoclasificación del documento, **no dictamen institucional o jurídico verificado**.

SOURCE_D: conservar abstención, procedencia y separación de corpus y participantes;
confirmar población, tratamiento, instrumentos y revisión aplicable antes de un
estudio. No se solicita información personal aquí. §10.5 respalda mantener
transacciones/decisiones vinculantes fuera del alcance; el antecedente no promete
inscribir, cobrar o modificar expedientes. Las referencias normativas quedan para
verificación posterior en §12, sin investigación web ni interpretación legal nueva.

### Cronología real frente al plan histórico

E2 (2026-09-22), K2 (2026-10-01), N3 (2026-10-02) y L1-B (archivo fechado
2026-10-03) preceden al re-baseline/discovery (2026-10-15) y al cotejo A4.1
(2026-10-16). La lectura del PDF no cambia esa secuencia ni acredita entrevistas
anteriores. Describir prototipado sintético → reconciliación/levantamiento →
adaptación/evaluación autorizadas; no fingir que el software nació de un
levantamiento institucional completo. La futura redacción metodológica debe
explicar iteraciones y limitaciones, sin inventar sesiones o resultados.

## 11. Evaluación RAG / M9

**SOURCE_A, A0 §12.2, p. 20:** 50–80 preguntas de prueba derivadas de documentos
institucionales indexados, construidas siguiendo generación sintética RAGAS.
El PDF nombra faithfulness, context precision, context recall, answer relevancy
y MRR. §11.2, p. 18, también cita precision@k/recall@k/MRR. No identifica M9
como etapa ni especifica k para el MRR histórico.

**SOURCE_B:** K2 evalúa retrieval de 18 casos chunked sintéticos con top_k=5:
MRR@5≈0.8519, Precision@5≈0.2222, Recall@5=Hit@5=1. No mide generación, UX,
efecto institucional ni todo OE1. Full_document queda fuera del vectorial.
El JSON M9 conserva 63 candidatas, IDs únicos M9-P-001–M9-P-063, todas draft,
estado global draft; no hay benchmark final congelado ni RAGAS ejecutada.

| Diferencia | Cotejo y decisión SOURCE_D |
| --- | --- |
| Naturaleza del corpus | A0 exige documentos oficiales; E7 usa los 10 documentos chunked sintéticos. Resolver académicamente antes de acreditar OE1. |
| Naturaleza de las preguntas | “Sintéticas” en A0 describe generación del test desde documentos institucionales; no autoriza sustituirlos por documentos ficticios. |
| Cantidad | A0: 50–80 preguntas evaluadas; M9 planea 60 principales, pool de 100–120 y reserva de 20–30. Sesenta caben en el rango, pero pool/reserva y cobertura son un diseño posterior, no texto de A0. Los 63 drafts no acreditan el conjunto final. |
| Métricas | MRR@5 actual es truncado; A0 dice MRR sin k. Precision@5 no es context precision RAGAS. Documentar operacionalización y aceptación, sin igualarlas. |
| Calidad | El PDF no fija juez, modelo, revisión humana, versiones o cálculo completo; E7 prepara reproducibilidad, aún sin ejecutar. |
| Pausa | E8 pausa P-064+, RAGAS final, tuning, cambios de embeddings/chunking e índices aproximados. A4.1 no reabre esos trabajos. |

Presentación defendible: **prototipado y validación técnica preliminar** con
procedencia y límites. Clasificación CONSISTENT para ese uso; NEEDS_EVIDENCE;
NEEDS_DIRECTOR_APPROVAL para corpus y evaluación académica final. Conservar
gold/reserva y evitar contaminación; no mezclar estadísticamente K2, latencia y M9.

El resumen de E9 “sin preguntas reales” sigue siendo ambiguo: puede significar
ausencia de preguntas institucionales, no ausencia de drafts. Para conteo prevalece
el JSON inspeccionado. No se modifica eval ni se declara un nuevo PASS.

## 12. Resultados esperados

### Metas exactas y naturaleza del criterio

Todas las metas siguientes se cotejaron contra A0 §§11.3/12.2, pp. 18/20–21.
Son **metas históricas, no resultados**. Un framework o instrumento externo no
convierte automáticamente sus cortes elegidos por el proyecto en estándares
universales. Las etiquetas de esta tabla son las locales definidas en §2.

| ID / OE | Meta o requisito exacto de A0 | Tipo | Evidencia B / ambigüedad y decisión D |
| --- | --- | --- | --- |
| MET-01 / OE1 | faithfulness ≥0,80 | PROJECT_DEFINED_TARGET | Sin RAGAS ejecutada. Fijar versión, juez y cálculo antes de evaluación final. |
| MET-02 / OE1 | context precision ≥0,80 | PROJECT_DEFINED_TARGET | K2 Precision@5 no la sustituye. |
| MET-03 / OE1 | context recall ≥0,75 | PROJECT_DEFINED_TARGET | Recall@5 determinista no demuestra por sí solo esta métrica. |
| MET-04 / OE1 | answer relevancy ≥0,80 | PROJECT_DEFINED_TARGET | Generación existente no acredita el umbral. |
| MET-05 / OE1 | MRR ≥0,70 | PROJECT_DEFINED_TARGET; AMBIGUOUS_TARGET | A0 lo explica como “posición media del primer fragmento relevante”; esa glosa no explicita el recíproco. Acordar fórmula y k; M9 usa MRR@5. No corregir silenciosamente el PDF. |
| MET-06 / OE1 | 50–80 preguntas desde documentos institucionales, generación sintética RAGAS | PROJECT_DEFINED_TARGET | M9 planea 60 sobre corpus ficticio. Cantidad compatible no resuelve origen ni validación. |
| MET-07 / OE2 | Al menos tres flujos de scraping automáticos exitosos, sin intervención manual durante pruebas | PROJECT_DEFINED_TARGET; AMBIGUOUS_TARGET | N3 es manual. Falta ventana y aclarar qué distingue los tres flujos; no reducirlos a tres ejecuciones de un mismo flujo sin decisión. |
| MET-08 / OE2 | Actualización del corpus inferior a 24 h desde publicación en sitio CCD | PROJECT_DEFINED_TARGET; AMBIGUOUS_TARGET | Repo interpreta disponibilidad de revisión sintética para ingesta: distinto origen del reloj. Definir observación de publicación y fin de actualización. |
| MET-09 / OE2 | Extracción correcta de documentos superior al 90 % sobre páginas objetivo | PROJECT_DEFINED_TARGET; AMBIGUOUS_TARGET | Falta universo, denominador y criterio de extracción correcta; éxito de jobs no es necesariamente esta tasa. |
| MET-10 / OE3 | Selección autónoma de herramienta MCP apropiada para tarea de múltiples pasos; coherencia conversacional | PROJECT_DEFINED_TARGET; AMBIGUOUS_TARGET | Sin tasa numérica ni protocolo detallado; no inventar “90 %” u otro umbral. Agente/servidor pendientes. |
| MET-11 / OE4 | Transmisión sin pérdida/corrupción en ningún nodo del recorrido N8N → pgvector → Backend API → App | PROJECT_DEFINED_TARGET; AMBIGUOUS_TARGET | Definir casos y aserciones sobre recorrido real. N3 no demuestra todo ese E2E. |
| MET-12 / OE4 | Latencia máxima de sincronización del calendario: 30 min respecto de fuente de origen (≤30 min) | PROJECT_DEFINED_TARGET; AMBIGUOUS_TARGET | Sheets excluido del runtime; publicar calendario con releases no valida esa sincronización. |
| MET-13 / OE4 | 100 % de flujos definidos en §11.4, con casos documentados | PROJECT_DEFINED_TARGET; AMBIGUOUS_TARGET | Falta catálogo cerrado y relación con capas/figura; “casos críticos” del repo no equivale automáticamente al mismo universo. |
| MET-14 / OE5 | SUS de 10 ítems, muestra mínima de 10 usuarios reales UNAB de distintos programas | PROJECT_DEFINED_TARGET | No resultados formales. Cantidad de entrevistas 10–15 en §11.3 no reemplaza esta muestra. |
| MET-15 / OE5 | SUS promedio superior a 70/100 (>70) | PROJECT_DEFINED_TARGET | A0 atribuye categoría “Bueno” a Bangor; REFERENCE_NEEDS_VERIFICATION para su interpretación. No certifica un corte universal. |
| MET-16 / OE5 | Ningún participante con SUS inferior a 50/100 (cada puntaje ≥50) | PROJECT_DEFINED_TARGET | No se convierte en “todos >50”; verificar la atribución interpretativa y reportar distribución cuando se evalúe. |
| MET-17 / OE5 | Completación de tareas superior al 85 % sobre cinco tareas de prueba | PROJECT_DEFINED_TARGET; AMBIGUOUS_TARGET | A0 no enumera las cinco tareas ni define agregación por participante/intento. Falta protocolo antes de medir. |
| MET-18 / OE6 | “disponibilidad y estabilidad absoluta” de todos los contenedores durante pruebas, sin interrupciones no planificadas superiores a 5 min | PROJECT_DEFINED_TARGET; AMBIGUOUS_TARGET; UNSUPPORTED_TARGET | Absoluto tensionado por tolerancia a interrupciones de hasta 5 min; falta duración de pruebas y definición de incidente. |
| MET-19 / OE6 | Respuesta promedio no mayor a 5 segundos (≤5 s), uso normal/red institucional | PROJECT_DEFINED_TARGET; AMBIGUOUS_TARGET | E1 dice <5 s; diferencia de frontera. L1-B media 4013.57 ms local no acredita carga/entorno institucional ni todo OE6. |
| MET-20 / OE6 | Informes con cobertura del 100 % de objetivos de evaluación planificados | PROJECT_DEFINED_TARGET; AMBIGUOUS_TARGET | Debe fijarse denominador y trazabilidad a resultados. No equivale a que todos los criterios se cumplan por existir un informe. |
| MET-21 / OE6 | Integrar métricas agénticas/RAG, BPM/RPA y SUS, más documentación técnica completa | PROJECT_DEFINED_TARGET; AMBIGUOUS_TARGET | A0 llama cualitativos a resultados SUS pese a su puntuación cuantitativa; separar comentarios y puntajes. No hay resultado agéntico o estudio SUS acreditado. |

**Diferencias con documentos del repo que se reportan sin corregirlos:**
E1 sustituye la procedencia/medición OE2, excluye Sheets y sincronización de 30 min
en OE4, y usa <5 s frente al ≤5 s de A0. Son desviaciones a reconciliar; no impiden
esta auditoría ni autorizan cambiar arquitectura/eval/contratos. Las metas
numéricas de RAG sí coinciden, con la salvedad MRR/MRR@5.

### Afirmaciones fuertes y resultados no demostrados

| Expresión histórica y localizador A0 | Clasificación académica D | Problema y dirección de corrección |
| --- | --- | --- |
| “nivel industrial”, §12.1 p. 19 | UNSUPPORTED; NEEDS_REWORDING; NEEDS_DIRECTOR_APPROVAL | No define aceptación industrial. Proponer prototipo evaluado bajo condiciones explícitas, si se acepta el cambio. |
| “alta disponibilidad interna”, p. 20 | UNSUPPORTED; NEEDS_EVIDENCE; NEEDS_REWORDING | No deriva de Docker. Es medible con ventana, topología y carga; no acreditada por una corrida local. |
| “soberanía absoluta”, §3.2 p. 6 | UNSUPPORTED; NEEDS_REWORDING | Convivencia con LLM externo opcional exige delimitar flujos/transferencias, sin afirmar cumplimiento legal. |
| “Reducción de costos a cero”, tabla 4 p. 24 | UNSUPPORTED; NEEDS_REWORDING | No hay presupuesto/costo total ni prueba de recursos gratuitos; distinguir costo de licencia, infraestructura y operación. |
| “mejora sustancial”, §3.3 p. 6 | UNSUPPORTED; NEEDS_EVIDENCE | Requiere comparación y definición de experiencia; SUS posterior aislado no prueba por sí solo mejora respecto de situación previa. |
| “optimizar significativamente”, §12.1 p. 20 | UNSUPPORTED; NEEDS_REWORDING | Falta variable, comparación e interpretación de significancia. Expresar resultados observados con límites. |
| “garantizando trazabilidad y exactitud”, §3.2 p. 6; coherencia “siempre”, §7.1 p. 9 | UNSUPPORTED; NEEDS_REWORDING | Citas/retrieval no garantizan verdad universal. Evaluar respaldo y abstención; no se encontró una meta numérica de “precisión garantizada” distinta de §12.2. |
| Centralizar/reducir carga administrativa, pregunta/OG/resultado, pp. 5/7/20 | NEEDS_EVIDENCE; NEEDS_DIRECTOR_APPROVAL | Sin línea base ni estudio de efecto. Medirlo o acordar delimitación formal, no presentarlo como logrado. |
| Autonomía de agente y captura, pp. 6/20 | NEEDS_EVIDENCE; SCOPE_RISK | Son comportamientos evaluables, pero actualmente pendientes. Definir tareas/límites; no llamar autónoma a la ingesta manual. |
| Total accesibilidad/compatibilidad, pp. 6/10/16/20 | UNSUPPORTED; NEEDS_REWORDING; NEEDS_EVIDENCE | Plataforma elegida no garantiza accesibilidad, conectividad o toda condición de dispositivo. Definir y probar cobertura. |

La documentación, informes y caso de estudio potencial de §12.3, p. 22, son
entregables plausibles; no equivalen a publicación, aval CCD o transferencia
institucional completada. No se mantienen superlativos para ocultar brechas.

### Referencias y afirmaciones para verificación posterior

**No se consultó la web ni se verificó validez externa.** Todas las filas llevan
REFERENCE_NEEDS_VERIFICATION; las observaciones siguientes derivan del cotejo
interno de A0, no de concluir que una referencia es falsa.

| Ref. | Fuente/afirmación en A0 | Verificación pendiente |
| --- | --- | --- |
| REF-01 | Chatbot institucional Universidad de los Andes con RAG y limitaciones móviles/dinámicas, §8.2 p. 13 | Identificar proyecto, publicación, fecha y evidencia; no se identifica una entrada específica de ese proyecto en bibliografía pp. 25–27. |
| REF-02 | Tabla competitiva Watson, Dialogflow, bots WhatsApp/Telegram y afirmación “ninguna combina”, pp. 14 | Verificar versiones, alcance de productos, costos y sustento de exclusividad/alta alucinación; no generalizar por canal. |
| REF-03 | N8N “Apache 2.0” en §9.3/glosario; Docker “Apache 2.0”; React Native MIT y PostgreSQL similar MIT/BSD, pp. 15/25 | Verificar producto, versión, componente y términos aplicables; no usar estas atribuciones como licencia comprobada. |
| REF-04 | Permiso académico de APIs LLM y soberanía/costos, pp. 7/15/23–24 | Verificar términos del proveedor/versiones, datos transmitidos y costos reales; no configurar servicios en esta tarea. |
| REF-05 | Ley 1581, Ley 23 y políticas UNAB; consentimiento/credenciales/autorizaciones, pp. 15–17 | Verificar textos aplicables, fuentes institucionales y proceso pertinente. Autoclasificación de riesgo mínimo no es aprobación. |
| REF-06 | ISO/IEC 27001, ISO/IEC 25010 y WCAG 2.1, pp. 15–16 | Verificar ediciones, alcance y criterios que realmente se adoptarán. EXTERNAL_STANDARD es categoría potencial, no certificación de adopción/cumplimiento ni de sus umbrales en este proyecto. |
| REF-07 | Brooke (1996), Bangor et al. (2009), SUS >70 “Bueno” y <50, pp. 18/21/25–26 | Verificar referencias, escala, interpretación y justificación de cortes; distinguir instrumento de metas propias. |
| REF-08 | Es et al. (2023), RAGAS y generación sintética/definiciones, pp. 20/26; Manning, p. 27 | Verificar publicación, versión del framework, generación del conjunto y fórmula MRR; no atribuir los targets a estándares universales. |
| REF-09 | Lewis et al. (2020), Fan et al. (2024), Brodeur/Dugas/Murray (2024), pp. 13/26–27 | Verificar identidad/DOI, variantes y conclusiones concretas que respaldan; ninguna cita autoriza garantías absolutas. |
| REF-10 | Hevner et al. (2004), pp. 17/26; Scrum adaptado p. 17 | Verificar encaje de DSR y describir prácticas reales; no se identifica referencia bibliográfica específica de Scrum en la lista final. |
| REF-11 | DigComp 2.1, UNESCO, MinTIC y afirmaciones de tres pilares/inversión/carga/deserción, pp. 4–8/13/26–27 | Separar marco externo de diagnóstico UNAB; obtener evidencia institucional y referencias exactas. No hay estadística local cuantificada que justifique inventar una magnitud. |
| REF-12 | Vaswani, Merkel, Richardson/Ruby, manuales AWS/Google/Meta/N8N/pgvector/PostgreSQL, pp. 25–27 | Verificar títulos, fechas, versiones, enlaces y pertinencia de cada referencia; presencia bibliográfica no demuestra uso en implementación. |
| REF-13 | Bibliografía “en construcción” y enlace a normasapa.in, p. 25 | Completar trazabilidad y comprobar autoridad/consistencia de estilo; no tratar el enlace como norma institucional verificada. |

## 13. Cronograma de 16 semanas

**SOURCE_A:** anexo A, pp. 22–23, ubica las 16 semanas en **2026-2**. Se leyó
visualmente la tabla completa para conservar la posición de sus marcas, que
la extracción de texto aislada pierde. Las semanas siguientes son del plan
histórico, no nuevas fechas de ejecución ni estimaciones del trabajo restante.

La correspondencia de OE y entregables de la tabla siguiente es SOURCE_D cuando
el anexo no los nombra; los criterios se remiten a §12.2 de A0. “No asignado”
significa sin fila propia, no que el componente no se mencione en el documento.

| Actividad literal/resumida de tabla 3 | Semanas marcadas | OE relacionado | Entregable y validación vinculados | Dependencia/riesgo D |
| --- | --- | --- | --- | --- |
| Levantamiento de requerimientos | S1–S2 | Transversal, especialmente OE1/OE5 | Requisitos y entrevistas de fase 1; no criterio cuantitativo de cierre. | Acceso al coordinador y 10–15 estudiantes, fuentes y permisos. |
| Diseño de arquitectura técnica | S1–S4 | OE1–OE6 | Documento arquitectura/requisitos, fase 1. | Diseño se solapa con levantamiento; necesita revisión de supuestos. |
| Infraestructura On-Premise UNAB + Docker | S3–S5 | OE6 | Entorno configurado; luego pruebas de integración/desempeño. | Recursos/credenciales no acreditados; hito S4 anterior al cierre S5. |
| Base vectorial PostgreSQL + pgvector | S4–S6 | OE1/OE3 | Base operativa; motor/evaluación posterior. | Corpus y arquitectura aún en elaboración al inicio. |
| Pipelines de ingesta y embeddings N8N | S5–S7 | OE1/OE2/OE4 | Ingesta e indexación; scraping/frescura según §12.2. | Fuentes, extracción y permisos; no fila propia para tres flujos RPA. |
| Integración LLM vía API + módulo RAG | S6–S8 | OE1/OE3 | Backend RAG, hito S8; métricas posteriores. | No fila explícita para servidor MCP o ciclo ReAct y su evaluación. |
| Sincronización Google Sheets | S7–S8 | OE4 | Calendario sincronizado y meta ≤30 min. | Fuente y acceso no demostrados. |
| App móvil, consulta NLP | S9–S11 | OE5 | Consulta integrada REST. | Backend y fase 2 aún activos según narrativa. |
| App móvil, calendario e historial | S10–S12 | OE5/OE4 | Módulos y fuentes; pruebas E2E/UX. | Delimitar perfiles sintéticos e historial académico. |
| App móvil, notificaciones push | S11–S12 | OE5 | Notificaciones integradas. | Funcionalidad obligada en resultado, hoy pendiente. |
| Pruebas de integración | S12–S13 | OE2/OE4/OE6 | Casos y cobertura de flujos/objetivos. | Empiezan mientras concluyen módulos; no dejar cobertura final sin reserva. |
| Evaluación de precisión RAG | S13–S14 | OE1/OE6 | Métricas del benchmark institucional. | Necesita corpus estable, gold, configuración y sistema evaluable. |
| Usabilidad con usuarios SUS | S14–S15 | OE5/OE6 | ≥10 usuarios, SUS y cinco tareas. | Reclutamiento/consentimiento; posible solapamiento con fin de desarrollo. |
| Ajustes iterativos y correcciones | S15–S16 | Transversal | Correcciones motivadas por evaluación. | Cambios tras evaluación necesitan registrar qué resultados siguen aplicando. |
| Documentación final y entrega | S16 | OE6 y §12.3 | Informes, arquitectura, manual y repositorio. | Una semana marcada al final deja poco margen si se pospone toda la escritura. |

### Contradicciones y huecos del plan original

- **INT-08, infraestructura:** fase 2 narrativa S5–S10 incluye aprovisionamiento;
  tabla lo sitúa S3–S5 y hito p. 23 exige entorno configurado en S4. No son el mismo
  intervalo. No se desplazan semanas en A0 para hacerlos coincidir.
- **INT-09, fases/pruebas:** narrativa móvil S9–S14 frente a filas S9–S12; pruebas
  fase 4 S13–S16 frente a integración S12–S13. Los solapamientos pueden ser
  deliberados (A0 explica S9/S10), pero falta distinguir integración progresiva
  y cierre definitivo para interpretar hitos.
- Hitos A0 p. 23: S4 arquitectura/entorno; S8 backend RAG/corpus; S12 app integrada;
  S15 evaluación con usuarios; S16 entrega. Backend RAG S8 no demuestra que también
  estén completos agente/MCP, aunque fase 2 los agrupa hasta S10.
- OE3 carece de fila propia para construcción/pruebas ReAct/MCP. OE4 no separa
  modelado de reglas/BPM. OE6 no asigna una ventana concreta de observación de
  estabilidad/carga. Son huecos de trazabilidad, no prueba de horas exactas faltantes.
- No se asignan filas explícitas a autorizaciones, revisión/limpieza del corpus,
  preparación/revisión del benchmark o reclutamiento. Pueden formar parte de fases,
  pero su disponibilidad no puede darse por garantizada.
- No se observa evaluación RAG anterior a la fila de RAG; sí pruebas de integración
  coincidiendo con cierre móvil y SUS coincidiendo con el último tramo narrativo.
  Es un riesgo que requiere control de versiones y criterios de entrada, no una
  contradicción que deba inventarse.

SOURCE_D: OE2/OE3/OE4/OE6 combinados con corpus institucional, push y usuarios
suponen riesgo alto para 16 semanas con accesos aún desconocidos. No se cuantifican
horas ni se garantiza inviabilidad matemática; se señala que el conjunto no es
defendible como compromiso incondicional sin capacidad y dependencias resueltas.
El tiempo restante debe confirmarse; no se reinician dieciséis semanas aquí.

| Prioridad propuesta | Trabajo y condición |
| --- | --- |
| MUST_HAVE | Resolver alcance académico, corpus, fuentes y tareas; conservar baseline; acordar evaluación, usuarios, evidencia y documentación. |
| MUST_HAVE mientras siga exigido en A0 | Agent/MCP, RPA/scraping, BPM/N8N conversacional, Sheets, push y On-Premise no se vuelven opcionales por decisión técnica. Mantenerlos o formalizar cambios antes de replanificar. |
| SHOULD_HAVE | Mejoras adicionales de cobertura/presentación una vez asegurada la entrega aprobada; no incluye degradar compromisos explícitos sin permiso. |
| FUTURE propuesto | Capacidades que se acuerde diferir, con NEEDS_DIRECTOR_APPROVAL si están comprometidas en A0. Integraciones personales nuevas y transacciones no se incorporan por defecto. |

No se crea un cronograma nuevo. La propuesta MVP de §18 depende de estas decisiones.

## 14. Matriz maestra de reconciliación

Capa histórica basada en **A0**, no en H1. Las columnas B/C describen evidencia
disponible; riesgo, clasificación y decisión son SOURCE_D. Se conservan A4-01–24
por tema y se añaden A4-25–32. A4-24 deja de ser ausencia de fuente y registra el
cotejo completado y la aprobación aún pendiente. Responsables son categorías,
sin asignar personas ni inventar procesos institucionales.

| ID | Sección | Afirmación/compromiso histórico | Estado actual repo | Discovery/evidencia CCD | Clasificación | Riesgo | Decisión requerida | Responsable de decisión | Impacto si cambia |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| A4-01 | Nombre | A0 p. 1 y citas conservan nombre histórico. | BanuChat vigente, E1. | No acredita validación institucional. | NEEDS_REWORDING; NEEDS_DIRECTOR_APPROVAL | Confundir nombre y alcance. | Formalizar nombre preservando historia. | EQUIPO; DIRECTOR; FACULTAD/PROCESO_ACADÉMICO | Portada, títulos y referencias internas. |
| A4-02 | Problema | A0 pp. 4–5 afirma carga, desactualización, inexistencia de solución y árbol causal. | Prototipo sintético, E1/E3. | C1/C2 sin línea base ni inventario institucional completo. | NEEDS_EVIDENCE; NEEDS_REWORDING; UNSUPPORTED | Causalidad/impacto no demostrados. | Validar problema, población y tareas. | EQUIPO; CCD; DIRECTOR | Problema, justificación y evaluación de efectos. |
| A4-03 | Pregunta | A0 §2.3 p. 5 exige RAG/N8N y plantea reducir carga/mejorar experiencia. | Consulta híbrida, sin estudio de efecto. | Fuentes/necesidad por validar. | NEEDS_REWORDING; NEEDS_EVIDENCE; NEEDS_DIRECTOR_APPROVAL | Solución y beneficios preseleccionados. | Acordar pregunta evaluable y límites. | DIRECTOR; EQUIPO | Pregunta, método y resultados. |
| A4-04 | Objetivo general | A0 §4 p. 7: sistema RAG/vectorial, N8N, React Native y beneficios CCD. | Artefacto parcial local. | Sin corpus ni validación institucional obtenidos. | NEEDS_REWORDING; NEEDS_DIRECTOR_APPROVAL; SCOPE_RISK | Construir no demuestra mejora. | Delimitar contribución, dominio y efecto medible. | DIRECTOR; EQUIPO | OG, OE, metodología y conclusiones. |
| A4-05 | OE1/corpus | A0 pp. 7–8: indexar documentos oficiales verificados. | Documentos ficticios, E1/E7. | C1 D01/D10/D21 pendientes. | NEEDS_EVIDENCE; NEEDS_DIRECTOR_APPROVAL | Evaluar dominio distinto. | Mantener corpus real o aprobar sustitución delimitada. | DIRECTOR; CCD; EQUIPO | Corpus y validez externa. |
| A4-06 | OE1/evaluación | A0 p. 20: RAGAS y 50–80 preguntas desde corpus institucional. | K2 parcial; M9 sin RAGAS. | Gold real no disponible. | NEEDS_EVIDENCE; NEEDS_REWORDING | Confundir generación sintética de preguntas y corpus ficticio. | Acordar protocolo/corpus y MRR truncado. | DIRECTOR; EQUIPO | Evidencia OE1 y aceptación. |
| A4-07 | OE2 | A0 pp. 7/20 exige RPA/scraping periódico y tres flujos automáticos. | Ingesta sintética manual; sin scraping. | Fuentes/acceso desconocidos. | TECHNICALLY_OBSOLETE; NEEDS_DIRECTOR_APPROVAL; SCOPE_RISK | Sustituir técnica y criterio sin formalizar. | Mantener o sustituir obligación y métricas con aprobación. | DIRECTOR; CCD; EQUIPO | Adquisición, automatismo y evaluación. |
| A4-08 | OE3 | A0 pp. 7/20 exige Agentic AI, MCP, ReAct y selección dinámica. | Router/RAG directo; solo contrato MCP. | Necesidad de herramientas no validada. | NEEDS_EVIDENCE; NEEDS_DIRECTOR_APPROVAL; SCOPE_RISK | Declarar agente desde router o contrato. | Justificar mantenimiento/acotación/diferimiento expreso. | DIRECTOR; EQUIPO | Núcleo, interfaces y contribución. |
| A4-09 | OE4 | A0 pp. 7–8/12: BPM/N8N rige conversación y directrices. | N8N fuera de consulta, E3/E4. | Reglas/proceso aún por validar. | TECHNICALLY_OBSOLETE; NEEDS_REWORDING; NEEDS_DIRECTOR_APPROVAL | Confundir ingesta con BPM conversacional. | Acordar significado/entregable revisado. | DIRECTOR; CCD; EQUIPO | Arquitectura, reglas y pruebas. |
| A4-10 | OE5 | A0 pp. 8/21: app React Native, UX y módulos incluidos push. | App parcial, push y SUS pendientes. | Tareas/usuarios por acordar. | CONSISTENT; NEEDS_EVIDENCE; NEEDS_DIRECTOR_APPROVAL | Llamar completa a demo. | Mantener cobertura o aprobar reducción; evaluar UX. | EQUIPO; DIRECTOR; CCD | Funciones y criterios de usuario. |
| A4-11 | OE6 | A0 pp. 8/21 obliga servidores UNAB/Docker y evaluación integral. | Compose parcial local, sin despliegue UNAB. | Recursos/permisos no confirmados. | TECHNICALLY_OBSOLETE; NEEDS_DIRECTOR_APPROVAL; SCOPE_RISK | Presentar local como institucional. | Confirmar mantenimiento o sustitución formal. | DIRECTOR; CCD; FACULTAD/PROCESO_ACADÉMICO | Entorno, recursos y aceptación. |
| A4-12 | Corpus/fuentes | A0 p. 8 enumera propuesta, lineamientos, guías y resoluciones. | /data/synthetic fuente de verdad. | No originales autorizados. | NEEDS_DIRECTOR_APPROVAL; NEEDS_EVIDENCE | Asumir que leer A0 obtiene su corpus. | Decidir corpus y permisos por documento. | DIRECTOR; CCD; EQUIPO | Cobertura y evaluación. |
| A4-13 | Arquitectura | A0 pp. 10–11/19/24: figura agéntica, cuatro capas y tres capas. | REST/router/fast paths/RAG directo. | Mecanismos candidatos por tipo de información. | NEEDS_REWORDING; NEEDS_DIRECTOR_APPROVAL | Elegir una vista que oculte obligaciones. | Explicar INT-01/02 y acordar arquitectura evaluable. | EQUIPO; DIRECTOR | Diagramas y trazabilidad OE3/OE4. |
| A4-14 | Sheets/calendario | A0 pp. 20–21 exige Sheets y máximo 30 min. | Calendario en releases, Sheets excluido. | Fuente de calendario no confirmada. | TECHNICALLY_OBSOLETE; NEEDS_DIRECTOR_APPROVAL | Métrica incompatible con fuente actual. | Acordar fuente y criterio sustitutos o mantenerlos. | DIRECTOR; CCD; EQUIPO | OE4, sincronización y pruebas. |
| A4-15 | Integración | A0 pp. 18–21 presupone fuentes locales/web y conexiones. | Sin integración UNAB/CCD. | No API o contrato de acceso confirmado. | NEEDS_EVIDENCE; SCOPE_RISK | Diseñar conectores inexistentes. | Resolver fuente, canal, autorización y viabilidad. | CCD; EQUIPO; DIRECTOR | Dependencias y plazo. |
| A4-16 | Perfiles/historial | A0 p. 20 exige perfiles sintéticos; pp. 4/6/15 hablan de personalización/credenciales. | Perfiles ficticios sin autenticación, historial de chat. | C2 separa estado personal y permisos. | CONSISTENT; NEEDS_REWORDING; NEEDS_DIRECTOR_APPROVAL | Afirmar que todo perfil debía ser real o que chat es historial académico. | Delimitar simulación, historial y autenticación; INT-06. | CCD; DIRECTOR; EQUIPO | Identidad, datos y cobertura UX. |
| A4-17 | Metodología | A0 pp. 17–18: aplicada/mixta, DSR, Scrum, entrevistas 10–15. | Prototipo/pruebas antes de discovery documentado. | Entrevistas no acreditadas. | NEEDS_REWORDING; NEEDS_EVIDENCE | Falsear secuencia o prácticas. | Documentar ciclos reales e instrumentos pendientes. | EQUIPO; DIRECTOR | Método, bitácora y límites. |
| A4-18 | Usuarios/SUS | A0 p. 21: ≥10 usuarios UNAB, SUS y cinco tareas. | Sin estudio formal acreditado. | Reclutamiento/protocolo pendientes. | NEEDS_EVIDENCE; NEEDS_DIRECTOR_APPROVAL | Sustituir estudio por prueba del desarrollador. | Acordar ejecución o alternativa expresamente aprobada. | DIRECTOR; EQUIPO; CCD | OE5/OE6 e interpretación. |
| A4-19 | M9 | A0 p. 20 promete evaluación, no la etapa M9 por nombre. | 63 drafts sintéticos, pausados por E8. | Corpus/gold institucional pendiente. | NEEDS_EVIDENCE; NEEDS_REWORDING | Acreditar final desde pool de desarrollo. | Preservar y decidir protocolo posterior al alcance. | EQUIPO; DIRECTOR | Comparabilidad y validez. |
| A4-20 | Impacto/resultados | A0 pp. 6/19–20: industrial, mejora sustancial y optimización significativa. | Evidencia local parcial. | Sin línea base institucional. | UNSUPPORTED; NEEDS_REWORDING; NEEDS_DIRECTOR_APPROVAL | Sobreafirmación. | Medir efectos o aprobar resultados acotados. | DIRECTOR; EQUIPO | Resultados y conclusiones. |
| A4-21 | Estabilidad/latencia | A0 p. 21: absoluto, cortes >5 min prohibidos y media ≤5 s. | L1-B local; E1 escribe <5 s. | Carga/operación no confirmadas. | NEEDS_REWORDING; NEEDS_EVIDENCE | SLA inferido y frontera cambiada. | Definir condiciones/tolerancia; conservar exactitud histórica. | EQUIPO; DIRECTOR | Protocolo OE6. |
| A4-22 | Cronograma | A0 pp. 17–18/22–23: 16 semanas 2026-2, fases/tabla/hitos discrepantes. | Base existente con pendientes. | Accesos/usuarios sin agenda confirmada. | SCOPE_RISK; NEEDS_REWORDING; NEEDS_DIRECTOR_APPROVAL | Sobrecarga y dependencias invisibles. | Resolver INT-08/09 y tiempo restante antes de replanificar. | DIRECTOR; EQUIPO | Prioridades, hitos y entregables. |
| A4-23 | Aprobaciones | A0 es anteproyecto; no aporta por sí solo constancia de aprobación de cambios. | ADR internos no equivalen a decisión académica. | Permisos CCD tampoco acreditados. | NEEDS_DIRECTOR_APPROVAL; NEEDS_EVIDENCE | Confundir fuentes y autoridad. | Confirmar estado y formalización aplicable. | DIRECTOR; FACULTAD/PROCESO_ACADÉMICO | Validez de cambios. |
| A4-24 | Fuente histórica | A0 completo leído, identificado por hash y páginas. | A4 anterior dependía de H1; corregida en A4.1. | No convierte A0 en validación de discovery. | CONSISTENT; NEEDS_EVIDENCE | Confundir copia leída y versión formalmente aprobada. | Conservar trazabilidad; confirmar solo estado académico, no pedir nuevamente el texto. | EQUIPO; DIRECTOR | Precisión y procedencia de la reconciliación. |
| A4-25 | Guías completas | A0 pp. 8/24 excluye fragmentación/indexación vectorial y ofrece enlace íntegro. | full_document sin chunks/vectores; artefacto REST sintético. | Guías reales no obtenidas. | CONSISTENT; NEEDS_EVIDENCE | Inventar contradicción donde hay continuidad. | Conservar principio; validar originales/formato/acceso. | EQUIPO; CCD | Modos de recuperación y límites del corpus. |
| A4-26 | Push | A0 pp. 18–19/21–22 compromete notificaciones. | Pendientes, E1/E9. | Eventos/fuentes por confirmar. | NEEDS_EVIDENCE; NEEDS_DIRECTOR_APPROVAL | Reducir obligación a mejora opcional. | Mantener o aprobar diferimiento explícito. | DIRECTOR; EQUIPO | OE5, app y planificación. |
| A4-27 | Tecnología móvil | A0 p. 23 selecciona “Flutter, React Native”; OE5 exige React Native. | Expo/React Native. | No decisión CCD sobre framework. | NEEDS_REWORDING | Ambigüedad editorial de selección. | Aclarar INT-04 sin introducir otra tecnología. | EQUIPO; DIRECTOR | Tabla tecnológica, no migración. |
| A4-28 | Licencias/referencias | A0 pp. 13–16/25–27 contiene atribuciones y bibliografía en construcción. | Repo no prueba corrección externa de A0. | Sin verificación institucional adicional. | NEEDS_EVIDENCE; NEEDS_REWORDING | Usar referencias no verificadas como autoridad. | Revisar REF-01–13 en tarea posterior; no web aquí. | EQUIPO; DIRECTOR | Justificación, referencias y límites. |
| A4-29 | Ética/identidad | A0 pp. 15–17 prevé consentimiento, políticas, anonimización y riesgo mínimo autodeclarado. | Perfil sintético y sesión no autentican; no estudio formal. | Acceso/población por confirmar. | NEEDS_EVIDENCE; NEEDS_DIRECTOR_APPROVAL | Tomar autoclasificación como autorización. | Acordar protocolo y revisión aplicable sin inventar trámite. | DIRECTOR; CCD; EQUIPO; FACULTAD/PROCESO_ACADÉMICO | Datos de estudio y validación. |
| A4-30 | Costos/soberanía | A0 pp. 6/24: absolutos frente a opción LLM externo pp. 15/23. | Ollama local, entorno parcial. | Recursos institucionales no acreditados. | UNSUPPORTED; NEEDS_REWORDING | Garantías no sustentadas; INT-05. | Delimitar operación/costos y qué se evalúa. | EQUIPO; DIRECTOR | Viabilidad y resultados. |
| A4-31 | Fórmula/targets | A0 p. 20 nombra MRR sin k y glosa posición media; metas propias. | M9 MRR@5, aún sin resultados. | Benchmark real pendiente. | NEEDS_REWORDING; NEEDS_EVIDENCE | Equiparar métricas distintas o universales. | Acordar fórmula, k, agregación y procedencia de metas. | EQUIPO; DIRECTOR | Evaluación OE1. |
| A4-32 | Frontera informativa | A0 §10.5 p. 17 excluye decisiones académicas vinculantes. | Consulta sobre ficción, sin transacciones institucionales. | C1/C2 mantienen escrituras/decisiones personales bloqueadas. | CONSISTENT; KEEP_PROVISIONAL | Ampliar gestión a pagos/inscripciones no prometidos. | Conservar límite de consulta; delimitar estado personal aparte. | EQUIPO; DIRECTOR; CCD | MVP y alcance funcional. |

## 15. Decisiones que pueden tomarse técnicamente

Dentro de lo autorizado, el equipo puede describir el runtime con precisión,
conservar nombre BanuChat y procedencia histórica, corregir esta auditoría desde
A0, distinguir perfiles sintéticos de corpus documental y guías completas de
fragmentos, y preservar resultados con sus límites. También puede registrar las
diferencias de umbrales y preparar decisiones sin alterar los otros documentos.

No equivale a aprobar un nuevo alcance. Se conservan dataset v1 y contratos
congelados, N8N fuera del chat, MCP/Agent como pendientes y pausas de E8. Esta
tarea no autoriza implementarlos, descartar objetivos o reabrir M9.

## 16. Decisiones que requieren aprobación académica

| Cambio candidato frente a compromiso expreso A0 | Clasificación | Decisión y efecto |
| --- | --- | --- |
| Corpus institucional → prototipo documental enteramente sintético | NEEDS_DIRECTOR_APPROVAL | Afecta OE1, pregunta, OG, gold y validez externa; no se confunde con los perfiles ya sintéticos de OE4. |
| RPA/scraping autónomo → ingesta controlada manual o desde archivos | NEEDS_DIRECTOR_APPROVAL | Sustituye técnica, fuente, automatismo y metas de OE2. |
| Diferir/eliminar Agent/ReAct o servidor MCP | NEEDS_DIRECTOR_APPROVAL | Cambia OE3 explícito y entregables/resultados, no una simple opción del marco teórico. |
| N8N/BPM conversacional → orquestación asíncrona de ingesta | NEEDS_DIRECTOR_APPROVAL | Cambia OE4 y requiere explicar reglas, fuentes y evaluación alternativas. |
| Sheets/≤30 min → calendario por releases | NEEDS_DIRECTOR_APPROVAL | Cambia resultado OE4, origen y criterio temporal. |
| Diferir push o reducir cobertura móvil/historial | NEEDS_DIRECTOR_APPROVAL | Cambia resultado OE5 y tareas evaluables. |
| On-Premise universitario → entorno local del equipo | NEEDS_DIRECTOR_APPROVAL | Cambia OE6, recursos, operación y evidencia requerida. |
| Reducir muestra, sustituir usuarios/SUS o cambiar métricas sustancialmente | NEEDS_DIRECTOR_APPROVAL | Cambia validación OE1/OE5/OE6; el cambio debe tener justificación y protocolo. |
| Reformular problema, pregunta, OG, OE o beneficios garantizados | NEEDS_DIRECTOR_APPROVAL | Modifica la contribución evaluable, más allá de una corrección editorial. |

A4.1 no decide el procedimiento UNAB ni inventa formularios, comités o plazos.
Debe confirmarse con DIRECTOR y, cuando corresponda, FACULTAD/PROCESO_ACADÉMICO.
La autorización de datos/fuentes/infraestructura por el CCD es distinta de la
aceptación académica. No se envió ningún mensaje ni se contactó a terceros.

## 17. Preguntas para el director

Se conserva la identificación DIR-01–13 con formulación revisada y se añade DIR-14.
Se retira la petición de obtener/transcribir el original: ya está leído. Se
mantiene la pregunta sobre su estado formal, que el PDF por sí solo no acredita.
Las P0 resuelven cambios de compromisos conocidos, no dudas sobre lo que dice A0.

| ID | Prioridad | Pregunta concreta | Decisión que desbloquea |
| --- | --- | --- | --- |
| DIR-01 | P0 | ¿Cuál es el estado de aprobación de esta copia del anteproyecto y cómo deben formalizarse los cambios de alcance identificados en A4.1? | Proceso aplicable y trazabilidad de decisiones, sin volver a pedir el texto. |
| DIR-02 | P0 | ¿Se mantiene el corpus institucional de OE1/§6 o puede aprobarse una evaluación con documentos sintéticos? Si se mantiene, ¿cuál es el corpus mínimo y qué alternativa se acepta ante falta de acceso? | Fuente, contribución y evaluación. Los perfiles sintéticos de OE4 no resuelven esta diferencia. |
| DIR-03 | P0 | OE2 exige RPA/scraping periódico y tres flujos automáticos: ¿se mantiene o puede sustituirse por ingesta controlada? ¿Qué fuente, automatismo y métricas reemplazarían los históricos? | OE2 y dependencia de fuente/permiso. |
| DIR-04 | P0 | OE3 exige Agentic AI/MCP y §12.2 concreta ReAct: ¿deben completarse en esta entrega o puede aprobarse su acotación/diferimiento? ¿Qué tareas demostrarían su aporte? | Núcleo agéntico, tools y evaluación propia. |
| DIR-05 | P0 | OE6 obliga servidores universitarios/Docker: ¿se mantiene ese despliegue o puede sustituirse formalmente por demostración local reproducible? | Recursos y aceptación del entorno. |
| DIR-06 | P0 | ¿Se mantienen mínimo diez usuarios reales UNAB de distintos programas, SUS y cinco tareas? ¿Cómo acordar reclutamiento/protocolo o una alternativa formal si no hay disponibilidad? | Validación OE5/OE6. |
| DIR-07 | P0 | Dado el plan original de 16 semanas en 2026-2 y sus discrepancias de fases/hitos, ¿qué plazo restante y capacidad deben usarse para replanificar tras aprobar alcance? | Viabilidad, sin reiniciar el horizonte por supuesto. |
| DIR-08 | P0 | ¿Se exige medir reducción de carga y mejora de adopción/experiencia con línea base, o puede limitarse la contribución a calidad y usabilidad del prototipo con conclusiones acotadas? | Pregunta, OG y resultados verificables. |
| DIR-09 | P1 | ¿Cómo se operacionalizan MRR/MRR@5, RAGAS, gold, denominadores de cobertura/extracción y ventana/carga de estabilidad, conservando o revisando explícitamente los umbrales? | Protocolo; elevar a P0 si impide definir la entrega. |
| DIR-10 | P1 | ¿Cómo se delimitan los perfiles sintéticos ya previstos, historial de cursos, credenciales de §9.2 y los módulos push comprometidos? ¿Se aprueba algún diferimiento funcional? | Resolver INT-06 y cobertura OE5; elevar a P0 si afecta el núcleo. |
| DIR-11 | P1 | ¿Cómo documentar DSR/Scrum adaptado y el prototipado previo al levantamiento sin alterar la cronología, y qué registros faltan para evaluar el método? | Metodología real y evidencia. |
| DIR-12 | P2 | ¿Cómo formalizar el nombre BanuChat y corregir tablas/figuras inconsistentes conservando el original histórico? | Consistencia editorial. |
| DIR-13 | P2 | ¿Qué alcance y pendientes aprobados deben presentarse como trabajo futuro, y cómo cerrar la verificación de referencias antes de la siguiente versión académica? | Límites y referencias. |
| DIR-14 | P0 | OE4 sitúa BPM/N8N en conversación y §12.2 exige Sheets/≤30 min: ¿se acepta sustituir ese papel por ingesta asíncrona? ¿Qué reglas, flujo y evidencia constituyen el entregable revisado? | Frontera arquitectónica y sustitución de OE4. |

No hay respuestas asumidas ni aprobación por silencio. Las preguntas de permisos,
autoridad y fuente de C1/C2 siguen requiriendo confirmación CCD.

## 18. Propuesta de alcance defendible

**SOURCE_D: propuesta condicionada, no cambio aprobado de A0.** Se recalcula el
núcleo desde los compromisos cotejados. No se puede llamar cumplido al anteproyecto
original con una selección parcial del runtime. Cada reducción explícita conserva
NEEDS_DIRECTOR_APPROVAL; si se rechaza, la capacidad vuelve al alcance exigible y
debe revisarse el plazo. No se elimina ningún OE.

Costo aproximado **relativo del trabajo restante**, no horas/semanas: bajo =
documentación/reutilización acotada; medio = ajustes, preparación y validación
delimitados; alto = implementación/integración o coordinación relevante;
indeterminado = permisos, fuentes o recursos externos no confirmados.

### MVP_ACADEMIC_DEFENSIBLE

| Elemento propuesto | Necesidad | Dependencia / cambio frente a A0 | Evidencia y límite | Costo relativo |
| --- | --- | --- | --- | --- |
| Alcance de consulta informativa, tareas y reglas delimitadas | Conectar problema, pregunta, artefacto y evaluación sin decisiones vinculantes. | Validación del dominio y DIR-08; restringir beneficios/gestión de OG requiere NEEDS_DIRECTOR_APPROVAL. | A0 §10.5 respalda consulta; C1/C2 aportan hipótesis, no validación. | Medio más coordinación indeterminada. |
| Corpus versionado y trazable | Sustentar consultas y reproducibilidad. | Elegir corpus institucional acotado autorizado o corpus sintético académicamente aceptado. La segunda rama requiere NEEDS_DIRECTOR_APPROVAL sobre OE1; ninguna integración real está autorizada por A4.1. | A0 §6/§12.2 exige documentos oficiales; E1/E7 conserva fixture útil, sin validez externa acreditada. | Medio con fixture; alto/indeterminado para originales/formato/acceso. |
| RAG documental, consulta estructurada y documentos completos | Reutilizar respuestas con evidencia y distinguir tareas que no requieren generación. | Mantener arquitectura B requiere decisión expresa sobre OE3/OE4; diferir agente/MCP/N8N conversacional: NEEDS_DIRECTOR_APPROVAL. | E3 funcional parcial; full_document coincide conceptualmente con A0 pp. 8/24. | Medio para cobertura/evaluación acotadas. |
| Ingesta controlada local y calendario versionado | Mantener procedencia y actualización reproducible del corpus de demostración. | Sustituye RPA/scraping automático y Sheets/≤30 min: NEEDS_DIRECTOR_APPROVAL para OE2/OE4, con nuevos criterios explícitos. | E4 acredita ingesta manual local; no captura institucional ni sincronización histórica. | Bajo/medio al reutilizar, mayor si cambia fuente. |
| App React Native con módulos acordados y perfiles sintéticos explícitos | Entregar consulta, fuentes y calendario en canal prometido. | Conservar perfiles es coherente con OE4; diferir push o reducir historial de cursos requiere NEEDS_DIRECTOR_APPROVAL sobre resultado OE5. | E9 app presente; historial de chat no sustituye historial académico, push pendiente. | Medio; push elevaría costo/dependencias. |
| Evaluación RAG, funcional y UX según protocolo aceptado | Demostrar resultados delimitados y reconocer incertidumbre. | Corpus/benchmark revisados; mínimo diez usuarios/cinco tareas/SUS mientras no se apruebe cambio. Alterar población/métricas exige NEEDS_DIRECTOR_APPROVAL; reabrir M9 requiere tarea posterior explícita. | A0 pp. 20–21 fija metas; E5/E6 son antecedentes parciales, E7/E9 no acreditan evaluación final. | Medio/alto; reclutamiento indeterminado. |
| Demostración reproducible local, informes y límites | Permitir revisar artefacto y resultados. | Sustituye On-Premise UNAB de OE6: NEEDS_DIRECTOR_APPROVAL. Definir carga/ventana y no prometer nivel industrial. | E3 Compose parcial y E6 medición local. | Medio. |

Las ramas de corpus no son entregas acumuladas. Si se exige corpus institucional
y no hay autorización, se vuelve al director; no se considera satisfecho con
ficción. La viabilidad en el horizonte requiere reutilizar la base, reducir
explícitamente obligaciones con aprobación y asegurar validación/documentación.
No es una garantía de terminar en el tiempo restante desconocido.

### DESIRABLE

| Elemento propuesto | Necesidad | Dependencia / relación con A0 | Evidencia y límite | Costo relativo |
| --- | --- | --- | --- | --- |
| Más cobertura de preguntas dentro del alcance aprobado | Robustecer evidencia después de asegurar el conjunto final. | Gold/corpus estables; no ampliar ahora M9. No reemplaza las 50–80 preguntas históricas por una muestra arbitrariamente menor. | E7 protocolo de desarrollo; sin evaluación final. | Medio. |
| Mejoras móviles motivadas por resultados observados | Corregir dificultades concretas y mejorar comprensión de fuentes. | Estudio y hallazgos; la validación UX mínima de A0 no se degrada a opcional. | E9 base reutilizable, sin hallazgos formales aún. | Bajo/medio. |
| Revisión adicional de gold/procedencia y reproducibilidad | Fortalecer conclusiones sin nuevas tecnologías. | Revisores disponibles y corpus permitido; no inventar validación CCD. | E7 prepara revisión; no acredita que haya ocurrido. | Medio. |

### FUTURE

| Elemento candidato a diferir | Necesidad potencial | Dependencia / aprobación requerida | Evidencia y límite | Costo relativo |
| --- | --- | --- | --- | --- |
| Agent/ReAct y MCP ejecutable | Selección de herramientas para tareas justificadas. | A0 OE3 lo exige: NEEDS_DIRECTOR_APPROVAL para diferirlo, con impacto en contribución/evaluación. | E3 solo contrato; C2 no demuestra necesidad institucional. | Alto. |
| Scheduling y workflows de retry/recover | Actualización con cadencia y operación acordadas. | Diferir automatismo histórico OE2 requiere NEEDS_DIRECTOR_APPROVAL; retry/recover son pendientes técnicos y no metas literales independientes de A0. | E4 manual; core y workflow son capas distintas. | Medio/alto. |
| Push | Notificaciones sobre eventos/convocatorias. | A0 resultado OE5 lo exige: NEEDS_DIRECTOR_APPROVAL para diferir; confirmar fuente/eventos. | E1/E9 pendiente. | Medio/alto. |
| Conectores e infraestructura institucional | Fuente viva u operación en entorno UNAB si se mantienen. | NEEDS_DIRECTOR_APPROVAL sobre OE2/OE4/OE6, además de permiso institucional; no conector hipotético. | C1/C2 sin acceso/infraestructura confirmados. | Alto/indeterminado. |

### OUT_OF_SCOPE_CANDIDATE

| Elemento candidato | Necesidad/justificación | Dependencia / aprobación requerida | Evidencia y límite | Costo relativo de mantenerlo |
| --- | --- | --- | --- | --- |
| Scraping/RPA, Sheets y BPM conversacional como medios obligatorios | Deben justificarse por tarea/fuente; la base asíncrona actual podría satisfacer un alcance revisado. | Son explícitos en A0: NEEDS_DIRECTOR_APPROVAL para excluir/sustituir. No se declara innecesaria toda actualización ni toda regla. | A0 OE2/OE4 y resultados; E4 difiere sustancialmente. | Alto/indeterminado. |
| “Industrial”, alta disponibilidad, soberanía absoluta y costo cero | No tienen respaldo operativo/presupuestal suficiente; reemplazar por evidencia acotada. | NEEDS_DIRECTOR_APPROVAL si cambia resultado exigible; verificación posterior de referencias. | A0 §§3/12/tabla 4; E3/E6 no acreditan esos absolutos. | Alto/indeterminado. |
| Reducción de carga o mejora de adopción como efecto garantizado | Falta línea base y diseño de efecto; no se infiere de SUS. | NEEDS_DIRECTOR_APPROVAL para acotar pregunta/OG/resultados. Si se mantiene, diseñar medición viable. | A0 pp. 5/7/20; sin evidencia institucional de efecto. | Alto/indeterminado. |
| Datos personales reales/cupos en vivo | A0 menciona usos personales pero también perfiles sintéticos; falta delimitar el compromiso. | Aclarar INT-06 con NEEDS_DIRECTOR_APPROVAL cuando se reduzca una expectativa explícita; permisos CCD separados. | C2 sin fuentes/acceso; E9 sesión ficticia. | Alto/indeterminado. |
| Inscribir, pagar, corregir expedientes o emitir dictámenes vinculantes | No necesarios para el canal informativo; no son una obligación explícita que deba inventarse. | CONSISTENT con A0 §10.5. Cualquier ampliación exige alcance/autorización nuevos. | C1/C2 los mantienen como fronteras no habilitadas. | Alto/indeterminado si se propusieran. |

No se agregan tecnologías ni se autoriza implementar Astra 5, cambiar SQL,
integrar fuentes reales o ejecutar evaluación/tuning. La propuesta prepara decisiones.

## 19. Orden recomendado de actualización académica

Secuencia futura, sin ejecutar aquí la reescritura:

1. **Confirmar alcance y formalización.** Resolver P0 usando A0 ya cotejado;
   registrar decisión, justificación, responsable confirmado y evidencia.
2. **Cerrar problema.** Respaldar diagnóstico/árbol, población y brecha; separar
   afirmaciones institucionales de hipótesis y de soluciones preseleccionadas.
3. **Pregunta.** Alinear resultado investigable y mecanismos justificados.
4. **Objetivo general.** Precisar artefacto, dominio y beneficios evaluables.
5. **OE.** Conservar traza de cada enunciado A0 a la modificación aprobada,
   entregable, criterio y evidencia; no omitir OE2/OE3/OE4/OE6.
6. **Metodología.** Describir cronología real, DSR/Scrum efectivamente usados,
   instrumentos, muestras, ética y protocolos; no inventar prácticas pasadas.
7. **Arquitectura.** Resolver tres/cuatro capas y rutas divergentes; distinguir
   runtime, arquitectura aprobada futura y pendientes, manteniendo contratos
   congelados hasta una tarea técnica autorizada.
8. **Resultados.** Operacionalizar metas, denominadores y límites; separar targets
   propios, referencias externas y resultados realmente obtenidos.
9. **Cronograma.** Corregir coherencia entre fases, tabla e hitos con plazo/capacidad
   confirmados; incluir fuentes, permisos, benchmark y usuarios.
10. **Referencias.** Verificar REF-01–13 y cerrar trazabilidad bibliográfica/editorial.
    La recopilación de evidencias acompaña los pasos previos; no se pospone la
    validación de una premisa crítica hasta el final.

Después comprobar problema → pregunta → objetivos → actividades → entregables →
validación → resultados → cronograma. La existencia de esta matriz no equivale
a que esa cadena haya sido aprobada o completada.

## 20. CHECKPOINT BANUCHAT ACADÉMICO

### Decisiones confirmadas

Confirmado documentalmente: A0 completo leído y cotejado, pregunta/OG/OE transcritos,
corpus, arquitectura, metodología, métricas y cronograma identificados por páginas.
Corregida la dependencia histórica de H1 y retirada la limitación de falta de texto.

Confirmado técnicamente en el alcance vigente: BanuChat, corpus funcional sintético,
REST/router/fast paths/RAG directo, N8N manual asíncrono, MCP/Agent pendientes y
Compose parcial local. Se preservan contratos/dataset congelados y pausas de E8.
**No se acredita aprobación académica de los cambios candidatos.**

### Decisiones provisionales

MVP revisado de consulta y evaluación acotadas, sujeto a resolver corpus,
objetivos, automatismo, usuarios, entorno y beneficios. Las exclusiones de
obligaciones de A0 requieren NEEDS_DIRECTOR_APPROVAL. Costos relativos y
juicios de viabilidad son SOURCE_D, no presupuestos ni plazos comprometidos.

### Elementos descartados candidatos

RPA/scraping y Sheets obligatorios, BPM conversacional, garantías industriales/
absolutas e impacto asegurado: posibles sustituciones con aprobación e impacto
registrado. Agent/MCP, push y On-Premise son candidatos a diferimiento formal,
no elementos ya eliminados. Transacciones vinculantes permanecen fuera de la
propuesta informativa, coherentemente con §10.5 de A0. Ningún OE fue borrado.

### Preguntas pendientes

P0 revisadas: DIR-01–08 y DIR-14. Ya no se pregunta cuál es el texto literal ni
si A0 menciona MCP, RPA o On-Premise; se pregunta qué cambios pueden aprobarse y
con qué entregables. Sigue pendiente el estado formal de aprobación, la
disponibilidad de fuentes/infraestructura/usuarios y el tiempo restante.

### Secciones afectadas

Toda la cadena académica: nombre/título, problema/árbol, justificación, pregunta,
OG/OE, corpus, arquitectura, metodología/ética, resultados/metas, cronograma,
tecnologías y referencias. A4-01–32 conserva trazabilidad; no se cambian esas
secciones en el PDF ni en otros documentos del repositorio.

### Implicaciones sobre objetivos

Mayor brecha: OE2 por captura automática real; OE3 por agente/MCP expresos;
OE4 por papel conversacional/BPM/Sheets; OE6 por entorno universitario y evaluación
integral. OE1 mantiene brecha de corpus/validación y OE5 de push/UX/cobertura.
Perfiles sintéticos y guías sin vectorizar son continuidades comprobadas de A0,
no divergencias que deban atribuirse al repositorio.

### Implicaciones sobre arquitectura

Resolver INT-01–07 y distinguir las vistas históricas de la base actual. El
fallback directo puede reutilizarse bajo alcance revisado, pero no cumple por
sí solo OE3. N8N asíncrono no equivale al papel histórico OE4. El PDF no obliga
a dos servidores PostgreSQL ni a Flutter ni a proveedor LLM externo.
No se rediseña o implementa ninguna de esas decisiones aquí.

### Implicaciones sobre cronograma

Dieciséis semanas corresponden al plan histórico 2026-2, no al tiempo restante.
INT-08/09, tareas sin fila propia y dependencias externas deben resolverse antes
de replanificar. No sumar integración real, agentes, automatización, push,
infraestructura y evaluación como si sus recursos estuvieran garantizados.
La documentación final y la validación requieren esfuerzo explícito y evidencia,
no se consideran terminadas por haber construido este inventario.
