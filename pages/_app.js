
import '../styles/globals.css';
import Head from 'next/head';
import { useEffect } from 'react';
import { AuthProvider, AuthGuard } from '../lib/auth';

export default function MyApp({ Component, pageProps }) {
  useEffect(() => {
    const starCanvas = document.getElementById('starfield');
    if (starCanvas) {
      const starCtx = starCanvas.getContext('2d');
      let stars = [];
      function resize() { starCanvas.width = window.innerWidth; starCanvas.height = window.innerHeight; }
      window.addEventListener('resize', resize); resize();
      for (let i = 0; i < 200; i++) stars.push({ x: Math.random()*starCanvas.width, y: Math.random()*starCanvas.height, r: Math.random()*2, s: 0.3+Math.random()*0.5, o: Math.random() });
      function draw() {
        starCtx.clearRect(0,0,starCanvas.width,starCanvas.height);
        for (let s of stars) {
          starCtx.beginPath(); starCtx.arc(s.x,s.y,s.r,0,2*Math.PI);
          starCtx.fillStyle = `rgba(200,220,255,${s.o})`; starCtx.fill();
          s.y += s.s; if (s.y > starCanvas.height) { s.y=0; s.x = Math.random()*starCanvas.width; }
        }
        requestAnimationFrame(draw);
      }
      draw();
    }
    const rainCanvas = document.getElementById('neon-rain');
    if (rainCanvas) {
      const rainCtx = rainCanvas.getContext('2d');
      rainCanvas.width = window.innerWidth; rainCanvas.height = window.innerHeight;
      window.addEventListener('resize', () => { rainCanvas.width = window.innerWidth; rainCanvas.height = window.innerHeight; });
      let drops = [];
      for (let i=0;i<100;i++) drops.push({ x:Math.random()*rainCanvas.width, y:Math.random()*rainCanvas.height, len:20+Math.random()*50, speed:2+Math.random()*5 });
      function drawRain() {
        rainCtx.clearRect(0,0,rainCanvas.width,rainCanvas.height);
        rainCtx.strokeStyle = 'rgba(0,240,255,0.2)'; rainCtx.lineWidth=1;
        for (let d of drops) {
          rainCtx.beginPath(); rainCtx.moveTo(d.x,d.y); rainCtx.lineTo(d.x, d.y+d.len); rainCtx.stroke();
          d.y+=d.speed; if(d.y>rainCanvas.height){d.y=-d.len; d.x=Math.random()*rainCanvas.width;}
        }
        requestAnimationFrame(drawRain);
      }
      drawRain();
    }
    const cursor = document.getElementById('custom-cursor');
    document.addEventListener('mousemove', e => { if(cursor){ cursor.style.left=e.clientX+'px'; cursor.style.top=e.clientY+'px'; } });
    const glow = document.getElementById('mouse-glow');
    document.addEventListener('mousemove', e => { if(glow){ glow.style.left=e.clientX+'px'; glow.style.top=e.clientY+'px'; } });
  }, []);

  return (
    <AuthProvider>
      <Head>
        <title>Virgala Store</title>
        <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Rajdhani:wght@500;700&display=swap" rel="stylesheet" />
      </Head>
      <canvas id="starfield" style={{position:'fixed',top:0,left:0,width:'100%',height:'100%',zIndex:0}}></canvas>
      <canvas id="neon-rain" style={{position:'fixed',top:0,left:0,width:'100%',height:'100%',zIndex:0,opacity:0.15}}></canvas>
      <div id="mouse-glow" style={{position:'fixed',pointerEvents:'none',zIndex:998,width:400,height:400,borderRadius:'50%',transform:'translate(-50%,-50%)',background:'radial-gradient(circle, rgba(0,240,255,0.06) 0%, transparent 70%)'}}></div>
      <div id="custom-cursor" style={{width:20,height:20,border:'2px solid #00f0ff',borderRadius:'50%',position:'fixed',pointerEvents:'none',zIndex:9999,transform:'translate(-50%,-50%)',mixBlendMode:'difference'}}></div>
      <AuthGuard>
        <div className="content">
          <Component {...pageProps} />
        </div>
      </AuthGuard>
    </AuthProvider>
  );
}
