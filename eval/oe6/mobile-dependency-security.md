# OE6 — avisos de dependencias Mobile

Fecha: 2026-10-25. Comando: `npm audit --json` en `mobile`. Resultado observado:
8 paquetes afectados, 5 altos, 3 moderados y 0 críticos. No se ejecutó
`npm audit fix` ni se cambió Expo SDK 57.

| Dependencia observada | Severidad npm | Alcance real en BanuChat | Explotación prevista | Corrección compatible | Mitigación temporal | Riesgo residual |
| --- | --- | --- | --- | --- | --- | --- |
| `expo@57.0.31` | alta | Dependencia directa; el aviso se hereda de `@expo/cli` y no identifica código propio de la app | Baja en runtime instalado; mayor en la máquina de build | Esperar parche compatible con SDK 57 y repetir Doctor/bundles/dispositivo | Build desde lockfile, repositorio confiable y runner restringido | Medio hasta que Expo publique/resuelva la cadena |
| `@expo/cli@57.0.32` | alta | Herramienta local de desarrollo/build; agrega `node-forge` y `zod` | Requiere entrada/configuración o artefacto hostil durante build/CLI | Actualización compatible dentro de SDK 57 cuando esté disponible | No ejecutar proyectos/configs no confiables; limitar memoria/CI | Medio en build; bajo en app distribuida |
| `@expo/code-signing-certificates@0.0.6` | alta | Soporte de certificados dentro de CLI; BanuChat no tiene todavía pipeline EAS/update firmado | Baja hoy; relevante al habilitar firma/update remoto | Versión transitiva corregida aprobada por Expo SDK 57 | No importar certificados/updates no confiables; claves fuera de Git | Bajo hoy, medio antes de distribución |
| `node-forge@1.4.0` | alta | Validación RSA usada por la cadena de certificados de Expo; GHSA-86w9-cpqp-85rv | No hay endpoint BanuChat que lo exponga; posible en build/firma con entrada hostil | Parche transitivo de Expo; no forzar override sin validar firma y bundles | Mantener build aislado y no consumir paquetes/firmas arbitrarias | Medio para futura distribución firmada |
| `zod@3.25.76` en Expo CLI | alta | Validación de configuración CLI; el aviso GHSA-mrhx-c7xc-m3w5 es agotamiento de memoria | Requiere colecciones sobredimensionadas entregadas al CLI; no pasa por REST/Mobile runtime | Parche de la cadena Expo compatible con SDK 57 | Tamaño controlado de config/assets y límites del runner | Bajo en operación; medio en build no confiable |
| `expo-router@57.0.29` | moderada | Dependencia directa; arrastra `query-string` | Un deep link/URL especialmente construido podría causar consumo excesivo; no hay enlace institucional público validado | El audit propone 58.0.26, incompatible con la restricción SDK 57 sin migración | Restringir esquemas/orígenes y no procesar URLs externas arbitrarias | Medio por superficie de deep link futura |
| `query-string@7.1.3` | moderada | Parser transitivo de `expo-router` | Igual a la ruta anterior; no es usado por el backend | Actualización transitiva compatible de Router/Expo | Validación de rutas y longitud antes de navegación externa | Medio-bajo en el alcance local actual |
| `decode-uri-component@0.2.2` | moderada | Causa raíz del DoS GHSA-vcc3-ghjq-m6fr bajo `query-string` | Cadena percent-encoded hostil; principalmente disponibilidad de cliente | Versión transitiva corregida aprobada para SDK 57 | Rechazar URLs/deep links no confiables y limitar longitud | Medio-bajo; revisar antes de distribución pública |

`npm audit` sugirió cambios mayores (`expo@44.0.6` o `expo-router@58.0.26`) que no
constituyen una corrección segura para este proyecto: uno degrada varias generaciones
y el otro cruza la línea de SDK. La decisión actual es **no forzar** y volver a evaluar
con cada parche de SDK 57. Antes de un release público se exige cero hallazgos críticos,
revisión de los altos aplicables al build/firma y una decisión explícita sobre los
moderados de deep links.
