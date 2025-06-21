import { z } from 'zod';
import { FlexibleDateSchema } from '@/schemas/flexibleDateSchema';

// --- Base Schema ---

/**
 * Zod schema for the ExtractionRequest domain model.
 */
export const ExtractionRequestSchema = z.object({
    id: z.string().uuid(),
    userSessionId: z.string().uuid(),
    url: z.string().url(),
    specialInstructions: z.string(),
    isCompleted: z.boolean().default(false),
    createdAt: FlexibleDateSchema,
    updatedAt: FlexibleDateSchema,
});

/** Domain model type for ExtractionRequest, derived from the Zod schema. */
export type ExtractionRequest = z.infer<typeof ExtractionRequestSchema>;

// --- Create Schema ---

/**
 * Zod schema for creating a new ExtractionRequest record.
 * This is the data provided by the end-user. The userSessionId will be added by the action.
 */
export const CreateExtractionRequestSchema = z.object({
    url: z.string().url({ message: "A valid URL must be provided for the extraction." }),
    specialInstructions: z.string().optional().default(""),
}).strict();

/** Type for creating a new ExtractionRequest, derived from the schema. */
export type CreateExtractionRequest = z.infer<typeof CreateExtractionRequestSchema>;


// --- Update Schema ---

/**
 * Zod schema for updating an existing ExtractionRequest record.
 * Allows updating 'isCompleted' status.
 */
export const UpdateExtractionRequestSchema = ExtractionRequestSchema.pick({
    isCompleted: true,
}).partial();

/** Type for updating an existing ExtractionRequest, derived from the schema. */
export type UpdateExtractionRequest = z.infer<typeof UpdateExtractionRequestSchema>;

