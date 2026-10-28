# BanuChat — PV-2: Academic Gate & Final Freeze Preparation

28/10/2026, America/Bogota. Trabajo exclusivamente metodológico/documental.

**PV-2 COMPLETE — ACADEMIC DECISION PACKAGE READY, EXTERNAL GATES PENDING**

Se prepara material para decisión del responsable académico, sin resolver sus
decisiones, reclutar, contactar personas ni ejecutar estudio/SUS. La preparación
técnica heredada no constituye freeze ni autorización para estudiar participantes.

## A. Baseline

- HEAD esperado y observado: `97b99cc391fdb3a1d6d2f3b67526f24c0e05ad3c`.
- Branch `main`; `git status --porcelain=v1 --untracked-files=all` vacío al empezar.
- `AGENTS.md` leído íntegramente. Sin cambio de branch, operaciones Git
  destructivas, commit ni push.
- Lectura delimitada al protocolo, instrumentos humanos, paquete final y
  resultados PV-0/PV-1B. No se consultaron configuraciones privadas, bases de datos,
  dispositivos, credenciales ni contenidos de volúmenes.
- Trece archivos protegidos quedaron registrados con SHA-256 antes de editar:
  protocolo, consentimiento anterior, hoja del participante, SUS, guía,
  freeze-template, dos CSV, analyzer/tests y tres fixtures. Cotejo final sin cambios.

## B. Estado heredado, no reejecutado en PV-2

| Elemento | Antecedente y límite |
| --- | --- |
| Producto | BanuChat; CCD 1.4 current según evidencia previa, no nueva lectura runtime |
| PV-0 | Rebaseline completo; cinco tareas, criterios y analyzer preparados |
| Android PV-1B | Canal SDK 57 limpio sin Tools, focales y T01–T05 técnicamente ejecutables; comprobación del operador, no humana |
| T04 | El evento del ensayo técnico no quedó congelado para P01 |
| T05 | Contextos compatibles acreditados previamente; asignación común privada pendiente |
| TalkBack | NOT_EXECUTED; brecha separada, sin bloqueo automático del SUS Android |
| Estudio humano | Cero participantes reales según estado confirmado; las dos plantillas conservan cero filas de resultados |

Se mantiene **TECHNICALLY READY FOR FINAL FREEZE** bajo las condiciones técnicas
observadas en [PV-1B](product-validation-ux-closure-pv1b.md), y
**NOT READY FOR RECRUITMENT**. No se trasladan pruebas anteriores a un PASS nuevo.

## C. Decisiones académicas requeridas

**PENDIENTE DE CONFIRMACIÓN POR EL RESPONSABLE ACADÉMICO: procedimiento/revisión aplicable antes del reclutamiento**

No se establece qué comité, dependencia, formulario, norma, contacto, aprobación
o plazo exige UNAB. La evidencia revisada y el estado confirmado no aportan una
decisión externa habilitante; no se sustituye por una inferencia del agente.

| ID | Decisión externa, todas PENDIENTE |
| --- | --- |
| AG-01 | Procedimiento/revisión aplicable antes del reclutamiento |
| AG-02 | Revisión/aprobación de la versión final del consentimiento |
| AG-03 | Responsable/contacto para preguntas y retiro |
| AG-04 | Custodia separada de consentimientos |
| AG-05 | Custodia de resultados seudonimizados |
| AG-06 | Retención y disposición final por categoría |
| AG-07 | Retiro, datos ya recogidos y eventual relación PID↔persona |
| AG-08 | Designación de moderador |
| AG-09 | Designación de observador/registrador |
| AG-10 | Confirmación de muestra, elegibilidad y cuotas |
| AG-11 | Canal de reclutamiento permitido |
| AG-12 | Aceptación de dispositivo/build/canal Android de la tanda |
| AG-13 | TalkBack como requisito expreso o brecha separada |
| AG-14 | Alcance de SUS Android sin iOS físico |

La tabla completa de propuestas, opciones, roles sin designación, estados y
efectos está en el decision sheet. No hay personas nombradas ni decisiones tomadas.

## D. Decision sheet

Creado [academic-review-decision-sheet.md](../human-validation/academic-review-decision-sheet.md):
síntesis breve independiente de la historia técnica, cinco tareas en lenguaje
no técnico, muestra propuesta, registro mínimo, criterios intactos, AG-01–AG-14,
ventana pendiente, condiciones de canal y checklist para el freeze.

Mantiene literalmente **>85 % completación**, **SUS medio >70** y **ningún SUS
individual <50**. Conserva ≥10 elegibles, ≥3 programas y máximo 50 % de uno como
diseño sujeto a confirmación. No revela respuestas T04/T05 ni cuenta concreta.
La duración de aproximadamente 35 minutos proviene del protocolo, con límites
3/8/4/5/5 minutos, no de tiempos diagnósticos del operador.

## E. Consentimiento

Revisado [consent-draft.md](../human-validation/consent-draft.md), sin modificarlo.
Creado [consent-review-draft.md](../human-validation/consent-review-draft.md) con
estado obligatorio **DRAFT FOR ACADEMIC REVIEW — NOT APPROVED FOR USE**.

Incluye propósito, voluntariedad, cinco tareas y SUS inmediato, duración del
protocolo, cuenta ficticia, ausencia de datos académicos personales, molestias
menores de interacción, pausa/retiro, datos mínimos y seudonimización. Custodia,
contacto, retención, mecanismo y tratamiento de datos ante retiro quedan pendientes.
No promete anonimato absoluto ni eliminación no decidida; no solicita firmas.
La nueva propuesta no aprueba ni invalida el antecedente: ambos son borradores;
el índice identifica cuál se presenta para esta revisión.

## F. Manejo de datos

Creado [data-handling-review.md](../human-validation/data-handling-review.md):
contacto/reclutamiento identificable; consentimiento potencialmente identificable;
resultados seudonimizados PID con el esquema exacto de los dos CSV existentes.

Se separan categorías, accesos y decisiones pendientes sin crear almacenamiento.
La posible relación PID↔persona se explica como una decisión necesaria para el
procedimiento que se acuerde; **no se crea ningún vínculo**. Retención/eliminación
y retiro siguen sin plazo ni mecanismo inventados. No se añaden columnas, cuentas,
datos humanos, respuestas SUS ni uso secundario de participantes.

## G. T04

**PENDIENTE DE VENTANA DE SESIONES**.

**VENTANA DE SESIONES PROPUESTA: [PENDIENTE]**

La sección «Información necesaria para congelar T04» solicita primera/última
sesión, todos los días reales, buffer, evento visible cada día, categoría,
unicidad y límite normal de 20 resultados. Una vez disponible la ventana,
selección/revalidación determinista en PV-3 sobre fechas Bogotá y ventana vigente;
si no hay candidato válido, informar bloqueo sin modificar el dataset.

No se selecciona `event-016` por haber funcionado en PV-1B. Permanece antecedente
del ensayo, no objetivo definitivo. No se rellenó T04 en la hoja ni el freeze.

## H. T05 — referencia del operador, no material entregable

Se conservan como **candidatos técnicos actuales**, no freeze:

- `course-003`, completed / 100 %.
- `announcement-006`, active.

El freeze debe reconfirmar ambos en un mismo contexto compatible, con filtros
y visibilidad reales. No basta usar cualquier cuenta operativa. No se publica
cuenta concreta, UID, credencial ni vínculo cuenta→contexto/PID.

**COMMON AUXILIARY CONTEXT: [PENDIENTE DE ASIGNACIÓN PRIVADA]**

## I. Canal Android

El decision sheet resume PV-1B sin copiar ingeniería ni URLs históricas:
reconfirmar build/hash, dispositivo sin serial, Metro/API, conexión autorizada,
legacy clean launch derivado del entorno activo, Tools ausente y navegación
normal. Mantener la misma configuración toda la tanda. Un cambio requiere
registrar desviación y evaluar comparabilidad; no ocultarlo bajo el freeze inicial.

No se inicia Metro/API, app, Docker o ADB en PV-2. No se instala ni reconstruye
build. TalkBack sigue NOT_EXECUTED; AG-13 puede decidir exigirlo, sin convertirlo
automáticamente en blocker técnico. iOS físico no se da por probado ni se exige
por defecto para SUS Android; la decisión de alcance corresponde a AG-14.

## J. Instrumentos del participante — auditoría de contenido

Se leyeron íntegros [participant-task-sheet.md](../human-validation/participant-task-sheet.md)
y [sus-questionnaire.md](../human-validation/sus-questionnaire.md). No se editaron.

| Comprobación | Hoja de tareas | SUS |
| --- | --- | --- |
| IDs internos de recursos (event/course/announcement, UUID, cuenta) | Ausentes; T01–T05 son etiquetas de tarea | Ausentes |
| Respuestas/soluciones T02–T05 y nombres técnicos de eventos | Ausentes; curso/anuncio se nombran como objetivos, sin porcentaje ni filtro solución | Ausentes |
| Instrucciones de debugging o referencias a PV-0/PV-1/PV-1B | Ausentes | Ausentes |
| `release_id`, `schema`, `CCD 1.4` | Ausentes | Ausentes |
| Metadatos internos de preparación/versión | Banner de plantilla no entregable y referencias a freeze | Cabecera `OE5-H0-CCD-1.0` |

**Observación de entrega, sin PASS global «sin IDs internos»:** si la exigencia
incluye también códigos internos de versión, el SUS actual conserva uno en la
cabecera. Se deja visible esta discrepancia; PV-2 prohíbe modificar el instrumento
SUS. La presentación final deberá resolverse con autorización en PV-3, conservando
los diez ítems y escala exactos. No se declara que el formulario esté ya depurado
para entregar ni se altera su cabecera silenciosamente.

La hoja sigue deliberadamente **NO ENTREGABLE** por T04 y contexto T05 pendientes.
Sus avisos de preparación no son instrucciones de tarea; en la edición entregable
deberán quedar fuera del material leído por el participante, con objetivos finales
y sin soluciones. No se cambiaron tareas por preferencia ni se entregó material.

## K. Guía del moderador

Revisada [moderator-guide.md](../human-validation/moderator-guide.md), sin cambios:

- Ordena leer literalmente, una tarea a la vez y sin demostraciones/coaching.
- Distingue aclaración lingüística neutral de pista de navegación; una pista es
  asistencia y FAIL, no SUCCESS asistido.
- BLOCKED solo ante causa técnica externa, con código/causa y segundos;
  distingue la dependencia T03/T02 de un error de interacción.
- Ante crash/red detiene reloj, conserva intento y causa; no reenvía un POST
  incierto automáticamente ni reinicia/repite silenciosamente.
- Repetición identificada y separada, sin sustituir la primera; desviaciones,
  observaciones y denominadores preservados. SUS inmediato, sin orientar respuestas.

Los puntos solicitados están cubiertos. No se añadió coaching ni se reescribió
el script literal o la referencia privada de observación.

## L. Freeze readiness

No se completó ni editó [freeze-template.md](../human-validation/freeze-template.md).
La checklist del decision sheet incluye AG-01, consentimiento revisado/aprobado,
roles, custodia/retención/retiro, muestra/canal/alcance, ventana, T04, contexto T05,
HEAD/build/device, hashes finales, CSV vacíos y canal limpio reconfirmado.

`READY_TO_FREEZE` no equivale a `READY_FOR_RECRUITMENT`. El primero requerirá
entradas/decisiones resueltas; el segundo, freeze completado y decisión habilitante
real. La preparación técnica heredada no satisface por sí sola ninguno.
Los hashes de auditoría PV-2 comprueban conservación de archivos; no son un
freeze de instrumentos aprobado para P01.

## M. Blockers y límites

Pendientes AG-01–AG-14, consentimiento final, responsables/contacto,
custodia/retención/retiro, plan de muestra/reclutamiento y ventana real de sesiones.
Sin ventana no hay T04 definitivo; sin asignación/reconfirmación no hay contexto
T05 congelado. Falta el freeze final y la presentación entregable de instrumentos.
La observación de cabecera SUS no se resuelve violando el límite de no modificarlo.

No se inventaron requisitos UNAB ni decisiones para llenar tablas. Ninguna
decisión pendiente impide preparar estos borradores para revisión; sí impide
usarlos como aprobación. TalkBack/iOS mantienen el tratamiento explícito de I.

## N. Git / scope y comprobaciones

Archivos creados:

1. `eval/mobile/human-validation/academic-review-decision-sheet.md`.
2. `eval/mobile/human-validation/consent-review-draft.md`.
3. `eval/mobile/human-validation/data-handling-review.md`.
4. `eval/mobile/results/product-validation-ux-closure-pv2.md`.

Modificado únicamente `eval/mobile/human-validation/README.md` para descubrir el
paquete y distinguir nuevo borrador/antecedente. Ningún archivo eliminado.

Comprobaciones documentales: enlaces locales; estructura AG-01–AG-14 y secciones
A–O; criterios/estados/pendientes; lectura de materiales; ambos CSV con cabecera
y cero filas; cotejo SHA-256 de los 13 archivos protegidos; alcance Git;
`git diff --check` y status completo. Evidencia de auditoría sin datos humanos
fuera del repositorio, en la carpeta temporal `banuchat-pv2-r59imien`.

Resultado de integridad documental: **PASS**; 38 enlaces locales válidos,
13/13 hashes protegidos iguales, 14 decisiones PENDIENTE, secciones A–O presentes
y cero filas humanas en cada CSV. La hoja de decisión tiene 1.632 palabras,
aproximadamente cuatro páginas equivalentes según maquetación; los anexos se
consultan aparte. El cotejo de contenido no declara aprobaciones externas ni
oculta la observación de presentación del SUS indicada en J.

No se ejecutaron tests de aplicación, analyzer, fixtures, SQL, HTTP ni pruebas
físicas. No hubo cambios que justificaran repetir las pruebas técnicas acreditadas.
No se modificaron producto, backend, SQL, RAG, N8N, MCP, Docker, datos, releases,
cuentas, SUS, analyzer, tareas, guía o freeze. No se accedió a servicios ni se
crearon participantes, almacenamiento de personas o vínculos PID↔persona.
Sin commit ni push. La observación del material entregable de J se conserva
separada de las comprobaciones de integridad documental.

## O. Siguiente paso

**PV-2 COMPLETE — ACADEMIC DECISION PACKAGE READY, EXTERNAL GATES PENDING**

Entregar el paquete al responsable académico por un canal que el responsable del
proyecto determine; PV-2 no envía mensajes ni contacta a nadie. Recibir decisiones
externas reales y **ventana real de sesiones**. Solo entonces preparar
**PV-3 — FINAL FREEZE**, resolver la presentación entregable, seleccionar/revalidar
T04, reconfirmar T05 y cerrar el freeze conforme a las decisiones.

**NOT READY FOR RECRUITMENT**. No se avanza automáticamente a PV-3 ni a P01.
