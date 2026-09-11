/* ===== RESET & BASE ===== */
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
:root{
  --navy-900:#050c1f; --navy-800:#0a1838; --navy-700:#0f2c5c;
  --blue-500:#2563eb; --blue-400:#3b82f6; --sky:#38bdf8;
  --glass:rgba(255,255,255,.08);
  --glass-strong:rgba(255,255,255,.14);
  --border:rgba(255,255,255,.18);
  --text:#eef4ff; --muted:#9fb3d4;
  --ok:#22c55e; --warn:#f59e0b; --danger:#ef4444;
  --radius:18px; --shadow:0 8px 32px rgba(0,0,0,.35);
}
html{scroll-behavior:smooth}
body{
  font-family:'Prompt',system-ui,sans-serif; color:var(--text); min-height:100vh;
  background:linear-gradient(135deg,#050c1f 0%,#0a1838 35%,#123a7a 70%,#2563eb 100%);
  background-attachment:fixed; overflow-x:hidden; font-weight:300;
}
img{max-width:100%}
button,input,select,textarea{font-family:inherit;font-size:inherit}
.hidden{display:none!important}
.mt-12{margin-top:12px}

/* ===== DECOR ORBS ===== */
.bg-orbs{position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden}
.bg-orbs span{position:absolute;border-radius:50%;filter:blur(90px);opacity:.4;animation:float 18s ease-in-out infinite}
.bg-orbs span:nth-child(1){width:420px;height:420px;background:#3b82f6;top:-100px;left:-80px}
.bg-orbs span:nth-child(2){width:380px;height:380px;background:#38bdf8;bottom:-120px;right:-60px;animation-delay:-6s}
.bg-orbs span:nth-child(3){width:300px;height:300px;background:#6366f1;top:40%;left:55%;animation-delay:-12s}
@keyframes float{0%,100%{transform:translate(0,0)}50%{transform:translate(40px,-40px)}}

/* ===== GLASS ===== */
.glass{
  background:var(--glass); backdrop-filter:blur(18px) saturate(160%);
  -webkit-backdrop-filter:blur(18px) saturate(160%);
  border:1px solid var(--border); box-shadow:var(--shadow);
}

/* ===== TOPBAR ===== */
.topbar{
  position:sticky;top:0;z-index:100;display:flex;align-items:center;gap:18px;
  padding:12px 22px;border-radius:0 0 22px 22px;border-top:0;flex-wrap:wrap;
}
.brand{display:flex;align-items:center;gap:12px;flex:1;min-width:200px}
.brand-icon{
  width:46px;height:46px;display:grid;place-items:center;border-radius:14px;font-size:1.2rem;
  background:linear-gradient(135deg,var(--blue-400),var(--sky));box-shadow:0 6px 18px rgba(56,189,248,.4)
}
.brand-icon.lg{width:62px;height:62px;font-size:1.6rem;margin:0 auto 10px}
.brand-text h1{font-size:1.05rem;font-weight:600;line-height:1.25}
.brand-text span{font-size:.72rem;color:var(--muted);font-weight:300}

.nav{display:flex;gap:6px}
.nav-btn{
  display:flex;align-items:center;gap:8px;padding:10px 16px;border:1px solid transparent;
  border-radius:12px;background:transparent;color:var(--muted);cursor:pointer;
  font-weight:400;transition:.25s
}
.nav-btn:hover{color:#fff;background:rgba(255,255,255,.08)}
.nav-btn.active{
  color:#fff;background:linear-gradient(135deg,rgba(59,130,246,.5),rgba(56,189,248,.3));
  border-color:rgba(255,255,255,.25)
}
.auth-area{display:flex;align-items:center;gap:10px}
.user-chip{
  display:flex;align-items:center;gap:8px;padding:7px 8px 7px 14px;border-radius:30px;
  background:rgba(34,197,94,.15);border:1px solid rgba(34,197,94,.4);font-size:.85rem
}
.user-chip button{background:rgba(239,68,68,.25);border:0;color:#fff;width:28px;height:28px;border-radius:50%;cursor:pointer}
.user-chip button:hover{background:var(--danger)}
.burger{display:none;background:var(--glass-strong);border:1px solid var(--border);color:#fff;width:42px;height:42px;border-radius:12px;cursor:pointer}

/* ===== LAYOUT ===== */
.container{position:relative;z-index:1;max-width:1280px;margin:0 auto;padding:26px 20px 60px}
.view{display:none;animation:fade .4s ease}
.view.active{display:block}
@keyframes fade{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
.page-head{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:18px;flex-wrap:wrap}
.page-head h2{font-size:1.35rem;font-weight:500;display:flex;align-items:center;gap:10px}
.page-head h2 i{color:var(--sky)}
.panel{border-radius:var(--radius);padding:22px;margin-bottom:22px}
.panel h4{font-size:1rem;font-weight:500;margin-bottom:16px;display:flex;align-items:center;gap:8px}
.panel h4 i{color:var(--sky)}

/* ===== STAT CARDS ===== */
.stat-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:16px;margin-bottom:22px}
.stat-card{border-radius:var(--radius);padding:20px;display:flex;align-items:center;gap:16px;transition:.3s}
.stat-card:hover{transform:translateY(-5px);background:var(--glass-strong)}
.stat-ico{width:54px;height:54px;border-radius:16px;display:grid;place-items:center;font-size:1.35rem;flex-shrink:0}
.ico-blue{background:linear-gradient(135deg,#3b82f6,#1d4ed8)}
.ico-green{background:linear-gradient(135deg,#22c55e,#15803d)}
.ico-amber{background:linear-gradient(135deg,#f59e0b,#b45309)}
.ico-purple{background:linear-gradient(135deg,#a855f7,#6d28d9)}
.stat-card p{font-size:.8rem;color:var(--muted)}
.stat-card h3{font-size:1.7rem;font-weight:600;line-height:1.2;word-break:break-all}
.stat-card small{font-size:.72rem;color:var(--muted)}

/* ===== CHARTS ===== */
.chart-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}
.chart-box{position:relative;height:320px}
.recent-list{display:grid;gap:10px}
.recent-item{
  display:flex;justify-content:space-between;align-items:center;gap:12px;padding:12px 16px;
  border-radius:12px;background:rgba(255,255,255,.05);border-left:3px solid var(--sky);cursor:pointer;transition:.2s
}
.recent-item:hover{background:rgba(255,255,255,.12);transform:translateX(4px)}
.recent-item b{font-weight:400;font-size:.92rem}
.recent-item span{font-size:.75rem;color:var(--muted)}
.empty{text-align:center;padding:40px 10px;color:var(--muted)}

/* ===== FORM ===== */
.lock-box{border-radius:var(--radius);padding:56px 26px;text-align:center}
.lock-box i{font-size:3rem;color:var(--sky);margin-bottom:16px}
.lock-box h3{font-weight:500;margin-bottom:8px}
.lock-box p{color:var(--muted);margin-bottom:20px;font-size:.9rem}
.section-title{margin:26px 0 14px;padding-bottom:10px;border-bottom:1px dashed var(--border);font-size:.95rem;font-weight:500}
.section-title:first-child{margin-top:0}
.grid-2{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.grid-3{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
.span-2{grid-column:span 2}
.field{display:flex;flex-direction:column;gap:7px}
.field label{font-size:.84rem;color:var(--muted);font-weight:400}
.field label b{color:#fca5a5}
.field input,.field select,.field textarea{
  padding:12px 14px;border-radius:12px;background:rgba(255,255,255,.07);
  border:1px solid var(--border);color:var(--text);outline:none;transition:.2s;width:100%
}
.field textarea{resize:vertical}
.field input::placeholder,.field textarea::placeholder{color:rgba(159,179,212,.6)}
.field input:focus,.field select:focus,.field textarea:focus{
  border-color:var(--sky);background:rgba(255,255,255,.12);box-shadow:0 0 0 4px rgba(56,189,248,.15)
}
.field input[readonly]{opacity:.75;cursor:not-allowed}
.field select option{background:var(--navy-800);color:#fff}

/* ===== MAP ===== */
.map-tools{display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap}
.map-tools input{
  flex:1;min-width:180px;padding:11px 14px;border-radius:12px;
  background:rgba(255,255,255,.07);border:1px solid var(--border);color:var(--text);outline:none
}
.map-box{height:380px;border-radius:16px;overflow:hidden;border:1px solid var(--border);z-index:1}
.leaflet-container{font-family:'Prompt',sans-serif}

/* ===== UPLOAD ===== */
.upload-card{
  border:2px dashed var(--border);border-radius:16px;padding:18px;text-align:center;
  background:rgba(255,255,255,.04);transition:.25s;cursor:pointer;position:relative
}
.upload-card:hover{border-color:var(--sky);background:rgba(56,189,248,.08)}
.upload-card.done{border-style:solid;border-color:var(--ok);background:rgba(34,197,94,.1)}
.upload-card i.big{font-size:1.9rem;color:var(--sky);margin-bottom:8px;display:block}
.upload-card.done i.big{color:var(--ok)}
.upload-card h5{font-size:.88rem;font-weight:500;margin-bottom:4px}
.upload-card small{font-size:.72rem;color:var(--muted);display:block;word-break:break-all}
.upload-card input[type=file]{display:none}
.up-actions{display:flex;gap:6px;justify-content:center;margin-top:10px;flex-wrap:wrap}
.mini-btn{padding:5px 11px;font-size:.72rem;border-radius:8px;border:1px solid var(--border);background:rgba(255,255,255,.09);color:#fff;cursor:pointer}
.mini-btn:hover{background:rgba(255,255,255,.2)}
.mini-btn.danger{border-color:rgba(239,68,68,.5);background:rgba(239,68,68,.2)}
.progress{height:5px;border-radius:4px;background:rgba(255,255,255,.15);overflow:hidden;margin-top:10px}
.progress i{display:block;height:100%;width:0;background:linear-gradient(90deg,var(--blue-400),var(--sky));transition:.3s}

/* ===== BUTTONS ===== */
.btn{
  display:inline-flex;align-items:center;justify-content:center;gap:8px;cursor:pointer;
  border-radius:12px;border:1px solid transparent;padding:11px 20px;font-weight:400;transition:.25s;color:#fff
}
.btn-primary{background:linear-gradient(135deg,var(--blue-500),var(--sky));box-shadow:0 6px 18px rgba(37,99,235,.4)}
.btn-primary:hover{transform:translateY(-2px);box-shadow:0 10px 26px rgba(56,189,248,.5)}
.btn-ghost{background:rgba(255,255,255,.08);border-color:var(--border)}
.btn-ghost:hover{background:rgba(255,255,255,.18)}
.btn-danger{background:rgba(239,68,68,.85)}
.btn-sm{padding:8px 14px;font-size:.82rem}
.btn-lg{padding:14px 28px;font-size:.98rem}
.full{width:100%}
.btn:disabled{opacity:.55;cursor:not-allowed;transform:none}
.form-actions{display:flex;gap:12px;margin-top:26px;flex-wrap:wrap}

/* ===== SEARCH & FILTER ===== */
.filter-panel{padding:18px}
.search-wrap{position:relative;margin-bottom:12px}
.search-wrap>i{position:absolute;left:16px;top:50%;transform:translateY(-50%);color:var(--muted)}
.search-wrap input{
  width:100%;padding:13px 44px;border-radius:14px;background:rgba(255,255,255,.07);
  border:1px solid var(--border);color:var(--text);outline:none
}
.search-wrap input:focus{border-color:var(--sky);box-shadow:0 0 0 4px rgba(56,189,248,.15)}
.clear-btn{position:absolute;right:12px;top:50%;transform:translateY(-50%);background:transparent;border:0;color:var(--muted);cursor:pointer;font-size:1rem}
.suggest-box{
  position:absolute;top:calc(100% + 6px);left:0;right:0;z-index:50;border-radius:14px;
  background:rgba(10,24,56,.96);backdrop-filter:blur(16px);border:1px solid var(--border);
  max-height:280px;overflow-y:auto;display:none
}
.suggest-box.show{display:block}
.suggest-item{padding:11px 16px;cursor:pointer;border-bottom:1px solid rgba(255,255,255,.06);font-size:.88rem}
.suggest-item:hover,.suggest-item.active{background:rgba(56,189,248,.2)}
.suggest-item small{display:block;color:var(--muted);font-size:.72rem}
.filter-row{display:flex;gap:10px;flex-wrap:wrap}
.filter-row select{
  flex:1;min-width:150px;padding:11px 14px;border-radius:12px;
  background:rgba(255,255,255,.07);border:1px solid var(--border);color:var(--text);outline:none;cursor:pointer
}
.filter-row select option{background:var(--navy-800)}
.result-bar{margin-top:12px;font-size:.83rem;color:var(--muted);display:flex;gap:12px;align-items:center;flex-wrap:wrap}
.result-bar b{color:var(--sky);font-weight:600}
.badge-guest{padding:4px 12px;border-radius:20px;background:rgba(245,158,11,.18);border:1px solid rgba(245,158,11,.45);color:#fcd34d;font-size:.74rem}
.view-toggle{display:flex;gap:4px;padding:4px;border-radius:12px;background:rgba(255,255,255,.08)}
.tg{width:38px;height:34px;border:0;border-radius:9px;background:transparent;color:var(--muted);cursor:pointer}
.tg.active{background:rgba(56,189,248,.3);color:#fff}

/* ===== CARDS ===== */
.card-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:16px}
.p-card{
  border-radius:var(--radius);padding:20px;cursor:pointer;transition:.3s;
  background:var(--glass);backdrop-filter:blur(16px);border:1px solid var(--border);
  border-top:3px solid var(--sky);display:flex;flex-direction:column;gap:12px
}
.p-card:hover{transform:translateY(-6px);background:var(--glass-strong);box-shadow:0 14px 36px rgba(0,0,0,.45)}
.p-card .pc-top{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}
.p-card h5{font-size:1rem;font-weight:500;line-height:1.4}
.chip{padding:3px 11px;border-radius:20px;font-size:.72rem;background:rgba(56,189,248,.2);border:1px solid rgba(56,189,248,.4);white-space:nowrap}
.pc-meta{display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:.8rem;color:var(--muted)}
.pc-meta span b{display:block;color:var(--text);font-weight:400;margin-top:2px}
.pc-budget{font-size:1.15rem;font-weight:600;color:#86efac}
.pc-budget.hide{color:var(--muted);font-size:.9rem;font-weight:300}
.pc-files{display:flex;gap:6px;flex-wrap:wrap}
.file-dot{font-size:.68rem;padding:3px 9px;border-radius:8px;background:rgba(239,68,68,.18);border:1px solid rgba(239,68,68,.35)}
.file-dot.off{background:rgba(255,255,255,.05);border-color:var(--border);color:var(--muted);opacity:.6}

/* ===== TABLE ===== */
.table-wrap{overflow-x:auto;padding:12px}
.data-table{width:100%;border-collapse:collapse;min-width:900px;font-size:.86rem}
.data-table th{
  text-align:left;padding:13px 12px;font-weight:500;color:var(--sky);
  border-bottom:2px solid rgba(56,189,248,.3);white-space:nowrap
}
.data-table td{padding:12px;border-bottom:1px solid rgba(255,255,255,.07);vertical-align:middle}
.data-table tbody tr{transition:.2s}
.data-table tbody tr:hover{background:rgba(255,255,255,.07)}
.data-table .num{text-align:right}

/* ===== MODAL ===== */
.modal{
  position:fixed;inset:0;z-index:200;display:none;align-items:center;justify-content:center;
  padding:20px;background:rgba(3,8,20,.7);backdrop-filter:blur(6px)
}
.modal.show{display:flex;animation:fade .25s}
.modal-box{
  width:100%;max-width:760px;max-height:90vh;overflow-y:auto;border-radius:22px;padding:28px;position:relative
}
.modal-sm{max-width:420px}
.modal-close{
  position:absolute;top:14px;right:14px;width:36px;height:36px;border-radius:50%;cursor:pointer;
  background:rgba(255,255,255,.1);border:1px solid var(--border);color:#fff
}
.modal-close:hover{background:var(--danger)}
.login-head{text-align:center;margin-bottom:22px}
.login-head h3{font-weight:500;font-size:1.15rem}
.login-head p{font-size:.82rem;color:var(--muted);margin-top:4px}
#loginForm .field{margin-bottom:14px}
.pwd-wrap{position:relative}
.pwd-wrap button{position:absolute;right:10px;top:50%;transform:translateY(-50%);background:transparent;border:0;color:var(--muted);cursor:pointer}
.alert-error{padding:11px 14px;border-radius:11px;background:rgba(239,68,68,.18);border:1px solid rgba(239,68,68,.45);font-size:.83rem;margin-bottom:14px}

/* ===== DETAIL ===== */
.detail-head{padding-bottom:16px;margin-bottom:18px;border-bottom:1px solid var(--border)}
.detail-head h3{font-size:1.2rem;font-weight:500;padding-right:40px}
.detail-head .chips{display:flex;gap:8px;margin-top:10px;flex-wrap:wrap}
.detail-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px;margin-bottom:18px}
.d-item{padding:13px 16px;border-radius:12px;background:rgba(255,255,255,.06)}
.d-item small{display:block;color:var(--muted);font-size:.74rem;margin-bottom:4px}
.d-item b{font-weight:400;font-size:.95rem;word-break:break-word}
.file-btns{display:grid;gap:10px;margin-bottom:16px}
.file-btn{
  display:flex;align-items:center;gap:12px;padding:14px 16px;border-radius:13px;text-decoration:none;color:#fff;
  background:rgba(239,68,68,.16);border:1px solid rgba(239,68,68,.4);transition:.2s
}
.file-btn:hover{background:rgba(239,68,68,.3);transform:translateX(5px)}
.file-btn.locked{background:rgba(255,255,255,.05);border-color:var(--border);color:var(--muted);cursor:not-allowed}
.file-btn i:first-child{font-size:1.3rem}
.file-btn span{flex:1;font-size:.88rem}
#detailMap{height:240px;border-radius:14px;border:1px solid var(--border);margin-bottom:16px}
.detail-actions{display:flex;gap:10px;flex-wrap:wrap}

/* ===== LOADER & TOAST ===== */
.loader-overlay{
  position:fixed;inset:0;z-index:500;display:flex;flex-direction:column;gap:16px;
  align-items:center;justify-content:center;background:rgba(3,8,20,.72);backdrop-filter:blur(5px)
}
.loader-overlay p{font-size:.9rem;color:var(--muted)}
.spinner{width:52px;height:52px;border:4px solid rgba(255,255,255,.15);border-top-color:var(--sky);border-radius:50%;animation:spin .8s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.toast-wrap{position:fixed;top:86px;right:20px;z-index:600;display:flex;flex-direction:column;gap:10px}
.toast{
  display:flex;align-items:center;gap:11px;padding:13px 18px;border-radius:13px;min-width:260px;max-width:92vw;
  background:rgba(10,24,56,.94);backdrop-filter:blur(14px);border:1px solid var(--border);
  border-left:4px solid var(--sky);font-size:.86rem;animation:slideIn .3s
}
.toast.success{border-left-color:var(--ok)} .toast.success i{color:var(--ok)}
.toast.error{border-left-color:var(--danger)} .toast.error i{color:var(--danger)}
.toast.warn{border-left-color:var(--warn)} .toast.warn i{color:var(--warn)}
@keyframes slideIn{from{opacity:0;transform:translateX(60px)}to{opacity:1;transform:none}}

.footer{position:relative;z-index:1;text-align:center;padding:22px;font-size:.78rem;color:var(--muted)}

/* ===== RESPONSIVE ===== */
@media(max-width:1024px){
  .chart-grid{grid-template-columns:1fr}
  .grid-3{grid-template-columns:1fr 1fr}
}
@media(max-width:768px){
  .topbar{padding:10px 14px;gap:10px}
  .brand-text h1{font-size:.9rem} .brand-text span{display:none}
  .burger{display:grid;place-items:center}
  .nav{
    order:3;width:100%;flex-direction:column;gap:4px;max-height:0;overflow:hidden;
    transition:max-height .3s ease
  }
  .nav.open{max-height:260px;padding-top:8px}
  .nav-btn{width:100%;justify-content:flex-start}
  #btnLogin span{display:none}
  .container{padding:18px 14px 50px}
  .grid-2,.grid-3{grid-template-columns:1fr}
  .span-2{grid-column:span 1}
  .card-grid{grid-template-columns:1fr}
  .map-box{height:300px}
  .chart-box{height:280px}
  .modal-box{padding:20px}
  .toast-wrap{top:auto;bottom:16px;right:12px;left:12px}
  .stat-card h3{font-size:1.4rem}
}
@media(max-width:420px){
  .page-head h2{font-size:1.1rem}
  .btn-lg{width:100%}
}
