# BanuChat — decisión de cierre de validación humana OE5

**Fecha:** 28 de octubre de 2026 (America/Bogota)  
**HEAD base:** `edfddec21bfeaccf12d29bafbd77f9c30e6a9010`  
**Estado canónico del paquete:** **NO EJECUTADO — FUERA DE ALCANCE — PENDIENTE DE DECISIÓN DEL DIRECTOR**.

Esta decisión sustituye cualquier lectura de los instrumentos OE5-H0 como una
autorización vigente para reclutar, convocar o ejecutar sesiones SUS. Conserva
el paquete histórico completo como evidencia de preparación metodológica; no
autoriza su uso ni elimina artefactos.

## A. Criterio original preservado

El criterio original de OE5 permanece históricamente sin sustitución automática:

- mínimo 10 estudiantes reales UNAB;
- cinco tareas;
- completación mayor a 85 %;
- SUS promedio mayor a 70;
- ningún SUS individual menor a 50.

## B. Estado real

Los criterios anteriores están **NO CUMPLIDOS**. No se reclutaron estudiantes ni
terceros; el autor es el único evaluador de tareas de usuario. No se ejecutó SUS
con participantes. No existen consentimientos respondidos, sesiones, puntajes
SUS ni resultados humanos de terceros. Las fixtures y pruebas automatizadas
existentes no son datos humanos y no cambian este estado.

## C. Decisión actual de no reclutamiento

No se reclutarán estudiantes ni terceros y no se ejecutará el protocolo humano
ni SUS. Los documentos, plantillas, cuestionario, CSV vacíos y guías se conservan
sin completar como instrumentos históricos. Ninguna mención histórica a
reclutamiento, participantes o ejecución SUS constituye un siguiente paso
autorizado.

## D. Alternativa metodológica propuesta — no aprobada

Se propone, exclusivamente para decisión posterior del director, que el autor
ejecute T01–T05 en Android físico y registre tiempo, éxito/fallo, errores,
asistencia y bloqueos; que realice una inspección heurística autoaplicada; y que
presente la evidencia automatizada existente. Esta alternativa está
**PROPUESTA / PENDIENTE DE APROBACIÓN**. No es SUS, no es una prueba con la
población objetivo y no permite afirmar usabilidad validada con estudiantes.

## E. Limitaciones

La alternativa propuesta no satisface el criterio original, no aporta muestra
UNAB independiente, no permite obtener resultados SUS humanos y no acredita
aceptación institucional. La evidencia técnica, las fixtures y los recorridos del
autor siguen separados de una validación de usabilidad con estudiantes.

## F. Decisión pendiente del director

Corresponde al director decidir si conserva los criterios originales como no
cubiertos, si aprueba expresamente la alternativa como evidencia limitada, o si
define otra salida académica. Hasta esa decisión, no hay reclutamiento, ejecución
de SUS ni resultado humano que producir.

## Checkpoint documental

- Archivos modificados: este documento; `eval/mobile/README.md`, el protocolo,
  el readiness y los diez Markdown de `eval/mobile/human-validation/`; y
  `docs/academic/final-external-decisions-and-schedule.md`,
  `docs/academic/oe1-oe6-final-traceability.md`,
  `docs/transition/banuchat-oe5-checkpoint.md` y
  `docs/validation/final-human-validation-package.md`.
- Decisión aplicada: cierre de validación humana sin reclutamiento ni SUS.
- Criterios OE5 originales: preservados y **NO CUMPLIDOS**, incluido SUS.
- Archivos eliminados: cero.
- Resultados humanos generados: cero.
- Validación de cierre: `git diff --check` pasó sin salida. Las búsquedas
  `rg -i -l` para `recruit`, `reclut`, `SUS`, `participant`, `participante`,
  `READY_FOR_RECRUITMENT` y `READY_FOR_ACADEMIC_REVIEW` fueron ejecutadas sobre
  `eval/mobile` y los documentos OE5 relevantes; sus apariciones conservan
  contexto histórico, de no ejecución o de criterio no cumplido. La búsqueda de
  frases que presentarían reclutamiento/SUS como autorización vigente no devolvió
  resultados. Los diez Markdown de `human-validation/` contienen el rótulo de
  cierre.
