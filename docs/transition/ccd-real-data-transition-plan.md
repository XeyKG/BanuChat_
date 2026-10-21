# Plan de transición de BanuChat hacia fuentes reales del CCD

Actualización de estado BCH-03 incremento 1 (2026-10-21): Sala de Control autorizó
la preparación técnica local de M01/M12 según [ADR 0006](../adr/0006-corpus-ccd-seleccionado-local.md).
Esta excepción levanta el bloqueo técnico de preparación para ese subconjunto;
no acredita aval institucional, puertas académicas, carga PostgreSQL ni consultas.
El cuerpo T5 siguiente se conserva como antecedente. El estado ejecutado está en
[el checkpoint del incremento](bch03-increment-1-checkpoint.md).

Documento T5 de planificación · 2026-10-16 · Estado: propuesta condicionada, sin autorización de implementación.

Baseline inspeccionado: `7eaaa463084745e8b1639b8d304c61456ab5ad93`. El HEAD coincide con el solicitado y el árbol de trabajo estaba limpio. Este documento no acredita ejecución institucional ni modifica los compromisos académicos.

## 1. Objetivo

Definir cómo evolucionar las capacidades documentales y estructuradas de BanuChat hacia fuentes reales del CCD, conservando los patrones probados y revisando las representaciones que dependen del dominio sintético. La transición empieza por confirmar fuentes y significado; no por reemplazar valores de los archivos existentes.

**Información real** es contenido originado en la operación institucional, con alcance y vigencia identificables. **Fuente autoritativa** es aquella cuya competencia para declarar un dato concreto ha sido confirmada: la autoridad sobre una norma no implica autoridad sobre cupos o progreso individual. **Acceso autorizado** es permiso verificable para operaciones concretas —consultar, extraer, almacenar, transformar, vectorizar, mostrar y evaluar—, con límites y duración conocidos. Publicación pública y posesión de una copia no prueban todos esos permisos.

Se pretende migrar, por capacidades y fuentes aceptadas, la consulta documental, el catálogo/oferta, el calendario y los anuncios que realmente correspondan al dominio confirmado. Identidad, progreso e historial personales son una decisión separada. No se pretende migrar automáticamente los datos ficticios, conservar todas sus entidades, desplegar en infraestructura institucional ni implantar todas las tecnologías históricas por inercia.

Antes de integrar se requieren autoridad, permisos, dominio mapeado, revisión contractual, representación aceptada, alcance académico resuelto y autorización expresa de la tarea de implementación. El prototipo sintético conserva su valor de desarrollo, demostración, regresión y evidencia histórica.

Este documento **no autoriza acceso ni integración**, no modifica el anteproyecto, no sustituye decisiones del director y no es un diseño físico de base de datos.

Las cinco categorías de evidencia se mantienen separadas:

| Categoría | Fuente de referencia | Qué permite afirmar |
| --- | --- | --- |
| PROTOTIPO ACTUAL | [README](../../README.md), [arquitectura](../arquitectura.md), [API](../../backend/api/README.md), [RAG/ingesta](../../backend/rag/README.md), [Mobile](../../mobile/README.md), [MCP](../../backend/mcp-server/README.md) | Implementación y evidencia local descritas en el repositorio; no validación institucional. |
| ANTEPROYECTO HISTÓRICO COTEJADO | [A4.1](../academic/anteproyecto-reconciliation-matrix.md) | Compromisos comprobados mediante lectura de las 27 páginas originales; no son reconstrucciones provisionales. |
| DISCOVERY CCD | [C1: inventario y matriz](../discovery/ccd-information-matrix.md), [D3: modelo conceptual](../discovery/ccd-conceptual-domain-model.md) | Hipótesis y conocimiento público preliminar; no fuentes aceptadas ni contratos de integración. |
| INFORMACIÓN INSTITUCIONAL PENDIENTE | Entregas y confirmaciones aún requeridas en C1/D3 | Disponibilidad, autoridad, permisos, reglas, identificadores, vigencia y mecanismos de acceso pendientes. |
| DECISIONES ACADÉMICAS | A4.1 y futura conversación con director/proceso correspondiente | Cambios de alcance por resolver. Un ADR técnico no acredita aprobación académica. |

El [rebaseline](../academic/banuchat-rebaseline-2026-10.md) delimita las pausas. Completan la base leída [ADR 0001](../adr/0001-alcance-sintetico-y-despliegue-local.md), [ADR 0003](../adr/0003-embedding-local-qwen3.md), [ADR 0004](../adr/0004-enrutamiento-determinista-intenciones.md), [ADR 0005](../adr/0005-ingesta-reproducible-n8n.md), [evaluación](../../eval/README.md) y [M9](../../eval/rag-quality/README.md). No se encontraron ausencias entre las lecturas obligatorias. No se consultaron sitios ni sistemas institucionales.

## 2. Estado inicial

Flujo implementado: Mobile Expo/React Native → REST → Intent Router determinista → servicios/fast paths, renderers estáticos o Document RAG directo → PostgreSQL/pgvector/Ollama. N8N orquesta ingesta asíncrona respecto de las consultas. El nombre interno `agent_fallback` no significa que exista un agente.

`IMPLEMENTED` describe existencia; `PARTIALLY_VALIDATED` describe validación acotada. `PENDING` indica capacidad no implementada; `FUTURE_TARGET` expresa arquitectura objetivo. Ninguno acredita cumplimiento de un OE.

| Componente | Estado | Nivel de validación | Dependencia del dataset sintético | Reutilización probable | Dependencia de discovery |
| --- | --- | --- | --- | --- | --- |
| Mobile | IMPLEMENTED | PARTIALLY_VALIDATED: evidencias móviles locales; no estudio UX institucional | Etiquetas, perfiles y vistas de dominio | Navegación, chat, estados y consumo REST | Semántica de vistas, acceso y documentos |
| REST | IMPLEMENTED | PARTIALLY_VALIDATED: contratos/integración local | Payloads y servicios actuales | Frontera Mobile/backend | Compatibilidad semántica y autorización |
| Intent Router | IMPLEMENTED | PARTIALLY_VALIDATED: casos sintéticos y negativos reservados acotados | Vocabulario, entidades y fixtures | Política determinista conservadora | Preguntas reales y ambigüedad |
| Application services | IMPLEMENTED | PARTIALLY_VALIDATED: pruebas por componente | SQL y reglas de v1 | Separación de responsabilidades | Reglas reales y temporalidad |
| Fast paths | IMPLEMENTED | PARTIALLY_VALIDATED: cinco categorías | Cursos, progreso, calendario, anuncios y lookup v1 | Consulta estructurada y renderizado | Correspondencias reales |
| Document RAG | IMPLEMENTED | PARTIALLY_VALIDATED: retrieval/generación local sintética | Corpus, chunks, gold y prompts | Flujo de recuperación, generación y abstención | Autoridad, formatos, permisos y preguntas |
| Document lookup | IMPLEMENTED | PARTIALLY_VALIDATED: resolución/citas/artefacto local | Títulos y artefactos Markdown | Acceso directo a documento identificado | Identidad, formato y permiso de lectura |
| pgvector | IMPLEMENTED | PARTIALLY_VALIDATED: búsqueda exacta local | Vectores de corpus v1 | Capacidad vectorial si sigue justificada | Volumen medido, permisos y evaluación |
| PostgreSQL | IMPLEMENTED | PARTIALLY_VALIDATED: persistencia/integración local | Modelo relacional sintético | Transacciones, relaciones, releases | Modelo y reglas de almacenamiento |
| Ingesta | IMPLEMENTED | PARTIALLY_VALIDATED: core, DB y N3 con alcances distintos | Validación y formato v1 fuertemente acoplados | Invariantes de publicación/versionado | Extractores, acceso, aceptación y actualización |
| N8N | IMPLEMENTED | PARTIALLY_VALIDATED: ejecución manual local N3 | Fuente Git sintética y runner actual | Orquestación externa al core | Mecanismo y frecuencia reales |
| Documentos | IMPLEMENTED | PARTIALLY_VALIDATED: 12 sintéticos | Contenido y estructura inventados | Identidad/versiones/tipos | Autoridad y política documental |
| Citas | IMPLEMENTED | PARTIALLY_VALIDATED: persistencia y paridad local | Identificadores de documento/versión/chunk | Vinculación respuesta-evidencia | Localizadores reales y acceso al artefacto |
| Procedencia | IMPLEMENTED | PARTIALLY_VALIDATED: hashes/release/source-runtime | Fuente Git y manifest v1 | Trazabilidad reproducible | Autoridad, vigencia, adquisición y permisos |
| Evaluación | PARTIALLY_VALIDATED | Evidencias heterogéneas; M9 draft; sin RAGAS final/UX institucional | Casos y corpus sintéticos | Protocolos/harness revisados | Corpus, gold, usuarios y entorno |
| Perfiles | IMPLEMENTED | PARTIALLY_VALIDATED: selección sintética | Cuatro perfiles; no autenticación | Demo y reglas de prueba | Si habrá identidad real y para qué |
| Calendario | IMPLEMENTED | PARTIALLY_VALIDATED: eventos sintéticos | 22 eventos; no integración Sheets | Vista y consultas por fechas | Oferta, sesiones, plazos y zona horaria |
| Progreso | IMPLEMENTED | PARTIALLY_VALIDATED: asociaciones sintéticas | 18 asociaciones; estados/porcentajes ficticios | Fixture; UI condicionada | Definición de avance/cumplimiento |
| Anuncios | IMPLEMENTED | PARTIALLY_VALIDATED: ocho sintéticos | Publicaciones v1 | Lista y presentación | Convocatorias, estados y vigencia |
| MCP | PENDING | Contratos, sin servidor productivo integrado | Seis tools contractuales sintéticas | Contratos como hipótesis de frontera | Operaciones reales e interoperabilidad |
| Agent/ReAct | FUTURE_TARGET | PENDING: no integrado al fallback | Herramientas futuras no confirmadas | Separación futura detrás del backend | Selección dinámica y alcance OE3 |
| Docker | IMPLEMENTED | PARTIALLY_VALIDATED: servicios locales | Entorno de desarrollo | Aislamiento y reproducción local | Infraestructura objetivo y operación |

El corpus funcional v1 conserva 18 archivos y 76 ítems: 12 documentos, 12 cursos, 22 eventos, ocho anuncios, cuatro perfiles y 18 asociaciones de progreso. Diez documentos producen 60 chunks; dos `full_document` no se vectorizan. Los números son inventario sintético, no tamaño del CCD.

No hay integración institucional real, autenticación institucional, despliegue UNAB acreditado ni scraping real del CCD en este baseline. C1 menciona sistemas institucionales como conocimiento preliminar; no acredita APIs utilizables. Docker Compose local no despliega por sí solo backend, Mobile y Ollama como servicio institucional.

## 3. Principios de transición

### 3.1 No sustituir datos a ciegas

Fuente → significado → autoridad → permisos → modelo conceptual → compatibilidad → impacto contractual → representación → plan de migración. Solo después proceden persistencia, ingesta, API, consultas, RAG y evaluación. El dominio real no se deforma para pasar validadores v1.

### 3.2 Preservar contratos cuando tenga sentido

Conservar REST/Mobile si un adapter representa fielmente el dominio. Si pierde información esencial o induce respuestas falsas, registrar el cambio y obtener autorización sobre el contrato congelado antes de implementarlo.

### 3.3 Procedencia obligatoria

Cada dato servido debe identificar fuente, versión, fecha desde la que aplica, momento de obtención y autoridad. También debe permitir verificar permiso de uso y límites de vigencia. Un hash acredita integridad; no autoridad ni actualidad.

### 3.4 Migración incremental

Aceptar y validar una capacidad/fuente por vez en un entorno separado. No mezclar implícitamente releases sintéticos y reales para completar respuestas.

### 3.5 Separación structured/documental

Oferta, fechas y estados confirmados estructurados se consultan como datos. RAG se reserva a preguntas documentales donde aporta recuperación contextual. Un PDF con tablas no convierte automáticamente la oferta en conocimiento apto para RAG.

### 3.6 Datos personales fuera del primer paso

Identidad, historial y progreso requieren alcance, autorización y controles explícitos antes de obtener datos protegidos, incluso en discovery. T9 separa su implementación; no posterga la obligación de permiso hasta después de copiarlos.

### 3.7 Evaluación posterior al corpus

Preparar el protocolo temprano; congelar corpus y benchmark final tras estabilizar representación y gold. Reservar desde el alcance el trabajo de evaluación, sin expandir M9 sintético ahora.

### 3.8 Modelo de datos != tecnología de base de datos

Un modelo v1 incompatible puede reemplazarse manteniendo PostgreSQL. La elección del motor necesita razones propias: restricciones, capacidades, operación y evidencia.

### 3.9 Compromiso académico != necesidad técnica

La necesidad se demuestra con el problema y las fuentes. Cambiar un compromiso explícito exige `NEEDS_DIRECTOR_APPROVAL` y, cuando corresponda, confirmación del proceso académico. La recomendación de este documento no sustituye esa decisión.

## 4. Clasificación del trabajo existente

Las clasificaciones son recomendaciones para una tarea futura autorizada. `REUSE_AS_IS` se limita al alcance indicado; no promete compatibilidad integral.

| Componente actual | Clasificación | Justificación | Acción futura | Dependencia | Impacto académico |
| --- | --- | --- | --- | --- | --- |
| Mobile | REUSE_WITH_ADAPTER | Separación REST; vistas ligadas al dominio | Adaptar contenido/permisos tras contrato | G3–G4 | OE5; recortes necesitan aprobación |
| REST contract | REUSE_WITH_ADAPTER | Frontera útil; semántica aún no contrastada | Conservar lo compatible; documentar deltas | G4 | No prueba identidad con arquitectura histórica |
| Intent Router | REFACTOR_AFTER_DISCOVERY | Reglas/vocabulario sintéticos | Revisar cobertura y ambigüedad con casos aceptados | G3 | No sustituye automáticamente OE3 |
| Fast paths | REFACTOR_AFTER_DISCOVERY | Patrón válido; consultas v1 no universales | Mapear reglas y temporalidad | G3–G5 | OE4: datos estructurados |
| Document RAG | REUSE_WITH_ADAPTER | Pipeline probado solo localmente | Adaptar corpus/extracción/citas y evaluar | G1–G7 | OE1; no suficiencia académica actual |
| Document Lookup | REUSE_WITH_ADAPTER | Identificación y entrega directa útiles | Resolver formatos/identidad/lectura autorizada | G2–G4 | Coincide conceptualmente con guías históricas |
| PostgreSQL | REUSE_WITH_ADAPTER | Capacidades relacionales y transacciones | Revisar representación sin cambio de motor anticipado | G5 | Está explícito en OE1; sustituir requiere aprobación |
| pgvector | REUSE_WITH_ADAPTER | Retrieval exacto y release verificables | Reindexar corpus aceptado; evaluar necesidad | G6 | Sustituir compromiso vectorial requiere aprobación |
| Schemas actuales | REFACTOR_AFTER_DISCOVERY | Modelo/formato sintético; no contrato CCD | Proponer representación separada | G3–G5 | Evitar equivalencia ficticia con dominio real |
| Dataset sintético | KEEP_AS_TEST_FIXTURE | Baseline reproducible congelado | Preservar íntegro | Separación de entornos | No reemplaza corpus institucional de OE1 |
| Ingestion core | REFACTOR_AFTER_DISCOVERY | Invariantes útiles; parsers v1 rígidos | Separar fuentes/adapters de publicación | G2–G5 | Ingesta actual no acredita OE2 |
| N8N | REUSE_WITH_ADAPTER | Orquestación manual local acreditada | Justificar triggers y operación | Fuente y G0 | Rol conversacional histórico por resolver |
| Provenance | REUSE_WITH_ADAPTER | Hash/release/source-runtime reutilizables | Añadir autoridad/vigencia/permiso en diseño | G2–G5 | Apoya trazabilidad; no demuestra aprobación |
| Citations | REUSE_WITH_ADAPTER | Vinculación verificable a evidencia | Adaptar localizadores y control de acceso | G4 | Apoya verificabilidad de respuestas |
| Benchmark K2 | KEEP_AS_TEST_FIXTURE | Gold/retrieval exclusivamente sintéticos | Conservar resultado y revisar regresiones | Baseline intacto | No evaluación institucional |
| Benchmark M9 | KEEP_AS_TEST_FIXTURE | 63 candidatas draft | Conservar; revisar antes de usar como oracle | Protocolo y corpus | No benchmark final |
| Docker | REUSE_WITH_ADAPTER | Configuración local útil | Definir despliegue cuando exista destino | G0 y disponibilidad | No equivale a On-Premise UNAB |
| MCP contracts | REFACTOR_AFTER_DISCOVERY | Tools hipotéticas sobre v1 | Contrastar utilidad y permisos | G3–G4 | OE3 explícito; diferir/eliminar necesita aprobación |
| Agent/ReAct target | DEFER | Necesidad y tools reales sin confirmar | Decidir tras estabilizar dominio | G0–G4 | Si sale del proyecto: NEEDS_DIRECTOR_APPROVAL |
| Valores/contenido ficticios como corpus institucional | REPLACE | No son evidencia real | Usar fuentes aceptadas en entorno distinto | G1–G5 | OE1 exige documentos institucionales |
| Identificación universal de curso mediante NRC | REMOVE_CANDIDATE | D3 no confirma esa equivalencia | Descartar supuesto si CCD no lo valida | G3 | No es compromiso técnico implementado |
| Patrón de consulta directa full_document | REUSE_AS_IS, conceptual | Coincidencia explícita con A4.1 | Preservar no fragmentación/no vectorización cuando aplique | Clasificación documental | Continuidad histórica, no desviación |

### 4.1 Regla de reconciliación académica

A = compromiso histórico comprobado; B = implementación; C = necesidad del dominio; D = propuesta. Que C esté sin justificar no permite eliminar A.

| Elemento | A: compromiso | B: actual | C: necesidad real | D: propuesta condicionada |
| --- | --- | --- | --- | --- |
| RPA/scraping | OE2, tres flujos automáticos | No scraping institucional | Actualizar información; mecanismo pendiente | REPLACE_WITH_APPROVAL por export/API/entrega versionada si es mejor; NEEDS_DIRECTOR_APPROVAL |
| Agent/ReAct | OE3, selección dinámica multietapa | Fallback RAG directo | No demostrada aún | IMPLEMENT_IF_CONFIRMED tras dominio; si se difiere fuera del proyecto, DEFER_WITH_APPROVAL y NEEDS_DIRECTOR_APPROVAL |
| MCP | OE3, servidor/tools ejecutables | Contratos sin integración | Interoperabilidad no confirmada | IMPLEMENT_IF_CONFIRMED; diferir/eliminar: NEEDS_DIRECTOR_APPROVAL |
| BPM | OE4 y reglas institucionales | No proceso institucional validado | Estados/reglas por descubrir | IMPLEMENT_IF_CONFIRMED; si no existe proceso pertinente, REMOVE_WITH_APPROVAL y NEEDS_DIRECTOR_APPROVAL |
| N8N síncrono | OE4/arquitectura conversacional | Solo ingesta asíncrona local | Orquestación síncrona sin justificar | REPLACE_WITH_APPROVAL por backend actual si satisface necesidad; NEEDS_DIRECTOR_APPROVAL |
| Google Sheets | Resultado OE4, calendario | PostgreSQL sintético | Fuente maestra aún desconocida | REPLACE_WITH_APPROVAL si fuente oficial es otra; NEEDS_DIRECTOR_APPROVAL |
| Push | Resultado OE5 | No acreditado | Depende de eventos, usuarios y oportunidad | DEFER_WITH_APPROVAL en MVP propuesto; NEEDS_DIRECTOR_APPROVAL |
| On-Premise UNAB | OE6 | Docker local | Acceso, requisitos y operación pendientes | IMPLEMENT_IF_CONFIRMED; sustitución por local: REPLACE_WITH_APPROVAL y NEEDS_DIRECTOR_APPROVAL |

“No parece necesario” es una conclusión técnica condicionada. “Puede eliminarse del alcance” requiere decisión académica registrada; este plan no la concede.

## 5. Qué debe mantenerse del dataset sintético

/data/synthetic permanece intacto y congelado. Puede convivir con futuras fuentes reales como fixture de desarrollo, demo, fallback **solo para desarrollo local expresamente sintético**, evidencia histórica y prueba de reproducibilidad. No será fallback silencioso ante indisponibilidad de una fuente real.

Las pruebas actuales de ingesta, servicios, routing, retrieval K2, generación, integración y Mobile dependen en distinta medida de sus identificadores, contenido, relaciones y versiones. M9 sigue siendo un conjunto draft, no una suite validada por conservarlo.

La convivencia futura deberá separar almacenamiento, configuración, identificadores de corpus/releases y evidencias de ejecución. Cada informe y respuesta experimental identificará el modo y la fuente. No se reutilizan IDs sintéticos para aparentar identidad institucional ni se incorporan exports reales a v1. La capacidad multidataset no existe acreditada hoy; esta separación necesita diseño posterior.

Modificar v1 rompería la comparación con gold, hashes, chunks, casos y resultados registrados. Preservar el baseline permite reproducir el experimento histórico; no hace comparables las métricas agregadas de corpus diferentes.

## 6. Source Acceptance — puerta de entrada de una fuente real

Proceso propuesto por fuente y uso, sin tablas SQL ni procedimientos institucionales inventados. C1/D3 no acreditan que alguna fuente ya haya superado este proceso.

| Aspecto | Evidencia de aceptación requerida |
| --- | --- |
| Responsable/autoridad institucional | Confirmación de CCD sobre quién puede validar el uso; identidad del responsable aún UNRESOLVED |
| Autoridad del contenido | Qué afirmaciones puede resolver la fuente y cómo se dirimen discrepancias |
| Formato | Muestra autorizada y estructura, campos/páginas, codificación y anexos pertinentes |
| Mecanismo de acceso | Entrega, export o API efectivamente disponible; credenciales solo por canal autorizado |
| Frecuencia de actualización | Cadencia, disparadores y tolerancia a desactualización acordados |
| Sensibilidad | Separación pública, restringida y personal, confirmada para cada contenido |
| Términos/permisos | Operaciones permitidas, destinatarios, duración y revocación |
| Versión | Identificador de edición/snapshot y huella verificable cuando se permita |
| Vigencia | Inicio/fin de aplicación y relación con versiones sustituidas |
| Identificador estable | Clave confirmada en su contexto; no presumir unicidad global de NRC |
| Reproducibilidad | Snapshot autorizado o evidencia de consulta suficiente para el alcance evaluable |
| Manejo de cambios | Detección, revisión, compatibilidad y decisión de publicación |
| Copia local | Permiso separado para original, derivado, vector, caché y respaldos |
| Anonimización/minimización | Campos necesarios, transformaciones y límites de conservación definidos |
| Indisponibilidad | Abstención, aviso de vigencia o uso de snapshot todavía autorizado; nunca inventar actualidad |

| Estado conceptual | Entrada/salida verificable |
| --- | --- |
| DISCOVERED | Fuente candidata inventariada sin copiar contenido restringido |
| AUTHORITY_CONFIRMED | CCD confirma competencia y alcance de la fuente |
| ACCESS_APPROVED | Permiso documentado para los usos previstos, incluido almacenamiento/vectorización si aplica |
| MAPPED | Conceptos, reglas, temporalidad y límites contrastados con D3 |
| INGESTION_READY | Representación, extractores propuestos, validación, permisos y actualización revisados |
| VALIDATED | Una implementación futura acredita extracción, fidelidad, trazabilidad y comportamiento autorizado |

Pasar un estado no acepta todas las fuentes del mismo sistema. Cambio de permisos, formato o autoridad obliga a revisar la aceptación. Revocación o expiración impide nuevas consultas y reutilización de copias afectadas según el alcance del permiso; la política concreta de conservación/supresión queda pendiente. No se recopilan datos personales para completar esta ficha sin autorización previa.

## 7. Clasificación de fuentes

| Tipo | Ejemplos candidatos, no confirmados | Tratamiento probable | Condición específica |
| --- | --- | --- | --- |
| A — referencia relativamente estable | Normas, lineamientos, procedimientos, guías | DOCUMENT_RAG o DOCUMENT_LOOKUP | Autoridad, edición, vigencia y clasificación documental; guía completa cuando corresponda |
| B — información dinámica estructurada | Oferta, NRC, horarios, convocatorias, calendario | STRUCTURED_QUERY | Claves contextualizadas, estados, periodos y actualización verificables |
| C — información personal | Progreso, historial, cumplimiento individual | AUTHENTICATED_STRUCTURED_QUERY | Alcance aprobado, identidad verificada, autorización por sujeto y minimización |
| D — no autorizada/no disponible | Fuente sin permiso, autoridad o acceso suficiente | UNRESOLVED u OUT_OF_SCOPE | Abstenerse; nunca completar con fixtures ni aparentar acceso |

Una misma fuente puede contener tipos diferentes. La clasificación se aplica al contenido y uso, no solo a la extensión del archivo.

## 8. Fases de transición

“Documento T5” es esta tarea de planificación. Los IDs `PHASE T0` a `PHASE T10` nombran trabajo futuro; PHASE T5 no se ejecuta al redactar este documento.

### PHASE T0 — Freeze

Objetivo: preservar baseline sintético. Salida: referencia al commit existente, documentación/resultados conservados y v1 intacto. No crear commit ni cambiar producto. El baseline identificado es evidencia suficiente de partida; no autoriza fases posteriores.

### PHASE T1 — Source Discovery

Objetivo: confirmar inventario con CCD y alcance con director. Salida: fuentes candidatas con autoridad, mecanismos y permisos verificables mediante Source Acceptance. Gate: no continuar integración con fuente sin G1/G2.

### PHASE T2 — Domain Mapping

Objetivo: comparar conceptos sintéticos y reales aceptados. Salida: mapeo compatible/partial/incompatible/unknown con ejemplos permitidos, reglas y temporalidad. Gate: G3. No SQL.

### PHASE T3 — Contract Impact Analysis

Objetivo: revisar REST, Mobile, router, fast paths, citas, procedencia, lookup y MCP futuro. Salida: compatibilidad y deltas justificados para revisión G4. No modificar contratos durante el análisis.

### PHASE T4 — Dataset/Source v2 Design

Objetivo: definir representación y convivencia sin fabricar v2 ahora. Salida: qué reemplaza el corpus institucional, qué permanece sintético, snapshots permitidos, consultas en vivo y almacenamiento fuera de Git. Requiere fuentes, dominio y contratos analizados.

### PHASE T5 — Persistence Delta

Objetivo: identificar reutilización y capacidades de persistencia faltantes. Salida: impacto conceptual y plan de migración/compatibilidad, sin SQL en esta fase de análisis. G5 acepta la representación; la implementación SQL requiere además autorización expresa posterior.

### PHASE T6 — Ingestion Adaptation

Objetivo futuro: adaptar ingesta documental/estructurada, actualización, aprobación, procedencia, observabilidad, idempotencia y rollback. Salida: incremento acotado validado con fuente autorizada, conservando v1. Solo tras G0–G5 y tarea expresa; no presupone scraping.

### PHASE T7 — Structured Query Migration

Objetivo futuro: resolver primero los datos estructurados aceptados, como catálogo/oferta, NRC, calendario y convocatorias si existen. Salida: consultas verificadas contra fuente y semántica temporal, con abstención ante información no disponible.

### PHASE T8 — Real Document RAG

Objetivo futuro: adaptar extracción, clasificación, chunking y retrieval sobre documentos autorizados y estabilizados. Salida: corpus documentado/congelado G6 y benchmark preparado para G7. El análisis previo de chunking precede a congelar su representación; la evaluación final y el tuning no preceden a la línea base.

### PHASE T9 — Personal Data / Authentication

Fase opcional, solo con alcance y permisos explícitos. Salida: identidad, autorización, minimización y consultas personales comprobadas. Los permisos son condición previa a cualquier acceso, no un trabajo posterior a la ingesta. No es requisito para un MVP documental sin datos personales.

### PHASE T10 — Formal Evaluation

Objetivo: evaluar el alcance aprobado, separando retrieval, RAGAS, structured queries, UX/SUS, latencia e integración. Salida: resultados reproducibles, límites y comparación con metas acordadas. Requiere G6/G7 cuando aplique RAG y G8 para la evaluación correspondiente.

## 9. Gates de transición

Ningún gate institucional se presume satisfecho por esta tarea. Se revisan por fuente/capacidad; una capacidad aprobada no habilita otras. G0 no impide análisis documental seguro de discovery, pero sí comprometer implementación con un alcance académico sin resolver.

| Gate | Condición | Evidencia necesaria | Qué desbloquea | Qué NO puede hacerse antes | Responsable de decisión |
| --- | --- | --- | --- | --- | --- |
| G0 — alcance académico confirmado | Resolver compromisos y cambios propuestos | Decisión del director y trámite aplicable por confirmar | Implementación del alcance acordado | Declarar cambios de OE aprobados o empezar trabajo comprometido sin resolución | DIRECTOR; FACULTAD/PROCESO_ACADÉMICO |
| G1 — fuente autoritativa identificada | Autoridad por dato y vigencia | Confirmación CCD y origen/versiones | Mapeo sustentado | Usar fuente como verdad institucional | CCD |
| G2 — acceso autorizado | Permisos por operación/sensibilidad | Autorización y límites de uso/copia/evaluación | Obtener y procesar solo lo permitido | Descargar contenido restringido, vectorizar o integrar sin permiso | CCD; UNRESOLVED |
| G3 — dominio mapeado | Conceptos y reglas validados | Mapeo D3 contrastado, discrepancias resueltas | Análisis contractual definitivo | Traducir registros a entidades v1 a ciegas | EQUIPO; CCD |
| G4 — impacto contractual revisado | Compatibilidad o delta aceptado | Análisis REST/Mobile/citas/router/MCP y autorización del cambio congelado | Diseño de representación compatible | Romper o cambiar contratos congelados | EQUIPO; DIRECTOR |
| G5 — representación de datos aceptada | Persistencia, temporalidad, privacidad y procedencia resueltas | Diseño conceptual/lógico revisado y permisos de copia | Solicitar implementación acotada de persistencia/ingesta | SQL o importación productiva por inferencia | EQUIPO; CCD |
| G6 — corpus RAG congelado | Fuente/versión/representación estables y autorizadas | Manifest/snapshot permitido, clasificación, configuración y trazabilidad | Gold y benchmark final reproducibles | Evaluar corpus cambiante como baseline final | EQUIPO; CCD para vigencia/autoridad |
| G7 — benchmark congelado | Gold revisado, particiones y contaminación controladas | Protocolo, versiones, revisión humana y reserva protegida | Ejecución formal tras G8 | Ajustar casos para mejorar resultados y conservar etiqueta held-out | EQUIPO; DIRECTOR |
| G8 — evaluación autorizada | Diseño y acceso adecuados al estudio | Aprobación aplicable, consentimiento/participación cuando corresponda y plan operativo | Estudio/evaluación del alcance autorizado | Reclutar/usar datos personales o declarar estudio autorizado por el plan | DIRECTOR; CCD; FACULTAD/PROCESO_ACADÉMICO |

Los responsables son categorías de decisión, no asignaciones institucionales verificadas. Para T9, G2/G4/G5 incluyen identidad y autorización por usuario antes del primer acceso protegido; G8 no reemplaza esos controles.

## 10. Mapeo del dominio sintético al dominio real

D3 es un modelo conceptual candidato, no un schema aprobado. “partial” indica parecido conceptual con diferencias conocidas; “unknown” indica falta de evidencia de correspondencia. Ninguna fila acepta una fuente real.

| Actual | Real candidato | Compatibilidad | Acción | Riesgo | Dependencia |
| --- | --- | --- | --- | --- | --- |
| Synthetic courses | Curso estable, ruta y oferta por periodo | partial | Separar identidad del curso de su impartición; validar NRC contextual | Confundir curso/oferta; interpretar available como cupos | Catálogo/oferta y claves confirmadas |
| Synthetic calendar | Sesiones, ventanas, plazos y eventos derivados | partial | Determinar fuente maestra, temporalidad y relaciones | Duplicar eventos o dar horarios fuera de vigencia | Periodo, zona horaria y reglas CCD |
| Synthetic announcements | Publicación o convocatoria con ciclo propio | partial | Distinguir noticia de convocatoria/estado/plazo | Tratar anuncio como proceso completo | Fuentes y estados de convocatoria |
| Synthetic progress | Avance, cumplimiento, diagnóstico, homologación | unknown | Definir significado antes de mapear estados/porcentajes | Convertir porcentaje ficticio en certificación | Reglas, datos autorizados e identidad |
| Synthetic profiles | Persona autorizada o perfil demo | incompatible como identidad real; compatible como fixture | Mantener demo separada; no convertir selector en login | Suplantación o atribución de datos | Alcance personal y autorización |
| Synthetic documents | Documento institucional, edición y autoridad | partial | Reutilizar identidad/versionado; revisar formato y clasificación | Copiar vigencias o títulos como IDs universales | Fuente aceptada y permiso de copia |
| Synthetic chunks | Fragmentos derivados del documento aceptado | unknown | Analizar estructura real; mantenerlos como artefactos técnicos | Cortar reglas/tablas o perder contexto | Formato, preguntas y evaluación |
| Synthetic provenance | Fuente, adquisición, versión, vigencia y autoridad | partial | Ampliar trazabilidad más allá de Git/hash | Confundir integridad con validez institucional | Permisos y modelo de actualización |

`courses.status=available` no demuestra disponibilidad de cupos; el NRC no se presume único entre periodos o sistemas. Historial conversacional no equivale a historial académico. Los porcentajes y asociaciones sintéticas no son evidencia de requisitos de graduación, certificación o cumplimiento.

## 11. Estrategia para PostgreSQL

Recomendación: **LIKELY_REUSABLE**, con representación en **REVIEW_AFTER_DOMAIN**. PostgreSQL ya aporta transacciones, relaciones, versiones y consultas estructuradas; cambiar conceptos no exige cambiar motor. La adopción institucional y la capacidad para el volumen real no están acreditadas.

Podría conservar datos estructurados autorizados de catálogo/oferta, referencias documentales, versiones y procedencia; pgvector podría mantener representaciones vectoriales de documentos permitidos. No se diseñan tablas ni se prescribe que toda fuente tenga copia local.

La información personal no necesaria, credenciales de sistemas origen, exports sensibles completos o contenido cuyo permiso prohíba réplica no deben replicarse. Una fuente puede requerir consulta en vivo, un snapshot limitado o solo metadatos, según su autorización. La combinación tampoco está decidida.

**REPLACE_IF_REQUIRED** se activa únicamente si evidencia concreta demuestra incompatibilidad con restricciones institucionales, operación disponible, capacidades necesarias o condiciones de acceso. Primero se evalúa si basta un adapter o una representación diferente. Sustituir PostgreSQL/pgvector, explícitos en el anteproyecto, requiere **NEEDS_DIRECTOR_APPROVAL**, además del análisis técnico. No se recomienda hoy otro motor.

## 12. Estrategia para pgvector / RAG

Las etiquetas distinguen patrones de ejecución de artefactos y resultados. Reindexar significa generar representaciones del corpus autorizado; no implementar ahora índices aproximados ni reutilizar vectores sintéticos para documentos distintos.

| Elemento | Clasificación | Qué se conserva / qué se revisa después |
| --- | --- | --- |
| Embeddings actuales | PRESERVE_AS_REGRESSION; REQUIRES_NEW_CORPUS; REQUIRES_REINDEX | Vectores sintéticos ligados a su contenido/configuración; corpus real requiere sus propios vectores |
| qwen3-embedding:0.6b | REUSABLE_PIPELINE | Candidato inicial local por disponibilidad y evidencia; no se declara óptimo para CCD |
| 1024 dimensiones | REUSABLE_PIPELINE; REQUIRES_REINDEX si cambia configuración | Restricción actual explícita; cambio implica revisión autorizada de persistencia y nueva configuración |
| Cosine | REUSABLE_PIPELINE | Baseline candidato; verificar con corpus/gold, sin cambiar ahora |
| top_k=5 | PRESERVE_AS_REGRESSION; REQUIRES_NEW_BENCHMARK | Parámetro histórico, no óptimo institucional demostrado |
| Exact search | REUSABLE_PIPELINE | Inicio razonable por evidencia actual; medir volumen/latencia antes de discutir HNSW/IVFFlat |
| Prompt | REQUIRES_NEW_CORPUS; REQUIRES_NEW_BENCHMARK | Preservar versión histórica; revisar límites, abstención y citas con contenido real |
| Chunking | REQUIRES_NEW_CHUNKING_ANALYSIS | Regla actual por seis secciones H2 de Markdown sintético no generaliza a PDF/tablas/normas |
| K2 | PRESERVE_AS_REGRESSION; REQUIRES_NEW_BENCHMARK | Retrieval sintético conocido; no transferir su gold ni métricas como validación real |
| M9 | PRESERVE_AS_REGRESSION; REQUIRES_NEW_BENCHMARK | Conservar las 63 candidatas draft; potencial regresión tras revisión, no benchmark institucional |

Una configuración de embeddings por release sigue siendo un buen invariante. No mezclar modelos/dimensiones en un espacio de búsqueda. La receta y los digests registrados ayudan a reproducir, pero no demuestran qué modelo está activo hoy en una instancia no inspeccionada. No se ejecutó Ollama en T5.

La decisión sobre pgvector depende de que se mantenga una necesidad vectorial y de las restricciones/mediciones futuras. No se justifica sustituirlo ni agregar HNSW por un tamaño de corpus imaginado.

### 12.1 Full document

**REUSE_AS_IS conceptual** es una recomendación fuerte: las guías completas de consulta directa, sin fragmentación ni vectorización, ya figuraban en el anteproyecto cotejado por A4.1. No son una desviación nacida del prototipo.

La implementación requiere **REUSE_WITH_ADAPTER** si cambian formato, artefacto, permisos o localizadores. El visor/artefacto Markdown actual no acredita soporte PDF institucional. Una cita a documento completo no debe inventar un chunk: se conserva el patrón de referencia a documento/versión sin fragmento cuando corresponda. La clasificación deberá confirmarse para cada documento, no extenderse a todo archivo denominado “guía” sin revisión.

## 13. Estrategia del benchmark

M9 actual conserva **63 candidatas sintéticas draft** y permanece pausado. No se elimina ni se convierte en benchmark final institucional. Puede apoyar desarrollo, revisión del harness, práctica de anotación y evidencia metodológica; convertirse en regresión exige revisar sus expectativas antes de usarlas como oracle.

El benchmark futuro necesita fuentes reales aceptadas, preguntas pertinentes al dominio real, gold revisado, procedencia y revisión humana. “Preguntas reales” describe pertinencia y necesidades verificadas; no obliga a recopilar conversaciones personales. A4.1 confirma que las 50–80 preguntas históricas podían generarse sintéticamente **desde documentos institucionales**. Eso es distinto de evaluar documentos ficticios.

| Partición | Uso | Regla de contaminación |
| --- | --- | --- |
| development | Desarrollo, depuración y decisiones técnicas autorizadas | Visible; resultados no se presentan como prueba independiente final |
| primary | Baseline y evaluación principal con versión congelada | Registrar toda exposición y tuning posterior; si se usa para ajustar, deja de ser evaluación independiente |
| reserve | Comprobación reservada tras fijar decisiones | Fuera del repositorio/circuito de desarrollo; congelación y compromiso de integridad antes del baseline y del tuning; acceso controlado y uso registrado |

Se reutilizan metodológicamente procedencia por versión/localizador, separación corpus/gold/respuesta generada, revisión humana, hashes de congelación, registro de configuración, control de exposición y validación del juez. No se reutilizan automáticamente las 63 preguntas, sus respuestas ni sus cuotas como diseño final.

La reserva no se completa ni se expone ahora. Tampoco se generan M9 P-064+ ni casos “institucionales” inventados. Si cambia el corpus tras congelar gold, se versiona el conjunto afectado y se declara que la comparación ya no es sobre idéntica base.

## 14. Intent Router y fast paths

Se conserva como candidato el enrutamiento determinista y conservador. Un nombre similar de intent no demuestra semántica compatible. No se modifica el catálogo.

| Intent | Significado actual | Posible equivalente real | Dependencia | Riesgo | Acción recomendada |
| --- | --- | --- | --- | --- | --- |
| course_catalog | Catálogo general sintético | Catálogo de cursos; oferta solo si se distingue | Curso/ruta/oferta y fuente | Presentar catálogo como inscripción/cupos vigentes | Revisar servicio, lenguaje y campos tras G3/G4 |
| profile_progress | Progreso del perfil seleccionado | Avance/cumplimiento personal, si se autoriza | Definiciones e identidad/autorización | Exponer datos o afirmar cumplimiento incorrecto | Mantener fixture; dominio personal en T9 |
| calendar_events | Eventos sintéticos por filtros | Sesiones/plazos/eventos confirmados | Periodos, fechas y fuente maestra | Fecha obsoleta o relación errónea | Mapear temporalidad y vigencia antes de migrar |
| announcements | Anuncios sintéticos | Noticias o convocatorias aceptadas | Tipo/estado/plazo de publicación | Tratar convocatoria cerrada como abierta | Revisar reglas estructuradas |
| document_lookup | Documento por título canónico | Documento/edición identificable | Identidad, alias, permiso y artefacto | Resolver edición incorrecta o archivo restringido | Preservar lookup; revisar resolución/citas |
| basic_social | Respuesta social estática | Igual función conversacional | Tono y alcance del asistente | Atribuir autoridad institucional implícita | Revisar texto; poca dependencia del dominio |
| capabilities_help | Explica capacidades implementadas | Explica capacidades reales habilitadas | Alcance aprobado y modo | Prometer autenticación, trámites o integración inexistentes | Alinear texto con capacidades verificadas |
| known_out_of_scope | Rechazo conservador fuera de alcance | Límites del alcance real aprobado | Decisiones académicas/CCD | Rechazar lo incluido o admitir lo no autorizado | Revalidar reglas y casos frontera |
| agent_fallback | Document RAG directo, sin Agent | RAG documental; Agent solo si se confirma | Corpus y eventual OE3 | Responder sobre datos personales/dinámicos por fallback | Mantener controles/abstención; decidir Agent aparte |

No se proponen categorías nuevas en esta tarea. Cualquier futura categoría deberá tratarse primero como **DISCOVERY_CANDIDATE**, con preguntas y fuente que la justifiquen. El fallback no puede eludir autorización ni inventar disponibilidad. Los negativos sintéticos actuales no prueban cobertura de formulaciones reales.

## 15. Document RAG

Antes de reabrir trabajo hacen falta corpus real identificado, autoridad confirmada, permiso de lectura/copia/vectorización/evaluación, formatos conocidos, versiones y actualización definidas, contenido documental pertinente, gold revisable, juez seleccionado/validado y métricas con protocolo.

| Tratamiento | Trabajo actual |
| --- | --- |
| Se conserva | Separación retrieval/generación, configuración por release, citas, trazabilidad y manejo explícito de errores/abstención como patrones |
| Se repite | Extracción, fidelidad documental, cobertura de retrieval, respuesta sustentada, calidad de citas y latencia en el corpus/entorno real |
| No es válido como evidencia del dominio real | Gold, puntuaciones y afirmaciones de calidad derivadas exclusivamente del corpus ficticio |
| Permanece como regresión sintética | Casos históricos versionados y mecanismos de reproducibilidad; M9 requiere revisión por seguir draft |

Continuar tuning sintético con un objetivo final distinto puede optimizar la plantilla Markdown, vocabulario y preguntas inventadas, y consumir el tiempo de evaluación real. El resultado seguiría siendo evidencia sintética. Por ello no se cambian prompts, embeddings, chunking ni recuperación ahora.

El juez futuro deberá declarar modelo/versión, configuración, rúbrica, concordancia con revisión humana y límites; si implica un servicio externo, el permiso de compartir contenido debe resolverse antes. No se presume proveedor, coste ni autorización. Las métricas RAGAS no validan por sí solas consultas estructuradas, identidad o UX.

## 16. N8N e ingesta

La parte reutilizable es la separación entre orquestación y core TypeScript, la distinción source revision/implementation revision, validación previa, trazabilidad de contenido, publicación consistente y observabilidad por ejecución. N3 acredita un recorrido manual local sintético, no actualización institucional automática.

El core actual está ligado a v1: `validateSyntheticContent`, siete schemas, inventario/manifest, marcador sintético, UTF-8/LF, Markdown con H1 y seis H2 y excepciones `full_document`. Desactivar el perfil de conteos no lo convierte en importador general. El diseño actual tampoco acredita importación genérica PDF/Excel/HTML ni convivencia multidataset; existen acoplamientos al dataset actual y a la receta de release.

La transición debe revisar el límite de adquisición/extracción y la representación antes de adaptar el core. Mantener invariantes útiles no significa exigir que un documento real incluya el marcador sintético ni alojar originales restringidos en Git.

| Capacidad | Reutilización probable | Dependencia de fuente/operación |
| --- | --- | --- |
| Preflight y validación | Patrón de rechazo previo y diagnósticos seguros | Reglas de formato, autoridad, permisos y calidad reales |
| Versionado e idempotencia | Identidad fuente/runtime y publicación consistente | Snapshot, identificadores y cambios; no prometer exactly-once |
| Procesamiento documental/estructurado | Separación de etapas | Extractores y reglas reales; no mover negocio a N8N |
| Actualización/aprobación | Flujo explícito antes de publicar | Quién valida, cadencia y política de vigencia pendientes |
| Observabilidad | Estado/resumen de ejecución sin secretos | Evidencia suficiente, errores seguros y límites de conservación |
| Rollback | Preservar baseline y publicación anterior como principio | Recuperación compatible y autorizada; no asumir reactivación automática |
| N8N | Disparar y observar ejecuciones | Aporta valor si hay coordinación/cadencia real; retries/scheduling no acreditados |

El core podría ejecutarse manualmente sin N8N para una entrega versionada autorizada. N8N aporta valor cuando se confirman disparadores, varias etapas, notificaciones operativas o coordinación externa, con reglas dentro del core. Esa simplificación técnica no elimina el compromiso histórico de N8N/BPM conversacional: **NEEDS_DIRECTOR_APPROVAL** si se propone sustituirlo.

### 16.1 RPA / scraping / N8N / BPM

Necesidad: mantener información vigente. Mecanismo histórico: RPA/web scraping y N8N/BPM, incluidos tres flujos automáticos y N8N en conversación. Mecanismo actual: ingesta reproducible TypeScript orquestada manualmente por N8N fuera del camino síncrono. No son equivalentes.

| Disponibilidad de fuente | Recomendación técnica condicionada | Consecuencia académica |
| --- | --- | --- |
| A. Export/API oficial | Preferir mecanismo autoritativo autorizado si ofrece datos suficientes y trazables; API no se presume disponible | Sustituir tres flujos de scraping: NEEDS_DIRECTOR_APPROVAL |
| B. Publicación web como única fuente | Evaluar autoridad, permiso de extracción/copia, estabilidad, versionado y errores antes de considerar scraping | Puede conservar OE2 si satisface su alcance; un scraper no acredita tres flujos ni >90 % de extracción |
| C. Entrega manual/versionada CCD | Automatizar validación/procesamiento posterior cuando se autorice; la adquisición sigue manual | Cambia ausencia de intervención y actualización desde publicación web: NEEDS_DIRECTOR_APPROVAL |

No llamar RPA a cualquier ingesta ni BPM a cualquier workflow. Posibles procesos a investigar son validación/publicación de información o atención/escalamiento de consultas, pero no están confirmados como procesos del CCD. BPM solo tendría justificación si se identifican participantes, estados, reglas, decisiones, excepciones y resultados de negocio reales. Un pipeline técnico con nodos N8N no basta.

Si no aparece un proceso de negocio pertinente, proponer reducir o sustituir BPM, con **NEEDS_DIRECTOR_APPROVAL**. La disciplina no se demuestra renombrando jobs existentes. La meta de actualidad y su reloj de origen deben acordarse; no sustituir silenciosamente “publicación en sitio CCD” por “archivo recibido” o “release listo”.

## 17. Agent/ReAct y MCP

A4.1 confirma que OE3 exige Agentic AI y MCP, no solo términos teóricos. Recomendación técnica: **IMPLEMENT_AFTER_DOMAIN_STABILIZATION**, condicionada a necesidad y alcance aprobados.

| Opción | Evaluación |
| --- | --- |
| IMPLEMENT_BEFORE_REAL_DATA | No recomendada: tools, permisos y preguntas reales sin confirmar; alto riesgo de interfaces especulativas |
| IMPLEMENT_AFTER_DOMAIN_STABILIZATION | Preferida si el dominio demuestra selección dinámica útil y se conserva OE3; acotar tools y evaluar decisiones |
| DEFER_TO_FUTURE | Alternativa de MVP si no cabe o no hay necesidad suficiente; NEEDS_DIRECTOR_APPROVAL |
| REMOVE_SCOPE_CANDIDATE | Solo propuesta argumentada si no aporta al problema; NEEDS_DIRECTOR_APPROVAL; no decisión tomada |

Respuestas explícitas:

1. **Problema real que necesita Agent/ReAct:** no está demostrado. Consultas que combinen pasos dependientes y selección de herramientas podrían justificarlo; hacen falta ejemplos validados, fuentes y criterios de éxito.
2. **Consultas que el router actual no resuelve razonablemente:** su catálogo acotado no cubre toda combinación de intenciones ni planificación multietapa. Pero un caso fuera del catálogo puede requerir un fast path, aclaración o abstención; no demuestra necesidad de agente.
3. **Número de tools reales:** desconocido. Las seis tools del contrato sintético son propuestas sobre v1, no seis integraciones institucionales disponibles. El número por sí solo tampoco demuestra valor de selección dinámica.
4. **Interoperabilidad MCP:** no hay consumidor institucional confirmado que la necesite. Puede aportar separación y acceso uniforme, pero debe compararse con servicios internos directos, coste de autorización y pruebas.
5. **OE3 más acotado:** proponer al director un conjunto pequeño de tools autorizadas y consultas multietapa con evaluación de selección, argumentos, permisos y resultado. Conservar solo RAG determinista no equivale al OE3 literal; cambiarlo requiere NEEDS_DIRECTOR_APPROVAL.
6. **Qué afecta diferir:** elimina del resultado del proyecto la ejecución ReAct, selección dinámica y servidor/tools MCP previstos. Contratos escritos no satisfacen esos resultados.
7. **Implementación posterior sin rehacer Mobile/REST:** la frontera backend y los servicios favorecen incorporarlos detrás de REST, si se preservan semántica, citas, errores y permisos. Si las respuestas o el acceso cambian, habrá impacto contractual; no se garantiza cero cambios.
8. **Riesgo de anticiparlos:** alto trabajo especulativo en herramientas, reglas y evaluaciones que podrían no representar el dominio. Primero confirmar casos, luego justificar arquitectura.

No se descartan porque el runtime funcione sin ellos. Se compara valor académico y técnico con mantenibilidad, permisos, tiempo restante y posibilidad de evaluar decisiones de forma reproducible. Este plan no implementa Agent ni MCP ni modifica sus contratos.

## 18. Mobile

| Elemento | Tratamiento propuesto | Dependencia o límite |
| --- | --- | --- |
| Navegación | Reutilizar estructura existente | Ajustar acceso a capacidades realmente incluidas; conservar Expo SDK 57 |
| Chat | Reutilizar interacción/estado y REST | Cambios de contrato, autenticación o streaming no presumidos |
| Citas | Adapter para origen/edición/localizador | No exponer documento restringido al abrir una cita |
| Historial conversacional | Reutilizar patrón si se permite conservar mensajes | Retención/acceso por identidad; no confundir con historial académico |
| Calendario | Reutilizar presentación con adapter | Fechas, tipo de evento, fuente y vigencia reales |
| Progreso | Fixture por ahora; adapter o retirada de vista real según alcance | No representa cumplimiento académico hasta validación; recortes históricos requieren aprobación |
| Anuncios | Adapter de publicación/convocatoria | Estados y plazos reales |
| Documentos | Reutilizar lookup/citas; revisar visor/descarga | Markdown actual no garantiza soporte de formatos recibidos |
| Perfiles sintéticos | Mantener modo demo separado | Selector no autentica; no vincular por coincidencia de nombre |

Chat, navegación y estados de carga/error tienen baja dependencia del dominio. Las vistas de calendario, progreso y anuncios dependen fuertemente de significado y acceso. Podrían quedar fuera del modo real si faltan fuentes o alcance, manteniéndose solo como demo claramente identificada; cualquier recorte de funcionalidad histórica exige **NEEDS_DIRECTOR_APPROVAL**.

Faltan o no están acreditados push, historial académico real, autenticación institucional y evaluación UX con usuarios reales. No se modifica UI, no se migra Expo/React Native y no se generan proyectos nativos.

### 18.1 Perfiles sintéticos

A4.1 confirma perfiles estudiantiles sintéticos en OE4/resultados. Mantenerlos no es divergencia automática. Deben distinguirse perfil demo para reglas, identidad real, progreso académico e historial académico: son cuatro conceptos diferentes.

Un MVP documental puede conservar el primero y excluir los otros si el alcance se acuerda. La selección de perfil no obliga a construir autenticación institucional ni autoriza consultas personales. La compatibilidad académica de ese recorte debe revisarse contra todos los resultados, no solo contra la mención de perfiles sintéticos.

### 18.2 Push

Push está comprometido en el resultado móvil histórico. Su valor posible es comunicar cambios relevantes a tiempo, si existen eventos fiables, destinatarios y permiso. Requiere fuente de cambios, consentimiento/preferencias aplicables, tokens de dispositivo, configuración de entrega, pruebas y operación; no se presupone servicio gratuito ni infraestructura disponible.

Coste relativo restante M–L, condicionado por plataforma y alcance; riesgos de duplicados, información desactualizada y exposición en notificaciones. Propuesta de MVP: diferir hasta confirmar necesidad, con **NEEDS_DIRECTOR_APPROVAL**. Mostrar anuncios al abrir la app no equivale a push.

## 19. Seguridad y privacidad

No almacenar datos personales reales en Git ni copiar exports sensibles a `data/synthetic`. No versionar credenciales, tokens, connection strings ni secretos. Separar corpus funcional de datos de evaluación; los ejemplos de prueba tampoco quedan exentos de permisos.

Aplicar minimización por uso, controles de acceso antes de recuperar información protegida y límites de retención por definir. No usar datos personales en RAG salvo justificación y autorización específicas, incluidos embeddings, prompts, logs y posibles jueces externos. Una conversación puede revelar información personal aunque el corpus sea público.

No introducir accesos institucionales sin mecanismo/contrato confirmado. Mantener fixtures separados, errores sin SQL/stacks/payloads privados y evidencia de evaluación sin identificadores innecesarios. Documentos recuperados son contenido, no instrucciones para ejecutar herramientas ni ampliar permisos.

Políticas institucionales de clasificación, conservación, consentimiento, publicación, acceso y respuesta a incidentes: **pendientes de confirmación**. Este plan no inventa normas ni declara cumplimiento jurídico. Revocación, indisponibilidad o permiso ambiguo bloquean el uso afectado, no se resuelven con una copia no autorizada.

## 20. Compatibilidad y rollback

Se proponen conceptualmente **synthetic mode** y **real-source experimental mode**, sin feature flags ni infraestructura nueva en esta tarea. El primero reproduce el baseline; el segundo solo contiene capacidades/fuentes aceptadas y se identifica expresamente en su evidencia.

La separación podría requerir entornos o almacenamiento independientes: el sistema actual no acredita dos datasets coexistiendo ni aislamiento automático por modo. No basta cambiar una ruta; tampoco se deben mezclar releases bajo identidades compartidas.

Preservar commit, v1, configuraciones, contratos, resultados y procedimientos históricos. Un retorno al demo debe ser explícito y usar su entorno/configuración compatible; nunca responder con progreso o cursos ficticios a una consulta presentada como real.

El rollback futuro debe probar compatibilidad conjunta de código, representación de DB, artefactos, configuración de modelo y fuente/release. El mecanismo de ingesta actual no autoriza asumir que cualquier release ready antiguo pueda reactivarse mediante una ingesta normal. Diseñar y validar restauración será una tarea separada; no se ejecutan migraciones destructivas ni recuperaciones ahora.

Un snapshot previo solo puede volver a servirse si sigue autorizado y se comunica su vigencia. Revocación no se revierte restaurando un respaldo. Mantener auditoría y aplicar la política de conservación pendiente; rollback técnico no equivale a permiso de retener datos.

Comparar sintético/real sirve para estudiar comportamiento por corpus y configuración, no para sumar resultados o atribuir toda diferencia a una única tecnología.

## 21. Evidencias que deben conservarse

Las categorías califican uso futuro, no borran historia. **STILL_VALID** conserva un hecho probado en su alcance. **VALID_ONLY_FOR_SYNTHETIC_BASELINE** limita generalización. **MUST_BE_REPEATED_WITH_REAL_DATA** exige nueva prueba para afirmaciones reales. **OBSOLETE_AFTER_MIGRATION** solo aplica a un oracle/supuesto operativo sustituido, nunca a la existencia del resultado histórico.

| Evidencia | Estado para transición | Alcance y acción |
| --- | --- | --- |
| Contratos/tests REST | STILL_VALID en versión probada; MUST_BE_REPEATED_WITH_REAL_DATA | Conservar verificaciones de interfaz; volver a comprobar semántica/autorización/adapters si cambian |
| Unit tests de servicios/core | STILL_VALID para comportamiento probado | Reutilizar invariantes independientes; expectativas ligadas a v1 solo sintéticas |
| Validadores/fixtures de forma v1 | VALID_ONLY_FOR_SYNTHETIC_BASELINE; OBSOLETE_AFTER_MIGRATION como validadores del corpus real | No borrar; no exigir sus reglas a documentos reales |
| Ingesta core/DB | VALID_ONLY_FOR_SYNTHETIC_BASELINE; MUST_BE_REPEATED_WITH_REAL_DATA | Distinguir unit, DB y embeddings de prueba de ejecuciones con modelo real |
| [K2](../../eval/retrieval/results/k2-v1-2026-10-01.md) | VALID_ONLY_FOR_SYNTHETIC_BASELINE | 18 casos; MRR@5 0.8519, Recall@5/Hit@5 1, Precision@5 0.2222; no resultado institucional |
| [M8.3-A](../../eval/generation/results/m8-3-paraphrase-diagnostic-2026-10-13.md) | VALID_ONLY_FOR_SYNTHETIC_BASELINE | Diagnóstico de paráfrasis INCONCLUSIVE; dos preguntas con tres repeticiones no prueban causalidad ni calidad global |
| [M8.3-B](../../eval/generation/results/m8-3-e2e-parity-2026-10-13.md) | STILL_VALID para paridad local registrada; MUST_BE_REPEATED_WITH_REAL_DATA | FULL_PARITY 6/6 entre capas; no estabilidad del retrieval ni validación institucional |
| [M9 draft](../../eval/rag-quality/README.md) | VALID_ONLY_FOR_SYNTHETIC_BASELINE | 63 candidatas; evidencia de preparación, no resultados de RAGAS |
| [L1-B](../../eval/generation/results/l1-b-rag-latency-2026-10-03.md) | VALID_ONLY_FOR_SYNTHETIC_BASELINE; MUST_BE_REPEATED_WITH_REAL_DATA | Diez solicitudes warm secuenciales, media 4013.57 ms, ocho de diez <5 s; no SLA ni despliegue UNAB |
| [Mobile](../../eval/mobile/README.md) | VALID_ONLY_FOR_SYNTHETIC_BASELINE; MUST_BE_REPEATED_WITH_REAL_DATA | Validaciones manuales concretas; no equivalen a SUS, diez usuarios o evaluación institucional |
| J1, [integración](../../eval/integration/README.md) | VALID_ONLY_FOR_SYNTHETIC_BASELINE | PostgreSQL/Ollama reales de entorno local con corpus sintético; “runtime real” no significa datos reales |
| J2, [integración](../../eval/integration/README.md) | STILL_VALID para su prueba controlada | HTTP/router con dependencias controladas; no atribuirle RAG/SQL institucional E2E |
| [J3](../../eval/integration/results/j3-checkpoint-2026-10-03.md) | VALID_ONLY_FOR_SYNTHETIC_BASELINE | Checkpoint de integración Mobile; no Agent/MCP |
| [N3](../../eval/ingestion/results/n3-n8n-e2e-2026-10-02.md) | VALID_ONLY_FOR_SYNTHETIC_BASELINE; MUST_BE_REPEATED_WITH_REAL_DATA | N8N manual local, publicación y already_current; no scraping/retry/scheduling institucional |
| [Router](../../eval/intent-routing/results/checkpoint-2026-10-router.md) | VALID_ONLY_FOR_SYNTHETIC_BASELINE | Casos sintéticos y reserva negativa acotada; no recall de consultas reales |
| Límites/contradicciones de A4.1 | STILL_VALID como cotejo histórico | Preservar distinción entre compromisos, implementación y propuesta hasta resolución académica |

Los resultados se conservan con sus commits, fuentes, configuraciones y limitaciones originales. No se reejecutaron estas pruebas en T5, no se actualizan sus archivos y no se declara PASS por citarlas.

## 22. Priorización por valor / costo / riesgo

Estimaciones relativas de planificación, no horas ni mediciones. P0 desbloquea decisiones previas al producto; P1 corresponde al alcance mínimo aprobado; P2 mejora posterior; FUTURE queda condicionado. Los costes pueden cambiar al recibir fuentes.

| Trabajo | Valor académico | Valor técnico | Costo | Riesgo | Dependencias | Prioridad |
| --- | --- | --- | --- | --- | --- | --- |
| Resolver alcance y compromisos explícitos | Evita entregar OEs distintos sin aprobación | Evita implementación sin utilidad confirmada | S | Alto si se omite | Director y proceso aplicable | P0 |
| Confirmar primeras fuentes/autoridad/permisos | Sustenta corpus institucional | Hace posible integrar legal y operativamente lo permitido | M | Alto por acceso externo | CCD; G1/G2 | P0 |
| Mapear Curso/Oferta/NRC y temporalidad | Alinea artefacto con problema | Evita rehacer persistencia/consultas | M | Alto por semántica | Fuente aceptada | P0 |
| Analizar contratos y representación | Documenta coherencia de solución | Conserva fronteras útiles | M | Alto si se rompe interfaz a ciegas | G3/G4 | P0 |
| Acordar evaluación/usuarios/entorno | Hace defendibles resultados | Reserva validación desde el alcance | M | Alto por disponibilidad | G0; CCD/director | P0 |
| Adapter de una primera fuente aceptada | Produce incremento verificable | Valida ingesta/procedencia | M–L | Medio/alto según formato | G0–G5 y tarea expresa | P1 |
| Structured queries del alcance mínimo | Evidencia funcional de integración | Respuestas exactas sobre datos dinámicos | M | Medio tras mapping | T6 y fuentes B | P1 |
| RAG sobre corpus real estabilizado | Núcleo de OE1 | Consulta documental trazable | L | Alto sin gold/fuentes | T6, G6/G7 | P1 |
| Adaptación Mobile imprescindible | Evidencia OE5 | Uso de datos/citas reales autorizadas | M | Medio por contrato/formato | G4 y capacidades validadas | P1 |
| Evaluación formal acordada | Demuestra resultados y límites | Detecta fallos reales | L | Alto si se posterga | G6–G8 según alcance | P1 |
| Agent/MCP acotados si se mantienen | OE3 explícito | Valor aún por demostrar | L | Alto por tools/permisos | G0–G4 y casos reales | P1 si siguen en alcance |
| Automatización operativa adicional | Según OE2/OE4 revisados | Menos trabajo manual cuando sea necesario | M–L | Medio/alto | Fuente/cadencia conocidas | P2 si no es compromiso vigente |
| Personalización real | Depende del alcance acordado | Valor solo con datos/autorización fiables | XL | Alto por identidad y privacidad | T9 autorizado | FUTURE si se aprueba diferir |
| HNSW, escalado y agentes avanzados | No exigidos por evidencia actual | Beneficio no medido | L | Alto coste de oportunidad | Mediciones y necesidad | FUTURE |

Una prioridad baja no cambia un compromiso académico: si sigue incluido, debe replanificarse para cumplirlo o renegociarse explícitamente.

## 23. Compromisos académicos de alto costo

Todos los “sí” provienen de A4.1. Riesgo de 16 semanas es una valoración cualitativa contra el horizonte histórico, no una afirmación sobre semanas restantes. Primero confirmar tiempo disponible.

| Compromiso | Está explícito en anteproyecto | Estado actual | Dependencia externa | Valor para problema real | Costo restante | Riesgo 16 semanas | Alternativa acotada | Requiere aprobación para cambiarlo |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Tres flujos automáticos de scraping | Sí, OE2 | No implementados institucionalmente | Fuentes web, permiso, estabilidad | Actualidad sí; tres scrapers no justificados aún | L–XL | Alto | Una fuente autoritativa por export/API/entrega versionada con actualización acordada | NEEDS_DIRECTOR_APPROVAL |
| Agent/ReAct | Sí, OE3 | Pendiente | Casos multietapa y tools reales | Selección dinámica por demostrar | L | Alto | Agente con pocas tools útiles; si no hay necesidad, diferimiento explícito | NEEDS_DIRECTOR_APPROVAL |
| MCP | Sí, OE3 | Contratos, sin runtime integrado | Operaciones/permisos y consumidor | Interoperabilidad por demostrar | M–L | Alto junto con Agent | Servidor acotado si aporta; servicios directos como sustitución propuesta | NEEDS_DIRECTOR_APPROVAL |
| BPM/N8N conversacional | Sí, OE4 | N8N solo ingesta asíncrona | Proceso/reglas CCD | Coordinación de negocio no confirmada | L | Alto | Backend actual y orquestación asíncrona si satisfacen problema | NEEDS_DIRECTOR_APPROVAL |
| Google Sheets | Sí, OE4 | Sin integración | Fuente oficial y acceso | Calendario sí; herramienta no confirmada | M | Medio/alto | Usar fuente maestra que CCD confirme | NEEDS_DIRECTOR_APPROVAL |
| Sincronización <=30 minutos | Sí, resultado OE4 | No acreditada | Actualización observable y disponibilidad | Depende de vigencia necesaria | M–L | Alto sin acceso continuo | SLA de actualización desde origen verificable y acordado | NEEDS_DIRECTOR_APPROVAL |
| Push | Sí, resultado OE5 | Pendiente | Eventos, destinatarios, entrega y permisos | Oportunidad de avisos por validar | M–L | Medio/alto | Consulta de novedades en app; no equivalente literal | NEEDS_DIRECTOR_APPROVAL |
| On-Premise UNAB | Sí, OE6 | Solo entorno local | Infraestructura, acceso y operación UNAB | Depende de aceptación y uso reales | L–XL | Alto por dependencia externa | Piloto local reproducible expresamente aprobado | NEEDS_DIRECTOR_APPROVAL |
| Mínimo diez usuarios reales | Sí, OE5/OE6 | Estudio no realizado | Participantes UNAB de distintos programas y autorización | Evidencia de uso muy relevante | M–L | Alto si se recluta al final | Mantener muestra; alternativa solo si se aprueba formalmente | NEEDS_DIRECTOR_APPROVAL |
| Cinco tareas UX | Sí, resultado OE5 | Protocolo/tareas finales pendientes | Flujos reales disponibles y revisión | Cobertura de tareas esenciales | M | Medio; depende del alcance | Cinco tareas pertinentes al MVP; si cambia número, renegociar | NEEDS_DIRECTOR_APPROVAL |
| RAGAS | Sí, OE1 | Preparación M9; no ejecución final | Corpus, gold, juez y permisos | Evaluación documental relevante, con límites | L | Alto sin corpus a tiempo | Evaluación acotada y revisada conservando protocolo aceptado | NEEDS_DIRECTOR_APPROVAL si se sustituye o reduce |
| Respuesta promedio <=5 segundos | Sí, OE6 | Media local L1-B, no acreditación institucional | Hardware/red/carga y definición de medición | Rendimiento percibido relevante | M–L | Alto si se optimiza sin entorno | Medir baseline real, acordar entorno/criterio; no prometer cada turno <5 s | NEEDS_DIRECTOR_APPROVAL si cambia meta/entorno comprometido |

Priorizar esfuerzo en fuente fiable, trazabilidad, consulta correcta y evaluación. Negociar primero mecanismos sin necesidad confirmada y dependencias externas difíciles; no rebajar silenciosamente resultados porque ya exista una solución local diferente.

## 24. Camino mínimo viable

Propuesta condicionada de alcance defendible: pocas fuentes **suficientes** y autorizadas, un conjunto coherente de preguntas, Mobile funcional, respuestas trazables y evaluación reproducible. “Pocas” no fija una cifra arbitraria ni reduce automáticamente las 50–80 preguntas históricas.

| Clase | Contenido propuesto | Condición académica/técnica |
| --- | --- | --- |
| MUST | Corpus institucional autorizado y pertinente; autoridad/versiones/permiso; separación de v1; fuentes suficientes para el alcance | Sin ello no puede declararse transición real ni OE1 evaluado |
| MUST | RAG documental y lookup de documentos completos según clasificación; PG/pgvector como candidatos iniciales | Conservar por evidencia disponible, revisar si restricciones exigen cambio |
| MUST | Structured query para los datos estructurados incluidos; no sustituirlos por respuestas generadas | Si no hay fuente B, acotar funcionalidad y revisar OE4 con NEEDS_DIRECTOR_APPROVAL |
| MUST | App React Native con chat, citas y capacidades efectivamente aprobadas | Recortar módulos prometidos: NEEDS_DIRECTOR_APPROVAL |
| MUST | Evaluación funcional, documental, UX y operativa según protocolo; mantener metas históricas hasta acuerdo distinto | RAGAS/50–80 preguntas y UX >=10 usuarios/cinco tareas siguen compromisos |
| MUST | Resolver OE2/OE3/OE4/OE6 antes de comprometer implementación mínima | La propuesta no autoriza excluir scraping, Agent/MCP, BPM/Sheets u On-Premise |
| SHOULD | Actualización reproducible y observabilidad suficiente; N8N si coordina una necesidad real | Sustituir automatismo o rol conversacional histórico: NEEDS_DIRECTOR_APPROVAL |
| SHOULD | Robustez ante versiones, indisponibilidad, abstención y restauración autorizada | Probar sobre fuente/entorno elegidos, sin mecanismos especulativos |
| COULD | Agent/MCP acotados después de dominio, cuando su necesidad y tiempo se confirmen | Solo son opcionales si se aprueba cambiar OE3; NEEDS_DIRECTOR_APPROVAL para dejarlos fuera |
| COULD | Datos personales/autenticación como fase separada | No forzar por existencia de perfiles demo; revisar impacto sobre historial/progreso |
| OUT del MVP propuesto | Push e integración personal no indispensables; despliegue UNAB si no hay acceso; Agent avanzado | Para push/On-Premise y cualquier función histórica excluida: NEEDS_DIRECTOR_APPROVAL |
| OUT como mecanismos por defecto | Tres scrapers, N8N síncrono y Sheets si no los justifica la fuente/proceso | Son compromisos históricos: NEEDS_DIRECTOR_APPROVAL antes de sustituir o excluir |
| OUT técnico actual | HNSW, escalado anticipado, nuevas abstracciones sin necesidad | No hay evidencia que justifique implementarlos |

Los elementos históricos propuestos fuera del MVP permanecen obligaciones por resolver hasta aprobación. Si no se aprueba reducirlos, se incorporan al alcance con dependencias y evaluación explícitas, o se reconoce inviabilidad temporal; no se declara cumplido un proyecto distinto.

## 25. Escenarios de disponibilidad del CCD

### Escenario A — CCD entrega documentos + datasets + acceso técnico

Arquitectura candidata: Mobile → REST → router → servicios estructurados o RAG/lookup, con adquisición/actualización autorizada separada. Agent/MCP solo tras decisión OE3. “Acceso técnico” no equivale a API, autenticación o copia ilimitada: se confirma cada mecanismo y permiso.

PostgreSQL puede almacenar snapshots/representaciones permitidas; información no replicable puede exigir consulta en vivo con trazabilidad. Datos A alimentan RAG/lookup; datos B alimentan consultas estructuradas. T9 es posible, no automática: requiere identidad y autorización por usuario.

Se reutilizan fronteras de Mobile/REST, servicios, publicación y citas; cambian adapters, modelos, política temporal y controles. Evaluación posible: documental, estructurada, integración, operación y UX; personal solo autorizada. Riesgos: acceso inestable, restricciones de réplica, dependencia de sistemas externos y ampliación excesiva del alcance. Tener más acceso no obliga a usar todas las integraciones. Sustituir mecanismos históricos sigue sujeto a G0.

### Escenario B — CCD entrega documentos y exports, pero NO APIs

Arquitectura de consulta similar, apoyada en snapshots autorizados. La actualización empieza con entrega/versionado; se pueden automatizar validación, transformación y publicación **después de recibir** el export, sin prometer adquisición automática.

N8N puede coordinar ese procesamiento si aporta valor. No inventar APIs ni scraping como reemplazo obligatorio. Scraping solo se consideraría para una fuente web adicional aceptada, nunca para eludir falta de API o permiso.

PostgreSQL conserva representación permitida con fecha de corte; RAG usa documentos aceptados. Structured queries responden sobre el snapshot, no sobre cupos o estados en vivo. Personalización se excluye inicialmente; un export personal no constituye autorización ni autenticación.

Se reutilizan capacidades existentes con adapters; cambian recepción, formatos, claves y vigencia. Puede evaluarse fidelidad a snapshots, calidad documental, consultas, UX y latencia local/piloto acordado. No se acredita frescura continua del sistema origen. Riesgo principal: datos obsoletos entre entregas. Reemplazar tres scrapers, el reloj <24 h desde publicación web o Sheets/<=30 min requiere NEEDS_DIRECTOR_APPROVAL.

### Escenario C — CCD solo permite información pública/documentos y no datos personales

Alcance: orientación documental autorizada, documentos completos y consultas estructuradas únicamente si la información pública está confirmada y permite extracción/uso. Publicidad no implica integración autorizada.

Mobile/REST/router y RAG/lookup son candidatos reutilizables. PostgreSQL/pgvector almacenarían solo contenido/metadatos permitidos. Fast paths posibles: catálogo, calendario y anuncios únicamente con fuente aceptada; no se garantiza que existan todos. Ayuda/social/fuera de alcance deben reflejar los límites reales.

Progreso e historial académicos reales quedan fuera; perfiles/progreso sintéticos permanecen exclusivamente como demo identificada. No se añade autenticación institucional sin necesidad. No se presentan datos personales simulados como parte de la experiencia institucional.

Evaluación posible: RAG/lookup, exactitud de información pública estructurada disponible, UX con usuarios autorizados, abstención y latencia en entorno acordado. Usuarios reales pueden evaluar una app documental sin consultar su expediente. Riesgos: cobertura insuficiente y falta de documentos autoritativos. Recortes de resultados, Agent/MCP, RPA/BPM/Sheets, push u On-Premise necesitan NEEDS_DIRECTOR_APPROVAL; este escenario no modifica OEs por sí mismo.

## 26. Dependencias académicas

| Elemento académico | Impacto de transición | Cambio probable | Necesita aprobación | Dependencia |
| --- | --- | --- | --- | --- |
| Planteamiento del problema | Distinguir problema institucional de observaciones del prototipo | Validar necesidades y acotar efectos afirmados | NEEDS_DIRECTOR_APPROVAL si cambia formulación/alcance | Evidencia CCD |
| Pregunta de investigación | RAG/N8N y efectos en carga/experiencia no demostrados por demo | Acordar pregunta evaluable y comparador si se mantienen efectos | NEEDS_DIRECTOR_APPROVAL | Director, fuentes y diseño de evaluación |
| Objetivo general | Conserva intención de acceso centralizado, pero beneficios requieren evidencia | Delimitar integración y resultados verificables | NEEDS_DIRECTOR_APPROVAL | Alcance y protocolo |
| OE1 | Exige corpus institucional y RAG/pgvector | Sustituir corpus ficticio por aceptado; revisar benchmark | No para ejecutar lo ya comprometido; NEEDS_DIRECTOR_APPROVAL si cambia corpus/tecnología/metas | G1–G7 |
| OE2 | Ingesta local no es RPA/scraping automático histórico | Elegir mecanismo por fuente y actualidad | NEEDS_DIRECTOR_APPROVAL si se sustituye scraping/automatismo/metas | CCD, permisos y origen temporal |
| OE3 | Agent/MCP explícitos aún pendientes | Implementar acotado tras dominio o renegociar | NEEDS_DIRECTOR_APPROVAL para diferir, eliminar o sustituir | Casos reales, tools y tiempo |
| OE4 | N8N asíncrono difiere del rol conversacional; Sheets ausente | Acordar proceso/reglas, calendario y sincronización | NEEDS_DIRECTOR_APPROVAL para sustituciones | Dominio, fuente y proceso |
| OE5 | Mobile existe parcialmente; push/historial académico/UX pendientes | Adaptar módulos y fijar cinco tareas/reclutamiento | NEEDS_DIRECTOR_APPROVAL si se recortan funciones o criterios | Usuarios y alcance |
| OE6 | Local no equivale a servidores UNAB | Confirmar infraestructura o piloto alternativo | NEEDS_DIRECTOR_APPROVAL si cambia despliegue/metas | Acceso y operación |
| Metodología | Prototipo previo a discovery; DSR/Scrum y método mixto históricos | Documentar cronología real, iteraciones y evidencia | NEEDS_DIRECTOR_APPROVAL si cambia diseño comprometido | Director y tiempo restante |
| Arquitectura | Frontera REST reutilizable; capas/roles históricos distintos | Acordar diagrama objetivo coherente con alcance | NEEDS_DIRECTOR_APPROVAL para cambios sustanciales | OEs 2–4/6 |
| Resultados | Código no prueba calidad, UX, disponibilidad ni efecto administrativo | Definir resultados observables y límites | NEEDS_DIRECTOR_APPROVAL si se cambian entregables/umbrales | Protocolos y entorno |
| Cronograma | Horizonte histórico de 16 semanas no acredita tiempo restante | Replanificar dependencias y reservar evaluación | NEEDS_DIRECTOR_APPROVAL según proceso aplicable | Alcance/acceso/fecha real |

No se reescribe el anteproyecto ni se inventan mecanismos de aprobación. Las entrevistas históricas a 10–15 estudiantes y coordinación CCD son levantamiento; no reemplazan la muestra mínima de diez usuarios del estudio SUS.

## 27. Roadmap de implementación posterior

Se mantienen los IDs de PHASE T0–T10 de §8 para evitar dos numeraciones incompatibles. Source Acceptance (§6) es transversal: autoridad y permiso se resuelven entre discovery y mapping; la preparación de ingesta se completa con contratos/representación, y VALIDATED exige evidencia posterior. No se omite esa puerta ni se convierte en una fase de código.

| Fase | Entrada | Trabajo | Entregable | Validación | Dependencia | Stop condition |
| --- | --- | --- | --- | --- | --- | --- |
| T0 baseline | HEAD y v1 actuales | Preservar referencias/resultados | Baseline identificable e intacto | Integridad y alcance de cambios | Ninguna integración | HEAD inesperado o evidencia alterada |
| T1 source discovery + aceptación inicial | C1, A4.1, T5 | Confirmar fuentes, autoridad, acceso y alcance | Inventario y decisiones por fuente | G0 para alcance; G1/G2 por fuente | CCD/director | Autoridad/permiso sin resolver |
| T2 domain mapping | Fuente aceptada y D3 | Contrastar conceptos/reglas/temporalidad | Mapeo validado y discrepancias resueltas | G3 con CCD/equipo | T1; acceso permitido | Curso/Oferta/NRC o regla esencial ambigua |
| T3 contract impact | Mapeo real | Analizar REST/Mobile/router/citas/lookup/MCP | Compatibilidad y deltas propuestos | G4; autorización expresa para cambios congelados | T2 | Contradicción contrato-código/dominio sin resolución |
| T4 source v2 design | G3/G4 y permisos | Definir snapshots/en vivo, convivencia y privacidad | Diseño de representación; no dataset creado en análisis | Revisión de fidelidad y operaciones permitidas | T3 | Copia no permitida o separación inviable |
| T5 persistence delta | Diseño de representación | Analizar capacidades/deltas, rollback y migración | Plan de persistencia, sin SQL en análisis | G5; tarea expresa antes de implementar | T4 | Representación no aceptada o autorización ausente |
| T6 ingestion adaptation | G0–G5 y autorización de implementación | Implementar incremento mínimo por fuente | Ingesta validada y procedencia | Fidelidad, idempotencia, fallos, permisos y restauración | Persistencia/adapters aprobados | Datos incorrectos, exposición o publicación no trazable |
| T7 structured queries | Datos B aceptados y T6 | Adaptar servicios/consultas y presentación | Capacidad estructurada verificable | Contrastar con fuente y estados/fechas | G4; contratos autorizados | Información obsoleta/ambigua presentada como vigente |
| T8 real document RAG | Datos A aceptados, protocolo preparado | Analizar extracción/chunking, integrar y congelar corpus; preparar gold | Corpus G6 y benchmark G7 revisados | Fidelidad, permisos, localizadores y separación de conjuntos | T6 y tarea expresa; T7 cuando comparta datos/contrato | Corpus/permiso/gold inestable |
| T9 personal/auth, opcional | Alcance personal y permiso por operación | Implementar identidad/autorización/minimización antes de acceso | Consultas personales y controles verificados | Separación entre usuarios y denegación; trazabilidad | G2/G4/G5 específicos; no depende de obtener datos antes | Identidad, permiso o límites sin resolver |
| T10 formal evaluation | Incrementos estables y protocolo autorizado | Ejecutar evaluación por dimensión | Resultados y limitaciones reproducibles | G6/G7 para RAG; G8 según estudio | Capacidades incluidas, usuarios y entorno | Cambio de corpus, contaminación o estudio no autorizado |

Las dependencias estrictas son fuente/permiso → dominio → contratos → representación → implementación y validación. Structured queries se priorizan donde exista dato B; no se inventa esa fase como requisito para un corpus exclusivamente documental. T9 no bloquea T10 de un MVP sin datos personales. Planificar evaluación y disponibilidad de usuarios empieza en G0; ejecutar evaluación final ocurre al final del incremento estable.

No se asignan semanas mientras alcance, acceso y tiempo restante no estén confirmados. Este roadmap es una propuesta; T5 no inicia ninguna fila.

## 28. Stop conditions

Detener la implementación afectada, preservar evidencia y resolver la causa; se puede continuar análisis documental independiente que no requiera acceso o cambios bloqueados.

| Condición | Qué se detiene | Requisito para reanudar |
| --- | --- | --- |
| Fuente no autorizada | Adquisición/procesamiento/servicio afectados | G2 explícito por operación |
| Autoridad desconocida | Uso como verdad institucional | G1 y resolución de discrepancias |
| Modelo real contradice modelo sintético | Adapter, persistencia y consulta afectados | G3; no forzar valores a v1 |
| Requisito académico contradictorio | Implementación que comprometa la decisión | G0 y criterio del director |
| Credenciales/acceso no disponibles | Integración dependiente | Acceso legítimo confirmado; no inventar ni buscar secretos |
| Datos personales sin aprobación | Obtención, copia, prueba y consulta personales | Alcance, permisos y controles previos |
| Contrato congelado necesita romperse | Edición de contrato/implementación incompatible | G4 y autorización expresa de la tarea |
| Fuente no permite reproducibilidad suficiente | Ingesta o afirmación evaluativa que dependa de ella | Snapshot permitido o protocolo de consulta/auditoría aceptado; declarar límites |
| Infraestructura institucional no disponible | Despliegue/evaluación que la exijan | Acceso operativo o alternativa académica aprobada |
| Cambio académico sin aprobar | Entrega que presuponga objetivo sustituido | Decisión registrada y proceso aplicable |
| Revocación o pérdida de vigencia | Uso de contenido afectado según permiso | Nueva aceptación; no restaurar copia para eludir revocación |
| Gold contaminado o corpus cambiado | Comparación final como si fuera independiente | Revisión/versionado y declaración de exposición |

## 29. Decisiones necesarias antes del próximo cambio productivo

Backlog inmediato de **nueve decisiones**. Todas son P0 dentro de la capacidad que desbloquean; decisiones de datos personales o despliegue solo bloquean esa capacidad si se incluye. No se solicita resolver detalles de tuning para empezar discovery.

| Orden / tipo | Decisión | Por qué bloquea | Evidencia necesaria | Responsable genérico | Qué desbloquea |
| --- | --- | --- | --- | --- | --- |
| 1 — DECISIÓN_ACADÉMICA | Alcance mínimo, OEs y efectos que se evaluarán | No se puede elegir integración defendible sin saber qué se entregará | A4.1/T5 y decisión sobre cambios/requisitos vigentes | DIRECTOR; FACULTAD/PROCESO_ACADÉMICO | G0 y orden de trabajo |
| 2 — DECISIÓN_CCD | Primera fuente suficiente y autoridad por dato | No hay contenido real aceptado | Confirmación de origen, autoridad, vigencia y cobertura | CCD | G1; mapping con evidencia |
| 3 — DECISIÓN_CCD | Operaciones permitidas y mecanismo disponible | Acceso público/entrega no autoriza todo uso | Permisos de consulta, copia, derivación, publicación y evaluación | CCD; UNRESOLVED | G2; muestras autorizadas |
| 4 — DECISIÓN_ACADÉMICA | Mantener/acotar/sustituir RPA, Agent/MCP, BPM/N8N y Sheets | Cambia arquitectura, coste y evaluación de OEs 2–4 | Casos/fuentes, alternativas de §§16/17/23 y decisión del director | DIRECTOR | Trabajo técnico con compromiso claro |
| 5 — DECISIÓN_CCD | Significado de conceptos y temporalidad del primer incremento | Evita persistencia y respuestas semánticamente falsas | Curso/Oferta/NRC, versiones, estados y reglas aplicables confirmados | CCD; EQUIPO | G3 |
| 6 — DECISIÓN_TÉCNICA | Compatibilidad de contratos y delta mínimo | Contratos están congelados y no se pueden romper por conveniencia | Matriz de impacto, ejemplos permitidos y autorización expresa del cambio | EQUIPO | G4 |
| 7 — DECISIÓN_TÉCNICA | Representación, procedencia y separación de modos | Ingesta v1 no admite sustitución ciega ni mezcla segura presumida | Diseño aceptado, permisos de copia y estrategia de restauración | EQUIPO; CCD | G5; solicitud acotada de implementación |
| 8 — DECISIÓN_ACADÉMICA | Evaluación, usuarios, entorno y tiempo disponible | Riesgo de construir un producto imposible de evaluar dentro del proyecto | Protocolo viable, disponibilidad y decisión sobre On-Premise/metas | DIRECTOR; CCD; FACULTAD/PROCESO_ACADÉMICO | Reserva de evaluación y criterio G8 |
| 9 — DECISIÓN_ACADÉMICA | Funciones móviles incluidas: push, historial/progreso real y papel del demo | Condiciona fuentes, identidad y alcance de UX | Decisión sobre resultados OE5/OE6 y permisos si hay datos personales | DIRECTOR; CCD | MVP definido; T9 solo si procede |

No se inventan nombres de responsables. La autorización de una futura tarea sigue siendo necesaria aunque se satisfagan gates; este documento no la sustituye.

## 30. Decisiones que pueden esperar

| Decisión | Por qué puede esperar / condición para retomarla |
| --- | --- |
| HNSW/IVFFlat | No hay volumen ni latencia real que justifiquen aproximación; medir primero |
| Escalabilidad prematura | Sin demanda/operación confirmadas, añade coste sin criterio verificable |
| Tuning fino | Corpus, gold y baseline real aún inexistentes; riesgo de sobreajuste |
| Agent avanzado | Primero decidir OE3 y demostrar casos/toolset mínimo; no confundir con diferir todo OE3 sin aprobación |
| Push | Implementación puede diferirse solo con NEEDS_DIRECTOR_APPROVAL; decidir su alcance sí es temprano |
| Automatizaciones sofisticadas | Retry/recovery/scheduling requieren política y fuente; no programarlos por anticipación |
| Infraestructura institucional | La construcción/despliegue espera disponibilidad; la decisión On-Premise o alternativa se resuelve temprano con NEEDS_DIRECTOR_APPROVAL si cambia |
| Optimización de latencia | Medir en entorno y carga acordados antes de optimizar; no posponer definición de la meta |
| Nuevas abstracciones/frameworks | Solo cuando una necesidad concreta y repetida las justifique; no crear capas para fuentes imaginarias |

Distinguir decisión de alcance y ejecución: aplazar infraestructura, push o Agent no elimina el riesgo académico ni concede permiso para dejarlos sin resolver al cierre.

## 31. Comparación explícita: problema real vs compromisos tecnológicos

| Necesidad/problema real | Tecnología histórica asociada | ¿Es necesaria? | Alternativa más simple | Impacto académico si se sustituye |
| --- | --- | --- | --- | --- |
| Responder preguntas sobre documentos institucionales | RAG | Probable para preguntas contextuales; no para todo dato | Lookup directo cuando basta consultar un documento | Cambiar núcleo OE1 exige NEEDS_DIRECTOR_APPROVAL |
| Recuperación semántica local | pgvector | Candidato útil, no único mecanismo posible | Consulta exacta/lookup para subconjuntos que no requieren vectores | Sustituir pgvector/RAG explícitos: NEEDS_DIRECTOR_APPROVAL |
| Coordinar ingesta/operación | N8N | Condicional a coordinación real; rol síncrono no demostrado | Core TypeScript invocado de forma controlada | Cambiar papel histórico: NEEDS_DIRECTOR_APPROVAL |
| Automatizar actividades repetitivas | RPA | No demostrada sin proceso/acceso concreto | Entrega/export autorizado y procesamiento reproducible | Sustituir OE2: NEEDS_DIRECTOR_APPROVAL |
| Obtener información publicada | Scraping | Solo si fuente web es necesaria y autorizada | API/export/entrega oficial si existe y es mejor | Tres flujos/metas históricas: NEEDS_DIRECTOR_APPROVAL |
| Seleccionar pasos/tools según consulta | Agent/ReAct | No demostrado; requiere casos reales | Router y servicios deterministas o aclaración | OE3 no queda cumplido con sustitución: NEEDS_DIRECTOR_APPROVAL |
| Interoperabilidad de herramientas | MCP | Consumidor/necesidad por confirmar | Servicios internos detrás de REST | Eliminar servidor/tools OE3: NEEDS_DIRECTOR_APPROVAL |
| Ejecutar reglas/proceso de negocio | BPM | Solo con proceso, estados y decisiones validados | Lógica de aplicación explícita si el problema es acotado | Reducir OE4: NEEDS_DIRECTOR_APPROVAL |
| Consultar calendario vigente | Google Sheets | Fuente maestra no confirmada | Fuente oficial que CCD designe, con actualización verificable | Sustituir fuente/<=30 min: NEEDS_DIRECTOR_APPROVAL |
| Interfaz móvil para estudiantes | React Native | Ya implementado, alto coste de cambiar sin necesidad | Reutilizar app actual y adaptar datos | Sustituir tecnología/plataforma OE5: NEEDS_DIRECTOR_APPROVAL |
| Reproducir entorno/desplegar | Docker | Útil localmente; compatibilidad institucional pendiente | Reusar configuración local y acotar servicios cuando se apruebe | Cambiar despliegue comprometido: NEEDS_DIRECTOR_APPROVAL |
| Operar dentro de infraestructura universitaria | On-Premise | Depende de requisitos y acceso institucionales | Piloto local reproducible si se acepta | Sustituir entorno OE6: NEEDS_DIRECTOR_APPROVAL |

La alternativa más simple no siempre satisface la misma necesidad ni es una recomendación de sustitución inmediata. La comparación evita conservar tecnologías por inercia y también evita borrarlas sin trazabilidad.

## 32. Riesgos de transición

Registro cualitativo; no se asignan probabilidades ni impactos numéricos sin evidencia.

| Riesgo | Señal/causa | Consecuencia | Mitigación / puerta |
| --- | --- | --- | --- |
| Sobreajuste al dataset sintético | Reutilizar vocabulario, seis H2 o gold sin contrastar | Buen resultado ficticio, mal desempeño real | Corpus aceptado, análisis de estructura y G6/G7 |
| Datos reales sin autoridad | Confundir publicación/reporte del equipo con fuente maestra | Respuestas institucionales falsas | G1 por dato; no generalizar autoridad |
| Curso/Oferta/NRC mal modelados | Usar NRC como curso universal o ignorar periodo | Consultas, citas y relaciones incorrectas | G3; claves/temporalidad confirmadas |
| Mezclar público y personal | Ingesta de archivos completos con campos innecesarios | Exposición y uso no autorizado | G2, minimización, T9 separado |
| Romper REST prematuramente | Diseñar endpoints antes de dominio | Retrabajo Mobile/contratos | G4 y autorización expresa |
| Perder reproducibilidad | Fuente mutable sin versión/snapshot permitido | No poder explicar o repetir resultados | Source Acceptance, procedencia y protocolo aceptado |
| Reescribir pruebas históricas | Ajustar gold/resultados para nuevo corpus | Pérdida de evidencia y comparaciones engañosas | Conservar baseline, crear nuevas versiones solo en tarea posterior |
| Agent/MCP antes del dominio | Tools imaginarias o sin permiso | Complejidad sin prueba de utilidad | G0/G3/G4; casos multietapa antes de implementación |
| Depender de APIs inexistentes | Interpretar mención de un sistema como contrato técnico | Roadmap bloqueado y trabajo perdido | G2; evidencia de mecanismo disponible |
| Scraping pese a fuente mejor | Cumplir tecnología por inercia | Mayor fragilidad/coste | Comparar fuentes; sustitución con aprobación |
| Scraping sin autorización | Suponer que sitio público habilita extracción/reutilización | Uso no autorizado y bloqueo del proyecto | G2 previo; no ejecutar ahora |
| Compromisos acumulados al final | Push, usuarios, infraestructura y OE3 sin decisión temprana | Entrega incompleta pese a mucho código | G0 y backlog §29; resolver alcance antes de construir |
| Intentar cumplir todo sin renegociar | Equiparar compromiso con necesidad viable | Sobrealcance en horizonte histórico de 16 semanas | Tabla §23 y decisión del director |
| No reservar evaluación | Desarrollo consume tiempo restante | Sin gold, SUS, integración o métricas defendibles | Protocolo/disponibilidad en G0; T10 protegido en replanificación |
| Mezclar modos en fallback | Responder con fixtures ante caída de fuente real | Presentar información falsa como institucional | Separación §20 y abstención explícita |
| Snapshot obsoleto | Entrega manual sin vigencia comunicada | Oferta/plazos incorrectos | Mostrar corte temporal y abstenerse según política acordada |
| Revocación ignorada | Restaurar copia o seguir usando vectores | Persistencia/servicio fuera de permiso | Revisión de aceptación y bloqueo del uso afectado |
| Métricas confundidas | MRR@5 como MRR sin k, media como máximo, SUS como efecto causal | Afirmaciones académicas no sustentadas | Protocolo §33 y cotejo A4.1 |
| Contaminación del benchmark | Tuning con primary/reserve sin registro | Sobreestimación de generalización | Separación de conjuntos, congelación y control de exposición |
| Documentos usados como instrucciones | Contenido recuperado intenta dirigir herramientas o revelar datos | Acciones o respuestas fuera de autorización | Tratar fuentes como datos; controles de tools y permisos independientes |

## 33. Métricas y evaluación futura

Las cifras siguientes son **metas históricas del proyecto cotejadas por A4.1**, no estándares universales ni resultados alcanzados. Se conservan hasta decisión académica explícita. Cambiar umbral, población, cantidad o alcance sustancial requiere **NEEDS_DIRECTOR_APPROVAL**.

| Dimensión / meta | Clasificación | Qué conservar | Qué definir o replantear antes de medir |
| --- | --- | --- | --- |
| K2 y diagnósticos actuales | SYNTHETIC_BASELINE | Resultados, casos/configuraciones y límites originales | No reutilizarlos como evidencia institucional ni mezclar promedios entre corpus |
| OE1 faithfulness >=0.80 | REAL_DOMAIN_REQUIRED | Meta del proyecto | Versión RAGAS, juez, unidad/agregación y revisión humana |
| OE1 context precision >=0.80 | REAL_DOMAIN_REQUIRED | Meta del proyecto | Definición y gold; Precision@5 de K2 no es sustituto |
| OE1 context recall >=0.75 | REAL_DOMAIN_REQUIRED | Meta del proyecto | Contextos esperados y reglas de anotación; Recall@5 no demuestra esta métrica por sí solo |
| OE1 answer relevancy >=0.80 | REAL_DOMAIN_REQUIRED | Meta del proyecto | Juez/configuración y pertinencia real de preguntas |
| OE1 MRR >=0.70 | REAL_DOMAIN_REQUIRED | Umbral histórico, pendiente de definición operativa | Acordar fórmula y k: el original no fija truncamiento; MRR@5 actual no equivale automáticamente a ranking completo |
| OE1 50–80 preguntas | REAL_DOMAIN_REQUIRED | Rango y procedencia institucional del corpus | Cobertura, pertinencia, gold humano y particiones; generación sintética de preguntas no autoriza corpus ficticio |
| OE5 mínimo diez usuarios reales UNAB de distintos programas | USER_STUDY_REQUIRED | Población/mínimo comprometidos | Reclutamiento, autorización, consentimiento y protocolo; no sustituir con desarrolladores o perfiles demo |
| OE5 SUS de diez ítems, promedio >70 | USER_STUDY_REQUIRED | Instrumento y desigualdad estricta | Aplicación/cálculo y tratamiento de faltantes; no presentar corte como universal |
| OE5 ningún resultado individual <50 | USER_STUDY_REQUIRED | Cada puntaje >=50, no “todos >50” | Reportar distribución y casos; media alta no basta |
| OE5 cinco tareas, completación >85 % | USER_STUDY_REQUIRED | Número y umbral estricto | Definir cinco tareas pertinentes, éxito, denominador/agregación e intentos antes de evaluar |
| OE6 respuesta promedio <=5 segundos | OPERATIONAL_REQUIRED | Media y frontera inclusiva | Inicio/fin de medición, muestra, carga, warm/cold, hardware/red/errores; entorno comprometido |
| OE2 al menos tres flujos de scraping automáticos sin intervención durante pruebas | OPERATIONAL_REQUIRED | Resultado histórico mientras no se sustituya | Fuente/permiso, criterio de flujo exitoso y prueba del automatismo |
| OE2 actualización <24 h desde publicación en sitio CCD | OPERATIONAL_REQUIRED | Reloj histórico de origen | Observación de publicación y final de actualización; cambiar a recepción de export requiere aprobación |
| OE2 extracción correcta >90 % sobre páginas objetivo | REAL_DOMAIN_REQUIRED; OPERATIONAL_REQUIRED | Umbral y universo de origen | Denominador, muestra y definición de extracción correcta; éxito de job no basta |
| OE4 sincronización de calendario <=30 minutos | OPERATIONAL_REQUIRED | Máximo respecto de fuente de origen | Fuente Sheets histórica o sustitución aprobada, frecuencia y medición extremo a extremo |
| OE4 sin pérdida/corrupción y 100 % de flujos documentados | OPERATIONAL_REQUIRED | Integridad y cobertura comprometidas | Enumerar flujos incluidos, criterios y alcance E2E; N3 no los acredita todos |
| OE6 sin interrupciones no planificadas >5 minutos | OPERATIONAL_REQUIRED | Criterio histórico | Ventana de observación, detección y entorno; no afirmar estabilidad absoluta |
| OE3 selección multietapa/coherencia | REAL_DOMAIN_REQUIRED; OPERATIONAL_REQUIRED | Capacidad histórica si se mantiene OE3 | Casos/tools, seguridad y revisión; no inventar tasa numérica que no existe en A4.1 |
| Exactitud de structured queries, lookup y citas | REAL_DOMAIN_REQUIRED | Separación respecto a calidad generativa | Casos verificados contra fuente, vigencia, abstenciones y errores; umbrales por acordar |
| Reducción de carga administrativa/mejora de experiencia | USER_STUDY_REQUIRED; OPERATIONAL_REQUIRED | Solo como hipótesis/efecto por demostrar si se mantiene | Línea base, comparación y alcance; SUS aislado no demuestra causalidad ni reducción de carga |

L1-B observó media local de 4013.57 ms en diez solicitudes warm secuenciales. Eso no convierte la meta en “todas las solicitudes <5 segundos” ni acredita respuesta promedio <=5 segundos en red/infraestructura UNAB. Deben conservarse tiempos completos, fallos y condiciones; no excluir solicitudes lentas para mejorar la media.

Congelar antes de evaluar: corpus, configuración, preguntas/gold, particiones, fórmulas, población y protocolo aplicable. Reportar resultados por dimensión y con límites, sin una etiqueta global de cumplimiento que oculte componentes pendientes. No se ejecuta evaluación en esta tarea.

## 34. Condiciones para reanudar RAG

Reapertura solo mediante tarea posterior expresa, con:

1. Corpus documental institucional aceptado: autoridad y permiso para lectura, procesamiento, vectorización y evaluación; copia/retención definidas.
2. Documentos identificados y clasificados entre RAG, lookup completo y contenido que debe resolverse estructuradamente o excluirse.
3. Formatos y versiones conocidos, con vigencia, actualización y localizadores reproducibles.
4. Preguntas documentales pertinentes al dominio confirmado, sin requerir datos personales para fingir cobertura.
5. Estrategia de extracción/chunking revisada conceptualmente contra la estructura real; guías full_document preservadas cuando corresponda.
6. Plan de benchmark y gold humano, particiones development/primary/reserve y control de contaminación.
7. Alcance académico, métricas y plan de juez revisados; permisos para cualquier procesamiento externo.
8. Análisis de impacto en persistencia/contratos y autorización específica de los cambios necesarios.

Orden sin circularidad: aceptar fuente y analizar representación → autorizar adaptación mínima → validar extracción/chunking → congelar corpus G6 → revisar/congelar benchmark G7 → ejecutar baseline autorizado G8 → considerar tuning en tarea separada. Preparar el plan de evaluación no significa que ya exista benchmark final.

Hasta satisfacer condiciones y autorizar expresamente la reapertura permanecen congelados **M9 P-064+, RAGAS final, tuning, cambios de embeddings, cambios de chunking y HNSW**. Ningún gate se da por cumplido al escribirlo. Las pruebas antiguas no justifican excepciones.

## 35. Condiciones para modificar la base de datos

Antes de SQL nuevo se requieren fuentes confirmadas, permisos de persistencia, modelo conceptual validado, separación Curso/Oferta/NRC, temporalidad/periodos/estados definidos, datos personales delimitados, impacto REST revisado y estrategia de procedencia/restauración aceptada.

El análisis debe precisar qué se almacena, qué se deriva, qué permanece fuera de Git, qué requiere consulta en vivo y qué no puede replicarse. Si no se confirma identidad estable, no inventar una clave institucional a partir de un campo sintético.

G3–G5 permiten preparar una tarea concreta; **no levantan automáticamente el congelamiento SQL**. Se necesita autorización expresa de la modificación, con alcance, compatibilidad y validación pertinentes. Antes de ello: **NO SQL nuevo, NO migraciones, NO tablas reales, NO dataset v2**. Mantener o sustituir PostgreSQL se decide separadamente del modelo; reemplazar un compromiso tecnológico histórico requiere NEEDS_DIRECTOR_APPROVAL.

## 36. Próxima acción técnica autorizable

**No hay todavía una modificación productiva segura que este plan autorice.** Faltan fuentes aceptadas y decisiones de alcance; implementar adapters, SQL, endpoints o tools ahora sería anticipar el dominio.

La siguiente acción técnica útil, cuando se disponga de una primera muestra y permisos suficientes, es un cotejo de solo lectura entre esa fuente y D3: significado, claves, temporalidad, autoridad, formatos y compatibilidad con los contratos actuales. Su resultado debe ser un delta concreto y revisable, no código ni importación. Si no existe muestra autorizada, no se simula esa actividad con datos inventados ni se fabrica trabajo técnico sustitutivo.

Tras G3/G4/G5 y aprobación del alcance se podrá solicitar una tarea acotada para la primera capacidad. T5 termina aquí como planificación; no inicia discovery, contacto, integración ni evaluación.

## 37. Próxima acción académica

Preparar con A4.1 y T5 la conversación con el director para resolver, en este orden:

1. Corpus institucional mínimo y alcance evaluable; qué evidencia permite afirmar mejora o reducción de carga, o cómo acotar esas afirmaciones.
2. OEs que se mantienen y cambios propuestos: RPA/tres scrapers, Agent/MCP, BPM/N8N conversacional, Sheets/sincronización y módulos móviles.
3. Viabilidad de On-Premise UNAB y alternativa si el acceso no existe.
4. Disponibilidad de usuarios, cinco tareas, SUS, RAGAS, metas operativas y tiempo real para evaluación.

Salida deseable: decisiones registradas, compromisos vigentes, cambios pendientes de proceso académico y dependencias CCD, sin atribuir aprobación a esta propuesta. No se inventa trámite de facultad ni se contacta al director desde esta tarea. El siguiente paso académico es esa conversación; no crear otro documento estratégico por iniciativa propia.

## 38. CHECKPOINT DE TRANSICIÓN BANUCHAT

### Decisiones confirmadas

HEAD de partida verificado: `7eaaa463084745e8b1639b8d304c61456ab5ad93`. El sistema actual usa corpus sintético, router determinista, fast paths y Document RAG directo. N8N es asíncrono respecto de consultas; Agent/MCP productivos siguen pendientes. A4.1 es cotejo literal válido de compromisos históricos. T5 es exclusivamente planificación.

### Decisiones provisionales

Reutilizar fronteras Mobile/REST, patrones de servicios, citas y procedencia; PostgreSQL/pgvector son candidatos fuertes sujetos a restricciones reales. Empezar por pocas fuentes suficientes y autorizadas. Implementar Agent/MCP después de estabilizar dominio solo si se confirma alcance/necesidad. Ninguna propuesta acredita aceptación institucional.

### Elementos congelados

Producto, SQL, dataset v1, REST, contrato MCP, router, workflows, prompts, embeddings y chunking. M9 P-064+, RAGAS final, tuning y HNSW siguen pausados. No importación, scraping, APIs institucionales, Agent/ReAct ni MCP nuevos.

### Elementos candidatos a descartarse

Supuestos de equivalencia ciega entre v1 y dominio real; NRC como identidad universal de curso; available como cupos; progreso demo como cumplimiento; seis H2 como estructura universal. Como mecanismos del MVP, scraping por defecto, N8N síncrono, Sheets o Agent sin necesidad demostrada son candidatos a sustitución/reducción, **no compromisos eliminados**.

### Elementos que necesitan aprobación del director

**NEEDS_DIRECTOR_APPROVAL** para eliminar, sustituir o diferir compromisos explícitos: RPA/tres scrapers, Agent/MCP, BPM/N8N conversacional, Sheets/<=30 min, push, On-Premise y funciones históricas recortadas. También para cambios sustanciales de corpus, objetivos, metodología, población, métricas o tecnologías comprometidas. Un ADR no sustituye aprobación.

### Dependencias externas CCD

Fuentes autoritativas, muestras permitidas, reglas Curso/Oferta/NRC, vigencia, mecanismos de acceso, permisos por operación, actualización, disponibilidad de participantes y condiciones institucionales. APIs, responsables concretos, políticas y credenciales no confirmados.

### Dependencias académicas

Alcance defendible, compromisos vigentes, aprobación de cambios, protocolo/usuarios/entorno, tiempo restante y proceso académico aplicable. No se acredita cumplimiento de un OE por existencia de código.

### Próxima acción técnica autorizable

Ninguna modificación productiva por ahora. Tras fuente/muestra autorizada: cotejo de solo lectura y delta de dominio/contratos, antes de solicitar un incremento de implementación. No se ejecuta desde T5.

### Próxima acción académica

Conversación con director basada en A4.1/T5 para resolver corpus, OEs, Agent/MCP, RPA/BPM/N8N, On-Premise y evaluación con usuarios. No se envían mensajes ni se inicia otro artefacto estratégico.

### Condiciones para reanudar RAG

Fuente y usos autorizados, autoridad, clasificación, formatos/versiones, preguntas pertinentes, chunking analizado, plan de benchmark/gold/juez y alcance aprobado; después congelaciones G6/G7 y evaluación G8 según protocolo. Reapertura mediante tarea expresa.

### Condiciones para modificar DB

G3–G5, Curso/Oferta/NRC y temporalidad definidos, privacidad, impacto REST, procedencia, persistencia y restauración aceptados; autorización expresa para modificar SQL congelado. Ningún diseño físico creado.

### Estado del benchmark sintético

K2 conserva sus resultados históricos sintéticos. M9 mantiene 63 candidatas draft, sin P-064+, sin benchmark final institucional ni RAGAS ejecutada. Metodología reutilizable; preguntas/gold no transferibles automáticamente.

### Estado del dataset sintético

/data/synthetic v1 intacto. Fixture, demo, regresión y evidencia reproducible; coexistencia futura separada de lo real, nunca fallback institucional silencioso. No se creó dataset v2.

### Riesgo principal actual

Construir o renombrar componentes antes de confirmar fuentes y alcance, confundiendo necesidad técnica con obligación académica o evidencia sintética con validación institucional. La respuesta es resolver las puertas de decisión, no aumentar implementación. **T5 concluye con este plan; ninguna fase del roadmap queda iniciada.**
