/* v_Q wireframe product case 2026-11-18 */
(function(){
  var cv=null, ctx=null, W=0, H=0, dpr=1, t0=performance.now(), key='', build=0, rec=[], parts=[], lastT=0;
  var ACC={VANQUISH:'120,120,116',RISE:'150,172,20',DRIFT:'120,90,190'};
  var still=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  function fit(){ var r=cv.getBoundingClientRect(); dpr=Math.min(window.devicePixelRatio||1,2); W=r.width; H=r.height; cv.width=W*dpr; cv.height=H*dpr; ctx.setTransform(dpr,0,0,dpr,0,0); }
  function rot(p,ay,ax){ var x=p[0],y=p[1],z=p[2]; var c=Math.cos(ay),s=Math.sin(ay); var x1=x*c+z*s, z1=-x*s+z*c; c=Math.cos(ax); s=Math.sin(ax); return [x1, y*c-z1*s, y*s+z1*c]; }
  function line(pts,v,col,a){ if(pts.length<2) return; ctx.beginPath(); for(var i=0;i<pts.length;i++){ var q=rot(pts[i],v.ay,v.ax), k=3/(3+q[2]*0.5); var X=v.cx+q[0]*v.S*k, Y=v.cy+q[1]*v.S*k; i?ctx.lineTo(X,Y):ctx.moveTo(X,Y); if(i%2===0) rec.push([X,Y,col,a]); } ctx.strokeStyle='rgba('+col+','+a+')'; ctx.stroke(); }
  function activeKey(){ var el=document.querySelectorAll('.vq-hero .vq-slide'); for(var i=0;i<el.length;i++){ if(el[i].style.opacity==='1') return el[i].getAttribute('data-key')||''; } return ''; }
  var R=0.40, HH=1.0, LIP=0.035;
  function draw(now){
    if(!cv||!cv.isConnected) return;
    var t=(now-t0)/1000; if(cv.clientWidth!==W||cv.clientHeight!==H) fit();
    var dt=Math.min(0.05,t-lastT); lastT=t;
    var k=activeKey(); if(k!==key){ if(key&&!still){ parts=rec.map(function(r){ var dx=r[0]-W/2, dy=r[1]-H*0.4; return { x:r[0], y:r[1], vx:dx*0.25*Math.random()+(Math.random()-0.5)*30, vy:-20-Math.random()*70+dy*0.1, c:r[2], a:Math.min(0.8,r[3]*3.5), s:0.6+Math.random()*1.4, life:0, max:1.4+Math.random()*1.6, ph:Math.random()*6 }; }); } key=k; build=t+(parts.length?0.7:0); }
    rec=[];
    var g=Math.min(1,(t-build)/2.2); g=still?1:1-Math.pow(1-g,3);
    ctx.clearRect(0,0,W,H);
    if(parts.length){ var alive=[]; for(var pi=0;pi<parts.length;pi++){ var P=parts[pi]; P.life+=dt; if(P.life>=P.max) continue; P.vx*=0.985; P.vy-=8*dt; P.x+=(P.vx+Math.sin(t*1.7+P.ph)*12)*dt; P.y+=P.vy*dt; var f=1-P.life/P.max; ctx.fillStyle='rgba('+P.c+','+(P.a*f*f)+')'; ctx.fillRect(P.x,P.y,P.s,P.s); alive.push(P); } parts=alive; }
    if(t<build){ if(!still) requestAnimationFrame(draw); return; }
    ctx.lineWidth=0.6;
    var v={ S:Math.min(H*0.50,W*0.40), cx:W/2, cy:H*0.40, ay:t*0.18, ax:0.22+Math.sin(t*0.13)*0.05 };
    var acc=ACC[key]||ACC.VANQUISH, wht='225,225,222', i, j, pts, N=44, tw=0.35*Math.sin(t*0.35);
    var top=-HH*0.5, bot=HH*0.5, ymax=bot-(bot-top)*g;
    /* vertical lines, with a soft twist that breathes */
    for(i=0;i<N;i++){ pts=[]; for(j=0;j<=40;j++){ var y=bot-(bot-top)*j/40; if(y<ymax) break; var u=(y-top)/(bot-top); var a=Math.PI*2*i/N + tw*(0.5-u); var rr=R*(1+0.03*Math.sin(t*0.9+u*6+i)); pts.push([rr*Math.cos(a),y,rr*Math.sin(a)]); } line(pts,v,wht,0.13); }
    /* rings */
    for(i=0;i<=16;i++){ var y2=bot-(bot-top)*i/16; if(y2<ymax) break; var u2=(y2-top)/(bot-top); pts=[]; for(j=0;j<=72;j++){ var a2=Math.PI*2*j/72+tw*(0.5-u2); pts.push([R*Math.cos(a2),y2,R*Math.sin(a2)]); } line(pts,v,wht,i%4===0?0.2:0.09); }
    /* cap lip */
    if(g>0.95){ var lo=(g-0.95)/0.05; [top-0.01, top+LIP].forEach(function(y3){ pts=[]; for(j=0;j<=72;j++){ var a3=Math.PI*2*j/72; pts.push([(R+0.025)*Math.cos(a3),y3,(R+0.025)*Math.sin(a3)]); } line(pts,v,wht,0.22*lo); });
      pts=[]; for(j=0;j<=72;j++){ var a4=Math.PI*2*j/72; pts.push([R*0.98*Math.cos(a4),bot,R*0.98*Math.sin(a4)]); } line(pts,v,wht,0.18*lo); }
    /* the diagonal accent line wrapping the case */
    var L=Math.max(0,(g-0.4)/0.6); if(L>0){ pts=[]; var M=120; for(j=0;j<=M*L;j++){ var w=j/M; var y4=bot-0.12-(HH*0.62)*w; var a5=-0.6+Math.PI*1.15*w+tw*(0.5-(y4-top)/(bot-top)); pts.push([R*1.005*Math.cos(a5),y4,R*1.005*Math.sin(a5)]); }
      ctx.lineWidth=1.4; line(pts,v,acc,0.9); ctx.lineWidth=5; line(pts,v,acc,0.1); ctx.lineWidth=0.6; }
    if(!still) requestAnimationFrame(draw);
  }
  setInterval(function(){ var c=document.querySelector('.vq-hero .vq-wire'); if(c&&c!==cv){ cv=c; ctx=cv.getContext('2d'); fit(); requestAnimationFrame(draw); } }, 400);
})();
