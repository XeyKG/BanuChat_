# Benchmark de generación G0 v2 — qwen3:4b-instruct

## Reproducibilidad

- Modelo: `qwen3:4b-instruct`
- Digest: `0edcdef34593eac1aa2be9c7d06c432dcf81945adca5eca2f27662c18f168ba0`
- Ollama: `0.35.0`
- Commit: `095fefe13fb03b1f546fcc33e80c6be572291835`
- SHA-256 de prompts: `d5f25d16c2d75c4e3e60bf873f4d097c90e866e476c075ae34af9a8eddb7c1d0`
- Generado: `2026-10-01T07:44:31.842Z`
- Parámetros: `think=false`, `stream=false`, `temperature=0`, `num_predict=128`

## Observación cold inicial

| wall ms | total Ollama ms | load ms | output tokens | tokens/s |
| ---: | ---: | ---: | ---: | ---: |
| 8668.54 | 8664.64 | 4403.53 | 65 | 17.62 |

La observación cold se ejecutó después de una petición de control con `keep_alive=0`. Ni el control, ni esta observación, ni el warmup forman parte de los agregados warm.

## Diez ejecuciones warm

| ID | wall ms | tokens | tokens/s | done_reason | reasoning preamble |
| --- | ---: | ---: | ---: | --- | --- |
| G0-01 | 2158.09 | 64 | 31.74 | stop | no |
| G0-02 | 2277.80 | 82 | 40.48 | stop | no |
| G0-03 | 1630.91 | 58 | 40.56 | stop | no |
| G0-04 | 5427.83 | 104 | 19.86 | stop | no |
| G0-05 | 2409.36 | 88 | 40.59 | stop | no |
| G0-06 | 2268.54 | 61 | 29.53 | stop | no |
| G0-07 | 3134.45 | 97 | 33.00 | stop | no |
| G0-08 | 3033.74 | 82 | 28.83 | stop | no |
| G0-09 | 1931.84 | 69 | 40.00 | stop | no |
| G0-10 | 1830.81 | 61 | 37.21 | stop | no |

## Agregados warm

- Wall clock: media 2610.34 ms; mediana 2273.17 ms; mínimo 1630.91 ms; máximo 5427.83 ms.
- Duración total Ollama: media 2603.34 ms; mediana 2270.36 ms.
- Tokens de salida: media 76.60.
- Tokens/s: media 34.18; mediana 35.10.
- Casos por debajo de 5000 ms: 9; casos en o por encima de 5000 ms: 1.
- Terminaciones naturales: 10.
- Terminaciones limitadas por longitud: 0.
- Respuestas con prefacio de razonamiento conocido: 0.
- Otros valores de done_reason: `{}`.

## Interpretación

Se muestran 5000 ms como referencia porque el proyecto conserva un objetivo histórico de respuesta promedio menor a 5 s. Este benchmark mide únicamente generación aislada en Ollama. No demuestra cumplimiento ni incumplimiento definitivo de OE6 end-to-end. El resultado frente a esa referencia no declara el desempeño final de POST /messages.

## Limitaciones

- Mide generación aislada.
- Usa corpus y contexto sintéticos.
- Usa una muestra pequeña de 10 prompts.
- Separa la observación cold.
- Excluye el warmup.
- No mide retrieval.
- No mide Agent/ReAct.
- No mide MCP.
- No mide persistencia.
- No mide REST ni mobile.
- No acredita OE6.
