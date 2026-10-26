# BanuChat — dominio y presentación conversacional

Fecha: 2026-10-26. HEAD: `1b5ba28a0a71fd36ea024efc115b7b5468540d4b`. Cambios exclusivamente en el piloto aislado; sin integración autenticada ni publicación.

## Dominio contrastado

Se registraron como confirmación del responsable la primera oportunidad diagnóstica gratuita, la finalización de los tres pilares, la consulta de otra jornada si no se asiste a la inicial y el alcance de la primera presentación de instrumentos nuevos en transición. No se deducen repeticiones gratuitas, disponibilidad cualquier día ni pérdida automática y definitiva de la primera oportunidad por faltar a inducción.

Se contrastaron las tres filas de la tabla histórica con sus localizadores y SHA. Sus correspondencias son de cursos y conservan las conjunciones; no se convirtieron pruebas antiguas pendientes en una tabla universal de equivalencias. Se mantiene la divergencia entre prosa y tabla. Las pruebas y cursos del esquema anterior se identifican como oferta anterior; el CCD debe determinar los instrumentos aplicables a un caso pendiente.

La nueva gratuidad se conserva como `DOMAIN_CONFIRMATION`, no como una tarifa documental inventada. Los valores especiales documentados no prueban por sí solos el costo de la primera oportunidad ordinaria. La nueva confirmación reemplaza la anterior limitación de precio desconocido en el ámbito del proyecto; tampoco modifica el texto histórico que describe las convocatorias. El contraste y los conflictos están registrados privadamente.

## Presentación y trazabilidad

Los hechos revisados tienen unidades de presentación reutilizables por aspecto. El selector compone únicamente los hechos pertinentes y mantiene el objeto mencionado por el estudiante entre turnos. No existe una tabla de preguntas y respuestas ni una excepción por ID. El propósito se compone con reglas de validación y finalización; una consulta sencilla de gratuidad utiliza solo el hecho de primera oportunidad. Los temarios conservan síntesis sobre evidencia acotada.

El texto principal no muestra etiquetas de auditoría, IDs, hashes, releases ni códigos internos de periodo. La presentación transforma `202660` en `2026-2` cuando corresponde; los campos originales y localizadores permanecen internos. Los títulos de citas también se revisan. La procedencia, periodo, claims recuperados/seleccionados/sustentadores/citados y claves de hechos utilizados se conservan en manifiestos y registros. Las unidades de presentación están cubiertas por el hash del manifiesto, aunque no cambien los bytes del documento ni requieran nuevos vectores.

Se mantuvieron los límites que cambian las respuestas: primera oportunidad frente a repetición, periodos y poblaciones tarifarias, validación independiente, ausencia de equivalencias personales, créditos operativos y horas, límite de inasistencia, pasos condicionales de una guía y fechas de insignia no determinadas. La revisión de desarrollo detectó y corrigió respuestas relacionadas pero insuficientes a negativos y cambios de referente en seguimientos de costos. Las observaciones intermedias se conservan; no se confunden con la selección final.

## Validación ejecutada

| Conjunto | Resultado técnico final |
| --- | ---: |
| Funcionales | 50/50 |
| Primarias | 72/72 |
| Robustez, subconjunto de primarias | 35/35 |
| Negativas | 24/24 seguras y apropiadas |
| P0 | 10/10 |
| Secuencias anteriores | 9/9, 22 turnos |
| Tres secuencias nuevas anteriores | 3/3, 11 turnos |
| Nuevos casos de presentación | 14/14 |
| Nueva secuencia progresiva | 1/1, 3 turnos |

Son **206 registros** finales. Las 35 robustas no se suman como casos adicionales. Se mantienen los criterios de corrección, completitud y seguridad; se documenta por separado la nueva información admitida sobre gratuidad. Las aclaraciones y negativas apropiadas cuentan conforme al comportamiento esperado, sin ocultar rechazos de preguntas respondibles.

No se detectaron etiquetas técnicas en contenido o etiquetas de citas de estos registros. Se cotejaron fuente derivada, release, chunk, SHA, unidades usadas y procedencia; ese cotejo estructural se complementó con revisión técnica de preguntas y respuestas. No se confirmó una afirmación sin respaldo en la selección final. Esto no demuestra ausencia de errores fuera del banco ni constituye revisión humana independiente.

Sobre los 189 registros comparables, la mediana de palabras pasó de 56 a 31. La respuesta sencilla sobre gratuidad tiene 12 palabras, sin desplegar tarifas ni catálogo. La medida de longitud describe la muestra; no sustituye la evaluación de condiciones o corrección.

API: typecheck y **654/654** pruebas. RAG: typecheck; **231/231** en ejecución serial y **231/231** con `npm test`, en el directorio original. La primera ejecución paralela dio 224/231, con 7 fallos de lectura protegida. No se cambió `SafeReader` ni se relajaron controles; la causa ambiental exacta sigue sin demostrarse. No se presenta esa corrida fallida como PASS.

La integración evaluada usa PostgreSQL/pgvector y Ollama reales en el servicio experimental. No es aceptación HTTP autenticada, móvil, N8N ni MCP. La muestra fue revisada por el agente y utilizada en desarrollo; no es una reserva ciega ni una validación institucional.

## Muestra y estado de entrega

`human-review-conversational.md` contiene 15 casos individuales y una secuencia de tres turnos: **18 respuestas**, no cientos. Cada caso muestra pregunta, contexto pertinente y respuesta de BanuChat. La auditoría de fuentes, claims, procedencia y resultado técnico está separada en una sección colapsada. Revisión humana: pendiente.

La candidata final privada tiene **87 claims y 87 chunks**. Se conservaron todas las candidatas anteriores y cinco versiones de esta preparación. Se generaron **6 embeddings documentales privados**; las versiones que solo ajustaron metadatos de presentación reutilizaron los 87 vectores con contenido/configuración idénticos. No se regeneraron embeddings habituales.

Las instantáneas habituales antes/después coinciden. El PostgreSQL del piloto sigue separado en almacenamiento, permisos y publicación: lector sin escritura, sin puntero `current` y con rechazo de la escritura de comprobación. Los 124 originales externos y los artefactos privados anteriores conservan sus hashes. No hubo operaciones destructivas sobre Docker o PostgreSQL.

## ESTADO DE ENTREGA BANUCHAT

- HEAD inicial/final: `1b5ba28a0a71fd36ea024efc115b7b5468540d4b`. Sin commit ni push.
- Versionables: módulo experimental API y sus pruebas; preparación experimental RAG y sus pruebas; este informe. Cinco archivos.
- Artefactos privados ignorados: `data/ccd/local/p0-conversational-presentation/`; incluye dominio, contraste, reconciliación, manifiestos, registros, auditoría de presentación y muestra humana.
- API habitual en 3004, base/corpus/current habituales, dataset sintético, Mobile, N8N y MCP: sin cambios. Contenedores conservados.
- Validación: las pruebas y corridas indicadas; `git diff --check` y comprobación de alcance. Sin aceptación autenticada ni publicación de producto.
- La revisión humana y la decisión sobre una integración posterior permanecen pendientes. Este trabajo se detiene antes de integrar o publicar.
