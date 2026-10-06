// REST API Client & Offline Sync Engine with Session & Role Management
const API = {
  baseUrl: '/api',
  sessionKey: 'respiraplus_session_v2',

  // Session storage helpers
  getSession() {
    try {
      const data = localStorage.getItem(this.sessionKey);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  },

  setSession(sessionData) {
    localStorage.setItem(this.sessionKey, JSON.stringify(sessionData));
  },

  clearSession() {
    localStorage.removeItem(this.sessionKey);
  },

  getToken() {
    const s = this.getSession();
    return s && s.token ? s.token : null;
  },

  getUser() {
    const s = this.getSession();
    return s && s.user ? s.user : null;
  },

  getUserId() {
    const u = this.getUser();
    return u && u.id ? u.id : 1;
  },

  // Network request wrapper
  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    // Inject session token and user ID if available
    const token = this.getToken();
    if (token) {
      defaultHeaders['Authorization'] = `Bearer ${token}`;
    }
    const user = this.getUser();
    if (user && user.id) {
      defaultHeaders['x-user-id'] = String(user.id);
    }

    options.headers = { ...defaultHeaders, ...options.headers };

    try {
      const res = await fetch(url, options);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `Error HTTP ${res.status}` }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      return await res.json();
    } catch (error) {
      console.warn(`[API Request Error] ${endpoint}:`, error.message);
      throw error;
    }
  },

  // 1. Auth & Session
  async login(email, password) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    if (data && data.token && data.user) {
      this.setSession({ token: data.token, user: data.user });
    }
    return data;
  },

  async register(userData) {
    const data = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
    if (data && data.token && data.user) {
      this.setSession({ token: data.token, user: data.user });
    }
    return data;
  },

  async getMe() {
    return this.request('/auth/me');
  },

  async logout() {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } catch (e) {
      // ignore
    } finally {
      this.clearSession();
    }
  },

  async getProfile(userId) {
    const uid = userId || this.getUserId();
    return this.request(`/user/profile?userId=${uid}`);
  },

  async updateProfile(profileData) {
    const uid = profileData.userId || this.getUserId();
    const res = await this.request('/user/profile', {
      method: 'PUT',
      body: JSON.stringify({ ...profileData, userId: uid })
    });
    if (res && res.user) {
      const s = this.getSession() || {};
      this.setSession({ ...s, user: res.user });
    }
    return res;
  },

  // 2. Exercises (Requerimiento 1)
  async getExercises() {
    return this.request('/exercises');
  },

  // 3. Videos (Requerimiento 2)
  async getVideos() {
    return this.request('/videos');
  },

  // 4. Reminders (Requerimiento 3)
  async getReminders(userId) {
    const uid = userId || this.getUserId();
    return this.request(`/reminders?userId=${uid}`);
  },

  async createReminder(reminderData) {
    const uid = reminderData.user_id || this.getUserId();
    return this.request('/reminders', {
      method: 'POST',
      body: JSON.stringify({ ...reminderData, user_id: uid })
    });
  },

  async toggleReminder(id) {
    return this.request(`/reminders/${id}/toggle`, {
      method: 'PUT'
    });
  },

  async deleteReminder(id) {
    return this.request(`/reminders/${id}`, {
      method: 'DELETE'
    });
  },

  // 5. Exercise Logs & Pain EVA (Requerimiento 4)
  async getLogs(userId) {
    const uid = userId || this.getUserId();
    return this.request(`/logs?userId=${uid}`);
  },

  async createLog(logData) {
    const uid = logData.user_id || this.getUserId();
    const payload = { ...logData, user_id: uid };

    // If offline or request fails, save locally
    if (!navigator.onLine || window.forceOfflineSim) {
      this.saveLogToOfflineQueue(payload);
      return { ...payload, id: 'local_' + Date.now(), isOfflineSaved: true };
    }

    try {
      return await this.request('/logs', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    } catch (err) {
      this.saveLogToOfflineQueue(payload);
      return { ...payload, id: 'local_' + Date.now(), isOfflineSaved: true };
    }
  },

  async deleteLog(id) {
    return this.request(`/logs/${id}`, {
      method: 'DELETE'
    });
  },


  // Offline Queue Management
  saveLogToOfflineQueue(logData) {
    const queue = JSON.parse(localStorage.getItem('offline_logs_queue') || '[]');
    queue.push({
      ...logData,
      logged_at: new Date().toISOString()
    });
    localStorage.setItem('offline_logs_queue', JSON.stringify(queue));
    console.log('[Offline Storage] Registro almacenado en la cola offline de memoria local');
  },

  getOfflineQueueCount() {
    const queue = JSON.parse(localStorage.getItem('offline_logs_queue') || '[]');
    return queue.length;
  },

  async syncOfflineLogs(userId) {
    const uid = userId || this.getUserId();
    const queue = JSON.parse(localStorage.getItem('offline_logs_queue') || '[]');
    if (queue.length === 0) {
      return { syncedCount: 0, message: 'No hay registros pendientes de sincronización.' };
    }

    const res = await this.request('/offline/sync', {
      method: 'POST',
      body: JSON.stringify({ userId: uid, pendingLogs: queue })
    });

    localStorage.removeItem('offline_logs_queue');
    return res;
  },

  // 6. Progress Analytics (Requerimiento 5)
  async getProgress(userId) {
    const uid = userId || this.getUserId();
    return this.request(`/progress?userId=${uid}`);
  },

  // 7. Telehealth & Zoom API (Requerimiento 6)
  async getTelehealth(userId) {
    const uid = userId || this.getUserId();
    return this.request(`/telehealth?userId=${uid}`);
  },

  async getDoctorCallQueue() {
    return this.request('/telehealth/doctor/queue');
  },

  async sendTelehealthMessage(message, userId) {
    const uid = userId || this.getUserId();
    return this.request('/telehealth/message', {
      method: 'POST',
      body: JSON.stringify({ user_id: uid, message })
    });
  },

  async updateTelehealthStatus(status, notes, userId) {
    const uid = userId || this.getUserId();
    return this.request('/telehealth/status', {
      method: 'POST',
      body: JSON.stringify({ user_id: uid, status, notes })
    });
  },

  async createZoomMeeting(meetingData) {
    return this.request('/telehealth/zoom/create', {
      method: 'POST',
      body: JSON.stringify(meetingData)
    });
  },

  async getZoomConfig() {
    return this.request('/telehealth/zoom/config');
  },

  async saveZoomConfig(configData) {
    return this.request('/telehealth/zoom/config', {
      method: 'POST',
      body: JSON.stringify(configData)
    });
  },

  // WebRTC Live Telehealth Signaling
  async joinSignalingRoom(roomId, userId, name, role) {
    return this.request('/telehealth/signal/join', {
      method: 'POST',
      body: JSON.stringify({ roomId, userId, name, role })
    });
  },

  async sendSignal(roomId, fromUserId, toUserId, signal) {
    return this.request('/telehealth/signal/send', {
      method: 'POST',
      body: JSON.stringify({ roomId, fromUserId, toUserId, signal })
    });
  },

  async pollSignals(roomId, userId) {
    return this.request(`/telehealth/signal/poll?roomId=${encodeURIComponent(roomId)}&userId=${encodeURIComponent(userId)}`);
  },

  async leaveSignalingRoom(roomId, userId) {
    return this.request('/telehealth/signal/leave', {
      method: 'POST',
      body: JSON.stringify({ roomId, userId })
    });
  },

  // Appointments & Doctors (Agendamiento de Citas & Especialistas)
  async getDoctors() {
    return this.request('/doctors');
  },

  async getAppointments(userId) {
    const uid = userId || this.getUserId();
    return this.request(`/appointments?userId=${uid}`);
  },

  async createAppointment(appointmentData) {
    const uid = appointmentData.user_id || this.getUserId();
    return this.request('/appointments', {
      method: 'POST',
      body: JSON.stringify({ ...appointmentData, user_id: uid })
    });
  },

  async deleteAppointment(id) {
    return this.request(`/appointments/${id}`, {
      method: 'DELETE'
    });
  },

  async getScheduleBlocks(doctorId) {
    return this.request(`/doctor/schedule-blocks?doctorId=${doctorId || this.getUserId()}`);
  },

  async toggleScheduleBlock(blockData) {
    const docId = blockData.doctor_id || this.getUserId();
    return this.request('/doctor/schedule-blocks/toggle', {
      method: 'POST',
      body: JSON.stringify({ ...blockData, doctor_id: docId })
    });
  },


  // 8. PDF Download & Offline Pack (Requerimiento 7)
  getPDFDownloadUrl(userId) {
    const uid = userId || this.getUserId();
    return `${this.baseUrl}/pdf/exercise-sheet?userId=${uid}&t=${Date.now()}`;
  },

  async getOfflinePack(userId) {
    const uid = userId || this.getUserId();
    return this.request(`/offline/pack?userId=${uid}`);
  },

  // 9. Admin Site API (Exclusivo para Administrador / Médico)
  async getAdminStats() {
    return this.request('/admin/stats');
  },

  async getAdminPatients() {
    return this.request('/admin/patients');
  },

  async adminCreateVideo(videoData) {
    return this.request('/admin/videos', {
      method: 'POST',
      body: JSON.stringify(videoData)
    });
  },

  async adminDeleteVideo(id) {
    return this.request(`/admin/videos/${id}`, {
      method: 'DELETE'
    });
  },

  async adminCreateExercise(exerciseData) {
    return this.request('/admin/exercises', {
      method: 'POST',
      body: JSON.stringify(exerciseData)
    });
  },

  async adminDeleteExercise(id) {
    return this.request(`/admin/exercises/${id}`, {
      method: 'DELETE'
    });
  },

  async adminUpdatePatientPhase(patientId, phase, rehab_goal) {
    return this.request(`/admin/patients/${patientId}/phase`, {
      method: 'PUT',
      body: JSON.stringify({ phase, rehab_goal })
    });
  }
};
