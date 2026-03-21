// Hifty Co Pixel Art Office - WOW VERSION
const PX = 3;
let canvas, ctx, tick = 0;
let liveAgents = [], liveLogs = [];
let weather = { temp_c: 18, desc: 'Clear' };
let btcPrice = 0;
let soundEnabled = true;
let audioCtx = null;
let particles = [];

function initAudio() { try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {} }

function playSound(type) {
  if (!soundEnabled || !audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  if (type === 'message') { osc.frequency.value = 1200; osc.type = 'sine'; gain.gain.setValueAtTime(0.08, audioCtx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15); osc.start(); osc.stop(audioCtx.currentTime + 0.15); }
  else if (type === 'huddle') { osc.frequency.value = 600; osc.type = 'triangle'; gain.gain.setValueAtTime(0.06, audioCtx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25); osc.start(); osc.stop(audioCtx.currentTime + 0.25); }
}

function createParticle(x, y, color) { particles.push({ x, y, vx: (Math.random() - 0.5) * 3, vy: (Math.random() - 0.5) * 3 - 1, life: 60 + Math.random() * 40, color: color || '#58A6FF', size: 1 + Math.random() * 2 }); }
function updateParticles() { particles = particles.filter(p => { p.x += p.vx; p.y += p.vy; p.vy += 0.05; p.life--; return p.life > 0; }); }
function drawParticles() { particles.forEach(p => { ctx.fillStyle = p.color; ctx.globalAlpha = p.life / 100; ctx.fillRect(p.x, p.y, p.size * PX, p.size * PX); }); ctx.globalAlpha = 1; }

const PALETTE = {
  floor: '#0a0a0f', floorGrid: '#151520', wall: '#050508', wallGlow: '#00ffff',
  desk: '#12121a', deskTop: '#1a1a25', deskEdge: '#00ffff',
  monitor: '#0a0a12', screen: '#001020', screenGlow: '#00ffff', monitorActive: '#001015', screenGlowActive: '#00ff88',
  chair: '#101018',
  serverRack: '#0c0c15', serverLed: '#00ff88', serverLed2: '#00ffff', serverOff: '#222233',
  coffeeMachine: '#101018', coffeeLight: '#ff00ff',
  roundTable: '#101018', tableGlow: '#00ffff',
  sofa: '#12121a', sofaGlow: '#ff00ff',
  bookshelf: '#0f0f18', books: ['#ff0066','#00ffff','#ff00ff','#00ff66','#ffff00','#0066ff'],
  plant: '#0a0a10', plantPot: '#ff00ff', plantLeaf: '#00ff88',
  waterCooler: '#0f0f18', coolerWater: '#00ffff',
  filingCabinet: '#101018',
  windowGlass: '#050510', windowFrame: '#00ffff', windowSky: '#000020',
  rug: '#0a0a12', rugGlow: '#ff00ff',
  clock: '#0c0c15', clockGlow: '#00ffff',
  globe: '#0a0a12', globeGlow: '#00ff88',
  trophy: '#0c0c15', trophyGlow: '#ffff00',
};

const AGENTS = [
  {id:'ollie',name:'OLLIE',role:'CEO',model:'MiniMax-M2.5',color:'#ffff00',homeX:0.10,homeY:0.18,emoji:'👑'},
  {id:'mintytrades',name:'MINTY',role:'TRADING',model:'kimi-k2.5',color:'#00ff88',homeX:0.28,homeY:0.18,emoji:'📈'},
  {id:'hiftycodes',name:'CODES',role:'DEV',model:'minimax-m2.5',color:'#00ffff',homeX:0.46,homeY:0.18,emoji:'💻'},
  {id:'hiftyanalyst',name:'ANALYST',role:'DATA',model:'qwen3.5',color:'#ff00ff',homeX:0.64,homeY:0.18,emoji:'📊'},
  {id:'hiftyriskmanager',name:'RISK',role:'RISK',model:'kimi-k2.5',color:'#ff8800',homeX:0.82,homeY:0.18,emoji:'🛡️'},
];

const FUR = {serverRack:{x:0.94,y:0.10,w:8,h:16},coffeeMachine:{x:0.94,y:0.35,w:5,h:8},roundTable:{x:0.50,y:0.62,r:7},sofa:{x:0.22,y:0.80,w:12,h:5},bookshelf:{x:0.06,y:0.58,w:7,h:14},plant1:{x:0.94,y:0.58,w:3,h:5},plant2:{x:0.72,y:0.80,w:3,h:5},waterCooler:{x:0.06,y:0.35,w:3,h:9},filingCabinet:{x:0.15,y:0.46,w:4,h:9},clock:{x:0.38,y:0.03,r:3},globe:{x:0.62,y:0.03,r:3},trophy:{x:0.50,y:0.03,r:2},rug:{x:0.50,y:0.45,w:28,h:10}};

let animAgents = AGENTS.map(a => ({...a, x:a.homeX, y:a.homeY, state:'working', task:'Initializing...', phase:'at_desk', target:null, walkFrame:0, facing:1, thought:'', bubbleTimer:0, atDeskTime:2000+Math.random()*3000}));

export function init(id) {
  canvas = document.getElementById(id);
  if (!canvas) return;
  ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  resize();
  window.addEventListener('resize', resize);
  canvas.addEventListener('mousemove', handleHover);
  canvas.addEventListener('click', handleClick);
  canvas.addEventListener('click', () => initAudio(), {once:true});
  addLog('info', '🚀 Mission Control initializing...');
  addLog('info', '🔌 Connecting to OpenClaw...');
  startLoop();
  fetchLiveData();
  fetchWeather();
  fetchBTC();
  addLog('success', '✅ System online');
  updateAgentListDOM();
}

function resize() { if (!canvas) return; const r = canvas.parentElement.getBoundingClientRect(); canvas.width = Math.floor(r.width / PX) * PX; canvas.height = Math.floor(r.height / PX) * PX; ctx.imageSmoothingEnabled = false; }
function startLoop() { setInterval(() => { tick++; update(); draw(); updateDOM(); }, 60); }

async function fetchLiveData() {
  try {
    const urls = ['/api/agents'];
    for (const url of urls) {
      try {
        const resp = await fetch(url);
        if (resp.ok) {
          const data = await resp.json();
          if (data.agents && data.agents.length > 0) {
            liveAgents = data.agents;
            updateAgentsFromData(data.agents);
            document.getElementById('gatewayStatus') && (document.getElementById('gatewayStatus').textContent = 'LIVE');
            document.getElementById('gatewayStatus')?.classList.add('green');
            playSound('huddle');
            return;
          }
        }
      } catch(e) { continue; }
    }
  } catch(e) {}
  demoMode();
  document.getElementById('gatewayStatus') && (document.getElementById('gatewayStatus').textContent = 'DEMO');
  setTimeout(fetchLiveData, 8000);
}

function updateAgentsFromData(data) {
  data.forEach(la => {
    const aa = animAgents.find(a => a.id === la.id || a.name.toLowerCase().includes(la.id?.toLowerCase()));
    if (aa) {
      const wasActive = aa.state === 'working';
      aa.state = la.status === 'active' ? 'working' : 'idle';
      aa.task = la.task || la.current_action || 'Active';
      if (!wasActive && aa.state === 'working') {
        playSound('message');
        addLog('info', aa.name + ': ' + aa.task);
        for(let i=0; i<8; i++) createParticle(aa.x * canvas.width, aa.y * canvas.height, aa.color);
      }
    }
  });
}

function demoMode() {
  const tasks = {ollie:['Leading strategy','Reviewing KPIs','Team sync'],mintytrades:['Analyzing BTC','RSI scan','Trade alerts'],hiftycodes:['Building features','Code review','Deploying'],hiftyanalyst:['Computing P&L','Reports','Data analysis'],hiftyriskmanager:['Risk check','Compliance','Monitoring']};
  let idx = 0;
  setInterval(() => {
    const agent = animAgents[idx % animAgents.length];
    agent.task = (tasks[agent.id] || tasks.ollie)[Math.floor(Math.random() * 3)];
    agent.state = Math.random() > 0.25 ? 'working' : 'thinking';
    agent.thought = agent.task;
    agent.bubbleTimer = 35;
    playSound('message');
    addLog('info', agent.name + ': ' + agent.task);
    idx++;
  }, 3000);
}

async function fetchWeather() { try { const r = await fetch('https://wttr.in/Kingston,Ontario?format=j1'); if(r.ok) { const d = await r.json(); weather = {temp_c:parseInt(d.current_condition[0].temp_C), desc:d.current_condition[0].weatherDesc[0].value}; } } catch(e) {} setTimeout(fetchWeather, 120000); }
async function fetchBTC() { try { const r = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true'); if(r.ok) { const d = await r.json(); btcPrice = d.bitcoin.usd; const change = d.bitcoin.usd_24h_change; const btcEl = document.getElementById('btcPrice'); const chEl = document.getElementById('btcChange'); if(btcEl) btcEl.textContent = '$' + btcPrice.toLocaleString(); if(chEl) chEl.textContent = (change >= 0 ? '+' : '') + change.toFixed(2) + '%'; } } catch(e) {} setTimeout(fetchBTC, 60000); }

function update() {
  updateParticles();
  animAgents.forEach(a => {
    if (a.bubbleTimer > 0) a.bubbleTimer--;
    if (a.phase === 'at_desk') { a.atDeskTime -= 60; if (a.atDeskTime <= 0 && Math.random() < 0.08) { const targets = ['serverRack','coffeeMachine','roundTable','sofa','bookshelf']; a.target = targets[Math.floor(Math.random()*targets.length)]; a.phase = 'walking'; a.facing = FUR[a.target].x > a.homeX ? 1 : -1; createParticle(a.x*canvas.width, a.y*canvas.height, a.color); } }
    else if (a.phase === 'walking' && a.target) { const t = FUR[a.target], dx = t.x - a.x, dy = t.y - a.y, dist = Math.sqrt(dx*dx+dy*dy); if (dist < 0.025) { a.x = t.x; a.y = t.y; a.phase = 'at_target'; a.thought = getThought(a.target); a.atTargetTime = 2500 + Math.random() * 3500; } else { a.x += (dx/dist) * 0.006; a.y += (dy/dist) * 0.006; a.walkFrame = (a.walkFrame + 0.2) % 4; } }
    else if (a.phase === 'at_target') { a.atTargetTime -= 60; if (a.atTargetTime <= 0 && Math.random() < 0.12) { a.phase = 'walking_home'; a.facing = a.homeX > a.x ? 1 : -1; } }
    else if (a.phase === 'walking_home') { const dx = a.homeX - a.x, dy = a.homeY - a.y, dist = Math.sqrt(dx*dx+dy*dy); if (dist < 0.025) { a.x = a.homeX; a.y = a.homeY; a.phase = 'at_desk'; a.target = null; a.thought = a.task; a.atDeskTime = 2500 + Math.random() * 4500; } else { a.x += (dx/dist) * 0.008; a.y += (dy/dist) * 0.008; a.walkFrame = (a.walkFrame + 0.2) % 4; } }
  });
}

function getThought(t) { const thoughts = {serverRack:['Checking logs...','System OK'],coffeeMachine:['☕ Fuel'],roundTable:['🗣️ Sync'],sofa:['😴 Rest'],bookshelf:['📚 Research']}; return (thoughts[t] || ['...'])[Math.floor(Math.random()*2)]; }

function draw() {
  if (!ctx) return;
  const W = canvas.width, H = canvas.height;
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#020208'); grad.addColorStop(0.5, '#050510'); grad.addColorStop(1, '#020208');
  ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = PALETTE.floor; ctx.fillRect(0, H*0.12, W, H*0.88);
  ctx.strokeStyle = PALETTE.floorGrid; ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 10*PX) { ctx.beginPath(); ctx.moveTo(x, H*0.12); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = H*0.12; y < H; y += 8*PX) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  ctx.shadowColor = PALETTE.wallGlow; ctx.shadowBlur = 10; ctx.fillStyle = PALETTE.wallGlow + '40'; ctx.fillRect(0, H*0.12, W, 2*PX); ctx.shadowBlur = 0;
  
  drawWindow(W*0.30, 2*PX, 22*PX, 10*PX);
  drawRug(FUR.rug.x*W, FUR.rug.y*H, FUR.rug.w*PX, FUR.rug.h*PX);
  drawClock(FUR.clock.x*W, FUR.clock.y*H);
  drawGlobe(FUR.globe.x*W, FUR.globe.y*H);
  drawTrophy(FUR.trophy.x*W, FUR.trophy.y*H);
  drawServerRack(FUR.serverRack.x*W, FUR.serverRack.y*H, FUR.serverRack.w*PX, FUR.serverRack.h*PX);
  drawCoffeeMachine(FUR.coffeeMachine.x*W, FUR.coffeeMachine.y*H);
  drawRoundTable(FUR.roundTable.x*W, FUR.roundTable.y*H, FUR.roundTable.r*PX);
  drawSofa(FUR.sofa.x*W, FUR.sofa.y*H, FUR.sofa.w*PX, FUR.sofa.h*PX);
  drawBookshelf(FUR.bookshelf.x*W, FUR.bookshelf.y*H, FUR.bookshelf.w*PX, FUR.bookshelf.h*PX);
  drawPlant(FUR.plant1.x*W, FUR.plant1.y*H);
  drawPlant(FUR.plant2.x*W, FUR.plant2.y*H);
  drawWaterCooler(FUR.waterCooler.x*W, FUR.waterCooler.y*H);
  drawFilingCabinet(FUR.filingCabinet.x*W, FUR.filingCabinet.y*H);
  animAgents.filter(a => a.phase === 'at_desk').forEach(drawDesk);
  animAgents.filter(a => a.phase !== 'at_desk').forEach(drawAgent);
  drawParticles();
  drawOverlay(W, H);
}

function drawWindow(x,y,w,h) { ctx.shadowColor=PALETTE.windowFrame; ctx.shadowBlur=8; ctx.fillStyle=PALETTE.windowFrame; ctx.fillRect(x,y,w,h); ctx.shadowBlur=0; ctx.fillStyle=PALETTE.windowSky; ctx.fillRect(x+PX,y+PX,w-2*PX,h-2*PX); ctx.fillStyle='#ffffff'; for(let i=0;i<6;i++)ctx.fillRect(x+3*PX+(i*3*PX)%(w-6*PX),y+2*PX+(i*2*PX)%(h-4*PX),PX,PX); ctx.fillStyle=PALETTE.windowFrame; ctx.fillRect(x+w/2-PX/2,y,PX,h); ctx.fillRect(x,y+h/2-PX/2,w,PX); }
function drawRug(x,y,w,h) { ctx.shadowColor=PALETTE.rugGlow; ctx.shadowBlur=15; ctx.fillStyle=PALETTE.rug; ctx.fillRect(x,y,w,h); ctx.shadowBlur=0; ctx.fillStyle=PALETTE.rugGlow+'40'; ctx.fillRect(x+2*PX,y+2*PX,w-4*PX,h-4*PX); }
function drawClock(x,y) { ctx.shadowColor=PALETTE.clockGlow; ctx.shadowBlur=8; ctx.fillStyle=PALETTE.clock; ctx.beginPath();ctx.arc(x,y,4*PX,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;ctx.fillStyle=PALETTE.clockGlow;const h=new Date().getHours()%12,m=new Date().getMinutes();ctx.fillRect(x,y,Math.cos((h*30+m*0.5)*Math.PI/180)*2*PX,Math.sin((h*30+m*0.5)*Math.PI/180)*2*PX);ctx.fillRect(x,y,Math.cos(m*6*Math.PI/180)*3*PX,Math.sin(m*6*Math.PI/180)*3*PX); }
function drawGlobe(x,y) { ctx.shadowColor=PALETTE.globeGlow; ctx.shadowBlur=10; ctx.fillStyle=PALETTE.globe; ctx.beginPath();ctx.arc(x,y,4*PX,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0; }
function drawTrophy(x,y) { ctx.shadowColor=PALETTE.trophyGlow; ctx.shadowBlur=12; ctx.fillStyle=PALETTE.trophy; ctx.fillRect(x-PX,y,2*PX,3*PX); ctx.beginPath();ctx.arc(x,y-PX,2*PX,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0; }
function drawServerRack(x,y,w,h) { ctx.fillStyle=PALETTE.serverRack; ctx.fillRect(x,y,w,h); for(let i=0;i<4;i++){ctx.fillStyle='#050508';ctx.fillRect(x+PX,y+1*PX+i*4*PX,w-2*PX,3*PX);const ledOn=Math.sin(tick*0.1+i)>0;ctx.fillStyle=ledOn?PALETTE.serverLed:PALETTE.serverOff;ctx.fillRect(x+2*PX,y+2*PX+i*4*PX,PX,PX);ctx.fillStyle=ledOn?PALETTE.serverLed2:PALETTE.serverOff;ctx.fillRect(x+4*PX,y+2*PX+i*4*PX,PX,PX);} }
function drawCoffeeMachine(x,y) { ctx.fillStyle=PALETTE.coffeeMachine; ctx.fillRect(x,y,5*PX,8*PX); const brew=Math.sin(tick*0.2)>0; ctx.fillStyle=brew?PALETTE.coffeeLight:'#222233'; ctx.fillRect(x+PX,y+4*PX,3*PX,PX); }
function drawRoundTable(x,y,r) { ctx.shadowColor=PALETTE.tableGlow; ctx.shadowBlur=8; ctx.fillStyle=PALETTE.roundTable; ctx.fillRect(x-r,y-2*PX,r*2,4*PX); ctx.shadowBlur=0; }
function drawSofa(x,y,w,h) { ctx.shadowColor=PALETTE.sofaGlow; ctx.shadowBlur=6; ctx.fillStyle=PALETTE.sofa; ctx.fillRect(x,y,w,h); ctx.shadowBlur=0; }
function drawBookshelf(x,y,w,h) { ctx.fillStyle=PALETTE.bookshelf; ctx.fillRect(x,y,w,h); for(let r=0;r<4;r++){ctx.fillStyle='#080810';ctx.fillRect(x,y+r*3*PX,w,PX);for(let b=0;b<3;b++){ctx.fillStyle=PALETTE.books[(r+b)%6];ctx.fillRect(x+1*PX+b*2*PX,y+1*PX+r*3*PX,PX,2*PX);}} }
function drawPlant(x,y) { ctx.fillStyle=PALETTE.plantPot; ctx.fillRect(x,y,3*PX,3*PX); ctx.fillStyle=PALETTE.plantLeaf; ctx.fillRect(x-PX,y-2*PX,2*PX,3*PX); ctx.fillRect(x+2*PX,y-3*PX,2*PX,4*PX); }
function drawWaterCooler(x,y) { ctx.fillStyle=PALETTE.waterCooler; ctx.fillRect(x,y,3*PX,9*PX); ctx.fillStyle=PALETTE.coolerWater; ctx.fillRect(x+PX,y-2*PX,PX,4*PX); }
function drawFilingCabinet(x,y) { ctx.fillStyle=PALETTE.filingCabinet; ctx.fillRect(x,y,4*PX,9*PX); }

function drawDesk(a) {
  const x=a.x*canvas.width,y=a.y*canvas.height,dw=16*PX,dh=7*PX;
  ctx.shadowColor=a.color; ctx.shadowBlur=8;
  ctx.fillStyle=PALETTE.deskLeg; ctx.fillRect(x-PX,y+dh,2*PX,2*PX); ctx.fillRect(x+dw,y+dh,2*PX,2*PX);
  ctx.fillStyle=PALETTE.desk; ctx.fillRect(x-PX,y+2*PX,dw+2*PX,dh-2*PX);
  ctx.shadowColor=PALETTE.deskEdge; ctx.fillStyle=PALETTE.deskTop; ctx.fillRect(x-2*PX,y,dw+4*PX,2*PX); ctx.shadowBlur=0;
  const mw=8*PX,mh=6*PX,mx=x+dw/2-mw/2,my=y-mh-PX,active=a.state==='working';
  ctx.shadowColor=active?PALETTE.screenGlowActive:'#000'; ctx.shadowBlur=active?12:0;
  ctx.fillStyle=PALETTE.monitor; ctx.fillRect(mx,my,mw,mh); ctx.shadowBlur=0;
  ctx.fillStyle=active?PALETTE.monitorActive:'#080810'; ctx.fillRect(mx+PX,my+PX,mw-2*PX,mh-2*PX);
  if(active){ctx.shadowColor=PALETTE.screenGlowActive;ctx.shadowBlur=10;ctx.fillRect(mx+2*PX,my+2*PX,mw-4*PX,PX);ctx.shadowBlur=0;}
  ctx.fillStyle=PALETTE.chair; ctx.fillRect(x+dw/2-2*PX,y+dh+PX,4*PX,2*PX);
  ctx.fillStyle=a.color; ctx.font=4*PX+'px monospace'; ctx.fillText(a.name,x+PX,y+dh+4*PX);
}

function drawAgent(a) {
  const x=a.x*canvas.width,y=a.y*canvas.height,bob=a.walkFrame>2?-PX:0;
  if(Math.random()<0.3)createParticle(x,y-4*PX,a.color+'80');
  ctx.fillStyle=a.color; ctx.fillRect(x-2*PX,y-4*PX+bob,4*PX,4*PX);
  ctx.fillStyle='#cccccc'; ctx.fillRect(x-2*PX,y-8*PX+bob,4*PX,3*PX);
  ctx.fillStyle='#000';
  if(a.state==='thinking'){ctx.fillRect(x-1*PX,y-7*PX+bob,PX,PX);ctx.fillRect(x+1*PX,y-7*PX+bob,PX,PX);drawThoughtBubble(x+5*PX,y-10*PX+bob,a.thought);}
  else{ctx.fillRect(x-1*PX,y-6*PX+bob,PX,PX);ctx.fillRect(x+1*PX,y-6*PX+bob,PX,PX);}
}

function drawThoughtBubble(x,y,text) { const txt=text?.length>10?text.substring(0,9)+'..':(text||'...'); ctx.fillStyle='rgba(255,255,255,0.95)'; ctx.fillRect(x,y,12*PX,4*PX); ctx.fillRect(x-PX,y+4*PX,2*PX,2*PX); ctx.fillStyle='#000'; ctx.font=3*PX+'px monospace'; ctx.fillText(txt,x+PX,y+3*PX); }

function drawOverlay(W,H) { ctx.fillStyle='rgba(0,0,0,0.8)'; ctx.fillRect(4*PX,H-10*PX,16*PX,6*PX); ctx.fillStyle='#00ffff'; ctx.font=3*PX+'px monospace'; ctx.fillText((weather.temp_c||'--')+'C',5*PX,H-5*PX); const time=new Date().toLocaleTimeString('en-US',{hour12:false}); ctx.fillStyle='rgba(0,0,0,0.8)'; ctx.fillRect(W-18*PX,H-10*PX,14*PX,6*PX); ctx.fillStyle='#00ff88'; ctx.fillText(time,W-17*PX,H-5*PX); }

function updateDOM() { updateAgentListDOM(); updateLogsDOM(); }

function updateAgentListDOM() {
  const el=document.getElementById('office-agent-list');
  if(!el)return;
  el.innerHTML=animAgents.map(a=>`<div class="agent-row"><div class="agent-dot ${a.state==='working'?'green':'blue'}" style="background:${a.state==='working'?a.color:''}"></div><div class="agent-info"><div class="agent-name" style="color:${a.color}">${a.emoji} ${a.name}</div><div class="agent-task">${a.task}</div><div class="agent-meta"><span style="color:#00ffff">${a.model}</span></div></div></div>`).join('');
}

function updateLogsDOM() {
  const el=document.getElementById('office-logs-list');
  if(!el)return;
  el.innerHTML=liveLogs.slice(0,8).map(l=>`<div class="log-entry ${l.type}"><span class="log-time">${l.time}</span><span class="log-text">${l.text}</span></div>`).join('');
}

export function addLog(type,text) { const time=new Date().toLocaleTimeString('en-US',{hour12:false,hour:'2-digit',minute:'2-digit',second:'2-digit'});liveLogs.unshift({type,text,time});if(liveLogs.length>25)liveLogs.pop();updateLogsDOM(); }

function handleHover(e) {
  const r=canvas.getBoundingClientRect(),x=(e.clientX-r.left)*(canvas.width/r.width),y=(e.clientY-r.top)*(canvas.height/r.height);
  const tip=document.getElementById('agent-tooltip');
  if(!tip)return;
  const hit=animAgents.find(a=>{const ax=a.x*canvas.width,ay=a.y*canvas.height;return Math.abs(x-ax)<8*PX&&Math.abs(y-ay)<10*PX;});
  if(hit){tip.innerHTML=`<div class="agent-tooltip-name" style="color:${hit.color}">${hit.emoji} ${hit.name}</div><div class="agent-tooltip-task">${hit.task}</div><div class="agent-tooltip-meta"><span>${hit.state==='working'?'🟢 Active':'🔵 Idle'}</span><span style="color:#00ffff">${hit.model}</span></div>`;tip.style.left=(e.clientX-r.left+10)+'px';tip.style.top=(e.clientY-r.top-45)+'px';tip.classList.add('visible');}
  else tip.classList.remove('visible');
}

function handleClick(e) {
  const r=canvas.getBoundingClientRect(),x=(e.clientX-r.left)*(canvas.width/r.width),y=(e.clientY-r.top)*(canvas.height/r.height);
  const hit=animAgents.find(a=>{const ax=a.x*canvas.width,ay=a.y*canvas.height;return Math.abs(x-ax)<8*PX&&Math.abs(y-ay)<10*PX;});
  if(hit){addLog('info','👋 '+hit.name+' checked in');playSound('huddle');for(let i=0;i<10;i++)createParticle(hit.x*canvas.width,hit.y*canvas.height,hit.color);}
}

export function setWeather(w){if(w)weather=w;}
export function toggleSound(){soundEnabled=!soundEnabled;return soundEnabled;}
