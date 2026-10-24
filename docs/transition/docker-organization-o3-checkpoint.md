# CHECKPOINT BANUCHAT — O3

Fecha: 2026-10-24. API v2 validada funcionalmente contra el candidato CCD
autenticado de O2, sin promoción ni cambios en I1B, Mobile, contratos, corpus,
embeddings, modelos, migraciones o ingestas.

## Incidente I1B revisado

El comando registrado durante O2 apuntó a
`banuchat-dev-postgres-ccd-auth-1`. Los eventos disponibles sitúan primero el
reinicio del candidato y, unos segundos después, un `kill` con señal 2, `stop` y
`die` limpios de I1B. No hubo OOM, error de contenedor ni política de reinicio.

El candidato pertenece al proyecto Compose `banuchat-dev`; I1B es un contenedor
independiente con etiqueta `banuchat.task=BCH05-CCD-AUTH-I1B`. No comparten nombre,
red, volumen o puerto. El Compose candidato y el procedimiento O2 no contienen una
dependencia ni referencia ejecutable a I1B. El historial interactivo disponible no
registró otro `stop`, `kill`, `restart` o `compose down` relevante.

Docker registra la acción y la señal, pero no la identidad del cliente que invocó
la operación. El inventario actual de procesos tampoco reconstruye procesos ya
terminados. Por ello no se atribuye la causa. O3 evitó el riesgo residual: no usó
Compose ni mutó contenedores, y comparó estado e historial I1B antes y después.

## Configuración ejecutada

| Componente | Identidad O3 |
| --- | --- |
| API v2 temporal | `127.0.0.1:3013`, cerrada al terminar |
| PostgreSQL | `banuchat-dev-postgres-ccd-auth-1`, `127.0.0.1:55453` |
| Base física | `banuchat_ccd_auth_i1b_test` |
| Volumen / red | `banuchat-dev-ccd-auth-data` / `banuchat-dev-ccd-auth` |
| Ollama | instancia local existente en `127.0.0.1:11434` |
| I1B | `127.0.0.1:55443`, solo lectura de verificación |

El operador O3 obtiene roles, deployment y secretos de la configuración privada
existente, sustituye explícitamente solo el destino por 55453 y valida la topología
Docker antes de escuchar. No reutiliza el puerto y destino fijados por
`auth-i1b-operator.mts`.

## Resultados

| Comprobación | Resultado |
| --- | --- |
| Arranque API v2 y scope de runtime | PASS |
| Login y consulta `/auth/me` | PASS |
| Acceso anónimo a recursos protegidos | rechazado |
| Aislamiento entre dos cuentas ficticias | PASS |
| Creación, listado, detalle, historial y ownership | PASS |
| Regresión focal F2, identificación tras aclaración | PASS |
| RAG CCD fundamentado y cita `unit:M02:DOC-101` | PASS |
| Persistencia y procedencia de cita | PASS |
| Apertura autenticada de artefacto; anónima rechazada | PASS |
| Abstención fuera de alcance y UUID inválido | PASS |
| Corpus y conversaciones previas del candidato | sin cambios |
| Estado e historial I1B | sin cambios |

La prueba creó en el candidato dos conversaciones ficticias, seis mensajes y una
cita. No almacenó respuestas ni credenciales en la evidencia versionable. El
resultado sanitizado está en
[`banuchat-o3-candidate-http.json`](../../eval/auth/results/banuchat-o3-candidate-http.json).

## Promoción pendiente

La promoción sigue sin autorización. Falta definir y aprobar la ventana de cambio,
la conmutación de clientes y puertos, los criterios de rollback operativo y la
decisión posterior sobre I1B. La causa de su parada O2 permanece indeterminada y
debe tratarse como riesgo de operación hasta disponer de auditoría del daemon o del
cliente Docker.

**CHECKPOINT BANUCHAT — O3: INTEGRACIÓN FUNCIONAL VALIDADA; NO PROMOVIDO.**
