# CHECKPOINT BANUCHAT — BCH-03 incremento 1

Fecha: 2026-10-21. Estado: preparación implementada y verificada; incremento cerrado.
La integración PostgreSQL CCD NO está finalizada. No se ejecutó carga, embeddings,
recuperación ni generación contra servicios reales en este incremento.

## Decisión ejecutada

Sala de Control aceptó el diagnóstico y autorizó contrato CCD, preparación M01/M12
y diseño del delta aislado. ADR 0006 registra la excepción a la exclusividad
sintética técnica. ADR 0001, SQL inicial y `data/synthetic` se conservaron intactos.
No se declararon resueltos compromisos académicos ni aval institucional.

## Archivos creados y modificados

Nuevos, previstos para versionar sin contenido institucional original:

- `docs/adr/0006-corpus-ccd-seleccionado-local.md`.
- `docs/transition/bch03-increment-1-checkpoint.md`.
- `data/ccd/.gitignore`, `data/ccd/README.md` y `data/ccd/schemas/corpus.schema.json`.
- `backend/rag/src/ccd/prepare.ts` y `backend/rag/src/ccd/cli.ts`.
- `backend/rag/test/ccd.test.ts` (solo texto ficticio).
- `infra/docker-compose.ccd.yml`, `infra/.env.ccd.example` y
  `infra/db/ccd-local-development.md`.

Modificados: `.gitignore`, `AGENTS.md`, `docs/arquitectura.md`,
`docs/transition/ccd-real-data-transition-plan.md`, `backend/rag/README.md`,
`backend/rag/package.json`, `backend/rag/src/index.ts` e `infra/db/README.md`.
Sin nuevas dependencias ni cambios de contrato REST/MCP.

Nuevos locales, excluidos de Git y NO destinados a commit:

- `data/ccd/local/m01-m12/corpus.json`.
- `data/ccd/local/m01-m12/manifest.json` y `pipeline.json`.
- `data/ccd/local/m01-m12/documents/artifacts/ccd-m01.md` y `ccd-m12.md`.

Los outputs de build `backend/rag/dist/` continúan ignorados. No se creó una base,
archivo de credenciales real, contenedor, volumen, workflow ni proyecto nativo.

## Contrato y subconjunto preparado

`ccd-1.0.0`, dataset `banuchat-ccd-local`, versión editorial local
`bch03-m01-m12-local-1`, `synthetic: false`, `local_development_only`.
Estado de validación `team_validated`; `institutional_approval: false`.
La validación del equipo se registra conforme a la instrucción del incremento;
no se atribuye ese estado al libro BCH-01 original, que permanece sin editar.

| Unidad | C | Procedencia comprobada | Contenido admitido |
| --- | --- | --- | --- |
| `ccd-m01` / M01 | C04, C07 | DOC-110 §2 (solo nombres de pilares) y §3; cierre `02_Respuestas_6!D2` | Descripción de tres pilares, sin reconocimiento, insignia ni obligaciones individuales. |
| `ccd-m12` / M12 | C44, C45 | DOC-110 §4 (solo correo); cierre `02_Respuestas_6!D7` | Contacto documentado y orientación; sin horario, piso, extensiones ni ratificación actual. |

Ambas conservan periodo de fuente 202660, población delimitada, vigencia actual no
confirmada, contenido depurado, límites y localizadores. Un documento y un chunk
por unidad: 2 documentos / 2 chunks. No se fuerza banner ni seis H2. El chunk
conserva contenido, contexto temporal/editorial y referencias verificables.

SHA-256 físicos verificados durante la preparación:

- DOC-110: `47365710fe74c6b54605d5d7ddbe4ac62a89f836bb60f3e2c35eef98d397f86d`.
- Cierre BCH-01: `38f952586cae0f87db194a7dbd668acb6e86631564f48025e5b105cb428da214`.
- `corpus.json`: `3c237faf48b1b924b580c6301c3b67b321ddc2d8c0dd8d30000ea2845e88b5d8`.
- Schema ejecutado: `7ace84e45d1871cd952232ca33d073d44c4bdc89596ca04e3f54543dd629f5aa`.

Los hashes de Markdown se registran en el manifiesto. La cadena verificable es
artefacto/chunk → unidad C/M → cierre editorial y DOC-110 → huellas de originales.
No hay una revisión Git inventada para la fuente externa. Se verifican originales
antes/después de derivar y estabilidad del JSON de entrada. La comprobación de hashes
no valida por sí sola significado, autorización o exactitud de una futura respuesta.

## Pruebas y comprobaciones observadas

| Ejecución | Resultado real |
| --- | --- |
| `npm run typecheck` en `backend/rag` | Completó, código 0. |
| `npm run build` | Completó, código 0; CLI compilada ejecutable. |
| `npm test`, ejecución completa fuera del sandbox | 196 pruebas aprobadas, 0 fallos, 0 omitidas; incluye 14 nuevas CCD. |
| Primera corrida completa dentro del sandbox | Interrumpida: fixtures Git no podían escribir `.git/config` temporal. Una reproducción focalizada confirmó `Permission denied`, código Git 128. No se reporta como suite aprobada. |
| `npm run validate:dataset` | 18 archivos, 76 items, 12 documentos, 60 chunks; sin DB/embeddings. |
| `npm run prepare:ccd -- ... --write-snapshot` contra fuentes reales | 2 fuentes verificadas, 2 documentos, 2 chunks, snapshot local materializado; 0 embeddings, sin acceso DB. |
| CLI compilada `node dist/ccd/cli.js ... --write-snapshot` | Mismo SHA de corpus/schema y mismo snapshot; existentes idénticos conservados, código 0. |
| `docker compose -f infra/docker-compose.ccd.yml config --quiet` con valores efímeros de validación | Configuración válida, código 0. No arranque ni comprobación operacional del puerto. |
| `git check-ignore` | Los cinco archivos locales CCD, un hipotético original nuevo y `infra/.env.ccd` quedan ignorados. El ejemplo sin credenciales queda visible. |
| Relectura SHA de los 124 archivos externos contra inventario del diagnóstico | 0 diferencias; incluye las 119 fuentes y cinco auditorías. |
| Diff de `data/synthetic`, ADR 0001 y SQL inicial | Sin cambios. |
| `git diff --check` y revisión de archivos modificados/nuevos | Código 0, sin errores de whitespace; solo archivos del alcance autorizado. Git avisa conversión futura LF/CRLF en `.gitignore` por `text=auto`; no se renormalizó. |

Los tests CCD cubren determinismo, preservación de contexto/procedencia, fuentes
alteradas/ausentes, grupos no autorizados, C cruzadas, duplicados, referencias
editoriales incorrectas, falsa aprobación, campos extra, traversal y no sobrescritura.
Las pruebas de regresión sintética se ejecutaron dentro de la suite completa.
No se ejecutó `test:db`, E2E de ingesta ni evaluación RAGAS. Los fixtures HTTP de la
suite unitaria no son consultas reales a PostgreSQL/Ollama.

## Pendientes concretos para la primera carga

1. Implementar y probar la migración CCD separada de `validate_manifest`; mantener
   el validador v1 y la restricción de dataset único en cada base. No crear tablas
   adicionales: el manifiesto puede conservar la procedencia mínima completa.
2. Añadir la entrada de escritor CCD sobre esta preparación, reutilizando lease,
   intentos, SQL documental, embeddings y publicación. Resolver en esa entrada los
   conteos fijos 6/60/76/12 y la receta/identidad Git exclusiva de v1, sin debilitar v1.
3. Completar credenciales locales, verificar destino vacío y arrancar exclusivamente
   el Compose CCD; aplicar esquema inicial y delta allí. No tocar la base demo.
4. Revalidar snapshot/fuentes, inspeccionar Ollama real, cargar 2 documentos y generar
   2 embeddings. Registrar revisión efectiva de modelos y código ejecutado, sin
   afirmar que el código no commiteado pertenece a HEAD.
5. Cablear SQL y artefactos CCD al servicio documental del backend; corregir solo
   la etiqueta sintética del prompt para este modo. Probar una consulta por grupo,
   una negativa de regla bloqueada y las citas contra Markdown/originales. No crear
   perfiles reales ni una autenticación ficticia para acceder al servicio.

El alcance exacto está en `infra/db/ccd-local-development.md`; no requiere otro
diagnóstico general ni una expansión de corpus. No hay bloqueo de acceso que impida
preparar M01/M12. La actualidad institucional sigue sin ratificarse y debe conservarse
como límite durante las pruebas locales. El incremento termina aquí, sin carga,
commit ni push.
