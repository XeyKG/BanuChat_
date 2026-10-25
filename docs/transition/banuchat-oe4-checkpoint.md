# CHECKPOINT BANUCHAT — OE4

Fecha de verificación: 2026-10-24 (America/Bogota). Base:
`9023cbb3d5a496200dc43e0a95fdc659879ffd1d`.

## Resultado

OE4 entrega un incremento funcional sintético y acotado: una consulta multifuente
puede solicitar a N8N una transición correlacionada antes de usar el agente MCP OE3;
el calendario puede aplicar un delta representativo de Sheets y publicar una release
completa sin duplicados. Fast paths y CCD conservan su comportamiento.

No se declara OE4 completo respecto del anteproyecto. Falta una hoja Google Sheets
autorizada, su credencial y la medición real ≤30 min. También falta la credencial
PostgreSQL sintética MCP de solo lectura para ejecutar el E2E completo
API → N8N → agente → MCP → PostgreSQL. No se sustituyó por la cuenta propietaria.

## A. Componentes reutilizados

| Componente | Reutilización |
| --- | --- |
| REST y `sendMessage` | Conservan contexto, release, validación de respuesta/citas y persistencia atómica del turno. |
| Intent Router | Los fast paths continúan directos; no clasifica con N8N. |
| Agente MCP OE3 | Misma selección determinista, máximo de pasos/calls, tools read-only y coherencia de release. |
| Servicios de aplicación/MCP | Mismas fuentes estructuradas, documentales y procedencia. |
| PostgreSQL/pgvector | Se clona la release vigente; no hay almacén paralelo ni cambio de schema. |
| Publicación de releases | `assert_release_complete` y `publish_release` siguen siendo la autoridad. |
| Calendar REST/Mobile | El endpoint y pantalla existentes leen `current`; no cambió el contrato público. |

## B. Decisión arquitectónica

La contradicción y su resolución están en
[ADR 0007](../adr/0007-orquestacion-conversacional-n8n-y-calendario.md).
La integración modifica deliberadamente la decisión anterior que excluía N8N del
chat, pero solo para fallbacks sintéticos multifuente. No se afirma que todo el
sistema use BPM.

Impactos: una llamada N8N añade latencia y dependencia de disponibilidad en esa rama;
timeout/fallo retorna 503 sin persistir. Fast paths no pagan ese costo. La publicación
de calendario cambia `current`, por lo que una conversación antigua falla por cambio
de release en vez de mezclar evidencia. OE6 deberá medir capacidad, disponibilidad y
latencia con topología final.

## C–F. Flujos implementados

### Conversación

1. API fija release y contexto.
2. Router conserva fast path o emite fallback.
3. La política OE3 detecta si el plan requiere más de una tool.
4. API crea `operation_id` y llama al webhook Header Auth.
5. N8N acepta únicamente sintético + fallback + agente acotado y devuelve la misma
   correlación.
6. API ejecuta el agente MCP, construye la candidata, valida release/citas y persiste.

No hay recursión a REST público, SQL en N8N ni segundo cliente/agente. La selección
MCP sigue siendo determinista; ReAct dirigido por LLM no está acreditado.

### Calendario

El fixture separado en `eval/oe4/fixtures/calendar-sheet.json` representa filas de
una hoja, sin personas ni datos institucionales. Prueba modificación, alta,
cancelación y eliminación. El hash del archivo evita otra release; una referencia
desconocida, duplicado o fila inválida falla antes de publicar. Estado y procedencia
quedan en `manifest.calendar_sync`; la última release válida permanece disponible.

## G. Pruebas y evidencia ejecutada

| Caso | Tipo | Resultado observado |
| --- | --- | --- |
| Fast path sin N8N | Suite API existente/controlada | PASS; el orquestador solo se consulta tras `agent_fallback` multifuente. |
| N8N → agente → persistencia | Test integrado con N8N doble y MCP stdio fixture | PASS; orden `n8n`, `agent`, `persist`. |
| Webhook N8N 2.40.5 real | N8N local, Header Auth | PASS; devolvió operación correlacionada y directiva cerrada. |
| Fallo/timeout/correlación N8N | Unit/integration | PASS; dependencia no disponible y cero agente/persistencia. |
| MCP real con PostgreSQL | Operacional | NO EJECUTADO; falta identidad mínima read-only. |
| Calendario primera aplicación | PostgreSQL local real | PASS; 1 alta, 1 modificación, 1 cancelación, 1 eliminación; release publicada. |
| Calendario repetido | PostgreSQL local real | PASS; `unchanged`, sin release duplicada. |
| Workflow calendario N8N real | N8N → HTTP interno → TypeScript → PostgreSQL | PASS; 263 ms total observado, resultado `unchanged`. |
| Consulta calendario por REST | API real → PostgreSQL | PASS; alta/modificación presentes y cancelado/eliminado ausentes. |
| Integridad release | SQL real | PASS; 21 eventos, 60 chunks, 4 perfiles y `assert_release_complete` sin error. |
| CCD separado | Código/configuración | PASS en guardas; servicio rechaza DB/puerto CCD. No se ejecutó escritura CCD. |
| Mobile | Dispositivo/Expo | NO EJECUTADO; no había sesión Mobile disponible. |

Suites ejecutadas: API `npm run typecheck` y `npm test` (620/620 PASS); RAG
`npm run typecheck` y `npm test` (224/224 PASS). Los dos workflows y el fixture
pasaron parseo JSON. No se ejecutaron `npm run test:db`, E2E de ingesta completa,
Ollama ni pruebas CCD porque el cambio no requiere reembeddings ni modifica CCD.

Evidencia estructurada:
[`eval/oe4/results/oe4-local-evidence-2026-10-24.json`](../../eval/oe4/results/oe4-local-evidence-2026-10-24.json).

## H. Cobertura de §11.4 y reglas

§11.4 enumera capas, no un catálogo cerrado de reglas institucionales. La cobertura
se reporta contra esas cuatro capas y contra el proceso conversacional explícito, sin
inventar directrices.

| Flujo original | Regla/decisión | Fuente | Responsable | Estado | Caso | Resultado |
| --- | --- | --- | --- | --- | --- | --- |
| Ingesta/vectorización | Publicar solo release íntegra | Corpus sintético congelado | `backend/rag` + PostgreSQL | Reutilizado | Integridad de release OE4 | PASS local |
| Orquestación | Solo fallback multifuente sintético usa N8N | Intent + release fijados por API | API + workflow OE4 | Implementado acotado | Webhook correlacionado | PASS real N8N |
| Agente/fuentes | Máximo OE3, read-only, misma release | MCP estructurado/documental | API Agent + MCP | Integrado en tests; operacional parcial | Perfil + convocatorias | PASS controlado; E2E DB bloqueado |
| Generación/RAG | No inventar hechos sin evidencia | Chunks/documentos publicados | Backend | Reutilizado | Regresiones API/RAG | PASS suite pertinente |
| Presentación | REST conserva contrato/citas | Respuesta validada | API/Mobile | API verificada; Mobile pendiente | GET calendario | PASS API |
| Calendario Sheets | Identidad, cambios, cancelación, no duplicado | Fixture local declarado | N8N + `backend/rag` | Parcial | Primera/segunda sync | PASS técnico |
| Directrices institucionales | Abstenerse si no están ratificadas | Ninguna fuente nueva autorizada | Router/Agent/RAG | Conservado | Fuera de evidencia | Sin regla inventada |

## I. Métricas de sincronización

- Fixture determinista: `modified_at` máximo 2026-10-24 14:04 -05:00 y disponibilidad
  de prueba fijada 14:06 -05:00: 120 000 ms. Es una medición técnica controlada,
  marcada `publication_lag_verifiable=false`; no prueba cuándo cambió una hoja real.
- Ejecución N8N posterior: 263 ms total, 134 ms status y 111 ms sync, resultado
  `unchanged`. No es latencia fuente→BanuChat.
- Schedule exportado: cada 30 minutos, inactivo por defecto. No acredita el máximo de
  30 minutos y no sustituye la medición desde una modificación verificable de Sheets.

## J. Estado de requisitos OE4

| Requisito | Estado |
| --- | --- |
| Decisión y contradicción documentadas | Cumplido |
| Flujo conversacional real acotado en N8N | Parcial: webhook real; E2E MCP/DB bloqueado por credencial mínima |
| Fast paths preservados | Cumplido |
| CCD autenticado preservado | Cumplido por exclusión/guardas; sin regresión E2E CCD ejecutada |
| Integración con agente MCP existente | Cumplido en código y pruebas controladas |
| Google Sheets real | Pendiente por fuente/credencial autorizadas |
| Adaptador y fixture separado | Cumplido |
| Cambios/cancelaciones/no duplicados/último válido | Cumplido |
| Sincronización ≤30 min | Pendiente; no acreditable con fixture |
| Cobertura §11.4 | Parcial y explícita |
| Mobile | Sin cambio; verificación de esta release pendiente |

## K. Dependencias OE5/OE6

OE5 puede reutilizar la pantalla de calendario y REST sin cambio; debe verificar en
dispositivo la nueva release y no confundir perfil sintético con autenticación. OE6
debe aportar identidad MCP mínima, secretos gestionados, health checks, topología
N8N/backend, prueba de fallos y medición de latencia/capacidad. Si se mantiene Sheets,
requiere fuente autorizada y timestamp verificable; un conector real es trabajo
operacional pendiente, no una licencia para usar datos institucionales.

## L. Límite de entrega

No se modificaron REST público, MCP, SQL, Mobile, modelos, corpus CCD ni dataset v1.
No se hizo commit/push y no se avanzó a OE5.

Estado operacional al cierre: los contenedores sintéticos `banuchat-postgres` y
`banuchat-n8n` volvieron a estado detenido. La base sintética local conserva como
`current` la release OE4 `6cf074d2-8d8a-4e21-967d-68a5c94f6946`; la anterior se
conserva y no se ejecutó rollback. Los workflows se importaron para verificación y
quedaron inactivos; sus credenciales están en el almacén cifrado local de N8N, no en
Git. Las bases/contenedores CCD no se modificaron.
