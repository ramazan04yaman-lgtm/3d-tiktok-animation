# Baut scene.js aus T-Rex-Basis (Renderer, Welt, Material, UI) + Oktopus-Teilen
cd "$(dirname "$0")"; T=../trex/scene.js
{ sed -n 1,540p $T | sed '1s/.*/\/\/ "Wenn … du am Meeresgrund lebst" – komplett prozedurale 3D-Szene (Three.js)/'; cat okto_part.js; sed -n 726,759p $T; cat shots_part.js; sed -n 951,999p $T; } > scene.js
sed -i 's/shots\[i\](T); scene.updateMatrixWorld(true);/shots[i](T); if (window.DBG) window.DBG(); scene.updateMatrixWorld(true);/' scene.js
echo 'window.__ = { camera, LOOK, okto, shark, crab, G, E, V, ui, svg, scene, poseOkto };' >> scene.js
