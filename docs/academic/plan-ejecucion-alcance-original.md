# BanuChat — BCH-04: plan de ejecución del alcance original completo

> Nota de precedencia OE5-H0, 27 de octubre de 2026: este plan conserva los
> compromisos originales y su fotografía histórica, no el estado técnico actual.
> El [protocolo SUS actual propuesto](../../eval/mobile/oe5-student-validation-protocol.md)
> prepara cinco tareas sobre CCD autenticado y auxiliares ficticios y está
> `READY_FOR_ACADEMIC_REVIEW`. No cierra AC6 (iOS/push), AC7 sin sesiones reales,
> AC10 (entrevistas/caracterización) ni OE1/OE6. SUS no sustituye automáticamente
> entrevistas de 10–15 estudiantes; reutilizar participantes requiere decisión
> académica antes del reclutamiento, sin añadir preguntas silenciosamente.

Fecha: **22 de octubre de 2026, America/Bogota**. Propuesta técnica y académica para revisión de Sala de Control. Base inspeccionada: `57237df57f0db0c7918f1d7b8edaca25a3abfbd2`; árbol limpio al comenzar. Las estimaciones de este documento no son fechas, recursos ni autorizaciones confirmados.

## 1. Decisión vigente y conclusión de viabilidad

**La decisión del equipo es conservar los seis objetivos específicos y todos los compromisos verificables del anteproyecto original.** Se descarta como alcance final la reducción a consulta documental local. La decisión no equivale a aprobación formal del director ni concede acceso institucional, permisos de publicación, infraestructura o presupuesto.

La base existente permite reutilizar RAG, persistencia, controles de procedencia, servicios REST, ingesta y Mobile. Ningún OE puede declararse completamente acreditado con la evidencia revisada. El trabajo restante se estima en **125–202 jornadas-persona (JP), equivalentes a 750–1212 horas productivas**, sin esperas externas y antes de una reserva de contingencia. El cronograma de referencia requiere **18 semanas relativas**, con una reserva propuesta de 3–4 semanas. Depende de disponibilidad simultánea de los roles de §6 y de permisos obtenidos a tiempo. No demuestra cabida en las semanas que realmente resten: ese dato no está confirmado.

Si solo quedaran 16 semanas, el cronograma de referencia excedería la ventana en dos semanas, aun antes de la reserva. Harían falta reprogramación y/o recursos y una compresión demostrable de dependencias, manteniendo los seis OE. Si quedan menos semanas, aumenta el déficit. No se concluye una imposibilidad universal a partir de una estimación; tampoco se promete cumplir mediante paralelismo ilimitado.

Esta tarea produce **solo este plan**. No autoriza implementación, pruebas nuevas, ingestas, scraping, activación de workflows, cambios de parámetros, despliegue ni reclutamiento. El primer incremento propuesto en §9 requiere autorización posterior.

## 2. Fuentes, método y evidencia disponible

### 2.1 Fuentes primarias y precedencia

| ID | Fuente inspeccionada | Uso y límite |
| --- | --- | --- |
| A0 | [PDF original](C:/Users/samue/Downloads/PGI_63765_AutomatizaciónCCD_RouteAI.pdf), 27 páginas; SHA-256 `f1c97304c52415dfa348201c1265dac47ed208aba9e30f542498fd0d08b90e7a` | Fuente de los compromisos escritos. Cotejo directo de pp. 7–8 y 17–25; inspección visual de tabla 3 e hitos, pp. 22–23. Páginas PDF contando portada. No prueba aprobación académica, permisos ni realidad institucional. |
| A1 | [Matriz de reconciliación](anteproyecto-reconciliation-matrix.md), especialmente §7 y §12–13 | Conserva trazabilidad de OE, resultados y tensiones internas de A0. Sus estados técnicos históricos se actualizan aquí con BCH-02/03 y código, sin editar la matriz. |
| A2 | [Decisión de alcance y validación](decision-alcance-y-validacion.md) | **Antecedente histórico de alternativas A/B. Su recomendación de alcance reducido no es la decisión vigente.** Este plan desarrolla la conservación del alcance original; no reabre la selección A/B. |
| A3 | [Plan de evaluación del prototipo](plan-evaluacion-academica-prototipo.md) | Reutilizar M1–M10, rúbricas, separación de bancos y tratamiento de T11. Su alcance y seis semanas relativas de evaluación no representan el plan completo ni reemplazan las métricas originales. |
| E01 | [Cierre BCH-01](C:/Users/samue/OneDrive/Documentos/CCD_DOCUMENTACION/00_Auditoria_BCH01/BCH01_Cierre_Documental_Paquete_Admision_M01_M12.xlsx), hojas `00_Control`, `01_Admision_M01_M12`, `02_Respuestas_6`, `07_Bloqueos`, `08_CHECKPOINT` | Lectura directa, sin modificación. SHA-256 `38f952586cae0f87db194a7dbd668acb6e86631564f48025e5b105cb428da214`. Admisión propuesta de 12 M/55 C, contradicciones, condiciones y 0/55 aprobaciones para producción; no es un corpus completo ni un aval CCD. Las admisiones locales posteriores proceden de BCH-03. |
| E02 | BCH-02: [incremento 1](../transition/bch02-increment-1-checkpoint.md), [2](../transition/bch02-increment-2-checkpoint.md), [3](../transition/bch02-increment-3-checkpoint.md), [preflight Android](../transition/bch02-increment-4-checkpoint.md), [reanudación Android](../transition/bch02-android-resumption-checkpoint.md) | Contexto, citas y UI; separa HTTP, Web, fetch simulado y dispositivo físico. |
| E03 | BCH-03: [incremento 1](../transition/bch03-increment-1-checkpoint.md), [2](../transition/bch03-increment-2-checkpoint.md), [3](../transition/bch03-increment-3-checkpoint.md), [4](../transition/bch03-increment-4-checkpoint.md), [5](../transition/bch03-increment-5-checkpoint.md) | Preparación, base CCD aislada, chat HTTP y ampliaciones documentales. Las obligaciones pendientes de un incremento se interpretan con los siguientes. |
| E04 | BCH-03: [cierre de 5](../transition/bch03-increment-5-closure-checkpoint.md), [5.1](../transition/bch03-increment-5-1-checkpoint.md), [5.2](../transition/bch03-increment-5-2-checkpoint.md), [5.3](../transition/bch03-increment-5-3-checkpoint.md) | Contraejemplo semántico T07, corrección, fallos operacionales, aclaración de ambigüedad y última corrida integral. T11 sigue no satisfactorio. |
| E05 | [K2 retrieval](../../eval/retrieval/results/k2-v1-2026-10-01.md), [M9 calidad RAG](../../eval/rag-quality/README.md), [L1-B latencia](../../eval/generation/results/l1-b-rag-latency-2026-10-03.md), [N3 N8N](../../eval/ingestion/results/n3-n8n-e2e-2026-10-02.md) | Evidencia sintética/local y protocolo draft; no aceptación integral CCD ni universitaria. |

Se inspeccionaron componentes directamente relacionados: [runtime API](../../backend/api/src/main.ts), [dispatcher](../../backend/api/src/chat/chat-dispatcher.ts), [mensajes](../../backend/api/src/application/messages.ts), [Document RAG](../../backend/api/src/chat/document-rag.ts), contexto/evidencia/citas de ese directorio, servicios de progreso/calendario, [guardas CCD](../../backend/api/src/ccd-runtime.ts), [ingesta CCD](../../backend/rag/src/ccd/ingest.ts), [servicio interno de ingesta](../../backend/rag/src/internal-http/service.ts), [MCP](../../backend/mcp-server/README.md), [contrato MCP](../../backend/mcp-server/tools-contract.md), [workflow manual](../../n8n/workflows/ingestion-manual-v1.json), [Compose](../../infra/docker-compose.yml), [Compose CCD](../../infra/docker-compose.ccd.yml), Mobile y pruebas asociadas. Referencias de estado: [arquitectura](../arquitectura.md), [RAG](../../backend/rag/README.md), [Mobile](../../mobile/README.md), [corpus CCD](../../data/ccd/README.md) e [integración](../../eval/integration/README.md).

Método: lectura estática de código, documentación y resultados registrados; sin ejecutar el sistema ni volver a correr pruebas. No se consultaron sitios/APIs institucionales ni se verificaron versiones de herramientas en Internet. Compatibilidad de SDK/protocolo y conectores deberá verificarse al autorizar su implementación. Los juicios de arquitectura, esfuerzo y plazo siguientes son propuestas del equipo técnico, no hechos avalados por CCD o dirección.

### 2.2 Qué pruebas existen y qué demuestran

| Evidencia histórica | Resultado registrado | Límite para este plan |
| --- | --- | --- |
| K2 sintético | 18 casos vectoriales: MRR@5 0,8519; Recall@5 1; Precision@5 0,2222, que era su máximo teórico por el gold; dos `full_document` fuera de vectorial | No mide generación ni cumple automáticamente context precision de RAGAS. MRR@5 no equivale por defecto al MRR sin k de A0. |
| M9 | 63 candidatas `draft`, banco no congelado, sin ejecución RAGAS | Preguntas de corpus sintético; no reutilizarlas como benchmark institucional de 50–80 preguntas. |
| N3 | Ejecución manual N8N → HTTP privado de ingesta → PostgreSQL/Ollama; publicación y segunda ejecución `already_current` | Workflow `active=false`; sin scheduled, scraping, conversación, Sheets ni validación Linux/UNAB. |
| L1-B | Diez solicitudes locales warm secuenciales; media 4013,57 ms, ocho por debajo de 5000 ms | No acredita red universitaria, agente/N8N, concurrencia, disponibilidad o carga normal institucional. |
| BCH-02/1 y /2 | Respectivamente 490 y 500 tests API registrados; E2E HTTP de 48 y 55 controles | Contexto/citas en versiones y bancos concretos; no sumar como pruebas independientes ni como calidad general. |
| BCH-02 Android | TECNO CL7s, Android 14/API 34, Expo Go 57.0.9; recorrido nativo y corrección de historial al recuperar foco; seis pruebas de cliente con fetch simulado | Un operador/dispositivo. Sin iOS, push, estudio SUS o prueba nativa posterior de U03/U04. |
| BCH-03/1–5 | Preparación y guardas CCD, publicación M01/M12 y ampliaciones; /5 registra 215 tests RAG y 509 API en aquella versión | 12 unidades locales admitidas finalmente, con procedencia y vigencia no ratificada; la validación técnica no avala normas. |
| BCH-03 cierre de 5 / 5.1 / 5.2 | 252/252 controles con T07 semánticamente incorrecto; después 244/249 con tres 503 y dos consecuencias de historial; diagnóstico con timeout y rechazo de contexto en reproducciones distintas | Conservar todos los ensayos. La causa exacta de REG/2 histórico no quedó demostrada; no atribuirla automáticamente a carga externa. |
| BCH-03/5.3 | 519 tests API, cinco del evaluador, focal HTTP 119/119 e integral 329/329; 43/43 turnos persistidos y 41 citas | Integración técnica de esa corrida. T11 = C; no demuestra calidad universal, estabilidad sostenida ni aval institucional. |

Las cifras son retrospectivas; **ninguna se volvió a ejecutar en BCH-04**. Tests presentes en disco describen cobertura posible, no un resultado nuevo.

## 3. Matriz completa de brechas OE1–OE6

Los compromisos de esta sección se resumen fielmente desde A0 §5 y §12; los criterios numéricos se conservan en §7. «Implementado» identifica mecanismos existentes. «Parcial» identifica el compromiso que esos mecanismos aún no satisfacen.

### OE1 — RAG y fuentes oficiales verificadas

| Dimensión | Auditoría y brecha |
| --- | --- |
| Compromiso original | Motor semántico PostgreSQL/pgvector y RAG que indexe documentos CCD y fundamente exclusivamente en información oficial/verificada; guías completas por referencia, sin vectorización. Evaluación A0 p. 20. |
| Implementado | Embeddings Ollama `qwen3-embedding:0.6b`, 1024 dimensiones, coseno/búsqueda exacta; Document RAG directo y generación local; citas/versiones/artefactos y persistencia atómica; selección de evidencia, contexto y aclaraciones. Preparación y releases CCD separadas de la demo. |
| Parcial | Doce unidades CCD: M01/M12, siete M02, TEST_ORIENTATION, U03/U04. Derivados con hashes/localizadores y límites históricos. No cubren todo el corpus prometido ni son vigencia/aval institucional. Recuperar todos los candidatos del subconjunto CCD y seleccionarlos temáticamente no demuestra escalabilidad a un corpus mayor. |
| No implementado o no acreditado | Proceso institucional de ratificación/actualización de fuentes; corpus autorizado suficiente de propuesta, lineamientos, resoluciones y referencias completas; benchmark CCD y RAGAS ejecutado. Garantía absoluta de fundamentación no demostrada. |
| Pruebas existentes | Tests API de retrieval/RAG/evidencia/citas/contexto/artefactos y RAG de preparación/almacenamiento CCD; K2 sintético, BCH-02/03 HTTP y Android acotado. |
| Pruebas pendientes | 50–80 preguntas generadas desde documentos institucionales autorizados, revisadas y congeladas; gold de relevancia y respaldo; RAGAS y MRR/precision@k/recall@k; reservado; reglas ausentes/contradictorias, inyección documental, utilidad T11 y crecimiento del corpus. |
| Dependencias técnicas e institucionales | D01, R01/R02, Q01; responsable documental CCD, permiso de uso/publicación, versión/periodo/población y ratificación de reglas. Modelo/juez de evaluación y recursos locales por validar. |
| Riesgos | Confundir procedencia con autoridad; sobreajuste al banco conocido; citas correctas pero impertinentes; carencia de normas; contexto/timeout; juez automático sesgado. |
| Entregables faltantes | Inventario autorizado y estados de admisión, banco CCD/gold/reserva, resultados RAGAS/recuperación y revisión humana, corrección general de T11 y análisis de fallos. |

### OE2 — RPA, scraping periódico y actualización autónoma

| Dimensión | Auditoría y brecha |
| --- | --- |
| Compromiso original | Extraer periódicamente oferta académica, convocatorias y novedades CCD mediante RPA/scraping y consolidar datos relacionales/vectoriales. Al menos tres flujos autónomos, actualización <24 h y extracción >90 %. |
| Implementado | Core de ingesta: validación, hashes, relaciones, staging, embeddings, lease, publicación atómica y retry/recover explícitos; HTTP privado y workflow manual N8N para fuente sintética aprobada. Ingesta CCD manual con recetas y guardas propias. |
| Parcial | Trazabilidad de snapshots/releases es reutilizable. El servicio HTTP de ingesta existente compone fuente Git/aprobaciones sintéticas; no basta cambiarle una ruta para automatizar CCD. Recolección, adquisición de permiso y admisión semántica no están resueltas. |
| No implementado | Scrapers, inventario de páginas objetivo, periodicidad y disparadores automáticos CCD; detección de cambios/bajas, actualización autónoma, auditoría publicación→App y workflows scheduled/retry/recover. |
| Pruebas existentes | Tests de preflight, almacenamiento, fallos/recovery/retry y procedencia; E2E de ingesta históricos y N3 manual. |
| Pruebas pendientes | Fixtures HTML/PDF/Excel autorizados; exactitud por página/documento; tres ejecuciones automáticas de flujos distintos; altas/cambios/bajas, duplicados y fallos de formato; latencia desde publicación original; integridad de release previa y automatización sin intervención. |
| Dependencias técnicas e institucionales | P02/D01, U01–U03; autorización expresa posterior de scraping, sitios y páginas delimitados, fechas de publicación observables, frecuencia/carga permitida y responsable de fuente. Hoy está prohibido acceder a sitios/APIs reales UNAB/CCD. |
| Riesgos | Páginas inexistentes o sin permiso, cambios de markup, fechas no verificables, extracción de datos personales, actualización de reglas no ratificadas, publicación incompleta. |
| Entregables faltantes | Registro de fuentes/páginas y permisos, tres pipelines RPA, adaptadores de extracción, bitácora de cambios/frescura, política de admisión y reportes de extracción/automatismo. |

### OE3 — Núcleo agéntico ReAct y MCP

| Dimensión | Auditoría y brecha |
| --- | --- |
| Compromiso original | LLM con ciclo dinámico ReAct y servidor MCP; evaluación autónoma de intención y selección de herramientas para tareas de múltiples pasos, con coherencia conversacional y documentación de interfaces. |
| Implementado | Router determinista, servicios de aplicación, recuperación/vectorización, controles de evidencia y contexto. Contrato MCP `2.0.0-draft` congelado con seis herramientas de lectura. |
| Parcial | Servicios REST reutilizables como lógica de handlers; contrato no constituye servidor. El valor interno `agent_fallback` del dispatcher termina hoy en Document RAG directo: su nombre no prueba agente. |
| No implementado | Servidor/handlers/transporte MCP, cliente MCP, ciclo ReAct, selección generativa, presupuesto de pasos/tiempo, terminación y manejo de fallos/múltiples resultados; perfil MCP CCD. |
| Pruebas existentes | Router, servicios, RAG y contexto; evidencia de seguimientos y correcciones. No hay evidencia de ejecución MCP o selección agéntica. |
| Pruebas pendientes | Negociación/listado/calls MCP, validación de schemas y errores; selección de herramienta observada, tareas relacional→documental→calendario, aclaración, no-tool, parada, tool inválida, inyección, fallo parcial y cambio de release entre pasos. |
| Dependencias técnicas e institucionales | M01/M02, A01/A02 y calendario B02 para recorrido completo; revisión autorizada del contrato: hoy solo admite fuente sintética y procedencia sintética. Confirmar protocolo/transporte/SDK al implementar; no inventar un conector UNAB. |
| Riesgos | ReAct sin uso útil, loops, SQL/argumentos inventados, mezcla de releases, latencia acumulada, credenciales expuestas y herramientas habilitadas fuera de alcance. |
| Entregables faltantes | Servidor/cliente ejecutables, agente acotado, contratos y documentación reconciliados, banco multietapa con trazas de decisión/acción/resultado y revisión de coherencia. |

### OE4 — BPM/N8N, conversación y calendario

| Dimensión | Auditoría y brecha |
| --- | --- |
| Compromiso original | N8N orquesta lógica de interacción/flujos conversacionales bajo BPM, integra agente y fuentes estructuradas/no estructuradas; Google Sheets para calendario y PostgreSQL para perfiles sintéticos; sincronización ≤30 min, integridad E2E y cobertura 100 % de flujos de A0 §11.4. |
| Implementado | N8N manual de ingesta asíncrona; API/router/servicios/RAG y persistencia; calendario/progreso/anuncios sintéticos por REST. |
| Parcial | Calendario sintético llega dentro de una release completa; no sincroniza Sheets. N8N está fuera del chat. Perfiles sintéticos son coherentes con A0 y pueden conservarse como demostración explícita; no equivalen a credenciales o expediente real. |
| No implementado | Modelo BPM conversacional ratificado, workflow de conversación/agente, sincronización Sheets, disparo de notificaciones y prueba de directrices institucionales. |
| Pruebas existentes | N3 manual; tests de servicios/calendario y persistencia; integración sintética/local y BCH-02/03. |
| Pruebas pendientes | Conversación que efectivamente pase por N8N; reglas ratificadas frente a bloqueadas; correlación entre nodos, sin pérdida/corrupción; Sheets→release→API→App en ≤30 min; cambios/cancelaciones y cobertura de cada flujo §11.4. |
| Dependencias técnicas e institucionales | B01–B03; P02/D01, A02 y autorización de ruta conversacional nueva. Hoja institucional real, propietario, permisos/credenciales y semántica de eventos aún sin confirmar. |
| Riesgos | Duplicar lógica en nodos, ciclos API↔N8N, reenvío de mensajes tras timeout, respuesta fuera de release, reglas históricas tratadas como vigentes y pérdida de latencia. |
| Entregables faltantes | Modelo BPM, catálogo de reglas con autoridad y estado, workflow conversacional, sincronizador de calendario, matriz de flujos/casos y reporte E2E. |

### OE5 — Mobile, historial académico, calendario, push y UX

| Dimensión | Auditoría y brecha |
| --- | --- |
| Compromiso original | React Native accesible y optimizado, consulta natural, calendario interactivo, historial de cursos completados y push; integración REST, Android/iOS, SUS y cinco tareas con estudiantes. |
| Implementado | Expo 57/React Native/TypeScript, navegación, chat, citas/visor, estados de error e historial conversacional. En modo sintético: calendario, anuncios y progreso con filtros `completed`, fechas y cursos; existe base de historial de cursos, además del historial de chats. |
| Parcial | Android físico validado para recorrido CCD acotado. Modo CCD oculta/protege calendario, progreso y anuncios; backend rechaza esas capacidades y exige cero perfiles sintéticos. El historial de cursos sintético no acredita expediente CCD. La lista volátil de chats CCD no es autorización. |
| No implementado o no acreditado | Push remoto, integración completa de módulos para la solución final, UX/SUS estudiantil, accesibilidad integral y recorrido iOS. Identidad/aislamiento de usuarios para servicio compartido. |
| Pruebas existentes | Seis pruebas de cliente simulado y recorridos manuales diferenciados; Android de BCH-02; HTTP de BCH-03 no revalida nativamente U03/U04. |
| Pruebas pendientes | Historial académico con perfil sintético declarado y fechas/estados verificables; calendario sincronizado; permisos, recepción/apertura y rechazo de push; lector de pantalla, escalado, teclado, contraste, Android/iOS; cinco tareas y SUS con ≥10 estudiantes de distintos programas. |
| Dependencias técnicas e institucionales | C01–C03, X01, E01/Q04; dispositivos/builds y credenciales push. Para expediente real, una fuente personal, identidad y permiso específicos, hoy no confirmados ni necesarios para demostrar perfiles sintéticos de A0. |
| Riesgos | Confundir progreso con reconocimiento oficial; publicación de conversaciones ajenas; asumir que Expo Go acredita push/build final o iOS; falta de dispositivos y participantes. |
| Entregables faltantes | Matriz funcional por modo/plataforma, módulos integrados, canal push, evidencias nativas, revisión de accesibilidad, protocolo/datos anonimizados SUS y resultados por tarea. |

### OE6 — Docker, infraestructura universitaria y evaluación integral

| Dimensión | Auditoría y brecha |
| --- | --- |
| Compromiso original | Sistema completo Docker en servidores universitarios, integración, recuperación/precisión y usabilidad con estudiantes reales; media ≤5 s, sin interrupciones no planificadas >5 min, informes del 100 % de objetivos evaluativos y transferencia técnica. |
| Implementado | Compose local PostgreSQL/N8N y PostgreSQL CCD aislado; API/RAG/Mobile ejecutados localmente, scripts/evidencias de integración y latencia. |
| Parcial | Contenedores declarados no cubren todo el backend/agente/MCP/Ollama ni prueban operación universitaria. L1-B y la última corrida CCD son observaciones de entornos concretos. |
| No implementado o no acreditado | Empaquetado integral, despliegue universitario, seguridad de red/usuarios, operación/observabilidad sostenida, restauración, protocolo de carga normal, estudio estudiantil y evaluación integral original. |
| Pruebas existentes | J3/integración local, N3, K2, L1-B y BCH-02/03; tests automatizados de componentes. |
| Pruebas pendientes | Instalación reproducible en servidor autorizado, conectividad móvil institucional, salud/estabilidad de contenedores, reinicio/restauración, latencia bajo carga definida, fallos parciales, aislamiento y estudio SUS; matriz de todos los compromisos. |
| Dependencias técnicas e institucionales | X01–X03, Q01–Q05, todos los módulos; asignación de servidor CPU/RAM/GPU/almacenamiento, red/DNS/TLS, accesos, operador TI, ventana y población del piloto. |
| Riesgos | Sin servidor/acceso no hay aceptación OE6; agente/N8N pueden superar 5 s; recurso local compartido insuficiente; retrasos de permisos y reclutamiento; extrapolar estabilidad absoluta desde una ventana corta. |
| Entregables faltantes | Imágenes/configuración segura, arquitectura lógica/física, manual de despliegue/operación/replicación, evidencias universitarias, informes técnicos/UX consolidados y caso de estudio. |

## 4. Arquitectura objetivo y cambios mínimos justificados

### 4.1 Existente frente a requerida

| Frente | Existente | Cambio necesario y justificación |
| --- | --- | --- |
| Conversación | Mobile → REST → router → fast path o RAG directo | Conservar entrada REST, router, servicios y renderers. Añadir BPM/N8N al recorrido conversacional final y Agent/ReAct en fallback multietapa. OE3/OE4 exigen ejecución observable, no solo presencia nominal. |
| Herramientas | Servicios REST; contrato MCP sintético | Implementar MCP como adaptador de los servicios, sin duplicar SQL/reglas. Agente como cliente; Mobile continúa por REST. |
| Datos | Demo sintética congelada y CCD local aislado | Conservar separación. Diseñar nueva persistencia autorizada para fuentes CCD cambiantes, calendario y auditoría; no ampliar silenciosamente las recetas de 12 unidades ni reutilizar perfiles demo como identidad. |
| Ingesta | Manual, snapshots/releases y publicación atómica | Añadir adquisición RPA, normalización y scheduling sobre el core; delta de publicación/control de cambios para CCD. Evitar un segundo motor de embeddings o un escritor SQL en N8N. |
| Calendario | Release sintética completa | Añadir lectura de Sheets autorizada y materialización versionada; sincronización ≤30 min y acceso por servicios existentes/MCP. Resolver la publicación de calendario sin perder coherencia con el resto del corpus. |
| Mobile/operación | Expo 57, local/USB; sin push ni servicio compartido seguro | Reutilizar pantallas y clientes; añadir push y completar módulos/plataformas. Preparar seguridad y contenedores para servidor universitario antes de exponer el backend actual. |

Propuesta lógica del recorrido final, con nombres de componentes y **sin definir endpoints institucionales**:

```text
Mobile --REST--> Backend API (identidad/alcance, contexto, concurrencia)
                    |
                    v
              BPM conversacional N8N (transición y correlación)
                    |
                    v
       Coordinación interna de consulta en backend + Intent Router
                    |                         |
              fast path                 Agent/ReAct acotado
                    |                         |
                    |                   cliente MCP -> MCP interno
                    |                         |
                    +---- Application Services/RAG ----+
                                         |
                                PostgreSQL + pgvector
                                Ollama local para RAG/agente
                    |
       respuesta candidata -> validación/persistencia en API -> Mobile

Fuentes CCD autorizadas -> RPA/extracción -> candidatos depurados
                          ^                        |
              N8N periódico/BPM                    v
                        backend/rag -> staging -> release atómica
Google Sheets autorizado -> sincronizador -> calendario versionado
Evento publicado -> N8N -> servicio de notificación -> canal push -> Mobile
```

El dibujo representa un objetivo propuesto, no el runtime de hoy. N8N coordina estados/ramas del proceso de consulta y devuelve una respuesta candidata; el backend conserva dominio, selección determinista, reglas de evidencia y persistencia. El fast path sigue sin usar LLM/MCP. El workflow no vuelve a invocar el endpoint público de chat: necesita una frontera interna autenticada de coordinación, a especificar en B01/B03 para evitar recursión. No se mantiene una transacción SQL abierta durante N8N/LLM. La API valida release/ordinal y persiste una única pareja de mensajes al final, como base reutilizable. Un fallo de N8N se informa y registra; no se oculta mediante un bypass conversacional automático no evaluado.

**Esta incorporación de N8N sí modifica la decisión arquitectónica vigente de mantenerlo fuera del camino síncrono.** Se propone porque OE4 lo exige. B01 debe producir un ADR y reconciliar `docs/arquitectura.md`, ADR relacionados y contratos internos antes de implementar B03. El MCP también requiere revisión explícita: su catálogo actual solo admite demo sintética, procedencia sintética, seis tools de lectura y calendario local. No se conectará CCD/Sheets fingiendo cumplir ese contrato. M01 puede implementar fielmente el perfil sintético; M02 debe especificar y obtener autorización del delta CCD antes de conectarlo. No se ha identificado incompatibilidad entre implementación actual y su contrato vigente; se identifican límites para la extensión futura.

### 4.2 Decisiones que evitan duplicación y requisitos para implementarlas

1. **Reutilizar Document RAG y servicios.** Extraer solo la frontera necesaria para consumo MCP/agente. Mantener comprobación de citas, `full_document` sin chunks/embeddings, pertenencia a release y advertencias. No sustituir consultas estructuradas sencillas por razonamiento generativo.
2. **Agente limitado a lectura y tareas concretas.** ReAct decide acción/herramienta, observa y termina con presupuesto explícito de pasos/tiempo/contexto, a fijar en A01. Registrar selección, argumentos saneados, resultado y motivo breve verificable; no exigir almacenar razonamiento privado del modelo. Fallo parcial o falta de regla producen aclaración/límite útil. Ningún agente matricula, paga o adjudica equivalencias.
3. **MCP sin conocimiento duplicado.** Handlers delegan a application services y recuperación existentes. Comprobar pertenencia a una misma publicación entre pasos; si cambia, fallo controlado o política explícita autorizada, sin mezclar evidencia. El mecanismo concreto se resuelve con el contrato, sin habilitar retry automático ahora.
4. **RPA con frontera de admisión.** Empezar con fixtures y páginas explícitamente autorizadas. HTTP y parsing HTML como primera opción descrita en A0; verificar compatibilidad al implementar. PDF/Excel necesitan adaptadores probados. Una página pública no basta como prueba de autoridad. Reglas contradictorias y cambios de población pasan a cuarentena; hechos de categorías preaprobadas pueden publicarse automáticamente bajo política autorizada, conservando prueba del cambio. La aceptación de autonomía exige ensayos sin intervención sobre esas categorías; revisión manual de cada ejecución no cumpliría OE2.
5. **N8N orquesta; TypeScript aplica dominio.** Triggers, correlación, ramas y notificaciones en N8N; parsers, validación, reglas académicas ratificadas, publicación y acceso a datos en backend. Retry/recover/scheduled son tareas futuras explícitas con límites y reconciliación de estado, nunca reenvío ciego del POST de chat. El core existente no acredita ya esos workflows.
6. **Calendario con procedencia y consistencia.** Sheets es el compromiso original conservado. B02 debe acordar propietario, campos, zona, ID de evento, cancelaciones, revisión y reloj de cambio; no se inventan ahora. Si no existe una hoja institucional autorizada, un fixture solo sirve para desarrollo. Decidir mediante delta de persistencia si se publica snapshot completo con datos intactos o revisión coherente de calendario; medir el costo y preservar históricos antes de escoger. No prometer ≤30 min si la adquisición no permite comprobar el origen temporal.
7. **Historial académico explícitamente sintético hasta autorización específica.** Aprovechar `progress.tsx` y `profile-progress.ts`; validar cursos completados/fechas y límites funcionales con dirección. El resultado OE4 prevé perfiles sintéticos. No cargar perfiles ficticios dentro de `banuchat_ccd_dev`, cuyas guardas lo prohíben, ni consultarlos como fallback CCD. Si la solución final debe combinar contenido CCD con perfil de demostración, C01/X01 deben diseñar contextos y procedencia separados, con autorización de contratos/migraciones. Expediente real y autenticación institucional requieren una decisión y fuente adicionales, no una interfaz inventada.
8. **Seguridad antes de servicio compartido.** La lista de chats en memoria del cliente no protege backend. X01 especifica aislamiento y autorización de conversaciones/notificaciones para el piloto, credenciales de servicio, red/TLS y custodia. Puede usarse una sesión de prueba del estudio con perfil sintético y autorización de acceso propia, sin afirmar SSO universitario. Una futura identidad institucional solo se conecta si TI confirma mecanismo y permiso.
9. **Conservar tecnología y parámetros hasta evidencia autorizada.** Expo 57, TypeScript estricto, SQL explícito, PostgreSQL/pgvector y Ollama; una configuración de embedding por release, 1024/coseno/búsqueda exacta. No proponer ORM, migración móvil, nueva base vectorial o framework agéntico por defecto. Q03 medirá antes de proponer tuning/modelo/hardware. Cambios de SQL, REST y MCP requieren tarea explícita; los archivos congelados permanecen intactos en BCH-04.

## 5. Lista priorizada de tareas implementables

### 5.1 Convenciones de estimación

Una **JP = 6 horas productivas** de una persona con experiencia en TypeScript/SQL y los componentes asignados. Los rangos incluyen diseño acotado, implementación/documentación y pruebas de aceptación de la tarea; excluyen espera de permisos, incorporación de personal, rediseño por interfaces desconocidas y repetición del estudio completo. No se incluyen tecnologías nuevas por defecto ni contratación. Rangos de esfuerzo por juicio técnico, sin calibración histórica suficiente para comprometer fechas.

La columna «duración» es una ventana orientativa en semanas laborables relativas con una persona líder a 5 JP/semana y apoyo disponible; Q04 incluye sesiones/coordinación y depende de agendas. Los rangos no implican que todas las tareas puedan ejecutarse simultáneamente. P0 abre decisiones y dependencias; P1 construye la integración; P2 prepara/realiza evaluación y cierre. La prioridad no elimina pruebas: los instrumentos deben prepararse temprano aunque la ejecución final llegue después.

Todos los nombres de archivos nuevos/directorios candidatos son ubicaciones propuestas; no existen como implementación por incluirlos en esta tabla. Los permisos externos se identifican en §6.2.

| ID / prioridad / OE | Tarea y archivos/componentes afectados | Dependencias | Entregable y aceptación propuesta | Esfuerzo JP / duración / bloqueo |
| --- | --- | --- | --- | --- |
| P01 / P0 / OE1–6 | Acordar trazabilidad completa, dedicación, fecha real y secuencia de autorizaciones; `docs/academic/`, ADR | Revisión de este plan; director/equipo | Acta de compromisos y responsables; seis OE conservados, criterios originales mapeados, horas/semana y semanas restantes registradas con su estado de confirmación | 3–5 / 1 sem / Alto: agenda académica |
| P02 / P0 / OE1,2,4,6 | Preparar y tramitar por responsables el registro de fuentes, accesos, servidor y permisos; `docs/discovery/`, `docs/transition/` | P01; decisiones externas G1–G5 | Ficha por fuente/infraestructura: dueño, permiso, entorno, alcance y fecha; rechazo/pendiente explícitos. Sin llamadas reales hasta autorización específica | 3–5 / 1 sem de trabajo, espera abierta / Muy alto: CCD/TI |
| E01 / P0 / OE1–6 | Preparar instrumentos y realizar levantamiento autorizado; `docs/academic/`, `eval/` | P01; G1/G4 antes de participación | Protocolos aprobados; entrevistas al coordinador CCD y 10–15 estudiantes, caracterización aplicada, síntesis anonimizada y requisitos trazados; cinco tareas/SUS y métricas por componente preparados. No sustituir entrevistas por discovery del equipo | 4–6 / 1–2 sem de trabajo, agenda adicional abierta / Alto: revisión y participantes |
| D01 / P0 / OE1,2,4 | Resolver autoridad, admisión y cobertura documental; `docs/discovery/`, `data/ccd/schemas/`, preparación CCD | P02, G2; BCH-01 | Matriz fuente→permiso→periodo/población→hecho/regla→destino; conservar bloqueos si no hay ratificación; comprobar que corpus cubre las familias prometidas, con guías completas separadas | 4–7 / 1–2 sem / Muy alto: ratificación documental |
| R01 / P1 / OE1 | Adaptar recuperación/evidencia al corpus autorizado sin perder trazabilidad; `backend/api/src/{application,retrieval,chat}/`, `backend/rag/src/ccd/` | D01 y E01 | RAG consultable y referencias completas; pruebas de ranking/gold, ámbito, referencias inválidas, falta de regla, corpus mayor y `full_document` sin embeddings. Reusar pipelines y servicios | 5–8 / 1–2 sem / Alto: corpus suficiente |
| R02 / P1 / OE1,3,5 | Mejorar orientación general ante relatos/límites; `chat/{document-rag,document-evidence,conversation-context}.ts`, tests y banco de desarrollo | P01/E01; no requiere liberar normas bloqueadas | T11 reconoce testimonio, hipótesis y norma; distingue primera presentación/repetición y ofrece aclaración útil. Variantes nuevas, T07/REG/AMB sin regresión; sin excepción por ID ni respuestas estáticas | 4–7 / 1–2 sem / Medio: capacidad del modelo y referencia humana |
| U01 / P1 / OE2 | Adquisición/parsers con fixtures; módulo candidato `backend/rag/src/acquisition/`, fixtures depurados de evaluación | P02 con descripción de fuentes; desarrollo local sin tráfico institucional | Extracción determinista HTML/PDF/Excel con localizadores, huellas y campos requeridos; rechaza datos fuera de alcance, formato roto, paths/URLs no permitidos. Matriz de errores por tipo | 4–6 / 1–2 sem / Alto: formatos aún no confirmados |
| U02 / P1 / OE2 | Tres flujos programables para oferta/convocatorias/novedades; `n8n/workflows/`, adquisición y HTTP interno de RAG | U01/D01, G2/G3 y autorización expresa de automatización | Tres pipelines distintos, frecuencia configurable, adquisición real autorizada y normalización. Ejecutan sin intervención durante ensayos; no publicar contenido sin política de admisión | 6–10 / 2 sem / Muy alto: páginas y scraping |
| U03 / P1 / OE2,4 | Cambios/publicación/auditoría y reconciliación; `backend/rag/src/{ccd,db,internal-http}/`, migraciones nuevas propuestas, workflows | U02; autorización de delta SQL/HTTP interno y política de cambios | Altas/cambios/bajas/duplicados con estado observable; staging y promoción atómica; fallo conserva current; estado antes de retry/recover acotados. Informe <24 h y >90 % con denominadores y reloj fuente | 5–8 / 1–2 sem / Alto: contrato de snapshot dinámico y reloj |
| M01 / P1 / OE3 | Servidor MCP ejecutable para seis tools congeladas; `backend/mcp-server/` y application services reutilizados | P01; autorización de implementación y decisión de transporte | `tools/list`/calls, schemas, errores, perfil controlado, orden y procedencia exactos; paridad con servicios en demo sintética aislada. Sin crear nuevos datos v1 ni llamarlo MCP CCD | 6–9 / 2 sem / Medio: compatibilidad protocolo/SDK a verificar |
| M02 / P0→P1 / OE3,4 | Delta MCP para CCD/calendario e implementación aprobada; `tools-contract.md`, `tools.contract.json`, handlers y tests | M01/D01/P02; autorización expresa del contrato congelado | Perfil de fuentes/contextos y procedencia reconciliado en ambos contratos; tests negativos contra mezcla demo/CCD y resultados con releases incompatibles. Sin anunciar herramientas institucionales inexistentes | 3–5 / 1 sem / Alto: aprobación de contrato y fuentes |
| A01 / P1 / OE3 | Bucle agéntico limitado y cliente MCP; módulo candidato `backend/api/src/agent/`, composición en `main.ts` | M01/R02; política y alcance aprobados | Decisión autónoma observable, llamada MCP real, observación/terminación; límites de pasos/tiempo/contexto, no-tool/aclaración/error. Pruebas con proveedor controlado y después LLM real; no basta una secuencia fija | 8–12 / 2–3 sem / Alto: selección fiable y latencia |
| A02 / P1 / OE3,4 | Integrar agente al fallback y banco multietapa; dispatcher/mensajes, `eval/agent/` propuesto | A01/M02/B02 | Casos relacional→documental→calendario con trazas y coherencia; fallos parciales/inyección/cambio de publicación terminan de forma segura. Verificar fast paths y persistencia; usar umbrales aprobados en E01 | 5–8 / 1–2 sem / Alto: contrato CCD/calendario |
| B01 / P0 / OE4 | Modelar BPM y fronteras sin duplicar dominio; ADR, `docs/arquitectura.md`, `n8n/` | P01/E01 | Estados de consulta, roles, reglas ratificadas/bloqueadas, correlación, persistencia y fallos; catálogo de flujos de A0 §11.4 con casos. Aprobar cambio de N8N síncrono antes de B03 | 3–5 / 1 sem / Alto: revisión de responsabilidades |
| B02 / P1 / OE4 | Sincronizar calendario Sheets autorizado; adaptador candidato, servicios/calendario, `n8n/workflows/`, delta de persistencia | B01/D01/P02, G3; contrato/migración autorizados | Altas/cambios/cancelaciones reproducibles, zona e IDs; fuente→App ≤30 min, histórico y coherencia comprobados. Fixture para desarrollo separado de evidencia de hoja institucional | 6–9 / 2 sem / Muy alto: hoja/credenciales y publicación |
| B03 / P1 / OE4 | Workflow conversacional y puente backend interno; `n8n/workflows/`, `backend/api/src/` | B01/A02; autorización de interfaz interna | N8N coordina de verdad chat/ramas; herramientas ejecutadas y candidato validado/persistido una vez por API. Pruebas E2E sin pérdida/corrupción, timeout, concurrencia y sin API↔N8N recursivo | 5–8 / 1–2 sem / Alto: latencia e integración |
| C01 / P1 / OE5,4 | Completar historial de cursos y contexto de demostración final; `mobile/src/app/progress.tsx`, cliente/session, `application/profile-progress.ts`, diseño de persistencia | P01/E01/X01; decisión explícita sobre perfiles sintéticos separados | Cursos completados/fechas y progreso coinciden con perfil sintético identificado; distinguir historial académico/chats y ausencia de expediente real. No habilitarlo sobre el contexto compartido CCD mediante coerción | 4–7 / 1–2 sem / Alto si se exige expediente real |
| C02 / P1 / OE5,4 | Integrar calendario y consulta en Mobile; `mobile/src/app/{calendar,chat,home}.tsx`, clientes API | B02/C01 | Filtros, fechas, fuente/actualización, estados vacíos/error y apertura de evento; dato actualizado coincide con backend. Pruebas nativas por plataforma y sin fallback sintético silencioso | 4–7 / 1–2 sem / Medio: fuente y dispositivos |
| C03 / P1 / OE5,4 | Push remoto y apertura contextual; módulo móvil/notificaciones y servicio backend candidatos, workflow N8N | B02/B01/X01, G5; credenciales/builds autorizados | Permiso denegado/otorgado, registro/revocación del dispositivo, recepción/apertura y evento cancelado; envío deduplicado y trazable sin secretos/datos académicos en payload. Android/iOS reales según matriz | 6–10 / 2 sem / Muy alto: credenciales/build/dispositivos |
| X01 / P0 / OE5,6 | Seguridad, aislamiento y entorno del piloto; `backend/api/src/http/`, Mobile/session, `infra/`, documentación | P01/P02 para entorno; diseño puede iniciar sin servidor | Prueba negativa de acceso a chat/token de otra sesión; separación demo/CCD y autorización de dispositivos. Diseño de red/TLS/secretos/custodia. No presentar sesión de estudio como SSO UNAB | 4–7 / 1–2 sem / Alto: política TI y delta REST/SQL si necesario |
| X02 / P1 / OE6 | Empaquetar servicios faltantes con versiones/configuración reproducibles; Dockerfiles candidatos y Compose de despliegue, manual | X01/M01; coordinar imágenes con A01/B03 | Instalación en entorno limpio autorizado, API/RAG/MCP/N8N/PostgreSQL/Ollama comunicados; secretos externos, volúmenes, healthchecks y arranque/parada documentados. No portar `host.docker.internal` como supuesto Linux | 5–9 / 2 sem / Alto: hardware y runtime del servidor |
| X03 / P1 / OE6 | Despliegue universitario y preparación operativa; `infra/`, runbooks y configuración no secreta | X02/U03/B03/C02/C03, G3/G5; destino autorizado | Evidencia de servidores UNAB y red móvil, permisos, backup/restore y acceso aislado; inventario lógico/físico y versiones. La instalación local no cierra esta tarea | 4–7 / 1–2 sem / Muy alto: infraestructura y ventana TI |
| Q01 / P0→P2 / OE1,3,6 | Congelar bancos/gold y calibrar revisión; `eval/retrieval/`, `eval/rag-quality/`, banco CCD/agent separado | E01/D01/R01 para referencia final | 50–80 preguntas institucionales según A0, pasajes relevantes, protocolo RAGAS/MRR y reserva separada; calibración del juez/humana, hashes y versión. Bancos de tareas agénticas y R/P/N/Q diferenciados | 4–6 / 1–2 sem / Alto: anotación y juez local |
| Q02 / P2 / OE1–6 | Campaña integrada original; `eval/{integration,ingestion,rag-quality,retrieval}/` y banco agent | Q01/X03/U03/A02/B03/C02/C03; versión candidata congelada | RAGAS/recuperación, RPA real, MCP/agente y cobertura 100 % BPM/§11.4; ledger de intentos/NE y trazas fuente→App. Todos los fallos conservados; reporte por compromiso, sin PASS global por conteo | 6–9 / 2 sem / Alto: integración y accesos sostenidos |
| Q03 / P2 / OE6 | Carga normal/latencia/disponibilidad y optimización autorizada; `eval/generation/`, `eval/integration/`, observabilidad/infra | Q02 y perfil de carga acordado | Media ≤5 s en red institucional y ninguna interrupción no planificada >5 min en ventana acordada; frío/caliente/rutas/fallos separados. Si incumple, evidencia y nueva tarea de ajuste, sin alterar umbral | 5–8 / 2 sem incl. observación / Alto: hardware y costos del agente |
| Q04 / P2 / OE5,6 | UX, accesibilidad y SUS; `eval/mobile/`, registros privados del estudio | Q02/E01/C03/X01, G4/G5; protocolo y consentimiento | ≥10 estudiantes UNAB de distintos programas, cinco tareas, SUS 10 ítems; media >70, nadie <50, completación >85 %. Separar ayudas/fallos por plataforma; sin reclutar ni recolectar en BCH-04 | 5–8 / 2 sem o más por agendas / Muy alto: permisos y muestra |
| Q05 / P2 / OE1–6 | Consolidación académica/transferencia; `docs/academic/`, manuales API/MCP/BPM/despliegue y caso de estudio | Q02/Q03/Q04; resultados y revisión académica | Informe cubre 100 % de objetivos evaluativos, decisiones/limitaciones, matrices, arquitectura lógica/física, repositorio replicable y caso de estudio. Fallos figuran como fallos; revisión/defensa sin reescribir A0 aquí | 4–6 / 1–2 sem / Medio: revisión y resultados adversos |

**Total de las 27 tareas: 125–202 JP.** Q02 consolida las pruebas de componente ya producidas en las tareas; no presupone volver a ejecutar toda batería costosa si no aporta cobertura nueva. La contingencia de plazo de §6 no está añadida a este total como trabajo ya necesario. Si hacen falta una interfaz institucional personal, rediseño de persistencia mayor, nuevos permisos/builds o varias rondas de corrección, reestimar y reprogramar conservando objetivos.

## 6. Dependencias, ruta crítica y cronograma

### 6.1 Responsables y capacidad supuesta

| Rol propuesto | Responsabilidad | Recurso supuesto para el cronograma, sin asignación confirmada |
| --- | --- | --- |
| Dirección académica y Sala de Control | Aceptación de plan/criterios, autorización de incrementos y conciliación con A0 | Revisión en cada hito, fechas por acordar; Sala no concede permisos CCD/TI |
| Responsable CCD/documental | Autoridad, vigencia, fuentes, páginas, hoja y reglas | Acceso a revisión desde R1; dedicación y facultad para aprobar por confirmar |
| Desarrollo backend/RAG/agente | R01/R02, A01/A02 e integración del responder | Una persona experimentada, 30 h productivas/semana |
| Desarrollo MCP/seguridad/integración | M01/M02, apoyo X01/B02, puente B03 e integración | Otra persona, 30 h productivas/semana |
| Desarrollo RPA/BPM/datos | U01–U03, B01/B02/B03 coordinado con backend | Otra persona, 30 h productivas/semana |
| Desarrollo Mobile | C01–C03 y pruebas nativas/accesibilidad | Otra persona, 30 h productivas/semana |
| Evaluación/documentación | E01/D01/Q01, anotación, campañas e informes | 15 h productivas/semana, más segundo revisor para calibración y revisión independiente |
| Infraestructura/TI | X01–X03, red/servidor, apoyo a Q03 y operación | Apoyo reservado para preparación/despliegue; horas y acceso por confirmar. Si lo absorbe desarrollo, nivelar su carga |
| Estudiantes participantes | Caracterización/entrevistas y estudio SUS | 10–15 para levantamiento y ≥10 para evaluación, roles/muestras diferenciados; nadie reclutado por este plan |

Las cuatro funciones de desarrollo podrían repartirse entre menos personas, pero no conservarían automáticamente sus ventanas paralelas. Se supone apoyo cruzado entre desarrolladores en las ventanas R3–R5: R01/R02 y U02/B02 no caben como pares simultáneos completos a cargo de una sola persona. P01 debe asignar horas por tarea/rol, nivelar esas cargas y desplazar ventanas si el apoyo no existe. El recurso humano anterior es una **necesidad del escenario acelerado**, no descripción del equipo real ni obligación de contratar. El banco reservado necesita custodia separada de quien ajusta el sistema; si falta un segundo revisor, declarar revisión única y sus límites.

### 6.2 Dependencias externas y condición de liberación

| Puerta | Dependencia hoy no confirmada | Libera / evidencia requerida |
| --- | --- | --- |
| G1 | Director: situación del anteproyecto, criterios operacionales, entrega real, dedicación y proceso académico | P01/E01 y cronograma comprometible; acta con fecha y responsable. No asumir que aprobar el equipo equivale a aval del director |
| G2 | CCD: derechos de uso/publicación, autoridad de fuentes, población/periodo y resolución de contradicciones necesarias | D01/R01; documentos/derivados expresamente admitidos. M04/M05/M10 y tarifas/efectos personales siguen limitados hasta evidencia competente |
| G3 | Permiso explícito de scraping, tres páginas/familias accesibles, frecuencia y registro de publicación; propietario/credenciales de Sheets | U02/U03/B02 y aceptación OE2/OE4. Autorización documentada más tarea posterior que levante la prohibición para esos accesos; no contacto automático desde este chat |
| G4 | Revisión académica/ética aplicable, consentimiento, custodia, acceso a coordinador y estudiantes | Entrevistas/caracterización y Q04; instrumentos aprobados, calendario y selección de muestra. «Riesgo mínimo» autodeclarado en A0 no prueba aprobación |
| G5 | Servidores UNAB/red/operador, dispositivos Android/iOS y canal push/builds/cuentas | X02/X03/C03/Q03/Q04; asignación técnica y permisos. Presupuesto o servicios de pago requieren aprobación específica; no se asume costo cero |

P02 prepara solicitudes y registros para que el equipo autorizado los tramite. Este plan no envía mensajes a terceros, crea cuentas ni pide credenciales por el chat. Un bloqueo se registra con dueño y fecha de revisión; no se sustituye evidencia institucional por fixtures para cerrar el OE.

### 6.3 Ruta crítica estimada

La cadena de referencia con duraciones de planificación, bajo recursos suficientes y sin esperas externas, es:

```text
P01 1 semana -> E01 1 -> R02 2 -> A01 3 -> A02 2 -> B03 2
             -> X03 2 -> Q02 2 -> max(Q03 2, Q04 2) -> Q05 1
             = 18 semanas relativas
```

R02 se coloca antes del agente para fijar comportamiento de evidencia/orientación y evitar duplicar defectos dentro del ciclo multietapa. M01 debe estar listo para A01; M02 y B02 para A02; X02/U03/C02/C03 deben llegar antes de X03. Son ramas de convergencia con capacidad de convertirse en críticas. G1–G5 se superponen solo si sus responsables realmente están disponibles: su espera no tiene duración confirmada ni un máximo defendible.

Actividades paralelizables: M01 con preparación de datos/fixtures; R01/R02 con U01–U03 y B02; Mobile con backend estabilizado mediante fixtures; X02 con construcción de módulos; preparación del banco y protocolo humano con implementación; Q03 y Q04 con equipos/operadores disponibles y condiciones de carga controladas. No solapar una medición de rendimiento con sesiones/cargas no registradas ni usar la misma persona como cuatro recursos simultáneos.

### 6.4 Cronograma relativo de referencia

**R1 empieza solo después de autorizar ejecución.** R1 no es semana 1 del semestre, no reinicia el plazo académico ni indica una fecha confirmada. Las ventanas incluyen coordinación del rol y pueden requerir nivelación tras conocer dedicación. Ante permisos tardíos se desplazan las tareas dependientes; no se comprimen por cambiar la etiqueta de semana.

| Ventana | Trabajo y dependencias de la tabla §5 | Hito verificable |
| --- | --- | --- |
| R1 | P01/P02; inicio X01 y trámite G1–G5 | H0: seis OE/criterios, calendario real y responsables registrados; pendientes externos visibles |
| R2–R3 | E01 en R2 si G4/agendas lo permiten; B01 tras E01; D01, M01 y U01; cerrar diseño X01 en R2 para C01. Preparar protocolos/fixtures en paralelo | H1: levantamiento registrado, diseño de integración/seguridad y BPM revisados; contrato MCP sintético implementable; fuentes/admisión identificadas |
| R3–R4 | R01/R02; cerrar M01 y D01; M02 en R4 una vez autorizado | H2: orientación general corregida con variantes; MCP de seis tools comprobado en demo; delta CCD aprobado antes de conexión |
| R4–R5 | U02 y B02 con G2/G3; continuar verificación documental | H3: tres flujos y calendario operativos en entorno autorizado; aún sin afirmar aceptación final |
| R3–R4 y R6–R7 | C01 primero; C02 después de B02. Historial/citas/errores integrados | H4: módulos Mobile reutilizados con perfil sintético declarado y calendario trazable |
| R5–R7 | A01; Q01 en R5–R6 tras referencia R01; U03 en R6–R7 | H5: agente decide/actúa/termina; banco congelado y cambios de fuente auditables |
| R8–R9 | A02 con calendario/MCP CCD; C03 en R8–R10; X02 en R8–R9 con apoyo TI, completando imágenes del puente al cerrar B03 | H6: tareas multietapa reales y contenedores preparados; recepción push pendiente de completar ambas plataformas |
| R10–R11 | B03; cierre C03/X02, preparación de despliegue | H7: consulta completa REST→N8N→router/agente/MCP→persistencia→Mobile, con casos de error |
| R12–R13 | X03 en infraestructura universitaria; preparación de evidencias/campañas | H8: despliegue universitario accesible y aislado, runbook/restore verificados; versión candidata identificada |
| R14–R15 | Q02, integración/RAGAS/RPA/BPM/MCP sobre versión congelada | H9: informe por objetivo y flujo; fallos/NE conservados; decisión sobre correcciones antes de evaluación final |
| R16–R17 | Q03 y Q04 en paralelo controlado, si participantes/recursos disponibles | H10: rendimiento/estabilidad y SUS/cinco tareas con resultados, también si incumplen metas |
| R18 | Q05 y revisión académica | H11: paquete integral de evidencia/transferencia y estado de cada compromiso |
| R19–R21/R22 | Reserva propuesta para incidencias/correcciones/revisión, sin trabajo ficticio asignado | Solo se consume con causa, tarea y autorización identificadas; si se cambia la versión, declarar qué evaluación debe repetirse |

La tabla 3 de A0 sitúa infraestructura en S3–S5, RAG S6–S8, Mobile S9–S12, integración S12–S13 y evaluación S13–S15, con hitos S4/S8/S12/S15/S16. La narración §11.2 usa intervalos parcialmente distintos. Se conserva como referencia histórica, no se afirma haber alcanzado esos hitos por número de semana ni se repite todo desde cero. La parte ya implementada reduce esfuerzo, mientras MCP/agente, automatismo real, N8N conversacional y permisos añaden dependencias aún abiertas.

### 6.5 Capacidad, sensibilidad y decisiones si el plazo no alcanza

| Escenario ilustrativo | Capacidad productiva | Límite por esfuerzo y dependencia |
| --- | --- | --- |
| Una persona, 15 h/semana | 2,5 JP/semana | 125/2,5–202/2,5 = **50–80,8 semanas** antes de esperas/reserva; paralelismo de referencia no disponible |
| Dos personas, 12 h/semana cada una | 4 JP/semana | **31,25–50,5 semanas** por capacidad agregada; no cabe en 16 semanas bajo estos supuestos |
| Cuatro personas de desarrollo, 30 h/semana cada una, y evaluación 15 h | 22,5 JP/semana agregados, sin contar TI | **5,6–9 semanas** es solo cota aritmética por esfuerzo; especialización, distribución desigual y cadena de **18 semanas** dominan el calendario |

Para cualquier disponibilidad real `W`, comprobar horas confirmadas por rol y la condición necesaria `6 × esfuerzo JP ≤ suma(horas productivas/semana × W)`, además de dependencias y permisos. La capacidad agregada por sí sola no garantiza viabilidad. Añadir personas tarde también consume incorporación y revisión.

Medidas propuestas manteniendo objetivos: obtener G2/G3/G5 temprano; reservar segundo desarrollador backend y rol de automatización para ramas paralelas; dedicar revisión documental/evaluación independiente; garantizar hardware/ventana TI y Android/iOS; negociar entrega por hitos y una extensión documentada. Una propuesta de 16 semanas tendría que ahorrar al menos dos semanas de la cadena nominal, más decidir cómo financiar contingencia; por ejemplo, adelantar especificaciones y preparar despliegue incremental con resultados verificados. No aprobar esa compresión sin nivelar recursos y demostrar que las dependencias se cumplen. Ninguna medida elimina OE2/OE3/OE4/OE6 ni convierte un ensayo simulado en institucional.

## 7. Criterios de aceptación originales e instrumentos faltantes

### 7.1 Compromisos verificables conservados

Los siguientes umbrales proceden de **A0**, no son nuevos resultados ni umbrales universales de las herramientas. Su operacionalización debe acordarse antes de ejecutar; si se solicita un cambio, registrar el proceso académico sin sustituirlos silenciosamente.

| ID / OE / fuente A0 | Criterio original que se conserva | Instrumento/banco pendiente y tareas responsables |
| --- | --- | --- |
| AC1 / OE1 / p. 20 | RAGAS: **faithfulness ≥0,80; context precision ≥0,80; context recall ≥0,75; answer relevancy ≥0,80; MRR ≥0,70**; **50–80 preguntas** generadas sintéticamente a partir de documentos institucionales indexados | Q01/Q02: corpus autorizado, gold, protocolo de generación/revisión RAGAS, versión y juez calibrado, ranking y respuestas con citas. MRR se calcula sobre relevancia/ranking, no se supone métrica generativa; fijar k y tratar su equivalencia con el MRR original explícitamente |
| AC2 / OE1,6 / p. 18 | Recuperación con precision@k, recall@k y MRR; respuesta basada exclusivamente en información oficial/verificada | R01/D01/Q01/Q02: pasajes relevantes, negativos, corpus y periodos, afirmaciones y fuentes revisadas. A0 no fija umbral para precision@k/recall@k en §11.2; no inventarlo. `full_document` se evalúa por acceso/integridad, fuera de vectorial |
| AC3 / OE2 / p. 20 | **Al menos tres flujos automáticos de scraping exitosos, sin intervención manual** durante pruebas; actualización **<24 h** desde publicación CCD; extracción correcta **>90 %** de documentos sobre páginas objetivo | U01–U03/Q02: páginas autorizadas y muestra congelada, versiones/publicación original, observación de ejecución automática y gold de campos/documentos; informe de cada flujo, no tres ejecuciones manuales del mismo |
| AC4 / OE3 / p. 20 | Ciclo **ReAct**, servidor MCP e interfaces/código; intención evaluada autónomamente y herramienta MCP adecuada en **tareas de múltiples pasos**, coherencia conversacional | M01/M02/A01/A02/Q02: benchmark multietapa, herramientas esperadas o secuencias válidas, resultado y límites. A0 no fija una tasa numérica: proponerla en E01 antes de evaluar, sin inventar un porcentaje histórico |
| AC5 / OE4 / pp. 20–21 | N8N integrado con Google Sheets/calendario y PostgreSQL/perfiles sintéticos; N8N→pgvector→Backend API→App **sin pérdida/corrupción**; sincronización **máxima 30 min**; **100 %** de flujos de §11.4 con casos documentados | B01–B03/Q02: matriz de flujos, trazas por nodo e identidad de datos, relojes origen/destino, escenarios calendario y perfil. Probar dato relacional sin obligar a vectorizar eventos o guías que no lo requieren |
| AC6 / OE5 / pp. 18–21 | React Native, consulta natural, calendario interactivo, **historial de cursos completados**, **push**, REST; experiencia Android/iOS descrita en §11.4 | C01–C03/Q04: matriz funcional/plataformas, perfil sintético explícito y pruebas nativas reales de cada módulo; verificar accesibilidad y errores, no confundir historial de chats con cursos |
| AC7 / OE5,6 / p. 21 | **SUS de 10 ítems**, **≥10 usuarios reales UNAB de distintos programas**, **media >70/100**, **ninguno <50/100**, completación **>85 % de cinco tareas** | E01/Q04: versión del cuestionario, puntuación, cinco guiones, consentimiento/muestra, éxito/asistencia/abandono y protocolo de moderación. No excluir participantes con malos resultados ni atribuir satisfacción del equipo a estudiantes |
| AC8 / OE6 / p. 21 | Sistema completo **Docker en servidores de la universidad**; disponibilidad/estabilidad durante pruebas **sin interrupciones no planificadas >5 min** y latencia media natural **≤5 s**, en uso normal por red institucional | X01–X03/Q03: entorno asignado, perfil de carga y ventana de observación acordados, healthchecks y ledger de incidentes, tiempos desde Mobile y por etapa. Conservar formulación de «estabilidad absoluta» como aspiración de A0; una ventana finita no prueba garantía universal |
| AC9 / OE6 / pp. 21–22 | **100 % de objetivos de evaluación planificados** cubiertos en informes; arquitectura lógica/física, MCP, lógica BPM/N8N, manual de despliegue y repositorio replicable; informe consolidado/caso de estudio | Q05: trazabilidad compromiso→instrumento→resultado→artefacto; incluir no logrado/no evaluable. Cubrir el objetivo en un informe no equivale a superar su umbral; un bloqueo no desaparece del denominador |
| AC10 / transversal / pp. 17–18 | Investigación aplicada, iterativa/incremental, enfoque mixto/DSR; entrevistas al coordinador CCD y **10–15 estudiantes**, cuestionario de caracterización; minimización, consentimiento y anonimización previstos | E01/P02/Q04/Q05: instrumentos de requerimientos y registro de resultados/requisitos separados del estudio SUS; revisión ética/institucional aplicable. No declarar aprobación de riesgo o normativa por citar A0 |

### 7.2 Operacionalización propuesta, adicional a A0

Antes de las campañas, E01/Q01 deben fijar el universo, referencia, denominador, ventana, criterio de éxito y manejo de ausencias. Son decisiones propuestas, pendientes de aprobación:

- **RAG:** separar 50–80 preguntas del benchmark institucional de las 63 candidatas sintéticas de M9 y de los 43 turnos conocidos + 20 turnos reservados propuestos en A3. Son bancos distintos con unidades distintas. Generación sintética de preguntas sobre documentos autorizados no convierte el corpus en ficticio. Separar desarrollo/reserva y custodiar hashes antes del tuning; usar localizadores/periodo y doble revisión si disponible. Conservar M1–M7 para pertinencia, respaldo, citas, continuidad, abstención, utilidad y advertencias, además de las cinco métricas originales.
- **RPA:** definir «documento correctamente extraído» como unidad con campos/texto y procedencia requeridos correctos contra gold revisado. Denominador: documentos elegibles esperados en el conjunto de páginas objetivo congelado, incluyendo omisiones; no solo los descargados con éxito. Informar aparte precisión por campo, duplicados y falsos positivos. Frescura = instante de disponibilidad en consulta final − publicación original verificable; ausencia de timestamp verificable deja ese criterio sin acreditar. Cadencia más adquisición/validación/publicación deben caber en <24 h; no basta programar cada 24 h.
- **Calendario:** latencia = disponibilidad correcta en App/API final − cambio en hoja origen. Medir máximo observado, cancelaciones y actualización tardía. Elegir polling/eventos y presupuesto de procesamiento dentro de ≤30 min tras conocer permisos; el reloj empieza en la fuente, no en la ejecución del workflow.
- **Agente/MCP:** banco de tareas simples/multietapa con resultado esperado y secuencias alternativas válidas; tareas que requieren aclaración y casos sin herramienta. Medir éxito de tarea, selección correcta, llamadas inválidas/redundantes, terminación, pasos/tiempo y coherencia de fuentes/releases. Comparar con router/RAG directo cuando sea informativo, sin usar la comparación para retirar el agente. Examinar trazas de llamadas reales, no afirmaciones del LLM de que «consultó» una herramienta.
- **BPM/N8N:** catálogo firmado de flujos de §11.4: adquisición PDF/Excel/HTML y vectorización aplicable; actualización de conocimiento; sincronización calendario; activación de notificaciones; consulta→recuperación→generación→persistencia→App; lectura de calendario/historial. Añadir casos agénticos y errores. Relacionar cada flujo con nodos y pruebas; no reducir el catálogo tras ver fallos para alcanzar 100 %.
- **Mobile/UX:** cinco tareas propuestas que cubran los módulos: (1) consulta con seguimiento/corrección y fuente; (2) localizar un evento del calendario; (3) consultar cursos completados de un perfil sintético; (4) recibir/abrir push y llegar al evento; (5) recuperar un error controlado y reabrir historial sin duplicar mensaje. Fijar criterio y ayuda permitida antes de sesiones; éxito total = tareas completadas sin ayuda sustantiva / tareas asignadas, con desglose por tarea y plataforma. Con diez participantes y 50 asignaciones completas, >85 % requiere al menos 43 éxitos; no tratar tareas no asignadas como éxito. SUS individual según instrumento acordado; informar los diez ítems y distribución/puntaje individual anonimizado, además de la media.
- **Despliegue/rendimiento:** definir mezcla de consultas, concurrencia, tiempos de llegada, frío/caliente, tamaño de corpus y hardware. Proponer siete días consecutivos de observación después de estabilizar el despliegue, sujeto a aprobación de ventana; no es duración original de A0. Medir media ≤5 s en consultas naturales según carga acordada y desglosar fast path/RAG/agente/N8N, p50/p95/n, timeouts y fallos. Los fallidos no desaparecen: informar denominadores y duraciones censuradas; una media baja en solo éxitos no cierra operación integral. Registrar toda interrupción y si fue planificada antes de ocurrir; no reclasificarla después.
- **Validez académica:** recoger tiempos/carga administrativa y experiencia inicial mediante caracterización y, si se permite, tareas comparables con canales actuales. Proponer una comparación acotada antes/después o por tareas, con sesgos y muestra explícitos; no afirmar reducción causal de carga, mejora de notas o impacto institucional solo con SUS. El caso de estudio debe distinguir producto, desempeño observado y efectos no demostrados.

Conservar la contabilidad de A3: planificados/intentados/completados/fallidos/NE, dependencias entre turnos y verificación del par de mensajes/citas persistidos. Un antecedente fallido vuelve NE al seguimiento; el ensayo adverso se mantiene aunque después exista retest favorable. M8/M9 complementan operación/tiempos y M10 el recorrido de interfaz, sin sustituir AC7/AC8.

### 7.3 T11 y validez de normas

**T11 mantiene C: semánticamente no satisfactorio.** Los 43 turnos completos y 329 controles técnicos no explican los dos casos relatados ni distinguen con utilidad suficiente testimonio, hipótesis de procedimiento y norma. La ausencia de gratuidad universal falsa es una protección observada, no aceptación del escenario.

Su mejora corresponde primero a **R02, bajo OE1 y con impacto en OE3/OE5**: tratamiento general de aportes del estudiante y límites de evidencia en el responder/contexto, antes de integrar agente y congelar evaluación final. A01/A02 deben conservar esa distinción al usar herramientas; Q01/Q02 evalúan M1, M5 y especialmente M6 con variantes independientes, sin plantilla T11 ni ajuste del reservado. No se corrige añadiendo normas no ratificadas, forzando U04, ampliando indiscriminadamente retrieval o suponiendo un permiso académico.

U03 sigue siendo orientación histórica 202660 y U04 transición condicionada; aprobación del equipo, hash correcto o una cita no les otorgan vigencia institucional. Gratuidad/repetición, elegibilidad de continuos, equivalencias AND/OR/personales, tarifas, matrícula y publicación de resultados requieren fuentes/autoridad específicas. Un relato del estudiante puede contextualizar una hipótesis, nunca convertirse en evidencia documental oficial o expediente consultado. Si falta la norma, debe explicarse lo conocido y la consulta concreta pendiente sin negar que el procedimiento pudo existir.

## 8. Riesgos y bloqueos que debe revisar Sala de Control

| Riesgo/bloqueo | Impacto y señal verificable | Tratamiento y responsable propuesto |
| --- | --- | --- |
| Semanas/dedicación desconocidas | No puede comprometerse fecha; ventanas relativas confundidas con calendario real | P01: director/equipo confirman fecha, horas por rol y revisión de cadena/capacidad; presentar déficit y extensión, sin eliminar OE |
| Scraping no autorizado o páginas insuficientes | U02/U03 y AC3 bloqueados; tres fixtures no acreditan tres flujos reales | P02/G3: propietario y autorización específica. Mientras tanto solo fixtures aprobados; bloqueo externo en informe |
| Autoridad/contradicciones de fuentes | Calidad y cumplimiento institucional no demostrables | D01/G2: ratificación por periodo/población y cuarentena. No usar originales internos completos ni expediente para resolverlo |
| Contratos congelados con alcance sintético/local | MCP CCD, perfiles, calendario dinámico y despliegue no se conectan con fidelidad cambiando solo configuración | B01/M02/X01/U03 diseñan delta y obtienen tarea autorizada; si contrato y código propuestos se contradicen, detener esa integración y reportar |
| N8N conversacional añade dependencia/latencia | Consulta puede fallar o superar ≤5 s | B03/Q03: instrumentar etapas y presupuesto, conservar fast path y una persistencia final; medir antes de optimizar. No retirar N8N para simular cumplimiento de OE4 |
| Agente no selecciona tools con fiabilidad | MCP operativo sin autonomía útil; loops o costo de contexto | A01/A02: tareas concretas, límites, casos no-tool, selección real con LLM y comparación; estimar nueva iteración si falla |
| Reusar HTTP sintético como ingesta CCD | Origen/approval incorrectos o publicación fuera de receta | U03: adaptador y contrato explícitos, procedencia/guardas y prueba negativa de destino. No desactivar validadores v1/CCD |
| Calendario sin fuente/reloj verificables | Imposible acreditar ≤30 min o actualización institucional | B02/G3: hoja y cambio observable autorizados; incertidumbre explícita y reprogramación si no se consiguen |
| Backend compartido sin autenticación/autorización | Exposición cruzada de conversaciones y tokens al abrir red/estudio | X01 antes de X03/Q04; permisos efectivos en servidor y pruebas negativas. No confiar en memoria de Mobile |
| Push/iOS sin credenciales/dispositivos | Módulo o plataforma de OE5 sin evaluar | G5/C03: builds/cuentas/dispositivos y permisos confirmados; no crear proyectos nativos o servicios de pago sin tarea explícita |
| Infraestructura universitaria no asignada | OE6 no puede cerrarse con laptop local | G5/X03: reserva TI, hardware y ventana. Simulación/local se reportan solo como preparación |
| Reclutamiento/revisión ética tardíos | Entrevistas y SUS retrasan aceptación | E01/G4: iniciar preparación temprano, participantes voluntarios y consentimiento antes de recolectar. Reprogramar sesiones sin sustituir estudiantes por equipo |
| Banco/juez sesgado o tuning con reserva | Métricas infladas; insuficiente validez de generalización | Q01: gold, custodia y revisión humana/calibración; declarar única revisión si no hay segunda persona |
| Timeouts y contexto de Ollama | Ensayos incompletos y variabilidad; fallo pasado no tiene causa única probada | Reutilizar telemetría y ledger; presupuestar pasos/contexto en A01 y medir Q03; no ajustar parámetros o repetir POST sin autorización |
| Alcance completo interpretado como permiso ilimitado | Datos privados, cambios SQL/REST/MCP o consumo real fuera de autorización | Autorizar incrementos delimitados, separar decisiones de equipo/director/CCD/TI; mantener carpeta externa de solo lectura, corpus v1 congelado y CCD no público ignorado por Git |

## 9. Primer incremento técnico recomendado, pendiente de autorización

**Recomendación: M01, servidor MCP de lectura para las seis herramientas del contrato sintético existente**, acompañado de la definición de pruebas de tareas multietapa de OE3. P01 y el diseño de fronteras B01/X01 deben delimitar su autorización; los trámites G1–G5 pueden avanzar por los responsables en paralelo. Esta elección abre una dependencia central del agente sin esperar permisos de scraping y sin sustituir el alcance institucional final por una demo.

Alcance propuesto para una siguiente tarea: `backend/mcp-server/` (composición, handlers, documentación y pruebas), reutilizando application services; ajustes internos mínimos de exportación solo si se justifican. Sin cambios al contrato MCP congelado, REST, SQL, dataset v1, corpus CCD o recetas/parámetros de modelos. Transporte y compatibilidad de revisión MCP deben resolverse expresamente al iniciar, sin elegir versiones nuevas por suposición.

Entregable revisable: servidor ejecutable que publique exactamente `search_knowledge`, `find_documents`, `get_courses`, `get_calendar_events`, `get_announcements`, `get_profile_progress` en el orden y schemas vigentes, con contexto de perfil controlado, errores saneados, procedencia y release. La herramienta de búsqueda reutiliza embedding/recuperación; guías `full_document` continúan por artefactos, sin vectorización. No se añade agente ni se conecta CCD en este incremento.

Aceptación futura: validación de `tools/list`, entradas/salidas/errores y semántica contra contrato; paridad de resultados con los servicios en fixtures sintéticos; perfil no suministrable por agente; rechazo de tool/argumento inválido; ausencia de escrituras y aislamiento de destino. Una prueba real mínima con PostgreSQL/Ollama, si hace falta para cerrar el transporte de búsqueda, requiere que la siguiente autorización incluya expresamente ese entorno y su alcance; no realizar ingesta nueva ni alterar dataset para probarlo. Esfuerzo estimado M01: **6–9 JP, ventana de dos semanas con recursos supuestos**.

M01 no cierra OE3: después siguen M02, A01/A02 y su evaluación real. R02/T11 y la preparación de fuentes/instrumentos deben tener tareas propias autorizadas, sin quedar ocultas dentro del servidor MCP. Si se detecta incompatibilidad entre servicios reutilizables y contrato vigente, detener la parte incompatible y reportar la diferencia; no modificar contrato para hacer pasar la implementación.

## CHECKPOINT BANUCHAT

**BCH-04 — Plan del alcance original completo preparado para revisión.** Incluye auditoría OE1–OE6, 27 tareas priorizadas, arquitectura propuesta con justificación de cambios, dependencias institucionales, 125–202 JP estimadas, cronograma nominal de 18 semanas más reserva, criterios originales, instrumentos faltantes, riesgos y propuesta del primer incremento MCP. La alternativa reducida se conserva únicamente como antecedente histórico. T11 sigue C y tiene mejora asignada a R02.

Único archivo del repositorio añadido: `docs/academic/plan-ejecucion-alcance-original.md`. Verificación documental por lectura, identidad SHA-256 del PDF y cierre BCH-01, código/checkpoints, enlaces locales y revisión de alcance/whitespace. Los resultados de pruebas citados son históricos. **No se ejecutaron pruebas nuevas, evaluaciones, ingestas, servicios o accesos institucionales.** Backend, Mobile, SQL, corpus, releases, contratos y parámetros no se modificaron; sin commit ni push.

**Detenerse para revisión de Sala de Control. No iniciar M01, R02 ni otro incremento técnico hasta recibir autorización explícita.** La aprobación del plan por el equipo no sustituye decisión del director ni permisos CCD/TI o de participación humana.
