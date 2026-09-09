const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/profile', (req, res) => {
  if (req.user.role !== 'member') return res.status(403).json({ error: 'Members only.' });
  const me = db.data.members.find(m => m.loginId === req.user.loginId);
  if (!me) return res.status(404).json({ error: 'Member record not found.' });
  res.json(me);
});

router.get('/tasks', (req, res) => {
  if (req.user.role !== 'member') return res.status(403).json({ error: 'Members only.' });
  res.json(db.data.tasks.filter(t => t.loginId === req.user.loginId));
});

router.post('/tasks/:id/start', (req, res) => {
  if (req.user.role !== 'member') return res.status(403).json({ error: 'Members only.' });
  const t = db.data.tasks.find(x => x.id === req.params.id && x.loginId === req.user.loginId);
  if (!t) return res.status(404).json({ error: 'Task not found.' });
  t.status = 'progress';
  db.save();
  res.json({ ok: true });
});

router.post('/tasks/:id/finish', (req, res) => {
  if (req.user.role !== 'member') return res.status(403).json({ error: 'Members only.' });
  const { note } = req.body || {};
  const t = db.data.tasks.find(x => x.id === req.params.id && x.loginId === req.user.loginId);
  if (!t) return res.status(404).json({ error: 'Task not found.' });
  t.status = 'review';
  t.completionNote = note || '';
  db.save();
  res.json({ ok: true });
});

router.get('/earnings', (req, res) => {
  if (req.user.role !== 'member') return res.status(403).json({ error: 'Members only.' });
  res.json(db.data.earnings.filter(e => e.loginId === req.user.loginId));
});

module.exports = router;
