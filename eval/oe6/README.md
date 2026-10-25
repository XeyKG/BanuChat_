# OE6 — evaluación integrada

Esta carpeta contiene runners reproducibles y evidencia del entorno local autorizado.
No acredita despliegue institucional ni sustituye pruebas en dispositivos o con usuarios.

## Ejecuciones

1. MCP real, desde `backend/api`, con la identidad mínima ya aprovisionada:

   ```powershell
   node --env-file=../../infra/local/oe6/mcp-reader.env --import tsx ../../eval/oe6/run-real-mcp.mts
   ```

2. Rendimiento con API sintética levantada, sin retries y con errores incluidos:

   ```powershell
   node eval/oe6/run-performance.mjs
   ```

   Variables opcionales: `BANUCHAT_OE6_SAMPLE_SIZE` (10),
   `BANUCHAT_OE6_CONCURRENCY` (1), `BANUCHAT_OE6_TIMEOUT_MS` (120000),
   `BANUCHAT_OE6_API_BASE_URL` y `BANUCHAT_OE6_PROFILE_KEY`.

3. Estabilidad: detiene temporalmente el contenedor N8N local, comprueba 503 sin
   persistencia, lo inicia y verifica recuperación. La indisponibilidad de Ollama se
   inyecta en una API aislada mediante un endpoint loopback cerrado; no mata el daemon
   compartido. No ejecutar contra un N8N protegido o compartido.

   ```powershell
   node eval/oe6/run-stability.mjs
   ```

4. Backup/restore sintético aislado:

   ```powershell
   node infra/scripts/verify-synthetic-backup.mjs
   ```

   Crea un `pg_dump` en `infra/local/oe6/backups`, restaura en un contenedor temporal
   sin red y con `tmpfs`, compara huellas de 16 tablas y elimina solo ese contenedor.
   No crea ni elimina volúmenes.

Los JSON de `results/` distinguen dependencias reales, configuración, límites y
resultados observados. Los dumps, credenciales y logs privados permanecen bajo
`infra/local/` y fuera de Git.
