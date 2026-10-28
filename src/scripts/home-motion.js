// 全页入场：统一阅读触发线、末尾可达性补偿及一次性状态。
(()=>{
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const root=document.documentElement;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const READ_LINE=.72;
  const END_VISIBLE_PX=36; // Only when a group cannot physically reach the normal line.
  const entries=[...document.querySelectorAll('.reveal')].map(node=>({node,state:'pending',timer:0}));
  const scene=document.getElementById('hero-creatures');
  const logo=document.getElementById('studio-trigger');
  const timeline=document.querySelector('.timeline');
  const dots=[...timeline.querySelectorAll('.dot')];
  const items=[...timeline.querySelectorAll('li')];
  const introAnimations=[];
  let sceneStarted=false,logoStarted=false,raf=0,last=0,finished=false;
  let lastBeyondStart=-Infinity,footerWake=0;
  let lineTop=10,lineSpan=1,lineTarget=0,lineDisplay=0,lineDone=false;

  function timelineGeometry(){
    const rect=timeline.getBoundingClientRect();
    const centers=dots.map(dot=>{
      const r=dot.getBoundingClientRect();
      return r.top+r.height/2-rect.top;
    });
    lineTop=centers[0];lineSpan=Math.max(1,centers.at(-1)-lineTop);
    timeline.style.setProperty('--line-top',`${lineTop.toFixed(2)}px`);
    timeline.style.setProperty('--line-span',`${lineSpan.toFixed(2)}px`);
  }
  function paintLine(){
    timeline.style.setProperty('--line-filled',`${lineDisplay.toFixed(2)}px`);
    const timelineRect=timeline.getBoundingClientRect();
    dots.forEach((dot,i)=>{
      const r=dot.getBoundingClientRect();
      const offset=r.top+r.height/2-timelineRect.top-lineTop;
      if(lineDisplay>=offset-.3)items[i].classList.add('reached');
    });
  }
  function finishLine(){
    lineDone=true;lineTarget=lineSpan;lineDisplay=lineSpan;paintLine();
  }
  function finishReveal(entry){
    if(entry.state==='ready')return;
    clearTimeout(entry.timer);entry.timer=0;
    entry.state='ready';
    entry.node.classList.remove('will-reveal','is-visible');
    // 超时完成后仍需调度监听器清理。
    schedule();
  }
  function beginReveal(entry){
    if(entry.state!=='pending')return;
    entry.state='entering';
    if(entry.node.closest('.beyond'))lastBeyondStart=performance.now();
    entry.node.classList.add('is-visible');
    // 明确结束状态，不依赖 transitionend。
    entry.timer=setTimeout(()=>finishReveal(entry),entry.node.classList.contains('footer-right')?1140:entry.node.classList.contains('reveal--stagger')?1020:900);
  }
  function remainingScroll(){
    return Math.max(0,document.documentElement.scrollHeight-(scrollY+innerHeight));
  }
  // 页尾无法达到阅读线时，按实际可见区域提前触发。
  function reachesReadingLine(r,remaining){
    if(r.bottom<=0||r.top>=innerHeight)return false;
    const line=innerHeight*READ_LINE;
    if(r.top<=line)return true;
    const unreachable=r.top-remaining>line+1;
    if(!unreachable)return remaining<=2;
    const visible=Math.min(r.bottom,innerHeight)-Math.max(r.top,0);
    return visible>=Math.min(END_VISIBLE_PX,r.height*.35);
  }
  function footerCanBegin(){
    const remaining=Math.max(0,lastBeyondStart+220-performance.now());
    if(remaining<=0)return true;
    if(!footerWake)footerWake=setTimeout(()=>{footerWake=0;schedule()},remaining+5);
    return false;
  }
  function measureEntrances(){
    const remaining=remainingScroll();
    for(const entry of entries){
      if(entry.state!=='pending')continue;
      const r=entry.node.getBoundingClientRect();
      if(r.bottom<=0){finishReveal(entry);continue}
      if(reachesReadingLine(r,remaining)){
        if(entry.node.classList.contains('footer-right')&&!footerCanBegin())continue;
        beginReveal(entry);
      }
    }
    if(!sceneStarted){
      const r=scene.getBoundingClientRect();
      if(r.bottom<=0){sceneStarted=true;window.creatureEntrance?.finish()}
      else if(reachesReadingLine(r,remaining)){
        sceneStarted=true;
        void window.creatureEntrance?.begin();
      }
    }else if(window.creatureEntrance?.state==='entering'&&scene.getBoundingClientRect().bottom<=0){
      // 快速跳过场景时确保角色不会继续隐藏或锁定。
      window.creatureEntrance.finish();
    }
    if(!logoStarted){
      const r=logo.getBoundingClientRect();
      if(r.bottom<=0){logoStarted=true;window.footerLogoEntrance?.finish()}
      else if(reachesReadingLine(r,remaining)&&footerCanBegin()){
        logoStarted=true;window.footerLogoEntrance?.begin();
      }
    }
  }
  function measureTimeline(){
    if(lineDone)return;
    const rect=timeline.getBoundingClientRect();
    if(rect.bottom<=0){finishLine();return}
    const remaining=remainingScroll();
    const normalLine=innerHeight*READ_LINE;
    const finalDotTop=rect.top+lineTop+lineSpan-remaining;
    // 末端节点到不了阅读线时平滑完成，不在页底突然跳变。
    const readingLine=Math.max(normalLine,Math.min(innerHeight-16,finalDotTop));
    const progress=clamp((readingLine-(rect.top+lineTop))/lineSpan,0,1);
    lineTarget=Math.max(lineTarget,progress*lineSpan);
  }
  function tick(time){
    raf=0;
    const dt=clamp(time-(last||time-16.7),8,48);last=time;
    measureEntrances();measureTimeline();
    if(!lineDone&&lineTarget>lineDisplay){
      lineDisplay=Math.min(lineSpan,lineDisplay+(lineTarget-lineDisplay)*(1-Math.exp(-dt/82)));
      if(lineTarget-lineDisplay<.3)lineDisplay=lineTarget;
      paintLine();
      if(lineTarget>=lineSpan-.2&&lineDisplay>=lineSpan-.2)finishLine();
      else if(lineTarget-lineDisplay>.2)schedule();
    }
    if(entries.every(e=>e.state==='ready')&&sceneStarted&&logoStarted&&lineDone&&!finished){
      finished=true;
      removeEventListener('scroll',schedule);
      removeEventListener('resize',resize);
      document.removeEventListener('focusin',onFocusIn);
      clearTimeout(footerWake);footerWake=0;
    }
  }
  function schedule(){if(!raf&&!finished)raf=requestAnimationFrame(tick)}
  function resize(){
    const previousSpan=lineSpan;
    const progress=previousSpan>0?lineDisplay/previousSpan:0;
    timelineGeometry();
    if(lineDone||reduced.matches){finishLine();return}
    lineTarget=Math.min(lineTarget,lineSpan);
    lineDisplay=clamp(progress*lineSpan,0,lineSpan);
    paintLine();schedule();
  }
  function playHero(){
    const timing={hello:[45,530],wordmark:[170,690],description:[370,620],contact:[570,530]};
    for(const node of document.querySelectorAll('[data-intro]')){
      const [delay,duration]=timing[node.dataset.intro];
      if(typeof node.animate!=='function')continue;
      const animation=node.animate([
        {opacity:.06,transform:'translateY(9px)'},
        {opacity:1,transform:'translateY(0px)'}
      ],{delay,duration,easing:'cubic-bezier(.22,.8,.26,1)',fill:'both'});
      introAnimations.push(animation);
      animation.finished.then(()=>animation.cancel()).catch(()=>{});
    }
  }
  function skipAll(){
    for(const animation of introAnimations){
      try{animation.finish();animation.cancel()}catch{}
    }
    for(const entry of entries)finishReveal(entry);
    window.creatureEntrance?.finish();
    window.footerLogoEntrance?.finish();
    sceneStarted=true;logoStarted=true;
    finishLine();
    root.classList.remove('motion-ready','motion-boot');
    clearTimeout(window.__motionBootFallback);window.__motionBootFallback=0;
    if(raf){cancelAnimationFrame(raf);raf=0}
    clearTimeout(footerWake);footerWake=0;
    if(!finished){
      finished=true;
      removeEventListener('scroll',schedule);
      removeEventListener('resize',resize);
      document.removeEventListener('focusin',onFocusIn);
    }
  }
  timelineGeometry();
  // 入场完成后仍维护几何；观察条目能捕捉字体和换行导致的内部变化。
  const geometryObserver=new ResizeObserver(resize);
  geometryObserver.observe(timeline);
  items.forEach(item=>geometryObserver.observe(item));
  document.fonts?.ready.then(resize).catch(()=>{});
  window.addEventListener('pageshow',()=>{last=0;resize()});
  if(reduced.matches||window.__motionBootAborted||!('requestAnimationFrame' in window)){
    skipAll();return;
  }
  // 所有内容组共用入场规则，包括初始可见内容。
  for(const entry of entries){
    const r=entry.node.getBoundingClientRect();
    if(r.bottom<=0)entry.state='ready';
    else entry.node.classList.add('will-reveal');
  }
  root.classList.add('motion-ready');
  playHero();
  // 首帧入场状态准备好后才解除启动标记。
  root.classList.remove('motion-boot');
  clearTimeout(window.__motionBootFallback);
  window.__motionBootFallback=0;
  window.addEventListener('scroll',schedule,{passive:true});
  window.addEventListener('resize',resize,{passive:true});
  function onFocusIn(e){
    const node=e.target.closest('.reveal');
    const entry=entries.find(item=>item.node===node);
    if(entry)finishReveal(entry);
  }
  document.addEventListener('focusin',onFocusIn);
  // 页面隐藏不提前完成后续 Reveal，保留待触发状态。
  document.addEventListener('visibilitychange',()=>{
    if(!document.hidden){last=0;schedule()}
  });
  reduced.addEventListener('change',()=>{if(reduced.matches)skipAll()});
  schedule();
})();