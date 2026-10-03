# API REST — especificación

Contrato REST v1 documentado para la app React Native, con base `/api/v1`.
Este directorio implementa servidor y handlers REST; Agent/ReAct no está implementado.
El fallback conversacional actual es Document RAG directo.

- [OpenAPI 3.1.0](openapi.yaml): contrato `1.0.0-draft`, serializado en JSON
  (subconjunto de YAML 1.2) para facilitar validación local sin dependencias.
- [Contrato humano](api-contract.md): endpoints, citas, consistencia, errores,
  reintentos y trazabilidad con PostgreSQL y MCP 2.0.

Los mensajes pasan por Intent Router: las rutas `profile_progress`,
`calendar_events` y `announcements` ejecutan servicio compartido y renderer
determinista; las demás decisiones van a Document RAG directo como fallback actual.
Agent/ReAct y MCP permanecen pendientes dentro de la arquitectura objetivo.
La clasificación no usa LLM, embeddings ni N8N; el fast path no llama a MCP.
El catálogo del router es `1.1.0-draft`. M3.1 añadió `lexical_patterns` de score 90:
cada regla exige todos sus grupos de señales delimitadas y consume el mensaje
completo con hasta cinco tokens residuales de su propia lista `allowed_fillers`.
Un residual desconocido deja la decisión en fallback; no hay stemming ni fuzzy
matching. Los fast paths productivos siguen siendo solo progreso, calendario y
anuncios. La regresión ejecuta los casos históricos y M3.1 de `cases.json`.
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
  productivamente; [intent-router.test.ts](test/intent-router.test.ts) lo prueba
  directamente y [J2](test/intent-http-integration.test.ts) lo prueba por HTTP.
