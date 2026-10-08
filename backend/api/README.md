# API REST — contrato y estado implementado

Contrato REST v1 documentado para la app React Native, con base `/api/v1`.
Este directorio implementa servidor y handlers REST; Agent/ReAct no está implementado.
El fallback conversacional actual es Document RAG directo.

El cliente Ollama de query usa `options.num_ctx` de la receta de la release
consultada. Comprueba que el contexto nativo anunciado por `/api/show` sea al
menos el solicitado y mantiene la dimensión exacta; ambos valores pueden ser
distintos. La release observada en L1-B, `6a770ce7-13b7-4b0b-95ae-0c193fa0d655`, usa
`document.options.num_ctx=32768` y `query.options.num_ctx=4096`. Su medición
L1-B ya fue ejecutada y está [versionada](../../eval/generation/results/l1-b-rag-latency-2026-10-03.md).
Esto no verifica qué release está activa en una base local hoy ni acredita OE6.

- [OpenAPI 3.1.0](openapi.yaml): contrato `1.0.0-draft`, serializado en JSON
  (subconjunto de YAML 1.2) para facilitar validación local sin dependencias.
- [Contrato humano](api-contract.md): endpoints, citas, consistencia, errores,
  reintentos y trazabilidad con PostgreSQL y MCP 2.0.

Los mensajes pasan por Intent Router. Tres fast paths respaldados por datos,
`profile_progress`, `calendar_events` y `announcements`, ejecutan servicio compartido
y renderer determinista. Las rutas `basic_social`, `capabilities_help` y
`known_out_of_scope` usan renderers estáticos deterministas, sin SQL de dominio,
embeddings ni generación. Las rutas todavía no implementadas productivamente y
`agent_fallback` van a Document RAG directo como fallback actual.
Agent/ReAct y MCP permanecen pendientes dentro de la arquitectura objetivo.
La clasificación no usa LLM, embeddings ni N8N; el fast path no llama a MCP.
El catálogo del router y el `$id` del schema son `1.2.0-draft`.
M3.1 añadió `lexical_patterns` de score 90:
cada regla exige todos sus grupos de señales delimitadas y consume el mensaje
completo con hasta cinco tokens residuales de su propia lista `allowed_fillers`.
Un residual desconocido invalida esa regla léxica. M3.2 añade matching ponderado
para progreso, catálogo, calendario y anuncios cuando no hay evidencia de las reglas
previas: suma grupos únicos, penaliza contenido desconocido/señales ajenas y exige
al menos dos grupos, score ≥80 y margen ≥20, conservando guards y fallback.
No hay stemming, fuzzy matching ni clasificación con IA. La regresión conserva
los casos históricos/M3.1 de `cases.json`; las evaluaciones M3.2 se indexan en
[eval](../../eval/README.md). Clasificar `course_catalog` no implementa su fast path.
Las consultas REST directas usan los mismos servicios de aplicación y su futura
reutilización por MCP sigue pendiente. La app consume únicamente REST, nunca MCP ni
N8N. El servidor implementa además historial, artefactos documentales y lecturas HTTP
directas de calendario, progreso y anuncios; revisar `src/http/api-server.ts`.
Solo se emplean perfiles y datos sintéticos de demostración.
No se incluye autenticación institucional ni catálogo REST de cursos en v1.

### Configuración del listener

Por defecto, el API escucha solo en loopback con `BANUCHAT_API_HOST=127.0.0.1`.
Para una prueba temporal desde un celular real en la misma red LAN privada/de
confianza, configura `BANUCHAT_API_HOST=0.0.0.0` y conecta el celular a la IPv4
privada del PC, por ejemplo `http://<IP-LAN-DEL-PC>:3000/api/v1`. El celular no
debe consumir `0.0.0.0` directamente. La API todavía no implementa autenticación
de usuario final, por lo que este bind LAN es solo para desarrollo/demostración;
en Windows, limita cualquier regla o permiso del firewall a la red privada.
No expongas el API a Internet, no configures port forwarding ni uses una red
pública. `BANUCHAT_API_HOST` solo controla el listener HTTP REST; PostgreSQL
mantiene su host fijo en `127.0.0.1`.

- [Especificación del router](../../docs/enrutamiento-intenciones.md) y
  [ADR 0004](../../docs/adr/0004-enrutamiento-determinista-intenciones.md).
- [Catálogo declarativo](intent-routing.catalog.json) y
  [JSON Schema Draft 2020-12](intent-routing.schema.json), que valida catálogo y casos.
- [Casos de diseño](../../eval/intent-routing/cases.json): expectativas de clasificación,
  no resultados ejecutados ni preguntas RAGAS. El router sí está implementado
  en el runtime del prototipo; [intent-router.test.ts](test/intent-router.test.ts) lo prueba
  directamente y [J2](test/intent-http-integration.test.ts) lo prueba por HTTP.
