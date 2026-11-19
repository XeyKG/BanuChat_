# Infraestructura de BanuChat

Corte: **18/11/2026**. El repositorio conserva recetas locales y la preparación de migración, mientras la demostración publicada ya usa **AWS Academy + Supabase**. No son entornos intercambiables.

## Despliegue publicado

EC2 existente con Amazon Linux 2023, dos vCPU/8 GiB, administración por Session Manager, Caddy/HTTPS en DuckDNS, API Node y Ollama. PostgreSQL/pgvector reside en Supabase; la API utiliza un rol restringido y TLS con CA y hostname verificados. La web y APK apuntan a `https://banuchat.duckdns.org`; PostgreSQL, Ollama y la API loopback no se exponen directamente a los clientes.

Los servicios del despliegue son `ollama`, `banuchat-api`, `banuchat-web-duckdns` y `banuchat-https`. La IP elástica y DuckDNS mantienen la dirección mientras conserven su asociación. La continuidad sigue condicionada al Learner Lab y sus créditos; no es hosting permanente. [Operación y recuperación](../docs/operations/cloud-demo.md).

## Recetas y herramientas

| Ruta | Alcance |
| --- | --- |
| [db](db/README.md) | Migraciones históricas y aditivas, perfiles de permisos y comprobaciones SQL |
| [db/cloud-01a](db/cloud-01a/) | Cohorte sintética y publicación sucesora, preservando v1 |
| [db/cloud-01b](db/cloud-01b/) | Preflight e inventario, compatibilidad y propuestas de binding administrado |
| [fixtures](fixtures/README.md) | Exportación OE2 sintética aprobada, de solo lectura y fijada por SHA |
| [scripts](scripts/) | Respaldo/verificación, diagnóstico y precarga de modelos, con precondiciones propias |
| [docker-compose.yml](docker-compose.yml) | Compose inicial local; no es el arranque del despliegue cloud |
| [docker-compose.dev.yml](docker-compose.dev.yml) | Organización del desarrollo local anterior |
| [docker-compose.oe6.yml](docker-compose.oe6.yml) | Paquete de transferencia técnica local con perfiles; no acredita on-prem UNAB |

Que un SQL esté versionado no prueba que se ejecutó. Los archivos `*.proposed.sql` son propuestas y las migraciones históricas mantienen sus guardas. No ejecutar todas las migraciones por orden de nombre ni reutilizar destinos de CCD para pruebas sintéticas.

## Laboratorios existentes y datos

Unified local conserva PostgreSQL en loopback 55463 y API 3004; sus launchers exigen configuración privada y el laboratorio preparado. Otros puertos/bases de O1–O5 y CLOUD-01 son identidades de ensayos concretos, no valores alternativos para un arranque nuevo. Ver [estado vigente](../docs/estado-vigente.md), [operación Unified](../docs/operations/final-integrated-demonstration.md) y [organización Docker histórica](../docs/operations/docker-local-organization.md).

Se conservan por separado la demo congelada, los expedientes sintéticos, las referencias CCD seleccionadas y los respaldos. No borrar volúmenes ni reconstruir una instancia/base para resolver una parada del laboratorio. Un respaldo debe indicar fuente, revisión, contenido, integridad y prueba de restauración aislada; no asumir que cualquier dump es sintético o apto para nube.

## Configuración y evidencia

Los ejemplos de configuración se versionan sin secretos; las credenciales y configuraciones efectivas permanecen privadas. `infra/local` contiene artefactos del operador ignorados por Git, no herramientas que deba poseer cualquier clon.

La migración administrada, restauración, permisos y pruebas de pooler se documentan en [CLOUD-01B.3](../docs/transition/CHECKPOINT-CLOUD-01B-3.md). El [consolidado](../docs/transition/CHECKPOINT-PUBLICACION-BANUCHAT.md) registra despliegues, hashes, respaldos y recuperación. Esos ensayos no se repiten al actualizar esta documentación.
