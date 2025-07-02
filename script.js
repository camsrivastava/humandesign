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
  div.textContent = `${sender}: ${text}`;
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
  last.textContent = `GPT: ${text}`;
  chatBox.scrollTop = chatBox.scrollHeight;
}
