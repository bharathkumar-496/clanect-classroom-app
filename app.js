// Clanect Multi-User Application Engine with Admin Student Approvals

let currentState = {
  user: null, // Initialized from localStorage or registration
  selectedAvatar: '🎓',
  currentScreen: 'splash',
  unit2StudyingCount: 14,
  userStudyingUnit2: false,
  pollVoted: false,
  pendingUsersList: [],
  eventSource: null
};

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
  loadSavedUserSession();
  updateTime();
  setInterval(updateTime, 10000);
  registerServiceWorker();
  initRealTimeSync();

  if (currentState.user) {
    if (currentState.user.status === 'approved') {
      switchScreen('home');
    } else {
      switchScreen('pending');
    }
  } else {
    switchScreen('splash');
  }
  
  const splashLogo = document.querySelector('.splash-icon');
  if (splashLogo) {
    splashLogo.addEventListener('click', animateLogoClick);
  }
  const brandLogo = document.querySelector('.brand-logo-small');
  if (brandLogo) {
    brandLogo.addEventListener('click', animateLogoClick);
  }
});


// Load User Session from localStorage (Persistent distinct account per device)
function loadSavedUserSession() {
  const saved = localStorage.getItem('clanect_user_session');
  if (saved) {
    try {
      currentState.user = JSON.parse(saved);
      updateUserUI();
    } catch (e) {
      console.log('Session error');
    }
  }
}

function saveUserSession(userObj) {
  currentState.user = userObj;
  localStorage.setItem('clanect_user_session', JSON.stringify(userObj));
  updateUserUI();
}

function updateUserUI() {
  if (!currentState.user) return;

  const homeDisplay = document.getElementById('home-user-display');
  if (homeDisplay) homeDisplay.innerText = `${currentState.user.name} ${currentState.user.avatar || '👋'}`;

  const profileDisplay = document.getElementById('profile-name-display');
  if (profileDisplay) profileDisplay.innerText = currentState.user.name;

  const profileAvatar = document.getElementById('profile-avatar-img');
  if (profileAvatar) {
    if (currentState.user.avatar && currentState.user.avatar.length > 3) {
      profileAvatar.style.backgroundImage = `url('${currentState.user.avatar}')`;
    } else {
      profileAvatar.style.backgroundImage = 'none';
      profileAvatar.innerHTML = `<div style="font-size:48px; display:flex; justify-content:center; align-items:center; height:100%;">${currentState.user.avatar || '🎓'}</div>`;
    }
  }
}

// Avatar Icon Selector for Registration
function selectRegistrationAvatar(icon, element) {
  currentState.selectedAvatar = icon;
  const options = document.querySelectorAll('.avatar-option');
  options.forEach(opt => opt.style.border = '1px solid #E2E8F0');
  if (element) {
    element.style.border = '2px solid var(--color-indigo)';
    element.style.background = 'var(--color-indigo-light)';
  }
}

const MASTER_ADMIN_REG_NO = '44733013';
const MASTER_ADMIN_PASSWORD = 'Bharath@040906';

// Student Registration Form Handler
function registerNewStudent() {
  const nameInput = document.getElementById('user-name');
  const regInput = document.getElementById('user-reg');
  const passInput = document.getElementById('user-pass');

  if (!nameInput || !nameInput.value.trim()) {
    alert('Please enter your Full Name.');
    return;
  }
  if (!regInput || !regInput.value.trim()) {
    alert('Please enter your Register Number.');
    return;
  }

  const regVal = regInput.value.trim();
  const passVal = passInput ? passInput.value.trim() : '';

  // Exclusive Master Admin Security Directive
  const isMasterAdmin = (regVal === MASTER_ADMIN_REG_NO && passVal === MASTER_ADMIN_PASSWORD);

  const userObj = {
    id: isMasterAdmin ? 'admin-master' : ('user-' + Date.now()),
    name: nameInput.value.trim(),
    regNo: regVal,
    passcode: passVal,
    avatar: isMasterAdmin ? '⚡' : (currentState.selectedAvatar || '🎓'),
    role: isMasterAdmin ? 'admin' : 'student',
    status: isMasterAdmin ? 'approved' : 'pending',
    isAdmin: isMasterAdmin
  };

  // 1. Save local session and update UI instantly
  saveUserSession(userObj);
  if (userObj.status === 'approved') {
    alert(isMasterAdmin ? '👑 Master Admin Verified! Access granted.' : 'Access granted!');
    switchScreen('home');
  } else {
    switchScreen('pending');
  }

  // 2. Perform Firebase Cloud Sync in the background
  if (firebaseDB) {
    firebaseDB.ref('users/' + userObj.id).set(userObj).catch((err) => {
      console.log('Firebase registration sync failed:', err);
    });
  }

  // 3. Fallback backend post in the background
  fetch('/api/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userObj)
  }).catch((err) => {
    console.log('Backend fallback post failed:', err);
  });
}



// Firebase Cloud & Real-Time Sync Configuration
let firebaseDB = null;

function initRealTimeSync() {
  // Initialize Google Firebase Cloud Database if SDK is loaded safely
  if (typeof firebase !== 'undefined') {
    try {
      const firebaseConfig = {
        databaseURL: "https://clanect-3ad33-default-rtdb.firebaseio.com/"
      };
      if (!firebase.apps || !firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
      }
      firebaseDB = firebase.database();
      console.log('⚡ Firebase Realtime Cloud Database Connected!');
      
      if (firebaseDB) {
        // Listen to Real-Time Cloud Chat Messages
        firebaseDB.ref('chat').on('child_added', (snapshot) => {
          const msg = snapshot.val();
          if (msg) appendChatMessage(msg);
        });

        // Listen to Real-Time Cloud Student Approvals
        firebaseDB.ref('users').on('value', (snapshot) => {
          const val = snapshot.val() || {};
          const allUsers = Object.values(val);
          const pendingList = allUsers.filter(u => u.status === 'pending');
          currentState.pendingUsersList = pendingList;
          renderPendingApprovals(pendingList);

          // Check if current user got approved in cloud
          if (currentState.user) {
            const updatedSelf = allUsers.find(u => u.id === currentState.user.id || u.regNo === currentState.user.regNo);
            if (updatedSelf && updatedSelf.status === 'approved' && currentState.user.status === 'pending') {
              currentState.user.status = 'approved';
              saveUserSession(currentState.user);
              alert('🎉 Congratulations! Your account has been approved by Class Rep. Welcome to Clanect!');
              switchScreen('home');
            }
          }
        });

        // Listen to Instant Push Notifications
        firebaseDB.ref('broadcasts').on('child_added', (snapshot) => {
          const alertMsg = snapshot.val();
          if (alertMsg && alertMsg.text) {
            showTopPushBanner(alertMsg.text, alertMsg.sender);
          }
        });
        return;
      }
    } catch (e) {
      console.log('Firebase Cloud falling back to SSE stream', e);
    }
  }

  // Fallback to Server-Sent Events (SSE Stream)
  try {
    const es = new EventSource('/api/events');
    currentState.eventSource = es;

    es.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        handleRealTimeEvent(payload);
      } catch (err) {
        console.log('SSE JSON Error', err);
      }
    };
  } catch (e) {
    console.log('Real-Time SSE offline');
  }
}



// Handle Incoming Real-Time Events
function handleRealTimeEvent(payload) {
  if (payload.type === 'init') {
    if (payload.pending) {
      currentState.pendingUsersList = payload.pending;
      renderPendingApprovals(payload.pending);
    }
    if (payload.history && Array.isArray(payload.history)) {
      renderChatHistory(payload.history);
    }
  } else if (payload.type === 'pending_update') {
    currentState.pendingUsersList = payload.pending;
    renderPendingApprovals(payload.pending);
  } else if (payload.type === 'account_approved') {
    // Check if current device student account got approved by Admin!
    if (currentState.user && currentState.user.id === payload.userId) {
      currentState.user.status = 'approved';
      saveUserSession(currentState.user);
      alert('🎉 Congratulations! Your account has been approved by Class Rep. Welcome to Clanect!');
      switchScreen('home');
    }
    if (payload.pending) {
      renderPendingApprovals(payload.pending);
    }
  } else if (payload.type === 'chat') {
    appendChatMessage(payload.message);
  } else if (payload.type === 'broadcast') {
    showTopPushBanner(payload.text, payload.sender);
  }
}

// Render Admin Pending Student Approvals List
function renderPendingApprovals(pendingList) {
  const container = document.getElementById('admin-pending-list-container');
  if (!container) return;

  if (!pendingList || pendingList.length === 0) {
    container.innerHTML = '<div style="text-align:center; padding:20px; color:var(--color-text-sub); font-size:13px;">No pending student registrations.</div>';
    return;
  }

  container.innerHTML = pendingList.map(student => `
    <div style="background:#F8FAFC; border:1px solid var(--color-border); border-radius:18px; padding:14px; display:flex; justify-content:space-between; align-items:center;">
      <div style="display:flex; gap:10px; align-items:center;">
        <div style="font-size:24px; background:white; width:40px; height:40px; border-radius:50%; display:flex; justify-content:center; align-items:center; border:1px solid #E2E8F0;">${student.avatar || '🎓'}</div>
        <div>
          <div style="font-size:14px; font-weight:800;">${student.name}</div>
          <div style="font-size:11px; color:var(--color-text-sub);">Reg: ${student.regNo}</div>
        </div>
      </div>
      <button onclick="approveStudent('${student.id}')" style="padding:8px 14px; background:#059669; color:white; border:none; border-radius:12px; font-size:12px; font-weight:700; cursor:pointer;">
        Approve ✓
      </button>
    </div>
  `).join('');
}

// Admin Action: Approve Student Registration
function approveStudent(userId) {
  if (firebaseDB) {
    firebaseDB.ref('users/' + userId + '/status').set('approved').then(() => {
      alert('Student approved successfully! Account unlocked on their device.');
    }).catch((err) => {
      console.log('Firebase approval update failed', err);
      alert('Approved offline');
    });
    return;
  }

  fetch('/api/approve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId })
  }).then(res => res.json()).then(data => {
    alert('Student approved successfully! Account unlocked on their device.');
  }).catch(() => {
    alert('Approved offline');
  });
}

function openAdminApprovalsModal() {
  if (!currentState.user || !currentState.user.isAdmin) {
    alert('Admin permissions required.');
    return;
  }
  const modal = document.getElementById('modal-admin-approvals');
  if (modal) modal.classList.add('active');
}

// Group Chat Sender Distinction (You vs Classmate Name)
function appendChatMessage(msg) {
  const chatBox = document.getElementById('chat-messages-box');
  if (!chatBox) return;

  const currentUserId = currentState.user ? currentState.user.id : null;
  const isMe = (msg.senderId && msg.senderId === currentUserId) || (msg.senderName === (currentState.user ? currentState.user.name : ''));

  const msgDiv = document.createElement('div');
  msgDiv.className = `chat-bubble ${isMe ? 'me' : 'other'}`;
  msgDiv.innerHTML = `
    <div class="chat-sender">${isMe ? 'You' : msg.senderName + ' (' + (msg.senderAvatar || '🎓') + ')'} ${msg.isAdmin ? '⭐' : ''}</div>
    ${msg.text}
  `;
  chatBox.appendChild(msgDiv);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function renderChatHistory(history) {
  const chatBox = document.getElementById('chat-messages-box');
  if (!chatBox) return;

  const pollCards = chatBox.querySelectorAll('.poll-card, .broadcast-alert-card');
  chatBox.innerHTML = '';
  pollCards.forEach(p => chatBox.appendChild(p));

  history.forEach(msg => {
    appendChatMessage(msg);
  });
}

// Send Group Chat Message
function sendChatMessage() {
  const input = document.getElementById('chat-input-text');
  if (!input || !input.value.trim()) return;

  if (!currentState.user || currentState.user.status !== 'approved') {
    alert('Your account is pending admin approval.');
    return;
  }

  const msgText = input.value.trim();
  input.value = '';

  const msgPayload = {
    senderId: currentState.user.id,
    senderName: currentState.user.name,
    senderAvatar: currentState.user.avatar || '🎓',
    text: msgText,
    isAdmin: currentState.user.isAdmin,
    timestamp: Date.now()
  };

  if (firebaseDB) {
    firebaseDB.ref('chat').push(msgPayload);
    return;
  }

  fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(msgPayload)
  }).catch(() => {
    appendChatMessage(msgPayload);
  });
}


// Screen Switcher Logic
function switchScreen(screenId) {
  // Check if pending student is trying to bypass pending screen
  if (currentState.user && currentState.user.status === 'pending' && screenId !== 'pending' && screenId !== 'login' && screenId !== 'splash') {
    screenId = 'pending';
  }

  currentState.currentScreen = screenId;

  const screens = document.querySelectorAll('.screen');
  screens.forEach(s => {
    s.classList.remove('active');
    s.style.display = 'none';
  });

  const target = document.getElementById(`screen-${screenId}`);
  if (target) {
    target.classList.add('active');
    target.style.display = 'block';
  }


  const header = document.getElementById('app-header');
  const bottomNav = document.getElementById('bottom-nav');
  const fab = document.getElementById('fab-push');
  const adminBadge = document.getElementById('header-admin-badge');
  const broadcastBtn = document.getElementById('header-broadcast-btn');
  const approvalsBtn = document.getElementById('header-approvals-btn');

  if (screenId === 'splash' || screenId === 'login' || screenId === 'pending') {
    if (header) header.style.display = 'none';
    if (bottomNav) bottomNav.style.display = 'none';
    if (fab) fab.style.display = 'none';
  } else {
    if (header) header.style.display = 'flex';
    if (bottomNav) bottomNav.style.display = 'flex';

    if (currentState.user && currentState.user.isAdmin) {
      if (fab) fab.style.display = 'flex';
      if (adminBadge) adminBadge.style.display = 'inline-flex';
      if (broadcastBtn) broadcastBtn.style.display = 'flex';
      if (approvalsBtn) approvalsBtn.style.display = 'flex';
    } else {
      if (fab) fab.style.display = 'none';
      if (adminBadge) adminBadge.style.display = 'none';
      if (broadcastBtn) broadcastBtn.style.display = 'none';
      if (approvalsBtn) approvalsBtn.style.display = 'none';
    }
  }


  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(n => n.classList.remove('active'));

  const activeNav = document.getElementById(`nav-${screenId}`);
  if (activeNav) activeNav.classList.add('active');

  const container = document.querySelector('.screen-container');
  if (container) container.scrollTop = 0;
}

let bannerTimer = null;

// Show Top Push Notification Toast Banner
function showTopPushBanner(messageText, senderName) {
  const banner = document.getElementById('push-banner');
  const bannerText = document.getElementById('push-banner-text');

  if (bannerText) bannerText.innerText = `${messageText} (By ${senderName || 'CR'})`;
  if (banner) {
    banner.classList.add('show');
    playNotificationSound();

    if (bannerTimer) clearTimeout(bannerTimer);
    bannerTimer = setTimeout(() => {
      hidePushBanner();
    }, 4000);
  }

  const chatBox = document.getElementById('chat-messages-box');
  if (chatBox) {
    const broadcastCard = document.createElement('div');
    broadcastCard.className = 'broadcast-alert-card';
    broadcastCard.innerHTML = `
      <div style="font-size:10px; font-weight:800; color:#DC2626;">INSTANT PUSH BROADCAST • ${senderName || 'CR'}</div>
      <div style="font-size:15px; font-weight:800; color:#991B1B; margin-top:4px;">"${messageText}"</div>
    `;
    chatBox.insertBefore(broadcastCard, chatBox.firstChild);
  }
}

function hidePushBanner() {
  const banner = document.getElementById('push-banner');
  if (banner) banner.classList.remove('show');
  if (bannerTimer) {
    clearTimeout(bannerTimer);
    bannerTimer = null;
  }
}

// Logo Click Animation & Sound
function animateLogoClick(e) {
  const target = e.currentTarget;
  target.style.transform = 'scale(1.25) rotate(-12deg)';
  playNotificationSound();
  setTimeout(() => {
    target.style.transform = '';
  }, 400);
}

function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch (e) {
    console.log('Audio requires user gesture');
  }
}

function updateTime() {
  const now = new Date();
  let hours = now.getHours();
  let minutes = now.getMinutes();
  hours = hours % 12 || 12;
  minutes = minutes < 10 ? '0' + minutes : minutes;
  const timeStr = `${hours}:${minutes}`;
  const el = document.getElementById('current-time');
  if (el) el.innerText = timeStr;
}

function openBroadcastModal() {
  if (!currentState.user || !currentState.user.isAdmin) {
    alert('🔒 Push Notifications are restricted to Class Rep / Admin only.');
    return;
  }
  const modal = document.getElementById('modal-broadcast');
  if (modal) modal.classList.add('active');
}

function openStudyHelpModal() {
  const modal = document.getElementById('modal-study');
  if (modal) modal.classList.add('active');
}

function closeModals() {
  const modals = document.querySelectorAll('.modal-overlay');
  modals.forEach(m => m.classList.remove('active'));
}

function closeModalsOnOverlay(event) {
  if (event.target.classList.contains('modal-overlay')) closeModals();
}

function triggerBroadcast(messageText) {
  if (!currentState.user || !currentState.user.isAdmin) {
    alert('Permission Denied: Only Class Admin can send push alerts.');
    return;
  }
  closeModals();

  const alertData = {
    isAdmin: true,
    sender: currentState.user.name,
    text: messageText,
    timestamp: Date.now()
  };

  if (firebaseDB) {
    firebaseDB.ref('broadcasts').push(alertData);
    return;
  }

  fetch('/api/broadcast', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(alertData)
  }).catch(() => {
    showTopPushBanner(messageText, currentState.user.name);
  });
}


function sendCustomBroadcast() {
  const input = document.getElementById('custom-broadcast-text');
  if (input && input.value.trim()) {
    triggerBroadcast(input.value.trim());
    input.value = '';
  }
}

function votePoll(element) {
  if (!currentState.pollVoted) {
    currentState.pollVoted = true;
    element.style.background = '#C4B5FD';
    element.style.color = '#4C1D95';
    alert('Vote recorded! 🗳️');
  }
}

function openSubjectNotes(subjectName) {
  alert(`Opening ${subjectName} notes folder with Unit 1 to 5 PDFs.`);
}

function downloadPDFAlert(title) {
  alert(`Downloading file: ${title}.pdf.`);
}

function contactStudent(name, phone) {
  alert(`Contacting ${name}: ${phone}.`);
}

function wishBirthday(name) {
  switchScreen('chat');
  sendChatMessageText(`🎉 Happy Birthday ${name}! Have an incredible day! 🎂🎈`);
}

function sendChatMessageText(text) {
  if (!currentState.user) return;
  fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      senderId: currentState.user.id,
      senderName: currentState.user.name,
      senderAvatar: currentState.user.avatar || '🎓',
      text: text,
      isAdmin: currentState.user.isAdmin
    })
  });
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('Service Worker Active', reg))
      .catch(err => console.log('SW Error', err));
  }
}
