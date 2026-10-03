# BanuChat Mobile

Aplicación móvil en Expo + React Native + TypeScript, inicializada con Expo SDK
57 y Expo Router. El dispositivo principal para desarrollo es un teléfono Android
real con Expo Go.

La app consumirá exclusivamente la API REST de BanuChat; no accede directamente a
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

## Alcance móvil

Obligatorio: Expo con TypeScript, configuración de API, perfil sintético, chat
con citas, estados de carga y error, y prueba en dispositivo real. Opcionales, en
orden: calendario; progreso e historial de cursos. Solo si sobra tiempo: listado,
apertura y eliminación de historial de conversaciones. M1.1 inicializa el
proyecto y su pantalla de inicio; todavía no implementa funcionalidades de negocio.
