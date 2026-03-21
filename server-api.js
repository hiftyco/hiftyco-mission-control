// Simple API server that provides OpenClaw agent data
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PORT = process.env.PORT || 8080;

const MIME = {
  '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.ico': 'image/x-icon'
};

function getOpenClawAgents() {
  try {
    // Try to get session info from OpenClaw
    const sessions = JSON.parse(execSync('cat /data/.openclaw/workspace/.sessions.json 2>/dev/null || echo "[]"').toString());
    
    if (sessions.length > 0) {
      return sessions.map(s => ({
        id: s.label || s.agentId || 'unknown',
        name: s.label || s.agentId || 'Unknown Agent',
        status: s.status || 'active',
        task: s.current_task || s.message || 'Processing...',
        model: s.model || 'unknown',
        updated: s.updatedAt || Date.now()
      }));
    }
  } catch (e) {}
  
  // Default agents if no live data
  return [
    { id: 'ollie', name: 'Ollie', status: 'active', task: 'Leading team strategy', model: 'MiniMax-M2.5' },
    { id: 'mintytrades', name: 'MintyTrades', status: 'active', task: 'Analyzing BTC RSI', model: 'kimi-k2.5:cloud' },
    { id: 'hiftycodes', name: 'HiftyCodes', status: 'active', task: 'Building features', model: 'minimax-m2.5' },
    { id: 'hiftyanalyst', name: 'HiftyAnalyst', status: 'active', task: 'Computing P&L', model: 'qwen3.5:397b' },
    { id: 'hiftyriskmanager', name: 'HiftyRisk', status: 'active', task: 'Monitoring risk', model: 'kimi-k2.5:cloud' },
  ];
}

const server = http.createServer((req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }
  
  // API endpoints
  if (req.url === '/api/agents') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ agents: getOpenClawAgents(), timestamp: Date.now() }));
    return;
  }
  
  if (req.url === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', agents: getOpenClawAgents().length }));
    return;
  }
  
  // Serve static files
  let fp = req.url === '/' ? '/index.html' : req.url;
  fp = path.join(__dirname, fp);
  
  // Security: prevent directory traversal
  if (!fp.startsWith(__dirname)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  
  fs.readFile(fp, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not Found: ' + req.url);
      return;
    }
    const ext = path.extname(fp);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'text/plain' });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Hifty Co Mission Control API running on http://localhost:${PORT}`);
});
