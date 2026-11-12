// usage: node src/render.js [frames...]  -> preview pngs ; no args -> full video
const { chromium } = require('playwright'); const fs=require('fs'); const {spawn}=require('child_process'); const path=require('path');
(async()=>{
 const TL=JSON.parse(fs.readFileSync('build/timeline.json','utf8')); const FPS=30;
 const b=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
 const p=await b.newPage({viewport:{width:1080,height:1920}});
 p.on('console',m=>console.log('PAGE',m.text())); p.on('pageerror',e=>console.log('ERR',e.message));
 await p.addInitScript(tl=>{window.TL=tl},TL);
 await p.goto('file://'+path.resolve('src/index.html')); await p.waitForFunction('window.ready');
 await p.evaluate(()=>document.fonts.ready);
 const args=process.argv.slice(2);
 if(args.length){for(const a of args){await p.evaluate(t=>render(t),+a);await p.screenshot({path:`build/prev_${a}.jpg`,type:'jpeg',quality:70});}await b.close();return}
 const N=Math.ceil(TL.total*FPS);
 const ff=spawn('ffmpeg',['-y','-loglevel','error','-f','image2pipe','-framerate',String(FPS),'-c:v','mjpeg','-i','-','-i','build/voice.wav','-i','build/music.wav',
  '-filter_complex','[1:a]highpass=f=80,acompressor=threshold=-18dB:ratio=3,volume=1.6,asplit[vo1][vo2];[2:a]volume=0.32[mu];[mu][vo1]sidechaincompress=threshold=0.05:ratio=6:release=300[md];[md][vo2]amix=inputs=2:normalize=0,loudnorm=I=-14:TP=-1.5[a]',
  '-map','0:v','-map','[a]','-c:v','libx264','-preset','medium','-crf','18','-pix_fmt','yuv420p','-c:a','aac','-b:a','192k','-shortest','-movflags','+faststart','build/video.mp4'],{stdio:['pipe','inherit','inherit']});
 const t0=Date.now();
 for(let i=0;i<N;i++){await p.evaluate(t=>render(t),i/FPS);const buf=await p.screenshot({type:'jpeg',quality:92});
  if(!ff.stdin.write(buf))await new Promise(r=>ff.stdin.once('drain',r));
  if(i%60==0)console.log(i,'/',N,((Date.now()-t0)/1000).toFixed(0)+'s')}
 ff.stdin.end(); await new Promise(r=>ff.on('close',r)); await b.close(); console.log('done');
})();
