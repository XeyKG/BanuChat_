# Validación funcional de Mobile

## Estado vigente — OE5-H0, 27 de octubre de 2026

El [protocolo vigente propuesto](oe5-student-validation-protocol.md) prepara cinco
tareas y SUS sobre `ccd_authenticated` / REST v2: documentación CCD current y
calendario/progreso/anuncios ficticios, con cuentas ficticias. Sustituye para este
estudio la exigencia anterior de release documental sintética y T02 sobre incidencias.
Muestra, cuestionario, umbrales, moderación y privacidad se conservan.

Estado **READY_FOR_ACADEMIC_REVIEW**, no READY_FOR_RECRUITMENT ni OE5 PASS.
**PENDIENTE DE CONFIRMACIÓN POR EL RESPONSABLE ACADÉMICO: procedimiento/revisión aplicable antes del reclutamiento.**

[Instrumentos y diccionario](human-validation/README.md),
[analizador reproducible](analyze-human-validation.mjs),
[readiness](results/oe5-human-validation-readiness.md).
No hay participantes, consentimientos obtenidos, SUS ni resultados humanos.
Los CSV con fixture-* son pruebas artificiales del analizador, separados de datos humanos.

La [validación técnica CCD/Android](results/ccd-current-mobile-validation.md) y
la [corrección diagnóstica](../rag-quality/results/ccd-mobile-diagnostic-fee-regression.md)
ya tienen evidencia técnica; no son aceptación de estudiantes. iOS, push remoto,
accesibilidad completa, autoridad documental e infraestructura institucional siguen
separados. No bloquear SUS Android por iOS salvo decisión académica expresa.

## Antecedentes conservados — M7.4 y preparación OE5 del 24 de octubre

El texto siguiente conserva el alcance histórico sintético/LAN/Expo Go y el estado
pendiente en ese corte; no sustituye el protocolo CCD actual ni recalifica M7.4.

`eval/mobile/` conserva instrumentos y, posteriormente, registros independientes
de validación funcional del MVP móvil de BanuChat. El equipo del proyecto realizará
las pruebas en Android físico con Expo Go, consumiendo el API local por LAN privada
y utilizando exclusivamente datos 100 % sintéticos.

El [plan M7.4](m7-4-validation-plan.md) define los casos antes de ejecutarlos.
Sus resultados están pendientes; esta etapa M7.4-A solo prepara el instrumento.
La regla de congelación del plan entra en vigor cuando sea commiteado.

Esta validación técnica no equivale a SUS ni a pruebas formales con usuarios;
no mide satisfacción, facilidad de uso percibida o aceptación. Tampoco prueba
autenticación institucional, producción o despliegue final.

Los antecedentes de integración y el
[checkpoint histórico J3](../integration/results/j3-checkpoint-2026-10-03.md)
permanecen separados y no se atribuyen a M7.4.

El [protocolo OE5](oe5-student-validation-protocol.md) prepara, sin ejecutar, el
estudio posterior con cinco tareas y SUS. Conserva los umbrales académicos, exige
datos sintéticos y diferencia resultados humanos, bloqueos técnicos y push remoto.
No modifica ni recalifica retrospectivamente el plan M7.4 congelado.

El [plan de dispositivo OE5](oe5-device-validation-plan.md) actualiza el instrumento
para autenticación v2, separación CCD, release OE4 y notificaciones, también sin
atribuir resultados mientras no exista una ejecución física registrada.
