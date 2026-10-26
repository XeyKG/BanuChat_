# BanuChat — Piloto operativo multidominio aislado

Fecha: 26 de octubre de 2026, America/Bogota. HEAD: `3ee0c217336d837715ffdd87267d87f5d590dff9`.

**Piloto implementado y ejecutado en aislamiento; no apto todavía para promoción.** C respondió correctamente los 20 casos obligatorios y los 50 del banco funcional nuevo según revisión técnica. Sin embargo, quedaron respuestas parciales y un seguimiento incompleto en las regresiones anteriores. El producto habitual y su release `current` se conservaron.

## 1. Reglas funcionales contrastadas

La nueva decisión del responsable se registra como autorización de trabajo del proyecto, no como aprobación institucional independiente. Se separan `DOCUMENT_SOURCE`, `DOMAIN_CONFIRMATION`, `INFERENCE` y `PENDING_CLARIFICATION`. Una confirmación no se convierte en una cita documental que no existe.

El modelo privado cubre las once familias solicitadas: instrumentos y umbral inclusivo de la diagnóstica; validación independiente; finalización por pruebas, cursos o combinación; matrícula y planificación sin secuencia general obligatoria; ventanas de presentación; catálogo de siete cursos y relación con pilares; conceptos tarifarios distintos; transición histórica; canal organizacional autorizado; créditos, horas e inasistencia; y guías con sus condiciones de interfaz.

Se distingue catálogo, curso para completar un pilar y grupo disponible. Tampoco se confunde aprobar una prueba antigua con haber cursado una asignatura de la tabla histórica. No se confirma una equivalencia individual, un nuevo intento ilimitado, una tarifa futura, un docente o una fecha exacta de insignia.

Las tablas de los siete syllabus se verificaron visualmente. Se preservó la diferencia entre horas teóricas y teórico-prácticas, además de la distinción documental entre créditos operativos y del plan. El ejemplo aritmético inconsistente quedó identificado como tal; su corrección es una inferencia matemática, no otra regla académica.

## 2. Reconciliación de conflictos y decisión propuesta

Los 15 grupos anteriores permanecen trazables con pasajes, SHA-256, localizadores, interpretaciones, aclaración aplicable, alcance y material histórico. No se editó un original ni se eligió precedencia solo por fecha.

| Resultado | Grupos | Alcance |
| --- | ---: | --- |
| Resueltos para el proyecto | 7 | CF-001, 006, 007, 008, 010, 011 y 012 |
| Delimitado documentalmente | 1 | CF-013: el contenido del syllabus prevalece para describir el curso frente a una paráfrasis promocional |
| Parcialmente resueltos | 2 | CF-002 y 014: permanecen detalles de elegibilidad/intentos y del ejemplo de asistencia |
| Abiertos | 5 | CF-003, 004, 005, 009 y 015: servicios tarifarios, correspondencias, cohortes, ámbitos de homologación y rama condicional de la guía |

La tabla de transición conserva exactamente sus conjunciones y agrupaciones; la diferencia respecto de la prosa no se elimina. Los servicios de pruebas con tarifas diferentes siguen separados por concepto, población y periodo conocido o desconocido.

La propuesta versionable está en `docs/transition/ccd-operational-pilot-decision.md`. Explica qué restricciones de admisión anteriores supera la nueva decisión exclusivamente para el experimento y cuáles siguen vigentes. No se reescribió una ADR histórica.

## 3. Corpus candidato y procedencia

La candidata C contiene **86 claims y 86 chunks resultantes de la preparación**: 26 claims académicos reutilizados, 38 oportunidades descriptivas del análisis anterior, 15 claims operativos y 7 paquetes de créditos/horas. El número no fue una cuota. Los doce informes de tensión propuestos anteriormente se conservaron como gobernanza y no se ingirieron como reglas que decidan casos personales.

Cada claim conserva identificador, afirmación, bases de procedencia, localizadores, periodo, población, condiciones, excepciones, revisión, confirmación cuando existe, contradicciones, preguntas y relación con los pilares. Hay referencias adicionales para las fechas de los documentos históricos. La admisión es `ADMITTED_ISOLATED_PROJECT_PILOT`, con `isolated_evaluation_allowed=true`, `evidence_visible_allowed=false` y sin aprobación institucional de publicación.

La preparación agrupa contenido por tema y sección, conserva contexto y separa detalles extensos. En esta candidata resultó un fragmento por claim; ello no se exige como contrato ni se usa como regla de fragmentación de filas extraídas. Solo se escribieron derivados privados depurados y sus manifiestos. No se incorporaron originales completos, expedientes, contactos personales ni programación individual.

También se revisó material no textual: 32 imágenes únicas, muestras visuales de 27 videos tras decodificación y tres páginas del PDF editorial sin texto fiable. No hubo transcripción de audio ni revisión semántica de cada fotograma. Ese material no se admitió como autoridad académica ni como única evidencia de una regla. Las cuatro guías antiguas de cátedra se conservaron como contexto de edición incierta; las fechas de sus formatos no se declararon fechas de vigencia de sus cursos.

## 4. Cambios de implementación

`backend/rag/src/ccd/isolated-pilot.ts` implementa preparación pura, hashes de contenido/manifiesto, separación de bases, validaciones de datos sensibles y staging transaccional en el destino de prueba. Rechaza otro nombre de base, otro rol, ausencia del marcador de aislamiento o presencia de un puntero de publicación. No llama al escritor histórico ni al finalizador del producto.

`backend/api/src/chat/ccd-operational-pilot.ts` reutiliza los contratos internos de consulta, embeddings, normalización y citas. La búsqueda usa metadatos admitidos antes de ordenar por coseno exacto; el selector no depende de los doce localizadores antiguos. Reutiliza el resolvedor conversacional existente y vocabulario ortográfico acotado. El historial del usuario identifica el tema; una respuesta anterior del asistente no se vuelve evidencia.

Las reglas sensibles se presentan mediante extracción de párrafos revisados, con sus condiciones y atribución, después de una comprobación de respondibilidad. Las comparaciones entre cursos muestran las fuentes separadamente. La generación libre se limita a síntesis descriptivas con referencias válidas. No hay respuestas asociadas a IDs del banco ni un diccionario de preguntas y respuestas. Tampoco hay retry automático de generación o ingesta.

La separación responde a fallos observados: la síntesis libre llegó a mezclar pruebas antiguas con instrumentos actuales, cambiar el objeto de una regla y atribuir contenidos comunes no respaldados. Las pasadas anteriores se conservaron. No se atribuye a la estrategia extractiva una capacidad de razonamiento generativo normativo que no fue acreditada.

Se mantuvieron PostgreSQL/pgvector, Ollama, embeddings de 1.024 dimensiones y búsqueda exacta por coseno. No se añadieron índices aproximados, ORM, microservicios, agentes, contratos públicos o frameworks. Mobile, MCP y N8N no cambiaron. El generador y sus parámetros permanecieron en la configuración local existente.

## 5. Aislamiento ejecutado

Se creó `banuchat-p0-operational-pilot`, con almacenamiento propio, base `banuchat_p0_operational` y acceso en loopback `55473`. Los roles de administración, escritura y lectura son exclusivos del experimento. El lector carece de permisos de escritura y su intento de inserción fue rechazado con `25006`.

El modelo de lectura privado no tiene tabla ni puntero `datasets.current_release_id`, ni finalizador del producto. Un candidato marcado como legible en esta base no está publicado en BanuChat. Las versiones intermedias se preservaron; B y C finales corresponden a los manifiestos privados `academic-b-v5` y `operational-c-v5`.

A copia doce chunks documentales bajo identidades nuevas, sin copiar cuentas ni datos auxiliares individuales. B contiene esos conocimientos y el piloto académico: 38 chunks. C tiene 86. Se comparten los modelos y el motor local de Ollama para conservar la configuración, sin compartir datos de PostgreSQL ni un puntero de publicación.

Las comprobaciones antes/después mantuvieron iguales el `current`, las huellas de manifiesto/pipeline, el historial de releases y la huella de los chunks/vectores habituales. La API en `3004` no fue reiniciada, reconfigurada ni utilizada para escribir conversaciones de prueba. No se ejecutó una migración en la base unificada.

La integración evaluada es el servicio de aplicación RAG con PostgreSQL/pgvector y Ollama reales. **No es una nueva aceptación HTTP autenticada, móvil o de N8N/MCP.** Las citas nuevas no anuncian URLs de artefactos que este evaluador no sirve; la procedencia y los bytes se comprueban fuera de línea.

## 6. Pruebas efectivamente ejecutadas

- Typecheck de `backend/api` y `backend/rag`.
- Suite API: **640/640**. Suite RAG: **229/229 en una réplica temporal fuera de OneDrive**, con 159 comprobaciones de igualdad de bytes de código y fixtures respecto del proyecto.
- Las corridas RAG en la ubicación original dieron primero 221/229, luego 229/229 y finalmente 225/229; los fallos fueron de lectura protegida. No se cambió `SafeReader`. El primer checkout temporal obtuvo 226/229 por diferencias en dos archivos de metadatos; se copiaron sus bytes originales únicamente a la réplica y se verificó igualdad completa antes de repetir. No se presenta el éxito de la réplica como una corrida final sin fallos en la ubicación original ni se declara acreditada una causa ambiental única.
- Banco nuevo de 50 casos en A, B y C: **150 registros**; incluye los 20 obligatorios.
- C: 72 primarias, 24 negativas y 10 regresiones P0: **106 registros**. Las 35 robustas son un subconjunto de las primarias, no casos adicionales.
- Nueve secuencias anteriores, 22 turnos; tres nuevas, 11 turnos.
- Selección final: **289 registros de recuperación/respuesta**. Las ejecuciones de desarrollo se conservan aparte y no se suman como preguntas únicas.
- Permisos reales de lectura, separación de almacenamiento, ausencia de publicación y preservación del corpus habitual; integridad de fuentes, manifiestos, citas y `git diff --check`.

La adjudicación es técnica, realizada por el agente contra respuestas y evidencia. No es una evaluación humana independiente ni institucional. El banco se congeló antes de ejecutar, pero después se utilizó durante desarrollo: **no es un holdout ciego**. Sus criterios y notas por caso están disponibles para revisión.

## 7. Comparación anterior/posterior

Los 50 casos contienen 41 preguntas positivas o condicionales y 9 controles. La información admitida se juzgó separadamente de responder y de rechazar con seguridad. Un párrafo relacionado pero que no contesta la pregunta no recibe crédito de respuesta correcta.

| Medida en ese banco | A: actual, 12 chunks | B: académico, 38 | C: operativo, 86 |
| --- | ---: | ---: | ---: |
| Positivas con información admitida | 15/41 | 15/41 | 41/41 |
| Respuestas positivas correctas y respaldadas | 10/41 | 15/41 | 41/41 |
| Controles con respuesta apropiada | 7/9 | 9/9 | 9/9 |
| Total correcto | 17/50 | 24/50 | 50/50 |
| Falsas abstenciones con evidencia admitida | 2 | 0 | 0 |
| Casos con afirmación no respaldada confirmada | 3 | 0 | 0 |
| Casos pendientes de revisión independiente | 1 | 0 | 0 |
| Fallos técnicos de ejecución | 0 | 0 | 0 |

Los juicios estrictos de A incluyen inferencias no admitidas por su propio corpus, aunque alguna regla coincida con una confirmación posterior. La nueva autorización no se aplica retroactivamente como evidencia de A. El caso pendiente de A no se contó como correcto ni se declaró definitivamente falso.

C aportó **26 respuestas positivas respaldadas adicionales frente a B** en este banco. Los 20 obligatorios quedaron en 19 respuestas correctas y una abstención apropiada sobre docentes futuros. El banco incluye tres comparaciones de cursos y dos situaciones compuestas operativas. Algunos paquetes ya combinan originales por curación; eso se distingue de recuperar varios fragmentos durante una consulta.

La recuperación por grupos de evidencia, contando solo las positivas admitidas en cada alternativa, encontró toda la evidencia requerida dentro de los primeros cinco resultados: A 15/15, B 15/15 y C 41/41. El MRR observado fue 0,967, 1,000 y 0,939 respectivamente. En C, recall@1 fue 0,817 y recall@3 fue 0,976. Los grupos que representan hechos equivalentes o solapados fueron anotados técnicamente después de la ejecución; no se presentan como una métrica humana independiente prerregistrada. También se conserva la métrica estricta por IDs, que penaliza redundancias entre claims.

La integridad de las citas se contrastó con release, chunk y SHA recuperados; la revisión semántica se mantiene separada de esa comprobación estructural. No se considera una cita correcta solo por tener un UUID válido.

Las medianas de latencia fueron 662 ms, 13,5 ms y 325 ms; los p95 fueron 3.920, 2.441 y 2.501 ms. Hubo caché de embeddings de consulta y distintas estrategias de extracción/generación: **no es un benchmark controlado de velocidad de modelos**. A usa el RAG anterior; B y C comparten el selector experimental, de modo que tampoco es una ablación que aísle únicamente el corpus.

No se volvió a ejecutar el banco de 4.228 preguntas. Las estimaciones documentales anteriores permanecen como antecedentes, sin convertirlas en resultados de este piloto ni aplicar a ciegas expectativas antiguas de abstención superadas por R1–R11.

## 8. Regresiones e información aún no respondida completamente

| Conjunto C | Resultado de revisión técnica |
| --- | --- |
| 72 primarias | 69 correctas; 3 parciales |
| 35 robustas, subconjunto | 34 correctas; 1 parcial |
| 24 negativas | 24 seguras: 19 abstenciones y 5 respuestas acotadas |
| 10 P0 | 9 correctas; 1 parcial |
| 9 secuencias anteriores | 8 completas; una secuencia incompleta |
| 3 secuencias nuevas | 3 completas, 11/11 turnos correctos |

Los parciales no se ocultaron con la presencia de citas. Dos primarias no explican suficientemente el propósito de la prueba y otra omite el detalle anterior de plan, códigos y registro a verificar en una transición. P0 reproduce esta última carencia. Una secuencia antigua conserva una respuesta incompleta sobre antecedentes y no responde adecuadamente un seguimiento sobre pagos porque domina el tema de transición. Se anotó además un detalle de formato numérico en una respuesta descriptiva.

No se confirmó una alucinación en la selección final de C; sí se conservaron los fallos de síntesis de desarrollo. Ello no elimina los parciales ni demuestra ausencia de alucinaciones fuera del banco evaluado. Por estos resultados no se declara que todas las regresiones hayan pasado.

Siguen sin determinarse expedientes, notas, equivalencias personales, homologaciones universales, intentos ilimitados, fechas de emisión de insignia, tarifas futuras, grupos/docentes/cupos/horarios y calendarios actuales no aportados. Las condiciones abiertas de transición y del instructivo permanecen abiertas. Una abstención apropiada ante información individual ausente no se considera error.

## 9. Riesgos de una eventual publicación

La autoridad institucional independiente, la reserva de evaluación no vista y la revisión humana de ámbitos siguen pendientes. Una buena puntuación sobre un banco utilizado durante desarrollo no acredita generalización. Las respuestas extractivas son más extensas y las comparaciones presentan evidencia por fuente, sin acreditar síntesis autónoma de atributos comunes.

La inestabilidad observada en las lecturas protegidas de la ubicación original también requiere diagnóstico antes de una operación reproducible allí. El checkout temporal de pruebas se conservó, con ruta y hashes en el artefacto privado `test-worktree-integrity.json`; no contiene el corpus CCD privado. No se relajaron controles para obtener el resultado de la réplica.

El schema privado es un modelo de lectura de laboratorio, no una migración lista para el producto. Una promoción necesitaría diseño y autorización explícitos para persistencia, permisos, validación, artefactos y publicación en el destino habitual. No debe hacerse copiando tablas ni relajando guards históricos. También faltaría aceptación HTTP autenticada y de citas/artefactos en el entorno de producto autorizado.

## 10. Siguiente incremento propuesto

Cerrar primero los parciales documentados: conservar explícitamente el propósito de la prueba, detallar los antecedentes de transición sin inventar una regla de reconocimiento y resolver el cambio de aspecto conversacional hacia pagos. Revisar el formato y la selección de detalles numéricos no solicitados. Repetir los casos afectados y la regresión pertinente, con una reserva no vista redactada por otro evaluador.

Después, obtener revisión de contenido y una decisión sobre la integración autenticada aislada. Solo una decisión posterior puede autorizar un delta de persistencia/publicación del producto. La candidata actual se conserva para revisión y reproducción; no se promueve.

## ESTADO DE ENTREGA BANUCHAT

- HEAD de inicio y cierre: `3ee0c217336d837715ffdd87267d87f5d590dff9`.
- Nuevos: dos módulos de piloto, dos archivos de pruebas, la propuesta de decisión y este informe. Modificado: `backend/rag/README.md`.
- Artefactos privados ignorados: `data/ccd/local/p0-operational-multidomain/`; incluye todos los entregables solicitados, registros crudos, adjudicación, manifiestos, hashes y versiones intermedias. Los secretos de prueba permanecen privados.
- Pruebas: las ejecutadas arriba; sin aceptación HTTP/móvil ni pruebas sobre una base habitual con permisos de escritura. Las regresiones parciales no se declaran PASS.
- Base/corpus habituales: sin cambios ni regeneración de embeddings; `current` preservado. Escrituras y embeddings de prueba únicamente en recursos propios.
- Docker: contenedor de piloto propio conservado; contenedores habituales sin operaciones destructivas. N8N, MCP y Mobile: sin modificaciones. API `3004`: sin cambios.
- Fuentes externas: solo lectura. La verificación completa de hashes y de artefactos previos está en `validation-results.json` y `run-manifest.json`.
- Commit/push: no realizados. Promoción: no realizada y pendiente de otra decisión.
