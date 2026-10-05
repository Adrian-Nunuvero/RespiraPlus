const db = require('../database/db');
const zoomService = require('../services/zoomService');

exports.getTelehealthStatus = (req, res) => {
  try {
    const userId = req.query.userId || 1;
    let session = db.prepare('SELECT * FROM telehealth_sessions WHERE user_id = ? ORDER BY id DESC LIMIT 1').get(userId);
    const messages = db.prepare('SELECT * FROM chat_messages WHERE user_id = ? ORDER BY created_at ASC').all(userId);
    const zoomConfig = zoomService.getCredentials();

    if (!session) {
      session = {
        id: 1,
        user_id: userId,
        status: 'ready',
        doctor_name: 'Dr. Roberto Martínez',
        notes: 'En espera de conexión para teleconsulta médica en Zoom',
        zoom_meeting_id: '8594726190',
        zoom_password: 'medico',
        zoom_join_url: 'https://zoom.us/j/8594726190?pwd=medico',
        zoom_topic: 'Teleconsulta de Fisioterapia & Control Clínico'
      };
    }

    res.json({
      session,
      messages,
      zoom: {
        isConfigured: zoomConfig.isConfigured,
        meetingId: session.zoom_meeting_id || '8594726190',
        password: session.zoom_password || 'medico',
        joinUrl: session.zoom_join_url || 'https://zoom.us/j/8594726190?pwd=medico',
        startUrl: session.zoom_start_url || session.zoom_join_url || 'https://zoom.us/j/8594726190?pwd=medico',
        topic: session.zoom_topic || 'Teleconsulta Fisioterapia - RespiraPlus'
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getDoctorCallQueue = (req, res) => {
  try {
    const patients = db.prepare(`
      SELECT id, full_name, email, diagnosis, rehab_goal, phase, avatar_initials, assigned_doctor
      FROM users 
      WHERE role = 'patient' 
      ORDER BY id ASC
    `).all();

    const queue = patients.map(p => {
      const appt = db.prepare(`
        SELECT * FROM appointments 
        WHERE user_id = ? 
        ORDER BY appointment_date ASC, appointment_time ASC 
        LIMIT 1
      `).get(p.id);

      const lastLog = db.prepare(`
        SELECT pain_eva, logged_at 
        FROM exercise_logs 
        WHERE user_id = ? 
        ORDER BY logged_at DESC 
        LIMIT 1
      `).get(p.id);

      const mainRoom = signalingRooms.get('telehealth_main_room');
      const isOnline = mainRoom && mainRoom.participants.has(String(p.id));

      return {
        patientId: p.id,
        fullName: p.full_name,
        email: p.email,
        diagnosis: p.diagnosis,
        phase: p.phase,
        initials: p.avatar_initials || 'PX',
        isOnline: Boolean(isOnline),
        status: isOnline ? 'En Sala de Espera' : (appt ? 'Cita Agendada' : 'Disponible'),
        appointment: appt || {
          appointment_date: 'Hoy',
          appointment_time: '10:30',
          consultation_type: 'Control de Fisioterapia',
          zoom_join_url: 'https://zoom.us/j/8594726190?pwd=medico',
          zoom_meeting_id: '8594726190',
          zoom_password: 'medico'
        },
        lastPainEVA: lastLog ? lastLog.pain_eva : 'N/A'
      };
    });

    res.json({ queue });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createZoomMeeting = async (req, res) => {
  try {
    const userId = req.body.user_id || 1;
    const { topic = 'Teleconsulta Fisioterapéutica Médica', duration = 40, agenda } = req.body;

    // Call Zoom API Service
    const zoomMeeting = await zoomService.createZoomMeeting({ topic, duration, agenda });

    // Store in telehealth_sessions
    const insertSession = db.prepare(`
      INSERT INTO telehealth_sessions (user_id, doctor_name, status, notes, zoom_meeting_id, zoom_join_url, zoom_start_url, zoom_password, zoom_topic)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insertSession.run(
      userId,
      'Dr. Roberto Martínez',
      'active',
      'Sala Zoom creada y lista para videollamada',
      zoomMeeting.id,
      zoomMeeting.join_url,
      zoomMeeting.start_url || zoomMeeting.join_url,
      zoomMeeting.password,
      zoomMeeting.topic
    );

    const savedSession = db.prepare('SELECT * FROM telehealth_sessions WHERE id = ?').get(result.lastInsertRowid);

    res.status(201).json({
      message: 'Sala de Zoom creada exitosamente',
      meeting: zoomMeeting,
      session: savedSession
    });
  } catch (error) {
    console.error('Error creating Zoom meeting:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.getZoomConfig = (req, res) => {
  try {
    const config = zoomService.getCredentials();
    res.json({
      isConfigured: config.isConfigured,
      accountId: config.accountId ? '••••' + config.accountId.slice(-4) : '',
      clientId: config.clientId ? '••••' + config.clientId.slice(-4) : '',
      hasSecret: Boolean(config.clientSecret),
      personalUrl: config.personalUrl || '',
      personalId: config.personalId || '',
      personalPwd: config.personalPwd || ''
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.saveZoomConfig = (req, res) => {
  try {
    const { account_id, client_id, client_secret, personal_url, personal_id, personal_pwd } = req.body;
    
    const updated = zoomService.saveZoomConfig(
      account_id,
      client_id,
      client_secret,
      personal_url,
      personal_id,
      personal_pwd
    );

    // If personal URL or ID is set, also update latest telehealth session
    if (personal_url || personal_id) {
      const pId = personal_id || personal_url?.match(/\/j\/(\d+)/)?.[1] || 'Personal';
      const pUrl = personal_url || `https://zoom.us/j/${pId}`;
      const pPwd = personal_pwd || '';
      try {
        db.prepare(`
          UPDATE telehealth_sessions 
          SET zoom_meeting_id = ?, zoom_join_url = ?, zoom_start_url = ?, zoom_password = ?
        `).run(pId, pUrl, `https://zoom.us/s/${pId}`, pPwd);
      } catch (e) {}
    }

    res.json({
      message: 'Configuración de Zoom guardada exitosamente',
      isConfigured: updated.isConfigured
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.sendMessage = (req, res) => {
  try {
    const { user_id = 1, message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'El mensaje no puede estar vacío' });
    }

    // Insert patient message
    const insert = db.prepare(`
      INSERT INTO chat_messages (session_id, user_id, sender_role, sender_name, message)
      VALUES (?, ?, ?, ?, ?)
    `);

    const resultPatient = insert.run(1, user_id, 'patient', 'Carlos Vega', message.trim());
    const patientMsg = db.prepare('SELECT * FROM chat_messages WHERE id = ?').get(resultPatient.lastInsertRowid);

    // Doctor clinical automated responses based on patient context
    let doctorReplyText = 'Entendido. Continuemos con el protocolo manteniendo el control postural y la respiración diafragmática.';
    const lower = message.toLowerCase();
    if (lower.includes('dolor') || lower.includes('molestia')) {
      doctorReplyText = 'Si el dolor pasa de 3/10 en la escala EVA, detén la repetición y aplica la compresa fría durante 10 minutos.';
    } else if (lower.includes('bien') || lower.includes('mejor') || lower.includes('facil')) {
      doctorReplyText = 'Excelente evolución. Para la siguiente sesión podremos evaluar avanzar a la siguiente fase de resistencia.';
    } else if (lower.includes('hola') || lower.includes('buenas')) {
      doctorReplyText = '¡Hola Carlos! Estoy revisando tus métricas en tiempo real. ¿Cómo sientes la movilidad escapular hoy?';
    } else if (lower.includes('zoom') || lower.includes('videollamada') || lower.includes('camara') || lower.includes('enlace')) {
      doctorReplyText = 'He habilitado el botón para ingresar a la sala de Zoom. Pulsa "Unirse a Zoom" cuando estés listo.';
    }

    const resultDoc = insert.run(1, user_id, 'doctor', 'Dr. Roberto Martínez', doctorReplyText);
    const doctorMsg = db.prepare('SELECT * FROM chat_messages WHERE id = ?').get(resultDoc.lastInsertRowid);

    res.json({
      sent: patientMsg,
      reply: doctorMsg
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateSessionStatus = (req, res) => {
  try {
    const { status, notes } = req.body;
    const userId = req.body.user_id || 1;

    db.prepare(`
      UPDATE telehealth_sessions
      SET status = ?,
          notes = COALESCE(?, notes)
      WHERE user_id = ?
    `).run(status, notes, userId);

    res.json({ message: 'Estado de consulta actualizado', status });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ==========================================
// WebRTC P2P Signaling Manager for In-App Live Call
// ==========================================
const signalingRooms = new Map();

function getOrCreateRoom(roomId) {
  if (!signalingRooms.has(roomId)) {
    signalingRooms.set(roomId, {
      participants: new Map(),
      signals: []
    });
  }
  return signalingRooms.get(roomId);
}

// Clean up inactive rooms and stale signals every 20s
setInterval(() => {
  const now = Date.now();
  for (const [roomId, room] of signalingRooms.entries()) {
    // Keep signals max 30s
    room.signals = room.signals.filter(s => now - s.timestamp < 30000);
    // Remove participants inactive for > 30s
    for (const [uid, p] of room.participants.entries()) {
      if (now - p.lastSeen > 30000) {
        room.participants.delete(uid);
      }
    }
    if (room.participants.size === 0 && room.signals.length === 0) {
      signalingRooms.delete(roomId);
    }
  }
}, 20000);

exports.joinRoom = (req, res) => {
  try {
    const { roomId = 'telehealth_main_room', userId, name, role } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'userId es requerido para unirse a la sala' });
    }

    const room = getOrCreateRoom(roomId);
    room.participants.set(String(userId), {
      id: String(userId),
      name: name || (role === 'doctor' || role === 'admin' ? 'Dr. Roberto Martínez' : 'Paciente'),
      role: role || 'patient',
      lastSeen: Date.now()
    });

    const participantList = Array.from(room.participants.values());
    res.json({
      success: true,
      roomId,
      participants: participantList
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.sendSignal = (req, res) => {
  try {
    const { roomId = 'telehealth_main_room', fromUserId, toUserId, signal } = req.body;
    if (!fromUserId || !signal) {
      return res.status(400).json({ error: 'fromUserId y signal son obligatorios' });
    }

    const room = getOrCreateRoom(roomId);
    room.signals.push({
      from: String(fromUserId),
      to: toUserId ? String(toUserId) : null,
      signal,
      timestamp: Date.now()
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.pollSignals = (req, res) => {
  try {
    const roomId = req.query.roomId || 'telehealth_main_room';
    const userId = String(req.query.userId || '');

    const room = getOrCreateRoom(roomId);
    if (userId && room.participants.has(userId)) {
      room.participants.get(userId).lastSeen = Date.now();
    }

    // Filter signals destined for this user (or broadcast) and not sent by this user
    const pending = [];
    const remaining = [];

    for (const s of room.signals) {
      if (s.from !== userId && (s.to === null || s.to === userId)) {
        pending.push({ from: s.from, signal: s.signal });
      } else {
        remaining.push(s);
      }
    }

    room.signals = remaining;
    const participantList = Array.from(room.participants.values());

    res.json({
      signals: pending,
      participants: participantList
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.leaveRoom = (req, res) => {
  try {
    const { roomId = 'telehealth_main_room', userId } = req.body;
    const room = signalingRooms.get(roomId);
    if (room && userId) {
      room.participants.delete(String(userId));
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
