let currentView = 'users';
let currentUserId = null;
let currentSessionId = null;

// Check if user is admin
async function checkAdmin() {
  try {
    const res = await fetch('/auth/me');
    const data = await res.json();
    if (!data.user || !data.user.isOwner) {
      alert('Access denied. Admin only.');
      window.location.href = '/';
      return false;
    }
    return true;
  } catch (err) {
    console.error('Auth check failed:', err);
    window.location.href = '/login';
    return false;
  }
}

// Load dashboard stats
async function loadStats() {
  try {
    const res = await fetch('/api/admin/stats');
    const data = await res.json();
    
    if (data.stats) {
      document.getElementById('totalUsers').textContent = data.stats.total_users || 0;
      document.getElementById('totalChats').textContent = data.stats.total_chats || 0;
      document.getElementById('totalMessages').textContent = data.stats.total_messages || 0;
      document.getElementById('messagesToday').textContent = data.stats.messages_today || 0;
      document.getElementById('activeUsers').textContent = data.stats.active_users_week || 0;
    }
  } catch (err) {
    console.error('Failed to load stats:', err);
  }
}

// Load all users
async function loadUsers() {
  const contentArea = document.getElementById('contentArea');
  contentArea.innerHTML = '<div class="loading">Loading users...</div>';

  try {
    const res = await fetch('/api/admin/users');
    const data = await res.json();

    if (data.users && data.users.length > 0) {
      contentArea.innerHTML = `
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Credits</th>
              <th>Chats</th>
              <th>Messages</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${data.users.map(user => `
              <tr>
                <td>${escapeHtml(user.name || 'N/A')}</td>
                <td>${escapeHtml(user.email)}</td>
                <td>${user.credits || 0}</td>
                <td>${user.total_chats || 0}</td>
                <td>${user.total_messages || 0}</td>
                <td>${new Date(user.created_at).toLocaleDateString()}</td>
                <td>
                  <button class="btn btn-primary" onclick="viewUserChats(${user.id}, '${escapeHtml(user.name)}')">
                    View Chats
                  </button>
                  <button class="btn btn-danger" onclick="deleteUser(${user.id}, '${escapeHtml(user.email)}')">
                    Delete
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } else {
      contentArea.innerHTML = '<div class="empty">No users found</div>';
    }
  } catch (err) {
    console.error('Failed to load users:', err);
    contentArea.innerHTML = '<div class="error">Failed to load users</div>';
  }
}

// View user's chats
async function viewUserChats(userId, userName) {
  currentUserId = userId;
  const contentArea = document.getElementById('contentArea');
  contentArea.innerHTML = '<div class="loading">Loading chats...</div>';

  try {
    const res = await fetch(`/api/admin/users/${userId}/chats`);
    const data = await res.json();

    if (data.chats && data.chats.length > 0) {
      contentArea.innerHTML = `
        <button class="btn btn-back" onclick="loadUsers()">← Back to Users</button>
        <h2 style="margin-bottom: 20px;">Chats by ${escapeHtml(userName)}</h2>
        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Messages</th>
              <th>Folder</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${data.chats.map(chat => `
              <tr>
                <td>${escapeHtml(chat.title)}</td>
                <td>${chat.message_count || 0}</td>
                <td>${chat.folder ? escapeHtml(chat.folder) : '-'}</td>
                <td>${new Date(chat.created_at).toLocaleString()}</td>
                <td>
                  <button class="btn btn-primary" onclick="viewChatMessages('${chat.id}', '${escapeHtml(chat.title)}')">
                    View Messages
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } else {
      contentArea.innerHTML = `
        <button class="btn btn-back" onclick="loadUsers()">← Back to Users</button>
        <div class="empty">No chats found for this user</div>
      `;
    }
  } catch (err) {
    console.error('Failed to load chats:', err);
    contentArea.innerHTML = '<div class="error">Failed to load chats</div>';
  }
}

// View chat messages
async function viewChatMessages(sessionId, chatTitle) {
  currentSessionId = sessionId;
  const contentArea = document.getElementById('contentArea');
  contentArea.innerHTML = '<div class="loading">Loading messages...</div>';

  try {
    const res = await fetch(`/api/admin/chats/${sessionId}/messages`);
    const data = await res.json();

    if (data.messages && data.messages.length > 0) {
      contentArea.innerHTML = `
        <button class="btn btn-back" onclick="viewUserChats(${currentUserId}, 'User')">← Back to Chats</button>
        <h2 style="margin-bottom: 10px;">${escapeHtml(chatTitle)}</h2>
        <p style="color: #666; margin-bottom: 20px;">
          User: ${escapeHtml(data.session.name)} (${escapeHtml(data.session.email)}) | 
          Created: ${new Date(data.session.created_at).toLocaleString()}
        </p>
        ${data.messages.map(msg => `
          <div class="message-box ${msg.role}">
            <div class="message-header">
              <span><strong>${msg.role === 'user' ? '👤 User' : '🤖 Assistant'}</strong></span>
              <span>${new Date(msg.created_at).toLocaleString()}</span>
            </div>
            <div class="message-content">${escapeHtml(msg.content)}</div>
          </div>
        `).join('')}
      `;
    } else {
      contentArea.innerHTML = `
        <button class="btn btn-back" onclick="viewUserChats(${currentUserId}, 'User')">← Back to Chats</button>
        <div class="empty">No messages found in this chat</div>
      `;
    }
  } catch (err) {
    console.error('Failed to load messages:', err);
    contentArea.innerHTML = '<div class="error">Failed to load messages</div>';
  }
}

// Search messages
let searchTimeout;
function handleSearch(event) {
  clearTimeout(searchTimeout);
  const query = event.target.value.trim();
  
  if (query.length < 3) return;

  searchTimeout = setTimeout(() => {
    searchMessages(query);
  }, 500);
}

async function searchMessages(query) {
  showTab('search');
  const contentArea = document.getElementById('contentArea');
  contentArea.innerHTML = '<div class="loading">Searching...</div>';

  try {
    const res = await fetch(`/api/admin/search?query=${encodeURIComponent(query)}`);
    const data = await res.json();

    if (data.results && data.results.length > 0) {
      contentArea.innerHTML = `
        <h2 style="margin-bottom: 20px;">Search Results for "${escapeHtml(query)}"</h2>
        ${data.results.map(result => `
          <div class="message-box ${result.role}">
            <div class="message-header">
              <span>
                <strong>${result.role === 'user' ? '👤 User' : '🤖 Assistant'}</strong> | 
                ${escapeHtml(result.name)} (${escapeHtml(result.email)}) | 
                Chat: ${escapeHtml(result.chat_title)}
              </span>
              <span>${new Date(result.created_at).toLocaleString()}</span>
            </div>
            <div class="message-content">${highlightText(escapeHtml(result.content), query)}</div>
          </div>
        `).join('')}
      `;
    } else {
      contentArea.innerHTML = `<div class="empty">No results found for "${escapeHtml(query)}"</div>`;
    }
  } catch (err) {
    console.error('Search failed:', err);
    contentArea.innerHTML = '<div class="error">Search failed</div>';
  }
}

// Delete user
async function deleteUser(userId, email) {
  if (!confirm(`Are you sure you want to delete user ${email}? This will delete all their chats and messages.`)) {
    return;
  }

  try {
    const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
    const data = await res.json();
    
    if (data.success) {
      alert('User deleted successfully');
      loadUsers();
      loadStats();
    } else {
      alert('Failed to delete user');
    }
  } catch (err) {
    console.error('Delete failed:', err);
    alert('Failed to delete user');
  }
}

// Show tab
function showTab(tab) {
  currentView = tab;
  
  // Update tab buttons
  document.querySelectorAll('.tab').forEach(btn => {
    btn.classList.remove('active');
  });
  event.target.classList.add('active');

  // Load content
  if (tab === 'users') {
    loadUsers();
  } else if (tab === 'search') {
    document.getElementById('contentArea').innerHTML = '<div class="empty">Enter a search query above</div>';
  }
}

// Logout
async function logout() {
  try {
    await fetch('/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  } catch (err) {
    console.error('Logout failed:', err);
  }
}

// Utility functions
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function highlightText(text, query) {
  const regex = new RegExp(`(${query})`, 'gi');
  return text.replace(regex, '<mark style="background: yellow;">$1</mark>');
}

// Initialize
(async function init() {
  const isAdmin = await checkAdmin();
  if (isAdmin) {
    loadStats();
    loadUsers();
    
    // Refresh stats every 30 seconds
    setInterval(loadStats, 30000);
  }
})();
