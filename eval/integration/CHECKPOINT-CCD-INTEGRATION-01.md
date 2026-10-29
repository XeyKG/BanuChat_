# CHECKPOINT BANUCHAT — CCD-INTEGRATION-01

Estado: **CCD_INTEGRATED_CHAT_REST_VALIDATED_MOBILE_PENDING**.
Fecha: 29 de octubre de 2026, America/Bogota.

Rama inicial `main`, HEAD `21fbd92be91c64d7850e057d5ce2ee24c6ce6233`, árbol limpio.
Se leyeron AGENTS.md, checkpoint FLOW-01/02, backlog y diagnóstico privado acotado,
implementación CCD, rutas REST v2 y operación/adaptadores Mobile vigentes.

## Implementación y pruebas

FLOW-03 distingue alcance documental de disponibilidad y comparación curricular
de tabla histórica. FLOW-04 conserva detalle pertinente y sus condiciones dentro
de un límite por paquete. La integración corrigió además el desvío reproducible
de un tema de archivos del temario hacia la orquestación multifuente. El detalle
de comportamiento y límites está en `results/ccd-integration-01-summary.md`.

Archivos productivos: `backend/api/src/chat/ccd-knowledge.ts`,
`backend/api/src/chat/ccd-query-intent.ts`,
`backend/api/src/chat/ccd-evidence-text.ts` (nuevo) y
`backend/api/src/auth/unified-product.ts`. Pruebas sintéticas nuevas:
`backend/api/test/ccd-documentary-evidence.test.ts` y
`backend/api/test/ccd-documentary-routing.test.ts`. No se cambiaron tests históricos.

Desde `backend/api`, typecheck y este conjunto pasaron **157/157**, incluidas
18 pruebas nuevas:

```text
npm run typecheck
node --import tsx --test --test-reporter=tap test/ccd-documentary-evidence.test.ts test/ccd-documentary-routing.test.ts test/ccd-query-selection.test.ts test/ccd-knowledge.test.ts test/ccd-knowledge-v2.test.ts test/ccd-knowledge-routing.test.ts test/ccd-operational-pilot.test.ts test/conversation-context.test.ts test/ccd-context-adversarial.test.ts test/ccd-mode.test.ts test/ccd-selector-p0.test.ts test/auth-handlers.test.ts test/auth-v2-contract.test.ts
```

Desde `mobile`, `npm run typecheck` y `npm test`: **41/41**.
La reproducción inicial mostró siete fallos de doce pruebas documentales y uno
de tres de routing; las trazas permanecen privadas. Se añadieron después controles
de párrafos condicionados, seguimientos y cambios de tema.

## Publicación y recorridos reales

PostgreSQL Unified existente, volumen `banuchat-unified-data`, puerto 55463;
release current `10af4ffd-effb-41fc-bbfe-4dc48cb3398f`, CCD 1.4.0;
manifest `fde23cabe95c83f5bd632d129312ad68c90624e6ebd489e79e98c6a3d0d96852`.
107 unidades con chunks/embeddings, identidades y bytes publicados comprobados
mediante pre/postflight READ ONLY. Se conservaron configuración de embeddings,
pipeline, manifest y contenido. Ollama existente 0.35.0, mismos modelos y receta.

Se inició la API normal con `npm start` desde el código actual en loopback 3004;
no se recrearon ni reiniciaron PostgreSQL, Ollama, Docker, bases o volúmenes.
La API de comprobación queda disponible en ese puerto al finalizar.

Pasada final REST: ocho consultas y un seguimiento, siete fuentes autenticadas
descargadas con SHA coincidente, anónimo 401, historial reabierto sin pérdidas,
GET/DELETE de conversación ajena 404, refresh con access anterior rechazado y
logout con token revocado. Se distinguió HTTP 201 de cobertura material de la
pregunta. Disponibilidad no acreditada y datos personales conservaron abstención.

Adaptadores Mobile y AuthSession reales contra HTTP: login, conversación, envío,
fuente, abstención, historial, restore/refresh y logout; vault en memoria. Se
eliminaron las nueve conversaciones propias de la pasada final por API y se
cerraron ambas sesiones. También se limpiaron las conversaciones propias anteriores.
Ninguna cuenta ni registro ajeno fue eliminado.

`adb devices -l` no mostró dispositivo al inicio ni al cierre. No se ejecutaron
recorridos Android, SecureStore ni UI física nuevos. No se instaló software ni
se generaron proyectos nativos, diapositivas o SUS. Ese es el pendiente externo
para ampliar esta evidencia a interacción móvil física.

## Integridad y evidencias

Directorio privado nuevo:
`data/ccd/local/product-validation/ccd-integration-01-v1/`.

- `initial-integrity.json`: 73 archivos históricos protegidos, intactos al cierre.
- `publication-preflight.json`: identidad y comprobaciones de publicación.
- `functional-results-v4.json`: pasada final REST/adaptadores y hashes del código.
- `functional-analysis-v1.json`: comparación y límites por comportamiento.
- `backend-tests-final-v3.log`, `mobile-tests-v1.log`: resultados de pruebas.
- `artifacts-manifest-v1.json`: SHA-256 de los entregables y trazas nuevos.

| Artefacto privado final | SHA-256 |
| --- | --- |
| `functional-results-v4.json` | `667dcc82cd8a475ef49a491d2daf39d1ec479c3743cb837ae2a4bf21a4abd96b` |
| `functional-analysis-v1.json` | `aaebf13cdb4bb2947d7d054c67525949ec47841121fb1120a4ddfa045e62a525` |

Se preservaron todas las pasadas previas, incluido el error de expectativa del
comprobador, el 503 de routing, la detención en login y la incompatibilidad del
capturador histórico con el nuevo formato. Se corrigieron los comprobadores nuevos
sin tocar el evaluador OE1 ni simular éxitos. La cuota de login se respetó hasta
la siguiente ventana; no se modificó su tabla ni configuración.

Benchmark OE1 intacto: `44c7464b8f6a9ecdc34c436205beafb532c7a26bc4d44c1b99d4af98c93275c8`.
Baseline intacto: `8528d8af371f74d47aa1e8ea92b1f63c8fb9b8e6984b9a7cdbc5e27bf43ae58f`.
Manifest CIERRE-01 intacto: `62eb07cf5b6579ed07447ce7b715da4e703b4c34303ff175e55ea374e366c4c3`.

No hubo nueva evaluación OE1, RAGAS, benchmark, cambio de métricas, corpus, releases,
SQL, credenciales, permisos, contratos, modelos, embeddings, top_k ni configuración
congelada. Las escrituras runtime se limitaron a operaciones autenticadas normales
de sesión/conversación y su auditoría. No se inició FLOW-05 ni se atribuyó aceptación
académica/institucional. La comprobación semántica es técnica y acotada, sin juez
humano independiente. Se ejecutó `git diff --check` y su equivalente para archivos
nuevos. No se hizo commit ni push.
