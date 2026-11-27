"""Genera index.html: la página de Drupal (drupal/eventos.html) fuera de Drupal, para probar el script."""
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
cuerpo = (RAIZ / "drupal" / "eventos.html").read_text(encoding="utf-8")
cuerpo = cuerpo.replace("https://cienzdel.github.io/eventos/eventos.js", "eventos.js")
cuerpo = cuerpo.replace("https://cienzdel.github.io/eventos/ejemplos/", "ejemplos/")
html = f"""<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Eventos · Consejo de Estudiantes de Ciencias (demostración)</title>
<meta name="robots" content="noindex">
<style>
  body {{ margin: 0; font-family: "Red Hat Text", system-ui, sans-serif; color: #2f3337; background: #fff; }}
  .pagina {{ max-width: 1170px; margin: 0 auto; padding: 24px 16px 48px; }}
  h1 {{ font-size: 2rem; margin: 0 0 16px; }}
  .demo {{ background: #fff3c4; border: 1px solid #e0c060; padding: 8px 12px; border-radius: 8px; font-size: .9rem; margin-bottom: 18px; }}
</style>
</head>
<body>
<div class="pagina">
<p class="demo">Demostración fuera de Drupal. La página real es cienzdel.unizar.es/eventos. Añade <code>?editor</code> a la dirección para ver la vista de editor.</p>
<h1>Eventos</h1>
<div class="cuerpo">
<script>if (location.search.indexOf('editor') >= 0) document.addEventListener('DOMContentLoaded', function () {{ document.getElementById('eventos-cienzdel').setAttribute('data-editor', ''); }}, {{ once: true, capture: true }});</script>
{cuerpo}</div>
</div>
</body>
</html>
"""
(RAIZ / "index.html").write_text(html, encoding="utf-8")
print("index.html generado")
