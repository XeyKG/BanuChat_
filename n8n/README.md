# n8n en BanuChat

**Operación, 20/11/2026:** el editor publicado es **https://n8n.banuchat.duckdns.org**, con protección HTTPS adicional y cuenta propietaria de n8n. Usa la EC2 existente, servicio `banuchat-n8n`, instalación npm 2.40.5, usuario Linux separado y datos persistentes en `/var/lib/banuchat-n8n/.n8n`. No utiliza un contenedor del PC.

**BanuChat OE4 - Conversational orchestration v1** recibe por loopback una solicitud autenticada de la API para las consultas estructuradas multifuente. Devuelve una directiva de admisión o aclaración. El agente de la API ejecuta las herramientas MCP. Los webhooks públicos están bloqueados en Caddy. La credencial y la clave de cifrado son privadas.

Las pruebas de OE4 verificaron dos fuentes admitidas, tres con aclaración, 403 sin token y conservación del workflow y la credencial después de reiniciar el servicio. OE4 conserva deshabilitado el historial de datos de ejecución. Las trazas de admisión y herramientas están en eventos `managed_n8n` y `managed_agent` de la API. [Pruebas y límites](../docs/transition/CHECKPOINT-MCP-AWS-2026-11-20.md).

### Ver consultas del chat en Executions

1. Abre [n8n de BanuChat en AWS](https://n8n.banuchat.duckdns.org) con tu acceso de operador.
2. En **Workflows**, abre **BanuChat - Ejecuciones del chat** y selecciona **Executions**.
3. Envía una consulta en [BanuChat](https://banuchat.duckdns.org), por ejemplo «¿Qué son competencias digitales?». Espera el resultado del chat y actualiza la lista de ejecuciones.
4. Abre la fila más reciente y selecciona **Ruta, duración y resultado**. `document_rag` identifica una respuesta documental. `structured_mcp` indica paso por el flujo de consultas estructuradas. `direct` identifica respuestas directas de la aplicación y `filtered` el filtro de respeto.

Cada turno aceptado se registra al finalizar. El flujo recibe un identificador aleatorio, ruta, duración en milisegundos, estado y número de citas o código de error. El estado verde de n8n significa que el registro se guardó. `status` en el nodo indica el resultado real del chat. La API publica este evento de manera asíncrona y el chat puede seguir cuando n8n no está disponible. El flujo usa un webhook accesible por loopback y el evento omite preguntas, respuestas, perfiles, expedientes y credenciales.

La revisión local agrega `partial` para atribuir las respuestas con evidencia incompleta y el objeto `rag` al nodo **Ruta, duración y resultado**. Sus campos miden el tiempo de embedding (`embedding_ms`), consulta vectorial (`retrieval_ms`) y espera del endpoint de generación de Ollama (`ollama_http_ms`), además del número de llamadas y timeouts. Un tiempo `null` indica que la etapa no se ejecutó y `ollama_calls: 0` indica que no se llamó al endpoint de generación. El flujo nuevo acepta emisores anteriores mediante `rag: {}`. Esta revisión quedó en el repositorio local, con la EC2 apagada. [Resultados y uso](../eval/rag-quality/results/revision-local-2026-11-20.md)

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
