# CHECKPOINT BANUCHAT — APLICACIÓN UNIFICADA

Fecha: 25 de octubre de 2026, Bogotá.
Línea base: 555c5e71c1a7506ccd01958c871dc18bb2b87c37.
Implementación sin commit ni push.

## A. Diagnóstico de la separación

La separación estaba en backend y cliente: knowledgeDefinition('ccd_local') y SQL
restringían CCD a chat/historial/documentos; MCP/N8N estaban conectados al recorrido
sintético v1. Mobile ocultaba módulos, excluía recordatorios en CCD y mostraba banners.
Además comparaba el contexto documental del chat con el perfil académico de la cuenta:
esa igualdad deja de ser válida al separar las publicaciones.

Se reutilizaron autenticación, owners, router, servicios, RAG, agente, MCP, N8N y
pantallas. La decisión funcional del propietario se implementó sin esperar cambios
académicos externos.

## B. Arquitectura implementada

Mobile → REST v2 autenticado → sesión/owner → servicios BanuChat.

| Rama | Fuente | Versión y autorización |
| --- | --- | --- |
| Pregunta documental | Document RAG CCD → PostgreSQL/pgvector + Ollama | Release CCD; grant de cuenta; citas/artefactos CCD |
| Progreso/cursos propios | Servicios existentes sobre banuchat_aux | Perfil exclusivo derivado del principal y release auxiliar |
| Calendario y novedades | Servicios existentes sobre banuchat_aux | Eventos/convocatorias ficticios; release auxiliar |
| Multifuente | N8N correlacionado → agente determinista → MCP stdio | Principal fijado por API y ambas releases fijadas por sesión |
| Historial | Conversaciones y citas realmente persistidas | conversation_owners; 404 para UUID de otro propietario |
| Recordatorios | Servicio local Expo existente | Permisos, principal, release auxiliar y deduplicación |

No se añadió otro modo visible. El identificador interno ccd_authenticated se conserva
y la app final presenta las seis capacidades en una sola Home. Los comandos normales
de backend arrancan la composición unificada; los históricos permanecen para regresión.

## C. Backend, persistencia y fuentes

Se creó el contenedor aislado banuchat-unified-postgres, volumen banuchat-unified-data,
PostgreSQL loopback 55463, base banuchat_unified. Es una copia del corpus/cuentas CCD
existentes, sin importar el RAG sintético. Dump/configuración permanecen en
infra/local/unified, ignorados por Git y con ACL de operador.

La [migración 012](../../infra/db/012_unified_auxiliary.sql), autorizada por esta tarea,
solo admite ese destino aislado:

- banuchat conserva publicaciones/documentos/vectores CCD;
- banuchat_aux contiene releases, perfiles, cursos, progreso, eventos y anuncios
  ficticios; no tiene tabla documental ni embeddings;
- account_profiles asigna un perfil exclusivo por principal y release;
- turn_sources conserva citas y procedencia de fuentes independientes;
- persist_unified_turn revalida sesión/owner, ambas releases, perfil y procedencia
  antes de guardar en una sola transacción; delega la parte documental al procedimiento
  existente;
- las referencias auxiliares tienen FKs dentro de su propio schema;
- runtime y lector MCP no obtienen DDL/DML de corpus.

Se adaptó únicamente el guard de base de la función de lectura en la copia aislada,
conservando proyección, owner NOLOGIN y límites. No se modificaron los SQL históricos.

| Elemento observado | Resultado |
| --- | --- |
| Release CCD | 3d6cedac-0e86-40c8-909b-d3ff6e8ab741 |
| Documentos/chunks CCD actuales | 12 / 12 |
| Release auxiliar | af157a78-4c51-49c0-b8cc-509257d89f1e |
| Perfiles exclusivos vinculados a cuentas | 5 |
| Cursos / eventos / novedades | 12 / 22 / 8 |
| Releases documentales sintéticas en el producto | 0 |

Solo se reutilizaron los cinco JSON estructurados de data/synthetic, sin modificarlos.
No se importaron sus documentos ni vectores. Los originales CCD externos son de lectura.

## D. RAG CCD, MCP y N8N efectivos

RAG conserva retriever protegido, generador, selección de evidencia, abstención,
límites temporales y citas. Los artefactos se abren por UUID autenticado desde las raíces
CCD depuradas existentes.

MCP unificado reutiliza servidor, contrato, validación, stdio y servicios existentes.
search_knowledge consulta retrieval CCD protegido y selección de evidencia; find_documents
lee metadata CCD. Las otras cuatro tools consultan auxiliares. El perfil no se acepta en
argumentos: API fija principal y publicaciones. Se conservan pasos/calls/bytes/tiempos.

Se ejecutaron las seis tools contra servicios reales. El lector no pudo actualizar
tablas ni leer credenciales; se rechazó un argumento de perfil ajeno. SQL también
rechazó una cita de progreso de otra cuenta antes de persistir mensajes.

N8N OE4 corre en la copia privada banuchat-unified-n8n, volumen
banuchat-unified-n8n-data, loopback 15679. Se conservó Header Auth; el workflow actualizado
se importó y publicó solo allí. Acepta metadatos ccd_local y el antecedente synthetic;
correlaciona operación y devuelve una directiva cerrada. No recibe preguntas/documentos,
contraseñas/tokens de cuenta, ni llama al endpoint público.

Fast paths permanecen directos. La caída real del N8N aislado produjo 503 y cero mensajes;
el servicio se restauró. El planificador sigue siendo determinista, sin ReAct LLM.

Contratos revisados explícitamente: REST v2 5.0.0 y MCP 2.1.0. Se conservan quince
operaciones REST, seis tools y formas públicas. me.release_id identifica CCD;
progreso/calendario/anuncios devuelven su propia release auxiliar.

## E. Pantallas Mobile conectadas

| Recorrido | Implementación |
| --- | --- |
| Onboarding/login/logout | Una experiencia BanuChat, autenticación propia y refresh |
| Home | Accesos a chat, Mi progreso, calendario, noticias, notificaciones e historial |
| Chat | RAG CCD y consultas estructuradas/multifuente por intención |
| Fuentes/documentos | Citas, UUID autenticado y apertura del artefacto |
| Historial | Owners, respuestas CCD/MCP y citas conservadas |
| Progreso/completados | Perfil propio y filtros existentes |
| Calendario | Release auxiliar y hora de Bogotá |
| Noticias/convocatorias | Servicio de anuncios y filtros |
| Notificaciones | Permiso, sincronización, cancelación, deduplicación y apertura por cuenta |

Los adaptadores reales usados por Mobile consumieron HTTP v2 con la misma cuenta y
validaron todos esos servicios. Su prueba Node usa almacenamiento de sesión en memoria:
no se presenta como SecureStore nativo ni navegación física.

## F. Interfaz final

Se retiraron banners/textos de demostración de la navegación final, onboarding, login,
Home, Chat, Historial, Documentos, Noticias y Notificaciones. Se usan Usuario, Mi progreso,
Calendario, Noticias y novedades, Historial y Fuentes. Se conservaron citas, fechas y
restricciones de documentos.

Los avisos de selección de perfil permanecen archivados en código histórico, fuera de
la navegación autenticada final. Los datos auxiliares ficticios se documentan internamente
y no se atribuyen al CCD.

Los recordatorios ya no excluyen cuentas con conocimiento CCD. Comparan las releases
de calendario/novedades entre sí, sin compararlas con la documental de me.

## G. Pruebas reproducibles

| Prueba | Tipo y resultado |
| --- | --- |
| API typecheck/build | PASS |
| Suite API existente | 620/620 PASS en primera regresión; controles de dependencias identificados |
| Regresiones posteriores | 33 PASS de contrato/mensajes, 22 PASS de contrato/agente y 19 PASS de agente/N8N, incluida separación de releases |
| MCP typecheck/suite | PASS; 24/24; fixtures de la suite histórica no se presentan como E2E |
| Mobile typecheck/lint | PASS |
| Mobile suite | 38/38 PASS tras actualizar fixtures de capacidades |
| Scripts de unificación | npm run typecheck:unified: TypeScript estricto PASS |
| Export Android/iOS/Web | PASS en .expo/unified-export-verified, bundles Hermes y 13 rutas |
| Aceptación real | HTTP/PostgreSQL/Ollama/MCP/N8N: T01–T06 y T08–T14 PASS |
| Cliente Mobile contra HTTP real | PASS, sin simular respuestas del backend |
| Seguridad real | PASS, seis tools y rechazo de privilegios/perfil |
| Android/iOS físico | NO EJECUTADO, sin ADB/dispositivo disponible |
| Push remoto | PENDIENTE |

| Caso obligatorio | Resultado |
| --- | --- |
| T01 | Login propio y seis capacidades |
| T02 | Consulta CCD desde cliente autenticado |
| T03 | Cita CCD y apertura del documento correcto |
| T04 | Progreso/completados propios, release auxiliar distinta |
| T05 | Eventos ficticios consultados |
| T06 | Noticias/convocatorias ficticias consultadas |
| T07 | Nueve candidatos de recordatorio, derivados de datos reales del backend y aislados por cuenta; programación/recepción del SO pendiente de teléfono |
| T08 | Respuesta CCD y cita recuperadas |
| T09 | MCP stdio real: progreso + convocatorias |
| T10 | Una operación N8N correlacionada antes del agente |
| T11 | Historial ajeno 404 y perfil propio diferente |
| T12 | Pregunta documental sintética antigua: abstención sin citas |
| T13 | Reinicio API/PostgreSQL aislado, refresh y cuatro mensajes conservados |
| T14 | 400 inválido; 403 ante release sin binding aprobado; 409 concurrente; 503 N8N y cero mensajes persistidos |

Evidencia, sin secretos ni texto documental privado:
[aceptación](../../eval/unified/results/acceptance-2026-10-25.json),
[cliente Mobile](../../eval/unified/results/mobile-client-2026-10-25.json),
[seguridad](../../eval/unified/results/security-2026-10-25.json).

La aceptación controla su propio proceso API; ejecutar con 3004 libre:

~~~powershell
cd backend/api
npm run test:unified
# Solo para repetir después de agotar límites de login en este laboratorio:
npm run test:unified -- --reset-test-limits
~~~

El flag valida base/puerto/etiqueta aislados y prepara únicamente contadores de rate limit
del laboratorio. Conserva la política y los eventos de seguridad; no borra cuentas/corpus.

Para seguridad/cliente, dejar primero el producto iniciado:

~~~powershell
# Terminal backend/api
npm start
# Otra terminal backend/api
node --import tsx scripts/evaluate-unified-security.mts
# Terminal mobile
node --import ../backend/api/node_modules/tsx/dist/loader.mjs scripts/evaluate-unified-client.mts
~~~

## H. Retirada controlada de documentación sintética

La app final solo conecta REST v2 a banuchat_unified. Su base documental contiene las tres
releases CCD preexistentes; no se publicó otra release CCD. El schema auxiliar no tiene
documentos/chunks/embeddings. Retriever, artefactos y tools documentales no consultan
data/synthetic. La pregunta histórica de incidencia produjo abstención sin citas.

Código/fixtures v1 se conservan bajo comandos históricos explícitos. Los JSON estructurados
y sus derivados auxiliares permanecen. No se borraron documentos originales, imágenes,
backups, volúmenes o releases. La aceptación comparó hashes del corpus/historial canónico
antes/después y acreditó igualdad.

## I. Riesgos y bloqueos concretos

1. Falta dispositivo Android/iOS: UI, SecureStore, recepción local y permisos requieren
   el plan físico. El bundle no los acredita.
2. Push remoto sigue pendiente de infraestructura, contrato y credenciales autorizados.
3. Autoridad CCD, RAGAS humano y SUS siguen pendientes; no bloquearon la construcción.
4. El entorno es local/loopback. TLS, despliegue UNAB y aceptación operacional permanecen.
5. Cuentas nuevas requieren asignación explícita de perfil auxiliar; sin binding,
   el sistema falla cerrado.
6. La aceptación gestiona el proceso 3004: no ejecutar con otra API en ese puerto.

Incidencias corregidas durante implementación:

| Incidencia | Resolución |
| --- | --- |
| N8N histórico accesible solo desde loopback Linux | Copia aislada con loopback 15679 y workflow real |
| Puerto 5679 ocupado | Se eligió 15679; contenedor fallido banuchat-unified-n8n-port-conflict preservado inactivo, no arrancar junto con N8N vigente |
| ACL privada sin lectura efectiva | ACL explícita por archivo para operador; ningún secreto impreso |
| Seed auxiliar inicialmente incompleto | Estado ready explícito, carga transaccional y perfil exclusivo por principal |
| Cliente/fixtures esperaban tres capacidades/contexto igual al perfil | Contrato y cliente actualizados, owner sigue en backend |
| Repeticiones agotaron rate limit de prueba | Preparación explícita de contadores solo en laboratorio |
| Hermes no podía escribir en TEMP de Windows | Export correcto con TEMP/TMP en .expo/unified-build-temp, sin migrar Expo/RN |

## J. Operación y cierre

API unificada: loopback 3004. PostgreSQL aislado: 55463. N8N aislado: 15679.
Los dos contenedores CCD canónicos conservaron estado y timestamps de arranque; no se
detuvieron ni migraron. El N8N OE6 usado para la copia volvió a detenido por nombre
exacto. No se usó Compose stop/down/prune.

~~~powershell
# Solo si los dos contenedores aislados están detenidos:
docker start banuchat-unified-postgres banuchat-unified-n8n
# Desde backend/api:
npm start
# Desde mobile:
npm start -- --localhost
~~~

Para Android USB: verificar dispositivo y reverse de API 3004 y del puerto Metro elegido.
.env.example y la configuración local apuntan a la misma API; no se elige entre chat CCD
y módulos académicos.

Aprovisionamiento explícito nuevo: scripts/provision-unified.mts y
scripts/provision-unified-n8n.mts. No se ejecutan al arrancar la app; rechazan reemplazar
silenciosamente un destino existente. Configuración, dump y secretos quedan fuera de Git.

Cambios: composición/autenticación, mensajes, agente/MCP, OE4, migración 012, Mobile,
notificaciones, contratos, evaluadores y matriz. No se añadieron frameworks/dependencias
ni se modificaron los seis objetivos formales. Las diferencias frente a scraping, Sheets,
ReAct, push y On-Prem UNAB siguen visibles en la matriz académica.

BanuChat dispone de la composición funcional solicitada con una sola cuenta y experiencia
móvil. El cierre físico de T07 y las validaciones humanas/institucionales siguen pendientes.

## Archivos modificados o añadidos

- backend/api/README.md
- backend/api/api-contract-v2.md
- backend/api/openapi-v2.yaml
- backend/api/package.json
- backend/api/scripts/evaluate-unified-security.mts
- backend/api/scripts/evaluate-unified.mts
- backend/api/scripts/provision-unified-n8n.mts
- backend/api/scripts/provision-unified.mts
- backend/api/scripts/start-unified.mts
- backend/api/scripts/unified-check.d.ts
- backend/api/src/agent/bounded-mcp-agent.ts
- backend/api/src/application/messages.ts
- backend/api/src/auth/auth-service.ts
- backend/api/src/auth/pg-auth-store.ts
- backend/api/src/auth/resources.ts
- backend/api/src/auth/unified-product.ts
- backend/api/src/authenticated-main.ts
- backend/api/src/authenticated-runtime.ts
- backend/api/src/orchestration/n8n-conversation.ts
- backend/api/test/agent-mcp.test.ts
- backend/api/test/auth-v2-contract.test.ts
- backend/api/tsconfig.unified-check.json
- backend/mcp-server/src/server.ts
- backend/mcp-server/src/unified-main.ts
- backend/mcp-server/tools-contract.md
- backend/mcp-server/tools.contract.json
- docs/academic/oe1-oe6-final-traceability.md
- docs/transition/banuchat-unified-application-checkpoint.md
- eval/unified/README.md
- eval/unified/results/acceptance-2026-10-25.json
- eval/unified/results/mobile-client-2026-10-25.json
- eval/unified/results/security-2026-10-25.json
- infra/db/012_unified_auxiliary.sql
- mobile/.env.example
- mobile/README.md
- mobile/scripts/evaluate-unified-client.mts
- mobile/scripts/start-ccd-auth.ps1
- mobile/src/api/conversations.ts
- mobile/src/app/_layout.tsx
- mobile/src/app/announcements.tsx
- mobile/src/app/calendar.tsx
- mobile/src/app/chat.tsx
- mobile/src/app/document.tsx
- mobile/src/app/history.tsx
- mobile/src/app/home.tsx
- mobile/src/app/index.tsx
- mobile/src/app/login.tsx
- mobile/src/app/notifications.tsx
- mobile/src/auth/auth-session.ts
- mobile/src/components/chat-sources.tsx
- mobile/src/config/demo-mode.ts
- mobile/src/notifications/model.ts
- mobile/src/notifications/native-service.ts
- mobile/src/notifications/notification-provider.tsx
- mobile/test/ccd-authenticated.test.ts
- mobile/test/ccd-session-ownership.test.ts
- mobile/test/message-http-diagnostic.test.ts
- n8n/workflows/oe4-conversation-v1.json

La configuración pública mobile/.env.local también se ajustó al API v2 local; permanece ignorada por Git.


