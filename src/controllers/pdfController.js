const PDFDocument = require('pdfkit');
const db = require('../database/db');

exports.generateExerciseSheetPDF = (req, res) => {
  try {
    const userId = req.query.userId || 1;
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    const exercises = db.prepare('SELECT * FROM exercises ORDER BY order_index ASC').all();

    const doc = new PDFDocument({
      size: 'A4',
      margin: 40,
      info: {
        Title: 'Ficha Clínica de Fisioterapia - RespiraPlus',
        Author: 'RespiraPlus MediRehab Pro',
        Subject: 'Plan de Rehabilitación Prescrito',
        Keywords: 'fisioterapia, salud, respiraplus, rehabilitacion'
      }
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="Ficha_Clinica_RespiraPlus_Fase2.pdf"');
    doc.pipe(res);

    // Header Background Accent
    doc.rect(40, 40, 515, 60).fill('#0f766e');

    // Header Text
    doc.fillColor('#ffffff').fontSize(18).font('Helvetica-Bold')
       .text('MediRehab Pro / RespiraPlus', 55, 52);
    doc.fontSize(10).font('Helvetica')
       .text('Ficha Médica de Prescripción Fisioterapéutica y Rehabilitación', 55, 75);

    doc.moveDown(2);

    // Patient Info Section
    const startY = 120;
    doc.rect(40, startY, 515, 75).fillAndStroke('#f0fdfa', '#ccfbf1');

    doc.fillColor('#134e4a').fontSize(11).font('Helvetica-Bold')
       .text('DATOS DEL PACIENTE & PRESCRIPCIÓN CLÍNICA', 55, startY + 10);

    doc.fillColor('#334155').fontSize(9).font('Helvetica')
       .text(`Paciente: ${user ? user.full_name : 'Carlos Vega'}`, 55, startY + 28)
       .text(`Diagnóstico: ${user ? user.diagnosis : 'Tendinopatía Manguito Rotador'}`, 55, startY + 42)
       .text(`Fase: ${user ? user.phase : 'Fase 2'}`, 55, startY + 56)
       .text(`Médico Asignado: ${user ? user.assigned_doctor : 'Dr. Roberto Martínez'}`, 280, startY + 28)
       .text(`Objetivo: ${user ? user.rehab_goal : 'Recuperar abducción 180°'}`, 280, startY + 42)
       .text(`Fecha de Emisión: ${new Date().toLocaleDateString('es-ES')}`, 280, startY + 56);

    // Exercises Section
    let currentY = 215;
    doc.fillColor('#0f766e').fontSize(13).font('Helvetica-Bold')
       .text('RUTINA DE EJERCICIOS GUIADOS', 40, currentY);

    currentY += 20;

    exercises.forEach((ex, idx) => {
      // Box for each exercise
      doc.rect(40, currentY, 515, 65).fillAndStroke('#ffffff', '#e2e8f0');

      doc.fillColor('#0d9488').fontSize(10).font('Helvetica-Bold')
         .text(`${idx + 1}. ${ex.title}`, 55, currentY + 8);

      doc.fillColor('#64748b').fontSize(8).font('Helvetica-Bold')
         .text(`CATEGORÍA: ${ex.category.toUpperCase()} | PRESCRIPCIÓN: ${ex.prescription}`, 55, currentY + 22);

      doc.fillColor('#1e293b').fontSize(8.5).font('Helvetica')
         .text(`Instrucción: ${ex.posture_hint}`, 55, currentY + 34, { width: 480 });

      doc.fillColor('#b91c1c').fontSize(8).font('Helvetica-Oblique')
         .text(`Bioseguridad: ${ex.safety_tips}`, 55, currentY + 48, { width: 480 });

      currentY += 75;
    });

    // Biosecurity General Protocol Box
    doc.rect(40, currentY, 515, 55).fillAndStroke('#fef2f2', '#fecaca');
    doc.fillColor('#991b1b').fontSize(9).font('Helvetica-Bold')
       .text('PAUTAS DE BIOSEGURIDAD Y ESCALA DE DOLOR EVA', 55, currentY + 8);
    doc.fillColor('#7f1d1d').fontSize(8).font('Helvetica')
       .text('• Si el dolor supera el nivel 3/10 en la escala EVA, suspenda la serie inmediatamente y aplique crioterapia.', 55, currentY + 22)
       .text('• Mantenga la respiración continua (no realice maniobra de Valsalva durante la fuerza).', 55, currentY + 34)
       .text('• Reporte cualquier mareo o disnea a través del portal de teleconsulta o comuníquese al centro médico.', 55, currentY + 44);

    // Signatures
    currentY += 80;
    doc.strokeColor('#cbd5e1').lineWidth(1)
       .moveTo(80, currentY + 30).lineTo(220, currentY + 30).stroke()
       .moveTo(330, currentY + 30).lineTo(470, currentY + 30).stroke();

    doc.fillColor('#475569').fontSize(8).font('Helvetica')
       .text('Firma del Médico Fisiatra', 95, currentY + 35)
       .text('Firma y Conformidad del Paciente', 340, currentY + 35);

    // Footer
    doc.fillColor('#94a3b8').fontSize(7.5).font('Helvetica')
       .text('RespiraPlus MediRehab Pro • Sistema Clínico Interoperable (HIPAA / GDPR Ready) • Generado automáticamente para uso del paciente.', 40, 780, { align: 'center', width: 515 });

    doc.end();
  } catch (error) {
    console.error('PDF Generation Error:', error);
    res.status(500).json({ error: 'Error al generar el PDF clínico' });
  }
};
