# BanuChat — paquete breve para revisión del director

29 de octubre de 2026. **Propuestas para decisión; no aprobación académica o CCD.**
Se prepara para lectura local del autor/director; no se ha enviado a terceros.

## Qué existe y puede mostrarse

BanuChat es un prototipo local de consulta asistida. Una app Expo SDK 57 usa login
propio con cuentas ficticias y REST v2. Las consultas documentales trabajan con
107 unidades CCD seleccionadas para desarrollo local; progreso, calendario y
novedades son auxiliares ficticios. No hay autenticación ni expediente UNAB.

La API autoriza cuenta y conversación y usa un router determinista. Los servicios
estructurados leen PostgreSQL; Document RAG recupera evidencia con pgvector y
utiliza Ollama para embeddings/síntesis cuando corresponde. Algunas solicitudes
multifuente emplean un webhook N8N y un agente determinista con tools MCP. Esa
rama no constituye ReAct. N8N también orquesta ingesta manual local, con lógica
de procesamiento en el backend.

Puede demostrarse login → consulta → respuesta → cita → fuente → seguimiento →
historial → logout. El recorrido está [acreditado físicamente en Android 10](../../eval/mobile/results/android-mvp-ccd14-validation.md),
con seis turnos y 21 capturas privadas. Las fuentes consultadas no se publican.
La rama documental y servicios directos no requieren N8N en cada turno; el
preflight actual encontró 15679 no disponible y no se promete una demo multifuente
sin comprobar esa dependencia.

## Evidencia por objetivo

| OE | Evidencia disponible | Lo que todavía no acredita |
| --- | --- | --- |
| OE1 | Baseline real CCD 1.4.0, informe y diagnóstico; mejoras posteriores FLOW-01/02/03/04 | Todas las metas, autoridad documental o validación independiente |
| OE2 | Tres flujos fixture; 6/6 documentos y 42/42 campos en el corte local | Scraping real autorizado, tres ejecuciones autónomas o frescura institucional |
| OE3 | MCP real, seis tools y agente determinista acotado | Ciclo ReAct gobernado por LLM |
| OE4 | N8N/MCP local, calendario fixture y prueba de fallo seguro | Google Sheets institucional y BPM completo |
| OE5 | REST/adaptadores y Android físico del MVP | SUS, aceptación con estudiantes, iOS físico, push remoto y accesibilidad integral |
| OE6 | Infraestructura y operación local, integración, rendimiento acotado y restore | Servidores UNAB, estabilidad institucional o aceptación integral |

La [matriz vigente](oe1-oe6-current-status.md) mantiene el compromiso original,
la evidencia concreta y las brechas por separado. Ningún OE se declara aprobado.

## OE1: resultados que deben conservarse

Se intentaron 43 casos: 39 respuestas y cuatro abstenciones, cero errores/timeouts.
La muestra no alcanza el mínimo histórico de 50–80. Las abstenciones permanecen
en el denominador operacional; RAGAS solo puntuó las 39 respuestas.

| Indicador | Observado | Referencia preliminar | Lectura |
| --- | ---: | ---: | --- |
| MRR@5, 43 casos | 0,813953 | ≥0,70 | Superada numéricamente |
| Faithfulness, 39 | 0,952991 | ≥0,80 | Superada; juez exploratorio |
| Context precision, 39 | 0,709402 | ≥0,80 | No alcanzada |
| Context recall, 39 | 0,713675 | ≥0,75 | No alcanzada |
| Answer relevancy, 39 | 0,618210 | ≥0,80 | No alcanzada |

Precision@5=0,306977 y Recall@5=0,764673 describen el ranking y no equivalen a las
métricas de contexto RAGAS. Una faithfulness alta no garantiza pertinencia: hubo
respuestas sustentadas en un contexto que no atendía el aspecto preguntado.
El juez comparte modelo con el generador; AnswerRelevancy conserva el antecedente
7/12 de coincidencias técnicas. Autor único, sin revisión humana independiente
ni reserva verdaderamente ciega. MRR@5 es una operacionalización por aceptar.

Las mejoras de producto corrigieron mecanismos observados y pasaron regresiones;
no se repitió el baseline para elevar esas cifras. El
[informe académico](../../eval/rag-quality/results/oe1-cierre02-technical-report.md)
separa ejecución técnica, desempeño y aceptación pendiente.

## Decisiones imprescindibles

1. Determinar si el corpus local seleccionado y sus límites sirven como evidencia
   académica, sin atribuirle ratificación institucional inexistente.
2. Resolver la muestra OE1 de 43, sus exclusiones/correcciones técnicas, MRR@5,
   el juez exploratorio y la revisión independiente pendiente.
3. Resolver expresamente los compromisos de RPA/scraping, ReAct y Sheets/BPM:
   conservarlos exige fuentes, permisos, implementación y evaluación adicionales.
4. Mantener como no cumplidos los criterios humanos OE5 o aprobar otra salida
   metodológica limitada. El cierre canónico no autoriza reclutar ni ejecutar SUS.
5. Decidir si se mantiene el despliegue UNAB o se acepta expresamente una entrega
   local; no equiparar ambas por documentación técnica.

## Alcance recomendado y riesgo de plazo

Se recomienda cerrar la entrega técnica con el producto local actual, el baseline
histórico, la demostración reproducible y esta trazabilidad. Proponer una acotación
explícita de las dependencias externas permite presentar lo realizado sin prometer
capacidades institucionales no comprobadas. **Es una recomendación pendiente**,
no una nueva formulación aprobada de los objetivos.

Si se conservan todos los compromisos, primero hacen falta decisiones, fuentes,
agenda de validación y recursos universitarios. No es defendible fijar una fecha
de cumplimiento sin ellos. Aumentar código local no obtiene permisos, estudiantes,
credenciales de una hoja ni servidores. La propuesta no elimina brechas: las deja
visibles para que el director decida el alcance final realista. No se redactó otra
versión extensa del anteproyecto ni se solicitó aprobación institucional en su nombre.
