# BanuChat — plan de manejo de datos para revisión

> **NO EJECUTADO — FUERA DE ALCANCE — PENDIENTE DE DECISIÓN DEL DIRECTOR.**
> Archivo histórico: no inicia reclutamiento ni SUS. Ver la
> [decisión canónica](../../../docs/academic/oe5-human-validation-closure-decision.md).

PV-2 · 28/10/2026 · **PROPUESTA PENDIENTE DE DECISIÓN ACADÉMICA; NO IMPLEMENTADA**.
No se crea almacenamiento de participantes, listas de contacto, consentimientos,
resultados humanos ni relaciones de identidad en esta tarea.

**PENDIENTE DE CONFIRMACIÓN POR EL RESPONSABLE ACADÉMICO: procedimiento/revisión aplicable antes del reclutamiento**

## Tres categorías separadas

| Categoría | Naturaleza y mínimo propuesto | Separación y acceso pendientes |
| --- | --- | --- |
| Contacto/reclutamiento | Identificable; únicamente lo necesario para una invitación/coordinación futura por canal aprobado. No se define ni recoge ahora un listado de campos personales. | Nunca mezclar con resultados analíticos. Canal/responsable en AG-03/AG-11; custodio, ubicación privada, acceso y retención por confirmar. |
| Consentimiento | Puede identificar a la persona según el mecanismo que se apruebe. No se presume firma ni formulario institucional obligatorio. | Custodia separada de contacto y resultados, según AG-02/AG-04; no adjuntar constancias identificables a CSV, Git o chat. |
| Dataset de resultados | Seudónimo PID; exclusivamente los campos de las dos plantillas existentes. | Custodio/ubicación privada y accesos por rol en AG-05; sin contactos, contraseñas, UID, tokens ni columnas extra. |

La separación propuesta es lógica y de permisos; no se configura ninguna carpeta,
servicio ni lista de acceso real en PV-2. Ubicaciones concretas, custodios y quién
puede consultar/exportar cada categoría siguen sin designar.

## Dataset: solo esquema previsto

[session-template.csv](session-template.csv) contiene exclusivamente:

```text
participant_id,program_code,eligible,consent_confirmed,task_id,status,seconds,errors,assistance,technical_issue,observation
```

[sus-template.csv](sus-template.csv) contiene exclusivamente:

```text
participant_id,item_1,item_2,item_3,item_4,item_5,item_6,item_7,item_8,item_9,item_10
```

PID seudónimo, una fila por tarea iniciada y una fila SUS por participante en la
tanda primaria. `program_code` será la categoría mínima aprobada, recogida fuera
del chat; no notas, matrícula ni expediente. `eligible`/`consent_confirmed` son
atestaciones tras verificación legítima, no pruebas automáticas de aprobación.
Registrar SUCCESS/FAIL/BLOCKED, segundos, errores, asistencia e incidente según
el protocolo. `observation` solo admite información minimizada del uso/incidente,
sin nombres ni detalles que identifiquen. SUS crudo: enteros 1–5 o vacío, sin
imputación ni columnas de puntaje. Ver [diccionario existente](README.md).

No se necesita nombre en el analítico, credenciales, UID de cuenta ficticia,
tokens, serial de dispositivo ni datos académicos personales reales. La cuenta
ficticia y contexto común se asignarán privadamente sin convertir sus secretos
en identificadores analíticos. Las plantillas siguen con cabecera y cero filas;
las fixtures artificiales del analyzer no son datos de participantes.

## Posible relación PID↔persona

Para coordinar retiro o conciliar participantes elegibles/consentidos con registros
podría requerirse un vínculo privado entre identidad y PID. **No existe un mapa
creado por PV-2 y no se crea ahora.** El responsable académico debe decidir si
es necesario, su mecanismo, custodio, accesos, retención y eliminación, así como
la forma de conciliar registros sin sobrecolectar.

Si se autoriza un vínculo, permanecerá separado de ambos CSV y de los secretos
de la cuenta ficticia, nunca en Git, informes públicos o chat. Si se decide no
conservarlo, debe definirse cómo se tramitará el retiro y qué límites se informan
antes de consentir. No prometer anonimato absoluto: PID, programa y notas de una
muestra pequeña pueden permitir inferencias.

## Custodia, retención y retiro por resolver

| Decisión | Pendiente específico |
| --- | --- |
| AG-03/AG-11 | Responsable/contacto y canal de coordinación autorizado; no contactar ahora. |
| AG-04/AG-05 | Custodios, ubicaciones privadas separadas, personas con acceso y reglas de transferencia/exportación. |
| AG-06 | Periodo e inicio de cómputo para contacto, consentimiento, dataset y eventual vínculo; disposición/eliminación y cómo acreditar su ejecución. No hay plazo inventado. |
| AG-07 | Cómo solicitar/verificar retiro, tratamiento de datos ya recogidos y resultados agregados, límites y efecto sobre denominadores. No hay exclusión/eliminación automática decidida. |
| AG-01/AG-02 | Procedimiento aplicable y cómo constar consentimiento sin inferir un comité, formato o aprobación. |

La regla de retiro se comunicará antes de consentir y se aplicará de forma
consistente, documentando efectos en denominadores. No diseñarla después de ver
resultados ni eliminar selectivamente intentos adversos. Si una decisión futura
requiere retirar datos, se documentará bajo esa regla; la conservación del crudo
no se interpreta como negación de un retiro acordado.

## Uso, análisis y divulgación propuestos

Después de las puertas y del estudio, quien se designe registrará solo las
plantillas aprobadas, separará retests, minimizará observaciones y conciliará los
PIDs con la verificación privada aprobada. El analyzer no detecta una persona
omitida de ambos CSV ni acredita elegibilidad o consentimiento.

Conservar errores, asistencia, FAIL/BLOCKED e incompletos conforme al protocolo;
no imputar SUS ni redondear umbrales. Congelar el crudo según el plan aprobado,
con las excepciones y trazabilidad de retiro definidas previamente. Los outputs
analíticos y evidencia técnica también requieren acceso y revisión de privacidad.
Una publicación futura usaría resultados depurados y revisaría el riesgo de
reidentificación; no se autoriza publicar filas individuales por ser seudónimas.

No se prevén grabaciones; capturas/audio/video exigirían revisión y consentimiento
separados. El manejo de conversaciones ficticias entre sesiones seguirá la regla
aprobada del protocolo; no se añaden datos personales al chat ni se hace limpieza
de cuentas o datos en PV-2. No reutilizar participantes/datos para entrevistas u
otros fines sin decisión previa. Ver [hoja de decisiones](academic-review-decision-sheet.md)
y [borrador de consentimiento](consent-review-draft.md).
