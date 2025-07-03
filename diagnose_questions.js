
let currentIndex = 0;
let questions = benchmark;
let chatHistory = [];

const dialogBox = document.getElementById('dialog-box');
const dialogForm = document.getElementById('dialog-form');
const dialogInput = document.getElementById('dialog-input');

function renderQuestion(index) {
  const q = questions[index];
  chatHistory = [];

  // Display image and text
  document.getElementById('question-image').innerHTML = `
    <img src="${q.image_path.replace('\\', '/')}" alt="Case Image" style="max-width:100%; max-height:300px;" />
  `;
  document.getElementById('question-text').innerHTML = '<strong>Q:</strong> ' + q.question;

  // Show answer options
  document.getElementById('answer-options').innerHTML = q.options.map(o => `<li>${o.label}</li>`).join('');

  dialogBox.innerHTML = '';
  appendMessage('gpt', 'Loading case and beginning diagnostic reasoning...');

  fetch('https://humandesign-vue9.onrender.com/diagnose', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      question: q.question,
      options: q.options,
      history: []
    })
  })
  .then(res => res.json())
  .then(data => {
    appendMessage('gpt', data.reply);
    chatHistory.push({ role: 'assistant', content: data.reply });
  });
}

function appendMessage(sender, text) {
  const div = document.createElement('div');
  div.className = sender === 'gpt' ? 'assistant' : 'human';
  div.innerHTML = `<strong>${sender === 'gpt' ? 'GPT' : 'You'}:</strong> ${text}`;
  dialogBox.appendChild(div);
  dialogBox.scrollTop = dialogBox.scrollHeight;
}

dialogForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const userText = dialogInput.value.trim();
  if (!userText) return;

  appendMessage('human', userText);
  chatHistory.push({ role: 'user', content: userText });
  dialogInput.value = '';

  const q = questions[currentIndex];
  const response = await fetch('https://humandesign-vue9.onrender.com/diagnose', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      question: q.question,
      options: q.options,
      history: chatHistory
    })
  });
  const data = await response.json();
  appendMessage('gpt', data.reply);
  chatHistory.push({ role: 'assistant', content: data.reply });

  // Check for final answer pattern
  if (data.reply.includes("I believe the correct answer is:")) {
    const nextBtn = document.createElement('button');
    nextBtn.textContent = 'Next Question';
    nextBtn.onclick = () => {
      currentIndex = (currentIndex + 1) % questions.length;
      renderQuestion(currentIndex);
    };
    dialogBox.appendChild(nextBtn);
  }
});

// Load the first question
renderQuestion(currentIndex);
