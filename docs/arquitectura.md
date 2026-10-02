# Arquitectura técnica de BanuChat

## Alcance vigente

BanuChat es un proyecto académico cuyo MVP está en implementación incremental. Todo
dato funcional (documentos, cursos, calendarios, convocatorias y perfiles) es
sintético y tiene
su fuente de verdad versionada en `/data/synthetic`. PostgreSQL conserva una
representación procesada y reconstruible desde esos archivos.

Este documento aplica las decisiones de `AGENTS.md` y del
[ADR 0001](adr/0001-alcance-sintetico-y-despliegue-local.md).
El anteproyecto es una referencia histórica: su despliegue en servidores UNAB,
scraping del CCD e integraciones institucionales fueron descartados.
No se accederá a datos, APIs, páginas ni infraestructura real de UNAB/CCD.

## Componentes y responsabilidades

| Componente | Responsabilidad | Ubicación |
| --- | --- | --- |
| Mobile App | React Native + TypeScript; consume únicamente la API REST pública. | `mobile/` |
| REST Backend API | Entrada síncrona; fija contexto, evalúa Intent Router y persiste respuesta/citas de la misma release. | `backend/api/` |
| Intent Router | Catálogo determinista: fast path seguro o fallback Agent/RAG; sin LLM, embeddings ni N8N para clasificar. | Especificación en `docs/enrutamiento-intenciones.md`; catálogo en `backend/api/` |
| Application Services | Lógica compartida con acceso consistente a PostgreSQL; implementada para los fast paths actuales y pendiente de reutilización por tools MCP. | `backend/api/` |
| Agent/RAG | Ciclo ReAct, recuperación de contexto y selección controlada de herramientas; el agente es cliente MCP. | `backend/`, `backend/rag/` |
| MCP Server interno | Expone herramientas controladas mediante los mismos servicios de aplicación que usa el fast path. | `backend/mcp-server/` |
| PostgreSQL + pgvector | Una instancia para información relacional y embeddings, separados por el modelo de datos. | `infra/db/` |
| N8N | Orquesta ingesta asíncrona de releases sintéticas completas y aprobadas. | `n8n/workflows/` |
| Datos sintéticos | Fuente de verdad versionada, con origen simulado explícito. | `data/synthetic/` |
| Docker Compose local | Entorno de desarrollo y demostraciones iniciales. | `infra/docker-compose.yml` |

## Consulta síncrona

### Arquitectura objetivo

```mermaid
flowchart LR
    mobile["Mobile App"] -->|"REST"| api["Backend API"]
    api --> router["Intent Router determinista"]
    router -->|"Fast path estructurado"| services["Application Services"]
    router -->|"Fallback"| agent["Agent/RAG"]
    agent -->|"Cliente MCP"| mcp["MCP Server interno"]
    mcp --> services
    services --> db[("PostgreSQL + pgvector")]
    services -->|"Datos y procedencia para fast path"| renderer["Renderer determinista"]
    services -->|"Evidencia para fallback"| mcp
    mcp -->|"Evidencia"| agent
    router -->|"Ayuda, social o límite conocido"| renderer
    renderer --> reply["Validación y persistencia de respuesta y citas"]
    agent --> reply
    reply -->|"Mismo contrato REST"| mobile
```

N8N queda fuera del camino síncrono. La app no consume MCP, N8N ni PostgreSQL
directamente. Agent/ReAct y MCP continúan siendo parte de esta arquitectura objetivo;
no están integrados en el fallback implementado actualmente. Embeddings usa Ollama
local con `qwen3-embedding:0.6b`, 1024 dimensiones y coseno
([ADR 0003](adr/0003-embedding-local-qwen3.md)).

El [ADR 0004](adr/0004-enrutamiento-determinista-intenciones.md) introduce el router.
El fast path no llama a MCP ni al LLM generador; usa servicios compartidos y renderers.
Ante ambigüedad, conflicto, texto residual o consulta compuesta se utiliza Agent/RAG.
El diagrama muestra dependencias lógicas y retornos, no nuevos contenedores ni código.
Las consultas REST directas siguen pudiendo utilizar servicios sin router ni agente.

Ambas rutas citan evidencia verificable del corpus sintético, documental o estructurada,
y declaran evidencia insuficiente cuando corresponda. Mantienen una release por turno.
No presentan la simulación como información institucional vigente. Los documentos con
`retrieval_mode=full_document` no se fragmentan ni vectorizan; se resuelven como
artefactos completos verificados por la ruta REST interna aprobada, no URLs externas.

### Estado de implementación actual

El vertical slice conversacional validado al commit
`f47ec9e29b8c161a2c88a4eadf641dab2359a964` ejecuta este recorrido:

```mermaid
flowchart LR
    client["Mobile / futuro cliente"] -->|"REST"| api["Backend API"]
    api --> router["Intent Router determinista"]
    router -->|"Fast path"| fast["Progreso, calendario o anuncios"]
    router -->|"Fallback documental"| rag["Document RAG directo"]
    fast --> db[("PostgreSQL + pgvector")]
    rag --> db
    rag --> ollama["Ollama local"]
    fast --> reply["Persistencia y respuesta REST"]
    rag --> reply
```

La API expone actualmente `GET /api/v1/profiles`,
`POST /api/v1/conversations` y
`POST /api/v1/conversations/{id}/messages`. El fallback hace retrieval documental
exacto con `qwen3-embedding:0.6b`, genera con `qwen3:4b-instruct`, construye citas y
persiste mensajes y citas. El recorrido RAG E2E real obtuvo HTTP 201.

Este estado no incluye un ciclo Agent/ReAct ni llamadas MCP desde el fallback. Ambos
siguen pendientes en la arquitectura objetivo, pero no son necesarios para demostrar
el vertical slice implementado actual.

## Ingesta asíncrona de releases sintéticas completas

```mermaid
flowchart LR
    orchestrator["N8N: manual / retry"] -->|"HTTP privado de control"| ingestion["Componente TypeScript: implementation_revision"]
    source["Source checkout read-only: source_git_revision"] -->|"Bytes verificados de /data/synthetic"| ingestion
    ingestion -->|"Embeddings de chunked"| ollama["Ollama local: Qwen3"]
    ingestion -->|"Release completa y publish_release"| storage[("PostgreSQL + pgvector")]
```

El [ADR 0005](adr/0005-ingesta-reproducible-n8n.md) define esta frontera. El core
TypeScript, transporte HTTP interno y su composición/startup operacional ya están
implementados. El servicio se levantó localmente en `127.0.0.1:3010`; `/status`
autenticado respondió desde Windows y desde el contenedor N8N local. El workflow N8N
sigue pendiente. En la arquitectura objetivo, N8N orquesta
triggers, llamada y resumen; TypeScript valida revisión/aprobación, schemas,
hashes y relaciones, procesa documentos y gobierna intentos/publicación. El runtime
de `backend/rag` y el checkout fuente son raíces separadas configuradas por el servidor,
nunca paths enviados por HTTP. El operador prepara la fuente en un worktree o checkout
equivalente read-only; no se crea aquí. N8N no ejecuta checkout, pull, fetch ni red Git.

HEAD del source checkout debe coincidir con source_git_revision aprobada; sus bytes,
manifest y schemas se validan allí. Para v1 es
`af7ac711e1da3426e1f5fbe8b2892cec1344ce8b`, registrado en dataset_releases.git_revision.
El código/build ejecutado tiene su propia implementation_revision en pipeline_config,
que puede ser posterior. approval_ref aprueba la fuente, no automáticamente el runtime.
Cambiar solo implementación puede producir otra release por pipeline_sha256 sin
alterar ni volver a aprobar el contenido. No se exige un checkout en dos revisiones.

El calendario se carga como parte de una release completa desde `/data/synthetic/calendars`;
no sincronización independiente, Google Sheets ni fuente institucional. Full_document
produce versiones sin chunks/embeddings y conserva el artefacto exacto para REST.
Chunked v1 usa secciones H2, sin overlap: la receta produce 60 chunks, validados en
PostgreSQL; la E2E real de Implementación 3 generó sus 60 embeddings. Estos conteos
no acreditan calidad RAG.

Se conservan 76 items por intento exitoso, incluidos skipped verificados. Solo
publish_release promueve atómicamente; un fallo mantiene current. Ready actual es
no-op y una ready histórica no se reactiva mediante ingesta normal. La
[especificación](ingesta-reproducible.md) detalla receta, locking, retry y fallos.
Los workflows se exportarán como JSON versionado al implementar, sin secretos.

## Despliegue local

```mermaid
flowchart TB
    M["App móvil"] -->|"REST"| B["Backend API, Intent Router y Agent/RAG previstos"]
    subgraph LOCAL["Equipo local: entorno previsto de Docker Compose"]
        B -->|"Fallback MCP interno"| C["MCP Server previsto"]
        B -->|"Fast path"| S["Servicios compartidos previstos"]
        C --> S
        S --> P[("Única instancia PostgreSQL + pgvector")]
        N["N8N levantado localmente; workflow pendiente"] -->|"Conectividad /status validada localmente"| I["Componente de ingesta backend/rag"]
        I -->|"Publicación completa"| P
        I -->|"Embeddings"| O["Ollama local previsto"]
        D["Source checkout read-only separado"] -->|"/data/synthetic verificado"| I
    end
```

Este diagrama describe límites lógicos, no fija un contenedor por módulo.
El Compose actual solo declara PostgreSQL con una imagen que incluye pgvector y N8N.
El SQL vigente ya incluye `CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;`
y la migración fue ejecutada en PostgreSQL local desechable. Compose por sí solo no
aplica automáticamente esa migración; disponer de la imagen no significa que toda
base nueva esté migrada. No hay servicios backend o mobile en el Compose actual.

El HTTP interno implementa `Authorization: Bearer <service-token>` con token fuera
de Git, mínimo 32 caracteres, sin whitespace ni logging, y comparación SHA-256 con
`timingSafeEqual`. La configuración está conectada al startup; su `/status` autenticado
se validó en Windows local y desde N8N dentro de Docker Desktop. `host.docker.internal`
fue observado en ese entorno, no es una decisión portable. Siguen pendientes el
workflow ejecutable/versionado, `/execute` desde N8N, la topología/bind para futuros
despliegues y permisos/roles mínimos. No es autenticación de usuarios ni existe
despliegue institucional.

## Perfiles, usabilidad y funcionalidades pendientes

Los perfiles para historial y personalización son totalmente sintéticos. La estrategia
de autenticación local está pendiente; no habrá autenticación institucional.

Los datos que puedan recogerse posteriormente en pruebas de usabilidad con personas
son distintos del corpus funcional. Su consentimiento, minimización, anonimización,
almacenamiento y acceso requieren diseño previo; no deben alimentar `/data/synthetic`.

Las notificaciones mediante un proveedor push real son una funcionalidad deseable
pendiente de diseño explícito y no se incorpora un proveedor en esta iteración.

## Trazabilidad y evaluación

| Objetivo | Interpretación vigente |
| --- | --- |
| OE1 | RAG sobre corpus sintético: faithfulness ≥ 0,80; context precision ≥ 0,80; context recall ≥ 0,75; answer relevancy ≥ 0,80; MRR ≥ 0,70. |
| OE2 reformulado | Ingesta de revisión sintética aprobada: objetivo <24h desde disponibilidad para ingesta y éxito >90 %, no medidos; separar espera y duración trigger→publicación del trabajo humano previo. |
| OE3 | Selección controlada y dinámica de herramientas MCP por el agente. |
| OE4 | Orquestación E2E: publicación atómica, trazabilidad, sin pérdida/mezcla de items y current preservada ante fallos; todos los casos críticos deben cumplir lo esperado. Duración observada sin nuevo umbral. Se descarta la sincronización independiente de 30 min; redacción académica pendiente de actualización. |
| OE5 | SUS promedio > 70/100, ningún resultado < 50/100 y completación de tareas > 85 %. |
| OE6 | Estabilidad de contenedores locales, sin caídas > 5 minutos, y respuesta promedio < 5 segundos. |

Estos son criterios para evaluaciones futuras; este cambio documental no acredita
su cumplimiento experimental.

Como estado técnico, una muestra warm exploratoria de cinco solicitudes HTTP
exitosas registró media de 12195.50 ms, mediana de 12353.39 ms, mínimo de 10820.68 ms
y máximo de 13511.09 ms; 0/5 estuvieron por debajo de 5000 ms. La referencia
histórica de OE6 no se cumplió en esa muestra. No es un benchmark exhaustivo y no se
modifica ni se acredita OE6. Véase
[la evidencia versionada](../eval/generation/results/g2-rag-e2e-smoke-2026-10-01.md).

## Estado validado y trabajo pendiente

La migración inicial `infra/db/001_initial_schema.sql` ya fue ejecutada sobre PostgreSQL
local desechable y la suite A–K fue ejecutada. El core de ingesta implementa preflight,
carga de 64 registros estructurados sintéticos, documentos/chunking, embeddings,
publicación atómica y recovery/retry. También están implementados Approval Registry,
vínculos approval↔source, procedencia del runtime checkout, operaciones internas
`execute`/`retry`/`recover`/`status`, observación del WriterLease, transporte HTTP,
Bearer service token y parser de configuración operacional. Véanse
[documentación física](../infra/db/README.md) y [evidencia/límites](../infra/db/tests/README.md).
La E2E real de Implementación 3 acreditó 76 items procesados, 12 versiones ready,
60 chunks, 60 embeddings reales y `already_current`, pero usó una
`implementation_revision` TEST/sintética. Recovery/retry fue validado después con
PostgreSQL real y embeddings TEST_ONLY; son ejecuciones separadas.

Los contratos `backend/mcp-server/tools-contract.md` y
`backend/mcp-server/tools.contract.json`, versión `2.0.0-draft`, están congelados para
implementación. La eliminación de Google Sheets, identidad sintética y diseño de
evidencia/enlaces ya están resueltos; no son pendientes de rediseño. El sufijo draft
se conserva hasta disponer de implementación validada.

- SQL: pendientes pruebas de permisos con roles no propietarios, concurrencia y
  reintentos avanzados descritos en su documentación; no repetir como pendiente A–K.
- Operación de ingesta: startup/composición HTTP y `/status` validados localmente;
  siguen pendientes workflow N8N versionado, `/execute` y E2E orquestada, topología
  para despliegue futuro y permisos/roles mínimos.
- Consulta implementada: Intent Router determinista, fast paths de progreso,
  calendario y anuncios, los tres endpoints REST descritos arriba, retrieval exacto,
  Document RAG directo con generación Ollama, citas y persistencia; vertical slice
  RAG E2E real con HTTP 201.
- Consulta pendiente: Agent/ReAct real, integración productiva del MCP interno al
  fallback y validación E2E de endpoints REST implementados.
- Producto/evaluación: app móvil, autenticación de usuario final, RAGAS/MRR y pruebas
  con usuarios, y notificaciones push reales.

Las decisiones confirmadas en `AGENTS.md` prevalecen sobre referencias históricas.
