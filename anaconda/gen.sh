# Baut scene.js aus T-Rex-Basis (Welt, Material, UI) + Anakonda-Teilen
cd "$(dirname "$0")"; T=../trex/scene.js
{ sed -n 1,540p $T | sed '1s/.*/\/\/ "Wenn … du eine Anakonda baust" – komplett prozedurale 3D-Szene (Three.js)/'; cat ana_part.js; sed -n 726,759p $T; cat shots_part.js; sed -n 951,999p $T; } > scene.js
sed -i 's/shots\[i\](T); scene.updateMatrixWorld(true);/shots[i](T); if (window.DBG) window.DBG(); scene.updateMatrixWorld(true);/' scene.js
echo 'window.__ = { camera, LOOK, ana, capy, rex, V, ui, svg, scene, poseAna, restCurve };' >> scene.js
