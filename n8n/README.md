# N8N

Estado: N8N 2.40.5 fue levantado localmente mediante el Compose vigente; desde su
contenedor se verificó conectividad autenticada a `POST /internal/ingestion/status`
con resultado `not_started`. El workflow manual v1 está implementado e importado,
pero permanece inactivo; no se ha probado `/execute` ni ejecutado ingesta N8N E2E.
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
fuera de N2. Execute recibe referencia de aprobación, `source_git_revision` completo,
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
importado en N8N 2.40.5 y permanece inactivo. No se ha probado `/execute` ni ejecutado
ingesta N8N E2E. `workflow_ref` fijará ruta y revisión de la definición, no execution ID.
Los logs solo contienen correlación, estados, tiempos y códigos técnicos seguros.

N8N queda fuera del camino Mobile → REST → Intent Router → fast path / Agent-RAG.
OE2 mantiene sus objetivos no medidos; OE4 verifica orquestación E2E y publicación
atómica, no una latencia de calendario de 30 minutos. Véase el
[plan de pruebas](../eval/ingestion/plan.md). La evidencia local se registra en
[N0](../eval/ingestion/results/n0-local-operational-preparation-2026-10-02.md).
La conectividad observada acredita solo Windows local + Docker Desktop + Compose
actual; no acredita workflow, `/execute`, E2E, Linux ni despliegue institucional.
