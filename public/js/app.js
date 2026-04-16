document.addEventListener('DOMContentLoaded', async () => {

  // ── Auth check & load user ─────────────────
  let currentCredits = 0;
  let isOwner = false;
  try {
    const res = await fetch('/auth/me');
    if (!res.ok) { location.href = '/login'; return; }
    const { user } = await res.json();

    document.getElementById('userName').textContent = user.name || 'User';

    const initial = (user.name || 'U')[0].toUpperCase();
    const html = user.avatar ? `<img src="${user.avatar}" alt="avatar"/>` : initial;
    document.getElementById('userAvatar').innerHTML = html;

    // Expose name globally for use in chat.js
    window._userName = user.name || 'buddy';

    // Personalize welcome screen with first name
    const firstName = (user.name || 'there').split(' ')[0];
    const welcomeUserName = document.getElementById('welcomeUserName');
    if (welcomeUserName) welcomeUserName.textContent = firstName;

    currentCredits = user.credits ?? 200;
    isOwner = user.isOwner || false;
    updateCreditsUI(currentCredits, isOwner);

    if (isOwner) {
      const nameEl = document.getElementById('userName');
      nameEl.innerHTML = `${user.name || 'Owner'} <span class="owner-badge">👑</span>`;
    }
  } catch {
    location.href = '/login';
    return;
  }

  // ── Credits UI ─────────────────────────────
  function updateCreditsUI(n, owner) {
    currentCredits = n;
    isOwner = owner;
    const countSmall = document.getElementById('creditsCountSmall');
    const countTop = document.getElementById('creditsCountTop');
    const displayValue = owner ? '∞' : n;
    if (countSmall) countSmall.textContent = displayValue;
    if (countTop) countTop.textContent = displayValue;
  }

  // Expose so chat.js can call it
  window.updateCreditsUI = updateCreditsUI;
  window.getCurrentCredits = () => currentCredits;
  window.showNoCredits = () => {
    document.getElementById('noCreditsOverlay').style.display = 'flex';
  };

  // ── Init sidebar — always start fresh new chat on load ──
  await Sidebar.init();
  Sidebar.createNewChat();
  UI.clearMessages();

  // ── Send ───────────────────────────────────
  const input   = document.getElementById('messageInput');
  const sendBtn = document.getElementById('sendBtn');

  function doSend() {
    const text = input.value.trim();
    if (!text) return;
    Chat.sendMessage(text);
    input.value = '';
    input.style.height = 'auto';
  }

  sendBtn.addEventListener('click', doSend);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { 
      e.preventDefault(); 
      doSend(); 
    }
  });
  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 200) + 'px';
  });

  // ── File upload ────────────────────────────
  const fileInput = document.getElementById('fileInput');
  const addBtn = document.querySelector('.add-btn');
  if (addBtn) {
    addBtn.addEventListener('click', () => fileInput.click());
  }
  fileInput.addEventListener('change', (e) => {
    if (e.target.files[0]) Chat.uploadFile(e.target.files[0]);
  });
  const removeFileBtn = document.getElementById('removeFileBtn');
  if (removeFileBtn) {
    removeFileBtn.addEventListener('click', () => Chat.clearFilePreview());
  }

  // ── New chat ───────────────────────────────
  document.getElementById('newChatBtn').addEventListener('click', () => {
    Sidebar.createNewChat();
    UI.clearMessages();
    Chat.clearFilePreview();
    input.value = '';
    if (window.innerWidth <= 640) document.getElementById('sidebar').classList.remove('open');
  });

  // ── Settings ───────────────────────────────
  const settingsScreen = document.getElementById('settingsScreen');
  const messagesDiv = document.getElementById('messages');
  const welcomeDiv = document.getElementById('welcome');
  
  document.getElementById('settingsBtn').addEventListener('click', () => {
    settingsScreen.style.display = 'block';
    messagesDiv.style.display = 'none';
    if (welcomeDiv) welcomeDiv.style.display = 'none';
  });

  document.getElementById('historyBtn').addEventListener('click', () => {
    settingsScreen.style.display = 'none';
    messagesDiv.style.display = 'block';
    if (welcomeDiv && messagesDiv.querySelectorAll('.message-row').length === 0) {
      welcomeDiv.style.display = 'flex';
    }
  });

  document.getElementById('closeSettingsBtn').addEventListener('click', () => {
    settingsScreen.style.display = 'none';
    messagesDiv.style.display = 'block';
    if (welcomeDiv && messagesDiv.querySelectorAll('.message-row').length === 0) {
      welcomeDiv.style.display = 'flex';
    }
  });

  // Settings functionality
  const themeSelect = document.getElementById('themeSelect');
  const savedTheme = localStorage.getItem('theme') || 'dark';
  themeSelect.value = savedTheme;
  document.documentElement.setAttribute('data-theme', savedTheme);
  
  themeSelect.addEventListener('change', (e) => {
    const theme = e.target.value;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  });

  // Font size
  const fontSizeSelect = document.getElementById('fontSizeSelect');
  const savedFontSize = localStorage.getItem('fontSize') || 'medium';
  fontSizeSelect.value = savedFontSize;
  document.body.setAttribute('data-font-size', savedFontSize);
  
  fontSizeSelect.addEventListener('change', (e) => {
    const size = e.target.value;
    document.body.setAttribute('data-font-size', size);
    localStorage.setItem('fontSize', size);
  });

  // Chat style
  const chatStyleSelect = document.getElementById('chatStyleSelect');
  const savedChatStyle = localStorage.getItem('chatStyle') || 'default';
  chatStyleSelect.value = savedChatStyle;
  document.body.setAttribute('data-chat-style', savedChatStyle);
  
  chatStyleSelect.addEventListener('change', (e) => {
    const style = e.target.value;
    document.body.setAttribute('data-chat-style', style);
    localStorage.setItem('chatStyle', style);
  });

  // Reset chat
  document.getElementById('resetChatBtn').addEventListener('click', async () => {
    if (confirm('Are you sure you want to delete all conversations? This cannot be undone.')) {
      try {
        // Delete all sessions
        const sessions = await fetch('/api/chat/sessions').then(r => r.json());
        for (const session of sessions) {
          await fetch(`/api/chat/sessions/${session.id}`, { method: 'DELETE' });
        }
        Sidebar.createNewChat();
        UI.clearMessages();
        showToast('✓ All chats deleted');
      } catch (e) {
        showToast('⚠ Failed to reset chats');
      }
    }
  });

  // ── User info click ────────────────────────
  document.getElementById('userInfoBtn')?.addEventListener('click', () => {
    if (confirm('Sign out?')) {
      fetch('/auth/logout', { method: 'POST' }).then(() => location.href = '/login');
    }
  });

  // ── Help Modal ─────────────────────────────
  const helpModal = document.getElementById('helpModalOverlay');
  
  function openHelpModal() {
    helpModal.style.display = 'flex';
  }
  
  function closeHelpModal() {
    helpModal.style.display = 'none';
  }

  document.getElementById('helpIconBtn')?.addEventListener('click', openHelpModal);
  document.getElementById('helpBtnTop')?.addEventListener('click', openHelpModal);
  document.getElementById('helpModalClose')?.addEventListener('click', closeHelpModal);

  // ── Ad Modal ───────────────────────────────
  const adOverlay    = document.getElementById('adModalOverlay');
  const adTimerFill  = document.getElementById('adTimerFill');
  const adTimerText  = document.getElementById('adTimerText');
  const claimBtn     = document.getElementById('claimBtn');
  let adTimer        = null;

  function openAdModal() {
    adOverlay.style.display = 'flex';
    claimBtn.disabled = true;
    adTimerFill.style.width = '0%';
    let seconds = 15;
    adTimerText.textContent = seconds + 's';

    adTimer = setInterval(() => {
      seconds--;
      const pct = ((15 - seconds) / 15) * 100;
      adTimerFill.style.width = pct + '%';
      adTimerText.textContent = seconds > 0 ? seconds + 's' : 'Done!';
      if (seconds <= 0) {
        clearInterval(adTimer);
        claimBtn.disabled = false;
      }
    }, 1000);
  }

  function closeAdModal() {
    adOverlay.style.display = 'none';
    clearInterval(adTimer);
  }

  // Watch ad button and buy credits button
  document.getElementById('watchAdBtn')?.addEventListener('click', openAdModal);
  document.getElementById('buyCreditsBtn')?.addEventListener('click', openAdModal);
  document.getElementById('adModalClose').addEventListener('click', closeAdModal);

  claimBtn.addEventListener('click', async () => {
    claimBtn.disabled = true;
    claimBtn.textContent = 'Claiming…';
    try {
      const res = await fetch('/auth/credits/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: 20 }),
      });
      const data = await res.json();
      updateCreditsUI(data.credits, isOwner);
      closeAdModal();
      showToast('🎉 +20 credits added!');
    } catch {
      claimBtn.disabled = false;
      claimBtn.textContent = 'Claim 20 Credits';
    }
  });

  // No credits modal
  const noCreditsOverlay = document.getElementById('noCreditsOverlay');
  document.getElementById('noCreditsClose').addEventListener('click', () => {
    noCreditsOverlay.style.display = 'none';
  });
  document.getElementById('noCreditsWatchBtn').addEventListener('click', () => {
    noCreditsOverlay.style.display = 'none';
    openAdModal();
  });

  // ── Toast ──────────────────────────────────
  function showToast(msg) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.classList.add('show'), 10);
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 2500);
  }
  window.showToast = showToast;
});

function useChip(el) {
  const input = document.getElementById('messageInput');
  const text = el.textContent.trim();
  // Remove the ellipsis and expand
  input.value = text.replace('...', '');
  input.focus();
}
