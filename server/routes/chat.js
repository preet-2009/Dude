const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const fetch = require('node-fetch');
const { extractTextFromFile } = require('../utils/fileParser');
const { pool } = require('../db');

// Multer — temp storage for uploads
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

// ─────────────────────────────────────────────
// POST /api/chat/send
// Body: { sessionId, message, attachment? }
// Saves user message, calls OpenRouter, saves + returns AI reply
// ─────────────────────────────────────────────
router.post('/send', async (req, res) => {
  const { sessionId, message, attachment } = req.body;

  if (!sessionId || !message) {
    return res.status(400).json({ error: 'sessionId and message are required' });
  }

  try {
    // Check credits (owner has infinite)
    const isOwner = req.user.email === 'preet.shaileshbhai.desai1@gmail.com';
    const { rows: userRows } = await pool.query('SELECT credits FROM users WHERE id = $1', [req.user.id]);
    const credits = userRows[0]?.credits ?? 0;
    if (!isOwner && credits < 5) {
      return res.status(402).json({ error: 'Not enough credits. Watch an ad to earn more!' });
    }

    // Ensure session exists (scoped to user)
    await pool.query(
      `INSERT INTO chat_sessions (id, user_id) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`,
      [sessionId, req.user.id]
    );

    // Build content — prepend file text if present
    let userContent = message;
    if (attachment && attachment.type === 'text') {
      userContent = `[File: ${attachment.filename}]\n\n${attachment.content}\n\n${message}`;
    }

    // Save user message to DB
    await pool.query(
      `INSERT INTO chat_messages (session_id, role, content) VALUES ($1, $2, $3)`,
      [sessionId, 'user', userContent]
    );

    // Deduct 5 credits (skip for owner)
    let remainingCredits = credits;
    if (!isOwner) {
      const { rows: creditRows } = await pool.query(
        'UPDATE users SET credits = credits - 5 WHERE id = $1 RETURNING credits',
        [req.user.id]
      );
      remainingCredits = creditRows[0]?.credits ?? 0;
    }

    // Auto-title session from first user message
    await pool.query(
      `UPDATE chat_sessions SET title = $1
       WHERE id = $2 AND title = 'New Chat'`,
      [userContent.slice(0, 50) + (userContent.length > 50 ? '…' : ''), sessionId]
    );

    // Fetch full conversation history for this session
    const { rows: history } = await pool.query(
      `SELECT role, content FROM chat_messages
       WHERE session_id = $1 ORDER BY created_at ASC`,
      [sessionId]
    );

    // System prompt — short to reduce token overhead
    const systemPrompt = {
      role: 'system',
      content: `You are DUDE, an AI assistant made by Preet Desai. The user's name is ${req.user.name || 'there'}. Always address them by their first name naturally in conversation. Be concise and helpful. Never say you are ChatGPT or OpenAI. If asked who you are, say: "I'm DUDE, made by Preet Desai."`
    };

    // Call Groq with streaming
    const response = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL,
        messages: [systemPrompt, ...history],
        stream: true,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Groq error:', errText);
      if (response.status === 429) {
        return res.status(429).json({ error: 'rate_limit' });
      }
      return res.status(response.status).json({ error: 'AI API error', detail: errText });
    }

    // Set up SSE headers so client receives tokens as they stream
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    let fullText = '';

    for await (const chunk of response.body) {
      const lines = chunk.toString().split('\n').filter(l => l.trim());
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6);
        if (data === '[DONE]') continue;
        try {
          const parsed = JSON.parse(data);
          const token = parsed.choices?.[0]?.delta?.content || '';
          if (token) {
            fullText += token;
            res.write(`data: ${JSON.stringify({ token })}\n\n`);
          }
        } catch {}
      }
    }

    // Save full AI reply to DB after stream completes
    await pool.query(
      `INSERT INTO chat_messages (session_id, role, content) VALUES ($1, $2, $3)`,
      [sessionId, 'assistant', fullText]
    );

    res.write(`data: ${JSON.stringify({ done: true, credits: remainingCredits })}\n\n`);
    res.end();
  } catch (err) {
    console.error('Send error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────
// GET /api/chat/sessions
// Returns all sessions ordered by newest first
// ─────────────────────────────────────────────
router.get('/sessions', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, title, created_at FROM chat_sessions WHERE user_id = $1 ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error('Sessions error:', err.message);
    res.status(500).json({ error: 'Failed to load sessions' });
  }
});

// ─────────────────────────────────────────────
// GET /api/chat/sessions/:id/messages
// Returns all messages for a session
// ─────────────────────────────────────────────
router.get('/sessions/:id/messages', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT role, content FROM chat_messages
       WHERE session_id = $1 ORDER BY created_at ASC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    console.error('Messages error:', err.message);
    res.status(500).json({ error: 'Failed to load messages' });
  }
});

// ─────────────────────────────────────────────
// DELETE /api/chat/sessions/:id
// ─────────────────────────────────────────────
router.delete('/sessions/:id', async (req, res) => {
  try {
    await pool.query(`DELETE FROM chat_sessions WHERE id = $1`, [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete error:', err.message);
    res.status(500).json({ error: 'Failed to delete session' });
  }
});

// ─────────────────────────────────────────────
// POST /api/chat/upload
// ─────────────────────────────────────────────
router.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const { path: filePath, mimetype, originalname } = req.file;

  try {
    if (mimetype.startsWith('image/')) {
      const publicUploadsDir = path.join(__dirname, '../../public/uploads');
      if (!fs.existsSync(publicUploadsDir)) fs.mkdirSync(publicUploadsDir, { recursive: true });

      const newFilename = `${Date.now()}-${originalname}`;
      const newPath = path.join(publicUploadsDir, newFilename);
      fs.renameSync(filePath, newPath);

      return res.json({ type: 'image', content: `/uploads/${newFilename}`, filename: originalname });
    }

    const text = await extractTextFromFile(filePath, mimetype);
    fs.unlinkSync(filePath);

    if (!text) return res.status(422).json({ error: 'Could not extract text from file' });

    res.json({ type: 'text', content: text, filename: originalname });
  } catch (err) {
    console.error('Upload error:', err.message);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    res.status(500).json({ error: 'Failed to process file' });
  }
});

module.exports = router;
