/* ---------- Settings ---------- */
const CUR = 'KES';
let FEE = 300, FINDER_PCT = 40, PAY_INFO = '';          // real values are loaded from the settings table
const finderCut = (fee = FEE) => Math.round(fee * FINDER_PCT / 100);
const CATS = ['Keys','Phone','ID / documents','Watch','Luggage / bag','Wallet / cards','Laptop / electronics','Clothing','Other'];
let S = {tab:'check', user:null, authMode:'login', fails:0, lock:0, sub:'claims', q:'', cat:'', pub:null, mine:null, adm:null};
let busy = false;

/* ---------- Helpers ---------- */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const val = id => ($('#'+id)?.value || '').trim();
const today = () => new Date().toISOString().slice(0,10);
const norm = p => String(p).replace(/\D/g,'').slice(-9);
const phoneOk = p => String(p).replace(/\D/g,'').length >= 9;
function toast(m){ const t=document.createElement('div'); t.className='toast'; t.textContent=m; document.body.appendChild(t); setTimeout(()=>t.remove(),3200); }
const catOptions = sel => CATS.map(c=>`<option ${c===sel?'selected':''}>${c}</option>`).join('');
async function guard(fn){            // one action at a time, errors shown as a message
  if(busy) return; busy = true;
  try{ await fn(); } catch(e){ toast(e.message || 'Something went wrong'); } finally{ busy = false; }
}

/* ---------- Graphics (inline SVG, no external images) ---------- */
const TILE = {'Keys':'#FFF1CC','Phone':'#DDF3EF','ID / documents':'#E3ECF6','Watch':'#F3E4F7','Luggage / bag':'#FFE4D6','Wallet / cards':'#E4F3D9','Laptop / electronics':'#E3ECF6','Clothing':'#FBE5E5','Other':'#EDEFF2'};
const ART = {
 'Keys':'<circle cx="17" cy="17" r="8" fill="none" stroke="#C9971A" stroke-width="4.5"/><path d="M23 23L38 38M32 32l5-5M36 36l5-5" stroke="#C9971A" stroke-width="4.5" stroke-linecap="round"/>',
 'Phone':'<rect x="14" y="6" width="20" height="36" rx="5" fill="#16324F"/><rect x="17" y="11" width="14" height="22" rx="2" fill="#38C2B1"/><circle cx="24" cy="38" r="1.8" fill="#fff"/>',
 'ID / documents':'<rect x="6" y="11" width="36" height="26" rx="4" fill="#fff" stroke="#16324F" stroke-width="2.5"/><circle cx="17" cy="22" r="4" fill="#16324F"/><path d="M11 32c1-4 11-4 12 0" fill="#16324F"/><path d="M27 20h10M27 26h10M27 31h6" stroke="#16324F" stroke-width="2.5" stroke-linecap="round"/>',
 'Watch':'<rect x="19" y="4" width="10" height="40" rx="3" fill="#8E5BA8"/><circle cx="24" cy="24" r="11" fill="#fff" stroke="#5E2F78" stroke-width="3"/><path d="M24 17v7l5 3" stroke="#5E2F78" stroke-width="2.5" fill="none" stroke-linecap="round"/>',
 'Luggage / bag':'<path d="M17 14c0-7 14-7 14 0" fill="none" stroke="#C25B2B" stroke-width="3.5"/><rect x="9" y="13" width="30" height="31" rx="10" fill="#E8793F"/><rect x="16" y="28" width="16" height="11" rx="4" fill="#C25B2B"/>',
 'Wallet / cards':'<rect x="6" y="12" width="36" height="26" rx="5" fill="#4C9A2A"/><path d="M6 20h36" stroke="#3A7A1E" stroke-width="2.5"/><rect x="30" y="24" width="12" height="9" rx="3" fill="#F2C94C"/>',
 'Laptop / electronics':'<rect x="10" y="10" width="28" height="20" rx="3" fill="#16324F"/><rect x="13" y="13" width="22" height="14" rx="1.5" fill="#38C2B1"/><path d="M5 34h38l-3 5H8z" fill="#4A5F78"/>',
 'Clothing':'<path d="M17 7l-11 8 5 6 5-3v22h16V18l5 3 5-6-11-8c-2 4-8 4-14 0z" fill="#D64545"/>',
 'Other':'<path d="M6 12a3 3 0 013-3h18l13 15-13 15H9a3 3 0 01-3-3z" fill="#9AA7B5"/><circle cx="13" cy="24" r="2.6" fill="#fff"/><path d="M26 20a3 3 0 115 1c-1 1-2 1.5-2 3M29 29v1" stroke="#fff" stroke-width="2.3" fill="none" stroke-linecap="round"/>'
};
const catIcon = (c,size=44) => `<svg class="ico" width="${size}" height="${size}" viewBox="0 0 48 48" role="img" aria-label="${esc(c)}"><rect width="48" height="48" rx="12" fill="${TILE[c]||TILE.Other}"/>${ART[c]||ART.Other}</svg>`;
const tile = (bg,inner,size=40) => `<svg width="${size}" height="${size}" viewBox="0 0 48 48" aria-hidden="true"><rect width="48" height="48" rx="12" fill="${bg}"/>${inner}</svg>`;
const heroArt = `<svg viewBox="0 0 220 170" aria-hidden="true">
  <circle cx="110" cy="88" r="78" fill="rgba(255,255,255,.12)"/>
  <path d="M60 74c0-30 44-30 44 0" fill="none" stroke="#F2C94C" stroke-width="8" stroke-linecap="round"/>
  <rect x="38" y="70" width="88" height="84" rx="26" fill="#F2C94C"/>
  <rect x="56" y="108" width="52" height="34" rx="10" fill="#D9A920"/>
  <rect x="122" y="40" width="46" height="82" rx="10" fill="#fff"/>
  <rect x="128" y="50" width="34" height="58" rx="4" fill="#0E8F80"/>
  <circle cx="145" cy="115" r="3.2" fill="#16324F"/>
  <circle cx="176" cy="132" r="13" fill="none" stroke="#fff" stroke-width="7"/>
  <path d="M185 142l24 24M200 157l8-8M208 165l8-8" stroke="#fff" stroke-width="7" stroke-linecap="round"/>
  <g transform="rotate(14 170 40)"><path d="M150 18a5 5 0 015-5h28l17 18-17 18h-28a5 5 0 01-5-5z" fill="#F2C94C"/><circle cx="162" cy="31" r="4" fill="#16324F"/></g>
</svg>`;
const emptyArt = `<svg width="84" height="64" viewBox="0 0 84 64" aria-hidden="true"><path d="M6 14a4 4 0 014-4h28l16 18-16 18H10a4 4 0 01-4-4z" fill="none" stroke="#9AA7B5" stroke-width="2.5" stroke-dasharray="5 4"/><circle cx="16" cy="28" r="3" fill="#9AA7B5"/><circle cx="56" cy="26" r="12" fill="none" stroke="#0E8F80" stroke-width="5"/><path d="M65 35l14 14" stroke="#0E8F80" stroke-width="5" stroke-linecap="round"/></svg>`;
const lostArt = tile('#FBE5E5','<path d="M24 7a12 12 0 00-12 12c0 9 12 23 12 23s12-14 12-23A12 12 0 0024 7z" fill="#D64545"/><circle cx="24" cy="19" r="5" fill="#fff"/>',64);
const foundArt = tile('#DDF3EF','<rect x="9" y="17" width="30" height="22" rx="4" fill="#F2C94C"/><path d="M9 24h30" stroke="#D9A920" stroke-width="2.5"/><circle cx="35" cy="14" r="9" fill="#0E8F80"/><path d="M31 14l3 3 5-6" stroke="#fff" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',64);
function stepsHtml(n){
  const st=[
   [tile('#FFF1CC','<path d="M24 8a11 11 0 00-11 11c0 8 11 21 11 21s11-13 11-21A11 11 0 0024 8z" fill="#D64545"/><circle cx="24" cy="19" r="4.5" fill="#fff"/>'),n[0],'Found'],
   [tile('#E3ECF6','<path d="M9 40V19l15-10 15 10v21z" fill="#16324F"/><rect x="20" y="28" width="8" height="12" fill="#F2C94C"/><rect x="13" y="23" width="5" height="5" fill="#fff"/><rect x="30" y="23" width="5" height="5" fill="#fff"/>'),n[1],'At Rudisha'],
   [tile('#DDF3EF','<circle cx="24" cy="24" r="14" fill="#0E8F80"/><path d="M17 24l5 5 9-10" stroke="#fff" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'),n[2],'Returned']
  ];
  return `<div class="steps">${st.map(x=>`<div class="step">${x[0]}<b style="font-size:22px;font-family:var(--head)">${x[1]}</b>${x[2]}</div>`).join('')}</div>`;
}
const feeNote = () => `<div class="fee"><b>Recovery fee: ${CUR} ${FEE}</b> per item. If the item was found outside your town or location, you also pay the <b>transport fee</b> for it to reach your destination. The admin arranges this with the finder and tells you the amount first. Every item is dropped at a Rudisha agent or office first, and nothing is paid until it is there.</div>`;


/* ---------- Navigation ---------- */
const ICONS = {
 check:'<path d="M11 4a7 7 0 105.2 11.7l3.4 3.4 1.4-1.4-3.4-3.4A7 7 0 0011 4z"/>',
 lost:'<path d="M12 2a7 7 0 00-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 00-7-7zm0 9.5A2.5 2.5 0 1112 6.5a2.5 2.5 0 010 5z"/>',
 found:'<path d="M9 16.2l-3.5-3.5L4 14.2l5 5 11-11-1.5-1.5z"/>',
 admin:'<path d="M12 2l8 3v6c0 5-3.4 9.4-8 11-4.6-1.6-8-6-8-11V5l8-3z"/>',
 account:'<path d="M12 12a4.5 4.5 0 100-9 4.5 4.5 0 000 9zm0 2c-4 0-8 2-8 5v2h16v-2c0-3-4-5-8-5z"/>'
};
function renderNav(){
  const bar = document.querySelector('nav.bar');
  if(!S.user){ bar.style.display='none'; $('#nav').innerHTML=''; return; }
  bar.style.display='';
  const items=[['check','Check item'],['lost','Report lost'],['found','Report found']];
  if(S.user.role==='admin') items.push(['admin','Admin']);
  items.push(['account','Account']);
  $('#nav').innerHTML = items.map(([k,l])=>`<button data-tab="${k}" ${S.tab===k?'aria-current="true"':''}><svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${ICONS[k]}</svg>${l}</button>`).join('');
}
function render(){
  renderNav();
  if(!S.user){ $('#view').innerHTML = viewAuth(); return; }
  const v = {check:viewCheck, lost:viewLost, found:viewFound, admin:viewAdmin, account:viewAccount}[S.tab] || viewCheck;
  $('#view').innerHTML = v();
  if(S.tab==='check') renderList();
}
function go(tab){ S.tab=tab; render(); refresh(); window.scrollTo(0,0); }

/* ---------- Loading data (row level security decides what each person gets) ---------- */
async function refresh(){
  if(!S.user) return;
  try{
    if(S.tab==='check') S.pub = (await api('/found')).items || [];
    if(S.tab==='account') S.mine = await api('/mine');
    if(S.tab==='admin' && S.user.role==='admin') S.adm = await api('/admin/all');
  }catch(e){
    if(e.status===401){ S.user=null; render(); return; }
    toast(e.message || 'Could not load data');
  }
  if(S.tab==='check') renderList(); else render();
}

/* ---------- Accounts (name, phone number and a PIN) ---------- */
/* ---------- Talking to the server ---------- */
async function api(path, body, method){
  const opt = {method: method || (body ? 'POST' : 'GET'), credentials:'same-origin', headers:{}};
  if(body){ opt.headers['Content-Type']='application/json'; opt.body=JSON.stringify(body); }
  const slow = setTimeout(()=>toast('Waking the server up. This can take up to a minute...'), 6000);
  try{
    const res = await fetch('/api'+path, opt);
    let data = null; try{ data = await res.json(); }catch(e){}
    if(!res.ok){ const err = new Error((data && data.error) || 'Something went wrong'); err.status = res.status; throw err; }
    return data;
  } finally { clearTimeout(slow); }
}
function applySettings(s){ if(!s) return; FEE = +s.fee || 300; FINDER_PCT = +s.finder_pct || 40; PAY_INFO = s.pay_info || ''; }
async function loadProfile(){
  try{ const d = await api('/me'); S.user = d.user; applySettings(d.settings); }
  catch(e){ S.user = null; }
}
async function afterLogin(){
  await loadProfile();
  if(!S.user){ toast('Could not load your profile. Please try again.'); return; }
  S.tab='check'; S.pub=null; S.mine=null; S.adm=null;
  render(); refresh(); window.scrollTo(0,0);
}
function viewAuth(){
  const su = S.authMode==='signup';
  return `<section class="hero"><div><h2>${su?'Create your account':'Welcome back'}</h2><p>Your name and number stay private. Only the Rudisha admin can see them.</p></div>${heroArt}</section>
  <div class="sub"><button data-auth="login" aria-pressed="${!su}">Log in</button><button data-auth="signup" aria-pressed="${su}">Create account</button></div>
  ${su?'<label for="an">Your name</label><input id="an" autocomplete="name">':''}
  <label for="ap">Phone number</label><input id="ap" inputmode="tel" autocomplete="tel" placeholder="07XX XXX XXX">
  <label for="apin">6-digit PIN <small>(keeps your account secure)</small></label><input id="apin" type="password" inputmode="numeric" maxlength="6" autocomplete="${su?'new-password':'current-password'}">
  ${su?'<label for="apin2">Confirm PIN</label><input id="apin2" type="password" inputmode="numeric" maxlength="6" autocomplete="new-password">':''}
  <button class="btn ${su?'teal':''}" ${su?'data-signup':'data-login'}>${su?'Create account':'Log in'}</button>`;
}
async function doSignup(){
  const name=val('an'), phone=val('ap'), pin=val('apin'), pin2=val('apin2');
  if(name.length<2||!phoneOk(phone)){ toast('Enter your name and a valid phone number'); return; }
  if(!/^\d{6}$/.test(pin)){ toast('PIN must be 6 digits'); return; }
  if(pin!==pin2){ toast('The two PINs do not match'); return; }
  await api('/signup', {name, phone, pin});
  await afterLogin();
}
async function doLogin(){
  const phone=val('ap'), pin=val('apin');
  if(!phoneOk(phone)||!pin){ toast('Enter your phone number and PIN'); return; }
  await api('/login', {phone, pin});
  await afterLogin();
}
async function doLogout(){
  try{ await api('/logout', {}); }catch(e){}
  S.user=null; S.pub=null; S.mine=null; S.adm=null; S.tab='check'; S.authMode='login';
  render();
}

/* ---------- Check for item ---------- */
function viewCheck(){
  return `<section class="hero"><div><h2>Is your item here?</h2><p>Search what people have found. Finder details stay private; our admin connects you once your claim is checked.</p></div>${heroArt}</section>
  ${feeNote()}
  <div class="row">
    <div><label for="q">Search</label><input id="q" placeholder="e.g. keys, backpack, ID" value="${esc(S.q)}"></div>
    <div><label for="fc">Category</label><select id="fc"><option value="">All items</option>${catOptions(S.cat)}</select></div>
  </div>
  <div id="list"></div>`;
}
function renderList(){
  const box = $('#list'); if(!box) return;
  if(S.pub===null){ box.innerHTML = '<div class="empty">Loading items...</div>'; return; }
  const q = S.q.toLowerCase();
  const rows = S.pub.filter(f => (!S.cat || f.category===S.cat) &&
     (!q || [f.name,f.public_desc,f.place,f.category].join(' ').toLowerCase().includes(q)));
  box.innerHTML = rows.length ? rows.map(f=>`
    <article class="tagcard">
      <div class="head">${catIcon(f.category)}<div style="flex:1;min-width:0">
        <div class="cardtop"><h3>${esc(f.name)}</h3><span class="ref">${esc(f.ref)}</span></div>
        <span class="chip">${esc(f.category)}</span>${f.area==='outside'?'<span class="chip r">Outside town</span>':''}
      </div></div>
      <p style="margin:10px 0 4px">${esc(f.public_desc)}</p>
      <div class="meta">Found at ${esc(f.place)} &middot; ${esc(f.found_date)}</div>
      ${f.area==='outside'?`<div class="meta" style="margin-top:4px">Found outside town: the owner pays transport for the item to reach their destination.</div>`:''}
      <div class="actions">${f.is_mine?'<span class="meta">You listed this item</span>':`<button class="btn small teal" data-claim="${f.id}">This is mine</button>`}</div>
    </article>`).join('')
  : `<div class="empty">${emptyArt}<b>Nothing matches yet.</b><br>Items are added all the time. Report yours as lost and we will check new finds against it.<div class="actions" style="justify-content:center"><button class="btn small" data-tab="lost">Report lost item</button></div></div>`;
}
function openClaim(id){
  const f = (S.pub||[]).find(x=>x.id===id); if(!f) return;
  $('#layer').innerHTML = `<div class="overlay" data-close><div class="sheet" role="dialog" aria-label="Claim item">
    <div class="head">${catIcon(f.category)}<div><h2 style="margin:0">Claim: ${esc(f.name)}</h2><p class="meta" style="margin:2px 0 0">${esc(f.ref)} &middot; found at ${esc(f.place)}</p></div></div>
    <label for="cr">Proof it is yours <small>(something only the owner would know)</small></label>
    <textarea id="cr" maxlength="500" placeholder="e.g. what is inside, marks, serial number, name on the ID"></textarea>
    <label for="cd">Where should the item reach you? <small>(your town or destination)</small></label><input id="cd" maxlength="120" placeholder="Town, estate or stage">
    <div class="fee" style="margin-top:14px"><b>Recovery fee: ${CUR} ${FEE}</b>, paid only after the admin confirms your proof and the item is at a Rudisha agent or office.${f.area==='outside'?`<br><b>Transport fee applies:</b> this item was found outside your town, so you pay for it to travel to your destination. The admin arranges this with the finder and tells you the amount before you pay.`:''}</div>
    <div class="note">Claiming as <b>${esc(S.user.name)}</b> (${esc(S.user.phone)}). Only our admin sees your number. You do not meet the finder: the item reaches you through Rudisha.</div>
    <button class="btn teal" data-submit-claim="${f.id}">Send claim</button>
    <button class="btn ghost" data-close-btn>Cancel</button>
  </div></div>`;
}
async function submitClaim(id){
  const proof=val('cr'), dest=val('cd');
  if(proof.length<5||!dest){ toast('Add your proof and where the item should reach you'); return; }
  const data = await api('/claims', {found_id:id, proof, destination:dest});
  $('#layer').innerHTML = `<div class="overlay" data-close><div class="sheet">
    <h2>Claim sent</h2>
    <p>Your claim code is <b>${esc(data.code)}</b>. The admin will check your proof and call you on the number in your account. You will see when payment is due in your Account tab. Pay only when it asks you to, once the item is at Rudisha.</p>
    <button class="btn" data-close-btn>Done</button></div></div>`;
  refresh();
}

/* ---------- Report lost ---------- */
function viewLost(){
  return `<div class="banner">${lostArt}<div><h2>Report a lost item</h2><p class="meta">Tell us what you lost and where. If someone reports a match, the admin contacts you.</p></div></div>
  ${feeNote()}
  <label for="lcat">Category</label><select id="lcat">${catOptions()}</select>
  <label for="lname">Item name</label><input id="lname" maxlength="80" placeholder="e.g. Silver Casio watch, grey suitcase">
  <label for="ldesc">Description <small>(colour, brand, marks, what is inside)</small></label><textarea id="ldesc" maxlength="400"></textarea>
  <div class="row"><div><label for="lplace">Where you lost it</label><input id="lplace" maxlength="120" placeholder="Place, stage or route"></div>
  <div><label for="ldate">Date lost</label><input id="ldate" type="date" value="${today()}"></div></div>
  <div class="note privacy">Reporting as <b>${esc(S.user.name)}</b> (${esc(S.user.phone)}). Your contact is hidden from everyone except the admin.</div>
  <button class="btn" data-submit-lost>Submit report</button>`;
}
async function submitLost(){
  const r={category:val('lcat'), name:val('lname'), description:val('ldesc'), place:val('lplace'), lost_date:val('ldate')||today()};
  if(r.name.length<2||r.place.length<2){ toast('Fill the item name and where you lost it'); return; }
  await api('/lost', r);
  toast('Report saved. We will check new finds against it.');
  go('check');
}

/* ---------- Report found ---------- */
function viewFound(){
  return `<div class="banner">${foundArt}<div><h2>Report a found item</h2><p class="meta">When the owner is verified and pays, you receive ${CUR} ${finderCut()} (${FINDER_PCT}% of the ${CUR} ${FEE} fee).</p></div></div>
  <div class="fee"><b>Drop-off first.</b> Every found item must be dropped at a Rudisha agent or office before anything else happens. Rudisha calls you to arrange the drop-off. Please do not hand the item to anyone who says it is theirs. If the owner is in another town, the admin also arranges with you how the item gets to them; the owner pays that transport.</div>
  <label for="fcat">Category</label><select id="fcat">${catOptions()}</select>
  <label for="fname">Item name</label><input id="fname" maxlength="80" placeholder="e.g. Black wallet, Samsung phone">
  <label for="fpub">Public description <small>(shown to everyone, keep it general)</small></label><textarea id="fpub" maxlength="400"></textarea>
  <label for="fpriv">Private details <small>(only admin sees; used to verify the owner)</small></label><textarea id="fpriv" maxlength="400" placeholder="e.g. lock-screen photo, name on card, contents"></textarea>
  <div class="row"><div><label for="fplace">Place found</label><input id="fplace" maxlength="120" placeholder="Place, stage or route"></div>
  <div><label for="fdate">Date found</label><input id="fdate" type="date" value="${today()}"></div></div>
  <label for="farea">Where was it found?</label>
  <select id="farea"><option value="town">In town (near a Rudisha agent or office)</option><option value="outside">Outside town</option></select>
  <label for="fbase">Where are you based? <small>(helps us arrange the drop-off)</small></label><input id="fbase" maxlength="80" placeholder="Town or estate">
  <label for="fpay">Payout number <small>(M-Pesa, if different from your account phone)</small></label><input id="fpay" maxlength="20" inputmode="tel">
  <div class="note privacy">Listing as <b>${esc(S.user.name)}</b> (${esc(S.user.phone)}). Your contact is hidden from the person claiming the item.</div>
  <button class="btn teal" data-submit-found>List found item</button>`;
}
async function submitFound(){
  const f={category:val('fcat'), name:val('fname'), public_desc:val('fpub'), private_details:val('fpriv'),
    place:val('fplace'), found_date:val('fdate')||today(), area:val('farea')||'town', base:val('fbase'), payout_number:val('fpay')};
  if(f.name.length<2||f.public_desc.length<3||f.place.length<2){ toast('Fill item name, public description and place'); return; }
  await api('/found', f);
  toast('Listed. Rudisha will call you to arrange the drop-off.');
  go('check');
}

/* ---------- Account ---------- */
const claimTxt = {pending:'Being checked', approved:'Proof accepted', awaiting_payment:'Payment due', paid:'Payment confirmed', returned:'Delivered', rejected:'Not matched'};
function viewAccount(){
  const u=S.user, m=S.mine;
  let out='';
  if(!m) out = '<div class="empty">Loading...</div>';
  else {
    const card=(cls,title,sub,chip,extra='')=>`<article class="tagcard ${cls}"><div class="cardtop"><h3>${esc(title)}</h3>${chip}</div><div class="meta">${esc(sub)}</div>${extra}</article>`;
    if(m.claims.length) out+=`<h3 style="margin-top:18px">My claims</h3>`+m.claims.map(c=>{
      const due=c.fee+c.transport;
      let extra='';
      if(c.status==='awaiting_payment' && !c.mpesa_code) extra=`<div class="fee" style="margin-top:10px"><b>Pay ${CUR} ${due}</b>${c.transport?` (fee ${c.fee} + transport ${c.transport})`:''}.<br>${esc(PAY_INFO)}</div>
        <label for="mp${c.id}">M-Pesa confirmation code</label><input id="mp${c.id}" maxlength="20" placeholder="e.g. SJK1A2B3C4">
        <div class="actions"><button class="btn small teal" data-pay="${c.id}">Send code</button></div>`;
      if(c.status==='awaiting_payment' && c.mpesa_code) extra=`<div class="note good" style="margin-top:10px">Code ${esc(c.mpesa_code)} sent. The admin will confirm your payment.</div>`;
      return card(c.status==='returned'?'done':'', c.item_name||'Item', c.code, `<span class="chip s">${claimTxt[c.status]||c.status}</span>`, extra);
    }).join('');
    if(m.found.length) out+=`<h3 style="margin-top:18px">Items I found</h3>`+m.found.map(f=>card(f.status==='returned'?'done':'',f.name,f.ref,f.dropoff==='received'?'<span class="chip g">At Rudisha</span>':'<span class="chip">Waiting for drop-off</span>')).join('');
    if(m.lost.length) out+=`<h3 style="margin-top:18px">Items I lost</h3>`+m.lost.map(l=>card('lost',l.name,'Lost at '+l.place,'<span class="chip r">Open</span>')).join('');
    if(!out) out=`<div class="empty">${emptyArt}Your reports and claims will show here.</div>`;
  }
  return `<div class="banner">${catIcon('ID / documents',56)}<div><h2>${esc(u.name)}</h2><p class="meta">${esc(u.phone)} &middot; visible only to the Rudisha admin</p></div></div>
  ${out}<div class="actions" style="margin-top:18px"><button class="btn small ghost" data-logout>Log out</button></div>`;
}
async function submitPay(id){
  const code = val('mp'+id);
  if(code.length<6){ toast('Enter the M-Pesa confirmation code'); return; }
  await api('/claims/'+id+'/pay', {code});
  toast('Code sent. The admin will confirm.'); refresh();
}

/* ---------- Admin ---------- */
const stChip = s => ({pending:'<span class="chip">Needs check</span>',approved:'<span class="chip s">Match approved</span>',awaiting_payment:'<span class="chip s">Awaiting payment</span>',paid:'<span class="chip s">Payment received</span>',returned:'<span class="chip g">Returned</span>',rejected:'<span class="chip r">Rejected</span>'}[s]||'');
function viewAdmin(){
  if(!S.user||S.user.role!=='admin') return `<h2>Admin only</h2><p class="lead">This area is for the Rudisha admin.</p>`;
  const a=S.adm;
  if(!a) return `<h2>Admin</h2><div class="empty">Loading...</div>`;
  const open = a.claims.filter(c=>['pending','approved','awaiting_payment','paid'].includes(c.status)).length;
  const done = a.claims.filter(c=>c.status==='returned');
  const earned = done.reduce((t,c)=>t+(c.fee-finderCut(c.fee)),0);
  const owed = done.filter(c=>!c.finder_paid).reduce((t,c)=>t+finderCut(c.fee),0);
  const n=[a.found.length, a.found.filter(f=>f.dropoff==='received').length, a.found.filter(f=>f.status==='returned').length];
  const sub = (k,l)=>`<button data-sub="${k}" aria-pressed="${S.sub===k}">${l}</button>`;
  let body='';
  if(S.sub==='claims') body = a.claims.length ? a.claims.map(adminClaim).join('') : `<div class="empty">No claims yet.</div>`;
  if(S.sub==='found') body = a.found.length ? a.found.map(adminFound).join('') : `<div class="empty">No found items yet.</div>`;
  if(S.sub==='lost') body = a.lost.length ? a.lost.map(adminLost).join('') : `<div class="empty">No lost reports yet.</div>`;
  return `<h2>Admin</h2>
  ${stepsHtml(n)}
  <div class="split"><div><b>${open}</b>claims in progress</div><div><b>${CUR} ${earned}</b>platform earned</div><div><b>${CUR} ${owed}</b>owed to finders</div></div>
  <div class="sub">${sub('claims','Claims')}${sub('found','Found')}${sub('lost','Lost')}</div>${body}`;
}
function adminClaim(c){
  const f = S.adm.found.find(x=>x.id===c.found_id) || {};
  const fin = f.finder || {}, own = c.claimer || {};
  const here = f.dropoff==='received', outside = f.area==='outside';
  const cut = finderCut(c.fee), due = c.fee + c.transport;
  let acts='', extra='';
  if(c.status==='pending') acts=`<button class="btn small teal" data-cs="${c.id}:approved">Proof matches</button><button class="btn small danger" data-cs="${c.id}:rejected">Reject</button>`;
  if(c.status==='approved'){
    if(!here) acts=`<button class="btn small ghost" data-recv="${f.id}">Item received at Rudisha</button>`;
    else {
      if(outside) extra=`<label for="tr${c.id}">Transport to the owner's destination, charged to the owner (${CUR}). Arrange it with the finder.</label><input id="tr${c.id}" type="number" min="0" inputmode="numeric" value="${c.transport||''}" placeholder="e.g. 150">`;
      acts=`<button class="btn small teal" data-cs="${c.id}:awaiting_payment">Ask owner to pay</button>`;
    }
  }
  if(c.status==='awaiting_payment'){
    extra=`<div class="meta" style="margin-top:8px">Owner pays ${CUR} ${due}. M-Pesa code: <b>${c.mpesa_code?esc(c.mpesa_code):'not sent yet'}</b></div>`;
    acts=`<button class="btn small teal" data-cs="${c.id}:paid">Payment received</button>`;
  }
  if(c.status==='paid') acts=`<button class="btn small teal" data-cs="${c.id}:returned">Item delivered &middot; pay finder ${CUR} ${cut}</button>`;
  if(c.status==='returned') {
    extra=`<div class="meta" style="margin-top:8px">Owner paid ${CUR} ${due}${c.transport?` (fee ${c.fee} + transport ${c.transport})`:''}. Pay finder ${CUR} ${cut} to ${esc(f.payout_number||fin.phone||'')}. Platform keeps ${CUR} ${c.fee-cut}.</div>`;
    acts = c.finder_paid ? '<span class="chip g">Finder paid</span>' : `<button class="btn small teal" data-fpaid="${c.id}">Finder paid</button>`;
  }
  return `<article class="tagcard ${c.status==='returned'?'done':''}">
    <div class="cardtop"><div><h3>${esc(c.item_name||f.name)}</h3>${stChip(c.status)}${outside?'<span class="chip r">Outside town</span>':''}</div><span class="ref">${esc(c.code)}</span></div>
    <div class="private"><strong>Finder:</strong> ${esc(fin.name)} &middot; ${esc(fin.phone)}${f.base?' &middot; based in '+esc(f.base):''}<br><strong>Drop-off:</strong> ${here?'received at Rudisha':'not received yet. Call the finder to arrange it.'}<br><strong>Finder's private details:</strong> ${esc(f.private_details||'none')}</div>
    <div class="private"><strong>Claimer:</strong> ${esc(own.name)} &middot; ${esc(own.phone)}<br><strong>Their proof:</strong> ${esc(c.proof)}<br><strong>Deliver to:</strong> ${esc(c.destination)}</div>
    ${c.status==='approved'&&!here?`<div class="note">No payment can be requested until the item is at a Rudisha agent or office.</div>`:''}
    ${extra}
    <div class="actions">${acts}</div></article>`;
}
function adminFound(f){
  const chip = {listed:'<span class="chip">Listed</span>',claimed:'<span class="chip s">Claimed</span>',returned:'<span class="chip g">Returned</span>'}[f.status];
  const recv = f.dropoff==='received' ? '<span class="chip g">At Rudisha</span>' : '<span class="chip r">Awaiting drop-off</span>';
  const fin = f.finder || {};
  return `<article class="tagcard ${f.status==='returned'?'done':''}">
    <div class="head">${catIcon(f.category)}<div style="flex:1;min-width:0"><div class="cardtop"><h3>${esc(f.name)}</h3><span class="ref">${esc(f.ref)}</span></div>${chip}${recv}${f.area==='outside'?'<span class="chip r">Outside town</span>':''}</div></div>
    <p style="margin:10px 0 4px">${esc(f.public_desc)}</p>
    <div class="meta">${esc(f.place)} &middot; ${esc(f.found_date)}</div>
    <div class="private"><strong>Finder:</strong> ${esc(fin.name)} &middot; ${esc(fin.phone)}${f.base?' &middot; based in '+esc(f.base):''}<br><strong>Private details:</strong> ${esc(f.private_details||'none')}</div>
    ${f.dropoff!=='received'&&f.status!=='returned'?`<div class="actions"><button class="btn small ghost" data-recv="${f.id}">Item received at Rudisha</button></div>`:''}</article>`;
}
function words(s){ return String(s||'').toLowerCase().split(/\W+/).filter(w=>w.length>2); }
function adminLost(l){
  const lw = new Set(words([l.name,l.description].join(' ')));
  const matches = S.adm.found.filter(f=>f.status==='listed').map(f=>{
    let sc = f.category===l.category?2:0; words([f.name,f.public_desc,f.private_details].join(' ')).forEach(w=>{ if(lw.has(w)) sc++; }); return {f,sc};
  }).filter(m=>m.sc>=3).sort((a,b)=>b.sc-a.sc).slice(0,3);
  const o = l.owner || {};
  return `<article class="tagcard lost">
    <div class="cardtop"><div><h3>${esc(l.name)}</h3><span class="chip r">Lost</span><span class="chip s">${esc(l.category)}</span></div><span class="ref">${esc(l.lost_date)}</span></div>
    <p style="margin:8px 0 4px">${esc(l.description||'No description')}</p>
    <div class="meta">Lost at ${esc(l.place)}</div>
    <div class="private"><strong>Owner:</strong> ${esc(o.name)} &middot; ${esc(o.phone)}</div>
    ${matches.length?`<div class="note good"><b>Possible matches:</b> ${matches.map(m=>esc(m.f.ref)+' '+esc(m.f.name)).join(', ')}</div>`:'<div class="meta" style="margin-top:8px">No likely match among listed items yet.</div>'}
  </article>`;
}
async function setClaim(id, st){
  const tr = $('#tr'+id);
  const transport = tr ? Math.max(0, Math.round(+tr.value||0)) : null;
  await api('/admin/claims/'+id, {status:st, transport});
  refresh();
}
async function setRecv(id){
  await api('/admin/found/'+id+'/received', {});
  toast('Marked as received at Rudisha'); refresh();
}
async function setFinderPaid(id){
  await api('/admin/claims/'+id+'/finder-paid', {});
  refresh();
}

/* ---------- Events ---------- */
document.addEventListener('click', e=>{
  const t = e.target.closest('[data-tab],[data-auth],[data-signup],[data-login],[data-claim],[data-submit-claim],[data-submit-lost],[data-submit-found],[data-logout],[data-sub],[data-cs],[data-recv],[data-fpaid],[data-pay],[data-close-btn],[data-close]');
  if(!t) return;
  if(t.hasAttribute('data-close') && e.target!==t) return;   // clicking the backdrop only
  const d = t.dataset;
  if(d.tab) return go(d.tab);
  if(d.auth){ S.authMode=d.auth; return render(); }
  if('signup' in d) return guard(doSignup);
  if('login' in d) return guard(doLogin);
  if(d.claim) return openClaim(+d.claim);
  if(d.submitClaim) return guard(()=>submitClaim(+d.submitClaim));
  if('submitLost' in d) return guard(submitLost);
  if('submitFound' in d) return guard(submitFound);
  if('logout' in d) return guard(doLogout);
  if(d.sub){ S.sub=d.sub; return render(); }
  if(d.cs){ const [id,st]=d.cs.split(':'); return guard(()=>setClaim(+id,st)); }
  if(d.recv) return guard(()=>setRecv(+d.recv));
  if(d.fpaid) return guard(()=>setFinderPaid(+d.fpaid));
  if(d.pay) return guard(()=>submitPay(+d.pay));
  if('closeBtn' in d || 'close' in d){ $('#layer').innerHTML=''; }
});
document.addEventListener('input', e=>{ if(e.target.id==='q'){ S.q=e.target.value; renderList(); } });
document.addEventListener('change', e=>{ if(e.target.id==='fc'){ S.cat=e.target.value; renderList(); } });
document.addEventListener('keydown', e=>{
  if(e.key==='Enter' && ['ap','apin','apin2','an'].includes(e.target.id)){
    guard(S.authMode==='signup' ? doSignup : doLogin);
  }
});

/* ---------- Start ---------- */
async function init(){
  await loadProfile();
  render();
  if(S.user) refresh();
}
init();
