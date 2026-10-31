# BanuChat — dependencias y reproducibilidad de la demo

OE6-DEMO-READINESS-01, 31/10/2026. Complementa el
[procedimiento vigente](final-integrated-demonstration.md). Verificar una recepción
en otro computador sigue siendo trabajo separado; no se ensayó aquí.

## Matriz de reproducción

✓ indica dependencia necesaria; «parcial» distingue recetas versionadas de recursos existentes.

| Componente | Disponible en Git | Configuración privada | Datos/volumen existente | Modelo descargado | Dispositivo | Autorización institucional |
| --- | --- | --- | --- | --- | --- | --- |
| API v2 / Agent / MCP | Código, contratos, pruebas y entrypoints | ✓ Roles, claves y parámetros locales | ✓ Unified/auth/auxiliares | Para búsquedas documentales | No para REST | No para fixture local; sí para exposición institucional |
| Document RAG CCD | Código, políticas y manifests públicos limitados | ✓ Configuración de lectura | ✓ CCD 1.4.0 depurado y volumen protegido | ✓ Dos modelos/revisiones fijados | No para REST | El corpus local tiene alcance autorizado limitado, no aval ni publicación libre |
| Auxiliares ficticios | Código/recetas; no credenciales | ✓ Binding de cuentas | ✓ Release auxiliar publicada | No para lecturas directas | No para REST | No representan sistemas académicos reales |
| N8N conversacional | Workflow/contrato y código de integración | ✓ Token de servicio/configuración | ✓ Volumen N8N con publicación y credenciales existentes | No para la admisión determinista | No | Integraciones reales nuevas requieren autorización |
| OE2 / radar | Pipeline fixture, lector, comparator, REST/UI y tests | ✓ Lector opcional estricto | ✓ Seis releases aprobadas y 18 snapshots aislados | No para esas lecturas | No para REST | Fixtures no acreditan actualización institucional |
| Mobile | Código y configuración SDK 57 | URL local/canal y sesión | Build instalado y SecureStore del dispositivo | Usa backend | ✓ Android para recepción física | No para la demo autorizada; estudiantes/SUS requieren protocolo y consentimiento |
| Cuentas ficticias | Código auth y custodia operativa, sin secretos | ✓ DPAPI del usuario/equipo Windows | ✓ Cuentas, binding y permisos existentes | No | Para login nativo | No se crea identidad institucional |
| Modelos / Docker | Nombres, digests, recetas/Compose históricos | Parámetros de ejecución del host | ✓ Volúmenes ya preparados | ✓ Binarios locales | GPU/CPU del host afectan tiempos | Servidor receptor requiere permisos/operación propios |

Un clon Git no contiene passwords, tokens, cuentas DPAPI utilizables en otro Windows,
todo el corpus CCD no público, los modelos, el build ni los volúmenes aprobados.
El preflight debe fallar de forma explicable; no aprovisionar sustitutos para aparentar
reproducibilidad. `data/synthetic` sigue congelado y no es fallback documental silencioso.

## Dependencias del host y corrección mínima propuesta

| Acoplamiento observado | Límite y siguiente paso mínimo; no ejecutado aquí |
| --- | --- |
| Windows/PowerShell, DPAPI y Android SDK bajo LOCALAPPDATA | Documentar usuario custodio y herramientas; en una recepción autorizada preparar custodia propia, sin copiar secretos en Git ni resetear las cuentas actuales |
| OE2 en red host Linux, contenedor/volumen/rol/marker exactos | Conservar el adaptador Docker/psql. Antes de otro host, validar identidades y soporte Docker; cualquier allowlist configurable requiere revisión explícita. No cambiar transporte sin defecto demostrado |
| Loopback Windows no equivale al loopback Linux de Docker | Usar los entrypoints host-native validados. El perfil Docker histórico tiene evidencia propia, no se presenta como el despliegue Unified actual |
| Publicación N8N y configuración fuera del JSON de workflow | Preservar volumen/versión publicada y token. Una importación de archivos no acredita un webhook operativo |
| Log privado del proceso API existente | Registrar PID/entrypoint y stdout al arrancar; el smoke acepta BANUCHAT_DEMO_API_LOG. Sin trazas correlacionadas, declarar esa observación NOT_TESTED |
| Puerto Metro abierto y APK instalado | Confirmar configuración del proyecto y SDK 57; validar UI/recepción en el teléfono. Un status 200 no prueba bundle, permiso o entrega |

No se reestructuran Docker, PostgreSQL, roles o contratos para corregir estos
acoplamientos documentados. Falta ensayar un segundo entorno independiente.

## Diferencias explícitas frente a documentos históricos

Se conservan los checkpoints y resultados originales; no se reetiquetan ni corrigen sus métricas.

| Documento/estado anterior | Producto o procedimiento vigente |
| --- | --- |
| AGENTS.md, texto resumido de implementación: Agent/MCP pendientes y N8N fuera del síncrono | Sus reglas de seguridad/datos siguen vigentes; el estado específico se consulta en componentes/checkpoints. Unified incorpora admisión N8N y Agent/MCP en la rama multifuente; no en toda consulta |
| Checkpoints OE6 y cierre técnico del 25/10: demo v1 sintética y CCD v2 separados | Unified habitual es v2 en 3004/55463 con corpus y auxiliares aislados lógicamente. No arrancar las APIs/laboratorios históricos como reparación |
| Cierre técnico: Android/ADB no disponible | YAL-L21/Android 10/build SDK 57 acreditados después. Aun así se vuelve a comprobar ADB en cada ventana; iOS/SUS siguen pendientes |
| Procedimiento ENTREGA-01: N8N no disponible y chequeo TCP informativo | Workflow actual publicado y E2E Unified acreditado. El preflight nuevo verifica health/publicación/registro, sin equivaler a una ejecución autenticada |
| PRODUCT-OE2-MOBILE-04: REST v2 5.1.0, dos rutas OE2 | Banu al día añade el tercer GET, contrato v2 5.2.0. No introduce OE2 en chat/MCP/RAG |
| Preflight anterior: PREREQUISITES_CHECKED / DEPENDENCY_CHECKS_PASSED | Salida actual READY / NOT_READY / OPTIONAL_UNAVAILABLE / NOT_TESTED por componente; reportes en infra/local/oe6-demo-readiness-01 |
| OE5 anterior: validación nativa pendiente | Notificaciones locales ya probadas en Android; push remoto/FCM/APNs, iOS y estudiantes no acreditados |

## Evidencia histórica reutilizable y límites

| Evidencia | Qué conserva su utilidad | Qué no demuestra en Unified actual |
| --- | --- | --- |
| [OE6 inicial](../transition/banuchat-oe6-checkpoint.md), 25/10 | Método HTTP, fallo seguro, restricciones de red y mínimo privilegio | Sus diez muestras por rama no son latencias actuales ni un SLA |
| [Cierre técnico](../transition/banuchat-technical-closure-checkpoint.md), Docker y concurrencia 1/2/5 | Conectividad y warm-up del perfil Docker ensayado; 90 turnos históricos | Capacidad/soak de esta composición host-native, otro host o UNAB |
| [Backup/restore sintético](../../eval/oe6/results/oe6-backup-restore-2026-10-25.json) | Restore aislado y 16 huellas del dataset de esa prueba | Restauración integral de Unified/auth/CCD/auxiliares + N8N + OE2. Falta un protocolo y ensayo específico, sin ejecutarlo automáticamente |
| [PRODUCT-INTEGRATION-03](../../eval/product-integration-03/RESUMEN-FINAL.md) | E2E real, releases y correlación; caída N8N anterior con 503 y sin duplicados | Otra caída provocada hoy o disponibilidad continua |
| [PRODUCT-OE2-MOBILE-04](../../eval/product-oe2-mobile-04/CHECKPOINT-PRODUCT-OE2-MOBILE-04.md) y [radar](../../eval/banu-al-dia-01/CHECKPOINT-BANU-AL-DIA-01.md) | Fuente OE2 detenida, core/chat conservados, restauración sin nueva publicación | Frescura institucional o otra interrupción hoy. Se reutilizan sin detener servicios |
| [OE5 local](../../eval/notifications/results/CHECKPOINT-OE5-NOTIFICATIONS-01.md) | Recepción, cancelación, deduplicación y cuentas en ese Android | Entrega tras reinicio/Doze prolongado, otros OS, push o SUS |

La muestra actual es pequeña, secuencial, sin preparación térmica controlada y con
estados HTTP esperados explícitos. La latencia documental observada puede superar
cinco segundos sin que eso autorice cambiar modelos o reinterpretar la evidencia
histórica. No comparar medias o percentiles de protocolos distintos.

Pendientes OE6: recepción en segundo host, servidor UNAB autorizado, TLS/DNS/firewall,
custodia y rotación operativa de secretos, monitoreo, backup/restore de la composición
vigente y carga/soak en una ventana dedicada. Permanecen separados de la aceptación
académica y de las validaciones institucionales/humanas de los demás objetivos.
