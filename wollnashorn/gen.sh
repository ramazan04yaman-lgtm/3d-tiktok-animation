# Baut scene.js aus T-Rex-Basis (Renderer, Welt, Material, UI) + Wollnashorn-Teilen
cd "$(dirname "$0")"; T=../trex/scene.js
{ sed -n 1,540p $T | sed '1s/.*/\/\/ "Wenn … du in der Eiszeit lebst" – komplett prozedurale 3D-Szene (Three.js)/'; cat rhino_part.js; sed -n 726,759p $T; cat shots_part.js; sed -n 951,999p $T; } > scene.js
sed -i 's/shots\[i\](T); scene.updateMatrixWorld(true);/shots[i](T); if (window.DBG) window.DBG(); scene.updateMatrixWorld(true);/' scene.js
echo 'window.__ = { camera, LOOK, rhino, G, V, ui, svg, scene, poseQ };' >> scene.js
