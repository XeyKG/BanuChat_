# BanuChat — cierre de regresiones del piloto multidominio

Fecha: 2026-10-26. HEAD: `8025b2deb4aa32fb9890e8c18eabbe3246a0d7c7`. Piloto privado aislado; sin publicación ni integración en el producto habitual.

## 1. Causas demostradas

Se cerraron los seis registros producidos por tres causas. La revisión conserva los criterios y denominadores congelados: no se aceptó una respuesta solo por tener citas o no abstenerse.

- **Propósito:** OP-001 había conservado estructura y duración, omitiendo la finalidad disponible en BASE-10 y los párrafos documentales ya extraídos. Se recuperan evaluación del nivel, orientación formativa, reconocimiento de aprendizajes previos y validación independiente. Esto no se equipara a una homologación ordinaria de cursos antiguos.
- **Antecedentes:** OP-010/011 omitían la lista de verificación admitida en BASE-12. Se conservan plan, códigos, registro institucional, programa/modalidad y situaciones diferenciadas de cursos y pruebas antiguas. La lista se identifica como síntesis de verificación; no se presenta como una enumeración literal de un único original. Se mantiene la tabla histórica con sus conjunciones y su divergencia con la prosa, sin reconocer pilares personales.
- **Pagos:** el retorno exclusivo de transición eliminaba la intención financiera del mensaje actual. Ahora se preservan ambas dimensiones: la consulta actual define el aspecto y el historial activo del usuario aporta el antecedente. Una primera prueba, una repetición, un curso, una prueba extemporánea y una extraordinaria no se fusionan ni permiten deducir gratuidad individual.

Los localizadores, versiones, hashes y atribuciones documental/confirmación/inferencia/pendiente están en los artefactos privados. No se modificaron originales ni se amplió el universo documental.

## 2. Cambios aplicados

Solo cambian el módulo experimental `backend/api/src/chat/ccd-operational-pilot.ts`, sus pruebas y este informe. El módulo de preparación RAG y sus controles permanecen intactos.

La selección reconoce finalidad y verificación, conserva pagos junto con transición y permite que un objeto expresamente nombrado aporte su propio antecedente. Un cambio explícito de tema descarta el historial anterior. No se toman respuestas previas del asistente como evidencia. No hay excepciones por ID ni por pregunta literal, ni tablas de respuestas para superar el banco.

Se extraen pasajes revisados con sus límites en los ámbitos normativos acotados. Esto evita que un clasificador rechace la explicación de una regla condicional por no poder verificar un expediente. El clasificador y la síntesis se mantienen para los demás ámbitos. Se preservan los rechazos de datos personales y disponibilidad individual.

La revisión de desarrollo detectó además una síntesis que atribuía las dos horas a cada pilar y preguntas explícitas tratadas como ambiguas. Se corrigieron el alcance de estructura y la resolución de sujeto. Las consultas descriptivas de cursos excluyen paquetes exclusivamente numéricos, evitando detalles de horas no solicitados. Una exención académica no se clasifica como pago solo por la palabra «exento».

Los campos `retrieved_claim_ids`, `selected_claim_ids`, `supporting_claim_ids` y `cited_claim_ids` se registran por separado. La cobertura utiliza evidencia sustentadora, con revisión semántica adicional. No se añadieron citas para forzar igualdad.

## 3. Resultados antes/después

| Banco congelado | Antes | Después |
| --- | ---: | ---: |
| Funcionales | 50/50 | 50/50 |
| Primarias | 69/72 | 72/72 |
| Robustez, subconjunto de primarias | 34/35 | 35/35 |
| Negativas seguras y apropiadas | 24/24 | 24/24 |
| Regresiones P0 | 9/10 | 10/10 |
| Secuencias anteriores | 8/9 | 9/9 |
| Turnos de esas secuencias | 20/22 | 22/22 |
| Secuencias nuevas | 3/3 | 3/3 |
| Turnos de secuencias nuevas | 11/11 | 11/11 |

Los seis registros objetivo pasan de cinco parciales y un desvío temático a seis respuestas completas. Las primarias incluyen dos aclaraciones apropiadas y P0 otras dos; los denominadores no se reducen para excluirlas. Las negativas conservan la posibilidad de una explicación acotada que rechace el supuesto, sin exigir una abstención literal.

Se ejecutaron también **27 variantes de desarrollo** y **12 casos de aceptación técnica**, todos correctos según revisión del agente. Los primeros 18 casos nuevos revelaron problemas y pasaron a desarrollo; sus resultados iniciales permanecen guardados. Se congeló por separado una reserva de 12 casos y se repitió tras el último ajuste general. Fue redactada por el mismo agente: **no es una evaluación ciega ni humana independiente**. El responsable confirmó que revisará las respuestas al finalizar; esa revisión sigue pendiente y dispone de una ficha privada.

La selección final contiene **228 registros**: 189 comparables con C anterior, 27 variantes y 12 de aceptación. Las 35 robustas son un subconjunto, no registros adicionales. No se confirmó una afirmación sin respaldo, un falso rechazo con información admitida ni un fallo técnico en esta selección. Las fallas intermedias no se borraron ni se atribuyen al código final.

En las 41 positivas del banco funcional se conserva evidencia completa dentro de los primeros cinco resultados y en los claims sustentadores: 41/41 antes y después. El MRR fue 0,939 en ambos casos. Para las seis regresiones, una coincidencia con el ID antiguo no bastaba: faltaba el hecho dentro de su versión del derivado, o se excluían tarifas. La evidencia requerida queda completa en los seis casos corregidos.

Las medianas observadas sobre los 189 registros comparables fueron 401 ms antes y 370 ms después; p95, 3335 y 3185 ms. Hay caché y estrategias distintas de extracción/generación: no es un benchmark controlado de velocidad.

## 4. Auditoría de citas y trazabilidad

Las 16 diferencias anteriores pertenecían a síntesis que recibieron evidencia adicional y citaron un subconjunto. En todas, lo citado estaba seleccionado. La distinción era legítima; faltaba hacer explícita la evidencia realmente usada y evitar contar lo meramente seleccionado como cobertura.

En los 228 registros finales hay 21 diferencias entre selección y cita: 7 en síntesis y 14 en rechazos que no usan esas fuentes para afirmar hechos. No hay relaciones inválidas entre los conjuntos. Se verificaron release, chunk, SHA y bytes de los derivados; la pertenencia estructural se mantiene separada de la revisión semántica. Las citas nuevas no anuncian un endpoint HTTP de artefactos que el piloto no sirve.

## 5. Pruebas RAG en el directorio original

La primera corrida de este cierre reprodujo **222/229**, con siete rechazos de lectura protegida. Las pilas apuntan a la comparación posterior a lectura de tamaño/tiempos o identidad entre path y handle; no acreditan un error nativo de acceso denegado. No se capturó qué campo cambió en esos fallos.

Se observaron lecturas, permisos, atributos, rutas y concurrencia. Se verificaron **159 entradas de código/fixtures/metadatos sin diferencias de bytes** respecto de la corrida anterior. Hay atributos de reparse point; no se observó proceso OneDrive en la instantánea. Ninguno de esos hechos demuestra quién causó el cambio. No se capturó un propietario de bloqueo ni un evento de sincronización causante. Las corridas instrumentadas pueden alterar el tiempo de ejecución y no prueban ausencia del problema.

En este mismo directorio, sin réplica, pasaron después la suite serial **229/229** y `npm test` **229/229**. No se cambió `SafeReader`, no se relajaron validaciones ni se editaron fixtures o helpers. La causa ambiental exacta queda **no demostrada**, con todos los registros conservados. Las corridas verdes no borran los fallos iniciales ni garantizan que no reaparezcan.

API: typecheck y **649/649** pruebas. RAG: typecheck y las corridas originales anteriores. Se ejecutó integración directa de servicio con PostgreSQL/pgvector y Ollama reales; no aceptación HTTP autenticada, Mobile, N8N o MCP. `git diff --check` y la comprobación de alcance completan la entrega.

## 6. Aislamiento y preservación

La candidata privada `operational-c-closure-v1` tiene **86 claims y 86 chunks**, con cuatro derivados reconciliados y 82 contenidos conservados. Se reutilizó exclusivamente el PostgreSQL propio del piloto, en loopback 55473, sin almacenamiento compartido con la base habitual. El lector carece de escritura y el intento de escritura fue rechazado; no existe puntero `current` ni capacidad de publicación de producto en ese modelo.

Se generaron **86 embeddings documentales privados**. La comparación estricta del caché no reutilizó vectores en esta ingesta; no se afirma que se generaran solo cuatro. La configuración de embedding se mantuvo y los embeddings habituales no se regeneraron. Se conserva la candidata anterior con sus huellas y todos los recursos propios existentes.

Las instantáneas de la base habitual son iguales antes/después: `current`, releases, corpus y vectores. Los **124 originales externos** conservan sus hashes. El corpus sintético congelado y los artefactos del piloto anterior permanecen intactos. No hubo operaciones destructivas sobre Docker o PostgreSQL.

## 7. Pendientes y recomendación

No quedan regresiones funcionales conocidas en los conjuntos ejecutados bajo estos criterios. Permanecen la revisión humana de contenido/citas, la investigación ambiental si reaparecen rechazos de lectura y la validación sobre consultas no vistas de un evaluador independiente. Los resultados no son aval institucional ni garantía universal de generalización.

El cierre permite preparar la discusión del siguiente incremento tras esa revisión. Una integración autenticada, aceptación de artefactos y eventual publicación requieren diseño y decisión posteriores. Este trabajo se detiene antes de integrar o publicar: el piloto no está promovido y no se declara listo para producción.

## ESTADO DE ENTREGA BANUCHAT

- HEAD inicial/final: `8025b2deb4aa32fb9890e8c18eabbe3246a0d7c7`. Sin commit ni push.
- Versionables: módulo experimental API, su archivo de pruebas y este informe; tres archivos. RAG/REST habitual, contratos SQL, Mobile, N8N y MCP sin cambios.
- Artefactos privados ignorados: `data/ccd/local/p0-operational-regression-closure/`. Incluye los diez entregables, registros finales/intermedios, hashes, diagnóstico y ficha de revisión humana.
- Tests: API 649/649; RAG original serial y predeterminado 229/229; ambos typechecks; integración privada de 228 registros. La corrida inicial RAG 222/229 permanece documentada.
- Base/corpus/current habituales y API 3004: sin modificaciones. Candidata y embeddings únicamente en recursos privados aislados; contenedores conservados.
- Promoción, release de producto e integración: no realizadas. Revisión humana: pendiente.
