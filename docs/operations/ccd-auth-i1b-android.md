# BanuChat — operación local CCD autenticada en Android

Actualizado en O4, 2026-10-24. La ruta del archivo se conserva para no romper la
evidencia histórica I1B. **Android continúa pendiente de validación personal por el
operador.** Este documento no acredita una ejecución en dispositivo. Usar una
terminal privada del mismo usuario Windows que preparó el entorno. No grabar
contraseñas ni copiarlas al informe.

## Laboratorio y cuentas

La base física sigue siendo `banuchat_ccd_auth_i1b_test`. El entorno principal es
`banuchat-dev-postgres-ccd-auth-1`, PostgreSQL `127.0.0.1:55453`, volumen
`banuchat-dev-ccd-auth-data` y red `banuchat-dev-ccd-auth`. La configuración privada
de API es `infra/local/banuchat-dev/ccd-auth-api.json`. I1B continúa intacto en
55443 y no debe iniciarse como API habitual. No ejecutar migraciones, ingestas,
embeddings o publicaciones.

Dos cuentas ficticias ya aprovisionadas: `U08000001` (Alba Ficticia CCD) y `U08000002` (Bruno Ficticio CCD). Cada una tiene contraseña aleatoria independiente de 40 caracteres, verificador Argon2id y vínculo al contexto técnico `ccd-local-demo`. Ninguna representa identidad UNAB ni correo verificado. Recuperación por correo suspendida, sin registro público.

Las contraseñas se custodian cifradas mediante DPAPI CurrentUser en `infra/local/auth-i1b/operator-accounts.dpapi`, con ACL del operador; no están en este documento. Para consultarlas **personalmente** en una terminal privada, desde `backend/api`:

```powershell
node --import tsx test/auth-i1b-operator.mts accounts
```

Este comando muestra secretos deliberadamente al operador. No incluir su salida en evidencias. DPAPI depende del usuario/equipo; no compartir ese archivo como mecanismo de distribución. Si se pierde el acceso, usar el administrador local aprobado con modo `ccd_local`, destino y deployment exactos para establecer una nueva contraseña individual; no crear contraseña pública ni activar correo.

## Arranque con USB y loopback

Desde la raíz del repositorio, comprobar Docker/Ollama y que 3003/8084 estén libres.
Preservar procesos existentes; no terminarlos para liberar puertos. Si el contenedor
canónico está detenido, ejecutar únicamente
`docker start banuchat-dev-postgres-ccd-auth-1`; no recrearlo ni eliminar su volumen.

Terminal API, desde `backend/api`:

```powershell
npm run start:ccd-auth
```

Carga la configuración privada sin imprimirla y valida contenedor, proyecto,
servicio, puerto 55453, volumen, red y salud antes de iniciar el entrypoint v2.
La API escucha solo en `127.0.0.1:3003`, sin rutas v1 ni recuperación funcional.
Si Ollama/modelo no coincide, detener y registrar el fallo; no ajustar parámetros.

Terminal USB, con **un dispositivo propio autorizado** y Expo Go compatible con SDK 57:

```powershell
adb devices -l
adb reverse tcp:3003 tcp:3003
adb reverse tcp:8084 tcp:8084
```

Si hay varios dispositivos, añadir `-s <serial>` a cada comando; no registrar el serial en el informe público. La autorización USB y los comandos ADB los realiza el operador.

Terminal Mobile, desde la raíz:

```powershell
.\mobile\scripts\start-ccd-auth.ps1
```

Configuración pública aplicada solo al proceso: `EXPO_PUBLIC_DEMO_MODE=ccd_authenticated`, `EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:3003/api/v2`, `EXPO_PUBLIC_AUTH_LOCAL_CHANNEL=adb_reverse`. No modifica `.env.local`, no contiene secretos ni cambia dependencias o proyectos nativos. Abrir personalmente Expo Go mediante `exp://127.0.0.1:8084`. No usar `--lan`, `--tunnel`, `0.0.0.0` o relay web para contraseñas. Web no sustituye SecureStore nativo.

## Guion personal y resultados esperados

Verificar onboarding conservado, aviso visible de cuenta ficticia/documentación seleccionada local/sin aval ni actualidad ratificada; login por UID, sin selector de estudiante; Home sin progreso, calendario o anuncios individuales. Contraseña incorrecta debe rechazar acceso sin revelar existencia de cuenta.

Iniciar con A. Abrir una conversación nueva para cada grupo, salvo los seguimientos expresos:

| Grupo | Pregunta/acción | Comprobación esperada |
| --- | --- | --- |
| REG | «¿Cuáles son los cursos de Competencias Digitales?» → «Háblame del de IA Generativa» → «¿Y qué temas tiene?» → «Corrijo: me refiero a Marca Personal, ¿qué temas aborda?» → «Cambiando de tema, ¿cuánto duran las pruebas diagnósticas de 202660?» → «Ahora quiero el contacto del CCD» | Catálogo documentado; tema IA y corrección a Marca Personal sin arrastre; orientación histórica acotada y contacto M12 con vigencia actual no ratificada. Revisar cita real y advertencias, sin afirmar oferta actual. |
| AMB | En otro chat: «¿Cuáles son los cursos de Competencias Digitales?» → «¿Y qué temas tiene?»; en otro chat vacío: «¿Y qué temas tiene?» | Aclaración sobre cuál curso/contexto, sin atribuir temas arbitrarios ni citas. |
| T02 | «No aprobé la prueba nueva» → «La de un pilar de 202660» → «¿Puedo repetir gratis?» | Orientación parcial U03 con cita y límites; no matrícula automática, derecho individual o gratuidad universal. |
| T07 | «No asistí a la prueba» → «Me admitieron después de la primera fecha» → «¿Es otro intento gratis?» | Insuficiencia pertinente, sin inventar procedimiento o equiparar inasistencia a reprobación; sin citas ajenas U03/U04. |
| T11 | «Contacté al CCD, solicité y presenté las nuevas pruebas por primera vez sin costo. Otro estudiante en situación semejante también realizó la solicitud.» → «¿Puedo decirles a todos que tienen ese derecho?» → «¿Y si luego la repruebo?» | Registrar orientación observada; sigue pendiente académicamente. Abstención genérica no acredita explicación satisfactoria de los casos. No convertir HTTP/citas en PASS semántico. |
| Fuente | Abrir una cita, volver al chat y reabrir desde Historial | Documento de la revisión citada, protegido por sesión; misma respuesta/citas y orden, sin sustituir por current. |
| Propiedad | Logout A → login B → Historial → crear otro chat → logout B → login A | Historial de cada principal; B no ve los chats de A ni A los de B. El contexto técnico compartido no comparte conversaciones. |
| Sesión | Cerrar/reabrir app con refresh vigente, después logout | Restauración mediante refresh y `me`; al salir, acceso local bloqueado y SecureStore limpio. No afirmar revocación remota si hubo fallo de red. |

La tabla reproduce los 18 turnos focales; no acredita su ejecución Android. El guion completo de 43 turnos y sus respuestas permanece privado en `data/ccd/evidence/increment-5/http-1792693227245.json` y `data/ccd/evidence/auth-i1b/`. El historial de pruebas automáticas de A ya puede contener conversaciones; tomar nota del chat nuevo creado personalmente.

Ante timeout o resultado incierto, **no reenviar automáticamente el POST**. Consultar el historial para reconciliar y registrar lo observado. Un 409 exige acción explícita para abrir otro chat; no copiar mensajes automáticamente. No alterar releases para provocar ese estado. La revocación durante generación ya tiene evidencia automática aislada; no requiere SQL administrativo durante el guion personal.

## Registro del operador y cierre

Guardar un informe privado sin contraseñas, tokens, seriales o datos personales reales:

| Fecha / dispositivo (modelo, sin serial) | Cuenta ficticia | Grupo/turno | Respuesta observada | Cita/localizador y documento abierto | Defecto / esperado | Estado |
| --- | --- | --- | --- | --- | --- | --- |
| Pendiente | A/B | | | | | NO EJECUTADO |

Separar defecto técnico (login, transporte, persistencia, fuente) de calidad A/B/C y de regla institucional pendiente. Adjuntar capturas solo después de ocultar secretos/identificadores. No declarar Android aprobado antes de realizar este guion personalmente.

Al finalizar: logout, detener Metro/API con Ctrl+C y retirar exclusivamente las dos reglas de este ensayo:

```powershell
adb reverse --remove tcp:3003
adb reverse --remove tcp:8084
```

No usar `--remove-all`. Si se decide detener Docker, `docker stop banuchat-ccd-auth-i1b-test` conserva el volumen; no borrar recursos ni detener contenedores históricos. Enviar el registro a Sala para revisión. I1C, TLS/distribución, custodia multioperador y reglas institucionales no están autorizados por este ensayo.
