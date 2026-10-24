# CHECKPOINT BANUCHAT — O4

Fecha: 2026-10-24. `banuchat-dev` fue promovido como entorno CCD autenticado
principal de desarrollo. I1B continúa intacto como recurso histórico; no se cambió
ningún puerto PostgreSQL ni se retiraron recursos.

## Comparación previa

La auditoría por claves primarias y hashes no encontró escrituras exclusivas en
I1B después de O2. Las cinco cuentas, credenciales, bindings y grants coincidieron.
El candidato contenía únicamente la actividad controlada de O3: dos conversaciones,
seis mensajes, una cita, dos sesiones y sus eventos/rate limits relacionados.
No fue necesaria conciliación ni se sobrescribieron datos.

La detención inesperada de I1B durante O2 permanece sin causa atribuida. O4 no
ejecutó `stop`, `restart`, `compose` ni cambios sobre ese contenedor.

## Configuración promovida

| Componente | Configuración principal |
| --- | --- |
| PostgreSQL | `banuchat-dev-postgres-ccd-auth-1`, `127.0.0.1:55453` |
| Volumen / red | `banuchat-dev-ccd-auth-data` / `banuchat-dev-ccd-auth` |
| API REST v2 | una instancia en `127.0.0.1:3003` |
| Mobile | `ccd_authenticated`, misma URL `/api/v2` y mismas pantallas |
| Ollama | instancia y modelos locales existentes |

El launcher `npm run start:ccd-auth` usa el entrypoint vigente del backend. Su
configuración privada queda en `infra/local/banuchat-dev/ccd-auth-api.json`, fuera
de Git y con ACL restringida. Antes de escuchar valida la identidad Docker completa.

## Validación posterior

| Comprobación | Resultado |
| --- | --- |
| Login, refresh y restauración mediante `/auth/me` | PASS |
| Ownership y aislamiento entre cuentas ficticias | PASS |
| Chat, historial y abstención | PASS |
| RAG CCD, cita persistida y artefacto protegido | PASS |
| Escrituras exclusivas en candidato; I1B sin cambios | PASS |
| API TypeScript | PASS |
| Mobile TypeScript | PASS |
| Mobile local, modos CCD autenticado y sintético | 36/36 PASS |
| Android físico | NO EJECUTADO; sin dispositivo o AVD disponible |

O4 añadió dos conversaciones controladas, cuatro mensajes y una cita en el
candidato. La evidencia versionable no contiene respuestas, tokens ni credenciales.

## Respaldo y reversión

Después de validar se creó el dump privado
`infra/local/banuchat-dev/o4-post-promotion.dump`; su catálogo es legible, tiene ACL
restringida y su SHA-256 se conserva en el registro de la ejecución.

Un retorno directo a I1B ocultaría las escrituras posteriores a O2. Ante una falla,
detener solo la API, preservar un dump actualizado y preferir la corrección hacia
delante. Si se requiere ocupar 3003 con el launcher histórico, debe aceptarse y
registrarse el historial dividido o autorizar primero una conciliación. No restaurar
el dump sobre I1B ni copiar tablas manualmente.

## Pendientes

- Ejecutar el guion Android físico con el operador y Expo Go SDK 57.
- Definir una política de conciliación para una reversión prolongada.
- Observar estabilidad antes de autorizar archivo o retirada de I1B.
- Mantener documentado el incidente O2 mientras no exista auditoría que atribuya
  el cliente Docker responsable.

**CHECKPOINT BANUCHAT — O4: `banuchat-dev` PROMOVIDO; I1B CONSERVADO.**
