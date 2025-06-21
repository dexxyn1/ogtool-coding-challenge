import { Prisma, ExtractionResult as ExtractionResultPrismaModel } from '@/generated/prisma/client';
import { ExtractionResult } from './types';
import { getPrismaClient } from '@/infrastructure/prismaClient';

/**
 * Interface defining the contract for ExtractionResult data access operations.
 */
export interface IExtractionResultRepository {
    /** Retrieves a list of extraction results for a given extraction request. */
    getAllForRequest(extractionRequestId: string): Promise<ExtractionResult[]>;
}

// Helper function to map Prisma model to domain model
const mapPrismaModelToDomain = (prismaResult: ExtractionResultPrismaModel): ExtractionResult => {
    return prismaResult;
};

/**
 * Factory function to create an instance of the ExtractionResult Repository.
 * @returns An object implementing IExtractionResultRepository.
 */
export const createExtractionResultRepository = (): IExtractionResultRepository => {
    const prisma = getPrismaClient();

    return {
        async getAllForRequest(extractionRequestId: string): Promise<ExtractionResult[]> {
            const whereCondition: Prisma.ExtractionResultWhereInput = {
                extractionRequestId,
            };

            const results = await prisma.extractionResult.findMany({
                where: whereCondition,
                orderBy: { createdAt: 'desc' },
            });

            return results.map(mapPrismaModelToDomain);
        },
    };
}; 