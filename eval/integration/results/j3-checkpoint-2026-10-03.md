# J3 — Checkpoint de integración y cliente móvil del 2026-10-03

## Alcance y revisión

Este checkpoint registra el estado técnico observado de BanuChat con corpus
funcional exclusivamente sintético. La revisión técnica base, observada **antes**
del commit documental J3, es `52bcb10295360e0b633ac6cc180ca817ecbca49d`
(`Add HTTP integration tests for intent routing`). El commit que incorpore J3 será
posterior. En particular, esa revisión base no debe atribuirse a la ejecución
anterior de J1, cuyo registro mostró `d4e83c5`.

Se distinguen tres clases de evidencia: M1–M5 fueron validaciones **manuales** en
Android físico con Expo Go; J1 fue un smoke **operacional** contra servicios locales
reales; J2 es una prueba de integración **automatizada y controlada**. Ninguna de
ellas equivale por sí sola a una evaluación formal con usuarios o al cierre del
MVP académico completo.

## Cliente móvil: evidencia manual M1–M5

| Etapa | Observación manual en Android físico |
| --- | --- |
| M1 | Expo SDK 57, React Native + TypeScript y Expo Router arrancaron mediante Expo Go. |
| M2 | `GET /profiles` real mostró cuatro perfiles sintéticos; se seleccionó un perfil manualmente. Al apagar el backend apareció “No fue posible cargar los perfiles.”; tras restaurarlo, **Reintentar** recuperó la lista. |
| M3 | Se creó una conversación real, se enviaron mensajes y se visualizaron respuestas y citas. “Mi progreso” validó el fast path. La consulta documental registrada durante la prueba móvil, “¿Que información debo incluir al reportar una incidencia?”, obtuvo respuesta RAG con citas documentales. El cliente usa timeout de 90 segundos y no reintenta ciegamente `POST /messages` cuando el resultado de red puede ser incierto. |
| M4 | Calendario abrió sin perfil seleccionado, con ventana observada de 30 días y filtros Todos, Sesiones, Cierres y Generales. Presentó horas en `America/Bogota`. Una caída del backend mostró error controlado; **Reintentar** recuperó los eventos al restaurarlo. |
| M5 | Progreso requirió perfil seleccionado. Se probaron los cuatro perfiles sintéticos, con progresos distintos y filtros Todos, Inscritos, En progreso y Completados. Al apagar el backend apareció “No fue posible cargar el progreso.”; **Reintentar** volvió a cargarlo tras restaurarlo. |

En M4, para la ventana **2026-10-03 a 2026-11-01**, se observaron: Todos **15**,
Sesiones **11**, Cierres **2** y Generales **2**. En M5, para **Perfil Demo Alfa**,
se observaron: Todos **5**, Inscritos **2**, En progreso **1** y Completados **2**.
Estos conteos corresponden a la release sintética observada: no son reglas del
producto, valores hardcodeados ni métricas institucionales.

Las pruebas M1–M5 no fueron una suite automatizada. Este checkpoint no incorpora
logs, capturas versionadas ni instrumentación móvil adicional. La selección del
perfil sintético no equivale a autenticación o autorización de usuario final.
M3.1 sigue pendiente: debe refinar el reconocimiento determinista de expresiones
como “¿Cuál es mi progreso?”, “¿Cómo va mi avance?”, “Muéstrame cómo voy?” y
“¿Qué cursos he terminado?”.

## J1: smoke operacional con dependencias reales

Ejecución observada del [smoke J1](../run-j1-smoke.mjs):

```text
BanuChat J1 vertical smoke
revision: d4e83c5
api: http://127.0.0.1:3000/api/v1

PASS profiles                  58 ms
profile_key=profile-001 alias=Perfil Demo Alfa

PASS calendar                  11 ms
events=15

PASS progress                  16 ms
courses=5

PASS create_conversation       21 ms

PASS fast_path                 36 ms

PASS document_rag              24552 ms

PASS conversation_history      15 ms

PASS cleanup                   27 ms

J1 RESULT: PASS
```

En esa ejecución, J1 recorrió REST → PostgreSQL/pgvector → Intent Router → fast
path y Document RAG → Ollama → persistencia → historial → cleanup. La duración de
**24552 ms** es una sola observación del paso Document RAG; no es promedio,
benchmark, p95, SLA ni medida general de rendimiento, y por sí sola no acredita
cumplimiento ni incumplimiento de OE6. J1 no prueba la UI móvil, N8N, Agent/ReAct,
MCP interno, autenticación, producción, infraestructura UNAB/CCD, concurrencia o
calidad RAGAS. Su consulta documental usa la variante con acento
“¿Qué información debo incluir al reportar una incidencia?”; esto no cambia el
registro histórico de la variante móvil M3 anterior.

## J2: integración automatizada controlada

La revisión que incorpora [J2](../../../backend/api/test/intent-http-integration.test.ts)
es `52bcb10295360e0b633ac6cc180ca817ecbca49d`. Durante J2 se ejecutaron y
reportaron: test focal **2/2 PASS**, suite `backend/api` **401/401 PASS**,
`npm run typecheck` **PASS**, `npm run build` **PASS** y `git diff --check` **PASS**.
J3 no repitió esas pruebas.

**J2.1:** una solicitud HTTP real en proceso con “mi progreso” pasó por el router
real cargado desde `intent-routing.catalog.json`, seleccionó `profile_progress`,
ejecutó el servicio estructurado y entregó el turno a persistencia SQL controlada.
Se verificaron citas públicas `profile` y `profile_course`, con procedencia interna
enviada a persistencia. `Document RAG calls = 0`. La respuesta REST no expuso
`source_path`, `source_sha256` ni `citation_records`.

**J2.2:** una solicitud HTTP real en proceso recorrió el router real y la decisión
interna `agent_fallback`, que en el runtime vigente llama **Document RAG directo**.
El `DocumentRagResponder` determinista fue invocado una vez con el input exacto:

```text
release_id: 11111111-1111-4111-8111-111111111111
query: ¿Qué información debo incluir al reportar una incidencia?
```

Se verificaron una cita pública `source_kind=document`, la entrega de
`citation_records` documentales a persistencia y su ausencia en la respuesta
REST. J2 no usa PostgreSQL real, Ollama real, N8N ni mobile. No es E2E operacional
ni prueba Agent/ReAct.

J1 y J2 son complementarios: J1 observa el recorrido con PostgreSQL/pgvector y
Ollama reales; J2 protege de forma rápida y determinista la conexión HTTP, catálogo
y router reales, servicios, SQL controlado y stub RAG antes de modificar M3.1.

## Arquitectura y estado del producto

Implementación conversacional actual:

`Mobile Expo/React Native → REST Backend API → Intent Router determinista → fast path estructurado o Document RAG directo → persistencia de mensajes/citas → respuesta REST`

Los fast paths usan servicios de aplicación y PostgreSQL. Document RAG usa
PostgreSQL + pgvector y Ollama. N8N queda fuera de consultas síncronas y orquesta
la ingesta de forma asíncrona; su [ejecución manual N3](../../ingestion/results/n3-n8n-e2e-2026-10-02.md)
es evidencia separada.

La arquitectura **objetivo** conserva
`Mobile → REST Backend API → Intent Router → fast path o Agent/RAG → MCP interno cuando corresponda`.
Agent/ReAct y MCP interno siguen pendientes de implementación/integración en el
fallback; no están descartados.

El MVP móvil de demostración incluye API configurable, perfil sintético, creación
de conversación, chat, citas, loading/error, calendario y progreso de cursos,
con validación manual en Android físico. No incluye autenticación ni autorización
real, OAuth/OIDC, notificaciones push, modo offline, historial conversacional
visible en UI, publicación en Play Store, producción o infraestructura institucional.

## Límites y pendientes

Este checkpoint no acredita RAGAS/MRR completas, métricas de precisión o recall,
SUS medido, tasas de éxito de usuarios, disponibilidad, consumo de recursos,
cumplimiento de OE5/OE6 ni despliegue institucional. La evidencia exploratoria
previa de latencia RAG consta por separado en
[G2](../../generation/results/g2-rag-e2e-smoke-2026-10-01.md); no se reinterpreta
aquí como benchmark general. La relación académica entre OE5 y progreso/historial
de cursos queda pendiente de revisión posterior; J3 no modifica OE5.

Pendientes declarados después de J3:

- M3.1: refinamiento léxico/determinista del Intent Router.
- Agent/ReAct real e integración productiva del MCP interno.
- Autenticación y autorización de usuario final.
- RAGAS/MRR completas y pruebas formales con usuarios.
- Notificaciones push, si continúan como funcionalidad deseable.
- Flujos N8N de retry/recover/scheduled en una etapa posterior.
- Despliegue institucional, que no está acreditado.
