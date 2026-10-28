# BanuChat — paquete ejecutable de validación humana final

## Precedencia PV-1 — 28/10/2026

El [dry-run físico PV-1](../../eval/mobile/results/product-validation-ux-closure-pv1.md)
completó técnicamente T01–T05 con workaround de Tools. El cierre técnico del canal
queda bloqueado hasta resolver esa interferencia; la revisión TalkBack de la app
no quedó acreditada por setup. Sin cambios de producto, freeze, reclutamiento o
SUS humano. T04 provisional PV-1 no sustituye la ventana/target final ni la puerta académica.

## Estado

Rebaseline PV-0 el 28 de octubre de 2026 sobre OE5-H0: paquete preparado, **estudio humano no
ejecutado**. No hay aprobaciones nuevas, reclutamiento, consentimientos obtenidos,
sesiones SUS o resultados humanos. Las ejecuciones/revisiones técnicas del agente
no son revisión humana documental independiente ni aceptación de estudiantes.
Los resultados adversos se conservan; ningún `BLOCKED` se transforma en `PASS`.

Base técnica de PV-0: `7c0ba1564cedc650907952099f88c226c7e4d3d3`.
`5ed14608a9086b59bc880262552ccb2185944d3f` es la preparación OE5-H0 histórica.
[Contradicciones, tareas y matriz de readiness PV-0](../../eval/mobile/results/product-validation-ux-closure-pv0.md).
`39b6b6221d61bd7aef2ce236dd124c3b11488345` es el antecedente del paquete anterior,
no la ejecución actual. Antes de P01 registrar commit real, árbol y freeze completo.
El producto objetivo es `ccd_authenticated` / REST v2, CCD documental current y
auxiliares ficticios. Current técnico observado: `10af4ffd-effb-41fc-bbfe-4dc48cb3398f`,
ready / ccd-1.4.0, con cierre técnico P4-B/CCD 1.4. Reconfirmarlo antes de P01,
sin hardcodearlo en la app. T04: **PENDIENTE DE VENTANA DE SESIONES**; event-012 no
es un objetivo operativo futuro. T05 requiere contexto común explícito: solo dos
de cuatro cuentas con credencial disponible cumplen los candidatos actuales.
Ni el cierre técnico ni este rebaseline habilitan reclutamiento.

## Puerta específica del estudio Android de usabilidad/SUS

**PENDIENTE DE CONFIRMACIÓN POR EL RESPONSABLE ACADÉMICO: procedimiento/revisión aplicable antes del reclutamiento.**

Estado **READY_FOR_ACADEMIC_REVIEW**, nunca READY_FOR_RECRUITMENT mientras falte
esa confirmación. Usar [protocolo vigente](../../eval/mobile/oe5-student-validation-protocol.md),
[instrumentos](../../eval/mobile/human-validation/README.md) y
[readiness](../../eval/mobile/results/oe5-human-validation-readiness.md).
También faltan consentimiento/custodia/retiro/contacto revisados, designación de
roles, cuentas/contexto común, disponibilidad de Android/red y freeze de objetivos.

Android físico ya tiene [recorridos técnicos del agente](../../eval/mobile/results/ccd-current-mobile-validation.md)
y el último [fix diagnóstico](../../eval/rag-quality/results/ccd-mobile-diagnostic-fee-regression.md).
No se repiten aquí ni se atribuyen a estudiantes. La documentación CCD reemplaza
el contenido sintético de T02; cuentas, calendario, progreso y anuncios siguen
siendo ficticios. Los estudiantes no verifican normas ni autoridad institucional.

Los bloques OE1/RAGAS/revisión documental, iOS/push y OE6/producción conservan sus
propias puertas globales. No son prerrequisitos automáticos del estudio SUS
Android salvo decisión académica expresa previa. SUS no cierra OE5 original.

## Roles mínimos

| Rol | Responsabilidad | No puede aprobar por sí solo |
| --- | --- | --- |
| Director/responsable académico | Aprueba alcance, protocolo, criterios y cualquier sustitución de OE | Autoridad/vigencia documental CCD |
| Autoridad de datos CCD | Confirma documentos, versión, vigencia, uso permitido y gold documental | Calidad UX o aceptación académica global |
| Coordinador del benchmark | Congela IDs, hashes, splits, release, configuración y actas | Cambios después de ver el baseline |
| Revisor de dominio A y B | Revisan de forma independiente preguntas, respuestas y contextos | Resolver desacuerdos entre sí sin acta |
| Árbitro de dominio | Resuelve desacuerdos antes de congelar el banco | Reescribir resultados observados |
| Operador técnico | Ejecuta scripts sin tuning, conserva logs/resultados/hashes | Etiquetar fuentes como oficiales ni aprobar usuarios |
| Moderador UX | Lee instrucciones y tareas sin guiar; administra SUS | Reclutar sin autorización/consentimiento |
| Observador/registrador | Cronometra, clasifica errores y documenta desviaciones | Cambiar criterios durante sesiones |
| Custodio de datos | Separa contactos/consentimientos de resultados seudonimizados | Publicar datos personales o credenciales |
| Participantes | Ejecutan las cinco tareas y SUS voluntariamente | Validar autoridad documental institucional |

Una persona puede asumir más de un rol solo si se registra el conflicto y el proceso
académico lo permite. Los dos revisores del banco deben emitir juicios independientes antes
del arbitraje.

## Prerrequisitos del cierre integral original, distintos de SUS Android

- Decisión escrita sobre corpus/autoridad y uso de los derivados CCD.
- Aprobación académica/ética aplicable, consentimiento y plan de custodia.
- Revisión Git, release, modelos/digests, RAGAS y configuración del juez congelados.
- Banco autorizado: [`benchmark-v1.json`](../../eval/rag-quality/benchmark-v1.json)
  se inventarió en OE5-H0 con 63 casos `primary`, todos `draft` (no recontados en PV-0);
  ese antecedente no acreditaba la condición de
  exactamente 60 casos `primary` aprobados del protocolo.
- Calibración humana del juez completada. Las corridas técnicas existentes sobre 12 casos
  obtuvieron 40/48 coincidencias (0,8333) en dos pasadas, pero sus labels son expectativas
  técnicas, no gold humano ni aceptación del juez.
- Para cerrar el compromiso global multiplataforma: completar iOS físico y los
  recorridos/accesibilidad no acreditados; la ejecución Android técnica existente
  no acredita iOS. No se exige iOS para calcular SUS Android por defecto.
- Para push remoto: contrato backend de registro/revocación, credenciales FCM/APNs y
  development build. Sin ellos DV-13 permanece `BLOCKED`.
- Versión Mobile/backend, current documental CCD y contexto auxiliar ficticio,
  objetivos T04/T05 y condiciones temporales fijados antes de reclutar.

## Orden de ejecución y puertas

### 1. Autorización y congelación

1. Registrar decisiones externas en la tabla de cierre.
2. Capturar commit, `git status`, release, manifests/hashes, modelos/digests y hardware.
3. Verificar separación: estudio UX con cuentas ficticias, documentación CCD
   seleccionada del producto y módulos auxiliares ficticios; revisión documental
   con revisores propios sobre el subconjunto autorizado. No usar demo como fallback.
4. Crear un identificador de corrida y una carpeta de evidencia privada. No guardar
   contraseñas, tokens, contactos ni consentimientos en Git.

Puerta: para cada bloque deben existir sus autorizaciones y campos obligatorios.
Si falta uno, ese bloque no se ejecuta. La revisión académica/consentimiento/freeze
sí bloquea reclutamiento SUS; la aprobación de banco/juez bloquea RAGAS final.
No confundir una puerta global pendiente con un requisito añadido al SUS Android.

### 2. Revisión humana del banco OE1

Usar, en este orden:

1. [`annotation-guidelines.md`](../../eval/rag-quality/annotation-guidelines.md).
2. [`benchmark-v1.json`](../../eval/rag-quality/benchmark-v1.json).
3. `node eval/rag-quality/review-bank.mjs` según
   [`README.md`](../../eval/rag-quality/README.md).
4. Actas independientes A/B y arbitraje de cada desacuerdo.

Por caso se decide: pertinencia al alcance, claridad, respuesta de referencia, contextos,
locator/hash, tipo de pregunta y ausencia de información no autorizada. El coordinador debe
congelar exactamente la cardinalidad y splits exigidos por el protocolo; no elimina tres
casos solo para alcanzar 60 sin decisión humana documentada.

Evidencia: banco aprobado con SHA-256; tabla de decisiones por ID; conteos por documento,
tipo y split; desacuerdos y resolución; revisión de autoridad CCD.

### 3. Calibración del juez

1. Completar
   [`judge-calibration-human-review-template-v1.json`](../../eval/rag-quality/judge-calibration-human-review-template-v1.json)
   con labels humanos y acta, sin copiar los labels técnicos como si fueran humanos.
2. Fijar modelo/revisión/runtime, RAGAS, temperatura, parámetros, seed solo si está
   soportada y regla de discrepancia.
3. Ejecutar dos pasadas independientes de los 10–15 casos. Si la conclusión respecto de
   aceptabilidad difiere, ejecutar la tercera prevista.
4. El responsable académico acepta, rechaza o cambia el juez **antes** del baseline.

Evidencia: input/hash, outputs por caso, configuración completa, comparación con gold
humano, decisión y firma/fecha. La cifra 0,8333 técnica existente se conserva como
diagnóstico, no sustituye esta puerta.

### 4. Baseline de recuperación y RAGAS

1. Verificar banco `frozen`, release/contextos resolubles y ausencia de cambios locales no
   explicados.
2. Ejecutar primero retrieval y luego el adaptador RAGAS conforme a
   [`eval/rag-quality/README.md`](../../eval/rag-quality/README.md).
3. No cambiar embedding, dimensión, distancia, `top_k`, chunking, prompt, generador o
   juez durante el baseline.
4. Reportar resultados por caso, medias, intervalos bootstrap descriptivos, errores,
   timeouts, casos inválidos y las dos pasadas del juez.
5. Comparar literalmente con los targets OE1: faithfulness ≥0,80; context precision
   ≥0,80; context recall ≥0,75; answer relevancy ≥0,80; MRR ≥0,70.

Evidencia: comando, stdout/stderr saneados, JSON completos, SHA-256, entorno, release,
modelos, denominadores e intervalos. Un target fallido se reporta como `FAIL`; no se hace
tuning silencioso. Cualquier tuning crea comparación pre/post y usa la reserva según el
protocolo.

### 5. Validación física Mobile

Para completar el compromiso original, usar el antecedente
[`oe5-device-validation-plan.md`](../../eval/mobile/oe5-device-validation-plan.md)
y contrastarlo con las [ejecuciones CCD/Android posteriores](../../eval/mobile/results/ccd-current-mobile-validation.md).
No ejecutar de nuevo toda esa matriz como preparación de SUS. iOS físico y
casos no acreditados siguen pendientes del cierre global. Por dispositivo/build
conservar estados reales y evidencia saneada. Un export iOS no acredita ejecución
física; una notificación local no cuenta como push remoto.

Orden recomendado dentro de cada plataforma: sesión/login; chat/cita/artefacto; historial;
calendario/progreso/anuncios sintéticos; recordatorios locales; 401/403/409/503/red;
separación CCD autenticada; accesibilidad; push solo si la puerta de credenciales está
resuelta.

### 6. Cinco tareas y SUS

Ejecutar sin cambios oportunistas el
[`protocolo OE5`](../../eval/mobile/oe5-student-validation-protocol.md):

| Tarea | Recorrido |
| --- | --- |
| T01 | Login ficticio, cierre/reapertura y recuperación de sesión |
| T02 | Tres pilares de Competencias Digitales desde documentación CCD, cita y apertura de fuente |
| T03 | Historial, reapertura y conservación de respuesta/cita |
| T04 | Calendario ficticio: evento único congelado, fecha/hora y filtro de categoría |
| T05 | Progreso y anuncios ficticios: curso/anuncio únicos congelados, porcentaje y filtro |

Muestra/criterios originales: ≥10 estudiantes UNAB elegibles, al menos tres programas y
máximo 50 % de un programa; completación global estrictamente >85 %; SUS medio
estrictamente >70; ningún SUS individual <50. Con 10 × 5 tareas, >85 % exige al menos
43/50 éxitos.

El moderador no guía. El observador conserva `SUCCESS`, `FAIL` o `BLOCKED`, tiempo,
errores, asistencia y desviaciones. El SUS de diez ítems se administra inmediatamente;
un formulario incompleto es `NE` según el protocolo, no se imputa después.
El denominador primario incluye todas las tareas iniciadas, también BLOCKED;
informar planificadas `5 × n`, faltantes y bloqueos. Registros incompletos impiden
declarar aceptación. [Analizador reproducible](../../eval/mobile/analyze-human-validation.mjs)
y fixtures artificiales son preparación metodológica, no resultados humanos.

AC10 exige además entrevistas/caracterización de 10–15 estudiantes y coordinador;
no lo satisface automáticamente SUS. Reutilización de participantes para ese fin:
**REQUIERE DECISIÓN ACADÉMICA ANTES DEL RECLUTAMIENTO**. No añadir preguntas al SUS.

### 7. Análisis y cierre

1. Bloquear el archivo crudo y calcular mediante script reproducible o doble revisión.
2. Publicar numeradores/denominadores, distribución, mediana/rango, fallos técnicos,
   fallos de usabilidad y bloqueos por separado.
3. Contrastar cada target sin redondear para convertir un fallo en éxito.
4. Vincular hallazgos con OE1/OE5/OE6 y actualizar la matriz; no alterar evidencia previa.
5. Obtener las aceptaciones que correspondan. El equipo técnico no firma por CCD,
   estudiantes, director ni operación UNAB.

## Checklist de evidencia por sesión

- ID seudónimo y elegibilidad; consentimiento almacenado por separado.
- Fecha/hora Bogotá, moderador, observador, dispositivo/OS, build/hash y red.
- Commit, backend, API v2, current documental, release auxiliar, modo
  `ccd_authenticated` y desviaciones; sin UID, password o serial.
- Inicio/fin monotónicos, resultado, errores, asistencia y observación por tarea.
- Diez respuestas SUS y cálculo individual; nunca contraseña, token, UID asignado o PII.
- Capturas/logs saneados con identificador de sesión y hash.
- Incidente técnico, decisión de repetición y razón; la corrida original se conserva.

## Salidas esperadas, aún vacías

Los CSV humanos siguen vacíos. El inventario siguiente corresponde al cierre
integral y no impone todos sus bloques como puertas nuevas del SUS Android.

- Acta de autoridad documental y benchmark congelado.
- Acta de calibración/aceptación del juez.
- Reporte retrieval/RAGAS final.
- Matriz DV-01–DV-14 por Android/iOS físico.
- Dataset seudonimizado de tareas/SUS y reporte agregado.
- Decisión académica final por OE y lista explícita de pendientes no aceptados.
