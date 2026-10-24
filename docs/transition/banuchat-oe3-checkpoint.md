# CHECKPOINT BANUCHAT — OE3

Fecha de verificación: 2026-10-24. Base:
`41649c2ac2881fe3b166a1e7aa920a2b36b2f098`.

## Resultado

OE3 queda implementado para el corpus sintético: `agent_fallback` de REST ejecuta
una política acotada de selección, llamada, observación y decisión sobre el servidor
MCP existente. Los fast paths siguen directos. `ccd_local` conserva Document RAG
directo y no recibe consultas MCP sintéticas.

## A–F. Implementación y seguridad

- Se reutilizan las seis tools, sus servicios de aplicación, PostgreSQL/pgvector,
  Ollama de embeddings, el Intent Router, la persistencia/citas y el transporte stdio.
- `backend/api/src/agent/mcp-client.ts` usa el SDK cliente 2.3.1, fija la revisión
  `2026-07-28`, compara el catálogo completo y valida inputs, outputs y errores con
  los schemas vigentes. Solo admite las seis tools de lectura.
- El cliente inicia un proceso MCP por turno con `MCP_PROFILE_KEY` procedente del
  contexto de conversación, nunca de argumentos generados. Aplica 10 s al handshake,
  15 s por llamada, buffer de 256 KiB y cierre obligatorio.
- `backend/api/src/agent/bounded-mcp-agent.ts` permite como máximo dos pasos y dos
  llamadas, 30 s totales y 32 KiB por observación. Una tarea de más de dos fuentes
  pide dividir la consulta. Una observación vacía detiene la secuencia.
- Cada resultado debe pertenecer a la release fijada por la conversación. Un cambio
  entre pasos aborta sin mezclar evidencia. Las citas MCP pasan por la validación y
  persistencia REST ya existentes.
- No hay tools genéricas, red abierta, escrituras, endpoints MCP públicos, cambios
  SQL, cambios REST, ni modificaciones a corpus, Mobile, Docker, N8N u OE1/OE2.

## G. Demostración reproducible

Comando desde `backend/api`:

```powershell
node --import tsx --test test/agent-mcp.test.ts
```

La ejecución verificada produjo 12/12 pruebas aprobadas. Es una demostración con el
cliente SDK y transporte stdio reales; el servidor usa el arnés declarado
`backend/mcp-server/test/stdio-fixture.ts`, cuyos SQL y embeddings son dobles en
memoria. No se presenta como E2E PostgreSQL/Ollama.

| Tarea/condición | Selección o resultado esperado | Observado |
| --- | --- | --- |
| Pregunta documental simple | `search_knowledge` | PASS |
| Consulta estructurada | `get_courses` | PASS |
| Tarea de dos tools | progreso → anuncios | PASS |
| Relación de dos fuentes | citas `profile_course` + `announcement`; sin inferir elegibilidad | PASS |
| Selección estructurada incorrecta | se evita; usa evidencia documental | PASS |
| Coherencia entre preguntas relacionadas | antecedente de usuario selecciona anuncios; respuesta previa no es evidencia/instrucción | PASS |
| Tool no disponible | error de dependencia saneado | PASS |
| Ausencia de evidencia | abstención, sin segunda llamada ni citas | PASS |
| Release cambia entre pasos | aborta y cierra sesión | PASS |
| Límite de pasos | una llamada con límite 1 y abstención | PASS |
| Aislamiento CCD | Document RAG; cero aperturas MCP | PASS |
| Ausencia de escritura | catálogo cerrado; nombre no autorizado rechazado antes de MCP | PASS |

La traza de prueba registra intención, tools seleccionadas, orden, fases
`selection/execution/observation/decision`, número de llamadas, identificadores de
evidencia y razón terminal. La respuesta final y las citas se comprueban por
aserciones; los errores y abstenciones permanecen como casos, no se ocultan.

Verificación adicional ejecutada:

- API: `npm run typecheck`, `npm run build` y `npm test`: 614/614 PASS.
- MCP: `npm run typecheck` y `npm test`: 24/24 PASS.
- Dependencias productivas API: `npm audit --omit=dev --json`: 0 vulnerabilidades.
- Repositorio: `git diff --check`: sin errores.

## H. Cumplido y pendiente

Cumplido: cliente MCP interno, selección controlada, secuencia real de dos llamadas,
observación intermedia, abstención, límites, conexión al fallback, citas/procedencia,
coherencia de release, separación sintético/CCD y pruebas unitarias/integradas con
fixture stdio.

Pendiente operacional: en la sesión de verificación no estaban definidas
`MCP_POSTGRES_DB`, `MCP_POSTGRES_USER` ni `MCP_POSTGRES_PASSWORD`, y solo estaban
activos contenedores CCD. Por ello no se ejecutó PostgreSQL/Ollama sintético real.
Debe crearse o suministrarse una identidad sintética con `USAGE` de schema, `SELECT`
de las tablas necesarias y `EXECUTE` solo de las dos funciones de retrieval, sin
superusuario, ownership, CREATE ni privilegios de escritura. El servidor verificará
esos privilegios al arrancar. No se tocaron roles CCD.

## I. Riesgos y dependencias OE4–OE6

- OE4: una futura orquestación no debe introducir N8N en el camino síncrono ni
  relajar la publicación/current release que el agente valida.
- OE5: la política funcional no acredita SUS, completación con usuarios ni calidad
  percibida. Las respuestas combinadas son deliberadamente conservadoras.
- OE6: iniciar un proceso stdio por turno privilegia aislamiento y cierre verificable,
  pero su latencia debe medirse con la identidad real antes de afirmar objetivos de
  rendimiento o estabilidad.
- Una integración MCP CCD requiere contrato, tools y autorización propios; no puede
  reutilizar automáticamente perfiles ni credenciales sintéticas.

## J. Estado del checkpoint

Incremento funcional OE3 completado en código y fixtures. Aceptación operacional
PostgreSQL/Ollama: **pendiente por credencial sintética de mínimo privilegio y runtime
sintético activo**. No se avanzó a OE4 y no se hizo commit ni push.
