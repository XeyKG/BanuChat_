# BANU-AL-DIA-01 — checkpoint final

Estado: **BANUCHAT_AL_DIA_ANDROID_VALIDATED**.
Validación: 30–31 de octubre de 2026, America/Bogota.
Base inspeccionada: `278b353e4ca5e6144ba2dcdddd90d5bc22f655c5`.
Alcance exclusivo: publicaciones OE2 ficticias; sin actualidad institucional acreditada.

## Incremento entregado

- Comparador determinista sobre current y su predecesora ready inmediata, con identidad
  categoría/fuente/registro, aprobación, hashes y proyecciones SQL revalidados.
- Lector existente ampliado dentro de una sola transacción REPEATABLE READ READ ONLY,
  conservando rol, marcador, contenedor y controles de aislamiento. Sin migraciones.
- Orden por publicación UTC con seis decimales; empates exactos, current no más reciente,
  historial inválido o superior a 100 releases y candidatos incompatibles fallan con 503.
  No se inventa un desempate por UUID ni se salta una predecesora defectuosa.
- Único GET nuevo: `/api/v2/demo/oe2/changes`, Bearer, filtros cerrados de categoría/tipo
  y límite 1–50. Contadores globales separados de tarjetas filtradas. OpenAPI v2 5.2.0.
- Vista autenticada «Banu al día», filtros, Antes/Ahora, procedencia, enlace a publicación
  actual, retirada sin enlace vigente, estados vacíos, error y reintento. Fechas civiles
  conservadas; instantes mostrados en America/Bogota. Sin notificaciones personales.
- `observed_at` identifica la observación del snapshot, no una primera detección histórica.
  Publicación de origen y publicación en BanuChat se presentan por separado; sin causa inferida.

## Resultado persistido y REST real

Anterior: `1fb9ef0b-f2b9-458f-889f-8fcf837a84f2`, `2026-10-30T14:29:20.148356Z`.
Current: `8ed084d9-2d5e-4f90-8011-99912278b27c`, `2026-10-30T14:29:48.727734Z`.
Resultado: **0 altas, 1 modificación, 0 bajas, 5 sin cambios**.
NEWS-001 cambia exclusivamente resumen y versión de origen. La respuesta HTTP y su schema
se contrastaron contra los candidatos realmente persistidos, no contra una lista de UI.

Autenticación/métodos/filtros: 401/405/400, 165 ms; comparación y schema: 593 ms;
repetición, filtros y rutas OE2 anteriores: 3081 ms. Todas PASS.
Con la fuente OE2 detenida: changes 503 saneado; me/progress/history 200, 260 ms.
Tras restaurarla, la respuesta completa coincide con la inicial. No hubo publicaciones nuevas.

## Android físico

Un YAL-L21 autorizado, Android 10; development build existente, Expo SDK 57,
API 3004, Metro 8084 y USB reverse reutilizados, sin instalación ni proyecto nativo nuevo.
Se ejecutaron login, Home, radar, resumen, filtros, expansión Antes/Ahora, fechas,
enlace a publicación actual, Back/Home, error real de dependencia, reintento y logout.
Con OE2 detenido, el chat CCD respondió desde la aplicación con una cita de la release
`10af4ffd-effb-41fc-bbfe-4dc48cb3398f`. La fuente siguió detenida hasta recibir esa respuesta.
Quince capturas y trazas privadas; la captura 06 acredita el detalle expandido y la 15 el login final.

Límite: el par vigente no contiene altas ni bajas. En Android el filtro Retirados quedó
correctamente vacío; no se atribuye una tarjeta retirada positiva a esta ejecución nativa.
Altas, bajas, primera release, comparación totalmente sin cambios, cambios de fechas y
sesión expirada se acreditan mediante fixtures/pruebas, sin alterar current para provocarlos.

## Verificación y preservación

- Backend: `npm run typecheck`, `npm run typecheck:unified`: PASS.
- Backend: `node --import tsx --test test/oe2-changes.test.ts test/oe2-demo.test.ts test/auth-v2-contract.test.ts`:
  **20/20 PASS**. Cobertura reproducible A–N, incluidos corrupción, empates, aprobación,
  observación sin cambio, identidad estable y preservación del historial en memoria.
- Mobile: `npm run typecheck`: PASS; `node --import tsx --test test/oe2-changes.test.ts test/oe2-demo.test.ts test/auth-session.test.ts`:
  **14/14 PASS**. Fechas, procedencia, retirados, estados y transporte autenticado.
- `git diff --check` y revisión de archivos nuevos: PASS; sin cambios fuera del alcance.
- Lectura íntegra antes/después: **6 releases ready, 18 snapshots**, candidatos y filas
  proyectadas idénticos. Veinte tablas protegidas Unified y tres configuraciones privadas iguales.
- Current CCD 1.4.0, auxiliares habituales, modelos y workflow conversacional conservados.
  Workflows OE2 de prueba inactivos. Sin cambios de código en RAG, Agent, MCP, SQL, corpus,
  benchmark OE1, REST v1 o paquetes. Solo se usaron sesiones/chats ficticios propios del ensayo.
- Estado final observado: API 3004, PostgreSQL Unified 55463, fuente OE2, Ollama 11434,
  N8N 15679 y Metro 8084 disponibles; N8N health 200. Android terminó con logout.
  La API habitual se recargó mediante su entrypoint normal para servir el incremento.

Archivos: comparador/lector, recurso y router API, OpenAPI/contrato/README, evaluador REST
reproducible, pruebas API; cliente/vista/tarjeta móvil, entrada OE2, ruta protegida,
allowlist GET, README y pruebas Mobile; este checkpoint y su [resumen saneado](results/2026-10-31-summary.json).
Payloads, capturas y configuración permanecen privados en `infra/local/banu-al-dia-01/`, excluido de Git.
No se repitieron OE1, RAGAS ni scheduler acelerado. Sin commit ni push.
