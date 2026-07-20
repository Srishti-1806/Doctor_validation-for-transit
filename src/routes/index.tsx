import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState, type FormEvent } from "react";
import {
  verifyDoctor,
  verifyClient,
  submitVerification,
} from "@/lib/verification.functions";
import { getSession, login, logout, signUp } from "@/lib/auth.functions";

export const Route = createFileRoute("/")({
  component: HomePage,
});

type AuthUser = {
  email: string;
  name: string;
  role: string;
  registrationNo?: string;
  phone?: string;
  npi?: string;
  licenses?: DoctorLicense[];
};

type DoctorLicense = {
  license_number: string;
  state: string;
  specialty: string;
  is_primary: boolean;
};
type VerifiedDoctor = {
  npi: string;
  doctorName: string;
  licenses: DoctorLicense[];
};
type VerifiedClient = {
  tenant: string;
  clientId: string;
  fullName: string;
  dob: string;
};

function HomePage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [doctor, setDoctor] = useState<VerifiedDoctor | null>(null);
  const [client, setClient] = useState<VerifiedClient | null>(null);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [npi, setNpi] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pendingSignUp, setPendingSignUp] = useState<{
    npi: string;
    email: string;
    phone: string;
  } | null>(null);
  const [pendingSignIn, setPendingSignIn] = useState<AuthUser | null>(null);
  const [authSubmitting, setAuthSubmitting] = useState(false);

  const getSessionFn = useServerFn(getSession);
  const loginFn = useServerFn(login);
  const signUpFn = useServerFn(signUp);
  const logoutFn = useServerFn(logout);

  useEffect(() => {
    void (async () => {
      setAuthLoading(true);
      try {
        const res = await getSessionFn();
        if (res.authenticated) {
          setUser(res.user);
          if (res.user.npi && res.user.licenses?.length) {
            setDoctor({
              npi: res.user.npi,
              doctorName: res.user.name,
              licenses: res.user.licenses,
            });
            setStep(2);
          }
        } else {
          setUser(null);
        }
      } catch (err) {
        setUser(null);
      } finally {
        setAuthLoading(false);
      }
    })();
  }, [getSessionFn]);

  async function handleAuthSubmit(e: FormEvent) {
    e.preventDefault();
    setAuthError(null);
    setAuthSubmitting(true);

    try {
      const trimmedEmail = email.trim();
      const trimmedNpi = npi.trim();
      const trimmedPhone = phone.trim();
      const res = authMode === 'signup'
        ? await signUpFn({ data: { npi: trimmedNpi, email: trimmedEmail, phone: trimmedPhone, password } })
        : await loginFn({ data: { email: trimmedEmail, password } });

      if (!res.ok) {
        setAuthError(res.error ?? (authMode === 'signup' ? 'Signup failed' : 'Login failed'));
      } else if (authMode === 'signup') {
        setPendingSignUp({ npi: trimmedNpi, email: trimmedEmail, phone: trimmedPhone });
        setPendingSignIn(res.user);
        setAuthMode('login');
        setNpi('');
        setPhone('');
        setPassword('');
        setAuthError(null);
      } else {
        setPendingSignIn(res.user);
        setPendingSignUp(null);
        setAuthError(null);
      }
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : (authMode === 'signup' ? 'Signup failed' : 'Login failed'));
    } finally {
      setAuthSubmitting(false);
    }
  }

  async function handleLogout() {
    setAuthError(null);
    try {
      await logoutFn();
    } catch {
      // ignore
    }
    setUser(null);
    setDoctor(null);
    setClient(null);
    setSubmissionId(null);
    setStep(1);
  }

  const confirmingSignUp = Boolean(pendingSignUp);
  const confirmingSignIn = Boolean(pendingSignIn);
  const pendingConfirmData = pendingSignUp ?? pendingSignIn;

  function confirmPendingSignIn() {
    if (!pendingSignIn) return;
    setUser(pendingSignIn);
    setPendingSignIn(null);
    setPendingSignUp(null);
    if (pendingSignIn.npi && pendingSignIn.licenses?.length) {
      setDoctor({ npi: pendingSignIn.npi, doctorName: pendingSignIn.name, licenses: pendingSignIn.licenses });
      setStep(2);
    }
    setAuthError(null);
  }

  return (
    <main className="min-h-screen">
      <header className="border-b border-[var(--color-border)] bg-[var(--color-card)]/70 backdrop-blur">
        <div className="mx-auto max-w-4xl px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <LogoMark />
            <div>
              <p className="font-display text-lg font-semibold leading-none">TransitAccess</p>
              <p className="text-xs text-[var(--color-muted-foreground)] mt-1">
                Physician-certified disability travel verification
              </p>
            </div>
          </div>
          <span className="chip">Federal NPI · Secure</span>
        </div>
      </header>

      {authLoading ? (
        <section className="mx-auto max-w-4xl px-6 pt-10 pb-16">
          <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-card)] p-8">
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">Checking session</h1>
            <p className="mt-3 text-[var(--color-muted-foreground)] max-w-2xl">
              Loading your account and verifying whether you are signed in.
            </p>
          </div>
        </section>
      ) : !user ? (
        <section className="mx-auto max-w-4xl px-6 pt-10 pb-16">
          <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-card)] p-8">
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
              {pendingSignUp ? 'Confirm your new account' : pendingSignIn ? 'Confirm your sign in' : 'Sign in to continue'}
            </h1>
            <p className="mt-3 text-[var(--color-muted-foreground)] max-w-2xl">
              {pendingSignUp ? (
                'We found a matching doctor account from your signup. Confirm this was you before logging in.'
              ) : pendingSignIn ? (
                'A sign-in attempt succeeded. Confirm this was you before continuing.'
              ) : (
                'You must sign in as a verified physician to use this verification portal.'
              )}
            </p>

            {pendingConfirmData ? (
              <div className="mt-8 space-y-4">
                <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)] p-6">
                  <p className="text-sm text-[var(--color-muted-foreground)]">Account details</p>
                  {pendingConfirmData.name ? (
                    <p className="mt-2"><strong>Name:</strong> {pendingConfirmData.name}</p>
                  ) : null}
                  <p className="mt-2"><strong>Email:</strong> {pendingConfirmData.email}</p>
                  {pendingConfirmData.npi ? (
                    <p className="mt-1"><strong>NPI:</strong> {pendingConfirmData.npi}</p>
                  ) : null}
                  {pendingConfirmData.phone ? (
                    <p className="mt-1"><strong>Phone:</strong> {pendingConfirmData.phone}</p>
                  ) : null}
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={confirmPendingSignIn}
                  >
                    Yes, this was me
                  </button>
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => {
                      setPendingSignUp(null);
                      setPendingSignIn(null);
                      setAuthMode(confirmingSignUp ? 'signup' : 'login');
                      setNpi('');
                      setEmail('');
                      setPhone('');
                      setPassword('');
                      setAuthError(null);
                    }}
                  >
                    No, start over
                  </button>
                </div>
              </div>
            ) : (
              <>
                <form onSubmit={handleAuthSubmit} className="mt-8 space-y-4">
                  {authMode === 'signup' && (
                    <>
                      <div>
                        <label htmlFor="npi" className="block text-sm font-medium mb-1.5">
                          NPI number (10 digits)
                        </label>
                        <input
                          id="npi"
                          type="text"
                          className="field-input"
                          value={npi}
                          onChange={(e) => setNpi(e.target.value.replace(/\D/g, ''))}
                          maxLength={10}
                          required
                        />
                      </div>
                      <div>
                        <label htmlFor="phone" className="block text-sm font-medium mb-1.5">
                          Phone number
                        </label>
                        <input
                          id="phone"
                          type="tel"
                          className="field-input"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          required
                        />
                      </div>
                    </>
                  )}
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium mb-1.5">
                      Email address
                    </label>
                    <input
                      id="email"
                      type="email"
                      className="field-input"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium mb-1.5">
                      Password
                    </label>
                    <input
                      id="password"
                      type="password"
                      className="field-input"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  {authError ? <p className="text-sm text-destructive">{authError}</p> : null}
                  <button type="submit" className="btn-primary" disabled={authSubmitting}>
                    {authSubmitting ? (authMode === 'signup' ? 'Signing up…' : 'Signing in…') : authMode === 'signup' ? 'Sign up' : 'Sign in'}
                  </button>
                </form>
                <div className="mt-4 text-sm text-[var(--color-muted-foreground)]">
                  {authMode === 'signup' ? (
                    <>
                      Already have an account?{' '}
                      <button
                        type="button"
                        className="font-medium text-primary underline"
                        onClick={() => { setAuthMode('login'); setPendingSignUp(null); setAuthError(null); }}
                      >
                        Log in
                      </button>
                    </>
                  ) : (
                    <>
                      New here?{' '}
                      <button
                        type="button"
                        className="font-medium text-primary underline"
                        onClick={() => { setAuthMode('signup'); setPendingSignUp(null); setAuthError(null); }}
                      >
                        Create account
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </section>
      ) : (
        <>
          <section className="mx-auto max-w-4xl px-6 pt-10 pb-6">
            <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-card)] p-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm text-[var(--color-muted-foreground)]">Signed in as</p>
                <p className="text-xl font-semibold">{user.name}</p>
                <p className="text-sm text-[var(--color-muted-foreground)]">{user.email}</p>
              </div>
              <button type="button" className="btn-ghost" onClick={handleLogout}>
                Sign out
              </button>
            </div>
            <div className="mt-8">
              <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
                Certify a passenger for reduced-fare transit
              </h1>
              <p className="mt-3 text-[var(--color-muted-foreground)] max-w-2xl">
                Complete three quick steps: verify your NPI credentials, look up the
                transit provider &amp; passenger record, and file the disability
                assessment. Records are stored securely for the transit agency.
              </p>
            </div>
          </section>

          <section className="mx-auto max-w-4xl px-6 pb-4">
            <Stepper step={step} />
          </section>

          <section className="mx-auto max-w-4xl px-6 pb-16">
            {step === 1 && (
              <DoctorStep
                onVerified={(d) => {
                  setDoctor(d);
                  setStep(2);
                }}
              />
            )}
            {step === 2 && doctor && (
              <ClientStep
                doctor={doctor}
                onBack={() => setStep(1)}
                onVerified={(c) => {
                  setClient(c);
                  setStep(3);
                }}
              />
            )}
            {step === 3 && doctor && client && (
              <AssessmentStep
                doctor={doctor}
                client={client}
                onBack={() => setStep(2)}
                onSubmitted={(id) => {
                  setSubmissionId(id);
                  setStep(4);
                  void router.invalidate();
                }}
              />
            )}
            {step === 4 && submissionId && (
              <SuccessStep
                id={submissionId}
                onRestart={() => {
                  setDoctor(null);
                  setClient(null);
                  setSubmissionId(null);
                  setStep(1);
                }}
              />
            )}
          </section>
        </>
      )}
    </main>
  );
}

function LogoMark() {
  return (
    <div
      aria-hidden
      className="h-10 w-10 rounded-xl flex items-center justify-center"
      style={{
        background:
          "linear-gradient(135deg, var(--color-primary), oklch(0.62 0.14 195))",
        color: "var(--color-primary-foreground)",
      }}
    >
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2v4" />
        <path d="M5 8h14l-1.5 12H6.5L5 8z" />
        <path d="M9 12h6" />
      </svg>
    </div>
  );
}

function Stepper({ step }: { step: 1 | 2 | 3 | 4 }) {
  const items = [
    { n: 1, label: "Doctor NPI" },
    { n: 2, label: "Client lookup" },
    { n: 3, label: "Assessment" },
  ];
  return (
    <ol className="flex items-center gap-3">
      {items.map((it, i) => {
        const active = step === it.n || (step === 4 && it.n === 3);
        const done = step > it.n || (step === 4 && it.n <= 3);
        return (
          <li key={it.n} className="flex items-center gap-3 flex-1">
            <div
              className="h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold border transition-colors"
              style={{
                backgroundColor: done
                  ? "var(--color-success)"
                  : active
                  ? "var(--color-primary)"
                  : "var(--color-card)",
                color: done || active ? "var(--color-primary-foreground)" : "var(--color-muted-foreground)",
                borderColor: done || active ? "transparent" : "var(--color-border)",
              }}
            >
              {done ? "✓" : it.n}
            </div>
            <span
              className={`text-sm font-medium ${
                active || done ? "text-[var(--color-foreground)]" : "text-[var(--color-muted-foreground)]"
              }`}
            >
              {it.label}
            </span>
            {i < items.length - 1 && (
              <div className="h-px flex-1 bg-[var(--color-border)]" />
            )}
          </li>
        );
      })}
    </ol>
  );
}

// ---------------- Step 1 ----------------
function DoctorStep({ onVerified }: { onVerified: (d: VerifiedDoctor) => void }) {
  const verify = useServerFn(verifyDoctor);
  const [npi, setNpi] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await verify({ data: { npi: npi.trim() } });
      if (!res.ok) setError(res.error);
      else onVerified(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card-surface p-8">
      <h2 className="text-xl font-semibold">Step 1 — Verify your NPI</h2>
      <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
        We check the federal NPPES registry to confirm you are a licensed U.S. provider.
      </p>
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="npi" className="block text-sm font-medium mb-1.5">
            NPI number (10 digits)
          </label>
          <input
            id="npi"
            className="field-input"
            inputMode="numeric"
            autoComplete="off"
            maxLength={10}
            placeholder="e.g. 1234567890"
            value={npi}
            onChange={(e) => setNpi(e.target.value.replace(/\D/g, ""))}
            required
          />
        </div>
        {error && <ErrorNote>{error}</ErrorNote>}
        <button type="submit" className="btn-primary" disabled={loading || npi.length !== 10}>
          {loading ? "Verifying…" : "Verify credentials →"}
        </button>
      </form>
    </div>
  );
}

// ---------------- Step 2 ----------------
function ClientStep({
  doctor,
  onBack,
  onVerified,
}: {
  doctor: VerifiedDoctor;
  onBack: () => void;
  onVerified: (c: VerifiedClient) => void;
}) {
  const verify = useServerFn(verifyClient);
  const [tenant, setTenant] = useState("");
  const [clientId, setClientId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await verify({ data: { tenant: tenant.trim(), clientId: clientId.trim() } });
      if (!res.ok) setError(res.error);
      else onVerified(res.client);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lookup failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card-surface p-8">
      <VerifiedBanner
        title={`Verified: ${doctor.doctorName}`}
        subtitle={`NPI ${doctor.npi} · ${doctor.licenses.length} active license${
          doctor.licenses.length === 1 ? "" : "s"
        }`}
      />
      <h2 className="mt-6 text-xl font-semibold">Step 2 — Look up the passenger</h2>
      <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
        Enter the transit provider (tenant) and the passenger&apos;s client ID as
        printed on their transit-agency intake form.
      </p>
      <form onSubmit={handleSubmit} className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">Tenant (transit provider)</label>
          <input
            className="field-input"
            placeholder="e.g. MBTA"
            value={tenant}
            onChange={(e) => setTenant(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Client ID</label>
          <input
            className="field-input"
            placeholder="e.g. MBTA-1001"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            required
          />
        </div>
        {error && (
          <div className="md:col-span-2">
            <ErrorNote>{error}</ErrorNote>
          </div>
        )}
        <div className="md:col-span-2 flex items-center gap-3">
          <button type="button" className="btn-ghost" onClick={onBack}>
            ← Back
          </button>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "Looking up…" : "Find passenger →"}
          </button>
          <p className="text-xs text-[var(--color-muted-foreground)] ml-auto">
            Try: <code>MBTA</code> / <code>MBTA-1001</code>
          </p>
        </div>
      </form>
    </div>
  );
}

// ---------------- Step 3 ----------------
function AssessmentStep({
  doctor,
  client,
  onBack,
  onSubmitted,
}: {
  doctor: VerifiedDoctor;
  client: VerifiedClient;
  onBack: () => void;
  onSubmitted: (id: string) => void;
}) {
  const submit = useServerFn(submitVerification);
  const primary = doctor.licenses[0];
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    licenseNumber: primary?.license_number ?? "",
    licenseState: primary?.state ?? "",
    specialty: primary?.specialty ?? "",
    patientName: client.fullName,
    patientDob: client.dob,
    disabilityType: "Mobility" as
      | "Mobility"
      | "Visual"
      | "Hearing"
      | "Cognitive"
      | "Developmental"
      | "Psychiatric"
      | "Other",
    diagnosis: "",
    icd10: "",
    onsetDate: "",
    permanence: "Permanent" as "Permanent" | "Temporary",
    validUntil: "",
    mobilityAids: "",
    canTravelIndependently: "Yes" as "Yes" | "No",
    requiresAttendant: "No" as "Yes" | "No",
    accommodations: "",
    certificationStatement: `I, ${doctor.doctorName}, certify that I have personally examined this patient and the information provided is accurate to the best of my knowledge.`,
    examinationDate: new Date().toISOString().slice(0, 10),
  });

  function update<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await submit({
        data: {
          tenant: client.tenant,
          clientId: client.clientId,
          doctor: {
            npi: doctor.npi,
            name: doctor.doctorName,
            licenseNumber: form.licenseNumber,
            licenseState: form.licenseState,
            specialty: form.specialty,
          },
          patient: {
            fullName: form.patientName,
            dob: form.patientDob,
          },
          assessment: {
            disabilityType: form.disabilityType,
            diagnosis: form.diagnosis,
            icd10: form.icd10,
            onsetDate: form.onsetDate,
            permanence: form.permanence,
            validUntil: form.permanence === "Temporary" ? form.validUntil : "",
            mobilityAids: form.mobilityAids,
            canTravelIndependently: form.canTravelIndependently,
            requiresAttendant: form.requiresAttendant,
            accommodations: form.accommodations,
            certificationStatement: form.certificationStatement,
            examinationDate: form.examinationDate,
          },
        },
      });
      onSubmitted(res.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card-surface p-8">
      <VerifiedBanner
        title={`Passenger: ${client.fullName || client.clientId}`}
        subtitle={`${client.tenant} · Client ID ${client.clientId}${client.dob ? ` · DOB ${client.dob}` : ""}`}
      />
      <h2 className="mt-6 text-xl font-semibold">Step 3 — Disability assessment</h2>
      <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
        Complete the physician certification. All fields marked * are required.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-8">
        <FieldGroup title="Certifying physician">
          <Field label="License number *">
            <input className="field-input" required value={form.licenseNumber} onChange={(e) => update("licenseNumber", e.target.value)} />
          </Field>
          <Field label="License state *">
            <input className="field-input" required maxLength={4} value={form.licenseState} onChange={(e) => update("licenseState", e.target.value.toUpperCase())} />
          </Field>
          <Field label="Specialty" full>
            <input className="field-input" value={form.specialty} onChange={(e) => update("specialty", e.target.value)} />
          </Field>
        </FieldGroup>

        <FieldGroup title="Patient">
          <Field label="Full legal name *">
            <input className="field-input" required value={form.patientName} onChange={(e) => update("patientName", e.target.value)} />
          </Field>
          <Field label="Date of birth *">
            <input className="field-input" type="date" required value={form.patientDob} onChange={(e) => update("patientDob", e.target.value)} />
          </Field>
        </FieldGroup>

        <FieldGroup title="Disability details">
          <Field label="Category *">
            <select className="field-input" value={form.disabilityType} onChange={(e) => update("disabilityType", e.target.value as typeof form.disabilityType)}>
              {["Mobility", "Visual", "Hearing", "Cognitive", "Developmental", "Psychiatric", "Other"].map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </Field>
          <Field label="ICD-10 code">
            <input className="field-input" placeholder="e.g. G80.1" value={form.icd10} onChange={(e) => update("icd10", e.target.value.toUpperCase())} />
          </Field>
          <Field label="Primary diagnosis *" full>
            <textarea className="field-input" rows={2} required value={form.diagnosis} onChange={(e) => update("diagnosis", e.target.value)} />
          </Field>
          <Field label="Onset date">
            <input className="field-input" type="date" value={form.onsetDate} onChange={(e) => update("onsetDate", e.target.value)} />
          </Field>
          <Field label="Permanence *">
            <select className="field-input" value={form.permanence} onChange={(e) => update("permanence", e.target.value as typeof form.permanence)}>
              <option>Permanent</option>
              <option>Temporary</option>
            </select>
          </Field>
          {form.permanence === "Temporary" && (
            <Field label="Valid until *">
              <input className="field-input" type="date" required value={form.validUntil} onChange={(e) => update("validUntil", e.target.value)} />
            </Field>
          )}
        </FieldGroup>

        <FieldGroup title="Functional impact">
          <Field label="Mobility aids used" full>
            <input className="field-input" placeholder="Wheelchair, walker, white cane, service animal…" value={form.mobilityAids} onChange={(e) => update("mobilityAids", e.target.value)} />
          </Field>
          <Field label="Can travel independently *">
            <select className="field-input" value={form.canTravelIndependently} onChange={(e) => update("canTravelIndependently", e.target.value as "Yes" | "No")}>
              <option>Yes</option>
              <option>No</option>
            </select>
          </Field>
          <Field label="Requires an attendant *">
            <select className="field-input" value={form.requiresAttendant} onChange={(e) => update("requiresAttendant", e.target.value as "Yes" | "No")}>
              <option>Yes</option>
              <option>No</option>
            </select>
          </Field>
          <Field label="Additional accommodations" full>
            <textarea className="field-input" rows={2} value={form.accommodations} onChange={(e) => update("accommodations", e.target.value)} />
          </Field>
        </FieldGroup>

        <FieldGroup title="Certification">
          <Field label="Statement *" full>
            <textarea className="field-input" rows={3} required value={form.certificationStatement} onChange={(e) => update("certificationStatement", e.target.value)} />
          </Field>
          <Field label="Examination date *">
            <input className="field-input" type="date" required value={form.examinationDate} onChange={(e) => update("examinationDate", e.target.value)} />
          </Field>
        </FieldGroup>

        {error && <ErrorNote>{error}</ErrorNote>}

        <div className="flex items-center gap-3">
          <button type="button" className="btn-ghost" onClick={onBack}>
            ← Back
          </button>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "Submitting…" : "Submit certification"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ---------------- Step 4 ----------------
function SuccessStep({ id, onRestart }: { id: string; onRestart: () => void }) {
  return (
    <div className="card-surface p-10 text-center">
      <div
        className="mx-auto h-14 w-14 rounded-full flex items-center justify-center text-2xl"
        style={{ backgroundColor: "var(--color-success)", color: "var(--color-success-foreground)" }}
      >
        ✓
      </div>
      <h2 className="mt-5 text-2xl font-semibold">Certification submitted</h2>
      <p className="mt-2 text-[var(--color-muted-foreground)]">
        The transit agency has been notified. Reference ID:
      </p>
      <p className="mt-1 font-mono text-sm">{id}</p>
      <button className="btn-primary mt-6" onClick={onRestart}>
        Certify another passenger
      </button>
    </div>
  );
}

// ---------------- Shared bits ----------------
function FieldGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset>
      <legend className="text-sm font-semibold text-[var(--color-foreground)] mb-3">{title}</legend>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>
    </fieldset>
  );
}
function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <label className={`block ${full ? "md:col-span-2" : ""}`}>
      <span className="block text-sm font-medium mb-1.5">{label}</span>
      {children}
    </label>
  );
}
function ErrorNote({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="text-sm rounded-md px-3 py-2 border"
      style={{
        color: "var(--color-destructive)",
        borderColor: "var(--color-destructive)",
        backgroundColor: "oklch(0.97 0.03 27)",
      }}
      role="alert"
    >
      {children}
    </div>
  );
}
function VerifiedBanner({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div
      className="rounded-xl px-4 py-3 flex items-center gap-3"
      style={{ backgroundColor: "oklch(0.96 0.04 155)", color: "var(--color-foreground)" }}
    >
      <span
        className="h-7 w-7 rounded-full flex items-center justify-center text-sm font-bold"
        style={{ backgroundColor: "var(--color-success)", color: "var(--color-success-foreground)" }}
      >
        ✓
      </span>
      <div>
        <p className="text-sm font-semibold leading-tight">{title}</p>
        <p className="text-xs text-[var(--color-muted-foreground)]">{subtitle}</p>
      </div>
    </div>
  );
}
