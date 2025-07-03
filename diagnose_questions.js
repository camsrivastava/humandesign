/* ---------- 1.  Wipe chat unless this is a true page refresh ---------- */
{
  const nav = performance.getEntriesByType('navigation')[0];
  const isReload = nav && nav.type === 'reload';
  if (!isReload) {
    sessionStorage.removeItem('dChatHist');
    sessionStorage.removeItem('dLastSeenIdx');
  }
}

/* ---------- 2.  State ---------- */
let currentIndex = parseInt(sessionStorage.getItem('dIdx') || '0');
let lastSeenIdx  = parseInt(sessionStorage.getItem('dLastSeenIdx') || '-1');
let questions    = benchmark;
let chatHistory  = [];

const chatBox  = document.getElementById('dialog-box');
const chatForm = document.getElementById('chat-form');
const userInput= document.getElementById('user-input');

/* ---------- 3.  Render ---------- */
function renderQuestion(idx){
  const q = questions[idx];

  /* Decide whether to reset or restore chat */
  if (!sessionStorage.getItem('dIdx') || idx !== lastSeenIdx){
    chatHistory = [];
  } else {
    chatHistory = JSON.parse(sessionStorage.getItem('dChatHist') || '[]');
  }

  /* Image + text */
  document.getElementById('question-image').innerHTML =
    `<img src="${q.image_path.replace(/\\\\/g,'/')}" style="max-width:100%;max-height:300px;">`;
  document.getElementById('question-text').innerText = q.question;

  /* Radio options */
  const form = document.getElementById('question-form');
  form.innerHTML = q.options.map((o,i)=>`
    <div><input type="radio" id="o${i}" name="answer" value="${o.label}">
    <label for="o${i}">${o.label}</label></div>`).join('');
  document.getElementById('answer-feedback').innerText = '';

  /* Persist index */
  currentIndex = idx;
  sessionStorage.setItem('dIdx', idx.toString());
  sessionStorage.setItem('dLastSeenIdx', idx.toString());

  /* Render chat history */
  chatBox.innerHTML = '';
  chatHistory.forEach(m=> appendMsg(m.role==='user'?'You':'GPT', m.content));

  /* If first time, ask GPT to start the diagnostic dialog */
  if (chatHistory.length === 0){
    appendMsg('GPT', 'Loading case and beginning diagnostic reasoning...');
    fetch('https://humandesign-vue9.onrender.com/diagnose', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({ question:q.question, options:q.options, history:[] })
    })
    .then(r=>r.json())
    .then(d=>{
      chatHistory.push({role:'assistant',content:d.reply});
      saveChat(); updateAssistant(d.reply);
    });
  }
}

/* ---------- 4.  Chat logic ---------- */
chatForm.addEventListener('submit', async e=>{
  e.preventDefault();
  const msg = userInput.value.trim(); if(!msg) return;
  appendMsg('You', msg);
  chatHistory.push({role:'user',content:msg});
  userInput.value=''; saveChat();

  const r=await fetch('https://humandesign-vue9.onrender.com/diagnose',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
      question: questions[currentIndex].question,
      options : questions[currentIndex].options,
      history : chatHistory
    })
  });
  const rd=r.body.getReader(); const dec=new TextDecoder(); let asst='';
  while(true){const {done,value}=await rd.read(); if(done)break;
    asst += dec.decode(value); updateAssistant(asst);}
  chatHistory.push({role:'assistant',content:asst}); saveChat();
});

function appendMsg(sender,text){
  const div=document.createElement('div');
  div.textContent=`${sender}: ${text}`;
  chatBox.appendChild(div); chatBox.scrollTop=chatBox.scrollHeight;
}
function updateAssistant(text){
  let last=chatBox.lastChild;
  if(!last||!last.classList.contains('assistant')){
    last=document.createElement('div');last.classList.add('assistant');
    chatBox.appendChild(last);}
  last.textContent=`GPT: ${text}`; chatBox.scrollTop=chatBox.scrollHeight;
}
function saveChat(){ sessionStorage.setItem('dChatHist', JSON.stringify(chatHistory)); }

/* ---------- 5.  Answer buttons ---------- */
document.getElementById('submit-answer').onclick=()=>{
  const sel=document.querySelector('input[name="answer"]:checked');
  const fb =document.getElementById('answer-feedback');
  if(!sel){fb.innerText='Pick an answer.';return;}
  const correct = questions[currentIndex].answer;
  fb.innerText  = sel.value===correct ? '✅ Correct!' :
    `❌ Incorrect. Correct: "${correct}".`;
};
document.getElementById('show-answer').onclick=()=>{
  const corr=questions[currentIndex].answer;
  document.getElementById('answer-feedback').innerText=`✅ Correct: ${corr}`;
};
document.getElementById('next-question').onclick=()=>{
  const nxt=(currentIndex+1)%questions.length;
  chatHistory=[]; saveChat(); renderQuestion(nxt);
};

/* ---------- 6.  Init ---------- */
renderQuestion(currentIndex);
