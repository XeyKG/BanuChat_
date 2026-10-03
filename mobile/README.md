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
configurable, selección de perfil sintético, creación de conversación, chat con
citas, estados de carga y error, calendario y progreso de cursos. M1–M5 fueron
validados manualmente con Expo Go en un dispositivo Android físico. Véase el
[checkpoint de evidencia](../eval/integration/results/j3-checkpoint-2026-10-03.md).

La selección de perfil sintético no es un inicio de sesión. Siguen pendientes la
autenticación y autorización de usuario final, el historial conversacional visible
en la UI, las notificaciones push y la distribución/operación en producción.
