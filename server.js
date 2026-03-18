const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());
const BOT_TOKEN = '8336220320:AAEdlKG4WO7AZW10WT_Ab8v6KQSi58VHeWY';
app.post('/api/telegram/send', async (req, res) => {
  try {
    const { chat_id, text } = req.body;
    await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      chat_id,
      text
    });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.get('/api/telegram/updates', async (req, res) => {
  try {
    const offset = req.query.offset || 0;
    const response = await axios.get(`https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?offset=${offset}`);
    res.json(response.data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.use(express.static('.'));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
