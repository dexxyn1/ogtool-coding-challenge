import { Prisma, ExtractionRequest as ExtractionRequestPrismaModel } from '@/generated/prisma/client';
import { CreateExtractionRequest, ExtractionRequest, UpdateExtractionRequest } from './types';
import { getPrismaClient } from '@/infrastructure/prismaClient';

/**
 * Interface defining the contract for ExtractionRequest data access operations.
 */
export interface IExtractionRequestRepository {
    /** Creates a new extraction request record. */
    create(userSessionId: string, data: CreateExtractionRequest): Promise<ExtractionRequest>;
    /** Finds a single extraction request by its ID. */
    findById(id: string): Promise<ExtractionRequest | null>;
    /** Retrieves a paginated list of extraction requests for a given user session. */
    getAllForUser(userSessionId: string): Promise<ExtractionRequest[]>;
    /** Updates an existing extraction request. */
    update(id: string, data: UpdateExtractionRequest): Promise<ExtractionRequest | null>;
}

// Helper function to map Prisma model to domain model
const mapPrismaModelToDomain = (prismaRequest: ExtractionRequestPrismaModel): ExtractionRequest => {
    return {
        ...prismaRequest,
    };
};

/**
 * Factory function to create an instance of the ExtractionRequest Repository.
 * @returns An object implementing IExtractionRequestRepository.
 */
export const createExtractionRequestRepository = (): IExtractionRequestRepository => {
    const prisma = getPrismaClient();

    return {
        async create(userSessionId: string, data: CreateExtractionRequest): Promise<ExtractionRequest> {
            const newRequest = await prisma.extractionRequest.create({
                data: {
                    ...data,
                    userSessionId,
                },
            });
            return mapPrismaModelToDomain(newRequest);
        },

        async findById(id: string): Promise<ExtractionRequest | null> {
            const request = await prisma.extractionRequest.findUnique({
                where: { id },
            });
            return request ? mapPrismaModelToDomain(request) : null;
        },

        async getAllForUser(userSessionId: string): Promise<ExtractionRequest[]> {
            const whereCondition: Prisma.ExtractionRequestWhereInput = {
                userSessionId,
            };

            const requests = await prisma.extractionRequest.findMany({
                    where: whereCondition,
                    orderBy: { createdAt: 'desc' },
                });

            return requests.map(e => mapPrismaModelToDomain(e));
        },

        async update(id: string, data: UpdateExtractionRequest): Promise<ExtractionRequest | null> {
            try {
                const updatedRequest = await prisma.extractionRequest.update({
                    where: { id },
                    data,
                });
                return mapPrismaModelToDomain(updatedRequest);
            } catch (error) {
                if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                    return null; // Record to update not found
                }
                throw error;
            }
        },
    };
}; 