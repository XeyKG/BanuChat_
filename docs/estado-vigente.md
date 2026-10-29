# BanuChat — estado vigente para entrega

Corte: 29 de octubre de 2026. Base `17feea92291aa10118b18a1d145b348a7ac60fcd`,
rama `main`. Estado de entrega: paquete técnico preparado para revisión académica;
ninguna aceptación del director o del CCD se presume de esta ficha.

## Producto y fuentes

La experiencia vigente es una app autenticada BanuChat, Expo SDK 57 → REST v2,
loopback 3004. La identidad es ficticia y propia del prototipo, sin federación UNAB.
La propiedad de conversaciones depende de la cuenta, no de un perfil compartido.

| Fuente | Uso y límites |
| --- | --- |
| CCD 1.4.0 seleccionado | Document RAG sobre derivados locales con procedencia y restricciones; 107 unidades publicadas. Sin ratificación institucional formal |
| Auxiliares ficticios | Perfiles, cursos/progreso, calendario y novedades; publicación y schema separados del corpus documental |
| `data/synthetic` | Demo histórica y fixtures congelados. No es fallback oculto de documentación CCD |
| Fuentes externas institucionales | Sin adquisición automática real autorizada, federación ni sincronización institucional acreditadas |

Unified usa `banuchat_unified`, contenedor `banuchat-unified-postgres`, volumen
`banuchat-unified-data`, puerto loopback 55463. Current documental:
`10af4ffd-effb-41fc-bbfe-4dc48cb3398f`; manifest
`fde23cabe95c83f5bd632d129312ad68c90624e6ebd489e79e98c6a3d0d96852`.
Son identidades técnicas del corte, no valores para mostrar al usuario final.

## Camino implementado

- Datos estructurados: router → servicios de aplicación → PostgreSQL auxiliar.
- Documentos: router/política CCD → Document RAG → recuperación exacta coseno en
  pgvector → selección/presentación o síntesis mediante Ollama → citas e historial.
- Multifuente acotada: N8N correlaciona una transición → agente determinista →
  MCP de lectura sobre documentos CCD y auxiliares autorizados. No es ReAct LLM.
- Ingesta: workflow manual local N8N → `backend/rag`; la lógica de procesamiento,
  embeddings y publicación permanece en el backend. No prueba scraping periódico.

Embeddings: `qwen3-embedding:0.6b`, 1024 dimensiones; generador:
`qwen3:4b-instruct`; Ollama local. Las revisiones se verifican contra configuración
privada y release. No se usa un agente para cada pregunta ni N8N para cada turno.

## Evidencia acreditada, con fecha y alcance

| Evidencia | Resultado y frontera |
| --- | --- |
| [OE1-CIERRE-02](../eval/rag-quality/results/oe1-cierre02-technical-report.md), 29/10 | Baseline real de 43; 39 respuestas, cuatro abstenciones, cero errores/timeouts. Cierre técnico con aceptación académica pendiente |
| [FLOW-01/02](../eval/rag-quality/CHECKPOINT-CCD-FLOW-01-02.md), 29/10 | Interpretación y evidencia por atributos; regresión de desarrollo conocida, sin nueva evaluación ciega |
| [CCD-INTEGRATION-01](../eval/integration/results/ccd-integration-01-summary.md), 29/10 | FLOW-03/04 y entrada documental; 157 pruebas API, 41 Mobile; REST y adaptadores con fuentes/historial/sesión |
| [Android CCD 1.4.0](../eval/mobile/results/android-mvp-ccd14-validation.md), 29/10 | Seis turnos físicos, dos aperturas de fuente, historial, restauración y logout; 21 capturas privadas, un YAL-L21/Android 10 |
| [Aplicación unificada](transition/banuchat-unified-application-checkpoint.md) | Integración MCP/N8N y auxiliares con evidencia local previa; sus números de corpus y banners pertenecen a aquel corte |

Las métricas OE1 describen la implementación anterior congelada. Las mejoras y
la demo posteriores no reemplazan esas métricas ni demuestran mejora cuantitativa
general. Las pruebas anteriores no se presentan como reejecutadas en ENTREGA-01.

## Contradicciones resueltas para la presentación

| Lectura anterior | Lectura vigente y evidencia |
| --- | --- |
| Todo es sintético y se selecciona perfil libremente | Documentos CCD privados + auxiliares ficticios; login v2, owners y perfil asignado |
| MCP solo contrato y N8N siempre fuera del chat | MCP y agente acotado implementados; N8N solo en ciertos planes multifuente, según `backend/api/src/auth/unified-product.ts` |
| No hay RAGAS/banco aceptado o falta ejecutar todo OE1 | Existe baseline de 43 y RAGAS exploratorio; faltan aceptación académica, suficiencia de muestra y validación independiente |
| Android físico pendiente | Antecedente verdadero en CCD-INTEGRATION-01; la validación física posterior CCD 1.4.0 lo resuelve para ese dispositivo y recorrido |
| Demo requiere alternar v1 Docker y v2 separados | El procedimiento vigente usa Unified v2 y el build existente por USB |
| Laboratorios 55443/55453 o API 3003 como operación normal | Antecedentes históricos; este procedimiento exige 55463/3004 y sus identidades exactas |

No se reescriben checkpoints, resultados ni el anteproyecto para borrar esas
diferencias temporales. AGENTS.md conserva restricciones de seguridad/datos y
resúmenes arquitectónicos de incrementos anteriores; para composición vigente
rigen el código y contratos específicos, esta ficha y las evidencias fechadas.
La matriz A4.1 conserva el compromiso escrito; la
[matriz vigente](academic/oe1-oe6-current-status.md) compara ese compromiso con la
evidencia actual sin sustituir objetivos.

## Pendientes reales

La aceptación académica de OE1, su muestra de 43, MRR@5 y el juez sigue pendiente.
OE2–OE6 conservan brechas respecto del alcance original. SUS no se ejecutó ni está
autorizado; [la decisión canónica](academic/oe5-human-validation-closure-decision.md)
mantiene sus criterios originales no cumplidos. La alternativa del autor es una
propuesta pendiente, no una aprobación.

El preflight de ENTREGA-01 comprueba dependencias, sin login ni preguntas nuevas.
En la ejecución registrada API, Metro, PostgreSQL/Ollama, modelos y USB pasaron;
N8N 15679 no aceptaba TCP. La demo documental puede prepararse; una demostración
multifuente exige restaurar y comprobar su servicio existente por separado.
No se arrancó ni se recreó infraestructura para cambiar ese resultado.
