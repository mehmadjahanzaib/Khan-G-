const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');
const { requireAdmin } = require('../middleware/adminAuth');

const router = express.Router();
const db = new Database(path.join(__dirname, '..', 'data', 'bookings.db'));
db.exec(`
  CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    service TEXT NOT NULL,
    booking_date TEXT NOT NULL,
    booking_time TEXT NOT NULL,
    notes TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);

router.use(express.json());

router.post('/bookings', (req, res) => {
  const { name, email, phone, service, booking_date, booking_time, notes } = req.body;

  if (!name || !email || !service || !booking_date || !booking_time) {
    return res.status(400).json({ error: 'Naam, email, service, date aur time zaroori hain.' });
  }

  const existing = db.prepare(
    'SELECT id FROM bookings WHERE booking_date = ? AND booking_time = ?'
  ).get(booking_date, booking_time);

  if (existing) {
    return res.status(409).json({ error: 'Ye time slot already booked hai. Koi aur time choose karein.' });
  }

  const stmt = db.prepare(`
    INSERT INTO bookings (name, email, phone, service, booking_date, booking_time, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(name, email, phone || '', service, booking_date, booking_time, notes || '');

  res.status(201).json({ id: result.lastInsertRowid, message: 'Booking confirm ho gayi!' });
});

// Only the site owner should see everyone's name/email/phone — admin key required.
router.get('/bookings', requireAdmin, (req, res) => {
  const rows = db.prepare('SELECT * FROM bookings ORDER BY booking_date, booking_time').all();
  res.json(rows);
});

router.delete('/bookings/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM bookings WHERE id = ?').run(req.params.id);
  res.json({ message: 'Booking cancel ho gayi.' });
});

router.get('/bookings/taken/:date', (req, res) => {
  const rows = db.prepare('SELECT booking_time FROM bookings WHERE booking_date = ?').all(req.params.date);
  res.json(rows.map(r => r.booking_time));
});

module.exports = router;
