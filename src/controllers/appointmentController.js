const db = require('../database/db');
const zoomService = require('../services/zoomService');

// Get list of all doctors and administrators
exports.getDoctors = (req, res) => {
  try {
    const doctors = db.prepare(`
      SELECT id, full_name, email, role, diagnosis as specialty, avatar_initials
      FROM users
      WHERE role IN ('doctor', 'admin')
      ORDER BY role ASC, full_name ASC
    `).all();
    res.json(doctors);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get appointments for user (or all if admin)
exports.getAppointments = (req, res) => {
  try {
    const userId = req.query.userId || (req.user ? req.user.id : 1);
    const role = (req.user && req.user.role ? req.user.role : '').toLowerCase();

    let appointments;
    if (role === 'doctor' || role === 'admin') {
      appointments = db.prepare(`
        SELECT a.*, u.full_name as patient_name, u.diagnosis as patient_diagnosis 
        FROM appointments a
        JOIN users u ON a.user_id = u.id
        ORDER BY a.appointment_date ASC, a.appointment_time ASC
      `).all();
    } else {
      appointments = db.prepare(`
        SELECT * FROM appointments 
        WHERE user_id = ? 
        ORDER BY appointment_date ASC, appointment_time ASC
      `).all(userId);
    }

    res.json(appointments);
  } catch (error) {
    console.error('Error fetching appointments:', error);
    res.status(500).json({ error: 'Error al obtener la lista de citas médicas.' });
  }
};

// Schedule a new appointment with Doctor & generate valid Zoom meeting
exports.createAppointment = async (req, res) => {
  try {
    const userId = req.body.user_id || (req.user ? req.user.id : 1);
    const { doctor_name, appointment_date, appointment_time, consultation_type, notes } = req.body;

    if (!appointment_date || !appointment_time) {
      return res.status(400).json({ error: 'La fecha y la hora de la cita son obligatorias.' });
    }

    const docName = doctor_name || 'Dr. Roberto Martínez (Especialista en Fisiatría)';
    const type = consultation_type || 'Teleconsulta de Fisioterapia & Rehabilitación';

    // Generate Zoom Room specifically for this appointment
    const zoomMeeting = await zoomService.createZoomMeeting({
      topic: `${type} - ${docName}`,
      duration: 45,
      agenda: notes || 'Sesión médica de supervisión y control de ejercicios'
    });

    const result = db.prepare(`
      INSERT INTO appointments (user_id, doctor_name, appointment_date, appointment_time, consultation_type, status, zoom_meeting_id, zoom_join_url, zoom_password, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      userId,
      docName,
      appointment_date,
      appointment_time,
      type,
      'confirmed',
      zoomMeeting.id,
      zoomMeeting.join_url,
      zoomMeeting.password,
      notes || 'Cita agendada exitosamente.'
    );

    const newAppt = db.prepare('SELECT * FROM appointments WHERE id = ?').get(result.lastInsertRowid);

    res.status(201).json({
      message: 'Cita agendada exitosamente con sala Zoom vinculada.',
      appointment: newAppt,
      zoom: zoomMeeting
    });
  } catch (error) {
    console.error('Error creating appointment:', error);
    res.status(500).json({ error: 'Error al agendar la cita médica.' });
  }
};

// Cancel an appointment
exports.deleteAppointment = (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM appointments WHERE id = ?').run(id);
    res.json({ message: 'Cita cancelada correctamente.' });
  } catch (error) {
    console.error('Error deleting appointment:', error);
    res.status(500).json({ error: 'Error al cancelar la cita médica.' });
  }
};
