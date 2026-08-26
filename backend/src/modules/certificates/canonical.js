import crypto from 'node:crypto';

export const CANONICALIZATION_VERSION = 'SIH-CERT-1.0';
export const CERTIFICATE_DISCLAIMER =
  'This certificate represents milk eligibility based on recorded treatment history and configured withdrawal-period reference rules. It does not represent laboratory residue testing.';

function normalize(value) {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, normalize(value[key])]),
    );
  return value;
}

export function canonicalize(payload) {
  return JSON.stringify(normalize(payload));
}

export function hashCertificatePayload(payload) {
  return crypto.createHash('sha256').update(canonicalize(payload), 'utf8').digest('hex');
}
