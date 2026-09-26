# Revisión humana y aprobación del dataset v1

Estado: **BanuChat Synthetic Dataset v1 — approved / frozen for ingestion**.
Aprobación humana explícita registrada para el proyecto BanuChat el 2026-09-26.
Esta matriz registra la aceptación editorial y la aprobación para futura ingesta
del prototipo. Es documentación, no contenido funcional: no pertenece al inventario
del manifest y no contiene preguntas RAGAS ni respuestas gold.

Los 18 archivos funcionales y 76 items lógicos de manifest.json constituyen v1
congelado para ingesta. El contenido sigue siendo 100 % sintético; la aprobación
corresponde al proyecto BanuChat, no a una validación institucional de UNAB/CCD.
No implica ingesta a PostgreSQL ni demuestra métricas RAG, RAGAS, rendimiento o
usabilidad. No se atribuyen nombres, firmas, cargos ni comités de aprobación.

## Matriz de aceptación editorial

| Aspecto | Material a revisar | Comprobación humana | Estado |
| --- | --- | --- | --- |
| Coherencia global | Los 12 documentos y los seis catálogos | Todo pertenece al Programa Demo de Aprendizaje Digital; los procedimientos no prometen operaciones implementadas. | Aprobado |
| Claridad | doc-001 a doc-010 | Términos comprensibles, secciones útiles y variación natural de inscripción/registro, retiro/cancelación, avance/progreso y soporte/ayuda. | Aprobado |
| Realismo sin dependencia real | Todo contenido funcional | Situaciones plausibles pero totalmente inventadas, sin personas, instituciones, contactos, ubicaciones o procedimientos reales. | Aprobado |
| Contradicciones de reglas | doc-002 a doc-005, cursos y progreso | Inscripción no equivale a participación; evidencia no actualiza progreso; closed conserva asociaciones previas y archived referencias completadas. | Aprobado |
| Duplicación de fuentes | Documentos frente a catálogos | Las remisiones no copian fechas ni progreso; cada hecho tiene una autoridad identificable. | Aprobado |
| Suficiencia documental | doc-001 a doc-010 | doc-001 a doc-009 conservan secciones y contenido sustantivo; doc-010 es deliberadamente más breve, orientador y sin reglas nuevas. Valorar utilidad y variación natural, no uniformidad de longitud. | Aprobado |
| Guías completas | doc-011 y doc-012 | Aproximadamente 900–1400 palabras; preparación, desarrollo y cierre comprensibles como conjunto; full_document sin fragmentación. | Aprobado |
| Distribución de estados | courses.json y progress.json | Los tres estados de cada dominio tienen usos coherentes; cada perfil posee más de un estado y los pares no se duplican. | Aprobado |
| Relaciones temporales | events.json, announcements.json y progress.json | Ningún curso archived tiene course_session; progreso anterior al 2026-09-26 e independiente del calendario; ventanas variadas, finales ordenados y cinco cierres enlazados. | Aprobado |
| Límites y evidencia insuficiente | README y corpus | Las categorías deliberadamente ausentes no se reconstruyen mediante inferencias; no hay promesas de soporte, inscripción o certificación reales. | Aprobado |
| Identidad y procedencia | Manifest y catálogo documental | 18 archivos, 76 items, claves/localizadores correctos y hashes recalculados tras cualquier edición. | Aprobado |
| Aprobación para futura ingesta | Contenido v1 identificado por manifest.json | Aprobación humana explícita registrada el 2026-09-26 para el proyecto BanuChat; no equivale a ingesta ejecutada ni se basa solo en validadores. | Aprobado |

## Mapa de autoridad documental

| Documento | Autoridad principal |
| --- | --- |
| doc-001 | Alcance y recorrido del programa demo |
| doc-002 | Inscripción, cambios y retiro de asociaciones |
| doc-003 | Preparación, participación y límites de asistencia |
| doc-004 | Interpretación del progreso y finalización |
| doc-005 | Preparación y revisión cualitativa de evidencias |
| doc-006 | Semántica de consulta del calendario |
| doc-007 | Interpretación de convocatorias y vigencia |
| doc-008 | Descripción segura de incidencias y límites de ayuda |
| doc-009 | Uso responsable de materiales ficticios |
| doc-010 | Orientación hacia fuentes; no crea reglas alternativas |
| doc-011 | Secuencia íntegra de actividad integradora |
| doc-012 | Secuencia íntegra para sesiones prácticas |

La revisión editorial aceptó que las referencias cruzadas aportan contexto
sin dominar cada documento ni producir respuestas genéricas repetidas. La búsqueda
automática de términos no demuestra por sí sola originalidad, utilidad o ausencia
de toda semejanza con datos reales. No se atribuyen métricas RAGAS/SUS a esta revisión.

Toda modificación posterior del contenido funcional debe producir una nueva revisión
candidata, conservar la versión v1 congelada y pasar validación y aprobación propias.
En esa nueva revisión, conservar claves, revisar relaciones y recalcular manifest;
no alterar silenciosamente v1. Si exige alterar un contrato congelado, detener la preparación
y solicitar revisión explícita; no adaptar schemas ni persistencia silenciosamente.

## Correcciones aplicadas tras la revisión directa

| Hallazgo | Corrección realizada | Estado de aceptación |
| --- | --- | --- |
| Cursos archived con sesiones futuras | event-011 pasa a course-004 y event-012 a course-008; horarios y duraciones distintos, sin cambiar claves ni conteos. | Aprobado |
| Tiempos de progreso futuros y uniformes | Inicios/finales variados entre julio y septiembre, anteriores al 2026-09-26; se preservan pares, porcentajes y distribución de estados. | Aprobado |
| Exceso de contenido técnico/meta | Ajustes localizados en doc-001 a doc-009: menos detalles de conversaciones, versiones internas y preparación del corpus; más orientación funcional ficticia. | Aprobado |
| FAQ duplicaba explicaciones | doc-010 utiliza dudas, respuestas breves y remisiones a documentos/secciones existentes; no define reglas nuevas. | Aprobado |

Los cuatro hallazgos fueron revisados y aceptados tras sus correcciones como parte
de la aprobación humana explícita de v1. Las guías doc-011 y doc-012 no fueron
modificadas. El cierre documental previo solo actualizó README.md y HUMAN_REVIEW.md: no cambió
manifest.json, sus hashes ni el contenido funcional, y no ejecuta ingesta.

## Normalización final de estado de v1

Se mantiene la aprobación humana explícita del proyecto BanuChat registrada arriba.
Se eliminan las etiquetas candidate de los metadatos documentales: los doce
version_label pasan a v1. En doc-006 se sustituye únicamente «En esta candidata»
por «En esta versión». No se modifican reglas, hechos, relaciones ni alcance.
Los README de subdirectorios reflejan el estado aprobado para ingesta.
Solo se recalculan los hashes del catálogo documental y de doc-006, incluyendo
el hash del item lógico de este último; las 18 entradas físicas y 76 lógicas
conservan sus identidades, rutas y localizadores.

La eliminación de data/synthetic.zip es limpieza intencional de una copia
redundante, no eliminación de contenido funcional. data/synthetic/ es la única
fuente de verdad versionada; no se restaura ni se crea otro ZIP.
Esta normalización autorizada no ejecuta ingesta ni constituye validación institucional.
