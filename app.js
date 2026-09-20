const box=document.getElementById("quizBox");
let quiz=null;

function japanDayNumber(){
  const parts=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Tokyo",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());
  const p=Object.fromEntries(parts.map(x=>[x.type,x.value]));
  return Math.floor(Date.UTC(Number(p.year),Number(p.month)-1,Number(p.day))/86400000);
}
function quizOptionLabel(q,value){
  const found=q.options.find(([v])=>v===value);
  return found?found[1]:"";
}
function renderQuiz(){
  if(!quiz){box.innerHTML='<p class="quiz-loading">今日の問題を読み込んでいます…</p>';return}
  box.innerHTML='<div class="quiz-meta"><span>'+quiz.type+'</span><span>'+quiz.category+'</span></div><p class="quiz-question">'+quiz.question+'</p><div class="quiz-options">'+quiz.options.map(([v,l])=>'<button class="quiz-option" data-value="'+v+'"><b>'+v+'.</b> '+l+'</button>').join("")+'</div>';
  box.querySelectorAll(".quiz-option").forEach(b=>b.addEventListener("click",()=>answerQuiz(b.dataset.value)));
}
function answerQuiz(value){
  box.querySelectorAll(".quiz-option").forEach(b=>b.disabled=true);
  const ok=value===quiz.answer;
  const result=document.createElement("div");
  result.className="quiz-result";
  result.innerHTML='<strong>'+(ok?'その通りです。':'ここが今日の発見です。')+'</strong><p>答えは <b>'+quiz.answer+'「'+quizOptionLabel(quiz,quiz.answer)+'」</b>。</p><p>'+quiz.explain+'</p><p class="quiz-takeaway"><b>今日覚えること：</b>'+quiz.takeaway+'</p>';
  box.appendChild(result);
}
async function loadDailyQuiz(){
  renderQuiz();
  try{
    const res=await fetch("data/quizzes.json",{cache:"no-store"});
    if(!res.ok)throw new Error("quiz data unavailable");
    const data=await res.json();
    if(!data.items?.length)throw new Error("quiz pool empty");
    quiz=data.items[japanDayNumber()%data.items.length];
    renderQuiz();
  }catch(e){
    box.innerHTML='<p class="quiz-loading">今日の問題を読み込めませんでした。少し時間をおいて再読み込みしてください。</p>';
  }
}
loadDailyQuiz();

const scenes={
 wifi:{title:"Wi-Fiにつながらない",text:"まず『誰に・どこで・何が・いつから』を確認します。電波、接続、IP設定、DNS、サービス、認証を一括りにせず、正常な端末と比較して原因範囲を絞ります。",link:"network.html",label:"ネットワークの基礎へ"},
 app:{title:"新しいアプリを使いたい",text:"見るだけか、登録するか、ダウンロードするか、データを送るかを分けます。利用規約、年齢条件、要求権限、入力情報、学校の承認手続を確認します。",link:"account.html",label:"アカウント・クラウドの基礎へ"},
 ai:{title:"生成AIを授業で使いたい",text:"『使える』と『使ってよい』を分けます。サービス条件、入力する個人情報・著作物、出力の確認、学校や設置者のルールを順に見ます。",link:"policy.html",label:"教育ICT・一次情報の基礎へ"},
 account:{title:"新年度になった",text:"進級・卒業・転出入・異動で、アカウント、所属、権限、共有設定、端末の紐付けが変わります。作成から停止・削除までを一つのライフサイクルとして確認します。",link:"account.html",label:"アカウント・クラウドの基礎へ"},
 photo:{title:"子どもの写真を扱いたい",text:"目的、公開範囲、利用サービス、写真に含まれる情報を分けます。個人情報・プライバシー・肖像に関する利益・著作権等を一つの問題として片付けません。",link:"privacy.html",label:"個人情報・教育データの基礎へ"},
 unknown:{title:"ICT担当になった・基礎から学びたい",text:"ネットワーク、セキュリティ、アカウント・クラウド、個人情報・教育データ、著作権、教育ICT・一次情報の6領域を薄く一周します。その後、12問診断で曖昧なところを見つけます。",link:"#learn",label:"6つの基礎を見る"}
};
const answer=document.getElementById("sceneAnswer");
document.querySelectorAll(".scene-card").forEach(b=>b.addEventListener("click",()=>{const s=scenes[b.dataset.scene];answer.innerHTML="<h3>"+s.title+"</h3><p>"+s.text+"</p><a class=\"button\" href=\""+s.link+"\">"+s.label+" →</a>";answer.hidden=false;answer.scrollIntoView({behavior:"smooth",block:"nearest"})}));

function esc(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}
function formatRadarDate(value){
  if(!value)return "日付不明";
  const d=new Date(value);
  if(Number.isNaN(d.getTime()))return value;
  return new Intl.DateTimeFormat("ja-JP",{timeZone:"Asia/Tokyo",month:"numeric",day:"numeric",hour:"2-digit",minute:"2-digit"}).format(d);
}
async function loadRadar(){
  const items=document.getElementById("radarItems"),meta=document.getElementById("radarMeta");
  if(!items||!meta)return;
  try{
    const res=await fetch("data/radar.json?"+Date.now(),{cache:"no-store"});
    if(!res.ok)throw new Error("radar data unavailable");
    const data=await res.json();
    if(!data.items?.length){
      meta.textContent="自動収集の初回実行待ちです。";
      items.innerHTML='<div class="radar-empty">GitHub Actionsが最初の巡回を終えると、ここに新着見出しが並びます。</div>';
      return;
    }
    meta.textContent="最終巡回: "+formatRadarDate(data.generated_at)+" ／ "+data.items.length+"件を表示";
    items.innerHTML=data.items.map(x=>{
      const tags=(x.keywords||[]).map(k=>'<span>'+esc(k)+'</span>').join("");
      return '<article class="radar-item"><div class="radar-item-meta"><b>'+esc(x.source)+'</b><time>'+esc(formatRadarDate(x.published))+'</time></div><a href="'+esc(x.url)+'" target="_blank" rel="noopener">'+esc(x.title)+'</a><div class="radar-keywords">'+tags+'</div></article>';
    }).join("");
  }catch(e){
    meta.textContent="新着データを読み込めませんでした。";
    items.innerHTML='<div class="radar-empty">参考メディア一覧と一次情報レーダーは引き続き利用できます。</div>';
  }
}
loadRadar();
