# AGENTS.md — BanuChat (antes "Route AI")

## Qué es este proyecto
Sistema de automatización inteligente para el Centro de Competencias Digitales (CCD) de la
UNAB. Combina arquitectura RAG sobre pgvector, un núcleo agéntico (ciclo ReAct) que actúa como cliente
MCP de un servidor interno, orquestación asíncrona con N8N sobre datos sintéticos y una app
móvil en React Native. Proyecto de grado (Ingeniería de Sistemas, UNAB) — es un anteproyecto en
implementación incremental, con foundation TypeScript, preflight local y chunking determinista en `backend/rag`.

Nombre del sistema en el código/UI/commits: **BanuChat**. "Route AI" solo aparece en el
anteproyecto académico; no lo uses como nombre de paquete, carpeta ni variable.

**Cambio de alcance frente al anteproyecto escrito (ya aprobado por el director):** el sistema
NO se desplegará en servidores UNAB ni consumirá datos, APIs o el sitio web real del CCD. Todo
el corpus documental (PDFs, calendarios, convocatorias, "noticias") es **sintético**, creado
por el equipo con formato realista para simular el contexto institucional. El módulo antes
descrito como "RPA de scraping" pasa a ser orquestación de ingesta asíncrona de releases
sintéticas completas sobre `/data/synthetic`, fuente de verdad versionada. PostgreSQL conserva su representación
procesada. El contenido funcional es creado/revisado por el equipo y versionado antes
de la ingesta. N8N valida, procesa e ingiere automáticamente revisiones aprobadas de
`/data/synthetic` y genera derivados técnicos cuando corresponda. No inventa ni publica
automáticamente hechos funcionales como fuente de verdad ni modifica silenciosamente sus archivos.
El anteproyecto justifica el despliegue on-premise en UNAB como parte de su
viabilidad (sección 3.5) — ese punto quedó desactualizado por esta decisión y debe explicarse
así en la documentación final, no disimularse como si el despliegue fuera institucional real.

## Estructura del repo (monorepo)
Existen un esquema físico inicial validado y contratos; todavía no hay aplicaciones implementadas. Layout objetivo:

```
/backend/            # API + orquestación del agente (ciclo ReAct)
  /mcp-server/        # Servidor MCP interno: herramientas controladas sobre PostgreSQL + pgvector
  /rag/               # Ingesta, chunking, embeddings, retrieval
  /api/               # Endpoints REST que consume la app móvil
/n8n/
  /workflows/          # Flujos JSON de N8N: ingesta asíncrona de releases sintéticas completas
/mobile/              # App React Native (TypeScript)
/infra/
  docker-compose.yml   # Orquestación local (Docker) de todos los contenedores
  /db/                 # Migraciones SQL (PostgreSQL + extensión pgvector)
/data/synthetic/      # Documentos y datasets sintéticos (fuente de verdad de todo el prototipo)
/docs/                # Documentación técnica, diagramas de arquitectura, decisiones (ADR)
/eval/                # Scripts y datasets de evaluación RAGAS, casos de prueba SUS
```

Si necesitas desviarte de este layout, actualiza esta sección en el mismo commit.

## Stack técnico
- **Backend / agente**: frontera síncrona Mobile → REST Backend API → Intent Router,
  con fast path mediante servicios de aplicación para intenciones seguras y fallback
  a Agent/RAG para consultas ambiguas, compuestas o no reconocidas.
  El agente consume herramientas controladas del servidor MCP interno; la app no llama a MCP
  ni a N8N. El proveedor/modelo de generación permanece abierto. Para embeddings del MVP
  se fija Ollama local con `qwen3-embedding:0.6b`, dimensión 1024 y similitud/distancia
  coseno; la recuperación inicial usa búsqueda exacta, sin índices ANN (HNSW/IVFFlat).
- **Enrutamiento de chat**: antes de Agent/RAG existe un Intent Router determinista.
  Las consultas estructuradas reconocidas con seguridad usan servicios de aplicación
  compartidos con MCP; la clasificación no usa LLM ni embeddings. Ante ambigüedad,
  conflicto o consulta compuesta se usa Agent/RAG. N8N no participa en este camino.
- **Base de datos**: una sola instancia PostgreSQL con pgvector para relaciones y embeddings
  (similitud coseno); almacena datos procesados de `/data/synthetic`.
- **Orquestación**: N8N self-hosted para orquestar la ingesta asíncrona de releases
  sintéticas completas y aprobadas. No participa en el camino conversacional ni genera
  contenido funcional. La lógica compleja de ingesta pertenece al componente TypeScript
  de `backend/rag`, no a N8N.
- **Móvil**: React Native + TypeScript, consumo exclusivo de la API REST pública.
- **Calendario**: fuente sintética versionada en `/data/synthetic/calendars`; Google Sheets
  queda fuera del MVP.
- **Usuarios**: perfiles de demostración sintéticos; autenticación local pendiente de diseño,
  sin autenticación institucional. Notificaciones push reales pendientes de diseño explícito.
- **Infraestructura**: Docker Compose, corriendo localmente en las máquinas del equipo durante
  el desarrollo y las demostraciones iniciales (sin servidores UNAB). Disponibilidad remota
  requiere una decisión posterior y no es un requisito de esta iteración.

## Cómo correr el proyecto (actualizar a medida que exista código real)
```bash
# Solo infraestructura local, cuando se autorice su ejecución y se complete .env.
# El Compose actual aún no incluye backend ni móvil.
docker compose --env-file .env -f infra/docker-compose.yml up --build

# App móvil (solo cuando existan package.json y el script start)
cd mobile && npm install && npm run start
```
No asumas comandos que no estén aquí: si necesitas ejecutar algo que no está documentado,
pregunta o propón el comando y añádelo a esta sección.

## Convenciones de ingeniería
- TypeScript estricto en backend y móvil; tipar entradas/salidas de cada tool MCP.
- Toda respuesta del agente que dependa del corpus debe citar evidencia verificable del
  corpus sintético, como documento/sección o procedencia estructurada. Si no existe evidencia
  suficiente, el sistema debe indicarlo explícitamente y no completar con conocimiento propio del LLM.
- Los documentos con `retrieval_mode=full_document` no se fragmentan ni vectorizan.
  Cuando deban presentarse al cliente, se resuelven como artefactos completos verificados
  mediante la ruta REST interna aprobada; no mediante URLs externas.
- Migraciones de base de datos versionadas en `/infra/db`, nunca cambios manuales a schema.
- Cada flujo de N8N exportado a `/n8n/workflows` como JSON versionado — no dejar lógica de
  negocio solo dentro de la UI de N8N sin respaldo en el repo.
- Commits en español, formato imperativo corto (`Agrega endpoint de búsqueda semántica`).

## Datos sensibles y ética (obligatorio — no negociable)
- Todo el corpus funcional (documentos, calendarios y perfiles de demostración) es
  **100% sintético**. Nunca uses, busques ni incorpores datos reales de personas, de la UNAB o
  del CCD real — ni como ejemplo, ni como "inspiración" de contenido.
- Todo dato/documento sintético debe quedar marcado como tal en metadatos y en la
  documentación (`/data/synthetic`), para que quede clara la diferencia frente a lo que diría
  el sistema en un despliegue institucional real.
- Los datos funcionales sintéticos se distinguen de posibles registros recogidos en pruebas
  de usabilidad con participantes humanos. Estos últimos requieren diseño previo de
  consentimiento, minimización, anonimización y acceso; no se incorporan al corpus funcional
  ni a `/data/synthetic` y no se versionan registros identificables.
- Si el sistema no tiene información suficiente para responder, debe decirlo explícitamente
  en vez de especular — nunca "completar" con conocimiento no verificado del LLM.

## Qué NO debe hacer el agente sin aprobación explícita
- No modificar el esquema de la base de datos vectorial ni los nombres de las tools MCP sin
  avisar (son el contrato entre agente, backend y N8N).
- No contratar ni configurar servicios de nube de pago sin aprobación explícita; el entorno de
  desarrollo por defecto es Docker local. Una VM gratuita/de bajo costo para demo se decide
  aparte, no por iniciativa del agente.
- No hacer scraping ni llamadas a sitios/APIs reales de la UNAB o el CCD bajo ningún motivo —
  todo dato de entrada debe originarse en `/data/synthetic`.
- No commitear credenciales, API keys ni tokens de N8N/PostgreSQL.
- No borrar ni sobreescribir `/docs` o `/eval` sin confirmación.

## Definición de "hecho" (alineada a los objetivos específicos del anteproyecto)
- **Motor RAG (OE1)**: faithfulness ≥ 0.80, context precision ≥ 0.80, context recall ≥ 0.75,
  answer relevancy ≥ 0.80, MRR ≥ 0.70 (framework RAGAS, evaluado en `/eval`).
- **Ingesta de datos sintéticos (OE2, reformulado)**: pipelines asíncronos de N8N que ingieren
  versiones del corpus sintético aprobado, sin intervención manual repetitiva; latencia
  de actualización del corpus < 24h desde que una revisión sintética aprobada queda
  disponible para ingesta; tasa de
  ingesta correcta > 90% sobre el conjunto de documentos de prueba (ya no aplica "sitio real
  del CCD").
- **Núcleo agéntico + MCP (OE3)**: el agente selecciona dinámicamente la tool correcta según
  intención, no responde de forma pasiva/genérica.
- **Orquestación N8N (OE4)**: pruebas end-to-end de orquestación que verifiquen publicación
  atómica, trazabilidad, ausencia de pérdida/mezcla de items y preservación de la release
  vigente ante fallos. Para los escenarios críticos definidos, todos deben cumplir el
  resultado esperado. La duración del workflow se registrará como métrica observada,
  sin fijar todavía un umbral. Se descarta técnicamente la antigua sincronización de
  calendario de 30 minutos porque no existe una fuente externa independiente.
  La redacción académica de OE4 deberá actualizarse posteriormente.
- **App móvil (OE5)**: SUS promedio > 70/100, ningún usuario individual < 50/100, tasa de
  completación de tareas > 85%.
- **Despliegue local (OE6)**: contenedores estables sin caídas > 5 min, respuesta promedio < 5s.

Antes de dar una tarea por terminada, verifica contra el criterio del objetivo específico que
corresponda, no solo "compila y corre".

## Fase técnica actual: implementación incremental

El diseño base de arquitectura, SQL, MCP, REST, Intent Router, dataset e ingesta
reproducible está aprobado para comenzar implementación incremental. Se trabajará
por componentes pequeños, probados y auditables, sin reabrir silenciosamente decisiones
congeladas. Esta es la fase técnica del repositorio; no afirma que el anteproyecto
académico ya haya sido actualizado.

Orden inicial autorizado:

1. Foundation TypeScript de `backend/rag`.
2. Preflight puro del dataset.
3. Extracción/chunking determinista.
4. Pruebas unitarias.
5. Posteriormente, persistencia PostgreSQL.
6. Posteriormente, Ollama/embeddings/publicación.
7. Posteriormente, adaptador HTTP interno + N8N.

Esta autorización no permite construir todo el sistema de una vez: cada tarea debe
respetar su alcance específico. REST y dataset v1 permanecen congelados; SQL no cambia
sin futura autorización explícita. Intent Router se rige por ADR 0004 e ingesta por
ADR 0005. No se implementa funcionalidad durante este cierre documental.

Los contratos MCP `2.0.0-draft` están congelados para implementación. Cualquier cambio incompatible requiere revisión explícita y actualización coordinada del contrato, agente y pruebas. El sufijo `draft` se conserva hasta que exista una implementación validada.
