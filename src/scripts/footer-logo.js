(()=>{
const copyright=document.getElementById('footer-copyright');
if(copyright){
  const year=Math.max(2026,new Date().getFullYear());
  copyright.textContent=`© ${year===2026?'2026':`2026–${year}`} lte_z. All rights reserved.`;
}
const doc=document;
const trigger=doc.querySelector('#studio-trigger');
const mark=trigger.querySelector('.studio-mark');
const logoLines=[...mark.querySelectorAll('.logo-geometry .mark-path')];
const otherLines=[...mark.querySelectorAll('.alt-geometry .mark-path')];
const allLines=[...logoLines,...otherLines];
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const hoverFine=matchMedia('(hover:hover) and (pointer:fine)');
const ease='cubic-bezier(.28,.74,.24,1)';
let requestId=0, alternate=false, initialized=false, introDone=false, activeAnimations=[],introFallback=0;
if(!reduced.matches)trigger.disabled=true;
for(const line of allLines){
  const length=line.getTotalLength();
  line.dataset.len=String(length);
  line.style.strokeDasharray=String(length+0.02);
  line.style.strokeDashoffset=String(length);
  line.style.opacity='0';
}
function setVisual(alt){
  for(const line of logoLines){line.style.strokeDashoffset=alt?line.dataset.len:'0';line.style.opacity=alt?'0':'1'}
  for(const line of otherLines){line.style.strokeDashoffset=alt?'0':line.dataset.len;line.style.opacity=alt?'1':'0'}
}
function haltAnimations(){
  // 取消动画前保留当前的实际路径位置。
  for(const anim of activeAnimations){
    const line=anim.effect?.target;
    if(line){
      const current=getComputedStyle(line).strokeDashoffset;
      if(Number.isFinite(parseFloat(current)))line.style.strokeDashoffset=current;
      line.style.opacity=getComputedStyle(line).opacity;
    }
    anim.cancel();
  }
  activeAnimations=[];
}
async function groupDraw(lines,show,speed=1){
  const endPromises=[];
  for(const line of lines){
    const length=Number(line.dataset.len);
    const begin=parseFloat(getComputedStyle(line).strokeDashoffset);
    const from=Number.isFinite(begin)?begin:length;
    const to=show?0:length;
    if(Math.abs(from-to)<.02){line.style.strokeDashoffset=String(to);line.style.opacity=show?'1':'0';continue}
    const delay=show?Number(line.dataset.delay)*speed:0;
    const duration=(show?Number(line.dataset.duration):420)*speed;
    const startOpacity=parseFloat(getComputedStyle(line).opacity);
    const frames=show?[
      {strokeDashoffset:String(from),opacity:String(startOpacity),offset:0},
      {strokeDashoffset:String(from+(to-from)*.045),opacity:'1',offset:.045},
      {strokeDashoffset:String(to),opacity:'1',offset:1}
    ]:[
      {strokeDashoffset:String(from),opacity:String(startOpacity),offset:0},
      {strokeDashoffset:String(from+(to-from)*.95),opacity:'1',offset:.95},
      {strokeDashoffset:String(to),opacity:'0',offset:1}
    ];
    const a=line.animate(frames,{delay,duration,easing:ease,fill:'forwards'});
    activeAnimations.push(a);
    endPromises.push(a.finished.catch(()=>{}).then(()=>{
      if(a.playState==='finished'){
        line.style.strokeDashoffset=String(to);
        line.style.opacity=show?'1':'0';
        a.cancel();
      }
    }));
  }
  await Promise.all(endPromises);
  activeAnimations=activeAnimations.filter(a=>a.playState==='running');
}
async function transition(toAlt,{intro=false}={}){
  const mine=++requestId;
  haltAnimations();
  alternate=toAlt;
  if(reduced.matches){setVisual(toAlt);return}
  if(intro){
    for(const p of allLines){p.style.strokeDashoffset=p.dataset.len;p.style.opacity='0'}
    await groupDraw(logoLines,true,.86);
    return;
  }
  // 中断时先收回未完成的笔画，再开始新状态。
  await Promise.all([groupDraw(logoLines,false,.85),groupDraw(otherLines,false,.85)]);
  if(requestId!==mine)return;
  await groupDraw(toAlt?otherLines:logoLines,true,toAlt?.82:.76);
}
function finishEntrance(){
  clearTimeout(introFallback);introFallback=0;
  ++requestId;haltAnimations();
  initialized=true;introDone=true;
  setVisual(false);
  trigger.disabled=false;
}
function beginEntrance(){
  if(initialized)return;
  initialized=true;
  if(reduced.matches||document.hidden){finishEntrance();return}
  introFallback=setTimeout(finishEntrance,2300);
  void transition(false,{intro:true}).then(()=>{
    if(!introDone){clearTimeout(introFallback);introFallback=0;introDone=true;trigger.disabled=false}
  }).catch(finishEntrance);
}
if(reduced.matches)finishEntrance();
// Logo 使用与正文一致的阅读触发线。
window.footerLogoEntrance={begin:beginEntrance,finish:finishEntrance};
trigger.addEventListener('pointerenter',()=>{
  if(introDone&&hoverFine.matches)void transition(true)
});
trigger.addEventListener('pointerleave',()=>{
  if(introDone&&hoverFine.matches)void transition(false)
});
trigger.addEventListener('focus',()=>{
  if(introDone&&trigger.matches(':focus-visible'))void transition(true)
});
trigger.addEventListener('blur',()=>{if(introDone)void transition(false)});
trigger.addEventListener('click',()=>{
  if(!introDone)return;
  // 触摸和键盘也可触发悬停彩蛋。
  if(!hoverFine.matches)void transition(!alternate);
  else if(!alternate)void transition(false,{intro:true});
});
reduced.addEventListener('change',()=>{
  if(!introDone){finishEntrance();return}
  ++requestId;haltAnimations();setVisual(alternate)
});

})();