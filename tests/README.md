# Tests de humo

Antes de cada cambio grande (refactors, nuevos modos de orden, fixes de búsqueda),
correr esto para confirmar que no se rompió nada que ya funcionaba:

```bash
npm install jsdom --no-save
node tests/run.js
```

`--no-save` evita que quede un `package.json`/`node_modules` en el repo — se instala
en el momento, se usa, y se puede borrar después sin culpa
(`rm -rf node_modules package.json package-lock.json`).

## Qué cubre hoy

- Búsqueda (`matchesSearch`): por actor exacto, apellido suelto, título, director, género.
- Detección de duplicados al importar.
- Regresión del modo de orden "Actor": buscar un actor puntual no debe traer a sus
  compañeros de reparto como grupos separados.
- Dirección de orden ascendente/descendente.
- Modo estantería libre, incluyendo el caso de `ui` guardado sin el campo `shelves`
  (bug real que pasó una vez, ver `ESTADO.md`).
- `loadWithDefaults`: que un `ui` guardado viejo se complete con los campos default
  que falten, sin perder los valores que ya tenía.

## Cuándo sumar un caso nuevo

Cualquier vez que se arregle un bug de comportamiento (no de estilos/CSS), conviene
sumar un caso acá antes de dar el fix por cerrado. Si el bug vuelve a aparecer en el
futuro por un cambio no relacionado, este archivo lo va a agarrar antes de llegar a
producción.

## Qué NO cubre

- Nada visual/CSS. Para eso, comparar capturas de Playwright a mano (no hay un script
  versionado para esto todavía, se arma ad-hoc en cada sesión grande de estilos).
- Flujos que dependen de las APIs reales de TMDB/OMDb (fetch real, no mockeado). Los
  tests de autofill validan la lógica interna (qué campo se llena con qué dato), no
  la llamada de red en sí.
