# BanuChat — estado vigente

Corte: **20/11/2026**, America/Bogota. HEAD de partida `2e31128`; RAG conservado desde `a30088f`, integración MCP/n8n desplegada y cambios de este incremento todavía sin commit. Cliente publicado **1.0.4**, Android versionCode 5. Esta ficha resume implementación y evidencia; no certifica aprobación académica o institucional ni disponibilidad permanente.

## Acceso y composición publicada

- [Web HTTPS](https://banuchat.duckdns.org/login).
- [APK y paquete académico 1.0.4](https://github.com/XeyKG/BanuChat_/releases/tag/demo-1.0.4), acceso sujeto al repositorio privado.
- [Checkpoint consolidado](transition/CHECKPOINT-PUBLICACION-BANUCHAT.md), [entrega académica](transition/ENTREGA-FINAL-BANUCHAT.md) y [recuperación cloud](operations/cloud-demo.md).

El despliegue utiliza la EC2 existente de AWS Academy, Amazon Linux 2023, m6i.large con dos vCPU y 8 GiB. Caddy publica HTTPS por DuckDNS; Node sirve la web y REST v2, Ollama ejecuta los modelos y Supabase aloja PostgreSQL/pgvector. Se conserva una IP elástica y el origen sslip.io de transición. No se requiere el PC para atender solicitudes; el laboratorio y sus créditos condicionan la disponibilidad.

La API utiliza su perfil `managed`, autenticación BanuChat y rol PostgreSQL restringido. Su proceso escucha en loopback; los clientes solo acceden al origen HTTPS. La conexión al pooler de sesión valida certificado y hostname con CA; no se usa la cuenta administrativa para el servicio habitual.

## Dos composiciones que no deben confundirse

| Composición | Datos y recorrido | Frontera |
| --- | --- | --- |
| Publicada: AWS + Supabase | Expedientes sintéticos y suplemento CCD privado; REST v2, fast paths y Document RAG/Ollama en EC2; lector OE2 aprobado opcional | `managed_mcp` admite consultas estructuradas multifuente por n8n/agente/MCP; no activa `unified` ni sustituye el RAG documental |
| Unified local existente | `banuchat_unified`, loopback PostgreSQL 55463 y API 3004; corpus CCD y auxiliares separados; planes multifuente con agente acotado/MCP/n8n según configuración | Requiere archivos privados y servicios locales; no es la receta de arranque de AWS |
| Otros laboratorios | Puertos, bases y snapshots registrados en checkpoints específicos | Históricos o aislados; no promover ni restaurar por deducción desde un README |

`backend/api/src/authenticated-main.ts` admite las ramas por configuración confiable. El launcher `npm start` usa Unified local; el servicio desplegado configura directamente el entrypoint autenticado. No basta ejecutar el launcher local con una URL remota.

Desde el 20/11 se comprobó la rama administrada MCP con su lector de mínimo privilegio y n8n privado en la misma EC2. [Checkpoint del ensayo](transition/CHECKPOINT-MCP-AWS-2026-11-20.md). El editor está en `https://n8n.banuchat.duckdns.org`; sus webhooks solo se usan por loopback.

## Funcionalidades y datos

El cliente web/Android ofrece login, sesión y logout; chat, fuentes, artefactos e historial propios; expediente y recursamiento; calendario mensual; noticias bajo **Banu al Día**; **Publicaciones OE2** y comparación de publicaciones; **Recordatorios** locales Android. La cuenta determina el perfil y la release; elegir un perfil no es autenticarse y la UI vigente no ofrece un selector libre de identidad.

| Fuente | Estado documentado y límite |
| --- | --- |
| Demo sintética migrada | Dos releases, 32 estudiantes, 62 intentos, ocho recursamientos y 120 vectores; inventario de la migración y publicación, no conteo SQL nuevo de esta revisión documental |
| Suplemento CCD | 107 referencias depuradas en release separada; se conservan las seis anteriores: 113 vectores suplementarios, sin mezclar con los 120 sintéticos |
| Publicaciones OE2 | Copia sintética aprobada de solo lectura, fijada por SHA-256: dos programaciones, cuatro convocatorias/novedades, seis versiones aprobadas; comparación: una modificación y cinco sin cambios |
| `data/synthetic` | Fuente histórica congelada y fixtures versionados; no se modifica v1 |
| Fuentes institucionales externas | Sin matrícula, expedientes reales, scraping, Drive/Sheets reales ni federación institucional acreditados |

Los originales privados no se publican en Git ni se entregan por un endpoint de archivos libres. Las citas autorizadas conservan procedencia y las descargas se controlan por la API.

## Persistencia y modelos

- Embeddings documentales: persistentes en PostgreSQL/pgvector, asociados a release y configuración; 1024 dimensiones, coseno exacto. La transferencia conservó contenido, vectores y hashes; no se afirma regeneración completa en cloud.
- Vectores de consulta: generados por Ollama para buscar; no son nuevos documentos del corpus.
- Historial: mensajes y citas persistidos y aislados por cuenta.
- Contexto conversacional: historial acotado para resolver referencias; no es un expediente real ni memoria personal vectorizada.
- Generador `qwen3:4b-instruct`, embedding `qwen3-embedding:0.6b` y runtime Ollama 0.35.0 verificados en la entrega.

## Evidencia más reciente

| Corte | Evidencia real | Lo que no acredita |
| --- | --- | --- |
| [MCP/n8n AWS 20/11](transition/CHECKPOINT-MCP-AWS-2026-11-20.md) | Dos cuentas, consulta MCP, cuatro citas preservadas; nueva consulta documental en 100,029 s, tres artefactos por SHA; reversión de composición y persistencia n8n | No nuevo ensayo Android físico, ReAct LLM ni reinicio completo de EC2 con esta composición |
| [RAG 18/11](transition/CHECKPOINT-RAG-PERTINENCIA-2026-11-18.md) | 192 tests CCD + 72 contratos/evidencia; 24 turnos HTTP 201, fuentes/historial, 22 hashes, aislamiento 404 y revocación 401 | No son 24 respuestas completas: seis parciales citadas y cuatro abstenciones; no evaluación ciega ni RAG estable |
| [Cliente 1.0.4](transition/CHECKPOINT-DEMO-1.0.4.md) | Calendario, noticias y OE2 en web/Huawei; firma y sesión conservadas; 77 tests Mobile y 22 API focales | No SUS, push remoto ni compatibilidad de todos los dispositivos |
| [Publicación acumulada](transition/CHECKPOINT-PUBLICACION-BANUCHAT.md) | Supabase, HTTPS, RAG remoto, APK, restauraciones y recuperación según sus cortes | No SLA, hosting permanente ni despliegue en servidores UNAB |
| [OE1 histórico](../eval/rag-quality/results/oe1-cierre02-technical-report.md) | Banco local de 43, resultados RAGAS exploratorios y sus incumplimientos | No nueva medición de calidad para el backend actual ni aprobación del objetivo |

Los ensayos remotos RAG tardaron 1,30–110,28 s. Se conservan los límites API 150 s, cliente HTTPS 175 s y proxy 180 s, así como fallos históricos; una serie satisfactoria no elimina la limitación de dos vCPU.

## Pendientes reales

Faltan datos o alcances en algunos derivados publicados, incluida la duración semanal regular/intensiva y el alcance completo del instructivo por modalidad. Las respuestas parciales deben seguir declarándolo. No se agregan respuestas esperadas de otra herramienta como si fueran hechos verificados.

Siguen sin acreditarse ReAct LLM productivo, conectores institucionales reales, aceptación académica completa, estudio con estudiantes/SUS, metas globales de latencia y continuidad ni hosting independiente permanente. La [matriz OE1–OE6](academic/oe1-oe6-current-status.md) conserva los compromisos originales y sus brechas.

## Precedencia documental

Código/configuración y contratos específicos describen la implementación. Esta ficha y el [consolidado](transition/CHECKPOINT-PUBLICACION-BANUCHAT.md) orientan el estado actual; cada checkpoint y ADR conserva el alcance de su fecha. Las propuestas `*.proposed.sql` no prueban una migración ejecutada. Una prueba local no acredita cloud y una descarga publicada no acredita usabilidad o aprobación institucional.
