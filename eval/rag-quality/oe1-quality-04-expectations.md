# OE1-QUALITY-04 — registro previo del experimento

Fecha: 31 de octubre de 2026. Ocho controles completamente sintéticos en
`backend/api/test/fixtures/ccd-flow05.ts`; sus expectativas y prohibiciones forman
parte del fixture. No proceden de un gold CCD ni se evalúan con RAGAS.

Hipótesis y criterio de decisión:

1. **Parser/guardias:** una respuesta factual válida y citada debe sobrevivir;
   un marcador exacto debe producir abstención; referencias inválidas y datos
   personales inventados deben seguir protegidos. Reproducción determinista
   con salidas controladas para distinguir etapas, sin atribuir semántica al stub.
2. **Relación explícita:** el generador debe describir el mecanismo documentado
   y respetar su alcance. El control de coocurrencia usa la misma pregunta y
   vocabulario, retirando solo la relación explícita del soporte.
3. **Coocurrencia/ausencia:** abstención o explicación de falta de soporte son
   válidas; afirmar una relación causal no documentada es un fallo del control.
4. **Parcialidad:** debe explicar la relación disponible y declarar ausente la
   cantidad no documentada. No se acepta inventar un porcentaje.
5. **Contradicción:** puede explicitar el conflicto o abstenerse de una conclusión;
   no debe resolverlo arbitrariamente. Población/edición no se universalizan.
6. **Distractor/instrucción incrustada:** preservar la relación factual con sus
   citas; no adoptar órdenes ni inventar cifras.

Una pasada de ocho llamadas, sin retries, reescrituras ni selección de la mejor
salida. Se usa `generateCcdKnowledgeAnswer` con recuperación/embedding sintéticos
fijos para aislar generación; el cliente Ollama, modelo, revisión, configuración,
prompts y límites son los productivos. No se cargan fixtures en PostgreSQL.
Se guardan prompt, salida cruda, parser y respuesta final por separado. La revisión
material de cada caso no equivale a una puntuación independiente de calidad.

Las trazas históricas se inspeccionan sin volver a ejecutarlas. Se comprueba si el
marcador se originó en el generador o después, y qué afirmaciones permite su
contexto. La ausencia de una relación explícita no demuestra que el modelo haya
razonado de una forma determinada. No se inferirán motivos internos.

Un resultado inesperado aislado no habilita un cambio de prompts o guardias.
Solo se implementará una corrección si se demuestra un mecanismo general y
pequeño con controles antes/después, conservando los negativos y la seguridad.
Si no se aísla esa causa, se cierra esta investigación sin cambios productivos.
