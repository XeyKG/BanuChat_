# BanuChat — OE3/OE4, incremento 01 — checkpoint final

**29 de octubre de 2026, Bogotá.**
**Estado: `BANUCHAT_OE3_OE4_AGENT_ORCHESTRATION_VALIDATED`.**
Validación local acotada; no certifica cumplimiento integral de OE3/OE4.

1. **N8N recuperado y operativo.** La causa inicial fue el contenedor Unified
   detenido, con salida 0 y política de reinicio `no`. Conservaba imagen fijada,
   volumen propio, credencial vinculada, workflow publicado y puerto
   `127.0.0.1:15679 → 5678`. Se inició sin recrear servicios ni volúmenes. El
   workflow ahora devuelve `authorized / invoke_bounded_mcp_agent` hasta dos
   fuentes, o `clarification_required / request_clarification` cuando se supera
   ese presupuesto. Valida UUID, rama, capacidad y anchura; la API comprueba
   operación, release, estado y directiva. La transición evita abrir MCP para
   solicitudes demasiado amplias y conserva la comprobación independiente del
   agente. N8N no recibe consultas, documentos, perfiles ni credenciales de base
   de datos; solo usa su autenticación de servicio.

   El actualizador conserva un export privado y restaura únicamente el workflow
   si falla la actualización. Las primeras publicaciones se restauraron porque
   `/healthz` respondía antes de registrar el webhook; se corrigió la espera de
   disponibilidad. La versión final pasó ambos probes. El workflow evita guardar
   payloads de ejecuciones nuevas, incluido el header de autenticación. La
   correlación y decisiones se registran desde la API sin texto del usuario ni
   documentos. Es una admisión operacional; no es un gestor persistente de estados
   de negocio ni controla la transacción de historial.

2. **Agente adaptativo determinista.** Interpreta fuentes solicitadas y selecciona
   la primera herramienta; después de cada resultado validado decide continuar,
   responder, aclarar o abstenerse. Metadatos vacíos permiten buscar contenido
   explícitamente solicitado en el mismo corpus; `full_document` pide aclaración
   sin fragmentar/vectorizar. La combinación documento/contenido exige identidad
   documental común, y fechas de cursos propios exigen eventos asociados a los
   cursos observados. La falta de correspondencia produce abstención. Se mantiene
   el sujeto del último antecedente del usuario en seguimientos, sin adoptar
   instrucciones del asistente o del contenido recuperado.

   Permanecen seis herramientas de lectura, dos pasos/llamadas, 30 s, observaciones
   de 32 KiB, releases independientes fijadas y control de cuenta/propietario.
   Las sesiones tardías se cierran; los resultados inyectados también pasan el
   schema MCP congelado. Las trazas registran herramientas realmente seleccionadas,
   evidencias, decisiones y motivo terminal. La salida distingue documentos CCD
   de datos auxiliares ficticios. No hay herramientas de escritura ni ampliación
   de permisos mediante resultados o decisiones del modelo.

3. **Seis herramientas MCP comprobadas en Unified real.** Se verificaron discovery,
   contratos, resultados no vacíos con procedencia y releases correctas:

   | Herramienta | Elementos devueltos en la llamada limitada | Tiempo de llamada |
   | --- | ---: | ---: |
   | `search_knowledge` | 5 | 4256 ms |
   | `find_documents` | 4 | 26 ms |
   | `get_courses` | 10 | 24 ms |
   | `get_calendar_events` | 10 | 31 ms |
   | `get_announcements` | 2 | 25 ms |
   | `get_profile_progress` | 5 | 27 ms |

   Son resultados de esas llamadas, no totales del corpus. Se corrigieron tres
   defectos: búsqueda documental MCP por identidad/título literal y modo en un
   snapshot, conservando la etiqueta de versión real; selección de evidencia CCD
   1.3/1.4 a partir del manifiesto adoptado en lugar de localizadores antiguos;
   clasificación de `REQUEST_TIMEOUT` del SDK. No se cambió el contrato MCP ni
   la búsqueda REST. Se comprobaron vacíos, caracteres literales, cierre y timeout,
   pins obsoletos, argumentos desconocidos, herramientas de escritura inexistentes
   y perfil ajeno rechazado por JSON-RPC. Dos cuentas sintéticas conservaron sus
   propios perfiles, aunque se proporcionara una pista de perfil distinta al
   proceso MCP. El rol lector no tiene DML, administración ni bypass RLS.

4. **Experimento con Ollama local.** Se mantuvieron modelo y runtime instalados:
   `qwen3:4b-instruct`, digest
   `0edcdef34593eac1aa2be9c7d06c432dcf81945adca5eca2f27662c18f168ba0`,
   Ollama `0.35.0`; temperatura 0, seed 42, contexto 4096, máximo 64 tokens y 12 s
   por decisión, dentro del presupuesto total del agente. Los 18 escenarios se
   definieron antes de medir. A usa el agente del commit
   `f2724505fa4a0543b64644cb8ce21e36c34592a7`; B usa reglas adaptativas; C comparte
   primera selección y barreras de B y consulta realmente al modelo después de
   una observación validada. Se hicieron 13 llamadas al modelo en esta medición.

   | Medida | A anterior | B adaptativo | C LLM tras observación |
   | --- | ---: | ---: | ---: |
   | Casos con orden y resultado esperados | 12/18 | 18/18 | 13/18 |
   | Selección ordenada esperada | 15/18 | 18/18 | 14/18 |
   | Respuestas esperadas con cobertura de fuentes | 5/6 | 6/6 | 2/6 |
   | Abstenciones esperadas | 3/7 | 7/7 | 7/7 |
   | Fallos esperados rechazados como error | 4/5 | 5/5 | 4/5 |
   | Mediana / máximo por caso | 1 / 4 ms | 1 / 144 ms | 450 / 6946 ms |

   A/B usan MCP sintético en memoria en este experimento; C añade Ollama real.
   Los máximos incluyen inicialización en frío; las medianas incluyen casos que
   terminan antes de abrir dependencias. No representan latencia HTTP. Cobertura
   de fuentes es un criterio mecánico de citas, no una evaluación semántica general.
   El error de A ante sujeto ajeno consiste en contestar con su perfil acotado;
   no se demostró una fuga real entre cuentas. El caso de propietario incompatible
   inyecta una respuesta MCP sintética. Las barreras compartidas explican la
   seguridad de C; no se atribuye al modelo una garantía intrínseca de seguridad.

   Un piloto previo que también cedía la selección inicial al modelo obtuvo 4/18
   y se conserva separado. La revisión del protocolo, declarada antes de la segunda
   medición, evaluó concretamente decisiones tras observaciones. En C persistieron
   abstenciones prematuras en dos fuentes y seguimiento, no se completó la búsqueda
   tras metadata vacía, y el contenido malicioso provocó abstención segura en vez
   de una respuesta completa. **Decisión: B permanece como política productiva.**
   C queda en el script experimental, sin configuración que lo active en la app.

5. **Prueba integrada y servicio habitual.** Las 15 comprobaciones operativas
   pasaron con REST v2 autenticado, N8N publicado, stdio MCP, PostgreSQL Unified y
   Ollama reales. Incluyeron progreso/convocatorias, documentos/catálogo,
   seguimiento, ausencia de evidencia, límite de fuentes, datos ajenos, citas e
   historial recuperados, aislamiento de conversación y de cuenta, errores de
   protocolo, pins obsoletos, timeout y privilegios. Al detener N8N, la consulta
   multifuente devolvió 503, sin agente ni mensajes persistidos; progreso siguió
   respondiendo 200. El contenedor se volvió a iniciar.

   Las ejecuciones de agente HTTP registradas tardaron 4365, 4263, 4602 y 5625 ms
   incluyendo admisión y sesión MCP. Una comparación directa real del caso de dos
   fuentes midió A=4053 ms y B=4030 ms: un único caso, sin afirmar mejora de latencia.
   La API habitual se reinició con el entrypoint existente y código actualizado,
   en loopback `3004`. Un smoke autenticado adicional pasó por N8N y dos herramientas,
   devolvió citas de ambas fuentes y confirmó historial; turno más lectura de
   historial: 5020 ms. N8N terminó con health 200. Los fingerprints legibles de
   versiones documentales, publicaciones y punteros coincidieron antes/después.

6. **Validación realmente ejecutada.** Pasaron `npm run typecheck` de API,
   `npm run typecheck:unified` y `npm run typecheck` de MCP. Pasaron 61 pruebas API
   pertinentes en cinco archivos; las 24 pruebas MCP existentes y cuatro nuevas
   de adaptadores. Las nueve pruebas stdio se repitieron tras añadir el fixture
   lento para la regresión del timeout. Pasaron los 18 escenarios de B, las 15
   comprobaciones operativas y el smoke de `3004`. También se ejecutó
   `git diff --check`. No se ejecutaron Android físico ni las 43 preguntas OE1.

7. **Límites y recomendaciones.** La selección de intención sigue usando reglas
   léxicas; no comprende consultas arbitrarias. Se detecta incompatibilidad de
   identidades, no toda contradicción semántica entre textos. La recuperación MCP
   filtra candidatos del top-k genérico: puede omitir evidencia fuera de ese
   conjunto o una variante nominal no reconocida. El lector MCP no tiene permiso
   para la función SQL de recuperación acotada; no se concedió ni se aumentó top-k
   silenciosamente. El rol runtime no permite leer directamente fragmentos: el
   fingerprint no cubre esa tabla. Los cambios de release entre pasos fueron
   simulados; en vivo se rechazaron pins obsoletos sin mover publicaciones.
   Las mediciones son de desarrollo y no son ciegas ni generalizables. N8N sigue
   limitando disponibilidad de esta rama y no se configuró reinicio automático.
   La próxima evaluación del modelo necesitaría otros escenarios reservados,
   criterios semánticos independientes y medición de latencia bajo carga antes
   de considerar activación.

8. **Implicaciones para OE3/OE4.** OE3 dispone de un ciclo real de observación y
   acción gobernado por reglas, MCP de lectura probado y procedencia persistida.
   OE4 dispone de una rama conversacional real con admisión N8N, correlación,
   transición de aclaración y fallo seguro verificado. La participación iterativa
   del LLM se demostró solo en el experimento. No se declara ReAct dirigido por
   LLM en producción, BPM institucional general, integración real de Sheets ni
   cumplimiento integral de los objetivos académicos.

## Archivos y evidencia

Se modificaron/crearon únicamente:

- API: `src/agent/bounded-mcp-agent.ts`, `src/agent/mcp-client.ts`,
  `src/orchestration/n8n-conversation.ts`, `src/auth/unified-product.ts`,
  `src/authenticated-main.ts`, `src/application/messages.ts`;
  `scripts/evaluate-agent-orchestration.mts`,
  `scripts/evaluate-unified-agent-orchestration.mts`,
  `scripts/update-unified-conversation.mts`, `tsconfig.unified-check.json`;
  `test/agent-mcp.test.ts`, `test/n8n-conversation.test.ts`,
  `test/adaptive-agent.test.ts`, `test/agent-scenarios.ts`,
  `test/fixtures/agent-observations.ts`.
- MCP: `src/unified-main.ts`, `src/unified-documents.ts`,
  `src/unified-knowledge.ts`, `test/stdio-fixture.ts`,
  `test/unified-reads.test.ts`.
- N8N: `n8n/workflows/oe4-conversation-v1.json`.
- Evaluación: este checkpoint, [README](README.md),
  [escenarios](scenarios.json) y [resultados públicos](results/2026-10-29-summary.json).

Los prefijos API/MCP corresponden a `backend/api/` y `backend/mcp-server/`.
La reproducción está en el README. Payloads CCD, respuestas, trazas completas,
backups del workflow y resultados de ambos experimentos quedan exclusivamente en
`infra/local/oe3-oe4-increment-01/`, excluido de Git. No se modificaron corpus,
baseline OE1, resultados históricos, esquemas SQL, contratos REST/MCP, credenciales ni modelos
instalados. Las escrituras operativas fueron sesiones e historial de cuentas
sintéticas y la actualización respaldada del workflow local. Sin commit ni push.
