require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./db');
const { requireAuth } = require('./middleware/auth');

const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const memberRoutes = require('./routes/member');

const app = express();
app.use(cors()); // in production, restrict this to your site's origin — see README
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/member', memberRoutes);

// Shared read for anyone logged in (admin or member) — the bulletin feed
app.get('/api/announcements', requireAuth, (req, res) => {
  res.json(db.data.announcements);
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`UNION backend listening on port ${PORT}`);
});
