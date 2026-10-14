# M8.3-A — diagnóstico de sensibilidad por paráfrasis

Diagnóstico del Document RAG productivo con dos preguntas sintéticas. No es RAGAS, no cambia producción y sus dos casos no constituyen una muestra estadística.

## A. Configuración observada

- Revisión: `c4cc054cac714792264b97923b547caf63864681`.
- Release ready: `6a770ce7-13b7-4b0b-95ae-0c193fa0d655`; embedding config: `0c9bd084-29ad-4e26-ab17-d4a5aad24cdb`.
- Embedding: `qwen3-embedding:0.6b`, digest `ac6da0dfba84a81fdbfbaf330198c33cd77c4cdfc53e8bc50eb581914a15621d`, runtime `0.35.0`, dimensión 1024, coseno, query recipe `{"options":{"num_ctx":4096},"truncate":false,"dimensions":1024,"input_prefix":null,"normalization":"none"}`.
- Generador: `qwen3:4b-instruct`, digest `0edcdef34593eac1aa2be9c7d06c432dcf81945adca5eca2f27662c18f168ba0`, runtime `0.35.0`, receta `{"think":false,"stream":false,"options":{"temperature":0,"num_predict":256},"keep_alive":"5m"}`.
- Retrieval productivo: top_k=5.

## B. Comparación de embeddings

- Cosine similarity A↔B: 0.8977666922289487.
- Máxima diferencia absoluta por componente: 0.06268077600000001.
- Dimensión: 1024; normas A/B: 1.0000000865081167 / 0.9999999681124192.

## C. Comparación de retrieval

- Top-1 igual: true; mismo conjunto top-5: false; mismo orden: false.
- Intersección: 4/5; Jaccard: 0.6666666666666666.
- Mejor rank relevante de doc-008 A/B: 2 / 2.

### Top-5 A

| Rank | Documento | Ordinal | Locator | Similitud | Evidencia requerida |
|---:|---|---:|---|---:|---|
| 1 | doc-008 | 3 | section:3:4. Información que no debe compartirse | 0.6451475428000966 | false |
| 2 | doc-008 | 1 | section:1:2. Describir lo observado | 0.5867120869927448 | true |
| 3 | doc-008 | 4 | section:4:5. Revisión de una incidencia | 0.5333277384424198 | false |
| 4 | doc-008 | 5 | section:5:6. Continuación segura | 0.45419825215381326 | false |
| 5 | doc-008 | 2 | section:2:3. Comprobaciones iniciales | 0.44832069297782584 | false |

### Top-5 B

| Rank | Documento | Ordinal | Locator | Similitud | Evidencia requerida |
|---:|---|---:|---|---:|---|
| 1 | doc-008 | 3 | section:3:4. Información que no debe compartirse | 0.7043551836331381 | false |
| 2 | doc-008 | 1 | section:1:2. Describir lo observado | 0.6363907239670005 | true |
| 3 | doc-008 | 4 | section:4:5. Revisión de una incidencia | 0.5746871246582694 | false |
| 4 | doc-008 | 5 | section:5:6. Continuación segura | 0.5466881338729738 | false |
| 5 | doc-008 | 0 | section:0:1. Alcance de la ayuda | 0.5279959340110398 | false |

### Contenido pertinente de doc-008 recuperado

**Rank observado 2; section:1:2. Describir lo observado**

````text
# Soporte y reporte de incidencias

## 2. Describir lo observado

Una descripción útil indica qué se intentaba hacer, qué ocurrió y qué se esperaba según el material. Conviene utilizar títulos o claves del escenario para identificar el contexto. No es necesario incluir información personal, rutas del dispositivo o capturas de servicios ajenos para explicar una dificultad de la práctica.

Debe distinguirse observación de interpretación. “La lista aparece vacía” describe un resultado visible; “se borraron todos los datos” sería una conclusión que necesita evidencia adicional. Esta separación permite revisar el problema sin incorporar una causa imaginada desde el comienzo.

Cuando se desconozca un detalle, se señala como desconocido. Una reconstrucción aproximada no debe presentarse como registro exacto de lo sucedido. También resulta útil indicar si el comportamiento pudo repetirse una vez en condiciones similares, sin insistir indefinidamente ni ejecutar acciones que puedan duplicar contenido.

````

## D. Comparación de contextos

- A: evidencia total 4706 caracteres; system SHA-256 `b884faf148c4d326f19031379812f7111bca601a5f131704527eec5b90141063`; user prompt SHA-256 `ed0585d2814585c33e3e3ad8c09b68cc6c911e26864d13c0938708d89be1be52`.
- B: evidencia total 4831 caracteres; system SHA-256 `b884faf148c4d326f19031379812f7111bca601a5f131704527eec5b90141063`; user prompt SHA-256 `4b2f33889553ef571143af9314113f8be98eab56d69c31005fed8feb0bca05d0`.
- El orden, títulos, locators y longitudes por chunk están en el JSON.

## E. Outputs del generador

### M8.3-A1, repetición 1

- Marker: false; done_reason: `stop`; prompt_eval_count: 1442; eval_count: 213; total_duration_ms: 20127.8602.

````text
Debes incluir:

- Qué se intentaba hacer.  
- Qué ocurrió (observación, no interpretación).  
- Qué se esperaba según el material.  
- Si el problema es falta de instrucción, insumo o lectura de contenido.  
- Si el resultado fue incierto, describir esa incertidumbre.  
- Si se desconoce un detalle, señalarlo como desconocido.  
- Si el paso pudo repetirse, indicarlo.  
- Si hay ambigüedades, señalarlas y proponer cómo continuar.  
- No incluir información personal, rutas de dispositivo o capturas de servicios ajenos.  
- No presentar reconstrucciones como registros exactos.  
- No suponer que la aclaración corrigió automáticamente el progreso.  
- No rellenar resultados faltantes para aparentar completitud.  

La ayuda termina cuando el siguiente paso está claro o se reconoce qué información falta.
````

### M8.3-A1, repetición 2

- Marker: false; done_reason: `stop`; prompt_eval_count: 1442; eval_count: 193; total_duration_ms: 17667.7535.

````text
Debes incluir:

- Qué se intentaba hacer.  
- Qué ocurrió (observación, no interpretación).  
- Qué se esperaba según el material.  
- Si el problema es falta de insumo, ambigüedad en instrucción o imposibilidad de lectura.  
- Si el resultado fue visible o incierto, y si se puede confirmar el último paso.  
- Si el paso pudo repetirse bajo condiciones similares.  
- Si hay ambigüedades o faltas de criterios, señálalas concretamente.  
- Si falta información indispensable, indícalo y no supongas soluciones.  

No incluir información personal, rutas del dispositivo, capturas de servicios ajenos ni datos sensibles. Si se requiere una reconstrucción, debe ser claramente indicada como tal y no presentada como registro exacto.
````

### M8.3-A1, repetición 3

- Marker: false; done_reason: `stop`; prompt_eval_count: 1442; eval_count: 193; total_duration_ms: 10395.7466.

````text
Debes incluir:

- Qué se intentaba hacer.  
- Qué ocurrió (observación, no interpretación).  
- Qué se esperaba según el material.  
- Si el problema es falta de insumo, ambigüedad en instrucción o imposibilidad de lectura.  
- Si el resultado fue visible o incierto, y si se puede confirmar el último paso.  
- Si el paso pudo repetirse bajo condiciones similares.  
- Si hay ambigüedades o faltas de criterios, señálalas concretamente.  
- Si falta información indispensable, indícalo y no supongas soluciones.  

No incluir información personal, rutas del dispositivo, capturas de servicios ajenos ni datos sensibles. Si se requiere una reconstrucción, debe ser claramente indicada como tal y no presentada como registro exacto.
````

### M8.3-A2, repetición 1

- Marker: false; done_reason: `stop`; prompt_eval_count: 1455; eval_count: 185; total_duration_ms: 17919.3716.

````text
- Qué se intentaba hacer  
- Qué ocurrió  
- Qué se esperaba según el material  
- Una descripción segura del resultado, sin incluir información personal o sensible  
- Distinguir observación de interpretación  
- Indicar si el comportamiento pudo repetirse  
- Señalar si falta información indispensable  
- No incluir rutas del dispositivo, capturas de servicios ajenos o datos privados  
- Si hay ambigüedades, señalarlas concretamente y explicar cómo se puede continuar  
- No presentar reconstrucciones como registros exactos  
- No suponer que la aclaración corrigió automáticamente todos los borradores  
- No rellenar resultados faltantes para aparentar una ejecución completa  
- Delimitar claramente el problema y evitar acciones inseguras  

Evidencia suficiente.
````

### M8.3-A2, repetición 2

- Marker: false; done_reason: `stop`; prompt_eval_count: 1455; eval_count: 185; total_duration_ms: 13200.4465.

````text
- Qué se intentaba hacer  
- Qué ocurrió  
- Qué se esperaba según el material  
- Una descripción segura del resultado, sin incluir información personal o sensible  
- Distinguir observación de interpretación  
- Indicar si el comportamiento pudo repetirse  
- Señalar si falta información indispensable  
- No incluir rutas del dispositivo, capturas de servicios ajenos o datos privados  
- Si hay ambigüedades, señalarlas concretamente y explicar cómo se puede continuar  
- No presentar reconstrucciones como registros exactos  
- No suponer que la aclaración corrigió automáticamente todos los borradores  
- No rellenar resultados faltantes para aparentar una ejecución completa  
- Delimitar claramente el problema y evitar acciones inseguras  

Evidencia suficiente.
````

### M8.3-A2, repetición 3

- Marker: false; done_reason: `stop`; prompt_eval_count: 1455; eval_count: 185; total_duration_ms: 8990.5141.

````text
- Qué se intentaba hacer  
- Qué ocurrió  
- Qué se esperaba según el material  
- Una descripción segura del resultado, sin incluir información personal o sensible  
- Distinguir observación de interpretación  
- Indicar si el comportamiento pudo repetirse  
- Señalar si falta información indispensable  
- No incluir rutas del dispositivo, capturas de servicios ajenos o datos privados  
- Si hay ambigüedades, señalarlas concretamente y explicar cómo se puede continuar  
- No presentar reconstrucciones como registros exactos  
- No suponer que la aclaración corrigió automáticamente todos los borradores  
- No rellenar resultados faltantes para aparentar una ejecución completa  
- Delimitar claramente el problema y evitar acciones inseguras  

Evidencia suficiente.
````

## F. Estabilidad de tres corridas

- A: insuficiente 0/3; respondida 3/3; retrieval mismo orden=true; output idéntico=false.
- B: insuficiente 0/3; respondida 3/3; retrieval mismo orden=true; output idéntico=true.

## G. Clasificación de causa

**INCONCLUSIVE** — El patrón observado no fue A insuficiente 3/3 y B respondida 3/3; no se fuerza atribución.

La categoría describe únicamente estas seis ejecuciones sobre la configuración registrada. No demuestra calidad global del RAG.
