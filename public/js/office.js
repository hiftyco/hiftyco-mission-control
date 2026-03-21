// Hifty Co Pixel Art Office - LIVE CONNECTED VERSION
// Connects to OpenClaw API for real-time agent operations

const PX = 4;

// Enhanced color palette
const PALETTE = {
  floor: '#0D1117', floorLine: '#161B22', floorAccent: '#21262D',
  wall: '#010409', wallAccent: '#161B22', wallGlow: '#238636',
  desk: '#21262D', deskTop: '#30363D', deskLeg: '#161B22',
  monitor: '#161B22', screen: '#0D1117', screenGlow: '#58A6FF',
  monitorActive: '#0D1117', screenGlowActive: '#3FB950',
  chair: '#21262D', chairSeat: '#30363D',
  plant: '#161B22', plantPot: '#6E40C9', plantLeaf: '#238636', plantLeaf2: '#3FB950',
  serverRack: '#161B22', serverLed: '#3FB950', serverLed2: '#58A6FF', serverLedOff: '#484F58',
  coffeeMachine: '#21262D', coffeeLight: '#F78166',
  roundTable: '#21262D', tableTop: '#30363D',
  sofa: '#21262D', sofaCushion: '#30363D',
  bookshelf: '#21262D', 
  books: ['#DA3633','#A371F7','#3FB950','#58A6FF','#F78166','#8B949E'],
  waterCooler: '#21262D', coolerWater: '#58A6FF',
  filingCabinet: '#21262D', filingDraw: '#30363D',
  windowGlass: '#0D1117', windowFrame: '#21262D', windowStars: '#58A6FF',
  wallart: '#21262D', wallartAccent: '#30363D',
  rug: '#161B22', rugPattern: '#21262D',
  clock: '#21262D', clockHands: '#58A6FF',
  globe: '#161B22', globeLand: '#238636', globeWater: '#58A6FF',
  flag: '#DA3633', flagPole: '#8B949E',
  trophy: '#F0B429', trophyStar: '#F0B429',
};

let canvas, ctx, tick = 0;
let lastFetch = 0;
let liveAgents = [];
let liveLogs = [];
let weather = { temp_c: 18, desc: 'Clear' };
let btcPrice = 0, fngIndex = 50;

// Agent definitions matching OpenClaw
const AGENTS = [
  {id:'ollie',name:'Ollie',role:'Chief of Command',model:'MiniMax-M2.5',color:'#F0B429',homeX:0.08,homeY:0.20,emoji:'👔'},
  {id:'mintytrades',name:'MintyTrades',role:'Trading',model:'kimi-k2.5:cloud',color:'#3FB950',homeX:0.26,homeY:0.20,emoji:'📈'},
  {id:'hiftycodes',name:'HiftyCodes',role:'Development',model:'minimax-m2.5',color:'#58A6FF',homeX:0.44,homeY:0.20,emoji:'💻'},
  {id:'hiftyanalyst',name:'HiftyAnalyst',role:'Analysis',model:'qwen3.5:397b',color:'#A371F7',homeX:0.62,homeY:0.20,emoji:'📊'},
  {id:'hiftyriskmanager',name:'HiftyRisk',role:'Risk Mgmt',model:'kimi-k2.5:cloud',color:'#F78166',homeX:0.80,homeY:0.20,emoji:'🛡️'},
];

// Furniture positions
const FUR = {
  serverRack:   {x:0.92,y:0.12,w:10,h:18},
  coffeeMachine:{x:0.92,y:0.38,w:6,h:9},
  roundTable:   {x:0.50,y:0.65,r:8},
  sofa:         {x:0.25,y:0.82,w:14,h:6},
  bookshelf:    {x:0.08,y:0.62,w:8,h:16},
  plant1:       {x:0.92,y:0.62,w:4,h:6},
  plant2:       {x:0.75,y:0.82,w:4,h:6},
  waterCooler:  {x:0.08,y:0.38,w:4,h:10},
  filingCabinet:{x:0.17,y:0.50,w:5,h:10},
  clock:        {x:0.35,y:0.04,r:3},
  globe:        {x:0.65,y:0.04,r:3},
  trophy:       {x:0.50,y:0.04,r:2},
  flag:         {x:0.08,y:0.04,w:1,h:8},
  rug:          {x:0.50,y:0.50,w:30,h:12},
};

let animAgents = AGENTS.map(a => ({
  ...a,
  x: a.homeX, y: a.homeY,
  state: 'working', task: 'Initializing...',
  phase: 'at_desk', target: null,
  walkFrame: 0,
  facing: 1,
  thought: '',
  bubbleTimer: 0,
  atDeskTime: 2000 + Math.random() * 3000,
  lastUpdate: Date.now()
}));

export function init(id) {
  canvas = document.getElementById(id);
  if (!canvas) return;
  ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  resize();
  window.addEventListener('resize', resize);
  
  canvas.addEventListener('mousemove', handleHover);
  canvas.addEventListener('click', handleClick);
  
  addLog('info', '🎨 Office initializing...');
  addLog('info', '🔌 Connecting to OpenClaw...');
  
  startLoop();
  fetchLiveData();
  fetchWeather();
  fetchBTC();
  
  addLog('success', '✅ Connected to OpenClaw');
  updateAgentListDOM();
}

function resize() {
  if (!canvas) return;
  const r = canvas.parentElement.getBoundingClientRect();
  canvas.width = Math.floor(r.width / PX) * PX;
  canvas.height = Math.floor(r.height / PX) * PX;
  ctx.imageSmoothingEnabled = false;
}

function startLoop() {
  setInterval(() => {
    tick++;
    update();
    draw();
    updateDOM();
  }, 80);
}

async function fetchLiveData() {
  try {
    // Fetch from OpenClaw API
    const resp = await fetch('/api/agents');
    if (resp.ok) {
      const data = await resp.json();
      liveAgents = data.agents || [];
      liveAgents.forEach(la => {
        const aa = animAgents.find(a => a.id === la.id || a.name.toLowerCase().includes(la.id));
        if (aa) {
          aa.state = la.status === 'active' ? 'working' : 'idle';
          aa.task = la.task || la.current_action || 'Active';
          aa.lastUpdate = Date.now();
        }
      });
      
      // Add to logs
      liveAgents.forEach(la => {
        if (la.status === 'active') {
          addLog('info', `${la.name}: ${la.task}`);
        }
      });
      
      document.getElementById('gatewayStatus')?.setAttribute('class', 'panel-badge green');
      document.getElementById('gatewayStatus') && (document.getElementById('gatewayStatus').textContent = 'LIVE');
    }
  } catch (e) {
    // Fallback demo mode
    demoMode();
  }
  
  setTimeout(fetchLiveData, 5000);
}

function demoMode() {
  const tasks = {
    ollie: ['Leading strategy', 'Reviewing KPIs', 'Team coordination', 'Delegating tasks'],
    mintytrades: ['Analyzing BTC', 'Scanning RSI', 'Finding setups', 'Trade signals'],
    hiftycodes: ['Building features', 'Code review', 'Bug fixes', 'Deploying'],
    hiftyanalyst: ['Computing P&L', 'Generating reports', 'Data analysis', 'Research'],
    hiftyriskmanager: ['Risk assessment', 'Compliance check', 'Monitoring', 'Alerts'],
  };
  
  let idx = 0;
  setInterval(() => {
    const agent = animAgents[idx % animAgents.length];
    const agentTasks = tasks[agent.id] || tasks.ollie;
    agent.task = agentTasks[Math.floor(Math.random() * agentTasks.length)];
    agent.state = Math.random() > 0.3 ? 'working' : 'thinking';
    agent.thought = agent.task;
    agent.bubbleTimer = 40;
    
    addLog('info', `${agent.name}: ${agent.task}`);
    idx++;
  }, 3500);
  
  document.getElementById('gatewayStatus') && (document.getElementById('gatewayStatus').textContent = 'DEMO');
}

async function fetchWeather() {
  try {
    const r = await fetch('https://wttr.in/Kingston,Ontario?format=j1');
    if (r.ok) {
      const d = await r.json();
      weather = { temp_c: parseInt(d.current_condition[0].temp_C), desc: d.current_condition[0].weatherDesc[0].value };
    }
  } catch (e) {}
  setTimeout(fetchWeather, 60000);
}

async function fetchBTC() {
  try {
    const r = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true');
    if (r.ok) {
      const d = await r.json();
      btcPrice = d.bitcoin.usd;
      const change = d.bitcoin.usd_24h_change;
      document.getElementById('btcPrice') && (document.getElementById('btcPrice').textContent = '$' + btcPrice.toLocaleString());
      document.getElementById('btcChange') && (document.getElementById('btcChange').textContent = (change >= 0 ? '+' : '') + change.toFixed(2) + '% (24h)');
    }
  } catch (e) {}
  setTimeout(fetchBTC, 30000);
}

function update() {
  animAgents.forEach(a => {
    if (a.bubbleTimer > 0) a.bubbleTimer--;
    
    // Wandering logic
    if (a.phase === 'at_desk') {
      a.atDeskTime -= 80;
      if (a.atDeskTime <= 0 && Math.random() < 0.1) {
        const targets = ['serverRack', 'coffeeMachine', 'roundTable', 'sofa', 'bookshelf', 'waterCooler'];
        a.target = targets[Math.floor(Math.random() * targets.length)];
        a.phase = 'walking';
        a.facing = FUR[a.target].x > a.homeX ? 1 : -1;
      }
    } else if (a.phase === 'walking' && a.target) {
      const t = FUR[a.target];
      const dx = t.x - a.x;
      const dy = t.y - a.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      if (dist < 0.02) {
        a.x = t.x; a.y = t.y;
        a.phase = 'at_target';
        a.thought = getThought(a.target);
        a.atTargetTime = 3000 + Math.random() * 4000;
      } else {
        a.x += (dx/dist) * 0.008;
        a.y += (dy/dist) * 0.008;
        a.walkFrame = (a.walkFrame + 0.25) % 4;
      }
    } else if (a.phase === 'at_target') {
      a.atTargetTime -= 80;
      if (a.atTargetTime <= 0 && Math.random() < 0.15) {
        a.phase = 'walking_home';
        a.facing = a.homeX > a.x ? 1 : -1;
      }
    } else if (a.phase === 'walking_home') {
      const dx = a.homeX - a.x;
      const dy = a.homeY - a.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      if (dist < 0.02) {
        a.x = a.homeX; a.y = a.homeY;
        a.phase = 'at_desk';
        a.target = null;
        a.thought = a.task;
        a.atDeskTime = 3000 + Math.random() * 5000;
      } else {
        a.x += (dx/dist) * 0.01;
        a.y += (dy/dist) * 0.01;
        a.walkFrame = (a.walkFrame + 0.25) % 4;
      }
    }
  });
}

function getThought(target) {
  const thoughts = {
    serverRack: ['Checking logs...', 'All systems OK', 'Uptime: 99.9%'],
    coffeeMachine: ['☕ Fuel up!', 'Espresso time', 'Caffeine boost'],
    roundTable: ['🗣️ Team sync', 'Brainstorming', 'Planning strategy'],
    sofa: ['😴 Quick rest', 'Recharging', 'Taking five'],
    bookshelf: ['📚 Researching', 'Reading docs', 'Learning'],
    waterCooler: ['💧 Hydrating', 'Water break', 'Staying fresh'],
  };
  const arr = thoughts[target] || ['...'];
  return arr[Math.floor(Math.random() * arr.length)];
}

function draw() {
  if (!ctx) return;
  const W = canvas.width, H = canvas.height;
  
  // Background
  ctx.fillStyle = PALETTE.wall;
  ctx.fillRect(0, 0, W, H);
  
  // Floor with tiles
  ctx.fillStyle = PALETTE.floor;
  ctx.fillRect(0, H*0.15, W, H*0.85);
  
  // Floor grid
  ctx.fillStyle = PALETTE.floorLine;
  for (let x = 0; x < W; x += 12*PX) {
    ctx.fillRect(x, H*0.15, 1*PX, H*0.85);
  }
  for (let y = H*0.15; y < H; y += 8*PX) {
    ctx.fillRect(0, y, W, 1*PX);
  }
  
  // Accent floor line
  ctx.fillStyle = PALETTE.floorAccent;
  ctx.fillRect(0, H*0.15, W, 2*PX);
  
  // Wall decorations
  drawWindow(W*0.30, 2*PX, 24*PX, 12*PX);
  drawRug(FUR.rug.x * W, FUR.rug.y * H, FUR.rug.w * PX, FUR.rug.h * PX);
  drawClock(FUR.clock.x * W, FUR.clock.y * H);
  drawGlobe(FUR.globe.x * W, FUR.globe.y * H);
  drawTrophy(FUR.trophy.x * W, FUR.trophy.y * H);
  drawFlag(FUR.flag.x * W, FUR.flag.y * H);
  
  // Furniture
  drawBookshelf(FUR.bookshelf.x * W, FUR.bookshelf.y * H, FUR.bookshelf.w * PX, FUR.bookshelf.h * PX);
  drawServerRack(FUR.serverRack.x * W, FUR.serverRack.y * H, FUR.serverRack.w * PX, FUR.serverRack.h * PX);
  drawCoffeeMachine(FUR.coffeeMachine.x * W, FUR.coffeeMachine.y * H);
  drawRoundTable(FUR.roundTable.x * W, FUR.roundTable.y * H, FUR.roundTable.r * PX);
  drawSofa(FUR.sofa.x * W, FUR.sofa.y * H, FUR.sofa.w * PX, FUR.sofa.h * PX);
  drawPlant(FUR.plant1.x * W, FUR.plant1.y * H);
  drawPlant(FUR.plant2.x * W, FUR.plant2.y * H);
  drawWaterCooler(FUR.waterCooler.x * W, FUR.waterCooler.y * H);
  drawFilingCabinet(FUR.filingCabinet.x * W, FUR.filingCabinet.y * H);
  
  // Agents at desks
  animAgents.filter(a => a.phase === 'at_desk').forEach(a => drawDesk(a));
  
  // Walking agents
  animAgents.filter(a => a.phase !== 'at_desk').forEach(drawAgent);
  
  // Overlay
  drawOverlay(W, H);
}

function drawWindow(x, y, w, h) {
  ctx.fillStyle = PALETTE.windowFrame;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = PALETTE.windowGlass;
  ctx.fillRect(x + PX, y + PX, w - 2*PX, h - 2*PX);
  // Stars at night
  if (Math.sin(tick * 0.05) > 0) {
    ctx.fillStyle = PALETTE.windowStars;
    for (let i = 0; i < 5; i++) {
      const sx = x + 4*PX + (i * 4 * PX);
      const sy = y + 3*PX + (i % 2) * 4*PX;
      ctx.fillRect(sx, sy, PX, PX);
    }
  }
  // Grid
  ctx.fillStyle = PALETTE.windowFrame;
  ctx.fillRect(x + w/2 - PX/2, y, PX, h);
  ctx.fillRect(x, y + h/2 - PX/2, w, PX);
}

function drawRug(x, y, w, h) {
  ctx.fillStyle = PALETTE.rug;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = PALETTE.rugPattern;
  ctx.fillRect(x + 2*PX, y + 2*PX, w - 4*PX, h - 4*PX);
}

function drawClock(x, y) {
  ctx.fillStyle = PALETTE.clock;
  ctx.beginPath(); ctx.arc(x, y, 4*PX, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = PALETTE.clockHands;
  // Hour hand
  const h = new Date().getHours() % 12;
  const m = new Date().getMinutes();
  const ha = (h * 30 + m * 0.5) * Math.PI / 180;
  ctx.fillRect(x, y, Math.cos(ha) * 2*PX, Math.sin(ha) * 2*PX);
  // Minute hand
  const ma = m * 6 * Math.PI / 180;
  ctx.fillRect(x, y, Math.cos(ma) * 3*PX, Math.sin(ma) * 3*PX);
}

function drawGlobe(x, y) {
  ctx.fillStyle = PALETTE.globeWater;
  ctx.beginPath(); ctx.arc(x, y, 3*PX, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = PALETTE.globeLand;
  ctx.fillRect(x - PX, y - PX, 2*PX, 2*PX);
}

function drawTrophy(x, y) {
  ctx.fillStyle = PALETTE.trophy;
  ctx.fillRect(x - PX, y, 2*PX, 3*PX);
  ctx.beginPath(); ctx.arc(x, y - PX, 2*PX, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = PALETTE.trophyStar;
  ctx.fillRect(x - PX, y - 2*PX, 2*PX, PX);
}

function drawFlag(x, y) {
  ctx.fillStyle = PALETTE.flagPole;
  ctx.fillRect(x, y, PX, 8*PX);
  ctx.fillStyle = PALETTE.flag;
  ctx.fillRect(x + PX, y, 3*PX, 2*PX);
}

function drawBookshelf(x, y, w, h) {
  ctx.fillStyle = PALETTE.bookshelf;
  ctx.fillRect(x, y, w, h);
  // Shelves
  for (let row = 0; row < 4; row++) {
    ctx.fillStyle = '#161B22';
    ctx.fillRect(x, y + row * 4*PX, w, PX);
    // Books
    for (let b = 0; b < 4; b++) {
      ctx.fillStyle = PALETTE.books[(row + b) % PALETTE.books.length];
      ctx.fillRect(x + 1*PX + b * 2*PX, y + 1*PX + row * 4*PX, PX, 2*PX);
    }
  }
}

function drawServerRack(x, y, w, h) {
  ctx.fillStyle = PALETTE.serverRack;
  ctx.fillRect(x, y, w, h);
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = '#0D1117';
    ctx.fillRect(x + PX, y + 1*PX + i * 3*PX, w - 2*PX, 2*PX);
    // LEDs
    const ledOn = Math.sin(tick * 0.08 + i) > 0;
    ctx.fillStyle = ledOn ? PALETTE.serverLed : PALETTE.serverLedOff;
    ctx.fillRect(x + 2*PX, y + 2*PX + i * 3*PX, PX, PX);
    ctx.fillStyle = ledOn ? PALETTE.serverLed2 : '#30363D';
    ctx.fillRect(x + 4*PX, y + 2*PX + i * 3*PX, PX, PX);
  }
}

function drawCoffeeMachine(x, y) {
  ctx.fillStyle = PALETTE.coffeeMachine;
  ctx.fillRect(x, y, 6*PX, 9*PX);
  ctx.fillStyle = '#0D1117';
  ctx.fillRect(x + PX, y + PX, 4*PX, 3*PX);
  const brewing = Math.sin(tick * 0.15) > 0;
  ctx.fillStyle = brewing ? PALETTE.coffeeLight : '#484F58';
  ctx.fillRect(x + 2*PX, y + 5*PX, 2*PX, PX);
}

function drawRoundTable(x, y, r) {
  ctx.fillStyle = PALETTE.roundTable;
  ctx.fillRect(x - r, y - 2*PX, r*2, 4*PX);
  ctx.fillStyle = PALETTE.tableTop;
  ctx.fillRect(x - r, y - 3*PX, r*2, PX);
  ctx.fillStyle = '#161B22';
  ctx.fillRect(x - PX, y, 2*PX, 2*PX);
}

function drawSofa(x, y, w, h) {
  ctx.fillStyle = PALETTE.sofa;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = PALETTE.sofaCushion;
  ctx.fillRect(x + PX, y + PX, w - 2*PX, h/2);
  ctx.fillRect(x + PX, y, w - 2*PX, PX);
}

function drawPlant(x, y) {
  ctx.fillStyle = PALETTE.plantPot;
  ctx.fillRect(x, y, 4*PX, 4*PX);
  ctx.fillStyle = PALETTE.plantLeaf;
  ctx.fillRect(x - PX, y - 3*PX, 2*PX, 4*PX);
  ctx.fillRect(x + 2*PX, y - 4*PX, 2*PX, 5*PX);
  ctx.fillRect(x, y - 6*PX, 2*PX, 3*PX);
}

function drawWaterCooler(x, y) {
  ctx.fillStyle = PALETTE.waterCooler;
  ctx.fillRect(x, y, 4*PX, 10*PX);
  ctx.fillStyle = PALETTE.coolerWater;
  ctx.fillRect(x + PX, y - 2*PX, 2*PX, 4*PX);
}

function drawFilingCabinet(x, y) {
  ctx.fillStyle = PALETTE.filingCabinet;
  ctx.fillRect(x, y, 5*PX, 10*PX);
  for (let i = 0; i < 2; i++) {
    ctx.fillStyle = PALETTE.filingDraw;
    ctx.fillRect(x + PX, y + 1*PX + i * 4*PX, 3*PX, 3*PX);
    ctx.fillStyle = '#484F58';
    ctx.fillRect(x + 2*PX, y + 2*PX + i * 4*PX, PX, PX);
  }
}

function drawDesk(a) {
  const x = a.x * canvas.width, y = a.y * canvas.height;
  const dw = 18*PX, dh = 8*PX;
  
  // Desk
  ctx.fillStyle = PALETTE.deskLeg;
  ctx.fillRect(x - PX, y + dh, 2*PX, 3*PX);
  ctx.fillRect(x + dw, y + dh, 2*PX, 3*PX);
  ctx.fillStyle = PALETTE.desk;
  ctx.fillRect(x - PX, y + 2*PX, dw + 2*PX, dh - 2*PX);
  ctx.fillStyle = PALETTE.deskTop;
  ctx.fillRect(x - 2*PX, y, dw + 4*PX, 2*PX);
  
  // Monitor
  const mw = 9*PX, mh = 7*PX;
  const mx = x + dw/2 - mw/2, my = y - mh - PX;
  ctx.fillStyle = PALETTE.monitor;
  ctx.fillRect(mx, my, mw, mh);
  const active = a.state === 'working';
  ctx.fillStyle = active ? PALETTE.monitorActive : '#1a1a1a';
  ctx.fillRect(mx + PX, my + PX, mw - 2*PX, mh - 2*PX);
  if (active) {
    ctx.fillStyle = PALETTE.screenGlowActive;
    ctx.fillRect(mx + 2*PX, my + 2*PX, mw - 4*PX, PX);
  }
  // Monitor stand
  ctx.fillStyle = PALETTE.monitor;
  ctx.fillRect(mx + mw/2 - PX, my + mh, 2*PX, 2*PX);
  
  // Chair
  ctx.fillStyle = PALETTE.chair;
  ctx.fillRect(x + dw/2 - 3*PX, y + dh + PX, 6*PX, 2*PX);
  ctx.fillStyle = PALETTE.chairSeat;
  ctx.fillRect(x + dw/2 - 2*PX, y + dh + 2*PX, 4*PX, PX);
  
  // Name
  ctx.fillStyle = a.color;
  ctx.font = `${4*PX}px monospace`;
  ctx.fillText(a.name.substring(0, 6), x + PX, y + dh + 5*PX);
}

function drawAgent(a) {
  const x = a.x * canvas.width, y = a.y * canvas.height;
  const bob = a.walkFrame > 2 ? -PX : 0;
  
  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.fillRect(x - 3*PX, y + 7*PX, 6*PX, 2*PX);
  
  // Body
  ctx.fillStyle = a.color;
  ctx.fillRect(x - 2*PX, y - 4*PX + bob, 4*PX, 5*PX);
  
  // Head
  ctx.fillStyle = '#E8D4B8';
  ctx.fillRect(x - 2*PX, y - 8*PX + bob, 4*PX, 4*PX);
  
  // Eyes
  ctx.fillStyle = '#000';
  if (a.state === 'thinking') {
    ctx.fillRect(x - 1*PX, y - 7*PX + bob, PX, PX);
    ctx.fillRect(x + 1*PX, y - 7*PX + bob, PX, PX);
    drawThoughtBubble(x + 5*PX, y - 10*PX + bob, a.thought || a.task);
  } else {
    ctx.fillRect(x - 1*PX, y - 6*PX + bob, PX, PX);
    ctx.fillRect(x + 1*PX, y - 6*PX + bob, PX, PX);
  }
}

function drawThoughtBubble(x, y, text) {
  const txt = text?.length > 12 ? text.substring(0, 11) + '..' : (text || '...');
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.fillRect(x, y, 14*PX, 5*PX);
  ctx.fillRect(x - PX, y + 5*PX, 2*PX, 2*PX);
  ctx.fillStyle = '#000';
  ctx.font = `${3*PX}px monospace`;
  ctx.fillText(txt, x + PX, y + 3*PX);
}

function drawOverlay(W, H) {
  // Weather
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(4*PX, H - 12*PX, 18*PX, 8*PX);
  ctx.fillStyle = '#8B949E';
  ctx.font = `${3*PX}px monospace`;
  ctx.fillText(`${weather.temp_c}°C ${weather.desc?.substring(0, 6)}`, 5*PX, H - 6*PX);
  
  // Clock
  const time = new Date().toLocaleTimeString('en-US', { hour12: false });
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(W - 20*PX, H - 12*PX, 16*PX, 8*PX);
  ctx.fillStyle = '#58A6FF';
  ctx.fillText(time, W - 19*PX, H - 6*PX);
}

// DOM Updates
function updateDOM() {
  updateAgentListDOM();
  updateLogsDOM();
  updateClockDOM();
}

function updateAgentListDOM() {
  const el = document.getElementById('office-agent-list');
  if (!el) return;
  el.innerHTML = animAgents.map(a => `
    <div class="agent-row">
      <div class="agent-dot ${a.state === 'working' ? 'green' : 'blue'}"></div>
      <div class="agent-info">
        <div class="agent-name">${a.emoji} ${a.name}</div>
        <div class="agent-task">${a.task}</div>
        <div class="agent-meta"><span style="color:#58A6FF">${a.model}</span></div>
      </div>
    </div>
  `).join('');
}

function updateLogsDOM() {
  const el = document.getElementById('office-logs-list');
  if (!el) return;
  el.innerHTML = liveLogs.slice(0, 10).map(l => `
    <div class="log-entry ${l.type}">
      <span class="log-time">${l.time}</span>
      <span class="log-text">${l.text}</span>
    </div>
  `).join('');
}

function updateClockDOM() {
  const el = document.getElementById('office-clock');
  if (el) {
    el.textContent = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
  }
}

export function addLog(type, text) {
  const time = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  liveLogs.unshift({ type, text, time });
  if (liveLogs.length > 30) liveLogs.pop();
  updateLogsDOM();
}

function handleHover(e) {
  const r = canvas.getBoundingClientRect();
  const x = (e.clientX - r.left) * (canvas.width / r.width);
  const y = (e.clientY - r.top) * (canvas.height / r.height);
  
  const tip = document.getElementById('agent-tooltip');
  if (!tip) return;
  
  const hit = animAgents.find(a => {
    const ax = a.x * canvas.width, ay = a.y * canvas.height;
    return Math.abs(x - ax) < 8*PX && Math.abs(y - ay) < 12*PX;
  });
  
  if (hit) {
    tip.innerHTML = `
      <div class="agent-tooltip-name" style="color:${hit.color}">${hit.emoji} ${hit.name}</div>
      <div class="agent-tooltip-task">${hit.task}</div>
      <div class="agent-tooltip-meta">
        <span>${hit.state === 'working' ? '🟢 Active' : '🔵 Idle'}</span>
        <span style="color:#58A6FF">${hit.model}</span>
      </div>
    `;
    tip.style.left = (e.clientX - r.left + 10) + 'px';
    tip.style.top = (e.clientY - r.top - 50) + 'px';
    tip.classList.add('visible');
  } else {
    tip.classList.remove('visible');
  }
}

function handleClick(e) {
  const r = canvas.getBoundingClientRect();
  const x = (e.clientX - r.left) * (canvas.width / r.width);
  const y = (e.clientY - r.top) * (canvas.height / r.height);
  
  const hit = animAgents.find(a => {
    const ax = a.x * canvas.width, ay = a.y * canvas.height;
    return Math.abs(x - ax) < 8*PX && Math.abs(y - ay) < 12*PX;
  });
  
  if (hit) {
    addLog('info', `👋 Checked in: ${hit.name}`);
  }
}

export function setWeather(w) { if (w) weather = w; }
