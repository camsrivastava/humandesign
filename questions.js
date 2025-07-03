let currentQuestionIndex = localStorage.getItem("currentQuestionIndex")
  ? parseInt(localStorage.getItem("currentQuestionIndex"))
  : 0;
let questions = benchmark;
let chatHistory = JSON.parse(localStorage.getItem("chatHistory") || "[]");

const chatBox = document.getElementById('chat-box');
const chatForm = document.getElementById('chat-form');
const userInput = document.getElementById('user-input');

function showQuestion(index) {
  const q = questions[index];

  document.getElementById('question-image').innerHTML = `
    <img src="${q.image_path.replace(/\\\\/g, '/')}" alt="Case Image" style="max-width:100%; max-height:300px;" />
  `;

  document.getElementById('question-text').innerHTML = `
    <h3>Q: ${q.question}</h3>
  `;

  const form = document.getElementById('question-form');
  form.innerHTML = '';
  q.options.forEach((opt, i) => {
    const id = `option-${i}`;
    form.innerHTML += `
      <div>
        <input type="radio" id="${id}" name="answer" value="${opt.label}">
        <label for="${id}">${opt.label}</label>
      </div>
    `;
  });

  document.getElementById('answer-feedback').innerText = '';
  localStorage.setItem("currentQuestionIndex", currentQuestionIndex.toString());
  localStorage.setItem("chatHistory", JSON.stringify(chatHistory));

  // Clear chat box and render chat history
  chatBox.innerHTML = '';
  chatHistory.forEach(entry => {
    addMessage(entry.role === 'user' ? 'You' : 'GPT', entry.content);
  });
}

chatForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const message = userInput.value.trim();
  if (!message) return;

  addMessage('You', message);
  chatHistory.push({ role: 'user', content: message });
  userInput.value = '';
  saveSession();

  const response = await fetch('/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  });
