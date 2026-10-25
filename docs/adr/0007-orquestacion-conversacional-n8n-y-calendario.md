# ADR 0007 — Orquestación conversacional N8N acotada y calendario por release

- Estado: aceptada para OE4 sintético
- Fecha: 2026-10-24

## Contexto y contradicción

La arquitectura implementada hasta OE3 mantenía N8N fuera del camino síncrono de
consulta. Esa decisión reducía latencia y dependencia operacional, pero no cubría el
OE4 original: N8N debía participar en al menos un flujo conversacional que coordinara
agente y fuentes estructuradas/no estructuradas. El anteproyecto también comprometió
un calendario en Google Sheets y sincronización en un máximo de 30 minutos.

No existe una hoja institucional autorizada ni una credencial legítima de Google
Sheets en el entorno verificado. Tampoco se autoriza presentar un fixture como fuente
institucional. OE3 implementó selección MCP determinista y acotada; no acreditó un
ciclo ReAct gobernado por LLM.

## Decisión

1. Los fast paths, respuestas estáticas y `ccd_local` no pasan por N8N.
2. Solo el fallback sintético que necesita más de una tool MCP solicita a N8N una
   transición `invoke_bounded_mcp_agent`. La API crea `operation_id`, fija release y
   capacidad; N8N valida la rama y devuelve la misma correlación.
3. La API conserva autoridad sobre contexto, release, selección concreta de tools,
   límites del agente, validación de la respuesta, citas y persistencia. N8N no llama
   a la API pública, no ejecuta SQL y no contiene reglas académicas.
4. Un error, timeout, respuesta inválida o correlación distinta de N8N produce 503 y
   no ejecuta el agente ni persiste el turno.
5. El calendario usa un adaptador local representativo de Sheets hasta disponer de
   fuente y credencial autorizadas. El adaptador acepta identidad estable, zona
   horaria, contenido, tipo, `modified_at` y estados `active/cancelled/deleted`.
6. La sincronización publica una release sintética completa: clona evidencia y
   embeddings de la release vigente, sustituye solo eventos afectados, valida la
   integridad existente y mueve `current` atómicamente. No añade tablas ni modifica
   el dataset v1 congelado. Hash ya aplicado es `unchanged`; un fallo revierte la
   transacción y conserva la última release válida.
7. El workflow de calendario incluye schedule de 30 minutos e invocación manual de
   verificación, pero permanece inactivo en el export. Periodicidad no equivale a
   latencia real. Los tiempos del fixture se etiquetan no verificables.

## Seguridad y topología

El webhook conversacional usa una credencial Header Auth y
`X-BanuChat-Service-Token`; el token no se versiona. Calendario usa HTTP interno con
Bearer, token mínimo de 32 caracteres y selectores cerrados. Los endpoints internos
no reciben paths, SQL, perfiles ni credenciales de PostgreSQL. Mobile continúa
consumiendo solo REST.

La frontera evita el ciclo API → N8N → API pública → N8N: conversación hace una sola
llamada API → N8N y vuelve al backend; calendario hace N8N → servicio interno de
`backend/rag` → PostgreSQL.

## Consecuencias

- La consulta multifuente añade una dependencia síncrona y hasta 4 s configurables de
  presupuesto por defecto. La disponibilidad de esa rama queda limitada por N8N.
- Los fast paths conservan su latencia y disponibilidad anteriores.
- Publicar calendario cambia la release vigente; conversaciones abiertas sobre la
  release anterior reciben el conflicto ya previsto y no mezclan evidencia.
- Clonar una release evita un segundo almacenamiento, pero cuesta una copia de sus
  filas y embeddings. Es aceptable para el corpus demo; OE6 deberá medirlo y decidir
  topología, health checks y capacidad antes de despliegue.
- Se acredita un flujo de demostración, no BPM institucional general ni la métrica
  real ≤30 min de Google Sheets.

## Alternativas descartadas

- Enviar toda consulta a N8N: penaliza rutas deterministas sin necesidad.
- Implementar agente o SQL en nodos N8N: duplica autoridad y rompe contratos.
- Guardar un calendario mutable paralelo consultado fuera de releases: rompe
  coherencia de citas y procedencia.
- Conectar o inventar una hoja institucional: no hay autorización ni credencial.
