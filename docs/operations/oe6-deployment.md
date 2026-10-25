# OE6 — despliegue, operación y transferencia técnica

## Estado y alcance

Este paquete es un despliegue **local/on-premise reproducible pendiente de recepción
universitaria**. No demuestra que exista un servidor UNAB aprobado. No publica
servicios en Internet, no aplica migraciones y no crea/restaura datos al arrancar.
Reutiliza volúmenes externos por nombre para impedir que Compose inicialice en silencio
una base vacía distinta.

La topología Linux usa `network_mode: host` para conservar las guardas loopback ya
implementadas en API, MCP y RAG. PostgreSQL, N8N, Ollama y servicios internos escuchan
en `127.0.0.1`; un reverse proxy institucional futuro será el único punto TLS expuesto.
Esta elección debe validarse en el servidor receptor y no es equivalente al Compose
de desarrollo de Docker Desktop.

En la comprobación Windows/Docker Desktop, API/PostgreSQL/N8N/MCP compartieron la red
Linux y funcionaron, pero el daemon Ollama instalado en Windows no fue visible en ese
loopback; Document RAG respondió 503. En Docker Desktop debe usarse el perfil
`ollama-container` y precargar ambos modelos. El camino con Ollama host se reserva al
servidor Linux, donde `network_mode: host` comparte el namespace del host.

```text
Mobile --HTTPS/TLS pendiente--> reverse proxy institucional pendiente
                                      |
                               127.0.0.1:3000/3003
                                      |
             +------------------------+-------------------------+
             |                        |                         |
      PostgreSQL/pgvector       Ollama :11434              N8N :5678
        :5432 / :55453         embeddings/generación     webhook acotado
             ^                                                  |
             +-- MCP stdio (hijo de API)       RAG :3010 / calendario :3012
```

MCP no abre un puerto. Mobile solo consume REST. CCD autenticado es un perfil separado:
otra base, volumen, puerto y artefactos privados; nunca usa la demo como fallback.

## Inventario y puertos

| Servicio | Puerto/transport | Exposición | Persistencia |
| --- | --- | --- | --- |
| API sintética v1 | TCP 3000 | loopback; reverse proxy futuro | PostgreSQL |
| API CCD autenticada v2 | TCP 3003 | loopback; perfil `ccd-auth` | PostgreSQL CCD separado |
| PostgreSQL sintético | TCP 5432 | solo loopback | volumen externo sintético |
| PostgreSQL CCD | TCP 55453 | solo loopback | volumen externo CCD |
| Ollama | TCP 11434 | solo loopback | volumen externo de modelos |
| N8N | TCP 5678 | solo loopback | volumen externo N8N |
| MCP | stdio | sin listener | ninguna propia |
| Ingesta RAG | TCP 3010 | loopback; perfil `operations` | PostgreSQL/releases |
| Calendario OE4 | TCP 3012 | loopback; perfil `operations` | PostgreSQL/releases |
| Expo dev server | TCP 8081 | solo prueba controlada | dispositivo/SecureStore |

## Capacidad inicial

La prueba local usó i5-13420H (8 núcleos/12 hilos), 16 GB RAM y RTX 3050 Laptop
6 GB. Concurrencia 1, 10 muestras por rama: RAG medio 3,03 s y p95 5,34 s. Esto
justifica como **mínimo de piloto**, no como capacidad institucional: 8 vCPU, 16 GB
RAM, GPU NVIDIA con 6 GB VRAM y 40 GB libres para imágenes/modelos/datos/backups.
Recomendado para margen y evaluación concurrente: 12 vCPU, 32 GB RAM, GPU 8–12 GB
VRAM y 100 GB en almacenamiento redundante. CPU-only, concurrencia mayor que 1 y
crecimiento real no se midieron; deben medirse antes de fijar capacidad final.

Tamaños observados: imagen backend 156 MB; modelos Ollama usados ≈3,1 GB; imágenes
locales activas ≈3,0 GB. El almacenamiento recomendado incluye holgura y copias, no
es una proyección de crecimiento institucional.

## Preparación e instalación

1. Confirmar Linux x86-64, Docker/Compose, GPU/driver si aplica, DNS/TLS y acceso
   administrativo institucional separado de cuentas personales.
2. Inventariar contenedores/volúmenes y realizar backup. No usar `down -v`, prune,
   reinicialización ni migraciones automáticas.
3. Copiar `infra/oe6.env.example` a `infra/local/oe6/oe6.env` y completar secretos.
   Restringir ACL al operador. Los valores `EXPO_PUBLIC_*` nunca contienen secretos.
4. Verificar que los volúmenes declarados existen y corresponden al entorno esperado.
   Una instalación nueva debe restaurar un backup aprobado o ejecutar el proceso de
   migración/ingesta autorizado por separado; Compose no crea el schema.
5. Aprovisionar la identidad MCP únicamente en la base sintética:

   ```powershell
   cd backend/mcp-server
   npm run provision:local-reader
   ```

   El script rechaza CCD, valida current sintético, configura `default_transaction_read_only`,
   concede solo las lecturas/funciones necesarias y prueba que una escritura sea denegada.
6. Construir y validar sin arrancar:

   ```powershell
   docker compose --env-file infra/local/oe6/oe6.env -f infra/docker-compose.oe6.yml config --quiet
   docker compose --env-file infra/local/oe6/oe6.env -f infra/docker-compose.oe6.yml build api
   ```

7. Asegurar Ollama 0.35.0 y los modelos `qwen3-embedding:0.6b` y
   `qwen3:4b-instruct`. Puede usarse el daemon host o el perfil `ollama-container`;
   no ejecutar ambos en 11434.
8. Arrancar core. Si los volúmenes están usados por el Compose histórico, detener
   solo sus contenedores primero; no eliminarlos ni recrearlos:

   ```powershell
   docker compose --env-file infra/local/oe6/oe6.env -f infra/docker-compose.oe6.yml up -d postgres-synthetic n8n api
   ```

9. En N8N importar/revincular workflows y credenciales privadas. Para el entorno
   local existente, `node infra/scripts/provision-oe6-n8n.mjs` rota únicamente la
   credencial conversacional y publica ese workflow. Definir
   `BANUCHAT_N8N_CONTAINER` si el nombre difiere.
10. Activar `operations` solo durante ingesta/calendario autorizados; activar
    `ccd-auth` solo con volumen, roles y artefactos CCD verificados. Nunca apuntar
    esos perfiles a la base contraria.

## Salud, logs y diagnóstico

```powershell
docker compose --env-file infra/local/oe6/oe6.env -f infra/docker-compose.oe6.yml ps
docker compose --env-file infra/local/oe6/oe6.env -f infra/docker-compose.oe6.yml logs --since 15m api n8n postgres-synthetic
Invoke-WebRequest http://127.0.0.1:3000/api/v1/profiles
Invoke-WebRequest http://127.0.0.1:5678/healthz
Invoke-RestMethod http://127.0.0.1:11434/api/tags
```

Los logs van a stdout/stderr y no deben incluir tokens, SQL completo o payloads.
Rotación/retención debe configurarse en Docker/journald del servidor. Un 503 en RAG
apunta primero a Ollama/PostgreSQL; un 503 exclusivo de consulta multifuente apunta
a N8N/MCP. Verificar health, release vigente e identidad del volumen antes de reiniciar.

## Backup, restauración y reversión

- Backup: `node infra/scripts/verify-synthetic-backup.mjs` genera un dump sintético
  fuera de Git y comprueba restauración en destino temporal sin red. Para producción,
  cifrar, transferir y retener según política institucional; probar restauración en
  otro destino, nunca sobre la base vigente.
- N8N: respaldar su volumen/configuración cifrada junto con la misma
  `N8N_ENCRYPTION_KEY`. Sin esa clave las credenciales no son recuperables.
- Ollama: los modelos se pueden volver a obtener por nombre/revisión; conservar la
  receta de release y verificar hashes/revisión, no mezclar embeddings.
- Actualización: backup, construir una etiqueta nueva, validar `config`, levantar
  solo el servicio cambiado y ejecutar smoke/performance pertinente. No migrar Expo,
  SQL o contratos dentro de una actualización operacional.
- Reversión: conservar imagen anterior, volúmenes y release previa; volver a la
  etiqueta anterior y reiniciar solo API/servicio afectado. Un cambio de release se
  revierte mediante el procedimiento de publicación autorizado, no editando punteros
  manualmente ni restaurando sobre datos vigentes.

## Recepción universitaria

- [ ] Servidor y responsable formalmente aprobados.
- [ ] CPU/RAM/GPU/disco medidos con carga concurrente representativa.
- [ ] Segmento de red, firewall, DNS y certificado TLS aprobados.
- [ ] Solo reverse proxy expuesto; 5432/55453/5678/11434/3010/3012 bloqueados.
- [ ] Cuentas técnicas por servicio, gestor de secretos y rotación definidos.
- [ ] Volúmenes y bases sintética/CCD separados; procedencia CCD autorizada.
- [ ] Backups cifrados, retención, restauración aislada y RPO/RTO aprobados.
- [ ] Monitoreo, alertas, logs y ventana de mantenimiento definidos.
- [ ] Fuente Google Sheets/institucional y credenciales autorizadas, si se usarán.
- [ ] Android/iOS reales, push, privacidad y consentimiento de estudio resueltos.
- [ ] Prueba de carga, seguridad y aceptación firmadas por responsables; una validación
      del equipo no se presenta como aval de UNAB o CCD.
