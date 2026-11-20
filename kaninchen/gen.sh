# Baut scene.js aus T-Rex-Basis (Renderer, Welt, Materialien, UI) + Kaninchen-Teilen
cd "$(dirname "$0")"; T=../trex/scene.js
{ sed -n 1,540p $T | sed '1s/.*/\/\/ "Wenn … du Kaninchen hältst" – komplett prozedurale 3D-Szene (Three.js)/'; cat kan_part.js; sed -n 726,759p $T; cat shots_part.js; sed -n 951,999p $T; } > scene.js
sed -i 's/shots\[i\](T); scene.updateMatrixWorld(true);/shots[i](T); if (window.DBG) window.DBG(); scene.updateMatrixWorld(true);/' scene.js
echo 'window.__ = { camera, LOOK, bun, bun2, babies, fox, G, V, ui, svg, scene, poseR };' >> scene.js
