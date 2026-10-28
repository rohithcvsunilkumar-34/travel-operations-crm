// lib/auth.ts

export const COOKIE_NAME = 'crm_session';

export function getSessionSecret(): string {
  return process.env.SESSION_SECRET || 'travel_crm_secure_session_secret_key_2026';
}

export function getAdminCredentials() {
  return {
    username: process.env.CRM_ADMIN_USERNAME || 'admin',
    password: process.env.CRM_ADMIN_PASSWORD || 'admin123',
  };
}

/**
 * Creates a cryptographically signed HMAC-SHA256 session token
 * Format: username:expiresAt:signatureHex
 */
export async function createSessionToken(username: string): Promise<string> {
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days validity
  const data = `${username}:${expiresAt}`;
  const enc = new TextEncoder();
  
  const secretKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(getSessionSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const sigBuffer = await crypto.subtle.sign('HMAC', secretKey, enc.encode(data));
  const sigHex = Array.from(new Uint8Array(sigBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return `${data}:${sigHex}`;
}

/**
 * Verifies the session token and expiration date
 */
export async function verifySessionToken(
  token?: string | null
): Promise<{ valid: boolean; username?: string }> {
  if (!token) return { valid: false };

  const parts = token.split(':');
  if (parts.length !== 3) return { valid: false };

  const [username, expiresAtStr, sigHex] = parts;
  const expiresAt = parseInt(expiresAtStr, 10);

  if (isNaN(expiresAt) || Date.now() > expiresAt) {
    return { valid: false };
  }

  try {
    const enc = new TextEncoder();
    const data = `${username}:${expiresAtStr}`;
    const secretKey = await crypto.subtle.importKey(
      'raw',
      enc.encode(getSessionSecret()),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const sigBytes = new Uint8Array(
      sigHex.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || []
    );

    const isValid = await crypto.subtle.verify(
      'HMAC',
      secretKey,
      sigBytes,
      enc.encode(data)
    );

    if (isValid) {
      return { valid: true, username };
    }
  } catch {
    return { valid: false };
  }

  return { valid: false };
}

