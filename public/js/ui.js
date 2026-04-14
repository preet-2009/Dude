/**
 * ui.js — DOM rendering helpers
 */
const UI = (() => {
  const msgs    = () => document.getElementById('messages');
  const welcome = () => document.getElementById('welcome');

  function hideWelcome() { const w = welcome(); if (w) w.style.display = 'none'; }
  function showWelcome() { const w = welcome(); if (w) w.style.display = ''; }

  function clearMessages() {
    msgs().querySelectorAll('.message-row').forEach(r => r.remove());
    showWelcome();
  }

  function appendUserMessage(text, attachment) {
    hideWelcome();
    const row = document.createElement('div');
    row.className = 'message-row user';
    const bubble = document.createElement('div');
    bubble.className = 'bubble';

    if (attachment) {
      if (attachment.type === 'image') {
        const img = document.createElement('img');
        img.src = attachment.content; img.className = 'chat-image'; img.alt = attachment.filename;
        bubble.appendChild(img);
      } else {
        const chip = document.createElement('div');
        chip.className = 'file-chip';
        chip.innerHTML = '📄 ' + escapeHtml(attachment.filename);
        bubble.appendChild(chip);
      }
    }
    if (text) {
      const p = document.createElement('p');
      p.textContent = text;
      bubble.appendChild(p);
    }
    row.appendChild(bubble);
    msgs().appendChild(row);
    scrollToBottom();
  }

  function appendAIMessage(text) {
    hideWelcome();
    const row = document.createElement('div');
    row.className = 'message-row ai';

    const avatar = document.createElement('div');
    avatar.className = 'ai-avatar';
    avatar.textContent = 'D';

    const bubble = document.createElement('div');
    bubble.className = 'bubble';

    const content = document.createElement('div');
    content.className = 'ai-content';
    if (text) content.innerHTML = marked.parse(text);

    const copyBtn = document.createElement('button');
    copyBtn.className = 'copy-btn';
    copyBtn.innerHTML = '⎘ Copy';
    copyBtn.onclick = () => {
      navigator.clipboard.writeText(content.innerText).then(() => {
        copyBtn.textContent = '✓ Copied';
        copyBtn.classList.add('copied');
        setTimeout(() => { copyBtn.innerHTML = '⎘ Copy'; copyBtn.classList.remove('copied'); }, 2000);
      });
    };

    bubble.appendChild(content);
    bubble.appendChild(copyBtn);
    row.appendChild(avatar);
    row.appendChild(bubble);
    msgs().appendChild(row);
    scrollToBottom();
    return { row, content, copyBtn };
  }

  function showTypingIndicator() {
    const row = document.createElement('div');
    row.className = 'message-row ai'; row.id = 'typingRow';
    const avatar = document.createElement('div');
    avatar.className = 'ai-avatar'; avatar.textContent = 'D';
    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    bubble.innerHTML = '<div class="typing-indicator"><span></span><span></span><span></span></div>';
    row.appendChild(avatar); row.appendChild(bubble);
    msgs().appendChild(row);
    scrollToBottom();
  }

  function removeTypingIndicator() {
    const el = document.getElementById('typingRow');
    if (el) el.remove();
  }

  function typewriterEffect(el, fullText, onDone) {
    el.classList.add('typing-cursor');
    let i = 0;
    function type() {
      if (i < fullText.length) {
        el.innerHTML = marked.parse(fullText.slice(0, ++i));
        scrollToBottom();
        setTimeout(type, 10);
      } else {
        el.classList.remove('typing-cursor');
        if (onDone) onDone();
      }
    }
    type();
  }

  function scrollToBottom() {
    const m = msgs();
    m.scrollTop = m.scrollHeight;
  }

  function escapeHtml(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  return {
    hideWelcome, showWelcome, clearMessages,
    appendUserMessage, appendAIMessage,
    showTypingIndicator, removeTypingIndicator,
    typewriterEffect, scrollToBottom, escapeHtml,
  };
})();
