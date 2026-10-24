# MCP Server

Servidor interno de lectura sintética, ejecutable por stdio. El fallback sintético
de la API REST lo consume mediante el cliente MCP acotado de
`backend/api/src/agent`; los fast paths no pasan por MCP. La app continúa
consumiendo únicamente REST. `ccd_local` conserva Document RAG directo y nunca
abre este servidor sintético.

## Contrato de interfaces 2.0.0-draft

- [Contrato funcional](tools-contract.md).
- [Contrato JSON](tools.contract.json).

Catálogo congelado por autorización expresa para la siguiente implementación:
search_knowledge, find_documents, get_courses, get_calendar_events,
get_announcements y get_profile_progress, en ese orden.

Las seis tools son de solo lectura sobre la release vigente del corpus sintético;
devuelven release_id y procedencia reproducible. El perfil de demostración procede
del contexto controlado del backend, no de un argumento del agente. No hay fuentes
externas, selección histórica ni escrituras de corpus. El calendario procede de
`/data/synthetic/calendars`. La API REST ya resuelve artefactos documentales para la app.

## Ejecución local — BCH-04/M01.1

Desde `backend/mcp-server`, instalar con `npm ci --ignore-scripts` y ejecutar
`npm start` desde el cliente stdio local. El cliente debe lanzar el proceso en
esta carpeta: `node --import tsx src/main.ts`. Requiere Node >=22, dependencias
API ya instaladas para las superficies TypeScript compartidas, PostgreSQL y
Ollama locales existentes. No ejecuta migraciones ni ingesta.

Configuración confiable del proceso, sin secretos en argumentos de herramientas:

| Variable | Uso |
| --- | --- |
| `MCP_POSTGRES_DB` | Base sintética existente; nombre CCD rechazado y dataset/manifiesto verificados |
| `MCP_POSTGRES_USER`, `MCP_POSTGRES_PASSWORD` | Credencial de lectura específica; no hereda `POSTGRES_*` ni usa propietario como fallback |
| `MCP_POSTGRES_HOST` | Opcional, solo `127.0.0.1` |
| `MCP_POSTGRES_PORT` | Opcional, 5432; rechaza el puerto CCD 55433 |
| `MCP_PROFILE_KEY` | Perfil sintético elegido por operador; omitir produce `PROFILE_CONTEXT_REQUIRED` al consultar progreso |

`BANUCHAT_DEMO_MODE`, si está presente, debe ser `synthetic`. Ollama está fijado al
servicio local `http://127.0.0.1:11434`; se reutilizan el cliente de embedding y la
receta almacenada, sin generar vectores documentales. No se acepta URL del modelo.

No hay listener HTTP, autenticación institucional, conexión CCD/Sheets ni tools de
escritura. stdout contiene exclusivamente protocolo; errores y logs mínimos van
por stderr. No pasar secretos mediante `EXPO_PUBLIC_*`, argumentos o mensajes MCP.

El arranque requiere sesión read-only **y privilegios efectivos de lectura**:
rechaza superusuario, propietario con CREATE en schema, privilegios de escritura,
secuencias con USAGE/UPDATE y acceso a otras funciones SECURITY DEFINER. Se
permiten las dos firmas de retrieval existentes. Verifica current sintético y
repite la frontera de dataset/manifiesto en las consultas. Una identidad propietaria
no se vuelve de privilegio mínimo por añadir `default_transaction_read_only=on`.
El proceso no crea roles ni cambia permisos. El operador debe obtener previamente
una identidad autorizada con SELECT sobre las tablas requeridas, USAGE de schema y
EXECUTE sobre las dos funciones de recuperación, sin privilegios de escritura.

La credencial local inspeccionada durante M01.1 era superusuario/propietaria;
**no se usó para ejecutar tools**. El camino real PostgreSQL/Ollama sigue pendiente
de credencial adecuada. Véase el [checkpoint M01.1](../../docs/transition/bch04-m01-1-checkpoint.md).

## Protocolo y arquitectura interna

SDK oficial `@modelcontextprotocol/server` **2.3.1** fijado y cliente de pruebas
`@modelcontextprotocol/client` **2.3.1**. Revisión explícita **2026-07-28**:
`server/discover`, versión/capacidades por petición y `resultType` en wire.
Se rechaza handshake legacy; no se anuncia la revisión moderna mediante initialize.
El cliente oficial normaliza resultados y retira campos exclusivos del wire.

`src/server.ts` usa el servidor de bajo nivel para conservar los schemas exactos
y la clasificación congelada: tool/argumentos desconocidos o inválidos por schema
son error de protocolo; combinación semántica inválida y fallos de dependencia
son errores de ejecución saneados. Ajv valida sin coerción, eliminación de campos
o defaults mutantes. Las funciones de aplicación materializan los defaults.

Las seis tools delegan en `backend/api/src/application/mcp-synthetic-reads.ts`.
Cada lectura estructurada reúne current y registros en una sentencia parametrizada.
Reutiliza proyecciones/validadores/normalizadores de servicios REST, cuyo lookup
documental exacto conserva su comportamiento. Los filtros parciales literales de
MCP se aplican antes de LIMIT mediante `strpos(lower(...),lower(...))` con
collation explícita `pg_catalog."C.utf8"`, sin normalizar ni quitar acentos.
El arranque exige UTF-8 y esa collation existente, para evitar depender de una
locale arbitraria. No se crea ni instala una collation si falta. La comprobación
real de caracteres acentuados queda pendiente del entorno de lectura autorizado.
No se interpretan `%`/`_` como comodines.

Retrieval utiliza `current_retrieval_context` y `search_chunks_cosine` existentes;
si cambia current, obtiene contexto y embedding nuevos una sola vez. Una segunda
transición devuelve indisponibilidad. Mantiene el orden SQL y calcula el hash del
texto UTF-8 exacto. `full_document` solo aparece en búsqueda de metadata, sin
fragmentarlo o vectorizarlo. La salida se valida antes de producir
`structuredContent` y su JSON idéntico en un único bloque de texto.

## Verificación

```powershell
npm run typecheck
npm test
```

Las pruebas incluyen SDK cliente-servidor y procesos stdio reales, con SQL y
embeddings **dobles en memoria**, además de pruebas de lectura/seguridad.
`test/stdio-fixture.ts` es un arnés de pruebas separado del arranque productivo;
no constituye conexión PostgreSQL/Ollama. No configurar ese arnés para uso funcional.

La integración cliente-servidor y la política multietapa están verificadas con el
SDK y el transporte stdio reales, usando SQL/embedding dobles explícitos. La
verificación PostgreSQL/Ollama real continúa condicionada a una credencial MCP de
lectura con privilegios mínimos; no se reutiliza la cuenta propietaria. MCP para CCD
permanece fuera del alcance autorizado.
