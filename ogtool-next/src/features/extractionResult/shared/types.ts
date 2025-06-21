import { z } from 'zod';
import { FlexibleDateSchema } from '@/schemas/flexibleDateSchema';
import { ExtractionRequestSchema } from '@/features/extractionRequest/shared/types';

/**
 * Zod schema for the ExtractionResult domain model.
 */
export const ExtractionResultSchema = z.object({
    id: z.string().uuid(),
    extractionRequestId: z.string().uuid(),
    title: z.string(),
    content: z.string(),
    contentType: z.string(),
    sourceUrl: z.string().url(),
    author: z.string(),
    userId: z.string(), // This is the userSessionId from the parent request
    createdAt: FlexibleDateSchema,
    updatedAt: FlexibleDateSchema,
});

/** Domain model type for ExtractionResult, derived from the Zod schema. */
export type ExtractionResult = z.infer<typeof ExtractionResultSchema>;

/**
 * Zod schema for creating a new ExtractionResult record.
 * This would likely be used by an internal process, not directly by the user.
 */
export const CreateExtractionResultSchema = ExtractionResultSchema.omit({
    id: true,
    createdAt: true,
    updatedAt: true,
}).strict();

/** Type for creating a new ExtractionResult, derived from the schema. */
export type CreateExtractionResult = z.infer<typeof CreateExtractionResultSchema>;

/**
 * Zod schema for a full ExtractionResult, including the parent request.
 */
export const FullExtractionResultSchema = ExtractionResultSchema.extend({
    extractionRequest: ExtractionRequestSchema.optional(),
});

export type FullExtractionResult = z.infer<typeof FullExtractionResultSchema>; 