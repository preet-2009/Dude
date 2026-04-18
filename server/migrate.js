/**
 * Database Migration Script
 * Run this to update existing database with new columns
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function migrate() {
  console.log('🔄 Starting database migration...');

  try {
    // Add new columns to users table
    console.log('📝 Updating users table...');
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS credits INTEGER DEFAULT 100,
      ADD COLUMN IF NOT EXISTS theme TEXT DEFAULT 'dark',
      ADD COLUMN IF NOT EXISTS two_fa_secret TEXT,
      ADD COLUMN IF NOT EXISTS two_fa_enabled BOOLEAN DEFAULT FALSE;
    `);

    // Add new columns to chat_sessions table
    console.log('📝 Updating chat_sessions table...');
    await pool.query(`
      ALTER TABLE chat_sessions 
      ADD COLUMN IF NOT EXISTS folder TEXT,
      ADD COLUMN IF NOT EXISTS tags TEXT[],
      ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS share_token TEXT UNIQUE,
      ADD COLUMN IF NOT EXISTS auto_delete_at TIMESTAMPTZ;
    `);

    // Add new columns to chat_messages table
    console.log('📝 Updating chat_messages table...');
    await pool.query(`
      ALTER TABLE chat_messages 
      ADD COLUMN IF NOT EXISTS reaction TEXT,
      ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE;
    `);

    // Create user_preferences table
    console.log('📝 Creating user_preferences table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_preferences (
        user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        font_size TEXT DEFAULT 'medium',
        voice_enabled BOOLEAN DEFAULT FALSE,
        voice_language TEXT DEFAULT 'en-US',
        context_memory JSONB DEFAULT '{}'::jsonb,
        keyboard_shortcuts JSONB DEFAULT '{}'::jsonb
      );
    `);

    // Create shared_chats table
    console.log('📝 Creating shared_chats table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS shared_chats (
        share_token TEXT PRIMARY KEY,
        session_id TEXT REFERENCES chat_sessions(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        expires_at TIMESTAMPTZ
      );
    `);

    // Create indexes
    console.log('📝 Creating indexes...');
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_sessions_user ON chat_sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_folder ON chat_sessions(folder);
      CREATE INDEX IF NOT EXISTS idx_messages_session ON chat_messages(session_id);
      CREATE INDEX IF NOT EXISTS idx_messages_pinned ON chat_messages(is_pinned);
    `);

    console.log('✅ Migration completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    console.error(err);
    process.exit(1);
  }
}

migrate();
