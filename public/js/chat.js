/**
 * chat.js — Streaming message sending & session loading
 */
const Chat = (() => {
  let pendingAttachment = null;
  let isLoading = false;

  async function sendMessage(userText) {
    if (isLoading) return;
    const text = (userText || '').trim();
    const attachment = pendingAttachment;
    if (!text && !attachment) return;

    let sessionId = Sidebar.activeChatId;
    if (!sessionId) sessionId = Sidebar.createNewChat();

    pendingAttachment = null;
    clearFilePreview();

    UI.appendUserMessage(text, attachment);
    UI.showTypingIndicator();
    isLoading = true;
    setInputDisabled(true);

    try {
      const res = await fetch('/api/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          message: text || '(see attached file)',
          attachment: (attachment && attachment.type === 'text') ? attachment : null,
        }),
      });

      // Handle non-streaming error responses (credits, auth, etc.)
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }));
        UI.removeTypingIndicator();
        if (res.status === 402) {
          if (window.showNoCredits) window.showNoCredits();
        } else if (res.status === 429 || err.error === 'rate_limit') {
          const firstName = (window._userName || 'buddy').split(' ')[0];
          const { content } = UI.appendAIMessage();
          content.innerHTML = `Ohh ${firstName}! Wait for a while, let me drink water 💧`;
        } else {
          showError(err.error || 'AI API error');
        }
        return;
      }

      // Remove typing dots — we'll stream into a real bubble
      UI.removeTypingIndicator();
      const { content } = UI.appendAIMessage();
      content.classList.add('typing-cursor');

      let fullText = '';
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); // keep incomplete line

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6).trim();
          if (!raw || raw === '[DONE]') continue;
          try {
            const parsed = JSON.parse(raw);

            if (parsed.token) {
              fullText += parsed.token;
              // Render markdown progressively
              content.innerHTML = marked.parse(fullText);
              UI.scrollToBottom();
            }

            if (parsed.done) {
              content.classList.remove('typing-cursor');
              if (parsed.credits !== undefined && window.updateCreditsUI) {
                window.updateCreditsUI(parsed.credits);
              }
              // Auto-title sidebar
              const title = text.slice(0, 45) + (text.length > 45 ? '…' : '');
              Sidebar.updateTitle(sessionId, title || 'New Chat');
            }
          } catch {}
        }
      }

      content.classList.remove('typing-cursor');

    } catch (err) {
      UI.removeTypingIndicator();
      showError('Network error — is the server running?');
      console.error(err);
    } finally {
      isLoading = false;
      setInputDisabled(false);
    }
  }

  async function loadSession(sessionId) {
    if (!sessionId) return;
    UI.clearMessages();
    pendingAttachment = null;
    clearFilePreview();
    try {
      const res = await fetch('/api/chat/sessions/' + sessionId + '/messages');
      if (!res.ok) return;
      const messages = await res.json();
      messages.forEach(msg => {
        if (msg.role === 'user') UI.appendUserMessage(msg.content);
        else {
          const { content } = UI.appendAIMessage();
          content.innerHTML = marked.parse(msg.content);
        }
      });
    } catch (e) { console.error('loadSession:', e); }
  }

  async function uploadFile(file) {
    const fd = new FormData();
    fd.append('file', file);
    showFilePreview({ filename: file.name, loading: true });
    try {
      const res = await fetch('/api/chat/upload', { method: 'POST', body: fd });
      if (!res.ok) { const e = await res.json(); alert(e.error || 'Upload failed'); clearFilePreview(); return; }
      const data = await res.json();
      pendingAttachment = data;
      showFilePreview(data);
    } catch { alert('Upload failed'); clearFilePreview(); }
  }

  function showFilePreview(file) {
    document.getElementById('filePreviewBar').style.display = 'flex';
    const item = document.getElementById('filePreviewItem');
    if (file.loading) { item.innerHTML = `⏳ Uploading ${UI.escapeHtml(file.filename)}…`; return; }
    if (file.type === 'image') item.innerHTML = `<img src="${file.content}" alt=""/> <span>${UI.escapeHtml(file.filename)}</span>`;
    else item.innerHTML = `📄 <span>${UI.escapeHtml(file.filename)}</span>`;
  }

  function clearFilePreview() {
    document.getElementById('filePreviewBar').style.display = 'none';
    document.getElementById('filePreviewItem').innerHTML = '';
    const fi = document.getElementById('fileInput');
    if (fi) fi.value = '';
  }

  function showError(msg) {
    const { content } = UI.appendAIMessage();
    content.innerHTML = `<span class="err-msg">⚠ ${UI.escapeHtml(msg)}</span>`;
  }

  function setInputDisabled(v) {
    document.getElementById('messageInput').disabled = v;
    document.getElementById('sendBtn').disabled = v;
  }

  return { sendMessage, uploadFile, loadSession, clearFilePreview };
})();
