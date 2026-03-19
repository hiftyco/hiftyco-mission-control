/**
 * OLLIE System Bridge v1.0
 * Pure Node.js - ZERO npm dependencies
 * Run: OPENCLAW_TOKEN=$(openclaw config get gateway.auth.token) node ollie-bridge.js
 */
const http = require('http');
const os = require('os');
const { exec } = require('child_process');

const PORT = 19988;
let lastCpu = { idle: 0, total: 0 };
let lastNet = { rx: 0, tx: 0, time: Date.now() };
let openclawData = { sessions: [], cron: [], channels: [], health: {} };

// CPU Usage
function getCpuUsage(cb) {
  const cpus = os.cpus();
  let idle = 0, total = 0;
  cpus.forEach(cpu => {
    for (let type in cpu.times) total += cpu.times[type];
    idle += cpu.times.idle;
  });
  const diffIdle = idle - lastCpu.idle;
  const diffTotal = total - lastCpu.total;
  const usage = diffTotal > 0 ? Math.round((1 - diffIdle / diffTotal) * 100) : 0;
  lastCpu = { idle, total };
  cb(usage);
}

// CPU Temp
function getCpuTemp(cb) {
  const platform = os.platform();
  if (platform === 'linux') {
    exec('cat /sys/class/thermal/thermal_zone0/temp 2>/dev/null', (e, out) => {
      if (e || !out) { cb(null); return; }
      cb(Math.round(parseInt(out.trim()) / 1000));
    });
  } else if (platform === 'darwin') {
    exec('osx-cpu-temp 2>/dev/null || echo ""', (e, out) => {
      if (e || !out) { cb(null); return; }
      cb(parseFloat(out.split('°')[0]) || null);
    });
  } else {
    cb(null);
  }
}

// Memory
function getMemory() {
  const t = os.totalmem(), f = os.freemem();
  return { total: Math.round(t/1073741824), used: Math.round((t-f)/1073741824), pct: Math.round((t-f)/t*100) };
}

// Disk
function getDisk(cb) {
  exec("df -k / | tail -1 | awk '{print $2,$3,$5}'", (e, out) => {
    if (e || !out) { cb({ total: 0, used: 0, pct: 0 }); return; }
    const p = out.trim().split(/\s+/);
    cb({ total: Math.round(p[0]/1024/1024), used: Math.round(p[1]/1024), pct: parseInt(p[2]) });
  });
}

// Network
function getNetStats(cb) {
  exec("cat /proc/net/dev | grep -v lo | head -1", (e, out) => {
    if (e || !out) { cb({ rx: 0, tx: 0 }); return; }
    const m = out.match(/(\d+)\s+(\d+)/);
    if (!m) { cb({ rx: 0, tx: 0 }); return; }
    const now = Date.now(), dt = (now - lastNet.time) / 1000;
    const rx = Math.round((parseInt(m[1]) - lastNet.rx) / dt / 1024);
    const tx = Math.round((parseInt(m[2]) - lastNet.tx) / dt / 1024);
    lastNet = { rx: parseInt(m[1]), tx: parseInt(m[2]), time: now };
    cb({ rx: isNaN(rx)?0:rx, tx: isNaN(tx)?0:tx });
  });
}

// Metrics endpoint
function getMetrics(cb) {
  getCpuUsage(cpu => {
    getCpuTemp(temp => {
      const mem = getMemory();
      getDisk(disk => {
        getNetStats(net => {
          cb({
            cpu_pct: cpu,
            cpu_temp_c: temp,
            ram_total_gb: mem.total,
            ram_used_gb: mem.used,
            ram_pct: mem.pct,
            disk_total_gb: disk.total,
            disk_used_gb: disk.used,
            disk_pct: disk.pct,
            net_download_kbps: net.rx,
            net_upload_kbps: net.tx,
            net_interface: 'eth0',
            load_avg_1m: os.loadavg()[0].toFixed(2),
            process_count: os.cpus().length,
            hostname: os.hostname(),
            platform: os.platform(),
            arch: os.arch(),
            node_uptime_s: Math.round(os.uptime()),
            ts: Date.now()
          });
        });
      });
    });
  });
}

// Health endpoint
function getHealth() {
  return { status: 'ok', bridge: '1.0.0', gateway: 'connected', ts: Date.now() };
}

// OpenClaw endpoint (placeholder - would connect to real gateway)
function getOpenClaw() {
  return { sessions: [], cron: [], channels: [], health: {}, timestamp: Date.now() };
}

// CORS headers
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json'
};

// Server
const server = http.createServer((req, res) => {
  Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
  
  const path = req.url.split('?')[0];
  
  if (path === '/metrics') {
    getMetrics(m => { res.writeHead(200); res.end(JSON.stringify(m)); });
  } else if (path === '/health') {
    res.writeHead(200); res.end(JSON.stringify(getHealth()));
  } else if (path === '/openclaw') {
    res.writeHead(200); res.end(JSON.stringify(getOpenClaw()));
  } else {
    res.writeHead(404); res.end(JSON.stringify({ error: 'Not found' }));
  }
});

// Banner
console.log('\n╔══════════════════════════════════════════╗');
console.log('║  OLLIE SYSTEM BRIDGE v1.0               ║');
console.log('╠══════════════════════════════════════════╣');
console.log('║  Metrics: http://127.0.0.1:' + PORT + '/metrics ║');
console.log('║  OpenClaw: http://127.0.0.1:' + PORT + '/openclaw ║');
console.log('║  Health:   http://127.0.0.1:' + PORT + '/health   ║');
console.log('╠══════════════════════════════════════════╣');
const token = process.env.OPENCLAW_TOKEN;
console.log('║  Token: ' + (token ? '✓ SET' : '✗ NOT SET') + '                      ║');
console.log('╚══════════════════════════════════════════╝\n');

if (!token) {
  console.log('To set token run:');
  console.log('  OPENCLAW_TOKEN=$(openclaw config get gateway.auth.token) node ollie-bridge.js\n');
}

server.listen(PORT, () => {
  console.log('OLLIE Bridge running on port ' + PORT);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nOLLIE Bridge shutting down...');
  server.close();
  process.exit(0);
});

// OLLIE SYSTEMS ONLINE. READY, SIR.
