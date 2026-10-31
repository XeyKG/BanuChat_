# OE1-QUALITY-03 — expectativas previas a la corrección

Fecha: 31 de octubre de 2026. Escenarios de desarrollo totalmente sintéticos.
No son preguntas del benchmark ni una estimación de calidad.

La revisión encuentra FLOW-03 y la representación inicial FLOW-04 ya incorporados
en `ca2408c`. Se reutilizan sus regresiones; no se rediseña intención, retrieval ni prompts.

Resultados esperados, fijados antes de modificar producción:

| Escenario | Resultado exigido |
| --- | --- |
| Resumen cuya condición final excede el presupuesto | Omitir el paquete completo; nunca entregar una afirmación truncada sin su condición |
| Detalle pertinente demasiado grande seguido de otro que sí cabe | Omitir la viñeta indivisible grande y conservar la siguiente, sin superar 1.600 caracteres |
| Todos los paquetes quedan vacíos o rechazados | Abstenerse sin generar ni atribuir citas vacías |
| Primer paquete rechazado y segundo admisible | Numerar el contexto y resolver FUENTES contra el segundo paquete real |
| Condición multilínea y hechos parcialmente contradictorios dentro del presupuesto | Transmitir íntegros los hechos pertinentes y sus condiciones; no suprimir una contradicción ni añadir autorización |
| Órdenes incrustadas, código y sección ajena | No transmitir esos bloques; el filtrado no promete inmunidad universal a inyección |
| Límite documental con soporte, historia sin derecho individual, disponibilidad sin soporte | Reutilizar las guardias y citas existentes; un antecedente nunca concede disponibilidad o reconocimiento actual |

El presupuesto y el resumen constituyen un límite de seguridad: cuando el resumen
no cabe íntegro o contiene órdenes detectadas se rechaza el paquete, en lugar de
extraer detalles que podrían haber perdido su contexto. Un rechazo puede aumentar
abstenciones en esos casos; no se afirma que sea una mejora de recall.

La comprobación operacional será corta, mediante `createAuthenticatedDocumentRag`,
SQL autenticado y transacciones READ ONLY terminadas con ROLLBACK. Sin sesiones
nuevas, escrituras, baseline de 43 preguntas, RAGAS ni cambios de configuración.
