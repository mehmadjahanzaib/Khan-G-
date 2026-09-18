const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');

const router = express.Router();
const db = new Database(path.join(__dirname, '..', 'data', 'countdowns.db'));
db.exec(`
  CREATE TABLE IF NOT EXISTS countdowns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    message TEXT,
    target_datetime TEXT NOT NULL,
    theme TEXT DEFAULT 'forest',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);

router.use(express.json());

function makeSlug(title) {
  const base = title.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const rand = Math.random().toString(36).slice(2, 6);
  return `${base || 'countdown'}-${rand}`;
}

router.post('/countdowns', (req, res) => {
  const { title, message, target_datetime, theme } = req.body;
  if (!title || !target_datetime) {
    return res.status(400).json({ error: 'Title aur date/time zaroori hain.' });
  }

  const slug = makeSlug(title);
  db.prepare(`
    INSERT INTO countdowns (slug, title, message, target_datetime, theme)
    VALUES (?, ?, ?, ?, ?)
  `).run(slug, title, message || '', target_datetime, theme || 'forest');

  res.status(201).json({ slug });
});

router.get('/countdowns/:slug', (req, res) => {
  const row = db.prepare('SELECT * FROM countdowns WHERE slug = ?').get(req.params.slug);
  if (!row) return res.status(404).json({ error: 'Ye countdown nahi mila.' });
  res.json(row);
});

module.exports = router;
