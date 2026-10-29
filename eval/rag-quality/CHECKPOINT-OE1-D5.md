# CHECKPOINT BANUCHAT — OE1-D5

Fecha: 28 de octubre de 2026, America/Bogota.
HEAD base: `9a196492d81cd40cd5015e26f5b1c2944a2c21ec`.
Rama: `main`.
Estado inicial Git: limpio.
Estado Git al cierre: únicamente `?? eval/rag-quality/CHECKPOINT-OE1-D5.md`.
Estado final: **BLOCKED**.

OE1-D5 verificó las decisiones privadas del autor y congeló el export aprobado,
pero no pudo completar el preflight de PostgreSQL. No se declara OE1 cumplido y
no se autoriza automáticamente el baseline.

## 1. Respaldo privado

Antes de exportar se creó una copia del ledger en:

`data/ccd/local/oe1-evaluation/review-ledger-v1.oe1-d5-backup-20261028T191030241.json`

El SHA-256 del respaldo coincidió con el ledger original y ambos permanecen
ignorados por Git. El ledger conservó el mismo hash después del export.

## 2. Decisiones verificadas

`node eval/rag-quality/review-bank.mjs summary` informó exactamente 50 candidatas
respondibles y 8 casos complementarios. La validación agregada del banco y el
ledger produjo:

| Estado respondible | Cantidad |
| --- | ---: |
| `approved` | 50 |
| `corrected` | 0 |
| `rejected` | 0 |
| `pending` | 0 |

- 50 decisiones para 50 IDs del banco.
- Cero IDs repetidos, desconocidos o ausentes.
- Las 50 decisiones tienen responsable, motivo y fecha válidos.
- El ledger registra un único revisor, coherente con la declaración de que el
  autor realizó toda la revisión; no se verificó una segunda revisión humana.
- El `bank_sha256` del ledger coincide con los bytes actuales del banco candidato.
- Los 8 casos complementarios permanecen pendientes y fuera de las 50 preguntas
  respondibles.

No se añadió, corrigió ni aprobó ninguna decisión durante OE1-D5.

## 3. Export aprobado

Se ejecutó:

```powershell
node eval/rag-quality/review-bank.mjs export
```

Resultado verificado:

| Campo | Valor |
| --- | --- |
| Ruta privada | `data/ccd/local/oe1-evaluation/approved-benchmark-v1.json` |
| Estado | `approved` |
| `approved_or_corrected` | 50 |
| `gap` | 0 |
| Casos exportados | 50 |
| SHA-256 | `1e007142c2a573d9f2e4403e28b8eaae7dfe03cd31d1a514ee97423a7617609e` |
| Visibilidad | `private_local_ignored` |
| Reserva ciega válida | `false` |

`git check-ignore -v` confirmó que el export está excluido de Git.

## 4. Preflight bloqueado

Se reservó como resultado distinto del baseline final:

`data/ccd/local/oe1-evaluation/results/preflight-oe1-d5.json`

Se intentó únicamente:

```powershell
node eval/rag-quality/run-oe1-evaluation.mjs `
  --benchmark data/ccd/local/oe1-evaluation/approved-benchmark-v1.json `
  --preflight-only `
  --output data/ccd/local/oe1-evaluation/results/preflight-oe1-d5.json
```

Resultado: exit code 1, `Falta POSTGRES_DB.` El entorno tampoco tenía definidas
`POSTGRES_USER` ni `POSTGRES_PASSWORD`, y `127.0.0.1:5432` no aceptaba conexión.
El build `backend/api/dist/index.js` sí estaba disponible. No se creó el archivo
de resultado.

Por tanto, OE1-D5 **no verificó contra el estado real de PostgreSQL** el dataset,
release, contrato, manifest, configuración de embeddings, conteos de documentos,
chunks y embeddings, resolución de contextos gold ni correspondencia entre banco
y publicación. No se forzó un PASS ni se cambiaron credenciales, servicios,
configuración, modelos o corpus.

## 5. Control metodológico

1. Las 50 preguntas fueron revisadas únicamente por el autor.
2. No hay revisión humana independiente ni acuerdo interevaluador.
3. El corpus CCD no tiene ratificación institucional formal.
4. Las 15 `reserve_candidate` fueron visibles durante preparación y revisión; no
   son una reserva ciega válida.
5. El juez `AnswerRelevancy` conserva la limitación de 7/12 coincidencias frente
   a expectativas técnicas no ratificadas humanamente.
6. MRR@5 sigue pendiente de aceptación académica como operacionalización del
   criterio original.

El estado `approved` del archivo significa que el ledger cubre los 50 casos; no
elimina estas limitaciones ni constituye aprobación institucional o cumplimiento
de OE1.

## 6. Límites y siguiente paso recomendado

No se ejecutaron consultas de retrieval, captura de respuestas, baseline ni RAGAS.
No se modificaron RAG, embeddings, chunking, `top_k`, prompts, generador, modelos,
PostgreSQL, releases, corpus, API, MCP, Mobile, N8N, Docker o SQL.

Siguiente paso: restaurar el servicio PostgreSQL local canónico y proporcionar en
el entorno las credenciales ya autorizadas, sin cambiarlas ni documentarlas en
Git. Repetir exclusivamente el comando `--preflight-only` anterior. Solo si ese
preflight pasa puede actualizarse el estado a `READY_FOR_BASELINE_DECISION`; no
ejecutar el baseline ni RAGAS automáticamente.
