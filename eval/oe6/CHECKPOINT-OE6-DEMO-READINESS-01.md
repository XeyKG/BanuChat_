# OE6-DEMO-READINESS-01 — consolidación operativa

31 de octubre de 2026, America/Bogota.
Estado: **BANUCHAT_OE6_DEMO_READINESS_VALIDATED**.
Base limpia: `0590265ee30f1b8c6d3ee74e0b3f351a01e71bbd`.
Alcance: computador habitual preparado y sus configuraciones existentes; no
despliegue UNAB, portabilidad general ni cumplimiento completo de OE6.

## Entrega y contradicciones documentadas

Se actualizó el [guion integral](../../docs/operations/final-integrated-demonstration.md)
con orden de arranque, topología, recorrido de once hitos, estados por componente
y cierre seguro. La [matriz de dependencias](../../docs/operations/demo-dependencies.md)
distingue Git, configuración privada, datos/volúmenes, modelos, dispositivo y
autorización institucional, y propone pasos mínimos para una recepción futura.

Los checkpoints OE6 del 25/10 describen demo v1/CCD separados y perfiles Docker;
Unified actual usa REST v2 3004 y PostgreSQL 55463. Se conservan los originales.
Se explicitan también el resumen histórico de AGENTS.md frente al estado de
componentes, el paso de dos a tres GET OE2, Android ahora acreditado y los tokens
de salida anteriores del preflight. No se alteraron resultados históricos.

## Preflight ampliado

Se reutilizan launcher y validadores. Se añaden comprobaciones no destructivas:
N8N health + identidad/volumen + workflow activo/publicado + webhook registrado;
preparación del stdio MCP, contrato de seis herramientas y rol lector efectivo;
current/proyecciones OE2 e historial aprobado para el radar; paquetes nativos SDK 57.
El preflight no inicia servicios, invoca workflows, crea sesiones o ejecuta modelos.

READY, NOT_READY, OPTIONAL_UNAVAILABLE y NOT_TESTED se distinguen por componente.
N8N/MCP necesarios para el recorrido integral; OE2 y Android opcionales para el core.
Un listener inseguro no queda oculto como ausencia opcional. La ejecución autenticada
y la recepción física siguen NOT_TESTED dentro del preflight: se acreditan aparte.
Sin `--running`, el agregado es NOT_TESTED; los reportes pasan a `infra/local/`.

El chequeo inicial detectó reverses ausentes tras la limpieza OE5, no una API caída.
La primera ampliación usó una columna N8N incorrecta y exigió un privilegio ajeno
al entrypoint MCP vigente: se corrigió el comprobador al esquema/uso observados,
sin modificar grants, workflows ni servicios. Se conservan las trazas iniciales.

## Operación real observada

Todas las dependencias ya estaban activas. Se reutilizaron PID/entrypoints de API
y Metro iniciados en OE5 y los volúmenes existentes. No se inició, reinició ni detuvo
ningún servicio en esta ventana. Versiones: Node 24.19.0, PostgreSQL 16.15,
N8N 2.40.5, Ollama 0.35.0, Expo 57.0.31 y React Native 0.86.3.

El [resumen depurado](results/oe6-demo-readiness-2026-10-31.json) conserva las
16 mediciones HTTP del smoke: secuenciales, sin retries, desde fetch hasta cuerpo
JSON/binario leído. Los 16 estados coincidieron con lo esperado, incluido 401 tras
logout; no es una medida de disponibilidad continua.

| Recorrido | Observación |
| --- | --- |
| Login / recursos habituales | Cuenta ficticia existente; progreso/calendario/anuncios de release auxiliar independiente |
| Documento CCD + fuente | 201 con cita CCD; artefacto v2 200, bytes no vacíos; turno 10.487 ms |
| Chat multifuente | 201; N8N y Agent comparten operación, `get_profile_progress` → `get_announcements`, dos llamadas MCP reales, terminal answered; 4.205 ms |
| OE2 | Programación, convocatorias y novedades 200, dos registros por categoría; sin publicación |
| Banu al día | 200, current/predecesora existentes; 0 altas, 1 modificación, 0 bajas, 5 sin cambios |
| Historial / logout | Cuatro mensajes propios reabiertos con citas idénticas; logout 204 y access revocado 401 |

El turno documental supera cinco segundos en esta muestra. No hubo preparación
térmica/residencia controlada ni unload/warm-up deliberado; no se lo compara con
medias/p95 del OE6 histórico ni se declara una meta de latencia satisfecha.

## Muestra Android e integridad

Un YAL-L21 autorizado, Android 10, mismo development build. Muestra reducida:
login/Home, Publicaciones OE2/radar con su resumen, una notificación local de cinco
segundos visible en SystemUI y apertura de Calendario, logout y cero pendientes.
Los taps iniciales ocurrieron durante una transición y no acreditaron login;
se inspeccionó la pantalla y completó el ingreso real, sin modificar la aplicación.
No se repitieron todos los escenarios OE5 ni una evaluación móvil completa.

Se retiraron solo los reverses y XML temporal propios. API, Metro, PostgreSQL,
Ollama, N8N y fuente OE2 permanecen activos. El preflight final es READY; marca el
reverse retirado como OPTIONAL_UNAVAILABLE, estado esperado al cerrar la ventana.

Integridad: 4.239 archivos protegidos iguales; siete tablas CCD, incluidos chunks y
embeddings, coinciden con el snapshot conservado; 107 artefactos/chunks actuales
verificados por contenido/hash. Las seis releases/18 snapshots y todas las filas OE2
son idénticas antes/después. Definición/versiones N8N intactas y schedulers de prueba
inactivos. Veinte tablas protegidas Unified iguales durante el smoke. Solo se
crearon sesiones y conversaciones propias de las cuentas ficticias del recorrido.
Evidencia completa, capturas depuradas y resultados iniciales en
`infra/local/oe6-demo-readiness-01/`, excluido de Git.

## Validación y pendientes

- API: `npm run typecheck` y `npm run typecheck:unified`: PASS.
- `node --import tsx --test test/demo-preflight.test.ts test/ccd-preflight.test.ts`:
  **16/16 PASS**. Launcher `node --check`: PASS; preflight real antes/después: READY
  una vez corregidas las comprobaciones descritas y preparado el USB para la muestra.
- `git diff --check`, privacidad, enlaces locales y alcance: PASS.
- Cambios limitados a preflight/probes, smoke opt-in, pruebas del preflight,
  guion, matriz, resumen y este checkpoint. Sin cambios Mobile, RAG/Agent/MCP,
  prompts, contratos, corpus, modelos, permisos o credenciales.

Se reutilizan las evidencias de caída/recuperación N8N y OE2, concurrencia y backup
con sus límites documentados; no se provocaron fallos antiguos ni se ejecutaron
RAGAS, baseline, scheduler, stress, soak o restore. El restore sintético histórico
no acredita restauración completa de Unified actual. Siguen pendientes segundo
host, servidor UNAB autorizado/TLS/DNS/operación, monitoreo, backup/restore integral
y carga/soak dedicados; iOS, push y SUS tampoco se acreditan aquí.

Sin commit ni push. Se detiene esta macrotarea.
