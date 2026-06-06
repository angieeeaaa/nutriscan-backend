const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Database = require('better-sqlite3');

const app = express();
const db = new Database('nutriscan.db');
const SECRET = 'nutriscan-secret-key';

app.use(cors());
app.use(express.json());

// set up database tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    preferences TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

// sign up
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'All fields required' });
  }
  try {
    const hashed = await bcrypt.hash(password, 10);
    const stmt = db.prepare('INSERT INTO users (name, email, password) VALUES (?, ?, ?)');
    const result = stmt.run(name, email, hashed);
    const token = jwt.sign({ userId: result.lastInsertRowid }, SECRET);
    res.json({ token, name, email });
  } catch (err) {
    res.status(400).json({ error: 'Email already exists' });
  }
});

// log in
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'All fields required' });
  }
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  const token = jwt.sign({ userId: user.id }, SECRET);
  res.json({ token, name: user.name, email: user.email });
});

// save health profile
app.put('/api/user/profile', (req, res) => {
  const { preferences } = req.body;
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Not logged in' });
  try {
    const { userId } = jwt.verify(token, SECRET);
    const existing = db.prepare('SELECT * FROM profiles WHERE user_id = ?').get(userId);
    if (existing) {
      db.prepare('UPDATE profiles SET preferences = ? WHERE user_id = ?').run(JSON.stringify(preferences), userId);
    } else {
      db.prepare('INSERT INTO profiles (user_id, preferences) VALUES (?, ?)').run(userId, JSON.stringify(preferences));
    }
    res.json({ success: true });
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

app.get('/', (req, res) => {
  res.json({ message: 'NutriScan backend is running!' });
});

const PORT = 5001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});