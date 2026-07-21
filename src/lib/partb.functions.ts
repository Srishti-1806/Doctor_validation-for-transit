import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { getDb } from './mongo.server';

const partBSchema = z.record(z.any());

export const savePartB = createServerFn({ method: 'POST' })
  .validator((input: unknown) => partBSchema.parse(input))
  .handler(async ({ data }) => {
    const db = await getDb();
    const coll = db.collection('partb_submissions');
    try {
      const doc = { ...data, createdAt: new Date().toISOString() } as any;
      const res = await coll.insertOne(doc as any);
      return { ok: true as const, id: (res as any).insertedId ?? null };
    } catch (err) {
      console.error('[partb] failed to save submission', err);
      return { ok: false as const, error: 'Failed to save submission' };
    }
  });

export default savePartB;
