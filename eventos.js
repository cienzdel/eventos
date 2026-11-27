/*
 * Eventos del Consejo de Estudiantes de Ciencias (cienzdel.unizar.es/eventos).
 *
 * La página de Drupal contiene los eventos escritos como contenido normal:
 *
 *   <div id="eventos-cienzdel"></div>
 *   <p>Texto de introducción (opcional)</p>
 *   <h2>Título del evento</h2>
 *   <ul>
 *     <li>Fecha: 12/12/2026</li>
 *     <li>Hora: 17:00 a 21:00</li>
 *     <li>Lugar: ...</li>
 *     <li>Etiquetas: Torneo, Ocio</li>
 *     <li>Inscripción: <a href="https://forms.gle/...">formulario</a></li>
 *   </ul>
 *   <p><img ...></p>          (opcional: portada)
 *   <p>Resumen para la tarjeta.</p>
 *   <p>Resto del texto, enlaces... (va al «Más información»)</p>
 *   <h2>Siguiente evento</h2> ...
 *   <script src="https://cienzdel.github.io/eventos/eventos.js"></script>
 *
 * Este script lee ese contenido, lo oculta y pinta en su lugar las tarjetas, el calendario
 * y la ventana de «Más información». Si el script no carga, el contenido original sigue
 * siendo legible tal cual. Todo se dibuja dentro de un shadow root para que el CSS del tema
 * de la Universidad no se mezcle con el nuestro.
 */
(function () {
  'use strict';

  var VERSION = '0.1.0';
  var GUIA_PDF = 'https://cienzdel.github.io/eventos/guia/guia_eventos.pdf';
  var FEED = 'cienzdel.github.io/eventos/eventos.ics';

  /* ---------------------------------------------------------------- utilidades */

  function norm(s) {
    return (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
  }
  function slug(s) {
    return norm(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'evento';
  }
  function el(tag, attrs, hijos) {
    var e = document.createElement(tag);
    if (attrs) {
      for (var k in attrs) {
        if (attrs[k] == null || attrs[k] === false) continue;
        if (k === 'class') e.className = attrs[k];
        else if (k === 'text') e.textContent = attrs[k];
        else if (k === 'style') e.setAttribute('style', attrs[k]);
        else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), attrs[k]);
        else e.setAttribute(k, attrs[k] === true ? '' : attrs[k]);
      }
    }
    (hijos || []).forEach(function (h) {
      if (h == null || h === false) return;
      e.appendChild(typeof h === 'string' ? document.createTextNode(h) : h);
    });
    return e;
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function mismoDia(a, b) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }
  function soloDia(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }

  var MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto',
    'septiembre', 'octubre', 'noviembre', 'diciembre'];
  var MESES_CORTOS = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
  var DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

  var ICONOS = {
    calendario: 'M3 6.5h14M6 2.5v3M14 2.5v3M4 4.5h12a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-11a1 1 0 0 1 1-1z',
    reloj: 'M10 17.5a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15zM10 6v4.2l2.8 1.8',
    lugar: 'M10 17.5s5.5-5 5.5-9.5a5.5 5.5 0 0 0-11 0c0 4.5 5.5 9.5 5.5 9.5zM10 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
    plazo: 'M5 2.5h10M5 17.5h10M6 2.5c0 4 8 4 8 7.5s-8 3.5-8 7.5M14 2.5c0 4-8 4-8 7.5s8 3.5 8 7.5',
    info: 'M10 17.5a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15zM10 9v5M10 6.2v.1',
    cerrar: 'M5 5l10 10M15 5L5 15',
    izq: 'M12.5 4.5L7 10l5.5 5.5',
    der: 'M7.5 4.5L13 10l-5.5 5.5',
    enlace: 'M8.5 11.5a3.5 3.5 0 0 0 5 0l2.5-2.5a3.5 3.5 0 0 0-5-5L10 5M11.5 8.5a3.5 3.5 0 0 0-5 0L4 11a3.5 3.5 0 0 0 5 5l1-1',
    descarga: 'M10 3v9.5M6 9l4 4 4-4M4 16.5h12',
    externo: 'M11 3.5h5.5V9M16.5 3.5L9 11M14 12.5v3a1 1 0 0 1-1 1H4.5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h3',
    lista: 'M7 5h10M7 10h10M7 15h10M3 5h.01M3 10h.01M3 15h.01',
    rejilla: 'M3.5 3.5h5v5h-5zM11.5 3.5h5v5h-5zM3.5 11.5h5v5h-5zM11.5 11.5h5v5h-5z',
    lapiz: 'M13.5 3.5l3 3L7 16H4v-3z',
    aviso: 'M10 3l7.5 13h-15zM10 8v3.5M10 13.8v.1'
  };
  function icono(nombre) {
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 20 20');
    svg.setAttribute('class', 'icono');
    svg.setAttribute('aria-hidden', 'true');
    var p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p.setAttribute('d', ICONOS[nombre]);
    svg.appendChild(p);
    return svg;
  }

  /* ------------------------------------------------------------ etiquetas */

  // Colores con contraste ≥ 4.5:1 sobre blanco (texto blanco encima).
  var PALETA = ['#223d71', '#5b3b8c', '#0f5e6e', '#1e6b3f', '#9a4a00', '#a3245e', '#7a2e2e', '#4a5263'];
  var COLORES_FIJOS = {
    destacado: '#c41230',
    torneo: '#5b3b8c', torneos: '#5b3b8c',
    formacion: '#0f5e6e', taller: '#0f5e6e', curso: '#0f5e6e', charla: '#0f5e6e',
    institucional: '#223d71', pleno: '#223d71', consejo: '#223d71',
    ocio: '#9a4a00', fiesta: '#9a4a00',
    deporte: '#1e6b3f', deportes: '#1e6b3f',
    cultura: '#a3245e', cine: '#a3245e',
    voluntariado: '#7a2e2e'
  };
  function colorEtiqueta(t) {
    var n = norm(t);
    if (COLORES_FIJOS[n]) return COLORES_FIJOS[n];
    var h = 0;
    for (var i = 0; i < n.length; i++) h = (h * 31 + n.charCodeAt(i)) >>> 0;
    return PALETA[h % PALETA.length];
  }

  /* ------------------------------------------------------------- fechas */

  var RE_FECHA = new RegExp(
    '(\\d{4})-(\\d{1,2})-(\\d{1,2})' +                                   // 2026-12-12
    '|(\\d{1,2})[/.-](\\d{1,2})[/.-](\\d{2,4})' +                         // 12/12/2026
    '|(\\d{1,2})\\s+de\\s+(' + MESES.join('|') + '|setiembre)(?:\\s+de(?:l)?\\s+(\\d{4}))?', // 12 de diciembre (de 2026)
    'gi');
  var RE_HORA = /(\d{1,2})(?:[:.](\d{2}))\s*h?|(\d{1,2})\s*h(?![a-z])/gi;

  function anioPorDefecto(mes, dia, hoy) {
    // Sin año: el más cercano que no quede más de seis meses atrás.
    var y = hoy.getFullYear();
    var d = new Date(y, mes, dia);
    if ((hoy - d) / 864e5 > 183) y++;
    return y;
  }

  function leerFechas(texto, hoy) {
    var res = [];
    var m;
    RE_FECHA.lastIndex = 0;
    while ((m = RE_FECHA.exec(texto))) {
      var y, mo, d;
      if (m[1]) { y = +m[1]; mo = +m[2] - 1; d = +m[3]; }
      else if (m[4]) { d = +m[4]; mo = +m[5] - 1; y = +m[6]; if (y < 100) y += 2000; }
      else {
        d = +m[7];
        var nombre = norm(m[8]) === 'setiembre' ? 'septiembre' : norm(m[8]);
        mo = MESES.indexOf(nombre);
        y = m[9] ? +m[9] : anioPorDefecto(mo, d, hoy);
      }
      var f = new Date(y, mo, d);
      if (f.getMonth() === mo && f.getDate() === d) res.push({ fecha: f, desde: m.index, hasta: m.index + m[0].length });
    }
    return res;
  }

  function leerHoras(texto) {
    var res = [];
    var m;
    RE_HORA.lastIndex = 0;
    while ((m = RE_HORA.exec(texto))) {
      var h = m[1] != null ? +m[1] : +m[3];
      var mi = m[2] != null ? +m[2] : 0;
      if (h <= 24 && mi < 60) res.push(pad(h) + ':' + pad(mi));
    }
    return res;
  }

  // «Fecha» puede traer un día, un intervalo («del 20 al 22 de enero de 2027») y hasta la hora.
  function interpretarFecha(textoFecha, textoHora, hoy) {
    var fechas = leerFechas(textoFecha, hoy);
    if (!fechas.length) return null;
    // Intervalos tipo «del 20 al 22 de enero»: el primer número suelto antes del mes.
    var inicio = fechas[0].fecha;
    var fin = fechas.length > 1 ? fechas[fechas.length - 1].fecha : null;
    if (fechas.length === 1) {
      var antes = textoFecha.slice(0, fechas[0].desde);
      var mSuelto = /(\d{1,2})\s*(?:al|a|-|–|y)\s*$/.exec(antes);
      if (mSuelto) {
        var dIni = +mSuelto[1];
        var cand = new Date(inicio.getFullYear(), inicio.getMonth(), dIni);
        if (cand < inicio) { fin = inicio; inicio = cand; }
      }
    }
    if (fin && fin <= inicio) fin = null;
    // Quita las fechas del texto antes de buscar horas (12.12.2026 parecería una hora).
    var resto = textoFecha;
    for (var i = fechas.length - 1; i >= 0; i--) resto = resto.slice(0, fechas[i].desde) + ' ' + resto.slice(fechas[i].hasta);
    var horas = leerHoras((textoHora || '') + ' ' + (textoHora ? '' : resto));
    return { inicio: inicio, fin: fin, horaIni: horas[0] || null, horaFin: horas[1] || null };
  }

  function fechaLarga(d) {
    return DIAS[d.getDay()] + ' ' + d.getDate() + ' de ' + MESES[d.getMonth()] + ' de ' + d.getFullYear();
  }
  function fechaCorta(d, conAnio) {
    return d.getDate() + ' ' + MESES[d.getMonth()].slice(0, 3) + (conAnio ? ' ' + d.getFullYear() : '');
  }
  function textoFechas(ev, largo) {
    var f = ev.fecha;
    if (!f) return ev.datos.fecha ? ev.datos.fecha.texto : '';
    var anio = f.inicio.getFullYear() !== new Date().getFullYear() || (f.fin && f.fin.getFullYear() !== f.inicio.getFullYear());
    if (!f.fin) return largo ? fechaLarga(f.inicio) : DIAS[f.inicio.getDay()].slice(0, 3) + ' ' + fechaCorta(f.inicio, anio);
    if (largo) return 'Del ' + fechaLarga(f.inicio) + ' al ' + fechaLarga(f.fin);
    return fechaCorta(f.inicio, false) + ' – ' + fechaCorta(f.fin, anio);
  }
  function textoHoras(ev) {
    if (ev.datos.hora) return ev.datos.hora.texto;
    var f = ev.fecha;
    if (!f || !f.horaIni) return '';
    return f.horaIni + (f.horaFin ? ' a ' + f.horaFin : '') + ' h';
  }

  /* ------------------------------------------------------------- lectura */

  var CLAVES = {
    fecha: 'fecha', fechas: 'fecha', dia: 'fecha', dias: 'fecha', cuando: 'fecha',
    hora: 'hora', horario: 'hora', horas: 'hora',
    lugar: 'lugar', donde: 'lugar', sitio: 'lugar', aula: 'lugar',
    etiquetas: 'etiquetas', etiqueta: 'etiquetas', tags: 'etiquetas', tag: 'etiquetas', categoria: 'etiquetas', categorias: 'etiquetas',
    inscripcion: 'inscripcion', inscribirse: 'inscripcion', inscripciones: 'inscripcion', formulario: 'inscripcion',
    plazo: 'plazo', 'plazo de inscripcion': 'plazo', 'inscripcion hasta': 'plazo', 'fin de inscripcion': 'plazo',
    estado: 'estado'
  };
  var ESTADOS = { borrador: 'borrador', oculto: 'borrador', cancelado: 'cancelado', cancelada: 'cancelado',
    aplazado: 'aplazado', aplazada: 'aplazado', completo: 'completo', 'plazas agotadas': 'completo', agotado: 'completo' };

  function esListaDeDatos(nodo) {
    if (!nodo || (nodo.tagName !== 'UL' && nodo.tagName !== 'OL')) return false;
    var lis = nodo.querySelectorAll(':scope > li');
    if (!lis.length) return false;
    var con = 0;
    lis.forEach(function (li) { if (/^[^:\n]{2,40}:/.test(li.textContent.trim())) con++; });
    return con >= Math.ceil(lis.length / 2);
  }

  function leerDatos(lista) {
    var datos = {};
    var extra = [];
    lista.querySelectorAll(':scope > li').forEach(function (li) {
      var txt = li.textContent.replace(/\s+/g, ' ').trim();
      var i = txt.indexOf(':');
      if (i < 0) return;
      var claveOriginal = txt.slice(0, i).trim();
      var clave = CLAVES[norm(claveOriginal)];
      var valor = txt.slice(i + 1).trim();
      var a = li.querySelector('a[href]');
      var item = { clave: claveOriginal, texto: valor, enlace: a ? a.href : null, nodo: li };
      if (clave) datos[clave] = item;
      else extra.push(item);
    });
    return { datos: datos, extra: extra };
  }

  function leerEventos(nodos, hoy) {
    var intro = [];
    var bloques = [];
    var actual = null;
    nodos.forEach(function (n) {
      if (n.nodeType === 1 && n.tagName === 'H2') {
        actual = { titulo: n, nodos: [] };
        bloques.push(actual);
      } else if (actual) actual.nodos.push(n);
      else intro.push(n);
    });

    var usados = {};
    var eventos = bloques.map(function (b, idx) {
      var titulo = b.titulo.textContent.replace(/\s+/g, ' ').trim();
      var avisos = [];
      var lista = null;
      for (var i = 0; i < b.nodos.length; i++) {
        if (b.nodos[i].nodeType === 1 && esListaDeDatos(b.nodos[i])) { lista = b.nodos[i]; break; }
      }
      var leido = lista ? leerDatos(lista) : { datos: {}, extra: [] };
      var datos = leido.datos;
      if (!lista) avisos.push('No encuentro la lista de datos (Fecha, Hora, Lugar…) bajo el título.');

      var fecha = null;
      if (datos.fecha) {
        fecha = interpretarFecha(datos.fecha.texto, datos.hora ? datos.hora.texto : '', hoy);
        if (!fecha) avisos.push('No entiendo la fecha «' + datos.fecha.texto + '». Escríbela como 12/12/2026 o «12 de diciembre de 2026».');
      } else if (lista) avisos.push('Falta la línea «Fecha: …».');

      var plazo = null;
      if (datos.plazo) {
        var fp = leerFechas(datos.plazo.texto, hoy);
        if (fp.length) plazo = fp[0].fecha;
        else avisos.push('No entiendo el plazo «' + datos.plazo.texto + '».');
      }

      var etiquetas = datos.etiquetas
        ? datos.etiquetas.texto.split(/[,;·]/).map(function (s) { return s.trim(); }).filter(Boolean)
        : [];
      var destacado = etiquetas.some(function (t) { return norm(t) === 'destacado' || norm(t) === 'destacada'; });
      etiquetas = etiquetas.filter(function (t) { return norm(t) !== 'destacado' && norm(t) !== 'destacada'; });

      var estado = datos.estado ? (ESTADOS[norm(datos.estado.texto)] || null) : null;
      if (datos.estado && !estado) avisos.push('Estado «' + datos.estado.texto + '» desconocido (usa borrador, cancelado, aplazado o completo).');

      // Contenido: todo lo del bloque salvo la lista de datos. La primera imagen es la portada.
      var contenido = b.nodos.filter(function (n) { return n !== lista; });
      var portada = null;
      for (var j = 0; j < contenido.length && !portada; j++) {
        var n = contenido[j];
        if (n.nodeType !== 1) continue;
        portada = n.tagName === 'IMG' ? n : n.querySelector('img');
      }
      var resumen = '';
      for (var k = 0; k < contenido.length; k++) {
        var c = contenido[k];
        if (c.nodeType === 1 && c.tagName === 'P' && c.textContent.trim()) { resumen = c.textContent.replace(/\s+/g, ' ').trim(); break; }
      }

      var id = slug(titulo);
      if (usados[id]) id += '-' + (idx + 1);
      usados[id] = true;

      return {
        id: id, titulo: titulo, datos: datos, extra: leido.extra, fecha: fecha, plazo: plazo,
        etiquetas: etiquetas, destacado: destacado, estado: estado,
        portada: portada ? { src: portada.currentSrc || portada.src, alt: portada.alt || '' } : null,
        resumen: resumen, contenido: contenido, avisos: avisos, orden: idx
      };
    });
    return { intro: intro, eventos: eventos };
  }

  function instanteInicio(ev) {
    if (!ev.fecha) return Infinity;
    var d = new Date(ev.fecha.inicio);
    if (ev.fecha.horaIni) { var p = ev.fecha.horaIni.split(':'); d.setHours(+p[0], +p[1]); }
    return d.getTime();
  }
  function esPasado(ev, hoy) {
    if (!ev.fecha) return false;
    var ultimo = ev.fecha.fin || ev.fecha.inicio;
    return soloDia(ultimo) < soloDia(hoy);
  }
  function estadoInscripcion(ev, hoy) {
    // Devuelve { tipo: 'abierta'|'cerrada'|'sin'|'texto', texto, enlace }
    var ins = ev.datos.inscripcion;
    if (ev.estado === 'cancelado') return { tipo: 'cerrada', texto: 'Cancelado' };
    if (esPasado(ev, hoy)) return { tipo: 'cerrada', texto: 'Finalizado' };
    if (ev.estado === 'completo') return { tipo: 'cerrada', texto: 'Plazas agotadas' };
    if (!ins) return { tipo: 'sin' };
    if (!ins.enlace) return { tipo: 'texto', texto: ins.texto || 'Sin inscripción' };
    if (ev.plazo && soloDia(hoy) > ev.plazo) return { tipo: 'cerrada', texto: 'Inscripción cerrada' };
    return { tipo: 'abierta', texto: 'Inscribirse', enlace: ins.enlace };
  }

  /* -------------------------------------------------------- calendario .ics */

  function fechaICS(d, hora) {
    var s = d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate());
    return hora ? s + 'T' + hora.replace(':', '') + '00' : s;
  }
  function escICS(s) { return (s || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1'); }
  // Pliega a 75 octetos (RFC 5545) sin partir caracteres UTF-8.
  function plegar(linea) {
    var out = [], actual = '', bytes = 0;
    Array.from(linea).forEach(function (ch) {
      var c = ch.codePointAt(0);
      var b = c < 0x80 ? 1 : c < 0x800 ? 2 : c < 0x10000 ? 3 : 4;
      if (bytes + b > 74) { out.push(actual); actual = ' '; bytes = 1; }
      actual += ch; bytes += b;
    });
    out.push(actual);
    return out.join('\r\n');
  }
  function rangoCalendario(ev) {
    var f = ev.fecha;
    var fin = f.fin || f.inicio;
    if (f.horaIni) {
      var horaFin = f.horaFin;
      if (!horaFin) { var p = f.horaIni.split(':'); horaFin = pad(Math.min(23, +p[0] + 1)) + ':' + p[1]; }
      return { ini: fechaICS(f.inicio, f.horaIni), fin: fechaICS(fin, horaFin), todoElDia: false };
    }
    var dia = new Date(fin); dia.setDate(dia.getDate() + 1);
    return { ini: fechaICS(f.inicio), fin: fechaICS(dia), todoElDia: true };
  }
  function urlEvento(ev) { return location.origin + location.pathname + '#' + ev.id; }
  function descripcionPlana(ev) {
    return (ev.resumen ? ev.resumen + '\n\n' : '') + 'Más información: ' + urlEvento(ev);
  }
  function generarICS(lista, nombre) {
    var ahora = new Date();
    var stamp = ahora.getUTCFullYear() + pad(ahora.getUTCMonth() + 1) + pad(ahora.getUTCDate()) + 'T' +
      pad(ahora.getUTCHours()) + pad(ahora.getUTCMinutes()) + pad(ahora.getUTCSeconds()) + 'Z';
    var l = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Consejo de Estudiantes de Ciencias UZ//Eventos//ES', 'CALSCALE:GREGORIAN'];
    if (nombre) l.push('X-WR-CALNAME:' + escICS(nombre), 'X-WR-TIMEZONE:Europe/Madrid', 'REFRESH-INTERVAL;VALUE=DURATION:PT12H', 'X-PUBLISHED-TTL:PT12H');
    if (lista.some(function (ev) { return ev.fecha.horaIni; })) {
      l.push('BEGIN:VTIMEZONE', 'TZID:Europe/Madrid',
        'BEGIN:DAYLIGHT', 'TZOFFSETFROM:+0100', 'TZOFFSETTO:+0200', 'TZNAME:CEST', 'DTSTART:19700329T020000', 'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU', 'END:DAYLIGHT',
        'BEGIN:STANDARD', 'TZOFFSETFROM:+0200', 'TZOFFSETTO:+0100', 'TZNAME:CET', 'DTSTART:19701025T030000', 'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU', 'END:STANDARD',
        'END:VTIMEZONE');
    }
    lista.forEach(function (ev) {
    var r = rangoCalendario(ev);
    l.push('BEGIN:VEVENT', 'UID:' + ev.id + '@cienzdel.unizar.es', 'DTSTAMP:' + stamp);
    if (r.todoElDia) l.push('DTSTART;VALUE=DATE:' + r.ini, 'DTEND;VALUE=DATE:' + r.fin);
    else l.push('DTSTART;TZID=Europe/Madrid:' + r.ini, 'DTEND;TZID=Europe/Madrid:' + r.fin);
    l.push('SUMMARY:' + escICS(ev.titulo));
    if (ev.datos.lugar) l.push('LOCATION:' + escICS(ev.datos.lugar.texto));
    l.push('DESCRIPTION:' + escICS(descripcionPlana(ev)), 'URL:' + urlEvento(ev));
    if (ev.estado === 'cancelado') l.push('STATUS:CANCELLED');
    if (ev.etiquetas.length) l.push('CATEGORIES:' + ev.etiquetas.map(escICS).join(','));
    l.push('END:VEVENT');
    });
    l.push('END:VCALENDAR');
    return l.map(plegar).join('\r\n') + '\r\n';
  }
  function descargarICS(ev) {
    var blob = new Blob([generarICS([ev])], { type: 'text/calendar;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = ev.id + '.ics';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }
  function urlGoogleCalendar(ev) {
    var r = rangoCalendario(ev);
    var q = new URLSearchParams({ action: 'TEMPLATE', text: ev.titulo, dates: r.ini + '/' + r.fin, details: descripcionPlana(ev) });
    if (!r.todoElDia) q.set('ctz', 'Europe/Madrid');
    if (ev.datos.lugar) q.set('location', ev.datos.lugar.texto);
    return 'https://calendar.google.com/calendar/render?' + q.toString();
  }

  /* ------------------------------------------------------------------ CSS */

  var CSS = [
    ':host { --azul: #223d71; --azul-claro: #e9edf7; --texto: #1d2230; --suave: #5b6274; --borde: #d5dae5;',
    '  --fondo: #f6f7fb; --tarjeta: #fff; --rojo: #c41230; --radio: 12px;',
    '  display: block; color: var(--texto); font-size: 16px; line-height: 1.5; container-type: inline-size; }',
    '*, *::before, *::after { box-sizing: border-box; }',
    '[hidden] { display: none !important; }',
    'a { color: var(--azul); text-underline-offset: 2px; }',
    'button { font: inherit; color: inherit; }',
    ':focus-visible { outline: 3px solid color-mix(in srgb, var(--azul) 50%, transparent); outline-offset: 2px; }',
    '.icono { width: 1.1em; height: 1.1em; flex: none; fill: none; stroke: currentColor; stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; vertical-align: -.18em; }',

    /* aviso para editores */
    '.editor { border: 1px dashed #b7c1d6; background: #fbfcff; border-radius: var(--radio); padding: 12px 16px; margin: 0 0 20px; font-size: .92rem; color: var(--suave); }',
    '.editor strong { color: var(--texto); }',
    '.editor ul { margin: 6px 0 0; padding-left: 20px; }',
    '.editor .problema { color: #8a3a00; }',
    '.editor a { font-weight: 600; }',

    /* barra */
    '.barra { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 16px; padding-bottom: 12px; margin-bottom: 18px; border-bottom: 1px solid var(--borde); }',
    '.recuento { color: var(--suave); font-size: .92rem; margin-right: auto; }',
    '.filtros { display: flex; flex-wrap: wrap; gap: 6px; }',
    '.chip { border: 1px solid var(--borde); background: var(--tarjeta); border-radius: 999px; padding: 4px 12px; font-size: .85rem; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; }',
    '.chip::before { content: ""; width: 8px; height: 8px; border-radius: 50%; background: var(--c, var(--suave)); }',
    '.chip.todos::before { display: none; }',
    '.chip[aria-pressed="true"] { background: var(--c, var(--azul)); border-color: var(--c, var(--azul)); color: #fff; }',
    '.chip[aria-pressed="true"]::before { background: #fff; }',
    '.vistas { display: inline-flex; border: 1px solid var(--borde); border-radius: 8px; overflow: hidden; }',
    '.vistas button { border: 0; background: var(--tarjeta); padding: 5px 12px; cursor: pointer; display: inline-flex; gap: 6px; align-items: center; font-size: .88rem; }',
    '.vistas button + button { border-left: 1px solid var(--borde); }',
    '.vistas button[aria-pressed="true"] { background: var(--azul); color: #fff; }',

    /* tarjetas */
    '.rejilla { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 270px), 1fr)); gap: 20px; }',
    '.tarjeta { position: relative; display: flex; flex-direction: column; background: var(--tarjeta); border: 1px solid var(--borde); border-radius: var(--radio); overflow: hidden; transition: box-shadow .18s, transform .18s; }',
    '.tarjeta:hover { box-shadow: 0 6px 20px rgba(34,61,113,.13); transform: translateY(-2px); }',
    '@media (prefers-reduced-motion: reduce) { .tarjeta, .tarjeta:hover { transition: none; transform: none; } }',
    '@container (min-width: 620px) { .tarjeta.destacado { grid-column: span 2; } .tarjeta.destacado .portada { aspect-ratio: 2.4 / 1; } .tarjeta.destacado h3 { font-size: 1.45rem; } }',
    '.portada { position: relative; aspect-ratio: 16 / 9; background: var(--c); overflow: hidden; }',
    '.portada img { width: 100%; height: 100%; object-fit: cover; display: block; }',
    '.portada.sin-imagen { background: linear-gradient(135deg, var(--c) 0%, color-mix(in srgb, var(--c) 70%, #000) 100%); }',
    '.portada.sin-imagen::after { content: ""; position: absolute; inset: 0; opacity: .14; background-image: radial-gradient(#fff 1.2px, transparent 1.3px); background-size: 16px 16px; }',
    '.portada .marca { position: absolute; right: 16px; bottom: 10px; color: #fff; opacity: .85; font-weight: 700; font-size: 1.05rem; letter-spacing: .02em; max-width: 60%; text-align: right; line-height: 1.2; z-index: 1; }',
    '.dia-grande { position: absolute; left: 14px; top: 14px; z-index: 1; background: #fff; color: var(--texto); border-radius: 10px; min-width: 64px; padding: 6px 10px 8px; text-align: center; box-shadow: 0 2px 10px rgba(0,0,0,.18); line-height: 1; }',
    '.dia-grande .mes { display: block; font-size: .78rem; font-weight: 700; letter-spacing: .08em; color: var(--c); }',
    '.dia-grande .num { display: block; font-size: 2.1rem; font-weight: 800; margin-top: 3px; }',
    '.dia-grande .num small { font-size: 1.1rem; font-weight: 700; color: var(--suave); }',
    '.dia-grande .sem { display: block; font-size: .72rem; color: var(--suave); margin-top: 4px; text-transform: uppercase; letter-spacing: .04em; }',
    '.sello { position: absolute; right: 12px; top: 12px; z-index: 1; background: var(--rojo); color: #fff; font-weight: 800; font-size: .78rem; letter-spacing: .08em; text-transform: uppercase; padding: 5px 10px; border-radius: 6px; }',
    '.sello.borrador { background: #fff3c4; color: #6b4b00; border: 1px dashed #b08300; }',
    '.sello.aplazado, .sello.completo { background: #4a5263; }',
    '.sello.destacado { background: var(--rojo); }',
    '.tarjeta.cancelado .portada img, .tarjeta.cancelado .portada.sin-imagen { filter: grayscale(1); }',
    '.tarjeta.cancelado h3 { text-decoration: line-through; text-decoration-thickness: 2px; }',
    '.tarjeta.borrador { border-style: dashed; border-color: #b08300; }',
    '.cuerpo { padding: 14px 18px 16px; display: flex; flex-direction: column; gap: 8px; flex: 1; }',
    '.etiquetas { display: flex; flex-wrap: wrap; gap: 6px; }',
    '.etiqueta { background: var(--c); color: #fff; font-weight: 700; font-size: .8rem; letter-spacing: .06em; text-transform: uppercase; padding: 4px 10px; border-radius: 6px; line-height: 1.3; }',
    'h3 { margin: 0; font-size: 1.18rem; line-height: 1.25; color: var(--texto); }',
    '.meta { margin: 0; display: flex; flex-direction: column; gap: 3px; color: var(--suave); font-size: .9rem; }',
    '.meta span { display: flex; gap: 7px; align-items: flex-start; }',
    '.meta .icono { margin-top: .2em; vertical-align: 0; }',
    '.meta strong { color: var(--texto); font-weight: 600; }',
    '.resumen { margin: 2px 0 0; color: var(--texto); font-size: .95rem; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }',
    '.acciones { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; padding: 12px 18px 14px; border-top: 1px solid var(--borde); background: #fafbfd; box-shadow: inset 4px 0 0 var(--c); }',
    '.acciones > :only-child { grid-column: 1 / -1; }',
    '.btn { display: inline-flex; align-items: center; justify-content: center; gap: 7px; min-height: 40px; padding: 8px 14px; border-radius: 8px; font-weight: 600; font-size: .95rem; text-decoration: none; cursor: pointer; border: 1px solid var(--borde); background: #fff; color: var(--texto); line-height: 1.2; text-align: center; }',
    '.btn:hover { border-color: var(--azul); }',
    '.btn.primario { background: var(--azul); border-color: var(--azul); color: #fff; }',
    '.btn.primario:hover { background: #18305c; }',
    '.btn[aria-disabled="true"] { background: #eef0f4; border-color: #e1e4eb; color: #6b7280; cursor: default; font-weight: 500; }',
    '.vacio { padding: 28px; text-align: center; color: var(--suave); border: 1px dashed var(--borde); border-radius: var(--radio); }',
    'details.pasados { margin-top: 32px; }',
    'details.pasados > summary { cursor: pointer; font-weight: 700; color: var(--azul); font-size: 1.1rem; padding: 6px 0; }',
    'details.pasados .rejilla { margin-top: 14px; }',
    '.tarjeta.pasado { opacity: .8; }',
    '.tarjeta.pasado .portada { filter: saturate(.5); }',

    /* calendario */
    '.cal-cabecera { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }',
    '.cal-cabecera h3 { font-size: 1.25rem; margin-right: auto; }',
    '.cal-cabecera button { border: 1px solid var(--borde); background: #fff; border-radius: 8px; min-width: 38px; height: 38px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; padding: 0 12px; }',
    '.cal { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); border: 1px solid var(--borde); border-radius: var(--radio); overflow: hidden; background: var(--borde); gap: 1px; }',
    '.cal .sem { background: var(--azul-claro); text-align: center; font-size: .78rem; font-weight: 700; padding: 6px 0; color: var(--azul); text-transform: uppercase; letter-spacing: .05em; }',
    '.celda { background: #fff; min-height: 96px; padding: 4px 5px 6px; display: flex; flex-direction: column; gap: 3px; min-width: 0; }',
    '.celda.fuera { background: #f7f8fb; }',
    '.celda.fuera .num { color: #a1a7b5; }',
    '.celda .num { font-size: .82rem; font-weight: 600; color: var(--suave); align-self: flex-end; width: 26px; height: 26px; display: grid; place-items: center; border-radius: 50%; }',
    '.celda.hoy .num { background: var(--rojo); color: #fff; }',
    '.celda .fecha-texto { display: none; }',
    '.ev { display: block; width: 100%; text-align: left; border: 0; background: var(--c); color: #fff; font-size: .76rem; font-weight: 600; line-height: 1.25; padding: 3px 6px; border-radius: 5px; cursor: pointer; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }',
    '.ev.cancelado { text-decoration: line-through; opacity: .65; }',
    '.ev.borrador { background: repeating-linear-gradient(45deg, var(--c), var(--c) 6px, color-mix(in srgb, var(--c) 75%, #fff) 6px, color-mix(in srgb, var(--c) 75%, #fff) 12px); }',
    '.ev.continua { border-top-left-radius: 0; border-bottom-left-radius: 0; }',
    '.ev .h { font-weight: 400; opacity: .9; margin-right: 4px; }',
    '.cal-leyenda { margin-top: 10px; font-size: .85rem; color: var(--suave); }',
    '@container (max-width: 600px) {',
    '  .cal { display: block; background: #fff; }',
    '  .cal .sem, .celda.vacia { display: none; }',
    '  .celda { min-height: 0; flex-direction: row; flex-wrap: wrap; align-items: center; gap: 6px; padding: 10px 12px; border-bottom: 1px solid var(--borde); }',
    '  .celda .num { display: none; }',
    '  .celda .fecha-texto { display: block; width: 100%; font-weight: 700; font-size: .9rem; color: var(--azul); }',
    '  .celda.hoy .fecha-texto::after { content: " · hoy"; color: var(--rojo); }',
    '  .ev { white-space: normal; font-size: .88rem; padding: 6px 10px; }',
    '}',
    '.cal-vacio { padding: 18px; text-align: center; color: var(--suave); }',

    /* modal */
    'dialog { border: 0; padding: 0; border-radius: 16px; width: min(94vw, 720px); max-height: min(92vh, 900px); box-shadow: 0 24px 60px rgba(0,0,0,.3); color: var(--texto); background: #fff; overflow: hidden; }',
    'dialog[open] { display: flex; flex-direction: column; }',
    'dialog::backdrop { background: rgba(16, 24, 40, .55); }',
    '@media (prefers-reduced-motion: no-preference) { dialog[open] { animation: entra .2s ease-out; } @keyframes entra { from { opacity: 0; transform: translateY(12px) scale(.98); } } }',
    '.m-scroll { overflow-y: auto; overscroll-behavior: contain; }',
    '.m-portada { position: relative; aspect-ratio: 21 / 8; background: var(--c); }',
    '.m-portada img { width: 100%; height: 100%; object-fit: cover; display: block; }',
    '.m-portada.sin-imagen { aspect-ratio: auto; height: 96px; background: linear-gradient(135deg, var(--c), color-mix(in srgb, var(--c) 70%, #000)); }',
    '.m-cerrar { position: absolute; right: 12px; top: 12px; z-index: 2; width: 40px; height: 40px; border-radius: 50%; border: 0; background: rgba(255,255,255,.94); cursor: pointer; display: grid; place-items: center; box-shadow: 0 2px 8px rgba(0,0,0,.2); font-size: 1.1rem; }',
    '.m-cuerpo { padding: 20px 26px 8px; }',
    '.m-cuerpo h2 { margin: 10px 0 14px; font-size: 1.6rem; line-height: 1.2; color: var(--texto); }',
    '.m-datos { display: grid; grid-template-columns: auto 1fr; gap: 8px 14px; margin: 0 0 18px; padding: 14px 16px; background: var(--fondo); border-radius: 10px; font-size: .95rem; }',
    '.m-datos dt { color: var(--suave); display: flex; gap: 6px; align-items: center; font-weight: 600; }',
    '.m-datos dd { margin: 0; }',
    '.m-texto { font-size: 1rem; }',
    '.m-texto img { max-width: 100%; height: auto; border-radius: 8px; }',
    '.m-texto > :first-child { margin-top: 0; }',
    '.m-texto h3 { font-size: 1.15rem; margin: 18px 0 6px; }',
    '.m-pie { display: flex; flex-wrap: wrap; gap: 10px; padding: 14px 26px 18px; border-top: 1px solid var(--borde); background: #fafbfd; }',
    '.m-pie .btn.primario { margin-right: auto; }',
    '.m-aviso-estado { margin: 0 0 14px; padding: 10px 14px; border-radius: 8px; background: #fde8eb; color: #8a1023; font-weight: 600; }',
    '.copiado { font-size: .85rem; color: #1e6b3f; align-self: center; }',
    '@media (max-width: 560px) { .m-cuerpo { padding: 16px 18px 6px; } .m-pie { padding: 12px 18px 16px; } .m-pie .btn { flex: 1 1 100%; } .m-cuerpo h2 { font-size: 1.35rem; } }',
    '.pie-version { margin-top: 28px; font-size: .78rem; color: #8a90a0; text-align: right; }'
  ].join('\n');

  /* ------------------------------------------------------------- interfaz */

  function iniciar() {
    var raiz = document.getElementById('eventos-cienzdel');
    if (!raiz || raiz.dataset.listo) return;
    raiz.dataset.listo = '1';
    var padre = raiz.parentNode;
    var hoy = new Date();
    if (raiz.dataset.hoy) { var ph = raiz.dataset.hoy.split('-'); hoy = new Date(+ph[0], +ph[1] - 1, +ph[2], 12); }
    var esEditor = document.body.classList.contains('user-logged-in') || raiz.hasAttribute('data-editor');

    // Fuente: los hermanos del contenedor, menos el propio contenedor y los <script>.
    var fuente = Array.prototype.filter.call(padre.childNodes, function (n) {
      if (n === raiz) return false;
      if (n.nodeType === 1 && n.tagName === 'SCRIPT') return false;
      if (n.nodeType === 3 && !n.textContent.trim()) return false;
      if (n.nodeType === 8) return false;
      return true;
    });
    var leido = leerEventos(fuente, hoy);
    var todos = leido.eventos;
    var visibles = todos.filter(function (e) { return e.estado !== 'borrador' || esEditor; });

    // Oculta el contenido original (salvo la introducción, que se mueve encima de las tarjetas).
    fuente.forEach(function (n) { if (leido.intro.indexOf(n) < 0 && n.nodeType === 1) n.style.display = 'none'; });
    fuente.forEach(function (n) { if (n.nodeType === 3) n.textContent = ''; });
    leido.intro.forEach(function (n) { padre.insertBefore(n, raiz); });

    var sombra = raiz.attachShadow({ mode: 'open' });
    sombra.appendChild(el('style', { text: CSS }));

    var estado = { filtro: null, vista: 'tarjetas', mes: null };
    var contenedor = el('div');
    sombra.appendChild(contenedor);

    // Aviso para quien tiene sesión iniciada.
    if (esEditor) contenedor.appendChild(avisoEditor(todos));

    var proximos = visibles.filter(function (e) { return !esPasado(e, hoy); })
      .sort(function (a, b) { return (instanteInicio(a) - instanteInicio(b)) || a.orden - b.orden; });
    var pasados = visibles.filter(function (e) { return esPasado(e, hoy); })
      .sort(function (a, b) { return instanteInicio(b) - instanteInicio(a); });

    var etiquetasTodas = [];
    visibles.forEach(function (e) {
      if (e.estado === 'borrador') return;
      e.etiquetas.forEach(function (t) { if (!etiquetasTodas.some(function (x) { return norm(x) === norm(t); })) etiquetasTodas.push(t); });
    });

    var barra = el('div', { class: 'barra' });
    var recuento = el('span', { class: 'recuento', 'aria-live': 'polite' });
    barra.appendChild(recuento);
    var filtros = el('div', { class: 'filtros', role: 'group', 'aria-label': 'Filtrar por etiqueta' });
    if (etiquetasTodas.length > 1) {
      filtros.appendChild(el('button', { type: 'button', class: 'chip todos', 'aria-pressed': 'true', 'data-t': '', text: 'Todos', onclick: elegirFiltro }));
      etiquetasTodas.forEach(function (t) {
        filtros.appendChild(el('button', { type: 'button', class: 'chip', 'aria-pressed': 'false', 'data-t': norm(t), style: '--c:' + colorEtiqueta(t), text: t, onclick: elegirFiltro }));
      });
      barra.appendChild(filtros);
    }
    var vistas = el('div', { class: 'vistas', role: 'group', 'aria-label': 'Vista' }, [
      el('button', { type: 'button', 'aria-pressed': 'true', 'data-v': 'tarjetas', onclick: elegirVista }, [icono('rejilla'), 'Tarjetas']),
      el('button', { type: 'button', 'aria-pressed': 'false', 'data-v': 'calendario', onclick: elegirVista }, [icono('calendario'), 'Calendario'])
    ]);
    barra.appendChild(vistas);
    contenedor.appendChild(barra);

    var zona = el('div');
    contenedor.appendChild(zona);
    contenedor.appendChild(el('div', { class: 'pie-version', text: 'Eventos del Consejo de Estudiantes · v' + VERSION }));

    var dialogo = construirDialogo();
    sombra.appendChild(dialogo.nodo);

    function pasaFiltro(e) {
      return !estado.filtro || e.etiquetas.some(function (t) { return norm(t) === estado.filtro; });
    }
    function elegirFiltro(ev) {
      var t = ev.currentTarget.getAttribute('data-t');
      estado.filtro = t || null;
      filtros.querySelectorAll('.chip').forEach(function (c) { c.setAttribute('aria-pressed', String(c.getAttribute('data-t') === (t || ''))); });
      pintar();
    }
    function elegirVista(ev) {
      estado.vista = ev.currentTarget.getAttribute('data-v');
      vistas.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-v') === estado.vista)); });
      pintar();
    }

    function pintar() {
      zona.textContent = '';
      var p = proximos.filter(pasaFiltro);
      var q = pasados.filter(pasaFiltro);
      recuento.textContent = p.length === 1 ? '1 evento próximo' : p.length + ' eventos próximos';
      if (estado.vista === 'calendario') { zona.appendChild(vistaCalendario(p.concat(q))); return; }
      if (p.length) {
        var rej = el('div', { class: 'rejilla' });
        p.forEach(function (e) { rej.appendChild(tarjeta(e)); });
        zona.appendChild(rej);
      } else {
        zona.appendChild(el('p', { class: 'vacio', text: estado.filtro ? 'No hay eventos próximos con esta etiqueta.' : 'Ahora mismo no hay eventos programados. ¡Vuelve pronto!' }));
      }
      if (q.length) {
        var rp = el('div', { class: 'rejilla' });
        q.forEach(function (e) { rp.appendChild(tarjeta(e)); });
        zona.appendChild(el('details', { class: 'pasados' }, [el('summary', { text: 'Eventos pasados (' + q.length + ')' }), rp]));
      }
    }

    function colorDe(e) { return e.etiquetas.length ? colorEtiqueta(e.etiquetas[0]) : '#223d71'; }

    function tarjeta(e) {
      var c = colorDe(e);
      var pasado = esPasado(e, hoy);
      var clases = ['tarjeta'];
      if (e.destacado && !pasado) clases.push('destacado');
      if (pasado) clases.push('pasado');
      if (e.estado) clases.push(e.estado);
      var art = el('article', { class: clases.join(' '), style: '--c:' + c, 'aria-labelledby': 't-' + e.id });

      var portada = el('div', { class: 'portada' + (e.portada ? '' : ' sin-imagen') });
      if (e.portada) portada.appendChild(el('img', { src: e.portada.src, alt: e.portada.alt, loading: 'lazy' }));
      else if (e.etiquetas.length) portada.appendChild(el('span', { class: 'marca', text: e.etiquetas.join(' · ') }));
      if (e.fecha) {
        var f = e.fecha;
        var num = el('span', { class: 'num' }, [String(f.inicio.getDate())]);
        if (f.fin) num.appendChild(el('small', { text: '–' + f.fin.getDate() }));
        var mes = MESES_CORTOS[f.inicio.getMonth()] + (f.fin && f.fin.getMonth() !== f.inicio.getMonth() ? '–' + MESES_CORTOS[f.fin.getMonth()] : '');
        portada.appendChild(el('div', { class: 'dia-grande', 'aria-hidden': 'true' }, [
          el('span', { class: 'mes', text: mes }), num,
          el('span', { class: 'sem', text: f.fin ? 'varios días' : DIAS[f.inicio.getDay()].slice(0, 3) })
        ]));
      }
      var sello = textoSello(e, pasado);
      if (sello) portada.appendChild(el('span', { class: 'sello ' + sello.clase, text: sello.texto }));
      art.appendChild(portada);

      var cuerpo = el('div', { class: 'cuerpo' });
      if (e.etiquetas.length) {
        cuerpo.appendChild(el('div', { class: 'etiquetas' }, e.etiquetas.map(function (t) {
          return el('span', { class: 'etiqueta', style: '--c:' + colorEtiqueta(t), text: t });
        })));
      }
      cuerpo.appendChild(el('h3', { id: 't-' + e.id, text: e.titulo }));
      var meta = el('p', { class: 'meta' });
      var tf = textoFechas(e, false);
      var th = textoHoras(e);
      if (tf) meta.appendChild(el('span', null, [icono('calendario'), el('strong', { text: tf + (th ? ' · ' + th : '') })]));
      if (e.datos.lugar) meta.appendChild(el('span', null, [icono('lugar'), e.datos.lugar.texto]));
      if (e.plazo && !pasado) meta.appendChild(el('span', null, [icono('plazo'), 'Inscripción hasta el ' + fechaCorta(e.plazo, false)]));
      cuerpo.appendChild(meta);
      if (e.resumen) cuerpo.appendChild(el('p', { class: 'resumen', text: e.resumen }));
      art.appendChild(cuerpo);

      art.appendChild(botones(e, false));
      return art;
    }

    function textoSello(e, pasado) {
      if (e.estado === 'borrador') return { clase: 'borrador', texto: 'Borrador (solo editores)' };
      if (e.estado === 'cancelado') return { clase: 'cancelado', texto: 'Cancelado' };
      if (e.estado === 'aplazado') return { clase: 'aplazado', texto: 'Aplazado' };
      if (e.estado === 'completo' && !pasado) return { clase: 'completo', texto: 'Completo' };
      if (e.destacado && !pasado) return { clase: 'destacado', texto: 'Destacado' };
      return null;
    }

    function botones(e, enDialogo) {
      var div = el('div', { class: enDialogo ? 'm-pie' : 'acciones' });
      var ins = estadoInscripcion(e, hoy);
      if (ins.tipo === 'abierta') {
        div.appendChild(el('a', { class: 'btn primario', href: ins.enlace, target: '_blank', rel: 'noopener' }, ['Inscribirse', icono('externo')]));
      } else if (ins.tipo !== 'sin') {
        div.appendChild(el('span', { class: 'btn', 'aria-disabled': 'true', text: ins.texto }));
      }
      if (!enDialogo) {
        div.appendChild(el('button', { type: 'button', class: 'btn', 'aria-haspopup': 'dialog', onclick: function () { abrir(e); } }, [icono('info'), 'Más información']));
        return div;
      }
      if (e.fecha && e.estado !== 'cancelado' && !esPasado(e, hoy)) {
        div.appendChild(el('a', { class: 'btn', href: urlGoogleCalendar(e), target: '_blank', rel: 'noopener' }, [icono('calendario'), 'Google Calendar']));
        div.appendChild(el('button', { type: 'button', class: 'btn', onclick: function () { descargarICS(e); } }, [icono('descarga'), 'Archivo .ics']));
      }
      var copiado = el('span', { class: 'copiado', role: 'status' });
      div.appendChild(el('button', { type: 'button', class: 'btn', onclick: function () {
        var url = urlEvento(e);
        (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(function () {
          copiado.textContent = 'Enlace copiado';
        }, function () { copiado.textContent = url; });
        setTimeout(function () { copiado.textContent = ''; }, 4000);
      } }, [icono('enlace'), 'Copiar enlace']));
      div.appendChild(copiado);
      return div;
    }

    /* ---- calendario */
    function vistaCalendario(lista) {
      var caja = el('div');
      if (!estado.mes) {
        var ref = proximos.length ? proximos[0].fecha.inicio : hoy;
        estado.mes = new Date(ref.getFullYear(), ref.getMonth(), 1);
      }
      var m = estado.mes;
      var cab = el('div', { class: 'cal-cabecera' }, [
        el('h3', { text: MESES[m.getMonth()].charAt(0).toUpperCase() + MESES[m.getMonth()].slice(1) + ' de ' + m.getFullYear(), 'aria-live': 'polite' }),
        el('button', { type: 'button', 'aria-label': 'Mes anterior', onclick: function () { estado.mes = new Date(m.getFullYear(), m.getMonth() - 1, 1); pintar(); } }, [icono('izq')]),
        el('button', { type: 'button', onclick: function () { estado.mes = new Date(hoy.getFullYear(), hoy.getMonth(), 1); pintar(); }, text: 'Hoy' }),
        el('button', { type: 'button', 'aria-label': 'Mes siguiente', onclick: function () { estado.mes = new Date(m.getFullYear(), m.getMonth() + 1, 1); pintar(); } }, [icono('der')])
      ]);
      caja.appendChild(cab);

      var cal = el('div', { class: 'cal', role: 'grid' });
      ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'].forEach(function (d) { cal.appendChild(el('div', { class: 'sem', role: 'columnheader', text: d })); });
      var primero = new Date(m.getFullYear(), m.getMonth(), 1);
      var desplaz = (primero.getDay() + 6) % 7;
      var inicio = new Date(primero); inicio.setDate(1 - desplaz);
      var ultimo = new Date(m.getFullYear(), m.getMonth() + 1, 0);
      var celdas = Math.ceil((desplaz + ultimo.getDate()) / 7) * 7;
      var conEventos = 0;
      for (var i = 0; i < celdas; i++) {
        var d = new Date(inicio); d.setDate(inicio.getDate() + i);
        var fuera = d.getMonth() !== m.getMonth();
        var delDia = lista.filter(function (e) {
          if (!e.fecha) return false;
          var a = soloDia(e.fecha.inicio), b = soloDia(e.fecha.fin || e.fecha.inicio);
          return d >= a && d <= b;
        }).sort(function (a, b) { return instanteInicio(a) - instanteInicio(b); });
        var clases = ['celda'];
        if (fuera) clases.push('fuera');
        if (mismoDia(d, hoy)) clases.push('hoy');
        if (!delDia.length || fuera) clases.push('vacia');
        var celda = el('div', { class: clases.join(' '), role: 'gridcell' }, [
          el('span', { class: 'num', text: String(d.getDate()) }),
          el('span', { class: 'fecha-texto', text: DIAS[d.getDay()] + ' ' + d.getDate() + ' de ' + MESES[d.getMonth()] })
        ]);
        if (!fuera && delDia.length) conEventos++;
        delDia.forEach(function (e) {
          var cont = !mismoDia(d, e.fecha.inicio) && d.getDay() !== 1;
          var b = el('button', { type: 'button', class: 'ev' + (e.estado ? ' ' + e.estado : '') + (cont ? ' continua' : ''), style: '--c:' + colorDe(e),
            title: e.titulo, 'aria-haspopup': 'dialog', onclick: function () { abrir(e); } });
          if (e.fecha.horaIni && mismoDia(d, e.fecha.inicio)) b.appendChild(el('span', { class: 'h', text: e.fecha.horaIni }));
          b.appendChild(document.createTextNode(e.titulo));
          celda.appendChild(b);
        });
        cal.appendChild(celda);
      }
      caja.appendChild(cal);
      if (!conEventos) caja.appendChild(el('p', { class: 'cal-vacio', text: 'No hay eventos este mes.' }));
      caja.appendChild(el('p', { class: 'cal-leyenda' }, [
        icono('calendario'), ' Tenlos todos en tu calendario y se actualizarán solos: ',
        el('a', { href: 'https://calendar.google.com/calendar/r?cid=' + encodeURIComponent('webcal://' + FEED), target: '_blank', rel: 'noopener', text: 'Google Calendar' }), ' · ',
        el('a', { href: 'webcal://' + FEED, text: 'Apple, Outlook y otros' }), ' · ',
        el('a', { href: 'https://' + FEED, text: 'archivo .ics' })
      ]));
      return caja;
    }

    /* ---- modal */
    function construirDialogo() {
      var nodo = el('dialog', { 'aria-labelledby': 'm-titulo' });
      nodo.addEventListener('click', function (ev) {
        if (ev.target !== nodo) return;
        var r = nodo.getBoundingClientRect();
        if (ev.clientX < r.left || ev.clientX > r.right || ev.clientY < r.top || ev.clientY > r.bottom) nodo.close();
      });
      nodo.addEventListener('close', function () {
        document.documentElement.style.overflow = '';
        if (location.hash) history.replaceState(null, '', location.pathname + location.search);
        if (dialogo.origen && dialogo.origen.focus) dialogo.origen.focus();
      });
      return { nodo: nodo, origen: null };
    }

    function abrir(e) {
      var d = dialogo.nodo;
      dialogo.origen = sombra.activeElement;
      d.textContent = '';
      d.style.setProperty('--c', colorDe(e));
      var scroll = el('div', { class: 'm-scroll' });
      var portada = el('div', { class: 'm-portada' + (e.portada ? '' : ' sin-imagen') });
      if (e.portada) portada.appendChild(el('img', { src: e.portada.src, alt: e.portada.alt }));
      portada.appendChild(el('button', { type: 'button', class: 'm-cerrar', 'aria-label': 'Cerrar', onclick: function () { d.close(); } }, [icono('cerrar')]));
      scroll.appendChild(portada);

      var cuerpo = el('div', { class: 'm-cuerpo' });
      if (e.etiquetas.length) cuerpo.appendChild(el('div', { class: 'etiquetas' }, e.etiquetas.map(function (t) {
        return el('span', { class: 'etiqueta', style: '--c:' + colorEtiqueta(t), text: t });
      })));
      cuerpo.appendChild(el('h2', { id: 'm-titulo', text: e.titulo }));
      if (e.estado === 'cancelado') cuerpo.appendChild(el('p', { class: 'm-aviso-estado', text: 'Este evento se ha cancelado.' }));
      if (e.estado === 'aplazado') cuerpo.appendChild(el('p', { class: 'm-aviso-estado', text: 'Este evento se ha aplazado. Anunciaremos la nueva fecha.' }));
      if (e.estado === 'borrador') cuerpo.appendChild(el('p', { class: 'm-aviso-estado', text: 'Borrador: solo lo ven quienes tienen sesión iniciada en la web.' }));

      var dl = el('dl', { class: 'm-datos' });
      function fila(ic, nombre, valor) { if (valor) { dl.appendChild(el('dt', null, [icono(ic), nombre])); dl.appendChild(el('dd', null, [valor])); } }
      fila('calendario', 'Fecha', textoFechas(e, true));
      fila('reloj', 'Hora', textoHoras(e));
      fila('lugar', 'Lugar', e.datos.lugar && (e.datos.lugar.enlace
        ? el('a', { href: e.datos.lugar.enlace, target: '_blank', rel: 'noopener', text: e.datos.lugar.texto }) : e.datos.lugar.texto));
      if (e.plazo) fila('plazo', 'Inscripción', 'hasta el ' + fechaLarga(e.plazo));
      else if (e.datos.inscripcion && !e.datos.inscripcion.enlace) fila('plazo', 'Inscripción', e.datos.inscripcion.texto);
      e.extra.forEach(function (x) {
        fila('info', x.clave, x.enlace ? el('a', { href: x.enlace, target: '_blank', rel: 'noopener', text: x.texto }) : x.texto);
      });
      if (dl.childNodes.length) cuerpo.appendChild(dl);

      var texto = el('div', { class: 'm-texto' });
      e.contenido.forEach(function (n) {
        var copia = n.cloneNode(true);
        if (copia.nodeType === 1) {
          copia.style.display = '';
          // La portada ya está arriba: no la repitas.
          if (e.portada) {
            var imgs = copia.tagName === 'IMG' ? [copia] : Array.prototype.slice.call(copia.querySelectorAll('img'));
            imgs.forEach(function (im) { if (im.src === e.portada.src) im.remove(); });
            if (!copia.textContent.trim() && !copia.querySelector('img,iframe,video,table')) return;
          }
          copia.querySelectorAll('a[href^="http"]').forEach(function (a) {
            if (a.host !== location.host) { a.target = '_blank'; a.rel = 'noopener'; }
          });
          copia.querySelectorAll('h2').forEach(function (h) { var h3 = el('h3'); h3.innerHTML = h.innerHTML; h.replaceWith(h3); });
        }
        texto.appendChild(copia);
      });
      cuerpo.appendChild(texto);
      scroll.appendChild(cuerpo);
      d.appendChild(scroll);
      d.appendChild(botones(e, true));

      history.replaceState(null, '', '#' + e.id);
      document.documentElement.style.overflow = 'hidden';
      if (!d.open) d.showModal();
      scroll.scrollTop = 0;
      var cerrar = d.querySelector('.m-cerrar');
      if (cerrar) cerrar.focus();
    }

    function abrirDesdeHash() {
      var id = decodeURIComponent(location.hash.replace(/^#/, ''));
      if (!id) return;
      var e = visibles.find(function (x) { return x.id === id; });
      if (e) { raiz.scrollIntoView({ block: 'start' }); abrir(e); }
    }

    pintar();
    abrirDesdeHash();
    window.addEventListener('hashchange', function () { if (!dialogo.nodo.open) abrirDesdeHash(); });

    // Datos para la consola y para herramientas/exportar.mjs (feed .ics y JSON).
    function iso(d) { return d ? d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) : null; }
    var publicos = todos.filter(function (e) { return e.estado !== 'borrador' && e.fecha; });
    window.eventosCienzdel = {
      version: VERSION,
      eventos: todos.map(function (e) {
        return { id: e.id, titulo: e.titulo, url: urlEvento(e), inicio: e.fecha && iso(e.fecha.inicio), fin: e.fecha && iso(e.fecha.fin),
          horaIni: e.fecha && e.fecha.horaIni, horaFin: e.fecha && e.fecha.horaFin, lugar: e.datos.lugar ? e.datos.lugar.texto : null,
          etiquetas: e.etiquetas, color: colorDe(e), destacado: e.destacado, estado: e.estado, resumen: e.resumen,
          inscripcion: e.datos.inscripcion ? (e.datos.inscripcion.enlace || e.datos.inscripcion.texto) : null,
          plazo: iso(e.plazo), portada: e.portada ? e.portada.src : null, avisos: e.avisos };
      }),
      ics: function () { return generarICS(publicos, 'Eventos del Consejo de Estudiantes de Ciencias'); }
    };
  }

  function avisoEditor(todos) {
    var problemas = todos.filter(function (e) { return e.avisos.length; });
    var editar = document.querySelector('a[href$="/edit"][href*="/node/"]');
    var caja = el('div', { class: 'editor', role: 'note' });
    var linea = el('p', { style: 'margin:0' }, [
      icono('lapiz'), ' ', el('strong', { text: 'Vista de editor. ' }),
      'Para añadir un evento, ',
      editar ? el('a', { href: editar.getAttribute('href'), text: 'edita esta página' }) : 'edita esta página',
      ', copia un evento (desde su «Título 2» hasta antes del siguiente) y cambia los datos. ',
      el('a', { href: GUIA_PDF, target: '_blank', rel: 'noopener', text: 'Guía en PDF' }), '. ',
      'Los eventos con «Estado: borrador» solo los ves tú. Este recuadro no lo ve el público.'
    ]);
    caja.appendChild(linea);
    if (problemas.length) {
      var ul = el('ul');
      problemas.forEach(function (e) {
        e.avisos.forEach(function (a) { ul.appendChild(el('li', { class: 'problema' }, [icono('aviso'), ' ', el('strong', { text: e.titulo + ': ' }), a])); });
      });
      caja.appendChild(ul);
    }
    return caja;
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();
