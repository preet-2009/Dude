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

  const chatListEl  = () => document.getElementById('chatList');

  async function loadSessions() {
    try {
      const res = await fetch('/api/chat/sessions');
      if (res.ok) sessions = await res.json();
      else sessions = [];
      console.log('Loaded sessions:', sessions);
    } catch (e) { 
      console.error('Failed to load sessions:', e);
      sessions = []; 
    }
  }

  function createNewChat() {
    const id = 'chat_' + Date.now();
    sessions.unshift({ id, title: 'New Chat' });
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

  function render() {
    const el = chatListEl();
    if (!el) return;
    el.innerHTML = '';
    if (sessions.length === 0) {
      el.innerHTML = '<p class="no-chats">No conversations yet</p>';
      return;
    }
    sessions.forEach(s => {
      const item = document.createElement('div');
      item.className = 'chat-item' + (s.id === _activeChatId ? ' active' : '');

      const icon = document.createElement('span');
      icon.className = 'chat-item-icon';
      icon.textContent = '💬';

      const title = document.createElement('span');
      title.className = 'chat-item-title';
      title.textContent = s.title;

      const del = document.createElement('button');
      del.className = 'chat-item-delete';
      del.innerHTML = '🗑';
      del.title = 'Delete';
      del.onclick = (e) => { e.stopPropagation(); showDeleteConfirm(() => deleteChat(s.id)); };

      item.appendChild(icon);
      item.appendChild(title);
      item.appendChild(del);
      item.onclick = () => { if (s.id !== _activeChatId) { setActiveChat(s.id); Chat.loadSession(s.id); } };
      el.appendChild(item);
    });
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
    get activeChatId() { return _activeChatId; },
  };
})();
