import * as THREE from 'three';

// ============ تعريف العناصر (كلها مربعات!) ============
const ITEMS = {
  zorq:   { name:'زرقان', icon:'🟪', color:0x9c27b0, hp:25, o2:5,  desc:'فاكهة بنفسجية غريبة + ورقة نيون. تشفي 25❤️' },
  bubble: { name:'فطر الفقاعة', icon:'🍄', color:0x03a9f4, hp:10, o2:20, desc:'فطر أزرق بساق سماوية. يعطي 20 🫁' },
  star:   { name:'البلورة النجمية', icon:'🔶', color:0xff9800, hp:35, o2:0, desc:'بلورة برتقالية مشعة. تشفي 35❤️' },
  mint:   { name:'نعناع فضائي', icon:'🌿', color:0x69f0ae, hp:5, o2:15, desc:'عشب أخضر منعش. 15 🫁' },
  egg:    { name:'بيضة سحابية', icon:'🥚', color:0xf48fb1, hp:15, o2:15, desc:'بيضة وردية غامضة. 15❤️ + 15🫁' },
  o2tank: { name:'عبوة O₂', icon:'🧯', color:0x00e5ff, hp:0, o2:60, desc:'عبوة أكسجين من السفينة. اضغط O₂ لتعبئة 60' },
};

const SAVE_KEY = 'space-survival-save-v1';

// ============ أدوات مربعات ============
function box(w,h,d,color,emissive=0x000000,eInt=0){
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(w,h,d),
    new THREE.MeshLambertMaterial({ color, emissive, emissiveIntensity:eInt })
  );
  return m;
}

// مولد عشوائي ببذرة ثابتة
let _seed = 1337;
function rnd(){ _seed = (_seed*1664525+1013904223)>>>0; return _seed/4294967296; }

// ============ اللعبة ============
const canvas = document.getElementById('game-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias:false, powerPreference:'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b1026);
scene.fog = new THREE.Fog(0x1a1040, 60, 160);

const camera = new THREE.PerspectiveCamera(50, innerWidth/innerHeight, 0.1, 400);
// زاوية 2.5D ثابتة: من فوق بزاوية — لا تدور أبداً
const CAM_OFF = new THREE.Vector3(0, 26, 20);

scene.add(new THREE.HemisphereLight(0x9d8cff, 0x1b2a1b, 1.1));
const sun = new THREE.DirectionalLight(0xffe0b2, 1.4);
sun.position.set(30, 50, 10);
scene.add(sun);

// نجوم سماوية (مربعات صغيرة عائمة — بنفس الستايل)
{
  const starGeo = new THREE.BoxGeometry(0.3,0.3,0.3);
  const starMat = new THREE.MeshBasicMaterial({ color:0xffffff });
  const stars = new THREE.InstancedMesh(starGeo, starMat, 160);
  const d = new THREE.Object3D();
  for(let i=0;i<160;i++){
    d.position.set((rnd()-0.5)*400, 40+rnd()*80, (rnd()-0.5)*400);
    d.updateMatrix(); stars.setMatrixAt(i, d.matrix);
  }
  scene.add(stars);
}

// كوكبان مربعان بعيدان للزينة
{
  const p1 = box(18,18,18,0x7c4dff,0x7c4dff,0.35); p1.position.set(-90,60,-120); scene.add(p1);
  const p2 = box(10,10,10,0x00e5ff,0x00e5ff,0.3); p2.position.set(100,45,-100); scene.add(p2);
}

// ============ نظام الخفة: VisibilityManager ============
// فقط العناصر الظاهرة بالشاشة تُرسم — الباقي visible=false تماماً
const VIEW_X = 42, VIEW_Z = 32;
const cullables = []; // {obj, x, z}
let totalCreatable = 0;
function registerCullable(obj, x, z){ cullables.push({obj, x, z}); totalCreatable++; }

let activeCount = 0;
function updateCulling(px, pz){
  activeCount = 0;
  for(let i=0;i<cullables.length;i++){
    const c = cullables[i];
    const vis = Math.abs(c.x-px) < VIEW_X && Math.abs(c.z-pz) < VIEW_Z;
    if(c.obj.visible !== vis) c.obj.visible = vis;
    if(vis) activeCount++;
  }
}

// ============ الأرض مقسمة Chunks ============
const WORLD_R = 100, CHUNK = 20;
const chunkGroups = [];
{
  for(let cx=-WORLD_R; cx<WORLD_R; cx+=CHUNK){
    for(let cz=-WORLD_R; cz<WORLD_R; cz+=CHUNK){
      const g = new THREE.Group();
      const shade = 0x1e6b3a + Math.floor(rnd()*0x000a05);
      const ground = box(CHUNK, 1.2, CHUNK, new THREE.Color().setHSL(0.32+rnd()*0.12, 0.55, 0.16+rnd()*0.05).getHex());
      ground.position.set(cx+CHUNK/2, -0.6, cz+CHUNK/2);
      g.add(ground);
      // صخور مربعة للزينة داخل الشنك
      const n = 2+Math.floor(rnd()*3);
      for(let k=0;k<n;k++){
        const s = 0.6+rnd()*1.6;
        const rock = box(s,s*0.7,s, [0x4a6572,0x5c6bc0,0x6a1b9a][Math.floor(rnd()*3)]);
        rock.position.set(cx+rnd()*CHUNK, s*0.3, cz+rnd()*CHUNK);
        rock.rotation.y = rnd()*Math.PI;
        g.add(rock);
      }
      scene.add(g);
      registerCullable(g, cx+CHUNK/2, cz+CHUNK/2);
      chunkGroups.push(g);
    }
  }
}

// ============ بناء الفواكه الغريبة (مربعات فقط!) ============
function buildFoodMesh(id){
  const g = new THREE.Group();
  if(id==='zorq'){ // مربع بنفسجي + ورقتان نيون
    const b = box(1.2,1.2,1.2,0x9c27b0); b.position.y=0.9; g.add(b);
    const l1 = box(0.7,0.15,0.4,0x76ff03,0x76ff03,0.7); l1.position.set(0.5,1.7,0); l1.rotation.z=0.5; g.add(l1);
    const l2 = box(0.7,0.15,0.4,0x76ff03,0x76ff03,0.7); l2.position.set(-0.5,1.7,0); l2.rotation.z=-0.5; g.add(l2);
    const stem = box(0.2,0.5,0.2,0x33691e); stem.position.y=1.6; g.add(stem);
  } else if(id==='bubble'){ // ساق + قبعة + فقاعة
    const st = box(0.4,1.2,0.4,0x84ffff); st.position.y=0.6; g.add(st);
    const cap = box(1.5,0.6,1.5,0x03a9f4,0x03a9f4,0.5); cap.position.y=1.4; g.add(cap);
    const dot = box(0.4,0.4,0.4,0xffffff,0xffffff,0.8); dot.position.set(0.4,1.8,0.2); g.add(dot);
  } else if(id==='star'){ // بلورة: مستطيل + قمة
    const b = box(1,1,1,0xff9800,0xff9800,0.45); b.position.y=0.7; b.rotation.y=0.5; g.add(b);
    const t = box(0.5,0.9,0.5,0xffeb3b,0xffeb3b,0.8); t.position.y=1.5; t.rotation.y=0.9; g.add(t);
  } else if(id==='mint'){ // 3 أعشاب مستطيلة
    for(let i=-1;i<=1;i++){ const b=box(0.25,1.1+((i+1)%2)*0.4,0.25,0x69f0ae,0x69f0ae,0.4); b.position.set(i*0.35,0.6,0); b.rotation.z=i*0.15; g.add(b); }
  } else if(id==='egg'){ // بيضة: مربع وردي + بقعة بيضاء
    const b = box(1.1,1.3,1.1,0xf48fb1); b.position.y=0.85; g.add(b);
    const s = box(0.5,0.5,0.1,0xffffff); s.position.set(0,0.9,0.58); g.add(s);
    const nest = box(1.6,0.25,1.6,0x5d4037); nest.position.y=0.12; g.add(nest);
  } else if(id==='o2tank'){ // عبوة: مستطيل سماوي + غطاء + شعار
    const b = box(0.8,1.4,0.8,0x00e5ff,0x00e5ff,0.5); b.position.y=0.9; g.add(b);
    const cap = box(0.4,0.3,0.4,0xffffff); cap.position.y=1.75; g.add(cap);
    const lbl = box(0.82,0.4,0.82,0xffffff); lbl.position.y=0.9; g.add(lbl);
  }
  // قاعدة عائمة + ظل مربع
  const sh = box(1.4,0.08,1.4,0x000000); sh.material.transparent=true; sh.material.opacity=0.35; sh.position.y=0.04; g.add(sh);
  return g;
}

// ============ توزيع المقتنيات ============
const pickups = []; // {id, mesh, x, z, taken, respawnT, bob}
function spawnPickup(id, x, z){
  const mesh = buildFoodMesh(id);
  mesh.position.set(x, 0, z);
  scene.add(mesh);
  registerCullable(mesh, x, z);
  const p = { id, mesh, x, z, taken:false, respawnT:0, bob:rnd()*6 };
  pickups.push(p);
  return p;
}
// نثر ~120 فاكهة + 12 عبوة مبعثرة
{
  const ids = ['zorq','bubble','star','mint','egg'];
  for(let i=0;i<120;i++){
    const id = ids[Math.floor(rnd()*ids.length)];
    let x=(rnd()-0.5)*180, z=(rnd()-0.5)*180;
    if(Math.hypot(x,z)<14) { x+=30; } // بعيداً عن السفينة
    spawnPickup(id, x, z);
  }
  for(let i=0;i<12;i++) spawnPickup('o2tank', (rnd()-0.5)*120, (rnd()-0.5)*120);
}

// ============ السفينة المحطمة (مربعات رمادية) ============
const SHIP_POS = new THREE.Vector3(0,0,0);
const SHIP_R = 10;
{
  const ship = new THREE.Group();
  const hullMat = 0x90a4ae;
  const hull = box(13,3,5,hullMat); hull.position.y=2; hull.rotation.z=0.08; ship.add(hull);
  const nose = box(4,2.2,4,0x78909c); nose.position.set(8,1.6,0); nose.rotation.z=-0.35; ship.add(nose);
  const wing = box(6,0.5,4,0x607d8b); wing.position.set(-2,3.6,3); wing.rotation.z=0.5; wing.rotation.x=0.3; ship.add(wing);
  const wing2 = box(5,0.5,3.5,0x546e7a); wing2.position.set(-5,1, -3.4); wing2.rotation.z=-0.4; ship.add(wing2);
  const eng = box(2.5,2.5,2.5,0x37474f,0xff5722,0.35); eng.position.set(-7.2,2,0); ship.add(eng);
  const win = box(3,1,5.2,0x84ffff,0x84ffff,0.6); win.position.set(3.5,2.8,0); ship.add(win);
  const leg1 = box(0.8,2,0.8,0x455a64); leg1.position.set(4,0,1.8); ship.add(leg1);
  const leg2 = box(0.8,2,0.8,0x455a64); leg2.position.set(-3,0,-1.8); ship.add(leg2);
  const fire = box(1,1,1,0xff5722,0xff5722,1); fire.position.set(-8.5,1,1); fire.name='fire'; ship.add(fire);
  // إضاءة داخلية دافئة (صندوق مشع)
  const lamp = box(12,0.3,4.5,0xfff9c4,0xfff9c4,0.9); lamp.position.y=3.7; ship.add(lamp);
  // حلقة منطقة الأكسجين
  const ringMat = new THREE.MeshBasicMaterial({ color:0x00e5ff, transparent:true, opacity:0.13, depthWrite:false });
  const ring = new THREE.Mesh(new THREE.BoxGeometry(SHIP_R*2,0.15,SHIP_R*2), ringMat);
  ring.position.y=0.1; ship.add(ring);
  scene.add(ship);
  registerCullable(ship, 0, 0);
  // عبوات داخل السفينة تتجدد
  spawnPickup('o2tank', 3, 2); spawnPickup('o2tank', -3, -2); spawnPickup('zorq', 5, -3);
}

// ============ كائنات غريبة متجولة (مربعات!) ============
const aliens = [];
{
  for(let i=0;i<6;i++){
    const g = new THREE.Group();
    const col = [0xff5252,0xffd740,0x69f0ae][i%3];
    const body = box(1.4,1,1.4,col); body.position.y=0.8; g.add(body);
    const eye1 = box(0.35,0.35,0.2,0xffffff,0xffffff,0.6); eye1.position.set(-0.3,1.1,0.75); g.add(eye1);
    const eye2 = box(0.35,0.35,0.2,0xffffff,0xffffff,0.6); eye2.position.set(0.3,1.1,0.75); g.add(eye2);
    const legL = box(0.3,0.6,0.3,0x212121); legL.position.set(-0.8,0.3,0); g.add(legL);
    const legR = box(0.3,0.6,0.3,0x212121); legR.position.set(0.8,0.3,0); g.add(legR);
    const ant = box(0.12,0.9,0.12,0xffffff,0x00e5ff,0.5); ant.position.set(0,1.7,0); g.add(ant);
    let x=(rnd()-0.5)*140, z=(rnd()-0.5)*140;
    if(Math.hypot(x,z)<20) x+=40;
    g.position.set(x,0,z);
    scene.add(g); registerCullable(g,x,z);
    aliens.push({ mesh:g, x, z, dir:rnd()*6.28, t:rnd()*5, hitCd:0, legL, legR, ph:rnd()*6 });
  }
}

// ============ اللاعب: رائد مربع ============
const player = new THREE.Group();
let pLegL, pLegR, pArmL, pArmR;
{
  pLegL = box(0.45,0.8,0.45,0x37474f); pLegL.position.set(-0.28,0.4,0);
  pLegR = box(0.45,0.8,0.45,0x37474f); pLegR.position.set(0.28,0.4,0);
  const body = box(1.1,1.2,0.7,0x29b6f6); body.position.y=1.4; player.add(body);
  const pack = box(0.7,0.9,0.4,0x78909c); pack.position.set(0,1.4,-0.55); player.add(pack);
  const helm = box(0.9,0.8,0.8,0xeceff1); helm.position.y=2.4; player.add(helm);
  const visor = box(0.7,0.45,0.15,0x102027,0x00e5ff,0.7); visor.position.set(0,2.4,0.42); player.add(visor);
  const ant = box(0.08,0.6,0.08,0xffeb3b,0xffeb3b,0.6); ant.position.set(0.3,3,0); player.add(ant);
  pArmL = box(0.3,0.9,0.3,0x0288d1); pArmL.position.set(-0.72,1.4,0);
  pArmR = box(0.3,0.9,0.3,0x0288d1); pArmR.position.set(0.72,1.4,0);
  player.add(pLegL,pLegR,pArmL,pArmR);
  player.position.set(6,0,6);
  scene.add(player);
}

// ============ حالة اللعب ============
const state = {
  started:false, over:false, muted:false,
  o2:100, hp:100, time:0, day:1,
  px:6, pz:6, py:0, vy:0, grounded:true,
  inv:new Array(27).fill(null), // {id,n}
  sel:0, score:0,
};
try{
  const s = JSON.parse(localStorage.getItem(SAVE_KEY)||'null');
  if(s && Array.isArray(s.inv)) state.inv = s.inv.concat(new Array(27).fill(null)).slice(0,27);
}catch(e){}
function save(){ try{ localStorage.setItem(SAVE_KEY, JSON.stringify({inv:state.inv})); }catch(e){} }

// ============ صوت بسيط بدون ملفات ============
let AC=null;
function beep(f=440,d=0.12,type='square'){
  if(state.muted) return;
  try{
    AC = AC || new (window.AudioContext||window.webkitAudioContext)();
    const o=AC.createOscillator(), g=AC.createGain();
    o.type=type; o.frequency.value=f; g.gain.value=0.08;
    o.connect(g); g.connect(AC.destination); o.start();
    g.gain.exponentialRampToValueAtTime(0.0001, AC.currentTime+d);
    o.stop(AC.currentTime+d);
  }catch(e){}
}

// ============ واجهة ============
const $ = id=>document.getElementById(id);
const toastEl = $('toast');
let toastT=null;
function toast(msg){ toastEl.textContent=msg; toastEl.classList.remove('hidden'); clearTimeout(toastT); toastT=setTimeout(()=>toastEl.classList.add('hidden'),1800); }

function renderHotbar(){
  const hb=$('hotbar'); hb.innerHTML='';
  for(let i=0;i<9;i++){
    const s=state.inv[i];
    const d=document.createElement('div');
    d.className='slot'+(state.sel===i?' selected':'');
    const item = s?ITEMS[s.id]:null;
    d.innerHTML = s?`<span>${item.icon}</span><span class="count">×${s.n}</span><span class="nm">${item.name}</span>`:`<span style="opacity:.25">·</span>`;
    d.onclick=()=>{ state.sel=i; beep(600,0.06); renderHotbar(); renderInv(); };
    hb.appendChild(d);
  }
}
function renderInv(){
  const gr=$('inv-grid'); gr.innerHTML='';
  for(let i=0;i<27;i++){
    const s=state.inv[i];
    const d=document.createElement('div');
    d.className='slot'+(state.sel===i?' selected':'');
    const item=s?ITEMS[s.id]:null;
    d.innerHTML=s?`<span>${item.icon}</span><span class="count">×${s.n}</span>`:'';
    d.title = s?`${item.name} — ${item.desc}`:'فارغ';
    d.onclick=()=>{ state.sel=i; beep(600,0.06);
      $('inv-info').textContent = s?`${item.icon} ${item.name} ×${s.n} — ${item.desc}`:'خانة فارغة';
      renderHotbar(); renderInv(); };
    gr.appendChild(d);
  }
  const s=state.inv[state.sel];
  $('inv-info').textContent = s?`${ITEMS[s.id].icon} ${ITEMS[s.id].name} ×${s.n} — ${ITEMS[s.id].desc}`:'اختر عنصراً…';
}
function addItem(id){
  for(let i=0;i<27;i++){ const s=state.inv[i];
    if(s&&s.id===id&&s.n<99){ s.n++; renderHotbar(); renderInv(); save(); return true; } }
  for(let i=0;i<27;i++){ if(!state.inv[i]){ state.inv[i]={id,n:1}; renderHotbar(); renderInv(); save(); return true; } }
  toast('🎒 الحقيبة ممتلئة!'); return false;
}
function consumeSelected(){
  const s=state.inv[state.sel];
  if(!s){ toast('لا يوجد عنصر محدد'); return; }
  const it=ITEMS[s.id];
  if(s.id==='o2tank'){ state.o2=Math.min(100,state.o2+it.o2); toast(`🫁 +${it.o2} أكسجين!`); }
  else { state.hp=Math.min(100,state.hp+it.hp); state.o2=Math.min(100,state.o2+it.o2); toast(`😋 ${it.name}: +${it.hp}❤️ +${it.o2}🫁`); }
  beep(880,0.15,'sine');
  s.n--; if(s.n<=0) state.inv[state.sel]=null;
  state.score++;
  renderHotbar(); renderInv(); save();
}

// ============ تحكم (لمس + كيبورد) ============
const keys={};
addEventListener('keydown',e=>{
  keys[e.code]=true;
  if(e.code==='Space') e.preventDefault();
  if(e.code==='KeyE') tryCollect();
  if(e.code==='KeyQ') consumeSelected();
  if(e.code==='KeyO') useO2();
});
addEventListener('keyup',e=>keys[e.code]=false);

const joy={x:0,y:0,active:false,id:null};
const joyEl=$('joystick'), stickEl=$('stick');
function joyCenter(){ const r=joyEl.getBoundingClientRect(); return {x:r.left+r.width/2, y:r.top+r.height/2, r:r.width/2}; }
joyEl.addEventListener('touchstart',e=>{ const t=e.changedTouches[0]; joy.id=t.identifier; joy.active=true; e.preventDefault(); },{passive:false});
addEventListener('touchmove',e=>{
  for(const t of e.changedTouches){ if(t.identifier===joy.id){
    const c=joyCenter(); let dx=(t.clientX-c.x)/c.r, dy=(t.clientY-c.y)/c.r;
    const m=Math.hypot(dx,dy); if(m>1){dx/=m;dy/=m;}
    joy.x=dx; joy.y=dy;
    stickEl.style.transform=`translate(${-dx*33}px,${-dy*33}px)`; // RTL: انعكاس أفقي
  }}
},{passive:true});
addEventListener('touchend',e=>{
  for(const t of e.changedTouches){ if(t.identifier===joy.id){ joy.x=joy.y=0; joy.active=false; stickEl.style.transform=''; } }
});
function bindHold(id,fn){ const el=$(id);
  el.addEventListener('touchstart',e=>{e.preventDefault();fn();},{passive:false});
  el.addEventListener('mousedown',fn);
}
bindHold('btn-jump',()=>{ if(state.grounded){ state.vy=8.5; state.grounded=false; beep(300,0.1);} });
bindHold('btn-collect',tryCollect);
bindHold('btn-use',consumeSelected);
bindHold('btn-o2',useO2);
function useO2(){
  const idx=state.inv.findIndex(s=>s&&s.id==='o2tank');
  if(idx<0){ toast('لا توجد عبوة O₂ — ابحث في السفينة!'); beep(200,0.2); return; }
  state.sel=idx; consumeSelected();
}

// أقرب عنصر قابل للجمع
function tryCollect(){
  if(!state.started||state.over) return;
  let best=null,bd=3.4;
  for(const p of pickups){ if(p.taken) continue;
    const d=Math.hypot(p.x-state.px,p.z-state.pz);
    if(d<bd){bd=d;best=p;} }
  if(best){ best.taken=true; best.mesh.visible=false; best.respawnT=45;
    addItem(best.id); beep(700+Math.random()*300,0.1);
    toast(`${ITEMS[best.id].icon} +1 ${ITEMS[best.id].name}`);
  } else toast('لا شيء قريب — اقترب من فاكهة!');
}

$('btn-consume').onclick=consumeSelected;
$('btn-drop').onclick=()=>{ const s=state.inv[state.sel]; if(s){state.inv[state.sel]=null; renderHotbar(); renderInv(); save(); toast('🗑️ تم الرمي');} };
$('btn-inventory-open').onclick=()=>{ renderInv(); $('inventory-modal').classList.remove('hidden'); beep(500,0.08); };
$('btn-inventory-close').onclick=()=>$('inventory-modal').classList.add('hidden');
$('btn-help').onclick=()=>$('help-modal').classList.remove('hidden');
$('btn-help-close').onclick=()=>$('help-modal').classList.add('hidden');
$('btn-mute').onclick=e=>{ state.muted=!state.muted; e.target.textContent=state.muted?'🔇':'🔊'; };
$('btn-respawn').onclick=()=>{
  state.over=false; state.hp=100; state.o2=100; state.px=6; state.pz=6; state.vy=0;
  $('death-screen').classList.add('hidden'); toast('🛸 عدت إلى السفينة بأمان'); beep(880,0.2,'sine');
};
$('btn-start').onclick=()=>{
  state.started=true;
  $('start-screen').classList.add('hidden');
  $('hud').classList.remove('hidden'); $('hotbar').classList.remove('hidden'); $('touch-controls').classList.remove('hidden');
  try{ AC=new (window.AudioContext||window.webkitAudioContext)(); }catch(e){}
  beep(880,0.2,'sine'); toast('🛸 ابحث عن الطعام! السفينة = أكسجين');
  // قفل أفقي إن أمكن
  try{ if(screen.orientation&&screen.orientation.lock) screen.orientation.lock('landscape').catch(()=>{}); }catch(e){}
};

addEventListener('resize',()=>{ camera.aspect=innerWidth/innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth,innerHeight); });

// ============ الحلقة الرئيسية ============
const clock = new THREE.Clock();
let walkPh=0, perfT=0;
const tmpV = new THREE.Vector3();

function update(dt){
  state.time+=dt;
  // --- حركة ---
  let mx=0,mz=0;
  if(keys['KeyW']||keys['ArrowUp']) mz-=1;
  if(keys['KeyS']||keys['ArrowDown']) mz+=1;
  if(keys['KeyA']||keys['ArrowLeft']) mx-=1;
  if(keys['KeyD']||keys['ArrowRight']) mx+=1;
  mx+=-joy.x; mz+=-joy.y; // joystick (معكوس لأن الكاميرا تنظر من الجنوب)
  const ml=Math.hypot(mx,mz);
  if(ml>1){mx/=ml;mz/=ml;}
  const SPEED=9;
  state.px+=mx*SPEED*dt; state.pz+=mz*SPEED*dt;
  state.px=Math.max(-WORLD_R+2,Math.min(WORLD_R-2,state.px));
  state.pz=Math.max(-WORLD_R+2,Math.min(WORLD_R-2,state.pz));
  // قفز/جاذبية
  if((keys['Space'])&&state.grounded){ state.vy=8.5; state.grounded=false; }
  state.vy-=22*dt; state.py+=state.vy*dt;
  if(state.py<=0){ state.py=0; state.vy=0; state.grounded=true; }
  player.position.set(state.px,state.py,state.pz);
  if(ml>0.1){ player.rotation.y=Math.atan2(mx,mz); walkPh+=dt*10;
    pLegL.position.y=0.4+Math.sin(walkPh)*0.25; pLegR.position.y=0.4-Math.sin(walkPh)*0.25;
    pArmL.rotation.x=Math.sin(walkPh)*0.6; pArmR.rotation.x=-Math.sin(walkPh)*0.6;
  } else { pArmL.rotation.x*=0.9; pArmR.rotation.x*=0.9; }
  player.position.y=state.py+Math.abs(Math.sin(walkPh))*0.08;

  // --- السفينة = أكسجين ---
  const inShip = Math.hypot(state.px-SHIP_POS.x,state.pz-SHIP_POS.z)<SHIP_R;
  if(inShip){ state.o2=Math.min(100,state.o2+25*dt); }
  else { state.o2=Math.max(0,state.o2-1.9*dt); }
  if(state.o2<=0){ state.hp=Math.max(0,state.hp-6*dt); }
  else if(state.hp<100&&state.o2>30){ state.hp=Math.min(100,state.hp+1.2*dt); }
  $('chip-ship').classList.toggle('hidden',!inShip);

  // --- الكائنات الغريبة ---
  for(const a of aliens){
    a.t-=dt;
    if(a.t<=0){ a.t=2+Math.random()*3; a.dir=Math.random()*6.28; }
    // انجذاب خفيف نحو اللاعب إذا قريب
    const dx=state.px-a.x, dz=state.pz-a.z, d=Math.hypot(dx,dz);
    let vx=Math.sin(a.dir)*1.5, vz=Math.cos(a.dir)*1.5;
    if(d<14){ vx=dx/d*3.2; vz=dz/d*3.2; }
    a.x+=vx*dt; a.z+=vz*dt;
    a.mesh.position.set(a.x,Math.abs(Math.sin(state.time*4+a.ph))*0.25,a.z);
    a.mesh.rotation.y=Math.atan2(vx,vz);
    a.hitCd-=dt;
    if(d<1.6&&a.hitCd<=0){ a.hitCd=1.2; state.hp=Math.max(0,state.hp-10); beep(150,0.25,'sawtooth'); toast('👾 عضة فضائية! -10❤️ اهرب!'); }
    // تحديث موقع الـculling (يتحرك!)
    for(const c of cullables){ if(c.obj===a.mesh){ c.x=a.x; c.z=a.z; break; } }
  }

  // --- تمايل المقتنيات + إعادة الإحياء ---
  for(const p of pickups){
    if(p.taken){ p.respawnT-=dt;
      if(p.respawnT<=0){ p.taken=false; }
      continue; }
    p.bob+=dt*2;
    p.mesh.position.y=Math.sin(p.bob)*0.18+0.1;
    p.mesh.rotation.y+=dt*0.8;
  }

  // --- الموت ---
  if(state.hp<=0&&!state.over){
    state.over=true; beep(100,0.6,'sawtooth');
    $('death-stats').textContent=`صمدت ${Math.floor(state.time)} ثانية • جمعت ${state.score} عنصراً`;
    $('death-screen').classList.remove('hidden');
  }

  // --- كاميرا 2.5D تتبع ---
  tmpV.set(state.px,0,state.pz).add(CAM_OFF);
  camera.position.lerp(tmpV, 1-Math.pow(0.001,dt));
  camera.lookAt(state.px,1,state.pz);

  // --- نظام الخفة (كل إطار — رخيص: مقارنة مسافات فقط) ---
  updateCulling(state.px,state.pz);

  // --- HUD ---
  $('oxygen-fill').style.width=state.o2+'%';
  $('health-fill').style.width=state.hp+'%';
  $('oxygen-text').textContent=Math.ceil(state.o2);
  $('health-text').textContent=Math.ceil(state.hp);
  $('oxygen-fill').classList.toggle('low',state.o2<25);
  $('health-fill').classList.toggle('low',state.hp<25);

  perfT-=dt;
  if(perfT<=0){ perfT=0.5; $('chip-perf').textContent=`👁️ ${activeCount}/${totalCreatable}`; }
}

function loop(){
  requestAnimationFrame(loop);
  const dt=Math.min(clock.getDelta(),0.05);
  if(state.started&&!state.over) update(dt);
  else { // شاشة البداية: دوران عرض خفيف
    const t=performance.now()*0.0001;
    camera.position.set(Math.sin(t)*30,26,Math.cos(t)*30+10);
    camera.lookAt(0,1,0);
    updateCulling(0,0);
  }
  renderer.render(scene,camera);
}
renderHotbar(); renderInv();
loop();
