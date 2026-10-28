# OE5 — Protocolo vigente propuesto de tareas y SUS

**OE5-H0-CCD-1.0 — rebaseline PV-0, 28 de octubre de 2026, America/Bogota.**
Estado: `READY_FOR_ACADEMIC_REVIEW`; **NOT READY FOR RECRUITMENT**.
Base técnica de esta revisión: `7c0ba1564cedc650907952099f88c226c7e4d3d3`. Estudio no ejecutado.
Se conserva el identificador base del protocolo/analyzer y sus criterios; esta
edición PV-0 se distingue mediante revisión y hashes de instrumentos en el freeze.
La base `5ed14608a9086b59bc880262552ccb2185944d3f` pertenece a OE5-H0 histórico.
[Auditoría, contradicciones y matriz PV-0](results/product-validation-ux-closure-pv0.md).

**PENDIENTE DE CONFIRMACIÓN POR EL RESPONSABLE ACADÉMICO: procedimiento/revisión aplicable antes del reclutamiento.**

Instrumento preparado no equivale a aprobación. Cero personas reclutadas, cero
consentimientos obtenidos, cero sesiones o respuestas SUS reales. No reclutar
hasta resolver esta puerta y los campos del freeze.

## Precedencia e historia

Esta versión sustituye para el estudio propuesto al protocolo sintético del
24 de octubre, con T02 sobre incidencias. El antecedente permanece en Git en
`5ed14608a9086b59bc880262552ccb2185944d3f:eval/mobile/oe5-student-validation-protocol.md`;
no fue ejecutado con estudiantes. Cambian producto y contenido de T02; se
conservan muestra, cinco tareas, diez ítems SUS, tiempos, umbrales, no asistencia
y privacidad. No se redefine el compromiso original de iOS/push ni se da por cumplido.

## Objetivo, producto y límites

Evaluar la usabilidad del prototipo móvil BanuChat mediante tareas observables y
SUS, con cuentas ficticias y sin datos académicos personales reales. Producto:
**`ccd_authenticated`, REST `/api/v2`**, documentación CCD current y módulos
auxiliares ficticios. `me.evidence_mode=ccd_local` no significa usar el modo
Mobile histórico `ccd_local`/v1. No hay fallback documental sintético ni identidad UNAB.

Se evalúan autenticación/restauración, consulta CCD, fuentes, historial, calendario,
progreso y anuncios. No se mide precisión de expedientes, vigencia administrativa
oficial, impacto en trámites, disponibilidad institucional, iOS no ejecutado, push
remoto o producción. Recordatorios locales no equivalen a push; ambos quedan
fuera de las cinco tareas. No se afirma aval institucional CCD.

Current técnico observado en PV-0: `10af4ffd-effb-41fc-bbfe-4dc48cb3398f`, `ready`,
`ccd-1.4.0`, después del cierre técnico P4-B.4F. Volver a observar y congelar el
valor real inmediatamente antes de P01; no fijarlo en la aplicación. Registrar
por separado release/contexto auxiliar. Esto no constituye aceptación humana,
aval CCD, producción institucional ni OE5 completo.

## Población y muestra conservadas

- Mínimo 10 estudiantes activos de UNAB elegibles; 18 años o más; lectura de español y uso
  básico de Android; no haber participado en la implementación de BanuChat.
- Consentimiento antes de iniciar; no entrenar previamente sobre las respuestas.
- Al menos tres programas académicos y máximo 50 % de un mismo programa.
- Muestra pequeña e intencional, sin representatividad estadística de toda UNAB.

Todo cambio requiere decisión académica registrada antes del primer participante,
versión nueva y explicación de comparabilidad con el anteproyecto. Elegibilidad
y consentimiento se verifican fuera del chat; el analizador no acredita edad o matrícula.

## Consentimiento y minimización

El [consentimiento](human-validation/consent-draft.md) es borrador. Antes de usarlo,
definir responsable/contacto, procedimiento, custodia/acceso, conservación y manejo
del retiro. No inventar comité, radicación, formato ni aprobación UNAB/CCD.

Códigos `P01`…`Pnn`, sin nombres. `program_code` se recoge fuera del chat solo si
está incluido en consentimiento/revisión. Contactos y consentimientos quedan
separados de resultados, en ubicación privada aprobada; nada de ello entra en Git.
Seudonimización no garantiza anonimato absoluto.

Nunca solicitar contraseña UNAB, documento, matrícula, expediente, notas, historial
académico ni información sensible. Ninguna tarea pide escribir en chat carrera,
semestre, cursos aprobados, situación personal, nombre o correo. Credenciales
ficticias se entregan privadamente: no anotarlas con PIDs, resultados o capturas.
No se prevé grabación; audio/video/capturas requieren revisión y consentimiento
separado sin penalizar su rechazo. Evitar notificaciones/sugerencias personales.

## Entorno y freeze antes de P01

Completar [freeze-template.md](human-validation/freeze-template.md) y fijar hashes
de protocolo, hoja, cuestionario, analizador y objetivos. Plataforma principal:
Android físico compatible con la build actual, mismo dispositivo y red para la muestra.
Registrar modelo sin serial, Android/build, Mobile/Expo, commit/estado Git, hora
Bogotá, API, current/schema, contexto auxiliar, targets, roles y desviaciones.
Mantener loopback y canal USB/ADB reverse autorizado; no abrir una red pública.

T02 tuvo un preflight histórico el 27 de octubre sobre CCD 1.3. PV-0 lo comprobó
de nuevo por API normal sobre CCD 1.4: tres pilares, cita, artifact 200/SHA e
historial; una conversación propia eliminada y logout confirmado. No se repitió
Android ni se midió comprensión humana. Los [candidatos T04/T05](human-validation/target-candidates.md)
no son un freeze: T04 está **PENDIENTE DE VENTANA DE SESIONES**; event-012 es solo
antecedente histórico y no debe imprimirse como objetivo de una tanda futura.
T05 es compatible en dos de las cuatro cuentas operativas, no en todas. Antes de
P01 se debe fijar privadamente un contexto común compatible (por ejemplo, una
cuenta existente usada secuencialmente), reconfirmar objetivos y completar la hoja.
No elegirlos después de observar resultados.

Todas las cuentas deben ofrecer el mismo contexto objetivo. Puede usarse una
cuenta ficticia existente secuencialmente, con limpieza entre sesiones; confirmar
su asignación en freeze sin guardar UID/password con PIDs. H0 no autoriza crear
cuentas ni cambiar bindings. No cambiar build, backend, fechas, objetivos o corpus
durante la tanda. Si un objetivo deja de estar visible por la ventana temporal,
registrar BLOCKED y detener la tanda; otro freeze exige otra tanda y comparabilidad
justificada, sin reemplazar favorablemente los registros originales.

## Moderación estandarizada

Leer el [script inicial literal](human-validation/moderator-guide.md). Entregar la
[hoja del participante](human-validation/participant-task-sheet.md), una tarea por
vez. Se evalúa la app, no al estudiante. Participación voluntaria sin consecuencias
académicas. Duración aproximada 35 minutos: explicación, hasta 25 de tareas y SUS.

Cronómetro monotónico: iniciar al terminar la lectura, detener al obtener el
resultado, abandonar o agotar límite. Aclarar solo significado lingüístico; no
indicar botones, ubicaciones ni pasos. Pista de navegación implica FAIL. Un toque
incorrecto corregido autónomamente cuenta como error, no automáticamente como FAIL.

## Exactamente cinco tareas

| ID | Enunciado literal | Resultado observable del moderador | Límite |
| --- | --- | --- | --- |
| T01 | Inicia sesión con la cuenta ficticia entregada. Cuando llegues al inicio, cierra por completo la aplicación, ábrela de nuevo y vuelve al inicio. | Login, Home, cierre/reapertura y restauración sin reingresar contraseña. | 3 min |
| T02 | Inicia una conversación y averigua cuáles son los tres pilares de Competencias Digitales. Después muéstrame una fuente documental que respalde la respuesta. | Chat/pregunta/respuesta visibles, los tres pilares, fuentes desplegadas y documento abierto desde la interfaz. No evaluar memoria ni exigir redacción exacta. | 8 min |
| T03 | Vuelve al inicio, encuentra en el historial la conversación que acabas de usar y vuelve a abrirla. Comprueba que la respuesta y su fuente siguen disponibles. | Conversación correcta, mensajes/cita preservados y fuente nuevamente abierta. | 4 min |
| T04 | En Calendario, encuentra el evento indicado en la hoja de tarea y dime su fecha y hora. Después muestra solo los eventos de su categoría. | Objetivo único congelado, fecha/hora Bogotá y filtro correcto. Calendario ficticio de demostración. | 5 min |
| T05 | En Progreso, localiza el curso completado indicado y confirma su porcentaje. Después, en Anuncios, localiza el anuncio indicado usando el filtro correspondiente. | Curso/porcentaje y anuncio/filtro correctos; ambas partes sin ayuda. Datos ficticios, no expediente real. | 5 min |

No entregar respuestas ni ubicaciones en la hoja. Para T02 el moderador contrasta
con el preflight, sin pedir al estudiante juzgar la validez de una norma CCD.

## SUCCESS, FAIL, BLOCKED y repetición

- `SUCCESS`: todo el objetivo sin pista dentro del límite.
- `FAIL`: no logra el objetivo, abandona, excede tiempo o requiere pista de navegación.
- `BLOCKED`: fallo técnico externo impide evaluar razonablemente la tarea; indicar
  causa. No reclasificar un error recuperable de interacción para mejorar la tasa.

Ante crash/red: parar reloj, conservar segundos/estado/causa; no reiniciar
silenciosamente ni convertir BLOCKED a SUCCESS. Repeticiones como nueva sesión/
tanda o desviación identificada; nunca sustituyen el intento original. El análisis
primario conserva la primera sesión elegible bajo el freeze; retest separado y
referenciado, no dos sesiones del mismo PID mezcladas en un CSV. Ante retiro,
aplicar únicamente la regla aprobada previamente y declarar sus efectos sobre
denominadores, sin inventar exclusión favorable. Al intentar T03 sin chat de T02,
registrar BLOCKED `OTHER` solo si la dependencia falta por causa técnica externa;
si deriva de un fallo de interacción, registrar FAIL y señalar la dependencia,
sin contarlo como una avería técnica nueva ni fabricar una conversación asistida.

## Registro y denominadores predefinidos

Usar [session-template.csv](human-validation/session-template.csv) y
[sus-template.csv](human-validation/sus-template.csv), vacíos. Una fila por tarea
iniciada; incluir intentos bloqueados de cero segundos. No fabricar tareas nunca iniciadas.
`eligible` y `consent_confirmed`: `TRUE`, confirmados antes. `seconds` no negativo;
`errors`/`assistance` enteros no negativos. Asistencia cuenta pistas de navegación,
no aclaraciones neutrales. `technical_issue`: `NONE`, `NETWORK`, `CRASH`,
`API_UNAVAILABLE`, `DEVICE`, `OTHER`; BLOCKED exige causa distinta de NONE.
Notas breves sin datos personales.

Se conserva el denominador primario anterior: **todas las tareas iniciadas por
participantes elegibles/consentidos, incluidos FAIL y BLOCKED**. Antes de analizar,
conciliar PIDs con el registro privado aprobado de elegibles/consentidos: una
persona ausente de ambos CSV no es detectable por el analizador y no puede
desaparecer silenciosamente. Documentar cualquier diferencia antes de interpretar.
Informar además
`5 × n` planificadas, iniciadas, sin registro e incompletos. Un registro incompleto
no permite declarar aceptación aunque la tasa parcial sea alta. No excluir
bloqueos ni cambiar denominadores tras ver resultados. Diez sesiones completas: 50 tareas.

## SUS de diez ítems, sin cambios

Aplicar inmediatamente tras las tareas sin interpretar ítems ni orientar puntajes.
Escala entera 1–5: 1 totalmente en desacuerdo; 5 totalmente de acuerdo.

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

CSV crudo sin fórmulas. Ítem faltante o fila SUS ausente → individual `NE`; no
imputar. Informar n válido y n NE, sin presionar para completar una respuesta.

```text
SUS_i = 2.5 × [Σ(respuesta_impar − 1) + Σ(5 − respuesta_par)]
media_SUS_disponible = Σ(SUS válidos) / n_válidos
completación_primaria = SUCCESS / todas las tareas iniciadas × 100
```

SUS no es porcentaje de respuestas correctas. Media disponible no compensa NE;
un puntaje conocido <50 se conserva como condición no cumplida aunque haya otros NE.

## Umbrales inalterados y análisis reproducible

Aceptación conjunta: **`n >= 10`**, **al menos tres programas**, **máximo 50 % de
un programa**, completación **`>85 %`**, media SUS **`>70`**, cada SUS **`>=50`**.
Con 10 × 5: **43/50 SUCCESS**, no 42. Exactamente 85 % o media 70 no cumplen.
No redondear para aprobar ni cambiar umbrales. Instrumento listo no significa OE5 PASS.

Tras verificar freeze/consentimiento/desviaciones y bloquear el crudo, ejecutar:

```text
node eval/mobile/analyze-human-validation.mjs session.csv sus.csv --output analysis.json
node --test eval/mobile/analyze-human-validation.test.mjs
```

El [analizador](analyze-human-validation.mjs) informa numeradores/denominadores,
estados, éxito por tarea, mediana/mínimo/máximo de tiempos de todos los estados,
tiempos solo de éxito aparte, errores, asistencia, programas, SUS individual,
media/mínimo válidos, NE y condiciones. Rechaza duplicados y SUCCESS contradictorio
con asistencia/límite. No acredita aprobación, elegibilidad real ni corrección CCD.
Fixtures `fixture-*` son solo pruebas artificiales, nunca sesiones humanas.
[Diccionario y uso](human-validation/README.md).

## Validaciones humanas y trazabilidad

**A. Usabilidad/SUS:** T01–T05, completación, tiempos, errores y SUS.
**B. Revisión documental/RAG:** pertinencia, fundamentación, citas, abstención y
utilidad, con revisores e instrumento separados. Estudiantes SUS no son autoridad CCD.

Aporta principalmente a OE5/experiencia. No acredita OE1 RAGAS/autoridad, OE6
producción, servidores/TLS UNAB, iOS, push o impacto organizacional. Esas brechas
globales no bloquean por sí mismas Android SUS salvo decisión académica expresa.
AC10 incluye entrevistas al coordinador y 10–15 estudiantes/caracterización;
SUS no lo satisface automáticamente. Reutilizar participantes para ese fin:
**REQUIERE DECISIÓN ACADÉMICA ANTES DEL RECLUTAMIENTO**. No añadir preguntas silenciosamente.

## Puertas pendientes

Procedimiento/revisión académica; consentimiento/custodia/conservación/retiro/
contacto; responsables; asignación privada de cuentas y contexto idéntico;
Android/red y freeze final con objetivos inmediatamente antes de P01.
La [readiness OE5-H0](results/oe5-human-validation-readiness.md) diferencia
preparación, preflight técnico y ninguna ejecución humana.
