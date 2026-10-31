# Checkpoint único — OE2-PIPELINE-02

Fecha: 2026-10-30. Estado: **BANUCHAT_OE2_PIPELINE_DEMO_E2E_VALIDATED**.
Alcance: publicación y consulta auxiliar ficticia aislada. No es cumplimiento
institucional de OE2 ni publicación documental CCD.

## Resultado acreditado

La ejecución final `run-mvv2hih9` completó N8N → adquisición/validación de tres
snapshots → proyección → aprobación por hash → publicación atómica → consulta
con servicios BanuChat. El detalle depurado, IDs, hashes, tiempos y respuestas
está en [results/2026-10-30-summary.json](results/2026-10-30-summary.json).
El cierre se volvió a comprobar en modo lectura a las 15:11 UTC, sin repetir
publicaciones: [auditoría final](results/2026-10-30-final-audit.json).

| Observación real | Resultado |
| --- | --- |
| Tres clones, scheduler de 10 segundos | 12 ejecuciones `trigger`, IDs 147–158 |
| Primera publicación aprobada | Ejecución 148, 14:29:00.507 UTC; fase 12 529 ms |
| Cambio fixture: modificar NEWS-001, añadir NEWS-003, retirar NEWS-002 | Detectado; aprobación pendiente; `current` anterior conservado; fase 8 678 ms |
| Segunda aprobación instalada por evaluador separado | Publicación en ejecución 153, 14:29:20.152 UTC; fase 10 303 ms |
| Consulta posterior | Novedad actualizada y nueva presentes; retirada ausente; historial retenido |
| Ejecuciones repetidas | Resultado `unchanged`, sin duplicación de releases |
| Fallo SQL tras insertar registros y antes de intercambiar puntero | Rollback real; ninguna release parcial; `current` anterior intacto |
| Dos escritores concurrentes | Uno publica, otro se rechaza; una sola versión nueva |
| Fuente no admitida, aprobación incorrecta y base obsoleta | Rechazadas |
| Rol lector / releases listas | Escritura denegada / inmutabilidad comprobada |

De las 12 ejecuciones, 11 finalizaron correctamente y una (149) recibió HTTP 409
del publicador. Se registró `PUBLICATION_REJECTED`; el evento no acredita una
causa interna más precisa. No hubo retry de ejecución N8N. La exclusión por
concurrencia se acredita separadamente con una prueba determinista sobre SQL.
Se observaron exactamente **dos publicaciones desde el scheduler**, no doce.

Las consultas reutilizan `GET /api/v1/announcements` en una composición aislada
del servidor existente: novedades sin vencimiento inventado, convocatorias antes,
durante y después de apertura/cierre. Programación se publicó y consultó mediante
`getDemoProgramming`, con código, periodo, modalidad, fechas y procedencia;
no se fabricaron cursos. Una comprobación real adicional de solo lectura verificó
fechas `YYYY-MM-DD`, sin cambiar puntero ni número de versiones.

## Cambios delimitados

- `backend/rag/src/oe2/pipeline/projection.ts`: candidatos tipados, semántica de
  categorías, validación cerrada, hashes y aprobación vinculada al contenido.
- `backend/rag/src/oe2/pipeline/publication.ts` e `isolated-schema.sql`: destino
  fixture protegido, relaciones, publicación transaccional, idempotencia y consultas.
- `backend/rag/src/oe2/service.ts` y `main.ts`: factoría existente separada de la
  entrada CLI, conservando exportación y comportamiento del arranque habitual.
- `backend/rag/test/oe2-pipeline.test.ts` y `test/oe2-pipeline/`: pruebas unitarias,
  runtime temporal, orquestador N8N, ocho comprobaciones SQL/servicio y lectura de fechas.
- `eval/oe2/pipeline-02/`: guía, este checkpoint y evidencia depurada.

No se cambiaron contratos REST/MCP, SQL principal, plantillas N8N existentes,
corpus, modelos, benchmarks OE1 ni componentes Agent/MCP. No se añadieron paquetes.

## Integridad y estado final

Se reutilizó una base existente vacía, con siete tablas fixture y dos roles nuevos
limitados. No se creó base/schema ni se copiaron usuarios o datos CCD. Las huellas
de las 16 tablas del baseline sintético y 38 tablas protegidas Unified coinciden
antes/después y entre el inicio del incremento y la ejecución final. La definición,
versiones y configuración del workflow conversacional coinciden.

Se conservan **seis releases listas**: tres del ensayo previo y tres de la ejecución
final. De estas últimas, dos proceden del scheduler y una de la prueba explícita
de rollback/concurrencia, aprobada y publicada directamente por el evaluador.
El `current` fixture final es `8ed084d9-2d5e-4f90-8011-99912278b27c`; no es el
`current` documental CCD.

Los tres clones finales están inactivos, sin nuevas ejecuciones en los 12 segundos
observados tras desactivarlos. Runtime fixture detenido con código 0; PostgreSQL
sintético restaurado a detenido. N8N Unified y su PostgreSQL siguen en ejecución.
Se reinició brevemente N8N para registrar y retirar los triggers. La API habitual
en puerto 3004 no respondió al sondeo final: no se intervino su arranque y no hay
medición inicial que permita atribuir o comparar su disponibilidad. Esto no afecta
la consulta aislada acreditada; tampoco se declara saludable ese servicio habitual.

## Validación ejecutada

- `npm run typecheck`: PASS, incluida la revisión final.
- `npm test`: 252 PASS, 0 FAIL, 0 SKIP, ejecución completa (~30,7 s).
- Pruebas focales OE2 tras separar la factoría CLI: 20 PASS, 0 FAIL
  (incluyen cinco pruebas nuevas; no se suman a las 252 como casos distintos).
- Ocho comprobaciones reales PostgreSQL/servicios: PASS (74, 8, 8, 15, 22, 27,
  10 y 7 ms), más lectura real adicional de fechas: PASS.
- `npm run build`: PASS, incluida la revisión final.
- `git diff --check`: comprobado al cerrar el incremento.
- Revisión de los 14 archivos nuevos/modificados: solo rutas autorizadas,
  whitespace limpio y ninguna coincidencia con las credenciales privadas locales;
  claves y evidencia cruda excluidas de Git.

Intentos restringidos por el sandbox no se contabilizan como PASS. Se conservaron
dos intentos anteriores: uno falló al empaquetar JSONC UMD; otro completó las
comprobaciones funcionales pero salió con código 1 por arrancar accidentalmente
la entrada CLI incluida en el bundle. Se corrigió separando la factoría pura;
la ejecución final acreditada salió con código 0. Se conservaron sus versiones
y evidencia, sin borrados ni reintentos ciegos. La lectura de fechas se acredita
con su bundle adicional separado, sin sobrescribir los artefactos ejecutados.

## Límites pendientes

El REST congelado carece de recurso de programación: se requiere contrato
autorizado para exponerlo públicamente. La app habitual no consume este dataset.
La procedencia se comprobó en el servicio/SQL, no mediante campos inexistentes en
la respuesta REST. No se ejecutaron modelos, OE1, ni pruebas Agent/MCP. No hay
fuentes institucionales, evaluación de vigencia institucional, aprobación CCD,
topología portable ni operación periódica permanente.

No se hizo commit ni push. El incremento termina aquí.
