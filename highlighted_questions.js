
let currentQuestionIndex = localStorage.getItem("highlightedQuestionIndex")
  ? parseInt(localStorage.getItem("highlightedQuestionIndex"))
  : 0;
let questions = benchmark;

function showQuestion(index) {
  const q = questions[index];

  document.getElementById('question-image').innerHTML = `
    <img src="\${q.image_path.replace('\\', '/')}" alt="Case Image" style="max-width:100%; max-height:300px;" />
  `;

  fetch('https://humandesign-vue9.onrender.com/highlight', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question: q.question })
  })
  .then(res => res.json())
  .then(data => {
    document.getElementById('question-text').innerHTML = data.highlighted;
  })
  .catch(() => {
    document.getElementById('question-text').innerText = q.question;
  });

  const form = document.getElementById('question-form');
  form.innerHTML = '';
  q.options.forEach((opt, i) => {
    const id = `option-\${i}`;
    form.innerHTML += `
      <div>
        <input type="radio" id="\${id}" name="answer" value="\${opt.label}">
        <label for="\${id}">\${opt.label}</label>
      </div>
    `;
  });

  document.getElementById('answer-feedback').innerText = '';
  localStorage.setItem("highlightedQuestionIndex", currentQuestionIndex.toString());
}

document.getElementById('submit-answer').addEventListener('click', (e) => {
  e.preventDefault();
  const selected = document.querySelector('input[name="answer"]:checked');
  const feedback = document.getElementById('answer-feedback');
  if (!selected) {
    feedback.innerText = 'Please select an option first.';
    return;
  }

  const correct = questions[currentQuestionIndex].answer;
  if (selected.value === correct) {
    feedback.innerText = '✅ Correct!';
    feedback.style.color = 'green';
  } else {
    feedback.innerText = \`❌ Incorrect. You chose "\${selected.value}", but the correct answer is "\${correct}".\`;
    feedback.style.color = 'red';
  }
});

document.getElementById('show-answer').addEventListener('click', () => {
  const correct = questions[currentQuestionIndex].answer;
  document.getElementById('answer-feedback').innerText = \`✅ Correct answer: \${correct}\`;
  document.getElementById('answer-feedback').style.color = 'blue';
});

document.getElementById('next-question').addEventListener('click', () => {
  currentQuestionIndex = (currentQuestionIndex + 1) % questions.length;
  localStorage.setItem("highlightedQuestionIndex", currentQuestionIndex.toString());
  showQuestion(currentQuestionIndex);
});

showQuestion(currentQuestionIndex);

// 🔽 Baked-in GPT chat logic
const chatBox = document.getElementById('chat-box');
const chatForm = document.getElementById('chat-form');
const userInput = document.getElementById('user-input');

chatForm.addEventListener('submit', async (e) => {
  e.preventDefault();
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

function addMessage(sender, text) {
  const div = document.createElement('div');
  div.textContent = \`\${sender}: \${text}\`;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function updateAssistantMessage(text) {
  let last = chatBox.lastChild;
  if (!last || !last.classList.contains('assistant')) {
    last = document.createElement('div');
    last.classList.add('assistant');
    chatBox.appendChild(last);
  }
  last.textContent = \`GPT: \${text}\`;
  chatBox.scrollTop = chatBox.scrollHeight;
}
