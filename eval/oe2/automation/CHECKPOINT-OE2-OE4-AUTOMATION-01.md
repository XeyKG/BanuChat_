# BanuChat — OE2/OE4-AUTOMATION-01 — checkpoint final

**29 de octubre de 2026, Bogotá.**
**`BANUCHAT_OE2_OE4_AUTOMATION_VALIDATED`**, limitado a fixtures y condiciones probadas.

Se reutilizaron el registro cerrado de tres fuentes, parser JSON estricto,
`SafeReader`, normalización y hashes, comparación de registros, snapshot atómico,
journal, servidor HTTP OE2 y los tres exports con schedules de seis horas. Faltaban
despliegue/configuración en Unified, comprobación del scheduler, admisión según
estado y errores observables. Los exports no estaban importados en Unified.

## Resultado funcional

Los clones de oferta, convocatorias y novedades ejecutaron **11 fases por tres
categorías: 33 ejecuciones controladas del scheduler**. Otras tres ejecuciones
`unchanged` finalizaron durante la desactivación; el total observado fue **36**, con
15 éxitos y 21 errores esperados de los escenarios de rechazo. Todas tienen
`mode=trigger`, `retryOf=null` y trazas de nodos reales. No se usó ejecución manual
de workflow para producir esos resultados.

| Fase, ejecutada en las tres categorías | Resultado observado |
| --- | --- |
| Adquisición inicial | Dos registros normalizados nuevos por categoría |
| Repetición | Dos sin cambios; snapshot idéntico byte a byte |
| Cambios | Una alta, una modificación y una baja por categoría |
| Duplicados | Rechazo; último snapshot conservado |
| Fuente vacía | `SOURCE_EMPTY`, HTTP 422; sin borrado masivo |
| Fecha imposible | Rechazo de 30 de febrero; sin normalizarla a marzo |
| Fuente ausente temporalmente | `SOURCE_UNAVAILABLE`, HTTP 503; estado anterior conservado |
| Fallo de status | No se invoca run |
| Respuesta perdida | Backend guarda y responde 200 al proxy; N8N recibe fallo, consulta status y termina con error |
| Recuperación | La activación siguiente consulta estado y obtiene `unchanged`, sin reescribir |
| Escritor ocupado | Status `running`; no se invoca run ni recovery automático |

Cada fase de espera/observación tardó entre **9003 y 19089 ms**; incluye espera al
siguiente disparo, no mide latencia institucional. Los tiempos individuales de
ejecución, requests, nodos e IDs están en
[el resumen público](results/2026-10-29-summary.json). El intervalo de prueba fue
10 segundos; los exports base permanecen a seis horas e inactivos.

El backend ahora excluye escritores simultáneos por categoría con un lease sin
caducidad automática; rechaza estados alterados, duplicados, fechas civiles
imposibles y fuentes vacías; utiliza temporales únicos para el reemplazo atómico y
registra resultados, cambios, duración y correlación. N8N comprueba `idle` antes de
run. Un error de run conduce a una sola consulta de estado y a un error observable;
no hay retry de nodos, reenvío ciego ni recovery de ingesta. Los cuerpos existentes
de run/status y campos de `Oe2RunResult` se conservan. El header de correlación es
opcional; status añade información operacional. REST público y MCP no cambiaron.

## Aislamiento y estado final

Se usaron copias privadas de los fixtures autorizados, raíz de estado separada,
credencial nueva solo para OE2 y otros IDs de workflow. No se modificaron fuentes
originales ni se consultaron sitios institucionales. La primera preparación se
detuvo antes de importar/activar workflows por un bloqueo de la sonda del evaluador;
se corrigió la llamada síncrona y se conserva el resultado privado de ese intento.

Los fingerprints read-only de **38 tablas accesibles al rol runtime** coincidieron
antes/después de los escenarios. Se conservaron CCD 1.4.0, su current, versiones,
datos auxiliares y datos de cuentas/historial legibles por ese rol. No se amplió
acceso a fragmentos ni se conectó un escritor SQL. La definición, versión y estado
activo del workflow conversacional coincidieron antes/después. Los reinicios
locales de N8N necesarios para registrar y desregistrar los clones implicaron una
interrupción breve de disponibilidad; no se recrearon contenedores ni volúmenes.

Los tres clones terminaron **inactivos**; durante los 12 segundos posteriores a la
desactivación no aparecieron ejecuciones adicionales. Los servicios de prueba en
3011/3014 se cerraron. N8N terminó con health 200, su webhook conversacional devolvió
200 con correlación válida y la API habitual en 3004 conservó su desafío anónimo
401. PostgreSQL siguió activo. No se modificó ni reabrió Agent/MCP.

## Validación e integración

- `npm run typecheck`: PASS.
- `npm run build`: PASS.
- `npm test`: **247 PASS / 0 FAIL / 0 SKIP** en la corrida final, incluidas 15
  pruebas OE2. La primera corrida tuvo 243/247 y cuatro errores de lectura de
  schemas en la ruta OneDrive; la causa concreta no se acreditó. Esos cuatro casos
  pasaron en la comprobación focal y después pasó la suite completa, sin cambiar
  corpus ni `SafeReader` para hacerlos pasar.
- `npm run evaluate:oe2`: referencia independiente, **6/6 registros y 42/42 campos**.
  Esta corrida directa informa cero ejecuciones N8N; las 36 observadas pertenecen
  al ensayo del scheduler, no a esa medición en memoria.
- `node --import tsx test/oe2-automation/run-scheduler.ts`: PASS, 11 fases en tres
  categorías y desactivación verificada.
- `git diff --check`: ejecutado sin errores.

Los snapshots **todavía no se reflejan en los servicios de BanuChat**. La ingesta
actual exige un candidato completo aprobado con identidad inmutable de fuente,
manifiesto, procedencia y publicación por release; no existe un adaptador OE2 para
esas tres categorías. La sincronización OE4 de calendario no sustituye ese mapeo.
No se implementó un publicador nuevo ni se insertaron fixtures en CCD o auxiliares
del usuario. Para integrar después harán falta un contrato de proyección revisado,
dataset de demostración aislado, aprobación del candidato y pruebas del cambio de
release visible desde los servicios.

La ejecución periódica local aporta evidencia operativa a OE2/OE4; no acredita
scraping, actualización institucional en seis horas o menos de 24 horas, BPM general
ni completitud de los objetivos académicos. Un bloqueo dejado por un proceso
terminado requiere inspección del operador. Un cierre forzado del evaluador puede
impedir su `finally`; el runbook indica cómo identificar exclusivamente sus clones.

## Archivos y evidencia

Cambios delimitados a:

- `backend/rag/src/oe2/{flow,main,server,types,errors}.ts` y el apartado OE2 de
  `backend/rag/README.md`.
- `backend/rag/test/oe2-automation.test.ts` y
  `backend/rag/test/oe2-automation/{run-scheduler,n8n-control}.ts`.
- Los tres `n8n/workflows/oe2-*-fixture-v1.json` y su runbook.
- Este checkpoint, [reproducción](README.md) y
  [resultados nuevos](results/2026-10-29-summary.json).

Backups, nueva credencial, snapshots, journal y ejecuciones N8N completas quedan en
`infra/local/oe2-oe4-automation-01/`, excluido de Git. El import temporal de la
credencial dentro del contenedor se eliminó. No se alteraron benchmarks OE1,
resultados históricos, corpus, esquemas SQL, modelos ni contratos REST/MCP. No se
ejecutaron DB/E2E de ingesta, Android físico ni las preguntas OE1. Sin commit ni push.
