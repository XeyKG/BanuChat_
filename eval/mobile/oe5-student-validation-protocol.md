# OE5 — Protocolo de validación con estudiantes y SUS

## Estado y propósito

Instrumento preparado el 24 de octubre de 2026, antes del reclutamiento y de observar
resultados humanos. **No hay participantes, sesiones, respuestas SUS ni tasas registradas.**
La ejecución requiere revisión académica/ética aplicable, consentimiento, versión móvil
congelada y disponibilidad de un Android físico. Este estudio no usa cuentas, expedientes,
calendarios ni datos personales institucionales: cada participante recibe una cuenta
BanuChat ficticia y opera exclusivamente sobre la release sintética autorizada.

Objetivos de aceptación conservados del anteproyecto:

- mínimo 10 estudiantes reales de programas distintos de UNAB;
- cinco tareas observables;
- tasa global de completación estrictamente superior al 85 %;
- SUS de 10 ítems, media estrictamente superior a 70/100;
- ningún SUS individual inferior a 50/100.

Una métrica que no alcance el umbral se informa como tal. No se excluyen sesiones ni se
cambia una tarea después de observar resultados para convertir un fallo en éxito.

## Participantes, consentimiento y protección de datos

### Elegibilidad

- estudiante activo de UNAB, de 18 años o más;
- capacidad de leer español y usar de forma básica un teléfono Android;
- consentimiento informado antes de iniciar;
- no haber implementado BanuChat ni conocer las respuestas de las tareas;
- muestra final de al menos 10 personas, al menos tres programas académicos y no más del
  50 % de un mismo programa.

La muestra es intencional y pequeña; sus resultados describen a los participantes y no se
generalizan automáticamente a toda la población UNAB. Si la política institucional exige
otro muestreo o trámite, prevalece esa decisión y se versiona el protocolo antes de ejecutar.

### Consentimiento

El moderador explica antes de grabar datos: propósito académico, duración aproximada de
35 minutos, tareas, ausencia de impacto académico, voluntariedad, posibilidad de retirarse
sin consecuencia, datos recogidos, periodo de conservación y canal de contacto aprobado.
Se solicita consentimiento separado para audio, video o captura de pantalla; negarlo no
impide participar. El formulario y su aprobación institucional permanecen pendientes.

### Minimización

- código aleatorio `P01`–`Pnn`; la tabla de contacto/reclutamiento se guarda separada;
- registrar solo programa (categoría), dispositivo, tiempos, errores, éxito y SUS;
- no solicitar nombre, documento, correo, matrícula, contraseña UNAB ni información
  académica real;
- no copiar el UID o contraseña ficticios entregados en el archivo de resultados;
- no usar el modo CCD en el estudio ni introducir datos personales en el chat;
- eliminar contactos según el plazo aprobado y restringir los resultados al equipo autorizado.

## Versión y entorno que deben congelarse

Antes de la primera sesión completar y no alterar silenciosamente:

| Campo | Valor previo a ejecución |
| --- | --- |
| Revisión Git y estado del árbol | `[PENDIENTE]` |
| Versión BanuChat / Expo SDK | `1.0.0 / 57` |
| Dispositivo, Android y build | `[PENDIENTE]` |
| Tipo de ejecución | Development build recomendado; Expo Go solo si el caso no requiere push remoto |
| API y backend local | `[PENDIENTE; sin secretos]` |
| Release sintética y hora de Bogotá | `[PENDIENTE]` |
| Evento objetivo de T04 visible en 30 días | `[PENDIENTE; fijar el mismo para todos]` |
| Curso completado y anuncio objetivo de T05 | `[PENDIENTE; fijar el mismo para todos]` |
| Credencial ficticia por participante | Entrega privada; no registrar en resultados |
| Aprobación/procedimiento académico aplicable | `[PENDIENTE]` |

Usar el mismo modelo de teléfono y las mismas condiciones de red cuando sea posible. Si
se cambia dispositivo, build, backend o release, anotarlo como desviación y no combinar
resultados sin justificar comparabilidad.

## Instrucciones estandarizadas

Leer literalmente:

> Vas a probar un prototipo académico llamado BanuChat con datos completamente ficticios.
> No se evalúan tus conocimientos: evaluamos la aplicación. Piensa en voz alta si te resulta
> cómodo. No introduzcas información personal. Puedes retirarte o pedir una pausa. Yo no te
> guiaré durante la tarea; si necesitas ayuda, pídela y la registraré.

El moderador entrega una tarea a la vez, inicia el cronómetro al terminar de leerla y lo
detiene al obtener el resultado esperado, al abandonar o al agotar el tiempo. Solo responde
preguntas de comprensión del enunciado. Una pista de navegación cuenta como asistencia y
la tarea se califica como fallo, aunque el participante pueda continuar para completar el
recorrido. Problemas del entorno ajenos a la interfaz se califican `BLOCKED`, se conservan y
se repiten únicamente en una sesión nueva identificada.

## Cinco tareas

| ID | Enunciado para el participante | Resultado esperado | Éxito / fallo | Límite |
| --- | --- | --- | --- | --- |
| T01 | “Inicia sesión con la cuenta ficticia entregada. Cierra por completo la app, ábrela de nuevo y vuelve al inicio.” | Login correcto y recuperación de la misma sesión sin reingresar contraseña. | Éxito solo si llega a Inicio las dos veces, sin asistencia ni usar otra cuenta. | 3 min |
| T02 | “Inicia una conversación y averigua qué información debe incluirse al reportar una incidencia. Muéstrame la fuente documental que respalda la respuesta.” | Chat creado, respuesta visible, fuentes expandidas y documento abierto desde una cita documental. | Fallo si no obtiene respuesta/fuente/documento, reenvía tras un estado incierto o necesita pista. La calidad factual se registra aparte, no se infiere por completar la UI. | 8 min |
| T03 | “Vuelve al inicio, encuentra la conversación anterior en tu historial y regresa a ella. Comprueba que la respuesta y su fuente siguen allí.” | Conversación correcta reabierta con mensajes y cita conservados. | Fallo si abre otra conversación, no recupera mensajes/cita o necesita pista. | 4 min |
| T04 | “En Calendario, encuentra el evento indicado en la hoja de tarea y dime su fecha y hora. Después muestra solo los eventos de su categoría.” | Evento objetivo de la release congelada visible, fecha/hora de Bogotá y filtro correcto activo. | Fallo si usa otra categoría, reporta fecha/hora incorrecta, no puede filtrar o necesita pista. | 5 min |
| T05 | “En Progreso, localiza el curso completado indicado y confirma su porcentaje. Después, en Anuncios, localiza el anuncio indicado usando el filtro correspondiente.” | Curso objetivo en Completados al 100 % y anuncio objetivo visible bajo su estado correcto. | Éxito exige ambas partes sin pista; abandono, dato incorrecto o una parte incompleta es fallo. | 5 min |

Los valores objetivo de T04/T05 se verifican contra REST y se fijan en la tabla de entorno
antes de reclutar. No se seleccionan a posteriori según lo que cada persona encuentre.

## Registro por tarea

Por participante y tarea registrar: inicio/fin monotónicos, segundos, `SUCCESS`, `FAIL` o
`BLOCKED`, resultado observado, número de toques erróneos, retrocesos, mensajes de error,
asistencia solicitada, pérdida de conectividad y nota breve. Un error es una acción que no
acerca al resultado esperado, incluida abrir una sección incorrecta o activar un filtro
incorrecto; corregirlo sin ayuda no convierte la tarea en fallo, pero sí queda en el conteo.

Plantilla mínima:

| participant | program_code | task | status | seconds | errors | assistance | observation |
| --- | --- | --- | ---: | ---: | ---: | --- | --- |
| `[PENDIENTE]` | `[CATEGORÍA]` | `T01` | `[ ]` | `[ ]` | `[ ]` | `[ ]` | `[ ]` |

No sustituir `BLOCKED` por `SUCCESS`. Para la tasa humana, informar por separado los bloqueos
técnicos y el denominador acordado antes de calcular; el resultado primario usa todas las
tareas iniciadas por participantes elegibles en la versión congelada.

## Cuestionario SUS posterior a las tareas

Aplicar inmediatamente, sin que el moderador interprete cada ítem. Escala de 1 a 5:
1 = totalmente en desacuerdo; 5 = totalmente de acuerdo.

1. Creo que usaría BanuChat con frecuencia.
2. Encontré BanuChat innecesariamente complejo.
3. Me pareció fácil usar BanuChat.
4. Creo que necesitaría ayuda técnica para usar BanuChat.
5. Encontré bien integradas las funciones de BanuChat.
6. Percibí demasiada inconsistencia en BanuChat.
7. Imagino que la mayoría aprendería a usar BanuChat rápidamente.
8. Encontré BanuChat muy difícil de usar.
9. Me sentí con confianza al usar BanuChat.
10. Necesité aprender muchas cosas antes de poder usar BanuChat.

Conservar la respuesta entera 1–5 por ítem. Si falta un ítem, el SUS individual es `NE` y
no se imputa sin una regla aprobada antes de la ejecución.

## Cálculos y aceptación

Para cada participante, contribución de ítems impares = respuesta − 1; contribución de ítems
pares = 5 − respuesta. Sumar las diez contribuciones y multiplicar por 2,5. El resultado está
entre 0 y 100 y no es un porcentaje de respuestas correctas.

```text
SUS_i = 2.5 × [Σ(respuesta_impar − 1) + Σ(5 − respuesta_par)]
media_SUS = Σ(SUS_i válidos) / n_válidos
tasa_completación = tareas SUCCESS / tareas iniciadas × 100
```

Con exactamente 10 participantes y 5 tareas, “superior al 85 %” exige al menos 43 éxitos
de 50 (86 %). La aceptación conjunta requiere: `n ≥ 10`, diversidad definida, tasa > 85 %,
media SUS > 70 y todos los SUS individuales ≥ 50. Reportar además completación por tarea,
mediana/rango de tiempos, errores por tarea, bloqueos, abandonos y observaciones cualitativas.
No declarar OE5 validado si solo se cumple una parte.

## Orden de análisis y reporte

1. verificar elegibilidad, consentimiento, versión y desviaciones;
2. bloquear el archivo crudo y calcular con un script reproducible o doble revisión manual;
3. publicar numeradores/denominadores, no solo porcentajes;
4. separar fallos de usabilidad, fallos técnicos y bloqueos de entorno;
5. agrupar problemas por recorrido y severidad sin revelar participantes;
6. contrastar Android, accesibilidad observada y estado de push sin afirmar iOS físico;
7. conservar resultados adversos y documentar cualquier repetición;
8. concluir contra cada umbral predefinido.

## Pendientes para poder ejecutar

- revisión y autorización académica/ética aplicable;
- reclutamiento y consentimiento aprobados;
- development build/dispositivo Android si se incluye push remoto;
- credenciales FCM/APNs y un contrato backend autorizado para registrar/revocar tokens si se
  pretende evaluar push remoto (la prueba local no lo sustituye);
- versión, release y objetivos T04/T05 congelados;
- moderador, observador y almacenamiento seguro definidos.
