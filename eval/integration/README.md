# Integración y checkpoint técnico

- [J1: smoke vertical operacional](run-j1-smoke.mjs) sobre servicios locales
  reales; sus instrucciones están a continuación.
- [J2: integración HTTP con router real](../../backend/api/test/intent-http-integration.test.ts),
  SQL controlado y Document RAG determinista; se ejecuta con `npm test` en
  `backend/api/`.
- [J3: checkpoint documental](results/j3-checkpoint-2026-10-03.md) de M1–M5,
  J1 y J2, con alcances y pendientes.

## J1: smoke vertical del backend actual

Este smoke operacional consulta la API REST local de BanuChat sobre una release
**100 % sintética** ya publicada. Comprueba perfiles, calendario y progreso;
crea una conversación temporal; envía un turno de fast path de progreso y otro
de Document RAG; lee el historial persistido; y finalmente intenta eliminar la
conversación. Usa PostgreSQL/pgvector y Ollama reales a través del backend.

J1 no prueba la UI móvil ni sustituye las pruebas físicas M1–M5. Tampoco prueba
ingesta, N8N, Agent/ReAct ni el MCP interno. N8N no participa en esta ruta de
consulta y el fallback actual es Document RAG directo.

## Prerrequisitos

1. PostgreSQL local de BanuChat disponible con la release sintética publicada.
2. Ollama disponible con los modelos ya configurados por el proyecto. Es
   necesario para el paso Document RAG.
3. Backend API compilado y ejecutándose localmente.
4. Node.js 22 o posterior.

No exponga la API a Internet para ejecutar este smoke.

Desde la raíz del repositorio:

```sh
node eval/integration/run-j1-smoke.mjs
```

Variables opcionales:

| Variable | Valor por defecto | Uso |
| --- | --- | --- |
| `BANUCHAT_SMOKE_API_BASE_URL` | `http://127.0.0.1:3000/api/v1` | URL base de la API local. |
| `BANUCHAT_SMOKE_PROFILE_KEY` | `profile-001` | Perfil sintético seleccionado. |

Ejemplo en PowerShell:

```powershell
$env:BANUCHAT_SMOKE_API_BASE_URL="http://127.0.0.1:3000/api/v1"
node eval/integration/run-j1-smoke.mjs
```

El script ejecuta pasos secuenciales y muestra PASS/FAIL y tiempos **observados**
de esa ejecución; no impone un SLA ni constituye un benchmark o verificación de
OE6. Los POST no tienen reintentos automáticos. Si un POST de mensaje agota su
tiempo o falla en la red, su resultado puede ser incierto: J1 falla y pasa al
cleanup sin reenviarlo. El DELETE se intenta en `finally`; un HTTP 409 indica
que el cleanup no quedó confirmado. Si el DELETE devuelve 204, el script verifica
con un GET que la conversación ya no exista (HTTP 404).
