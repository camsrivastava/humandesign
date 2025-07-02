const cors = require('cors');

app.use(cors({
  origin: 'https://camsrivastava.github.io', // Replace with your actual GitHub Pages domain
  methods: ['POST'],
}));

const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

const OPENAI_API_KEY = 'your-api-key-here';

app.post('/chat', async (req, res) => {
  const userMessage = req.body.message;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
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

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
