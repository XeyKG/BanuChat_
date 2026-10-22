# CHECKPOINT BANUCHAT — BCH-03 / Incremento 5

Fecha de ejecución: 2026-10-22. Estado: ampliación local publicada; revisión de Sala de Control pendiente. Sin commit ni push. No es aval institucional ni publicación del servicio.

## Admisión documental

Se añadieron únicamente dos derivados depurados, versionados en el snapshot privado `data/ccd/local/guidance-v3`, versión `bch03-ccd-local-3`, contrato documental `ccd-1.2.0`. Los originales externos permanecen de solo lectura. No se copiaron las nueve respuestas candidatas como FAQ.

| Unidad | Procedencia y localizadores | Alcance admitido y restricciones |
| --- | --- | --- |
| U03 / `ccd-u03` / C53 | DOC-110, §2 B016; §8 B078 y B081–B088; paquete R07; BCH-01 `01_Admision_M01_M12!F5` | Para la población descrita en los lineamientos de **202660**, no validar un pilar mediante la prueba diagnóstica llevaba a cursar la asignatura correspondiente y gestionar la matrícula conforme a la programación. No determina recuperación de cursos reprobados, procedimiento actual, repetición gratuita, tarifa ni matrícula automática. |
| U04 / `ccd-u04` / C09–C10 | DOC-116 B003, B015–B018 y tabla B016; DOC-076 P004, P010–P013; paquete R12–R18; BCH-01 `01_Admision_M01_M12!F11` | Transición histórica 202560–202610, reconocimiento de avance aprobado por comprobar con plan, códigos y registro institucional. El semestre para terminar cursos anteriores era el segundo de 2025. No se admiten las equivalencias concretas de DOC-076 P006–P009, AND/OR, homologaciones personales, elegibilidad general ni beneficios económicos. UNAB Tec/T&T y DUAL requieren comprobación particular. |

Ambas unidades llevan periodo, población, límites, referencias verificables, estado `source_checked_local_candidate`, aplicabilidad actual no confirmada y `institutional_approval: false`. El manifiesto conserva el vínculo al paquete aceptado. DOC-108 y DOC-112 siguen siendo referencias internas de conciliación de límites, sin artefactos, chunks ni originales incorporados.

Huellas SHA-256:

- Paquete aceptado `BANUCHAT_BCH03_paquete_revision.zip`: `2fba8f728868e52111ae1579bb15b25d45aafb3b60f08fe2a2f4d70dad99b108`.
- Corpus de doce unidades: `ced7b83b9e51eed74d2840e395f231f921adb5862d684fc9cc53980c585d0dff`.
- Schema 1.2: `f045c24b6ba356f940516ab3d4263943b445dde789bd4f1ea43399327b6fd855`.
- Artefacto U03 `documents/artifacts/ccd-u03.md`: `f0340b13b8afe10f820f8fbb4edb793acaa42af1c6af47b18b09038f1c4e9ab5`.
- Artefacto U04 `documents/artifacts/ccd-u04.md`: `d1b1804b9122b567287dd59e342325c45713b72f47422dc8a1f127d8f93d44c8`.

Se conservaron M01, M12, las siete unidades M02 y TEST_ORIENTATION con **los mismos diez hashes de artefactos**. U03 desarrolla la consecuencia histórica; no duplica el resumen descriptivo de TEST_ORIENTATION. U04 no duplica el contacto M12.

## Releases y persistencia

| Release | Contrato | Documentos/versiones en release | Fragmentos | Embeddings | Estado final |
| --- | --- | ---: | ---: | ---: | --- |
| `5834fc47-57c5-498b-98fc-4190330155e4` | ccd-1.0.0 | 2 | 2 | 2 | Histórica, conservada |
| `fb8538af-3280-4a1b-889c-a27564381996` | ccd-1.1.0 | 10 | 10 | 10 | Anterior, conservada |
| `3d6cedac-0e86-40c8-909b-d3ff6e8ab741` | ccd-1.2.0 | 12 | 12 | 12 | Nueva, ready/current |

Total CCD: **12 identidades documentales, 24 versiones, 24 fragmentos y 24 embeddings**. La nueva release generó doce embeddings; no se afirma que fueran solo dos. Configuración conservada: Ollama `qwen3-embedding:0.6b`, revisión `ac6da0dfba84a81fdbfbaf330198c33cd77c4cdfc53e8bc50eb581914a15621d`, 1024 dimensiones, coseno. Los embeddings históricos no cambiaron.

Se añadió y ejecutó una vez `infra/db/005_ccd_guidance_manifest.sql`, exclusivamente en `banuchat_ccd_dev`. Es necesaria para aceptar el manifiesto exacto de doce unidades; no cambia tablas, contratos REST ni migraciones 001–004. Mantiene la validación de los manifiestos sintético, CCD 1.0 y CCD 1.1. Rechaza unidades/fuentes/periodos/referencias fuera del recorte y falsa aprobación institucional.

Publicación con el lease, staging y finalizador existentes: comprobación del predecesor y sus diez artefactos, validación de conteos y transición del contexto/puntero en una transacción. No se sobreescribieron snapshots ni se borraron releases, conversaciones o vectores. Una segunda invocación explícita inmediatamente después de publicar devolvió `already_current`, cero embeddings. Esto acredita el no-op con la procedencia de código capturada entonces; una revisión de código distinta no es automáticamente la misma publicación.

Entorno real: proyecto Docker `banuchat-ccd-dev`, servicio `postgres-ccd`, base `banuchat_ccd_dev`, volumen `banuchat-ccd-dev_ccd_pgvector_data`, PostgreSQL `127.0.0.1:55433`, Ollama `127.0.0.1:11434`. La API de evaluación escuchó en `127.0.0.1:3001`. Un único operador, sin acceso LAN, túnel, autenticación simulada ni cambios de Mobile.

## Comportamiento conversacional

Antes, el control de reglas de pruebas podía producir abstenciones vacías ante consecuencias históricas o transición. Ahora el selector usa el tema actual y los antecedentes del usuario para escoger U03 o U04. La similitud vectorial no se usa como prueba de respaldo. En CCD se recuperan las doce unidades y se selecciona la evidencia temática; la recuperación sintética mantiene su top cinco.

Se distinguen prueba nueva reprobada, curso reprobado, prueba antigua pendiente y curso antiguo aprobado. Las correcciones del usuario prevalecen. Para U03/U04 el generador recibe antecedentes del usuario; las respuestas anteriores del asistente no se convierten en evidencia. La persistencia conserva el historial completo y su release.

Las referencias privadas del generador se validan contra los fragmentos realmente recuperados. Referencias ausentes, duplicadas, mal formadas o fuera de rango cierran con insuficiencia; no llegan al contrato REST. Solo se persisten citas de soporte. M12 se elimina si el texto no utiliza su canal; cuando se da el contacto se exige M12 y su advertencia de vigencia.

Si el modelo devuelve exactamente insuficiencia pese a haberse seleccionado U03/U04, se ofrece un pasaje literal pertinente del derivado recuperado y su cita. También se sustituye una negación categórica indebida del procedimiento o de la consecuencia histórica por ese pasaje. No hay segunda generación, retry del POST ni nueve respuestas estáticas. Las concesiones positivas no respaldadas y referencias inválidas siguen bloqueadas. Este recurso puede repetir un límite documental y no resuelve reglas pendientes.

Se conservó el máximo de 80 palabras del generador; las advertencias deterministas se agregan después. U03 siempre advierte ámbito 202660, falta de procedimiento actual ratificado y ausencia de autorización de gratuidad/matrícula automática. U04 advierte transición histórica y ausencia de decisión personal. No se agregan advertencias de syllabus o contacto por documentos secundarios no utilizados.

## Batería T01–T12: cobertura, no doce aprobaciones institucionales

Se ejecutaron las conversaciones del paquete con formulaciones del operador de demostración, incluyendo los dos casos relatados en T11. T10 usa dos conversaciones nuevas e independientes. Cada ejecución completa contiene **42 preguntas por HTTP**, trece conversaciones de escenarios y una conversación de seis turnos de regresión.

| Caso | Preguntas y seguimientos ejecutados | Resultado y límite de cobertura |
| --- | --- | --- |
| T01 | Cómo pedir la prueba → primer ingreso virtual 202660 → dónde/cuándo | Descripción general de TEST_ORIENTATION cuando procede; solicitud, requisitos, plataforma y cronograma de R01–R04 **no admitidos**, pendientes. No se acredita procedimiento operativo. |
| T02 | No aprobé prueba nueva → pilar 202660 → repetir gratis | Orientación histórica útil U03, con advertencia temporal. La repetición gratuita sigue **sin confirmar**. |
| T03 | Pruebas de Informática pendientes → ingreso 202410/nuevas no presentadas → primera gratis ahora | Orientación U04 y necesidad de comprobar condiciones. No concede elegibilidad ni primera oportunidad gratuita. **Procedimiento institucional prioritario pendiente**. |
| T04 | Ingreso 202510/oportunidad de antiguos → derecho exigible | Explicación condicional U04. La excepción y su corte de cohorte R05 no están admitidos; **no se resuelve elegibilidad**. |
| T05 | Word aprobado → no PowerPoint → pilar 2/sin pago | U04: comprobar reconocimientos; no decide AND/OR, aprobación individual ni coste. **Equivalencia pendiente**. |
| T06 | Excel del plan anterior → ¿IA Generativa aprobada? → qué falta | U04: no equivale a reconocimiento automático; comprobar plan/códigos/registro con programa y CCD. No calcula faltantes personales. |
| T07 | No asistió → admisión posterior a primera fecha → otro intento gratis | Límites U04, sin convertir ausencia en reprobación ni conceder intento. R08/R09 operativos **no admitidos**, pendientes. |
| T08 | Prueba no aprobada 202660 → corrección: curso → presentar nuevas | Distingue el curso de la prueba; U03 permite explicar que la recuperación del curso necesita confirmación. **No aplica automáticamente la consecuencia de prueba ni ordena cursarlo otra vez**. |
| T09 | UNAB Tec/materia aprobada → mismo plan profesional presencial | U04: verificar adaptación particular; no universaliza el plan profesional. Anexo/regla individual **pendientes**. |
| T10 | Repetirla gratis sin antecedente; cuánto dura en otra conversación | Aclaraciones sin citas ni arrastre de contexto ajeno. Separación técnica comprobada. |
| T11 | Dos casos de solicitud/presentación → derecho para todos → si después reprueba | U04: falta de norma localizada no demuestra inexistencia. Los relatos no acreditan política universal ni gratuidad. El seguimiento hipotético permite explicar U03 **solo como consecuencia histórica 202660**, sin decidir otro periodo. |
| T12 | Nota virtual 202660 no visible → inmediata → exactamente 70 → contacto | Resultados/inmediatez/umbral R04/R06 **no admitidos**: insuficiencia o límites. El contacto sí se respalda en M12 y advierte vigencia no ratificada. No se acredita aprobación con 70. |

La regresión de seis turnos cubre catálogo de siete cursos → IA Generativa → temas → corrección a Marca Personal → duración de pruebas 202660 → contacto. Se revisan las fuentes efectivamente persistidas, no solo la presencia de texto.

Ejemplos reales de respuestas/citas persistidas (se reproducen extractos; el reporte privado conserva la respuesta y advertencias completas):

| Consulta/antecedente | Texto observado | Cita efectivamente guardada |
| --- | --- | --- |
| Pilar de prueba nueva no validado en 202660 | «Los lineamientos de 202660 indican que, cuando un pilar no es validado mediante la prueba diagnóstica, el estudiante debe cursar la asignatura correspondiente al pilar dentro de la ruta y conforme a la programación institucional.» | `unit:U03`, versión documental `54a83fb4-d5ae-43c6-b9e5-e8ab65be6c31`, release nueva. M12 seleccionado como disponible fue eliminado al no utilizarse su canal. |
| Excel del plan anterior → IA Generativa → qué falta | «La documentación explicativa de la transición de Informática a Competencias Digitales contempla reconocer cursos ya aprobados y comprobar qué pilares siguen pendientes. Para decidir reconocimientos debe verificarse el plan, los códigos y el registro institucional con el programa académico y el CCD.» | `unit:U04`, versión `90a5590d-f51e-4e69-944f-8604bfd2e81b`; no cita de syllabus de IA ni decisión personal. |
| Dos casos relatados → derecho para todos | «No localizar una norma aplicable no demuestra que el procedimiento de transición o autorizaciones particulares nunca existieran. Sus condiciones, periodo, cohorte, correspondencias y eventual beneficio económico deben confirmarse con el CCD.» | Solo `unit:U04`; no cita de contacto ni aviso M12 innecesario. |

U03 añade siempre «no determina automáticamente el procedimiento vigente de otro periodo ni autoriza repetición gratuita o matrícula automática». U04 añade «no determina equivalencias personales, elegibilidad ni gratuidad». En la corrección a Marca Personal la cita persistida cambia a `unit:M02:DOC-103`, sin conservar la de IA `unit:M02:DOC-101`.

## Verificación y evidencia local

- API: `npm run typecheck`, `npm run build`, `npm test`: **509/509**, cero fallos/omitidas. Log `data/ccd/evidence/increment-5/api-unit-accepted.log`.
- RAG: `npm run typecheck`, `npm run build`, `npm test`: **215/215**, cero fallos/omitidas. Log `rag-unit-host.log` en la misma carpeta.
- El runner TypeScript pasó comprobación estricta independiente. No se añadieron dependencias.
- `npm run validate:dataset`: sintético válido, 18 archivos, 76 items, 12 documentos y 60 fragmentos; datos sin cambios.
- Preflight SQL real: **25 comprobaciones**, incluidas validaciones históricas/sintética, rechazos del nuevo manifiesto y preservación. Transacciones de prueba revertidas con ROLLBACK, sin carga adicional.
- E2E: `node --env-file=../../infra/.env.ccd --import tsx ../../eval/integration/ccd-guidance.mts http`, desde `backend/rag`. HTTP nativo, PostgreSQL CCD y Ollama reales; sin mocks del generador/embeddings ni pruebas Android o Expo Web.
- Los reportes privados conservan pregunta, conversación, salida cruda del modelo, localizadores seleccionados, estado Ollama, respuesta HTTP, citas persistidas y conteos por release. No contienen datos personales de estudiantes.
- Se comprueban igualdad GET/respuestas persistidas; hash, localizador y release de cada cita; descarga y hash de **las 24 versiones documentales**; conservación de 33 conversaciones anteriores y sus mensajes/citas; releases/chunks/vectores históricos; POST en release antigua devuelve **409** sin migración silenciosa.
- Regresión sintética por HTTP real en `127.0.0.1:3302`: lectura de perfiles, progreso e historial, sin crear mensajes sintéticos. Sus contratos, datos y recuperación por defecto se conservan; no se afirma una nueva batería completa de generación sintética.

Las primeras ejecuciones también permanecen en evidencia: cinco 503 en la primera, abstenciones vacías, selección/seguimientos incorrectos y falsos positivos del control. No se reintentaron automáticamente esos POST ni se borraron sus conversaciones. El runner inicial tenía además una consulta de orden por columna inexistente; se corrigió la consulta de reporte. Los defectos funcionales motivaron los cambios pequeños descritos arriba; las respuestas generadas no se aceptaron únicamente por obtener HTTP 201.

La ejecución completa `http-1792649159552.json` tuvo 249 comprobaciones técnicas correctas, pero su lectura semántica encontró una exención no documentada («no se requiere presentar nuevas pruebas» ante curso reprobado) y un contacto sin la línea privada de fuentes. Se amplió la comprobación para detectar ambos casos. La siguiente ejecución completa `http-1792649504103.json` tuvo **42/42 HTTP 201 y 251/252 comprobaciones correctas**: el curso quedó condicionado correctamente; T12/contacto volvió a omitir las referencias y terminó en insuficiencia segura. REG/contacto sí respondió con M12. Por tanto, **esa batería completa no se presenta como PASS**.

Se agregó una indicación de formato explícita para el único fragmento de contacto, conservando el rechazo de referencias inválidas. Su comprobación posterior usa `http contact`: T12 y la regresión de seis turnos, diez preguntas en dos conversaciones nuevas; no reenvía mensajes fallidos a una conversación existente. El cambio no afecta el contenido documental, U03/U04 ni los contratos. Las pruebas unitarias incluyen ambos defectos reproducidos.

Resultado focalizado final: **10/10 HTTP 201, 133/133 comprobaciones correctas**, reporte `data/ccd/evidence/increment-5/http-1792649603989.json`. T12/contacto y REG/contacto guardaron únicamente M12 y la advertencia temporal. Texto observado: «El contacto documentado del equipo de Competencias Digitales para el periodo 202660 es ccdigital@unab.edu.co. Su vigencia actual debe confirmarse», seguido por la advertencia determinista. El puntaje de 70, la inmediatez y la nota no visible continuaron sin afirmaciones decisorias ni citas irrelevantes. La corrección a Marca Personal citó DOC-103; duración citó TEST_ORIENTATION. **No se repitió toda la batería de doce escenarios después de este último ajuste exclusivo de formato de contacto.**

Auditoría final de solo lectura: `data/ccd/evidence/increment-5/final-state-1792649656603.json`. Los trece archivos de procedencia del paquete (nueve originales y cuatro matrices) conservan sus hashes; el schema publicado también. Se comprobaron sin alteración **245 respuestas guardadas en todos los reportes de esta ejecución**, además de la comparación íntegra de las 33 conversaciones preexistentes en los E2E. Estado total CCD: **119 conversaciones, 800 mensajes y 516 registros de cita**; incluye historiales previos y pruebas fallidas conservadas, no un conteo de conversaciones de estudiantes. Conteos documentales finales: 12 identidades/24 versiones/24 fragmentos/24 embeddings.

Los servidores temporales de evaluación finalizaron: no quedan listeners de evaluación en 3001/3302. PostgreSQL/Ollama y sus datos no se detuvieron ni eliminaron. `git diff --check` pasó; la revisión de archivos confirma el alcance declarado y que corpus/evidencia privados siguen ignorados. No se dispone de script lint en estos dos paquetes; no se declara una ejecución de lint ni pruebas nativas.

## Cambios revisables

- Contrato documental: `data/ccd/schemas/corpus-1.2.schema.json`; allowlist en `.gitignore` y `data/ccd/.gitignore`. Corpus y evidencia continúan excluidos de Git.
- Preparación/publicación: `backend/rag/src/ccd/{prepare,ingest,load-local}.ts`, `backend/rag/src/db/{recipe,finalize}.ts`, `infra/db/005_ccd_guidance_manifest.sql`.
- Chat local: `backend/api/src/ccd-runtime.ts`, `backend/api/src/main.ts`, `backend/api/src/chat/{conversation-context,document-evidence,document-rag}.ts`.
- Pruebas: `backend/rag/test/ccd-expanded.test.ts`, `backend/api/test/{conversation-context,document-evidence,document-rag}.test.ts`, `eval/integration/ccd-guidance.mts`.
- Documentación: README de API, RAG y CCD; este checkpoint.
- Solo locales e ignorados: dos nuevos artefactos depurados, manifiesto/corpus/pipeline del snapshot, helpers de preparación/observación/auditoría y evidencia de pruebas. Los diez artefactos anteriores no se sobreescriben.

Correcciones identificadas: declaración JSON Schema para Ajv estricto; resolución de antecedentes explícitos como «plan anterior»; conservación del tema al añadir condiciones cortas; corrección curso/prueba; exclusión de conclusiones anteriores del asistente como evidencia; ausencia y puntaje fuera de reglas admitidas; citas/advertencias M12 irrelevantes; falso positivo ante una lista negativa de gratuidad; explicación literal del recorte cuando el generador se abstiene o niega indebidamente lo conocido. No se hizo una refactorización general del RAG.

## Decisiones pendientes de Sala de Control

Sigue prioritaria la consulta institucional sobre el procedimiento de transición relatado en dos casos: nombre/canal de solicitud, condiciones, periodos, cohortes, programas/modalidades, correspondencias académicas y eventual beneficio económico; distinguir primera presentación nueva de repetición después de reprobar y autorización particular de regla general. **No se envió una consulta en nombre del operador.** El canal M12 es documentado para 202660 y necesita ratificación actual.

Permanecen bloqueadas las concesiones de repetición gratuita, primera nueva gratuita universal para antiguos pendientes, elegibilidad general de continuos, homologación personal, AND/OR no conciliado, matrícula automática y tarifas no acreditadas. Se puede hablar de esos escenarios y explicar lo conocido; no se afirma que nunca existieran procedimientos particulares.

La selección de fuentes, validación de referencias y controles léxicos reducen errores, pero no prueban formalmente toda afirmación de un modelo. El pasaje literal puede resultar repetitivo y no sustituye la información institucional pendiente. El contexto sigue siendo local, compartido y sin autenticación: no ofrece privacidad por usuario ni acceso multiusuario. No se probaron Android ni Mobile porque no se modificaron. No hubo nuevas ingestas fuera de estas doce unidades, modificaciones REST/MCP, sintético, autenticación, nuevas tecnologías, borrados ni operaciones destructivas de Docker.

**CHECKPOINT BANUCHAT: implementación y evaluación local delimitadas; detenerse para revisión de Sala de Control. No autoriza otra ingesta ni ampliación de reglas.**
