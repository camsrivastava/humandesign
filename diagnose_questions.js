
let currentIndex = 0;
let questions = benchmark;
let chatHistory = [];

const dialogBox = document.getElementById('dialog-box');
const dialogForm = document.getElementById('chat-form');
const dialogInput = document.getElementById('user-input');



const feedbackBox = document.getElementById('answer-feedback') || document.createElement('div');
const navButtons = document.getElementById('navigation-buttons') || document.createElement('div');

function renderQuestion(index) {
  const q = questions[index];
  chatHistory = [];

  // Display image and text
  document.getElementById('question-image').innerHTML = `
    <img src="${q.image_path.replace('\\', '/')}" alt="Case Image" style="max-width:100%; max-height:300px;" />
  `;
  document.getElementById('question-text').innerHTML = '<strong>Q:</strong> ' + q.question;

  // Show answer options as radio buttons
  const answerList = document.getElementById('answer-options');
  answerList.innerHTML = q.options.map((opt, i) => {
    const id = `choice-${i}`;
    return `
      <div>
        <input type="radio" id="${id}" name="final-answer" value="${opt.label}">
        <label for="${id}">${opt.label}</label>
      </div>
    `;
  }).join('');

  feedbackBox.innerText = '';
  navButtons.innerHTML = '';
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
    checkForFinalAnswer(data.reply);
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

  checkForFinalAnswer(data.reply);
});

function checkForFinalAnswer(reply) {
  if (reply.includes("I believe the correct answer is:")) {
    // Add buttons
    navButtons.innerHTML = `
      <button onclick="submitHumanAnswer()">Submit Answer</button>
      <button onclick="showCorrectAnswer()">Show Answer</button>
      <button onclick="nextQuestion()">Next Question</button>
    `;
    document.getElementById('question-panel').appendChild(feedbackBox);
    document.getElementById('question-panel').appendChild(navButtons);
  }
}

function submitHumanAnswer() {
  const selected = document.querySelector('input[name="final-answer"]:checked');
  const correct = questions[currentIndex].answer;
  const gptAnswer = chatHistory.map(m => m.content)
    .find(t => t.includes("I believe the correct answer is:"))
    ?.match(/correct answer is: ([\s\S]+?)\.?$/i)?.[1]?.trim();

  if (!selected) {
    feedbackBox.innerText = 'Please select an answer.';
    return;
  }

  const human = selected.value;
  let result = '';

  if (human === correct && gptAnswer === correct) {
    result = '✅ You and GPT both got it right!';
  } else if (human === correct && gptAnswer !== correct) {
    result = `🟡 You were right! GPT said "${gptAnswer}".`;
  } else if (human !== correct && gptAnswer === correct) {
    result = `🟡 GPT was right. You chose "${human}".`;
  } else {
    result = `❌ Both of you were wrong. You chose "${human}", GPT chose "${gptAnswer}". Correct answer: "${correct}".`;
  }

  feedbackBox.innerText = result;
}

function showCorrectAnswer() {
  const correct = questions[currentIndex].answer;
  feedbackBox.innerText = `✅ Correct answer: ${correct}`;
}

function nextQuestion() {
  currentIndex = (currentIndex + 1) % questions.length;
  renderQuestion(currentIndex);
}

// Load the first question
renderQuestion(currentIndex);
