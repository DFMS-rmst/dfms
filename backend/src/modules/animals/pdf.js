import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { env } from '../../config/env.js';

export const animalVerificationUrl = (verificationId) =>
  `${env.APP_BASE_URL.replace(/\/$/, '')}/verify/animal/${verificationId}`;

export async function animalQrDataUrl(verificationId) {
  return QRCode.toDataURL(animalVerificationUrl(verificationId), {
    errorCorrectionLevel: 'M',
    margin: 1,
  });
}

export async function renderAnimalTagPdf({ animal, verificationId }) {
  const chunks = [];
  const document = new PDFDocument({
    size: 'A5',
    layout: 'portrait',
    margin: 28,
    compress: false,
    info: { Title: `Animal Identification Tag ${animal.tagNumber}` },
  });

  document.on('data', (chunk) => chunks.push(chunk));
  const finished = new Promise((resolve, reject) => {
    document.on('end', () => resolve(Buffer.concat(chunks)));
    document.on('error', reject);
  });

  const qr = Buffer.from((await animalQrDataUrl(verificationId)).split(',')[1], 'base64');
  const url = animalVerificationUrl(verificationId);

  // Outer border
  document.roundedRect(20, 20, 380, 555, 10).lineWidth(2).stroke('#064e3b');

  // Top header banner
  document.roundedRect(20, 20, 380, 50, 10).fill('#064e3b');
  document
    .fillColor('#ffffff')
    .font('Helvetica-Bold')
    .fontSize(13)
    .text('DAIRY LIVESTOCK IDENTIFICATION & MILK CLEARANCE', 25, 32, {
      width: 370,
      align: 'center',
    })
    .fontSize(9)
    .font('Helvetica')
    .text('OFFICIAL ANIMAL QR IDENTIFIER', 25, 48, { width: 370, align: 'center' });

  // Tag section
  document.moveDown(2);
  document.fillColor('#064e3b').fontSize(11).font('Helvetica-Bold').text('EAR TAG / IDENTIFIER', 35, 85);
  document
    .fillColor('#0f172a')
    .fontSize(22)
    .font('Helvetica-Bold')
    .text(animal.tagNumber, 35, 100);

  // Animal info box
  document.roundedRect(35, 135, 350, 115, 6).fillAndStroke('#f8fafc', '#e2e8f0');

  const rows = [
    ['Animal Name', animal.name || 'Not specified'],
    ['Species', animal.species?.canonicalName || 'Livestock'],
    ['Breed', animal.breed?.name || 'Standard'],
    ['Sex / Status', `${(animal.sex || 'FEMALE').replaceAll('_', ' ')} · ${animal.status || 'ACTIVE'}`],
    ['Farm', animal.farm?.name || 'Authorized Farm'],
    ['Lactating', animal.lactating ? 'Yes' : 'No'],
  ];

  let yPos = 145;
  for (const [lbl, val] of rows) {
    document
      .font('Helvetica-Bold')
      .fontSize(9)
      .fillColor('#64748b')
      .text(lbl, 45, yPos, { width: 100 });
    document
      .font('Helvetica')
      .fontSize(9.5)
      .fillColor('#0f172a')
      .text(String(val), 145, yPos, { width: 230 });
    yPos += 17;
  }

  // QR Code Header
  document
    .fillColor('#064e3b')
    .font('Helvetica-Bold')
    .fontSize(11)
    .text('SCAN TO VERIFY LIVE MILK ELIGIBILITY', 35, 265, { width: 350, align: 'center' });

  document
    .fillColor('#64748b')
    .font('Helvetica')
    .fontSize(8.5)
    .text(
      'Scan tag prior to treatment or milk collection to retrieve real-time clearance status',
      35,
      280,
      { width: 350, align: 'center' },
    );

  // QR Code Image
  document.image(qr, 130, 300, { width: 160 });

  // Verification URL
  document
    .fillColor('#0f172a')
    .font('Helvetica-Bold')
    .fontSize(8.5)
    .text(url, 35, 470, { width: 350, align: 'center' });

  // Verification ID
  document
    .fillColor('#64748b')
    .font('Helvetica')
    .fontSize(8)
    .text(`Verification ID: ${verificationId}`, 35, 485, { width: 350, align: 'center' });

  // Footer Disclaimer box
  document.roundedRect(35, 505, 350, 55, 6).fillAndStroke('#ecfdf5', '#a7f3d0');
  document
    .fillColor('#064e3b')
    .font('Helvetica-Bold')
    .fontSize(8)
    .text('PRIVACY & RESIDUE DISCLAIMER', 40, 513, { width: 340, align: 'center' });
  document
    .fillColor('#0f172a')
    .font('Helvetica')
    .fontSize(7.5)
    .text(
      'This tag provides live deterministic eligibility based on recorded veterinary treatments. It contains no private medical records or chat history and does not represent laboratory residue testing.',
      42,
      525,
      { width: 336, align: 'center' },
    );

  document.end();
  return finished;
}
