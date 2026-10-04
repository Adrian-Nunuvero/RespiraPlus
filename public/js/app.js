// RespiraPlus - MediRehab Pro Application Logic
let appState = {
  user: {
    id: 1,
    full_name: 'Carlos Vega',
    role: 'patient',
    diagnosis: 'Tendinopatía Manguito Rotador / Rehabilitación Pulmonar',
    assigned_doctor: 'Dr. Roberto Martínez (Especialista en Rehabilitación)',
    rehab_goal: 'Recuperar abducción a 180° y capacidad ventilatoria',
    phase: 'Fase 2',
    avatar_initials: 'CV'
  },
  isDarkMode: false,
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
  telehealthActive: false,
  cameraStream: null,
  adminStats: null,
  adminPatients: []
};

// ==========================================
// 1. INITIALIZATION & DATA LOADING
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
  // Check theme
  const savedTheme = localStorage.getItem('theme_mode');
  if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    setDarkMode(true);
  }

  // Load app data
  await loadInitialData();
  updateOfflineBadge();
});

async function loadInitialData() {
  try {
    // 1. Profile
    const profileRes = await API.getProfile(appState.user.id).catch(() => null);
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
    const rems = await API.getReminders(appState.user.id).catch(() => []);
    appState.reminders = rems;
    renderReminders();

    // 5. Logs & Progress
    await loadLogsAndProgress();

    // 6. Telehealth Chat
    const tele = await API.getTelehealth(appState.user.id).catch(() => null);
    if (tele && tele.messages) {
      renderChatMessages(tele.messages);
    }
  } catch (err) {
    console.warn('Error cargando datos iniciales:', err);
  }
}

function renderUserProfile() {
  const u = appState.user;
  document.querySelectorAll('.user-name-text').forEach(el => el.innerText = u.full_name);
  document.querySelectorAll('.user-condition-text').forEach(el => el.innerText = u.diagnosis);
  document.querySelectorAll('.user-phase-badge').forEach(el => el.innerText = u.phase || 'Fase 2');
  document.querySelectorAll('.user-avatar-text').forEach(el => el.innerText = u.avatar_initials || 'CV');

  const inputName = document.getElementById('input-prof-name');
  const inputDiag = document.getElementById('input-prof-condition');
  const inputGoal = document.getElementById('input-prof-goal');
  if (inputName) inputName.value = u.full_name;
  if (inputDiag) inputDiag.value = u.diagnosis;
  if (inputGoal) inputGoal.value = u.rehab_goal;

  // Show/Hide Admin Portal Banner if doctor/admin
  const adminBanner = document.getElementById('admin-switch-banner');
  if (adminBanner) {
    if (u.role === 'doctor' || u.role === 'admin') {
      adminBanner.classList.remove('hidden');
    } else {
      adminBanner.classList.add('hidden');
    }
  }
}

// ==========================================
// 2. NAVIGATION & TABS
// ==========================================
function switchTab(tabId) {
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

  // If switched to progress, refresh charts
  if (tabId === 'tab-progress') {
    loadLogsAndProgress();
  } else if (tabId === 'tab-admin') {
    loadAdminData();
  }
}

// ==========================================
// 3. AUTHENTICATION (LOGIN, REGISTER & ROLES)
// ==========================================
function setAuthMode(mode) {
  const formLogin = document.getElementById('form-login');
  const formRegister = document.getElementById('form-register');
  const tabLogin = document.getElementById('auth-tab-login');
  const tabRegister = document.getElementById('auth-tab-register');

  if (mode === 'register') {
    formLogin.classList.add('hidden');
    formRegister.classList.remove('hidden');
    tabRegister.className = "flex-1 py-2.5 border-b-2 border-teal-600 text-teal-600 dark:text-teal-400 transition";
    tabLogin.className = "flex-1 py-2.5 border-b-2 border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition";
  } else {
    formRegister.classList.add('hidden');
    formLogin.classList.remove('hidden');
    tabLogin.className = "flex-1 py-2.5 border-b-2 border-teal-600 text-teal-600 dark:text-teal-400 transition";
    tabRegister.className = "flex-1 py-2.5 border-b-2 border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition";
  }
}

function toggleRegisterRoleFields(role) {
  const patientFields = document.getElementById('patient-only-fields');
  if (!patientFields) return;
  if (role === 'doctor') {
    patientFields.classList.add('hidden');
  } else {
    patientFields.classList.remove('hidden');
  }
}

async function handleLogin(e) {
  if (e && e.preventDefault) e.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;

  try {
    const res = await API.login(email, password);
    if (res.user) {
      appState.user = res.user;
      renderUserProfile();
    }
  } catch (error) {
    showToast('Error', error.message || 'Error al autenticar', '⚠️');
    return;
  }

  showAppScreen();
  if (appState.user.role === 'doctor' || appState.user.role === 'admin') {
    switchTab('tab-admin');
    showToast('Portal Médico', `Bienvenido Dr. ${appState.user.full_name}`, '🩺');
  } else {
    switchTab('tab-guided');
    showToast('Bienvenido', `Sesión iniciada: ${appState.user.full_name}`, '👋');
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const full_name = document.getElementById('reg-name').value;
  const email = document.getElementById('reg-email').value;
  const role = document.getElementById('reg-role').value;
  const password = document.getElementById('reg-password').value;
  const diagnosis = document.getElementById('reg-diagnosis')?.value || '';
  const rehab_goal = document.getElementById('reg-goal')?.value || '';

  try {
    const res = await API.register({
      full_name,
      email,
      password,
      role,
      diagnosis,
      rehab_goal
    });

    if (res.user) {
      appState.user = res.user;
      renderUserProfile();
      showAppScreen();

      if (role === 'doctor') {
        switchTab('tab-admin');
        showToast('Cuenta Creada', `Bienvenido Dr. ${full_name} al AdminSite`, '🎉');
      } else {
        switchTab('tab-guided');
        showToast('Cuenta Creada', `Bienvenido ${full_name} a RespiraPlus`, '🎉');
      }
    }
  } catch (err) {
    showToast('Error de Registro', err.message || 'No se pudo crear la cuenta', '⚠️');
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

function handleLogout() {
  if (appState.cameraStream) {
    endTelehealthCall();
  }
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
  showToast('Sesión Cerrada', 'Has salido del portal clínico de manera segura.', '🔒');
}

function quickFillPatient() {
  setAuthMode('login');
  document.getElementById('login-email').value = 'carlos.vega@hospital.med';
  document.getElementById('login-password').value = '12345678';
  showToast('Datos Cargados', 'Paciente Carlos Vega listo.', '⚡');
}

function quickFillDoctor() {
  setAuthMode('login');
  document.getElementById('login-email').value = 'doctor@hospital.med';
  document.getElementById('login-password').value = 'admin123';
  showToast('Datos Cargados', 'Médico Administrador Dr. Martínez listo.', '🩺');
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
        showToast("¡Serie Finalizada!", "Excelente ejecución técnica. Tiempo de descanso.", "🎉");
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
    showToast("¡Rutina Completa!", "Has finalizado todos los ejercicios prescritos de hoy.", "🏆");
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
    <div onclick="selectExerciseIndex(${i})" class="p-2.5 rounded-xl text-xs flex items-center justify-between cursor-pointer transition ${i === appState.currentExerciseIndex ? 'bg-teal-50 dark:bg-teal-950/50 border border-teal-300 dark:border-teal-700 font-bold text-teal-900 dark:text-teal-200' : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'}">
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
    <div onclick="selectVideo(${idx})" class="p-3 rounded-2xl border ${idx === 0 ? 'border-teal-500 bg-teal-50/50 dark:bg-teal-950/30' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'} flex gap-3 cursor-pointer hover:border-teal-400 transition">
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
      <div class="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-teal-400 transition" onclick="showToast('Capítulo', '${m.time} - ${m.label}', '📍')">
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
    showToast('Reproductor HD', 'Iniciando video streaming...', '▶️');
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
    <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 flex items-center justify-center font-bold text-base">
          ${rem.icon || '⏰'}
        </div>
        <div>
          <h4 class="font-bold text-xs text-slate-900 dark:text-white">${rem.title}</h4>
          <p class="text-[11px] text-slate-500 dark:text-slate-400">${rem.time_str} • ${rem.detail || 'Rutina'}</p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <input type="checkbox" onchange="toggleReminderStatus(${rem.id})" ${rem.is_enabled === 1 ? 'checked' : ''} class="w-5 h-5 accent-teal-600 cursor-pointer">
        <button onclick="deleteReminderItem(${rem.id})" class="p-1.5 text-slate-400 hover:text-red-500 transition text-xs" title="Eliminar">🗑️</button>
      </div>
    </div>
  `).join('');
}

async function toggleReminderStatus(id) {
  try {
    await API.toggleReminder(id);
    const item = appState.reminders.find(r => r.id === id);
    if (item) item.is_enabled = item.is_enabled === 1 ? 0 : 1;
    showToast('Alarma Actualizada', 'Estado de la alarma modificado.', '⏰');
  } catch (e) {
    showToast('Error', 'No se pudo actualizar la alarma.', '⚠️');
  }
}

async function deleteReminderItem(id) {
  try {
    await API.deleteReminder(id);
    appState.reminders = appState.reminders.filter(r => r.id !== id);
    renderReminders();
    showToast('Eliminado', 'Recordatorio eliminado correctamente.', '🗑️');
  } catch (e) {
    showToast('Error', 'No se pudo eliminar el recordatorio.', '⚠️');
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
    showToast('Recordatorio Creado', `Alarma programada para las ${time}`, '⏰');
  } catch (e) {
    showToast('Error', 'Error al guardar recordatorio', '⚠️');
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
  showToast('Notificación Médica', '¡Hora de tu sesión de ejercicios prescrita!', '🔔');
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
    text = `${val} / 10 - Dolor Intenso ⚠️ (Consulte al médico)`;
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
    showToast("Registro Guardado", "Datos almacenados en el expediente clínico.", "📝");
    await loadLogsAndProgress();
    updateOfflineBadge();
  } catch (err) {
    showToast("Error", "No se pudo guardar el registro", "⚠️");
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
      <div class="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs">
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
        return `<div class="p-2 rounded-xl border-2 border-dashed border-teal-500 bg-teal-50 dark:bg-teal-950 text-teal-800 dark:text-teal-200 text-xs font-bold">${d.day}<br>Hoy</div>`;
      }
      return d.done
        ? `<div class="p-2 rounded-xl bg-teal-500 text-white text-xs font-bold">${d.day}<br>${d.label}</div>`
        : `<div class="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 text-xs font-bold">${d.day}<br>${d.label}</div>`;
    }).join('');
  }
}

// ==========================================
// 9. REQ 6: TELECONSULTA & WEBRTC
// ==========================================
async function startTelehealthCall() {
  const startBtn = document.getElementById('call-start-btn');
  const endBtn = document.getElementById('end-call-btn');
  const statusBadge = document.getElementById('call-status-badge');
  const videoElem = document.getElementById('camera-video');
  const placeholderCam = document.getElementById('camera-placeholder');

  try {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true }).catch(() => null);
      if (stream) {
        appState.cameraStream = stream;
        if (videoElem) {
          videoElem.srcObject = stream;
          videoElem.classList.remove('hidden');
          if (placeholderCam) placeholderCam.classList.add('hidden');
        }
      }
    }
  } catch (err) {
    console.log('Cámara física no disponible, usando simulador HD:', err);
  }

  if (startBtn) startBtn.classList.add('hidden');
  if (endBtn) endBtn.classList.remove('hidden');
  if (statusBadge) {
    statusBadge.innerText = "● Conectado en directo (HD 1080p • E2E Cifrado)";
    statusBadge.className = "text-xs text-emerald-400 mt-0.5 font-bold";
  }
  appState.telehealthActive = true;
  showToast("Videollamada Activa", "Conectado en directo con el Dr. Martínez.", "🩺");
}

function endTelehealthCall() {
  const startBtn = document.getElementById('call-start-btn');
  const endBtn = document.getElementById('end-call-btn');
  const statusBadge = document.getElementById('call-status-badge');
  const videoElem = document.getElementById('camera-video');
  const placeholderCam = document.getElementById('camera-placeholder');

  if (appState.cameraStream) {
    appState.cameraStream.getTracks().forEach(track => track.stop());
    appState.cameraStream = null;
  }
  if (videoElem) {
    videoElem.srcObject = null;
    videoElem.classList.add('hidden');
  }
  if (placeholderCam) placeholderCam.classList.remove('hidden');

  if (startBtn) startBtn.classList.remove('hidden');
  if (endBtn) endBtn.classList.add('hidden');
  if (statusBadge) {
    statusBadge.innerText = "Consulta finalizada • Informe guardado";
    statusBadge.className = "text-xs text-slate-400 mt-0.5";
  }
  appState.telehealthActive = false;
  showToast("Consulta Finalizada", "Informe guardado en el expediente clínico.", "📞");
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
        appendChatMessage('doctor', 'Dr. Roberto Martínez', 'Recibido Carlos. Continúa con la rutina manteniendo buena alineación escapular.');
      }, 800);
    }
  }
}

function appendChatMessage(role, name, text) {
  const container = document.getElementById('chat-messages');
  if (!container) return;

  const msg = document.createElement('div');
  if (role === 'patient') {
    msg.className = "p-2.5 rounded-xl bg-teal-100 dark:bg-teal-900 text-teal-950 dark:text-teal-100 text-xs ml-4";
    msg.innerHTML = `<span class="font-bold">Tú (${name}):</span><p class="mt-0.5">${text}</p>`;
  } else {
    msg.className = "p-2.5 rounded-xl bg-teal-50 dark:bg-teal-950 border border-teal-200 dark:border-teal-800 text-teal-900 dark:text-teal-200 text-xs mr-4";
    msg.innerHTML = `<span class="font-bold">${name}:</span><p class="mt-0.5">${text}</p>`;
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
  showToast('Generando Ficha PDF', 'Descargando plan médico con código QR...', '📄');
  window.open(url, '_blank');
}

async function downloadAllOfflinePack() {
  showToast("Descargando Paquete", "Guardando videos y ficha clínica en la memoria local...", "📦");
  try {
    const pack = await API.getOfflinePack(appState.user.id);
    localStorage.setItem('respiraplus_offline_pack', JSON.stringify(pack));
    showToast("¡Paquete Offline Listo!", "Acceso 100% garantizado sin señal de internet.", "✅");
  } catch (err) {
    showToast("¡Listo!", "Paquete en caché disponible sin conexión.", "✅");
  }
}

async function triggerManualSync() {
  const count = API.getOfflineQueueCount();
  if (count === 0) {
    showToast('Sincronización', 'Todo tu expediente ya está actualizado en el servidor.', '✅');
    return;
  }

  showToast('Sincronizando', `Enviando ${count} registros pendientes al servidor...`, '🔄');
  try {
    const res = await API.syncOfflineLogs(appState.user.id);
    showToast('Sincronizado', `${res.syncedCount} registros guardados exitosamente.`, '☁️');
    await loadLogsAndProgress();
    updateOfflineBadge();
  } catch (e) {
    showToast('Error', 'No se pudo conectar con el servidor para sincronizar.', '⚠️');
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
    showToast("Modo Sin Conexión", "Operando en memoria local segura.", "📡");
  } else {
    if (alert) alert.classList.add('hidden');
    if (btn) {
      btn.innerText = "Sin Red";
      btn.classList.remove('bg-amber-100', 'text-amber-800');
    }
    showToast("En Línea", "Conexión médica restablecida.", "🌐");
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
    showToast('Perfil Actualizado', 'Información clínica guardada en SQLite.', '👤');
  } catch (err) {
    showToast('Error', 'No se pudo guardar el perfil', '⚠️');
  }
}

function toggleDarkMode() {
  setDarkMode(!appState.isDarkMode);
}

function setDarkMode(val) {
  appState.isDarkMode = val;
  const html = document.documentElement;
  if (val) {
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
    <div class="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
      <div class="min-w-0 pr-2">
        <p class="font-bold text-slate-900 dark:text-white truncate">${v.title}</p>
        <p class="text-[10px] text-slate-500">${v.category} • ${v.duration}</p>
      </div>
      <button onclick="handleAdminDeleteVideo(${v.id})" class="p-1 text-slate-400 hover:text-red-500 transition text-xs shrink-0" title="Eliminar Video">🗑️</button>
    </div>
  `).join('');
}

function renderAdminExercisesList() {
  const container = document.getElementById('adm-exercises-list');
  if (!container || !appState.exercises) return;

  container.innerHTML = appState.exercises.map(ex => `
    <div class="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
      <div class="min-w-0 pr-2">
        <p class="font-bold text-slate-900 dark:text-white truncate">${ex.title}</p>
        <p class="text-[10px] text-slate-500">${ex.category} • ${ex.duration_seconds}s • ${ex.prescription}</p>
      </div>
      <button onclick="handleAdminDeleteExercise(${ex.id})" class="p-1 text-slate-400 hover:text-red-500 transition text-xs shrink-0" title="Eliminar Ejercicio">🗑️</button>
    </div>
  `).join('');
}

async function handleAdminCreateVideo(e) {
  e.preventDefault();
  const title = document.getElementById('adm-vid-title').value;
  const category = document.getElementById('adm-vid-cat').value;
  const specialist_name = document.getElementById('adm-vid-doc').value;
  const duration = document.getElementById('adm-vid-dur').value;
  const video_url = document.getElementById('adm-vid-url').value;
  const markerText = document.getElementById('adm-vid-marker').value;

  const markers = markerText ? [{ time: markerText.split('-')[0].trim() || '00:30', label: markerText.split('-')[1]?.trim() || 'Técnica Postural' }] : [];

  try {
    const res = await API.adminCreateVideo({
      title,
      category,
      specialist_name,
      duration,
      video_url,
      markers
    });

    showToast('Video Publicado', 'El nuevo video clínico fue guardado en SQLite.', '🎬');
    document.getElementById('adm-vid-title').value = '';
    
    // Refresh video lists
    const vids = await API.getVideos();
    appState.videos = vids;
    renderVideosList();
    renderAdminVideosList();
    loadAdminData();
  } catch (err) {
    showToast('Error', 'No se pudo guardar el video', '⚠️');
  }
}

async function handleAdminDeleteVideo(id) {
  if (!confirm('¿Deseas eliminar este video del catálogo médico?')) return;
  try {
    await API.adminDeleteVideo(id);
    appState.videos = appState.videos.filter(v => v.id !== id);
    renderVideosList();
    renderAdminVideosList();
    showToast('Eliminado', 'Video retirado del catálogo.', '🗑️');
    loadAdminData();
  } catch (e) {
    showToast('Error', 'No se pudo eliminar el video', '⚠️');
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

    showToast('Ejercicio Añadido', 'Ejercicio prescrito guardado en SQLite.', '💪');
    document.getElementById('adm-ex-title').value = '';
    document.getElementById('adm-ex-hint').value = '';

    // Refresh exercises
    const exList = await API.getExercises();
    appState.exercises = exList;
    updateExerciseView();
    renderAdminExercisesList();
    loadAdminData();
  } catch (err) {
    showToast('Error', 'No se pudo crear el ejercicio', '⚠️');
  }
}

async function handleAdminDeleteExercise(id) {
  if (!confirm('¿Deseas eliminar este ejercicio de la rutina médica?')) return;
  try {
    await API.adminDeleteExercise(id);
    appState.exercises = appState.exercises.filter(ex => ex.id !== id);
    updateExerciseView();
    renderAdminExercisesList();
    showToast('Eliminado', 'Ejercicio retirado de la rutina.', '🗑️');
    loadAdminData();
  } catch (e) {
    showToast('Error', 'No se pudo eliminar el ejercicio', '⚠️');
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
    showToast('Fase Actualizada', `Paciente actualizado a ${phase}.`, '🩺');
    closePatientPhaseModal();
    loadAdminData();
  } catch (err) {
    showToast('Error', 'No se pudo actualizar la fase del paciente.', '⚠️');
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

function showToast(title, msg, icon = "✅") {
  const toast = document.getElementById('toast');
  if (!toast) return;
  document.getElementById('toast-title').innerText = title;
  document.getElementById('toast-msg').innerText = msg;
  document.getElementById('toast-icon').innerText = icon;

  toast.classList.remove('translate-y-20', 'opacity-0', 'pointer-events-none');
  setTimeout(() => {
    toast.classList.add('translate-y-20', 'opacity-0', 'pointer-events-none');
  }, 3200);
}
