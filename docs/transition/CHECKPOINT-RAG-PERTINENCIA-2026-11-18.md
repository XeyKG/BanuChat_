# BanuChat — pertinencia y cobertura del RAG CCD (18/11/2026)

## Problema y alcance

El propietario aportó 18 consultas contrastadas por otra herramienta con documentación CCD local. Solicita mejorar la lógica general, no memorizar esas preguntas. Su calificación 6/18 es una evaluación aportada por el usuario, no una métrica independiente certificada del proyecto. Las respuestas esperadas también requieren comprobarse contra los pasajes efectivamente publicados.

## Causas demostradas y corrección

- Precedencia demasiado amplia de palabras compartidas: modalidad podía desplazar duración, alcance de un instructivo o solicitud de oferta futura. Se preservan sujeto y atributos antes de elegir un aspecto.
- Se tomaba el primer pasaje con una etiqueta amplia, aunque tratara otro asunto. Se ordena por pertinencia del texto dentro de los resultados ya recuperados; el nombre del curso no cuenta por sí solo como soporte temático.
- Los resúmenes de un curso podían desplazar detalles pertinentes. La selección considera contenido, rol curricular y términos de la consulta conservando los límites de contexto existentes.
- Comparaciones exigían palabras interrogativas como si fueran atributos documentales. Se eliminan esos términos del requisito de soporte, conservando la obligación de evidencia por entidad y compatibilidad de periodo y población.
- Preguntas analíticas de transición recibían un párrafo genérico. Cuando los hechos canónicos no resuelven la relación solicitada, se sintetizan los pasajes seleccionados con el protocolo de fuentes existente, sin convertir antecedentes en reconocimientos individuales.
- Una abstención del modelo se confundía con ausencia completa de datos. Para descripciones curriculares con evidencia v2 válida se conserva una extracción **parcial**, citada y marcada como incompleta. No confirma la premisa del usuario; no se aplica a preguntas causales o de resultados, ni oculta errores o timeouts.
- Se distinguen pérdida de asignatura y diagnóstico, alcance histórico, presentación extraordinaria y repetición. Sin regla suficiente se declara la parte pendiente.
- Solicitudes de docente asignado y códigos de una oferta futura se rechazan antes de recuperar información curricular ajena. Se contemplan variaciones verbales de repetir y referencias históricas de ingreso.

No hay tabla de respuestas para las 18 preguntas, nuevos modelos, cambios de embeddings, ingesta adicional, migraciones SQL, modificaciones de autenticación, REST, MCP, n8n ni cliente. Web y Android 1.0.4 consumen la misma API corregida, sin recompilar APK. Se conservan dimensiones 1024, configuración por release y límites API/cliente/proxy.

## Archivos

- backend/api/src/chat/ccd-query-intent.ts: intención, formas lingüísticas, rol y pertinencia curricular.
- backend/api/src/chat/ccd-semantic-plan.ts: duración por atributos y límites de capacidad.
- backend/api/src/chat/ccd-knowledge.ts: precedencia, selección, síntesis analítica y cobertura parcial.
- backend/api/test/ccd-query-selection.test.ts: controles sintéticos, variantes y casos adversos; no contiene corpus CCD.

## Validación local efectiva

Typecheck API correcto. 192/192 tests CCD y 72/72 de referencias, contexto conversacional y Document RAG/evidencia correctos. Los controles existentes se conservaron; el primer ensayo de la extracción parcial detectó una regresión en preguntas relacionales, corregida limitando esa extracción a descripciones curriculares. También se corrigió un error de tipos en el fixture nuevo antes del resultado final.

Reproducción de política en memoria: usa los derivados autorizados pero no ejecuta SQL, búsqueda coseno ni generación; no se presenta como integración. Después se ejecutaron las 18 consultas y seis variantes con el PostgreSQL aislado existente, pgvector, embeddings de consulta reales y Ollama 0.35.0 real, Qwen3 4B y embedding 0.6B. Ensayo local limitado a CPU, dos hilos; no mide el rendimiento de AWS. Veinticuatro casos sin errores de ejecución, 21 llamadas de embeddings y siete de generación. Tras corregir dos clasificaciones detectadas por variantes y activar síntesis analítica, seis casos afectados se volvieron a ejecutar: sin errores, cinco embeddings y tres generaciones. No son 24 ni seis respuestas certificadas como plenamente correctas.

Se conservan resultados privados en infra/local/rag-audit-*.private.json y logs focales. No se versionan conversaciones, corpus ni credenciales. El Ollama local temporal se detuvo al cierre, verificando el PID y el ejecutable iniciado por el diagnóstico. El Ollama de AWS continúa activo.

## Despliegue efectivo

Aplicado mediante SSM a la EC2 existente i-0a726734ca6c6f10d. Preflight de los tres fuentes anteriores contra HEAD, normalizando únicamente CRLF/LF; SHA del archivo de código validado y miembros TAR limitados a esos tres paths. Backup privado /opt/banuchat/backups/rag-relevance-20261118, sin sustituir respaldos anteriores. Escritura protegida con reversión ante fallo de copia y reversión de fuentes ante fallo de salud. Shell set -eu, sin BOM. Solo se reinició banuchat-api.

SSM devolvió Success y RAG_RELEVANCE_HEALTHY. Los cuatro servicios (API, web canónica, Caddy y Ollama) activos; auth/me y OE2 sin sesión responden 401. No se alteraron configuración ni secretos, Supabase, archivos CCD, modelos ni servicios externos.

La validación funcional remota completó las 24 consultas (18 aportadas más seis variantes), todas con HTTP 201. En cada conversación se comprobó igualdad del contenido y de los campos de cita al recuperar Historial, acceso de otra cuenta rechazado con 404 y SHA-256 de cada documento citado único. Se comprobaron 22 artefactos distintos. Las dos sesiones de diagnóstico se revocaron y su reutilización devolvió 401. La ausencia de errores HTTP o de persistencia no es una aprobación semántica de todas las respuestas. El rollback de salud no se activó; no se acredita un ensayo de reversión ejecutado en este incremento.

## Límites documentales y de calidad

El corpus publicado no es idéntico a todos los originales locales. No se encontró en sus 107 derivados el desglose de semanas/horas semanales regular frente a intensivo ni el alcance completo por modalidad del instructivo. No se inventan esos datos ni se sustituyen por modalidades de impartición. Requieren curación documental posterior con procedencia y publicación versionada.

Los pasajes de Marco Legal y Bienestar respaldan contenidos y enfoque, pero no todos los detalles o premisas de las preguntas. Las respuestas parciales deben seguir indicándolo. La síntesis de aplicabilidad de transición tampoco certifica una regla universal para programas o modalidades. No se autoriza usar una explicación general como decisión académica individual.

El ranking adicional es léxico y acotado, no una comprensión semántica perfecta. Algunas consultas pasan a generación y pueden tardar más que una extracción; no se aumentaron timeouts para ocultarlo. Dos vCPU y la disponibilidad condicionada a AWS Academy permanecen. No se declara RAG estable ni aval institucional.

## Resultados remotos detallados

Rango de respuesta HTTP: 1.30–110.28 s. 10 respuestas marcaron insuficiencia: 6 conservaron hechos parciales con citas y 4 fueron abstenciones sin citas. El resto no lleva esa marca; esto no sustituye una evaluación humana independiente de completitud o verdad. Las variantes 19–24 prueban redacción adicional; no se almacenan como claves de respuesta en producción.

| Caso en orden del archivo aportado; 19–24 variantes | Segundos | Citas | Estado de cobertura declarado |
| --- | ---: | ---: | --- |
| 1 | 4.33 | 1 | Parcial o abstención |
| 2 | 2.18 | 1 | Parcial o abstención |
| 3 | 1.90 | 1 | Sin marca de insuficiencia |
| 4 | 2.10 | 1 | Sin marca de insuficiencia |
| 5 | 1.32 | 0 | Parcial o abstención |
| 6 | 110.28 | 1 | Sin marca de insuficiencia |
| 7 | 2.00 | 3 | Sin marca de insuficiencia |
| 8 | 34.96 | 3 | Sin marca de insuficiencia |
| 9 | 22.47 | 2 | Parcial o abstención |
| 10 | 2.20 | 1 | Sin marca de insuficiencia |
| 11 | 84.43 | 2 | Sin marca de insuficiencia |
| 12 | 33.34 | 2 | Sin marca de insuficiencia |
| 13 | 1.91 | 1 | Sin marca de insuficiencia |
| 14 | 2.16 | 2 | Sin marca de insuficiencia |
| 15 | 24.84 | 2 | Parcial o abstención |
| 16 | 1.30 | 0 | Parcial o abstención |
| 17 | 2.23 | 1 | Sin marca de insuficiencia |
| 18 | 1.32 | 0 | Parcial o abstención |
| 19 | 49.43 | 1 | Sin marca de insuficiencia |
| 20 | 1.78 | 2 | Sin marca de insuficiencia |
| 21 | 21.64 | 2 | Parcial o abstención |
| 22 | 1.31 | 0 | Parcial o abstención |
| 23 | 1.71 | 1 | Parcial o abstención |
| 24 | 1.89 | 1 | Sin marca de insuficiencia |

Resultados efectivos: la consulta de prompts recuperó su detalle curricular; la comparación de identidad usó evidencia de ambos cursos; la distinción de antecedentes se sintetizó directamente; la tarifa especial conservó población y límites, y la convocatoria histórica no se presentó como un derecho indefinido. Las consultas personales o de asignación futura se abstuvieron. Marco Legal y Bienestar conservaron información pertinente como parcial. No se adjudica un porcentaje de aprobación nuevo a esta serie.

Una muestra administrativa durante la generación registró proceso de inferencia con aproximadamente 164 % de CPU sobre dos hilos, sin swap configurada y alrededor de 3 GiB disponibles incluyendo caché. Una generación registró 996 tokens de entrada, 53 de salida y 32,7 s de modelo (18,6 s de evaluación del prompt y 14,0 s de generación). La recuperación pgvector observada fue de decenas a un centenar de milisegundos; no equivale al tiempo completo del turno. No se cambiaron los límites 150/175/180 s ni los parámetros del modelo.

El archivo de despliegue de código tiene SHA-256 1a05399412f2fe0b8ada87d37d33dfd11b83aa38919947099d7e992d2f9ef698. Los SHA de los tres archivos activos coinciden con los locales validados. Código, documentación y pruebas se revisan antes de commit; resultados HTTP completos permanecen privados en infra/local/rag-relevance-remote.private.json. No hubo nueva prueba visual Android ni una nueva APK: se conserva el cliente 1.0.4.
