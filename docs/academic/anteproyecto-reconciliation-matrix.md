# Matriz de reconciliación académica de BanuChat

## 1. Propósito

Auditoría A4, versión preliminar, iniciada el **2026-10-15** y completada el
**2026-10-16**. Comparar cuatro capas para
preparar decisiones trazables con el director: A) anteproyecto histórico;
B) estado comprobable del repositorio BanuChat; C) evidencia/discovery del CCD;
D) decisión académica necesaria. Se identifican coherencias, diferencias,
afirmaciones sin respaldo y riesgos de alcance, sin reescribir capítulos ni
modificar objetivos, implementación o contratos.

**Límite de la fuente histórica:** el texto original completo no fue aportado en
esta tarea ni localizado mediante búsqueda de archivos PDF/Word y nombres de
anteproyecto/propuesta en el repositorio. Tampoco se localizó en la búsqueda
textual acotada una transcripción de la pregunta u objetivo general. No se afirma
que ese documento no exista fuera de este alcance. La capa A se reconstruye desde
los compromisos descritos en la solicitud A4 y referencias históricas internas;
**no contiene citas literales verificadas, páginas ni redacciones completas de OE**.
El cotejo con la versión radicada es una decisión P0 pendiente.

El anteproyecto se trata como antecedente histórico/preliminar, sin presumir su
estado formal de aprobación. **Un ADR técnico no equivale a autorización del
director o la facultad.** Que el repositorio haya excluido una integración no
demuestra que se haya modificado el compromiso académico correspondiente.

HEAD inspeccionado: `d82fff84d94ca8121cd5c66bcea3b56efd0127fd`. Re-baseline, matriz
de información y D3 ya estaban presentes, sin commit; se preservan íntegros.
Todas las lecturas mínimas solicitadas del repositorio están disponibles. La
auditoría lee evidencias históricas; no repite sus pruebas ni acredita un nuevo
resultado operacional del HEAD actual.

| Referencia | Fuente | Alcance de la evidencia |
| --- | --- | --- |
| H1 | Solicitud A4 recibida el 2026-10-15 | Historia reportada: RAG, datos CCD, RPA/scraping, Agentic AI/MCP, BPM/N8N, Google Sheets, Mobile, Docker, On-Premise, evaluación y 16 semanas. Distribución temática de OE1–OE6 suministrada por el equipo, pendiente de cotejo literal. |
| E1 | [AGENTS.md](../../AGENTS.md), [README](../../README.md), [arquitectura](../arquitectura.md) | Alcance vigente, flujo actual y objetivo, interpretación técnica provisional de OE y sus límites. |
| E2 | [ADR 0001](../adr/0001-alcance-sintetico-y-despliegue-local.md) | Antecedente histórico de fuentes reales/despliegue y decisión técnica de corpus sintético/local. No prueba aprobación académica de la sustitución. |
| E3 | [API runtime](../../backend/api/src/main.ts), [dispatcher](../../backend/api/src/chat/chat-dispatcher.ts), [MCP README](../../backend/mcp-server/README.md), [Compose](../../infra/docker-compose.yml) | Composición REST/router/RAG directo, fast paths, MCP solo contratado y servicios locales declarados. Inspección estática, no ejecución actual. |
| E4 | [Workflow manual](../../n8n/workflows/ingestion-manual-v1.json), [N3](../../eval/ingestion/results/n3-n8n-e2e-2026-10-02.md) | JSON con manualTrigger y active=false; recorrido manual local documentado, publicación y no-op posterior. No prueba scraping, scheduling ni BPM institucional. |
| E5 | [K2](../../eval/retrieval/results/k2-v1-2026-10-01.md) | Retrieval sintético, 18 casos chunked y top_k=5; no calidad de generación ni efecto institucional. |
| E6 | [L1-B](../../eval/generation/results/l1-b-rag-latency-2026-10-03.md) | Diez solicitudes warm secuenciales, resultados locales de latencia; no SLA ni cumplimiento formal de OE6. |
| E7 | [M9 README](../../eval/rag-quality/README.md), [benchmark-v1.json](../../eval/rag-quality/benchmark-v1.json) | Conteo verificado: 63 casos, 63 IDs únicos M9-P-001–M9-P-063, todos draft; benchmark global draft. Sin RAGAS ni resultados M9 acreditados. |
| E8 | [Re-baseline](banuchat-rebaseline-2026-10.md), [matriz de información](../discovery/ccd-information-matrix.md), [D3](../discovery/ccd-conceptual-domain-model.md) | Pausas y descubrimiento preliminar. CP-01–CP-04 son contexto público reportado sin originales/URLs/vigencia verificados. D3 contiene hipótesis, no validación institucional. |
| E9 | [Evaluaciones](../../eval/README.md), [Mobile](../../mobile/README.md) | Evidencias por etapa y límites; app implementada y comprobaciones manuales reportadas, sin SUS ni evaluación formal de usuarios acreditada. |

Para leer las afirmaciones: **historia reportada** remite a H1/E2;
**evidencia** remite a archivos inspeccionados; **inferencia** identifica el juicio
de esta auditoría; **decisión propuesta** no tiene aprobación atribuida. Estas
marcas de procedencia son distintas de las clasificaciones académicas de la sección 2.
No se consultaron fuentes, APIs ni infraestructura real UNAB/CCD.

## 2. Convenciones de clasificación

| Clasificación académica | Definición |
| --- | --- |
| CONSISTENT | Existe coherencia en el aspecto y alcance comparados; no equivale a objetivo cumplido ni aprobación. |
| NEEDS_REWORDING | La formulación debe distinguir alcance, estado, mecanismo o límites para no afirmar más de lo demostrado. |
| NEEDS_EVIDENCE | Falta evidencia concreta para sostener, verificar o dar por cumplido el compromiso. |
| NEEDS_DIRECTOR_APPROVAL | El cambio afecta el compromiso académico y debe revisarse con el director y el proceso académico aplicable, aún por confirmar. |
| TECHNICALLY_OBSOLETE | Una descripción histórica no representa el runtime/alcance técnico actual. No implica que el requisito académico haya sido eliminado. |
| SCOPE_RISK | La amplitud, dependencias o incertidumbre amenazan un resultado verificable en el plazo. |
| UNSUPPORTED | Afirmación que carece de respaldo en las fuentes disponibles; no significa falsedad demostrada. |
| KEEP_PROVISIONAL | Elemento plausible que puede conservarse para discusión, condicionado a justificación, evidencia y decisiones pendientes. |

Se permiten combinaciones separadas por `;`. Estas son las únicas clasificaciones
académicas generales. La sección 9 usa las etiquetas técnicas solicitadas; la 12
usa marcas locales de intensidad/medibilidad; la 13 prioridades de planificación.
Ninguna de ellas sustituye la clasificación de la matriz maestra.

## 3. Cambio de nombre

**Nombre histórico: Route AI.** H1 y E2 lo identifican exclusivamente con el
anteproyecto. **Nombre vigente: BanuChat**, confirmado por E1.

Decisión técnica confirmada: toda propuesta nueva utiliza BanuChat. En una futura
actualización académica deben revisarse portada, título, resumen, objetivos donde
aparezca el nombre, diagramas, figuras, instrumentos, anexos y referencias internas.
El original histórico y sus citas deben conservar identificación y trazabilidad;
no se renombra retrospectivamente evidencia ni se modifica el documento radicado aquí.

Clasificación: **NEEDS_REWORDING**; **NEEDS_DIRECTOR_APPROVAL** para confirmar la
forma de reflejar el cambio en la versión académica oficial. El procedimiento no
se conoce y no se inventa.

El cambio de nombre por sí solo **no cambia problema, objetivos, arquitectura,
alcance ni metodología**. No puede usarse para encubrir la sustitución de corpus,
la eliminación de un OE o el abandono de un despliegue prometido.

## 4. Planteamiento del problema

**Anteproyecto:** H1 pide auditar las afirmaciones siguientes; falta su formulación
literal y sus referencias originales. **Repositorio:** E1/E3 prototipan consultas
con respuestas estructuradas/documentales, procedencia y una app sobre ficción
controlada. **Discovery:** E8 reporta rutas, ofertas y varios canales, pero no
aporta medición del problema ni confirma inexistencia de un servicio unificado.

| Afirmación histórica a cotejar | Evidencia disponible repo/discovery | Evidencia pendiente | ¿Demasiado fuerte? / clasificación | Dirección de reformulación propuesta |
| --- | --- | --- | --- | --- |
| Información fragmentada | CP-03 reporta varios sistemas y CP-02/CP-04 publicaciones diversas. El prototipo reúne fuentes sintéticas. | Mapa de fuentes/tareas y observación de discontinuidades concretas, validados por CCD. | Sí, si se deduce fragmentación de la mera pluralidad; NEEDS_EVIDENCE; NEEDS_REWORDING. | Investigar dificultades de localización y coherencia en tareas delimitadas, sin declarar fragmentación general ya demostrada. |
| Consultas repetitivas | No hay registros institucionales ni frecuencia de consultas aportados. Los casos sintéticos no miden demanda. | Registros agregados autorizados, entrevistas o evidencia equivalente con población y periodo definidos. | Sin respaldo actual; UNSUPPORTED; NEEDS_EVIDENCE. | Presentarla como hipótesis de necesidad que debe contrastarse, no como hecho cuantificado. |
| Carga administrativa elevada | No se midieron tiempos, volumen, costos ni reparto de trabajo. | Definición operacional y línea base autorizada; tareas, actores y periodo comparables. | «Elevada» y «reducción» son conclusiones no sustentadas; UNSUPPORTED; NEEDS_REWORDING. | Delimitar apoyo informativo y, si se acuerda medir impacto, establecer primero una línea base. |
| Información desactualizada | E8 advierte que reglas/fechas cambian; no aporta casos verificados de desactualización. | Comparaciones fechadas contra fuente autoritativa y criterio de vigencia. | Cambio temporal no prueba desactualización; NEEDS_EVIDENCE; NEEDS_REWORDING. | Formular la necesidad de identificar vigencia y procedencia, sin atribuir fallos institucionales no observados. |
| Canales múltiples | CP-03 reporta Cosmos, MiPortalU, Banner y Canvas para usos distintos; sin originales examinados. | Confirmar canales, funciones, públicos y fuentes maestras; obtener referencia autorizada. | Plausible como antecedente, no problema por sí solo; KEEP_PROVISIONAL; NEEDS_EVIDENCE. | Describir canales reportados y evaluar si su distribución dificulta tareas concretas. |
| Inexistencia de sistema unificado | No hay inventario institucional completo ni consulta al CCD acreditada. | Confirmación competente sobre servicios existentes y definición de «unificado». | Afirmación de inexistencia no demostrada; UNSUPPORTED; NEEDS_REWORDING. | Preguntar qué mecanismos actuales resuelven la necesidad y qué brecha residual justificaría BanuChat. |

Inferencia: el problema defendible todavía debe acotarse a usuarios, tareas,
información y criterios de resultado confirmados. Que el prototipo responda
preguntas sintéticas no demuestra necesidad, causalidad ni impacto administrativo.

## 5. Pregunta de investigación

No se dispone del enunciado literal; **no puede dictaminarse su validez final**.
H1 pide revisar el posible acoplamiento de la pregunta a RAG, N8N y tecnologías
específicas. Clasificación: **NEEDS_EVIDENCE; NEEDS_REWORDING;
NEEDS_DIRECTOR_APPROVAL** si se altera el compromiso radicado.

| Riesgo a cotejar en el original | Juicio provisional | Decisión necesaria |
| --- | --- | --- |
| La pregunta obliga a usar RAG para toda consulta | E3/E8 distinguen consultas estructuradas, explicación documental y lookup; no todas necesitan generación. | Preguntar por capacidad/resultado evaluable y justificar RAG solo para tareas pertinentes. |
| N8N se convierte en condición de solución o en beneficio demostrado | E4 respalda orquestación manual local, no superioridad ni mejora institucional. | Distinguir mecanismo de ingesta de fenómeno que se investiga. |
| Una lista de tecnologías reemplaza la incertidumbre investigable | Inferencia: podría convertir una solución elegida en parte del problema sin comprobar necesidad. | Identificar qué se desea conocer/evaluar y qué decisiones técnicas son instrumentales. |
| Se promete reducir carga o mejorar experiencia solo por construir el sistema | E9 no acredita estudio de impacto ni SUS. | Elegir resultados medibles y protocolo, o limitar la afirmación a evaluación de prototipo. |

Dirección propuesta: una pregunta centrada en el apoyo a tareas informativas
delimitadas, con corpus, población y criterios de evaluación explícitos. No se
redacta una pregunta final ni se afirma que la histórica deba abandonarse antes
de leerla y revisarla con el director.

## 6. Objetivo general

La cadena **problema → pregunta → objetivo general → artefacto → evaluación** no
está reconciliada académicamente. E1/E8 describen un prototipo sintético; H1 reporta
promesas de fuentes reales, automatización e infraestructura institucional.
No se dispone del objetivo general literal para atribuirle una redacción concreta.

| Aspecto a auditar | Evidencia/inferencia | Dirección de corrección, no texto final |
| --- | --- | --- |
| Prescripción de muchas tecnologías | H1 enumera RAG, N8N, Agent/MCP, BPM/RPA y otros componentes; no se conoce cuáles están en el objetivo general o solo en el diseño. | Separar contribución académica y resultados de mecanismos; conservar tecnologías solo con necesidad y alcance justificables. |
| Reducción de carga administrativa | Sin línea base ni evaluación de impacto disponibles. | No afirmarla como resultado obtenido; mantenerla solo como efecto a evaluar si existe diseño viable y aprobado. |
| Mejora de experiencia | Mobile existe, pero las comprobaciones manuales no equivalen a mejora de UX demostrada. | Delimitar evaluación de usabilidad y tareas, sin prometer superioridad sin comparación pertinente. |
| Elementos no implementados | Agent/ReAct, MCP ejecutable y operación institucional pendientes; scraping real excluido del alcance técnico vigente. | Distinguir artefacto actual, trabajo necesario aprobado y candidatos a diferir. |
| Dominio real | D3 separa Curso/Oferta y fronteras personales como hipótesis; fuentes maestras y permisos pendientes. | Resolver corpus y tareas antes de prometer cobertura institucional. |

Clasificación general: **NEEDS_REWORDING; NEEDS_EVIDENCE;
NEEDS_DIRECTOR_APPROVAL; SCOPE_RISK**. La dirección propuesta es formular un
objetivo verificable para un artefacto y evaluación delimitados, preservando
la pregunta investigable. No se cambia el objetivo en ningún otro documento.

## 7. Objetivos específicos

La asociación OE1–OE6 proviene de H1 y se contrasta con la interpretación técnica
de E1; **no es transcripción ni modificación de los objetivos radicados**. Cada
tabla responde necesidad, implementación, tamaño, plazo, entregable, verificabilidad,
validación y aprobación. Los juicios de viabilidad son inferencias: no se conoce
capacidad del equipo, dedicación, semanas transcurridas ni tiempos de acceso externo.

### OE1 — RAG, pgvector, corpus y evaluación

| Elemento | Anteproyecto histórico | Estado del repo | Evidencia disponible | Problema | Clasificación | Decisión requerida |
| --- | --- | --- | --- | --- | --- | --- |
| Necesidad e implementación | H1: RAG + pgvector + documentos institucionales + RAGAS. | Document RAG directo y pgvector sobre corpus sintético; sin evaluación formal M9. | E3/E5/E7; E8 exige identificar qué tareas son documentales. | La necesidad de responder con evidencia es plausible; RAG no es necesario para todas las consultas. La implementación es parcial respecto de la promesa real. | KEEP_PROVISIONAL; NEEDS_EVIDENCE; NEEDS_REWORDING | Confirmar preguntas/corpus y el alcance de RAG con el director y CCD. |
| Tamaño y 16 semanas | Extensión literal del objetivo no disponible. | Pipeline y app reutilizables; documentos reales/permisos pendientes. | E1/E8. | Ampliar corpus, adaptar formatos, diseñar benchmark y evaluar puede ser grande. Cabida solo condicional con corpus acotado y acceso resuelto temprano; no garantizada. | SCOPE_RISK | Acotar corpus/tareas y reservar esfuerzo de evaluación antes de añadir funcionalidades. |
| Entregable y verificabilidad | H1: recuperación/generación evaluada; detalle de entregables por cotejar. | Hay runtime, evidencia K2 y protocolo M9 draft. | E5/E7. | Entregable candidato: artefacto reproducible, corpus permitido, protocolo y resultados. K2 no prueba generación ni dominio real. | CONSISTENT; NEEDS_EVIDENCE | Acordar corpus, métricas, gold, muestra y criterio de aceptación antes de ejecutar evaluación final. |
| Validación y aprobación | RAGAS e información institucional reportados. | K2: 18 casos sintéticos; M9: 63 draft, sin RAGAS. | E5/E7/E8. | Hay validación técnica parcial, no cumplimiento integral. Cambiar corpus o métrica/alcance sustancial necesita revisión. | NEEDS_EVIDENCE; NEEDS_DIRECTOR_APPROVAL | Decidir si se acepta evaluación sintética o se exige corpus real autorizado; no acreditar OE1 ahora. |

### OE2 — RPA, scraping y actualización automática

| Elemento | Anteproyecto histórico | Estado del repo | Evidencia disponible | Problema | Clasificación | Decisión requerida |
| --- | --- | --- | --- | --- | --- | --- |
| Necesidad e implementación | H1: RPA/web scraping y actualización automática de fuentes reales. | Ingesta validada de fuente sintética aprobada; N8N manual. No scraping real ni integración institucional en el alcance vigente. | E1/E2/E4. | Mantener información vigente puede ser necesario; scraping/RPA no se justifican sin fuente y acceso. Lo implementado no equivale al objetivo histórico. | TECHNICALLY_OBSOLETE; NEEDS_EVIDENCE; NEEDS_DIRECTOR_APPROVAL | Confirmar si el compromiso es la actualización verificable o las técnicas concretas; no renombrar ingesta como RPA. |
| Tamaño y 16 semanas | Automatización institucional, extensión exacta por cotejar. | Falta contrato de fuente, frecuencia y acceso; scheduled/retry/recover N8N pendientes. | E4/E8. | Dependencias externas y operación hacen alto el riesgo. No es defendible garantizarlo en 16 semanas con acceso aún desconocido. | SCOPE_RISK | Limitar a una fuente autorizada o proponer sustituir/diferir el objetivo mediante aprobación. |
| Entregable y verificabilidad | Captura/actualización reportada, sin detalle literal. | Workflow manual, validación y publicación trazable. | E4: publicación y posterior already_current; no scheduling. | Entregable candidato: ingesta reproducible con fuente, corte y fallos documentados. Es distinto de RPA/scraping. | NEEDS_REWORDING; KEEP_PROVISIONAL | Acordar qué se mide desde disponibilidad de fuente y qué entrega cumple el objetivo revisado. |
| Validación y aprobación | Actualización automática reportada. | E1 propone <24 h y éxito >90 % como interpretación técnica, no medidos. | E1/E4: N3 no acredita esas métricas. | No atribuir origen radicado ni cumplimiento a esos umbrales sin cotejo. Sustituir fuentes reales por fixture es cambio académico. | NEEDS_EVIDENCE; NEEDS_DIRECTOR_APPROVAL | Ratificar o cambiar métricas, fuente y técnica; preservar el OE histórico hasta decisión formal. |

### OE3 — Agentic AI y MCP

| Elemento | Anteproyecto histórico | Estado del repo | Evidencia disponible | Problema | Clasificación | Decisión requerida |
| --- | --- | --- | --- | --- | --- | --- |
| Necesidad e implementación | H1: agente y MCP; E1 interpreta selección dinámica de tools. | Router determinista, servicios y RAG directo; contrato MCP de seis tools, sin servidor ejecutable ni ciclo ReAct integrado. | E3; runtime no compone un agente. | Router y generación no demuestran Agentic AI. Necesidad de selección dinámica aún no justificada con tareas reales. | NEEDS_EVIDENCE; KEEP_PROVISIONAL | Determinar si Agent/MCP es contribución obligatoria, medio opcional o candidato a diferir. |
| Tamaño y 16 semanas | Alcance exacto del agente por cotejar. | Faltan implementación, integración, permisos y evaluación de herramientas. | E1/E3/E8. | Añadir agente y servidor con dominio desconocido amplía diseño y evaluación. Cabida incierta; especialmente riesgoso junto a integración real. | SCOPE_RISK | Exigir casos que no resuelvan adecuadamente los caminos actuales antes de asignar esfuerzo. |
| Entregable y verificabilidad | Agente con herramientas reportado. | Solo contrato y servicios reutilizables; no evidencia de selección dinámica ejecutada. | E3/E9. | Si se mantiene: agente/servidor operativo y evaluación de selección, límites y errores. El contrato solo no satisface ese entregable. | NEEDS_EVIDENCE; NEEDS_REWORDING | Acordar casos, protocolo y criterios de herramientas antes de implementar. |
| Validación y aprobación | No se conoce validación literal prometida. | No hay evaluación ejecutada de Agent/MCP acreditada. | E1/E9. | No se puede marcar como cumplido ni eliminarlo porque el fallback directo ya funciona. | NEEDS_DIRECTOR_APPROVAL; NEEDS_EVIDENCE | Aprobar mantenimiento, acotación, sustitución o diferimiento; actualizar trazabilidad y resultados esperados. |

### OE4 — BPM, N8N e integración estructurada

| Elemento | Anteproyecto histórico | Estado del repo | Evidencia disponible | Problema | Clasificación | Decisión requerida |
| --- | --- | --- | --- | --- | --- | --- |
| Necesidad e implementación | H1: BPM/N8N e integración estructurada, con Google Sheets entre compromisos históricos. | N8N orquesta ingesta asíncrona manual; calendario en releases sintéticas. Google Sheets excluido técnicamente. | E1/E2/E4. | N8N demuestra orquestación concreta, no por sí solo modelado/mejora de un proceso institucional BPM. | NEEDS_REWORDING; TECHNICALLY_OBSOLETE; KEEP_PROVISIONAL | Definir si OE4 exige gestión de procesos institucionales o coordinación técnica de ingesta. |
| Tamaño y 16 semanas | Límites y dependencias de BPM/integración por cotejar. | No hay fuente/calendario real autorizado ni proceso institucional levantado. | E8. | BPM amplio más conectores y evaluación de procesos presenta alto riesgo; un flujo acotado puede ser viable con fuente y criterios definidos. | SCOPE_RISK | Evitar duplicar OE2: separar adquisición/validación de fuente y coordinación/publicación si ambos se mantienen. |
| Entregable y verificabilidad | Flujo e integración reportados. | Workflow versionado y recorrido N3. E1 propone publicación atómica, trazabilidad y conservación de current ante fallo. | E1/E4. | Entregable candidato verificable: flujo reproducible y pruebas de consistencia/fallos pertinentes. No equivale a mejorar BPM sin modelo y línea base. | CONSISTENT; NEEDS_EVIDENCE; NEEDS_REWORDING | Aprobar entregable revisado; confirmar fuentes y descartar o justificar Google Sheets como medio obligatorio. |
| Validación y aprobación | No se dispone del criterio literal de integración/tiempo. | N3 cubre camino manual exitoso y no-op; no todos los fallos ni scheduling. E1 excluye sincronización independiente de 30 min. | E1/E4. | Cambiar fuente, automatismo o umbral afecta evaluación académica. La exclusión técnica no lo formaliza. | NEEDS_EVIDENCE; NEEDS_DIRECTOR_APPROVAL | Ratificar alcance y métricas; no presentar N3 como cumplimiento integral de OE4. |

### OE5 — Mobile React Native y UX

| Elemento | Anteproyecto histórico | Estado del repo | Evidencia disponible | Problema | Clasificación | Decisión requerida |
| --- | --- | --- | --- | --- | --- | --- |
| Necesidad e implementación | H1: aplicación móvil React Native y experiencia de usuario. | Mobile Expo/React Native implementado; chat, citas, fuentes, calendario, progreso e historial sintéticos. | E9 y E1. | Coherencia de canal/tecnología; utilidad para tareas reales y mejora de UX aún deben validarse. | CONSISTENT; NEEDS_EVIDENCE | Confirmar usuarios/tareas prioritarias sin ampliar pantallas a entidades todavía no validadas. |
| Tamaño y 16 semanas | Cobertura de app/UX por cotejar. | Hay base funcional; falta evaluación formal y alguna validación manual posterior. | E9. | Adaptación limitada y estudio acotado son condicionalmente viables; identidad real, transacciones y nuevas integraciones amplían mucho el alcance. | SCOPE_RISK; KEEP_PROVISIONAL | Congelar cobertura esencial y asegurar participantes/protocolo antes de comprometer validación. |
| Entregable y verificabilidad | App y validación con usuarios reportadas. | Artefacto móvil disponible y verificaciones por etapas. | E9. | Entregable candidato: app demostrable, tareas, instrumento, resultados y límites. Implementación sola no demuestra UX. | CONSISTENT; NEEDS_EVIDENCE | Definir entorno, tareas, población, reclutamiento y tratamiento de datos de evaluación. |
| Validación y aprobación | SUS/usuarios según H1; umbrales literales por cotejar. | E1 registra SUS medio >70, ningún resultado <50 y tareas >85 % como criterios; sin resultados SUS acreditados. | E1/E9. | No convertir pruebas físicas del desarrollador en estudio con usuarios ni cumplimiento de umbrales. | NEEDS_EVIDENCE; NEEDS_DIRECTOR_APPROVAL | Acordar protocolo; cualquier sustitución de usuarios por revisión técnica requiere aprobación y limitación explícita. |

### OE6 — On-Premise, Docker y evaluación operacional

| Elemento | Anteproyecto histórico | Estado del repo | Evidencia disponible | Problema | Clasificación | Decisión requerida |
| --- | --- | --- | --- | --- | --- | --- |
| Necesidad e implementación | H1: On-Premise UNAB, Docker, métricas y usuarios reales. | Compose local parcial para PostgreSQL/N8N; no despliegue institucional acreditado. | E2/E3/E4/E6. | Reproducibilidad local es útil, pero no sustituye infraestructura institucional ni disponibilidad productiva. | TECHNICALLY_OBSOLETE; NEEDS_REWORDING; NEEDS_DIRECTOR_APPROVAL | Confirmar si On-Premise institucional es requisito evaluable o aspiración que puede diferirse. |
| Tamaño y 16 semanas | Topología y exigencia operacional literal desconocidas. | Sin infraestructura, acceso, operación ni responsables institucionales confirmados. | E8. | Es una dependencia externa de alto riesgo; no se puede garantizar despliegue, seguridad, usuarios y estabilidad dentro del plazo actual desconocido. | SCOPE_RISK | Separar validación local de eventual despliegue; acotar la entrega académica con el director. |
| Entregable y verificabilidad | Entorno y métricas reportados. | Configuración local y evidencia de latencia existen. | E3/E6. | Entregable candidato: entorno reproducible y protocolo con entorno/carga definidos. No llamarlo «industrial» ni «alta disponibilidad». | KEEP_PROVISIONAL; NEEDS_REWORDING | Fijar qué se considera despliegue, disponibilidad, respuesta y evidencia aceptable. |
| Validación y aprobación | Métricas/usuarios reportados; detalle literal pendiente. | E1 registra media <5 s y ausencia de caídas >5 min como referencias; L1-B media 4013.57 ms en 10 warm, 8/10 <5 s, sin acreditar OE6. | E1/E6/E9. | Media de una muestra no demuestra SLA, estabilidad prolongada o validación con usuarios; no duplicar UX de OE5 como evidencia operacional. | NEEDS_EVIDENCE; NEEDS_DIRECTOR_APPROVAL | Aprobar entorno y protocolo; decidir qué evaluación corresponde a OE5 y cuál a OE6. |

Inferencia transversal: **OE2, OE3, OE4 y OE6 tienen el mayor riesgo de alcance y
dependencia externa**. OE1 y OE5 conservan una base técnica más cercana a sus temas,
pero siguen pendientes corpus/protocolo y validación. No se borra ningún OE ni se
declara su cumplimiento académico en esta auditoría.

## 8. Corpus y fuentes de información

| Capa | Estado | Implicación |
| --- | --- | --- |
| Anteproyecto histórico, H1/E2 | Documentos institucionales CCD y fuentes reales reportados como compromiso. | Debe cotejarse qué corpus, acceso y validación exigía exactamente. |
| Repositorio, E1/E7 | Corpus funcional 100 % sintético en `/data/synthetic`; representación procesada en PostgreSQL. | Es útil para reproducibilidad, regresiones y demostración; no cumple automáticamente la promesa de corpus institucional real. |
| Discovery, E8 | Información pública reportada, entidades candidatas y fuentes internas pendientes. No hay originales/URLs comprobados en estos artefactos ni autorización de integración. | No equivale a corpus obtenido, representativo ni utilizable por BanuChat. |

Clasificación de la discrepancia: **NEEDS_REWORDING; NEEDS_EVIDENCE;
NEEDS_DIRECTOR_APPROVAL; SCOPE_RISK**. Decisión académica requerida: determinar
si un prototipo sintético explícitamente delimitado satisface el trabajo, o si
debe incorporar un corpus real autorizado para responder la pregunta y objetivos.

Si se exige corpus real, definir fuente, permiso, cobertura y evaluación antes de
prometerlo; si no se obtiene acceso, revisar el alcance con el director. Si se
acepta corpus sintético, formalizar el cambio y limitar las conclusiones. No
reclasificar el dataset como real, sobrescribir v1 ni mezclar datos personales
de pruebas de usabilidad con el corpus funcional.

## 9. Arquitectura

**Histórica, reconstruida desde H1/E2:** aplicación móvil y tecnologías RAG,
PostgreSQL/pgvector, N8N, Agent/MCP, BPM/RPA, scraping, Google Sheets, Docker y
On-Premise UNAB. No se conoce el diagrama original completo ni se reconstruye
una topología exacta inventada.

**Actual, evidencia E1/E3:** Mobile → REST → Intent Router → fast paths/renderers
o Document RAG directo → persistencia/respuesta. N8N queda fuera de consultas y
orquesta ingesta sintética manual local. Agent/ReAct y MCP ejecutable pendientes.

**Provisional para contrastar con discovery, inferencia E8:** conservar la separación
de consulta estructurada, explicación documental, lookup y orientación; fuentes,
identidad y operación se deciden con el CCD. No existe todavía una arquitectura
institucional aprobada ni se requiere un agente para toda consulta.

Las etiquetas de esta tabla son únicamente técnicas para esta sección. `KEEP`
preserva un principio/activo dentro de su alcance; `KEEP_PROVISIONAL` lo condiciona;
`REMOVE_FROM_ACADEMIC_SCOPE_CANDIDATE` propone exclusión, sin ejecutarla;
`NEEDS_JUSTIFICATION` exige necesidad demostrable; `NEEDS_DIRECTOR_APPROVAL`
identifica impacto académico.

| Elemento | Histórico reportado frente a estado actual | Etiqueta técnica | Decisión académica/provisional y dependencia |
| --- | --- | --- | --- |
| Mobile | H1 compromete app; E9 la implementa en React Native/Expo con datos sintéticos. | KEEP | Conservar el activo; confirmar tareas/usuarios y no confundir demo con operación institucional. |
| REST | Su papel exacto en el original no consta; hoy es la frontera implementada. | KEEP | Documentar la frontera real en la futura arquitectura, sin atribuirla a un texto histórico no leído. |
| N8N | Tecnología histórica; hoy ingesta manual asíncrona, no gateway conversacional. | KEEP_PROVISIONAL; NEEDS_DIRECTOR_APPROVAL | Conservar solo la función justificable; formalizar cualquier sustitución del compromiso histórico de automatización/proceso. |
| RAG | Tema central histórico; hoy generación documental directa sobre ficción. | KEEP_PROVISIONAL; NEEDS_DIRECTOR_APPROVAL | Delimitar tareas, corpus y evaluación. El cambio de corpus requiere decisión académica. |
| PostgreSQL | Presencia histórica reportada y persistencia actual. | KEEP_PROVISIONAL | Conservar base técnica mientras se define información autorizada; no copiar el modelo sintético al CCD. |
| pgvector | Presencia histórica reportada; retrieval exacto actual. | KEEP_PROVISIONAL | Justificar recuperación vectorial según corpus y preguntas, sin tuning ni índices nuevos en esta auditoría. |
| Agent/ReAct | Compromiso histórico reportado, objetivo técnico aún pendiente. | NEEDS_JUSTIFICATION; NEEDS_DIRECTOR_APPROVAL | Mantener solo si contribuye a tareas/objetivo evaluable; posible diferimiento, sin eliminarlo por decisión técnica unilateral. |
| MCP | Contrato de seis tools; no servidor ejecutable integrado. | NEEDS_JUSTIFICATION; NEEDS_DIRECTOR_APPROVAL | Un contrato no cumple una promesa de herramientas ejecutadas. Evaluar su necesidad junto con OE3. |
| BPM | H1 lo incluye; E4 acredita un flujo técnico, no una intervención BPM institucional evaluada. | NEEDS_JUSTIFICATION; REMOVE_FROM_ACADEMIC_SCOPE_CANDIDATE; NEEDS_DIRECTOR_APPROVAL | O definir proceso, actores, mejora y validación, o reformular hacia orquestación técnica con aprobación. No equiparar la herramienta con la metodología. |
| RPA | H1 lo incluye; no hay evidencia de robot institucional en el alcance inspeccionado. | NEEDS_JUSTIFICATION; REMOVE_FROM_ACADEMIC_SCOPE_CANDIDATE; NEEDS_DIRECTOR_APPROVAL | No construir automatización de interfaz sin necesidad/acceso; retirar o sustituir la promesa solo con justificación aprobada. |
| Scraping | Antecedente reportado por H1/E2; expresamente fuera del alcance técnico vigente. | REMOVE_FROM_ACADEMIC_SCOPE_CANDIDATE; NEEDS_DIRECTOR_APPROVAL | Una fuente entregada o canal autorizado podría volverlo innecesario. No elegir scraping por ausencia de API ni afirmar permiso. |
| Google Sheets | Compromiso histórico reportado; calendario actual en dataset sintético. | REMOVE_FROM_ACADEMIC_SCOPE_CANDIDATE; NEEDS_DIRECTOR_APPROVAL | Confirmar si fue requisito o medio propuesto; no conservarlo sin fuente real que lo justifique. |
| Docker | Activo local: Compose solo PostgreSQL/N8N. | KEEP | Preservar reproducibilidad local; no presentar todos los componentes como contenedorizados. |
| On-Premise UNAB | Antecedente H1/E2; no despliegue institucional acreditado. | REMOVE_FROM_ACADEMIC_SCOPE_CANDIDATE; NEEDS_DIRECTOR_APPROVAL | Confirmar si se permite despliegue local como entregable; son entornos académicamente distintos. |

Intent Router, fast paths y Document Lookup son adiciones visibles en el runtime
actual; su relación con la redacción académica deberá explicarse sin atribuir al
anteproyecto un diseño no comprobado. La reutilización técnica no acredita por sí
sola cumplimiento de OE ni autoriza nuevas integraciones.

## 10. Metodología

H1 solicita auditar investigación aplicada, DSR, Scrum/adaptación, entrevistas,
usuarios, SUS, RAGAS y 16 semanas. Sin el texto original no se certifica qué
definición, secuencia o instrumento quedó radicado. Los juicios siguientes son
inferencias y direcciones de revisión, no una metodología reescrita.

| Elemento histórico reportado | Evidencia actual | Incoherencia/riesgo | Dirección de reconciliación | Clasificación |
| --- | --- | --- | --- | --- |
| Investigación aplicada | Hay artefacto técnico y evaluaciones sintéticas; necesidad institucional aún por contrastar. | Implementar tecnología no prueba solución de un problema real ni impacto. | Conectar tarea validada, artefacto y evaluación dentro del alcance aprobado. | KEEP_PROVISIONAL; NEEDS_EVIDENCE |
| DSR | Iteraciones técnicas y evidencia versionada; no se acreditó el ciclo académico completo ni sus registros formales. | Etiquetar retrospectivamente cada cambio como fase cumplida puede falsear la metodología. | Presentar ciclos reales de diseño/prototipado y sus límites; justificar su encaje académico con el director. | NEEDS_REWORDING; NEEDS_EVIDENCE |
| Scrum/adaptación | Implementación incremental documentada; no se inspeccionó evidencia de ceremonias, roles o sprints formales. | Commits y etiquetas de etapas no prueban Scrum. | Describir prácticas realmente usadas y la adaptación, sin inventar reuniones ni artefactos. | NEEDS_EVIDENCE; NEEDS_REWORDING |
| Entrevistas y levantamiento | E8 prepara preguntas y modelo conceptual; no acredita entrevistas realizadas ni validación del CCD. | Presentar discovery como insumo ya completado de una implementación previa. | Registrar levantamiento pendiente y explicar que la base inicial fue sintética. | NEEDS_EVIDENCE; NEEDS_REWORDING |
| Usuarios | E9 reporta pruebas manuales del prototipo; no estudio formal con población institucional. | Mezclar teléfono físico con usuarios representativos. | Definir población, tareas, acceso y tratamiento de datos de la evaluación, separados del corpus funcional. | NEEDS_EVIDENCE |
| SUS | Sin resultados acreditados. | Declarar mejora de experiencia desde validación funcional. | Acordar protocolo, participantes y criterio; reportar limitaciones de muestra e interpretación. | NEEDS_EVIDENCE; NEEDS_DIRECTOR_APPROVAL |
| RAGAS | Protocolo M9 y pool draft; evaluación no ejecutada. | Confundir retrieval K2 con calidad RAG integral. | Definir corpus y benchmark pertinente, congelar protocolo y registrar evaluación cuando se autorice. | NEEDS_EVIDENCE; NEEDS_DIRECTOR_APPROVAL |
| 16 semanas | Horizonte reportado; fecha de inicio, dedicación y disponibilidad externa no aportadas. | Tratar accesos, revisión y usuarios como recursos garantizados. | Reestimar tras decisiones P0 y mostrar dependencias; no producir fechas ficticias. | SCOPE_RISK; NEEDS_EVIDENCE |

### Secuencia que puede documentarse sin falsearla

| Evidencia cronológica | Qué ocurrió o qué consta | Cómo describirlo académicamente |
| --- | --- | --- |
| ADR 0001, 2026-09-22 | Decisión interna de alcance sintético/local. | Decisión técnica temprana; aprobación académica del cambio no acreditada. |
| K2, 2026-10-01 | Evaluación de retrieval sintético versionada. | Validación técnica preliminar de un corpus de desarrollo. |
| N3, 2026-10-02 | Ejecución manual local de ingesta desde N8N. | Comprobación de un recorrido técnico; no integración institucional. |
| L1-B, evidencia fechada 2026-10-03 en el repositorio | Medición warm local con revisión y entorno registrados. | Observación de rendimiento bajo condiciones acotadas, no SLA. |
| Re-baseline y discovery, 2026-10-15 | Documentos para iniciar/ordenar levantamiento, con supuestos explícitos. | Revisión de alcance posterior al prototipado inicial; no entrevistas ni confirmación institucional ya realizadas. |

La secuencia defendible es **prototipado sintético y validación técnica preliminar →
reconciliación/levantamiento → posible adaptación y evaluación del alcance aprobado**.
No reordenar fechas para fingir que el modelo técnico se derivó de un levantamiento
institucional ya terminado. Un objetivo revisado deberá enlazar actividad,
entregable, evidencia y tiempo; ninguna etapa se declara completada por el mero
hecho de estar prevista en un plan.

## 11. Evaluación RAG / M9

Evidencia inspeccionada, no ejecutada nuevamente en A4:

- **K2:** 18 casos chunked sintéticos, top_k=5, MRR@5=0.8519,
  Precision@5≈0.2222, Recall@5=Hit@5=1. Los documentos full_document quedaron
  fuera del vectorial. No mide faithfulness, generación, UX ni efecto CCD.
- **M9:** el JSON contiene 63 candidatas únicas, M9-P-001–M9-P-063,
  todas `draft`; estado global `draft`. No es benchmark final institucional ni
  conjunto aprobado/congelado. El README documenta que RAGAS no se ejecutó.
- **Pausa:** E8 congela expansión P-064+, RAGAS final y tuning por dependencia de
  definición del dominio. Es una decisión documental de trabajo, no un estado
  automatizado del JSON ni prueba de aprobación académica.
- **Targets:** E7 registra faithfulness/context precision/answer relevancy ≥0.80,
  context recall ≥0.75 y MRR@5 ≥0.70 como criterios del proyecto, no estándares
  universales ni resultados. Su origen y encaje en la versión radicada requieren cotejo.

El índice general E9 usa la expresión ambigua «sin preguntas reales» para M9 y
no refleja el pool actual. Si «reales» significa institucionales, no hay contradicción
con los drafts sintéticos; si significa preguntas escritas, el resumen quedó atrás.
Para el conteo prevalece el JSON inspeccionado. No se modifica el índice.

Clasificación: **CONSISTENT** como prototipado y validación técnica preliminar;
**NEEDS_EVIDENCE; NEEDS_DIRECTOR_APPROVAL** para su aceptación como evaluación
académica final. No mezclar estadísticamente K2, generación, latencia y M9 ni
transformar Precision@5 en context precision de RAGAS. Conservar gold, revisión,
entorno, resultados y límites; si se exige dominio real, diseñar después un
benchmark pertinente sin reutilizar automáticamente los drafts como reserva limpia.

## 12. Resultados esperados

Se auditan las expresiones señaladas en H1, **sin atribuirlas como citas verificadas
del original**. Marcas locales: `UNSUPPORTED` sin respaldo disponible;
`TOO_STRONG` excede el alcance de la evidencia; `MEASURABLE` admite evaluación si se
operacionaliza; `NOT_MEASURABLE` no es evaluable en su formulación actual;
`REMOVE_OR_REWORD` propone retirar o reformular, sin hacerlo en el anteproyecto.
Ser medible no significa estar medido ni demostrado.

| Afirmación histórica a cotejar | Evidencia/inferencia de auditoría | Marcas locales | Dirección de redacción defendible propuesta |
| --- | --- | --- | --- |
| «Nivel industrial» | No se define estándar, carga, seguridad, operación o aceptación; E3/E4 describen entorno local. | UNSUPPORTED; TOO_STRONG; NOT_MEASURABLE; REMOVE_OR_REWORD | Prototipo reproducible evaluado bajo condiciones y límites explícitos. |
| Alta disponibilidad | No se acreditan redundancia, monitoreo prolongado ni protocolo de disponibilidad. | UNSUPPORTED; TOO_STRONG; MEASURABLE; REMOVE_OR_REWORD | Medir estabilidad local con duración/carga definidas, si ese es el alcance aprobado. |
| Reducción de carga administrativa | No hay línea base o comparación institucional. | UNSUPPORTED; MEASURABLE; REMOVE_OR_REWORD | Evaluar apoyo a tareas informativas; prometer efecto administrativo solo con diseño de medición viable. |
| Optimización significativa | No se define variable ni significancia; L1-B tiene interpretación descriptiva limitada. | UNSUPPORTED; TOO_STRONG; NOT_MEASURABLE; REMOVE_OR_REWORD | Reportar diferencias observadas para una métrica y condiciones predefinidas, sin generalización indebida. |
| Información institucional siempre exacta | Corpus real no obtenido; citas no garantizan verdad y reglas cambian. El absoluto no se puede acreditar con una muestra. | UNSUPPORTED; TOO_STRONG; NOT_MEASURABLE; REMOVE_OR_REWORD | Respuestas sustentadas en fuentes autorizadas, con versión, límites y declaración de evidencia insuficiente, sujetas a evaluación. |
| Autonomía | Hay rutas deterministas e ingesta iniciada manualmente; no autonomía general demostrada. | UNSUPPORTED; TOO_STRONG; NOT_MEASURABLE; REMOVE_OR_REWORD | Describir exactamente qué pasos se ejecutan automáticamente y cuáles requieren decisión humana. |
| Agentic AI | E3 confirma fallback directo y agente pendiente. | UNSUPPORTED; MEASURABLE; REMOVE_OR_REWORD | Registrar como objetivo pendiente solo si se mantiene y se define evaluación de comportamiento/herramientas. |
| BPM/RPA | E4 acredita un flujo técnico; no robot ni intervención institucional de procesos evaluada. | UNSUPPORTED; MEASURABLE; REMOVE_OR_REWORD | Orquestación asíncrona trazable para el alcance realmente implementado, con aprobación si sustituye el compromiso histórico. |
| On-Premise UNAB | No existe despliegue institucional acreditado; Compose local no es equivalente. | UNSUPPORTED; MEASURABLE; REMOVE_OR_REWORD | Ejecución local reproducible, si el director acepta el cambio de entregable; despliegue institucional quedaría condicionado. |
| Mejora de experiencia | App y comprobaciones funcionales presentes, sin SUS ni comparación formal. | UNSUPPORTED; MEASURABLE; REMOVE_OR_REWORD | Evaluación de usabilidad y completación de tareas según protocolo acordado, sin afirmar mejora antes de medir. |

Retirar superlativos para escribir con precisión es distinto de eliminar un
resultado obligatorio: si cambia el compromiso evaluable, requiere revisión
académica y actualización trazable, no solo edición de estilo.

## 13. Cronograma de 16 semanas

Inferencia de viabilidad, no cronograma definitivo. No se conoce si las 16 semanas
son totales o restantes, ni la dedicación, capacidad o ventanas institucionales.
Por ello no se asignan duraciones inventadas ni fechas de entrega. La experiencia
ya implementada reduce trabajo técnico, pero no elimina permisos, revisión ni usuarios.

| Trabajo | Prioridad candidata | Dependencia y riesgo de plazo |
| --- | --- | --- |
| Confirmar alcance académico y fuente histórica | MUST_HAVE | Desbloquea qué puede evaluarse; precede a ampliar implementación. |
| Discovery CCD y fuentes/autoridad | MUST_HAVE | Reunión y decisiones externas; no asumir disponibilidad inmediata. |
| Modelado validado del alcance elegido | MUST_HAVE | Depende del dominio; no diseñar entidades reales con hipótesis abiertas. |
| Conservar/adaptar el prototipo esencial | MUST_HAVE | Solo a tareas confirmadas; reutilizar app, consulta y trazabilidad. |
| Evaluación técnica/RAG pertinente y documentación | MUST_HAVE | Corpus, protocolo y criterios aprobados; no equivale a ejecutar M9 ahora. |
| Evaluación de usuarios acordada | MUST_HAVE si se mantiene OE5 | Depende de población, convocatoria, tratamiento de datos y disponibilidad; no puede desaparecer por falta de tiempo sin decisión. |
| Integración acotada con corpus real autorizado | SHOULD_HAVE si es opcional; MUST_HAVE si el director la exige | Sin acceso confirmado no es una promesa planificable. Definir alternativa aprobada ante bloqueo. |
| Pulido móvil y pruebas adicionales focalizadas | SHOULD_HAVE | Después de asegurar tareas, validación y documentación esenciales. |
| Datos personales, transacciones y varios sistemas | FUTURE propuesto | Identidad, permisos y reglas múltiples multiplican dependencias. |
| Agent/MCP, RPA/BPM amplio y despliegue institucional | FUTURE propuesto, sujeto a decisión sobre OE | No pueden reclasificarse como futuros unilateralmente si son obligatorios. |

| Combinación | Juicio relativo de viabilidad |
| --- | --- |
| Reconciliación + prototipo local acotado + evaluación/documentación | La más defendible con los activos existentes; aceptación del corpus y usuarios siguen condicionantes. No garantiza plazo. |
| Lo anterior + corpus documental real acotado mediante canal autorizado | Viabilidad condicionada a obtener permisos/fuentes temprano y limitar formatos/alcance. |
| Lo anterior + múltiples integraciones + progreso personal + autenticación + transacciones | Inferencia de riesgo muy alto: no es razonable comprometer el conjunto en 16 semanas con dependencias aún desconocidas. |
| Además Agent/ReAct/MCP + scraping/RPA + BPM institucional + On-Premise/alta disponibilidad + evaluación formal completa | La acumulación excede razonablemente un alcance defendible de 16 semanas en las condiciones conocidas. No es una estimación numérica: exige accesos, operación y varias evaluaciones no resueltas. |

Decisión propuesta: elegir un conjunto mínimo evaluable, confirmar qué se difiere
y conservar tiempo para evidencia y escritura. No usar la cantidad de código
existente como sustituto de esa evaluación de dependencias.

## 14. Matriz maestra de reconciliación

La columna histórica resume H1/E2; no sustituye el cotejo del original. Las
clasificaciones usan exclusivamente la sección 2. «Responsable de decisión»
identifica **categorías que deben intervenir**, no personas, competencias legales
ni un procedimiento institucional confirmado. Varias categorías no implican
aprobación conjunta ya obtenida; el trámite académico aplicable sigue por confirmar.

| ID | Sección | Afirmación/compromiso histórico | Estado actual repo | Discovery/evidencia CCD | Clasificación | Riesgo | Decisión requerida | Responsable de decisión | Impacto si cambia |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| A4-01 | Nombre | H1/E2 identifican un nombre anterior. | BanuChat es el nombre vigente, E1. | El nombre no valida el dominio ni acceso. | NEEDS_REWORDING; NEEDS_DIRECTOR_APPROVAL | Confundir cambio nominal con cambio de alcance. | Confirmar actualización de la versión académica preservando historia. | EQUIPO; DIRECTOR; FACULTAD/PROCESO_ACADÉMICO | Portada, títulos, referencias y anexos; no altera por sí mismo OE. |
| A4-02 | Problema | Fragmentación, repetición, carga y desactualización a cotejar, H1. | Prototipo de consulta sintética, E1/E3. | Canales reportados; sin línea base del problema, E8. | NEEDS_EVIDENCE; NEEDS_REWORDING; UNSUPPORTED | Construir la justificación sobre impactos no observados. | Validar brecha, tareas y evidencia antes de afirmar magnitud. | EQUIPO; CCD; DIRECTOR | Problema, justificación, pregunta y medición de efectos. |
| A4-03 | Pregunta | Posible dependencia de RAG/N8N; texto literal ausente. | Solución híbrida con caminos sin generación. | D3 distingue datos, documentos y fronteras personales. | NEEDS_EVIDENCE; NEEDS_REWORDING; NEEDS_DIRECTOR_APPROVAL | Forzar tecnologías por redacción. | Cotejar y centrar pregunta en resultado investigable. | DIRECTOR; EQUIPO | Pregunta, objetivo general y criterios de evaluación. |
| A4-04 | Objetivo general | Promesa de solución/beneficios institucionales reportada; literal pendiente. | Artefacto técnico parcial, sin impacto institucional acreditado. | Necesidad, fuentes y usuarios aún por validar. | NEEDS_REWORDING; NEEDS_EVIDENCE; NEEDS_DIRECTOR_APPROVAL; SCOPE_RISK | Confundir construir con demostrar mejora. | Acotar resultado, población, corpus y validación. | DIRECTOR; EQUIPO | Objetivo general, OE, metodología y resultados. |
| A4-05 | OE1 | RAG sobre documentos institucionales, H1. | Document RAG sobre corpus sintético, E3/E7. | Documentos internos/autoridad/uso pendientes, E8. | NEEDS_EVIDENCE; NEEDS_DIRECTOR_APPROVAL; SCOPE_RISK | Evaluar dominio distinto del prometido. | Decidir corpus aceptable y alcance documental. | DIRECTOR; CCD; EQUIPO | Corpus, pregunta evaluable, pruebas y límites de generalización. |
| A4-06 | OE1/evaluación | Evaluación RAG/RAGAS reportada. | K2 retrieval sintético; sin RAGAS M9 ejecutada. | No benchmark final del CCD. | NEEDS_EVIDENCE; NEEDS_REWORDING | Acreditar calidad generativa con retrieval. | Acordar protocolo final y presentar K2 como preliminar. | DIRECTOR; EQUIPO | Evidencia OE1 y resultados esperados. |
| A4-07 | OE2 | RPA/scraping y actualización automática, H1/E2. | Fuente sintética aprobada e ingesta N8N manual, E4. | APIs, permisos y frecuencia no confirmados. | TECHNICALLY_OBSOLETE; NEEDS_DIRECTOR_APPROVAL; SCOPE_RISK | Sustituir objetivo sin formalizarlo o automatizar fuente inexistente. | Mantener con justificación, sustituir por ingesta verificable o diferir. | DIRECTOR; CCD; EQUIPO | Técnica, fuente, entregable y métrica de actualización. |
| A4-08 | OE3 | Agentic AI/MCP, H1. | Contrato MCP sin ejecutable; RAG directo, E3. | Necesidad de herramientas aún no demostrada. | NEEDS_EVIDENCE; NEEDS_DIRECTOR_APPROVAL; SCOPE_RISK | Añadir complejidad o declarar agente inexistente. | Confirmar obligatoriedad y evaluación; acotar/diferir si se aprueba. | DIRECTOR; EQUIPO | Objetivo, arquitectura y evaluación de selección de herramientas. |
| A4-09 | OE4 | BPM/N8N e integración estructurada, H1. | Orquestación manual de releases; E4 no acredita BPM institucional. | Procesos/fuentes no levantados completamente. | NEEDS_REWORDING; NEEDS_DIRECTOR_APPROVAL; SCOPE_RISK | Equiparar workflow con mejora de procesos. | Delimitar proceso, coordinación técnica y relación con OE2. | DIRECTOR; CCD; EQUIPO | Actividades, entregable y criterios de orquestación/integración. |
| A4-10 | OE5 | App React Native y UX, H1. | Mobile implementado; validación manual parcial, E9. | Tareas/usuarios reales por confirmar. | CONSISTENT; NEEDS_EVIDENCE; KEEP_PROVISIONAL | Presentar pruebas del desarrollador como UX formal. | Acordar estudio y mantener cobertura esencial. | EQUIPO; DIRECTOR; CCD | Instrumentos, participantes, tareas y límites UX. |
| A4-11 | OE6 | On-Premise UNAB, Docker y métricas, H1/E2. | Compose parcial local; L1-B acotado, E3/E6. | Infraestructura y operación no confirmadas. | TECHNICALLY_OBSOLETE; NEEDS_DIRECTOR_APPROVAL; SCOPE_RISK | Declarar despliegue institucional o SLA desde ejecución local. | Confirmar requisito de entorno y evaluación operacional aceptable. | DIRECTOR; CCD; FACULTAD/PROCESO_ACADÉMICO | Despliegue, recursos, protocolo y alcance académico. |
| A4-12 | Corpus | Fuentes reales CCD como base funcional, H1. | `/data/synthetic` es fuente de verdad, E1. | CP preliminares no son corpus autorizado. | NEEDS_DIRECTOR_APPROVAL; NEEDS_EVIDENCE; NEEDS_REWORDING | Reetiquetar datos ficticios como institucionales. | Formalizar corpus sintético o exigir corpus real delimitado. | DIRECTOR; CCD; EQUIPO | Contribución, validez externa y plan de evaluación. |
| A4-13 | Arquitectura | Topología histórica exacta no disponible. | REST/router/fast paths/lookup/RAG directo, E3. | Mecanismo depende de tipo de información, D3. | NEEDS_REWORDING; KEEP_PROVISIONAL | Documentar diagrama objetivo como runtime. | Mostrar arquitectura actual y objetivo condicionado por separado. | EQUIPO; DIRECTOR | Diagramas, justificación y trazabilidad con OE3/OE4. |
| A4-14 | Calendario/Google Sheets | Google Sheets entre medios históricos, H1/E2. | Calendario dentro de releases sintéticas; Sheets excluido. | Fuente de calendario real desconocida. | TECHNICALLY_OBSOLETE; NEEDS_DIRECTOR_APPROVAL | Conservar una dependencia no justificada o retirarla sin aprobación. | Confirmar si era medio o requisito; proponer eliminación del medio si procede. | DIRECTOR; CCD; EQUIPO | Fuente, automatización y posibles criterios de OE4. |
| A4-15 | Integración | Información real y automatización reportadas. | Sin APIs reales UNAB/CCD en alcance vigente, E1/E3. | Sistemas mencionados no prueban interfaces ni acceso. | NEEDS_EVIDENCE; SCOPE_RISK | Diseñar conectores o permisos imaginarios. | Confirmar canal técnico y autorización por fuente antes de comprometer integración. | CCD; EQUIPO; DIRECTOR | Viabilidad, operación y cronograma. |
| A4-16 | Personalización | Alcance histórico individual literal por cotejar. | Perfiles ficticios no autentican, E1/E9. | Progreso, historial, elegibilidad y cupos siguen sin fuente/acceso. | NEEDS_EVIDENCE; SCOPE_RISK; KEEP_PROVISIONAL | Confundir demo con expediente autorizado. | Mantener consultas personales fuera del MVP candidato salvo necesidad y autorización. | CCD; DIRECTOR; EQUIPO | Identidad, permisos, corpus y alcance funcional. |
| A4-17 | Metodología | DSR/Scrum/entrevistas reportados, H1. | Prototipado y pruebas preceden a discovery documentado, E4–E8. | Entrevistas/validación CCD no acreditadas. | NEEDS_REWORDING; NEEDS_EVIDENCE | Falsear la secuencia de investigación. | Describir ciclos y prácticas reales; documentar levantamiento posterior. | EQUIPO; DIRECTOR | Metodología, bitácora, limitaciones y cronograma. |
| A4-18 | Usuarios/SUS | Evaluación con usuarios, H1. | Sin resultados formales acreditados, E9. | Población/reclutamiento por acordar. | NEEDS_EVIDENCE; NEEDS_DIRECTOR_APPROVAL | Sustituir usuarios por pruebas técnicas sin reconocerlo. | Acordar protocolo viable o alternativa expresamente aprobada. | DIRECTOR; EQUIPO; CCD | OE5/OE6, instrumentos y conclusiones. |
| A4-19 | M9 | Evaluación final institucional reportada en el alcance histórico, no protocolo M9 original. | 63 drafts sintéticos; pausas documentadas, E7/E8. | Dominio real no congelado. | NEEDS_REWORDING; NEEDS_EVIDENCE | Sobreajuste o presentar desarrollo como benchmark final. | Preservar drafts; definir evaluación posterior al acuerdo de corpus. | EQUIPO; DIRECTOR | Comparabilidad, gold, reserva y evidencia OE1. |
| A4-20 | Resultados/impacto | Carga reducida, optimización, exactitud o nivel industrial a auditar, H1. | Evidencia local parcial; no impacto ni garantía universal. | Sin línea base ni validación institucional. | UNSUPPORTED; NEEDS_REWORDING; NEEDS_DIRECTOR_APPROVAL | Sobreafirmación de resultados. | Eliminar superlativos; aprobar resultados medibles y delimitados. | DIRECTOR; EQUIPO | Resultados esperados, hipótesis y conclusiones. |
| A4-21 | Disponibilidad/rendimiento | Alta disponibilidad y métricas operacionales a cotejar. | L1-B: 10 warm, media 4013.57 ms; no acredita estabilidad, E6. | Carga/infraestructura institucional desconocidas. | NEEDS_EVIDENCE; NEEDS_REWORDING | Confundir media muestral con SLA. | Definir entorno, carga, duración y criterios antes de evaluar. | EQUIPO; DIRECTOR | OE6 y protocolo operacional. |
| A4-22 | Cronograma | Horizonte de 16 semanas, H1. | Base implementada con pendientes técnicos y académicos. | Accesos, fuentes y usuarios sin calendario confirmado. | SCOPE_RISK; NEEDS_EVIDENCE; NEEDS_DIRECTOR_APPROVAL | Prometer simultáneamente integración, agentes, automatización y despliegue. | Confirmar semanas disponibles, capacidad y alcance mínimo. | DIRECTOR; EQUIPO | Priorización, entregables y actividades diferidas. |
| A4-23 | Aprobaciones | Estado de aprobación del texto original desconocido. | ADR técnicos y contratos congelados; no constancia de cambio académico. | Aprobación CCD tampoco acreditada. | NEEDS_DIRECTOR_APPROVAL; NEEDS_EVIDENCE | Tratar decisión técnica como autorización académica. | Confirmar proceso aplicable y registrar decisiones con trazabilidad. | DIRECTOR; FACULTAD/PROCESO_ACADÉMICO | Validez de cambios de objetivos, alcance y resultados. |
| A4-24 | Fuente histórica/referencias | Versión original completa no disponible para cotejo. | Hay resúmenes históricos y documentos de estado. | Discovery no sustituye fuente académica. | NEEDS_EVIDENCE | Atribuir al original formulaciones o métricas no leídas. | Obtener versión pertinente y completar referencias/páginas antes de reescribir. | EQUIPO; DIRECTOR | Precisión de toda la reconciliación y futura actualización. |

## 15. Decisiones que pueden tomarse técnicamente

Decisiones propuestas dentro del alcance ya autorizado, sin modificar el compromiso
académico ni habilitar implementación en A4:

- Describir con precisión el runtime actual y distinguirlo del objetivo Agent/MCP.
- Usar BanuChat en documentación nueva, conservando el nombre anterior solo como
  referencia histórica; no alterar por ello el documento radicado.
- Preservar dataset v1, contratos, artefactos y resultados con su procedencia y
  límites; no sumar corridas incompatibles ni atribuir resultados no ejecutados.
- Identificar M9 como corpus de desarrollo sintético y mantener las pausas vigentes.
- Separar catálogo/oferta, regla/decisión personal, fuente/canal y prueba manual/
  evaluación formal como distinciones de análisis.
- Preparar matrices, inventarios y preguntas sin afirmar aprobaciones ni integrar
  fuentes reales.

Estas decisiones mejoran exactitud y trazabilidad. No facultan al equipo para
declarar cumplido un OE, sustituir datos reales por sintéticos como criterio final,
eliminar evaluaciones o cambiar unilateralmente el despliegue prometido.

## 16. Decisiones que requieren aprobación académica

| Cambio candidato | Por qué afecta el compromiso | Qué confirmar/formalizar |
| --- | --- | --- |
| Cambiar alcance, problema, pregunta u objetivo general | Modifica la contribución que se evaluará y la cadena metodológica. | Redacción vigente, justificación, impactos y aceptación del director/proceso aplicable. |
| Sustituir corpus institucional por sintético, o definir alcance híbrido | Cambia validez externa y evidencia esperada. | Corpus aceptable, límites de conclusiones y evaluación correspondiente. |
| Eliminar, sustituir, fusionar o diferir OE | Cambia los compromisos específicos. | Decisión por OE con entregable/validación alternativos y trazabilidad; no borrado silencioso. |
| Eliminar On-Premise institucional y conservar ejecución local | Modifica entorno, operación y posible criterio de OE6. | Si era requisito evaluable o aspiración, y qué evidencia local sería admisible. |
| Eliminar scraping/RPA y conservar ingesta autorizada | Cambia técnica y potencialmente alcance de OE2. | Necesidad real, alternativa de fuente y métrica revisada. |
| Eliminar/diferir Agent/ReAct o MCP | Afecta OE3 y resultados de autonomía/herramientas. | Obligatoriedad, beneficio esperado, validación o sustitución justificada. |
| Reformular BPM/N8N/Google Sheets | Puede cambiar proceso, fuente y automatismo de OE4. | Alcance real de gestión de procesos frente a orquestación técnica. |
| Sustituir evaluación con usuarios, métricas o resultados sustanciales | Cambia evidencia de calidad/usabilidad/impacto. | Protocolo y criterios revisados; no reemplazar resultados por implementación. |

No se conoce aquí el procedimiento UNAB para estos cambios. Debe confirmarse con
el director y, si corresponde, con la categoría FACULTAD/PROCESO_ACADÉMICO; no se
inventan formularios, comités, plazos ni competencias. Autorización académica y
autorización de acceso/uso de datos por el CCD siguen siendo decisiones diferentes.

## 17. Preguntas para el director

Preguntas propuestas, sin respuestas ni aprobaciones presumidas. P0 condiciona el
alcance y la evaluación; P1 concreta el trabajo tras esas decisiones; P2 mejora la
presentación y continuidad sin bloquear la definición inicial. Los IDs permiten
registrar posteriormente respuesta, fecha, evidencia e impacto en A4-01–A4-24.

| ID | Prioridad | Pregunta concreta | Qué desbloquea |
| --- | --- | --- | --- |
| DIR-01 | P0 | ¿Cuál es la versión del anteproyecto que debe cotejarse, cuál es su estado de aprobación y puede actualizarse formalmente? ¿Con quién debe confirmarse el procedimiento aplicable? | Fuente histórica verificable y vía de formalización; A4-23/24. |
| DIR-02 | P0 | ¿Es admisible evaluar el proyecto con corpus sintético explícitamente declarado, o se exige corpus real del CCD? Si se exige, ¿cuál sería el mínimo de fuentes y tareas aceptable y qué alternativa se admite si el CCD no autoriza acceso? | Corpus, límites de contribución y dependencia institucional; A4-05/12/15. |
| DIR-03 | P0 | ¿OE2, OE3 y OE4 deben mantenerse literalmente, o puede proponerse su reformulación, sustitución o agrupación con entregables y criterios verificables? | Resolver la diferencia entre automatización prometida y prototipo existente; A4-07/08/09. |
| DIR-04 | P0 | ¿Agent/ReAct y MCP son requisitos obligatorios de OE3? Si lo son, ¿qué tarea y evidencia demostrarían su aporte frente al flujo determinista/RAG directo actual? | Necesidad y tamaño del trabajo de agentes/herramientas; A4-08/13. |
| DIR-05 | P0 | ¿On-Premise UNAB es un requisito evaluable de OE6 o una aspiración? ¿Podría aceptarse una demostración local reproducible con límites explícitos si no existe infraestructura institucional disponible? | Entorno exigible y evidencia operacional; A4-11/21. |
| DIR-06 | P0 | ¿Qué validación mínima con usuarios y qué población se exigirán? ¿Qué alternativa debe acordarse si no es posible reclutar participantes del CCD dentro del plazo? | Viabilidad de OE5/OE6, SUS y estudio de tareas; A4-10/18. |
| DIR-07 | P0 | ¿Las 16 semanas corresponden al horizonte original o al trabajo restante? ¿Qué fecha, capacidad y entregables deben usarse para decidir el alcance mínimo? | Planificación realista y priorización; A4-22. |
| DIR-08 | P0 | ¿Puede delimitarse la contribución a calidad de respuestas, funcionamiento y usabilidad del prototipo, dejando reducción de carga e impacto institucional como hipótesis no demostradas salvo que se acuerde su medición? | Coherencia entre problema, objetivos, evaluación y resultados; A4-02/04/20. |
| DIR-09 | P1 | Una vez decidido el corpus, ¿qué protocolo, métricas, criterios de aceptación y revisión del gold deben usarse para la evaluación RAG? ¿RAGAS es obligatorio o un medio que debe justificarse? | Diseño de evaluación final, distinto de K2 y M9 draft; A4-06/19. |
| DIR-10 | P1 | ¿Qué tareas del dominio deben priorizarse y qué evidencia del CCD se necesita para validar reglas, fuentes y vigencia, sin asumir acceso a información personal? | Delimitación funcional y fuentes autoritativas; A4-02/15/16. |
| DIR-11 | P1 | ¿Es adecuada una descripción de DSR iterativa que reconozca el prototipado previo al levantamiento institucional? ¿Qué prácticas e instrumentos realmente usados deben documentarse? | Metodología y cronología honestas; A4-17. |
| DIR-12 | P2 | ¿Cómo debe registrarse el cambio de nombre en el documento oficial y sus anexos conservando la trazabilidad de versiones? | Consistencia editorial sin alterar la historia; A4-01. |
| DIR-13 | P2 | ¿Qué pendientes conviene presentar como trabajo futuro y con qué nivel de detalle, sin convertirlos en compromisos de esta entrega? | Presentación de límites y continuidad; A4-08/09/11/22. |

Las respuestas del director sobre alcance no sustituyen las autorizaciones del
CCD sobre fuentes, participantes o infraestructura. Las decisiones que dependan
de ambos deben conservar ambas condiciones, sin asumir una respuesta por silencio.

## 18. Propuesta de alcance defendible

**Decisión propuesta, pendiente de aprobación académica.** El núcleo candidato es
un prototipo móvil de consulta con trazabilidad de fuentes, arquitectura actual
explicada y evaluación delimitada. Su carácter defendible depende de resolver P0,
no se deduce de que el código exista. El corpus sintético permite demostrar
comportamiento técnico; su suficiencia como entrega académica está por decidir.

El costo es una **inferencia cualitativa del esfuerzo restante relativo**:
bajo = principalmente documentación/reutilización; medio = preparación y
validación acotadas; alto = implementación o coordinación relevante;
indeterminado = depende de permisos, fuentes o recursos no confirmados.
No son horas, semanas ni estimaciones comprometidas. Incluso un componente ya
implementado requiere trabajo para acreditar su evaluación.

### MVP ACADÉMICO DEFENDIBLE

| Elemento candidato | Necesidad | Dependencia | Evidencia y límite | Costo relativo |
| --- | --- | --- | --- | --- |
| Alcance, tareas y modelo conceptual delimitados | Conectar problema, pregunta, OE y evaluación; distinguir catálogo/oferta y reglas/decisiones personales. | DIR-01/02/08/10 y revisión del dominio por fuentes pertinentes. | E8 ofrece hipótesis y preguntas; no validación del CCD. | Medio; coordinación institucional indeterminada. |
| Corpus versionado con procedencia, vigencia y límites declarados | Hacer reproducible y auditable lo consultado. | Decisión DIR-02. Si se exige corpus real, disponer primero de autorización y una selección acotada; cambiar el corpus funcional requiere una tarea explícita posterior. | E1/E2 acreditan el corpus sintético vigente. E8 no aporta un corpus real autorizado. | Bajo/medio para documentar y evaluar el sintético; indeterminado para incorporar uno real. |
| Flujo Mobile → REST → router → fast paths o Document RAG directo | Entregar consultas delimitadas mediante mecanismos acordes al tipo de información. | Tareas/corpus acordados y cobertura de rutas; resolver DIR-03/04 si se pretende diferir Agent/MCP. | E1/E3/E9 muestran la base implementada; no acreditan integraciones o identidad institucional. | Medio para ajustar y verificar el alcance seleccionado. |
| Ingesta local reproducible mediante backend/rag y N8N manual | Sostener trazabilidad y actualización controlada del corpus de prueba. | Aceptación explícita de este entregable respecto de OE2/OE4; mantener contratos y dataset congelados mientras no exista otra tarea autorizada. | E4 documenta ingesta manual local; no cumple por sí sola scraping/RPA, BPM ni sincronización periódica. | Bajo/medio al reutilizar la base; una fuente nueva elevaría el costo. |
| Evaluación de respuestas y funcionamiento con protocolo previo | Acreditar resultados del prototipo sin equiparar retrieval con calidad generativa. | DIR-02/09; conjunto de evaluación revisado, criterios definidos y reapertura explícita del trabajo pausado. | E5/E6 son antecedentes parciales; E7 son candidatas draft, no evaluación final. | Medio/alto por diseño, revisión y ejecución controlada. |
| Validación de usabilidad y tareas según protocolo aceptado | Sustentar conclusiones sobre uso de la app, sin prometer mejora institucional no medida. | DIR-06; participantes, instrumentos y condiciones acordados, o alternativa académica explícitamente aceptada. | E9 acredita implementación y pruebas manuales reportadas; no resultados SUS ni estudio formal. | Medio más coordinación indeterminada. |
| Demostración local reproducible y documentación de resultados/límites | Permitir revisión del artefacto y de lo que se ha demostrado. | DIR-05/07/08; entorno, carga y criterios aceptados. | E3 ofrece Compose parcial y E6 una corrida local limitada; no despliegue institucional ni SLA. | Medio; no incluye operación institucional. |

La rama sintética y la rama de corpus real delimitado son **alternativas por
resolver**, no dos entregas acumuladas. Si el corpus real resulta obligatorio y
no se obtiene acceso, existe un bloqueo de alcance que debe volver al director;
no se considera cumplido mediante sustitución silenciosa. La factibilidad del
núcleo en 16 semanas es condicional a reutilizar la base y cerrar dependencias
temprano; no se certifica sin conocer el tiempo restante.

### DESEABLE

| Elemento candidato | Necesidad | Dependencia | Evidencia y límite | Costo relativo |
| --- | --- | --- | --- | --- |
| Ampliar cobertura de preguntas/tareas ya acordadas | Mejorar utilidad y detectar límites después de asegurar el núcleo. | Corpus autorizado y evaluación mínima preparada; no ampliar primero M9 pausado. | E7/E8 permiten identificar huecos, no garantizan casos finales válidos. | Medio. |
| Mejorar presentación móvil a partir de hallazgos de usuarios | Corregir dificultades observadas, sin añadir funciones especulativas. | Estudio aceptado y hallazgos concretos. | E9 ofrece una app reutilizable; aún no hay evidencia formal de esas dificultades. | Bajo/medio por correcciones delimitadas. |
| Segunda revisión de fuentes/gold y prueba adicional de reproducibilidad | Reforzar calidad y trazabilidad de conclusiones. | Disponibilidad de revisores y corpus estable. | E5/E7 muestran la necesidad de distinguir desarrollo y evaluación final; no acreditan revisión institucional. | Medio. |

### FUTURO

Esta ubicación es una propuesta de diferimiento: si DIR-03/04/05 confirma un
requisito obligatorio, debe reconsiderarse el núcleo y su costo, no declararse
automáticamente fuera de esta entrega.

| Elemento candidato | Necesidad | Dependencia | Evidencia y límite | Costo relativo |
| --- | --- | --- | --- | --- |
| Agent/ReAct y MCP ejecutable | Justificables para tareas que requieran herramientas y aporten un beneficio evaluable. | Necesidad demostrada, aprobación del diferimiento de OE3 o alcance posterior explícito. | E3: contrato MCP y arquitectura objetivo; no integración actual. | Alto. |
| Scheduling y workflows N8N de retry/recover | Justificables por una cadencia y operación aprobadas. | Fuente, frecuencia, política de recuperación y autorización de implementación. | E4: recorrido manual; los workflows pendientes no están acreditados. | Medio/alto. |
| Conectores e infraestructura institucional | Justificables si la entrega acordada exige fuentes vivas u operación en UNAB. | Interfaces, permisos, responsables y recursos confirmados; aprobación sobre OE2/OE4/OE6. | E8 enumera vacíos; la mención de sistemas no acredita APIs ni disponibilidad. | Alto/indeterminado. |

### FUERA DEL ALCANCE CANDIDATO

No hay eliminación académica ejecutada. Cada candidato requiere justificar su
impacto y, cuando afecta un compromiso histórico, aprobación según la sección 16.

| Elemento candidato | Necesidad | Dependencia para excluir o reconsiderar | Evidencia y límite | Costo relativo de mantenerlo |
| --- | --- | --- | --- | --- |
| Scraping/RPA y Google Sheets como medios obligatorios | Necesidad no demostrada; la selección debe seguir la fuente y el proceso acordados. | Cotejar OE2/OE4 y aprobar medios alternativos, sin borrar la necesidad de actualización. | E2/E4: alcance sintético e ingesta local; no fuente real accesible acreditada. | Alto/indeterminado. |
| Gestión BPM institucional y automatización de trámites | Excede una consulta informativa y requiere procesos levantados y validación propia. | Aclarar OE4 y separar orquestación de ingesta de gestión institucional. | E4 no demuestra BPM ni efectos sobre procesos CCD. | Alto/indeterminado. |
| Historial/progreso real, elegibilidad individual, cupos en vivo y transacciones | No necesarios para demostrar consultas documentales/catalográficas acotadas; necesidad personal pendiente. | Acordar límites funcionales; reconsiderar solo con fuentes, identidad y permisos definidos. | E1/E8/E9: perfiles sintéticos, acceso personal no confirmado. | Alto/indeterminado. |
| Alta disponibilidad, nivel industrial y exactitud institucional garantizada | No son promesas defendibles con evidencia local parcial; reemplazar por criterios acotados y medibles. | Aprobación de resultados esperados revisados, especialmente OE6. | E6 no prueba SLA y E8 no garantiza vigencia/autoridad institucional. | Alto/indeterminado; no estimable desde el prototipo. |
| Reducción de carga u optimización significativa como resultado ya asegurado | Un efecto requiere línea base y diseño de medición; no deriva de construir la app. | DIR-08: retirar la garantía o definir un estudio viable y su alcance. | E8/E9 no acreditan línea base ni efecto institucional. | Alto/indeterminado para medirlo con rigor. |

No se añaden tecnologías. Esta propuesta no autoriza implementación, acceso a
fuentes ni reapertura de M9/tuning; prepara una decisión de alcance. Cualquier
trabajo posterior debe traducir la decisión aprobada a tareas explícitas.

## 19. Orden recomendado de actualización académica

Secuencia futura propuesta; esta auditoría no ejecuta las reescrituras:

1. **Confirmar alcance.** Cotejar el original, resolver P0 y registrar qué cambios
   fueron aceptados, por quién y con qué evidencia. Precisar corpus, entorno y
   tiempo restante antes de comprometer implementación.
2. **Cerrar problema.** Separar observaciones, hipótesis y brechas sin evidencia;
   incorporar solo respaldo verificable y delimitar población/tareas.
3. **Pregunta.** Formular una pregunta investigable coherente con la brecha y el
   alcance, sin imponer tecnologías cuya necesidad no esté justificada.
4. **Objetivo general.** Alinear contribución, artefacto y validación; distinguir
   construcción del sistema y efectos que necesitarían medición adicional.
5. **OE.** Resolver OE1–OE6 individualmente, preservando trazabilidad del original
   al cambio aprobado, entregable, criterio y evidencia prevista.
6. **Metodología.** Describir ciclos reales, instrumentos y evaluación futura;
   reconocer el prototipado anterior al levantamiento institucional.
7. **Arquitectura.** Documentar runtime actual, adaptaciones autorizadas y trabajo
   futuro; mantener N8N fuera del camino síncrono y distinguir contrato de ejecutable.
8. **Resultados.** Expresar resultados esperados medibles y límites; separar
   evidencia ya obtenida, evaluación pendiente e impacto no demostrado.
9. **Cronograma.** Planificar con capacidad y fechas confirmadas, dependencias
   externas, validación y documentación; no comprimir pendientes por omisión.
10. **Referencias.** Consolidar citas y anexos verificables, versión del original,
    procedencia de fuentes y evidencias de decisiones. La captura de referencias
    acompaña todos los pasos anteriores; aquí se cierra su consistencia editorial.

Después debe comprobarse la coherencia de la cadena problema → pregunta →
objetivos → actividades → entregables → validación → resultados → cronograma.
Si una decisión cambia un eslabón, se revisan sus dependencias, sin presumir que
una corrección de redacción resuelve un cambio sustancial de alcance.

## 20. CHECKPOINT BANUCHAT ACADÉMICO

### Decisiones confirmadas

Confirmadas **dentro del alcance técnico/documental vigente**, no como aprobación
académica: nombre BanuChat; corpus funcional sintético; runtime REST/router/fast
paths/RAG directo; N8N para ingesta manual local; distinción entre arquitectura
actual y Agent/MCP objetivo. Se conservan dataset v1, SQL y contratos congelados.
Se mantienen las pausas documentadas de M9 y tuning. A4 produce únicamente esta
matriz; no modifica objetivos, anteproyecto ni implementación. No hay constancia
aportada de aprobación académica de los cambios candidatos.

### Decisiones provisionales

MVP acotado de consulta, evaluación reproducible y validación de uso según
protocolo aceptado; reutilización de arquitectura actual; posible reformulación
de OE2/OE3/OE4/OE6. Corpus admisible y entorno final permanecen abiertos. Las
clasificaciones y costos son juicios de auditoría, sujetos al cotejo del original
y a decisiones académicas e institucionales pertinentes.

### Elementos descartados candidatos

Scraping/RPA y Google Sheets como medios impuestos; BPM institucional amplio;
transacciones y datos personales reales; promesas de nivel industrial, alta
disponibilidad, exactitud garantizada o impacto asegurado. On-Premise y Agent/MCP
son candidatos a diferimiento o reformulación, no eliminaciones confirmadas.
Ningún OE fue borrado y ningún candidato altera por sí solo el compromiso vigente.

### Preguntas pendientes

Prioridad DIR-01–DIR-08: versión y estado del anteproyecto, procedimiento de
actualización, corpus aceptable, exigibilidad de OE2/OE3/OE4 y Agent/MCP,
On-Premise, validación con usuarios, tiempo disponible y alcance de los resultados.
DIR-09–DIR-13 concretan evaluación, tareas, metodología y presentación posterior.
Fuentes autoritativas, acceso y validación CCD siguen pendientes; el contexto
público reportado no resuelve esas dependencias.

### Secciones afectadas

Nombre/portada y referencias internas; problema y justificación; pregunta;
objetivo general y OE; corpus; metodología; arquitectura; evaluación; resultados;
cronograma; referencias y anexos. La matriz A4-01–A4-24 identifica los impactos.
No se ha reescrito ninguna de esas secciones en el anteproyecto.

### Implicaciones sobre objetivos

OE2/OE3/OE4/OE6 concentran el mayor riesgo por medios no implementados,
dependencias externas y diferencia entre promesa y evidencia. OE1 necesita
resolver corpus y evaluación; OE5 necesita validación de uso. Implementación
parcial no acredita cumplimiento. Todo cambio sustancial debe quedar aprobado y
trazado por objetivo, con entregable y criterio de verificación.

### Implicaciones sobre arquitectura

La base actual puede sostener el núcleo propuesto si se acepta su alcance.
Agent/ReAct y MCP siguen como objetivo pendiente, sin integración acreditada;
su incorporación o diferimiento exige resolver la necesidad académica y técnica.
Fuentes reales, datos personales y despliegue institucional introducirían
dependencias aún no confirmadas. Esta auditoría no crea componentes ni cambia
contratos para anticiparlas.

### Implicaciones sobre cronograma

Las 16 semanas son un horizonte reportado, no una estimación del tiempo restante.
La viabilidad requiere decidir alcance, corpus, usuarios y entorno antes de
planificar. Acumular integración institucional, agentes, RPA/BPM, operación y
evaluación completa supone un riesgo alto según las dependencias observadas.
El plan posterior debe reservar trabajo para validación y documentación y prever
el retorno al director si una condición institucional necesaria no se resuelve.
