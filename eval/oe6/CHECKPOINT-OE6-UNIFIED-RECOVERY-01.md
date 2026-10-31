# OE6-UNIFIED-RECOVERY-01 — recuperación aislada de Unified

31/10/2026, America/Bogota.
Estado: **BANUCHAT_OE6_UNIFIED_RECOVERY_PARTIAL**.
Base limpia: `a56fc191ff4386316932f65d5849d4c2a2a9e0b9`.

## Resultado

Se respaldaron y restauraron realmente PostgreSQL Unified y OE2 en dos contenedores
nuevos secuenciales sin red/puertos ni volúmenes fuente. Concordaron las 43 y siete
tablas, estructura, ACL, propietarios, extensiones, referencias y punteros.
Las fuentes permanecieron activas, con identidad/arranque/restarts y huellas
lógicas iguales; los destinos temporales fueron eliminados.

No se declara éxito completo: N8N solo se recuperó como archivo lógico offline
de definiciones; faltan secretos/estado operativo completo. Además, 33 referencias
históricas CCD no tienen bytes coincidentes en sus raíces actuales permitidas.
El current documental sí conserva sus 107 artefactos coincidentes.

El [runbook](../../docs/operations/unified-isolated-recovery.md) entrega inventario,
dependencias, procedimiento, cobertura restaurada/verificada/no probada/bloqueada,
custodia y limpieza. El [resumen público](results/oe6-unified-recovery-2026-10-31.json)
contiene datos agregados y hashes de archivos; no documentos, conversaciones,
credenciales o verificadores de contraseña.

## Evidencia operativa

Run completo: `1d3b3e42-c077-43b7-a8f3-162ee35d933f`,
terminado `2026-10-31T19:27:20.610Z`.
La ventana del script duró 11.179 ms; fases por base 5.193/3.400 ms.
Son duraciones del ejercicio concreto, **no RTO/RPO ni latencia de aplicación**.

| Comprobación | Resultado |
| --- | --- |
| Snapshot PostgreSQL | REPEATABLE READ READ ONLY exportado y compartido con pg_dump por base; dumps por stdout, sin escribir archivos en origen |
| Unified | Dump 2.998.038 bytes; 43 tablas, tres schemas, 286 constraints de tabla, seis constraints de dominio, 29 rutinas propias, 21 triggers y 90 índices concordantes |
| CCD | Siete releases, 432 document_versions/chunks, un embedding_config; cero embeddings ausentes o con dimensión incompatible en la comprobación. Current y manifest iguales al inventario |
| Auth e historial | Cinco cuentas, 149 sesiones, 176 conversaciones, 606 mensajes y 288 citas restauradas como datos. Cero huérfanos en checks explícitos; ocho conversaciones ya sin owner se conservaron sin asignarles identidad |
| Auxiliares | Release propia y tablas de catálogo, calendario, convocatorias/progreso y relaciones con cuentas concordantes; no se convirtieron en evidencia CCD |
| OE2 | Dump 36.785 bytes; 7/7 tablas, seis releases ready, 18 snapshots, 36 orígenes, 12 proyecciones de programación y 24 anuncios; current preservado |
| Archivos CCD | 251 referencias distintas por versión/ruta/hash; 218 archivos coincidentes copiados y verificados, incluidos 107 current; 33 referencias históricas con hash distinto de los bytes disponibles |
| N8N | 12 definiciones, 12 versiones history y una referencia publicada recuperadas en archivo JSON/SQLite offline. Cero redacciones necesarias en la extracción ejecutada; no copia de tablas de credenciales/usuarios/ejecuciones o clave. Once credenciales y 116 ejecuciones solo contadas en origen |
| Roles | Flags/ACL/propietarios y membresías comparados; roles propios de copia NOLOGIN/sin passwords. Bootstrap de cluster normalizado solo en membresías internas pg_monitor y propietario plpgsql; vector creado bajo propietario original |
| Configuración / DPAPI | Seis archivos presentes y con huellas inicial/final iguales, sin descifrar/copiar secretos o usar credenciales restauradas |
| Preservación | Unified, OE2, selección N8N, configuraciones, artefactos e identidades: comparaciones concordantes |
| Limpieza | Contenedores de restore/diagnóstico propios eliminados; al cierre solo los tres contenedores fuente originales activos, mismos bindings/volúmenes, sin reinicios de la tarea |

N8N SQLite se leyó transaccionalmente con soporte WAL; no se confundió copiar
el archivo principal en caliente con un backup completo. No hubo instancia N8N
de copia, activación, webhooks, schedules o publicaciones. Las marcas active
archivadas son datos. Las definiciones/versiones y contadores seleccionados del
origen coincidieron antes/después; no se afirma huella completa de todo su volumen.

## Incidentes y decisiones observadas

1. Docker dentro del sandbox denegó el pipe; se usó el acceso autorizado del
   custodio fuera de sandbox, sin cambiar permisos de fuentes.
2. El primer validador de ACL falló por PSModulePath heredado de PowerShell 7
   hacia Windows PowerShell; se corrigió el entorno del hijo y verificó ACL.
   Otro preflight rechazó `statement_timeout=15s`: se inspeccionó y conservó
   esa opción no secreta ya existente, sin cambiar roles originales.
3. Un primer dump se conservó, pero la comprobación de archivos detectó la
   discrepancia histórica. Se inspeccionaron todas las referencias, se confirmó
   107/107 current y se delimitó cobertura parcial: nunca se copiaron bytes
   discrepantes atribuyéndoles el hash histórico ni se reparó la fuente.
4. Un restore se detuvo por SQLSTATE 42501 al tratar de reproducir el otorgante
   bootstrap de las tres membresías internas de pg_monitor. SET ROLE solo no
   resolvió esa identidad especial. Controles aislados confirmaron el mecanismo;
   se conservaron defaults internos del destino y se compararon normalizando
   bootstrap. Los roles/ACL de aplicación se mantuvieron. Destinos eliminados
   y fuentes comprobadas antes de un nuevo plan; no retry ciego.
5. La carpeta privada inicial estaba bajo el repositorio/OneDrive. Se trasladó
   exclusivamente el árbol creado por esta tarea a LOCALAPPDATA fuera de Git y
   OneDrive: 574 archivos con hashes íntegros, ACL revisadas. Se cambió el default.
   MSIX redirige físicamente carpetas locales; el guardián se corrigió para
   comprobar pertenencia local y rechazar enlaces de la carpeta de ejecución.
   El preflight final pasó; no se repitió por ello el restore ya acreditado.

No se atribuye causa de corrupción o modificación reciente a los 33 hashes:
son referencias históricas que no coinciden con la raíz consultada. Tampoco se
declara inexistencia global de esos bytes en otros archivos privados no buscados.
Las ocho conversaciones sin owner son estado anterior, no huérfanos FK creados
por restauración; no hubo backfill ni prueba de acceso con cuentas restauradas.

## Consistencia, custodia y límites

Snapshots distintos para Unified, OE2 y SQLite: **sin atomicidad global**.
Se verificó concordancia observada antes/después; no una transacción distribuida.
Restaurar filas, constraints y archivos no demuestra arranque completo del producto.
Configuración privada, DPAPI, claves N8N/modelos/dispositivo siguen siendo
dependencias externas al conjunto restaurado.

Los respaldos y reportes completos permanecen bajo
`LOCALAPPDATA/BanuChat/recovery/OE6-UNIFIED-RECOVERY-01`, con posible redirección
MSIX local, acceso exclusivo del custodio y sin eliminación. Incluyen intentos
previos y copia del script ejecutado cuyo hash coincide con el plan. La versión
final pública añade guardias/custodia y pasó preflight
`3d13849e-7775-499c-8512-f36ba5883809`; no se le atribuye otro restore.
El inventario privado conserva ruta física, hashes y estado de custodia.

No se ejecutó subida externa; se observó cero procesos OneDrive al comprobar
custodia, sin atribuir a ello auditoría retrospectiva de sincronización. No se
modificaron procesos ajenos. Retención/traslado futuro requiere decisión del
custodio; no borrar backups antes de completar esa auditoría.

## Verificación y alcance de cambios

- `node --check infra/scripts/verify-unified-recovery.mjs`: aprobado.
- `node --test infra/scripts/verify-unified-recovery.test.mjs`: **10/10**;
  guardias de fuente/destino/limpieza, rutas y MSIX, roles sin passwords,
  membresías bootstrap y redacción JSON. Sin servicios en esos tests.
- Preflight real y dos restauraciones aisladas: ejecutados con resultados
  descritos; no se presentan como prueba de toda la app.
- Quince enlaces locales comprobados sin destinos rotos; esquema JSON, conteos
  y estado parcial coherentes. Revisión de privacidad sin coincidencias con
  secretos conocidos en la entrega ni en los archivos de definiciones N8N.
- Alcance limitado a seis archivos de entrega, script sintético histórico intacto;
  `git diff --check` y comprobación equivalente de archivos nuevos sin errores.
  Git avisa de su futura normalización LF→CRLF para MJS según configuración
  existente; no se modificó gitattributes ni se renormalizó el proyecto.

Cambios limitados al script nuevo, sus pruebas, runbook, resumen saneado,
referencia en dependencias y este checkpoint único. El script histórico de
backup sintético permanece intacto. Sin cambios productivos, corpus, sesiones,
modelos, permisos, releases, REST/MCP/Agent, N8N o Mobile originales.
No benchmarks OE1, RAGAS, Android, scheduler, stress ni demo integral.
Sin commit ni push.

## Siguiente recomendación

Priorizar una **auditoría acotada de disponibilidad de artefactos históricos CCD**
en derivados/archivos ya autorizados: identificar qué releases requieren los 33
hashes y si existen copias verificables bajo custodia. No reconstruir contenido,
cambiar hashes/current o ampliar corpus automáticamente. Decidir archivo
histórico inmutable requiere una tarea y autorización propias.

Recuperación N8N nativa completa y recuperación de secretos/DPAPI quedan pendientes
de un protocolo de custodia específico. No son permiso para copiar claves a
destinos menos protegidos. OE6 continúa parcial académicamente; no hay nuevo
despliegue UNAB, portabilidad general, RTO/RPO, SLA o cumplimiento integral.
