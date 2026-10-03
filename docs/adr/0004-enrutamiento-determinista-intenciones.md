# ADR 0004 — Enrutamiento determinista de intenciones

Estado: decisión arquitectónica aceptada por autorización explícita del proyecto.
Catálogo y reglas iniciales: `1.0.0-draft`. Este ADR conserva la decisión
arquitectónica original. Estado actual: router determinista implementado y
productivo; fast paths despachados para progreso, calendario y anuncios; fallback
Document RAG directo. Agent/ReAct y MCP interno siguen pendientes de integración,
al igual que el refinamiento M3.1.

## Contexto y motivación

Las consultas frecuentes de progreso, catálogo, calendario, anuncios y localización
documental pueden resolverse con datos estructurados. Invocar siempre al generador
añade trabajo que no necesariamente mejora esas respuestas. Se busca reducir consumo
computacional y latencia, hacer el comportamiento más reproducible y reservar el LLM
para interpretación documental, ambigüedad y razonamiento entre fuentes.
No se han demostrado ahorros ni resultados de rendimiento o clasificación.

## Decisión

Introducir un Intent Router determinista antes de Agent/RAG en POST messages:

- Fast path: Mobile → REST Backend → Intent Router → Application Services → renderer
  determinista. Los servicios consultan PostgreSQL; el router no llama a MCP.
- Fallback: Mobile → REST Backend → Intent Router → Agent/RAG → MCP interno → los
  mismos Application Services → PostgreSQL.
- Ayuda de capacidades, interacción social básica y límites inequívocos del prototipo
  usan renderers estáticos, sin añadir dominios funcionales.
- N8N queda fuera de ambas rutas conversacionales. La clasificación no usa LLM,
  embeddings, consultas vectoriales ni proveedores externos.

La prioridad es **fast path seguro > fallback al Agent/RAG**. Ante duda, exclusión,
texto residual, parámetros conflictivos o consulta compuesta se usa fallback;
nunca se fuerza una clasificación ni se resuelve un conflicto por prioridad.
Una palabra genérica aislada no es suficiente. Las fórmulas sociales completas
«hola», «gracias» y «adiós» son una lista explícita, no búsquedas por substring.

## Fronteras y garantías conservadas

No se cambia REST público ni se añade `/courses`; course_catalog es una ruta interna
de chat, no un endpoint nuevo. MCP 2.0, sus seis tools y sus schemas permanecen intactos.
El router no sustituye RAG, MCP o Agent/RAG de la arquitectura objetivo. Los
servicios compartidos se implementaron como lógica de aplicación; esta decisión
no prescribe nuevos contenedores.

Ambas rutas fijan la misma release vigente del turno y el perfil controlado antes de
procesar contenido. Conservan el mensaje original, verifican evidencia y persisten
el turno completo (`user`, `assistant` y citas) atómicamente en la implementación
actual. La ruta rápida no habilita selección histórica,
cambio de perfil por texto ni procedencia inventada. Un fallo operacional no se
disfraza de lista vacía ni se resuelve llamando al generador sin evidencia.

Los full_document siguen sin fragmentarse/vectorizarse; se presentan mediante
artefactos verificados en la ruta REST interna aprobada, nunca URLs externas.
Generación sigue abierta; embeddings para la ruta RAG conservan ADR 0003.

## Política inicial y alternativas

Matching de mensaje completo: 100 puntos para frase/patrón exacto, 80 para una
combinación ordenada cerrada; tokens genéricos aportan cero. Umbral 80, margen 20,
sin sumar coincidencias. Dos familias fuertes o parámetros incompatibles siempre
hacen fallback. El detalle normativo está en la especificación y el catálogo.

Se descartan clasificación por una palabra, clasificación mediante IA y una cadena
de reglas que intente resolver peticiones compuestas. También se descarta duplicar
consultas dentro de MCP y del fast path: ambos adaptan los mismos servicios.
El fallback Agent/RAG permanece como objetivo, no como paso obligatorio actual;
el runtime vigente usa Document RAG directo.

## Consecuencias y evaluación pendiente

Se mantiene un catálogo versionado y se comprueban exclusiones, parámetros y
procedencia. Los renderers de progreso, calendario y anuncios ya están
implementados. La cobertura inicial es
deliberadamente limitada: una paráfrasis no reconocida va al fallback documental
actual aunque una persona identifique su intención; en el diseño objetivo iría al
agente. Es preferible ese costo a un falso positivo.

Medir después fast_path_hit_rate, agent_fallback_rate, clasificación correcta,
falsos positivos, latencias de ambas rutas y turnos que invocan al generador.
La prioridad de seguridad es evitar falsos positivos; no se establece un ahorro
mínimo arbitrario. Los casos de diseño no son un experimento ni preguntas RAGAS.

## Artefactos relacionados

- [Especificación de enrutamiento](../enrutamiento-intenciones.md).
- [Catálogo declarativo](../../backend/api/intent-routing.catalog.json).
- [JSON Schema de catálogo y casos](../../backend/api/intent-routing.schema.json).
- [Casos de clasificación](../../eval/intent-routing/cases.json).
- [REST humano](../../backend/api/api-contract.md) y [MCP](../../backend/mcp-server/tools-contract.md).
