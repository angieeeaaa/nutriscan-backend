const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Database = require('better-sqlite3');
const https = require('https');

const app = express();
const db = new Database('nutriscan.db');
const SECRET = 'nutriscan-secret-key';

app.use(cors());
app.use(express.json());

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

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'FoodLens/1.0 (NUS Orbital 2026)' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

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

app.get('/api/user/profile', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Not logged in' });
  try {
    const { userId } = jwt.verify(token, SECRET);
    const profile = db.prepare('SELECT preferences FROM profiles WHERE user_id = ?').get(userId);
    const preferences = profile ? JSON.parse(profile.preferences) : [];
    res.json({ preferences });
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

app.get('/api/food/search', async (req, res) => {
  const { query } = req.query;
  try {
    const data = await httpsGet(
      `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=10`
    );
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

app.get('/api/food/barcode/:barcode', async (req, res) => {
  const { barcode } = req.params;
  try {
    const data = await httpsGet(
      `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`
    );
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

app.get('/', (req, res) => {
  res.json({ message: 'NutriScan backend is running!' });
});

const PORT = 5001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
