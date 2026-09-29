# Implementación 3 — evidencia E2E del 2026-09-29

Implementación 3 validada E2E dentro del alcance aprobado. Registro documental
de la ejecución real ya realizada; no corresponde a una nueva ejecución.

## Entorno

- Ollama: 0.34.4.
- PostgreSQL: 16.15.
- pgvector: 0.8.6.
- Modelo: `qwen3-embedding:0.6b`.
- Integración DB y E2E utilizaron bases nuevas, distintas y desechables.

## Digest observado

```text
ac6da0dfba84a81fdbfbaf330198c33cd77c4cdfc53e8bc50eb581914a15621d
```

Digest completo obtenido del runtime local: identifica el artefacto observado en
esa ejecución, no una constante universal del modelo.

## Modelo

```text
context_length = 32768
embedding_length = 1024
capabilities observadas = tools, thinking, embedding
```

## Resultados

```text
unit = 81 PASS
db integration = 21 PASS
e2e = 5 PASS
total runner = 107 PASS / 0 FAIL / 0 SKIP

/api/embed calls = 10
batch sizes = 10 × 6
embeddings = 60
dimensions = 1024

items processed = 76
items pending / failed / skipped = 0 / 0 / 0
versions ready = 12
chunks = 60
embeddings non-null = 60

release = ready/current
run = succeeded
assert_release_complete = PASS
idempotencia = already_current
cosine self-distance = 0
duración E2E aproximada = ~81 s
```

El total del runner incluye los tests contenedores. Las diez llamadas reales
respondieron HTTP 200, con seis salidas cada una, `truncate:false` enviado y sin
error ni truncamiento informado. La embedding_config publicada registró provider
`ollama`, el modelo/digest anteriores, dimension 1024, distance_metric `cosine` y
runtime_version 0.34.4; no contenía `TEST_ONLY`.

La segunda ejecución de la misma identidad no creó release, ingestion_run ni
llamadas adicionales a embeddings. La release observada fue:

```text
e58189aa-5be3-44cf-ab12-3fc2a8b0203b
```

Es un **identificador efímero de esa ejecución de prueba**, no una identidad
estable del proyecto. Los contenedores y sus bases temporales fueron retirados;
Ollama y el modelo no fueron eliminados.

## Alcance y limitaciones

La duración es una observación de esa ejecución, no garantía ni SLA. Los conteos
y el smoke test vectorial no constituyen RAGAS, MRR ni evaluación de rendimiento.
La E2E usó una `implementation_revision` sintética de prueba, por lo que no
acredita procedencia operacional automática del runtime.

Siguen sin implementar: recovery, retry, reapertura de failed, recuperación de
runs huérfanos, approval registry operativo, verificación automática de
`implementation_revision`, HTTP interno, N8N, retrieval productivo y Agent/RAG.
RAGAS/MRR continúan sin implementar ni validar.

Referencia: [README de backend/rag](../../../backend/rag/README.md).
