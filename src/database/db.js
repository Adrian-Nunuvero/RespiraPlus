const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Ensure data directory exists
const dataDir = path.join(__dirname, '..', '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'database.sqlite');
const db = new Database(dbPath);

// Enable WAL mode for enhanced performance and concurrency
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize Tables
function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT DEFAULT 'patient', -- 'patient', 'doctor', 'admin'
      diagnosis TEXT DEFAULT 'Tendinopatía Manguito Rotador / Rehabilitación Pulmonar',
      assigned_doctor TEXT DEFAULT 'Dr. Roberto Martínez (Fisiatría & Neumología)',
      rehab_goal TEXT DEFAULT 'Recuperar capacidad ventilatoria y abducción a 180°',
      phase TEXT DEFAULT 'Fase 2',
      avatar_initials TEXT DEFAULT 'CV',
      theme_mode TEXT DEFAULT 'light',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS exercises (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      duration_seconds INTEGER NOT NULL DEFAULT 30,
      prescription TEXT NOT NULL DEFAULT '3 series x 12 reps',
      posture_hint TEXT NOT NULL,
      safety_tips TEXT NOT NULL,
      order_index INTEGER DEFAULT 1,
      image_badge TEXT DEFAULT '💪',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS videos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      specialist_name TEXT NOT NULL,
      duration TEXT NOT NULL,
      video_url TEXT,
      thumbnail_badge TEXT DEFAULT '🎬',
      markers_json TEXT, -- JSON Array: [{ time: "00:20", label: "Postura Inicial" }]
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS reminders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      time_str TEXT NOT NULL,
      detail TEXT,
      icon TEXT DEFAULT '⏰',
      is_enabled INTEGER DEFAULT 1,
      days_json TEXT DEFAULT '["L","M","X","J","V","S","D"]',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS exercise_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      exercise_id INTEGER,
      exercise_name TEXT NOT NULL,
      sets INTEGER NOT NULL DEFAULT 3,
      reps INTEGER NOT NULL DEFAULT 12,
      pain_eva INTEGER NOT NULL DEFAULT 2, -- 0 to 10
      notes TEXT,
      logged_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      synced_from_offline INTEGER DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS telehealth_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      doctor_name TEXT DEFAULT 'Dr. Roberto Martínez',
      status TEXT DEFAULT 'ready', -- ready, active, finished
      started_at DATETIME,
      ended_at DATETIME,
      notes TEXT DEFAULT 'Evaluación de control: Buena tolerancia al ejercicio sin disnea.',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER,
      user_id INTEGER NOT NULL,
      sender_role TEXT NOT NULL, -- 'patient' or 'doctor'
      sender_name TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );
  `);

  // Seed default data if empty
  seedInitialData();
}

function seedInitialData() {
  // Check users
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (userCount === 0) {
    const insertUser = db.prepare(`
      INSERT INTO users (email, password_hash, full_name, role, diagnosis, assigned_doctor, rehab_goal, phase, avatar_initials)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // 1. Patient
    insertUser.run(
      'carlos.vega@hospital.med',
      '12345678',
      'Carlos Vega',
      'patient',
      'Tendinopatía Manguito Rotador & Patrón Respiratorio',
      'Dr. Roberto Martínez (Especialista en Rehabilitación)',
      'Recuperar abducción a 180° y ventilación diafragmática sin disnea',
      'Fase 2',
      'CV'
    );

    // 2. Doctor / Admin
    insertUser.run(
      'doctor@hospital.med',
      'admin123',
      'Dr. Roberto Martínez',
      'doctor',
      'Especialista Jefe de Fisiatría y Rehabilitación',
      'Dirección Médica Hospitalaria',
      'Supervisión y prescripción de protocolos clínicos',
      'Administrador',
      'RM'
    );

    // 3. Second Patient for clinical comparison
    insertUser.run(
      'maria.lopez@hospital.med',
      '12345678',
      'María López',
      'patient',
      'Rehabilitación Post-COVID & Disnea de Esfuerzo',
      'Dr. Roberto Martínez (Especialista en Rehabilitación)',
      'Aumentar capacidad vital forzada y tolerancia al esfuerzo',
      'Fase 1',
      'ML'
    );
  } else {
    // Ensure Doctor exists
    const doc = db.prepare("SELECT * FROM users WHERE email = 'doctor@hospital.med'").get();
    if (!doc) {
      db.prepare(`
        INSERT INTO users (email, password_hash, full_name, role, diagnosis, assigned_doctor, rehab_goal, phase, avatar_initials)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        'doctor@hospital.med',
        'admin123',
        'Dr. Roberto Martínez',
        'doctor',
        'Especialista Jefe de Fisiatría y Rehabilitación',
        'Dirección Médica Hospitalaria',
        'Supervisión y prescripción de protocolos clínicos',
        'Administrador',
        'RM'
      );
    }
  }

  // Check exercises
  const exCount = db.prepare('SELECT COUNT(*) as count FROM exercises').get().count;
  if (exCount === 0) {
    const insertEx = db.prepare(`
      INSERT INTO exercises (category, title, duration_seconds, prescription, posture_hint, safety_tips, order_index, image_badge)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const defaultExercises = [
      {
        category: 'Movilidad Escapular',
        title: 'Rotación Externa con Banda Elástica',
        duration_seconds: 30,
        prescription: '3 series x 12 reps',
        posture_hint: 'Mantén los codos pegados al cuerpo a 90° y realiza una rotación externa controlada.',
        safety_tips: 'Si el dolor supera 3/10 EVA, detén el movimiento y reduce la resistencia de la banda.',
        order_index: 1,
        image_badge: '🔄'
      },
      {
        category: 'Fortalecimiento Suave',
        title: 'Elevación en Plano Escapular (Scaption)',
        duration_seconds: 45,
        prescription: '3 series x 10 reps',
        posture_hint: 'Eleva los brazos a 30° respecto al plano frontal sin encoger los hombros y exhalando al subir.',
        safety_tips: 'No compenses arqueando la zona lumbar; mantén el abdomen activo.',
        order_index: 2,
        image_badge: '🏋️'
      },
      {
        category: 'Flexibilidad & Respiración',
        title: 'Elongación de Cápsula Posterior & Expansión Torácica',
        duration_seconds: 30,
        prescription: '3 series x 20 segs sostenido',
        posture_hint: 'Cruza el brazo sobre el pecho, toma aire profundamente por la nariz y presiona suavemente con el antebrazo contrario.',
        safety_tips: 'Realiza respiraciones diafragmáticas lentas y profundas durante el estiramiento.',
        order_index: 3,
        image_badge: '🫁'
      },
      {
        category: 'Reeducación Diafragmática',
        title: 'Respiración Abdomino-Diafragmática Guiada',
        duration_seconds: 60,
        prescription: '2 series x 10 ciclos respiratorios',
        posture_hint: 'Coloca una mano en el pecho y otra en el abdomen; infla el abdomen al inhalar en 4 segundos y exhala en 6 segundos con labios fruncidos.',
        safety_tips: 'Si sientes mareos leves, vuelve al ritmo respiratorio normal en reposo.',
        order_index: 4,
        image_badge: '🌬️'
      }
    ];

    for (const ex of defaultExercises) {
      insertEx.run(ex.category, ex.title, ex.duration_seconds, ex.prescription, ex.posture_hint, ex.safety_tips, ex.order_index, ex.image_badge);
    }
  }

  // Check videos
  const vidCount = db.prepare('SELECT COUNT(*) as count FROM videos').get().count;
  if (vidCount === 0) {
    const insertVid = db.prepare(`
      INSERT INTO videos (title, category, specialist_name, duration, video_url, thumbnail_badge, markers_json)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const defaultVideos = [
      {
        title: 'Técnica de Elevación en Plano Escapular',
        category: 'Manguito Rotador & Estabilidad',
        specialist_name: 'Dr. Roberto Martínez',
        duration: '04:15',
        video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        thumbnail_badge: '🎥',
        markers_json: JSON.stringify([
          { time: '00:20', label: 'Alineación de hombros y postura' },
          { time: '01:30', label: 'Activación del serrato anterior' },
          { time: '03:10', label: 'Error común: elevación del trapecio' }
        ])
      },
      {
        title: 'Estiramiento Guiado de Cápsula Posterior',
        category: 'Flexibilidad & Alivio',
        specialist_name: 'Lic. Mariana Gómez (Fisioterapeuta)',
        duration: '03:40',
        video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
        thumbnail_badge: '🧘',
        markers_json: JSON.stringify([
          { time: '00:15', label: 'Posición neutra de columna' },
          { time: '01:10', label: 'Presión gradual sin dolor agudo' },
          { time: '02:45', label: 'Patrón de respiración rítmica' }
        ])
      },
      {
        title: 'Patrón Respiratorio Diafragmático & Labios Fruncidos',
        category: 'Rehabilitación Pulmonar',
        specialist_name: 'Dra. Elena Vargas (Neumología)',
        duration: '05:10',
        video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
        thumbnail_badge: '🫁',
        markers_json: JSON.stringify([
          { time: '00:30', label: 'Ubicación de manos en caja torácica' },
          { time: '02:00', label: 'Técnica de labios fruncidos PEEP' },
          { time: '04:00', label: 'Integración postural' }
        ])
      }
    ];

    for (const v of defaultVideos) {
      insertVid.run(v.title, v.category, v.specialist_name, v.duration, v.video_url, v.thumbnail_badge, v.markers_json);
    }
  }

  // Check reminders
  const remCount = db.prepare('SELECT COUNT(*) as count FROM reminders').get().count;
  if (remCount === 0) {
    const insertRem = db.prepare(`
      INSERT INTO reminders (user_id, title, time_str, detail, icon, is_enabled, days_json)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    insertRem.run(1, 'Movilidad y Respiración Matutina', '08:30', '15 minutos • Rutina Fase 2', '⏰', 1, '["L","M","X","J","V","S","D"]');
    insertRem.run(1, 'Crioterapia / Compresa Post-Sesión', '19:00', 'Compresa fría 10 min en hombro/tórax', '🧊', 1, '["L","M","X","J","V","S","D"]');
    insertRem.run(1, 'Control de Registro & Escala EVA', '21:00', 'Anotar sensaciones y dolor del día', '📝', 1, '["L","M","X","J","V","S","D"]');
  }

  // Check exercise_logs
  const logCount = db.prepare('SELECT COUNT(*) as count FROM exercise_logs').get().count;
  if (logCount === 0) {
    const insertLog = db.prepare(`
      INSERT INTO exercise_logs (user_id, exercise_id, exercise_name, sets, reps, pain_eva, notes, logged_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const now = new Date();
    const d1 = new Date(now.getTime() - 21 * 24 * 3600 * 1000).toISOString();
    const d2 = new Date(now.getTime() - 14 * 24 * 3600 * 1000).toISOString();
    const d3 = new Date(now.getTime() - 7 * 24 * 3600 * 1000).toISOString();
    const d4 = new Date(now.getTime() - 1 * 24 * 3600 * 1000).toISOString();

    insertLog.run(1, 1, 'Rotación Externa con Banda Elástica', 3, 10, 8, 'Molestia notable al final de cada serie', d1);
    insertLog.run(1, 2, 'Elevación en Plano Escapular', 3, 10, 6, 'Mejor control escapular con menor compensación', d2);
    insertLog.run(1, 1, 'Rotación Externa con Banda Elástica', 3, 12, 4, 'Movimiento más fluido y sin chasquido', d3);
    insertLog.run(1, 3, 'Elongación de Cápsula Posterior & Expansión', 3, 12, 2, 'Sensación de alivio y mayor rango de movimiento', d4);
  }

  // Check chat messages
  const chatCount = db.prepare('SELECT COUNT(*) as count FROM chat_messages').get().count;
  if (chatCount === 0) {
    const insertChat = db.prepare(`
      INSERT INTO chat_messages (session_id, user_id, sender_role, sender_name, message, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    insertChat.run(1, 1, 'doctor', 'Dr. Roberto Martínez', '¡Hola Carlos! He revisado tu curva de dolor EVA. La reducción a 2/10 es un excelente indicador de progreso.', new Date(Date.now() - 3600000).toISOString());
    insertChat.run(1, 1, 'patient', 'Carlos Vega', 'Gracias Doctor, hoy sentí el hombro mucho más liberado al hacer la elevación.', new Date(Date.now() - 1800000).toISOString());
    insertChat.run(1, 1, 'doctor', 'Dr. Roberto Martínez', 'Excelente. Mantén la postura a 90° y no olvides registrar tu sesión de hoy.', new Date(Date.now() - 900000).toISOString());
  }
}

// Run init
initDatabase();

module.exports = db;
