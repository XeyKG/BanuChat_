# AGENTS.md — BanuChat (antes "Route AI")

## Qué es este proyecto
Sistema de automatización inteligente para el Centro de Competencias Digitales (CCD) de la
UNAB. Combina arquitectura RAG sobre pgvector, un núcleo agéntico (ciclo ReAct) expuesto vía
MCP, orquestación de flujos con N8N (BPM + generación/ingesta de datos sintéticos) y una app
móvil en React Native. Proyecto de grado (Ingeniería de Sistemas, UNAB) — es un anteproyecto en
Fase 1 (diseño de arquitectura), todavía sin código productivo.

Nombre del sistema en el código/UI/commits: **BanuChat**. "Route AI" solo aparece en el
anteproyecto académico; no lo uses como nombre de paquete, carpeta ni variable.

**Cambio de alcance frente al anteproyecto escrito (ya aprobado por el director):** el sistema
NO se desplegará en servidores UNAB ni consumirá datos, APIs o el sitio web real del CCD. Todo
el corpus documental (PDFs, calendarios, convocatorias, "noticias") es **sintético**, creado
por el equipo con formato realista para simular el contexto institucional. El módulo antes
descrito como "RPA de scraping" pasa a ser un generador/ingestor de datos sintéticos, no un
scraper real. El anteproyecto justifica el despliegue on-premise en UNAB como parte de su
viabilidad (sección 3.5) — ese punto quedó desactualizado por esta decisión y debe explicarse
así en la documentación final, no disimularse como si el despliegue fuera institucional real.

## Estructura del repo (monorepo)
Aún no existe código; este es el layout objetivo que debes crear/respetar:

```
/backend/            # API + orquestación del agente (ciclo ReAct)
  /mcp-server/        # Servidor MCP: expone tools sobre pgvector, PostgreSQL, Google Sheets
  /rag/               # Ingesta, chunking, embeddings, retrieval
  /api/               # Endpoints REST que consume la app móvil
/n8n/
  /workflows/          # Flujos exportados (JSON) de N8N: generación de datos sintéticos, sync calendario, BPM
/mobile/              # App React Native (TypeScript)
/infra/
  docker-compose.yml   # Orquestación local (Docker) de todos los contenedores
  /db/                 # Migraciones SQL (PostgreSQL + extensión pgvector)
/data/synthetic/      # Documentos y datasets sintéticos (fuente de verdad del RAG)
/docs/                # Documentación técnica, diagramas de arquitectura, decisiones (ADR)
/eval/                # Scripts y datasets de evaluación RAGAS, casos de prueba SUS
```

Si necesitas desviarte de este layout, actualiza esta sección en el mismo commit.

## Stack técnico
- **Backend / agente**: LLM vía API (OpenAI u Ollama local) orquestado con ciclo ReAct, Model
  Context Protocol (MCP) para exponer herramientas (consulta a pgvector, PostgreSQL, Sheets).
- **Base de datos**: PostgreSQL + pgvector (embeddings, similitud coseno).
- **Orquestación**: N8N self-hosted (Apache 2.0) — BPM para reglas de negocio, generación e
  ingesta periódica de datos sintéticos (ya NO scraping del sitio real del CCD).
- **Móvil**: React Native + TypeScript, consumo de API REST.
- **Infraestructura**: Docker Compose, corriendo localmente en las máquinas del equipo durante
  el desarrollo (sin servidores UNAB). Si más adelante se necesita disponibilidad remota, se
  puede mover el mismo `docker-compose.yml` a una VM en la nube sin rediseñar nada.

## Cómo correr el proyecto (actualizar a medida que exista código real)
```bash
# Backend + base de datos + n8n
docker compose -f infra/docker-compose.yml up --build

# App móvil (una vez exista /mobile)
cd mobile && npm install && npm run start
```
No asumas comandos que no estén aquí: si necesitas ejecutar algo que no está documentado,
pregunta o propón el comando y añádelo a esta sección.

## Convenciones de ingeniería
- TypeScript estricto en backend y móvil; tipar entradas/salidas de cada tool MCP.
- Toda respuesta del agente que cite información institucional debe incluir la fuente
  (documento + sección). No generes respuestas sin anclaje documental — es un requisito de
  diseño del proyecto (mitigación de alucinaciones), no un detalle opcional.
- Las guías de cátedra NUNCA se fragmentan/vectorizan; se sirven como enlace al documento
  completo (ver sección 13.3 del anteproyecto).
- Migraciones de base de datos versionadas en `/infra/db`, nunca cambios manuales a schema.
- Cada flujo de N8N exportado a `/n8n/workflows` como JSON versionado — no dejar lógica de
  negocio solo dentro de la UI de N8N sin respaldo en el repo.
- Commits en español, formato imperativo corto (`Agrega endpoint de búsqueda semántica`).

## Datos sensibles y ética (obligatorio — no negociable)
- Todo el corpus (documentos institucionales, calendarios, perfiles de estudiante) es
  **100% sintético**. Nunca uses, busques ni incorpores datos reales de personas, de la UNAB o
  del CCD real — ni como ejemplo, ni como "inspiración" de contenido.
- Todo dato/documento sintético debe quedar marcado como tal en metadatos y en la
  documentación (`/data/synthetic`), para que quede clara la diferencia frente a lo que diría
  el sistema en un despliegue institucional real.
- Aun siendo sintético, no hay datos personales reales que proteger bajo Ley 1581 en esta
  iteración; si en el futuro se migra a datos reales, hay que revisar esta sección de nuevo.
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
- **Generación/ingesta de datos sintéticos (OE2, reformulado)**: pipelines de N8N que generan
  e ingieren el corpus sintético automáticamente, sin intervención manual repetitiva; latencia
  de actualización del corpus < 24h desde que se agrega un nuevo documento sintético; tasa de
  ingesta correcta > 90% sobre el conjunto de documentos de prueba (ya no aplica "sitio real
  del CCD").
- **Núcleo agéntico + MCP (OE3)**: el agente selecciona dinámicamente la tool correcta según
  intención, no responde de forma pasiva/genérica.
- **Orquestación N8N (OE4)**: pruebas de integración end-to-end sin pérdida de datos entre
  nodos, sincronización de calendario con latencia máx. 30 min.
- **App móvil (OE5)**: SUS promedio > 70/100, ningún usuario individual < 50/100, tasa de
  completación de tareas > 85%.
- **Despliegue (OE6)**: contenedores estables sin caídas > 5 min, respuesta promedio < 5s.

Antes de dar una tarea por terminada, verifica contra el criterio del objetivo específico que
corresponda, no solo "compila y corre".

## Fase actual: Fase 1 — Análisis y Diseño (semanas 1–4)
El foco ahora es: especificación de requerimientos, diseño del modelo de datos vectorial,
especificación de los flujos N8N y el documento de arquitectura — todavía NO construcción de
funcionalidad final. Pide a Codex que te ayude a producir estos entregables de diseño antes
de generar código de producción, y que valide cada decisión contra lo ya definido en el
anteproyecto en vez de reinventar la arquitectura.
