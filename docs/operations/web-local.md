# BanuChat Web local — WEB-01

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

En escritorio se añade navegación lateral; bajo 1024 px se compacta arriba. Las
notificaciones nativas no aparecen en web y su ruta está protegida por plataforma.
No se solicita permiso web ni se registra push.

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
node --import tsx --test test/web-auth.test.ts test/auth-session.test.ts test/ccd-authenticated.test.ts test/ccd-session-ownership.test.ts test/ccd-presentation.test.ts test/notifications-native.test.ts test/notifications.test.ts
npm run web:test
npm run web:export
```

Las pruebas de proxy abren puertos efímeros solo en loopback y usan un backend
sintético. Requieren un entorno que permita conexiones locales. No consultan
fuentes institucionales. Los resultados realmente ejecutados y límites están en
el [checkpoint](../transition/CHECKPOINT-WEB-01.md).

La comprobación operacional opcional en este entorno Windows usa Edge instalado,
su protocolo DevTools en loopback y un perfil headless aislado. Con servidor web
y Unified disponibles, desde `mobile`:

```powershell
node --import tsx scripts/check-unified-web-browser.mts
```

Requiere el archivo DPAPI existente del operador y el mismo usuario Windows;
solo lo lee, no provisiona cuentas. Crea conversaciones propias de demostración,
borra únicamente una conversación nueva tras comprobar su identidad y probar
cancelar/confirmar, y consulta el estado antes de revocar las sesiones de prueba
observadas. Evidencia y perfil temporal quedan bajo `%LOCALAPPDATA%/BanuChat/web-01`
con ACL del usuario. No se imprimen credenciales ni payloads. No ejecutar
repetidamente: el login existente limita a cinco intentos por cuenta/ventana de
quince minutos, incluidos los válidos. Ante 429 consultar el estado/vencimiento y
detener intentos, sin modificar límites. `--inspect` comprueba solo carga inicial,
sin login. Las respuestas correctas usan el backend real; 503, 409 y pérdida de red
se inyectan exclusivamente en la pestaña para probar los estados de interfaz.

WEB-02: decidir arquitectura de sesión y transporte para un despliegue remoto,
TLS/orígenes definitivos, navegadores adicionales, accesibilidad y evaluación
humana autorizada. Esta versión no acredita despliegue público, usabilidad con
estudiantes, iOS, push ni una nueva validación física Android.
