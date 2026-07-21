import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { getDb } from './mongo.server';
import bcrypt from 'bcryptjs';

type LoginData = {
  email: string;
  password: string;
};

type SignUpData = {
  npi: string;
  email: string;
  phone: string;
  password: string;
};

type SessionUser = {
  email: string;
  name: string;
  role: string;
  registrationNo?: string;
  phone?: string;
  npi?: string;
  licenses?: Array<{
    license_number: string;
    state: string;
    specialty: string;
    is_primary: boolean;
  }>;
};

const knownDoctors = [
  {
    registrationNo: 'DR-1001',
    email: 'doctor@transitaccess.test',
    phone: '5551234567',
    name: 'Dr. Maya Chen',
    npi: '1467475142',
    licenses: [
      { license_number: 'MD-01467475142', state: 'MA', specialty: 'Family Medicine', is_primary: true },
    ],
  },
  {
    registrationNo: 'DR-1002',
    email: 'jordan.alvarez@transitaccess.test',
    phone: '5559876543',
    name: 'Dr. Jordan Alvarez',
    npi: '1851368945',
    licenses: [
      { license_number: 'MD-01851368945', state: 'NY', specialty: 'Internal Medicine', is_primary: true },
    ],
  },
];

let usersLoadPromise: Promise<void> | null = null;

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const signUpSchema = z.object({
  npi: z.string().trim().regex(/^\d{10}$/, 'NPI must be exactly 10 digits'),
  email: z.string().email(),
  phone: z.string().trim().min(10),
  password: z.string().min(8),
});

export const login = createServerFn({ method: 'POST' })
  .validator((input: unknown) => loginSchema.parse(input))
  .handler(async ({ data }) => {
    console.log('[auth] login attempt', { email: data.email });
    const db = await getDb();
    const usersColl = db.collection('users');
    try {
      await usersColl.createIndex({ email: 1 }, { unique: true });
    } catch {
      // ignore
    }
    const emailNorm = data.email.trim().toLowerCase();
    const user = await usersColl.findOne({ email: emailNorm }, { projection: { password: 1, name: 1, role: 1, registrationNo: 1, npi: 1, licenses: 1, phone: 1 } });
    console.log('[auth] db user found:', !!user);
    if (user) console.log('[auth] stored password preview:', typeof (user as any).password, String((user as any).password).slice(0,6));
    if (!user) {
      return { ok: false as const, error: 'Invalid email or password' };
    }

    const stored = (user as any).password || '';
    let passwordMatches = false;

    // Detect bcrypt hash (starts with $2a$ or $2b$ or $2y$)
    const looksLikeBcrypt = typeof stored === 'string' && stored.startsWith('$2');
    if (looksLikeBcrypt) {
      passwordMatches = bcrypt.compareSync(data.password, stored);
    } else {
      // Legacy plaintext fallback: allow direct compare and migrate to hashed password
      if (data.password === stored) {
        passwordMatches = true;
        try {
          const hashed = bcrypt.hashSync(data.password, 10);
          if ((usersColl as any).updateOne) {
            (usersColl as any).updateOne({ email: emailNorm }, { $set: { password: hashed } }).catch(() => {});
            console.log('[auth] migrated plaintext password to hash for', emailNorm);
          } else {
            try { (user as any).password = hashed; } catch {};
          }
        } catch (e) {
          console.error('[auth] failed to migrate plaintext password', e);
        }
      }
    }

    if (!passwordMatches) {
      return { ok: false as const, error: 'Invalid email or password' };
    }

    const { createJwt, setSessionCookie } = await import('./auth.server');
    const token = createJwt({
      email: user.email,
      name: user.name,
      role: user.role,
      registrationNo: user.registrationNo,
      npi: user.npi,
      licenses: user.licenses,
    });
    setSessionCookie(token);

    return {
      ok: true as const,
      user: {
        email: user.email,
        name: user.name,
        role: user.role,
        registrationNo: user.registrationNo,
        phone: user.phone,
        npi: user.npi,
        licenses: user.licenses,
      },
    };
  });

export const signUp = createServerFn({ method: 'POST' })
  .validator((input: unknown) => signUpSchema.parse(input))
  .handler(async ({ data }) => {
    const normalizedNpi = data.npi.trim();
    const account = knownDoctors.find((item) => item.npi === normalizedNpi);
    if (!account) {
      return { ok: false as const, error: 'NPI not found' };
    }

      // Allow any email/phone to be provided by the user during signup.
      // Do NOT require the entered email/phone to match the official record.

    const db = await getDb();
    const usersColl = db.collection('users');
    try {
      await usersColl.createIndex({ email: 1 }, { unique: true });
    } catch {
      // ignore
    }

    const emailNorm = data.email.trim().toLowerCase();
    const existing = await usersColl.findOne({ email: emailNorm });
    if (existing) {
      return { ok: false as const, error: 'Email already registered. Please log in.' };
    }

    const hashed = bcrypt.hashSync(data.password, 10);
    const userDoc = {
      email: emailNorm,
      name: account.name,
      role: 'doctor' as const,
      registrationNo: account.registrationNo,
      phone: data.phone,
      npi: account.npi,
      licenses: account.licenses,
      password: hashed,
    } as any;

    await usersColl.insertOne(userDoc);
    console.log('[auth] new user registered', { email: userDoc.email });

    const { createJwt, setSessionCookie } = await import('./auth.server');
    const token = createJwt({
      email: userDoc.email,
      name: userDoc.name,
      role: userDoc.role,
      registrationNo: userDoc.registrationNo,
      npi: userDoc.npi,
      licenses: userDoc.licenses,
    });
    setSessionCookie(token);

    return {
      ok: true as const,
      user: {
        email: userDoc.email,
        name: userDoc.name,
        role: userDoc.role,
        registrationNo: userDoc.registrationNo,
        npi: userDoc.npi,
        licenses: userDoc.licenses,
      },
    };
  });

export const logout = createServerFn({ method: 'POST' }).handler(async () => {
  const { clearSessionCookie } = await import('./auth.server');
  clearSessionCookie();
  return { ok: true as const };
});

export const getSession = createServerFn({ method: 'GET' }).handler(async () => {
  const { getSessionToken, verifyJwt, clearSessionCookie } = await import('./auth.server');
  const token = getSessionToken();
  if (!token) {
    return { authenticated: false as const };
  }

  try {
    const payload = verifyJwt(token);
    return {
      authenticated: true as const,
      user: {
        email: payload.email,
        name: payload.name,
        role: payload.role,
        registrationNo: payload.registrationNo,
        npi: payload.npi,
        licenses: payload.licenses,
      },
    };
  } catch {
    clearSessionCookie();
    return { authenticated: false as const };
  }
});

const requestResetSchema = z.object({ email: z.string().email() });

const resetPasswordSchema = z.object({
  email: z.string().email(),
  token: z.string().min(1),
  password: z.string().min(8),
});

type ResetTokenRecord = { email: string; token: string; expiresAt: number };
const resetTokens: ResetTokenRecord[] = [];

export const requestPasswordReset = createServerFn({ method: 'POST' })
  .validator((input: unknown) => requestResetSchema.parse(input))
  .handler(async ({ data }) => {
    const db = await getDb();
    const usersColl = db.collection('users');
    const emailNorm = data.email.trim().toLowerCase();
    const user = await usersColl.findOne({ email: emailNorm });
    if (!user) return { ok: false as const, error: 'No account for that email' };

    const token = Math.random().toString(36).slice(2, 10).toUpperCase();
    const expiresAt = Date.now() + 1000 * 60 * 15; // 15 minutes
    resetTokens.push({ email: emailNorm, token, expiresAt });

    // In a real app we'd email the token. For this demo return it so it can be used immediately.
    return { ok: true as const, token };
  });

export const resetPassword = createServerFn({ method: 'POST' })
  .validator((input: unknown) => resetPasswordSchema.parse(input))
  .handler(async ({ data }) => {
    const db = await getDb();
    const usersColl = db.collection('users');
    const recordIndex = resetTokens.findIndex(
      (r) => r.email.toLowerCase() === data.email.trim().toLowerCase() && r.token === data.token,
    );
    if (recordIndex === -1) return { ok: false as const, error: 'Invalid token' };

    const record = resetTokens[recordIndex];
    if (Date.now() > record.expiresAt) {
      resetTokens.splice(recordIndex, 1);
      return { ok: false as const, error: 'Token expired' };
    }

    const emailNorm = data.email.trim().toLowerCase();
    const user = await usersColl.findOne({ email: emailNorm });
    if (!user) return { ok: false as const, error: 'No account for that email' };

    // Update password
    try {
      // some in-memory dbs don't support update; attempt with updateOne if available
      if ((usersColl as any).updateOne) {
        const hashed = bcrypt.hashSync(data.password, 10);
        const res = await (usersColl as any).updateOne({ email: emailNorm }, { $set: { password: hashed } });
        console.log('[auth] reset: attempted DB update for', emailNorm, 'result', res?.matchedCount ?? res?.matched ?? res);
        // verify
        try {
          const verifyUser = await usersColl.findOne({ email: emailNorm }, { projection: { password: 1 } });
          const ok = verifyUser && bcrypt.compareSync(data.password, (verifyUser as any).password || '');
          console.log('[auth] reset: verify new password success=', !!ok);
        } catch (e) {
          console.warn('[auth] reset: verification after update failed', e);
        }
        console.log('[auth] reset: updated password hash in DB for', emailNorm, String(hashed).slice(0,6));
      } else {
        // fallback: remove + re-insert (memory impl doesn't provide updateOne)
        // read docs not available here; simple no-op for fallback
        // In memory, findOne returned object reference; try mutate if possible
        try {
          const hashed = bcrypt.hashSync(data.password, 10);
          (user as any).password = hashed;
          console.log('[auth] reset: updated in-memory password hash for', emailNorm, String(hashed).slice(0,6));
        } catch {}
      }
    } catch (e) {
      console.error('[auth] failed to update password', e);
    }
    resetTokens.splice(recordIndex, 1);
    return { ok: true as const };
  });
