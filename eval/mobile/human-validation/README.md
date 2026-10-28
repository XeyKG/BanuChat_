# Instrumentos OE5-H0 — archivo histórico, no ejecutado

> **NO EJECUTADO — FUERA DE ALCANCE — PENDIENTE DE DECISIÓN DEL DIRECTOR.**
> No reclutar, no completar estos instrumentos ni ejecutar SUS. Los criterios
> originales siguen **NO CUMPLIDOS**; la única alternativa considerada es la del
> autor y está **PROPUESTA / PENDIENTE DE APROBACIÓN**. Ver la
> [decisión canónica](../../../docs/academic/oe5-human-validation-closure-decision.md).

Estado histórico `READY_FOR_ACADEMIC_REVIEW`, no autorización vigente para
reclutamiento ni aceptación humana.
Rebaseline [PV-0](../results/product-validation-ux-closure-pv0.md), 28/10/2026: CCD 1.4
técnico current; T04 **PENDIENTE DE VENTANA DE SESIONES** y contexto T05 por congelar.
No entregar la hoja con placeholders. No cambiaron cinco tareas, SUS, CSV, analyzer
ni sus criterios; el identificador base OE5-H0-CCD-1.0 se conserva.
[Protocolo propuesto vigente](../oe5-student-validation-protocol.md),
[readiness](../results/oe5-human-validation-readiness.md).

No existe siguiente paso autorizado de reclutamiento o SUS.

## Archivos y uso futuro

PV-2 prepara un paquete breve, sin resolver decisiones externas ni completar el
freeze: [hoja para decisión académica](academic-review-decision-sheet.md),
[consentimiento para revisión](consent-review-draft.md) y
[plan de manejo de datos](data-handling-review.md).
El nuevo consentimiento es una propuesta para revisión, no una versión aprobada;
el draft anterior permanece como antecedente. Ver el
[informe PV-2](../results/product-validation-ux-closure-pv2.md).

| Instrumento | Uso |
| --- | --- |
| [consent-review-draft.md](consent-review-draft.md) | Propuesta PV-2 para revisión; NOT APPROVED FOR USE. [Draft anterior](consent-draft.md) conservado. |
| [participant-task-sheet.md](participant-task-sheet.md) | Solo instrucciones y T01–T05, sin respuestas ni pistas. |
| [moderator-guide.md](moderator-guide.md) | Script literal, cronometraje, no asistencia, incidentes y cierre. |
| [sus-questionnaire.md](sus-questionnaire.md) | Diez ítems originales y escala 1–5; sin preguntas nuevas. |
| [session-template.csv](session-template.csv) | Solo cabecera, ninguna sesión inventada. |
| [sus-template.csv](sus-template.csv) | Solo cabecera, ningún cuestionario respondido. |
| [freeze-template.md](freeze-template.md) | Completar aprobación, entorno, cuentas/contexto y targets antes de P01. |
| [target-candidates.md](target-candidates.md) | Candidatos técnicos y referencia del moderador; no son objetivos ya congelados para humanos. |

Guardar futuros datos reales fuera de Git en la ubicación privada aprobada.
No hay directorio de resultados humanos poblado. Contactos y consentimientos se
guardan separados de CSV, nunca como columnas extra ni mapas de UID/password.

## Diccionario de CSV

Una fila de sesiones representa una tarea iniciada. No repetir PID/tarea en la
tanda primaria; otra sesión se documenta y analiza en archivo/tanda separados,
sin reemplazar la primera. Cabeceras exactas, en cualquier orden; UTF-8, CSV con
comillas dobles para comas/saltos de línea y duplicación de comillas internas.

| Columna | Regla |
| --- | --- |
| participant_id | P01…P09, P10…Pnn, sin nombre, UID o password. |
| program_code | Categoría aprobada, A–Z inicial y hasta 32 caracteres A–Z/0–9/_/-. Misma por participante; fuera del chat. |
| eligible | TRUE, atestación del moderador tras verificación privada; no sustituye revisión académica. FALSE es entrada no analizable, no exclusión favorable automática. |
| consent_confirmed | TRUE únicamente tras consentimiento por el procedimiento aprobado. |
| task_id | T01–T05. |
| status | SUCCESS, FAIL o BLOCKED. |
| seconds | Número finito no negativo, decimal con punto; tiempo real observado. |
| errors | Entero no negativo; autocorrecciones sin ayuda se registran sin forzar FAIL. |
| assistance | Entero de pistas de navegación; si >0 no puede ser SUCCESS. Aclaración lingüística neutral va en observation. |
| technical_issue | NONE, NETWORK, CRASH, API_UNAVAILABLE, DEVICE, OTHER. BLOCKED no acepta NONE. |
| observation | Nota minimizada, sin identificadores ni datos personales; explicar dependencia/desviación. No se copia al JSON agregado. |
| SUS item_1…item_10 | Entero 1–5 o vacío. Una sola fila por PID; nada de puntajes calculados dentro del crudo. |

Fila SUS ausente o ítem vacío → NE, no imputación. SUS sin PID presente en sesiones
es error. Falta de tareas se reporta con IDs y número planificado `5 × n`; no
declarar aceptación con registros incompletos. TRUE no demuestra por sí mismo
elegibilidad o consentimiento: el operador debe comprobar sus actas privadas.
Conciliar también todos los PIDs con el registro privado de elegibles/consentidos:
dos CSV no permiten detectar a alguien omitido por completo en ambos. El n del
JSON corresponde a participantes presentes en tareas con las atestaciones; no
es un censo verificado automáticamente. Una discrepancia impide cerrar el análisis.

## Analizador sin dependencias adicionales

```text
node eval/mobile/analyze-human-validation.mjs session.csv sus.csv --output analysis.json
node --test eval/mobile/analyze-human-validation.test.mjs
```

Los datos humanos solo podrán analizarse después de las puertas del protocolo.
Ahora únicamente se ejecutan tests/fixtures y la lectura de plantillas vacías:

```text
node eval/mobile/analyze-human-validation.mjs eval/mobile/human-validation/fixtures/fixture-sessions-43-of-50.csv eval/mobile/human-validation/fixtures/fixture-sus-75.csv --fixture
```

El JSON de fixture dice `ARTIFICIAL_ANALYZER_FIXTURE_NOT_HUMAN_DATA`. Nunca son
participantes simulados presentados como evidencia. La plantilla vacía produce
`NO_DATA`, no un estudio aprobado ni fallido. Mismo input genera mismo JSON,
sin timestamps variables; conserva SHA-256 de ambos inputs. --output no puede
sobrescribir los CSV crudos. Un error de esquema genera exit distinto de cero.

El denominador primario es iniciado, incluidos BLOCKED, conforme al protocolo
anterior. El JSON muestra planificadas, iniciadas, sin registro y bloqueos; no
excluye estos últimos. Mediana/mínimo/máximo principal incluyen todos los estados;
los tiempos de SUCCESS se rotulan separadamente. También muestra errores,
asistencia, programas, individuales SUS, media/mínimo válidos y NE.

Condiciones `MET`/`NOT_MET`/`NE`: ≥10, ≥3 programas, ≤50 % de uno, éxito >85 %,
SUS medio >70 y cada individual ≥50, con registros completos. `MET` es solo una
comprobación de umbrales, nunca aceptación académica ni cierre OE5. Un SUS
conocido <50 sigue NOT_MET aunque haya formularios NE. La media disponible no
permite aprobar faltantes. Las comparaciones usan numeradores sin redondeo.

Las fixtures cubren 43/50, 42/50, media exactamente 70, mínimo 50, condición 49,
faltantes, duplicados, errores de schema, diversidad/concentración y BLOCKED.
**49 no es un puntaje obtenible de diez ítems SUS enteros**: el cálculo avanza en
2,5. Se prueba 49 directamente en el predicado de aceptación, sin fabricar un
cuestionario que produzca ese valor. Todo parámetro/CSV artificial se llama fixture-*.
