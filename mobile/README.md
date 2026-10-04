# BanuChat Mobile

Aplicación móvil en Expo + React Native + TypeScript, inicializada con Expo SDK
57 y Expo Router. El dispositivo principal para desarrollo es un teléfono Android
real con Expo Go.

La app consume exclusivamente la API REST de BanuChat; no accede directamente a
MCP, N8N ni PostgreSQL. Para configurar la URL de API local, copia `.env.example`
a `.env.local` y define `EXPO_PUBLIC_API_BASE_URL`. Por ejemplo:

```dotenv
EXPO_PUBLIC_API_BASE_URL=http://<IP-LAN-DEL-PC>:3000/api/v1
```

`EXPO_PUBLIC_*` se incluye en el bundle de la app y no debe contener secretos.
La URL del API no es un secreto. En pruebas LAN, el backend debe escuchar
temporalmente en `0.0.0.0`, y el celular y el PC deben estar conectados a la misma
red privada. El teléfono debe conectarse a la IP privada del PC, no a `0.0.0.0`.
No expongas el API a Internet.

## Desarrollo

```bash
npm install
npx expo start
```

Abre el proyecto con Expo Go en el teléfono Android.

## Estado del MVP móvil de demostración

Implementado: Expo SDK 57, React Native + TypeScript, Expo Router, URL base de API
configurable, sesión local para perfiles sintéticos, Home, navegación protegida,
creación de conversación al abrir Chat, chat con citas, estados de carga y error,
presentación local de Banu al iniciar el chat, calendario y progreso de cursos.
M1–M5 fueron validados manualmente con Expo Go en un dispositivo Android físico. Véase el
[checkpoint de evidencia](../eval/integration/results/j3-checkpoint-2026-10-03.md).

La aplicación implementa un flujo local de sesión para perfiles sintéticos de
demostración. Este mecanismo permite seleccionar, utilizar y cerrar una sesión
asociada a un perfil, pero no constituye autenticación institucional ni valida
credenciales reales. La sesión se conserva únicamente en memoria y puede perderse
al reiniciar completamente la aplicación.

En un despliegue institucional, la selección de perfiles sintéticos deberá
sustituirse por un mecanismo de autenticación autorizado por la institución,
a partir del cual el backend derive la identidad y permisos del usuario.

Siguen pendientes la autenticación y autorización de usuario final, el historial
conversacional visible en la UI, las notificaciones push y la distribución/operación
en producción. M6.1 aún no cuenta con validación manual en Android físico.
