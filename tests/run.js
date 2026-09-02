/**
 * Tests funcionales de humo para index.html.
 *
 * Uso: desde la raíz del repo, con jsdom instalado (npm install jsdom --no-save),
 *   node tests/run.js
 *
 * Qué hace: carga index.html en un DOM simulado (jsdom), inyecta un snapshot de
 * funciones/variables internas justo antes del cierre de la IIFE principal, siembra
 * datos de prueba en localStorage, y corre una batería de aserciones sobre el
 * comportamiento observable (no implementación interna).
 *
 * Por qué existe: cada cambio grande (refactors, nuevos sort modes, fixes de
 * búsqueda) se validaba antes con scripts ad-hoc armados y tirados en cada sesión.
 * Este archivo evita reinventar esa validación cada vez. Si se agregan funciones
 * nuevas al índice, sumar sus casos acá en vez de crear un script aparte.
 *
 * Qué NO hace: no valida CSS/estilos visuales (para eso, comparar capturas de
 * Playwright manualmente, ver tests/visual_check.py). No sustituye probar la app
 * de verdad en el celular antes de dar por cerrado un cambio grande.
 */

const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, '..', 'index.html');
const originalHtml = fs.readFileSync(indexPath, 'utf8');

// Inyecta un snapshot de funciones/variables internas justo antes del cierre de la IIFE
// principal, para poder testearlas desde afuera sin exponer nada en el archivo real.
const EXPOSED = [
  'ui', 'movies', 'matchesSearch', 'currentList', 'findDuplicate',
  'renderAll', 'fetchTmdbMovieData', 'fetchImdbRating', 'pickPosterSource',
  'loadWithDefaults'
];
const injection = `
  window.__test = { ${EXPOSED.join(', ')} };
})();
`;
const testHtml = originalHtml.replace('})();\n</script>', injection + '</script>');

function loadApp(seedMovies, seedUi){
  const dom = new JSDOM(testHtml, {
    runScripts: 'outside-only',
    resources: 'usable',
    pretendToBeVisual: true,
    url: 'https://lcortez1612.github.io/films-app/'
  });
  const window = dom.window;
  if(seedMovies) window.localStorage.setItem('cineteca_movies_v1', JSON.stringify(seedMovies));
  if(seedUi) window.localStorage.setItem('cineteca_ui_v1', JSON.stringify(seedUi));
  const scripts = [...window.document.querySelectorAll('script')];
  scripts.forEach(s=>{ if(s.textContent.trim()) window.eval(s.textContent); });
  return window;
}

let pass = 0, fail = 0;
const failures = [];
function check(name, cond){
  if(cond){ pass++; }
  else { fail++; failures.push(name); }
}

// ---------- Grupo: matchesSearch ----------
{
  const window = loadApp([
    {id:'m_1', titleEs:'Forrest Gump', titleEn:'', director:'Robert Zemeckis', actors:['Tom Hanks','Robin Wright'], genres:['Drama'], year:1994, duration:142, imdb:8.8, connections:[], rating10:9, watched:true, favorite:true, poster:null, posterPosition:'top', addedAt:1000, newSeen:false},
    {id:'m_2', titleEs:'Cast Away', titleEn:'', director:'Robert Zemeckis', actors:['Tom Hanks'], genres:['Drama','Aventura'], year:2000, duration:143, imdb:7.8, connections:[], rating10:7, watched:false, favorite:false, poster:null, posterPosition:'top', addedAt:2000, newSeen:false},
    {id:'m_3', titleEs:'Pulp Fiction', titleEn:'', director:'Quentin Tarantino', actors:['John Travolta','Samuel L. Jackson'], genres:['Crimen'], year:1994, duration:154, imdb:8.9, connections:[], rating10:10, watched:true, favorite:false, poster:null, posterPosition:'top', addedAt:3000, newSeen:false}
  ]);
  const t = window.__test;
  check('matchesSearch: actor exacto', t.matchesSearch(t.movies[0], 'tom hanks'));
  check('matchesSearch: apellido suelto', t.matchesSearch(t.movies[1], 'hanks'));
  check('matchesSearch: no matchea actor ajeno', !t.matchesSearch(t.movies[2], 'tom hanks'));
  check('matchesSearch: por titulo', t.matchesSearch(t.movies[0], 'forrest'));
  check('matchesSearch: por director', t.matchesSearch(t.movies[0], 'zemeckis'));
  check('matchesSearch: por genero', t.matchesSearch(t.movies[2], 'crimen'));
  check('matchesSearch: query vacio matchea todo', t.matchesSearch(t.movies[0], ''));
  check('findDuplicate: detecta titulo exacto', !!t.findDuplicate({titleEs:'Forrest Gump', titleEn:'', director:'', actors:[], year:null}));
  check('findDuplicate: no detecta pelicula nueva', !t.findDuplicate({titleEs:'Inexistente 123', titleEn:'', director:'', actors:[], year:null}));
}

// ---------- Grupo: modo de orden "Actor" con búsqueda activa ----------
// Regresión: buscar un actor puntual no debe traer a sus compañeros de reparto
// como grupos separados (ver commit "Fix modo orden Actor").
{
  const window = loadApp([
    {id:'m_1', titleEs:'Scent of a Woman', titleEn:'', director:'D1', actors:['Al Pacino','Chris ODonnell'], genres:['Drama'], year:1992, duration:156, imdb:null, connections:[], rating10:9, watched:true, favorite:false, poster:null, posterPosition:'top', addedAt:1000, newSeen:false, shelfId:null},
    {id:'m_2', titleEs:'Heat', titleEn:'', director:'D2', actors:['Al Pacino','Diane Venora','Jon Voight'], genres:['Crimen'], year:1995, duration:170, imdb:null, connections:[], rating10:8, watched:true, favorite:false, poster:null, posterPosition:'top', addedAt:2000, newSeen:false, shelfId:null},
    {id:'m_3', titleEs:'Forrest Gump', titleEn:'', director:'D3', actors:['Tom Hanks','Robin Wright'], genres:['Drama'], year:1994, duration:142, imdb:null, connections:[], rating10:9, watched:true, favorite:false, poster:null, posterPosition:'top', addedAt:3000, newSeen:false, shelfId:null}
  ], { activeTab:'actor', sortDirection:'asc' });
  const t = window.__test;

  window.document.getElementById('searchInput').value = 'al pa';
  t.renderAll();
  let groupTitles = [...window.document.querySelectorAll('.group-title')].map(e=>e.textContent.trim());
  check('orden Actor + busqueda "al pa": solo grupo Al Pacino', groupTitles.length === 1 && groupTitles[0].includes('Al Pacino'));
  check('orden Actor + busqueda "al pa": sin grupo Diane Venora', !groupTitles.some(g=>g.includes('Diane Venora')));
  check('orden Actor + busqueda "al pa": sin grupo Jon Voight', !groupTitles.some(g=>g.includes('Jon Voight')));

  window.document.getElementById('searchInput').value = 'forrest';
  t.renderAll();
  groupTitles = [...window.document.querySelectorAll('.group-title')].map(e=>e.textContent.trim());
  check('orden Actor + busqueda por titulo: agrupa bajo todos los actores', groupTitles.some(g=>g.includes('Tom Hanks')) && groupTitles.some(g=>g.includes('Robin Wright')));

  window.document.getElementById('searchInput').value = '';
  t.renderAll();
  groupTitles = [...window.document.querySelectorAll('.group-title')].map(e=>e.textContent.trim());
  check('orden Actor sin busqueda: aparecen todos los grupos (6)', groupTitles.length === 6);
}

// ---------- Grupo: sort direction (asc/desc) ----------
{
  const window = loadApp([
    {id:'m_1', titleEs:'Zebra Film', titleEn:'', director:'D1', actors:[], genres:['Drama'], year:2020, duration:100, imdb:null, connections:[], rating10:5, watched:true, favorite:false, poster:null, posterPosition:'top', addedAt:3000, newSeen:false, shelfId:null},
    {id:'m_2', titleEs:'Alpha Film', titleEn:'', director:'D2', actors:[], genres:['Drama'], year:2021, duration:120, imdb:null, connections:[], rating10:8, watched:false, favorite:false, poster:null, posterPosition:'top', addedAt:1000, newSeen:false, shelfId:null}
  ], { activeTab:'alfabetico', sortDirection:'asc' });
  const t = window.__test;

  t.renderAll();
  let titles = [...window.document.querySelectorAll('.card-title')].map(e=>e.textContent);
  check('sort alfabetico ascendente', JSON.stringify(titles) === JSON.stringify(['Alpha Film','Zebra Film']));

  t.ui.sortDirection = 'desc';
  t.renderAll();
  titles = [...window.document.querySelectorAll('.card-title')].map(e=>e.textContent);
  check('sort alfabetico descendente', JSON.stringify(titles) === JSON.stringify(['Zebra Film','Alpha Film']));
}

// ---------- Grupo: modo estantería libre ----------
{
  const window = loadApp([
    {id:'m_1', titleEs:'Peli A', titleEn:'', director:'', actors:[], genres:[], year:2020, duration:100, imdb:null, connections:[], rating10:5, watched:true, favorite:false, poster:null, posterPosition:'top', addedAt:Date.now(), newSeen:true}
  ], { activeTab:'libre', freeOrder:['m_1'], tabOrder:['alfabetico','actor','genero','duracion','vista','puntaje','fechaentrada','libre'] }); // sin "shelves" a propósito
  const t = window.__test;
  t.renderAll();
  check('modo estanteria: renderiza al menos 1 bloque aun con ui viejo sin "shelves"', window.document.querySelectorAll('.shelf-block').length >= 1);
  check('modo estanteria: boton de nueva estanteria presente', !!window.document.querySelector('.add-shelf-btn'));
}

// ---------- Grupo: loadWithDefaults (merge de ui persistido con campos nuevos) ----------
{
  const window = loadApp(
    [{id:'m_1', titleEs:'Peli A', titleEn:'', director:'', actors:[], genres:[], year:2020, duration:100, imdb:null, connections:[], rating10:5, watched:true, favorite:false, poster:null, posterPosition:'top', addedAt:Date.now(), newSeen:true}],
    { theme:'nordico', palette:'vino', lang:'es', activeTab:'libre', freeOrder:['m_1'] } // ui viejo, deliberadamente incompleto
  );
  const t = window.__test;
  check('loadWithDefaults: completa "shelves" faltante con default []', Array.isArray(t.ui.shelves));
  check('loadWithDefaults: completa "sortDirection" faltante', typeof t.ui.sortDirection === 'string');
  check('loadWithDefaults: conserva valores ya guardados (activeTab)', t.ui.activeTab === 'libre');
}

// ---------- Resultado ----------
console.log(`\n${pass} pasaron, ${fail} fallaron de ${pass+fail} tests`);
if(failures.length){
  console.log('\nFallos:');
  failures.forEach(f=> console.log('  -', f));
}
process.exit(fail > 0 ? 1 : 0);
