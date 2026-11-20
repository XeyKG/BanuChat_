# n8n en BanuChat

**Operación, 20/11/2026:** el editor publicado es **https://n8n.banuchat.duckdns.org**, con protección HTTPS adicional y cuenta propietaria de n8n. Usa la EC2 existente, servicio `banuchat-n8n`, instalación npm 2.40.5, usuario Linux separado y datos persistentes en `/var/lib/banuchat-n8n/.n8n`. No utiliza un contenedor del PC.

Solo se importó y publicó **BanuChat OE4 - Conversational orchestration v1**, con cinco nodos y sin timers. Recibe por loopback una solicitud autenticada de la API; decide admisión o aclaración y devuelve una directiva correlacionada. El agente de la API ejecuta las herramientas MCP, no un nodo LLM/ReAct de n8n. Los webhooks públicos están bloqueados en Caddy. La credencial y la clave de cifrado son privadas; no están en este repositorio.

Las pruebas reales verificaron dos fuentes admitidas, tres con aclaración, 403 sin token y conservación del workflow/credencial después de reiniciar el servicio. El workflow no guarda payloads de ejecución; la correlación se acredita con eventos `managed_n8n` y `managed_agent` de la API. [Guía para mostrarlo](../docs/operations/GUIA-PRESENTACION-BANUCHAT.md#7-mostrar-n8n-y-mcp-en-aws) · [Pruebas y límites](../docs/transition/CHECKPOINT-MCP-AWS-2026-11-20.md).

El n8n **local** `banuchat-unified-n8n` conserva nueve workflows y dos timers de pruebas activos en su SQLite, aunque su contenedor estaba detenido el 19/11. No arrancarlo para demostrar la composición cloud. Las ingestas, fixtures OE2 y calendario locales no se copiaron ni automatizaron en AWS.

n8n orquesta; el backend TypeScript mantiene validación, reglas, procesamiento, embeddings y publicación. Los fixtures no prueban scraping institucional, frescura de una fuente real o conectores Google Drive/Sheets. La copia OE2 desplegada se lee por hash y no se actualiza automáticamente desde n8n.

[Workflows y runbooks](workflows/README.md) · [Arquitectura actual](../docs/arquitectura.md) · [Estado](../docs/estado-vigente.md). Las secciones siguientes conservan el recorrido inicial de ingesta manual y sus pendientes de entonces; no describen por sí solas todos los workflows posteriores.

<details>
<summary>Antecedentes y recetas locales conservados; comprobar el corte antes de ejecutarlos</summary>

Estado: N8N 2.40.5 se levantó localmente mediante el Compose vigente. El workflow
manual v1 está implementado e importado y permanece `active=false`; N3 lo ejecutó
manualmente, `/execute` publicó una release y la segunda ejecución devolvió
`already_current`. Véase [evidencia N3](../eval/ingestion/results/n3-n8n-e2e-2026-10-02.md).
La fuente de verdad es `/data/synthetic`, creada/revisada por el equipo y versionada
antes de ingesta. El calendario se ingiere dentro de una **release completa**;
no existe sincronización de calendario independiente ni fuente institucional externa.
N8N no inventa hechos, modifica fuentes, ejecuta Git pull ni administra colaboración Git.

La frontera seleccionada en el [ADR 0005](../docs/adr/0005-ingesta-reproducible-n8n.md)
es N8N → interfaz HTTP privada → componente TypeScript de `backend/rag` → Ollama y
PostgreSQL. N8N controla triggers, llamada, condiciones sencillas y resumen; TypeScript
posee preflight, relaciones, parser, chunking, embeddings, DML, retry y publicación.
No SQL manual ni reglas complejas en nodos Code. No Execute Command ni webhook público.

El primer workflow implementado usa solo trigger manual. Retry y scheduled quedan
pendientes como workflows N8N, junto con recover; el core/HTTP ya ofrece retry y
recover explícitos. Execute recibe referencia de aprobación, `source_git_revision` completo,
`pipeline_version` y `workflow_ref`.
Salida: resultado, identidad de release, run/attempt y contadores por estado; errores
saneados. Nunca paths libres, credenciales, SQL o corpus completo en los payloads.

No reintentar ciegamente una llamada con timeout: consultar estado primero. Un retry
verifica la representación existente y registra 76 resultados nuevos. Un fallo no
reemplaza current; solo publish_release promueve. Ready actual es no-op; ready histórica
se reporta sin reactivación. Procedencia desde runs fallidos requiere el tratamiento
documental/vectorial específico de la [especificación](../docs/ingesta-reproducible.md).

El workflow manual versionado y el runbook están en
[workflows/README.md](workflows/README.md) y
[ingestion-manual-v1-runbook.md](workflows/ingestion-manual-v1-runbook.md). Fue
importado en N8N 2.40.5 y permanece inactivo como automatización. N3 acredita el
camino manual local con `/execute`; `workflow_ref` referencia la definición base, no
un execution ID ni un objeto N8N garantizado idéntico byte por byte.
Los logs solo contienen correlación, estados, tiempos y códigos técnicos seguros.

N8N queda fuera del camino actual Mobile → REST → Intent Router → servicios/renderers
o Document RAG directo. Agent/ReAct y MCP son arquitectura objetivo pendiente.
OE2 mantiene sus objetivos no medidos; OE4 verifica orquestación E2E y publicación
atómica, no una latencia de calendario de 30 minutos. Véase el
[plan de pruebas](../eval/ingestion/plan.md). Véanse [N0](../eval/ingestion/results/n0-local-operational-preparation-2026-10-02.md)
y [N3](../eval/ingestion/results/n3-n8n-e2e-2026-10-02.md). N3 acredita workflow
manual, `/execute` y E2E local; no acredita Linux, despliegue institucional,
producción ni retry/recover/scheduled.

</details>
