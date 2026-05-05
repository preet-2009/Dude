const express = require('express');
const router = express.Router();
const { pool } = require('../db');

const OWNER_EMAIL = 'preet.shaileshbhai.desai1@gmail.com';

// Middleware to check if user is admin
function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  if (req.user.email !== OWNER_EMAIL) {
    return res.status(403).json({ error: 'Access denied. Admin only.' });
  }
  next();
}

// Get all users
router.get('/users', requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT 
        u.id,
        u.email,
        u.name,
        u.avatar,
        u.credits,
        u.created_at,
        COUNT(DISTINCT cs.id) as total_chats,
        COUNT(cm.id) as total_messages
      FROM users u
      LEFT JOIN chat_sessions cs ON u.id = cs.user_id
      LEFT JOIN chat_messages cm ON cs.id = cm.session_id
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `);
    res.json({ users: rows });
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get all chat sessions for a specific user
router.get('/users/:userId/chats', requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { rows } = await pool.query(`
      SELECT 
        cs.id,
        cs.title,
        cs.created_at,
        cs.folder,
        cs.tags,
        COUNT(cm.id) as message_count
      FROM chat_sessions cs
      LEFT JOIN chat_messages cm ON cs.id = cm.session_id
      WHERE cs.user_id = $1
      GROUP BY cs.id
      ORDER BY cs.created_at DESC
    `, [userId]);
    res.json({ chats: rows });
  } catch (err) {
    console.error('Error fetching chats:', err);
    res.status(500).json({ error: 'Failed to fetch chats' });
  }
});

// Get all messages for a specific chat session
router.get('/chats/:sessionId/messages', requireAdmin, async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    // Get chat session info with user details
    const sessionResult = await pool.query(`
      SELECT 
        cs.id,
        cs.title,
        cs.created_at,
        u.email,
        u.name
      FROM chat_sessions cs
      JOIN users u ON cs.user_id = u.id
      WHERE cs.id = $1
    `, [sessionId]);

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Chat session not found' });
    }

    // Get all messages
    const messagesResult = await pool.query(`
      SELECT 
        id,
        role,
        content,
        created_at,
        reaction,
        is_pinned
      FROM chat_messages
      WHERE session_id = $1
      ORDER BY created_at ASC
    `, [sessionId]);

    res.json({
      session: sessionResult.rows[0],
      messages: messagesResult.rows
    });
  } catch (err) {
    console.error('Error fetching messages:', err);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Get dashboard statistics
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const stats = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM chat_sessions) as total_chats,
        (SELECT COUNT(*) FROM chat_messages) as total_messages,
        (SELECT COUNT(*) FROM chat_messages WHERE created_at > NOW() - INTERVAL '24 hours') as messages_today,
        (SELECT COUNT(DISTINCT user_id) FROM chat_sessions WHERE created_at > NOW() - INTERVAL '7 days') as active_users_week
    `);
    res.json({ stats: stats.rows[0] });
  } catch (err) {
    console.error('Error fetching stats:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Search messages by content
router.get('/search', requireAdmin, async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) return res.status(400).json({ error: 'Search query required' });

    const { rows } = await pool.query(`
      SELECT 
        cm.id,
        cm.role,
        cm.content,
        cm.created_at,
        cs.title as chat_title,
        cs.id as session_id,
        u.email,
        u.name
      FROM chat_messages cm
      JOIN chat_sessions cs ON cm.session_id = cs.id
      JOIN users u ON cs.user_id = u.id
      WHERE cm.content ILIKE $1
      ORDER BY cm.created_at DESC
      LIMIT 100
    `, [`%${query}%`]);

    res.json({ results: rows });
  } catch (err) {
    console.error('Error searching messages:', err);
    res.status(500).json({ error: 'Failed to search messages' });
  }
});

// Delete a user and all their data
router.delete('/users/:userId', requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

module.exports = router;
