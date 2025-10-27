require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const axios = require('axios');
const path = require('path');
const { createDb } = require('./db');
const { authRequired, optionalAuth, adminOnly } = require('./auth');

const PORT = parseInt(process.env.PORT || '4000', 10);
const PREDICTOR_URL = process.env.PREDICTOR_URL || '';
const DB_FILE = process.env.DATABASE_FILE || path.join(__dirname, '..', 'data', 'asl.db');

const db = createDb(DB_FILE);

// Labels known by the predictor/model (mock fallback)
const LABELS = [
  'A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z','del','nothing','space'
];

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));

function nowIso() { return new Date().toISOString(); }

// ----- Health -----
app.get('/health', (_req, res) => {
  res.json({ status: 'healthy', predictor_configured: !!PREDICTOR_URL });
});

// ----- Auth -----
app.post('/api/auth/register', (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  if (!email || !password) return res.status(400).json({ success: false, error: 'Email and password are required' });

  const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (exists) return res.status(409).json({ success: false, error: 'Email already registered' });

  const countRow = db.prepare('SELECT COUNT(1) as c FROM users').get();
  const role = countRow.c === 0 ? 'admin' : 'user';
  const password_hash = bcrypt.hashSync(password, 10);
  const ts = nowIso();
  const result = db.prepare(`
    INSERT INTO users(email, password_hash, role, active, blocked, created_at, updated_at, last_activity_at)
    VALUES(?, ?, ?, 1, 0, ?, ?, ?)
  `).run(email, password_hash, role, ts, ts, ts);

  const user = db.prepare('SELECT id, email, role, active, blocked, created_at, updated_at, last_activity_at FROM users WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ success: true, user });
});

app.post('/api/auth/login', (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  if (!email || !password) return res.status(400).json({ success: false, error: 'Email and password are required' });
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) return res.status(401).json({ success: false, error: 'Invalid credentials' });
  if (!user.active || user.blocked) return res.status(403).json({ success: false, error: 'Account inactive or blocked' });
  db.prepare('UPDATE users SET last_activity_at = ?, updated_at = ? WHERE id = ?').run(nowIso(), nowIso(), user.id);
  const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET || 'change-me', { expiresIn: '7d' });
  const safe = { id: user.id, email: user.email, role: user.role, active: !!user.active, blocked: !!user.blocked, created_at: user.created_at, updated_at: user.updated_at, last_activity_at: user.last_activity_at };
  res.json({ success: true, access_token: token, user: safe });
});

app.get('/api/auth/me', authRequired, (req, res) => {
  const user = db.prepare('SELECT id, email, role, active, blocked, created_at, updated_at, last_activity_at FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ success: false, error: 'User not found' });
  res.json({ success: true, user });
});

// ----- User management (admin) -----
app.get('/api/users', authRequired, adminOnly, (_req, res) => {
  const users = db.prepare('SELECT id, email, role, active, blocked, created_at, updated_at, last_activity_at FROM users ORDER BY created_at DESC').all();
  res.json({ success: true, users });
});

app.patch('/api/users/:id', authRequired, adminOnly, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!user) return res.status(404).json({ success: false, error: 'User not found' });
  const active = req.body.active !== undefined ? (req.body.active ? 1 : 0) : user.active;
  const blocked = req.body.blocked !== undefined ? (req.body.blocked ? 1 : 0) : user.blocked;
  const role = req.body.role || user.role;
  db.prepare('UPDATE users SET active = ?, blocked = ?, role = ?, updated_at = ? WHERE id = ?').run(active, blocked, role, nowIso(), id);
  const safe = db.prepare('SELECT id, email, role, active, blocked, created_at, updated_at, last_activity_at FROM users WHERE id = ?').get(id);
  res.json({ success: true, user: safe });
});

// Helper to insert prediction log
function insertPredictionLog({ userId, label, confidence, latencyMs, success, error, clientIp, topPreds }) {
  const stmt = db.prepare(`
    INSERT INTO prediction_logs(user_id, timestamp, label, confidence, latency_ms, success, error_message, client_ip, top_predictions)
    VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(userId || null, nowIso(), label || null, confidence ?? null, latencyMs ?? null, success ? 1 : 0, error || null, clientIp || null, topPreds ? JSON.stringify(topPreds) : null);
}

// ----- Prediction forwarding -----
app.post('/api/predict', optionalAuth, async (req, res) => {
  const image = req.body?.image;
  if (!image) return res.status(400).json({ success: false, error: 'No image provided' });
  const start = performance.now();
  try {
    let data;
    if (PREDICTOR_URL) {
      const resp = await axios.post(`${PREDICTOR_URL}/api/predict`, { image });
      data = resp.data || {};
    } else {
      // Dev fallback: mock prediction
      const idx = Math.floor(Math.random() * LABELS.length);
      const label = LABELS[idx];
      const confidence = Math.round((0.7 + Math.random() * 0.3) * 100) / 100;
      const top_predictions = Object.fromEntries(
        LABELS.slice(0, 5).map((l, i) => [l, Math.round((confidence - i * 0.05) * 100) / 100])
      );
      data = { success: true, prediction: label, confidence, top_predictions };
    }
    const latencyMs = performance.now() - start;
    insertPredictionLog({
      userId: req.user?.id,
      label: data.prediction,
      confidence: data.confidence,
      latencyMs,
      success: true,
      error: null,
      clientIp: req.ip,
      topPreds: data.top_predictions,
    });
    // Update last activity if logged in
    if (req.user?.id) {
      db.prepare('UPDATE users SET last_activity_at = ?, updated_at = ? WHERE id = ?').run(nowIso(), nowIso(), req.user.id);
    }
    res.json({ ...data, latency_ms: data.latency_ms ?? latencyMs });
  } catch (e) {
    const latencyMs = performance.now() - start;
    insertPredictionLog({ userId: req.user?.id, success: false, error: String(e), latencyMs, clientIp: req.ip });
    res.status(500).json({ success: false, error: 'Prediction failed' });
  }
});

app.post('/api/predict-batch', optionalAuth, async (req, res) => {
  const images = req.body?.images;
  if (!Array.isArray(images) || images.length === 0) return res.status(400).json({ success: false, error: 'No images provided' });
  try {
    let data;
    if (PREDICTOR_URL) {
      const resp = await axios.post(`${PREDICTOR_URL}/api/predict-batch`, { images });
      data = resp.data || {};
    } else {
      // Dev fallback: mock results
      const results = images.map(() => {
        const idx = Math.floor(Math.random() * LABELS.length);
        const label = LABELS[idx];
        const confidence = Math.round((0.7 + Math.random() * 0.3) * 100) / 100;
        return { prediction: label, confidence };
      });
      data = { success: true, results };
    }
    for (const item of data.results || []) {
      insertPredictionLog({
        userId: req.user?.id,
        label: item.prediction,
        confidence: item.confidence,
        latencyMs: null,
        success: item.error ? false : true,
        error: item.error || null,
        clientIp: req.ip,
      });
    }
    if (req.user?.id) {
      db.prepare('UPDATE users SET last_activity_at = ?, updated_at = ? WHERE id = ?').run(nowIso(), nowIso(), req.user.id);
    }
    res.json(data);
  } catch (e) {
    res.status(500).json({ success: false, error: 'Batch prediction failed' });
  }
});

app.get('/api/labels', async (_req, res) => {
  if (PREDICTOR_URL) {
    try {
      const resp = await axios.get(`${PREDICTOR_URL}/api/labels`);
      return res.json(resp.data);
    } catch (e) {
      // fallthrough to mock
    }
  }
  return res.json({ success: true, labels: LABELS });
});

// ----- Stats -----
app.get('/api/stats/summary', authRequired, adminOnly, (_req, res) => {
  const total = db.prepare('SELECT COUNT(1) as c FROM prediction_logs').get().c || 0;
  const avgConf = db.prepare('SELECT AVG(confidence) as a FROM prediction_logs WHERE success = 1 AND confidence IS NOT NULL').get().a;
  const avgLat = db.prepare('SELECT AVG(latency_ms) as a FROM prediction_logs WHERE latency_ms IS NOT NULL').get().a;
  const users = db.prepare('SELECT COUNT(1) as c FROM users').get().c || 0;
  const cutoff = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const active = db.prepare('SELECT COUNT(1) as c FROM users WHERE last_activity_at IS NOT NULL AND last_activity_at > ?').get(cutoff).c || 0;
  res.json({ success: true, stats: {
    total_predictions: Number(total),
    average_confidence: avgConf != null ? Number(avgConf) : null,
    average_latency_ms: avgLat != null ? Number(avgLat) : null,
    active_sessions: Number(active),
    users_count: Number(users)
  }});
});

// ----- Prediction logs listing -----
app.get('/api/predictions', authRequired, (req, res) => {
  const isAdmin = req.user.role === 'admin';
  const qp = req.query;

  let sql = 'SELECT * FROM prediction_logs WHERE 1=1';
  const params = [];

  if (!isAdmin) {
    sql += ' AND user_id = ?';
    params.push(req.user.id);
  } else {
    if (qp.user_id) { sql += ' AND user_id = ?'; params.push(Number(qp.user_id)); }
    if (qp.email) {
      const u = db.prepare('SELECT id FROM users WHERE email = ?').get(String(qp.email).toLowerCase());
      sql += ' AND user_id ' + (u ? '= ?' : '= -1');
      if (u) params.push(u.id);
    }
  }

  if (qp.label) { sql += ' AND label = ?'; params.push(String(qp.label)); }
  if (qp.min_confidence) { sql += ' AND confidence >= ?'; params.push(Number(qp.min_confidence)); }
  if (qp.max_confidence) { sql += ' AND confidence <= ?'; params.push(Number(qp.max_confidence)); }
  if (qp.success !== undefined) {
    const s = String(qp.success).toLowerCase();
    if (['true','1'].includes(s)) { sql += ' AND success = 1'; }
    if (['false','0'].includes(s)) { sql += ' AND success = 0'; }
  }
  if (qp.start) { sql += ' AND timestamp >= ?'; params.push(String(qp.start)); }
  if (qp.end) { sql += ' AND timestamp <= ?'; params.push(String(qp.end)); }

  const page = Math.max(parseInt(qp.page || '1', 10), 1);
  const pageSize = Math.min(Math.max(parseInt(qp.page_size || '25', 10), 1), 200);

  const countSql = 'SELECT COUNT(1) as c FROM (' + sql + ')';
  const total = db.prepare(countSql).get(...params).c;

  sql += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?';
  const items = db.prepare(sql).all(...params, pageSize, (page - 1) * pageSize)
    .map(r => ({
      ...r,
      success: !!r.success,
      top_predictions: r.top_predictions ? JSON.parse(r.top_predictions) : null,
    }));

  res.json({ success: true, total, page, page_size: pageSize, items });
});

app.listen(PORT, () => {
  /* eslint-disable no-console */
  console.log(`🚀 ASL Node API listening on http://localhost:${PORT}`);
  if (!PREDICTOR_URL) {
    console.log('ℹ️  No predictor configured. Set PREDICTOR_URL to enable predictions.');
  } else {
    console.log(`🔗 Predictor URL: ${PREDICTOR_URL}`);
  }
});
