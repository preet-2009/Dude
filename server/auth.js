const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const bcrypt = require('bcryptjs');
const { pool } = require('./db');

passport.serializeUser((user, done) => done(null, user.id));

passport.deserializeUser(async (id, done) => {
  try {
    const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    done(null, rows[0] || null);
  } catch (e) { done(e); }
});

// Google OAuth strategy
passport.use(new GoogleStrategy({
  clientID:     process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL:  process.env.GOOGLE_CALLBACK_URL,
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const email = profile.emails?.[0]?.value;
    const avatar = profile.photos?.[0]?.value;
    const name = profile.displayName;

    // Upsert user
    const { rows } = await pool.query(`
      INSERT INTO users (google_id, email, name, avatar)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (google_id) DO UPDATE SET name=$3, avatar=$4
      RETURNING *
    `, [profile.id, email, name, avatar]);

    done(null, rows[0]);
  } catch (e) { done(e); }
}));

// Email/password helpers
async function registerUser(name, email, password) {
  const hash = await bcrypt.hash(password, 10);
  const { rows } = await pool.query(
    `INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING *`,
    [name, email, hash]
  );
  return rows[0];
}

async function loginUser(email, password) {
  const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  if (!rows[0]) return null;
  const match = await bcrypt.compare(password, rows[0].password);
  return match ? rows[0] : null;
}

module.exports = { passport, registerUser, loginUser };
