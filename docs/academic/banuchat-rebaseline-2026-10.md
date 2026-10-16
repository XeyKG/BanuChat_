# Re-baseline académico y técnico de BanuChat

## 1. Propósito

Establecer una línea base documental antes de decidir una eventual integración de
información real del Centro de Competencias Digitales (CCD). BanuChat es actualmente
un prototipo académico local, con corpus funcional 100 % sintético y validación por
etapas. No es un sistema institucional ni un MVP académico integralmente terminado.

Fecha de corte: **2026-10-15**. HEAD inspeccionado y coincidente con el solicitado:
`d82fff84d94ca8121cd5c66bcea3b56efd0127fd`. El árbol de trabajo estaba limpio al
iniciar. Esta revisión es de análisis y documentación: no ejecuta nuevamente las
pruebas históricas ni verifica servicios, modelos o releases activos hoy.

El equipo informa que está iniciando el levantamiento de la estructura informativa
real del CCD. Según el contexto suministrado, existe información pública preliminar
que sugiere rutas de Competencias Digitales, cursos por ruta, ofertas por periodo/NRC,
horarios, ventanas de inscripción, pruebas diagnósticas, homologaciones,
convocatorias, progreso/cumplimiento curricular y documentación académica. Son
**dominios candidatos para investigar**, no entidades confirmadas para el software.
En esta tarea no se consultaron sitios ni APIs institucionales y no se incorporó
información real; esa descripción no constituye una verificación independiente.

Todavía no se dispone de una fuente institucional interna autoritativa completa,
contrato técnico de acceso, APIs confirmadas, acceso autorizado a información
personal, modelo definitivo de datos ni documentación interna completa.
**La existencia pública de un dato no autoriza todavía una integración productiva.**

La arquitectura conceptual híbrida Intent Router → fast path estructurado,
Document RAG o document lookup sigue siendo plausible. Esa plausibilidad no valida
una correspondencia uno a uno entre el modelo sintético y la realidad del CCD.

Esta decisión provisional no modifica [AGENTS.md](../../AGENTS.md), SQL, dataset v1,
REST, contrato MCP ni ADR existentes. Las restricciones actuales siguen vigentes.
Los términos «aprobado» o «aceptado» en documentos técnicos se entienden dentro del
proyecto: **un ADR interno no equivale a aprobación académica ni institucional de
UNAB/CCD**. Reabrir un alcance excluido exige una decisión posterior explícita.

Fuentes principales leídas: [README raíz](../../README.md),
[arquitectura](../arquitectura.md), [índice documental](../README.md),
[ADR 0001](../adr/0001-alcance-sintetico-y-despliegue-local.md),
[ADR 0003](../adr/0003-embedding-local-qwen3.md),
[ADR 0004](../adr/0004-enrutamiento-determinista-intenciones.md),
[evaluaciones](../../eval/README.md), [M9](../../eval/rag-quality/README.md),
[API](../../backend/api/README.md), [RAG/ingesta](../../backend/rag/README.md),
[MCP](../../backend/mcp-server/README.md) y [Mobile](../../mobile/README.md).
Se contrastaron además el JSON de M9, el código directo de consulta y el Compose.
El anteproyecto radicado completo no fue aportado ni leído en esta revisión; las
diferencias históricas siguientes se basan en lo que documenta el repositorio y
deberán cotejarse con esa versión académica antes de reformularla.

## 2. Estado implementado verificable

**Implementado** describe capacidades presentes; **validado parcialmente** describe
el alcance de su evidencia. Una capacidad puede pertenecer a ambas categorías.
Los resultados versionados corresponden a revisiones y entornos anteriores: no son
nuevos resultados del HEAD inspeccionado ni certificaciones del dominio real.

### Implementado

| Componente | Estado observado y frontera |
| --- | --- |
| Mobile | Expo SDK 57, React Native y TypeScript; selección de perfiles sintéticos, chat, citas, visor interno de Markdown, historial, calendario, progreso y anuncios. Consume exclusivamente REST. La sesión de demostración en memoria no autentica personas. |
| REST y router | Conversaciones, mensajes, historial, artefactos y lecturas estructuradas. Intent Router determinista M3.1/M3.2, catálogo `1.2.0-draft`; clasificación sin LLM, embeddings ni N8N. |
| Fast paths | `course_catalog`, `profile_progress`, `calendar_events`, `announcements` y `document_lookup`, con servicios de aplicación y renderers. Social, ayuda y fuera de alcance usan renderers estáticos. |
| Document lookup | Coincidencia exacta de título canónico en la release vigente; encuentra documentos `chunked` y `full_document`, sin embeddings ni generación. El artefacto se abre por REST. No es una búsqueda semántica general. |
| Document RAG | Embedding de pregunta con Ollama y `qwen3-embedding:0.6b`; búsqueda exacta por coseno en PostgreSQL + pgvector, hasta cinco chunks; generación con `qwen3:4b-instruct`, citas y persistencia. No hay ciclo Agent/ReAct ni llamadas MCP en este fallback. |
| Ingesta | Core TypeScript con validación, procesamiento, embeddings, publicación atómica, aprobación/procedencia y recovery/retry explícitos. HTTP interno `execute`/`retry`/`recover`/`status`. N8N orquesta el workflow manual asíncrono y no contiene la lógica de negocio. |
| Entorno local | [Compose](../../infra/docker-compose.yml) declara PostgreSQL/pgvector y N8N. No levanta backend, Mobile u Ollama ni aplica automáticamente la migración SQL. |

El [dispatcher](../../backend/api/src/chat/chat-dispatcher.ts), el
[Document RAG](../../backend/api/src/chat/document-rag.ts) y el
[lookup](../../backend/api/src/application/document-lookup.ts) respaldan la distinción
entre caminos. El nombre interno `agent_fallback` no demuestra que exista un agente:
la documentación vigente identifica su resolución como Document RAG directo.
En el runtime actual, document lookup es uno de los fast paths; separarlo en la
arquitectura conceptual ayuda a distinguir localización de artefactos e interpretación
de contenido, sin proponer otro servicio ni endpoint.

### Validado parcialmente

| Evidencia versionada | Qué respalda | Qué no permite concluir |
| --- | --- | --- |
| [K2](../../eval/retrieval/results/k2-v1-2026-10-01.md), resumido en `eval/README.md` | Retrieval sobre 18 casos sintéticos chunked, top_k=5; MRR@5≈0.8519 y 18/18 hits reportados. | No mide calidad de generación, UX ni desempeño con documentos reales. Precision@5 no equivale a context precision de RAGAS. |
| [M3.2-D](../../eval/intent-routing/results/m3-2-reserved-first-run.md), resumido en arquitectura/eval | 14/14 casos reservados primarios correctos y cero fast paths inesperados reportados; todos eran negativos/fallback. | No acredita recall positivo, accuracy poblacional ni cobertura de lenguaje real del CCD. |
| [J1/J2/J3](../../eval/integration/README.md) | J1: recorrido operacional acotado con PostgreSQL/pgvector y Ollama reales sobre corpus sintético. J2: HTTP con router real, SQL controlado y RAG simulado. | No convierte pruebas simuladas en E2E real ni valida Agent/MCP o toda variante REST. El catálogo M8.1 conserva una prueba operacional pendiente según API. |
| [N3](../../eval/ingestion/results/n3-n8n-e2e-2026-10-02.md), resumido en RAG/arquitectura | Ejecución manual N8N con publicación `ready/current` y posterior `already_current`; 76 items, 12 versiones documentales y 60 embeddings reportados. | No valida fuentes institucionales, scheduling, todos los fallos ni calidad RAG. Recovery/retry con embeddings TEST_ONLY pertenece a otra corrida. |
| [L1-B](../../eval/generation/results/l1-b-rag-latency-2026-10-03.md), resumido en API/eval | Diez solicitudes warm secuenciales; media 4013.57 ms y 8/10 por debajo de 5000 ms reportados. | No acredita formalmente OE6, SLA, concurrencia o estabilidad prolongada. No se combina estadísticamente con G2/L1. |
| Mobile | Su README registra validaciones manuales M1–M5 y M6.1/M6.1.1/M6.1.2 en el contexto descrito; J3 solo cubre las primeras. | M6.2 aún requiere validación física; el índice eval registra M7.4 sin resultados. No hay SUS ni evaluación formal con usuarios acreditada. |

### Pendiente dentro del proyecto

Agent/ReAct, servidor MCP ejecutable e integración de sus seis tools; workflows
N8N retry/recover/scheduled; topología portable y roles/permisos mínimos;
autenticación y autorización de usuario final; push; RAGAS completa, SUS y pruebas
formales con usuarios. Existen contratos MCP congelados `2.0.0-draft`, no una
implementación ejecutable. La existencia de recovery/retry en el core no implica
que N8N los automatice. La sección 6 fija qué pendientes quedan pausados por esta
nueva dependencia; esta revisión no autoriza implementar los restantes.

### Puramente objetivo futuro condicionado

Un asistente conectado a fuentes reales del CCD, con identidad institucional,
progreso individual autoritativo, actualización de ofertas/calendario y operación
institucional es una posibilidad a evaluar después del levantamiento. No es una
capacidad implementada, un compromiso aprobado ni una integración ya habilitada.
El prototipo sintético sigue siendo la única base funcional autorizada.

## 3. Naturaleza del corpus actual

`/data/synthetic` es la fuente de verdad versionada; PostgreSQL contiene su
representación procesada y reconstruible. El dataset v1 permanece congelado.
Según el [README de ingesta](../../backend/rag/README.md), comprende 18 archivos y
76 items: 12 documentos, 12 cursos, 22 eventos, 8 anuncios, 4 perfiles y 18
asociaciones de progreso. Diez documentos `chunked` producen 60 chunks; dos
`full_document` no se fragmentan ni vectorizan. Estos conteos describen el fixture,
no el inventario del CCD.

El corpus permite desarrollar y demostrar contratos, persistencia, trazabilidad,
ingesta, rutas deterministas, recuperación y generación en condiciones controladas.
También permite conservar regresiones y comparar experimentos con procedencia
explícita. Su valor es técnico y metodológico, sin representatividad institucional
acreditada.

No demuestra que existan esas entidades, cardinalidades, relaciones, estados o
reglas en el CCD; tampoco demuestra demanda de usuarios, acceso autorizado,
vigencia de información, utilidad curricular, calidad en documentos reales,
seguridad para datos personales ni cumplimiento integral de objetivos académicos.
Un servicio real de PostgreSQL u Ollama usado en una prueba no convierte en reales
los datos funcionales de esa prueba.

**M9 se clasifica como «benchmark/corpus de desarrollo sintético».** La inspección
de [benchmark-v1.json](../../eval/rag-quality/benchmark-v1.json) confirmó 63 casos,
63 IDs únicos de `M9-P-001` a `M9-P-063`, todos con `review_status=draft`; el estado
global también es `draft`. No es un benchmark final del dominio real del CCD,
ni un conjunto congelado, aprobado o ya evaluado con RAGAS.

El protocolo M9 conserva metas de 60 preguntas principales, pool de 100–120 y
reserva de 20–30. Son planes sintéticos previos, no cantidades institucionalmente
validadas ni autorización para expandir el pool ahora. **P-064+ queda pausado.**
Se preservan los 63 borradores y el diseño de revisión, gold, reserva y procedencia
como material de desarrollo; su contenido no debe convertirse automáticamente en
el gold del futuro dominio real.

## 4. Decisiones que pueden conservarse provisionalmente

Los estados siguientes son el juicio de esta revisión para el alcance indicado:
`KEEP` conserva un principio o activo útil; `KEEP_PROVISIONAL` mantiene una elección
actual sin declararla definitiva; `REVIEW_AFTER_DISCOVERY` exige decidir con evidencia
del levantamiento; `HISTORICAL_ONLY` conserva antecedentes sin prescribir el presente.
Ninguno expresa aprobación institucional ni autoriza cambios productivos.

| Decisión evaluada | Estado | Justificación y límite |
| --- | --- | --- |
| Mobile → REST | KEEP | Mantiene una frontera explícita entre interfaz y backend ya implementada. Es reutilizable aunque cambien fuentes internas; no implica que REST v1 o el canal móvil satisfagan todas las necesidades institucionales. El contrato actual sigue congelado. |
| Intent Router | KEEP_PROVISIONAL | Separar consultas deterministas y documentales es plausible y observable. Las familias, reglas léxicas, scores y cobertura nacen del corpus sintético; requieren contraste con tareas y lenguaje reales antes de ampliarse. |
| Fast paths | KEEP_PROVISIONAL | Consultas estructuradas y renderers permiten respuestas controladas con procedencia. No se presupone que curso, oferta, periodo, NRC, inscripción y progreso sean las mismas entidades ni que todas admitan las consultas actuales. |
| Document RAG | KEEP_PROVISIONAL | Hay un recorrido ejecutable útil para experimentar con respuestas documentales. Su necesidad y receta final dependen de documentos autorizados, formatos, volumen y preguntas reales; las métricas sintéticas no bastan para cerrarlas. |
| PostgreSQL | KEEP_PROVISIONAL | Integra persistencia y consultas del prototipo sin introducir otra tecnología. No determina que la institución permita replicar sus datos aquí ni que el esquema v1 sea el modelo real. |
| pgvector | KEEP_PROVISIONAL | Reutiliza la misma instancia para retrieval local. Se conserva búsqueda exacta, coseno, 1024 dimensiones y una configuración de embedding por release; volumen y calidad futuros decidirán su adecuación, no una optimización anticipada. |
| N8N asíncrono | KEEP_PROVISIONAL | La separación de orquestación y lógica TypeScript tiene evidencia manual local. Conservar esa frontera es útil; frecuencia, disparadores, reintentos y disponibilidad dependerán del contrato de cada fuente. N8N sigue fuera del camino síncrono. |
| Citas/procedencia | KEEP | Vincular respuestas con fuente, versión y evidencia es necesario para verificar y reproducir. Las citas no garantizan exactitud, faithfulness ni autoridad de la fuente; con datos reales habrá que respetar acceso y vigencia. |
| Documentos completos | KEEP_PROVISIONAL | Conservar y abrir artefactos íntegros es distinto de responder con chunks. Los `full_document` actuales siguen sin vectorización; la clasificación de documentos reales y sus formatos deberá revisarse, sin asumir que el visor Markdown cubra todo. |
| Perfiles sintéticos | KEEP | Son fixtures útiles para demostración y regresión, identificados como simulación. Su uso como modelo de identidad o progreso institucional es REVIEW_AFTER_DISCOVERY: seleccionar un perfil no acredita identidad ni permiso. |
| Docker local | KEEP | Mantener el entorno local de desarrollo permite preservar el prototipo. El Compose parcial no representa una topología institucional ni una validación de seguridad, portabilidad o disponibilidad productiva. |
| Document lookup | KEEP_PROVISIONAL | La localización determinista separa entrega de documentos y generación. El matching exacto actual depende de títulos canónicos conocidos; nombres, identificadores y permisos reales requieren levantamiento. |
| Despliegue institucional, scraping y calendario externo del planteamiento histórico | HISTORICAL_ONLY | Sirven para rastrear la evolución académica, pero no describen capacidades actuales ni autorizan conectores. Su eventual reconsideración pasa por las dependencias de las secciones 5 y 8. |

Conservar principios y activos no obliga a conservar cada entidad, endpoint, tool
o parámetro cuando exista un nuevo alcance aprobado. Tampoco permite modificarlos
ahora: una incompatibilidad futura con contratos congelados debe reportarse y
resolverse mediante una autorización específica.

## 5. Decisiones que NO deben cerrarse todavía

Todas las decisiones de esta tabla quedan en **REVIEW_AFTER_DISCOVERY**.

| Decisión | Información que falta antes de cerrarla |
| --- | --- |
| Modelo definitivo de datos | Glosario validado, relaciones, cardinalidades, identificadores, estados, vigencias y responsables. El esquema sintético no es una especificación institucional. |
| Entidades reales CCD | Confirmar si ruta, curso, oferta por periodo/NRC, horario, inscripción, diagnóstico, homologación y convocatoria son entidades distintas, sus reglas y excepciones. No crear tablas a partir de nombres públicos aislados. |
| Autenticación | Confirmar mecanismo disponible, responsables, identidad y autorización por operación. No asumir SSO ni credenciales o APIs existentes. |
| Progreso individual | Fuente autoritativa, definición de cumplimiento curricular, excepciones, permisos y correcciones. Las asociaciones de perfiles sintéticos no prueban acceso a expedientes. |
| Historial | Necesidad del historial conversacional y, por separado, eventual historial académico; titularidad, acceso, retención y eliminación. Persistir conversaciones de demostración no resuelve esos requisitos. |
| Fuente de calendario | Responsable, cobertura, zona horaria, vigencia, cancelaciones, cambios y frecuencia de publicación. El calendario actual procede del dataset, no de una sincronización institucional. |
| Fuente de ofertas/NRC | Disponibilidad de datos oficiales por periodo, identidad de la oferta, relación con curso y ruta, estados y actualización. El catálogo general sintético no demuestra oferta concreta ni posibilidad de inscripción. |
| Scraping | Necesidad real, autorización y condiciones de uso, estabilidad y alternativa autoritativa. No se presupone que sea necesario o permitido; actualmente está prohibido. |
| APIs | Existencia confirmada, documentación, contrato de acceso, ambientes, autenticación, límites y responsables. No diseñar contra endpoints hipotéticos. |
| Permisos | Quién puede autorizar consulta, copia, almacenamiento y exposición de cada clase de información; separación entre datos públicos, internos y personales. |
| Actualización automática | Fuente de cambios, tiempos de vigencia, frecuencia, fallos, reconciliación y responsabilidad operacional. No prometer refresco, scheduler o recuperación automática sin ese contrato. |
| Corpus documental real | Inventario autorizado, autoridad, versiones, formatos, calidad, conflictos y acceso. El contenido público preliminar no sustituye documentación interna completa. |
| Estructura final de RAG | Qué preguntas requieren generación, retrieval, lookup o datos estructurados; extracción, chunking, metadatos, embeddings, filtros y evaluación según documentos y tareas autorizados. |
| Despliegue institucional | Aceptación de responsables, entorno disponible, redes, operación, monitoreo, recursos y seguridad. Docker local no demuestra ninguna de esas condiciones. |

## 6. Trabajo temporalmente congelado

**Congelado por dependencia** significa que falta información para justificar el
siguiente paso. No significa **descartado** ni elimina código, contratos o evidencia.
Se conserva la prohibición vigente de integrar datos reales; el levantamiento no
la revoca por sí mismo. El ADR 0001 excluyó integración y scraping del alcance local:
esta revisión registra una posibilidad futura condicionada, sin activarla.

| Trabajo | Estado y dependencia para reconsiderarlo |
| --- | --- |
| Expansión M9 más allá de P-063 | Congelado por dependencia del dominio y tareas prioritarias; no generar P-064+ ni completar automáticamente el pool previsto. |
| RAGAS final | Congelado por dependencia del alcance evaluable, corpus, gold revisado, reserva y protocolo aprobados. No ejecutar ni presentar M9 como validación final del CCD. |
| Tuning del RAG | Congelado por dependencia de un baseline y evaluación pertinentes; no optimizar para elevar resultados sobre los borradores sintéticos conocidos. |
| Cambio de embeddings | Congelado por dependencia de evidencia comparativa pertinente y autorización técnica. Se conserva `qwen3-embedding:0.6b`, 1024 dimensiones y coseno. |
| Cambios de chunking | Congelado por dependencia de formatos y estructura documental reales. Se preserva la receta sintética H2 sin overlap y la exclusión de `full_document`. |
| HNSW y otros índices aproximados | Congelado por dependencia de volumen, latencia y calidad medidos; no hay justificación para sustituir la búsqueda exacta ahora. |
| SQL adaptado al CCD | Congelado por dependencia del modelo validado y autorización expresa para revisar SQL/contratos. No añadir entidades hipotéticas ni modificar el esquema v1. |
| Scraping real | No autorizado en el alcance vigente; su reconsideración depende de fuente, necesidad y permiso explícitos. La información pública no levanta este bloqueo. |
| Integración institucional | No autorizada en el alcance vigente; depende de fuentes, contratos, responsables, permisos y nuevo alcance aprobado. No conectar APIs, datos personales o infraestructura real. |
| Agent/MCP dependiente del dominio desconocido | Congelado por dependencia de casos de uso, modelo informativo y justificación de herramientas. Sigue pendiente, no descartado; sus contratos congelados no son evidencia de correspondencia con el CCD. |

La pausa no impide inventariar preguntas, reconciliar documentación, conservar
artefactos sintéticos y preparar el levantamiento dentro de las restricciones
vigentes. Ninguna de esas actividades autoriza ampliar funcionalidades, recolectar
datos reales o ejecutar evaluaciones fuera del alcance de esta tarea.

## 7. Riesgos

| Riesgo | Consecuencia de continuar implementando ahora | Tratamiento propuesto |
| --- | --- | --- |
| Sobreajuste al corpus sintético | Reglas, prompts y métricas mejoran sobre ejemplos diseñados por el equipo sin demostrar utilidad real. | Conservar resultados como desarrollo; definir después tareas, gold y reserva pertinentes e independientes del tuning. |
| Construir entidades inexistentes o mal relacionadas | Confundir curso, ruta y oferta puede propagar errores a SQL, REST, MCP, UI y evaluación. | Validar glosario y relaciones antes de adaptar contratos o persistencia. |
| Asumir APIs inexistentes | Diseñar conectores que no puedan implementarse o cuya operación no sea sostenible. | Confirmar existencia y contrato con el responsable antes de integrar. |
| Confundir información pública con autoridad interna | Responder con datos incompletos, desactualizados o sin prioridad clara ante conflictos. | Registrar dueño, vigencia, alcance y jerarquía de fuentes. |
| Asumir acceso a datos personales | Exponer progreso o historial sin identidad y permisos definidos. | Mantener perfiles ficticios; no incorporar datos personales mientras falte autorización y diseño de acceso. |
| Discrepancia repositorio–anteproyecto radicado | Presentar avances técnicos como cumplimiento de objetivos académicos distintos o no aprobados. | Cotejar la versión radicada con el director y documentar acuerdos antes de reescribir objetivos. |
| Exceso de alcance dentro de 16 semanas | Sumar descubrimiento, conectores, seguridad, Agent/MCP y evaluación puede impedir cerrar un resultado defendible. | Reestimar con dependencias y priorizar un alcance mínimo verificable; no asumir cuántas semanas quedan ni prometer fechas sin cronograma confirmado. |
| Confundir evidencia parcial con aceptación final | Declarar OE1/OE6 o preparación productiva usando smokes, latencias locales o fixtures. | Mantener revisión, entorno, muestra y límites de cada resultado; no agregar corridas incompatibles. |
| Congelar prematuramente herramientas y topología | Invertir en Agent/MCP, automatización o infraestructura sin una necesidad demostrada. | Preservar activos y decidir su uso después de conocer operaciones, fuentes y restricciones. |

## 8. Criterio para reanudar implementación

Reanudar exige evidencia revisable y una autorización explícita del cambio concreto;
no basta terminar una conversación de levantamiento ni descubrir una página pública.
Debe quedar un registro de alcance y tareas prioritarias, glosario, fuentes y sus
responsables, restricciones de acceso/uso, decisiones abiertas, criterios de
aceptación y ajuste del cronograma. La validación del dominio por responsables del
CCD, la reconciliación académica con el director y la autorización técnica del
proyecto son decisiones distintas; no se atribuyen aquí a personas no confirmadas.

| Antes de… | Condiciones mínimas de reanudación |
| --- | --- |
| Modificar DB | Modelo conceptual/lógico revisado, ejemplos autorizados suficientes para validar relaciones y estados, procedencia/vigencia y permisos definidos, análisis de impacto sobre REST/MCP/ingesta y autorización específica para cambiar SQL congelado. Preparar después una migración revisable, sin forzar contratos a encajar con supuestos. |
| Sustituir dataset | Fuente autoritativa identificada y autorización de uso, copia y almacenamiento; inventario, calidad, versiones y tratamiento de datos definidos. Acordar un nuevo corpus y su separación respecto del fixture sintético. Preservar v1 y sus evidencias; no sobrescribirlo ni introducir información real en `/data/synthetic`. |
| Reanudar RAG | Preguntas y corpus autorizados definidos, necesidad de generación frente a fast path/lookup justificada, formatos y criterios de calidad conocidos y protocolo de baseline/tuning acordado. Si se retoma solo una evaluación sintética, autorizar ese alcance expresamente y conservar su etiqueta de desarrollo. |
| Implementar integración real | Acceso confirmado con contrato técnico, fuente y ambiente concretos, permisos, identidad cuando corresponda, reglas de actualización/error y responsables de operación. Registrar la modificación del alcance actualmente prohibido antes de conectar; no asumir scraping como alternativa automática a una API ausente. |
| Crear benchmark final | Dominio y tareas objetivo delimitados, corpus permitido y versionado, preguntas representativas revisadas por conocedores del dominio, gold con procedencia y separación de desarrollo/reserva. Fijar muestra, métricas, criterios, configuración del juez y control de contaminación antes de ejecución; no trasladar automáticamente los targets o cantidades de M9. |

Si no se obtiene acceso institucional dentro del plazo disponible, la alternativa
a someter a decisión académica es cerrar un prototipo sintético con limitaciones
explícitas. No se presume aprobada esa alternativa ni se sustituye la falta de
acceso por datos inventados presentados como reales.

## 9. Impacto académico

El re-baseline no reescribe el anteproyecto completo ni modifica sus objetivos por
decisión unilateral. Prepara la reconciliación con la versión efectivamente radicada
y con el director. Las alusiones históricas se extraen de los documentos internos
leídos, no de una comparación textual directa con el anteproyecto original.

| Parte | Reconciliación necesaria |
| --- | --- |
| Problema | Distinguir la necesidad institucional por comprobar del problema técnico ya explorado con datos sintéticos. El prototipo no prueba frecuencia, impacto o causas de dificultades reales. |
| Pregunta | Revisar población, contexto, fuentes y tipo de resultado que puede responderse con la evidencia disponible; evitar afirmar impacto institucional desde una demostración local. |
| Objetivos | Contrastar OE1–OE6 con lo implementado. OE3 Agent/MCP sigue pendiente; OE2 y OE4 tienen interpretaciones técnicas provisionales de ingesta sintética. Los ADR no modifican por sí solos los objetivos radicados. |
| Corpus | Declarar origen sintético, v1 congelado y límites de representatividad. Una futura fuente real requiere nueva procedencia y permisos, sin reetiquetar datos ficticios como institucionales. |
| Arquitectura | Explicar la diferencia entre la propuesta histórica, el runtime Mobile → REST → router → fast paths/Document RAG y el objetivo Agent/MCP. Registrar N8N asíncrono, lookup y despliegue local parcial. |
| Metodología | Separar construcción del prototipo, levantamiento real, validación funcional y evaluación de calidad/usabilidad. Tratar M9 actual como desarrollo sintético; formalizar revisión de gold y reserva antes de evaluar. |
| Resultados | Reportar solo evidencia ejecutada con su revisión, entorno y límites. K2, N3, J1/J2 y L1-B no equivalen a RAGAS completa, SUS, integración real o cumplimiento integral de OE1–OE6. |
| Cronograma | Reestimar el horizonte de 16 semanas con descubrimiento, permisos, reconciliación y evaluación como dependencias. No añadir integración real y Agent/MCP como trabajo garantizado sin priorización y capacidad confirmadas. |

Diferencias y tensiones documentales detectadas:

- El ADR 0001 conserva como contexto histórico el despliegue en servidores UNAB,
  scraping y fuentes institucionales; la arquitectura vigente los declara excluidos.
  El nuevo levantamiento abre preguntas, no revierte esa exclusión. Las referencias
  a calendario externo/Google Sheets o sincronización independiente de 30 minutos
  no describen el calendario actual, publicado dentro de releases sintéticas.
- El cuerpo histórico del ADR 0001 habla de SQL/MCP pendientes de revisión y de
  un recorrido con agente. Su actualización y AGENTS.md fijan contratos congelados
  y runtime sin Agent/MCP. No usar el texto histórico como autorización de cambios.
- El ADR 0003 conserva generación abierta e ingesta futura; su actualización y
  los README registran generador e ingesta implementados. Su actualización también
  aclara que SQL no fija el nombre del modelo con CHECK, frente a una formulación
  más amplia del cuerpo original. No se reinterpreta esa historia como estado actual.
- El ADR 0004 describe etapas con tres fast paths y fallback Agent/RAG objetivo.
  API y arquitectura documentan cinco fast paths actuales, incluidos M8.1/M8.2,
  y Document RAG directo. Se conserva la cronología sin contar el agente como hecho.
- El índice `eval/README.md` resume M9 como protocolo en preparación «sin preguntas
  reales», sin reflejar las 63 candidatas draft que registran su README específico
  y su JSON. Esa frase es ambigua: si alude al dominio real, no contradice las
  candidatas sintéticas; si alude a casos ya escritos, quedó desactualizada.
  Para el conteo prevalecen el artefacto inspeccionado y su README específico.
  No se modifica el índice en esta tarea.
- Los términos «aprobado» en el índice documental y «aceptado» en ADR no aportan
  evidencia de aprobación académica/institucional. La propia arquitectura deja
  pendiente la alineación definitiva de OE1–OE6 con el director.

Estas diferencias son de alcance o cronología documental. La inspección acotada
del dispatcher, lookup y RAG concuerda con los README actuales; no constituye una
auditoría exhaustiva de compatibilidad código–contratos. No se identificó en esa
inspección un conflicto que requiera modificar contratos para este documento.

## 10. Decisiones y preguntas abiertas

| ID | Decisión/pregunta | Estado | Evidencia actual | Dependencia | Próxima acción |
| --- | --- | --- | --- | --- | --- |
| RB-01 | Mantener Mobile → REST y trazabilidad | KEEP | API, Mobile y código de consulta; citas con procedencia | Revisar necesidades futuras sin romper contratos vigentes | Conservar la frontera y exigir evidencia verificable en futuros cambios. |
| RB-02 | ¿Qué dominios y tareas reales priorizar? | REVIEW_AFTER_DISCOVERY | Contexto preliminar aportado; sin inventario interno completo | Responsables y glosario validados | Documentar tareas, vocabulario, reglas y exclusiones del alcance. |
| RB-03 | ¿El esquema sintético corresponde al CCD? | REVIEW_AFTER_DISCOVERY | Modelo de demostración; no hay equivalencia acreditada | Relaciones, estados y fuentes autoritativas | Preparar mapeo explícito de coincidencias y diferencias antes de proponer SQL. |
| RB-04 | ¿Qué fuentes de calendario/oferta/NRC existen? | REVIEW_AFTER_DISCOVERY | Calendario y cursos actuales sintéticos | Dueño, contrato y vigencia por fuente | Confirmar fuentes y acceso sin consultar servicios reales desde esta tarea. |
| RB-05 | ¿Cómo se autentica y autoriza a una persona? | REVIEW_AFTER_DISCOVERY | Selección de perfil no autentica; no hay acceso personal autorizado | Mecanismo disponible y permisos | Obtener definición de identidad y autorización antes de diseñar integración. |
| RB-06 | ¿Qué significan progreso e historial? | REVIEW_AFTER_DISCOVERY | Progreso ficticio e historial conversacional implementado | Reglas curriculares, finalidad y acceso | Separar historial de chat de historial académico y acordar retención. |
| RB-07 | Mantener router, fast paths y lookup | KEEP_PROVISIONAL | Cinco rutas respaldadas por datos y renderers estáticos | Lenguaje, tareas y entidades reales | Revisar cobertura después del levantamiento; no expandir reglas ahora. |
| RB-08 | Mantener Document RAG, PostgreSQL y pgvector | KEEP_PROVISIONAL | Recorrido local implementado y evidencia parcial | Corpus, volumen, calidad y restricciones futuras | Preservar baseline y decidir adecuación con evidencia pertinente. |
| RB-09 | Conservar citas y artefactos completos | KEEP / KEEP_PROVISIONAL | Citas verificables; full_document sin chunks/embeddings | Autoridad, permisos y formatos futuros | Mantener procedencia; revisar modos documentales cuando exista inventario. |
| RB-10 | Mantener N8N fuera de consultas síncronas | KEEP_PROVISIONAL | N3 manual; lógica en TypeScript | Contrato de actualización de fuentes | Conservar la separación; no activar scheduled/retry/recover automáticamente. |
| RB-11 | Preservar fixture y entorno local | KEEP | `/data/synthetic`, perfiles ficticios y Compose parcial | Ninguna integración real autorizada | Conservar v1 y evidencias sin representar la demo como producción. |
| RB-12 | M9 actual es desarrollo sintético | DECIDIDO EN ESTA REVISIÓN | 63 IDs únicos draft comprobados en JSON | Dominio y protocolo final por definir | Preservar P-001–P-063; no reutilizarlos automáticamente como benchmark real. |
| RB-13 | Pausar P-064+, RAGAS final y tuning | CONGELADO POR DEPENDENCIA | Benchmark sin congelar; no hay resultados M9 | Alcance, corpus, gold y reserva revisados | Aplicar los criterios de la sección 8 antes de reanudar. |
| RB-14 | Pausar embeddings, chunking e índices aproximados | CONGELADO POR DEPENDENCIA | Receta local existente; búsqueda exacta | Calidad, formatos y rendimiento pertinentes | No optimizar ni cambiar receta con supuestos del dominio. |
| RB-15 | ¿Se necesitan Agent/ReAct y MCP? | CONGELADO POR DEPENDENCIA, NO DESCARTADO | Contratos presentes; ejecutable e integración pendientes | Casos de uso y herramientas justificadas | Revisar necesidad y compatibilidad sin modificar contratos congelados. |
| RB-16 | ¿Se autorizarán datos reales, APIs o scraping? | NO AUTORIZADO; REVIEW_AFTER_DISCOVERY | Sin contrato técnico, API confirmada ni permisos completos | Fuente, uso y acceso aprobados; cambio explícito de alcance | Obtener decisiones registradas antes de cualquier conexión o incorporación. |
| RB-17 | ¿Habrá despliegue institucional? | REVIEW_AFTER_DISCOVERY | Solo entorno local; propuesta histórica excluida | Infraestructura, responsables y aceptación | Evaluar viabilidad después del levantamiento; no comprometer despliegue. |
| RB-18 | Reconciliar anteproyecto y cronograma | PENDIENTE ACADÉMICO | ADR/arquitectura registran cambios y alineación pendiente | Versión radicada, director y plazo confirmado | Cotejar problema, pregunta, objetivos, metodología y resultados; priorizar alcance viable en 16 semanas. |
| RB-19 | Tratar las divergencias documentales como historia trazable | HISTORICAL_ONLY para formulaciones superadas | ADR 0001/0003/0004 e índice eval frente a README actuales | Revisión documental posterior autorizada | Conservar evidencia; proponer reconciliación sin reescribir archivos fuera de esta tarea. |
