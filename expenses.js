const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');
const { requireAdmin } = require('../middleware/adminAuth');

const router = express.Router();
const db = new Database(path.join(__dirname, '..', 'data', 'expenses.db'));
db.exec(`
  CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    amount REAL NOT NULL,
    expense_date TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS budget (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    monthly_limit REAL NOT NULL DEFAULT 0
  );
`);

router.use(express.json());
router.use(requireAdmin); // This is personal financial data — every route below is owner-only.

router.post('/expenses', (req, res) => {
  const { description, category, amount, expense_date } = req.body;
  if (!description || !category || !amount || !expense_date) {
    return res.status(400).json({ error: 'Sab fields zaroori hain.' });
  }
  if (Number(amount) <= 0) {
    return res.status(400).json({ error: 'Amount 0 se zyada hona chahiye.' });
  }

  const stmt = db.prepare(`
    INSERT INTO expenses (description, category, amount, expense_date)
    VALUES (?, ?, ?, ?)
  `);
  const result = stmt.run(description, category, Number(amount), expense_date);
  res.status(201).json({ id: result.lastInsertRowid });
});

router.get('/expenses', (req, res) => {
  const rows = db.prepare('SELECT * FROM expenses ORDER BY expense_date DESC, id DESC').all();
  res.json(rows);
});

router.delete('/expenses/:id', (req, res) => {
  db.prepare('DELETE FROM expenses WHERE id = ?').run(req.params.id);
  res.json({ message: 'Deleted.' });
});

router.get('/summary', (req, res) => {
  const now = new Date();
  const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const rows = db.prepare(
    `SELECT category, SUM(amount) as total FROM expenses WHERE expense_date LIKE ? GROUP BY category`
  ).all(`${monthPrefix}%`);

  const totalRow = db.prepare(
    `SELECT SUM(amount) as total FROM expenses WHERE expense_date LIKE ?`
  ).get(`${monthPrefix}%`);

  res.json({
    total: totalRow.total || 0,
    byCategory: rows,
  });
});

router.get('/budget', (req, res) => {
  const row = db.prepare('SELECT monthly_limit FROM budget WHERE id = 1').get();
  res.json({ monthly_limit: row ? row.monthly_limit : 0 });
});

router.post('/budget', (req, res) => {
  const { monthly_limit } = req.body;
  if (monthly_limit === undefined || Number(monthly_limit) < 0) {
    return res.status(400).json({ error: 'Valid budget limit dein.' });
  }
  db.prepare(`
    INSERT INTO budget (id, monthly_limit) VALUES (1, ?)
    ON CONFLICT(id) DO UPDATE SET monthly_limit = excluded.monthly_limit
  `).run(Number(monthly_limit));
  res.json({ message: 'Budget updated.' });
});

module.exports = router;
