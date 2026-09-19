function e(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}
async function loadNetworkCurrent(){
 const root=document.getElementById("networkCurrent"),meta=document.getElementById("networkCurrentMeta");
 try{
  const r=await fetch("data/network-current.json",{cache:"no-store"}); if(!r.ok)throw new Error();
  const d=await r.json();
  meta.textContent="最終確認日: "+d.last_reviewed+" ／ CURRENTは一次情報確認済み";
  root.innerHTML=d.items.map(x=>'<article class="current-card"><div><span class="media-type">'+e(x.label)+'</span><span class="checked">確認 '+e(x.checked)+'</span></div><h3>'+e(x.title)+'</h3><p>'+e(x.body)+'</p><a href="'+e(x.source_url)+'" target="_blank" rel="noopener">'+e(x.source_name)+' ↗</a></article>').join("");
 }catch(_){meta.textContent="CURRENT情報を読み込めませんでした。";root.innerHTML="";}
}
loadNetworkCurrent();