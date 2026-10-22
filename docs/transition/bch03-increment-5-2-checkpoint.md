# CHECKPOINT BANUCHAT — BCH-03 / Incremento 5.2: diagnóstico de generación

Fecha: 2026-10-22. Base verificada: `e8de545c834fb8ce27bcdd38776de15aa74c6c7f`; árbol inicialmente limpio.

**Se distinguen dos mecanismos reproducidos: timeout de generación y rechazo por exceso de contexto. La causa exacta del REG/2 histórico no quedó demostrada retrospectivamente.** No se modificaron el cliente de producción, parámetros, arquitectura ni corpus. No se implementó una corrección funcional adicional. La validación integral continúa abierta.

## Diagnóstico individual y grado de certeza

Se examinó el reporte original `data/ccd/evidence/increment-5/http-1792686507869.json`, SHA-256 `f97a482d0721a7b436df80590c7992fdb5075dc628d7d9699bc27cafdfae3f0a`, sus referencias y el estado real de los dos historiales implicados.

| Fallo original | Evidencia original | Evidencia nueva | Conclusión y límite |
| --- | --- | --- | --- |
| **T11/3** | 503 tras 30.237 s; U03/M12 seleccionados, sin respuesta Ollama registrada | El mismo escenario en conversación nueva aborta `/api/chat` a los **30.013 s**, con señal abortada y `TimeoutError`; cliente: `generator_unavailable`. `/api/version`, `/api/tags` y `/api/show` habían respondido 200 en unos 25 ms acumulados. | **Timeout de generación confirmado en la reproducción**, que respalda el diagnóstico del fallo original. La traza original no conservó la señal, por lo que no se presenta como una observación retroactiva. No se demuestra por qué Ollama tardó tanto. |
| **REG/2** | 503 tras 30.287 s; solo DOC-101, sin respuesta Ollama registrada | Dos ejecuciones actuales de la pregunta exacta, con catálogo persistido: **201**, generación en 5.513 s y 15.379 s; mismo hash de prompt. Otra consulta directa de IA, en conversación aparte, sí agotó 30 s. | **Timeout histórico probable, no confirmado directamente para esa solicitud**. No se reprodujo su 503 en las dos ejecuciones exactas actuales. Se demuestra latencia variable; no un fallo permanente de recuperación ni una causa de hardware específica. |
| **REG/3** | Ollama 400 y API 503; diez fragmentos. La pregunta anterior de IA había fallado | Conversación nueva con solo catálogo: Ollama **400**, cuerpo `exceed_context_size_error`, **6554 tokens frente a 4096 disponibles**; cliente: `invalid_generator_response`. No había pregunta de IA persistida. | **Exceso de contexto confirmado en la reproducción del estado equivalente**. La continuación sin antecedente específico produce selección documental amplia. El cuerpo original no fue capturado; no se atribuye al original una medición exacta de tokens que solo existe en la reproducción. |

El 400 no se diagnosticó a partir de la longitud estimada: se leyó una respuesta real del proveedor que identifica el exceso. Fragmento saneado conservado:

```json
{
  "code": 400,
  "message": "request (6554 tokens) exceeds the available context size (4096 tokens), try increasing it",
  "type": "exceed_context_size_error",
  "n_prompt_tokens": 6554,
  "n_ctx": 4096
}
```

No se siguió la sugerencia del proveedor de aumentar contexto. Se mantuvieron todos los parámetros existentes.

## Instrumentación exclusivamente de evaluación

Archivos nuevos:

- `eval/integration/ccd-generation-trace.mts`: transporte observador inyectado mediante el constructor existente del cliente. Mantiene URL, cuerpo, cabeceras, respuesta y `AbortSignal`; separa verificación anterior, `/api/chat` y verificación posterior. Registra status, duración, aborto, nombre de causa y métricas; lee una copia del error del proveedor y la sanea.
- `eval/integration/ccd-generation-diagnostics.mts`: servidor HTTP temporal de evaluación, escenarios independientes, medidas de prompt/recuperación, causa tipificada, GET antes/después y comprobación de integridad.
- `eval/integration/ccd-generation-trace.test.mts`: pruebas de saneamiento, conservación de respuesta/señal, separación de etapas y distinción de 400, JSON inválido y generación incompleta usando el cliente de producción sin modificar.
- Este checkpoint.

No se editaron archivos de producción ni el evaluador publicado `ccd-guidance.mts`. El timeout de generación sigue siendo **30000 ms**, el de embeddings conserva su valor original, el modelo es `qwen3:4b-instruct`, `temperature: 0`, `num_predict: 256`, `think: false`, `stream: false`, `keep_alive: 5m`. Se mantienen las verificaciones anteriores y posteriores del cliente. No hay reintento de POST.

Las trazas guardan localizadores, tamaños en caracteres/bytes, hashes y cantidades de mensajes, no prompts ni respuestas generadas íntegros. El error del proveedor admite solo su campo de error textual, acotado y con redacción de credenciales, correos, identificadores, rutas y URLs. No se guardan SQL, credenciales de conexión, stacks ni expedientes. Las preguntas de evaluación son los casos de demostración, sin nombres/UID reales.

El conteo `rough_tokens_chars_div_4` es una **heurística**, no un conteo del tokenizer ni prueba de cabida. En el caso amplio estimó 5213; la respuesta del proveedor midió 6554. En generaciones completadas se registró el `prompt_eval_count` real.

## Ensayos controlados: se conservan todos

Entorno: PostgreSQL CCD real `banuchat_ccd_dev` en `127.0.0.1:55433`, Ollama 0.35.0 en `127.0.0.1:11434`, API temporal en `127.0.0.1:3003`. Un operador, sin LAN ni túnel. Cada escenario se creó mediante REST en una conversación nueva; no se insertaron mensajes ni antecedentes mediante SQL.

### Ensayo 1 — escenarios separados

Comando desde `backend/rag`:

```powershell
node --env-file=../../infra/.env.ccd --import tsx ../../eval/integration/ccd-generation-diagnostics.mts all
```

Evidencia: [`diagnostics-52-1792689934827.json`](../../data/ccd/evidence/increment-5/diagnostics-52-1792689934827.json), SHA-256 `029c56db7de11bf619462fb45fefd5839ec004b97f3a4fa1a23b52b9705502ed`. Ejecutado **12:25:34–12:27:44, America/Bogota**.

| Escenario | Estado realmente persistido | Resultado |
| --- | --- | --- |
| T11 completo | Primeros dos turnos guardados: cuatro mensajes, sin citas institucionales forzadas | Turnos 1–2: 201. Turno 3: timeout; cuatro mensajes antes y después, sin respuesta ficticia. |
| REG con IA válida | Catálogo guardado; pregunta de IA y respuesta DOC-101 guardadas antes de preguntar temas: cuatro mensajes, `ia_user_persisted: true` | Catálogo e IA: 201. Temas: timeout aun con antecedente válido y **un solo fragmento**. Restantes tres turnos marcados `not_evaluable`, sin enviarlos. |
| IA directa, caso independiente | Conversación nueva vacía | Primer POST: timeout. Temas marcado `not_evaluable`; no se envió sin su antecedente. |
| «¿Y qué temas tiene?» sin ningún antecedente | Cero mensajes | **201, aclaración**, sin embeddings ni generación, sin citas. El contexto resuelto indicó `needs_clarification: true`. |
| Catálogo → «¿Y qué temas tiene?», sin pregunta específica de IA | Solo dos mensajes del catálogo; `ia_user_persisted: false` | Catálogo: 201. Seguimiento: diez fragmentos, 400 por exceso de contexto, API 503. El catálogo por sí solo no identifica un curso único. |

Se intentaron **10 POST de mensajes**: seis 201 y cuatro 503. Quedaron **cuatro turnos no evaluables/no enviados**. El plan terminó de procesarse, pero `completed: true` **no significa PASS**: el reporte conserva explícitamente los errores y omisiones.

### Ensayo 2 — una repetición declarada de REG

Para observar variabilidad sin reenviar solicitudes a una conversación previa:

```powershell
node --env-file=../../infra/.env.ccd --import tsx ../../eval/integration/ccd-generation-diagnostics.mts reg
```

Evidencia: [`diagnostics-52-1792690167302.json`](../../data/ccd/evidence/increment-5/diagnostics-52-1792690167302.json), SHA-256 `bae45f23dcb37bf88c9006833b0f77a26fabaae7eec6b2e2f534dec7f2f4b663`. Ejecutado **12:29:27–12:30:05, America/Bogota**.

Conversación nueva: **seis POST, seis HTTP 201**, sin omisiones. Catálogo con siete fuentes; IA y temas con DOC-101; corrección a Marca Personal con DOC-103; duración con TEST_ORIENTATION; contacto con M12. Las cinco generaciones registraron protocolo privado válido y `done_reason: stop`. El antecedente de IA estaba persistido antes de preguntar temas.

REG/2 usó exactamente los mismos hashes de system/user prompt en ambos ensayos, pero tardó 5.513 s y 15.379 s en el cliente. Ollama reportó tiempos de evaluación de salida de 3.262 s para 104 tokens y 12.629 s para 103 tokens; la carga del modelo fue inferior a 10 ms en esos dos éxitos. Esto demuestra variabilidad de generación en esos casos, **no demuestra el motivo de los timeouts ni autoriza aumentar el plazo**.

REG/3 con IA persistida agotó el plazo en el ensayo 1 y respondió correctamente en el ensayo 2. Los prompts de seguimiento no son idénticos byte a byte: las respuestas anteriores de IA variaron ligeramente. Se conservan sus hashes y tamaños; no se afirma un experimento con historial idéntico.

Balance de ambos ensayos: **16 solicitudes de mensajes, 12 HTTP 201, cuatro HTTP 503**, seis conversaciones nuevas, cuatro turnos no evaluables. No se descarta el primer ensayo ni se presenta el segundo como sustituto de una batería integral T01–T12. No hubo otra repetición ni POST automático.

## Qué etapa falla y qué no se ha demostrado

| Caso del ensayo 1 | Fragmentos | Prompt UTF-8 | Verificación previa, suma aproximada | `/api/chat` |
| --- | ---: | ---: | ---: | --- |
| T11/3 | 2 | 9454 bytes | 25 ms, todos 200 | 30013 ms; `TimeoutError`, señal abortada; sin status recibido |
| REG válido/3 | 1 | 8145 bytes | 41 ms, todos 200 | 30008 ms; `TimeoutError`, señal abortada; sin status recibido |
| IA directa/1 | 1 | 6966 bytes | 53 ms, todos 200 | 30002 ms; `TimeoutError`, señal abortada; sin status recibido |
| Solo catálogo/2 | 10 | 21199 bytes | 46 ms, todos 200 | 400 en 340 ms; cuerpo explícito de exceso de contexto |

En los fallos de timeout nuevos, la causa inmediata tipificada es `generator_unavailable` por vencimiento de la señal **durante generación**, no por verificación del modelo. La recuperación y los embeddings habían completado; el cliente llegó a `/api/chat`. En el 400 nuevo, la selección/contextualización termina, pero prepara una petición que el proveedor rechaza por tamaño.

`invalid_generator_response` no significa necesariamente texto mal formado: el cliente también utiliza ese motivo para HTTP 4xx. En el caso confirmado fue un **rechazo de petición por tamaño**, no JSON inválido de una respuesta generada. Los timeouts no entregaron una respuesta que pudiera evaluarse por formato.

No se observó un fallo de formato en las generaciones reales completadas de estos ensayos. Las pruebas unitarias sí distinguen, con respuestas simuladas explícitas, los caminos 400, JSON inválido y `generator_response_incomplete`; no se atribuyen esos ejemplos simulados a Ollama real. Un fallo del protocolo privado de citas se resolvería por otra rama del RAG; tampoco se observó como causa de estos 503.

Permanece **sin demostrar la causa interna de la lentitud**: no hay perfil del servidor para las solicitudes canceladas. No se atribuye a GPU/VRAM, colas, carga de modelos, caché, concurrencia, fallo de SQL ni a la mera longitud del prompt. Al comienzo del primer ensayo `/api/ps` estaba vacío; después había dos modelos cargados. Eso no basta para explicar todos los fallos: hubo un éxito de IA seguido de un timeout con el modelo ya utilizado.

## Continuidad real y revisión del evaluador

Lectura histórica de solo lectura: [`diagnostics-52-historical-1792690271114.json`](../../data/ccd/evidence/increment-5/diagnostics-52-historical-1792690271114.json).

- T11 histórico conserva solo los cuatro mensajes de sus dos primeros turnos.
- REG histórico conserva catálogo y luego las consultas independientes de Marca Personal, duración y contacto: ocho mensajes. **No existe la pregunta fallida de IA ni su respuesta.** La consulta fallida de temas tampoco quedó guardada. Los hashes del catálogo coinciden con los del catálogo usado en la reproducción.
- En los ensayos nuevos, los POST fallidos tampoco añadieron pares de mensajes. No hay pérdida de un antecedente que sí se hubiera guardado; el antecedente específico nunca llegó a persistirse.

El evaluador publicado `eval/integration/ccd-guidance.mts` registra el status pero continúa el bucle después de un 503 (`for` de turnos, líneas 118–138). El siguiente mensaje usa la historia que realmente quedó en PostgreSQL, no el turno fallido esperado por el guion. Después compara el historial con `scenario.q.length * 2` (línea 141), lo que produce controles derivados fallidos. Además, los controles dentro de `if(answer)` no se ejecutan cuando no hay respuesta. Por tanto, una continuación puede estar probando un escenario diferente del nominal, y el denominador de controles cambia.

El diagnóstico aislado confirma dos estados distintos:

1. **Sin historial:** el asistente ya pide aclaración correctamente.
2. **Solo catálogo, sin curso individual:** el resolutor acepta el catálogo como antecedente suficiente; la selección sin tema específico devuelve diez fragmentos. El asistente debería aclarar de cuál curso se piden temas, en vez de construir ese contexto amplio. Esto es una propuesta funcional pendiente, no una corrección aplicada aquí.

Propuesta mínima para el evaluador publicado, **no implementada**:

- Registrar por separado planificados, intentados, completados, fallidos y `not_evaluable`; no contar omisiones como controles aprobados.
- Tras un POST fallido/incierto, consultar el historial solo para establecer qué se persistió. No reintentar el POST.
- Marcar los seguimientos que requieren ese antecedente como no evaluables en esa conversación. Mantener el fallo original y no otorgar PASS global si falta un paso requerido.
- Para comprobar independientemente la continuidad con IA válida, abrir otra conversación y construir el antecedente por HTTP, verificando su persistencia antes de enviar temas. Registrar el nuevo ensayo como distinto, con todos sus éxitos y fallos.
- Comparar los pares realmente completados con la persistencia; conservar además el resultado de integridad histórica, separado del requisito de completar todo el guion.

El nuevo ejecutable diagnóstico usa una parada conservadora tras error para aislar los casos; no cambia el evaluador histórico ni el producto. Los turnos independientes restantes pueden evaluarse en otra conversación de un ensayo explícito, sin ocultar que el caso anterior se interrumpió.

## Conservación, verificaciones y próximos pasos propuestos

Ambos reportes comprueban hashes de las tablas fijas CCD, de historiales existentes y de 36 archivos de snapshots/schemas. El ensayo 1 conservó **147 historiales anteriores** y 23 reportes JSON; el ensayo 2 conservó **152 historiales anteriores** y 24 reportes JSON, incluido el ensayo 1. Solo se añadieron las seis conversaciones controladas, incluida la que quedó sin mensajes por un POST fallido. Se conservan también los resultados T07 fallidos y los tres 503 originales.

Las releases, manifiestos, configuración y vectores documentales no cambiaron. Se mantiene current `3d6cedac-0e86-40c8-909b-d3ff6e8ab741`, con doce unidades; dos releases históricas conservadas, 24 versiones/fragmentos/embeddings en total. Los embeddings de consulta no constituyen una ingesta ni una modificación de los vectores almacenados.

Verificaciones ejecutadas: **5/5 pruebas del observador**, chequeo TypeScript estricto del ejecutable y pruebas, `git diff --check` y comprobación de alcance. Log privado `data/ccd/evidence/increment-5/diagnostics-52-unit.log`. No se repitieron las suites de producción, Android, Mobile, ingesta ni la batería integral: no se modificaron esos componentes y este incremento es diagnóstico.

Propuestas para revisión, sin implementación:

1. Corregir de forma focal la referencia ambigua tras un catálogo: exigir antecedente de un curso concreto antes de generar sus temas, o preguntar cuál. Probar ambos estados (historial vacío y catálogo sin IA), además de IA persistida, y no añadir corpus para compensarlo.
2. Incorporar la clasificación de dependencias/no evaluable al evaluador según lo descrito arriba.
3. Investigar por separado la latencia de `/api/chat` con métricas del servidor para solicitudes canceladas. Los tiempos de éxito variables y los abortos justifican esa investigación, pero no un cambio automático de timeout, modelo, temperatura o tamaño de salida.

No se requiere ni se propone convertir un fallo de dependencia en insuficiencia académica. El cuerpo de error saneado y la causa tipificada permanecen en evaluación privada; no se añadió información al REST público.

Los reportes y la lectura histórica se escribieron como archivos nuevos privados en `data/ccd/evidence/increment-5/`, ignorados por Git. Las APIs temporales se cerraron. No hubo cambios en producción, corpus CCD, originales, SQL, Mobile, datos sintéticos, contratos REST/MCP, dependencias, servicios o reglas institucionales. Sin borrados, reintentos automáticos de POST, commit ni push.

**CHECKPOINT BANUCHAT: diagnóstico entregado con causas confirmadas y límites separados. La validación integral sigue abierta. Detenerse para revisión de Sala de Control antes de cambios funcionales.**
