# CHECKPOINT BANUCHAT — OE6

Fecha: 2026-10-25 (America/Bogota). Base de trabajo:
`369f4ff077642e46d48462dc4459ec38684a568c`. Entorno local; no hay despliegue
institucional acreditado.

## Resultado ejecutivo

OE6 entrega un incremento integrado verificable: imagen backend construible, Compose
de transferencia con volúmenes externos y health checks, identidad MCP sintética
de mínimo privilegio, webhook N8N real, E2E API→N8N→MCP→PostgreSQL, benchmark por
rama, fallos controlados, backup/restore aislado y regresión CCD autenticada.

El resultado sigue siendo **parcial respecto de los seis objetivos**. No se ejecutaron
Android/iOS físicos, push remoto, Google Sheets/fuentes institucionales, RAGAS CCD,
SUS con estudiantes ni despliegue UNAB. RAG cumple media ≤5 s en esta muestra, pero
su p95 fue 5,34 s. No se extrapola el portátil a un servidor universitario.

## Evidencia real ejecutada

| Flujo | Tipo | Resultado observado |
| --- | --- | --- |
| API→PostgreSQL→pgvector→Ollama | servicios reales, J1 | PASS; fast path 47 ms, RAG 3.056 ms, citas/historial y cleanup |
| MCP stdio→PostgreSQL/pgvector→Ollama | real, sin mocks | 6/6 tools PASS; misma release; `search_knowledge` 7.876 ms en arranque frío |
| API→N8N→agente OE3→MCP→PostgreSQL | real, 10 corridas | 10/10 PASS, media 2.635,5 ms, p95 2.869 ms, citas y persistencia |
| CCD autenticado API→RAG→PostgreSQL/Ollama | real | PASS login/refresh, cuentas aisladas, RAG/cita/artefacto, abstención e I1B sin cambios |
| N8N caído | contenedor real detenido | 503 en 12 ms, 0 mensajes; recuperación 10.174 ms; sin duplicado |
| Ollama no disponible | fallo de red en API aislada | 503 en 1.292 ms y 0 mensajes; daemon compartido no fue detenido |
| Backup/restauración | PostgreSQL real→contenedor aislado | dump 1.120.214 bytes; restore 6.289 ms; 16/16 huellas iguales |
| Mobile estático/servicios | código local | typecheck, lint, 38/38 tests y Expo Doctor 21/21 PASS |
| Mobile nativo | hardware | NO EJECUTADO: no existen `adb`, Android SDK/AVD ni dispositivo visible |
| Compose OE6 en Docker Desktop | contenedores reales | PostgreSQL/N8N/API healthy; fast paths y N8N→MCP PASS dentro de la red host. Document RAG devolvió 503 porque el Ollama Windows externo no comparte el loopback Linux de Docker Desktop |

Seguimiento del 25 de octubre: el perfil `ollama-container`, con volumen dedicado y
warm-up, cerró Document RAG Docker y la carga concurrente 1/2/5. Véase el
[checkpoint de cierre técnico](banuchat-technical-closure-checkpoint.md). El fallo frío
se conserva como evidencia; no se reescribe este resultado histórico.

La publicación de ingesta N8N y calendario no se volvió a ejecutar: la evidencia real
vigente de OE2/OE4 ya acredita publicación/`unchanged`, y una nueva revisión Git no
se publica sin aprobación registrada. OE6 reutilizó esa evidencia y comprobó la
release actual; no inventó una aprobación ni creó otra release para completar una tabla.

## Rendimiento

Entorno: Windows 10.0.26200, Node 24.19.0, i5-13420H, 12 procesadores lógicos,
16 GB RAM y RTX 3050 Laptop 6 GB. Límite: portátil local, no servidor UNAB.
Medición: inicio de `POST /messages` hasta JSON leído; 10 muestras por rama,
concurrencia 1, timeout 120 s, cero retries, errores incluidos en estadísticas.
Se descargaron de memoria ambos modelos antes de la corrida; la primera muestra RAG
fue fría (5.340 ms) y las restantes warm.

| Rama | Media | Mediana | p95 | Máximo | >5 s | Errores/timeouts | Meta media ≤5 s |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Fast path | 27,2 ms | 27 ms | 34 ms | 34 ms | 0/10 | 0/0 | PASS |
| Document RAG | 3.031,4 ms | 2.797 ms | 5.340 ms | 5.340 ms | 1/10 | 0/0 | PASS media; p95 supera 5 s |
| N8N/MCP | 2.635,5 ms | 2.547 ms | 2.869 ms | 2.869 ms | 0/10 | 0/0 | PASS |

No hay prueba concurrente >1 ni soak prolongado. Ventana observada de evaluación
integrada: aproximadamente 12:37–12:46 UTC, con las interrupciones planificadas
registradas. No se observaron incidentes no planificados en esa ventana, lo cual no
acredita disponibilidad continua.

## Seguridad y operación

- `banuchat_mcp_reader`: no superusuario, sin CREATE/DML/sequence/membresías; SELECT
  limitado a diez tablas y EXECUTE a dos funciones. Preflight MCP PASS y escritura
  denegada. Credencial fuera de Git.
- Loopback por defecto; Compose OE6 no publica puertos mediante `ports`. El futuro
  acceso de Mobile exige reverse proxy TLS/firewall autorizado.
- PostgreSQL sintético, CCD y sus volúmenes permanecen separados. No se modificaron
  roles ni datos CCD mediante el aprovisionamiento MCP.
- Ocho avisos Mobile clasificados en
  `eval/oe6/mobile-dependency-security.md`: 5 altos, 3 moderados, 0 críticos. No se
  aplicó el fix mayor incompatible con Expo SDK 57.
- Imagen backend construida: `banuchat/backend:oe6-local`, 156.051.405 bytes.
  Compose base y perfiles `operations`, `ollama-container`, `ccd-auth` pasan `config`.
- La topología usa red host Linux con listeners loopback para conservar las guardas
  existentes. Debe verificarse en el host receptor; no se declara portable a cualquier
  Docker Desktop ni producción pública.
- La prueba de arranque confirmó esa limitación: el core containerizado no alcanza el
  daemon Ollama de Windows por `127.0.0.1`. En Linux se debe usar el daemon del mismo
  host; en Docker Desktop se requiere el perfil `ollama-container` con modelos cargados.
  El E2E RAG local acreditado en OE6 fue host-native, no se reetiqueta como containerizado.

## Matriz de cierre OE1–OE6

| OE | Actividades/componentes/entregables | Evidencia y métricas | Estado | Bloqueo/trabajo indispensable |
| --- | --- | --- | --- | --- |
| OE1 | Corpus, retrieval, evaluación y protocolo RAGAS | K2: MRR@5≈0,8519, Recall/Hit@5=1; artefactos OE1 | Parcial | Revisión humana del banco y RAGAS CCD real autorizada |
| OE2 | Ingesta reproducible, publicación versionada, N8N y fixtures declarados | N3 real: 76 items, 12 versiones, 60 embeddings; segunda corrida `already_current` | Parcial | Fuentes institucionales autorizadas, scraping real y actualización <24 h |
| OE3 | Agente acotado, seis tools MCP, citas y trazas | OE6 elimina bloqueo DB: 6/6 tools reales y E2E integrado PASS | Parcial | Ciclo ReAct gobernado por LLM y evaluación de decisiones no acreditados |
| OE4 | Webhook conversacional N8N y calendario por release | 10/10 N8N/MCP PASS; OE4 calendar real local `unchanged` 263 ms | Parcial | Google Sheets real, credencial, sincronización fuente→release ≤30 min y E2E institucional |
| OE5 | Expo SDK 57, auth, chat/historial/citas/recursos, recordatorios locales, protocolo SUS | 38/38 tests, Doctor 21/21, API CCD real PASS | Parcial | Push remoto, Android/iOS físicos y SUS ≥10 estudiantes/5 tareas |
| OE6 | Compose/imagen, identidad MCP, E2E, rendimiento, fallos, backup y manual | Evidencias OE6; medias <5 s; restore 16/16; recuperación N8N 10,2 s | Parcial | Servidor UNAB, TLS/DNS, carga concurrente/soak, operación/monitoreo y cierre humano |

## Esfuerzo restante estimado

Corrección aritmética: las actividades enumeradas suman **23–41 jornadas-persona**,
no 20–36. La estimación sigue dependiendo de accesos y aprobaciones; el rango histórico de
4–7 semanas calendario. Desglose: recepción/TLS/secretos/monitoreo 3–5 jornadas;
fuentes y Sheets institucionales 5–10; carga/soak/hardening 3–5; Android+iOS+push
5–8; revisión RAGAS y banco 2–4; sesiones SUS y consolidación 3–5; cierre académico
2–4. Reclutamiento, consentimientos, credenciales y agenda institucional pueden
ampliar el calendario y no se resuelven con más código local.

## Conclusión

BanuChat funciona como sistema integrado local sintético y como composición CCD
autenticada separada. El paquete está listo para transferencia técnica y para una
recepción controlada, **no desplegado institucionalmente**. Para afirmar cumplimiento
de los seis objetivos faltan las dependencias institucionales/humanas y la validación
operacional concurrente descritas arriba.

Estado operacional al cierre: las APIs temporales se cerraron; `banuchat-postgres` y
`banuchat-n8n` volvieron al estado detenido en que se encontraron. PostgreSQL CCD
canónico en 55453 y el laboratorio I1B se dejaron en ejecución sin cambios de roles
ni corpus. El workflow conversacional N8N queda publicado en su volumen para el próximo
arranque; la identidad MCP mínima queda en la base sintética. No se eliminaron
contenedores persistentes, volúmenes, backups ni releases.
