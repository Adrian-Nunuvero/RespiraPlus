const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const exerciseController = require('../controllers/exerciseController');
const videoController = require('../controllers/videoController');
const reminderController = require('../controllers/reminderController');
const logController = require('../controllers/logController');
const progressController = require('../controllers/progressController');
const telehealthController = require('../controllers/telehealthController');
const pdfController = require('../controllers/pdfController');
const offlineController = require('../controllers/offlineController');
const adminController = require('../controllers/adminController');

// Healthcheck
router.get('/health', (req, res) => {
  res.json({ status: 'ok', app: 'RespiraPlus MediRehab Pro', version: '2.4.0', time: new Date() });
});

// 1. Auth & User Profile (Login, Register & Profile)
router.post('/auth/login', authController.login);
router.post('/auth/register', authController.register);
router.get('/user/profile', authController.getProfile);
router.put('/user/profile', authController.updateProfile);

// 2. Exercises (Requerimiento 1)
router.get('/exercises', exerciseController.getExercises);
router.get('/exercises/:id', exerciseController.getExerciseById);

// 3. Explanatory Videos (Requerimiento 2)
router.get('/videos', videoController.getVideos);

// 4. Reminders (Requerimiento 3)
router.get('/reminders', reminderController.getReminders);
router.post('/reminders', reminderController.createReminder);
router.put('/reminders/:id/toggle', reminderController.toggleReminder);
router.delete('/reminders/:id', reminderController.deleteReminder);

// 5. Logs & EVA Pain scale (Requerimiento 4)
router.get('/logs', logController.getLogs);
router.post('/logs', logController.createLog);

// 6. Progress & Analytics (Requerimiento 5)
router.get('/progress', progressController.getProgressStats);

// 7. Telehealth & Live Supervision (Requerimiento 6)
router.get('/telehealth', telehealthController.getTelehealthStatus);
router.post('/telehealth/message', telehealthController.sendMessage);
router.post('/telehealth/status', telehealthController.updateSessionStatus);

// 8. PDF Download & Offline Sync (Requerimiento 7)
router.get('/pdf/exercise-sheet', pdfController.generateExerciseSheetPDF);
router.get('/offline/pack', offlineController.getOfflinePack);
router.post('/offline/sync', offlineController.syncOfflineData);

// 9. Admin Site & Doctor Portal Endpoints
router.get('/admin/stats', adminController.getAdminStats);
router.get('/admin/patients', adminController.getPatients);
router.post('/admin/videos', adminController.createVideo);
router.delete('/admin/videos/:id', adminController.deleteVideo);
router.post('/admin/exercises', adminController.createExercise);
router.delete('/admin/exercises/:id', adminController.deleteExercise);
router.put('/admin/patients/:patientId/phase', adminController.updatePatientPhase);

module.exports = router;
