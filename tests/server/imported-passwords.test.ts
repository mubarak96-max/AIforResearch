import { describe, expect, it } from 'vitest';
import bcrypt from 'bcryptjs';
import { hash } from '@node-rs/argon2';
import { isImportedHash, verifyLegacyPassword } from '../../lib/server/lib/legacyPasswords.js';

describe('legacy passwords (moved into Firebase Auth on first sign-in)', () => {
  it('accepts the right password for a Laravel $2y$ hash and refuses a wrong one', async () => {
    const laravel = bcrypt.hashSync('old-password-1', 10).replace(/^\$2b\$/, '$2y$');
    expect(isImportedHash(laravel)).toBe(true);
    expect(await verifyLegacyPassword(laravel, 'old-password-1')).toBe(true);
    expect(await verifyLegacyPassword(laravel, 'wrong-password')).toBe(false);
  });

  it('checks argon2 hashes from the self-hosted version', async () => {
    const ours = await hash('new-password-2', { memoryCost: 19456, timeCost: 2, parallelism: 1 });
    expect(isImportedHash(ours)).toBe(false);
    expect(await verifyLegacyPassword(ours, 'new-password-2')).toBe(true);
    expect(await verifyLegacyPassword(ours, 'nope')).toBe(false);
  });

  it('checks argon2 hashes with several lanes and other variants', async () => {
    const multi = await hash('lanes-3', { memoryCost: 4096, timeCost: 3, parallelism: 4 });
    expect(await verifyLegacyPassword(multi, 'lanes-3')).toBe(true);
    expect(await verifyLegacyPassword(multi, 'lanes-4')).toBe(false);
    const i = await hash('variant-i', { memoryCost: 4096, timeCost: 2, parallelism: 1, algorithm: 1 });
    expect(await verifyLegacyPassword(i, 'variant-i')).toBe(true);
  });

  it('refuses garbage instead of throwing', async () => {
    expect(await verifyLegacyPassword('not-a-hash', 'x')).toBe(false);
  });
});
