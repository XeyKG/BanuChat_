# BanuChat Web local — WEB-02

Reutiliza Expo SDK 57, React Native Web, Expo Router, AuthSession y los clientes
REST v2 de Mobile. No requiere otra aplicación, API, cuenta ni SDK. Solo se
habilita el origen `http://127.0.0.1:8085`; no sirve para publicación remota.

## Arranque

1. Comprobar la API Unified habitual en `127.0.0.1:3004`, con su configuración
   privada existente. Si está detenida, seguir el
   [procedimiento Unified](final-integrated-demonstration.md). No recrear servicios.
2. Desde `mobile`, con sus dependencias existentes:

   ```powershell
   npm run web:export
   npm run web:serve
   ```

3. Abrir **http://127.0.0.1:8085/login** en el mismo computador. Ingresar con una
   cuenta ficticia existente entregada privadamente por el operador.
4. Detener solo este servidor con Ctrl+C. No detener API, Metro, Ollama ni N8N.

El exportador deshabilita dotenv, limpia las variables `EXPO_PUBLIC_*` heredadas
y fija únicamente el modo público `ccd_authenticated`. No copiar credenciales
al frontend. No usar `serve-local-web.mjs`: es un antecedente con registros de
payloads, no el servidor de esta versión autenticada. `npm run web` conserva el
servidor de desarrollo Expo; para este recorrido usar los dos comandos anteriores.

## Sesión y navegación

Access y refresh permanecen en memoria de cada página, con renovación bajo demanda
serializada por AuthSession. No hay almacenamiento web ni sincronización de tokens
entre pestañas. Una recarga completa exige login. Recargar no acredita revocación
remota: utilizar Salir/Cerrar sesión para solicitarla. Sin confirmación de revocación,
la interfaz lo indica y elimina el acceso local. No se reenvían POST inciertos.

Inicio permite crear un chat; las respuestas muestran fuentes desplegables y las
citas documentales abren el visor de texto existente. Historial lista/reabre las
conversaciones propias y exige confirmación del navegador para borrar una. El
visor usa texto React, sin HTML activo, y conserva la verificación del backend y
el límite móvil de 1.000.000 caracteres. Las capacidades auxiliares mantienen sus
avisos de datos ficticios; el material CCD seleccionado no implica aval institucional.

En escritorio se ofrece navegación lateral con Inicio, Chat, Historial, Progreso,
Calendario, Anuncios y convocatorias, Publicaciones OE2, Banu al día y Cerrar
sesión. Las secciones respetan las capacidades vigentes. Chat permite crear una
conversación o retomar el historial y el chat abierto; no fabrica un identificador.
Bajo 1024 px se usa el botón Menú; Escape lo cierra y devuelve el foco al botón.
Al activar una sección, el foco pasa al contenido. Hay foco visible y un enlace
para saltar la navegación.

Los borradores, mensajes y estados de envío sin confirmar se conservan en memoria
durante la sesión web, separados por conversación. Un cambio de pantalla o tamaño
no inicia otro POST. Cerrar sesión, invalidarla o cambiar de cuenta elimina ese
estado y descarta actualizaciones tardías. Una recarga lo pierde deliberadamente
y exige login. Android conserva su estado local de componente y SecureStore.

Calendario web permite consultar 30 días desde una fecha civil `AAAA-MM-DD` y volver
a Hoy, sin desplazar el día por UTC ni alterar el reloj. Anuncios admite búsqueda;
sus datos auxiliares siguen separados de Publicaciones OE2 y del material CCD.

Las notificaciones nativas no aparecen en web y su ruta está protegida por plataforma.
El proxy devuelve 404 al intentar abrir `/notifications`. No se solicita permiso
web ni se registra push.

## Transporte

`serve-unified-web.mjs` escucha solo en `127.0.0.1:8085`, comprueba Host, Origin y
Fetch Metadata y dirige las operaciones admitidas exclusivamente a
`127.0.0.1:3004`. POST/DELETE requieren el Origin exacto. Rechaza v1, administración,
recuperación de contraseña no utilizada por esta interfaz, métodos desconocidos,
query ajena a las rutas, cuerpos mayores de 16.384 bytes y cabeceras duplicadas
sensibles. El backend sigue siendo la autoridad de sesión, parámetros y propiedad.

Conserva status, JSON de error y bytes documentales; no reintenta ni redirige.
No propaga cookies ni respuestas Set-Cookie, no habilita CORS y utiliza no-store.
La CSP permite scripts propios y hashes de los scripts inline estáticos de Expo;
no permite eval ni scripts inline arbitrarios. No registra peticiones, cuerpos,
tokens, documentos o conversaciones; imprime únicamente el arranque o su fallo.

## Comprobaciones

Desde `mobile`:

```powershell
npm run typecheck
node --import tsx --test test/web-chat-cache.test.ts test/web-auth.test.ts test/auth-session.test.ts test/ccd-authenticated.test.ts test/ccd-session-ownership.test.ts test/ccd-presentation.test.ts test/oe2-demo.test.ts test/oe2-changes.test.ts test/notifications-native.test.ts test/notifications.test.ts
npm run web:test
npm run web:export
```

Las pruebas de proxy abren puertos efímeros solo en loopback y usan un backend
sintético. Requieren un entorno que permita conexiones locales. No consultan
fuentes institucionales. Los resultados realmente ejecutados y límites están en
el [checkpoint WEB-02](../transition/CHECKPOINT-WEB-02.md).

La comprobación operacional opcional en este entorno Windows usa Edge instalado,
su protocolo DevTools en loopback y un perfil headless aislado. Con servidor web
y Unified disponibles, desde `mobile`:

```powershell
node --import tsx scripts/check-unified-web-browser.mts --web02
```

Requiere el archivo DPAPI existente del operador y el mismo usuario Windows;
solo lo lee, no provisiona cuentas. Crea conversaciones propias de demostración,
borra únicamente una conversación nueva tras comprobar su identidad y probar
cancelar/confirmar, y consulta el estado antes de revocar las sesiones de prueba
observadas. WEB-02 reutiliza el harness WEB-01 y añade el recorrido de auxiliares,
OE2, responsive, teclado, borrador y estados pendientes. Guarda evidencia bajo
`%LOCALAPPDATA%/BanuChat/web-02` con ACL del usuario. Los perfiles Edge propios se
retiran al terminar. Solo captura pantallas auxiliares; no guarda DOM de mensajes,
documentos CCD, historial ni login. No se imprimen credenciales ni payloads. No ejecutar
repetidamente: el login existente limita a cinco intentos por cuenta/ventana de
quince minutos, incluidos los válidos. Ante 429 consultar el estado/vencimiento y
detener intentos, sin modificar límites. `--inspect` comprueba solo carga inicial,
sin login. Las respuestas correctas usan el backend real; 503, 409 y pérdida de red
se inyectan exclusivamente en la pestaña para probar los estados de interfaz.

Para repetir solo una auditoría pendiente de recarga y privacidad, sin repetir
la consulta documental ni el resto del recorrido:

```powershell
node --import tsx scripts/check-unified-web-browser.mts --web02 --skip-login-controls --privacy-only
```

`--skip-login-controls` omite las credenciales rechazadas y el 503 simulado ya
acreditados; no evita el login real ni cambia límites. `--privacy-only` usa la
segunda cuenta ficticia, crea un chat vacío y verifica que la recarga descarte su
borrador. El informe declara alcance focal, no una nueva pasada completa.

Un despliegue remoto requerirá decidir sesión, TLS y orígenes con autorización
separada. Esta versión acredita únicamente Edge headless local; no acredita
compatibilidad universal, usabilidad con estudiantes, iOS, push ni una nueva
validación física Android. El bundle Android se exporta con Hermes conservando
Expo SDK 57; no se generan proyectos nativos.

## Revisión visual WEB-03

El estilo exclusivo web se instala desde `WebFrame.web` usando los tokens
existentes. Las pantallas compartidas identifican sus regiones con `testID`;
esos identificadores no cambian sus estilos ni flujos nativos.

Con la exportación y el proxy local disponibles:

```powershell
node --import tsx scripts/check-unified-web-browser.mts --web03-before
# Aplicar los cambios visuales y volver a exportar antes de la comparación.
node --import tsx scripts/check-unified-web-browser.mts --web03-after
```

Cada recorrido usa **un login real**, un perfil Edge descartable y una carpeta
privada bajo `%LOCALAPPDATA%/BanuChat/web-03/<uuid>` con ACL del usuario. No repetir
logins para esperar un bloqueo: respetar la ventana descrita arriba.
Las capturas tienen 1366, 768 y 390 píxeles de ancho y 900 de alto. Auxiliares
usan datos ficticios reales; chat e historial reciben fixtures explícitamente
sintéticos mediante CDP. El evaluador bloquea el POST de generación/error y
comprueba que el chat propio siga vacío en backend. La versión final elimina
únicamente ese chat nuevo, tras verificarlo. No consulta conversaciones existentes
para preparar las capturas ni abre documentos CCD.

Se guardan PNG, metadatos sin cuerpos de conversación, mediciones e informe de
limpieza de sesiones y perfil. La marca que permite capturar chat/historial solo
se activa en el recorrido visual con respuestas sintéticas interceptadas; el
recorrido funcional WEB-02 conserva su exclusión de esas capturas. La comparación
final, sus límites y las rutas privadas están en el
[checkpoint WEB-03](../transition/CHECKPOINT-WEB-03.md).
