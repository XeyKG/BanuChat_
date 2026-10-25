# OE5 — Plan de validación móvil en dispositivo

## Estado

Instrumento preparado el 24 de octubre de 2026. No contiene resultados. En el entorno
de preparación no estaban disponibles `adb`, un AVD ni Xcode; por tanto ningún caso se
califica todavía. Este plan sucede al M7.4 histórico sin reescribir sus expectativas.

## Registro obligatorio de la ejecución

Completar antes de calificar casos: fecha/hora de Bogotá, responsable, revisión Git y
estado del árbol, versión BanuChat/Expo, tipo y hash del build, modelo de dispositivo,
Android/iOS, modo (`synthetic` o `ccd_authenticated`), URL local sin secretos, revisión
API/backend, release observada en `/auth/me` y REST, red y servicios disponibles. Registrar
cada repetición de forma independiente; no convertir `BLOCKED` en `PASS`.

## Preparación

- Usar cuentas BanuChat ficticias distintas A/B; nunca credenciales UNAB.
- Para `synthetic`, API v2, PostgreSQL sintético y dependencias documentales reales locales.
- Para `ccd_authenticated`, API v2 y base CCD aisladas; no habilitar calendario, progreso,
  anuncios ni notificaciones académicas.
- Expo Go puede comprobar la notificación local, pero push remoto en SDK 57 exige un
  development build instalado en dispositivo físico, credenciales de plataforma y backend
  autorizado de dispositivos.
- Fijar antes de la corrida el evento OE4 esperado y su release. Como antecedente, OE4
  publicó `6cf074d2-8d8a-4e21-967d-68a5c94f6946` con alta/modificación visibles y
  cancelación/eliminación ausentes; no asumir que seguirá siendo `current` sin comprobarlo.

## Casos

| ID | Modo | Recorrido y criterio previo | Estado |
| --- | --- | --- | --- |
| DV-01 | synthetic | Login A, cerrar la app, reabrir y recuperar sesión; logout vuelve a Login y no recupera A. | `[PENDIENTE]` |
| DV-02 | synthetic | Crear chat, ejecutar fast path y consulta documental, expandir cita y abrir documento. | `[PENDIENTE]` |
| DV-03 | synthetic | Reabrir el chat desde Historial; mensajes y citas iguales, sin conversaciones de B tras cambiar cuenta. | `[PENDIENTE]` |
| DV-04 | synthetic | Calendario muestra release observada, alta/modificación OE4 y filtros; cancelado/eliminado no aparecen. | `[PENDIENTE]` |
| DV-05 | synthetic | Progreso filtra Inscritos/En progreso/Completados y muestra fechas/porcentajes coherentes. | `[PENDIENTE]` |
| DV-06 | synthetic | Anuncios filtra Vigentes/Próximos/Vencidos/Todos y conserva hora de Bogotá. | `[PENDIENTE]` |
| DV-07 | synthetic | Permiso aceptado: sincroniza recordatorios, prueba local llega una vez y abre la pantalla pertinente. | `[PENDIENTE]` |
| DV-08 | synthetic | Permiso rechazado: no programa; UI explica ajustes y sigue operativa. | `[PENDIENTE]` |
| DV-09 | synthetic | Cambiar A→B/logout cancela recordatorios A; un payload A no navega bajo B. | `[PENDIENTE]` |
| DV-10 | synthetic | Conflicto 409 conserva mensajes y ofrece conversación nueva sin reenviar ni trasladar turnos. | `[PENDIENTE]` |
| DV-11 | synthetic | 401 cierra la sesión; 503/timeout/pérdida de red muestran estado seguro y no repiten el POST incierto. | `[PENDIENTE]` |
| DV-12 | ccd_authenticated | Login/recuperación/chat/citas/historial propios; calendario, progreso, anuncios y notificaciones sintéticas ocultos; 403 sin filtración. | `[PENDIENTE]` |
| DV-13 | synthetic | Push remoto en development build: registrar dispositivo autenticado, recibir, abrir, rotar/invalidar token y revocar en logout. | `[BLOCKED: contrato/credenciales/dispositivo pendientes]` |
| DV-14 | ambos | TalkBack/VoiceOver: orden de foco, etiquetas, estados live/alert, filtros, teclado, texto ampliado y contenido largo utilizables. | `[PENDIENTE]` |

DV-13 no se vuelve `PASS` con una notificación local. Para 401/403/409/503 usar mecanismos
controlados del entorno de prueba; no editar contratos ni interceptar credenciales. Si no
existe un fixture autorizado, registrar `BLOCKED`.

## Evidencia y resultado

Por caso registrar pasos ejecutados, resultado observado, `PASS`/`FAIL`/`BLOCKED`, hora,
captura o log permitido, y desviaciones. Las capturas no deben contener contraseñas, tokens,
headers Authorization ni datos personales. Una compilación/exportación iOS solo acredita
compatibilidad estática; iOS físico requiere dispositivo, firma y ejecución real.
