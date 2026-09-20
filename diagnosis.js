const QUICK_IDS=["A01","A10","A12","A17","A19","A24","A30","A31","A36","A40","A43","A47"];
let all=[],active=[],answers={},idx=0,mode="quick";
const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
async function loadData(){
 const parts=await Promise.all([1,2,3,4].map(n=>fetch("data/diagnosis-a48-"+n+".json",{cache:"no-store"}).then(r=>{if(!r.ok)throw new Error();return r.json()})));
 all=parts.flat();
}
function sameSet(a,b){return a.length===b.length&&[...a].sort().every((v,i)=>v===[...b].sort()[i])}
function statusFor(q,a){if(!q.auto_score)return "SELF"; const ok=sameSet(a.selected||[],q.correct); if(ok)return a.confidence==="sure"?"SOLID":"FUZZY"; return a.confidence==="sure"?"MISCONCEPTION":"GAP"}
function start(which){
 mode=which; active=which==="quick"?QUICK_IDS.map(id=>all.find(q=>q.id===id)):all.slice();
 answers={};idx=0; $("#diagnosisStart").hidden=true;$("#diagnosisResult").hidden=true;$("#diagnosisRun").hidden=false;renderQuestion();window.scrollTo({top:$("#diagnosisRun").offsetTop-80,behavior:"smooth"});
}
function renderQuestion(){
 const q=active[idx],a=answers[q.id]||{selected:[],confidence:"",note:""};
 $("#diagMode").textContent=(mode==="quick"?"クイック12問":"総合48問")+" ／ "+q.set_name;
 $("#diagProgressText").textContent=(idx+1)+" / "+active.length+"　"+q.domain+"　｜　"+q.cognition;
 $("#diagProgressBar").style.width=((idx+1)/active.length*100)+"%";
 const multi=q.form.includes("複数"), written=!q.options.length;
 let body='<article class="diag-question"><div class="diag-qmeta"><span>Q'+q.number+'</span><span>'+esc(q.form)+'</span></div><h3>'+esc(q.title)+'</h3><p class="diag-prompt">'+esc(q.prompt).replace(/\n/g,"<br>")+'</p>';
 if(written){
   body+='<label class="diag-written"><span>あなたの考え</span><textarea id="writtenAnswer" rows="10" placeholder="5つの観点について、自分の言葉で整理してください。">'+esc(a.note)+'</textarea></label>';
 }else{
   body+='<div class="diag-options">'+q.options.map(([v,l])=>'<label><input type="'+(multi?"checkbox":"radio")+'" name="choice" value="'+v+'" '+(a.selected.includes(v)?"checked":"")+'><span><b>'+v+'.</b> '+esc(l)+'</span></label>').join("")+'</div>';
   if(q.form.includes("短答"))body+='<label class="diag-written compact"><span>考え方メモ（任意・自動採点対象外）</span><textarea id="writtenAnswer" rows="3">'+esc(a.note)+'</textarea></label>';
 }
 body+='<fieldset class="confidence"><legend>この回答への確信度</legend><label><input type="radio" name="confidence" value="sure" '+(a.confidence==="sure"?"checked":"")+'>確信している</label><label><input type="radio" name="confidence" value="unsure" '+(a.confidence==="unsure"?"checked":"")+'>迷いがある</label><label><input type="radio" name="confidence" value="guess" '+(a.confidence==="guess"?"checked":"")+'>勘・ほぼ分からない</label></fieldset><p id="diagError" class="diag-error" hidden></p><div class="diag-nav">'+(idx?'<button id="prevQ" class="button" type="button">← 前へ</button>':'<span></span>')+'<button id="nextQ" class="button primary" type="button">'+(idx===active.length-1?"診断結果を見る":"次へ →")+'</button></div></article>';
 $("#diagnosisQuestion").innerHTML=body;
 $("#prevQ")?.addEventListener("click",()=>{saveCurrent(false);idx--;renderQuestion()});
 $("#nextQ").addEventListener("click",next);
}
function saveCurrent(validate=true){
 const q=active[idx],selected=[...document.querySelectorAll('input[name="choice"]:checked')].map(x=>x.value),conf=document.querySelector('input[name="confidence"]:checked')?.value||"",note=$("#writtenAnswer")?.value||"";
 if(validate){
   if(q.options.length&&!selected.length){showErr("回答を選んでください。");return false}
   if(!q.options.length&&!note.trim()){showErr("記述欄に回答してください。");return false}
   if(!conf){showErr("確信度を選んでください。");return false}
 }
 answers[q.id]={selected,confidence:conf,note};return true;
}
function showErr(s){const e=$("#diagError");e.textContent=s;e.hidden=false}
function next(){if(!saveCurrent(true))return;if(idx<active.length-1){idx++;renderQuestion();window.scrollTo({top:$("#diagnosisRun").offsetTop-70,behavior:"smooth"})}else showResult()}
function learningLink(q){
 const securityDomains=["暗号","公開鍵暗号","電子署名","完全性・ハッシュ","TLS・証明書","ID・アクセス管理","セキュリティ","認証・サービス評価"];
 if(q.set===2)return '<a href="network.html">ネットワーク基礎体力で学ぶ →</a>';
 if(securityDomains.includes(q.domain))return '<a href="security.html">セキュリティ基礎体力で学ぶ →</a>';
 return "";
}
function showResult(){
 $("#diagnosisRun").hidden=true;$("#diagnosisResult").hidden=false;
 const scored=active.filter(q=>q.auto_score), rows=scored.map(q=>({q,a:answers[q.id],status:statusFor(q,answers[q.id])}));
 const counts={SOLID:0,FUZZY:0,GAP:0,MISCONCEPTION:0};rows.forEach(x=>counts[x.status]++);
 $("#resultSummary").innerHTML='<div class="result-status-grid">'+["SOLID","FUZZY","GAP","MISCONCEPTION"].map(k=>'<div class="result-status '+k.toLowerCase()+'"><b>'+k+'</b><strong>'+counts[k]+'</strong><span>'+({SOLID:"定着",FUZZY:"曖昧",GAP:"未形成",MISCONCEPTION:"誤概念候補"}[k])+'</span></div>').join("")+'</div><p class="result-reading">正答数だけではなく、<b>FUZZY</b> と <b>MISCONCEPTION</b> を優先して見てください。正解していても迷った知識は、別の場面で使えない可能性があります。</p>';
 const groups=[...new Set(scored.map(q=>q.set))].map(n=>({n,name:scored.find(q=>q.set===n).set_name,rows:rows.filter(x=>x.q.set===n)}));
 $("#resultSets").innerHTML='<div class="result-set-grid">'+groups.map(g=>{const c={SOLID:0,FUZZY:0,GAP:0,MISCONCEPTION:0};g.rows.forEach(x=>c[x.status]++);return '<article><span>SET '+g.n+'</span><h3>'+esc(g.name)+'</h3><p>SOLID '+c.SOLID+' ／ FUZZY '+c.FUZZY+' ／ GAP '+c.GAP+' ／ MISCONCEPTION '+c.MISCONCEPTION+'</p></article>'}).join("")+'</div>';
 const review=rows.filter(x=>x.status!=="SOLID");
 let html='<h3 class="review-title">確認したい問題</h3>';
 if(!review.length)html+='<p>自動採点対象はすべてSOLIDでした。別の場面へ転移できるか、総合診断や学習ページで確認してみてください。</p>';
 else html+='<div class="review-list">'+review.map(x=>'<details class="review-item '+x.status.toLowerCase()+'"><summary><b>'+x.status+'</b><span>Q'+x.q.number+' '+esc(x.q.title)+'</span></summary><div><p><strong>正答：</strong>'+x.q.correct.join("・")+'</p><p>'+esc(x.q.key_explanation)+'</p><p class="school-link">'+esc(x.q.school_connection)+'</p>'+learningLink(x.q)+'</div></details>').join("")+'</div>';
 const q48=active.find(q=>q.id==="A48");
 if(q48&&answers.A48){html+='<div class="rubric-box"><p class="eyebrow">Q48 SELF REVIEW</p><h3>総合記述の自己確認</h3><p>Q48は自動採点しません。自分の記述と観点例を照らし合わせてください。</p><pre>'+esc(q48.rubric)+'</pre></div>'}
 $("#resultReview").innerHTML=html;window.scrollTo({top:$("#diagnosisResult").offsetTop-70,behavior:"smooth"});
}
$("#startQuick").addEventListener("click",()=>start("quick"));
$("#startFull").addEventListener("click",()=>start("full"));
$("#quitDiagnosis").addEventListener("click",()=>{$("#diagnosisRun").hidden=true;$("#diagnosisStart").hidden=false});
$("#retryDiagnosis").addEventListener("click",()=>start(mode));
loadData().catch(()=>{$("#diagnosisStart").innerHTML='<p>診断データを読み込めませんでした。少し時間をおいて再読み込みしてください。</p>'});