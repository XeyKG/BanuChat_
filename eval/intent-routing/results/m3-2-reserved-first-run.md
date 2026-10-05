# M3.2-D — Primera evaluación reservada por cohortes

## Identificación e integridad

- HEAD durante la ejecución: `478a37ec6234c2e278d1fa7746c85393ef2df0eb`
- Commit donde se congeló el router: `e55ba47299822940b36332ec6d93cbd2bb553267`
- Versión del catálogo: `1.2.0-draft`
- SHA-256 del fixture: `6e84d3bf8c9c1fc9479ab61eb2c2d9a424b7103e2b22153b5737421e59fa4102`
- SHA-256 del catálogo: `af881e8399f7d43af291aa0ad16e34d89a159999d730ed021a821a23d414e95f`

## Métrica independiente primaria

`reserved_primary` es la única cohorte independiente primaria.

- Route correct: 14/14
- Exact correct: 14/14
- Unexpected fast path: 0
- False fast-path rate: 0/14 (0.00 %)

## Resultados separados por cohorte

| Cohorte | Total | Route correct | Exact correct | Unexpected fast path | Unexpected fallback | Wrong non-fallback route |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| reserved_primary | 14 | 14 | 14 | 0 | 0 | 0 |
| development_overlap | 5 | 5 | 5 | 0 | 0 | 0 |
| contextual_fragment | 1 | 1 | 1 | 0 | 0 | 0 |
| meta_message | 4 | 4 | 4 | 0 | 0 | 0 |

## Mismatches

0 mismatches.

El JSON asociado registra para cada mismatch su ID, input, expected, actual y differing_fields.

## Interpretación

- `reserved_primary` es la métrica independiente primaria.
- `development_overlap` no es evidencia independiente.
- `contextual_fragment` y `meta_message` son cohortes exploratorias.
- Todos los casos primarios son negativos y esperan fallback.
- Incluso un resultado 14/14 no demuestra accuracy poblacional.
- Incluso un resultado 14/14 no demuestra recall ni generalización positiva.
- Un resultado sin errores puede evidenciar ausencia de fast paths indebidos únicamente en esta muestra concreta.
