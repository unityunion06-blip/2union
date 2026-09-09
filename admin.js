const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('../db');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(requireAdmin);

function uid() {
  return Date.now().toString(36) + crypto.randomBytes(4).toString('hex');
}
function monthKey(d) {
  const dt = d ? new Date(d) : new Date();
  return dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0');
}

/* ---------- requests ---------- */
router.get('/requests', (req, res) => res.json(db.data.requests));

router.post('/requests/:id/approve', (req, res) => {
  const r = db.data.requests.find(x => x.id === req.params.id);
  if (!r) return res.status(404).json({ error: 'Request not found.' });
  db.data.members.push({
    loginId: r.loginId,
    name: r.name,
    affiliation: r.affiliation,
    passwordHash: r.passwordHash,
    bio: r.bio,
    house: '',
    rank: 'E-Rank',
    joinedAt: new Date().toISOString()
  });
  db.data.requests = db.data.requests.filter(x => x.id !== r.id);
  db.save();
  res.json({ ok: true });
});

router.post('/requests/:id/reject', (req, res) => {
  db.data.requests = db.data.requests.filter(x => x.id !== req.params.id);
  db.save();
  res.json({ ok: true });
});

/* ---------- members ---------- */
router.get('/members', (req, res) => res.json(db.data.members));

router.patch('/members/:loginId', (req, res) => {
  const { affiliation, house, rank } = req.body || {};
  const m = db.data.members.find(x => x.loginId === req.params.loginId);
  if (!m) return res.status(404).json({ error: 'Member not found.' });
  if (affiliation !== undefined) m.affiliation = affiliation;
  if (house !== undefined) m.house = house;
  if (rank !== undefined) m.rank = rank;
  db.save();
  res.json({ ok: true });
});

router.delete('/members/:loginId', (req, res) => {
  db.data.members = db.data.members.filter(x => x.loginId !== req.params.loginId);
  db.save();
  res.json({ ok: true });
});

/* ---------- tasks ---------- */
router.get('/tasks', (req, res) => res.json(db.data.tasks));

router.post('/tasks', (req, res) => {
  const { loginId, title, desc, due, reward } = req.body || {};
  if (!loginId || !title) return res.status(400).json({ error: 'Member and task title are required.' });
  const id = uid();
  db.data.tasks.push({
    id, loginId, title, desc: desc || '', due: due || null,
    reward: Number(reward || 0), status: 'pending',
    completionNote: '', assignedAt: new Date().toISOString()
  });
  db.save();
  res.json({ ok: true, id });
});

router.delete('/tasks/:id', (req, res) => {
  db.data.tasks = db.data.tasks.filter(x => x.id !== req.params.id);
  db.save();
  res.json({ ok: true });
});

router.post('/tasks/:id/approve', (req, res) => {
  const t = db.data.tasks.find(x => x.id === req.params.id);
  if (!t) return res.status(404).json({ error: 'Task not found.' });
  t.status = 'complete';
  if (Number(t.reward || 0) > 0) {
    db.data.earnings.push({
      id: uid(), loginId: t.loginId, amount: Number(t.reward),
      note: 'Task Reward: ' + t.title, month: monthKey(), date: new Date().toISOString()
    });
  }
  db.save();
  res.json({ ok: true });
});

router.post('/tasks/:id/reject', (req, res) => {
  const t = db.data.tasks.find(x => x.id === req.params.id);
  if (!t) return res.status(404).json({ error: 'Task not found.' });
  t.status = 'progress';
  db.save();
  res.json({ ok: true });
});

/* ---------- earnings ---------- */
router.post('/earnings', (req, res) => {
  const { loginId, amount, note } = req.body || {};
  if (!loginId || !(Number(amount) > 0)) return res.status(400).json({ error: 'Member and a positive amount are required.' });
  db.data.earnings.push({
    id: uid(), loginId, amount: Number(amount), note: note || '',
    month: monthKey(), date: new Date().toISOString()
  });
  db.save();
  res.json({ ok: true });
});

router.get('/earnings', (req, res) => res.json(db.data.earnings));

/* ---------- announcements ---------- */
router.post('/announcements', (req, res) => {
  const { title, body } = req.body || {};
  if (!title || !body) return res.status(400).json({ error: 'Title and content are required.' });
  const id = uid();
  db.data.announcements.push({ id, title, body, date: new Date().toISOString() });
  db.save();
  res.json({ ok: true, id });
});

router.delete('/announcements/:id', (req, res) => {
  db.data.announcements = db.data.announcements.filter(x => x.id !== req.params.id);
  db.save();
  res.json({ ok: true });
});

/* ---------- settings ---------- */
router.patch('/settings/site-password', (req, res) => {
  const { newPassword } = req.body || {};
  if (!newPassword) return res.status(400).json({ error: 'New password is required.' });
  db.data.config.sitePasswordHash = bcrypt.hashSync(newPassword, 10);
  db.save();
  res.json({ ok: true });
});

router.patch('/settings/admin-password', (req, res) => {
  const { securityAnswer, newPassword } = req.body || {};
  if (!securityAnswer || !bcrypt.compareSync(securityAnswer.trim().toLowerCase(), db.data.config.securityAnswerHash)) {
    return res.status(401).json({ error: 'Security answer mismatch.' });
  }
  if (!newPassword) return res.status(400).json({ error: 'New master password is required.' });
  db.data.config.adminPasswordHash = bcrypt.hashSync(newPassword, 10);
  db.save();
  res.json({ ok: true });
});

router.get('/settings', (req, res) => {
  res.json({ securityQuestion: db.data.config.securityQuestion });
});

module.exports = router;
