document.addEventListener('DOMContentLoaded', async () => {

  // ── Auth check & load user ─────────────────
  let currentCredits = 0;
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
    updateCreditsUI(currentCredits, user.isOwner);

    if (user.isOwner) {
      // Show owner badge next to name in sidebar
      const nameEl = document.getElementById('userName');
      nameEl.innerHTML = `${user.name || 'Owner'} <span class="owner-badge">👑 Owner</span>`;
    }
  } catch {
    location.href = '/login';
    return;
  }

  // ── Credits UI ─────────────────────────────
  function updateCreditsUI(n, isOwner) {
    currentCredits = n;
    const badge = document.getElementById('creditsBadge');
    document.getElementById('creditsCount').textContent = isOwner ? '∞' : n;
    badge.classList.toggle('low', !isOwner && n < 20);
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
    const text = input.value;
    if (!text.trim()) return;
    Chat.sendMessage(text);
    input.value = '';
    input.style.height = 'auto';
  }

  sendBtn.addEventListener('click', doSend);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSend(); }
  });
  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 200) + 'px';
  });

  // ── File upload ────────────────────────────
  const fileInput = document.getElementById('fileInput');
  document.querySelector('.add-btn').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => {
    if (e.target.files[0]) Chat.uploadFile(e.target.files[0]);
  });
  document.getElementById('removeFileBtn')?.addEventListener('click', () => Chat.clearFilePreview());

  // ── New chat ───────────────────────────────
  document.getElementById('newChatBtn').addEventListener('click', () => {
    Sidebar.createNewChat();
    UI.clearMessages();
    Chat.clearFilePreview();
    input.value = '';
    if (window.innerWidth <= 640) document.getElementById('sidebar').classList.remove('open');
  });

  // ── User info click (show menu) ────────────
  document.getElementById('userInfoBtn')?.addEventListener('click', () => {
    // Could show a menu with logout, settings, etc.
    if (confirm('Sign out?')) {
      fetch('/auth/logout', { method: 'POST' }).then(() => location.href = '/login');
    }
  });

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

  // Credits badge click opens ad modal
  document.getElementById('creditsBadge').addEventListener('click', openAdModal);
  document.getElementById('watchAdBtn')?.addEventListener('click', openAdModal);
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
      updateCreditsUI(data.credits);
      closeAdModal();
      // Show brief success toast
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
  input.value = el.textContent.trim();
  input.focus();
}
