function showErr(m){
  const e=document.getElementById('err');
  e.textContent='⚠ '+m;
  e.style.display='block';
}

function hideErr(){
  document.getElementById('err').style.display='none';
}

document.addEventListener('visibilitychange',()=>{
  if(document.hidden&&animRAF){
    cancelAnimationFrame(animRAF);
    animRAF=null;
  }else if(!document.hidden&&animOn&&linesOn){
    startAnimLoop();
  }
});
