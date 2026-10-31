# BanuChat — diagnóstico de referencias CCD anteriores

OE6-CCD-HISTORICAL-ARTIFACTS-01, 31/10/2026.
Estado: **BANUCHAT_CCD_HISTORICAL_ARTIFACTS_DIAGNOSED**.
Base limpia: `db7918137af31a16e504a8c7160f823f4b68c5e6`.

Las 33 referencias pertenecen a **una candidata staging**, no a publicaciones
ready desaparecidas. Existen copias físicas con SHA-256 exacto para las 33.
Se observaron 49 coincidencias en las raíces autorizadas; no se copiaron archivos
al producto ni se cambiaron mappings, estados, documentos o publicaciones.

## Unidad de análisis y método

Una referencia es la tupla etiqueta de versión, ruta relativa y hash esperado.
El [ejercicio de recuperación](../CHECKPOINT-OE6-UNIFIED-RECOVERY-01.md) había
comprobado 251 tuplas, 218 coincidentes y 33 discrepantes en las raíces runtime.
Ese resultado limitado se conserva: no había buscado archivos de auditoría.
Aquí se añade esa búsqueda y se distingue el estado de cada release.

Se consultaron metadatos documentales y relaciones mediante transacciones
PostgreSQL REPEATABLE READ READ ONLY, sin sesiones de aplicación nuevas.
No se seleccionó texto de mensajes o conversaciones. El hash de contenido
documental se calculó dentro de PostgreSQL sin devolver ese contenido.

El inventario privado conserva por referencia release, document_version_id,
etiqueta, ruta, hashes esperado/disponible, existencia, variantes de la misma
ruta, estado, copias verificadas y relación con chunks. El
[resumen público](ccd-historical-artifacts-2026-10-31.json) usa alias de release
y conteos; excluye identificadores documentales, hashes de contenido, rutas
absolutas, textos y datos personales.

## Clasificación de las 33 referencias

| Categoría principal | Referencias | Evidencia |
| --- | ---: | --- |
| A. Archivo inexistente | 0 | Las 33 rutas tienen archivo |
| B. Hash distinto sin mecanismo adicional demostrado | 0 | La observación física de hash distinto ocurre en las 33, pero se clasifica bajo D por la relación demostrada con versiones posteriores |
| C. Posible desplazamiento/cambio de raíz como explicación principal | 0 | Hay copias en otras raíces, pero la raíz runtime compartida y sus bytes actuales explican las discrepancias |
| D. Referencia anterior cuyo archivo disponible corresponde a versión posterior | 33 | Misma etiqueta/ruta; hash esperado de la candidata distinto del archivo actual; hash disponible coincide con la versión current de esa ruta |
| E. Causa observable no determinada | 0 | Se identificó el mecanismo de localización compartida; fecha exacta y autor/proceso de sustitución no investigados |

Las categorías son excluyentes: **33 observaciones físicas B** se clasifican
primariamente como **33 casos D**, sin sumarlas como 66. La etiqueta
`bch-ccd-knowledge-2` resuelve una raíz mutable única aunque varias releases
CCD 1.4.0 la reutilicen. El puntero identifica una release concreta; el
almacenamiento de artefactos se resuelve por etiqueta y ruta, sin discriminar
las distintas preparaciones de esa misma etiqueta.

Esto acredita coexistencia de referencias anteriores y bytes posteriores en
la raíz compartida. No demuestra corrupción reciente, pérdida de documentos,
fecha de sobrescritura o responsable. En particular, ninguna de las referencias
discrepantes pertenece a una release ready.

## Matriz de releases

Alias correlativos por fecha de importación. Las fechas son UTC y
`imported_at` **no es una fecha acreditada de publicación**.

| Alias | Esquema | Estado observado | Importación UTC | Versiones documentales | Afectadas | Citas a afectadas | Conversaciones relacionadas |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: |
| R1 | CCD 1.0.0 | ready, anterior | 21/10 22:56 | 2 | 0 | 0 | 0 |
| R2 | CCD 1.1.0 | ready, anterior | 21/10 23:52 | 10 | 0 | 0 | 0 |
| R3 | CCD 1.2.0 | ready, anterior | 22/10 05:38 | 12 | 0 | 0 | 0 |
| R4 | CCD 1.3.0 | ready, anterior | 26/10 21:37 | 87 | 0 | 0 | 0 |
| R5 | CCD 1.4.0 | **staging**, candidata anterior | 27/10 13:38 | 107 | **33** | **0** | **0** |
| R6 | CCD 1.4.0 | staging, candidata posterior | 27/10 14:20 | 107 | 0 | 0 | 0 |
| R7 | CCD 1.4.0 | **ready, current** | 28/10 07:33 | **107** | **0** | **0** | **0** |

Son 432 document_version_id en total: 218 en releases ready y 214 en staging.
Los 33 document_version_id afectados están solo en R5; sus 33 rutas distintas
no constituyen prueba de “33 documentos perdidos”. Las columnas de citas y
conversaciones cuentan únicamente relaciones con las versiones afectadas,
no el total del historial de cada release.

## Búsqueda limitada y copias verificadas

Se recorrieron ocho raíces explícitas y 650 archivos Markdown en total.
Cinco son las raíces documentales admitidas por el producto; otra contiene los
artefactos ya verificados del respaldo anterior. Las dos restantes son archivos
locales de auditoría de la candidata, respaldados por los checkpoints
[P4B](../../rag-quality/results/ccd-canonical-candidate-validation.md) y
[P4B1](../../rag-quality/results/ccd-canonical-candidate-p4b1-closure.md).
No se buscaron discos, carpetas personales, originales externos o nube.

| Área de búsqueda | Markdown comprobados | Coincidencias con los 33 hashes buscados |
| --- | ---: | ---: |
| Raíces runtime CCD 1.0/1.1/1.2 | 24 | 0 |
| Raíz runtime CCD 1.3 | 87 | 8 |
| Raíz runtime CCD 1.4 actual | 107 | 0 |
| Artefactos verificados en custodia OE6 | 218 | 8 |
| Archivo de auditoría P4B | 107 | **33** |
| Snapshot de entradas P4B1 | 107 | 0 |
| Total | **650** | **49** |

El archivo P4B contiene una coincidencia exacta para cada hash buscado. Ocho de
esos contenidos también coinciden con archivos de la raíz CCD 1.3 y con sus
copias en custodia. **49 ubicaciones no son 49 documentos ni 49 referencias**.
Ninguna coincidencia se aceptó solo por nombre; se verificaron los bytes por hash.

Además, cada una de las 33 versiones tiene un único chunk cuyo contenido UTF-8
produce exactamente el hash esperado del artefacto. Se comprobó mediante SQL
sin extraer texto. La huella completa de document_chunks coincide con la del
dump Unified ya restaurado y validado anteriormente. Esto demuestra otra
representación verificable conservada, sin reconstruir ni exportar documentos
ahora; no equivale a un archivo histórico ya ubicado en la raíz runtime.

El inventario de ubicaciones exactas permanece privado bajo la custodia local
de diagnóstico. No se duplicaron archivos sensibles, generaron sustitutos,
usaron modelos ni modificaron metadatos para fabricar coincidencias.

De las 49 ubicaciones, 41 siguen en raíces privadas existentes del repositorio
bajo OneDrive y ocho están en la custodia externa del respaldo. Identificar una
copia no acredita archivo inmutable o custodia fuera de sincronización de todas
ellas. No se trasladaron ni cambiaron permisos de esos originales.

## Impacto funcional y guardias

- Una candidata staging afectada; 33 document_version_id; **cero citas,
  mensajes o conversaciones persistidos relacionados** con ellos.
- La comprobación adicional por chunk o procedencia documental también devuelve
  cero citas; ninguna conversación ni mensaje está fijado a la release afectada.
  Solo se leyeron relaciones y conteos; sus textos no se abrieron.
- Las **218 versiones de releases ready** tienen archivos coincidentes en sus
  raíces, incluidas las **107 del current CCD 1.4.0**.
- Se invocó el servicio real `getDocumentArtifact` con SQL de lectura para las
  33 versiones afectadas: 33 resultados `not_found`. Su consulta filtra
  `processing_status='ready'` y release ready. En este caso, **el estado staging
  produce el rechazo antes de acceder al sistema de archivos**.
- No se atribuyen esos 33 resultados al guard de hash: ese guard posterior no
  se alcanzó para las versiones staging. La discordancia de archivos se comprobó
  separadamente; su rechazo por hash se acredita con fixtures sintéticos.
- Una muestra del servicio sobre current devolvió bytes verificados. Las otras
  106 referencias current se comprobaron por hash, sin atribuirles 106 llamadas
  adicionales al servicio.

La capa de recursos también filtra releases no ready; el mapper HTTP convierte
`not_found` en NOT_FOUND. No se ejecutó una petición HTTP autenticada nueva,
ni se probó acceso de usuarios a esos candidatos. La conclusión HTTP es
condicional a una sesión/autorización válidas, no un registro de 33 HTTP 404.
No se detectó ni se atribuyó un fallo actual de RAG a estas referencias.

## Custodia y riesgo OneDrive

Antes de inspeccionar evidencia se comprobaron los respaldos bajo LOCALAPPDATA,
fuera del repositorio y OneDrive: cinco archivos principales presentes, ACL
sin reglas Allow para otros usuarios y carpeta temporal anterior ausente.
El SHA-256 del dump Unified sigue coincidiendo con la custodia registrada.
Se mantienen las posibles redirecciones MSIX locales, sin tratarlas como nube.

Se examinaron **solo metadatos** de archivos inmediatos de logs y settings
OneDrive Personal: tamaños, extensiones y fechas. Los logs disponibles tenían
última modificación el 26/10 y los settings el 31/10 a las 05:52 UTC; estos
metadatos no acreditan una operación por archivo durante la ventana posterior
del respaldo. No se decodificaron logs, abrieron cuentas, leyeron credenciales,
accedió a nube o eliminaron materiales.

**Sincronización histórica: NO DETERMINADO.** Ni la ausencia del temporal ni
el estado final del proceso OneDrive demuestran ausencia de sincronización.
La custodia local actual está comprobada; la posible exposición histórica
requiere una decisión explícita del custodio sobre alcance de otra revisión,
retención y tratamiento del riesgo. Esta tarea no concede ni ejecuta acceso cloud.

## Recomendación técnica

**Conservar el producto y registrar la deuda de reproducción de la candidata.**
No hay impacto observado en current, publicaciones ready o citas existentes
que justifique restaurar o cambiar mappings ahora. No se necesita crear una
release ni cambiar estados staging para cerrar este diagnóstico.

Para una futura tarea autorizada de conservación:

1. Mantener archivos inmutables por candidata/release y hash antes de reutilizar
   una raíz de preparación. Conservar un índice de procedencia que vincule
   document_version_id, release, ruta original y hash esperado.
2. Usar las copias exactas inventariadas si se requiere reproducir R5, mediante
   revisión y copia controlada a un archivo separado. No sobrescribir el current,
   alterar campos persistidos o habilitar acceso HTTP de una candidata staging.
3. Evaluar un resolvedor interno por versión concreta o archivo por hash para
   evitar que preparaciones de la misma etiqueta compartan bytes mutables.
   Cualquier implementación necesita tarea propia y pruebas de autorización,
   containment y hash; no exige ni autoriza cambiar contratos REST/MCP aquí.
4. Rechazar siempre un hash incorrecto y evitar fallback automático a otra
   versión. Una coincidencia exacta permite proponer recuperación controlada,
   no sustituir silenciosamente procedencia o autorización.

La conservación por versión previene que una futura reutilización afecte una
release ready, pero ese fallo futuro no se presenta como ocurrido. Las evidencias
anteriores de recuperación siguen siendo parciales en su alcance original;
encontrar copias hoy no acredita haberlas restaurado entonces o ahora.

## Reproducción y preservación

La consulta suplementaria inicial fue rechazada por sintaxis (SQLSTATE 42601)
antes de abrir la transacción; se corrigió el BEGIN y se ejecutó la lectura.
Las huellas de conversaciones, mensajes y citas coinciden también en esa
comprobación adicional. No se escribió en origen ni se reintentó una mutación.

Desde backend/api:

```powershell
node --check ../../infra/scripts/diagnose-ccd-historical-artifacts.mjs
node --import tsx --test ../../infra/scripts/diagnose-ccd-historical-artifacts.test.mjs test/document-artifact.test.ts
node --import tsx ../../infra/scripts/diagnose-ccd-historical-artifacts.mjs --run-once
```

El último comando es opt-in, usa acceso local existente a Docker y escribe solo
diagnóstico privado y resumen público; no restaura, publica o copia documentos.
No es una tarea de scheduler. La búsqueda tiene límites de profundidad, cantidad
y tamaño y rechaza escapes/symlinks. Un entorno distinto o un inventario distinto
de 251/33 requiere diagnóstico; no amplía automáticamente sus raíces.

En la pasada real coincidieron antes/después las huellas de las 43 tablas
Unified, identidad/arranque del contenedor, 251 observaciones de artefactos
runtime, 650 archivos candidatos y dump bajo custodia. No hubo cambios de corpus,
cuentas, sesiones, contratos, permisos, RAG, MCP, N8N, Agent o Mobile.
