#!/usr/bin/env bash
# Збирає один самодостатній HTML-файл із src/ у dist/index.html
set -euo pipefail
cd "$(dirname "$0")"
cat $(ls src/*.js | sort) > dist/game.js
node --check dist/game.js
{
  cat src/00_shell.html
  echo '<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>'
  echo '<script>'; cat dist/game.js; echo '</script>'
  echo '</body></html>'
} > dist/index.html
rm dist/game.js
# Копіюємо зображення для головного меню
mkdir -p dist/menu
cp menu/*.jpg dist/menu/ 2>/dev/null || true
echo "OK → dist/index.html"
