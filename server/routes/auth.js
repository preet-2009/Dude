const express = require('express');
const router = express.Router();
const { passport, registerUser, loginUser } = require('../auth');
const { pool } = require('../db');

// ── Google OAuth ──────────────────────────────
router.get('/google', (req, res, next) => {
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    prompt: 'select_account',
  })(req, res, next);
});

router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/login?error=google' }),
  (req, res) => res.redirect('/')
);

// ── Email Register ────────────────────────────
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ error: 'All fields required' });
  if (password.length < 6)
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  try {
    const user = await registerUser(name, email, password);
    req.login(user, err => {
      if (err) return res.status(500).json({ error: 'Login failed after register' });
      res.json({ success: true, user: { name: user.name, email: user.email, avatar: user.avatar } });
    });
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'Email already in use' });
    res.status(500).json({ error: 'Registration failed' });
  }
});

// ── Email Login ───────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'Email and password required' });
  try {
    const user = await loginUser(email, password);
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });
    req.login(user, err => {
      if (err) return res.status(500).json({ error: 'Login failed' });
      res.json({ success: true, user: { name: user.name, email: user.email, avatar: user.avatar } });
    });
  } catch (e) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// ── Logout ────────────────────────────────────
router.post('/logout', (req, res) => {
  req.logout(() => res.json({ success: true }));
});

// ── Current user ──────────────────────────────
router.get('/me', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  res.json({ user: { name: req.user.name, email: req.user.email, avatar: req.user.avatar, credits: req.user.credits ?? 200 } });
});

// ── Add credits (after watching ad) ───────────
router.post('/credits/add', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  const { amount } = req.body;
  if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });
  try {
    const { rows } = await pool.query(
      'UPDATE users SET credits = credits + $1 WHERE id = $2 RETURNING credits',
      [amount, req.user.id]
    );
    req.user.credits = rows[0].credits;
    res.json({ credits: rows[0].credits });
  } catch (e) {
    res.status(500).json({ error: 'Failed to add credits' });
  }
});

module.exports = router;
