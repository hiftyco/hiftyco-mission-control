const express = require('express');
const axios = require('axios');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

const BOT_TOKEN = process.env.BOT_TOKEN || '8336220320:AAEdlKG4WO7AZW10WT_Ab8v6KQSi58VHeWY';
const AUTHORIZED_CHAT_ID = process.env.CHAT_ID || '7140076919';
const API_SECRET = process.env.API_SECRET || 'hifty-mc-secret-2026';

app.use(express.json());
app.use(express.static(path.join(__dirname, '.')));

function isAuthorized(req) {
    return req.headers['x-api-key'] === API_SECRET;
}

// Send to Telegram
app.post('/api/telegram/send', async (req, res) => {
    try {
        if (!isAuthorized(req)) return res.status(401).json({ error: 'Unauthorized' });
        const { chat_id, text } = req.body;
        if (chat_id !== AUTHORIZED_CHAT_ID) return res.status(403).json({ error: 'Forbidden' });
        
        await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            chat_id, text, parse_mode: 'HTML'
        });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Get updates from Telegram
app.get('/api/telegram/updates', async (req, res) => {
    try {
        if (!isAuthorized(req)) return res.status(401).json({ error: 'Unauthorized' });
        const response = await axios.get(`https://api.telegram.org/bot${BOT_TOKEN}/getUpdates`, { params: { limit: 5 } });
        const filtered = (response.data.result || []).filter(u => u.message && String(u.message.chat.id) === AUTHORIZED_CHAT_ID);
        res.json({ success: true, updates: filtered });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🤖 Mission Control running on port ${PORT}`);
});
