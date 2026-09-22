# Infraestructura local

Configuración de diseño para desarrollo y demostraciones locales. El Compose declara
una instancia PostgreSQL que incluye pgvector y un servicio N8N separado. No incluye
backend ni app móvil, y no monta ni ejecuta migraciones.

## Variables y seguridad

`/.env.example` documenta las variables. Usuario, contraseña y clave de cifrado se
dejan vacíos y deben definirse privadamente antes de una futura ejecución autorizada.
Compose exige los valores sensibles y solo publica puertos en `127.0.0.1`.
La futura ejecución desde la raíz debe cargar explícitamente `.env` mediante
`--env-file .env`, como figura en `AGENTS.md`.

No se ha diseñado aún la autenticación local de BanuChat. La clave de cifrado de N8N
protege su configuración; no sustituye autenticación.

## Imágenes y persistencia

- Antes había `postgres:16` y `pgvector/pgvector:pg16` como dos servidores.
  Se conserva la imagen ya configurada `pgvector/pgvector:pg16` como única instancia,
  manteniendo PostgreSQL 16. Esta etiqueta conserva la versión mayor, pero no fija
  un parche ni un digest; el bloqueo exacto queda pendiente de validación del entorno.
- N8N pasa de `n8nio/n8n:latest` a `n8nio/n8n:2.40.5`, release publicada el
  21 de septiembre de 2026, identificada como Latest en la
  [publicación oficial](https://github.com/n8n-io/n8n/releases/tag/n8n%402.40.5).
  Es una referencia concreta para la siguiente validación; no se descargó ni ejecutó.
- Se conserva el volumen lógico `pgvector_data` y el de N8N. Quitar la declaración
  del antiguo `postgres_data` no borra ni migra un volumen existente. Antes de un
  futuro arranque debe comprobarse si hay volúmenes previos: cambiar variables de
  inicialización no modifica credenciales de una base ya creada.

El dataset original reside en `/data/synthetic`; PostgreSQL guarda su representación
procesada. Habilitar la extensión y diseñar la conexión asíncrona de N8N son trabajos
posteriores. No hay Google Sheets ni sistemas institucionales dentro del MVP.
