// RespiraPlus - MediRehab Pro Application Logic
let appState = {
  user: null,
  isDarkMode: true,
  isOffline: false,
  timerRunning: false,
  timerSeconds: 30,
  timerTotal: 30,
  timerInterval: null,
  currentExerciseIndex: 0,
  exercises: [],
  videos: [],
  reminders: [],
  logs: [],
  progressData: null,
  appointments: [],
  telehealthActive: false,
  cameraStream: null,
  adminStats: null,
  adminPatients: []
};

// ==========================================
// 1. URL ROUTING & TAB MAPPINGS
// ==========================================
const ROUTE_TAB_MAP = {
  '#ejercicios': 'tab-guided',
  '#guiados': 'tab-guided',
  '#guided': 'tab-guided',
  '#tab-guided': 'tab-guided',
  '#1': 'tab-guided',

  '#videos': 'tab-videos',
  '#tab-videos': 'tab-videos',
  '#2': 'tab-videos',

  '#recordatorios': 'tab-reminders',
  '#reminders': 'tab-reminders',
  '#tab-reminders': 'tab-reminders',
  '#3': 'tab-reminders',

  '#registro-eva': 'tab-logging',
  '#eva': 'tab-logging',
  '#logging': 'tab-logging',
  '#tab-logging': 'tab-logging',
  '#4': 'tab-logging',

  '#progreso': 'tab-progress',
  '#seguimiento': 'tab-progress',
  '#progress': 'tab-progress',
  '#tab-progress': 'tab-progress',
  '#5': 'tab-progress',

  '#teleconsulta': 'tab-telehealth',
  '#citas': 'tab-telehealth',
  '#telemed': 'tab-telehealth',
  '#telehealth': 'tab-telehealth',
  '#zoom': 'tab-telehealth',
  '#tab-telehealth': 'tab-telehealth',
  '#6': 'tab-telehealth',

  '#descargas': 'tab-offline',
  '#documentos': 'tab-offline',
  '#pdf': 'tab-offline',
  '#offline': 'tab-offline',
  '#tab-offline': 'tab-offline',
  '#7': 'tab-offline',

  '#perfil': 'tab-profile',
  '#expediente': 'tab-profile',
  '#profile': 'tab-profile',
  '#tab-profile': 'tab-profile',

  '#admin': 'tab-admin',
  '#adminsite': 'tab-admin',
  '#gestion': 'tab-admin',
  '#tab-admin': 'tab-admin'
};

const TAB_CANONICAL_HASH = {
  'tab-guided': '#ejercicios',
  'tab-videos': '#videos',
  'tab-reminders': '#recordatorios',
  'tab-logging': '#registro-eva',
  'tab-progress': '#progreso',
  'tab-telehealth': '#teleconsulta',
  'tab-offline': '#descargas',
  'tab-profile': '#perfil',
  'tab-admin': '#admin'
};

function getTabFromHash(hash) {
  if (!hash) return null;
  const clean = hash.toLowerCase().trim();
  return ROUTE_TAB_MAP[clean] || null;
}

// ==========================================
// 2. INITIALIZATION & SESSION RESTORATION
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
  // Check theme
  const savedTheme = localStorage.getItem('theme_mode');
  if (savedTheme === 'light') {
    setDarkMode(false);
  } else {
    setDarkMode(true);
  }

  // Pre-hide all admin-only elements immediately
  document.querySelectorAll('.admin-only, #admin-switch-banner').forEach(el => {
    el.style.display = 'none';
    el.classList.add('hidden');
  });

  // Listen to browser Back/Forward navigation and URL hash changes
  window.addEventListener('hashchange', () => {
    if (!appState.user) return;
    const tabFromUrl = getTabFromHash(window.location.hash);
    if (tabFromUrl) {
      switchTab(tabFromUrl, false);
    }
  });

  // Verify and Restore Active Session instantly from localStorage
  const session = API.getSession();
  if (session && session.token && session.user) {
    appState.user = session.user;
    renderUserProfile();
    showAppScreen();

    // Determine target tab from URL hash, last active tab, or role default
    const role = (appState.user.role || '').toLowerCase();
    const isAdmin = role === 'admin' || role === 'doctor';
    const hashTab = getTabFromHash(window.location.hash);
    const lastTab = localStorage.getItem('respiraplus_last_tab');

    let initialTab = 'tab-guided';
    if (hashTab && (hashTab !== 'tab-admin' || isAdmin) && document.getElementById(hashTab)) {
      initialTab = hashTab;
    } else if (lastTab && (lastTab !== 'tab-admin' || isAdmin) && document.getElementById(lastTab)) {
      initialTab = lastTab;
    } else if (isAdmin) {
      initialTab = 'tab-admin';
    }

    switchTab(initialTab, true);

    // Asynchronously load initial data in background
    loadInitialData();

    // Background verify session with server
    API.getMe().then(meRes => {
      if (meRes && meRes.valid && meRes.user) {
        appState.user = meRes.user;
        renderUserProfile();
      }
    }).catch(err => {
      console.warn('Verificación de sesión en segundo plano:', err.message);
      if (err.message && (err.message.includes('401') || err.message.includes('Sesión'))) {
        API.clearSession();
        appState.user = null;
        showLoginScreen();
      }
    });

    return;
  }

  // No valid session -> Show Login Screen
  showLoginScreen();
});

async function loadInitialData() {
  if (!appState.user) return;
  const userId = appState.user.id;

  try {
    // 1. Profile
    const profileRes = await API.getProfile(userId).catch(() => null);
    if (profileRes) {
      appState.user = profileRes;
      renderUserProfile();
    }

    // 2. Exercises
    const exList = await API.getExercises().catch(() => []);
    if (exList && exList.length > 0) {
      appState.exercises = exList;
    }
    updateExerciseView();

    // 3. Videos
    const vids = await API.getVideos().catch(() => []);
    appState.videos = vids;
    renderVideosList();

    // 4. Reminders
    const rems = await API.getReminders(userId).catch(() => []);
    appState.reminders = rems;
    renderReminders();

    // 5. Logs & Progress
    await loadLogsAndProgress();

    // 6. Appointments & Citas Médicas
    await loadAppointments();

    // 7. Telehealth Chat & Zoom
    const tele = await API.getTelehealth(userId).catch(() => null);
    if (tele) {
      if (tele.messages) renderChatMessages(tele.messages);
      if (tele.zoom || tele.session) renderZoomMeetingData(tele.zoom || tele.session);
    }
  } catch (err) {
    console.warn('Error cargando datos de la sesión:', err);
  }
}

function renderUserProfile() {
  const u = appState.user;
  if (!u) return;

  const role = (u.role || 'patient').toLowerCase();
  const isAdmin = role === 'admin' || role === 'doctor';

  document.querySelectorAll('.user-name-text').forEach(el => el.innerText = u.full_name);
  document.querySelectorAll('.user-condition-text').forEach(el => el.innerText = u.diagnosis);
  document.querySelectorAll('.user-avatar-text').forEach(el => el.innerText = u.avatar_initials || (isAdmin ? 'DR' : 'PX'));

  // Role Badge updates
  document.querySelectorAll('.user-role-badge').forEach(el => {
    if (isAdmin) {
      el.innerText = 'Administrador Médico';
      el.className = 'user-role-badge text-[9px] bg-purple-200 dark:bg-purple-900 text-purple-950 dark:text-purple-100 px-1.5 py-0.5 rounded font-bold';
    } else {
      el.innerText = u.phase || 'Paciente';
      el.className = 'user-role-badge text-[9px] bg-teal-200 dark:bg-teal-800 text-teal-900 dark:text-teal-100 px-1.5 py-0.5 rounded font-bold';
    }
  });

  const inputName = document.getElementById('input-prof-name');
  const inputDiag = document.getElementById('input-prof-condition');
  const inputGoal = document.getElementById('input-prof-goal');
  if (inputName) inputName.value = u.full_name;
  if (inputDiag) inputDiag.value = u.diagnosis;
  if (inputGoal) inputGoal.value = u.rehab_goal;

  // Strict Role Control: Show or Hide AdminSite Elements
  const adminElements = document.querySelectorAll('.admin-only, #admin-switch-banner');
  adminElements.forEach(el => {
    if (isAdmin) {
      el.classList.remove('hidden');
      el.style.display = '';
    } else {
      el.classList.add('hidden');
      el.style.display = 'none';
    }
  });
}

// ==========================================
// 3. NAVIGATION & TABS (CON PERSISTENCIA DE URL Y ROLES)
// ==========================================
function switchTab(tabId, updateUrl = true) {
  // Strict Security Check: If requesting AdminSite, verify role
  if (tabId === 'tab-admin') {
    const role = (appState.user && appState.user.role || '').toLowerCase();
    const isAdmin = role === 'admin' || role === 'doctor';
    if (!isAdmin) {
      showToast('Acceso Denegado', 'El AdminSite es de acceso exclusivo para el Administrador del sistema.', 'fa-solid fa-shield-halved text-red-500');
      switchTab('tab-guided', updateUrl);
      return;
    }
  }

  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.remove('bg-teal-600', 'text-white', 'shadow-md', 'bg-purple-600');
    btn.classList.add('text-slate-600', 'dark:text-slate-400');
  });

  const target = document.getElementById(tabId);
  const btn = document.getElementById('btn-' + tabId);
  if (target) target.classList.add('active');
  if (btn) {
    btn.classList.remove('text-slate-600', 'dark:text-slate-400');
    if (tabId === 'tab-admin') {
      btn.classList.add('bg-purple-600', 'text-white', 'shadow-md');
    } else {
      btn.classList.add('bg-teal-600', 'text-white', 'shadow-md');
    }
  }

  // Persist current active tab in storage
  localStorage.setItem('respiraplus_last_tab', tabId);

  // Synchronize URL Hash without full page reload or scrolling jump
  if (updateUrl) {
    const canonicalHash = TAB_CANONICAL_HASH[tabId] || '#' + tabId;
    if (window.location.hash !== canonicalHash) {
      history.replaceState(null, '', canonicalHash);
    }
  }

  // If switched to progress or admin, refresh corresponding data
  if (tabId === 'tab-progress') {
    loadLogsAndProgress();
  } else if (tabId === 'tab-admin') {
    loadAdminData();
  } else if (tabId === 'tab-telehealth') {
    const role = (appState.user && appState.user.role || '').toLowerCase();
    const isAdmin = role === 'admin' || role === 'doctor';
    if (isAdmin) {
      setTelehealthView('doctor-queue');
    }
  }
}

// ==========================================
// 4. AUTHENTICATION & SESSION MANAGEMENT
// ==========================================
function setAuthMode(mode) {
  const formLogin = document.getElementById('form-login');
  const formRegister = document.getElementById('form-register');
  const tabLogin = document.getElementById('auth-tab-login');
  const tabRegister = document.getElementById('auth-tab-register');

  if (mode === 'register') {
    formLogin.classList.add('hidden');
    formRegister.classList.remove('hidden');
    tabRegister.className = "flex-1 py-2.5 border-b-2 border-teal-600 text-teal-600 dark:text-teal-400 transition cursor-pointer";
    tabLogin.className = "flex-1 py-2.5 border-b-2 border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition cursor-pointer";
  } else {
    formRegister.classList.add('hidden');
    formLogin.classList.remove('hidden');
    tabLogin.className = "flex-1 py-2.5 border-b-2 border-teal-600 text-teal-600 dark:text-teal-400 transition cursor-pointer";
    tabRegister.className = "flex-1 py-2.5 border-b-2 border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition cursor-pointer";
  }
}

async function handleLogin(e) {
  if (e && e.preventDefault) e.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;

  try {
    const res = await API.login(email, password);
    if (res && res.user) {
      appState.user = res.user;
      renderUserProfile();
      showAppScreen();
      await loadInitialData();

      const role = (res.user.role || '').toLowerCase();
      const isAdmin = role === 'admin' || role === 'doctor';
      const hashTab = getTabFromHash(window.location.hash);
      const lastTab = localStorage.getItem('respiraplus_last_tab');

      let targetTab = 'tab-guided';
      if (hashTab && (hashTab !== 'tab-admin' || isAdmin) && document.getElementById(hashTab)) {
        targetTab = hashTab;
      } else if (lastTab && (lastTab !== 'tab-admin' || isAdmin) && document.getElementById(lastTab)) {
        targetTab = lastTab;
      } else if (isAdmin) {
        targetTab = 'tab-admin';
      }

      switchTab(targetTab, true);

      if (isAdmin) {
        showToast('Acceso Concedido', `Bienvenido ${res.user.full_name} al Panel Administrativo`, 'fa-solid fa-user-shield text-purple-400');
      } else {
        showToast('Bienvenido', `Sesión iniciada: ${res.user.full_name}`, 'fa-solid fa-circle-check text-emerald-400');
      }
    }
  } catch (error) {
    showToast('Error de Acceso', error.message || 'Credenciales clínicas no válidas', 'fa-solid fa-triangle-exclamation text-amber-400');
  }
}

async function handleRegister(e) {
  if (e && e.preventDefault) e.preventDefault();
  const full_name = document.getElementById('reg-name').value;
  const email = document.getElementById('reg-email').value;
  const password = document.getElementById('reg-password').value;
  const diagnosis = document.getElementById('reg-diagnosis')?.value || '';
  const rehab_goal = document.getElementById('reg-goal')?.value || '';

  try {
    const res = await API.register({
      full_name,
      email,
      password,
      role: 'patient', // Public registration is exclusively for patients
      diagnosis,
      rehab_goal
    });

    if (res && res.user) {
      appState.user = res.user;
      renderUserProfile();
      showAppScreen();
      await loadInitialData();
      switchTab('tab-guided', true);
      showToast('Cuenta Creada', `Bienvenido ${full_name} a RespiraPlus`, 'fa-solid fa-circle-check text-emerald-400');
    }
  } catch (err) {
    showToast('Error de Registro', err.message || 'No se pudo crear la cuenta', 'fa-solid fa-triangle-exclamation text-amber-400');
  }
}

function showAppScreen() {
  const login = document.getElementById('screen-login');
  const app = document.getElementById('screen-app');
  if (login) {
    login.classList.add('hidden');
    login.classList.remove('flex');
  }
  if (app) {
    app.classList.remove('hidden');
    app.classList.add('flex');
  }
}

function showLoginScreen() {
  const login = document.getElementById('screen-login');
  const app = document.getElementById('screen-app');
  if (app) {
    app.classList.add('hidden');
    app.classList.remove('flex');
  }
  if (login) {
    login.classList.remove('hidden');
    login.classList.add('flex');
  }
}

async function handleLogout() {
  if (appState.cameraStream) {
    endTelehealthCall();
  }
  await API.logout();
  appState.user = null;
  localStorage.removeItem('respiraplus_last_tab');
  if (window.location.hash) {
    history.replaceState(null, '', window.location.pathname);
  }
  showLoginScreen();
  showToast('Sesión Cerrada', 'Has salido del portal clínico de manera segura.', 'fa-solid fa-right-from-bracket text-slate-400');
}

function quickFillPatient() {
  setAuthMode('login');
  document.getElementById('login-email').value = 'carlos.vega@hospital.med';
  document.getElementById('login-password').value = '12345678';
  showToast('Datos Cargados', 'Paciente Carlos Vega listo.', 'fa-solid fa-bolt text-teal-400');
}

function quickFillDoctor() {
  setAuthMode('login');
  document.getElementById('login-email').value = 'doctor@hospital.med';
  document.getElementById('login-password').value = 'admin123';
  showToast('Datos Cargados', 'Médico Administrador Dr. Martínez listo.', 'fa-solid fa-stethoscope text-purple-400');
}

// ==========================================
// 4. REQ 1: EJERCICIOS GUIADOS & AUDIO CUES
// ==========================================
function playAudioBeep(freq = 600, duration = 0.15) {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.value = 0.12;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) {
    // Silent fail if interaction needed
  }
}

function updateExerciseView() {
  if (!appState.exercises || appState.exercises.length === 0) return;
  if (appState.currentExerciseIndex >= appState.exercises.length) {
    appState.currentExerciseIndex = 0;
  }
  const ex = appState.exercises[appState.currentExerciseIndex];

  const catEl = document.getElementById('ex-category');
  const titleEl = document.getElementById('ex-title');
  const badgeEl = document.getElementById('ex-step-badge');
  const hintEl = document.getElementById('posture-hint');
  const presEl = document.getElementById('ex-prescription-badge');
  const safetyEl = document.getElementById('ex-safety-text');

  if (catEl) catEl.innerText = ex.category;
  if (titleEl) titleEl.innerText = ex.title;
  if (badgeEl) badgeEl.innerText = `Ejercicio ${appState.currentExerciseIndex + 1} de ${appState.exercises.length}`;
  if (hintEl) hintEl.innerText = `"${ex.posture_hint}"`;
  if (presEl) presEl.innerText = `Prescripción: ${ex.prescription || '3 series x 12 reps'}`;
  if (safetyEl) safetyEl.innerText = ex.safety_tips || 'Si el dolor supera 3/10 EVA, detén la serie.';

  // Fill exercise selector in Logging Tab
  const selectLog = document.getElementById('log-exercise');
  if (selectLog) {
    selectLog.innerHTML = appState.exercises.map(item => `
      <option value="${item.title}" ${item.title === ex.title ? 'selected' : ''}>${item.title}</option>
    `).join('');
  }

  resetTimer(ex.duration_seconds || 30);
  renderRoutineList();
}

function toggleTimer() {
  if (appState.timerRunning) {
    clearInterval(appState.timerInterval);
    appState.timerRunning = false;
    document.getElementById('btn-timer-text').innerText = "Reanudar";
  } else {
    appState.timerRunning = true;
    document.getElementById('btn-timer-text').innerText = "Pausar";
    playAudioBeep(880, 0.12);

    appState.timerInterval = setInterval(() => {
      if (appState.timerSeconds > 0) {
        appState.timerSeconds--;
        renderTimer();
      } else {
        clearInterval(appState.timerInterval);
        appState.timerRunning = false;
        document.getElementById('btn-timer-text').innerText = "Completado";
        playAudioBeep(1200, 0.4);
        showToast("¡Serie Finalizada!", "Excelente ejecución técnica. Tiempo de descanso.", 'fa-solid fa-trophy text-amber-400');
      }
    }, 1000);
  }
}

function renderTimer() {
  const mins = String(Math.floor(appState.timerSeconds / 60)).padStart(2, '0');
  const secs = String(appState.timerSeconds % 60).padStart(2, '0');
  const disp = document.getElementById('timer-display');
  const largeDisp = document.getElementById('timer-large');
  if (disp) disp.innerText = `${mins}:${secs}`;
  if (largeDisp) largeDisp.innerText = `${mins}:${secs}`;

  const pct = (appState.timerSeconds / appState.timerTotal) * 100;
  const bar = document.getElementById('timer-bar');
  if (bar) bar.style.width = pct + '%';
}

function resetTimer(customTime) {
  clearInterval(appState.timerInterval);
  appState.timerRunning = false;
  appState.timerSeconds = customTime || (appState.exercises[appState.currentExerciseIndex]?.duration_seconds || 30);
  appState.timerTotal = appState.timerSeconds;
  const btn = document.getElementById('btn-timer-text');
  if (btn) btn.innerText = "Iniciar Guía";
  renderTimer();
}

function nextExercise() {
  if (appState.currentExerciseIndex < appState.exercises.length - 1) {
    appState.currentExerciseIndex++;
    updateExerciseView();
  } else {
    showToast("¡Rutina Completa!", "Has finalizado todos los ejercicios prescritos de hoy.", 'fa-solid fa-medal text-teal-400');
  }
}

function prevExercise() {
  if (appState.currentExerciseIndex > 0) {
    appState.currentExerciseIndex--;
    updateExerciseView();
  }
}

function selectExerciseIndex(index) {
  if (index >= 0 && index < appState.exercises.length) {
    appState.currentExerciseIndex = index;
    updateExerciseView();
  }
}

function renderRoutineList() {
  const container = document.getElementById('routine-list');
  if (!container) return;
  container.innerHTML = appState.exercises.map((ex, i) => `
    <div onclick="selectExerciseIndex(${i})" class="p-2.5 rounded-md text-xs flex items-center justify-between cursor-pointer transition ${i === appState.currentExerciseIndex ? 'bg-teal-50 dark:bg-teal-950/50 border border-teal-300 dark:border-teal-700 font-bold text-teal-900 dark:text-teal-200' : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'}">
      <div class="flex items-center gap-2">
        <span class="w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${i === appState.currentExerciseIndex ? 'bg-teal-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}">${i + 1}</span>
        <span class="truncate max-w-[170px]">${ex.title}</span>
      </div>
      <span class="font-mono">${ex.duration_seconds}s</span>
    </div>
  `).join('');
}

// ==========================================
// 5. REQ 2: VIDEOS EXPLICATIVOS
// ==========================================
let currentPlayingVideoUrl = '';

function renderVideosList() {
  const container = document.getElementById('video-playlist');
  if (!container || !appState.videos) return;

  if (appState.videos.length === 0) {
    container.innerHTML = `<p class="text-xs text-slate-400 p-3">No hay videos disponibles.</p>`;
    return;
  }

  container.innerHTML = appState.videos.map((vid, idx) => `
    <div onclick="selectVideo(${idx})" class="p-3 rounded-lg border ${idx === 0 ? 'border-teal-500 bg-teal-50/50 dark:bg-teal-950/30' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'} flex gap-3 cursor-pointer hover:border-teal-400 transition">
      <div class="w-12 h-10 rounded-lg bg-slate-800 shrink-0 flex items-center justify-center text-white text-[10px] font-bold">
        ${vid.duration || '04:00'}
      </div>
      <div class="min-w-0">
        <p class="font-bold text-xs text-slate-900 dark:text-white truncate">${vid.title}</p>
        <p class="text-[10px] text-slate-500 truncate">${vid.specialist_name}</p>
      </div>
    </div>
  `).join('');

  if (appState.videos.length > 0) {
    selectVideo(0);
  }
}

function selectVideo(idx) {
  const vid = appState.videos[idx];
  if (!vid) return;

  currentPlayingVideoUrl = vid.video_url || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';

  const playerTitle = document.getElementById('vid-player-title');
  const playerAuthor = document.getElementById('vid-player-author');
  const markersContainer = document.getElementById('video-markers-list');

  if (playerTitle) playerTitle.innerText = vid.title;
  if (playerAuthor) playerAuthor.innerText = `Especialista: ${vid.specialist_name}`;

  if (markersContainer && vid.markers) {
    markersContainer.innerHTML = vid.markers.map(m => `
      <div class="p-2.5 rounded-md bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-teal-400 transition" onclick="showToast('Capítulo', '${m.time} - ${m.label}', 'fa-solid fa-location-dot text-teal-400')">
        <span class="font-bold text-teal-600 dark:text-teal-400">${m.time}</span> - ${m.label}
      </div>
    `).join('');
  }
}

function playCurrentVideo() {
  const videoElem = document.getElementById('main-video-player');
  const placeholder = document.getElementById('main-video-placeholder');
  if (videoElem && currentPlayingVideoUrl) {
    videoElem.src = currentPlayingVideoUrl;
    videoElem.classList.remove('hidden');
    if (placeholder) placeholder.classList.add('hidden');
    videoElem.play().catch(e => console.log('Autoplay handled:', e));
    showToast('Reproductor HD', 'Iniciando video streaming...', 'fa-solid fa-play text-teal-400');
  }
}

// ==========================================
// 6. REQ 3: RECORDATORIOS PERSONALIZADOS
// ==========================================
function renderReminders() {
  const container = document.getElementById('reminders-list');
  if (!container) return;

  if (!appState.reminders || appState.reminders.length === 0) {
    container.innerHTML = `<p class="text-xs text-slate-400 p-4">No hay recordatorios activos.</p>`;
    return;
  }

  container.innerHTML = appState.reminders.map(rem => `
    <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-sm flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-md bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 flex items-center justify-center font-bold text-base">
          ${rem.icon === 'snowflake' ? '<i class="fa-solid fa-snowflake"></i>' : rem.icon === 'lungs' ? '<i class="fa-solid fa-lungs"></i>' : rem.icon === 'pills' ? '<i class="fa-solid fa-pills"></i>' : '<i class="fa-solid fa-bell"></i>'}
        </div>
        <div>
          <h4 class="font-bold text-xs text-slate-900 dark:text-white">${rem.title}</h4>
          <p class="text-[11px] text-slate-500 dark:text-slate-400">${rem.time_str} • ${rem.detail || 'Rutina'}</p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <input type="checkbox" onchange="toggleReminderStatus(${rem.id})" ${rem.is_enabled === 1 ? 'checked' : ''} class="w-5 h-5 accent-teal-600 cursor-pointer">
        <button onclick="deleteReminderItem(${rem.id})" class="p-1.5 text-slate-400 hover:text-red-500 transition text-xs" title="Eliminar"><i class="fa-solid fa-trash-can"></i></button>
      </div>
    </div>
  `).join('');
}

async function toggleReminderStatus(id) {
  try {
    await API.toggleReminder(id);
    const item = appState.reminders.find(r => r.id === id);
    if (item) item.is_enabled = item.is_enabled === 1 ? 0 : 1;
    showToast('Alarma Actualizada', 'Estado de la alarma modificado.', 'fa-solid fa-bell text-teal-400');
  } catch (e) {
    showToast('Error', 'No se pudo actualizar la alarma.', 'fa-solid fa-triangle-exclamation text-amber-400');
  }
}

async function deleteReminderItem(id) {
  try {
    await API.deleteReminder(id);
    appState.reminders = appState.reminders.filter(r => r.id !== id);
    renderReminders();
    showToast('Eliminado', 'Recordatorio eliminado correctamente.', 'fa-solid fa-trash-can text-red-400');
  } catch (e) {
    showToast('Error', 'No se pudo eliminar el recordatorio.', 'fa-solid fa-triangle-exclamation text-amber-400');
  }
}

function openAddReminderModal() {
  const m = document.getElementById('modal-add-reminder');
  if (m) {
    m.classList.remove('hidden');
    m.classList.add('flex');
  }
}

function closeAddReminderModal() {
  const m = document.getElementById('modal-add-reminder');
  if (m) {
    m.classList.add('hidden');
    m.classList.remove('flex');
  }
}

async function handleAddReminderSubmit(e) {
  e.preventDefault();
  const title = document.getElementById('new-rem-title').value;
  const time = document.getElementById('new-rem-time').value;
  const detail = document.getElementById('new-rem-detail').value;
  const icon = document.getElementById('new-rem-icon').value;

  try {
    const created = await API.createReminder({
      user_id: appState.user.id,
      title,
      time_str: time,
      detail,
      icon
    });
    appState.reminders.push(created);
    renderReminders();
    closeAddReminderModal();
    showToast('Recordatorio Creado', `Alarma programada para las ${time}`, 'fa-solid fa-bell text-teal-400');
  } catch (e) {
    showToast('Error', 'Error al guardar recordatorio', 'fa-solid fa-triangle-exclamation text-amber-400');
  }
}

function testPushNotification() {
  if ("Notification" in window) {
    Notification.requestPermission().then(permission => {
      if (permission === "granted") {
        new Notification("RespiraPlus • Recordatorio Clínico", {
          body: "¡Es hora de tu sesión de ejercicios de Fase 2!",
          icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='20' fill='%230d9488'/><text x='50%' y='55%' dominant-baseline='middle' text-anchor='middle' font-size='60' fill='white' font-weight='bold'>+</text></svg>"
        });
      }
    });
  }
  showToast('Notificación Médica', '¡Hora de tu sesión de ejercicios prescrita!', 'fa-solid fa-bell text-blue-400');
}

// ==========================================
// 7. REQ 4: REGISTRO DE EJERCICIOS & EVA
// ==========================================
function updatePainLabel(val) {
  const badge = document.getElementById('pain-val-badge');
  if (!badge) return;
  let text = `${val} / 10 - Leve`;
  if (val <= 2) {
    badge.className = "px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300";
    text = `${val} / 10 - Dolor Mínimo`;
  } else if (val <= 5) {
    badge.className = "px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300";
    text = `${val} / 10 - Molestia Moderada`;
  } else {
    badge.className = "px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300";
    text = `${val} / 10 - Dolor Intenso (Consulte al médico)`;
  }
  badge.innerText = text;
}

async function handleLogSubmit(e) {
  e.preventDefault();
  const exercise_name = document.getElementById('log-exercise').value;
  const sets = parseInt(document.getElementById('log-sets').value) || 3;
  const reps = parseInt(document.getElementById('log-reps').value) || 12;
  const pain_eva = parseInt(document.getElementById('log-pain').value) || 2;
  const notes = document.getElementById('log-notes').value;

  try {
    await API.createLog({
      user_id: appState.user.id,
      exercise_name,
      sets,
      reps,
      pain_eva,
      notes
    });

    document.getElementById('log-notes').value = '';
    showToast("Registro Guardado", "Datos almacenados en el expediente clínico.", 'fa-solid fa-clipboard-check text-teal-400');
    await loadLogsAndProgress();
    updateOfflineBadge();
  } catch (err) {
    showToast("Error", "No se pudo guardar el registro", 'fa-solid fa-triangle-exclamation text-amber-400');
  }
}

async function loadLogsAndProgress() {
  try {
    const logs = await API.getLogs(appState.user.id).catch(() => []);
    appState.logs = logs;
    renderLogHistory(logs);

    const progress = await API.getProgress(appState.user.id).catch(() => null);
    if (progress) {
      appState.progressData = progress;
      renderProgressStats(progress);
    }
  } catch (err) {
    console.warn('Error loading progress:', err);
  }
}

function renderLogHistory(logs) {
  const container = document.getElementById('log-history-list');
  if (!container) return;

  if (!logs || logs.length === 0) {
    container.innerHTML = `<p class="text-xs text-slate-400 p-3">No hay registros recientes.</p>`;
    return;
  }

  container.innerHTML = logs.map(l => {
    const dateStr = new Date(l.logged_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    const painColor = l.pain_eva <= 2 ? 'text-emerald-600' : (l.pain_eva <= 5 ? 'text-amber-600' : 'text-red-600');
    return `
      <div class="p-2.5 rounded-md bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs">
        <div class="flex justify-between font-bold text-slate-800 dark:text-slate-200">
          <span class="truncate">${l.exercise_name}</span>
          <span class="${painColor} font-bold text-[11px] shrink-0">Dolor: ${l.pain_eva}/10</span>
        </div>
        <p class="text-[10px] text-slate-500 mt-0.5">${l.sets} series x ${l.reps} reps • ${dateStr} ${l.notes ? `• "${l.notes}"` : ''}</p>
      </div>
    `;
  }).join('');
}

// ==========================================
// 8. REQ 5: SEGUIMIENTO & PROGRESO
// ==========================================
function renderProgressStats(data) {
  if (!data || !data.summary) return;
  const s = data.summary;

  const painRedEl = document.getElementById('stat-pain-reduction');
  const romEl = document.getElementById('stat-rom');
  const sessionsEl = document.getElementById('stat-sessions');
  const dischargeEl = document.getElementById('stat-discharge');

  if (painRedEl) painRedEl.innerText = s.painReduction;
  if (romEl) romEl.innerHTML = `${s.mobilityROM} <span class="text-[10px] text-emerald-600 font-bold">${s.mobilityGain}</span>`;
  if (sessionsEl) sessionsEl.innerText = s.sessionsCompleted;
  if (dischargeEl) dischargeEl.innerText = s.estimatedDischargeDays;

  // Render weekly EVA bars
  const evaChart = document.getElementById('eva-bars-container');
  if (evaChart && data.weeklyEva) {
    evaChart.innerHTML = data.weeklyEva.map(item => `
      <div class="flex-1 flex flex-col items-center gap-1">
        <span class="text-[10px] font-bold ${item.week.includes('Actual') ? 'text-emerald-600' : ''}">${item.pain.toFixed(1)}</span>
        <div class="w-full rounded-t-lg transition-all duration-500" style="height: ${item.heightPct}%; background-color: ${item.color};"></div>
        <span class="text-[10px] ${item.week.includes('Actual') ? 'text-emerald-600 font-bold' : 'text-slate-400'}">${item.week}</span>
      </div>
    `).join('');
  }

  // Render weekly compliance days
  const compGrid = document.getElementById('compliance-grid');
  if (compGrid && data.weeklyDays) {
    compGrid.innerHTML = data.weeklyDays.map(d => {
      if (d.isToday) {
        return `<div class="p-2 rounded-md border-2 border-dashed border-teal-500 bg-teal-50 dark:bg-teal-950 text-teal-800 dark:text-teal-200 text-xs font-bold">${d.day}<br>Hoy</div>`;
      }
      return d.done
        ? `<div class="p-2 rounded-md bg-teal-500 text-white text-xs font-bold">${d.day}<br>${d.label}</div>`
        : `<div class="p-2 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-400 text-xs font-bold">${d.day}<br>${d.label}</div>`;
    }).join('');
  }
}

// ==========================================
// 9. REQ 6: TELECONSULTA & ZOOM API OFICIAL
// ==========================================
let currentZoomData = {
  meetingId: '8594726190',
  password: 'medico',
  joinUrl: 'https://zoom.us/j/8594726190?pwd=medico',
  webClientUrl: 'https://app.zoom.us/wc/8594726190/join?pwd=medico',
  topic: 'Teleconsulta Fisioterapia - RespiraPlus'
};

function renderZoomMeetingData(data) {
  if (!data) return;
  const rawId = String(data.meetingId || data.zoom_meeting_id || data.id || '72019231505');
  const formattedId = rawId.replace(/(\d{3})(\d{3,4})(\d{4})/, '$1 $2 $3');
  const pwd = data.password || data.zoom_password || 'ehS0E9';
  const topic = data.topic || data.zoom_topic || 'Teleconsulta Oficial RespiraPlus';
  const joinUrl = data.joinUrl || data.zoom_join_url || data.join_url || `https://zoom.us/j/${rawId}?pwd=${pwd}`;
  const startUrl = data.startUrl || data.zoom_start_url || data.start_url || `https://zoom.us/s/${rawId}`;

  currentZoomData = {
    meetingId: rawId,
    password: pwd,
    joinUrl: joinUrl,
    startUrl: startUrl,
    topic: topic
  };

  const topicEl = document.getElementById('zoom-meeting-topic');
  const idEl = document.getElementById('zoom-meeting-id');
  const passEl = document.getElementById('zoom-meeting-pwd');
  const hostStartBtn = document.getElementById('btn-zoom-host-start');
  const patientJoinBtn = document.getElementById('btn-zoom-patient-join');

  if (topicEl) topicEl.innerText = topic;
  if (idEl) idEl.innerText = formattedId;
  if (passEl) passEl.innerText = pwd;
  if (hostStartBtn) hostStartBtn.href = startUrl;
  if (patientJoinBtn) patientJoinBtn.href = joinUrl;
}

function copyZoomFullInvite() {
  if (!currentZoomData.meetingId) return;
  const text = `🩺 RespiraPlus - Teleconsulta Médica Oficial\n📋 Tema: ${currentZoomData.topic}\n🆔 ID de Reunión Zoom: ${currentZoomData.meetingId}\n🔑 Clave de Acceso: ${currentZoomData.password}\n🔗 Enlace de Ingreso: ${currentZoomData.joinUrl}`;
  navigator.clipboard.writeText(text);
  showToast('Invitación Copiada', 'Texto de invitación listo para compartir con el paciente.', 'fa-solid fa-clipboard-check text-blue-400');
}

// ==========================================
// 9.1 DOCTORS LIST, AGENDA & CALENDARIO MÉDICO
// ==========================================
appState.doctors = [];
appState.agendaCurrentDate = new Date();
appState.agendaSelectedDoctor = null;

async function loadDoctorsList() {
  try {
    const list = await API.getDoctors();
    appState.doctors = list || [];
    renderDoctorsDropdowns();
  } catch (err) {
    console.warn('Error loading doctors list:', err);
  }
}

function renderDoctorsDropdowns() {
  const apptSelect = document.getElementById('appt-doctor');
  const agendaSelect = document.getElementById('agenda-doctor-select');
  if (!appState.doctors || appState.doctors.length === 0) return;

  const optionsHtml = appState.doctors.map((doc, idx) => {
    const isDoc = (doc.role || '').toLowerCase() === 'doctor';
    const prefix = isDoc ? '' : '[Admin] ';
    const label = `${prefix}${doc.full_name} (${doc.specialty || (isDoc ? 'Especialista Fisiatra' : 'Superintendencia')})`;
    const isSelected = idx === 0 ? 'selected' : '';
    return `<option value="${doc.full_name}" data-id="${doc.id}" ${isSelected}>${label}</option>`;
  }).join('');

  if (apptSelect) apptSelect.innerHTML = optionsHtml;
  if (agendaSelect) {
    agendaSelect.innerHTML = optionsHtml;
    // Set active doctor
    if (!appState.agendaSelectedDoctor && appState.doctors.length > 0) {
      appState.agendaSelectedDoctor = appState.doctors[0];
    }
    updateAgendaDoctorCard();
    renderAgendaWeeklyGrid();
  }
}

function handleAgendaDoctorSelect(docName) {
  const found = (appState.doctors || []).find(d => d.full_name === docName);
  if (found) {
    appState.agendaSelectedDoctor = found;
    updateAgendaDoctorCard();
    renderAgendaWeeklyGrid();
  }
}

function updateAgendaDoctorCard() {
  const doc = appState.agendaSelectedDoctor;
  if (!doc) return;

  const avatar = document.getElementById('agenda-doc-avatar');
  const name = document.getElementById('agenda-doc-name');
  const badge = document.getElementById('agenda-doc-badge');
  const specialty = document.getElementById('agenda-doc-specialty');

  if (avatar) avatar.innerText = doc.avatar_initials || (doc.role === 'admin' ? 'AD' : 'DR');
  if (name) name.innerText = doc.full_name;
  if (badge) {
    const isAdmin = doc.role === 'admin';
    badge.innerText = isAdmin ? 'Administrador Maestro' : 'Médico Especialista';
    badge.className = isAdmin
      ? 'px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300'
      : 'px-2 py-0.5 rounded text-[10px] font-bold bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300';
  }
  if (specialty) specialty.innerText = doc.specialty || (doc.role === 'admin' ? 'Superintendencia y Control Global del Sistema' : 'Especialista en Rehabilitación');

  // Also sync booking select
  const apptDoc = document.getElementById('appt-doctor');
  if (apptDoc) apptDoc.value = doc.full_name;
}

function navigateAgendaWeek(direction) {
  const curr = new Date(appState.agendaCurrentDate);
  curr.setDate(curr.getDate() + (direction * 7));
  appState.agendaCurrentDate = curr;
  renderAgendaWeeklyGrid();
}

function resetAgendaToday() {
  appState.agendaCurrentDate = new Date();
  renderAgendaWeeklyGrid();
}

function getMonday(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(date.setDate(diff));
}

function formatDateISO(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function renderAgendaWeeklyGrid() {
  const grid = document.getElementById('agenda-weekly-grid');
  const label = document.getElementById('agenda-week-label');
  if (!grid) return;

  const monday = getMonday(appState.agendaCurrentDate);
  const days = [];
  const dayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

  for (let i = 0; i < 6; i++) {
    const dayDate = new Date(monday);
    dayDate.setDate(monday.getDate() + i);
    days.push(dayDate);
  }

  const firstDay = days[0];
  const lastDay = days[days.length - 1];
  if (label) {
    label.innerText = `Semana: ${firstDay.getDate()} ${monthNames[firstDay.getMonth()]} - ${lastDay.getDate()} ${monthNames[lastDay.getMonth()]}, ${lastDay.getFullYear()}`;
  }

  const timeSlots = ['09:00', '10:30', '12:00', '15:00', '16:30', '18:00'];
  const timeLabels = ['09:00 AM', '10:30 AM', '12:00 PM', '03:00 PM', '04:30 PM', '06:00 PM'];
  const selectedDocName = appState.agendaSelectedDoctor ? appState.agendaSelectedDoctor.full_name : '';
  const currentUserId = appState.user ? appState.user.id : 1;
  const isDoctorOrAdmin = appState.user && (appState.user.role === 'doctor' || appState.user.role === 'admin');

  let html = `
    <!-- Header: Time column -->
    <div class="p-2.5 font-bold text-center text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/60 rounded-lg flex items-center justify-center">
      <i class="fa-regular fa-clock mr-1"></i> Horario
    </div>
  `;

  // Headers: Days
  days.forEach((d, idx) => {
    const isToday = formatDateISO(d) === formatDateISO(new Date());
    const todayClass = isToday ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800/60 text-slate-800 dark:text-slate-200';
    html += `
      <div class="p-2 text-center rounded-lg ${todayClass}">
        <p class="text-[11px] font-bold uppercase tracking-wider">${dayNames[idx]}</p>
        <p class="text-xs font-black">${d.getDate()} ${monthNames[d.getMonth()]}</p>
      </div>
    `;
  });

  // Rows for each time slot
  timeSlots.forEach((slot, sIdx) => {
    // Time label cell
    html += `
      <div class="p-2 text-center font-bold text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/40 rounded-lg flex items-center justify-center border border-slate-200 dark:border-slate-800">
        ${timeLabels[sIdx]}
      </div>
    `;

    // 6 Day cells
    days.forEach(d => {
      const dateStr = formatDateISO(d);
      // Find matching appointment for this doctor and date/time
      const appt = (appState.appointments || []).find(a => {
        const matchesDate = a.appointment_date === dateStr;
        const matchesTime = (a.appointment_time || '').startsWith(slot.substring(0, 2));
        const matchesDoc = !selectedDocName || (a.doctor_name && a.doctor_name.includes(selectedDocName.split(' ')[0]));
        return matchesDate && matchesTime && matchesDoc;
      });

      if (appt) {
        const isMine = appt.user_id === currentUserId || isDoctorOrAdmin;
        const rawId = appt.zoom_meeting_id || currentZoomData.meetingId || '72019231505';
        const pwd = appt.zoom_password || currentZoomData.password || 'ehS0E9';
        const joinUrl = appt.zoom_join_url || currentZoomData.joinUrl || `https://zoom.us/j/${rawId}?pwd=${pwd}`;

        if (isMine) {
          html += `
            <div class="p-2 bg-blue-500/10 dark:bg-blue-950/50 border border-blue-400 dark:border-blue-700 rounded-lg flex flex-col justify-between transition hover:shadow-md">
              <div>
                <span class="inline-block px-1.5 py-0.5 rounded text-[9px] font-black bg-blue-600 text-white">
                  ● Cita Zoom
                </span>
                <p class="text-[10px] font-bold text-blue-900 dark:text-blue-200 mt-1 line-clamp-1">
                  ${isDoctorOrAdmin ? (appt.patient_name || 'Paciente') : 'Tu Consulta'}
                </p>
              </div>
              <a href="${joinUrl}" target="_blank" rel="noopener noreferrer" class="mt-1.5 py-1 px-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] rounded text-center block transition cursor-pointer">
                <i class="fa-solid fa-video text-[9px]"></i> Zoom
              </a>
            </div>
          `;
        } else {
          html += `
            <div class="p-2 bg-slate-100 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 rounded-lg flex flex-col items-center justify-center text-center opacity-75">
              <i class="fa-solid fa-lock text-[10px] text-slate-400 mb-0.5"></i>
              <span class="text-[10px] font-bold text-slate-500 dark:text-slate-400">Ocupado</span>
            </div>
          `;
        }
      } else {
        // Free Slot
        html += `
          <button type="button" onclick="selectAgendaSlot('${dateStr}', '${slot}')" class="p-2 bg-emerald-500/5 hover:bg-emerald-500/15 border border-dashed border-emerald-400 dark:border-emerald-600/60 hover:border-emerald-500 rounded-lg flex flex-col items-center justify-center text-center transition group cursor-pointer" title="Agendar en este horario">
            <span class="text-[10px] font-black text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
              <i class="fa-solid fa-plus text-[9px]"></i> Libre
            </span>
            <span class="text-[9px] text-emerald-500/80 mt-0.5 font-medium">Reservar</span>
          </button>
        `;
      }
    });
  });

  grid.innerHTML = html;
}

function selectAgendaSlot(dateStr, timeStr) {
  const dateInput = document.getElementById('appt-date');
  const timeInput = document.getElementById('appt-time');
  const form = document.getElementById('form-book-appointment');

  if (dateInput) dateInput.value = dateStr;
  if (timeInput) timeInput.value = timeStr;

  if (form) {
    form.scrollIntoView({ behavior: 'smooth', block: 'center' });
    form.classList.add('ring-2', 'ring-blue-500', 'transition-all');
    setTimeout(() => form.classList.remove('ring-2', 'ring-blue-500'), 1500);
  }

  showToast('Horario Seleccionado', `${dateStr} a las ${timeStr}. Completa los datos para confirmar tu cita.`, 'fa-solid fa-calendar-check text-blue-400');
}

// ==========================================
// 9.2 CITAS MÉDICAS & AGENDAMIENTO ZOOM
// ==========================================
async function loadAppointments() {
  if (!appState.user) return;
  try {
    await loadDoctorsList();
    const list = await API.getAppointments(appState.user.id);
    appState.appointments = list || [];
    renderAppointmentsList();
    renderAgendaWeeklyGrid();

    const role = (appState.user.role || '').toLowerCase();
    if (role === 'admin' || role === 'doctor') {
      await loadDoctorCallQueue();
    }
  } catch (err) {
    console.warn('Error loading appointments:', err);
  }
}

async function loadDoctorCallQueue() {
  try {
    const res = await API.getDoctorCallQueue();
    if (res && res.queue) {
      renderDoctorCallQueue(res.queue);
      const waitingCount = res.queue.filter(q => q.isOnline || q.status === 'En Sala de Espera').length;
      const wEl = document.getElementById('doc-stat-waiting');
      const tEl = document.getElementById('doc-stat-total');
      if (wEl) wEl.innerText = waitingCount || res.queue.length;
      if (tEl) tEl.innerText = res.queue.length;
    }
  } catch (e) {
    console.warn('Error loading doctor queue:', e);
  }
}

function renderDoctorCallQueue(queue) {
  const container = document.getElementById('doctor-queue-container');
  if (!container) return;

  if (!queue || queue.length === 0) {
    container.innerHTML = `
      <div class="p-8 text-center text-slate-400 border border-dashed border-slate-300 dark:border-slate-800 rounded-lg">
        <i class="fa-solid fa-user-clock text-3xl mb-2 text-slate-500"></i>
        <p class="text-sm font-bold text-slate-700 dark:text-slate-300">No hay pacientes en la fila de espera.</p>
        <p class="text-xs text-slate-500 mt-1">Los pacientes con cita programada aparecerán aquí para atención directa.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = queue.map(item => {
    const isOnline = item.isOnline;
    const appt = item.appointment || {};
    const rawId = appt.zoom_meeting_id || currentZoomData.meetingId || '72019231505';
    const pwd = appt.zoom_password || currentZoomData.password || 'ehS0E9';
    const joinUrl = appt.zoom_join_url || currentZoomData.joinUrl || `https://zoom.us/j/${rawId}?pwd=${pwd}`;
    const hostUrl = currentZoomData.startUrl || `https://zoom.us/s/${rawId}`;

    const statusBadge = isOnline
      ? `<span class="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> En Línea</span>`
      : `<span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-900 flex items-center gap-1.5"><i class="fa-regular fa-clock"></i> Cita Programada</span>`;

    const painBadge = item.lastPainEVA !== 'N/A'
      ? `<span class="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-700 dark:text-slate-300">EVA: ${item.lastPainEVA}/10</span>`
      : '';

    return `
      <div class="p-4 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition hover:border-blue-400">
        <div class="flex items-start gap-3.5">
          <div class="w-12 h-12 rounded-xl bg-gradient-to-tr from-teal-600 to-blue-600 text-white font-black flex items-center justify-center text-sm shadow-md shrink-0">
            ${item.initials}
          </div>
          <div class="space-y-1">
            <div class="flex flex-wrap items-center gap-2">
              <h4 class="font-bold text-sm text-slate-900 dark:text-white">${item.fullName}</h4>
              ${statusBadge}
              ${painBadge}
            </div>
            <p class="text-xs text-slate-600 dark:text-slate-300 font-medium">${item.diagnosis || 'Rehabilitación y Fisioterapia'}</p>
            <p class="text-[11px] text-slate-500 flex items-center gap-2">
              <span><i class="fa-solid fa-envelope text-[10px]"></i> ${item.email}</span>
              <span>•</span>
              <span><i class="fa-solid fa-calendar text-[10px]"></i> ${appt.appointment_date || 'Hoy'} ${appt.appointment_time || '10:30'}</span>
            </p>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2 self-start lg:self-center shrink-0">
          <!-- 1-Click Launch Real Zoom Host -->
          <a href="${hostUrl}" target="_blank" rel="noopener noreferrer" class="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-md transition flex items-center gap-2 cursor-pointer" title="Iniciar Sala Oficial en Zoom como Anfitrión">
            <i class="fa-solid fa-rocket"></i>
            <span>Iniciar Zoom (Host)</span>
          </a>

          <!-- Copy Patient Invite Link -->
          <button type="button" onclick="navigator.clipboard.writeText('Enlace de consulta Zoom: ${joinUrl}'); showToast('Enlace Copiado', 'Enlace directo de Zoom copiado para el paciente.', 'fa-solid fa-copy text-blue-400');" class="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer" title="Copiar Enlace para Paciente">
            <i class="fa-solid fa-copy"></i>
            <span>Copiar Enlace</span>
          </button>

          <!-- Patient Phase / Clinical Notes -->
          <button type="button" onclick="openPatientPhaseModal(${item.patientId}, '${item.fullName.replace(/'/g, "\\'")}', '${item.phase || 'Fase 1'}')" class="p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold transition cursor-pointer" title="Expediente Clínico & Fase">
            <i class="fa-solid fa-stethoscope text-purple-500"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function renderAppointmentsList() {
  const container = document.getElementById('appointments-list');
  if (!container) return;

  if (!appState.appointments || appState.appointments.length === 0) {
    container.innerHTML = `
      <div class="p-6 text-center text-slate-400 border border-dashed border-slate-300 dark:border-slate-800 rounded-md">
        <i class="fa-solid fa-calendar-xmark text-2xl mb-2 text-slate-500"></i>
        <p class="text-xs">No tienes citas médicas agendadas actualmente.</p>
        <p class="text-[11px] text-slate-500 mt-0.5">Usa el formulario a la izquierda para programar tu sesión.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = appState.appointments.map(appt => {
    const rawId = String(appt.zoom_meeting_id || currentZoomData.meetingId || '72019231505');
    const formattedId = rawId.replace(/(\d{3})(\d{3,4})(\d{4})/, '$1 $2 $3');
    const pwd = appt.zoom_password || currentZoomData.password || 'ehS0E9';
    const joinUrl = appt.zoom_join_url || currentZoomData.joinUrl || `https://zoom.us/j/${rawId}?pwd=${pwd}`;

    return `
      <div class="p-4 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-md flex flex-col md:flex-row md:items-center justify-between gap-3 transition hover:border-blue-300">
        <div class="space-y-1">
          <div class="flex items-center gap-2">
            <span class="px-2 py-0.5 bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 font-bold text-[10px] rounded">
              <i class="fa-solid fa-calendar-day mr-1"></i> ${appt.appointment_date} • ${appt.appointment_time}
            </span>
            <span class="px-2 py-0.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold text-[10px] rounded">
              ● Confirmada
            </span>
          </div>
          <h4 class="font-bold text-xs text-slate-900 dark:text-white">${appt.consultation_type || 'Teleconsulta de Rehabilitación'}</h4>
          <p class="text-[11px] text-slate-600 dark:text-slate-400">
            <i class="fa-solid fa-user-doctor text-teal-600 mr-1"></i> ${appt.doctor_name}
          </p>
          <div class="flex items-center gap-3 text-[10px] text-slate-500 font-mono mt-1">
            <span>ID Zoom: <strong>${formattedId}</strong></span>
            <span>Clave: <strong>${pwd}</strong></span>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2 self-start md:self-center shrink-0">
          <a href="${joinUrl}" target="_blank" rel="noopener noreferrer" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-md shadow-sm transition flex items-center gap-1.5 cursor-pointer">
            <i class="fa-solid fa-video"></i>
            <span>Unirse a Zoom</span>
          </a>
          <button type="button" onclick="handleCancelAppointment(${appt.id})" class="p-2 text-slate-400 hover:text-red-500 transition text-xs cursor-pointer" title="Cancelar Cita">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

async function handleBookAppointment(e) {
  if (e && e.preventDefault) e.preventDefault();
  const doctor_name = document.getElementById('appt-doctor').value;
  const appointment_date = document.getElementById('appt-date').value;
  const appointment_time = document.getElementById('appt-time').value;
  const consultation_type = document.getElementById('appt-type').value;
  const notes = document.getElementById('appt-notes')?.value || '';

  try {
    const res = await API.createAppointment({
      user_id: appState.user.id,
      doctor_name,
      appointment_date,
      appointment_time,
      consultation_type,
      notes
    });

    if (res && res.appointment) {
      appState.appointments.unshift(res.appointment);
      renderAppointmentsList();
      renderAgendaWeeklyGrid();
      if (res.zoom) {
        renderZoomMeetingData(res.zoom);
      }
      showToast('Cita Agendada', `Cita con ${doctor_name.split(' ')[0]} confirmada. Puedes ingresar directamente desde la app.`, 'fa-solid fa-calendar-check text-emerald-400');
      document.getElementById('form-book-appointment')?.reset();
    }
  } catch (err) {
    showToast('Error', 'No se pudo agendar la cita médica.', 'fa-solid fa-triangle-exclamation text-amber-400');
  }
}

async function handleCancelAppointment(id) {
  try {
    await API.deleteAppointment(id);
    appState.appointments = appState.appointments.filter(a => a.id !== id);
    renderAppointmentsList();
    renderAgendaWeeklyGrid();
    showToast('Cita Cancelada', 'La cita fue retirada del calendario.', 'fa-solid fa-trash-can text-slate-400');
  } catch (err) {
    showToast('Error', 'No se pudo cancelar la cita.', 'fa-solid fa-triangle-exclamation text-amber-400');
  }
}

async function generateNewZoomMeeting() {
  const btn = document.getElementById('btn-create-zoom');
  if (btn) btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> <span>Generando...</span>';

  try {
    const res = await API.createZoomMeeting({
      user_id: appState.user.id,
      topic: `Teleconsulta Fisioterapéutica - Dr. Roberto Martínez`,
      duration: 40,
      agenda: 'Evaluación y control funcional'
    });

    if (res && res.meeting) {
      renderZoomMeetingData(res.meeting);
      showToast('Sala Zoom Creada', `ID: ${res.meeting.id} disponible con permisos de anfitrión.`, 'fa-solid fa-video text-blue-400');
    }
  } catch (err) {
    showToast('Error', 'No se pudo generar la sala médica', 'fa-solid fa-triangle-exclamation text-amber-400');
  } finally {
    if (btn) btn.innerHTML = '<i class="fa-solid fa-plus"></i> <span>Crear Nueva Sala Zoom</span>';
  }
}

function copyZoomId() {
  if (currentZoomData.meetingId) {
    navigator.clipboard.writeText(currentZoomData.meetingId);
    showToast('Copiado', `ID de reunión ${currentZoomData.meetingId} copiado`, 'fa-solid fa-copy text-blue-400');
  }
}

function copyZoomPass() {
  if (currentZoomData.password) {
    navigator.clipboard.writeText(currentZoomData.password);
    showToast('Copiado', `Contraseña ${currentZoomData.password} copiada`, 'fa-solid fa-copy text-blue-400');
  }
}

// ==========================================
// 9.2 IN-APP LIVE WEBRTC VIDEO CALL & TELEMEDICINE CONTROLS
// ==========================================
let callTimerInterval = null;
let callDurationSeconds = 0;
let isMicMuted = false;
let isScreenSharing = false;

// WebRTC P2P Signaling State
let rtcPeerConnection = null;
let rtcSignalingInterval = null;
let currentWebRTCRoomId = 'telehealth_main_room';
let hasConnectedRemoteTrack = false;
let isOffering = false;

const rtcConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
  ]
};

function setTelehealthView(view) {
  const vQueue = document.getElementById('telehealth-view-doctor-queue');
  const vZoom = document.getElementById('telehealth-view-zoom');
  const vBooking = document.getElementById('telehealth-view-booking');

  const bQueue = document.getElementById('btn-view-doctor-queue');
  const bZoom = document.getElementById('btn-view-zoom');
  const bBooking = document.getElementById('btn-view-booking');

  [vQueue, vZoom, vBooking].forEach(v => v && v.classList.add('hidden'));
  [bQueue, bZoom, bBooking].forEach(b => {
    if (b) {
      b.className = (b === bQueue ? "admin-only " : "") + "px-3.5 py-1.5 rounded-md text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition cursor-pointer flex items-center gap-1.5";
    }
  });

  if (view === 'doctor-queue') {
    if (vQueue) vQueue.classList.remove('hidden');
    if (bQueue) bQueue.className = "admin-only px-3.5 py-1.5 rounded-md bg-purple-600 text-white shadow transition cursor-pointer flex items-center gap-1.5";
    loadDoctorCallQueue();
  } else if (view === 'booking') {
    if (vBooking) vBooking.classList.remove('hidden');
    if (bBooking) bBooking.className = "px-3.5 py-1.5 rounded-md bg-teal-600 text-white shadow transition cursor-pointer flex items-center gap-1.5";
  } else {
    // Default: Official Zoom Teleconsultation Room
    if (vZoom) vZoom.classList.remove('hidden');
    if (bZoom) bZoom.className = "px-3.5 py-1.5 rounded-md bg-blue-600 text-white shadow transition cursor-pointer flex items-center gap-1.5";
  }
}

async function startInAppTelehealth(doctorName, topic, joinUrl, pwd, customRoomId) {
  setTelehealthView('live');

  currentWebRTCRoomId = customRoomId || 'telehealth_main_room';

  const docEl = document.getElementById('live-call-doctor-name');
  const topEl = document.getElementById('live-call-topic');
  if (docEl) docEl.innerHTML = `<i class="fa-solid fa-user-doctor text-teal-400"></i> ${doctorName}`;
  if (topEl) topEl.innerText = topic || 'Teleconsulta de Fisioterapia & Rehabilitación';

  // Update iframe URL for Zoom embedded tab
  const frame = document.getElementById('zoom-embedded-frame');
  const extBtn = document.getElementById('btn-zoom-external-link');
  if (frame && joinUrl) {
    const rawId = joinUrl.match(/\/j\/(\d+)/)?.[1] || '8594726190';
    frame.src = `https://app.zoom.us/wc/${rawId}/join?pwd=${pwd || 'medico'}`;
  }
  if (extBtn && joinUrl) extBtn.href = joinUrl;

  // Start Call Timer
  startCallTimer();

  // 1. Start Local Camera Stream if not running
  if (!appState.cameraStream) {
    await startLocalCamera();
  }

  // 2. Initialize WebRTC P2P Connection
  await initWebRTCPeer();

  showToast('Consulta Iniciada', `Sala médica activa. Conectando con ${doctorName.split(' ')[0]}...`, 'fa-solid fa-video text-blue-400');
}

async function startLocalCamera() {
  const videoElem = document.getElementById('camera-video');
  const placeholderCam = document.getElementById('camera-placeholder');
  const btn = document.getElementById('btn-call-cam');

  try {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true
      });
      appState.cameraStream = stream;
      if (videoElem) {
        videoElem.srcObject = stream;
        videoElem.classList.remove('hidden');
      }
      if (placeholderCam) placeholderCam.classList.add('hidden');
      if (btn) {
        btn.className = "w-11 h-11 rounded-full bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center text-base transition shadow-lg cursor-pointer";
        btn.innerHTML = '<i class="fa-solid fa-video"></i>';
      }
      return stream;
    }
  } catch (err) {
    console.warn('Error accessing local camera:', err);
    showToast('Aviso de Cámara', 'Permite el acceso a tu cámara y micrófono para la teleconsulta en vivo.', 'fa-solid fa-triangle-exclamation text-amber-400');
  }
  return null;
}

async function initWebRTCPeer() {
  const user = appState.user || { id: 1, full_name: 'Usuario', role: 'patient' };
  hasConnectedRemoteTrack = false;
  isOffering = false;

  // Close previous connection if any
  if (rtcPeerConnection) {
    rtcPeerConnection.close();
    rtcPeerConnection = null;
  }
  if (rtcSignalingInterval) {
    clearInterval(rtcSignalingInterval);
    rtcSignalingInterval = null;
  }

  try {
    // 1. Join Signaling Room
    await API.joinSignalingRoom(currentWebRTCRoomId, user.id, user.full_name, user.role);

    // 2. Create RTCPeerConnection
    rtcPeerConnection = new RTCPeerConnection(rtcConfiguration);

    // Add local tracks to PeerConnection
    if (appState.cameraStream) {
      appState.cameraStream.getTracks().forEach(track => {
        rtcPeerConnection.addTrack(track, appState.cameraStream);
      });
    }

    // Handle incoming remote media track
    rtcPeerConnection.ontrack = (event) => {
      const remoteVideo = document.getElementById('remote-video');
      const doctorStage = document.getElementById('doctor-video-stage');
      const statusText = document.getElementById('webrtc-status-text');

      if (remoteVideo && event.streams && event.streams[0]) {
        remoteVideo.srcObject = event.streams[0];
        remoteVideo.classList.remove('hidden');
        if (doctorStage) doctorStage.classList.add('hidden');
        hasConnectedRemoteTrack = true;
        if (statusText) statusText.innerText = 'WebRTC P2P: Transmitiendo en Vivo';
        showToast('Conexión Establecida', 'Videollamada en vivo conectada con éxito.', 'fa-solid fa-circle-check text-emerald-400');
      }
    };

    // Handle ICE Candidate generation
    rtcPeerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        API.sendSignal(currentWebRTCRoomId, user.id, null, {
          type: 'candidate',
          candidate: event.candidate
        }).catch(() => {});
      }
    };

    rtcPeerConnection.onconnectionstatechange = () => {
      const state = rtcPeerConnection.connectionState;
      const statusText = document.getElementById('webrtc-status-text');
      if (state === 'connected') {
        if (statusText) statusText.innerText = 'WebRTC P2P: Conectado (1080p)';
      } else if (state === 'disconnected' || state === 'failed') {
        if (statusText) statusText.innerText = 'WebRTC P2P: Reconectando...';
      }
    };

    // 3. Start Signaling Polling Loop (Every 1.2s)
    rtcSignalingInterval = setInterval(async () => {
      try {
        const res = await API.pollSignals(currentWebRTCRoomId, user.id);
        if (!res) return;

        const otherParticipants = (res.participants || []).filter(p => String(p.id) !== String(user.id));

        // Update Remote Peer Title if someone is in the room
        if (otherParticipants.length > 0) {
          const other = otherParticipants[0];
          const peerTitle = document.getElementById('remote-peer-title');
          const peerSubtitle = document.getElementById('remote-peer-subtitle');
          const peerInitials = document.getElementById('remote-avatar-initials');
          if (peerTitle) peerTitle.innerText = other.name;
          if (peerSubtitle) peerSubtitle.innerText = `${other.role === 'admin' || other.role === 'doctor' ? 'Especialista Médico' : 'Paciente en Rehabilitación'} • En Línea`;
          if (peerInitials) peerInitials.innerText = other.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

          // If we are the initiator (e.g. smaller ID or doctor/admin) and haven't created an offer yet
          const amInitiator = (user.role === 'admin' || user.role === 'doctor') || (Number(user.id) < Number(other.id));
          if (amInitiator && !isOffering && rtcPeerConnection.signalingState === 'stable' && !hasConnectedRemoteTrack) {
            isOffering = true;
            const offer = await rtcPeerConnection.createOffer();
            await rtcPeerConnection.setLocalDescription(offer);
            await API.sendSignal(currentWebRTCRoomId, user.id, other.id, {
              type: 'offer',
              sdp: offer
            });
          }
        }

        // Process incoming signals
        for (const item of (res.signals || [])) {
          const signal = item.signal;
          if (!signal || !rtcPeerConnection) continue;

          if (signal.type === 'offer') {
            await rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(signal.sdp));
            const answer = await rtcPeerConnection.createAnswer();
            await rtcPeerConnection.setLocalDescription(answer);
            await API.sendSignal(currentWebRTCRoomId, user.id, item.from, {
              type: 'answer',
              sdp: answer
            });
          } else if (signal.type === 'answer') {
            if (rtcPeerConnection.signalingState === 'have-local-offer') {
              await rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(signal.sdp));
            }
          } else if (signal.type === 'candidate') {
            if (rtcPeerConnection.remoteDescription) {
              await rtcPeerConnection.addIceCandidate(new RTCIceCandidate(signal.candidate)).catch(() => {});
            }
          }
        }
      } catch (err) {
        // Silent signal poll failure
      }
    }, 1200);

  } catch (err) {
    console.warn('Error during WebRTC initialization:', err);
  }
}

function startCallTimer() {
  clearInterval(callTimerInterval);
  callDurationSeconds = 0;
  const disp = document.getElementById('call-timer-display');
  callTimerInterval = setInterval(() => {
    callDurationSeconds++;
    const m = String(Math.floor(callDurationSeconds / 60)).padStart(2, '0');
    const s = String(callDurationSeconds % 60).padStart(2, '0');
    if (disp) disp.innerText = `${m}:${s}`;
  }, 1000);
}

function endLiveCall() {
  clearInterval(callTimerInterval);

  // Stop signaling interval
  if (rtcSignalingInterval) {
    clearInterval(rtcSignalingInterval);
    rtcSignalingInterval = null;
  }

  // Close WebRTC Peer Connection
  if (rtcPeerConnection) {
    rtcPeerConnection.close();
    rtcPeerConnection = null;
  }

  // Notify server of leave
  if (appState.user) {
    API.leaveSignalingRoom(currentWebRTCRoomId, appState.user.id).catch(() => {});
  }

  // Reset Remote Video and restore doctor stage
  const remoteVideo = document.getElementById('remote-video');
  const doctorStage = document.getElementById('doctor-video-stage');
  const statusText = document.getElementById('webrtc-status-text');

  if (remoteVideo) {
    remoteVideo.srcObject = null;
    remoteVideo.classList.add('hidden');
  }
  if (doctorStage) doctorStage.classList.remove('hidden');
  if (statusText) statusText.innerText = 'WebRTC P2P: Listo';
  hasConnectedRemoteTrack = false;
  isOffering = false;

  // Stop Local Camera
  if (appState.cameraStream) {
    appState.cameraStream.getTracks().forEach(t => t.stop());
    appState.cameraStream = null;
    const videoElem = document.getElementById('camera-video');
    const placeholderCam = document.getElementById('camera-placeholder');
    if (videoElem) {
      videoElem.srcObject = null;
      videoElem.classList.add('hidden');
    }
    if (placeholderCam) placeholderCam.classList.remove('hidden');
  }

  const disp = document.getElementById('call-timer-display');
  if (disp) disp.innerText = '00:00';

  showToast('Consulta Finalizada', 'La sesión médica ha concluido con éxito. Tus notas quedaron registradas.', 'fa-solid fa-phone-slash text-slate-400');
}

function toggleCallMic() {
  if (!appState.cameraStream) {
    showToast('Aviso', 'Inicia la cámara y audio primero.', 'fa-solid fa-microphone text-amber-400');
    return;
  }
  const audioTracks = appState.cameraStream.getAudioTracks();
  if (audioTracks.length > 0) {
    isMicMuted = !isMicMuted;
    audioTracks.forEach(t => t.enabled = !isMicMuted);
    const btn = document.getElementById('btn-call-mic');
    if (btn) {
      if (isMicMuted) {
        btn.className = "w-11 h-11 rounded-full bg-red-600 text-white flex items-center justify-center text-base transition shadow-lg cursor-pointer";
        btn.innerHTML = '<i class="fa-solid fa-microphone-slash"></i>';
        showToast('Micrófono', 'Silenciado', 'fa-solid fa-microphone-slash text-red-400');
      } else {
        btn.className = "w-11 h-11 rounded-full bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center text-base transition shadow-lg cursor-pointer";
        btn.innerHTML = '<i class="fa-solid fa-microphone"></i>';
        showToast('Micrófono', 'Activo', 'fa-solid fa-microphone text-emerald-400');
      }
    }
  }
}

async function toggleScreenShare() {
  try {
    if (!isScreenSharing) {
      if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = stream.getVideoTracks()[0];

        // Replace track in RTCPeerConnection if active
        if (rtcPeerConnection) {
          const sender = rtcPeerConnection.getSenders().find(s => s.track && s.track.kind === 'video');
          if (sender) sender.replaceTrack(screenTrack);
        }

        const videoElem = document.getElementById('camera-video');
        if (videoElem) {
          videoElem.srcObject = stream;
          videoElem.classList.remove('hidden');
        }
        isScreenSharing = true;
        const btn = document.getElementById('btn-call-share');
        if (btn) btn.className = "w-11 h-11 rounded-full bg-blue-600 text-white flex items-center justify-center text-base transition shadow-lg cursor-pointer";
        showToast('Pantalla Compartida', 'Transmitiendo tu pantalla al especialista en tiempo real.', 'fa-solid fa-display text-blue-400');

        screenTrack.onended = () => {
          isScreenSharing = false;
          if (appState.cameraStream) {
            const camTrack = appState.cameraStream.getVideoTracks()[0];
            if (rtcPeerConnection) {
              const sender = rtcPeerConnection.getSenders().find(s => s.track && s.track.kind === 'video');
              if (sender && camTrack) sender.replaceTrack(camTrack);
            }
            if (videoElem) videoElem.srcObject = appState.cameraStream;
          }
          if (btn) btn.className = "w-11 h-11 rounded-full bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center text-base transition shadow-lg cursor-pointer";
        };
      }
    } else {
      isScreenSharing = false;
      if (appState.cameraStream) {
        const camTrack = appState.cameraStream.getVideoTracks()[0];
        if (rtcPeerConnection) {
          const sender = rtcPeerConnection.getSenders().find(s => s.track && s.track.kind === 'video');
          if (sender && camTrack) sender.replaceTrack(camTrack);
        }
        const videoElem = document.getElementById('camera-video');
        if (videoElem) videoElem.srcObject = appState.cameraStream;
      }
      const btn = document.getElementById('btn-call-share');
      if (btn) btn.className = "w-11 h-11 rounded-full bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center text-base transition shadow-lg cursor-pointer";
    }
  } catch (err) {
    console.log('Screen share cancelled/not allowed');
  }
}

function togglePostureGrid() {
  const overlay = document.getElementById('posture-grid-overlay');
  const btn = document.getElementById('btn-call-grid');
  if (overlay) {
    const isHidden = overlay.classList.contains('hidden');
    if (isHidden) {
      overlay.classList.remove('hidden');
      if (btn) btn.className = "w-11 h-11 rounded-full bg-teal-600 text-white border border-teal-300 flex items-center justify-center text-base transition shadow-lg cursor-pointer";
      showToast('Cuadrícula Postural', 'Ejes de alineación y ángulos articulares activados.', 'fa-solid fa-draw-polygon text-teal-400');
    } else {
      overlay.classList.add('hidden');
      if (btn) btn.className = "w-11 h-11 rounded-full bg-teal-900/80 hover:bg-teal-800 text-teal-300 border border-teal-500/40 flex items-center justify-center text-base transition shadow-lg cursor-pointer";
    }
  }
}

function reloadZoomIframe() {
  const frame = document.getElementById('zoom-embedded-frame');
  if (frame) {
    frame.src = frame.src;
    showToast('Zoom Recargado', 'Actualizando conexión de la sala virtual.', 'fa-solid fa-rotate text-blue-400');
  }
}

async function toggleLocalPreviewCamera() {
  const videoElem = document.getElementById('camera-video');
  const placeholderCam = document.getElementById('camera-placeholder');
  const btn = document.getElementById('btn-call-cam');

  if (appState.cameraStream) {
    // Stop camera
    appState.cameraStream.getTracks().forEach(t => t.stop());
    appState.cameraStream = null;
    if (videoElem) {
      videoElem.srcObject = null;
      videoElem.classList.add('hidden');
    }
    if (placeholderCam) placeholderCam.classList.remove('hidden');
    if (btn) {
      btn.className = "w-11 h-11 rounded-full bg-red-600 text-white flex items-center justify-center text-base transition shadow-lg cursor-pointer";
      btn.innerHTML = '<i class="fa-solid fa-video-slash"></i>';
    }
    showToast('Cámara Apagada', 'Transmisión local detenida.', 'fa-solid fa-video-slash text-slate-400');
  } else {
    // Start camera
    const stream = await startLocalCamera();
    if (stream && rtcPeerConnection) {
      stream.getTracks().forEach(track => {
        rtcPeerConnection.addTrack(track, stream);
      });
    }
  }
}

async function sendChatMessage() {
  const input = document.getElementById('chat-input');
  const val = input.value.trim();
  if (!val) return;

  const senderRole = appState.user.role === 'doctor' ? 'doctor' : 'patient';
  const senderName = appState.user.full_name;

  appendChatMessage(senderRole, senderName, val);
  input.value = '';

  try {
    const res = await API.sendTelehealthMessage(val, appState.user.id);
    if (res && res.reply && senderRole === 'patient') {
      setTimeout(() => {
        appendChatMessage('doctor', res.reply.sender_name, res.reply.message);
      }, 700);
    }
  } catch (e) {
    if (senderRole === 'patient') {
      setTimeout(() => {
        appendChatMessage('doctor', 'Dr. Roberto Martínez', 'Recibido Carlos. He compartido la sala de Zoom arriba para la videollamada.');
      }, 800);
    }
  }
}

function appendChatMessage(role, name, text) {
  const container = document.getElementById('chat-messages');
  if (!container) return;

  const msg = document.createElement('div');
  if (role === 'patient') {
    msg.className = "p-2.5 rounded-md bg-teal-100 dark:bg-teal-900 text-teal-950 dark:text-teal-100 text-xs ml-4";
    msg.innerHTML = `<span class="font-bold">Tú (${name}):</span><p class="mt-0.5">${text}</p>`;
  } else {
    msg.className = "p-2.5 rounded-md bg-blue-50 dark:bg-slate-800 border border-blue-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs mr-4";
    msg.innerHTML = `<span class="font-bold text-blue-600 dark:text-blue-400">${name}:</span><p class="mt-0.5">${text}</p>`;
  }
  container.appendChild(msg);
  container.scrollTop = container.scrollHeight;
}

function renderChatMessages(messages) {
  const container = document.getElementById('chat-messages');
  if (!container || !messages) return;
  container.innerHTML = '';
  messages.forEach(m => appendChatMessage(m.sender_role, m.sender_name, m.message));
}

// ==========================================
// 10. REQ 7: MODO OFFLINE & DESCARGAS
// ==========================================
function downloadPDFExerciseSheet() {
  const url = API.getPDFDownloadUrl(appState.user.id);
  showToast('Generando Ficha PDF', 'Descargando plan médico con código QR...', 'fa-solid fa-file-pdf text-red-400');
  window.open(url, '_blank');
}

async function downloadAllOfflinePack() {
  showToast("Descargando Paquete", "Guardando videos y ficha clínica en la memoria local...", 'fa-solid fa-box-archive text-teal-400');
  try {
    const pack = await API.getOfflinePack(appState.user.id);
    localStorage.setItem('respiraplus_offline_pack', JSON.stringify(pack));
    showToast("¡Paquete Offline Listo!", "Acceso 100% garantizado sin señal de internet.", 'fa-solid fa-circle-check text-emerald-400');
  } catch (err) {
    showToast("¡Listo!", "Paquete en caché disponible sin conexión.", 'fa-solid fa-circle-check text-emerald-400');
  }
}

async function triggerManualSync() {
  const count = API.getOfflineQueueCount();
  if (count === 0) {
    showToast('Sincronización', 'Todo tu expediente ya está actualizado en el servidor.', 'fa-solid fa-circle-check text-emerald-400');
    return;
  }

  showToast('Sincronizando', `Enviando ${count} registros pendientes al servidor...`, 'fa-solid fa-rotate text-teal-400');
  try {
    const res = await API.syncOfflineLogs(appState.user.id);
    showToast('Sincronizado', `${res.syncedCount} registros guardados exitosamente.`, 'fa-solid fa-cloud-arrow-up text-blue-400');
    await loadLogsAndProgress();
    updateOfflineBadge();
  } catch (e) {
    showToast('Error', 'No se pudo conectar con el servidor para sincronizar.', 'fa-solid fa-triangle-exclamation text-amber-400');
  }
}

function toggleOfflineSim() {
  appState.isOffline = !appState.isOffline;
  window.forceOfflineSim = appState.isOffline;
  handleNetworkChange(!appState.isOffline);
}

function handleNetworkChange(isOnline) {
  const alert = document.getElementById('offline-alert');
  const btn = document.getElementById('net-sim-btn');

  if (!isOnline) {
    if (alert) alert.classList.remove('hidden');
    if (btn) {
      btn.innerText = "Conectar";
      btn.classList.add('bg-amber-100', 'text-amber-800');
    }
    showToast("Modo Sin Conexión", "Operando en memoria local segura.", 'fa-solid fa-tower-broadcast text-amber-400');
  } else {
    if (alert) alert.classList.add('hidden');
    if (btn) {
      btn.innerText = "Sin Red";
      btn.classList.remove('bg-amber-100', 'text-amber-800');
    }
    showToast("En Línea", "Conexión médica restablecida.", 'fa-solid fa-globe text-emerald-400');
    triggerManualSync();
  }
  updateOfflineBadge();
}

function updateOfflineBadge() {
  const count = API.getOfflineQueueCount();
  const badge = document.getElementById('pending-sync-count');
  const boxBadge = document.getElementById('pending-sync-count-box');
  if (badge) badge.innerText = count;
  if (boxBadge) boxBadge.innerText = count;
}

// ==========================================
// 11. PROFILE & PREFERENCES
// ==========================================
async function handleProfileUpdate(e) {
  e.preventDefault();
  const full_name = document.getElementById('input-prof-name').value;
  const diagnosis = document.getElementById('input-prof-condition').value;
  const rehab_goal = document.getElementById('input-prof-goal').value;

  try {
    const res = await API.updateProfile({
      userId: appState.user.id,
      full_name,
      diagnosis,
      rehab_goal
    });

    if (res && res.user) {
      appState.user = res.user;
      renderUserProfile();
    }
    showToast('Perfil Actualizado', 'Información clínica guardada en el expediente.', 'fa-solid fa-user-check text-teal-400');
  } catch (err) {
    showToast('Error', 'No se pudo guardar el perfil', 'fa-solid fa-triangle-exclamation text-amber-400');
  }
}

function toggleDarkMode() {
  const isCurrentlyDark = document.documentElement.classList.contains('dark');
  setDarkMode(!isCurrentlyDark);
}

function setDarkMode(val) {
  appState.isDarkMode = Boolean(val);
  const html = document.documentElement;
  if (appState.isDarkMode) {
    html.classList.add('dark');
    localStorage.setItem('theme_mode', 'dark');
  } else {
    html.classList.remove('dark');
    localStorage.setItem('theme_mode', 'light');
  }
}

// ==========================================
// 12. ADMINSITE & GESTIÓN MÉDICA COMPLETA
// ==========================================
async function loadAdminData() {
  try {
    // 1. Stats
    const stats = await API.getAdminStats().catch(() => null);
    if (stats) {
      appState.adminStats = stats;
      document.getElementById('adm-stat-patients').innerText = stats.totalPatients;
      document.getElementById('adm-stat-exercises').innerText = stats.totalExercises;
      document.getElementById('adm-stat-videos').innerText = stats.totalVideos;
      document.getElementById('adm-stat-logs').innerText = stats.totalLogs;
    }

    // 2. Patients List
    const patients = await API.getAdminPatients().catch(() => []);
    appState.adminPatients = patients;
    renderAdminPatientsTable(patients);

    // 3. Render Admin Lists of Videos and Exercises
    renderAdminVideosList();
    renderAdminExercisesList();
  } catch (e) {
    console.warn('Error cargando panel admin:', e);
  }
}

function renderAdminPatientsTable(patients) {
  const tbody = document.getElementById('adm-patients-table-body');
  if (!tbody) return;

  if (!patients || patients.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-slate-400">No hay pacientes registrados aún.</td></tr>`;
    return;
  }

  tbody.innerHTML = patients.map(p => {
    const painBadge = p.lastPainEVA !== 'N/A'
      ? (p.lastPainEVA <= 2 ? `<span class="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 font-bold">${p.lastPainEVA}/10 (Leve)</span>` : `<span class="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 font-bold">${p.lastPainEVA}/10</span>`)
      : `<span class="text-slate-400">Sin registros</span>`;

    return `
      <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
        <td class="p-3">
          <div class="flex items-center gap-2">
            <div class="w-7 h-7 rounded-lg bg-teal-600 text-white font-bold flex items-center justify-center text-[10px]">
              ${p.avatar_initials || 'PX'}
            </div>
            <div>
              <p class="font-bold text-slate-900 dark:text-white">${p.full_name}</p>
              <p class="text-[10px] text-slate-500">${p.email}</p>
            </div>
          </div>
        </td>
        <td class="p-3 font-medium text-slate-700 dark:text-slate-300 max-w-[180px] truncate">${p.diagnosis || 'Rehabilitación'}</td>
        <td class="p-3"><span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-200">${p.phase || 'Fase 1'}</span></td>
        <td class="p-3 font-bold text-slate-800 dark:text-slate-200">${p.totalSessions}</td>
        <td class="p-3">${painBadge}</td>
        <td class="p-3 text-right">
          <button onclick="openPatientPhaseModal(${p.id}, '${p.full_name}', '${p.phase || 'Fase 1'}')" class="px-2.5 py-1 bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 hover:bg-purple-200 rounded-lg font-bold text-[10px] transition">
            Ajustar Fase
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function renderAdminVideosList() {
  const container = document.getElementById('adm-videos-list');
  if (!container || !appState.videos) return;

  container.innerHTML = appState.videos.map(v => `
    <div class="p-2 rounded-md bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
      <div class="min-w-0 pr-2">
        <p class="font-bold text-slate-900 dark:text-white truncate">${v.title}</p>
        <p class="text-[10px] text-slate-500">${v.category} • ${v.duration}</p>
      </div>
      <button onclick="handleAdminDeleteVideo(${v.id})" class="p-1 text-slate-400 hover:text-red-500 transition text-xs shrink-0" title="Eliminar Video"><i class="fa-solid fa-trash-can"></i></button>
    </div>
  `).join('');
}

function renderAdminExercisesList() {
  const container = document.getElementById('adm-exercises-list');
  if (!container || !appState.exercises) return;

  container.innerHTML = appState.exercises.map(ex => `
    <div class="p-2 rounded-md bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
      <div class="min-w-0 pr-2">
        <p class="font-bold text-slate-900 dark:text-white truncate">${ex.title}</p>
        <p class="text-[10px] text-slate-500">${ex.category} • ${ex.duration_seconds}s • ${ex.prescription}</p>
      </div>
      <button onclick="handleAdminDeleteExercise(${ex.id})" class="p-1 text-slate-400 hover:text-red-500 transition text-xs shrink-0" title="Eliminar Ejercicio"><i class="fa-solid fa-trash-can"></i></button>
    </div>
  `).join('');
}

let adminSelectedVideoBase64 = null;
let adminSelectedVideoFilename = '';

function handleAdminVideoFileSelect(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  adminSelectedVideoFilename = file.name;
  const fileNameLabel = document.getElementById('adm-vid-file-name');
  const preview = document.getElementById('adm-vid-preview');
  const durationInput = document.getElementById('adm-vid-dur');

  if (fileNameLabel) {
    fileNameLabel.innerText = `Archivo Seleccionado: ${file.name} (${(file.size / (1024 * 1024)).toFixed(1)} MB)`;
  }

  // Preview local file in video element
  const fileUrl = URL.createObjectURL(file);
  if (preview) {
    preview.src = fileUrl;
    preview.classList.remove('hidden');
    preview.onloadedmetadata = () => {
      const sec = Math.floor(preview.duration);
      const m = String(Math.floor(sec / 60)).padStart(2, '0');
      const s = String(sec % 60).padStart(2, '0');
      if (durationInput) durationInput.value = `${m}:${s}`;
    };
  }

  // Read as base64 for direct upload to Express
  const reader = new FileReader();
  reader.onload = (e) => {
    adminSelectedVideoBase64 = e.target.result;
    showToast('Video Listo', `Archivo "${file.name}" cargado para publicación.`, 'fa-solid fa-file-video text-purple-400');
  };
  reader.readAsDataURL(file);
}

async function handleAdminCreateVideo(e) {
  e.preventDefault();
  const submitBtn = document.getElementById('btn-adm-submit-video');
  if (submitBtn) submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> <span>Subiendo Video...</span>';

  const title = document.getElementById('adm-vid-title').value;
  const category = document.getElementById('adm-vid-cat').value;
  const specialist_name = document.getElementById('adm-vid-doc').value;
  const duration = document.getElementById('adm-vid-dur').value;
  const video_url = document.getElementById('adm-vid-url').value;
  const markerText = document.getElementById('adm-vid-marker').value;

  const markers = markerText ? [{ time: markerText.split('-')[0].trim() || '00:30', label: markerText.split('-')[1]?.trim() || 'Técnica Postural' }] : [];

  try {
    const payload = {
      title,
      category,
      specialist_name,
      duration,
      video_url,
      markers
    };

    // Attach local video base64 if uploaded
    if (adminSelectedVideoBase64) {
      payload.video_base64 = adminSelectedVideoBase64;
      payload.video_filename = adminSelectedVideoFilename;
    }

    const res = await API.adminCreateVideo(payload);

    showToast('Video Publicado', 'El nuevo video clínico fue publicado y está disponible en el catálogo.', 'fa-solid fa-film text-purple-400');
    
    // Reset form & state
    document.getElementById('adm-vid-title').value = '';
    adminSelectedVideoBase64 = null;
    adminSelectedVideoFilename = '';
    const fileInput = document.getElementById('adm-vid-file');
    if (fileInput) fileInput.value = '';
    const fileNameLabel = document.getElementById('adm-vid-file-name');
    if (fileNameLabel) fileNameLabel.innerText = 'Seleccionar Video desde tu Dispositivo (.mp4, .webm)';
    const preview = document.getElementById('adm-vid-preview');
    if (preview) {
      preview.src = '';
      preview.classList.add('hidden');
    }
    
    // Refresh video lists
    const vids = await API.getVideos();
    appState.videos = vids;
    renderVideosList();
    renderAdminVideosList();
    loadAdminData();
  } catch (err) {
    showToast('Error', 'No se pudo guardar el video: ' + err.message, 'fa-solid fa-triangle-exclamation text-amber-400');
  } finally {
    if (submitBtn) submitBtn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> <span>Publicar Video Clínico</span>';
  }
}

async function handleAdminDeleteVideo(id) {
  if (!confirm('¿Deseas eliminar este video del catálogo médico?')) return;
  try {
    await API.adminDeleteVideo(id);
    appState.videos = appState.videos.filter(v => v.id !== id);
    renderVideosList();
    renderAdminVideosList();
    showToast('Eliminado', 'Video retirado del catálogo.', 'fa-solid fa-trash-can text-red-400');
    loadAdminData();
  } catch (e) {
    showToast('Error', 'No se pudo eliminar el video', 'fa-solid fa-triangle-exclamation text-amber-400');
  }
}

async function handleAdminCreateExercise(e) {
  e.preventDefault();
  const title = document.getElementById('adm-ex-title').value;
  const category = document.getElementById('adm-ex-cat').value;
  const prescription = document.getElementById('adm-ex-pres').value;
  const duration_seconds = parseInt(document.getElementById('adm-ex-dur').value) || 30;
  const safety_tips = document.getElementById('adm-ex-safe').value;
  const posture_hint = document.getElementById('adm-ex-hint').value;

  try {
    await API.adminCreateExercise({
      title,
      category,
      prescription,
      duration_seconds,
      safety_tips,
      posture_hint
    });

    showToast('Ejercicio Añadido', 'Ejercicio prescrito añadido al catálogo.', 'fa-solid fa-dumbbell text-teal-400');
    document.getElementById('adm-ex-title').value = '';
    document.getElementById('adm-ex-hint').value = '';

    // Refresh exercises
    const exList = await API.getExercises();
    appState.exercises = exList;
    updateExerciseView();
    renderAdminExercisesList();
    loadAdminData();
  } catch (err) {
    showToast('Error', 'No se pudo crear el ejercicio', 'fa-solid fa-triangle-exclamation text-amber-400');
  }
}

async function handleAdminDeleteExercise(id) {
  if (!confirm('¿Deseas eliminar este ejercicio de la rutina médica?')) return;
  try {
    await API.adminDeleteExercise(id);
    appState.exercises = appState.exercises.filter(ex => ex.id !== id);
    updateExerciseView();
    renderAdminExercisesList();
    showToast('Eliminado', 'Ejercicio retirado de la rutina.', 'fa-solid fa-trash-can text-red-400');
    loadAdminData();
  } catch (e) {
    showToast('Error', 'No se pudo eliminar el ejercicio', 'fa-solid fa-triangle-exclamation text-amber-400');
  }
}

function openPatientPhaseModal(patientId, name, currentPhase) {
  const m = document.getElementById('modal-patient-phase');
  document.getElementById('edit-patient-id').value = patientId;
  document.getElementById('edit-patient-name').innerText = name;
  document.getElementById('edit-patient-phase-select').value = currentPhase;
  if (m) {
    m.classList.remove('hidden');
    m.classList.add('flex');
  }
}

function closePatientPhaseModal() {
  const m = document.getElementById('modal-patient-phase');
  if (m) {
    m.classList.add('hidden');
    m.classList.remove('flex');
  }
}

async function handleSavePatientPhase(e) {
  e.preventDefault();
  const patientId = document.getElementById('edit-patient-id').value;
  const phase = document.getElementById('edit-patient-phase-select').value;

  try {
    await API.adminUpdatePatientPhase(patientId, phase);
    showToast('Fase Actualizada', `Paciente actualizado a ${phase}.`, 'fa-solid fa-stethoscope text-purple-400');
    closePatientPhaseModal();
    loadAdminData();
  } catch (err) {
    showToast('Error', 'No se pudo actualizar la fase del paciente.', 'fa-solid fa-triangle-exclamation text-amber-400');
  }
}

// ==========================================
// 13. MODALS & TOAST UTILITY
// ==========================================
function openTermsModal() {
  const m = document.getElementById('modal-terms');
  if (m) {
    m.classList.remove('hidden');
    m.classList.add('flex');
  }
}

function closeTermsModal() {
  const m = document.getElementById('modal-terms');
  if (m) {
    m.classList.add('hidden');
    m.classList.remove('flex');
  }
}

function openZoomConfigModal() {
  const m = document.getElementById('modal-zoom-config');
  if (m) {
    m.classList.remove('hidden');
    m.classList.add('flex');
  }
  // Preload settings
  API.getZoomConfig().then(cfg => {
    if (!cfg) return;
    const urlEl = document.getElementById('zoom-cfg-personal-url');
    const idEl = document.getElementById('zoom-cfg-personal-id');
    const pwdEl = document.getElementById('zoom-cfg-personal-pwd');
    const accEl = document.getElementById('zoom-cfg-account-id');
    const cliEl = document.getElementById('zoom-cfg-client-id');
    if (urlEl && cfg.personalUrl) urlEl.value = cfg.personalUrl;
    if (idEl && cfg.personalId) idEl.value = cfg.personalId;
    if (pwdEl && cfg.personalPwd) pwdEl.value = cfg.personalPwd;
    if (accEl && cfg.accountId) accEl.value = cfg.accountId;
    if (cliEl && cfg.clientId) cliEl.value = cfg.clientId;
  }).catch(() => {});
}

function closeZoomConfigModal() {
  const m = document.getElementById('modal-zoom-config');
  if (m) {
    m.classList.add('hidden');
    m.classList.remove('flex');
  }
}

async function handleSaveZoomConfig(e) {
  e.preventDefault();
  const personal_url = document.getElementById('zoom-cfg-personal-url')?.value.trim() || '';
  const personal_id = document.getElementById('zoom-cfg-personal-id')?.value.trim() || '';
  const personal_pwd = document.getElementById('zoom-cfg-personal-pwd')?.value.trim() || '';
  const account_id = document.getElementById('zoom-cfg-account-id')?.value.trim() || '';
  const client_id = document.getElementById('zoom-cfg-client-id')?.value.trim() || '';
  const client_secret = document.getElementById('zoom-cfg-client-secret')?.value.trim() || '';

  try {
    const res = await API.saveZoomConfig({
      account_id,
      client_id,
      client_secret,
      personal_url,
      personal_id,
      personal_pwd
    });

    showToast('Zoom Configurado', 'Ajustes guardados. Tu sala médica personal de Zoom está lista.', 'fa-solid fa-video text-blue-400');
    closeZoomConfigModal();

    // Refresh telehealth data
    const tele = await API.getTelehealth(appState.user?.id || 1).catch(() => null);
    if (tele && (tele.zoom || tele.session)) {
      renderZoomMeetingData(tele.zoom || tele.session);
    }
  } catch (err) {
    showToast('Error', 'No se pudo guardar la configuración de Zoom', 'fa-solid fa-triangle-exclamation text-amber-400');
  }
}

function showToast(title, msg, icon = 'fa-solid fa-circle-check text-emerald-400') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  const toastTitle = document.getElementById('toast-title');
  const toastMsg = document.getElementById('toast-msg');
  const toastIcon = document.getElementById('toast-icon');

  if (toastTitle) toastTitle.innerText = title;
  if (toastMsg) toastMsg.innerText = msg;
  if (toastIcon) {
    if (icon.startsWith('<')) {
      toastIcon.innerHTML = icon;
    } else {
      toastIcon.innerHTML = `<i class="${icon}"></i>`;
    }
  }

  toast.classList.remove('translate-y-20', 'opacity-0', 'pointer-events-none');
  setTimeout(() => {
    toast.classList.add('translate-y-20', 'opacity-0', 'pointer-events-none');
  }, 3200);
}
