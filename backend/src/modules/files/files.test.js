import { describe, expect, it, vi } from 'vitest';

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn().mockResolvedValue('https://mock-s3.test/signed'),
}));
import { validatePrivateFile } from './routes.js';

describe('private file validation with AWS signing mocked', () => {
  it('accepts supported credential metadata', () =>
    expect(() =>
      validatePrivateFile({ mimeType: 'application/pdf', sizeBytes: 1024 }),
    ).not.toThrow());
  it('rejects invalid MIME and oversized files before AWS access', () => {
    expect(() => validatePrivateFile({ mimeType: 'text/html', sizeBytes: 100 })).toThrowError(
      /PDF/,
    );
    expect(() =>
      validatePrivateFile({ mimeType: 'image/png', sizeBytes: 99_000_000 }),
    ).toThrowError(/exceeds/);
  });
});
