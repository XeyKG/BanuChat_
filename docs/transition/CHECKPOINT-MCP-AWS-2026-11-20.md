# MCP, agente acotado y n8n publicados en AWS

**Resultado: integración administrada activada y validada el 20/11/2026.** Se retomó la pausa del 19/11 sin reinstalar servicios, recrear la EC2 ni restaurar bases. La rama comprobada combina fuentes estructuradas sintéticas; Document RAG conserva su recorrido aprobado anterior. No se acredita ReAct dirigido por un LLM ni se afirma que todas las preguntas usen MCP.

Repositorio: `main`, HEAD de partida `2e311284bc95f90fbe106712ad44d56fbba1cf9c`. Se conservaron los cambios documentales previos de la guía. No se hizo commit ni push en este incremento. Web/APK permanecen en 1.0.4: la corrección es de backend y operación, sin nuevo build móvil.

## Despliegue efectivo

| Componente | Estado comprobado |
| --- | --- |
| EC2 | Instancia existente `i-0a726734ca6c6f10d`, m6i.large, dos vCPU/8 GiB, Amazon Linux 2023, us-east-1; IP 34.239.198.159 conservada |
| Web/API | `https://banuchat.duckdns.org`; API 3004 en loopback, detrás del proxy y Caddy existentes |
| Editor n8n | `https://n8n.banuchat.duckdns.org`; n8n 2.40.5 por npm y usuario Linux separado, no Docker del PC |
| Dependencias | Supabase PostgreSQL con roles restringidos y TLS CA/hostname; Ollama 0.35.0 en la misma EC2; modelos conservados |
| Servicios | `ollama`, `banuchat-api`, `banuchat-web-duckdns`, `banuchat-https`, `banuchat-n8n`: activos y habilitados |
| Ensayo aislado | API temporal 3005: detenida al terminar, no habilitada al arranque ni expuesta públicamente |

El propietario encendió el entorno mediante la guía. La comprobación real confirmó su arranque; no hacía falta reinstalar ni iniciar contenedores locales. Después de activar esta nueva composición se reiniciaron sus servicios, pero no se volvió a apagar/encender toda la EC2.

## Recorrido y permisos

1. La API autentica la cuenta y verifica propiedad de la conversación; el principal y perfil se obtienen del contexto autorizado.
2. Solo las consultas estructuradas multifuente admitidas usan `BANUCHAT_AUTH_AGENT=managed_mcp`.
3. La API envía a n8n una operación correlacionada con release, modo y número de fuentes. No envía el token de sesión, la contraseña ni el texto de la pregunta al workflow.
4. n8n devuelve autorización para dos fuentes o aclaración si se requieren más. El agente determinista de TypeScript decide y ejecuta hasta dos herramientas MCP existentes.
5. La API inicia `backend/mcp-server/src/managed-main.ts` mediante stdio. El proceso hijo usa `cloud_mcp_reader`, separado de `cloud_runtime`, y recibe contexto principal/perfil/release/despliegue fijado por el servidor.
6. Cada herramienta comprueba la asociación y los privilegios en una transacción repeatable read de solo lectura. No hay selector HTTP de otro estudiante ni puerto MCP público.

El rol lector fue creado y auditado en la ventana del 19/11; no se volvió a ejecutar su bootstrap mutable. Tiene lecturas explícitas sobre tablas sintéticas y de asociación, y ejecución de dos funciones de recuperación existentes. No puede leer cuentas, sesiones ni tablas académicas completas; no es superusuario, no crea roles/bases, no omite RLS y no tiene membresías. La evidencia TLS de ese ensayo verificó CA y hostname en el cliente; no se confunde con el salto interno que observa `pg_stat_ssl` detrás del pooler.

Los fast paths simples y el RAG documental CCD siguen usando los servicios anteriores. No se activa Unified en el perfil administrado. No se cambiaron modelos, embeddings, corpus, expedientes, esquemas REST ni contrato MCP. Los conteos históricos de releases/estudiantes/vectores no fueron recontados mediante SQL en este incremento.

## n8n y persistencia

Se respaldaron SQLite y su configuración de cifrado antes de importar. Solo se importó y publicó `BanuChatOe4Conversation1`, con cinco nodos: recepción autenticada, validación, decisión, respuesta correlacionada y rechazo. No se importaron ingestas, calendarios, timers OE2 ni conectores Drive.

- Servicio `banuchat-n8n`, loopback 15679, datos en `/var/lib/banuchat-n8n/.n8n`.
- Heap Node 512 MiB, MemoryHigh 650 MiB, MemoryMax 900 MiB y CPUQuota 50%; arranque automático y reinicio ante fallo según el unit versionado.
- Editor con protección adicional del servidor y cuenta propietaria propia. Los dos accesos son distintos de BanuChat y Supabase.
- Webhook sin token interno: 403. Editor y webhook público sin credenciales del editor: 401. Webhook público después de esa primera autenticación: 404, bloqueado por Caddy.
- Dos fuentes: `invoke_bounded_mcp_agent`; tres: `request_clarification`, con operación/release correlacionadas.
- Reinicio real de n8n: conservó el workflow publicado y su credencial cifrada, y volvió a admitir una petición autenticada.

No se guardan payloads de ejecuciones exitosas, fallidas ni manuales. El listado de ejecuciones puede estar vacío. La evidencia de uso son eventos `managed_n8n` y `managed_agent` correlacionados en la API, sin preguntas, cuentas ni secretos; no se habilitó retención para llenar el panel.

## Pruebas reales

La [evidencia saneada JSON](../../eval/integration/results/managed-mcp-aws-2026-11-20.json) deriva del resultado HTTP y hashes conservados en privado. No contiene tokens, contraseñas ni textos CCD.

| Comprobación | Resultado observado |
| --- | --- |
| API aislada 3005 | Dos logins; ocho lecturas protegidas 200; consulta multifuente en 1418 ms, cuatro citas; Historial; conversación ajena 404; selector 400; logout y token revocado 401 |
| API pública por DuckDNS | Dos logins; ocho lecturas 200: identidad, progreso, expediente e historial para ambas cuentas |
| Agente público | «Según mis cursos completados, ¿qué convocatorias activas podrían interesarme?»; HTTP 201, 4,123 s, cuatro citas; todos sus campos iguales al recuperar Historial |
| Herramientas efectivamente ejecutadas en AWS | `get_profile_progress`, `get_announcements`, dos llamadas, terminal `answered`; eventos n8n/agente correlacionados |
| Consulta documental factual aislada | Costos de pruebas diagnósticas: 1183 ms, una cita, respuesta fundamentada, Historial y descarga correctos; no se afirma síntesis LLM en este caso |
| Generación documental nueva pública | Productos digitales y etapas de producción del curso Creación de Contenidos Digitales: HTTP 201, **100,029 s**, tres fuentes, sin insuficiencia; respuesta y citas conservadas en Historial |
| Artefactos documentales públicos | Tres descargas, sin redirección, SHA-256 iguales al manifiesto aprobado de los derivados existentes |
| Aislamiento y sesiones públicas | Conversación ajena 404, selector de perfil 400; logout de ambas sesiones y uso posterior del token rechazado con 401 |
| Navegador real | Workflow n8n Published y cinco nodos; nuevo chat público, respuesta, cuatro fuentes abiertas y reapertura de la misma conversación desde Historial |
| HTTPS final externo | Web 200, API sin sesión 401, editor sin credenciales 401; certificado/hostname verificados sin degradar TLS |

Un evento público observado enlazó la operación `d10888aa-d685-4994-a551-49c4ed5b27e6` entre n8n y agente con las dos herramientas anteriores. La conversación creada por el ensayo gráfico se conservó; no se borró historial para ocultar pruebas.

La generación nueva tuvo un último registro de modelo de unos 95,97 s: evaluación del prompt 72,82 s y generación 14,78 s. Son métricas de una ejecución, no percentiles ni un estudio de rendimiento. Se observaron cargados ambos modelos en Ollama. Tras el ensayo: 7779 MiB totales, 5307 usados y 2233 disponibles, sin swap; la muestra no prueba estabilidad bajo concurrencia.

### Chequeos locales de cierre

- API y MCP: `npm run typecheck`, ambos correctos; API repetido después de corregir etiquetas.
- API: 72/72 en `managed-mcp-agent`, `conversation-detail`, `messages`, `auth-handlers` y `auth-v2-contract`. Incluyen el comportamiento de la rama, fuentes, autenticación y reconstrucción histórica. Las doce pruebas administradas forman parte de esas 72; no sumarlas otra vez.
- MCP: 17/17 en `managed-runtime`, incluyendo configuración estricta, destino/privilegios/asociación y arranque sin secretos cuando falta configuración.
- La suite MCP completa 44/44 y otras regresiones acreditadas antes de la pausa mantienen su corte; no se repitieron todas.
- Guía PDF regenerada con dependencias del runtime, 16 páginas finales. Render con Poppler y revisión visual de páginas y secciones nuevas.
- Revisión dirigida de secretos y `git diff --check` al cierre; no se incluyen los archivos privados de operación.

## Fallos encontrados y correcciones

1. El primer ajuste de fuentes se detuvo antes de escribir por una diferencia LF/CRLF del script de preparación. Se corrigió el transporte y se verificaron hashes antes de copiar; no se repitió el stage original.
2. La API de ensayo no cargaba `/etc/banuchat/api.secret`, aunque la API habitual sí. Se añadió ese mismo archivo a su unit, sin copiar valores ni tocar la configuración original. Arranque correcto después.
3. Un ensayo documental exigía cinco citas aunque una sola sustentaba la respuesta. Se corrigió la aserción, sin cambiar la aplicación ni rellenar fuentes artificialmente.
4. La comparación pública detectó una diferencia real de etiquetas: el agente devolvía nombres y el historial añadía el tipo de fuente. El adaptador administrado ahora reutiliza el prefijo canónico del lector histórico. Se probaron contenido, orden y todos los campos de las citas contra la API real después de desplegarlo.
5. Los logins repetidos alcanzaron el límite vigente de cinco intentos por UID en una ventana fija de quince minutos. Se respetó el bloqueo y se retomó en la ventana siguiente; no se borraron contadores ni se debilitó la autenticación.
6. Dos interrupciones de Computer Use por verificación de URL cortaron turnos anteriores. Se recuperó el estado y resultado reales de AWS; no se supuso éxito ni se reenviaron importaciones.

## Activación, respaldo y reversión

El drop-in `managed-mcp.conf` añade la configuración privada del lector/n8n y el archivo final de activación. Conserva `api.env` y `api.secret`, el puerto 3004 y los ajustes anteriores. Su dependencia de n8n es `Wants`, no `Requires`: no se fuerza a detener toda la API cuando falla una capacidad opcional. Las preguntas estructuradas dependientes de n8n fallan de forma cerrada; no se inventa una respuesta de sustitución.

Se ensayó retirar temporalmente solo ese drop-in a un respaldo, recargar systemd y reiniciar la API. Se comprobó arranque de la composición anterior, ausencia de la bandera MCP en el proceso y 401 sin sesión. Después se corrigieron etiquetas, se reactivó el drop-in y se completó el ensayo funcional público. No se ejecutó una reversión de base ni se borró ninguna release. La API de ensayo quedó detenida.

Respaldo remoto: `/opt/banuchat/backups/managed-mcp-20261119-01`, con fuentes/configuración previas, `n8n-before-import`, `resume-20261120` y `citation-fix-20261120`. Los hashes verifican antes y después. La evidencia saneada del servidor quedó persistida en `evidence-20261120`, fuera de `/run`; los diagnósticos y archivos de configuración siguen privados. No repetir los scripts iniciales sobre respaldos o roles ya existentes.

Para una reversión administrativa futura: comprobar el estado y el respaldo, retirar únicamente el drop-in a un destino nuevo y verificado, recargar systemd y reiniciar la API. No usar `BANUCHAT_AUTH_AGENT=disabled`: ese valor no forma parte de la configuración admitida. Conservar n8n y los datos; no restaurar snapshots ni revocar roles por deducción.

## Cambios locales y entrega

- API: nuevo adaptador `managed-mcp-agent.ts`, composición optativa en `authenticated-main.ts`/`authenticated-runtime.ts`, contexto autorizado por turno en `auth/resources.ts`, exportación de `planningSubject` y del prefijo histórico de citas; pruebas focales nuevas.
- MCP: `managed-runtime.ts`, `managed-main.ts` y pruebas; sin modificación del contrato de seis herramientas.
- Infra: preflight/rol lector bajo `infra/db/managed-mcp`; instalador n8n, units n8n/ensayo y drop-in de activación. No ejecutarlos como receta genérica sobre otros destinos.
- Documentación: guía Markdown/PDF, estado, arquitectura, operación, README/índice y matriz académica actualizados para separar cloud, laboratorio histórico y límites. `AGENTS.md` actualiza su resumen técnico sin retirar las restricciones de datos.
- Resultados: JSON saneado enlazado; scripts y logs privados permanecen bajo `infra/local` o directorios privados del operador/servidor.

[Guía actualizada para presentar](../operations/GUIA-PRESENTACION-BANUCHAT.md) · [PDF](../operations/GUIA-PRESENTACION-BANUCHAT.pdf) · [Pausa histórica y continuidad](CHECKPOINT-MCP-AWS-PAUSADO-2026-11-19.md).

## Límites y pendientes reales

- La generación de 100 s sigue siendo lenta; se conservan API 150 s, cliente 175 s y proxy 180 s. No se declara RAG estable ni meta general de cinco segundos cumplida.
- No se repitió Android físico ni el apagado del PC durante este cambio de backend. Se conservan APK, firma, origen y contratos; la verificación remota acredita ejecución en AWS, no una nueva prueba física.
- No se reinició toda la EC2 con la composición final. Sí se comprobaron servicios habilitados, reinicios de API/n8n y reversión de configuración.
- No se ejecutaron en AWS las dos herramientas documentales MCP en este cierre. La evidencia real del chat corresponde a las dos herramientas estructuradas indicadas; el RAG documental mantiene su camino directo.
- No hay Drive/Sheets, ingesta cloud automática, matrícula institucional ni ReAct LLM acreditados. La integración técnica no es aceptación del anteproyecto ni aval institucional.
- Learner Lab observado Ready, **US$13,40 usados de US$50**: aproximadamente US$36,60 según el panel, con posible retraso de actualización. No se creó otro recurso de pago ni se cambió el tamaño de EC2. El servidor necesita laboratorio activo y crédito; IP/DuckDNS no garantizan permanencia.
- No se hizo commit/push. Los cambios de código, documentación y evidencia quedan locales para revisión y versionado explícito.
