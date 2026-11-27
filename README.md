# Eventos del Consejo de Estudiantes de Ciencias

Script que convierte la página [cienzdel.unizar.es/eventos](https://cienzdel.unizar.es/eventos) en un tablón de
eventos con tarjetas, calendario mensual y una ventana de «Más información» para cada evento. **Estado: prototipo con
eventos ficticios.**

Los eventos se escriben en Drupal como contenido normal de la página, así que cualquiera con cuenta de editor en la web
puede añadirlos sin tocar código ni GitHub. La guía para editores está en [`guia/guia_eventos.pdf`](guia/guia_eventos.pdf).

## Cómo funciona

El cuerpo de la página de Drupal (texto completo en [`drupal/eventos.html`](drupal/eventos.html)) tiene esta forma:

```html
<div id="eventos-cienzdel"></div>
<p>Introducción (opcional)</p>
<h2>Título del evento</h2>
<ul>
  <li>Fecha: 12/12/2026</li>
  <li>Hora: 17:00 a 21:00</li>
  <li>Lugar: Cafetería de la Facultad</li>
  <li>Etiquetas: Torneo, Ocio</li>
  <li>Inscripción: <a href="https://forms.gle/...">formulario</a></li>
</ul>
<p><img src="..." alt="..."></p>        <!-- portada (opcional) -->
<p>Resumen que sale en la tarjeta.</p>
<p>Resto del texto: solo en «Más información».</p>
<h2>Siguiente evento</h2>
...
<script src="https://cienzdel.github.io/eventos/eventos.js"></script>
```

[`eventos.js`](eventos.js) lee esos bloques (cada `<h2>` empieza un evento), oculta el contenido original y pinta la
interfaz dentro de un *shadow root*, para que el CSS del tema de la Universidad no se mezcle. Si el script no carga, el
contenido sigue siendo legible tal cual.

### Datos que entiende

| Línea | Ejemplos | Notas |
|---|---|---|
| `Fecha` | `12/12/2026`, `12 de diciembre de 2026`, `del 20 al 22 de enero de 2027`, `2026-12-12` | Obligatoria. |
| `Hora` | `17:00`, `17:00 a 21:00`, `17 h` | La hora también puede ir en la línea de fecha. |
| `Lugar` | texto, puede llevar enlace | |
| `Etiquetas` | `Torneo, Ocio` | Separadas por comas. `Destacado` no se muestra como etiqueta: hace la tarjeta el doble de ancha. |
| `Inscripción` | enlace al formulario, o un texto (`no hace falta inscribirse`) | Con enlace sale el botón «Inscribirse»; sin enlace, el texto en gris. |
| `Plazo` | `10/12/2026` | Después de ese día el botón pasa a «Inscripción cerrada». |
| `Estado` | `borrador`, `cancelado`, `aplazado`, `completo` | `borrador`: solo lo ven quienes tienen sesión iniciada. |
| cualquier otra | `Plazas: 32 parejas`, `Trae: portátil` | Se muestra tal cual en «Más información». |

Los eventos pasados se mueven solos a «Eventos pasados». Cada evento tiene enlace propio
(`/eventos#titulo-del-evento`) que abre directamente su ventana, y botones para añadirlo a Google Calendar o descargar su `.ics`.

Con sesión iniciada aparece un recuadro para editores con el enlace a la guía y los avisos de lo que el script no
entiende (una fecha mal escrita, una línea que falta…).

## Calendario suscribible y JSON

La acción [`exportar.yml`](.github/workflows/exportar.yml) lee la página cada 3 horas con el mismo `eventos.js`
(en [jsdom](https://github.com/jsdom/jsdom)) y publica:

- [`eventos.ics`](https://cienzdel.github.io/eventos/eventos.ics): calendario para suscribirse desde Google Calendar,
  Apple o Outlook (`webcal://cienzdel.github.io/eventos/eventos.ics`).
- [`eventos.json`](https://cienzdel.github.io/eventos/eventos.json): los eventos públicos, para otras webs (p. ej. el
  visor de horarios). GitHub Pages lo sirve con CORS abierto.

En local: `npm install` y `npm run exportar` (o `node herramientas/exportar.mjs index.html` para usar la demo).

## Archivos

- `eventos.js`: todo el script (lectura, interfaz, CSS, `.ics`).
- `drupal/eventos.html`: cuerpo de la página de Drupal.
- `index.html`: la misma página fuera de Drupal, para probar (`python herramientas/demo.py` la regenera; `?editor` muestra la vista de editor).
- `ejemplos/`: portadas ficticias del prototipo (`herramientas/portadas_ejemplo.py`).
- `guia/`: guía para editores en LaTeX (plantilla del Consejo), compilada con `latexmk`.
