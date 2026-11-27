// Lee cienzdel.unizar.es/eventos con el mismo eventos.js que usa la web y escribe
// eventos.ics (para suscribirse desde Google Calendar, Outlook, etc.) y eventos.json
// (para otras webs, p. ej. el visor de horarios). Lo ejecuta .github/workflows/exportar.yml.
//
//   node herramientas/exportar.mjs [url-o-fichero-html]
import { readFile, writeFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';

const RAIZ = new URL('..', import.meta.url);
const fuente = process.argv[2] || 'https://cienzdel.unizar.es/eventos';
const URL_PAGINA = 'https://cienzdel.unizar.es/eventos';

let html;
if (/^https?:/.test(fuente)) {
  const r = await fetch(fuente, { headers: { 'User-Agent': 'cienzdel-eventos-exportar' } });
  if (!r.ok) throw new Error(`HTTP ${r.status} al leer ${fuente}`);
  html = await r.text();
} else {
  html = await readFile(fuente, 'utf8');
}

const dom = new JSDOM(html, { url: URL_PAGINA, pretendToBeVisual: true, runScripts: 'outside-only' });
const { window } = dom;
if (!window.document.getElementById('eventos-cienzdel')) throw new Error('La página no tiene <div id="eventos-cienzdel">');
const codigo = await readFile(new URL('eventos.js', RAIZ), 'utf8');
window.eval(codigo);
const datos = window.eventosCienzdel;
if (!datos) throw new Error('eventos.js no ha expuesto window.eventosCienzdel');

const publicos = datos.eventos
  .filter((e) => e.estado !== 'borrador' && e.inicio)
  .map(({ avisos, ...e }) => e);
const json = { generado: new Date().toISOString(), pagina: URL_PAGINA, version: datos.version, eventos: publicos };

await writeFile(new URL('eventos.json', RAIZ), JSON.stringify(json, null, 2) + '\n');
await writeFile(new URL('eventos.ics', RAIZ), datos.ics());
console.log(`${publicos.length} eventos exportados`);
const avisos = datos.eventos.filter((e) => e.avisos.length);
for (const e of avisos) console.warn(`Aviso en «${e.titulo}»: ${e.avisos.join(' ')}`);
