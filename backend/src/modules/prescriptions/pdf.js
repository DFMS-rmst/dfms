import PDFDocument from 'pdfkit';

export async function renderPrescriptionPdf(prescription) {
  const chunks = [];
  const document = new PDFDocument({
    size: 'A4',
    margin: 54,
    info: { Title: `Veterinary Prescription ${prescription.id}` },
  });

  document.on('data', (chunk) => chunks.push(chunk));
  const finished = new Promise((resolve, reject) => {
    document.on('end', () => resolve(Buffer.concat(chunks)));
    document.on('error', reject);
  });

  document.rect(36, 36, 523, 770).lineWidth(2).stroke('#1c4ed8');

  // Header
  document
    .fillColor('#1e40af')
    .fontSize(12)
    .text('SIH25007 Verified Veterinary Care Platform', { align: 'center' });
  document.moveDown(0.4).fontSize(22).text('OFFICIAL VETERINARY PRESCRIPTION', { align: 'center' });

  document.moveDown(1.5).fillColor('#1f2937').fontSize(11);

  // General Details
  const vetName = prescription.veterinarian?.user?.fullName || 'Verified Veterinarian';
  const council = prescription.veterinarian?.registrationCouncil || 'Veterinary Council';
  const regNo = prescription.veterinarian?.registrationNumber || 'N/A';
  const animalTag = prescription.animal?.tagNumber || 'Unknown Tag';
  const species = prescription.animal?.species?.canonicalName || 'Livestock';
  const farmName = prescription.case?.farm?.name || 'Registered Farm';

  const headerGrid = [
    ['Prescription ID:', prescription.id],
    ['Issued Date:', new Date(prescription.prescribedAt).toLocaleString()],
    ['Veterinarian:', `${vetName} (${council} Reg #${regNo})`],
    ['Farm:', farmName],
    ['Animal Tag / Species:', `${animalTag} (${species})`],
    [
      'Diagnosis:',
      prescription.diagnosis?.disease?.canonicalName ||
        prescription.diagnosis?.clinicalNotes ||
        'Clinical Evaluation',
    ],
  ];

  for (const [label, val] of headerGrid) {
    document
      .font('Helvetica-Bold')
      .text(`${label} `, { continued: true })
      .font('Helvetica')
      .text(String(val));
  }

  document.moveDown(1.2);
  document
    .font('Helvetica-Bold')
    .fontSize(13)
    .fillColor('#1e40af')
    .text('PRESCRIBED MEDICATIONS & INSTRUCTIONS');
  document.moveDown(0.5).fillColor('#1f2937').fontSize(10);

  if (!prescription.items || prescription.items.length === 0) {
    document.font('Helvetica-Oblique').text('No drug items associated with this prescription.');
  } else {
    prescription.items.forEach((item, index) => {
      document
        .font('Helvetica-Bold')
        .text(`${index + 1}. ${item.drug?.canonicalName || 'Antimicrobial / Drug'}`);
      document
        .font('Helvetica')
        .text(
          `   • Dosage: ${item.doseValue} ${item.doseUnit} ${item.doseBasis ? `(${item.doseBasis})` : ''}`,
        );
      document.text(`   • Route: ${item.route} | Frequency: ${item.frequency}`);
      document.text(`   • Duration: ${item.durationValue} ${item.durationUnit}`);
      if (item.instructions) {
        document.text(`   • Special Instructions: ${item.instructions}`);
      }
      document.moveDown(0.5);
    });
  }

  if (prescription.instructions) {
    document.moveDown(0.8);
    document.font('Helvetica-Bold').fontSize(11).text('General Case Instructions:');
    document.font('Helvetica').fontSize(10).text(prescription.instructions);
  }

  // Footer Disclaimer
  document.roundedRect(60, 710, 475, 60, 5).fillAndStroke('#eff6ff', '#1e40af');
  document
    .fillColor('#1e3a8a')
    .font('Helvetica-Bold')
    .fontSize(9)
    .text(
      'NOTICE: This prescription was digitally created by a verified veterinarian. Antimicrobial usage must follow mandatory withdrawal period protocols for milk collection safety.',
      75,
      725,
      { width: 445, align: 'center' },
    );

  document.end();
  return finished;
}
