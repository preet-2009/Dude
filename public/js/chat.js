/**
 * chat.js — Streaming message sending & session loading
 */
const Chat = (() => {
  let pendingAttachment = null;
  let isLoading = false;
  let lastUserMessage = null;
  let currentReader = null;

  async function sendMessage(userText, isRegenerate = false) {
    if (isLoading) return;
    const text = (userText || '').trim();
    const attachment = pendingAttachment;
    if (!text && !attachment && !isRegenerate) return;

    // Check for special commands
    if (text.startsWith('/image ')) {
      const prompt = text.substring(7).trim();
      if (!prompt) {
        showError('Please provide an image prompt after /image');
        return;
      }
      await handleImageGeneration(prompt);
      return;
    }

    if (text.startsWith('/search ')) {
      const query = text.substring(8).trim();
      if (!query) {
        showError('Please provide a search query after /search');
        return;
      }
      await handleWebSearch(query);
      return;
    }

    // Close history sidebar when starting to chat
    const historySidebar = document.getElementById('historySidebar');
    const historyOverlay = document.getElementById('historyOverlay');
    if (historySidebar && historySidebar.classList.contains('open')) {
      historySidebar.classList.remove('open');
      if (historyOverlay) historyOverlay.classList.remove('show');
    }

    let sessionId = Sidebar.activeChatId;
    if (!sessionId) sessionId = Sidebar.createNewChat();

    if (!isRegenerate) {
      lastUserMessage = { text, attachment };
      pendingAttachment = null;
      clearFilePreview();
      UI.appendUserMessage(text, attachment);
    }

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
      currentReader = reader;
      if (window.Features && window.Features.setCurrentStream) {
        window.Features.setCurrentStream(reader);
      }
      
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
              // Render markdown progressively with code highlighting
              content.innerHTML = UI.enhanceCodeBlocks(marked.parse(fullText));
              UI.scrollToBottom();
            }

            if (parsed.done) {
              content.classList.remove('typing-cursor');
              if (parsed.credits !== undefined && window.updateCreditsUI) {
                window.updateCreditsUI(parsed.credits);
              }
              // Auto-title sidebar and save session
              const title = text.slice(0, 45) + (text.length > 45 ? '…' : '');
              Sidebar.updateTitle(sessionId, title || 'New Chat');
              
              // Reload sidebar to show updated chat in history
              setTimeout(() => {
                Sidebar.render();
              }, 100);
            }
          } catch {}
        }
      }

      content.classList.remove('typing-cursor');
      currentReader = null;
      if (window.Features && window.Features.clearCurrentStream) {
        window.Features.clearCurrentStream();
      }

    } catch (err) {
      UI.removeTypingIndicator();
      if (err.name === 'AbortError') {
        showError('Generation stopped');
      } else {
        showError('Network error — is the server running?');
        console.error(err);
      }
    } finally {
      isLoading = false;
      setInputDisabled(false);
      currentReader = null;
      if (window.Features && window.Features.clearCurrentStream) {
        window.Features.clearCurrentStream();
      }
    }
  }

  function regenerateLastResponse() {
    if (!lastUserMessage) {
      window.showToast('No message to regenerate');
      return;
    }
    
    // Remove last AI message
    const messages = document.querySelectorAll('.message-row.ai');
    if (messages.length > 0) {
      messages[messages.length - 1].remove();
    }
    
    sendMessage(lastUserMessage.text, true);
  }

  // Handle image generation command
  async function handleImageGeneration(prompt) {
    UI.appendUserMessage(`/image ${prompt}`);
    
    // Show custom image generation loading animation
    const { messageDiv, content } = UI.appendAIMessage();
    content.innerHTML = `
      <div class="image-generating">
        <div class="image-gen-spinner">
          <div class="spinner-ring"></div>
          <div class="spinner-ring"></div>
          <div class="spinner-ring"></div>
          <svg class="spinner-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
          </svg>
        </div>
        <p class="image-gen-text">
          <span class="gen-text-animated">Generating your image with DALL-E 3</span>
          <span class="gen-dots">
            <span>.</span><span>.</span><span>.</span>
          </span>
        </p>
        <p class="image-gen-subtext">This may take 10-15 seconds</p>
      </div>
    `;
    
    isLoading = true;
    setInputDisabled(true);

    try {
      if (!window.Features || !window.Features.generateImage) {
        throw new Error('Image generation not available');
      }
      
      const result = await window.Features.generateImage(prompt);
      
      // Replace loading animation with the generated image
      content.innerHTML = `
        <div class="generated-image-container">
          <p style="margin-bottom: 12px; color: var(--text2);">
            <strong>✨ Generated Image</strong>
          </p>
          <img src="${result.imageUrl}" 
               class="chat-image generated-image" 
               alt="Generated: ${UI.escapeHtml(prompt)}" 
               style="max-width: 100%; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); cursor: pointer;"
               onclick="window.open(this.src, '_blank')"
          />
          ${result.revisedPrompt ? `
            <p style="margin-top: 8px; font-size: 12px; color: var(--text3); font-style: italic;">
              Enhanced prompt: ${UI.escapeHtml(result.revisedPrompt)}
            </p>
          ` : ''}
          <p style="margin-top: 8px; font-size: 11px; color: var(--text3);">
            Model: ${result.model || 'DALL-E 3'} • Click image to view full size
          </p>
        </div>
      `;
      
      window.showToast('✓ Image generated successfully!');
    } catch (err) {
      content.innerHTML = `<p style="color: var(--error);">❌ Failed to generate image: ${UI.escapeHtml(err.message)}</p>`;
      showError('Failed to generate image: ' + err.message);
    } finally {
      isLoading = false;
      setInputDisabled(false);
    }
  }

  // Handle web search command
  async function handleWebSearch(query) {
    UI.appendUserMessage(`/search ${query}`);
    UI.showTypingIndicator();
    isLoading = true;
    setInputDisabled(true);

    try {
      if (!window.Features || !window.Features.searchAndSummarize) {
        throw new Error('Web search not available');
      }
      
      const result = await window.Features.searchAndSummarize(query);
      UI.removeTypingIndicator();
      
      // Format search results
      let resultHtml = `<div style="margin-bottom:12px"><strong>Search Results for:</strong> ${UI.escapeHtml(query)}</div>`;
      resultHtml += `<div style="background:var(--bg3);padding:12px;border-radius:8px;margin-bottom:12px">`;
      resultHtml += marked.parse(result.summary);
      resultHtml += `</div>`;
      resultHtml += `<div style="font-size:12px;color:var(--text3);margin-top:8px"><strong>Sources:</strong></div>`;
      
      result.sources.forEach((source, idx) => {
        resultHtml += `<div style="font-size:12px;margin-top:4px">`;
        resultHtml += `[${idx + 1}] <a href="${source.link}" target="_blank" style="color:var(--accent)">${UI.escapeHtml(source.title)}</a>`;
        resultHtml += `</div>`;
      });
      
      const { content } = UI.appendAIMessage();
      content.innerHTML = resultHtml;
      
      window.showToast('✓ Search completed!');
    } catch (err) {
      UI.removeTypingIndicator();
      showError('Search failed: ' + err.message);
    } finally {
      isLoading = false;
      setInputDisabled(false);
    }
  }

  // Expose regenerate function globally
  window.regenerateLastResponse = regenerateLastResponse;

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

  return { sendMessage, uploadFile, loadSession, clearFilePreview, regenerateLastResponse };
})();
