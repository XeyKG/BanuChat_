# BanuChat — Consulta diagnóstica autónoma y gratuidad

Fecha: 27 de octubre de 2026, America/Bogota.
HEAD de partida: `4785ac4b67b23f944adc7b96dd3bf630a3e6b590`; árbol limpio.
Sin commit ni push.

## Problema y reproducción previa

La consulta exacta «¿La primera oportunidad diagnóstica es gratuita?» solicitaba
una aclaración innecesaria en conversación vacía. Con contexto diagnóstico sí
respondía. Se reprodujo antes del cambio usando `createAuthenticatedDocumentRag`,
la composición normal, el current real y PostgreSQL en solo lectura.

| Observación del caso R1, equivalente a R2 | Antes | Después |
| --- | --- | --- |
| Topics | `diagnostic`, `fees` | Los mismos. |
| Resolver `needs_clarification` | `true` | `true`; el resolver compartido no se modificó. |
| `explicitDiagnosticSubject` / `standaloneSubject` | `false` / `false` | `true` / `true`. |
| Estrategia final | Aclaración genérica; sin apoyo ni citas. | `scoped_extract`, con apoyo y cita `OP-016`. |
| Respuesta | «¿A qué curso, prueba o procedimiento te refieres? Necesito ese antecedente para orientarte.» | «La primera oportunidad de la prueba diagnóstica de Competencias Digitales es gratuita.» |

«La primera» activa el tratamiento de seguimiento; `fees` faltaba en los temas
que reconocían un diagnóstico explícito como sujeto autónomo. La instrumentación
se hizo en el harness privado, evaluando las expresiones de la fuente real;
no se añadieron trazas ni instrumentación a producción.

## Cambio funcional

Solo cambia `backend/api/src/chat/ccd-knowledge.ts`:

- `fees` participa en el reconocimiento de sujeto diagnóstico explícito.
- Una intención financiera sin sujeto ni antecedente suficiente pide aclaración.
- Después de hablar de un curso, una «primera oportunidad» sin señal diagnóstica
  suficiente pide aclaración; no une gratuidad diagnóstica y matrícula del curso.
- Un diagnóstico explícito evita heredar el precio del curso anterior.

Se utilizan las unidades y claims adoptados existentes. No hay comparación literal
de la pregunta, IDs de evaluación ni respuesta nueva hardcodeada. `OP-016`
conserva su procedencia interna y la cita del derivado publicado; no se convierte
una confirmación de dominio en fuente documental original.

## Cobertura permanente y resultados

Se añadieron cuatro pruebas a `backend/api/test/ccd-knowledge.test.ts`: consulta
literal/paráfrasis/procedencia; límites de otros intentos; ambigüedad real; y
contexto diagnóstico frente a contexto de curso. Incluyen seis formulaciones
positivas, precio/tarifa/cobro, los cinco negativos, las tres ambigüedades y
seguimientos de curso y diagnóstico.

| Casos ejecutados con la política real y corpus current | Resultado |
| --- | --- |
| R2–R5: primera oportunidad, primera prueba con costo, cobro la primera vez, primera oportunidad gratis | Respuesta directa, apoyo/cita `OP-016`, sin metadatos internos visibles. |
| R6: segunda oportunidad | Pide distinguir el tipo de prueba y sus condiciones; no promete gratuidad. |
| R7: repetir gratis | Explica que no se garantizan repeticiones gratuitas ni intentos ilimitados. |
| R8: todos los intentos gratis, sin antecedente | Solicita antecedente; no concede gratuidad universal. |
| R9: extraordinaria | Tarifa existente y población/periodo limitados; sin exención inventada. |
| R10: extemporánea | Tarifa existente de su periodo; sin exención inventada. |
| A1–A3: gratis, costo, primera vez sin objeto | Aclaración y ninguna cita. A1 antes asumía indebidamente diagnóstico; también quedó corregido. |
| C1: finalidad diagnóstica → primera oportunidad gratuita | Responde correctamente, con `OP-016`. |
| C2: precio de curso → primera oportunidad gratuita | Antes mezclaba gratuidad diagnóstica y precio de curso. Ahora pide aclaración por falta de señal diagnóstica suficiente. |

El test histórico de «¿La prueba es gratis?» ya tenía sujeto explícito `prueba`
y no incluía «la primera», por lo que no recorría la combinación que fallaba.
`ccd-operational-pilot.ts` es un adaptador histórico que delega en la política
actual; no se modificó. Su test no acreditaba por sí solo la variante Mobile.

## Validación ejecutada

| Comprobación | Resultado y frontera |
| --- | --- |
| API `npm run typecheck` | Exit 0. |
| API `npm test` | 679/679, sin fallos ni omitidas. Incluye knowledge, conversación, routing, evidencia y presentación, además del resto de pruebas locales. |
| Ensayo específico inicial | 148/149: una aserción adicional esperaba herencia de curso con «¿Es gratis?», que el resolver vigente trata como consulta autónoma. Se precisó ese ensayo como seguimiento explícito «¿Y es gratis?»; los casos solicitados A1–A3 conservan su aclaración. La suite final completa pasó. |
| Banco CCD completo | 249/249 ejecuciones y revisión semántica técnica correctas; RAG normal real, solo lectura, contexto generado por la corrida, retrieval real y generador real cuando corresponde. **No son 249 casos HTTP.** |
| Evaluación del banco | Comprobó fuentes y proposiciones completas contra el catálogo aprobado. Se hicieron 61 revisiones nuevas de respuestas libres ligadas a cuerpo/pregunta/historial/SHA; no se importó ningún PASS ni revisión previa de respuestas. Quedaron cero casos pendientes. No equivale a aceptación humana independiente. |
| Embeddings en el banco | 227 usos de embeddings de consulta previamente calculados con clave de configuración; cero nuevos. Ningún embedding documental se modificó. |
| HTTP habitual 3004 | Tras reiniciar el proceso normal con el cambio: conversación vacía, pregunta literal, HTTP 201, release current, cita `OP-016`, historial exactamente igual al turno devuelto. |
| Adaptador Mobile real | `createConversation` + `sendMessage` + `getConversation` contra REST v2: pregunta literal sin antecedente, HTTP 201, parseo y cita correctos, historial exacto. |
| Limpieza | Dos conversaciones de ensayo eliminadas por REST, logout confirmado y almacenamiento de sesión de ensayo vacío. |

El banco amplio se ejecutó porque el cambio está en una política compartida.
Su composición de solo lectura permitió ampliar la regresión sin persistir
249 conversaciones ni repetir seguridad, Android, documentos o la promoción.

## Preservación y límites

Se compararon antes/después current y huellas de todas las tablas de los schemas
del producto, configuración, roles y ACL. Current sigue en
`f01c1c37-2d3f-4bc7-8940-fe724eb71c9a`, `ready`, `ccd-1.3.0`.
Corpus, releases, bindings, embeddings, conversaciones anteriores y citas
permanecen iguales. Solo cambió la actividad normal de autenticación de la cuenta
de ensayo. No se modificaron reglas, código o credenciales de autenticación.

Se modificaron también este informe y la cronología del informe Mobile. Los
artefactos históricos se conservaron, incluyendo el registro previo que
sobreestimaba la aprobación semántica del caso aislado.

No se repitió Android físico, ni se cambió Mobile UI, MCP o N8N. La API habitual
quedó activa en loopback con el código corregido. La aceptación humana de Mobile
y sus respuestas sigue pendiente.

Evidencia privada ignorada por Git:
`data/ccd/local/p3-mobile-diagnostic-fee-regression/`. Contiene reproducción,
diagnóstico, casos, logs de pruebas, resultados del banco/revisión, HTTP,
adaptador Mobile, invariantes, limpieza y manifiesto; sin passwords, tokens ni
headers Authorization. Cierre con `git diff --check` y revisión de alcance.
