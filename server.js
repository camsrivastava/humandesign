const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');

const app = express();

// Allow requests from your GitHub Pages frontend
app.use(cors({
  origin: 'https://camsrivastava.github.io',
  methods: ['POST'],
}));

app.use(express.json());
app.use(express.static('.'));

// 🔁 Chat route: streams GPT-4o-mini responses
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

// 🆕 Highlight route: returns question with <mark> tags
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

// Start the server
app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
