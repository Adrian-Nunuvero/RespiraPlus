const db = require('../database/db');

exports.getTelehealthStatus = (req, res) => {
  try {
    const userId = req.query.userId || 1;
    const session = db.prepare('SELECT * FROM telehealth_sessions WHERE user_id = ? ORDER BY id DESC LIMIT 1').get(userId);
    const messages = db.prepare('SELECT * FROM chat_messages WHERE user_id = ? ORDER BY created_at ASC').all(userId);

    res.json({
      session: session || {
        status: 'ready',
        doctor_name: 'Dr. Roberto Martínez',
        notes: 'En espera de conexión segura E2E'
      },
      messages
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
