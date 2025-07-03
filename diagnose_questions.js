/* ───────────────────────────────────────────────────────────
   1.  Wipe session data unless this is an actual browser reload
   ─────────────────────────────────────────────────────────── */
{
  const nav = performance.getEntriesByType('navigation')[0];
  const isReload = nav && nav.type === 'reload';
  if (!isReload) {
    sessionStorage.removeItem('dChatHist');
    sessionStorage.removeItem('dLastSeenIdx');
    sessionStorage.removeItem('dIdx');
  }
}

/* ────────────────── 2. State ────────────────── */
let currentIndex = parseInt(sessionStorage.getItem('dIdx') || '0');
let lastSeenIdx  = parseInt(sessionStorage.getItem('dLastSeenIdx') || '-1');
let questions    = benchmark;
let chatHistory  = [];

const chatBox   = document.getElementById('dialog-box');
const chatForm  = document.getElementById('chat-form');
const userInput = document.getElementById('user-input');

/* ────────────────── 3. Render question ────────────────── */
function renderQuestion(idx) {
  const q = questions[idx];

  /* Decide whether to reset or restore chat */
  if (idx !== lastSeenIdx) {
    chatHistory = [];
    sessionStorage.setItem('dLastSeenIdx', idx.toString());
  } else {
    chatHistory = JSON.parse(sessionStorage.getItem('dChatHist') || '[]');
  }

  /* Image + text */
  document.getElementById('question-image').innerHTML =
    `<img src="${q.image_path.replace(/\\\\/g, '/')}"
          style="max-width:100%;max-height:300px;">`;
  document.getElementById('question-text').innerText = q.question;

  /* Persist index */
  currentIndex = idx;
  sessionStorage.setItem('dIdx', idx.toString());

  /* Render any stored chat */
  chatBox.innerHTML = '';
  chatHistory.forEach(m =>
    appendMsg(m.role === 'user' ? 'You' : 'GPT', m.content)
  );

  /* If first visit to this question, prompt GPT */
  if (chatHistory.length === 0) {
    appendMsg('GPT', 'Loading case and beginning diagnostic reasoning…');
    fetch('https://humandesign-vue9.onrender.com/diagnose', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: q.question,
        options:  q.options,
        history:  []
      })
    })
      .then(r => r.json())
      .then(d => {
        chatHistory.push({ role: 'assistant', content: d.reply });
        saveChat(); updateAssistant(d.reply); checkForFinalAnswer(d.reply);
      });
  } else {
    /* Already had chat - check if GPT had proposed an answer earlier */
    const last = chatHistory[chatHistory.length - 1].content;
    checkForFinalAnswer(last);
  }
}

/* ─────────────── 4. GPT chat handler ─────────────── */
chatForm.addEventListener('submit', async e => {
  e.preventDefault();
  const msg = userInput.value.trim();
  if (!msg) return;

  appendMsg('You', msg);
  chatHistory.push({ role: 'user', content: msg });
  userInput.value = '';
  saveChat();

  const q = questions[currentIndex];
  const r = await fetch('https://humandesign-vue9.onrender.com/diagnose', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      question: q.question,
      options:  q.options,
      history:  chatHistory
    })
  });

  const reader = r.body.getReader();
  const decoder = new TextDecoder();
  let assistantMsg = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    assistantMsg += decoder.decode(value);
    updateAssistant(assistantMsg);
  }

  chatHistory.push({ role: 'assistant', content: assistantMsg });
  saveChat();
  checkForFinalAnswer(assistantMsg);
});

/* ─────────────── 5. Chat helpers ─────────────── */
function appendMsg(sender, text) {
  const div = document.createElement('div');
  div.textContent = `${sender}: ${text}`;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}
function updateAssistant(text) {
  let last = chatBox.lastChild;
  if (!last || !last.classList.contains('assistant')) {
    last = document.createElement('div');
    last.classList.add('assistant');
    chatBox.appendChild(last);
  }
  last.textContent = `GPT: ${text}`;
  chatBox.scrollTop = chatBox.scrollHeight;
}
function saveChat() {
  sessionStorage.setItem('dChatHist', JSON.stringify(chatHistory));
}

/* ─────────────── 6. Answer-button injection (crash-proof) ─────────────── */
function checkForFinalAnswer(reply) {
  if (!reply.includes('I believe the correct answer is')) return;

  const panel = document.getElementById('question-panel');
  let   nav   = document.getElementById('nav-buttons');

  /* Create container if needed */
  if (!nav) {
    nav = document.createElement('div');
    nav.id = 'nav-buttons';
    panel.appendChild(nav);
  }

  /* If buttons already exist, don’t recreate/retach */
  if (nav.querySelector('#submit-btn')) return;

  /* Inject buttons */
  nav.innerHTML = `
    <button id="submit-btn">Submit Answer</button>
    <button id="show-btn">Show Answer</button>
    <button id="next-btn">Next Question</button>
  `;

  /* Safe listener attachment */
  nav.querySelector('#submit-btn').addEventListener('click', submitHumanAnswer);
  nav.querySelector('#show-btn')  .addEventListener('click', showCorrectAnswer);
  nav.querySelector('#next-btn')  .addEventListener('click', nextQuestion);
}

/* ─────────────── 7. Button handlers ─────────────── */
function submitHumanAnswer() {
  const sel = document.querySelector('input[name="answer"]:checked');
  const fb  = document.getElementById('answer-feedback');
  if (!sel) { fb.textContent = 'Pick an answer.'; return; }

  const correct = questions[currentIndex].answer;
  fb.textContent = sel.value === correct
    ? '✅ Correct!'
    : `❌ Incorrect. Correct: "${correct}".`;
}
function showCorrectAnswer() {
  const correct = questions[currentIndex].answer;
  document.getElementById('answer-feedback').textContent = `✅ Correct: ${correct}`;
}
function nextQuestion() {
  const nxt = (currentIndex + 1) % questions.length;
  chatHistory = [];
  saveChat();
  renderQuestion(nxt);
}

/* ─────────────── 8. Init ─────────────── */
renderQuestion(currentIndex);
