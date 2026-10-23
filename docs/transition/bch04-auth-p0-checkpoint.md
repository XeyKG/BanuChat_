# CHECKPOINT BANUCHAT — BCH-04 / AUTH-P0

Fecha: 2026-10-22. Base: `705fb555b6ee050df4c5d07b68724251963a83f9`, diseño X01-AUTH.1 aceptado por Sala de Control. Árbol limpio al iniciar. Se mantiene OE1–OE6, con autenticación propia y cuentas permanentemente sintéticas. No existe integración UNAB implementada/autorizada.

## 1. Resultado preparado para revisión

AUTH-P0 entrega contratos candidatos de implementación final, una migración aditiva exacta **sin aplicar** y reglas de autorización/permisos. No es un login operativo: no se crearon handlers, cuentas, sesiones, transportes de correo, roles o datos. No se inicia AUTH-P1.

### Archivos añadidos

| Archivo | Entregable |
| --- | --- |
| [api-contract-v2.md](../../backend/api/api-contract-v2.md) | Semántica normativa v2: autoridad sintética, validación, sesiones, recursos, recuperación, abuso y errores |
| [openapi-v2.yaml](../../backend/api/openapi-v2.yaml) | OpenAPI 3.1.0/JSON Schema 2020-12 independiente, versión 2.0.0, quince operaciones; JSON como subconjunto YAML |
| [006_synthetic_auth.sql](../../infra/db/006_synthetic_auth.sql) | Once tablas nuevas en banuchat_auth, restricciones/FKs/índices, guardias de destino y revocación PUBLIC solo de objetos nuevos; no aplicada |
| [auth-permissions.md](../../infra/db/auth-permissions.md) | Matrices de relaciones/autorización/privilegios, orden transaccional, retención y procedimiento desechable pendiente de autorización |
| [auth-v2-contract.test.ts](../../backend/api/test/auth-v2-contract.test.ts) | Ocho pruebas de schemas, operaciones, referencias, respuestas, límites y proyección funcional v1→v2 |
| [auth-schema.test.ts](../../backend/api/test/auth-schema.test.ts) | Siete pruebas de inspección estática de DDL, claves reales, cascadas, verificadores, destinatarios y coherencia con OpenAPI |
| Este checkpoint | Evidencia, alcance conservado y pendientes |

Sin archivos existentes modificados. No se modifica el diseño aprobado para aparentar un estado implementado, ni package.json/locks. Las pruebas reutilizan únicamente Ajv/ajv-formats ya declarados/instalados en el paquete MCP como herramientas de validación; no importan su servidor o SDK y no cambian ese componente. Se intentó preparar dependencias de pruebas en modo offline, pero no había metadata en caché y no se instaló/añadió ninguna; se utilizó la dependencia existente y se documentó el prerrequisito.

## 2. Decisiones concretas fijadas

- REST v2 aislada en `/api/v2`; seis operaciones: login, refresh, me, logout, solicitud y confirmación de recuperación. Nueve operaciones funcionales protegidas. Sin signup, administración pública, federación o selección libre de perfil.
- UID canónico `BCH-DEMO-[0-9]{4}` y contraseña propia BanuChat; correo sintético único bajo `banuchat.test`, obtenido de la cuenta en servidor. No usar ejemplos privados o destinatarios reales. Password nueva 15–128 puntos de código, Argon2id; política y almacenamiento definidos sin código de login.
- Tokens independientes de 32 bytes CSPRNG, base64url canónico de 43 caracteres; SHA-256 de bytes decodificados en DB. Access 900 s, inactividad 86400 s, límite absoluto 604800 s; refresh rotatorio con replay que revoca familia. Reset/establecimiento 1200 s y tres pendientes como máximo.
- Recuperación mediante **entrada manual del token**, buzón local y puerto MailDelivery reutilizable; respuesta 202 genérica, cuotas persistentes y despacho local acotado, sin proveedor externo, deep links o retry automático. Cambio exitoso invalida sesiones/tokens y no inicia sesión automáticamente.
- Principal derivado exclusivamente de sesión vigente y ámbito del despliegue; relación de propietario distinta del perfil. Varias cuentas pueden consultar el mismo perfil ficticio y conservar historiales independientes. Conversaciones sin owner no se adoptan ni reasignan.
- Payloads funcionales reutilizados con campos existentes; URLs de artefacto y Location cambian expresamente a v2 para evitar rutas v1 de bypass. DELETE v2: 204 solo al borrar chat propio y 404 indistinguible ajeno/ausente, incluido segundo borrado. v1 conserva su semántica idempotente original sin cambios.
- Conservar sentencia atómica del turno, gates de release/ordinal y validación de citas; agregar después, mediante unidad de trabajo sobre una conexión, revalidación de sesión/owner/corpus antes de persistir. No mantener locks durante generación/Argon2/correo. La matriz define qué carrera gana y qué debe revertir.
- DDL solo auth, sin copiar progreso o expedientes; binding versionado referencia las PK/UNIQUE reales. Se omite UUID redundante de binding y tabla de familias; credencial, reset, cuotas y auditoría mantienen responsabilidades separadas. No se usan CHECK con subconsultas ni índices parciales dependientes de now().
- Migración exige target explícito coincidente, current sintética ready, releases sintéticas y FK real validada hacia perfiles. Rechaza CCD, base no indicada, schema auth previo o drift incompatible. El setting protege contra errores de destino; no sustituye autorización ni permisos efectivos.

## 3. Pruebas realmente ejecutadas

Desde `backend/api`:

```text
node --import tsx --test test/auth-v2-contract.test.ts test/auth-schema.test.ts test/openapi-contract.test.ts
Resultado final: 16 pruebas, 16 aprobadas, 0 fallos, 0 omitidas/canceladas.

npm run typecheck
Resultado: aprobado, sin errores TypeScript.
```

Quince pruebas nuevas y una del OpenAPI v1 congelado. La primera ejecución detectó una referencia heredada a profile_key en parámetros de progreso; se retiró de v2 y se comprobó nuevamente el inventario de referencias. También se corrigió una comprobación estática demasiado amplia que confundía IF NOT EXISTS de una guardia con CREATE IF NOT EXISTS. El resultado final arriba corresponde a los archivos corregidos.

Cobertura estructural: schemas compilados con Ajv 2020-12, entradas/salidas válidas e inválidas, tipos/campos extra, UID/token canónicos, Unicode y longitudes, errores de código/mensaje fijo, caché/cabeceras, operaciones públicas/protegidas, ausencia de rutas selectoras y referencias externas a v1, formas funcionales reutilizadas y URLs v2. La inspección de DDL resuelve dieciséis FKs contra columnas/tipos y claves PK/UNIQUE declaradas en el SQL inicial y nuevo; valida acciones de borrado, checks/índices y políticas coherentes.

**Límite:** la inspección DDL usa un lector acotado de declaraciones, no un parser/servidor PostgreSQL. No acredita compilación, constraints ejercidas, permisos efectivos, carreras, hash real o transacciones. Los schemas no validan por sí mismos propiedad, igualdad entre UUID de cita y enlace, procedencia, entrega o CSPRNG. No se declara login funcional, recuperación operativa, seguridad multiusuario, TLS o compatibilidad nativa Mobile acreditados.

No se ejecutaron pruebas PostgreSQL/Docker/Ollama/correo, ingestas, peticiones institucionales, E2E o infraestructura universitaria. No se repitieron suites RAG/REST runtime sin cambios de implementación que las afecten. Se revisan enlaces locales, formato, `git diff --check` y alcance de archivos al cerrar.

## 4. Integridad y separación

Los cambios del repositorio se limitan a los siete archivos nuevos listados. Estado final sin cambios en archivos versionados preexistentes: REST v1, MCP, SQL 001–005, backend runtime, Mobile, dataset v1, CCD, releases, manifiestos, recetas y embeddings permanecen sin edición. Ninguna conexión a datos existentes ni comandos de migración/provisión/limpieza se ejecutaron. No se calcula una nueva huella runtime de las bases ni se presenta la inspección de archivos como auditoría de integridad PostgreSQL.

No hay backfill, borrado de conversaciones, cuentas reales, copia de UID/correo privado, configuración SMTP, secreto nuevo o modificación de PUBLIC del clúster. El bloqueo de M01.2 conserva su estado; M02/A01 no se modifican ni comienzan. T11/U03/U04 conservan comportamiento y límites. Sin commit ni push.

## 5. Gates externos y siguiente decisión

No se encontró incompatibilidad de claves que obligue a modificar contratos/migraciones congelados para preparar estos candidatos. La definición final queda completa para revisión; su ejecución requiere:

1. Autorización específica de AUTH-P1 y del destino/entorno donde implementar/probar. Si se pide prueba PostgreSQL, aprobar instancia desechable aislada y preparación fiel del corpus ya publicado, sin conectar/copiar datos privados, reingestar o usar historiales actuales.
2. Identidad técnica con privilegios efectivos compatibles y solución aprobada del entorno; **no** provisionar roles o alterar PUBLIC del clúster actual por esta entrega. No reutilizar el superusuario como runtime.
3. Confirmar operación/custodia del buzón local, transporte seguro y dispositivos antes de recuperación funcional/Mobile/piloto. IdP universitario y proveedor de correo externo no son dependencias del login sintético autorizado; permanecen fuera del alcance actual.
4. Implementar y acreditar atómicamente revocación, ownership, refresh/reset y aislamiento antes de abrir recursos. Tests estructurales no sustituyen esa evidencia; no activar login parcial con recursos v1 accesibles como atajo.

**Detención para revisión de Sala de Control. No aplicar SQL, activar endpoints ni iniciar AUTH-P1 automáticamente.**
