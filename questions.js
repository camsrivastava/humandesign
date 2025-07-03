/* ---------- 1.  CLEAR chat storage unless this is a true refresh ---------- */
{
  const nav = performance.getEntriesByType('navigation')[0];
  const isReload = nav && nav.type === 'reload';
  if (!isReload) {
    localStorage.removeItem('chatHistory');
    localStorage.removeItem('lastSeenIndex');
  }
}

/* ---------- 2.  State variables ---------- */
let currentQuestionIndex = parseInt(localStorage.getItem('currentQuestionIndex') || '0');
let lastSeenIndex       = parseInt(localStorage.getItem('lastSeenIndex')       || '-1');
let questions           = benchmark;
let chatHistory         = [];

/* ---------- 3.  DOM refs ---------- */
const chatBox  = document.getElementById('chat-box');
const chatForm = document.getElementById('chat-form');
const userInput= document.getElementById('user-input');

/* ---------- 4.  Main render ---------- */
function showQuestion(index) {
  const q = questions[index];

  /* Fresh chat if first time seeing this question in this session */
  if (currentQuestionIndex !== lastSeenIndex) {
    chatHistory = [];
    localStorage.setItem('lastSeenIndex', currentQuestionIndex.toString());
  } else {
    chatHistory = JSON.parse(localStorage.getItem('chatHistory') || '[]');
  }

  /* Image & text */
  document.getElementById('question-image').innerHTML =
    `<img src="${q.image_path.replace(/\\\\/g,'/')}" style="max-width:100%;max-height:300px;">`;
  document.getElementById('question-text').innerText = q.question;

  /* Options */
  const form = document.getElementById('question-form');
  form.innerHTML = q.options.map((opt,i)=>`
      <div>
        <input type="radio" id="opt${i}" name="answer" value="${opt.label}">
        <label for="opt${i}">${opt.label}</label>
      </div>`).join('');

  document.getElementById('answer-feedback').innerText = '';

  /* Persist indices & (empty) history */
  localStorage.setItem('currentQuestionIndex', currentQuestionIndex.toString());
  localStorage.setItem('chatHistory',          JSON.stringify(chatHistory));

  /* Render chat history (if any) */
  chatBox.innerHTML = '';
  chatHistory.forEach(m => addMessage(m.role==='user'?'You':'GPT', m.content));
}

/* ---------- 5.  GPT chat ---------- */
chatForm.addEventListener('submit', async e => {
  e.preventDefault();
  const message = userInput.value.trim();
  if (!message) return;

  addMessage('You', message);
  chatHistory.push({ role:'user', content:message });
  userInput.value = '';
  saveSession();

  const r = await fetch('https://humandesign-vue9.onrender.com/chat',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({message})
  });

  const reader = r.body.getReader();
  const dec    = new TextDecoder();
  let assist   = '';

  while (true) {
    const {done,value} = await reader.read();
    if (done) break;
    assist += dec.decode(value);
    updateAssistant(assist);
  }
  chatHistory.push({ role:'assistant', content:assist });
  saveSession();
});

/* ---------- 6.  Helpers ---------- */
function addMessage(sender,text){
  const div=document.createElement('div');
  div.textContent=`${sender}: ${text}`;
  chatBox.appendChild(div); chatBox.scrollTop=chatBox.scrollHeight;
}
function updateAssistant(text){
  let last=chatBox.lastChild;
  if(!last||!last.classList.contains('assistant')){
    last=document.createElement('div'); last.classList.add('assistant');
    chatBox.appendChild(last);
  }
  last.textContent=`GPT: ${text}`;
  chatBox.scrollTop=chatBox.scrollHeight;
}
function saveSession(){
  localStorage.setItem('chatHistory',JSON.stringify(chatHistory));
}

/* ---------- 7.  Answer buttons ---------- */
document.getElementById('submit-answer').onclick = () => {
  const sel=document.querySelector('input[name="answer"]:checked');
  const fb =document.getElementById('answer-feedback');
  if(!sel){fb.innerText='Pick an answer first.';return;}
  const correct=questions[currentQuestionIndex].answer;
  fb.innerText = sel.value===correct ? '✅ Correct!' :
     `❌ Incorrect. Correct: "${correct}".`;
};
document.getElementById('show-answer').onclick = () => {
  const correct=questions[currentQuestionIndex].answer;
  document.getElementById('answer-feedback').innerText=`✅ Correct: ${correct}`;
};
document.getElementById('next-question').onclick = () => {
  currentQuestionIndex = (currentQuestionIndex+1)%questions.length;
  chatHistory=[];
  saveSession();
  showQuestion(currentQuestionIndex);
};

/* ---------- 8.  Initial render ---------- */
showQuestion(currentQuestionIndex);
