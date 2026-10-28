# PV-0 — Product Validation & UX Closure: rebaseline y readiness

## Precedencia PV-1 — 28/10/2026

El [dry-run físico PV-1](product-validation-ux-closure-pv1.md) ejecutó T01–T05,
pero mantiene bloqueado el cierre técnico del canal: Tools intercepta navegación
y requirió un workaround. TalkBack sobre la app quedó sin acreditar por setup.
No se cambió producto, no hay freeze final ni autorización para reclutar;
este antecedente PV-0 y su puerta académica se conservan.

28 de octubre de 2026, America/Bogota.

**PV-0 COMPLETE — PACKAGE REBASELINED, NOT READY FOR RECRUITMENT**

Instrumentos `READY_FOR_ACADEMIC_REVIEW`, sin participantes, consentimiento obtenido,
SUS respondido ni aceptación humana. PV-0 no cambia UI ni decide mejoras por preferencia.

**PENDIENTE DE CONFIRMACIÓN POR EL RESPONSABLE ACADÉMICO: procedimiento/revisión aplicable antes del reclutamiento.**

## A. Estado real y alcance comprobado

HEAD inicial esperado/observado `7c0ba1564cedc650907952099f88c226c7e4d3d3`, branch
`main`; `git status --porcelain=v1 --untracked-files=all` vacío al empezar. AGENTS.md
leído completo. Sin cambio de branch, operaciones Git destructivas, commit ni push.

Nombre BanuChat, modo `ccd_authenticated`, REST `/api/v2`, evidencia `ccd_local`.
P4-B/CCD 1.4 está técnicamente cerrada en [P4-B.4F](../../integration/results/ccd-current-promotion.md):
autorización 5/5, Document RAG/artifacts, controles 9/9, ownership, historia entre
releases y restart normal, sin rollback final. Eso es antecedente acreditado; PV-0
no repite esas baterías ni lo convierte en aceptación de estudiantes.

Lectura viva PV-0 confirma current `10af4ffd-effb-41fc-bbfe-4dc48cb3398f`, ready,
`ccd-1.4.0`; 107 documentos/chunks/embeddings y run exitoso conservados. Auxiliar
`af157a78-4c51-49c0-b8cc-509257d89f1e`, separado del documental. Los contextos se
derivaron de cuentas/bindings/grants actuales y account_profiles/auxiliar current,
no de profile-001 o de un alias histórico.

Se auditó como conjunto protocolo, hoja, guía, SUS, consentimiento, dos CSV,
freeze, candidatos, analyzer y sus tests/fixtures, readiness, paquete final y
trazabilidad OE5. También se leyó el plan histórico de dispositivo y las fuentes
Mobile de ventana/filtros y backend de proyección auxiliar, exclusivamente en lectura.

## B. Contradicciones y riesgos encontrados, con resolución explícita

| ID | Fuente / afirmación anterior | Hallazgo PV-0 y tratamiento |
| --- | --- | --- |
| PV0-C01 | Protocolo, freeze y paquete final esperaban f01… / ccd-1.3.0 | Referencia vigente obsoleta. Se rebaselina a 10af… / ccd-1.4.0; la ejecución histórica de 1.3 permanece histórica. |
| PV0-C02 | 5ed146… aparecía como base técnica revisada hoy | Es la base de OE5-H0 del 27/10, no la vigente. Referencia PV-0 7c0ba156…; HEAD/status reales de P01 quedan pendientes. |
| PV0-C03 | Checkpoint y plan del 24/10 decían Android físico pendiente | Evidencia posterior sí ejecutó Android técnico. Se añaden notas de precedencia; no se recalifican matrices antiguas ni se afirma SUS/iOS. |
| PV0-C04 | La hoja imprimía event-012 como evento indicado | Puede desaparecer de la ventana móvil tras 28/10. Se retira de la hoja operativa y se conserva como candidato histórico; T04 queda pendiente de ventana. |
| PV0-C05 | Objetivos H0 asociados al alias auxiliar Usuario 1, tratados como comunes | Los bindings vivos derivan cinco contextos; cuatro tienen credenciales operativas y solo dos cumplen course-003 completed/100 %. Se documenta incompatibilidad, sin modificar datos ni asignar P01. |
| PV0-C06 | Preparación/DV-12 del plan antiguo ocultan auxiliares CCD; DV-04 muestra release | No corresponde al producto unificado: auxiliares ficticios visibles y UUID de calendario oculto. Plan histórico no operativo como receta del SUS actual; se conserva su matriz original. |
| PV0-C07 | T02 de H0: CCD 1.3, artifact de 182 caracteres y route:structure | El precheck nuevo usa CCD 1.4, artifact de 401 bytes. La etiqueta route:structure sigue observándose; no se traslada aquel resultado a esta release ni se la califica como mala UX sin humanos. |
| PV0-C08 | Paquete integral decía banco con hoy 63 primary draft | Inventario de H0, fuera de revalidación PV-0. Se rotula histórico en vez de actualizar el benchmark o inventar una revisión humana. |

No toda referencia CCD 1.3 es un error: [Mobile CCD](ccd-current-mobile-validation.md),
[readiness H0](oe5-human-validation-readiness.md) y el antecedente íntegro de
[target-candidates](../human-validation/target-candidates.md) conservan su fecha,
commit, release, bytes/caracteres y resultados originales. Las notas PV-0 aclaran
precedencia. Los planes académicos del 22/10 ya se declaran históricos y enlazan
al protocolo; no se reescriben documentos académicos grandes. Se añade solo una
nota a la trazabilidad consolidada y al checkpoint OE5.

## C. Qué se conserva

Protocolo base OE5-H0-CCD-1.0, exactamente cinco tareas y tiempos 3/8/4/5/5 minutos;
diez ítems SUS y fórmula sin cambios; analyzer, tests y fixtures sin modificaciones.
La edición documental PV-0 se distingue por fecha/revisión y hashes del freeze,
sin falsear el identificador base que emite el analyzer.

Mínimo 10 estudiantes elegibles, ≥3 programas, máximo 50 % de uno; completación
estrictamente >85 %, SUS medio >70, ningún individual <50. Con 10×5 se necesitan
43/50 SUCCESS; no redondear para aprobar. FAIL si requiere pista de navegación;
BLOCKED solo por causa técnica externa, incluido en el denominador de tareas
iniciadas. No imputación de SUS, no aceptación con registros incompletos; retests
separados y primera sesión primaria conservada. Elegibilidad/consentimiento deben
acreditarse fuera del chat: el analyzer no los autoriza ni detecta personas omitidas
en ambos CSV. No se añaden preguntas AC10 ni se sustituyen entrevistas por SUS.

## D. Qué se actualiza

Referencias de estado vigente a CCD 1.4 y HEAD de preparación PV-0; precedencia
sobre las ejecuciones históricas; puerta visible para no entregar la hoja con
T04 pendiente; candidatos futuros por fecha local; contexto T05 realmente derivado;
freeze en tres bloques (conocido, reconfirmación, decisión externa); estado explícito
del consentimiento y enlaces a esta matriz. No se rellenan campos desconocidos.

## E. Cinco tareas, capacidad observable y resultado de auditoría

| Tarea conservada | Qué mide y evidencia técnica pertinente | Estado de preparación |
| --- | --- | --- |
| T01 login/restauración | Entrada propia y recuperación de sesión al cerrar/reabrir. Android histórico acreditó restore; P4-B.4F acredita backend persistente. No se confunden ambos recorridos. | Pertinente; build/dispositivo/cuenta a reconfirmar antes de P01. No ejecutada con humanos. |
| T02 tres pilares + fuente | Consultar documentación CCD, desplegar cita y abrir fuente, sin evaluar memoria o autoridad normativa. Precheck PV-0 normal API exitoso. | Pertinente, técnica vigente; falta reconfirmar apertura en build/dispositivo del freeze. |
| T03 historial | Localizar/reabrir la conversación T02 y conservar respuesta/fuente. Recorridos Android históricos y precheck HTTP de historial actual. | Pertinente; depende de T02 según regla FAIL/BLOCKED ya existente. No se fabrica conversación asistida. |
| T04 calendario ficticio | Encontrar evento único, fecha/hora Bogotá y filtro de categoría. Ventana actual y seis candidatos derivados en lectura. | Pertinente, **PENDIENTE DE VENTANA DE SESIONES**; no hay target operativo. |
| T05 progreso + anuncio ficticios | Curso completado/porcentaje y anuncio visible con filtro. Dos contextos operativos cumplen ambos candidatos; GETs normales confirmados en uno. | Pertinente; asignación de contexto y targets por congelar. No intercambiar cuentas arbitrariamente. |

No se cambió un enunciado por preferencia. Solo se reemplazó el título T04 ya
impreso por un placeholder no entregable, necesario por su caducidad temporal.
T05 conserva títulos candidatos y no revela porcentaje/filtro en la hoja del
participante. Todos los títulos de la hoja final deben salir del freeze habilitado.

### T02: comprobación técnica nueva, sin humanos

Pregunta literal: «¿Cuáles son los tres pilares de Competencias Digitales?».
Con cuenta ficticia existente, API normal npm start, un login y una conversación
temporal propia: HTTP 201 no abstentivo con **Competencias Digitales Básicas,
Analítica y Contenido Digital, Tecnologías Transformativas**. Cita de CCD 1.4,
artifact protegido HTTP 200, label bch-ccd-knowledge-2, 401 bytes y SHA-256
`43fe4ee08ab7267e3cddfdecb81e9b0f226499ab69f824f86c60d92dfc76652a`
igual a DB; historial exacto. DELETE normal de esa conversación y logout confirmado.

Etiqueta visible route:structure, aún presente. Es una observación de presentación
para futura evidencia de uso, no una calificación humana ni autorización para
retocar la interfaz. No se repitió Android físico ni se midieron comprensión, SUS,
completación humana o utilidad percibida. No hay un defecto técnico demostrado
que haga imposible T02. El recorrido UI definitivo se reconfirma antes de P01.

## F. T04 temporal: sin freeze automático

Candidatos existentes posteriores al 28/10/2026, todos en la release auxiliar leída.
Horas Bogotá. Se comprobó en lectura la regla de fechas y visibilidad con límite
API por defecto de 20; no se ejecutaron tareas de usuario ni una matriz Android.

| Evento | Título | Fecha/hora Bogotá | Categoría/filtro | Primer inicio de ventana visible | Último inicio aproximado de tanda de un día |
| --- | --- | --- | --- | --- | --- |
| event-020 | Revisión general de materiales | 2026-11-01 09:00 | general / Generales | 2026-10-03 | 2026-11-01 |
| event-015 | Cierre demo: Ventana para compartir observaciones | 2026-11-10 18:00 | announcement_deadline / Cierres | 2026-10-12 | 2026-11-10 |
| event-021 | Espacio de intercambio ficticio | 2026-11-15 16:00 | general / Generales | 2026-10-17 | 2026-11-15 |
| event-016 | Cierre demo: Encuentro informativo del programa demo | 2026-11-20 18:00 | announcement_deadline / Cierres | 2026-10-22 | 2026-11-20 |
| event-017 | Cierre demo: Actividad opcional de composición | 2026-11-30 18:00 | announcement_deadline / Cierres | 2026-11-01 | 2026-11-30 |
| event-022 | Cierre nocturno del escenario demo | 2026-11-30 23:45 | general / Generales | 2026-11-01 | 2026-11-30 |

Para **cada** día de sesión S y fecha objetivo D: D−29 ≤ S ≤ D. Si la tanda dura L
días consecutivos, último inicio = D−(L−1); con agenda no consecutiva comprobar
todas las fechas. Por eso la última columna no es una fecha de reclutamiento ni
un freeze para varias jornadas. event-022 es 30/11 Bogotá aunque su UTC sea 01/12.
La instantánea no ofrece eventos posteriores al 30/11; una ventana fuera de estos
rangos requiere decisión de instrumento/alcance, no inventar eventos en el corpus.

event-012, 28/10/2026 18:15–20:00, Sesiones, permanece solo como candidato histórico
H0. No se congela para una tanda futura ni se deja impreso en la hoja operativa.
No hay calendario completo de sesiones; no se selecciona otro evento para P01.
El objetivo T04 sigue **PENDIENTE DE VENTANA DE SESIONES**.

## G. T05 y contexto real

El auxiliar current `af157a78-4c51-49c0-b8cc-509257d89f1e` es común, pero el perfil
auxiliar asignado a cada cuenta no lo es. Se verificó el join vivo de account_profiles
con dataset auxiliar current y perfil; no se asumió profile-001 ni Usuario 1.
Fingerprints cortos son seudónimos de contexto sintético, no códigos de participantes.

| Contexto | Credencial operativa | course-003 en contexto vivo | announcement-006 en active | Ambos candidatos compatibles |
| --- | --- | --- | --- | --- |
| AUX-01 (bcaa6cb68290) | sí | ausente | visible | no |
| AUX-02 (fa7c9a878675) | sí | completed / 100 % | visible | sí |
| AUX-03 (78cfc9e9a864) | sí | completed / 100 % | visible | sí |
| AUX-04 (94d3850e95f2) | sí | in_progress / 45.5 % | visible | no |
| AUX-05 (afa26f514598) | no | ausente | visible | no |

Candidatos conservados: course-003 «Búsqueda y verificación de información»,
completed/100 %, y announcement-006 «Actualización de material de orientación»,
active/Vigentes. valid_from observado 05/10/2026 08:00 Bogotá, valid_until null;
reconfirmar vigencia/visibilidad, no prometer permanencia indefinida.

AUX-02/AUX-03 cumplen los objetivos, sin afirmar igualdad de todos sus datos.
En AUX-02 se confirmó además por la misma sesión normal: GET progreso completed
200 con course-003 al 100 %, y GET anuncios active 200 con announcement-006,
ambos en la misma release auxiliar. Esa cuenta se eligió solo para comprobación
técnica, **no como asignación de P01**. Las otras dos cuentas operativas son
incompatibles con el curso candidato. La quinta no tiene contraseña operativa
conocida y no se recuperó/restableció ninguna credencial.

Queda pendiente congelar privadamente un contexto común compatible; el protocolo
permite una cuenta existente usada secuencialmente con limpieza entre personas.
No se tomó esa decisión por el equipo académico ni se cambió progreso/bindings.
No existe un defecto de producto que impida T05 en los contextos compatibles,
pero mezclar indiscriminadamente las cuatro cuentas invalida estos objetivos.

## H. Matriz final de readiness

READY acredita únicamente el elemento indicado, no reclutamiento global. Dry-run
significa comprobación técnica interna por operador, sin estudiantes/SUS; las
puertas de un dry-run completo de tanda son más estrictas que leer un módulo.

| Elemento | Evidencia vigente | Estado | Blocker | Responsable por rol, sin designación inventada | ¿Bloquea dry-run técnico? | ¿Bloquea reclutamiento? |
| --- | --- | --- | --- | --- | --- | --- |
| CCD 1.4, auth/RAG/artifacts/historial | P4-B.4F y lectura PV-0 current | READY | Ninguno técnico observado | Operador técnico | No | No por este elemento; no equivale a habilitación |
| Cinco tareas y criterios/SUS | Protocolo y cuestionario conservados | READY | Ninguno de definición | Responsable académico para aprobación | No | Sí hasta aprobación/freeze conjunto |
| T02 técnico | API 201, tres pilares, fuente 200/SHA e historial | READY | Apertura en build/dispositivo de P01 por reconfirmar | Operador técnico | No para API; UI de tanda por reconfirmar | Sí hasta freeze |
| Estado exacto antes de P01 | HEAD/status/current/release auxiliar son instantáneas | RECONFIRM_BEFORE_P01 | No hay freeze operativo | Operador y coordinador de tanda | Sí para declarar dry-run definitivo | Sí |
| Build, dispositivo, red | Android histórico, no inventario instalado nuevo | RECONFIRM_BEFORE_P01 | Build/dispositivo/canal de la tanda no fijados | Operador técnico | Sí para dry-run en dispositivo | Sí |
| T04 objetivo de la tanda | Seis candidatos; event-012 histórico | RECONFIRM_BEFORE_P01 | PENDIENTE DE VENTANA DE SESIONES | Coordinador de tanda y responsable académico | Sí para las cinco tareas con objetivo definitivo | Sí |
| T05 asignación común | Dos contextos operativos compatibles | RECONFIRM_BEFORE_P01 | Contexto/cuenta de tanda no elegido ni congelado | Operador y coordinador de tanda | Sí para dry-run definitivo | Sí |
| Uso indistinto de todas las cuentas | Dos de cuatro operativas no cumplen course-003 | BLOCKED | Incompatibilidad demostrada de targets | Coordinador; resolver asignación, no modificar datos | Sí si se pretende esa estrategia | Sí si no se corrige la estrategia en freeze |
| Analyzer y plantillas | Tests existentes 13/13, CSV solo cabeceras | READY | No hay datos humanos, correctamente | Operador/registrador | No | No por este elemento |
| Hashes y hoja entregable | Freeze actualizado; T04 con placeholder | RECONFIRM_BEFORE_P01 | Campos críticos y títulos no congelados | Coordinador/operador | Sí para protocolo completo de tanda | Sí |
| Procedimiento/revisión académica | Confirmación explícitamente pendiente | EXTERNAL_DECISION_REQUIRED | No hay decisión habilitante | Responsable académico | No para técnica interna sin personas | Sí |
| Consentimiento | DRAFT — NOT APPROVED FOR USE | EXTERNAL_DECISION_REQUIRED | Versión final/mecanismo/contacto sin aprobar | Responsable académico y responsable operativo por designar | No para técnica interna sin personas | Sí |
| Custodia/retención/retiro/acceso | Placeholders intactos | EXTERNAL_DECISION_REQUIRED | Reglas y custodio no aprobados | Responsable académico/custodio por designar | No sin datos humanos | Sí |
| Roles, muestra, cuotas y program_code | Criterios definidos, plan no aprobado | EXTERNAL_DECISION_REQUIRED | Designación/reclutamiento no autorizados | Responsable académico/coordinador por designar | No para técnica interna | Sí |
| iOS y push remoto | Pendientes globales, fuera de cinco tareas | NOT_REQUIRED_FOR_ANDROID_SUS | No bloquear Android automáticamente | Responsable académico/OE5 global | No para este dry-run Android | No por sí solos, salvo decisión académica expresa |

## I. Decisiones externas y brechas globales

La puerta se mantiene literalmente:

**PENDIENTE DE CONFIRMACIÓN POR EL RESPONSABLE ACADÉMICO: procedimiento/revisión aplicable antes del reclutamiento.**

No se identifica ni inventa comité, radicación, autoridad UNAB/CCD, responsable,
contacto institucional, plazo de retención, aprobación o consentimiento obtenido.
El consentimiento es **DRAFT — NOT APPROVED FOR USE**, con placeholders. También
requieren decisión roles, custodio/acceso, retiro, muestra/reclutamiento y recogida
mínima de program_code fuera del chat. Reutilización para AC10 entrevistas/
caracterización exige decisión académica previa; el SUS no las reemplaza.

| Brecha conservada | ¿Bloquea SUS Android por sí sola? | Relación con OE5 global | Otro OE / alcance |
| --- | --- | --- | --- |
| iOS físico | No | Sí, pendiente del compromiso multiplataforma original | No trasladar resultados Android a iOS |
| Push remoto | No; cinco tareas no lo incluyen | Sí si se conserva el compromiso original, sin sustitución académica | Backend/credenciales y despliegue también pendientes |
| Matriz completa Android/accesibilidad | No convierte el recorrido existente en inexistente; revisar dispositivo/necesidades del estudio | Pendiente para cobertura global; no se ejecuta aquí | No se afirma WCAG/TalkBack/VoiceOver completo |
| Producción/TLS UNAB | No, estudio local por canal autorizado | No es sustituto ni puerta automática del SUS; alcance de operación separado | OE6 |
| Autoridad documental institucional | No se usa SUS como aval; alcance limitado debe informarse | No cierra usabilidad ni equivale a una aprobación de OE5 | OE1/autoridad CCD, pendiente |
| Benchmark humano/RAGAS | No | No es requisito automático de las cinco tareas/SUS | OE1; sin gold humano ni reejecución aquí |
| Despliegue institucional | No | No acredita ni invalida por sí solo el estudio local | OE6, pendiente |

Android físico técnico **sí fue ejecutado** en la etapa de Mobile (YAL-L21,
Android 10/development build indicado en su informe). La matriz completa de
versiones/dispositivos **no** está ejecutada; aceptación con estudiantes **pendiente**;
iOS físico **pendiente**. PV-0 no repite aquel recorrido ni atribuye una nueva
validación física de CCD 1.4; T02 actual es una comprobación API separada.

## J. Cambios y validación realizada

Archivos versionados modificados/añadido, exactamente:

1. eval/mobile/oe5-student-validation-protocol.md
2. eval/mobile/human-validation/participant-task-sheet.md
3. eval/mobile/human-validation/moderator-guide.md
4. eval/mobile/human-validation/consent-draft.md
5. eval/mobile/human-validation/README.md
6. eval/mobile/human-validation/freeze-template.md
7. eval/mobile/human-validation/target-candidates.md
8. eval/mobile/results/oe5-human-validation-readiness.md
9. eval/mobile/results/ccd-current-mobile-validation.md
10. eval/mobile/oe5-device-validation-plan.md
11. eval/mobile/README.md
12. docs/validation/final-human-validation-package.md
13. docs/transition/banuchat-oe5-checkpoint.md
14. docs/academic/oe1-oe6-final-traceability.md
15. eval/mobile/results/product-validation-ux-closure-pv0.md (nuevo)

Único test ejecutado: `node --test eval/mobile/analyze-human-validation.test.mjs`,
**13/13**, cero fail/skipped, fixtures artificiales existentes sin alterar. No se
ejecutó un análisis de datos humanos ni se añadieron tests o respuestas sintéticas
a las plantillas. Sesiones/SUS siguen **solo encabezados y cero participantes**.

Comprobaciones adicionales autorizadas: lectura DB de contexto/fechas; T02 por API
normal con una fixture propia y GETs de T05; cotejo de instrumentos, criterios y
alcance Git. Se verificaron 110 enlaces locales sin roturas, cinco enunciados y
diez ítems SUS idénticos, script literal del moderador conservado y ocho archivos
protegidos (SUS, CSV, analyzer/tests/fixtures) sin cambios de bytes. Snapshot de 43 tablas antes/después: producto, releases,
corpus, bindings/grants, cuentas/credenciales/recovery, auxiliares y seguridad sin
cambios. Conversación/mensajes/citas eliminados normalmente. Solo se añadieron una
sesión/refresh (sesión revocada), dos eventos login/logout y tres buckets normales;
no se borró auditoría. Cero publish_release y cero DML directo de producto.
API/PostgreSQL volvieron a su estado detenido inicial. Sin secretos o datos humanos.
Evidencia técnica saneada en carpeta temporal privada PV-0, fuera del repositorio;
los facts reproducibles pertinentes se consignan aquí sin publicar identidades.

## K. Deliberadamente no modificado ni ejecutado

Ninguna pantalla, navegación, estilo o fuente mobile/src; ningún backend/auth/RAG,
SQL, MCP, N8N, modelo/prompt, top_k, corpus/adoption, release, binding o grant.
No se modifican SUS, CSV, analyzer/tests/fixtures ni grandes planes académicos.
No hay reclutamiento, contacto con personas, consentimiento fabricado, SUS, datos
humanos, entrevistas AC10, benchmarking RAGAS, bancos RAG completos, repetición
Android, cambio de progreso/perfiles, nueva release, promoción, commit o push.
Los estados históricos no se transforman en nuevos PASS ni en resultados CCD 1.4.

## L. Siguiente puerta y límite de readiness

Solicitar al responsable académico la definición/revisión aplicable y registrar su
decisión por el mecanismo que corresponda. Resolver consentimiento, custodia,
retención/retiro/contacto, roles y plan de muestra antes del reclutamiento. Después,
con calendario completo de sesiones, fijar T04/contexto T05 y todos los campos,
build/red/dispositivo y hashes del freeze; reconfirmar técnicamente inmediatamente
antes de P01. Ningún placeholder implica aprobación.

El paquete es coherente para revisión, con incompatibilidades y decisiones pendientes
visibles; no hay un defecto técnico demostrado que haga imposibles las cinco tareas
en un entorno/contexto compatible. Aún no hay freeze operativo ni autorización de
personas: **PV-0 COMPLETE — PACKAGE REBASELINED, NOT READY FOR RECRUITMENT**.
No se avanza a PV-1 automáticamente ni se decide una mejora de UI sin evidencia.
