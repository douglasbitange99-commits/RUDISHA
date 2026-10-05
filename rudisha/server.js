'use strict';
/* Rudisha lost & found: Express + MongoDB Atlas.
   The browser never talks to the database. Every rule about who can see what lives here. */
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { MongoClient } = require('mongodb');

const { MONGODB_URI, JWT_SECRET } = process.env;
const DB_NAME = process.env.DB_NAME || 'rudisha';
const PORT = process.env.PORT || 3000;
const PROD = process.env.NODE_ENV === 'production';
if (!MONGODB_URI || !JWT_SECRET || JWT_SECRET.length < 24) {
  console.error('Set MONGODB_URI and JWT_SECRET (at least 24 characters) as environment variables.');
  process.exit(1);
}

/* ---------- helpers ---------- */
class HttpError extends Error { constructor(status, msg) { super(msg); this.status = status; } }
const bad = m => new HttpError(400, m);
const wrap = fn => (req, res, next) => fn(req, res, next).catch(next);
const norm = p => String(p || '').replace(/\D/g, '').slice(-9);
const phoneOk = p => { const s = String(p || '').trim(); return s.length <= 20 && s.replace(/\D/g, '').length >= 9; };
const txt = (v, min, max) => { const s = String(v == null ? '' : v).trim(); return s.length >= min && s.length <= max ? s : null; };
const dateOk = v => (/^\d{4}-\d{2}-\d{2}$/.test(String(v || '')) ? String(v) : new Date().toISOString().slice(0, 10));
const row = d => { if (!d) return d; const { _id, hash, phoneNorm, fails, lockUntil, ...r } = d; return { id: _id, ...r }; };
const who = u => (u ? { name: u.name, phone: u.phone } : {});

let db, users, found, lost, claims, settings, counters;
async function nextId(name) {
  const r = await counters.findOneAndUpdate({ _id: name }, { $inc: { seq: 1 } }, { upsert: true, returnDocument: 'after' });
  return (r && r.value ? r.value : r).seq;
}
async function loadSettings() {
  const out = {};
  (await settings.find().toArray()).forEach(s => { out[s._id] = s.value; });
  return out;
}

/* ---------- app ---------- */
const app = express();
app.set('trust proxy', 1);
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ['https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"],
      frameAncestors: ["'none'"]
    }
  }
}));
app.use(express.json({ limit: '20kb' }));
app.use(cookieParser());
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, limit: 600, standardHeaders: true, legacyHeaders: false }));
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many attempts. Please wait a few minutes.' } });

function setCookie(res, uid) {
  const t = jwt.sign({ uid }, JWT_SECRET, { expiresIn: '30d' });
  res.cookie('rud', t, { httpOnly: true, sameSite: 'lax', secure: PROD, maxAge: 30 * 24 * 3600 * 1000 });
}
async function auth(req, res, next) {
  try {
    const t = req.cookies && req.cookies.rud;
    if (!t) throw new Error('no cookie');
    const { uid } = jwt.verify(t, JWT_SECRET);
    const u = await users.findOne({ _id: uid });
    if (!u) throw new Error('no user');
    req.user = u; next();
  } catch (e) { next(new HttpError(401, 'Please log in')); }
}
const adminOnly = (req, res, next) => (req.user.role === 'admin' ? next() : next(new HttpError(403, 'Admins only')));
const DUMMY_HASH = bcrypt.hashSync('000000', 10);

/* ---------- accounts ---------- */
app.post('/api/signup', authLimiter, wrap(async (req, res) => {
  const name = txt(req.body.name, 2, 60), phone = String(req.body.phone || '').trim(), pin = String(req.body.pin || '');
  if (!name || !phoneOk(phone)) throw bad('Enter your name and a valid phone number');
  if (!/^\d{6}$/.test(pin)) throw bad('PIN must be 6 digits');
  const id = await nextId('users');
  try {
    await users.insertOne({ _id: id, name, phone, phoneNorm: norm(phone), hash: await bcrypt.hash(pin, 10),
      role: 'user', fails: 0, lockUntil: 0, created_at: new Date() });
  } catch (e) {
    if (e && e.code === 11000) throw bad('This number already has an account. Log in instead.');
    throw e;
  }
  setCookie(res, id);
  res.json({ ok: true });
}));

app.post('/api/login', authLimiter, wrap(async (req, res) => {
  const phone = String(req.body.phone || ''), pin = String(req.body.pin || '');
  const u = phoneOk(phone) ? await users.findOne({ phoneNorm: norm(phone) }) : null;
  if (u && u.lockUntil > Date.now()) throw new HttpError(429, 'Too many wrong tries. Try again in 15 minutes.');
  const ok = await bcrypt.compare(pin, u ? u.hash : DUMMY_HASH);
  if (!u || !ok) {
    if (u) {
      const fails = (u.fails || 0) + 1;
      await users.updateOne({ _id: u._id }, { $set: fails >= 5 ? { fails: 0, lockUntil: Date.now() + 15 * 60 * 1000 } : { fails } });
    }
    throw new HttpError(401, 'Phone number or PIN is not right');
  }
  await users.updateOne({ _id: u._id }, { $set: { fails: 0, lockUntil: 0 } });
  setCookie(res, u._id);
  res.json({ ok: true });
}));

app.post('/api/logout', (req, res) => { res.clearCookie('rud'); res.json({ ok: true }); });

app.get('/api/me', auth, wrap(async (req, res) => {
  const u = req.user;
  res.json({ user: { id: u._id, name: u.name, phone: u.phone, role: u.role }, settings: await loadSettings() });
}));

/* ---------- everyone signed in ---------- */
// Public list: no finder identity, no private details, ever.
app.get('/api/found', auth, wrap(async (req, res) => {
  const list = await found.find({ status: 'listed' }).sort({ created_at: -1 }).toArray();
  res.json({ items: list.map(f => ({
    id: f._id, ref: f.ref, category: f.category, name: f.name, public_desc: f.public_desc,
    place: f.place, found_date: f.found_date, area: f.area, is_mine: f.finder_id === req.user._id
  })) });
}));

app.post('/api/found', auth, wrap(async (req, res) => {
  const b = req.body, u = req.user;
  const category = txt(b.category, 2, 40), name = txt(b.name, 2, 80), pubDesc = txt(b.public_desc, 3, 400), place = txt(b.place, 2, 120);
  if (!category || !name || !pubDesc || !place) throw bad('Fill item name, public description and place');
  const id = await nextId('found');
  await found.insertOne({
    _id: id, ref: 'F-' + (1000 + id), finder_id: u._id, category, name, public_desc: pubDesc,
    private_details: txt(b.private_details, 1, 400), place, found_date: dateOk(b.found_date),
    area: b.area === 'outside' ? 'outside' : 'town', base: txt(b.base, 1, 80),
    payout_number: txt(b.payout_number, 1, 20) || u.phone, dropoff: 'awaiting', status: 'listed', created_at: new Date()
  });
  res.json({ ok: true });
}));

app.post('/api/lost', auth, wrap(async (req, res) => {
  const b = req.body, u = req.user;
  const category = txt(b.category, 2, 40), name = txt(b.name, 2, 80), place = txt(b.place, 2, 120);
  if (!category || !name || !place) throw bad('Fill the item name and where you lost it');
  const id = await nextId('lost');
  await lost.insertOne({ _id: id, owner_id: u._id, category, name, description: txt(b.description, 1, 400),
    place, lost_date: dateOk(b.lost_date), status: 'open', created_at: new Date() });
  res.json({ ok: true });
}));

// Owner sends a claim. The item is locked to "claimed" in one atomic step.
app.post('/api/claims', auth, wrap(async (req, res) => {
  const proof = txt(req.body.proof, 5, 500), dest = txt(req.body.destination, 2, 120);
  const fid = Number(req.body.found_id);
  if (!proof || !dest) throw bad('Proof and destination are required');
  const f = await found.findOneAndUpdate(
    { _id: fid, status: 'listed', finder_id: { $ne: req.user._id } },
    { $set: { status: 'claimed' } }, { returnDocument: 'before' });
  const item = f && f.value !== undefined ? f.value : f;
  if (!item) throw bad('This item is no longer available');
  try {
    const st = await loadSettings();
    const id = await nextId('claims');
    const code = 'C-' + (1000 + id);
    await claims.insertOne({ _id: id, code, found_id: item._id, claimer_id: req.user._id, item_ref: item.ref, item_name: item.name,
      proof, destination: dest, fee: Number(st.fee) || 300, transport: 0, status: 'pending', mpesa_code: null,
      finder_paid: false, created_at: new Date() });
    res.json({ code });
  } catch (e) {
    await found.updateOne({ _id: item._id }, { $set: { status: 'listed' } });   // undo the lock
    throw e;
  }
}));

app.get('/api/mine', auth, wrap(async (req, res) => {
  const uid = req.user._id;
  const [f, c, l] = await Promise.all([
    found.find({ finder_id: uid }).sort({ created_at: -1 }).toArray(),
    claims.find({ claimer_id: uid }).sort({ created_at: -1 }).toArray(),
    lost.find({ owner_id: uid }).sort({ created_at: -1 }).toArray()
  ]);
  res.json({
    found: f.map(x => ({ id: x._id, ref: x.ref, name: x.name, status: x.status, dropoff: x.dropoff })),
    claims: c.map(row),
    lost: l.map(x => ({ id: x._id, name: x.name, place: x.place, status: x.status }))
  });
}));

app.post('/api/claims/:id/pay', auth, wrap(async (req, res) => {
  const code = String(req.body.code || '').trim().toUpperCase();
  if (!/^[A-Z0-9]{6,20}$/.test(code)) throw bad('Enter the M-Pesa confirmation code');
  const r = await claims.updateOne({ _id: Number(req.params.id), claimer_id: req.user._id, status: 'awaiting_payment' },
    { $set: { mpesa_code: code } });
  if (!r.matchedCount) throw bad('No payment is due on this claim');
  res.json({ ok: true });
}));

/* ---------- admin only ---------- */
app.get('/api/admin/all', auth, adminOnly, wrap(async (req, res) => {
  const [f, c, l] = await Promise.all([
    found.find().sort({ created_at: -1 }).toArray(),
    claims.find().sort({ created_at: -1 }).toArray(),
    lost.find().sort({ created_at: -1 }).toArray()
  ]);
  const ids = [...new Set([...f.map(x => x.finder_id), ...c.map(x => x.claimer_id), ...l.map(x => x.owner_id)])];
  const map = new Map((await users.find({ _id: { $in: ids } }).toArray()).map(u => [u._id, u]));
  res.json({
    found: f.map(x => ({ ...row(x), finder: who(map.get(x.finder_id)) })),
    claims: c.map(x => ({ ...row(x), claimer: who(map.get(x.claimer_id)) })),
    lost: l.map(x => ({ ...row(x), owner: who(map.get(x.owner_id)) }))
  });
}));

app.post('/api/admin/found/:id/received', auth, adminOnly, wrap(async (req, res) => {
  await found.updateOne({ _id: Number(req.params.id) }, { $set: { dropoff: 'received' } });
  res.json({ ok: true });
}));

// Order of steps is enforced here, not in the browser.
const NEXT = { pending: ['approved', 'rejected'], approved: ['awaiting_payment', 'rejected'], awaiting_payment: ['paid', 'rejected'], paid: ['returned'] };
app.post('/api/admin/claims/:id', auth, adminOnly, wrap(async (req, res) => {
  const id = Number(req.params.id), to = String(req.body.status || '');
  const c = await claims.findOne({ _id: id });
  if (!c) throw new HttpError(404, 'Claim not found');
  if (!(NEXT[c.status] || []).includes(to)) throw bad('A ' + c.status + ' claim cannot move to ' + to);
  const f = await found.findOne({ _id: c.found_id });
  if (['awaiting_payment', 'paid', 'returned'].includes(to) && (!f || f.dropoff !== 'received')) {
    throw bad('The item must be received at Rudisha first');
  }
  const set = { status: to };
  if (req.body.transport != null) set.transport = Math.max(0, Math.round(Number(req.body.transport) || 0));
  await claims.updateOne({ _id: id }, { $set: set });
  if (to === 'rejected') await found.updateOne({ _id: c.found_id }, { $set: { status: 'listed' } });
  if (to === 'returned') await found.updateOne({ _id: c.found_id }, { $set: { status: 'returned' } });
  res.json({ ok: true });
}));

app.post('/api/admin/claims/:id/finder-paid', auth, adminOnly, wrap(async (req, res) => {
  const r = await claims.updateOne({ _id: Number(req.params.id), status: 'returned' }, { $set: { finder_paid: true } });
  if (!r.matchedCount) throw bad('Only delivered claims can be marked paid');
  res.json({ ok: true });
}));

/* ---------- static app + errors ---------- */
app.get('/healthz', (req, res) => res.send('ok'));
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '1h' }));
app.use('/api', (req, res, next) => next(new HttpError(404, 'Not found')));
app.use((err, req, res, next) => {            // eslint-disable-line no-unused-vars
  const status = err.status || 500;
  if (status === 500) console.error(err);
  res.status(status).json({ error: status === 500 ? 'Something went wrong. Please try again.' : err.message });
});

/* ---------- start ---------- */
(async () => {
  const client = new MongoClient(MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
  await client.connect();
  db = client.db(DB_NAME);
  users = db.collection('users'); found = db.collection('found'); lost = db.collection('lost');
  claims = db.collection('claims'); settings = db.collection('settings'); counters = db.collection('counters');
  await Promise.all([
    users.createIndex({ phoneNorm: 1 }, { unique: true }),
    found.createIndex({ status: 1, created_at: -1 }), found.createIndex({ finder_id: 1 }),
    claims.createIndex({ claimer_id: 1 }), claims.createIndex({ found_id: 1 }), lost.createIndex({ owner_id: 1 })
  ]);
  const defaults = { fee: '300', finder_pct: '40', pay_info: 'Payment details will appear here. Set them in the settings collection.' };
  for (const [k, v] of Object.entries(defaults)) await settings.updateOne({ _id: k }, { $setOnInsert: { value: v } }, { upsert: true });
  app.listen(PORT, () => console.log('Rudisha running on port ' + PORT));
})().catch(e => { console.error('Could not start:', e.message); process.exit(1); });
