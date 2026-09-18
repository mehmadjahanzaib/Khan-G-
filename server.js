require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Make sure the folder for our sqlite database files exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

// ---------- Static, self-contained tools + homepage ----------
app.use(express.static(path.join(__dirname, 'public')));

// ---------- Tools with a small JSON API backed by SQLite ----------
app.use('/tools/booking/api', require('./routes/booking'));
app.use('/tools/countdown/api', require('./routes/countdown'));
app.use('/tools/card/api', require('./routes/card'));
app.use('/tools/expenses/api', require('./routes/expenses'));

// ---------- Inkling (AI writing assistant) API ----------
app.use('/tools/inkling/api', require('./routes/inkling'));

// ---------- LinkHub (full mini SaaS: accounts, link-in-bio, URL shortener) ----------
const createLinkHubApp = require('./src/linkhub/app');
app.use('/linkhub', createLinkHubApp());

// ---------- SEO helpers ----------
app.get('/robots.txt', (req, res) => {
  res.type('text/plain').sendFile(path.join(__dirname, 'public', 'robots.txt'));
});
app.get('/sitemap.xml', (req, res) => {
  res.type('application/xml').sendFile(path.join(__dirname, 'public', 'sitemap.xml'));
});

// ---------- 404 ----------
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

app.listen(PORT, () => {
  console.log(`Khan G running on http://localhost:${PORT}`);
});
