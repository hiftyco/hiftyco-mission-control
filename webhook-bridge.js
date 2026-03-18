#!/usr/bin/env node
/**
 * Webhook Bridge - Connects Telegram to OpenClaw
 * 
 * This bridge receives messages from Telegram and forwards them to OpenClaw
 * via the gateway WebSocket, then returns the response.
 * 
 * Usage: node webhook-bridge.js
 * 
 * Environment:
 *   TELEGRAM_BOT_TOKEN - Your Telegram bot token
 *   TELEGRAM_CHAT_ID  - Your chat ID
 *   OPENCLAW_WS       - OpenClaw WebSocket URL (default: ws://127.0.0.1:18789)
 *   PORT              - HTTP server port (default: 3000)
 */

const http = require('http');
const https = require('https');
const { WebSocketClient } = require('ws');

const CONFIG = {
  botToken: process.env.TELEGRAM_BOT_TOKEN || '8336220320:AAEdlKG4WO7AZW10WT_Ab8v6KQSi58VHeWY',
  chatId: process.env.TELEGRAM_CHAT_ID || '7140076919',
  openclawWs: process.env.OPENCLAW_WS || 'ws://127.0.0.1:18789',
  port: process.env.PORT || 3000,
  apiBase: 'https://api.telegram.org/bot'
};

// Simple WebSocket client
let ws = null;
let messageQueue = [];
let connected = false;

// Connect to OpenClaw WebSocket
function connectOpenClaw() {
  console.log('🔌 Connecting to OpenClaw...');
  
  try {
    ws = new WebSocketClient();
    
    ws.on('open', () => {
      console.log('✅ Connected to OpenClaw');
      connected = true;
      // Process queued messages
      while (messageQueue.length > 0) {
        const msg = messageQueue.shift();
        sendToOpenClaw(msg);
      }
    });
    
    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        console.log('📨 Received from OpenClaw:', msg.type || 'message');
        
        // Forward response to Telegram
        if (msg.content || msg.message) {
          const text = msg.content || msg.message;
          sendToTelegram(text);
        }
      } catch (e) {
        console.log('📨 Raw message:', data.toString().substring(0, 100));
      }
    });
    
    ws.on('close', () => {
      console.log('❌ Disconnected from OpenClaw');
      connected = false;
      // Reconnect after 5 seconds
      setTimeout(connectOpenClaw, 5000);
    });
    
    ws.on('error', (err) => {
      console.log('⚠️ WebSocket error:', err.message);
    });
    
    ws.connect(CONFIG.openclawWs);
  } catch (e) {
    console.log('❌ Failed to connect:', e.message);
    setTimeout(connectOpenClaw, 5000);
  }
}

// Send message to OpenClaw
function sendToOpenClaw(text) {
  const payload = JSON.stringify({
    type: 'message',
    content: text,
    chatId: CONFIG.chatId
  });
  
  if (connected && ws) {
    ws.send(payload);
    console.log('📤 Sent to OpenClaw:', text.substring(0, 50));
  } else {
    console.log('⏳ Queued for OpenClaw:', text.substring(0, 50));
    messageQueue.push(text);
  }
}

// Send message to Telegram
function sendToTelegram(text) {
  const postData = JSON.stringify({
    chat_id: CONFIG.chatId,
    text: text
  });
  
  const options = {
    hostname: 'api.telegram.org',
    path: `/bot${CONFIG.botToken}/sendMessage`,
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
        console.log('✅ Sent to Telegram');
      } else {
        console.log('❌ Telegram error:', res.statusCode, data.substring(0, 100));
      }
    });
  });
  
  req.on('error', (e) => {
    console.log('❌ Failed to send to Telegram:', e.message);
  });
  
  req.write(postData);
  req.end();
}

// Telegram Webhook endpoint
function handleWebhook(req, res) {
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
        const chatId = update.message.chat.id;
        
        console.log('📥 Received from Telegram:', text.substring(0, 50));
        
        // Forward to OpenClaw
        sendToOpenClaw(text);
      }
      
      res.writeHead(200);
      res.end('OK');
    } catch (e) {
      console.log('❌ Webhook error:', e.message);
      res.writeHead(400);
      res.end('Bad request');
    }
  });
}

// Health check endpoint
function handleHealth(req, res) {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    status: connected ? 'connected' : 'disconnected',
    openclaw: CONFIG.openclawWs,
    telegram: 'configured'
  }));
}

// Start server
const server = http.createServer((req, res) => {
  // CORS headers
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
    handleWebhook(req, res);
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(CONFIG.port, () => {
  console.log('🚀 Webhook Bridge running on port', CONFIG.port);
  console.log('📡 Webhook URL: http://localhost:' + CONFIG.port + '/webhook');
  console.log('💬 Telegram will send messages here');
  connectOpenClaw();
});
