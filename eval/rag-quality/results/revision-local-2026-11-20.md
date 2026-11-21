# Verificación local del RAG de BanuChat

La revisión del 20 de noviembre de 2026 se ejecutó en Windows. No se iniciaron servicios de AWS, Ollama ni n8n. No se consultó Supabase. El chequeo documental usó la copia local de los derivados aprobados y la lógica real del backend, con recuperación en memoria y un generador de prueba que falla si se invoca. Los resultados verifican selección de evidencia y respuesta. La búsqueda vectorial y los tiempos de inferencia quedan fuera de esta medición.

## Resultados observados

| Consulta | Citas devueltas | Lecturas acotadas | Llamadas al generador |
| --- | ---: | ---: | ---: |
| ¿Qué son competencias digitales? | 1 | 1 | 0 |
| ¿En qué consisten las habilidades digitales? | 1 | 1 | 0 |
| ¿Qué es la ruta de competencias digitales? | 2 | 1 | 0 |
| ¿En qué consiste la Ruta de Formación Transversal en Competencias Digitales? | 2 | 1 | 0 |
| ¿Qué docente está asignado a mi grupo? | 0 | 0 | 0 |

Coincidieron con el manifiesto los SHA-256 de **107 artefactos Markdown, 107 fragmentos y 107 vectores almacenados**. Cada vector tenía **1024 dimensiones** y valores finitos. El extractor encontró las unidades revisadas en el Markdown y comprobó que cada cita devuelta apuntara al fragmento local verificado.

| Regresión | Antes | Con el cambio |
| --- | --- | --- |
| Generación curricular con una fuente inexistente o sin referencias | El backend presentaba el extracto como respuesta completa. | Respuesta parcial con la información respaldada y su cita, sin reproducir la afirmación del modelo. |
| Un resultado solicitado sin cita válida | El extracto se marcaba completo. | Abstención sin citas. Se conservó la prueba de la misma clase de pregunta con referencias válidas. |
| Pregunta introductoria por la ruta | La prueba recuperaba una fuente de orientación de matrícula. | Estructura y condiciones para completar la ruta respaldadas por dos citas. |

Las tres pruebas focales fallaron antes y pasaron con la corrección. La expectativa histórica de FLOW-05 se actualizó para que una declaración con citas inválidas no se considere una respuesta completa. Los casos que producen referencias válidas conservan sus expectativas.

## Cómo se mide una consulta

El chat distingue **Respuesta parcial** de **Evidencia insuficiente**. La revisión del workflow agrega el mismo estado y el desglose de etapas. Una prueba de HTTP en loopback confirmó que llegaron dos eventos concurrentes de turnos distintos, uno parcial y otro con timeout, sin mezclar métricas ni enviar texto. Otra prueba verificó la proyección del JSON del workflow. El motor de n8n queda pendiente de ejecutar con esta revisión.

| Campo de n8n | Interpretación |
| --- | --- |
| `duration_ms` | Tiempo observado para el turno, incluida la persistencia. |
| `rag.embedding_ms` | Tiempo acumulado en el cliente de embeddings. |
| `rag.retrieval_ms` | Tiempo acumulado en la consulta vectorial medida por el backend. |
| `rag.ollama_http_ms` | Espera HTTP acumulada del endpoint de generación hasta la respuesta o el fallo. |
| `rag.ollama_calls` / `rag.ollama_timeouts` | Intentos observados y cuántos agotaron el tiempo de espera. |

Un valor `null` indica una etapa que no se ejecutó. Los tiempos de fase pueden dejar fuera la autorización, la selección y otras operaciones internas. Esta revisión amplía la telemetría sin cambiar los límites de espera, los modelos, el esquema de PostgreSQL ni las releases.

## Reproducción

Desde `backend/api`, ejecuta los chequeos de API. La última orden requiere los artefactos locales autorizados en `infra/local`; imprime solo conteos y resultados de escenarios.

```powershell
npm run typecheck
npm test
node --import tsx ../../eval/rag-quality/inspect-ccd-offline.mts
```

También se ejecutaron `npm run typecheck` y `npm test` desde `mobile`, y `git diff --check` desde la raíz. Resultado observado **868/868 pruebas de API y 77/77 del cliente**.

Cuando se publique esta revisión, los tiempos pueden verse en **n8n → BanuChat - Ejecuciones del chat → Executions → Ruta, duración y resultado**. En la versión de AWS ya publicada solo aparece el tiempo total. El [registro de estado previo](../../../docs/estado-vigente.md) conserva la medición anterior de 154,9 s frente a 1,6 s para la consulta de definición; esa medición no se repitió y no describe la latencia general del RAG.
