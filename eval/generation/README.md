# Benchmark de generación G0

Benchmark reproducible, **generator-only**, para evaluar si `qwen3:4b` es un candidato viable como generador local del MVP de BanuChat. Usa diez contextos sintéticos congelados y llama directamente a la API local de Ollama; no ejecuta retrieval ni acredita OE6 end-to-end.

## Alcance congelado

- Prompts: `prompts-v1.json`, con diez casos `G0-01` a `G0-10` derivados de `data/synthetic/documents/artifacts/doc-001.md` a `doc-010.md`.
- Modelo: `qwen3:4b`.
- API: `POST /api/chat` mediante `fetch` nativo de Node.
- Parámetros: `think=false`, `stream=false`, `temperature=0`, `num_predict=128` y `keep_alive="5m"` para las mediciones warm.
- System prompt y construcción del user prompt idénticos para todos los casos.

Los contextos son estáticos: el runner no hace retrieval ni consulta otras fuentes para construirlos.

## Requisitos

- Node.js con `fetch` global.
- Git disponible para registrar `git rev-parse HEAD`.
- Ollama local en `http://127.0.0.1:11434` con `qwen3:4b` instalado.

Puede cambiarse el origen con `BANUCHAT_EVAL_OLLAMA_BASE_URL`, pero únicamente se aceptan URLs HTTP de loopback con host `127.0.0.1`, `localhost` o `[::1]`. No se permiten credenciales, rutas adicionales, query, fragmentos ni redirects. Cada petición tiene un timeout explícito de 180 segundos.

## Ejecución futura

Desde la raíz del repositorio:

```powershell
node eval/generation/run-benchmark.mjs
```

Antes de medir, el runner ejecuta este preflight secuencial:

1. `GET /api/version` para capturar la versión del runtime.
2. `GET /api/tags` para confirmar que `qwen3:4b` existe y capturar su digest exacto.
3. `POST /api/show` para capturar capabilities y metadata de thinking disponible.

Luego ejecuta, también en forma secuencial:

1. **Unload/control:** petición mínima con `keep_alive=0`; no cuenta como benchmark.
2. **Cold:** una ejecución separada de `G0-01`, etiquetada `initial_cold_observation`; no entra en agregados warm.
3. **Warmup:** una petición de estabilización; no entra en métricas.
4. **Warm:** diez ejecuciones medidas, `G0-01` a `G0-10`, sin `Promise.all`.

La petición real con `think=false` es la validación final del control de thinking. Cualquier `message.thinking` no vacío aborta el benchmark. También se exige un `message.content` no vacío y métricas Ollama numéricas válidas.

## Métricas y resultados

Cada ejecución medida registra wall clock, duraciones de Ollama convertidas de nanosegundos a milisegundos, conteos de tokens, tokens por segundo y la respuesta. La tasa se calcula sin redondeo interno como:

```text
eval_count / (eval_duration / 1e9)
```

Los agregados se calculan exclusivamente sobre los diez casos warm. Incluyen media, mediana, mínimo y máximo de wall clock; media y mediana de duración total de Ollama; media de tokens de salida; media y mediana de tokens por segundo; y conteos por debajo o en/por encima de 5000 ms.

Tras una ejecución completa, se crean:

```text
eval/generation/results/g0-qwen3-4b-AAAA-MM-DD.json
eval/generation/results/g0-qwen3-4b-AAAA-MM-DD.md
```

La fecha del nombre se calcula en `America/Bogota`. Los archivos se crean sin sobrescribir resultados existentes. El JSON registra commit, SHA-256 de los bytes exactos de `prompts-v1.json`, fecha de generación, versión de Ollama, modelo, digest, parámetros y preflight.

## Interpretación y límites

El reporte usa 5000 ms como referencia porque el proyecto conserva un objetivo histórico de respuesta promedio menor a 5 s. Si la media warm de generación ya supera esa referencia, el reporte puede indicar que el modelo resulta poco prometedor en el hardware probado.

Este benchmark mide únicamente generación aislada en Ollama. No demuestra cumplimiento ni incumplimiento definitivo de OE6 end-to-end y no mide retrieval, Agent/ReAct, MCP, persistencia, REST ni mobile. Usa corpus/contexto sintético, una muestra pequeña de diez prompts, una observación cold separada y un warmup excluido.
