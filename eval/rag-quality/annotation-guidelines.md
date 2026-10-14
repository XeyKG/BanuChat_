# Guías de anotación del benchmark M9

Estas reglas se aplicarán al pool candidato, al benchmark principal y al conjunto de
reserva. Una candidata se acepta solamente cuando su pregunta, respuesta de referencia y
contextos relevantes pueden fijarse antes de observar la salida del sistema.

## Flujo de revisión

1. Leer el contexto completo del corpus sintético, sin consultar fuentes externas.
2. Redactar o revisar la pregunta sin mirar rankings ni respuestas del RAG.
3. Escribir la respuesta de referencia desde la evidencia seleccionada.
4. Registrar todos los contextos necesarios mediante `document_key`, `ordinal` y
   `locator`.
5. Clasificar el tipo de pregunta y revisar los criterios siguientes.
6. Marcar `approved` únicamente tras resolver ambigüedades; usar `review_notes` cuando
   una decisión requiera explicación.

Una herramienta automática puede proponer candidatas, pero no aprobarlas.

## Criterios de aceptación

### Answerability inequívoca

- La evidencia debe permitir una respuesta concreta, verificable y completa.
- Cada afirmación sustantiva de la respuesta de referencia debe estar respaldada por al
  menos un contexto gold.
- La pregunta no debe requerir adivinar intención, identidad, fecha o condiciones no
  presentes en el corpus.

### Claridad

- La pregunta debe ser comprensible en español sin contexto conversacional previo.
- Debe delimitar el objeto consultado y evitar pronombres o referencias ambiguas.
- No debe combinar tareas independientes solo para aumentar dificultad.

### No duplicidad

- Rechazar duplicados semánticos y paráfrasis triviales de una candidata ya aceptada.
- Dos preguntas pueden compartir contexto si evalúan hechos o relaciones distintos.
- La diversidad superficial de palabras no basta para considerarlas casos diferentes.

### Referencia verificable

- Verificar que cada `document_key` sea uno de `doc-001` a `doc-010`.
- Confirmar ordinal y locator contra el artefacto versionado.
- No depender únicamente de UUIDs de una release; esos UUIDs se resolverán al ejecutar.
- Incluir todos los contextos necesarios y excluir fragmentos meramente relacionados.

### Respuesta de referencia

- Redactar una respuesta breve pero suficiente para contestar la pregunta.
- Parafrasear de forma fiel; no copiar párrafos enteros ni introducir conocimiento externo.
- Incluir condiciones, negaciones y límites que cambien el significado.
- No optimizar su redacción después de observar la respuesta generada.

## Selección del tipo de pregunta

- `single_context`: un solo chunk basta para responder completamente.
- `multi_context_same_document`: se necesitan dos o más chunks del mismo documento;
  ninguno basta por sí solo.
- `multi_context_cross_document`: se necesitan contextos de dos o más documentos y la
  relación solicitada está respaldada por el corpus, no inventada por el anotador.

No etiquetar una pregunta como multi-context solo porque varios chunks aporten detalles
opcionales. El gold debe contener todos y únicamente los contextos necesarios para la
respuesta de referencia. El benchmark principal debe incluir entre 10 y 15 preguntas
multi-context legítimas.

## Formulación de preguntas

- Evitar copiar literalmente un encabezado o locator como pista artificial.
- Evitar cadenas exactas poco naturales diseñadas para favorecer coincidencia léxica.
- Permitir vocabulario natural siempre que la referencia permanezca inequívoca.
- No formular preguntas que dependan de datos reales, conocimiento institucional o
fuentes ajenas al corpus sintético.
- No preguntar por instrucciones ocultas, metadatos internos o comportamiento del modelo.

## Frontera con fast paths

Rechazar preguntas cuyo objetivo natural sea consultar datos estructurados atendidos por
fast paths, por ejemplo listas actuales de cursos, progreso de un perfil, eventos del
calendario o anuncios. M9 evalúa comprensión de contenido documental. Una pregunta sobre
la explicación o interpretación documentada de un concepto puede ser válida si su gold
procede de los documentos `chunked`.

## Ambigüedad y rechazo

Registrar en `review_notes` cualquier término discutible, dependencia entre contextos o
decisión de alcance. Rechazar una candidata cuando:

- existen varias respuestas incompatibles igualmente respaldadas;
- falta información para establecer objetivamente el gold;
- ordinal o locator no identifican evidencia estable;
- la respuesta requiere inferencias no justificadas;
- depende de conocimiento externo o de datos estructurados de fast path;
- es duplicada, trivialmente parafraseada o contiene pistas artificiales;
- no puede asignarse consistentemente un tipo de pregunta;
- se redactó o ajustó usando resultados observados del sistema.

Las candidatas rechazadas no se reutilizan como casos de abstención sin una revisión y un
protocolo separados.

## Revisión adicional

Se intentará que una persona ajena a la creación del corpus revise una muestra o el gold
completo antes de congelarlo. Deben registrarse solamente revisiones realmente realizadas.
Si no se dispone de esa persona, la ausencia se declara como limitación; no se inventan
nombres, fechas, acuerdos ni métricas de concordancia.

