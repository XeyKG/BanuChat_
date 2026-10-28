# BanuChat — hoja de decisión para revisión académica

PV-2 · 28/10/2026 · **PAQUETE PARA REVISIÓN; NO AUTORIZA RECLUTAMIENTO**.
No hay participantes, consentimientos obtenidos ni respuestas humanas registradas.
Este documento propone decisiones; ninguna casilla pendiente implica aprobación.

**PENDIENTE DE CONFIRMACIÓN POR EL RESPONSABLE ACADÉMICO: procedimiento/revisión aplicable antes del reclutamiento**

## A. Qué se propone evaluar

La usabilidad de BanuChat, un prototipo académico en Android: cinco tareas,
cuestionario SUS de diez ítems inmediatamente después y observación de tiempo,
errores y asistencia. Duración prevista por el protocolo: aproximadamente
**35 minutos**, incluidos hasta 25 minutos de tareas, explicación y SUS.

Se evalúa la aplicación, no la calidad académica del estudiante. El estudio no
acredita autoridad documental CCD, producción institucional ni identidad
institucional. Se usan cuentas ficticias; calendario, progreso y anuncios son
datos de demostración, no expedientes personales.

## B. Quiénes participarían

**Diseño propuesto sujeto a confirmación académica:** al menos 10 estudiantes
elegibles, de al menos tres programas y máximo 50 % de un solo programa.
El protocolo propone estudiantes activos de UNAB, mayores de edad, con lectura
de español y uso básico de Android, sin participación en la implementación.
La muestra sería intencional y pequeña, sin representatividad estadística de toda
la universidad. La verificación mínima de elegibilidad debe aprobarse; no exige
copiar documentos o expedientes. **No se recluta en PV-2.**

## C. Qué haría cada participante

| Tarea | Actividad, sin respuestas ni soluciones |
| --- | --- |
| T01 | Entrar con una cuenta ficticia, cerrar la aplicación y volver a abrirla para comprobar la recuperación de sesión. |
| T02 | Consultar los tres pilares de Competencias Digitales y mostrar una fuente documental. |
| T03 | Recuperar del historial la conversación anterior y comprobar respuesta y fuente. |
| T04 | Encontrar un evento ficticio indicado, comunicar fecha/hora y mostrar su categoría. El evento definitivo está pendiente. |
| T05 | Localizar un curso y un anuncio ficticios indicados, comprobar el porcentaje y usar el filtro correspondiente. |

Después respondería SUS sin orientación sobre respuestas. El moderador leería
literalmente, sin enseñar pasos ni botones. Una pista de navegación implica FAIL;
BLOCKED se reserva a un impedimento técnico externo. No se reemplazan intentos
adversos ni se repiten silenciosamente tareas.

## D. Información que se registraría

Código seudónimo PID, `program_code` mínimo autorizado, elegibilidad y consentimiento
confirmados, tarea, resultado SUCCESS/FAIL/BLOCKED, tiempo, errores, asistencia,
incidente/observación mínima y diez respuestas SUS. Solo campos de las plantillas.

El dataset analítico no necesita nombre, contraseña, datos académicos personales
reales, UID de la cuenta ficticia ni tokens. Contacto y consentimiento tendrían
custodias separadas del dataset. Seudonimización no garantiza anonimato absoluto;
cualquier vínculo PID↔persona requiere decisión previa y **no se crea ahora**.
No se prevén grabaciones; añadirlas requeriría revisión/consentimiento separado.
Ver [plan de datos](data-handling-review.md) y [consentimiento para revisión](consent-review-draft.md).

## E. Criterios ya definidos, sin cambios

- **>85 % completación**.
- **SUS medio >70**.
- **Ningún SUS individual <50**.

Se conservan además muestra/cuotas propuestas y cinco tareas. La completación
incluye todas las tareas iniciadas, también FAIL y BLOCKED. Con diez sesiones
completas se requieren 43/50 SUCCESS; no redondear para aprobar. SUS incompleto
es NE, sin imputación; registros incompletos impiden declarar aceptación.
Estos umbrales no sustituyen una decisión académica ni aprueban el estudio.

## Decisiones externas requeridas

Los responsables de la tabla son **roles propuestos, sin personas designadas**.
Todas las filas siguen PENDIENTE. Resolver cada una con decisión, fecha y evidencia
por el mecanismo que confirme el responsable académico; no enviar datos personales
o documentos identificables al repositorio.

| ID | Decisión requerida | Propuesta actual | Opciones razonables | Responsable | Estado | Efecto si queda pendiente |
| --- | --- | --- | --- | --- | --- | --- |
| AG-01 | Procedimiento/revisión antes de reclutar | Confirmación externa; no se presume comité, formato ni aprobación | Confirmar la vía aplicable y sus condiciones, o solicitar ajustes antes de decidir | Responsable académico | PENDIENTE | Bloquea reclutamiento y freeze habilitante |
| AG-02 | Revisión/aprobación del consentimiento | Borrador de revisión, no utilizable | Revisarlo conforme a AG-01; pedir cambios o aceptar una versión identificada según corresponda | Responsable académico | PENDIENTE | No obtener consentimiento ni iniciar sesiones |
| AG-03 | Responsable/contacto para preguntas y retiro | Sin persona ni contacto definidos | Designar responsable y canal verificable; aclarar suplencia si aplica | Responsable académico | PENDIENTE | No entregar información final ni reclutar |
| AG-04 | Custodia de consentimientos | Separada de resultados | Definir custodio, ubicación privada y acceso; mecanismo documental o electrónico según AG-01 | Responsable académico / custodio por designar | PENDIENTE | No recoger consentimientos |
| AG-05 | Custodia de resultados seudonimizados | Solo CSV previstos, fuera de Git | Definir custodio y accesos por rol; confirmar separación de contacto/consentimiento | Responsable académico / custodio por designar | PENDIENTE | No recoger resultados |
| AG-06 | Periodo de retención y disposición | Sin plazo establecido | Fijar plazos, inicio del cómputo y eliminación para cada categoría según revisión aplicable | Responsable académico / custodio por designar | PENDIENTE | Plan de datos y consentimiento sin cerrar |
| AG-07 | Retiro y datos ya recogidos | Voluntario; tratamiento todavía sin definir | Precisar cómo solicitarlo, verificarlo sin sobrecolectar, tratar datos crudos/agregados y comunicar límites | Responsable académico / custodio por designar | PENDIENTE | No informar ni obtener consentimiento final |
| AG-08 | Moderador | Lectura literal, sin guiar | Designar persona y disponibilidad; documentar acumulación de roles si se permite | Responsable académico | PENDIENTE | No ejecutar sesiones |
| AG-09 | Observador/registrador | Registro de tiempos, errores y desviaciones | Designar rol separado o combinación justificada y permitida; asegurar registro consistente | Responsable académico | PENDIENTE | No ejecutar sesiones |
| AG-10 | Muestra y cuotas | ≥10 elegibles, ≥3 programas, máximo 50 % de uno | Confirmar propuesta; si pide cambios, resolver versión/comparabilidad antes de P01 | Responsable académico | PENDIENTE | No fijar plan de reclutamiento |
| AG-11 | Canal de reclutamiento | Ningún canal ni contacto autorizado | Elegir canal permitido tras AG-01 y mensaje revisado; no contactar todavía | Responsable académico | PENDIENTE | No invitar participantes |
| AG-12 | Dispositivo/build/canal Android de la tanda | Referencia técnica PV-1B, por reconfirmar | Aceptar canal observado tras reconfirmación o pedir otra configuración y su validación previa | Responsable académico / operador técnico por designar | PENDIENTE | No congelar entorno ni iniciar tanda |
| AG-13 | TalkBack en el estudio Android general | NOT_EXECUTED; brecha separada, sin bloqueo automático | Mantener brecha separada o exigirlo expresamente antes del estudio con alcance definido | Responsable académico | PENDIENTE | No presume obligación nueva; si se exige, habrá que acreditarlo antes de habilitar |
| AG-14 | SUS Android sin iOS físico | Estudio Android propuesto; no acredita iOS | Confirmar ese alcance o requerir iOS antes; mantener pendiente el compromiso global multiplataforma | Responsable académico | PENDIENTE | No asumir decisión académica; iOS no es bloqueo técnico automático de Android |

## Ventana y objetivos pendientes

**VENTANA DE SESIONES PROPUESTA: [PENDIENTE]**

### Información necesaria para congelar T04

- Fecha de la primera sesión y de la última sesión: [PENDIENTE].
- Días reales previstos, incluidos días no consecutivos: [PENDIENTE].
- Buffer deseado antes/después de la tanda: [PENDIENTE].
- Evento visible durante todos esos días, categoría y unicidad: [PENDIENTE].
- Comprobar visibilidad con el límite normal de **20 resultados**: [PENDIENTE].

T04 sigue **PENDIENTE DE VENTANA DE SESIONES**. Cuando se conozca la ventana, PV-3
seleccionará/revalidará un candidato de forma determinista para cada día de sesión
y buffer acordado, con fecha/hora Bogotá, ventana de 30 días, unicidad, categoría
y límite normal. No se elige ahora el evento que funcionó en un ensayo técnico
ni se modifica el dataset. Si no hay candidato válido, se registra el bloqueo y
se solicita decisión; no se inventa un evento.

T05 conserva candidatos técnicos, sujetos a reconfirmación en el freeze.
Los identificadores y condiciones esperadas permanecen en material del operador,
no en esta síntesis ni en la hoja entregable al participante.

**COMMON AUXILIARY CONTEXT: [PENDIENTE DE ASIGNACIÓN PRIVADA]**

## Canal Android de la tanda

PV-1B verificó técnicamente un development build SDK 57 en Android físico con
canal limpio. No fue una sesión humana ni un freeze. Para la tanda, registrar y
reconfirmar build/hash, dispositivo sin serial, Metro/API y conexión autorizada.
Derivar el lanzamiento legacy limpio del entorno activo, verificar Tools ausente
y navegación normal; conservar la misma configuración durante toda la tanda.
No copiar scheme/URL históricos como constantes universales.

TalkBack continúa **NOT_EXECUTED**; no se transforma automáticamente en blocker
del SUS Android salvo decisión expresa AG-13. iOS físico mantiene su alcance
separado y la decisión AG-14.

## El freeze puede ejecutarse únicamente cuando:

- [ ] AG-01 resuelto con evidencia externa real.
- [ ] Consentimiento aprobado/revisado según el procedimiento confirmado.
- [ ] Roles, contacto, custodia, retención y retiro definidos.
- [ ] Muestra/cuotas/canal de reclutamiento y alcance Android decididos.
- [ ] AG-12–AG-14 resueltos y satisfechas las condiciones que se decidan.
- [ ] Ventana real de sesiones definida; T04 seleccionado y congelado para ella.
- [ ] Contexto común y candidatos T05 reconfirmados y congelados privadamente.
- [ ] HEAD/build/device registrados; instrumentos finales hasheados.
- [ ] CSV verificados vacíos y hoja entregable sin placeholders ni material interno.
- [ ] Canal limpio reconfirmado; configuración de tanda fijada.

Esta checklist no completa [freeze-template.md](freeze-template.md). La selección
previa de objetivos se documentará en PV-3 antes de cerrar ese registro.
`READY_TO_FREEZE` significa que están resueltas las entradas para congelar;
`READY_FOR_RECRUITMENT` exige además freeze completado y decisión habilitante
real conforme al procedimiento confirmado. **Ninguno se declara ahora**.

Siguiente paso: devolver decisiones académicas y ventana real para preparar
**PV-3 — FINAL FREEZE**. Fuentes: [protocolo](../oe5-student-validation-protocol.md)
y [PV-1B](../results/product-validation-ux-closure-pv1b.md).
