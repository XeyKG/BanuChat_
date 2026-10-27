# BanuChat — OE5-H0: readiness de validación humana y SUS

27 de octubre de 2026, America/Bogota. HEAD inicial esperado y observado:
`5ed14608a9086b59bc880262552ccb2185944d3f`, árbol limpio al comenzar.
Preparación metodológica exclusivamente; sin commit ni push.

## Qué cambió

El [protocolo OE5-H0-CCD-1.0](../oe5-student-validation-protocol.md) sustituye para
el estudio propuesto la obligación de release documental sintética y T02 sobre
reportar una incidencia. Ahora usa `ccd_authenticated`, REST v2, documentación
CCD current y progreso/calendario/anuncios ficticios con cuenta ficticia.
T02 pregunta por los tres pilares y solicita abrir una fuente. No evalúa memoria
académica ni pide datos personales o decisiones sobre normas.

Se marcaron como antecedentes los cortes históricos; no se reescribieron sus
resultados. El protocolo anterior se conserva en Git y en una copia privada de
preparación. Se actualizaron paquete final, checkpoint y trazabilidad académica
para distinguir compromiso original, estado técnico, instrumento propuesto y
pendientes institucionales. No se cambió producto para preparar el estudio.

## Qué no cambió

- ≥10 estudiantes UNAB elegibles, 18+, español, Android básico, sin participación
  en implementación; ≥3 programas, máximo 50 % de uno; muestra pequeña intencional.
- Exactamente cinco tareas, límites 3/8/4/5/5 minutos, moderación sin pistas.
- Diez ítems SUS con texto conservado, enteros 1–5; impares −1, pares 5−respuesta,
  suma ×2,5; faltante → NE, sin imputación.
- Umbrales: completación >85 %, SUS medio >70, cada individual ≥50; con 10×5,
  mínimo 43 SUCCESS de 50. No redondear 85 % o 70 para aprobar.
- Privacidad, credenciales ficticias privadas, ningún expediente real y ninguna
  autorización institucional supuesta. La app se evalúa, no el estudiante.
- Denominador primario anterior: todas las tareas iniciadas por elegibles/consentidos,
  incluidos BLOCKED; faltantes y planificadas se muestran y no habilitan aceptación.

## Qué está preparado

| Instrumento | Estado |
| --- | --- |
| [Consentimiento](../human-validation/consent-draft.md) | BORRADOR; responsables, contacto, revisión, custodia/conservación/retiro pendientes. |
| [Hoja del participante](../human-validation/participant-task-sheet.md) | Cinco tareas, sin soluciones, botones ni umbrales. Títulos candidatos para confirmar antes de P01. |
| [Guía del moderador](../human-validation/moderator-guide.md) | Script literal, consentimiento, entrega privada, reloj, no asistencia, incidentes, SUS y limpieza. |
| [SUS](../human-validation/sus-questionnaire.md) | Diez ítems originales separados de la hoja de tareas. |
| [Sesiones CSV](../human-validation/session-template.csv) / [SUS CSV](../human-validation/sus-template.csv) | Solo cabeceras; cero registros humanos. Sin nombres/UID/password. |
| [Freeze](../human-validation/freeze-template.md) | Plantilla; no manifiesto operativo aprobado/completado. |
| [Objetivos](../human-validation/target-candidates.md) | Candidatos del contexto auxiliar existente, verificados técnicamente; misma selección para todos, reconfirmación temporal pendiente. |
| [Analizador](../analyze-human-validation.mjs) y [pruebas](../analyze-human-validation.test.mjs) | Node nativo, sin dependencia añadida; validación de entradas, denominadores, faltantes, métricas y condiciones. |
| [Diccionario](../human-validation/README.md) | Schema, privacidad, comandos y frontera de interpretación. |

El entorno técnico ya tenía autenticación v2, fuentes/historial y recorridos
Android del agente, acreditados en [Mobile CCD](ccd-current-mobile-validation.md)
y [regresión diagnóstica](../../rag-quality/results/ccd-mobile-diagnostic-fee-regression.md).
Es evidencia técnica histórica identificada; no son sesiones ni aprobación humanas.

## Comprobación técnica focalizada de T02 y objetivos

Se reutilizó la API habitual ya activa en loopback 3004, sin iniciar otro backend.
Una sola conversación de ensayo, por los adaptadores Mobile reales, recibió:
«La ruta se organiza en tres pilares: Competencias Digitales Básicas, Analítica y
Contenido Digital, y Tecnologías Transformativas.». Se descargó el artefacto
documental v2, se comprobó historial y se eliminó la conversación; logout confirmado.
La etiqueta recibida fue `route:structure`: observación de presentación conservada
para revisión, sin retocar producto ni afirmar que humanos la comprendieron.
No se identificó un cambio funcional imprescindible para que T02 sea ejecutable.

Current observado: `f01c1c37-2d3f-4bc7-8940-fe724eb71c9a`, evidencia CCD.
No se publicó release ni se cambió current, corpus, bindings o embeddings.
Preflight no es una sesión humana ni una repetición del recorrido Android.

T04 candidato: «Sesión demo: secuencias de automatización», 28/10/2026 a las
18:15 Bogotá, categoría Sesiones. T05: «Búsqueda y verificación de información»,
completado al 100 %, y «Actualización de material de orientación», Vigentes.
Todos son datos ficticios. Release auxiliar observada:
`af157a78-4c51-49c0-b8cc-509257d89f1e`, distinta de la documental.
La ventana real de Calendario es el día actual hasta +29 días: el objetivo existe
hoy, pero no sirve para una tanda cuyo día inicial de ventana sea posterior al
28/10. No hay calendario de sesiones humanas acordado. Reconfirmar objetivos y
misma asignación de contexto antes de P01; no seleccionar otros tras resultados.

## Análisis y pruebas realmente ejecutadas

`node --test eval/mobile/analyze-human-validation.test.mjs`: **13/13**, sin fallos
ni omitidas, sobre fixtures artificiales. Se cubren 43/50 frente a 42/50, media
exactamente 70, individual 50, predicado 49, SUS faltante/NE, duplicados, estado/
segundos/ítems inválidos, diversidad, concentración, asistencia, tiempos, CSV con
comillas, BLOCKED, incompletos, salida reproducible y CLI sin sobrescribir crudo.

49 no puede obtenerse de diez ítems SUS enteros: el score avanza en 2,5. Esa
frontera se prueba directamente en el predicado, sin inventar respuestas que
la produzcan. Fixtures se llaman `fixture-*`, están fuera de resultados humanos
y su JSON está rotulado **ARTIFICIAL_ANALYZER_FIXTURE_NOT_HUMAN_DATA**.

Las plantillas vacías producen NO_DATA. El script calcula n declarado presente,
programas, numeradores/denominadores, estados, éxito por tarea/global, tiempos
de todos los estados, errores, asistencia, SUS individuales/media/mínimo y NE.
No determina elegibilidad real o aprobación; el registro de elegibles/consentidos
debe conciliarse externamente porque dos CSV no detectan un PID ausente de ambos.
Una discrepancia bloquea la interpretación final, no se excluye favorablemente.

Validaciones finales: enlaces locales/estructura Markdown razonables y
`git diff --check`. No se repitieron tests/backend/RAG/Android ni se ejecutó estudio.

Se verificaron **147 enlaces locales en 15 Markdown**, sin enlaces rotos,
fences balanceados, diez ítems SUS idénticos al protocolo anterior, cinco tareas
sin soluciones en la hoja y CSV crudos con solo cabecera.

## Archivos de esta preparación

Se actualizaron `eval/mobile/oe5-student-validation-protocol.md`, `eval/mobile/README.md`,
`docs/validation/final-human-validation-package.md`,
`docs/transition/banuchat-oe5-checkpoint.md` y los tres documentos académicos
`oe1-oe6-final-traceability.md`, `plan-evaluacion-academica-prototipo.md` y
`plan-ejecucion-alcance-original.md`. Las notas nuevas explicitan precedencia y
conservan el cuerpo histórico, sin recalificar pruebas anteriores.

Se añadieron este readiness, `eval/mobile/analyze-human-validation.mjs` y su
prueba `.test.mjs`, y `eval/mobile/human-validation/`: diccionario, consentimiento,
hoja, guía, SUS, dos CSV vacíos, freeze, candidatos y tres fixtures explícitas.
Son **22 archivos** de documentación, instrumentos y análisis; ningún archivo de
`backend/`, `mobile/src/`, `infra/` o corpus se modificó.

## Qué sigue bloqueando la ejecución

**PENDIENTE DE CONFIRMACIÓN POR EL RESPONSABLE ACADÉMICO: procedimiento/revisión aplicable antes del reclutamiento.**

Además: consentimiento/contacto/custodia/conservación/retiro revisados; designación
de roles; asignación privada de cuenta/contexto común sin crear ni cambiar cuentas
en H0; disponibilidad del Android/red; ventana de sesiones y freeze operativo con
targets compatibles. Una plantilla rellenada parcialmente no es aprobación.

iOS, push remoto, accesibilidad completa, autoridad documental, OE1 RAGAS y OE6
producción/TLS/servidores UNAB siguen como brechas globales; no se agregan como
puertas automáticas de SUS Android sin decisión académica expresa. Usabilidad/SUS
y revisión documental humana son instrumentos distintos. AC10 entrevistas/
caracterización de 10–15 estudiantes y coordinador no se cumple automáticamente
con SUS; reutilización de participantes requiere decisión anterior al reclutamiento.

## Qué no se ha hecho

Nadie reclutado/contactado/evaluado, ningún consentimiento real, ninguna sesión,
ninguna respuesta SUS real, ningún resultado humano simulado presentado como real.
No se aprobaron procedimientos ni se atribuyó aval CCD/UNAB o aceptación a estudiantes.
No se tocaron backend, RAG, autenticación, Mobile funcional, infra o datasets.
No hubo commit/push. Evidencia técnica de preparación ignorada por Git:
`data/ccd/local/oe5-h0-preparation/`; sin secretos ni datos de participantes.

## Decisión

**READY_FOR_ACADEMIC_REVIEW.** Instrumento de validación humana reconciliado con
el producto actual y preparado para revisión académica. Ningún participante
reclutado ni evaluado. Reclutamiento/aceptación humana pendientes; no OE5 PASS.
