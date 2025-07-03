/* ----------  State ---------- */
let currentQuestionIndex = parseInt(sessionStorage.getItem('hqIndex') || '0');
let questions            = benchmark;
let chatHistory          = JSON.parse(sessionStorage.getItem('hChatHist') || '[]');

const chatBox  = document.getElementById('chat-box');
const chatForm = document.getElementById('chat-form');
const userInput= document.getElementById('user-input');

/* ----------  Render ---------- */
function showQuestion(idx){
  const q = questions[idx];

  if (!sessionStorage.getItem('hqIndex') || idx !== currentQuestionIndex){
    chatHistory = [];
  }

  document.getElementById('question-image').innerHTML =
    `<img src="${q.image_path.replace(/\\\\/g,'/')}" style="max-width:100%;max-height:300px;">`;

  fetch('https://humandesign-vue9.onrender.com/highlight',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({question:q.question})
  })
  .then(r=>r.json())
  .then(d=> document.getElementById('question-text').innerHTML=d.highlighted)
  .catch(()=> document.getElementById('question-text').innerText=q.question);

  document.getElementById('question-form').innerHTML = q.options.map((o,i)=>`
    <div><input type="radio" id="o${i}" name="answer" value="${o.label}">
         <label for="o${i}">${o.label}</label></div>`).join('');
  document.getElementById('answer-feedback').innerText='';

  currentQuestionIndex = idx;
  sessionStorage.setItem('hqIndex', idx.toString());

  chatBox.innerHTML='';
  chatHistory.forEach(m=>addMsg(m.role==='user'?'You':'GPT',m.content));
}

/* ----------  Chat ---------- */
chatForm.addEventListener('submit',async e=>{
  e.preventDefault();
  const msg=userInput.value.trim(); if(!msg) return;
  addMsg('You',msg); chatHistory.push({role:'user',content:msg});
  userInput.value=''; saveChat();

  const r=await fetch('https://humandesign-vue9.onrender.com/chat',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({message:msg})
  });
  const rd=r.body.getReader(); const dec=new TextDecoder(); let asst='';
  while(true){const {done,value}=await rd.read();if(done)break;
    asst+=dec.decode(value); updAsst(asst);}
  chatHistory.push({role:'assistant',content:asst}); saveChat();
});

function addMsg(s,t){const d=document.createElement('div');
  d.textContent=`${s}: ${t}`; chatBox.appendChild(d);
  chatBox.scrollTop=chatBox.scrollHeight;}
function updAsst(t){let l=chatBox.lastChild;
  if(!l||!l.classList.contains('assistant')){
    l=document.createElement('div');l.classList.add('assistant');chatBox.appendChild(l);}
  l.textContent=`GPT: ${t}`; chatBox.scrollTop=chatBox.scrollHeight;}
function saveChat(){ sessionStorage.setItem('hChatHist', JSON.stringify(chatHistory)); }

/* ----------  Answer buttons ---------- */
document.getElementById('submit-answer').onclick=()=>{
  const sel=document.querySelector('input[name="answer"]:checked');
  const fb =document.getElementById('answer-feedback');
  if(!sel){fb.innerText='Pick an answer.';return;}
  const correct=questions[currentQuestionIndex].answer;
  fb.innerText= sel.value===correct ? '✅ Correct!' :
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
