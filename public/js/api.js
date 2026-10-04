// REST API Client & Offline Sync Engine
const API = {
  baseUrl: '/api',

  // Network request wrapper
  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    options.headers = { ...defaultHeaders, ...options.headers };

    try {
      const res = await fetch(url, options);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `Error ${res.status}` }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      return await res.json();
    } catch (error) {
      console.warn(`[API Request Error] ${endpoint}:`, error.message);
      throw error;
    }
  },

  // 1. Auth & Profile
  async login(email, password) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  },

  async register(userData) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  },

  async getProfile(userId = 1) {
    return this.request(`/user/profile?userId=${userId}`);
  },

  async updateProfile(profileData) {
    return this.request('/user/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData)
    });
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
  async getReminders(userId = 1) {
    return this.request(`/reminders?userId=${userId}`);
  },

  async createReminder(reminderData) {
    return this.request('/reminders', {
      method: 'POST',
      body: JSON.stringify(reminderData)
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
  async getLogs(userId = 1) {
    return this.request(`/logs?userId=${userId}`);
  },

  async createLog(logData) {
    // If offline or request fails, save locally
    if (!navigator.onLine || window.forceOfflineSim) {
      this.saveLogToOfflineQueue(logData);
      return { ...logData, id: 'local_' + Date.now(), isOfflineSaved: true };
    }

    try {
      return await this.request('/logs', {
        method: 'POST',
        body: JSON.stringify(logData)
      });
    } catch (err) {
      this.saveLogToOfflineQueue(logData);
      return { ...logData, id: 'local_' + Date.now(), isOfflineSaved: true };
    }
  },

  // Offline Queue Management
  saveLogToOfflineQueue(logData) {
    const queue = JSON.parse(localStorage.getItem('offline_logs_queue') || '[]');
    queue.push({
      ...logData,
      logged_at: new Date().toISOString()
    });
    localStorage.setItem('offline_logs_queue', JSON.stringify(queue));
    console.log('📦 Registro almacenado en la cola offline de memoria local');
  },

  getOfflineQueueCount() {
    const queue = JSON.parse(localStorage.getItem('offline_logs_queue') || '[]');
    return queue.length;
  },

  async syncOfflineLogs(userId = 1) {
    const queue = JSON.parse(localStorage.getItem('offline_logs_queue') || '[]');
    if (queue.length === 0) {
      return { syncedCount: 0, message: 'No hay registros pendientes de sincronización.' };
    }

    const res = await this.request('/offline/sync', {
      method: 'POST',
      body: JSON.stringify({ userId, pendingLogs: queue })
    });

    localStorage.removeItem('offline_logs_queue');
    return res;
  },

  // 6. Progress Analytics (Requerimiento 5)
  async getProgress(userId = 1) {
    return this.request(`/progress?userId=${userId}`);
  },

  // 7. Telehealth & Chat (Requerimiento 6)
  async getTelehealth(userId = 1) {
    return this.request(`/telehealth?userId=${userId}`);
  },

  async sendTelehealthMessage(message, userId = 1) {
    return this.request('/telehealth/message', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, message })
    });
  },

  async updateTelehealthStatus(status, notes, userId = 1) {
    return this.request('/telehealth/status', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, status, notes })
    });
  },

  // 8. PDF Download & Offline Pack (Requerimiento 7)
  getPDFDownloadUrl(userId = 1) {
    return `${this.baseUrl}/pdf/exercise-sheet?userId=${userId}&t=${Date.now()}`;
  },

  async getOfflinePack(userId = 1) {
    return this.request(`/offline/pack?userId=${userId}`);
  },

  // 9. Admin Site API
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
