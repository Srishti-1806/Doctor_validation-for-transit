import crypto from 'node:crypto';
import { deleteCookie, getCookie, setCookie } from '@tanstack/react-start/server';

const SESSION_COOKIE = 'transit_session';
const JWT_SECRET = process.env.JWT_SECRET ?? 'transit-development-secret';
const SESSION_MAX_AGE = 60 * 60 * 24; // 1 day

export type SessionPayload = {
  email: string;
  name: string;
  role: string;
  registrationNo?: string;
  npi?: string;
  licenses?: Array<{
    license_number: string;
    state: string;
    specialty: string;
    is_primary: boolean;
  }>;
  iat: number;
  exp: number;
};

function base64urlEncode(value: Buffer | string) {
  const buffer = typeof value === 'string' ? Buffer.from(value, 'utf8') : value;
  return buffer.toString('base64').replace(/=+$/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function base64urlDecode(value: string) {
  const padded = value.padEnd(value.length + ((4 - (value.length % 4)) % 4), '=');
  const normalized = padded.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(normalized, 'base64');
}

function signHmac(data: string) {
  return crypto.createHmac('sha256', JWT_SECRET).update(data).digest();
}

function constantTimeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i += 1) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export function createJwt(payload: {
  email: string;
  name: string;
  role: string;
  registrationNo?: string;
  npi?: string;
  licenses?: Array<{
    license_number: string;
    state: string;
    specialty: string;
    is_primary: boolean;
  }>;
}) {
  const now = Math.floor(Date.now() / 1000);
  const body = {
    ...payload,
    iat: now,
    exp: now + SESSION_MAX_AGE,
  };
  const header = { alg: 'HS256', typ: 'JWT' };
  const encoded = `${base64urlEncode(JSON.stringify(header))}.${base64urlEncode(JSON.stringify(body))}`;
  const signature = base64urlEncode(signHmac(encoded));
  return `${encoded}.${signature}`;
}

export function verifyJwt(token: string) {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid session token');
  }

  const [encodedHeader, encodedBody, encodedSignature] = parts;
  const signed = `${encodedHeader}.${encodedBody}`;
  const expectedSignature = base64urlEncode(signHmac(signed));

  if (!constantTimeEqual(expectedSignature, encodedSignature)) {
    throw new Error('Invalid session token');
  }

  const body = JSON.parse(base64urlDecode(encodedBody).toString('utf8')) as SessionPayload;
  if (typeof body.exp !== 'number' || body.exp < Math.floor(Date.now() / 1000)) {
    throw new Error('Session expired');
  }

  return body;
}

export function setSessionCookie(token: string) {
  setCookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });
}

export function clearSessionCookie() {
  deleteCookie(SESSION_COOKIE, {
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });
}

export function getSessionToken() {
  return getCookie(SESSION_COOKIE);
}
