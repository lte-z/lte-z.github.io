// 共用指针目标，角色保留独立视线、节奏和反应。
(()=>{
  const scene=document.getElementById('hero-creatures');
  if(!scene)return;
  const stage=document.getElementById('creatures-layout');
  const bubble=document.getElementById('creature-speech');
  const reduced=matchMedia('(prefers-reduced-motion:reduce)');
  const DESIGN_WIDTH=450, FLOOR_Y=351, ATTENTION_GRACE_MS=2400;
  const RISE_HEIGHT=31, RISE_MS=425, LOWER_MS=435, MIN_STANDING_MS=740;
  const configs={
    tall:{follow:.052,limit:10.5,lean:1.25,blinkMin:5700,blinkMax:9400,doubleBlink:.04,pokeMs:410,eyeX:67.5,eyeY:96,svgW:132,svgH:300,lines:['...oh, hello.','I was thinking.','still here.','interesting.']},
    ochre:{follow:.12,limit:9.7,lean:1.5,blinkMin:3500,blinkMax:6800,doubleBlink:.13,pokeMs:380,eyeX:57,eyeY:85,svgW:112,svgH:240,lines:['did you see that?','hiya!','one more time?','look over there!']},
    rose:{follow:.23,limit:12,lean:2.15,blinkMin:2200,blinkMax:4900,doubleBlink:.27,pokeMs:350,eyeX:64.5,eyeY:98,svgW:128,svgH:178,lines:['hey!!','boop!','that tickles.','gotcha!']},
    sage:{follow:.078,limit:10.3,lean:1,blinkMin:4800,blinkMax:8400,doubleBlink:.11,pokeMs:470,eyeX:60,eyeY:96,svgW:118,svgH:177,lines:['oh!','who, me?','just looking.','what is that?']}
  };
  const creatures=[...scene.querySelectorAll('[data-creature]')].map(node=>{
    const id=node.dataset.creature;
    return {id,node,gaze:node.querySelector('.eye-gaze'),elevation:node.querySelector('.eye-elevation'),
      cfg:configs[id],gazeX:0,gazeY:0,lean:0,rise:0,
      blinkTimer:0,blinkEndTimer:0,pokeTimer:0,idleTimer:0,idleGaze:null,blink:false,poked:false};
  });
  const purple=creatures.find(c=>c.id==='tall');
  const pointer={x:0,y:0,known:false};
  const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
  const rand=(a,b)=>a+Math.random()*(b-a);
  let inView=true,enabled=!document.hidden;
  // 入场独立于注视和姿态；锁定期间不缓存点击。
  let entranceState=(reduced.matches||window.__motionBootAborted)?'ready':'pending';
  let entranceAnimations=[];
  let entranceCompletion=null;
  let entranceGeneration=0;
  const entryTimings={tall:[50,790],ochre:[145,730],rose:[260,670],sage:[335,680]};
  for(const c of creatures){
    c.pointerGestureReady=false;
    c.node.disabled=entranceState!=='ready';
  }
  if(entranceState!=='ready')scene.classList.add('scene-intro-locked');
  scene.dataset.entranceState=entranceState;
  const isReady=()=>entranceState==='ready';
  let frame=0,lastTime=0,peekRequested=false,hideBubbleTimer=0,attentionTimer=0;
  // 姿态独立于指针有效期；站起动作必须完整。
  const pose={phase:'resting',from:0,to:0,startedAt:0,standAt:0,pendingReset:false,holdTimer:0};
  let activeTouchId=null,activeSource=null,blockedTouchId=null;
  const animating=()=>enabled&&!reduced.matches&&isReady();

  // 身体与眼睛统一使用固定设计坐标。
  function fitScene(){
    const width=scene.getBoundingClientRect().width;
    scene.style.setProperty('--scene-scale',String(Math.min(1,width/DESIGN_WIDTH)));
    if(pointer.known&&(activeSource==='mouse'||activeTouchId!==null))updatePeek(pointer.x,pointer.y);
    queueFrame();
  }
  const sizeObserver=new ResizeObserver(fitScene);
  sizeObserver.observe(scene);
  fitScene();

  function queueFrame(){if(!frame&&animating())frame=requestAnimationFrame(update)}
  function gazeTarget(c){
    if(!pointer.known)return c.idleGaze||{x:0,y:0};
    const r=c.node.getBoundingClientRect();
    const x=r.left+(c.cfg.eyeX/c.cfg.svgW)*r.width;
    const y=r.top+((c.cfg.eyeY-(c.id==='tall'?c.rise:0))/c.cfg.svgH)*r.height;
    const dx=pointer.x-x,dy=pointer.y-y;
    const len=Math.hypot(dx,dy)||1;
    const amount=clamp(len/95,0,1)*c.cfg.limit;
    return {x:dx/len*amount,y:dy/len*amount};
  }
  function drawTallRise(amount){
    if(!purple)return;
    // 改变肩部高度，不拉伸眼睛或改变共同底边。
    const yTop=(15-amount).toFixed(2),yShoulder=(73-amount).toFixed(2);
    purple.node.querySelector('.body-shape').setAttribute('d',
      `M8 300V${yShoulder}Q8 ${yTop} 54 ${yTop}H87Q125 ${yTop} 125 ${yShoulder}V300Z`);
    purple.elevation.setAttribute('transform',`translate(0 ${(-amount).toFixed(2)})`);
  }
  function update(now){
    frame=0;
    if(!animating())return;
    const dt=clamp(now-(lastTime||now-16.7),8,48);
    lastTime=now;
    let moving=false;
    for(const c of creatures){
      const target=gazeTarget(c);
      const blend=1-Math.pow(1-c.cfg.follow,dt/16.7);
      c.gazeX+=(target.x-c.gazeX)*blend;
      c.gazeY+=(target.y-c.gazeY)*blend;
      // 睁眼、眨眼与受击表情共用注视偏移。
      c.gaze.setAttribute('transform',`translate(${c.gazeX.toFixed(2)} ${c.gazeY.toFixed(2)})`);
      const leanTarget=c.poked?0:target.x/c.cfg.limit*c.cfg.lean;
      c.lean+=(leanTarget-c.lean)*(1-Math.exp(-dt/(c.id==='tall'?200:130)));
      c.node.style.setProperty('--lean',`${c.lean.toFixed(2)}deg`);
      if(Math.abs(target.x-c.gazeX)+Math.abs(target.y-c.gazeY)+Math.abs(leanTarget-c.lean)>.08)moving=true;
    }
    if(updatePose(now))moving=true;
    if(moving)queueFrame();
  }

  function startPoseTransition(target,phase,now=performance.now()){
    clearTimeout(pose.holdTimer);pose.holdTimer=0;
    pose.from=purple.rise;
    pose.to=target;
    pose.startedAt=now;
    pose.phase=phase;
    queueFrame();
  }
  function scheduleLower(){
    clearTimeout(pose.holdTimer);pose.holdTimer=0;
    if(!pose.pendingReset||pose.phase!=='standing')return;
    const wait=Math.max(0,MIN_STANDING_MS-(performance.now()-pose.standAt));
    pose.holdTimer=setTimeout(()=>{
      pose.holdTimer=0;
      if(pose.pendingReset&&pose.phase==='standing')startPoseTransition(0,'lowering');
    },wait);
  }
  function requestStand(){
    pose.pendingReset=false;
    clearTimeout(pose.holdTimer);pose.holdTimer=0;
    if(pose.phase==='standing'||pose.phase==='rising')return;
    startPoseTransition(RISE_HEIGHT,'rising');
  }
  function requestRest(){
    pose.pendingReset=true;
    if(pose.phase==='standing')scheduleLower();
    // 站起进行中只记录复位意图，等动作完成并停留后再坐下。
    // 正在坐下或已经坐下时不重复发起过渡。
  }
  function updatePose(now){
    if(pose.phase!=='rising'&&pose.phase!=='lowering')return false;
    const duration=pose.phase==='rising'?RISE_MS:LOWER_MS;
    const t=clamp((now-pose.startedAt)/duration,0,1);
    const ease=t*t*(3-2*t);
    purple.rise=pose.from+(pose.to-pose.from)*ease;
    drawTallRise(purple.rise);
    if(t<1)return true;
    purple.rise=pose.to;
    pose.phase=pose.to>0?'standing':'resting';
    if(pose.phase==='standing'){
      pose.standAt=now;
      scheduleLower();
    }
    return false;
  }
  function resetPoseImmediately(){
    clearTimeout(pose.holdTimer);pose.holdTimer=0;
    pose.phase='resting';pose.pendingReset=false;pose.from=0;pose.to=0;
    purple.rise=0;
    drawTallRise(0);
    peekRequested=false;
  }

  function stopIdle(c){clearTimeout(c.idleTimer);c.idleTimer=0;c.idleGaze=null}
  function scheduleIdle(c,initial=false){
    clearTimeout(c.idleTimer);
    if(pointer.known||!animating())return;
    c.idleTimer=setTimeout(()=>{
      if(pointer.known||!animating())return;
      c.idleGaze={x:rand(-.65,.65)*c.cfg.limit,y:rand(-.42,.35)*c.cfg.limit};
      queueFrame();
      c.idleTimer=setTimeout(()=>{
        c.idleGaze=null;queueFrame();scheduleIdle(c);
      },rand(1050,2050));
    },initial?rand(600,1900):rand(2400,5000));
  }
  function startIdle(){
    if(pointer.known||!animating())return;
    for(const c of creatures)scheduleIdle(c,true);
    queueFrame();
  }
  function aim(x,y){
    clearTimeout(attentionTimer);attentionTimer=0;
    if(!pointer.known)for(const c of creatures)stopIdle(c);
    pointer.x=x;pointer.y=y;pointer.known=true;
    queueFrame();
  }
  function expireAttention(){
    clearTimeout(attentionTimer);attentionTimer=0;
    if(!pointer.known)return;
    pointer.known=false;activeSource=null;
    setPeek(false);
    startIdle();
  }
  function releaseAttention(){
    clearTimeout(attentionTimer);
    if(pointer.known)attentionTimer=setTimeout(expireAttention,ATTENTION_GRACE_MS);
  }
  function invalidateAttention(){
    clearTimeout(attentionTimer);attentionTimer=0;
    pointer.known=false;activeSource=null;activeTouchId=null;blockedTouchId=null;
  }
  function setPeek(shouldRise){
    if(peekRequested===shouldRise)return;
    peekRequested=shouldRise;
    if(shouldRise)requestStand();
    else requestRest();
  }
  function updatePeek(x,y){
    if(!isReady()||!animating()||!inView){setPeek(false);return}
    const r=stage.getBoundingClientRect();
    const scale=r.width/DESIGN_WIDTH;
    const floor=r.top+FLOOR_Y*scale;
    // 严格按照角色实际底边以下的指针位置判断。
    const margin=peekRequested?4:12;
    const nearScene=x>=r.left+25*scale&&x<=r.right-20*scale;
    const floorVisible=floor>=0&&floor<=window.innerHeight-8;
    setPeek(floorVisible&&nearScene&&y>floor+margin);
  }

  // 鼠标静止仍有效；离开页面后失去目标。
  function onPointerMove(e){
    if(e.pointerType==='touch')return;
    if(activeTouchId!==null)return;
    activeSource='mouse';
    aim(e.clientX,e.clientY);
    updatePeek(e.clientX,e.clientY);
  }
  function onPointerExit(){
    // 离开窗口后短暂保留最后注视位置。
    activeSource=null;
    releaseAttention();
  }
  function onFocusLost(){
    invalidateAttention();
    setPeek(false);
    startIdle();
  }
  function findTouch(list,id){
    for(let i=0;i<list.length;i++)if(list[i].identifier===id)return list[i];
    return null;
  }
  function onTouchStart(e){
    if(activeTouchId!==null||!e.changedTouches.length)return;
    const t=e.changedTouches[0];
    if(!isReady())blockedTouchId=t.identifier;
    activeTouchId=t.identifier;
    activeSource='touch';
    aim(t.clientX,t.clientY);
    updatePeek(t.clientX,t.clientY);
  }
  function onTouchMove(e){
    if(activeTouchId===null)return;
    const t=findTouch(e.touches,activeTouchId);
    if(!t||!isReady()||blockedTouchId===activeTouchId)return;
    // 被动监听触摸移动，不干扰原生滚动。
    aim(t.clientX,t.clientY);
    updatePeek(t.clientX,t.clientY);
  }
  function onTouchEnd(e){
    if(activeTouchId===null||!findTouch(e.changedTouches,activeTouchId))return;
    if(blockedTouchId===activeTouchId){blockedTouchId=null;invalidateAttention();}
    activeTouchId=null;
    releaseAttention();
  }
  function onScroll(){
    // 滚动时使用最新场景位置重新判断。
    if(pointer.known&&(activeSource==='mouse'||activeTouchId!==null)){
      updatePeek(pointer.x,pointer.y);
      queueFrame();
    }
  }

  function mode(c){
    c.node.classList.toggle('is-poked',c.poked);
    c.node.classList.toggle('is-blinking',c.blink&&!c.poked);
  }
  function stopBlink(c){clearTimeout(c.blinkTimer);clearTimeout(c.blinkEndTimer);c.blink=false;mode(c)}
  function scheduleBlink(c){clearTimeout(c.blinkTimer);if(animating())c.blinkTimer=setTimeout(()=>blink(c),rand(c.cfg.blinkMin,c.cfg.blinkMax))}
  function blink(c){
    if(!animating()||c.poked){scheduleBlink(c);return}
    c.blink=true;mode(c);
    clearTimeout(c.blinkEndTimer);
    c.blinkEndTimer=setTimeout(()=>{
      c.blink=false;mode(c);
      if(Math.random()<c.cfg.doubleBlink)c.blinkTimer=setTimeout(()=>blink(c),rand(130,230));
      else scheduleBlink(c);
    },rand(100,155));
  }
  function speak(c){
    const choices=c.cfg.lines.filter(x=>x!==bubble.textContent);
    const lines=choices.length?choices:c.cfg.lines;
    bubble.textContent=lines[Math.floor(Math.random()*lines.length)];
    const r=c.node.getBoundingClientRect(),s=stage.getBoundingClientRect();
    const scale=s.width/DESIGN_WIDTH;
    const width=bubble.offsetWidth,height=bubble.offsetHeight;
    const onRight=r.left+r.width*.5<s.left+s.width*.54;
    const desired=onRight?(r.right-s.left)/scale+width*.5+9:(r.left-s.left)/scale-width*.5-9;
    const x=clamp(desired,width*.5+7,DESIGN_WIDTH-width*.5-7);
    const y=clamp((r.top-s.top+r.height*.16)/scale,5,370-height-6);
    bubble.style.left=`${x.toFixed(1)}px`;
    bubble.style.top=`${y.toFixed(1)}px`;
    bubble.classList.add('is-visible');
    clearTimeout(hideBubbleTimer);
    hideBubbleTimer=setTimeout(()=>bubble.classList.remove('is-visible'),2500);
  }
  function poke(c){
    if(!isReady())return;
    clearTimeout(c.pokeTimer);clearTimeout(c.blinkTimer);clearTimeout(c.blinkEndTimer);
    c.poked=true;c.blink=false;mode(c);speak(c);queueFrame();
    window.creatureAudio?.play(c.id);
    c.pokeTimer=setTimeout(()=>{c.poked=false;mode(c);scheduleBlink(c);queueFrame()},c.cfg.pokeMs);
  }
  window.addEventListener('pointermove',onPointerMove,{passive:true});
  document.documentElement.addEventListener('pointerleave',onPointerExit,{passive:true});
  window.addEventListener('blur',onFocusLost);
  window.addEventListener('touchstart',onTouchStart,{passive:true});
  window.addEventListener('touchmove',onTouchMove,{passive:true});
  window.addEventListener('touchend',onTouchEnd,{passive:true});
  window.addEventListener('touchcancel',onTouchEnd,{passive:true});
  window.addEventListener('scroll',onScroll,{passive:true});
  for(const c of creatures){
    // 锁定期间开始的手势在入场结束后也不能触发点击。
    c.node.addEventListener('pointerdown',()=>{c.pointerGestureReady=isReady()},{passive:true});
    c.node.addEventListener('click',e=>{
      const keyboardActivation=e.detail===0;
      const accept=isReady()&&(keyboardActivation||c.pointerGestureReady);
      c.pointerGestureReady=false;
      if(!accept){e.preventDefault();return}
      poke(c);
    });
  }

  function finishEntrance(){
    if(isReady())return;
    entranceGeneration++;
    for(const anim of entranceAnimations)anim.cancel();
    entranceAnimations=[];
    entranceState='ready';scene.dataset.entranceState='ready';
    scene.classList.remove('scene-intro-locked');
    for(const c of creatures){c.node.disabled=false;c.pointerGestureReady=false;}
    // 入场期间的坐标可供注视使用，但不补触发受击。
    if(enabled&&isReady()){for(const c of creatures)scheduleBlink(c);startIdle();queueFrame()}
    if(entranceCompletion){entranceCompletion();entranceCompletion=null}
  }
  function beginEntrance(){
    if(entranceState!=='pending')return Promise.resolve();
    if(reduced.matches||document.hidden){finishEntrance();return Promise.resolve()}
    entranceState='entering';scene.dataset.entranceState='entering';
    const generation=++entranceGeneration;
    const finished=new Promise(resolve=>{entranceCompletion=resolve});
    for(const c of creatures){
      const [delay,duration]=entryTimings[c.id];
      const depth=parseFloat(getComputedStyle(c.node).getPropertyValue('--entry-depth'))||c.node.offsetHeight;
      const animation=c.node.animate([
        {transform:`translateY(${depth}px)`},
        {transform:'translateY(0px)'}
      ],{duration,delay,easing:'cubic-bezier(.2,.75,.2,1)',fill:'both'});
      entranceAnimations.push(animation);
    }
    Promise.allSettled(entranceAnimations.map(a=>a.finished)).then(()=>{
      if(generation===entranceGeneration)finishEntrance();
    });
    return finished;
  }
  window.creatureEntrance={begin:beginEntrance,finish:finishEntrance,get state(){return entranceState}};

  const observer=new IntersectionObserver(entries=>{
    inView=entries.some(e=>e.isIntersecting);
    enabled=inView&&!document.hidden;
    if(enabled&&isReady()){for(const c of creatures)scheduleBlink(c);startIdle();queueFrame()}
    else{
      setPeek(false);
      for(const c of creatures){stopBlink(c);stopIdle(c)}
      cancelAnimationFrame(frame);frame=0;
    }
  },{threshold:.02});
  observer.observe(scene);
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden){
      // 手机切回前台时保留尚未开始的入场。
      if(entranceState==='entering')finishEntrance();
      invalidateAttention();resetPoseImmediately();
    }
    enabled=inView&&!document.hidden;
    if(enabled&&isReady()){for(const c of creatures)scheduleBlink(c);startIdle();queueFrame()}
    else{
      for(const c of creatures){stopBlink(c);stopIdle(c)}
      cancelAnimationFrame(frame);frame=0;
    }
  });
  reduced.addEventListener('change',()=>{
    for(const c of creatures){stopBlink(c);stopIdle(c)}
    if(!reduced.matches){if(isReady()){for(const c of creatures)scheduleBlink(c);startIdle();queueFrame()}}
    else{
      finishEntrance();invalidateAttention();cancelAnimationFrame(frame);frame=0;resetPoseImmediately();
      for(const c of creatures){c.node.style.setProperty('--lean','0deg');c.gaze.removeAttribute('transform')}
    }
  });
})();