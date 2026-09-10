const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('../db');
const { signToken } = require('../middleware/auth');

const router = express.Router();

function uid() {
  return Date.now().toString(36) + crypto.randomBytes(4).toString('hex');
}

// POST /api/auth/site-check  { password }
router.post('/site-check', (req, res) => {
  const { password } = req.body || {};
  if (!password || !bcrypt.compareSync(password, db.data.config.sitePasswordHash)) {
    return res.status(401).json({ ok: false, error: 'Incorrect password.' });
  }
  res.json({ ok: true });
});

// POST /api/auth/request-access  { name, affiliation, loginId, password, bio }
router.post('/request-access', (req, res) => {
  const { name, affiliation, loginId, password, bio } = req.body || {};
  if (!name || !affiliation || !loginId || !password) {
    return res.status(400).json({ error: 'Name, affiliation, login ID, and password are required.' });
  }
  if (loginId === 'admin') {
    return res.status(400).json({ error: 'That login ID is reserved.' });
  }
  const memberExists = db.data.members.some(m => m.loginId === loginId);
  const requestExists = db.data.requests.some(r => r.loginId === loginId);
  if (memberExists || requestExists) {
    return res.status(409).json({ error: 'That login ID is taken or already requested.' });
  }
  const passwordHash = bcrypt.hashSync(password, 10);
  db.data.requests.push({
    id: uid(), name, affiliation, loginId, passwordHash,
    bio: bio || '', submittedAt: new Date().toISOString()
  });
  db.save();
  res.json({ ok: true });
});

// POST /api/auth/login  { loginId, password }
router.post('/login', (req, res) => {
  const { loginId, password } = req.body || {};
  if (!loginId || !password) return res.status(400).json({ error: 'Login ID and password are required.' });

  if (loginId === 'admin') {
    if (!bcrypt.compareSync(password, db.data.config.adminPasswordHash)) {
      return res.status(401).json({ error: 'Incorrect admin password.' });
    }
    const token = signToken({ loginId: 'admin', role: 'admin' });
    return res.json({ token, role: 'admin', loginId: 'admin' });
  }

  const member = db.data.members.find(m => m.loginId === loginId);
  if (!member || !bcrypt.compareSync(password, member.passwordHash)) {
    return res.status(401).json({ error: 'Invalid login ID or password, or your request is still pending approval.' });
  }
  const token = signToken({ loginId: member.loginId, role: 'member' });
  res.json({ token, role: 'member', loginId: member.loginId });
});

module.exports = router;
