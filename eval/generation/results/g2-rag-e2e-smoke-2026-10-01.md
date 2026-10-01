# G2 — Primer vertical slice RAG E2E real

Este archivo documenta evidencia técnica observada del primer vertical slice RAG E2E real.

## Entorno observado

- Commit técnico evaluado: `00bbf0136c96ce9c0033d1c66837f8f9c6829752`
- Release: `5b307391-f475-4120-b8de-30df8f9a7d63`
- Modelo generador: `qwen3:4b-instruct`
- Digest: `0edcdef34593eac1aa2be9c7d06c432dcf81945adca5eca2f27662c18f168ba0`
- Ollama: `0.35.0`
- Embedding: `qwen3-embedding:0.6b`

## 1. Smoke funcional

Pregunta:

> ¿Qué información debo incluir al reportar una incidencia?

- HTTP: `201`
- Wall clock: `19027.67 ms`
- `insufficient_evidence`: `false`
- Citas documentales: `5`

Esta fue una observación funcional posterior al reinicio del API. No entra en los agregados warm y no debe interpretarse como promedio.

## 2. Persistencia

Comprobación posterior:

- Messages: `2`
- Citations: `5`

Checks observados:

- `exactly_two_messages = true`
- `user_then_assistant = true`
- `assistant_has_release = true`
- `assistant_not_insufficient = true`
- `exactly_five_citations = true`
- `all_document = true`
- `all_same_release = true`
- `all_have_document_version = true`
- `all_have_chunk = true`

`PERSISTENCE_PASS=true`

## 3. Warmup

El warmup se registró por separado y no está incluido en los agregados:

```text
WARMUP
status=201
wall_ms=10914.73
insufficient_evidence=false
citations=5
all_document=true
```

## 4. Cinco observaciones warm

| Caso | HTTP | wall_ms | insufficient_evidence | citas | all_document |
| --- | ---: | ---: | --- | ---: | --- |
| W1 | 201 | 13511.09 | false | 5 | true |
| W2 | 201 | 13326.37 | false | 5 | true |
| W3 | 201 | 10965.98 | false | 5 | true |
| W4 | 201 | 10820.68 | false | 5 | true |
| W5 | 201 | 12353.39 | false | 5 | true |

Agregados observados:

- `successful = 5/5`
- `mean_ms = 12195.50`
- `median_ms = 12353.39`
- `min_ms = 10820.68`
- `max_ms = 13511.09`
- `under_5000_ms = 0/5`

Cada caso usó una conversación nueva. El cronómetro midió `POST /messages`; la creación de la conversación quedó fuera del tiempo. Se usaron preguntas diferentes del corpus sintético.

Esta es una muestra exploratoria pequeña y no debe presentarse como benchmark estadístico exhaustivo.

## 5. Perfil de cambio de modelo

Tiempos observados, en milisegundos:

| Observación | Operación | wall | load |
| --- | --- | ---: | ---: |
| E1 | embed | 2192.84 | 2105.30 |
| G1 | generate | 1533.77 | 6.76 |
| E2 | embed | 861.85 | 7.03 |
| G2 | generate | 1653.82 | 12.36 |
| E3 | embed | 763.11 | 9.35 |
| G3 | generate | 1613.95 | 6.62 |

Al finalizar, `ollama ps` mostraba `qwen3:4b-instruct` en `100% GPU`.

La primera observación de embedding sí mostró carga apreciable. Las observaciones posteriores no muestran varios segundos de `load_duration` por alternancia. Por esta evidencia, no se atribuye la latencia warm principalmente a recarga de modelos.

Esta evidencia no demuestra qué componente exacto explica toda la latencia.

## 6. Interpretación de latencia

La muestra warm observada no cumple una referencia histórica de respuesta menor a `5000 ms`: `0/5` observaciones estuvieron por debajo de `5000 ms`.

Este resultado no permite afirmar que BanuChat completo sea universalmente lento, extrapolar el comportamiento a otro hardware, afirmar un promedio poblacional ni cambiar objetivos académicos automáticamente.

Una observación RAG previa con contexto real registró:

- `prompt_eval_count=1436`
- `eval_count=208`
- `num_predict=256`
- `done_reason=stop`
- Generation wall: aproximadamente `5450.66 ms`

Por tanto, en ese caso concreto la generación aislada ya superó aproximadamente los `5 s`.

## 7. Alcance

Este archivo registra exclusivamente evidencia técnica observada. No modifica resultados históricos ni contratos o componentes del sistema.
