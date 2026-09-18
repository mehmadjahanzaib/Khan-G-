const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');

const router = express.Router();
const db = new Database(path.join(__dirname, '..', 'data', 'cards.db'));
db.exec(`
  CREATE TABLE IF NOT EXISTS cards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    title TEXT,
    company TEXT,
    email TEXT,
    phone TEXT,
    website TEXT,
    linkedin TEXT,
    bio TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);

router.use(express.json());

function makeSlug(name) {
  const base = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const rand = Math.random().toString(36).slice(2, 6);
  return `${base || 'card'}-${rand}`;
}

router.post('/cards', (req, res) => {
  const { name, title, company, email, phone, website, linkedin, bio } = req.body;
  if (!name) return res.status(400).json({ error: 'Naam zaroori hai.' });

  const slug = makeSlug(name);
  db.prepare(`
    INSERT INTO cards (slug, name, title, company, email, phone, website, linkedin, bio)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(slug, name, title || '', company || '', email || '', phone || '', website || '', linkedin || '', bio || '');

  res.status(201).json({ slug });
});

router.get('/cards/:slug', (req, res) => {
  const card = db.prepare('SELECT * FROM cards WHERE slug = ?').get(req.params.slug);
  if (!card) return res.status(404).json({ error: 'Ye card nahi mila.' });
  res.json(card);
});

module.exports = router;
