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

  function appendAIMessage(text, messageId) {
    hideWelcome();
    const row = document.createElement('div');
    row.className = 'message-row ai';
    if (messageId) row.dataset.messageId = messageId;

    const avatar = document.createElement('div');
    avatar.className = 'ai-avatar';
    avatar.textContent = 'D';

    const bubble = document.createElement('div');
    bubble.className = 'bubble';

    const content = document.createElement('div');
    content.className = 'ai-content';
    if (text) content.innerHTML = enhanceCodeBlocks(marked.parse(text));

    // Message actions
    const actions = document.createElement('div');
    actions.className = 'message-actions';
    actions.innerHTML = `
      <button class="action-btn copy-btn-action" title="Copy">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
        </svg>
        Copy
      </button>
      <button class="action-btn regenerate-btn" title="Regenerate">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="23 4 23 10 17 10"/>
          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
        </svg>
        Regenerate
      </button>
      <button class="action-btn like-btn" title="Like" data-reaction="like">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
        </svg>
      </button>
      <button class="action-btn dislike-btn" title="Dislike" data-reaction="dislike">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/>
        </svg>
      </button>
      <button class="action-btn pin-btn" title="Pin message">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 17v5"/>
          <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/>
        </svg>
      </button>
      <button class="action-btn speak-btn" title="Speak">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
        </svg>
      </button>
    `;

    bubble.appendChild(content);
    bubble.appendChild(actions);
    row.appendChild(avatar);
    row.appendChild(bubble);
    msgs().appendChild(row);

    // Add event listeners
    const copyBtn = actions.querySelector('.copy-btn-action');
    copyBtn.onclick = () => {
      navigator.clipboard.writeText(content.innerText).then(() => {
        copyBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Copied';
        copyBtn.classList.add('active');
        setTimeout(() => {
          copyBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy';
          copyBtn.classList.remove('active');
        }, 2000);
      });
    };

    const regenerateBtn = actions.querySelector('.regenerate-btn');
    regenerateBtn.onclick = () => {
      if (window.regenerateLastResponse) window.regenerateLastResponse();
    };

    const likeBtn = actions.querySelector('.like-btn');
    const dislikeBtn = actions.querySelector('.dislike-btn');
    
    likeBtn.onclick = async () => {
      if (messageId) {
        const isActive = likeBtn.classList.contains('active');
        await Features.reactToMessage(messageId, isActive ? null : 'like');
        likeBtn.classList.toggle('active');
        dislikeBtn.classList.remove('active');
      }
    };

    dislikeBtn.onclick = async () => {
      if (messageId) {
        const isActive = dislikeBtn.classList.contains('active');
        await Features.reactToMessage(messageId, isActive ? null : 'dislike');
        dislikeBtn.classList.toggle('active');
        likeBtn.classList.remove('active');
      }
    };

    const pinBtn = actions.querySelector('.pin-btn');
    pinBtn.onclick = async () => {
      if (messageId) {
        const isPinned = pinBtn.classList.contains('active');
        await Features.pinMessage(messageId, !isPinned);
        pinBtn.classList.toggle('active');
        window.showToast(isPinned ? 'Message unpinned' : '📌 Message pinned');
      }
    };

    const speakBtn = actions.querySelector('.speak-btn');
    speakBtn.onclick = () => {
      Features.speakText(content.innerText);
    };

    scrollToBottom();
    return { row, content, actions };
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

  function enhanceCodeBlocks(html) {
    // Add syntax highlighting and copy buttons to code blocks
    const temp = document.createElement('div');
    temp.innerHTML = html;
    
    temp.querySelectorAll('pre code').forEach((block) => {
      // Detect language
      const className = block.className;
      const language = className.replace('language-', '') || 'plaintext';
      
      // Apply syntax highlighting
      if (window.hljs) {
        try {
          const highlighted = hljs.highlightAuto(block.textContent, [language]);
          block.innerHTML = highlighted.value;
          block.classList.add('hljs');
        } catch (e) {
          console.error('Highlight error:', e);
        }
      }
      
      // Wrap in code block with header
      const wrapper = document.createElement('div');
      wrapper.className = 'code-block-wrapper';
      
      const header = document.createElement('div');
      header.className = 'code-header';
      header.innerHTML = `
        <span class="code-language">${language}</span>
        <button class="code-copy-btn" onclick="UI.copyCode(this)">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
          </svg>
          Copy
        </button>
      `;
      
      const pre = block.parentElement;
      wrapper.appendChild(header);
      wrapper.appendChild(pre.cloneNode(true));
      pre.replaceWith(wrapper);
    });
    
    return temp.innerHTML;
  }

  function copyCode(btn) {
    const wrapper = btn.closest('.code-block-wrapper');
    const code = wrapper.querySelector('code');
    navigator.clipboard.writeText(code.textContent).then(() => {
      btn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Copied';
      btn.classList.add('copied');
      setTimeout(() => {
        btn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy';
        btn.classList.remove('copied');
      }, 2000);
    });
  }

  return {
    hideWelcome, showWelcome, clearMessages,
    appendUserMessage, appendAIMessage,
    showTypingIndicator, removeTypingIndicator,
    typewriterEffect, scrollToBottom, escapeHtml,
    enhanceCodeBlocks, copyCode,
  };
})();
