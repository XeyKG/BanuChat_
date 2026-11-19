# AGENTS.md — BanuChat

## Proyecto

Nombre oficial: **BanuChat**.

"Route AI" es únicamente el nombre antiguo del anteproyecto y no debe usarse como
nombre vigente en código, UI, paquetes, carpetas, variables ni documentación nueva.

BanuChat es un proyecto de grado de Ingeniería de Sistemas. El repositorio se encuentra
en implementación incremental. No asumir que el anteproyecto académico original describe
el estado técnico actual.

## Restricciones de datos

El corpus de demostración histórico es **100% sintético**, congelado en
`/data/synthetic`. BCH-03 autoriza además un corpus CCD seleccionado para desarrollo
local, separado en `data/ccd`, según ADR 0006.

La carpeta externa `CCD_DOCUMENTACION` es fuente exclusivamente de lectura. Solo
incorporar derivados depurados del subconjunto autorizado; no originales internos
íntegros, expedientes ni datos personales reales. El contenido CCD local no público
debe quedar excluido de Git por defecto. La validación del equipo no es aval CCD.

No hacer scraping ni consumir sitios/APIs reales de UNAB o CCD.

`/data/synthetic` sigue siendo la fuente de verdad de la demo. El corpus CCD conserva
su propio manifiesto, procedencia y límites; nunca usar la demo como fallback
institucional silencioso. PostgreSQL CCD deberá estar aislado de la demo.

No modificar el dataset v1 congelado salvo autorización explícita.

## Implementación actual

Resumen técnico actualizado al 18/11/2026. La ficha de referencia es
`docs/estado-vigente.md`; distinguir siempre la composición publicada de Unified local.

Flujo conversacional publicado:

`Mobile (Expo + React Native + TypeScript) → REST Backend API → Intent Router determinista → fast path estructurado o Document RAG directo`

Los fast paths usan servicios de aplicación y PostgreSQL. Document RAG usa
PostgreSQL + pgvector en Supabase y Ollama en la EC2 existente. El perfil
`managed` no activa Unified, Agent/MCP ni n8n en el recorrido público.
Unified local sí tiene agente determinista acotado, MCP ejecutable y orquestación
n8n para ciertos planes multifuente. Esa evidencia local no acredita su uso en AWS.

Los perfiles son sintéticos; seleccionar un perfil no equivale a autenticarse.

## Arquitectura objetivo

`Mobile → REST Backend API → Intent Router → fast path o Agent/RAG → MCP interno cuando corresponda`

MCP y el agente determinista acotado están implementados con evidencia local.
ReAct dirigido por un LLM y su uso productivo siguen sin acreditarse.

N8N tiene workflows locales de ingesta manual, fixtures OE2, conversación y
calendario OE4. Delega validación, procesamiento y embeddings en `backend/rag`.
No asumir conectores institucionales, Drive/Sheets reales o automatización cloud.

Persistencia:

- PostgreSQL + pgvector.
- Una configuración de embedding por release.
- Ollama en EC2 para la demostración publicada; local en sus laboratorios.
- Modelo de embeddings MVP: `qwen3-embedding:0.6b`.
- 1024 dimensiones.
- Distancia coseno.
- Búsqueda exacta inicialmente; sin HNSW/IVFFlat.

Los documentos `full_document` no se fragmentan ni vectorizan.

## Estado y contratos

Los detalles del estado implementado viven en los archivos específicos del componente,
no en este AGENTS.md.

Leer SOLO cuando la tarea lo requiera:

- arquitectura general → `docs/arquitectura.md`
- ingesta/recovery/retry → `docs/ingesta-reproducible.md`
- decisiones → `docs/adr/`
- PostgreSQL → `infra/db/001_initial_schema.sql` y `infra/db/README.md`
- RAG/ingesta implementada → `backend/rag/README.md`
- MCP → `backend/mcp-server/tools-contract.md`
- Mobile → `mobile/README.md`
- REST → `backend/api/README.md`, `backend/api/api-contract.md` y `backend/api/openapi.yaml`
- Intent Router → ADR y especificación correspondientes, `backend/api/intent-routing.catalog.json`, `backend/api/intent-routing.schema.json` y `eval/intent-routing/`
- integración → `eval/integration/README.md` y `eval/integration/results/`
- evaluación de ingesta → `eval/ingestion/plan.md`

No leer todos estos documentos por defecto.

SQL, dataset v1, REST y contrato MCP se consideran congelados salvo autorización
explícita de la tarea.
En BCH-03 incremento 1 se autorizan contrato CCD, preparación en memoria y diseño
del delta de persistencia; no se ejecuta carga PostgreSQL ni se modifica REST/MCP.
Ese límite corresponde al incremento 1. BCH-03 incremento 2 autoriza la migración
CCD adicional, carga M01/M12 y validación directa de Document RAG exclusivamente
en `banuchat_ccd_dev`; se mantiene aislada la demo y no se cambia REST/MCP.
Incremento 3 autoriza chat HTTP CCD local, contexto técnico de demostración separado
del corpus y migración 003 exclusiva CCD. Mantener los schemas REST; la adaptación
semántica de `profile_key` está documentada en `backend/api/api-contract.md`.
Incremento 4 autoriza la ampliación CCD seleccionada (M02, DOC-098–104, y orientación
general de pruebas de DOC-110), contrato `ccd-1.1.0`, migración 004 exclusiva CCD
y publicación de otra release sin borrar la anterior. No habilita reglas académicas
contradictorias, oferta vigente ni autenticación institucional.

## Reglas de implementación

- TypeScript estricto.
- Cambios pequeños y delimitados.
- No introducir tecnologías o frameworks fuera del alcance solicitado.
- No añadir ORM si SQL explícito es suficiente.
- No mover lógica de negocio a N8N.
- No crear endpoints, workflows, componentes o abstracciones "para el futuro"
  sin necesidad de la tarea actual.
- No modificar contratos congelados para hacer pasar una implementación.
- Si código y contrato vigente son incompatibles, detenerse y reportarlo.
- No hacer retry/recovery automático si la tarea no lo autoriza.
- No inventar métricas, resultados de pruebas ni procedencia runtime.
- El sprint móvil actual usa Expo SDK 57. No migrar Expo/React Native ni generar
  proyectos nativos `android/` o `ios/` salvo tarea explícitamente autorizada.

## Seguridad

Nunca commitear:

- passwords;
- tokens;
- API keys;
- connection strings reales;
- secretos de N8N/PostgreSQL/Ollama;
- datos identificables reales.

Los errores expuestos no deben incluir secretos, SQL completo, stacks, payloads
privados ni paths arbitrarios.

No contratar ni configurar servicios cloud de pago sin autorización explícita.

## Git y archivos

No ejecutar operaciones destructivas sin autorización:

- `git reset`
- `git clean`
- `git checkout --`
- `git restore`
- rebase destructivo

No hacer commit ni push salvo solicitud explícita.

Respetar `.gitattributes`.

No ejecutar `git add --renormalize .` sin revisión explícita.

## Validación

Ejecutar únicamente las pruebas pertinentes al componente modificado.

Para cambios en `backend/rag`, normalmente desde esa carpeta:

`npm run typecheck`

`npm test`

Ejecutar `npm run test:db`, E2E, Docker u Ollama solo cuando la tarea los necesite.

No volver a ejecutar pruebas costosas ya acreditadas si el cambio no puede afectarlas.

Antes de terminar:

`git diff --check`

y comprobar que no se modificaron archivos fuera del alcance autorizado.

## Forma de trabajo

Primero inspeccionar el estado existente y reutilizarlo.

No rediseñar decisiones ya aprobadas salvo contradicción real.

Si la tarea especifica archivos concretos, revisar esos archivos y sus dependencias
directas; no hacer un barrido completo del repositorio.

Reportar al final:

- archivos modificados;
- pruebas realmente ejecutadas;
- resultados;
- límites o riesgos encontrados.

No declarar PASS para pruebas que no se ejecutaron.
