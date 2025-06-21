import { Prisma, Marriage as MarriagePrismaModel } from '@/generated/prisma/client';
import { Marriage, CreateMarriage, UpdateMarriage } from './types'; // Assuming types.ts re-exports domain types
import { PaginationOptions } from '@/common/parameters/paginationOptions'; // Corrected path
import { PrismaClientKnownRequestError } from '@/generated/prisma/client/runtime/library'; // For error checking
import { getPrismaClient } from '@/infrastructure/prismaClient';
import type { PrismaClient } from '@/infrastructure/prismaClient'; // Import the type
import { withUserContext } from '@/features/Access/utils/withUserAccess';

/**
 * Interface defining the contract for Marriage data access operations.
 */
export interface IMarriageRepository {
    /** Retrieves a paginated list of active marriages involving a specific profile for the current user. */
    getAll(userId: string, profileId: string, options?: PaginationOptions): Promise<{ data: Marriage[]; totalCount: number }>;
    /** Counts all active marriages involving a specific profile for the current user. */
    countAll(userId: string, profileId: string): Promise<number>;
    /** Finds a single active marriage by its ID, subject to RLS for the current user. */
    findById(userId: string, id: string): Promise<Marriage | null>;
    /** Finds the first active marriage between two specific profiles, subject to RLS for the current user. */
    findByProfileIds(userId: string, profileId1: string, profileId2: string): Promise<Marriage | null>;
    /** 
     * Creates a new marriage record for the current user.
     * Potentially grants access if a MarriageAccess model is implemented.
     */
    create(userId: string, data: CreateMarriage): Promise<Marriage>;
    /** 
     * Updates an existing active marriage record by ID, for the current user.
     * Potentially involves access checks if a MarriageAccess model is implemented.
     */
    update(userId: string, id: string, data: UpdateMarriage): Promise<Marriage | null>;
    /** 
     * Soft-deletes an active marriage record by ID, for the current user.
     * Potentially revokes access if a MarriageAccess model is implemented.
     */
    softDelete(userId: string, id: string): Promise<Marriage | null>;
}

// Helper function to map Prisma model to domain model
const mapPrismaModelToDomain = (prismaMarriage: MarriagePrismaModel): Marriage => {
    // Prisma returns Date objects, Zod schema expects DateTime compatible values
    // No complex mapping needed if types align (assuming FlexibleDate handles Date)
    // Ensure all required fields from the domain 'Marriage' type are present
    return {
        ...prismaMarriage,
        // Explicitly map fields if names or types differ significantly,
        // e.g., Decimal to number if needed (not applicable here)
        // separationOrDivorceDate: prismaMarriage.separationOrDivorceDate ?? undefined, // Handle null to optional undefined if needed
    };
};

/**
 * Factory function to create an instance of the Marriage Repository.
 * Encapsulates data access logic using Prisma.
 * @param instanceName - Specifies the database instance ('production' or 'test') to connect to.
 * @returns An object implementing IMarriageRepository.
 */
export const createMarriageRepository = (instanceName: 'production' | 'test'): IMarriageRepository => {
    // Get the correct Prisma client instance
    const prisma: PrismaClient = getPrismaClient(instanceName);

    return {
        async getAll(userId: string, profileId: string, options?: PaginationOptions): Promise<{ data: Marriage[]; totalCount: number }> {
            return withUserContext(prisma, userId, async (tx: Prisma.TransactionClient) => {
                const page = options?.page ?? 1;
                const limit = options?.limit ?? 10;
                const offset = (page - 1) * limit;

                const whereCondition: Prisma.MarriageWhereInput = {
                    OR: [
                        { profileId1: profileId },
                        { profileId2: profileId }
                    ],
                    isSoftDeleted: false
                };

                const [marriages, totalCount] = await Promise.all([
                    tx.marriage.findMany({
                        where: whereCondition,
                        skip: offset,
                        take: limit,
                        orderBy: { createdAt: 'desc' }, 
                    }),
                    tx.marriage.count({ where: whereCondition })
                ]);

                return {
                    data: marriages.map(mapPrismaModelToDomain),
                    totalCount: totalCount
                };
            });
        },

        async countAll(userId: string, profileId: string): Promise<number> {
            return withUserContext(prisma, userId, async (tx: Prisma.TransactionClient) => {
                const whereCondition: Prisma.MarriageWhereInput = {
                    OR: [
                        { profileId1: profileId },
                        { profileId2: profileId }
                    ],
                    isSoftDeleted: false
                };
                return tx.marriage.count({ where: whereCondition });
            });
        },

        async findById(userId: string, id: string): Promise<Marriage | null> {
            return withUserContext(prisma, userId, async (tx: Prisma.TransactionClient) => {
                const marriage = await tx.marriage.findUnique({
                    where: { id, isSoftDeleted: false }, // RLS will handle user-specific visibility
                });
                return marriage ? mapPrismaModelToDomain(marriage) : null;
            });
        },

        async findByProfileIds(userId: string, profileId1: string, profileId2: string): Promise<Marriage | null> {
            return withUserContext(prisma, userId, async (tx: Prisma.TransactionClient) => {
                const marriage = await tx.marriage.findFirst({
                    where: {
                        OR: [
                            { profileId1: profileId1, profileId2: profileId2 },
                            { profileId1: profileId2, profileId2: profileId1 } 
                        ],
                        isSoftDeleted: false
                     } // RLS will handle user-specific visibility
                 });
                 return marriage ? mapPrismaModelToDomain(marriage) : null;
            });
        },

        async create(userId: string, data: CreateMarriage): Promise<Marriage> {
            return withUserContext(prisma, userId, async (tx: Prisma.TransactionClient) => {
                const newMarriage = await tx.marriage.create({
                    data: {
                        ...data,
                    },
                });
                // Future: Consider adding to a MarriageAccess table here, granting userId (creator or related profile) OWNER role.
                // e.g., await tx.marriageAccess.create({ data: { marriageId: newMarriage.id, userId: ..., role: AccessRole.OWNER } });
                return mapPrismaModelToDomain(newMarriage);
            });
        },

        async update(userId: string, id: string, data: UpdateMarriage): Promise<Marriage | null> {
            return withUserContext(prisma, userId, async (tx: Prisma.TransactionClient) => {
                // RLS is expected to prevent updating if user doesn't have rights.
                // First, check if the record (matching ID and not soft-deleted) exists via RLS context.
                const existing = await tx.marriage.findUnique({
                    where: { id, isSoftDeleted: false } 
                });
    
                if (!existing) {
                     return null; 
                }
                try {
                    const updatedMarriage = await tx.marriage.update({
                        where: { id }, // RLS context applies here too
                        data: {
                            ...data,
                        },
                    });
                    return mapPrismaModelToDomain(updatedMarriage);
                } catch (error) {
                     if (error instanceof PrismaClientKnownRequestError && error.code === 'P2025') {
                         return null; 
                     }
                     console.error(`[Repo - Marriage (${instanceName})] Error updating marriage ${id} for user ${userId}:`, error);
                     throw error; 
                }
            });
        },

        async softDelete(userId: string, id: string): Promise<Marriage | null> {
            return withUserContext(prisma, userId, async (tx: Prisma.TransactionClient) => {
                // RLS is expected to prevent updating if user doesn't have rights.
                 const existing = await tx.marriage.findUnique({
                    where: { id, isSoftDeleted: false }
                });
    
                if (!existing) {
                     return null; 
                }
                try {
                    const deletedMarriage = await tx.marriage.update({
                        where: { id }, // RLS context applies
                        data: { isSoftDeleted: true },
                    });
                    // Future: Consider revoking access from a MarriageAccess table here.
                    // e.g., await tx.marriageAccess.deleteMany({ where: { marriageId: id } });
                    return mapPrismaModelToDomain(deletedMarriage);
                } catch (error) {
                    if (error instanceof PrismaClientKnownRequestError && error.code === 'P2025') {
                         return null; 
                     }
                     console.error(`[Repo - Marriage (${instanceName})] Error soft-deleting marriage ${id} for user ${userId}:`, error);
                     throw error; 
                }
            });
        },
    };
};
