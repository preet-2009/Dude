/**
 * features.js — Advanced features implementation
 */

const Features = (() => {
  let currentStream = null;
  let recognition = null;
  let synthesis = window.speechSynthesis;
  let pendingFiles = [];

  // ─────────────────────────────────────────────
  // VOICE INPUT/OUTPUT
  // ─────────────────────────────────────────────
  function initVoice() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.warn('Speech recognition not supported');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      document.getElementById('messageInput').value = transcript;
      stopVoiceInput();
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      stopVoiceInput();
    };

    recognition.onend = () => {
      stopVoiceInput();
    };
  }

  function startVoiceInput() {
    if (!recognition) return;
    const micBtn = document.querySelector('.mic-btn');
    micBtn.classList.add('recording');
    
    // Show voice indicator
    const indicator = document.createElement('div');
    indicator.className = 'voice-indicator';
    indicator.id = 'voiceIndicator';
    indicator.innerHTML = `
      <div class="voice-wave">
        <span></span><span></span><span></span><span></span>
      </div>
      <span>Listening...</span>
    `;
    document.body.appendChild(indicator);
    
    recognition.start();
  }

  function stopVoiceInput() {
    if (!recognition) return;
    const micBtn = document.querySelector('.mic-btn');
    micBtn?.classList.remove('recording');
    
    const indicator = document.getElementById('voiceIndicator');
    if (indicator) indicator.remove();
    
    try {
      recognition.stop();
    } catch (e) {}
  }

  function speakText(text) {
    if (!synthesis) return;
    
    // Cancel any ongoing speech
    synthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    
    synthesis.speak(utterance);
  }

  // ─────────────────────────────────────────────
  // MESSAGE REACTIONS
  // ─────────────────────────────────────────────
  async function reactToMessage(messageId, reaction) {
    try {
      const res = await fetch(`/api/features/messages/${messageId}/reaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reaction }),
      });
      if (!res.ok) throw new Error('Failed to react');
      return true;
    } catch (err) {
      console.error('React error:', err);
      return false;
    }
  }

  // ─────────────────────────────────────────────
  // PIN MESSAGE
  // ─────────────────────────────────────────────
  async function pinMessage(messageId, pinned) {
    try {
      const res = await fetch(`/api/features/messages/${messageId}/pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pinned }),
      });
      if (!res.ok) throw new Error('Failed to pin');
      return true;
    } catch (err) {
      console.error('Pin error:', err);
      return false;
    }
  }

  async function loadPinnedMessages(sessionId) {
    try {
      const res = await fetch(`/api/features/sessions/${sessionId}/pinned`);
      if (!res.ok) return [];
      return await res.json();
    } catch (err) {
      console.error('Load pinned error:', err);
      return [];
    }
  }

  // ─────────────────────────────────────────────
  // EDIT MESSAGE
  // ─────────────────────────────────────────────
  async function editMessage(messageId, content) {
    try {
      const res = await fetch(`/api/features/messages/${messageId}/edit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error('Failed to edit');
      return true;
    } catch (err) {
      console.error('Edit error:', err);
      return false;
    }
  }

  // ─────────────────────────────────────────────
  // SEARCH IN CHAT
  // ─────────────────────────────────────────────
  async function searchInChat(sessionId, query) {
    try {
      const res = await fetch(`/api/features/sessions/${sessionId}/search?q=${encodeURIComponent(query)}`);
      if (!res.ok) return [];
      return await res.json();
    } catch (err) {
      console.error('Search error:', err);
      return [];
    }
  }

  // ─────────────────────────────────────────────
  // FOLDERS & TAGS
  // ─────────────────────────────────────────────
  async function setFolder(sessionId, folder) {
    try {
      const res = await fetch(`/api/features/sessions/${sessionId}/folder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder }),
      });
      return res.ok;
    } catch (err) {
      console.error('Set folder error:', err);
      return false;
    }
  }

  async function setTags(sessionId, tags) {
    try {
      const res = await fetch(`/api/features/sessions/${sessionId}/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags }),
      });
      return res.ok;
    } catch (err) {
      console.error('Set tags error:', err);
      return false;
    }
  }

  async function getFolders() {
    try {
      const res = await fetch('/api/features/folders');
      if (!res.ok) return [];
      return await res.json();
    } catch (err) {
      console.error('Get folders error:', err);
      return [];
    }
  }

  // ─────────────────────────────────────────────
  // SHARE CONVERSATION
  // ─────────────────────────────────────────────
  async function shareConversation(sessionId, expiresIn = null) {
    try {
      const res = await fetch(`/api/features/sessions/${sessionId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expiresIn }),
      });
      if (!res.ok) throw new Error('Failed to share');
      const data = await res.json();
      return window.location.origin + data.shareUrl;
    } catch (err) {
      console.error('Share error:', err);
      return null;
    }
  }

  // ─────────────────────────────────────────────
  // PRIVATE MODE & AUTO-DELETE
  // ─────────────────────────────────────────────
  async function setPrivateMode(sessionId, isPrivate) {
    try {
      const res = await fetch(`/api/features/sessions/${sessionId}/private`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPrivate }),
      });
      return res.ok;
    } catch (err) {
      console.error('Private mode error:', err);
      return false;
    }
  }

  async function setAutoDelete(sessionId, hours) {
    try {
      const res = await fetch(`/api/features/sessions/${sessionId}/auto-delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hours }),
      });
      return res.ok;
    } catch (err) {
      console.error('Auto-delete error:', err);
      return false;
    }
  }

  // ─────────────────────────────────────────────
  // PIN SESSION
  // ─────────────────────────────────────────────
  async function pinSession(sessionId, pinned) {
    try {
      const res = await fetch(`/api/features/sessions/${sessionId}/pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pinned }),
      });
      return res.ok;
    } catch (err) {
      console.error('Pin session error:', err);
      return false;
    }
  }

  // ─────────────────────────────────────────────
  // THEME TOGGLE
  // ─────────────────────────────────────────────
  async function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const newTheme = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    
    try {
      await fetch('/api/features/theme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: newTheme }),
      });
    } catch (err) {
      console.error('Theme save error:', err);
    }
  }

  async function loadTheme() {
    try {
      const res = await fetch('/api/features/theme');
      if (res.ok) {
        const { theme } = await res.json();
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
      }
    } catch (err) {
      const saved = localStorage.getItem('theme') || 'dark';
      document.documentElement.setAttribute('data-theme', saved);
    }
  }

  // ─────────────────────────────────────────────
  // EXPORT CHAT
  // ─────────────────────────────────────────────
  function exportChat(sessionId, format) {
    const url = `/api/export/sessions/${sessionId}/export/${format}`;
    window.open(url, '_blank');
  }

  async function exportChatPDF(sessionId) {
    try {
      const res = await fetch(`/api/export/sessions/${sessionId}/export/json`);
      if (!res.ok) throw new Error('Failed to fetch chat data');
      const data = await res.json();
      
      // Use jsPDF to generate PDF
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      
      doc.setFontSize(18);
      doc.text(data.title, 20, 20);
      
      doc.setFontSize(10);
      doc.text(`Exported: ${new Date(data.exportedAt).toLocaleString()}`, 20, 30);
      
      let y = 45;
      data.messages.forEach((msg, idx) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text(msg.role === 'user' ? 'You:' : 'DUDE:', 20, y);
        
        doc.setFont(undefined, 'normal');
        doc.setFontSize(10);
        const lines = doc.splitTextToSize(msg.content, 170);
        doc.text(lines, 20, y + 5);
        
        y += lines.length * 5 + 10;
      });
      
      doc.save(`chat-${sessionId}.pdf`);
    } catch (err) {
      console.error('PDF export error:', err);
      alert('Failed to export PDF');
    }
  }

  // ─────────────────────────────────────────────
  // STOP GENERATION
  // ─────────────────────────────────────────────
  function stopGeneration() {
    if (currentStream) {
      try {
        currentStream.cancel();
      } catch (e) {}
      currentStream = null;
    }
    
    const stopBtn = document.getElementById('stopGenerationBtn');
    if (stopBtn) stopBtn.remove();
    
    UI.removeTypingIndicator();
  }

  function setCurrentStream(stream) {
    currentStream = stream;
    
    // Show stop button
    if (!document.getElementById('stopGenerationBtn')) {
      const stopBtn = document.createElement('button');
      stopBtn.id = 'stopGenerationBtn';
      stopBtn.className = 'stop-btn';
      stopBtn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <rect x="6" y="6" width="12" height="12" rx="2"/>
        </svg>
        Stop Generating
      `;
      stopBtn.onclick = stopGeneration;
      document.body.appendChild(stopBtn);
    }
  }

  function clearCurrentStream() {
    currentStream = null;
    const stopBtn = document.getElementById('stopGenerationBtn');
    if (stopBtn) stopBtn.remove();
  }

  // ─────────────────────────────────────────────
  // MULTI-FILE UPLOAD
  // ─────────────────────────────────────────────
  function addFiles(files) {
    Array.from(files).forEach(file => {
      if (pendingFiles.length >= 5) {
        alert('Maximum 5 files allowed');
        return;
      }
      pendingFiles.push(file);
    });
    renderFilePreview();
  }

  function removeFile(index) {
    pendingFiles.splice(index, 1);
    renderFilePreview();
  }

  function renderFilePreview() {
    const container = document.getElementById('filePreviewList');
    if (!container) return;
    
    if (pendingFiles.length === 0) {
      container.style.display = 'none';
      return;
    }
    
    container.style.display = 'flex';
    container.innerHTML = pendingFiles.map((file, idx) => `
      <div class="file-preview-chip">
        <span>${UI.escapeHtml(file.name)}</span>
        <span class="remove" onclick="Features.removeFile(${idx})">✕</span>
      </div>
    `).join('');
  }

  async function uploadAllFiles() {
    const uploaded = [];
    for (const file of pendingFiles) {
      const result = await Chat.uploadFile(file);
      if (result) uploaded.push(result);
    }
    pendingFiles = [];
    renderFilePreview();
    return uploaded;
  }

  // ─────────────────────────────────────────────
  // KEYBOARD SHORTCUTS
  // ─────────────────────────────────────────────
  function initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Ctrl/Cmd + K: New chat
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        Sidebar.createNewChat();
      }
      
      // Ctrl/Cmd + /: Focus search
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        const searchInput = document.getElementById('searchInput');
        if (searchInput) searchInput.focus();
      }
      
      // Ctrl/Cmd + E: Export chat
      if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault();
        if (Sidebar.activeChatId) {
          exportChat(Sidebar.activeChatId, 'md');
        }
      }
      
      // Ctrl/Cmd + Shift + T: Toggle theme
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'T') {
        e.preventDefault();
        toggleTheme();
      }
      
      // Escape: Stop generation
      if (e.key === 'Escape' && currentStream) {
        e.preventDefault();
        stopGeneration();
      }
    });
  }

  // ─────────────────────────────────────────────
  // CONTEXT MEMORY
  // ─────────────────────────────────────────────
  async function saveContextMemory(key, value) {
    try {
      const res = await fetch('/api/features/preferences');
      if (!res.ok) return;
      const prefs = await res.json();
      
      const memory = prefs.context_memory || {};
      memory[key] = value;
      
      await fetch('/api/features/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context_memory: memory }),
      });
    } catch (err) {
      console.error('Save context error:', err);
    }
  }

  async function getContextMemory(key) {
    try {
      const res = await fetch('/api/features/preferences');
      if (!res.ok) return null;
      const prefs = await res.json();
      return prefs.context_memory?.[key] || null;
    } catch (err) {
      console.error('Get context error:', err);
      return null;
    }
  }

  // ─────────────────────────────────────────────
  // INITIALIZE
  // ─────────────────────────────────────────────
  // ─────────────────────────────────────────────
  // IMAGE GENERATION
  // ─────────────────────────────────────────────
  async function generateImage(prompt, model) {
    try {
      const res = await fetch('/api/ai/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, model }),
      });

      if (!res.ok) {
        const error = await res.json();
        if (error.retry) {
          // Model is loading, retry after 3 seconds
          await new Promise(resolve => setTimeout(resolve, 3000));
          return generateImage(prompt, model);
        }
        throw new Error(error.error || 'Failed to generate image');
      }

      return await res.json();
    } catch (err) {
      console.error('Image generation error:', err);
      throw err;
    }
  }

  async function getImageModels() {
    try {
      const res = await fetch('/api/ai/image-models');
      if (!res.ok) return [];
      return await res.json();
    } catch (err) {
      console.error('Get models error:', err);
      return [];
    }
  }

  // ─────────────────────────────────────────────
  // WEB SEARCH
  // ─────────────────────────────────────────────
  async function webSearch(query, num = 5) {
    try {
      const res = await fetch('/api/ai/web-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, num }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Search failed');
      }

      return await res.json();
    } catch (err) {
      console.error('Web search error:', err);
      throw err;
    }
  }

  async function searchAndSummarize(query) {
    try {
      const res = await fetch('/api/ai/search-and-summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Search failed');
      }

      return await res.json();
    } catch (err) {
      console.error('Search and summarize error:', err);
      throw err;
    }
  }

  // ─────────────────────────────────────────────
  // INITIALIZE
  // ─────────────────────────────────────────────
  function init() {
    initVoice();
    initKeyboardShortcuts();
    loadTheme();
  }

  return {
    init,
    startVoiceInput,
    stopVoiceInput,
    speakText,
    reactToMessage,
    pinMessage,
    loadPinnedMessages,
    editMessage,
    searchInChat,
    setFolder,
    setTags,
    getFolders,
    shareConversation,
    setPrivateMode,
    setAutoDelete,
    pinSession,
    toggleTheme,
    loadTheme,
    exportChat,
    exportChatPDF,
    stopGeneration,
    setCurrentStream,
    clearCurrentStream,
    addFiles,
    removeFile,
    uploadAllFiles,
    saveContextMemory,
    getContextMemory,
    generateImage,
    getImageModels,
    webSearch,
    searchAndSummarize,
  };
})();

// Expose globally
window.Features = Features;

// Initialize on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', Features.init);
} else {
  Features.init();
}
