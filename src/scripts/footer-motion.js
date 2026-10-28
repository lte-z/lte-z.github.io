// 子页面页脚使用 Home 相同的 72% 阅读线和页末可达性补偿。
// 主体项目继续使用页面加载淡入，不引入 Home 专有的 Timeline 控制器。
(()=>{
  const root=document.documentElement;
  const right=document.querySelector('.footer-right.reveal');
  const logo=document.getElementById('studio-trigger');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const READ_LINE=.72;
  const END_VISIBLE_PX=36;
  window.__footerMotionReady=true;
  clearTimeout(window.__footerBootFallback);
  if(!right||!logo){
    root.classList.remove('footer-prepared');
    window.footerLogoEntrance?.finish();
    return;
  }

  let rightStarted=false,logoStarted=false,frame=0,finished=false;
  const remainingScroll=()=>Math.max(0,document.documentElement.scrollHeight-(scrollY+innerHeight));
  // 与 Home 的 reachesReadingLine 保持相同判断：无法到达正常触发线时，
  // 一旦有足够的实际可见面积就开始，而不是等到页面最底部。
  function reachesReadingLine(r,remaining){
    if(r.bottom<=0||r.top>=innerHeight)return false;
    const line=innerHeight*READ_LINE;
    if(r.top<=line)return true;
    const unreachable=r.top-remaining>line+1;
    if(!unreachable)return remaining<=2;
    const visible=Math.min(r.bottom,innerHeight)-Math.max(r.top,0);
    return visible>=Math.min(END_VISIBLE_PX,r.height*.35);
  }
  function cleanup(){
    if(finished)return;
    finished=true;
    removeEventListener('scroll',schedule);
    removeEventListener('resize',schedule);
    removeEventListener('pageshow',schedule);
    document.removeEventListener('focusin',onFocus);
    document.removeEventListener('visibilitychange',onVisibility);
    reduced.removeEventListener?.('change',onReduced);
    if(frame){cancelAnimationFrame(frame);frame=0}
  }
  function revealRight(skip=false){
    if(rightStarted)return;
    rightStarted=true;
    if(skip){
      root.classList.remove('footer-prepared');
    }else{
      right.classList.add('is-visible');
      setTimeout(()=>{
        root.classList.remove('footer-prepared');
        right.classList.remove('is-visible');
      },1140);
    }
    if(logoStarted)cleanup();
  }
  function revealLogo(skip=false){
    if(logoStarted)return;
    logoStarted=true;
    if(skip)window.footerLogoEntrance?.finish();
    else window.footerLogoEntrance?.begin();
    if(rightStarted)cleanup();
  }
  function check(){
    frame=0;
    if(finished)return;
    if(reduced.matches){revealRight(true);revealLogo(true);return}
    const remaining=remainingScroll();
    if(!rightStarted){
      const r=right.getBoundingClientRect();
      if(r.bottom<=0)revealRight(true);
      else if(reachesReadingLine(r,remaining))revealRight();
    }
    if(!logoStarted){
      const r=logo.getBoundingClientRect();
      if(r.bottom<=0)revealLogo(true);
      else if(reachesReadingLine(r,remaining))revealLogo();
    }
  }
  function schedule(){if(!frame&&!finished)frame=requestAnimationFrame(check)}
  function onFocus(e){
    if(right.contains(e.target))revealRight(true);
    if(logo.contains(e.target))revealLogo(true);
  }
  function onVisibility(){if(!document.hidden)schedule()}
  function onReduced(){if(reduced.matches){revealRight(true);revealLogo(true)}}
  if(reduced.matches){revealRight(true);revealLogo(true);return}
  addEventListener('scroll',schedule,{passive:true});
  addEventListener('resize',schedule,{passive:true});
  addEventListener('pageshow',schedule);
  document.addEventListener('focusin',onFocus);
  document.addEventListener('visibilitychange',onVisibility);
  reduced.addEventListener?.('change',onReduced);
  schedule();
})();