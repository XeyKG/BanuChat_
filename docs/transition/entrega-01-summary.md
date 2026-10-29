# BanuChat — cierre de ENTREGA-01

Estado: **BANUCHAT_DELIVERY_PACKAGE_READY_FOR_ACADEMIC_REVIEW**.
29 de octubre de 2026, America/Bogota. Rama `main`; HEAD inicial y final
`17feea92291aa10118b18a1d145b348a7ac60fcd`; árbol inicial limpio.

## Entregables

| Entregable | Ruta |
| --- | --- |
| Presentación y ficha vigente | [README](../../README.md) y [estado vigente](../estado-vigente.md) |
| Procedimiento reproducible local | [Demostración Android/Unified](../operations/final-integrated-demonstration.md) |
| Matriz OE1–OE6 actualizada | [Compromisos, evidencia, brechas y estados](../academic/oe1-oe6-current-status.md) |
| Paquete breve para el director | [Revisión y decisiones pendientes](../academic/entrega-01-director-brief.md) |
| Guion de demostración/sustentación | [Recorrido y explicaciones](../academic/entrega-01-demonstration-script.md) |
| Comprobador seguro de dependencias | `scripts/demo-preflight.mjs` → `backend/api/scripts/demo-preflight.mts` |

La matriz histórica de trazabilidad recibió solamente un enlace de precedencia.
Sus citas originales y cuerpos históricos se conservaron. La matriz A4.1 y la
decisión canónica de no reclutamiento/SUS permanecen intactas. No se editó el
anteproyecto ni se sustituyeron objetivos escritos.

## Consolidación realizada

Se corrigió la presentación que describía todo como sintético, selección de
perfiles sin login, ausencia de MCP/N8N integrado, OE1 sin ejecución y Android
pendiente. La ficha vigente separa cada corte y enlaza evidencia, sin alterar los
informes históricos para hacerlos coincidir retroactivamente.

Se distingue la documentación CCD local seleccionada de los auxiliares ficticios
y de la demo sintética congelada. Se documentan RAG directo, servicios estructurados
y rama multifuente N8N/agente determinista/MCP; no se denomina ReAct a esa política.

La matriz no marca los seis objetivos como aprobados. OE1 conserva 43 intentos,
39 respuestas y cuatro abstenciones; las tres medias RAGAS bajo las referencias
siguen visibles. Android físico es evidencia técnica, sin SUS ni aceptación humana.
Fuentes, autoridad, Sheets/BPM y servidores UNAB no se inventan para cerrar brechas.
El paquete del director formula recomendaciones pendientes y no se envió a terceros.

## Comprobaciones ejecutadas en esta macrotarea

- `npm run typecheck` desde `backend/api`: correcto tras corregir un tipo del nuevo
  comprobador; no se modificó código de producto para obtener ese resultado.
- `node --import tsx --test --test-reporter=tap test/demo-preflight.test.ts test/ccd-preflight.test.ts`:
  **13/13**; cinco pruebas nuevas y ocho de validadores reutilizados. Cubren configuración,
  volumen/puerto, servicios detenidos, modelo/SDK incorrectos, deriva de publicación,
  límites de lectura y supresión de datos sensibles.
- `node scripts/demo-preflight.mjs --running --adb --report`: salida 0,
  `DEPENDENCY_CHECKS_PASSED`, **18 comprobaciones** correctas. PostgreSQL/volumen,
  current/manifest, READ ONLY, configuración de embeddings, versión/digests Ollama,
  API, Metro, dispositivo, reverses y build existente comprobados.
- No hubo arranque, reinicio o recreación de servicios. No se hizo login, consulta
  RAG, generación, nueva ejecución física Android, baseline ni RAGAS. Se reutiliza
  la evidencia física fechada de seis turnos/21 capturas, sin presentarla como nueva.
- Se verificaron enlaces locales de la presentación nueva, sintaxis del launcher,
  exclusión Git de informes privados, integridad de 136 archivos protegidos y
  `git diff --check`, incluidos los archivos nuevos.

El primer typecheck detectó una devolución `Promise<number>` en un callback de
sondeo; se corrigió en el preflight. Las comprobaciones finales son las indicadas
arriba. No se reejecutaron suites o evaluaciones completas del producto.

## Resultado operativo y límites

La comprobación final observó API/Metro existentes en loopback 3004/8084,
PostgreSQL Unified 55463, modelos fijados y un YAL-L21 con build instalado y reverses.
La comprobación anónima HTTP y `/status` no prueban el commit cargado ni la sesión;
el procedimiento exige el entrypoint conocido y completar login/recorrido en la
demostración. ADB autorizado no sustituye la identificación del dispositivo propio
por el operador ni una ejecución visual nueva.

N8N 15679 no aceptaba TCP. Esto limita la rama multifuente actual, sin impedir
entregar el paquete ni preparar el recorrido documental ya acreditado. Se dejó
expreso en el procedimiento y en el paquete del director; no se arrancó otra
instancia para forzar un resultado ni se atribuyó disponibilidad del workflow.

Los pendientes externos sustantivos son decisiones académicas sobre alcance/muestra/
métricas, ratificación y permisos de fuentes, y acceso/operación institucional si
se mantienen esos compromisos. No bloquean esta entrega documental, pero tampoco
quedan resueltos por ella. No se autorizó reclutamiento, SUS, scraping, ReAct, Sheets,
push remoto o infraestructura universitaria nueva.

## Evidencia privada e integridad

`data/ccd/local/delivery/entrega-01/`, ignorado por Git, conserva inventario inicial,
informes de preflight, log de las 13 pruebas, verificación y manifest de hashes de
entregables. Se preservan íntegros benchmarks, baseline, bancos/ledgers, respuestas,
fuentes, resultados Android y configuración/código productivos protegidos.

Los cambios versionables son documentación de presentación y el preflight con sus
pruebas; no configuración productiva, corpus, modelos, publicaciones ni contratos.
No se incluyeron documentos CCD, preguntas/respuestas privadas, secretos o capturas
en Git. No se hizo commit ni push. Se detiene la macrotarea en la preparación de
revisión académica; no constituye aprobación del director, del CCD o de UNAB.
