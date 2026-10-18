import { describe, expect, it } from 'vitest';
import {
  animalQrDataUrl,
  animalVerificationUrl,
  renderAnimalTagPdf,
} from './pdf.js';

describe('Animal QR tag generation & PDF', () => {
  const sampleAnimal = {
    id: 'anm_123456789',
    tagNumber: 'UK-04-COW-101',
    name: 'Gauri',
    sex: 'FEMALE',
    status: 'ACTIVE',
    lactating: true,
    species: { canonicalName: 'Cattle (Bos taurus)' },
    breed: { name: 'Gir' },
    farm: { name: 'Green Valley Dairy' },
  };
  const verificationId = 'anm_safe_test_opaque_id';

  it('builds an opaque verification URL without private medical details', () => {
    const url = animalVerificationUrl(verificationId);
    expect(url).toMatch(/\/verify\/animal\/anm_safe_test_opaque_id$/);
    expect(url).not.toContain('Gauri');
    expect(url).not.toContain('UK-04-COW-101');
    expect(url).not.toContain('antibiotic');
  });

  it('generates a valid QR data URL for the verification URL', async () => {
    const qr = await animalQrDataUrl(verificationId);
    expect(qr.startsWith('data:image/png;base64,')).toBe(true);
  });

  it('renders a printable animal tag PDF with tag number, species, QR, and disclaimer', async () => {
    const pdf = await renderAnimalTagPdf({
      animal: sampleAnimal,
      verificationId,
    });
    expect(Buffer.isBuffer(pdf)).toBe(true);
    const latin1 = pdf.toString('latin1');
    expect(latin1.startsWith('%PDF-')).toBe(true);
    expect(latin1).toContain('UK-04-COW-101');
    expect(latin1).toContain(Buffer.from('residue').toString('hex'));
  });
});
