const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      google_id TEXT UNIQUE,
      email TEXT UNIQUE NOT NULL,
      name TEXT,
      avatar TEXT,
      password TEXT,
      credits INTEGER DEFAULT 100,
      theme TEXT DEFAULT 'dark',
      two_fa_secret TEXT,
      two_fa_enabled BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS chat_sessions (
      id TEXT PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL DEFAULT 'New Chat',
      folder TEXT,
      tags TEXT[],
      is_private BOOLEAN DEFAULT FALSE,
      is_pinned BOOLEAN DEFAULT FALSE,
      share_token TEXT UNIQUE,
      auto_delete_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id SERIAL PRIMARY KEY,
      session_id TEXT REFERENCES chat_sessions(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      reaction TEXT,
      is_pinned BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS user_preferences (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      font_size TEXT DEFAULT 'medium',
      voice_enabled BOOLEAN DEFAULT FALSE,
      voice_language TEXT DEFAULT 'en-US',
      context_memory JSONB DEFAULT '{}'::jsonb,
      keyboard_shortcuts JSONB DEFAULT '{}'::jsonb
    );

    CREATE TABLE IF NOT EXISTS shared_chats (
      share_token TEXT PRIMARY KEY,
      session_id TEXT REFERENCES chat_sessions(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      expires_at TIMESTAMPTZ
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_user ON chat_sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_folder ON chat_sessions(folder);
    CREATE INDEX IF NOT EXISTS idx_messages_session ON chat_messages(session_id);
    CREATE INDEX IF NOT EXISTS idx_messages_pinned ON chat_messages(is_pinned);
  `);
  console.log('Database ready.');
}

module.exports = { pool, initDB };
