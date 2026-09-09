const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'union.json');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function defaultData() {
  const DEFAULT_SITE_PASSWORD = process.env.DEFAULT_SITE_PASSWORD || 'union-access-2026';
  const DEFAULT_ADMIN_PASSWORD = process.env.DEFAULT_ADMIN_PASSWORD || 'ChangeMe123!';
  console.log('Seeded default config. SITE PASSWORD:', DEFAULT_SITE_PASSWORD, '| ADMIN PASSWORD:', DEFAULT_ADMIN_PASSWORD);
  console.log('>>> Change both immediately from the admin Settings tab after first login. <<<');
  return {
    config: {
      sitePasswordHash: bcrypt.hashSync(DEFAULT_SITE_PASSWORD, 10),
      adminPasswordHash: bcrypt.hashSync(DEFAULT_ADMIN_PASSWORD, 10),
      securityQuestion: 'What year was this union founded?',
      securityAnswerHash: bcrypt.hashSync('reset', 10),
    },
    requests: [],
    members: [],
    tasks: [],
    earnings: [],
    announcements: [],
  };
}

let data;
if (fs.existsSync(DATA_FILE)) {
  data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
} else {
  data = defaultData();
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// Call this after any mutation to persist to disk.
// NOTE: on Render's free tier the filesystem is wiped on every restart/redeploy —
// this keeps data alive between requests, but for real long-term persistence,
// move to a managed database (e.g. Render's free Postgres) later.
function save() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

module.exports = { data, save };
