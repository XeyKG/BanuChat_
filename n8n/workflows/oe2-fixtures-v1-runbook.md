# Runbook — OE2 fixture flows v1

Los tres workflows `oe2-*-fixture-v1.json` preparan disparadores de seis horas para
oferta académica, convocatorias y novedades. Permanecen `active=false`. Solo pueden
invocar los IDs `fixture-*` aceptados por el servicio OE2; no contienen URLs UNAB/CCD
ni habilitan extracción real.

## Configuración local

1. Compilar `backend/rag` y levantar `npm run start:oe2` con:
   `BANUCHAT_OE2_FIXTURE_ROOT`, `BANUCHAT_OE2_STATE_ROOT` y un
   `BANUCHAT_OE2_SERVICE_TOKEN` local de al menos 32 caracteres.
2. Reemplazar `__BANUCHAT_OE2_BASE_URL__` en la copia importada. En Windows con el
   contenedor N8N podría ser `http://host.docker.internal:3011`, pero debe verificarse
   para el entorno; no es una topología portable.
3. Revincular la credencial Header Auth `BanuChat OE2 Service`. No versionar el token
   ni el ID interno de la credencial.
4. Probar manualmente `Check Last Valid State` y luego el flujo completo.
5. Activar un schedule solo para una evaluación local expresamente planificada.

Los nodos HTTP tienen retry automático desactivado. Si status falla, no se ejecuta
el flujo. Si run falla después de una publicación válida local, el reemplazo atómico
no ocurre y el último snapshot permanece. La siguiente ejecución programada vuelve a
consultar estado y ejecuta una vez; no llama al retry/recover de la ingesta CCD porque
estos fixtures nunca crean una release CCD.

## Automatización verificada OE2/OE4-AUTOMATION-01

La evaluación real del scheduler está en
[el runbook reproducible](../../eval/oe2/automation/README.md) y
[su checkpoint final](../../eval/oe2/automation/CHECKPOINT-OE2-OE4-AUTOMATION-01.md).
Los exports mantienen seis horas y `active=false`; la prueba utiliza otros IDs y
un intervalo de 10 segundos, con desactivación al terminar.

El servicio actualizado conserva los bodies cerrados de `run` y `status`, y los
campos de `Oe2RunResult`. Añade opcionalmente el header de correlación
`X-BanuChat-Operation-Id` y `operation_state: idle|running` en status. N8N admite
únicamente `idle`; un bloqueo huérfano exige inspección del operador, sin TTL,
recovery ni eliminación automática. Fuentes y estado deben ser raíces disjuntas.
Compilar backend antes de importar estos exports actualizados.

Un error de run conduce a una sola consulta de status y después termina como error
observable de N8N. Si tampoco puede consultar status, solicita inspección manual.
Nunca repite run dentro de la misma ejecución. La próxima activación independiente
empieza otra vez consultando estado. Una fuente vacía devuelve `SOURCE_EMPTY` sin
borrar el último snapshot; fechas imposibles, duplicados y estado alterado se
rechazan. Las averías de adquisición se distinguen de requests malformados mediante
errores saneados. Un fallo de registro posterior al guardado puede dejar un estado
válido avanzado: se debe consultar status antes de repetir, sin suponer rollback.

No activar estos workflows con fuentes reales. Antes se requiere aceptar la fuente,
confirmar autoridad, términos/robots, permiso de automatización, contrato de campos,
política de altas/modificaciones/bajas y política de admisión/publicación CCD.
