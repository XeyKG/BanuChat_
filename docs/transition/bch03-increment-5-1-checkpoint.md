# CHECKPOINT BANUCHAT — BCH-03 / Incremento 5.1: pertinencia documental T07

Fecha: 2026-10-22. Base verificada: `75c1e7e72074ab400d7256837c5666c0fb5fbb73`; árbol de trabajo inicialmente limpio. Cambios locales sin commit ni push.

**Corrección focal de T07 comprobada por código, pruebas unitarias y HTTP real. La batería integral NO pasó: 244/249 controles correctos, con tres HTTP 503 en T11/3 y REG/2–3 y dos controles derivados de historial incompleto.** No se alteró generación ni infraestructura para buscar un resultado favorable y no se reenviaron mensajes fallidos.

## Causa confirmada y cambio delimitado

Se confirmaron tres vías relacionadas:

1. `ccdGuidanceTopic` devolvía U04 al detectar una regla no admitida, aunque el usuario no aportara un antecedente de transición/reconocimiento.
2. Si no se reconocía un tema, `selectCcdEvidence` devolvía todos los fragmentos y podía reintroducir U03/U04.
3. El respaldo literal consideraba suficiente que hubiera una unidad U03/U04 entre los fragmentos seleccionados; no exigía de nuevo que correspondiera al tema.

Corrección:

- Se eliminó la derivación «regla no admitida → U04». Informática, transición, antecedentes antiguos, Word/PowerPoint/Excel y reconocimientos siguen permitiendo orientación U04. Ser continuo, mencionar una cohorte o nombrar un programa por sí solos no determinan ese tema. T09 conserva su antecedente explícito de Informática.
- El retorno genérico excluye U03/U04. No cambia el resto de la recuperación ni utiliza la distancia vectorial como respaldo de una afirmación.
- `document-rag.ts` obtiene la unidad primaria solo si su localizador coincide con el tema pertinente resuelto. Tanto el respaldo por insuficiencia como la sustitución de negaciones indebidas utilizan esa unidad comprobada.
- Inasistencia, admisión tardía, intentos y derechos no documentados quedan bajo el control de reglas no admitidas de TEST_ORIENTATION. Eso permite la abstención antes de generar; no crea una nueva regla institucional.
- Un relato de dos solicitudes sin antecedente suficiente no fuerza U04. La prueba positiva con antecedente explícito de Informática conserva U04; sin ese antecedente la prueba exige no atribuir el relato a esa fuente.

No se modificaron prompts, el límite de 80 palabras, modelo, timeout ni parámetros del generador para resolver T07. El control es verificable sin depender de obediencia del modelo.

## Pruebas que detectaron el defecto

Antes de modificar la implementación se agregaron y ejecutaron cuatro pruebas nuevas, **las cuatro fallaron** contra el código publicado:

- Inasistencia/gratuidad/elegibilidad sin antecedente no deben establecer transición.
- El retorno genérico no debe reintroducir U03/U04.
- Los tres turnos T07 con un generador simulado que devuelve `EVIDENCIA_INSUFICIENTE` no deben recibir un pasaje ni advertencia U03/U04.
- Un tema desconocido con solo unidades U03/U04 recuperadas no debe activar el respaldo.

Evidencia: `data/ccd/evidence/increment-5/t07-51-before.log`, 0/4 correctas, código de salida 1. Son reproducciones unitarias del defecto, no resultados de Ollama.

Después de corregirlo:

- **46/46 pruebas focalizadas** de `document-evidence` y `document-rag`, incluidas pruebas positivas U03/U04, contactos, referencias privadas inválidas, Word/Excel, correcciones y la distinción de testimonios con/sin antecedente.
- Una prueba adicional ejecuta efectivamente el generador simulado con resultado `EVIDENCIA_INSUFICIENTE` después de recuperar también un fragmento descriptivo: el retorno genérico excluye las dos unidades de orientación y no convierte el marcador en un pasaje ajeno.
- **514/514 pruebas unitarias de API**, cero fallos/omitidas, en la verificación final.
- `npm run typecheck` y `npm run build` de API correctos. Comprobación TypeScript estricta independiente del evaluador correcta.

Logs privados nuevos: `t07-51-focused-context.log`, `t07-51-api-unit-verified.log`. No se repitieron las suites RAG, ingesta ni pruebas Android/Expo Web: sus componentes no se modificaron.

## T07 real: antes y después

Antes: la conversación histórica `a998b63a-50ec-478b-98f4-650caf91b51c` devolvió transición desde Informática y guardó U04 ante «No asistí a la prueba» y «Me admitieron después de la primera fecha». En el segundo turno el modelo devolvió insuficiencia, pero el respaldo la sustituyó por U04. Esa conversación, sus mensajes/citas y `closure-T07-evidence.json` se conservan sin cambios.

Después: conversación nueva `4a5d94aa-3906-4add-bc4c-46f3ed8812e3`:

| Turno | Pregunta exacta | Resultado observado |
| --- | --- | --- |
| 1 | No asistí a la prueba | Insuficiencia, sin citas ni advertencias históricas |
| 2 | Me admitieron después de la primera fecha | Insuficiencia, sin citas ni advertencias históricas |
| 3 | ¿Es otro intento gratis? | Insuficiencia, sin citas ni advertencias históricas |

Los tres guardaron: «No encontré evidencia suficiente en los documentos disponibles para responder esa consulta». No se llamó al generador en esos turnos; no se concedió otro intento, no se equiparó ausencia con reprobación ni se utilizaron U03/U04. Los mensajes persistidos son `68f89a78-764f-418c-a118-f3535a63ade9`, `a1f8fc91-d5ae-41fb-b846-5b07689fc2dd` y `0341917f-c39f-437e-93f7-748756417df7`.

Se agregó al evaluador una aserción por turno T07 que examina **contenido, citas y advertencias**: exige citas vacías, rechaza pasajes de Informática/transición/reconocimientos/pilares, periodos y advertencias históricas ajenas, concesiones no respaldadas y una equiparación afirmativa de ausencia con reprobación. Las tres aserciones específicas pasaron; todos los 13 controles asociados a T07, incluido su historial persistido, pasaron. No se valida solo HTTP 201.

Esto comprueba la corrección del comportamiento, **no el procedimiento institucional de inasistencia o admisión tardía**, que sigue sin admitirse.

## Batería HTTP completa y fallos observados

Se ejecutó después de las pruebas focalizadas, una sola vez en esta tarea:

```powershell
# Desde backend/rag, PostgreSQL CCD y Ollama reales
node --env-file=../../infra/.env.ccd --import tsx ../../eval/integration/ccd-guidance.mts http
```

Reporte: [`http-1792686507869.json`](../../data/ccd/evidence/increment-5/http-1792686507869.json), SHA-256 `f97a482d0721a7b436df80590c7992fdb5075dc628d7d9699bc27cafdfae3f0a`.

Ejecución: **11:23:33–11:28:27, America/Bogota**, 2026-10-22. API CCD `127.0.0.1:3001`, PostgreSQL CCD `127.0.0.1:55433`/`banuchat_ccd_dev`, Ollama `127.0.0.1:11434`. Generador `qwen3:4b-instruct`, runtime 0.35.0; configuración sin cambios. La API sintética temporal de lecturas se ejecutó en `127.0.0.1:3302`.

- **40 solicitudes de mensajes en 14 conversaciones nuevas**: 37 HTTP 201 y tres HTTP 503. No se reintentó ninguno de esos POST.
- **249 controles ejecutados: 244 correctos y cinco fallidos; código de salida 1.** Con 40 respuestas correctas se habrían ejecutado 255 (los 252 anteriores más tres de pertinencia T07). Se omiten dos controles de contenido/protocolo cuando no hay respuesta de asistente; los tres errores explican los seis controles no ejecutados. No se declaran aprobados.
- Cinco controles fallidos: `T11/3 HTTP 201`, historial completo T11, `REG/2 HTTP 201`, `REG/3 HTTP 201`, historial completo REG.
- Los controles de historial esperan dos mensajes por cada pregunta intentada. Fallan en T11/REG porque los POST rechazados no guardaron pares de mensajes, no porque se modificaran o borraran historiales anteriores. La auditoría de integridad separada pasó.
- Las 28 generaciones completadas registraron `done_reason: stop`. Hubo 12 respuestas de insuficiencia/aclaración y 31 citas nuevas. Todas las citas guardadas coincidieron con hash, localizador y release; las 24 versiones documentales se descargaron y sus hashes fueron correctos.

| Solicitud fallida | Evidencia exacta | Alcance del diagnóstico |
| --- | --- | --- |
| T11/3, «¿Y si luego la repruebo?» | 503 `DEPENDENCY_UNAVAILABLE` tras 30.237 s; seleccionados U03/M12; sin respuesta Ollama registrada | Compatible con el timeout de 30 s existente. No se ha demostrado la causa de la demora. No se persistió una respuesta falsa. |
| REG/2, «Háblame del de IA Generativa» | 503 `DEPENDENCY_UNAVAILABLE` tras 30.287 s; seleccionado DOC-101; sin respuesta Ollama registrada | Tampoco se demuestra un defecto de pertinencia U04. La consulta no quedó guardada como turno completado. |
| REG/3, «¿Y qué temas tiene?» | 503; Ollama `/api/chat` respondió **400**; el selector genérico había conservado diez fragmentos sin U03/U04 | El antecedente persistido seguía siendo el catálogo porque REG/2 falló. No se capturó el cuerpo del 400; su motivo exacto no se afirma. Esta continuación no quedó demostrada. |

La comprobación posterior de solo lectura `/api/version` y `/api/ps` confirmó Ollama 0.35.0 disponible con ambos modelos cargados; no demuestra por sí sola que cada generación estuviera funcionando. No se reinició Ollama, cambiaron parámetros ni ampliaron timeouts. Tampoco se convirtió un error del proveedor en una respuesta académica.

Los dos controles de contacto **sí pasaron en esta batería**: T12/4 y REG/6 devolvieron `ccdigital@unab.edu.co`, citaron únicamente M12 (versión `e87efaea-b10a-4bc4-92d3-60e8c10acf19`) y guardaron «El contacto documentado corresponde a 202660; su vigencia actual no está ratificada». No hubo fuentes ni advertencias de transición añadidas al contacto.

## Clasificación semántica separada

**A:** orientación respaldada y comprobada. **B:** orientación parcial correcta, con regla pendiente. **C:** comportamiento incorrecto o no demostrado. Se clasifica la conversación completa, no solo el control focal o el HTTP.

| Escenario | Resultado | Revisión y límites |
| --- | --- | --- |
| T01 — solicitud, ingreso virtual, dónde/cuándo | **B** | Mantiene insuficiencia para el procedimiento y explica el alcance descriptivo de TEST_ORIENTATION. Fechas, requisitos y plataforma pendientes. |
| T02 — prueba nueva no validada en 202660, repetición | **B** | U03 y su advertencia histórica conservados; explica cursar la asignatura del pilar y gestionar matrícula. Repetición/gratuidad no acreditadas. |
| T03 — Informática pendiente, cohorte, primera gratuita | **B** | Orientación U04 conservada, reconocimientos y condiciones por comprobar. No concede primera presentación gratuita ni elegibilidad. |
| T04 — oportunidad de antiguos y derecho exigible | **B** | Antecedente «antiguos» permite explicación acotada; no convierte cohorte en derecho. Excepción/beneficio no admitidos. |
| T05 — Word, no PowerPoint, pilar y pago | **B** | Mantiene U04 para comprobación, sin decidir AND/OR, pilar individual ni coste. |
| T06 — Excel anterior, IA y faltantes | **B** | U04 conserva la necesidad de comprobar plan/códigos/registro; no equipara Excel con aprobación de IA ni calcula faltantes. |
| T07 — ausencia, admisión posterior, intento | **B** | **Pertinencia corregida y comprobada**: tres insuficiencias sin fuentes ni advertencias ajenas. La norma operativa de esos casos sigue pendiente; no se presenta la abstención como resolución académica. |
| T08 — prueba reprobada corregida a curso | **B** | Tras la corrección usa solo el límite de recuperación de curso de U03. No ordena cursarlo de nuevo ni exime de pruebas nuevas. Procedimiento de recuperación pendiente. |
| T09 — Informática en UNAB Tec y modalidad | **B** | Conserva U04 por el antecedente de Informática y reconoce diferencias por programa/modalidad; no universaliza el plan profesional. |
| T10 — ambigüedad sin antecedente y otra conversación | **A** | Aclaraciones sin citas ni contexto cruzado, comprobadas en dos conversaciones independientes. No acredita una regla institucional. |
| T11 — dos solicitudes relatadas, derecho universal, reprobación | **C** | Primeros dos turnos son prudentes: no fuerzan U04, no convierten relatos en política ni afirman inexistencia del procedimiento. Falta una explicación más útil y el seguimiento de reprobación devolvió 503; la conversación completa **no quedó demostrada**. Con antecedente explícito de Informática la unidad positiva de U04 sí pasa, pero eso no sustituye el E2E fallido. |
| T12 — nota, inmediatez, puntaje, contacto | **B** | Insuficiencia sin citas ajenas en las tres reglas no admitidas; contacto M12 y vigencia correctos. No decide aprobación con 70. |

Distribución T01–T12: **1 A, 10 B, 1 C**. El C anterior de T07 queda corregido; el C actual de T11 se debe al seguimiento no completado. No son doce escenarios resueltos.

**REG: C en conjunto**, por los dos 503 en IA/temas. El catálogo de siete cursos, la corrección explícita a Marca Personal con DOC-103, duración con TEST_ORIENTATION y contacto M12 sí quedaron comprobados. No se atribuyen a esta ejecución los dos turnos de IA que funcionaron en ejecuciones anteriores.

## Integridad y evidencia conservada

Auditoría adicional de solo lectura SQL/archivos: [`t07-51-integrity-1792686526519.json`](../../data/ccd/evidence/increment-5/t07-51-integrity-1792686526519.json).

- Las **133 conversaciones anteriores**, incluidas las T07 fallidas, sus filas, mensajes y citas permanecen idénticas.
- Sin cambios de hash en `datasets`, `dataset_releases`, `documents`, `document_versions`, `document_chunks`, `embedding_configs` y `ccd_demo_contexts`.
- **36 archivos** de snapshots/schemas CCD y **18 archivos JSON de evidencia anteriores** conservados byte a byte. Incluye la evidencia histórica T07 y los checkpoints previos.
- Solo aparecen las 14 conversaciones nuevas de esta batería. Totales: **133 → 147 conversaciones; 880 → 954 mensajes; 555 → 586 citas**. Los tres POST fallidos no generaron mensajes persistidos ni se migraron a otra release.
- Release actual sin cambios: `3d6cedac-0e86-40c8-909b-d3ff6e8ab741`, 12 documentos/fragmentos/embeddings. Releases históricas de dos y diez conservadas. Totales: 12 identidades, 24 versiones, 24 fragmentos y 24 embeddings.
- Artefactos y citas persistidas verificados por HTTP/SQL. Lecturas sintéticas de perfiles/progreso/historial correctas, sin escrituras de datos sintéticos.

Además del reporte HTTP y los logs de pruebas, se escribieron solo archivos nuevos privados bajo `data/ccd/evidence/increment-5/`: `t07-51-before.json`, `t07-51-audit.mts`, `t07-51-critical-turns.json` y `t07-51-provenance.json`. Este último conserva las huellas de los cinco archivos de implementación/pruebas/evaluación. No se sobrescribió evidencia anterior.

## Archivos revisables modificados

- `backend/api/src/chat/document-evidence.ts`: selección temática y exclusión del retorno genérico; clasificación de procedimientos no admitidos.
- `backend/api/src/chat/document-rag.ts`: unidad primaria condicionada al tema, reutilizada por el respaldo.
- `backend/api/test/document-evidence.test.ts`: regresiones negativas y positivas; testimonio con/sin antecedente.
- `backend/api/test/document-rag.test.ts`: reproducción de T07, marcador del generador y retorno genérico sin orientación pertinente.
- `eval/integration/ccd-guidance.mts`: tres controles nuevos de contenido/citas/advertencias T07; resto de batería conservado.
- Este checkpoint. No se cambiaron los documentos de cierre anteriores.

## Pendientes para decisión de Sala de Control

La corrección T07 está comprobada; **el resultado integral sigue abierto por los tres fallos de dependencia**. Antes de modificar parámetros se propone investigar de forma separada la latencia de generación y recoger el motivo saneado del HTTP 400. También revisar la continuación cuando una pregunta de tema falla y no queda persistida: sin antecedente concreto, debe evitarse convertir un seguimiento ambiguo en un contexto documental amplio. No se implementó esa ampliación ni un retry.

Persisten los límites institucionales: procedimiento de ausencia/admisión tardía, condiciones de transición, cohortes/programas/modalidades, correspondencias personales, primera presentación frente a repetición y eventual beneficio económico. Los dos relatos siguen siendo una consulta institucional prioritaria; no se niegan ni se convierten en norma. No hubo comunicaciones a terceros.

No se modificaron corpus, originales, manifiestos, releases, embeddings, SQL, datos sintéticos, Mobile ni contratos REST/MCP. Sin dependencias, servicios o agentes nuevos. `git diff --check` correcto; no hubo operaciones destructivas de Docker, borrados, commit ni push. Las APIs temporales se cerraron; los servicios locales existentes permanecen en loopback.

**CHECKPOINT BANUCHAT: corrección focal T07 lista para revisión; batería integral fallida y límites registrados. Detenerse y devolver a Sala de Control.**
