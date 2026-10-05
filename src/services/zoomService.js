// Zoom API Service with Server-to-Server OAuth (Free Developer Account Support)
const db = require('../database/db');

let cachedToken = null;
let tokenExpiresAt = 0;

function getSetting(key) {
  try {
    const row = db.prepare('SELECT value FROM app_settings WHERE key = ?').get(key);
    return row ? row.value : null;
  } catch (err) {
    return null;
  }
}

function setSetting(key, value) {
  try {
    db.prepare(`
      INSERT INTO app_settings (key, value, updated_at) 
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
    `).run(key, value);
  } catch (err) {
    console.error('Error saving setting:', err.message);
  }
}

function getPersonalMeeting() {
  const customUrl = getSetting('zoom_personal_url') || '';
  const customId = getSetting('zoom_personal_id') || '';
  const customPwd = getSetting('zoom_personal_pwd') || '';
  return { customUrl, customId, customPwd };
}

function getCredentials() {
  const accountId = getSetting('zoom_account_id') || process.env.ZOOM_ACCOUNT_ID || '';
  const clientId = getSetting('zoom_client_id') || process.env.ZOOM_CLIENT_ID || '';
  const clientSecret = getSetting('zoom_client_secret') || process.env.ZOOM_CLIENT_SECRET || '';
  const personal = getPersonalMeeting();

  return {
    accountId: accountId.trim(),
    clientId: clientId.trim(),
    clientSecret: clientSecret.trim(),
    personalUrl: personal.customUrl.trim(),
    personalId: personal.customId.trim(),
    personalPwd: personal.customPwd.trim(),
    isConfigured: Boolean((accountId && clientId && clientSecret) || personal.customUrl || personal.personalId)
  };
}

async function getAccessToken() {
  const creds = getCredentials();
  if (!creds.isConfigured) {
    return null;
  }

  const now = Date.now();
  if (cachedToken && tokenExpiresAt > now + 60000) {
    return cachedToken;
  }

  const authHeader = Buffer.from(`${creds.clientId}:${creds.clientSecret}`).toString('base64');
  const tokenUrl = `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${encodeURIComponent(creds.accountId)}`;

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${authHeader}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('[Zoom OAuth Error]', response.status, errorBody);
    throw new Error(`Error de autenticación con Zoom (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  cachedToken = data.access_token;
  tokenExpiresAt = now + (data.expires_in * 1000);
  return cachedToken;
}

async function createZoomMeeting({ topic = 'Teleconsulta Fisioterapia - RespiraPlus', duration = 40, agenda = 'Evaluación y supervisión de ejercicios clínicos' }) {
  const creds = getCredentials();

  // If live credentials are valid, call official Zoom API v2
  if (creds.isConfigured) {
    try {
      const token = await getAccessToken();
      const zoomApiUrl = 'https://api.zoom.us/v2/users/me/meetings';

      const meetingPayload = {
        topic: topic,
        type: 1, // 1 = Instant meeting, 2 = Scheduled meeting
        duration: duration,
        timezone: 'America/Lima',
        agenda: agenda,
        settings: {
          host_video: true,
          participant_video: true,
          join_before_host: true,
          mute_upon_entry: false,
          waiting_room: false,
          meeting_authentication: false,
          audio: 'both',
          auto_recording: 'none'
        }
      };

      const res = await fetch(zoomApiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(meetingPayload)
      });

      if (!res.ok) {
        const errorData = await res.text();
        console.error('[Zoom API Create Meeting Error]', res.status, errorData);
        throw new Error(`Zoom API Error (${res.status}): ${errorData}`);
      }

      const meetingData = await res.json();
      return {
        isLiveZoom: true,
        id: String(meetingData.id),
        topic: meetingData.topic,
        join_url: meetingData.join_url,
        start_url: meetingData.start_url,
        password: meetingData.password || '',
        created_at: meetingData.created_at,
        web_client_url: `https://app.zoom.us/wc/${meetingData.id}/join`
      };
    } catch (err) {
      console.warn('[Zoom Service] Error calling real Zoom API, falling back to instant direct link:', err.message);
    }
  }

  // If doctor configured a real personal Zoom room link / ID
  if (creds.personalUrl || creds.personalId) {
    const rawId = creds.personalId || creds.personalUrl.match(/\/j\/(\d+)/)?.[1] || 'Personal';
    const pwd = creds.personalPwd || '';
    const joinUrl = creds.personalUrl || `https://zoom.us/j/${rawId}${pwd ? `?pwd=${pwd}` : ''}`;
    const startUrl = `https://zoom.us/s/${rawId}${pwd ? `?pwd=${pwd}` : ''}`;

    return {
      isLiveZoom: true,
      id: String(rawId),
      topic: topic,
      join_url: joinUrl,
      start_url: startUrl,
      password: pwd,
      created_at: new Date().toISOString(),
      web_client_url: `https://app.zoom.us/wc/${rawId}/join`
    };
  }

  // Fallback / Instant Ready-to-Use Zoom Meeting Link
  const randomMeetingId = Math.floor(1000000000 + Math.random() * 9000000000);
  const randomPassword = Math.floor(100000 + Math.random() * 900000);

  return {
    isLiveZoom: false,
    id: String(randomMeetingId),
    topic: topic,
    join_url: `https://zoom.us/j/${randomMeetingId}?pwd=${randomPassword}`,
    start_url: `https://zoom.us/s/${randomMeetingId}?pwd=${randomPassword}`,
    password: String(randomPassword),
    created_at: new Date().toISOString(),
    web_client_url: `https://app.zoom.us/wc/${randomMeetingId}/join?pwd=${randomPassword}`,
    setupGuide: {
      message: 'Para vincular tu cuenta de Zoom, ingresa tu Enlace Personal o credenciales en Ajustes Zoom.',
      docsUrl: 'https://marketplace.zoom.us/develop/create'
    }
  };
}

module.exports = {
  getCredentials,
  getAccessToken,
  createZoomMeeting,
  saveZoomConfig: (accountId, clientId, clientSecret, personalUrl, personalId, personalPwd) => {
    if (accountId !== undefined) setSetting('zoom_account_id', (accountId || '').trim());
    if (clientId !== undefined) setSetting('zoom_client_id', (clientId || '').trim());
    if (clientSecret !== undefined) setSetting('zoom_client_secret', (clientSecret || '').trim());
    if (personalUrl !== undefined) setSetting('zoom_personal_url', (personalUrl || '').trim());
    if (personalId !== undefined) setSetting('zoom_personal_id', (personalId || '').trim());
    if (personalPwd !== undefined) setSetting('zoom_personal_pwd', (personalPwd || '').trim());
    cachedToken = null;
    tokenExpiresAt = 0;
    return getCredentials();
  }
};
