document.addEventListener('DOMContentLoaded', async () => {

  // ── Auth check & load user ─────────────────
  let currentCredits = 0;
  try {
    const res = await fetch('/auth/me');
    if (!res.ok) { location.href = '/login'; return; }
    const { user } = await res.json();

    document.getElementById('userName').textContent  = user.name  || 'User';
    document.getElementById('userEmail').textContent = user.email || '';

    const initial = (user.name || 'U')[0].toUpperCase();
    const html = user.avatar ? `<img src="${user.avatar}" alt="avatar"/>` : initial;
    document.getElementById('userAvatar').innerHTML    = html;
    document.getElementById('userAvatarTop').innerHTML = html;

    // Personalize welcome screen with first name
    const firstName = (user.name || 'there').split(' ')[0];
    const welcomeH2 = document.querySelector('.welcome h2');
    if (welcomeH2) welcomeH2.innerHTML = `Hey <span>${firstName}</span>, I'm DUDE`;

    currentCredits = user.credits ?? 200;
    updateCreditsUI(currentCredits);
  } catch {
    location.href = '/login';
    return;
  }

  // ── Credits UI ─────────────────────────────
  function updateCreditsUI(n) {
    currentCredits = n;
    const badge = document.getElementById('creditsBadge');
    document.getElementById('creditsCount').textContent = n;
    badge.classList.toggle('low', n < 20);
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
  document.getElementById('fileInput').addEventListener('change', (e) => {
    if (e.target.files[0]) Chat.uploadFile(e.target.files[0]);
  });
  document.getElementById('removeFileBtn').addEventListener('click', () => Chat.clearFilePreview());

  // ── New chat ───────────────────────────────
  document.getElementById('newChatBtn').addEventListener('click', () => {
    Sidebar.createNewChat();
    UI.clearMessages();
    Chat.clearFilePreview();
    input.value = '';
    if (window.innerWidth <= 640) document.getElementById('sidebar').classList.remove('open');
  });

  // ── Logout ─────────────────────────────────
  document.getElementById('logoutBtn').addEventListener('click', async () => {
    await fetch('/auth/logout', { method: 'POST' });
    location.href = '/login';
  });

  // ── Theme ──────────────────────────────────
  const theme = localStorage.getItem('theme') || 'dark';
  document.documentElement.setAttribute('data-theme', theme);
  document.getElementById('themeToggle').addEventListener('click', () => {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
  });

  // ── Sidebar mobile ─────────────────────────
  const sidebar = document.getElementById('sidebar');
  document.getElementById('sidebarToggle').addEventListener('click', () => sidebar.classList.toggle('open'));
  document.getElementById('sidebarClose').addEventListener('click',  () => sidebar.classList.remove('open'));
  window.addEventListener('resize', () => { if (window.innerWidth > 640) sidebar.classList.remove('open'); });

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

    // Fire Adsterra popunder — opens ad in new tab
    window.open('about:blank', '_blank');

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

  document.getElementById('watchAdBtn').addEventListener('click', openAdModal);
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
  input.value = el.textContent.replace(/^\S+\s/, '');
  input.focus();
}
