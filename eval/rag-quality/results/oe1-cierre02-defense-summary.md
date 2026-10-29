# BanuChat — resumen oral de OE1

Duración orientativa: dos a tres minutos. Material público; sin ejemplos CCD privados. No son diapositivas.

**Qué evaluamos.** Evaluamos el componente documental CCD que BanuChat utiliza para recuperar evidencia y construir respuestas. Medimos ese camino concreto, no toda la aplicación móvil, autenticación o enrutamiento de extremo a extremo.

**Cómo lo evaluamos.** Congelamos antes de consultar el sistema un benchmark de 43 preguntas sobre CCD 1.4.0, con 107 unidades publicadas. Conservamos dos exclusiones justificadas y no inventamos preguntas para llegar a 50. Después de una prueba técnica prefijada, ejecutamos una sola pasada y guardamos rankings, evidencia seleccionada, contextos suministrados, citas, respuestas y abstenciones. Las correcciones revisadas por IA se identificaron como decisiones técnicas, no como una nueva aprobación humana.

**Qué obtuvimos.** Hubo 39 respuestas y cuatro abstenciones, sin errores ni timeouts. El sistema recuperó al menos un gold entre los cinco primeros en 37 de 43 casos. MRR@5 fue 0,814. Precision@5 fue 0,307 y Recall@5, 0,765; no deben confundirse con las métricas de contextos del juez.

RAGAS puntuó las 39 respuestas con contexto verificable. Sus medias exploratorias fueron: faithfulness 0,953, context precision 0,709, context recall 0,714 y answer relevancy 0,618. La fidelidad superó la referencia preliminar de 0,80; las otras tres quedaron bajo sus referencias. MRR superó 0,70, pero eso no demuestra que la respuesta completa sea adecuada.

**Qué falló.** Encontramos consultas dirigidas a un ámbito distinto, evidencia recuperada que se descartó al seleccionar, comparaciones respondidas con fichas demasiado generales y pérdida de detalles al formar el contexto. Dos guardias también impidieron explicar información documental. Los ocho desvíos de tema originales ocurrieron sin llamar al generador: no sería defendible culpar de todos ellos al modelo o proponer únicamente cambios de prompt.

**Qué significan las métricas.** MRR mide qué tan pronto aparece un relevante. Faithfulness mide respaldo respecto del contexto suministrado. Una respuesta puede ser fiel a una fuente y, aun así, hablar de otra cosa. Verificamos 62 identidades de citas, pero una cita válida tampoco prueba que se haya respondido la pregunta. Algunas omisiones frente al gold eran diferencias de granularidad y no errores demostrados.

**Qué límites reconocemos.** Trabajamos con 43 frente al criterio histórico de 50, fuentes compartidas, sin reserva ciega ni revisión humana independiente de las correcciones. RAGAS es exploratorio: su comprobación pequeña no elimina la limitación previa del juez. La delegación técnica no equivale a ratificación del CCD ni aprobación del director.

**Qué sigue.** Cerramos la ejecución y el diagnóstico técnico de esta evaluación. Proponemos cinco intervenciones acotadas sobre el flujo existente, empezando por sujeto/alcance y selección de evidencia; la quinta requiere investigación antes de cambiar el producto. La aceptación académica de la muestra y de la operacionalización sigue pendiente. No afirmamos que OE1 haya alcanzado todas sus metas.

Frase de cierre sugerida: «Tenemos una línea base real y trazable que muestra tanto capacidad de recuperación como problemas de selección y respuesta. Cerramos la fase técnica de medir y diagnosticar; los resultados no equivalen a aprobación académica ni a cumplimiento de todos los objetivos».
