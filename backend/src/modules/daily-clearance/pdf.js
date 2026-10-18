import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { env } from '../../config/env.js';

export const dailyVerificationUrl = (id) =>
  `${env.APP_BASE_URL.replace(/\/$/, '')}/verify/daily-clearance/${id}`;

export async function renderDailyClearancePdf(record) {
  const doc = new PDFDocument({ size: 'A4', margin: 55, info: { Title: record.clearanceNumber } });
  const chunks = [];
  doc.on('data', (chunk) => chunks.push(chunk));
  const finished = new Promise((resolve) => doc.on('end', () => resolve(Buffer.concat(chunks))));
  const qr = await QRCode.toDataURL(dailyVerificationUrl(record.verificationId));
  const snapshot = record.canonicalPayload;
  doc.fontSize(20).text('Daily Milk Collection Clearance', { align: 'center' });
  doc.moveDown().fontSize(11);
  for (const [label, value] of [
    ['Clearance number', record.clearanceNumber],
    ['Farm', snapshot.farm.name],
    ['Business date', snapshot.businessDate],
    ['Timezone', snapshot.timeZone],
    ['Version', snapshot.version],
    ['Generated at', record.generatedAt.toISOString()],
    ['Applicable animals', snapshot.applicableCount],
    ['Eligible animals', snapshot.eligibleCount],
  ])
    doc.text(`${label}: ${value}`);
  doc.moveDown().fontSize(13).text('System-determined eligible animals');
  snapshot.animals
    .filter((item) => item.eligibilityStatus === 'ELIGIBLE_FOR_MILK')
    .forEach((item) =>
      doc.fontSize(10).text(`• ${item.animalTag}${item.animalName ? ` — ${item.animalName}` : ''}`),
    );
  doc.image(Buffer.from(qr.split(',')[1], 'base64'), 225, 520, { width: 145 });
  doc
    .fontSize(8)
    .text(dailyVerificationUrl(record.verificationId), 70, 670, { width: 455, align: 'center' });
  doc.fontSize(10).text(record.disclaimer, 65, 710, { width: 465, align: 'center' });
  doc.end();
  return finished;
}
