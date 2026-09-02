# Estado del proyecto — Films

Este archivo es un respaldo versionado del estado del proyecto. La IA que trabaja acá
mantiene memoria propia entre sesiones, pero esa memoria es un resumen y puede perder
detalle o desactualizarse. Este archivo vive en el repo, así que es la fuente de verdad
más confiable si hay dudas. Se actualiza en cada sesión de trabajo importante.

## Qué es la app

PWA de seguimiento de películas, un solo `index.html` (~2260 líneas), sin backend,
todo en `localStorage`. APIs externas: TMDB (metadata, posters) y OMDb (puntaje IMDb).
Repo: `lcortez1612/films-app`. Sitio: `https://lcortez1612.github.io/films-app/`.

## Decisiones de diseño que no hay que revisitar

- Freight Text descartada (licencia paga) → tema Normal usa Crimson Pro.
- Comic Runes (tema Nórdico) subida como archivo al repo, no buscar alternativas.
- Fuentes de Google siempre por `<link>` en `<head>`, nunca `@import` en `<style>`.
- Exportar/respaldo de catálogo y storage persistente del navegador: implementados una
  vez, revertidos a pedido de Cortez (fue falsa alarma de pérdida de datos, no bug real).
  No reimplementar salvo pedido explícito nuevo.
- Dashboard de estadísticas: propuesto, Cortez no lo confirmó. No asumir que lo quiere.
- Claves de API (TMDB/OMDb) NUNCA hardcodeadas en el código: quedan en `localStorage`
  del dispositivo del usuario, cargadas una vez desde el modal de Importar. Se evaluó
  explícitamente ponerlas fijas en el código y se descartó por el riesgo de exposición
  pública (el repo es público, cualquiera puede ver el código fuente).
- El PAT de GitHub de Cortez NUNCA se guarda en memoria ni en ningún archivo. Se pide
  en cada sesión que haga falta pushear, se usa, y se saca de la config git local
  (`git remote set-url origin https://github.com/lcortez1612/films-app.git`) después
  del push. Esto es una decisión de seguridad explícita, no una limitación técnica.

## Bugs reales ya encontrados y arreglados (no reintroducir)

- **`load()` sin merge de defaults**: si `ui` persistido en `localStorage` no tiene un
  campo nuevo agregado después de que el usuario ya guardó datos, ese campo queda
  `undefined` y puede romper renders enteros en silencio (pasó con `ui.shelves`).
  Fix: `loadWithDefaults()` hace `Object.assign({}, defaults, loaded)`. Cualquier campo
  nuevo en el objeto default de `ui` DEBE pasar por esta función, nunca por `load()` a secas.
- **Búsqueda de actores concatenados**: en algún punto la búsqueda concatenaba todos los
  actores de una película en un solo string y hacía `includes()` sobre eso, lo cual podía
  dar falsos positivos entre actores distintos. Se corrigió para comparar actor por actor
  individualmente. Ojo: esto es *intencionalmente* un match por substring simple (no por
  palabra completa) — Cortez pidió explícitamente revertir una versión más estricta que
  exigía coincidencia de palabra exacta. No "mejorar" esto sin que lo pida.
- **Modo de orden "Actor" + búsqueda activa**: al buscar un actor puntual (ej. "Al Pacino"),
  el modo agrupado por actor mostraba también a sus compañeros de reparto como grupos
  separados, porque agrupaba por elenco completo sin re-filtrar contra la búsqueda activa.
  Fix: si el texto buscado matchea un actor específico de la película, se agrupa solo bajo
  ese actor; si el match vino de otro campo (título/director/género), se agrupa bajo todos
  los actores como siempre.

## Convenciones de trabajo

- `git pull origin main` antes de cualquier edición, siempre.
- Cortez pasa el PAT de GitHub cuando hace falta pushear; no se guarda entre sesiones.
- Después de cada push: una sola línea confirmando qué se cambió, sin narrar el proceso.
- Trabajar en silencio durante la sesión (sin narrar cada paso intermedio); el resumen
  va recién después del commit + push.
- Validar sintaxis JS (`new Function()` sobre el contenido del `<script>`) y balance de
  tags HTML antes de cada commit.
- Para cambios de comportamiento (no solo estilos), correr `tests/run.js` antes de pushear.
- Feature request numbering resets a 1 cada sesión nueva; ítems completados se dropean.
- Comunicación: español, tono argentino moderado, sin "che" excesivo, sin "¿te gustaría?",
  sin emojis, oraciones cortas, directo al punto.

## Estructura del repo

```
index.html       — toda la app (HTML+CSS+JS en un solo archivo, intencional)
manifest.json     — PWA manifest
sw.js             — service worker
ComicRunes.otf    — fuente del tema Nórdico
icon-*.png        — íconos de la PWA
tests/run.js      — batería de tests de humo (ver tests/README.md)
tests/README.md   — cómo correr los tests y qué cubren
ESTADO.md         — este archivo
```

## Última actualización

2026-09-01 — Se agregó la carpeta `tests/` con runner de jsdom versionado, y este
archivo de estado. Antes de esto, cada sesión armaba scripts de test ad-hoc y los
tiraba al terminar.
