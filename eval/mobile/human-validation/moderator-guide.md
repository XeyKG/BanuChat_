# Guía del moderador y observador — OE5-H0-CCD-1.0

> **NO EJECUTADO — FUERA DE ALCANCE — PENDIENTE DE DECISIÓN DEL DIRECTOR.**
> Guía histórica: no reclutar, entregar instrumentos ni administrar SUS. Ver la
> [decisión canónica](../../../docs/academic/oe5-human-validation-closure-decision.md).

Preparada, no ejecutada y fuera de alcance. No existe un paso de reclutamiento
pendiente de apertura sin decisión posterior del director.

## Preparación previa a P01

Rebaseline PV-0 (28/10/2026): protocolo base conservado, CCD 1.4 técnico current.
T04 está **PENDIENTE DE VENTANA DE SESIONES**: event-012 solo es antecedente
histórico, no una selección automática. La hoja con placeholder NO se entrega.
T05 no es equivalente en todas las cuentas operativas; verificar y congelar un
contexto común compatible, sin cambiar perfiles/progreso. Ver [readiness PV-0](../results/product-validation-ux-closure-pv0.md).


1. Confirmar revisión/procedimiento, consentimiento aprobado, custodia, retención,
   retiro y contacto. Comprobar elegibilidad y diversidad sin solicitar documento,
   contraseña UNAB ni datos académicos personales.
2. Completar [freeze](freeze-template.md), responsables y objetivos; reconfirmar
   current y mismo contexto auxiliar/cuenta disponible para todos. No confundir
   documental CCD con datos auxiliares ficticios. No almacenar serial ni secretos.
3. Preparar Android compatible, build, red USB/loopback, cronómetro monotónico y
   CSV vacíos. Desactivar exposición de notificaciones personales en evidencia,
   sin alterar funcionalidades del producto para facilitar tareas.
4. Entregar la credencial BanuChat ficticia privadamente, sin copiarla a CSV,
   informes, URLs o capturas. Definir una asignación secuencial limpia; si varias
   cuentas tienen contextos distintos, no usarlas sin verificar igualdad de objetivos.
5. Revalidar candidatos temporales antes del primer participante. Si ya empezó
   una tanda y un objetivo no está disponible, no reemplazarlo: incidente/BLOCKED
   y decisión documentada. No reclutar mientras los campos críticos sigan pendientes.

## Script inicial literal

> Vas a probar un prototipo académico llamado BanuChat. Evaluamos la aplicación,
> no tus conocimientos ni tu desempeño académico. La cuenta que recibirás es
> ficticia. La consulta usa documentación CCD disponible en el prototipo; progreso,
> calendario y anuncios son datos ficticios de demostración y no tu expediente.
> No introduzcas datos personales ni situaciones académicas propias. Las respuestas
> no constituyen decisiones administrativas y no afirmamos aval institucional CCD.
> Participar es voluntario: puedes pedir una pausa, no responder o retirarte sin
> consecuencias académicas. Leeré una tarea a la vez y no te diré qué botón pulsar
> ni dónde está una función. Puedes preguntar por el significado del enunciado;
> cualquier ayuda de navegación que solicites se registrará. Al terminar responderás
> un cuestionario sobre tu experiencia. El consentimiento aprobado explica los
> datos recogidos, su manejo, contacto y retiro.

Confirmar que se explicó la versión aprobada y documentó la decisión voluntaria
por el mecanismo aprobado, separado de los resultados. No completar consentimiento
por otra persona ni interpretar silencio como aceptación. No iniciar sin confirmación.

## Durante T01–T05

Leer literalmente el protocolo/hoja, sin añadir demostraciones. Iniciar reloj al
terminar la lectura; detener al completar objetivo, abandonar o agotar límite.
Límites: T01 180 s, T02 480 s, T03 240 s, T04 300 s, T05 300 s.
Registrar segundos no negativos, errores y pistas; anotar aclaraciones lingüísticas
neutrales aparte. Una pista indica FAIL; permitir continuar sin borrar ese estado.
Autocorrección sin ayuda no convierte por sí sola una tarea en FAIL.
Un error es una acción observable que no acerca al resultado, como abrir una
sección o activar un filtro incorrectos; registrar las autocorrecciones también.
No contar falta de memoria académica como error de uso ni pedir juzgar normas CCD.

No decir «pulsa aquí», «está en…», «usa este filtro», «la respuesta es…», «deberías
poner 4», ni afirmar aprobación CCD/UNAB o que el dato pertenece al participante.
No responder sobre la corrección administrativa de una norma; no añadir preguntas
de entrevista/caracterización. No preguntar programa/semestre en chat.

`SUCCESS`: objetivo entero sin pista dentro de límite. `FAIL`: no logra objetivo,
abandona, excede tiempo o requiere pista. `BLOCKED`: causa técnica externa impide
evaluarlo; código/observación y segundos transcurridos, incluso cero al intentar.
Si falta la conversación T02 al intentar T03, usar BLOCKED `OTHER` solo cuando
derive de una causa técnica externa; en una dependencia de fallo de interacción,
registrar FAIL y la relación con T02, no una nueva avería. No fabricar una
conversación asistida ni un éxito supuesto. No reclasificar usabilidad como causa externa.

Ante crash/red: detener cronómetro, conservar registro y causa, no tocar una
respuesta SUS ni repetir silenciosamente. Seguir la regla preaprobada de incidentes;
si se repite, nueva sesión/tanda referenciada con su freeze y sin sustituir la
primera. No reenviar un POST incierto automáticamente. Una pregunta de comprensión
del enunciado no autoriza navegar por el participante.

## Referencia de observación, no entregar al participante

T01 debe restaurar sesión sin contraseña; T02 debe mostrar los tres pilares
**Competencias Digitales Básicas**, **Analítica y Contenido Digital** y
**Tecnologías Transformativas**, y abrir su fuente. No exigir palabras idénticas
ni evaluar memoria. T03 reabre la conversación y vuelve a abrir su fuente.
T04/T05 se cotejan con los objetivos y respuestas de [target-candidates.md](target-candidates.md)
una vez confirmados en freeze. No revelar estos valores ni categorías en la hoja.
Mantener privacidad también en observaciones libres y capturas.

## SUS y cierre

Aplicar [los diez ítems](sus-questionnaire.md) inmediatamente después de las tareas.
No interpretar cada afirmación ni explicar qué respuestas elevarían el score.
Transcribir únicamente enteros 1–5 o vacío; un ítem/fila ausente produce NE, sin
imputación. Cuestionario y criterio no cambian después de iniciar la muestra.

Cerrar sesión en Mobile y comprobar limpieza local; si no puede confirmarse
revocación remota, registrar ese límite. El operador técnico elimina únicamente
conversaciones registradas como creadas en esa sesión según la regla aprobada de
custodia; no borra historial ajeno ni evidencia adversa. Si se usa la misma cuenta
secuencial, garantizar contexto limpio antes del siguiente participante sin
modificar corpus, calendario o progreso. No pedir al participante que haga la limpieza.

Conservar CSV crudo privado/bloqueado, freeze e incidentes; contactos/consentimientos
separados. Revisar integridad y ejecutar el analizador reproducible. Reportar
BLOCKED, incompletos, numeradores y denominadores. El resultado del script no
firma aceptación académica, documental ni cierre global de OE5.
