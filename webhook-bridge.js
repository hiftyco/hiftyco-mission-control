#!/usr/bin/env node
/**
 * Webhook Bridge - Connects Telegram to OpenClaw Gateway
 * 
 * Usage: OPENCLAW_TOKEN=your-token node webhook-bridge.js
 * 
 * Environment:
 *   OPENCLAW_URL    - WebSocket URL (default: ws://127.0.0.1:18789)
 *   OPENCLAW_TOKEN  - Your OpenClaw token
 *   PORT            - HTTP port (default: 3000)
 */

const http = require('http');
const https = require('https');
const WebSocket = require('ws');

const CONFIG = {
  openclawUrl: process.env.OPENCLAW_URL || 'ws://127.0.0.1:18789',
  token: process.env.OPENCLAW_TOKEN || '',
  port: process.env.PORT || 3000
};

let ws = null;
let reconnectDelay = 1000;
let connected = false;

// Connect to OpenClaw Gateway
function connect() {
  console.log('[bridge] connecting to', CONFIG.openclawUrl);
  
  ws = new WebSocket(CONFIG.openclawUrl, {
    headers: CONFIG.token ? { 'Authorization': `Bearer ${CONFIG.token}` } : {}
  });
  
  ws.on('open', () => {
    console.log('[bridge] ✅ connected to OpenClaw');
    connected = true;
    reconnectDelay = 1000;
  });
  
  ws.on('message', (data) => {
    try {
      const frame = JSON.parse(data.toString());
      console.log('[gateway →]', JSON.stringify(frame).slice(0, 100));
      
      // Forward response back to Telegram
      if (frame.content || frame.message) {
        sendToTelegram(frame.content || frame.message);
      }
    } catch (e) {
      console.log('[gateway → raw]', data.toString().slice(0, 100));
    }
  });
  
  ws.on('close', () => {
    console.log('[bridge] ❌ disconnected, retry in', reconnectDelay + 'ms');
    connected = false;
    setTimeout(connect, reconnectDelay);
    reconnectDelay = Math.min(reconnectDelay * 2, 30000);
  });
  
  ws.on('error', (err) => {
    console.log('[bridge] ⚠️ error:', err.message);
  });
}

// Send to Telegram (hardcoded for demo - in production, use env vars)
function sendToTelegram(text) {
  const botToken = '8336220320:AAEdlKG4WO7AZW10WT_Ab8v6KQSi58VHeWY';
  const chatId = '7140076919';
  
  const postData = JSON.stringify({
    chat_id: chatId,
    text: text,
    parse_mode: 'Markdown'
  });
  
  const options = {
    hostname: 'api.telegram.org',
    path: `/bot${botToken}/sendMessage`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };
  
  const req = https.request(options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      if (res.statusCode === 200) {
        console.log('[telegram] ✅ sent');
      } else {
        console.log('[telegram] ❌', res.statusCode, data.slice(0, 50));
      }
    });
  });
  
  req.on('error', (e) => console.log('[telegram] ❌', e.message));
  req.write(postData);
  req.end();
}

// Handle incoming Telegram updates
function handleTelegramUpdate(req, res) {
  if (req.method !== 'POST') {
    res.writeHead(405);
    res.end('Method not allowed');
    return;
  }
  
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', () => {
    try {
      const update = JSON.parse(body);
      if (update.message && update.message.text) {
        const text = update.message.text;
        console.log('[telegram] 📥', text.slice(0, 50));
        
        // Forward to OpenClaw
        if (ws && connected) {
          ws.send(JSON.stringify({
            type: 'message',
            content: text,
            chatId: update.message.chat.id
          }));
        }
      }
      res.writeHead(200);
      res.end('OK');
    } catch (e) {
      console.log('[bridge] ❌ parse error:', e.message);
      res.writeHead(400);
      res.end('Bad request');
    }
  });
}

// Health check
function handleHealth(req, res) {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: connected ? 'connected' : 'disconnected' }));
}

// Start server
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  if (req.url === '/health') {
    handleHealth(req, res);
  } else if (req.url === '/webhook') {
    handleTelegramUpdate(req, res);
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(CONFIG.port, () => {
  console.log('🚀 Bridge running on http://localhost:' + CONFIG.port);
  console.log('📡 Webhook: http://localhost:' + CONFIG.port + '/webhook');
  connect();
});
