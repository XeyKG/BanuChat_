# Objetivos para revisión y freeze — no entregar como respuestas

> **NO EJECUTADO — FUERA DE ALCANCE — PENDIENTE DE DECISIÓN DEL DIRECTOR.**
> Referencia histórica: no seleccionar objetivos para reclutamiento o SUS. Ver la
> [decisión canónica](../../../docs/academic/oe5-human-validation-closure-decision.md).

## Estado vigente PV-0 — 28 de octubre de 2026

**No hay objetivos congelados ni autorización de reclutamiento. T04: PENDIENTE DE
VENTANA DE SESIONES.** event-012 (28/10, 18:15–20:00, Sesiones) es candidato histórico
de OE5-H0, no el objetivo vigente de una futura tanda. Su última fecha posible de
inicio de ventana era 28/10; el texto histórico íntegro queda al final, no se usa
para completar P01. La hoja entregable mantiene un placeholder hasta freeze.

Contexto derivado en lectura: current documental CCD 1.4; auxiliar
`af157a78-4c51-49c0-b8cc-509257d89f1e`. No se presume profile-001 ni un alias histórico.
Los fingerprints cortos siguientes distinguen contextos sintéticos sin publicar
UID, contraseña, identidad ni mapa de participantes.

## T04 — candidatos futuros existentes, ninguno seleccionado

La consulta viva del auxiliar encontró los siguientes seis eventos posteriores al
28/10/2026. Fechas y horas son America/Bogota. Todos pasan la visibilidad por fecha
y el límite API por defecto de 20 dentro de las ventanas calculadas; no son un
compromiso de disponibilidad para una tanda aún sin calendario.

| Clave | Título | Fecha/hora Bogotá | Categoría / filtro Mobile | Primer inicio de ventana con visibilidad | Último inicio aproximado de tanda de un día |
| --- | --- | --- | --- | --- | --- |
| event-020 | Revisión general de materiales | 2026-11-01 09:00 – 09:45 | general / Generales | 2026-10-03 | 2026-11-01 |
| event-015 | Cierre demo: Ventana para compartir observaciones | 2026-11-10 18:00 – sin fin registrado | announcement_deadline / Cierres | 2026-10-12 | 2026-11-10 |
| event-021 | Espacio de intercambio ficticio | 2026-11-15 16:00 – 16:30 | general / Generales | 2026-10-17 | 2026-11-15 |
| event-016 | Cierre demo: Encuentro informativo del programa demo | 2026-11-20 18:00 – sin fin registrado | announcement_deadline / Cierres | 2026-10-22 | 2026-11-20 |
| event-017 | Cierre demo: Actividad opcional de composición | 2026-11-30 18:00 – sin fin registrado | announcement_deadline / Cierres | 2026-11-01 | 2026-11-30 |
| event-022 | Cierre nocturno del escenario demo | 2026-11-30 23:45 – 23:59 | general / Generales | 2026-11-01 | 2026-11-30 |

Regla: para un evento con fecha civil D y cada sesión prevista S, debe cumplirse
D−29 ≤ S ≤ D. Mobile calcula la ventana al montar Calendario desde el día actual
hasta +29 días inclusive. Para L días consecutivos, el último inicio posible es
D−(L−1), no D; con días no consecutivos verificar todas las fechas reales. T01
cierra/reabre la app, pero el operador debe reconfirmar ventana/build antes de P01.
La columna de último inicio NO selecciona un evento ni habilita reclutamiento.
event-020 vence pronto; los eventos del 30/11 no cubren una tanda posterior a esa
fecha. event-022 aparece el 01/12 en UTC, pero es **30/11 en Bogotá**. No hay candidatos
posteriores al 30/11 en la instantánea observada; no crear otros en data/synthetic.
Sin conocer la ventana completa no se congela ninguna de estas alternativas.

## T05 — mismos candidatos, compatibilidad depende del binding vivo

Curso candidato: course-003, «Búsqueda y verificación de información», filtro
Completados (completed), 100 %. Anuncio candidato: announcement-006, «Actualización
de material de orientación», filtro Vigentes (active); valid_from 05/10/2026 08:00
Bogotá, valid_until null observado. Sin fecha final no significa garantía indefinida:
reconfirmar release/contexto, estado y visibilidad antes de P01 y durante la tanda.

| Contexto sintético derivado | Credencial operativa existente | course-003 | announcement-006 visible en active | Compatible con ambos candidatos |
| --- | --- | --- | --- | --- |
| AUX-01 (`bcaa6cb68290`) | sí | ausente en este contexto | sí | no |
| AUX-02 (`fa7c9a878675`) | sí | completed / 100 % | sí | sí |
| AUX-03 (`78cfc9e9a864`) | sí | completed / 100 % | sí | sí |
| AUX-04 (`94d3850e95f2`) | sí | in_progress / 45.5 % | sí | no |
| AUX-05 (`afa26f514598`) | no | ausente en este contexto | sí | no |

**Las cuatro cuentas operativas NO comparten los mismos objetivos.** Solo AUX-02 y
AUX-03 cumplen ambos candidatos. No son necesariamente perfiles completos idénticos:
se acreditó equivalencia de estos objetivos, no igualdad global de progreso.
No usar cuentas indistintamente ni cambiar datos para igualarlas. Queda pendiente
la asignación privada del contexto de la tanda; una cuenta compatible existente
usada secuencialmente es una opción ya permitida por el protocolo, no una decisión
adoptada en PV-0. Todos los participantes deben usar el contexto congelado.

PV-0 comprobó además, con una cuenta de AUX-02 solo para el control técnico,
GET /me/progress?statuses=completed y GET /announcements?temporal_status=active:
200, course-003 completed/100 % y announcement-006 active en la misma release
auxiliar. No se congeló esa cuenta para personas ni se publicaron credenciales.

## T02 — control técnico nuevo CCD 1.4, separado de humanos

Se conservó «¿Cuáles son los tres pilares de Competencias Digitales?».
API normal, current `10af4ffd-effb-41fc-bbfe-4dc48cb3398f`, ccd-1.4.0: HTTP 201,
los tres nombres previstos, cita válida y apertura de artifact protegido 200,
label bch-ccd-knowledge-2; bytes/SHA iguales a DB e historial exacto. El artifact
actual tiene 401 bytes; no se atribuyen los 182 caracteres históricos a CCD 1.4.
La etiqueta visible sigue siendo route:structure: observación para futura evidencia
humana, sin declararla un defecto de UX ni cambiar producto. Se eliminó solo la
conversación temporal propia y se confirmó logout. No se repitió Android ni se
calificó comprensión de estudiantes. Reconfirmar el recorrido en la build de P01.

[Auditoría, fuentes, readiness y límites PV-0](../results/product-validation-ux-closure-pv0.md).
Evidencia técnica saneada en carpeta temporal privada PV-0, sin participantes.

## Antecedente histórico íntegro — OE5-H0, 27/10/2026; NO OPERATIVO PARA P01

El cuerpo siguiente es la preparación anterior, con CCD 1.3 y event-012. Se conserva
como historia; cualquier «hoy», cuenta o candidato en ese cuerpo describe aquel
corte. Prevalecen las secciones PV-0 anteriores, el freeze y la puerta académica.

**Candidatos técnicos verificados el 27 de octubre de 2026; no freeze de sesiones humanas.**
Ninguna persona fue reclutada/evaluada. Reconfirmar estos mismos objetivos antes
de P01 y registrar sus valores en freeze. Si ya no son utilizables, revisarlos y
versionar hoja/protocolo antes de cualquier participante, nunca después de observar
resultados. No modificar datos del producto para hacerlos aparecer.

Contexto observado: cuenta ficticia existente con alias auxiliar «Usuario 1»;
release auxiliar `af157a78-4c51-49c0-b8cc-509257d89f1e`. El alias no es UID ni
identidad del participante. Todas las sesiones deben usar este mismo contexto
objetivo comprobado. No incluir credencial ni relación cuenta→PID en CSV.

| Tarea | Objeto candidato | Referencia solo del moderador |
| --- | --- | --- |
| T04 | Sesión demo: secuencias de automatización | Evento ficticio `event-012`, 28/10/2026, 18:15–20:00 America/Bogota; categoría `course_session`, filtro Sesiones. |
| T05 curso | Búsqueda y verificación de información | Curso ficticio `course-003`, estado completed/Completados, 100 %. |
| T05 anuncio | Actualización de material de orientación | Anuncio ficticio `announcement-006`, active/Vigentes, sin fecha final en la instantánea observada. |

**Límite temporal:** Mobile consulta desde el día de Bogotá hasta +29 días,
inclusive. El evento del 28/10 está dentro de esa ventana al preparar el paquete,
pero deja de ser utilizable cuando el inicio de la ventana supera esa fecha.
No hay calendario de sesiones humanas acordado. Reconfirmar compatibilidad de
todos los días previstos de la tanda antes de P01; si no la hay, esta selección
no habilita reclutamiento. Durante una tanda, desaparición/cambio implica incidente,
BLOCKED si corresponde y decisión documentada; no cambio oportunista de objetivo.

La comprobación técnica auxiliar consultó 27/10–26/11; el evento elegido también
está dentro de la ventana real de Mobile 27/10–25/11. No se afirma haber congelado
el reloj del dispositivo ni sustituido la ventana móvil por una fecha fija.

## T02 técnica, separada de humanos

Pregunta de control: «¿Cuáles son los tres pilares de Competencias Digitales?».
El current `f01c1c37-2d3f-4bc7-8940-fe724eb71c9a` respondió con los tres nombres;
la cita documental v2 permitió descargar un artefacto de 182 caracteres y el
historial preservó el turno. Una conversación creada/eliminada y logout confirmado.
La fuente mostró la etiqueta actual `route:structure`; se registra como observación
de presentación para revisión, sin modificar el producto en H0. La respuesta y
la fuente son utilizables técnicamente para T02; no se afirma aceptación humana
de esa etiqueta ni se oculta su aspecto técnico.

Evidencia privada: `data/ccd/local/oe5-h0-preparation/T02-technical-check.json`,
`target-candidates.json` y `cleanup.json`. No hay respuestas SUS ni datos personales.
