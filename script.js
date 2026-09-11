/*******************************************************
 * Frontend Logic — SPA ระบบบันทึกข้อมูลแบบแปลนงานก่อสร้าง
 * Version 3.0 — Pastel Blue + Router Fixed
 *******************************************************/

const API_URL = 'https://script.google.com/macros/s/AKfycbyQfEQUeqrCkhd61dbftgJf3gtnHWctj2Ap4BAMWMP2f2JNcXkeexWRmuLxlFoGrMY0/exec';

const VIEWS = ['dashboard','form','data'];

const DOC_TYPES = [
  { key:'approval',  field:'approvalUrl',  label:'บันทึกขออนุมัติโครงการ', icon:'fa-file-signature',      tone:'sky'   },
  { key:'blueprint', field:'blueprintUrl', label:'แบบแปลน',               icon:'fa-drafting-compass',    tone:'lilac' },
  { key:'estimate',  field:'estimateUrl',  label:'เอกสารประมาณราคา',      icon:'fa-file-invoice-dollar', tone:'mint'  }
];

const State = {
  token:'', user:null,
  items:[], filtered:[],
  options:{ years:[], agencies:[] },
  uploads:{ approval:null, blueprint:null, estimate:null },
  viewMode:'card', editing:null, currentView:'dashboard',
  map:null, marker:null, detailMap:null,
  charts:{ agency:null, year:null }
};

const $  = s => document.querySelector(s);
const $ = s => Array.from(document.querySelectorAll(s));

function safeJSON(str){ try{ return JSON.parse(str); }catch(e){ return null; } }
function safe(label, fn){ try{ fn(); }catch(err){ console.error(`[init:${label}]`, err); } }

try{
  State.token = localStorage.getItem('bp_token') || '';
  State.user  = safeJSON(localStorage.getItem('bp_user'));
}catch(e){}

/* ==========================================================
   UTILITIES
   ========================================================== */
const fmtNum   = n => (Number(n)||0).toLocaleString('th-TH');
const fmtMoney = n => (Number(n)||0).toLocaleString('th-TH',{minimumFractionDigits:2,maximumFractionDigits:2});

function shortNum(n){
  n = Number(n)||0;
  if(n >= 1e9) return (n/1e9).toFixed(2)+' พันล.';
  if(n >= 1e6) return (n/1e6).toFixed(2)+' ล.';
  if(n >= 1e3) return (n/1e3).toFixed(1)+' พัน';
  return fmtNum(n);
}
function esc(s){
  return String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}
function fmtDate(iso){
  if(!iso) return '-';
  const d = new Date(iso);
  if(isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('th-TH',{day:'2-digit',month:'short',year:'numeric'}) + ' ' +
         d.toLocaleTimeString('th-TH',{hour:'2-digit',minute:'2-digit'});
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

function showLoader(t='กำลังโหลดข้อมูล...'){ const e=$('#loaderText'); if(e) e.textContent=t; const l=$('#loader'); if(l) l.classList.remove('hidden'); }
function hideLoader(){ const l=$('#loader'); if(l) l.classList.add('hidden'); }

function toast(msg, type='info'){
  const wrap = $('#toastWrap'); if(!wrap) return;
  const icon = { success:'fa-circle-check', error:'fa-circle-exclamation', warn:'fa-triangle-exclamation', info:'fa-circle-info' }[type];
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<i class="fa-solid ${icon}"></i><span>${esc(msg)}</span>`;
  wrap.appendChild(el);
  setTimeout(()=>{ el.style.opacity='0'; el.style.transform='translateX(70px)'; setTimeout(()=>el.remove(),320); }, 3800);
}

/* ==========================================================
   ★ ROUTER (แก้ไขแล้ว) — ผูกด้วย Event Delegation
   ========================================================== */
function switchView(name){
  if(!VIEWS.includes(name)) name = 'dashboard';
  State.currentView = name;

  $('.view').forEach(v => v.classList.remove('active'));
  const target = document.getElementById('view-' + name);
  if(target) target.classList.add('active');

  $('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.view === name));

  const nav = $('#navMenu'); if(nav) nav.classList.remove('open');
  window.scrollTo({ top:0, behavior:'smooth' });

  if(name === 'form' && State.map) setTimeout(()=>{ try{ State.map.invalidateSize(); }catch(e){} }, 260);

  const want = '#' + name;
  if(location.hash !== want){
    try{ history.replaceState(null, '', want); }catch(e){ location.hash = name; }
  }
}

/** ผูกเมนูกับ document เป็นอันดับแรกสุด — ไม่มีทางพลาดแม้ส่วนอื่นพัง */
function bindRouter(){
  document.addEventListener('click', e => {
    const navBtn = e.target.closest('.nav-btn');
    if(navBtn && navBtn.dataset.view){ e.preventDefault(); switchView(navBtn.dataset.view); return; }

    const burger = e.target.closest('#btnBurger');
    if(burger){ const n = $('#navMenu'); if(n) n.classList.toggle('open'); return; }
  });

  window.addEventListener('hashchange', () => {
    const h = (location.hash || '#dashboard').replace('#','');
    if(h !== State.currentView) switchView(h);
  });
}
bindRouter();   // ← เรียกทันทีตอนโหลดสคริปต์

/* ==========================================================
   API LAYER — Timeout + Retry + Cache
   ========================================================== */
const NET = { timeout:30000, retries:2, backoff:900 };

async function rawFetch(url, opt = {}, timeout = NET.timeout){
  const ctrl = new AbortController();
  const timer = setTimeout(()=>ctrl.abort(), timeout);
  try{
    const res = await fetch(url, Object.assign({ signal:ctrl.signal, redirect:'follow' }, opt));
    if(!res.ok) throw new Error(`เซิร์ฟเวอร์ตอบกลับสถานะ ${res.status}`);
    const text = await res.text();
    let json;
    try{ json = JSON.parse(text); }
    catch(e){ throw new Error('เซิร์ฟเวอร์ตอบกลับรูปแบบไม่ถูกต้อง (อาจยังไม่ได้ Deploy เวอร์ชันใหม่)'); }
    if(!json.ok) throw new Error(json.error || 'เกิดข้อผิดพลาดจากเซิร์ฟเวอร์');
    return json.data;
  } finally { clearTimeout(timer); }
}

async function withRetry(fn, label){
  let lastErr;
  for(let i = 0; i <= NET.retries; i++){
    try{ return await fn(); }
    catch(err){
      lastErr = err;
      const msg = String(err.message || err);
      const retryable = err.name === 'AbortError' ||
        /Failed to fetch|NetworkError|Load failed|สถานะ 5\d\d|สถานะ 429|ประมวลผลคำขออื่น/i.test(msg);
      if(!retryable || i === NET.retries) break;
      await sleep(NET.backoff * Math.pow(2, i));
    }
  }
  if(/เซสชันหมดอายุ/.test(lastErr.message || '')) handleSessionExpired();
  console.error(`[API:${label}]`, lastErr);
  throw lastErr;
}

async function apiGet(action, params = {}){
  return withRetry(() => {
    const q = new URLSearchParams(Object.assign({ action, token:State.token, _t:Date.now() }, params));
    return rawFetch(`${API_URL}?${q}`, { method:'GET' });
  }, action);
}

async function apiPost(action, payload = {}, timeout){
  return withRetry(() => rawFetch(API_URL, {
    method:'POST',
    headers:{ 'Content-Type':'text/plain;charset=utf-8' },
    body: JSON.stringify(Object.assign({ action, token:State.token }, payload))
  }, timeout), action);
}

function handleSessionExpired(){
  if(!State.token) return;
  setAuth('', null);
  toast('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่','warn');
}

const CACHE_KEY = 'bp_cache_v1';
function saveCache(){ try{ localStorage.setItem(CACHE_KEY, JSON.stringify({ t:Date.now(), items:State.items })); }catch(e){} }
function loadCache(){ const c = safeJSON(localStorage.getItem(CACHE_KEY)); return (c && Array.isArray(c.items)) ? c : null; }

function showNet(msg, isOk=false){
  const b = $('#netBanner'); if(!b) return;
  $('#netText').textContent = msg;
  b.classList.toggle('ok', isOk);
  b.classList.remove('hidden');
  if(isOk) setTimeout(()=>b.classList.add('hidden'), 2600);
}
function hideNet(){ const b = $('#netBanner'); if(b) b.classList.add('hidden'); }

/* ==========================================================
   AUTHENTICATION
   ========================================================== */
function isAdmin(){ return !!State.token && !!State.user; }

function applyAuthUI(){
  const admin = isAdmin();
  const chip = $('#userChip'), login = $('#btnLogin'), lock = $('#guestLock'),
        form = $('#projectForm'), badge = $('#guestBadge');
  if(chip)  chip.classList.toggle('hidden', !admin);
  if(login) login.classList.toggle('hidden', admin);
  if(admin && $('#userName')) $('#userName').textContent = State.user.name || State.user.username;
  if(lock)  lock.classList.toggle('hidden', admin);
  if(form)  form.classList.toggle('hidden', !admin);
  if(badge) badge.classList.toggle('hidden', admin);
}

function setAuth(token, user){
  State.token = token || '';
  State.user  = user || null;
  try{
    if(token){ localStorage.setItem('bp_token', token); localStorage.setItem('bp_user', JSON.stringify(user)); }
    else { localStorage.removeItem('bp_token'); localStorage.removeItem('bp_user'); }
  }catch(e){}
  applyAuthUI();
}

let loggingIn = false;
async function doLogin(e){
  e.preventDefault();
  if(loggingIn) return;
  const u = $('#loginUser').value.trim(), p = $('#loginPass').value;
  const errBox = $('#loginError');
  errBox.classList.add('hidden');
  if(!u || !p){ errBox.textContent='กรุณากรอกชื่อผู้ใช้และรหัสผ่าน'; errBox.classList.remove('hidden'); return; }

  const btn = $('#btnDoLogin'), html = btn.innerHTML;
  loggingIn = true; btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังตรวจสอบ...';
  try{
    const d = await apiPost('login', { username:u, password:p });
    setAuth(d.token, d.user);
    closeModal('#loginModal');
    $('#loginForm').reset();
    toast(`ยินดีต้อนรับ ${d.user.name}`,'success');
    await loadAll();
  }catch(err){
    errBox.textContent = err.message; errBox.classList.remove('hidden');
  }finally{ loggingIn = false; btn.disabled = false; btn.innerHTML = html; }
}

async function doLogout(){
  if(!confirm('ต้องการออกจากระบบใช่หรือไม่?')) return;
  try{ await apiPost('logout', {}); }catch(e){}
  setAuth('', null);
  resetForm();
  toast('ออกจากระบบแล้ว','info');
  await loadAll();
  switchView('dashboard');
}

/* ==========================================================
   MODAL
   ========================================================== */
function openModal(sel){ const m=$(sel); if(!m) return; m.classList.add('show'); document.body.style.overflow='hidden'; }
function closeModal(sel){
  const m=$(sel); if(!m) return;
  m.classList.remove('show'); document.body.style.overflow='';
  if(sel === '#detailModal' && State.detailMap){ try{ State.detailMap.remove(); }catch(e){} State.detailMap = null; }
}

/* ==========================================================
   DASHBOARD
   ========================================================== */
const PALETTE   = ['#7cc6fb','#4fa3f0','#b7a9ff','#7fe0c4','#ffc98d','#ffa8bc','#ffe08a','#9be3f5','#c9b6f7','#8fd6b4'];
const chartFont = { family:'Prompt', size:11 };
const TICK   = '#5a83ab';
const GRIDLN = 'rgba(124,189,250,.22)';

async function loadDashboard(){
  const s = await apiGet('stats');
  $('#statProjects').textContent = fmtNum(s.totalProjects);
  $('#statBudget').textContent   = shortNum(s.totalBudget);
  $('#statSheets').textContent   = fmtNum(s.totalSheets);
  $('#statAgencies').textContent = fmtNum(s.totalAgencies);
  renderAgencyChart(s.byAgency || []);
  renderYearChart(s.byYear || []);
  renderRecent(s.recent || []);
}

function renderAgencyChart(rows){
  const ctx = $('#chartAgency'); if(!ctx || typeof Chart === 'undefined') return;
  if(State.charts.agency){ State.charts.agency.destroy(); State.charts.agency = null; }
  if(!rows.length) return;
  State.charts.agency = new Chart(ctx, {
    type:'doughnut',
    data:{ labels: rows.map(r=>r.label),
      datasets:[{ data: rows.map(r=>r.budget), backgroundColor:PALETTE, borderColor:'#ffffff', borderWidth:3, hoverOffset:16 }] },
    options:{
      responsive:true, maintainAspectRatio:false, cutout:'62%',
      plugins:{
        legend:{ position:'bottom', labels:{ color:'#2b5f8f', font:chartFont, boxWidth:12, padding:12 } },
        tooltip:{ backgroundColor:'#ffffff', titleColor:'#123a63', bodyColor:'#2b5f8f',
                  borderColor:'#bfe1ff', borderWidth:1, titleFont:chartFont, bodyFont:chartFont, padding:12,
                  callbacks:{ label: c => ` ${c.label}: ${fmtMoney(c.raw)} บาท (${rows[c.dataIndex].count} โครงการ)` } }
      }
    }
  });
}

function renderYearChart(rows){
  const ctx = $('#chartYear'); if(!ctx || typeof Chart === 'undefined') return;
  if(State.charts.year){ State.charts.year.destroy(); State.charts.year = null; }
  if(!rows.length) return;
  State.charts.year = new Chart(ctx, {
    data:{
      labels: rows.map(r=>'พ.ศ. '+r.label),
      datasets:[
        { type:'bar', label:'จำนวนโครงการ', data: rows.map(r=>r.count),
          backgroundColor:'rgba(124,198,251,.85)', borderColor:'#4fa3f0', borderWidth:1, borderRadius:10, yAxisID:'y' },
        { type:'line', label:'งบประมาณ (ล้านบาท)', data: rows.map(r=> +(r.budget/1e6).toFixed(2)),
          borderColor:'#b7a9ff', backgroundColor:'rgba(183,169,255,.22)', tension:.35, fill:true,
          pointRadius:4, pointBackgroundColor:'#b7a9ff', pointBorderColor:'#fff', pointBorderWidth:2, yAxisID:'y1' }
      ]
    },
    options:{
      responsive:true, maintainAspectRatio:false,
      interaction:{ mode:'index', intersect:false },
      plugins:{
        legend:{ labels:{ color:'#2b5f8f', font:chartFont, boxWidth:12 } },
        tooltip:{ backgroundColor:'#ffffff', titleColor:'#123a63', bodyColor:'#2b5f8f',
                  borderColor:'#bfe1ff', borderWidth:1, titleFont:chartFont, bodyFont:chartFont, padding:12 }
      },
      scales:{
        x :{ ticks:{ color:TICK, font:chartFont }, grid:{ color:GRIDLN } },
        y :{ position:'left',  beginAtZero:true, ticks:{ color:'#2f86d8', font:chartFont, precision:0 }, grid:{ color:GRIDLN } },
        y1:{ position:'right', beginAtZero:true, ticks:{ color:'#8b79f0', font:chartFont }, grid:{ drawOnChartArea:false } }
      }
    }
  });
}

function renderRecent(rows){
  const box = $('#recentList'); if(!box) return;
  if(!rows.length){ box.innerHTML = '<div class="empty">ยังไม่มีข้อมูลในระบบ</div>'; return; }
  box.innerHTML = rows.map(r => `
    <div class="recent-item" data-id="${esc(r.id)}">
      <div><b>${esc(r.projectName)}</b><br><span>${esc(r.agency||'-')} · แบบแปลนเลขที่ ${esc(r.planNo||'-')}</span></div>
      <div style="text-align:right;flex-shrink:0"><span class="chip">ปี ${esc(r.budgetYear)}</span><br><span>${fmtDate(r.timestamp)}</span></div>
    </div>`).join('');
  box.querySelectorAll('.recent-item').forEach(el => el.addEventListener('click', ()=> openDetail(el.dataset.id)));
}

/* ==========================================================
   OPTIONS
   ========================================================== */
async function loadOptions(){
  try{ State.options = await apiGet('options'); }
  catch(e){
    const y = new Date().getFullYear() + 543, years = [];
    for(let i = y+2; i >= y-8; i--) years.push(i);
    State.options = { years, agencies:['อื่น ๆ'] };
    toast('โหลดรายการตัวเลือกไม่สำเร็จ ใช้ค่าเริ่มต้นแทน','warn');
  }
  const yearOpts   = State.options.years.map(y=>`<option value="${y}">${y}</option>`).join('');
  const agencyOpts = State.options.agencies.map(a=>`<option value="${esc(a)}">${esc(a)}</option>`).join('');
  $('#budgetYear').innerHTML   = '<option value="">-- เลือกปีงบประมาณ --</option>' + yearOpts;
  $('#agency').innerHTML       = '<option value="">-- เลือกหน่วยงาน --</option>' + agencyOpts;
  $('#filterYear').innerHTML   = '<option value="">ทุกปีงบประมาณ</option>' + yearOpts;
  $('#filterAgency').innerHTML = '<option value="">ทุกหน่วยงาน</option>' + agencyOpts;
}

/* ==========================================================
   MAP
   ========================================================== */
const DEFAULT_CENTER = [13.7563, 100.5018];

function initMap(){
  if(typeof L === 'undefined' || !$('#map')) return;
  State.map = L.map('map', { scrollWheelZoom:true }).setView(DEFAULT_CENTER, 6);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom:19, attribution:'&copy; OpenStreetMap contributors'
  }).addTo(State.map);
  State.map.on('click', e => setMarker(e.latlng.lat, e.latlng.lng));
  setTimeout(()=>{ try{ State.map.invalidateSize(); }catch(e){} }, 450);
}

function setMarker(lat, lng, zoom){
  if(!State.map) return;
  lat = +(+lat).toFixed(6); lng = +(+lng).toFixed(6);
  if(isNaN(lat) || isNaN(lng)) return;
  if(State.marker) State.map.removeLayer(State.marker);
  State.marker = L.marker([lat,lng], { draggable:true }).addTo(State.map).bindPopup(`📍 ${lat}, ${lng}`).openPopup();
  State.marker.on('dragend', ev => {
    const p = ev.target.getLatLng();
    $('#lat').value = p.lat.toFixed(6); $('#lng').value = p.lng.toFixed(6);
    State.marker.setPopupContent(`📍 ${p.lat.toFixed(6)}, ${p.lng.toFixed(6)}`);
  });
  $('#lat').value = lat; $('#lng').value = lng;
  if(zoom) State.map.setView([lat,lng], zoom);
}

function clearPin(){
  if(State.marker && State.map){ State.map.removeLayer(State.marker); State.marker = null; }
  $('#lat').value = ''; $('#lng').value = '';
  toast('ล้างหมุดแล้ว','info');
}

async function searchPlace(){
  const q = $('#mapSearch').value.trim();
  if(!q) return toast('กรุณาพิมพ์ชื่อสถานที่','warn');
  try{
    showLoader('กำลังค้นหาสถานที่...');
    const ctrl = new AbortController();
    setTimeout(()=>ctrl.abort(), 15000);
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=th&q=${encodeURIComponent(q)}`, { signal:ctrl.signal });
    const arr = await res.json();
    if(!arr.length){ toast('ไม่พบสถานที่ที่ค้นหา','warn'); return; }
    setMarker(arr[0].lat, arr[0].lon, 15);
    toast('พบตำแหน่ง: ' + String(arr[0].display_name).slice(0,60),'success');
  }catch(e){ toast('ค้นหาไม่สำเร็จ กรุณาลองใหม่','error'); }
  finally{ hideLoader(); }
}

function useMyLocation(){
  if(!navigator.geolocation) return toast('อุปกรณ์ไม่รองรับการระบุตำแหน่ง','warn');
  showLoader('กำลังระบุตำแหน่งปัจจุบัน...');
  navigator.geolocation.getCurrentPosition(
    pos => { hideLoader(); setMarker(pos.coords.latitude, pos.coords.longitude, 16); toast('ปักหมุดตำแหน่งปัจจุบันแล้ว','success'); },
    ()  => { hideLoader(); toast('ไม่สามารถเข้าถึงตำแหน่งได้ กรุณาอนุญาตสิทธิ์ในเบราว์เซอร์','error'); },
    { enableHighAccuracy:true, timeout:12000 }
  );
}

/* ==========================================================
   UPLOAD
   ========================================================== */
const uploadingKeys = new Set();

function buildUploadCards(){
  const grid = $('#uploadGrid'); if(!grid) return;
  grid.innerHTML = DOC_TYPES.map(d => `
    <div class="upload-card tone-${d.tone}" id="up-${d.key}">
      <input type="file" accept="application/pdf,.pdf" id="file-${d.key}">
      <i class="fa-solid ${d.icon} big"></i>
      <h5>${d.label}</h5>
      <small id="name-${d.key}">คลิกเพื่อเลือกไฟล์ PDF</small>
      <div class="progress" id="pg-${d.key}" style="display:none"><i></i></div>
      <div class="up-actions" id="act-${d.key}"></div>
    </div>`).join('');

  DOC_TYPES.forEach(d => {
    const card = $(`#up-${d.key}`), input = $(`#file-${d.key}`);
    card.addEventListener('click', e => { if(!e.target.closest('.mini-btn')) input.click(); });
    input.addEventListener('change', () => handleFile(d, input.files[0]));
  });
}

function fileToBase64(file){
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload  = () => { try{ resolve(r.result.split(',')[1]); }catch(e){ reject(new Error('อ่านไฟล์ไม่สำเร็จ')); } };
    r.onerror = () => reject(new Error('อ่านไฟล์ไม่สำเร็จ'));
    r.readAsDataURL(file);
  });
}

async function handleFile(doc, file){
  if(!file) return;
  const fileInput = $(`#file-${doc.key}`);
  if(uploadingKeys.has(doc.key)) return toast('กำลังอัปโหลดไฟล์นี้อยู่ กรุณารอสักครู่','warn');
  if(!isAdmin()){ fileInput.value=''; return toast('กรุณาเข้าสู่ระบบก่อนอัปโหลด','warn'); }

  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  if(!isPdf)                   { fileInput.value=''; return toast('อนุญาตเฉพาะไฟล์ PDF เท่านั้น','error'); }
  if(file.size === 0)          { fileInput.value=''; return toast('ไฟล์เสียหายหรือว่างเปล่า','error'); }
  if(file.size > 20*1024*1024) { fileInput.value=''; return toast(`ไฟล์ใหญ่เกิน 20 MB (ไฟล์นี้ ${(file.size/1048576).toFixed(1)} MB)`,'error'); }

  uploadingKeys.add(doc.key);
  const pg = $(`#pg-${doc.key}`), bar = pg.querySelector('i'), nameEl = $(`#name-${doc.key}`);
  pg.style.display='block'; bar.style.width='10%';
  nameEl.textContent = `กำลังอ่านไฟล์ (${(file.size/1048576).toFixed(1)} MB)...`;

  try{
    const b64 = await fileToBase64(file);
    bar.style.width = '45%'; nameEl.textContent = 'กำลังส่งขึ้น Google Drive...';
    const timeout = 30000 + (file.size/1048576) * 12000;
    const res = await apiPost('upload', {
      base64:b64, mimeType:'application/pdf', fileName:file.name,
      docType: doc.label, budgetYear: $('#budgetYear').value || 'ไม่ระบุ', planNo: $('#planNo').value || ''
    }, timeout);
    bar.style.width = '100%';
    State.uploads[doc.key] = res.viewUrl;
    markUploaded(doc, res.name || file.name, res.viewUrl);
    toast(`อัปโหลด "${doc.label}" สำเร็จ (${res.sizeMB} MB)`,'success');
  }catch(err){
    toast(`อัปโหลด "${doc.label}" ไม่สำเร็จ: ${err.message}`,'error');
    nameEl.textContent = 'คลิกเพื่อเลือกไฟล์ PDF';
    fileInput.value = '';
  }finally{
    uploadingKeys.delete(doc.key);
    setTimeout(()=>{ pg.style.display='none'; bar.style.width='0'; }, 800);
  }
}

function markUploaded(doc, name, url){
  $(`#up-${doc.key}`).classList.add('done');
  $(`#name-${doc.key}`).textContent = name;
  const act = $(`#act-${doc.key}`);
  act.innerHTML = `
    <a class="mini-btn" href="${url}" target="_blank" rel="noopener"><i class="fa-solid fa-eye"></i> เปิดดู</a>
    <button type="button" class="mini-btn danger" data-clear="${doc.key}"><i class="fa-solid fa-trash"></i> ลบ</button>`;
  act.querySelector('[data-clear]').addEventListener('click', () => clearUpload(doc.key));
}

function clearUpload(key){
  const doc = DOC_TYPES.find(d => d.key === key);
  State.uploads[key] = '';
  $(`#up-${key}`).classList.remove('done');
  $(`#name-${key}`).textContent = 'คลิกเพื่อเลือกไฟล์ PDF';
  $(`#act-${key}`).innerHTML = '';
  $(`#file-${key}`).value = '';
  toast(`ยกเลิกไฟล์ "${doc.label}" แล้ว (ไฟล์ใน Drive ยังคงอยู่)`,'info');
}

/* ==========================================================
   FORM
   ========================================================== */
function initBudgetFormat(){
  const el = $('#budget'); if(!el) return;
  el.addEventListener('input', () => {
    let v = el.value.replace(/[^\d.]/g,'');
    const parts = v.split('.');
    v = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (parts[1] !== undefined ? '.' + parts[1].slice(0,2) : '');
    el.value = v;
  });
  el.addEventListener('blur', () => {
    const n = parseFloat(el.value.replace(/,/g,''));
    el.value = isNaN(n) ? '' : fmtMoney(n);
  });
}

function resetForm(){
  const f = $('#projectForm'); if(f) f.reset();
  $('#recordId').value = '';
  State.editing = null;
  State.uploads = { approval:null, blueprint:null, estimate:null };
  DOC_TYPES.forEach(d => {
    const c = $(`#up-${d.key}`); if(!c) return;
    c.classList.remove('done');
    $(`#name-${d.key}`).textContent = 'คลิกเพื่อเลือกไฟล์ PDF';
    $(`#act-${d.key}`).innerHTML = '';
    const fi = $(`#file-${d.key}`); if(fi) fi.value = '';
  });
  if(State.marker && State.map){ State.map.removeLayer(State.marker); State.marker = null; }
  $('#lat').value = ''; $('#lng').value = '';
  $('.err').forEach(e => e.classList.remove('err'));
  $('#formTitle').textContent = 'บันทึกข้อมูลแบบแปลน';
  $('#btnSubmit').innerHTML = '<i class="fa-solid fa-floppy-disk"></i> บันทึกข้อมูล';
  $('#btnCancelEdit').style.display = 'none';
}

let submitting = false;
async function submitForm(e){
  e.preventDefault();
  if(submitting) return;
  if(!isAdmin()) return toast('กรุณาเข้าสู่ระบบก่อน','warn');
  if(uploadingKeys.size) return toast('กรุณารอให้อัปโหลดไฟล์เสร็จก่อน','warn');

  $('.err').forEach(el => el.classList.remove('err'));
  const budgetRaw = ($('#budget').value || '0').replace(/,/g,'');
  const data = {
    id          : $('#recordId').value || '',
    projectName : $('#projectName').value.trim(),
    budgetYear  : $('#budgetYear').value,
    planNo      : $('#planNo').value.trim(),
    sheetCount  : Math.max(0, Number($('#sheetCount').value) || 0),
    budget      : Math.max(0, parseFloat(budgetRaw) || 0),
    agency      : $('#agency').value,
    note        : $('#note').value.trim(),
    lat         : $('#lat').value, lng: $('#lng').value
  };
  DOC_TYPES.forEach(d => { if(State.uploads[d.key] !== null) data[d.field] = State.uploads[d.key] || ''; });

  const rules = [
    [!data.projectName,             'กรุณากรอกชื่อโครงการ',              '#projectName'],
    [data.projectName.length > 300, 'ชื่อโครงการยาวเกิน 300 ตัวอักษร',   '#projectName'],
    [!data.budgetYear,              'กรุณาเลือกปีงบประมาณ',              '#budgetYear'],
    [!data.agency,                  'กรุณาเลือกหน่วยงานเจ้าของงบประมาณ', '#agency']
  ];
  for(const [bad, msg, sel] of rules){
    if(bad){ toast(msg,'warn'); const el = $(sel); el.classList.add('err'); el.focus(); el.scrollIntoView({behavior:'smooth',block:'center'}); return; }
  }

  const btn = $('#btnSubmit'), html = btn.innerHTML;
  submitting = true; btn.disabled = true; btn.classList.add('loading');
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังบันทึก...';
  try{
    const res = await apiPost('save', { data });
    toast(res.message,'success');
    resetForm();
    await loadAll();
    switchView('data');
  }catch(err){ toast('บันทึกไม่สำเร็จ: ' + err.message,'error'); }
  finally{ submitting = false; btn.disabled = false; btn.classList.remove('loading'); btn.innerHTML = html; }
}

function ensureOption(sel, value){
  if(!value) return;
  const el = $(sel);
  if(!Array.from(el.options).some(o => o.value === String(value))){
    const op = document.createElement('option');
    op.value = String(value); op.textContent = String(value);
    el.appendChild(op);
  }
}

function fillFormForEdit(item){
  if(!isAdmin()) return;
  State.editing = item.id;
  $('#recordId').value    = item.id;
  $('#projectName').value = item.projectName || '';
  $('#planNo').value      = item.planNo || '';
  $('#sheetCount').value  = item.sheetCount || '';
  $('#budget').value      = item.budget ? fmtMoney(item.budget) : '';
  $('#note').value        = item.note || '';
  ensureOption('#budgetYear', item.budgetYear);
  ensureOption('#agency', item.agency);
  $('#budgetYear').value = item.budgetYear || '';
  $('#agency').value     = item.agency || '';

  State.uploads = { approval:item.approvalUrl||null, blueprint:item.blueprintUrl||null, estimate:item.estimateUrl||null };
  DOC_TYPES.forEach(d => {
    const url = State.uploads[d.key];
    if(url) markUploaded(d, 'ไฟล์เดิมในระบบ', url);
    else{
      $(`#up-${d.key}`).classList.remove('done');
      $(`#name-${d.key}`).textContent = 'คลิกเพื่อเลือกไฟล์ PDF';
      $(`#act-${d.key}`).innerHTML = '';
    }
  });

  $('#formTitle').textContent = 'แก้ไขข้อมูลแบบแปลน';
  $('#btnSubmit').innerHTML = '<i class="fa-solid fa-pen-to-square"></i> อัปเดตข้อมูล';
  $('#btnCancelEdit').style.display = 'inline-flex';

  closeModal('#detailModal');
  switchView('form');
  setTimeout(()=>{
    if(State.map) State.map.invalidateSize();
    if(item.lat && item.lng) setMarker(item.lat, item.lng, 15);
  }, 380);
}

/* ==========================================================
   LIST / FILTER / RENDER
   ========================================================== */
async function loadList(){
  const d = await apiGet('list');
  State.items = d.items || [];
  applyFilter();
}

function applyFilter(){
  const q  = ($('#searchInput').value || '').trim().toLowerCase();
  const fy = $('#filterYear').value, fa = $('#filterAgency').value, sb = $('#sortBy').value;

  let list = State.items.filter(it => {
    const hay = [it.projectName, it.planNo, it.agency, it.budgetYear, it.id].join(' ').toLowerCase();
    return (!q || hay.includes(q)) &&
           (!fy || String(it.budgetYear) === String(fy)) &&
           (!fa || it.agency === fa);
  });

  const cmp = {
    newest     : (a,b)=> new Date(b.timestamp) - new Date(a.timestamp),
    oldest     : (a,b)=> new Date(a.timestamp) - new Date(b.timestamp),
    budget_desc: (a,b)=> (b.budget||0) - (a.budget||0),
    budget_asc : (a,b)=> (a.budget||0) - (b.budget||0),
    name       : (a,b)=> String(a.projectName).localeCompare(String(b.projectName),'th')
  }[sb];
  if(cmp) list.sort(cmp);

  State.filtered = list;
  $('#resultCount').textContent = fmtNum(list.length);

  const sumBox = $('#sumBudgetBar');
  if(isAdmin() && list.length){
    const sum = list.reduce((s,i)=> s + (Number(i.budget)||0), 0);
    sumBox.innerHTML = `· รวมงบประมาณ <b class="sum">${fmtMoney(sum)}</b> บาท`;
  }else sumBox.innerHTML = '';

  renderList();
}

function renderList(){ State.viewMode === 'card' ? renderCards() : renderTable(); }

function fileChips(it){
  return DOC_TYPES.map(d => `<span class="file-dot ${it[d.field] ? '' : 'off'}"><i class="fa-solid fa-file-pdf"></i> ${d.label}</span>`).join('');
}

function renderCards(){
  $('#cardWrap').classList.remove('hidden');
  $('#tableWrap').classList.add('hidden');
  const box = $('#cardWrap');
  if(!State.filtered.length){
    box.innerHTML = `<div class="card panel empty"><i class="fa-solid fa-folder-open" style="font-size:2.2rem;display:block;margin-bottom:12px"></i>ไม่พบข้อมูลที่ตรงกับเงื่อนไขการค้นหา</div>`;
    return;
  }
  box.innerHTML = State.filtered.map(it => `
    <article class="p-card" data-id="${esc(it.id)}">
      <div class="pc-top">
        <h5>${esc(it.projectName)}</h5>
        <span class="chip">ปี ${esc(it.budgetYear)}</span>
      </div>
      <div class="pc-meta">
        <span>แบบแปลนเลขที่<b>${esc(it.planNo || '-')}</b></span>
        <span>จำนวนแผ่น<b>${fmtNum(it.sheetCount)} แผ่น</b></span>
        <span style="grid-column:1/-1">หน่วยงาน<b>${esc(it.agency || '-')}</b></span>
      </div>
      <div class="${it.budgetHidden ? 'pc-budget hide' : 'pc-budget'}">
        ${it.budgetHidden ? '<i class="fa-solid fa-lock"></i> งบประมาณ (เฉพาะเจ้าหน้าที่)' : '฿ ' + fmtMoney(it.budget)}
      </div>
      <div class="pc-files">${fileChips(it)}</div>
    </article>`).join('');
  box.querySelectorAll('.p-card').forEach(el => el.addEventListener('click', ()=> openDetail(el.dataset.id)));
}

function renderTable(){
  $('#cardWrap').classList.add('hidden');
  $('#tableWrap').classList.remove('hidden');
  const tb = $('#tableBody');
  if(!State.filtered.length){
    tb.innerHTML = '<tr><td colspan="8" class="empty">ไม่พบข้อมูลที่ตรงกับเงื่อนไขการค้นหา</td></tr>';
    return;
  }
  tb.innerHTML = State.filtered.map((it,i) => `
    <tr>
      <td>${i+1}</td>
      <td>${esc(it.projectName)}</td>
      <td>${esc(it.budgetYear)}</td>
      <td>${esc(it.planNo || '-')}</td>
      <td class="num">${fmtNum(it.sheetCount)}</td>
      <td class="num">${it.budgetHidden ? '<i class="fa-solid fa-lock"></i>' : fmtMoney(it.budget)}</td>
      <td>${esc(it.agency || '-')}</td>
      <td><button type="button" class="mini-btn" data-id="${esc(it.id)}"><i class="fa-solid fa-eye"></i> รายละเอียด</button></td>
    </tr>`).join('');
  tb.querySelectorAll('button[data-id]').forEach(b => b.addEventListener('click', ()=> openDetail(b.dataset.id)));
}

function renderSuggest(){
  const q = ($('#searchInput').value || '').trim().toLowerCase();
  const box = $('#suggestBox');
  if(q.length < 2){ box.classList.remove('show'); return; }
  const hits = State.items.filter(it => `${it.projectName} ${it.planNo} ${it.agency}`.toLowerCase().includes(q)).slice(0,7);
  if(!hits.length){ box.classList.remove('show'); return; }
  box.innerHTML = hits.map(it => `
    <div class="suggest-item" data-id="${esc(it.id)}">${esc(it.projectName)}
      <small>ปี ${esc(it.budgetYear)} · ${esc(it.planNo||'-')} · ${esc(it.agency||'-')}</small></div>`).join('');
  box.classList.add('show');
  box.querySelectorAll('.suggest-item').forEach(el =>
    el.addEventListener('click', () => { box.classList.remove('show'); openDetail(el.dataset.id); }));
}

/* ==========================================================
   DETAIL
   ========================================================== */
function openDetail(id){
  const it = State.items.find(x => String(x.id) === String(id));
  if(!it) return toast('ไม่พบข้อมูลโครงการ','error');
  const admin = isAdmin();

  const fileHtml = DOC_TYPES.map(d => {
    const url = it[d.field];
    if(url) return `<a class="file-btn" href="${url}" target="_blank" rel="noopener">
      <i class="fa-solid fa-file-pdf"></i><span>${d.label}</span><i class="fa-solid fa-arrow-up-right-from-square"></i></a>`;
    const locked = !admin && (d.key === 'approval' || d.key === 'estimate');
    return `<div class="file-btn locked"><i class="fa-solid ${locked?'fa-lock':'fa-file-circle-xmark'}"></i>
      <span>${d.label} — ${locked ? 'เฉพาะเจ้าหน้าที่' : 'ยังไม่มีไฟล์แนบ'}</span></div>`;
  }).join('');

  $('#detailContent').innerHTML = `
    <div class="detail-head">
      <h3>${esc(it.projectName)}</h3>
      <div class="chips">
        <span class="chip">รหัส ${esc(it.id)}</span>
        <span class="chip">ปีงบประมาณ ${esc(it.budgetYear)}</span>
        <span class="chip">${esc(it.agency || '-')}</span>
      </div>
    </div>
    <div class="detail-grid">
      <div class="d-item"><small>แบบแปลนเลขที่</small><b>${esc(it.planNo || '-')}</b></div>
      <div class="d-item"><small>จำนวนแผ่น</small><b>${fmtNum(it.sheetCount)} แผ่น</b></div>
      <div class="d-item"><small>จำนวนเงินงบประมาณ</small><b>${it.budgetHidden ? '<i class="fa-solid fa-lock"></i> เฉพาะเจ้าหน้าที่' : '฿ ' + fmtMoney(it.budget)}</b></div>
      <div class="d-item"><small>พิกัดที่ตั้ง</small><b>${(it.lat && it.lng) ? it.lat + ', ' + it.lng : 'ไม่ระบุ'}</b></div>
      <div class="d-item"><small>บันทึกเมื่อ</small><b>${fmtDate(it.timestamp)}</b></div>
      <div class="d-item"><small>แก้ไขล่าสุด</small><b>${fmtDate(it.updatedAt)}${it.updatedBy ? ' · ' + esc(it.updatedBy) : ''}</b></div>
      ${it.note ? `<div class="d-item" style="grid-column:1/-1"><small>หมายเหตุ</small><b>${esc(it.note)}</b></div>` : ''}
    </div>
    ${(it.lat && it.lng) ? '<div id="detailMap"></div>' : ''}
    <h4 style="margin-bottom:12px;display:flex;align-items:center;gap:9px;color:#134a80">
      <i class="fa-solid fa-paperclip" style="color:#4fa3f0"></i> เอกสารแนบ</h4>
    <div class="file-btns">${fileHtml}</div>
    ${admin ? `<div class="detail-actions">
        <button type="button" class="btn btn-primary" id="btnEditItem"><i class="fa-solid fa-pen-to-square"></i> แก้ไขข้อมูล</button>
        <button type="button" class="btn btn-danger" id="btnDeleteItem"><i class="fa-solid fa-trash"></i> ลบรายการ</button>
      </div>` : ''}`;

  openModal('#detailModal');

  if(it.lat && it.lng && typeof L !== 'undefined'){
    setTimeout(()=>{
      try{
        if(State.detailMap){ State.detailMap.remove(); State.detailMap = null; }
        State.detailMap = L.map('detailMap', { scrollWheelZoom:false }).setView([it.lat, it.lng], 15);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution:'&copy; OSM' }).addTo(State.detailMap);
        L.marker([it.lat, it.lng]).addTo(State.detailMap).bindPopup(esc(it.projectName)).openPopup();
        State.detailMap.invalidateSize();
      }catch(e){ console.error(e); }
    }, 160);
  }

  if(admin){
    $('#btnEditItem').addEventListener('click', ()=> fillFormForEdit(it));
    $('#btnDeleteItem').addEventListener('click', ()=> deleteItem(it));
  }
}

async function deleteItem(it){
  if(!confirm(`ยืนยันการลบโครงการ\n\n"${it.projectName}"\n\n(ไฟล์ใน Google Drive จะยังคงอยู่)`)) return;
  try{
    showLoader('กำลังลบข้อมูล...');
    const res = await apiPost('delete', { id: it.id });
    toast(res.message,'success');
    closeModal('#detailModal');
    await loadAll();
  }catch(err){ toast('ลบไม่สำเร็จ: ' + err.message,'error'); }
  finally{ hideLoader(); }
}

/* ==========================================================
   LOAD ALL
   ========================================================== */
let loadingNow = false;
async function loadAll(){
  if(loadingNow) return;
  loadingNow = true;
  showLoader('กำลังโหลดข้อมูลจากเซิร์ฟเวอร์...');
  const [statRes, listRes] = await Promise.allSettled([ loadDashboard(), loadList() ]);

  if(listRes.status === 'fulfilled'){ saveCache(); hideNet(); }
  else{
    const c = loadCache();
    if(c){
      State.items = c.items; applyFilter();
      showNet(`แสดงข้อมูลสำรองจากเครื่อง (บันทึกเมื่อ ${fmtDate(new Date(c.t).toISOString())})`);
    }else showNet('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่');
    toast('โหลดรายการไม่สำเร็จ: ' + (listRes.reason.message || ''),'error');
  }
  if(statRes.status === 'rejected') toast('โหลดสถิติแดชบอร์ดไม่สำเร็จ','warn');

  hideLoader();
  loadingNow = false;
}

/* ==========================================================
   INIT — ทุกขั้นตอนห่อด้วย safe() ไม่ให้ล้มทั้งระบบ
   ========================================================== */
document.addEventListener('DOMContentLoaded', async () => {

  // 1) แสดงหน้าเริ่มต้นทันที (ไม่ต้องรอ API)
  safe('router', ()=> switchView((location.hash || '#dashboard').replace('#','')));

  // 2) สร้าง UI ส่วนต่าง ๆ
  safe('uploadCards',  buildUploadCards);
  safe('budgetFormat', initBudgetFormat);
  safe('map',          initMap);
  safe('authUI',       applyAuthUI);

  // 3) ผูก Event ทั้งหมด (แยกกันคนละ safe)
  safe('authEvents', ()=>{
    $('#btnLogin').addEventListener('click', ()=>{ openModal('#loginModal'); setTimeout(()=>$('#loginUser').focus(),150); });
    $('#btnLockLogin').addEventListener('click', ()=> $('#btnLogin').click());
    $('#btnLogout').addEventListener('click', doLogout);
    $('#loginForm').addEventListener('submit', doLogin);
    $('#togglePwd').addEventListener('click', () => {
      const i = $('#loginPass');
      i.type = i.type === 'password' ? 'text' : 'password';
      $('#togglePwd').innerHTML = `<i class="fa-solid fa-eye${i.type === 'password' ? '' : '-slash'}"></i>`;
    });
  });

  safe('modalEvents', ()=>{
    $('[data-close]').forEach(b => b.addEventListener('click', e => closeModal('#' + e.target.closest('.modal').id)));
    $('.modal').forEach(m => m.addEventListener('click', e => { if(e.target === m) closeModal('#' + m.id); }));
    document.addEventListener('keydown', e => { if(e.key === 'Escape') $('.modal.show').forEach(m => closeModal('#' + m.id)); });
  });

  safe('formEvents', ()=>{
    $('#projectForm').addEventListener('submit', submitForm);
    $('#btnResetForm').addEventListener('click', ()=>{ if(confirm('ต้องการล้างข้อมูลในฟอร์มทั้งหมดใช่หรือไม่?')){ resetForm(); toast('ล้างฟอร์มแล้ว','info'); } });
    $('#btnCancelEdit').addEventListener('click', ()=>{ resetForm(); toast('ยกเลิกการแก้ไขแล้ว','info'); });
  });

  safe('mapEvents', ()=>{
    $('#btnMapSearch').addEventListener('click', searchPlace);
    $('#mapSearch').addEventListener('keydown', e => { if(e.key === 'Enter'){ e.preventDefault(); searchPlace(); } });
    $('#btnMyLocation').addEventListener('click', useMyLocation);
    $('#btnClearPin').addEventListener('click', clearPin);
  });

  safe('filterEvents', ()=>{
    let t;
    $('#searchInput').addEventListener('input', () => {
      clearTimeout(t);
      $('#btnClearSearch').classList.toggle('hidden', !$('#searchInput').value);
      t = setTimeout(()=>{ applyFilter(); renderSuggest(); }, 220);
    });
    $('#btnClearSearch').addEventListener('click', () => {
      $('#searchInput').value=''; $('#btnClearSearch').classList.add('hidden');
      $('#suggestBox').classList.remove('show'); applyFilter();
    });
    document.addEventListener('click', e => { if(!e.target.closest('.search-wrap')) $('#suggestBox').classList.remove('show'); });
    ['#filterYear','#filterAgency','#sortBy'].forEach(s => $(s).addEventListener('change', applyFilter));
    $('#btnResetFilter').addEventListener('click', () => {
      $('#searchInput').value=''; $('#filterYear').value=''; $('#filterAgency').value=''; $('#sortBy').value='newest';
      $('#btnClearSearch').classList.add('hidden'); applyFilter(); toast('ล้างตัวกรองแล้ว','info');
    });
    $('.tg').forEach(b => b.addEventListener('click', () => {
      $('.tg').forEach(x => x.classList.remove('active'));
      b.classList.add('active'); State.viewMode = b.dataset.mode; renderList();
    }));
    $('#btnRefresh').addEventListener('click', loadAll);
  });

  safe('netEvents', ()=>{
    window.addEventListener('offline', ()=> showNet('ขาดการเชื่อมต่ออินเทอร์เน็ต'));
    window.addEventListener('online',  ()=>{ showNet('เชื่อมต่ออินเทอร์เน็ตแล้ว กำลังซิงก์ข้อมูล...', true); loadAll(); });
    window.addEventListener('beforeunload', e => { if(submitting || uploadingKeys.size){ e.preventDefault(); e.returnValue=''; } });
    window.addEventListener('unhandledrejection', ev => { console.error('Unhandled:', ev.reason); hideLoader(); });
    setInterval(()=>{ if(document.visibilityState === 'visible' && !submitting && !uploadingKeys.size) loadList().catch(()=>{}); }, 300000);
  });

  // 4) โหลดข้อมูล (ถึงตรงนี้พังก็ไม่กระทบเมนูแล้ว)
  if(State.token){
    try{
      const v = await apiGet('verify');
      setAuth(v && v.user ? State.token : '', v && v.user ? v.user : null);
    }catch(e){ applyAuthUI(); }
  }

  try{ await loadOptions(); }catch(e){ console.error(e); }
  try{ await loadAll(); }catch(e){ console.error(e); }
});
