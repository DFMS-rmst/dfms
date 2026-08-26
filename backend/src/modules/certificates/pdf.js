import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { env } from '../../config/env.js';

export const verificationUrl = (verificationId) =>
  `${env.APP_BASE_URL.replace(/\/$/, '')}/verify/certificate/${verificationId}`;

export async function qrDataUrl(verificationId) {
  return QRCode.toDataURL(verificationUrl(verificationId), {
    errorCorrectionLevel: 'M',
    margin: 1,
  });
}

export async function renderCertificatePdf(certificate) {
  const chunks = [];
  const document = new PDFDocument({
    size: 'A4',
    margin: 54,
    compress: false,
    info: { Title: `Milk Eligibility Certificate ${certificate.certificateNumber}` },
  });
  document.on('data', (chunk) => chunks.push(chunk));
  const finished = new Promise((resolve, reject) => {
    document.on('end', () => resolve(Buffer.concat(chunks)));
    document.on('error', reject);
  });
  const snapshot = certificate.canonicalPayload;
  const qr = Buffer.from((await qrDataUrl(certificate.verificationId)).split(',')[1], 'base64');
  document.rect(36, 36, 523, 770).lineWidth(2).stroke('#174f47');
  document
    .fillColor('#174f47')
    .fontSize(12)
    .text(process.env.PLATFORM_NAME || 'Dairy Livestock AMU Platform', { align: 'center' });
  document.moveDown(0.6).fontSize(24).text('Milk Eligibility Certificate', { align: 'center' });
  document.moveDown().fillColor('#111827').fontSize(11);
  const rows = [
    ['Certificate number', certificate.certificateNumber],
    ['Certificate status', certificate.status],
    ['Animal', snapshot.animal.tagNumber],
    ['Farm', snapshot.farm.name],
    ['Species', snapshot.animal.species],
    ['Eligible from', snapshot.eligibility.eligibleFrom],
    ['Issued at', snapshot.issuedAt],
  ];
  for (const [label, value] of rows)
    document
      .font('Helvetica-Bold')
      .text(`${label}: `, { continued: true })
      .font('Helvetica')
      .text(String(value));
  document.moveDown().font('Helvetica-Bold').text('Withdrawal evidence');
  if (!snapshot.eligibility.treatments.length)
    document
      .font('Helvetica')
      .text(
        'No recorded antimicrobial treatment created a current withdrawal blocker at issuance.',
      );
  for (const item of snapshot.eligibility.treatments) {
    const rule = item.rule;
    document
      .font('Helvetica')
      .text(
        `${item.drug || 'Treatment'} — completed ${item.treatmentCompletedAt || 'not recorded'}; withdrawal ended ${item.withdrawalEndsAt || 'not applicable'}; rule ${rule?.code || 'none'} (${rule?.source?.organization || 'none'}).`,
      );
  }
  if (snapshot.regulatoryContext?.warning)
    document
      .moveDown()
      .fillColor('#9a3412')
      .font('Helvetica-Bold')
      .text(snapshot.regulatoryContext.warning, { align: 'center' })
      .fillColor('#111827');
  document.image(qr, 220, 500, { width: 150 });
  document
    .fontSize(9)
    .text(verificationUrl(certificate.verificationId), 80, 655, { width: 430, align: 'center' });
  document.roundedRect(60, 690, 475, 80, 5).fillAndStroke('#eef7f4', '#174f47');
  document
    .fillColor('#111827')
    .font('Helvetica-Bold')
    .fontSize(10)
    .text(certificate.disclaimer, 75, 710, { width: 445, align: 'center' });
  document.end();
  return finished;
}
