/* ----------  State ---------- */
let currentQuestionIndex = parseInt(sessionStorage.getItem('qIndex') || '0');
let questions            = benchmark;
let chatHistory          = JSON.parse(sessionStorage.getItem('chatHist') || '[]');

const chatBox  = document.getElementById('chat-box');
const chatForm = document.getElementById('chat-form');
const userInput= document.getElementById('user-input');

/* ----------  Render ---------- */
function showQuestion(idx){
  const q = questions[idx];

  /* if this is a *new* page load (no stored index) wipe chat */
  if (!sessionStorage.getItem('qIndex') || idx !== currentQuestionIndex){
    chatHistory = [];
  }

  /* image + text */
  document.getElementById('question-image').innerHTML =
    `<img src="${q.image_path.replace(/\\\\/g,'/')}" style="max-width:100%;max-height:300px;">`;
  document.getElementById('question-text').innerText = q.question;

  /* options */
  document.getElementById('question-form').innerHTML = q.options.map((o,i)=>`
    <div><input type="radio" id="o${i}" name="answer" value="${o.label}">
         <label for="o${i}">${o.label}</label></div>`).join('');
  document.getElementById('answer-feedback').innerText = '';

  /* save index */
  currentQuestionIndex = idx;
  sessionStorage.setItem('qIndex', idx.toString());

  /* render chat */
  chatBox.innerHTML = '';
  chatHistory.forEach(m => addMsg(m.role==='user'?'You':'GPT', m.content));
}

/* ----------  Chat ---------- */
chatForm.addEventListener('submit', async e=>{
  e.preventDefault();
  const msg = userInput.value.trim();
  if (!msg) return;
  addMsg('You', msg);
  chatHistory.push({role:'user', content:msg});
  userInput.value=''; saveChat();

  const r = await fetch('https://humandesign-vue9.onrender.com/chat',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({message:msg})
  });
  const rd=r.body.getReader(); const dec=new TextDecoder(); let asst='';
  while (true){const {done,value}=await rd.read(); if(done)break;
    asst+=dec.decode(value); updAsst(asst);}
  chatHistory.push({role:'assistant',content:asst}); saveChat();
});

function addMsg(sender,text){
  const d=document.createElement('div');
  d.textContent=`${sender}: ${text}`;
  chatBox.appendChild(d); chatBox.scrollTop=chatBox.scrollHeight;
}
function updAsst(t){
  let last=chatBox.lastChild;
  if(!last||!last.classList.contains('assistant')){
    last=document.createElement('div'); last.classList.add('assistant');
    chatBox.appendChild(last);}
  last.textContent=`GPT: ${t}`; chatBox.scrollTop=chatBox.scrollHeight;
}
function saveChat(){ sessionStorage.setItem('chatHist', JSON.stringify(chatHistory)); }

/* ----------  Answer buttons ---------- */
document.getElementById('submit-answer').onclick=()=>{
  const sel=document.querySelector('input[name="answer"]:checked');
  const fb =document.getElementById('answer-feedback');
  if(!sel){fb.innerText='Pick an answer.';return;}
  const correct = questions[currentQuestionIndex].answer;
  fb.innerText  = sel.value===correct ? '✅ Correct!' :
     `❌ Incorrect. Correct: "${correct}".`;
};
document.getElementById('show-answer').onclick=()=>{
  const corr=questions[currentQuestionIndex].answer;
  document.getElementById('answer-feedback').innerText=`✅ Correct: ${corr}`;
};
document.getElementById('next-question').onclick=()=>{
  const nxt=(currentQuestionIndex+1)%questions.length;
  chatHistory=[]; saveChat(); showQuestion(nxt);
};

/* ----------  Init ---------- */
showQuestion(currentQuestionIndex);
