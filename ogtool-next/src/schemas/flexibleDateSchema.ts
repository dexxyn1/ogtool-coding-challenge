import { z } from 'zod';

export const FlexibleDateSchema = z.union([
    z.date(),
    z.string()
  ]).transform(val => typeof val === 'string' ? new Date(val) : val);
