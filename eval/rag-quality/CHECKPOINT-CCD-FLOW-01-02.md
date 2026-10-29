# CHECKPOINT BANUCHAT — CCD-FLOW-01/02

Fecha: 29 de octubre de 2026, America/Bogota.
Estado: **CCD_FLOW_01_02_IMPLEMENTED_VALIDATED**.

## Alcance

Rama `main`; HEAD inicial `643d150af6f6a731916cf876624a2b320e7e2228`;
árbol inicial limpio. Se consultaron AGENTS.md, backlog de OE1-CIERRE-02,
protocolo CCD14, diagnóstico privado y dependencias directas del flujo CCD.

Código modificado: `backend/api/src/chat/ccd-knowledge.ts`. Código nuevo:
`backend/api/src/chat/ccd-query-intent.ts`. Pruebas nuevas:
`backend/api/test/ccd-query-selection.test.ts`. El resumen técnico público está en
`results/ccd-flow-01-02-summary.md`. No se alteraron otros componentes productivos.

FLOW-01 resuelve sujeto, entidad, aspectos y periodo antes de las presentaciones
canónicas, diferenciando consultas académicas, procedimientos, historia y acciones.
FLOW-02 selecciona evidencia material por atributo y entidad, con compatibilidad
temporal/poblacional y abstención explícita. No contiene IDs ni preguntas del
benchmark como reglas. Se reutilizaron metadatos y resolución conversacional.

## Verificación ejecutada

Desde `backend/api`:

```text
npm run typecheck
node --import tsx --test test/ccd-query-selection.test.ts test/ccd-knowledge.test.ts test/ccd-knowledge-v2.test.ts test/ccd-knowledge-routing.test.ts test/ccd-operational-pilot.test.ts test/conversation-context.test.ts test/ccd-context-adversarial.test.ts test/ccd-mode.test.ts test/ccd-selector-p0.test.ts
```

Typecheck correcto; **127/127 pruebas**, 17 nuevas sintéticas y 110 existentes.
La reproducción inicial de 12 sintéticas había mostrado diez fallos. No se cambiaron
las pruebas existentes para aceptar regresiones.

Comprobación real del componente autenticado con PostgreSQL Unified/Ollama existentes,
sin iniciar ni recrear servicios. Release `10af4ffd-effb-41fc-bbfe-4dc48cb3398f`,
manifest `fde23cabe95c83f5bd632d129312ad68c90624e6ebd489e79e98c6a3d0d96852`;
107 unidades verificadas. Acceso SQL READ ONLY y ROLLBACK, sin persistencia de chat.
Se comprobaron los 13 casos afectados ya conocidos: seis de comprensión y siete
de selección; finalizados sin errores ni abstenciones y con 24 identidades de cita
coherentes con chunk, versión, release, localizador y checksum recuperados.

La primera pasada reveló dos desalineaciones persistentes y un soporte demasiado
general; se corrigieron y se conservaron sus evidencias. Hubo 13 + 3 + 13 consultas
de diagnóstico durante el desarrollo, sin calcular nuevas métricas OE1. La pasada
final y comparación privada documentan los cambios materiales, no solo el estado
de ejecución. No fue evaluación ciega ni revisión humana independiente.

## Evidencia e integridad

Directorio privado ignorado por Git:
`data/ccd/local/oe1-evaluation/ccd-flow-01-02-v1/`.

| Evidencia | SHA-256 |
| --- | --- |
| `operational-final-v1.json` | `e6f3f6c9bc935878be1a53ea87fbcf03fde5c59b160354093b62aa04920c7392` |
| `comparison-private-v1.json` | `20017028c3a5c3337109edec776a96875c3b91822af8b9750bc65b596c1b0d98` |
| `backend/api/src/chat/ccd-knowledge.ts` | `c2f687075c9e717d75be9a779fdc9fae7bec514cf81ed84e7ac85c0cd464ebaa` |
| `backend/api/src/chat/ccd-query-intent.ts` | `aab9515b63cd4ac19cea94e046bc1534fdf883a1ed4bdc8eafd8e1d15aaf707e` |

`initial-integrity.json` conserva los 58 hashes históricos comprobados intactos.
`verification-record-v1.json` registra comandos y resultados; `artifacts-manifest-v1.json`
indexa las evidencias nuevas. El source anterior quedó archivado privadamente.
La implementación actual diverge deliberadamente del código congelado de OE1;
no se actualizó su manifest ni se eludieron sus guardas para ejecutar otro baseline.

Benchmark congelado: `44c7464b8f6a9ecdc34c436205beafb532c7a26bc4d44c1b99d4af98c93275c8`.
Baseline histórico: `8528d8af371f74d47aa1e8ea92b1f63c8fb9b8e6984b9a7cdbc5e27bf43ae58f`.
Manifest CIERRE-01: `62eb07cf5b6579ed07447ce7b715da4e703b4c34303ff175e55ea374e366c4c3`.

## Límites y cierre

Las facetas léxicas no prueban entailment; las comparaciones documentales no
acreditan relaciones institucionales. La selección conservadora puede abstenerse
ante ediciones o poblaciones distintas. No se afirma exhaustividad de todo el gold,
ni mejora cuantitativa general del benchmark. No se realizó E2E HTTP/móvil.

Se conservaron top_k, presupuestos, prompts, modelos, embeddings, SQL, corpus,
releases y servicios. Cero nuevas decisiones humanas o aceptación académica.
No se ejecutaron RAGAS, entrenamiento, baseline ni auditoría completa; no se
avanzó a FLOW-03/04/05. Los resultados históricos siguen describiendo el producto
anterior. No se hizo commit ni push. Se ejecutó `git diff --check` y la comprobación
equivalente para archivos nuevos. No quedan dependencias externas que bloqueen
estas dos correcciones; su generalización requiere validación futura independiente.
