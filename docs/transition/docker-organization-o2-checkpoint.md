# CHECKPOINT BANUCHAT — O2

Fecha: 2026-10-24. Candidato CCD autenticado reconstruido y validado en paralelo,
sin promoción, ingesta, migraciones nuevas o cambios de API/Mobile/RAG/MCP.

## Recursos finales

- `banuchat-dev-postgres-ccd-auth-1`, healthy en `127.0.0.1:55453`.
- `banuchat-dev-ccd-auth-data` y `banuchat-dev-ccd-auth` exclusivos.
- Solo el servicio `postgres-ccd-auth`; ningún recurso synthetic/automation.
- I1B activo en 55443 con su volumen y red originales.

## Resultados

| Comprobación | Resultado |
| --- | --- |
| 32 hashes O1 | PASS |
| Topología autorizada | PASS |
| Cinco roles, memberships, owners y ACL | PASS, sin bootstrap adicional |
| Estructura PostgreSQL completa | PASS, idéntica al origen |
| Datos | PASS, fingerprints 33/33 tablas |
| Acceso efectivo | PASS, 295/295 decisiones |
| TCP y rechazos | PASS, 5 permitidos y 7 denegados |
| Publicaciones | PASS, tres ready y `ccd-1.2.0` current |
| Corpus | PASS, 12 documentos y 24 versiones/chunks/embeddings 1024 |
| Procedencia | PASS, 24/24 versiones completas |
| Autenticación | PASS, 5 cuentas activas, credenciales, bindings y grants |
| Separación | PASS, CCD `synthetic=false`; cero perfiles/cursos/eventos/anuncios sintéticos |
| Persistencia | PASS, mismo ID/volumen/red y 33 fingerprints tras reinicio |

Evidencia privada: `infra/local/docker-organization/2026-10-24-o2`. No publica
contraseñas ni conversaciones.

## Diferencias e incidencias

1. El primer intento usó un bootstrap distinto. PostgreSQL impidió transferir sus
   catálogos requeridos; conservarlo añadía un superusuario. Se descartó únicamente
   ese candidato y se reconstruyó con `auth_i1b_admin` como usuario inicial. El
   globals privado omite solo su `CREATE ROLE`.
2. `pg_restore` omitió tres ACL explícitas redundantes del owner. Se repusieron y
   la comparación final quedó exacta.
3. PUBLIC tenía acceso inicial a `postgres/template1`. Se reprodujeron los ACL del
   origen y la matriz cruzada quedó exacta.
4. Durante el reinicio candidato, Docker registró después `kill/stop/die` para
   I1B. El comando del agente apuntaba al candidato y los eventos no identifican
   al emisor de la segunda parada. I1B se inició de nuevo, quedó `ready` y sus 33
   fingerprints coincidieron con la captura previa.

## Riesgos y reversión

- La parada de I1B no quedó atribuida; vigilar eventos en una futura prueba.
- `pgvector:pg16` fija versión mayor, no digest.
- API/Ollama/Mobile no se probaron contra 55453 por alcance.

Reversión: detener solo `postgres-ccd-auth`, conservar volumen/red y confirmar I1B
en 55443. No ejecutar `down -v` ni eliminar recursos históricos.

**CHECKPOINT BANUCHAT — O2: RECONSTRUIDO Y VALIDADO; NO PROMOVIDO.**
