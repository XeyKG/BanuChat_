# OE5-NOTIFICATIONS-01 — notificaciones locales

Fecha: 31 de octubre de 2026, America/Bogota.
Estado: **BANUCHAT_OE5_LOCAL_NOTIFICATIONS_ANDROID_VALIDATED**.
Alcance: recordatorios locales ficticios en el Android probado; no cumplimiento
completo de OE5, push remoto ni resultados SUS.

## Implementación comprobada

- Permiso consultado/solicitado mediante Expo; canal Android propio, privado en
  pantalla bloqueada y sin sonido. Handler de primer plano con banner/lista solicitados.
- Activación consulta calendario/anuncios autenticados existentes, valida que sus
  releases coincidan y calcula hasta doce avisos, 24 horas antes del evento/anuncio.
  Omite horas de aviso vencidas o sin margen mínimo; usa claves estables.
- Sincronizar cancela los recordatorios anteriores y programa el conjunto actual:
  reconciliación por reemplazo, no acumulación. La prueba local usa cinco segundos.
- SecureStore por `principal_id`; preferencias e identificadores separados por cuenta.
  El estado activo persistió al recargar el bundle. Desactivar o cerrar/cambiar cuenta
  cancela pendientes y elimina la preferencia de esa cuenta, conforme al diseño existente.
  No se promete conservar la activación después del logout.
- Apertura restringida a Calendario/Anuncios, destinatario y capacidades de la cuenta
  activa. No se registra token ni se llama a FCM/APNs o a un servidor push.

## Defectos reproducidos y corrección mínima

1. **Cancelación incierta silenciada:** `Promise.allSettled` descartaba los rechazos.
   Se podía borrar la preferencia aunque quedaran pendientes, o reemplazar una prueba
   sin confirmar su cancelación. Ahora se esperan todos los resultados y se informa
   error conservando los identificadores. No hay retry automático. El provider maneja
   también ese rechazo durante el cambio de cuenta, sin promesa rechazada no atendida.
2. **Nueva entrega ignorada:** el provider deduplicaba aperturas por clave de evento.
   En Android la segunda prueba llegó, pero tocarla no abrió Calendario. Ahora se
   deduplican callbacks por identificador nativo; otra entrega del mismo evento puede
   abrirse. La deduplicación de programación y la validación de destinatario permanecen.

Regresiones fijadas antes de editar producción: once controles, siete pasan y
cuatro fallan; después **11/11 PASS**. Ejecutan el adaptador/provider reales
transpilados con puertos Expo, almacenamiento y reloj controlados; no copian su lógica.

## Ejecución física real

ADB volvió a detectar exactamente un YAL-L21 autorizado, Android 10, con development
build existente y Expo SDK 57. API/Metro estaban detenidos; PostgreSQL y Ollama estaban
disponibles. Se iniciaron únicamente los entrypoints habituales de API 3004 y Metro 8084,
sin reinstalar, actualizar SDK, cambiar fecha/hora ni modificar otras aplicaciones.

| Escenario | Evidencia observada |
| --- | --- |
| Login y Notificaciones | Cuenta ficticia autorizada; permiso ya concedido; estado inicial inactivo y cero pendientes |
| Activación | Cinco recordatorios futuros ficticios, guardados en el almacén nativo propio |
| Prueba de cinco segundos en primer plano | Tarjeta BanuChat visible en la bandeja Android; tocarla abrió Calendario |
| Prueba en segundo plano | Recepción en bandeja; el fallo de segunda apertura se reprodujo y luego se corrigió físicamente |
| Acción repetida | Dos solicitudes sucesivas dejaron cinco recordatorios más **una** prueba, no dos pruebas |
| Desactivación | Seis pendientes antes, cero después; pasado el disparo previsto no apareció la prueba cancelada |
| Logout | Primera lectura aún mostró cinco pendientes; consulta posterior confirmó cero, sin repetir la operación |
| Cambio de cuenta | Segunda cuenta inactiva y sin pendientes; tocar la entrega de la primera no abrió Calendario |
| Login/chat/navegación tras el cambio | Respuesta de ayuda del chat recibida; navegación a Home y logout final correctos |

La recepción se acredita con nodos visibles de SystemUI del teléfono y navegación,
no solo con llamadas a Expo. Doce capturas seleccionadas, recibos depurados, lecturas
de pendientes y trazas están en `infra/local/oe5-notifications-01/`, ignorado por Git.
El manifest privado distingue capturas iniciales, fallo previo y resultado corregido.
La sugerencia del chat inicialmente solo llenaba el campo; únicamente la captura 22
acredita la respuesta efectivamente enviada/recibida. La 23 acredita el logout final.

## Verificación y cierre

Desde `mobile`: `npm run typecheck`: PASS.
`node --import tsx --test test/notifications.test.ts test/notifications-native.test.ts test/notification-response.test.ts test/auth-session.test.ts`:
**20/20 PASS**. Cubren reloj 24 h, vencidos, actualizaciones, duplicados, cancelación
efectiva/fallida, cinco segundos, preferencias, cuenta ajena y sesiones.
`git diff --check`, archivos nuevos, revisión de privacidad y alcance: PASS.

Archivos productivos modificados: `mobile/src/notifications/native-service.ts` y
`notification-provider.tsx`. Pruebas añadidas: `mobile/test/notifications-native.test.ts`
y `notification-response.test.ts`; se añade este único checkpoint.
Los 4.239 archivos del inventario protegido anterior coinciden por hash, incluidas
configuración, corpus/evaluación OE1 y componentes protegidos. No se ejecutaron
evaluaciones OE1, migraciones, publicación, cambios REST/MCP o actuaciones en N8N/Agent.
Las sesiones y conversaciones nuevas son exclusivamente ficticias propias del ensayo.

Estado final: teléfono en login, cero pendientes y ninguna tarjeta BanuChat visible;
permiso original conservado. Se retiraron solo los dos reverses y el XML temporal
creados por la prueba. API y Metro normales quedan disponibles en loopback.

Límites: apertura física probada hacia Calendario, no hacia Anuncios; rechazo de
cancelación OS inyectado en pruebas, no provocado en el teléfono. No se forzó denegación
de permiso, ni se probaron iOS, otras versiones Android, reinicio, Doze prolongado o
espera real de 24 horas. Push remoto y usabilidad con estudiantes/SUS siguen sin validar.
Sin commit ni push. Se detiene esta macrotarea.
