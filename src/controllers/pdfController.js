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

    const pageWidth = 595.28;
    const margin = 36;
    const contentWidth = pageWidth - (margin * 2);

    // Header Background Accent
    doc.roundedRect(margin, 30, contentWidth, 52, 4).fill('#0f766e');

    // Header Text
    doc.fillColor('#ffffff').fontSize(16).font('Helvetica-Bold')
       .text('MediRehab Pro / RespiraPlus', margin + 14, 40);
    doc.fontSize(9).font('Helvetica')
       .text('Ficha Médica de Prescripción Fisioterapéutica y Rehabilitación', margin + 14, 62);

    // Patient Info Section
    const patientY = 90;
    doc.roundedRect(margin, patientY, contentWidth, 62, 4).fillAndStroke('#f0fdfa', '#99f6e4');

    doc.fillColor('#134e4a').fontSize(9.5).font('Helvetica-Bold')
       .text('DATOS DEL PACIENTE & PRESCRIPCIÓN CLÍNICA', margin + 12, patientY + 8);

    const col1X = margin + 12;
    const col2X = margin + 270;

    doc.fillColor('#334155').fontSize(8).font('Helvetica')
       .text(`Paciente: ${user ? user.full_name : 'Carlos Vega'}`, col1X, patientY + 23)
       .text(`Diagnóstico: ${user ? user.diagnosis : 'Tendinopatía Manguito Rotador'}`, col1X, patientY + 35)
       .text(`Fase Actual: ${user ? user.phase : 'Fase 2 - Recuperación'}`, col1X, patientY + 47)
       .text(`Médico Asignado: ${user ? user.assigned_doctor : 'Dr. Roberto Martínez'}`, col2X, patientY + 23)
       .text(`Objetivo Clínico: ${user ? user.rehab_goal : 'Recuperar abducción 180°'}`, col2X, patientY + 35)
       .text(`Fecha de Emisión: ${new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}`, col2X, patientY + 47);

    // Exercises Section
    let currentY = 160;
    doc.fillColor('#0f766e').fontSize(11).font('Helvetica-Bold')
       .text('RUTINA DE EJERCICIOS GUIADOS', margin, currentY);

    currentY += 16;

    exercises.forEach((ex, idx) => {
      const textWidth = contentWidth - 24;
      
      // Calculate heights dynamically to avoid any text collision
      doc.fontSize(9).font('Helvetica-Bold');
      const titleText = `${idx + 1}. ${ex.title}`;
      const titleHeight = doc.heightOfString(titleText, { width: textWidth });

      doc.fontSize(7.5).font('Helvetica-Bold');
      const catText = `CATEGORÍA: ${ex.category.toUpperCase()}   |   PRESCRIPCIÓN: ${ex.prescription}`;
      const catHeight = doc.heightOfString(catText, { width: textWidth });

      doc.fontSize(8).font('Helvetica');
      const instText = `Instrucción: ${ex.posture_hint}`;
      const instHeight = doc.heightOfString(instText, { width: textWidth, lineGap: 1 });

      doc.fontSize(7.5).font('Helvetica-Oblique');
      const safetyText = `Bioseguridad: ${ex.safety_tips}`;
      const safetyHeight = doc.heightOfString(safetyText, { width: textWidth, lineGap: 1 });

      const boxPaddingTop = 6;
      const boxPaddingBottom = 6;
      const itemGap = 2.5;

      const boxHeight = boxPaddingTop + titleHeight + itemGap + catHeight + itemGap + instHeight + itemGap + safetyHeight + boxPaddingBottom;

      // Background card
      doc.roundedRect(margin, currentY, contentWidth, boxHeight, 3).fillAndStroke('#ffffff', '#cbd5e1');

      let textY = currentY + boxPaddingTop;

      // Title
      doc.fillColor('#0d9488').fontSize(9).font('Helvetica-Bold')
         .text(titleText, margin + 12, textY, { width: textWidth });
      textY += titleHeight + itemGap;

      // Category
      doc.fillColor('#64748b').fontSize(7.5).font('Helvetica-Bold')
         .text(catText, margin + 12, textY, { width: textWidth });
      textY += catHeight + itemGap;

      // Instruction
      doc.fillColor('#1e293b').fontSize(8).font('Helvetica')
         .text(instText, margin + 12, textY, { width: textWidth, lineGap: 1 });
      textY += instHeight + itemGap;

      // Safety
      doc.fillColor('#b91c1c').fontSize(7.5).font('Helvetica-Oblique')
         .text(safetyText, margin + 12, textY, { width: textWidth, lineGap: 1 });

      currentY += boxHeight + 5;
    });

    // Biosecurity General Protocol Box
    const bioY = currentY + 2;
    doc.roundedRect(margin, bioY, contentWidth, 48, 3).fillAndStroke('#fef2f2', '#fca5a5');
    doc.fillColor('#991b1b').fontSize(8.5).font('Helvetica-Bold')
       .text('PAUTAS DE BIOSEGURIDAD Y ESCALA DE DOLOR EVA', margin + 12, bioY + 6);
    doc.fillColor('#7f1d1d').fontSize(7.5).font('Helvetica')
       .text('• Si el dolor supera el nivel 3/10 en la escala EVA, suspenda la serie inmediatamente y aplique crioterapia.', margin + 12, bioY + 18)
       .text('• Mantenga la respiración continua (no realice maniobra de Valsalva durante la fuerza).', margin + 12, bioY + 28)
       .text('• Reporte cualquier mareo o disnea a través del portal de teleconsulta o comuníquese al centro médico.', margin + 12, bioY + 38);

    // Signatures
    const sigY = bioY + 58;
    doc.strokeColor('#94a3b8').lineWidth(0.8)
       .moveTo(margin + 40, sigY + 24).lineTo(margin + 200, sigY + 24).stroke()
       .moveTo(margin + 320, sigY + 24).lineTo(margin + 480, sigY + 24).stroke();

    doc.fillColor('#475569').fontSize(7.5).font('Helvetica')
       .text('Firma del Médico Fisiatra', margin + 65, sigY + 28)
       .text('Firma y Conformidad del Paciente', margin + 335, sigY + 28);

    // Footer
    doc.fillColor('#94a3b8').fontSize(7).font('Helvetica')
       .text('RespiraPlus MediRehab Pro • Sistema Clínico Interoperable (HIPAA / GDPR Ready) • Generado automáticamente para uso del paciente.', margin, 808, { align: 'center', width: contentWidth });

    doc.end();
  } catch (error) {
    console.error('PDF Generation Error:', error);
    res.status(500).json({ error: 'Error al generar el PDF clínico' });
  }
};
