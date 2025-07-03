const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');

const app = express();

// Allow GitHub Pages frontend
app.use(cors({
  origin: 'https://camsrivastava.github.io',
  methods: ['POST'],
}));

app.use(express.json());
app.use(express.static('.'));

// 🔁 Chat route
app.post('/chat', async (req, res) => {
  const userMessage = req.body.message;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: userMessage }],
      stream: true,
    }),
  });

  res.setHeader('Content-Type', 'text/event-stream');

  response.body.on('data', (chunk) => {
    const lines = chunk.toString().split('\n').filter(line => line.trim());
    for (const line of lines) {
      if (line === 'data: [DONE]') return;
      const json = JSON.parse(line.replace(/^data: /, ''));
      const token = json.choices?.[0]?.delta?.content || '';
      res.write(token);
    }
  });

  response.body.on('end', () => {
    res.end();
  });
});

// 🖍 Highlight route
app.post('/highlight', async (req, res) => {
  const questionText = req.body.question;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a clinical reasoning assistant. Highlight the most diagnostically important parts of the input by wrapping them in <mark> tags. Return only the modified HTML version of the input question. Do not add any extra text.`
        },
        {
          role: 'user',
          content: questionText
        }
      ]
    }),
  });

  const json = await response.json();
  const highlightedHTML = json.choices?.[0]?.message?.content || '';
  res.json({ highlighted: highlightedHTML });
});

// 🧠 Diagnose route
app.post('/diagnose', async (req, res) => {
  const { question, options, history } = req.body;

  const systemPrompt = `
You are taking a multiple-choice clinical image challenge quiz, but you are NOT shown the image — only the question text and the answer options.

The human can see the image, so your job is to ask them ONE highly specific image-related question at a time.

Your goal is to reach an answer with the highest possible diagnostic certainty — close to 100%. 
Take your time. Be methodical. Even if you think you know the answer early, continue investigating to rule out other possibilities or confirm your thinking.

Do NOT jump to a final answer quickly. Ask image-related follow-up questions until you have a clear and complete picture. When you're confident, respond like this:

"Based on your interpretation, I believe the correct answer is: [ANSWER]."
`;



  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `Question: ${question}\nOptions:\n${options.map(o => o.label).join('\n')}` },
    ...history
  ];

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: messages,
      stream: false,
    }),
  });

  const json = await response.json();
  const reply = json.choices?.[0]?.message?.content || '[No reply]';
  res.json({ reply });
});

// 🔊 Start server
app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
