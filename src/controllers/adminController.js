const db = require('../database/db');

exports.getAdminStats = (req, res) => {
  try {
    const totalPatients = db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'patient'").get().c;
    const totalExercises = db.prepare("SELECT COUNT(*) as c FROM exercises").get().c;
    const totalVideos = db.prepare("SELECT COUNT(*) as c FROM videos").get().c;
    const totalLogs = db.prepare("SELECT COUNT(*) as c FROM exercise_logs").get().c;
    const avgPain = db.prepare("SELECT AVG(pain_eva) as avg FROM exercise_logs").get().avg || 0;

    res.json({
      totalPatients,
      totalExercises,
      totalVideos,
      totalLogs,
      avgPainEVA: Number(avgPain).toFixed(1)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getPatients = (req, res) => {
  try {
    const patients = db.prepare("SELECT id, full_name, email, diagnosis, assigned_doctor, rehab_goal, phase, avatar_initials, created_at FROM users WHERE role = 'patient' ORDER BY id ASC").all();
    
    // Attach latest log to each patient
    const enriched = patients.map(p => {
      const lastLog = db.prepare("SELECT pain_eva, logged_at, exercise_name FROM exercise_logs WHERE user_id = ? ORDER BY logged_at DESC LIMIT 1").get(p.id);
      const logCount = db.prepare("SELECT COUNT(*) as count FROM exercise_logs WHERE user_id = ?").get(p.id).count;
      return {
        ...p,
        totalSessions: logCount,
        lastPainEVA: lastLog ? lastLog.pain_eva : 'N/A',
        lastActivity: lastLog ? lastLog.logged_at : p.created_at
      };
    });

    res.json(enriched);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createVideo = (req, res) => {
  try {
    const { title, category, specialist_name, duration, video_url, markers = [] } = req.body;
    if (!title || !category || !specialist_name) {
      return res.status(400).json({ error: 'Título, categoría y nombre del especialista son obligatorios.' });
    }

    const markersJson = typeof markers === 'string' ? markers : JSON.stringify(markers);

    const result = db.prepare(`
      INSERT INTO videos (title, category, specialist_name, duration, video_url, thumbnail_badge, markers_json)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      title,
      category,
      specialist_name,
      duration || '03:30',
      video_url || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      '🎬',
      markersJson
    );

    const newVideo = db.prepare('SELECT * FROM videos WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({
      message: 'Video clínico añadido exitosamente',
      video: {
        ...newVideo,
        markers: newVideo.markers_json ? JSON.parse(newVideo.markers_json) : []
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteVideo = (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM videos WHERE id = ?').run(id);
    res.json({ message: 'Video eliminado del catálogo clínico' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createExercise = (req, res) => {
  try {
    const { category, title, duration_seconds = 30, prescription = '3 series x 10 reps', posture_hint, safety_tips } = req.body;
    if (!title || !category || !posture_hint) {
      return res.status(400).json({ error: 'Título, categoría y consejo postural son requeridos.' });
    }

    const result = db.prepare(`
      INSERT INTO exercises (category, title, duration_seconds, prescription, posture_hint, safety_tips, order_index, image_badge)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      category,
      title,
      duration_seconds,
      prescription,
      posture_hint,
      safety_tips || 'Detén el ejercicio si el dolor EVA supera 3/10',
      99,
      '💪'
    );

    const newExercise = db.prepare('SELECT * FROM exercises WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({
      message: 'Ejercicio añadido exitosamente a la biblioteca clínica',
      exercise: newExercise
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteExercise = (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM exercises WHERE id = ?').run(id);
    res.json({ message: 'Ejercicio eliminado del protocolo' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updatePatientPhase = (req, res) => {
  try {
    const { patientId } = req.params;
    const { phase, rehab_goal } = req.body;

    db.prepare(`
      UPDATE users 
      SET phase = COALESCE(?, phase),
          rehab_goal = COALESCE(?, rehab_goal)
      WHERE id = ?
    `).run(phase, rehab_goal, patientId);

    res.json({ message: 'Fase y prescripción del paciente actualizadas correctamente.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
