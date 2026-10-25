# BanuChat — trazabilidad definitiva OE1–OE6

## Regla de lectura

Línea base técnica: `39b6b6221d61bd7aef2ce236dd124c3b11488345`. Esta matriz
contrasta los objetivos radicados con evidencia ejecutada; no redefine los OE ni convierte
fixtures, pruebas del equipo o infraestructura local en aceptación institucional.

Estados permitidos:

- **CUMPLIDO Y VALIDADO:** implementación y criterio original acreditados en el entorno y
  con la autoridad exigidos.
- **IMPLEMENTADO, VALIDACIÓN PENDIENTE:** capacidad técnica presente, pero falta la
  validación humana, institucional u operacional comprometida.
- **PARCIAL:** existe una parte útil, pero falta capacidad técnica o alcance original.
- **BLOQUEADO:** la siguiente evidencia depende de autorización, acceso o terceros.
- **NO IMPLEMENTADO:** no existe capacidad ni evidencia ejecutable.

Ningún OE alcanza **CUMPLIDO Y VALIDADO** contra su formulación original. Esto no invalida
los incrementos técnicos: evita confundir finalización de software local con cierre académico.

## Resumen

| OE | Estado definitivo | Núcleo acreditado | Brecha que impide el cumplimiento original |
| --- | --- | --- | --- |
| OE1 | IMPLEMENTADO, VALIDACIÓN PENDIENTE | PostgreSQL/pgvector, embeddings, recuperación, RAG/citas y evaluación técnica local | Autoridad documental, revisión humana del banco y RAGAS final sobre corpus autorizado |
| OE2 | PARCIAL | Ingesta reproducible, publicación atómica, manifiestos y N8N manual local | RPA/scraping institucional autorizado, tres flujos reales, frescura y exactitud contra origen |
| OE3 | PARCIAL | Agente determinista acotado y seis tools MCP operativas | Ciclo ReAct gobernado por LLM y evaluación de decisiones multietapa reales |
| OE4 | PARCIAL | Webhook N8N conversacional acotado y calendario versionado desde fixture | BPM/directrices institucionales y Google Sheets real con sincronización extremo a extremo |
| OE5 | PARCIAL | Expo SDK 57, login propio, chat, citas, historial y módulos sintéticos | Android/iOS físicos, accesibilidad, push remoto y estudio con estudiantes/SUS |
| OE6 | PARCIAL | Compose local, Docker RAG, E2E, concurrencia 1/2/5, fallos y restore | Servidor UNAB, TLS/operación, estabilidad sostenida y cierre humano integral |

## OE1

| Campo | Trazabilidad |
| --- | --- |
| Texto original | «Construir un motor de búsqueda semántica mediante la implementación de una base de datos vectorial con PostgreSQL + pgvector y arquitectura RAG, que permita indexar documentos institucionales del CCD y garantizar que las respuestas del sistema se fundamenten exclusivamente en información oficial y verificada.» |
| Actividades ejecutadas | Corpus sintético congelado; corpus CCD seleccionado y separado; manifiestos/procedencia; chunking solo para documentos elegibles; embeddings 1024D; recuperación exacta coseno; generación/abstención; persistencia de citas; banco y adaptador de evaluación. |
| Componentes | `backend/rag`, Document RAG de `backend/api`, PostgreSQL + pgvector, Ollama `qwen3-embedding:0.6b` y `qwen3:4b-instruct`. |
| Entregables | Pipeline y runtime RAG; corpus snapshot; gold técnico K2; banco RAGAS borrador; guía de anotación; calibración técnica de juez. |
| Pruebas/resultados | K2: MRR@5 ≈ 0,8519 y Recall/Hit@5 = 1 sobre el gold sintético; E2E host y Docker con cita/historial PASS; 12 casos de calibración técnica, 48 comparaciones y acuerdo diagnóstico 40/48 = 0,8333. Esa calibración no es gold humano ni resultado OE1. |
| Targets originales | Faithfulness ≥0,80; context precision ≥0,80; context recall ≥0,75; answer relevancy ≥0,80; MRR ≥0,70; banco principal de 50–80 preguntas. |
| Estado | **IMPLEMENTADO, VALIDACIÓN PENDIENTE.** El motor existe y es reproducible. No se garantiza que toda respuesta use información «oficial y verificada»: el subconjunto CCD no tiene aval de autoridad y los 63 casos del banco siguen `draft`. |
| Pendiente técnico | Congelar exactamente el banco aceptado, resolver sus locators/hashes contra una release autorizada y ejecutar RAGAS sin tuning sobre el baseline. |
| Dependencia humana/institucional | Autoridad CCD para vigencia/pertinencia; dos revisores de dominio y árbitro; aprobación del protocolo y del juez. |
| Evidencia reproducible | [`eval/retrieval/results/k2-v1-2026-10-01.json`](../../eval/retrieval/results/k2-v1-2026-10-01.json), [`eval/rag-quality/README.md`](../../eval/rag-quality/README.md), [`eval/rag-quality/benchmark-v1.json`](../../eval/rag-quality/benchmark-v1.json), [`eval/oe6/results/oe6-docker-rag-2026-10-25.json`](../../eval/oe6/results/oe6-docker-rag-2026-10-25.json). |

## OE2

| Campo | Trazabilidad |
| --- | --- |
| Texto original | «Desarrollar los módulos de extracción y actualización automática de datos mediante técnicas de RPA ( Robotic Process Automation ) basados en web scraping periódico, para consolidar e integrar la información dispersa de la oferta académica, convocatorias y novedades del CCD en una base de datos relacional y vectorial.» |
| Actividades ejecutadas | Validación de manifiesto; preparación determinista; ingesta versionada; embeddings fuera de transacciones; publicación atómica; no-op `already_current`; adaptador HTTP interno; workflow N8N manual; contratos de retry/recover diseñados y probados en core. |
| Componentes | `backend/rag`, PostgreSQL/pgvector, workflow manual N8N, `eval/oe2` con tres fuentes fixture declaradas. |
| Entregables | Manifiestos sintético/CCD; servicio de ingesta; workflow manual; inventario de fuentes y fixtures; evidencia N3. |
| Pruebas/resultados | N3 real local: 18 archivos/76 items, 12 versiones, 60 chunks/embeddings, release `ready/current`; repetición `already_current` sin nueva publicación. OE2: 221 tests PASS y tres flujos fixture ejecutables. |
| Targets originales | Al menos tres flujos de scraping automáticos sin intervención durante pruebas; actualización <24 h desde la publicación de origen; extracción correcta >90 % sobre páginas objetivo. |
| Estado | **PARCIAL.** La ingesta/publicación es real y reusable; los tres orígenes son fixtures, no sitios institucionales, y no hay scraping periódico ni reloj de frescura contra una publicación CCD. |
| Pendiente técnico | Implementar solo el mecanismo de adquisición que se autorice; medir exactitud/frescura con denominador y reloj de origen; completar workflows retry/recover/scheduled si siguen en alcance. |
| Dependencia humana/institucional | Permiso explícito de adquisición/scraping o entrega; URLs/export/API y autoridad por fuente; cadencia y política de cambios. |
| Evidencia reproducible | [`eval/ingestion/results/n3-n8n-e2e-2026-10-02.md`](../../eval/ingestion/results/n3-n8n-e2e-2026-10-02.md), [`eval/oe2/README.md`](../../eval/oe2/README.md), [`docs/transition/oe2-checkpoint-2026-10-24.md`](../transition/oe2-checkpoint-2026-10-24.md). |

## OE3

| Campo | Trazabilidad |
| --- | --- |
| Texto original | «Diseñar y construir el núcleo de procesamiento e inteligencia artificial bajo un enfoque agéntico ( Agentic AI ), implementando la arquitectura RAG mediante el almacenamiento de embeddings en pgvector y la estandarización de herramientas de consulta a través del protocolo MCP ( Model Context Protocol ).» |
| Actividades ejecutadas | Catálogo de seis tools read-only; servidor MCP stdio; cliente MCP en API; planificador determinista por consulta; límites de pasos/calls/bytes/tiempo; coherencia de release; citas/trazas; errores saneados. |
| Componentes | `backend/api/src/agent`, `backend/mcp-server`, servicios de aplicación, PostgreSQL/pgvector y Ollama para `search_knowledge`. |
| Entregables | Contrato MCP congelado; servidor operativo; agente acotado; pruebas unitarias/integradas y runner real de seis tools. |
| Pruebas/resultados | API 614/614 en checkpoint OE3 y 620/620 tras OE4; MCP 24/24; OE6 real 6/6 tools; API→N8N→agente→MCP→PostgreSQL 10/10 PASS. |
| Targets originales | Agente con ciclo ReAct y servidor/interfaces MCP operativos; coherencia y selección multietapa sobre casos reales. El anteproyecto no fija un porcentaje numérico para esta selección. |
| Estado | **PARCIAL.** MCP está operativo y el agente ejecuta planes cerrados, pero la selección es determinista por reglas. No existe un LLM que razone/actúe/observe iterativamente ni evaluación humana de sus decisiones; llamarlo ReAct sería incorrecto. |
| Pendiente técnico | Si el director conserva ReAct: especificar toolset/casos/permisos, implementar ciclo LLM gobernado y evaluar selección, argumentos, seguridad y resultado. Si se acepta el agente determinista, modificar el alcance por la vía académica, no por documentación técnica. |
| Dependencia humana/institucional | Decisión del director sobre ReAct; casos multietapa reales y permisos de cada tool; revisión de seguridad/resultado. |
| Evidencia reproducible | [`docs/transition/banuchat-oe3-checkpoint.md`](../transition/banuchat-oe3-checkpoint.md), [`eval/oe6/results/oe6-mcp-real-2026-10-25.json`](../../eval/oe6/results/oe6-mcp-real-2026-10-25.json), [`eval/oe6/results/oe6-concurrency-summary-2026-10-25.json`](../../eval/oe6/results/oe6-concurrency-summary-2026-10-25.json). |

## OE4

| Campo | Trazabilidad |
| --- | --- |
| Texto original | «Orquestar la lógica de interacción, los flujos conversacionales y el cumplimiento de las directrices institucionales bajo principios de BPM ( Business Process Management ) mediante la plataforma N8N, integrando el agente inteligente con los canales de datos estructurados y no estructurados.» |
| Actividades ejecutadas | Webhook conversacional interno correlacionado; N8N antes del agente solo en fallback multifuente sintético; calendario por release con altas/modificaciones/cancelaciones/eliminaciones; idempotencia `unchanged`; rutas REST de consulta. |
| Componentes | N8N 2.40.5, API, agente/MCP, PostgreSQL y servicio calendario de `backend/rag`. |
| Entregables | Workflow conversacional; workflow/calendario local; fixture `calendar-sheet.json`; trazas y evidencia OE4/OE6. |
| Pruebas/resultados | N8N/MCP real 10/10, media 2.635,5 ms en OE6 original; calendario real local `unchanged` en 263 ms; 21 eventos y release íntegra; concurrencia Docker 1/2/5 sin errores. |
| Targets originales | Integración con Google Sheets/calendario; sincronización ≤30 min desde la fuente; sin pérdida/corrupción; 100 % de flujos documentados. |
| Estado | **PARCIAL.** N8N participa realmente en un camino conversacional acotado. El calendario proviene de un fixture versionado que representa filas: no es una hoja Google real, no hay credencial ni reloj fuente→release y no se han validado directrices institucionales generales. |
| Pendiente técnico | Conectar solo una fuente autorizada; medir sincronización extremo a extremo; definir/ejecutar el catálogo cerrado de flujos BPM que permanezca en alcance. |
| Dependencia humana/institucional | Decisión sobre Google Sheets como fuente; propietario de hoja/credencial; reglas institucionales y autoridad de cambios. |
| Evidencia reproducible | [`docs/transition/banuchat-oe4-checkpoint.md`](../transition/banuchat-oe4-checkpoint.md), [`eval/oe4/results/oe4-local-evidence-2026-10-24.json`](../../eval/oe4/results/oe4-local-evidence-2026-10-24.json), [`eval/oe4/fixtures/calendar-sheet.json`](../../eval/oe4/fixtures/calendar-sheet.json). |

## OE5

| Campo | Trazabilidad |
| --- | --- |
| Texto original | «Desarrollar la interfaz móvil del sistema Route AI utilizando el framework React Native, garantizando una experiencia de usuario intuitiva, accesible y optimizada para la consulta de la ruta académica por parte de los estudiantes.» El nombre citado es histórico; el producto vigente es BanuChat. |
| Actividades ejecutadas | Expo/React Native/TypeScript; login propio sintético y CCD autenticado separados; sesión/refresh/logout; chat/citas/artefactos/historial; calendario/progreso/anuncios sintéticos; recordatorios locales; guards de navegación; protocolos físico/SUS. |
| Componentes | `mobile` en Expo SDK 57, REST v2 autenticado, SecureStore y notificaciones locales Expo. |
| Entregables | Aplicación móvil; servicios REST; pruebas locales; plan de dispositivos; protocolo de cinco tareas y SUS. |
| Pruebas/resultados | Typecheck PASS; lint PASS; 38/38 pruebas; Expo Doctor 21/21; export Android/iOS/Web PASS; API CCD autenticada PASS. No hubo Android/iOS físico en OE5/OE6. |
| Targets originales | Mínimo 10 estudiantes reales UNAB de programas distintos; cinco tareas con completación >85 %; SUS medio >70; ningún SUS individual <50; funciones móviles comprometidas, incluido push si se conserva. |
| Estado | **PARCIAL.** La UI y sus recorridos principales están implementados, pero no se ha demostrado intuitividad/accesibilidad con la población objetivo. Los recordatorios actuales son locales; no equivalen a push remoto FCM/APNs. Un bundle iOS no equivale a iPhone/iPad físico. |
| Pendiente técnico | Validación Android/iOS físico, TalkBack/VoiceOver y, si sigue en alcance, contrato backend de dispositivos, credenciales y revocación para push remoto. |
| Dependencia humana/institucional | Aprobación ética/académica; reclutamiento y consentimiento; teléfonos Android/iOS y firma; credenciales FCM/APNs; moderador/observador. |
| Evidencia reproducible | [`docs/transition/banuchat-oe5-checkpoint.md`](../transition/banuchat-oe5-checkpoint.md), [`eval/mobile/oe5-student-validation-protocol.md`](../../eval/mobile/oe5-student-validation-protocol.md), [`eval/mobile/oe5-device-validation-plan.md`](../../eval/mobile/oe5-device-validation-plan.md). |

## OE6

| Campo | Trazabilidad |
| --- | --- |
| Texto original | «Desplegar la solución informática bajo un modelo On-Premise utilizando la infraestructura de servidores proporcionada por la universidad mediante contenedores Docker, y evaluar su desempeño integral mediante pruebas de integración, métricas de precisión en recuperación de información y pruebas de usabilidad con usuarios reales de la comunidad estudiantil UNAB.» |
| Actividades ejecutadas | Imagen/Compose local; identidades/secretos fuera de Git; E2E API/MCP/N8N/RAG; inyección de fallos; backup/restore; Docker Ollama GPU con volumen dedicado; warm-up; concurrencia 1/2/5; manuales y transferencia. |
| Componentes | Docker Desktop/Compose, API, PostgreSQL/pgvector, Ollama, N8N, MCP y runners `eval/oe6`. |
| Entregables | Compose/perfiles; Dockerfile; manual OE6; runners/evidencias; checkpoint; procedimiento de demo y paquete de validación final. |
| Pruebas/resultados | Docker warm J1 PASS: consulta documental vectorial vía agente/MCP en 16.049 ms con cita/historial tras warm-up; frío: 503 seguro porque carga de embedding 31.062 ms excede timeout MCP 15 s. El runner conserva la etiqueta histórica `document_rag`, pero esa rama sintética no invoca generación LLM directa. Rendimiento caliente: 90 turnos, 0 errores/timeouts/>5 s; a concurrencia 5, medias fast/documental/N8N-MCP = 29,7/3.998,4/3.675,7 ms. Restore 16/16 huellas; fallo N8N 503 y recuperación 10,174 s. |
| Targets originales | Infraestructura On-Premise UNAB; respuesta promedio ≤5 s con frontera definida; sin interrupciones no planificadas >5 min; precisión y usabilidad integral con usuarios reales. |
| Estado | **PARCIAL.** El despliegue local Docker es funcional y medido, pero Docker Desktop no es un servidor UNAB. La corrida caliente no acredita cold-start SLA, soak, operación institucional ni usuarios reales. |
| Pendiente técnico | Resolver warm-up/ready gate en la recepción; TLS/DNS/firewall/observabilidad; repetir baseline en hardware receptor; soak y ventana de disponibilidad aprobados; ejecutar paquetes OE1/OE5. |
| Dependencia humana/institucional | Servidor y operador UNAB; seguridad/red/TLS; aceptación de capacidad/SLA; participantes y autoridad documental. |
| Evidencia reproducible | [`eval/oe6/results/oe6-docker-rag-2026-10-25.json`](../../eval/oe6/results/oe6-docker-rag-2026-10-25.json), [`eval/oe6/results/oe6-concurrency-summary-2026-10-25.json`](../../eval/oe6/results/oe6-concurrency-summary-2026-10-25.json), [`eval/oe6/results/oe6-stability-2026-10-25.json`](../../eval/oe6/results/oe6-stability-2026-10-25.json), [`eval/oe6/results/oe6-backup-restore-2026-10-25.json`](../../eval/oe6/results/oe6-backup-restore-2026-10-25.json). |

## Separaciones que no pueden colapsarse

| Evidencia existente | No equivale a |
| --- | --- |
| Fixtures sintéticos y corpus CCD seleccionado | Fuente institucional vigente, completa o avalada por CCD |
| Agente determinista + MCP real | ReAct gobernado por LLM |
| `calendar-sheet.json` y release local | Google Sheets real ni sincronización ≤30 min |
| Recordatorios locales Expo | Push remoto FCM/APNs |
| Docker Desktop local | Infraestructura On-Premise UNAB |
| Export/bundle Android/iOS | Ejecución en dispositivo físico |
| 38 tests y recorridos del equipo | SUS o completación con estudiantes |
| Calibración técnica 12 casos | RAGAS final con gold humano autorizado |
