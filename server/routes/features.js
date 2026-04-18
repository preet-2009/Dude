const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const crypto = require('crypto');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

// ─────────────────────────────────────────────
// MESSAGE REACTIONS
// ─────────────────────────────────────────────
router.post('/messages/:id/reaction', async (req, res) => {
  const { reaction } = req.body; // 'like', 'dislike', or null
  try {
    await pool.query(
      'UPDATE chat_messages SET reaction = $1 WHERE id = $2',
      [reaction, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// PIN MESSAGE
// ─────────────────────────────────────────────
router.post('/messages/:id/pin', async (req, res) => {
  const { pinned } = req.body;
  try {
    await pool.query(
      'UPDATE chat_messages SET is_pinned = $1 WHERE id = $2',
      [pinned, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// GET PINNED MESSAGES
// ─────────────────────────────────────────────
router.get('/sessions/:id/pinned', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, role, content, created_at FROM chat_messages
       WHERE session_id = $1 AND is_pinned = TRUE ORDER BY created_at ASC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// EDIT MESSAGE & REGENERATE
// ─────────────────────────────────────────────
router.post('/messages/:id/edit', async (req, res) => {
  const { content } = req.body;
  try {
    await pool.query(
      'UPDATE chat_messages SET content = $1 WHERE id = $2',
      [content, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// SEARCH IN CHAT
// ─────────────────────────────────────────────
router.get('/sessions/:id/search', async (req, res) => {
  const { q } = req.query;
  try {
    const { rows } = await pool.query(
      `SELECT id, role, content, created_at FROM chat_messages
       WHERE session_id = $1 AND content ILIKE $2 ORDER BY created_at ASC`,
      [req.params.id, `%${q}%`]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// FOLDERS & TAGS
// ─────────────────────────────────────────────
router.post('/sessions/:id/folder', async (req, res) => {
  const { folder } = req.body;
  try {
    await pool.query(
      'UPDATE chat_sessions SET folder = $1 WHERE id = $2',
      [folder, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/sessions/:id/tags', async (req, res) => {
  const { tags } = req.body; // array of strings
  try {
    await pool.query(
      'UPDATE chat_sessions SET tags = $1 WHERE id = $2',
      [tags, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/folders', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT DISTINCT folder FROM chat_sessions WHERE user_id = $1 AND folder IS NOT NULL`,
      [req.user.id]
    );
    res.json(rows.map(r => r.folder));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// SHARE CONVERSATION
// ─────────────────────────────────────────────
router.post('/sessions/:id/share', async (req, res) => {
  const { expiresIn } = req.body; // hours
  try {
    const token = crypto.randomBytes(16).toString('hex');
    const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 3600000) : null;
    
    await pool.query(
      'UPDATE chat_sessions SET share_token = $1 WHERE id = $2',
      [token, req.params.id]
    );
    
    await pool.query(
      'INSERT INTO shared_chats (share_token, session_id, expires_at) VALUES ($1, $2, $3) ON CONFLICT (share_token) DO UPDATE SET expires_at = $3',
      [token, req.params.id, expiresAt]
    );
    
    res.json({ shareUrl: `/share/${token}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/share/:token', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT sc.session_id, cs.title FROM shared_chats sc
       JOIN chat_sessions cs ON sc.session_id = cs.id
       WHERE sc.share_token = $1 AND (sc.expires_at IS NULL OR sc.expires_at > NOW())`,
      [req.params.token]
    );
    
    if (!rows[0]) return res.status(404).json({ error: 'Share link expired or not found' });
    
    const { rows: messages } = await pool.query(
      `SELECT role, content FROM chat_messages WHERE session_id = $1 ORDER BY created_at ASC`,
      [rows[0].session_id]
    );
    
    res.json({ title: rows[0].title, messages });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// PRIVATE MODE & AUTO-DELETE
// ─────────────────────────────────────────────
router.post('/sessions/:id/private', async (req, res) => {
  const { isPrivate } = req.body;
  try {
    await pool.query(
      'UPDATE chat_sessions SET is_private = $1 WHERE id = $2',
      [isPrivate, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/sessions/:id/auto-delete', async (req, res) => {
  const { hours } = req.body;
  try {
    const deleteAt = hours ? new Date(Date.now() + hours * 3600000) : null;
    await pool.query(
      'UPDATE chat_sessions SET auto_delete_at = $1 WHERE id = $2',
      [deleteAt, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Cleanup expired chats (run periodically)
router.post('/cleanup-expired', async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM chat_sessions WHERE auto_delete_at IS NOT NULL AND auto_delete_at < NOW()'
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// PIN SESSION
// ─────────────────────────────────────────────
router.post('/sessions/:id/pin', async (req, res) => {
  const { pinned } = req.body;
  try {
    await pool.query(
      'UPDATE chat_sessions SET is_pinned = $1 WHERE id = $2',
      [pinned, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// USER PREFERENCES & CONTEXT MEMORY
// ─────────────────────────────────────────────
router.get('/preferences', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `INSERT INTO user_preferences (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING RETURNING *`,
      [req.user.id]
    );
    const { rows: prefs } = await pool.query(
      'SELECT * FROM user_preferences WHERE user_id = $1',
      [req.user.id]
    );
    res.json(prefs[0] || {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/preferences', async (req, res) => {
  const { font_size, voice_enabled, voice_language, context_memory } = req.body;
  try {
    await pool.query(
      `INSERT INTO user_preferences (user_id, font_size, voice_enabled, voice_language, context_memory)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id) DO UPDATE SET
       font_size = COALESCE($2, user_preferences.font_size),
       voice_enabled = COALESCE($3, user_preferences.voice_enabled),
       voice_language = COALESCE($4, user_preferences.voice_language),
       context_memory = COALESCE($5, user_preferences.context_memory)`,
      [req.user.id, font_size, voice_enabled, voice_language, context_memory]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// THEME TOGGLE
// ─────────────────────────────────────────────
router.post('/theme', async (req, res) => {
  const { theme } = req.body;
  try {
    await pool.query(
      'UPDATE users SET theme = $1 WHERE id = $2',
      [theme, req.user.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/theme', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT theme FROM users WHERE id = $1',
      [req.user.id]
    );
    res.json({ theme: rows[0]?.theme || 'dark' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// 2FA SETUP
// ─────────────────────────────────────────────
router.post('/2fa/setup', async (req, res) => {
  try {
    const secret = speakeasy.generateSecret({
      name: `DUDE AI (${req.user.email})`,
    });
    
    await pool.query(
      'UPDATE users SET two_fa_secret = $1 WHERE id = $2',
      [secret.base32, req.user.id]
    );
    
    const qrCode = await QRCode.toDataURL(secret.otpauth_url);
    res.json({ secret: secret.base32, qrCode });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/2fa/verify', async (req, res) => {
  const { token } = req.body;
  try {
    const { rows } = await pool.query(
      'SELECT two_fa_secret FROM users WHERE id = $1',
      [req.user.id]
    );
    
    const verified = speakeasy.totp.verify({
      secret: rows[0].two_fa_secret,
      encoding: 'base32',
      token,
    });
    
    if (verified) {
      await pool.query(
        'UPDATE users SET two_fa_enabled = TRUE WHERE id = $1',
        [req.user.id]
      );
      res.json({ success: true });
    } else {
      res.status(400).json({ error: 'Invalid token' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/2fa/disable', async (req, res) => {
  try {
    await pool.query(
      'UPDATE users SET two_fa_enabled = FALSE, two_fa_secret = NULL WHERE id = $1',
      [req.user.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// AVATAR UPLOAD
// ─────────────────────────────────────────────
router.post('/avatar', async (req, res) => {
  const { avatar } = req.body; // base64 or URL
  try {
    await pool.query(
      'UPDATE users SET avatar = $1 WHERE id = $2',
      [avatar, req.user.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
