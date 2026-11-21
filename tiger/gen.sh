# Baut scene.js aus T-Rex-Basis (Renderer, Welt, Material, UI) + Tiger-Teilen
cd "$(dirname "$0")"; T=../trex/scene.js
{ sed -n 1,540p $T | sed '1s/.*/\/\/ "Wenn … du im Dschungel lebst" – komplett prozedurale 3D-Szene (Three.js)/'; cat tiger_part.js; sed -n 726,759p $T; cat shots_part.js; sed -n 951,999p $T; } > scene.js
sed -i 's/shots\[i\](T); scene.updateMatrixWorld(true);/shots[i](T); if (window.DBG) window.DBG(); scene.updateMatrixWorld(true);/' scene.js
echo 'window.__ = { camera, LOOK, tiger, rival, cubs, deer, G, V, ui, svg, scene, poseQ };' >> scene.js
