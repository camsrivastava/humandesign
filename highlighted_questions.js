
let currentQuestionIndex = 0;
let questions = benchmark;

function showQuestion(index) {
  const q = questions[index];

  document.getElementById('question-image').innerHTML = `
    <img src="${q.image_path.replace('\\', '/')}" alt="Case Image" style="max-width:100%; max-height:300px;" />
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
    const id = `option-${i}`;
    form.innerHTML += `
      <div>
        <input type="radio" id="${id}" name="answer" value="${opt.label}">
        <label for="${id}">${opt.label}</label>
      </div>
    `;
  });

  document.getElementById('answer-feedback').innerText = '';
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
    feedback.innerText = `❌ Incorrect. You chose "${selected.value}", but the correct answer is "${correct}".`;
    feedback.style.color = 'red';
  }
});

document.getElementById('show-answer').addEventListener('click', () => {
  const correct = questions[currentQuestionIndex].answer;
  document.getElementById('answer-feedback').innerText = `✅ Correct answer: ${correct}`;
  document.getElementById('answer-feedback').style.color = 'blue';
});

document.getElementById('next-question').addEventListener('click', () => {
  currentQuestionIndex = (currentQuestionIndex + 1) % questions.length;
  showQuestion(currentQuestionIndex);
});

showQuestion(currentQuestionIndex);
