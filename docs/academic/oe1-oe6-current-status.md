# BanuChat — matriz vigente OE1–OE6

Actualización **20/11/2026**. No modifica los objetivos del anteproyecto ni acredita aceptación del director, CCD o UNAB. [Estado vigente](../estado-vigente.md), [entrega académica](../transition/ENTREGA-FINAL-BANUCHAT.md) y [consolidado](../transition/CHECKPOINT-PUBLICACION-BANUCHAT.md).

| Objetivo | Evidencia actual y frontera respecto del compromiso original |
| --- | --- |
| OE1 | RAG con PostgreSQL/pgvector, citas, fuentes e historial en cloud; correcciones de intención/selección y regresión de 24 turnos. Banco histórico 43 y RAGAS exploratorio con incumplimientos; no nueva evaluación ciega ni suficiencia muestral/aceptación acreditadas |
| OE2 | Pipeline y publicaciones sintéticas aprobadas, procedencia/comparación; copia de solo lectura disponible en AWS. No matrícula ni tres fuentes institucionales reales con frescura/extracción medidas |
| OE3 | MCP ejecutable y agente determinista acotado también comprobados en AWS para consultas estructuradas multifuente. No ReAct LLM productivo, evaluación académica completa ni aceptación acreditadas |
| OE4 | Workflow conversacional n8n publicado en AWS, admisión y persistencia tras reinicio probadas; ingesta/calendario por fixture conservan evidencia local. Sin conectores institucionales, Drive/Sheets ni garantías institucionales |
| OE5 | Cliente web/Android 1.0.4, actualización Huawei y recorridos técnicos. Sin estudio de al menos diez estudiantes ni resultados SUS/tareas que acrediten los criterios originales |
| OE6 | AWS Academy + Supabase, HTTPS/DuckDNS, APK y recuperación documentada. No on-prem UNAB, hosting permanente, SLA o meta general de cinco segundos; RAG remoto 1,30–110,28 s en la última muestra |

El [ensayo del 20/11](../transition/CHECKPOINT-MCP-AWS-2026-11-20.md) agrega evidencia técnica cloud; no declara objetivos aprobados ni elimina las métricas históricas incumplidas. Una generación nueva tardó 100,029 s.

La serie RAG del 18/11 conservó seis respuestas parciales con citas y cuatro abstenciones; 24 HTTP 201 no son 24 respuestas aprobadas. Los [resultados y límites](../transition/CHECKPOINT-RAG-PERTINENCIA-2026-11-18.md) no reemplazan las mediciones académicas anteriores.

Los cortes de octubre siguientes conservan compromisos y decisiones pendientes de sus fechas. Sus títulos internos «vigente» y «próximos trabajos» deben leerse en ese corte, no como un nuevo plan aprobado para el despliegue actual.

<details>
<summary>Matrices y decisiones históricas de octubre de 2026</summary>

Corte **OE1-OE6-CLOSURE-GAP-01, 31/10/2026**, America/Bogota.
Base de la auditoría: `72f4b3e8908fa6e7483ad1fe8a2cdf3628b3e7f3`.
Los compromisos se sintetizan sin cambiar el anteproyecto. Ningún objetivo se
declara completamente cumplido ni aprobado por el director, el CCD o la UNAB.

## Fuentes y precedencia

Se leyó AGENTS.md y se contrastaron las fuentes académicas con los checkpoints
de componentes. El resumen de implementación de AGENTS.md conserva un estado
anterior: no describe por sí solo la integración Agent/MCP/N8N posterior. Sus
restricciones de seguridad y datos siguen vigentes.

Fuente primaria A0: PDF original local, 27 páginas, objetivos pp. 7–8 y resultados
§12.2 pp. 20–21, cotejados por extracción y lectura visual en esta auditoría.
SHA-256: `F1C97304C52415DFA348201C1265DAC47ED208ABA9E30F542498FD0D08B90E7A`.
La [matriz A4.1](anteproyecto-reconciliation-matrix.md#7-objetivos-específicos)
conserva identificación y transcripción. El PDF prueba compromisos escritos;
no acredita aprobación formal, permiso de datos o aceptación de sustituciones.

Una evidencia posterior sustituye un estado técnico anterior solo en el alcance
probado. No altera métricas históricas ni concede aprobaciones. El corte
ENTREGA-01 del 29/10 se conserva al final de este archivo; la
[trazabilidad histórica](oe1-oe6-final-traceability.md) permanece disponible.
Esta auditoría no ejecuta servicios, modelos, pruebas de producto ni evaluaciones.

| Ref. | Evidencia fechada | Resultado y límite |
| --- | --- | --- |
| E1 | 29/10: [informe OE1](../../eval/rag-quality/results/oe1-cierre02-technical-report.md) y [backlog FLOW](../../eval/rag-quality/results/oe1-cierre02-improvement-backlog.md) | Baseline de 43; RAGAS sobre 39 respuestas; resultados históricos, anteriores a las mejoras |
| E2 | 31/10: [QUALITY-03](../../eval/rag-quality/results/CHECKPOINT-OE1-QUALITY-03.md) | Contexto indivisible y citas corregidos; siete regresiones nuevas, de 2 aprobadas/5 fallidas a 7 aprobadas; 214/214 focales; cuatro consultas RAG autenticadas, tres respuestas y una abstención |
| E3 | 31/10: [QUALITY-04](../../eval/rag-quality/results/CHECKPOINT-OE1-QUALITY-04.md) | FLOW-05 investigado sin cambio productivo: ocho controles generados, seis expectativas satisfechas y dos parciales; 52/52 pruebas mecánicas |
| E4 | 29/10: [automatización OE2/OE4](../../eval/oe2/automation/CHECKPOINT-OE2-OE4-AUTOMATION-01.md) | Tres flujos fixture; 36 ejecuciones reales trigger, 15 correctas y 21 errores esperados; 247 pruebas. Scheduler acelerado, no reloj institucional |
| E5 | 30/10: [publicación OE2](../../eval/oe2/pipeline-02/CHECKPOINT-OE2-PIPELINE-02.md) | Doce ejecuciones trigger, dos publicaciones desde scheduler con aprobación separada por hash; rollback/concurrencia; 252 pruebas y ocho comprobaciones SQL |
| E6 | 29/10: [Agent y N8N](../../eval/agent-orchestration/CHECKPOINT-OE3-OE4-INCREMENTO-01.md) | Agente adaptativo determinista productivo; seis herramientas MCP reales comprobadas. Comparación experimental A/B/C con límites descritos en OE3 |
| E7 | 30/10: [PRODUCT-INTEGRATION-03](../../eval/product-integration-03/RESUMEN-FINAL.md) | REST multifuente autenticado, doce comprobaciones; API habitual recuperada al iniciar su proceso; no defecto de código demostrado |
| E8 | 30/10: [PRODUCT-OE2-MOBILE-04](../../eval/product-oe2-mobile-04/CHECKPOINT-PRODUCT-OE2-MOBILE-04.md) | OE2 aislado consultable por REST v2 y Android físico; 16 pruebas API y 16 Mobile; fallo de fuente y recuperación |
| E9 | 30–31/10: [Banu al día](../../eval/banu-al-dia-01/CHECKPOINT-BANU-AL-DIA-01.md) | Radar current/predecesora aprobado, REST v2 5.2.0 y Android; 20 pruebas API y 14 Mobile; pareja real con una modificación y cinco registros sin cambio |
| E10 | 31/10: [notificaciones OE5](../../eval/notifications/results/CHECKPOINT-OE5-NOTIFICATIONS-01.md) | Recepción física local foreground/background, apertura, cancelación y cuentas; dos mecanismos corregidos; 20 pruebas focales con autenticación |
| E11 | 31/10: [demo readiness OE6](../../eval/oe6/CHECKPOINT-OE6-DEMO-READINESS-01.md) | Dieciséis respuestas HTTP esperadas, recorrido Android reducido y preflight READY; 16 pruebas del preflight y typechecks. Computador habitual preparado |
| E12 | 28/10: [decisión canónica OE5 humano](oe5-human-validation-closure-decision.md) | NO EJECUTADO — FUERA DE ALCANCE — PENDIENTE DE DECISIÓN DEL DIRECTOR |

Los conteos pertenecen a sus ejecuciones y pueden solaparse; no se suman para
construir una cobertura o un porcentaje global. La evidencia sensible permanece
en archivos privados excluidos de Git, referenciados por los checkpoints.

## Estados de componentes y objetivos

**IC**: implementado y técnicamente comprobado en el alcance indicado.
**IE**: implementado, pero no evaluado con el criterio original.
**PT**: parcial técnicamente. **BA**: bloqueado por autorización o infraestructura.
**NI**: no implementado. BA puede coexistir con NI; no significa defecto del producto.
Los estados siguientes describen componentes; la aceptación académica del objetivo
se registra por separado en el campo I.

| OE | Componentes | Estado académico defendible |
| --- | --- | --- |
| OE1 | RAG/citas IC; desempeño posterior a correcciones IE; evaluación independiente pendiente | Evaluación técnica histórica cerrada; criterios originales parcialmente alcanzados, aceptación pendiente |
| OE2 | Scheduler, snapshots, publicación y consumo fixture IC; scraping institucional NI/BA | Parcial; no demuestra adquisición/frescura/exactitud institucional originales |
| OE3 | MCP y agente adaptativo determinista IC; política LLM experimental PT | Parcial respecto de ReAct LLM productivo y evaluación multietapa original |
| OE4 | N8N e integración local acotada IC; Sheets y gobierno BPM institucional NI/BA | Parcial; sincronización y totalidad de flujos originales no acreditadas |
| OE5 | Android y recordatorios locales IC; multiplataforma/accesibilidad IE; push remoto NI; validación humana BA | Parcial; criterios humanos originales NO CUMPLIDOS |
| OE6 | Docker, integración y preparación local IC; operación sostenida IE; receptor UNAB NI/BA | Parcial; no acredita instalación ni SLA institucional ni aceptación integral |

## OE1

| Campo | Auditoría actualizada |
| --- | --- |
| A. Compromiso y criterio | RAG PostgreSQL/pgvector sobre documentos CCD oficiales/verificados. Banco de 50–80 preguntas derivadas de documentos indexados mediante generación sintética RAGAS; faithfulness ≥0,80; context precision ≥0,80; context recall ≥0,75; answer relevancy ≥0,80; MRR ≥0,70. A0 no fija k para MRR |
| B. Implementación | RAG local CCD 1.4.0, recuperación y generación con citas/versiones, límites de población/periodo, abstención y filtros. FLOW-01/02/03/04 corregidos; QUALITY-03 evita truncar condiciones y perder detalles pertinentes al formar contexto |
| C. Evidencia más reciente | E2/E3, 31/10: regresión antes/después y RAG real autenticado; investigación FLOW-05 sin parche. E1, 29/10: 43 intentadas, 39 respuestas, cuatro abstenciones, cero errores/timeouts; Hit@5 0,860465; MRR@5 0,813953; Precision@5 0,306977; Recall@5 0,764673. RAGAS sobre 39: faithfulness 0,952991; context precision 0,709402; context recall 0,713675; answer relevancy 0,618210 |
| D. Satisfecho | Motor, recuperación, citas y controles técnicos en el corpus seleccionado. Faithfulness y MRR@5 superan numéricamente las referencias preliminares en ese protocolo histórico; no equivalen a aceptación de todo el objetivo |
| E. Incumplido/no evaluado | Banco menor de 50; tres medias RAGAS inferiores a metas; k de MRR y tratamiento de abstenciones por ratificar; evaluación independiente pendiente. No hay nuevas métricas poscorrección. Juez exploratorio comparte modelo del generador; limitación histórica de AnswerRelevancy 7/12 y calibración pequeña no resuelven independencia |
| F. Trabajo del equipo | Preparar revisión independiente/versionada sin alterar los 43 casos históricos. Investigar solo con hipótesis acotada las dos omisiones de alcance observadas; modificar código únicamente con causa reproducible y regresión |
| G. Dependencias | Ratificación de autoridad/vigencia documental CCD y decisiones académicas sobre banco, k, juez y protocolo. Revisor independiente con competencia y permiso de acceso al subconjunto depurado |
| H. Riesgos/límites | Optimización sobre preguntas conocidas; confundir Precision@5 con context precision; omitir condiciones o inferir relaciones por coocurrencia. En FLOW-05 el modelo ya emitió el marcador de abstención: parser/guardias no causaron esas dos abstenciones históricas; motivo interno no confirmado. Dos controles omiten salvedades, sin aislar mecanismo general. No se justifica forzar una respuesta |
| I. Estado defendible | `OE1_TECHNICAL_EVALUATION_CLOSED_ACADEMIC_ACCEPTANCE_PENDING`, conservando su alcance histórico. Implementado con evidencia; cumplimiento original parcial, sin nueva tasa de calidad ni cierre de todas las limitaciones |

## OE2

| Campo | Auditoría actualizada |
| --- | --- |
| A. Compromiso y criterio | RPA mediante scraping web periódico de oferta, convocatorias y novedades CCD; consolidación relacional/vectorial. Al menos tres flujos de scraping automáticos exitosos sin intervención manual en la prueba; actualización <24 h desde publicación en web CCD y extracción >90 % del universo definido de páginas objetivo |
| B. Implementación | Adquisición/transformación/validación, diferencias, snapshots y scheduler N8N fixture; publicación aislada con aprobación externa ligada al hash, transacción, último current válido y exclusión de escritores. Consumo REST/Mobile y radar de versiones aprobadas |
| C. Evidencia más reciente | E4/E5 prueban scheduler, errores y recuperación. E8/E9/E11, 30–31/10, acreditan consumo real aislado y conservación de seis releases/18 snapshots. E9 muestra una modificación y cinco sin cambio; altas/bajas positivas se probaron con fixtures, no con nuevas publicaciones reales |
| D. Satisfecho | Tres procesos periódicos comprobados sobre fuentes sintéticas autorizadas; repetición, duplicados, vacíos, inválidos, fallos temporales, recuperación consultando estado, rollback y concurrencia. Publicación y consumo del dataset aislado sin contaminar CCD |
| E. Incumplido/no evaluado | No hay scraping de páginas institucionales, denominador autorizado de extracción ni reloj de publicación CCD. Los seis registros/42 campos fixture no demuestran >90 % institucional. Diez segundos de scheduler no prueban <24 h. Aprobación humana de publicación no demuestra extremo a extremo institucional desatendido. Las proyecciones OE2 relacionales y su consulta REST no acreditan consolidación institucional relacional/vectorial; no se indexaron sus fixtures en CCD |
| F. Trabajo del equipo | Conservar fixtures, aprobación por hash y frontera de lectura; recuperación aislada del conjunto actual propuesta en P1. No repetir scheduler acelerado ni desarrollar conectores mientras no exista decisión/fuente autorizada |
| G. Dependencias | CCD/UNAB y director: fuente, mecanismo permitido, universo, credenciales si corresponden, publicación de origen, cadencia, retención y aceptación de una eventual sustitución del scraping |
| H. Riesgos/límites | Corpus CCD documental y publicaciones fixture son fuentes distintas. La oferta programada conserva su semántica, no se convierte en cursos del catálogo. Clones de ensayo quedaron inactivos deliberadamente; no hay operación institucional permanente ni publicación automática de fixtures en CCD |
| I. Estado defendible | Parcial respecto de A0. `BANUCHAT_OE2_OE4_AUTOMATION_VALIDATED`, `BANUCHAT_OE2_PIPELINE_DEMO_E2E_VALIDATED` y validaciones Mobile/radar son estados técnicos limitados a demostración |

## OE3

| Campo | Auditoría actualizada |
| --- | --- |
| A. Compromiso y criterio | Agentic AI con RAG/embeddings y MCP; §12.2 exige LLM con razonamiento/acción ReAct dinámico, selección autónoma multietapa y coherencia conversacional. No se especifica umbral numérico de éxito |
| B. Implementación | Agente adaptativo determinista productivo: selecciona herramienta, valida observación y decide continuar, responder, aclarar o abstenerse. Seis herramientas MCP de lectura; máximo dos llamadas, 30 s y observaciones acotadas; permisos, perfil y release fijados. Política C con LLM existe solo como experimento |
| C. Evidencia más reciente | E6: seis herramientas reales; A/B/C en 18 casos conocidos, orden/resultado esperado 12/18, 18/18 y 13/18; cobertura de fuentes 5/6, 6/6 y 2/6. A/B usan MCP de prueba; C añade Ollama real. E7/E8/E11: REST y Android con N8N/Agent/MCP reales y correlación |
| D. Satisfecho | Integración MCP de lectura, combinación de dos fuentes, seguimiento, historial persistente, citas y releases, protección de perfil, abstención/aclaración y límites ante >2 fuentes en los casos comprobados |
| E. Incumplido/no evaluado | ReAct LLM no gobierna el producto. C comparte selección inicial/guardias de B y evalúa decisión posterior a observación; no prueba autonomía inicial completa ni cumplimiento de A0. No existe porcentaje independiente de éxito conversacional |
| F. Trabajo del equipo | Preservar B y sus límites; mantener evidencia trazable de decisiones observables. No desarrollar ReAct únicamente para ajustar la etiqueta original; cualquier nueva política necesita un problema y protocolo propios |
| G. Dependencias | Director: mantener compromiso LLM/ReAct o aprobar explícitamente adaptación acotada; alcance multietapa, riesgos y criterios de aceptación por definir si se conserva |
| H. Riesgos/límites | Confundir experimento con producto, heurística con razonamiento LLM o pruebas conocidas con evaluación independiente. C tuvo abstenciones prematuras/cobertura incompleta; no atribuir motivos internos al modelo |
| I. Estado defendible | Parcial frente a A0; `BANUCHAT_OE3_OE4_AGENT_ORCHESTRATION_VALIDATED` y REST multifuente acreditan la composición local observada, sin aprobación de sustitución |

## OE4

| Campo | Auditoría actualizada |
| --- | --- |
| A. Compromiso y criterio | N8N/BPM gobierna interacción y directrices; agente integra fuentes estructuradas/no estructuradas. §12.2: calendario Google Sheets y perfiles sintéticos PostgreSQL, E2E N8N→pgvector→Backend→Mobile sin pérdida/corrupción, sincronización ≤30 min y 100 % de flujos §11.4 documentados |
| B. Implementación | N8N local en ingesta/scheduler y admisión conversacional acotada; agente y lógica de negocio en backend. Calendario, progreso y anuncios auxiliares ficticios; RAG CCD y OE2 aislado integrados con procedencia separada |
| C. Evidencia más reciente | E6/E7/E8/E11, 29–31/10: admisión con correlación, operación/release verificados en API, MCP real, chat y móvil. E4/E5: adquisición/publicación fixture; E11 verifica conservación y recorrido integral reducido |
| D. Satisfecho | N8N participa realmente en la rama multifuente y los procesos asíncronos probados; PostgreSQL sintético es compatible con lo escrito en A0. Tránsito y citas conservados en casos E2E concretos, sin atribuir a todas las consultas un paso por N8N |
| E. Incumplido/no evaluado | No hay hoja Google Sheets conectada ni medición ≤30 min desde su origen. Admisión de metadatos no es gobierno completo BPM de procesos institucionales. No existe denominador completo validado que pruebe 100 % de §11.4 |
| F. Trabajo del equipo | Inventariar cobertura solo al cerrar el alcance académico; preservar lógica en servicios, integridad y correlación. Recuperación integrada propuesta en P1, sin añadir workflows ni repetir demostraciones ya acreditadas |
| G. Dependencias | Director/owner funcional/TI: conservar Sheets y BPM original o aprobar sustitución local; fuente, credenciales, reglas, flujos exigibles y reloj de sincronización |
| H. Riesgos/límites | Una coincidencia de release auxiliar no convierte el dato ficticio en documento CCD. No exigir registros académicos reales cuando el propio original permite perfiles sintéticos; tampoco presentarlos como acreditación personal |
| I. Estado defendible | Parcial: orquestación e integración local comprobadas, alcance Sheets/BPM/sincronización/totalidad de flujos pendiente |

## OE5

| Campo | Auditoría actualizada |
| --- | --- |
| A. Compromiso y criterio | App React Native intuitiva/accesible/optimizada y multiplataforma: consultas, calendario, historial de cursos, push y REST. ≥10 estudiantes reales UNAB de distintos programas; cinco tareas, completación >85 %, SUS medio >70 y ningún valor <50 |
| B. Implementación | Expo SDK 57, login/logout, chat multifuente, citas/fuentes, progreso e historial académico sintéticos, historial conversacional, calendario/anuncios, OE2/radar y recordatorios locales por cuenta. Android físico acreditado; código multiplataforma no equivale a ejecución física iOS |
| C. Evidencia más reciente | E8/E9/E10/E11: YAL-L21 Android 10 y development build existente. E10: avisos reales a cinco segundos en primer/segundo plano y apertura de Calendario; duplicados, desactivación/logout y separación de cuentas; 20 pruebas focales. E12 sigue siendo la decisión humana vigente |
| D. Satisfecho | Funciones técnicas concretas Android y REST; recordatorios 24 h antes con reloj controlado, omisión de vencidos, reconciliación/cancelación y recepción física local. Dos defectos corregidos con regresión: errores de cancelación ocultos y deduplicación de apertura por evento en vez de entrega |
| E. Incumplido/no evaluado | Push remoto NI; iOS físico, evaluación completa de accesibilidad y usabilidad con población objetivo no acreditados. Criterios de muestra/completación/SUS NO CUMPLIDOS. Historial de conversación no sustituye historial de cursos; progreso/cursos sintéticos no acreditan trayectoria real |
| F. Trabajo del equipo | Conservar pruebas y preferencias según diseño. No ejecutar reclutamiento, SUS ni alternativa del autor pendiente. No añadir FCM/APNs ni migrar SDK por la sola mención del anteproyecto |
| G. Dependencias | Decisión posterior válida del director sobre alcance humano/alternativa, sin permiso actual de reclutar. Plataforma/dispositivo/firma y credenciales remotas solo si se decide conservar ese alcance y se autoriza por separado |
| H. Riesgos/límites | Preferencia persiste al recargar, pero se elimina al desactivar/logout; no prometer otra conducta. No se probaron físicamente apertura de Anuncios, denegación de permiso, iOS, Doze/reinicio o espera real de 24 h. Fallo OS de cancelación solo inyectado en pruebas. Notificación local no es push |
| I. Estado defendible | Parcial; `BANUCHAT_OE5_LOCAL_NOTIFICATIONS_ANDROID_VALIDATED` solo para alcance técnico probado. E12: **NO EJECUTADO — FUERA DE ALCANCE — PENDIENTE DE DECISIÓN DEL DIRECTOR**; alternativa del autor **PROPUESTA / PENDIENTE DE APROBACIÓN** |

## OE6

| Campo | Auditoría actualizada |
| --- | --- |
| A. Compromiso y criterio | Docker On-Prem en servidores suministrados por UNAB; pruebas integrales, recuperación, agente y usabilidad con usuarios reales. En ventana de prueba: ninguna interrupción no planificada >5 min, media de consultas naturales ≤5 s bajo uso normal/red institucional, 100 % de metas de evaluación y documentación de arquitectura/MCP/N8N/despliegue |
| B. Implementación | Composición local Unified, launcher/preflight, guion integral, matriz de dependencias, servicios y fuentes separados, roles de lectura y evidencia de recuperación de dependencias. Docker local; no receptor universitario |
| C. Evidencia más reciente | E11, 31/10: 16 estados HTTP esperados, RAG/cita/artefacto, dos MCP correlacionados, recursos ficticios, tres categorías OE2/radar, historial/logout y Android reducido. Un turno RAG 10.487 ms y uno multifuente 4.205 ms. Conservación de 4.239 archivos, siete tablas CCD, 107 artefactos/chunks y seis releases/18 snapshots OE2; schedulers de ensayo inactivos |
| D. Satisfecho | Preparación reproducible en el computador habitual y recorrido integrado observado. Documentación operativa/arquitectónica y pruebas locales existentes. La API 3004 detenida se recuperó con entrypoint/configuración normal en E7; no se demostró un fallo de código ni la causa histórica de su terminación |
| E. Incumplido/no evaluado | Sin instalación UNAB, red/TLS/DNS/operador institucional, ventana de disponibilidad, media actual representativa o aceptación integral de evaluaciones. El [restore histórico de 16 tablas sintéticas](../../eval/oe6/results/oe6-backup-restore-2026-10-25.json) no demuestra recuperación coherente del Unified actual con auth, auxiliares, CCD, archivos, N8N y OE2 |
| F. Trabajo del equipo | Priorizar recuperación aislada del conjunto actual (P1) y diagnóstico acotado de latencia (P3). No repetir carga histórica ni una demo completa. No intervenir procesos/volúmenes protegidos ni declarar portabilidad en otro host sin probarla |
| G. Dependencias | TI/UNAB: servidor, recursos, red, custodio/operador y ventana de prueba; director: aceptación local o mantenimiento del despliegue original y metas pendientes OE1–OE5 |
| H. Riesgos/límites | READY es readiness por componente, no SLA. N=1 a 10.487 ms no estima la media ni prueba causa; tampoco permite declarar ≤5 s. Medias/carga de composiciones antiguas no son métricas actuales. No hay nuevo soak, estrés o restore completo; respaldos contienen datos/configuración privados |
| I. Estado defendible | Parcial; `BANUCHAT_OE6_DEMO_READINESS_VALIDATED` significa preparación local y muestra acotada. Despliegue, disponibilidad, latencia media y evaluación humana originales pendientes |

## Conflictos de alcance y alternativas pendientes

Estas alternativas son propuestas para decisión; ninguna se adopta en esta auditoría.
Conservar una exigencia no autoriza por sí mismo a ejecutar su implementación.

| Conflicto | Alternativa que conserva lo escrito | Alternativa académica de alcance acotado | Decisión necesaria |
| --- | --- | --- | --- |
| OE1: RAGAS, independencia y banco | Revisión independiente, banco de 50–80 autorizado/versionado y protocolo aceptado; ejecutar nueva evaluación solo después de su freeze, manteniendo 43 históricos | Aceptar explícitamente 43 y limitaciones de juez/métricas; declarar tres metas no alcanzadas y las mejoras como desarrollo, sin nuevas tasas | Director/revisores y autoridad documental: banco, k, exclusiones, juez y alcance de información verificada |
| OE2: scraping/RPA frente a fixtures | Fuente y scraping permitidos, universo y relojes definidos; nuevo ensayo institucional autorizado con >90 % y <24 h | Limitar aporte a automatización reproducible fixture y publicación aprobada, retirando la pretensión de adquisición institucional solo mediante modificación académica expresa | CCD/UNAB y director; preservar gate de aprobación y prohibición actual de scraping |
| OE3: ReAct LLM frente a determinismo adaptativo | Definir una necesidad multietapa real y protocolo; investigar política LLM con límites antes de permitir producto | Reconocer agente determinista/MCP como solución técnica acotada con comparación experimental, sin llamarlo ReAct LLM | Director; el experimento C no concede aceptación ni justifica desplazar B |
| OE4: Sheets/BPM frente a N8N local | Hoja autorizada, owner, sincronización ≤30 min y catálogo completo de flujos gobernados por reglas aprobadas | Admitir fuentes sintéticas y N8N local de alcance explícito; declarar Sheets/BPM institucional y 100 % pendientes/diferidos | Director, owner calendario y TI; perfiles sintéticos ya están permitidos por A0 |
| OE5: Android/local frente a push, multiplataforma y SUS | Conservar criterios originales como pendientes; cualquier reapertura humana requiere nueva autorización válida. Dispositivos/push solo con alcance y permisos propios | Proponer límite Android/local y evaluación del autor sin inferencia poblacional; alternativa humana sigue pendiente de aprobación | Director; no reclutamiento/SUS ahora, ni aceptación silenciosa de la alternativa del autor |
| OE6: Docker local frente a UNAB/SLA | Receptor institucional y ventana/carga/operador acordados; evaluación actual en esa composición y metas completas | Aceptar formalmente prototipo local con integración/recuperación acotadas; excluir afirmaciones de operación institucional | Director y TI/UNAB; localhost y un smoke no sustituyen instalación o SLA |

## Próximos trabajos priorizados

Lista vigente de **cinco** actividades. “Ejecutable” significa técnicamente viable
para una nueva macrotarea delimitada; esta auditoría no las inicia ni concede
permisos nuevos. S/M/L son esfuerzo relativo, sin fechas ni estimación de esperas
externas. Los antiguos backlogs al final y en documentos históricos no son una
segunda lista activa.

### P1 — OE6-UNIFIED-RECOVERY-01 — ejecutable con aislamiento

| Campo | Propuesta |
| --- | --- |
| OE / problema | OE6, con preservación OE1/OE2/OE4: falta restore del conjunto Unified actual; el ensayo sintético de 16 tablas no cubre esa composición |
| Dependencias | Inventario de stores/roles/configuración ya existentes, espacio local y destino temporal explícitamente aislado; acceso autorizado de lectura y custodia privada |
| Actividad técnica | Definir corte coherente y manifiesto de backup; restaurar copias en destino temporal sin montar volúmenes protegidos. Mantener desactivados workflows restaurados y cualquier efecto externo; nunca ejecutar sus schedulers para validar el restore |
| Entregable | Runbook, manifiesto privado y reporte saneado de restauración/coherencia; procedimiento de eliminación solo del destino creado |
| Aceptación | Huellas fuente intactas; concordancia de current, documentos/artefactos/vectores, auth/propiedad, auxiliares, OE2 y definiciones N8N en la copia. Verificar releases/snapshots esperados por inventario, permisos y referencias; declarar ausencias. Sin tocar el producto ni atribuir RTO/RPO institucional |
| Validación | Restauración y lecturas de consistencia aisladas; no nuevo benchmark, demo completa ni activación de automatismos |
| Riesgo de datos/seguridad | Alto por secretos, sesiones y corpus privado: archivos ignorados, acceso restringido, sin nube ni salida de credenciales |
| Esfuerzo relativo | M–L; no requiere decidir ReAct, scraping, push o servidor UNAB |

### P2 — OE1-SCOPE-PRESERVATION-01 — ejecutable, diagnóstico con límite

| Campo | Propuesta |
| --- | --- |
| OE / problema | OE1: dos controles QUALITY-04 omiten salvedades; observación real sin mecanismo causal confirmado |
| Dependencias | Casos sintéticos y expectativas anteriores preservados; hipótesis nueva y aislable con presupuesto pequeño fijado antes de ejecutar |
| Actividad técnica | Contrastar una hipótesis de pérdida de alcance sin reabrir indefinidamente FLOW-05. Distinguir salida del generador, parser y guardias. Corrección mínima solo si hay causa y regresión antes/después; de lo contrario cerrar sin parche |
| Entregable | Informe causal acotado y, solo si procede, parche general con regresión |
| Aceptación | Sin respuestas memorizadas, cambio de corpus/modelos ni garantías por ID; controles positivos, parciales, contradictorios y de seguridad conservan condiciones y abstenciones legítimas. Si no hay defecto aislado, causa NO CONFIRMADA explícita |
| Validación | Pruebas focales y consultas sintéticas con configuración vigente; no 43 preguntas/RAGAS ni tasa nueva |
| Riesgo de datos/seguridad | Medio: incentivos a afirmar relaciones o autorizaciones no demostradas; usar solo material sintético |
| Esfuerzo relativo | M, con parada obligatoria al agotar el experimento acotado |

### P3 — OE1-OE6-LATENCY-DIAG-01 — ejecutable, medición antes de optimizar

| Campo | Propuesta |
| --- | --- |
| OE / problema | OE1/OE6: turno documental de 10.487 ms, sin distribución actual ni atribución por etapa |
| Dependencias | Entorno local disponible, configuración sin cambios y presupuesto de consultas/estado térmico registrado |
| Actividad técnica | Medir secuencialmente etapas de la composición actual con correlación y metadatos mínimos; distinguir embedding, recuperación, generación y dependencias. No descargar/cambiar modelos ni repetir estrés histórico |
| Entregable | Trazas privadas saneadas e informe de causa o incertidumbre con muestra/condiciones; propuesta de corrección solo si demostrada |
| Aceptación | Cada tiempo tiene definición, n y configuración; no se presenta una muestra como SLA ni se combinan composiciones. No cambio de corpus/prompts/top_k para ganar velocidad sin evidencia y tarea específica |
| Validación | Instrumentación/diagnóstico acotado; pruebas focales solo si se modifica código en esa futura tarea |
| Riesgo de datos/seguridad | Bajo–medio: evitar texto de usuario/documentos y secretos en trazas; no interferir con procesos ajenos |
| Esfuerzo relativo | S–M; medir institucionalmente permanece bloqueado |

### P4 — OE1-INDEPENDENT-REVIEW-PLAN-01 — preparación ejecutable; evaluación bloqueada

| Campo | Propuesta |
| --- | --- |
| OE / problema | OE1: banco inferior al original, juez exploratorio y falta de revisión independiente |
| Dependencias | Preparación sobre evidencia saneada existente; ejecución exige revisor competente autorizado, autoridad documental y decisión académica de protocolo |
| Actividad técnica | Preparar paquete de revisión y protocolo versionado con denominadores, abstenciones, k, métricas, independencia y separación entre desarrollo conocido y muestra reservada. No ampliar/reetiquetar el banco histórico |
| Entregable | Protocolo propuesto y paquete de revisión; acta solo cuando exista respuesta externa real |
| Aceptación | 43 y resultados históricos inmutables; criterios de nueva muestra 50–80 o adaptación explícita sometidos a decisión; no iniciar evaluación antes de freeze y autorización |
| Validación | Revisión metodológica/documental; una evaluación posterior es otra tarea, no prometida como aprobada |
| Riesgo de datos/seguridad | Medio por acceso documental y contaminación del banco; compartir únicamente subconjunto permitido y evitar exposición al desarrollador de una reserva futura |
| Esfuerzo relativo | M de preparación; espera de revisores sin estimar |

### P5 — Decisiones de alcance OE1–OE6 — resolución externa bloqueada

| Campo | Propuesta |
| --- | --- |
| OE / problema | Seis objetivos: diferencias importantes entre compromiso escrito, prototipo probado y autorizaciones disponibles |
| Dependencias | Director; CCD y TI para sus competencias. Contacto/presentación por el autor, sin mensajes enviados desde esta auditoría |
| Actividad técnica | Usar el paquete siguiente y registrar decisiones fechadas, autoridad, condiciones, compromisos conservados/diferidos y efectos. No diseñar implementaciones institucionales sin esa respuesta |
| Entregable | Registro de decisiones efectivamente recibidas y, si se aprueba, delta académico acotado; no nueva versión automática del anteproyecto |
| Aceptación | Cada sustitución tiene decisión explícita atribuible; pendientes permanecen pendientes. No reclutamiento/SUS mientras no exista nueva autorización válida; alternativa del autor no se da por aprobada |
| Validación | Revisión documental de autoridad y coherencia; no validación técnica simulada |
| Riesgo de datos/seguridad | Bajo en paquete saneado; alto si se interpretan decisiones académicas como permisos de datos/infraestructura |
| Esfuerzo relativo | S para registro/presentación; espera externa no estimable |

## Paquete breve para el director

**Existe:** un prototipo local autenticado con RAG CCD seleccionado, citas y
versiones; agente adaptativo determinista y seis herramientas MCP; N8N local;
tres pipelines fixture con publicación aislada aprobada; REST/Android, radar y
recordatorios locales recibidos físicamente. E1–E11 demuestran sus alcances.

**Falta demostrar o alcanzar:** las tres metas RAGAS históricas no alcanzadas,
banco/protocolo independiente original, adquisición/frescura institucional,
ReAct LLM productivo, Sheets/BPM completo, push remoto, multiplataforma y
usabilidad original, servidor/operación/SLA UNAB y recuperación del Unified actual.

**Se propone conservar:** límites de lectura, aislamiento de fuentes, aprobación
de publicación por hash, agente B, modelos/corpus/contratos y evidencias congeladas.
**Se propone someter a decisión, sin modificar todavía:** criterios de evaluación
OE1 y divergencias de cada fila anterior; alcance Android/local y alternativa
del autor permanecen propuestas. **Se propone descartar del backlog técnico
inmediato:** desarrollar ReAct, push, scraping o infraestructura institucional
por mera coincidencia de palabras con el original; esto no elimina compromisos
académicos. Si se conservan, sus permisos y aceptación se resuelven primero.

La decisión canónica OE5 sigue intacta: no estudiantes, reclutamiento ni SUS
autorizados. Ningún recorrido automatizado o realizado por el equipo sustituye
la muestra original. El director, CCD y UNAB no han sido presentados como autores
de decisiones que no constan.

## Arquitectura, cronograma y siguiente macrotarea

Recomendación: **OE6-UNIFIED-RECOVERY-01 (P1)**. Cierra una brecha operativa concreta
sin añadir capacidades ni elegir por anticipado las sustituciones académicas.
Requiere una nueva instrucción delimitada; aquí no se ejecuta backup/restore.

La arquitectura actual se conserva. P1 agrega evidencia de recuperación, P2/P3
solo justifican cambios si aíslan un mecanismo, P4 prepara un protocolo y P5
resuelve autoridad. No se altera REST/MCP, modelos, corpus o frontera OE2.

No se emiten fechas. Las 16 semanas y 23–41 jornadas-persona del
[plan histórico](final-external-decisions-and-schedule.md) no son tiempo restante
actual ni se descuentan aritméticamente por checkpoints aprobados. P1 puede avanzar
sin las decisiones ReAct/push/scraping; P2/P3 requieren ventanas pequeñas sin
interferirse al medir. P4 puede prepararse en paralelo; su ejecución independiente
y las ramas institucionales esperan P5. La ausencia de respuesta externa no se
resuelve ampliando funcionalidades locales.

---

<details>
<summary>Corte histórico ENTREGA-01, 29/10/2026 — conservado, no estado vigente</summary>

# BanuChat — matriz vigente OE1–OE6

Corte ENTREGA-01, 29/10/2026; base `17feea92291aa10118b18a1d145b348a7ac60fcd`.
Los compromisos siguientes son **síntesis fieles**, no una sustitución de objetivos.
El texto original y su cotejo permanecen en la
[matriz A4.1](anteproyecto-reconciliation-matrix.md#7-objetivos-específicos):
A0, objetivos pp. 7–8 y resultados/criterios §12.2, pp. 20–21. Esa fuente prueba
lo escrito, no su aprobación formal ni autorización institucional.

Los resultados referenciados se ejecutaron en sus fechas originales. ENTREGA-01
consolida evidencia y comprueba dependencias; no vuelve a evaluar los seis objetivos.

| Objetivo | Estado defendible del corte |
| --- | --- |
| OE1 | Evaluación técnica ejecutada y cerrada; desempeño desigual y aceptación académica pendiente |
| OE2 | Parcial: adquisición y automatización comprobadas con fixtures, sin fuente institucional real autorizada |
| OE3 | Parcial: MCP y agente determinista implementados; ReAct LLM no acreditado |
| OE4 | Parcial: N8N local e integración acotada; Sheets real y BPM institucional no acreditados |
| OE5 | Parcial respecto del compromiso: Android técnico validado; criterios humanos originales no cumplidos |
| OE6 | Parcial: integración/operación local; sin despliegue en servidores UNAB ni aceptación integral |

Ningún objetivo se marca aprobado por el director o el CCD. Las brechas técnicas
y dependencias académicas se separan para evitar presentar fixtures como producción.

## OE1 — recuperación y respuestas sustentadas

| Campo | Estado verificable |
| --- | --- |
| Compromiso escrito | Motor PostgreSQL/pgvector y RAG sobre documentos CCD, con respuestas exclusivamente oficiales y verificadas. Banco 50–80; faithfulness ≥0,80, context precision ≥0,80, context recall ≥0,75, answer relevancy ≥0,80 y MRR ≥0,70. A0 no fija k para MRR |
| Implementación | Document RAG CCD, embeddings 1024D/coseno, selección por sujeto/aspecto/periodo, límites, abstención, citas y trazabilidad. FLOW-01/02/03/04 implementados después del baseline |
| Evidencia | [Informe de cierre OE1](../../eval/rag-quality/results/oe1-cierre02-technical-report.md), [protocolo CCD14](../../eval/rag-quality/CCD14-EVALUATION-PROTOCOL.md), [integración CCD](../../eval/integration/results/ccd-integration-01-summary.md) |
| Resultado disponible | 43 intentados, 39 respuestas y cuatro abstenciones; cero errores/timeouts. Hit@5=0,860465; MRR@5=0,813953; Precision@5=0,306977; Recall@5=0,764673. RAGAS sobre 39: faithfulness=0,952991, context precision=0,709402, context recall=0,713675, answer relevancy=0,618210 |
| Brecha técnica/metodológica | No se alcanzaron tres medias RAGAS preliminares. Juez exploratorio; limitación técnica histórica de AnswerRelevancy 7/12. Las mejoras posteriores se verificaron como desarrollo conocido; no existe otra tasa ciega de calidad que sustituya el baseline |
| Dependencia académica/institucional | Aceptar o rechazar 43 frente a 50–80, exclusiones y correcciones técnicas; decidir MRR@5 y alcance del juez; revisión independiente y ratificación documental pendientes. Autor único, sin reserva verdaderamente no vista |
| Estado defendible | `OE1_TECHNICAL_EVALUATION_CLOSED_ACADEMIC_ACCEPTANCE_PENDING`; no significa todas las metas alcanzadas ni información institucional ratificada |

MRR@5 y faithfulness superan numéricamente sus referencias preliminares; las otras
tres medias del juez no. Precision@5 no es context precision de RAGAS y no debe
compararse con su umbral 0,80. Las cuatro abstenciones siguen en el denominador
operacional de 43, aunque el juez solo puntúe las 39 respuestas.

## OE2 — extracción y actualización

| Campo | Estado verificable |
| --- | --- |
| Compromiso escrito | RPA basada en scraping periódico de oferta, convocatorias y novedades CCD; tres flujos automáticos exitosos, actualización <24 h desde publicación de origen y extracción documental >90 % |
| Implementación | Tres flujos de adquisición/extracción local, validación, deduplicación, estado y bitácora; pipeline de ingesta/publicación reusable. Exports N8N con Schedule Trigger, inactivos y limitados a IDs fixture |
| Evidencia | [Checkpoint OE2](../transition/oe2-checkpoint-2026-10-24.md), [evaluador y fixtures](../../eval/oe2/README.md), [N3 de ingesta manual](../../eval/ingestion/results/n3-n8n-e2e-2026-10-02.md) |
| Resultado disponible | Corte 24/10: tres ejecuciones locales, 6/6 documentos y 42/42 campos correctos, exclusivamente fixtures; cero ejecuciones autónomas N8N observadas en ese corte. N3 acredita otra ingesta manual local, no scraping institucional |
| Brecha técnica | Sin adquisición institucional real, sin validación contra páginas autorizadas y sin reloj publicación-origen → disponibilidad; una plantilla de scheduling no demuestra ejecución periódica |
| Dependencia académica/institucional | Fuente, autoridad, permiso, contrato y cadencia; decidir conservar RPA/scraping o aprobar otra adquisición. La carpeta externa CCD sigue siendo de lectura |
| Estado defendible | Parcial. El 100 % sobre fixtures no satisface automáticamente el >90 % institucional ni el plazo original |

## OE3 — enfoque agéntico y MCP

| Campo | Estado verificable |
| --- | --- |
| Compromiso escrito | Núcleo agéntico con RAG, pgvector y herramientas MCP; el resultado escrito precisa un LLM con ciclo ReAct y selección de herramientas para tareas de varios pasos |
| Implementación | Seis tools MCP de lectura, transporte stdio, política determinista acotada, límites de pasos/calls, contexto de cuenta y publicaciones fijadas. En Unified consulta documentos CCD y auxiliares ficticios autorizados |
| Evidencia | [OE3](../transition/banuchat-oe3-checkpoint.md), [integración Unified y seguridad](../transition/banuchat-unified-application-checkpoint.md), código `backend/api/src/agent` y `backend/mcp-server/src/unified-main.ts` |
| Resultado disponible | Evidencia OE6 de 6/6 tools reales y diez recorridos N8N/MCP; Unified acredita integración y rechazo de perfil ajeno/escrituras. Son pruebas locales, no validación de decisiones ReAct |
| Brecha técnica | El LLM no gobierna un ciclo iterativo de razonamiento/acción/observación; la selección actual es determinista. No hay una tasa de selección ReAct medida |
| Dependencia académica/institucional | Director debe decidir si conserva ReAct o acepta expresamente la política acotada; definir casos y autoridad de herramientas reales si se mantiene el compromiso |
| Estado defendible | Parcial. MCP operativo y agente determinista no equivalen automáticamente a ReAct |

## OE4 — N8N, BPM y calendario

| Campo | Estado verificable |
| --- | --- |
| Compromiso escrito | N8N/BPM para interacción y directrices institucionales, integrando fuentes; calendario Google Sheets, sincronización máxima 30 min, E2E sin pérdida/corrupción y cobertura del 100 % de flujos definidos |
| Implementación | Webhook correlacionado antes de ciertos planes multifuente, agente/MCP y persistencia; ingesta manual separada; calendario y auxiliares versionados a partir de fixtures |
| Evidencia | [OE4](../transition/banuchat-oe4-checkpoint.md), [Unified](../transition/banuchat-unified-application-checkpoint.md), [OE6](../transition/banuchat-oe6-checkpoint.md) |
| Resultado disponible | Diez recorridos N8N/MCP locales en el corte OE6 y prueba de fallo seguro 503 sin turno persistido; calendario local `unchanged` medido. ENTREGA-01 observó N8N 15679 sin TCP: no afirma que esa rama esté disponible hoy |
| Brecha técnica | Sin Google Sheets real ni su reloj fuente→release; no se acredita BPM institucional completo, sincronización real ≤30 min o cobertura de todos los flujos originales |
| Dependencia académica/institucional | Autoridad sobre reglas, catálogo de procesos, hoja/fuente y credencial; decisión sobre alcance final. La disponibilidad de N8N local debe comprobarse antes de una demo multifuente |
| Estado defendible | Parcial. Workflow local y fixture de filas no acreditan integración institucional con Sheets |

## OE5 — interfaz móvil y usabilidad

| Campo | Estado verificable |
| --- | --- |
| Compromiso escrito | Interfaz React Native intuitiva, accesible y optimizada, con consulta natural, calendario, historial académico y push. Mínimo diez estudiantes reales, cinco tareas, completación >85 %, SUS medio >70 y ningún SUS individual <50 |
| Implementación | Expo SDK 57, login propio, sesión/refresh/logout, chat/citas/visor, historial conversacional, progreso/calendario/novedades ficticios y recordatorios locales |
| Evidencia | [Android CCD 1.4.0](../../eval/mobile/results/android-mvp-ccd14-validation.md), [integración](../../eval/integration/results/ccd-integration-01-summary.md), [cierre humano canónico](oe5-human-validation-closure-decision.md) |
| Resultado disponible | Integración: 41 pruebas Mobile. Android: seis turnos físicos, doce mensajes, 21 capturas privadas, fuentes, carga, historial, restauración y logout en YAL-L21/Android 10. No son resultados SUS ni muestra de estudiantes |
| Brecha técnica | Sin iOS físico, matriz completa de dispositivos, accesibilidad integral ni push remoto acreditados. Historial conversacional y datos auxiliares ficticios no son expediente académico real |
| Dependencia académica/institucional | Criterios humanos originales no cumplidos. No hay reclutamiento ni SUS autorizados. Alternativa de evidencia del autor pendiente de decisión del director; no se presenta esta ejecución del agente como esa aceptación |
| Estado defendible | Parcial respecto del OE original; recorrido Android técnicamente validado para el alcance descrito |

## OE6 — despliegue y desempeño integral

| Campo | Estado verificable |
| --- | --- |
| Compromiso escrito | On-premise con Docker en servidores proporcionados por la universidad y evaluación integral con estudiantes. Media ≤5 s, sin interrupciones no planificadas >5 min y cobertura completa de la evaluación prevista |
| Implementación | Infraestructura local, API autenticada, persistencia, imagen/Compose de transferencia, controles de seguridad, operación y evidencias de integración; Android actual host-native por USB |
| Evidencia | [OE6](../transition/banuchat-oe6-checkpoint.md), [cierre técnico Docker](../transition/banuchat-technical-closure-checkpoint.md), [Unified](../transition/banuchat-unified-application-checkpoint.md), [Android](../../eval/mobile/results/android-mvp-ccd14-validation.md) |
| Resultado disponible | Corte OE6: RAG host-native medio 3.031,4 ms en diez muestras, con p95 5.340 ms; N8N/MCP diez corridas; restore con 16/16 huellas. Cierre posterior acredita carga Docker 1/2/5. No son un SLA del producto actual ni una medición en UNAB |
| Brecha técnica | No hay despliegue universitario, TLS/DNS institucionales, operación sostenida/soak ni cobertura de todas las evaluaciones originales; un portátil local no prueba estabilidad institucional |
| Dependencia académica/institucional | Servidor, recursos, accesos, responsable de operación y decisión sobre sustitución local; aceptación integral ligada a las brechas OE1–OE5 |
| Estado defendible | Parcial. Transferibilidad y pruebas locales útiles, sin acreditar despliegue UNAB |

## Decisión de alcance

Se recomienda presentar el prototipo local y sus evidencias como la entrega técnica
disponible, con brechas explícitas. Acotar compromisos, aceptar instrumentos
alternativos o diferir componentes requiere decisión académica. El
[paquete para el director](entrega-01-director-brief.md) organiza esas decisiones;
no registra ninguna como aprobada ni modifica el anteproyecto.

</details>

</details>
