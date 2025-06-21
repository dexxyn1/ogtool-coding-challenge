import { z } from 'zod';
import { FlexibleDateSchema } from '@/common/schema/flexibleDataSchema'; // Assuming consistent date handling
import { PersonalProfileSchema } from '@/features/personalProfiles/shared/types';

// --- Enums ---

/** Represents the current legal status of the marriage relevant for taxes. */
export const MarriageStatusSchema = z.enum([
    "MARRIED",
    "SEPARATED", // Legal separation might affect filing status
    "DIVORCED"
]);
/** Type representing the marriage status enum. */
export type MarriageStatus = z.infer<typeof MarriageStatusSchema>;

// --- Base Schema ---

/**
 * Zod schema for the Marriage domain model.
 * Represents the relationship between two Personal Profiles.
 */
export const MarriageSchema = z.object({
    id: z.string(),              // Primary Key using UUID
    profileId1: z.string(),             // FK to the first PersonalProfile ID
    profileId2: z.string(),             // FK to the second PersonalProfile ID

    status: MarriageStatusSchema,       // Current status of the marriage

    marriageDate: FlexibleDateSchema,   // The official date of marriage
    /** Date of legal separation or divorce, relevant for filing status changes. */
    separationOrDivorceDate: FlexibleDateSchema.nullable().optional(),

    // Standard audit fields
    isSoftDeleted: z.boolean().default(false),
    createdAt: FlexibleDateSchema,
    updatedAt: FlexibleDateSchema,
});

/** Domain model type for Marriage, derived from the Zod schema. */
export type Marriage = z.infer<typeof MarriageSchema>;

// --- Create Schema ---

/**
 * Zod schema for creating a new Marriage record.
 * Omits generated fields and applies specific creation logic.
 */
export const CreateMarriageSchema = MarriageSchema.omit({
    id: true,
    isSoftDeleted: true,
    createdAt: true,
    updatedAt: true,
    separationOrDivorceDate: true, // Cannot be set on creation
}).extend({
    // Status defaults to MARRIED on creation
    status: MarriageStatusSchema.default("MARRIED")
}).strict() // Disallow extra fields
  .superRefine((val, ctx) => {
      // Prevent linking a profile to itself
      if (val.profileId1 === val.profileId2) {
          ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "Cannot create a marriage record linking a profile to itself.",
              path: ["profileId2"], // Could be profileId2 as well
          });
      }
  });

/** Type for creating a new Marriage, derived from the schema. */
export type CreateMarriage = z.infer<typeof CreateMarriageSchema>;

// --- Update Schema ---

/**
 * Zod schema for updating an existing Marriage record.
 * Allows updating status and separation/divorce date.
 * Omits immutable fields (IDs, marriageDate, timestamps).
 */
export const UpdateMarriageSchema = MarriageSchema.omit({
    id: true,
    profileId1: true,           // Cannot change the parties
    profileId2: true,
    marriageDate: true,         // Cannot change the marriage date
    isSoftDeleted: true,        // Use softDelete action for this
    createdAt: true,
    updatedAt: true,
}).partial() // Only allow updating specified fields
  ; // Disallow other fields

/** Type for updating an existing Marriage, derived from the schema. */
export type UpdateMarriage = z.infer<typeof UpdateMarriageSchema>; 


export const FullMarriageSchema = MarriageSchema.extend({
    profile1: PersonalProfileSchema.optional(),
    profile2: PersonalProfileSchema.optional(),
});

export type FullMarriage = z.infer<typeof FullMarriageSchema>;