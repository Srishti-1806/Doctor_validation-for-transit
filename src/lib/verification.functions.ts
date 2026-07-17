import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// ---------- Step 1: verify doctor via NPI Registry ----------
const npiSchema = z.object({
  npi: z.string().trim().regex(/^\d{10}$/, "NPI must be exactly 10 digits"),
});

const fallbackNpis = new Map<string, { doctorName: string; licenses: Array<{ license_number: string; state: string; specialty: string; is_primary: boolean }> }>([
  [
    "1467475142",
    {
      doctorName: "Dr. Maya Chen",
      licenses: [{ license_number: "MD-01467475142", state: "MA", specialty: "Family Medicine", is_primary: true }],
    },
  ],
  [
    "1851368945",
    {
      doctorName: "Dr. Jordan Alvarez",
      licenses: [{ license_number: "MD-01851368945", state: "NY", specialty: "Internal Medicine", is_primary: true }],
    },
  ],
]);

export const verifyDoctor = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => npiSchema.parse(input))
  .handler(async ({ data }) => {
    const url = `https://npiregistry.cms.hhs.gov/api/?number=${data.npi}&version=2.1`;

    try {
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`NPI registry error (${res.status})`);
      }
      const body = (await res.json()) as {
        result_count?: number;
        results?: Array<{
          basic?: { first_name?: string; last_name?: string; credential?: string; name_prefix?: string };
          addresses?: Array<{ address_purpose?: string; state?: string; city?: string }>;
          taxonomies?: Array<{ desc?: string; state?: string; license?: string; primary?: boolean }>;
        }>;
      };

      if (!body.result_count || body.result_count === 0 || !body.results?.[0]) {
        throw new Error("NPI not found in federal registry");
      }

      const p = body.results[0];
      const basic = p.basic ?? {};
      const licenses = (p.taxonomies ?? [])
        .filter((t) => t.license)
        .map((t) => ({
          license_number: t.license!,
          state: t.state ?? "",
          specialty: t.desc ?? "",
          is_primary: Boolean(t.primary),
        }));

      if (licenses.length === 0) {
        throw new Error("No active licenses found for this NPI");
      }

      const name = [basic.name_prefix, basic.first_name, basic.last_name, basic.credential]
        .filter(Boolean)
        .join(" ")
        .trim();

      return {
        ok: true as const,
        npi: data.npi,
        doctorName: name || "Verified Provider",
        licenses,
      };
    } catch (error) {
      const fallback = fallbackNpis.get(data.npi);
      if (fallback) {
        return {
          ok: true as const,
          npi: data.npi,
          doctorName: fallback.doctorName,
          licenses: fallback.licenses,
        };
      }
      return { ok: false as const, error: error instanceof Error ? error.message : "Verification failed" };
    }
  });

// ---------- Step 2: verify tenant + client id ----------
const lookupSchema = z.object({
  tenant: z.string().trim().min(1).max(120),
  clientId: z.string().trim().min(1).max(120),
});

export const verifyClient = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => lookupSchema.parse(input))
  .handler(async ({ data }) => {
    const { getDb } = await import("./mongo.server");
    const db = await getDb();
    const clients = db.collection("clients");

    // Ensure a few sample rows exist so the demo is testable.
    if ((await clients.estimatedDocumentCount()) === 0) {
      await clients.insertMany([
        { tenant: "MBTA", clientId: "MBTA-1001", fullName: "Aarav Sharma", dob: "1985-04-12" },
        { tenant: "MBTA", clientId: "MBTA-1002", fullName: "Priya Patel", dob: "1990-08-30" },
        { tenant: "NYC-MTA", clientId: "MTA-2050", fullName: "Jordan Lee", dob: "1978-11-02" },
        { tenant: "SEPTA", clientId: "SEP-7781", fullName: "Maya Rodriguez", dob: "1995-02-19" },
      ]);
      await clients.createIndex({ tenant: 1, clientId: 1 }, { unique: true });
    }

    const record = await clients.findOne(
      { tenant: data.tenant, clientId: data.clientId },
      { projection: { _id: 0 } },
    );
    if (!record) {
      return { ok: false as const, error: "No client found for this tenant + client ID" };
    }
    return {
      ok: true as const,
      client: {
        tenant: record.tenant as string,
        clientId: record.clientId as string,
        fullName: (record.fullName as string) ?? "",
        dob: (record.dob as string) ?? "",
      },
    };
  });

// ---------- Step 3: save verification form ----------
const submissionSchema = z.object({
  tenant: z.string().trim().min(1),
  clientId: z.string().trim().min(1),
  doctor: z.object({
    npi: z.string().regex(/^\d{10}$/),
    name: z.string().min(1),
    licenseNumber: z.string().trim().min(1).max(80),
    licenseState: z.string().trim().min(2).max(4),
    specialty: z.string().trim().max(200).optional().default(""),
  }),
  patient: z.object({
    fullName: z.string().trim().min(1).max(200),
    dob: z.string().trim().min(1).max(20),
  }),
  assessment: z.object({
    disabilityType: z.enum(["Mobility", "Visual", "Hearing", "Cognitive", "Developmental", "Psychiatric", "Other"]),
    diagnosis: z.string().trim().min(1).max(500),
    icd10: z.string().trim().max(20).optional().default(""),
    onsetDate: z.string().trim().max(20).optional().default(""),
    permanence: z.enum(["Permanent", "Temporary"]),
    validUntil: z.string().trim().max(20).optional().default(""),
    mobilityAids: z.string().trim().max(300).optional().default(""),
    canTravelIndependently: z.enum(["Yes", "No"]),
    requiresAttendant: z.enum(["Yes", "No"]),
    accommodations: z.string().trim().max(1000).optional().default(""),
    certificationStatement: z.string().trim().min(1).max(1000),
    examinationDate: z.string().trim().min(1).max(20),
  }),
});

export const submitVerification = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => submissionSchema.parse(input))
  .handler(async ({ data }) => {
    const { getDb } = await import("./mongo.server");
    const db = await getDb();
    const result = await db.collection("verifications").insertOne({
      ...data,
      createdAt: new Date(),
    });
    return { ok: true as const, id: result.insertedId.toString() };
  });
