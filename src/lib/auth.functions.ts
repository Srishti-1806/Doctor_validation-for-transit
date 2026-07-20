import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

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

const users: Array<SessionUser & { password: string }> = [
  {
    email: 'doctor@transitaccess.test',
    password: 'password123',
    name: 'Dr. Maya Chen',
    role: 'doctor',
    registrationNo: 'DR-1001',
    phone: '5551234567',
    npi: '1467475142',
    licenses: [
      { license_number: 'MD-01467475142', state: 'MA', specialty: 'Family Medicine', is_primary: true },
    ],
  },
];

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
    const user = users.find(
      (item) => item.email.toLowerCase() === data.email.trim().toLowerCase() && item.password === data.password,
    );
    if (!user) {
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

    const normalizedPhone = data.phone.replace(/\D/g, '');
    if (
      account.email.toLowerCase() !== data.email.trim().toLowerCase() ||
      account.phone.replace(/\D/g, '') !== normalizedPhone
    ) {
      return { ok: false as const, error: 'Entered details do not match official record' };
    }

    const existing = users.find(
      (item) =>
        item.email.toLowerCase() === data.email.trim().toLowerCase() ||
        item.npi === account.npi,
    );
    if (existing) {
      return { ok: false as const, error: 'Email or NPI already registered. Please log in.' };
    }

    const user = {
      email: account.email,
      name: account.name,
      role: 'doctor' as const,
      registrationNo: account.registrationNo,
      phone: account.phone,
      npi: account.npi,
      licenses: account.licenses,
      password: data.password,
    };
    users.push(user);

    return {
      ok: true as const,
      user: {
        email: user.email,
        name: user.name,
        role: user.role,
        registrationNo: user.registrationNo,
        npi: user.npi,
        licenses: user.licenses,
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
