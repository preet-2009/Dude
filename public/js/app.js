document.addEventListener('DOMContentLoaded', async () => {

  // ── Auth check & load user ─────────────────
  let currentCredits = 0;
  let isOwner = false;
  try {
    const res = await fetch('/auth/me');
    if (!res.ok) { location.href = '/login'; return; }
    const { user } = await res.json();

    const userNameEl = document.getElementById('userName');
    if (userNameEl) userNameEl.textContent = user.name || 'User';

    const initial = (user.name || 'U')[0].toUpperCase();
    const html = user.avatar ? `<img src="${user.avatar}" alt="avatar"/>` : initial;
    const userAvatarEl = document.getElementById('userAvatar');
    if (userAvatarEl) userAvatarEl.innerHTML = html;

    // Expose name globally for use in chat.js
    window._userName = user.name || 'buddy';

    // Personalize welcome screen with first name
    const firstName = (user.name || 'there').split(' ')[0];
    const welcomeUserName = document.getElementById('welcomeUserName');
    if (welcomeUserName) welcomeUserName.textContent = firstName;

    currentCredits = user.credits ?? 200;
    isOwner = user.isOwner || false;
    updateCreditsUI(currentCredits, isOwner);

    if (isOwner && userNameEl) {
      userNameEl.innerHTML = `${user.name || 'Owner'} <span class="owner-badge">👑</span>`;
    }
  } catch (err) {
    console.error('Auth error:', err);
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
    const overlay = document.getElementById('noCreditsOverlay');
    if (overlay) overlay.style.display = 'flex';
  };

  // ── Init sidebar — always start fresh new chat on load ──
  try {
    await Sidebar.init();
    Sidebar.createNewChat();
    UI.clearMessages();
  } catch (err) {
    console.error('Sidebar init error:', err);
  }

  // ── Send ───────────────────────────────────
  const input   = document.getElementById('messageInput');
  const sendBtn = document.getElementById('sendBtn');

  if (!input || !sendBtn) {
    console.error('Input or send button not found');
    return;
  }

  function doSend() {
    const text = input.value.trim();
    if (!text) return;
    console.log('Sending message:', text);
    Chat.sendMessage(text);
    input.value = '';
    input.style.height = 'auto';
  }

  sendBtn.addEventListener('click', (e) => {
    e.preventDefault();
    console.log('Send button clicked');
    doSend();
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { 
      e.preventDefault(); 
      console.log('Enter key pressed');
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
  if (addBtn && fileInput) {
    addBtn.addEventListener('click', () => {
      console.log('Add button clicked');
      fileInput.click();
    });
    fileInput.addEventListener('change', (e) => {
      if (e.target.files[0]) Chat.uploadFile(e.target.files[0]);
    });
  }
  
  const removeFileBtn = document.getElementById('removeFileBtn');
  if (removeFileBtn) {
    removeFileBtn.addEventListener('click', () => Chat.clearFilePreview());
  }

  // ── New chat ───────────────────────────────
  const newChatBtn = document.getElementById('newChatBtn');
  if (newChatBtn) {
    newChatBtn.addEventListener('click', () => {
      console.log('New chat clicked');
      Sidebar.createNewChat();
      UI.clearMessages();
      if (Chat.clearFilePreview) Chat.clearFilePreview();
      input.value = '';
      if (window.innerWidth <= 640) {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) sidebar.classList.remove('open');
      }
    });
  }

  // ── Sidebar toggle ─────────────────────────
  const sidebarToggle = document.getElementById('sidebarToggle');
  const sidebar = document.getElementById('sidebar');
  const sidebarClose = document.getElementById('sidebarClose');
  
  if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener('click', () => {
      // On mobile, toggle 'open' class; on desktop, toggle 'collapsed'
      if (window.innerWidth <= 768) {
        sidebar.classList.toggle('open');
      } else {
        sidebar.classList.toggle('collapsed');
      }
    });
  }
  
  if (sidebarClose && sidebar) {
    sidebarClose.addEventListener('click', () => {
      sidebar.classList.remove('open');
    });
  }

  // Close sidebar when clicking outside on mobile
  document.addEventListener('click', (e) => {
    if (window.innerWidth <= 768 && sidebar && sidebar.classList.contains('open')) {
      if (!sidebar.contains(e.target) && !sidebarToggle.contains(e.target)) {
        sidebar.classList.remove('open');
      }
    }
  });

  // ── Settings ───────────────────────────────
  const settingsScreen = document.getElementById('settingsScreen');
  const messagesDiv = document.getElementById('messages');
  const welcomeDiv = document.getElementById('welcome');
  
  const settingsBtn = document.getElementById('settingsBtn');
  if (settingsBtn && settingsScreen && messagesDiv) {
    settingsBtn.addEventListener('click', () => {
      console.log('Settings clicked');
      settingsScreen.style.display = 'block';
      messagesDiv.style.display = 'none';
      if (welcomeDiv) welcomeDiv.style.display = 'none';
    });
  }

  // ── History button ─────────────────────────
  const historyBtn = document.getElementById('historyBtn');
  const historySidebar = document.getElementById('historySidebar');
  const historyOverlay = document.getElementById('historyOverlay');
  const closeHistoryBtn = document.getElementById('closeHistoryBtn');
  
  if (historyBtn && historySidebar && historyOverlay) {
    historyBtn.addEventListener('click', () => {
      console.log('History clicked');
      historySidebar.classList.toggle('open');
      historyOverlay.classList.toggle('show');
    });
  }
  
  if (closeHistoryBtn && historySidebar && historyOverlay) {
    closeHistoryBtn.addEventListener('click', () => {
      historySidebar.classList.remove('open');
      historyOverlay.classList.remove('show');
    });
  }
  
  // Close history sidebar when clicking overlay
  if (historyOverlay && historySidebar) {
    historyOverlay.addEventListener('click', () => {
      historySidebar.classList.remove('open');
      historyOverlay.classList.remove('show');
    });
  }

  const closeSettingsBtn = document.getElementById('closeSettingsBtn');
  if (closeSettingsBtn && settingsScreen && messagesDiv) {
    closeSettingsBtn.addEventListener('click', () => {
      console.log('Close settings clicked');
      settingsScreen.style.display = 'none';
      messagesDiv.style.display = 'block';
      if (welcomeDiv && messagesDiv.querySelectorAll('.message-row').length === 0) {
        welcomeDiv.style.display = 'flex';
      }
    });
  }

  // Settings functionality (theme removed)
  // Font size
  const fontSizeSelect = document.getElementById('fontSizeSelect');
  if (fontSizeSelect) {
    const savedFontSize = localStorage.getItem('fontSize') || 'medium';
    fontSizeSelect.value = savedFontSize;
    document.body.setAttribute('data-font-size', savedFontSize);
    
    fontSizeSelect.addEventListener('change', (e) => {
      const size = e.target.value;
      document.body.setAttribute('data-font-size', size);
      localStorage.setItem('fontSize', size);
    });
  }

  // Chat style
  const chatStyleSelect = document.getElementById('chatStyleSelect');
  if (chatStyleSelect) {
    const savedChatStyle = localStorage.getItem('chatStyle') || 'default';
    chatStyleSelect.value = savedChatStyle;
    document.body.setAttribute('data-chat-style', savedChatStyle);
    
    chatStyleSelect.addEventListener('change', (e) => {
      const style = e.target.value;
      document.body.setAttribute('data-chat-style', style);
      localStorage.setItem('chatStyle', style);
    });
  }

  // Reset chat
  const resetChatBtn = document.getElementById('resetChatBtn');
  if (resetChatBtn) {
    resetChatBtn.addEventListener('click', async () => {
      if (confirm('Are you sure you want to delete all conversations? This cannot be undone.')) {
        try {
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
  }

  // ── User info click ────────────────────────
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      console.log('Logout clicked');
      await fetch('/auth/logout', { method: 'POST' });
      location.href = '/login';
    });
  }

  // ── Help Modal ─────────────────────────────
  const helpModal = document.getElementById('helpModalOverlay');
  
  function openHelpModal() {
    console.log('Opening help modal');
    if (helpModal) helpModal.style.display = 'flex';
  }
  
  function closeHelpModal() {
    if (helpModal) helpModal.style.display = 'none';
  }

  const helpIconBtn = document.getElementById('helpIconBtn');
  const helpBtnTop = document.getElementById('helpBtnTop');
  const helpModalClose = document.getElementById('helpModalClose');
  
  if (helpIconBtn) helpIconBtn.addEventListener('click', openHelpModal);
  if (helpBtnTop) helpBtnTop.addEventListener('click', openHelpModal);
  if (helpModalClose) helpModalClose.addEventListener('click', closeHelpModal);

  // ── Ad Modal ───────────────────────────────
  const adOverlay    = document.getElementById('adModalOverlay');
  const adTimerFill  = document.getElementById('adTimerFill');
  const adTimerText  = document.getElementById('adTimerText');
  const claimBtn     = document.getElementById('claimBtn');
  let adTimer        = null;

  function openAdModal() {
    console.log('Opening ad modal');
    if (!adOverlay) return;
    adOverlay.style.display = 'flex';
    if (claimBtn) claimBtn.disabled = true;
    if (adTimerFill) adTimerFill.style.width = '0%';
    let seconds = 15;
    if (adTimerText) adTimerText.textContent = seconds + 's';

    adTimer = setInterval(() => {
      seconds--;
      const pct = ((15 - seconds) / 15) * 100;
      if (adTimerFill) adTimerFill.style.width = pct + '%';
      if (adTimerText) adTimerText.textContent = seconds > 0 ? seconds + 's' : 'Done!';
      if (seconds <= 0) {
        clearInterval(adTimer);
        if (claimBtn) claimBtn.disabled = false;
      }
    }, 1000);
  }

  function closeAdModal() {
    if (adOverlay) adOverlay.style.display = 'none';
    if (adTimer) clearInterval(adTimer);
  }

  // Watch ad button and buy credits button
  const watchAdBtn = document.getElementById('watchAdBtn');
  const buyCreditsBtn = document.getElementById('buyCreditsBtn');
  const adModalClose = document.getElementById('adModalClose');
  
  if (watchAdBtn) watchAdBtn.addEventListener('click', openAdModal);
  if (buyCreditsBtn) buyCreditsBtn.addEventListener('click', openAdModal);
  if (adModalClose) adModalClose.addEventListener('click', closeAdModal);

  if (claimBtn) {
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
  }

  // No credits modal
  const noCreditsOverlay = document.getElementById('noCreditsOverlay');
  const noCreditsClose = document.getElementById('noCreditsClose');
  const noCreditsWatchBtn = document.getElementById('noCreditsWatchBtn');
  
  if (noCreditsClose) {
    noCreditsClose.addEventListener('click', () => {
      if (noCreditsOverlay) noCreditsOverlay.style.display = 'none';
    });
  }
  
  if (noCreditsWatchBtn) {
    noCreditsWatchBtn.addEventListener('click', () => {
      if (noCreditsOverlay) noCreditsOverlay.style.display = 'none';
      openAdModal();
    });
  }

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

  console.log('App initialized successfully');
});

function useChip(el) {
  const input = document.getElementById('messageInput');
  if (!input) return;
  const text = el.textContent.trim();
  input.value = text.replace('...', '');
  input.focus();
  console.log('Chip used:', text);
}

