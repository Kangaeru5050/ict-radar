const QUICK_IDS=["A01","A10","A12","A17","A19","A24","A30","A31","A36","A40","A43","A47"];
let all=[],bAll=[],active=[],answers={},idx=0,mode="quick";
const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
async function loadData(){
 const [parts,b]=await Promise.all([
   Promise.all([1,2,3,4].map(n=>fetch("data/diagnosis-a48-"+n+".json",{cache:"no-store"}).then(r=>{if(!r.ok)throw new Error();return r.json()}))),
   fetch("data/diagnosis-b12.json",{cache:"no-store"}).then(r=>{if(!r.ok)throw new Error();return r.json()})
 ]);
 all=parts.flat(); bAll=b;
}
function sameSet(a,b){return a.length===b.length&&[...a].sort().every((v,i)=>v===[...b].sort()[i])}
function statusFor(q,a){if(!q.auto_score)return "SELF"; const ok=sameSet(a.selected||[],q.correct); if(ok)return a.confidence==="sure"?"SOLID":"FUZZY"; return a.confidence==="sure"?"MISCONCEPTION":"GAP"}
function start(which){
 mode=which; active=which==="b"?bAll.slice():QUICK_IDS.map(id=>all.find(q=>q.id===id));
 answers={};idx=0; $("#diagnosisStart").hidden=true;$("#diagnosisResult").hidden=true;$("#diagnosisRun").hidden=false;renderQuestion();window.scrollTo({top:$("#diagnosisRun").offsetTop-80,behavior:"smooth"});
}
function renderQuestion(){
 const q=active[idx],a=answers[q.id]||{selected:[],confidence:"",note:""};
 $("#diagMode").textContent=(mode==="b"?"B領域12問":"A領域12問")+" ／ "+q.set_name;
 $("#diagProgressText").textContent=(idx+1)+" / "+active.length+"　"+q.domain+"　｜　"+q.cognition+(q.knowledge_type?"　｜　"+q.knowledge_type:"");
 $("#diagProgressBar").style.width=((idx+1)/active.length*100)+"%";
 const multi=q.form.includes("複数"), written=!q.options.length;
 let body='<article class="diag-question"><div class="diag-qmeta"><span>Q'+q.number+'</span><span>'+esc(q.form)+'</span></div><h3>'+esc(q.title)+'</h3><p class="diag-prompt">'+esc(q.prompt).replace(/\n/g,"<br>")+'</p>';
 if(written){
   body+='<label class="diag-written"><span>あなたの考え</span><textarea id="writtenAnswer" rows="10" placeholder="5つの観点について、自分の言葉で整理してください。">'+esc(a.note)+'</textarea></label>';
 }else{
   body+='<div class="diag-options">'+q.options.map(([v,l])=>'<label><input type="'+(multi?"checkbox":"radio")+'" name="choice" value="'+v+'" '+(a.selected.includes(v)?"checked":"")+'><span><b>'+v+'.</b> '+esc(l)+'</span></label>').join("")+'</div>';
   body+='<label class="diag-written compact reflection-note"><span>迷ったこと・選んだ理由・知っていること（任意）</span><textarea id="writtenAnswer" rows="4" placeholder="例：BとCで迷った。以前は○○と習った気がする。学校では△△の場面で使っている。">'+esc(a.note)+'</textarea><small>ここは正誤判定には使いません。結果画面で、自分の考えと正答を並べて振り返れます。</small></label>';
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
function confidenceLabel(v){return ({sure:"確信している",unsure:"迷いがある",guess:"勘・ほぼ分からない"}[v]||"未回答")}
function choiceText(q,values){
 if(!values||!values.length)return "—";
 return values.map(v=>{const opt=(q.options||[]).find(o=>o[0]===v);return opt?v+". "+opt[1]:v}).join(" / ");
}
function answerCompare(x){
 const mine=choiceText(x.q,x.a.selected),correct=choiceText(x.q,x.q.correct),conf=confidenceLabel(x.a.confidence);
 return '<div class="answer-compare">'
   +'<div class="answer-box mine"><span>あなたの回答</span><strong>'+esc(mine)+'</strong></div>'
   +'<div class="answer-box confidence-box"><span>そのときの確信度</span><strong>'+esc(conf)+'</strong></div>'
   +'<div class="answer-box correct"><span>正答</span><strong>'+esc(correct)+'</strong></div>'
   +'</div>'
   +(x.a.note?'<div class="reflection-result"><span>あなたの説明・迷ったこと</span><p>'+esc(x.a.note).replace(/\n/g,"<br>")+'</p></div>':'<div class="reflection-result empty"><span>あなたの説明・迷ったこと</span><p>記述なし</p></div>');
}
function sourceLink(q){
 if(!q.source_url)return "";
 return '<p class="diagnosis-source"><a href="'+esc(q.source_url)+'" target="_blank" rel="noopener">一次情報を確認 ↗</a>'+(q.checked_at?' <span>確認日 '+esc(q.checked_at)+'</span>':'')+'</p>';
}
function learningLink(q){
 const d=q.domain||"";
 if(/DHCP|DNS|ネットワーク|Ethernet|PoE/.test(d))return '<a href="network.html">ネットワークの基礎を学ぶ →</a>';
 if(/セキュリティ|ID・アクセス|認証・サービス/.test(d))return '<a href="security.html">セキュリティの基礎を学ぶ →</a>';
 if(/個人情報|データガバナンス/.test(d))return '<a href="privacy.html">個人情報・教育データを学ぶ →</a>';
 if(/著作権|知的財産/.test(d))return '<a href="copyright.html">著作権を学ぶ →</a>';
 if(/情報教育|学習指導要領|教育DX政策|一次情報|生成AI/.test(d))return '<a href="policy.html">教育ICT・一次情報を学ぶ →</a>';
 if(/教育ICT基盤|アカウント/.test(d))return '<a href="account.html">アカウント・運用を学ぶ →</a>';
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
 let html='<div class="answer-review-head"><div><h3 class="review-title">あなたの回答と結果</h3><p>何を選び、どのくらい確信していたかを、正答と並べて確認できます。</p></div><span>'+rows.length+'問</span></div>';
 html+='<div class="review-list all-answers">'+rows.map(x=>'<details class="review-item '+x.status.toLowerCase()+'" '+(x.status==="MISCONCEPTION"?'open':'')+'><summary><b>'+x.status+'</b><span>Q'+x.q.number+' '+esc(x.q.title)+'</span><em>'+esc(confidenceLabel(x.a.confidence))+'</em></summary><div>'+answerCompare(x)+'<p class="result-meaning"><strong>判定：</strong>'+esc(({SOLID:"正解 × 確信。定着している可能性が高い状態です。",FUZZY:"正解ですが、迷い・勘がありました。曖昧な理解を確認します。",GAP:"不正解で、迷い・勘がありました。まだ形成されていない知識を確認します。",MISCONCEPTION:"不正解でしたが確信がありました。誤概念の可能性を優先して確認します。"}[x.status]))+'</p><p>'+esc(x.q.key_explanation)+'</p><p class="school-link">'+esc(x.q.school_connection)+'</p>'+sourceLink(x.q)+learningLink(x.q)+'</div></details>').join("")+'</div>';
 if(review.length)html+='<p class="review-priority"><b>見直しの優先：</b> MISCONCEPTION → FUZZY / GAP の順に確認すると、自信を持っていた誤解と曖昧な知識を見つけやすくなります。</p>';
 const q48=active.find(q=>q.id==="A48");
 if(q48&&answers.A48){html+='<div class="rubric-box"><p class="eyebrow">Q48 SELF REVIEW</p><h3>総合記述の自己確認</h3><p>Q48は自動採点しません。自分の記述と観点例を照らし合わせてください。</p><pre>'+esc(q48.rubric)+'</pre></div>'}
 $("#resultReview").innerHTML=html;window.scrollTo({top:$("#diagnosisResult").offsetTop-70,behavior:"smooth"});
}
$("#startQuick").addEventListener("click",()=>start("quick"));
$("#startB").addEventListener("click",()=>start("b"));
$("#quitDiagnosis").addEventListener("click",()=>{$("#diagnosisRun").hidden=true;$("#diagnosisStart").hidden=false});
$("#retryDiagnosis").addEventListener("click",()=>start(mode));
$("#printDiagnosis").addEventListener("click",()=>window.print());
loadData().catch(()=>{$("#diagnosisStart").innerHTML='<p>診断データを読み込めませんでした。少し時間をおいて再読み込みしてください。</p>'});