const db = require('../database/db');

exports.login = (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'El correo electrónico es requerido.' });
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.trim().toLowerCase());
    if (!user) {
      return res.status(404).json({ error: 'Usuario no registrado en el sistema clínico.' });
    }

    // Demo password verification
    if (password && user.password_hash !== password) {
      return res.status(401).json({ error: 'Contraseña clínica incorrecta.' });
    }

    const { password_hash, ...safeUser } = user;
    res.json({
      message: 'Inicio de sesión exitoso',
      user: safeUser,
      token: 'jwt-med-token-' + safeUser.id + '-' + Date.now()
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Error en el servidor al autenticar' });
  }
};

exports.register = (req, res) => {
  try {
    const { full_name, email, password, role = 'patient', diagnosis, rehab_goal, assigned_doctor } = req.body;

    if (!full_name || !email || !password) {
      return res.status(400).json({ error: 'Nombre completo, correo y contraseña son obligatorios.' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check if user exists
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(cleanEmail);
    if (existing) {
      return res.status(409).json({ error: 'El correo electrónico ya se encuentra registrado.' });
    }

    const initials = full_name
      ? full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
      : 'PX';

    const defaultDiag = role === 'doctor'
      ? 'Especialista en Fisiatría y Fisioterapia'
      : (diagnosis || 'Rehabilitación Motora / Pulmonar');

    const defaultDoctor = role === 'doctor'
      ? 'Dirección Médica'
      : (assigned_doctor || 'Dr. Roberto Martínez (Fisiatría)');

    const defaultGoal = role === 'doctor'
      ? 'Supervisión y prescripción clínica'
      : (rehab_goal || 'Recuperar movilidad y función sin dolor');

    const result = db.prepare(`
      INSERT INTO users (full_name, email, password_hash, role, diagnosis, assigned_doctor, rehab_goal, phase, avatar_initials)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      full_name.trim(),
      cleanEmail,
      password,
      role,
      defaultDiag,
      defaultDoctor,
      defaultGoal,
      role === 'doctor' ? 'Admin' : 'Fase 1',
      initials
    );

    const newUser = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
    const { password_hash, ...safeUser } = newUser;

    res.status(201).json({
      message: 'Cuenta clínica registrada con éxito',
      user: safeUser,
      token: 'jwt-med-token-' + safeUser.id + '-' + Date.now()
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.getProfile = (req, res) => {
  try {
    const userId = req.params.id || req.query.userId || 1;
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!user) {
      return res.status(404).json({ error: 'Perfil no encontrado' });
    }
    const { password_hash, ...safeUser } = user;
    res.json(safeUser);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateProfile = (req, res) => {
  try {
    const userId = req.body.userId || req.params.id || 1;
    const { full_name, diagnosis, rehab_goal, theme_mode, phase } = req.body;

    const initials = full_name
      ? full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
      : 'CV';

    db.prepare(`
      UPDATE users
      SET full_name = COALESCE(?, full_name),
          diagnosis = COALESCE(?, diagnosis),
          rehab_goal = COALESCE(?, rehab_goal),
          theme_mode = COALESCE(?, theme_mode),
          phase = COALESCE(?, phase),
          avatar_initials = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(full_name, diagnosis, rehab_goal, theme_mode, phase, initials, userId);

    const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    const { password_hash, ...safeUser } = updated;
    res.json({ message: 'Perfil actualizado con éxito', user: safeUser });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.getMe = (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'No autenticado' });
  }
  res.json({ valid: true, user: req.user });
};

exports.logout = (req, res) => {
  res.json({ message: 'Sesión finalizada exitosamente' });
};
