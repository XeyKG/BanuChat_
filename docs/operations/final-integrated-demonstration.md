# BanuChat — demostración integral reproducible

## Alcance y límite de composición

Este es un único procedimiento con dos carriles deliberadamente separados:

1. **carril técnico sintético v1 en Docker:** API → PostgreSQL/pgvector → Ollama,
   N8N → agente determinista → MCP, calendario, progreso, anuncios e historial;
2. **carril Mobile autenticado v2:** login propio y separación entre la demo sintética
   y CCD autenticado.

No existe hoy un único endpoint que combine el login v2 con la orquestación N8N/MCP v1.
Unificarlos exigiría cambiar REST/composición, fuera del cierre. La demostración debe
nombrar el cambio de carril; no presentar selección de perfil v1 como autenticación.

Línea base: `39b6b6221d61bd7aef2ce236dd124c3b11488345`, más los cambios de cierre sin commit.
Registrar el commit/árbol realmente usado al iniciar.

## Prerrequisitos

- Docker Desktop/Compose y GPU NVIDIA compatibles; servicios solo en loopback.
- Volúmenes sintético y N8N inventariados; volumen Ollama dedicado, nunca CCD ni el
  almacenamiento canónico de Ollama Windows.
- `infra/local/oe6/oe6.env` privado preparado desde `infra/oe6.env.example`.
- Workflow conversacional N8N publicado y rol MCP mínimo aprovisionado.
- Para Mobile v2: composición autenticada sintética ya autorizada y una cuenta ficticia
  entregada privadamente al operador; no escribirla en guion, capturas o logs.
- Para CCD: servicio canónico/credenciales ficticias ya autorizados. No pedir credenciales
  UNAB ni usar datos personales.
- Si se usa teléfono físico, ADB/canal seguro y Expo SDK 57 verificados. Si no existe,
  marcar el recorrido Mobile `BLOCKED`; Web/export no lo sustituye.

## 0. Congelar e inventariar

```powershell
git rev-parse HEAD
git status --short
docker ps -a --format "{{.Names}}|{{.Status}}|{{.Image}}"
docker volume inspect banuchat-schema-test_pgvector_data banuchat-schema-test_n8n_data banuchat-closure-ollama-models
ollama list
```

Confirmar por nombre/mount que ningún servicio OE6 usa `banuchat-dev-ccd-auth-data` u
otro volumen CCD. No usar `down -v`, `prune`, migraciones, ingesta ni publicación.

## 1. Arrancar el carril técnico Docker

```powershell
docker compose --profile ollama-container --env-file infra/local/oe6/oe6.env -f infra/docker-compose.oe6.yml config --quiet
docker compose --profile ollama-container --env-file infra/local/oe6/oe6.env -f infra/docker-compose.oe6.yml up -d postgres-synthetic n8n ollama api
docker compose --profile ollama-container --env-file infra/local/oe6/oe6.env -f infra/docker-compose.oe6.yml ps
docker exec banuchat-oe6-local-ollama-1 ollama list
```

Esperado: cuatro servicios `healthy`; solo existen
`qwen3-embedding:0.6b` y `qwen3:4b-instruct` como modelos requeridos. No ejecutar `pull`
si ya están presentes con los digests registrados en
[`oe6-docker-rag-2026-10-25.json`](../../eval/oe6/results/oe6-docker-rag-2026-10-25.json).

## 2. Warm-up obligatorio de Document RAG

```powershell
docker exec banuchat-oe6-local-api-1 node -e "fetch('http://127.0.0.1:11434/api/embed',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({model:'qwen3-embedding:0.6b',input:'BanuChat warmup'})}).then(r=>{console.log(r.status);if(!r.ok)process.exit(1)})"
docker exec banuchat-oe6-local-ollama-1 ollama ps
```

Esperado: HTTP 200 y embedding residente en GPU. En este portátil la primera carga tardó
31,06 s; sin warm-up, la tool MCP de 15 s produjo 503 seguro. No reenviar un POST incierto
ni ampliar el timeout durante la demostración.

## 3. Recorrido técnico vertical

Ejecutar J1 dentro de la misma red Linux:

```powershell
$script = (Resolve-Path eval/integration/run-j1-smoke.mjs).Path
docker run --rm --network host --mount "type=bind,src=$script,dst=/app/eval/integration/run-j1-smoke.mjs,readonly" --entrypoint node banuchat/backend:oe6-local /app/eval/integration/run-j1-smoke.mjs
```

J1 muestra, en orden:

- perfiles sintéticos y release;
- calendario sintético;
- progreso;
- creación de conversación;
- fast path;
- consulta documental sobre recuperación vectorial con cita `document`;
- historial exacto de cuatro mensajes con cita persistida;
- borrado de la conversación de prueba y 404 posterior.

Para una demostración manual equivalente, usar una conversación nueva y preguntar:

1. `mi progreso` — fast path con cita `profile_course`;
2. `¿Qué información debo incluir al reportar una incidencia?` — búsqueda documental
   mediante el agente determinista/MCP `search_knowledge`, con cita visible; no es
   generación LLM directa ni ReAct;
3. `Según mis cursos completados, ¿qué convocatorias activas podrían interesarme?` —
   N8N correlaciona el fallback y el agente determinista consulta MCP; la respuesta no
   debe afirmar elegibilidad.

Después, releer la conversación por REST/UI y comprobar orden, texto y citas. El operador
debe eliminar solo la conversación creada para esta demo si el protocolo lo exige.

## 4. Calendario, progreso y anuncios

Usar la release sintética vigente, sin republicarla:

```powershell
Invoke-RestMethod 'http://127.0.0.1:3000/api/v1/calendar/events?date_from=2026-10-03&date_to=2026-11-01'
Invoke-RestMethod 'http://127.0.0.1:3000/api/v1/profiles/profile-001/progress'
```

La evidencia OE4 acredita alta/modificación y ausencia de cancelado/eliminado tras la
publicación local. La fuente fue `eval/oe4/fixtures/calendar-sheet.json`: decir
**calendario fixture versionado**, no Google Sheets real ni calendario institucional.
Los anuncios pueden mostrarse mediante la tercera pregunta del paso anterior.

## 5. Fallo seguro de una dependencia

Preferencia para defensa: mostrar la evidencia ya capturada en
[`oe6-stability-2026-10-25.json`](../../eval/oe6/results/oe6-stability-2026-10-25.json):
N8N caído produjo 503, cero mensajes persistidos, recuperación ≈10,174 s y ningún
duplicado. Esto evita interrumpir una sesión compartida.

Solo en una ventana local exclusiva, con el contenedor exacto verificado y sin otro
operador, puede ejecutarse el runner existente apuntando al N8N OE6. No matar Ollama
Windows, no detener CCD y no repetir el mensaje fallido:

```powershell
$env:BANUCHAT_N8N_CONTAINER='banuchat-oe6-local-n8n-1'
node eval/oe6/run-stability.mjs
Remove-Item Env:BANUCHAT_N8N_CONTAINER
```

Si el runner no reconoce ese entorno o N8N es compartido/protegido, registrar `BLOCKED`
y usar la evidencia conservada. No improvisar un fallo destructivo.

## 6. Login y recorridos Mobile sintéticos

El login usa REST v2 sintético en 3002, no la API v1 Docker anterior. Preparar el entorno
según [`auth-p4l0-login-local.md`](auth-p4l0-login-local.md) y configurar solo metadatos
públicos:

```powershell
$env:EXPO_PUBLIC_DEMO_MODE='synthetic'
$env:EXPO_PUBLIC_API_BASE_URL='http://127.0.0.1:3002/api/v2'
$env:EXPO_PUBLIC_AUTH_LOCAL_CHANNEL='adb_reverse'
adb devices -l
adb reverse tcp:3002 tcp:3002
adb reverse tcp:8081 tcp:8081
Set-Location mobile
npx expo start --localhost --port 8081
```

Con la cuenta ficticia privada:

1. iniciar sesión y confirmar UID sintético separado del perfil;
2. cerrar/reabrir y verificar recuperación de sesión;
3. recorrer chat/citas/historial, calendario, progreso y anuncios disponibles en el
   entorno sintético autenticado;
4. cerrar sesión y verificar que no queda acceso anterior.

No afirmar que las respuestas v2 pasaron por N8N/MCP v1: esa capacidad se mostró en el
carril técnico. No colocar contraseña/tokens en variables `EXPO_PUBLIC_*`.

## 7. Separación CCD autenticada

En otra ventana controlada, iniciar el servicio canónico conforme al runbook existente y
Mobile con:

```powershell
Set-Location mobile
pwsh -NoProfile -File scripts/start-ccd-auth.ps1
```

Con cuenta ficticia CCD autorizada, comprobar:

- `/auth/me` declara `evidence_mode=ccd_local` y capacidades de chat/historial/documentos;
- conversaciones/citas pertenecen al principal autenticado;
- calendario, progreso, anuncios y notificaciones sintéticas están ocultos/denegados;
- no existe fallback silencioso al corpus sintético;
- cambio de cuenta no conserva historial de la anterior.

La selección CCD local no convierte documentos en oficiales/vigentes ni autentica contra
UNAB. Nunca mostrar secretos o contenido CCD no público en capturas de defensa.

## 8. Cierre y registro

Registrar: commit/estado, fecha Bogotá, operador, contenedores/volúmenes, modelos/digests,
release, cada paso `PASS`/`FAIL`/`BLOCKED`, tiempos y desviaciones. Separar claramente
resultados del carril v1, v2 sintético y v2 CCD.

Detener solo los cuatro contenedores OE6 iniciados por este procedimiento, verificando
primero sus nombres exactos y sin eliminar contenedores, volúmenes, imágenes, releases o
backups. Se usa `docker stop` explícito porque durante el cierre del 25 de octubre el
`docker compose stop` de Docker Desktop también envió un apagado limpio a dos contenedores
CCD ajenos al proyecto Compose; se restauraron y no debe repetirse esa ambigüedad:

```powershell
docker inspect banuchat-oe6-local-api-1 banuchat-oe6-local-n8n-1 banuchat-oe6-local-postgres-synthetic-1 banuchat-oe6-local-ollama-1 --format '{{.Name}}|{{index .Config.Labels "com.docker.compose.project"}}'
docker stop banuchat-oe6-local-api-1 banuchat-oe6-local-n8n-1 banuchat-oe6-local-postgres-synthetic-1 banuchat-oe6-local-ollama-1
```

Comprobar al final que CCD conserva su estado previo. La demostración local no acredita
TLS, servidor UNAB, Android/iOS físico, push remoto, autoridad CCD, RAGAS humano ni SUS.
