# BanuChat — paquete ejecutable de validación humana final

## Estado

Paquete preparado; **no ejecutado**. No existen aprobaciones nuevas, participantes,
revisión humana del banco, resultados RAGAS finales, sesiones SUS ni pruebas físicas
nuevas. Los resultados adversos se conservan y ningún `BLOCKED` se transforma en `PASS`.

La línea base técnica candidata es
`39b6b6221d61bd7aef2ce236dd124c3b11488345`. Antes de una sesión se registra el
commit realmente usado y se congela el árbol; no se asume que siga siendo ese commit.

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

## Prerrequisitos de entrada

- Decisión escrita sobre corpus/autoridad y uso de los derivados CCD.
- Aprobación académica/ética aplicable, consentimiento y plan de custodia.
- Revisión Git, release, modelos/digests, RAGAS y configuración del juez congelados.
- Banco autorizado: [`benchmark-v1.json`](../../eval/rag-quality/benchmark-v1.json)
  contiene hoy 63 casos `primary`, todos `draft`; no cumple todavía la condición de
  exactamente 60 casos `primary` aprobados del protocolo.
- Calibración humana del juez completada. Las corridas técnicas existentes sobre 12 casos
  obtuvieron 40/48 coincidencias (0,8333) en dos pasadas, pero sus labels son expectativas
  técnicas, no gold humano ni aceptación del juez.
- Android e iOS físicos compatibles; build, firma, red y canal local seguro definidos.
- Para push remoto: contrato backend de registro/revocación, credenciales FCM/APNs y
  development build. Sin ellos DV-13 permanece `BLOCKED`.
- Versión Mobile, backend, release sintética y objetivos T04/T05 fijados antes de reclutar.

## Orden de ejecución y puertas

### 1. Autorización y congelación

1. Registrar decisiones externas en la tabla de cierre.
2. Capturar commit, `git status`, release, manifests/hashes, modelos/digests y hardware.
3. Verificar separación: estudio UX solo con cuentas y datos sintéticos; revisión CCD solo
   sobre el subconjunto autorizado; no usar la demo como fallback institucional.
4. Crear un identificador de corrida y una carpeta de evidencia privada. No guardar
   contraseñas, tokens, contactos ni consentimientos en Git.

Puerta: todas las autorizaciones y campos obligatorios existen. Si falta uno, estado
`BLOCKED` y no se recluta ni se ejecuta RAGAS final.

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

Ejecutar [`oe5-device-validation-plan.md`](../../eval/mobile/oe5-device-validation-plan.md)
en Android y iOS físicos. Registrar por dispositivo/build los casos DV-01–DV-14, capturas
saneadas y logs permitidos. Un export iOS no cuenta como iOS físico; una notificación local
no cuenta como push remoto.

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
| T02 | Chat RAG, cita documental y apertura del documento |
| T03 | Historial, reapertura y conservación de respuesta/cita |
| T04 | Calendario, fecha/hora y filtro de categoría |
| T05 | Progreso completado y anuncio bajo el filtro correcto |

Muestra/criterios originales: ≥10 estudiantes UNAB elegibles, al menos tres programas y
máximo 50 % de un programa; completación global estrictamente >85 %; SUS medio
estrictamente >70; ningún SUS individual <50. Con 10 × 5 tareas, >85 % exige al menos
43/50 éxitos.

El moderador no guía. El observador conserva `SUCCESS`, `FAIL` o `BLOCKED`, tiempo,
errores, asistencia y desviaciones. El SUS de diez ítems se administra inmediatamente;
un formulario incompleto es `NE` según el protocolo, no se imputa después.

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
- Commit, backend, API, release, modo `synthetic` o `ccd_authenticated` y desviaciones.
- Inicio/fin monotónicos, resultado, errores, asistencia y observación por tarea.
- Diez respuestas SUS y cálculo individual; nunca contraseña, token, UID asignado o PII.
- Capturas/logs saneados con identificador de sesión y hash.
- Incidente técnico, decisión de repetición y razón; la corrida original se conserva.

## Salidas esperadas, aún vacías

- Acta de autoridad documental y benchmark congelado.
- Acta de calibración/aceptación del juez.
- Reporte retrieval/RAGAS final.
- Matriz DV-01–DV-14 por Android/iOS físico.
- Dataset seudonimizado de tareas/SUS y reporte agregado.
- Decisión académica final por OE y lista explícita de pendientes no aceptados.
