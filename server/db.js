const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function initDB() {
  try {
    // Create base tables if they don't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        google_id TEXT UNIQUE,
        email TEXT UNIQUE NOT NULL,
        name TEXT,
        avatar TEXT,
        password TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS chat_sessions (
        id TEXT PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL DEFAULT 'New Chat',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS chat_messages (
        id SERIAL PRIMARY KEY,
        session_id TEXT REFERENCES chat_sessions(id) ON DELETE CASCADE,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Add new columns if they don't exist (for existing databases)
    await pool.query(`
      DO $$ 
      BEGIN
        -- Add columns to users table
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='credits') THEN
          ALTER TABLE users ADD COLUMN credits INTEGER DEFAULT 100;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='theme') THEN
          ALTER TABLE users ADD COLUMN theme TEXT DEFAULT 'dark';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='two_fa_secret') THEN
          ALTER TABLE users ADD COLUMN two_fa_secret TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='two_fa_enabled') THEN
          ALTER TABLE users ADD COLUMN two_fa_enabled BOOLEAN DEFAULT FALSE;
        END IF;

        -- Add columns to chat_sessions table
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='chat_sessions' AND column_name='folder') THEN
          ALTER TABLE chat_sessions ADD COLUMN folder TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='chat_sessions' AND column_name='tags') THEN
          ALTER TABLE chat_sessions ADD COLUMN tags TEXT[];
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='chat_sessions' AND column_name='is_private') THEN
          ALTER TABLE chat_sessions ADD COLUMN is_private BOOLEAN DEFAULT FALSE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='chat_sessions' AND column_name='is_pinned') THEN
          ALTER TABLE chat_sessions ADD COLUMN is_pinned BOOLEAN DEFAULT FALSE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='chat_sessions' AND column_name='share_token') THEN
          ALTER TABLE chat_sessions ADD COLUMN share_token TEXT UNIQUE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='chat_sessions' AND column_name='auto_delete_at') THEN
          ALTER TABLE chat_sessions ADD COLUMN auto_delete_at TIMESTAMPTZ;
        END IF;

        -- Add columns to chat_messages table
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='chat_messages' AND column_name='reaction') THEN
          ALTER TABLE chat_messages ADD COLUMN reaction TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='chat_messages' AND column_name='is_pinned') THEN
          ALTER TABLE chat_messages ADD COLUMN is_pinned BOOLEAN DEFAULT FALSE;
        END IF;
      END $$;
    `);

    // Create new tables
    await pool.query(`
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
    `);

    // Create indexes
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_sessions_user ON chat_sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_folder ON chat_sessions(folder);
      CREATE INDEX IF NOT EXISTS idx_messages_session ON chat_messages(session_id);
      CREATE INDEX IF NOT EXISTS idx_messages_pinned ON chat_messages(is_pinned);
    `);

    // Create global credit usage tracking table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS global_credit_usage (
        id SERIAL PRIMARY KEY,
        date DATE NOT NULL DEFAULT CURRENT_DATE,
        credits_used INTEGER DEFAULT 0,
        UNIQUE(date)
      );

      CREATE INDEX IF NOT EXISTS idx_global_usage_date ON global_credit_usage(date);
    `);

    console.log('Database ready.');
  } catch (err) {
    console.error('Database initialization error:', err);
    throw err;
  }
}

module.exports = { pool, initDB };
