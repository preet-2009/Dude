const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// ─────────────────────────────────────────────
// EXPORT CHAT AS TEXT
// ─────────────────────────────────────────────
router.get('/sessions/:id/export/txt', async (req, res) => {
  try {
    const { rows: session } = await pool.query(
      'SELECT title FROM chat_sessions WHERE id = $1',
      [req.params.id]
    );
    
    const { rows: messages } = await pool.query(
      `SELECT role, content, created_at FROM chat_messages
       WHERE session_id = $1 ORDER BY created_at ASC`,
      [req.params.id]
    );
    
    let text = `${session[0]?.title || 'Chat Export'}\n`;
    text += `Exported: ${new Date().toLocaleString()}\n`;
    text += '='.repeat(50) + '\n\n';
    
    messages.forEach(msg => {
      const role = msg.role === 'user' ? 'You' : 'DUDE';
      text += `${role} (${new Date(msg.created_at).toLocaleString()}):\n`;
      text += `${msg.content}\n\n`;
      text += '-'.repeat(50) + '\n\n';
    });
    
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename="chat-${req.params.id}.txt"`);
    res.send(text);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// EXPORT CHAT AS MARKDOWN
// ─────────────────────────────────────────────
router.get('/sessions/:id/export/md', async (req, res) => {
  try {
    const { rows: session } = await pool.query(
      'SELECT title FROM chat_sessions WHERE id = $1',
      [req.params.id]
    );
    
    const { rows: messages } = await pool.query(
      `SELECT role, content, created_at FROM chat_messages
       WHERE session_id = $1 ORDER BY created_at ASC`,
      [req.params.id]
    );
    
    let md = `# ${session[0]?.title || 'Chat Export'}\n\n`;
    md += `**Exported:** ${new Date().toLocaleString()}\n\n`;
    md += '---\n\n';
    
    messages.forEach(msg => {
      const role = msg.role === 'user' ? '👤 **You**' : '🤖 **DUDE**';
      md += `### ${role}\n`;
      md += `*${new Date(msg.created_at).toLocaleString()}*\n\n`;
      md += `${msg.content}\n\n`;
      md += '---\n\n';
    });
    
    res.setHeader('Content-Type', 'text/markdown');
    res.setHeader('Content-Disposition', `attachment; filename="chat-${req.params.id}.md"`);
    res.send(md);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// EXPORT CHAT AS JSON (for PDF generation on client)
// ─────────────────────────────────────────────
router.get('/sessions/:id/export/json', async (req, res) => {
  try {
    const { rows: session } = await pool.query(
      'SELECT title, created_at FROM chat_sessions WHERE id = $1',
      [req.params.id]
    );
    
    const { rows: messages } = await pool.query(
      `SELECT role, content, created_at FROM chat_messages
       WHERE session_id = $1 ORDER BY created_at ASC`,
      [req.params.id]
    );
    
    res.json({
      title: session[0]?.title || 'Chat Export',
      sessionCreated: session[0]?.created_at,
      exportedAt: new Date().toISOString(),
      messages,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
