#!/usr/bin/env python3
"""RAGAS 0.4.3 adapter for private OE1 evidence and public synthetic calibration."""

from __future__ import annotations

import argparse
import asyncio
import hashlib
import importlib.metadata
import json
import math
import random
import sys
from urllib.request import urlopen
from datetime import datetime, timezone
from pathlib import Path
from statistics import fmean
from typing import Any

EXPECTED_RAGAS_VERSION = "0.4.3"
METRICS = ("faithfulness", "context_precision", "context_recall", "answer_relevancy")


def load_json(path: Path) -> tuple[Any, bytes]:
    data = path.read_bytes()
    return json.loads(data.decode("utf-8")), data


def require_loopback(url: str) -> str:
    allowed = ("http://127.0.0.1:", "http://localhost:", "http://[::1]:")
    if not url.startswith(allowed):
        raise ValueError("El juez RAGAS solo admite un endpoint loopback local.")
    return url.rstrip("/")


def ollama_metadata(base_url: str, model_names: tuple[str, ...]) -> dict[str, Any]:
    with urlopen(f"{base_url}/api/version", timeout=5) as response:
        version = json.loads(response.read().decode("utf-8")).get("version")
    with urlopen(f"{base_url}/api/tags", timeout=5) as response:
        tags = json.loads(response.read().decode("utf-8")).get("models", [])
    by_name = {item.get("name"): item for item in tags if isinstance(item, dict)}
    models = {}
    for name in model_names:
        item = by_name.get(name)
        digest = item.get("digest") if isinstance(item, dict) else None
        if not isinstance(digest, str) or len(digest) != 64:
            raise RuntimeError(f"Ollama no reportó digest para {name}.")
        models[name] = {"digest": digest}
    return {"version": version, "models": models}


def samples_from(payload: dict[str, Any]) -> list[dict[str, Any]]:
    raw = payload.get("cases")
    if not isinstance(raw, list) or not raw:
        raise ValueError("El input debe contener cases no vacío.")
    samples = []
    ids: set[str] = set()
    for item in raw:
        if not isinstance(item, dict) or not isinstance(item.get("id"), str) or item["id"] in ids:
            raise ValueError("ID ausente o duplicado.")
        ids.add(item["id"])
        sample = item.get("ragas_input")
        if not isinstance(sample, dict):
            continue
        for field in ("user_input", "response", "reference"):
            if not isinstance(sample.get(field), str) or not sample[field].strip():
                raise ValueError(f"{item['id']}: {field} inválido.")
        for field in ("retrieved_contexts", "reference_contexts"):
            if not isinstance(sample.get(field), list) or not sample[field] or not all(isinstance(value, str) and value.strip() for value in sample[field]):
                raise ValueError(f"{item['id']}: {field} inválido.")
        samples.append({"id": item["id"], "category": item.get("category"), "expected_labels": item.get("expected_labels"), **sample})
    if not samples:
        raise ValueError("No hay casos con ragas_input.")
    return samples


def score_value(result: Any) -> tuple[float, str | None]:
    value = getattr(result, "value", None)
    if not isinstance(value, (int, float)) or not math.isfinite(float(value)):
        raise ValueError("RAGAS no devolvió un score finito.")
    reason = getattr(result, "reason", None)
    return float(value), reason if isinstance(reason, str) else None


async def score_sample(sample: dict[str, Any], scorers: dict[str, Any], timeout: float) -> dict[str, Any]:
    arguments = {
        "faithfulness": {
            "user_input": sample["user_input"], "response": sample["response"],
            "retrieved_contexts": sample["retrieved_contexts"],
        },
        "context_precision": {
            "user_input": sample["user_input"], "reference": sample["reference"],
            "retrieved_contexts": sample["retrieved_contexts"],
        },
        "context_recall": {
            "user_input": sample["user_input"], "reference": sample["reference"],
            "retrieved_contexts": sample["retrieved_contexts"],
        },
        "answer_relevancy": {"user_input": sample["user_input"], "response": sample["response"]},
    }
    results: dict[str, Any] = {}
    for name in METRICS:
        answer_relevancy_trace: list[dict[str, Any]] = []
        original_generate = None
        if name == "answer_relevancy":
            original_generate = scorers[name].llm.agenerate

            async def traced_generate(prompt: str, response_model: Any) -> Any:
                generated = await original_generate(prompt, response_model)
                answer_relevancy_trace.append({
                    "generated_question": getattr(generated, "question", None),
                    "noncommittal": getattr(generated, "noncommittal", None),
                })
                return generated

            scorers[name].llm.agenerate = traced_generate
        try:
            raw = await asyncio.wait_for(scorers[name].ascore(**arguments[name]), timeout=timeout)
            value, reason = score_value(raw)
            results[name] = {"status": "completed", "value": value, "reason": reason,
                             **({"diagnostics": answer_relevancy_trace} if name == "answer_relevancy" else {})}
        except asyncio.TimeoutError:
            results[name] = {"status": "timeout", "error": "Tiempo máximo del juez agotado."}
        except Exception as error:  # RAGAS/provider errors are evidence, not hidden.
            print(f"{sample['id']}/{name}: {type(error).__name__}: {str(error)[:500]}", file=sys.stderr, flush=True)
            results[name] = {"status": "error", "error_type": type(error).__name__, "error": "El juez local no pudo puntuar el caso."}
        finally:
            if original_generate is not None:
                scorers[name].llm.agenerate = original_generate
    return {"id": sample["id"], "category": sample.get("category"), "expected_labels": sample.get("expected_labels"), "metrics": results}


def bootstrap_interval(values: list[float], seed: int, iterations: int = 2000) -> list[float] | None:
    if not values:
        return None
    generator = random.Random(seed)
    means = sorted(fmean(generator.choice(values) for _ in values) for _ in range(iterations))
    return [means[int(0.025 * (iterations - 1))], means[int(0.975 * (iterations - 1))]]


def aggregate(results: list[dict[str, Any]], seed: int) -> dict[str, Any]:
    output = {}
    for offset, name in enumerate(METRICS):
        states = [item["metrics"][name] for item in results]
        values = [item["value"] for item in states if item["status"] == "completed"]
        output[name] = {
            "planned": len(states),
            "completed": len(values),
            "errors": sum(item["status"] == "error" for item in states),
            "timeouts": sum(item["status"] == "timeout" for item in states),
            "mean": fmean(values) if values else None,
            "bootstrap_95_percentile": bootstrap_interval(values, seed + offset),
            "bootstrap_iterations": 2000,
        }
    return output


def calibration_agreement(results: list[dict[str, Any]], threshold: float) -> dict[str, Any] | None:
    comparisons = []
    for item in results:
        labels = item.get("expected_labels")
        if not isinstance(labels, dict):
            continue
        for name in METRICS:
            observed = item["metrics"][name]
            expected = labels.get(name)
            if expected not in ("high", "low") or observed["status"] != "completed":
                continue
            # La frontera exacta queda del lado bajo: 0.5 representa un caso
            # parcial/ambiguo, no evidencia fuerte del comportamiento esperado.
            predicted = "high" if observed["value"] > threshold else "low"
            comparisons.append({"id": item["id"], "metric": name, "expected": expected, "judge": predicted, "score": observed["value"], "match": predicted == expected})
    if not comparisons:
        return None
    matches = sum(item["match"] for item in comparisons)
    return {
        "diagnostic_threshold": threshold,
        "label_origin": "technical_expectations_not_human_validated",
        "threshold_is_not_an_oe1_acceptance_target": True,
        "comparisons": len(comparisons),
        "matches": matches,
        "agreement": matches / len(comparisons),
        "details": comparisons,
    }


def human_calibration_agreement(results: list[dict[str, Any]], payload: dict[str, Any], input_sha256: str, threshold: float) -> dict[str, Any]:
    if payload.get("schema_version") != "1.0.0" or payload.get("calibration_input_sha256") != input_sha256 or payload.get("status") != "reviewed":
        raise ValueError("Las etiquetas humanas no están revisadas o pertenecen a otro fixture.")
    if not isinstance(payload.get("reviewer"), str) or not payload["reviewer"].strip() or not isinstance(payload.get("reviewed_at"), str):
        raise ValueError("Faltan reviewer/reviewed_at reales en etiquetas humanas.")
    labels_by_id = {item.get("id"): item.get("labels") for item in payload.get("cases", []) if isinstance(item, dict)}
    comparisons = []
    for item in results:
        labels = labels_by_id.get(item["id"])
        if not isinstance(labels, dict):
            raise ValueError(f"Faltan etiquetas humanas para {item['id']}.")
        for name in METRICS:
            expected = labels.get(name)
            observed = item["metrics"][name]
            if expected not in ("high", "low"):
                raise ValueError(f"Etiqueta humana inválida para {item['id']}/{name}.")
            if observed["status"] != "completed":
                continue
            judge = "high" if observed["value"] > threshold else "low"
            comparisons.append({"id": item["id"], "metric": name, "human": expected, "judge": judge, "score": observed["value"], "match": expected == judge})
    matches = sum(item["match"] for item in comparisons)
    return {"reviewer": payload["reviewer"], "reviewed_at": payload["reviewed_at"], "comparisons": len(comparisons), "matches": matches, "agreement": matches / len(comparisons), "details": comparisons}


async def run(arguments: argparse.Namespace) -> dict[str, Any]:
    version = importlib.metadata.version("ragas")
    if version != EXPECTED_RAGAS_VERSION:
        raise RuntimeError(f"Se requiere ragas=={EXPECTED_RAGAS_VERSION}; observado {version}.")

    from openai import AsyncOpenAI
    from ragas.embeddings.base import embedding_factory
    from ragas.llms import llm_factory
    from ragas.metrics.collections import AnswerRelevancy, ContextPrecision, ContextRecall, Faithfulness

    base_url = require_loopback(arguments.base_url)
    ollama = ollama_metadata(base_url, (arguments.judge_model, arguments.embedding_model))
    async_client = AsyncOpenAI(base_url=f"{base_url}/v1", api_key="local-ollama", timeout=arguments.timeout, max_retries=0)
    llm = llm_factory(arguments.judge_model, client=async_client, temperature=0)
    embeddings = embedding_factory("openai", model=arguments.embedding_model, client=async_client, interface="modern")
    scorers = {
        "faithfulness": Faithfulness(llm=llm),
        "context_precision": ContextPrecision(llm=llm),
        "context_recall": ContextRecall(llm=llm),
        "answer_relevancy": AnswerRelevancy(llm=llm, embeddings=embeddings),
    }
    payload, input_bytes = load_json(arguments.input)
    samples = samples_from(payload)
    if arguments.limit is not None:
        if arguments.limit < 1:
            raise ValueError("--limit debe ser positivo.")
        samples = samples[: arguments.limit]
    results = []
    for sample in samples:
        results.append(await score_sample(sample, scorers, arguments.timeout))
        print(f"{sample['id']}: RAGAS procesado", flush=True)
    result = {
        "schema_version": "1.0.0",
        "evaluation_kind": payload.get("kind", "oe1_ragas"),
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "input_sha256": hashlib.sha256(input_bytes).hexdigest(),
        "ragas": {
            "version": version,
            "api": "ragas.metrics.collections",
            "dependencies": {name: importlib.metadata.version(name) for name in ("openai", "instructor", "langchain-community")},
        },
        "ollama": {"version": ollama["version"], "endpoint": "loopback"},
        "judge": {"provider": "ollama_openai_compatible_local", "model": arguments.judge_model, "model_revision": ollama["models"][arguments.judge_model]["digest"], "base_url": "loopback", "temperature": 0, "automatic_retries": 0},
        "embeddings": {"provider": "ollama_openai_compatible_local", "model": arguments.embedding_model, "model_revision": ollama["models"][arguments.embedding_model]["digest"]},
        "parameters": {"timeout_seconds": arguments.timeout, "seed": arguments.seed, "case_limit": arguments.limit},
        "aggregate": aggregate(results, arguments.seed),
        "calibration": calibration_agreement(results, arguments.calibration_threshold),
        "cases": results,
    }
    if arguments.human_labels is not None:
        human_payload, _ = load_json(arguments.human_labels)
        if not isinstance(human_payload, dict):
            raise ValueError("--human-labels debe contener un objeto JSON.")
        result["human_calibration"] = human_calibration_agreement(results, human_payload, result["input_sha256"], arguments.calibration_threshold)
    else:
        result["human_calibration"] = {"status": "pending_human_review"}
    return result


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--base-url", default="http://127.0.0.1:11434")
    parser.add_argument("--judge-model", default="qwen3:4b-instruct")
    parser.add_argument("--embedding-model", default="qwen3-embedding:0.6b")
    parser.add_argument("--timeout", type=float, default=120.0)
    parser.add_argument("--seed", type=int, default=20261024)
    parser.add_argument("--limit", type=int)
    parser.add_argument("--calibration-threshold", type=float, default=0.5)
    parser.add_argument("--human-labels", type=Path)
    arguments = parser.parse_args()
    if not (0.0 < arguments.calibration_threshold < 1.0):
        parser.error("--calibration-threshold debe estar entre 0 y 1")
    preview, _ = load_json(arguments.input)
    if not isinstance(preview, dict):
        parser.error("--input debe contener un objeto JSON")
    if preview.get("kind") != "judge_calibration_synthetic":
        private_root = (Path(__file__).resolve().parents[2] / "data" / "ccd" / "local").resolve()
        for label, path in (("input", arguments.input), ("output", arguments.output)):
            if not path.resolve().is_relative_to(private_root):
                parser.error(f"{label} CCD debe permanecer dentro de data/ccd/local")
    result = asyncio.run(run(arguments))
    arguments.output.parent.mkdir(parents=True, exist_ok=True)
    arguments.output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
    print(json.dumps({"output": str(arguments.output), "aggregate": result["aggregate"], "calibration": result["calibration"]}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
