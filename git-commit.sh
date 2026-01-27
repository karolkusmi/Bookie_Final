#!/bin/bash

# Script para hacer commit y push de los cambios de estética

echo "📝 Agregando archivos modificados..."
git add src/front/pages/Home.css
git add src/front/pages/Home.jsx
git add src/front/pages/Profile.css
git add src/front/pages/Profile.jsx
git add src/front/index.css

echo "✅ Creando commit..."
git commit -F COMMIT_MESSAGE.md

echo "🚀 Subiendo cambios al repositorio..."
git push

echo "✨ ¡Cambios subidos exitosamente!"
