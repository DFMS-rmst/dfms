import { describe, expect, it } from 'vitest';
import {
  CANONICALIZATION_VERSION,
  CERTIFICATE_DISCLAIMER,
  canonicalize,
  hashCertificatePayload,
} from './canonical.js';
import { renderCertificatePdf, verificationUrl } from './pdf.js';

const certificate = {
  certificateNumber: 'MEC-2026-TEST',
  verificationId: 'opaque-test-id',
  status: 'ACTIVE',
  disclaimer: CERTIFICATE_DISCLAIMER,
  canonicalPayload: {
    schema: CANONICALIZATION_VERSION,
    issuedAt: '2026-08-26T00:00:00.000Z',
    animal: { tagNumber: 'COW-102', species: 'Dairy cattle' },
    farm: { name: 'Demo Dairy' },
    eligibility: { eligibleFrom: '2026-08-25T00:00:00.000Z', treatments: [] },
  },
};
describe('certificate evidence, PDF, and QR', () => {
  it('canonicalizes object keys and hashes deterministically', () => {
    expect(canonicalize({ z: 1, a: { y: 2, x: 3 } })).toBe('{"a":{"x":3,"y":2},"z":1}');
    expect(hashCertificatePayload({ b: 2, a: 1 })).toBe(hashCertificatePayload({ a: 1, b: 2 }));
  });
  it('detects a changed snapshot through a changed hash', () => {
    expect(hashCertificatePayload(certificate.canonicalPayload)).not.toBe(
      hashCertificatePayload({ ...certificate.canonicalPayload, farm: { name: 'Changed' } }),
    );
  });
  it('builds an opaque verification URL without embedding certificate data', () => {
    expect(verificationUrl(certificate.verificationId)).toMatch(
      /\/verify\/certificate\/opaque-test-id$/,
    );
    expect(verificationUrl(certificate.verificationId)).not.toContain('COW-102');
  });
  it('generates a PDF containing certificate identity and the no-laboratory disclaimer', async () => {
    const pdf = await renderCertificatePdf(certificate);
    const text = pdf.toString('latin1');
    expect(text.startsWith('%PDF-')).toBe(true);
    expect(text).toContain('MEC-2026-TEST');
    expect(text).toContain(Buffer.from('residue').toString('hex'));
    expect(certificate.disclaimer).toBe(CERTIFICATE_DISCLAIMER);
  });
});
