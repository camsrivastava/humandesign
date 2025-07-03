/* 1. Wipe chat unless genuine refresh */
{
  const nav = performance.getEntriesByType('navigation')[0];
  const isReload = nav && nav.type === 'reload';
  if (!isReload) {
    localStorage.removeItem('highlightedChatHistory');
    localStorage.removeItem('highlightedLastSeenIndex');
  }
}

/* 2. State */
let currentQuestionIndex = parseInt(localStorage.getItem('highlightedQuestionIndex') || '0');
let lastSeenIndex       = parseInt(localStorage.getItem('highlightedLastSeenIndex') || '-1');
let questions           = benchmark;
let chatHistory         = [];

const chatBox  = document.getElementById('chat-box');
const chatForm = document.getElementById('chat-form');
const userInput= document.getElementById('user-input');

/* 3. Main render */
function showQuestion(idx){
  const q=questions[idx];

  if (currentQuestionIndex!==lastSeenIndex){
    chatHistory=[];
    localStorage.setItem('highlightedLastSeenIndex',currentQuestionIndex.toString());
  }else{
    chatHistory = JSON.parse(localStorage.getItem('highlightedChatHistory')||'[]');
  }

  document.getElementById('question-image').innerHTML=
    `<img src="${q.image_path.replace(/\\\\/g,'/')}" style="max-width:100%;max-height:300px;">`;

  /* Highlight fetch */
  fetch('https://humandesign-vue9.onrender.com/highlight',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({question:q.question})
  })
  .then(r=>r.json())
  .then(d=> document.getElementById('question-text').innerHTML=d.highlighted)
  .catch(()=> document.getElementById('question-text').innerText=q.question);

  const form=document.getElementById('question-form');
  form.innerHTML=q.options.map((opt,i)=>`
     <div><input type="radio" id="o${i}" name="answer" value="${opt.label}">
     <label for="o${i}">${opt.label}</label></div>`).join('');
  document.getElementById('answer-feedback').innerText='';

  localStorage.setItem('highlightedQuestionIndex',currentQuestionIndex.toString());
  localStorage.setItem('highlightedChatHistory',JSON.stringify(chatHistory));

  chatBox.innerHTML='';
  chatHistory.forEach(m=>addMsg(m.role==='user'?'You':'GPT',m.content));
}

/* 4. Chat */
chatForm.addEventListener('submit',async e=>{
  e.preventDefault();
  const msg=userInput.value.trim(); if(!msg) return;
  addMsg('You',msg);
  chatHistory.push({role:'user',content:msg});
  userInput.value=''; saveSession();

  const r=await fetch('https://humandesign-vue9.onrender.com/chat',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({message:msg})
  });
  const rd=r.body.getReader(); const dec=new TextDecoder(); let asst='';
  while(true){const {done,value}=await rd.read();if(done)break;
    asst+=dec.decode(value); updAsst(asst);}
  chatHistory.push({role:'assistant',content:asst}); saveSession();
});
function addMsg(sender,text){const d=document.createElement('div');
  d.textContent=`${sender}: ${text}`; chatBox.appendChild(d);
  chatBox.scrollTop=chatBox.scrollHeight;}
function updAsst(t){let l=chatBox.lastChild;
  if(!l||!l.classList.contains('assistant')){
    l=document.createElement('div');l.classList.add('assistant');chatBox.appendChild(l);}
  l.textContent=`GPT: ${t}`; chatBox.scrollTop=chatBox.scrollHeight;}
function saveSession(){
  localStorage.setItem('highlightedChatHistory',JSON.stringify(chatHistory));}

/* 5. Answer buttons */
document.getElementById('submit-answer').onclick=()=>{
  const sel=document.querySelector('input[name="answer"]:checked');
  const fb=document.getElementById('answer-feedback');
  if(!sel){fb.innerText='Pick an answer.';return;}
  const correct=questions[currentQuestionIndex].answer;
  fb.innerText= sel.value===correct ? '✅ Correct!' :
    `❌ Incorrect. Correct: "${correct}".`;
};
document.getElementById('show-answer').onclick=()=>{
  const corr=questions[currentQuestionIndex].answer;
  document.getElementById('answer-feedback').innerText=`✅ Correct: ${corr}`;};
document.getElementById('next-question').onclick=()=>{
  currentQuestionIndex=(currentQuestionIndex+1)%questions.length;
  chatHistory=[]; saveSession(); showQuestion(currentQuestionIndex);};

/* 6. Init */
showQuestion(currentQuestionIndex);
