// Hifty Co Pixel Art Office Engine
// Canvas-based animated office with 5 agents: Ollie, MintyTrades, HiftyCodes, HiftyAnalyst, HiftyRiskManager

const PX = 4; // pixel scale

const PALETTE = {
  floor: '#1A1E2E', floorLine: '#222840',
  wall: '#0F1420', wallAccent: '#1A2040',
  desk: '#3A2A1A', deskTop: '#5A4030', deskLeg: '#2A1A0A',
  monitor: '#1A2A3A', screen: '#0A2A0A', screenGlow: '#00FF88',
  monitorWarm: '#3A2A1A', screenWarm: '#2A1A0A', screenGlowWarm: '#FF9500',
  chair: '#2A2A3A', chairSeat: '#3A3A4A',
  plant: '#1A4A2A', plantPot: '#6A3A1A', plantLeaf: '#2AAA4A',
  serverRack: '#1A2030', serverLed: '#00FF88', serverLedOff: '#333344',
  coffeeMachine: '#3A3A3A', coffeeLight: '#FF6644',
  roundTable: '#4A3A2A', tableTop: '#5A4A3A',
  sofa: '#3A2A4A', sofaCushion: '#4A3A5A',
  bookshelf: '#4A3020', book1: '#AA4444', book2: '#44AAAA', book3: '#AAAA44',
  tile: '#1E2230', tileLine: '#252A3A',
  waterCooler: '#88AACC', coolerWater: '#44AAFF',
  filingCabinet: '#4A4A5A',
  windowGlass: '#1A2A4A', windowFrame: '#2A3A5A',
  wallart: '#2A3A5A', wallartAccent: '#3A4A6A',
};

let canvas, ctx;
let agents = [];
let tick = 0;
let huddleState = 'idle';
let huddleTimer = 8000 + Math.random() * 12000;
let huddleMeetingTimer = 0;
let huddleTopic = '';
let lastWeather = { temp_c: 22, desc: 'Clear' };
let taskFeed = [];

// Agent definitions
const AGENT_DEFS = [
  { id: 'ollie', homeX: 0.10, homeY: 0.22, color: '#FFD700', label: 'OLLIE', role: 'CEO', isBoss: true, avatar: '👔' },
  { id: 'mintytrades', homeX: 0.30, homeY: 0.22, color: '#00FF88', label: 'MINTY', role: 'TRADING', isBoss: false, avatar: '📈' },
  { id: 'hiftycodes', homeX: 0.50, homeY: 0.22, color: '#00AAFF', label: 'CODES', role: 'DEV', isBoss: false, avatar: '💻' },
  { id: 'hiftyanalyst', homeX: 0.70, homeY: 0.22, color: '#AA66FF', label: 'ANALYST', role: 'DATA', isBoss: false, avatar: '📊' },
  { id: 'hiftyriskmanager', homeX: 0.30, homeY: 0.60, color: '#FF6644', label: 'RISK', role: 'MGMT', isBoss: false, avatar: '🛡️' },
];

// Furniture
const FUR = {
  serverRack:   { xPct: 0.88, yPct: 0.14 },
  coffeeMachine:{ xPct: 0.88, yPct: 0.44 },
  roundTable:   { xPct: 0.65, yPct: 0.70 },
  sofa:         { xPct: 0.65, yPct: 0.88 },
  bookshelf:    { xPct: 0.88, yPct: 0.70 },
  plant1:       { xPct: 0.04, yPct: 0.78 },
  plant2:       { xPct: 0.50, yPct: 0.88 },
  waterCooler:  { xPct: 0.04, yPct: 0.44 },
  filingCabinet:{ xPct: 0.04, yPct: 0.58 },
  wallart1:     { xPct: 0.25, yPct: 0.05 },
  wallart2:     { xPct: 0.45, yPct: 0.05 },
  wallart3:     { xPct: 0.72, yPct: 0.05 },
};

// Wander targets
const WANDER_TARGETS = ['serverRack', 'coffeeMachine', 'roundTable', 'sofa', 'bookshelf', 'waterCooler', 'plant1'];
const WANDER_THOUGHTS = {
  serverRack:    ['Checking logs...', 'Server OK', 'Uptime good'],
  coffeeMachine: ['Fuel up!', 'Coffee break', 'Espresso time'],
  roundTable:    ['Team sync', 'Brainstorming', 'Ideas flowing'],
  sofa:          ['Recharging...', 'Quick rest', 'Taking five'],
  bookshelf:     ['Researching...', 'Reading docs', 'Learning'],
  waterCooler:   ['Hydrating', 'Water break', 'Staying fresh'],
  plant1:        ['Nice plant', 'Green vibes', 'Nature break'],
};

// ─── INIT ───
export function init(canvasId) {
  canvas = document.getElementById(canvasId);
  if (!canvas) return;
  ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  resize();
  window.addEventListener('resize', resize);

  agents = AGENT_DEFS.map(def => createAgent(def));
  startHuddleTimer();
  startOfficeLoop();
  startWanderLoop();

  canvas.addEventListener('click', handleCanvasClick);
  canvas.addEventListener('mousemove', handleCanvasHover);
}

function resize() {
  if (!canvas) return;
  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = Math.floor(rect.width / PX) * PX;
  canvas.height = Math.floor(rect.height / PX) * PX;
  ctx.imageSmoothingEnabled = false;
}

function createAgent(def) {
  return {
    ...def,
    xPct: def.homeX,
    yPct: def.homeY,
    state: 'working',
    task: 'Active',
    wanderTarget: null,
    wanderPhase: 'at_desk',
    walkFrame: 0,
    facingRight: true,
    thoughtText: '',
    celebrating: false,
    celebTimer: 0,
    atDeskTimer: 2000 + Math.random() * 4000,
  };
}

// ─── MAIN LOOP ───
function startOfficeLoop() {
  setInterval(() => {
    tick++;
    updateAgents();
    drawOffice();
  }, 100);
}

function startWanderLoop() {
  setInterval(() => {
    agents.forEach(agent => {
      if (agent.wanderPhase === 'at_desk') {
        agent.atDeskTimer -= 100;
        if (agent.atDeskTimer <= 0 && Math.random() < 0.25) {
          agent.wanderTarget = WANDER_TARGETS[Math.floor(Math.random() * WANDER_TARGETS.length)];
          agent.wanderPhase = 'walking_to';
          agent.facingRight = FUR[agent.wanderTarget].xPct > agent.xPct;
        }
      } else if (agent.wanderPhase === 'at_target') {
        if (Math.random() < 0.2) {
          agent.wanderPhase = 'walking_home';
          agent.facingRight = agent.homeX > agent.xPct;
        }
      }
    });
  }, 2000);
}

function startHuddleTimer() {
  setInterval(() => {
    if (huddleState === 'idle' && Math.random() < 0.3) {
      const topics = [
        'Sprint goals', 'RSI signals', 'Trade review', 'Risk check',
        'New strategy', 'Team sync', 'Market analysis', 'Compliance'
      ];
      huddleTopic = topics[Math.floor(Math.random() * topics.length)];
      huddleState = 'called';
      huddleTimer = 2000;
      addTaskFeed('📋 Huddle: ' + huddleTopic, '#00AAFF');
    } else if (huddleState === 'called') {
      huddleTimer -= 100;
      if (huddleTimer <= 0) {
        huddleState = 'huddling';
        huddleMeetingTimer = 6000 + Math.random() * 4000;
        // Send 3 agents to round table
        const wanderers = agents.filter(a => a.wanderPhase !== 'walking_home').slice(0, 3);
        wanderers.forEach(a => {
          a.wanderTarget = 'roundTable';
          a.wanderPhase = 'walking_to';
        });
        addTaskFeed('🤝 ' + huddleTopic, '#AA66FF');
      }
    } else if (huddleState === 'huddling') {
      huddleMeetingTimer -= 100;
      if (huddleMeetingTimer <= 0) {
        huddleState = 'idle';
        // Agents go back home
        agents.forEach(a => {
          if (a.wanderTarget === 'roundTable') {
            a.wanderPhase = 'walking_home';
            a.wanderTarget = null;
          }
        });
        addTaskFeed('✅ Huddle done', '#00FF88');
      }
    }
  }, 100);
}

// ─── UPDATE ───
function updateAgents() {
  agents.forEach(agent => {
    if (agent.celebTimer > 0) agent.celebTimer--;

    const speed = 0.006;

    if (agent.wanderPhase === 'walking_to' && agent.wanderTarget) {
      const t = FUR[agent.wanderTarget];
      const dx = t.xPct - agent.xPct;
      const dy = t.yPct - agent.yPct;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 0.015) {
        agent.xPct = t.xPct;
        agent.yPct = t.yPct;
        agent.wanderPhase = 'at_target';
        agent.thoughtText = WANDER_THOUGHTS[agent.wanderTarget]?.[Math.floor(Math.random() * 3)] || '...';
      } else {
        agent.xPct += (dx / dist) * speed;
        agent.yPct += (dy / dist) * speed;
        agent.walkFrame = (agent.walkFrame + 0.2) % 4;
      }
    } else if (agent.wanderPhase === 'walking_home') {
      const dx = agent.homeX - agent.xPct;
      const dy = agent.homeY - agent.yPct;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 0.015) {
        agent.xPct = agent.homeX;
        agent.yPct = agent.homeY;
        agent.wanderPhase = 'at_desk';
        agent.wanderTarget = null;
        agent.thoughtText = '';
        agent.atDeskTimer = 3000 + Math.random() * 6000;
      } else {
        agent.xPct += (dx / dist) * speed * 1.3;
        agent.yPct += (dy / dist) * speed * 1.3;
        agent.walkFrame = (agent.walkFrame + 0.2) % 4;
      }
    }
  });
}

// ─── DRAW ───
function drawOffice() {
  if (!ctx) return;
  const W = canvas.width;
  const H = canvas.height;

  // Wall
  ctx.fillStyle = PALETTE.wall;
  ctx.fillRect(0, 0, W, H);

  // Floor
  ctx.fillStyle = PALETTE.floor;
  ctx.fillRect(0, H * 0.15, W, H * 0.85);

  // Floor tile lines
  ctx.fillStyle = PALETTE.floorLine;
  for (let x = 0; x < W; x += 14 * PX) {
    ctx.fillRect(x, H * 0.15, 1 * PX, H * 0.85);
  }
  for (let y = H * 0.15; y < H; y += 9 * PX) {
    ctx.fillRect(0, y, W, 1 * PX);
  }

  // Wall accent line
  ctx.fillStyle = PALETTE.wallAccent;
  ctx.fillRect(0, H * 0.14, W, 1 * PX);

  // Window
  drawWindow(W * 0.34, 2 * PX, 20 * PX, 10 * PX);

  // Wall art
  drawWallArt(FUR.wallart1.xPct * W, FUR.wallart1.yPct * H);
  drawWallArt(FUR.wallart2.xPct * W, FUR.wallart2.yPct * H);
  drawWallArt(FUR.wallart3.xPct * W, FUR.wallart3.yPct * H);

  // Furniture
  drawServerRack(FUR.serverRack.xPct * W, FUR.serverRack.yPct * H);
  drawCoffeeMachine(FUR.coffeeMachine.xPct * W, FUR.coffeeMachine.yPct * H);
  drawRoundTable(FUR.roundTable.xPct * W, FUR.roundTable.yPct * H);
  drawSofa(FUR.sofa.xPct * W, FUR.sofa.yPct * H);
  drawBookshelf(FUR.bookshelf.xPct * W, FUR.bookshelf.yPct * H);
  drawPlant(FUR.plant1.xPct * W, FUR.plant1.yPct * H);
  drawPlant(FUR.plant2.xPct * W, FUR.plant2.yPct * H);
  drawWaterCooler(FUR.waterCooler.xPct * W, FUR.waterCooler.yPct * H);
  drawFilingCabinet(FUR.filingCabinet.xPct * W, FUR.filingCabinet.yPct * H);

  // Huddle indicator
  if (huddleState === 'huddling') {
    drawHuddleBubble(FUR.roundTable.xPct * W, FUR.roundTable.yPct * H - 8 * PX, huddleTopic);
  }

  // Desks (draw behind agents)
  agents.forEach(agent => {
    if (agent.wanderPhase === 'at_desk') {
      drawDesk(agent.homeX * W, agent.homeY * H, agent);
    }
  });

  // Agents
  agents.forEach(agent => {
    drawAgent(agent);
  });

  // Weather & clock overlay
  drawOfficeOverlay(W, H);
}

function drawWindow(x, y, w, h) {
  ctx.fillStyle = PALETTE.windowFrame;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = PALETTE.windowGlass;
  ctx.fillRect(x + 1 * PX, y + 1 * PX, w - 2 * PX, h - 2 * PX);
  ctx.fillStyle = '#1A2A4A';
  ctx.fillRect(x + 1 * PX, y + 1 * PX, w - 2 * PX, (h - 2 * PX) * 0.5);
  ctx.fillStyle = '#3A5AAA';
  ctx.fillRect(x + 1 * PX, y + 1 * PX + (h - 2 * PX) * 0.5, w - 2 * PX, (h - 2 * PX) * 0.5);
  ctx.fillStyle = PALETTE.windowFrame;
  ctx.fillRect(x + Math.floor(w / 2) - 1 * PX, y, 2 * PX, h);
  ctx.fillRect(x, y + Math.floor(h / 2) - 1 * PX, w, 2 * PX);
}

function drawWallArt(x, y) {
  ctx.fillStyle = PALETTE.wallart;
  ctx.fillRect(x, y, 8 * PX, 6 * PX);
  ctx.fillStyle = PALETTE.wallartAccent;
  ctx.fillRect(x + 1 * PX, y + 1 * PX, 6 * PX, 3 * PX);
}

function drawDesk(x, y, agent) {
  const dw = 20 * PX;
  const dh = 9 * PX;

  // Legs
  ctx.fillStyle = PALETTE.deskLeg;
  ctx.fillRect(x - 1 * PX, y + dh, 2 * PX, 4 * PX);
  ctx.fillRect(x + dw, y + dh, 2 * PX, 4 * PX);

  // Desk body
  ctx.fillStyle = PALETTE.desk;
  ctx.fillRect(x - 1 * PX, y + 2 * PX, dw + 2 * PX, dh - 2 * PX);

  // Desk top
  ctx.fillStyle = PALETTE.deskTop;
  ctx.fillRect(x - 2 * PX, y, dw + 4 * PX, 2 * PX);

  // Monitor
  const mw = 10 * PX;
  const mh = 8 * PX;
  const mx = x + Math.floor(dw / 2) - Math.floor(mw / 2);
  const my = y - mh - 1 * PX;

  ctx.fillStyle = PALETTE.monitor;
  ctx.fillRect(mx, my, mw, mh);
  const isActive = agent.state === 'working' || agent.wanderPhase !== 'at_desk';
  ctx.fillStyle = isActive ? PALETTE.screen : PALETTE.screenWarm;
  ctx.fillRect(mx + 1 * PX, my + 1 * PX, mw - 2 * PX, mh - 2 * PX);
  if (isActive) {
    ctx.fillStyle = PALETTE.screenGlow;
    ctx.fillRect(mx + 2 * PX, my + 2 * PX, mw - 4 * PX, 1 * PX);
  }
  ctx.fillStyle = PALETTE.monitor;
  ctx.fillRect(mx + Math.floor(mw / 2) - 1 * PX, my + mh, 2 * PX, 2 * PX);

  // Chair
  const cx = x + Math.floor(dw / 2) - 3 * PX;
  const cy = y + dh + 1 * PX;
  ctx.fillStyle = PALETTE.chair;
  ctx.fillRect(cx, cy, 6 * PX, 3 * PX);
  ctx.fillStyle = PALETTE.chairSeat;
  ctx.fillRect(cx + 1 * PX, cy + 3 * PX, 4 * PX, 2 * PX);

  // Name plate
  ctx.fillStyle = agent.color;
  ctx.globalAlpha = 0.7;
  ctx.fillRect(x, y + dh + 5 * PX, dw, 1 * PX);
  ctx.globalAlpha = 1;

  // Text labels
  ctx.fillStyle = agent.color;
  ctx.font = `${5 * PX}px 'JetBrains Mono', monospace`;
  ctx.fillText(agent.label, x + 1 * PX, y + dh + 7 * PX);
}

function drawAgent(agent) {
  const x = agent.xPct * canvas.width;
  const y = agent.yPct * canvas.height;
  const bobY = agent.walkFrame > 2 ? -1 * PX : 0;

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(x - 3 * PX, y + 8 * PX, 6 * PX, 2 * PX);

  // Body
  ctx.fillStyle = agent.color;
  ctx.fillRect(x - 2 * PX, y - 4 * PX + bobY, 4 * PX, 6 * PX);

  // Head
  ctx.fillStyle = '#E8D4B8';
  ctx.fillRect(x - 2 * PX, y - 8 * PX + bobY, 4 * PX, 4 * PX);

  // Eyes
  ctx.fillStyle = '#000';
  if (agent.wanderPhase !== 'at_desk') {
    // Walking - alert eyes
    ctx.fillRect(x - 1 * PX, y - 6 * PX + bobY, 1 * PX, 1 * PX);
    ctx.fillRect(x + 1 * PX, y - 6 * PX + bobY, 1 * PX, 1 * PX);
  } else if (agent.state === 'thinking') {
    // Thinking - looking up
    ctx.fillRect(x - 1 * PX, y - 7 * PX + bobY, 1 * PX, 1 * PX);
    ctx.fillRect(x + 1 * PX, y - 7 * PX + bobY, 1 * PX, 1 * PX);
    drawThoughtBubble(x + 5 * PX, y - 10 * PX + bobY, agent.thoughtText || '...');
  } else if (agent.state === 'working') {
    // Working - focused
    ctx.fillRect(x - 1 * PX, y - 6 * PX + bobY, 1 * PX, 1 * PX);
    ctx.fillRect(x + 1 * PX, y - 6 * PX + bobY, 1 * PX, 1 * PX);
  } else {
    // Idle - half closed
    ctx.fillRect(x - 1 * PX, y - 5 * PX + bobY, 1 * PX, 1 * PX);
    ctx.fillRect(x + 1 * PX, y - 5 * PX + bobY, 1 * PX, 1 * PX);
  }

  // Boss indicator (Ollie)
  if (agent.isBoss) {
    ctx.fillStyle = '#FFD700';
    ctx.fillRect(x - 1 * PX, y - 12 * PX + bobY, 2 * PX, 1 * PX);
    ctx.fillRect(x, y - 13 * PX + bobY, 1 * PX, 1 * PX);
  }

  // Celebration sparkles
  if (agent.celebTimer > 0) {
    for (let i = 0; i < 4; i++) {
      const cx2 = x + Math.cos((tick * 0.3 + i) * Math.PI / 2) * 7 * PX;
      const cy2 = y - 6 * PX + Math.sin((tick * 0.3 + i) * Math.PI / 2) * 4 * PX;
      ctx.fillStyle = ['#FFD700', '#FF6644', '#00FF88', '#00AAFF'][i];
      ctx.fillRect(cx2, cy2, 1 * PX, 1 * PX);
    }
  }
}

function drawThoughtBubble(x, y, text) {
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.fillRect(x, y, 14 * PX, 6 * PX);
  ctx.fillRect(x - 2 * PX, y + 6 * PX, 3 * PX, 2 * PX);
  ctx.fillRect(x - 3 * PX, y + 8 * PX, 2 * PX, 1 * PX);
  ctx.fillStyle = '#333';
  ctx.font = `${4 * PX}px 'JetBrains Mono', monospace`;
  const short = text.length > 10 ? text.substring(0, 9) + '..' : text;
  ctx.fillText(short, x + 1 * PX, y + 4 * PX);
}

function drawServerRack(x, y) {
  ctx.fillStyle = PALETTE.serverRack;
  ctx.fillRect(x, y, 12 * PX, 20 * PX);
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = '#0A1020';
    ctx.fillRect(x + 1 * PX, y + 2 * PX + i * 5 * PX, 10 * PX, 4 * PX);
    const ledOn = Math.sin(tick * 0.06 + i * 1.3) > 0;
    ctx.fillStyle = ledOn ? PALETTE.serverLed : PALETTE.serverLedOff;
    ctx.fillRect(x + 2 * PX, y + 3 * PX + i * 5 * PX, 1 * PX, 2 * PX);
    ctx.fillStyle = ledOn ? '#FF8800' : '#442200';
    ctx.fillRect(x + 4 * PX, y + 3 * PX + i * 5 * PX, 1 * PX, 2 * PX);
  }
  ctx.fillStyle = '#445566';
  ctx.font = `${4 * PX}px 'JetBrains Mono', monospace`;
  ctx.fillText('SRV', x + 1 * PX, y - 1 * PX);
}

function drawCoffeeMachine(x, y) {
  ctx.fillStyle = PALETTE.coffeeMachine;
  ctx.fillRect(x, y, 8 * PX, 10 * PX);
  ctx.fillStyle = '#001122';
  ctx.fillRect(x + 1 * PX, y + 1 * PX, 6 * PX, 3 * PX);
  ctx.fillStyle = '#00FF88';
  ctx.font = `${3 * PX}px 'JetBrains Mono', monospace`;
  ctx.fillText('88', x + 2 * PX, y + 3 * PX);
  const lightOn = Math.sin(tick * 0.1) > 0;
  ctx.fillStyle = lightOn ? PALETTE.coffeeLight : '#442211';
  ctx.fillRect(x + 3 * PX, y + 5 * PX, 2 * PX, 1 * PX);
  ctx.fillStyle = '#555';
  ctx.fillRect(x + 2 * PX, y + 7 * PX, 4 * PX, 2 * PX);
}

function drawRoundTable(x, y) {
  ctx.fillStyle = PALETTE.roundTable;
  ctx.fillRect(x - 6 * PX, y - 3 * PX, 12 * PX, 6 * PX);
  ctx.fillStyle = PALETTE.tableTop;
  ctx.fillRect(x - 6 * PX, y - 4 * PX, 12 * PX, 2 * PX);
  ctx.fillStyle = '#5A4A3A';
  ctx.fillRect(x - 1 * PX, y - 2 * PX, 2 * PX, 4 * PX);
}

function drawSofa(x, y) {
  ctx.fillStyle = PALETTE.sofa;
  ctx.fillRect(x - 6 * PX, y, 12 * PX, 7 * PX);
  ctx.fillStyle = PALETTE.sofaCushion;
  ctx.fillRect(x - 5 * PX, y + 1 * PX, 10 * PX, 4 * PX);
  ctx.fillStyle = PALETTE.sofa;
  ctx.fillRect(x - 6 * PX, y - 4 * PX, 12 * PX, 4 * PX);
}

function drawBookshelf(x, y) {
  ctx.fillStyle = PALETTE.bookshelf;
  ctx.fillRect(x, y, 12 * PX, 20 * PX);
  for (let row = 0; row < 4; row++) {
    ctx.fillStyle = '#3A2010';
    ctx.fillRect(x, y + 5 * PX * row, 12 * PX, 1 * PX);
    const colors = [PALETTE.book1, PALETTE.book2, PALETTE.book3, '#AA66AA', '#66AAAA'];
    for (let b = 0; b < 3; b++) {
      ctx.fillStyle = colors[(row * 3 + b) % colors.length];
      ctx.fillRect(x + 2 * PX + b * 3 * PX, y + 1 * PX + row * 5 * PX, 2 * PX, 3 * PX);
    }
  }
}

function drawPlant(x, y) {
  ctx.fillStyle = PALETTE.plantPot;
  ctx.fillRect(x, y, 5 * PX, 4 * PX);
  ctx.fillStyle = PALETTE.plantLeaf;
  ctx.fillRect(x - 1 * PX, y - 3 * PX, 3 * PX, 4 * PX);
  ctx.fillRect(x + 3 * PX, y - 2 * PX, 2 * PX, 3 * PX);
  ctx.fillRect(x + 1 * PX, y - 5 * PX, 3 * PX, 3 * PX);
  ctx.fillRect(x + 2 * PX, y - 7 * PX, 1 * PX, 3 * PX);
}

function drawWaterCooler(x, y) {
  ctx.fillStyle = PALETTE.waterCooler;
  ctx.fillRect(x, y, 5 * PX, 11 * PX);
  ctx.fillStyle = PALETTE.coolerWater;
  ctx.fillRect(x + 1 * PX, y - 3 * PX, 3 * PX, 5 * PX);
  if (Math.sin(tick * 0.12) > 0) {
    ctx.fillStyle = '#88CCFF';
    ctx.fillRect(x + 1 * PX, y - 1 * PX, 1 * PX, 3 * PX);
  }
}

function drawFilingCabinet(x, y) {
  ctx.fillStyle = PALETTE.filingCabinet;
  ctx.fillRect(x, y, 7 * PX, 14 * PX);
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = '#3A3A4A';
    ctx.fillRect(x + 1 * PX, y + 1 * PX + i * 4 * PX, 5 * PX, 3 * PX);
    ctx.fillStyle = '#888';
    ctx.fillRect(x + 3 * PX, y + 2 * PX + i * 4 * PX, 1 * PX, 1 * PX);
  }
}

function drawHuddleBubble(x, y, topic) {
  ctx.fillStyle = 'rgba(0, 170, 255, 0.9)';
  const w = topic.length * 4 * PX + 8 * PX;
  ctx.fillRect(x - w / 2, y - 3 * PX, w, 6 * PX);
  ctx.fillStyle = '#fff';
  ctx.font = `${4 * PX}px 'JetBrains Mono', monospace`;
  ctx.textAlign = 'center';
  ctx.fillText(topic, x, y + 2 * PX);
  ctx.textAlign = 'left';
}

function drawOfficeOverlay(W, H) {
  // Weather
  const temp = lastWeather.temp_c !== undefined ? Math.round(lastWeather.temp_c) : '--';
  const desc = lastWeather.desc || 'Clear';
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(4 * PX, H - 14 * PX, 20 * PX, 10 * PX);
  ctx.fillStyle = '#AACCFF';
  ctx.font = `${4 * PX}px 'JetBrains Mono', monospace`;
  ctx.fillText(`${temp}C ${desc.substring(0, 6)}`, 5 * PX, H - 7 * PX);

  // Clock
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-US', { hour12: false });
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(W - 24 * PX, H - 14 * PX, 20 * PX, 10 * PX);
  ctx.fillStyle = '#00DDFF';
  ctx.font = `${4 * PX}px 'JetBrains Mono', monospace`;
  ctx.textAlign = 'right';
  ctx.fillText(timeStr, W - 5 * PX, H - 7 * PX);
  ctx.textAlign = 'left';
}

// ─── TASK FEED ───
function addTaskFeed(text, color) {
  const time = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
  taskFeed.unshift({ text, color, time });
  if (taskFeed.length > 20) taskFeed.pop();
  updateTaskFeedDOM();
}

function updateTaskFeedDOM() {
  const el = document.getElementById('office-task-list');
  if (!el) return;
  el.innerHTML = taskFeed.slice(0, 5).map(t => `
    <div class="task-entry">
      <div class="task-entry-dot" style="background:${t.color}"></div>
      <div class="task-entry-text">${t.text}</div>
      <div class="task-entry-time">${t.time}</div>
    </div>
  `).join('');
}

// ─── PUBLIC API ───
export function setAgentState(agentId, state, data = {}) {
  const agent = agents.find(a => a.id === agentId);
  if (!agent) return;
  const prevState = agent.state;
  agent.state = state;
  agent.task = data.status || data.message || agent.task;
  agent.thoughtText = agent.task;

  if (state === 'working' && prevState !== 'working') {
    addTaskFeed(`${agent.label}: ${agent.task || 'Working'}`, agent.color);
  }
  if (state === 'thinking') {
    addTaskFeed(`${agent.label}: Thinking...`, agent.color);
  }
  if (state === 'idle' && data.message?.toLowerCase().includes('done')) {
    agent.celebTimer = 40;
    addTaskFeed(`✅ ${agent.label}: Done!`, '#00FF88');
  }
}

export function setWeather(w) {
  if (w) lastWeather = w;
}

export function getAgentAtPoint(x, y) {
  for (const agent of agents) {
    const ax = agent.xPct * canvas.width;
    const ay = agent.yPct * canvas.height;
    if (Math.abs(x - ax) < 8 * PX && Math.abs(y - ay) < 12 * PX) {
      return agent;
    }
  }
  return null;
}

let hoveredAgent = null;

function handleCanvasHover(e) {
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const x = (e.clientX - rect.left) * scaleX;
  const y = (e.clientY - rect.top) * scaleY;
  const agent = getAgentAtPoint(x, y);
  showAgentTooltip(agent, e.clientX - rect.left, e.clientY - rect.top);
}

function handleCanvasClick(e) {
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const x = (e.clientX - rect.left) * scaleX;
  const y = (e.clientY - rect.top) * scaleY;
  const agent = getAgentAtPoint(x, y);
  if (agent) {
    addTaskFeed(`👋 ${agent.label} (${agent.role}) checked in`, agent.color);
  }
}

function showAgentTooltip(agent, mouseX, mouseY) {
  const tip = document.getElementById('agent-tooltip');
  if (!tip) return;
  if (!agent) {
    tip.classList.remove('visible');
    return;
  }
  tip.innerHTML = `
    <div class="agent-tooltip-name" style="color:${agent.color}">${agent.label} (${agent.role})</div>
    <div class="agent-tooltip-task">${agent.task || 'Idle'}</div>
    <div class="agent-tooltip-meta">
      <span>${agent.wanderPhase === 'at_desk' ? '🪑 At desk' : '🚶 Wandering'}</span>
      <span class="agent-tooltip-cost">$0.01</span>
    </div>
  `;
  tip.style.left = (mouseX + 10) + 'px';
  tip.style.top = (mouseY - 40) + 'px';
  tip.classList.add('visible');
}

// Demo: cycle agent states
export function startDemo() {
  const demoTasks = {
    ollie: ['Leading team strategy', 'Reviewing KPIs', 'Delegating tasks', 'Morning briefing'],
    mintytrades: ['Scanning RSI signals', 'Analyzing BTC', 'Finding setups', 'Checking charts'],
    hiftycodes: ['Building features', 'Fixing bugs', 'Code review', 'Deploying'],
    hiftyanalyst: ['Computing P&L', 'Generating reports', 'Analyzing data', 'Research'],
    hiftyriskmanager: ['Verifying risk rules', 'Checking compliance', 'Monitoring risk', 'Assessment'],
  };

  let idx = 0;
  setInterval(() => {
    const agentIds = Object.keys(demoTasks);
    const agentId = agentIds[idx % agentIds.length];
    const tasks = demoTasks[agentId];
    const task = tasks[Math.floor(Math.random() * tasks.length)];
    setAgentState(agentId, Math.random() > 0.3 ? 'working' : 'thinking', { status: task });
    idx++;
  }, 5000);

  // Periodic celebration
  setInterval(() => {
    const a = agents[Math.floor(Math.random() * agents.length)];
    a.celebTimer = 40;
    addTaskFeed(`🎉 ${a.label}: Task complete!`, '#00FF88');
  }, 20000);
}

// ─── WEATHER FETCH ───
export async function fetchWeather() {
  try {
    const r = await fetch('https://wttr.in/Kingston,Ontario?format=j1');
    if (r.ok) {
      const d = await r.json();
      const c = d.current_condition[0];
      setWeather({
        temp_c: parseInt(c.temp_C),
        desc: c.weatherDesc[0].value,
      });
    }
  } catch (e) {}
}

setInterval(fetchWeather, 60000);
fetchWeather();
