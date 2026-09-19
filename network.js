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
async function loadNetworkWatch(){
 try{
  const r=await fetch("data/network-watch.json",{cache:"no-store"}); if(!r.ok)return;
  const d=await r.json(); const changed=(d.sources||[]).filter(x=>x.changed);
  if(!changed.length)return;
  const section=document.getElementById("current"); if(!section)return;
  const alert=document.createElement("div"); alert.className="source-change-alert";
  alert.innerHTML="<b>一次情報の変更を検知しました</b><p>"+changed.map(x=>e(x.name)).join(" / ")+" に変更があります。内容確認が終わるまで、CURRENTの記述は前回確認時点の情報として扱ってください。</p>";
  section.insertBefore(alert,document.getElementById("networkCurrentMeta"));
 }catch(_){}
}
loadNetworkWatch();