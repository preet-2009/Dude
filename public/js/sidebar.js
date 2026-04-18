/**
 * Custom delete confirmation popup
 */
function showDeleteConfirm(onConfirm) {
  const overlay = document.getElementById('deleteConfirmOverlay');
  overlay.style.display = 'flex';

  const yes   = document.getElementById('deleteConfirmYes');
  const no    = document.getElementById('deleteConfirmClose');
  const cancel = document.getElementById('deleteConfirmNo');

  function close() { overlay.style.display = 'none'; }

  yes.onclick    = () => { close(); onConfirm(); };
  no.onclick     = close;
  cancel.onclick = close;
}
const Sidebar = (() => {
  let sessions = [];
  let _activeChatId = null;
  let folders = [];

  const chatListEl  = () => document.getElementById('chatList');

  async function loadSessions() {
    try {
      const res = await fetch('/api/chat/sessions');
      if (res.ok) sessions = await res.json();
      else sessions = [];
      console.log('Loaded sessions:', sessions);
      
      // Load folders
      const foldersRes = await fetch('/api/features/folders');
      if (foldersRes.ok) folders = await foldersRes.json();
    } catch (e) { 
      console.error('Failed to load sessions:', e);
      sessions = []; 
    }
  }

  function createNewChat() {
    const id = 'chat_' + Date.now();
    sessions.unshift({ id, title: 'New Chat', is_pinned: false, folder: null, tags: [] });
    _activeChatId = id;
    render();
    console.log('Created new chat:', id);
    return id;
  }

  function setActiveChat(id) {
    _activeChatId = id;
    const s = sessions.find(s => s.id === id);
    render();
    console.log('Set active chat:', id, s);
  }

  function getActiveSession() {
    return sessions.find(s => s.id === _activeChatId) || null;
  }

  function updateTitle(id, title) {
    const s = sessions.find(s => s.id === id);
    if (s) {
      s.title = title;
      render();
      console.log('Updated title for', id, ':', title);
    }
  }

  async function deleteChat(id) {
    try { await fetch('/api/chat/sessions/' + id, { method: 'DELETE' }); } catch {}
    sessions = sessions.filter(s => s.id !== id);
    if (_activeChatId === id) {
      if (sessions.length > 0) {
        setActiveChat(sessions[0].id);
        Chat.loadSession(sessions[0].id);
      } else {
        _activeChatId = null;
        UI.clearMessages();
      }
    }
    render();
  }

  async function pinChat(id) {
    const s = sessions.find(s => s.id === id);
    if (!s) return;
    
    const newPinned = !s.is_pinned;
    await Features.pinSession(id, newPinned);
    s.is_pinned = newPinned;
    render();
    window.showToast(newPinned ? '📌 Chat pinned' : 'Chat unpinned');
  }

  async function moveToFolder(id, folder) {
    const s = sessions.find(s => s.id === id);
    if (!s) return;
    
    await Features.setFolder(id, folder);
    s.folder = folder;
    render();
    window.showToast(`Moved to ${folder || 'root'}`);
  }

  async function exportChat(id, format) {
    if (format === 'pdf') {
      await Features.exportChatPDF(id);
    } else {
      Features.exportChat(id, format);
    }
  }

  async function shareChat(id) {
    const url = await Features.shareConversation(id, 24); // 24 hours expiry
    if (url) {
      navigator.clipboard.writeText(url);
      window.showToast('📋 Share link copied!');
    }
  }

  function render() {
    const el = chatListEl();
    if (!el) return;
    el.innerHTML = '';
    
    if (sessions.length === 0) {
      el.innerHTML = '<p class="no-chats">No conversations yet</p>';
      return;
    }

    // Group by pinned and folders
    const pinned = sessions.filter(s => s.is_pinned);
    const unpinned = sessions.filter(s => !s.is_pinned);
    
    // Render pinned first
    if (pinned.length > 0) {
      const pinnedHeader = document.createElement('div');
      pinnedHeader.className = 'chat-list-label';
      pinnedHeader.textContent = '📌 Pinned';
      el.appendChild(pinnedHeader);
      
      pinned.forEach(s => renderChatItem(s, el));
    }

    // Group unpinned by folder
    const folderGroups = {};
    unpinned.forEach(s => {
      const folder = s.folder || 'root';
      if (!folderGroups[folder]) folderGroups[folder] = [];
      folderGroups[folder].push(s);
    });

    Object.keys(folderGroups).forEach(folder => {
      if (folder !== 'root') {
        const folderSection = document.createElement('div');
        folderSection.className = 'folder-section';
        
        const folderHeader = document.createElement('div');
        folderHeader.className = 'folder-header';
        folderHeader.innerHTML = `
          <div class="folder-name">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            </svg>
            ${UI.escapeHtml(folder)}
          </div>
          <span class="folder-count">${folderGroups[folder].length}</span>
        `;
        
        const folderItems = document.createElement('div');
        folderItems.className = 'folder-items';
        folderGroups[folder].forEach(s => renderChatItem(s, folderItems));
        
        folderSection.appendChild(folderHeader);
        folderSection.appendChild(folderItems);
        el.appendChild(folderSection);
      } else {
        folderGroups[folder].forEach(s => renderChatItem(s, el));
      }
    });
  }

  function renderChatItem(s, container) {
    const item = document.createElement('div');
    item.className = 'chat-item' + (s.id === _activeChatId ? ' active' : '');

    const icon = document.createElement('span');
    icon.className = 'chat-item-icon';
    icon.textContent = s.is_private ? '🔒' : '💬';

    const title = document.createElement('span');
    title.className = 'chat-item-title';
    title.textContent = s.title;

    // Context menu button
    const menuBtn = document.createElement('button');
    menuBtn.className = 'chat-item-delete';
    menuBtn.innerHTML = '⋮';
    menuBtn.title = 'Options';
    menuBtn.onclick = (e) => { 
      e.stopPropagation(); 
      showChatMenu(s, e.target);
    };

    item.appendChild(icon);
    item.appendChild(title);
    item.appendChild(menuBtn);
    item.onclick = () => { 
      if (s.id !== _activeChatId) { 
        setActiveChat(s.id); 
        Chat.loadSession(s.id); 
      } 
    };
    container.appendChild(item);
  }

  function showChatMenu(session, anchor) {
    // Remove existing menu
    const existing = document.querySelector('.chat-context-menu');
    if (existing) existing.remove();

    const menu = document.createElement('div');
    menu.className = 'export-menu chat-context-menu';
    menu.style.position = 'fixed';
    
    const rect = anchor.getBoundingClientRect();
    menu.style.top = rect.bottom + 'px';
    menu.style.left = rect.left + 'px';

    menu.innerHTML = `
      <div class="export-item" data-action="pin">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/>
        </svg>
        ${session.is_pinned ? 'Unpin' : 'Pin'}
      </div>
      <div class="export-item" data-action="share">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
        </svg>
        Share
      </div>
      <div class="export-item" data-action="export">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        Export
      </div>
      <div class="export-item" data-action="delete" style="color:#ff5555">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
        </svg>
        Delete
      </div>
    `;

    document.body.appendChild(menu);

    menu.querySelectorAll('.export-item').forEach(item => {
      item.onclick = async () => {
        const action = item.dataset.action;
        menu.remove();

        switch (action) {
          case 'pin':
            await pinChat(session.id);
            break;
          case 'share':
            await shareChat(session.id);
            break;
          case 'export':
            showExportMenu(session.id, item);
            break;
          case 'delete':
            showDeleteConfirm(() => deleteChat(session.id));
            break;
        }
      };
    });

    // Close menu when clicking outside
    setTimeout(() => {
      document.addEventListener('click', function closeMenu() {
        menu.remove();
        document.removeEventListener('click', closeMenu);
      });
    }, 0);
  }

  function showExportMenu(sessionId, anchor) {
    const menu = document.createElement('div');
    menu.className = 'export-menu';
    menu.style.position = 'fixed';
    
    const rect = anchor.getBoundingClientRect();
    menu.style.top = rect.top + 'px';
    menu.style.left = (rect.left - 150) + 'px';

    menu.innerHTML = `
      <div class="export-item" data-format="txt">📄 Text (.txt)</div>
      <div class="export-item" data-format="md">📝 Markdown (.md)</div>
      <div class="export-item" data-format="pdf">📕 PDF (.pdf)</div>
    `;

    document.body.appendChild(menu);

    menu.querySelectorAll('.export-item').forEach(item => {
      item.onclick = () => {
        const format = item.dataset.format;
        exportChat(sessionId, format);
        menu.remove();
      };
    });

    setTimeout(() => {
      document.addEventListener('click', function closeMenu() {
        menu.remove();
        document.removeEventListener('click', closeMenu);
      });
    }, 0);
  }

  async function init() {
    await loadSessions();
    if (sessions.length > 0) {
      _activeChatId = sessions[0].id;
    } else {
      createNewChat();
    }
    render();
  }

  return {
    init, createNewChat, setActiveChat,
    getActiveSession, updateTitle, deleteChat, render,
    pinChat, moveToFolder, exportChat, shareChat,
    get activeChatId() { return _activeChatId; },
  };
})();
