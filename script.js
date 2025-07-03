
let questions = benchmark;
let currentQuestionIndex = localStorage.getItem("currentQuestionIndex")
  ? parseInt(localStorage.getItem("currentQuestionIndex"))
  : 0;

function addMessage(sender, text) {
  const div = document.createElement('div');
  div.textContent = \`\${sender}: \${text}\`;
  document.getElementById('chat-box').appendChild(div);
  document.getElementById('chat-box').scrollTop = document.getElementById('chat-box').scrollHeight;
}

function updateAssistantMessage(text) {
  let last = document.getElementById('chat-box').lastChild;
  if (!last || !last.classList.contains('assistant')) {
    last = document.createElement('div');
    last.classList.add('assistant');
    document.getElementById('chat-box').appendChild(last);
  }
  last.textContent = \`GPT: \${text}\`;
  document.getElementById('chat-box').scrollTop = document.getElementById('chat-box').scrollHeight;
}

document.getElementById('chat-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const userInput = document.getElementById('user-input');
  const message = userInput.value;
  addMessage('You', message);
  userInput.value = '';

  const response = await fetch('https://humandesign-vue9.onrender.com/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let assistantMsg = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value);
    assistantMsg += chunk;
    updateAssistantMessage(assistantMsg);
  }
});

// For Interface 1 and 2: store question index on change
function goToNextQuestion() {
  currentQuestionIndex = (currentQuestionIndex + 1) % questions.length;
  localStorage.setItem("currentQuestionIndex", currentQuestionIndex.toString());
  // this function is meant to be called after advancing question in your viewer logic
}
