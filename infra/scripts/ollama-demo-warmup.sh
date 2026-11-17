#!/usr/bin/env bash
set -euo pipefail

base=http://127.0.0.1:11434
embedding=qwen3-embedding:0.6b
generator=qwen3:4b-instruct

if [[ ${1:-} == --check ]]; then
  curl -fsS --max-time 5 "$base/api/ps" |
    jq -e --arg embedding "$embedding" --arg generator "$generator" '
      [.models[] | (.name // .model)] as $loaded
      | ($loaded | index($embedding) != null) and ($loaded | index($generator) != null)
    ' >/dev/null
  exit
fi

for attempt in {1..30}; do
  if curl -fsS --max-time 2 "$base/api/version" >/dev/null 2>&1; then
    break
  fi
  if [[ $attempt == 30 ]]; then
    echo 'Ollama did not become available' >&2
    exit 1
  fi
  sleep 2
done

curl -fsS --max-time 90 "$base/api/embed" -H 'Content-Type: application/json' \
  -d '{"model":"qwen3-embedding:0.6b","input":"BanuChat","dimensions":1024,"options":{"num_ctx":4096},"keep_alive":"15m"}' |
  jq -e '.embeddings | length == 1 and (.[0] | length == 1024)' >/dev/null

curl -fsS --max-time 150 "$base/api/chat" -H 'Content-Type: application/json' \
  -d '{"model":"qwen3:4b-instruct","messages":[{"role":"user","content":"Responde OK."}],"stream":false,"think":false,"options":{"num_predict":8},"keep_alive":"15m"}' |
  jq -e '.done == true and (.message.content | length > 0)' >/dev/null

bash "$0" --check
echo 'Ollama demo: both models loaded and exercised'
