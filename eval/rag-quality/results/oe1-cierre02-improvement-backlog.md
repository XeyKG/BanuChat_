# BanuChat — backlog priorizado después del baseline OE1

Fecha: 29 de octubre de 2026. **Propuestas, sin implementación ni experimentos nuevos.** Los IDs son identificadores técnicos; preguntas y evidencias completas permanecen privadas.

## Criterio de prioridad

Se consideran utilidad y riesgo para el usuario, número de casos asociados, mecanismo observado, esfuerzo y posibilidad de testear. Resolver el sujeto y alcance precede a seleccionar evidencia: si el filtro excluye el soporte, cambiar el generador no lo recupera. Los conteos no son una predicción del número de casos que quedarán corregidos ni una tasa de error validada.

| Prioridad | Intervención | Casos asociados | Evidencia | Esfuerzo / riesgo |
| --- | --- | ---: | --- | --- |
| 1 · CCD-FLOW-01 | Resolver sujeto, entidad y periodo antes del aspecto léxico | 6 | Mecanismo determinista respaldado por trazas y código | Medio / medio |
| 2 · CCD-FLOW-02 | Seleccionar soporte por afirmaciones y aspectos de la comparación | 7 | Recuperación material seguida de selección insuficiente | Medio / medio |
| 3 · CCD-FLOW-03 | Distinguir alcance documental de disponibilidad y comparación curricular | 2 | Dos guardias identificables en abstenciones observadas | Bajo–medio / medio–alto |
| 4 · CCD-FLOW-04 | Conservar detalle pertinente al representar el contexto recuperado | 1 | Pérdida visible entre chunk y prompt | Bajo–medio / medio |
| 5 · CCD-FLOW-05 | Investigar abstención semántica con soporte ya suministrado | 2 | Hipótesis; el motivo interno no está aislado | Medio / alto |

Las cuatro primeras agrupan 16 hallazgos materiales distintos. La quinta agrupa dos abstenciones todavía interpretables; no se suma como dos bugs confirmados. No se incluyen como bugs las siete diferencias del gold que no establecen un fallo material.

## 1. CCD-FLOW-01 — sujeto y alcance antes de palabras polisémicas

Casos: **034, 039, 012, 015, N-002 y 005**. Las salidas no llamaron al generador. Scope o claves SQL desplazaron entidad, periodo o una parte solicitada. Se propone ajustar la resolución semántica existente para preservar sujeto, acción y temporalidad antes de escoger una presentación canónica; no añadir reglas institucionales.

Tests futuros con fixtures sintéticos: selección de herramientas frente a selección de cursos; organización dentro de una materia frente a estructura general; instrumento de experiencia frente a diagnóstico; regla histórica frente a regla actual; dos funciones solicitadas frente a una sola función. Cuando falte sujeto, debe aclararse en lugar de responder sobre otra entidad. Estos tests no se ejecutaron aquí.

Riesgo: ampliar indebidamente el scope o perder límites históricos. Deben conservarse aislamiento de publicación, procedencia y abstención ante datos personales o disponibilidad no acreditada.

## 2. CCD-FLOW-02 — cobertura del aspecto, no solo de las entidades

Casos: **002, 013, 046, 047, 048, 049 y 050**. La evidencia material ya aparece en el conjunto recuperado, pero se devuelve una presentación de otro aspecto o una ficha general por curso. Se propone que la selección existente compruebe los aspectos de la pregunta y sus condiciones antes de construir la comparación. No basta con que aparezcan las dos entidades.

Tests futuros: dos entidades sintéticas con un atributo común solicitado, resúmenes generales distractores y soportes parciales complementarios; preservación de un soporte pertinente aunque otra ficha tenga prioridad genérica; respuesta limitada si falta una parte compatible. El criterio de éxito es cubrir el aspecto del usuario sin inventar relaciones, no reproducir un texto gold.

Riesgo: combinar reglas incompatibles o exceder la evidencia al inferir una relación. Mantener periodo, población y límites. No se propone ampliar `top_k` o el presupuesto para acomodar estos casos.

## 3. CCD-FLOW-03 — guardias sensibles al tipo de pregunta

Casos: **025 y 017**. Una guardia corta una pregunta sobre lo que acredita una fuente; otra trata nombres históricos como una comparación de cursos que exige evidencia por cada curso. Se propone delimitar las guardias actuales, conservando sus protecciones.

Tests futuros: explicación de un límite documental frente a solicitud de cupos reales; nombres dentro de una tabla histórica frente a comparación curricular; prohibición de conceder un reconocimiento individual a partir de esa tabla. La mejora no consiste en responder siempre ni en retirar la abstención.

Riesgo: medio–alto, porque un arreglo demasiado amplio podría transformar información histórica en una garantía vigente.

## 4. CCD-FLOW-04 — representación fiel y acotada de los detalles

Caso: **N-001**. El chunk recuperado contiene prácticas concretas, pero la formación del contexto solo transmite un resumen y reconoce un único formato de sección detallada. Se propone representar las secciones publicadas pertinentes sin pérdidas accidentales, con límites de tamaño y procedencia verificable.

Tests futuros: artefactos totalmente sintéticos con resumen y variantes de encabezado de detalle admitidas; comprobación de que las acciones solicitadas llegan al contexto; rechazo de secciones ajenas e instrucciones incrustadas. No se propone enviar documentos completos, aumentar retrieval ni reformular el prompt para memorizar el benchmark.

Riesgo: capacidad de contexto y filtrado de información no pertinente. La necesidad de detalle se comprobó en una traza; la mejora concreta aún debe implementarse y testearse.

## 5. CCD-FLOW-05 — investigación acotada de respondibilidad

Casos: **040 y 043**. El modelo recibió material y devolvió el marcador de insuficiencia. Eso prueba dónde terminó el flujo, no por qué. En uno de los enunciados también puede exigirse una relación que el gold entiende solo como coocurrencia temática.

Antes de cambiar el flujo, preparar controles sintéticos revisados: relación explícita, temas que coocurren sin relación, evidencia parcial y evidencia ausente. Comprobar cuándo corresponde responder con límites o abstenerse. La expectativa debe fijarse antes de experimentar; no inferirse del score RAGAS ni de la necesidad de hacer pasar estos IDs.

Riesgo alto: forzar una respuesta puede introducir relaciones no sustentadas. No hay evidencia causal suficiente para recomendar un cambio concreto de prompt, modelo o guardia en esta intervención.

## Condiciones de desarrollo posterior

Los mecanismos deterministas anteriores están documentados por la ejecución existente y código coincidente; aquí no se reprodujeron activamente ni se ejecutaron los tests futuros. El efecto de cada solución sigue sin demostrar. Cualquier implementación será otra tarea, con pruebas neutrales y registro previo de hipótesis; este baseline permanece intacto.

No se proponen nuevas tecnologías, ajustes de métricas, preguntas memorizadas ni tuning de prompts, filtros o `top_k` orientado solo al benchmark. La validación independiente del juez y las aceptaciones académicas son dependencias separadas, no una sexta intervención de producto.
