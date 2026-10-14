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
presentación local de Banu al iniciar el chat, calendario, progreso de cursos,
historial conversacional visible, consulta directa de anuncios sintéticos y apertura
interna de fuentes documentales desde respuestas nuevas o conversaciones reabiertas.
El [checkpoint histórico J3](../eval/integration/results/j3-checkpoint-2026-10-03.md)
documenta las validaciones manuales M1–M5 con Expo Go en Android físico; no cubre
historial y anuncios posteriores. Este README registra además las validaciones
manuales de M6.1, M6.1.1 y M6.1.2, sin atribuirlas a J3.
M6.2 aplica consistencia y pulido visual al flujo existente sin ampliar su
alcance funcional; todavía requiere validación manual en el dispositivo físico.

La aplicación implementa un flujo local de sesión para perfiles sintéticos de
demostración. Este mecanismo permite seleccionar, utilizar y cerrar una sesión
asociada a un perfil, pero no constituye autenticación institucional ni valida
credenciales reales. La sesión se conserva únicamente en memoria y puede perderse
al reiniciar completamente la aplicación.

Si el envío de un mensaje termina con timeout o fallo de red, la app no repite el
POST automáticamente. El usuario puede comprobar manualmente el historial para
reconciliar un turno confirmado o decidir explícitamente continuar si todavía no
aparece. Esta recuperación permanece en memoria y no ofrece idempotencia durable ni
una garantía de procesamiento exactamente una vez.

Las fuentes documentales con artifact disponible abren un visor interno que solicita
el archivo exclusivamente por `document_version_id`. El visor trata el cuerpo como
texto seleccionable, muestra el Markdown sintético sin ejecutar HTML ni enlaces y
maneja carga, error, 404 y reintento. El corpus actual usa Markdown; la app no afirma
interpretar otros formatos documentales.

La selección de perfiles conserva el alcance de demostración local con corpus
sintético. Una futura autenticación de usuario final requiere diseño explícito;
no hay despliegue, identidad ni integración institucional previstos en el alcance
vigente. El backend actual usa Intent Router y Document RAG directo; Agent/ReAct
y MCP siguen pendientes como arquitectura objetivo.

Siguen pendientes la autenticación y autorización de usuario final, las
notificaciones push y la distribución/operación en producción.
